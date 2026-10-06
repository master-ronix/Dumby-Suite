# Runbook — Startup Failure

**Authority:** `docs/spec/lifecycle/troubleshooting-operational-runbooks.md` §43.1 (SPEC-07-LIFECYCLE).
**Symptom:** A pod fails to reach ready; `/health/startup` never returns 200.

## Steps

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

## Verify

- Stage list (diagnostic anchor): `apps/main/src/bootstrap/stages.ts`
- Health probes: `GET /health/startup`, `GET /health/liveness`, `GET /health/readiness`
