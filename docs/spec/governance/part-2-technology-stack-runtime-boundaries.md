---
id: SPEC-00-GOVERNANCE-0004
title: PART 2 — TECHNOLOGY STACK & RUNTIME BOUNDARIES
kind: spec
status: normative
version: 5.0.0
authority_scope: [00-governance]
contracts: []
acceptance: [ACC-GOV-0004-1]
owners: [framework-maintainers]
last_verified_commit: null
review_state: pending-evidence
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
stack decision matrix and logged in `upgradation/`upgradation/change-log.md`.

---

## Acceptance
```acceptance
- id: ACC-GOV-0004-1
  check: "Stack mandates hold: Node>=22, TS strict, ESM-only, discord.js v14 direct, PostgreSQL+Knex, BullMQ, Pino, Zod, Fastify"
  test: tests/arch/stack-mandates.spec.ts
```
