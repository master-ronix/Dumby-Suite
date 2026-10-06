# Migration Ledger — v5.0.0 Re-Baseline

> This file is the single source of truth for migration progress. The agent reads it at
> the start of every session and updates it at the end of every item and slice. An item
> without a record here did not happen; an IN-PROGRESS item with a resume note is
> continued, never restarted.

- **Created:** <date>
- **Last updated:** <date> · **Current item:** <id> · **Next action:** <one line>
- **Protocol:** <path> v<version>
- **Coverage map:** <n> request rows → one owning item each
- **Record shapes:** <template path> §3 (item) and §4 (slice)
- **Reconciliation:** <pending>

---

## Summary

| Item | Title | Status |
|------|-------|--------|
| <ID> | <Title> | <status> |

Statuses: `NOT STARTED` → `IN-PROGRESS` → `DONE` / `BLOCKED` / `SKIPPED (reason)`.

---

## Item Records

<!-- One item-record per item (item record shape), added as work proceeds. -->

---

## Slice Records

<!-- One slice-record per slice, added as work proceeds. -->

---

## Findings & Deviations Register

<!-- Numbered findings and logged deviations, added as they arise. -->
