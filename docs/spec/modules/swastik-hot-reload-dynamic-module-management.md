---
id: SPEC-03-MODULES-0015
title: 15. Swastik — Hot Reload & Dynamic Module Management
kind: spec
status: normative
version: 5.0.0
authority_scope: [03-modules]
anchors: [SWASTIK_HOT_RELOAD_DYNAMIC, TWO_DISTINCT_RELOAD_MECHANISMS, WORKER_THREAD_ISOLATION, RELOAD_TOGGLE_AND_DISABLE, TWO_UPDATE_PATHS_CHOSEN, SCHEDULED_ZERO_DOWNTIME_CORE, DESIGN_CONSIDERATION_BULLMQ_WORKER, DESIGN_CONSIDERATION_CANARY_RELOAD, DESIGN_CONSIDERATION_STAGING_SMOKE, DESIGN_CONSIDERATION_VERIFY_SIGNAT, DEVELOPER_REGISTRATION_TOKEN_BASED, LICENSING_THE_SIX_STATE]
contracts: [contracts/module-manifest.schema.json]
acceptance: [ACC-MOD-0015-1, ACC-MOD-0015-2, ACC-MOD-0015-3, ACC-MOD-0015-4, ACC-MOD-0015-5]
owners: [framework-maintainers]
last_verified_commit: null
review_state: pending-evidence
---

## 15. Swastik — Hot Reload & Dynamic Module Management

**Status:** [SPEC]

Swastik owns every deployment, hot-reload, hot-swap, and related delivery mechanism — the
single answer to how new or changed code reaches a running fleet, core codebase and
independently-authored modules alike. It runs as its own deployable process
(`apps/main/src/entry/swastik.ts`), architected like the Power Engine Panel and CLAI: a
separate service sharing nothing with the bot process but the same PostgreSQL primary, the
same Redis instance, and the same container image.

### 15.1 Two Distinct Reload Mechanisms — Not to Be Confused

```
TABLE 15-A — Development hot reload vs. runtime module activation

┌────────────────────────┬──────────────────────────┬────────────────────────────────┐
│                        │ Development hot reload   │ Runtime module activation      │
├────────────────────────┼──────────────────────────┼────────────────────────────────┤
│ Mechanism              │ Node --watch + tsx,      │ onUnload → re-import → onLoad  │
│                        │ re-import changed files  │ → onReady, on Swastik's signal │
│ Environment            │ development only         │ always (the production path)   │
│ Gateway connection     │ preserved                │ preserved (never disconnects)  │
│ Concurrency safety     │ not a concern (dev)      │ safe by design                 │
└────────────────────────┴──────────────────────────┴────────────────────────────────┘
```

Development-time hot reload is **not** Swastik: it is Node's `--watch` plus tsx, gated on
a development environment only, and a production guard must prevent that path outside
development. The runtime activation endpoint that Swastik calls after an atomic symlink
promotion is an **internal-only** `POST /internal/reload?module=<name>`, distinct from any
admin-facing reload route. It executes the full lifecycle sequence and reports the outcome
to Swastik, which performs automatic rollback on failure.

```
In-process reload sequence (triggered by Swastik's reload signal)
  1. onUnload cleanup + the framework's own teardown (cache namespace flushed,
     per-module queue workers closed)
  2. re-import of the module files
  3. onLoad(container) — re-register DI
  4. onReady(client) — re-register commands and events
  5. a self-health check, reported back to Swastik
```

A failed hot-swap is never left half-applied: Swastik reverts to the preserved previous
version automatically.

### 15.2 Worker Thread Isolation

CPU-intensive work inside a module — image processing, large dataset aggregation, content
analysis — runs in Node.js **worker threads**, never on the main event loop. A worker pool
service manages pre-spawned threads, dispatches tasks, and returns typed results through
promises. A worker failure (crash, timeout) is isolated entirely to that task and never
affects the main thread, the gateway connection, or any other concurrent operation.

Worker entry files are ordinary TypeScript compiled by the identical `tsc` build step as
the rest of the app — no separate bundler, no ESM/CommonJS mismatch — and the pool spawns
each thread against the already-compiled output, never against a `.ts` source file.

**Correlation across the thread boundary is explicit.** A task dispatched to the pool
serializes the calling command's `correlationId` into the payload; it is *not*
automatically inherited, because `postMessage` crosses a real thread boundary with no
shared memory or async-context propagation. The worker's entry point binds a child logger
to that same `correlationId` as its first action, so a trace spanning a worker-offloaded
task is never orphaned.

For modules that own queues, the queue manager keeps a `moduleSlug → Worker[]` map and
manages worker lifecycle across hot-swaps: pause the queue, wait for the current job to
finish (or dead-letter it as a fallback), close the old workers, and spawn new ones with
the new processor code.

### 15.3 Reload, Toggle, and Disable — Four Distinct Mechanisms

```
TABLE 15-B — The four mechanisms

┌──────────────────────────────┬─────────────────────┬───────────────┬──────────────┐
│ Mechanism                    │ Trigger             │ Scope         │ Re-imports?  │
├──────────────────────────────┼─────────────────────┼───────────────┼──────────────┤
│ Development hot reload       │ file save           │ this process  │ yes          │
│ Runtime module reload        │ Swastik signal      │ this process  │ yes          │
│ Per-guild toggle             │ admin action        │ one guild     │ no (state)   │
│ Global module disable        │ Power Engine        │ all guilds    │ no (state)   │
└──────────────────────────────┴─────────────────────┴───────────────┴──────────────┘
```

The distinction that matters operationally: the top two change **what code is running**;
the bottom two change **whether already-running code is permitted to dispatch** — and
neither of the bottom two touches loaded state, DI registrations, or event subscriptions. A
disabled module is still loaded, still occupying its container scope, short-circuited
before its handler runs. An operator diagnosing "the module isn't responding" needs to know
which of the four applies.

### 15.4 Two Update Paths, Chosen By What Changed

```
DIAGRAM 15-A — Core restart vs. module hot-swap

Core change (anything outside the module volumes)
  → the FULL release pipeline: build → staging validation → the two-approver
    production gate → the zero-downtime rolling update. Swastik's only involvement
    is the scheduled trigger; it reimplements no part of the pipeline.

Module change (one module's code, uploaded by its developer)
  → Swastik detects the module path on the shared volume, validates specifically
    that module, and reloads ONLY it — in every pod simultaneously — without
    restarting the application or affecting any other module.
```

The two paths are kept separate because they answer different questions: a core change
carries the scrutiny and rollback-capable pipeline any app-wide change requires, while a
module change costs its author nothing more than an upload and a validation pass —
precisely because module isolation makes one module's code safe to swap.

**Coordination with the Release Manager.** A renewable Redis lease
(`release-manager:core-release:lease:{environment}`, 30-second TTL, 10-second heartbeat)
guarded by fencing tokens. While the Release Manager holds the lease, Swastik pauses module
hot-swaps, queues valid uploads, and defers the scheduled restart. Every lease or lock
carries a monotonically increasing fencing token; instructions carrying a token lower than
the current one are rejected, which prevents a stale split-brain or expired-lease holder
from issuing instructions.

**The core cannot be hot-reloaded.** The DI container, command router, middleware pipeline,
database connections, and event bus are live objects; re-importing them breaks every active
reference, and the Node module cache makes in-place swapping unreliable. A core change
requires a full process restart. Module reload is strictly for the module volumes.

**The reload loop, restated.** Every module promotion follows the identical closed loop:
**promotion → reload signal → verified health check → automatic rollback.** The health
check is not advisory — the promotion is not "done" until the reloaded module reports
healthy, and a failed or timed-out check reverts the symlink to the preserved previous
version and re-signals a reload. No gate in the loop can be bypassed by an operator
shortcut, a repository trigger, or a batch operation.

**The automation boundary (ADR-006).** Updates to an already-approved module are
**auto-approved** when — and only when — the diff against the currently-approved version is
computable and falls inside the automated gates' authority. The **first promotion** of a
module, and any update whose diff touches requested intents, `dashboardSchema` fields, or
declared `crossModuleReads`, always passes the human gate. Diff-based auto-approval for
updates, human gate for first promotion: the boundary is exact and non-configurable.

### 15.5 Scheduled Zero-Downtime Core Restart

Independent of any specific code change, Swastik issues a **24-hour recurring trigger**
that restarts the entire core using the same zero-downtime rolling-update mechanism as the
core release pipeline — the same `maxUnavailable: 0` / `maxSurge: 1` strategy, the same
shard-ownership handoff, the same readiness-gated traffic cutover. This bounds how long a
running fleet can drift from its most recently promoted state.

For the duration of the restart window, Swastik places an explicit temporary lock on every
module-level hot-swap: a module upload clearing validation during the window is staged and
held, and promoted the moment the restart completes — so a fleet-wide pod replacement and
an in-process module swap can never contend for the same shared volume. The lock releases
automatically once every pod reports readiness, and a held promotion resumes immediately
with no operator action.

### 15.6 Developer Registration & Token-Based Identity

A developer registers through a secured API with a username and password (Argon2id
hashing). On success, Swastik calls the **Credentials Service** — rather than minting
anything itself — to assign a **dev id**: a cryptographically random secret handled with
exactly the sensitivity of a Discord bot token, stored only as an Argon2id hash, with the
raw value returned to the developer **exactly once, at issuance**, never displayed or
persisted again. The dev id is always transmitted in an `Authorization` header, never in a
URL, query string, or log line.

Alongside the dev id, Swastik issues a **build id** for every module version uploaded — a
fresh identifier per version, never reused, distinct from the dev id. A manifest carries
both in `devId` and `buildId`: the permanent record of which registered developer authored
which build.

### 15.7 Licensing — The Six-State Machine

Licensing is a **governed state machine**, not a data column. A developer's licence moves
through exactly six states.

```
DIAGRAM 15-C — The licence state machine

pending → under-review → approved → suspended ⇄ restored
                                    approved  → revoked
                                    suspended → revoked   (every non-terminal → revoked)
```

- **pending** — a new registration starts here; no upload proceeds.
- **under-review** — set when a reviewer picks up the application; blocks uploads
  identically.
- **approved** — the only state permitting deployment and promotion.
- **suspended** — a real state, not a relabelled decline: the row carries `suspendedAt`,
  `suspendedBy`, and `suspensionReason`, set by the suspending act and cleared on restore.
  Every promotion, upload, and version bump from that developer is blocked; every pending
  build of theirs is rejected with a terminal status and the reason; and when the
  suspension carries the **force-disable flag**, the developer's live modules are
  **unloaded across the fleet** through the same unload path — not merely short-circuited
  at dispatch — until restored.
- **restored** — returns a suspended licence to approved; reachable only from suspended.
- **revoked** — terminal: the dev id is barred permanently, and no administrative action
  short of a new registration can reopen it.

Transitions are governed, never automatic — moving a licence into under-review, approved,
suspended, restored, or revoked is carried out by the project owners through the governance
API or the Power Engine Panel, never inferred from upload volume or activity. The only
automated triggers are suspension and revocation: a confirmed security finding against a
developer's module moves the licence to suspended pending review; a confirmed
malicious-artifact finding moves it to revoked.

The manifest's `devId` must equal the licence's subject, so the binding is queryable
end-to-end — from a paper certificate, through the licence record, to every build and
deployment record the licence ever authorized. Four **licence classes** exist, one per
tier, each with its own review depth and renewal obligations; a licence authorizes
publication at its own tier and below. Every approved licence is issued as a Credentials
Service **paper certificate** carrying a verifiable licence id.

### 15.8 Secured Upload, Validation, Staging & Promotion

```
DIAGRAM 15-B — From upload to live

1. The developer uploads a TypeScript source tarball (multipart/form-data) —
   manifest, package.json, lockfile, source tree; hard-capped at 64 MiB.
   Swastik runs the trusted builder and produces the artifact itself; it never
   accepts pre-built JavaScript. The dev id travels in the Authorization header.
2. Swastik assigns a fresh buildId and signs the full provenance byte set
   (moduleSlug + version + devId + buildId + sourceHash + artifactHash +
   gateResultsHash), recorded against (devId, moduleSlug, version).
3. PRE-DEPLOYMENT VALIDATION — the manifest is read by AST-parsing manifest.ts
   with the TypeScript compiler API, never by executing import. The devId/buildId
   binding, the licence state, the licence's tier class, and the suspension state
   are all checked. Any failure is rejected with the SPECIFIC failure, never a
   generic message.
4. STAGING — validated code is written to a staging area on the shared volume,
   never directly into the live module directory a running pod loads from.
5. ATOMIC PROMOTION — the module's selftest runs in an isolated worker with a
   bounded timeout; only a passing selftest triggers the atomic swap (a single
   renameSync of the staged pointer over the live pointer), under a Redis lock so
   a promotion never interleaves with a core restart.
6. HOT-SWAP SIGNAL — Swastik calls the internal-only reload API.
7. The runtime executes onUnload → re-import → onLoad → onReady → self-health.
   PASS ⇒ live. FAIL ⇒ Swastik reverts the symlink to the preserved previous
   version and re-signals a reload.
```

**Upload intake and path containment.** Every Swastik request body is Zod-validated before
any handler logic runs: the slug must match its kebab-case pattern, the version must be
strict semver, and a failing body returns 400 with field-level errors and never reaches the
filesystem. Extraction is zip-slip-safe: every archive entry is resolved against the
staging root and checked with a containment assertion before anything is written, and a
single escaping entry aborts the whole upload with nothing written. Every filesystem join on
the module volumes is assembled by a `safeJoin` helper — the only sanctioned way to build a
module-volume path — which re-validates each request-derived component, resolves the joined
path, and asserts containment; a component failing its pattern or a resolution escaping the
root throws a containment error and the request fails closed.

**Seven-check upload validation.** Uploaded modules are validated against the same schema
used at startup through seven checks — manifest shape, command schema, config schema, dev
id validity, build id validity, build id binding, and licence approval — each rejecting at
the upload boundary, before anything is staged.

**The 19-step ordered trust-chain check.** The seven upload checks are the boundary tier of
a wider validation pipeline, expanded from 8 controls to a **19-step ordered trust-chain
check**: trusted build, provenance hash binding, full-provenance signing, and a
contract/migration comparison against a disposable DB, on top of the existing manifest,
devId/buildId binding, licence, staging, promotion, hot-swap, rollback, and audit controls.
The steps run in order; any check that fails rejects the module with the **specific failure
returned to the developer directly**, never a generic message. The corpus carries the
validation counts at three scopes — the seven upload checks, the "expanded from 8 controls"
lineage, and the full 19-step pipeline — and they are not in conflict: they describe the
boundary checks, the expansion, and the end-to-end chain.

**Deploy authorization — owner approval, never auto-approval.** Deploy-granting surfaces
resolve the caller's dev id against the developers table and proceed only when the licence
reads approved. An unknown developer, or one in pending, is never auto-approved: the deploy
is refused with 403 before any build/staging/promotion step runs, the refusal is audited,
and the attempt creates a pending approval request that a project owner reviews through the
governance API. A database constraint closes the self-approval hole: an approval write must
reference an approver identity that resolves to a project owner, so no code path —
internal automation included — can self-approve a module.

**Module ownership.** Every published slug has exactly one owning developer, recorded in
the modules table. The first accepted upload of a fresh slug claims ownership; every
subsequent upload resolves the caller's dev id against the row, and a non-owner is refused
with 403 before validation. Ownership transfer is an explicit operator action, never a side
effect of an upload.

**Throttling and internal-surface authentication.** Swastik registers a rate limiter across
its surface — a global bucket of 30 requests per minute per caller, with a tighter bucket of
5 per minute on the registration, upload, and deploy routes. A caller exceeding a bucket
receives 429 with a `Retry-After` header, and throttled attempts are audited. Every
`/internal/*` route installs a single pre-handler comparing the presented internal API key
against the configured value with a timing-safe comparison over fixed-length digests,
before any route logic runs; a mismatch returns 401 and writes an audit row recording the
route and caller address — never the presented value.

**Atomic promotion and rollback.** Promotion is a single atomic filesystem operation on the
shared volume: the validated build is fully materialised at its version directory first,
then the swap is a temp-symlink flip — a fresh symlink is created and verified, then moved
over the live pointer with exactly one atomic rename, so no pod can observe a half-applied
module. The swap runs under a Redis lock held until every pod has acknowledged the reload.
Rollback detects dangling links and re-points the pointer at the newest surviving
known-good version before any pod reads through it; the previous version's directory is
preserved intact for instant rollback, and retention pruning removes superseded version
directories only beyond the retention window (default: the last three known-good versions).

**Build status vocabulary.** One vocabulary governs the pipeline end to end:
`RECEIVED → VALIDATING → BUILDING → VALIDATED → STAGED → PROMOTING → LIVE`, with exactly
two terminal failure states, `REJECTED` and `ROLLED_BACK`. The same words appear on the
upload API's response, the deployment records, the developer portal, and the control
plane's queries, and every transition is an audited event in the same vocabulary.

### 15.9 Change Detection & Deployment Orchestration

The runtime **never** watches the filesystem for module changes — that belongs to Swastik
alone. Swastik receives an upload or a scheduled trigger fires; it validates the payload;
it stages and promotes the change; it calls the runtime's internal reload API; and it
handles rollback on any failure while reporting status at every stage. The runtime
activates a new module version only after Swastik issues the explicit reload signal.

**Runtime import verification.** Before importing a module version from the volume, the
loader hashes the on-disk artifact and compares it against the builds row for the named
build id. A mismatch — or a build id with no row — never imports: the directory is moved
into quarantine, the load is refused, and the refusal is audited with both hashes recorded.
The import path is cache-busted with the build id, so the ESM loader cache cannot serve a
previous version's bytes across a hot-swap. Immediately before activation, the loader
asserts the manifest/directory match: every file the manifest declares exists in the version
directory, and the directory holds no entry the manifest does not account for.

**Bot-side reload.** On receiving the internal reload signal, the hot-swap service pauses
the module's queue consumers, drains in-flight jobs to completion or their bounded timeout,
then respawns the module and resumes its queues, reporting the outcome back to Swastik.
Before queues resume, the re-imported module's registration is swapped in atomically — the
frozen registry snapshot the router and event router dispatch against is replaced only after
`onReady` succeeds, and the module's guild commands are re-registered for the new build, so
no pod ever dispatches against a half-registered module. Any failure triggers auto-revert.

**Volume requirements.** All module hot-swap relies on `ReadWriteMany` volumes (NFS, EFS):
the four per-tier volumes plus staging. Operators must ensure the filesystem is not a
single point of failure and handle stale NFS handles. Tier-at-rest is enforced on every
promotion: the symlink swap targets only the volume matching the module's declared tier.

### 15.10 Auditing

Swastik audits every action performed using a dev id, a build id, or the licensing system,
written through the same `audit_logs` table every other subsystem uses and tagged with its
source rather than a separate audit store. Each entry captures validity status, versioning,
and deployment timestamps, alongside developer lifecycle events, every upload attempt with
its validation outcome, version assignment, staging and promotion, hot-swap outcomes
including any automatic rollback, every scheduled core restart, operator-initiated manual
overrides, and the codebase size of every promoted build. Filtering the audit table to
Swastik's source rows is, by construction, a complete history of every deployment action
the delivery layer has ever taken.

### 15.11 The Developer Portal & Repository Binding

The developer portal is backend infrastructure, not a frontend concern — built to support
integration into any website through the REST surface rather than a framework-shipped UI. A
developer logs into whatever site hosts the portal with their registered credentials and
uses a deploy control to trigger an upload; the portal holds no privileged path the REST
surface does not also expose.

### 15.12 Deployment Records

Every promotion writes a deployment record — the durable, queryable account of what version
of what module, authored by whom, under which build id and provenance hashes, was promoted
when, to which tier volume, and with what outcome. The record is the join point between the
builds table, the audit trail, and the control plane's deployment queries.

### 15.13 How To Verify This Section Against the Code

- The Swastik entrypoint: `apps/main/src/entry/swastik.ts`.
- The Swastik loader and promotion: `apps/main/src/module-system/swastik-loader.ts`,
  `src/module-system/promotion.ts`, `src/module-system/build-signing.ts`.
- The build and seed scripts: `apps/main/scripts/build-first-party-modules.ts`,
  `apps/main/scripts/seed-first-party-modules.ts`, `apps/main/scripts/swastik-deploy.ts`.
- The module volume configuration: `apps/main/src/config/env.schema.ts`
  (`MODULES_DIR`, `SWASTIK_STAGING_VOLUME_PATH`, `SWASTIK_LIVE_VOLUME_PATH`,
  `SWASTIK_QUARANTINE_PATH`, `BUILD_SIGNING_KEY_ID`).
- The licensing state: `apps/main/src/licensing/license-machine.ts`.

Where this section and the tree disagree, the disagreement is recorded in
`status/code-reconciliation.json`.

### 15.14 Swastik's Evolving Role — from Doorman to TSA + Kitchen

Swastik's original design was a doorman: a licence check plus a file copy. The realized role
is **TSA + kitchen** — it scans, builds, signs, and smoke-tests every module before it is
admitted, so the pipeline stages must stay aligned to that stronger model rather than
drifting back toward a passive file-mover. This is the same principle as the zero-trust
build pipeline (§15.8): every uploaded package is untrusted input until validation, build
provenance, licensing, and signature verification all succeed.

## Contract
- `contracts/module-manifest.schema.json`

## Acceptance
```acceptance
- id: ACC-MOD-0015-1
  check: "Dev hot-reload (tsx --watch) activates only when NODE_ENV=development; a production guard blocks it"
  test: tests/modules/dev-reload-guard.spec.ts
- id: ACC-MOD-0015-2
  check: "Reload sequence is onUnload -> re-import -> onLoad -> onReady -> self-health, reported to Swastik"
  test: tests/integration/hot-swap-sequence.spec.ts
- id: ACC-MOD-0015-3
  check: "Promotion is an atomic symlink swap under a Redis lock; a failed swap reverts to the preserved previous version"
  test: tests/integration/atomic-promotion.spec.ts
- id: ACC-MOD-0015-4
  check: "CPU work runs in WorkerThreadPool with the correlationId serialized across the thread boundary"
  test: tests/unit/worker-pool.spec.ts
- id: ACC-MOD-0015-5
  check: "The six-state licence machine (pending->under-review->approved->suspended<->restored->revoked) is enforced"
  test: tests/modules/license-states.spec.ts
```

## Edges (-> blueprint)
- SPEC-03-MODULES -> SPEC-02-ARCHITECTURE (modules load into the core DI child container)
- SPEC-03-MODULES -> SPEC/00-GOVERNANCE (tier + licence rules)
- SPEC-03-MODULES#SWASTIK -> SPEC-06-OPERATIONS (hot-swap + promotion pipeline)

## Named entities (from the original reference)

The original reference named these entities in "15. Swastik — Hot Reload & Dynamic Module Management". They are preserved here so no identifier is lost in the restructure.

**classes, interfaces & symbols:** `Cache-Busting`, `Concurrent-user`, `Hot-Reloaded`, `HotSwapService`, `OIDC-validated`, `OIDC-verified`, `deployAll`, `livePointer`, `loadModulesFromSwastikVolume`, `lstatSync`, `ownerDevId`, `ownershipTransferredAt`, `preHandler`, `resolvedPath`, `stagedPointer`, `stagingRoot`, `symlinkSync`, `volumeRoot`, `PathContainmentError`, `DEVELOPER_DEPLOY_DENIED`, `INTERNAL_AUTH_DENIED`, `MODULE_UPLOAD_DENIED_NON_OWNER`, `crypto.timingSafeEqual`, `fs.renameSync`, `index.js`, `lock-client.ts`, `pnpm-lock.yaml`, `queue-reconciliation.ts`, `release-manager.ts`, `scheduled-restart.ts`
