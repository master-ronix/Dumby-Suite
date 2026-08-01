# DUMBY — MASTER BUILD PROMPT
## The Complete Execution Brief for Constructing the Dumby Unified Modular Bot System

```
Document Class     : Master Engineering Prompt — Execution Brief (not a runtime artifact)
Subject System      : Dumby — Discord Unified Modular Bot System
Derived From        : Full line-by-line synthesis of all seven Dumby reference documents
                       (blueprint.md, documentation.md, directive.md, change-log.md,
                       concept.md, directory.md, interface.md)
Governs             : The construction of workspace/apps/main — the actual Dumby codebase
Companion Location  : This file lives in workspace/docs/, alongside the seven source
                       documents it synthesizes. It replaces none of them — it is the
                       execution layer on top of them.
Intended Reader     : Engineers tasked with building Dumby with workspace/docs/
                       available to read and workspace/apps/main/ available to write to.
Status              : Execute this directly. Where this prompt is silent on a detail,
                       the source documents govern — go read the cited section.
```

---

## PART 0 — ORIENTATION: HOW TO USE THIS PROMPT

### 0.1 What This Document Is

You have been handed seven source documents and this eighth one. The seven are not
background reading you skim once — they are the specification you build against for
the entire length of this project. This document is the bridge between "here is a
480,000-word architecture" and "here is what to actually type, in what order, with
what definition of done." It does three things the seven source documents don't do on
their own: it **resolves the handful of places where they genuinely disagree**, it
**sequences the work into buildable phases**, and it **draws an honest, explicit line**
between what must be production-grade on the first pass and what is correctly scoped
as a documented, extensible stub for now. Nothing in this document invents new
architecture. Every specific number, table, and rule below traces back to one of the
seven files, cited by name and section.

### 0.2 The Source Corpus, and Where It Lives

| File | Role | Treat As |
|---|---|---|
| `blueprint.md` | The controlling architectural specification — 9 Parts, 48 sections | **Primary source of truth.** When in doubt, this file governs. |
| `directive.md` | Imperative MUST/SHOULD/MAY engineering rules for the Application Core | **Primary source of truth for *how* to build**, explicitly subordinate to `blueprint.md` but more actionable — read this for the exact rule, `blueprint.md` for the reasoning behind it. |
| `documentation.md` | A parallel, independently-produced narrative edition covering the same system | **Supplementary only.** Rich in concrete elaboration (schema columns, endpoint shapes) that neither `blueprint.md` nor `directive.md` spells out — use it to fill gaps, never to override either. It contains at least one substantive conflict with the two documents above; see §0.4. |
| `interface.md` | The exact, current, end-user-facing surface (dated 24 July 2026) | **Ground truth for the two real commands.** This is not aspirational — it is the literal contract `/health` and `/hello` must satisfy, byte for byte. |
| `directory.md` | The actual monorepo file/directory layout | **Ground truth for physical structure**, reconciled with `directive.md` §16 — see Part 3 below. |
| `concept.md` | Philosophy, audience, and the business/licensing model | **Context, not a build spec.** Read once for the "why"; nothing here is directly implemented as code, though it explains why fields like `hardcoded`/`releaseStatus`/`devId` exist in the module manifest. |
| `change-log.md` | The 13-draft revision history of the documentation lineage | **Historical record only.** Do not implement anything described as a past defect or a superseded draft. Two items are flagged there as still genuinely open — see §1.4. |

### 0.3 Source Authority & Precedence

This is `directive.md` §0.4's own precedence rule, restated as policy for this build:
**`blueprint.md` and `directive.md` govern.** Where `documentation.md` adds detail that
neither of the other two states, use it. Where `documentation.md` appears to disagree
with `blueprint.md` or `directive.md` on anything with real engineering or security
weight, **that disagreement is a defect in `documentation.md`, not an ambiguity to
resolve case-by-case** — follow `blueprint.md`/`directive.md` and move on. Three such
disagreements were found during synthesis and are resolved explicitly below so you
don't have to rediscover them mid-build.

### 0.4 Known Cross-Document Conflicts — Resolved

**Conflict 1 — CLAI authentication and network exposure (security-relevant; resolve
in favor of `blueprint.md`/`directive.md` without exception).**
`documentation.md` §19.16–§19.18 describes CLAI as authenticated by password *plus* a
locally-held authkey file *plus* TOTP multi-factor, and states it is "reachable over
the public internet by design." This directly contradicts `blueprint.md` §22.5
("Authentication is SSH public-key only — no password path exists") and `directive.md`
Rule 25.5 / Rule 43.5 ("CLAI's SSH listener and PEP's REST API MUST NOT be exposed on
a public-facing Service/Ingress — reachable only via bastion, VPN, or an equivalent
in-cluster-only path"). **Build CLAI as SSH-public-key-only, with each operator's key
individually registered and individually revocable, reachable exclusively from a
private network position.** Do not implement a password path, TOTP, or public exposure
for CLAI. `documentation.md`'s `clai_authkeys` table concept is not used as specified;
Part 4.11 below defines the corrected schema.

**Conflict 2 — Physical directory layout: `src/core/` wrapper vs. flattened `src/`.**
`blueprint.md` §7.1–§7.2 nests every core subsystem under `src/core/` (e.g.
`src/core/container/Container.ts`). `directive.md` §16.1–§16.2 explicitly reconciles
this against the real monorepo (`directory.md`) and rules that the actual layout has
**no `src/core/` wrapper** — every core subsystem (`bootstrap/`, `di/`, `commands/`,
`events/`, `middleware/`, `permissions/`, `config/`, `db/`, `cache/`, `http/`,
`queue/`, `i18n/`, `logging/`, `metrics/`, `tracing/`, `errors/`, `resilience/`,
`ratelimit/`, `shutdown/`, `discord/`) lives directly under `src/`, as a sibling to
`src/modules/`, `src/shared/`, `src/entry/`, and `src/monetization/`. **Use the
flattened layout.** `directive.md` is the document that performs this exact
reconciliation, so it is treated as authoritative here, not merely supplementary.

**Conflict 3 — Naming: `infra/` vs. `deploy/`, and a few table names.**
`blueprint.md`/`documentation.md` use `infra/terraform/` and `infra/k8s/`;
`directory.md` — the actual repository map — uses `deploy/terraform/` and
`deploy/k8s/`. **Use `deploy/`.** Similarly, `documentation.md` names two Swastik
tables `swastik_developers`/`swastik_builds`; `blueprint.md`/`directive.md`'s explicit
core schema (§24.2 / Rule 27.2) names them `developers`/`builds`. **Use `developers`
and `builds`** — `blueprint.md`'s schema reference is the one both documents agree is
"the complete schema reference" and "fixed, MUST NOT be extended casually."

**Everything else that differs between `documentation.md` and the two controlling
documents (a stray "active/standby replicas" comment describing what is actually the
dynamic Redis-lock shard model; a handful of extra migration filenames tied to
catalog-era features that no longer exist) is cosmetic residue from
`documentation.md` being an independent parallel draft, not a second architecture.
Where you notice something like this, silently prefer `blueprint.md`/`directive.md`
and move on — it doesn't need its own ADR unless it has real engineering weight, the
way Conflicts 1–3 above did.**

### 0.5 Reading Order For This Build

Do not attempt to hold all 15,000+ lines of source material in context at once. Read
just-in-time, per phase, using the "Read first" pointer at the top of each phase in
Part 6. If you read nothing else before starting, read: `concept.md` in full (15
minutes — it's short and it's the "why"), `interface.md` in full (5 minutes — it's the
exact contract for the only two things a user will actually see), and `blueprint.md`
Part 0 + Part I (the orientation and philosophy — establishes vocabulary you'll use for
the rest of the build).

---

## PART 1 — MISSION, IDENTITY & SCOPE

### 1.1 What You Are Building, In One Paragraph

Dumby is a **Unified Modular Bot System**: one TypeScript application — one bootstrap
sequence, one dependency graph, one event bus, one permission engine, one
configuration system — into which independently-authored **modules** load as the
exclusive source of every behavior the bot exhibits, including its own administrative
tooling. The framework never special-cases itself (`blueprint.md` §1.2): there is no
privileged code path a third-party module author couldn't also use. As of the current
release date the entire end-user-visible surface is exactly two Core-tier slash
commands, `/health` and `/hello` (`interface.md`) — everything else in the seven
source documents describes the *machinery* that makes shipping the third, fortieth,
and four-hundredth module exactly as safe as shipping those first two.

### 1.2 The Three-Tier Build Scope

Building every subsystem in all seven documents to full, hardened, multi-region
production readiness in a single pass is not a realistic or honest goal — and the
source documents themselves model this kind of explicit scoping (the module catalog
is deliberately index-depth, §36.1; the monetization scaffold is deliberately empty,
§7.6). Apply the same discipline here, made explicit rather than silent:

| Tier | Meaning | Subsystems |
|---|---|---|
| **Tier 1 — Full, no shortcuts** | Production-shaped, fully implemented, fully tested against the exact spec. This is the load-bearing 80% of the architecture. | Bootstrap (all 18 stages) · Graceful shutdown (all 9 steps) · DI container · Config management (all 3 scopes) · Database layer + full core schema + migrations · Caching (L1+L2, stampede guard, negative caching) · Command framework & routing · Event architecture (gateway router + internal bus + cycle detection) · Middleware pipeline (all built-in stages) · Permission engine (all 7 layers) · RBAC (roles + groups + sets + grants) · Module system (manifest, registry, loader, lifecycle, tier validation, isolation lint rules) · Error taxonomy · Observability (logs/metrics/traces) · The two shipped modules (`/health`, `/hello`) + `_template` · Health endpoints (3) · HTTP server · CI/CD (5 workflows) · Docker (multi-stage) · Kubernetes manifests (base + overlays) |
| **Tier 2 — Fully functional, correctly scoped for a single-node/dev-first deployment** | Genuinely working code, exercised by real tests, built so it extends to full scale without a rewrite — but not validated against live multi-region infrastructure you don't have in this build session. | Job queue (BullMQ) infrastructure · Shard-ownership lock model (correct even at shard count 1) · i18n infrastructure · Rate limiting (dual-window + fail-closed fallback) · Webhook signature-verification infrastructure (built even before any module registers a route) · Security controls with no external dependency (redaction, Zod boundaries, secrets-via-env) · Terraform modules (real, valid, provider-parameterized; write for the single-operator tier per `blueprint.md` §41.6, leave growing/enterprise tiers as documented variables) · Credentials Service · Power Engine Panel (PEP) — this is "just" a service talking to the same Postgres/Redis everything else uses; build it in full |
| **Tier 3 — Architecturally scaffolded, explicitly documented as such** | Real entry points, real service interfaces, a genuine minimal working version, clear extension points — not production-hardened, and say so in the code and in an ADR rather than pretending otherwise. | CLAI (real SSH listener + pubkey auth against a real table + a working REPL calling PEP; rate limiting, device-binding, and the break-glass runbook are fast-follow work) · Swastik (developer registration + build-tracking REST API is Tier 2-quality; the staging/promotion mechanism itself runs against the **local filesystem** as a documented stand-in for the Kubernetes-shared-volume mechanism `blueprint.md` §15.8 specifies for real multi-pod production) · Persona/Twill (the data model, binding logic, and entry-point support are code-complete; actually exercising it requires an operator-supplied second Discord bot token, which this build session will not have) · MDIS **backend contract only** (the `dashboardSchema` type system and the four auto-exposed REST endpoints — never a frontend renderer; that's `website/`, explicitly out of scope, `directive.md` §0.3) · Marketplace review-pipeline **data model and service interfaces** (there is no third-party developer to submit anything yet) |

### 1.3 Explicit Non-Goals For This Build

Beyond the architecture's own non-goals (`blueprint.md` §4 — no text-prefix commands,
no general message-content scanning, no built-in frontend, no "zero-config," no
microservices sprawl beyond the named control-plane exception), this build session
specifically does **not**:

- Design or implement any of the 22 illustrative catalog modules (`moderation`,
  `economy`, `leveling`, etc.). They are index-depth by design (`blueprint.md` §36.1)
  — a name, a tier, a one-line purpose, nothing more. Do not give any of them a
  command surface, a schema, or a service.
- Build `website/`, `design/`, or `assets/` content. These are reserved, out-of-scope
  workspace-level directories (`directory.md`) — create them as empty, documented
  placeholders only, mirroring the pattern already established for
  `src/monetization/`.
- Build `specs/` or `tools/release_manager/` content beyond an empty, documented
  placeholder.
- Implement any monetization logic. `src/monetization/` stays empty except for a
  `README.md` describing its reserved purpose (`blueprint.md` §7.6) — MTP (Metric
  Track Protocol) is the one piece of monetization-*adjacent* infrastructure that
  **is** in scope (it's usage metering, not billing) and belongs under Tier 2.

### 1.4 Inherited Open Items

`change-log.md` §3–§4 names two items that were never closed anywhere in the entire
13-draft documentation lineage, and they remain genuinely open going into this build.
Treat them as known, accepted limitations for the initial pass — not silently, but
explicitly, flagged in an ADR (Part 6, Phase 8):

1. **No real runtime sandbox exists for third-party module code** — review is
   lint-plus-human-security-review only (`blueprint.md` §16.4's five gates). This is
   moot for the current build since the module catalog is illustrative-only and no
   third party is submitting anything yet, but it's a real gap the moment Marketplace
   goes live for real. Document it; don't attempt to solve it in this pass.
2. **BullMQ/Redis is a single point of failure for all scheduled-job state**, with no
   database-backed fallback. Build the job queue per Tier 2's scope; note this
   limitation in the same ADR rather than attempting a bespoke DB-backed job store,
   which is out of scope for this build.

---

## PART 2 — TECHNOLOGY STACK

Every choice below is a deliberate decision already made by the controlling
documents (`blueprint.md` §5, `directive.md` Part II). Do not substitute any of them
without writing an ADR of equivalent rigor first.

| Concern | Choice | Non-negotiable detail |
|---|---|---|
| Runtime | Node.js LTS ≥ 22 | Needed for native `fetch`, structured clone, stable top-level `await` in ESM |
| Language | TypeScript, strict mode | `"strict": true`, `"exactOptionalPropertyTypes": true`, `"noUncheckedIndexedAccess": true`. No `.js` source ships. `tsc --noEmit` is CI gate #1, before lint or test. |
| Module format | ESM | `"type": "module"`, `"module": "NodeNext"`. `require()` never appears. |
| Package manager | pnpm, latest stable | Lockfile committed; CI runs `--frozen-lockfile` |
| Discord library | discord.js v14, used directly | No wrapper abstraction — module authors use discord.js's own types |
| System of record | PostgreSQL | JSONB for config docs; ACID transactions; row-level locking; `LISTEN`/`NOTIFY` |
| Acceleration layer | Redis | L2 cache, BullMQ backing store, cross-shard pub/sub — never the primary store |
| Query builder | Knex.js | Not an ORM. No active-record entities. The only SQL abstraction is `BaseRepository`. |
| Job queue | BullMQ | Redis-backed, survives process restarts |
| HTTP server | Fastify | Health, metrics, admin REST, MDIS backend, webhooks |
| Logging | Pino → structured JSON stdout | Child-logger scoping; centrally-enforced redaction |
| Metrics | `prom-client` → `/metrics` | Prometheus text format |
| Tracing | OpenTelemetry SDK → OTLP | One root span per command; `TRACE_SAMPLE_RATE` default `0.1` |
| Config validation | Zod | Every trust boundary, no exceptions |
| Lint | ESLint ^9, flat config | Encodes architecture rules as build failures, not review discipline |
| Format | Prettier ^3 | CI `--check` gate |
| Test runner | Vitest ^2 | Unit + integration |
| Dev execution | tsx ^4 | No build step in dev |
| Git hooks | Husky ^9 | pre-commit (lint-staged), commit-msg (commitlint) |
| Commit convention | commitlint ^19 | Conventional Commits |
| Release automation | changesets ^2 | No hand-edited version bumps or changelogs |
| Containerization | Docker | Multi-stage: builder (`tsc`) + runtime (`node`) |
| Orchestration | Kubernetes | `Deployment`, never `StatefulSet` (shard ownership is dynamic, not identity-based) |
| Infra-as-code | Terraform | `database` / `cache` / `kubernetes` modules |
| Secrets | Sealed Kubernetes Secrets, or Vault/cloud secrets manager | Never plaintext in manifests or committed `.env` files |
| CI/CD | GitHub Actions | Exactly five workflows — see Phase 7 |

---

## PART 3 — REPOSITORY STRUCTURE

Two levels: the broader `workspace/` monorepo (per `directory.md`), and the actual
build target, `apps/main/`, laid out per `directive.md` §16.2's flattened
reconciliation (Conflict 2, §0.4).

### 3.1 `workspace/` — Top Level

```
workspace/
├── apps/
│   └── main/                 ← THE BUILD TARGET — full tree in §3.2 below
├── assets/                   ← reserved (images/audio/fonts/branding) — empty + README, out of scope
├── design/                   ← reserved (brand/mockups/ui-kit) — empty + README, out of scope
├── docs/                     ← THIS file + the seven source documents live here, unchanged
│   ├── reference/
│   ├── changelog/
│   └── rfcs/
├── specs/                    ← reserved (modules/api/rfcs) — empty + README, out of scope
├── tools/
│   └── release_manager/      ← reserved — empty + README, out of scope
└── website/                  ← reserved (frontend, dashboard, portal) — empty + README, explicitly
                                  out of scope per directive.md §0.3
```

### 3.2 `apps/main/` — The Build Target (Flattened Layout)

```
apps/main/
├── .github/
│   ├── workflows/{ci,release,deploy-staging,deploy-production,dependency-review}.yml
│   ├── CODEOWNERS
│   ├── PULL_REQUEST_TEMPLATE.md
│   └── ISSUE_TEMPLATE/{bug_report,feature_request,module_proposal}.yml
├── .husky/{pre-commit,commit-msg}
├── .vscode/{launch.json,settings.json,extensions.json,snippets/dumby.code-snippets}
├── .changeset/config.json
├── docker/{Dockerfile,Dockerfile.dev,docker-compose.yml}
├── deploy/
│   ├── k8s/base/{deployment,service,configmap,serviceaccount,hpa}.yaml
│   ├── k8s/overlays/{staging,production}/
│   └── terraform/environments/{staging,production}/, modules/{database,cache,kubernetes}/
├── docs/                     ← APP-SCOPED docs (distinct from workspace/docs/ above)
│   ├── architecture/ compliance/ privacy/ runbooks/ security/ api/ adr/
├── scripts/{scaffold,migrate,seed}.ts
├── src/
│   ├── application/          ← Application.ts (bootstrap orchestrator), ApplicationContext.ts, HealthServer.ts
│   ├── bootstrap/            ← one file per bootstrap stage (18 stages, §4.2)
│   ├── di/                   ← Container.ts, tokens.ts, lifetimes.ts
│   ├── commands/              ← CommandRouter.ts, CommandRegistry.ts, CommandDeployer.ts
│   ├── events/                ← EventRouter.ts, InternalEventBus.ts
│   ├── middleware/             ← MiddlewarePipeline.ts, BaseMiddleware.ts, built-in/ (12 files)
│   ├── permissions/            ← PermissionResolver.ts, RBACService.ts, BlacklistService.ts
│   ├── config/                ← ConfigManager.ts, GuildConfigService.ts, schema.ts
│   ├── db/                    ← DatabaseManager.ts, MigrationRunner.ts, BaseRepository.ts,
│   │                              QueryLogger.ts, migrations/{core,backfill}/, repositories/
│   ├── cache/                  ← CacheManager.ts, L1Cache.ts, L2Cache.ts, StampedeGuard.ts
│   ├── http/                   ← HttpServer.ts, routes/{health,metrics,admin,webhooks,modules}.routes.ts
│   ├── queue/                  ← QueueManager.ts, BaseProcessor.ts, Scheduler.ts, BaseJob.ts
│   ├── i18n/                   ← I18nManager.ts, formatters.ts
│   ├── logging/ metrics/ tracing/  ← Logger.ts, Metrics.ts, Tracing.ts
│   ├── errors/                 ← DumbyError.ts + 8 concrete subclasses
│   ├── resilience/              ← retry.ts, CircuitBreaker.ts
│   ├── ratelimit/                ← rate-limit algorithm + in-memory fallback
│   ├── shutdown/                 ← graceful-shutdown orchestration (9 steps, §4.3)
│   ├── discord/                  ← discord.js Client construction, intent union computation
│   ├── modules/
│   │   ├── _template/            ← the only module present besides the two below, on a fresh clone
│   │   ├── health/                ← Core tier — the /health command (§5)
│   │   └── hello/                 ← Core tier — the /hello command (§5)
│   ├── permissions/... (see above)
│   ├── shared/{types,utils,constants,testing}/
│   ├── entry/{main,worker,migrate,pep,clai,swastik,credentials}.ts
│   └── monetization/{adapters,models,services}/  ← empty + README (§1.3)
└── tests/{integration/{http,modules},unit/modules,smoke,e2e,load,chaos}/
    tsconfig.json  tsconfig.build.json  eslint.config.ts  prettier.config.ts
    vitest.config.ts  commitlint.config.ts  package.json  pnpm-lock.yaml
```

---

## PART 4 — CORE ARCHITECTURE: THE MENTAL MODEL

This Part condenses `blueprint.md` Parts II–VI into working reference tables. It is
not a replacement for those sections — it's what you hold in mind while implementing
them. Cite the section number in comments/ADRs when a design choice traces back to it.

### 4.1 System Diagram

```
DISCORD GATEWAY & REST API  (one WebSocket connection per shard)
        │  GatewayIntentBits = union of every loaded module's declared intents
        ▼
APPLICATION CORE  (exactly one instance of each, per process — never constructed
                    by a module)
  Bootstrap → DI Container → Event Router → Command Router
  Middleware Pipeline → Permission Engine (7-layer) → Config Manager
  Cache Manager → Database Manager → Job Queue → HTTP Server
        │  loaded through the Module Registry
        ▼
MODULE LAYER  (N independently-owned modules; on a fresh install: _template,
               health, hello — nothing else)
        │
        ▼
EXTERNALIZED STATE — PostgreSQL (system of record) + Redis (acceleration).
No cross-process state lives anywhere else, ever.

Parallel, separately-deployed control-plane services (never modules, never part
of the gateway-connected process): Power Engine Panel (PEP) · CLAI · Swastik ·
Credentials Service · Persona processes.
```

### 4.2 The 18-Stage Bootstrap Sequence

| # | Stage | What Happens | Failure Mode |
|---|---|---|---|
| 01 | `PROCESS_SETUP` | Register `uncaughtException`/`unhandledRejection` handlers; set process title | Fatal |
| 02 | `CONFIG_LOAD` | Validate root Zod schema against `process.env` | Fatal, field-level error |
| 03 | `HEALTH_SERVER_INIT` | Start Fastify on `HEALTH_PORT`; all 3 health endpoints return 503 | Fatal |
| 04 | `OBSERVABILITY_INIT` | Init Pino, Prometheus registry, OTel SDK | Fatal |
| 05 | `DATABASE_CONNECT` | Open Knex pool; verify `SELECT 1` | Fatal |
| 06 | `MIGRATION_RUN` | Core migrations, then module migrations, in order | Fatal |
| 07 | `CACHE_CONNECT` | Open Redis; verify `PING` | Fatal |
| 08 | `QUEUE_INIT` | Init BullMQ connections; register processors | Fatal |
| 09 | `DI_BOOTSTRAP` | Bind core services; freeze core token namespace | Fatal |
| 10 | `MODULE_DISCOVER` | Scan `src/modules/`; collect manifests | Fatal |
| 11 | `MODULE_VALIDATE` | Validate manifests; resolve dependency graph; detect cycles | Fatal |
| 12 | `MODULE_LOAD` | `onLoad(container)` in topological order | Fatal only if a `required:true` module throws |
| 13 | `COMMAND_REGISTER` | Delete-then-reregister every command fresh; collision detection | Fatal on collision |
| 14 | `EVENT_REGISTER` | Register event handlers with `EventRouter` | Fatal |
| 15 | `DISCORD_LOGIN` | `client.login(BOT_TOKEN)` | Fatal |
| 16 | `CLIENT_READY` | Wait for `ready`; compute shard assignments | Fatal |
| 17 | `MODULE_READY` | `onReady(client)` per module | Non-fatal per module |
| 18 | `STARTUP_COMPLETE` | `/health/readiness` → 200 once every `required:true` module is healthy; emit `dumby.system.ready` | — |

Health endpoint ↔ stage gate: `/health/liveness` on Stage 04, `/health/startup` on
Stage 15, `/health/readiness` on Stage 18. Never collapse these into one endpoint
(`blueprint.md` §8.2).

### 4.3 The 9-Step Graceful Shutdown Sequence

Triggered by `SIGTERM`/`SIGINT`. Ceilings, not expected durations — a normal shutdown
finishes in low single-digit seconds.

| # | Action | Timeout |
|---|---|---|
| 01 | Stop accepting new gateway events | 30s |
| 02 | Drain in-flight command executions | 30s |
| 03 | `onUnload()` every module, reverse load order | 30s |
| 04 | Drain job queues (in-flight finish; new refused) | 60s |
| 05 | Close HTTP server | 10s |
| 06 | Flush log buffer + trace exporter | 5s |
| 07 | Close BullMQ connections | 5s |
| 08 | Close Redis | 5s |
| 09 | Close database pool | 5s |

Worst case sums to **180s**; `terminationGracePeriodSeconds: 190` in every Kubernetes
manifest (180 + a 10s buffer — never round down). `SIGUSR2` is reserved and unused —
register no handler for it. Every restart path resolves to `process.exit(0)` plus the
orchestrator's own restart policy; no self-re-exec mechanism anywhere.

### 4.4 Dependency Injection

Constructor injection through the container, exclusively — no service locator, no
module-level singletons, no bare-import globals. Tokens are `Symbol`s, never strings.
Three lifetimes: `singleton` (one per container), `transient` (new per resolution,
rarely used), `scoped` (one per command-execution child container — this is how
`CommandContext` never bleeds between concurrent interactions). Cycle detection runs
via a resolution stack, checked *before* recursion begins, so a circular dependency is
always a Stage-09/12 startup failure with the full cycle path in the error — never a
runtime surprise.

### 4.5 The Seven-Layer Permission Engine

Ordered; each layer returns `ALLOW` (short-circuit), `DENY` (short-circuit), or
`PASS`. Falling through all seven with no definitive answer defaults to **allow**.

| # | Layer | On Data Unavailability |
|---|---|---|
| 1 | Global bot owner override (`BOT_OWNER_IDS`) | N/A — env var |
| 2 | Blacklist check | **Fail closed** (deny) |
| 3 | Guild & module availability | **Fail closed** (deny) |
| 4 | Channel restriction | **Fail open** (allow) |
| 5 | Discord native permission bitfield | **Fail closed** (deny) |
| 6 | Dumby RBAC role — **skipped entirely for Core tier** | **Fail closed**, degrades to lowest role |
| 7 | Explicit grant override (permit/blacklist/whitelist/quota/cooldown) | **Fail open** (falls through to Layer 6) |

RBAC hierarchy, inclusive upward: `OWNER > ADMIN > MOD > HELPER > MEMBER > RESTRICTED`.
Guilds configure **Groups** (Discord role → Dumby role mapping) and **Sets** (bundles
of grants), resolved fresh every interaction, never cached indefinitely. Any external
surface (a REST/dashboard caller) resolves authorization through this **identical**
resolver instance — never a parallel implementation (`blueprint.md` §21.7).

### 4.6 The Four-Tier Module Governance Model

| Tier | Pre-Installed? | Guild-Visible Default? | Who Toggles? | Rate-Limited? | Catalog? |
|---|---|---|---|---|---|
| Admin | N/A — dev guild only | Never (non-owners) | No one | No — bypasses at priority -10 | Never |
| Core | Yes, permanent | Yes, always | No one | Yes | Never |
| Standard | Yes, by default | Yes, until disabled | Guild ADMIN role | Yes | Yes, if disabled |
| Marketplace | No | No, until installed | Guild ADMIN role | Yes | Yes, if absent |

Core skips Layer 6 (RBAC) entirely — access is native-Discord-permission-only.
`health` and `hello` are both Core tier (`interface.md`).

### 4.7 The Middleware Pipeline

Strict onion, priority order (lower = outermost). Any layer can `reject()` instead of
calling `next()` to short-circuit outward. This exact set, this exact order — no
built-in stage is removed, reordered, or bypassed by a specific command.

| Priority | Stage | Behavior on Failure |
|---|---|---|
| -20 | `MaintenanceModeMiddleware` | Short-circuits everything (except an allow-list managing maintenance mode itself) |
| -10 | `AdminTierGateMiddleware` | Owner check fails → **silent** reject, no reply, warn log |
| 0 | `TraceMiddleware` | Opens span, generates `correlationId`. Never aborts. |
| 10 | `AuthMiddleware` | Resolves user; DM to a `guildOnly` command → reject |
| 20 | `GuildConfigMiddleware` | Loads guild config. Load failure degrades to defaults, never aborts. |
| 30 | `LocaleMiddleware` | Binds i18n. Never aborts. |
| 40 | `RateLimitMiddleware` | Atomic Redis check-and-increment. Over limit → reject |
| 50 | `PermissionMiddleware` | Discord bitfield check (Layer 5). Fails → reject, names the permission |
| 60 | `RBACMiddleware` | Dumby role check (Layer 6), skipped for Core tier. Fails → reject |
| 70 | `CooldownMiddleware` | Per-user-per-command cooldown. Fails → reject with remaining time |
| 80 | `DeferMiddleware` | `deferReply()` if declared. Never aborts. |
| 90 | `AnalyticsMiddleware` | Records invocation start. Never aborts. |
| 100+ | Module-global middleware | Manifest-declared `global: true` |
| 200+ | Command-scoped middleware | Declared on the individual command |

One outermost try/catch (`blueprint.md` §19.4) wraps the entire onion — a module
author never writes their own top-level error handler to avoid leaking a stack trace.

### 4.8 The Module Manifest — Field Summary

Every module's `manifest.ts` exports one object validated at Stage 11. Full field
reference: `blueprint.md` §11.2 (do not add fields beyond it without a
framework-version bump). Key fields: `name` (kebab-case, unique), `version` (semver),
`description`, `tier`, `devGuildOnly` (required iff Admin), `hardcoded` +
`hardcodeGuildId` (required together) OR `hardcoded:false` + `releaseStatus`
(mutually exclusive by construction), `devId`/`buildId` (Swastik-issued — **every**
module carries these, including `health` and `hello`; see Part 5), `required`,
`depends`/`provides` (DI tokens), `intents`, `commands`/`events`/`services`/
`repositories`/`jobs`/`tasks`/`routes`/`middleware`, `migrations`, `locales`
(`en-US.json` mandatory), `config` (Zod schema), `eventsCatalog`, `dashboardSchema`.

### 4.9 Core Database Schema

**Blueprint-authoritative tables** (`blueprint.md` §24.2 — "Complete Schema
Reference," implement exactly): `guilds`, `users`, `guild_configs`, `guild_roles`,
`guild_module_states`, `grants`, `blocked_users`, `audit_logs`, `developers`,
`builds`, `marketplace_listings`, `metering_usage_daily`. Every entity table carries
the four standard audit columns (`createdAt`, `updatedAt`, `createdBy`, `updatedBy`)
— `updatedAt` bumped by application code, never a DB trigger. Every unique constraint
on a soft-deletable table is a **partial index** (`WHERE "deletedAt" IS NULL`), never
a plain `UNIQUE` constraint.

**Supplementary tables** (mechanism specified in prose by `blueprint.md`; exact DDL
adopted from `documentation.md` §21.2 where it doesn't conflict, renamed for
consistency): `rbac_groups`, `rbac_sets`, `rbac_group_role_bindings`, `rbac_grants`
(§21.4's Groups & Sets); `guild_command_queue` (§17.7's batching queue);
`guild_command_overrides` (§17.9's collision resolution); `guild_persona_bindings`
(§35.3's Persona bindings); `system_state` (§28.6's maintenance-mode singleton flag).

**Corrected for Conflict 1:** replace `documentation.md`'s password/authkey-shaped
`clai_authkeys` table with **`clai_operators`** — `operatorId` (PK), a human label,
`sshPublicKeyFingerprint`, `sshPublicKey` (the raw public key — this is not a secret),
`registeredAt`, `registeredBy`, `revokedAt` (nullable). No password hash, no TOTP
secret, no bound-IP/device fields — the SSH keypair itself is the only credential.

Every module-owned table (e.g., nothing for `hello`; nothing required for `health`
either, since both read only live, in-memory gateway state) lives outside this list
entirely, owned exclusively by its module's own migrations.

### 4.10 Caching Architecture

Two tiers behind one `CacheManager.get/set/invalidate` API. **L1**: in-process LRU,
`CACHE_L1_MAX_ENTRIES=5000` / `CACHE_L1_MAX_BYTES=50MB`, sub-millisecond, one copy per
pod. **L2**: Redis, shared fleet-wide, single-digit-millisecond. Key convention:
`{domain}:{entity}:{identifier}[:{sub-scope}]`. Write-through invalidation for
config-shaped data (delete-then-repopulate, never overwrite-in-place); short TTL for
frequently-changing aggregates; Redis pub/sub for cross-pod L1 invalidation. Stampede
protection is **both** mechanisms together: a distributed lock (`SET NX EX`) on a
true miss, and probabilistic early refresh (threshold `0.15`, probability `0.10`) to
avoid most misses ever happening for a hot key. Negative results get their own
sentinel and their own (shorter) TTL — never left uncached.

### 4.11 Control Plane: PEP, CLAI, Swastik, Credentials Service, Personas

Four separate deployable processes (`src/entry/pep.ts`, `clai.ts`, `swastik.ts`,
`credentials.ts`) plus however many Persona instances (`main.ts` again, under a
distinct token), sharing only the same PostgreSQL primary and Redis instance with the
bot — never its gateway connection, never its module registry. This is the one named
exception to the "not a microservices architecture" non-goal (`blueprint.md` §4).

- **Power Engine Panel (PEP)** — Tier 2, build in full. A callable function catalog
  (never hardcoded terminal commands), 17 control domains (4 foundational —
  `suspendGuild`/`suspendModule`/`suspendDeveloper`/`suspendCommand` — plus 13
  extended, covering maintenance mode, cache-namespace flush, queue pause/resume/
  dead-letter-requeue, rate-limit override, shard-group restart, deployment
  triggers, Persona suspension, audit query, Marketplace signature revocation,
  credential rotation). Every call requires `{actorId, source, reason}`; the
  dispatcher rejects an empty `reason` before any side effect, and writes an
  unconditional `audit_logs` row — success or rejection — before returning. Exposed
  as `POST /api/pep/{functionName}`.
- **CLAI** — Tier 3. SSH-hosted REPL, **public-key auth only** (Conflict 1), reachable
  only from a private network position. A session is a thin presentation layer over
  `PowerEngineService` — it carries no logic of its own, and every command it issues
  is tagged with the operator's identity and a `correlationId` linking it to the PEP
  action(s) it triggered. Destructive actions require the operator to type the
  target's name back as confirmation.
- **Credentials Service** — Tier 2, build in full. The single shared issuance path for
  every runtime credential (Swastik dev IDs, any future service-to-service token):
  cryptographically random, Argon2id-hashed at rest, displayed exactly once, always
  transmitted via `Authorization` header, independently revocable. Binds to a
  local/internal interface only — never the public internet.
- **Swastik** *(the framework's own name for this service — a codename derived from a
  common given name, unrelated to any other association some readers may bring to the
  word; used here only because it's the term the source documents use throughout)* —
  Tier 3. Two update paths: the framework's own core codebase changes go
  through the ordinary CI/CD release pipeline (Phase 7) with a scheduled 24-hour
  restart trigger layered on top; a single module's own new version goes through
  Swastik's own upload → validate (the *identical* Stage-11 manifest check) → stage →
  atomically promote → hot-swap-signal → self-health-check → (rollback on failure)
  pipeline. Build the developer-registration and build-tracking REST API to full
  Tier-2 quality; implement staging/promotion against the **local filesystem** for
  this build (a documented stand-in for the Kubernetes-shared-volume mechanism a real
  multi-pod deployment needs).
- **Personas (Twill)** — Tier 3. Data model (`guild_persona_bindings`), binding
  resolution at command-dispatch time, and `PERSONA_ID`-aware entry-point support are
  code-complete. A Persona is never a lighter build — it's the identical 18-stage
  bootstrap under a second bot token. Exercising it for real requires an
  operator-supplied second token, out of this build session's reach.

---

## PART 5 — THE TWO SHIPPED MODULES: `/health` AND `/hello`

This is the one place in the entire build where the spec is not "implement this
architecture correctly" but "match this document exactly." `interface.md` is short,
dated, and precise — treat every word of it as a literal test oracle.

### 5.1 Shared Contract (Both Commands)

- Tier: **Core** — pre-installed permanently, cannot be disabled, no special
  permission required (`permissions.discord: []`), RBAC not evaluated.
- `guildOnly: true` (the default) — neither command works in a DM.
- Not ephemeral — the reply is visible to the whole channel.
- `requiresDefer: false` — both resolve well inside the 3-second window; never defer.
- Reply format: **Discord Components V2**, exclusively. Flag `IS_COMPONENTS_V2`
  (`1 << 15`, decimal `32768`) on the response. Exactly one **Container** component
  (type `17`) containing exactly one **Text Display** component (type `10`) holding
  the reply text as Markdown. No embeds, no `content` string, no Section, Thumbnail,
  Media Gallery, Separator, button, select menu, or Action Row — ever, for either
  command.
- Even though these ship with the core, they are **not** exempt from the Swastik
  identity system — per `blueprint.md` §1.2's "no self-special-casing" principle,
  register a first-party developer account (e.g. username `dumby-core`) through the
  Credentials Service, approve it, and issue real `devId`/`buildId` values for both
  modules through the same pipeline any third-party module would use.

### 5.2 `/health` — Module 1

```
manifest: name 'health', tier 'core', required: true, no dependencies, no intents.
command: /health, no arguments, no subcommands.
Displays exactly two figures, live-measured at invocation, never cached:
  Ping     — round-trip health of the persistent gateway WebSocket heartbeat
             (discord.js's own client.ws.ping)
  Latency  — round-trip time of THIS command, invocation to reply
Exact reply text shape:
  Ping: {ping}ms
  Latency: {latency}ms
Edge case: for a few seconds immediately after restart, before the first heartbeat
completes, Ping may read as unavailable or zero — this resolves on its own.
Explicitly excluded, forever: hardware/host stats, software/version info, bandwidth,
third-party API status, installed-module count, server-usage counts, any aggregate
"health rating." Only Ping and Latency. Do not add anything else, ever, without
treating it as a revision to interface.md itself.
```

### 5.3 `/hello` — Module 2

```
manifest: name 'hello', tier 'core', required: true, no dependencies, no intents.
command: /hello, no arguments, no subcommands.
Displays exactly one line, always identical:
  Hello, World!
No name, no user mention, no timestamp, no additional line — ever.
```

### 5.4 Definition of Done for This Part

A fresh install with zero other modules present shows exactly these two commands in
Discord's command list, in every guild, unconditionally. Invoking either produces
output that is character-for-character what §5.2/§5.3 specify, rendered as a single
Container/Text-Display pair with the `IS_COMPONENTS_V2` flag set. Both pass a
happy-path E2E test asserting the exact component shape, not just the text content.

---

## PART 6 — PHASED BUILD PLAN

Work the phases in order — each one's exit checklist is the next one's entry
assumption. "Read first" points to the exact sections to open before writing code for
that phase; don't re-read the whole corpus every time.

### Phase 0 — Workspace Scaffolding
**Read first:** this document's Part 3.
**Build:** the full `workspace/` and `apps/main/` tree (Part 3), even where files are
initially empty; root configs (`package.json`, `tsconfig*.json`, `eslint.config.ts`,
`prettier.config.ts`, `vitest.config.ts`, `commitlint.config.ts`); `.env.example`
covering every variable in Appendix A; a top-level `README.md` with a quickstart.
**Definition of done:** `pnpm install` succeeds; `tsc --noEmit` runs clean against an
empty `src/`; every directory in Part 3 exists (placeholders get a one-line
`README.md` stating they're reserved and out of scope for this build, per §1.3).

### Phase 1 — Bootstrap, Config, Observability, Data & Cache
**Read first:** `blueprint.md` §5–§10, §23–§26; `directive.md` §6–§19, §26–§29.
**Build:** `Application.ts` orchestrating Stages 01–09 at minimum to start (extend
through 18 as later phases land); the root Zod config schema (Appendix A's variables);
Pino/Prometheus/OTel initialization; the Knex connection + all core migrations (§4.9's
tables, `up`/`down` both, per-table audit columns, partial-index uniqueness on
soft-deletable tables); `CacheManager` with L1+L2+`StampedeGuard`; the DI `Container`
with Symbol tokens, all 3 lifetimes, and cycle detection; the 3 health endpoints on
Fastify, gated to the correct stage each.
**Definition of done:** the process boots through Stage 09 with zero modules present;
`/health/liveness` and `/health/startup` transition 503→200 at the correct stages; the
9-step graceful shutdown (§4.3) is implemented and exercised by a test that confirms
step ordering and the dead-letter guarantee.

### Phase 2 — Module System Infrastructure
**Read first:** `blueprint.md` Part III (§11–§14); `directive.md` §15–§19.
**Build:** `ModuleManifest.ts` (the full Zod schema, §4.8); `ModuleRegistry.ts`
(discovery, validation, dependency-graph resolution, cycle detection); `ModuleLoader`
(topological `onLoad`/`onReady`/`onUnload` orchestration); `GuildModuleStateService`
(the full read-path cascade and fail-closed-on-outage behavior, §4.6); the tier
co-constraint validation rules; the five architecture-specific ESLint rules
(`no-cross-module-relative-import`, `no-direct-process-env`, `no-repository-in-command`,
`no-event-emit-in-repository`, `require-eventsCatalog-entry`); the `_template` module.
**Definition of done:** `_template` loads end to end; a deliberately-malformed second
test manifest fails Stage 11 validation with a specific, correct error; each of the
five lint rules demonstrably fails the build on a crafted violation.

### Phase 3 — Request & Interaction Pipeline
**Read first:** `blueprint.md` §17–§22; `directive.md` §20–§25.
**Build:** `CommandRouter`/`CommandRegistry`/`CommandDeployer`; `EventRouter` +
`InternalEventBus` (with the bounded-depth cycle guard, default `20`); the full
`MiddlewarePipeline` — all 12 built-in stages at their exact priorities (§4.7);
`PermissionResolver` — all 7 layers with the correct fail-open/fail-closed behavior
per layer (§4.5); `RBACService` (6-role hierarchy) plus Groups/Sets/Grants; the
component/interaction registry and its `custom_id` scheme; the 8-subclass error
taxonomy (Appendix B) and the single root error boundary.
**Definition of done:** a synthetic test command demonstrably passes through all 12
middleware stages in the documented order (assert on execution order, not just final
outcome); each of the 7 permission layers is independently unit-tested for both its
allow and its deny path; RBAC resolves correctly against a seeded set of Discord role
mappings.

### Phase 4 — The Two Shipped Modules
**Read first:** `interface.md` in full; this document's Part 5.
**Build:** `src/modules/health/` and `src/modules/hello/` exactly per Part 5. Seed a
first-party `dumby-core` developer record (via the Credentials Service if Phase 6 has
landed, or a direct bootstrap seed otherwise, reconciled once Phase 6 lands) and issue
real `devId`/`buildId` values for both.
**Definition of done:** against a real (or a test) Discord application, both commands
register, invoke, and reply with output matching Part 5 exactly, verified by an
automated E2E assertion on the exact Components V2 shape — not eyeballed.

### Phase 5 — Reliability & Security Hardening
**Read first:** `blueprint.md` §27–§32; `directive.md` §30–§37.
**Build:** the in-request retry utility and `CircuitBreaker` (never composed with each
other for the same call); `QueueManager`/`BaseProcessor`/`Scheduler` wired into
bootstrap Stage 08; `I18nManager` + mandatory `en-US.json` for both shipped modules;
`RateLimitMiddleware`'s dual-window check plus its in-memory fail-closed fallback;
webhook-signature-verification infrastructure (build it even with zero routes
registered yet — a route with no verifier configured must refuse to register, ever);
secrets-via-env-only plus the centrally-enforced log-redaction list; the structural
privilege-escalation blocks (§blueprint 32.4); the erasure/export coordinator
(`registerEraser`/`registerExporter`) with nothing to register from `health`/`hello`
yet, since neither stores per-user data.
**Definition of done:** a simulated Redis outage exercises the fail-closed rate-limit
fallback and the cache fall-through-to-primary path without a crash, proven by test;
a test asserts a secret-shaped log field is redacted regardless of nesting depth.

### Phase 6 — Control Plane Services
**Read first:** `blueprint.md` §15, §22; `directive.md` §25, §38; this document's Part
4.11 and §0.4 Conflict 1.
**Build:** Credentials Service (Tier 2, full — Argon2id issuance, local-bind only);
PEP (`PowerEngineService` + `PowerEngineDispatcher`, all 17 domains, each operating on
mechanisms already built in Phases 1–5); CLAI (Tier 3 — a real SSH listener,
public-key auth against `clai_operators`, a REPL calling PEP, mandatory audit
correlation; rate limiting and device binding are documented fast-follows, not silent
gaps); Swastik (Tier 3 — developer registration + build-tracking REST at Tier-2
quality; local-filesystem staging/promotion as the documented dev-mode stand-in for
the Kubernetes-volume mechanism); Persona data model + `PERSONA_ID`-aware entry-point
support (Tier 3, code-complete, unexercised without a second live token).
**Definition of done:** every PEP action writes its `audit_logs` row before returning,
success or rejection, verified by test; CLAI accepts a registered public key and
rejects an unregistered one, verified against a local test SSH client; Swastik's
local staging/promotion round-trips a trivial dummy module version end to end,
including a forced-failure rollback path.

### Phase 7 — Engineering Lifecycle
**Read first:** `blueprint.md` §37–§42; `directive.md` §39–§44.
**Build:** Vitest config, `MockContainer`, shared test fixtures; unit tests for every
Tier-1 service, meeting the per-layer coverage floors (Appendix, directive.md §46
item 59 — Core 85%/80%, module services 80%/75%, commands 75%/70%, repositories
70%/65%, infra-adjacent 70%/65%, **each floor independent, never a blended average**);
integration tests against a real ephemeral Postgres; a happy-path smoke suite
covering `/health` and `/hello`; the five GitHub Actions workflows (`ci.yml` —
typecheck→lint→format→test→build, fail-fast; `release.yml` — changesets-driven,
fully automated; `deploy-staging.yml` — automatic on merge to `main`;
`deploy-production.yml` — two-distinct-approver manual gate, always; `dependency-
review.yml` — blocks on new critical/high-severity findings); the multi-stage
`Dockerfile` + `docker-compose.yml`; the Kubernetes base+overlays manifests (including
the exact `terminationGracePeriodSeconds: 190`, `maxUnavailable: 0`/`maxSurge: 1`,
three-probe configuration); Terraform modules for at least the single-operator tier,
with growing/enterprise tiers expressed as variables rather than hardcoded.
**Definition of done:** `pnpm lint && pnpm typecheck && pnpm test` all pass locally
and in CI; `docker compose up` boots a genuinely working bot against local Postgres +
Redis; every per-layer coverage floor is met independently.

### Phase 8 — Documentation & Final Verification
**Build:** `apps/main/docs/{architecture,compliance,privacy,runbooks,security,api,
adr}/`, populated — auto-generated API/module/database/event reference where the
manifest already carries the source of truth (`blueprint.md` §38.5's pattern), plus
hand-written ADRs for every scoping decision this prompt made (the three conflicts in
§0.4, the three-tier scope in §1.2, the two inherited open items in §1.4); a
top-level `README.md` matching Phase 0's quickstart, verified to actually work end to
end by a fresh clone; a full walk of `blueprint.md` §45 / `directive.md` §46's
compliance matrices, checking off or explicitly deferring — with a one-line reason —
every single row.
**Definition of done:** Part 9 of this document, below, is either fully satisfied or
every unmet item has a corresponding ADR explaining the deferral.

---

## PART 7 — ENGINEERING STANDARDS & GUARDRAILS

These are the rules most likely to be silently violated under time pressure. They are
restated here, curated, because they're cheap to violate accidentally and expensive to
fix after the fact. The full, authoritative rule set is `directive.md` Parts I–VII
(normative MUST/SHOULD/MAY) — treat `directive.md` §46's 62-item compliance checklist
as the master list this section merely highlights from.

- **The three-layer rule, no exceptions:** Command → Service → Repository,
  one direction only. A repository never emits an event or applies a business rule. A
  command never queries the database directly. Enforced by lint (Phase 2), not review
  discipline.
- **Module isolation is tooling-enforced, not convention-enforced.** No cross-module
  relative imports (build error). No writes to another module's tables, ever, through
  any pattern. Every cross-module dependency is declared in `depends` — an undeclared
  one fails to resolve at Stage 12, fatally, never silently.
- **Every migration has a working `down()`.** A migration without one is a CI failure,
  not a review comment.
- **Idempotency is required, not encouraged, for every job processor.** BullMQ
  guarantees only at-least-once delivery — check the record's precondition state
  before acting, every time.
- **Secrets never touch source control, ever, in any form.** Environment variables
  only, injected by the orchestrator. CI includes a secret-scanning step independent
  of developer discipline.
- **Fail-closed where the docs say fail-closed; fail-open where they say fail-open.**
  Do not normalize this to one behavior across the permission engine (§4.5) — the
  asymmetry is deliberate, not an oversight to "fix" toward consistency.
- **`audit_logs` is insert-only, forever.** No `UPDATE`, no `DELETE`, anywhere in the
  codebase, against this table — enforce with a lint rule matching any non-`.insert()`
  Knex call against it.
- **Non-production credentials are categorically distinct values from production
  ones** — never shared, never derived from one another. This is what gives the
  Admin-tier Layer 4 environment guard its actual force.
- **`TypeScript strict` is the floor, not a target.** `tsc --noEmit` is CI gate one,
  before lint, before test.
- **Coverage floors are per-layer, never blended.** A well-tested module cannot mask a
  drop in core coverage.

---

## PART 8 — QUALITY BAR: FROM ADJECTIVE TO MECHANISM

Every quality this build is held to maps to something real and checkable in the
architecture — not an assertion. If a review can't point to the mechanism in this
table, the adjective hasn't actually been earned yet.

| Quality | Concrete mechanism in this build |
|---|---|
| Precise | Zod at every trust boundary; Symbol-based DI tokens; exact numeric defaults (Appendix A) taken verbatim from the source docs, never approximated |
| Accurate | Every subsystem checked against both `blueprint.md` and `directive.md`; the three known conflicts (§0.4) resolved explicitly rather than silently picked |
| Robust | Fail-fast 18-stage bootstrap with a named failure mode per stage; per-handler and per-module isolation; a circuit breaker and two independent, never-composed retry mechanisms |
| Deep | The full 7-layer permission engine, the full 12-stage middleware pipeline, the full 8-subclass error taxonomy — no subsystem stubbed to "compiles" |
| Detailed | Every manifest field, every config variable, every schema column implemented exactly as specified |
| Comprehensive | Every Tier-1 subsystem covers its full lifecycle — bootstrap through shutdown, request through response, config through cache through database |
| Exhaustive | Phase 8 walks both compliance matrices row by row — sampled coverage is treated as a failed pass |
| Meticulous | Standard audit columns on every entity table; partial-index uniqueness on every soft-deletable one; every migration reversible |
| Polished | Prettier + ESLint flat config enforced from the first commit; no unowned TODO |
| Refined | Non-goals honored strictly — refinement includes knowing what *not* to build (§1.3), not only what to |
| Structured | The reconciled directory layout (Part 3); one canonical location per concern (Principle P13) |
| Systematic | The nine-phase build plan (Part 6) — entry state, exit checklist, no phase built out of dependency order |
| Rigorous | Strict-mode TypeScript is non-negotiable; circular-dependency detection at boot, never at runtime |
| Optimized | Hot-path discipline: L1-cache-first lookups on the common path, O(1) command registry, Core tier's deliberate RBAC skip |
| Enhanced | Beyond a minimum cache: stampede protection *and* negative caching *and* probabilistic early refresh, together |
| Advanced | The 7-layer auth engine, event-cycle detection, and shard-ownership lock model are implemented in full, not simplified toward "good enough" |
| Scalable | Zero user-visible process-local state (§4.9's externalization rule); autoscaling on workload-specific signals, never CPU alone |
| Maintainable | Single-direction layered dependencies; one source of truth per concern; isolation enforced by tooling |
| Extensible | The module contract *is* the extension API — the fortieth module is exactly as safe to add as the first |
| Production-Ready | Multi-stage Docker, real Kubernetes manifests, zero-downtime rolling updates, a full 5-workflow CI/CD pipeline |
| Enterprise-Grade | RBAC groups and sets, a full audit trail, GDPR-shaped erasure/export, encryption-in-transit enforced at config-validation time |
| Future-Proof | Discord *platform* policy is absorbed as configuration, never assumed structurally; module contracts are semver-pinned with deprecation windows |
| Effective | Every Tier-1 subsystem is genuinely exercised by the two real, working commands — never built and left untested |
| Productive | A working `pnpm dev` loop from clone to a responding bot in under 10 commands |
| Actionable | Every instruction here is a MUST, a SHOULD with a documented-exception path, or an explicit bounded choice — never an unfalsifiable aspiration |
| Strategic | The three-tier build scope (§1.2) — deliberately sequencing what must be perfect now against what scaffolds now and hardens later |
| Intelligent | Cross-document conflicts reasoned through explicitly (§0.4), not glossed over or averaged |
| Cohesive | One core, one permission engine, one configuration system, one operational surface — enforced by construction |
| Reliable | Idempotent job processing; atomic cache operations; fail-closed where it matters, fail-open where it doesn't |
| High-Quality | Every Tier-1 line passes typecheck, lint, and its own test before its phase is called complete |

---

## PART 9 — FINAL ACCEPTANCE CHECKLIST

Walk this list at the end of Phase 8. Every unchecked item needs either a fix or an
ADR explaining the deferral — never a silent gap.

- [ ] Process boots deterministically through all 18 stages and shuts down through
      all 9, verified by test, with `terminationGracePeriodSeconds: 190` set exactly.
- [ ] The core runs with **zero modules loaded** and remains fully healthy —
      `directive.md` §0.6's own definition of "done" for the Application Core.
- [ ] `/health` and `/hello` match `interface.md` byte-for-byte, verified by an
      automated Components V2 shape assertion, not a visual check.
- [ ] All three health endpoints gate on their correct stage; no orchestrator would
      ever route traffic to a not-actually-ready pod or restart a healthy-but-still-
      initializing one.
- [ ] The 7-layer permission engine's fail-open/fail-closed asymmetry matches §4.5
      exactly, per layer.
- [ ] Module isolation is provably tooling-enforced — a crafted violation of each of
      the 5 custom lint rules fails the build.
- [ ] Every core and module-owned entity table carries the 4 standard audit columns
      and partial-index (not plain) uniqueness where soft-deletable.
- [ ] PEP writes an audit row before returning on all 17 domains, success and
      rejection alike.
- [ ] CLAI is SSH-public-key-only and unreachable from a public network position —
      Conflict 1 resolved, not reintroduced.
- [ ] Coverage floors are met per layer (Core 85/80, services 80/75, commands 75/70,
      repositories 70/65, infra-adjacent 70/65), never as a blended average.
- [ ] All 5 GitHub Actions workflows exist and are individually correct: CI fail-fast
      sequence, fully-automated release and staging, a genuine two-approver
      production gate, and a severity-gated dependency review.
- [ ] `docker compose up` produces a genuinely working bot against local Postgres and
      Redis, from a clean clone, following only the README.
- [ ] Every workspace/ reserved directory (`assets/`, `design/`, `specs/`,
      `tools/release_manager/`, `website/`) exists with a one-line README stating its
      reserved, out-of-scope status — never silently absent, never accidentally built
      out.
- [ ] `src/monetization/` is empty except for its README — no logic, no imports into
      it from anywhere in the core.
- [ ] The two inherited open items (§1.4) and the three resolved conflicts (§0.4) each
      have a corresponding ADR in `apps/main/docs/adr/`.
- [ ] Both compliance matrices (`blueprint.md` §45, `directive.md` §46) have been
      walked row by row, with every row checked off or explicitly, individually
      deferred with a stated reason.

---

## APPENDIX A — Environment Variable Quick Reference

| Variable | Default | Governs |
|---|---|---|
| `NODE_ENV` | *(required)* | `development` \| `staging` \| `production` |
| `BOT_TOKEN` | *(required)* | Discord bot token |
| `BOT_OWNER_IDS` | *(required)* | CSV of process-owner snowflakes |
| `DEV_GUILD_ID` | *(required)* | Admin-tier dev guild |
| `DATABASE_URL` | *(required)* | Primary Postgres |
| `DATABASE_POOL_MAX` | `10` | Per-process connection ceiling |
| `DATABASE_STATEMENT_TIMEOUT_MS` | `10000` | Runaway-query guard |
| `DATABASE_REPLICA_URLS` | *(optional)* | Read replicas |
| `DATABASE_REPLICA_MAX_LAG_MS` | `1000` | Replica exclusion threshold |
| `REDIS_URL` | *(required)* | Cache/queue/pub-sub backing |
| `HEALTH_PORT` | `3000` | Health/metrics/admin HTTP |
| `RATE_LIMIT_USER_WINDOW_MS` / `_MAX` | `60000` / `10` | Per-user sliding window |
| `RATE_LIMIT_GUILD_WINDOW_MS` / `_MAX` | `60000` / `100` | Per-guild sliding window |
| `CACHE_L1_MAX_ENTRIES` / `_BYTES` | `5000` / `50MB` | L1 LRU bounds |
| `TRACE_SAMPLE_RATE` | `0.1` | OTel probabilistic sampling |
| `SLOW_QUERY_THRESHOLD_MS` | `500` | Warn-level query log |
| `CRITICAL_QUERY_THRESHOLD_MS` | `2000` | Error-level query log + counter |
| `EVENT_LOOP_LAG_SHED_THRESHOLD_MS` | `50` | Load-shedding trigger |
| `EVENT_BUS_MAX_EMIT_DEPTH` | `20` | Internal event-cycle guard |
| `SHARD_LOCK_HEARTBEAT_MS` | `10000` | Shard-ownership lock refresh |
| `SHARD_LOCK_RETRY_MS` | `2000` | Shard-claim retry interval |
| `TELEMETRY_ENABLED` | `true` | Anonymized framework telemetry opt-out |
| `{MODULE_NAME}_*` | module-defined | Namespaced module-level config |

## APPENDIX B — Error Taxonomy Quick Reference

| Subclass | HTTP-equiv. | `isOperational` |
|---|---|---|
| `ValidationError` | 400 | `true` |
| `PermissionDeniedError` | 403 | `true` |
| `NotFoundError` | 404 | `true` |
| `ConflictError` | 409 | `true` |
| `RateLimitExceededError` | 429 | `true` |
| `ExternalServiceError` | 502 | `true` |
| `ConfigurationError` | 500 | `false` |
| `InternalError` | 500 | `false` |

## APPENDIX C — Glossary (Minimal)

| Term | Definition |
|---|---|
| Module | The fundamental unit of feature ownership — a complete vertical slice under one manifest |
| Tier | A module's governance class: Admin, Core, Standard, or Marketplace |
| Manifest | A module's complete, self-describing contract declaration |
| DI Container | The sole mechanism for sharing services; Symbol-tokened, three lifetimes |
| PEP | Power Engine Panel — the global administrative authority, a function catalog |
| CLAI | Command Line Administrative Interface — the SSH-hosted front end to PEP |
| Swastik | The deployment / hot-reload / hot-swap control-plane service |
| Persona / Twill | An additional, fully independent Discord Application sharing the same codebase and data; Twill governs its lifecycle |
| MTP | Metric Track Protocol — module-agnostic usage metering in abstract units, not real billing |
| `guild_module_states` | The sole runtime source of truth for a module's per-guild enabled state |

---

## Colophon

This prompt was assembled by reading all seven source documents in full, line by
line, and cross-checking each one's claims against the other six before any of it was
turned into a build plan. Every table above traces to a specific section in
`blueprint.md` or `directive.md`; every scoping decision in Part 1 and every conflict
resolution in Part 0 is stated as a decision, with its reasoning, rather than left
implicit. Where this document is silent on a detail — and it is silent on most of the
15,000+ lines it summarizes — the source documents in `workspace/docs/` are not a
fallback; they are the actual specification. Build against them directly whenever this
prompt's own condensed tables aren't precise enough for the line of code in front of
you.
