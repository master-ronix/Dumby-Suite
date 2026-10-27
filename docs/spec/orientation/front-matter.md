---
id: SPEC-ORIENTATION-0000
title: Front Matter & Table of Contents
kind: spec
status: normative
version: 5.0.0
authority_scope: [orientation]
contracts: []
acceptance: [ACC-ORI-0000-1]
owners: [framework-maintainers]
last_verified_commit: null
review_state: pending-evidence
---

# DUMBY FRAMEWORK

**Document type** — Framework Engineering Reference (architecture, specification, and
illustrative fragments only; no shipping source code).
**Project** — Dumby: Discord Unified Modular Bot System.
**Version** — 5.0.0, the Consolidated Re-Baseline Edition (recorded in the change log).
**Stack** — TypeScript (strict mode) · Node.js LTS ≥ 22 · discord.js v14 · PostgreSQL ·
Redis · BullMQ · Fastify · Pino / Prometheus / OpenTelemetry.
**Scope** — Architecture · Design · Lifecycle · Infrastructure · Security · Operations ·
Module Catalog (illustrative examples) · Power Engine Panel · Administrative Interfaces.
**Classification** — Engineering Reference; implementation status is stated per section by
the status badges and the Implementation Status & Audit Register.
**Sections** — 48 numbered sections, plus Appendices A–C and the Implementation Status &
Audit Register. **Parts** — 0–IX (Part 0 is orientation; Parts I–IX carry the numbered
sections). **Catalogued module examples** — 22 (illustrative; none shipped).

**Edition note.** 5.0.0 is a consolidated re-baseline of the entire reference: the core
Renderer and buffer-embed presentation model (§20.8–§20.9), the RBAC Layer 6/7 redesign
(§21), tier volumes replacing the in-tree module layout (§7.3), the six-state licence
machine (§15.7), the Compatibility Ledger (§14.4), Global Data Emit as the fifth
cross-module pattern (§14.1), the Twill persona model (§35), and envelope encryption
(§32.7). The eleven cross-cutting decisions behind these changes are recorded as
ADR-001 … ADR-011 in `archive/v5.0.0-records/adr/`; the source request records are registered frozen in
`upgradation/`.

**How to navigate.** The corpus is three trees plus supporting directories:

- `blueprint/` — the **wiring**: how the parts connect, coordinate, stay compatible, and
  flow from the root of the system to the end-user surface, seen from every role.
- `documentation/` — the **nodes**: the wiki and the API book — what each part is.
- `spec/` — the **behavioural source**: what each mechanism must do, department by
  department.
- `contracts/` — machine-readable interfaces; `status/` — the ledgers; `archive/v5.0.0-records/adr/` — the
  decision records; `archive/` — the quarantined legacy reference.

The Table of Contents is the next file; the concept index and glossary are §0.3 and §47.

## Acceptance
```acceptance
- id: ACC-ORI-0000-1
  check: "The document identity block states type, project, version 5.0.0, stack, and scope"
  test: tests/docs/doc-identity.spec.ts
```
