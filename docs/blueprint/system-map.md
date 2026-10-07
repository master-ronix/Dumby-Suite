---
id: BLUEPRINT-SYSTEM-MAP
title: The Blueprint — How the System Is Wired
kind: blueprint
status: normative
version: 5.0.0
authority_scope: [edges:system, integration, workflows, roles]
contracts: [contracts/module-manifest.schema.json, contracts/config.schema.json]
---

# The Blueprint — How the System Is Wired

This is the **wiring document**: not what each feature *is* (that is `documentation/`),
not what each mechanism must *do* (that is `spec/`), but **how the parts connect,
coordinate, stay compatible, and flow — from the root of the system down to the
end-user surface, seen from every role's vantage point.** If you want to understand how
Dumby holds together as one machine rather than a pile of specs, read this.

---

## 1. The shape of the whole system

Dumby is three layers stacked on one spine.

```
┌──────────────────────────────────────────────────────────────────────┐
│  DISCORD GATEWAY & REST API                                            │
│  one WebSocket connection per shard, via discord.js                    │
└──────────────────────────────────┬─────────────────────────────────────┘
      GatewayIntentBits = the UNION of every loaded module's declared intents
┌──────────────────────────────────▼─────────────────────────────────────┐
│  APPLICATION CORE — one instance of every service, per process          │
│  Bootstrap · DI Container · Event Router · Command Router               │
│  Config Manager · Logger (Pino) · Middleware Pipeline · Permission Engine│
│  Cache Manager · Database Manager · Job Queue (BullMQ) · HTTP (Fastify) │
└──────────────────────────────────┬─────────────────────────────────────┘
        every module loaded through the Module Registry
┌──────────────────────────────────▼─────────────────────────────────────┐
│  MODULE LAYER — N independently-owned modules                          │
│  each Admin / Core / Standard / Marketplace tier; each with its own     │
│  commands, events, services, repositories, jobs, migrations, locales    │
└──────────────────────────────────────────────────────────────────────┘
```

Every box inside the Application Core exists **exactly once per process**. No module
ever constructs its own database pool, its own cache client, or its own logger — every
one of those instances is *handed to it* by the DI container. That single fact is what
makes "one operational surface regardless of module count" a structural property of
the system rather than a discipline a team has to remember.

---

## 2. The load-bearing wall

The whole architecture is one idea held in tension: **one coherent application from the
outside, N independently-owned modules from the inside.** The two halves are not a
balance point between a monolith and a plugin federation — they are a structure that
rules both failure modes out by construction:

- **"Unified" is enforced by the core.** There is exactly one bootstrap, one DI
  container, one event bus, one permission engine, one configuration system. A module
  cannot bring its own logger or its own settings command, because it is never handed
  the means to. Unification here does not *ask* for consistency; it *removes the
  alternative*.
- **"Modular" is enforced by the module contract.** A module cannot reach into another
  module's files or tables; the build fails. Cross-module access exists, but only
  through five sanctioned patterns (below). Modularity here is not a folder convention;
  it is a wall the tooling keeps standing.

The wall between the two is deliberate and load-bearing: every mechanism from the
bootstrap sequence to the permission engine to the deployment pipeline exists to keep
it intact as the system grows from its first module to its hundredth.

---

## 3. The Application Core — the single instance of everything

The core is not "the code that runs the bot." It is the set of **shared services every
module depends on but none of them owns**:

| Core service | What it is the single source of | Consumed by modules via |
|---|---|---|
| **Bootstrap** | the one 18-stage startup sequence | (runs before modules load) |
| **DI Container** | every service instance, by Symbol token | constructor injection |
| **Event Router** | gateway event dispatch to module handlers | `IEventHandler` registration |
| **Command Router** | slash/context-menu dispatch + the middleware chain | `ICommand` registration |
| **Config Manager** | core / guild / process-module configuration | `TOKENS.Config`, guild config |
| **Logger (Pino)** | structured logs with one correlation id | `TOKENS.Logger` child logger |
| **Middleware Pipeline** | the 12-stage ordered chain every interaction passes | (automatic; not bypassable) |
| **Permission Engine** | the seven-layer authorization answer | declaration only (`permissions`) |
| **Cache Manager** | two-tier L1/L2 caching | `TOKENS.Cache` |
| **Database Manager** | PostgreSQL system of record (Knex, not an ORM) | repositories |
| **Job Queue (BullMQ)** | background/delayed/scheduled work | `TOKENS.Queue`, job processors |
| **HTTP Server (Fastify)** | health, metrics, admin API, MDIS | (internal) |

The pattern is uniform: **a module declares what it needs; the container injects it;
the module never reaches for a global.** That is what makes every class independently
testable and the cross-module dependency graph fully explicit rather than hidden
inside import chains.

---

## 4. The Module Layer — how a module attaches to the core

A module is not "loaded" so much as **admitted**, in a fixed sequence the core runs at
startup:

1. **Discovery** (Stage 10) — the loader **blind-discovers** modules on the four
   per-tier volumes (`modules-admin`, `modules-core`, `modules-standard`,
   `modules-marketplace`, plus `swastik-staging`). There is no hardcoded module list;
   whatever the volumes hold is what the fleet runs.
2. **Validation** (Stage 11) — every `manifest.ts` is validated against the shared Zod
   schema; the cross-module dependency graph is resolved and cycles are detected. An
   invalid manifest or a dependency cycle is a **fatal startup error**.
3. **Load** (Stage 12) — `onLoad(container)` is called on every module in **topological
   order**, so a module that depends on another's token can safely resolve it at
   construction time.
4. **Command registration** (Stage 13) — command classes are collected and registered;
   name collisions are detected as a **development error**.
5. **Event registration** (Stage 14) — event handler classes are registered with the
   Event Router.
6. **Ready** (Stage 17) — `onReady(client)` runs once the gateway is connected; a
   module that throws here is disabled alone, with a warning — the bot stays live.

At no point does a module get a raw database handle, a raw Redis client, or a
filesystem path into another module. The tier volume a module lives on *is* a statement
about the trust it carries.

---

## 5. Integration — how the subsystems connect

The subsystems are not independent; they are wired into a single graph. The key edges:

- **Gateway → Event Router → Command Router.** Discord events arrive; `interactionCreate`
  is routed to the Command Router; everything else is dispatched to module event
  handlers. Intents are the *union* of what loaded modules declare — the core requests
  nothing a module did not ask for.
- **Command Router → Middleware Pipeline → Command.** Every dispatch runs the ordered
  chain before any handler. This is the one path; nothing bypasses it.
- **Middleware → Permission Engine.** The Permission and RBAC middleware stages call the
  one seven-layer resolver. A module declares `permissions`; the engine decides.
- **Middleware → Config Manager → Cache → Database.** The Guild Config stage loads
  per-guild config through the L1→L2→PostgreSQL cascade (below).
- **Command → Service → Repository → Database.** The three-layer rule: validation in
  the command, business rules in the service, data access in the repository.
- **Service → Event Bus → Subscriber → Job Queue.** The idiomatic async edge: a service
  emits a domain event; a subscriber translates it into queued work. Business logic
  never talks to the queue directly.
- **Command/Service → Renderer.** Handlers return a declarative response; the Renderer
  builds the Discord payload and issues the buffer embed. No module hand-assembles what
  a member sees.
- **Everything → Logger/Metrics/Tracing.** One correlation id threads a request through
  logs, metrics, and traces.

Each edge is one-directional and typed. There are no cycles (the loader rejects them),
and there are no hidden edges through shared globals (the DI container forbids them).

---

## 6. The command workflow — root to end-user surface, end to end

This is the single most important flow in the system. Every role's experience is a
vantage point on this one path.

```
User presses Enter on a slash command
  │
  ▼  Discord Gateway → discord.js delivers InteractionCreate
  ▼  EventRouter.handleGatewayEvent('interactionCreate', interaction)
  ▼  CommandRouter.dispatch(interaction)
  │     looks up by composite key: commandName[:subgroup][:sub]
  ▼  Module-active check for this guild          ← fails CLOSED (missing/disabled ⇒ no dispatch)
  ▼  MIDDLEWARE PIPELINE (strict priority order):
        -20 MaintenanceMode   short-circuits everything if maintenance is set
        -10 AdminTierGate     owner-only gate, Admin tier only
          0 TraceMiddleware   opens the span, binds the correlation id
         10 Auth              resolves interaction.user
         20 GuildConfig       loads per-guild config into context (L1→L2→DB)
         30 Locale            binds the i18n instance (guild → user → en-US)
         40 RateLimit         atomic check-and-increment (Redis, fleet-wide)
         50 Permission        Discord bitfield check   (Layer 5 of 7)
         60 RBAC              Dumby rank check         (Layer 6 of 7)
         70 Cooldown          per-user per-command cooldown
         80 Defer             deferReply if command.requiresDefer
         90 Analytics         records the invocation start
        100+ module-global middleware (manifest-declared)
        200+ command-scoped middleware (command-declared)
  │     each layer calls next to continue; any abort short-circuits outward
  ▼  Command.execute(interaction, context)
  ▼  Service call → repository for any data access
  ▼  Command returns a declarative response → RENDERER builds & issues the render
  │     middleware .after hooks run in reverse priority order
  ▼  Analytics records outcome/duration/status; Trace closes the span
  ▼  metrics: dumby_commands_total{module,command,status}, dumby_command_duration_seconds
  ▼  User sees the response in Discord
```

Read that once and you understand where every concern lives: authorization is the
engine's, presentation is the Renderer's, validation is the command's, business logic
is the service's, persistence is the repository's, and observability is threaded
through all of it by one id.

---

## 7. Coordination — how the parts stay in step

The parts do not just connect; they coordinate, through four mechanisms:

- **The configuration cascade.** Per-guild config is read L1 (in-process LRU) → L2
  (Redis) → PostgreSQL, backfilling on the way out. A guild-level change takes effect
  immediately — no restart, ever — because invalidation is broadcast over Redis pub/sub.
- **The event bus.** Cross-module *reactions* are fire-and-forget: an emitter never
  knows its subscribers. This decouples side effects (logging reacts to moderation;
  analytics records economy transactions) without coupling modules.
- **The job queue.** Work that must happen later (or must survive a restart) is queued,
  idempotent, and backed by Redis. Scheduled jobs take a distributed lock so exactly one
  replica runs each tick.
- **Sharding.** At scale, guilds are spread across shards:
  `shardId = (guildId.toBigInt() >> 22n) % BigInt(totalShards)`. One shard reaches
  another only via `client.shard.broadcastEval` (low-frequency, operator-triggered) or
  Redis pub/sub (routine, high-frequency). No module ever assumes it runs unsharded.

---

## 8. Compatibility — how the parts stay compatible as they change

This is the part most systems get wrong, and where Dumby is most deliberate:

- **Every cross-module surface is a versioned contract.** A module's `provides` tokens
  and `eventsCatalog` are part of its own semver. Publishing a token makes it a public
  API; publish exactly as wide as others need and no wider.
- **Dependencies are pinned, and validated before boot.** A consumer declares
  `depends: [{ token: A_TOKEN, version: '^1.0.0' }]`; Stage 11 validates the pin against
  the loaded version. An incompatible dependency is a **fatal startup error**, never a
  silent runtime mismatch discovered by a user.
- **The Compatibility Ledger gates releases.** It is the machine-readable registry of
  every cross-boundary contract's supported version window. When a change would break a
  window, the change does not proceed until the ledger is satisfied. Evolution without
  breakage is a policy written down, not hoped for.
- **Soft dependencies degrade explicitly.** When module B uses module A
  opportunistically and A is disabled *for that guild*, the call returns a
  `ModuleDisabledResult` sentinel rather than throwing — and B must decide what that
  means for its own feature. The framework cannot make that decision for B; B documents
  and tests it.
- **The core is immutable; modules are mutable.** Core changes ship through CI/CD with
  a rolling restart. Modules update through Swastik's hot-swap — `onUnload → re-import
  → onLoad → onReady → self-health` — with automatic rollback to the preserved previous
  version on failure. A failed swap is never left half-applied.

---

## 9. The roles — one system, many vantage points

"All roles" is not a permission list; it is the recognition that the *same* wired
system presents differently depending on who is looking. Six vantage points:

### 9.1 The bot owner (platform operator)
Sees the **Admin tier**. Owner-override is Layer 1 of the permission engine — it
bypasses every other layer. Admin commands are registered *only* in the development
guild and never appear in a production guild's command list. The bot owner is also who
the **Power Engine** (the policy enforcement point) serves: administrative authority
exposed as a catalog of documented, audited functions.

### 9.2 The guild administrator
Sees the **guild's** configuration surface and the Core Command Surface: `/dashboard`
(the home), `/modules` (install/enable modules for *this* guild), `/browse` (the
marketplace), `/queue` (**BCCM** — rename/alias commands, within the 100-command
ceiling), `/permit` (grant/revoke in the guild's own RBAC vocabulary), `/persona`
(**Twill** — commission a second bot identity). Every action here is a guild-scoped
write that takes effect immediately.

### 9.3 The moderator
Sees the **moderation** surface of whatever Standard modules the guild enabled —
enforced by the RBAC rank ladder (`OWNER > ADMINISTRATOR > MODERATOR > HELPER > MEMBER
> RESTRICTED`) and the guild-side Layer 7 grants. A moderator never re-implements a
permission check; the engine decides.

### 9.4 The member
Sees the **rendered** surface: one visual language (the Renderer), one accent, three
density modes they can choose (D/M/C). They never see the seams — no module's
presentation leaks another's, because the Renderer owns all of it.

### 9.5 The module developer
Sees the **`swastik`** authoring surface: `defineManifest`, `ICommand`, `IEventHandler`,
the test harness, the scaffold CLI. They write one vertical slice, declare its contract,
and submit it — through the five-gate review pipeline if third-party. They never see
the core's internals, and their module never sees another's.

### 9.6 The platform/SRE operator
Sees the **operational** surface: the 18-stage bootstrap and 9-step shutdown, the four
tier volumes, the health/readiness probes, the SLOs (99.5% availability; 95% of
commands under 200 ms), the CI/CD pipeline, and the Swastik promotion pipeline. They
run the fleet; they do not touch feature logic.

---

## 10. The end-user surface — how the experience is composed

The operator's and member's experience is **composed**, never assembled ad hoc. Every
surface a user sees is issued by the core **Renderer** against one grammar:

- one static frame (Components v2) — container, dividers, title/subtitle, footer;
- four dynamic slots — accent (fixed blurple `#5865F2`), banner, module identity,
  content;
- three density modes — D (detailed), M (medium), C (compact);
- a buffer-then-render lifecycle — every interaction is answered instantly, then edited
  into the final render or a formal notice frame;
- edit-in-place navigation — moving through a page never floods a channel.

Because the Renderer is the single emission path, the classic-embed ban and the
prefix-command ban are *terminal*: there is no code path around them. A module author
declares what a command offers; the system decides how it looks.

---

## 11. Twill — when one identity is not enough

Two hard Discord ceilings — 100 commands per guild, and one active voice connection per
guild — mean a single bot identity eventually stops being enough. **Twill** is the
escape hatch: a **Persona** is a complete additional Discord Application whose token
the guild administrator supplies (bring-your-own-identity), hosted and operated by
Dumby, bound to exactly one server. A Persona is not a lighter bot — it is *the
framework running again under a different identity*, sharing the same PostgreSQL
primary, Redis, and queues as the main bot. It is opt-in, additive, and reached for
only when a ceiling is actually hit.

---

## 12. The invariants that hold the whole thing together

If you remember nothing else from this document, remember the wiring's invariants —
the rules that make it one machine:

1. **One instance of everything.** No module constructs its own infrastructure.
2. **One dispatch path.** Every interaction passes the same middleware chain and the
   same permission engine; nothing bypasses them.
3. **One presentation path.** Every surface is issued by the Renderer.
4. **One direction per edge.** Commands → services → repositories; emitters → events →
   subscribers → jobs. No cycles, no hidden edges.
5. **Five sanctioned cross-module patterns, and only five.** Event bus · published DI
   token · read-only accessor · job-scheduling via event bus · Global Data Emit.
6. **Contracts are versioned and validated before boot.** Breaking changes are fatal
   at startup or blocked by the Compatibility Ledger — never discovered in production.
7. **State lives in PostgreSQL or Redis, never in a process.** Any pod can die and be
   replaced without a user noticing.
8. **The core is immutable; modules are mutable.** Core ships by rolling restart;
   modules hot-swap with automatic rollback.

Hold those eight and the system is coherent at ten modules or ten thousand. Break any
one and you have started rebuilding the monolith or the plugin federation this
architecture exists to refuse.


---

## 13. Wiring reality — what the code currently connects

A wiring document that describes only the intended graph is half a wiring document. This
section states, edge by edge, what the tree at commit `e60ee66` actually connects, and
where the code is narrower than the specification. The rule applied here is the project's
standing one: **the specification is the target; where the code is narrower, the code is
the gap.** Each row's evidence is a path under `apps/main/`.

| Edge / invariant | Specified | Wired in code today | Evidence |
|---|---|---|---|
| One instance of everything | yes | yes — a fixed core token registry | `src/di/tokens.ts` (22 core tokens) |
| 18-stage bootstrap | yes | yes — exact order | `src/bootstrap/stages.ts` |
| 9-step shutdown | yes | yes — exact order | `src/bootstrap/stages.ts` |
| 12-stage middleware pipeline | yes | yes — 12 built-ins with priorities −20…90 | `src/middleware/built-in/*.ts` |
| One dispatch path (pipeline invoked on every dispatch) | yes | **gap** — the pipeline exists, but the live router must invoke it on every dispatch | `src/commands/command-router.ts` vs `src/middleware/middleware-pipeline.ts` |
| Seven-layer permission engine | yes | exists; must be resolved on the live request path (a registered-but-never-resolved resolver is a wiring defect) | `src/permissions/resolver.ts` |
| One presentation path (Renderer) | yes | yes — a single core renderer; accent `0x5865f2` | `src/rendering/core-renderer.ts`, `src/shared/constants/colors.ts` |
| Five sanctioned cross-module patterns | yes | enumerated in §14; enforcement target is the Swastik static analyzer | `spec/modules/inter-module-communication-and-contracts.md` |
| Tier-at-rest volumes | yes | yes — env-driven | `src/config/env.schema.ts` (`MODULES_DIR`, `SWASTIK_*_VOLUME_PATH`) |
| One canonical command tree | yes | **gap** — a second command subsystem must be wired as the live router or consolidated into it (one-canonical-path rule, P13) | `src/commands/` |
| Admin-tier gate | specified as layered | **gap** — where reduced to a single owner check, the layered behaviour is the target | `src/permissions/admin-tier-gate.ts`, `src/middleware/built-in/admin-tier-gate.ts` |
| Ports | API/health/metrics + control plane | yes — 8080/8081/8082/8083/8084/8085/8086/8090 | `src/config/env.schema.ts` |

Read this table as the honest companion to §2–§12: the graph is the target, and the
"gap" rows are the wiring work that remains. They are tracked machine-readably in
`status/code-reconciliation.json`.

---

## 14. Verification map — where each wired claim lives

| Claim in this document | Where to check it |
|---|---|
| The Application Core exists once per process | `apps/main/src/application/Application.ts`, `apps/main/src/di/container.ts` |
| Bootstrap is 18 ordered stages | `apps/main/src/bootstrap/stages.ts` (`BOOTSTRAP_STAGES`) |
| Shutdown is 9 ordered steps | `apps/main/src/bootstrap/stages.ts` (`SHUTDOWN_STEPS`) |
| The middleware chain and its priorities | `apps/main/src/middleware/built-in/*.ts` (`priority`) |
| The seven-layer resolver and its fail-open/fail-closed asymmetry | `apps/main/src/permissions/resolver.ts` |
| The rank ladder OWNER…RESTRICTED | `apps/main/src/permissions/rank.ts` |
| The internal event bus and its depth guard | `apps/main/src/events/event-bus.ts` |
| The gateway event router | `apps/main/src/events/event-router.ts` |
| The core renderer, modes, and notice frames | `apps/main/src/rendering/core-renderer.ts` |
| The module manifest contract and tier rules | `apps/main/src/module-system/manifest.schema.ts`, `src/module-system/tier-rules.ts` |
| Module storage volumes | `apps/main/src/config/env.schema.ts` |
| The eight first-party modules | `packages/modules/` |

A reader who wants to falsify any claim in this wiring document has, in this table, the
path that either confirms it or shows the gap. That is the standard the blueprint holds
itself to: every edge is checkable against the tree, and where the tree and the wiring
disagree, the disagreement is recorded rather than smoothed over.
