---
id: SPEC-00-ORIENTATION-0001
title: Complete Engineering & Implementation Reference
kind: spec
status: normative
version: 5.0.0
authority_scope: [00-orientation]
contracts: []
acceptance: [ACC-ORI-0001-1]
owners: [framework-maintainers]
last_verified_commit: null
review_state: pending-evidence
---

## Complete Engineering & Implementation Reference

**Document type:** Framework Engineering Reference (no shipping source code — architecture, specification, and illustrative fragments only)
**Project:** Dumby — Discord Unified Modular Bot System
**Document Version:** 5.0.0 — Consolidated Re-Baseline Edition (record in change-log.md)
**Stack:** TypeScript (strict mode) · Node.js LTS ≥ 22 · discord.js v14 · PostgreSQL · Redis · BullMQ · Fastify · Pino/Prometheus/OpenTelemetry
**Scope:** Architecture · Design · Lifecycle · Infrastructure · Security · Operations · Module Catalog (Illustrative Examples) · Power Engine Panel · Administrative Interfaces
**Classification:** Engineering Reference — implementation status is stated per section by the status badges and the Audit Register
**Edition note:** 5.0.0 is a consolidated re-baseline of the entire reference: the core Renderer and buffer-embed presentation model (§20.8–§20.9), the RBAC Layer 6/7 redesign (§21), tier volumes replacing the in-tree module layout (§7.3), the six-state license machine (§15.7), the Compatibility Ledger (§14.4), Global Data Emit as the fifth cross-module pattern (§14.1), the Twill persona model (§35), and envelope encryption (§32.7). The eleven cross-cutting decisions behind these changes are recorded as ADR-001…ADR-011 (archive/v5.0.0-records/adr/); the three source request records are registered frozen under upgradation/.
**Sections:** 48 (numbered) + Appendices A–C + the Implementation Status & Audit Register · **Parts:** 0–IX (Part 0 is orientation; Parts I–IX carry the numbered sections) · **Cataloged Module Examples:** 22 (illustrative — none shipped)

---

## Acceptance
```acceptance
- id: ACC-ORI-0001-1
  check: "The document title matches the current reference (Dumby Framework, 5.0.0)"
  test: tests/docs/title.spec.ts
```
