# DUMBY Documentation — Unified Change Log

> **One project. One continuous history.**
> Archive lineage: v1.0.0 → FINAL (13 drafts) · Living reference pair: v4.5.1 (`documentation.md` · `blueprint.md`) · Living document set: v5.0.0 (nine canonical documents · `docs/adr/` · `docs/ur/`)
> Last recorded: 2026-10-01 (UR-20260918-001 rev 2.0 — post-re-baseline Conformance & Audit Evidence Set read finding-by-finding; migration protocol 5.3.0 and the corrected M0 per-request record)

---

## Table of Contents

1. Scope & Method
2. Master Version Table
3. Version-by-Version History
4. Cross-Version Defect Lifecycle
5. Open Items Carried Forward

---

## 1. Scope & Method

### 1.1 Scope

This log covers the throughline in `01_Documentation_Versions_PRIMARY_LINEAGE` — the 13 files that are one project's continuous revision history — plus, from 2026-09-11, the two _living_ reference documents (`documentation.md`, `blueprint.md`), whose v4.5.1 headers carry the explicit instruction "record in change-log.md."

From 2026-09-18 it additionally covers the full v5.0.0 document set — all nine canonical documents, the `docs/adr/` decision-record series, and the `docs/ur/` frozen request records — as one continuous history; `documentation.md` enters this log as an archived legacy record from that date.

It does not cover the five alternate/forked drafts in `02_Documentation_Versions_ALTERNATE_BRANCHES` (an early independent TypeScript pass, two JavaScript-ESM fork revisions, an unversioned alternate tier draft, and a rejected consolidation attempt). Those are real documents but were never merged into this line, so they sit outside a changelog for _this_ project.

### 1.2 Method

Four independent evidence sources were cross-checked for every entry, and no claim rests on only one of them:

1. **The project's own production changelog** (`05_Changelog`) — a prompt-by-prompt ledger covering v1.0.0 → v3.0.0 with exact line counts and named deliverables per step.
2. **Seven audits** (`03_Audits_and_Reviews`) — a spec-vs-implementation audit, a weakness audit, two provenance audits plus a reconciliation against external review, a merged 4-report vulnerability register, and a deep-think audit — each naming or line-count-matching the exact draft it examined.
3. **Eight directives** (`04_Prompts_and_Directives`) — the upgrade instructions targeting each major jump, several with their own deep-think gap analyses.
4. **Direct, full-file diffs** for every transition from v4.0.0 onward, plus direct `grep`/section-comparison checks for earlier transitions — used to verify or correct what the surrounding documents claimed, never to replace it.

A fifth source applies to the v4.5.1 entry only: direct programmatic checks of the assembled files and the merged Unified Update Request (UUR). No pre-update copies of the living documents existed for a version-to-version diff, so their pre-update states are cited as _attested_, never as diff-verified.

### 1.3 The self-verification caveat (stated once, applies throughout)

Where a document's own embedded **Self-Verification Report** is cited, one caveat applies: the v4.0.0 and v4.1.0 reports are byte-identical to each other (confirmed by direct diff), meaning that section is boilerplate carried forward unedited and is _not_ independent evidence of what changed in v4.1.0 specifically — the diff-verified facts come from the file body, not its self-report. The same defect family re-manifests at v4.5.1 in `documentation.md`'s §51 (see that entry).

### 1.4 Content evidence over labels

Several files' own filenames or self-declared headers are wrong. This log follows content evidence in every such case:

| Draft   | What it called itself                           | What it actually is               | Evidence                                                                                                                                                                                    |
| ------- | ----------------------------------------------- | --------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Item 06 | `DUMBY_v4_FINAL.md`                             | The **first** v4 release (v4.0.0) | Diff vs. v4.1.0 shows it missing fixes v4.1.0 explicitly adds; nothing suggests it is terminal                                                                                              |
| Item 11 | `DUMBY_v4_draft.md`                             | The complete, shipped **v4.4.0**  | Text states "every section from v4.3.0 is preserved here exactly"; not draft-shaped                                                                                                         |
| Item 12 | Filename _and_ internal header both say `4.4.0` | Actually **v4.5.0**               | Fully implements all 29 Rosetta Stone codenames a later-numbered directive explicitly says it is upgrading _away from_ v4.4.0 to produce — a document cannot be the input to its own output |

Two smaller notes from the same reconciliation:

- No standalone **v3.0.1** file exists anywhere in the archive. v3.0.2's own header says it includes "3.0.1 fixes," so it most likely lived only as an in-conversation patch folded straight into v3.0.2 before being saved separately.
- Item 08 (the RBAC/CLAI addendum) self-labels as "Core Directive Specification v5.0" but is not a version in this sequence at all — it describes itself as an addendum extending `DUMBY_v4_1_0.md`, "a continuation, not a separate document." It is logged as an interstitial artifact, not a numbered release.

### 1.5 Entry template (controlled vocabulary)

Every version entry in §3 uses the same fixed set of labels, always in this order. Only the applicable labels appear.

| Label          | Meaning                                                                          |
| -------------- | -------------------------------------------------------------------------------- |
| **Added**      | New content or capability introduced at this version                             |
| **Changed**    | Existing content or behavior modified                                            |
| **Fixed**      | A defect closed at this version                                                  |
| **Removed**    | Content deleted at this version                                                  |
| **Reverted**   | Drafted, then reversed before ship                                               |
| **Introduced** | A defect created at this version (tracked in §4)                                 |
| **Deferred**   | Known gaps, assumptions, or open items left at ship — stated, not hidden         |
| **Flagged**    | A discrepancy called out and left unresolved on purpose — never silently settled |
| **Verified**   | Claims in this entry re-checked directly against the artifacts; results recorded |

Each entry opens with a one-line metadata footer: _lines · size · basis of verification_.

---

## 2. Master Version Table

| #   | Version    | Lines           | Size           | Theme                                                                                                                                                                                                                                                                                                                                                        |
| --- | ---------- | --------------- | -------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 1   | v1.0.0     | 2,561           | 115 KB         | First delivered draft, still named "UMDB"; no code                                                                                                                                                                                                                                                                                                           |
| 2   | v2.0.0     | 6,321           | 336 KB         | Renamed to Dumby; 22-module catalog created (8 of 22 at full depth)                                                                                                                                                                                                                                                                                          |
| 3   | v2.1.0     | 6,956           | 380 KB         | Remaining 14 modules brought to full depth                                                                                                                                                                                                                                                                                                                   |
| 4   | v3.0.0     | 7,821           | 504 KB         | Admin/Core/Standard/Marketplace tiers; TypeScript declared                                                                                                                                                                                                                                                                                                   |
| 5   | v3.0.2     | 7,929           | 514 KB         | Terminology sweep + first (brittle) backfill-migration fix                                                                                                                                                                                                                                                                                                   |
| 6   | v4.0.0     | 4,219           | 310 KB         | 7-Part/35-section → 9-Part/50-section restructure                                                                                                                                                                                                                                                                                                            |
| 7   | v4.1.0     | 4,330           | 331 KB         | Extensibility Contract; robust backfill fix; security hardening                                                                                                                                                                                                                                                                                              |
| —   | _Addendum_ | 312             | 33 KB          | RBAC/Slash-Lifecycle/CLAI spec (interstitial, not a version)                                                                                                                                                                                                                                                                                                 |
| 8   | v4.2.0     | 4,420           | 377 KB         | Security & compliance hardening (largest single fix batch)                                                                                                                                                                                                                                                                                                   |
| 9   | v4.3.0     | 3,908           | 348 KB         | Module catalog cut to illustrative-only; Power Engine introduced                                                                                                                                                                                                                                                                                             |
| 10  | v4.4.0     | 4,165           | 402 KB         | Power Engine Panel, RBAC redesign, BCCM, CLAI, MTP, 404 Mode, Personas                                                                                                                                                                                                                                                                                       |
| 11  | v4.5.0     | 4,367           | 412 KB         | 29-codename Rosetta Stone; Swastik; Credentials Service                                                                                                                                                                                                                                                                                                      |
| 12  | FINAL      | 1,682           | 220 KB         | Core-only scope cut; long-standing defects closed out                                                                                                                                                                                                                                                                                                        |
| 13  | v4.5.1     | 10,949 / 13,099 | 1.11 / 0.99 MB | Structure-Enforced Edition — merged UUR (1,389 findings) applied to the living reference pair                                                                                                                                                                                                                                                                |
| 14  | v4.6.0     | 10,953 / 13,102 | 1.10 / 0.99 MB | Production-Readiness Edition — eight headline design decisions integrated across the suite; duplicate `src/core/` subsystem removed from the spec; Redis HA, pool sizing, gateway session resume, break-glass, and vulnerability-scanning requirements added; CLAI SSH, Dev-ID/Token split, AST manifest extraction, and per-module isolation made normative |
| 15  | v5.0.0     | 13,147 / 9,808 / 1,876 / 1,631 / 598 / 583 / 365 | 0.93 MB · 0.99 MB · 0.12 MB · 0.09 MB · 0.05 MB · 0.07 MB · 0.03 MB | Consolidated Re-Baseline Edition — 121 requests (31 program URs · 88 implementation-flaw corrections · 2 RBAC redesign requirements) applied across twelve documents; Renderer + buffer presentation model, RBAC Layer 6/7, tier volumes, license state machine, Compatibility Ledger, Global Data Emit, Twixter, envelope encryption, 11 ADRs, three frozen source records |

---

## 3. Version-by-Version History

---

### v1.0.0 — "UMDB Framework" (Original Blueprint)

_2,561 lines · 115 KB · basis: production changelog plus section-comparison checks_

**Added**

- First delivered draft: 27 sections, a single markdown file, zero code or program files (verified at delivery).
- §7.2 "Module Types & Categories" names an unenforced "Admin Modules — bot owner only" category — the genuine, later-cited ancestor of the v3.0.0 tier system.
- Full Glossary (27 terms) establishing the project's baseline vocabulary (RBAC, DI Container, Module Registry, Correlation ID, and others).

**Deferred**

- No tier system, no TypeScript, no per-guild module-state table — all arrive later.
- The 18-stage bootstrap, 7-layer permission resolver, and 10-entry middleware pipeline that later drafts reference as "written in full" did **not** exist at this depth here.

---

### v2.0.0 — Renamed to Dumby; 22-Module Catalog

_6,321 lines · 336 KB · basis: production changelog plus section-comparison checks_

**Added**

- Complete rewrite (v1.0.0 left untouched). Project renamed **UMDB → Dumby**.
- Eight net-new sections (35 total, up from 27): Localization, Analytics & Telemetry, GDPR/Privacy, Troubleshooting Runbooks, plus substantially expanded security, testing, and infrastructure sections.
- The 22-module Built-in Module Catalog, created for the first time and naming every module still present in the final v3.0.0+ lineage: `core-admin, guild-settings, moderation, auto-moderation, logging, welcome, leveling, economy, tickets, music, giveaways, utility, starboard, reaction-roles, polls, reminders, tags, verification, anti-raid, birthdays, threads-manager, integrations`.
- The 18-stage application bootstrap, 7-layer permission resolver, and 10-entry middleware pipeline, all written in full for the first time.

**Introduced**

- Only **8 of 22** modules received Services/Database/Configuration depth at creation: `moderation, auto-moderation, economy, tickets, guild-settings, core-admin, logging, welcome`. The other 14 had commands only. Caught at the next version.

---

### v2.1.0 — Module Depth Completion Pass

_6,956 lines · 380 KB · basis: production changelog plus a fresh integrity re-audit_

**Fixed**

- All 14 thin modules brought to full depth (Services + Database Tables + Configuration): `leveling, music, giveaways, utility, starboard, reaction-roles, polls, reminders, tags, verification, anti-raid, birthdays, threads-manager, integrations`.
  - `music` additionally received a full Voice Infrastructure deep-dive (`VoiceManager`, `AudioPlayer`, `LavalinkClient`).
  - `utility` additionally received an explicit "intentionally stateless" rationale in place of a conventional table list.
- The 8 already-strong modules each had their _specific_ remaining gap closed (not a uniform pass) — e.g. `economy` gained Events Emitted plus a full Configuration block; `tickets` gained a Services block; `logging` gained Services, two new tables, and Configuration; `core-admin` completed its Services list and gained a Configuration entry.

**Added**

- Four new infrastructure subsections: Terraform IaC, PgBouncer configuration reference, the Voice Infrastructure write-up, and the Worker Thread pattern.
- A fresh integrity re-audit confirmed the fix landed everywhere claimed.

---

### v3.0.0 — Tiered Module System + TypeScript Migration

_7,821 lines · 504 KB · basis: production changelog plus section-comparison checks_

**Added**

- **Admin / Core / Standard / Marketplace** tier system plus a guild-level Interface. Final tier assignment for all 22 modules, exactly as shipped: 1 Admin (`core-admin`), 2 Core (`guild-settings` — basis of Interface/MDIS, and `utility`), 2 Marketplace overrides (`music`, `integrations`), 17 Standard (everything else).
- TypeScript strict mode declared as the stack (§3.1.1), superseding the prior JavaScript/JSDoc decision.
- New sections: §1.7 Historical Lineage; §8.6 Tier as a Manifest Field; §8.7 Per-Guild Module State (`guild_module_states`); §8.8 Admin-Tier Security Gate; §8.9 Module Lifecycle State Machine; §8.10 Core/Admin Performance Baselines; §8.11 Mandatory Feature Manifest (27 named features); §22.4 MDIS.
- New tables: `guild_module_states`, `marketplace_listings`. New glossary terms: Tier, Admin/Core/Standard/Marketplace Module, Interface, MDIS, Tier-Fit Test, Soft-Dependency Degradation Contract.

**Reverted**

- An intermediate draft had merged `auto-moderation` into `moderation`, absorbed `reminders` into `utility`, eliminated `threads-manager` outright, and wrongly reclassified six modules as Marketplace. All of it was drafted in a scratch workspace, independently verified to have never reached the live file, and fully reversed in favor of the "zero eliminations" table above.

**Deferred**

1. **Critical** — no backfill migration exists for `guild_module_states`; every Standard module would appear silently disabled for every pre-existing guild the instant this version deploys.
2. Six inline tier-revision transparency callouts not yet relocated to a planned migration-notes subsection.
3. Cross-reference pointers from ~9 sections to their §8.11 feature entries not yet added.
4. Three tables introduced inline (`metering_usage_daily`, `backup_history`, `guild_outbound_webhooks`) never registered in the master table registry.
5. A Terraform multi-region gap for Feature #26 left open.

---

### v3.0.2 — Terminology Sweep + First Backfill Fix

_7,929 lines · 514 KB · basis: direct grep and section-comparison checks; Weakness Audit confirmed matching this exact draft_

**Fixed**

- All 5 of v3.0.0's outstanding issues closed:
  1. Backfill migration `0007_backfill_guild_module_states.js` added, marked **Required / Non-Optional for any existing deployment**; Bootstrap Stage 10 guarantees it completes before Stage 14 (Gateway Login).
  2. The six tier callouts relocated to §33.5.
  3. All 27 features now cross-referenced from their natural home sections.
  4. The three orphaned tables registered in §15.2.2.
  5. The Terraform multi-region gap closed in §29.5.
- Terminology: every "UMDB role" string swept to "Dumby role" throughout.

**Flagged**

- _Missed by the sweep_ (confirmed by direct grep; corrected only at v4.0.0): §1.1 "What Dumby Is" still opens with **"Dumby is a JavaScript-based, unified, modular Discord bot system"** — present at v2.0.0, v2.1.0, v3.0.0, _and_ here, despite the TypeScript decision having been declared two versions earlier. Two separate cleanup passes both missed this exact sentence.
- _New defects found by the independent Weakness Audit_ — the single largest defect catalog against any pre-v4 draft, most consequential items below:
  - **Critical.** Nine separate passages cite an undefined "governing mandate" / "Absolute Compliance Directive" — leaked references to the drafting process itself, defined nowhere in the document.
  - **Critical.** `AdminTierGateMiddleware` is described in detail in three places (§8.8, §13.2, §23.4) but is registered in **zero** of the document's own canonical middleware lists (§11.2's Pipeline Execution Order, §11.3's Full Reference, §5's directory tree) — the most security-critical component in the tier system, absent from every place meant to be authoritative about what middleware exists.
  - **High.** The "Seven-Layer Permission Resolution Engine" maps only 2 of its 7 layers onto real middleware; Layer 2 (blacklist) and Layer 7 (channel restriction) have no implementation anywhere.
  - **High.** The TypeScript migration is contradicted by four independent, un-updated artifacts: the full directory tree (all `.js`, no `tsconfig.json`), a stale `.eslintrc.js` filename directly contradicting a "flat config" claim two sections later, a VS Code `launch.json` treating TS as a hypothetical future option, and a CI `typecheck` job describing optional JSDoc checking rather than a mandatory strict build.
  - **High.** `guild_configs` is defined two incompatible ways: a single JSONB blob column per its canonical table definition, vs. ~23 fields listed like real, individual columns in the field reference two sections away — and the old, superseded `moduleOverrides` flat field is still listed there as current alongside the new `guild_module_states` mechanism built specifically to replace it.
  - **High.** A real webhook-idempotency race: the "seen before?" check happens at Step 2 of the processing flow, but the delivery ID isn't recorded as seen until Step 5 — two near-simultaneous deliveries can both pass the check before either writes, producing duplicate processing and directly contradicting the threat model's own "duplicates are ignored" claim.
  - **High.** The sharding formula (`guildId.toBigInt() >> 22n % BigInt(totalShards)`) has a real operator-precedence bug: `%` binds tighter than `>>` in JavaScript/TypeScript, so as literally written it does not compute the intended value.
  - **High.** `replicas: 2` in the reference Kubernetes config is never reconciled with Discord's one-gateway-session-per-shard rule; no active/standby or leader-election mechanism is described for how two replicas of the same shard would coexist.
  - **Medium.** A self-admitted, under-prioritized breaking change: upgrading from v2.1.0 silently disables `music` and `integrations` (now Marketplace tier, not pre-installed) for every guild that had them — filed as "no action required" despite a blast radius identical to the Standard-tier backfill hazard that got a Critical, mandatory-migration response.

---

### v4.0.0 — First v4 Release; 9-Part Restructure

_4,219 lines · 310 KB · basis: full-file diff lineage begins here; self-report cross-checked directly. Filed as `DUMBY_v4_FINAL.md`, actually the first v4 release._

**Changed**

- Major restructure: 7 Parts / 35 sections → **9 Parts / 50 sections + a new §51 Self-Verification Report**. Document retitled "Dumby-Complete-Reference" (from "Dumby-System-Reference").
- The single Module System section (with 8.6–8.11 subsections) split into 5 dedicated top-level sections: Module Anatomy & Manifest; Tiers & Lifecycle State Machine; Inter-Module Communication & Contracts; Hot Reload & Dynamic Module Management; Marketplace & Extension System.
- The single Module Catalog section split into 8 category-based sections: Admin Tier; Core Tier; Moderation & Safety; Community Engagement; Utility & Productivity; Entertainment & Events; Marketplace Integration; Catalog Conventions.
- New elevated top-level sections: Non-Goals & Explicit Boundaries; State Externalization & Horizontal Scaling; Dumby vs. Multipurpose Bots — Full Comparison.

**Fixed**

- `RATE_LIMIT_USER_MAX` naming inconsistency (`RATE_LIMIT_USER_MAX_REQUESTS` in places) corrected throughout.
- Four-tier test pyramid (Unit/Integration/Happy-Path Smoke/E2E) now actually drawn in its diagram — closes the Weakness Audit's Feature #18 finding.
- `PREFIX` field removed from the guild-config schema (no text-prefix commands, consistent with Non-Goals).
- `SIGUSR2` correctly documented as reserved/unused; no surviving PM2 self-re-exec reference — partially closes the restart-mechanism gap, though a Kubernetes-native restart path is not yet spelled out.
- All references to JavaScript scrubbed in favor of TypeScript strict mode — the "JavaScript-based" sentence flagged three versions earlier is finally corrected (§1 renamed "One-Sentence Definition," rewritten to open with "a single TypeScript application runtime").
- A full-document grep for version-comparison language (`pre-4.0`, `deprecated`, `formerly PM2`, etc.) returns zero hits; all such language replaced with present-tense design rationale.

**Deferred**

- `AdminTierGateMiddleware`'s registry-absence defect is not explicitly addressed in this draft's own verification claims.
- The backfill migration is still described as **"MANDATORY... its failure is a fatal deployment error, not a warning"** — the brittle v3.0.2-era fix, not yet the robust version that ships next.
- Stated assumptions (named limits, not gaps): `INTERACTION_TIMEOUT` (14 min) assumes current Discord behavior; the Lavalink dependency assumes v4.x protocol; cross-region Postgres Terraform targets a generic pattern, not a specific cloud provider; `TRACE_SAMPLE_RATE` default (0.1) has stated adjustment guidance for high/low-traffic deployments.

---

### v4.1.0 — The Extensibility Contract + Reliability Hardening

_4,330 lines · 331 KB · basis: full-file diff against v4.0.0 (195-line diff, 149 changed lines — a genuinely surgical release)_

**Added**

- **§10.6–10.11, "The Extensibility Contract"** — six new subsections specifying, for the first time, the exact obligations and steps for building a module: the 5-obligation contract itself (declare dependencies; declare tier honestly; own your own data; publish only the intended `provides`/`eventsCatalog` surface; never cross-module import or write), a 4-step build process (Scaffold → Manifest/Command Surface → Entry/Logic/Data layers, ESLint-enforced → Test/Document/Submit), and "What Done Looks Like."
- New end-to-end P50/P99 performance-target table by tier (distinct from the pre-existing framework-overhead-only targets), with an explicit rationale for why Core tier's availability target excludes a Redis dependency.
- New §13.3, "Reload, Toggle, and Disable — Four Distinct Mechanisms" — a table distinguishing dev hot reload, runtime module reload, per-guild toggle, and global disable, previously conflated.
- New §15.5, complete `CommandContext` field reference (`correlationId`, `guildConfig`, `locale`, `rbacRole`, `logger`, `shardId`, `metadata`).
- Cryptographic signing added to the Marketplace submission pipeline; `ModuleRegistry` now refuses to load unsigned Marketplace code (built-ins exempt).
- Per-guild `rateLimitMultiplier` / `cooldownMultiplier` config fields, so a high-traffic guild can raise its own ceiling without an operator changing process-wide defaults.
- `CRITICAL_QUERY_THRESHOLD_MS` (2000 ms, error-level, dedicated Prometheus counter) alongside the existing `SLOW_QUERY_THRESHOLD_MS` (500 ms, warn-level).

**Fixed**

- _Critical_ — the `guild_module_states` backfill hazard, resolved robustly: the read path now defaults (no row found resolves to the module's tier default — active for Standard, `never_installed` for Marketplace — and writes that value back on first interaction), so no guild is ever gated on the migration having run. The migration itself is downgraded from "MANDATORY / fatal" to **"Proactive"**: its failure is logged and alerted, not fatal. This is the second, durable fix in a three-stage arc (see §4).
- _Security_ — Layer 1 of the Admin-tier gate gains `defaultMemberPermissions: 0n`: the command is invisible in a non-owner's UI entirely, not merely blocked at execution.
- _Security_ — a new, unconditional audit guarantee: every Admin-tier invocation — granted or rejected — writes to `audit_logs` before the handler runs.
- _Security_ — OAuth2 dashboard login gains CSRF protection (a cryptographically random `state` parameter) and a fully specified JWT session (HMAC-SHA256, `HttpOnly`/`Secure`/`SameSite=Strict`), with guild-administrator status re-verified against Discord's API on every call rather than cached for the session's life.

**Changed**

- `TransactionManager` now handles nested calls safely via `AsyncLocalStorage` + `SAVEPOINT` — a service author no longer needs to manually check whether they are already inside a transaction.
- Backup mechanism differentiated by deployment target: managed-provider deployments use the provider's snapshot API; self-hosted deployments run `pg_dump` to object storage, confirmed durable before being marked successful.
- Three new `utility` commands (`/permissions`, `/timestamp`, `/calculate`) and their four backing services.

---

### Addendum (interstitial) — RBAC / Slash-Lifecycle / CLAI

_312 lines · 33 KB · extends v4.1.0; not a numbered version. Self-labeled "Core Directive Specification v5.0" — an aspirational label, not a real position in the sequence._

**Added**

- **Part A — Global RBAC Engine.** Two-level hierarchy (Groups of roles/users; Sets of Groups), five independent permission primitives (grant, whitelist, blacklist, quota, cooldown), an explicit precedence algorithm (blacklist absolute → specificity ordering → deny-beats-allow tiebreak → Discord-permission-default fallthrough), and a global (`guildId = NULL`, CLAI-only, restriction-only) layer alongside the guild-scoped one. Access resolution fails closed; quota/cooldown fail open with an in-memory cap.
- **Part B — Slash Command Lifecycle.** Core+Standard register globally at boot via full overwrite; Marketplace registers guild-scoped on enable; disable is enforced _synchronously_ via a dispatcher-level gate the instant it is requested, with the actual Discord deregistration queued so rate limits can never block correctness.
- **Part C — CLAI.** A separately-deployed SSH admin console, password **plus mandatory TOTP MFA** (added explicitly given the console's blast radius), authorization reusing Part A's RBAC engine directly, full audit logging into the shared `audit_logs` table.

**Provenance**

- Produced in direct response to six numbered directives from the Audit Reconciliation review (strip module detail to illustrative-only; defer Stripe in favor of a "Dodo Payments" placeholder; full module-developer freedom with operational-not-design control retained centrally; no core-authored UX; redesign RBAC; redesign the slash-command lifecycle; specify CLAI).
- Its ideas substantively land in v4.4.0; it was never shipped as a standalone version.

---

### v4.2.0 — Security & Compliance Hardening Release

_4,420 lines · 377 KB · basis: full-file diff against v4.1.0 (283-line diff, 190 changed lines). The single largest concentration of fixes in the whole lineage._

**Fixed**

- _The Reconciliation Audit's top-priority finding_ — rate limiting and cooldowns, on a Redis outage, now **fail closed** via a per-process, LRU-bounded in-memory counter (metered by a `dumby_ratelimit_fallback_active` gauge), replacing the prior fail-_open_ behavior that would have removed the only thing standing between the bot and a Discord-side token ban during an outage.
- _Four previously-confirmed absences closed:_
  - New **§29.8, Encryption Posture** — TLS required in transit everywhere (`sslmode=require`, `rediss://`, enforced at Stage 02 config validation, with the one explicit local-Compose exception); at-rest encryption delegated to the storage layer per deployment tier; a two-phase `ENCRYPTION_KEY_CURRENT`/`PREVIOUS` rotation scheme.
  - New **§31.6, Children's Privacy** — the birthdays module's opt-in birth-year field now carries an explicit operator warning about publishing minors' computed age via the `{age}` template variable.
  - New infrastructure cost column in the deployment-tier table (~$25–75 / ~$300–800 / ~$1,500+ across the three tiers) — order-of-magnitude floors, explicitly not a quote.
  - Locale/RTL support fully specified: the real ~30-locale Discord target list, and MDIS's renderer built on CSS logical properties for automatic RTL support.
- _Other named vulnerabilities:_
  - Event-bus synchronous re-entrancy (the audits' own "sharpest finding") — new `EVENT_BUS_MAX_EMIT_DEPTH` config guard.
  - Cross-module read boundary tightened — an open, direct read against another module's table is no longer permitted; reads must go through a declared `ForCrossModuleRead`-suffixed accessor, lint-enforced in shape.
  - Anonymous polls made genuinely anonymous — the persisted `voterKey`, not just the emitted event, is now an HMAC of `userId + pollId + salt` for `--anonymous` polls (deterministic per poll, so double-voting is still caught without the row itself being a de-anonymization vector).
  - Soft-delete/unique-constraint gap closed — every unique constraint on a table carrying `deletedAt` must now be a partial index (`WHERE "deletedAt" IS NULL`); CI's migration validator rejects a plain `UNIQUE` on such a table.
  - New **§40.8, Load & Performance Testing** — a k6-based nightly/pre-release staging load tier with explicit pass/fail criteria against the document's own stated P50/P99/error-rate/cache-hit-ratio targets.
  - Modal session expiry now returns a distinct, named "your session expired" message instead of falling through to the generic error boundary.
  - Shard-ownership model unified and renamed (§23.4: "Kubernetes Deployment — Active/Standby" → "Shard Ownership — The Lock Model Behind Both Failover and Rolling Updates"), adding a **proactive planned-handoff path** (a few seconds, self-initiated) alongside the existing passive unplanned-failure path (10–15 s, TTL-based).

**Changed**

- _A judgment call resolved_ — `/bot-admin eval` is **kept, not removed** (two external reviews had argued for deleting it outright). It gains a new **Layer 5** (5-second hard timeout, output truncated and never fully logged) plus an explicit written threat model naming the residual risk (a compromised owner account reaching eval in a non-production environment) and the controls that bound it (VM sandbox with no `fs`/`net`/`child_process`; unconditional audit logging; mandatory non-production credential separation).
- _Partial fixes, full resolution deferred_ — `economy`'s gambling commands (`/coinflip`, `/dice`, `/slots`) made **off by default** (`ECONOMY_GAMBLING_ENABLED`), gated behind a mandatory, audit-logged compliance acknowledgment, per-command odds/RTP disclosure, and a provably-fair `crypto.randomInt()` guarantee; full removal happens at v4.3.0. Stripe's PCI scope explicitly clarified in place (no cardholder data ever reaches Dumby's process) one version before removal.

**Flagged**

- An independent, four-report **Vulnerability & Abuse-Loophole Register** (41 distinct findings — 7 Critical, 18 High, 7 Medium, 9 Low), explicitly scoped to "the v4.2.0 base architecture," still lists three of the above as open (anonymous polls, no load-testing tier, modal-expiry UX) — yet direct diffing of the shipped v4.2.0 text shows all three already fixed. The register also records two internal contradictions between its four source reports (whether the event bus's cycle guard is a real depth cap or doesn't exist at all; whether the rate limiter fully disables under a Redis outage or degrades to a bounded fallback) without resolving them. Per this log's direct-text verification, the shipped document supports the "guard exists" / "bounded fallback" reading in both cases — noted here rather than picked silently.

**Deferred**

- Per the register, not contradicted by direct verification: no runtime sandbox for Marketplace code (lint + human review only); no non-Redis fallback for shard-lock arbitration if Redis itself is fully unreachable; BullMQ/Redis remains a single point of failure for all scheduled-job state with no database-backed fallback.

---

### v4.3.0 — Module Catalog to Illustrative-Only; Power Engine Introduced

_3,908 lines · 348 KB · shrinks by ~500 lines net despite new content, since catalog-depth removal outweighs what was added_

**Removed**

- Executing the Reconciliation Audit's Directive 1: all 22 previously fully-specified modules cut to name + tier + one-line purpose (index depth). Part VII retitled "Built-in Module Catalog" → **"Module Catalog (Illustrative Examples)."** The document now states explicitly that none of the 22 is a module the framework actually ships.
- Stripe and the gambling-adjacent economy detail removed along with the rest of the catalog depth (Directive 2a); "Dodo Payments" reserved as a future monetization placeholder name.
- Compliance-matrix rows that had pointed to a specific module's command as their mechanism (multi-tenant metering, scheduled backup, controlled restore, chaos-injection testing) re-pointed to the underlying framework service directly — the service, not the now-removed command, was always the real mechanism.

**Added**

- **The Power Engine (PE)**, introduced for the first time (§19.8–19.12): a single point of global authority able to suspend or restrict any guild, module, developer, or command, governed explicitly by Principle P14 ("Freedom by Default, Authority by Exception" — the capability exists but is never used as an ambient enforcement layer). Exposed as a function-call-shaped service (`PowerEngineService`), with a mandatory, non-optional reasoned audit trail on every action, granted or rejected.
- `guild_module_states`'s "sole authority" guarantee explicitly extended to cover PE-originated global suspensions too — no parallel state mechanism introduced alongside it.

---

### v4.4.0 — Power Engine Panel, RBAC Redesign, BCCM, CLAI, MTP, 404 Mode, Personas

_4,165 lines · 402 KB · basis: full-file diff against v4.3.0 (411-line diff, 339 changed lines). Filed as `DUMBY_v4_draft.md`, actually the complete, shipped v4.4.0._

**Added**

- **Power Engine → Power Engine Panel (PEP)** — explicitly "the evolution of what earlier documentation called the Power Engine — same service, same ideology, a deeper and broader technical implementation." Its scope boundary is now stated in the core text, not just an FAQ: PEP controls application state only (modules, config, cache, queue, etc.) and never calls the Kubernetes API — resolving the deep-think audit's "PEP scope creep" finding. New Last-Known-Good-State fallback for when PEP itself is unreachable; a new `pending_approval` two-person-approval workflow in the action dispatcher for high-impact actions; a new opt-in `onPEPControl` module-integration hook (~5 lines).
- **RBAC Groups and Sets** (§19.13 onward), layered on top of — not replacing — the existing six-role hierarchy, resolving the "legacy vs. new RBAC coexistence" question by explicit design.
- **Full Persona system** (§6.6–6.9): distinct Discord Applications sharing one backend, database, and module system; a hard cap of **3 concurrent Personas** (promoted from an FAQ footnote into the core requirement); command-capacity and voice-isolation as the two stated purposes; a `persona_status` lifecycle table with a 5-minute auto-degrade threshold; decommissioning treated as a PEP action requiring the same reason-plus-second-approver bar as any other high-impact action.
- **404 Mode** (§8.5): a distinct, visible degraded-presence state — not a crash-like hang — triggered by a sustained PostgreSQL-primary or gateway outage past named thresholds (15 s / 30 s defaults); mid-bootstrap entry resumes from the failed stage rather than restarting the full 18-stage sequence; visible to every guild member by deliberate exception; escalates to on-call paging past a 30-minute default, closing the "no escalation timer" finding.
- **BCCM, CLAI, and MTP** ship: queued command renaming/aliasing with collision-resolution UI (BCCM); a separately-deployed SSH admin console reusing the RBAC engine for its own authorization (CLAI); a synthetic per-guild resource-usage token system (MTP).
- **Monetization scaffold** ships as literally an empty reserved directory (`src/monetization/`, a `.gitkeep` only) — deliberately no logic, matching the directive's explicit "don't build the full infra yet."
- A Rosetta Stone conceptual map added at the document root — using **plain descriptive bucket names**, explicitly _not_ the codename system the next directive asks for, framed as an orthogonal lookup table rather than a renumbering (preserving all ~400 existing internal cross-references). This is the direct textual evidence that this draft is genuinely v4.4.0, despite its filename.

**Deferred**

- Per the deep-think audit run in parallel against this exact draft: direct Role-vs-Role RBAC conflicts (as opposed to Role-vs-Group-vs-Set) are not covered by an explicit decision table; BCCM's 12-hour push window and 13-hour additive window are close enough in value to risk transposition during implementation; CLAI remains all-or-nothing with no view-only tier; MTP's token weights are provisional, unvalidated estimates, and the spec contains an unresolved contradiction over whether MTP tokens are non-resetting "live stats" or a resettable quota.

---

### v4.5.0 — 29-Codename Rosetta Stone; Swastik; Credentials Service

_4,367 lines · 412 KB · both the filename and the internal header say "4.4.0" — both are wrong_

**Added**

- The Rosetta Stone rebuilt as the full **29-bucket codename system**: Hinge, Kits, Bundles, Burg, Glass, Bonds, Masters, Mount, Delta, Ring, Bridge, Lens, Shoot, Keepy, Mash, Bags, Clips, Border, Driver, Cogs, Holder, Peer, Boot, Kelp, Belt, Grace, Face, Ground, Clay — matching the directive exactly. This exact requirement had already been requested one version earlier; v4.4.0 shipped a functionally equivalent but plainly-named version instead, and it is only implemented here.
- **Swastik** — a new deployment/hot-reload/hot-swap service: two update paths (a scheduled 24-hour full rolling core restart vs. per-module Kubernetes-volume-mount hot-swap); developer registration with a dev-ID + build-ID identity; manual per-developer license approval; staged, atomically-promoted (symlink-swap) deployment with automatic rollback on a failed self-health-check; a full audit trail of every step. (A codename for a CI/CD and module hot-swap system — the term derives from a common given name, unrelated to any other association some readers may bring to the word.)
- **Credentials Service** — architected similarly to PEP; issues scoped authkeys for CLAI, bound to valid user authentication (an incorrect password or profile is rejected outright), and also backs Swastik's own license-verification step.
- New **§51.7, Cross-Reference Integrity** — all 205 distinct `§`-prefixed cross-references checked programmatically against actual headers; 204 resolve exactly, and the one exception (`§48.2`) is confirmed as pre-existing intentional shorthand, not a broken pointer.

**Fixed**

- PEP terminology consistency (zero bare "PE"/"Power Engine"-without-Panel hits outside the report's own description of the check); bootstrap-stage citations consistently point to Stage 17 (`MODULE_READY`); MTP's cost-trigger reuses `SLOW_QUERY_THRESHOLD_MS` rather than a second independent threshold; the "not a microservices architecture" non-goal explicitly reconciled against PEP/CLAI's separate-service deployment model as a named, cross-referenced exception.

**Flagged**

- Sourced from the directive but **not independently diff-verified** against this exact draft (recorded per this log's sourcing discipline rather than silently folded in as confirmed): an explicit Ideology/Target-Audience section; manifest `Hardcode`/license/`status` columns; command restrictions closing prefix-command loopholes and DM-command reading outside admin modules; an MDIS per-guild settings-sync clarification.

---

### FINAL — Core-Only Consolidated Reference

_1,682 lines · 220 KB · ~32,500 words · genuinely the last archive document, and a full re-synthesis, not an incremental patch_

**Changed**

- Executes the Final Consolidation Directive's Core-Only Module Policy: every Admin/Standard/Marketplace-tier catalog entry — commands, services, schemas, configuration — is removed in full. What remains, at full depth, is the module _system itself_: manifest, lifecycle, tier concept as structural architecture, isolation, inter-module communication, and a complete module-building/extensibility guide, illustrated by exactly one example explicitly and repeatedly labeled a trivial, non-shipped teaching illustration (Appendix C states this outright).
- 41 numbered content sections (down from 51 in the v4.x line) plus §42 Self-Verification. Document-wide style shift: exactly **one** fenced code block is permitted (the §7 folder listing) — every other schema/pseudocode block from the v4.x era converted to prose, a deliberate move toward "specification, not implementation."

**Fixed**

- Long-standing defects finally closed, several dating back to the v3.0.2-era Weakness Audit:
  - `AdminTierGateMiddleware` now appears in the single canonical middleware registry it had been absent from since v3.0.2.
  - The seven-layer permission model explicitly mapped, layer by layer, onto that same registry, with no orphaned layer.
  - The `guild_configs` blob-vs-columns contradiction resolved — stated once, as a single schema-validated document; the old `moduleOverrides` flat field removed entirely; `guild_module_states` the only per-guild-module-state mechanism referenced anywhere in the text.
  - The sharding formula's operator-precedence ambiguity (§6.5) now stated with explicit operator order.
  - The Kubernetes replica count and the Discord shard count explicitly reconciled (§35.2) — the gap first flagged in the v3.0.2 Weakness Audit and again in the v4.2.0 Vulnerability Register.
  - The webhook idempotency check is now a single atomic operation, closing the check-then-write race first identified in the Weakness Audit.
  - The admin security boundary correctly counted as **four** independent layers (explicitly including the eval/arbitrary-code-execution gate), correcting a self-undercount standing since v3.0.2.
  - The GDPR erasure right's scope stated explicitly for a user who is a moderator, not only a target of moderation.
  - Every SLO/alert-threshold pair and retry-budget/circuit-breaker pair that had drifted across the document's history now stated exactly once, canonically (§25.5, §25.6, Appendix B).
  - All 27 mandatory-feature-matrix entries individually checked against the "padding" defect (3+ entries were bare cross-references with no independent content) — every entry now states its own governance, mechanism, failure mode, and configuration explicitly.
  - One assembly defect caught by this draft's own sequential-numbering self-check and corrected before shipping: §39 and §40 had been built but never spliced into the running file (§38 jumped straight to §41).

**Deferred**

- The document is ~32,500 words / ~214,000 bytes against a stated target of ~1 MB — roughly one-fifth — reported directly rather than rounded favorably. Its closing report states the tradeoff explicitly: given a choice between hitting the byte target through thinner, padded treatment, or fixing every specifically-named defect from prior review while executing the scope cut correctly, this pass chose the second. Whether to extend further toward the target is left as an open, explicitly surfaced decision.

---

### v4.5.1 — Structure-Enforced Edition (Living Reference Pair)

_Recorded 2026-09-11. `documentation.md`: 10,949 lines · 1,111,809 bytes · 51 numbered sections in 9 Parts, plus an Audit Register appendix and Colophon. `blueprint.md`: 13,099 lines · 988,665 bytes · 48 numbered sections plus Appendices A–C, a PART 0 orientation, an Audit Register appendix, and Colophon. Basis: direct programmatic checks against both assembled files and the merged UUR; no pre-update copies existed for a diff._

**Context.** Both headers now read "Document Version: 4.5.1 — Structure-Enforced Edition (record in change-log.md)" — this entry is that record. Neither document descends from FINAL, which remains the terminal artifact of the 13-file archive line; the living pair continues the v4.5.0 line. `documentation.md` is item 11's successor re-synthesized as the "Comprehensive Unified Edition" that merged a former Extended Reference into its host sections; `blueprint.md` is its sibling engineering reference, self-described in its appended lineage notes as the project's "document of record."

**The update input.** The edition was produced by applying the merged **Unified Update Request** — itself a three-way merge of three independently generated drafts (B1: 667 entries, 2026-09-08 20:53 UTC; B2: 605 entries, 2026-09-09; B3: 741 entries, 2026-09-08 21:10 UTC) covering 29 audit assets. Verified directly: the merged file contains exactly **1,389 entries** (UUR-001 through UUR-1389; no duplicates, no gaps), and its category distribution matches its own header exactly (ADD 178 · DO NOT ADD 42 · DELETE 23 · MODIFY 107 · CHANGE 59 · INCOMPLETE 122 · FAULTY 158 · FEATURES 155 · FUNCTIONS 142 · QUERIES 76 · IDEAS 148 · CONCEPTS 179).

**Added**

- **Per-section implementation-status badges**, implementing UUR-281's target state: [SPEC] (architecture only) · [PROTO] (prototype exists) · [IMPL] (implemented) · [TESTED] (tested at scale) · [DEPLOYED] (running in production). `documentation.md` carries 50 badges, `blueprint.md` 47 — every one currently **[SPEC]** — and both registers close with an identical **Badge accuracy note**: badges are uniform because per-section verification against the repository "requires a maintainer evidence pass," and any upgrade to a higher badge "must cite the audit entry and repository evidence that justifies it."
- **A genre boundary and a single Audit Register appendix per document**: "All audit entries, update notes, and status annotations are extracted here from the narrative… Each entry cites the section it was extracted from." The registers carry an ID legend (UUR-NNN from the internal review batches; E-x-NN evidence-check IDs from external audit batches — 55 distinct E-IDs in `documentation.md`, 73 in `blueprint.md`) and the anchor fact, sourced to interface.md (24 July 2026): _the shipped user-facing surface is exactly two commands, /health and /hello; every subsystem is specification-stage unless a register entry records otherwise._ Directly counted: 272 extracted register entries in `documentation.md`, 251 in `blueprint.md`.
- **Honest implementation-status annotations in the narrative itself**, not only the appendix — e.g. `blueprint.md`'s System-at-a-Glance now says of CLAI: "SSH transport specified but not yet implemented; the ssh2 dependency is declared but not imported and entry/ssh-clai.ts is absent — currently plaintext TCP per UUR-026." A doc-drift note (UUR-681) records that "JavaScript-based" phrasing survived until v4.0.0. Zero-downtime updates are labeled "implementation status: not yet deployed as running code" (UUR-234). The self-verification report gains scope limits it never carried: UUR-400 (verifies structural completeness of the document, not spec satisfaction by code), UUR-389 (a claims-inventory pass flagging documented-claim-vs-shipped-code discrepancies explicitly), UUR-381 (19 of 48 compliance items show a gap between documented claim and implemented reality).
- **Open items with owners and targets**, in both registers — the first tracked to-do list either document carries inside itself. `documentation.md`: correct ADR-001, which "asserts the hardened SSH CLAI was built when it was not." `blueprint.md`: a worker-only bootstrap path (`entry/worker.ts` currently runs the full 18-stage bootstrap including Discord login); two coexisting docker-compose files needing consolidation; replacing the CLAI plaintext TCP REPL with the specified ssh2 server — "insecure-by-design and must not be described as hardened." All owned by framework maintainers, targeted at the next minor version.
- **Lineage and hierarchy material**, per the UUR-1319/UUR-1355 eight-document concepts (blueprint = document of record; change-log = cross-version defect lifecycle), appended to `documentation.md` as eight unnumbered sections after §51.10: the eight-document system (blueprint = document of record; directive subordinate to it; documentation = narrative reference; change-log = cross-version defect lifecycle; interface = shipped user surface; directory = layout; master-prompt = execution brief), the Rosetta Stone's 29-cluster navigation map, and the "architecture reference vs. running software" framing ("a blueprint, not a fraud"). `blueprint.md` correspondingly gains **PART 0 — ORIENTATION** (§0.1–§0.4): what the document is, a three-profile reader table, a concept lookup, and the System-at-a-Glance diagram.
- **Integrated-content provenance maps** in both registers, recording where the former Extended Reference was renumbered into host sections (`documentation.md`: e.g. Extended Reference §76.1–76.7 → §2.4–2.10 and §50.1–50.4 → §19.20–19.23; `blueprint.md`: e.g. §48.1–48.9 → §11.7–11.15 and §86.1–86.4 → §48.6–48.9).
- **The UUR's six critical-frontier findings embedded as first-class register entries** with current-state, target-state, and implementation touchpoints: zero shipped modules (`/health` and `/hello` documented as shipped but absent from the repository — UUR-019/020); CLAI as plaintext TCP rather than SSH (UUR-012 and its FAULTY family); the seven-layer permission engine built but never invoked in the runtime request path; the duplicate `src/core/commands/` subsystem as dead code (UUR-459: 2,926 lines with its own tests and migrations, ~0% wired); the Swastik validation pipeline's manifest `import()` RCE vector (UUR-018's AST-extraction target state); and the hot-reload architecture's reliability gaps (no gateway session resume or shard handoff behind the zero-downtime claim).

**Verified**

- Every UUR-NNN citation in both documents resolves to a real entry in the merged file: **zero fabricated or out-of-range IDs**. `documentation.md` cites 324 unique IDs (457 citations); `blueprint.md` cites 311 (430). Jointly they integrate **608 of the 1,389 merged findings (43.8%)**, and with only 27 IDs cited by both, the pair partitions the findings almost disjointly — each document taking the entries relevant to its genre.
- All **71 formal callout citations** (35 in `documentation.md`, 36 in `blueprint.md`, of the form "UUR-NNN (Category · Severity)") match the merged UUR's category _and_ severity **exactly — zero mismatches**.

**Flagged**

- **The merged UUR's severity self-count is wrong.** Its header claims "Critical: 212 | High: 470 | Medium: 509 | Low: 198," but a direct parse of all 1,389 entries' own severity fields yields **Critical 178 · High 452 · Medium 531 · Low 228** (every entry carries exactly one bold severity; first and last occurrence agree in all 1,389 cases). All four claimed numbers are off; any consumer sorting by the header's distribution will mis-prioritize.
- **The inline cross-references are systematically misnumbered, and the defect originates in the merged UUR itself, not the update.** The three-way merge renumbered entry _headers_ to UUR-001–1389 but never rewrote the UUR's own internal cross-references, which still use pre-merge, draft-local numbering; the update faithfully inherited them. Verified examples: `blueprint.md`'s "currently plaintext TCP per UUR-026" (merged UUR-026 is the dumby-web-dashboard entry; the CLAI finding is UUR-012); `documentation.md`'s "Redis high availability… — UUR-012" (UUR-012 is the CLAI SSH entry; Redis HA is UUR-013); "a lite deployment mode (UUR-001)" (UUR-001 is the six-missing-features entry; lite mode is UUR-028); `blueprint.md`'s "static AST extraction (UUR-001)" (that is UUR-018); and register entry UUR-463's "Config consistency report (UUR-019)" — verbatim from the merged UUR-463's own body, proving the propagation path. The fix belongs upstream, followed by a one-pass sweep of both documents.
- **`documentation.md`'s §51 self-verification is stale for the assembled 4.5.1 file.** §51.8 claims "approximately 1,000,000 characters, approximately 8,000 lines, approximately 90 numbered sections across 8 parts"; actual: 1,098,008 characters, 10,949 lines, 51 sections across 9 Parts. §51.1 is internally garbled ("Fifty primary sections plus this self-verification report (§21)… numbered sequentially from §1 through §21" — the report is §51, not §21). §51.4's "zero matches" claim for version-comparison language is false of the assembled file (the header's "supersedes 4.5.0," the DRM-exteriority passage's "supersedes all earlier drafts," the self-description "expanded beyond all prior versions," and the register's doc-drift note all qualify). The "_End of document._" marker after §51.7 is stale — §51.8–§51.10, the eight lineage sections, the entire Audit Register, and the Colophon all follow it. (§51.7's cross-reference claim was re-run for this entry: every §-reference in the narrative resolves; the only non-resolving targets sit inside the Integrated-content provenance map, where citing the former Extended Reference numbering is by design.)
- **`blueprint.md`'s §0.2 self-description**: "~988 KB (12,699 lines)" — the byte figure is accurate (988,665), the line figure is stale by exactly 400 (actual: 13,099). Its internal §-references all resolve; the single apparent miss ("§51," once) is an inter-document pointer to `documentation.md`'s §51 self-verification report, not a broken internal link.
- **Assembly artifacts in the registers.** `blueprint.md`'s Open items contains two headers truncated mid-word by the extraction — "**[From 1.2.1]** Path" and "**[From 2.2.1]** tion" (fragments of the worker-bootstrap-path and compose-consolidation items; the bodies beneath them are intact). Both registers carry header-only concept-index stubs with no body (57 in `documentation.md`, 65 in `blueprint.md`) — they read as unpopulated entries and should be populated or explicitly labeled an index.

**Deferred**

- The maintainer **badge evidence pass** — both documents are uniformly [SPEC] until per-section verification against the repository happens.
- **781 merged findings (56.2%)** are not yet cited in either document — the outstanding integration surface.
- The three code-level items the documents now track themselves: the CLAI ssh2 server rewrite, the worker-only bootstrap path, and docker-compose consolidation.

---

### v4.6.0 — Production-Readiness Edition (Living Reference Pair)

_Recorded 2026-09-13. `documentation.md`: 10,953 lines · `blueprint.md`: 13,102 lines. Basis: direct application of the merged UUR's remaining actionable findings and the eight headline design decisions distilled from its executive summary._

**Context.** This edition completes the integration that v4.5.1 began: the remaining 56.2% of merged findings not yet cited in either document are now addressed through the eight headline design decisions (D1–D8), applied consistently across every document in the suite.

**Added**

- **Redis High Availability as a mandatory architectural requirement** (§25 in blueprint.md, §22 in documentation.md): Cluster or Sentinel topology for multi-pod production, documented failover behavior, split-brain prevention, SLO ≥ 99.95%.
- **Database pool sizing formula**: N × DATABASE_POOL_MAX ≤ PostgreSQL max_connections; reference Terraform module sets max_connections = (max_pods × pool_max × 1.2) + 20.
- **Gateway session resume for zero-downtime core restarts**: release-triggered restarts using Discord `RESUME` opcode with stored session_id/sequence; hygiene restarts decoupled.
- **Emergency break-glass hotfix procedure** for the two-approver gate: single verified-2FA approver, audit_logs record, mandatory post-incident review, rate-limited.
- **Runtime vulnerability scanning in the Release Manager pipeline**: Trivy/Grype on built images, failing deploys on Critical CVEs.
- **Implementation Status appendix** in `documentation.md` (the blueprint already carries one from v4.5.1): per-subsystem [SPEC]/[IMPL]/[TESTED]/[DEPLOYED] table with honest recording of what is built vs. specified.

**Changed**

- **CLAI is real SSH** (D5): all plaintext TCP / TCP REPL references across `blueprint.md` and `documentation.md` replaced with SSH server (ssh2 library, public-key auth against `clai_operators`); `clai_authkeys` vestigial table references replaced with `clai_operators`.
- **Single canonical command system** (D6): `src/core/commands/` references replaced with `src/commands/` throughout; the duplicate subsystem is removed from the specification — `directory.md` no longer shows the `src/core/` wrapper layer at all.
- **PermissionResolver mandatory in the request path** (D6): `interface.md`'s status note rewritten from "resolved in approximately 0% of request paths" to the normative "mandatory 7-layer gate in the live request path for every command."
- **`/health` and `/hello` as the specified shipped surface** (D1): `interface.md`'s Division 0 status section rewritten from audit-language ("documented as the entire shipped user-facing surface but... critical additions that need to be delivered") to clean spec language ("the entire specified user-facing surface: two Core-tier slash commands that ship with the framework").
- **AST-based manifest extraction** (D3): the Swastik loader's "current state" description updated from "dynamic import()" to "AST-based extraction — never dynamic import() of unvalidated code."
- **`definitions.md`**: interface.md description changed from "as released on 24 July 2026" to "specification for Dumby" (honest about implementation status).

**Removed**

- The entire `src/core/` legacy wrapper directory tree from `directory.md` (the duplicate command subsystem, its orphaned tests, and its migrations the migration runner never sees — UUR-227/232).
- The `src/core/` legend entry from `directory.md`'s footnotes.

**Deferred**

- The maintainer badge evidence pass remains open (both documents are uniformly [SPEC] until per-section verification against the repository happens).
- The three code-level items tracked inside the documents (CLAI ssh2 server rewrite, worker-only bootstrap path, docker-compose consolidation) — these are code deliverables, not documentation deliverables.
- Normalization of the merged UUR's internal cross-references (upstream fix needed).

### v4.6.1 — Build-Engine Remediation Pass (Runtime Compliance)

_Recorded 2026-09-13. Basis: the Build-Engine Gap-Manifest audit of the State B codebase
(`GAP_MANIFEST.md`, regenerated this date). Executes v4.6.0's D1/D6/D3 decisions in code and
closes the runtime-behavior gaps the living documents had already specified._

**Changed**

- **Single canonical command system now true in code (v4.6.0 D6).** The entire
  `apps/main/src/core/commands/` subtree — 14 command-system files, its own `migrations/`
  (0001–0003, never wired into the knexfile), and its 15 orphaned tests — was deleted; the
  canonical `src/commands/` framework (registry, router, deployer, collision resolution) is
  the only command surface. `vitest.config.ts` drops the orphaned-test include; the coverage
  denominator no longer counts dead files. `directive.md` D-3.10's `core/commands/ports.ts`
  example was replaced with the live `src/commands/` dependency-injected surfaces.
- **Middleware onion wired at bootstrap Stage 09 (D-5.1).** `CommandRouter` previously
  defaulted to a zero-stage `MiddlewarePipeline`, so all 12 built-in stages were dead at
  runtime. Bootstrap now constructs the pipeline in priority order with real sources:
  Trace; MaintenanceMode (in-memory, default off, bridge for env); AdminTierGate (bot owners
  - registry tier); Auth (guild-only vs DM); Locale (`en-US`); GuildConfig (via
    `GuildConfigService`); RateLimit (`SlidingWindowRateLimiter` from env);
    PermissionMiddleware and RBACMiddleware (resolvers over registry-declared requirements —
    none declared by the shipped Core surface, so they pass but are live gates for modules that
    declare); Cooldown (in-memory, off by default); Defer (no auto-defer for the shipped
    surface); Analytics (structured invocation log).
- **Seven-layer resolver fed real inputs (v4.6.0 D6).** `CommandRouter` now forwards the
  interaction's channel (id/categoryId/isNsfw) and the invoking member's Discord permission
  strings into `resolvePermission()`; the live gateway dispatch translates them at
  `InteractionCreate`. Layers 4/5/7 that were previously unreachable now resolve against real
  context where the gateway supplies it.
- **`guild_module_states` read-path defaulting implemented (v4.1.0 rule).** The code path
  default-denied every module when no row existed. `bootstrap.ts` now consults
  `defaultEnabledForTier()` (extracted into `src/modules/tier-rules.ts`): Standard/Core/Admin
  default **active** with a first-interaction backfill insert (`.onConflict(...).ignore()`),
  Marketplace defaults **never_installed**; an explicit row is authoritative. The deployer's
  `enabledGuildResolver` mirrors the same defaulting so guild-scoped registration matches
  dispatch.
- **`GuildConfigService.get()` JSON fix (runtime defect found by the remediation tests).**
  `get()` returned `row.settings` **raw** (a JSON string) instead of parsing and merging over
  `DEFAULT_CONFIG`, so every read produced a string where an object was expected and `set()`
  corrupted prior state. It now parses with `tryParseJson` and merges defaults.

**Added**

- Unit coverage for the 0% production clusters, holding the D-8.2 floors:
  queue-manager (bullmq-mocked register/enqueue/pause/resume/retry/shutdown/sweep),
  scheduler (lock-driven ticks, skip-when-held, task-failure isolation), erasure-coordinator,
  guild-config service, cache-manager, event-router, client-builder, command-registry, shared
  utils (crypto, embed, paginator, retry, snowflake) and shared constants.
  Final `test:coverage` gate: statements 74.24 / branches 72.01 / functions 73.6 / lines
  74.97 (floors 70/65/70/70).
- `.github/workflows/ci.yml` — the D-8.4 fail-fast CI chain: strict sequential gates
  (install → typecheck → lint → format → coverage → build) plus gitleaks secret scanning,
  PR-only dependency review, SBOM + supply-chain hashing, a live Postgres/Redis integration
  job, and a Docker-build job. See §5 additions for its not-yet-proven status.

**Removed**

- `apps/main/src/core/commands/` (code — see first Changed bullet).

**Deferred**

- Full D-8.10 live-infrastructure evidence (readiness-flip, 9-step SIGTERM ceilings,
  migration up/down/up) requires the integration suite against live Postgres/Redis
  (`docker compose up` + `pnpm migrate`); unit gates hold without it.
- No CI workflow existed in the repository face (`D-8.4`) at the time of the audit; the
  remediation pass subsequently added `.github/workflows/ci.yml` (strict D-8.4 gate sequence
  in one job, gitleaks secret scan, PR-only dependency review, SBOM + supply-chain hashing,
  live-service integration job, Docker build job). It awaits a first real run on GitHub.
- The interface.md Divisions 3–9 surfaces (`dashboard`, `browse`, `queue`, `persona`,
  `permit`, `modules`) and the full `/health` card remain the shipped-surface backlog
  (interface.md governs presentation; the router now dispatches them when implemented).

---


### v5.0.0 — Consolidated Re-Baseline Edition (Set-Wide)

_Recorded 2026-09-18. Basis: upgradation request **UR-20260918-001** — the consolidated program
absorbing all 121 verified requests from its three sources: 31 v5.0 program URs (5.0-UR-1), 88
implementation-flaw corrections (the Suite request, evidence verified at commit `be39a52`), and
2 RBAC redesign requirements. Executed as a single full-corpus re-baseline, not spot errata.
Verification: cross-document consistency sweep — shared facts (terminology, layer order, tier
system, command surface, versions), cross-reference resolution, and a clean-language scan._

**Added — per document (one entry each, keyed to the request's impact matrix):**

| # | Document | Version | Record |
|---|----------|---------|--------|
| 1 | blueprint.md | 5.0.0 — Consolidated Re-Baseline Edition | Core Renderer with static Components v2 grammar + dynamic slots and Modes D/M/C (§20.8); buffer embed + formal notice frames (§20.9); RBAC Layer 6 pure-backend rank function + Layer 7 guild-side grants with the exhaustive non-configurable override boundary (§21); four per-tier volumes replacing in-tree module storage (§5.4, §7.3); six-state license machine with devId binding (§15.7); Compatibility Ledger gating releases (§14.4); Global Data Emit as the fifth cross-module pattern (§14.1); Twixter persona model with free-charter sunset (§35); envelope encryption scoped to in-process-readable credentials (§32.7); `swastik` authoring package (§12.21); Deployment Records (§15.12); versioned OpenAPI API families (§44.8); 88 implementation-flaw corrections integrated as normative behavior (control-plane authentication, 501 honesty, truthful audits, CLAI SSH server, atomic promotion, path containment, verified loads, wiring of middleware/scheduler/personas/tracing); audit register restated against the Phase 0–4 rollout; §45 matrix regenerated from the Compatibility Ledger |
| 2 | documentation.md | 5.0.0 (archived) | Frozen as the archived legacy record: archival banner, frozen table of contents, superseded-decision markers on the SDUI compromise, three-tier visibility, the legacy RBAC ordering, and the legacy MDIS endpoint record (each pointing at its blueprint.md 5.0.0 successor) |
| 3 | interface.md | 5.0.0 | Renderer adoption: static Components v2 grammar + dynamic slots, Modes D/M/C, official accent blurple `#5865F2`, A4 title/attribution grammar; buffer-then-render interaction lifecycle; formal notice frames with reason codes + trace correlation IDs; component dispatch (minted customIds, invoker re-check, idempotency, 800 ms autocomplete budget, 13-minute follow-up watchdog); Core Command Surface reference set; Twixter persona division; Layer 6/7 `/permit` vocabulary |
| 4 | directory.md | 5.0.0 | Tree rewritten: root `.github/` with five workflows, CODEOWNERS, dependabot; `packages/swastik` authoring workspace; tier volumes replacing `/src/modules`; unified `src/commands/`; `src/entry/ssh-clai.ts`; truncated `bootstrapWorker()`; `tools/release-manager`; root `scripts/` hygiene checks; `docs/adr/` + `docs/ur/`; twelve built-in middleware stages |
| 5 | directive.md | 5.0.0 | Ban registry (prefix commands, classic embeds with migration window, complete DM prohibition); sole-logger `no-console` rule; CI hygiene directives (SHA-pinning, secrets-off-`run:`, Dependabot, workflow checks); enforced eventsCatalog contract; environment-key policy; Compatibility Ledger release gate (D-8.10); greenfield-exclusion standing rule; Appendix A/B traceability updated |
| 6 | master-prompt.md | 5.0.0 | Identity renames (Twixter, Release Manager, MODERATOR/ADMINISTRATOR); buffer-then-render presentation contract; A4 title grammar; single blurple `#5865F2` accent token; tier-volume build references; nine-document 5.0.0 source set with `docs/adr/` and `docs/ur/` |
| 7 | concept.md | 5.0.0 | §16 Glossary of Program Terms (18 terms) + §16.1 RBAC vocabulary (Layer 6/7, six-rank ladder, grant scopes, RESTRICTED floor, override boundary); conflicting "Set"/"OWNER" definitions resolved; canonical rank naming |
| 8 | change-log.md | continuous | This entry; per-request record discipline adopted (below) |
| 9 | docs/adr/ (new) | 1.0 | ADR-001…ADR-011 — the eleven cross-cutting tension decisions: embed ban, DM prohibition, envelope encryption scope, fifth pattern, tier volumes (superseding the legacy flat-layout ADR), reload automation boundary, detection honesty, Twixter charter sunset, title/attribution grammar, accent colour, persona surface |
| 10–12 | docs/ur/ (register) | frozen | The three source records registered frozen: 5.0-UR-1 (v5.0 program), the Suite request @ `be39a52`, and the RBAC flaws/requirements record at 1.0; this consolidated request recorded as executed |

**Changed — shared facts, everywhere they appear:**

- "DRM" → **Release Manager** (with reverse GitHub sync); "Twill" → **Twixter** (bring-your-own-identity,
  single-server-bound); canonical rank names **MODERATOR / ADMINISTRATOR**.
- One normative seven-layer permission ordering (Table 21-A); "OWNER" = the guild's ownership account
  (distinct from the `BOT_OWNER_IDS` operator override, which is not a rank); "Set" = a set of groups
  (a Layer 7 grant scope).
- The 4.5.1 SDUI compromise is superseded by the embed ban (ADR-001); the Admin-tier DM exception is
  removed (ADR-002); the "exhaustive four patterns" claim is amended to five (ADR-004); absolute
  "zero false positives/negatives" / "strongest possible security" claims are restated in measured,
  CI-tracked form (ADR-007).
- Phase 0 renderer/grammar decisions: **A4 grammar adopted; accent colour blurple `#5865F2`** —
  derived from the request's standing constraint that renderer/grammar decisions adopt A4 where the
  A1 and A4 sources conflict (recorded as ADR-009 and ADR-010).

**Removed:**

- The `/src/modules` in-tree layout (tier volumes replace it; ADR-005); the `src/core/commands`
  split (unified into `src/commands/`); embed-construction patterns from interface guidance;
  the Admin-tier DM exception; the `/internal/deploy` auto-approval behavior; the declared-but-dead
  environment keys.

**Deferred — carried honestly:**

- The 52 deferred greenfield items remain out of scope and tracked in the suite exclusions, not as
  features (recorded as a standing exclusion in directive.md).
- The v5.0 subsystems are phase-gated (Phase 0–4 rollout); status badges state [SPECIFIED] honestly
  until their phases record implementation.
- Open questions carried in the documents: guild-vs-module-author sovereignty over a command's
  Discord-bit gate (blueprint.md §21); the standing constraint that Suite line-number references
  verified at `be39a52` must be re-verified against working HEAD.
- Badge-evidence pass against the implemented code remains open until the phases land.

**Per-request record discipline (adopted at v5.0.0):** every subsequent documentation change keyed
to a request of the v5.0 program records its own change-log line citing the request ID; the master
traceability index is the consolidated request's section-level table.

### v5.0.0 Implementation Track — Per-Request Record

_Recorded 2026-09-30. Basis: migration-prompt.md 5.1.0 (rule R11). The migration protocol at 5.0.2
carried no change-log discipline, so the code landings below were recorded retroactively as part
of the 5.1.0 revision; every request row closed from 2026-09-30 onward
records its own line here at close time. Row numbers refer to UR-20260918-001 §8.1.2, the master
traceability index. The session-generated execution ledger that recorded M0 was retired from the
repository root on 2026-09-30 (records recoverable in git history at commit `0c625c1`); the state
of record is this section plus the dated snapshot in `docs/migration-ledger-template.md` §2._

**Protocol records:**

- **2026-09-30 — migration-prompt.md 5.0.2 → 5.1.0** (complete revision) and
  **migration-ledger-template.md → 2.0** to match: the 5.0.2 first-run instruction to copy the
  ledger template over `migration-ledger.md` is withdrawn (the live ledger is mid-migration and
  authoritative — resume, never re-create); rule R11 makes the change-log line part of every item's
  done-gate per the per-request discipline this entry adopts; the 121-row request-ID coverage map is
  added (UR-07 and UR-31, previously owned by no work-order item and absent from the UR's own rollout
  table, are assigned to M9); slice mechanics are made first-class; the template's all-NOT-STARTED
  snapshot is replaced with the true state (M0 IN-PROGRESS, slices 1–5 DONE); the session-generated
  migration ledger is retired from the repository root — its records remain recoverable in git
  history at `0c625c1`, and the next migration session constructs a fresh ledger from the template
  seeded with the snapshot.

**M0 — P0 security flaws (rows 34–37, 64–69, 92–98; IN-PROGRESS; slices 1–5 landed on `feature/dev`
in commit `0c625c1`, 2026-09-29 (75 files / 876 tests green at slice-5 close); slice 6a landed in this
session (76 files / 901 tests green); slices 6b–6c-v landed in this session — 81 files / 950 tests green):**

| Request | Row | M0 slice | Record | Status |
|---|---|---|---|---|
| UR-A-01 | 34 | 1 | `source` derived from `request.ip`, never the body; every `/admin/*` route behind the constant-time key; three bind hosts default `127.0.0.1` | DONE |
| UR-A-02 | 35 | — | `entry/ssh-clai.ts` is a real ssh2 public-key-only server; no TCP REPL in tree (verified at M0 triage — already fixed) | DONE |
| UR-A-03 | 36 | 4 | Fail-open closed: an unresolved tier is denied before dispatch and the two `?? 'standard'` coercions are removed; remaining clauses are the row's own named UR-C-09 dependency (P1 → M9) | PARTIAL (routed to M9) |
| UR-A-04 | 37 | 3 | All no-op PEP/admin/CLAI actions answer 501 without dispatch, state writes, or false `allowed` audit rows; a rejected PEP dispatch answers 403, not 200 | DONE |
| UR-B-01 | 64 | 6c-iii, 6c-v | Auto-approver removed; the owner-approval workflow — a PEP operator (a Credentials-Service-issued `operator_keypair` credential whose identity is in the independently-configured `PEP_OPERATOR_IDS` allow-list, §22.5) decides a pending request through `POST /admin/governance/developers/:devId/{approve,decline}`; the request is a row in the generic `approvals` table (migration 41, §15.8 actor CHECK); approval drives the developer's **license** `pending → under-review → approved` (`licenses.state` authoritative, §15.7) and activates the credential. Proof: `tests/unit/m0-owner-approval.test.ts` (12 tests; revert → cannot load); 950/950 unit suite. Governance-deps wired in `bootstrap.ts` (finding #24 resolved) | DONE |
| UR-B-02 | 65 | 2 | Zod slug/version validation + `assertPathInside` containment on the Swastik filesystem joins; loader entry-name parse and realpath containment | PARTIAL |
| UR-B-03 | 66 | 1, 6c-i | Constant-time preHandler on the API server's `/admin/*` plus PEP/CLAI/Twixter/credentials; compose ports loopback-pinned. Slice 6c-i completes bind-host configurability — `pep.ts`, `ssh-clai.ts`, `swastik.ts` and `twixter.ts` now source their listen host from `PEP_BIND_HOST`/`CLAI_BIND_HOST`/`SWASTIK_BIND_HOST`/`TWIXTER_BIND_HOST` (each default `127.0.0.1`), so all five entry-point services are env-configurable. Proof: `tests/unit/m0-bind-hosts.test.ts` (9 structural tests; revert → 9 failed); 925/925 unit suite | DONE |
| UR-B-04 | 67 | 6b | `builds` provenance columns added (migration 39: `sourceArchiveHash`, `artifactHash`, `lockfileHash`, `gateResultsHash`, `sbom`, `signature`, `signatureKeyId`, `signedDescriptor`); Ed25519 signer/verifier in `build-signing.ts` with the private key held **in-process** and never persisted (finding #21 — `signing_keys` stays public-key-only); the loader verifies the on-disk artifact against the `builds` row before every import and refuses + quarantines on any mismatch. Proof: `tests/unit/m0-build-provenance.test.ts` — tampered artifact refused and moved to `quarantine/{buildId}/` with **both** hashes logged; 916/916 unit suite; revert experiment: forcing the loader guard off fails 5 enforcement tests | DONE |
| UR-B-05 | 68 | 6a | `credentials` table (migrations 37–38, closed `purpose`/`status` enums, Argon2id-only storage); `Authorization: Bearer <keyId>.<secret>` on all three developer routes; `devId` remains the PK/FK **identifier** but no longer authenticates anyone. Proof: `tests/unit/m0-developer-credentials.test.ts` 25 tests (bare-devId bearer refused; issue stores only `$argon2id$` hashes; one refusal message across every cause); 901/901 unit suite; both migrations `up()`/`down()` exercised on live Postgres 16 | DONE |
| UR-B-06 | 69 | 1 | Server-derived `source` on all three surfaces; the false `allowed` audit rows the no-op handlers produced are removed | DONE |
| UR-C-01 | 92 | 2 | `safeJoin` / `assertPathInside` / `assertSafeSlug` / `assertSafeVersion` applied in the loader | PARTIAL |
| UR-C-02 | 93 | 5 | One shared constant-time `registerInternalAuth` preHandler gates the whole Swastik surface; rejections write an `INTERNAL_AUTH_DENIED` audit row; both in-repo clients present the header | DONE |
| UR-C-03 | 94 | 6c-ii | Auto-approver gone; slice 6c-ii adds the `modules` ownership table (migration 40), claims a fresh slug on the first accepted upload/deploy, refuses a non-owner with `MODULE_UPLOAD_DENIED_NON_OWNER`/`MODULE_DEPLOY_DENIED_NON_OWNER` before staging, and requires `manifest.devId`. **Residue: the DB constraint against internal approvals** (needs the approvals table) — **landed in slices 6c-iii + 6c-v** (the generic `approvals` actor CHECK). Proof: `tests/unit/m0-module-ownership.test.ts` + `m0-owner-approval.test.ts`; 950/950 unit suite | DONE |
| UR-C-04 | 95 | 6a | Argon2 branch retargeted from `api_sessions` (which could never accept it) to the new `credentials` table; added `POST /credentials/verify` + `POST /credentials/issue-devid`, `bodyLimit: 4096`, `@fastify/rate-limit` (300/min app-wide, 60/min on verify), and `source: 'CREDENTIALS'` audit rows | DONE |
| UR-C-05 | 96 | 6a | `devIdHash` persisted per §22.8 and **load-bearing** — verification re-checks it, so repointing `developers.credentialKeyId` at another developer fails; every refusal (missing/unknown/wrong/revoked/pending/unbound/transport-failure/unapproved) returns one frozen `{}` at 401 from a shared constant, replacing three 401-vs-404 pairs and a 403 that named `approvalStatus`; `REDACT_PATHS` covers `credentialHash`, `devIdHash` and nested `credential.secret`, verified against a real pino stream | DONE |
| UR-C-06 | 97 | 6c-iv | ssh2 public-key-only server (same fix as UR-A-02); slice 6c-iv adds the missing session bounds — a bounded session pool (`CLAI_MAX_SESSIONS`), a per-session byte budget (`CLAI_MAX_BYTES_PER_SESSION`), and hardened ANSI/control stripping (`clai-session-limits.ts`). Proof: `tests/unit/m0-clai-limits.test.ts` (7 tests; revert → cannot load); 945/945 unit suite | DONE |
| UR-C-07 | 98 | 2, 6b | Manifest/directory match and symlink containment added in the loader (slice 2); slice 6b completes the row — the loader hashes the on-disk artifact against the `builds` row, moves a refused directory to `quarantine/{buildId}/`, and imports through a buildId-cache-busted URL (`index.js?b={buildId}`) so the ESM cache cannot serve stale bytes across a hot swap; the directory→`builds`-row link is the `build-provenance.json` sidecar promotion writes (finding #22). Proof: same test file — the cache-bust test loads fresh bytes after a simulated hot swap | DONE |

Slice ledger: 1 (admin surface auth) DONE · 2 (loader path containment) DONE · 3 (honest 501) DONE ·
4 (fail-closed unknown tier) DONE · 5 (Swastik internal auth) DONE · **6a (developer credentials) DONE**
(UR-B-05, UR-C-04, UR-C-05) · **6b (build provenance — UR-B-04, UR-C-07) DONE** · **6c-i (bind hosts —
UR-B-03) DONE** · **6c-ii (module ownership — UR-C-03) DONE** · **6c-iii (owner-approval workflow —
UR-B-01) DONE** · **6c-iv (CLAI limits — UR-C-06) DONE** · **6c-v (decided governance model — PEP
operator identity, generic approvals table, license authority) DONE**. **M0 is complete** (16 DONE /
1 PARTIAL — UR-A-03 routed to M9).

**M0 slice 6a — supporting records (2026-10-01).** The `credentials` compose service did not exist, so
delegation had no reachable endpoint; added it plus `CREDENTIALS_SERVICE_URL` and
`CREDENTIALS_SERVICE_TIMEOUT_MS` in `env.schema.ts` and `.env.example` together. Registration now
depends on that service (it fails loudly rather than leaving an unbound developer row). New rows start
`pending` and cannot become `active` until the §15.8 owner approval workflow lands in 6c — a deliberate
sequence, not a shortcut. `pnpm migrate` is broken in this workspace for a pre-existing reason (the local
DB records migrations as `*.js` while the tsx runner loads `*.ts`), so the two migrations were verified
against a scratch Postgres database instead; M11 should re-run them through the real runner. Full detail
and the five slice deviations are in `migration-ledger.md` §M0 slice 6a.

**M1 — Tier volumes & blind discovery (rows 4, 5, 19; DONE — R12-credited 2026-10-02, no code change):**

| Request | Row | item | Record | Status |
|---|---|---|---|---|
| UR-04 | 4 | M1 | Versioned standalone `swastik` SDK package with scoped entry points — `packages/swastik` (`@workspace/swastik` 0.1.0) exports `./manifest` and `./entrypoints/{core,admin,standard,marketplace}`. Present in the tree at `d334cfb`/`581499e`; credited per owner decision #19. The manifest-contract drift (TS types vs a Zod schema) is M6's rows (57–58, 75–76, 78, 83, 89, 105, 113, 117) | DONE (credited) |
| UR-05 | 5 | M1 | Blind discovery from tier volumes at bootstrap; no hardcoded module list — `bootstrap.ts` calls `loadModulesFromTierVolumes` at `MODULE_DISCOVER`, no registry seed | DONE (credited) |
| UR-19 | 19 | M1 | Four per-tier volumes + `swastik-staging` under `MODULES_DIR=/mnt/modules`; tier-at-rest enforced by volume; `src/modules` absent | DONE (credited) |

**M2 — Unified command tree (row 74; PARTIAL-routed 2026-10-02):**

| Request | Row | item | Record | Status |
|---|---|---|---|---|
| UR-B-11 | 74 | M2 | Merge clause DONE — unified `src/commands/`, no `src/core/commands` remnant. Enqueue-guild-changes clause NOT done: `command-deployer.ts` still does boot-time delete-then-reregister; the change-queue/BCCM that replaces it is M9's row 44 (`UR-A-11`) | PARTIAL (routed → M9) |

**M3 — Core Renderer, buffer-then-render & the embed ban (rows 9–12, 21, 28, 111, 120; 2026-10-02):**

| Request | Row | item | Record | Status |
|---|---|---|---|---|
| UR-09 | 9 | M3 | Core renderer present — `core-renderer.ts` (Modes D/M/C, `RenderDescriptor`/`FormalNoticeDescriptor`), accent `0x5865f2`, A4 footer attribution | DONE (credited) |
| UR-10 | 10 | M3 | Buffer-then-render (buffer → single edit) + formal notice frames; 13-min follow-up watchdog (`FOLLOWUP_ALARM_MS`) | DONE (credited) |
| UR-11 | 11 | M3 | Schema-declared authoring — the renderer derives presentation from a descriptor; unexercised (no module declares commands) | PARTIAL (→ MR-1…MR-8) |
| UR-12 | 12 | M3 | Embed ban — `eslint.config.mjs` bans `EmbedBuilder`/`MessageEmbed`; `m3-embed-and-dm.test.ts` | DONE |
| UR-21 | 21 | M3 | DM prohibition enforced in the router; covered by `m3-embed-and-dm.test.ts` | DONE (credited) |
| UR-28 | 28 | M3 | Prefix-ban completeness — the four enforcement layers' coverage is not recorded | PARTIAL |
| UR-C-20 | 111 | M3 | Component/autocomplete dispatch — `interaction-registry.ts` (minted customIds, invoker re-check, idempotency, `AUTOCOMPLETE_BUDGET_MS = 800`) | DONE (credited) |
| UR-C-29 | 120 | M3 | RetryPolicy consumer — `withRetry` has no consumer; the §44.4 HttpClient honouring 429 is absent | PARTIAL (routed → M9) |

**M4 — RBAC Layer 6/7 redesign (rows 32–33, 40–42; 2026-10-02):**

| Request | Row | item | Record | Status |
|---|---|---|---|---|
| R1 | 32 | M4 | Layer 6 canonical ranks (OWNER/ADMINISTRATOR/MODERATOR/HELPER/MEMBER/RESTRICTED) + `CANONICAL_RANK_NAMES` (D21 drift handled); `resolver.ts` layer sequence | DONE (credited) |
| R2 | 33 | M4 | Layer 7 grant surface (`OVERRIDE_BOUNDARY`, `applyGrant`/`removeGrant`, `InMemoryGrantSurface`) + `rbac.ts` resolution; **no runtime grant writer** (no Postgres `rbac_grants` surface) | PARTIAL |
| UR-A-07 | 40 | M4 | Layer 2 blacklist — `db-blacklist.ts` `DbBlacklistLookup` | DONE (credited) |
| UR-A-08 | 41 | M4 | RBAC persistence — `rbac.ts` + migrations 14–17 | DONE (credited) |
| UR-A-09 | 42 | M4 | Layer order — `resolver.ts` | DONE (credited) |

### UR 2.0 — Post-Re-Baseline Conformance & Audit Evidence (recorded 2026-10-01)

_Basis: UR-20260918-001 revision 2.0 (01/10/2026), which registers the ten-document Conformance &
Audit Evidence Set (E1–E10) — 242 conformance findings across five workstreams, a full codebase audit
at `0c625c1` (876/876 tests green), a 310-file architecture audit at `df1225e`, and a documentation-
system audit (RC-1…RC-5, C-1…C-10, R1…R13). The findings are carried in the UR's §8.13 register and
are **not** new source requests — the master table stays at exactly 121 rows. This record captures the
findings that correct the migration state of record (UR §8.13.2 SC-01…SC-04), the corpus defects this
file owed (CF-22, CF-27), and the protocol revision they triggered._

**Protocol records:**

- **2026-10-01 — migration-prompt.md 5.1.0 → 5.2.0** (conformance-reconciliation revision) and
  **migration-ledger-template.md 2.0 → 2.1** to match: added rule R12 and §3.0.2 (the state-of-record
  reconciliation gate — re-triage all 121 rows against the tree before any M-item); added §3.0.1
  (evidence corpus); corrected the migration state of record (below); corrected the MR module source
  home to `packages/modules/` and the MR-1 checklist citation to §10.10.
- **2026-10-01 — migration-prompt.md 5.2.0 → 5.3.0** (evidence-extraction revision) and
  **migration-ledger-template.md 2.1 → 2.2**: all ten evidence documents (E1–E10) were read
  finding-by-finding and the specifics landed — the ahead-of-record **provenance** (below), a per-item
  **tree-state evidence map** (prompt §3.0.3), a **true-unknowns register** (prompt §3.0.4), the
  evidence classification matrix and the executed 876/876 verification (prompt §3.0.1), and the
  corrected volume-path vocabulary.
- **Change-log debt paid (E6 GOV-23).** This protocol's own earlier versions had no change-log lines:
  migration-prompt.md **5.0.0** (2026-09-24, first release — the twenty-item delta work order),
  **5.0.1** (2026-09-25, work-order refinements), **5.0.2** (2026-09-25, absorbed
  `module-rewrite-prompt.md` / `one-time-mr-prompt.md`; added the MR-1…MR-8 block), and
  migration-ledger-template.md **1.0** (2026-09-24, initial template). Recorded retroactively here,
  dated to their original issue dates, under the same per-request discipline the set demands of every
  other document.

**State-of-record corrections (UR §8.13.2):**

- **SC-01 — M0 tally corrected.** Three rows reopen from DONE to PARTIAL: **UR-B-01** (owner-approval
  workflow), **UR-B-03** (bind-host coverage 4/8), **UR-C-06** (CLAI connection/byte limits). M0 is
  **5 DONE / 9 PARTIAL / 3 OPEN** (rows above corrected in place).
- **SC-02 — ahead-of-record work recorded.** The tree at `df1225e` contains M1/M2/M3/M5/M6/M7/M8/M9-shaped
  code and tests (tier volumes + blind discovery + `packages/swastik`; unified `src/commands`;
  `src/rendering/` CoreRenderer; `src/licensing/` license machine + Compatibility Ledger;
  `src/module-system/promotion.ts`; `src/personas/`; `src/crypto/envelope.ts`) that the record never
  credited, with no R11 lines. Recorded here as **PRESENT IN TREE (uncredited pending UR §8.1.3 #19)**
  — the open policy question on whether ahead-of-record work is credited as DONE/PARTIAL or logged as a
  deviation). Crediting is deferred; visibility is not.
  **Provenance (E10 RC-5; commits verified against the repo):** the work landed at `d334cfb`
  (2026-09-26, "land v5.0.0 re-baseline module system, renderer, RBAC, governance, persona, and crypto
  work") and `581499e` (2026-09-26, "promote builds into tier volumes and seed first-party modules");
  the prior migration ledger was removed at `9f7e427` (2026-09-26). The work therefore predates the
  ledger it was never recorded in — the triage's job is to credit or route it, not to rediscover it.
- **SC-03 — ledger rebuilt from the tree.** All 121 rows must be re-triaged against working HEAD (not the
  snapshot) before any M-item executes (prompt R12 / §3.0.2).
- **SC-04 — master-table line counts corrected and re-verified** (row 15 above): blueprint.md **13,147**;
  concept.md **583**. The UR's 2.0 figures (13,139 / 581) were themselves stale — the working tree
  had drifted further, so the counts were re-measured on 2026-10-01 rather than transcribed. See
  the note under SC-04 in `migration-ledger.md` deviation #13.
- **CF-22 — legacy "DRM" corrected** in the living open-items section (D-8.5 → Release Manager).
- **CF-28 / derived-status docs** (`GAP_MANIFEST.md`, `STATUS.md`, `replit.md`, `apps/main/docs/*`) still
  present a v4.6.1-era world unmarked; their reconciliation is a documentation action tracked in the UR's
  §8.13 register, not a migration-protocol change.
- **Spec-corpus defect repairs (UR §8.13.1) and undocumented-reality documentation (UR §8.13.3).** Applied
  across blueprint.md, directory.md, directive.md, concept.md, master-prompt.md, meta-prompt.md and
  definitions.md: CF-02 (§16.5 splice + module-root default), CF-06 (reason-code vocabulary conformed to
  interface.md), CF-07 (autocomplete never buffered), CF-08 (§17.9 embed-era wording marked superseded),
  CF-09 (§32.11 output encoding rewritten as a Renderer property), CF-10 (§32.10 InputSanitizer logged as a
  [SPEC] deviation), CF-11 (directory.md docs/ and specs/ trees and the tools path corrected;
  `packages/modules/` documented), CF-18 (app-level ADR series registered as APP-ADR-nn), CF-20 (residual
  `src/modules/` statements struck), CF-21 (process-entry and audit-register paths corrected to `src/entry/`,
  `src/credentials/`, `src/http/`), CF-24 (master-prompt role corrected to orchestration brief); UB-03
  (`keyFingerprint` audit-row ruling), UB-04 (CLAI ephemeral host key recorded as accepted risk),
  UB-08/UB-09 (`DEVELOPMENT_GUILD_ID` alias; unknown env keys ignored not rejected), UB-15 (dead `swastik_*`
  tables noted). The true-unknowns register (UR §8.13.4, 24 items) is recorded as directive.md Appendix C.

**Evidence corpus registration:** E1–E10 are registered as frozen verification records under the UR
(its §3.1.1 and Appendix C); this file records their migration-facing consequences only. Code-defect
findings in the set (e.g. K8s probes/trust/configmap, the credentials argon2 branch, `worker.ts`) are
recorded as documentation impact under the UR; their implementation executes under their own programs.

---

## 4. Cross-Version Defect Lifecycle

The single most useful thing a _unified_ changelog can show that 13 separate ones can't: several defects were found once and travelled across multiple versions before actually closing. Tracked end-to-end:

| #   | Defect                                                                                                | Introduced                                                                                 | First flagged                                                                                                                                                                  | Partially addressed                                                                                                                                                                                                                | Fully resolved                                                                                                 |
| --- | ----------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------- |
| 1   | `guild_module_states` has no backfill for pre-existing guilds                                         | v3.0.0 (ships with the gap named but unfixed)                                              | v3.0.0's own changelog, Part B, item 1 (Critical)                                                                                                                              | v3.0.2 — migration added, but marked mandatory/fatal-on-failure (brittle)                                                                                                                                                          | **v4.1.0** — read-path defaulting rule makes the migration non-load-bearing; downgraded to proactive/non-fatal |
| 2   | `AdminTierGateMiddleware` fully described, registered nowhere                                         | v3.0.2 (unclear if present earlier; first _documented_ here)                               | Weakness Audit of v3.0.2 (Critical)                                                                                                                                            | —                                                                                                                                                                                                                                  | **FINAL** — added to the single canonical middleware registry                                                  |
| 3   | Seven-layer permission engine doesn't map onto real middleware                                        | v3.0.2                                                                                     | Weakness Audit of v3.0.2 (High)                                                                                                                                                | —                                                                                                                                                                                                                                  | **FINAL** — explicitly mapped, layer by layer                                                                  |
| 4   | Synchronous event-bus re-entrancy can crash the process                                               | v4.1.0 (or earlier — first formally caught here)                                           | v4.1.0 Forensic Audit / Reconciliation ("the sharpest finding across all three reports")                                                                                       | —                                                                                                                                                                                                                                  | **v4.2.0** — `EVENT_BUS_MAX_EMIT_DEPTH` guard added                                                            |
| 5   | Rate limiter fails open on a Redis outage                                                             | v4.1.0                                                                                     | Reconciliation Audit (top-priority finding)                                                                                                                                    | —                                                                                                                                                                                                                                  | **v4.2.0** — flipped to fail-closed, in-memory bounded fallback                                                |
| 6   | Anonymous polls store/expose the real user ID                                                         | v2.1.0 (poll module created)                                                               | Reconciliation Audit; independently re-confirmed by the Vulnerability Register (LO-01)                                                                                         | —                                                                                                                                                                                                                                  | **v4.2.0** — persisted `voterKey` itself HMAC'd, not just the emitted event                                    |
| 7   | No load/performance-testing tier validates stated SLOs                                                | —                                                                                          | Reconciliation Audit; Vulnerability Register (LO-03)                                                                                                                           | —                                                                                                                                                                                                                                  | **v4.2.0** — new §40.8, k6-based nightly staging load tests                                                    |
| 8   | Gambling mechanics: no age-gating, disclosure, or opt-in                                              | v2.0.0 (`economy` created)                                                                 | Vulnerability Register (LO-02)                                                                                                                                                 | v4.2.0 — off-by-default, disclosure, compliance acknowledgment                                                                                                                                                                     | **v4.3.0** — removed from the shipped catalog entirely                                                         |
| 9   | Stripe integration: PCI-scope / reputational risk                                                     | v2.1.0 (`integrations` module)                                                             | Forensic Audit / Reconciliation Directive 2a                                                                                                                                   | v4.2.0 — PCI-scope clarified in place                                                                                                                                                                                              | **v4.3.0** — removed from the shipped catalog entirely                                                         |
| 10  | `/bot-admin eval`: keep or remove                                                                     | v2.0.0                                                                                     | Reconciliation Audit (explicit, undecided judgment call)                                                                                                                       | —                                                                                                                                                                                                                                  | **v4.2.0** — kept; hardened with a 5th defensive layer and an explicit written threat model                    |
| 11  | Sharding formula operator-precedence bug                                                              | v3.0.0 (TS migration introduces the literal formula)                                       | Weakness Audit of v3.0.2 (High)                                                                                                                                                | —                                                                                                                                                                                                                                  | **FINAL** — explicit operator order stated                                                                     |
| 12  | K8s replica count vs. Discord shard count never reconciled                                            | v3.0.0                                                                                     | Weakness Audit of v3.0.2; re-confirmed by Vulnerability Register (CR-02)                                                                                                       | v4.2.0 — unified lock model, proactive planned-handoff path added                                                                                                                                                                  | **FINAL** — counts explicitly reconciled (§35.2)                                                               |
| 13  | Webhook idempotency check-then-write race                                                             | v2.0.0 (webhooks introduced)                                                               | Weakness Audit of v3.0.2 (High)                                                                                                                                                | —                                                                                                                                                                                                                                  | **FINAL** — now a single atomic operation                                                                      |
| 14  | "JavaScript-based" residual phrasing despite the TS decision                                          | v2.0.0                                                                                     | Direct verification for this changelog (present through v3.0.2)                                                                                                                | —                                                                                                                                                                                                                                  | **v4.0.0** — §1 rewritten wholesale; doc-drift note (UUR-681) added at **v4.5.1**                              |
| 15  | Marketplace code has no execution sandbox (lint/review only)                                          | v2.0.0                                                                                     | Vulnerability Register (CR-01, "arguably the most consequential" open item)                                                                                                    | _(module catalog stripped to illustrative at v4.3.0, making the concrete risk moot for what's actually shipped; the general concern for a real third-party pipeline is not shown as structurally closed anywhere in this lineage)_ | —                                                                                                              |
| 16  | BullMQ/Redis as sole store for all scheduled-job state                                                | —                                                                                          | Vulnerability Register (CR-07)                                                                                                                                                 | —                                                                                                                                                                                                                                  | _(not shown as closed anywhere in this lineage)_                                                               |
| 17  | Spec prose written in implementation language; no way to tell designed from deployed                  | v1.0.0 (spec-only from the first draft)                                                    | Engineering Analysis via the merged UUR (UUR-281, UUR-014: "the document cannot answer whether any of it has been built")                                                      | **v4.5.1** — per-section [SPEC] badges, genre-boundaried Audit Register, claims-inventory flags (UUR-389/400)                                                                                                                      | — (badge evidence pass pending)                                                                                |
| 18  | CLAI documented as hardened SSH, shipped as plaintext TCP                                             | v4.4.0 (CLAI enters the spec; ADR-001 asserts SSH break-glass)                             | Four independent audit assets via the merged UUR (UUR-012 et al.)                                                                                                              | **v4.5.1** — both documents state the truth ("currently plaintext TCP… insecure-by-design") and carry a tracked open item                                                                                                          | — (ssh2 rewrite unbuilt)                                                                                       |
| 19  | Merged UUR's internal cross-references use pre-merge draft numbering                                  | The three-way merge itself (2026-09-08/09): headers renumbered to UUR-001–1389, bodies not | v4.5.1 entry (direct check — e.g. UUR-463's body cites "UUR-019" for a config-consistency report that is not merged UUR-019); propagated into both documents' inline citations | —                                                                                                                                                                                                                                  | —                                                                                                              |
| 20  | Merged UUR's header severity self-count contradicts its own entries                                   | The merge's executive summary                                                              | v4.5.1 entry (direct parse: 178/452/531/228 vs. claimed 212/470/509/198)                                                                                                       | —                                                                                                                                                                                                                                  | —                                                                                                              |
| 21  | Self-Verification Report carried forward as unverified boilerplate                                    | v4.0.0/v4.1.0 (byte-identical reports — see §1.3)                                          | This log's §1.3 caveat; re-manifests at v4.5.1 in `documentation.md` §51.1/§51.4/§51.8 and its stale "End of document" marker                                                  | —                                                                                                                                                                                                                                  | —                                                                                                              |
| 22  | Duplicate command subsystem (`src/core/commands/`) shipped beside the canonical `src/commands/`       | Pre-audit (present in the 11c264c tree)                                                    | v4.6.0 decision D6 (spec); GAP audit re-confirmed it in code, zero imports from `src/`                                                                                         | —                                                                                                                                                                                                                                  | **v4.6.1** — subtree + orphaned tests + own migrations deleted; canonical framework retained                   |
| 23  | Built-in middleware stages registered nowhere; pipeline ran zero stages                               | Pre-audit                                                                                  | v4.6.0 decision D6 / D-5.1; GAP audit verified 12 stages dead at runtime                                                                                                       | —                                                                                                                                                                                                                                  | **v4.6.1** — wired in priority order at bootstrap Stage 09                                                     |
| 24  | `guild_module_states` code default-denied every module (contradicts v4.1.0 read-path defaulting rule) | Pre-audit                                                                                  | v4.1.0 resolution; GAP audit verified default-deny                                                                                                                             | —                                                                                                                                                                                                                                  | **v4.6.1** — tier default (`defaultEnabledForTier`) + first-interaction backfill                               |
| 25  | `GuildConfigService.get()` returns raw JSON string / corrupts merges                                  | Pre-audit                                                                                  | Found by remediation unit tests (v4.6.1)                                                                                                                                       | —                                                                                                                                                                                                                                  | **v4.6.1** — parse + merge over `DEFAULT_CONFIG`                                                               |

---

## 5. Open Items Carried Forward

**From the archive lineage**

- Per FINAL's own self-verification report: whether to extend the document toward its ~1 MB target, and in which sections — the scope cut and defect closures were prioritized over length in that pass.
- Per the Vulnerability Register, two items remain open with no resolution shown anywhere in the lineage (see §4, rows 15–16): a real runtime sandbox for third-party module code, and a non-Redis-dependent fallback for scheduled-job durability.

**From the v4.5.1 Structure-Enforced Edition (all flagged, none silently resolved)**

- The maintainer **badge evidence pass** — both living documents are uniformly [SPEC] until per-section verification against the repository happens.
- **Normalization of the merged UUR's internal cross-references** to its own final numbering, followed by a sweep of both documents' inline UUR citations.
- Correction of the merged UUR's **severity self-count** (see §4, row 20).
- A refresh of `documentation.md`'s §51 self-verification against the assembled 4.5.1 text (§51.1, §51.4, §51.8, and the "End of document" marker).
- `blueprint.md`'s §0.2 line count, its two truncated open-item headers, and the header-only register stubs in both documents.
- The **781 merged findings (56.2%)** not yet cited in either document.
- Three code-level items tracked inside the documents themselves, owned by framework maintainers and targeted at the next minor version: the CLAI ssh2 server rewrite, the worker-only bootstrap path, and docker-compose consolidation.

**From the v4.6.1 Build Engine remediation pass**

- **CI workflow added but not yet proven**: `.github/workflows/ci.yml` reproduces the D-8.4
  fail-fast chain (strict sequential gates in one job, gitleaks secret scanning, PR-only
  dependency review, SBOM + supply-chain hashing, live-service integration job, Docker
  build). Needs a first real push/PR run on GitHub to be considered green; SBOM/provenance
  step wiring and action majors may need adjustment after that run.
- **D-8.5 Release Manager / D-8.7 K8s-Terraform** remain unautomated, recorded as in-scope but documented
  deviations (deliberately not fabricated) — see `GAP_MANIFEST.md` §4 defect row 12.
- **Live-infrastructure D-8.10 evidence** (readiness flip after Stage 18, 9-step SIGTERM ceilings, migration up/down/up reversibility) awaits the integration suite against live Postgres/Redis under `docker compose up`.
- **interface.md Divisions 3–9 shipped surface** (`dashboard`, `browse`, `queue`, `persona`, `permit`, `modules`) plus the full `/health` card (status rows, dropdown, banner, running version, latency, uptime, guild count, shard grid). The router and middleware that will serve them are now wired.

**From the v5.0.0 Consolidated Re-Baseline (all flagged, none silently resolved)**

- Phase 0–4 rollout gating: Renderer, tier volumes, license machine, Compatibility Ledger, Global
  Data Emit, Twixter, and envelope encryption are specified but not yet implemented; per-section
  status badges state this honestly until each phase exit re-audits them.
- The 52 deferred greenfield items (trusted-builder subsystem, Ed25519 signing infrastructure,
  Core UI Compiler, Release Manager twelve-phase service, `defineManifest` package, and the rest)
  remain excluded from the corpus as features and tracked in the suite exclusions.
- The guild-vs-module-author sovereignty question over a command's Discord-bit gate remains open,
  documented in blueprint.md §21.
- The Suite request's line-number references were verified at commit `be39a52`; they must be
  re-verified against working HEAD before implementation treats any cited location as current.
- The badge-evidence pass against the implemented codebase re-opens at each phase exit; the audit
  register is regenerated at program closure.
