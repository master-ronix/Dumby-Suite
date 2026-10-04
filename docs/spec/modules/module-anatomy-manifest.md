---
id: SPEC-03-MODULES-0011
title: 11. Module Anatomy & Manifest
kind: spec
status: normative
version: 5.0.0
authority_scope: [03-modules]
anchors: [MODULE_ANATOMY_MANIFEST, THE_MODULE_AS_THE, THE_MODULE_MANIFEST_COMPLETE, MANIFEST_VS_DATABASE_WHAT, MODULE_INTERNAL_STRUCTURE_THE, MODULE_LIFECYCLE_HOOKS_ONLOAD, THE_MODULE_CONTRACT_MANIFEST, LEGACY_ADR_002_FLATTENED, THE_THREE_LAYER_RULE, MODULE_ISOLATION_RULES_ENFORCED, THE_MODULE_CONTRACT_COMPLETE, MODULE_LIFECYCLE_HOOKS_COMPLETE]
contracts: [contracts/module-manifest.schema.json]
acceptance: [ACC-MOD-0011-1, ACC-MOD-0011-2, ACC-MOD-0011-3, ACC-MOD-0011-4, ACC-MOD-0011-5]
owners: [framework-maintainers]
last_verified_commit: null
review_state: pending-evidence
---

## 11. Module Anatomy & Manifest

**Status:** [SPEC]

### 11.1 The Module as the Unit of Ownership

A module is the fundamental unit of feature ownership — a complete **vertical slice**
through the application stack: commands, event handlers, services, repositories,
background jobs, scheduled tasks, database migrations, locale files, and tests, all in one
package, governed by one manifest, answerable to one functional owner. Nothing inside a
module is visible to another module **except what it deliberately publishes**.

Every module belongs to exactly one governance **tier** — Admin, Core, Standard, or
Marketplace — declared in the manifest and enforced by the framework everywhere
visibility, controllability, and rate-limit treatment matter (§13). In the tree, a module
is a package under `packages/modules/<slug>/` with a `manifest.json` and a `src/index.ts`;
the eight first-party modules (`browse`, `dashboard`, `health`, `hello-world`, `modules`,
`permit`, `persona`, `queue`) are ordinary instances of the same shape a third-party
author produces.

### 11.2 The Module Manifest — Complete Field Reference

Every module's manifest is a single object validated against the **manifest Zod schema**.
The same schema must be shared between Swastik's upload-time validator and the bot's
Stage 11 validator — schema drift is what produces "works in staging, fails in
production," so the target state is one shared schema package imported by both.

The field list is **complete**: no field may be added without a framework-version bump
(P1 — the manifest is a complete table of contents for a module without opening a second
file). The specified field set, with its co-constraints:

- **`name`** (string, required, kebab-case, globally unique). Used in DI token namespaces,
  cache-key prefixes, queue-name prefixes, migration-ownership attribution, and every
  log/metric/trace label.
- **`version`** (string, required, semver) — the module's own version, independent of the
  framework's. Validates inter-module dependency compatibility.
- **`description`** (string, required, 1–120 chars) — the summary shown wherever installed
  modules are listed.
- **`tier`** (`admin` | `core` | `standard` | `marketplace`, required). Determines
  visibility, controllability, rate-limit treatment, and marketplace surfacing. **No
  default** — an omitted tier fails validation and the application does not start.
- **`devGuildOnly`** (boolean, required when `tier === 'admin'`, forbidden otherwise).
- **`hardcoded`** (boolean, required). `true` ⇒ a private build confined permanently to
  the guild in `hardcodeGuildId`; it requires `visibility === 'private'` and pins its
  commands to that guild alone (§17.4). `false` ⇒ eligible for public release once the
  developer's licence is approved (§15.7). Independent of tier.
- **`hardcodeGuildId`** (snowflake, required when `hardcoded === true`, forbidden
  otherwise). The `guildId` compared against it MUST be threaded as a branded `GuildId`
  snowflake type, never a bare string, so that a userId passed in its place is a type
  error rather than a silent authorization bypass.
- **`visibility`** (`public` | `unlisted` | `private`, required when `hardcoded === false`,
  forbidden otherwise) — validated at all three manifest validation points (development,
  upload, activation) and co-constrained with tier and the hardcoded toggle. `public`
  lists in the browsable catalogue; `unlisted` installs by direct reference but never
  lists; `private` is invisible to every guild but the owning developer's.
- **`releaseStatus`** (`private` | `public`, required). The schema is a **discriminated
  union on `hardcoded`**: the `hardcoded: true` variant carries `hardcodeGuildId` and
  admits only `releaseStatus: 'private'`; the `hardcoded: false` variant forbids
  `hardcodeGuildId` and admits either value. On top of the union, the **visibility triad**
  runs as one `superRefine` block: `hardcoded === true` requires `releaseStatus ===
  'private'` and a present `hardcodeGuildId`; `hardcoded === false` forbids
  `hardcodeGuildId`; `releaseStatus === 'public'` requires `hardcoded === false` and
  `visibility === 'public'`. A violating manifest fails with **one error naming the
  conflicting fields together**, not three independent errors.
- **`devId`** (string, required) — the registered developer identifier (§15.6), required
  to equal the subject of the licence under which the module is submitted (§15.7).
- **`buildId`** (string, required) — the identifier for this specific uploaded version
  (§15.8); the registry validates the `devId`/`buildId` pair before load.
- **`marketplaceCategory`** (`audio` | `community` | `security` | `integrations` |
  `utility`, required when `tier === 'marketplace'`, forbidden otherwise) — a closed
  five-value enum; an unknown category fails validation rather than creating a sixth
  group.
- **`required`** (boolean, default `false`) — `true` ⇒ a failure in this module's `onLoad`
  is fatal to the whole application at Stage 12; `false` ⇒ the module is disabled with a
  warning and startup continues.
- **`depends`** (array of `{ token, version }`, default `[]`) — hard dependencies on
  another module's published DI token. Bare token entries are not accepted; every entry is
  a `{ token, version }` pin, with `version` a semver range. Stage 11 runs a
  range-satisfaction evaluator: a token that resolves to no loaded module, or one whose
  version does not satisfy the range, is a **fatal Stage 11 error** naming the token, the
  range, and the version found.
- **`provides`** (array of `{ token, contract }`, default `[]`) — the services this module
  publishes; `contract` references a TypeScript interface checked statically by `tsc`
  against every consumer.
- **`intents`** (array of `GatewayIntentBits`, default `[]`) — the union across every
  enabled module is what bootstrap Stage 15 requests.
- **`partials`** (array of `Partials`, default `[]`).
- **`commands`**, **`events`**, **`services`**, **`repositories`**, **`jobs`**,
  **`tasks`**, **`routes`**, **`middleware`**, **`migrations`**, **`locales`**,
  **`config`**, **`eventsCatalog`**, **`dashboardSchema`**, **`crossModuleReads`** — the
  contribution and contract surfaces, each with the shape the framework expects.

**The manifest co-constraint truth table.** The tier rules reduce to a small set of cases
(enforced in `tier-rules.ts`): an Admin module MUST set `devGuildOnly: true` and no other
tier may; a Marketplace module MUST declare a `marketplaceCategory`; a Core module's
commands MUST NOT declare an RBAC requirement (Core is RBAC-exempt); and a `hardcoded:
true` module MUST be `private`.

> **Divergence — spec is authority, code is the gap.** The runtime Zod schema currently
> narrows several fields above (`releaseStatus` is `['alpha','beta','stable','deprecated']`
> and optional; there is no `visibility` field; `devId`/`buildId` are optional; `required`
> is mandatory; `marketplaceCategory` is a free string; `depends`/`provides`/`services`
> are `z.array(z.string())`). Per the project's standing rule the specification is the
> target state and these are implementation gaps, logged in
> `status/code-reconciliation.json` (REC-001…REC-005, REC-019…REC-022).

### 11.3 Manifest vs. Database — What Lives Where

Manifest fields belong to the manifest because they are **fixed at build time and travel
with the code**: name, tier, declared dependencies, the `hardcoded`/`visibility`
classification, and the `devId`/`buildId` pair are facts about one versioned artifact,
unpacked and validated fresh at every bootstrap and every hot-swap. The manifest is
**read, never written**, by anything inside the process.

Everything that changes at runtime independently of a code change belongs to the
**database**: per-guild config (`guild_configs`), per-guild enabled/disabled state
(`guild_module_states`), developer licence state, and build staging/promotion state.
Coordination is narrow and one-directional: the manifest declares what a module **is** and
**requires**; the database records what is currently **true** about a guild's or
developer's relationship to it.

### 11.4 Module Internal Structure — The Canonical Layout

Every module follows the canonical structure; an absent folder means no deliverable in
that category — the framework never requires empty directories. The `guild_module_states`
table is the **sole authority** for module enabled/disabled state (P13, one source of
truth): no code path may write module state to any other table.

```
TREE 11-A — Canonical module layout (moderation, illustratively)

manifest.json           ← the complete contract
package.json / tsconfig.json
src/index.ts            ← exports commands + onLoad / onReady / onUnload
src/commands/           ← one file per command (ban, kick, mute, warn, case, purge …)
events/                 ← gateway event handlers
services/               ← business logic (the orchestrator, case lifecycle, bulk ops)
repositories/           ← all SQL against the module's own tables
jobs/                   ← delayed / background work
tasks/                  ← cron tasks
config/                 ← the module's Zod config schema
migrations/             ← the module's own tables, versioned and reversible
locales/                ← en-US.json (required) + others
ui/                     ← the MDIS dashboard schema, if any
tests/                  ← unit + integration
```

### 11.5 The Three-Layer Rule Inside a Module

Dependencies run one way: **commands call services; services call repositories; neither
reverses.**

```
DIAGRAM 11-A — The three-layer rule

Command   → validation, routing, presentation
Service   → business logic, decisions, transformations, event emission
Repository→ SQL only — no business logic, no event emission
```

Why it matters: a repository emitting an event, or a command querying the database
directly, violates P3 (single responsibility at every layer). The boundary is what lets a
test substitute any layer with a double — a service test mocks its repositories, a command
test mocks its services, and neither needs a real database or a live gateway.

Forbidden, and caught by lint rather than review:

- A command calling a database client directly (bypasses the service layer, no rule
  enforced, no event emitted, untestable without a real database).
- A repository emitting an event (a repository has no business context for *when* an event
  should fire).
- A service calling another module's repository directly (skips both module sovereignty
  and the three-layer rule; the correct path is a published token or a `ForCrossModuleRead`
  accessor, §14).

### 11.6 Module Isolation Rules — Enforced by Tooling, Not Convention

The isolation rules are build failures, not review habits:

1. **No cross-module relative imports** — an ESLint rule with a per-module glob; the only
   legal path into another module's territory is its published DI token.
2. **No writes to another module's tables** — reads only through a declared
   `ForCrossModuleRead` accessor; cross-module writes are never acceptable.
3. **No mutation of another module's config namespace** — schema namespacing prevents key
   collisions.
4. **No cross-module middleware hooking** — a middleware may not intercept another
   module's commands unless declared `global: true`.
5. **Every cross-module dependency is declared** — a module using another's service
   without declaring the token in `depends` fails to resolve it at Stage 12: a fatal
   startup error, not a silent null.
6. **No direct database, cache, filesystem, process, or environment access** — every one
   arrives through a typed service (§11.12).
7. **No global event listeners** — the event bus is the only event mechanism.
8. **No modification of the module registry** — it is core infrastructure, not injectable.

### 11.7 The Module Lifecycle Hooks — Complete Reference

The loader calls the hooks in order; each is expected to be idempotent, because the
framework may retry a failed load or call a hook during shutdown.

- **`onLoad(container)`** — called once when the module is first loaded, receiving the
  resolved service container. Initialise state, register background jobs, prepare caches.
  A throw transitions the module to ERROR and is logged with a full stack trace. Called
  exactly once per load, **not** on enable/disable transitions.
- **`onReady(client)`** — called at Stage 17 once the gateway is connected. A throw
  disables the module alone; the bot stays live.
- **`onUnload()`** — the final cleanup hook: deregister handlers, release resources,
  cancel jobs. A throw is logged but the module still transitions to UNLOADED. Called
  exactly once per unload (and possibly again during shutdown).
- **`onEnable` / `onDisable`** (optional) — start and stop active processes on the
  DISABLED ↔ ENABLED transitions. `onDisable` always runs before `onUnload`.
- **`onError`** (optional) — cleanup on an unrecoverable error.
- **`onConfigChange`** (optional) — react to a per-guild config change without a reload.

### 11.8 Per-Guild Module State — The `guild_module_states` Contract

Admin- and Core-tier modules need no per-guild state — their controllability is global and
static. Standard- and Marketplace-tier modules keep one row per guild per module in
`guild_module_states`, the single source of truth for enablement, configuration, and
lifecycle state.

```
SCHEMA 11-B — guild_module_states

guildId        snowflake   (PK, composite with moduleSlug)
moduleSlug     string      (PK; matches the manifest name)
tier           'standard' | 'marketplace'   (denormalised for filter speed)
status         'active' | 'disabled' | 'never_installed' | 'install_pending_resolution'
wasStandardDefault boolean  (display-only)
installedAt    timestamptz nullable
disabledAt     timestamptz nullable
dataRetentionPolicy 'retain' | 'purge_after_30d'
createdAt / updatedAt / createdBy / updatedBy   (audit columns)
```

```
DIAGRAM 11-B — Read path, evaluated before every Standard/Marketplace dispatch

GuildModuleStateService.isActive(guildId, moduleSlug):
  1. L1 in-process LRU  key guild:module-state:{guildId}:{moduleSlug}   → hit ⇒ return
  2. Redis L2, same key, TTL 60s                                        → hit ⇒ backfill L1
  3. PostgreSQL read replica:
       row FOUND              ⇒ populate both caches, return
       row GENUINELY ABSENT   ⇒ resolve to the tier default (active for Standard,
                                never_installed for Marketplace), write it as the row
       replica+primary DOWN   ⇒ DISABLED (fail-closed)
```

The read path is deliberately fail-closed: a genuine database outage never grants access
to a module a guild turned off. But a read-replica-only outage with a healthy primary is
*not* an outage — the path falls through to the primary before it ever returns DISABLED.
The write path is a single transaction that invalidates the Redis key synchronously before
it commits, so there is no window in which a disabled module still dispatches.

### 11.9 Module Lifecycle State Machine

Transitions are guarded — a module cannot skip states — and every transition is logged
with timestamp, module name, old state, new state, and trigger.

```
DIAGRAM 11-C — The lifecycle

UNLOADED  → LOADING (load request)
LOADING   → ENABLED | DISABLED (valid manifest, deps resolved, onLoad ok)
          → ERROR   (missing dep, invalid manifest, onLoad throws)
ENABLED   → DISABLED (guild/admin disable) | ERROR (threshold exceeded) | UNLOADING
DISABLED  → ENABLED (enable request) | UNLOADING
ERROR     → LOADING (admin reload)
UNLOADING → UNLOADED
```

A disabled module is still loaded — it occupies its container scope and is simply
short-circuited before its handler runs. A **reload** re-executes the full `onUnload →
onLoad → onReady` cycle, which is the heavier operation. This toggle-vs-reload distinction
is the one the operational runbooks depend on.

### 11.10 The Extension Contract — What a Module Guarantees

The contract is binding at four points: compile time (TypeScript), load time (the module
validator), runtime (the service container's access control and the quota enforcer for
Marketplace modules), and publish time (the Module Gateway).

**The framework guarantees** the module: a typed service container with declared
dependencies injected; a middleware pipeline processing every interaction before the
handler; an event bus delivering subscribed events in priority order; a configuration
system that loads, validates, and hot-reloads per-guild config; a permission engine
resolving through the seven-layer sequence; a database service with pooling, replica
routing, and transactions; an L1/L2 cache; module-scoped child loggers, tracers, and
metrics collectors; a job queue; i18n; an HTTP service; and the core Renderer for all
presentation.

**The module guarantees** the framework: a valid manifest; idempotent lifecycle hooks
within their timeframes (`onLoad` ≤ 10 s; `onEnable`/`onDisable`/`onUnload` ≤ 5 s);
command handlers completing within the interaction window; event handlers completing
within 100 ms for Core events and 500 ms for Standard/Marketplace events; and no direct
access to another module's code, the database, Redis, the filesystem, child processes,
environment variables, global listeners, or the module registry.

### 11.11 The Service Container — What the Module Receives

When a module loads, the container is built from its declared dependencies, and every
service is a **typed interface** — the module interacts through the interface, not the
implementation. For Marketplace modules the container hands out quota-enforcing wrappers
(same interface; the only difference is that exceeding a quota throws a
`QuotaExceededError`). The container also carries a module-scoped child logger, tracer,
and metrics collector, pre-labelled with the module's name, so every log line, span, and
metric is automatically attributed.

### 11.12 The Module Isolation Guarantee

A module cannot affect other modules or the framework through its actions. The guarantee
is enforced at six levels: **type** (a module imports only from the authoring package and
its own directory), **service** (typed interfaces, never implementation internals),
**data** (its own repositories, its own tables), **cache** (keys namespaced by module
name), **event** (named subscriptions, namespaced publications; Marketplace modules may
not use wildcards), and **error** (an unhandled handler error is caught by the error
boundary, logged, counted against the module's error budget, and answered with a generic
response — it never propagates to another module or the framework).

### 11.13 How To Verify This Section Against the Code

- The manifest schema and its `.strict()` behaviour:
  `apps/main/src/module-system/manifest.schema.ts`.
- The tier co-constraints: `apps/main/src/module-system/tier-rules.ts`.
- A real manifest: `packages/modules/health/manifest.json` (and the other seven under
  `packages/modules/`).
- The module entry and lifecycle hooks: `packages/modules/hello-world/src/index.ts`.
- The loader and registry: `apps/main/src/module-system/loader.ts`,
  `src/module-system/registry.ts`.

Where this section and the tree disagree, the disagreement is recorded in
`status/code-reconciliation.json`; the specification is the target, and the code is the
gap where the two differ.

## Contract
- `contracts/module-manifest.schema.json`

## Acceptance
```acceptance
- id: ACC-MOD-0011-1
  check: "`manifest.ts` exports an object that validates against the shared manifest Zod schema at Stage 11"
  test: tests/modules/manifest-validation.spec.ts
- id: ACC-MOD-0011-2
  check: "The same manifest schema is imported by both Swastik upload validation and the bot Stage 11 validator (no drift)"
  test: tests/modules/manifest-schema-shared.spec.ts
- id: ACC-MOD-0011-3
  check: "Omitting `tier` (or any required field) fails validation and the process does not start"
  test: tests/modules/manifest-required-fields.spec.ts
- id: ACC-MOD-0011-4
  check: "Tier co-constraints hold: admin=>devGuildOnly true; marketplace=>marketplaceCategory present; core=>no non-default rbac"
  test: tests/modules/tier-co-constraints.spec.ts
- id: ACC-MOD-0011-5
  check: "The three-layer rule (command->service->repository) holds and no cross-module imports/writes exist"
  test: tests/arch/three-layer-and-isolation.spec.ts
```

## Edges (-> blueprint)
- SPEC-03-MODULES -> SPEC-02-ARCHITECTURE (modules load into the core DI child container)
- SPEC-03-MODULES -> SPEC/00-GOVERNANCE (tier + licence rules)
- SPEC-03-MODULES#SWASTIK -> SPEC-06-OPERATIONS (hot-swap + promotion pipeline)

## Named entities (from the original reference)

The original reference named these entities in this section. They are preserved here so no identifier is lost in the restructure.

**classes, interfaces & symbols:** `Cache-level`, `CacheService`, `ConfigService`, `Data-level`, `DatabaseService`, `Event-level`, `Flattened`, `LoggerService`, `MetricsService`, `Powers`, `QuotaEnforcingCacheService`, `QuotaEnforcingDatabaseService`, `QuotaEnforcingEventBus`, `QuotaEnforcingHttpService`, `Resource-level`, `ResourceQuotaEnforcer`, `SchedulerService`, `Service-level`, `Symbols`, `TracingService`, `TypeAlias`, `frameworkApiVersion`

**config/env constants:** `MODULE_DISCOVERY`, `NEW_VAR`

**events & identifiers:** `CacheService.`, `ConfigManager.`, `MigrationRunner.`, `ModuleValidator.`, `QuotaExceededError.`, `ResourceQuotaEnforcer.`, `SCREAMING_SNAKE_CASE.`, `module.hardcodeGuildId`, `moduleName.permissionName`, `onUnload.`, `process.env.LEGACY_VAR`, `repository.findActiveCases`, `service.banUser`, `this.eventBus.emit`

**files & artifacts:** `AppealNotifyJob.ts`, `CaseRepository.integration.test.ts`, `CaseRepository.ts`, `CaseService.ts`, `CaseService.unit.test.ts`, `DatabaseService.ts`, `ExpiredMuteCleanupTask.ts`, `InfractionRepository.ts`, `ModerationService.ts`, `ModerationService.unit.test.ts`, `PurgeService.ts`, `UnmuteJob.ts`, `_add_case_appeal_fields.ts`, `_create_cases.ts`, `_create_infractions.ts`, `ban.command.test.ts`, `ban.command.ts`, `case.command.ts`, `guildBanAdd.handler.ts`, `guildBanRemove.handler.ts`, `guildMemberRemove.handler.ts`, `history.command.ts`, `kick.command.ts`, `messageDelete.handler.ts`, `mute.command.ts`, `purge.command.ts`, `schema.ts`, `viewModHistory.context.ts`, `warn.command.ts`
