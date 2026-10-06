---
id: DOC-FEAT-DATA-AND-STATE
title: Data & State
kind: documentation
status: derived
version: 5.0.0
authority_scope: [features]
contracts: []
acceptance: []
owners: [framework-maintainers]
last_verified_commit: null
review_state: pending-evidence
---

# Data & State

**PostgreSQL is the sole system of record; Redis accelerates and coordinates.** Any data whose
loss would be user-visible lives only in PostgreSQL. Redis carries the L2 cache, the job-queue
backing store, cross-shard pub/sub, and the shard-ownership locks — and is treated as a
first-class SLO target for exactly that reason. The data layer uses Knex directly, with no ORM:
repositories issue explicit, reviewable SQL.

**Three configuration scopes.** Process-core configuration (environment variables, validated at
boot), process-module configuration (a module's own prefixed variables, validated against its
own schema), and guild configuration (a per-guild JSONB document, mutable at runtime, validated
on every write).

**Two-tier caching.** Reads fall through L1 (in-process LRU, sub-millisecond) to L2 (Redis,
shared) to PostgreSQL, backfilling on the way out. Config-shaped data is write-through with
synchronous invalidation (the key is deleted, never merely overwritten); frequently-changing
aggregates use short TTLs; and cross-process invalidation is broadcast over Redis pub/sub.
Cache-miss thundering herds are guarded by a distributed lock plus probabilistic early refresh,
and negative results are cached with their own shorter TTL.

**No user-visible state lives in a single process.** Every pod can crash, restart, or be
replaced at any moment without a user noticing, which is the structural precondition for the
zero-downtime rolling update. Shard ownership is a Redis lock with a heartbeat and TTL, so
exactly one process holds each shard's gateway connection at a time.

See `spec/data/` §23–§26 and `contracts/config.schema.json`.
