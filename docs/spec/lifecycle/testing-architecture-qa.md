---
id: SPEC-07-LIFECYCLE-0037
title: 37. Testing Architecture & QA
kind: spec
status: normative
version: 5.0.0
authority_scope: [07-lifecycle]
anchors: [TESTING_ARCHITECTURE_QA, TESTING_PHILOSOPHY, THE_FOUR_TIER_TEST, MOCKCONTAINER_FIXTURES_EXPANDED, COVERAGE_REQUIREMENTS, MOCK_FIRST_DISCORD_HEADLESS, VITEST_CONFIGURATION_REFERENCED_BU, PROACTIVE_BACKFILL_MIGRATION_DECLA, I18N_DATA_ERASURE_WEBHOOK, SLO_ALERTING_THRESHOLDS_DECLARED, LOAD_PERFORMANCE_TESTING, CONTRACT]
contracts: []
acceptance: [ACC-LIFE-0037-1]
owners: [framework-maintainers]
last_verified_commit: null
review_state: pending-evidence
---

## 37. Testing Architecture & QA

**Status:** [SPEC]

### 37.1 Testing Philosophy

P8 — test in isolation, deploy with confidence. Every class's dependencies arrive through the
DI container, so every class is testable in isolation; the test pyramid exploits that property
before paying the cost of an integration or end-to-end test.

**Honesty invariants for the suite.** Detection and quality claims are stated in measured
form — review-pipeline detection rates tracked against a corpus of known-bad samples, and
leak-regression suites reporting the five leak vectors' containment as a tracked rate. No test
tier or gate is described as catching "all" or "zero" of anything; CI asserts measured rates
stay at or above their recorded values.

### 37.2 The Four-Tier Test Pyramid

```
DIAGRAM 37-A — The pyramid (illustrative scale for a mature deployment)

E2E          (~10)     full stack, a real test Discord guild, a real bot connection —
                       slowest; pre-release, not per-commit
Smoke        (~15)     happy-path: one golden-path assertion per critical command, fast
                       enough to gate a release pre-deploy
Integration  (~50)     a repository against a real test-database instance; a
                       service-plus-repository pair together
Unit         (~500+)   every service, command, and middleware class in isolation via the
                       mock container, run on every commit
```

```
TABLE 37-A — Pyramid layer reference

Layer             What it verifies                              Real infra?       Run frequency
Unit              one class's logic in isolation via the        none — the mock   every commit,
                  mock container                                container          every PR
                                                                substitutes all
Integration       a repository against a real test-database; a  real test DB      every PR
                  service + repository pair together
Happy-path smoke  one golden-path assertion per critical         mock + minimal    pre-deploy,
                  command                                       real infra        release gate
E2E               the full stack against a real test guild and  real guild,       pre-release,
                  a real bot connection                         real connection   not per-commit
```

### 37.3 MockContainer & Fixtures

A fixtures directory supplies reusable, realistic sample data — a fixture guild, user, and
moderation case. A well-formed unit test constructs a `MockContainer`, registers the class
under test with its real implementation, resolves it, exercises it, and asserts against the
container's typed assertion methods (`assertEmitted`, `assertEnqueued`, `assertLogged`) — with
no real network, database, or Discord connection.

**Mock-first Discord.** Testing is mock-first: a deterministic mock gateway adapter assigns
guilds to shards by hashing the guild id modulo the shard count, paired with a live adapter for
real connections. No live Discord dependency exists in the test suite.

### 37.4 Coverage Requirements

Coverage floors are deliberately not uniform — code closer to the framework core carries a
stricter bar. They are enforced **per layer**, not as a single repository-wide average.

```
TABLE 37-B — Coverage floors by layer (statement / branch)

Application core (src/core/)                     85% / 80%
Module services                                  80% / 75%
Module commands                                  75% / 70%
Repositories (core and module)                   70% / 65%
Infra-adjacent services (queue, HTTP routes)     70% / 65%
```

> **Verification item.** The floors and the architecture-specific lint rules are independently
> checkable — the floors encoded in the Vitest coverage thresholds, the rules in the flat
> ESLint config. Any divergence, or a blanket average replacing per-layer gates, is a defect.
> The integration config must also exist at the project root and enforce the per-layer floors.

### 37.5 Load & Performance Testing

Validates the SLO targets against a **staging deployment**, not unit mocks: synthetic
interaction volume ramped against staging's HTTP and gateway surfaces, measuring P95/P99
latency and error-rate signals. It is a release-gate activity for changes touching the hot
dispatch path specifically, not a per-commit check.

### 37.6 Sub-System Status Notes

Several subsystems are specified but not yet wired, and the distinction is stated rather than
hidden: the i18n manager exists with tests but is not yet called by any middleware; the data
erasure service and the webhook-signature verification middleware are missing or unwired; the
SLO alerting rules and dashboards are declared but not yet active; and the proactive backfill
migration is declared but not implemented. Each requires being wired into bootstrap and the
middleware pipeline with per-layer coverage floors met.

### 37.7 How To Verify This Section Against the Code

- The unit and integration Vitest configs: `apps/main/vitest.config.ts`,
  `apps/main/vitest.integration.config.ts`.
- The mock container: `apps/main/src/di/mock-container.ts`, `src/shared/testing/`.
- The mock gateway adapter: `apps/main/src/discord/gateway.mock-adapter.ts`.
- The test suites: `apps/main/tests/unit/`, `apps/main/tests/integration/`.

Divergences are recorded in `status/code-reconciliation.json`.

## Contract
None (conceptual).

## Acceptance
```acceptance
- id: ACC-LIFE-0037-1
  check: "The four-tier test pyramid (unit/integration/smoke/E2E) exists with the documented per-layer coverage floors"
  test: tests/ci/coverage-floors.spec.ts
```

## Edges (-> blueprint)
- SPEC-07-LIFECYCLE -> orchestration/ (build pipeline)
- SPEC-07-LIFECYCLE -> SPEC-06-OPERATIONS (runbooks + SLOs)

## Named entities (from the original reference)

The original reference named these entities in this section. They are preserved here so no identifier is lost in the restructure.

**classes, interfaces & symbols:** `Alertmanager`, `Expanded`, `Grafana`, `MockGatewayAdapter`, `shardCount`

**config/env constants:** `CORE_TOKENS`

**files & artifacts:** `gateway.live-adapter.ts`
