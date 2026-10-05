---
id: SPEC-02-ARCHITECTURE-0008
title: 8. Application Bootstrap & Lifecycle
kind: spec
status: normative
version: 5.0.0
authority_scope: [02-architecture]
anchors: [APPLICATION_BOOTSTRAP_LIFECYCLE, THE_APPLICATION_CLASS, THE_18_STAGE_STARTUP, WORKER_ONLY_BOOTSTRAP_PATH, ENTRYPOINT_SIDE_EFFECT_GUARD, SPEC_FAITHFUL_GOOD_FAITH, OPENTELEMETRY_TRACING, DI_CONTAINER_VERIFIED_SYMBOL, CONTRACT, ACCEPTANCE, EDGES_BLUEPRINT]
contracts: [contracts/config.schema.json#bootstrap]
acceptance: [ACC-ARCH-0008-1, ACC-ARCH-0008-2, ACC-ARCH-0008-3, ACC-ARCH-0008-4, ACC-ARCH-0008-5, ACC-ARCH-0008-6]
owners: [framework-maintainers]
last_verified_commit: null
review_state: pending-evidence
---

## 8. Application Bootstrap & Lifecycle

**Status:** [SPEC]

### 8.1 The Application Class

`Application` is the single root orchestrator. It holds references to every shared
service — the DI container, the database manager, the cache manager, the HTTP server, the
gateway client — drives startup as a linear series of named stages, and exposes the
shutdown path invoked by process signals. Nothing starts before `Application.bootstrap`,
and nothing runs after `Application.shutdown` completes, which is what makes "one
bootstrap sequence" a literal codebase property rather than an aspiration.

### 8.2 The 18-Stage Startup Sequence

Each stage has a hard failure mode, and its name appears verbatim in the boot log. A stage
failure exits the process with a non-zero code; no stage is optional or deferrable. This
is P4 made concrete.

| St. | Name | What happens | Failure mode |
|----|------|--------------|--------------|
| 01 | PROCESS_SETUP | Register `uncaughtException` / `unhandledRejection` handlers; set the process title | Fatal — no safety net without it |
| 02 | CONFIG_LOAD | Load and validate the root Zod schema against the environment | Fatal — field-level error output |
| 03 | HEALTH_SERVER_INIT | Start the health server so a new pod can bind while an old one is still shutting down; all endpoints return 503 (not ready) | Fatal — no diagnostic surface otherwise |
| 04 | OBSERVABILITY_INIT | Initialise the root logger, the metrics registry, and the tracing SDK | Fatal |
| 05 | DATABASE_CONNECT | Open the pool (primary + replicas); verify with `SELECT 1` | Fatal |
| 06 | MIGRATION_RUN | Run pending migrations, core then module, in declared order; verify the module-state backfill is current | Fatal — a missing migration is a deployment error |
| 07 | CACHE_CONNECT | Open the Redis connection; verify with `PING` | Fatal |
| 08 | QUEUE_INIT | Initialise BullMQ connections; register worker processors | Fatal |
| 09 | DI_BOOTSTRAP | Bind all core services into the container; freeze the core token namespace | Fatal |
| 10 | MODULE_DISCOVER | Blind-discover modules on the tier volumes — enumerate whatever the volumes hold, no hardcoded list | Fatal (an empty tier volume is not fatal) |
| 11 | MODULE_VALIDATE | Validate every manifest; resolve the cross-module dependency graph; detect cycles | Fatal — an invalid manifest or a dependency cycle is a development error |
| 12 | MODULE_LOAD | Call `onLoad(container)` on every module in topological order; a `required:false` module that throws is disabled with a warning and startup continues | Fatal only if a `required:true` module's `onLoad` throws |
| 13 | COMMAND_REGISTER | Collect command classes from enabled modules; register them; run collision detection | Fatal — a name collision is a development error |
| 14 | EVENT_REGISTER | Register event-handler classes from enabled modules | Fatal |
| 15 | DISCORD_LOGIN | Log the client in | Fatal — nothing works without a gateway connection |
| 16 | CLIENT_READY | Wait for the ready event; compute this process's shard assignments | Fatal |
| 17 | MODULE_READY | Call `onReady(client)` on every loaded module; a per-module failure disables that module alone | Non-fatal per module — the bot is live and responding |
| 18 | STARTUP_COMPLETE | Readiness returns 200 only once every `required:true` module has completed `onReady`; emit the system-ready event | — |

The exact stage list and order are declared once, in `apps/main/src/bootstrap/stages.ts`,
and the number of stages is single-sourced in `status/counts.json`
(`bootstrap_stages: 18`).

### 8.3 Health Endpoint ↔ Stage Mapping

```
TABLE 8-B — Liveness, startup, readiness
```

- `/health/liveness` returns 200 once **Stage 04** completes. A failure means
  fundamentally unhealthy; the orchestrator restarts the process.
- `/health/startup` returns 200 once **Stage 15** completes (gateway connected). It
  distinguishes "still starting" from "started, then broke," with a longer failure
  threshold.
- `/health/readiness` returns 200 once **Stage 18** completes and every required module is
  healthy. A failure removes the pod from the service's endpoint list without restarting
  it — correct for transient degradation.

The three-way split exists because Stage 17 (calling `onReady` across every module) is
unavoidably long and must not read as "the process is broken." Collapsing the three into
one endpoint would force a choice between restarting a healthy-but-initialising pod and
routing traffic to a pod with a broken required module.

### 8.4 The Worker-Only Bootstrap Path

`entry/worker.ts` runs a truncated bootstrap, not the full one: it executes the
infrastructure stages — config validation, observability, database, cache, queue, DI
bootstrap — then module discovery and job-processor registration, and **skips Stage 15,
Stage 16, and the API and health servers entirely**. A worker never opens a gateway
connection and never serves HTTP. A runtime role assertion guards the split: a process
started with the worker role that holds a Discord client or an open HTTP listener exits
fatally, and the full bootstrap refuses to start in the worker role, so the two paths
cannot silently converge.

### 8.5 The Entrypoint Side-Effect Guard

Every entrypoint runs its side effects only under the main-module guard, so importing an
entrypoint — from a test, a tool, or another entrypoint — never boots a process. Each
entrypoint file's top-level code only defines and exports its bootstrap function; the
guard is what invokes it.

### 8.6 Leak Vectors — Resource Discipline Across Hot-Swaps

Two leak vectors are specific to a system that hot-swaps modules between scheduled
restarts, and both are closed by framework guarantees rather than author discipline:

- **Hot-swap zombie accumulation.** Hot-swaps occur between scheduled restarts, so any
  resource not auto-cleared on unload — timers, listeners, workers — accumulates across
  swaps. The framework must auto-clear every registered resource through the resource
  registry's unload hook on every swap.
- **Stale timers.** A module's `onUnload` is not guaranteed to clear the timers and
  intervals it created. The framework must auto-clear every timer registered through the
  timer service on unload. This is one of five documented leak vectors.

Both are implemented in the DI container, the event bus, and the cache manager (§10.8), so
a misbehaving module cannot leak resources past its own lifecycle.

### 8.7 Bootstrap As A State Machine

```
DIAGRAM 8-A — Forward-only progression

[process start]
  → 01..09  (linear, all fatal; any failure ⇒ exit 1)
  → 10..11  (invalid manifest / dependency cycle ⇒ exit 1)
  → 12 MODULE_LOAD  (required:true throws ⇒ exit 1; required:false failures ⇒ DISABLED,
                     startup continues)
  → 13..16  (collision / registration error ⇒ exit 1)
  → gateway connected, shard assignments known
  → 17 MODULE_READY  (per-module failure ⇒ that module DISABLED; the bot keeps responding)
  → 18 STARTUP_COMPLETE  (all required modules healthy) ⇒ READY — serving traffic
```

Progress is a **forward-only** state machine (`BootstrapProgress` in
`bootstrap/stages.ts`): stages advance monotonically and never regress, and an attempt to
move backward throws. This mirrors the sequencing discipline of the nine-step shutdown
(§9).

### 8.8 Open Items Carried Forward

This section's design is complete; its implementation is not uniformly so, and the
distinction is stated rather than hidden:

- **The live dispatch path must route through the middleware pipeline and the permission
  resolver.** The pipeline and resolver exist with correct priorities, but the design
  requires that the live router actually invoke them on every dispatch; a registered-but-
  never-resolved resolver is a wiring defect, not a feature.
- **The canonical command tree must be wired as the live router, or consolidated into it.**
  A second, orphaned command subsystem with its own tests would be a duplicate-path
  defect under the one-canonical-path rule (P13).
- **The Admin-tier gate is specified as a layered gate;** where the implementation reduces
  it to a single owner check, the difference is a gap to close or a spec to reconcile —
  not a silent divergence.
- **A reference implementation must exist to validate the compliance matrix.** The matrix
  presumes a deployment to check against; until one exists, the reliability claims in this
  reference describe the design, not an operating track record.

Each of these is tracked in `status/code-reconciliation.json` and the capabilities ledger.

> **Status — spec-faithful good-faith engineering.** The 18-stage bootstrap, the 9-step
> graceful shutdown, the DI container, and the 12-stage middleware pipeline (priorities
> included) all match the specification exactly, and a later migration self-corrected an
> earlier Swastik table-naming conflict. Preserved; not regressed.

## Contract
- `contracts/config.schema.json#bootstrap`

## Acceptance
```acceptance
- id: ACC-ARCH-0008-1
  check: "Bootstrap runs exactly {{counts.bootstrap_stages}} named stages in order; any fatal stage exits the process non-zero"
  test: tests/integration/bootstrap.stages.spec.ts
- id: ACC-ARCH-0008-2
  check: "Config is Zod-validated at stage 02 before any Discord gateway connection (stage 15)"
  test: tests/integration/bootstrap.config-first.spec.ts
- id: ACC-ARCH-0008-3
  check: "`/health/readiness` returns 200 only after stage 18 (every required:true module onReady)"
  test: tests/integration/bootstrap.readiness.spec.ts
- id: ACC-ARCH-0008-4
  check: "Module discovery is blind (no hardcoded list) and modules load in topological order"
  test: tests/integration/bootstrap.discovery.spec.ts
- id: ACC-ARCH-0008-5
  check: "Core volume reload is a no-op: overwriting core on disk does not reload live code; core changes require a restart"
  test: tests/arch/core-reload-noop.spec.ts
- id: ACC-ARCH-0008-6
  check: "`ITimerService` auto-clears every registered timer on module unload (no zombie timers)"
  test: tests/unit/timer-cleanup.spec.ts
```

## Edges (-> blueprint)
- SPEC-02-ARCHITECTURE-0008#BOOTSTRAP -> all departments (bootstrap wires every subsystem)
- SPEC-02-ARCHITECTURE-0008#WORKER_BOOTSTRAP -> SPEC-06-OPERATIONS (worker mode skips gateway stages)

## Named entities

**classes, interfaces & symbols:** `Proof-of-Existence`, `botOwnerIds`, `pathToFileURL`, `STARTUP_`, `require.cache`
