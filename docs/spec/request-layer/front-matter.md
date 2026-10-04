---
id: SPEC-04-REQUEST-LAYER-0000
title: Front Matter
kind: spec
status: normative
version: 5.0.0
authority_scope: [orientation]
anchors: [CONTRACT, ACCEPTANCE, EDGES_BLUEPRINT]
contracts: [contracts/rbac.enums.json, contracts/commands.json, contracts/ui-renderer.schema.json, contracts/events.catalog.json]
acceptance: [ACC-REQ-0000-1]
owners: [framework-maintainers]
last_verified_commit: null
review_state: pending-evidence
---

# DUMBY — End-User Application Reference

## Contract
- `contracts/rbac.enums.json`
- `contracts/commands.json`
- `contracts/ui-renderer.schema.json`
- `contracts/events.catalog.json`

## Acceptance
```acceptance
- id: ACC-REQ-0000-1
  check: "The interface reference identity block states version 5.0.0 and its presentation-authority scope"
  test: tests/docs/interface-identity.spec.ts
```

## Edges (-> blueprint)
- SPEC-04-REQUEST-LAYER -> SPEC-02-ARCHITECTURE (dispatch enters the core runtime)
- SPEC-04-REQUEST-LAYER#RENDERER -> documentation/ (every surface is renderer-issued)
