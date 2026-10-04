---
id: SPEC-00-GOVERNANCE-0011
title: APPENDIX A — DIRECTIVE-TO-BLUEPRINT TRACEABILITY
kind: spec
status: normative
version: 5.0.0
authority_scope: [00-governance]
contracts: []
acceptance: [ACC-GOV-0011-1]
owners: [framework-maintainers]
last_verified_commit: null
review_state: pending-evidence
---

# APPENDIX A — DIRECTIVE-TO-BLUEPRINT TRACEABILITY

````
Directive part   Primary blueprint sections        Governs
──────────────────────────────────────────────────────────────────────
Part 1           §0.1–§0.4, §1–§4, ADR-001/ADR-002   Doctrine, principles,
                                                   non-goals, the Ban
                                                   Registry, deferred-
                                                   greenfield scope
Part 2           §5 (5.1–5.13)                    Stack & runtime
                                                   decisions, sole-logger
                                                   enforcement
Part 3           §6, §8, §9, §10, §23             Core architecture,
                                                   bootstrap, shutdown, DI,
                                                   environment-key policy
Part 4           §7, §11, §13–§18, ADR-004/005    Module system framework,
                                                   tier volumes, Swastik,
                                                   marketplace, the five
                                                   sanctioned patterns,
                                                   event-catalog enforcement
Part 5           §18–§25, §29–§30 (backend)       Middleware, permissions,
                                                   config, data, cache, jobs
Part 6           §15 (control-plane), §22, §35,   Power Engine, CLAI, Credentials,
                 ADR-008/ADR-011                   Release Manager,
                                                   Swastik, Twill personas
Part 7           §26–§28, §32–§34                 State, observability,
                                                   errors, security, perf,
                                                   privacy
Part 8           §37–§43, §45                     Testing, DX, workflow,
                                                   CI/CD hygiene, infra,
                                                   versioning, the
                                                   Compatibility Ledger,
                                                   compliance, acceptance
````

Excluded by charter: `spec/request-layer/` surfaces (Discord Components V2
presentation, dashboard navigation, banners), module-authoring guidance,
and the illustrative module catalog of blueprint Part VII.

Decision records: rules that cite an ADR are decided by the corresponding
record in `docs/adr/` (ADR-001…ADR-011).

## Acceptance
```acceptance
- id: ACC-GOV-0011-1
  check: "Every directive rule traces to a blueprint/spec section"
  test: tests/docs/directive-traceability.spec.ts
```
