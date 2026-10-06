---
id: SPEC-07-LIFECYCLE-0037
title: 37. Testing Architecture & QA
kind: spec
status: normative
version: 5.0.0
authority_scope: [07-lifecycle]
anchors: [TESTING_ARCHITECTURE_QA, TESTING_PHILOSOPHY, THE_FOUR_TIER_TEST, MOCKCONTAINER_FIXTURES_EXPANDED, COVERAGE_REQUIREMENTS, MOCK_FIRST_DISCORD_HEADLESS, VITEST_CONFIGURATION_REFERENCED_BU, PROACTIVE_BACKFILL_MIGRATION_DECLA, I18N_DATA_ERASURE_WEBHOOK, SLO_ALERTING_THRESHOLDS_DECLARED, LOAD_PERFORMANCE_TESTING, CONTRACT, ECOSYSTEM_FLOW_SUITE, FLOW_THREAD, CANONICAL_FLOWS, FLOW_ASSERTIONS, TEST_SUITE_COMPOSITION, FLOW_SUITE_VERIFY]
contracts: []
acceptance: [ACC-LIFE-0037-1, ACC-LIFE-0037-2]
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

**The isolation axis is not the whole suite.** The four tiers above test nodes in isolation —
one class, one repository, one service pair. They do not test the edges between nodes. The
coordination axis — the Ecosystem Flow Suite of §37.8 — is the corpus's second test axis: a
single thread that boots the real wiring and traverses it from bootstrap to shutdown. A suite
that passes every rung of this pyramid can still be mis-wired; the flow spine is what proves it
is not.

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

### 37.8 The Ecosystem Flow Suite — the Coordination Spine

**Status:** [SPEC]

The isolation pyramid proves each class is correct on its own; it does not prove the classes work
together. The Ecosystem Flow Suite is the corpus's second test axis: one **flow thread** that
starts at bootstrap, travels the real wiring — DI container, module registry, command router,
middleware pipeline, permission engine, renderer, event bus, job queue, HTTP server — and ends
at shutdown, asserting cross-file coordination, contract compatibility, and integration on the
paths a real deployment actually exercises. Where the pyramid tests a node, the flow spine tests
the edges between nodes.

The single normative statement of the ecosystem flow suite is this section. No other document
restates it; every other document cites it rather than restating it.

### 37.9 The Flow Thread — bootstrap → shutdown

**flow thread** — one sense: the single booted process, from bootstrap to shutdown, that the
Ecosystem Flow Suite traverses. A flow thread is booted through the real bootstrap sequence and
torn down through the real shutdown sequence, with only the external edges substituted:

- **The real application is booted.** The suite calls the real bootstrap; it never re-implements
  or stubs the wiring under test.
- **Infrastructure is real but local.** Embedded PostgreSQL and an in-memory Redis stand in for
  the managed services; the database client, migrations, repositories, cache cascade, and queue
  run against them unchanged.
- **Discord is mock-first.** The deterministic mock gateway adapter supplies guilds and shard
  assignment; no live Discord connection exists in the suite.
- **The thread is contiguous.** Every flow begins from a booted runtime and, where it asserts
  teardown, ends through the real shutdown; a flow never constructs a private copy of a core
  service.

The thread is the executable form of the wiring invariants in `blueprint/system-map.md`: one
instance of everything, one dispatch path, one presentation path, one direction per edge.

### 37.10 The Canonical Flows

The suite is a registry of named flows — {{counts.flow_threads}} of them — each a thread with a
declared start, traversal, and end. The canonical set, grounded in the shipped flow harness:

```
TABLE 37-C — The canonical flow threads

Flow          Start                  Traversal                                        End
bootstrap     process start          full 18-stage bootstrap → live service registry  serving
command       booted runtime         gateway event → router → middleware → engine     rendered reply
component     booted runtime         interaction → component registry → re-check      rendered reply
module        booted runtime         tier-volume discovery → registry → MDIS install  installed
subsystems    booted runtime         event bus · queue · cache · renderer · HTTP      observed
shutdown      booted runtime         serving → 9-step shutdown → closed               not serving
```

Each flow is registered machine-readably in `contracts/flow-suite.json`; that contract is the
single source for the flow registry, and this table restates it for the reader.

### 37.11 What the Flow Suite Asserts

Each thread asserts four properties at once, on the real wiring:

- **Coordination.** The parts that must act in order do so in order — the middleware chain in its
  priority sequence, the bootstrap stages in their fixed sequence, the shutdown steps in theirs.
- **Compatibility.** Cross-boundary contracts hold at runtime: a module that declares a
  dependency resolves it; an event carries a catalogued name; a port answers where the
  specification says it does.
- **Integration.** A change in one file is observed by the files that consume it, end to end, on
  a realistic use-case path rather than a synthetic unit.
- **Environment.** The booted process, its ports, its database, and its teardown are checked as
  one environment — not each in isolation.

Because the thread runs the real wiring, it is also where the corpus's honesty rule becomes
executable: a divergence recorded in `status/code-reconciliation.json` between a specification
claim and the code is exercised by the flow that owns that edge, so the gap is observed rather
than smoothed over.

### 37.12 Test-Suite Composition Policy

The flow suite changes what the suite is *for*, not whether isolation is tested:

- **Isolation stays.** The unit and integration tiers remain, and the per-layer coverage floors
  of TABLE 37-B are unchanged; a class is still tested alone before it is tested in a thread.
- **One-shot isolated files are retired, not the isolation tier.** A test file that exercises a
  single class with no cross-boundary assertion and no place in a flow is superseded by the flow
  that covers its edge; it is retired rather than accumulated.
- **The flow spine is mandatory for cross-boundary change.** A change that touches a seam — a
  middleware stage, a contract, a bootstrap stage, a tier boundary — is complete only when the
  flow that traverses that seam passes.
- **No parallel authority.** A second, redundant flow harness is a defect; there is one flow
  spine, as there is one of everything else.

### 37.13 How To Verify This Section Against the Code

- The flow harness and environment: `apps/main/tests/flow/harness.ts`,
  `apps/main/tests/flow/flow-env.ts`.
- The canonical flows: `apps/main/tests/flow/bootstrap.flow.test.ts`,
  `apps/main/tests/flow/command.flow.test.ts`, `apps/main/tests/flow/component.flow.test.ts`,
  `apps/main/tests/flow/module.flow.test.ts`, `apps/main/tests/flow/subsystems.flow.test.ts`,
  `apps/main/tests/flow/shutdown.flow.test.ts`.
- The flow registry contract: `contracts/flow-suite.json`.

Divergences are recorded in `status/code-reconciliation.json`.

## Contract
None (conceptual).

## Acceptance
```acceptance
- id: ACC-LIFE-0037-1
  check: "The four-tier test pyramid (unit/integration/smoke/E2E) exists with the documented per-layer coverage floors"
  test: tests/ci/coverage-floors.spec.ts
- id: ACC-LIFE-0037-2
  check: "The ecosystem flow suite is specified as a bootstrap→shutdown coordination spine with a canonical, machine-readable flow registry"
  test: apps/main/tests/flow/bootstrap.flow.test.ts
```

## Edges (-> blueprint)
- SPEC-07-LIFECYCLE -> orchestration/ (build pipeline)
- SPEC-07-LIFECYCLE -> SPEC-06-OPERATIONS (runbooks + SLOs)

## Named entities

**classes, interfaces & symbols:** `Alertmanager`, `Expanded`, `Grafana`, `MockGatewayAdapter`, `shardCount`

**config/env constants:** `CORE_TOKENS`

**files & artifacts:** `gateway.live-adapter.ts`, `src/shared/testing/fixtures/`, `apps/main/tests/flow/`, `contracts/flow-suite.json`
