# Migration Ledger — v5.0.0 Re-Baseline

> This file is the single source of truth for migration progress. The agent reads it at
> the start of every session and updates it at the end of every item and slice. An item
> without a record here did not happen; an IN-PROGRESS item with a resume note is
> continued, never restarted. A closed request row without its change-log line (rule R11)
> did not happen either.

- **Created:** <date>
- **Last updated:** <date> · **Current item:** <id> · **Next action:** <one line>
- **Protocol:** `docs/migration-prompt.md` v5.2.0 (R1–R12)
- **Coverage map:** 121 request rows (UR-20260918-001 §8.1.2) → one owning item each, per the prompt's §3.0
- **Record shapes:** `docs/migration/ledger-template.md` §3 (item) and §4 (slice)
- **Reconciliation:** <pending>

---

## Summary

| Item | Title | Status |
|------|-------|--------|
| M0 | P0 security flaws | NOT STARTED |
| M1 | Tier volumes & blind discovery | NOT STARTED |
| M2 | Unified command tree | NOT STARTED |
| M3 | Core Renderer, buffer-then-render, embed ban | NOT STARTED |
| M4 | RBAC Layer 6/7 redesign | NOT STARTED |
| M5 | License machine, Compatibility Ledger, Deployment Records | NOT STARTED |
| M6 | Swastik promotion pipeline | NOT STARTED |
| M7 | Twill persona model | NOT STARTED |
| M8 | Envelope encryption | NOT STARTED |
| MR-1 | hello-world module rewrite (Standard-tier) | NOT STARTED |
| MR-2 | health module rewrite (Core-tier) | NOT STARTED |
| MR-3 | browse module rewrite (Core-tier) | NOT STARTED |
| MR-4 | queue module rewrite (Core-tier) | NOT STARTED |
| MR-5 | persona module rewrite (Core-tier) | NOT STARTED |
| MR-6 | permit module rewrite (Core-tier) | NOT STARTED |
| MR-7 | modules module rewrite (Core-tier) | NOT STARTED |
| MR-8 | dashboard module rewrite (Core-tier) | NOT STARTED |
| M9 | Remaining implementation-flaw corrections | NOT STARTED |
| M10 | Terminology & legacy-name sweep | NOT STARTED |
| M11 | Convergence pass | NOT STARTED |

Statuses: `NOT STARTED` → `IN-PROGRESS` → `DONE` / `BLOCKED` / `SKIPPED (reason)`.

---

## Item Records

<!-- One §3 item-record per item (shape: docs/migration/ledger-template.md §3), added as work proceeds. -->

---

## Slice Records

<!-- One §4 slice-record per slice, added as work proceeds. -->

---

## Findings & Deviations Register

<!-- Numbered findings and logged deviations, added as they arise. -->
