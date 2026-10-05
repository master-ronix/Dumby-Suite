# Runbook — Memory Growth

**Authority:** `docs/spec/lifecycle/troubleshooting-operational-runbooks.md` §43.4 (SPEC-07-LIFECYCLE).
**Symptom:** Pod memory usage climbs steadily rather than reaching a stable steady state.

## Steps

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

## Verify

- L1 cache: `apps/main/src/cache/l1-cache.ts`
- Event-loop lag monitor: `apps/main/src/events/event-loop-lag.ts`
