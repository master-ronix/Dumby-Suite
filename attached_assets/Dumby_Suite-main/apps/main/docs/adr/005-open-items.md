# ADR 005 — Inherited Open Items

**Status:** Open  
**Date:** 2026-07-28  

---

This ADR records the two open items explicitly called out in `master-prompt.md §8.3`
as inherited from the blueprint that this build does NOT resolve.

---

## Open Item 1 — No Runtime Sandbox for Third-Party Module Code

**Problem:** The module system allows third-party developers (Swastik ecosystem) to ship modules that run inside the main bot process. There is currently no VM sandbox, Worker Thread isolation, or capability-based restriction on what a module's `onLoad`/`onReady`/`onUnload` hooks can do. A malicious or buggy module can access `process.env`, call `process.exit()`, import arbitrary packages, or crash the process.

**Mitigations in place:**
- The `no-direct-process-env` ESLint rule prevents accidental env access in first-party modules.
- Manifest validation (Zod schema) and tier rules (`tier-rules.ts`) limit what a module can declare.
- All modules must be registered in `register-all.ts` — no dynamic `require()/import()` of unknown paths.
- The Swastik build pipeline (Tier 3) is intended to run a static analysis gate before a module build is promoted.

**What's missing:** Runtime enforcement. Node.js `vm` contexts are leaky; the correct solution is Worker Thread isolation with a message-passing interface, which is a significant architectural change.

**Resolution path:** Design a `ModuleWorkerHost` that runs each module in a dedicated Worker Thread and communicates via a well-typed IPC protocol. This is a Tier-1 feature for V2.

---

## Open Item 2 — BullMQ Single-Point-of-Failure

**Problem:** The queue subsystem uses a single Redis instance for BullMQ. If that Redis goes down, the entire job queue stops. The autoscaler (`queue/autoscaler.ts`) can scale workers but cannot survive a Redis outage.

**Mitigations in place:**
- The `FallbackRateLimiter` pattern shows that we know how to degrade gracefully; the same approach applies to the queue.
- BullMQ supports Redis Sentinel and Redis Cluster — the connection config just needs to be updated.

**What's missing:** Redis Sentinel/Cluster config, a durable fallback queue (e.g. PostgreSQL-backed), and circuit-breaker wrapping around queue enqueue operations.

**Resolution path:** Move `QUEUE_REDIS_URL` to a Redis Sentinel URL format and add a `pg-boss` or similar PostgreSQL-backed fallback queue that activates when BullMQ's Redis is unreachable.

---

## See Also

- ADR 004 (three-tier scope — these items live in Tier 3 or V2)
- `master-prompt.md §8.3`
