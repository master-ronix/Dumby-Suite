# DUMBY — Re-Baseline Migration Prompt

## Delta Execution Protocol: Drive the v5.0.0 Changes Into the Existing Codebase — Nothing Else

---

**Document type:** Migration Prompt — a scoped, delta-driven execution protocol. This is NOT the Master Build Prompt (`docs/master-prompt.md`, triggered via `docs/meta-prompt.md`). It does not audit the whole codebase and it does not drive everything to 100% spec compliance. It does exactly one thing: lands the v5.0.0 re-baseline deltas into the code, one item at a time, in a fixed order, with a ledger that survives across sessions and a change-log line for every request row it closes.

**Project:** Dumby — Discord Unified Modular Bot System

**Version:** 5.3.0 — evidence-extraction revision. Supersedes 5.2.0 in full (see §1.1–§1.3 and Appendix A). 5.2.0 absorbed UR 2.0 at the summary level (M0 tally corrected to 5 DONE / 9 PARTIAL / 3 OPEN; rule R12; `packages/modules/` home; MR-1 §10.10). 5.3.0 extracts the ten-document evidence set (E1–E10) finding-by-finding and lands the specifics this prompt was missing: the **provenance** of the ahead-of-record work (commits `d334cfb`/`581499e`, 2026-09-26; prior ledger removed at `9f7e427`), a per-item **tree-state evidence map** (§3.0.3) so the R12 re-triage starts from evidence rather than a blank sheet, the **true-unknowns register** (§3.0.4), the evidence classification matrix and the executed verification result (876/876 green), and the change-log debt for this prompt's own earlier versions.

**Derived from:** `docs/change-log.md` (the v5.0.0 entry and its per-request record discipline, plus the UR 2.0 implementation-track record), the frozen request record `docs/ur/UR-20260918-001_Consolidated_Re-Baseline_Request.md` **revision 2.0** (provenance, impact matrix, the 121-request master table at its §8.1.2, and the conformance-finding register at its §8.13), and `docs/blueprint.md` 5.0.0 (sole architectural authority). UR 2.0's evidence base — the ten-document Conformance & Audit Evidence Set (E1–E10, verified against `df1225e` and `0c625c1`) — is a registered verification record, not a source of new requests.

**When to use this prompt:** the codebase exists and was built against a spec version older than the documentation (typically v4.6.x). The docs have moved to v5.0.0. Your job is to migrate the code, not to re-audit or re-scaffold it.

**CURRENT STATE — read before anything else.** This migration is UNDERWAY, not starting, and **the state of record is stale in both directions** (UR 2.0 finding 17 / §8.13.2). M0 is IN-PROGRESS: slices 1–5 landed on `feature/dev` in commit `0c625c1` (2026-09-29), but the tally is **corrected to 5 DONE / 9 PARTIAL / 3 OPEN** — UR-B-01, UR-B-03 and UR-C-06 reopen from DONE to PARTIAL (owner-approval workflow; bind-host coverage 4/8; connection/byte limits). M1–M9 are recorded NOT STARTED, but the tree at `df1225e` **already contains M1/M2/M3/M5/M6/M7/M8/M9-shaped code and tests** (tier volumes + blind discovery + `packages/swastik`; unified `src/commands`; the CoreRenderer + embed/DM gates; the license machine; the promotion pipeline; the persona model; envelope encryption) with **no R11 change-log lines**. The first-party module sources live in **`packages/modules/`** — not the `apps/main/src/modules/` a 5.1.0-era reading might assume. The session-generated ledger was retired from the repository root on 2026-09-30 (recoverable at `0c625c1`); the state of record is the change-log per-request record plus the template's §2 snapshot. **Before any M-item executes, run the state-of-record reconciliation (R12, §3.0.2):** rebuild the ledger from the template's shapes, re-triage all 121 rows against the TREE (not the snapshot), and record ahead-of-record work honestly. Never follow this work order verbatim against the snapshot — that is exactly the redo-landed-work risk UR 2.0 raises (its risk #15). **Why the work is ahead of the record (now evidenced — E10 RC-5):** the previous migration ledger was removed at commit `9f7e427` (2026-09-26, "chore: remove migration ledger and strip code comments"), and the v5.0.0 re-baseline work landed at `d334cfb` (2026-09-26, "land v5.0.0 re-baseline module system, renderer, RBAC, governance, persona, and crypto work") and `581499e` (2026-09-26, "promote builds into tier volumes and seed first-party modules") — with no ledger record and no R11 lines. This prompt's own earlier versions (5.0.0–5.0.2, 2026-09-24/25) likewise carried no change-log lines (E6 GOV-23); §6 now records that debt.

**Relationship to the Master Build Prompt:** this prompt is a scoped *predecessor* to it. When every item in the Migration Work Order (§3) is marked DONE in the ledger, the master prompt's audit protocol and enforcement pass become the governing protocol again — not before.

---

## 0. THE ONE-SENTENCE CONTRACT

> You execute the Migration Work Order (§3) item by item; you touch ONLY the files inside the current item's blast radius; you fix ONLY the compile/test errors the current item creates; everything else you find is LOGGED, never fixed; every request row you close gets its change-log line; and you checkpoint after every item so the next session resumes instead of restarting.

If you ever find yourself doing something this sentence does not describe, stop and re-read it.

---

## 1. WHY THIS PROMPT EXISTS (READ ONCE)

The master prompt is an audit-to-full-compliance protocol: it classifies every subsystem against the CURRENT spec and remediates everything that deviates. That is the correct protocol when code and docs are at the same version. It is the WRONG protocol when the docs just jumped a major version over the code:

- Auditing a v4-era codebase against v5.0.0 marks nearly every subsystem FAULTY at once. "Remediate everything" is not a workable instruction — it produces wandering.
- The master prompt's severity ordering puts compile-blocking faults first. On a re-baselined codebase almost everything fails to compile, so the agent spends its whole budget chasing typecheck errors across files the changelog never asked to change — and rewrites whatever stands in the way of a clean compile (e.g. bootstrap).
- "Never stop until all-COMPLETE" with no finite work list gives the agent no natural stopping point.

This prompt fixes that by giving you a FINITE, ORDERED work list derived from the change-log delta, a hard scope fence around each item, a ledger so progress accumulates across sessions, and a change-log protocol so every landed row is traceable to its source request.

### 1.1 Corrections made in 5.1.0 — why 5.0.2 was misleading

These are recorded because a protocol that drifts from reality is the exact failure mode this program exists to eliminate. Full detail in Appendix A.

| # | 5.0.2 said | Why it was wrong | The 5.1.0 correction |
|---|---|---|---|
| 1 | "On first run, copy the ledger template to the repository root as `migration-ledger.md`" | The live ledger already exists at the root and is mid-migration (M0 slices 1–5 landed in commit `0c625c1`). Following 5.0.2 verbatim would destroy live progress. | Resume-first rule (§3 preamble): the live ledger is the source of truth; the template is a record-shape reference only, and is never copied over an existing ledger. |
| 2 | Done-gate = ledger record + commit (R6) | The governing program record (UR-20260918-001 §8.8) and the change-log's own v5.0.0 entry adopt the per-request record discipline — "every subsequent change keyed to a request records its own change-log line citing the request ID." 5.0.2 never enforced it: M0 slices 1–5 landed with zero change-log lines. | Rule R11 + loop step 9 (§4) + §6: the change-log line is part of the done-gate, with a defined format and a backfill rule. |
| 3 | Items referenced "the 88-flaw table" and "P0 rows" loosely | The UR requires every change traceable to a source request ID (121 requests, one row each). 5.0.2 carried no item→row map, and UR-07 and UR-31 had no owning item at all. | The request-row coverage map (§3.0): every one of the 121 UR §8.1.2 rows is assigned to exactly one item; M11 reconciles 121/121. |
| 4 | No slice mechanics | The live migration already runs on slices with hard-won conventions (triage-before-code, fail-before/pass-after proof, full-suite gate per slice, PARTIAL-with-routing) — none of it was in the protocol, so each session had to re-derive it. | §5 makes slices first-class: when to slice, the slice record shape, and the five standing slice constraints the ledger earned the expensive way. |
| 5 | The MR table's separator row was malformed (`\|---\|---\|---\|---\|---n\| MR-1 \|…`), swallowing MR-1's row; "twenty items in two blocks" (it is three blocks); `tools/release-manager` (the tree has `tools/release_manager`) | Small defects, but a protocol document that fails its own grep gates is misleading in exactly the way it forbids. | Fixed throughout; the MR table is whole. |

### 1.2 Corrections made in 5.2.0 — what UR 2.0 changed

The frozen request record advanced to **revision 2.0** (01/10/2026), absorbing a post-re-baseline Conformance & Audit Evidence Set (E1–E10). It does not add source requests — the master table stays at exactly 121 rows — but it corrects this prompt's facts. Full detail in Appendix A.

| # | 5.1.0 said | UR 2.0 evidence | The 5.2.0 correction |
|---|---|---|---|
| 1 | M0: 8 DONE / 6 PARTIAL / 3 OPEN | Three DONE rows overstated — UR-B-01 (owner-approval clause), UR-B-03 (bind-host coverage 4/8), UR-C-06 (connection/byte limits) (E1 §3; E3 §1.2; E6 GOV-01) | M0 tally corrected to **5 DONE / 9 PARTIAL / 3 OPEN**; the three rows reopen to PARTIAL (§M0; change-log SC-01) |
| 2 | Every item but M0 "NOT STARTED" | M1/M2/M3/M5/M6/M7/M8/M9-shaped code + tests exist in the tree, with no R11 lines (E6 GOV-13; E4 PRE-45; E2 S-41; E5 XC-03; E10 RC-5) | Rule R12 + §3.0.2: reconcile the state of record against the tree before any M-item; record ahead-of-record work (SC-02/SC-03) |
| 3 | MR modules come from `apps/main/src/modules/<module>/` | The real home is `packages/modules/`; `apps/main/src/modules/` does not exist (E6 GOV-12; E2 S-27; E5 MOD-02) | MR block's source path corrected to `packages/modules/` (§MR) |
| 4 | MR-1 reads "Division 8.10 testing checklist" | Division 8.10 is a miscite; the checklist is §10.10 (E10 C-8/R3; E6 GOV-25) | MR-1 citation corrected to §10.10 |
| 5 | UR-20260918-001 revision 1.0 | Revision 2.0 registers E1–E10 and a conformance-finding register (UR §3.1.1, §8.13) | "Derived from" and the sources of truth now cite UR 2.0 and the evidence corpus |

### 1.3 What the 5.3.0 extraction added (finding-by-finding)

The evidence set is not a summary; it is ten documents of per-file, per-claim evidence. 5.3.0 read all ten and landed the specifics the summary missed.

| # | What the evidence set says (with source) | Where it now lives in this prompt |
|---|---|---|
| 1 | **Provenance of the ahead-of-record work.** The prior ledger was removed at `9f7e427` (2026-09-26); the work landed at `d334cfb` + `581499e` (2026-09-26) with no records (E10 RC-5; commits verified against the repo) | CURRENT STATE; §3.0.2 |
| 2 | **Per-item tree state**, file-and-test specific — M1 (loader/tier volumes/`packages/swastik`), M2 (unified `src/commands`), M3 (`core-renderer.ts`), M5 (`src/licensing/*`), M6 (`promotion.ts`), M7 (`src/personas/*`), M8 (`src/crypto/*`+sealed credentials), M9 (`m9-*` suites) (E6 GOV-13; E2 S-14/S-15/S-37; E5 §71/DATA-06) | New §3.0.3 |
| 3 | **Classification matrix:** 242 findings = 68 compliant / 38 deviation / 25 implementation defect / 16 spec defect / 9 ambiguity / 7 missing spec / 46 missing implementation / 21 undocumented behaviour / 7 obsolete / 6 unverifiable (E1 §1.1) | §3.0.1 |
| 4 | **Executed verification:** `pnpm install` + `tsc --noEmit` + `eslint --max-warnings=0` + `vitest run` = **876/876 unit tests, 75 files, 0 failures** (E7 §2) — the "876 green" claim is now *executed*, not merely static (E6 GOV-02 counted it statically) | §3.0.1 |
| 5 | **The true-unknowns register** — flat `src/` vs `src/core/` (no owner), dead husky/commitlint, missing `scripts/check-configmap-keys.mjs`, §32.10 InputSanitizer, §32.8 token-leak scanning, D-7.5.5 policy lockfile, split-brained maintenance mode, and the ~24 UR §8.13.4 items (E1 §5; E3 §1.2; E5/E9) | New §3.0.4 |
| 6 | **Volume-path vocabulary:** deployed staging `/mnt/modules/swastik-staging`, live `/mnt/modules/modules-core`, both nested in `MODULES_DIR=/mnt/modules`; STATUS.md/directory.md's `/data/swastik-*` is wrong (E7 F3; E10 C-10/I12) | §3.0.3 (M1/M6 rows) |
| 7 | **`packages/modules/` is verified present** (8 packages) — E9/Audit_2's D28 claim that it is absent is contradicted by E2 S-27, E5 MOD-02, E7 A1, E10 I11 and by direct tree inspection | §3.0.3 note |
| 8 | **R11 line-format ambiguity** — the actual change-log M0 table is 5 columns (Request \| Row \| slice \| Record \| Status) with the proof folded into the Record cell (E6 GOV-27); corpus composition ("nine"/"twelve") is undefined (E6 GOV-24) | §6; §3.0.4 |

---

## 2. HARD RULES — THE SCOPE FENCE

These rules override every other instruction you may have read in the documentation set. They govern this entire prompt.

**R1 — The work order is the work.** The ONLY code changes you make are those required by the current Migration Work Order item (§3). You do not fix, clean, refactor, upgrade, or "improve" anything outside the current item — even if it is broken, even if it fails typecheck, even if it looks wrong, even if the spec elsewhere says it should be different.

**R2 — Blast radius before edits.** Before writing a single line of code for an item, write down the item's blast radius: the exact list of files and directories this item is allowed to touch. Write it into the ledger entry for that item BEFORE you start. If a file is not in the blast radius, it is read-only for this item.

**R3 — Log, don't fix.** When you encounter a compile error, failing test, or defect in a file OUTSIDE the current blast radius: record it in the ledger under `Out-of-scope findings`, note which work-order item (if any) it belongs to, and move on. Do not fix it now. The only exception is a one-line mechanical unblocking fix (e.g. an import path rename caused by an earlier item) — allowed, but must be logged.

**R4 — No opportunistic rewrites.** Deleting a file, re-scaffolding a directory, or rewriting a working implementation from scratch is forbidden unless the current work-order item explicitly requires it (e.g. M1 requires removing `src/modules`). "The code is old" or "the spec is nicer than the code" is never a reason. Bootstrap, DI, shutdown, and every other core subsystem are READ-ONLY unless the current item names them in its blast radius.

**R5 — Compile checks are per-item gates, not a global pre-pass.** You run `tsc --noEmit` (and the test suite for the affected subsystem) at the END of each item, on the paths in that item's blast radius. You do NOT run a full-project typecheck-first loop. Errors outside the blast radius are out-of-scope findings (R3). A full-project green build is only required at M11 — the convergence pass, the final item.

**R6 — Checkpoint or it didn't happen.** After each item (and each slice) is verified: commit the work, and update the ledger entry to DONE with a one-paragraph record of what changed, which spec sections drove it, and which tests prove it. An item without a ledger record is not done. A checkpoint without its change-log line (R11) is not done either.

**R7 — Stop at the fence line of your budget.** If your session budget is nearly exhausted mid-item, STOP, record the item as IN-PROGRESS with a precise resume note in the ledger ("done: X, Y; remaining: Z; next step: read blueprint §21.4 then implement the grant-resolution order"), and end. A clean handoff is worth more than a half-finished sprawl. NEVER start an item you can see you cannot finish.

**R8 — The spec wins, but only where the delta reaches.** Inside the current blast radius, implement to the v5.0.0 spec exactly (precedence: `blueprint.md` > `directive.md` > `interface.md` > `directory.md`; binding ADRs in `docs/adr/`). Outside it, the codebase's current behavior stands until its own item says otherwise.

**R9 — Canonical vocabulary from line one.** Every line you write or touch uses the v5.0.0 vocabulary: **Twixter** (persona), **Release Manager**, **MODERATOR / ADMINISTRATOR**, buffer-then-render, formal notice frame, tier volumes. No legacy names in new code. (The full sweep of legacy names in UNTOUCHED files is its own final item, M10 — do not do it early.)

**R10 — One item at a time, in order.** You do not interleave items, work ahead, or batch "quick wins" across items. The order in §3 is the order. Each item builds on the completed ones before it.

**R11 — The change-log line is part of the done-gate.** When a work-order item (or slice) closes request rows in code, you append one line per closed row to `docs/change-log.md` under the **v5.0.0 implementation track — per-request record** (format in §6). An item is not DONE while any row it closed lacks its line. Rows that close PARTIAL get their line with the PARTIAL status and the routing; rows that stay OPEN get none until they close. Missed lines are backfilled at discovery, logged as a deviation — never skipped, never batched to "later" without a ledger record.

**R12 — Reconcile the state of record before you execute.** Before claiming any M-item, run the state-of-record reconciliation (§3.0.2): rebuild the ledger from the template's shapes and re-triage every row the item owns against the TREE at working HEAD — never against the snapshot or the UR text, which are frozen and lag the tree. The UR 2.0 evidence shows M1–M9-shaped code already exists; following the work order verbatim without reconciling would redo landed work or reopen closed rows (UR 2.0 risk #15). Ahead-of-record work is recorded as **PRESENT IN TREE** with its evidence; whether it is credited as DONE/PARTIAL is governed by the open policy question (UR §8.1.3 #19) and must not be decided unilaterally — until it is, such rows stay recorded-but-uncredited, never silently marked DONE and never marked NOT STARTED.

---

## 3. THE MIGRATION WORK ORDER

Twenty items in three blocks, executed strictly in order: the framework block (M0–M8), then the module-rewrite block (MR-1–MR-8), then the closing framework items (M9–M11). Each item names: its source of truth (read these BEFORE coding), its blast radius, the request rows it owns (§3.0), and its done-gate.

**The ledger relationship (the 5.0.2 first-run instruction is withdrawn).** `migration-ledger.md` at the repository root is the live, authoritative progress record — once it exists. The pre-5.1.0 session-generated ledger was retired from the repository on 2026-09-30 (records recoverable in git history at `0c625c1`; state of record: the change-log per-request record plus the template's dated snapshot), so the first migration session after this revision constructs a fresh ledger from `docs/migration-ledger-template.md`'s record shapes, seeded with the template's §2 snapshot — built entry by entry, never by copying the template file wholesale. From then on: read the ledger at the start of every session; update it at the end of every item and slice; never overwrite or re-create it.

The framework items are sequenced infrastructure-first: layout and plumbing before presentation, presentation before permissions, permissions before governance. The module-rewrite block follows the framework it depends on — command tree, Renderer, RBAC engine, license/compat gates, Swastik pipeline, persona model — and precedes the convergence pass so that M11 audits the live modules too. This ordering is deliberate — do not reorder it without recording the reason in the ledger.

### 3.0 Request-Row Coverage Map (the traceability contract)

The governing program record (UR-20260918-001) puts all 121 requests in one master table (its §8.1.2): rows 1–31 are the v5.0 program URs (`UR-01`…`UR-31`), rows 32–33 are the RBAC redesign requirements (`R1`, `R2`), and rows 34–121 are the 88 suite correction requests (`UR-A-nn`, `UR-B-nn`, `UR-C-nn`). Its severity vocabulary maps `Critical` → P0, `High` → P1, `Medium` → P2. Every row is owned by exactly ONE work-order item below. At item-claim time, copy your item's rows into the ledger's row-triage field; at M11 the counts must reconcile: **121 rows, 121 owners, 0 orphans.**

| Item | Owns UR §8.1.2 rows (request IDs) | Count |
|---|---|---|
| M0 | 34–37 (`UR-A-01…04`), 64–69 (`UR-B-01…06`), 92–98 (`UR-C-01…07`) — the 17 severity-Critical suite rows (= P0) | 17 |
| M1 | 4 (`UR-04`), 5 (`UR-05`), 19 (`UR-19`) | 3 |
| M2 | 74 (`UR-B-11`) | 1 |
| M3 | 9–12 (`UR-09…12`), 21 (`UR-21`), 28 (`UR-28`), plus the interface-UX carriers 111 (`UR-C-20`) and 120 (`UR-C-29`) | 8 |
| M4 | 32–33 (`R1`, `R2`), 40–42 (`UR-A-07…09`) | 5 |
| M5 | 2 (`UR-02`), 6 (`UR-06`), 8 (`UR-08`), 18 (`UR-18`), 20 (`UR-20`), 23 (`UR-23`) | 6 |
| M6 | 15 (`UR-15`), 25 (`UR-25`), 26 (`UR-26`), 27 (`UR-27`), 30 (`UR-30`), plus the manifest-contract and pipeline rows 57–58 (`UR-A-24…25`), 75–76 (`UR-B-12…13`), 78 (`UR-B-15`), 83 (`UR-B-20`), 89 (`UR-B-26`), 105 (`UR-C-14`), 113 (`UR-C-22`), 117 (`UR-C-26`) | 15 |
| M7 | 16 (`UR-16`), 29 (`UR-29`), 45–46 (`UR-A-12…13`), 112 (`UR-C-21`) | 5 |
| M8 | 22 (`UR-22`) | 1 |
| MR-1…MR-8 | No source rows of their own — they implement UR-11's Core Command Surface reference set against the M1–M8 interfaces, and verify the suite module-behavior rows at their done-gates | 0 |
| M9 | Program rows 1 (`UR-01`), 7 (`UR-07`), 17 (`UR-17`), 24 (`UR-24`), 31 (`UR-31`), plus every suite row not named above: 38–39, 43–44, 47–56, 59–63 (Group A), 70–73, 77, 79–82, 84–88, 90–91 (Group B), 99–104, 106–110, 114–116, 118–119, 121 (Group C) — including the residual clauses of rows M0 closed PARTIAL | 57 |
| M10 | 3 (`UR-03`) and the residual legacy-name sweep | 1 |
| M11 | 13 (`UR-13`), 14 (`UR-14`) — the honesty/measurement audits — plus the 121/121 reconciliation itself | 2 |

Two coverage notes, recorded as corrections of 5.0.2: **UR-07 (Global Data Emit) and UR-31 (per-guild Redis pub/sub MDIS sync) were named by no work-order item and by no phase of the UR's own rollout table.** Both are assigned to M9 above; if M9's execution reveals a better home, move them by a logged deviation, never silently. A third note: several rows are *shared-carrier* rows — UR-01's console lands via UR-A-02/UR-B-09/UR-C-06, UR-17's credential domain via UR-B-05/UR-C-04/UR-C-05, UR-24's PEP surface via UR-B-08 — the M9 record must state, per program row, which suite rows carried it.

### 3.0.1 The Evidence Corpus (UR 2.0)

UR-20260918-001 revision 2.0 registers a ten-document **Conformance & Audit Evidence Set** (its §3.1.1; E1–E10), verified against `df1225e` (conformance + architecture) and `0c625c1` (full codebase audit). It carries 242 conformance findings across five workstreams (structure 47, security 40, presentation 50, data/ops 74, governance 31), a 310-file architecture audit (E9, superseding E8), and a documentation-system audit (E10: RC-1…RC-5, C-1…C-10, R1…R13, I1…I13). It is a **verification record, not a source of requests** — the master table (§3.0) stays at exactly 121 rows. Its documentation actions are catalogued in the UR's §8.13 register (CF-01…CF-30 spec defects, SC-01…SC-04 state corrections, UB-01…UB-15 undocumented reality, TU-01…TU-24 true unknowns). Read it before reconciling the state of record; do not treat its code-defect findings as migration work (they execute under their own programs).

**Classification matrix (E1 §1.1) — 242 findings:** 68 spec-compliant · 38 spec-deviation · 25 implementation-defect · 16 specification-defect · 9 specification-ambiguity · 7 missing-specification · 46 missing-implementation · 21 undocumented-implementation-behaviour · 7 obsolete-specification · 6 unverifiable. Distinguishing **scheduled-deferred** gaps (owned by a work-order item — 60+ findings) from **true unknowns** (no owning item — §3.0.4) is the set's first-class result.

**Executed verification (E7 §2), not just static review:** `pnpm install --frozen-lockfile` clean; `tsc --noEmit` 0 errors (strict); `eslint --max-warnings=0` 0 warnings; `vitest run` → **75 files / 876 tests, 0 failures**. Integration tests were not run (need live Postgres + Redis). E9 dispositioned all **310 `apps/main` files** (KEEP 175 / MODIFY 109 / MERGE 9 / MOVE 7 / REMOVE 4 / SPLIT 3 / REFACTOR 2 / REPLACE 1) and registered **29 cross-cutting duplications (D1–D29)**; E7's highest-confidence deletions are `src/entry/worker.ts` (REPLACE — a byte-identical copy of `main.ts`), migrations `_24`/`_25`/`_26` (dead superseded schema) and `_30` (`otp_secrets`).

### 3.0.2 The State-of-Record Reconciliation Gate (R12) — run before M1

The evidence set found the record and the tree disagree (UR 2.0 finding 17). Before any M-item beyond the M0 slice already in flight, perform, and record in the ledger:

1. **Rebuild the ledger from the tree.** Construct the fresh ledger (template shapes), then re-triage **all 121 rows** against working HEAD — for each row: `DONE / PARTIAL / PRESENT-IN-TREE / ABSENT`, with the file/test evidence that proves it. This supersedes the template's §2 snapshot, which is a starting orientation only.
2. **Correct the M0 record.** Reopen UR-B-01, UR-B-03, UR-C-06 to PARTIAL (their clauses are in the UR §8.13.2 SC-01); record M0 as 5 DONE / 9 PARTIAL / 3 OPEN.
3. **Record ahead-of-record work (SC-02).** For each M1–M9-shaped implementation the triage finds, write the R11 change-log line the protocol owed — marked **PRESENT IN TREE (uncredited pending UR §8.1.3 #19)**. Do not credit it as DONE; do not leave it invisible.
4. **Record the corrections SC-04** (change-log master-table line counts: blueprint 13,139 not 13,258; concept 581 not 582) and CF-22 (legacy "DRM" in the change-log's living open-items section).
5. **Resolve or carry the blocking open questions** (UR §8.1.3 #13 layout model, #14 module source home, #15 hello-world tier, #18 Swastik path vocabulary, #19 state-of-record policy) — each is OPEN and gates a specific item's start.

The **provenance** for step 3 is now evidenced (E10 RC-5; commits verified): the prior ledger was removed at `9f7e427` (2026-09-26) and the work landed at `d334cfb` + `581499e` (2026-09-26) — so the triage's job is to *credit or route work that was done but never recorded*, not to discover where it came from. Start from the §3.0.3 evidence map.

Until steps 1–3 are recorded, no item past the in-flight M0 slice may be claimed.

### 3.0.3 Tree-State Evidence Map (what the tree already contains, per item)

Extracted from E1 §2/§3, E2 (S-14/S-15/S-27/S-37), E3 §2–§3, E5 (§71, DATA-06), E6 GOV-13 and E7 §3. This is the starting map for the R12 re-triage — it does not replace it (the tree at working HEAD is the source of truth).

| Item | Present in the tree (evidence) | Gap / not yet present | R12 verdict so far |
|---|---|---|---|
| M0 | slices 1–5 landed (E1 §2.1, E3 §2) | slice 6: UR-B-04/05, UR-C-05 | 5 DONE / 9 PARTIAL / 3 OPEN |
| M1 | `src/modules` absent; `packages/swastik` present; five tier volumes mounted under `MODULES_DIR=/mnt/modules` (compose + K8s); `MODULES_DIR` / `SWASTIK_STAGING_VOLUME_PATH` / `SWASTIK_LIVE_VOLUME_PATH` env present; loader blind-discovers via `readdirSync` (E2 S-14/S-37, E6 GOV-13) | `packages/swastik` layout differs from directory.md: manifest contract is TS types in `src/manifest.ts` (`defineModule`, `moduleTiers`), not a Zod `schemas/manifest.schema.ts`; `_template` folder set differs (has `ui/`,`assets/`, lacks `tasks/`) (E2 S-26) | directory-level target met; package-layout drift |
| M2 | unified `src/commands/` present (`command-router`, `-registry`, `-deployer`, `-ceiling`, `collision-resolution`); no `src/core/commands` remnant (E2 S-15) | single-router behaviour unverified | structural target met |
| M3 | `src/rendering/core-renderer.ts` (288 ln), wired at `bootstrap.ts:162`, injected into `CommandRouter`; buffer-then-render (one edit); formal notice frames; embed ban (ESLint + `m3-embed-and-dm.test.ts`); DM prohibition (router) (E4 PRE-45, E6 GOV-13) | the whole command surface — all 8 modules are stubs (`commands: []`); nothing above the dispatch boundary | skeleton only; done-gate NOT met |
| M4 | `rbac_sets`/`rbac_groups`/`rbac_group_role_bindings`/`rbac_grants` (migrations 14–17); `src/permissions/{rank,rbac,resolver,grant-surface,db-blacklist}.ts` (E5 DATA-06) | no runtime grant writer; role vocabulary drift (D21: four spellings) | partial |
| M5 | `src/licensing/{license-machine,compatibility-ledger,deployment-records}.ts`; migration 33 (`licenses`, `compatibility_contracts`, `compatibility_windows`, `compatibility_provides`, `deployment_records`) (E5 §71) | `tools/release_manager` outside every quality gate (E7 E4); ledger not CI-gated | partial |
| M6 | `src/module-system/promotion.ts` (`renameSync` swap under a Redis lock store) + `m6-promotion.test.ts` (E6 GOV-13) | manifest single-source (D3); `packages/swastik` layout drift | partial |
| M7 | `src/personas/{persona,persona.repository,persona-command-binding.service}.ts`; migrations 20/21/34; `m7-persona.test.ts` (E6 GOV-13) | ADR-003 gap: `persona.botTokenDigest` hashes a value Twixter must *use* (E9 §21) | partial |
| M8 | `src/crypto/{envelope,envelope-scope}.ts`; `src/credentials/{sealed-credential.service,sealed-credential.repository}.ts`; migration 35; `m8-envelope.test.ts` (E6 GOV-13) | scope-boundary verification | partial |
| MR-1…MR-8 | `packages/modules/{browse,dashboard,health,hello-world,modules,permit,persona,queue}` present as lifecycle-only stubs; README "First-party Swastik modules (M6 re-seed)"; built via `apps/main/scripts/build-first-party-modules.ts` (esbuild → `dist-modules/`) (E2 S-27, E7 A1) | zero commands anywhere; no `defineCommand` in `packages/swastik` (E4 PRE-28) | not started (stubs only) |
| M9 | `m9-*` suites present; UR-B-19 `createHmac` implemented (`shared/utils/crypto.ts`) (E6 GOV-13) | runtime inert: no queues/scheduler/gateway handlers/tracing/metrics; CI hygiene (SHA-pin/secrets/Dependabot) (E1 §2.2, E5 §31) | partial |
| M10 | canonical vocabulary already clean across the living set (E6 GOV-05) | residual legacy in non-living files | mostly done |

**Volume-path vocabulary (fix once, in M1/M6):** deployed staging `/mnt/modules/swastik-staging`, live `/mnt/modules/modules-core` (env default), both nested inside `MODULES_DIR=/mnt/modules`; STATUS.md/directory.md's `/data/swastik-*` is the wrong vocabulary (E7 F3; E10 C-10/I12). **Code name:** `TIER_VOLUME_NAMES` = `modules-admin/core/standard/marketplace` + `swastik-staging`.

**Evidence-set internal inconsistency (recorded, not propagated):** E9 (`Dumby-Suite-Audit_2.md` §27/D28) asserts `packages/modules` is absent ("the build/seed chain is broken at its source root"), but E2 S-27, E5 MOD-02, E7 A1, E10 I11 and direct tree inspection all confirm the eight packages are present. The triage trusts the tree.

### 3.0.4 True-Unknowns Register (findings with no owning item)

These have **no owning work-order item** and must each receive an owner, a new row, or a logged deviation (UR §8.13.4 TU-01…TU-24; E1 §5; E3 §1.2; E5/E9). Grouped by area, with evidence:

- **Layout / structure:** flat `src/` vs the spec-mandated `src/core/` wrapper — no item owns the restructure (E2 S-13; E6 GOV-11; E10 C-2); `packages/modules/` source home undocumented (E6 GOV-12); corpus composition "nine"/"twelve" undefined (E6 GOV-24).
- **Tooling:** dead husky/commitlint wiring — config present, dependencies absent from the lockfile (E1 §5.2; E2 S-11); `scripts/check-configmap-keys.mjs` referenced but missing (E1 §5.3; E2 S-08/S-09).
- **Security residuals:** §32.10 `InputSanitizer` (E3 SEC-27a); §32.8 dynamic token-leak scanning + owner alert (E3 SEC-29); D-7.5.5 policy lockfile / ESM restrictions / `no-direct-interaction-reply` lint (E3 SEC-32).
- **Data/ops:** audit-log partitioning + retention; standard `createdBy`/`updatedBy` columns; read-replica routing + `DATABASE_SSL`/`REDIS_TLS`; eventsCatalog payload schemas; Redis pub/sub L1 invalidation; OpenAPI publication; the five §43 runbooks; repository-pattern adoption (raw `db.knex` bypass); `blocked_users.expiresAt` + global-block uniqueness; worker-only bootstrap + `ROLE=worker`; configmap↔`ENV_KEYS` drift guard; analytics / mdis / webhooks / operational / cli subsystems (E5; E9; UR §8.13.4 TU-06…TU-18).
- **Correctness:** split-brained maintenance mode (DB row vs in-memory flag) — no owning item (E1 §5.7; E7 D1; E5 HTTP-10); in-memory idempotency/rate-limit; component-path bypass of the Renderer; invoker re-check bypass for non-minted customIds; persona IDs from a process-local counter (E1 §2.3; E4 PRE-21/25/40).
- **Residuals of the overstated M0 rows:** UR-B-01 approval workflow; UR-B-03 bind coverage; UR-C-06 limits — now routed via M0/§M9 (E1 §5.6).

Each is either **owned** (a row/item named) or **logged as a deviation** in the ledger — under the set's own rules they cannot simply stand (E1 §5).

### M0 — P0 Security Flaws (do first, smallest blast radius, highest stakes)

**Request rows owned:** the 17 severity-Critical suite rows (§3.0): UR-A-01…04, UR-B-01…06, UR-C-01…07.
**Source of truth:** `docs/ur/UR-20260918-001` §8.1.2 rows 34–37, 64–69, 92–98 — read the rows before touching anything.
**Blast radius:** only the files named by P0 flaw rows (declared per slice in the ledger; the retired pre-5.1.0 M0 record with the standing declarations is recoverable in git history at `0c625c1` — re-declare slice 6's radius from its rows before editing).
**Done-gate:** each P0 flaw row has a test that fails before the fix and passes after; no control plane accepts unauthenticated connections; all path handling is contained. A row whose full remedy depends on a P1/P2 row (e.g. UR-A-03 and UR-C-07 name UR-C-09 as their own dependency) closes PARTIAL with routing evidence, never force-fitted.
**Current state:** slices 1–5 landed (admin auth; loader path containment; honest 501s; fail-closed unknown tier; Swastik internal auth); slice 6 — provenance, ownership, credentials (UR-B-04, UR-B-05, UR-C-05 plus closable partials) — is the last M0 slice. **Tally corrected by UR 2.0 (§8.13.2 SC-01): 5 DONE / 9 PARTIAL / 3 OPEN** — UR-B-01, UR-B-03 and UR-C-06 reopen from DONE to PARTIAL. Last verified: 75 files / 876 tests green; typecheck, lint, format, coverage clean.

### M1 — Tier Volumes & Blind Discovery (module relocation)

**Request rows owned:** UR-04 (row 4, package scaffold), UR-05 (row 5), UR-19 (row 19).
**Tree state (UR 2.0 evidence — §3.0.3):** directory-level target already met — `src/modules` absent, five tier volumes mounted under `MODULES_DIR=/mnt/modules`, loader blind-discovers; `packages/swastik` present with layout drift (E2 S-14/S-26/S-37).
**Source of truth:** `blueprint.md` §5.4, §7.3, §15.9; `directory.md` (volume layout); ADR-005; master prompt Phase 0 notes on `MODULES_DIR`.
**What changes:** remove `src/modules` (modules never live in the source tree); stand up the four per-tier volumes (`modules-admin`, `modules-core`, `modules-standard`, `modules-marketplace`) plus `swastik-staging` rooted at `MODULES_DIR` (default `/mnt/modules`); replace any registry seed / hardcoded module list with blind discovery at bootstrap; make the volumes mountable (docker-compose / K8s mounts); create the `packages/swastik` authoring package with types, manifest schemas, scoped entry points, and the `_template` module.
**Blast radius:** module loader/registry/discovery code, `src/modules` (removal), `packages/swastik` (new), docker-compose and K8s volume mounts, the bootstrap stage that loads modules.
**Done-gate:** a module placed on a volume is discovered and loaded with zero registry edits; a module anywhere else is not loaded; tier-at-rest is enforced by volume; no `src/modules` directory remains.

### M2 — Unified Command Tree

**Request rows owned:** UR-B-11 (row 74).
**Tree state (UR 2.0 evidence — §3.0.3):** unified `src/commands/` already present, no `src/core/commands` remnant; single-router behaviour unverified (E2 S-15).
**Source of truth:** `directory.md` (`src/commands/` unified tree); `blueprint.md` §17; change-log "Removed" (the `src/core/commands` split).
**What changes:** merge the former `src/core/commands` split into the single canonical `src/commands/` tree; exactly one command router remains; remove any orphaned or duplicate router.
**Blast radius:** `src/core/commands` (removal), `src/commands/` (merge target), the router, imports of the moved command files.
**Done-gate:** one router, one tree, no remnant of the split; command registration and collision detection still work.

### M3 — Core Renderer, Buffer-Then-Render & the Embed Ban (the big one)

**Request rows owned:** UR-09, UR-10, UR-11, UR-12, UR-21, UR-28 (rows 9–12, 21, 28) plus the interface-UX carriers UR-C-20 (row 111) and UR-C-29 (row 120).
**Tree state (UR 2.0 evidence — §3.0.3):** `core-renderer.ts` + embed/DM gates present and wired; the whole command surface (all 8 modules are stubs) is absent, so this item's done-gate is NOT met (E4 PRE-45; E6 GOV-13).
**Source of truth:** `blueprint.md` §10.2, §16.5, §20 (especially §20.8 renderer/presentation grammar and §20.9 buffer embed + formal notice frames), §17.11, §19.2, §28.6; `interface.md` — the renderer, interaction-lifecycle, and component-dispatch sections, read completely; ADR-001 (embed ban), ADR-002 (DM prohibition), ADR-009 (A4 title/attribution grammar), ADR-010 (accent colour).
**What changes:** build the core Renderer as the single presentation authority — static Components v2 frame grammar with dynamic slots, Modes D/M/C; the buffer-then-render contract on every interaction (instant buffer embed, exactly one edit into the final render or the formal notice frame); formal notice frames with reason codes and trace correlation IDs; the single official accent token blurple `#5865F2` everywhere; the A4 title and attribution grammar (developer attribution in the footer slot, never the surface title); minted stateless customIds with click-time re-authorization, idempotency, the 800 ms autocomplete budget, the 13-minute follow-up watchdog (UR-C-20, UR-C-29); the absolute embed ban (no classic `EmbedBuilder`/`MessageEmbed` anywhere, enforced by a lint/grep gate) and the absolute DM prohibition (UR-21).
**Blast radius:** renderer, interaction handling, every shipped command's presentation code, the embed-ban lint gate, tests that asserted embed-based output.
**Done-gate:** every user-facing surface is renderer-issued Components v2; the edit-sequence assertion (buffer → exactly one edit) passes on every interaction; a grep gate fails on any classic-embed import or instantiation; no DM path exists on any route including permission-denied and error paths.

### M4 — RBAC Layer 6/7 Redesign

**Request rows owned:** R1, R2 (rows 32–33), UR-A-07, UR-A-08, UR-A-09 (rows 40–42).
**Tree state (UR 2.0 evidence — §3.0.3):** RBAC tables (migrations 14–17) and `src/permissions/{rank,rbac,resolver,grant-surface,db-blacklist}.ts` present; no runtime grant writer; role-vocabulary drift across four files (E5 DATA-06; E9 D21).
**Source of truth:** `blueprint.md` §21 (especially the Layer 6 pure-backend rank function and Layer 7 guild-side grants, the exhaustive non-configurable override boundary, Table 21-A); `concept.md` §16.1 (six-rank ladder, grant scopes, RESTRICTED floor); `interface.md` (the `/permit` Layer 6/7 vocabulary).
**What changes:** implement the one normative seven-layer permission ordering; Layer 6 as a pure-backend rank function; Layer 7 as guild-side grants with the "Set" scope semantics; the six-rank ladder with canonical MODERATOR / ADMINISTRATOR names; "OWNER" = the guild's ownership account, distinct from the `BOT_OWNER_IDS` operator override; the `/permit` command surface per `interface.md`; the RBAC persistence the suite rows require (two-step role resolver, knex repository over the four RBAC tables, blacklist lookup backed by `blocked_users`).
**Blast radius:** `src/permissions/` (resolver, RBAC service), the `/permit` module, permission-related migrations, permission tests.
**Done-gate:** deny-by-default holds; resolution order matches Table 21-A exactly; the override boundary is non-configurable as specified; the resolver is invoked on every dispatch (instrumented test).

### M5 — License Machine, Compatibility Ledger & Deployment Records

**Request rows owned:** UR-02, UR-06, UR-08, UR-18, UR-20, UR-23 (rows 2, 6, 8, 18, 20, 23).
**Tree state (UR 2.0 evidence — §3.0.3):** `src/licensing/{license-machine,compatibility-ledger,deployment-records}.ts` + migration 33 present; `tools/release_manager` sits outside every quality gate (E5 §71; E7 E4).
**Source of truth:** `blueprint.md` §15.7 (six-state license machine with devId binding), §14.4 (Compatibility Ledger gating releases), §15.12 (Deployment Records), §44.8 (versioned OpenAPI API families); `directive.md` D-8.10.
**What changes:** implement the six-state license machine with devId binding; stand up the machine-readable Compatibility Ledger of cross-boundary contract version windows; wire it as the release gate (core releases and module deployments); add Deployment Records and the repo-to-running OIDC deployment flow (UR-02).
**Blast radius:** license/compat subsystem, the release/deployment tooling under `tools/release_manager`, the Swastik promotion gate (integration point only — the pipeline itself is M6).
**Done-gate:** the ledger exists and is enforced (a deployment that violates a contract window is refused); the license state machine transitions only along its six legal edges.

### M6 — Swastik Promotion Pipeline (staging, atomic promotion, hot reload)

**Request rows owned:** UR-15, UR-25, UR-26, UR-27, UR-30 (rows 15, 25, 26, 27, 30) plus UR-A-24, UR-A-25, UR-B-12, UR-B-13, UR-B-15, UR-B-20, UR-B-26, UR-C-14, UR-C-22, UR-C-26 (rows 57–58, 75–76, 78, 83, 89, 105, 113, 117).
**Tree state (UR 2.0 evidence — §3.0.3):** `src/module-system/promotion.ts` + `m6-promotion.test.ts` present; manifest single-source outstanding (three definitions — E9 D3); `packages/swastik` layout drift (E2 S-26).
**Source of truth:** `blueprint.md` §12.21, §15 (staging, promotion, verified loads), §11.2 (manifest contract); ADR-006 (reload automation boundary); master prompt Phase 3 notes on Swastik.
**What changes:** staging on `swastik-staging`; atomic promotion onto tier volumes; path containment on all module file operations (the M0 slice-2 containment root — `modulesDir` — is a load-bearing requirement: `SWASTIK_STAGING_VOLUME_PATH` must be nested inside `MODULES_DIR`); verified loads (a module that fails validation never goes live); the hot-reload boundary exactly as ADR-006 records it; manifest reading via static extraction, not `import()` (D-4.9); the full manifest contract (visibility enum, hardcode toggle, `depends` pins, tarball upload, category enum, devId/buildId required at upload).
**Blast radius:** the Swastik service and `packages/swastik` integration points, module loader hooks used by promotion, `manifest.schema.ts`.
**Done-gate:** promotion is atomic (a failed promotion leaves the volume untouched); loads are verified; path traversal tests pass; hot reload stays inside ADR-006's boundary.

### M7 — Twixter Persona Model

**Request rows owned:** UR-16, UR-29 (rows 16, 29) plus UR-A-12, UR-A-13, UR-C-21 (rows 45–46, 112).
**Tree state (UR 2.0 evidence — §3.0.3):** `src/personas/*` + migrations 20/21/34 + `m7-persona.test.ts` present; ADR-003 gap — `persona.botTokenDigest` hashes a value Twixter must *use* (E6 GOV-13; E9 §21).
**Source of truth:** `blueprint.md` §35; ADR-008 (free-charter sunset); ADR-011 (persona surface); `interface.md` (persona division); master prompt Phase 5 (stub level is fine if the current codebase has no operational personas yet — record that honestly in the ledger).
**What changes:** the Twixter typed interface and persona model — bring-your-own-identity, single-server-bound; the free-charter sunset behavior; persona surface per ADR-011; the persona bindings and dispatch gate the suite rows require (moduleSlug in the binding key, PERSONA_ID env, occupied-by-another-persona gate).
**Blast radius:** persona subsystem, its migrations and tests.
**Done-gate:** the persona model compiles, is wired to the spec'd surface, and the sunset rule is tested.

### M8 — Envelope Encryption

**Request rows owned:** UR-22 (row 22).
**Tree state (UR 2.0 evidence — §3.0.3):** `src/crypto/{envelope,envelope-scope}.ts` + `src/credentials/{sealed-credential.service,sealed-credential.repository}.ts` + migration 35 + `m8-envelope.test.ts` present; scope-boundary verification outstanding (E6 GOV-13).
**Source of truth:** `blueprint.md` §32.7; ADR-003.
**What changes:** envelope encryption scoped to in-process-readable credentials — exactly the scope ADR-003 records, no wider.
**Blast radius:** the credentials/secrets handling path, its config, its tests.
**Done-gate:** every in-process-readable credential is envelope-encrypted at rest; the scope boundary (what is and is not encrypted) matches ADR-003 exactly.

---

### The Module Rewrite Block — MR-1 … MR-8 (first-party modules rewritten to v5.0.0 and made live via Swastik)

Runs after M8 and before M9. Prerequisites: every item M0–M8 DONE — the modules are rewritten against the command tree, Renderer, RBAC engine, license/compat gates, Swastik pipeline, persona model, and encryption scope delivered by those items. If any is not DONE when this block is reached, stop and report — never rewrite a module against an interface that does not exist.

Each MR item follows the per-item execution loop (§4) with these bindings:

**Source and target.** The current first-party module sources live in **`packages/modules/<module>/`** — the tree's real home (`apps/main/src/modules/` does not exist; UR 2.0 finding 18 / UB-01); the pre-M1 implementation is recoverable from the git tag `pre-m1-modules` (`git show pre-m1-modules:apps/main/src/modules/<module>/`). Begin with a salvage audit: keep every behavior v5.0.0 still calls for, and record the kept-vs-superseded split in the ledger. The target is the `swastik` `_template` 11-folder layout with the full v5.0.0 manifest (tier, version, granular permissions, dependencies, configSchema, commands, events, assets), colocated tests, and the en-US base locale.

**Presentation.** Exclusively through the Renderer: Components v2 Modes D/M/C, buffer-then-render (instant buffer embed, exactly one edit into the final render or the formal notice frame with reason code + trace correlation ID), the single official accent `#5865F2`, and the A4 title/attribution grammar — attribution in the footer slot, never the title (ADR-001, ADR-002, ADR-009, ADR-010). No classic `EmbedBuilder`/`MessageEmbed` anywhere in module code; the main bot never DMs.

**Permissions.** Layer 6/7 vocabulary, deny-by-default (blueprint §21, concept.md §16.1): a command with no explicit declaration is unreachable by any non-owner user.

**Deployment — the only road to live.** Build → stage on `swastik-staging` → the 19-step validation → staging smoke load + readiness checks → atomic promotion onto the volume matching the declared tier (tier-at-rest, blueprint §15.8/§15.9) → reload within the ADR-006 boundary. Never copy anything directly into `MODULES_DIR`. A failed validation is a module defect to fix, never a gate to bypass.

**Fence.** Framework code (`src/module-system/`, `src/middleware/`, `src/permissions/`, the `src/commands/` router, renderer internals, `packages/swastik/`) is READ-ONLY for MR items. Framework defects found during live verification go to the out-of-scope findings register. `documentation.md` is the archived legacy record — never an implementation source.

**Done means live-verified:** blind discovery picks the module up with zero registry edits; its commands register in a test guild; interactions follow buffer-then-render; permissions resolve through the engine; and the module's done-gate below passes against the running bot.

| Item | Module | Tier | Read before coding | Done-gate |
|---|---|---|---|---|
| MR-1 | `hello-world` | Standard | `interface.md` hello-world division + the §10.10 testing checklist (UR 2.0 CF-17: "Division 8.10" was a miscite); blueprint §11, §12.21 | Every §10.10 checklist item passes live |
| MR-2 | `health` | Core | `interface.md` `/health` card spec | Full card renders exactly; edit-in-place only, never a second message |
| MR-3 | `browse` | Core | `interface.md` browse division | Install/uninstall round-trips through the Swastik pipeline |
| MR-4 | `queue` | Core | `interface.md` queue division; blueprint §17.8 + §17.8.1 (BCCM, `guild_command_queue`) | Renames/aliases/disables queue in the 12–13h window, respect Discord's 200/day creation limit, honest pending UI |
| MR-5 | `persona` | Core | `interface.md` persona division; blueprint §35; ADR-008, ADR-011 | Activated personas + command inventory per spec |
| MR-6 | `permit` | Core | `interface.md` permit division; blueprint §21; concept.md §16.1 | Grants resolve through the seven-layer engine with exact L6/7 vocabulary |
| MR-7 | `modules` | Core | `interface.md` modules division | Uninstall removes a module's commands; disabled handlers stop firing |
| MR-8 | `dashboard` | Core | `interface.md` dashboard division (§0.4, §3.4–§3.7) | Edit-in-place on every interaction; dropdown present on every page; navigates to every live module |

**Ledger.** Add the MR-1…MR-8 rows to the ledger's summary table on the first MR session (if not already present), with per-item records in the standard M-item shape.

### M9 — Remaining Implementation-Flaw Corrections

**Request rows owned:** 57 rows (§3.0) — the program rows UR-01, UR-07, UR-17, UR-24, UR-31 and every suite row not owned by M0–M8, including the residual clauses of rows M0 closed PARTIAL (UR-A-03's middleware wiring, UR-C-07's hash verify/quarantine/cache-busted imports, UR-B-02's and UR-C-01's remaining clauses, UR-C-03, UR-C-04).
**Tree state (UR 2.0 evidence — §3.0.3):** `m9-*` suites present and UR-B-19 `createHmac` implemented; the runtime is inert (no queues, scheduler, gateway handlers, tracing or metrics) and CI hygiene (SHA-pin / secrets-off-`run:` / Dependabot) is outstanding (E1 §2.2; E5 §31).
**Source of truth:** `docs/ur/UR-20260918-001` §8.1.2 — the suite rows not owned elsewhere, EXCLUDING the P0 rows already closed in M0.
**What changes:** work the rows one by one: CLAI's functional console (UR-01 landing via UR-A-02/UR-B-09/UR-C-06), control-plane adapters and the shared 501 class in the error boundary (UR-B-08), the credentials domain (UR-17 landing via UR-B-05/UR-C-04/UR-C-05), PEP observe/read functions (UR-24 via UR-B-08's family), the middleware/scheduler/tracing/analytics wiring (UR-C-09, UR-A-20, UR-A-14, UR-A-21), CI hygiene (UR-C-13/UR-B-21's root `.github/`), env/config drift, and the rest of the table. Global Data Emit (UR-07) and the per-guild MDIS sync (UR-31) land here too — see the coverage notes in §3.0. Treat each row as a mini-item: read the row, fix it, test it, log it.
**Blast radius:** per flaw row — declare it in the ledger before each fix.
**Done-gate:** every row has a ledger record with its proving test, and every closed row has its change-log line (R11).

### M10 — Terminology & Legacy-Name Sweep

**Request rows owned:** UR-03 (row 3) and the residual sweep.
**Source of truth:** change-log "Changed — shared facts": "DRM" → **Release Manager** (with reverse GitHub sync), "Twill" → **Twixter**, canonical ranks **MODERATOR / ADMINISTRATOR**.
**What changes:** sweep the remaining legacy names across code, tests, comments, config keys, and commit messages going forward. Text-level only — no behavior changes in this item.
**Blast radius:** every file containing a legacy name (mechanical, textual).
**Done-gate:** a grep for the legacy names returns nothing outside the frozen docs/ur/ provenance records.

### M11 — Convergence Pass (the only full-project gate)

**Request rows owned:** UR-13, UR-14 (rows 13–14) and the reconciliation.
**Source of truth:** the master prompt §3 (audit protocol) and §6 (enforcement pass).
**What changes:** NOW, and only now, run the full audit: `tsc --noEmit` across the project, the full test suite, the behavioral checks. Everything already migrated must be COMPLETE. Out-of-scope findings accumulated in the ledger are triaged: ones that belong to a v5.0.0 delta item go back to that item (reopened); ones that predate the re-baseline and are unrelated to it are recorded as regular backlog, NOT fixed under this prompt. Then the two reconciliations this prompt adds: (a) the coverage map — every one of the 121 UR rows is DONE or has a routed PARTIAL record, 0 orphans; (b) the change-log — every DONE and PARTIAL row in the ledger has its change-log line, and the counts match.
**Done-gate:** the ledger is all-DONE; the audit is all-COMPLETE on the migrated subsystems, the live modules included; both reconciliations pass; the handoff note in the ledger says the master prompt is now the governing protocol again.

---

## 4. THE PER-ITEM EXECUTION LOOP

For every item M0–M11, execute exactly this loop, in this order:

1. **Claim the item.** Set its ledger entry to IN-PROGRESS with the date. If it is already IN-PROGRESS from an earlier session, read the resume note and continue from it — do NOT restart the item from scratch.
2. **Read the sources of truth.** The sections named in the item. Full sections, not summaries. If an ADR is named, read it before making the choice it governs.
3. **Triage the rows you own.** For each request row in your coverage (§3.0), check the tree — not the UR document — for what is already fixed. The UR is a frozen provenance record verified at `be39a52`; the tree may have moved past it (three P0 rows were already fixed at M0 triage). Record the triage in the ledger before editing.
4. **Map the blast radius.** List the files/directories the item may touch. Record it in the ledger. This list is a contract — R2 enforces it.
5. **Implement.** Write the code. Stay inside the fence.
6. **Write/update the tests.** The done-gate criteria of the item, expressed as tests that fail before and pass after. Prove the fail-before with a revert/stash experiment, and record which assertions are mechanism gates and which are no-regression controls.
7. **Verify.** Run the item's tests and typecheck the blast-radius paths — and the FULL unit suite at the end of every slice (see §5; this is a standing constraint the hard way). Behavioral verification beats structural: it must WORK as specified, not merely compile.
8. **Record out-of-scope findings.** Any error or defect you noticed outside the fence → ledger, not fixes (R3).
9. **Write the change-log line(s) (R11).** One line per request row this pass closed, in the format §6 defines. PARTIAL rows get their line with routing; OPEN rows get none yet.
10. **Close the item (or slice).** Set the ledger entry (or slice record) to DONE with: what changed, which spec sections drove it, which tests prove it, what was deliberately NOT done and where it is routed, and any judgment calls made. Commit/checkpoint.
11. **Advance.** Move to the next item. Do not look back; the convergence pass (M11) catches stragglers.

---

## 5. SLICE MECHANICS (HOW OVERSIZED ITEMS RUN)

An item whose blast radius cannot land in one session is worked in **slices**: scoped sub-units, each with its own declared blast radius, its own record in the ledger, and its own gate. M0 already runs this way — slices 1–5 are the reference implementation. The rules:

1. **A slice is claimed, not improvised.** Its scope (rows + findings covered), blast radius, and verification plan are written into the ledger BEFORE the first edit (R2 applies per slice, not just per item).
2. **Triage before code.** Start every slice with a read-only survey of the rows it covers, against the tree, not the UR text. The tree is the source of truth for what is already fixed; re-fixing landed rows is the opportunistic rewrite R4 forbids.
3. **Fail-before/pass-after proof.** Every slice's gate includes at least one proving test verified by reverting the slice's files to HEAD and re-running: the test must fail on the reverted tree and pass on the restored one. Record which assertions are mechanism gates vs. no-regression controls that pass in both states — a control is not a gate, and a tautological assertion is worse than none.
4. **The full suite is the gate, not the net.** Run the entire unit suite at the end of every slice. Three consecutive M0 slices shipped or nearly shipped collateral breaks that a targeted net missed. A slice is not green until the whole suite is.
5. **PARTIAL with routing beats force-fitting.** A row whose full remedy depends on another item's rows (by the UR's own dependency column) closes PARTIAL in this slice, with the dependency named and the residue routed to the owning item. Never do a later item's work out of order to make a counter reach its target.
6. **Slice records live under the item record** (shape in the ledger template §4), and each one ends with its own status line and, if the item is not finished, the next slice's candidate scope.

---

## 6. THE CHANGE-LOG PROTOCOL (R11 IN DETAIL)

The v5.0.0 entry of `docs/change-log.md` adopts the per-request record discipline: *every subsequent change keyed to a request of the v5.0 program records its own change-log line citing the request ID; the master traceability index is the consolidated request's §8.1.2 table.* This protocol extends that discipline from documentation changes to the code migration:

- **Where:** the "v5.0.0 implementation track — per-request record" section of `docs/change-log.md`.
- **When:** at slice/item close (loop step 9), for every row that reached DONE or PARTIAL in that pass. OPEN rows get no line yet.
- **What each line records:** the request ID, its UR §8.1.2 row number, the ledger item/slice that landed it, a one-clause record of the change, the status (DONE / PARTIAL-routed), and the proof (test name or revert experiment).
- **Protocol revisions of this prompt or the ledger template** are recorded as lines in the same section, citing their own version history (Appendix A) — this prompt is a governed document like any other in the set; its revisions are change-log events, not silent edits.
- **Backfilling:** lines missed before R11 existed are recorded at discovery with their true landing dates (M0 slices 1–5 have been backfilled in the change-log at the time of the 5.1.0 revision). Backfills are logged as deviations in the ledger.
- **Ahead-of-record work (UR 2.0 SC-02):** implementations the tree already contains before the protocol recorded them — the M1–M9-shaped code (tier volumes, unified commands, Renderer, license machine, promotion pipeline, persona model, envelope encryption) — get their R11 lines written at reconciliation (§3.0.2), marked **PRESENT IN TREE (uncredited pending UR §8.1.3 #19)**. Crediting them as DONE/PARTIAL is the open policy question; record, never assume.
- **Format (clarified per E6 GOV-27):** the actual change-log M0 table is five columns — `Request | Row | item/slice | Record | Status` — with the proof folded into the Record cell. That shape is compliant; M11's reconciliation must read it as the norm, not as a missing column.
- **Debt for this protocol's own earlier versions (E6 GOV-23):** migration-prompt 5.0.0/5.0.1/5.0.2 (2026-09-24/25) and template v1.0 carried no change-log lines. Record them in the implementation track as a backfill (dated to their original issue dates) at the next change-log edit — the same discipline this prompt demands of every other document.
- **Reconciliation:** M11's done-gate includes a count match — ledger rows DONE/PARTIAL vs. change-log lines, and the 121/121 coverage map. Any mismatch fails the convergence pass.

---

## 7. WHAT THIS PROMPT FORBIDS (THE DRIFT KILLERS)

You are explicitly forbidden, for the entire duration of this migration, from:

- Overwriting, re-initializing, or re-creating `migration-ledger.md` (or copying `docs/migration-ledger-template.md` over it) — the ONE exception being the first-session construction sanctioned by the CURRENT STATE section above. The live ledger is the source of truth; resume from it.
- Following the work order verbatim without first reconciling the state of record (R12, §3.0.2) — the UR 2.0 risk of redoing landed work or reopening closed rows.
- Leaving a true-unknown finding (§3.0.4) unowned and unrecorded — each must be assigned an owner, a new row, or a logged deviation (E1 §5).
- Running a full-project `tsc --noEmit` fix-loop before or between items (only at M11).
- Fixing compile errors in files outside the current blast radius (log them, R3).
- Deleting or rewriting bootstrap, DI, shutdown, or any core subsystem not named in the current item's blast radius.
- Re-scaffolding the workspace, upgrading dependencies, changing the test framework, reformatting untouched files, or "improving" code you happen to be reading.
- Re-doing the documentation audit of the whole system — the docs are DONE at 5.0.0; the code is catching up.
- Starting an item before the previous one is DONE in the ledger.
- Declaring an item, slice, or the migration complete while any ledger item is not DONE, or while any closed request row lacks its change-log line (R11).

---

## 8. COMPLETION

The migration is complete when: the state-of-record reconciliation (R12) is recorded (every row re-triaged against the tree; ahead-of-record work credited or carried per UR §8.1.3 #19); every item in the work order — M0–M11 and MR-1–MR-8 — is DONE in the ledger; the convergence pass is green; the coverage map reconciles (121 rows, 121 owners, 0 orphans); every DONE and PARTIAL row has its change-log line; the UR 2.0 completion criteria that touch the corpus (its §12.1: spec-corpus defects repaired, state of record reconciled, `packages/modules/` documented, every true unknown owned) are met; every §3.0.4 true unknown has an owner or a logged deviation; and the ledger's final entry hands control back to the Master Build Prompt as the governing protocol.

**Anything less is not done. Anything more (out-of-scope fixes smuggled in) is a defect of this protocol's execution and must be reverted or recorded in the ledger as a deviation.**

---

## Appendix A — Revision History of This Prompt

This prompt is a governed document: its revisions are change-log events (recorded in `docs/change-log.md`, v5.0.0 implementation track) and are never silent edits.

| Version | Date | Author | Change |
|---|---|---|---|
| 5.0.0 | 2026-09-24 | Dumby Core Engineering | First release: the twenty-item delta work order against the freshly re-baselined v5.0.0 corpus |
| 5.0.1 | 2026-09-25 | Dumby Core Engineering | Work-order refinements from the first sessions; ledger checkpoint rules tightened |
| 5.0.2 | 2026-09-25 | Dumby Core Engineering | Absorbed and superseded `module-rewrite-prompt.md` and `one-time-mr-prompt.md` (both obsolete, discarded); added the MR-1…MR-8 module-rewrite block |
| 5.1.0 | 2026-09-30 | Dumby Core Engineering | Governance revision after M0 slices 1–5: withdrew the destructive first-run ledger-copy instruction (the ledger is live — resume it); added R11 and §6 (change-log lines are part of the done-gate, per the UR-20260918-001 §8.8 discipline the 5.0.x prompt never enforced); added §3.0 request-row coverage map (all 121 UR rows assigned; UR-07 and UR-31 gain an owning item); added §5 slice mechanics (triage-before-code, fail-before/pass-after, full-suite gate, PARTIAL-with-routing — the conventions M0 earned); fixed the malformed MR table, the block count, and the `release_manager` path |
| 5.2.0 | 2026-10-01 | Dumby Core Engineering | Conformance-reconciliation revision after UR-20260918-001 advanced to revision 2.0 (the E1–E10 Conformance & Audit Evidence Set): corrected the migration state of record (M0 tally 5 DONE / 9 PARTIAL / 3 OPEN — UR-B-01/UR-B-03/UR-C-06 reopened; M1–M9-shaped code present in the tree); added rule R12 and §3.0.2 (state-of-record reconciliation gate); added §3.0.1 (evidence corpus); corrected the MR module source home to `packages/modules/`; fixed the MR-1 §10.10 checklist citation; extended §6 (ahead-of-record R11 backfill) and §7; added the UR 2.0 completion criteria to §8 |
| 5.3.0 | 2026-10-01 | Dumby Core Engineering | Evidence-extraction revision — read all ten evidence documents (E1–E10) finding-by-finding: added the ahead-of-record **provenance** (commits `d334cfb`/`581499e`, 2026-09-26; prior ledger removed at `9f7e427`), the per-item **tree-state evidence map** (§3.0.3), the **true-unknowns register** (§3.0.4), the classification matrix and executed 876/876 verification (§3.0.1), the volume-path vocabulary, the §1.3 extraction ledger, and the change-log debt for the prompt's own earlier versions (§6). Recorded the E9/Audit_2 `packages/modules` contradiction as an evidence-set inconsistency |

*End of Re-Baseline Migration Prompt. Version 5.3.0. Record all future revisions in `change-log.md` (implementation track) and in Appendix A.*
