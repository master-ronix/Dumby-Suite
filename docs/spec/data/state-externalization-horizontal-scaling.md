---
id: SPEC-05-DATA-0026
title: 26. State Externalization & Horizontal Scaling
kind: spec
status: normative
version: 5.0.0
authority_scope: [05-data]
anchors: [STATE_EXTERNALIZATION_HORIZONTAL_S, THE_CORE_CONSTRAINT, WHAT_LIVES_WHERE, CROSS_SHARD_COORDINATION, SHARD_OWNERSHIP_LOCK_MODEL, GRACEFUL_DEGRADATION_UNDER_PARTIAL, CONTRACT, ACCEPTANCE, EDGES_BLUEPRINT]
contracts: [contracts/config.schema.json]
acceptance: [ACC-DATA-0026-1, ACC-DATA-0026-2, ACC-DATA-0026-3]
owners: [framework-maintainers]
last_verified_commit: null
review_state: pending-evidence
---

## 26. State Externalization & Horizontal Scaling

**Status:** [SPEC]

### 26.1 The Core Constraint

No state whose loss or divergence would be user-visible is ever held only in a single
process's memory. Every pod in a deployment must be able to crash, restart, or be replaced
by an orchestrator at any moment without losing anything a user would notice — which is
possible only because everything that matters lives in PostgreSQL or Redis. This is the
structural precondition for the zero-downtime rolling update mechanism.

### 26.2 What Lives Where

```
TABLE 26-A — State placement reference

ALWAYS externalized (PostgreSQL or Redis)
  guild configuration; module enabled/disabled state; RBAC groups, sets, and grants;
  moderation cases, economy balances, every module's persisted business data; job queue
  state (BullMQ, Redis-backed); audit history; developer licensing and build records;
  shard ownership locks (Redis, with TTL)

NEVER externalized (process-local, genuinely disposable)
  L1 cache contents (a per-process accelerator over L2 — losing it costs one cache-miss
  round trip); in-flight command execution state (the interaction itself is re-deliverable
  by Discord if truly lost, though the shutdown drain step avoids this outright); worker
  thread pool state (rebuilt fresh on process start); metrics counters BEFORE their
  periodic scrape (Prometheus's pull model tolerates this)
```

The distinction is the whole discipline: the left column is what makes a pod disposable; the
right column is what a pod may keep for speed precisely because losing it is harmless.

### 26.3 Cross-Shard Coordination

`client.shard.broadcastEval` serializes a function and executes it across every shard in the
fleet, collecting results — powerful, but carrying meaningfully higher per-call latency. It is
reserved for low-frequency, operator-triggered needs: computing a fleet-wide guild count on
demand, or forcing a targeted diagnostic across every shard during an incident. **Redis
pub/sub** handles everything routine or high-frequency instead — cache-invalidation
broadcasts, cross-shard presence updates, and any other signal that must reach every pod but
cannot tolerate `broadcastEval`'s latency profile at volume.

### 26.4 Shard Ownership Lock Model

Exactly one process may hold the live gateway connection for a given shard id at any moment —
two processes connecting the same shard simultaneously risks duplicate event processing and
platform-level connection penalties. Ownership is tracked as a Redis key per shard id,
written with a TTL and refreshed on a heartbeat.

```
DIAGRAM 26-A — Shard ownership lock lifecycle

process starts, claims shard N → SET 'shard-lock:{N}' {processId} NX EX {ttl}
  ACQUIRED      → connect the gateway for shard N
  NOT ACQUIRED  → another live process owns shard N; do NOT connect; retry acquisition
                  every SHARD_LOCK_RETRY_MS (default 2000 ms) — the expected, normal
                  path during a rolling update's brief overlap window
→ heartbeat: refresh the lock's TTL every SHARD_LOCK_HEARTBEAT_MS (default 10,000 ms)
  for as long as this process holds the shard
→ graceful shutdown → lock released explicitly
  OR crash without releasing → the lock expires naturally once its TTL lapses, and
  another process's next retry succeeds
```

**Shard spawn configuration.** `SHARD_COUNT` and `SHARD_RANGE` are process-level
configuration: when the shard count exceeds one, the entrypoint parses the range (for example
`0-3` or `0,2,5`) and passes the shard list and shard count to the discord.js client options;
a malformed or out-of-range range — endpoints outside the valid span, reversed bounds,
non-numeric tokens — fails fast at Stage 02 with a Zod error. This is what makes the
rolling-update handoff safe: there is never a window where both pods believe they own the
same shard simultaneously.

### 26.5 Graceful Degradation Under Partial Outage

```
TABLE 26-B — Behaviour under each partial outage

Redis unreachable
    L2 cache and shard-lock heartbeats both fail. Cache reads fall through to PostgreSQL
    directly; shard locks fall back to their last-known TTL and expire naturally. A
    prolonged Redis outage eventually risks shard ownership ambiguity — which is why
    Redis availability is a first-class SLO target.

Read replica lagging beyond the max-lag threshold
    The router falls back to the primary automatically once polled lag exceeds the
    threshold — never silently serving stale reads past the configured tolerance.

One shard's gateway connection drops
    Isolated to that shard's guilds only — every other shard, and every other pod,
    continues normally; discord.js's own reconnection logic handles the resume in the
    common case.
```

### 26.6 How To Verify This Section Against the Code

- The shard-ownership lock: `apps/main/src/discord/shard-ownership.ts`.
- The shard-lock configuration: `apps/main/src/config/env.schema.ts`
  (`SHARD_COUNT`, `SHARD_RANGE`, `SHARD_LOCK_HEARTBEAT_MS`, `SHARD_LOCK_RETRY_MS`).
- The read-replica router: `apps/main/src/db/replica-router.ts`.
- The Redis lock store: `apps/main/src/cache/redis-lock-store.ts`.

Divergences are recorded in `status/code-reconciliation.json`.

## Contract
- `contracts/config.schema.json`

## Acceptance
```acceptance
- id: ACC-DATA-0026-1
  check: "No user-visible state lives only in process memory; all of it is in PostgreSQL or Redis"
  test: tests/integration/state-externalized.spec.ts
- id: ACC-DATA-0026-2
  check: "The shard-ownership lock prevents two shards holding the same connection"
  test: tests/integration/shard-ownership.spec.ts
- id: ACC-DATA-0026-3
  check: "Cross-shard coordination uses broadcastEval only for low-frequency ops; Redis pub/sub for high-frequency"
  test: tests/unit/cross-shard.spec.ts
```

## Edges (-> blueprint)
- SPEC-05-DATA -> SPEC-02-ARCHITECTURE (PostgreSQL system of record; Redis acceleration)
- SPEC-05-DATA -> SPEC-03-MODULES (each module owns its tables)

## Named entities

**classes, interfaces & symbols:** `Redis-`, `SHARD_COUNT-1`, `shardCount`, `DATABASE_REPLICA_`, `MAX_LAG_MS`
