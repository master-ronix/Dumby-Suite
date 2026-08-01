# DUMBY Documentation — Unified Change Log

### Primary Lineage, v1.0.0 → FINAL (13 drafts, one continuous history)

---

## 0. Scope, Method, and a Note on Labels

**Scope.** This log covers only the throughline in `01_Documentation_Versions_PRIMARY_LINEAGE` — the 13 files that are actually one project's continuous revision history. It does not cover the five alternate/forked drafts in `02_Documentation_Versions_ALTERNATE_BRANCHES` (an early independent TypeScript pass, two JavaScript-ESM fork revisions, an unversioned alternate tier draft, and a rejected consolidation attempt); those are real documents but never merged into this line, so they sit outside a changelog for *this* project.

**Method.** Four independent evidence sources were cross-checked against each other for every entry below, and no claim here rests on only one of them:

1. **The project's own production changelog** (`05_Changelog`), a prompt-by-prompt ledger covering v1.0.0 → v3.0.0 with exact line counts and named deliverables for each step.
2. **Seven audits** (`03_Audits_and_Reviews`) — a spec-vs-implementation audit, a weakness audit, two provenance audits plus a reconciliation of both against external review, a merged 4-report vulnerability register, and a deep-think audit — each of which names or line-count-matches the exact draft it examined.
3. **Eight directives** (`04_Prompts_and_Directives`) — the upgrade instructions that targeted each major jump, several with their own "deep-think" gap analysis attached.
4. **Direct, full-file diffs** run version-to-version for every transition from v4.0.0 onward, plus direct `grep`/section-comparison checks for earlier transitions — used to verify or correct what the surrounding documents claimed, not to replace it.

Where a document's own embedded **Self-Verification Report** is cited, one caveat applies throughout and is stated once here rather than in every entry: the v4.0.0 and v4.1.0 reports are byte-identical to each other (confirmed by direct diff), meaning that section is boilerplate carried forward unedited between those two drafts and is *not* independent evidence of what changed in v4.1.0 specifically — the diff-verified facts in that entry come from the file body, not its self-report.

**A note on version labels.** Several files' own filenames or self-declared headers are wrong, and this log follows content evidence over labels in every such case:

| Draft | What it called itself | What it actually is | Evidence |
|---|---|---|---|
| Item 06 | `DUMBY_v4_FINAL.md` | The **first** v4 release (v4.0.0) | Diff vs. v4.1.0 shows it's missing fixes v4.1.0 explicitly adds; nothing suggests it's terminal |
| Item 11 | `DUMBY_v4_draft.md` | The complete, shipped **v4.4.0** | Text states "every section from v4.3.0 is preserved here exactly"; not draft-shaped |
| Item 12 | Filename *and* internal header both say `4.4.0` | Actually **v4.5.0** | Fully implements all 29 Rosetta Stone codenames a later-numbered directive explicitly says it is upgrading *away from* v4.4.0 to produce — a document can't be the input to its own output |

Two smaller notes carried forward from the same reconciliation: no standalone **v3.0.1** file exists anywhere in the archive — v3.0.2's own header says it includes "3.0.1 fixes," so it most likely lived only as an in-conversation patch folded straight into v3.0.2 before ever being saved separately. And item 08 below (the RBAC/CLAI spec) self-labels as "Core Directive Specification v5.0" but is not a version in this sequence at all — it says so itself, describing itself as an addendum that "extends `DUMBY_v4_1_0.md`... so it reads as a continuation, not a separate document." It is logged below as an interstitial artifact, not a numbered release.

---

## 1. Master Version Table

| # | Version | Lines | Size | One-line theme |
|---|---|---|---|---|
| 1 | **v1.0.0** | 2,561 | 115 KB | First delivered draft, still named "UMDB," no code |
| 2 | **v2.0.0** | 6,321 | 336 KB | Renamed to Dumby; 22-module catalog created (8 of 22 at full depth) |
| 3 | **v2.1.0** | 6,956 | 380 KB | Remaining 14 modules brought to full depth |
| 4 | **v3.0.0** | 7,821 | 504 KB | Admin/Core/Standard/Marketplace tiers; TypeScript declared |
| 5 | **v3.0.2** | 7,929 | 514 KB | Terminology sweep + first (brittle) backfill-migration fix |
| 6 | **v4.0.0** | 4,219 | 310 KB | 7-Part/35-section → 9-Part/50-section restructure |
| 7 | **v4.1.0** | 4,330 | 331 KB | Extensibility Contract; robust backfill fix; security hardening |
| — | *Addendum* | 312 | 33 KB | RBAC/Slash-Lifecycle/CLAI spec (not a shipped version) |
| 8 | **v4.2.0** | 4,420 | 377 KB | Security & compliance hardening release (largest single fix batch) |
| 9 | **v4.3.0** | 3,908 | 348 KB | Module catalog cut to illustrative-only; Power Engine introduced |
| 10 | **v4.4.0** | 4,165 | 402 KB | Power Engine Panel, RBAC redesign, BCCM, CLAI, MTP, 404 Mode, Personas |
| 11 | **v4.5.0** | 4,367 | 412 KB | 29-codename Rosetta Stone; Swastik; Credentials Service |
| 12 | **FINAL** | 1,682 | 220 KB | Core-only scope cut; long-standing defects closed out |

---

## 2. Version-by-Version Changelog

### v1.0.0 — "UMDB Framework" (Original Blueprint)
*2,561 lines · not yet named Dumby*

**Added**
- First delivered draft, 27 sections, single markdown file, zero code/program files (verified at delivery).
- §7.2 "Module Types & Categories" names an unenforced "Admin Modules — bot owner only" category — the genuine, later-cited ancestor of the v3.0.0 tier system.
- Full Glossary (27 terms) establishing the project's baseline vocabulary (RBAC, DI Container, Module Registry, Correlation ID, etc.).

**Known limitations carried forward**
- No tier system, no TypeScript, no per-guild module-state table — all arrive later. The 18-stage bootstrap, 7-layer permission resolver, and 10-entry middleware pipeline referenced in later drafts as "written in full" did **not** exist at this depth here.

---

### v2.0.0 — Renamed to Dumby, 22-Module Catalog
*6,321 lines*

**Added**
- Complete rewrite (v1.0.0 left untouched). Project renamed **UMDB → Dumby**.
- 8 net-new sections (35 total, up from 27): Localization, Analytics & Telemetry, GDPR/Privacy, Troubleshooting Runbooks, plus substantially expanded security/testing/infra sections.
- The 22-module Built-in Module Catalog created for the first time, naming every module still present in the final v3.0.0+ lineage: `core-admin, guild-settings, moderation, auto-moderation, logging, welcome, leveling, economy, tickets, music, giveaways, utility, starboard, reaction-roles, polls, reminders, tags, verification, anti-raid, birthdays, threads-manager, integrations`.
- The 18-stage application bootstrap, 7-layer permission resolver, and 10-entry middleware pipeline all written in full for the first time.

**Defect introduced (caught next version)**
- Only **8 of 22** modules received Services/Database/Configuration depth at creation: `moderation, auto-moderation, economy, tickets, guild-settings, core-admin, logging, welcome`. The other 14 had commands only.

---

### v2.1.0 — Module Depth Completion Pass
*6,956 lines*

**Fixed**
- All 14 thin modules brought to full depth (Services + Database Tables + Configuration): `leveling, music, giveaways, utility, starboard, reaction-roles, polls, reminders, tags, verification, anti-raid, birthdays, threads-manager, integrations`.
  - `music` additionally received a full Voice Infrastructure deep-dive (`VoiceManager`, `AudioPlayer`, `LavalinkClient`).
  - `utility` additionally received an explicit "intentionally stateless" rationale in place of a conventional table list.
- The 8 already-strong modules each had their *specific* remaining gap closed (not a uniform pass) — e.g. `economy` gained Events Emitted + a full Configuration block; `tickets` gained a Services block; `logging` gained Services, two new tables, and Configuration; `core-admin` completed its Services list and gained a Configuration entry.

**Added**
- Four new infrastructure subsections: Terraform IaC, PgBouncer configuration reference, the Voice Infrastructure write-up above, Worker Thread pattern.
- A fresh integrity re-audit confirmed the fix landed everywhere claimed.

---

### v3.0.0 — Tiered Module System + TypeScript Migration
*7,821 lines*

**Added**
- **Admin / Core / Standard / Marketplace** tier system plus a guild-level Interface. Final tier assignment for all 22 modules, exactly as shipped: 1 Admin (`core-admin`), 2 Core (`guild-settings` — basis of Interface/MDIS, `utility`), 2 Marketplace overrides (`music`, `integrations`), 17 Standard (everything else).
- TypeScript strict mode declared as the stack (§3.1.1), superseding the prior JavaScript/JSDoc decision.
- New sections: §1.7 Historical Lineage, §8.6 Tier as a Manifest Field, §8.7 Per-Guild Module State (`guild_module_states`), §8.8 Admin-Tier Security Gate, §8.9 Module Lifecycle State Machine, §8.10 Core/Admin Performance Baselines, §8.11 Mandatory Feature Manifest (27 named features), §22.4 MDIS.
- New tables: `guild_module_states`, `marketplace_listings`. New glossary terms: Tier, Admin/Core/Standard/Marketplace Module, Interface, MDIS, Tier-Fit Test, Soft-Dependency Degradation Contract.

**Reverted (never shipped)**
- An intermediate draft had merged `auto-moderation` into `moderation`, absorbed `reminders` into `utility`, eliminated `threads-manager` outright, and wrongly reclassified six modules as Marketplace. All of this was drafted in a scratch workspace, independently verified to have never reached the live file, and fully reversed in favor of the "zero eliminations" table above.

**Known issues at ship (all explicitly flagged, none fixed yet)**
1. **Critical** — no backfill migration exists for `guild_module_states`; every Standard module would appear silently disabled for every pre-existing guild the instant this version deploys.
2. Six inline tier-revision transparency callouts not yet relocated to a planned migration-notes subsection.
3. Cross-reference pointers from ~9 sections to their §8.11 feature entries not yet added.
4. Three tables introduced inline (`metering_usage_daily`, `backup_history`, `guild_outbound_webhooks`) never registered in the master table registry.
5. A Terraform multi-region gap for Feature #26 left open.

---

### v3.0.2 — Terminology Sweep + First Backfill Fix
*7,929 lines · header states "3.0.2 — Terminology Consistency Sweep, plus 3.0.1 fixes"*

**Fixed — all 5 of v3.0.0's outstanding issues closed**
1. Backfill migration `0007_backfill_guild_module_states.js` added, marked **Required / Non-Optional for any existing deployment**; Bootstrap Stage 10 guarantees it completes before Stage 14 (Gateway Login).
2. The six tier callouts relocated to §33.5.
3. All 27 features now cross-referenced from their natural home sections.
4. The three orphaned tables registered in §15.2.2.
5. The Terraform multi-region gap closed in §29.5.

**Fixed — terminology**
- Every "UMDB role" string swept to "Dumby role" throughout.

**Missed by the sweep (confirmed by direct grep, corrected only at v4.0.0)**
- §1.1 "What Dumby Is" still opens with **"Dumby is a JavaScript-based, unified, modular Discord bot system"** — present at v2.0.0, v2.1.0, v3.0.0, *and* here, despite the TypeScript decision having been declared two versions earlier. Two separate cleanup passes (the v3.0.0 migration and this sweep) both missed this exact sentence.

**New defects found by the independent Weakness Audit against this exact draft (~7,930 lines, confirmed matching)** — the single largest defect catalog against any pre-v4 draft, most consequential items below (full list in §3):
- 🔴 Nine separate passages cite an undefined **"governing mandate"**/**"Absolute Compliance Directive"** — leaked references to the drafting process itself, defined nowhere in the document.
- 🔴 **`AdminTierGateMiddleware`** is described in detail in three places (§8.8, §13.2, §23.4) but is registered in **zero** of the document's own canonical middleware lists (§11.2's Pipeline Execution Order, §11.3's Full Reference, §5's directory tree) — the single most security-critical component in the tier system is absent from every place meant to be authoritative about what middleware exists.
- 🟠 The "Seven-Layer Permission Resolution Engine" only maps 2 of its 7 layers onto real middleware; Layer 2 (blacklist) and Layer 7 (channel restriction) have no implementation anywhere.
- 🟠 The TypeScript migration is contradicted by four independent, un-updated artifacts: the full directory tree (all `.js`, no `tsconfig.json`), a stale `.eslintrc.js` filename directly contradicting a "flat config" claim two sections later, a VS Code `launch.json` treating TS as a hypothetical future option, and a CI `typecheck` job describing optional JSDoc checking rather than a mandatory strict build.
- 🟠 `guild_configs` is defined two incompatible ways: a single JSONB blob column per its canonical table definition, vs. ~23 fields listed like real, individual columns in the field reference two sections away — and the old, superseded `moduleOverrides` flat field is still listed there as current alongside the new `guild_module_states` mechanism that was built specifically to replace it.
- 🟠 A real webhook-idempotency race: the "seen before?" check happens at Step 2 of the processing flow, but the delivery ID isn't recorded as seen until Step 5 — two near-simultaneous deliveries can both pass the check before either writes, producing duplicate processing, directly contradicting the threat model's own "duplicates are ignored" claim.
- 🟠 The sharding formula (`guildId.toBigInt() >> 22n % BigInt(totalShards)`) has a real operator-precedence bug: `%` binds tighter than `>>` in JavaScript/TypeScript, so as literally written it does not compute the intended value.
- 🟠 `replicas: 2` in the reference Kubernetes config is never reconciled with Discord's one-gateway-session-per-shard rule; no active/standby or leader-election mechanism is described for how two replicas of the same shard would coexist.
- 🟡 A self-admitted, under-prioritized breaking change: upgrading from v2.1.0 silently disables `music` and `integrations` (now Marketplace tier, not pre-installed) for every guild that had them — filed as "no action required" despite an identical blast radius to the Standard-tier backfill hazard that got a Critical, mandatory-migration response.

---

### v4.0.0 — First v4 Release, 9-Part Restructure
*4,219 lines · filed as `DUMBY_v4_FINAL.md`, actually the **first** v4 release*

**Changed — major restructure**
- 7 Parts / 35 sections (v3.0.2) → **9 Parts / 50 sections + a new §51 Self-Verification Report**. Document retitled "Dumby-Complete-Reference" (from "Dumby-System-Reference").
- The single Module System section (with 8.6–8.11 subsections) split into 5 dedicated top-level sections: Module Anatomy & Manifest, Tiers & Lifecycle State Machine, Inter-Module Communication & Contracts, Hot Reload & Dynamic Module Management, Marketplace & Extension System.
- The single Module Catalog section split into 8 category-based sections (Admin Tier, Core Tier, Moderation & Safety, Community Engagement, Utility & Productivity, Entertainment & Events, Marketplace Integration, plus Catalog Conventions).
- New elevated top-level sections: Non-Goals & Explicit Boundaries, State Externalization & Horizontal Scaling, Dumby vs. Multipurpose Bots — Full Comparison.

**Fixed (per this draft's own self-verification report, cross-checked directly)**
- `RATE_LIMIT_USER_MAX` naming inconsistency (`RATE_LIMIT_USER_MAX_REQUESTS` in places) corrected throughout.
- Four-tier test pyramid (Unit/Integration/Happy-Path Smoke/E2E) now actually drawn in its diagram, replacing the three-tier diagram — **this closes the Weakness Audit's Feature #18 finding** (a fourth tier had been claimed but never drawn).
- `PREFIX` field removed from the guild-config schema (no text-prefix commands, consistent with Non-Goals).
- `SIGUSR2` correctly documented as reserved/unused; no surviving PM2 self-re-exec reference — **partially closes the Weakness Audit's restart-mechanism gap**, though a Kubernetes-native restart path specifically is not yet spelled out here.
- All references to JavaScript scrubbed in favor of TypeScript strict mode throughout, including §1's rewritten opening — **this is where the "JavaScript-based" sentence flagged three versions earlier finally gets corrected** (the section was renamed "One-Sentence Definition" and rewritten to open with "a single TypeScript application runtime").
- A full-document grep for version-comparison language (`pre-4.0`, `deprecated`, `formerly PM2`, etc.) returns zero hits — all such language replaced with present-tense design rationale.

**Not yet fixed**
- `AdminTierGateMiddleware`'s registry-absence defect is not explicitly addressed in this draft's own verification claims.
- The backfill migration is still described as **"MANDATORY... its failure is a fatal deployment error, not a warning"** — the brittle v3.0.2-era fix, not yet the robust version that ships next.

**Outstanding assumptions stated explicitly (not gaps, but named limits)**
- `INTERACTION_TIMEOUT` (14 min) assumes current Discord behavior and may need revisiting if Discord changes it; the Lavalink dependency assumes v4.x protocol; cross-region Postgres Terraform targets a generic pattern, not a specific cloud provider; `TRACE_SAMPLE_RATE` default (0.1) has stated adjustment guidance for high/low-traffic deployments.

---

### v4.1.0 — The Extensibility Contract + Reliability Hardening
*4,330 lines · verified by full-file diff against v4.0.0 (195-line diff, 149 changed lines — a genuinely surgical release)*

**Added**
- **§10.6–10.11, "The Extensibility Contract"** — six new subsections specifying, for the first time, the exact obligations and steps for building a module: the 5-obligation contract itself (declare dependencies; declare tier honestly; own your own data; publish only the intended `provides`/`eventsCatalog` surface; never cross-module import or write), a 4-step build process (Scaffold → Manifest/Command Surface → Entry/Logic/Data layers, ESLint-enforced → Test/Document/Submit), and "What Done Looks Like."
- New end-to-end P50/P99 performance-target table by tier (distinct from the framework-overhead-only targets that already existed), with an explicit rationale for why Core tier's availability target excludes a Redis dependency.
- New §13.3, "Reload, Toggle, and Disable — Four Distinct Mechanisms" — a table finally distinguishing dev hot reload, runtime module reload, per-guild toggle, and global disable, which had previously been conflated.
- New §15.5, complete `CommandContext` field reference (`correlationId`, `guildConfig`, `locale`, `rbacRole`, `logger`, `shardId`, `metadata`).
- Cryptographic signing added to the Marketplace submission pipeline; `ModuleRegistry` now refuses to load unsigned Marketplace code (built-ins exempt).
- Per-guild `rateLimitMultiplier` / `cooldownMultiplier` config fields, so a high-traffic guild can raise its own ceiling without an operator changing process-wide defaults.
- `CRITICAL_QUERY_THRESHOLD_MS` (2000ms, error-level, dedicated Prometheus counter) alongside the existing `SLOW_QUERY_THRESHOLD_MS` (500ms, warn-level).

**Fixed — critical**
- **The `guild_module_states` backfill hazard, resolved robustly.** The read path now has a defaulting rule: no row found resolves to the module's tier default (active for Standard, `never_installed` for Marketplace) and writes that value back on first interaction — no guild is ever gated on the migration having run. The migration itself is downgraded from "MANDATORY / fatal" to **"Proactive"**: its failure is now logged and alerted, not fatal to deployment. *(This is the second and genuinely durable fix in a three-stage arc — see §3 below.)*

**Fixed — security**
- Layer 1 of the Admin-tier gate gains `defaultMemberPermissions: 0n` — the command is now invisible in a non-owner's UI entirely, not merely blocked at execution.
- A new, unconditional **audit guarantee**: every Admin-tier invocation — granted or rejected — writes to `audit_logs` before the handler runs.
- OAuth2 dashboard login gains CSRF protection (a cryptographically random `state` parameter) and a fully specified JWT session (HMAC-SHA256, `HttpOnly`/`Secure`/`SameSite=Strict`), with guild-administrator status re-verified against Discord's API on every call rather than cached for the session's life.

**Changed**
- `TransactionManager` now handles nested calls safely via `AsyncLocalStorage` + `SAVEPOINT` — a service author no longer needs to manually check whether they're already inside a transaction.
- Backup mechanism differentiated by deployment target: managed-provider deployments use the provider's snapshot API; self-hosted deployments run `pg_dump` to object storage, confirmed durable before being marked successful.
- Three new `utility` commands (`/permissions`, `/timestamp`, `/calculate`) and their four backing services.

---

### Interstitial — RBAC / Slash-Lifecycle / CLAI Addendum
*312 lines · extends v4.1.0, not a numbered version*

Self-labeled "Core Directive Specification v5.0" — an aspirational label, not a real position in the sequence. Produced in direct response to six numbered directives from the Audit Reconciliation review (strip module detail to illustrative-only; defer Stripe in favor of a "Dodo Payments" placeholder; full module-developer freedom with operational-not-design control retained centrally; no core-authored UX; redesign RBAC; redesign the slash-command lifecycle; specify CLAI). Three parts:

- **Part A — Global RBAC Engine.** Two-level hierarchy (Groups of roles/users; Sets of Groups), five independent permission primitives (grant, whitelist, blacklist, quota, cooldown), an explicit precedence algorithm (blacklist absolute → specificity ordering → deny-beats-allow tiebreak → Discord-permission-default fallthrough), and a global (`guildId = NULL`, CLAI-only, restriction-only) layer alongside the guild-scoped one. Access resolution fails closed; quota/cooldown fail open with an in-memory cap.
- **Part B — Slash Command Lifecycle.** Core+Standard register globally at boot via full overwrite; Marketplace registers guild-scoped on enable; disable is enforced *synchronously* via a dispatcher-level gate the instant it's requested, with the actual Discord deregistration queued and never blocking correctness even if it's delayed by rate limits.
- **Part C — CLAI.** A separately-deployed SSH admin console, password **plus mandatory TOTP MFA** (added explicitly on top of the "username and password" ask, given the console's blast radius), authorization reusing Part A's RBAC engine directly, full audit logging into the shared `audit_logs` table.

Its ideas substantively land in v4.4.0 (see below); it was never shipped as a standalone version.

---

### v4.2.0 — Security & Compliance Hardening Release
*4,420 lines · verified by full-file diff against v4.1.0 (283-line diff, 190 changed lines). This is the single largest concentration of fixes in the whole lineage — far more than a shutdown-timing patch.*

**Fixed — the Reconciliation Audit's top-priority finding**
- Rate limiting and cooldowns, on a Redis outage, now **fail closed** via a per-process, LRU-bounded in-memory counter (metered by a `dumby_ratelimit_fallback_active` gauge) — replacing the prior fail-*open* behavior that would have removed the only thing standing between the bot and a Discord-side token ban during an outage.

**Fixed — closing four previously-confirmed absences**
- New **§29.8, Encryption Posture** — TLS required in transit everywhere (`sslmode=require`, `rediss://`, enforced at Stage 02 config validation, with the one explicit local-Compose exception), at-rest encryption delegated to the storage layer per deployment tier, and a two-phase `ENCRYPTION_KEY_CURRENT`/`PREVIOUS` rotation scheme.
- New **§31.6, Children's Privacy** — the birthdays module's opt-in birth-year field now carries an explicit operator warning about publishing minors' computed age via the `{age}` template variable.
- New infrastructure cost column in the deployment-tier table (~$25–75 / ~$300–800 / ~$1,500+ across the three tiers) — order-of-magnitude floors, explicitly not a quote.
- Locale/RTL support fully specified: the real ~30-locale Discord target list (not just illustrative examples), and MDIS's renderer built on CSS logical properties for automatic RTL support.

**Fixed — other named vulnerabilities**
- **Event-bus synchronous re-entrancy** (the audits' own "sharpest finding") — new `EVENT_BUS_MAX_EMIT_DEPTH` config guard added.
- **Cross-module read boundary tightened** — an open, direct read against another module's table is no longer permitted; reads must now go through a declared `ForCrossModuleRead`-suffixed accessor, lint-enforced in shape.
- **Anonymous polls made genuinely anonymous** — the persisted `voterKey`, not just the emitted event, is now an HMAC of `userId + pollId + salt` for `--anonymous` polls (deterministic per poll, so double-voting is still caught without the row itself being a de-anonymization vector).
- **Soft-delete/unique-constraint gap closed** — every unique constraint on a table carrying `deletedAt` must now be a partial index (`WHERE "deletedAt" IS NULL`); CI's migration validator rejects a plain `UNIQUE` constraint on such a table.
- New **§40.8, Load & Performance Testing** — a k6-based nightly/pre-release staging load tier with explicit pass/fail criteria against the document's own stated P50/P99/error-rate/cache-hit-ratio targets, closing the prior gap where nothing actually validated those numbers.
- Modal session expiry now returns a distinct, named "your session expired" message instead of falling through to the generic error boundary.
- Shard-ownership model unified and renamed (§23.4: "Kubernetes Deployment — Active/Standby" → "Shard Ownership — The Lock Model Behind Both Failover and Rolling Updates"), adding a **proactive planned-handoff path** (a few seconds, self-initiated) alongside the existing passive unplanned-failure path (10–15s, TTL-based).

**Changed — a judgment call resolved**
- `/bot-admin eval` is **kept, not removed** — the two external reviews referenced in the Reconciliation Audit had argued for deleting it outright. It instead gains a new **Layer 5** (5-second hard timeout, output truncated and never fully logged) plus an explicit written threat model naming the actual residual risk (a compromised owner account reaching eval in a non-production environment) and the controls that bound it (VM sandbox with no `fs`/`net`/`child_process`; unconditional audit logging; mandatory non-production credential separation).

**Changed — partial fixes, full resolution deferred**
- `economy`'s gambling commands (`/coinflip`, `/dice`, `/slots`) made **off by default** (`ECONOMY_GAMBLING_ENABLED`), gated behind a mandatory, audit-logged compliance acknowledgment, per-command odds/RTP disclosure, and a provably-fair `crypto.randomInt()` guarantee — a substantial mitigation, though full removal doesn't happen until v4.3.0.
- Stripe's PCI scope is explicitly clarified in place (no cardholder data ever reaches Dumby's process) — one version before the Stripe integration is removed from the catalog entirely.

**⚠ Discrepancy flagged, not silently resolved**
An independent, four-report **Vulnerability & Abuse-Loophole Register** (41 distinct findings — 7 Critical, 18 High, 7 Medium, 9 Low) explicitly scoped to "the v4.2.0 base architecture" still lists three of the above as open (anonymous polls, no load-testing tier, modal-expiry UX) — yet direct diffing of the shipped v4.2.0 text, above, shows all three already fixed. That register also records two of its own internal contradictions between its four source reports (whether the event bus's cycle guard is a real depth cap or doesn't exist at all; whether the rate limiter fully disables under a Redis outage or degrades to a bounded fallback) without resolving them. Per this changelog's own direct-text verification, the shipped document supports the "guard exists" / "bounded fallback" reading in both cases — noted here rather than picked silently.

**Confirmed still open at this point** (per the register, not contradicted by direct verification): no runtime sandbox for Marketplace code (lint + human review only); no non-Redis fallback for shard-lock arbitration if Redis itself is fully unreachable; BullMQ/Redis remains a single point of failure for all scheduled-job state with no database-backed fallback.

---

### v4.3.0 — Module Catalog to Illustrative-Only; Power Engine Introduced
*3,908 lines — shrinks by ~500 lines net despite new content, since catalog-depth removal outweighs what was added*

**Removed**
- Executing the Reconciliation Audit's Directive 1: all 22 previously fully-specified modules cut to name + tier + one-line purpose only (index depth). Part VII retitled "Built-in Module Catalog" → **"Module Catalog (Illustrative Examples)."** The document now states explicitly that none of the 22 is a module the framework actually ships.
- Stripe and the gambling-adjacent economy detail removed along with the rest of the catalog depth (Directive 2a); "Dodo Payments" reserved as a future monetization placeholder name.
- Compliance-matrix rows that had pointed to a specific module's command as their mechanism (multi-tenant metering, scheduled backup, controlled restore, chaos-injection testing) re-pointed to the underlying framework service directly, since the service — not the now-removed command — was always the real mechanism.

**Added**
- **The Power Engine (PE)**, introduced for the first time (§19.8–19.12): a single point of global authority able to suspend or restrict any guild, module, developer, or command, governed explicitly by Principle P14 ("Freedom by Default, Authority by Exception" — the capability exists but is never used as an ambient enforcement layer). Exposed as a function-call-shaped service (`PowerEngineService`), with a mandatory, non-optional reasoned audit trail on every action, granted or rejected.
- `guild_module_states`'s "sole authority" guarantee explicitly extended to cover PE-originated global suspensions too — no parallel state mechanism was introduced alongside it.

---

### v4.4.0 — Power Engine Panel, RBAC Redesign, BCCM, CLAI, MTP, 404 Mode, Personas
*4,165 lines · filed as `DUMBY_v4_draft.md`, actually the complete, shipped v4.4.0 · verified by full-file diff against v4.3.0 (411-line diff, 339 changed lines)*

**Added**
- **Power Engine → Power Engine Panel (PEP).** Explicitly "the evolution of what earlier documentation called the Power Engine — same service, same ideology, a deeper and broader technical implementation." Its scope boundary is now stated in the **core text**, not just an FAQ: PEP controls application state only (modules, config, cache, queue, etc.) and never calls the Kubernetes API or touches infrastructure directly — resolving the deep-think audit's "PEP scope creep" finding. New Last-Known-Good-State fallback specified for when PEP itself is unreachable; a new `pending_approval` two-person-approval workflow added to the action dispatcher for high-impact actions; a new opt-in `onPEPControl` module-integration hook (~5 lines).
- **RBAC Groups and Sets** (§19.13 onward), layered on top of — not replacing — the existing six-role hierarchy, resolving the deep-think audit's "legacy vs. new RBAC coexistence" question by explicit design.
- **Full Persona system** (§6.6–6.9): distinct Discord Applications sharing one backend, database, and module system; a hard cap of **3 concurrent Personas** (promoted from an FAQ footnote into the core requirement, per the deep-think audit's specific recommendation); command-capacity and voice-isolation as the two stated purposes; a `persona_status` lifecycle table with a 5-minute auto-degrade threshold; decommissioning treated as a PEP action requiring the same reason-plus-second-approver bar as any other high-impact action.
- **404 Mode** (§8.5): a distinct, visible degraded-presence state — not a crash-like hang — triggered by a sustained PostgreSQL-primary or gateway outage past named thresholds (15s / 30s defaults); mid-bootstrap entry resumes from the failed stage rather than restarting the full 18-stage sequence; visible to every guild member by deliberate exception; escalates to on-call paging past a 30-minute default, closing the deep-think audit's "no escalation timer" finding.
- **BCCM, CLAI, and MTP** ship: queued command renaming/aliasing with collision-resolution UI (BCCM); a separately-deployed SSH admin console reusing the RBAC engine for its own authorization (CLAI); a synthetic per-guild resource-usage token system (MTP).
- **Monetization scaffold** ships as literally an empty reserved directory (`src/monetization/`, a `.gitkeep` only) — deliberately no logic, matching the directive's explicit "don't build the full infra yet."
- A Rosetta Stone conceptual map added at the document root — but using **plain descriptive bucket names** ("Vision, Philosophy & Scope," "Bootstrap, Shutdown & 404 Mode," etc.), explicitly *not* the codename system the next directive asks for, and explicitly framed as an orthogonal lookup table rather than a renumbering (preserving all ~400 existing internal cross-references). *This is the direct textual evidence that this draft is genuinely v4.4.0, despite its filename.*

**Known gaps at ship**, per the deep-think audit run in parallel against this exact draft: direct Role-vs-Role RBAC conflicts (as opposed to Role-vs-Group-vs-Set) are not covered by an explicit decision table; BCCM's 12-hour push window and 13-hour additive window are close enough in value to risk transposition during implementation; CLAI remains all-or-nothing with no view-only tier; MTP's token weights are described as provisional, unvalidated estimates, and the spec itself contains an unresolved contradiction over whether MTP tokens are non-resetting "live stats" or a resettable quota.

---

### v4.5.0 — 29-Codename Rosetta Stone; Swastik; Credentials Service
*4,367 lines · both the filename and the internal header say "4.4.0" — both are fake*

**Added**
- The Rosetta Stone rebuilt as the full **29-bucket codename system**: Hinge, Kits, Bundles, Burg, Glass, Bonds, Masters, Mount, Delta, Ring, Bridge, Lens, Shoot, Keepy, Mash, Bags, Clips, Border, Driver, Cogs, Holder, Peer, Boot, Kelp, Belt, Grace, Face, Ground, Clay — matching the directive exactly. Notably, this exact requirement had already been requested one version earlier (in the v4.3.0→v4.4.0 directive); v4.4.0 shipped a functionally equivalent but plainly-named version instead, and it's only implemented here.
- **Swastik** — a new deployment/hot-reload/hot-swap service: two update paths (a scheduled 24-hour full rolling core restart, vs. per-module Kubernetes-volume-mount hot-swap); developer registration with a dev-ID + build-ID identity; manual per-developer license approval; staged, atomically-promoted (symlink-swap) deployment with automatic rollback on a failed self-health-check; a full audit trail of every step. *(A codename for a CI/CD and module hot-swap system — the term derives from a common given name, unrelated to any other association some readers may bring to the word.)*
- **Credentials Service** — architected similarly to PEP; issues scoped authkeys for CLAI, bound to valid user authentication (an incorrect password or profile is rejected outright), and also backs Swastik's own license-verification step.
- New **§51.7, Cross-Reference Integrity** — all 205 distinct `§`-prefixed cross-references in the document checked programmatically against actual headers; 204 resolve exactly, and the one exception (`§48.2`) is confirmed as pre-existing intentional shorthand, not a broken pointer.

**Fixed / re-verified**
- PEP terminology consistency (zero bare "PE"/"Power Engine"-without-Panel hits outside this report's own description of the check); bootstrap-stage citations consistently point to Stage 17 (`MODULE_READY`); MTP's cost-trigger now reuses `SLOW_QUERY_THRESHOLD_MS` rather than a second independent threshold, unifying "slow" across real alerting and synthetic accounting; the "not a microservices architecture" non-goal is explicitly reconciled against PEP/CLAI's separate-service deployment model as a named, cross-referenced exception.

**Sourced from the directive but not independently diff-verified against this exact draft** (flagged per this log's sourcing discipline rather than silently folded in as confirmed): an explicit Ideology/Target-Audience section; manifest `Hardcode`/license/`status` columns; command restrictions closing prefix-command loopholes and DM-command reading outside admin modules; an MDIS per-guild settings-sync clarification.

---

### FINAL — Core-Only Consolidated Reference
*1,682 lines / ~220 KB / ~32,500 words — genuinely the last document, and a full re-synthesis, not an incremental patch*

**Changed — the scope cut**
- Executes the Final Consolidation Directive's Core-Only Module Policy: every Admin/Standard/Marketplace-tier catalog entry — commands, services, schemas, configuration — is removed in full. What remains, at full depth, is the module *system itself*: manifest, lifecycle, tier concept as structural architecture, isolation, inter-module communication, and a complete module-building/extensibility guide, illustrated by exactly one example explicitly and repeatedly labeled as a trivial, non-shipped teaching illustration (Appendix C states this outright).
- 41 numbered content sections (down from 51 in the v4.x line) plus §42 Self-Verification. Document-wide style shift: exactly **one** fenced code block is now permitted (the §7 folder listing) — every other schema/pseudocode block from the v4.x era has been converted to prose, a deliberate move toward "specification, not implementation."

**Fixed — long-standing defects finally closed, several dating back to the v3.0.2-era Weakness Audit**
- `AdminTierGateMiddleware` now appears in the single canonical middleware registry it had been absent from since v3.0.2.
- The seven-layer permission model is now explicitly mapped, layer by layer, onto that same registry, with no orphaned layer.
- The `guild_configs` blob-vs-columns contradiction is resolved — stated once, as a single schema-validated document. The old `moduleOverrides` flat field is removed entirely; `guild_module_states` is the only per-guild-module-state mechanism referenced anywhere in the text.
- The sharding formula's operator-precedence ambiguity (§6.5) is now stated with explicit operator order.
- The Kubernetes replica count and the Discord shard count are explicitly reconciled (§35.2) — the gap first flagged in the v3.0.2 Weakness Audit and again in the v4.2.0 Vulnerability Register.
- The webhook idempotency check is now a single atomic operation, closing the check-then-write race first identified in the Weakness Audit.
- The admin security boundary is now correctly counted as **four** independent layers (explicitly including the eval/arbitrary-code-execution gate), correcting a self-undercount that had stood since v3.0.2.
- The GDPR erasure right's scope is now stated explicitly for a user who is a moderator, not only for a user who is a target of moderation.
- Every SLO/alert-threshold pair and retry-budget/circuit-breaker pair that had drifted across the document's history is now stated exactly once, canonically (§25.5, §25.6, Appendix B).
- All 27 mandatory-feature-matrix entries individually checked against the "padding" defect the Weakness Audit found (3+ entries that were bare cross-references with no independent content) — every entry now states its own governance, mechanism, failure mode, and configuration explicitly.
- One assembly defect caught by this draft's own sequential-numbering self-check and corrected before shipping: Section 39 (extended comparison) and Section 40 (glossary) had been built but never spliced into the running file, jumping straight from §38 to §41.

**Honestly reported, not fixed**
- The document is ~32,500 words / ~214,000 bytes against a stated target of ~1 MB — roughly one-fifth of it — reported directly rather than rounded favorably. Its own closing report states the tradeoff explicitly: given a choice between hitting the byte target through thinner, padded treatment, or fixing every specifically-named defect from prior review while executing the scope cut correctly, this pass chose the second, producing a smaller but more correct document. Whether to extend it further toward the stated target is left as an open, explicitly surfaced decision rather than a silent gap.

---

## 3. Cross-Version Defect Lifecycle

The single most useful thing a *unified* changelog can show that 13 separate ones can't: several defects were found once and travelled across multiple versions before actually closing. Tracked end-to-end:

| Defect | Introduced | First flagged | Partially addressed | Fully resolved |
|---|---|---|---|---|
| `guild_module_states` has no backfill for pre-existing guilds | v3.0.0 (ships with the gap named but unfixed) | v3.0.0's own changelog, Part B, item 1 (Critical) | v3.0.2 — migration added, but marked mandatory/fatal-on-failure (brittle) | **v4.1.0** — read-path defaulting rule makes the migration non-load-bearing; downgraded to proactive/non-fatal |
| `AdminTierGateMiddleware` fully described, registered nowhere | v3.0.2 (unclear if present earlier; first *documented* here) | Weakness Audit of v3.0.2 (🔴 Critical) | — | **FINAL** — added to the single canonical middleware registry |
| Seven-layer permission engine doesn't map onto real middleware | v3.0.2 | Weakness Audit of v3.0.2 (🟠) | — | **FINAL** — explicitly mapped, layer by layer |
| Synchronous event-bus re-entrancy can crash the process | v4.1.0 (or earlier — first formally caught here) | v4.1.0 Forensic Audit / Reconciliation ("the sharpest finding across all three reports") | — | **v4.2.0** — `EVENT_BUS_MAX_EMIT_DEPTH` guard added |
| Rate limiter fails open on a Redis outage | v4.1.0 | Reconciliation Audit (top-priority finding) | — | **v4.2.0** — flipped to fail-closed, in-memory bounded fallback |
| Anonymous polls store/expose the real user ID | v2.1.0 (poll module created) | Reconciliation Audit; independently re-confirmed by the Vulnerability Register (LO-01) | — | **v4.2.0** — persisted `voterKey` itself HMAC'd, not just the emitted event |
| No load/performance-testing tier validates stated SLOs | — | Reconciliation Audit; Vulnerability Register (LO-03) | — | **v4.2.0** — new §40.8, k6-based nightly staging load tests |
| Gambling mechanics: no age-gating, disclosure, or opt-in | v2.0.0 (`economy` created) | Vulnerability Register (LO-02) | **v4.2.0** — off-by-default, disclosure, compliance acknowledgment | **v4.3.0** — removed from the shipped catalog entirely |
| Stripe integration: PCI-scope / reputational risk | v2.1.0 (`integrations` module) | Forensic Audit / Reconciliation Directive 2a | **v4.2.0** — PCI-scope clarified in place | **v4.3.0** — removed from the shipped catalog entirely |
| `/bot-admin eval`: keep or remove | v2.0.0 | Reconciliation Audit (explicit, undecided judgment call) | — | **v4.2.0** — kept; hardened with a 5th defensive layer and an explicit written threat model |
| Sharding formula operator-precedence bug | v3.0.0 (TS migration introduces the literal formula) | Weakness Audit of v3.0.2 (🟠) | — | **FINAL** — explicit operator order stated |
| K8s replica count vs. Discord shard count never reconciled | v3.0.0 | Weakness Audit of v3.0.2; re-confirmed by Vulnerability Register (CR-02) | **v4.2.0** — unified lock model, proactive planned-handoff path added | **FINAL** — counts explicitly reconciled (§35.2) |
| Webhook idempotency check-then-write race | v2.0.0 (webhooks introduced) | Weakness Audit of v3.0.2 (🟠) | — | **FINAL** — now a single atomic operation |
| "JavaScript-based" residual phrasing despite the TS decision | v2.0.0 | Direct verification for this changelog (present through v3.0.2) | — | **v4.0.0** — §1 rewritten wholesale |
| Marketplace code has no execution sandbox (lint/review only) | v2.0.0 | Vulnerability Register (CR-01, "arguably the most consequential" open item) | *(module catalog stripped to illustrative at v4.3.0, making the concrete risk moot for what's actually shipped; the general concern for a real third-party pipeline is not shown as structurally closed anywhere in this lineage)* | — |
| BullMQ/Redis as sole store for all scheduled-job state | — | Vulnerability Register (CR-07) | — | *(not shown as closed anywhere in this lineage)* |

---

## 4. Open Items Carried Beyond This Changelog

Per FINAL's own self-verification report, stated as a genuine decision point rather than a hidden gap: whether to extend the document further toward its ~1 MB target, and in which sections, since the scope cut and defect closures above were prioritized over reaching that length in this pass. Per the Vulnerability Register, two items remain flagged open with no resolution shown anywhere in this lineage (see table above): a real runtime sandbox for third-party module code, and a non-Redis-dependent fallback for scheduled-job durability.
