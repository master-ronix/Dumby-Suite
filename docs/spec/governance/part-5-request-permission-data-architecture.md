---
id: SPEC-00-GOVERNANCE-0007
title: PART 5 — REQUEST, PERMISSION & DATA ARCHITECTURE
kind: spec
status: normative
version: 5.0.0
authority_scope: [00-governance]
contracts: []
acceptance: [ACC-GOV-0007-1]
owners: [framework-maintainers]
last_verified_commit: null
review_state: pending-evidence
---

# PART 5 — REQUEST, PERMISSION & DATA ARCHITECTURE

### D-5.1 — The Middleware Pipeline: One Onion, Strict Priority

**Rule (MUST).** Every command dispatch passes through a single
priority-ordered middleware pipeline with one root error boundary. The
canonical core ordering:

````
-20  MaintenanceModeMiddleware   — short-circuits everything if set
-10  AdminTierGateMiddleware    — owner-only gate, Admin tier only
  0  TraceMiddleware            — opens span, binds correlationId
 10  AuthMiddleware             — resolves the invoking user
 20  GuildConfigMiddleware      — loads per-guild config into context
 30  LocaleMiddleware           — binds the i18n instance
 40  RateLimitMiddleware        — atomic check-and-increment, pre-handler
 50  PermissionMiddleware       — Discord bitfield check (Layer 5 of 7)
 60  RBACMiddleware             — Dumby role check (Layer 6 of 7)
 70  CooldownMiddleware         — per-user per-command cooldown
 80  DeferMiddleware             — deferReply() where the command requires it
 90  AnalyticsMiddleware        — records invocation start; outcome on the
                                  way out (reverse-order after-hooks)
100+ module-global middleware (manifest-declared)
200+ command-scoped middleware (command-declared)
````

Custom middleware composes into the same model — never around it. The root
error boundary is the single place an unhandled error from any handler is
caught, classified (D-7.2), logged with full context, and converted into a
safe user-facing outcome. Maintenance mode MUST remain reachable in a way that
cannot lock out the operators themselves.

### D-5.2 — The Seven-Layer Permission Engine

**Rule (MUST).** One resolver, seven layers, in order: (1) bot-owner override,
(2) blacklist, (3) guild/module availability, (4) channel restriction,
(5) Discord native bitfield, (6) RBAC role, (7) explicit grant override.
Layer semantics and fail directions are fixed:

````
Layers 2, 3, 5, 6   — fail CLOSED (an evaluation error denies)
Layers 4, 7         — fail OPEN (documented asymmetry; see blueprint §4/§21)
Default            — deny; a new command with no explicit permission
                     declaration is reachable by nobody but the bot owner
                     until a permission is set (P7)
````

**Rule (MUST).** The RBAC hierarchy is OWNER / ADMINISTRATOR / MODERATOR /
HELPER / MEMBER / RESTRICTED, inclusive upward. Layer 7 explicit grants cover permit,
blacklist, whitelist, quota, and cooldown. The same single engine serves
every consuming surface — there is no parallel permission implementation
anywhere (P13). The resolver MUST be invoked as a mandatory stage of every
command dispatch (D-3.9).

### D-5.3 — Authorization Re-Checks on Component Interactions

**Rule (MUST).** Sensitive component interactions (buttons, select menus,
modals) re-check authorization at click time — a component custom_id is
stateless and database-referencing, and possession of the message is never
proof of current authority.

### D-5.4 — Configuration: Three Scopes, One Discipline

**Rule (MUST).**

````
Process — Core    : environment variables; validated Stage 02 against the
                    root Zod schema; a change requires a redeploy.
Process — Module  : environment variables, module-name-prefixed; validated
                    Stage 11 against the module's own declared schema.
Guild             : PostgreSQL guild_configs JSONB; mutable at runtime;
                    validated on EVERY write against the same schema the
                    read path deserializes against; takes effect immediately
                    — never a restart, never a redeploy.
````

The dividing line is absolute: what should never differ between guilds, or
whose misconfiguration threatens process start, is process-level; what a
guild should reasonably tune is guild-level. Every configuration change —
process or guild — lands in the configuration audit trail.

### D-5.5 — Database: Repository, Migrations, Audit Columns

**Rule (MUST).**

1. The repository pattern is the sole database abstraction (D-2.7); the
   Application Core owns the core tables (guilds, users, guild_configs,
   guild_roles, guild_module_states, audit, marketplace listings, usage
   metering, and control tables) — a module never owns or writes a core
   table, and core never owns a module's tables.
2. Every migration exports a working `down()` — reversibility is a hard
   requirement, not a best effort. A disposable-DB dry-run and forbidden-SQL
   scan SHOULD gate destructive migrations; expand-only migrations run
   pre-rollout, destructive operations defer behind explicit approval, under
   a PostgreSQL advisory lock, recorded in a migration ledger.
3. Every table carries the standard audit columns (createdAt, updatedAt,
   createdBy, updatedBy).
4. Read/write routing sends reads to replicas within the tolerated lag
   threshold; slow queries are logged above the configured threshold;
   statement timeouts are set and drift-monitored (D-3.3).
5. Connection pool sizing follows the provisioned-capacity formula —
   `max_connections = (max_pods × pool_max × 1.2) + 20` in Terraform — with a
   startup assertion refusing to boot when the configured pool would exceed
   the server's capacity.
6. Audit logs are partitioned with retention policy.

### D-5.6 — Caching: Two Tiers, One Manager, Stampede-Proof

**Rule (MUST).** L1 is an in-process LRU (bounded entries and bytes); L2 is
Redis, shared fleet-wide; the origin is PostgreSQL. One `CacheManager`
exposes a unified get/set/invalidate API — callers never manage tiers
separately; the cascade and backfill-on-miss are internal. Cache keys follow
the namespacing convention `{domain}:{entity}:{identifier}[:{sub-scope}]`.
Stampede protection and negative caching are built in. Invalidation
broadcasts bound the L1 consistency window fleet-wide; a probabilistic
early-refresh mechanism is required and reduces expiry cliffs on hot keys (see
`spec/data/caching-architecture.md`, Mechanism 2). LISTEN/NOTIFY
is the documented fallback channel alongside Redis pub/sub.

### D-5.7 — State Externalization: The Core Scaling Constraint

**Rule (MUST).** No state whose loss or divergence would be user-visible is
ever held only in a single process's memory. Guild configuration, module
state, RBAC, all module business data, job queue state, audit history,
licensing records, and shard-ownership locks live in PostgreSQL or Redis.
Process-local things (L1 cache contents, in-flight execution state, worker
pools, pre-scrape metric counters) are genuinely disposable by design.
Application code never assumes an unsharded topology: `context.shardId` is
always populated, and the shard assignment formula is
`shardId = (guildId.toBigInt() >> 22n) % BigInt(totalShards)` — with the
parentheses, because `%` binds tighter than `>>` and omitting them computes
the wrong thing.

### D-5.8 — Jobs and Tasks: Idempotency Is a Hard Requirement

**Rule (MUST).**

1. Every job processor is idempotent: it checks its pre-conditions before
   acting, so a redelivered or retried job cannot double-apply its effect.
   Reviewer verification specifically looks for the pre-condition-check
   pattern, not merely a passing test; an AST-based static check SHOULD
   eventually enforce it.
2. Jobs ("do this once, possibly later") and tasks ("recurring maintenance
   on a schedule") have different authoring models and are never conflated.
   A task fires once per cron tick fleet-wide under a distributed lock —
   never once per pod.
3. Queue hygiene: removeOnComplete retention bounds, failures retained for
   inspection, retry policy (5 attempts, exponential backoff), idempotency
   keys, and a dead-letter queue monitored with alerting.
4. Worker concurrency is configurable; heavy queues MAY be split into
   dedicated worker-only processes.

### D-5.9 — Localization and Webhooks

**Rule (MUST).** New user-facing strings ship with at least an en-US locale
entry through the i18n manager, which is wired into the request path via
LocaleMiddleware. Every inbound webhook route verifies a cryptographic
signature (HMAC-SHA256 or the provider's mandated scheme) plus a bounded
replay-protection timestamp window before any payload is trusted; a route
without signature verification configured refuses to register at all — there
is no supported "unverified webhook" mode, and an unsigned-accepting route is
a blocking defect. Outbound webhook delivery retries with backoff and records
delivery outcomes.

---

## Acceptance
```acceptance
- id: ACC-GOV-0007-1
  check: "Request/permission/data mandates: 12-stage pipeline, seven-layer resolver, repository pattern"
  test: tests/arch/request-mandates.spec.ts
```
