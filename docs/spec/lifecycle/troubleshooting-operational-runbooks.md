---
id: SPEC-07-LIFECYCLE-0043
title: 43. Troubleshooting & Operational Runbooks
kind: spec
status: normative
version: 5.0.0
authority_scope: [07-lifecycle]
anchors: [TROUBLESHOOTING_OPERATIONAL_RUNBOO, RUNBOOK_STARTUP_FAILURE, RUNBOOK_HIGH_ERROR_RATE, RUNBOOK_SHARD_DISCONNECT, RUNBOOK_MEMORY_GROWTH, RUNBOOK_SLOW_COMMAND, GENERAL_INCIDENT_RESPONSE_PRINCIPL, 43_ADDITION_KNOWN_FAILURE, 43_ADDITION_PER_LAYER, RELEASE_MANAGER_SERVER_SIDE, DEVELOPER_REGISTRATION_LICENSING_D, DISCORD_API_429_HANDLING]
contracts: []
acceptance: [ACC-LIFE-0043-1]
owners: [framework-maintainers]
last_verified_commit: null
review_state: pending-evidence
---

## 43. Troubleshooting & Operational Runbooks

**Status:** [SPEC]

### 43.1 Runbook: Startup Failure

**Symptom.** A pod fails to reach ready; `/health/startup` never returns 200.

1. Check the pod logs for the **last bootstrap stage name logged** — the stage name *is* the
   diagnosis. Stage 02 = a config problem; Stage 05/07 = database/Redis reachability;
   Stage 11/12 = a manifest or module-code problem from a recent change.
2. A Stage 02 (config load) failure → read the Zod field-level error directly; it names the
   exact variable and constraint.
3. A Stage 05/07 (database/cache connect) failure → verify network policy, credentials, and
   target reachability — not a code bug in the overwhelming majority of cases.
4. A Stage 11 (module validate) failure → the error names the offending module and the specific
   manifest field or dependency-cycle path; almost always traceable to whatever module changed
   most recently.
5. A Stage 12 (module load) failure on a required module → check whether the module's required
   flag is still accurate; a module that should not be able to take down the whole process is a
   design smell.

### 43.2 Runbook: High Error Rate

**Symptom.** The unexpected-error rate crosses the warn or critical threshold.

1. Filter by module and command label on the error counter **first** — concentrated versus
   spread.
2. Concentrated in one module → check whether that module was part of the most recent hot-swap;
   the Swastik audit log is the fastest timing correlation.
3. Spread across everything → suspect a shared-infrastructure cause first: database, cache, or
   Redis reachability — not module code.
4. If a specific recent module version is implicated, the Power Engine's suspend-module or
   Swastik's rollback-version control is the fastest mitigation.
5. Filter on the operational flag specifically to separate "a lot of normal validation
   rejections" from "a lot of genuine bugs."

### 43.3 Runbook: Shard Disconnect

**Symptom.** The gateway-latency gauge for a specific shard goes stale or the shard stops
appearing in metrics.

1. Confirm scope **first** — one shard, every shard on one pod, or fleet-wide. One shard is
   likely a Discord-side gateway session issue (discord.js reconnection handles it); every
   shard on one pod is a pod-level network problem; fleet-wide is a Discord platform incident.
2. Check whether the affected shard's ownership lock is still held by the pod that should own
   it, or expired and unclaimed — a stuck, unclaimed lock after a pod crash is the failure mode
   to check.
3. If the lock is unclaimed and no pod is retrying acquisition, verify the retry loop is running
   rather than manually editing the lock — a manual edit risks the dual-ownership scenario the
   lock exists to prevent.
4. A single graceful pod restart is almost always sufficient and safer than any manual
   lock-table edit.

### 43.4 Runbook: Memory Growth

**Symptom.** Pod memory usage climbs steadily rather than reaching a stable steady state.

1. Distinguish a genuine leak from an under-provisioned L1 cache **first** — check the L1 size
   limits against the actual L1 size.
2. Check for an accumulating event listener — a module's `onLoad` registering an event-bus
   subscription without a matching removal in `onUnload` is the single most common actual leak
   source; it shows as memory growth correlating with module reload frequency, not steady
   request volume.
3. Check the worker-thread pool is not accumulating unreturned threads.
4. A heap-snapshot comparison across two points is the conclusive diagnostic — the framework
   specifies no bespoke memory-profiling tool; standard Node.js inspector tooling is the
   correct approach.

### 43.5 Runbook: Slow Command

**Symptom.** The command-duration P95/P99 for a specific command crosses the tier's target or
the blended SLO.

1. Check the database query-duration histogram filtered to this command's known query patterns
   **first** — a query crossing the slow or critical threshold is the most common root cause.
2. If no query is implicated, check whether the command recently lost defer-eligibility or
   gained a new synchronous external call (the circuit breaker is the fix if an external
   dependency is the culprit).
3. Check the relevant cache hit ratio for this command's tier — a drop concentrated around a
   specific key namespace is often a TTL set too short.
4. Check whether event-loop lag shedding is active — slowness may be a symptom of general
   process load.
5. Immediate mitigation: verify the command is marked defer-eligible.

### 43.6 General Incident Response Principles

**Scope before cause** — establish how widespread a symptom is before forming a theory; scope
alone usually eliminates most candidate explanations. **Mitigate before certainty** — restoring
user-facing stability and understanding root cause are separate goals, and the first should
never wait on the second when a fast safe mitigation (suspend, rollback, defer flag) is
available.

### 43.7 Runbook: Module Hot-Swap Failure

**Symptom.** A promoted module fails its post-swap self-health check.

1. The promotion is not "done" until the reloaded module reports healthy — a failed or timed-out
   check reverts the symlink to the preserved previous version and re-signals a reload
   automatically; confirm the rollback actually completed before intervening.
2. Read the self-check failure the developer received — the specific failing check is named,
   never a generic message.
3. If the rollback itself stalls, the completion criteria are: active symlink read-back, audit
   events per step, and alerting when a rollback fails — check each in order.

### 43.8 How To Verify This Section Against the Code

- The bootstrap stage list (the runbook's diagnostic anchor):
  `apps/main/src/bootstrap/stages.ts`.
- The shard-ownership lock: `apps/main/src/discord/shard-ownership.ts`.
- The event-loop lag monitor: `apps/main/src/events/event-loop-lag.ts`.
- The Swastik audit trail and promotion/rollback: `apps/main/src/module-system/promotion.ts`.

Divergences are recorded in `status/code-reconciliation.json`.

## Contract
None (conceptual).

## Acceptance
```acceptance
- id: ACC-LIFE-0043-1
  check: "The five documented operational runbooks exist and are executable"
  test: tests/ci/runbooks.spec.ts
```

## Edges (-> blueprint)
- SPEC-07-LIFECYCLE -> orchestration/ (build pipeline)
- SPEC-07-LIFECYCLE -> SPEC-06-OPERATIONS (runbooks + SLOs)

## Named entities (from the original reference)

The original reference named these entities in "43. Troubleshooting & Operational Runbooks". They are preserved here so no identifier is lost in the restructure.

**classes, interfaces & symbols:** `DumbyError-taxonomy`, `EventLoopLagMonitor`, `Three-stage`, `onLag`
