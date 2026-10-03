# Compliance Documentation

This directory documents compliance posture for the Dumby Unified Modular Bot System against the authoritative specification matrices in `blueprint.md §45` and `directive.md §46`.

## Compliance Matrix: blueprint.md §45

The 48-row matrix from §45. Status: ✅ fully implemented, ⚠️ partially implemented (limitation noted), ❌ not implemented (not in scope per ADR 004/005), 🔲 deferred (out of current scope).

| # | Capability | Status | Implementation |
|---|-----------|--------|----------------|
| 01 | Single, unified bootstrap sequence, no partial-start state permitted | ✅ | `src/bootstrap/bootstrap.ts` — 18 ordered stages, forward-only `advanceTo()` |
| 02 | Graceful shutdown with independent per-step timeouts | ✅ | `src/shutdown/shutdown.ts` — 9 steps, each with own `STEP_TIMEOUTS_MS` |
| 03 | Fail-fast configuration validation before any gateway connection | ✅ | `src/config/env.schema.ts` (Zod strict), bootstrap Stage 02 & 15 |
| 04 | DI with compile-time-checkable contracts, no service locator | ✅ | `src/di/container.ts` — Symbol tokens only, constructor injection, 3 lifetimes |
| 05 | Circular dependency detection at boot, not runtime | ✅ | `src/di/container.ts` (resolution stack), `src/modules/topo-sort.ts` |
| 06 | Complete, self-describing module manifest contract | ✅ | `src/modules/manifest.schema.ts` — Zod strict, 27+ fields |
| 07 | Enforced three-layer separation within every module | ⚠️ | ESLint rule 3 (`no-repository-in-command`) enforces direction; not structurally enforced |
| 08 | Tooling-enforced module isolation (no cross-module imports/writes) | ✅ | `eslint.config.mjs` — 5 custom rules, `import/no-cycle` |
| 09 | Four-tier module governance model | ✅ | `src/modules/tier-rules.ts` — admin/core/standard/marketplace |
| 10 | Per-guild module enable/disable with fail-closed defaulting | ✅ | `guild_module_states` table, admin routes, `ModuleDisabledResult` sentinel |
| 11 | Five-layer Admin-tier defense in depth | ⚠️ | `src/middleware/built-in/admin-tier-gate.ts` — single gate (botOwnerIds) + silent reject + audit; not 5 explicit layers |
| 12 | Four sanctioned inter-module communication patterns | ⚠️ | Manifest supports crossModuleReads + eventsCatalog + DI deps; patterns not formally enumerated as exclusive set |
| 13 | Graceful soft-dependency degradation | ✅ | `MODULE_DISABLED` sentinel, `classifyLoadFailures()`, `required:false` support |
| 14 | Semver-enforced cross-module contract versioning | ⚠️ | Manifest validates semver format; no cross-module version range checking |
| 15 | Hot-swap of a single module without core restart | ❌ | ADR 005 (deferred to V2) — Swastik is Tier-3 scaffold only |
| 16 | Worker-thread isolation for CPU-intensive work | ❌ | ADR 005 (deferred to V2) — `worker.ts` is separate OS process, not Worker Thread |
| 17 | Scheduled, zero-downtime core restart independent of ad hoc deploys | ❌ | ADR 005 (deferred to V2) — no scheduler or restart orchestrator |
| 18 | Developer registration, licensing gate, revocable approval | ⚠️ | `src/entry/swastik.ts` — registration + build staging scaffold; no licensing/promotion |
| 19 | Five-gate community module review pipeline | 🔲 | Marketplace feature — out of scope for the current release |
| 20 | Schema-driven web configuration UI (MDIS) | 🔲 | Manifest declares optional `dashboardSchema` field; no MDIS backend (ADR 004) |
| 21 | Fatal, build-time command-name collision detection | ✅ | `src/commands/command-registry.ts` — `CommandCollisionError` at registration |
| 22 | Bounded, batched guild command change queue | ⚠️ | `guild_command_queue` table exists (M018); no processing logic |
| 23 | Enforced 100-command-per-guild ceiling | ✅ | `src/commands/command-ceiling.ts` — `MAX_COMMANDS_PER_GUILD=100`, projection + guard; PEP endpoint `/admin/power-engine/command-ceiling/:guildId` |
| 24 | Five-step guild-facing command collision resolution | ✅ | `src/commands/collision-resolution.ts` — detect+pause+resolve+finalize flow; integrated into module restore/suspend; PEP endpoints for listing and resolving collisions |
| 25 | No text-prefix commands, no simulated prefix parsing | ✅ | All commands are Discord slash commands; zero message-content parsing |
| 26 | Per-handler isolation on gateway event dispatch | ⚠️ | `command-router.ts` — logical isolation (try/catch per handler); no process isolation (ADR 005) |
| 27 | Bounded internal-event-bus cycle detection | ✅ | `src/events/event-bus.ts` — `maxEmitDepth: 20`, `EventCycleError`, protected domains |
| 28 | Composable, priority-ordered middleware with single root error boundary | ✅ | `src/middleware/` — 12 stages, priorities -20 to 90, single try/catch; `http/error-boundary.ts` |
| 29 | Stateless, database-referencing component custom_id scheme | ❌ | Not implemented — Components V2 (Container + TextDisplay) does not include dynamic custom_id scheme |
| 30 | Mandatory re-authorization on sensitive component clicks | ❌ | Not implemented — no component interaction handling exists |
| 31 | Seven-layer permission resolution, fail-closed where it matters | ✅ | `src/permissions/resolver.ts` — 7 layers, fail-open/closed per spec |
| 32 | Global bot-owner override bypassing every other layer | ✅ | `resolver.ts` Layer 1 — early ALLOW return, also `admin-tier-gate.ts` |
| 33 | Explicit, targeted per-user/role grant overrides | ✅ | `src/permissions/rbac.ts` — 3 grant levels × 5 types, role > group > set priority |
| 34 | One permission engine shared by bot and web dashboard | ⚠️ | `resolvePermission()` is pure/sharable; no web dashboard exists; PEP uses separate trusted-source auth |
| 35 | Global administrative authority via PEP function catalog | ✅ | `src/entry/pep.ts` + `admin.routes.ts` — 14 PEP domains, pre-action audit |
| 36 | Out-of-band operator access independent of gateway health (CLAI) | ✅ | `src/entry/clai.ts` — TCP REPL, SSH public-key auth, PEP function dispatch |
| 37 | Single, shared credential issuance path | ✅ | `src/entry/credentials.ts` — Argon2id, local-bind only, revocable |
| 38 | Three-scope configuration model (core, module, guild) | ⚠️ | Process-core (`env.schema.ts`) + guild (`guild_configs` JSONB) exist; no formal process-module scope |
| 39 | Full config-change audit trail | ✅ | Insert-only `audit_logs` with DB triggers; PEP + CLAI both write audit rows |
| 40 | Repository pattern as sole database abstraction | ✅ | `src/db/repositories/base.repository.ts` + `InsertOnlyRepository`; no raw Knex outside |
| 41 | Every migration reversible (working down()) | ✅ | All 31 migrations have working `down()`; migration runner supports both directions |
| 42 | Two-tier cache with stampede protection & negative caching | ✅ | `src/cache/` — L1 (LRU) + L2 (Redis), StampedeGuard, NEGATIVE_SENTINEL, probabilistic early recompute |
| 43 | Zero process-local state whose loss would be user-visible | ✅ | All durable state in Postgres/Redis; in-memory state is transient (L1, InFlightTracker, BootstrapProgress) |
| 44 | Shard-ownership lock model preventing dual connections | ⚠️ | `RedisLockStore` exists; `SHARD_LOCK_*` env vars declared; no per-shard acquisition/release protocol |
| 45 | Correlated logs, metrics, traces via one correlationId | ✅ | TraceMiddleware sets UUID on context; logger/metrics accept correlationId; OTel integration |
| 46 | Eight-subclass error taxonomy with operational/non-operational distinction | ⚠️ | 9 subclasses (1 extra: UnauthorizedError); `retryable: true/false` distinction present |
| 47 | Idempotency required of every job processor | ⚠️ | `QueueManager.enqueue()` supports `idempotencyKey`; `webhook_deliveries_idempotency` table; not enforced as blanket requirement |
| 48 | Reachable maintenance mode that cannot lock out operators | ✅ | `MaintenanceModeMiddleware` with allow-list; admin + CLAI endpoints; `system_state` DB table |

**Scope note:** Items marked ❌ correspond to control-plane services (hot-swap, worker isolation, zero-downtime restart — ADR 005), Discord component interaction features (custom_id scheme, re-authorization — not in scope per `docs/interface.md` static Display contract), or missing guards (100-command ceiling, 5-step collision resolution — not yet implemented but in scope).

## Compliance Matrix: §1.3 Scope (Controller-Plane vs. Control-Plane)

| Service | Scope | Status |
|---------|-------|--------|
| PEP — Power Engine Panel (17-domain REST admin) | Control-plane | ✅ 14 endpoints wired in `admin.routes.ts`, full dispatcher + audit |
| CLAI — SSH/REPL operator terminal | Control-plane | ✅ `src/entry/clai.ts`, TCP REPL, SSH key auth |
| Swastik — Deploy / hot-reload / hot-swap | Control-plane | ⚠️ Scaffold only (Tier 3 per ADR 004) |
| Credentials Service — Argon2id credential issuance | Control-plane | ✅ `src/entry/credentials.ts`, local-bind, revocable |
| Personas / Twixter | Control-plane | ❌ Data model in schema; no entry point (ADR 004) |
| MDIS — Module Dashboard Interface System | Control-plane | 🔲 Out of scope for the current release |

## Compliance Matrix: directive.md §46

| Item | Status | Source |
|------|--------|--------|
| `tsc --noEmit` is CI gate #1 | ✅ | `.github/workflows/ci.yml` job 1 |
| No `.js` source files | ✅ | All source is `.ts` |
| ESM (`"type": "module"`, `"module": "NodeNext"`) | ✅ | `package.json` + `tsconfig.json` |
| pnpm, frozen lockfile in CI | ✅ | `ci.yml` |
| No `console.log` in server code | ✅ | Logger wrapper enforced via ESLint |
| Secrets via env only | ✅ | No committed secrets |
| `audit_logs` insert-only | ✅ | DB trigger forbids UPDATE/DELETE |
| Every migration has working `down()` | ✅ | All 31 migrations |
| Coverage floors (per-layer) | ⚠️ | Global floor met (75.78% stmts); per-layer CI enforcement pending |
| Fail-closed/fail-open asymmetry matches §4.5 | ✅ | `resolver.ts` per-layer fail behavior |
| Core tier skips RBAC (Layer 6) | ✅ | `tier-rules.ts` — core disallows RBAC |
| `terminationGracePeriodSeconds: 190` | ✅ | `deploy/k8s/base/deployment.yaml` |
| `maxUnavailable: 0`, `maxSurge: 1` | ✅ | `deploy/k8s/base/deployment.yaml` |
| Three k8s probes (startup/liveness/readiness) | ✅ | `deploy/k8s/base/deployment.yaml` |

## Deferred Items & Open ADRs

| ADR | Title | Status |
|-----|-------|--------|
| 001 | CLAI SSH public-key-only (conflict resolution) | Closed — SSH enforcement in `clai.ts` |
| 002 | Flattened directory layout (ADR 002) | Closed — `src/` flat structure |
| 003 | `deploy/` vs `infra/` naming (ADR 003) | Closed — `deploy/terraform/` |
| 004 | Three-tier build scope (Tier 1 = core, Tier 2 = control-plane functional, Tier 3 = scaffold) | Closed — defines deferred items below |
| 005 | Inherited open items: no runtime sandbox for third-party modules, BullMQ/Redis single-point-of-failure | Open — noted in §48.3, accepted as V2 work |

### Items deferred per ADR 004/005

| Item | Reason |
|------|--------|
| Hot-swap without restart (§15.1) | V2 (ADR 005: Worker Thread sandboxing) |
| Worker-thread isolation (§15.2) | V2 (ADR 005) |
| Zero-downtime core restart (§15.5) | V2 (ADR 005) |
| Marketplace review pipeline (§16.4) | Out of scope for the current release |
| MDIS web UI (§16.5) | Out of scope for the current release |
| No runtime sandbox for third-party modules | Open item (ADR 005) |
| BullMQ Redis SPOF | Open item (ADR 005) |

### In-scope gaps (not yet implemented)

| # | Capability | Priority | Notes |
|---|-----------|----------|-------|
| 29 | Stateless custom_id scheme | Low | Components V2 static-only per `docs/interface.md` |
| 30 | Re-authorization on component clicks | Low | No component interactions in current scope |

### Recently closed gaps

| # | Capability | What was done |
|---|-----------|---------------|
| 23 | 100-command-per-guild ceiling | Created `CommandCeilingService` with `MAX_COMMANDS_PER_GUILD=100`, projection + guard methods, PEP endpoint at `/admin/power-engine/command-ceiling/:guildId`. Wired into module restore flow. |
| 24 | Five-step collision resolution | Created `CollisionResolutionService` with detection, pause (sets `install_pending_resolution` state), resolution (writes `guild_command_overrides`), and finalization flow. Integrated into module restore/suspend PEP endpoints. PEP endpoints at `/admin/power-engine/collisions/:guildId` and `/admin/power-engine/collisions/:guildId/resolve`. |
| 30 | Re-authorization on component clicks | Low — No component interactions in current scope |
