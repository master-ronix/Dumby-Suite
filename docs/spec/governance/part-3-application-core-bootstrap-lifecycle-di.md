---
id: SPEC-00-GOVERNANCE-0005
title: PART 3 — APPLICATION CORE — BOOTSTRAP, LIFECYCLE & DI
kind: spec
status: normative
version: 5.0.0
authority_scope: [00-governance]
contracts: []
acceptance: [ACC-GOV-0005-1]
owners: [framework-maintainers]
last_verified_commit: null
review_state: pending-evidence
---

# PART 3 — APPLICATION CORE — BOOTSTRAP, LIFECYCLE & DI

### D-3.1 — One Bootstrap, Structurally

**Rule (MUST).** Exactly one Application class and one bootstrap sequence per
process. No alternative entry path, no partial-start state, no
"skip-stages-for-dev" mode. Bootstrap progresses through a forward-only state
machine: stages never run out of order and never re-run within one process
lifetime.

### D-3.2 — The 18-Stage Startup Sequence

**Rule (MUST).** The startup sequence is, in order:

````
01 PROCESS_SETUP       — uncaughtException/unhandledRejection handlers; process title
02 CONFIG_LOAD         — root Zod schema against process.env; field-level fatal errors
03 HEALTH_SERVER_INIT  — Fastify on HEALTH_PORT; endpoints return 503 (not ready);
                         SO_REUSEADDR or delayed-start-with-retry so a new pod never
                         hits EADDRINUSE against a still-draining old pod
04 OBSERVABILITY_INIT  — Pino root logger, Prometheus registry, OTel SDK
05 DATABASE_CONNECT    — Knex pool (primary + read replicas if configured); verify SELECT 1
06 MIGRATION_RUN       — pending migrations, core then module, in declared order;
                         verify guild_module_states backfill is current
07 CACHE_CONNECT       — Redis connection; verify PING
08 QUEUE_INIT          — BullMQ queue connections; register worker processors
09 DI_BOOTSTRAP        — bind all core services; freeze the core token namespace
10 MODULE_DISCOVER     — scan the modules source; collect manifests
11 MODULE_VALIDATE     — Zod-validate every manifest; resolve the cross-module
                         dependency graph; detect cycles
12 MODULE_LOAD         — onLoad(container) in topological order; required:false
                         modules that throw are disabled with a warning and
                         startup continues
13 COMMAND_REGISTER    — collect commands from enabled modules; run collision detection
14 EVENT_REGISTER      — register event handler classes with the EventRouter
15 DISCORD_LOGIN       — client.login(BOT_TOKEN)
16 CLIENT_READY        — wait for ready; compute this process's shard assignments
17 MODULE_READY        — onReady(client) per module; per-module failures disable only
                         that module — the bot is live and responding during this stage
18 STARTUP_COMPLETE    — /health/readiness returns 200 only once every required:true
                         module completed onReady() without error; emit the system-ready
                         event on the internal bus
````

**Failure semantics (MUST).** Stages 01–11 and 13–16 are fatal on failure —
the process exits with a specific, actionable error. Stage 12 is fatal only
for a `required:true` module. Stage 17 is non-fatal per module. The gateway
connection opens only after everything above it has validated: no module
loads, no command registers, and no Discord traffic is processed against
unvalidated configuration.

**Verification.** Integration test asserting each stage's failure mode; the
health endpoint's readiness flip at Stage 18.

### D-3.3 — Configuration Validated Before Anything Depends on It

**Rule (MUST).** Root configuration validates at Stage 02 against the Zod
root schema. Representative invariants inherited from the schema: `NODE_ENV`
is an enum of development/staging/production; `BOT_TOKEN` is non-empty
(empty tokens crash Stage 15 — example secrets use the designated
`<REPLACE_WITH_REAL_TOKEN>` placeholder, never `''`); `BOT_OWNER_IDS` parses
as CSV snowflakes; `DEV_GUILD_ID` is required and matches the snowflake
pattern — a missing or malformed value fails Stage 02 fatally and MUST NOT
silently disable the Admin tier; `DATABASE_URL`/`REDIS_URL` are URLs; ports
and pool settings are coerced numbers with defaults. Ports MUST be environment-driven (`PORT`,
`HEALTH_PORT`) — never hardcoded, so local (compose) and in-cluster (K8s)
mappings can differ without code change.

**Rule (MUST) — environment-key policy.** No environment key may be declared
without either a consuming code path or an operator-runbook entry: every key
in the root schema is read by code or documented as operator-only in the
operator runbook — a declared-but-unread key, or a deployed configmap key
the schema does not declare, is configuration drift and a defect. In
production, `INTERNAL_API_KEY` MUST be at least 32 characters; a shorter
value fails Stage 02.

**Verification.** A CI check diffs the deployed configuration keys against
the schema's `ENV_KEYS` set in both directions; divergence in either
direction fails the build.

**Rule (SHOULD).** Configuration drift across environments (e.g.,
statement-timeout values differing between dev, staging, and production,
causing production-only failures) SHOULD be detected — the Release Manager
configuration
diff and reconciliation path is the intended home for this.

### D-3.4 — Health Server Starts Early and Honestly

**Rule (MUST).** The health/ready HTTP server starts at Stage 03, before
module loading, and reports 503 until Stage 18 completes. A deployment's
readiness probe therefore cannot route traffic to a half-booted process, and
diagnostics exist even when bootstrap fails partway.

### D-3.5 — Dependency Injection: One Container, Typed Tokens, Frozen Core

**Rule (MUST).**

1. All core services are bound into one DI container at Stage 09, keyed by
   Symbol tokens; the core token namespace is frozen afterward.
2. Three binding lifetimes are supported (singleton, scoped, transient) and
   used deliberately.
3. Module-scoped child containers are created per module; a module resolves
   only what its manifest declares (provides/depends).
4. No service-locator pattern: classes receive dependencies through
   constructor injection against typed tokens, never by reaching back into
   the container by string name at runtime.
5. Circular dependencies are detected at boot (Stage 11 / container
   resolution), never at runtime.
6. Every core service — ConfigManager, Logger, CacheManager, DatabaseManager,
   QueueManager, HTTP server, PermissionResolver — exists exactly once per
   process. No module ever constructs its own copy of any core service.

**Rationale.** This is what makes "one operational surface regardless of
module count" a structural property rather than a discipline.

**Verification.** Unit tests via MockContainer; the orphaned-vs-live router
check in D-3.9.

### D-3.6 — The Container Is the Test Substrate

**Rule (MUST).** The container supports a MockContainer in tests: register
the class under test with its real implementation, substitute mocks for its
tokens, resolve, and assert through typed assertion methods (emitted events,
enqueued jobs, logged lines) — no real network, database, or Discord
connection at the unit layer.

### D-3.7 — Graceful Shutdown: Nine Steps, Bounded Ceilings

**Rule (MUST).** On SIGTERM (or interrupt), the process executes, in order:

````
01 Stop accepting new gateway events (shard disconnect)          — ceiling 30 s
02 Drain in-flight command executions                            — ceiling 30 s
03 onUnload() on every loaded module, reverse load order          — ceiling 30 s
04 Drain BullMQ queues (no new jobs; running workers finish;      — ceiling 60 s
   workers still running past the ceiling are abandoned with a dead-letter entry)
05 Close the HTTP server (finish in-flight requests)             — ceiling 10 s
06 Flush Pino log buffer and OTel span exporter                   — ceiling  5 s
07 Close BullMQ connections                                       — ceiling  5 s
08 Close the Redis connection                                    — ceiling  5 s
09 Close the database connection pool                            — ceiling  5 s
````

Worst-case sum: 180 s. Kubernetes `terminationGracePeriodSeconds` MUST exceed
this worst case — the reference value is 190 (180 + 10 s buffer so a
worst-case dead-letter write cannot be cut off by SIGKILL). Each value is a
ceiling, not an expected duration; a typical shutdown completes in low
single-digit seconds.

**Rule (MUST).** `uncaughtException` and `unhandledRejection` are handled
differently and deliberately (Stage 01 registers both); the deployment's
grace window and the shutdown logic MUST stay aligned (verify the logic
actually respects the window).

### D-3.8 — Shard-Ownership Locks During Rolling Updates

**Rule (MUST).** Shard ownership is claimed via Redis locks with TTL, renewed
on a retry interval, and released explicitly as the first act of shutdown. At
no point during a rolling update may two pods believe they own the same
shard. This lock model is a hard prerequisite for the zero-downtime update
strategy in D-7.7.

### D-3.9 — One Canonical Command Router

**Rule (MUST).** Exactly one live command system exists. Every interaction
dispatches through the canonical router and the full middleware pipeline —
invoking the PermissionResolver, rate limiting, and audit logging. A second,
orphaned router that bypasses the pipeline is dead code that MUST be removed,
and CI MUST NOT test it. The PermissionResolver being registered in DI but
unresolved in the dispatch path is a defect, not a design.

**Rationale.** A registered-but-uninvoked permission engine provides zero
protection while creating the appearance of protection.

**Verification.** CI/test coverage on the live router only; an architecture
test that dispatch reaches the middleware pipeline.

### D-3.10 — Port-Based Dependency Inversion

**Rule (MUST).** Core command infrastructure depends on ports (interfaces,
e.g., the dependency-injected surfaces of `src/commands/` and
`src/permissions/resolver.ts`), not on concrete implementations. Every port
SHOULD be mockable, and the MockContainer + port architecture MUST be used to
bootstrap tests for all subsystems, not one.

### D-3.11 — Managed Resources and Leak Discipline

**Rule (MUST).** Timers, subscriptions, workers, and other resources
registered with the container's managed-resource registry are cleaned up
automatically on unload; modules SHOULD register rather than hand-roll
cleanup. Memory-leak detection SHOULD be enabled in the observability stack
and its findings triaged, not ignored.

---

## Acceptance
```acceptance
- id: ACC-GOV-0005-1
  check: "One bootstrap (18 stages), one shutdown (9 steps), one typed DI container with cycle detection"
  test: tests/integration/core-mandates.spec.ts
```
