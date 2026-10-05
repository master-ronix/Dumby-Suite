# Runbook — High Error Rate

**Authority:** `docs/spec/lifecycle/troubleshooting-operational-runbooks.md` §43.2 (SPEC-07-LIFECYCLE).
**Symptom:** The unexpected-error rate crosses the warn or critical threshold.

## Steps

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

## Verify

- Error metrics: `apps/main/src/metrics/registry.ts`
- Swastik audit trail: `apps/main/src/module-system/promotion.ts`
