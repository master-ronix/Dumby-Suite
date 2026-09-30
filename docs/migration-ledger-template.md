# Migration Ledger — v5.0.0 Re-Baseline (Template & Record Shape)

> **READ THIS FIRST — THIS FILE IS NOT A LEDGER TO COPY.**
> The live, authoritative ledger is `migration-ledger.md` at the **repository root** — once it exists. The pre-5.1.0 session-generated ledger was retired from the repository on 2026-09-30 at the document set owner's direction (records recoverable in git history at commit `0c625c1`), so as of this revision no ledger is present. Per migration-prompt 5.1.0, the **first migration session** constructs a fresh `migration-ledger.md` from these record shapes, seeded with the §2 snapshot — entry by entry, never by copying this file wholesale. From then on you **resume** from the live ledger and never copy this file over it, re-initialize it, or rebuild it.
>
> This document defines two things: the **record shapes** every new ledger entry must follow (§3–§4), and a **dated snapshot of true state** (§2) — which is, until the fresh ledger is constructed, the state of record alongside the per-request record in `docs/change-log.md`. Once the ledger exists, it wins over this snapshot on any conflict; refresh the snapshot only when this template is revised.
>
> Protocol: `docs/migration-prompt.md` **v5.1.0** (twenty-item work order, three blocks: M0–M8 → MR-1–MR-8 → M9–M11; rules R1–R11; slice mechanics §5; change-log protocol §6)

---

## 1. Header Block (the live ledger's opening matter)

```markdown
# Migration Ledger — v5.0.0 Re-Baseline

> This file is the single source of truth for migration progress. The agent reads it at
> the start of every session and updates it at the end of every item and slice. An item
> without a record here did not happen; an IN-PROGRESS item with a resume note is
> continued, never restarted. A closed request row without its change-log line (rule R11)
> did not happen either.

- Created: <date>
- Last updated: <date> · Current item: <id> · Next action: <one line>
- Protocol: docs/migration-prompt.md v5.1.0 (R1–R11)
- Coverage map: 121 request rows (UR-20260918-001 §8.1.2) → one owning item each, per the prompt's §3.0
```

---

## 2. Status Snapshot — TRUE STATE as of 2026-09-30

This is the actual state of the migration (replacing the 5.0.2-era template that showed every item NOT STARTED — false since 2026-09-26). Until a fresh ledger is constructed, this snapshot is the state of record; once constructed, the ledger is authoritative past this date.

| Item | Title | Status |
|------|-------|--------|
| M0 | P0 security flaws (17 severity-Critical suite rows) | **IN-PROGRESS** — slices 1–5 DONE; slice 6 (last) next |
| M1 | Tier volumes & blind discovery | NOT STARTED |
| M2 | Unified command tree | NOT STARTED |
| M3 | Core Renderer, buffer-then-render, embed ban | NOT STARTED |
| M4 | RBAC Layer 6/7 redesign | NOT STARTED |
| M5 | License machine, Compatibility Ledger, Deployment Records | NOT STARTED |
| M6 | Swastik promotion pipeline | NOT STARTED |
| M7 | Twixter persona model | NOT STARTED |
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

**M0 row board (17 P0 rows — the item's live triage):**

| Status | Rows |
|---|---|
| DONE (8) | UR-A-01, UR-A-02, UR-A-04, UR-B-01, UR-B-03, UR-B-06, UR-C-02, UR-C-06 |
| PARTIAL, routed (6) | UR-A-03, UR-B-02, UR-C-01, UR-C-03, UR-C-04, UR-C-07 |
| OPEN (3) | UR-B-04, UR-B-05, UR-C-05 — slice 6 scope, with the closable partials |

**Slice map (M0):** slice 1 = admin surface auth (UR-A-01, UR-B-03, UR-B-06) · slice 2 = loader path containment + manifest/directory match (UR-B-02, UR-C-01, loader half of UR-C-07) · slice 3 = honest 501 on fake successes (UR-A-04) · slice 4 = fail closed on unknown module tier (P0 clause of UR-A-03) · slice 5 = Swastik internal-surface auth (UR-C-02) · slice 6 (next, last) = provenance, ownership, credentials (UR-B-04, UR-B-05, UR-C-05 + closable partials).

**Landing:** slices 1–5 committed on `feature/dev` in commit `0c625c1` (2026-09-29). Last verified state: **75 files / 876 tests green** (three consecutive clean full runs); `typecheck` + `lint` + `format` + `test:coverage` clean. **Do not start M1** until M0 is DONE.

**Change-log status:** slices 1–5 were landed before rule R11 existed and carried no change-log lines; they have been backfilled in `docs/change-log.md` (v5.0.0 implementation track) as part of the 5.1.0 revision. Every slice closed from now on writes its lines at close time (prompt §6).

---

## 3. Item Record Shape (one per item, M0–M11 and MR-1–MR-8)

Every item record in the live ledger carries ALL of these fields — the six-field 5.0.2 shape was thinner than the records the migration actually writes, and a record that cannot hold the truth gets silently abbreviated. Blank lines are placeholders, not optional fields.

```markdown
### <ID> — <Title>

- **Status:** NOT STARTED | IN-PROGRESS | DONE | BLOCKED | SKIPPED (reason)
- **Started:** <date> · **Completed:** <date or —>
- **Request rows owned (from the coverage map, prompt §3.0):** <UR §8.1.2 row numbers + request IDs>
- **Source of truth read:** <documents, sections, ADRs — with the date read>
- **Blast radius (declared before editing — R2):** <exact files/directories; everything else read-only>
- **Row triage (tree-vs-UR, before editing):** <per row: DONE / PARTIAL / OPEN against the tree,
  not the UR document — the UR is a frozen provenance record>
- **Done-gate evidence (tests):** <proving tests, with the fail-before/pass-after revert experiment;
  which assertions are mechanism gates vs. no-regression controls; full-suite result>
- **Change-log entry recorded (R11):** <the line(s) written to docs/change-log.md for the rows
  this pass closed — DONE and PARTIAL-routed; "—" while none are closed yet>
- **What changed:** <prose record>
- **Judgment calls / deviations:** <numbered, cross-referenced to the Deviations register>
- **What was deliberately NOT done, with routing:** <residue and the item that owns it —
  PARTIAL rows name their dependency; nothing is silently dropped>
- **Resume note (if IN-PROGRESS):** <done / remaining / precise next step>
```

---

## 4. Slice Record Shape (for oversized items — see prompt §5)

Slices are recorded as `#### <Item> slice <n> — <title> (<rows>, <findings>) — DONE` blocks nested under the item record, in landing order. Each slice record carries:

```markdown
#### <Item> slice <n> — <title> (<request rows + findings covered>) — DONE

- **Blast radius (declared <date>, before any edit — R2):** <files; explicit read-only list too —
  the no-regression net is named, not implied>
- **Re-verified triage before editing:** <what the tree actually showed vs. what the ledger/UR
  predicted; corrections to earlier pointers recorded here — the tree is the source of truth>
- **What changed:** <numbered, concrete>
- **Done-gate evidence (tests):** <new assertions; the revert experiment (files stashed to HEAD →
  N failed → restore → all passed); honest limitations stated (structural vs. behavioral coverage)>
- **Judgment calls / deviations:** <numbered, with reasons, cross-referenced>
- **Slice status:** DONE · <Item> is still <status> — slices <n+1>…<m> outstanding
```

Standing slice constraints (earned during M0; carry them into every sliced item):

1. Run the full unit suite at the end of every slice — the targeted net has missed collateral three slices running.
2. Before writing a fail-open/fail-closed test, check whether something upstream already denies the case (e.g. a resolver layer-7 deny can mask the control under test); stub the surrounding engine so the control under test is the only thing that can deny.
3. A coarse revert experiment drags other slices' work in with it — decide up front which assertions are mechanism and which are intent.
4. Rows whose remedy depends on a later item's rows close PARTIAL with the dependency named — never out-of-order work (R4).
5. Entry points not behind the `isMainEntry` guard get structural (source-string) coverage only; their behavioral coverage waits for the guard's own row (UR-C-23, M9). Record the limitation; do not hang on open sockets.

---

## 5. Out-of-Scope Findings Register

> Every defect, compile error, or oddity noticed OUTSIDE the current item's blast radius. Recorded per migration-prompt rule R3. NEVER fixed inline (except one-line mechanical unblocks, which are logged as such).

| # | Date | Seen during | File / location | Finding | Belongs to item | Triage |
|---|------|-------------|-----------------|---------|-----------------|--------|
| — | — | — | — | — | — | — |

Triage values: `route-to-item` (reopen/attach a work-order item) · `backlog` (pre-re-baseline, unrelated) · `mechanical-unblock-done` (logged one-line fix).

---

## 6. Deviations

> Any action taken under this migration that the migration prompt's rules R1–R11 would not cover. Deviations must be recorded here, never silent.

| # | Date | Item | Deviation | Reason |
|---|------|------|-----------|--------|
| — | — | — | — | — |

---

## 7. Change-Log Discipline (R11 — how the lines are keyed)

Every request row that reaches DONE or PARTIAL-routed in a pass gets **one line** in `docs/change-log.md` under the *v5.0.0 implementation track — per-request record*, citing: the request ID, its UR §8.1.2 row number, the ledger item/slice, the one-clause record of the change, the status, and the proof. OPEN rows get no line until they close. Protocol revisions (this template, the migration prompt) are recorded as lines in the same section and in their own revision histories. M11's convergence gate reconciles the counts: ledger DONE/PARTIAL rows ↔ change-log lines ↔ the 121-row coverage map.

The master traceability index is and remains the frozen UR's own §8.1.2 table (`docs/ur/UR-20260918-001_Consolidated_Re-Baseline_Request.md`) — this ledger adds execution state on top of it; it never replaces it.

---

## Revision History of This Template

| Version | Date | Author | Change |
|---|---|---|---|
| 1.0 | 2026-09-24 | Dumby Core Engineering | Initial template shipped with migration-prompt 5.0.0 |
| 2.0 | 2026-09-30 | Dumby Core Engineering | Complete rewrite for protocol 5.1.0: withdrawn the copy-on-first-run role (the live ledger at the repository root is authoritative — resume it); the all-NOT-STARTED summary replaced with a dated true-state snapshot (M0 IN-PROGRESS, slices 1–5 DONE, P0 row board, slice map, landing commit); item record shape extended to the fields practice actually writes (rows owned, source-of-truth-read, row triage, change-log entry, deliberate-not-done-with-routing); slice record shape added with the five standing constraints; change-log discipline section added (R11); protocol path corrected (`docs/migration-prompt.md`, not `workspace/docs/…`) |
