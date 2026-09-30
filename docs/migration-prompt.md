# DUMBY — Re-Baseline Migration Prompt

## Delta Execution Protocol: Drive the v5.0.0 Changes Into the Existing Codebase — Nothing Else

---

**Document type:** Migration Prompt — a scoped, delta-driven execution protocol. This is NOT the Master Build Prompt (`docs/master-prompt.md`, triggered via `docs/meta-prompt.md`). It does not audit the whole codebase and it does not drive everything to 100% spec compliance. It does exactly one thing: lands the v5.0.0 re-baseline deltas into the code, one item at a time, in a fixed order, with a ledger that survives across sessions and a change-log line for every request row it closes.

**Project:** Dumby — Discord Unified Modular Bot System

**Version:** 5.1.0 — governance revision. Supersedes 5.0.2 in full (see §1.1 for the corrections and Appendix A for the revision record). The scope fence R1–R10 carries forward from 5.0.2 essentially unchanged; 5.1.0 adds the ledger-resume rule, the slice mechanics, the request-row coverage map, and the change-log rule (R11) that the program's own per-request discipline requires.

**Derived from:** `docs/change-log.md` v5.0.0 entry (the consolidated re-baseline and the per-request record discipline it adopts), the frozen request record `docs/ur/UR-20260918-001_Consolidated_Re-Baseline_Request.md` (provenance, impact matrix, and the 121-request master table at its §8.1.2), and `docs/blueprint.md` 5.0.0 (sole architectural authority).

**When to use this prompt:** the codebase exists and was built against a spec version older than the documentation (typically v4.6.x). The docs have moved to v5.0.0. Your job is to migrate the code, not to re-audit or re-scaffold it.

**CURRENT STATE — read before anything else.** This migration is UNDERWAY, not starting: **M0 is IN-PROGRESS** (slices 1–5 DONE; 8 of 17 P0 rows closed, 6 partial, 3 open; slice 6 is the next — and last — M0 slice), every other item is NOT STARTED. Slices 1–5 landed on `feature/dev` in commit `0c625c1` (2026-09-29). The session-generated ledger that recorded them was retired from the repository root on 2026-09-30 at the document set owner's direction: its records remain recoverable in git history at `0c625c1`, and the state of record is now the per-request record in `docs/change-log.md` plus the dated snapshot in `docs/migration-ledger-template.md` §2. **On the first migration session after this revision:** construct a fresh `migration-ledger.md` at the repository root from the template's record shapes, seed it with the snapshot state (M0 IN-PROGRESS at slice 6), then resume. From that moment the ledger is live and authoritative — you update it at the end of every item and slice, and never re-create, re-initialize, or overwrite it.

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

### M0 — P0 Security Flaws (do first, smallest blast radius, highest stakes)

**Request rows owned:** the 17 severity-Critical suite rows (§3.0): UR-A-01…04, UR-B-01…06, UR-C-01…07.
**Source of truth:** `docs/ur/UR-20260918-001` §8.1.2 rows 34–37, 64–69, 92–98 — read the rows before touching anything.
**Blast radius:** only the files named by P0 flaw rows (declared per slice in the ledger; the retired pre-5.1.0 M0 record with the standing declarations is recoverable in git history at `0c625c1` — re-declare slice 6's radius from its rows before editing).
**Done-gate:** each P0 flaw row has a test that fails before the fix and passes after; no control plane accepts unauthenticated connections; all path handling is contained. A row whose full remedy depends on a P1/P2 row (e.g. UR-A-03 and UR-C-07 name UR-C-09 as their own dependency) closes PARTIAL with routing evidence, never force-fitted.
**Current state:** slices 1–5 DONE (admin auth; loader path containment; honest 501s; fail-closed unknown tier; Swastik internal auth); slice 6 — provenance, ownership, credentials (UR-B-04, UR-B-05, UR-C-05 plus closable partials) — is the last M0 slice. 8 of 17 rows DONE, 6 PARTIAL, 3 OPEN. Last verified: 75 files / 876 tests green; typecheck, lint, format, coverage clean.

### M1 — Tier Volumes & Blind Discovery (module relocation)

**Request rows owned:** UR-04 (row 4, package scaffold), UR-05 (row 5), UR-19 (row 19).
**Source of truth:** `blueprint.md` §5.4, §7.3, §15.9; `directory.md` (volume layout); ADR-005; master prompt Phase 0 notes on `MODULES_DIR`.
**What changes:** remove `src/modules` (modules never live in the source tree); stand up the four per-tier volumes (`modules-admin`, `modules-core`, `modules-standard`, `modules-marketplace`) plus `swastik-staging` rooted at `MODULES_DIR` (default `/mnt/modules`); replace any registry seed / hardcoded module list with blind discovery at bootstrap; make the volumes mountable (docker-compose / K8s mounts); create the `packages/swastik` authoring package with types, manifest schemas, scoped entry points, and the `_template` module.
**Blast radius:** module loader/registry/discovery code, `src/modules` (removal), `packages/swastik` (new), docker-compose and K8s volume mounts, the bootstrap stage that loads modules.
**Done-gate:** a module placed on a volume is discovered and loaded with zero registry edits; a module anywhere else is not loaded; tier-at-rest is enforced by volume; no `src/modules` directory remains.

### M2 — Unified Command Tree

**Request rows owned:** UR-B-11 (row 74).
**Source of truth:** `directory.md` (`src/commands/` unified tree); `blueprint.md` §17; change-log "Removed" (the `src/core/commands` split).
**What changes:** merge the former `src/core/commands` split into the single canonical `src/commands/` tree; exactly one command router remains; remove any orphaned or duplicate router.
**Blast radius:** `src/core/commands` (removal), `src/commands/` (merge target), the router, imports of the moved command files.
**Done-gate:** one router, one tree, no remnant of the split; command registration and collision detection still work.

### M3 — Core Renderer, Buffer-Then-Render & the Embed Ban (the big one)

**Request rows owned:** UR-09, UR-10, UR-11, UR-12, UR-21, UR-28 (rows 9–12, 21, 28) plus the interface-UX carriers UR-C-20 (row 111) and UR-C-29 (row 120).
**Source of truth:** `blueprint.md` §10.2, §16.5, §20 (especially §20.8 renderer/presentation grammar and §20.9 buffer embed + formal notice frames), §17.11, §19.2, §28.6; `interface.md` — the renderer, interaction-lifecycle, and component-dispatch sections, read completely; ADR-001 (embed ban), ADR-002 (DM prohibition), ADR-009 (A4 title/attribution grammar), ADR-010 (accent colour).
**What changes:** build the core Renderer as the single presentation authority — static Components v2 frame grammar with dynamic slots, Modes D/M/C; the buffer-then-render contract on every interaction (instant buffer embed, exactly one edit into the final render or the formal notice frame); formal notice frames with reason codes and trace correlation IDs; the single official accent token blurple `#5865F2` everywhere; the A4 title and attribution grammar (developer attribution in the footer slot, never the surface title); minted stateless customIds with click-time re-authorization, idempotency, the 800 ms autocomplete budget, the 13-minute follow-up watchdog (UR-C-20, UR-C-29); the absolute embed ban (no classic `EmbedBuilder`/`MessageEmbed` anywhere, enforced by a lint/grep gate) and the absolute DM prohibition (UR-21).
**Blast radius:** renderer, interaction handling, every shipped command's presentation code, the embed-ban lint gate, tests that asserted embed-based output.
**Done-gate:** every user-facing surface is renderer-issued Components v2; the edit-sequence assertion (buffer → exactly one edit) passes on every interaction; a grep gate fails on any classic-embed import or instantiation; no DM path exists on any route including permission-denied and error paths.

### M4 — RBAC Layer 6/7 Redesign

**Request rows owned:** R1, R2 (rows 32–33), UR-A-07, UR-A-08, UR-A-09 (rows 40–42).
**Source of truth:** `blueprint.md` §21 (especially the Layer 6 pure-backend rank function and Layer 7 guild-side grants, the exhaustive non-configurable override boundary, Table 21-A); `concept.md` §16.1 (six-rank ladder, grant scopes, RESTRICTED floor); `interface.md` (the `/permit` Layer 6/7 vocabulary).
**What changes:** implement the one normative seven-layer permission ordering; Layer 6 as a pure-backend rank function; Layer 7 as guild-side grants with the "Set" scope semantics; the six-rank ladder with canonical MODERATOR / ADMINISTRATOR names; "OWNER" = the guild's ownership account, distinct from the `BOT_OWNER_IDS` operator override; the `/permit` command surface per `interface.md`; the RBAC persistence the suite rows require (two-step role resolver, knex repository over the four RBAC tables, blacklist lookup backed by `blocked_users`).
**Blast radius:** `src/permissions/` (resolver, RBAC service), the `/permit` module, permission-related migrations, permission tests.
**Done-gate:** deny-by-default holds; resolution order matches Table 21-A exactly; the override boundary is non-configurable as specified; the resolver is invoked on every dispatch (instrumented test).

### M5 — License Machine, Compatibility Ledger & Deployment Records

**Request rows owned:** UR-02, UR-06, UR-08, UR-18, UR-20, UR-23 (rows 2, 6, 8, 18, 20, 23).
**Source of truth:** `blueprint.md` §15.7 (six-state license machine with devId binding), §14.4 (Compatibility Ledger gating releases), §15.12 (Deployment Records), §44.8 (versioned OpenAPI API families); `directive.md` D-8.10.
**What changes:** implement the six-state license machine with devId binding; stand up the machine-readable Compatibility Ledger of cross-boundary contract version windows; wire it as the release gate (core releases and module deployments); add Deployment Records and the repo-to-running OIDC deployment flow (UR-02).
**Blast radius:** license/compat subsystem, the release/deployment tooling under `tools/release_manager`, the Swastik promotion gate (integration point only — the pipeline itself is M6).
**Done-gate:** the ledger exists and is enforced (a deployment that violates a contract window is refused); the license state machine transitions only along its six legal edges.

### M6 — Swastik Promotion Pipeline (staging, atomic promotion, hot reload)

**Request rows owned:** UR-15, UR-25, UR-26, UR-27, UR-30 (rows 15, 25, 26, 27, 30) plus UR-A-24, UR-A-25, UR-B-12, UR-B-13, UR-B-15, UR-B-20, UR-B-26, UR-C-14, UR-C-22, UR-C-26 (rows 57–58, 75–76, 78, 83, 89, 105, 113, 117).
**Source of truth:** `blueprint.md` §12.21, §15 (staging, promotion, verified loads), §11.2 (manifest contract); ADR-006 (reload automation boundary); master prompt Phase 3 notes on Swastik.
**What changes:** staging on `swastik-staging`; atomic promotion onto tier volumes; path containment on all module file operations (the M0 slice-2 containment root — `modulesDir` — is a load-bearing requirement: `SWASTIK_STAGING_VOLUME_PATH` must be nested inside `MODULES_DIR`); verified loads (a module that fails validation never goes live); the hot-reload boundary exactly as ADR-006 records it; manifest reading via static extraction, not `import()` (D-4.9); the full manifest contract (visibility enum, hardcode toggle, `depends` pins, tarball upload, category enum, devId/buildId required at upload).
**Blast radius:** the Swastik service and `packages/swastik` integration points, module loader hooks used by promotion, `manifest.schema.ts`.
**Done-gate:** promotion is atomic (a failed promotion leaves the volume untouched); loads are verified; path traversal tests pass; hot reload stays inside ADR-006's boundary.

### M7 — Twixter Persona Model

**Request rows owned:** UR-16, UR-29 (rows 16, 29) plus UR-A-12, UR-A-13, UR-C-21 (rows 45–46, 112).
**Source of truth:** `blueprint.md` §35; ADR-008 (free-charter sunset); ADR-011 (persona surface); `interface.md` (persona division); master prompt Phase 5 (stub level is fine if the current codebase has no operational personas yet — record that honestly in the ledger).
**What changes:** the Twixter typed interface and persona model — bring-your-own-identity, single-server-bound; the free-charter sunset behavior; persona surface per ADR-011; the persona bindings and dispatch gate the suite rows require (moduleSlug in the binding key, PERSONA_ID env, occupied-by-another-persona gate).
**Blast radius:** persona subsystem, its migrations and tests.
**Done-gate:** the persona model compiles, is wired to the spec'd surface, and the sunset rule is tested.

### M8 — Envelope Encryption

**Request rows owned:** UR-22 (row 22).
**Source of truth:** `blueprint.md` §32.7; ADR-003.
**What changes:** envelope encryption scoped to in-process-readable credentials — exactly the scope ADR-003 records, no wider.
**Blast radius:** the credentials/secrets handling path, its config, its tests.
**Done-gate:** every in-process-readable credential is envelope-encrypted at rest; the scope boundary (what is and is not encrypted) matches ADR-003 exactly.

---

### The Module Rewrite Block — MR-1 … MR-8 (first-party modules rewritten to v5.0.0 and made live via Swastik)

Runs after M8 and before M9. Prerequisites: every item M0–M8 DONE — the modules are rewritten against the command tree, Renderer, RBAC engine, license/compat gates, Swastik pipeline, persona model, and encryption scope delivered by those items. If any is not DONE when this block is reached, stop and report — never rewrite a module against an interface that does not exist.

Each MR item follows the per-item execution loop (§4) with these bindings:

**Source and target.** The module's old implementation comes from the git tag `pre-m1-modules` (`git show pre-m1-modules:apps/main/src/modules/<module>/`). Begin with a salvage audit: keep every behavior v5.0.0 still calls for, and record the kept-vs-superseded split in the ledger. The target is the `swastik` `_template` 11-folder layout with the full v5.0.0 manifest (tier, version, granular permissions, dependencies, configSchema, commands, events, assets), colocated tests, and the en-US base locale.

**Presentation.** Exclusively through the Renderer: Components v2 Modes D/M/C, buffer-then-render (instant buffer embed, exactly one edit into the final render or the formal notice frame with reason code + trace correlation ID), the single official accent `#5865F2`, and the A4 title/attribution grammar — attribution in the footer slot, never the title (ADR-001, ADR-002, ADR-009, ADR-010). No classic `EmbedBuilder`/`MessageEmbed` anywhere in module code; the main bot never DMs.

**Permissions.** Layer 6/7 vocabulary, deny-by-default (blueprint §21, concept.md §16.1): a command with no explicit declaration is unreachable by any non-owner user.

**Deployment — the only road to live.** Build → stage on `swastik-staging` → the 19-step validation → staging smoke load + readiness checks → atomic promotion onto the volume matching the declared tier (tier-at-rest, blueprint §15.8/§15.9) → reload within the ADR-006 boundary. Never copy anything directly into `MODULES_DIR`. A failed validation is a module defect to fix, never a gate to bypass.

**Fence.** Framework code (`src/module-system/`, `src/middleware/`, `src/permissions/`, the `src/commands/` router, renderer internals, `packages/swastik/`) is READ-ONLY for MR items. Framework defects found during live verification go to the out-of-scope findings register. `documentation.md` is the archived legacy record — never an implementation source.

**Done means live-verified:** blind discovery picks the module up with zero registry edits; its commands register in a test guild; interactions follow buffer-then-render; permissions resolve through the engine; and the module's done-gate below passes against the running bot.

| Item | Module | Tier | Read before coding | Done-gate |
|---|---|---|---|---|
| MR-1 | `hello-world` | Standard | `interface.md` hello-world division + Division 8.10 testing checklist; blueprint §11, §12.21 | Every Division 8.10 checklist item passes live |
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
- **Backfilling:** lines missed before R11 existed are recorded at discovery with their true landing dates (M0 slices 1–5 have been backfilled in the change-log at the time of this revision). Backfills are logged as deviations in the ledger.
- **Reconciliation:** M11's done-gate includes a count match — ledger rows DONE/PARTIAL vs. change-log lines, and the 121/121 coverage map. Any mismatch fails the convergence pass.

---

## 7. WHAT THIS PROMPT FORBIDS (THE DRIFT KILLERS)

You are explicitly forbidden, for the entire duration of this migration, from:

- Overwriting, re-initializing, or re-creating `migration-ledger.md` (or copying `docs/migration-ledger-template.md` over it) — the ONE exception being the first-session construction sanctioned by the CURRENT STATE section above. The live ledger is the source of truth; resume from it.
- Running a full-project `tsc --noEmit` fix-loop before or between items (only at M11).
- Fixing compile errors in files outside the current blast radius (log them, R3).
- Deleting or rewriting bootstrap, DI, shutdown, or any core subsystem not named in the current item's blast radius.
- Re-scaffolding the workspace, upgrading dependencies, changing the test framework, reformatting untouched files, or "improving" code you happen to be reading.
- Re-doing the documentation audit of the whole system — the docs are DONE at 5.0.0; the code is catching up.
- Starting an item before the previous one is DONE in the ledger.
- Declaring an item, slice, or the migration complete while any ledger item is not DONE, or while any closed request row lacks its change-log line (R11).

---

## 8. COMPLETION

The migration is complete when: every item in the work order — M0–M11 and MR-1–MR-8 — is DONE in the ledger; the convergence pass is green; the coverage map reconciles (121 rows, 121 owners, 0 orphans); every DONE and PARTIAL row has its change-log line; and the ledger's final entry hands control back to the Master Build Prompt as the governing protocol.

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

*End of Re-Baseline Migration Prompt. Version 5.1.0. Record all future revisions in `change-log.md` (implementation track) and in Appendix A.*
