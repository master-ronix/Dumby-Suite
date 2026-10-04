---
id: SPEC-04-REQUEST-LAYER-0002
title: TABLE OF CONTENTS
kind: spec
status: normative
version: 5.0.0
authority_scope: [04-request-layer]
anchors: [TABLE_OF_CONTENTS, DIVISIONS, CONTRACT, ACCEPTANCE, EDGES_BLUEPRINT]
contracts: [contracts/rbac.enums.json, contracts/commands.json, contracts/ui-renderer.schema.json, contracts/events.catalog.json]
acceptance: [ACC-REQ-0002-1]
owners: [framework-maintainers]
last_verified_commit: null
review_state: pending-evidence
---

## TABLE OF CONTENTS

### DIVISIONS

- Division 0 — System Overview & the Core Command Surface
- Division 1 — The Renderer: Presentation Authority
- Division 2 — Interaction Lifecycle: Buffer, Notices & Components
- Division 3 — Dashboard Home Page (Core Commands)
- Division 4 — /health Command (Health Module)
- Division 5 — /browse Command (Marketplace Module)
- Division 6 — /queue Command (BCCM Queue Module)
- Division 7 — /persona Command (Persona Module — Twill)
- Division 8 — /permit Command (RBAC Permission Module)
- Division 9 — /modules Command (Module Management Module)
- Division 10 — Hello World Standard-Tier Module
- Division 11 — Cross-Cutting UI Specifications

---

## Contract
- `contracts/rbac.enums.json`
- `contracts/commands.json`
- `contracts/ui-renderer.schema.json`
- `contracts/events.catalog.json`

## Acceptance
```acceptance
- id: ACC-REQ-0002-1
  check: "The divisions list matches the divisions present in `spec/request-layer/`"
  test: tests/docs/divisions-parity.spec.ts
```

## Edges (-> blueprint)
- SPEC-04-REQUEST-LAYER -> SPEC-02-ARCHITECTURE (dispatch enters the core runtime)
- SPEC-04-REQUEST-LAYER#RENDERER -> documentation/ (every surface is renderer-issued)
