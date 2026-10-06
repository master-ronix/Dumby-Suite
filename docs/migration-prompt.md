# DUMBY — Re-Baseline Migration Prompt

## Delta Execution Protocol: Drive the v5.0.0 Changes Into the Existing Codebase — Nothing Else

---

**Document type:** Migration Prompt — a scoped, delta-driven execution protocol. This is NOT the Master Build Prompt. It does not audit the whole codebase and it does not drive everything to 100% spec compliance. It does exactly one thing: lands the v5.0.0 re-baseline deltas into the code, one item at a time, in a fixed order, with a ledger that survives across sessions.

**Project:** Dumby — Discord Unified Modular Bot System

**Version:** 5.0.1

**Derived from:** `change-log.md` v5.0.0 entry (the consolidated re-baseline), the frozen request record `docs/ur/UR-20260918-001_Consolidated_Re-Baseline_Request.md` (provenance and impact matrix), and `blueprint.md` 5.0.0 (sole architectural authority).

**When to use this prompt:** the codebase exists and was built against a spec version OLDER than the documentation (typically v4.6.x). The docs have moved to v5.0.0. Your job is to migrate the code, not to re-audit or re-scaffold it.

**Relationship to the Master Build Prompt:** this prompt is a scoped *predecessor* to it. When every item in the Migration Work Order (§3) is marked DONE in the ledger, the master prompt's audit protocol (§3) and enforcement pass (§6) become the governing protocol again — not before.

---

## 0. THE ONE-SENTENCE CONTRACT

> You execute the Migration Work Order (§3) item by item; you touch ONLY the files inside the current item's blast radius; you fix ONLY the compile/test errors the current item creates; everything else you find is LOGGED, never fixed; and you checkpoint after every item so the next session resumes instead of restarting.

If you ever find yourself doing something this sentence does not describe, stop and re-read it.

---

## 1. WHY THIS PROMPT EXISTS (READ ONCE)

The master prompt is an audit-to-full-compliance protocol: it classifies every subsystem against the CURRENT spec and remediates everything that deviates. That is the correct protocol when code and docs are at the same version. It is the WRONG protocol when the docs just jumped a major version over the code:

- Auditing a v4-era codebase against v5.0.0 marks nearly every subsystem FAULTY at once. "Remediate everything" is not a workable instruction — it produces wandering.
- The master prompt's severity ordering puts compile-blocking faults first. On a re-baselined codebase almost everything fails to compile, so the agent spends its whole budget chasing typecheck errors across files the changelog never asked to change — and rewrites whatever stands in the way of a clean compile (e.g. bootstrap).
- "Never stop until all-COMPLETE" with no finite work list gives the agent no natural stopping point.

This prompt fixes that by giving you a FINITE, ORDERED work list derived from the change-log delta, a hard scope fence around each item, and a ledger so progress accumulates across sessions.

---

## 2. HARD RULES — THE SCOPE FENCE

These rules override every other instruction you may have read in the documentation set. They govern this entire prompt.

**R1 — The work order is the work.** The ONLY code changes you make are those required by the current Migration Work Order item (§3). You do not fix, clean, refactor, upgrade, or "improve" anything outside the current item — even if it is broken, even if it fails typecheck, even if it looks wrong, even if the spec elsewhere says it should be different.

**R2 — Blast radius before edits.** Before writing a single line of code for an item, write down the item's blast radius: the exact list of files and directories this item is allowed to touch. Write it into the ledger entry for that item BEFORE you start. If a file is not in the blast radius, it is read-only for this item.

**R3 — Log, don't fix.** When you encounter a compile error, failing test, or defect in a file OUTSIDE the current blast radius: record it in the ledger under `Out-of-scope findings`, note which work-order item (if any) it belongs to, and move on. Do not fix it now. The only exception is a one-line mechanical unblocking fix (e.g. an import path rename caused by an earlier item) — allowed, but must be logged.

**R4 — No opportunistic rewrites.** Deleting a file, re-scaffolding a directory, or rewriting a working implementation from scratch is forbidden unless the current work-order item explicitly requires it (e.g. M2 requires removing the `src/core/commands` split; M1 requires removing `src/modules`). "The code is old" or "the spec is nicer than the code" is never a reason. Bootstrap, DI, shutdown, and every other core subsystem are READ-ONLY unless the current item names them in its blast radius.

**R5 — Compile checks are per-item gates, not a global pre-pass.** You run `tsc --noEmit` (and the test suite for the affected subsystem) at the END of each item, on the paths in that item's blast radius. You do NOT run a full-project typecheck-first loop. Errors outside the blast radius are out-of-scope findings (R3). A full-project green build is only required at M11 — the convergence pass, the final item.

**R6 — Checkpoint or it didn't happen.** After each item is verified: commit the work (or save the state your environment persists), and update the ledger entry to DONE with a one-paragraph record of what changed, which spec sections drove it, and which tests prove it. An item without a ledger record is not done.

**R7 — Stop at the fence line of your budget.** If your session budget is nearly exhausted mid-item, STOP, record the item as IN-PROGRESS with a precise resume note in the ledger ("done: X, Y; remaining: Z; next step: read blueprint §21.4 then implement the grant-resolution order"), and end. A clean handoff is worth more than a half-finished sprawl. NEVER start an item you can see you cannot finish.

**R8 — The spec wins, but only where the delta reaches.** Inside the current blast radius, implement to the v5.0.0 spec exactly (precedence: `blueprint.md` > `directive.md` > `interface.md` > `directory.md`; binding ADRs in `docs/adr/`). Outside it, the codebase's current behavior stands until its own item says otherwise.

**R9 — Canonical vocabulary from line one.** Every line you write or touch uses the v5.0.0 vocabulary: **Twixter** (persona), **Release Manager**, **MODERATOR / ADMINISTRATOR**, buffer-then-render, formal notice frame, tier volumes. No legacy names in new code. (The full sweep of legacy names in UNTOUCHED files is its own final item, M10 — do not do it early.)

**R10 — One item at a time, in order.** You do not interleave items, work ahead, or batch "quick wins" across items. The order in §3 is the order. Each item builds on the completed ones before it.

---

## 3. THE MIGRATION WORK ORDER

Ten items, executed strictly in order. Each item names: its source of truth (read these BEFORE coding), its blast radius, and its done-gate. On first run, copy the ledger template (`migration-ledger-template.md`, shipped alongside this prompt) to the repository root as `migration-ledger.md` and fill in the per-item entries as you start each one.

The items are sequenced infrastructure-first: layout and plumbing before presentation, presentation before permissions, permissions before governance, cleanup and convergence last. This ordering is deliberate — do not reorder it without recording the reason in the ledger.

### M0 — P0 Security Flaws (do first, smallest blast radius, highest stakes)

**Source of truth:** `docs/ur/UR-20260918-001` — the flaw tables (the 88 implementation-flaw corrections) filtered to priority **P0**: unauthenticated control planes, path traversal / path containment failures, outright-broken dispatch. Read the flaw rows before touching anything.
**Blast radius:** only the files named by P0 flaw rows.
**Done-gate:** each P0 flaw has a test that fails before the fix and passes after; no control plane accepts unauthenticated connections; all path handling is contained.

### M1 — Tier Volumes & Blind Discovery (module relocation)

**Source of truth:** `blueprint.md` §5.4, §7.3, §15.9; `directory.md` (volume layout); ADR-005; master prompt Phase 0 notes on `MODULES_DIR`.
**What changes:** remove `src/modules` (modules never live in the source tree); stand up the four per-tier volumes (`modules-admin`, `modules-core`, `modules-standard`, `modules-marketplace`) plus `swastik-staging` rooted at `MODULES_DIR` (default `/mnt/modules`); replace any registry seed / hardcoded module list with blind discovery at bootstrap; make the volumes mountable (docker-compose / K8s mounts); create the `packages/swastik` authoring package with types, manifest schemas, scoped entry points, and the `_template` module.
**Blast radius:** module loader/registry/discovery code, `src/modules` (removal), `packages/swastik` (new), docker-compose and K8s volume mounts, the bootstrap stage that loads modules.
**Done-gate:** a module placed on a volume is discovered and loaded with zero registry edits; a module anywhere else is not loaded; tier-at-rest is enforced by volume; no `src/modules` directory remains.

### M2 — Unified Command Tree

**Source of truth:** `directory.md` (`src/commands/` unified tree); `blueprint.md` §17; change-log "Removed" (the `src/core/commands` split).
**What changes:** merge the former `src/core/commands` split into the single canonical `src/commands/` tree; exactly one command router remains; remove any orphaned or duplicate router.
**Blast radius:** `src/core/commands` (removal), `src/commands/` (merge target), the router, imports of the moved command files.
**Done-gate:** one router, one tree, no remnant of the split; command registration and collision detection still work.

### M3 — Core Renderer, Buffer-Then-Render & the Embed Ban (the big one)

**Source of truth:** `blueprint.md` §10.2, §16.5, §20 (especially §20.8 renderer/presentation grammar and §20.9 buffer embed + formal notice frames), §17.11, §19.2, §28.6; `interface.md` — the renderer, interaction-lifecycle, and component-dispatch sections, read completely; ADR-001 (embed ban), ADR-009 (A4 title/attribution grammar), ADR-010 (accent colour); ADR-002 (DM prohibition).
**What changes:** build the core Renderer as the single presentation authority — static Components v2 frame grammar with dynamic slots, Modes D/M/C; the buffer-then-render contract on every interaction (instant buffer embed, exactly one edit into the final render or the formal notice frame); formal notice frames with reason codes and trace correlation IDs; the single official accent token blurple `#5865F2` everywhere; the A4 title and attribution grammar (developer attribution in the footer slot, never the surface title); minted stateless customIds with click-time re-authorization, idempotency, the 800 ms autocomplete budget, the 13-minute follow-up watchdog; the absolute embed ban (no classic `EmbedBuilder`/`MessageEmbed` anywhere, enforced by a lint/grep gate) and the absolute DM prohibition.
**Blast radius:** renderer (new), interaction handling, every shipped command's presentation code, the embed-ban lint gate, tests that asserted embed-based output.
**Done-gate:** every user-facing surface is renderer-issued Components v2; the edit-sequence assertion (buffer → exactly one edit) passes on every interaction; a grep gate fails on any classic-embed import or instantiation; no DM path exists on any route including permission-denied and error paths.

### M4 — RBAC Layer 6/7 Redesign

**Source of truth:** `blueprint.md` §21 (especially the Layer 6 pure-backend rank function and Layer 7 guild-side grants, the exhaustive non-configurable override boundary, Table 21-A); `concept.md` §16.1 (six-rank ladder, grant scopes, RESTRICTED floor); `interface.md` (the `/permit` Layer 6/7 vocabulary); the RBAC redesign rows of the UR.
**What changes:** implement the one normative seven-layer permission ordering; Layer 6 as a pure-backend rank function; Layer 7 as guild-side grants with the "Set" scope semantics; the six-rank ladder with canonical MODERATOR / ADMINISTRATOR names; "OWNER" = the guild's ownership account, distinct from the `BOT_OWNER_IDS` operator override; the `/permit` command surface per `interface.md`.
**Blast radius:** `src/permissions/` (resolver, RBAC service), the `/permit` module, permission-related migrations, permission tests.
**Done-gate:** deny-by-default holds; resolution order matches Table 21-A exactly; the override boundary is non-configurable as specified; the resolver is invoked on every dispatch (instrumented test).

### M5 — License Machine, Compatibility Ledger & Deployment Records

**Source of truth:** `blueprint.md` §15.7 (six-state license machine with devId binding), §14.4 (Compatibility Ledger gating releases), §15.12 (Deployment Records), §44.8 (versioned OpenAPI API families); `directive.md` D-8.10.
**What changes:** implement the six-state license machine with devId binding; stand up the machine-readable Compatibility Ledger of cross-boundary contract version windows; wire it as the release gate (core releases and module deployments); add Deployment Records.
**Blast radius:** license/compat subsystem (new), the release/deployment tooling under `tools/release-manager`, the Swastik promotion gate (integration point only — the pipeline itself is M6).
**Done-gate:** the ledger exists and is enforced (a deployment that violates a contract window is refused); the license state machine transitions only along its six legal edges.

### M6 — Swastik Promotion Pipeline (staging, atomic promotion, hot reload)

**Source of truth:** `blueprint.md` §12.21, §15 (staging, promotion, verified loads); ADR-006 (reload automation boundary); master prompt Phase 3 notes on Swastik.
**What changes:** staging on `swastik-staging`; atomic promotion onto tier volumes; path containment on all module file operations; verified loads (a module that fails validation never goes live); the hot-reload boundary exactly as ADR-006 records it; manifest reading via static extraction, not `import()` (D-4.9).
**Blast radius:** the Swastik service and `packages/swastik` integration points, module loader hooks used by promotion.
**Done-gate:** promotion is atomic (a failed promotion leaves the volume untouched); loads are verified; path traversal tests pass; hot reload stays inside ADR-006's boundary.

### M7 — Twixter Persona Model

**Source of truth:** `blueprint.md` §35; ADR-008 (free-charter sunset); ADR-011 (persona surface); `interface.md` (persona division); master prompt Phase 5 (stub level is fine if the current codebase has no operational personas yet — record that honestly in the ledger).
**What changes:** the Twixter typed interface and persona model — bring-your-own-identity, single-server-bound; the free-charter sunset behavior; persona surface per ADR-011.
**Blast radius:** persona subsystem, its migrations and tests.
**Done-gate:** the persona model compiles, is wired to the spec'd surface, and the sunset rule is tested.

### M8 — Envelope Encryption

**Source of truth:** `blueprint.md` §32.7; ADR-003.
**What changes:** envelope encryption scoped to in-process-readable credentials — exactly the scope ADR-003 records, no wider.
**Blast radius:** the credentials/secrets handling path, its config, its tests.
**Done-gate:** every in-process-readable credential is envelope-encrypted at rest; the scope boundary (what is and is not encrypted) matches ADR-003 exactly.

### M9 — Remaining Implementation-Flaw Corrections

**Source of truth:** `docs/ur/UR-20260918-001` — the 88-flaw table, EXCLUDING the P0 rows already done in M0.
**What changes:** work the non-P0 flaw rows one by one: control-plane authentication (CLAI SSH with public-key auth, no plaintext TCP REPL), 501-honesty on unimplemented endpoints, truthful audits, wiring of middleware/scheduler/personas/tracing, and the rest of the table. Treat each flaw row as a mini-item: read the row, fix it, test it, log it.
**Blast radius:** per flaw row — declare it in the ledger before each fix.
**Done-gate:** every row has a ledger record with its proving test.

### M10 — Terminology & Legacy-Name Sweep

**Source of truth:** change-log "Changed — shared facts": "DRM" → **Release Manager** (with reverse GitHub sync), "Twill" → **Twixter**, canonical ranks **MODERATOR / ADMINISTRATOR**.
**What changes:** sweep the remaining legacy names across code, tests, comments, config keys, and commit messages going forward. Text-level only — no behavior changes in this item.
**Blast radius:** every file containing a legacy name (mechanical, textual).
**Done-gate:** a grep for the legacy names returns nothing outside the frozen docs/ur/ provenance records.

### M11 — Convergence Pass (the only full-project gate)

**Source of truth:** the master prompt §3 (audit protocol) and §6 (enforcement pass).
**What changes:** NOW, and only now, run the full audit: `tsc --noEmit` across the project, the full test suite, the behavioral checks. Everything already migrated must be COMPLETE. Out-of-scope findings accumulated in the ledger are triaged: ones that belong to a v5.0.0 delta item go back to that item (reopened); ones that predate the re-baseline and are unrelated to it are recorded as regular backlog, NOT fixed under this prompt.
**Done-gate:** the ledger is all-DONE; the audit is all-COMPLETE on the migrated subsystems; the handoff note in the ledger says the master prompt is now the governing protocol again.

---

## 4. THE PER-ITEM EXECUTION LOOP

For every item M0–M11, execute exactly this loop, in this order:

1. **Claim the item.** Set its ledger entry to IN-PROGRESS with the date. If it is already IN-PROGRESS from an earlier session, read the resume note and continue from it — do NOT restart the item from scratch.
2. **Read the sources of truth.** The sections named in the item. Full sections, not summaries. If an ADR is named, read it before making the choice it governs.
3. **Map the blast radius.** List the files/directories the item may touch. Record it in the ledger. This list is a contract — R2 enforces it.
4. **Implement.** Write the code. Stay inside the fence.
5. **Write/update the tests.** The done-gate criteria of the item, expressed as tests that fail before and pass after.
6. **Verify.** Run the item's tests and typecheck the blast-radius paths. Behavioral verification beats structural: it must WORK as specified, not merely compile.
7. **Record out-of-scope findings.** Any error or defect you noticed outside the fence → ledger, not fixes (R3).
8. **Close the item.** Set the ledger entry to DONE with: what changed, which spec sections drove it, which tests prove it, and any judgment calls made. Commit/checkpoint.
9. **Advance.** Move to the next item. Do not look back; the convergence pass (M11) catches stragglers.

---

## 5. WHAT THIS PROMPT FORBIDS (THE DRIFT KILLERS)

You are explicitly forbidden, for the entire duration of this migration, from:

- Running a full-project `tsc --noEmit` fix-loop before or between items (only at M11).
- Fixing compile errors in files outside the current blast radius (log them, R3).
- Deleting or rewriting bootstrap, DI, shutdown, or any core subsystem not named in the current item's blast radius.
- Re-scaffolding the workspace, upgrading dependencies, changing the test framework, reformatting untouched files, or "improving" code you happen to be reading.
- Re-doing the documentation audit of the whole system — the docs are DONE at 5.0.0; the code is catching up.
- Starting an item before the previous one is DONE in the ledger.
- Declaring the migration complete while any ledger item is not DONE.

---

## 6. COMPLETION

The migration is complete when: every item M0–M11 is DONE in the ledger, the convergence pass is green, and the ledger's final entry hands control back to the Master Build Prompt as the governing protocol.

**Anything less is not done. Anything more (out-of-scope fixes smuggled in) is a defect of this protocol's execution and must be reverted or recorded in the ledger as a deviation.**

---

*End of Re-Baseline Migration Prompt. Version 5.0.1. Record all future revisions in `change-log.md`.*
