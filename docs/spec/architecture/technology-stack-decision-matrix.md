---
id: SPEC-02-ARCHITECTURE-0005
title: 5. Technology Stack & Decision Matrix
kind: spec
status: normative
version: 5.0.0
authority_scope: [02-architecture]
anchors: [TECHNOLOGY_STACK_DECISION_MATRIX, EXTERIORITY_AXIOM_SEPARATELY_BUILT, RUNTIME_NODE_JS_LTS, LANGUAGE_TYPESCRIPT_STRICT_MODE, PERSISTENT_VOLUME_CLAIM_FOR, PER_MODULE_PROCESS_SANDBOX, DISCORD_INTEGRATION_DISCORD_JS, A_OPEN_CORE_GATED, DATA_STORAGE_POSTGRESQL_SYSTEM, JOB_QUEUE_SCHEDULING_BULLMQ, OBSERVABILITY_STACK_PINO_PROMETHEU, CONFIGURATION_VALIDATION_ZOD]
contracts: [contracts/config.schema.json]
acceptance: [ACC-ARCH-0005-1, ACC-ARCH-0005-2, ACC-ARCH-0005-3, ACC-ARCH-0005-4]
owners: [framework-maintainers]
last_verified_commit: null
review_state: pending-evidence
---

## 5. Technology Stack & Decision Matrix

**Status:** [SPEC]

Every technology choice below is stated explicitly and justified. A team adopting this
architecture substitutes none of them without documenting why, in the same style as this
section — because each choice is load-bearing for a mechanism described elsewhere.

### 5.1 The Exteriority Axiom — Separately-Built Control-Plane Services

The **Release Manager** is an external, separately-built, separately-deployed
control-plane service. It must never live inside the application's `src/entry/`: doing so
creates a circular bootstrap dependency, because deploying Dumby would require deploying
the deployer. The Release Manager owns its own repository, container image, deployment
manifests, and CI/CD pipeline; its entrypoint path is never a path under the Dumby
application. It is also the deploy path's system of record: every deployment change it
applies is committed back to the Git system-of-record (reverse GitHub sync), so the
repository never drifts from the running cluster's state.

### 5.2 Runtime — Node.js LTS ≥ 22

Node's event-driven, non-blocking I/O maps onto an interaction-driven workload that is
mostly waiting on I/O — the Discord gateway, the database, the cache. LTS guarantees a
defined support window. Node 22 is the floor specifically for native `fetch`,
structured-clone support, and stable top-level `await` in ESM — all load-bearing for the
bootstrap and module-loading design (§8). The runtime floor is not advisory: the package
manifest declares `engines.node >= 22`, and the container image must use a Node 22 base.

### 5.3 Language — TypeScript, Strict Mode, Non-Negotiable

TypeScript strict mode is enforced project-wide as the production stack: `strict: true`
plus `exactOptionalPropertyTypes: true` and `noUncheckedIndexedAccess: true`, with ESM
and `NodeNext` module resolution. The manifest schema, DI container, command interface,
event catalogue, and repository layer are all defined so the compiler catches integration
bugs at authoring time rather than at runtime.

- **Module uploads are TypeScript source, not compiled JavaScript.** The Swastik
  zero-trust build pipeline compiles and validates uploaded `.ts` before staging;
  compiled `.js` uploads are rejected at intake. `tsc` is a mandatory, first-position CI
  gate — before lint, before test, before deploy.
- **Open core, gated marketplace.** The Application Core is open-source; the marketplace
  and the confirmed-developer submission pipeline remain gated. This supersedes the
  earlier closed-source, confirmed-developer-only distribution model.

### 5.4 Module Format & Tooling

- **Module format:** ESM only (`"type": "module"`, `"module": "NodeNext"`); `require` is
  never used anywhere in the codebase.
- **Package manager:** pnpm, with the lockfile committed and CI running
  `--frozen-lockfile`.
- **Docker image:** contains only the Application Core. No modules are baked in; the CI
  build is split so the core image and module artifacts are produced and versioned
  independently.
- **Module source:** lives on an external volume (`MODULES_DIR`), never in the image.

### 5.5 Module Storage — Four Per-Tier Volumes Plus Staging

Module storage is four per-tier volumes plus a staging volume: `modules-admin`,
`modules-core`, `modules-standard`, `modules-marketplace` (the live, served module sets,
one per tier) and `swastik-staging` (incoming uploads, validation, build).

**Tier-at-rest is enforced:** a module's files live on the volume matching its
manifest-declared tier, and Swastik refuses to stage or promote a module whose declared
tier and target volume disagree (ADR-005). There is no in-tree `src/modules/` layout;
every module, first-party ones included, is seeded onto its tier volume through the
normal promotion pipeline (§15.8). The volumes are `ReadWriteMany` (EFS/NFS) for
multi-replica access; block storage is not used for module storage. This split is what
enables instant hot-swaps, guild-specific module sets, and per-tier isolation without a
hardcoded module list in the image. It is a poor fit for single-node `hostPath` clusters.

### 5.6 Discord Integration — discord.js v14, Used Directly

discord.js v14 is the single Discord integration library, used directly rather than
behind a generic abstraction; its `Client`, `GatewayIntentBits`, `Partials`,
`SlashCommandBuilder`, and `Interaction` type hierarchy are what module authors work
with. It is the dominant TypeScript-compatible Discord library with a stable, actively
maintained type system.

- **Privileged-intent whitelist.** `MessageContent`, `GuildMembers`, and `GuildPresences`
  are rejected with a configuration error at bootstrap Stage 02 when present in any
  module's declared intents or the process configuration — the platform's
  zero-knowledge slash-command posture (§4) is enforced, not assumed. Non-privileged
  intents pass without ceremony.
- **Discord the platform, not discord.js the library, is what the architecture absorbs
  change from.** Every numeric constant treated as a design parameter — the sharding
  threshold (§33.1), the interaction response window (§19.2), privileged-intent gating
  (§4) — is expressed as configuration precisely because it is a Discord *platform
  policy*, not a framework decision. The message-content non-goal exists specifically
  because Discord restricted that intent; it is the working model for the next platform
  change, which becomes a configuration-level adjustment rather than a rewrite.

### 5.7 Data Storage — PostgreSQL (System of Record) + Redis (Acceleration)

```
TABLE 5-A — Storage role separation
```

- **PostgreSQL** is the sole system of record. JSONB holds per-guild configuration blobs
  without sacrificing relational integrity elsewhere; ACID transactions cover multi-table
  writes; row-level locking (`SELECT FOR UPDATE`) guards concurrent double-actions on the
  same target; `LISTEN/NOTIFY` carries cross-process cache-invalidation signalling.
- **Redis** is the L2 cache, the BullMQ queue backing store, and the cross-shard pub/sub
  bus. It is explicitly **not** the primary data store: its role is acceleration and
  coordination. Any data whose loss would be user-visible lives only in PostgreSQL.
- **Query builder: Knex.js — not an ORM.** There are no active-record entities. The
  repository pattern (§24.3) is the only abstraction over the database, issuing SQL
  through Knex rather than by string concatenation, and Knex's migration system handles
  all schema management (§24.4).

### 5.8 Job Queue & Scheduling — BullMQ

BullMQ provides durable, Redis-backed job queues with per-job retry policies, dead-letter
routing, delayed jobs (scheduled mutes, timed close events, reminder firing), and
rate-limited queues. It is chosen over an in-process scheduler specifically because it
survives process restarts — a job enqueued twenty-four hours out still fires after three
restarts. Cron-style recurring work (§29.6) wraps BullMQ's repeatable-job mechanism
behind a distinct API, because recurring tasks and one-shot jobs have different authoring
models. Cron parsing is BullMQ's own; there is no separate `cron-parser` dependency — a
dependency whose only consumer was retired is removed with it.

### 5.9 Observability Stack — Pino, prom-client, OpenTelemetry

- **Logging — Pino.** Structured JSON to stdout with the lowest per-log overhead; child
  loggers pre-bind `traceId`, `guildId`, and `moduleId` to every line in a request's call
  stack.
- **Metrics — prom-client.** Command counters, latency histograms, queue depth, cache
  hit/miss ratios, and database-pool usage, exposed as Prometheus text format from
  `/metrics`.
- **Tracing — OpenTelemetry SDK.** A root span per command execution, with child spans
  for every database query above the slow threshold, every job invocation, and every
  outbound HTTP call; OTLP export to any compatible backend.
- All three pillars carry the same `traceId`, so cross-signal correlation is a lookup
  rather than a time-based approximation (§27.1).

### 5.10 Configuration & Validation — Zod

All configuration — process-level environment variables and every module's own schema —
validates against Zod schemas during bootstrap Stage 02. A value failing its schema exits
the process with a precise, field-by-field error before any module loads or any gateway
connection is attempted. There is no "handle missing config at runtime" pattern anywhere.
Only keys the schema knows are read, so stray environment variables are ignored.

### 5.11 Development & Quality Tooling

```
TABLE 5-B — Quality tooling baseline
```

TypeScript (strict) as the primary language; ESLint (flat config) for linting and
module-boundary enforcement; Prettier with a CI `--check` gate; Vitest as the unit and
integration test runner; pnpm as the package manager; tsx for dev-time TypeScript
execution without a build step; Husky for Git hooks; commitlint for Conventional Commit
enforcement; and changesets for changelog generation and release coordination.

### 5.12 Infrastructure & Deployment Targets

```
TABLE 5-C — Infrastructure targets
```

Containerisation is Docker with a multi-stage build; orchestration is Kubernetes as the
primary production target; infrastructure-as-code is Terraform for PostgreSQL, Redis, and
the cluster; secrets are sealed Kubernetes secrets (or Vault / a cloud manager), never
plaintext in manifests or committed env files; CI/CD is GitHub Actions with the five
workflows of §40.

### 5.13 Service Ports

The runtime configuration schema fixes the port of each surface. These are the values an
operator must know:

| Surface | Port | Surface | Port |
|---|---|---|---|
| API | 8080 | Swastik | 8085 |
| Health | 8081 | Credentials Service | 8086 |
| Metrics | 8082 | Twill (personas) | 8090 |
| Power Engine | 8083 | | |
| CLAI | 8084 | | |

The local Compose stack and the Kubernetes base manifests must agree with this table; the
port set is reconciled against the runtime schema in `status/code-reconciliation.json`
(REC-011).

### 5.14 Decision Matrix & Substitution Discipline

```
TABLE 5-D — Technology decisions and their rationale

┌────────────────────────┬──────────────────────────┬───────────────────────────────────┐
│ Concern                │ Choice                   │ Why (and what it displaces)       │
├────────────────────────┼──────────────────────────┼───────────────────────────────────┤
│ Runtime                │ Node.js ≥ 22 (LTS)       │ Native fetch, structuredClone,    │
│                        │                          │ stable top-level await            │
├────────────────────────┼──────────────────────────┼───────────────────────────────────┤
│ Language               │ TypeScript, strict       │ Integration bugs caught at        │
│                        │                          │ authoring time                     │
├────────────────────────┼──────────────────────────┼───────────────────────────────────┤
│ Discord library        │ discord.js v14, direct   │ Stable types; no wrapper tax      │
├────────────────────────┼──────────────────────────┼───────────────────────────────────┤
│ System of record       │ PostgreSQL               │ ACID + JSONB + LISTEN/NOTIFY      │
├────────────────────────┼──────────────────────────┼───────────────────────────────────┤
│ Acceleration           │ Redis                    │ L2 cache, queues, pub/sub         │
├────────────────────────┼──────────────────────────┼───────────────────────────────────┤
│ Data access            │ Knex, not an ORM         │ Explicit, reviewable SQL          │
├────────────────────────┼──────────────────────────┼───────────────────────────────────┤
│ Job queue              │ BullMQ                   │ Survives restarts; delayed jobs   │
├────────────────────────┼──────────────────────────┼───────────────────────────────────┤
│ Validation             │ Zod                      │ One schema language, everywhere   │
├────────────────────────┼──────────────────────────┼───────────────────────────────────┤
│ Logging / metrics /    │ Pino / prom-client /     │ One traceId across all three      │
│ tracing                │ OpenTelemetry            │ signals                           │
└────────────────────────┴──────────────────────────┴───────────────────────────────────┘
```

The substitution rule is a consequence of P1 and P13: substituting any technology above
is permitted, but it must be documented in the same form as this table, and the concern
it owns must still have exactly one home.

## Contract
- `contracts/config.schema.json`

## Acceptance
```acceptance
- id: ACC-ARCH-0005-1
  check: "Runtime is Node LTS >= 22 and the tree compiles under TypeScript strict with no `any` escape hatches"
  test: tests/arch/stack-runtime.spec.ts
- id: ACC-ARCH-0005-2
  check: "Module format is ESM-only: a CommonJS `require` build fails CI"
  test: tests/arch/esm-only.spec.ts
- id: ACC-ARCH-0005-3
  check: "discord.js v14 is used directly (no wrapper) and all DB access uses Knex, never an ORM"
  test: tests/arch/no-wrapper-no-orm.spec.ts
- id: ACC-ARCH-0005-4
  check: "Modules are served only from the four per-tier volumes at MODULES_DIR; no `src/modules/` exists"
  test: tests/arch/tier-volumes.spec.ts
```

## Edges (-> blueprint)
- SPEC-02-ARCHITECTURE-0005#TIER_VOLUMES -> SPEC-03-MODULES (modules live on the four per-tier volumes)
- SPEC-02-ARCHITECTURE-0005#POSTGRES_REDIS -> SPEC-05-DATA (PostgreSQL = system of record; Redis = acceleration)

## Named entities (from the original reference)

The original reference named these entities in this section. They are preserved here so no identifier is lost in the restructure.

**classes, interfaces & symbols:** `CPU-bound`, `Containerization`, `Datadog`, `Discord-client`, `Honeycomb`, `Infra-as-code`, `Jaeger`, `Tempo`

**files & artifacts:** `release-manager.js`, `release-manager.ts`
