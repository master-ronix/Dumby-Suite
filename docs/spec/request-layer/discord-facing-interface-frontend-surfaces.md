---
id: SPEC-04-REQUEST-LAYER-0001
title: Discord-Facing Interface & Frontend Surfaces
kind: spec
status: normative
version: 5.0.0
authority_scope: [04-request-layer]
anchors: [DISCORD_FACING_INTERFACE_FRONTEND, VERSION_5_0_0, CONTRACT, ACCEPTANCE, EDGES_BLUEPRINT]
contracts: [contracts/rbac.enums.json, contracts/commands.json, contracts/ui-renderer.schema.json, contracts/events.catalog.json]
acceptance: [ACC-REQ-0001-1]
owners: [framework-maintainers]
last_verified_commit: null
review_state: pending-evidence
---

## Discord-Facing Interface & Frontend Surfaces

### Version 5.0.0 — Consolidated Re-Baseline

---

**Document type:** End-User Application Reference (frontend, Discord-facing interface, user interaction surfaces only)

**Project:** Dumby — Discord Unified Modular Bot System

**Version:** 5.0.0

**Applicable surfaces:** Discord slash commands, Discord Components V2 frames, interactive dropdown menus, buttons, modals, autocomplete, and the in-Discord navigation experience only. No web dashboard, Developer Portal, CLAI SSH terminal, Bull Board UI, HTML generator, or external web frontend is included in this reference.

**Core principle of this document:** Every surface defined below is issued by the core Renderer. Module authors declare command schemas; the Renderer derives the presentation, the components, and the flows. The Core Command Surface — `/dashboard`, `/health`, `/browse`, `/queue`, `/persona`, `/permit`, `/modules`, and `/hello` — is the reference implementation set for the grammar this document specifies.

**Relationship to engineering authority:** Where this reference defers to the engineering specification, it cross-references the blueprint (principally §4 Directives & Bans, §11.2 Module Manifest, §12 Authoring Package, §13 Tiers, §16.5 Renderer Service, §17 Command Framework, §20 Interaction & Component Handling, §21 Permission Engine, §22.6 Operator Terminal, §27 Audit & Telemetry, §28 Resilience, §35 Personas — Twill, §44 API Families) and the ADR series under docs/adr/. Implementation status for every capability specified here is tracked in the blueprint's audit register, not in this document.

---

## Contract
- `contracts/rbac.enums.json`
- `contracts/commands.json`
- `contracts/ui-renderer.schema.json`
- `contracts/events.catalog.json`

## Acceptance
```acceptance
- id: ACC-REQ-0001-1
  check: "The interface reference scopes itself to Discord-facing surfaces under the single Renderer"
  test: tests/docs/interface-scope.spec.ts
```

## Edges (-> blueprint)
- SPEC-04-REQUEST-LAYER -> SPEC-02-ARCHITECTURE (dispatch enters the core runtime)
- SPEC-04-REQUEST-LAYER#RENDERER -> documentation/ (every surface is renderer-issued)
