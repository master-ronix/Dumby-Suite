---
id: SPEC-00-GOVERNANCE-0010
title: PART 8 — QUALITY, DELIVERY & ACCEPTANCE
kind: spec
status: normative
version: 5.0.0
authority_scope: [00-governance]
contracts: []
acceptance: [ACC-GOV-0010-1]
owners: [framework-maintainers]
last_verified_commit: null
review_state: pending-evidence
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

## Acceptance
```acceptance
- id: ACC-GOV-0010-1
  check: "CI hygiene, the Compatibility Ledger release gate, and the Definition of Done are enforced"
  test: tests/ci/quality-gate.spec.ts
```
