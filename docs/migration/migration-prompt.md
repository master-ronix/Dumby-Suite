---
id: MIGRATION-MIGRATION-PROMPT-MD
title: Re-Baseline Migration Prompt
kind: engine
status: engine
version: 5.2.0
chain_role: migrate
preceded_by: prompts/meta-prompt.md (State B)
handoff_to: upgradation/change-log.md
change_log: upgradation/change-log.md
---

# DUMBY — Re-Baseline Migration Prompt

## 1. Identity

- **Chain role:** *migrate* — the delta protocol of the trigger chain.
- **Preceded by:** `prompts/meta-prompt.md` (activation), which hands off here on **State B (existing codebase)**.
- **Hands off to:** the change-log record sink (every closed request row records itself there), then returns to `prompts/meta-prompt.md`.
- **Authority:** `spec/` is the sole architectural authority; the precedence order is stated once, in `spec/governance/directive-charter-how-to-use-this-document.md`. The frozen request records in `upgradation/` are provenance. This prompt is a scoped *predecessor* to `orchestration/master-prompt.md`: when every work-order item is DONE, the master prompt's audit and enforcement become the governing protocol again — not before.

## 2. Purpose

Bring an existing codebase — or an existing corpus — up to the current specification, one item at a time, in a fixed order. It does **not** audit the whole codebase and does **not** drive everything to 100% compliance: it lands the re-baseline deltas into the code, with a ledger that survives across sessions and a change-log line for every request row it closes. It is the correct protocol when the code and the specification are at different versions; the master prompt is the wrong protocol then, because it would mark nearly every subsystem faulty at once and produce wandering.

**This protocol fires only when an active work order exists.** An active work order exists only while the live ledger `migration-ledger.md` carries at least one item not `DONE`; request records are discovered dynamically (there is no static list) and are provenance — a record alone does not open the work order, because the delta it names is open only while the ledger holds it. With no open item there is nothing to migrate: this protocol does not run, and the chain hands to **State C (enforcement)** — `orchestration/master-prompt.md` §3 audit and §6 enforcement govern instead.

**Document type:** Migration Prompt — a scoped, delta-driven execution protocol. This is NOT the Master Build Prompt (`orchestration/master-prompt.md`, triggered via `prompts/meta-prompt.md`). It does not audit the whole codebase and it does not drive everything to 100% spec compliance. It does exactly one thing: lands the re-baseline deltas into the code, one item at a time, in a fixed order, with a ledger that survives across sessions and a change-log line for every request row it closes.

**Project:** Dumby — Discord Unified Modular Bot System

**Protocol revision:** 5.2.0 — the tri-state chain's migration protocol; it lands the re-baseline work-order deltas one item at a time.

**Derived from:** the change-log record sink, the frozen request record, and `spec/` (sole architectural authority).

**When to use this prompt:** the codebase exists and was built against a spec version older than the documentation. Your job is to migrate the code, not to re-audit or re-scaffold it.

**CURRENT STATE — read before anything else.**

- **State of record:** State C — Enforcement. Work order **INACTIVE** (the migration ledger holds no open code item; request records are read from the live glob).
- **Current item:** none open in the code work order (M82 closed as superseded by M83; M74's model confirmed — its implementation is a code-track item).
- **Reconciliation:** re-triaged against the tree at `feature/dev` @ `7a58779` (2026-10-21).
- **Blocker:** the application toolchain (`tsc` / `vitest`) and a live Discord run are required to verify any landed slice; resume from the live `migration-ledger.md`, never from this snapshot.

**Relationship to the Master Build Prompt:** this prompt is a scoped *predecessor* to it. When every item in the Migration Work Order (§3) is marked DONE in the ledger, the master prompt's audit protocol and enforcement pass become the governing protocol again — not before.

## 3. Preconditions

- Invoked by `prompts/meta-prompt.md` with State B, or directly as a migration request.
- **An active work order exists** (§2): the live `migration-ledger.md` carries at least one item not `DONE`. If it holds no open item, STOP — return to `prompts/meta-prompt.md`; the run is State C (enforcement), not migration.
- `apps/main/` contains code built against a specification older than the current one.
- The state of record has been reconciled before any item executes: the ledger is rebuilt from `migration/ledger-template.md`, and all request rows are re-triaged against the tree, not the snapshot.

## 4. Inputs

| Input | Path | Use |
|-------|------|-----|
| Corpus manifest | `manifest.json` | the normative artifact set |
| Governance precedence | `spec/governance/directive-charter-how-to-use-this-document.md` | the authority order |
| Department specs | `spec/<department>/` | the current specification to migrate to |
| Frozen request records | `upgradation/UR-*.md` (dynamic) | the request work order |
| Change log | `upgradation/change-log.md` | the state of record and the record sink |
| Ledger template | `migration/ledger-template.md` | the ledger record shapes |
| Capability ledger | `status/capabilities.json` | build / defer decisions |

## 5. Ordered Steps

The protocol executes as the ordered sections below; their internal numbering is retained so the cross-references within the protocol resolve.

### 0.0 THE WORK-ORDER GUARD (run first)

**If no active work order exists, this protocol does not run.** An active work order exists only while the live ledger `migration-ledger.md` carries at least one item not `DONE` (request records are provenance, discovered dynamically; a record alone does not open the work order). When the ledger holds no open item, STOP: do not construct a ledger, do not invent work-order items, do not execute this protocol. Return to `prompts/meta-prompt.md`; the run is **State C (enforcement)**, and `orchestration/master-prompt.md` §3 audit and §6 enforcement govern. A migration with an empty work order is the exact failure this guard exists to prevent.

---

### 0. THE ONE-SENTENCE CONTRACT

> You execute the Migration Work Order (§3) item by item; you touch ONLY the files inside the current item's blast radius; you fix ONLY the compile/test errors the current item creates; everything else you find is LOGGED, never fixed; every request row you close gets its change-log line; and you checkpoint after every item so the next session resumes instead of restarting.

If you ever find yourself doing something this sentence does not describe, stop and re-read it.

---

### 1. WHY THIS PROMPT EXISTS (READ ONCE)

The master prompt is an audit-to-full-compliance protocol: it classifies every subsystem against the CURRENT spec and remediates everything that deviates. That is the correct protocol when code and docs are at the same version. It is the WRONG protocol when the docs just jumped a major version over the code:

- Auditing a v4-era codebase against the current spec marks nearly every subsystem FAULTY at once. "Remediate everything" is not a workable instruction — it produces wandering.
- The master prompt's severity ordering puts compile-blocking faults first. On a re-baselined codebase almost everything fails to compile, so the agent spends its whole budget chasing typecheck errors across files the changelog never asked to change — and rewrites whatever stands in the way of a clean compile (e.g. bootstrap).
- "Never stop until all-COMPLETE" with no finite work list gives the agent no natural stopping point.

This prompt fixes that by giving you a FINITE, ORDERED work list derived from the change-log delta, a hard scope fence around each item, a ledger so progress accumulates across sessions, and a change-log protocol so every landed row is traceable to its source request.

#### 1.1 Corrections made in 5.2.0

No separate corrections log is maintained here. The protocol's revision history is the **single history** in `upgradation/change-log.md` (the record sink), so a correction is recorded there, never restated here.

#### 1.2 Corrections made in 5.2.0

As §1.1 — absorbed corrections are recorded in `upgradation/change-log.md`, the single history, not duplicated in this protocol.

#### 1.3 What the 5.2.0 extraction added (finding-by-finding)

The finding-by-finding additions landed from the evidence set are recorded in `upgradation/change-log.md` and in the live `migration-ledger.md`, which is the source of truth for what landed. This protocol cites them rather than restating them.

---

### 2. HARD RULES — THE SCOPE FENCE

These rules override every other instruction you may have read in the documentation set. They govern this entire prompt.

**R1 — The work order is the work.** The ONLY code changes you make are those required by the current Migration Work Order item (§3). You do not fix, clean, refactor, upgrade, or "improve" anything outside the current item — even if it is broken, even if it fails typecheck, even if it looks wrong, even if the spec elsewhere says it should be different.

**R2 — Blast radius before edits.** Before writing a single line of code for an item, write down the item's blast radius: the exact list of files and directories this item is allowed to touch. Write it into the ledger entry for that item BEFORE you start. If a file is not in the blast radius, it is read-only for this item.

**R3 — Log, don't fix.** When you encounter a compile error, failing test, or defect in a file OUTSIDE the current blast radius: record it in the ledger under `Out-of-scope findings`, note which work-order item (if any) it belongs to, and move on. Do not fix it now. The only exception is a one-line mechanical unblocking fix (e.g. an import path rename caused by an earlier item) — allowed, but must be logged.

**R4 — No opportunistic rewrites.** Deleting a file, re-scaffolding a directory, or rewriting a working implementation from scratch is forbidden unless the current work-order item explicitly requires it. "The code is old" or "the spec is nicer than the code" is never a reason. Bootstrap, DI, shutdown, and every other core subsystem are READ-ONLY unless the current item names them in its blast radius.

**R5 — Compile checks are per-item gates, not a global pre-pass.** You run `tsc --noEmit` (and the test suite for the affected subsystem) at the END of each item, on the paths in that item's blast radius. You do NOT run a full-project typecheck-first loop. Errors outside the blast radius are out-of-scope findings (R3). A full-project green build is only required at M11 — the convergence pass, the final item.

**R6 — Checkpoint or it didn't happen.** After each item (and each slice) is verified: commit the work, and update the ledger entry to DONE with a one-paragraph record of what changed, which spec sections drove it, and which tests prove it. An item without a ledger record is not done. A checkpoint without its change-log line (R11) is not done either.

**R7 — Stop at the fence line of your budget.** If your session budget is nearly exhausted mid-item, STOP, record the item as IN-PROGRESS with a precise resume note in the ledger, and end. A clean handoff is worth more than a half-finished sprawl. NEVER start an item you can see you cannot finish.

**R8 — The spec wins, but only where the delta reaches.** Inside the current blast radius, implement to the spec exactly (precedence: `spec/` > `spec/governance/` > `spec/request-layer/` > `spec/architecture/directory-file-structure.md`; binding ADRs in `adr/`). Outside it, the codebase's current behavior stands until its own item says otherwise.

**R9 — Canonical vocabulary from line one.** Every line you write or touch uses the canonical vocabulary: **Twill** (persona), **Release Manager**, **MODERATOR / ADMINISTRATOR**, buffer-then-render, formal notice frame, tier volumes. No legacy names in new code. (The full sweep of legacy names in UNTOUCHED files is its own final item — do not do it early.)

**R10 — One item at a time, in order.** You do not interleave items, work ahead, or batch "quick wins" across items. The order in §3 is the order. Each item builds on the completed ones before it.

**R11 — The change-log line is part of the done-gate.** When a work-order item (or slice) closes request rows in code, you append one line per closed row to the change-log record sink under the **implementation track — per-request record** (format in §6). An item is not DONE while any row it closed lacks its line. Rows that close PARTIAL get their line with the PARTIAL status and the routing; rows that stay OPEN get none until they close. Missed lines are backfilled at discovery, logged as a deviation — never skipped, never batched to "later" without a ledger record.

**R12 — Reconcile the state of record before you execute.** Before claiming any M-item, run the state-of-record reconciliation (§3.0.2): rebuild the ledger from the template's shapes and re-triage every row the item owns against the TREE at working HEAD — never against the snapshot or the UR text, which are frozen and lag the tree. Following the work order verbatim without reconciling would redo landed work or reopen closed rows. Ahead-of-record work is recorded as **PRESENT IN TREE** with its evidence; whether it is credited as DONE/PARTIAL is governed by the open policy question and must not be decided unilaterally — until it is, such rows stay recorded-but-uncredited, never silently marked DONE and never marked NOT STARTED.

---

### 3. THE MIGRATION WORK ORDER

<!-- The work order is authored here. Each item below names its source of truth, the rows it
     owns (§3.0), its blast radius, and its done-gate. Populate each item before it is worked. -->

**This section is a template; the live work order is `migration-ledger.md`.** Every token below (`<rows>`, `<n>`, `<version>`, `<ID>`) is a *shape*, never a value. Items are executed strictly in order, in three blocks: the framework block (M0–M8), the module-rewrite block (MR-1–MR-8), then the closing framework items (M9–M11).

**The ledger relationship.** `migration-ledger.md` at the repository root is the live, authoritative progress record — once it exists. Construct a fresh ledger from `migration/ledger-template.md`'s record shapes, seeded with the template's §2 snapshot — built entry by entry, never by copying the template file wholesale. From then on: read the ledger at the start of every session; update it at the end of every item and slice; never overwrite or re-create it.

The framework items are sequenced infrastructure-first: layout and plumbing before presentation, presentation before permissions, permissions before governance. The module-rewrite block follows the framework it depends on, and precedes the convergence pass so that M11 audits the live modules too. This ordering is deliberate — do not reorder it without recording the reason in the ledger.

#### 3.0 Request-Row Coverage Map (the traceability contract)

The governing program record puts all requests in one master table (its §8.1.2). Every row is owned by exactly ONE work-order item below. At item-claim time, copy your item's rows into the ledger's row-triage field; at M11 the counts must reconcile — the live counts are read from `migration-ledger.md` and the request records; this template fixes no value.

| Item | Owns UR §8.1.2 rows (request IDs) | Count |
|---|---|---|
| M0 | <rows> | <n> |
| M1 | <rows> | <n> |
| M2 | <rows> | <n> |
| M3 | <rows> | <n> |
| M4 | <rows> | <n> |
| M5 | <rows> | <n> |
| M6 | <rows> | <n> |
| M7 | <rows> | <n> |
| M8 | <rows> | <n> |
| MR-1…MR-8 | <rows> | <n> |
| M9 | <rows> | <n> |
| M10 | <rows> | <n> |
| M11 | <rows> | <n> |

<!-- Coverage notes: rows named by no work-order item are assigned by a logged deviation,
     never silently. Shared-carrier rows record, per program row, which suite rows carried it. -->

#### 3.0.1 The Evidence Corpus

<!-- Accumulated evidence corpus: registered verification records, the classification matrix,
     and the executed verification result. Populate at reconciliation. -->

#### 3.0.2 The State-of-Record Reconciliation Gate (R12) — run before the first item

Before any M-item beyond an already-in-flight slice, perform, and record in the ledger:

1. **Rebuild the ledger from the tree.** Construct the fresh ledger (template shapes), then re-triage **all rows** against working HEAD — for each row: `DONE / PARTIAL / PRESENT-IN-TREE / ABSENT`, with the file/test evidence that proves it. This supersedes the template's §2 snapshot, which is a starting orientation only.
2. **Correct the in-flight item's record** against the tree's true state.
3. **Record ahead-of-record work.** For each implementation the triage finds already present, write the R11 change-log line the protocol owed — marked **PRESENT IN TREE (uncredited pending the open policy question)**. Do not credit it as DONE; do not leave it invisible.
4. **Record state corrections** to line counts and legacy names discovered during reconciliation.
5. **Resolve or carry the blocking open questions** — each is OPEN and gates a specific item's start.

Until steps 1–3 are recorded, no item past the in-flight slice may be claimed.

#### 3.0.3 Tree-State Evidence Map (what the tree already contains, per item)

<!-- Starting map for the R12 re-triage — it does not replace it (the tree at working HEAD is
     the source of truth). Populate per item with file-and-test evidence. -->

| Item | Present in the tree (evidence) | Gap / not yet present | R12 verdict so far |
|---|---|---|---|
| — | — | — | — |

#### 3.0.4 True-Unknowns Register (findings with no owning item)

<!-- Findings with no owning work-order item. Each must receive an owner, a new row, or a
     logged deviation — they cannot simply stand. Populate at reconciliation. -->

#### M0 — <title>

**Request rows owned:** <rows>.
**Source of truth:** <documents, sections, ADRs to read before coding>.
**Tree state (R12 reconciliation):** <reconcile against working HEAD>.
**What changes:** <the delta this item lands>.
**Blast radius:** <exact files/directories this item may touch>.
**Done-gate:** <the proving tests and conditions that close this item>.

#### M1 — <title>

**Request rows owned:** <rows>.
**Source of truth:** <documents, sections, ADRs to read before coding>.
**Tree state (R12 reconciliation):** <reconcile against working HEAD>.
**What changes:** <the delta this item lands>.
**Blast radius:** <exact files/directories this item may touch>.
**Done-gate:** <the proving tests and conditions that close this item>.

#### M2 — <title>

**Request rows owned:** <rows>.
**Source of truth:** <documents, sections, ADRs to read before coding>.
**Tree state (R12 reconciliation):** <reconcile against working HEAD>.
**What changes:** <the delta this item lands>.
**Blast radius:** <exact files/directories this item may touch>.
**Done-gate:** <the proving tests and conditions that close this item>.

#### M3 — <title>

**Request rows owned:** <rows>.
**Source of truth:** <documents, sections, ADRs to read before coding>.
**Tree state (R12 reconciliation):** <reconcile against working HEAD>.
**What changes:** <the delta this item lands>.
**Blast radius:** <exact files/directories this item may touch>.
**Done-gate:** <the proving tests and conditions that close this item>.

#### M4 — <title>

**Request rows owned:** <rows>.
**Source of truth:** <documents, sections, ADRs to read before coding>.
**Tree state (R12 reconciliation):** <reconcile against working HEAD>.
**What changes:** <the delta this item lands>.
**Blast radius:** <exact files/directories this item may touch>.
**Done-gate:** <the proving tests and conditions that close this item>.

#### M5 — <title>

**Request rows owned:** <rows>.
**Source of truth:** <documents, sections, ADRs to read before coding>.
**Tree state (R12 reconciliation):** <reconcile against working HEAD>.
**What changes:** <the delta this item lands>.
**Blast radius:** <exact files/directories this item may touch>.
**Done-gate:** <the proving tests and conditions that close this item>.

#### M6 — <title>

**Request rows owned:** <rows>.
**Source of truth:** <documents, sections, ADRs to read before coding>.
**Tree state (R12 reconciliation):** <reconcile against working HEAD>.
**What changes:** <the delta this item lands>.
**Blast radius:** <exact files/directories this item may touch>.
**Done-gate:** <the proving tests and conditions that close this item>.

#### M7 — <title>

**Request rows owned:** <rows>.
**Source of truth:** <documents, sections, ADRs to read before coding>.
**Tree state (R12 reconciliation):** <reconcile against working HEAD>.
**What changes:** <the delta this item lands>.
**Blast radius:** <exact files/directories this item may touch>.
**Done-gate:** <the proving tests and conditions that close this item>.

#### M8 — <title>

**Request rows owned:** <rows>.
**Source of truth:** <documents, sections, ADRs to read before coding>.
**Tree state (R12 reconciliation):** <reconcile against working HEAD>.
**What changes:** <the delta this item lands>.
**Blast radius:** <exact files/directories this item may touch>.
**Done-gate:** <the proving tests and conditions that close this item>.

---

#### The Module Rewrite Block — MR-1 … MR-8

Runs after M8 and before M9. Prerequisites: every item M0–M8 DONE — the modules are rewritten against the interfaces delivered by those items. If any is not DONE when this block is reached, stop and report — never rewrite a module against an interface that does not exist.

Each MR item follows the per-item execution loop (§4) with these bindings:

**Source and target.** <module source home and target layout>.
**Presentation.** <renderer rules>.
**Permissions.** <permission vocabulary and deny-by-default>.
**Deployment — the only road to live.** <build → stage → validate → atomic promotion → reload>.
**Fence.** <framework paths that are read-only for MR items>.
**Done means live-verified:** <the live-verification conditions>.

| Item | Module | Tier | Read before coding | Done-gate |
|---|---|---|---|---|
| MR-1 | <module> | <tier> | <docs> | <done-gate> |
| MR-2 | <module> | <tier> | <docs> | <done-gate> |
| MR-3 | <module> | <tier> | <docs> | <done-gate> |
| MR-4 | <module> | <tier> | <docs> | <done-gate> |
| MR-5 | <module> | <tier> | <docs> | <done-gate> |
| MR-6 | <module> | <tier> | <docs> | <done-gate> |
| MR-7 | <module> | <tier> | <docs> | <done-gate> |
| MR-8 | <module> | <tier> | <docs> | <done-gate> |

**Ledger.** Add the MR-1…MR-8 rows to the ledger's summary table on the first MR session (if not already present), with per-item records in the standard M-item shape.

#### M9 — <title>

**Request rows owned:** <rows>.
**Source of truth:** <documents, sections, ADRs to read before coding>.
**Tree state (R12 reconciliation):** <reconcile against working HEAD>.
**What changes:** <the delta this item lands>.
**Blast radius:** <exact files/directories this item may touch>.
**Done-gate:** <the proving tests and conditions that close this item>.

#### M10 — <title>

**Request rows owned:** <rows>.
**Source of truth:** <documents, sections, ADRs to read before coding>.
**Tree state (R12 reconciliation):** <reconcile against working HEAD>.
**What changes:** <the delta this item lands>.
**Blast radius:** <exact files/directories this item may touch>.
**Done-gate:** <the proving tests and conditions that close this item>.

#### M11 — <title>

**Request rows owned:** <rows>.
**Source of truth:** <documents, sections, ADRs to read before coding>.
**Tree state (R12 reconciliation):** <reconcile against working HEAD>.
**What changes:** <the delta this item lands>.
**Blast radius:** <exact files/directories this item may touch>.
**Done-gate:** <the proving tests and conditions that close this item>.

---

### 4. THE PER-ITEM EXECUTION LOOP

For every item in the work order, execute exactly this loop, in this order:

1. **Claim the item.** Set its ledger entry to IN-PROGRESS with the date. If it is already IN-PROGRESS from an earlier session, read the resume note and continue from it — do NOT restart the item from scratch.
2. **Read the sources of truth.** The sections named in the item. Full sections, not summaries. If an ADR is named, read it before making the choice it governs.
3. **Triage the rows you own.** For each request row in your coverage (§3.0), check the tree — not the UR document — for what is already fixed. The UR is a frozen provenance record; the tree may have moved past it. Record the triage in the ledger before editing.
4. **Map the blast radius.** List the files/directories the item may touch. Record it in the ledger. This list is a contract — R2 enforces it.
5. **Implement.** Write the code. Stay inside the fence.
6. **Write/update the tests.** The done-gate criteria of the item, expressed as tests that fail before and pass after. Prove the fail-before with a revert/stash experiment, and record which assertions are mechanism gates and which are no-regression controls.
7. **Verify.** Run the item's tests and typecheck the blast-radius paths — and the FULL unit suite at the end of every slice (see §5). Behavioral verification beats structural: it must WORK as specified, not merely compile.
8. **Record out-of-scope findings.** Any error or defect you noticed outside the fence → ledger, not fixes (R3).
9. **Write the change-log line(s) (R11).** One line per request row this pass closed, in the format §6 defines. PARTIAL rows get their line with routing; OPEN rows get none yet.
10. **Close the item (or slice).** Set the ledger entry (or slice record) to DONE with: what changed, which spec sections drove it, which tests prove it, what was deliberately NOT done and where it is routed, and any judgment calls made. Commit/checkpoint.
11. **Advance.** Move to the next item. Do not look back; the convergence pass (M11) catches stragglers.

---

### 5. SLICE MECHANICS (HOW OVERSIZED ITEMS RUN)

An item whose blast radius cannot land in one session is worked in **slices**: scoped sub-units, each with its own declared blast radius, its own record in the ledger, and its own gate. The rules:

1. **A slice is claimed, not improvised.** Its scope (rows + findings covered), blast radius, and verification plan are written into the ledger BEFORE the first edit (R2 applies per slice, not just per item).
2. **Triage before code.** Start every slice with a read-only survey of the rows it covers, against the tree, not the UR text. The tree is the source of truth for what is already fixed; re-fixing landed rows is the opportunistic rewrite R4 forbids.
3. **Fail-before/pass-after proof.** Every slice's gate includes at least one proving test verified by reverting the slice's files to HEAD and re-running: the test must fail on the reverted tree and pass on the restored one. Record which assertions are mechanism gates vs. no-regression controls that pass in both states — a control is not a gate, and a tautological assertion is worse than none.
4. **The full suite is the gate, not the net.** Run the entire unit suite at the end of every slice. A slice is not green until the whole suite is.
5. **PARTIAL with routing beats force-fitting.** A row whose full remedy depends on another item's rows (by the UR's own dependency column) closes PARTIAL in this slice, with the dependency named and the residue routed to the owning item. Never do a later item's work out of order to make a counter reach its target.
6. **Slice records live under the item record** (shape in the ledger template §4), and each one ends with its own status line and, if the item is not finished, the next slice's candidate scope.

---

### 6. THE CHANGE-LOG PROTOCOL (R11 IN DETAIL)

The implementation track of the change-log adopts the per-request record discipline: *every subsequent change keyed to a request of the program records its own change-log line citing the request ID; the master traceability index is the consolidated request's §8.1.2 table.* This protocol extends that discipline from documentation changes to the code migration:

- **Where:** the "implementation track — per-request record" section of the change-log.
- **When:** at slice/item close (loop step 9), for every row that reached DONE or PARTIAL in that pass. OPEN rows get no line yet.
- **What each line records:** the request ID, its UR §8.1.2 row number, the ledger item/slice that landed it, a one-clause record of the change, the status (DONE / PARTIAL-routed), and the proof (test name or revert experiment).
- **Protocol revisions of this prompt or the ledger template** are recorded as lines in the same section, citing their own version history (Appendix A) — this prompt is a governed document like any other in the set; its revisions are change-log events, not silent edits.
- **Backfilling:** lines missed before R11 existed are recorded at discovery with their true landing dates. Backfills are logged as deviations in the ledger.
- **Ahead-of-record work:** implementations the tree already contains before the protocol recorded them get their R11 lines written at reconciliation (§3.0.2), marked **PRESENT IN TREE (uncredited pending the open policy question)**. Crediting them as DONE/PARTIAL is the open policy question; record, never assume.
- **Format:** the actual change-log table is five columns — `Request | Row | item/slice | Record | Status` — with the proof folded into the Record cell. That shape is compliant; M11's reconciliation must read it as the norm, not as a missing column.
- **Reconciliation:** M11's done-gate includes a count match — ledger rows DONE/PARTIAL vs. change-log lines, and the full coverage map. Any mismatch fails the convergence pass.

---

### 7. WHAT THIS PROMPT FORBIDS (THE DRIFT KILLERS)

You are explicitly forbidden, for the entire duration of this migration, from:

- Overwriting, re-initializing, or re-creating `migration-ledger.md` (or copying `migration/ledger-template.md` over it) — the ONE exception being the first-session construction sanctioned by the CURRENT STATE section above. The live ledger is the source of truth; resume from it.
- Following the work order verbatim without first reconciling the state of record (R12, §3.0.2) — the risk of redoing landed work or reopening closed rows.
- Leaving a true-unknown finding (§3.0.4) unowned and unrecorded — each must be assigned an owner, a new row, or a logged deviation.
- Running a full-project `tsc --noEmit` fix-loop before or between items (only at the convergence pass).
- Fixing compile errors in files outside the current blast radius (log them, R3).
- Deleting or rewriting bootstrap, DI, shutdown, or any core subsystem not named in the current item's blast radius.
- Re-scaffolding the workspace, upgrading dependencies, changing the test framework, reformatting untouched files, or "improving" code you happen to be reading.
- Re-doing the documentation audit of the whole system — the docs are DONE; the code is catching up.
- Starting an item before the previous one is DONE in the ledger.
- Declaring an item, slice, or the migration complete while any ledger item is not DONE, or while any closed request row lacks its change-log line (R11).

---

### 8. COMPLETION

The migration is complete when: the state-of-record reconciliation (R12) is recorded (every row re-triaged against the tree; ahead-of-record work credited or carried per the open policy question); every item in the work order — M0–M11 and MR-1–MR-8 — is DONE in the ledger; the convergence pass is green; the coverage map reconciles (all rows, all owners, 0 orphans); every DONE and PARTIAL row has its change-log line; the completion criteria that touch the corpus are met; every §3.0.4 true unknown has an owner or a logged deviation; and the ledger's final entry hands control back to the Master Build Prompt as the governing protocol.

**Anything less is not done. Anything more (out-of-scope fixes smuggled in) is a defect of this protocol's execution and must be reverted or recorded in the ledger as a deviation.**

---

### Appendix A — Revision History of This Prompt

This prompt is a governed document: its revisions are change-log events and are never silent edits.

| Version | Date | Author | Change |
|---|---|---|---|
| — | — | — | — |

*End of Re-Baseline Migration Prompt. Record all future revisions in the change-log (implementation track) and in Appendix A.*

## 6. Artefacts Produced

| Artefact | Path | When |
|----------|------|------|
| Migration ledger | repository root | rebuilt before the first item, updated per item |
| Code deltas | inside each item's blast radius | per item |
| Change-log lines | change-log record sink | one per closed request row |

## 7. Acceptance Criteria

The migration is complete only when every item in the Migration Work Order is DONE in the ledger, the convergence pass is green, every closed request row has its change-log line, and no out-of-scope finding was silently fixed. At that point the chain hands back to `orchestration/master-prompt.md`.

## 8. Change-Log Record

Per the entry discipline in the change-log, this document writes one **Migration** line per closed request row:

```
- <date> · migration-prompt <version> · item=<ID> · rows=<UR-…> · status=<DONE|PARTIAL|BLOCKED>
```

The line above is a **shape**, not a value: its tokens are filled at item close and never pre-populated.
