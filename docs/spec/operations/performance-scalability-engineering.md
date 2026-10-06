---
id: SPEC-06-OPERATIONS-0033
title: 33. Performance & Scalability Engineering
kind: spec
status: normative
version: 5.0.0
authority_scope: [06-operations]
anchors: [PERFORMANCE_SCALABILITY_ENGINEERIN, SHARDING_MODEL, ZERO_DOWNTIME_ROLLING_UPDATES, DESIGN_CONSIDERATION_IN_CLUSTER, DESIGN_CONSIDERATION_CONFIGURATION, DESIGN_CONSIDERATION_DB_POOL, ADAPTIVE_HORIZONTAL_SCALING, DATABASE_PERFORMANCE_PRACTICES, DESIGN_CONSIDERATION_ROLLBACK_COMP, SERVICE_LEVEL_OBJECTIVES_ALERTING, DUPLICATE_SOURCE_DETECTION, HOT_PATH_OPTIMIZATION]
contracts: [contracts/errors.json]
acceptance: [ACC-OPS-0033-1, ACC-OPS-0033-2]
owners: [framework-maintainers]
last_verified_commit: null
review_state: pending-evidence
---

## 33. Performance & Scalability Engineering

**Status:** [SPEC]

### 33.1 Sharding Model

The shard topology, the assignment formula, and cross-shard coordination are specified in full
at §6.5 and §26.3–§26.4. Each pod carries a contiguous shard range sized to stay clear of
Discord's per-shard gateway rate limits, and no application code assumes an unsharded topology
— the shard id is always populated on the command context.

### 33.2 Zero-Downtime Rolling Updates

A core deployment uses a rolling-update strategy of `maxUnavailable: 0` / `maxSurge: 1`:
capacity never drops below the pre-update pod count, and at most one extra pod exists
temporarily. A rollout progress deadline triggers **automatic rollback** when the new pod
fails health checks within the deadline, rather than pausing for manual intervention.

```
DIAGRAM 33-A — Rolling update sequence, per replaced pod

new pod scheduled (surge; N+1 momentarily)
  → new pod runs bootstrap Stages 01–18 including the FULL module load and onReady cycle
  → new pod's readiness returns 200
  → the orchestrator adds the new pod to the service endpoint list
  → the orchestrator sends SIGTERM to ONE old pod
  → the old pod executes the full 9-step graceful shutdown, releasing its shard-ownership
    locks explicitly at Step 01
  → the new pod's shard-claim retry (polling every SHARD_LOCK_RETRY_MS) succeeds the
    moment the old pod's lock releases (no unowned gap)
  → the old pod exits; count returns to N
```

The shard-ownership lock model (§26.4) is a hard prerequisite for this strategy to be safe:
there is never a window where both pods believe they own the same shard simultaneously.

**Deployment DAG order.** Migrations (expand-only) first, then worker workloads, then the main
bot workloads, then persona workloads, and post-rollout reconciliation last. The Release
Manager renews its Redis core-release lease every 10 seconds with a 30-second TTL, and monotonic
fencing tokens prevent stale instructions during a core release.

### 33.3 Adaptive & Horizontal Scaling

```
TABLE 33-A — Scaling targets by component

Bot pods (gateway-connected)
    a blend of CPU utilization and shard count per pod — CPU alone under-signals load for
    a mostly I/O-bound workload, so shard count acts as a floor ensuring scale-out keeps
    pace with guild growth
Dedicated worker pods
    queue depth — a backing-up queue is a more direct capacity signal than CPU for an
    I/O-bound job workload
HTTP server (if deployed separately)
    request rate and P95 latency on the listener
```

### 33.4 Database Performance Practices

Connection pooling bounds concurrent connections per pod. The fleet-wide connection budget
must satisfy `max_pods × pool_max × 1.2 + 20 ≤ PostgreSQL max_connections`; the pool size is
tuned down as pod count scales up, and a connection pooler in transaction mode fronts
PostgreSQL. An autoscaler pod ceiling is derived from this formula. A statement timeout
(default 10 seconds) prevents one runaway query from holding a connection indefinitely. Every
module-owned table's migrations are expected to include the indexes its known query patterns
require — index coverage for hot query paths is a standard code-review checklist item.

### 33.5 Service Level Objectives & Alerting Thresholds

```
TABLE 33-B — SLO reference

Signal                                              Target    Warn       Critical
Command P95 end-to-end latency (all tiers blended)  < 3000 ms ≥ 3000 ms  ≥ 5000 ms
Unexpected error rate                               < 2%      ≥ 2%       ≥ 5%
Cache hit ratio (Standard/Marketplace tier)         > 70%     ≤ 70%      ≤ 50%
Cache hit ratio (Core tier)                         > 95%     ≤ 95%      ≤ 85%
Queue depth (any queue, sustained trend)            draining  growing    approaching
                                                    in minutes over 15 min saturation
Redis availability                                  99.9%     any blip   sustained outage
```

Every threshold maps to a Prometheus alerting rule built on the metric families of §27.3, and
every threshold is a measured, tunable quantity tracked in CI against the release corpus,
restated in measured form, and adjusted by evidence rather than assertion (ADR-007). No target
is an absolute guarantee.

### 33.6 Hot Path Optimization

The command dispatch hot path — between the interaction arriving and a handler beginning — is
held to the tightest discipline. Three properties: the module-active check and every
middleware-layer config lookup read through the L1 in-process cache in the overwhelming
majority of cases; the command registry's map-based lookup is O(1); and the Core tier's
deliberate skip of the RBAC layer removes a resolution step. Worker-thread offloading moves
CPU-heavy work off the event loop.

### 33.7 Duplicate Source Detection

The upload handler detects when a developer uploads the exact same source archive twice: on
upload it computes a source-archive hash and looks it up against the builds table, responding
"This source has already been built as build id X" on a match (policy may still assign a new
build id).

### 33.8 How To Verify This Section Against the Code

- The autoscaler and queue-depth metric: `apps/main/src/queue/autoscaler.ts`,
  `src/metrics/registry.ts`.
- The pool and replica configuration: `apps/main/src/config/env.schema.ts`,
  `src/db/client.ts`.
- The deployment manifests: `apps/main/deploy/k8s/base/` (HPA, deployment, probes).

Divergences are recorded in `status/code-reconciliation.json`.

## Contract
- `contracts/errors.json`

## Acceptance
```acceptance
- id: ACC-OPS-0033-1
  check: "SLOs hold: 99.5% availability; 95% of commands <200 ms; 95% of events within 100/500 ms by tier"
  test: tests/perf/slo.spec.ts
- id: ACC-OPS-0033-2
  check: "Event-loop lag triggers load shedding under pressure"
  test: tests/integration/event-loop-shedding.spec.ts
```

## Edges (-> blueprint)
- SPEC-06-OPERATIONS -> all departments (observability + errors are cross-cutting)
- SPEC-06-OPERATIONS#SECURITY -> SPEC/00-GOVERNANCE (secrets, ban registry enforcement)

## Named entities

**classes, interfaces & symbols:** `Diffing`, `buildId.`, `builds.sourceArchiveHash`, `configmap-patcher.ts`, `dumby-config-diff.ts`
**files & artifacts:** `config/configmap-patcher.ts`, `config/dumby-config-diff.ts`

