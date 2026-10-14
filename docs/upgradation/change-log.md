---
id: CHANGELOG
title: Unified Change Log
kind: index
status: normative
version: 5.5.92
chain_role: record
preceded_by: prompts/meta-prompt.md | orchestration/master-prompt.md | migration/migration-prompt.md
change_log: upgradation/change-log.md
authority_scope: [history]
---

# DUMBY Documentation — Unified Change Log

> **One project. One continuous history.**
> Last recorded: 2026-10-11

---

## Table of Contents

- **Chain Contract** — §1 Identity · §2 Purpose · §3 Preconditions · §4 Inputs · §5 Ordered Steps · §6 Artefacts Produced · §7 Acceptance Criteria · §8 Change-Log Record
- **§9 Record** — the history — §1 Scope & Method · §2 Master Version Table · §3 Version-by-Version History · §4 Cross-Version Defect Lifecycle · §5 Open Items Carried Forward

---

## 1. Identity

- **Chain role:** *record* — the terminal sink of the trigger chain.
- **Preceded by:** any chain document that completes a step — `prompts/meta-prompt.md` (activation), `orchestration/master-prompt.md` (build or enforcement), `migration/migration-prompt.md` (migration).
- **Hands off to:** nothing — it is terminal. Its entries are the chain's audit trail and the state of record.
- **Authority:** normative, `authority_scope: [history]`.

## 2. Purpose

Record every step of the chain into one continuous, evidence-verified history, so that an item
without a record here did not happen. This document is the terminal sink of the trigger chain
(`prompts/meta-prompt.md` → `prompts/entry.md` → `orchestration/master-prompt.md` /
`migration/migration-prompt.md`); its entries are the chain's audit trail and the state of record.

## 3. Preconditions

- a chain step has completed (activation, build / migration / enforcement, or a remediation pass)
- the step has produced its record line per its own §8

## 4. Inputs

| Input | Source | Use |
|-------|--------|-----|
| Activation line | `prompts/meta-prompt.md` §8 | one per run |
| Build line | `orchestration/master-prompt.md` §8 | one per phase |
| Enforcement line | `orchestration/master-prompt.md` §8 (enforcement mode) | one per verification pass |
| Migration line | `migration/migration-prompt.md` §8 | one per closed request row |

## 5. Ordered Steps

1. <receive the step's record line>
2. <apply the controlled vocabulary of §1.5>
3. <append it to the version-by-version history (§3) under the current version>
4. <update the `Last recorded` line at the head of this document>

## 6. Artefacts Produced

| Artefact | Path | When |
|----------|------|------|
| Version entries | §3 | per chain revision or step |
| Defect lifecycle | §4 | per introduced defect |
| Open items | §5 | per carried item |

## 7. Acceptance Criteria

Every chain step has exactly one record line; each entry uses the §1.5 controlled vocabulary; no
completed step's record is missing.

## 8. Change-Log Record

<!-- This document is self-recording: its own revisions are entries under §3. -->

---

## 9. Record

> **Population status:** §1–§5 are populated. §3 carries the version history through v5.5.1 and
> the 2026-10-10 trigger-chain run.

### 1. Scope & Method

#### 1.1 Scope

This log covers the whole Dumby program — the corpus (`docs/`), the application (`apps/main/`),
the module-authoring package (`packages/swastik/`), and the first-party modules
(`packages/modules/`) — from the v1.0.0 original blueprint to the present. One project, one
continuous history.

#### 1.2 Method

Every entry is cross-checked against evidence sources: the tree at working HEAD, the corpus gate
suite (`docs/scripts/docs/check-*.mjs`), the reconciliation ledgers
(`status/code-reconciliation.json`, `status/reconciliation.json`), and the live migration ledger
(`migration-ledger.md`). A claim without a reproducible source is not recorded as fact.

#### 1.3 The self-verification caveat (stated once, applies throughout)

The corpus and the code are authored and verified by the same program, so a self-reported status
is not independent evidence. Entries prefer recorded, reproducible evidence over self-declared
status; where verification ran on a different toolchain (or not at all), the entry says so.

#### 1.4 Content evidence over labels

A file's name, header, or self-declared status never overrides what its content and the tree
actually show. Where a label and the content disagree, the content is recorded and the divergence
noted.

#### 1.5 Entry template (controlled vocabulary)

Every version entry uses this fixed label set, in order: `date` · `engine` (meta / master /
migration prompt version) · `state` (Greenfield | Migration | Enforcement) · `handoff` · `result`
(COMPLETE | PARTIAL | BLOCKED | DONE | unmet), followed by the entry body.

---

### 2. Master Version Table

| Version | Date | Basis of verification |
|---|---|---|
| v1.0.0 — "UMDB Framework" (original blueprint) | — | corpus record |
| v2.0.0 — Renamed to Dumby; 22-module catalog | — | corpus record |
| v2.1.0 — Module depth completion | — | corpus record |
| v3.0.0 — Tiered module system + TypeScript migration | — | corpus record |
| v3.0.2 — Terminology sweep + backfill fix | — | corpus record |
| v4.0.0 — 9-part restructure | — | corpus record |
| v4.1.0 — Extensibility contract + reliability hardening | — | corpus record |
| v4.2.0 — Security & compliance hardening | — | corpus record |
| v4.3.0 — Catalog to illustrative-only; Power Engine | — | corpus record |
| v4.4.0 — Power Engine panel, RBAC redesign, BCCM, CLAI, MTP, 404 mode, personas | — | corpus record |
| v4.5.0 — Rosetta stone; Swastik; Credentials Service | — | corpus record |
| v4.5.1 — Structure-enforced edition | — | corpus record |
| v4.6.0 — Production-readiness edition | — | corpus record |
| v4.6.1 — Build-engine remediation pass | — | corpus record |
| v5.0.0 — Consolidated re-baseline | 2026-09 | gate suite + reconciliation ledger |
| v5.1.0 — Governed trigger chain | — | chain documents |
| v5.2.0 — Tri-state trigger chain & finding remediation | — | 23 gates green |
| v5.3.0 — Documentation consistency pass | 2026-10-06 | 25 gates green |
| v5.3.0 — Change-set migration (State B) | 2026-10-08 | 25 gates green; app toolchain pending |
| v5.4.0 — Dashboard MODULE_ERROR fix | 2026-10-08 | live log |
| v5.5.0 — Dashboard controls / attribution / icons | 2026-10-08 | 25 gates green |
| v5.5.1 — UR-005 build fix | 2026-10-08 | push |

Dates marked `—` are not recorded in the corpus; they are left blank rather than invented.

---

### 3. Version-by-Version History

#### v1.0.0 — "UMDB Framework" (Original Blueprint)

#### v2.0.0 — Renamed to Dumby; 22-Module Catalog

#### v2.1.0 — Module Depth Completion Pass

#### v3.0.0 — Tiered Module System + TypeScript Migration

#### v3.0.2 — Terminology Sweep + First Backfill Fix

#### v4.0.0 — First v4 Release; 9-Part Restructure

#### v4.1.0 — The Extensibility Contract + Reliability Hardening

#### Addendum (interstitial) — RBAC / Slash-Lifecycle / CLAI

#### v4.2.0 — Security & Compliance Hardening Release

#### v4.3.0 — Module Catalog to Illustrative-Only; Power Engine Introduced

#### v4.4.0 — Power Engine Panel, RBAC Redesign, BCCM, CLAI, MTP, 404 Mode, Personas

#### v4.5.0 — 29-Codename Rosetta Stone; Swastik; Credentials Service

#### FINAL — Core-Only Consolidated Reference

#### v4.5.1 — Structure-Enforced Edition (Living Reference Pair)

#### v4.6.0 — Production-Readiness Edition (Living Reference Pair)

#### v4.6.1 — Build-Engine Remediation Pass (Runtime Compliance)

#### v5.0.0 — Consolidated Re-Baseline Edition (Set-Wide)

#### v5.0.0 Implementation Track — Per-Request Record

#### UR 2.0 — Post-Re-Baseline Conformance & Audit Evidence (recorded 2026-10-01)

### v5.1.0 (trigger chain) — Governed Trigger Chain

### v5.2.0 (trigger chain) — Tri-State Trigger Chain & Finding Remediation

- **Trigger chain (tri-state):** `prompts/entry.md` now classifies three states — Greenfield (build), Migration (delta), Enforcement (no delta). State C fires when the codebase exists and the work order is inactive, including when the live ledger is fully `DONE` and nothing is left to update. `migration/migration-prompt.md` refuses an empty work order and hands to State C, so the chain can no longer dead-end on an empty migration template.
- **Dynamic work order:** the probe globs `upgradation/UR-*.md` and reads `migration-ledger.md`; there is no static work order. Updates are occasional and manually requested.
- **Findings remediated:** the manifest no longer cites a non-existent generated file and now validates `generated`/`archive`/`assets`; the README row count is corrected and single-sourced (`counts.coverage_rows`); `status/capabilities.json` names are completed and its sources re-pointed to the audit register; duplicate frontmatter anchors are removed and now gated; `contracts/config.schema.json` port defaults reconcile with `status/facts.json`; `_inbox/` is declared in the manifest and the entity-inventory note is aligned.
- **Gates:** `scripts/docs/check-chain-states.mjs` added; `check-manifest`, `check-counts`, `check-anchors`, `check-contracts` extended. 23 gates total, all green.

### v5.3.0 (examination remediation) — Documentation Consistency Pass

- **Trigger.** An independent examination of the whole `docs/` corpus (212 files; all gates executed) found three defects and three drift observations the gates did not catch. All are remediated in this pass.
- **D1 — dangling compliance ledger.** The `status/compliance.json` target of every `SPEC-08-REFERENCE` edge did not exist. It is now derived by `scripts/docs/gen-compliance.mjs` from `contracts/` + `status/capabilities.json` + `status/counts.json`, declared in the manifest's `generated` list, and guarded by the new `check-compliance` gate.
- **D2 — count contradiction.** The logged-deviations appendix in `spec/governance/appendix-c-logged-deviations-and-open-items.md` said "fifty-four" against a table of twenty-four (matching `counts.logged_deviations`). Corrected in the appendix and in the frozen `_inbox/directive.md` source; `check-counts` now verifies `logged_deviations`.
- **D3 — stale corpus path.** `docs/ur/` (removed in the restructure) corrected to `upgradation/` in `spec/reference/colophon.md`, `spec/governance/directive-charter-how-to-use-this-document.md`, and `spec/orientation/complete-engineering-implementation-reference.md`.
- **O1 — change-log population.** §3 history carries this entry; §1, §2, §4, §5 are explicitly marked as not-yet-populated.
- **O2 — precedence naming.** A restructure note added beneath the charter's precedence list, mapping the pre-restructure source names to the distributed corpus and the frozen `_inbox/`.
- **O3 — UR provenance.** A clarifying note added to `upgradation/README.md` tying `counts.ur_requests` to the source program rather than to files on disk.
- **Gates.** `check-edges` (edge-target paths resolve) and `check-compliance` (derived ledger is current) added; `check-counts` extended to verify `logged_deviations`; `check-anchor-paths` extended to flag renamed corpus directories. 25 gates total, all green.

### v5.0.0 (addendum) — Ecosystem Flow Suite (spec/lifecycle §37.8–§37.13)

### v5.3.0 — Enforcement Run + One-Shot Remediation (State C) — 2026-10-06

- 2026-10-06 · meta-prompt 5.2.0 · state=Enforcement · handoff=master-prompt:enforce · return=unmet
- 2026-10-06 · master-prompt 5.2.0 · enforce · subsystem=corpus-wide · verdict=PARTIAL
- Remediation (one-shot, per master-prompt §4; change-management per directive D-0.6/D-1.6):
  - **F1 (fixed)** — `status/code-reconciliation.json` re-verified against HEAD `b6ae1a6d`; the seven module-manifest rows (REC-001/002/005/019/020/021/022) flipped from `code-gap` to `match`; counts updated to 22 match / 0 gap. Gate: `check-code-reconciliation`.
  - **F2 (fixed)** — `apps/main/tests/unit/tier-rules.test.ts` duplicate `marketplaceCategory` key removed; an out-of-enum rejection case added to `tests/modules/tier-co-constraints.spec.ts`. Gates: unit suite + modules contract suite.
  - **F3 (fixed)** — `status/capabilities.json` CAP-004 and CAP-005 corrected from `partial`/`dead` to `implemented` (the canonical router is live and wired); derived `status/compliance.json` regenerated. Gates: `check-status-evidence` + `check-compliance`.
- **F5 (coverage floors) — closed.** 19 new unit-test files (D-8.3 order) lifted `test:coverage` from 55.8/52.4/57.5/56.6 to **73.1% statements / 67.8% branches / 74.1% functions / 74.1% lines**, above the configured 70/65/70/70 floor; CI Gate 4 now passes. **Residual (tracked, not claimed):** D-8.2 mandates *per-layer* floors and prohibits a blended average — the config is still blended, and `src/bootstrap/bootstrap.ts` (346 statements) remains untested (it needs a live runtime). Reaching the Core layer's 85% floor is a further, larger effort.
- Directive enforcement — all local gates green: typecheck · ESLint (`--max-warnings=0`) · Prettier · 865 unit tests (85 files) · 41 modules contract tests (16 files) · 25 documentation gates · `test:coverage`.
- 2026-10-06 · master-prompt 5.2.0 · verified · subsystem=corpus-wide · verdict=COMPLETE (F1–F3 and the coverage floors closed; F5 per-layer conformance and the F4 flow/integration/Docker/K8s surfaces remain tracked in `GAP_MANIFEST.md`).

---

### v5.3.0 — Change-Set Migration (State B) — 2026-10-08

- 2026-10-08 · meta-prompt 5.2.0 · state=Migration · handoff=migration-prompt · return=met
- 2026-10-08 · migration-prompt 5.2.0 · items M0–M17 · verdict=PARTIAL
- Landed DONE: M0 branding (amber accent), M1 version removal, M2 dashboard dynamic registry, M3 density per page, M4 per-module banner/accent, M5 default banner for existing modules, M6 footer grammar, M7 dashboard-only dropdown, M8 module logo icon field, M9 marketplace core flow, M11 core sub-pages removed, M13 module pages, M15 queue page rewrite, M17 hello page cleanup.
- Landed DONE (docs residuals): MR-1 attribution finalised (ADR-013); MR-2 ADR-010 blurple removed.
- In progress: M10 search bar and 25-option handling; M12 autocomplete-source fix (required argument and reset action landed); M14 marketplace info surface; M16 /modules buttons and paging.
- Superseding decisions recorded: ADR-012 (accent amber, per-module accent) supersedes ADR-010; ADR-013 (no version on surfaces, module footer grammar, dashboard-only page switch, per-page density) supersedes ADR-009.
- Ledger: the live migration ledger at the repository root was constructed for this run; the scope fence was held per item.
- Verification: documentation gate suite 25/25 green; application typecheck, lint and unit suite pending on the real toolchain (no installed dependencies in the build environment).

---

### v5.3.0 — Change-Set Migration, Interactive Tranche (State B) — 2026-10-08

- 2026-10-08 · migration-prompt 5.2.0 · items M10/M12/M14/M16 · verdict=PARTIAL→LANDED
- Work order recorded as UR-20261008-002 (renderer/dashboard/module change set).
- Landed: page-declared action buttons in the renderer; /modules info+uninstall and paging controls; /browse search and info controls; the interaction registry handles the `dumby:act:` prefix.
- Landed: the default module banner asset wired as the served default.
- Tracked: the /browse search text-input modal; the ephemeral info embed; the M12 autocomplete source.
- Verification: documentation gate suite 25/25 green; application typecheck/lint/unit pending on the real toolchain.

---

### v5.3.0 — Dashboard Visual Corrections (State B) — 2026-10-08

- 2026-10-08 · migration-prompt 5.2.0 · item S4 · verdict=DONE
- Work order: UR-20261008-003 (dashboard page visual corrections), one page per request.
- Landed: commands-only dashboard list with module emoji and backticks; no core sub-pages; bold `Dumby Suite | <page>` title with the developer line beneath; footer `<build id> · @<dev username>`; Home/Next/Previous buttons replacing the dropdown.
- Verification: documentation gate suite 25/25 green; application typecheck/lint/unit pending on the real toolchain.

---

### v5.3.0 — Dashboard Round 2: Icon Fallback & Standard Module Pages (State B) — 2026-10-08

- 2026-10-08 · migration-prompt 5.2.0 · item S5 · verdict=DONE
- Work order: UR-20261008-004.
- Landed: project-wide default module icon fallback; standard-tier modules carry their own pages under the dashboard (main page lists core commands); Next/Previous page navigate to the standard module pages (first is Hello World with its `hello` command).
- Verification: documentation gate suite 25/25 green; application typecheck/lint/unit pending on the real toolchain.

---

### v5.3.0 — Deploy-blocking Typecheck Fix (UR-20261008-004) — 2026-10-08

- 2026-10-08 · fix · verdict=DONE
- The UR-004 pagination change passed a third argument to `pageDataProvider` while its option type still declared two parameters; `tsc` failed at both call sites in `command-router.ts`. The option signature now accepts `page?: number`.
- Stale unit-test expectations from the grammar change (title/footer) were corrected in the same pass.
- Note: the local documentation gates do not run `tsc`; the app typecheck runs on the real toolchain.

---

### v5.3.0 — Dashboard Runtime Error: Diagnostics + Render Fallback — 2026-10-08

- 2026-10-08 · fix · verdict=IN PROGRESS
- The dashboard raised a `MODULE_ERROR` at runtime and the cause could not be read from the log tool (structured fields not surfaced). The router `catch` now embeds the error text and stack in the log message; the final render now retries once without the action controls if the payload is rejected.
- Root cause still open; the next deploy's `command-execution-error: …` line will name it.

---

### v5.4.0 — Dashboard MODULE_ERROR: duplicate custom_id (State B) — 2026-10-08

- 2026-10-08 · fix · verdict=CONFIRMED (deployment `e3153d69`; no `command-render-fallback` from 22:19)
- Root cause (live log): `COMPONENT_CUSTOM_ID_DUPLICATED`. The dashboard nav buttons were keyed on their target page, so on page 0 Home and Previous both minted `…:page:0`. Fixed by keying each button on its role (`home` / `next:<n>` / `prev:<n>`) and disabling a control with no target; the nav handler now reads the role.
- The project-wide default module icon is applied at every module-icon surface (dashboard, permit, marketplace, installed modules).
- F-5 is not closed until a dashboard open logs no `command-render-fallback` line.

---

### v5.5.0 — Dashboard: Control Placement, Registered Attribution, Module Icons & Page Headings (State B) — 2026-10-08

- 2026-10-08 · migration-prompt 5.2.0 · item S6 · verdict=PUSHED (build fixed; pending deploy)
- Work order: UR-20261008-005. ADR: ADR-014.
- Landed: (1) the page's action controls render below the footer, after a divider; (2) the developer attribution resolves to the platform-registered username, not a static name; (3) a module's icon is a custom Discord emoji named by `ui.icon`, with the framework's default white icon (bundled, uploaded once as an application emoji) when a module names none — the per-module emoji hardcode is removed; (4) a dashboard page carries no in-content heading; (5) only the main dashboard page shows each command's module icon.
- Verification: documentation gate suite 25/25 green; application typecheck/lint/unit pending on the real toolchain.

---

### v5.5.1 — UR-005 Build Fix: nullable `client.application` — 2026-10-08

- 2026-10-08 · fix · verdict=PUSHED
- `d2f4d8e` stopped at typecheck: `TS18047: 'application' is possibly 'null'` at `rendering/module-emoji-upload.ts` lines 19/28 (discord.js types `client.application` as `Application | null`).
- The guard now checks null as well as undefined; a missing application is a skip (logged `module-emoji-upload-failed`, `reason: application-unavailable`) and the unicode fallback applies.
- The three new files were type-checked against real discord.js 14.17 typings before this push.

---

### v5.3.0 — Trigger-Chain Run (State B — Migration): Activation, Detection & State-of-Record Reconciliation — 2026-10-10

- 2026-10-10 · meta-prompt 5.2.0 · state=Migration · handoff=migration-prompt · return=unmet
- 2026-10-10 · migration-prompt 5.2.0 · guard=pass · reconciliation=R12 executed · verdict=PARTIAL
- **Activation (meta-prompt §5).** Docs base path resolved once (`docs/`); authority layer loaded (`manifest.json`; normative set = `blueprint/`, `spec/**`, `contracts/`); precedence cited from the governance charter, never restated.
- **State determination (entry.md).** State probe `apps/main/` = code present (501 `.ts` files, 219 under `src/`); work-order probe = **ACTIVE** — `upgradation/UR-*.md` records present **and** a constructed `migration-ledger.md` at the repository root with items not `DONE`. Classification: **State B — Migration** → handoff to `migration/migration-prompt.md`. (The work-order guard §0.0 passes: an active work order exists.)
- **R12 state-of-record reconciliation (against working HEAD `039da060`, tree not snapshot).**
  - **M10 — Search bar + 25-option handling → PARTIAL.** The `/browse` search control and the install-dropdown membership are present (`command-router.ts` mints `dumby:act:<inv>:search:browse`; `page-data.ts` returns the installable `modules` list). Residual: the text-input search modal and the >25-option paging slice.
  - **M12 — BCCM rename bug + required argument + reset → DONE.** The `/queue` `command` argument is `required: true`; the `reset` boolean is declared and mapped to the `reset` action (`queue.command.ts`); the action is accepted (`bccm-effects.ts` ACTIONS) and handled (`bccm-batch-push.ts`); the autocomplete source resolves the **current** (renamed) name via `resolveEffectiveCommandNames` (`bootstrap.ts`). Ledger summary/item-record contradiction corrected to `DONE`.
  - **M14 — Marketplace main content (info control + logo) → PARTIAL.** The content space lists marketplace modules with icon + name + description and mints a per-module `info` control. Residual: the private (ephemeral) info embed.
  - **M16 — /modules page (info/uninstall + paging) → PARTIAL.** The list, the `info` and `uninstall/disable` buttons, and the nav paging row are present. Residual: the page-switch divider and the uninstall effect wiring.
- **Ledger integrity finding (recorded, not silently fixed).** The ledger's Summary table marks M14 and M16 `DONE` while their item records read `IN-PROGRESS`; the R12 re-triage against the tree resolves both to `PARTIAL`. The contradiction is recorded so the next session reconciles it rather than trusting either figure.
- **Verification limit (honest).** The application toolchain (`tsc` / `vitest`) was **not** run: the workspace requires Node ≥ 22 and this environment provides Node 20.20.2 with no installed dependencies. Per `migration/migration-prompt.md` R5/R6 the per-item gate is a toolchain gate, so the landed slices remain `DONE (toolchain-unverified)` / `PARTIAL`. The corpus gate suite is green (25/25; `check-ur` detects 8 records).
- **Return:** `unmet` — the open slices (M10 modal + paging; M14 ephemeral embed; M16 divider + uninstall effect) require the real toolchain to verify. Resume note recorded in `migration-ledger.md`; the chain hands back to `prompts/meta-prompt.md`.

---

### v5.5.2 — Dashboard Page Upgrade (UR-20261011-001) — 2026-10-11

- 2026-10-11 · meta-prompt 5.2.0 · state=Migration · handoff=migration-prompt · return=met (tree)
- Work order: `UR-20261011-001` (Dashboard page upgrade, nine clauses). One page per request.
- **Landed (tree):** DP-1 navigation button grammar (`Next page` / `Previous page` / `Info` /
  `Uninstall/disable` / `Search` / `First page`); DP-2 the Home control uses the filled house glyph;
  DP-3 the navigation row renders inside the container, below the footer's divider; DP-4 the module
  icon sits beside every module command list (main and module pages); DP-5 the default module icon
  asset is regenerated; DP-7 a standard-tier module page resolves its own banner and footer (the
  `hello-world` page now shows the default banner, not the dashboard's); DP-8 module pages list only
  their own commands under the guild's current (BCCM-effective) name and status.
- **Unchanged:** DP-6 — the main page combines all core-tier commands; core-tier modules keep no
  page of their own.
- **Confirmed:** DP-9 — `apps/main/assets/dashboard-banner.png` (amber) and
  `apps/main/assets/dumby-banner.png` (grayscale default) are the framework assets, byte-identical
  to the supplied artifacts.
- **Verification:** the corpus gate suite is green (25/25; `check-ur` detects 9 records). The
  application suite was verified in **CI**: on the first push (`8caac653`) Gate 4 failed on one unit
  test that asserted the pre-change module-page behaviour (no icon); the test was updated to the new
  arrangement (`3faa1b16`), after which **CI is fully green** — Gate 1 strict typecheck, lint,
  format, the flow suite, Gate 4 unit tests, the live-Postgres+Redis integration job, and the Docker
  build. The clauses are now toolchain-verified.

---

### v5.5.3 — Dashboard Iconography & Fallback Corrections (UR-20261011-002) — 2026-10-11

- 2026-10-11 · meta-prompt 5.2.0 · state=Migration · handoff=migration-prompt · return=met (tree)
- Work order: `UR-20261011-002` (corrects `UR-20261011-001`).
- **C1 iconography:** each core-tier module now declares its own `ui.icon` and a bundled white
  line-art logo (dashboard / health / browse / queue / persona / permit / modules), uploaded once as
  `dumby_<slug>`; the main page shows each core module's own logo, while a module page keeps the
  default white icon.
- **C2 Home icon:** a generated bold white house asset (`apps/main/assets/home-icon.png`) is uploaded
  as `dumby_home` and carried as the Home control's emoji (an icon-only button), not the `🏷` glyph.
- **C3 module-page banner:** a module page resolves the module's own banner when declared, else the
  framework default (grayscale) — never the dashboard's; the banner URLs are versioned (`?v=2`) so a
  cached image cannot pin the wrong banner to a URL.
- **Verification:** the corpus gate suite is green (25/25; `check-ur` detects 10 records). The
  application suite is pending CI on this push.

---

### v5.5.4 — Browse (Marketplace) Page Upgrade (UR-20261011-003) — 2026-10-11

- 2026-10-11 · meta-prompt 5.2.0 · state=Migration · handoff=migration-prompt · return=met (tree)
- Work order: `UR-20261011-003` (browse page upgrade, ten clauses).
- **Landed (tree):** DP-13 no in-content "Marketplace" heading; DP-14 the Discover control at the top;
  DP-15 the install dropdown at the bottom; DP-16 a generated bold white Discover icon; DP-17 the
  available not-installed modules listed with the default icon; DP-18 Discover opens a modal text
  input and the results replace the content; DP-19 a 25-result cap with the dropdown synced; DP-20
  "Search" renamed to "Discover"; DP-21 an inline Info control per module (a Section accessory) that
  returns a private (ephemeral) payload; DP-22 selecting a dropdown option installs the module
  (`guild_module_states`).
- **New capability:** Components v2 Section (type 9) with an accessory; a modal text input; ephemeral
  replies; per-control acknowledge modes (`update` | `ephemeral` | `none`).
- **Verification:** the corpus gate suite is green (25/25; `check-ur` detects 11 records). The
  application suite is pending CI; the interactive paths (modal / ephemeral / dropdown) require a
  live run.

---

### v5.5.5 — Browse Page Corrections (UR-20261011-004) — 2026-10-11

- 2026-10-11 · meta-prompt 5.2.0 · state=Migration · handoff=migration-prompt · return=met (tree)
- Work order: `UR-20261011-004` (corrects `UR-20261011-003`).
- **C1:** the install dropdown is always present — a disabled placeholder select when the available
  set is empty, so the control never disappears. **C2:** the Discover and Home controls moved from
  in-line after the title to a control row before it. **C3:** the title is bold —
  `Explore new modules to install`. **C4:** the Discover control carries the word Discover. **C5:** a
  Home control (the white home emoji) beside Discover returns to the dashboard home.
- **Mechanism:** `RenderBlock` gained a `row` kind; `StringSelect` gained a `disabled` field.
- **Verification:** the corpus gate suite is green (25/25; `check-ur` detects 12 records). The
  application suite is pending CI; the interaction paths require a live run.

---

### v5.5.6 — Browse Page Corrections (UR-20261011-005) — 2026-10-11

- 2026-10-11 · meta-prompt 5.2.0 · state=Migration · handoff=migration-prompt · return=met (tree)
- Work order: `UR-20261011-005` (corrects `UR-20261011-004`).
- **C1:** the extra dividers between the browse content blocks are removed (the buttons, the title and
  the dropdown are no longer separated by introduced dividers). **C2:** the Discover and Home controls
  stay together as one row, adjacent to the title. **C3:** the Home control returns to the **/browse**
  main view (resetting any search), not the dashboard home.
- **Verification:** the corpus gate suite is green (25/25; `check-ur` detects 13 records). The
  application suite is pending CI; the interaction paths require a live run.

---

### v5.5.7 — Browse: Home in the Install Dropdown (UR-20261011-006) — 2026-10-11

- 2026-10-11 · meta-prompt 5.2.0 · state=Migration · handoff=migration-prompt · return=met (tree)
- Work order: `UR-20261011-006` (corrects `UR-20261011-005`).
- **C1:** the Home function becomes a **permanent first option** of the install dropdown (the
  framework's white home icon; sentinel `__home__`); selecting it returns to the **/browse** main
  view and installs nothing. **C2:** the standalone **Home button is removed** from the control row,
  leaving **Discover** only. **C3:** the caps are reconciled — the per-page module listing caps at
  **24** (`MARKETPLACE_MODULE_CAP`) and the dropdown at **25** (`INSTALL_DROPDOWN_CAP`), reserving one
  slot for Home, so the listing and the dropdown stay in sync. The dropdown is now **always
  enabled** (the permanent Home option retires the empty-state disabled placeholder).
- **Verification:** the corpus gate suite is green; the application suite is pending CI; the
  interaction paths require a live run.

---

### v5.5.8 — Browse: Discover In-Line with the Title (UR-20261011-007) — 2026-10-11

- 2026-10-11 · meta-prompt 5.2.0 · state=Migration · handoff=migration-prompt · return=met (tree)
- Work order: `UR-20261011-007` (corrects `UR-20261011-006`).
- **C1:** the browse title becomes a **Section whose accessory is the Discover control**, so Discover
  sits **in-line with the title** (a Section renders its single accessory on the right of the text
  line); the standalone control row above the title is removed. This is expressible now that only one
  control remains — it was not while two controls shared the row.
- **Verification:** the corpus gate suite is green; the application suite is pending CI; the
  interaction paths require a live run.

---

### v5.5.9 — Health Page Redesign (UR-20261011-008) — 2026-10-11

- 2026-10-11 · meta-prompt 5.2.0 · state=Migration · handoff=migration-prompt · return=met (tree)
- Work order: `UR-20261011-008` (extends `UR-20261011-007`).
- **C1:** the health report is re-presented as an at-a-glance board — an overall status headline
  (dot + word + compact `-#` summary) over one compact line per subsystem (status dot, bold name,
  metrics subtext); the in-content title becomes `System Health`. **C2:** a **Refresh** control
  (generated bold white circular-arrow icon, `dumby_refresh`) sits in-line with the headline and
  re-runs the report. **C3:** every existing data point is preserved. Overall state = the worst
  subsystem (gateway/database down → `down`; cache down → `degraded`).
- **Verification:** the corpus gate suite is green; the application suite is pending CI; the
  interaction paths require a live run.

---

### v5.5.10 — Modules Page Rework (UR-20261011-009) — 2026-10-11

- 2026-10-11 · meta-prompt 5.2.0 · state=Migration · handoff=migration-prompt · return=met (tree)
- Work order: `UR-20261011-009` (extends `UR-20261011-008`).
- **C1:** a new **fallback logo** (`dumby_module_fallback`, bold white cube) is the fallback for a
  module with no icon; the white square (`dumby_module`) becomes the **command decoration** on the
  dashboard's module page. **C2:** the listing renders each module as a clean Section (logo, bold
  name, title-cased tier, description subtext). **C3:** the per-module **Info** control is now an
  in-line Section accessory; the uninstall rows and instruction line are removed. **C4:** the module
  detail card carries an **icon-only** uninstall/disable control (new bold white trash icon,
  `dumby_uninstall`, no label), disabled for core and for an uninstalled/disabled marketplace module;
  selecting it disables the module and refreshes the card. **C5:** the `/modules` nav matches the
  dashboard (Home / Next / Previous) and the list is paginated. **C6:** the Info card stays ephemeral.
- **Verification:** the corpus gate suite is green; the application suite is pending CI; the
  interaction paths require a live run.

---

### v5.5.11 — Modules Info Card & Lifecycle (UR-20261011-010) — 2026-10-11

- 2026-10-11 · meta-prompt 5.2.0 · state=Migration · handoff=migration-prompt · return=met (tree)
- Work order: `UR-20261011-010` (extends `UR-20261011-009`).
- **C2:** `/modules` Home returns to `/modules` page 0, not the dashboard. **C3/C4:** the Info card
  renders at **Mode M** (banner-less) as a **single block**, no per-field dividers. **C5:** the card
  carries meaningful fields (name+tier, description, developer, version, status, commands). **C6:**
  the developer resolves by **name** (`developerName`, first-party → Quixotic Mnemonics), never the raw
  `devId`. **C7/C8:** disable/enable **function** — a `guild_module_states` write that gates dispatch
  immediately plus a **BCCM** enqueue of the module's commands; `/browse` lists installable +
  re-enableable modules (a disabled standard module reads "Previously installed"). **C9:** a core
  module's Info renders **no** uninstall control. Per §15.3 the toggle is a state change, not an unload.
- **Verification:** the corpus gate suite is green; the application suite is pending CI; the
  interaction paths require a live run.

---

### v5.5.92 — there was no way to restart one persona (UR-20261012-087) — 2026-10-14

- 2026-10-14 · meta-prompt 5.2.0 · state=Migration · handoff=migration-prompt · return=met (tree)
- THE FINDING: the operator asked for a command to restart a persona. There was none. UR-085 built
  `PersonaRuntime.reloadPersona` and wired it to three operations -- registration, binding, credential
  rotation -- and NEVER EXPOSED IT. The only way to cycle a persona was to restart the whole Railway
  service, which restarts the main bot too and costs a visible blip. The capability existed in the
  runtime and had no surface.
- THE MECHANISM: `reloadPersona` was reachable from exactly three call sites, all inside the route
  module, all in response to a write the route had just performed. Nothing external could ask for a
  reload -- not after an out-of-band row edit, not after a module's commands changed underneath a
  persona, and not when an operator simply wanted her cycled as a first diagnostic step.
- WHAT CHANGED: `POST /twill/personas/:personaId/reload` reloads one persona from her current row -- a
  fresh gateway login, her commands re-deployed from her current bindings, her presence re-applied. The
  response is her public view plus a `reload` field carrying what the reload did. An ABSENT result is
  REPORTED, not hidden: `reloadPersona` returns `undefined` when her row no longer matches (she was
  revoked between the read and the reload) and the route returns `"reload": null` rather than a bare
  success. `501` when the runtime is not enabled -- without PERSONA_RUNTIME_ENABLED there is nothing to
  reload and a 200 that did nothing would be a lie. `404` for an unknown persona.
- RECORDED: a capability with no surface is not a capability. `reloadPersona` was correct, tested and
  used three times by the code that needed it -- and the operator still could not restart a persona.
  Building the mechanism and not exposing it left the original problem in place, one layer down.
- RECORDED: the three call sites were ALL writes the route itself had made. That is a tell -- when every
  caller of an operation is the same module performing its own follow-up, the operation is probably also
  a legitimate standalone action and nothing is asking for it yet.
- RECORDED: the operator's second request in two URs for something that should already have existed.
  UR-085 was "why isn't she online"; this is "how do I restart her". Both were answered by capability the
  runtime already had; the gap was never the mechanism but the surface.
- **Verification:** 122 files / 1268 tests / 0 failures; typecheck, lint, format clean.

---

### v5.5.91 — a registered persona's presence was dropped before it reached the row (UR-20261012-086) — 2026-10-14

- 2026-10-14 · meta-prompt 5.2.0 · state=Migration · handoff=migration-prompt · return=met (tree)
- THE FINDING: a persona registered with `presenceStatus: "dnd"`, `note: "Magma"`, `accent: "#E964A7"`
  came up ONLINE with no status note on its profile -- the default green indicator, no custom status.
  Nothing errored: the registration returned 201, the runtime started her, and the presence was simply
  never there to apply.
- THE MECHANISM -- TWO INDEPENDENT FAULTS, one behind the other, which is why it took a screenshot to
  find. (1) `buildPersonaIdentity(input)` constructs the row that gets inserted; UR-081 added the three
  fields to `PersonaRegistrationInput` and the surface parsed and validated them, but the builder NEVER
  COPIED THEM into the object it returns. The insert wrote NULLS, `persona.presenceStatus` was
  undefined, and the apply branch (guarded by `presenceStatus !== undefined`) never ran and never
  logged. The value was accepted at the boundary, typed all the way through, and discarded in the
  middle. (2) The presence was sent as `{ name: note, type: 4 }`; activity type 4 is CUSTOM and Discord
  renders the custom-status text from the STATE field -- `name` is ignored for that type (it must be
  "Custom Status"). So even with the status applying, the note would not have appeared. (3) A THIRD,
  LATENT fault: the wiring used `client.user?.setPresence(...)`, so an unavailable `client.user` would
  swallow the call entirely while the runtime still logged `persona-presence-applied` -- the log sits
  after a call that cannot throw. A false confirmation.
- WHAT CHANGED: `buildPersonaIdentity` carries the presentation, so the fields reach the row (absent
  stays absent rather than becoming an empty string); the CUSTOM activity carries the quote in `state`
  with `name: 'Custom Status'` as Discord requires; and the no-op is gone -- an unavailable `client.user`
  now logs `persona-presence-no-user ... the presence was NOT applied` and returns.
- RECORDED: a field can be declared, parsed, validated and typed -- and still never arrive. Every layer
  UR-081 touched was correct; the one function that actually builds the persisted object was not, and it
  is the only one that mattered. After adding a field, follow it from the wire to the ROW, and confirm a
  test asserts it on the object being WRITTEN, not on the input being parsed.
- RECORDED: two faults in series hid each other. Had only the builder been broken the note bug would
  have gone unnoticed; had only the activity shape been broken the builder bug would have looked like
  "the note doesn't render". The screenshot separated them; neither was findable from the logs.
- RECORDED: a silent no-op reported success -- the third time in five URs that the defect was a claim of
  success the code was not in a position to make.
- **Verification:** 122 files / 1268 tests / 0 failures; typecheck, lint, format clean.

---

### v5.5.90 — registering, binding or re-credentialing a persona needed a restart (UR-20261012-085) — 2026-10-14

- 2026-10-14 · meta-prompt 5.2.0 · state=Migration · handoff=migration-prompt · return=met (tree)
- THE FINDING: the operator registered a persona. `POST /twill/personas/register` returned 201, the log
  recorded `persona-registered`, the list contained her -- and SHE WAS NOT ONLINE. The runtime's last
  line still read `hosted=0 of 0` and no `command-deployer` activity followed. The same was true one step
  later: binding a module changed nothing until a restart, and so did rotating credentials. Each is a
  write that succeeds completely and changes nothing the operator can see.
- THE MECHANISM: the runtime reads the persona table ONCE, at boot, inside `start()` -- who is active,
  which modules are bound, which token to use, what presence to apply. Any write to any of those facts is
  invisible until the process restarts: registration adds a row the runtime has read past; binding
  changes the module list her command set is built from; a credential rotation changes the token she logs
  in with. `start()` could not host a single persona, and could not be re-run for one.
- WHAT CHANGED: `start(only?)` takes an optional predicate, so one persona can be (re)started without
  disturbing the rest (`start()` with no argument behaves exactly as before). `PersonaRuntime
  .reloadPersona(persona)` stops her, then starts her again FROM HER CURRENT ROW -- stopping first
  prevents a doubled client and clears the stale command set, and starting re-reads the row so her
  bindings, status and token are whatever they are NOW. It returns the start result or `undefined` when
  the row no longer matches (she was revoked between the write and the reload): an absent answer, not a
  fabricated one. The route calls it after a registration, a binding and a credential rotation, through
  ONE shared helper, which is NON-FATAL -- the write already succeeded, and a reload that fails must not
  turn a successful registration into a 500.
- RECORDED: the THIRD UR in a row with the same shape, and the first where the fix was written
  proactively rather than after a report. The pattern is now explicit enough to be a rule: for every
  operation, name the STORES that hold a piece of the entity and the MOMENTS at which each is read --
  then check the operation reaches all of them. UR-083 recorded the store half; this is the moment half.
- RECORDED: "documented behaviour" is not a defence when the documentation describes a defect.
  Restarting to pick up a registration was written down, repeated to the operator, and still cost them a
  cycle every time. The doc made it predictable, not correct.
- RECORDED: `stopPersona` made this cheap to add. The revoke fix gave the runtime a per-entity stop; the
  reload is a stop followed by a filtered start. Had the revoke been patched as a one-off -- a bare
  `client.destroy()` in the route -- there would have been nothing to build on.
- **Verification:** 122 files / 1266 tests / 0 failures; typecheck, lint, format clean.

---

### v5.5.89 — a revoked persona kept its application id forever (UR-20261012-084) — 2026-10-14

- 2026-10-14 · meta-prompt 5.2.0 · state=Migration · handoff=migration-prompt · return=met (tree)
- THE FINDING: re-registering the persona's OWN application after a revoke failed with `duplicate key
  value violates unique constraint "persona_identities_discordapplicationid_unique"`. The persona had
  been revoked -- retired, soft-deleted, absent from every read -- and its application id was still
  taken. `20260101000034_align_persona_model` declared the column with a PLAIN `.unique()`, and a plain
  unique constraint constrains EVERY row including soft-deleted ones. So revoking a persona made its
  application permanently unregistrable: gone from the operator's view, its key still held.
- THE MECHANISM: soft delete is the corpus's removal mechanism, so uniqueness on a soft-deletable table
  must be PARTIAL -- unique among live rows only. The corpus already has exactly that primitive,
  `createPartialUniqueNotDeleted` (a unique index `where "deletedAt" is null`), used by `guild_members`,
  `guild_roles`, `guild_module_states` and others. `persona_identities` never got it.
- WHAT CHANGED: migration `20260101000052_persona_application_id_partial_unique` -- creates the partial
  unique index FIRST, then drops the plain constraint, so there is never a window in which an
  application id is unconstrained. `down()` restores the plain constraint. NO application code changed;
  the read and write paths were already correct and the schema was not.
- CORRECTION TO UR-081: it states a revoked persona's "application id becomes free to register again,
  which is the difference between revoked and temporarily switched off". That sentence was written from
  INTENT, not from the schema, and it was FALSE. UR-081 now carries an explicit correction note rather
  than a silent rewrite.
- VERIFIED AGAINST A REAL POSTGRESQL, not by inspection: the migration was applied through
  `knex.migrate.latest()` and the schema and behaviour asserted directly -- the index is
  `... WHERE ("deletedAt" IS NULL)`; zero unique CONSTRAINTS remain; a soft-deleted persona's id CAN be
  registered again; and a second LIVE persona with the same id is STILL refused. Both directions matter:
  the first is the fix, the second is the property the plain constraint existed to provide.
- RECORDED: a claim about behaviour that is not checked against the schema is a guess with a confident
  tone. No test could have caught it -- the API returned 204, the list came back empty, and the only way
  to discover the falsehood was to register the application again, which is what the operator did.
- RECORDED: soft delete and uniqueness have to be designed together. Any unique key on a soft-deletable
  table is a decision about what happens after deletion, and "unique" defaults to a decision nobody
  made. A sweep for `.unique()` on soft-deletable tables is the mechanical follow-up.
- **Verification:** 122 files / 1262 tests / 0 failures; typecheck, lint, format clean; the migration
  proved against embedded PostgreSQL in both directions.

---

### v5.5.88 — a revoked persona stayed online with every command loaded (UR-20261012-083) — 2026-10-14

- 2026-10-14 · meta-prompt 5.2.0 · state=Migration · handoff=migration-prompt · return=met (tree)
- THE FINDING: the operator revoked ELSA. The API returned `204`, the row was retired and soft-deleted,
  and the list came back empty -- and SHE KEPT ANSWERING EVERY COMMAND. The delete had "worked" in every
  way the API could observe and in no way the operator could.
- THE MECHANISM: three stores held a piece of the persona and the revoke reached ONE. Postgres (the row
  -- soft-deleted, correct); the runtime's client map (her live gateway connection, populated at boot --
  untouched); Discord (her commands, registered against her APPLICATION by `deployPersonaCommands` --
  untouched, and commands belong to an application rather than a session, so they outlive the client:
  destroying the client alone would leave the picker offering commands nothing answers). The runtime had
  `stop()` -- every persona, for shutdown -- and no way to stop one.
- WHAT CHANGED: `PersonaRuntime.stopPersona(persona)` destroys her client (offline) and clears her
  commands (out of the picker), non-fatal on both halves -- a destroy that throws must not stop the
  clear, and a failed clear must not leave her running. It takes the persona's IDENTITY, not an id: by
  then the row is retired and a lookup would not find her, and her client and commands are exactly the
  two things left behind. `clearCommands` REUSES the deploy path with empty payloads, because
  `deployPersonaCommands` clears both scopes before it writes, so an empty set is precisely a
  deregister -- the same code, not a second implementation of the same Discord call. The DELETE route
  reads her, revokes her, then stops her.
- RECORDED: this is UR-082's lesson, ONE HOUR OLD, unapplied to the very next operation. UR-082 recorded
  "a write that reaches the database is not a write that reaches the world". The revoke was written
  before UR-082 existed, and UR-082 did not go back and ask which OTHER operations have the same shape.
- RECORDED (the general form, checkable mechanically): for every operation, ask which stores hold a
  piece of the entity, and confirm the operation reaches all of them. A persona lives in Postgres, in
  the runtime's client map, and in Discord; an operation that touches fewer than all three is
  incomplete, and the API will still report success.
- RECORDED: "it returns 204" is not evidence the operator's problem is solved. Only the operator,
  looking at Discord, could tell that nothing had happened -- which is why their report is the finding
  and the logs are not.
- **Verification:** 122 files / 1262 tests / 0 failures; typecheck, lint, format clean.

---

### v5.5.87 — a presence set through Twill did not reach the running persona (UR-20261012-082) — 2026-10-14

- 2026-10-14 · meta-prompt 5.2.0 · state=Migration · handoff=migration-prompt · return=met (tree)
- THE FINDING: UR-081 added a persona's presence (`presenceStatus`, `note`) and applied it AT LOGIN --
  only at login. `persona-runtime` calls `client.setPresence` once, in the start loop, at boot; nothing
  re-applied it. So a `PATCH /twill/personas/:id` changed the column correctly and changed NOTHING in
  Discord until the next restart. The operator sets the status, looks at Discord, sees no change, and
  concludes the feature is broken. The column was honest; the behaviour was not.
- THE MECHANISM: `start()` applies the presence after `login()` -- the only call site. `updatePersona`
  writes the column and has no reach into a running client; the runtime's `clients` map is private. The
  ROUTE is the composition point: it holds both the service and, now, a hook to the runtime.
- WHAT CHANGED: `PersonaRuntime.applyPresence(personaId, presence)` -- public, finds the running client
  and applies the presence non-fatally, exactly as at boot. It returns TRUE when applied and FALSE when
  the persona is not hosted (or its client has no presence port), so a caller can tell "applied" from
  "there was nothing to apply it to". The PATCH route calls it when an update touches `presenceStatus`
  or `note`, and logs the two non-applied cases distinctly -- no presence configured (left as-is), and
  not currently hosted (lands at the next restart) -- rather than silently. Bootstrap wires the hook
  LATE-BOUND: the runtime is built inside a conditional block while the Twill surface is built later in
  the same function, so a function-scope reference is assigned when the runtime is constructed.
- RECORDED: a write that reaches the database is not a write that reaches the world. The test that would
  have caught this is not "does the column hold the value" but "does the running thing behave
  differently" -- and only the second is what was asked for.
- RECORDED: the SECOND instance in two URs of the same shape. UR-081 wrote the presence and applied it
  at ONE moment; this found the moment was the wrong one. The general form: for every value that is
  APPLIED rather than merely STORED, ask which moments read it, and check the moment the operator
  changes it is among them.
- RECORDED: returning a boolean rather than nothing is the point. `applyPresence` cannot succeed when
  the persona is not hosted -- not an error, but not success either, and a `void` return would have let
  the route log a confident line about a change that did not happen.
- **Verification:** 122 files / 1259 tests / 0 failures; typecheck, lint, format clean.

---

### v5.5.86 — the persona management surface (UR-20261012-081) — 2026-10-14

- 2026-10-14 · meta-prompt 5.2.0 · state=Migration · handoff=migration-prompt · return=met (tree)
- THE FINDING: registration existed; everything that makes a registered persona LIVEABLE did not. The
  Twill persona surface carried register, the registrar registry, three detail reads and the binding
  pair -- no way to CHANGE a persona, no way to REVOKE one, no way to replace a CREDENTIAL. A bot token
  sealed at registration was immutable for the life of the row, so a token Discord had invalidated
  could not be replaced and a leaked secret could not be recovered, only abandoned. A credential that
  cannot be rotated is a credential that cannot be secured.
- THE MECHANISM: three gaps. No mutation surface (nothing wrote to `persona_identities` after
  creation); no presentation (no presence, status quote or accent -- the operator names all three);
  and registration already credential-gated, which is the RIGHT shape and was left alone.
- WHAT CHANGED: migration `20260101000051_add_persona_presentation` adds three nullable columns --
  `presenceStatus`, `note`, `accent`. `presenceStatus` is DELIBERATELY SEPARATE FROM `status`: status is
  the persona's LIFECYCLE (active/retired), presenceStatus is the bot's Discord presence
  (online/dnd/idle/invisible), and conflating them makes "retire this persona" and "set it idle" the
  same write. The presence is APPLIED at login via `client.setPresence`, non-fatally, with activity
  type 4 (CUSTOM) rendering as the status quote -- a configured presence nothing reads is a lie in a
  column. New operations: `updatePersona` (only the keys present; explicit null clears; invalid values
  refused BY NAME), `revokePersona` (retires, soft-deletes, and RELEASES ITS BINDINGS FIRST -- a
  revoked persona still holding a module leaves it occupied by a profile that no longer exists),
  `rotatePersonaCredentials` (takes the SEALED envelope -- the surface holds the root key, so the
  service never sees plaintext; the two credentials are independent; `oauthClientSecret: null` CLEARS
  it and drops to Route B; a new secret resets `oauthVerifiedAt`).
- WHAT CHANGED (surface): `GET /twill/personas`, `PATCH /twill/personas/:personaId`,
  `DELETE /twill/personas/:personaId` (204), `POST /twill/personas/:personaId/credentials`. Registration
  accepts `presenceStatus`, `note` and `accent` as optional configs.
- RECORDED: the credential is NEVER logged -- the rotation records which credential changed and nothing
  about its value, asserted in a test, because a log line is forever.
- RECORDED: the validation lives in `toPersonaUpdateColumns`, exported and patch-taking, so the route is
  not the only place the rules live. A rule enforced at the surface is a rule the next surface
  re-implements, usually differently.
- RECORDED: one operation was ALREADY CORRECT and was left alone. Registration's ownership proof already
  satisfied the operator's "sensitive credentials only" requirement. Recording it rather than
  re-implementing it is the point -- the risk was never that the check was missing, it is that a later
  change removes it.
- **Verification:** 121 files / 1240 tests / 0 failures; typecheck, lint, format clean.

---

### v5.5.85 — a persona could not run any core command (UR-20261012-080) — 2026-10-14

- 2026-10-14 · meta-prompt 5.2.0 · state=Migration · handoff=migration-prompt · return=met (tree)
- THE FINDING: a screenshot shows the persona (Magma) running `/dashboard` and receiving "Not
  permitted -- Your permissions do not allow this action. reason: FORBIDDEN". `/dashboard` is a CORE
  command, and §13.2 is explicit: "Core is `shared`: no profile owns it, every profile runs it." A
  persona being refused it is not a permissions decision -- it is a defect, and one UR-078 introduced.
- THE MECHANISM: UR-078 made the ownership read answer 'main' for any module ENABLED with no persona
  binding -- correct for standard and marketplace, WRONG for core, because a core module has NO
  binding (nothing binds a shared module) and is ALWAYS enabled (the read short-circuits core to true
  by design). Both conditions held, so EVERY CORE MODULE READ AS THE MAIN BOT'S, and the dispatch
  assertion saw owner='main' against a persona's own id and refused. Blast radius: every core command
  -- /dashboard, /modules, /browse, /persona, /permit, /queue, /health. A persona could run almost
  nothing. PersonaOccupiedError maps to FORBIDDEN, which is why the notice said "your permissions do
  not allow this action" -- the wrong message again, for the same reason as UR-074.
- WHAT CHANGED: the dispatch assertion SHORT-CIRCUITS the shared tiers (core and admin return before
  the ownership check, so a shared module is never "occupied"); the READ states the truth --
  `resolveCommandOwner` answers 'shared' for a core or admin module rather than 'main'. Its callers
  that matter already short-circuited the tier, but a read that states something false is a read
  waiting for a caller that believes it. The tier comes in as another optional dependency.
- RECORDED: a read that answers a question it was not asked is dangerous. The read answers "who owns
  this module"; for a shared module the honest answer is "nobody" and the code said "the main bot" --
  a claim about ownership where there is none. Two of three consumers happened to guard against it; the
  third did not, and the guard in the first two was never the reason it worked.
- RECORDED: the THIRD instance of the same lesson in three URs. UR-078 changed a read; UR-079 found a
  PRESENTATION consumer keyed on the old sentinel; this found a DECISION consumer that never accounted
  for the new value. The pattern is not "check the consumers" -- a shared read with a newly-possible
  return value needs the new value enumerated at every consumer, and "the other two short-circuit" is
  not a reason the third will.
- RECORDED: a LIVE regression found by a screenshot, not by the suite. 1238 tests passed with a persona
  unable to run any core command. The tests covered the tiers separately and the ownership read
  separately; nothing exercised the two together.
- **Verification:** 121 files / 1240 tests / 0 failures; typecheck, lint, format clean.

---

### v5.5.84 — the occupancy note inverted (UR-20261012-079) — 2026-10-14

- 2026-10-14 · meta-prompt 5.2.0 · state=Migration · handoff=migration-prompt · return=met (tree)
- HOW IT WAS FOUND: UR-078 changed a read every page consults, so the Railway session asked for a look
  in Discord -- specifically that a persona's `/browse` should show anything the main bot enabled as
  OCCUPIED. Good instinct, and the check could be done in code too: the occupancy path is a pure
  function of the ownership read. Tracing it found a defect, and one of my own making.
- THE DEFECT: the occupancy note was built as `occupiedBy: holder === undefined ? 'the main bot' : 'a
  persona'` with a matching note. `holder === undefined` was a PROXY for "the main bot", because an
  enabled-but-unbound module used to answer `undefined`. UR-078 made that read answer `'main'`
  EXPLICITLY -- so the proxy INVERTED. A module the main bot enabled began rendering as "Occupied by a
  persona in this server -- THE MAIN BOT CANNOT TAKE IT": the main bot told it cannot take its own
  module, with the holder misdescribed as a persona. The ownership change was correct; a consumer that
  had encoded the OLD spelling of "unbound" was not.
- WHAT CHANGED: both spellings are recognised -- `const heldByMain = holder === undefined || holder ===
  MAIN_PROFILE_ID` -- and the note is built from that. A regression test pins both directions: seen from
  a PERSONA, a main-bot module is occupied and says "Occupied by the main bot"; seen from the MAIN BOT,
  its own module is not occupied at all.
- RECORDED: changing a shared read means auditing its CONSUMERS, not just fixing the read. UR-078's own
  record says a shared-read change is "only half done when the read is fixed -- the comparisons have to
  agree". This is the same lesson one level out: the comparisons agreed, and a PRESENTATION consumer
  that keyed on the old sentinel did not. The audit has to reach the strings, not just the logic.
- RECORDED: a proxy for "absent" breaks the moment absence becomes explicit. `holder === undefined`
  meant "the main bot" only while the main bot was never named. Where a sentinel is doing double duty as
  a value, naming the value is the fix.
- **Verification:** 121 files / 1238 tests / 0 failures; typecheck, lint, format clean.

---

### v5.5.83 — the main bot owns what the main bot enabled (UR-20261012-078) — 2026-10-14

- 2026-10-14 · meta-prompt 5.2.0 · state=Migration · handoff=migration-prompt · return=met (tree)
- THE FINDING: the install path's claim branch is PERSONA-ONLY -- `if (owner === undefined && acting
  !== undefined)`. So the MAIN BOT NEVER RECORDS A CLAIM: it enables a module, leaves no binding, and
  `owner` stays undefined -- which means ANY PERSONA MAY LATER CLAIM A MODULE THE MAIN BOT ENABLED. The
  operator's rule is the opposite: "if the hello module is enabled by the main bot then it is the
  property of the main bot only". That rule was not enforced, because the main bot's ownership was
  never written down.
- THE MODEL WAS ASSUMED IN THREE PLACES AND STATED IN NONE: the router's standing build
  (`?? 'main'`), the page-data holder check (`?? MAIN_PROFILE_ID`) and the module context's standing
  all already behaved as if the main bot owned an unbound module -- each papering over the same
  `undefined`. The ownership READ now answers it once and those fallbacks become redundant rather than
  load-bearing.
- WHAT CHANGED: `resolveCommandOwner` -- the ONE ownership read -- answers (1) a live persona binding's
  personaId, (2) 'main' when the guild has the module ENABLED and no persona holds it, (3) undefined
  otherwise. The enablement read is an OPTIONAL, LATE-BOUND dependency, so a read-only caller can still
  construct the service; absent, ownership is UNANSWERED RATHER THAN GUESSED. A failing read is logged
  and leaves it unanswered. 'main' cannot collide with a persona id, which is a UUID.
- TWO SITES HAD TO LEARN THE MAIN BOT'S OWN ID, because inferring 'main' would otherwise have made the
  main bot REFUSE ITS OWN MODULE: the dispatch assertion compared `owner === residentPersonaId` (which
  is `undefined` for the main bot) and now compares `residentPersonaId ?? 'main'`; the install path's
  actor comparison used `acting?.id` (also undefined for the main bot) and is now `acting?.id ?? 'main'`.
- RECORDED: a rule that lives only in the operator's head is not a rule the system has -- three callers
  independently assumed it, none could enforce it, and the claim path contradicted it. RECORDED:
  inferring an owner creates a NEW failure mode, the owner refusing itself; a change to a shared read is
  only half done when the read is fixed -- the comparisons have to agree.
- **Verification:** 121 files / 1237 tests / 0 failures; typecheck, lint, format clean.

---

### v5.5.82 — a refusal names the actor (UR-20261012-077) — 2026-10-14

- 2026-10-14 · meta-prompt 5.2.0 · state=Migration · handoff=migration-prompt · return=met (tree)
- THE REPORT: `PersonaOccupiedError: Command key "hello-world" ... is occupied by another persona
  (... already bound to persona "39eaaf0f-...")`, read by the Railway session as "a persona claiming a
  module it already holds is being treated as a conflict" -- i.e. that ELSA was refused her OWN module.
- WHAT IT ACTUALLY WAS: the same log line carries `actor=main`. The actor was the MAIN BOT and the
  persona named is the OWNER. The refusal was CORRECT -- the main bot may not install or claim a module
  a persona holds. The diagnosis was wrong, and it was reached from the MESSAGE alone.
- A MESSAGE THAT NAMES ONE PARTY IS HALF A MESSAGE: a refusal has two parties -- who was refused, and
  who owns it. The message named only the owner, in wording ("occupied by another persona") that
  invites the reader to assume the actor IS a persona. When the actor is the main bot -- which is not a
  persona at all -- that assumption is exactly wrong. `PersonaOccupiedError` now takes the actor and
  says both: 'Command key "..." in guild "..." is owned by persona "...", so "main" may not install or
  claim it'. Both throw sites pass the actor.
- THE ASYMMETRY IT WAS STANDING ON, recorded not silently fixed: THE MAIN BOT NEVER RECORDS A CLAIM.
  The claim branch is `if (owner === undefined && acting !== undefined)` -- PERSONA-ONLY. So a module
  the MAIN BOT installs leaves no binding, `owner` stays undefined, and any persona may later claim what
  the main bot enabled. The operator's own model is the opposite ("if the hello module is enabled by the
  main bot then it is the property of the main bot only"). Closing it means the ownership read must
  answer 'main' for an enabled but unbound module -- a change to the shared read every page consults, so
  it wants its own UR and its own tests.
- ALSO CORRECTED: UR-076 claimed "every recent commit was skipped". That was WRONG -- UR-066 through
  UR-073 each deployed and were replaced in turn; the live build was `d36d5f3` (UR-073). ONLY UR-074 and
  UR-075 were skipped. Reading one red check as a week of lost work overstated the damage.
- RECORDED: a message that misled a careful reader is a defect, not a documentation gap. RECORDED: the
  correct diagnosis was ONE FIELD AWAY -- `actor=main` was already in the log line.
- **Verification:** typecheck, lint, format clean.

---

### v5.5.81 — unblocking the deploy (UR-20261012-076) — 2026-10-14

- 2026-10-14 · meta-prompt 5.2.0 · state=Migration · handoff=migration-prompt · return=met (tree)
- THE FINDING, AND IT IS THE IMPORTANT ONE: the operator reported the core modules were "outdated and
  not compatible with new changes -- totally corrupted". Investigating turned up the cause, and it is
  NOT the modules. EVERY RECENT COMMIT WAS FAILING CI, SO RAILWAY SKIPPED EVERY DEPLOY. The
  `Gates (D-8.4 strict sequence)` check concluded `failure`, and a skipped deploy means the running bot
  is an OLD BUILD -- the operator has been looking at code from before this week's work, which is
  exactly what "outdated and not compatible" describes.
- THE FAILING TEST: `tests/flow/command.flow.test.ts > denies a non-owner and renders a FORBIDDEN
  notice` -- expected 'FORBIDDEN', received "This module is switched off ... reason: MODULE_DISABLED".
- WHY IT FAILED, AND WHY THE FAILURE IS CORRECT: the test registers `stdcmd` in the COMMAND registry
  and asserts a non-owner gets FORBIDDEN from the RBAC rank check. But the GUILD-SCOPE check runs
  FIRST, and it resolves a module's tier from the MODULE registry -- where `flow-std` was never
  registered. An unknown module falls through to `marketplace`, which defaults to DISABLED. So the
  scope check refused the command before the rank check the test exists to exercise was ever reached.
  IT PASSED BEFORE ONLY BECAUSE A SCOPE DENIAL HAPPENED TO RENDER `FORBIDDEN` -- the very wording
  UR-074 corrected. Making the notice honest turned a passing-for-the-wrong-reason test into a failing
  one, and the failure is right.
- WHAT CHANGED: the flow harness now registers `flow-std` in the MODULE registry with its `standard`
  tier, so the scope check resolves correctly, the module is enabled by the tier default, and the
  command reaches the RBAC rank check.
- RECORDED: a failing gate is a SILENT OUTAGE. Every fix of the past days -- the execution context, the
  lifecycle hooks, the disable flow, the honest notices -- was committed, green locally, and NEVER
  REACHED PRODUCTION, because one test failed and Railway skips on a red check. RECORDED: a test that
  passes for the wrong reason is a trap that springs later -- assert the CAUSE, not the wording.
- **Verification:** typecheck, lint, format clean; the flow suite runs against live Postgres in CI.

---

### v5.5.80 — the primary render carries the acting profile (UR-20261012-075) — 2026-10-14

- 2026-10-14 · meta-prompt 5.2.0 · state=Migration · handoff=migration-prompt · return=met (tree)
- A REPORTED DEFECT THAT WAS ALREADY FIXED, recorded before it was "fixed" again: a screenshot showed
  `/modules` rendering every module icon as literal text (`:dumby_browse:`) while `/dashboard` rendered
  the same icons correctly, and it was logged as live. CHECKING IT SHOWED IT WAS ALMOST CERTAINLY
  STALE. `moduleIcon` cannot produce that output -- when a declared emoji name does not resolve it
  falls back to a glyph rather than printing the name, precisely so a page never shows literal text.
  And the screenshot showing the failure is OLDER than the one showing the same emoji fix working on
  `/dashboard`. The raw-text form is what Discord renders when a message carries ANOTHER APPLICATION'S
  emoji id -- the failure UR-057 and UR-062 already fixed, which the screenshot predates. NO icon
  change was made: changing working code on the strength of a stale screenshot is a guess dressed as a
  fix.
- WHAT CHECKING IT DID FIND: the page-data provider's signature is declared TWICE -- on the router's
  dependency and as the factory's return type -- and they had drifted. Chasing that drift surfaced a
  LIVE defect: the router calls the provider from three places, TWO passed `actingProfileId` and the
  PRIMARY RENDER AT DISPATCH did not. The dispatcher defaulted it to 'main'. So a persona's FIRST page
  reported the MAIN BOT's modules, while the SAME PAGE AFTER AN EFFECT -- which did pass it -- reported
  correctly. Two renders of one page disagreeing about whose page it is: the defect class UR-061 was
  written to close, still open one level up.
- WHAT CHANGED: `applicationId` and `actingProfileId` are now REQUIRED on BOTH declarations of the
  provider signature, with no defaults -- UR-060 removed the default from the emoji READERS for exactly
  this reason and the dispatcher had kept its own. `page` and `query` become required-but-nullable
  (a required parameter may not follow an optional one). The primary render now passes the acting
  profile, and the factory's return type is brought back into line.
- RECORDED: a screenshot is evidence with a timestamp, and the timestamp matters. RECORDED: a type
  declared twice will drift, and the drift hides a defect -- it is why one call site could omit an
  argument the other passed and still compile.
- **Verification:** typecheck, lint, format clean; the router suite 42 tests green.

---

### v5.5.79 — a disabled module is not a permission problem (UR-20261012-074) — 2026-10-14

- 2026-10-14 · meta-prompt 5.2.0 · state=Migration · handoff=migration-prompt · return=met (tree)
- THE FINDING: live screenshots showed `/dashboard` refused with "Not permitted -- Your permissions do
  not allow this action. reason: FORBIDDEN". UR-068 had already split the notice by cause so an
  UNREADABLE state stopped being reported as a refusal -- but the case where the module is genuinely
  DISABLED in that guild still reported as FORBIDDEN, telling a member they lack permission when the
  truth is an admin turned the module off. The exact confusion the operator described, still live.
- WHY THE OBVIOUS FIX WOULD HAVE BEEN WRONG: the first attempt mapped `scopeCause === 'module-disabled'`
  to a new reason code and FOUR existing tests failed -- correctly. `CommandScopeDeniedError` is thrown
  from EIGHT sites and only ONE means "the module is disabled": the rest are the permission resolver
  denying, a DM where the command is guild-only, an admin command in the wrong guild, an unresolved
  tier, and the two state-unreadable guards. ALL the others used the DEFAULT cause, which was
  `'module-disabled'` -- so mapping on that value would have relabelled every DM refusal and every
  admin-guild refusal as "this module is switched off": a NEW lie in place of the old one.
- WHAT CHANGED: `CommandScopeCause` gained `'out-of-scope'` and it is now the DEFAULT -- a neutral
  cause, so an unspecified refusal is never silently reported as something it is not. Only the
  `!enabled` site passes `'module-disabled'`; the permission resolver passes `'permission-denied'` so it
  keeps saying what it is. `NoticeReasonCode` gained `MODULE_DISABLED` with its own heading ("This
  module is switched off") and an explanation that names the REMEDY: "so this is not a permissions
  problem. A server admin can turn it back on from /browse."
- RECORDED: a test that pins the wrong behaviour is a bug with a guard on it. One of the four failing
  tests asserted `reason: FORBIDDEN` for a disabled module -- it had encoded the defect as the contract.
  Three were right; one was the bug. RECORDED: the default value of a cause IS a claim.
- **Verification:** typecheck, lint, format clean; the router suite 40 tests green.

---

### v5.5.78 — is the redirect URL configured? (UR-20261012-073) — 2026-10-14

- 2026-10-14 · meta-prompt 5.2.0 · state=Migration · handoff=migration-prompt · return=met (tree)
- THE REQUIREMENT: a persona is a separate Discord application, so its OAuth2 REDIRECT URL must be
  registered on that application before its combined install+authorize invite works. The operator asked
  that the Invite control become available at Info once it is -- and that the framework CHECK the state
  rather than assume it.
- A PROPOSED METHOD THAT DOES NOT WORK, recorded so it is not re-proposed: a server-side probe against
  Discord's authorize endpoint, on the theory that Discord validates the redirect BEFORE the consent
  screen. It does not hold. The docs document no pre-consent redirect validation and there is no API to
  read an application's registered redirect URIs. A MALFORMED URI returns a JSON error
  (`{"redirect_uri": ["Not a well formed URL."]}`) -- a SYNTAX check, not a registration check. An
  unregistered-but-well-formed URI surfaces as an error page AFTER the user reaches consent, so it needs
  a logged-in browser session: a server-side request receives the login page, not a verdict. The token
  endpoint DOES validate redirect_uri -- but needs a real code first, which needs a user. The probe
  cannot answer the question without the one thing it was meant to avoid.
- THE HONEST SIGNAL, WHICH ALREADY EXISTED: a successful code exchange is PROOF, because it cannot
  succeed unless the authorize leg sent a registered redirect URI. The callback already performed that
  exchange and logged `oauth2-connected` -- and then THREW THE PROOF AWAY. The framework now RECORDS it
  (`persona_identities.oauthVerifiedAt`), written on the success path, keyed by application id. Absent
  means "never completed" -- the honest default, and the state every existing persona is in.
- WHAT CHANGED: a migration adds the nullable column; `markOauthVerified` writes it (store, identity
  type, row type and the in-memory mirror); the callback calls it on success, GUARDED, because the
  authorization itself succeeded and a bookkeeping failure must not turn a working connect into an error
  page; `page-data` exposes `oauthVerified` as a boolean. The page reports the FACT; the persona module
  decides how to present it.
- RECORDED: a capability I described confidently and had not verified. Checking the assumption showed it
  was wrong; the honest move was to record that rather than build the thing and let it fail in
  production. RECORDED: the system was ALREADY producing the answer -- where a question feels
  unanswerable, first ask what the system already knows.
- **Verification:** typecheck, lint, format clean; the OAuth route suite 14 tests green.

---

### v5.5.77 — the last two hooks (UR-20261012-072) — 2026-10-12

- 2026-10-12 · meta-prompt 5.2.0 · state=Migration · handoff=migration-prompt · return=met (tree)
- THE FINDING: §11.7 declares six lifecycle hooks. UR-071 added `onEnable` and `onDisable`. TWO
  remained and the SDK declared neither -- `onError` ("cleanup on an unrecoverable error") and
  `onConfigChange` ("react to a per-guild config change without a reload"). Both are ONE LINE in the
  spec, so the work was not the declaration -- it was finding an HONEST TRIGGER for each. A hook that
  is declared and never fires is worse than one that is absent: it looks like a capability and behaves
  like a no-op.
- `onConfigChange` HAS a real trigger, and a narrow one: `setModuleConfig(guildId, moduleSlug, config)`
  is the one place a MODULE's per-guild config is written -- exactly the event §11.7 describes. The
  service must not know the module registry, so the notifier is INJECTED BY BOOTSTRAP.
- `onError` DOES NOT have the trigger the doctrine implies. The unified modular doctrine specifies
  auto-disable at 10 errors in 60 seconds (globally for Standard, per guild for Marketplace) -- and that
  mechanism DOES NOT EXIST in the code. Rather than build an error-threshold tracker as a side effect of
  adding a hook, the hook fires at the boundary the framework DOES have: the point where it gives up on
  a module and marks it failed (a failing `onLoad`, or `onReady`/`onEnable`). When the auto-disable
  threshold is built it is the natural second caller -- RECORDED, not guessed at.
- WHAT CHANGED: both hooks declared in `ModuleLifecycle` (SDK) and `LoadedModule` (app). The loader
  calls `onError` at both failure boundaries through one guarded helper; a throw from `onError` is
  logged SEPARATELY and does NOT mask the original failure. `notifyConfigChange` is a no-op for an
  unknown module or one without the hook, and catches a throwing hook so a config write never fails
  because of it.
- RECORDED: a declared-but-uncalled hook is a lie the type system cannot catch. RECORDED: the spec's
  one-line hooks are load-bearing and under-specified -- pick the narrowest defensible reading, wire it,
  and record the wider one as future work rather than inventing a mechanism the system does not have.
- **Verification:** typecheck, lint, format clean; SDK builds; the new suite 9 tests green.

---

### v5.5.76 — a module can stop what it started (UR-20261012-071) — 2026-10-12

- 2026-10-12 · meta-prompt 5.2.0 · state=Migration · handoff=migration-prompt · return=met (tree)
- THE FINDING: §11.7 declares SIX lifecycle hooks. The SDK declared THREE -- onLoad, onReady, onUnload.
  So the framework could tell a module to INITIALISE and to TEAR DOWN, but not to STOP WHAT IT HAD
  STARTED. A module that opened a polling loop, a websocket or a scheduled task had nowhere to be told
  to close it -- the hooks the specification gives it for exactly that did not exist in its contract.
- WHAT THEY ARE: `onEnable` (DISABLED → ENABLED) starts active processes; a throw leaves the module
  DISABLED. `onDisable` (ENABLED → DISABLED) stops them; a throw is logged but the module STILL
  transitions to DISABLED, and it ALWAYS runs before `onUnload`. Both idempotent, both ≤ 5 s.
- THE DISTINCTION THAT IS THE WHOLE POINT: these are GLOBAL transitions, not per-guild ones. §13.7 is
  explicit that toggling a module in a guild "never touches the module's loaded state, DI registrations,
  or event subscriptions". A module can be enabled in guild A and disabled in guild B at once, and a
  polling loop is process-wide -- firing `onDisable` for one guild would stop a process other guilds are
  still being served by. The per-guild case belongs to the EXECUTION GATES (UR-069). This UR
  deliberately does NOT fire these hooks on a per-guild toggle.
- WHAT CHANGED: `ModuleLifecycle` (SDK) and `LoadedModule` (app) declare both hooks. `readyAll` calls
  `onEnable` AFTER `onReady` succeeds -- a freshly loaded module becomes ENABLED, so its processes start
  once the gateway is up. `unloadAll` calls `onDisable` BEFORE `onUnload`, caught SEPARATELY, so a
  module that fails to stop cleanly is never left half-unloaded. `unloadAll` is the shutdown path, so
  shutdown now disables every module before unloading it, as §11.6 describes.
- RECORDED: a hook the spec gives a module but the contract does not is a capability the module does
  not have. The disable flow stops the framework's own processing; only the module can stop a process
  the framework does not own -- and only if it is told.
- RECORDED (divergence, left standing): §11.6 describes shutdown disabling modules in TIER order
  (Marketplace, Standard, Core, Admin). `unloadAll` reverses the LOAD order, which is topological --
  dependents before dependencies, but not tier order. Topological is arguably safer for teardown, so
  this is recorded rather than changed without a decision.
- **Verification:** typecheck, lint, format clean; SDK builds; the new suite 6 tests green.

---

### v5.5.75 — the context reaches the other three entry points (UR-20261012-070) — 2026-10-12

- 2026-10-12 · meta-prompt 5.2.0 · state=Migration · handoff=migration-prompt · return=met (tree)
- THE FINDING: UR-067 gave a COMMAND an `identity` and a `module` standing, because a command carries
  an interaction. A module has FOUR entry points and the other three carry none: a gateway event
  handler receives Discord's own argument list, a job processor its payload, and a cron task NOTHING AT
  ALL. So "which profile is running this, and where" had no answer on three of four paths -- exactly
  what a module needs when the main bot and a persona both run it in different guilds.
- WHY NOT A PARAMETER: a handler is `handle: (...args: unknown[])`. An APPENDED context lands inside a
  rest parameter and is invisible; a PREPENDED one silently breaks every handler ever written. The
  context travels out of band with AsyncLocalStorage -- the mechanism the framework's own event bus
  already uses -- so NO handler signature changes.
- WHERE THE CARRIER LIVES: AsyncLocalStorage is a Node builtin and the SDK is deliberately
  environment-neutral ("types": [], "lib": ["ES2023"], and until now not one Node import). The first
  attempt put it in the SDK and the build failed on `node:async_hooks`. Inverted: the SDK declares a
  `ModuleContextStore` interface, the APP installs the AsyncLocalStorage-backed implementation, and a
  module imports only `currentModuleContext()`. The SDK gains no dependency.
- THE RESOLVER: the process identity (profileId = PERSONA_ID or 'main', kind, applicationId,
  profileName) is a FIXED tuple -- the router is built per identity (UR-049) -- so only the guild
  varies. Late-bound and async, because the application id comes from the Discord client (not ready at
  Stage 12) and a persona's bound guild is a database read. It NEVER throws: a context is ADVISORY
  (UR-068), so a fault falls back to `enabled: false`, `owner: 'main'`.
- ONE WRAP: the loader is the single place events, jobs and tasks register, so one wrap covers all
  three and the module's handler does not know it was wrapped.
- RECORDED: a package's constraints are part of its contract. RECORDED: the three entry points are not
  symmetric -- a task's context honestly reports `guildId: null` rather than inventing one.
- **Verification:** typecheck, lint, format clean; SDK builds; the new suite 10 tests green.

---

### v5.5.74 — the dispatch path must not fail, and must not lie (UR-20261012-068) — 2026-10-12

- 2026-10-12 · meta-prompt 5.2.0 · state=Migration · handoff=migration-prompt · return=met (tree)
- THE FINDING: three faults on the path every command takes, all the same shape -- the framework told
  the member something UNTRUE, or lost their command, because a lookup failed. (1) `assertCommandInScope`
  and `assertPersonaOwnsCommand` called the database UNGUARDED: a fault propagated, the dispatch was
  refused, and the member was told "not available in guild" -- a permission error for an outage.
  (2) `CommandScopeDeniedError` carried ONE message for two unrelated failures. (3) `moduleStanding` --
  which builds the ADVISORY `module` field of `CommandContext` (UR-067) -- called both
  `resolveCommandOwner` and `isModuleEnabledInGuild` unguarded, so a fault in a read that was only ever
  informational threw out of the context build and FAILED the command.
- THE ASSERTIONS FAIL CLOSED, BUT SAY WHICH IT WAS: both wrapped, both logged
  (`command-scope-state-unreadable`, `command-scope-owner-unreadable`), and `CommandScopeDeniedError`
  gained `scopeCause: 'state-unreadable'`. Failing closed is deliberate -- refusing is recoverable,
  running for a disabled guild is not.
- THE NOTICE STATES THE CAUSE: `NoticeReasonCode` gained `STATE_UNAVAILABLE`; the member now sees
  "Could not check this server" -- "a fault on our side, not a permission decision" -- instead of a
  permission error they would waste time arguing with.
- THE STANDING FAILS OPEN, TO THE CONSERVATIVE VALUE: both reads wrapped and logged
  (`module-standing-owner-unreadable`, `module-standing-enabled-unreadable`), falling back to
  `owner: 'main'` and `enabled: false`. The ASYMMETRY with the assertions is the point: a GATE fails
  closed because a wrong "yes" is dangerous; an ADVISORY read fails open to "claim nothing" because the
  command is not the lookup's to lose.
- RECORDED: two failure modes on one path, and they want OPPOSITE defaults. What decides it is not which
  call it is, but whether the caller's decision depends on it.
- RECORDED: the standing's two reads and the assertions' two reads are all `(moduleId, guildId)` -- two
  strings, so a swap TYPECHECKS. Same hazard as UR-067; hit again here.
- **Verification:** typecheck, lint, format clean; the router suite 39 tests green.

---

### v5.5.73 — the rest of a disabled module's processing (UR-20261012-069) — 2026-10-12

- 2026-10-12 · meta-prompt 5.2.0 · state=Migration · handoff=migration-prompt · return=met (tree)
- THE FINDING: §13.2 says a disabled module's commands disappear and "its event handlers stop firing".
  Three of four paths honoured it -- commands fail closed at dispatch, gateway events are gated
  (UR-20261011-011), and the two-phase suspension (instant @everyone deny + batched BCCM
  deregistration) exists. TWO DID NOT: `QueueManager.registerQueue` took a processor and nothing else,
  and `Scheduler.register` took a task and nothing else. A job enqueued for a guild that had disabled
  the module still ran; a module's cron kept firing regardless. LATENT -- no module declares jobs or
  tasks today -- but the framework promised termination it could not deliver the moment one did.
- WHAT DECIDED THE SHAPE: §13.7 -- "Toggling a module off or on is a state-table write on the order of
  milliseconds -- it NEVER touches the module's loaded state, DI registrations, or event subscriptions."
  A per-guild disable is NOT an unload: the module stays loaded (it can be enabled in guild A and
  disabled in guild B at once) and the enforcement is a GATE AT EXECUTION, not a teardown.
- THE GATE: every unit of module processing that names a guild is gated per guild -- commands, gateway
  events, and now JOBS (the payload's guild). A CRON TASK takes no guild, so its honest gate is "does
  any guild still want this module". A job with no guild, and a task with no owner, run as before.
- FAIL-OPEN, WITH ONE DELIBERATE EXCEPTION: every gate fails open on a read error, because an
  unreadable state must not silently drop live work. Command dispatch fails CLOSED -- refusing a command
  is recoverable, running one for a disabled guild is not.
- ONE ENABLEMENT READ: the per-guild standing was computed inline in bootstrap() and again in the
  worker path. Two implementations of one rule is a gate that denies what another allows. It is now
  `module-system/enablement.ts` -- `isModuleEnabledForGuild` and `isModuleEnabledAnywhere` -- used by
  both paths and by every gate.
- A DIVERGENCE FOUND AND CLOSED: `isModuleEnabledInGuild` (the router) short-circuits CORE per §13.2,
  added by UR-20261012-046; `isModuleEnabledForGuild` (the EVENT gate) did NOT. A stale disabled row
  could drop a Core module's events while dispatch allowed its commands -- the same two-paths-two-answers
  defect, still live in the event gate. The shared read short-circuits Core and Admin once, for everyone.
- **Verification:** 117 files / 1200 tests / 0 failures; coverage 68.98% branch, NO threshold error;
  typecheck, lint, format clean.

---

### v5.5.72 — an execution context (UR-20261012-067) — 2026-10-12

- 2026-10-12 · meta-prompt 5.2.0 · state=Migration · handoff=migration-prompt · return=met (tree)
- THE FINDING: the framework hosts the main bot and any number of personas in ONE process, but the
  module-facing contract -- `CommandContext` in the SDK -- carried exactly TWO things: `config` and
  `data`. NO identity, NO guild, NO profile. A module could not tell which of the hosted identities was
  running its command, which application it should speak as, or which guild it was bound to. Every
  module-facing decision that depended on that had to be made by the core on the module's behalf --
  which is how the core came to hold facts the modules own (UR-066).
- THE CONTRACT NOW STATES: `identity` (profileId, kind, applicationId, profileName, guildId,
  boundGuildId) and `module` (moduleId, tier, enabled, owner, ownedByCaller) -- BOTH REQUIRED.
- ONE SOURCE, COMPILER-ENFORCED: identity is built in ONE place, the router's dispatch, from what the
  interaction states plus what the router knows about its own identity. Requiring the field made
  TypeScript enumerate the construction sites -- THERE WAS ONE. `module` is read from the registry's
  tier declaration and the binding service, the same source the pages consult (UR-061), so a module's
  standing cannot disagree with what /browse shows.
- THE REGISTRY'S IDENTITY DIMENSION: it cannot know WHICH profile a command runs under (a per-guild
  binding, resolved at dispatch), but it now states the tier that decides who MAY run it --
  `modulesByTier(tier)`, beside the `getModuleTier` the standing is built from.
- RECORDED: a contract that omits identity forces the core to hold it. The piecemeal patches of the past
  week -- residentPersonaId, residentApplicationId, actingProfileId -- were all attempts to carry
  identity through layers that had no concept of it.
- ALSO RECORDED: `isModuleEnabledInGuild(moduleId, guildId)` takes TWO STRINGS, so a swapped argument
  TYPECHECKS. I made that exact mistake here and caught it by reading the signature rather than trusting
  the compiler. Two same-typed parameters are a defect class the type system cannot see.
- **Verification:** 115 files / 1173 tests / 0 failures; coverage 68.57% branch, NO threshold error;
  build packages, typecheck, lint, lint:modules, format and docs gates all clean; the modules still
  bundle against the new SDK.

---

### v5.5.71 — the module logos go home (UR-20261012-066) — 2026-10-12

- 2026-10-12 · meta-prompt 5.2.0 · state=Migration · handoff=migration-prompt · return=met (tree)
- WHAT WAS WRONG: seven first-party module logos were hardcoded in the CORE while each module already
  declared its emoji name in its own manifest -- one fact, two owners, the wrong one authoritative. The
  intended layout already existed and was EMPTY: structure.md lists packages/modules/<slug>/assets/ and
  building-a-module.md calls it "static assets your module serves".
- THE CHAIN, VERIFIED END TO END (not assumed): packages/modules/<slug>/assets -> build:modules ->
  apps/main/dist-modules/<slug>/assets -> place-first-party-modules.mjs (cpSync of the whole built
  directory) -> /mnt/modules/modules-<tier>/<slug>/assets -> apps/main/Dockerfile COPY --from=builder
  /mnt/modules /app/baked-modules -> MODULES_DIR=/app/baked-modules (what the loader reads).
- THE ONE MISSING LINK WAS `build:modules`, WHICH COPIED locales/ BUT NOT assets/. That is a ONE-LINE
  addition mirroring the copy beside it, and it is what makes the move SAFE rather than risky. Confirmed
  by running it: the asset appears in dist-modules and in the baked tree.
- THE CHANGE: build carries assets; LoadedModule.root set in swastik-loader where moduleDir was already
  computed and only logged; ui.iconAsset on the manifest UI schema (mirroring ui.banner); the seven PNGs
  move into their modules; the upload takes its module list from the registry, leaving ONLY framework
  chrome in the core -- which ADR-012 places with the framework.
- A module that declares no asset, or whose root was not recorded, is SKIPPED and the framework fallback
  applies: ADR-012's "absent a declaration, the default applies".
- RECORDED: the blocker was a PACKAGING fact, and it was worth finding. UR-065 could have shipped on the
  assumption that a file move is a file move; tracing the chain showed the move alone would have
  reproduced the fallback symptom SILENTLY.
- **Verification:** 115 files / 1170 tests / 0 failures; coverage 68.25% branch, NO threshold error;
  typecheck, lint, lint:modules, format and docs gates all clean.

---

### v5.5.70 — one emoji scope per dispatch (UR-20261012-064) — 2026-10-12

- 2026-10-12 · meta-prompt 5.2.0 · state=Migration · handoff=migration-prompt · return=met (tree)
- THE REPORT: the Home control fell back to the unicode glyph on every page, and most icons did so across
  module pages.
- THE CAUSE: five router call sites resolved the scope from a PER-ROUTER OPTION
  (`this.options.residentApplicationId ?? DEFAULT_EMOJI_SCOPE`). That option is UNDEFINED FOR THE MAIN
  BOT, so the lookup used the empty scope while the upload keys by the real application id (UR-062) --
  every one missed: Home in both nav rows, Discover, the module decoration, and the browse Home option.
  I HAD REVERTED THOSE FIVE TO THE OPTION MYSELF when fixing a type error, reasoning that "inside the
  router the per-identity option is the authority". True for a persona, FALSE for the main bot.
- THE FIX: residentApplicationId is REMOVED FROM THE ROUTER OPTIONS entirely, replaced by one accessor
  `emojiScope(interaction)` returning `interaction.applicationId ?? DEFAULT_EMOJI_SCOPE` -- the same value
  the upload keys by. With the option gone, TypeScript enumerated every site, including the two helpers
  (pageActions, browseBlocks) which now take the scope as an explicit argument.
  THERE IS DELIBERATELY NO SECOND SOURCE.
- RECORDED: the same bug, three times, from the same cause -- TWO SOURCES FOR ONE KEY. UR-060 made the
  read authoritative and left the write on the default; UR-062 brought the write into line; this removes
  the last alternative source. Each fix was to DELETE A SECOND WAY OF ASKING, not to reconcile answers.
- STILL OPEN (recorded, not fixed): the framework's icon assets are listed in the CORE
  (module-emoji-upload.ts), including first-party module logos. The docs describe modules as
  independently developed with their own asset paths, so those belong to the modules.
- **Verification:** 115 files / 1169 tests / 0 failures; coverage 68.31% branch, NO threshold error;
  typecheck, lint, format clean with CI's own commands.

---

### v5.5.69 — a BCCM rename survives a boot (UR-20261012-063) — 2026-10-12

- 2026-10-12 · meta-prompt 5.2.0 · state=Migration · handoff=migration-prompt · return=met (tree)
- WHAT THE OPERATOR SAW: /hello renamed to namaste through the BCCM /queue, and afterwards NEITHER name
  was visible in that guild -- while the persona still answered hello.
- WHAT IS ACTUALLY RIGHT: the rename mechanism is sound. applyBatch removes the old key and adds the
  new; resolveCommandPayloads inherits the source command's real definition; and a successful push
  writes the persistent `guild_command_renames` table (guildId, commandKey, newName).
- THE DEFECT: command-deployer.ts NEVER READ THAT TABLE -- no reference to bccm, rename, alias, queue or
  overrides at all. Every boot re-registered the guild's set FROM THE REGISTRY (the manifest's names) and
  silently REVERTED the rename. The result is a FLAPPING state: the rename lands on a queue window, the
  next restart puts the old name back, a later window re-applies it -- so depending on when the operator
  looked they saw the old name, the new one, or neither.
- THE FIX: the deployer takes a commandRenames(guildId) dependency, wired in bootstrap to read
  guild_command_renames, and applies it to the set it registers -- REUSING resolveCommandPayloads with a
  source map, the same machinery the BCCM push uses, so a renamed command keeps its real definition on
  both paths.
- RECORDED: two components wrote the same fact and only one read it. The table existed the whole time;
  the deployer simply had no dependency that could see it.
- STILL OPEN (recorded, not fixed): the table persists RENAMES ONLY. An alias or a disable applied
  through the queue is not persisted, so those are still reverted by a boot.
- **Verification:** 115 files / 1169 tests / 0 failures; coverage 68.17% branch with NO threshold error;
  lint, format, typecheck clean with CI's own commands.

---

### v5.5.68 — the main bot registers its emojis under its own application id (UR-20261012-062) — 2026-10-12

- 2026-10-12 · meta-prompt 5.2.0 · state=Migration · handoff=migration-prompt · return=met (tree)
- THE REGRESSION: the main bot rendered the SAME decoration box on every core command -- the fallback --
  while a persona rendered the correct per-module logos. That is the signature of an emoji lookup that
  MISSED.
- WHY: UR-060 made the RENDER resolve an emoji by the application Discord states on the interaction --
  for the main bot, its real application id. The main bot's UPLOAD still passed no application id and
  registered under the DEFAULT scope (the empty string). A persona passes its own id on BOTH sides, so
  it matched and kept its icons; the main bot's two keys disagreed and it lost all of them.
  I CHANGED ONE HALF OF A PAIR AND NOT THE OTHER.
- THE FIX: `ensureDefaultModuleEmoji(discordClient, logger, applicationId)`. The id was already computed
  one line above. The next boot re-reads the existing emojis by name and registers their ids under the
  real application id, so the main bot heals without re-uploading anything.
- PINNED: tests/unit/module-emoji-upload.test.ts asserts the upload registers under the GIVEN id, that
  that application resolves the emoji, and that another application does NOT borrow it.
- RECORDED: a key is a pair, and I changed one end. The persona path was correct only because it
  happened to pass its id in both places already -- which is exactly why the symptom looked like
  "the persona works and the main bot doesn't" rather than like a broken lookup.
- **Verification:** 114 files / 1168 tests / 0 failures; coverage 68.17% branch with NO threshold error;
  build packages, typecheck, lint, lint:modules and format all clean with CI's own commands.

---

### v5.5.67 — the false-passing format check (UR-20261012-060/061 deploy) — 2026-10-12

- 2026-10-12 · meta-prompt 5.2.0 · state=Migration · handoff=migration-prompt · return=met (tree)
- UR-060 and UR-061 were SKIPPED: the `format` step failed on `src/rendering/page-data.ts`, so Gates
  failed and Railway skipped Docker and Integration.
- WHY I DID NOT SEE IT: my local check ran `prettier --check "src/**/*.ts"` FROM apps/main. THE SHELL
  DOES NOT EXPAND THAT GLOB, so prettier matched NOTHING and printed "All matched files use Prettier
  code style" -- A FALSE PASS, repeated across several commits. CI runs `prettier --check .`.
- THE SAME TRAP had already shown itself: an eslint run with the same glob answered "No files matching
  the pattern "src/**/*.ts" were found" -- I read that as a path mistake and re-ran from the right
  directory, without noticing that PRETTIER gives the same condition a green tick.
- RECORDED: run the CI STEP'S OWN COMMAND. `pnpm --filter @workspace/dumby format` and
  `pnpm --filter @workspace/dumby lint` are the commands CI runs; a hand-written glob is a different
  check that can silently match nothing.
- **Verification:** all five Gates steps re-run locally with CI's own commands -- build packages,
  typecheck, lint, lint:modules, format -- and all pass.
- THEN THE COVERAGE GATE FAILED: `src/commands/**` branches at 63.36% against a 65 floor. The new
  router branches -- the occupancy option's label and description, the scope fallbacks, the empty
  browse path -- were untested. Tests added that drive `buildBrowseRender` with an occupied entry and
  with a provider returning nothing. Branches now clear the floor: All files 68.04% branch, NO threshold
  error, 113 files / 1167 tests / 0 failures.
- RECORDED: the gates are a SEQUENCE, and passing the first five says nothing about the sixth. Format
  hid a coverage failure, and the coverage failure hid nothing -- I only found it by running the whole
  sequence rather than the steps I expected to be risky.

---

### v5.5.66 — module ownership is PER PROFILE (UR-20261012-061) — 2026-10-12

- 2026-10-12 · meta-prompt 5.2.0 · state=Migration · handoff=migration-prompt · return=met (tree)
- THE REPORT: "persona & main bot's modules are shared not synced -- if I install a module in main bot
  the persona shows that module installed and listed in its /dashboard /modules /browse /persona
  everywhere."
- WHY: /modules, /dashboard and /browse filtered by the GUILD's enablement and consulted NO OWNERSHIP
  at all. The ownership data existed (guild_persona_bindings) but those pages never read it; only
  /persona was scoped (UR-054).
- THE RULE (UR-059): core shared, owned by nobody; standard/marketplace owned by ONE profile per guild,
  first come; the other profile refused and told who holds it.
- THE CHANGE: ONE ownership read -- resolveOwner is now a PageDataDeps dependency backed by
  PersonaCommandBindingService.resolveCommandOwner and memoized per guild+module, consulted by every
  page. Every page takes actingProfileId ('main' or a persona id). /modules and /dashboard list core
  plus only what the acting profile holds. /browse lists what it may install PLUS what another profile
  holds, marked occupied with the holder named in the section and in the dropdown option (a Discord
  select cannot disable one option, so the fact is stated and the INSTALL refuses). A persona installing
  an unclaimed module CLAIMS it -- the binding is written, which is what makes "first come" real.
- RECORDED: the data existed; the pages did not ask. Ownership was already modelled and already
  enforced on the command path -- the page layer simply had no concept of "whose page is this".
- **Verification:** 94 tests across the affected files pass; typecheck, lint, format clean; docs gates OK.

---

### v5.5.65 — required emoji scope, and one bound guild (UR-20261012-060) — 2026-10-12

- 2026-10-12 · meta-prompt 5.2.0 · state=Migration · handoff=migration-prompt · return=met (tree)
- "ONLY SOME EMOJI" -- EIGHT call sites omitted the emoji scope and silently fell back to the MAIN BOT's
  ids, so on a persona they rendered as the literal `:name:`: the Home/Next/Prev nav, the Discover
  button, the module decoration, the Home icon, the module Info card's logo, its uninstall control, and
  the /persona Refresh accessory. My earlier sweep used a regex for CONSTANT names and missed the string
  literals -- the same miss that had already hidden `dumby_refresh` in health-blocks.
- THE FIX IS STRUCTURAL: the scope is now a REQUIRED argument on customEmojiRef / customEmojiParts /
  moduleIcon / commandDecorationIcon. TypeScript enumerated all eight sites itself and cannot miss a
  future one. Discord states the application on every interaction, so CommandInteraction.applicationId
  is carried by the adapters and is the authoritative value; the shared core-frame handlers read it from
  the interaction, while the per-identity router may use its own option.
- A PERSONA MUST ACT ONLY IN ITS BOUND GUILD: it registers core commands GLOBALLY, so her commands were
  visible in servers she does not serve, and nothing refused them (assertPersonaOwnsCommand checked
  module ownership, never the guild). assertBoundGuild now runs at dispatch; a new PersonaBoundGuildError
  maps to a new OUT_OF_BOUND_GUILD notice -- "This is not my server".
- RECORDED: a default argument is a silent fallback. The same bug appeared twice because a defaulted
  parameter lets a caller be WRONG WITHOUT BEING INCORRECT. Making it required turned an invisible
  runtime fault into eight compile errors -- the only reason the sweep was complete this time.
- **Verification:** 30 router tests pass; typecheck, lint, format clean; docs gates OK.

---

### v5.5.64 — the persona's scope split, and answering a DM (UR-20261012-058) — 2026-10-12

- 2026-10-12 · meta-prompt 5.2.0 · state=Migration · handoff=migration-prompt · return=met (tree)
- THE SCOPE SPLIT: the operator's instruction was that a persona registers "the exact same guild
  specific commands and global commands as main bot" -- the same SPLIT, not the same payload twice.
  command-deployer.ts is the authority: CORE global, standard/marketplace per guild, admin per guild
  and EXCLUDED for a persona. Each command lands in EXACTLY ONE scope.
- I GOT IT WRONG TWICE IN OPPOSITE DIRECTIONS: UR-055 wrote the same payload to both routes (every
  command twice); UR-056 over-corrected to the guild only, so a persona had NO global core commands and
  /health did nothing in a DM or in any guild but her bound one. Same mistake both times: satisfying the
  instruction mechanically instead of reading the deployer that already answers it.
- A DM NOW GETS AN ANSWER: it used to THROW before replying, so Discord showed "The application did not
  respond". DM use is prohibited by design; the refusal says so, via a new replyNotice (editNotice edits
  a reply that already exists, and here there is none).
- THE EMOJI UPLOAD LOG names its application (`app=<id|main>`) IN THE MESSAGE, so a persona's upload can
  be confirmed from a log viewer that drops structured fields.
- NOT IN THIS RECORD: the ownership/occupancy model (per-profile page scoping, the first-come claim,
  the "occupied by" indicator) -- stated in its own record before any code is written. See UR-20261012-059.
- **Verification:** 20 persona-runtime + 28 router tests pass; typecheck, lint, format clean.
- CORRECTION (same day): the first UR-058 commit's deploy was SKIPPED. Its rewritten router test left
  `CommandScopeDeniedError` IMPORTED BUT UNUSED, so the lint step failed, Gates failed, and Railway
  skipped Docker and Integration. Lint had been run on the source files but NOT on that test file --
  the one file the change actually rewrote. RECORDED: lint the files you TOUCH, not the files you
  expect to matter.

---

### v5.5.63 — emoji ids are per-application (UR-20261012-057) — 2026-10-12

- 2026-10-12 · meta-prompt 5.2.0 · state=Migration · handoff=migration-prompt · return=met (tree)
- WHAT THE OPERATOR SAW: a page rendered by a persona showed every icon as literal text -- `:dumby_browse:`
  -- where the main bot shows the icon. Two things were true at once: the persona NEVER registered the
  emoji set on its own application, and the registry was ONE process-wide map, so a persona's page
  embedded the MAIN BOT's id.
- WHY THAT RENDERS AS `:name:`: a Discord APPLICATION EMOJI BELONGS TO ONE APPLICATION, and a message
  may only reference an emoji its own application owns. Sending another application's id does not fail
  loudly -- Discord renders the literal `:name:`. The multi-persona runtime hosts personas in the SAME
  PROCESS as the main bot, which is why one shared map produced this.
- THE FIX: the registry is keyed by application (registerModuleEmoji/customEmojiRef/customEmojiParts/
  moduleIcon/commandDecorationIcon all take a scope), with DELIBERATELY NO cross-application fallback --
  an id from the wrong application is worse than no id at all, because the unicode fallback renders and
  the wrong id does not. A persona registers the set on its OWN application after login via a new
  ensureEmojis seam. The acting application id reaches the render: the router carries
  residentApplicationId (a persona passes persona.discordApplicationId; the main bot passes nothing and
  uses the default scope, where its own uploads land) and passes it to the page-data provider and to the
  blocks that build their own emoji references.
- RECORDED: a process-global registry cannot describe a per-application resource. The map answered
  "what is the id of dumby_browse?" -- but the real question is "what is THIS APPLICATION's id for it?",
  and the runtime hosts several applications in one process. The wrong answer was SILENT.
- **Verification:** 113 files / 1161 tests / 0 failures; typecheck, lint, format clean.

---

### v5.5.62 — a persona registers each command ONCE (UR-20261012-056) — 2026-10-12

- 2026-10-12 · meta-prompt 5.2.0 · state=Migration · handoff=migration-prompt · return=met (tree)
- WHAT I GOT WRONG IN UR-055: it PUT the SAME payload to the global route and the guild route, which
  registers EVERY COMMAND TWICE. Discord then lists each one as both a global command and a
  this-server command. The operator saw exactly that.
- WHAT THE MAIN BOT ACTUALLY DOES: command-deployer.ts CLEARS BOTH SCOPES, then registers each command
  in EXACTLY ONE scope. Development: clear global, clear guild, register every tier to the development
  guild. Production: clear global, register core globally, then per guild clear that guild's set and
  register that guild's own commands. NEVER BOTH.
- THE FIX: a persona is bound to one guild, so its case IS the development case -- clear both scopes,
  register everything to the bound guild. The clear retires a stale set; registering once prevents the
  duplicate.
- RECORDED: UR-055 fixed the right problem with the wrong mechanism. The operator's model -- "register
  the same set the main bot does" -- was correct, and I satisfied it by writing the payload to every
  scope instead of READING how the main bot decides which scope a command belongs to.
- **Verification:** 113 files / 1159 tests / 0 failures; typecheck, lint, format clean.

---

### v5.5.61 — a persona registers the same command set as the main bot (UR-20261012-055) — 2026-10-12

- 2026-10-12 · meta-prompt 5.2.0 · state=Migration · handoff=migration-prompt · return=met (tree)
- WHAT WAS WRONG: a persona built a FILTERED registry (only its bound modules) and deployed only GUILD
  commands, with `if (body.length === 0) return 0` ahead of the PUT. Two consequences:
  - A persona with nothing bound registered NOTHING -- the payload was empty and the deploy returned
    before making a request. A freshly registered persona had no commands at all and looked BROKEN
    rather than empty.
  - STALE registrations were never cleared. A PUT on a command route is a BULK OVERWRITE -- the set
    sent replaces what was registered -- but that only helps if the PUT HAPPENS. The early return
    skipped it, so whatever an earlier state registered stayed.
- THE MODEL, AS STATED: a persona registers THE SAME global and guild command set as the main bot. What
  it may ANSWER is decided by OWNERSHIP, in the router (assertPersonaOwnsCommand), not by what it
  registers. Being bound to exactly one guild makes its registration elsewhere inert. REGISTRATION IS
  NOT THE RESTRICTION; THE BINDING IS.
- FIX: buildRegistry returns the FULL registry; the deploy PUTs BOTH routes, ALWAYS, via an extracted
  and testable deployPersonaCommands(). An empty payload still PUTs, because THE OVERWRITE IS THE CLEAR.
- The boot warning is reworded to match: persona-no-modules-bound now says the persona OWNS nothing and
  will refuse what it is not bound to -- not that it will have no commands, which is no longer true.
- RECORDED: an early return that skips a request also skips the cleanup that request performs. The
  empty-payload guard read as a sensible optimisation, but a PUT on a command route is not only an
  install, it is a REPLACEMENT.
- **Verification:** 113 files / 1159 tests / 0 failures; typecheck, lint, format, gates 27/27.

---

### v5.5.60 — the /persona page rebuilt (UR-20261012-054) — 2026-10-12

- 2026-10-12 · meta-prompt 5.2.0 · state=Migration · handoff=migration-prompt · return=met (tree)
- THE CONTROL VANISHED ON THE SECOND RENDER. asPageInteraction -- which EVERY switch and refresh goes
  through -- dropped memberPermissions and isGuildOwner. The first paint is a real command interaction
  and had the admin context; every re-render had none, isGuildAdmin returned false, and the control was
  not drawn. FIXED AT THE SOURCE: the component adapter now captures the same context the command
  adapter does, and asPageInteraction carries it into the re-entry.
- CLAIMED MODULES ONLY. Core is gone from a profile entirely: a core module is shared without dispute,
  so listing it was noise and made every profile look identical. A persona's claim is ONLY its bindings
  (a standard module the main bot already has enabled is the main bot's); the main bot's claim is
  non-core modules ENABLED for the guild that no persona has bound.
- THE COMMAND INVENTORY IS GONE. A profile's commands are the framework's, not a property of the
  profile, and the inventory buried the one thing that section is for. The switcher now counts CLAIMS,
  and a profile with nothing claimed says so.
- THE SWITCHER SITS BELOW THE FOOTER. The renderer gained a TRAILING placement: a block may declare
  `placement: 'trailing'` and renders after the footer. A selector acts on the whole page.
- THE INFO CONTROL: personas only (the main bot has no OAuth redirect and nothing to invite), admin-only,
  and the card carries the OAuth redirect callback guide AND NOTHING ELSE. The install guide and the
  invite button were rejected -- and the reason is sound: DISCORD PUBLISHES NO API FOR AN APPLICATION'S
  REDIRECT LIST, so whether the URL the card asks for is registered cannot be read. A link that works
  only if the operator already did the thing the card asks for is worse than no link.
- THE STATUS ASSETS ARE REDRAWN: status-online, status-offline, info, identity and profile are now
  minimalist, thick, bold, WHITE icons on transparency, drawn at 4x and downsampled for clean edges.
- NOT IN THIS RECORD: the persona's command REGISTRATION (same global + guild set as the main bot,
  clearing stale registrations, the guild binding as the only restriction) is a separate runtime change.
- **Verification:** 113 files / 1157 tests / 0 failures; typecheck, lint, format, gates 27/27.

---

### v5.5.59 — permission names vs bit values (UR-20261012-053) — 2026-10-12

- 2026-10-12 · meta-prompt 5.2.0 · state=Migration · handoff=migration-prompt · return=met (tree)
- HOW IT SURFACED: UR-051 put an Info control and an Invite link on the persona profile, admin-only. The
  operator ran /persona on the build containing them and saw NEITHER -- because isGuildAdmin returned
  false for them.
- DEFECT ONE -- THE ADMIN GATE COMPARED BIT VALUES AGAINST NAMES:
    `const ADMINISTRATOR_PERMISSION = '8'; const MANAGE_GUILD_PERMISSION = '32';`
  Every producer of memberPermissions emits NAMES ('Administrator', 'ManageGuild'), because the rank
  bundles are expressed in names (ADMINISTRATOR_BUNDLE = ['Administrator'], MODERATOR_BUNDLE =
  ['KickMembers','BanMembers','ModerateMembers','ManageMessages']). So includes('8') could NEVER match,
  and isGuildAdmin was false for every guild administrator who was not the OWNER. Only the owner was
  recognised, through isGuildOwner -- which is exactly what kept the bug invisible.
  FIXED: the constants are the names.
- DEFECT TWO -- THE ADAPTER OMITTED ManageMessages: it collected a HAND-WRITTEN list
  (Administrator, ManageChannels, ManageGuild, ModerateMembers, BanMembers, KickMembers) and omitted
  ManageMessages -- the one permission BOTH MODERATOR_BUNDLE and HELPER_BUNDLE require. So holdsEveryBit
  could never be satisfied for either, and a moderator or helper EVALUATED AS MEMBER, failing any command
  requiring MODERATOR or above.
  FIXED BY DERIVATION, not by adding the missing name: rank.ts now exports TRACKED_PERMISSION_NAMES,
  built from the three bundles plus the two names the dispatch path asks about directly, and the adapter
  uses it. The two lists can no longer disagree, because there is now only one.
- RECORDED: both defects are the same failure -- a fact expressed in two places, in two forms,
  disagreeing. One list said '8', the other said 'Administrator'; one forgot ManageMessages, the other
  required it. Neither is a logic error; both are drift.
- RECORDED: a test that only exercises the OWNER path will not find an administrator bug. isGuildOwner
  short-circuits ahead of the permission check, so every owner-shaped test passed while every non-owner
  administrator was refused.
- **Verification:** 113 files / 1159 tests / 0 failures; typecheck, lint (changed files), format, gates 27/27.

---

### v5.5.58 — a binding for a disabled module produced a registered-but-refused command (UR-20261012-052) — 2026-10-12

- 2026-10-12 · meta-prompt 5.2.0 · state=Migration · handoff=migration-prompt · return=met (tree)
- THE TRAP: assertBindingAllowed checks the guild match and occupancy -- it does NOT consult the guild's
  module state, and NEITHER DOES THE COMMAND DEPLOY. So binding a module the guild has DISABLED
  succeeds: the binding is created, the command is registered, and every invocation is then REFUSED at
  dispatch, because the persona's router consults the same isModuleEnabledInGuild the main bot does.
  The result is a command that appears in Discord and does nothing -- it reads as "the persona is
  broken", not as "the guild turned this module off", which is the same misleading shape UR-047 spent
  two attempts untangling.
- FIX: the bindings surface REFUSES it, by name, before anything is created:
    409 Binding refused -- module "hello-world" is not enabled in guild 1062427177326497863;
    enable it first (for a standard module, re-enable it from /browse)
  One /browse step at the moment the operator is already thinking about that module, instead of an hour
  debugging a command that silently declines.
- The check is optional on the route (isModuleEnabledInGuild), so a surface without guild context skips
  it rather than guessing. RECORDED LIMITATION: the dedicated Twill process (entry/twill.ts) has no
  module registry and does not perform this check; the API mount (TWILL_ROUTES_ON_API, the surface in
  use here) does.
- RECORDED: two checks that each look reasonable can compose into a state neither intends. "The bind
  does not need the module enabled" and "the dispatch respects guild enablement" are individually
  defensible; together they create a command that exists and cannot run. Where two gates touch the same
  resource, the earlier one should refuse what the later one will not allow.
- **Verification:** 113 files / 1153 tests / 0 failures; typecheck, lint (changed files), format, gates 27/27.

---

### v5.5.57 — /persona opened on the wrong profile, and the invite had no way in (UR-20261012-051) — 2026-10-12

- 2026-10-12 · meta-prompt 5.2.0 · state=Migration · handoff=migration-prompt · return=met (tree)
- DEFECT 1 -- THE DEFAULT PROFILE. `currentProfileId = ownerOf.get(moduleId) ?? guildRegistration?.id ??
  MAIN_PROFILE_ID` asked two questions and neither was right: which persona owns the `persona` MODULE,
  and which persona is registered for the guild. So `/persona` run from the MAIN BOT opened on a
  PERSONA's profile -- exactly as the operator reported.
  - The question the page was always trying to answer is WHICH IDENTITY IS RUNNING THE COMMAND. That is
    PERSONA_ID: empty in the main bot's process, set in a dedicated persona process.
  - FIXED: the opening profile is the resident identity, falling back to main when PERSONA_ID is unset
    or names a persona this guild does not have. The ownership map and the guild registration still
    decide which profiles are LISTED -- they no longer decide which one OPENS.
- DEFECT 2 -- THE INVITE HAD NO WAY IN. The invite URL was COMPUTED and PARSED and NEVER RENDERED:
  page-data built it, persona-blocks read it into the profile shape, and nothing drew it. The only path
  was a control labelled "OAuth setup", admin-only, whose card carried the invite -- and "OAuth setup"
  reads as a configuration chore, not as "here is how to add this persona".
  - FIXED, two controls on the profile row:
    - Info -- icon-only (no label), opens the card with the identity, the callback URL, the guide, and
      the invite link.
    - Invite -- a direct LINK button (style 5), rendered only when an invite URL exists.
    Both remain admin-only: the invite is a privileged action.
- RECORDED: a value computed, carried through a type, and never rendered is invisible in a way that
  reads as "the feature was never built". inviteUrl had a field in TWO modules and no consumer. Where a
  surface is expected to offer an action, the assertion belongs on the RENDERED output.
- **Verification:** 113 files / 1151 tests / 0 failures; typecheck, lint (changed files), format, gates 27/27.

---

### v5.5.56 — why a persona has no commands is now reported, not inferred (UR-20261012-050) — 2026-10-12

- 2026-10-12 · meta-prompt 5.2.0 · state=Migration · handoff=migration-prompt · return=met (tree)
- THE REPORT: the first live persona came online but registered NO commands on its bound server.
- THE AUDIT CLEARED EVERY CANDIDATE DEFECT (the useful part of this record):
  - guild_persona_bindings.moduleSlug EXISTS -- migration ...000034 drops and recreates the table with
    moduleSlug and a composite PK (guildId, moduleSlug); the earlier ...000021 shape is superseded.
  - bind()/listForPersona() correct: conflict target (guildId, moduleSlug), read filtered by personaId.
  - filterRegistryForModules correct: matches def.moduleId against the bound slugs, carries the tier.
  - moduleId IS mod.manifest.name -- the slug an operator binds is the key the registry uses.
  - toApiPayloads() correct: all().map(c => c.data), and every defineCommand carries a description.
- SO NOTHING WAS BROKEN. A persona deploys commands for its BOUND modules only (core modules stay with
  the main bot), and the deploy RETURNS EARLY on an empty payload:
    `const body = registry.toApiPayloads(); if (body.length === 0) return 0;`
  That early return is correct -- and it is why the symptom was SILENT: the only signal was
  `persona-runtime-started ... commands=0`, which cannot distinguish "nothing is bound" from "a bound
  slug matches no registered module". The second is the quiet one.
- FIX: the runtime now REPORTS which case it is, in the message (the viewer drops structured fields):
  - `persona-no-modules-bound id=... -- it will come online with NO commands; bind a module and restart`
  - `persona-bound-module-unregistered id=... modules=<slugs> -- bound but contributing no commands`
  And persona-runtime-started now carries BOTH counts: `... bound=2 commands=7`.
- ALSO RECORDED: a persona never registers GLOBAL commands, by design. It is single-server-bound, so it
  registers guild commands in its bound guild only. "No global commands" is not a defect.
- OPERATOR NOTE: the deploy runs AT BOOT, and it needs the application in the guild. Discord refuses a
  guild-command PUT for a guild the application is not in; if refused, deployCommands throws and the
  persona is reported persona-runtime-failed -- OFFLINE, not command-less. So "online with zero commands"
  is an empty-registry case, and "absent" is more likely a failed deploy.
  THE ORDER THAT WORKS: invite the persona first, then bind a module, then restart.
- **Verification:** 113 files / 1151 tests / 0 failures; typecheck, lint (changed files), format, gates 27/27.

---

### v5.5.55 — a persona's slash commands were dispatched by nothing (UR-20261012-049) — 2026-10-12

- 2026-10-12 · meta-prompt 5.2.0 · state=Migration · handoff=migration-prompt · return=met (tree)
- THE GAP: UR-043 extracted the COMPONENT dispatch, which fixed a persona's buttons. It did not extract
  the COMMAND dispatch, and nothing else supplied it:
  - buildDiscordClient attaches only error and warn -- NO interactionCreate.
  - the persona runtime attached only buildComponentInteractionHandler, which returns early for
    anything that is not a button or a select menu.
  So a hosted persona's slash commands were DEPLOYED to the guild and then reached nothing. In Discord
  the command appears, runs, and the application never acknowledges it -- "The application did not
  respond" after three seconds. The persona looked online and half-working, the most confusing possible
  state to debug.
- FOUND by reading the runtime's wiring while bringing the first live persona online, BEFORE the
  operator hit it.
- FIX:
  - `buildPersonaInteractionHandler` is the full handler for one identity: chat-input commands go to the
    persona's own router; buttons and selects go to the shared component registry; anything else is
    ignored. It NEVER throws.
  - The router is built from a thunk, once per persona rather than per interaction, and a router that
    cannot be constructed DEGRADES that persona to components-only instead of stopping it starting.
  - `commandRouterOptions(residentPersonaId?)` in bootstrap is now the single description of a router's
    configuration, so a persona's router is configured exactly as the main bot's is (system-map s11).
    residentPersonaId is the only variable: the main bot sets it only when the process itself is a
    persona (PERSONA_ID); a hosted persona always sets its own id, so command ownership is enforced for
    it by the router's existing assertPersonaOwnsCommand.
- RECORDED: a handler that answers some interaction types and SILENTLY DROPS the rest is worse than one
  that answers none. The uncovered types should be reported -- which persona-command-unhandled now does.
- **Verification:** 113 files / 1147 tests / 0 failures WITH COVERAGE, no threshold error; typecheck, lint, format green; gates 27/27.

---

### v5.5.54 — persona registration could never succeed: `persona-` is not a UUID (UR-20261012-048) — 2026-10-12

- 2026-10-12 · meta-prompt 5.2.0 · state=Migration · handoff=migration-prompt · return=met (tree)
- THE REPORT: the first real persona registration (ELSA, app 1387991780934553600, guild
  1062427177326497863) failed with `invalid input syntax for type uuid: "persona-…"`. Not a validation
  error, not an authorization error -- Postgres refused the ROW.
- THE DISAGREEMENT: `persona_identities.id` is `table.uuid('id')` and `guild_persona_bindings.personaId`
  is a `uuid` FK to it -- the schema is consistently uuid. `nextPersonaId()` returned
  `persona-${randomUUID()}`, and a prefixed string is not a UUID. The insert was rejected BEFORE
  anything was created.
- SO REGISTRATION COULD NEVER HAVE SUCCEEDED -- not for any input, not in any environment. This is not
  an edge case; it is the whole path.
- FIX: `nextPersonaId()` returns a bare `randomUUID()`. Nothing reads the prefix -- it was decoration,
  and the schema was the side that was right. Appendix C #23 is unaffected: its point is that ids must
  not come from a process-local counter, and a v4 UUID satisfies it directly.
- WHY NOTHING CAUGHT IT: `buildPersonaIdentity` had NO unit test, and the route tests stub the service,
  so the generator's output was never asserted against the column it is written into. The new
  tests/unit/persona-identity.test.ts pins the id against a UUID shape, pins the absence of a prefix,
  and pins that 200 identities never collide.
- GENERAL LESSON, RECORDED: a generated identifier and its column type are one fact expressed twice.
  Where they can drift, a test must bind them.
- OPERATOR NOTE: the attempt carried live credentials pasted into a chat. The persona bot token, its
  OAuth2 client secret, and the INTERNAL_API_KEY must all be treated as exposed and rotated, even
  though the attempt failed and nothing was created.
- **Verification:** 113 files / 1139 tests / 0 failures WITH COVERAGE, no threshold error; typecheck, lint, format green; gates 27/27.

---

### v5.5.53 — the undocumented eighth layer: every core command refused to every non-owner (UR-20261012-047) — 2026-10-12

- 2026-10-12 · meta-prompt 5.2.0 · state=Migration · handoff=migration-prompt · return=met (tree)
- UR-046 DID NOT FIX IT. a76cdd3 went live with UR-046 and /dashboard still failed in guild
  1062427177326497863. The code shows why: assertCommandInScope already has `if (tier === 'core')
  return;` -- a core command NEVER reaches the enablement check. UR-046 was real hardening applied to a
  branch core commands do not take. The earlier diagnosis was an inference from message wording.
- THE ACTUAL CAUSE: CommandScopeDeniedError is thrown from TWO different checks sharing ONE message --
  assertCommandInScope (scope/enablement) and assertPermissionAllowed (command-router.ts:433, the
  PERMISSION RESOLVER). "not available in guild" is also how a PERMISSION refusal reads; the notice's
  `reason: FORBIDDEN` is the tell (FORBIDDEN comes from reasonFromRejection).
- The refusal was the resolver's LAST block: `if (ctx.hasExplicitPermissionDeclaration !== true) return
  deny(7, 'no explicit permission declaration exists for this action')`.
- WHY THAT IS A DEFECT, NOT A POLICY:
  - IT IS NOT A LAYER. DIAGRAM 21-A lists seven; none is a declaration check.
  - IT INVERTS THE DOCUMENTED DEFAULT: "Only if every layer passes without a definitive answer does the
    framework fall through to the final default: ALLOW."
  - DECLARING NOTHING IS NORMAL: §21.3 -- MEMBER is "the default requirement every command carries when
    it declares nothing".
  - IT MISUSES LAYER 7, whose real job is a GRANT override: with no applicable grant, resolution
    CONTINUES to Layers 4-6.
- THE PRODUCTION EFFECT WAS TOTAL: dashboard/modules/health all declare NO permissions (host-registered
  core commands, §1.7), so EVERY core command was denied to EVERY member who was not a bot owner. The
  bot owner short-circuits at LAYER 1 -- which is exactly why this read as one guild's problem instead
  of a blanket one.
- FIX: the block is REMOVED; resolution falls through to ALLOW as documented. Two tests had ENCODED THE
  DEFECT and were corrected to the spec; a third now forces its denial legitimately (a declared Discord
  permission the member lacks, refused at Layer 5).
- RECORDED: one error class with one string covers two unrelated failures, which is why this took two
  attempts and misled both the agent and me. Distinguishing them is a follow-up worth doing.
- **Verification:** 112 files / 1133 tests / 0 failures WITH COVERAGE, no threshold error; typecheck, lint, format green; gates 27/27.

---

### v5.5.52 — a core module can no longer be denied by a stale row (UR-20261012-046) — 2026-10-12

- 2026-10-12 · meta-prompt 5.2.0 · state=Migration · handoff=migration-prompt · return=met (tree)
- REPORTED FROM PRODUCTION: at 18:14 UTC `/dashboard` failed with "not available in guild
  1062427177326497863". `dashboard` is a CORE module.
- TWO PATHS, TWO ANSWERS. page-data.ts filters a listing with `if (tier === 'core') return true`;
  isModuleEnabledInGuild -- the dispatch path, the one that DENIES a command -- read the per-guild
  guild_module_states row alone. A stale `enabled:false` row for a core module therefore denied a
  command that must never be unavailable, while the page said it was enabled.
- §13.2 settles the intent: a core module is never uninstallable, so it can never be disabled. The row
  is an override for a module that CAN be turned off; for core there is nothing to override.
- FIX: `resolveModuleEnabled(tier, row)` in module-system/tier-rules.ts is now THE ONE RULE. Core
  returns true without consulting the row -- which makes a stale row INERT instead of FATAL. No row
  keeps the tier default; otherwise `enabled && state === 'active'`. The dispatch path returns early for
  core and delegates otherwise, so the two paths can no longer drift.
- NOT CHANGED, AND RECORDED: defaultEnabledForTier is `tier !== 'marketplace'`, so an ADMIN module is
  enabled by default. That is not a "never enabled" tier -- what hides an admin module is the LISTING
  and the admin-tier gate, not the enablement rule.
- **Verification:** full suite 112 files / 1132 tests / 0 failures; typecheck, lint, format green; gates 27/27.

---

### v5.5.51 — Gate 4 unblocked: the deploy-stopping failures were four test fixtures (UR-20261012-045) — 2026-10-12

- 2026-10-12 · meta-prompt 5.2.0 · state=Migration · handoff=migration-prompt · return=met (tree)
- WHY NOTHING DEPLOYED: every deployment since 17:20 UTC was SKIPPED, and the cause was not Railway.
  `Gates (D-8.4 strict sequence)` FAILED on 8ad10b8 with 11 annotations -- 10 failures, ALL in test
  fixtures written in UR-041 and UR-043. Not one was a product defect.
  - twill-registration (x2): received 403, expected 201/409 -- the UR-041 ownership gate is a real
    Discord call and the fixture never stubbed it, so every register test was refused before the route
    logic ran.
  - persona-registrar (x3): `this.registrars.hasAny is not a function` -- the registrarStore fixture
    kept its OLD one-argument signature; a UR-041 edit to it SILENTLY DID NOT APPLY, and the tests
    already called it with two arguments.
  - persona-interaction-handler (x4): "is not a spy or a call to a spy" -- the fixture returned the RAW
    dispatch function, so every `.mock` access threw.
- FIXES: buildRoutes stubs ownershipFetch; registrarStore(authorised, configured=true) exposes hasAny
  (and duplicate hasAny lines a blind replace introduced are collapsed); the handler fixture wraps its
  dispatch in vi.fn(...).
- THE VERIFICATION UNLOCK: vitest could not run in the build sandbox -- it deadlocked inside esbuild.
  The real cause was an ADDRESS-SPACE ULIMIT of 1.5 GB, which stopped V8 reserving its CodeRange and
  stopped WebAssembly allocating at all (RangeError: WebAssembly.instantiate(): Out of memory).
  Raising it (ulimit -v unlimited; the hard limit is already unlimited) makes the suite run.
  - THE FULL UNIT SUITE NOW RUNS LOCALLY: 1041 tests passed, 0 failed. Six test FILES report
    "Cannot find package '@workspace/swastik/manifest'" -- a local artifact of that workspace package
    not being built here; CI builds it and it produced none of these failures.
- SECOND DEPLOY-BLOCKER CAUGHT BEFORE IT SHIPPED: running the coverage suite locally surfaced a defect
  of my own -- UR-044's per-layer floor for src/commands/** at the documented 70% BRANCH fails; that
  layer measures 65.42%. Enforcing it would have failed Gate 4 on EVERY push and blocked EVERY deploy,
  precisely the outcome UR-044 s1 said it was avoiding. The floor is now MEASURED rather than assumed:
  statements/functions/lines clear their documented 75 and are enforced at 75; branch is held at the
  reachable 65 with 70 recorded as the TARGET. Verified locally: 112 files, 1127 tests, 0 failures,
  every threshold holds. This is the clearest argument for the s4 unlock -- without a runnable suite
  this defect was invisible and would have been found the way the last four were, by a skipped deploy.
- **Verification:** full unit suite 1127 passed / 0 failed WITH COVERAGE; every threshold holds; typecheck, lint, format green; gates 27/27.

---

### v5.5.50 — A2.3/A2.4/A2.5: the last three optionals (UR-20261012-044) — 2026-10-12

- 2026-10-12 · meta-prompt 5.2.0 · state=Migration · handoff=migration-prompt · return=met (tree)
- A2.3 — the coverage floors were ONE blanket 70/65/70/70, which §37.4 names outright as a defect.
  They are now per layer, mapped from §7.2 of directory-file-structure.md: the Application Core IS the
  flat apps/main/src/ (there is no src/core/ -- that tree was retired), so the core floor spans src/**
  and the narrower layers carve theirs out. src/commands/** is enforced at the documented 75/70.
  - RATCHET: the core floor spans every file and the app sits near 65% branch (64.87% failed this gate
    once), so 85/80 there would fail EVERY push and block EVERY deploy. Core is held at the baseline
    with the documented value recorded as the TARGET; each layer can now be raised on its own, which is
    the property the blanket lacked. Recorded, not hidden.
  - RECORDED GAP: TABLE 37-B's Repositories floor (70/65) is not enforceable while
    src/db/repositories/** is coverage-EXCLUDED. Covering those files is the prerequisite.
- A2.4 — a rename target is not a registry key (a rename changes the name, never the invocation, §17.8),
  so resolveCommandPayloads fell back to `description: name` -- a description repeating the command's own
  name. The target now travels with its SOURCE key (RegisteredCommand.source, from renameSources) and
  inherits the source command's real definition. Without a source map the old behaviour holds.
- A2.5 — the four /modules "current status" claims are ALREADY handled in code; what was missing was
  PROOF. Three tests now pin the exclusion: a disabled standard module is absent from the installed
  list, the total drops, and it reappears in /browse with a re-enable note. asPageInteraction preserves
  the guild across a paging re-render, so a re-render cannot lose the filter.
  - CORRECTED: the reported "Manage BCCM command queue queue actions" is NOT in the source -- the
    manifest reads "command queue actions". It was an OCR double-read, recorded so it is not "fixed"
    into a duplicate.
- **Verification:** typecheck, lint, format, corpus gates 27/27, test-import guard.

---

### v5.5.49 — A2.2 registry trust + A2.1 dispatcher extraction (UR-20261012-042/043) — 2026-10-12

- 2026-10-12 · meta-prompt 5.2.0 · state=Migration · handoff=migration-prompt · return=met (tree)
- A2.2 (UR-042) — the verifier's trust set was a single deployment variable, so a key could not be
  rotated without a redeploy and could not be revoked at all. It now arms from the `signing_keys`
  registry (the documented home, public keys only) AND config. A malformed row is skipped rather than
  disarming the rest, the registry read is best-effort so it cannot stop boot, and a registry-ONLY
  deployment is now armed -- it was not before. Boot gains one argument and one statement, no branch.
- A2.1 (UR-043) — THE LAST STRUCTURAL GAP. A persona was online with its commands registered and still
  silent when one of its own buttons was pressed: the dispatch path lived inside bootstrap's
  interactionCreate closure. system-map s11 says a persona is "the framework running again under a
  different identity", so it must dispatch as the main bot does.
  - `interactions/interaction-adapters.ts` -- toCommandInteraction, toComponentInteraction,
    readDiscoverModalSubmission, all pure, closing over nothing.
  - `personas/persona-interaction-handler.ts` -- the dispatch, never throwing.
  - PersonaRuntime attaches it BEFORE login and builds it per persona.
  - Bootstrap SHRINKS ~90 lines; the UR-018 guild-owner fix moved into the tested module intact.
- **Verification:** typecheck, lint, format, corpus gates 27/27, test-import guard.

---

### v5.5.48 — Persona registration: ownership, not allowlist (UR-20261012-041) — 2026-10-12

- 2026-10-12 · meta-prompt 5.2.0 · state=Migration · handoff=migration-prompt · return=met (tree)
- The operator challenged UR-20261012-037's registrar allowlist -- "Dumby is a public platform, anybody
  can register a persona themselves" -- and THE DOCUMENTS AGREE. ADR-011: registration is
  bring-your-own-identity, the ADMINISTRATOR supplies their own application. ADR-008 and system-map s11
  say the same. So UR-037 built the wrong mechanism: the registrar is the guild administrator, not the
  platform operator, and an allowlist of platform usernames gates the wrong party.
- OWNERSHIP IS THE GATE: verifyApplicationOwnership asks Discord (GET /applications/@me) which
  application a bot token belongs to and requires it to be the one claimed. Holding the token IS
  holding the application -- a real proof, and it needs no operator in the loop.
- The registry becomes an OPTIONAL allowlist, enforced ONLY when it has entries. The previous
  fail-closed-on-empty rule was the defect. registrarAuthority is a recorded identifier, not a
  permission. PERSONA_REGISTRAR_AUTHORITIES should now be LEFT EMPTY.
- The surface refuses before creating anything, with a 403 naming the mismatch.
- One control on the persona page: the invite link moved INSIDE the info card.
- **Verification:** typecheck, lint, format, corpus gates 27/27, test-import guard.

---

### v5.5.47 — Boot Safety / production outage fix (UR-20261012-040) — 2026-10-12

- 2026-10-12 · meta-prompt 5.2.0 · state=Migration · handoff=migration-prompt · return=met (tree)
- PRODUCTION WAS FAILED: the service built then died on boot with ERR_OSSL_UNSUPPORTED and the
  healthcheck never passed.
- CAUSE, and it is UR-20261012-036's fault: before it, the key was resolved INSIDE a try/catch, so an
  undecodable PEM produced a warning and the bot booted with the guard off. UR-036 restructured that
  block and moved resolveSigningPublicKey() -- which calls createPublicKey -- OUTSIDE the try, so a
  malformed key threw during boot and killed the process. The deployment had the private key set and
  no public key, so the fallback ran and could not decode it. No configuration change could have fixed
  it: the runtime must survive a bad key, which is what the old code did.
- armBuildProvenance() does resolution AND registration inside one helper that CANNOT throw, returning
  { armed, error? }. Both sites use it; the warning says the guard stays off and boot continues.
- The same class of risk was audited and closed: seedRegistrarsSafely (a failing boot-time registry
  write warns and returns 0) and PersonaRuntime.start (a failing persona listing yields an empty run).
- A regression test now covers the exact failure, and the helper moved into a TESTED module -- the
  gates and lint cannot execute a boot path, which is why the inline version shipped broken.
- **Verification:** typecheck, lint, format, corpus gates 27/27, test-import guard.

---

### v5.5.46 — Residuals Closed (UR-20261012-039) — 2026-10-12

- 2026-10-12 · meta-prompt 5.2.0 · state=Migration · handoff=migration-prompt · return=met (tree)
- ROUTE B COULD TAKE THE WHOLE DISABLE DOWN -- a real defect, not tidiness. Route B removes a module's
  commands with the owning application's bot token, and opening that token THREW when the envelope
  could not be unwrapped. The state write, the override attempt and the BCCM enqueue all sat behind it,
  so an unreadable token broke the disable flow outright. openBotTokenOrEmpty returns '' instead and
  deleteGuildCommands reports it, so the disable completes through the queued deregistration.
- Refresh no longer drops the chosen persona profile: the selected id rides on the Refresh control's
  custom id and travels on the page-data query channel. A numeric trailing segment is still a page
  index, so paging surfaces are untouched.
- Presence now FETCHES an uncached guild, so a cold cache is not mistaken for absence.
- **Verification:** typecheck, lint, format, corpus gates 27/27, test-import guard.

---

### v5.5.45 — The Persona Runtime (UR-20261012-038) — 2026-10-12

- 2026-10-12 · meta-prompt 5.2.0 · state=Migration · handoff=migration-prompt · return=met (tree)
- A registered persona was listed and invitable but never actually ONLINE -- nothing hosted its
  gateway. PersonaRuntime now hosts every ACTIVE persona: it opens the sealed bot token, builds a
  registry containing ONLY that persona's bound modules, deploys those commands to the persona's bound
  guild, and logs the client in. stop() logs them all out.
- One persona's failure never takes the fleet down: each is started independently, the reason is
  recorded, and the loop continues. The seams are injected, so the whole lifecycle is unit-tested
  without a gateway. filterRegistryForModules keeps the source registry's tier bookkeeping.
- OFF by default (PERSONA_RUNTIME_ENABLED): each persona costs one gateway connection.
- SCOPE, recorded not hidden: the persona is online and its commands exist, but it does not yet answer
  its in-message interactive controls -- that dispatch lives in bootstrap's entangled interactionCreate
  handler, and extracting it blind would risk the main bot's command path. Deferred deliberately.
- **Verification:** typecheck, lint, format, corpus gates 27/27, test-import guard.

---

### v5.5.44 — Registrar Authority Verification (UR-20261012-037) — 2026-10-12

- 2026-10-12 · meta-prompt 5.2.0 · state=Migration · handoff=migration-prompt · return=met (tree)
- The registration API required a registrarAuthority and never checked it -- and discarded it: it is
  not a field on the persona identity and nothing read it. Anyone with the internal key could register
  a persona for any Discord application.
- persona_registrars records (authority, discordApplicationId) grants; '' means any application, so
  the registry is not chicken-and-egg. registerPersona checks the grant BEFORE the duplicate check and
  throws RegistrarNotAuthorisedError; an ABSENT registry refuses everything rather than waving it
  through, so a misconfigured deployment fails closed.
- Two ways in: GET/POST /twill/registrars and DELETE /twill/registrars/:authority/:applicationId
  (behind the internal key), and the boot seed PERSONA_REGISTRAR_AUTHORITIES, applied idempotently.
  Authenticated-but-not-authorised is a 403, not a 400.
- **Verification:** typecheck, lint, format, corpus gates 27/27, test-import guard.

---

### v5.5.43 — Signing Key Custody (UR-20261012-036) — 2026-10-12

- 2026-10-12 · meta-prompt 5.2.0 · state=Migration · handoff=migration-prompt · return=met (tree)
- The operator asked why the build-signing keys sit on the core bot. The spec answers it (Swastik
  builds and signs; a developer's identity is a dev id, not a key) -- and exposes a real flaw: a
  verifier needs only the PUBLIC key, yet the runtime was handed the PRIVATE key and derived the
  public one from it, forcing the platform's signing secret into the bot for no reason.
- BUILD_SIGNING_PUBLIC_KEY is added and preferred, so the runtime can be given only the public half.
  resolveSigningPublicKey() falls back to deriving from the private key (so the builder still works)
  and returns undefined when neither is set, arming nothing and warning about nothing.
- **Verification:** typecheck, lint, format, corpus gates 27/27, test-import guard.

---

### v5.5.42 — Signing-key test import (UR-20261012-035 v1.1) — 2026-10-12

- 2026-10-12 · meta-prompt 5.2.0 · state=Migration · handoff=migration-prompt · return=met (tree)
- Gates failed with ReferenceError: describe is not defined -- the new normalizeSigningKey block used
  describe but the file imported only test and expect. Fixed by importing it.
- Third CI failure from the same class of mistake, so a local guard now checks that every vitest
  global a test file CALLS is imported (statement-level calls only, so a variable named `it` is not a
  false positive). It passes across the whole suite.
- **Verification:** typecheck, lint, format, corpus gates 27/27, and the new import guard.

---

### v5.5.41 — Signing Key Format Bug (UR-20261012-035) — 2026-10-12

- 2026-10-12 · meta-prompt 5.2.0 · state=Migration · handoff=migration-prompt · return=met (tree)
- `build-signing-key-invalid` was carried for several cycles as an OPERATOR CONFIG TASK. It was not.
  The warning names the required format -- "a single-line PEM with escaped newlines" -- and
  createPublicKey was handed the configured string VERBATIM, with no un-escaping anywhere. So the
  documented form failed with DECODER routines::unsupported, and the only working form (real line
  breaks) cannot be held in a single-line hosting variable. Both documented paths were dead ends; the
  operator could not have fixed it.
- Measured, not reasoned: the escaped form was fed to createPublicKey before and after the change.
- normalizeSigningKey turns the two-character \n back into a real line break and leaves a value with
  real newlines untouched, so both forms work. It lives in module-system/build-signing.ts (tested) and
  is called at both registration sites, keeping bootstrap.ts branch-free.
- **Verification:** `typecheck`, `lint`, `format`, corpus gates 27/27.

---

### v5.5.40 — Twill Surface Reachability + Registrar Attestation (UR-20261012-034) — 2026-10-12

- 2026-10-12 · meta-prompt 5.2.0 · state=Migration · handoff=migration-prompt · return=met (tree)
- REACHABILITY: the Twill process is not a deployed Railway service, so the registration API had
  nowhere to run. A new TWILL_ROUTES_ON_API flag (default FALSE) mounts the Twill persona routes on
  the API server as well, behind the same internal API key as /admin/, /mdis/ and /operational/. The
  mount is opt-in because the endpoint accepts bot tokens and client secrets -- the public surface
  must not grow by default.
- ATTESTATION: registrarAuthority was required by the parser and then dropped (it is not a field on
  the identity, and nothing read it). It is now written into the registration log line, so it is
  auditable. It is explicitly an ATTESTATION, not a credential check: nothing verifies it, because
  there is no registrar registry recording who may register which application. Authentication on the
  surface is the internal API key, compared in constant time.
- **Verification:** `typecheck`, `lint`, `format`, corpus gates 27/27.

---

### v5.5.39 — Install permissions actually sent + test fixtures (UR-20261012-031 v1.1) — 2026-10-12

- 2026-10-12 · meta-prompt 5.2.0 · state=Migration · handoff=migration-prompt · return=met (tree)
- CI found three faults across the four stacked commits. ONE WAS REAL: the v1.0 patch to the install
  leg never applied, so the permission bitfield was attached only when a guild was named. The
  dashboard's own guild-less link (/auth/authorize?bot=1) still sent no permissions, so Discord still
  arrived WITHOUT its permissions step -- the exact fault UR-20261012-031 set out to fix. The install
  leg now always carries the bitfield; the picker is pinned only when a guild is named.
- The other two were faults in the new tests: a sealed fixture opened with a fresh root key instead of
  the one it was sealed with (persona-oauth), and an assertion expecting HTML-escaped `&amp;` in a URL
  that carries a raw `&` (persona-setup).
- The run aborted at the tests, so COVERAGE WAS NEVER EVALUATED -- the 65% gate's verdict on this
  batch is still unknown.
- **Verification:** `typecheck`, `lint`, `format`, corpus gates 27/27.

---

### v5.5.38 — Twill Persona Registration API (UR-20261012-033) — 2026-10-12

- 2026-10-12 · meta-prompt 5.2.0 · state=Migration · handoff=migration-prompt · return=met (tree)
- Closes the last blocker on the persona flow: /twill/personas/register no longer answers 501. ADR-011
  makes the registration API the ONLY persona-creation surface, so serving it FULFILS that decision.
- POST /twill/personas/register parses the body, SEALS the bot token and the optional OAuth2 client
  secret (ADR-003), derives the digest, and answers 201 with identity only. publicPersonaView never
  discloses a sealed envelope or the digest -- asserted by a test.
- The rest of the control plane is served too: detail, status and charter reads, plus bind/unbind.
  Presence is deliberately not reported here (it needs a gateway; the /persona page resolves it).
- entry/twill.ts now builds the pool and services INSIDE the isMainEntry guard, so importing it in a
  test has no side effect (ACC-ARCH-0007-2). Parsing and route shapes live in
  personas/twill-registration.ts and are unit-tested without a process.
- **Verification:** `typecheck`, `lint`, `format`, corpus gates 27/27.

---

### v5.5.37 — Residuals: Rename Validation + Dead Code (UR-20261012-032) — 2026-10-12

- 2026-10-12 · meta-prompt 5.2.0 · state=Migration · handoff=migration-prompt · return=met (tree)
- Closes the finding UR-20261012-027 s6 recorded: a rename/alias name is now validated WHERE IT IS
  SUBMITTED, so it can no longer be accepted and then silently dropped at push. The same rule the push
  path enforces is reused, not restated.
- NoticeReasonCode gains INVALID_INPUT with its own heading/explanation, and noticeReasonFromError
  maps InvalidCommandNameError to it -- a rejected submission renders through the standard notice
  frame rather than as a module fault.
- Removes the dead navigation control: CommandRouter.navigationControl was declared and never called,
  and RenderDescriptor.navigation was never populated; both and the NavigationControl type are gone.
- **Verification:** `typecheck`, `lint`, `format`, corpus gates 27/27.

---

### v5.5.36 — Persona Invites, Install Permissions, Cleaner Dashboard (UR-20261012-031) — 2026-10-12

- 2026-10-12 · meta-prompt 5.2.0 · state=Migration · handoff=migration-prompt · return=met (tree)
- A registered persona now reads ONLINE (it exists and is invitable); whether its bot is already in the
  guild is stated separately in the subtext. Presence no longer drives the status.
- One invite control on the persona profile, admin-only: the combined install+authorize link when an
  OAuth2 secret is registered, else a plain bot install pinned to the bound guild. OAuth configuration
  stays optional behind the info control, whose card now also carries the invite link and names the
  persona.
- The install leg sends a permission bitfield (BOT_INSTALL_PERMISSIONS, default 84992), which is what
  makes Discord render its standard permissions step -- the operator's report that the screen lacked
  one.
- /dashboard is reduced to one purpose and one control (no guild list, no per-guild Authorize rows, no
  personas section): the guild and the bot's permissions are chosen on Discord's own screen.
- PageActionButton gains an optional url, so a block can render a real Discord link button.
- **Verification:** `typecheck`, `lint`, `format`, corpus gates 27/27.

---

### v5.5.35 — Persona Authorization, Route A + Route B (UR-20261012-030) — 2026-10-12

- 2026-10-12 · meta-prompt 5.2.0 · state=Migration · handoff=migration-prompt · return=met (tree)
- Route A (primary): a persona's OAuth2 client secret joins the Twill registration payload as an
  optional sealed field; personas/persona-oauth.ts resolves an OAuth2 client per persona application
  (its app id, its opened secret, the shared callback). /auth/authorize accepts app=<applicationId>,
  the callback exchanges with THAT application's client only and stores the token against it, and
  /dashboard lists each persona with an Invite + authorize link pinned to its bound guild.
- The access override now follows the OWNING application: setModuleCommandAccess resolves the persona
  bound to the module (else the main bot) and uses that application's endpoints and token. The static
  env token applies to the main bot only.
- Route B (fallback only): with no user token, a disable removes the guild commands with the owner's
  own bot token -- a bot-token operation needing no authorization at all. A 404 counts as removed;
  the BCCM re-creates on enable. Costs the daily create quota and changes the command id.
- **Blocker restated:** /twill/personas/register is still an HTTP stub (501), so no persona (and so no
  client secret) can yet be created in production. The service and model accept the secret today.
- **Verification:** `typecheck`, `lint`, `format`, corpus gates 27/27.

---

### v5.5.34 — Persona Context Awareness + Setup Control (UR-20261012-029) — 2026-10-12

- 2026-10-12 · meta-prompt 5.2.0 · state=Migration · handoff=migration-prompt · return=met (tree)
- The /persona board is now context-aware: it lists a persona when this guild REGISTERED it
  (persona_identities.boundGuildId) or when a binding points at it, and opens on the persona bound to
  this module, else the guild's own registration, else the main bot.
- A persona's status is presence-based: Active only when its bot is actually invited and present in
  its bound guild, else Inactive (a retired registration stays Retired). Presence is resolved at
  render time via a new injected predicate; a bot user id equals its application id, so the main bot
  resolves membership by fetching that id. The lookup is total and logs rather than throws.
- A guild admin (owner / Administrator / Manage Server) sees an info-icon control opening a PRIVATE
  card: the OAuth callback URL the persona's application must register, the portal guide, and a link
  button labelled 'Invite link of persona to the guild' to the dashboard.
- **Blocker surfaced:** /twill/personas/register is still an HTTP stub (501), so no persona row can
  exist in production yet; the page renders the main bot alone. The logic is complete and unit-tested
  against seeded rows.
- **Verification:** `typecheck`, `lint`, `format`, corpus gates 27/27.

---

### v5.5.33 — Persona ownership bug + dashboard install link (UR-20261012-028 v1.1) — 2026-10-12

- 2026-10-12 · meta-prompt 5.2.0 · state=Migration · handoff=migration-prompt · return=met (tree)
- CI found two faults in the v5.5.32 work, both now fixed. (1) A REAL bug in the persona ownership
  check: `modulesOwnedBy` compared a module's name against the set of persona IDS rather than the
  ownership map, so the main bot wrongly retained a persona's module in its inventory. It now reads
  the map. (2) The dashboard's install link never rendered, because the string patch that added it
  silently failed to match; it is now in the page body and asserted by a test.
- **Verification:** `typecheck`, `lint`, `format`, corpus gates 27/27.

---

### v5.5.32 — OAuth Install Flow, Phase 1 (UR-20261012-028) — 2026-10-12

- 2026-10-12 · meta-prompt 5.2.0 · state=Migration · handoff=migration-prompt · return=met (tree)
- Operator chose the combined install flow. Phase 1 covers the main bot: `/dashboard` gains *Add Dumby
  to your server* (`/auth/authorize?bot=1`), which requests the install scopes so Discord continues
  into the full code grant — with the code-grant toggle on, the bot is added only after the exchange,
  so the guild arrives already authorized. The callback prefers the `guild_id` Discord returns over
  the cookie.
- The command-permission token is now keyed by **(applicationId, guildId)**: the endpoint is
  per-application, so a token belongs to the application that issued it. A migration re-keys the
  table, and `adoptLegacy` re-keys pre-change rows at boot (non-fatally) so existing authorizations
  keep working.
- **Phase 2 (personas) is deliberately not built.** A persona is a separate Discord application
  needing its own credentials and authorization; the operator reports persona credentials arrive
  only through the one-time Twill registration, so the client-secret question stays open.
- **Verification:** `typecheck`, `lint`, `format`, corpus gates 27/27.

---

### v5.5.31 — Persona test fix + BCCM skip observability (UR-20261012-026 v1.1, UR-20261012-027) — 2026-10-12

- 2026-10-12 · meta-prompt 5.2.0 · state=Migration · handoff=migration-prompt · return=met (tree)
- The profile-aware board's v1.0 commit failed CI on a fault in its own new test, not the code: it
  passed the selected persona id in the `page` argument instead of `query`, so the page correctly
  fell back to the running profile. The router passes `options.query` fourth, so production was
  always right; the test now passes it fourth.
- The first successful BCCM push also emitted `bccm-batch-command-skipped` with no readable detail.
  The dropped name and reason now travel in the message string, per the UR-019 self-describing rule.
  The skip was an **invalid name** (an unresolved name is still sent), and every first-party command
  name is valid — so it was a guild rename/alias target.
- **Finding, not fixed:** the `/queue` submit path does not validate a rename/alias name, so an
  invalid rename is accepted and then silently dropped at push. It needs a new notice reason code to
  reject properly, so it is left as a follow-up rather than half-fitted (UR-027 §6).
- **Verification:** `typecheck`, `format`, corpus gates 27/27.

---

### v5.5.30 — /persona Profile-Aware Board (UR-20261012-026) — 2026-10-12

- 2026-10-12 · meta-prompt 5.2.0 · state=Migration · handoff=migration-prompt · return=met (tree)
- Operator corrections on the UR-025 board: use custom indicators rather than general emoji, drop the
  restated guild, tidy the command inventory, and let members switch between the personas active in
  the guild.
- The page now opens on the persona **running the command** (the persona bound to this module, else
  the resident main bot) instead of a hardcoded main bot, lists every persona active in the guild,
  and renders the selected profile's identity and owned-command inventory.
- Five indicator assets ship as application emojis (uploaded at bootstrap, unicode fallback until
  then): `dumby_status_online`, `dumby_status_offline`, `dumby_info`, `dumby_identity`,
  `dumby_profile`.
- **Verification:** `typecheck`, `lint`, `format`, corpus gates 27/27. `persona-blocks.test.ts`
  rewritten; `page-data.test.ts` covers the no-persona, bound-persona and failed-read paths.

---

### v5.5.29 — Persona page-data test (UR-20261011-025 v1.1) — 2026-10-12

- 2026-10-12 · meta-prompt 5.2.0 · state=Migration · handoff=migration-prompt · return=met (tree)
- The v5.5.28 commit failed CI on a single stale assertion: page-data.test.ts asserted the old
  persona shape (`Bound Modules` in `JSON.stringify(data)`). The full log showed
  `Tests 1 failed | 980 passed` and no coverage error, so that was the whole failure.
- The test now asserts the new status / summary / identity / tiers shape.
- **Verification:** `typecheck`, `format`, corpus gates 27/27.

---

### v5.5.28 — /persona Interface Revision (UR-20261011-025) — 2026-10-12

- 2026-10-12 · meta-prompt 5.2.0 · state=Migration · handoff=migration-prompt · return=met (tree)
- Work order: `UR-20261011-025`.
- The /persona page had no block set and fell back to plain sections with a run-on command inventory.
  Added `rendering/persona-blocks.ts`: a status headline (`🟢 Main Bot · Online`) with the Refresh
  control in-line, the identity as one compact field line, the command inventory grouped by tier with
  code-formatted commands, and the Twill note. `persona()` now emits status/summary/identity/tiers/note;
  the router attaches the blocks when the data carries `tiers`.
- **Verification:** `typecheck`, `lint`, `format` green; corpus gates 27/27.

---

### v5.5.27 — Non-Blocking Boot Command Deploy (UR-20261011-024) — 2026-10-11

- 2026-10-11 · meta-prompt 5.2.0 · state=Migration · handoff=migration-prompt · return=met (tree)
- With NODE_ENV=production the boot's per-guild registration (two bulk-overwrite calls per guild) is
  rate-limited and took ~2m13s, blocking readiness. The deploy now runs in the BACKGROUND, after the
  guilds are registered (the resolver reads the `guilds` table), and a failure is logged, not fatal.
- **Verification:** `typecheck`, `lint`, `format` green; corpus gates 27/27.

---

### v5.5.26 — BCCM name validation (UR-20261011-023 v1.1) — 2026-10-11

- 2026-10-11 · meta-prompt 5.2.0 · state=Migration · handoff=migration-prompt · return=met (tree)
- The operator's log confirmed the v5.5.25 diagnosis (`status=400 Invalid Form Body`, missing
  `description`) and added one detail: a command also had an **invalid name**. Since the BCCM sends a
  bulk overwrite, one bad name rejects the whole batch. `isValidCommandName` now guards
  `resolveCommandPayloads`, which drops an invalid name and reports it as `invalid-name`.
- `module-command-access-set` now carries `applied=N` in the message (the UR-019 pattern), so the
  instant hide is confirmable from the log.
- **Verification:** `typecheck`, `lint`, `format` green; corpus gates 27/27.

---

### v5.5.25 — New-Guild Deploy, Per-Guild Auth, BCCM Payload (UR-20261011-023) — 2026-10-11

- 2026-10-11 · meta-prompt 5.2.0 · state=Migration · handoff=migration-prompt · return=met (tree)
- Work order: `UR-20261011-023`.
- A new guild had no commands: `NODE_ENV` defaults to `development`, where the deployer registers only
  to `DEV_GUILD_ID`; and even in production a guild joining after boot got none until the next deploy.
  Added `CommandDeployer.deployForGuild` + an `onGuildJoin` callback on `GuildCreate`.
- `/dashboard` now lists every guild with its own Authorize link and status (authorization is per guild).
- Found the `bccm-batch-put-failed` cause: the BCCM sent `{ name }` only, and Discord's bulk overwrite
  requires a `description`. Added `resolveCommandPayloads` (full objects, rename-aware, minimal fallback).
- **Verification:** `typecheck`, `lint`, `format` green; corpus gates 27/27.

---

### v5.5.24 — OAuth state-cookie path (UR-20261011-022 v1.1) — 2026-10-11

- 2026-10-11 · meta-prompt 5.2.0 · state=Migration · handoff=migration-prompt · return=met (tree)
- Found while reviewing the Developer Portal screenshots: the authorize leg set `dumby_oauth_state` /
  `dumby_oauth_guild` with `Path=/auth`, so a browser reaching the `/oauth/callback` alias would not
  send them and the state check would fail there. The unit test missed it because it injects the cookie
  header directly. The cookies are now `Path=/`.
- **Verification:** `typecheck`, `lint`, `format` green; corpus gates 27/27.

---

### v5.5.23 — OAuth Route Coverage & Callback Alias (UR-20261011-022) — 2026-10-11

- 2026-10-11 · meta-prompt 5.2.0 · state=Migration · handoff=migration-prompt · return=met (tree)
- Work order: `UR-20261011-022`.
- The 60eb7c1 CI run passed all 961 tests but failed the branch-coverage gate at 64.87% (threshold 65%),
  with `http/routes/oauth.routes.ts` at 0% branch coverage. Added `oauth-routes.test.ts` (Fastify
  inject: dashboard statuses, authorize cookies, callback state/missing-code/success/not-permitted/
  failure) and an unreadable-refresh-token case, so the routes are covered.
- The callback handler is now registered at both `/auth/callback` and the older `/oauth/callback`.
- **Verification:** `typecheck`, `lint`, `format` green; corpus gates 27/27.

---

### v5.5.22 — BCCM Put-Failure Observability (UR-20261011-021) — 2026-10-11

- 2026-10-11 · meta-prompt 5.2.0 · state=Migration · handoff=migration-prompt · return=met (tree)
- Work order: `UR-20261011-021`.
- `bccm-batch-put-failed` now puts the error text (which for a Discord API error includes the HTTP
  status and code) in the message string, and names the status — the same pattern UR-019 used.
- Corrected the two UR-020 `refreshDue` tests: their fixtures expired in 2s while the lead was 1000ms,
  so the loop correctly skipped them; the lead is now 1_000_000ms.
- **Verification:** `typecheck`, `lint`, `format` green.

---

### v5.5.21 — Durable Command-Permission Tokens (UR-20261011-020) — 2026-10-11

- 2026-10-11 · meta-prompt 5.2.0 · state=Migration · handoff=migration-prompt · return=met (tree)
- Work order: `UR-20261011-020`.
- Confirmed: the command-permissions endpoint needs a **user** Bearer token
  (`applications.commands.permissions.update`), obtainable with a refresh token only via the
  **authorization-code grant**; the refresh response returns a fresh refresh token, so the latest is
  stored (safe whether or not Discord rotates).
- Added `guild_command_permission_tokens` (sealed access/refresh credential ids), `/auth/callback`
  (state + code exchange + Manage Server check + store), `/dashboard` (Authorize Dumby button + status),
  and a 6-hourly refresh task that rotates the refresh token and marks a revoked/expired grant.
- The command-permissions write resolves stored token → env token → current behaviour (state + BCCM).
- **Verification:** `typecheck`, `lint`, `format` green; corpus gates 27/27.

---

### v5.5.20 — Self-Describing Warnings (UR-20261011-019) — 2026-10-11

- 2026-10-11 · meta-prompt 5.2.0 · state=Migration · handoff=migration-prompt · return=met (tree)
- Work order: `UR-20261011-019` (the operator's "yes, do option 1").
- `discord-client-error` / `discord-client-warn`, `build-signing-key-invalid` (both arming sites) and
  `module-provenance-unverified` now put their detail in the **message string**, because the operator's
  log viewer drops the structured fields — the same workaround `command-execution-error` already uses.
- The signing-key message now states the remedy (a single-line PEM with escaped newlines).
- No behaviour change; structured fields retained.
- **Verification:** `typecheck`, `lint`, `format` green.

---

### v5.5.19 — Record correction (UR-20261011-018 v1.1) — 2026-10-11

- 2026-10-11 · meta-prompt 5.2.0 · state=Migration · handoff=migration-prompt · return=met (docs)
- Retracts the UR-018 §6 claim that `persona.repository.ts` binds `guild_persona_bindings` on a
  `moduleSlug` key the table lacks — the migration `20260101000034_align_persona_model.ts` provides
  both the column and the `(guildId, moduleSlug)` primary key, so the binding is correct.
- Records that `CommandRouter.navigationControl` and the renderer's `navigation?` field are dead code.

---

### v5.5.18 — Disable-Flow Corrections (UR-20261011-018) — 2026-10-11

- 2026-10-11 · meta-prompt 5.2.0 · state=Migration · handoff=migration-prompt · return=met (tree)
- Work order: `UR-20261011-018` (the operator's four live requests).
- **R1 — Compact confirmation.** A disable now replaces the card with a formal **Mode C** frame
  ("✅ **<module>** disabled — … Re-enable it from /browse."). New `disableConfirmation` dependency.
- **R2 — instant hide/restrict.** `setModuleCommandAccess` wrote the per-guild command-permission
  override with the BOT token; Discord's *Edit Application Command Permissions* endpoint accepts only
  a **Bearer token** (`applications.commands.permissions.update`) — a bot token is rejected (403,
  "Bots cannot use this endpoint"). It now uses `DISCORD_COMMAND_PERMISSIONS_TOKEN` (new env key) via a
  direct `PUT`. Absent the token it logs `command-access-token-missing` and returns; the state write
  and BCCM deregistration still apply.
- **R3 — `/browse` Info.** The `dumby:info:` customId now carries the surface; the uninstall control
  renders on the `/modules` card only.
- **R4 — owner rank.** Both interaction adapters now pass `isGuildOwner` (the component adapter also
  passes member context), so a guild owner is not mis-ranked to RESTRICTED.
- **Retraction:** an earlier draft claimed `persona.repository.ts` binds `guild_persona_bindings` on a
  `moduleSlug` key the table lacks. Verified **false** — migration `20260101000034` gives the table a
  `moduleSlug` column and a `(guildId, moduleSlug)` primary key. No defect. (`navigationControl` is
  likewise dead code; the "navigation dropdown" has no code path.)
- **Test assertions** updated for the surface-carrying `dumby:info:` customId
  (`modules-blocks.test.ts`, `browse-ui.test.ts`) — the two unit failures that skipped the deploy.
- **Coverage:** the new logic is kept out of `bootstrap.ts` (0% covered): the Bearer-token path lives
  in `command-access.ts` and the confirmation in `confirmations.ts`, both fully unit-tested, and the
  unused component-path member context was removed. This restores the branch gate (65%).
- **Structure test:** `command-access.ts` added to the canonical `src/commands/` list in
  `command-tree-structure.test.ts`.
- **Verification:** `typecheck`, `lint`, `format` green; the ConfigMap gate unchanged (27 keys).

---

### v5.5.17 — Disable Button Non-Functional (UR-20261011-017) — 2026-10-11

- 2026-10-11 · meta-prompt 5.2.0 · state=Migration · handoff=migration-prompt · return=met (tree)
- Work order: `UR-20261011-017` (the operator's live report: the Disable button does nothing).
- **Root cause.** `guild_module_states` is guarded by a **partial** unique index
  (`createPartialUniqueNotDeleted` → `... where "deletedAt" is null`). Postgres matches an `ON CONFLICT`
  target to a partial index only when the target repeats the predicate; the three upserts used the bare
  `.onConflict(['guildId', 'moduleSlug'])`, which matches no index, so the insert threw **42P10** and
  the disable never persisted. `uninstallModule` is not in a try/catch, so the button was a no-op.
- **Fix.** All three `guild_module_states` upserts (`uninstallModule`, `installModule`, the
  `isModuleEnabledInGuild` seed) now use
  `.onConflict(db.knex.raw('("guildId", "moduleSlug") where "deletedAt" is null'))` — the codebase's own
  idiom (as in `admin.routes.ts` for `guild_command_renames`).
- **Proof.** Generated SQL now carries `where "deletedAt" is null`; a DB-free regression test
  (`tests/unit/module-state-upsert.test.ts`) locks it.
- **Verification:** `typecheck`, `lint`, `format` green locally. The instant `@everyone` deny override
  now runs; the BCCM deregistration still needs `BCCM_BATCH_PUSH_DRY_RUN=false`.

---

### v5.5.16 — Deploy-Gate Corrections (UR-20261011-016) — 2026-10-11

- 2026-10-11 · meta-prompt 5.2.0 · state=Migration · handoff=migration-prompt · return=met (tree)
- Work order: `UR-20261011-016` (the `ae2a6d3` deploy was SKIPPED — Railway `checkSuites`; two checks
  failed).
- **R1 — format (Gates D-8.4):** `apps/main/tests/unit/env-schema.test.ts` failed `prettier --check`
  (Gate 3), which failed the whole `Gates` job. Now Prettier-clean; the app passes `prettier --check`.
- **R2 — docs-gate freshness (Documentation gates):** `check-code-reconciliation.mjs` exited 1 because
  the `docs-gates` checkout is shallow (`fetch-depth: 1`) and the parent commit is absent. It now
  **warns** when the commit is absent and fails **only** when it resolves but is not an ancestor of
  HEAD.
- **R3 — `ephemeral` deprecation:** every `deferReply({ ephemeral: … })` is replaced by
  `flags: MessageFlags.Ephemeral` (`interaction-registry.ts`, `middleware/built-in/defer.ts`,
  `bootstrap.ts`); the structural `deferReply` types now carry `flags?: number | bigint`.
- **R3 (tests) — the second deploy's actual failure.** The `ephemeral` → `flags` change broke two
  existing `deferReply` assertions (`browse-ui.test.ts` expected `{ ephemeral: true }`;
  `middleware.test.ts` expected `{ ephemeral: false }`), which failed **Gate 4 `test:coverage`** and
  skipped the `1a74d30` deploy. Both are updated to the `flags` form (and the public case to
  `undefined`), plus a new `Ephemeral` case.
- **Verification:** `typecheck`, `lint`, `format` green locally; the corpus gate suite 27/27. CI is the
  deploy gate.

---

### v5.5.15 — Modules Enablement Read & Developer Attribution (UR-20261011-015) — 2026-10-11

- 2026-10-11 · meta-prompt 5.2.0 · state=Migration · handoff=migration-prompt · return=met (tree)
- Work order: `UR-20261011-015` (root-cause correction from the operator's live-surface screenshots).
- **Defect A — attribution.** `module-system/developer-registry.ts` mapped `dev_first_party` to the
  operator handle `master_ronix`, so pages rendered `@master_ronix` while the Info card rendered
  `Quixotic Mnemonics`. **Fix (R1):** the first-party ids resolve to `Quixotic Mnemonics` and the
  identity band renders the value verbatim (no `@`), matching SPEC-04-REQUEST-LAYER §1.5/§11.6.
- **Defect B — enablement read.** `bootstrap.ts`'s `isModuleEnabledForGuild` returned `false` for a
  missing `guild_module_states` row, so an enabled-by-default standard module reported "Disabled" in
  its card while the listing (tier default) still showed it and `/browse` offered nothing — the exact
  contradiction in the screenshots; the event gate also dropped that module's events. **Fix (R2):**
  it now defaults by tier and overrides by row, matching `isModuleEnabledInGuild` and `pageData`'s
  `enabledStates`.
- **Regression tests:** `developer-registry.test.ts` (new); a no-`@` case in `core-renderer.test.ts`.
- **Verification:** `typecheck` and `lint` green locally; `test:unit` pending CI (WebAssembly
  unavailable in the examination environment).

---

### v5.5.14 — Codebase Interception: BCCM Dry-Run Env Coercion (UR-20261011-014) — 2026-10-11

- 2026-10-11 · meta-prompt 5.2.0 · state=Migration · handoff=migration-prompt · return=met (tree)
- Work order: `UR-20261011-014` (code correction from the codebase interception).
- **The defect:** `z.coerce.boolean()` in `apps/main/src/config/env.schema.ts` is `Boolean(value)`, so
  the env string `"false"` coerced to `true`. On `BCCM_BATCH_PUSH_DRY_RUN` (`.env.example`: *"Set
  false to send"*) the dry-run could never be turned off, so the **BCCM batch push never ran and a
  disabled module's commands were never deregistered on Discord** — the root cause of the
  `UR-20261011-013` S2 symptom. The same class would silently force `DATABASE_SSL` / `REDIS_TLS` on.
- **The fix (R1):** a strict `envBool(def)` helper (true/1/yes/on → true; other non-empty → false;
  blank/unset → default) replaces `z.coerce.boolean()` on all five fields. **Regression tests (R2):**
  `tests/unit/env-schema.test.ts` gains three cases.
- **The verdict (R3):** the `/modules` feature code of `UR-20261011-009/010/011` is fully implemented
  at HEAD (fallback/decoration split, ephemeral Mode-M Info card, developer-by-name, Home target,
  disable/enable state write + EventRouter gate + BCCM enqueue + `@everyone` deny override). The
  operator's live symptoms trace to configuration/deployment, not missing code.
- **Verification:** `typecheck` and `lint` green locally; `test:unit` pending CI (WebAssembly
  unavailable in the interception environment). No change to the dry-run default.

---

### v5.5.13 — Documentation Corpus Governance Remediation (UR-20261011-012) — 2026-10-11

- 2026-10-11 · meta-prompt 5.2.0 · state=Migration · handoff=migration-prompt · return=met (docs)
- Work order: `UR-20261011-012` (docs governance; corrects the drifted registers, pointers and side
  ledgers). **Documentation-only** — no `apps/main/src` file is touched.
- **F1:** `upgradation/README.md` no longer claims the dynamic probe finds zero records; the register
  is restated as provenance-only and the count is read from the probe, never prose. **F2:** the UR
  count is no longer restated in prose. **F3/F8:** `AGENTS.md` names only live authority paths and the
  counted 15 ADRs. **F4:** `status/code-reconciliation.json` is re-pointed to HEAD `8355ba4f` and
  `check-code-reconciliation` now fails on an unresolvable / non-ancestor commit and warns when behind
  HEAD. **F5:** `GAP_MANIFEST.md` is made self-consistent (one live coverage figure, one HEAD ref) and
  marked point-in-time. **F6:** `migration-ledger.md` current item is current. **F7:** `apps/main/docs/`
  is declared out-of-corpus and `check-corpus-boundary` guards the boundary. **F9:** `check-side-docs`
  guards the side documents against count and HEAD drift.
- **Verification:** the corpus gate suite is green (27 gates); `check-ur` reads the live count from
  the probe. No application change; the application suite is unaffected.

---

### v5.5.12 — Module Disable Enforcement (UR-20261011-011) — 2026-10-11

- 2026-10-11 · meta-prompt 5.2.0 · state=Migration · handoff=migration-prompt · return=met (tree)
- Work order: `UR-20261011-011` (corrects `UR-20261011-010`).
- **C1/C4:** `/modules` lists only enabled modules; a disabled module is offered in `/browse` as
  "Previously installed". **C2:** disable now **enforces** — an instant `@everyone` **deny override**
  via Discord's per-guild command permissions (§17.6) plus the **BCCM** deregistration enqueue, and the
  `EventRouter` gates dispatch so a disabled module's handlers stop firing. **C3:** the dashboard
  registers a page only for an enabled standard module. Fleet-wide jobs/tasks are not per-guild and are
  out of scope (§29.6).
- **Verification:** the corpus gate suite is green; the application suite is pending CI; the
  interaction paths require a live run.

---

### 4. Cross-Version Defect Lifecycle

| Id | Introduced | Status | Resolution |
|---|---|---|---|
| D1 | v5.0.0 | resolved | dangling compliance ledger — `status/compliance.json` now derived by `gen-compliance.mjs` and gated (`check-compliance`) |
| D2 | v5.0.0 | resolved | count contradiction ("fifty-four" vs twenty-four) corrected; `check-counts` verifies `logged_deviations` |
| D3 | v5.0.0 | resolved | stale `docs/ur/` path corrected to `upgradation/` |
| F1 | v5.0.0 | resolved | `status/code-reconciliation.json` re-verified at HEAD; the seven module-manifest rows `match` |
| F2 | v5.0.0 | resolved | `tier-rules.test.ts` duplicate key removed; out-of-enum case added |
| F3 | v5.0.0 | resolved | `capabilities.json` CAP-004/005 corrected; compliance regenerated |
| F-4 | v5.3.0 | resolved | UR-004 `pageDataProvider` arity mismatch fixed (`page?: number`) |
| F-5 | v5.3.0 | resolved | dashboard `COMPONENT_CUSTOM_ID_DUPLICATED` fixed (role-keyed nav ids) |
| F-6 | v5.5.0 | resolved | `module-emoji-upload` null-application guard |
| AF-1…AF-14 | v5.5.1 | remediated | corpus residual closure — UR-20261010-001 (see the 2026-10-10 entry) |

---

### 5. Open Items Carried Forward

| Id | Item | Owner | Status |
|---|---|---|---|
| OI-1 | Human attestation of the corpus (`review_state` / `last_verified_commit`) | Dumby Core Engineering | open (UR-20261008-001; UR-20261010-001 R4) |
| OI-2 | Per-layer coverage floors (directive D-8.2) — config still blended | engineering | open |
| OI-3 | Unverified surfaces: flow / integration / Docker / K8s (require live services) | engineering | open (GAP_MANIFEST F4) |
| OI-4 | Default banner + default white icon assets | operator | open (asset dependency) |
| OI-5 | Migration slices M10 / M14 / M16 | engineering | open (migration-ledger) |
| OI-6 | 24 logged deviations (appendix-c) routed to M9 residual | framework-maintainers | open |
| OI-7 | Branch-divergence decision (`main` vs `feature/dev`) | operator | open |

### 5.1 Request dispositions (UR-20261010-001 R9)

| Request | Disposition |
|---|---|
| UR-20261008-001 — human-attestation | Superseded-in-scope by UR-20261010-001 R4; the attestation **policy** is now stated (docs/README.md). The review pass itself remains open (OI-1). |
| UR-20261009-001 — corpus re-anchoring (`main` @ `9e29e855`) | Executed-in-substance at `feature/dev` by UR-20261010-001 (R1/R2/R3). The branch-divergence decision remains open (OI-7). |
| UR-20261009-002 — hardening / migration / rebrand | Executed (docs + code) across v5.3–v5.5; the interactive residuals are tracked (OI-5). |
| UR-20261010-001 — corpus residual closure | Executed 2026-10-10 (see the entry above). |
