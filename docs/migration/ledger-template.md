---
id: MIGRATION-LEDGER-TEMPLATE-MD
title: Migration Ledger Template
kind: engine
status: engine
version: 5.2.0
chain_role: ledger
preceded_by: migration/migration-prompt.md
change_log: upgradation/change-log.md
---

# Migration Ledger — v5.0.0 Re-Baseline (Template & Record Shape)

> This document defines the **record shapes** every new ledger entry must follow (§3–§4).
> It is a record-shape reference only — **never a ledger to copy**. The live, authoritative
> ledger is `migration-ledger.md` at the **repository root**; from it you resume, and never
> copy this file over it, re-initialize it, or rebuild it.

**When this template is used.** A live ledger is constructed only for a **State B (migration)**
run — that is, only when an active work order exists (at least one `upgradation/UR-*.md`, or
open items in the live ledger). With no work order, no ledger is built: the run is
**State C (enforcement)** and its artifact is the Gap Manifest at the repository root, not
this ledger.

---

## 1. Header Block (the live ledger's opening matter)

```markdown
# Migration Ledger — v5.0.0 Re-Baseline

> This file is the single source of truth for migration progress. The agent reads it at
> the start of every session and updates it at the end of every item and slice. An item
> without a record here did not happen; an IN-PROGRESS item with a resume note is
> continued, never restarted.

- Created: <date>
- Last updated: <date> · Current item: <id> · Next action: <one line>
- Protocol: <path> v<version>
- Coverage map: <n> request rows → one owning item each
- Record shapes: migration/ledger-template.md §3 (item) and §4 (slice)
- Reconciliation: <pending>
```

---

## 2. Status Snapshot

<!-- Snapshot of true state. Populate on first construction of the live ledger; refresh only
     when this template is revised. Once the ledger exists, it wins over this snapshot on any
     conflict. -->

| Item | Title | Status |
|------|-------|--------|
| <ID> | <Title> | <status> |

Statuses: `NOT STARTED` → `IN-PROGRESS` → `DONE` / `BLOCKED` / `SKIPPED (reason)`.

---

## 3. Item Record Shape (one per item)

Every item record in the live ledger carries ALL of these fields. Blank lines are
placeholders, not optional fields.

```markdown
### <ID> — <Title>

- **Status:** NOT STARTED | IN-PROGRESS | DONE | BLOCKED | SKIPPED (reason)
- **Started:** <date> · **Completed:** <date or —>
- **Request rows owned:** <row numbers + request IDs>
- **Evidence references:** <finding ids that touch this item>
- **Provenance of ahead-of-record work (if any):** <commit(s) or "none">
- **Source of truth read:** <documents, sections, ADRs — with the date read>
- **Blast radius (declared before editing — R2):** <exact files/directories; everything else read-only>
- **Row triage (tree-vs-UR, before editing):** <per row: DONE / PARTIAL / OPEN against the tree,
  not the UR document>
- **Tree state (R12 reconciliation):** <per row: DONE / PARTIAL / PRESENT-IN-TREE / ABSENT, with
  the file/test evidence that proves it>
- **Ahead-of-record work:** <implementations found in the tree before the record>
- **Done-gate evidence (tests):** <proving tests; the fail-before/pass-after revert experiment;
  which assertions are mechanism gates vs. no-regression controls; full-suite result>
- **Change-log entry recorded (R11):** <the line(s) written; "—" while none are closed yet>
- **What changed:** <prose record>
- **Judgment calls / deviations:** <numbered, cross-referenced to the Deviations register>
- **What was deliberately NOT done, with routing:** <residue and the item that owns it>
- **Resume note (if IN-PROGRESS):** <done / remaining / precise next step>
```

---

## 4. Slice Record Shape (for oversized items — see prompt §5)

Slices are recorded as `#### <Item> slice <n> — <title> (<rows>, <findings>) — DONE` blocks
nested under the item record, in landing order. Each slice record carries:

```markdown
#### <Item> slice <n> — <title> (<request rows + findings covered>) — DONE

- **Blast radius (declared before any edit — R2):** <files; explicit read-only list too>
- **Re-verified triage before editing:** <what the tree actually showed vs. what was predicted;
  corrections to earlier pointers recorded here>
- **What changed:** <numbered, concrete>
- **Done-gate evidence (tests):** <new assertions; the revert experiment; honest limitations>
- **Judgment calls / deviations:** <numbered, with reasons, cross-referenced>
- **Slice status:** DONE · <Item> is still <status> — slices <n+1>…<m> outstanding
```

Standing slice constraints:

1. Run the full unit suite at the end of every slice — the targeted net has missed collateral.
2. Before writing a fail-open/fail-closed test, check whether something upstream already denies
   the case; stub the surrounding engine so the control under test is the only thing that can deny.
3. A coarse revert experiment drags other slices' work in with it — decide up front which
   assertions are mechanism and which are intent.
4. Rows whose remedy depends on a later item's rows close PARTIAL with the dependency named —
   never out-of-order work (R4).
5. Entry points not behind the `isMainEntry` guard get structural coverage only; record the
   limitation; do not hang on open sockets.

---

## 5. Out-of-Scope Findings Register

> Every defect, compile error, or oddity noticed OUTSIDE the current item's blast radius.
> Recorded per migration-prompt rule R3. NEVER fixed inline (except one-line mechanical
> unblocks, which are logged as such).

| # | Date | Seen during | File / location | Finding | Belongs to item | Triage |
|---|------|-------------|-----------------|---------|-----------------|--------|
| — | — | — | — | — | — | — |

Triage values: `route-to-item` (reopen/attach a work-order item) · `backlog` (pre-re-baseline,
unrelated) · `mechanical-unblock-done` (logged one-line fix).

---

## 6. Deviations

> Any action taken under this migration that the migration prompt's rules R1–R12 would not
> cover. Deviations must be recorded here, never silent.

| # | Date | Item | Deviation | Reason |
|---|------|------|-----------|--------|
| — | — | — | — | — |

---

## 7. Change-Log Discipline (R11 — how the lines are keyed)

Every request row that reaches DONE or PARTIAL-routed in a pass gets **one line** in
`upgradation/change-log.md` under the *v5.0.0 implementation track — per-request record*,
citing: the request ID, its UR §8.1.2 row number, the ledger item/slice, the one-clause record
of the change, the status, and the proof. OPEN rows get no line until they close. Protocol
revisions are recorded as lines in the same section and in their own revision histories. M11's
convergence gate reconciles the counts: ledger DONE/PARTIAL rows ↔ change-log lines ↔ the
coverage map.

The master traceability index is and remains the frozen UR's own §8.1.2 table — this ledger
adds execution state on top of it; it never replaces it.

---

## Revision History of This Template

| Version | Date | Author | Change |
|---|---|---|---|
| — | — | — | — |
