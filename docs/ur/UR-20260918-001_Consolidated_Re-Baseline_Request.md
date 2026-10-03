# UPGRADATION REQUEST — Dumby Documentation Re-Baseline to v5.0 (Consolidated Program, 121 Requests)

> **Document type:** Upgradation Request (UR) — cross-documentation change directive
> **Project:** Dumby — Discord Unified Modular Bot System
> **UR ID:** UR-20260918-001
> **Template Version:** 1.0 — filled instance (all layout retained, no new structural elements)
> **Classification:** Engineering Planning — pre-implementation

---

## DOCUMENT CONTROL

| Control Field | Value |
|---|---|
| **UR ID** | UR-20260918-001 |
| **UR Title** | Dumby Documentation Re-Baseline to v5.0 — Consolidated Program (121 Requests) |
| **Requester** | Dumby Core Engineering — Quixotic Mnemonics |
| **Document Set Owner** | Dumby Core Engineering — Quixotic Mnemonics |
| **Date Raised** | 18/09/2026 |
| **Date Last Updated** | 18/09/2026 |
| **Current UR Version** | 1.0 |
| **Supersedes** | None |
| **Related URs** | 5.0-UR-1 (v5.0 Upgrade Program, 31 URs) · Dumby-Suite Upgrade Request @ `be39a52` (88 requests) · RBAC Upgradation Requirements (2 requirements) |
| **Change-Log Reference** | change-log.md → v5.0.0 re-baseline entry |
| **Target Document Set Size** | 12 document(s) |
| **Status** | DRAFT |
| **Priority** | P0 |
| **Due Date** | None — gated to Phase 0 of the v5.0 rollout (decision window), not a calendar date |

### Status Lifecycle

| Status | Meaning | Set By |
|---|---|---|
| `DRAFT` | Being authored; not yet ready for review | Requester |
| `UNDER REVIEW` | Circulated to reviewers; comments open | Requester |
| `APPROVED` | Sign-off complete; cleared for implementation | Approver |
| `IN PROGRESS` | Changes being applied to the document set | Implementer |
| `VERIFIED` | All acceptance checks passed | Verifier |
| `CLOSED` | Implemented, verified, and archived | Document Set Owner |
| `REJECTED` / `DEFERRED` | Not approved / parked with a revisit date | Approver |

### Priority Definitions

| Priority | Definition | Expected Turnaround |
|---|---|---|
| `P0` | Blocks Phase 0 or production readiness — security holes in existing code (unauthenticated control planes, path traversal), outright-broken dispatch, and the critical-path feature URs (Renderer, pipeline) | Phase 0 window |
| `P1` | Core program value — trust, licensing, identity, wiring of tested-but-dead subsystems; High-severity flaw classes | Phases 1–3 |
| `P2` | Completes the workstreams — Medium-severity corrections, naming, glossary, polish | Phases 3–4 |
| `P3` | Cosmetic or typographic documentation cleanup | Any phase |

---

## HOW TO USE THIS TEMPLATE

> **Note:** This is a filled instance of Template v1.0. The placeholder conventions below describe the tokens that were replaced during filling; the completion rules state how this instance was populated.

**Placeholder conventions used throughout:**

| Convention | Meaning |
|---|---|
| `{{token_name}}` | Fill-in field — replaced with actual value in this instance |
| `<option_a / option_b>` | Choose exactly one of the listed options |
| `[ ]` / `[x]` | Checkbox — tick when the item is done |
| `—` | Not applicable / intentionally empty |
| `▶ NOTE:` | Guidance line — guidance consumed during filling |

**Completion rules applied:**

1. Every `{{token}}` in Template v1.0 has been replaced; no placeholder remains unfilled.
2. Every one of the 121 source requests (UR-01…UR-31 from the v5.0 program, UR-A-01…UR-C-30 from the Suite request, R1/R2 from the RBAC requirements) appears exactly once as a row in the master section-level table (§8.1.2), placed one by one in source order; per-document blocks (§8.2–§8.12) carry the derived changes for their own document only.
3. Any change not traceable to a source request ID is out of scope (see §6.2 — the 52 deferred greenfield items are excluded).
4. This UR is recorded in change-log.md upon closure; its own revisions are tracked in Appendix A.

---

# PART A — REQUEST DEFINITION

## 1. Request Summary

### 1.1 One-Line Summary

Re-baseline the twelve-document Dumby corpus to v5.0 so the documentation describes the system that actually ships, absorbing all 121 verified requests from the three source programs: 31 v5.0 program URs, 88 implementation-flaw corrections, and 2 RBAC redesign requirements.

### 1.2 Change Abstract

| Dimension | Statement |
|---|---|
| **What is changing** | Full content-and-structure re-baseline: the Renderer and buffer embed grammar, RBAC Layer 6/7 redesign, `swastik` authoring package, tier volumes replacing `/src/modules`, the license state machine, the Compatibility Ledger, Global Data Emit, the Twill rename, envelope encryption, 88 flaw-fix corrections to architecture descriptions, 11 ADRs for cross-cutting tensions, and honesty invariants on all superlative claims |
| **Why it is changing** | The current docs (blueprint v4.6.0, documentation v4.5.1, interface.md 24 July 2026 window) describe a system the audited codebase (`be39a52`) demonstrably does not match: unauthenticated control planes, dead-wired middleware, three mutually inconsistent RBAC orderings, no-op admin handlers, and 52 greenfield gaps presented as features |
| **Where it is changing** | All 12 documents (§3.1); heaviest: blueprint.md (~45 sections, Parts II–IX), interface.md, directory.md |
| **Who is affected** | Module authors, platform/SRE operators, framework maintainers, guild administrators, marketplace developers |
| **When it must land** | Phases 0–4 of the v5.0 rollout; documentation gates are release gates per the acceptance definition (§12.1) |
| **Consequence if not done** | Docs keep describing a non-existent system: engineers inherit three conflicting RBAC orderings, security behavior is misdocumented, spec-code drift compounds, and unmeasured "zero FP/FN" / "strongest possible security" claims persist |

### 1.3 Trigger / Origin

| Trigger Type | Description |
|---|---|
| `<new requirement / defect found / audit finding / standard update / structural drift / external change / other>` | **Audit finding** — three-pass evidence chain: (1) specification extraction against the two spec documents, (2) full codebase flaw audit, (3) independent re-verification that eliminated false positives (0 of 235 withdrawn) and surfaced 35 false negatives; consolidated universe of 270 verified findings, of which the flaw-fixable subset became 88 formal requests. **New requirement** — 31 raw upgradation requirements normalized into UR-01…UR-31. **Structural drift** — naming drift (MOD vs MODERATOR, Twill vs Twill, Release Manager vs Release Manager), CI directory misplaced under `apps/main/`, three inconsistent RBAC layer orderings. **External change** — Discord Components v2 platform evolution and the interface reference window drift. |

---

## 2. Request Classification

### 2.1 Change Type(s)

Select all that apply:

- [ ] **New document** — adding a document to the set
- [x] **Content update** — modifying substance of existing sections
- [x] **Structural update** — adding/removing/reordering sections or parts
- [x] **Convention enforcement** — aligning a document with set-wide standards (numbering, badges, headers, tables)
- [x] **Deprecation** — marking sections/documents as deprecated without removal (SDUI compromise, Admin-tier DM exception, Twill name)
- [x] **Removal** — deleting a document or sections from the set (`/src/modules` layout references, dead env keys, `src/core/commands` split)
- [x] **Errata** — factual corrections with no structural effect (naming drift, port drift, schema-drift corrections)
- [x] **Version/migration** — bumping document version across the set (4.6.0/4.5.1 → 5.0.0)

*(New document is ticked in effect via the `adr/` series and the three registered source docs — see §8.9–§8.12 and the impact matrix §7.)*

### 2.2 Scope Level

| Level | Selected | Notes |
|---|---|---|
| Single document | `<no>` | — |
| Multiple documents | `<no>` | — |
| Entire document set (set-wide) | `<yes>` | 12 documents, 121 source requests, 11 ADRs, ~45 blueprint sections |

### 2.3 Urgency

| Field | Value |
|---|---|
| **Urgency driver** | Phase 0 decision window: the official accent colour and title/attribution grammar must be decided pre-implementation, and the 11 ADRs block Phase 1 |
| **Hard deadline** | None |
| **Blocking relationships** | Blocks v5.0 release acceptance — the corpus re-baseline (versioning, badge re-audit, §45 matrix regeneration) is part of the program's definition of done |

---

# PART B — STATE TRANSITION

## 3. Current State Baseline (AS-IS)

### 3.1 Document Baseline Register

> ▶ NOTE: One row per document touched by this request. Duplicate rows as needed.

| # | Document | Path | Current Version | Last Updated | Current State Summary |
|---|---|---|---|---|---|
| 1 | blueprint.md | docs/blueprint.md | 4.6.0 — Production-Readiness Edition | — | Primary engineering reference: 48 numbered sections + Appendices A–C, Parts 0–IX, 22 illustrative cataloged modules; per-section status badges and Audit Register; honest-audit vocabulary (spec-vs-implementation gaps labeled) |
| 2 | documentation.md | docs/documentation.md | 4.5.1 | — | Legacy architecture reference (51 sections); records decisions the 4.6.0 blueprint inherits (SDUI scope decision, MDIS endpoints, three-tier marketplace visibility) |
| 3 | interface.md | docs/interface.md | — (24 July 2026 window) | — | End-user Discord-facing interface specification: `/dashboard`, edit-in-place navigation invariant, MDIS pages, component grammar |
| 4 | directory.md | docs/directory.md | — | — | Repository tree document; aspirational target layout; reserved directories honestly labeled; does not reflect audit commit `be39a52` |
| 5 | directive.md | docs/directive.md | — | — | Project directives and bans (prefix-command ban, enforcement layers, policy rules) |
| 6 | master-prompt.md | docs/master-prompt.md | — | — | Bot system identity and personality prompt |
| 7 | concept.md | docs/concept.md | — | — | Concept definitions and glossary of framework terms |
| 8 | change-log.md | docs/change-log.md | — | — | Version history ledger for the document set |
| 9 | adr/ (to be created) | docs/adr/ | — | — | Does not exist; cross-cutting decisions currently recorded in prose (e.g., ADR 002 referenced by §7.3) but no ADR series |
| 10 | Dumby_Upgradation_Request_v5.md | docs/ur/ (incoming) | 5.0-UR-1 | 18/09/2026 | The v5.0 upgrade program: 31 URs across 7 workstreams, 11 cross-cutting tensions, phased rollout, acceptance definition, glossary of 18 new terms |
| 11 | Dumby-Suite_Upgrade_Request.md | docs/ur/ (incoming) | @ `be39a52` | 18/09/2026 | 88 implementation-flaw correction requests (Groups A/B/C; 17 Critical, 31 High, 40 Medium) with tiers and reasoned greenfield exclusions |
| 12 | RBAC_Flaws_and_Requirements.md | docs/ur/ (incoming) | — | 18/09/2026 | 21 documented flaws of the current RBAC plus 2 upgradation requirements (Layer 6 pure-backend ranks; Layer 7 guild-side grants) |

### 3.2 Known Deficiencies / Gaps Being Addressed

| # | Deficiency | Observed In | Evidence / Reference |
|---|---|---|---|
| 1 | Live router bypasses the middleware chain — no real requests flow through the permission engine; commands gated by a thinner, older path | blueprint §17–§19, §21 | RBAC flaws list, Part 1 #1 |
| 2 | Standalone grants table never created (only `rbac_grants`); Power Engine "RBAC role-assign" is a no-op stub that appears to succeed | blueprint §21, §22.3 | RBAC flaws #2–#3 |
| 3 | OAuth2-to-RBAC bridge declared but not implemented; dashboard enforces its own rough rules | blueprint §16.4, §21 | RBAC flaws #4 |
| 4 | Three mutually inconsistent orderings of the seven RBAC layers across the two source specifications | documentation.md ↔ blueprint.md | RBAC flaws #6 |
| 5 | Naming drift: code canonical `MODERATOR`/`ADMINISTRATOR` vs spec text `MOD`/`ADMIN`; "Twill" vs "Twill"; "Release Manager" vs "Release Manager" | blueprint §21, §35, §15.9 | RBAC flaws #9; UR-03; UR-29 |
| 6 | Unauthenticated control planes: Power Engine/admin trust a self-declared `source`; `/internal/deploy` auto-approves; `INTERNAL_API_KEY` required by schema but never verified | blueprint §22, §15.8, §32 | Suite — five most important #3 |
| 7 | Path traversal in Swastik upload/deploy — executed PoC writes attacker-controlled `index.js` into a live module, bypassing promotion and audit | blueprint §15.8 | Suite UR-B-02 / UR-C-01 |
| 8 | Loader imports any file on the live volume — no hash/signature verification before `import()` | blueprint §15.9 | Suite UR-B-04 |
| 9 | `MiddlewarePipeline` and all 12 built-ins referenced only by their own files and tests — permissions, rate limits, admin-tier gate, maintenance mode not on the live path; unknown tiers fail open | blueprint §19 | Suite UR-A-03 / UR-C-09 |
| 10 | CLAI is a TCP-fingerprint REPL whose Power Engine commands are no-ops returning "OK"; 13 admin handlers are `async () => {}` returning `200 {ok:true}` | blueprint §22.6, §22.3 | Suite UR-A-02 / UR-C-12 / UR-C-25 |
| 11 | CI is inert — the entire `.github` directory lives under `apps/main/` where GitHub Actions can never read it | blueprint §40 | Suite UR-C-13 / UR-B-21 |
| 12 | Honesty gaps: SSH/CLAI not implemented, Components V2 ~20% implemented, Swastik ~30% — status badges must restate these after the fixes | blueprint audit register | v5.0 program current-state claims |
| 13 | Eleven cross-cutting design tensions presented as settled decisions without ADRs (embed ban reversal, DM exception, encryption posture, fifth pattern, `/src/modules` deletion, reload automation boundary, zero-FN, charter sunset, title grammar, accent colour, persona surface) | blueprint §4, §14.1, §17.10, §32.7, §35, §7.3 | v5.0 program §12 |
| 14 | Doc-set drift: `directory.md` specifies directories that do not exist; blueprint describes a `/src/modules` layout that UR-19 deletes; documentation.md still records the reversed SDUI compromise as current | directory.md, blueprint §7.3, documentation.md | v5.0 program; suite exclusions appendices |

---

## 4. Proposed State (TO-BE)

### 4.1 Target Outcome

A v5.0.0 corpus that describes the shipping system: the core Renderer with static Components v2 grammar and dynamic slots in Modes D/M/C; the buffer embed merged with maintenance-mode notices; RBAC rewritten as Layer 6 (pure backend rank function) over Layer 7 (guild-side grants with a hard, non-configurable override boundary); the `swastik` versioned authoring package; four tier volumes replacing `/src/modules`; the six-state license machine with paper-verifiable certificates; the machine-readable Compatibility Ledger; Global Data Emit as the fifth sanctioned cross-module pattern; Twill as the formal persona name; envelope encryption distinct from Argon2id hashing; all 88 flaw corrections reflected in the sections that specify the corrected behavior; every "exhaustive" list explicitly amended; 11 ADRs recording the tensions; the glossary extended by 18 terms; and every superlative claim restated in measured form.

### 4.2 Per-Document Target Versions

| # | Document | Current Version | Target Version | Nature of Change |
|---|---|---|---|---|
| 1 | blueprint.md | 4.6.0 | 5.0.0 | Full re-baseline: ~45 sections across Parts II–IX; audit register regenerated |
| 2 | documentation.md | 4.5.1 | 5.0.0 (archived) | Legacy banner, superseded-decision markers, frozen TOC, pointer to blueprint 5.0.0 |
| 3 | interface.md | — | 5.0.0 | Renderer/buffer/notice-frame adoption; Modes D/M/C; Core Command Surface reference set |
| 4 | directory.md | — | 5.0.0 | Tree rewritten to tier volumes, root `.github/`, new auth/safety files |
| 5 | directive.md | — | 5.0.0 | New bans (embeds, DM), ADR policy, CI hygiene directives |
| 6 | master-prompt.md | — | 5.0.0 | Identity renames, accent/title grammar once decided |
| 7 | concept.md | — | 5.0.0 | Glossary +18 program terms + RBAC Layer 6/7 vocabulary |
| 8 | change-log.md | — | continuous | v5.0.0 entry per document; per-request record discipline |
| 9 | adr/ | — (new) | 1.0 | 11 tension ADRs created in Phase 0 |
| 10 | Dumby_Upgradation_Request_v5.md | 5.0-UR-1 | 5.0-UR-1 (registered, frozen) | Registration and cross-reference only |
| 11 | Dumby-Suite_Upgrade_Request.md | @ `be39a52` | @ `be39a52` (registered, frozen) | Registration and cross-reference only |
| 12 | RBAC_Flaws_and_Requirements.md | — | 1.0 (registered, frozen) | Registration and cross-reference only |

### 4.3 Before / After Comparison

| Aspect | AS-IS | TO-BE | Delta Reason |
|---|---|---|---|
| Presentation layer | Per-module embed construction; 4.5.1 SDUI compromise documented as current | Core-owned Renderer; Components v2 only; embeds banned by four enforcement layers | UR-09/10/11/12 |
| RBAC model | Single, internally inconsistent seven-layer description across two docs | Layer 6 pure backend rank function + Layer 7 guild-side grants; hard override boundary | RBAC R1/R2 |
| Module storage | `/src/modules` static tree (ADR 002) | Four per-tier volumes + staging; blind discovery at bootstrap | UR-19, UR-05 |
| Authoring contract | Deep framework-path imports | Versioned standalone `swastik` package with scoped entry points | UR-04 |
| Licensing | Binary approval column | Six-state license machine; devId binding; tier-differentiated paper certificates | UR-06/23/08 |
| Personas | "Twill", unwired bindings | "Twill": bring-your-own-identity, single-server-bound | UR-16/29 |
| Control plane | Unauthenticated/self-declared trust; no-op handlers; fake audits | Credentialed surfaces; 501-not-implemented honesty; truthful outcome-based audit rows | UR-A-01/04, UR-B-06, UR-C-25 |
| CI | Inert (workflows under `apps/main/`) | Root `.github/`, SHA-pinned actions, secrets off command lines, Dependabot | UR-C-13/28, UR-B-21 |
| Superlative claims | "Zero FP/FN", "strongest possible security" as absolutes | Measured, CI-tracked detection rates; honesty invariants | UR-14/13 |

---

## 5. Rationale & Justification

### 5.1 Problem Statement

The documentation set no longer describes one system. The blueprint (v4.6.0) describes the intended architecture, the legacy reference (v4.5.1) records decisions the blueprint has already reversed, the interface reference describes a presentation system that does not exist yet, and the audited codebase at `be39a52` deviates from all three in 270 verified ways. An engineer reading the RBAC sections would reasonably conclude three different systems exist; an operator using the Power Engine/CLAI surfaces performs actions that report success while doing nothing; and the module author imports through framework internals the program is about to delete. The documentation is the contract for every one of those audiences, and the contract is wrong in a way that only a full re-baseline — not spot errata — can repair, because the changes touch ~45 sections, every cross-reference, the TOC, the audit register, and the version headers simultaneously.

### 5.2 Supporting Evidence

| # | Evidence | Source | Relevance |
|---|---|---|---|
| 1 | Three-pass evidence chain: 270 verified findings, 0 of 235 re-verification withdrawals, 35 false negatives surfaced; 88 flaw-fixable, 52 greenfield excluded | Dumby-Suite_Upgrade_Request.md, provenance | Establishes the correction universe this UR must reflect |
| 2 | Executed path-traversal PoC: `join('/data/swastik-staging', … + '../../../../tmp/pwned')` writes attacker-controlled `index.js` into a live module | Suite UR-B-02 | Security-class doc impact on §15.8 |
| 3 | 13 no-op admin handlers returning `200 {ok:true}` after audit writes; CLAI reports "OK" for no-op functions | Suite UR-C-25, UR-C-12 | Truthfulness impact on §22 |
| 4 | Three mutually inconsistent seven-layer orderings; "Set" and "OWNER" each defined two ways | RBAC_Flaws_and_Requirements.md #6–#8 | Necessitates the §21 rewrite |
| 5 | Components V2 ~20% implemented, Swastik ~30%, CLAI SSH transport absent | v5.0 program current-state sections | Status-badge re-audit scope |
| 6 | 31 raw requirements normalized with per-UR blueprint section impacts | Dumby_Upgradation_Request_v5.md (A1 `paste-1.md`) | Drives the structural/feature doc changes |

### 5.3 Cost of Inaction

Every new engineer onboarded onto the current docs inherits the three-RBAC-systems confusion and the naming drift; security-sensitive behavior (unauthenticated `/internal/deploy`, fail-open unknown tiers) remains documented as if enforced; the 4.5.1 SDUI compromise keeps contradicting the incoming embed ban; the `/src/modules` layout keeps being taught to module authors whose imports the v5.0 program will break; and each unrecorded tension risks being "resolved" differently by each implementer, recreating the drift this program exists to eliminate.

### 5.4 Alignment with Governing Principles / Directives

| # | Principle / Directive Reference | How This Request Aligns |
|---|---|---|
| 1 | P1 — Explicit over implicit (blueprint §3) | UR-25's manifest `visibility` field, UR-18's machine-readable ledger, and the explicit grant-scope ordering of R2 replace emergent/implicit properties with declared ones |
| 2 | P2 — Module sovereignty (blueprint §3) | R2 preserves it: grants target module commands only and never reach core commands; the override boundary list is exhaustive and non-configurable |
| 3 | Honest-audit doctrine (per-section status badges, audit register) | UR-14's measured detection rates, the 501-not-implemented honesty of UR-A-04/UR-C-25, and truthful audit outcomes (UR-B-06/UR-C-11) extend the doctrine from the code to the claims about the code |
| 4 | Fail fast, degrade gracefully (blueprint §3) | UR-C-18's fatal-path handler, UR-B-17's fail-fast `DEV_GUILD_ID`, and UR-C-09's fail-closed unknown tier correct documented behavior to match |
| 5 | One operational surface (blueprint §3) | UR-19's tier volumes and UR-C-13's single root `.github` restore the "one CI, one deployment surface" invariant |

---

## 6. Scope Definition

### 6.1 In Scope

| # | Item | Document(s) | Section(s) |
|---|---|---|---|
| 1 | All 31 v5.0 program URs (UR-01…UR-31) across workstreams A–G | blueprint.md (master), interface.md, directory.md, master-prompt.md, concept.md, change-log.md | §8.1.2 rows 1–31 |
| 2 | Both RBAC upgradation requirements (R1 Layer 6, R2 Layer 7) | blueprint.md, concept.md | §8.1.2 rows 32–33 |
| 3 | All 88 Suite correction requests (UR-A-01…A-30, UR-B-01…B-28, UR-C-01…C-30) | blueprint.md (master), directory.md, directive.md, interface.md | §8.1.2 rows 34–121 |
| 4 | 11 cross-cutting-tension ADRs | adr/ (new), blueprint.md | §8.9, §8.1.3 |
| 5 | Glossary extension: 18 program terms + RBAC vocabulary | concept.md | §8.7 |
| 6 | Legacy annotation and superseded-decision markers | documentation.md | §8.2 |
| 7 | Registration of the three source request documents as frozen program records | docs/ur/ | §8.10–§8.12 |
| 8 | TOC renumbering, cross-reference repair, status-badge re-audit, §45 matrix regeneration, change-log entries | all | §9 |

### 6.2 Out of Scope

| # | Item | Reason for Exclusion |
|---|---|---|
| 1 | The 52 deferred greenfield items (trusted-builder Phase-1 build subsystem, Ed25519 signing subsystem, heap-diff memory watcher, Core UI Compiler/static embed system, Dodo Payments integration buildout, full independent-persona system, marketplace multi-state licensing, GitHub release integration buildout, Release Manager release-manager 12-phase service, `defineManifest` package, event-bus advanced semantics, break-glass script, `worker_threads` isolation) | No code exists to document; suite scope rule (a)–(d) excludes new-capability work; tracked in each group's exclusions appendix and must not be smuggled into this UR |
| 2 | v5.0 UR-16 monetization wiring for Twill | Program keeps personas free-chartered; only the sunset condition is documented |
| 3 | Implementation of any request itself (code, migrations, CI) | This UR governs the documentation corpus only; requests are executed under their own programs |
| 4 | Rewriting documentation.md as a living reference | It remains the frozen legacy record with superseded-decision markers |

### 6.3 Assumptions & Constraints

| # | Type | Statement |
|---|---|---|
| 1 | `<constraint>` | All Suite line-number references were verified at commit `be39a52`; re-verify against working HEAD before treating any cited file/line as current |
| 2 | `<assumption>` | interface.md reflects the 24 July 2026 window; renderer/grammar decisions adopt A4 where A1 and A4 conflict |
| 3 | `<assumption>` | The A1 raw requirements' verbatim intent is preserved by the normalized UR-01…UR-31 |
| 4 | `<constraint>` | The accent colour (yellow vs blurple `#5865F2`) and title/attribution grammar must be decided in Phase 0 before interface.md/master-prompt.md rows referencing them can close |
| 5 | `<constraint>` | Documentation changes for each UR land in the same phase as that UR (per the rollout plan's continuous track), not in a single big-bang release |

---
# PART C — IMPACT & CHANGE SPECIFICATION

## 7. Affected Document Impact Matrix

> ▶ NOTE: This is the master table of the request. Every document listed in §3.1 must appear here, and every document here must appear in §3.1. One row per document.

| # | Document | Change Type | Sections Affected | Adds | Modifies | Deletes | Deprecates | Est. Magnitude | New Version | Depends On | Owner | Risk | Status |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 1 | blueprint.md | UPDATE / STRUCTURE / CONVENTION | ~45 sections, Parts II–IX + audit register | 15 | 80 | 6 | 5 | XL | 5.0.0 | — | Dumby Core Engineering | H | PENDING |
| 2 | documentation.md | DEPRECATE / ERRATA | preface + superseded sections | 1 | 5 | 0 | 3 | S | 5.0.0 (archived) | row 1 | Dumby Core Engineering | L | PENDING |
| 3 | interface.md | UPDATE / STRUCTURE | renderer, buffer, navigation, command surface | 8 | 12 | 0 | 1 | L | 5.0.0 | UR-09–12 (Phase 2) | Dumby Core Engineering | M | PENDING |
| 4 | directory.md | STRUCTURE / UPDATE | tree, CI layout, workspaces | 12 | 9 | 4 | 0 | M | 5.0.0 | UR-19, UR-B-11 | Dumby Core Engineering | M | PENDING |
| 5 | directive.md | NEW / CONVENTION | bans + policy sections | 9 | 2 | 0 | 1 | S | 5.0.0 | UR-12 ADR | Dumby Core Engineering | L | PENDING |
| 6 | master-prompt.md | UPDATE | identity, naming, accent/title tokens | 3 | 5 | 0 | 2 | S | 5.0.0 | Phase 0 decisions | Dumby Core Engineering | L | PENDING |
| 7 | concept.md | UPDATE | glossary + RBAC vocabulary | 22 | 4 | 0 | 2 | M | 5.0.0 | R1/R2, §16 glossary | Dumby Core Engineering | L | PENDING |
| 8 | change-log.md | UPDATE | v5.0.0 entries | 12 | 0 | 0 | 0 | S | continuous | all rows | Dumby Core Engineering | L | PENDING |
| 9 | adr/ (new) | NEW | 11 tension decisions | 11 | 0 | 0 | 0 | M | 1.0 | Phase 0 | Dumby Core Engineering | M | PENDING |
| 10 | Dumby_Upgradation_Request_v5.md | NEW (register) | registration entry | 1 | 0 | 0 | 0 | S | 5.0-UR-1 (frozen) | — | Dumby Core Engineering | L | PENDING |
| 11 | Dumby-Suite_Upgrade_Request.md | NEW (register) | registration entry | 1 | 0 | 0 | 0 | S | @ `be39a52` (frozen) | — | Dumby Core Engineering | L | PENDING |
| 12 | RBAC_Flaws_and_Requirements.md | NEW (register) | registration entry | 1 | 0 | 0 | 0 | S | 1.0 (frozen) | — | Dumby Core Engineering | L | PENDING |

**Column definitions:**

| Column | Allowed Values | Notes |
|---|---|---|
| Change Type | `NEW / UPDATE / STRUCTURE / CONVENTION / DEPRECATE / REMOVE / ERRATA` | from §2.1 |
| Est. Magnitude | `S < M < L < XL` | S = single-section touch-up; M = multi-section pass; L = subsystem rewrite; XL = whole-corpus re-baseline with TOC renumbering |
| Risk | `L / M / H` | low / medium / high blast radius across the set |
| Status | `PENDING / IN PROGRESS / DONE / BLOCKED` | per-document implementation status |

---

## 8. Detailed Change Specification

> ▶ NOTE: Duplicate the block below (§8.1–§8.3) once per affected document, in the same order as §7. Keep each block identical in structure. — In this filled instance: §8.1 (blueprint.md) carries the master section-level table containing **all 121 source requests, one row each, in source order** (rows 1–31: v5.0 program; 32–33: RBAC requirements; 34–121: Suite requests); §8.2–§8.12 carry each document's own derived changes. A request whose effects span documents appears once in the master table and is cross-referenced in the other documents' blocks.

### 8.1 — Document: blueprint.md (docs/blueprint.md)

#### 8.1.1 Document-Level Changes

| # | Aspect | Current | Proposed | Reason |
|---|---|---|---|---|
| 1 | Version header | 4.6.0 — Production-Readiness Edition | 5.0.0 — Consolidated Re-Baseline Edition | Program version bump; record in change-log.md |
| 2 | Section/part counts | 48 sections + Appendices A–C, Parts 0–IX | Recounted after structural additions (Renderer, Layer 6/7, tier volumes, ledger, Global Data Emit) | Structural updates change the counts |
| 3 | Table of contents | 4.6.0 ordering | Regenerated; all inbound §-refs re-verified (§9.2) | Renumbering fallout |
| 4 | Audit Register | 4.6.0 audit vocabulary (SPEC/IMPL/PARTIAL/NONE) | Re-audited against post-fix code: CLAI/SSH, Components V2, Swastik percentages restated | Honesty invariants (UR-13/14) |
| 5 | §45 compliance matrix | Manual table | Regenerated from the Compatibility Ledger (UR-18) | Single source of truth |

#### 8.1.2 Section-Level Changes

| # | Section Ref | Change Type | Current Text (excerpt) | Proposed Text (excerpt or directive) | Rationale | Backward Compatibility |
|---|---|---|---|---|---|---|
| 1 | UR-01 → §22.6, §22.7, §22.10, §22.3, §27, §43 | UPDATE | CLAI specified but unimplemented (ssh2 declared, not imported; `entry/ssh-clai.ts` absent) | Specify the functional console: ssh2 public-key transport, session model, Power Engine-parity command set; landing via UR-A-02/B-09/C-06 | Operator terminal is a production-readiness gap | — |
| 2 | UR-02 → §15.11, §15.8, §13.6, §41, §44 | NEW | No repository-triggered deployment | OIDC-validated portal repository binding; push → Swastik deployment with Deployment Records | WS-A: repo-to-running with no operator | — |
| 3 | UR-03 → §5–§48 global, §15.9, §33.3, §40, §43, audit register | CONVENTION | "Release Manager" naming throughout | Global rename to "Release Manager" + reverse GitHub sync (system changes committed back to the Git system-of-record) | Naming debt; single vocabulary | Renames only; behavior unchanged |
| 4 | UR-04 → §12, §11.15, §15.8, §10, §38, §44 | NEW | Deep framework-path imports in authoring | Versioned standalone `swastik` SDK package with scoped entry points | Contract stability; authoring isolation | Breaking for modules importing internals |
| 5 | UR-05 → §8.2, §15.9, §11.6, §17.4, §18.6, lint set, §2.3 | UPDATE | Registry seed + import allowlist | Blind discovery from tier volumes at bootstrap; no hardcoded module lists | Fully dynamic loading | Breaking; Phase 1 |
| 6 | UR-06 → §15.7, §15.8, §22.3, §13.7, §13.6, §44 | UPDATE | Binary approval column | Six-state license machine (pending → under-review → approved → suspended ⇄ restored → revoked) + review/suspend/restore/revoke endpoints and automated triggers | Real licensing regime | — |
| 7 | UR-07 → §14.1, §11.17, §18, §24.2, §25, §34 | NEW | "Exhaustive" four cross-module patterns | Fifth pattern: Global Data Emit — durable, schema'd public datasets with read/aggregate API | Amends §14.1's self-contradiction (tension 4) | — |
| 8 | UR-08 → §15.7, §13.2, §13.3, §22.8, §44 | NEW | No tier-differentiated licenses | Four tier-specific license classes + Credentials Service paper certificates with verifiable license IDs | Paper-verifiable authority | — |
| 9 | UR-09 → §10.2, §16.5, §20, §12, ESLint set, §17, §11.2 | NEW | No core renderer; per-module presentation | Core renderer: static Components v2 grammar (frames, dividers, title/subtitle, footer), dynamic slots (accent, banner, module identity, content), Modes D/M/C | WS-B foundation | Reverses 4.5.1 SDUI via ADR |
| 10 | UR-10 → §19.2, §28.6, §28.1, §17.11, §20, §26.5 | NEW | No buffer system | Instant buffer embed on every interaction, edited into final render or the formal notice frame (failure/maintenance/unknown-command merged, reason codes + trace correlation ID) | Perceived responsiveness; honest failure UX | — |
| 11 | UR-11 → §17.2, §20.1–20.6, §11.15, §12, §37 | UPDATE | Imperative payload construction by authors | Authors declare command schemas; renderer derives presentation, components, flows | Renderer-only authoring | Breaking for module authors |
| 12 | UR-12 → §4, §17.2, §17.11, §20, §16.4, §13.8, ADR log | CONVENTION | 4.5.1 SDUI compromise documented as current | Ban classic EmbedBuilder/MessageEmbed via four enforcement layers, mirroring the prefix-command ban | Tension 1; needs superseding ADR + migration window | Migration window required |
| 13 | UR-13 → §10.2, §19, §28.2, §28.5, §29, §33.5, §37, new subsystems | UPDATE | Five-vector leak model specified, partially implemented | Extend containment to new surfaces; leak-regression CI suites; verify continuously | Measured "strongest possible" security | Continuous track |
| 14 | UR-14 → §13.8, §13.9, §16.4, §21, §37, §43 | CONVENTION | "Zero false positives/negatives" absolute claims | Measured, tunable, ground-truthed detection surfaces; CI-tracked rates driven to floor | Tension 7: literal zero is non-verifiable | — |
| 15 | UR-15 → §13.8, §13.9, §15.8, §12.3.1, §16.4, §32.5, CI tooling | NEW | Pre-compiled JS upload accepted | Raw TypeScript only; isolated trusted builder (ephemeral, network-restricted) compiles, lints, SBOM, build attestations | Gate 1 of module trust | Breaking upload contract |
| 16 | UR-16 → §35, §6.6, §18.5.1, §7.5, §22.3, §32, §44, §7.6.1 | UPDATE | Twill personas, unwired bindings | Twill: guild admins supply their own bot token/application; Dumby hosts the instance; one persona = one server; free charter with explicit sunset condition | Tension 8 | — |
| 17 | UR-17 → §22.3, §22.8, §22.6, §22.10, §44 | NEW | No credential-creation control domain | PE domain `credentials.issue/rotate/revoke` for licenses, CLAI keypairs, developer tokens | WS-C governance | — |
| 18 | UR-18 → §14.3, §45, §15.9, §33.2, §40, §24.4 | NEW | No compatibility registry | Machine-readable Compatibility Ledger of every cross-boundary contract version window; gates core releases and module deployments; §45 regenerated from it | Cross-boundary contract enforcement | Phase 0 skeleton |
| 19 | UR-19 → §5.4, §7.3, §15.8, §15.9, §41, §13.3, CI/CD | STRUCTURE | `/src/modules` + ADR 002 layout | Four per-tier volumes (admin/core/standard/marketplace) + staging; tier-at-rest enforced; first-party modules seeded through promotion; `/src/modules` deleted | Tension 5; supersedes §7.3 | Breaking infra migration |
| 20 | UR-20 → §44, §15.11, §16.2, §16.3, §32.3, UR-18 ledger | NEW | Ad-hoc REST surface | Versioned, OpenAPI-documented API families: catalog, developer self-service, governance, installs, Twill, webhooks | Future dev portal / web3 site | — |
| 21 | UR-21 → §17.10, §13.6, §21.2, §22, §35, §16 | DEPRECATE | Admin-tier DM exception (§17.10) | Complete DM prohibition for the main bot; Twill instances decide their own DM behavior; §28.6 operator lockout-avoidance re-verified | Tension 2 | — |
| 22 | UR-22 → §32.7, §32.1, §22.8, §35, §16, §23, §27, §41 | UPDATE | Argon2id one-way hashing only | Add envelope encryption (root key → DEKs → per-record AES-256-GCM) for recoverable sensitive values; keep Argon2id rule | Tension 3: justified only for in-process-readable credentials | — |
| 23 | UR-23 → §11.2, §15.7, §15.8, §22.3, §44 | NEW | No devId-license association | Structural binding: manifest `devId` must equal license subject; suspension of either blocks promotions; queryable end-to-end | Governance integrity | — |
| 24 | UR-24 → §22.2–§22.5, §27.5, §44 | UPDATE | Power Engine act-only catalog | Observe/read functions, policy-tuning controls, SSE streaming, frontend-quality API bar | WS-G | — |
| 25 | UR-25 → §11.2, §11.17, §13.3, §16.2–§16.5, §44 | NEW | Visibility emergent from tier (Table 16-C) | First-class manifest `visibility` enum (public/unlisted/private) validated at all three manifest validation points; co-constrained with tier and the hardcode toggle | P1 explicit over implicit | — |
| 26 | UR-26 → §13.6, §15.8, §15.9, §21.5, §27.3 | NEW | No deployment rate limits | Token-bucket + cooldown per developer/repository/module/global; queueing; anomaly coupling; Power Engine-tunable windows | Deployment abuse control | — |
| 27 | UR-27 → §15.4, §15.8–§15.10, §13.7, §33.2, §29 | UPDATE | Promotion without verified reload | Promotion → reload signal → verified health-check → auto-rollback loop; no gate bypass | Tension 6: automation boundary restated | — |
| 28 | UR-28 → §4, §17.10, §13.8, §16.4, UR-14 corpora | CONVENTION | Prefix-command ban, partial enforcement | Audit and record all four enforcement layers' coverage; extend to new ingestion surfaces (GitHub triggers, TS compilation, renderer) | Ban completeness | — |
| 29 | UR-29 → §6.6, §35, §22.3, §27, runbooks | CONVENTION | "Twill" naming | Formal rename to "Twill" across code, docs, control domains, telemetry | Naming debt | Ships with UR-16 |
| 30 | UR-30 → §11.2, §11.17, §13.3, §15.3, §17.4 | NEW | No hardcode toggle | `hardcoded: true` + `hardcodeGuildId` permanently pins a module to its guild; requires private visibility; guild-scoped command registration | Guild-scoped modules | — |
| 31 | UR-31 → §16.5, §23.3, §23.5, §25.3, §26.3, §44, §37 | NEW | Poll-based sync windows | Per-guild Redis pub/sub change events; bidirectional instant MDIS ↔ backend sync | WS-G | — |
| 32 | R1 (RBAC) → §21 Layer 6, §11.15, §17.2 | UPDATE | Three inconsistent orderings; MOD/ADMIN drift; OWNER double-defined; fixed six-rank ladder with writable ranks | Layer 6 as a pure backend function: six ranks OWNER > ADMIN > MOD > HELPER > MEMBER > RESTRICTED, evaluated (never written) from live Discord state; ADMIN/MOD/HELPER are fixed permission-bit bundles; RESTRICTED is the automatic floor; default requirement MEMBER; Layer 5+6 declarations combine conjunctively (AND) | RBAC flaws #6–#9, #16 | — |
| 33 | R2 (RBAC) → §21 Layer 7, §13.6, §16.4 | NEW | Standalone grants table never created; exceptions only via roles | Layer 7 guild-side grants: types permit/blacklist/whitelist/cooldown/rate-limit; scopes role > group > set, most-specific wins; evaluated above Layers 4–6, module commands only; exhaustive non-configurable override boundary (Layers 1–3, bot-capability check, RESTRICTED floor); resolved fresh per interaction | RBAC flaws #2, #11, #18, #19 | — |
| 34 | UR-A-01 → §22.2, §22.3 | UPDATE | Power Engine/admin trust self-declared `source`; binds all interfaces | Bearer-credential auth hook, operator allow-list, server-derived source, loopback bind | Critical/Security | — |
| 35 | UR-A-02 → §22.6 | UPDATE | CLAI TCP-fingerprint REPL | Real SSH auth: `ssh-clai.ts` with ssh2 public-key-only auth against `clai_operators` | Critical/Security | — |
| 36 | UR-A-03 → §17.3, §19 | UPDATE | Ad-hoc dispatch; middleware dead; unknown tiers fail open | Unify dispatch on `src/core/commands`; bootstrap router + all 12 built-in middlewares; fail closed on unknown tier; context menus dispatched | Critical/Dead-wiring | Depends on UR-C-09 wiring |
| 37 | UR-A-04 → §22.3 | UPDATE | Power Engine stubs fake success | Shared Power Engine action registry used by Power Engine/admin/CLAI; stubs return 501, never fake audits | Critical/Broken | — |
| 38 | UR-A-05 → §22, §27 | UPDATE | Audit rows write `allowed` before execution; `queryAuditLog` crashes on drift | Truthful audit schema: outcomes written after handler completion; corrected query columns | High/Broken | — |
| 39 | UR-A-06 → §22.8 | UPDATE | Credentials Service unauthenticated | Bootstrap token (timing-safe) on issue/revoke; rate limit; audit all issuances | High/Security | — |
| 40 | UR-A-07 → §21.2 | UPDATE | Layer 2 blacklist unimplemented | `BlacklistLookup` backed by `blocked_users` with TTL cache + Power Engine write endpoints | High/Dead-wiring | — |
| 41 | UR-A-08 → §21.3–§21.7 | UPDATE | RBAC persistence missing | Two-step role resolver; knex repository over the 4 RBAC tables; default-group seeding | High/Dead-wiring | Prereq for R1/R2 accuracy |
| 42 | UR-A-09 → §21 (Table 21-A) | UPDATE | Layer order deviates from spec | Insert fail-closed module-availability Layer 3 and grant-override Layer 7 per Table 21-A | High/Broken | Aligns with R2 |
| 43 | UR-A-10 → §13.7, §22 | UPDATE | `suspendCommand` broken insert | Working fleet-wide kill switch: nullable `guildId`, partial unique index, disabled overrides enforced on dispatch | High/Broken | — |
| 44 | UR-A-11 → §17.4, §17.6 | UPDATE | Command-change machinery unwired | Knex change-queue repository; BCCM services constructed; collision/ceiling hooks and reserved commands fixed | High/Dead-wiring | — |
| 45 | UR-A-12 → §35 | ERRATA | `guild_persona_bindings` lacks `moduleSlug` | Add `moduleSlug` to PK; add `discordApplicationId` to identities per spec relation | High/Misconfiguration | — |
| 46 | UR-A-13 → §35 | UPDATE | Personas not in bootstrap | `PERSONA_ID` env; binding service constructed; "occupied by another persona" gate enforced at dispatch | High/Dead-wiring | — |
| 47 | UR-A-14 → §27 | UPDATE | OTel initialized nowhere | Call `initTracing` at Stage 04; TraceMiddleware opens real spans | High/Dead-wiring | — |
| 48 | UR-A-15 → §21.5 | UPDATE | Rate limits not atomic | Lua-script dual-window limiter (10/user, 100/guild), atomic check-and-increment | Medium/Security | — |
| 49 | UR-A-16 → §28.6 | UPDATE | Maintenance flag not propagated | Redis mirror + poller; exit recovery re-runs module readiness | Medium/Dead-wiring | — |
| 50 | UR-A-17 → §22.3 | UPDATE | Pseudo-actions write unread `system_state` rows | Every key paired with a consumer or the domain removed; keys centralized | Medium/Broken | — |
| 51 | UR-A-18 → §15.7, §22.3 | UPDATE | `suspendDeveloper` silently no-ops | Zod validation (400/404); optional force-disable of live modules | Medium/Broken | — |
| 52 | UR-A-19 → §22.6 | UPDATE | CLAI sessions unguarded | Idle timeout, typed confirmation, per-IP lockout, optional TOTP, operator issuance endpoint | Medium/Security | — |
| 53 | UR-A-20 → §29 | UPDATE | Scheduler never constructed | Scheduler with Redis locks at Stage 08; cron consumers registered | Medium/Dead-wiring | — |
| 54 | UR-A-21 → §31 | UPDATE | Analytics middleware unwired | Buffered, pseudonymized collection flushed off the command path; HMAC pseudonyms with monthly salt rotation | Medium/Dead-wiring | — |
| 55 | UR-A-22 → §27 | UPDATE | Redaction paths shallow | Deep-wildcard Pino redact paths (nested tokens, webhookUrl, signingKey, apiKey) | Medium/Security | — |
| 56 | UR-A-23 → §18 | UPDATE | eventsCatalog unenforced | Payload schemas; runtime membership/payload checks; upload-time consistency report; prefix-prohibition lint | Medium/Dead-wiring | — |
| 57 | UR-A-24 → §11.2 | ERRATA | `releaseStatus` wrong domain; triad unenforced | Enum `private\|public`; superRefine cross-field rules for `hardcoded`/`hardcodeGuildId`/`releaseStatus` | Medium/Misconfiguration | — |
| 58 | UR-A-25 → §11.2, §13.3 | UPDATE | No branded GuildId; visibility triad unwired | Branded snowflake type; hardcoded-guild scoping; public/private listing filters | Medium/Dead-wiring | — |
| 59 | UR-A-26 → §22.8, §23 | ERRATA | Credentials port hardcoded 8086 | `CREDENTIALS_PORT` env key, used by the entrypoint | Medium/Misconfiguration | — |
| 60 | UR-A-27 → §5.6, §23 | UPDATE | Privileged intents accepted silently | Whitelist; reject `MessageContent`/`GuildMembers`/`GuildPresences` with ConfigurationError | Medium/Security | — |
| 61 | UR-A-28 → §5.6, §26 | ERRATA | Shard options never passed to Client | Parse `SHARD_RANGE`; pass `shards`/`shardCount` when `SHARD_COUNT > 1`; fail fast on bad range | Medium/Misconfiguration | — |
| 62 | UR-A-29 → §41 | ERRATA | Deploy-manifest/env drift | Correct statement-timeout key; verify-env in CI; rolling-update strategy verified; kubeconform | Medium/Misconfiguration | — |
| 63 | UR-A-30 → §5, §38 | UPDATE | Unused dependencies linger | Remove `cron-parser`; keep ssh2/jose only if consuming URs land; knip CI check | Medium/Misconfiguration | — |
| 64 | UR-B-01 → §15.8 | UPDATE | `/internal/deploy` auto-approves unknown developers | Delete auto-approve insert; 403 for unknown/pending devs; owner approval workflow | Critical/Security | — |
| 65 | UR-B-02 → §15.8 | UPDATE | Upload/deploy bodies unvalidated; paths built from raw `version` | Zod schemas (slug/version regex); `assertPathInside` containment on all Swastik filesystem joins | Critical/Security | — |
| 66 | UR-B-03 → §22, §32 | UPDATE | Internal surfaces expose 0.0.0.0; key never checked | Timing-safe `x-internal-api-key` preHandler; configurable bind host; loopback compose mapping | Critical/Security | — |
| 67 | UR-B-04 → §15.8, §32 | UPDATE | Loader imports any file on the live volume | Provenance columns on `builds`; Ed25519 verification; refuse load on failure; signed descriptor | Critical/Security | — |
| 68 | UR-B-05 → §22.8 | UPDATE | Developer identity self-declared tokens | `credentials` table; argon2-hashed devId tokens keyed by keyId; password registration; pending status | Critical/Security | — |
| 69 | UR-B-06 → §22.3 | UPDATE | Power Engine trusts body `source`; audit lies | Network-derived trust + operator token; audit outcome written after handler runs | Critical/Security | — |
| 70 | UR-B-07 → §22.3 | ERRATA | Four schema-drift SQL failures | Fix `suspendCommand` insert, `signing_keys` revoke, `queryAuditLog` columns, audit writer; contract test | High/Broken | — |
| 71 | UR-B-08 → §22.3 | UPDATE | Marker-only / no-op Power Engine domains | Implement adapters over existing subsystems; remove routeless backends; honest 501; boot-time catalog assertion | High/Broken | — |
| 72 | UR-B-09 → §22.6 | UPDATE | CLAI fingerprint recital | Token-verified or ssh2 public-key auth; production disables fingerprint REPL; real `pep` dispatch | High/Security | — |
| 73 | UR-B-10 → §19 | UPDATE | Pipeline not in CommandRouter | Pipeline built in bootstrap with canonical order; Redis rate-limiter/cooldown stores; owner BotDM exception | High/Dead-wiring | — |
| 74 | UR-B-11 → §17 | STRUCTURE | Boot-time delete-then-reregister of commands | Enqueue guild changes; merge `src/core/commands` into `src/commands`, resolving ADR 002 | High/Dead-wiring | Tree change (§8.4) |
| 75 | UR-B-12 → §15.8, §15.9 | UPDATE | Promotion non-atomic, unverifiable | `renameSync` swap under Redis lock; selftest gate; reload-failure rollback; unified status vocabulary; retention pruning | High/Broken | — |
| 76 | UR-B-13 → §15.9 | UPDATE | No reload signal to bot | Bot-side `/internal/reload`; HotSwapService runs queue pause → drain → respawn per module | High/Dead-wiring | — |
| 77 | UR-B-14 → §13.7 | UPDATE | `module.suspend` not two-phase | Immediately write Discord permission overrides denying `@everyone`, then enqueue batched deregistration | High/Dead-wiring | — |
| 78 | UR-B-15 → §11.2 | ERRATA | Visibility triad unconstrained | Discriminated union on `hardcoded`; required `private\|public` releaseStatus; branded GuildId; marketplace co-constraint | High/Misconfiguration | — |
| 79 | UR-B-16 → §8, §41 | UPDATE | `worker.ts` runs full bot bootstrap | Split `bootstrapWorker()` skipping Discord login and API/health servers; runtime role assert | High/Broken | — |
| 80 | UR-B-17 → §23 | ERRATA | `DEV_GUILD_ID` optional, silently disables admin tier | Required regex-validated snowflake; fail fast at Stage 02 | High/Misconfiguration | — |
| 81 | UR-B-18 → §44 | UPDATE | Webhooks accepted unverified | Provider-specific HMAC verification; 5-minute replay window; Redis idempotency; Stage-14 refusal of unverified webhooks | High/Security | — |
| 82 | UR-B-19 → §32, §44 | ERRATA | `hmacSha256` computes plain SHA-256 | Replace suffix-MAC with `createHmac`; RFC 4231 test vectors as regression proof | High/Misconfiguration | — |
| 83 | UR-B-20 → §11.2, §42 | UPDATE | `depends` accepts bare tokens | Schema `{token, version}` pins; range satisfaction evaluator; fatal Stage-11 startup error; frameworkCompat check at load | High/Misconfiguration | — |
| 84 | UR-B-21 → §40 | ERRATA | CI workflows under `apps/main/.github/` — inert | Workflows at repo root; real publish step; integration test as definition of done | High/Misconfiguration | Tree change (§8.4) |
| 85 | UR-B-22 → §15.8, §21.5 | UPDATE | Swastik Fastify app unthrottled | `@fastify/rate-limit` (30/min; tighter register bucket) | Medium/Security | — |
| 86 | UR-B-23 → §41 | UPDATE | Readiness probe blind to module volume | Probe checks live-volume access/contents/required modules; 503 without restart | Medium/Broken | — |
| 87 | UR-B-24 → §23, §41 | ERRATA | Six configmap keys silently dropped | Sync configmap with env schema; CI check diffing configmap keys against `ENV_KEYS` | Medium/Misconfiguration | — |
| 88 | UR-B-25 → §44 | ERRATA | `/api/info` version hardcoded | Version generated from package.json at build; module counts, shard range, guild count, runtime versions | Medium/Misconfiguration | — |
| 89 | UR-B-26 → §15.8 | UPDATE | Single-`indexSource` string upload | Tarball via multipart (64 MiB limit); zip-slip-safe extraction via `assertPathInside` | Medium/Broken | — |
| 90 | UR-B-27 → §16 | ERRATA | `marketplace_listings` drift; no visibility write path | `developerId` aligned with devId string; `PATCH /swastik/modules/:slug/visibility` writes listing rows | Medium/Broken | — |
| 91 | UR-B-28 → §23, §24 | ERRATA | TLS options missing; dead required keys | `DATABASE_SSL`/`REDIS_TLS`; wire or drop `ENCRYPTION_KEY_*`/`JWT_SIGNING_KEY` | Medium/Misconfiguration | — |
| 92 | UR-C-01 → §15.8, §32 | UPDATE | Request-derived path components unvalidated | `safeJoin` validating slug/version patterns with containment assertion on every path | Critical/Security | — |
| 93 | UR-C-02 → §15.8, §32 | UPDATE | Swastik `/internal/*` unauthenticated | Constant-time `INTERNAL_API_KEY` preHandler; 401 + audit row; CLI sends the header | Critical/Security | — |
| 94 | UR-C-03 → §15.7 | UPDATE | No module ownership; auto-approver exists | `modules` ownership table; 403 on non-owner uploads; DB constraint against internal approvals | Critical/Security | — |
| 95 | UR-C-04 → §22.8 | UPDATE | Credentials Service broken and unauthenticated | New `credentials` table with purpose enum; bearer-auth issue/verify; rate limit + bodyLimit; env-driven port | Critical/Security | — |
| 96 | UR-C-05 → §22.8, §32 | UPDATE | devIds stored in plaintext; differentiated failures | `devIdHash` column; verification via Credentials Service; identical 401 bodies; no fragments in logs | Critical/Security | — |
| 97 | UR-C-06 → §22.6 | UPDATE | CLAI fake TCP REPL | ssh2 public-key-only server; synchronous auth-state flag; connection/byte limits; ANSI escape stripping | Critical/Security | — |
| 98 | UR-C-07 → §15.9 | UPDATE | No verification before import; ESM cache stale | Hash verify against `builds` with quarantine; cache-busted import URLs; manifest/directory match assertion | Critical/Security | — |
| 99 | UR-C-08 → §22.3 | UPDATE | Power Engine trusts declared sources | Service-to-service credentials; `source` demoted to metadata; loopback-default admin bind | High/Security | — |
| 100 | UR-C-09 → §19 | UPDATE | Pipeline and built-ins dead in production | Pipeline constructed at Stage 09 with all built-ins in priority order; DumbyError-aware root catch; structural wiring test | High/Dead-wiring | — |
| 101 | UR-C-10 → §15.7, §22.3 | UPDATE | Suspension is a relabeled decline | State split (`suspendedAt/By/Reason`); pending builds rejected; live modules unloaded; force-disable propagates | High/Broken | — |
| 102 | UR-C-11 → §22.3 | UPDATE | Revoke route filters a nonexistent column; always 500s; metadata dead | Fix keying; 404 on zero rows; audit `allowed` only after handler success; real metadata serialized | High/Misconfiguration | — |
| 103 | UR-C-12 → §22.6 | UPDATE | CLAI Power Engine commands are no-ops returning "OK" | Real route invocation with `service_to_service` credential; correlation IDs joinable across CLAI and Power Engine audit rows; honest rendering | High/Broken | — |
| 104 | UR-C-13 → §40 | ERRATA | `.github` under `apps/main/` — CI never runs | `git mv` to repo root; five workflows live; templates and CODEOWNERS applied | High/Misconfiguration | Tree change (§8.4) |
| 105 | UR-C-14 → §15.8 | UPDATE | Symlink promotion races | Temp-symlink + `renameSync` under Redis lock; post-flip containment assertion; `lstatSync` for dangling rollback links | Medium/Broken | — |
| 106 | UR-C-15 → §15.8 | UPDATE | Staging volume unbounded | Per-developer and per-slug build/byte quotas (429/413); content-hash dedupe; total volume bound | Medium/Security | — |
| 107 | UR-C-16 → §18 | UPDATE | One throwing listener aborts the rest | Default subscriber isolation + fire-and-forget emit; `emitSync` for ordering-critical flows; guard test | Medium/Broken | — |
| 108 | UR-C-17 → §28 | ERRATA | Breaker counts consecutive failures, 10 s reset | Rolling window (20, ≥50%, 30 s half-open); `CircuitOpenError` mapped to the typed taxonomy | Medium/Misconfiguration | — |
| 109 | UR-C-18 → §8, §9 | UPDATE | `uncaughtException` logs to console and exits | Re-registered fatal handler: fatal log with correlation ID → `system.fatalError` → graceful shutdown (≤15 s) → exit 1; ESLint `no-console` | Medium/Broken | — |
| 110 | UR-C-19 → §18, §33 | UPDATE | EventRouter and lag monitor never started | Lag shedding with protected domains; `gatewayEventsShedTotal` increment sites; per-module isolated gateway handlers | Medium/Dead-wiring | — |
| 111 | UR-C-20 → §20 | UPDATE | Buttons/selects/modals/autocomplete silently dropped | Component/autocomplete dispatch through InteractionRegistry; minted customIds; invoker re-check; Redis idempotency; 800 ms autocomplete budget | Medium/Dead-wiring | interface.md UX (§8.3) |
| 112 | UR-C-21 → §35 | UPDATE | Binding service mock-only; gate absent | Real repository; `(guildId, moduleSlug)` binding; "occupied by another persona" ephemeral rejection; locked bind | Medium/Dead-wiring | — |
| 113 | UR-C-22 → §15.9 | UPDATE | Hot-swap service constructed nowhere; bot never re-imports | Bot-side `/internal/reload` consumer; unload → re-import → ready → frozen-registry replace → deployAll; auto-revert on failure | Medium/Dead-wiring | — |
| 114 | UR-C-23 → §8, §41 | UPDATE | Entrypoints auto-start on import; worker header lies | Main-module guard for side effects; honest truncated worker bootstrap or corrected header | Medium/Broken | — |
| 115 | UR-C-24 → §13, §15 | UPDATE | Unload does no teardown | Cache namespace flush + per-module queue workers on unload; teardown failures never abort the loop | Medium/Dead-wiring | — |
| 116 | UR-C-25 → §22.3 | UPDATE | 13 handlers are `async () => {}` returning `200 {ok:true}` | Real implementation where the primitive exists, else honest `501 NOT_IMPLEMENTED`; no-stub test walks every route | Medium/Broken | — |
| 117 | UR-C-26 → §11.2 | UPDATE | Manifest contract loose: single-string upload, optional identity, free-form category | Required devId/buildId at upload; 18-case co-constraint truth table; five-value category enum; events[] ⊆ eventsCatalog check at Stage 11 | Medium/Misconfiguration | — |
| 118 | UR-C-27 → §23 | ERRATA | Declared-only env keys; port drift | `CREDENTIALS_SERVICE_PORT` (default 8086); every key read by code or documented operator-only; `INTERNAL_API_KEY` ≥ 32 chars in production | Medium/Misconfiguration | — |
| 119 | UR-C-28 → §40 | CONVENTION | Secrets on shell command lines; mutable action tags | Step-level `env:`/stdin secrets; mktemp kubeconfig with trap; SHA-pinned actions; root `dependabot.yml`; `check-workflows.mjs` in CI | Medium/Security | directive.md policy (§8.5) |
| 120 | UR-C-29 → §28, §17 | UPDATE | 429/`Retry-After` ignored; RetryPolicy has no consumer | Wire RetryPolicy into HttpClient honoring 429 with jitter; per-priority drain queue; 13-minute follow-up watchdog (`INTERACTION_TIMEOUT`/`FOLLOWUP_ALARM_MS`) | Medium/Dead-wiring | — |
| 121 | UR-C-30 → §22.6 | UPDATE | Operator tables migrated but idle; no lifecycle | TOTP after publickey for destructive domains; `POST /admin/operators` + seed for register/rotate/revoke; 10-minute idle disconnect; per-IP auth limiter; typed confirmation | Medium/Dead-wiring | — |

#### 8.1.3 Open Questions for This Document

| # | Question | Raised By | Resolution |
|---|---|---|---|
| 1 | Official accent colour: A1 yellow vs A4 blurple `#5865F2` — one value must be picked pre-implementation | v5.0 program §12 (tension 10) | OPEN — Phase 0 decision, ADR required |
| 2 | Title & attribution grammar: A1 vs A4 discrepancy on dashboard titles/attribution — A4 adopted, confirm before Phase 2 | v5.0 program §12 (tension 9) | OPEN — Phase 0 decision |
| 3 | Embed-ban reversal of the 4.5.1 SDUI compromise — ratify superseding ADR and migration window | v5.0 program §12 (tension 1) | OPEN — ADR |
| 4 | DM exception removal — re-verify §28.6 operator lockout-avoidance after UR-21 | v5.0 program §12 (tension 2) | OPEN — ADR |
| 5 | Encryption-layer addition — confirm envelope encryption limited to in-process-readable credentials | v5.0 program §12 (tension 3) | OPEN — ADR |
| 6 | Fifth cross-module pattern — amend §14.1's "exhaustive" four-pattern list explicitly | v5.0 program §12 (tension 4) | OPEN — ADR |
| 7 | `/src/modules` deletion supersedes §7.3/ADR 002 — migration runbook as numbered release gate | v5.0 program §12 (tension 5) | OPEN — ADR |
| 8 | Automatic-reload boundary — diff-based auto-approval for updates vs human gate for first promotion | v5.0 program §12 (tension 6) | OPEN — ADR |
| 9 | Zero FP/FN literalism — asymptote reframed as measured-and-driven-to-floor | v5.0 program §12 (tension 7) | OPEN — ADR |
| 10 | Twill free-charter sunset — explicit end condition for the free default | v5.0 program §12 (tension 8) | OPEN — ADR |
| 11 | Persona creation surface — MDIS-only wording superseded by the Twill registration API | v5.0 program §12 (tension 11) | OPEN — ADR |
| 12 | RBAC sovereignty question — guild vs module-author sovereignty over a command's Discord-bit gate | RBAC flaws #20 | OPEN — unresolved by sources; carried as a documented open question |

### 8.2 — Document: documentation.md (docs/documentation.md)

#### 8.2.1 Document-Level Changes

| # | Aspect | Current | Proposed | Reason |
|---|---|---|---|---|
| 1 | Version header | 4.5.1 | 5.0.0 (archived) | Frozen legacy record |
| 2 | Preface | No archival status | Legacy banner: superseded by blueprint.md 5.0.0; retained for inherited decisions | Prevents it being read as current |

#### 8.2.2 Section-Level Changes

| # | Section Ref | Change Type | Current Text (excerpt) | Proposed Text (excerpt or directive) | Rationale | Backward Compatibility |
|---|---|---|---|---|---|---|
| 1 | SDUI scope decision | DEPRECATE | SDUI compromise recorded as current | Mark "superseded by UR-12 embed ban (blueprint 5.0.0 §4)" | Tension 1 | — |
| 2 | §14.4 marketplace visibility | DEPRECATE | Three-tier visibility concept | Mark "superseded by UR-25 manifest visibility (blueprint 5.0.0 §11.2)" | UR-25 | — |
| 3 | MDIS endpoints | ERRATA | Legacy endpoint record | Cross-pointer to blueprint §44 families (UR-20) | Drift | — |
| 4 | RBAC ordering | DEPRECATE | One of three inconsistent orderings | Mark "superseded by blueprint 5.0.0 §21 (R1/R2)" | RBAC flaw #6 | — |
| 5 | TOC | CONVENTION | 51-section legacy TOC | Freeze; add "do not extend" note | Archived record | — |

#### 8.2.3 Open Questions for This Document

| # | Question | Raised By | Resolution |
|---|---|---|---|
| 1 | — | — | — (no open questions; archival only) |

### 8.3 — Document: interface.md (docs/interface.md)

#### 8.3.1 Document-Level Changes

| # | Aspect | Current | Proposed | Reason |
|---|---|---|---|---|
| 1 | Version | unversioned (24 July 2026 window) | 5.0.0 | Renderer adoption |
| 2 | Presentation model | Per-surface component guidance | Renderer grammar: static Components v2 frame (frames, dividers, title/subtitle, footer) with dynamic slots (accent, banner, module identity, content); Modes D/M/C | UR-09 |

#### 8.3.2 Section-Level Changes

| # | Section Ref | Change Type | Current Text (excerpt) | Proposed Text (excerpt or directive) | Rationale | Backward Compatibility |
|---|---|---|---|---|---|---|
| 1 | UR-09 → renderer sections | NEW | No renderer | All surfaces renderer-issued; module pages declare schemas (UR-11); three modes D/M/C | WS-B | — |
| 2 | UR-10 → interaction lifecycle | NEW | No buffer behavior | Buffer embed sent instantly on every interaction, edited into the final render or the formal notice frame; composes with the edit-in-place navigation invariant | Perceived responsiveness | — |
| 3 | UR-11 → authoring guidance | UPDATE | Imperative component construction | Authors declare command schemas; renderer derives presentation, components, flows | Renderer-only authoring | Breaking for authors |
| 4 | UR-12 → component guidance | CONVENTION | Embed usage permitted | Remove embed patterns; Components v2 only; migration window per ADR | Tension 1 | — |
| 5 | UR-09 → title & attribution | CONVENTION | A1/A4 discrepancy | Adopt A4 grammar once confirmed (open question, Phase 0) | Tension 9 | — |
| 6 | UR-09 → accent usage | CONVENTION | No single accent | One official accent colour value once decided (open question, Phase 0) | Tension 10 | — |
| 7 | UR-11 → reference set | NEW | — | Core Command Surface documented as the renderer's reference implementation set (dashboard, health, browse, queue, persona, permit, modules + hello-world) | UR-11 | — |
| 8 | UR-C-20 → component UX | UPDATE | Buttons/selects/modals/autocomplete undefined | Dispatch behavior, invoker re-check (403-equivalent silent reject), idempotency on retries, 800 ms autocomplete budget with cached/partial fallback | Suite UR-C-20 | — |
| 9 | UR-C-29 → failure UX | UPDATE | Silent failure of auto-deferred interactions | 13-minute follow-up watchdog guarantees a logged overdue event; buffer-then-notice flow | Suite UR-C-29 | — |
| 10 | UR-12 → formal notices | NEW | Ad-hoc error messages | Formal notice frame with reason codes and trace correlation ID (merged failure/maintenance/unknown-command presentation) | UR-10 | — |

#### 8.3.3 Open Questions for This Document

| # | Question | Raised By | Resolution |
|---|---|---|---|
| 1 | Accent colour final value | v5.0 program §12 (tension 10) | OPEN — Phase 0 |
| 2 | Title & attribution grammar confirmation | v5.0 program §12 (tension 9) | OPEN — Phase 0 |
| 3 | Persona creation surface wording (MDIS vs registration API) | v5.0 program §12 (tension 11) | OPEN — ADR |

### 8.4 — Document: directory.md (docs/directory.md)

#### 8.4.1 Document-Level Changes

| # | Aspect | Current | Proposed | Reason |
|---|---|---|---|---|
| 1 | Tree root | `/src/modules` static tree (ADR 002) | Four tier volumes (admin/core/standard/marketplace) + staging; `/src/modules` deleted | UR-19 |
| 2 | CI location | `apps/main/.github/` | `.github/` at repository root | UR-C-13, UR-B-21 |

#### 8.4.2 Section-Level Changes

| # | Section Ref | Change Type | Current Text (excerpt) | Proposed Text (excerpt or directive) | Rationale | Backward Compatibility |
|---|---|---|---|---|---|---|
| 1 | UR-19 → module storage | STRUCTURE | `/src/modules` + registry seed | Tier volumes + staging; first-party modules seeded through promotion | Tension 5 | Breaking |
| 2 | UR-B-11 → command tree | STRUCTURE | `src/core/commands/` split | Merged into `src/commands/`, resolving ADR 002 | Suite UR-B-11 | — |
| 3 | UR-A-02 / UR-C-06 → entries | NEW | `entry/ssh-clai.ts` absent | Add `src/entry/ssh-clai.ts` (ssh2 server) | CLAI honesty | — |
| 4 | UR-C-01 / UR-B-02 → shared utils | NEW | No path-containment utility | Add shared `safeJoin`/`assertPathInside` filesystem guard + zod schemas in `manifest.schema.ts` | Traversal fix | — |
| 5 | UR-C-28 → CI scripts | NEW | No workflow checks | Add `scripts/check-workflows.mjs` (SHA-pin + secrets-in-run assertion); root `.github/dependabot.yml` | CI hygiene | — |
| 6 | UR-B-24 → config scripts | NEW | No configmap check | Add CI check diffing configmap keys against `ENV_KEYS` | Config drift | — |
| 7 | UR-B-16 / UR-C-23 → worker | UPDATE | `src/entry/worker.ts` full bootstrap | Truncated worker bootstrap (`bootstrapWorker()`); main-module guards on auto-start entrypoints | Suite UR-B-16/C-23 | — |
| 8 | UR-04 → workspaces | NEW | No authoring package | `swastik` package workspace (types, schemas, scoped entry points) | Authoring contract | — |
| 9 | UR-03 → tools | CONVENTION | `tools/release_manager/` (Release Manager placeholder) | Renamed Release Manager with reverse GitHub sync note | Naming debt | — |
| 10 | UR-B-26 → upload path | UPDATE | Single-`indexSource` string | Tarball upload path (multipart, 64 MiB, zip-slip-safe) | Suite UR-B-26 | — |
| 11 | UR-C-13 / UR-B-21 → `.github` | STRUCTURE | Workflows under `apps/main/` | Five workflows + CODEOWNERS + templates at root | CI liveness | — |
| 12 | Reserved directories | ERRATA | Aspirational dirs labeled reserved | Reconcile against post-`be39a52` HEAD; reserved-only labels retained honestly | Drift | — |

#### 8.4.3 Open Questions for This Document

| # | Question | Raised By | Resolution |
|---|---|---|---|
| 1 | Final tier-volume mount names pending UR-19 ADR | v5.0 program | OPEN — ADR (tension 5) |

### 8.5 — Document: directive.md (docs/directive.md)

#### 8.5.1 Document-Level Changes

| # | Aspect | Current | Proposed | Reason |
|---|---|---|---|---|
| 1 | Ban registry | Prefix-command ban only | Extended ban registry with ADR linkage | UR-12/21/28 |

#### 8.5.2 Section-Level Changes

| # | Section Ref | Change Type | Current Text (excerpt) | Proposed Text (excerpt or directive) | Rationale | Backward Compatibility |
|---|---|---|---|---|---|---|
| 1 | UR-12 → bans | CONVENTION | Standard embeds permitted | Ban classic EmbedBuilder/MessageEmbed via four enforcement layers; ADR superseding the 4.5.1 SDUI compromise; migration window | Tension 1 | — |
| 2 | UR-21 → bans | DEPRECATE | DM exception allowed for Admin tier | Total DM prohibition for the main bot; Twill instances self-govern | Tension 2 | — |
| 3 | UR-28 → bans | CONVENTION | Prefix ban partially enforced | Record all four enforcement layers with coverage audit; extend to new ingestion surfaces | Ban completeness | — |
| 4 | UR-C-18 → coding rules | CONVENTION | Pino is the sole logger (unenforced) | ESLint `no-console` with logger exemption, mirroring `no-direct-process-env` | Suite UR-C-18 | — |
| 5 | UR-C-28 → CI policy | CONVENTION | No pinning policy | SHA-pin every action (40-hex); no `${{ secrets.* }}` inside `run:` blocks; Dependabot (github-actions + npm, weekly) | Suite UR-C-28 | — |
| 6 | UR-A-23 → lint set | CONVENTION | eventsCatalog documented, unchecked | Prefix-prohibition + catalog-membership lint | Suite UR-A-23 | — |
| 7 | UR-C-27 → config policy | CONVENTION | Declared-only env keys tolerated | No env key without a consumer or an operator-runbook entry | Suite UR-C-27 | — |
| 8 | Greenfield exclusions | CONVENTION | — | Record the 52 deferred greenfield items as explicitly out-of-scope with revisit tracking; they must not be smuggled into correction URs | Suite exclusions appendices | — |
| 9 | UR-18 → release policy | NEW | Manual compatibility notes | Compatibility Ledger gates core releases and module deployments; §45 regenerated from it | UR-18 | — |

#### 8.5.3 Open Questions for This Document

| # | Question | Raised By | Resolution |
|---|---|---|---|
| 1 | — | — | — (no open questions) |

### 8.6 — Document: master-prompt.md (docs/master-prompt.md)

#### 8.6.1 Document-Level Changes

| # | Aspect | Current | Proposed | Reason |
|---|---|---|---|---|
| 1 | Version | unversioned | 5.0.0 | Identity refresh |
| 2 | System identity references | "Twill", "Release Manager" | "Twill", "Release Manager" | UR-29, UR-03 |

#### 8.6.2 Section-Level Changes

| # | Section Ref | Change Type | Current Text (excerpt) | Proposed Text (excerpt or directive) | Rationale | Backward Compatibility |
|---|---|---|---|---|---|---|
| 1 | UR-29 → persona references | CONVENTION | "Twill" | "Twill" (bring-your-own-identity, single-server) | Naming debt | — |
| 2 | UR-03 → service references | CONVENTION | "Release Manager" | "Release Manager" (with reverse GitHub sync) | Naming debt | — |
| 3 | UR-10 → responsiveness | UPDATE | No buffer behavior | Instant buffer-then-render behavior; formal notices with reason codes as the personality's failure voice | UR-10 | — |
| 4 | UR-09 → title & attribution grammar | CONVENTION | Unspecified | A4 grammar once confirmed (Phase 0) | Tension 9 | — |
| 5 | UR-09 → accent | CONVENTION | Unspecified | Single official accent token once decided (Phase 0) | Tension 10 | — |

#### 8.6.3 Open Questions for This Document

| # | Question | Raised By | Resolution |
|---|---|---|---|
| 1 | Accent colour and title grammar decisions (shared with §8.1.3 #1–2) | v5.0 program §12 | OPEN — Phase 0 |

### 8.7 — Document: concept.md (docs/concept.md)

#### 8.7.1 Document-Level Changes

| # | Aspect | Current | Proposed | Reason |
|---|---|---|---|---|
| 1 | Version | unversioned | 5.0.0 | Glossary extension |
| 2 | RBAC vocabulary | Absent/ambiguous | Layer 6/7 vocabulary added; conflicting definitions amended | R1/R2 |

#### 8.7.2 Section-Level Changes

| # | Section Ref | Change Type | Current Text (excerpt) | Proposed Text (excerpt or directive) | Rationale | Backward Compatibility |
|---|---|---|---|---|---|---|
| 1 | §16 glossary program terms | NEW | — | Add 18 terms: Renderer · Buffer (buffer embed) · Formal notice frame · Mode D/M/C · Edit-in-place navigation · Core Command Surface · `swastik` package · Global Data Emit · Twill · Release Manager · License state machine · Tier volumes · Compatibility Ledger · Trusted builder (Gate 1 runner) · Visibility · Hardcoded module · Deployment Record · Envelope encryption | v5.0 program §16 | — |
| 2 | RBAC vocabulary | NEW | — | Add: Layer 6 (pure backend rank function, evaluated never written) · Layer 7 (guild-side grants) · grant scopes (role > group > set, most-specific wins) · RESTRICTED floor · six-rank ladder OWNER > ADMIN > MOD > HELPER > MEMBER > RESTRICTED · override boundary | R1/R2 | — |
| 3 | Conflicting definitions | ERRATA | "Set" defined two ways; "OWNER" defined two ways | "Set" = a set of groups (Layer 7 scope); "OWNER" = the guild's ownership account, distinct from the Layer 1 bot-owner override (`BOT_OWNER_IDS`), which is not a rank | RBAC flaws #7–#8 | — |
| 4 | Naming entries | CONVENTION | `MOD`/`ADMIN` variants | Canonical names `MODERATOR`/`ADMINISTRATOR`; "Twill" entry marked superseded by "Twill" | RBAC flaw #9; UR-29 | — |

#### 8.7.3 Open Questions for This Document

| # | Question | Raised By | Resolution |
|---|---|---|---|
| 1 | — | — | — (no open questions) |

### 8.8 — Document: change-log.md (docs/change-log.md)

#### 8.8.1 Document-Level Changes

| # | Aspect | Current | Proposed | Reason |
|---|---|---|---|---|
| 1 | Version | current | continuous | Ledger discipline |

#### 8.8.2 Section-Level Changes

| # | Section Ref | Change Type | Current Text (excerpt) | Proposed Text (excerpt or directive) | Rationale | Backward Compatibility |
|---|---|---|---|---|---|---|
| 1 | v5.0.0 entry | NEW | — | One entry per re-baselined document (12 rows), each citing this UR ID and its source request rows | UR bookkeeping | — |
| 2 | Per-request discipline | CONVENTION | — | Every subsequent per-UR doc change gets its own change-log line keyed to the request ID | Traceability | — |
| 3 | archival entries | NEW | — | Record documentation.md archival and the three source-doc registrations | §8.2, §8.10–§8.12 | — |

#### 8.8.3 Open Questions for This Document

| # | Question | Raised By | Resolution |
|---|---|---|---|
| 1 | — | — | — (no open questions) |

### 8.9 — Document: adr/ (docs/adr/, new)

#### 8.9.1 Document-Level Changes

| # | Aspect | Current | Proposed | Reason |
|---|---|---|---|---|
| 1 | Existence | No ADR series (ADR 002 referenced in prose only) | `docs/adr/` created with numbered records | 11 tensions require recorded decisions |

#### 8.9.2 Section-Level Changes

| # | Section Ref | Change Type | Current Text (excerpt) | Proposed Text (excerpt or directive) | Rationale | Backward Compatibility |
|---|---|---|---|---|---|---|
| 1 | ADR — embed ban | NEW | — | Reverse the 4.5.1 SDUI compromise; four enforcement layers; migration window | Tension 1 | — |
| 2 | ADR — DM prohibition | NEW | — | Remove the Admin-tier DM exception; lockout-avoidance re-verification | Tension 2 | — |
| 3 | ADR — envelope encryption | NEW | — | Second at-rest scheme justified only for in-process-readable credentials | Tension 3 | — |
| 4 | ADR — fifth pattern | NEW | — | Amend §14.1's "exhaustive" list to include Global Data Emit | Tension 4 | — |
| 5 | ADR — tier volumes | NEW | — | Supersede §7.3/ADR 002; `/src/modules` deletion; migration runbook as release gate | Tension 5 | — |
| 6 | ADR — reload automation | NEW | — | Diff-based auto-approval for updates; human gate for first promotion | Tension 6 | — |
| 7 | ADR — detection honesty | NEW | — | Zero FP/FN as measured, CI-tracked rates, not absolutes | Tension 7 | — |
| 8 | ADR — Twill charter | NEW | — | Free-charter default with explicit sunset condition | Tension 8 | — |
| 9 | ADR — title & attribution grammar | NEW | — | Adopt A4 grammar | Tension 9 | — |
| 10 | ADR — accent colour | NEW | — | One official value (yellow vs blurple `#5865F2`) | Tension 10 | — |
| 11 | ADR — persona surface | NEW | — | MDIS-only wording superseded by the Twill registration API | Tension 11 | — |

#### 8.9.3 Open Questions for This Document

| # | Question | Raised By | Resolution |
|---|---|---|---|
| 1 | All 11 ADR decisions pending Phase 0 | v5.0 program §12 | OPEN — Phase 0 |

### 8.10 — Document: Dumby_Upgradation_Request_v5.md (docs/ur/, registered)

#### 8.10.1 Document-Level Changes

| # | Aspect | Current | Proposed | Reason |
|---|---|---|---|---|
| 1 | Registration | Incoming file | Registered frozen program record at 5.0-UR-1; cross-referenced from blueprint 5.0.0 and change-log | Provenance |

#### 8.10.2 Section-Level Changes

| # | Section Ref | Change Type | Current Text (excerpt) | Proposed Text (excerpt or directive) | Rationale | Backward Compatibility |
|---|---|---|---|---|---|---|
| 1 | Registration entry | NEW | — | No section-level changes; frozen as the authoritative record of UR-01…UR-31, tensions, rollout, and acceptance | Provenance | — |

#### 8.10.3 Open Questions for This Document

| # | Question | Raised By | Resolution |
|---|---|---|---|
| 1 | — | — | — (frozen record) |

### 8.11 — Document: Dumby-Suite_Upgrade_Request.md (docs/ur/, registered)

#### 8.11.1 Document-Level Changes

| # | Aspect | Current | Proposed | Reason |
|---|---|---|---|---|
| 1 | Registration | Incoming file | Registered frozen program record @ `be39a52`; cross-referenced from blueprint 5.0.0 and change-log | Provenance |

#### 8.11.2 Section-Level Changes

| # | Section Ref | Change Type | Current Text (excerpt) | Proposed Text (excerpt or directive) | Rationale | Backward Compatibility |
|---|---|---|---|---|---|---|
| 1 | Registration entry | NEW | — | No section-level changes; frozen as the authoritative record of the 88 requests, tiers, and exclusions | Provenance | — |

#### 8.11.3 Open Questions for This Document

| # | Question | Raised By | Resolution |
|---|---|---|---|
| 1 | Line-number references must be re-verified against working HEAD before implementation | Suite footer | OPEN — standing constraint (§6.3 #1) |

### 8.12 — Document: RBAC_Flaws_and_Requirements.md (docs/ur/, registered)

#### 8.12.1 Document-Level Changes

| # | Aspect | Current | Proposed | Reason |
|---|---|---|---|---|
| 1 | Registration | Incoming file | Registered frozen program record at 1.0; cross-referenced from blueprint §21 and concept.md | Provenance |

#### 8.12.2 Section-Level Changes

| # | Section Ref | Change Type | Current Text (excerpt) | Proposed Text (excerpt or directive) | Rationale | Backward Compatibility |
|---|---|---|---|---|---|---|
| 1 | Registration entry | NEW | — | No section-level changes; frozen as the authoritative record of the 21 flaws and requirements R1/R2 | Provenance | — |

#### 8.12.3 Open Questions for This Document

| # | Question | Raised By | Resolution |
|---|---|---|---|
| 1 | Sovereignty question (guild vs module author over a command's Discord-bit gate) remains unsettled by the sources | RBAC flaws #20 | OPEN — documented as an open question in blueprint §21 (see §8.1.3 #12) |

---

## 9. Cross-Document Consistency Requirements

### 9.1 Set-Wide Consistency Checklist

> ▶ NOTE: Applies whenever section numbers, headings, or shared terms change anywhere in the set.

| # | Consistency Item | Required? | Affected Documents | Status |
|---|---|---|---|---|
| 1 | Table of contents updated & re-numbered | `[x]` | blueprint.md | PENDING |
| 2 | Inbound cross-references updated (§-refs) | `[x]` | all | PENDING |
| 3 | Concept index / Rosetta-style lookup tables updated | `[x]` | blueprint.md §0.3, §47 | PENDING |
| 4 | Glossary entries added / revised | `[x]` | concept.md (+18 terms, RBAC vocabulary) | PENDING |
| 5 | Status badges refreshed per section | `[x]` | blueprint.md (audit register re-audit) | PENDING |
| 6 | Version headers & document metadata blocks updated | `[x]` | all (→5.0.0) | PENDING |
| 7 | Change-log entries recorded per document | `[x]` | change-log.md | PENDING |
| 8 | Audit / compliance matrices updated | `[x]` | blueprint.md §45 (regenerated from the Compatibility Ledger) | PENDING |
| 9 | Naming, numbering & formatting standards applied | `[x]` | all (MODERATOR/ADMINISTRATOR, Twill, Release Manager; visible render of §21 layer order) | PENDING |
| 10 | Superseded-decision markers applied to the legacy reference | `[x]` | documentation.md | PENDING |

### 9.2 Cross-Reference Update Register

| # | Source Document | Source Section | References Target | Target Section | Action Needed |
|---|---|---|---|---|---|
| 1 | documentation.md | SDUI decision | blueprint.md | §4 / §17.11 (UR-12) | add superseded marker |
| 2 | documentation.md | §14.4 visibility | blueprint.md | §11.2 / §16 (UR-25) | add superseded marker |
| 3 | blueprint.md | §7.3 tree | directory.md | tier volumes (UR-19) | rewrite + ADR |
| 4 | blueprint.md | §21 RBAC | concept.md | Layer 6/7 vocabulary (R1/R2) | add entries |
| 5 | interface.md | renderer/navigation | blueprint.md | §16.5 / §20 (UR-09/10) | cross-link |
| 6 | blueprint.md | §15.8/§15.9 | directory.md | CI/tree entries (UR-C-13/28) | cross-link |
| 7 | master-prompt.md | identity tokens | blueprint.md | §1–§3, §6.6 (UR-03/29) | cross-link |
| 8 | blueprint.md | §45 matrix | Compatibility Ledger | UR-18 | regenerate |
| 9 | blueprint.md | audit register | Suite requests | 88 rows | re-audit statuses |
| 10 | change-log.md | v5.0.0 entries | all 12 documents | this UR | add entries |

---

## 10. Dependencies & Sequencing

### 10.1 Dependency Register

| # | Depends On | Type | Blocking Behavior | Notes |
|---|---|---|---|---|
| 1 | Phase 0 ADRs (accent, title grammar, 11 tensions) | `<ur>` | hard | Block interface.md/master-prompt.md closure and Phase 1 |
| 2 | Renderer (UR-09/10/11/12) | `<ur>` | hard | Critical path; interface.md re-write follows Phase 2 |
| 3 | Swastik source-compilation (UR-15) + `swastik` package (UR-04) | `<ur>` | hard | Critical path; UR-15 depends on UR-04 finalization |
| 4 | RBAC implementation (R1/R2 + UR-A-08/09) | `<ur>` | hard | blueprint §21 rewrite reflects the shipped layer model |
| 5 | Tier volumes (UR-19) | `<ur>` | hard | directory.md tree final only after |
| 6 | Suite Tier 1 (immediate fixes) | `<task>` | hard | Nine requests (path traversal, deploy auto-approve, internal key, CI move, SHA-pinning, bug fixes) precede Tier 3 wiring docs |
| 7 | Suite Tier 2 (trust) | `<task>` | hard | Loader verification, ownership, devId hashing, Credentials repair, truthful audits |
| 8 | Suite Tier 3 (wiring) | `<task>` | hard | Router + middleware wiring is the prerequisite for RBAC/blacklist/queue/persona wiring docs |
| 9 | Suite Tier 4 (correctness tail) | `<task>` | soft | Enum/schema/config drift corrections and remaining Mediums |

### 10.2 Execution Order

| Phase | Step | Documents / Items | Must Complete Before | Owner |
|---|---|---|---|---|
| 0 | Decision & groundwork | ADRs for the 11 tensions; Compatibility Ledger stood up empty-but-enforced; `swastik` package repo created; accent + title grammar decided | Phase 1 | Dumby Core Engineering |
| 1 | Module contract changes (breaking RC) | UR-15, UR-05, UR-19, UR-04 finalization, UR-27, UR-26 — doc rows in §8.1.2 #4–5, 15, 19, 26–27 | Phase 2 | Dumby Core Engineering |
| 2 | The Renderer (user-facing breaking release) | UR-09, UR-10, UR-11, UR-12, UR-28 — doc rows #9–12, 28 + §8.3 | Phase 3 | Dumby Core Engineering |
| 3 | Governance & identity | UR-06, UR-23, UR-08, UR-17, UR-02, UR-03, UR-25, UR-30 — doc rows #2–3, 6, 8, 17, 23, 25, 30 | Phase 4 | Dumby Core Engineering |
| 4 | Platform surfaces & polish | UR-16, UR-29, UR-01, UR-20, UR-24, UR-31, UR-14, UR-21/UR-22 completion audits — doc rows #1, 13–14, 16, 20–21, 24, 29, 31 | Closure | Dumby Core Engineering |
| — | Continuous track (all phases) | UR-13, UR-18 ledger diffs, UR-14 corpus growth, per-UR blueprint doc updates; Suite tiers 1→4 reflected as they land | Closure | Dumby Core Engineering |

---
# PART D — GOVERNANCE

## 11. Risk Assessment & Rollback

### 11.1 Risk Register

| # | Risk | Likelihood | Impact | Severity | Mitigation | Owner | Status |
|---|---|---|---|---|---|---|---|
| 1 | Embed-ban reversal (UR-12) contradicts the documented 4.5.1 SDUI compromise, confusing authors mid-migration | M | M | M | Superseding ADR + migration window before enforcement; documentation.md superseded markers | Dumby Core Engineering | OPEN |
| 2 | DM exception removal (UR-21) re-introduces operator lockout risk during incidents | L | H | M | Re-verify §28.6 lockout-avoidance path; CLAI/Power Engine surfaces documented as the operator path | Dumby Core Engineering | OPEN |
| 3 | Envelope encryption (UR-22) creates a second at-rest scheme that operators misunderstand | M | M | M | ADR limiting it to in-process-readable credentials; glossary entry distinguishing it from Argon2id | Dumby Core Engineering | OPEN |
| 4 | §14.1's "exhaustive" four-pattern claim becomes self-contradictory if the fifth pattern is not explicitly amended | H | M | M | Amend the list in the same edit that documents UR-07 | Dumby Core Engineering | OPEN |
| 5 | `/src/modules` deletion (UR-19) breaks documented layouts and author muscle memory | M | H | H | Numbered migration runbook as a release gate; directory.md rewritten in the same phase | Dumby Core Engineering | OPEN |
| 6 | Auto-reload (UR-27) blurs the human review boundary | M | M | M | Restate the automation boundary unambiguously (diff-based auto-approval for updates; human gate for first promotion) | Dumby Core Engineering | OPEN |
| 7 | "Zero FP/FN" claims remain unverifiable and dishonest if merely renamed | M | M | M | Reframe as measured, CI-tracked rates; QA check greps for unmeasured superlatives (§12.2) | Dumby Core Engineering | OPEN |
| 8 | Twill free charter (UR-16) accrues unbounded free usage | M | M | M | ADR with explicit sunset condition | Dumby Core Engineering | OPEN |
| 9 | Title/attribution grammar and accent colour shipped inconsistently across docs | M | L | L | Phase 0 decision before Phase 2; single ADR of record | Dumby Core Engineering | OPEN |
| 10 | RBAC layer order documented one way and implemented another (the exact drift this program fixes) | M | H | H | R1/R2 as the single normative text; Table 21-A alignment (UR-A-09); consistency check in §12.2 | Dumby Core Engineering | OPEN |
| 11 | Persona surface documented as MDIS-only while the Twill registration API is the real surface | M | L | L | ADR superseding the A4 wording; interface.md cross-links both | Dumby Core Engineering | OPEN |
| 12 | Scope explosion: 121 requests across 12 documents overwhelm the review capacity | H | M | H | Phase-by-phase landing (§10.2), per-request change-log discipline, master table as the single traceability index | Dumby Core Engineering | OPEN |
| 13 | Cited line numbers/files drift between audit commit `be39a52` and implementation HEAD | H | M | M | Standing constraint: re-verify before treating any cited location as current (§6.3 #1) | Dumby Core Engineering | OPEN |
| 14 | Partial implementation leaves status badges claiming behavior that does not exist yet | M | H | H | Badge re-audit only at phase exits; audit register regenerated at closure | Dumby Core Engineering | OPEN |

### 11.2 Rollback Plan

| # | Trigger for Rollback | Rollback Action | Data / Files Affected | Owner |
|---|---|---|---|---|
| 1 | A phase-exit verification fails (§12.2) | Revert the phase's doc commits via the tagged baseline (`docs-v4.6.0` tag per document) | docs/ tree | Dumby Core Engineering |
| 2 | An ADR is reversed after its doc rows landed | Revert the affected §8 rows; record the reversal as a new ADR + change-log entry | blueprint.md, adr/, change-log.md | Dumby Core Engineering |
| 3 | Per-request row found factually wrong post-merge | Row-level revert keyed to the request ID in change-log.md; master table re-issued | blueprint.md §8.1.2 row | Dumby Core Engineering |
| 4 | Full program abort | Restore all 12 documents from the pre-re-baseline tag; archive this UR as DEFERRED with a revisit date | entire docs/ set | Document Set Owner |

---

## 12. Verification & Acceptance

### 12.1 Acceptance Criteria (Definition of Done)

- [ ] Every one of the 121 requests' own acceptance criteria pass under its source program (the test plans of record)
- [ ] Corpus re-baselined: blueprint re-versioned to 5.0.0, status badges re-audited against post-fix code, the §12 decisions recorded as ADRs (11 of 11), §45 matrix regenerated from the Compatibility Ledger
- [ ] The two end-to-end narratives run clean and are documented: the developer story (repo bind → push → deploy → reload → dashboard → paper license, zero operator intervention) and the operator story (PE/CLAI → observe → tune → suspend → notice → restore, all audited)
- [ ] The bans hold under adversarial testing and the docs describe the enforcement layers: prefix simulation, DM dispatch, standard embeds, precompiled artifacts, cross-module imports all fail closed at designated layers
- [ ] Honesty invariants hold: no claim of "zero false positives/negatives" or "strongest possible security" appears in the shipped docs without its measured form
- [ ] All rows in the Impact Matrix (§7) report status `DONE`
- [ ] Consistency Checklist (§9.1) fully ticked

### 12.2 QA Verification Checklist

| # | Check | Method | Verifier | Result |
|---|---|---|---|---|
| 1 | TOC and §-number integrity after restructuring | TOC link check; inbound-reference lint over the whole corpus | `<verifier_role>` | `<PENDING>` |
| 2 | Status-badge audit: every badge restated against the post-fix implementation state (CLAI/SSH, Components V2, Swastik percentages) | Audit-register cross-check vs code at HEAD | `<verifier_role>` | `<PENDING>` |
| 3 | No unmeasured superlatives remain | Corpus-wide search for "zero false", "strongest possible" and review of each hit's measured form | `<verifier_role>` | `<PENDING>` |
| 4 | RBAC single-source check: exactly one normative layer ordering; naming uses MODERATOR/ADMINISTRATOR; OWNER/Set defined once | concept.md + blueprint §21 cross-check | `<verifier_role>` | `<PENDING>` |
| 5 | Traceability: each of the 121 requests maps to exactly one master-table row (§8.1.2) and appears in Appendix D's reconciliation | Row-count + ID audit | `<verifier_role>` | `<PENDING>` |
| 6 | Glossary completeness: all 18 program terms + RBAC vocabulary present and cross-linked | concept.md review | `<verifier_role>` | `<PENDING>` |
| 7 | Superseded-decision markers present in documentation.md for every reversed 4.5.1 decision | documentation.md review | `<verifier_role>` | `<PENDING>` |
| 8 | Change-log contains one v5.0.0 entry per document (12) | change-log.md audit | `<verifier_role>` | `<PENDING>` |

### 12.3 Sign-Off Matrix

| Role | Name | Decision | Date | Remarks |
|---|---|---|---|---|
| Requester | Dumby Core Engineering — Quixotic Mnemonics | `<PENDING>` | — | — |
| Document Owner(s) | Dumby Core Engineering | `<PENDING>` | — | — |
| Technical Reviewer | — | `<PENDING>` | — | — |
| Final Approver | — | `<PENDING>` | — | — |

---

## 13. Approval & Decision Record

| Field | Value |
|---|---|
| **Decision** | `<PENDING — DRAFT>` |
| **Decision Date** | — |
| **Conditions (if any)** | Phase 0 decisions required before interface.md / master-prompt.md rows can close: accent colour (yellow vs blurple `#5865F2`), title/attribution grammar, and the 11 tension ADRs |
| **Revisit Date (if deferred)** | — |
| **Recorded By** | — |
| **Recorded In Change-Log** | `[ ]` |

---

# PART E — EXECUTION

## 14. Implementation Plan

### 14.1 Task Breakdown

| # | Task | Document | Depends On | Owner | Effort | Due | Status |
|---|---|---|---|---|---|---|---|
| 1 | Stand up adr/; draft the 11 tension ADRs; decide accent colour + title grammar | adr/, §8.1.3 | none | Dumby Core Engineering | M | Phase 0 | PENDING |
| 2 | Compatibility Ledger skeleton entry (UR-18 doc row) | blueprint.md §45 | task 1 | Dumby Core Engineering | S | Phase 0 | PENDING |
| 3 | Module-contract doc rows: UR-04, UR-05, UR-15, UR-19, UR-26, UR-27 | blueprint.md §8.1.2 rows 4–5, 15, 19, 26–27; directory.md | task 1 | Dumby Core Engineering | L | Phase 1 | PENDING |
| 4 | Renderer doc rows: UR-09–UR-12, UR-28; interface.md rewrite | blueprint.md rows 9–12, 28; interface.md | task 3 | Dumby Core Engineering | L | Phase 2 | PENDING |
| 5 | Governance doc rows: UR-02, UR-03, UR-06, UR-08, UR-17, UR-23, UR-25, UR-30 | blueprint.md; master-prompt.md | task 4 | Dumby Core Engineering | L | Phase 3 | PENDING |
| 6 | Platform/polish doc rows: UR-01, UR-14, UR-16, UR-20, UR-21, UR-22, UR-24, UR-29, UR-31 | blueprint.md; concept.md; master-prompt.md | task 5 | Dumby Core Engineering | L | Phase 4 | PENDING |
| 7 | RBAC §21 rewrite (R1/R2) + concept.md vocabulary | blueprint.md rows 32–33; concept.md | task 5 | Dumby Core Engineering | M | Phase 4 | PENDING |
| 8 | Suite Tier 1 doc reflections (9 requests) | blueprint.md rows 64–66, 84, 92–93, 104, 119; directory.md | none | Dumby Core Engineering | M | Tier 1 | PENDING |
| 9 | Suite Tier 2 doc reflections (trust cluster) | blueprint.md rows 67–69, 94–99; §8.1.2 | task 8 | Dumby Core Engineering | M | Tier 2 | PENDING |
| 10 | Suite Tier 3 doc reflections (wiring cluster) | blueprint.md rows 36, 73–77, 100–103, 110–115; directory.md | task 9 | Dumby Core Engineering | L | Tier 3 | PENDING |
| 11 | Suite Tier 4 doc reflections (correctness tail) | remaining suite rows | task 10 | Dumby Core Engineering | M | Tier 4 | PENDING |
| 12 | Set-wide pass: TOC renumber, cross-refs, badges, §45 regeneration, change-log entries (§9) | all | tasks 3–11 | Dumby Core Engineering | M | Closure | PENDING |
| 13 | documentation.md archival markers | documentation.md | task 4 | Dumby Core Engineering | S | Phase 2 | PENDING |
| 14 | Register the three source docs | docs/ur/, change-log.md | task 1 | Dumby Core Engineering | S | Phase 0 | PENDING |

### 14.2 Milestones

| Milestone | Target Date | Actual Date | Status |
|---|---|---|---|
| Phase 0 exit: ADRs recorded, decisions made, ledger standing | — | — | PENDING |
| Phase 1 exit: repo → source upload → validated → promoted → auto-reloaded documented end-to-end | — | — | PENDING |
| Phase 2 exit: all user-visible surfaces renderer-issued Components v2; embed-ban lint documented | — | — | PENDING |
| Phase 3 exit: full developer governance loop documented with paper-verifiable licenses | — | — | PENDING |
| Phase 4 exit: platform surfaces and completion audits documented | — | — | PENDING |
| Corpus closure: all 121 rows DONE, matrix §7 DONE, checklist §9.1 ticked | — | — | PENDING |

### 14.3 Communication

| Audience | Channel | Message Summary | When |
|---|---|---|---|
| Module authors | docs repo + change-log | Breaking contract changes: `swastik` package, TS-only upload, renderer-only authoring, embed ban migration window | Phase 1–2 exits |
| Platform / SRE operators | docs repo + runbooks | Control-plane authentication, CLAI ssh2, tier volumes, CI hygiene | Tier 1–3 landings |
| Framework maintainers | docs repo | ADR series; §45 ledger regeneration; audit-register vocabulary | Phase 0 + closure |
| Guild administrators / marketplace developers | change-log + interface.md | License state machine, visibility fields, Twill, MDIS sync | Phase 3–4 exits |

---

## 15. Post-Implementation & Closure

### 15.1 Closure Checklist

- [ ] All acceptance criteria (§12.1) met
- [ ] All per-document changes applied and committed
- [ ] Change-log entries recorded for every affected document
- [ ] Requester notified of completion
- [ ] UR archived at docs/ur/ alongside the three frozen source records

### 15.2 Post-Implementation Review

| Field | Value |
|---|---|
| **Completed On** | — |
| **Deviations from Plan** | — |
| **Lessons Learned** | — |
| **Follow-Up URs Raised** | — (the 52 deferred greenfield items remain tracked in the suite exclusions appendices, not as URs of this request) |

---

# APPENDICES

## Appendix A — UR Revision History (This Request's Own Change-Log)

| Version | Date | Author | Change |
|---|---|---|---|
| 0.1 | 18/09/2026 | Dumby Core Engineering | Initial draft from Template v1.0, filled with the three source programs (v5.0 UR 5.0-UR-1; Suite @ `be39a52`; RBAC requirements) |
| 1.0 | 18/09/2026 | Dumby Core Engineering | Consolidated fill complete: 121 requests placed one by one; 12-document impact matrix; 11 ADR placeholders; risks, verification, and phase plan recorded |

## Appendix B — Field Completion Guide

| Field / Section | What Belongs Here |
|---|---|
| `{{ur_id}}` | Format `UR-YYYYMMDD-NNN`, sequential — this instance: UR-20260918-001 |
| `{{doc_name}}` | Canonical document name as registered in the doc set (§3.1) |
| `{{sec_refs}}` | Section references in `§n.n` form matching each document's numbering convention |
| `{{est_magnitude}}` | `S` = single-section touch-up; `M` = multi-section pass; `L` = subsystem rewrite; `XL` = whole-corpus re-baseline |
| Request ID namespaces (this instance) | `UR-nn` = v5.0 program requests (1–31) · `UR-A-nn` / `UR-B-nn` / `UR-C-nn` = Suite requests (1–30 / 1–28 / 1–30) · `R1`/`R2` = RBAC upgradation requirements |
| Severity vocabulary (Suite) | `Critical` → maps to P0; `High` → P1; `Medium` → P2 |
| Flaw classes (Suite) | Security · Broken · Dead-wiring · Misconfiguration |

## Appendix C — Reference Documents

| # | Document | Path | Relationship |
|---|---|---|---|
| 1 | Dumby_Upgradation_Request_v5.md (5.0-UR-1) | docs/ur/ | primary source — 31 program URs, tensions, rollout, acceptance, glossary |
| 2 | Dumby-Suite_Upgrade_Request.md (@ `be39a52`) | docs/ur/ | primary source — 88 correction requests, tiers, exclusions |
| 3 | RBAC_Flaws_and_Requirements.md | docs/ur/ | primary source — 21 flaws, requirements R1/R2 |
| 4 | blueprint.md (4.6.0) | docs/blueprint.md | current-state engineering reference (target of the re-baseline) |
| 5 | documentation.md (4.5.1) | docs/documentation.md | legacy decisions reference |
| 6 | interface.md (24 July 2026 window) | docs/interface.md | end-user interface reference for the renderer workstream |
| 7 | Codebase | `master-ronix/Dumby-Suite` @ `be39a52` | audit target; all line references verified there |

## Appendix D — Notes & Attachments

**Provenance and reconciliation.** The three source programs together contribute exactly 121 requests: 31 (v5.0 program, UR-01…UR-31, normalized from the raw requirements in `paste-1.md` with verbatim intent preserved) + 88 (Suite: Groups A-01…A-30, B-01…B-28, C-01…C-30; severity mix 17 Critical / 31 High / 40 Medium) + 2 (RBAC requirements R1/R2). All 121 appear as rows 1–121 of the master table (§8.1.2) in source order. The Suite document's evidence chain consolidated 270 verified findings (0 of 235 re-verification withdrawals; 35 false negatives surfaced), of which 88 were flaw-fixable and 52 were excluded as greenfield work — those 52 are out of scope here (§6.2 #1) and must not be smuggled back in.

**Standing constraint.** All Suite line-number and file references were verified at commit `be39a52`; re-verify against the working HEAD before treating any cited location as current.

**Freeze rule.** The three source documents are registered as frozen program records (§8.10–§8.12); their content is authoritative for the requests they define and is not itself modified by this UR.

---

*End of upgradation request. PART A–PART E and Appendices A–D structure retained from Template v1.0 in full; no sections were added, removed, or reordered. Sections may only be omitted with an explicit `— N/A` marker and a one-line reason, never silently removed.*
