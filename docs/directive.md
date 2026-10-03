# DUMBY — Development Directive Rules

## Normative Engineering Rules for the Application Core & Control-Plane Services

**Document type:** Development Directive — rules and guide (not a prompt, not an enforcement mechanism)
**Project:** Dumby — Discord Unified Modular Bot System
**Directive version:** 5.0.0
**Derived from:** `blueprint.md` 5.0.0 — Consolidated Re-Baseline Edition (sole architectural authority)
**Applicability:** Application Core, module-system framework (the engine, not module authorship), request/interaction/data backend, control-plane services, infrastructure, and engineering lifecycle
**Explicitly excluded from scope:** frontend and end-user interface surfaces (Discord Components V2 embed layouts, dashboard navigation, banners, cosmetic specification — governed by `interface.md`), module-authoring guidance, worked module examples, and the illustrative module catalog
**Governing objective:** Following this directive end-to-end MUST yield a finished, deployable, ready-to-use Dumby bot — a runtime that boots clean, serves traffic, degrades safely, observes itself, and passes its own acceptance gate (Part 8, Definition of Done)

---

## TABLE OF CONTENTS

- [Directive Charter — How to Use This Document](#directive-charter--how-to-use-this-document)
- [PART 1 — Foundations & Doctrine](#part-1--foundations--doctrine)
- [PART 2 — Technology Stack & Runtime Boundaries](#part-2--technology-stack--runtime-boundaries)
- [PART 3 — Application Core — Bootstrap, Lifecycle & DI](#part-3--application-core--bootstrap-lifecycle--di)
- [PART 4 — Module System Framework](#part-4--module-system-framework)
- [PART 5 — Request, Permission & Data Architecture](#part-5--request-permission--data-architecture)
- [PART 6 — Control-Plane Services](#part-6--control-plane-services)
- [PART 7 — Reliability, Security & Performance](#part-7--reliability-security--performance)
- [PART 8 — Quality, Delivery & Acceptance](#part-8--quality-delivery--acceptance)
- [Appendix A — Directive-to-Blueprint Traceability](#appendix-a--directive-to-blueprint-traceability)
- [Appendix B — Compliance Self-Audit Checklist](#appendix-b--compliance-self-audit-checklist)
- [Appendix C — Logged Deviations (True Unknowns With No Owning Row)](#appendix-c--logged-deviations-true-unknowns-with-no-owning-row)

---

# DIRECTIVE CHARTER — HOW TO USE THIS DOCUMENT

### 0.1 Nature and Authority

This is the imperative rule set that translates the Dumby architecture into
actionable engineering gates. It is **authoritative but non-enforcing**: the
document commands nothing by itself. Where a rule can be enforced, enforcement
belongs to tooling — the `tsc` gate, the architecture-specific ESLint rules, the
per-layer Vitest coverage thresholds, and the CI pipeline (Part 8) — never to
this text. A rule that current tooling cannot check remains a standing review
obligation until tooling catches up, and SHOULD be promoted into tooling the
moment it becomes feasible.

This directive is **derived from and subordinate to** `blueprint.md`. It adds no
architecture, invents no requirements, and overrides nothing. Where this
directive and the blueprint appear to conflict, the blueprint wins, and the
conflict MUST be recorded in `change-log.md` and fixed here in the next
directive revision.

### 0.2 Precedence Order

The canonical document-precedence order for the whole set. When any two documents appear to conflict, the higher-precedence document wins; the conflict MUST be recorded in `change-log.md` and resolved in favour of the higher-precedence reading. **This list is the single normative statement of precedence for the corpus — every other document cites it rather than restating it.**

````
1. blueprint.md (v5.0.0)            — sole source of architectural truth
2. directive.md (v5.0.0)            — imperative translation of #1 into binding rules
3. documentation.md (v5.0.0, archived) — frozen legacy record, retained for the decisions the set inherits
4. interface.md (v5.0.0)            — the end-user interface specification
5. directory.md (v5.0.0)            — the canonical layout reference
6. concept.md (v5.0.0)              — ideological foundation and glossary
7. change-log.md                    — version history and defect lifecycle
8. definitions.md                   — document intent and scope definitions
9. master-prompt.md (v5.0.0)        — the build execution brief, derived from all preceding documents
````

The ADR series in `docs/adr/` is binding on the choices it governs; the frozen request records in `docs/ur/` are provenance, never build specifications.

### 0.3 Requirement Language (RFC 2119)

- **MUST / MUST NOT** — an absolute requirement. Violating it is a defect, full stop. If tooling can detect it, tooling MUST detect it; if it cannot yet, review MUST.
- **SHOULD / SHOULD NOT** — a strong default. Deviating requires a recorded justification (an ADR, or a note in the change log), not a silent choice.
- **MAY** — a genuinely optional behavior, offered where the blueprint allows operator or deployment latitude.

### 0.4 Directive Grammar

Every rule carries an identifier `D-<part>.<rule>`, a statement in RFC 2119
language, a rationale where the "why" is not self-evident, and a verification
line naming the mechanism that checks it (CI gate, ESLint rule, boot-time
validation, review checklist, or runtime behavior). Citations to the blueprint
use its section numbers (e.g., "§8.2" = the 18-stage bootstrap).

### 0.5 Scope and Exclusions — Stated Precisely

In scope: everything the blueprint specifies for the framework, its backend, and
its infrastructure — the runtime and language, the Application Core, the
module-system engine, request routing and permissions, data and state, the
control-plane services (Swastik, Power Engine Panel, CLAI, Credentials,
Release Manager),
observability, security, performance, testing, CI/CD, infrastructure, and
versioning.

Out of scope, without exception:

````
✗  Frontend / end-user interface: Discord embed layouts, Components V2
   presentation, banners, dropdown navigation, dashboards as experienced
   by the end user (interface.md owns these).
✗  Module-authoring guidance: how to write a module, worked examples,
   and the illustrative module catalog. This directive governs the engine
   that loads modules, never the modules themselves.
✗  Any rule whose only purpose is the appearance of a command rather
   than its routing, permission, data, or lifecycle behavior.
````

Where a backend rule necessarily touches the boundary (e.g., "the command
router MUST dispatch through the middleware pipeline"), the rule governs the
router, not the response's visual shape.

**Deferred greenfield work — a standing exclusion (MUST NOT).** The
following subsystems are deferred greenfield work with no shipped
implementation. They are the 52 deferred greenfield items, tracked in the
suite exclusions appendices for future programs:

````
✗  trusted-builder Phase-1 build subsystem
✗  Ed25519 signing subsystem
✗  heap-diff memory watcher
✗  Core UI Compiler / static embed system
✗  Dodo Payments integration
✗  full independent-persona system
✗  marketplace multi-state licensing
✗  GitHub release integration buildout
✗  Release Manager 12-phase service
✗  defineManifest package
✗  event-bus advanced semantics
✗  break-glass script
✗  worker_threads isolation
````

They are explicitly out of scope and MUST NOT be smuggled into correction
work: a flaw-fix or correction request, or review feedback, that quietly
widens scope to build one of these is itself a defect. Where this directive
or the blueprint references a capability on this list, the reference is a
declared future-state obligation — it MUST NOT be represented as shipped
capability, and the spec-vs-implementation gap stays visible under the
honesty rule (D-1.6) until a future program delivers it.

### 0.6 Change Management

Every revision of this directive MUST be recorded in `change-log.md`, in the
same lineage discipline the living reference pair already uses. A directive
rule that is added, weakened, or retired without a change-log entry is
defective by definition.

---

# PART 1 — FOUNDATIONS & DOCTRINE

The rules in this part are the constitution everything else in this directive
is case law for. Every architectural choice made anywhere in the project
SHOULD be traceable to one of these rules, and where it is not, that choice
deserves a second look.

### D-1.1 — The Unified Modular Doctrine is the Governing Invariant

**Rule (MUST).** The system is one coherent application from the outside and
N independently-owned modules from the inside. There is exactly one bootstrap
sequence, one dependency graph, one event bus, one permission engine, one
configuration system, and one operational surface, shared without exception
by every feature the framework runs — administrative capability included.

**Rationale.** A system modular without being unified degenerates into a folder
of drifting plugins; unified without being modular degenerates into a monolith
with feature flags standing in for isolation. The Application Core enforces
unification; the module contract enforces isolation. Both, simultaneously.

**Verification.** Review: any second implementation of a core concern (a second
logger, a second settings path, a second permission check) is a defect.

### D-1.2 — The Framework Never Special-Cases Itself

**Rule (MUST).** The framework's own first-party behavior — the commands that
toggle features, the service that persists guild settings, moderation and
logging configuration — ships as ordinary modules, loaded through the identical
manifest contract, DI container, and lifecycle hooks a third-party author
would use. No hidden config table only core code can write to, no privileged
import path bypassing DI, no admin command implemented as inline framework
code, no framework-only database connection.

**Rationale.** This is what makes "unified" more than marketing: the module
contract is proven sufficient for everything because the framework itself is
built on nothing else.

**Verification.** Review + ESLint boundary rules; every framework-shipped
capability MUST be reachable as a module in the registry.

### D-1.3 — Adopt the Fourteen Engineering Principles as Standing Rules

**Rule (MUST).** Development decisions are made against P1–P14 of blueprint
§3. In condensed, directive form:

````
P1  Explicit over implicit — nothing is auto-detected by filename magic
    where a manifest field could say it explicitly; the manifest is a
    complete table of contents for a module without opening a second file.
P2  Module sovereignty — a module's tables, internal services, and private
    state belong to it alone; access only via its manifest-published surface.
P3  Single responsibility at every layer — commands route and validate,
    services hold business logic, repositories talk to the database.
P4  Fail fast at startup, recover gracefully at runtime — every config
    value, manifest, and dependency edge is validated before the gateway
    connection opens; once live, a transient failure is contained, never
    allowed to cascade.
P5  Observability is not optional — every command, job, and lifecycle
    transition emits structured logs, metrics, and trace spans without
    hand-written instrumentation.
P6  Open for extension, closed for modification — extending means writing a
    new module or subscribing to an event, never editing core or another
    module's source.
P7  Security by default — permissions default to deny; secrets never logged;
    a module cannot request intents or permissions beyond its manifest.
P8  Test in isolation, deploy with confidence — dependencies arrive through
    DI tokens, so unit tests substitute mocks with no real infrastructure.
P9  Configuration without code — anything an operator or guild admin should
    reasonably change is a typed, validated config value, never a constant
    requiring a redeploy.
P10 Data integrity over convenience — every schema change ships as a
    versioned, reversible migration; destructive operations are confirmed
    and audit-logged even when programmatic.
P11 Deprecation over breaking change — public contracts are semver-versioned;
    changing shape is a major bump with a documented deprecation window.
P12 Progressive disclosure of complexity — the minimal module touches one
    file and one interface; nothing is forced on the simple case.
P13 One source of truth per concern — exactly one place resolves permissions,
    exactly one resolves configuration, exactly one holds per-guild module
    state; duplicated authority is a design defect.
P14 Freedom by default, authority by exception — total-control capacity
    (PEP) exists as deliberate, logged intervention for cause, never as an
    ambient enforcement layer anyone must design around.
````

**Verification.** Review; later parts of this directive encode each principle
into concrete gates, and their citations trace back here.

### D-1.4 — Non-Goals Are Outcome-Level Boundaries, Not Mechanism Notes

**Rule (MUST NOT).** The framework does not ship, and no subsystem may
recreate the outcome of:

1. **Text-prefix commands.** Slash commands, user-context menus, and
   message-context menus are the complete interaction surface. A module may
   scan message content for a declared, legitimate purpose but MUST NOT parse
   a leading token and dispatch it as a simulated prefix command. This is
   enforced at four layers: architecture (no text-command registration system,
   no `textPrefixes` field, interaction-shaped command contexts only),
   lint/CI, the marketplace review pipeline, and runtime dispatch. A
   submission found doing it is rejected, not styled. Its full
   enforcement-layer obligations and the standing coverage audit are stated
   in the Ban Registry (D-1.7).
2. **General message-content scanning.** No broad message-content grant for
   general parsing; a specific documented purpose requires a declared intent,
   flagged in manifest review.
3. **A shipped, built-in web UI.** The framework ships a schema-driven
   rendering contract (MDIS) and a generic renderer — never a pre-built
   React/Vue application on top of it. (Interface surfaces themselves are out
   of this directive's scope.)
4. **A real-time collaboration platform.** Dumby processes Discord
   interactions; it is not a general-purpose WebSocket or collaborative
   editing backend.
5. **A code generator as core functionality.** The scaffolding CLI is
   developer convenience; the framework behaves identically whether a module
   was scaffolded or hand-authored.
6. **A "zero-config" system.** Explicit manifests, explicit DI token
   declarations, and explicit migration files are required. Higher authoring
   cost is traded for lower operational surprise.
7. **A replacement for infrastructure.** The framework runs inside
   PostgreSQL, Redis, and a container orchestrator; it abstracts none of them.
   Terraform/Kubernetes references describe a reference deployment, not a
   built-in provisioning system.
8. **A microservices architecture.** One deployable application, one process
   boundary per shard group. Modules isolate through code-level contracts and
   in-process tooling, never separate deployments or network calls between
   modules — with the single narrow exception of the five control-plane
   services (Part 6).

**Rationale.** Each boundary is stated at the level of the *outcome* it
forbids so there is no side door — e.g., a message scanner that simulates
prefix commands technically avoids "shipping a prefix parser" while recreating
everything the non-goal exists to prevent.

**Verification.** ESLint rules + CI + review pipeline; each non-goal names its
enforcement layers so coverage gaps are visible rather than assumed.

### D-1.5 — Fail Fast at Startup, Recover Gracefully at Runtime

**Rule (MUST).** Misconfiguration is caught at boot; the process refuses to
start half-broken. Once healthy, one module's failure degrades only the
capability it owned — never cascades.

**Verification.** Boot-time validation gates (Part 3); isolation boundaries
(Part 7).

### D-1.6 — Dishonesty About Status Is Itself a Defect

**Rule (MUST).** Where implementation lags the specification — an open ADR, a
declared-only subsystem, a known single point of failure — the gap is recorded
(badge, audit register, or change log), not papered over. Known examples this
directive inherits and keeps visible: BullMQ's single Redis instance as an
open SPOF — pg-boss fallback deferred, tracked open in the blueprint's
audit register — and the requirement that the
spec-vs-implementation gap never be silently widened.

**Verification.** Change-log and audit-register discipline.

### D-1.7 — The Ban Registry: Total Prohibitions, Four Enforcement Layers

**Rule (MUST).** Three behaviors are banned outright — not discouraged, not
style-guided, banned. Each ban is enforced at the same four enforcement
layers, and a ban enforced at fewer than all four is a coverage defect, not
a softer ban:

````
1  Architecture — no code path, registration system, manifest field, or API
   surface through which the banned behavior can be expressed.
2  Lint/CI — an automated gate that fails the build on the banned construct.
3  Marketplace review — a submission exhibiting the behavior is rejected,
   not styled.
4  Runtime — the dispatch path refuses the behavior even if every earlier
   layer was bypassed.
````

**Ban 1 — prefix-command simulation (D-1.4 #1).** No text-prefix command
surface exists at any layer: slash commands, user-context menus, and
message-context menus are the complete interaction surface. Bans rot at the
newest edge, so the prefix-command ban's coverage MUST be audited against
every ingestion surface that comes into existence and extended to each —
GitHub repository triggers, the TypeScript compilation path, renderer
authoring. A new ingestion surface MUST NOT go live without prefix-ban
coverage at every applicable layer.

**Ban 2 — classic embeds (ADR-001).** Module code MUST NOT construct or
import `EmbedBuilder` or `MessageEmbed`. All presentation is renderer-issued
Components v2: modules declare command schemas and the renderer derives the
presentation, and the module-authoring surface exposes no embed-construction
API through which the ban could be sidestepped. This ban supersedes the
4.5.1 SDUI compromise. The migration window declared in ADR-001 governs the
transition — during the window, violations in not-yet-migrated code are
tracked as scheduled migration failures; when the window closes, all four
layers enforce without grandfathering.

**Ban 3 — unsolicited direct messages (ADR-002).** The main bot MUST NOT
send unsolicited direct messages — the prohibition is complete, and there is
no tier exception. Operator communication travels the out-of-band
control-plane surfaces (CLAI, PEP), and the DM prohibition MUST NOT weaken
the guarantee that maintenance and intervention remain reachable without
locking out the operators themselves (D-5.1, D-6.3). Twill persona
instances decide their own DM behavior; this ban binds the main bot.

**Verification.** Adversarial tests at each layer — prefix simulation,
embed construction, and DM dispatch each fail closed at the designated
layers (Part 8 acceptance); the lint rules run in CI; the marketplace
review pipeline rejects submissions on sight of any ban.

---

# PART 2 — TECHNOLOGY STACK & RUNTIME BOUNDARIES

### D-2.1 — Runtime: Node.js LTS ≥ 22

**Rule (MUST).** Node 22 is the floor — required for native `fetch`,
structured-clone, and stable top-level `await` in ESM, all load-bearing for
bootstrap and module loading.

### D-2.2 — Language: TypeScript Strict Mode, Non-Negotiable

**Rule (MUST).** `"strict": true` plus `"exactOptionalPropertyTypes": true`
and `"noUncheckedIndexedAccess": true`, enforced project-wide as the
production stack, not a future option. `tsc --noEmit` is the first-position CI
gate, before lint, test, or deploy; a production build (`tsc -p
tsconfig.build.json`) runs again at the end of CI to confirm the deployable
artifact itself compiles.

**Rationale.** The manifest schema, DI container, command classes, event
catalog, and repository layer are defined in types specifically so a whole
class of integration bug is rejected at compile time, before a test runs.

### D-2.3 — Module Format: ESM Only

**Rule (MUST).** `"type": "module"` with `"module": "NodeNext"`;
`require()` is never used anywhere in the codebase.

### D-2.4 — Package Manager and Supply Chain

**Rule (MUST).** pnpm with the lockfile committed; CI runs
`pnpm install --frozen-lockfile`. A pnpm `minimumReleaseAge` 1-day gate
SHOULD be maintained so newly published dependency versions cannot enter the
build on day zero.

### D-2.5 — Discord Integration: discord.js v14, Direct, No Wrapper

**Rule (MUST).** discord.js v14 is the single Discord integration library,
used directly — no wrapper or lowest-common-denominator abstraction. Its
`Client`, `GatewayIntentBits`, `Partials`, `SlashCommandBuilder`, and
`Interaction` types are the types everything works with. Every numeric
constant this architecture treats as a design parameter — the sharding
threshold, the interaction response window, privileged-intent gating — MUST be
kept configurable (in `client-builder.ts` and configuration), because each is
a Discord *platform policy*, not a framework design decision.

**Rationale.** Discord the platform, not discord.js the library, is what this
architecture is engineered to absorb change from: a platform policy change
becomes a configuration adjustment, never a rewrite.

### D-2.6 — Storage: PostgreSQL Is the Sole System of Record; Redis Accelerates

**Rule (MUST).** PostgreSQL holds all durable state: JSONB for per-guild
config blobs, ACID transactions for multi-table writes, row-level locking
(`SELECT ... FOR UPDATE`) against concurrent double-actions, LISTEN/NOTIFY as
a cross-process cache-invalidation channel. Redis is the L2 cache, BullMQ
backing store, and cross-shard pub/sub — explicitly not a primary data store.
Any data whose loss would be user-visible lives only in PostgreSQL.

### D-2.7 — Data Access: Knex, Not an ORM

**Rule (MUST).** The data layer uses Knex.js directly — no ORM, no
active-record entities. The repository pattern is the only abstraction over
the database, issuing SQL through Knex rather than string concatenation,
keeping queries explicit and reviewable. Knex's migration system handles all
schema management.

### D-2.8 — Job Queue: BullMQ

**Rule (MUST).** Durable, Redis-backed queues with per-job retry policies,
dead-letter routing, delayed jobs, and rate-limited queues — chosen because
jobs survive process restarts. Cron-style recurring work wraps BullMQ's
repeatable-job mechanism behind a distinct API; recurring tasks and one-shot
jobs MUST NOT be conflated (see D-5.9). The single-Redis SPOF stays tracked
as an open decision in the blueprint's audit register (pg-boss fallback
deferred).

### D-2.9 — Observability: Pino, prom-client, OpenTelemetry

**Rule (MUST).** Pino is the sole logger (structured JSON to stdout);
prom-client exposes metrics in Prometheus text format from `/metrics`;
OpenTelemetry provides tracing with OTLP export. All three pillars carry the
same correlation ID (D-7.1). No subsystem introduces an alternative library
for any of the three signals.

**Rule (MUST).** The sole-logger rule is tooling-enforced, not aspirational:
the ESLint `no-console` rule fails the build on any direct `console.*` call,
mirroring the `no-direct-process-env` pattern — the single exemption is the
Pino root logger's own transport (initialized at Stage 04), and every other
code path routes through the injected logger. A `console.*` call anywhere
outside that exemption is a defect, not a convenience.

### D-2.10 — Validation: Zod Everywhere

**Rule (MUST).** All configuration — process-level environment variables and
every module's own schema — validates against Zod schemas during bootstrap.
A value failing its schema exits the process with a precise, field-by-field
error before any module loads or any gateway connection is attempted. There
is no "handle missing config at runtime" pattern anywhere in this
architecture.

### D-2.11 — HTTP: Fastify

**Rule (MUST).** Fastify serves the health/readiness/metrics endpoints and
the REST surface, started early in bootstrap (D-3.4).

### D-2.12 — Quality Tooling Baseline

**Rule (SHOULD).** TypeScript ^5.5, ESLint ^9 (flat config, including the
architecture-specific rules), Prettier ^3 with a CI `--check` gate, Vitest
^2, tsx for dev-time TS execution, Husky ^9, commitlint ^19 (Conventional
Commits), changesets ^2.

### D-2.13 — Infrastructure Targets

**Rule (MUST).** Docker multi-stage builds; Kubernetes as the primary
production target; Terraform for PostgreSQL, Redis, and cluster provisioning;
sealed Kubernetes Secrets (or Vault/cloud manager) — never plaintext in
manifests or committed env files; GitHub Actions with the five workflows of
blueprint §40, living at the repository root `.github/` — the monorepo has
exactly one CI surface.

### D-2.14 — Distribution Model: Open Core, Gated Marketplace

**Rule (MUST).** The Application Core is open-source; the Marketplace and
the confirmed-developer submission/review pipeline remain gated. Closed-source
developer-only distribution is superseded — do not regress it.

### D-2.15 — Substitution Discipline

**Rule (MUST).** No technology in this part is substituted without a
documented, justified decision recorded in the same style as the blueprint's
stack decision matrix and logged in `change-log.md`.

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

# PART 4 — MODULE SYSTEM FRAMEWORK

*This part governs the engine that discovers, validates, loads, isolates,
communicates with, and disposes of modules. It does not govern module
authorship.*

### D-4.1 — The Manifest Is the Complete Contract

**Rule (MUST).** Every module ships a manifest validated by a strict Zod
schema (28+ fields, including name, version, tier, description, commands,
events, intents, dependencies, configSchema, and the dashboard schema
contract). The manifest is a complete table of contents for a module without
opening a second file — nothing is inferred from file layout, naming, or
convention (P1). Validation is three-time: at intake (upload), at bootstrap
Stage 11, and on every reload.

### D-4.2 — Tier Semantics and Co-Constraints

**Rule (MUST).** The tier field is required in every manifest — omission is a
hard Stage 11 failure. The four tiers behave exactly as specified:

````
Admin        — dev-guild only; registered nowhere else (a Discord-level
               deployment restriction, not a runtime check); owner-gated;
               bypasses the post-gate middleware chain; no rate limits;
               never guild-visible to non-owners.
Core         — loaded for every guild, permanently, no disable mechanism;
               passes the full middleware chain; access governed exclusively
               by the native Discord permissions the command declares —
               a Core-tier command MUST NOT carry a non-default RBAC value.
Standard     — enabled by default once installed; per-guild disableable by
               the guild ADMINISTRATOR role; a disabled module's commands disappear
               from that guild immediately and its handlers stop firing.
Marketplace  — not pre-installed; requires explicit install by a guild
               admin; once installed behaves identically to Standard.
````

The schema enforces the co-constraints at validation time: `admin` ⇒
`devGuildOnly` true; `marketplace` ⇒ `marketplaceCategory` present and valid;
non-marketplace ⇒ category absent; `core` ⇒ no command declares non-default
`permissions.rbac`; `hardcoded` ⇔ `hardcodeGuildId`/`releaseStatus` are
mutually exclusive so public-release eligibility is never ambiguous.

### D-4.3 — Per-Guild Module State: One Table, Fail Closed

**Rule (MUST).** `guild_module_states` (composite key guildId + moduleSlug)
is the single source of truth for whether a module is enabled in a guild
(P13). The dispatch path fails closed: a missing or disabled row ⇒ no
dispatch. A proactive backfill migration keeps the table current as modules
are added, and its currency is verified at Stage 06.

### D-4.4 — Isolation Enforced by Tooling, Not Convention

**Rule (MUST).** Module isolation is structural:

1. An ESLint rule turns any cross-module relative import into a build error.
2. The repository pattern makes a direct query against another module's
   table structurally awkward — and rule/lint coverage extends to the subtler
   violations (see the review checklist, D-8.8).
3. Cross-module writes through the read-only lookup path are never
   acceptable.
4. Within every module, the three-layer rule holds: commands route and
   validate; services hold business logic and emit events; repositories talk
   to the database. No repository logic in a command, no business rule in a
   repository, no event emission below the service layer.

### D-4.5 — Exactly Five Sanctioned Inter-Module Patterns

**Rule (MUST).** The complete set of legal cross-module interactions is:

````
1  Internal Event Bus      — one-to-many, fire-and-forget domain events;
                            emitters have no knowledge of subscribers;
                            names follow {domain}.{entity}.{action},
                            regex-validated at registration.
2  Published DI Token      — synchronous, typed cross-module service call via
                            manifest-declared provides/depends; the interface
                            is the only shared boundary.
3  Cross-Module Read-Only  — the ForCrossModuleRead accessor: single-row,
   Lookup                    key-only lookup declared in crossModuleReads;
                            no joins, aggregates, or filtering beyond the key;
                            writes NEVER through this path.
4  Job Scheduling via      — a subscriber enqueues jobs from emitted events,
   Event Bus                  decoupling business logic from scheduling.
5  Global Data Emit        — a module publishes a durable, schema'd public
                            dataset for cross-module consumption through a
                            read/aggregate API; the emitter owns the dataset
                            contract, consumers read it and never write
                            through it (ADR-004).
````

Any cross-module interaction not expressible as one of these five is an
architecture violation, not an unstated sixth pattern.

### D-4.6 — Soft-Dependency Degradation and Contract Versioning

**Rule (MUST).** A module declaring an optional dependency MUST degrade
gracefully when the dependency is absent — the dependent feature is disabled
with a warning, never a crash. Cross-module contracts (provided tokens,
emitted events) are semver-versioned; a consumer pins a range and is never
silently resolved onto a breaking change (see D-8.9 for the deprecation
window).

### D-4.7 — Module Lifecycle Is a State Machine

**Rule (MUST).** Modules transition through documented lifecycle states with
complete transition rules; the hooks are `onLoad(container)`, `onReady(client)`,
`onUnload()` called at the specified points in bootstrap (Stages 12/17) and
shutdown (Step 03, reverse load order). A module that fails its own hook
disables itself alone — the failure never escapes the module boundary
(P4, D-7.3).

### D-4.8 — The Event Catalog Is a Contract, Enforced

**Rule (MUST).** Every internal event a module can emit is declared in the
event catalog, and every catalog entry carries a payload schema. Three gates
back the catalog:

````
Lint/CI        — an eventBus.emit() call whose event lacks a catalog entry,
                 or whose payload fails the entry's schema, fails the build.
                 A prefix-prohibition lint rejects any event name that embeds
                 a command prefix: the event bus MUST NOT become a side door
                 to the prefix-command ban (D-1.7).
Upload review  — module upload produces a catalog-consistency report
                 (declared events and payload shapes against the catalog)
                 as part of review feedback.
Runtime        — the bus fails closed on an emit that fails membership or
                 payload validation.
````

The catalog is the documentation surface third parties subscribe against;
keeping it current is a review checklist item (D-8.8), and the drift check
SHOULD be automated there as well.

### D-4.9 — Untrusted Module Code Is Never Executed During Validation

**Rule (MUST).** The validation pipeline MUST NOT `import()` an uploaded
module to read its manifest — `import()` executes arbitrary code inside the
validation process. Manifest reading is static AST extraction; validation
runs sandboxed, so an uploaded module cannot harm the validation process.
Compiled `.js` uploads are rejected at intake: modules are uploaded as
TypeScript source and compiled by the zero-trust build pipeline before
staging.

### D-4.10 — Signed, Hash-Bound, Atomically Promoted Modules

**Rule (MUST).** Every module artifact carries a cryptographic signature
verified on every load and reload; the compiled artifact is bound to its
source hash and build identity; promotion to live uses atomic, crash-safe
symlink-pointer promotion so a crash mid-swap cannot leave a
half-deployed module set; a failed post-promotion health check triggers
automated rollback. Where the signing subsystem is not yet present,
hash-bound provenance verification against the build record is the enforced
floor — and signature verification MUST NOT be claimed as present before it
ships (D-1.6).

### D-4.11 — Module Storage: Volumes, Not Images

**Rule (MUST).** The Docker image contains only the Application Core — no
modules baked in. Module source lives on external Kubernetes volumes: a
staging volume (uploads, validation, build) and four per-tier live volumes —
admin, core, standard, marketplace — with the module's tier enforced at rest
(ADR-005). Both staging and the live volumes are `ReadWriteMany` (EFS/NFS)
for multi-replica access. Per-module PVC mounts at the modules directory make
single-module updates image-free operations. Bootstrap discovers modules by
blind scan of the tier volumes — no registry seed, no hardcoded module list
(P1). This split is also what keeps the image small and the supply chain
auditable.

### D-4.12 — Hot Reload: Two Mechanisms, Never Confused

**Rule (MUST).** In-process reload (the Swastik loader over the shared
volume) and core restart are distinct mechanisms with distinct triggers, and
the code keeps them distinct. CPU-intensive module work runs in worker
threads/processes with their own quotas — worker-thread isolation is the
pattern for anything that could contend with the gateway event loop. The
target-state direction — per-module process sandbox isolation over a narrow
RPC interface with permission scope and resource limits enforced at the
sandbox boundary — SHOULD be tracked toward, not away from.

### D-4.13 — Admin-Tier and Marketplace Governance Gates

**Rule (MUST).**

1. The Admin tier is protected by five explicit defense-in-depth layers
   (owner, dev-guild, tier, role, contextual) — not a single owner-ID check.
   Layer 4's `NODE_ENV !== 'production'` guard derives its real force from
   categorical non-production/production credential separation (D-7.5).
2. The public deploy/upload endpoint is rate-limited with anomaly detection.
3. Every per-module, per-version, per-action administrative change carries
   an audit trail with source attribution.
4. Developer registration implements a formal licensing gate with
   multi-state approval (pending → license-verified → approved/rejected) —
   a bare `approvalStatus` column is not a workflow.
5. Dev tokens are stored hash-only and issued once (D-6.4).
6. Community module submission passes the five-gate review pipeline, and
   uploads receive a dependency review report as part of review feedback.

### D-4.14 — Command-Set Governance

**Rule (MUST).**

1. Command-name collisions are detected at build/registration time and are
   fatal — a collision is a development error, never silently resolved.
2. The 100-command-per-guild ceiling is enforced; guild command changes are
   queued and batched through the guild command change queue within the
   12–13 hour window, respecting Discord's 200-per-day creation limit; the
   deregistration batch window is honored rather than expecting instant
   removal.
3. Guild-facing command collision resolution follows the documented
   five-step process.
4. The Ban Registry holds at the command layer: no text-prefix command
   surface exists anywhere, and no command path dispatches an unsolicited
   direct message (D-1.7).

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
early-refresh mechanism MAY reduce expiry cliffs on hot keys. LISTEN/NOTIFY
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

# PART 6 — CONTROL-PLANE SERVICES

### D-6.1 — The Exteriority Axiom

**Rule (MUST).** The control-plane services — the bot, Swastik, Power Engine
Panel, CLAI, and the Credentials Service — are separately-deployed services
that never live inside the gateway-connected process and are never modules.
They are infrastructure in the same category as the database itself, not a
pattern modules may imitate (the narrow, named exception to the
microservices non-goal). The Release Manager in particular owns
its own repository, image, manifests, and CI — placing it under the bot's
entry directory creates a circular bootstrap dependency (deploying the bot
would require deploying the deployer) and is forbidden.

### D-6.2 — Power Engine Panel (PEP)

**Rule (MUST).** PEP is the global administrative authority, implemented as
a documented function-calling model over a fixed catalog of 17 control
domains, with unconditional audit logging of every invocation regardless of
outcome. Its capacity — suspend any guild, module, developer, or command
globally, reach into every core subsystem — is exercised only as deliberate,
logged intervention for cause (abuse, security compromise, confirmed policy
violation), never as routine operation (P14: freedom by default, authority
by exception). Live policy enforcement is applied by the framework's own
policy-enforcement dispatcher at evaluation time; an external
policy-enforcement service has no sanctioned channel for injecting
overrides into a running deployment.

### D-6.3 — CLAI — Operator Terminal

**Rule (MUST).** CLAI provides out-of-band operator access independent of
gateway health, transported over SSH public-key authentication (the ssh2
dependency is the specified transport — the historical plaintext-TCP gap is
a defect to close, not a mode to keep). Session model and command surface
follow blueprint §22.7; every session is audited.

### D-6.4 — Credentials Service — One Issuance Path

**Rule (MUST).** A single shared path issues every credential: cryptographically
random generation, Argon2id hashing at rest (never a raw value persisted
anywhere), `Authorization`-header-only transmission, and independent
revocability. This one policy applies uniformly to bot tokens, developer
devIds, and service-to-service tokens. devId is as sensitive as a bot token
(hash-only storage, issued once). Swastik delegates identity issuance to this
service rather than minting credentials itself.

### D-6.5 — Swastik Is a Control Plane, Not a Request Plane

**Rule (MUST).** Swastik owns deployment, hot reload, hot-swap, developer
registration, licensing, and the marketplace pipeline — it never sits on the
request path. Its target posture is shift-left, fail-fast, crypto-verified
validation across the whole pipeline (the trust-based-checks / late-failures
posture is the misalignment to eliminate, per the blueprint's standing rule).
Release Manager–Swastik coordination uses a renewable Redis lease (30 s TTL, 10 s
heartbeat, fencing tokens, durable PostgreSQL record): core releases pause
module hot-swaps, valid uploads queue (HTTP 202), and scheduled restarts
defer while a release holds the lease; on Release Manager crash the lease
expires and
Swastik resumes within the bounded TTL.

### D-6.6 — Personas (Twill): Opt-In, Additive, Shared Infrastructure

**Rule (MUST).** Multiple bot identities run as separate processes on the
same PostgreSQL, Redis, and job queues — each with its own token, shard
allocation, and module enablement profile, bound per-guild. The mechanism is
reached for only when a hard Discord ceiling (100 commands per guild per
application, or one active voice connection per bot per guild) is actually
hit — never preemptively. A persona instance is a Twill instance: the
guild administrator supplies its bot token and application, Dumby hosts the
process, and one persona is bound to one server. Twill's free charter
carries the explicit sunset condition recorded in ADR-008, and instances
are registered through the Twill registration API (ADR-011). Each
Twill instance decides its own DM behavior within the main bot's
prohibition (D-1.7).

---

# PART 7 — RELIABILITY, SECURITY & PERFORMANCE

### D-7.1 — One Correlation ID, Three Signals

**Rule (MUST).** Every command execution, job run, and HTTP request generates
a correlation ID bound to the context by TraceMiddleware at priority 0. It is
attached identically to every log line (Pino child logger), every trace span
(OTel attribute), and — where the backend supports exemplars — the
corresponding metric observations, and propagated into job payload metadata
on deferral. Cross-signal correlation is a direct lookup, never a
time-window approximation. All logging is structured JSON to stdout; the
logger's redaction list is what enforces "secrets never logged" (P7) — it
MUST be maintained as new secret-shaped fields appear.

### D-7.2 — The Error Taxonomy Is Closed

**Rule (MUST).** Every recognized error extends `DumbyError`, carrying a
machine-readable code, an HTTP-equivalent classification, a `userMessage`
safe for an ephemeral reply, and an `isOperational` flag. The eight concrete
subclasses and their semantics:

````
ValidationError / PermissionDeniedError / NotFoundError /
ConflictError / RateLimitExceededError / ExternalServiceError
        → isOperational: true — expected, handled outcomes; reply with
          userMessage and move on.
ConfigurationError / InternalError
        → isOperational: false — something structurally wrong; logged with
          full context and alerted on. Includes circular dependencies,
          command-key collisions, and event-cycle errors.
````

The root error boundary branches on exactly this distinction; an unrecognized
thrown error is treated as the UNEXPECTED branch of InternalError.

### D-7.3 — Isolation Boundaries: One Failure Never Cascades

**Rule (MUST).** Per-handler isolation on gateway event dispatch, per-module
isolation on lifecycle failures, and per-job isolation in the queue: each
guarding path is wrapped so the owning boundary absorbs its own failure. A
failed module disables itself alone; the process keeps serving everything
else (P4, D-1.5).

### D-7.4 — Resilience Primitives

**Rule (MUST).** Circuit breakers and a retry policy back outbound
dependencies; event-loop lag is monitored and shedding kicks in under
sustained pressure; Discord 429 responses are handled per the documented
rate-limit discipline (respect retry-after, back off, never hammer). These
primitives exist in the core, not per-module.

### D-7.5 — Secrets and Credential Security

**Rule (MUST).**

1. Every secret is supplied exclusively through orchestrator-injected
   environment variables (Kubernetes Secrets sealed at rest, or a vault) —
   never committed, never baked into an image layer. `.env` files are
   gitignored unconditionally; CI secret scanning fails the build on any
   credential-like pattern, independent of developer discipline.
2. Rotating a secret (e.g., `BOT_TOKEN`) triggers an automated rolling
   restart, or is served through an external-secrets/Vault agent that
   hot-reloads — so no fleet-wide cutover leaves every pod holding an
   invalid token simultaneously.
3. Production credentials are categorically distinct from staging and
   development values — never shared, reused, or derived. This is the layer
   that gives the Admin-tier environment guard real force.
4. Input validation at every trust boundary (D-5.9 webhooks; command
   options; REST bodies; manifests; process config): no layer trusts data
   merely because it arrived from another layer inside the same process.
5. The operator-authored security policy lockfile (JSON) is checked at
   Stage 11; ESM loader import restrictions constrain what module code may
   load; the ESLint rule `no-direct-interaction-reply` keeps reply paths
   inside the governed pipeline.
6. Privilege-escalation vectors are blocked structurally, and the four
   documented blocked vectors stay blocked — new escalation paths found in
   review are defects, not features.

### D-7.6 — Performance and Scalability Posture

**Rule (MUST).**

1. Shard topology: each pod carries a contiguous shard range sized to stay
   well clear of Discord's per-shard limits (reference sizing ≈ 1,000
   guilds per shard); cross-shard routine coordination uses Redis pub/sub,
   and `broadcastEval()` is reserved for low-frequency, operator-triggered
   needs only.
2. Zero-downtime rolling updates: `maxUnavailable: 0` / `maxSurge: 1`; the
   new pod must complete all 18 bootstrap stages and flip readiness to 200
   before the old pod receives SIGTERM; shard locks hand off without a gap
   (D-3.8); a rollout progress deadline triggers automatic rollback rather
   than pausing for manual intervention.
3. Deployment hygiene: ≥ 2 replicas; HPA 2–10 on CPU 70% / memory 80%;
   probes on the health port; `runAsNonRoot` uid 1000;
   `automountServiceAccountToken: false`.
4. Canary validation for releases: differential analysis of new vs. old pods
   against SLO thresholds — error rate (< 2% target, ≥ 5% critical), P95
   latency (< 3000 ms target, ≥ 5000 ms critical), shard/queue/cache/DB
   health — with a minimum-sample guard and external-dependency correlation
   so a bad deploy rolls back without false positives.
5. SLO alerting thresholds are defined and wired; Core and Admin tier
   performance baselines (§13.8) hold.

### D-7.7 — Privacy and Data Protection

**Rule (MUST).** User-data erasure and the privacy/GDPR obligations of
blueprint §34 are implemented and testable: data minimization in what is
collected, documented retention (including audit-log retention), and an
erasure path that reaches the data a module persisted for a user. i18n,
data-erasure, and webhook-verification wiring are named gaps in the current
state — they are obligations, not options.

### D-7.8 — Known SPOFs Stay on the Books

**Rule (MUST).** The single Redis instance backing BullMQ remains
documented, monitored, and planned (pg-boss fallback deferred — an open,
tracked decision in the blueprint's audit register) — it MUST NOT be
silently accepted as permanent, nor silently "fixed" outside the ADR
process.

---

# PART 8 — QUALITY, DELIVERY & ACCEPTANCE

### D-8.1 — The Four-Tier Test Pyramid

**Rule (MUST).** Unit (every service, command, and middleware class in
isolation via MockContainer — the large base, every commit) → Integration
(repositories against a real test database; service+repository pairs, every
PR) → Happy-path smoke (one golden-path assertion per critical command, a
pre-deploy release gate) → E2E (full stack against a real test Discord guild
and bot connection, pre-release). Mock-first Discord testing keeps the
headless layers hermetic; shared fixtures under the testing fixtures
directory keep test data consistent.

### D-8.2 — Per-Layer Coverage Floors, Enforced as Hard Gates

**Rule (MUST).** CI enforces these floors per layer — never as a blended
repository-wide average, which would let well-tested module code mask a Core
drop:

````
Application Core (src/core/)          85% statement / 80% branch
Module services                       80% / 75%
Module commands                       75% / 70%
Repositories (core and module)        70% / 65%
Infra-adjacent services               70% / 65%
(queue processors, HTTP routes)
````

Any divergence between these floors and the enforced Vitest thresholds is a
defect reported against this directive.

### D-8.3 — Subsystem Test Priority

**Rule (SHOULD).** Subsystem tests are written in priority order using the
existing DI/MockContainer/ports infrastructure: bootstrap, cache, db,
queue, events, http, permissions, modules, middleware, shutdown. No
subsystem should remain untested while that infrastructure sits unused.

### D-8.4 — CI Sequence and Hygiene: Strict, Fail-Fast, Pinned, Secret-Safe

**Rule (MUST).** `ci.yml` runs on every PR and push to main, as a strict
sequence — a later stage never runs if an earlier one fails:

````
pnpm install --frozen-lockfile
   → tsc --noEmit                (typecheck, strict — first gate)
   → eslint .                    (incl. every architecture-specific rule)
   → prettier --check .          (format gate)
   → vitest run --coverage       (per-layer floors enforced)
   → tsc -p tsconfig.build.json  (production build compiles)
````

Plus: secret scanning on every build; dependency review; supply-chain
hashing (source archive, artifact, lockfile, gate results) with SBOM for
provenance binding.

**Rule (MUST) — workflow hygiene.**

1. Every GitHub Action reference in every workflow is pinned to a full
   40-hex-character commit SHA. Mutable tags and branch references are
   prohibited; a workflow referencing an action by an `@v3`-style mutable
   ref fails CI.
2. `${{ secrets.* }}` expressions MUST NOT appear inside `run:` blocks —
   shell-interpolated secrets leak through process listings, error output,
   and step logs. Secrets reach steps through step-level `env:` mappings or
   over stdin; where a secret must materialize as a file (a kubeconfig, for
   example), it is written to a `mktemp` path guarded by a trap that removes
   it on exit.
3. Dependabot is configured at the repository root for the `github-actions`
   and `npm` ecosystems on a weekly schedule.
4. `scripts/check-workflows.mjs` runs in CI and asserts both invariants
   above — SHA pinning and secrets hygiene — failing the build on any
   violation.

### D-8.5 — The 12-Step Release Workflow

**Rule (MUST).** Releases run the documented Release Manager sequence: (1) deploy
request received → (2) Phase 0 INTAKE → (3) Phase 1 PREFLIGHT → (4) Phase 2
BUILD → (5) Phase 3 ARTIFACT VERIFICATION → (6) Phase 4 CONFIG AND
MIGRATION → (7) Phase 5 LEASE ACQUISITION → (8) Phase 6 SWASTIK LOCK →
(9) Phase 7 ROLLOUT → (10) Phase 8 CANARY VALIDATION → (11) Phase 9
FINALIZE (pass) / Phase R ROLLBACK (fail). Builds are immutable — from a
pinned Git SHA, never a branch head — with cosign signing, SBOM, provenance,
and digest pinning recorded in PostgreSQL. Config validates against the root
Zod schema with a diff/reconciliation step; expand-only migrations run
pre-rollout under advisory lock with a migration ledger. Rollout strategies
are selectable (rolling default, blue-green with shard handoff, phased ramp)
with DAG workload ordering: expand-only migrations → workers → main bot →
personas → reconciliation.

### D-8.6 — Container Discipline

**Rule (MUST).** Multi-stage Docker build: builder stage installs the full
dependency tree and compiles; the runtime stage installs production
dependencies only and copies only compiled output — no TypeScript source, no
devDependencies, no test files in the final image. Non-root user; read-only
root filesystem where the base image permits. The build context is the
workspace root (the Dockerfile's COPY paths reference repo-root paths —
building with the app directory as context breaks, and the Dockerfile header
MUST document this). The image contains the Application Core only (D-4.11).

### D-8.7 — Kubernetes and Terraform Discipline

**Rule (MUST).** Kustomize base + per-environment overlays; `terminationGracePeriodSeconds: 190` maintained and the shutdown logic verified against it; probes on the health port; the service account does not automount tokens; HPA per D-7.6. Terraform environment roots for staging and production with reusable modules (database, cache, kubernetes); secrets created outside the repo. An in-cluster PostgreSQL/Redis dev overlay MAY exist so `kubectl apply` brings up the complete stack locally; it is dev-only and MUST NOT be reused for production. Gateway session resume / shard handoff pairs with the rolling-update strategy for zero-downtime core deploys.

### D-8.8 — Development Workflow and Review Discipline

**Rule (MUST).**

1. Conventional Commits, enforced by commitlint under Husky hooks; staged
   lint on pre-commit.
2. All changes are reviewed before merging to main.
3. The architecture-specific review checklist is applied on every review:
   tier honesty (does the declared tier match how this is actually
   controlled); the three-layer rule; no cross-module reach beyond the four
   sanctioned patterns; every migration has a working `down()`; the event
   catalog is current against actual emits; new jobs are idempotent
   (pre-condition pattern present); coverage floors met per layer, not by
   blended average.
4. The automatable items (eventsCatalog drift, missing `down()`, the
   idempotency pre-condition AST check) SHOULD be promoted into
   static-analysis gates; tier honesty remains a judgment call and stays
   manual.
5. Review also checks: no direct database/Redis access bypassing typed
   services; no security regression (injection, token leakage); no
   performance regression (N+1, unbounded loops, leaks); tests included;
   en-US strings included.
6. Local development brings up the full stack with one command (compiler
   watch, bot process, local PostgreSQL and Redis via compose, dev token and
   test guild — development never touches the production bot); hot reload is
   a development-mode convenience and is disabled in production.

### D-8.9 — Versioning, Deprecation, and Changesets

**Rule (MUST).** Framework and module versions are independent semver
streams — a framework bump implies nothing about module bumps, and vice
versa; compatibility ranges are declared by the module. A breaking change to
a public contract (provided-token signatures, event payloads, command names)
follows the deprecation path: mark deprecated (JSDoc minimum, ideally a
once-per-process runtime warning — not per-call, to avoid log flooding);
coexist old and new for a documented window; major-version bump; remove only
after the window closes. Changesets drive the automated changelog and
release coordination.

### D-8.10 — The Compatibility Ledger Gates Releases

**Rule (MUST).** The Compatibility Ledger is the machine-readable registry
of every cross-boundary contract version window — the module-manifest
schema against the framework, provided-token interfaces, event-catalog
payloads, REST API families, the configuration schema, and the `swastik`
authoring package's supported ranges. It gates both directions of release:

````
Core release    — a release whose contract versions fall outside the
                  windows recorded in the ledger MUST NOT ship.
Module deploy   — a deployment whose declared ranges fall outside the
                  ledger's recorded windows MUST be refused at intake.
````

The blueprint §45 compliance matrix is generated from the ledger.
Hand-maintained compatibility notes are prohibited: a compatibility claim
that exists only as prose — duplicating or contradicting the ledger — is a
defect. The ledger stands from Phase 0 onward, empty but enforced, and every
cross-boundary contract change lands as a ledger diff in the same change set
that changes the contract.

**Verification.** The release workflow refuses on a ledger mismatch; CI
fails any change set that alters a cross-boundary contract without a
corresponding ledger entry.

### D-8.11 — DEFINITION OF DONE — The Finished, Ready-to-Use Dumby Bot

This is the acceptance gate this entire directive exists to reach. A Dumby
deployment is **finished and ready to use** when every item below is true —
each traceable to the part of this directive that guarantees it:

````
BOOT & LIFECYCLE
[ ] A fresh clone installs (pnpm install --frozen-lockfile) and CI is green
    end-to-end through the full D-8.4 sequence.
[ ] Bootstrap completes all 18 stages in order; no partial-start state is
    reachable; a deliberately broken config fails Stage 02 with a
    field-level error, not a runtime surprise (D-3.2/3.3).
[ ] /health/liveness responds from Stage 03; /health/readiness returns 200
    only after Stage 18 with every required:true module healthy (D-3.4).
[ ] SIGTERM executes the 9-step shutdown within its ceilings; the module
    unload runs in reverse load order; no log line or span is lost (D-3.7).

RUNTIME BEHAVIOR
[ ] The deployed bot connects to the Discord gateway and serves its Core
    command surface — a deployed bot has at least the documented Core-tier
    commands responding per the applicable contract (interface.md owns their
    presentation; this directive owns that they route, permission-check,
    persist, and observe correctly).
[ ] Every interaction dispatches through the single canonical router and
    the full middleware pipeline, with the PermissionResolver resolved and
    invoked on every dispatch (D-3.9, D-5.2).
[ ] Permission defaults deny; the seven layers resolve with the documented
    fail directions; a Core-tier command with RBAC set is rejected at
    validation (D-4.2, D-5.2).
[ ] A module that throws in onLoad/onReady/disable disables itself alone;
    the bot keeps responding (D-4.7, D-7.3).
[ ] Guild-level configuration changes take effect immediately, are validated
    on write, and appear in the audit trail (D-5.4).
[ ] The Ban Registry holds: no text-prefix command surface, no classic
    embed, no unsolicited DM — all four enforcement layers present and
    audited against every ingestion surface (D-1.7).

DATA & STATE
[ ] All migrations run core-then-module at Stage 06; every migration has a
    working down(); the guild_module_states backfill is current (D-3.2, D-5.5).
[ ] No user-visible state exists only in process memory; killing any pod at
    any moment loses nothing a user would notice (D-5.7).
[ ] Redis loss degrades (cache miss, queue pause) rather than corrupts;
    PostgreSQL remains the sole system of record (D-2.6).

OBSERVABILITY & SECURITY
[ ] Logs are structured JSON with correlation IDs; /metrics serves the
    catalog; traces export with the same correlation ID (D-7.1).
[ ] Secret scanning passes clean; no secret is committed or baked into an
    image; rotation triggers a rolling restart (D-7.5).
[ ] No webhook route registers without signature verification (D-5.9).

DELIVERY & OPERATIONS
[ ] The release pipeline completes the 12-step workflow from an immutable
    SHA with SBOM and signatures; canary thresholds and auto-rollback are
    active (D-8.5, D-7.6).
[ ] The Compatibility Ledger gates the release; the §45 compliance matrix
    is generated from it, not hand-maintained (D-8.10).
[ ] The Docker image is core-only, non-root, production-deps-only, built
    from the workspace root context (D-8.6).
[ ] K8s deployment: ≥2 replicas, maxUnavailable:0/maxSurge:1, probes,
    terminationGracePeriodSeconds:190, HPA, no automounted service-account
    token (D-8.7).
[ ] Per-layer coverage floors hold (D-8.2); the prioritized subsystem tests
    exist (D-8.3).
[ ] Operational runbooks exist and match reality for: startup failure, high
    error rate, shard disconnect, memory growth, slow command (blueprint §43).
[ ] Every deviation from this directive — past, current, or planned — is
    recorded in change-log.md (D-1.6, 0.6).
````

When every box is checked, the result is the product this directive exists to
produce: a bot an operator can deploy once and run indefinitely — scaled,
observed, secured, and upgradable without downtime.

---

# APPENDIX A — DIRECTIVE-TO-BLUEPRINT TRACEABILITY

````
Directive part   Primary blueprint sections        Governs
──────────────────────────────────────────────────────────────────────
Part 1           §0.1–§0.4, §1–§4, ADR-001/ADR-002   Doctrine, principles,
                                                   non-goals, the Ban
                                                   Registry, deferred-
                                                   greenfield scope
Part 2           §5 (5.1–5.13)                    Stack & runtime
                                                   decisions, sole-logger
                                                   enforcement
Part 3           §6, §8, §9, §10, §23             Core architecture,
                                                   bootstrap, shutdown, DI,
                                                   environment-key policy
Part 4           §7, §11, §13–§18, ADR-004/005    Module system framework,
                                                   tier volumes, Swastik,
                                                   marketplace, the five
                                                   sanctioned patterns,
                                                   event-catalog enforcement
Part 5           §18–§25, §29–§30 (backend)       Middleware, permissions,
                                                   config, data, cache, jobs
Part 6           §15 (control-plane), §22, §35,   PEP, CLAI, Credentials,
                 ADR-008/ADR-011                   Release Manager,
                                                   Swastik, Twill personas
Part 7           §26–§28, §32–§34                 State, observability,
                                                   errors, security, perf,
                                                   privacy
Part 8           §37–§43, §45                     Testing, DX, workflow,
                                                   CI/CD hygiene, infra,
                                                   versioning, the
                                                   Compatibility Ledger,
                                                   compliance, acceptance
````

Excluded by charter: interface.md surfaces (Discord Components V2
presentation, dashboard navigation, banners), module-authoring guidance,
and the illustrative module catalog of blueprint Part VII.

Decision records: rules that cite an ADR are decided by the corresponding
record in `docs/adr/` (ADR-001…ADR-011).

# APPENDIX B — COMPLIANCE SELF-AUDIT CHECKLIST

Before declaring a milestone complete, the owning engineer confirms the
following, which condense the MUST rules most load-bearing to get right
first (mirroring blueprint §45's mandatory feature matrix):

````
[ ] 01  Single unified bootstrap; no partial-start state
[ ] 02  Graceful shutdown with independent per-step timeouts
[ ] 03  Fail-fast config validation before any gateway connection
[ ] 04  DI with compile-time-checkable contracts; no service locator
[ ] 05  Circular-dependency detection at boot, not runtime
[ ] 06  Complete, self-describing module manifest contract (Zod, Stage 11)
[ ] 07  Three-layer separation enforced within every module
[ ] 08  Tooling-enforced module isolation (no cross-module imports/writes)
[ ] 09  Four-tier module governance with tier co-constraints
[ ] 10  Per-guild enable/disable, fail-closed defaulting
[ ] 11  Five-layer Admin-tier defense in depth
[ ] 12  Five — and only five — sanctioned inter-module patterns
[ ] 13  Graceful soft-dependency degradation
[ ] 14  Semver-enforced cross-module contract versioning
[ ] 15  Hot-swap of a single module without a core restart
[ ] 16  Worker-thread/process isolation for CPU-intensive work
[ ] 17  Scheduled zero-downtime core restart independent of ad hoc deploys
[ ] 18  Developer registration, licensing gate, revocable approval
[ ] 19  Five-gate community module review pipeline
[ ] 20  Schema-driven configuration UI contract (MDIS) — contract only;
         presentation excluded from this directive's scope
[ ] 21  Fatal, build-time command-name collision detection
[ ] 22  Bounded, batched guild command change queue
[ ] 23  Enforced 100-command-per-guild ceiling
[ ] 24  Documented guild-facing command collision resolution
[ ] 25  The Ban Registry holds: no text-prefix commands, no classic
         embeds, no unsolicited DMs — each enforced at all four layers
[ ] 26  Per-handler isolation on gateway event dispatch
[ ] 27  Bounded internal-event-bus cycle detection
[ ] 28  Priority-ordered middleware with a single root error boundary
[ ] 29  Stateless, database-referencing component custom_id scheme
[ ] 30  Mandatory re-authorization on sensitive component interactions
[ ] 31  Seven-layer permission resolution, fail-closed where it matters
[ ] 32  Global bot-owner override bypassing every other layer
[ ] 33  Explicit per-user/role grant overrides (Layer 7)
[ ] 34  One permission engine shared across every consuming surface
[ ] 35  PEP global authority via the documented control-domain catalog
[ ] 36  Out-of-band operator access independent of gateway health (CLAI)
[ ] 37  Single shared credential issuance path
[ ] 38  Three-scope configuration model
[ ] 39  Full configuration-change audit trail
[ ] 40  Repository pattern as the sole database abstraction
[ ] 41  Every migration reversible (working down())
[ ] 42  Two-tier cache with stampede protection and negative caching
[ ] 43  Zero process-local user-visible state
[ ] 44  Shard-ownership lock model preventing dual shard connections
[ ] 45  Correlated logs/metrics/traces via one correlationId
[ ] 46  Eight-subclass error taxonomy with operational distinction
[ ] 47  Idempotency required of every job processor
[ ] 48  Reachable maintenance mode that cannot lock out its own operators
[ ] 49  Pino sole logger enforced — `no-console` lint with the single
         logger exemption; no direct console use anywhere
[ ] 50  CI hygiene: every action SHA-pinned (40-hex), no `${{ secrets.* }}`
         inside run: blocks, Dependabot active, check-workflows.mjs gating
[ ] 51  Every environment key consumed by code or documented in the
         operator runbook; production INTERNAL_API_KEY ≥ 32 chars;
         DEV_GUILD_ID a valid snowflake failing fast at Stage 02
[ ] 52  Event catalog enforced: membership, payload-schema, and
         prefix-prohibition lint all present
[ ] 53  The Compatibility Ledger gates core releases and module
         deployments; the §45 matrix is generated from it
[ ] 54  Deferred greenfield work stays excluded — nothing on the list is
         smuggled into correction work
````

# APPENDIX C — LOGGED DEVIATIONS (TRUE UNKNOWNS WITH NO OWNING ROW)

Each item below is specified nowhere and owned by no request row or migration work-order item. It is recorded here as a **logged deviation** rather than silently dropped. Each is routed to the M9 residual tail unless a dedicated row is raised; where an item already carries a partial implementation, its scope gap is stated.

| # | Gap | Home |
|---|---|---|
| 1 | `InputSanitizer` input hardening (§32.10) — specified, not implemented; validation today is the Zod input-validator stage | blueprint §32.10 ([SPEC], logged deviation) |
| 2 | Dynamic token-leak scanning + owner alert (§32.8) | M9 residual |
| 3 | D-7.5.5 policy lockfile / ESM import restriction / `no-direct-interaction-reply` lint | M9 residual |
| 4 | Owner-approval workflow clause (UR-B-01) — reopened PARTIAL | M9 residual |
| 5 | Connection/byte limits clause (UR-C-06) — reopened PARTIAL | M9 residual |
| 6 | Audit-log partitioning + retention (§24.2.1) | M9 residual |
| 7 | Standard `createdBy`/`updatedBy` audit columns (§24.5) | M9 residual |
| 8 | Read-replica routing + `DATABASE_SSL`/`REDIS_TLS` | M9 residual |
| 9 | `eventsCatalog` payload schemas + enforcement gates | M9 residual |
| 10 | Redis pub/sub cross-process L1 invalidation | M9 residual |
| 11 | OpenAPI publication + Compatibility-Ledger registration for HTTP families | M9 residual |
| 12 | The five §43 runbooks | M9 residual |
| 13 | Repository-pattern adoption (raw `db.knex` bypass) | M9 residual |
| 14 | `blocked_users.expiresAt` + global-block uniqueness hole | M9 residual |
| 15 | Worker-only bootstrap + `ROLE=worker` assertion | M9 residual |
| 16 | Configmap ↔ `ENV_KEYS` drift guard (`check-configmap-keys.mjs`) | M9 residual |
| 17 | Husky / commitlint dead wiring | M9 residual |
| 18 | `analytics` / `mdis` / `webhooks` / `operational` / `cli` subsystems | M9 residual |
| 19 | Split-brained maintenance mode; in-memory idempotency / rate-limit | M9 residual |
| 20 | Component-path bypass of the Renderer; invoker re-check bypass for non-minted customIds | M9 residual |
| 21 | Dead legacy colour palette + `EMBED_COLORS` | M9 residual |
| 22 | Duplicated component constants (`components-v2.ts` vs `constants/index.ts`) | M9 residual |
| 23 | Persona ids from a process-local counter | M9 residual |
| 24 | i18n wiring + mandatory `en-US.json` Stage-11 validation | M9 residual |

---

Beyond these fifty-four, every capability specified in blueprint Parts V–IX
— locale resolution, usage metering, the full security architecture, SLO
alerting, privacy/erasure, persona governance, the testing pyramid, and the
complete CI/CD and infrastructure reference — is load-bearing in its own
right and governed by the corresponding part of this directive. The
fifty-four above are the capabilities most load-bearing to get right
*first*, not an exhaustive restatement.

---

**End of directive.** Version 5.0.0 — record all future revisions in
`change-log.md`.
