---
id: CHANGELOG
title: Unified Change Log
kind: index
status: normative
version: 5.5.0
chain_role: record
preceded_by: prompts/meta-prompt.md | orchestration/master-prompt.md | migration/migration-prompt.md
change_log: upgradation/change-log.md
authority_scope: [history]
---

# DUMBY Documentation — Unified Change Log

> **One project. One continuous history.**
> Last recorded: 2026-10-10

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
