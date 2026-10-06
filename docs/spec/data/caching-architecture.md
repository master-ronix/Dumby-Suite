---
id: SPEC-05-DATA-0025
title: 25. Caching Architecture
kind: spec
status: normative
version: 5.0.0
authority_scope: [05-data]
anchors: [CACHING_ARCHITECTURE, TWO_TIER_DESIGN, KEY_NAMESPACING_CONVENTION, INVALIDATION_STRATEGIES, STAMPEDE_PROTECTION, NEGATIVE_CACHING, OBSERVABILITY, CONTRACT, ACCEPTANCE, EDGES_BLUEPRINT]
contracts: [contracts/config.schema.json]
acceptance: [ACC-DATA-0025-1, ACC-DATA-0025-2, ACC-DATA-0025-3]
owners: [framework-maintainers]
last_verified_commit: null
review_state: pending-evidence
---

## 25. Caching Architecture

**Status:** [SPEC]

### 25.0 Redis High Availability — An Architectural Requirement

Redis serves as the L2 cache, the BullMQ queue backing store, the cross-shard pub/sub bus,
and the shard-ownership lock store — four critical coordination concerns in a single
service. For multi-pod production deployments, a **Redis HA topology** (cluster mode or
sentinel, managed or self-hosted) is a **mandatory architectural requirement**, with
documented failover behaviour, split-brain prevention, and an SLO target of Redis
availability **≥ 99.95%**. The graceful-degradation table covers transient outages; the HA
topology eliminates the persistent single-point-of-failure risk.

### 25.1 Two-Tier Design

```
DIAGRAM 25-A — The L1 / L2 cascade

request for key K
  → L1 — in-process LRU (CACHE_L1_MAX_ENTRIES=5000, CACHE_L1_MAX_BYTES=50 MB)
         sub-millisecond; scoped to ONE process — a fleet of N pods holds up to N
         independent copies of the same hot key (the deliberate trade: L1 optimizes
         single-process latency at the cost of instant fleet-wide consistency, which
         L2's invalidation broadcast bounds)
  → miss → L2 — Redis, shared fleet-wide
         single-digit-millisecond; one authoritative cached copy every pod reads
  → miss → origin — PostgreSQL (primary or replica, per the routing rules)
         populates L2, then L1, on the way back out
```

The cache manager exposes one unified API over both tiers — get, set, invalidate — so
calling code never manages L1 and L2 as two separate concerns.

### 25.2 Key Namespacing Convention

The pattern is `{domain}:{entity}:{identifier}[:{sub-scope}]`. Examples: `guild:config:{guildId}`,
`guild:module-state:{guildId}:{moduleSlug}`, `user:profile:{userId}`,
`economy:balance:{guildId}:{userId}`, `leaderboard:{guildId}:{period}`. Namespacing by domain
is what makes the `flushCacheNamespace` control domain a targeted, prefix-based invalidation
rather than an all-or-nothing flush.

### 25.3 Invalidation Strategies

```
TABLE 25-A — Invalidation approach by data shape

Config-shaped (guild config, module state)
    write-through with synchronous invalidation: the write transaction commits, THEN the
    cache key is DELETED (never merely overwritten — a deleted key forces the next read
    to repopulate from source)

Frequently-changing aggregate (leaderboards, usage counters)
    short, fixed TTL (seconds to low minutes), accepting brief staleness rather than
    paying the cost of invalidating on every contributing write

Cross-process invalidation (a write on Pod A must clear Pod B's and Pod C's L1 copy too)
    Redis pub/sub broadcasts an invalidation message every pod subscribes to, so other
    pods' L1 copies of the same key are cleared within one pub/sub round trip of the
    write, rather than waiting out L1's own TTL
```

### 25.4 Stampede Protection

Two complementary mechanisms guard against a cache-miss "thundering herd."

- **Mechanism 1 — distributed lock on a true miss.** A request hits an L2 miss, then attempts
  a short-TTL `SETNX` lock. If acquired, it computes the fresh value, populates the cache, and
  releases the lock. If not acquired, another process is already recomputing; the waiter
  polls briefly for the lock-holder to populate the cache, and if it is still empty after a
  bounded wait, proceeds to compute independently rather than block indefinitely.
- **Mechanism 2 — probabilistic early refresh** (avoids the miss entirely for a hot key under
  steady load). Every L2 read checks remaining TTL as a fraction of the original; if the
  remaining fraction is below **0.15**, it rolls against a **0.10** probability — a
  probabilistic hit triggers an asynchronous background refresh while still serving the
  current, not-yet-expired value to *this* request. Refreshes are smoothed across the entire
  window before expiry.

Mechanism 2 prevents most true misses for consistently hot keys; Mechanism 1 bounds the
damage on whatever miss still gets through.

```
DIAGRAM 25-B — The lock-holder-crash failure mode

If the lock holder crashes after acquiring the lock but before populating the cache, the
lock persists until its TTL expires. Concurrent waiters that exhaust their brief poll
MUST NOT fall back to independent computation — that produces N duplicate database
queries. They must continue to coalesce on the single in-flight recompute; the
fallback-to-compute path is permitted only after an explicit lease-expiry re-acquire,
never merely on poll timeout.
```

### 25.5 Negative Caching

A lookup that resolves to "does not exist" — a user record for someone who left the guild, a
case id that was never valid — is cached as an explicit negative result with its own, shorter
TTL rather than left uncached. The cache manager represents a negative result with a
dedicated sentinel value distinct from `null` (which means "not yet cached"), so a genuine
cache miss and a cached negative result are never confused.

### 25.6 Observability

Every cache operation increments a counter labelled by tier and result (hit, miss,
negative-hit), feeding the hit-ratio targets in the performance baselines and the alerting
rules.

### 25.7 How To Verify This Section Against the Code

- The two-tier cache manager and its key namespace:
  `apps/main/src/cache/cache-manager.ts`, `src/cache/key-namespace.ts`, `src/cache/l1-cache.ts`.
- The stampede guard and the Redis lock store:
  `apps/main/src/cache/stampede-guard.ts`, `src/cache/redis-lock-store.ts`.

Divergences are recorded in `status/code-reconciliation.json`.

## Contract
- `contracts/config.schema.json`

## Acceptance
```acceptance
- id: ACC-DATA-0025-1
  check: "Two-tier cache: in-process L1 LRU + shared Redis L2, behind the single CacheManager API"
  test: tests/unit/cache-cascade.spec.ts
- id: ACC-DATA-0025-2
  check: "Stampede protection and negative caching are active on L2 misses"
  test: tests/integration/cache-stampede.spec.ts
- id: ACC-DATA-0025-3
  check: "Multi-pod production requires a Redis HA topology (Cluster/Sentinel) with documented failover"
  test: tests/arch/redis-ha.spec.ts
```

## Edges (-> blueprint)
- SPEC-05-DATA -> SPEC-02-ARCHITECTURE (PostgreSQL system of record; Redis acceleration)
- SPEC-05-DATA -> SPEC-03-MODULES (each module owns its tables)

## Named entities

**classes, interfaces & symbols:** `ElastiCache`, `MemoryStore`, `Roll`, `STAMPEDE_EARLY_REFRESH_THRESHOLD`, `STAMPEDE_REFRESH_PROBABILITY`
**events & identifiers:** `negative_hit`

