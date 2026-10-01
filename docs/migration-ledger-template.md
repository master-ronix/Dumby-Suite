# Migration Ledger — v5.0.0 Re-Baseline (Template & Record Shape)

> **READ THIS FIRST — THIS FILE IS NOT A LEDGER TO COPY.**
> The live, authoritative ledger is `migration-ledger.md` at the **repository root** — once it exists. The pre-5.1.0 session-generated ledger was retired from the repository on 2026-09-30 at the document set owner's direction (records recoverable in git history at commit `0c625c1`), so as of this revision no ledger is present. Per migration-prompt 5.2.0, the **first migration session** constructs a fresh `migration-ledger.md` from these record shapes, seeded with the §2 snapshot — entry by entry, never by copying this file wholesale. From then on you **resume** from the live ledger and never copy this file over it, re-initialize it, or rebuild it.
>
> This document defines two things: the **record shapes** every new ledger entry must follow (§3–§4), and a **dated snapshot of true state** (§2) — which is, until the fresh ledger is constructed, the state of record alongside the per-request record in `docs/change-log.md`. Once the ledger exists, it wins over this snapshot on any conflict; refresh the snapshot only when this template is revised.
>
> **UR 2.0 correction (01/10/2026).** The snapshot below was itself corrected: UR-20260918-001 revision 2.0 (the E1–E10 Conformance & Audit Evidence Set) found the state of record stale in **both** directions — the M0 tally was overstated, and M1–M9-shaped code already exists in the tree while the record says NOT STARTED. The snapshot now carries both facts, and the reconciliation gate (prompt R12 / §3.0.2) supersedes it: re-triage all 121 rows against the TREE before any M-item executes.
>
> Protocol: `docs/migration-prompt.md` **v5.2.0** (twenty-item work order, three blocks: M0–M8 → MR-1–MR-8 → M9–M11; rules R1–R12; slice mechanics §5; change-log protocol §6; reconciliation gate §3.0.2)

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
- Protocol: docs/migration-prompt.md v5.2.0 (R1–R12)
- Coverage map: 121 request rows (UR-20260918-001 §8.1.2) → one owning item each, per the prompt's §3.0
- Reconciliation: state of record re-triaged against the tree (prompt R12) — see the ledger's reconciliation block
```

---

## 2. Status Snapshot — TRUE STATE as of 2026-10-01 (UR 2.0 corrected)

This is the actual state of the migration. The 5.0.2-era template showed every item NOT STARTED (false since 2026-09-26); the 2.0 template showed M0 as 8 DONE (overstated); **UR 2.0 (01/10/2026) corrects both** — the M0 tally is 5 DONE / 9 PARTIAL / 3 OPEN, and M1–M9-shaped code exists in the tree while the record says NOT STARTED. Until a fresh ledger is constructed, this snapshot is the state of record; once constructed, the ledger is authoritative past this date.

| Item | Title | Status |
|------|-------|--------|
| M0 | P0 security flaws (17 severity-Critical suite rows) | **IN-PROGRESS** — slices 1–5 landed; tally corrected to **5 DONE / 9 PARTIAL / 3 OPEN**; slice 6 (last) next |
| M1 | Tier volumes & blind discovery | Record: NOT STARTED — **tree: shaped code present** (tier volumes, `packages/swastik`) — reconcile, R12 |
| M2 | Unified command tree | Record: NOT STARTED — **tree: shaped code present** (unified `src/commands`) — reconcile, R12 |
| M3 | Core Renderer, buffer-then-render, embed ban | Record: NOT STARTED — **tree: shaped code present** (`src/rendering/`) — reconcile, R12 |
| M4 | RBAC Layer 6/7 redesign | Record: NOT STARTED — reconcile against the tree, R12 (`src/permissions/` present) |
| M5 | License machine, Compatibility Ledger, Deployment Records | Record: NOT STARTED — **tree: shaped code present** (`src/licensing/`) — reconcile, R12 |
| M6 | Swastik promotion pipeline | Record: NOT STARTED — **tree: shaped code present** (`src/module-system/promotion.ts`) — reconcile, R12 |
| M7 | Twixter persona model | Record: NOT STARTED — **tree: shaped code present** (`src/personas/`) — reconcile, R12 |
| M8 | Envelope encryption | Record: NOT STARTED — **tree: shaped code present** (`src/crypto/envelope.ts`) — reconcile, R12 |
| MR-1 | hello-world module rewrite (Standard-tier) | Record: NOT STARTED — reconcile, R12; module sources live in `packages/modules/` (stubs today) |
| MR-2 | health module rewrite (Core-tier) | Record: NOT STARTED — reconcile, R12 |
| MR-3 | browse module rewrite (Core-tier) | Record: NOT STARTED — reconcile, R12 |
| MR-4 | queue module rewrite (Core-tier) | Record: NOT STARTED — reconcile, R12 |
| MR-5 | persona module rewrite (Core-tier) | Record: NOT STARTED — reconcile, R12 |
| MR-6 | permit module rewrite (Core-tier) | Record: NOT STARTED — reconcile, R12 |
| MR-7 | modules module rewrite (Core-tier) | Record: NOT STARTED — reconcile, R12 |
| MR-8 | dashboard module rewrite (Core-tier) | Record: NOT STARTED — reconcile, R12 |
| M9 | Remaining implementation-flaw corrections | Record: NOT STARTED — **tree: shaped code present** (M9-shaped items) — reconcile, R12 |
| M10 | Terminology & legacy-name sweep | NOT STARTED |
| M11 | Convergence pass | NOT STARTED |

Statuses: `NOT STARTED` → `IN-PROGRESS` → `DONE` / `BLOCKED` / `SKIPPED (reason)`. A record of NOT STARTED with shaped code in the tree is a **reconciliation finding**, not a green light to rebuild — see R12.

**M0 row board (17 P0 rows — the item's live triage):**

| Status | Rows |
|---|---|
| DONE (5) | UR-A-01, UR-A-02, UR-A-04, UR-B-06, UR-C-02 |
| PARTIAL, routed (9) | UR-A-03, UR-B-01, UR-B-02, UR-B-03, UR-C-01, UR-C-03, UR-C-04, UR-C-06, UR-C-07 |
| OPEN (3) | UR-B-04, UR-B-05, UR-C-05 — slice 6 scope, with the closable partials |

UR 2.0 §8.13.2 SC-01 reopened three rows from DONE to PARTIAL: **UR-B-01** (owner-approval workflow clause absent), **UR-B-03** (bind-host coverage 4/8 surfaces), **UR-C-06** (CLAI connection/byte limits absent). Tally: **5 DONE / 9 PARTIAL / 3 OPEN**.

**Slice map (M0):** slice 1 = admin surface auth (UR-A-01, UR-B-03, UR-B-06) · slice 2 = loader path containment + manifest/directory match (UR-B-02, UR-C-01, loader half of UR-C-07) · slice 3 = honest 501 on fake successes (UR-A-04) · slice 4 = fail closed on unknown module tier (P0 clause of UR-A-03) · slice 5 = Swastik internal-surface auth (UR-C-02) · slice 6 (next, last) = provenance, ownership, credentials (UR-B-04, UR-B-05, UR-C-05 + closable partials).

**Landing:** slices 1–5 committed on `feature/dev` in commit `0c625c1` (2026-09-29). Last verified state: **75 files / 876 tests green** (three consecutive clean full runs); `typecheck` + `lint` + `format` + `test:coverage` clean. **Do not start M1** until M0 is DONE.

**Change-log status:** slices 1–5 were landed before rule R11 existed and carried no change-log lines; they have been backfilled in `docs/change-log.md` (v5.0.0 implementation track) — first at the 5.1.0 revision, then corrected by UR 2.0 §8.13.2 SC-01 (the three reopened rows). Every slice closed from now on writes its lines at close time (prompt §6).

**State-of-record reconciliation (UR 2.0 §8.13.2; prompt R12):** before any M-item executes, the fresh ledger must record — (a) all 121 rows re-triaged against the tree; (b) the M0 correction (5/9/3); (c) the ahead-of-record M1–M9-shaped work, each with its R11 line marked **PRESENT IN TREE (uncredited pending UR §8.1.3 #19)**; (d) the SC-04 line-count corrections (blueprint 13,139; concept 581) and the CF-22 "DRM" fix. Crediting ahead-of-record work as DONE/PARTIAL is the open policy question (UR §8.1.3 #19) — record, never assume.

---

## 3. Item Record Shape (one per item, M0–M11 and MR-1–MR-8)

Every item record in the live ledger carries ALL of these fields — the six-field 5.0.2 shape was thinner than the records the migration actually writes, and a record that cannot hold the truth gets silently abbreviated. Blank lines are placeholders, not optional fields.

```markdown
### <ID> — <Title>

- **Status:** NOT STARTED | IN-PROGRESS | DONE | BLOCKED | SKIPPED (reason)
- **Started:** <date> · **Completed:** <date or —>
- **Request rows owned (from the coverage map, prompt §3.0):** <UR §8.1.2 row numbers + request IDs>
- **Evidence references (UR 2.0 §8.13):** <CF / SC / UB / TU ids that touch this item — the conformance findings it must answer>
- **Source of truth read:** <documents, sections, ADRs — with the date read>
- **Blast radius (declared before editing — R2):** <exact files/directories; everything else read-only>
- **Row triage (tree-vs-UR, before editing):** <per row: DONE / PARTIAL / OPEN against the tree,
  not the UR document — the UR is a frozen provenance record>
- **Tree state (R12 reconciliation):** <per row: DONE / PARTIAL / PRESENT-IN-TREE / ABSENT, with the
  file/test evidence that proves it — the tree, not this snapshot, is the source of truth>
- **Ahead-of-record work (UR 2.0 SC-02):** <implementations found in the tree before the record;
  R11 lines written marked PRESENT IN TREE (uncredited pending UR §8.1.3 #19)>
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

> Any action taken under this migration that the migration prompt's rules R1–R12 would not cover. Deviations must be recorded here, never silent.

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
| 2.1 | 2026-10-01 | Dumby Core Engineering | Conformance-reconciliation revision for protocol 5.2.0 (UR-20260918-001 rev 2.0, the E1–E10 evidence set): snapshot corrected in both directions — M0 tally 5 DONE / 9 PARTIAL / 3 OPEN (UR-B-01/UR-B-03/UR-C-06 reopened), and M1–M9 marked "record: NOT STARTED — tree: shaped code present" for reconciliation; reconciliation gate and evidence-corpus references added (R12, §3.0.1/§3.0.2); item record shape extended with Evidence references, Tree state, and Ahead-of-record fields; deviation rule range widened to R1–R12 |
