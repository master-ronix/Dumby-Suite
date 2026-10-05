---
id: MIGRATION-MIGRATION-PROMPT-MD
title: Re-Baseline Migration Prompt
kind: engine
status: engine
version: 5.1.0
chain_role: migrate
preceded_by: prompts/meta-prompt.md (State B)
handoff_to: upgradation/change-log.md
change_log: upgradation/change-log.md
---

# DUMBY — Re-Baseline Migration Prompt

## 1. Identity

- **Chain role:** *migrate* — the delta protocol of the trigger chain.
- **Preceded by:** `prompts/meta-prompt.md` (activation), which hands off here on **State B (existing codebase)**.
- **Hands off to:** `upgradation/change-log.md` (every closed request row records itself there), then returns to `prompts/meta-prompt.md`.
- **Authority:** `spec/` is the sole architectural authority; the precedence order is stated once, in `spec/governance/directive-charter-how-to-use-this-document.md`. The frozen request records in `upgradation/` are provenance. This prompt is a scoped *predecessor* to `orchestration/master-prompt.md`: when every work-order item is DONE, the master prompt's audit and enforcement become the governing protocol again — not before.

## 2. Purpose

Bring an existing codebase — or an existing corpus — up to the current specification, one item at a time, in a fixed order. It does **not** audit the whole codebase and does **not** drive everything to 100% compliance: it lands the re-baseline deltas into the code, with a ledger that survives across sessions and a change-log line for every request row it closes. It is the correct protocol when the code and the specification are at different versions; the master prompt is the wrong protocol then, because it would mark nearly every subsystem faulty at once and produce wandering.

**Document type:** Migration Prompt — a scoped, delta-driven execution protocol. This is NOT the Master Build Prompt (`orchestration/master-prompt.md`, triggered via `prompts/meta-prompt.md`). It does not audit the whole codebase and it does not drive everything to 100% spec compliance. It does exactly one thing: lands the re-baseline deltas into the code, one item at a time, in a fixed order, with a ledger that survives across sessions and a change-log line for every request row it closes.

**Project:** Dumby — Discord Unified Modular Bot System

**Protocol revision:** <version> — <one-line description of this revision>.

**Derived from:** `upgradation/change-log.md` (the v5.0.0 entry and its per-request record discipline), the frozen request record `upgradation/UR-20260918-001_Consolidated_Re-Baseline_Request.md`, and `spec/` 5.0.0 (sole architectural authority).

**When to use this prompt:** the codebase exists and was built against a spec version older than the documentation (typically v4.6.x). The docs have moved to v5.0.0. Your job is to migrate the code, not to re-audit or re-scaffold it.

**CURRENT STATE — read before anything else.**

<!-- State of record as of the last session. Populate with the current item, the in-flight
     slice, and the reconciliation status before any item executes. -->

**Relationship to the Master Build Prompt:** this prompt is a scoped *predecessor* to it. When every item in the Migration Work Order (§3) is marked DONE in the ledger, the master prompt's audit protocol and enforcement pass become the governing protocol again — not before.

## 3. Preconditions

- Invoked by `prompts/meta-prompt.md` with State B, or directly as a migration request.
- `apps/main/` contains code built against a specification older than the current one.
- The state of record has been reconciled before any item executes: the ledger is rebuilt from `migration/ledger-template.md`, and all request rows are re-triaged against the tree, not the snapshot.

## 4. Inputs

| Input | Path | Use |
|-------|------|-----|
| Corpus manifest | `manifest.json` | the normative artifact set |
| Governance precedence | `spec/governance/directive-charter-how-to-use-this-document.md` | the authority order |
| Department specs | `spec/<department>/` | the current specification to migrate to |
| Frozen request records | `upgradation/UR-20260918-001_Consolidated_Re-Baseline_Request.md` | the 121-request work order |
| Change log | `upgradation/change-log.md` | the state of record and the record sink |
| Ledger template | `migration/ledger-template.md` | the ledger record shapes |
| Capability ledger | `status/capabilities.json` | build / defer decisions |

## 5. Ordered Steps

The protocol executes as the ordered sections below; their internal numbering is retained so the cross-references within the protocol resolve.

### 0. THE ONE-SENTENCE CONTRACT

> You execute the Migration Work Order (§3) item by item; you touch ONLY the files inside the current item's blast radius; you fix ONLY the compile/test errors the current item creates; everything else you find is LOGGED, never fixed; every request row you close gets its change-log line; and you checkpoint after every item so the next session resumes instead of restarting.

If you ever find yourself doing something this sentence does not describe, stop and re-read it.

---

### 1. WHY THIS PROMPT EXISTS (READ ONCE)

The master prompt is an audit-to-full-compliance protocol: it classifies every subsystem against the CURRENT spec and remediates everything that deviates. That is the correct protocol when code and docs are at the same version. It is the WRONG protocol when the docs just jumped a major version over the code:

- Auditing a v4-era codebase against v5.0.0 marks nearly every subsystem FAULTY at once. "Remediate everything" is not a workable instruction — it produces wandering.
- The master prompt's severity ordering puts compile-blocking faults first. On a re-baselined codebase almost everything fails to compile, so the agent spends its whole budget chasing typecheck errors across files the changelog never asked to change — and rewrites whatever stands in the way of a clean compile (e.g. bootstrap).
- "Never stop until all-COMPLETE" with no finite work list gives the agent no natural stopping point.

This prompt fixes that by giving you a FINITE, ORDERED work list derived from the change-log delta, a hard scope fence around each item, a ledger so progress accumulates across sessions, and a change-log protocol so every landed row is traceable to its source request.

#### 1.1 Corrections made in <version>

<!-- Dated corrections to this prompt's earlier versions. Recorded because a protocol that
     drifts from reality is the exact failure mode this program exists to eliminate. -->

| # | Earlier version said | Why it was wrong | The correction |
|---|---|---|---|
| — | — | — | — |

#### 1.2 Corrections made in <version>

<!-- Dated corrections absorbed from the frozen request record. -->

| # | Earlier version said | Evidence | The correction |
|---|---|---|---|
| — | — | — | — |

#### 1.3 What the <version> extraction added (finding-by-finding)

<!-- Dated additions landed from the evidence set. -->

| # | What the evidence set says (with source) | Where it now lives in this prompt |
|---|---|---|
| — | — | — |

---

### 2. HARD RULES — THE SCOPE FENCE

These rules override every other instruction you may have read in the documentation set. They govern this entire prompt.

**R1 — The work order is the work.** The ONLY code changes you make are those required by the current Migration Work Order item (§3). You do not fix, clean, refactor, upgrade, or "improve" anything outside the current item — even if it is broken, even if it fails typecheck, even if it looks wrong, even if the spec elsewhere says it should be different.

**R2 — Blast radius before edits.** Before writing a single line of code for an item, write down the item's blast radius: the exact list of files and directories this item is allowed to touch. Write it into the ledger entry for that item BEFORE you start. If a file is not in the blast radius, it is read-only for this item.

**R3 — Log, don't fix.** When you encounter a compile error, failing test, or defect in a file OUTSIDE the current blast radius: record it in the ledger under `Out-of-scope findings`, note which work-order item (if any) it belongs to, and move on. Do not fix it now. The only exception is a one-line mechanical unblocking fix (e.g. an import path rename caused by an earlier item) — allowed, but must be logged.

**R4 — No opportunistic rewrites.** Deleting a file, re-scaffolding a directory, or rewriting a working implementation from scratch is forbidden unless the current work-order item explicitly requires it (e.g. M1 requires removing `src/modules`). "The code is old" or "the spec is nicer than the code" is never a reason. Bootstrap, DI, shutdown, and every other core subsystem are READ-ONLY unless the current item names them in its blast radius.

**R5 — Compile checks are per-item gates, not a global pre-pass.** You run `tsc --noEmit` (and the test suite for the affected subsystem) at the END of each item, on the paths in that item's blast radius. You do NOT run a full-project typecheck-first loop. Errors outside the blast radius are out-of-scope findings (R3). A full-project green build is only required at M11 — the convergence pass, the final item.

**R6 — Checkpoint or it didn't happen.** After each item (and each slice) is verified: commit the work, and update the ledger entry to DONE with a one-paragraph record of what changed, which spec sections drove it, and which tests prove it. An item without a ledger record is not done. A checkpoint without its change-log line (R11) is not done either.

**R7 — Stop at the fence line of your budget.** If your session budget is nearly exhausted mid-item, STOP, record the item as IN-PROGRESS with a precise resume note in the ledger ("done: X, Y; remaining: Z; next step: read blueprint §21.4 then implement the grant-resolution order"), and end. A clean handoff is worth more than a half-finished sprawl. NEVER start an item you can see you cannot finish.

**R8 — The spec wins, but only where the delta reaches.** Inside the current blast radius, implement to the v5.0.0 spec exactly (precedence: `spec/` > `spec/governance/` > `spec/request-layer/` > `spec/architecture/directory-file-structure.md`; binding ADRs in `adr/`). Outside it, the codebase's current behavior stands until its own item says otherwise.

**R9 — Canonical vocabulary from line one.** Every line you write or touch uses the v5.0.0 vocabulary: **Twill** (persona), **Release Manager**, **MODERATOR / ADMINISTRATOR**, buffer-then-render, formal notice frame, tier volumes. No legacy names in new code. (The full sweep of legacy names in UNTOUCHED files is its own final item, M10 — do not do it early.)

**R10 — One item at a time, in order.** You do not interleave items, work ahead, or batch "quick wins" across items. The order in §3 is the order. Each item builds on the completed ones before it.

**R11 — The change-log line is part of the done-gate.** When a work-order item (or slice) closes request rows in code, you append one line per closed row to `upgradation/change-log.md` under the **v5.0.0 implementation track — per-request record** (format in §6). An item is not DONE while any row it closed lacks its line. Rows that close PARTIAL get their line with the PARTIAL status and the routing; rows that stay OPEN get none until they close. Missed lines are backfilled at discovery, logged as a deviation — never skipped, never batched to "later" without a ledger record.

**R12 — Reconcile the state of record before you execute.** Before claiming any M-item, run the state-of-record reconciliation (§3.0.2): rebuild the ledger from the template's shapes and re-triage every row the item owns against the TREE at working HEAD — never against the snapshot or the UR text, which are frozen and lag the tree. Following the work order verbatim without reconciling would redo landed work or reopen closed rows. Ahead-of-record work is recorded as **PRESENT IN TREE** with its evidence; whether it is credited as DONE/PARTIAL is governed by the open policy question and must not be decided unilaterally — until it is, such rows stay recorded-but-uncredited, never silently marked DONE and never marked NOT STARTED.

---

### 3. THE MIGRATION WORK ORDER

Twenty items in three blocks, executed strictly in order: the framework block (M0–M8), then the module-rewrite block (MR-1–MR-8), then the closing framework items (M9–M11). Each item names: its source of truth (read these BEFORE coding), its blast radius, the request rows it owns (§3.0), and its done-gate.

**The ledger relationship.** `migration-ledger.md` at the repository root is the live, authoritative progress record — once it exists. Construct a fresh ledger from `migration/ledger-template.md`'s record shapes, seeded with the template's §2 snapshot — built entry by entry, never by copying the template file wholesale. From then on: read the ledger at the start of every session; update it at the end of every item and slice; never overwrite or re-create it.

The framework items are sequenced infrastructure-first: layout and plumbing before presentation, presentation before permissions, permissions before governance. The module-rewrite block follows the framework it depends on — command tree, Renderer, RBAC engine, license/compat gates, Swastik pipeline, persona model — and precedes the convergence pass so that M11 audits the live modules too. This ordering is deliberate — do not reorder it without recording the reason in the ledger.

#### 3.0 Request-Row Coverage Map (the traceability contract)

The governing program record (UR-20260918-001) puts all 121 requests in one master table (its §8.1.2): rows 1–31 are the v5.0 program URs (`UR-01`…`UR-31`), rows 32–33 are the RBAC redesign requirements (`R1`, `R2`), and rows 34–121 are the 88 suite correction requests (`UR-A-nn`, `UR-B-nn`, `UR-C-nn`). Its severity vocabulary maps `Critical` → P0, `High` → P1, `Medium` → P2. Every row is owned by exactly ONE work-order item below. At item-claim time, copy your item's rows into the ledger's row-triage field; at M11 the counts must reconcile: **121 rows, 121 owners, 0 orphans.**

| Item | Owns UR §8.1.2 rows (request IDs) | Count |
|---|---|---|
| M0 | the severity-Critical suite rows (= P0) | <n> |
| M1 | | <n> |
| M2 | | <n> |
| M3 | | <n> |
| M4 | | <n> |
| M5 | | <n> |
| M6 | | <n> |
| M7 | | <n> |
| M8 | | <n> |
| MR-1…MR-8 | No source rows of their own — they implement UR-11's Core Command Surface reference set against the M1–M8 interfaces, and verify the suite module-behavior rows at their done-gates | 0 |
| M9 | the program rows and every suite row not owned above, including the residual clauses of rows M0 closed PARTIAL | <n> |
| M10 | the residual legacy-name sweep | <n> |
| M11 | the honesty/measurement audits, plus the 121/121 reconciliation itself | <n> |

<!-- Coverage notes: rows named by no work-order item are assigned by a logged deviation,
     never silently. Shared-carrier rows record, per program row, which suite rows carried it. -->

#### 3.0.1 The Evidence Corpus

<!-- Accumulated evidence corpus: registered verification records, the classification matrix,
     and the executed verification result. Populate at reconciliation. -->

#### 3.0.2 The State-of-Record Reconciliation Gate (R12) — run before M1

Before any M-item beyond an already-in-flight slice, perform, and record in the ledger:

1. **Rebuild the ledger from the tree.** Construct the fresh ledger (template shapes), then re-triage **all 121 rows** against working HEAD — for each row: `DONE / PARTIAL / PRESENT-IN-TREE / ABSENT`, with the file/test evidence that proves it. This supersedes the template's §2 snapshot, which is a starting orientation only.
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

#### M0 — P0 Security Flaws (do first, smallest blast radius, highest stakes)

**Request rows owned:** the severity-Critical suite rows (§3.0).
**Source of truth:** the frozen request record §8.1.2 P0 rows — read the rows before touching anything.
**Blast radius:** only the files named by P0 flaw rows (declared per slice in the ledger).
**Done-gate:** each P0 flaw row has a test that fails before the fix and passes after; no control plane accepts unauthenticated connections; all path handling is contained. A row whose full remedy depends on a P1/P2 row closes PARTIAL with routing evidence, never force-fitted.
**Current state:** <!-- in-flight slices and the reconciled tally. -->

#### M1 — Tier Volumes & Blind Discovery (module relocation)

**Request rows owned:** <rows>.
**Tree state (R12 reconciliation):** <!-- reconcile against working HEAD. -->
**Source of truth:** `spec/architecture/technology-stack-decision-matrix.md`, §7.3, §15.9; `spec/architecture/directory-file-structure.md` (volume layout); ADR-005.
**What changes:** remove `src/modules` (modules never live in the source tree); stand up the four per-tier volumes (`modules-admin`, `modules-core`, `modules-standard`, `modules-marketplace`) plus `swastik-staging` rooted at `MODULES_DIR`; replace any registry seed / hardcoded module list with blind discovery at bootstrap; make the volumes mountable; create the `packages/swastik` authoring package with types, manifest schemas, scoped entry points, and the `_template` module.
**Blast radius:** module loader/registry/discovery code, `src/modules` (removal), `packages/swastik` (new), docker-compose and K8s volume mounts, the bootstrap stage that loads modules.
**Done-gate:** a module placed on a volume is discovered and loaded with zero registry edits; a module anywhere else is not loaded; tier-at-rest is enforced by volume; no `src/modules` directory remains.

#### M2 — Unified Command Tree

**Request rows owned:** <rows>.
**Tree state (R12 reconciliation):** <!-- reconcile against working HEAD. -->
**Source of truth:** `spec/architecture/directory-file-structure.md` (`src/commands/` unified tree); `spec/request-layer/command-framework-routing-engine.md`.
**What changes:** merge the former `src/core/commands` split into the single canonical `src/commands/` tree; exactly one command router remains; remove any orphaned or duplicate router.
**Blast radius:** `src/core/commands` (removal), `src/commands/` (merge target), the router, imports of the moved command files.
**Done-gate:** one router, one tree, no remnant of the split; command registration and collision detection still work.

#### M3 — Core Renderer, Buffer-Then-Render & the Embed Ban (the big one)

**Request rows owned:** <rows>.
**Tree state (R12 reconciliation):** <!-- reconcile against working HEAD. -->
**Source of truth:** `spec/architecture/dependency-injection-service-container.md`, §16.5, §20 (especially §20.8 renderer/presentation grammar and §20.9 buffer embed + formal notice frames), §17.11, §19.2, §28.6; `spec/request-layer/` — the renderer, interaction-lifecycle, and component-dispatch sections, read completely; ADR-001 (embed ban), ADR-002 (DM prohibition), ADR-009 (A4 title/attribution grammar), ADR-010 (accent colour).
**What changes:** build the core Renderer as the single presentation authority — static Components v2 frame grammar with dynamic slots, Modes D/M/C; the buffer-then-render contract on every interaction; formal notice frames with reason codes and trace correlation IDs; the single official accent token `#5865F2` everywhere; the A4 title and attribution grammar; minted stateless customIds with click-time re-authorization, idempotency, the 800 ms autocomplete budget, the 13-minute follow-up watchdog; the absolute embed ban (enforced by a lint/grep gate) and the absolute DM prohibition.
**Blast radius:** renderer, interaction handling, every shipped command's presentation code, the embed-ban lint gate, tests that asserted embed-based output.
**Done-gate:** every user-facing surface is renderer-issued Components v2; the edit-sequence assertion (buffer → exactly one edit) passes on every interaction; a grep gate fails on any classic-embed import or instantiation; no DM path exists on any route including permission-denied and error paths.

#### M4 — RBAC Layer 6/7 Redesign

**Request rows owned:** <rows>.
**Tree state (R12 reconciliation):** <!-- reconcile against working HEAD. -->
**Source of truth:** `spec/request-layer/permission-authorization-engine.md` (the Layer 6 pure-backend rank function and Layer 7 guild-side grants, the exhaustive non-configurable override boundary, Table 21-A); `documentation/overview/` §16.1 (six-rank ladder, grant scopes, RESTRICTED floor).
**What changes:** implement the one normative seven-layer permission ordering; Layer 6 as a pure-backend rank function; Layer 7 as guild-side grants with the "Set" scope semantics; the six-rank ladder with canonical MODERATOR / ADMINISTRATOR names; "OWNER" = the guild's ownership account, distinct from the `BOT_OWNER_IDS` operator override; the `/permit` command surface; the RBAC persistence the suite rows require.
**Blast radius:** `src/permissions/` (resolver, RBAC service), the `/permit` module, permission-related migrations, permission tests.
**Done-gate:** deny-by-default holds; resolution order matches Table 21-A exactly; the override boundary is non-configurable as specified; the resolver is invoked on every dispatch (instrumented test).

#### M5 — License Machine, Compatibility Ledger & Deployment Records

**Request rows owned:** <rows>.
**Tree state (R12 reconciliation):** <!-- reconcile against working HEAD. -->
**Source of truth:** `spec/modules/swastik-hot-reload-dynamic-module-management.md` (six-state license machine with devId binding), §14.4 (Compatibility Ledger gating releases), §15.12 (Deployment Records), §44.8 (versioned OpenAPI API families); `spec/governance/` (rule D-8.10).
**What changes:** implement the six-state license machine with devId binding; stand up the machine-readable Compatibility Ledger of cross-boundary contract version windows; wire it as the release gate (core releases and module deployments); add Deployment Records and the repo-to-running OIDC deployment flow.
**Blast radius:** license/compat subsystem, the release/deployment tooling under `tools/release_manager`, the Swastik promotion gate (integration point only — the pipeline itself is M6).
**Done-gate:** the ledger exists and is enforced (a deployment that violates a contract window is refused); the license state machine transitions only along its six legal edges.

#### M6 — Swastik Promotion Pipeline (staging, atomic promotion, hot reload)

**Request rows owned:** <rows>.
**Tree state (R12 reconciliation):** <!-- reconcile against working HEAD. -->
**Source of truth:** `spec/modules/building-a-module-a-complete-worked-example.md`, §15 (staging, promotion, verified loads), §11.2 (manifest contract); ADR-006 (reload automation boundary).
**What changes:** staging on `swastik-staging`; atomic promotion onto tier volumes; path containment on all module file operations; verified loads (a module that fails validation never goes live); the hot-reload boundary exactly as ADR-006 records it; manifest reading via static extraction, not `import()` (D-4.9); the full manifest contract (visibility enum, hardcode toggle, `depends` pins, tarball upload, category enum, devId/buildId required at upload).
**Blast radius:** the Swastik service and `packages/swastik` integration points, module loader hooks used by promotion, `manifest.schema.ts`.
**Done-gate:** promotion is atomic (a failed promotion leaves the volume untouched); loads are verified; path traversal tests pass; hot reload stays inside ADR-006's boundary.

#### M7 — Twill Persona Model

**Request rows owned:** <rows>.
**Tree state (R12 reconciliation):** <!-- reconcile against working HEAD. -->
**Source of truth:** `spec/operations/multi-identity-operation-twill-personas.md`; ADR-008 (free-charter sunset); ADR-011 (persona surface).
**What changes:** the Twill typed interface and persona model — bring-your-own-identity, single-server-bound; the free-charter sunset behavior; persona surface per ADR-011; the persona bindings and dispatch gate the suite rows require (moduleSlug in the binding key, PERSONA_ID env, occupied-by-another-persona gate).
**Blast radius:** persona subsystem, its migrations and tests.
**Done-gate:** the persona model compiles, is wired to the spec'd surface, and the sunset rule is tested.

#### M8 — Envelope Encryption

**Request rows owned:** <rows>.
**Tree state (R12 reconciliation):** <!-- reconcile against working HEAD. -->
**Source of truth:** `spec/operations/security-architecture-threat-model.md`; ADR-003.
**What changes:** envelope encryption scoped to in-process-readable credentials — exactly the scope ADR-003 records, no wider.
**Blast radius:** the credentials/secrets handling path, its config, its tests.
**Done-gate:** every in-process-readable credential is envelope-encrypted at rest; the scope boundary (what is and is not encrypted) matches ADR-003 exactly.

---

#### The Module Rewrite Block — MR-1 … MR-8 (first-party modules rewritten to v5.0.0 and made live via Swastik)

Runs after M8 and before M9. Prerequisites: every item M0–M8 DONE — the modules are rewritten against the command tree, Renderer, RBAC engine, license/compat gates, Swastik pipeline, persona model, and encryption scope delivered by those items. If any is not DONE when this block is reached, stop and report — never rewrite a module against an interface that does not exist.

Each MR item follows the per-item execution loop (§4) with these bindings:

**Source and target.** The current first-party module sources live in **`packages/modules/<module>/`**. Begin with a salvage audit: keep every behavior v5.0.0 still calls for, and record the kept-vs-superseded split in the ledger. The target is the `swastik` `_template` 11-folder layout with the full v5.0.0 manifest (tier, version, granular permissions, dependencies, configSchema, commands, events, assets), colocated tests, and the en-US base locale.

**Presentation.** Exclusively through the Renderer: Components v2 Modes D/M/C, buffer-then-render (instant buffer embed, exactly one edit into the final render or the formal notice frame with reason code + trace correlation ID), the single official accent `#5865F2`, and the A4 title/attribution grammar — attribution in the footer slot, never the title (ADR-001, ADR-002, ADR-009, ADR-010). No classic `EmbedBuilder`/`MessageEmbed` anywhere in module code; the main bot never DMs.

**Permissions.** Layer 6/7 vocabulary, deny-by-default: a command with no explicit declaration is unreachable by any non-owner user.

**Deployment — the only road to live.** Build → stage on `swastik-staging` → the 19-step validation → staging smoke load + readiness checks → atomic promotion onto the volume matching the declared tier (tier-at-rest) → reload within the ADR-006 boundary. Never copy anything directly into `MODULES_DIR`. A failed validation is a module defect to fix, never a gate to bypass.

**Fence.** Framework code (`src/module-system/`, `src/middleware/`, `src/permissions/`, the `src/commands/` router, renderer internals, `packages/swastik/`) is READ-ONLY for MR items. Framework defects found during live verification go to the out-of-scope findings register. `archive/v4.5.1/documentation.md` is the archived legacy record — never an implementation source.

**Done means live-verified:** blind discovery picks the module up with zero registry edits; its commands register in a test guild; interactions follow buffer-then-render; permissions resolve through the engine; and the module's done-gate below passes against the running bot.

| Item | Module | Tier | Read before coding | Done-gate |
|---|---|---|---|---|
| MR-1 | `hello-world` | Standard | `spec/request-layer/` hello-world division + the §10.10 testing checklist; blueprint §11, §12.21 | Every §10.10 checklist item passes live |
| MR-2 | `health` | Core | `spec/request-layer/` `/health` card spec | Full card renders exactly; edit-in-place only, never a second message |
| MR-3 | `browse` | Core | `spec/request-layer/` browse division | Install/uninstall round-trips through the Swastik pipeline |
| MR-4 | `queue` | Core | `spec/request-layer/` queue division; blueprint §17.8 + §17.8.1 (BCCM, `guild_command_queue`) | Renames/aliases/disables queue in the 12–13h window, respect Discord's 200/day creation limit, honest pending UI |
| MR-5 | `persona` | Core | `spec/request-layer/` persona division; blueprint §35; ADR-008, ADR-011 | Activated personas + command inventory per spec |
| MR-6 | `permit` | Core | `spec/request-layer/` permit division; blueprint §21; `documentation/overview/` §16.1 | Grants resolve through the seven-layer engine with exact L6/7 vocabulary |
| MR-7 | `modules` | Core | `spec/request-layer/` modules division | Uninstall removes a module's commands; disabled handlers stop firing |
| MR-8 | `dashboard` | Core | `spec/request-layer/` dashboard division (§0.4, §3.4–§3.7) | Edit-in-place on every interaction; dropdown present on every page; navigates to every live module |

**Ledger.** Add the MR-1…MR-8 rows to the ledger's summary table on the first MR session (if not already present), with per-item records in the standard M-item shape.

#### M9 — Remaining Implementation-Flaw Corrections

**Request rows owned:** <rows> — the program rows and every suite row not owned by M0–M8, including the residual clauses of rows M0 closed PARTIAL.
**Tree state (R12 reconciliation):** <!-- reconcile against working HEAD. -->
**Source of truth:** the frozen request record §8.1.2 — the suite rows not owned elsewhere, EXCLUDING the P0 rows already closed in M0.
**What changes:** work the rows one by one: the functional console, control-plane adapters and the shared 501 class in the error boundary, the credentials domain, Power Engine observe/read functions, the middleware/scheduler/tracing/analytics wiring, CI hygiene, env/config drift, and the rest of the table. Treat each row as a mini-item: read the row, fix it, test it, log it.
**Blast radius:** per flaw row — declare it in the ledger before each fix.
**Done-gate:** every row has a ledger record with its proving test, and every closed row has its change-log line (R11).

#### M10 — Terminology & Legacy-Name Sweep

**Request rows owned:** the residual legacy-name sweep.
**Source of truth:** change-log "Changed — shared facts": "DRM" → **Release Manager** (with reverse GitHub sync), "Twixter" → **Twill**, canonical ranks **MODERATOR / ADMINISTRATOR**.
**What changes:** sweep the remaining legacy names across code, tests, comments, config keys, and commit messages going forward. Text-level only — no behavior changes in this item.
**Blast radius:** every file containing a legacy name (mechanical, textual).
**Done-gate:** a grep for the legacy names returns nothing outside the frozen upgradation/ provenance records.

#### M11 — Convergence Pass (the only full-project gate)

**Request rows owned:** the honesty/measurement audits and the reconciliation.
**Source of truth:** the master prompt §3 (audit protocol) and §6 (enforcement pass).
**What changes:** NOW, and only now, run the full audit: `tsc --noEmit` across the project, the full test suite, the behavioral checks. Everything already migrated must be COMPLETE. Out-of-scope findings accumulated in the ledger are triaged: ones that belong to a v5.0.0 delta item go back to that item (reopened); ones that predate the re-baseline and are unrelated to it are recorded as regular backlog, NOT fixed under this prompt. Then the two reconciliations this prompt adds: (a) the coverage map — every one of the 121 UR rows is DONE or has a routed PARTIAL record, 0 orphans; (b) the change-log — every DONE and PARTIAL row in the ledger has its change-log line, and the counts match.
**Done-gate:** the ledger is all-DONE; the audit is all-COMPLETE on the migrated subsystems, the live modules included; both reconciliations pass; the handoff note in the ledger says the master prompt is now the governing protocol again.

---

### 4. THE PER-ITEM EXECUTION LOOP

For every item M0–M11, execute exactly this loop, in this order:

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

The v5.0.0 entry of `upgradation/change-log.md` adopts the per-request record discipline: *every subsequent change keyed to a request of the v5.0 program records its own change-log line citing the request ID; the master traceability index is the consolidated request's §8.1.2 table.* This protocol extends that discipline from documentation changes to the code migration:

- **Where:** the "v5.0.0 implementation track — per-request record" section of `upgradation/change-log.md`.
- **When:** at slice/item close (loop step 9), for every row that reached DONE or PARTIAL in that pass. OPEN rows get no line yet.
- **What each line records:** the request ID, its UR §8.1.2 row number, the ledger item/slice that landed it, a one-clause record of the change, the status (DONE / PARTIAL-routed), and the proof (test name or revert experiment).
- **Protocol revisions of this prompt or the ledger template** are recorded as lines in the same section, citing their own version history (Appendix A) — this prompt is a governed document like any other in the set; its revisions are change-log events, not silent edits.
- **Backfilling:** lines missed before R11 existed are recorded at discovery with their true landing dates. Backfills are logged as deviations in the ledger.
- **Ahead-of-record work:** implementations the tree already contains before the protocol recorded them get their R11 lines written at reconciliation (§3.0.2), marked **PRESENT IN TREE (uncredited pending the open policy question)**. Crediting them as DONE/PARTIAL is the open policy question; record, never assume.
- **Format:** the actual change-log table is five columns — `Request | Row | item/slice | Record | Status` — with the proof folded into the Record cell. That shape is compliant; M11's reconciliation must read it as the norm, not as a missing column.
- **Reconciliation:** M11's done-gate includes a count match — ledger rows DONE/PARTIAL vs. change-log lines, and the 121/121 coverage map. Any mismatch fails the convergence pass.

---

### 7. WHAT THIS PROMPT FORBIDS (THE DRIFT KILLERS)

You are explicitly forbidden, for the entire duration of this migration, from:

- Overwriting, re-initializing, or re-creating `migration-ledger.md` (or copying `migration/ledger-template.md` over it) — the ONE exception being the first-session construction sanctioned by the CURRENT STATE section above. The live ledger is the source of truth; resume from it.
- Following the work order verbatim without first reconciling the state of record (R12, §3.0.2) — the risk of redoing landed work or reopening closed rows.
- Leaving a true-unknown finding (§3.0.4) unowned and unrecorded — each must be assigned an owner, a new row, or a logged deviation.
- Running a full-project `tsc --noEmit` fix-loop before or between items (only at M11).
- Fixing compile errors in files outside the current blast radius (log them, R3).
- Deleting or rewriting bootstrap, DI, shutdown, or any core subsystem not named in the current item's blast radius.
- Re-scaffolding the workspace, upgrading dependencies, changing the test framework, reformatting untouched files, or "improving" code you happen to be reading.
- Re-doing the documentation audit of the whole system — the docs are DONE at 5.0.0; the code is catching up.
- Starting an item before the previous one is DONE in the ledger.
- Declaring an item, slice, or the migration complete while any ledger item is not DONE, or while any closed request row lacks its change-log line (R11).

---

### 8. COMPLETION

The migration is complete when: the state-of-record reconciliation (R12) is recorded (every row re-triaged against the tree; ahead-of-record work credited or carried per the open policy question); every item in the work order — M0–M11 and MR-1–MR-8 — is DONE in the ledger; the convergence pass is green; the coverage map reconciles (121 rows, 121 owners, 0 orphans); every DONE and PARTIAL row has its change-log line; the completion criteria that touch the corpus are met; every §3.0.4 true unknown has an owner or a logged deviation; and the ledger's final entry hands control back to the Master Build Prompt as the governing protocol.

**Anything less is not done. Anything more (out-of-scope fixes smuggled in) is a defect of this protocol's execution and must be reverted or recorded in the ledger as a deviation.**

---

### Appendix A — Revision History of This Prompt

This prompt is a governed document: its revisions are change-log events (recorded in `upgradation/change-log.md`, v5.0.0 implementation track) and are never silent edits.

| Version | Date | Author | Change |
|---|---|---|---|
| — | — | — | — |

*End of Re-Baseline Migration Prompt. Record all future revisions in `upgradation/change-log.md` (implementation track) and in Appendix A.*

## 6. Artefacts Produced

| Artefact | Path | When |
|----------|------|------|
| Migration ledger | repository root | rebuilt before M1, updated per item |
| Code deltas | inside each item's blast radius | per item |
| Change-log lines | `upgradation/change-log.md` | one per closed request row |

## 7. Acceptance Criteria

The migration is complete only when every item in the Migration Work Order is DONE in the ledger, the convergence pass is green, every closed request row has its change-log line, and no out-of-scope finding was silently fixed. At that point the chain hands back to `orchestration/master-prompt.md`.

## 8. Change-Log Record

Per the entry discipline in `upgradation/change-log.md` §1.5, this document writes one **Migration** line per closed request row:

```
- <date> · migration-prompt <version> · item=<ID> · rows=<UR-…> · status=<DONE|PARTIAL|BLOCKED>
```
