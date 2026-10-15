---
id: SPEC-02-ARCHITECTURE-0007
title: 7. Directory & File Structure
kind: spec
status: normative
version: 5.0.0
authority_scope: [02-architecture]
anchors: [DIRECTORY_FILE_STRUCTURE, TOP_LEVEL_LAYOUT, SRC_THE_APPLICATION, MODULE_STORAGE_FOUR_PER, SRC_SHARED_CROSS_CUTTING, SRC_ENTRY_PROCESS_ENTRYPOINTS, SRC_MONETIZATION_RESERVED_MONETIZA, MONETIZATION_SCAFFOLD_DEFERRAL_STA, CONTRACT, ACCEPTANCE, EDGES_BLUEPRINT]
contracts: []
acceptance: [ACC-ARCH-0007-1, ACC-ARCH-0007-2]
owners: [framework-maintainers]
last_verified_commit: null
review_state: pending-evidence
---

## 7. Directory & File Structure

**Status:** [SPEC]

> **This section describes the real physical tree.** It is transcribed from the actual
> `master-ronix/Dumby-Suite` repository at branch `feature/dev` (the live tree, 1,382 entries:
> 288 directories, 1,094 files), not from the earlier intended tree. Where the intended layout
> and the real tree ever differ, **the real tree is what is written here**; the difference is
> recorded in `status/code-reconciliation.json`.

### 7.1 Top-Level Layout

```
TREE 7-A — Repository root

dumby/                          (pnpm workspace)
├── .github/                    ← root CI: workflows/ci.yml, dependabot.yml
├── apps/main/                  ← the application (@workspace/dumby) — TREE 7-B
├── packages/
│   ├── modules/                ← the eight first-party module packages
│   └── swastik/                ← the module-authoring package (+ _template)
├── tools/release_manager/      ← the Release Manager gate: release-gate.ts,
│                                  compatibility-ledger.json
├── scripts/                    ← workspace scripts (post-merge.sh, src/)
├── docs/                       ← the documentation corpus (blueprint.md, directive.md,
│                                  interface.md, concept.md, directory.md, definitions.md,
│                                  change-log.md, master-prompt.md, meta-prompt.md,
│                                  migration-prompt.md, migration-ledger-template.md,
│                                  documentation.md, adr/, ur/)
├── lib/                        ← Replit scaffold — NOT the bot (Drizzle/Orval/React)
├── artifacts/                  ← Replit scaffold — NOT the bot (api-server, mockup-sandbox)
├── assets/ · design/ · specs/ · website/   ← README-only reserved directories
├── AGENTS.md · GAP_MANIFEST.md · STATUS.md · README.md · migration-ledger.md
├── replit.md · replit.nix · .replit · .replitignore
├── package.json · pnpm-workspace.yaml · pnpm-lock.yaml · .npmrc
└── tsconfig.json · tsconfig.base.json · .gitignore
```

**The Replit scaffold caveat.** `lib/*` and `artifacts/*` are a Replit-generated web/API
scaffold (Drizzle, Orval, React/Vite) and are **not** part of the bot. The bot's database
layer is `apps/main/src/db` (Knex), never `lib/db` (Drizzle). `assets/`, `design/`, `specs/`,
and `website/` each contain only a `README.md` — they are reserved, not implemented.

### 7.2 The Application Core — `apps/main/src/`

The application source is a **flat `src/` of 33 directories** — there is no `src/core/`
wrapper (the earlier intended tree's `src/core` was retired). Transcribed verbatim:

```
TREE 7-B — apps/main/src/ (33 directories)

src/
├── analytics/            mtp-token-calculator.ts
├── application/          Application.ts · ApplicationContext.ts · HealthServer.ts
├── bootstrap/            bootstrap.ts · stages.ts
├── cache/                cache-manager.ts · key-namespace.ts · l1-cache.ts ·
│                         redis-lock-store.ts · stampede-guard.ts
├── commands/             collision-resolution.ts · command-ceiling.ts ·
│                         command-deployer.ts · command-registry.ts ·
│                         command-router.ts · module-command.ts
├── config/               config.service.ts · env.schema.ts · guild-config.service.ts
├── credentials/          credential-client.ts · credential-refusal.ts ·
│                         developer-bearer.ts · developer-credential.service.ts ·
│                         sealed-credential.service.ts
├── crypto/               envelope-scope.ts · envelope.ts
├── db/                   client.ts · knexfile.ts · migration-helpers.ts ·
│                         replica-router.ts · migrations/ (44) · repositories/ (8)
├── di/                   container.ts · mock-container.ts · tokens.ts
├── discord/              client-builder.ts · gateway.live-adapter.ts ·
│                         gateway.mock-adapter.ts · shard-ownership.ts
├── entry/                main.ts · worker.ts · migrate.ts · power-engine.ts ·
│                         ssh-clai.ts · swastik.ts · credentials.ts · twill.ts ·
│                         clai-session-limits.ts · is-main-entry.ts
├── errors/               taxonomy.ts
├── events/               event-bus.ts · event-loop-lag.ts · event-router.ts
├── governance/           approval.ts · guild-suspension.ts
├── http/                 server.ts · client.ts · error-boundary.ts · internal-auth.ts ·
│                         power-engine-catalog.ts · power-engine-dispatcher.ts ·
│                         routes/ (admin · health · info · metrics · oauth) · oauth/
├── i18n/                 i18n-manager.ts · formatters.ts
├── interactions/         interaction-registry.ts
├── licensing/            license-machine.ts · license-store.ts · semver.ts ·
│                         compatibility-ledger.ts · deployment-records.ts
├── logging/              logger.ts
├── metrics/              registry.ts
├── middleware/           middleware-pipeline.ts · base-middleware.ts · built-in/ (12)
├── module-system/        loader.ts · registry.ts · manifest.schema.ts · tier-rules.ts ·
│                         topo-sort.ts · promotion.ts · swastik-loader.ts ·
│                         build-signing.ts · module-ownership.ts
├── monetization/         README.md (reserved scaffold — intentionally empty)
├── permissions/          resolver.ts · rank.ts · rbac.ts · grant-surface.ts ·
│                         db-blacklist.ts · admin-tier-gate.ts · admin-eval-gate.ts
├── personas/             persona.ts · persona.repository.ts ·
│                         persona-command-binding.service.ts
├── queue/                queue-manager.ts · base-processor.ts · scheduler.ts · autoscaler.ts
├── ratelimit/            sliding-window.ts
├── rendering/            core-renderer.ts
├── resilience/           circuit-breaker.ts · retry-policy.ts
├── shared/               erasure-coordinator.ts · constants/ · testing/ · types/ · utils/
├── shutdown/             shutdown.ts · fatal-handler.ts · in-flight-tracker.ts
└── tracing/              tracing.ts
```

- `application/` — the `Application` class (the 18-stage bootstrap orchestrator, §8), the
  shared runtime context (`ApplicationContext`), and the health server (`HealthServer`).
- `bootstrap/` — `bootstrap.ts` and `stages.ts` (the ordered stage list and the forward-only
  `BootstrapProgress` state machine).
- `di/` — `container.ts`, the core token registry (`tokens.ts`), and `mock-container.ts` (§10).
- `module-system/` — the loader, registry, manifest Zod schema, tier rules, topological sort,
  promotion, the Swastik loader, build signing, and module ownership (§11, §15).
- `events/` — the event router, the internal event bus, and the event-loop-lag monitor (§18).
- `middleware/` — `middleware-pipeline.ts`, `base-middleware.ts`, and `built-in/` (12 stages) (§19).
- `permissions/` — the resolver, the rank function, RBAC, the grant surface, the DB
  blacklist, and the admin-tier / admin-eval gates (§21).
- `commands/` — the registry, router, deployer, collision resolution, ceiling, module command (§17).
- `rendering/` — `core-renderer.ts`, the single presentation authority (§20).
- `interactions/` — `interaction-registry.ts` (§20).
- `config/` — the env schema, the config service, and the per-guild config service (§23).
- `db/` — the Knex client, knexfile, migration helpers, replica router, `migrations/`
  (44 migrations), and `repositories/` (§24).
- `cache/` — the two-tier cache manager, key namespace, L1, the stampede guard, and the
  Redis lock store (§25).
- `queue/` — the BullMQ queue manager, processor base, scheduler, and autoscaler (§29).
- `http/` — the Fastify server, routes (health, metrics, info, admin, oauth), the error
  boundary, the internal-auth guard, and the Power Engine catalog + dispatcher.
- `i18n/` — the i18n manager and formatters (§30). `analytics/` — the MTP token calculator (§31).
- `logging/`, `metrics/`, `tracing/` — Pino, prom-client, and OpenTelemetry (§27).
- `errors/` — `taxonomy.ts`: the `DumbyError` base and its subclasses (§28).
- `resilience/` — the circuit breaker and retry policy. `ratelimit/` — the sliding window.
- `credentials/`, `crypto/`, `licensing/`, `governance/`, `personas/` — the control-plane and
  identity subsystems (§22, §35): developer credentials, envelope encryption, the licence
  machine, approvals and guild suspensions, and personas.
- `discord/` — the client builder, the live + mock gateway adapters, and shard ownership.
- `shutdown/` — the graceful shutdown sequence, the fatal handler, and the in-flight tracker (§9).
- `entry/` — the process entrypoints (§7.5).

### 7.3 Module Storage — Four Per-Tier Volumes (No `src/modules/`)

There is no in-tree `src/modules/`. First-party modules are **packages** at
`packages/modules/<slug>/` — the eight that exist today are `browse`, `dashboard`, `health`,
`hello-world`, `modules`, `permit`, `persona`, and `queue`. Module *storage* at runtime lives
entirely on the four per-tier volumes plus staging (§5.5), rooted at `MODULES_DIR`
(default `/mnt/modules`):

```
TREE 7-C — Module volume layout

/mnt/modules/
├── swastik-staging/     ← upload, validation, and build area
├── modules-admin/       ← Admin-tier modules only
├── modules-core/        ← Core-tier modules only (seeded via promotion)
├── modules-standard/    ← Standard-tier modules only
└── modules-marketplace/ ← Marketplace-tier modules only
    └── {module-name}/   ← one directory per independently-owned module
```

A module's tier is enforced at rest: it must live on the volume matching its declared tier.
First-party modules are seeded onto their tier volume through the same Swastik promotion
pipeline any community module passes through (ADR-005); nothing in the repository or the
image enumerates modules — the framework discovers what exists by reading the volumes.

### 7.4 `shared/` — Cross-Cutting Utilities

`shared/` holds `constants/` (colors, durations, limits), `types/` (Discord augmentations,
the command-context type, pagination), `utils/` (snowflake handling, `components-v2`
construction, `crypto`, `retry`, the `path-guard` containment helper, `paginator`), the
`testing/` helpers — including the `MockContainer` used by unit tests (§37.3) — and the
`erasure-coordinator`. The path-containment guard lives here because it is shared by every
surface that handles a filesystem path from untrusted input.

### 7.5 `entry/` — Process Entrypoints

Ten files, one per deployable process plus its shared guards:

```
TREE 7-D — apps/main/src/entry/

main.ts                 ← the bot (the only gateway-opening entrypoint)
worker.ts               ← BullMQ workers only
migrate.ts              ← migrations only, no gateway
power-engine.ts         ← the Power Engine control plane
ssh-clai.ts             ← the CLAI SSH terminal
swastik.ts              ← module delivery and hot-swap
credentials.ts          ← the Credentials Service
twill.ts                ← the persona instance entrypoint
is-main-entry.ts        ← the main-module guard every entrypoint uses
clai-session-limits.ts  ← CLAI session ceilings
```

Every entrypoint boots the identical DI container against the identical core services; each
starts a subset and skips the rest. **`main.ts` is the only entrypoint that opens a gateway
connection and loads feature modules** — including when it is started against a persona's
token rather than the main bot's (§35). The others do neither. Each entrypoint is guarded by
`isMainEntry` so nothing auto-starts on import.

### 7.6 `monetization/` — Reserved Scaffold (Intentionally Empty)

An empty scaffold with a `README.md` describing its intended purpose, reserving a stable,
conventional location for a monetization model not yet chosen. Nothing outside depends on it;
no core service imports from it; no bootstrap stage references it. An empty `monetization/`
is the expected, complete state.

**Deferral status (open item).** The deferral lacks an explicit rationale for *why*
monetization is deferred and what conditions would trigger implementation. The specification
calls for either a defined monetization feature or an explicit deferral document with a stated
trigger (for example, "deferred until marketplace adoption reaches N guilds") — so that the
empty scaffold is a conscious decision rather than an oversight.

### 7.7 How To Verify This Section Against the Code

The tree above is the actual physical tree of `master-ronix/Dumby-Suite` at branch
`feature/dev` — 1,382 entries (288 directories, 1,094 files), with `apps/main/src` holding 48
directories and `packages/modules/` holding exactly the eight first-party modules. Where the
earlier intended tree and this real tree differ (for example the retired `src/core` wrapper),
the real tree wins and the difference is recorded in `status/code-reconciliation.json`.

## Contract
None (conceptual).

## Acceptance
```acceptance
- id: ACC-ARCH-0007-1
  check: "No `src/modules/` directory exists; the container image ships only the application core (apps/main/src + shared)"
  test: tests/arch/no-in-tree-modules.spec.ts
- id: ACC-ARCH-0007-2
  check: "`src/entry/` contains the ten process entrypoints and each is guarded by `isMainEntry`"
  test: tests/arch/entry-guards.spec.ts
```

## Edges (-> blueprint)
- SPEC-02-ARCHITECTURE-0007 -> blueprint/structure.md (structure edges)
- SPEC-02-ARCHITECTURE-0007#TIER_VOLUMES -> SPEC-03-MODULES

## Named entities

**classes, interfaces & symbols:** `CPU-isolated`, `Deployers`, `requestLogger`

**files & artifacts:** `ApplicationContext.ts`, `BaseJob.ts`, `BaseMiddleware.ts`, `BaseProcessor.ts`, `BaseRepository.ts`, `BlacklistService.ts`, `CacheManager.ts`, `ConfigManager.ts`, `DatabaseManager.ts`, `DumbyError.ts`, `EventRouter.ts`, `GuildConfigService.ts`, `GuildModuleStateService.ts`, `HealthServer.ts`, `HttpServer.ts`, `I18nManager.ts`, `InternalEventBus.ts`, `L1Cache.ts`, `L2Cache.ts`, `Metrics.ts`, `MiddlewarePipeline.ts`, `MigrationRunner.ts`, `MockContainer.ts`, `ModuleLoader.ts`, `ModuleManifest.ts`, `ModuleRegistry.ts`, `PermissionResolver.ts`, `QueryLogger.ts`, `QueueManager.ts`, `RBACService.ts`, `STATUS_AND_VERIFICATION.md`, `StampedeGuard.ts`, `commitlint.config.ts`, `context.ts`, `crypto.ts`, `discord.ts`, `durations.ts`, `embed.ts`, `eslint.config.ts`, `extensions.json`, `launch.json`, `lifetimes.ts`, `limits.ts`, `pagination.ts`, `pnpm-lock.yaml`, `prettier.config.ts`, `routes.ts`, `scaffold.ts`, `schema.ts`, `seed.ts`, `settings.json`, `snowflake.ts`, `adapters/`, `models/`
