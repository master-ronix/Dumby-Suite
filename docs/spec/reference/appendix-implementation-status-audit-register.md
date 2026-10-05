---
id: SPEC-08-REFERENCE-0009
title: Appendix — Implementation Status & Audit Register
kind: spec
status: normative
version: 5.0.0
authority_scope: [08-reference]
anchors: [APPENDIX_IMPLEMENTATION_STATUS_AUD, EXTRACTED_AUDIT_ENTRIES, FROM_FRONT_MATTER_DOC, FROM_2_THE_UNIFIED, FROM_3_ENGINEERING_PRINCIPLES]
contracts: []
acceptance: [ACC-REF-0009-1]
owners: [framework-maintainers]
last_verified_commit: null
review_state: pending-evidence
---

## Appendix — Implementation Status & Audit Register

> **Genre boundary.** All audit entries, update notes, and status annotations are extracted here from the narrative. Each entry cites the section it was extracted from. **Status legend:** [SPEC] = architecture only · [SPECIFIED] = normative v5.0 specification with a named rollout phase · [PROTO] = prototype exists · [IMPL] = implemented · [TESTED] = tested at scale · [DEPLOYED] = running in production.
>
> **v5.0 re-baseline restatements.** Statuses restated against the 5.0.0 Consolidated Re-Baseline: CLAI's SSH transport (§22.6, §22.10) is [SPECIFIED — Phase 4]: a real ssh2 public-key server at `src/entry/ssh-clai.ts`, with no plaintext REPL remaining in the specification; Components V2 (§20.8) is [SPECIFIED — Phase 2]: the core Renderer with the static grammar, dynamic slots, and Modes D/M/C supersedes the earlier ~20%-implemented static-only Components V2 scaffold; Swastik (§15) is [SPECIFIED — Phases 1–3]: the tier-volume model, six-state license machine, trusted-build intake, and verified reload loop supersede the earlier ~30% hot-swap scaffold; the remaining v5.0 subsystems and their phases are recorded below.
>
> **v5.0 subsystem status (Phase 0–4 rollout).** Phase 0 — groundwork: the eleven ADRs (docs/adr/), the Compatibility Ledger skeleton (§14.4), `swastik` package repository, accent + title-grammar decisions. Phase 1 — module contract: raw TypeScript-only upload (§15.8), tier volumes (§5.4, §7.3), blind discovery (§8.2), `swastik` authoring package (§12.21), promotion loop (§15.4), deployment rate limits (§13.6) — all [SPECIFIED]. Phase 2 — the Renderer: core Renderer (§20.8), buffer embed and formal notices (§20.9), schema-declared authoring (§17.2), embed ban (§4) — all [SPECIFIED]. Phase 3 — governance & identity: license machine (§15.7), devId binding (§11.2), license classes and paper certificates (§22.8), credentials domain (§22.4), repository-triggered deployment (§15.11–§15.12), visibility enum (§11.2), hardcode toggle (§13.3) — all [SPECIFIED]. Phase 4 — platform surfaces: CLAI console (§22.6–§22.10), REST API families (§44.8), MDIS pub/sub sync (§16.5), Twill (§35) — all [SPECIFIED]. The 52 deferred greenfield items remain out of scope and must not be described as features; the shipped user-facing surface remains /health and /hello until the phased rollout records otherwise below.

### Extracted audit entries

#### [From front matter] Doc-drift note:

> **Doc-drift note:** "JavaScript-based" phrasing survived in earlier
> versions until v4.0.0. The framework is TypeScript — all language
> descriptions must use accurate "TypeScript" phrasing throughout.

####

> A single canonical command subsystem is consolidated (the top-level src/commands/ tree); no other command directory is canonical

#### [From §2 (The Unified Modular Doctrine)] — Swastik (External-Module System)

- **Intent:** Swastik is the external-module system responsible for hot-swap/hot-reload of modules on a running system. It is a separately-deployed service (src/entry/swastik.ts) that orchestrates uploads, validation, staging, and atomic promotion.
- **Purpose:** Orchestrate module version upgrades on a running system without core restarts.
- [SPEC] — Swastik is specified end to end (§15): tarball upload with path containment, validation, bounded staging, atomic symlink promotion, reload API invocation, and the bot-side /internal/reload consumer.
- Fully implemented Swastik service with upload, validation, staging, atomic symlink promotion, and reload API invocation.

#### [From §3 (Engineering Principles (P1–P14))] Standalone `grants` DB table + migration

- ABSENT — only the narrower `rbac_grants` (role/group/set-scoped) exists; the standalone `grants` table was never created.
- `grants` migration created, Knex-visible, with standard audit columns and partial-index uniqueness, queried by the wired permission engine.

#### [From §3 (Engineering Principles (P1–P14))] Guild Command Change Queue Processing Logic

- Table exists (M018 migration); no processing logic. (Note: Code Reality Inventory shows GuildCommandChangeQueue.ts and GuildCommandChangeScheduler.ts ARE implemented — discrepancy between doc claims and code reality.)
- Queue processing with deduplication, batched deployment, and scheduler polling.

#### [From §3 (Engineering Principles (P1–P14))] MTP (synthetic token ledger) service

- `mtp_token_ledger_daily` migration exists; no service.
- MTP service writing daily token ledger entries.

#### [From §3 (Engineering Principles (P1–P14))] Multi-Version Rollback History (keep last few good builds staged)

- F4/F5 describe preserving the previous version for instant rollback (single-version retention).
- Keep the last few known-good builds staged on the shared volume; auto-revert pointer on failed health check before or after swap.

#### [From §3 (Engineering Principles (P1–P14))] Outbound Webhook Delivery Service

- Two migrations exist; admin endpoints to manage webhooks exist (`GET/POST/DELETE /admin/guilds/:guildId/webhooks`); no delivery processor.
- BullMQ processor that dequeues webhook deliveries, posts via `HttpClient`, records idempotency, retries on failure.

#### [From §3 (Engineering Principles (P1–P14))] Service Classes for Partial-Implementation Tables

- Database migrations exist; no service classes written.
- Service classes for metering, backup, outbound webhooks, webhook delivery idempotency, and token ledger.

#### [From §3 (Engineering Principles (P1–P14))] `AnonymizationService` (production data anonymization)

- ABSENT. No `AnonymizationService` found anywhere.
- Anonymization pipeline integrated with ErasureCoordinator export path.

#### [From §3 (Engineering Principles (P1–P14))] `BackupService` (scheduled database backup)

- `backup_history` migration (1.2KB) exists; no `BackupService` class.
- Scheduled backup service with success/failure recording and restore linkage.

#### [From §3 (Engineering Principles (P1–P14))] `MeteringService` implementation (multi-tenant resource metering)

- Table `metering_usage_daily` created by migration; no `MeteringService` class anywhere in codebase.
- `MeteringService` recording daily usage buckets with repository, admin endpoint, and eraser registration.

#### [From §3 (Engineering Principles (P1–P14))] — Atomic Symlink Promotion (crash-safe swap)

- **Intent:** Module is either fully old or fully new at the filesystem level; no half-written reads.
- **Purpose:** Crash-safety for the hot swap.
- New version written to `versions/<mod>-vX.Y.Z/`; symlink in `live/` atomically updated; previous version preserved; on reload failure symlink reverts.
- Maintain as the core hot-swap mechanism.

####

> parsing manifest.ts via static AST extraction (no code execution)

####

> ### 3.2.1 Port Mapping: Docker Compose vs Kubernetes

####

> ### 3.11.1 Licensing Gate

####

> #### — Release Manager source integrity & build (immutable SHA, SBOM, signing, provenance)

####

> #### — Release Manager–Swastik lease coordination (fencing tokens, heartbeat, upload queueing)

####

> #### — Release Manager Deployment Strategies (Rolling, Blue-Green, Phased Ramp, DAG)

####

> #### — Release Manager canary analysis with correlation & minimum-sample guard

####

> #### — Release Manager config & migration safety (expand-only, advisory lock, destructive deferral)

####

> #### — K8s Rolling Update with Zero-Unavailable (maxSurge 1 / maxUnavailable 0)

####

> #### — BullMQ queue + autoscaler + DLQ + scheduler

#### [From §4 (Non-Goals & Explicit Boundaries)] — Release Manager 10-phase release state machine

- ** IDLE→PHASE0 INTAKE→1 PREFLIGHT→2 BUILD→3 ARTIFACT VERIFY→4 CONFIG&MIGRATION→5 LEASE→6 SWASTIK LOCK→7 ROLLOUT→8 CANARY→9 FINALIZE / R: ROLLBACK; terminals ABORTED/FAILED/RECONCILING/NO_OP. The specification requires: ** Implemented state machine with durable phase checkpoints.

####

> The error taxonomy in `src/errors/taxonomy.ts` implements 13 subclasses extending `DumbyError`, each carrying `httpStatus`, a `retryable` flag, and `toJSON`. The documented set in Appendix B must be updated to match: `ValidationError`, `PermissionDeniedError`, `NotFoundError`, `ConflictError`, `ExternalServiceError`, `ConfigurationError`, `InternalError`, `RateLimitedError`, `MaintenanceModeError`, `DependencyUnavailableError`, `EventCycleError`, `UnauthorizedError`, `CommandCeilingExceededError`, and `CollisionPendingError`. The `isOperational` field is absent; code uses `retryable`.

####

> Invalid uploads are rejected with specific validation errors

#### [From §6 (System Architecture)] — Power Engine (Policy Enforcement Point)

- **Intent:** Emergency authority for revocation, suspension, emergency disablement with mandatory audit logging.
- **Purpose:** Fully implemented enforcement methods + audit logging.
- [SPEC] — every control domain resolves to a real domain handler or returns an honest 501 NOT_IMPLEMENTED; the no-stub test walks every route (§22.3).
- Full enforcement + audit; Swastik enforces Power Engine decisions.

#### [From §7 (Directory & File Structure)] — /health slash command

- **Intent:** Documented Core-tier shipped command.
- Missing.
- Built.

#### [From §7 (Directory & File Structure)] — Live CommandRouter (thinner than spec)

- **Intent:** Routes slash interactions.
- Partially Implemented — wired to bootstrap, bypasses middleware, no collision resolution/cosmetics/hot-swap.
- Middleware-integrated.

#### [From §7 (Directory & File Structure)] — Spec-complete CommandRouter / registry (`src/commands/ (the canonical command system)`)

- **Intent:** Full command system with collision resolution, cosmetics, hot-swap, key codec, etc.
- Dead Code — zero external importers; 3 migrations Knex never sees.
- Wired or deleted (B2-023/B2-047).

#### [From §7 (Directory & File Structure)] — Observability (logging/metrics/tracing, items 217-239) implemented

- ** Metrics (release_manager_deploy_total, deploy_duration, phase_duration, rollback_total, swastik_lock_*, canary_*, lease_*, reconcile_mismatch_*), logs (service:'release-manager',deploy_id,phase,actor_id,trace_id), tracing spans per phase. The specification requires: ** Metrics + logs + traces as specified.

#### [From §7 (Directory & File Structure)] — Two-tier cache (L1 LRU + L2 Redis + PER + stampede guard + negative caching)

- **Intent:** Catalog the two-tier cache with stampede protection and probabilistic early refresh.
- **Purpose:** L1 in-process LRU (max 5000 entries / 50MB, sub-ms) + L2 Redis (fleet-wide, single-digit-ms) behind unified CacheManager API.
- CacheManager (~180 LOC), L1Cache (~157 LOC), RedisLockStore (~95 LOC), StampedeGuard (~42 LOC), key-namespace (~116 LOC) — ALL IMPLEMENTED. PER formula, negative caching, write-through invalidation, pub/sub cross-pod L1 invalidation.
- Maintained as production-grade cache.

####

> ### 7.10.1 Power Engine Route Dispatch

####

> #### — CLAI (control-plane operator terminal)

####

> #### — RBAC grants (permit/blacklist/whitelist/cooldown/rate-limit)

#### [From §8 (Application Bootstrap & Lifecycle)] Design consideration — shared connection pooler.

> **Design consideration — shared connection pooler.** Rather than raising PostgreSQL `max_connections` as pod count grows, deploy PgBouncer or pgcat as a shared connection pooler in front of PostgreSQL. This mitigates pool exhaustion during scale-out and reduces per-pod connection pressure on the Stage 05 connect path. Impact: Medium; feasibility: Medium.

#### [From §8 (Application Bootstrap & Lifecycle)] Roadmap note — environment-variable schema cross-check.

> **Roadmap note — environment-variable schema cross-check.** A Stage 02 failure is a config problem discovered at pod startup. Swastik can catch it earlier: extract the module's config Zod schema at upload time and simulate validation against the current (or a sample) environment, reporting missing or mis-typed variables before the module is ever staged. Cheap, because it reuses the same schema. Impact: Medium; feasibility: High.

#### [From §8 (Application Bootstrap & Lifecycle)] — 18-Stage Bootstrap (Delivered, Spec-Match)

- **Intent:** Verify that the bootstrap sequence is real implementation, not stubs.
- **Purpose:** A deterministic startup sequence from process setup to STARTUP_COMPLETE.
- Fully Implemented. The 18-stage bootstrap starts a health server before module loading, separates queue Redis from cache Redis, creates a frozen root container before spawning a child container for modules. Wired with real Redis, PostgreSQL (Knex), discord.js, and Fastify.
- Maintain forward-only advanceTo progress; keep startup/liveness/readiness probes gated by stage.

#### [From §8 (Application Bootstrap & Lifecycle)] Design consideration — enforce the overhead budget as CI gates.

> **Design consideration — enforce the overhead budget as CI gates.** The stated framework-overhead targets (P50 < 8 ms, P99 < 20 ms per command) are currently aspirations. `scripts/load-test.ts` should be wired into CI as a benchmarked gate so regressions against the budget fail the build — this budget is also the basis for rejecting per-command runtime policy checks. Impact: Medium; feasibility: Medium.

#### [From §8 (Application Bootstrap & Lifecycle)] Webhook Signature Verification Infrastructure

- Specified. Every inbound webhook route verifies HMAC-SHA256 with replay protection. Unverified webhooks refuse to register during Stage 14. No supported unverified-webhook mode.
- Implemented mandatory webhook verification with replay protection and Stage 14 registration gate.

#### [From §8 (Application Bootstrap & Lifecycle)] Zero-downtime mechanism for core restart (rolling/blue-green + gateway resume)

- Design specifies the requirement; K8s deployment.yaml has rolling update strategy, and a restart-window lock prevents a core-restart/module-hot-swap race condition.
- Implemented rolling/blue-green + Discord gateway session resume / shard handoff.

#### [From §8 (Application Bootstrap & Lifecycle)] Shard ownership handoff arbitration

- `RedisLockStore` (96L) with acquire/release; `SHARD_LOCK_*` env vars declared; no protocol in bootstrap.
- Bootstrap shard-claim sequence with TTL renewal and graceful release on shutdown.

**Middleware pipeline wired into live dispatch**

#### [From §8 (Application Bootstrap & Lifecycle)] — 12-stage middleware pipeline

- **Intent:** Request/interaction pipeline with 12 stages and correct priorities.
- **Purpose:** Live router routes through all 12 stages.
- [SPEC] — the pipeline is constructed at bootstrap Stage 09 with all twelve built-ins in priority order and injected into the live router; the structural wiring test asserts the chain on every build (§19.1).
- Live traffic flows through the 12-stage pipeline.

#### [From §8 (Application Bootstrap & Lifecycle)] Function reference — `topologicalLoadOrder` / `classifyLoadFailures` (Live):

> **Function reference — `topologicalLoadOrder` / `classifyLoadFailures` (Live):** Ensure modules load in dependency order; detect cycles. Status: topologicalLoadOrder (~89 LOC) — IMPLEMENTED. ModuleDependencyCycleError on cycle, UnknownModuleDependencyError on missing dep, classifyLoadFailures for fatal vs non-fatal. Requirement: Maintained as the module ordering mechanism. touchpoints: modules/topo-sort.ts.
#### [From §8 (Application Bootstrap & Lifecycle)] Intent Union Computation at Login

#### [From §8 (Application Bootstrap & Lifecycle)] register-all.ts

#### [From §8 (Application Bootstrap & Lifecycle)] 18-stage bootstrap Application

####

> #### 8.4.1 Process-Module Config Scope (`ModuleConfigScope`)

####

> #### Design Consideration — Managed Resource Registry

#### [From §9 (Graceful Shutdown & Signal Handling)] — 9-Step Graceful Shutdown

- **Intent:** Confirm the most load-bearing infrastructure matches spec exactly.
- **Purpose:** Establish graceful shutdown as delivered Tier-1.
- `bootstrap/stages.ts` defines 18 stage names + 9 shutdown step names as literal ordered string-literal arrays matching `master-prompt.md` §4/§4 exactly. `bootstrap/bootstrap.ts` wires Postgres (Knex), Redis (ioredis, twice — cache + queue), BullMQ, DI container, live/mock Discord gateway, calls `progress.advanceTo(...)`. Health gates `isLive`/`isStarted`/`isReady` keyed to stages 04/15/18. K8s `terminationGracePeriodSeconds: 190` exact.
- Maintain the 9-step sequence.

#### [From §10 (Dependency Injection & Service Container)] Design consideration — operator policy lockfile.

> **Design consideration — operator policy lockfile.** An operator-authored JSON policy file — `allowedExternalDomains`, `maxCommandsPerModule`, `forbiddenIntents`, `requiredRBACFloor` — loaded once at Stage 11 and enforced when module manifests are validated: declarations that violate the policy fail the load (or log a severe warning). Checking only at bootstrap/hot-reload — never per command — preserves the sub-20 ms P50 overhead budget while giving operators a central, verified-once gate. A ~10-line Zod check makes this high feasibility. Impact: High; feasibility: High.

#### [From §10 (Dependency Injection & Service Container)] Design consideration — three-layer memory-leak guardian.

> **Design consideration — three-layer memory-leak guardian.** Memory-leak protection should be a default runtime property, not opt-in: detection in observability and CI, prevention in the DI container/EventBus/CacheManager (enforcing cleanup discipline at bind and subscribe time), remediation in the Kubernetes probes and Swastik's suspend/rollback path. The DI discipline this section specifies already provides the hooks; they need to be made enforcing. Impact: High; feasibility: Medium.

#### [From §10 (Dependency Injection & Service Container)] Roadmap note — ESLint rule `dumby/no-orphaned-closures`.

> **Roadmap note — ESLint rule `dumby/no-orphaned-closures`.** The module structure is rigid enough that a linter always knows where `onUnload` lives. A custom ESLint rule can therefore require that every `setTimeout` is assigned to a variable cleared in `onUnload`, and that every `EventBus.on` unsubscribe function is stored and called — blocking leak-prone PRs at CI before they reach production. Impact: Medium; feasibility: High.

#### [From §10 (Dependency Injection & Service Container)] `PowerEngineService` class missing

- ABSENT — only the generic dispatcher wrapper exists; no `PowerEngineService` class.
- Service class backing all 17 domains, registered in DI.

#### [From §10 (Dependency Injection & Service Container)] ESLint Rule dumby/no-orphaned-closures (Static Leak Guard)

- ABSENT — proposed; justified by rigid module structure (§10.3) letting the linter know where onUnload lives.
- ESLint rule fails CI instantly on orphaned closures.

#### [From §10 (Dependency Injection & Service Container)] ITimerService DI Token (Forbid Raw setTimeout/setInterval in Modules)

- ABSENT — proposed.
- ITimerService injected into every module container scope; resourceTracker.clearAllTimers auto-called on unload.

#### [From §10 (Dependency Injection & Service Container)] — Cross-Module Synchronous Calls via provides/depends

Maintain as-is; document the contract validation and version constraint checking.

#### [From §10 (Dependency Injection & Service Container)] — Manifest Contract (hardcoded/hardcodeGuildId/visibility triad)

- **Intent:** Every capability explicit — intents, commands, jobs, provides tokens, events, schemas — declared up front; validated at startup so a malformed module doesn't load.
- **Purpose:** Truth contract, not config file.
- Fully Implemented (per docs) — 28+ required/optional fields; compile-time provides-contract checking via TS types.
- Maintained.

#### [From §10 (Dependency Injection & Service Container)] Module Isolation via DI Scoping (P2) + Module Contract

#### [From §10 (Dependency Injection & Service Container)] Bootstrap 18-Stage Startup Sequence

#### [From §10 (Dependency Injection & Service Container)] DAG Workload Ordering

#### [From §10 (Dependency Injection & Service Container)] Four Sanctioned Cross-Module Communication Patterns

#### [From §11 (Module Anatomy & Manifest)] Design consideration — diff-based auto-approval heuristic.

> **Design consideration — diff-based auto-approval heuristic.** Version updates whose manifest diff does not touch permission scope, entry points, or dependencies can be auto-approved — the extension-store pattern: nobody hand-reviews a changelog typo. A manifest diff comparator gates the approval workflow, while sensitive-diff updates stay in the manual queue. Trade-off: this is a heuristic, not a guarantee. Impact: Medium; feasibility: High.

#### [From §11 (Module Anatomy & Manifest)] Roadmap note — duplicate source detection on upload.

> **Roadmap note — duplicate source detection on upload.** Swastik should hash the uploaded source and dedupe against earlier staged builds, rejecting accidental duplicate uploads before compute is spent staging them. Saves compute and keeps the build record unambiguous about which artifact is which. Impact: Low; feasibility: High.

#### [From §11 (Module Anatomy & Manifest)] Roadmap note — general module sandboxing via worker threads.

> **Roadmap note — general module sandboxing via worker threads.** Worker-thread isolation is currently specified for CPU-intensive work only. Extending it to a `ModuleWorkerHost` running untrusted Marketplace modules in isolated worker threads with IPC would make the marketplace trust model structural rather than review-based. Impact: High for marketplace trust; feasibility: Low (V2).

#### [From §11 (Module Anatomy & Manifest)] Roadmap note — module self-test entries.

> **Roadmap note — module self-test entries.** The `module_selftest_entries` table exists but nothing invokes it. A module self-test runner, executed at deploy/staging time from Swastik, would turn the table into its intended purpose: per-module health validation before promotion. Impact: Medium; feasibility: Medium.

#### [From §11 (Module Anatomy & Manifest)] Design consideration — framework-injected runtime config.

> **Design consideration — framework-injected runtime config.** Each module currently applies its own config schema during `onLoad` (Stage 12). A stronger contract is framework injection: bootstrap reads the manifest's declared config schema, validates the environment once, and hands the module a frozen, typed, validated config object — guaranteeing the declared schema is the schema actually used, and giving developers typed config for free. Impact: Medium; feasibility: High.

####

> requires the module to contain the public Dev ID and the buildId; the private Dev Token never ships inside the manifest

####

> The Credentials Service listen port must be config-driven via the Zod-validated `env.schema.ts` (`CREDENTIALS_SERVICE_PORT`, default `8086`), consistent with all sibling services that source ports from environment configuration. The hardcoded `8086` in `src/entry/credentials.ts` must be replaced with the config value.

#### [From §11 (Module Anatomy & Manifest)] Cryptographic Signing & Provenance

#### [From §11 (Module Anatomy & Manifest)] Per-Module Sandbox Worker (process/container isolation + RPC boundary)

#### [From §11 (Module Anatomy & Manifest)] Content-Addressed Staging (never overwrite in place)

#### [From §11 (Module Anatomy & Manifest)] External Module Loading

#### [From §11 (Module Anatomy & Manifest)] Manifest as Module Contract (declarative, versioned, ships with module)

####

> no field

#### [From §12 (Building a Module — A Complete Worked Example)] Design consideration — runtime `eventsCatalog` enforcement.

> **Design consideration — runtime `eventsCatalog` enforcement.** The catalog is currently enforced only by compile-time lint. Wrapping each module's event bus in a module-scoped emitter that checks `emit` against the manifest's declared `eventsCatalog` would make an undeclared event a runtime error at the source, not a lint warning that can be skipped. Impact: Medium; feasibility: High.

#### [From §12 (Building a Module — A Complete Worked Example)] Roadmap note — static analysis of `eventsCatalog` and dependencies.

> **Roadmap note — static analysis of `eventsCatalog` and dependencies.** A post-build static analyzer should cross-check emitted events, `provides` tokens, and dependency declarations against the manifest, rejecting the upload with clear errors on mismatch. Fast, deterministic, and it enforces the framework's own contract discipline before code ever reaches a pod. Impact: Medium; feasibility: High.

#### [From §12 (Building a Module — A Complete Worked Example)] Roadmap note — local module validator CLI.

> **Roadmap note — local module validator CLI.** A `pnpm dumby module validate` CLI that mirrors Swastik's upload-time checks would let module authors catch contract, event, config, and migration failures locally — before upload, and reproducibly. Zero trade-off for compliant developers; every rejection it prevents is a failed upload that never happened. Impact: Medium; feasibility: High.

#### [From §12 (Building a Module — A Complete Worked Example)] UIResponse Type Schema

- ABSENT.
- `dumby/core/ui/ResponseSchema.ts` defines `UIResponse = | { type:'card'; title?; body:UIComponent[]; actions?:UIComponent[]; ephemeral?:boolean } | { type:'modal'; title; fields:UIInput[]; submitAction:string } | { type:'pagination'; data:UIComponent[]; pageSize:number }`.

#### [From §12 (Building a Module — A Complete Worked Example)] Discord API 429 rate-limit handling/retry

- CommandRouter acknowledgement guard exists; no 429 handling/retry logic.
- `CommandDeployer` and gateway calls respect Discord rate-limit headers with bucketed backoff.

#### [From §12 (Building a Module — A Complete Worked Example)] Server-Driven UI (SDUI) — UIResponse Schema Replacing interaction.reply

- ABSENT — proposed; document currently gives modules total freedom over interaction.reply (§12.4 RemindCommand builds custom embed).
- ICommand.execute returns Promise<UIResponse>; ESLint rule no-direct-interaction-reply hard-blocks interaction.reply/editReply/followUp/EmbedBuilder.

#### [From §12 (Building a Module — A Complete Worked Example)] — defineManifest({...})

**Specification.** Used by module authors; the exported object is read via static AST extraction of the `defineManifest(...)` argument (TypeScript Compiler API / ts-morph) — never by executing the module.

Argument extracted via AST without evaluation.

#### [From §12 (Building a Module — A Complete Worked Example)] — onLoad(container) / onReady(client) (Module Lifecycle Hooks)

Maintained.

#### [From §12 (Building a Module — A Complete Worked Example)] — onUnload (Module Cleanup Hook)

Framework auto-cleans via resource tracker.

#### [From §12 (Building a Module — A Complete Worked Example)] — I18nManager + formatters

Add additional locales.

#### [From §12 (Building a Module — A Complete Worked Example)] — Modules (loader + manifest schema + topo-sort + Swastik loader)

Maintain; wire core/commands into the active path.

####

> A single canonical retry mechanism is used: consolidate resilience/retry-policy.ts with shared/utils/retry.ts (exponential backoff with jitter and retryable detection) and remove the unused duplicate.

####

> PersonaCommandBindingService and CommandLifecycleHotSwapService are wired into bootstrap.ts and core/commands/ so persona bindings take effect and hot-swap is triggerable via the reload API; the built-and-tested classes are no longer without an entry point.

####

> All table access goes through typed repositories (BaseRepository / InsertOnlyRepository); no raw knex('table') calls remain outside repositories in bootstrap, admin routes, or entry points, and audit_logs uses InsertOnlyRepository.

####

> ErasureCoordinator is registered in the DI container (src/di/tokens.ts) and exposed for module registration of erasers/exporters; the implemented coordinator is no longer zero-caller.

#### [From §13 (Module Tiers & Lifecycle)] Expand-Only Migrations / Destructive Deferral

#### [From §13 (Module Tiers & Lifecycle)] — Seven-Layer Permission Engine (PermissionResolver)

- **Intent:** The single, unified engine deciding whether a given user, in a given guild and channel, is authorized to invoke a given command — the one source of truth (P13).
- **Purpose:** Serve as the sole permission authority for all command dispatches and dashboard API requests.
- [SPEC] — resolved as a mandatory stage of every dispatch through the 12-stage middleware pipeline (§19.1); the structural wiring test fails the build if the live router bypasses it.
- Fully Implemented and wired into every command dispatch through the middleware pipeline.

#### [From §13 (Module Tiers & Lifecycle)] — Power Engine Seventeen Control Domains

- **Intent:** A catalog of callable functions for deliberate, logged intervention.
- **Purpose:** Enable fleet-wide response to abuse/security without redeploy.
- 17 domains (suspendGuild, suspendModule, suspendDeveloper, suspendCommand + 13 extended); each writes an unconditional audit_logs entry before returning.
- Maintain; the schema is future-proof for a natural-language front end.

#### [From §13 (Module Tiers & Lifecycle)] Design Consideration — Trusted Builder, Twelve-Step Pipeline

#### [From §13 (Module Tiers & Lifecycle)] Defense-in-Depth Firewall (No Single Gate)

####

> Admin tier's bypass of the ordinary rate-limit and permission chain makes it the

#### [From §14 (Inter-Module Communication)] — ModuleDisabledResult Sentinel

Maintain; add a lint rule for unchecked sentinels.

####

> consolidated retry utility (exponential backoff, jitter, max-attempts)

####

> **Design consideration — type-level compatibility checks:** beyond semver range satisfaction, the specification requires for Swastik to resolve the full dependency graph and perform type-level compatibility checks between `provides` and `depends` contracts using the TypeScript type checker, so a breaking contract change forces a major-version bump instead of surfacing as a silent runtime `TypeError` in production. This turns version pinning from a convention into a mechanically enforced guarantee.

#### [From §15 (Swastik — Hot Reload & Dynamic Module Management)] — ICommand Interface (SlashCommandBuilder Required)

- **Intent:** The command interface that all module commands must implement. Requires a SlashCommandBuilder, making text-prefix commands structurally impossible.
- **Purpose:** Serve as the mandatory contract for all commands, requiring SlashCommandBuilder or ContextMenuCommandBuilder.
- Specified. ICommand interface requires a SlashCommandBuilder. The manifest has no textPrefixes field.
- Maintained as SlashCommandBuilder-required. No text-prefix fields added.

#### [From §15 (Swastik — Hot Reload & Dynamic Module Management)] — Command system (`commands/`, flat)

- **Status:** Fully Implemented. `command-registry.ts` (79L, `CommandCollisionError`), `command-router.ts` (196L, Proxy acknowledgement guard), `command-deployer.ts` (216L), `command-ceiling.ts` (64L, MAX_COMMANDS_PER_GUILD=100), `collision-resolution.ts` (145L, 5-step). Notes: this is the WIRED subsystem.

#### [From §15 (Swastik — Hot Reload & Dynamic Module Management)] POST /internal/reload?module=<name> (Hot-Swap Signal)

#### [From §15 (Swastik — Hot Reload & Dynamic Module Management)] Hot-Swap Reload Sequence (onUnload → re-import → onLoad → onReady → health)

#### [From §15 (Swastik — Hot Reload & Dynamic Module Management)] Function reference — `QueueManager.enqueue` (idempotencyKey) — `queue/queue-manager.ts`:

> **Function reference — `QueueManager.enqueue` (idempotencyKey) — `queue/queue-manager.ts`:** L1 check → L2 check → stampede-guarded recompute → populate both tiers. Negative caching with sentinel. Status: CacheManager.get<T> — IMPLEMENTED. L1→L2→recompute cascade, write-through set, delete (L2 first then L1), invalidatePattern. Requirement: Maintained as the unified cache API. touchpoints: cache/cache-manager.ts, cache/l1-cache.ts, cache/stampede-guard.ts.
#### [From §15 (Swastik — Hot Reload & Dynamic Module Management)] BullMQ Worker Hot-Swap Handling

#### [From §15 (Swastik — Hot Reload & Dynamic Module Management)] — Release Manager GitHub→deploy integration with OIDC

- **Intent:** Routes Discord Interactions (slash commands, context menus) to registered command handlers. Structurally incapable of routing text-prefix commands.
- **Purpose:** Serve as the sole command dispatch entry point, accepting only Interaction objects and routing to commands via a Map<string, ICommand> keyed by slash-command paths.
- Specified. The CommandRegistry is a Map<string, ICommand> where keys are slash-command paths. No text-based dispatch exists. The function CommandRouter.dispatchText('kick', message) does not exist.
- Maintained as Interaction-only. No text dispatch capability added.

#### [From §15 (Swastik — Hot Reload & Dynamic Module Management)] Release Manager Security Threat Model

#### [From §15 (Swastik — Hot Reload & Dynamic Module Management)] Global Lock During Core Restart

#### [From §15 (Swastik — Hot Reload & Dynamic Module Management)] Renewable Lease + Fencing Token

#### [From §15 (Swastik — Hot Reload & Dynamic Module Management)] Pipeline-signal-only reload (no generic file watcher)

#### [From §15 (Swastik — Hot Reload & Dynamic Module Management)] — Manifest Validation (Zod Schema, Shared with Startup Stage 11)

Single shared schema package + pre-activation pass.

#### [From §15 (Swastik — Hot Reload & Dynamic Module Management)] — devId/buildId Binding Check (§13)

Maintained.

#### [From §15 (Swastik — Hot Reload & Dynamic Module Management)] — Developer Upload & Status Tracking (§15.8, §15.11)

Maintain API response + optional signed webhook.

####

> Approval scope is per-version, not developer-level: routine semver bumps auto-approve, while any change to declared permissions, entry points, or dependencies is flagged for manual review via a manifest diff comparator.

####

> The onUnload → onLoad → onReady hot-swap sequence is shipped as executable TypeScript in the Swastik service and Dumby runtime (POST /internal/reload): atomic symlink management, command/event re-registration, and automatic rollback on any lifecycle-hook failure

####

> The builds table carries provenance columns sourceArchiveHash, artifactHash, lockfileHash, gateResultsHash, signature, and sbomRef, bound to the buildId so every promotion is provably tied to a verified artifact

####

> Swastik assigns a buildId in semver+content-hash form (2.3.1+sha256:9f1c…) stored in swastik_builds.buildId and the manifest buildId field, replacing the integer counter

####

>

####

>

####

> , AND Swastik MUST accept TypeScript source (not pre-compiled JavaScript) and run a trusted build itself — `tsc --noEmit` plus the architecture-specific ESLint ruleset (§38.4) in a secure container — producing the artifact it then stages. Manifest Zod validation alone does not verify that uploaded JS was compiled from reviewed TypeScript

####

> (whose signature is verified at every load boundary — initial import, hot-swap re-import, and reload — not only at process restart; `Power Engine.revokeModuleSignature` triggers immediate re-verification of the affected module at the next load boundary)

#### [From §15 (Swastik — Hot Reload & Dynamic Module Management)] POST /swastik/modules/upload (Module Upload Endpoint)

#### [From §15 (Swastik — Hot Reload & Dynamic Module Management)] Auto-rollback on hot-swap failure

#### [From §15 (Swastik — Hot Reload & Dynamic Module Management)] Module Upload & Manifest Validation Pipeline

#### [From §15 (Swastik — Hot Reload & Dynamic Module Management)] Atomic Symlink Promotion & Rollback

#### [From §15 (Swastik — Hot Reload & Dynamic Module Management)] Swastik as Administrative Control Plane (separate from request plane)

#### [From §16 (Marketplace, MDIS & Extension System)] ModuleRegistry.discover — Configurable Root Scan

#### [From §16 (Marketplace, MDIS & Extension System)] — Background Listener Pattern (Message Scanning)

- **Intent:** Catalog the architectural pattern where message scanning is a background service separate from command execution.
- **Purpose:** Modules can read every message and react (auto-mod, sentiment, archiving, spam detection) but cannot turn that into a command system. Two separate worlds: background scanning (EventRouter) vs foreground interaction (CommandRouter).
- Fully implemented. EventRouter delivers messageCreate events to handlers. CommandRouter only accepts Interactions. No text dispatch function exists.
- Maintained as the core design principle.

#### [From §16 (Marketplace, MDIS & Extension System)] — Review Feedback Is Specific (Never Generic Rejection)

Maintain specific feedback requirement.

####

>

#### [From §16 (Marketplace, MDIS & Extension System)] Gate 1 (automated static analysis)

#### [From §16 (Marketplace, MDIS & Extension System)] Gate 5 (cryptographic signing)

#### [From §17 (Command Framework & Routing Engine)] Port-based dependency inversion (hexagonal command ports)

#### [From §17 (Command Framework & Routing Engine)] Background Listener Pattern

#### [From §17 (Command Framework & Routing Engine)] Discord's Message Content Privileged Intent

#### [From §17 (Command Framework & Routing Engine)] Hexagonal Architecture (Ports & Adapters) in Core/Commands

#### [From §17 (Command Framework & Routing Engine)] Zero-Knowledge Command Transactions (Slash Commands)

#### [From §17 (Command Framework & Routing Engine)] Function reference — Command Collision Resolution UX:

> **Function reference — Command Collision Resolution UX:** On install collision, the admin sees an ephemeral embed with a dropdown to resolve the conflict (§17.9) — superseded by the embed ban (ADR-001); the collision-resolution surface is renderer-issued Components v2. Status: Implemented (§17.9); admin never interacts with the review pipeline.; Requirement: Implemented collision-detection + dropdown resolution UI. touchpoints: Install flow (§16.2), collision resolver (§17.9), ephemeral embed UI., §17.9 Command Collision Resolution; install flow (§16.2).
#### [From §17 (Command Framework & Routing Engine)] — Core/Commands Hexagonal Architecture

- **Intent:** Catalog the most substantial subsystem: 14 services + types + ports + 3 migrations + 12 test files (~2,749 LOC).
- **Purpose:** Complete command lifecycle management: deployment planning, hot-swap, persona binding, guild-level change queuing, collision resolution, cosmetic management.
- FULLY BUILT. 14 services: CommandRegistry, CommandRouter, CommandDeployer, CommandDeploymentPlanner, CommandCollisionResolver, CommandKeyCodec, CommandValidationService, CommandCosmeticsService, CommandCountProjectionService, CommandLifecycleHotSwapService, CommandRestrictionGuard, GuildCommandChangeQueue, GuildCommandChangeScheduler, PersonaCommandBindingService.
- Maintained as the primary command subsystem.

#### [From §17 (Command Framework & Routing Engine)] — GuildCommandChangeQueue + GuildCommandChangeScheduler

Wire GuildCommandChangeScheduler.start into bootstrap.

#### [From §17 (Command Framework & Routing Engine)] — PersonaCommandBindingService

Wire into persona entry point.

#### [From §17 (Command Framework & Routing Engine)] — commands/ subsystem (registry, router, deployer, ceiling, collision)

Reconcile with core/commands/.

#### [From §17 (Command Framework & Routing Engine)] — core/commands/ hexagonal subsystem (14 services + ports + types + 3 migrations + 12 tests)

Wire into bootstrap.

#### [From §19 (Middleware Pipeline & Interceptors)] CommandRouter Only Accepts Discord Interactions

#### [From §19 (Middleware Pipeline & Interceptors)] `MiddlewarePipeline.execute` (Unused by Live Router)

#### [From §19 (Middleware Pipeline & Interceptors)] interaction.reply / deferReply / editReply / followUp / showModal

#### [From §19 (Middleware Pipeline & Interceptors)] CommandRouter (Post-Middleware UI Compiler in SDUI)

#### [From §19 (Middleware Pipeline & Interceptors)] — SlidingWindowRateLimiter

Maintain.

#### [From §19 (Middleware Pipeline & Interceptors)] Failure Containment via Per-Handler Isolation

#### [From §19 (Middleware Pipeline & Interceptors)] Memory Leak Threat Model (Five Vectors)

####

>

####

> #### 19.6.1 MDIS Backend — Schema-Driven Web Config UI

#### [From §20 (Interaction & Component Handling)] Core-Owned InteractionRegistry with Action ID Prefixing

- ABSENT — proposed alongside SDUI.
- Core resolves actionId → module handler; idempotency for button clicks enforced at Core via Redis.

#### [From §20 (Interaction & Component Handling)] Stateless custom_id scheme (Components V2)

- `interaction-registry.ts` (47L) exists but minimal; no stateless scheme.
- Encoded custom_id format (e.g. `module:action:payload`) parseable without server state.

#### [From §20 (Interaction & Component Handling)] WebhookRenderer (Sanctioned Exception to UI Ban)

- ABSENT — proposed.
- WebhookRenderer utility enforcing UIResponse schema for async messages.

#### [From §20 (Interaction & Component Handling)] — InteractionRegistry

Wire the custom_id encoding scheme and button/select dispatch.

#### [From §20 (Interaction & Component Handling)] — Pagination / Form Sessions (PaginationManager)

Maintain as-is; document the PaginationManager API and Redis session storage pattern.

#### [From §22 (Power Engine Panel, CLAI & Credentials Service)] Explicit CLAI SSH Key Lifecycle Boundary Statement

- The document (§22.6) says each operator's key is registered individually and revocable independently, but does not describe the revocation mechanism or whether keys are re-read at runtime.
- An explicit statement such as: "CLAI's SSH key file is read once at daemon start. Rotating an operator's key requires a kubectl rollout restart deployment/clai."

#### [From §22 (Power Engine Panel, CLAI & Credentials Service)] `entry/ssh-clai.ts` File

- Referenced in a source comment; file absent.
- A real `entry/ssh-clai.ts` using the `ssh2` library for public-key auth.

#### [From §22 (Power Engine Panel, CLAI & Credentials Service)] — CLAI (Control-Plane Entry Point)

- **Intent:** CLAI is an SSH-hosted operator terminal providing direct, interactive access to Power Engine's function catalog from outside Discord entirely. Its defining property is independence from every other part of the stack that could be the thing currently broken.
- **Purpose:** Provide a viable intervention path even when the Discord gateway is down, a shard group is unresponsive, or a core restart is mid-rollout.
- Specified as SSH-hosted terminal with public-key authentication. Architecture-only. Project context indicates entry/clai.ts may be a SSH (ssh2) socket — a spec-vs-implementation mismatch.
- Implemented SSH-hosted terminal with per-operator key registration/revocation, connecting to Power Engine's function catalog.

#### [From §22 (Power Engine Panel, CLAI & Credentials Service)] Power Engine signModule / revokeModuleSignature

#### [From §22 (Power Engine Panel, CLAI & Credentials Service)] entry/clai.ts (SSH (ssh2) server)

#### [From §22 (Power Engine Panel, CLAI & Credentials Service)] Argon2id Credential Hashing

#### [From §22 (Power Engine Panel, CLAI & Credentials Service)] Function reference — Credentials Service (Argon2id, Internal Network Binding):

> **Function reference — Credentials Service (Argon2id, Internal Network Binding):** Provide a reference for the credentials service contract. Status: Fully Implemented. Credentials Service uses Argon2id for credential hashing. Internal-network-only binding for the credentials service. Separate entry point: `credentials.ts`. Requirement: Maintain as-is; ensure the internal-network-only binding is enforced at the network level (Kubernetes NetworkPolicy). touchpoints: `src/entry/credentials.ts`; `src/credentials/` (CredentialsService).

####

> > **ADR-005 deferral:** Hot-swap mechanism, worker-thread isolation,
> scheduled zero-downtime core restart, and runtime sandbox are all
> absent — correctly deferred per ADR-005 as V2 capabilities. No runtime
> sandbox exists; modules load in-process. Worker-thread sandboxing is
> planned for untrusted marketplace modules.

#### [From §23 (Configuration Management)] Design consideration — feature-flag lifecycle management.

> **Design consideration — feature-flag lifecycle management.** Temporary flags parked in `guild_configs` settings tend to become permanent: over months dozens accumulate and nobody remembers which are still relevant — code becomes an unmaintainable mess of conditionals. A feature-flag registry with expiration dates and automated cleanup (or a dedicated flag service) would keep this table from decaying.

#### [From §23 (Configuration Management)] Roadmap note — repository abstraction for `guild_configs` access.

> **Roadmap note — repository abstraction for `guild_configs` access.** Direct Knex calls against `guild_configs` outside the repository layer should be refactored into `src/db/repositories/` so this table — like every other table — is reached through a single owned abstraction. The cache-invalidation and schema-evolution guarantees above assume all writes flow through the validated path; scattered Knex calls quietly break that assumption. Impact: Low; feasibility: High.

#### [From §23 (Configuration Management)] State Externalization constraint (cross-process state in PG/Redis)

#### [From §23 (Configuration Management)] Effective Config Descriptor (signed, replaces "encrypted license file")

#### [From §24 (Database Architecture)] — Two-Tier Cache with Stampede Protection

- **Intent:** L1 in-process LRU cache, L2 Redis cache, with stampede protection combining distributed lock on true miss (Redis SETNX with short TTL) and probabilistic early refresh.
- **Purpose:** Provide high-performance caching with protection against cache stampede and negative caching.
- Specified. Two-tier cache (L1 in-process LRU, L2 Redis) with stampede protection, negative caching with sentinel value, cross-process invalidation via Redis pub/sub.
- Implemented two-tier cache with both stampede protection mechanisms.

#### [From §24 (Database Architecture)] — Observability (Pino + prom-client + OpenTelemetry, one correlationId)

- **Intent:** Three pillars, one correlationId: logs (Pino child logger pre-bound with correlationId/guildId/userId), metrics (prom-client auto-instrumented), traces (OpenTelemetry, OTLP export).
- **Purpose:** Structured, correlated telemetry.
- Fully Implemented (per docs) — logger-level redaction; unconditional sampling of error traces.
- Maintained; extend with memory metrics.

#### [From §24 (Database Architecture)] — BaseRepository + InsertOnlyRepository

Maintain; ensure no raw Knex outside repos/migrations.

####

> migration #24 clai_authkeys (deprecated, superseded by the clai_operators/clai_authkeys design, §22.10)

#### [From §25 (Caching Architecture)] — `shouldEarlyRecompute` (PER, Unused)

Called by CacheManager.get.

#### [From §28 (Error Management & Fault Tolerance)] Heap Diff Watcher (Layer 1: Detection)

#### [From §28 (Error Management & Fault Tolerance)] Managed Resource Registry (Layer 2: Prevention)

#### [From §28 (Error Management & Fault Tolerance)] Function reference — DbClient (Knex wrapper with circuit breaker + slow query logging):

> **Function reference — DbClient (Knex wrapper with circuit breaker + slow query logging):** Provide a reference for the HTTP client contract. Status: Fully Implemented. Modules call `httpClient.extend({ baseUrl, headers })` then `.get`, `.post`, etc. Framework Core provides circuit breaker, retries, and correlation-ID propagation.; Requirement: Maintain as-is; document the circuit breaker configuration and retry policy. touchpoints: `apps/main/src/http/client.ts`, `src/http/HttpClient`; circuit breaker; retry logic.

####

>

#### [From §29 (Job Queue & Scheduling)] — Job Queue (BullMQ + autoscaler + scheduler + DLQ)

Maintain as-is; document the retry policy configuration and dead-letter queue handling.

#### [From §29 (Job Queue & Scheduling)] — QueueManager Worker Lifecycle (pause → finish → close → spawn)

Implemented with dead-letter fallback.

#### [From §33 (Performance & Scalability Engineering)] Design Consideration — Per-Module Volume Mount

#### [From §33 (Performance & Scalability Engineering)] Lease Heartbeat (10s / TTL 30s)

#### [From §33 (Performance & Scalability Engineering)] Fencing Token Generation

#### [From §33 (Performance & Scalability Engineering)] Release Manager DAG Workload Ordering

#### [From §37 (Testing Architecture & QA)] — Per-Layer Coverage Floors (§37.4)

Maintain per-layer floors.

#### [From §38 (Developer Experience & Tooling)] — Scaffolding CLI (pnpm dumby scaffold module)

A working `dumby scaffold module <name>` CLI command that copies the `_template` module, renames it, generates a valid manifest.ts, and creates the directory structure.

#### [From §38 (Developer Experience & Tooling)] — pnpm dumby module validate (proposed CLI)

_template-backed scaffolding.

#### [From §38 (Developer Experience & Tooling)] Design Consideration — `no-direct-interaction-reply` ESLint Rule

#### [From §38 (Developer Experience & Tooling)] Zero-Trust Build Pipeline

####

> ### 38.11 eventsCatalog

####

> Isolation rules and the four sanctioned cross-module patterns complement the import ban: today they are enforced via ESLint (`no-cross-module-relative-import`) at compile time plus manual review; the target adds enforcement at Swastik upload and at runtime (ESM loader restrictions, ).

#### [From §39 (Development Workflow)] — Local Testing Commands (§39.1, §39.3)

Maintain local command set.

#### [From §39 (Development Workflow)] — DI container (Symbol tokens, 3 lifetimes, child containers)

- **Intent:** Dependency injection container registering services including PermissionResolver.
- **Purpose:** All registered DI tokens resolved by their consumers.
- DI container matches spec; PermissionResolver registered, never resolved.
- PermissionResolver resolved and invoked.

#### [From §39 (Development Workflow)] Function reference — 7-Point Architecture Review Checklist (§39.4):

> **Function reference — 7-Point Architecture Review Checklist (§39.4):** (1) Tier Honesty; (2) Three-Layer Rule (no repo logic in command, no business logic in repo); (3) No cross-module reach — only 4 sanctioned patterns (§14.1); (4) Migrations — every migration has working `down`; (5) Eve… Status: Implemented (§39.4) — explicit 7-point checklist. Requirement: Maintain all 7 points; ensure reviewer specifically checks the pre-condition-check pattern for idempotency. touchpoints: §39.4 checklist; §14.1 sanctioned patterns; `eventsCatalog`; `eventBus.emit`; `BaseProcessor` jobs; §37.4 coverage floors.
#### [From §39 (Development Workflow)] BaseProcessor (job processor base class)

#### [From §39 (Development Workflow)] migration up / down

#### [From §40 (CI/CD Pipeline)] Function reference — Core Release Pipeline (Path A):

> **Function reference — Core Release Pipeline (Path A):** Merge → CI (`ci.yml`, §40.1: tsc/ESLint/Prettier/Vitest with coverage) → Staging (`deploy-staging.yml`, §40.3: auto on merge, no human approval) → Production gate (`deploy-production.yml`, §40.4: two distinct human appro… Status: Implemented. Requirement: Maintain the two-approver manual production gate. touchpoints: `ci.yml` (§40.1); `deploy-staging.yml` (§40.3); `deploy-production.yml` (§40.4); Kubernetes rolling update (§33.2); 18-stage bootstrap (§8.2); 9-step graceful shutdown (§9.1).
#### [From §40 (CI/CD Pipeline)] SBOM / Hash Computation

#### [From §40 (CI/CD Pipeline)] Release Manager Complete Release Workflow Sequence

#### [From §40 (CI/CD Pipeline)] — Release Manager State Machine (10 Phases + Terminal States)

- **Intent:** Define the deterministic phase progression for Release Manager releases.
- **Purpose:** Crash-recoverable release pipeline with durable checkpoints.
- Specified — IDLE → PHASE 0: INTAKE → PHASE 1: PREFLIGHT → PHASE 2: BUILD → PHASE 3: ARTIFACT VERIFICATION → PHASE 4: CONFIG AND MIGRATION → PHASE 5: LEASE ACQUISITION → PHASE 6: SWASTIK LOCK → PHASE 7: ROLLOUT → PHASE 8: CANARY VALIDATION → (PASS) PHASE 9: FINALIZE → SUCCESS / (FAIL) PHASE R: ROLLBACK → ROLLED_BACK. Terminal states: ABORTED, FAILED, RECONCILING, NO_OP.
- Implemented state machine with persistent phase checkpoints in PostgreSQL.

#### [From §40 (CI/CD Pipeline)] — Release Manager Fencing Tokens

- **Intent:** Prevent stale Release Manager instances from issuing instructions after crash/restart.
- **Purpose:** Monotonic fencing tokens reject stale instructions.
- Specified — fencing tokens are monotonic, preventing stale instructions. Included in Swastik lock API requests.
- Implemented fencing token generation and validation in Swastik.

#### [From §40 (CI/CD Pipeline)] — Release Manager Configuration & Migration Management

- **Intent:** Validate config, diff against live cluster, run expand-only migrations before rollout.
- **Purpose:** Safe, backward-compatible config and migration changes.
- Specified — config source `dumby/deploy/deploy-config.yaml`, schema validation against Dumby root Zod schema, config diff (target vs live cluster), additive safety (breaking removals require explicit policy approval), expand-only migrations (pre-rollout, compatible with old code), destructive deferral (drops/tightening deferred until stable), advisory lock (exclusive, prevents concurrent runs), migration ledger (applied identifiers recorded in deployment record).
- Fully implemented config and migration management.

#### [From §40 (CI/CD Pipeline)] Source-of-Truth Uploads (TypeScript Only Default)

- Arbitrary compiled JS accepted.
- TypeScript source + manifest.ts + lockfile + migrations + locales + tests; Swastik builds the artifact.

#### [From §40 (CI/CD Pipeline)] Static JavaScript Analysis After Build

- No post-build JS scan.
- Post-build static JS scanner.

#### [From §40 (CI/CD Pipeline)] Trusted Builder (Isolated Build Environment)

- No isolated build step; artifact provenance is not controlled.
- Builder sequence: receive source, verify license, frozen-lockfile install, dependency review, tsc --noEmit, ESLint, Prettier, tests, tsc compile, emit JS+sourcemaps+.d.ts, hash artifact, store immutably.

#### [From §40 (CI/CD Pipeline)] TypeScript-to-JavaScript Compilation Step in Swastik Pipeline

- "Although not spelled out explicitly, this step is mandatory" — implicitly required, not documented as an explicit pipeline stage.
- Explicit compilation stage in Swastik pipeline between validation and staging.

#### [From §40 (CI/CD Pipeline)] Worker-Thread Sandboxing for Untrusted Marketplace Modules

- ABSENT (V2/deferred).
- Per-module worker-thread or VM sandbox with IPC.

#### [From §40 (CI/CD Pipeline)] Build ID as semver + content hash (Integrity Check)

- Deep-Analysis describes buildId as per-version identifier; Design upgrades it to semver+hash.
- Build ID = version + sha256 content hash, recorded in swastik_builds.

#### [From §40 (CI/CD Pipeline)] Build-time `catalog.json` (SBOM-style capability manifest) + CI validation

- Partial — `generate-docs.ts` produces Markdown docs but no unified JSON catalog.
- `catalog.json` emitted and CI-gated.

#### [From §40 (CI/CD Pipeline)] CI/CD build scripts to place first-party modules on the volume

- `tsc` no longer compiles module sources into the image; the Docker image is purely the application core and `src/shared`; CI/CD places first-party modules on the volume or via Swastik upload.

#### [From §40 (CI/CD Pipeline)] Contract declaration artifacts (.d.ts + hashes)

- No contract artifacts emitted.
- .d.ts + contract hashes + compatibility reports stored in registry.

#### [From §40 (CI/CD Pipeline)] SBOM Generation for Module Builds

- No SBOM.
- SBOM per build stored in registry.

**Four-Tier Test Pyramid with MockContainer**

#### [From §40 (CI/CD Pipeline)] — Swastik Hot-Swap (Module Version Upgrade)

- **Intent:** Separate core changes (full pipeline, two approvers, rolling update) from module changes (hot-swap, atomic symlink, auto-rollback) because they have different risk profiles.
- **Purpose:** Core = full release pipeline; Module = atomic symlink promotion with rollback on failure.
- `entry/swastik.ts`: `/internal/reload` (hot-swap via symlink), `/internal/deploy` (full deploy), rollback support, dev registration (`/swastik/developers/register`, `/swastik/developers/me`), upload → `parseManifest` validation → staging dir → symlink promotion → rollback on failure, `writeAudit` for DEVELOPER_REGISTERED/BUILD_STAGED/BUILD_PROMOTED/BUILD_ROLLED_BACK/MODULE_DEPLOYED.
- Maintained; reconcile with the specified revised design (sandbox isolation, health-gated promotion).

#### [From §40 (CI/CD Pipeline)] Design Consideration — Release Manager as a Kubernetes Controller

#### [From §40 (CI/CD Pipeline)] The Release Manager as External Release Actuator

#### [From §40 (CI/CD Pipeline)] Release Manager Least Privilege RBAC

#### [From §40 (CI/CD Pipeline)] Shared Kubernetes Volume as Critical Infrastructure

#### [From §40 (CI/CD Pipeline)] deploy-production.yml two-approver manual gate

#### [From §40 (CI/CD Pipeline)] Release Manager Deploy Request API Endpoints

#### [From §41 (Infrastructure & Deployment)] — ESLint Enforcement (no-restricted-imports, dumby/forbidden-core-import)

- **Intent:** Build-time enforcement preventing modules from importing core routing internals (CommandRouter, Container, etc.) to bypass the official APIs.
- **Purpose:** Block cross-module imports into src/core/ at build time, failing CI if attempted.
- Specified. ESLint rule no-restricted-imports (section 41.4) forbids cross-module imports into src/core/. Custom rule dumby/forbidden-core-import catches bypass attempts. Build fails in CI.
- Maintained and enforced. All cross-module imports into core blocked at build time.

#### [From §41 (Infrastructure & Deployment)] — Tooling-Enforced Boundaries (Constitution vs Policy)

- **Intent:** Encode architectural invariants in tooling (ESLint/tsc gates), not docs that can be ignored.
- **Purpose:** "Constitution vs policy" — good architecture encodes invariants in tooling.
- Five enforced rules: no cross-module imports (ESLint `no-cross-module-relative-import`); no direct DB access from commands (`no-repository-in-command`); no event emission from repositories (`no-event-emit-in-repository`); no unverifiable webhooks (registration-time validation); no unscrubbed secrets in logs (logger-level redaction).
- Maintain all as MUST-level gates (RFC 2119) per `directive.md`.

#### [From §41 (Infrastructure & Deployment)] Function reference — ESLint no-restricted-imports Forbids Cross-Module Core Imports:

> **Function reference — ESLint no-restricted-imports Forbids Cross-Module Core Imports:** Ensure the ESLint rule blocks any attempt to bypass the official APIs. Status: Fully Implemented. The ESLint rule `no-restricted-imports` (§41.4) forbids cross-module imports into `src/core/`. The custom rule `dumby/forbidden-core-import` catches any attempt to bypass the official APIs. The build fails in CI; the PR is blocked. Requirement: Maintain as-is; ensure the ESLint rules cover all core internal modules. touchpoints: .eslintrc (no-restricted-imports rule); custom ESLint plugin dumby/forbidden-core-import; CI pipeline (tsc --noEmit + eslint); spec §41.4.

####

> the third Terraform module `cache` (note: the repo directory is currently named `redis` in `deploy/terraform/modules/redis/`; it must be renamed to `cache` to match the spec, or a documented exception must be recorded)

#### [From §41 (Infrastructure & Deployment)] import / require of manifest (RCE path)

#### [From §41 (Infrastructure & Deployment)] Design consideration — Release Manager–GitHub integration via OIDC.

> **Design consideration — Release Manager–GitHub integration via OIDC.** GitHub Actions should trigger Release Manager deployments (`POST /api/v1/deploy`) using short-lived, secret-free OIDC tokens instead of long-lived Release Manager tokens stored in GitHub secrets: GitHub mints an OIDC token, Release Manager validates it against GitHub's JWKS endpoint and checks repository and environment claims. The two-approver gate is best kept GitHub-native (Environment Protection Rules) with Release Manager holding the deploy record. Impact: High; feasibility: High.

#### [From §41 (Infrastructure & Deployment)] Design consideration — Release Manager implementation language.

> **Design consideration — Release Manager implementation language.** Release Manager is external to Dumby's application runtime, so its language stack is unconstrained by the Node.js/TypeScript requirements of the bot itself. A Go implementation (`cmd/release-manager/main.go`, multi-stage golang-to-scratch Dockerfile) would yield a static binary under 20 MB with ~10-50 ms startup, idiomatic Kubernetes patterns (client-go, controller-runtime, Kubebuilder), SRE affinity, and natural goroutine modeling of the phase machine; Rust (kube-rs, sqlx, redis-rs, axum) is the evaluated alternative. Impact: Medium; feasibility: High.

#### [From §41 (Infrastructure & Deployment)] Roadmap note — custom-metrics autoscaling via KEDA.

> **Roadmap note — custom-metrics autoscaling via KEDA.** The current HPA (`deploy/k8s/base/hpa.yaml`) scales on resource metrics only. A queue-depth-driven alternative — a KEDA `ScaledObject` reacting to BullMQ queue depth and Node event-loop lag — would scale on real backpressure rather than CPU utilization, which poorly represents a gateway-and-queue workload. Impact: Medium; feasibility: Medium.

#### [From §41 (Infrastructure & Deployment)] Design consideration — content-addressed artifact identity.

> **Design consideration — content-addressed artifact identity.** Every artifact Swastik stages should be content-addressed so that "what's running" is always verifiable: the build ID is semver plus a content hash (SHA-256) over the artifact bytes, and storage paths derive from that hash. The bytes behind an ID cannot quietly change without the ID itself changing, giving the deployment pipeline tamper-evidence as an integrity principle rather than an afterthought. Impact: Medium (tamper-evidence); feasibility: High.

#### [From §41 (Infrastructure & Deployment)] Operational review note — verify deploy manifest content, not just structure.

> **Operational review note — verify deploy manifest content, not just structure.** Terraform and Kubernetes manifests have been verified structurally; a content-level review (resource requests, probes, security context, replica counts, secret references) is still owed, and the two audit assets disagree on whether it happened. Reconcile before treating the deploy definitions as canonical. Impact: Medium; feasibility: High.

#### [From §41 (Infrastructure & Deployment)] Roadmap note — `catalog.json` capability manifest.

> **Roadmap note — `catalog.json` capability manifest.** Extend `scripts/generate-docs.ts` to also emit a unified `catalog.json` (SBOM-style capability manifest) and add a CI validation step against it. This gives operators a single machine-readable source of truth for "what is this deployment actually capable of?" and aligns with the explicit-over-implicit principle. Impact: Medium; feasibility: High.

#### [From §41 (Infrastructure & Deployment)] Design consideration — end-to-end deployment flow.

> **Design consideration — end-to-end deployment flow.** The runbook's six-step flow (Terraform apply, kubeconfig, Docker build/push to ECR, `kubectl apply -k`, migrate, verify readiness) should be codified end to end: `deploy-staging.yml` and `deploy-production.yml` already automate the later steps, and the Terraform-output-to-Secret handoff is the least-automated link to close. Impact: Medium; feasibility: High.

#### [From §41 (Infrastructure & Deployment)] Roadmap note — dry-run upload endpoint.

> **Roadmap note — dry-run upload endpoint.** A dry-run variant of the upload endpoint would let developers verify an upload — manifest validation, schema checks, contract checks — without side effects: nothing staged, nothing promoted. Should ship with rate limiting and audit logging. Impact: Medium; feasibility: High.

#### [From §41 (Infrastructure & Deployment)] Roadmap note — detailed upload status API.

> **Roadmap note — detailed upload status API.** Swastik's HTTP API should expose the pipeline's existing stage-level state (validate, stage, promote) so developers can see exactly where an upload succeeded or failed rather than inferring it from logs. Cheap to build because it only surfaces state the pipeline already holds. Impact: Medium; feasibility: High.

#### [From §41 (Infrastructure & Deployment)] Design consideration — volume-mounted module directories.

> **Design consideration — volume-mounted module directories.** Modules can be decoupled from the container image entirely by mounting an `emptyDir` or PersistentVolumeClaim at the module directories; the module loader reads whatever files are present on disk, so the framework needs no special support — this is a standard Kubernetes feature. CI/CD writes compiled modules to the volume and triggers the reload API. Best suited to frequent module updates; note the partial-write risk during copies. Impact: Medium; feasibility: High.

#### [From §41 (Infrastructure & Deployment)] Design consideration — sidecar/init-container module writer.

> **Design consideration — sidecar/init-container module writer.** CI/CD can write the compiled module directly to the mounted volume through a sidecar or init container, with the main bot reading the directory and the reload API triggering the swap — permanently bypassing Docker image rebuilds for module changes. Pairs naturally with the hybrid core/module split above. Impact: Medium; feasibility: High.

#### [From §41 (Infrastructure & Deployment)] Design consideration — multi-tenancy via per-namespace module volumes.

> **Design consideration — multi-tenancy via per-namespace module volumes.** All pods currently run the same module set. A roadmap direction is namespace-scoped PVCs so that Pod A mounts `vol-a` (Moderation) while Pod B mounts `vol-b` (Economy) from the same core image — same framework, different module sets per tenant. This is the "holy grail" multi-tenancy posture, but it requires the volume-mount module delivery model to be adopted first. Impact: High; feasibility: Low (V2).

#### [From §41 (Infrastructure & Deployment)] Roadmap note — Swastik as a separately deployed service.

> **Roadmap note — Swastik as a separately deployed service.** The specification places Swastik in its own process with an upload API, a Kubernetes volume, and a reload API; the current entry point still lives in the monolith (`entry/swastik.ts`). Completing the extraction is what makes the control-plane topology described here real: module delivery and promotion must remain reachable when the bot process is down. Impact: High; feasibility: Medium.

#### [From §41 (Infrastructure & Deployment)] Design consideration — hybrid immutable core + mutable modules.

> **Design consideration — hybrid immutable core + mutable modules.** Separate the deployment paths of the two code layers: the core codebase (`src/core/`) ships via standard CI/CD (Docker image rebuild plus Kubernetes rolling update — zero-downtime but a full restart), while modules live on a persistent volume and update through the reload API with no restart, surviving pod crashes via the PVC. A `pnpm build:module` script (not yet present) would compile modules and copy them to the volume. This is the production-grade pattern used by established plugin systems. Impact: High; feasibility: Medium.

#### [From §41 (Infrastructure & Deployment)] — Terraform Module Composition (database / redis / kubernetes)

Compose in environment roots.

#### [From §43 (Troubleshooting & Operational Runbooks)] Documentation practice — cross-reference design sections and runbooks.

> **Documentation practice — cross-reference design sections and runbooks.** Every failure mode described in a design section should carry a pointer to its matching recovery runbook, and every runbook should point back to the design section that explains the failure. Canonical form: "See §8.2 Stage 06 for migration failure diagnosis; for recovery, see §43.1 Runbook: Startup Failure." A failure mode documented in the design but not in the runbook delays diagnosis during an incident — the design says why, the runbook says what to do, and neither should be found without the other. Impact: Medium; feasibility: High.

#### [From §43 (Troubleshooting & Operational Runbooks)] Roadmap note — human-readable remediation notes in rejections.

> **Roadmap note — human-readable remediation notes in rejections.** Validation rejections should carry structured, human-readable remediation guidance — what failed, which field, and how to fix it — rather than a generic error. Improves developer success without weakening validation, and shortens the path from a Stage 11/12 rejection to the fix this runbook walks through. Impact: Medium; feasibility: High.

#### [From §43 (Troubleshooting & Operational Runbooks)] Design consideration — shift-left error detection.

> **Design consideration — shift-left error detection.** Every failure this runbook diagnoses is one that could have been caught earlier: contract drift, undeclared events, config mismatches, and bad migrations are all detectable at upload/validate time, with local reproducibility, instead of at 3 AM via a failed startup. The local validator and upload-time checks are the mechanism; this runbook is the backstop, not the front line. Impact: Medium; feasibility: High.

#### [From §43 (Troubleshooting & Operational Runbooks)] Roadmap note — machine-readable error taxonomy.

> **Roadmap note — machine-readable error taxonomy.** The framework's error responses should come from a defined, machine-readable taxonomy (e.g., `SWASTIK_MANIFEST_INVALID` with `field: "tier"`) instead of opaque failure strings, so triage of error-rate incidents like the one above can be automated rather than inferred from logs. Impact: Medium; feasibility: High.

#### [From §43 (Troubleshooting & Operational Runbooks)] — Golden Image Principle (Immutable Container Images)

- **Intent:** In production, the container image should be immutable — a single, versioned artifact that represents exactly what is running.
- **Purpose:** Maintain immutable container images as the source of truth for production deployments.
- The CI/CD pipeline (section 43.4) builds versioned Docker images. The principle is documented but can be violated by volume-mounting core files.
- Immutable images enforced — core files never mounted as writable volumes; CI/CD pipeline is the sole path for core changes.

#### [From §43 (Troubleshooting & Operational Runbooks)] Terraform environment root `main.tf` files are unwritten placeholders

- `deploy/terraform/environments/{staging,production}/` are "reserved placeholders" — README says "provider credentials are supplied by operators." No `.tf` content beyond placeholder. The runbook itself supplies an example `main.tf` for the reader to write.
- Working `main.tf` per environment invoking `module "database"`, `module "redis"`, `module "kubernetes"` with variables for vpc_id, subnet_ids, sg ids, and an S3 backend with DynamoDB locking.

#### [From §43 (Troubleshooting & Operational Runbooks)] dumby-secrets Kubernetes Secret not in repo

- The base manifests read env from ConfigMap `dumby-config` (defined) and Secret `dumby-secrets` (NOT in repo). The runbook gives a manual `kubectl create secret generic dumby-secrets --from-literal=...` command with dev placeholder values.
- Either (a) an ExternalSecrets/sealed-secrets manifest that creates dumby-secrets, or (b) a documented `kubectl create secret` command in the runbook.

#### [From §43 (Troubleshooting & Operational Runbooks)] Advanced-scaling infrastructure (custom-metrics HPA, PgBouncer, spot instances, read-replica routing)

- HPA is basic (CPU/memory); no custom-metrics pipeline, no PgBouncer, no spot handling, read-replica routing declared but implementation unknown.
- Custom-metrics HPA, PgBouncer config, read-replica routing logic, optional spot support.

#### [From §43 (Troubleshooting & Operational Runbooks)] Container securityContext / fsGroup for non-root access

- ABSENT — no documented `securityContext`/`fsGroup` tuning for the module volume.
- Pod `securityContext.fsGroup` set to a group owning `/mnt/modules`; bot container has read/execute; Swastik staging area writable.

#### [From §43 (Troubleshooting & Operational Runbooks)] Local-Cluster Postgres+Redis K8s Manifest

- K8s base manifests have no Postgres/Redis Deployment/Service resources.
- Add StatefulSet or Deployment + Service for Postgres 16 and Redis 7 in a local-dev overlay or base.

#### [From §43 (Troubleshooting & Operational Runbooks)] PgBouncer connection pool multiplexing

- DbClient uses Knex pooling; docker-compose exists; no PgBouncer config file.
- PgBouncer sidecar in compose + K8s, or transaction-pooling config.

#### [From §43 (Troubleshooting & Operational Runbooks)] Read-replica active routing logic

- DbClient has pool config, statement/critical thresholds; "read replica configuration supported" but no active routing.
- Knex read-replica pool with read/write splitting for `SELECT` queries.

### Open items

- **[From 1.2.1]** Path

`entry/worker.ts` currently calls the same `bootstrap` as `entry/main.ts`, including Discord login stages. A dedicated worker-only bootstrap path should skip Stages 15–16 (DISCORD_LOGIN / CLIENT_READY) via a worker-mode flag, enabling conditional stage execution. This is documented as a fast-follow and must be implemented to avoid unnecessary Discord gateway connections for worker processes. (owner: framework maintainers; Requirement: next minor version)
- **[From 2.2.1]** tion

Two Docker Compose files exist: `apps/main/docker-compose.yml` (canonical, 4 services) and `apps/main/docker/docker-compose.yml` (a wrapper using the Docker Compose v2 include directive). To avoid confusion, either consolidate to a single compose file or add a header comment in the wrapper explaining the include relationship and pointing to the canonical file. (owner: framework maintainers; Requirement: next minor version)
- **[From §22.5]** Replace the entry/clai.ts SSH server (ssh2 library) with the specified ssh2-based SSH server with public-key auth against the clai_operators/clai_authkeys tables; the plaintext REPL is insecure-by-design and must not be described as hardened. (owner: framework maintainers; Requirement: next minor version)

### Integrated-content provenance

Content merged from the former Extended Reference was renumbered into the host sections listed below (original numbering → current numbering):

- Extended Reference §48: 48.1 → §11.7
- Extended Reference §48: 48.2 → §11.8
- Extended Reference §48: 48.3 → §11.9
- Extended Reference §48: 48.4 → §11.10
- Extended Reference §48: 48.5 → §11.11
- Extended Reference §48: 48.6 → §11.12
- Extended Reference §48: 48.7 → §11.13
- Extended Reference §48: 48.8 → §11.14
- Extended Reference §48: 48.9 → §11.15
- Extended Reference §94: 94.1 → §11.16
- Extended Reference §94: 94.2 → §11.17
- Extended Reference §94: 94.3 → §11.18
- Extended Reference §94: 94.4 → §11.19
- Extended Reference §92: 92.1 → §12.12
- Extended Reference §92: 92.2 → §12.13
- Extended Reference §92: 92.3 → §12.14
- Extended Reference §92: 92.4 → §12.15
- Extended Reference §92: 92.5 → §12.16
- Extended Reference §92: 92.6 → §12.17
- Extended Reference §92: 92.7 → §12.18
- Extended Reference §92: 92.8 → §12.19
- Extended Reference §91: 91.1 → §24.7
- Extended Reference §91: 91.2 → §24.8
- Extended Reference §91: 91.3 → §24.9
- Extended Reference §91: 91.4 → §24.10
- Extended Reference §91: 91.5 → §24.11
- Extended Reference §53: 53.1 → §28.7
- Extended Reference §53: 53.2 → §28.8
- Extended Reference §53: 53.3 → §28.9
- Extended Reference §53: 53.4 → §28.10
- Extended Reference §95: 95.1 → §28.11
- Extended Reference §95: 95.2 → §28.12
- Extended Reference §95: 95.3 → §28.13
- Extended Reference §95: 95.4 → §28.14
- Extended Reference §95: 95.5 → §28.15
- Extended Reference §95: 95.6 → §28.16
- Extended Reference §96: 96.1 → §32.8
- Extended Reference §96: 96.2 → §32.9
- Extended Reference §96: 96.3 → §32.10
- Extended Reference §96: 96.4 → §32.11
- Extended Reference §68: 68.1 → §39.5
- Extended Reference §68: 68.2 → §39.6
- Extended Reference §68: 68.3 → §39.7
- Extended Reference §68: 68.4 → §39.8
- Extended Reference §68: 68.5 → §39.9
- Extended Reference §93: 93.1 → §48.6
- Extended Reference §93: 93.2 → §48.7
- Extended Reference §93: 93.3 → §48.8
- Extended Reference §93: 93.4 → §48.9

### Badge accuracy note

Section badges are set to [SPEC] uniformly in this edition because per-section verification against the repository requires a maintainer evidence pass. Any upgrade of a section badge to [PROTO]/[IMPL]/[TESTED]/[DEPLOYED] must cite the audit entry and repository evidence that justifies it.

## Contract
None (conceptual).

## Acceptance
```acceptance
- id: ACC-REF-0009-1
  check: "Every audit-register entry maps to a status/capabilities.json record with evidence"
  test: tests/ci/audit-register.spec.ts
```

## Edges (-> blueprint)
- SPEC-08-REFERENCE -> status/compliance.json (generated from contracts + capabilities)

---

## Inline status & design entries

Maintained in per-department files under `spec/reference/inline-status-entries/`.
