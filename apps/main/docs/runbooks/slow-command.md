# Runbook — Slow Command

**Authority:** `docs/spec/lifecycle/troubleshooting-operational-runbooks.md` §43.5 (SPEC-07-LIFECYCLE).
**Symptom:** The command-duration P95/P99 for a specific command crosses the tier's target or
the blended SLO.

## Steps

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

## Verify

- Slow-query logging: `apps/main/src/db/client.ts` (`SLOW_QUERY_THRESHOLD_MS`)
- Circuit breaker: `apps/main/src/resilience/circuit-breaker.ts`
