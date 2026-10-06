# DUMBY-SUITE — Complete File Directory Structure

**Directory Reference Version: 5.0.0 — Consolidated Re-Baseline**

**Project:** Dumby — Discord Unified Modular Bot System (TypeScript · Node.js ≥ 22 · pnpm monorepo · discord.js v14 · PostgreSQL + Redis · BullMQ)

**Date:** 18/09/2026

Directories only — every folder in the repository, from the monorepo root to the deepest leaf. Annotations (`←`) describe each folder's role within the system. Feature modules do not live in this repository: they reside on external per-tier Kubernetes volumes, documented in the runtime-topology block that follows the repository tree.

```text
dumby-suite/                                        ← ROOT · pnpm-workspace monorepo — the complete Dumby ecosystem
│
├── .github/                                        ← repository governance — read by GitHub Actions ONLY at the
│   │                                                  repository root
│   ├── workflows/                                  ← the five CI/CD pipelines
│   │   ├── ci.yml                                  ← typecheck → lint → test → build
│   │   ├── release.yml                             ← changesets publish
│   │   ├── deploy-staging.yml                      ← staging deployment pipeline
│   │   ├── deploy-production.yml                   ← production deployment pipeline
│   │   └── dependency-review.yml                    ← dependency review gate
│   ├── ISSUE_TEMPLATE/                             ← structured issue intake
│   │   ├── bug_report.yml                          ← bug reports
│   │   ├── feature_request.yml                     ← feature requests
│   │   └── module_proposal.yml                     ← module proposals
│   ├── CODEOWNERS                                  ← code-ownership map enforced on review
│   └── PULL_REQUEST_TEMPLATE.md                    ← pull-request checklist
│
├── dependabot.yml                                  ← dependency-update automation — github-actions + npm
│                                                      ecosystems, weekly cadence
│
├── apps/                                           ← deployable applications (workspace members)
│   └── main/                                       ← THE DUMBY BOT APPLICATION — the primary deployable
│       │
│       ├── .husky/                                 ← git hooks: staged-lint pre-commit · commit-message linting
│       │
│       ├── .vscode/                                ← editor workspace configuration
│       │   └── snippets/                           ← module & manifest authoring snippets
│       │
│       ├── .changeset/                             ← changesets release/versioning flow
│       │
│       ├── docker/                                 ← multi-stage production image · dev live-reload image ·
│       │                                             local compose stack (bot + postgres + redis + queue dashboard)
│       │
│       ├── deploy/                                 ← deployment infrastructure
│       │   ├── k8s/                                ← Kubernetes manifests (Kustomize)
│       │   │   ├── base/                           ← single Deployment (active/standby replicas) · service ·
│       │   │   │                                     configmap · serviceaccount · HPA · read-write-many tier
│       │   │   │                                     volumes for atomic module hot-swap
│       │   │   └── overlays/                       ← per-environment patches
│       │   │       ├── staging/                    ← staging replica & config patches
│       │   │       └── production/                 ← production config patch (replica + version pinning)
│       │   └── terraform/                          ← infrastructure as code (secrets created manually, outside the repo)
│       │       ├── environments/                  ← per-environment Terraform roots
│       │       │   ├── staging/                    ← staging root & variables
│       │       │   └── production/                 ← production root & variables
│       │       └── modules/                        ← reusable Terraform modules
│       │           ├── database/                   ← PostgreSQL + read replicas + connection pooler
│       │           ├── cache/                      ← Redis / Redis Cluster
│       │           └── kubernetes/                 ← GKE / EKS / AKS cluster provisioning
│       │
│       ├── docs/                                   ← app-level engineering documentation (the cross-cutting
│       │   ├── api/                                ← REST / PEP / MDIS API surface
│       │   ├── architecture/                      ← layered view, request & event flow, shard topology
│       │   ├── compliance/                        ← audit-column & governance compliance
│       │   ├── privacy/                           ← data-privacy & user-data erasure
│       │   ├── runbooks/                          ← operator runbooks (secrets, migrations, recovery)
│       │   └── security/                          ← threat models: admin-tier gate, deploy gates,
│       │                                             operator terminal, tokens
│       │
│       ├── scripts/                                ← operational tooling: module scaffolding · migration runner ·
│       │                                             seed data · deploy automation · environment verification ·
│       │                                             smoke / e2e / load / chaos test helpers
│       │
│       ├── src/                                    ← ═══ APPLICATION SOURCE ═══
│       │   │
│       │   ├── core/                               ← ═══ APPLICATION CORE ═══ — framework subsystems,
│       │   │   │                                      injected via the DI container; module authors never
│       │   │   │                                      import from here (they import the swastik package)
│       │   │   │
│       │   │   ├── application/                    ← bootstrap orchestrator · 18-stage startup sequence ·
│       │   │   │                                      forward-only progress state machine · shard-ownership
│       │   │   │                                      lock for rolling updates · shared runtime context ·
│       │   │   │                                      health / ready / startup HTTP server (starts early,
│       │   │   │                                      before module loading)
│       │   │   ├── container/                      ← dependency-injection container · symbol-token registry ·
│       │   │   │                                      binding lifetimes · pre-wired test container
│       │   │   ├── modules/                        ← the module system — registry · loader · manifest
│       │   │   │                                      handling; performs blind discovery over the tier
│       │   │   │                                      volumes at bootstrap (no hardcoded module lists) and
│       │   │   │                                      imports exclusively from the live volume
│       │   │   ├── events/                         ← gateway event routing to module handlers · typed
│       │   │   │                                      internal event bus with subscriber isolation ·
│       │   │   │                                      event-loop lag guard
│       │   │   ├── middleware/                     ← onion-style middleware pipeline with priority ordering ·
│       │   │   │   └── built-in/                   ← the twelve built-in stages: admin-tier gate · trace ·
│       │   │   │                                      auth · maintenance mode · guild config · locale ·
│       │   │   │                                      rate limit · Discord permission · RBAC · cooldown ·
│       │   │   │                                      defer · analytics
│       │   │   ├── permissions/                    ← seven-layer permission resolution engine · Dumby RBAC —
│       │   │   │                                      Layer 6 pure-backend rank function over Layer 7
│       │   │   │                                      guild-side grants · explicit grants · admin-tier
│       │   │   │                                      gate · blacklists
│       │   │   ├── config/                         ← process configuration load / validate / freeze ·
│       │   │   │                                      per-guild configuration service · ENV_KEYS
│       │   │   │                                      environment schema
│       │   │   ├── db/                             ← Knex-first data-access layer
│       │   │   │   ├── migrations/                  ← ordered migrations (the runner points here)
│       │   │   │   │   ├── core/                   ← core schema: guilds · users · guild members · guild
│       │   │   │   │   │                               configs · guild roles · audit logs · guild module
│       │   │   │   │   │                               states · marketplace listings · usage metering ·
│       │   │   │   │   │                               backup history · outbound webhooks · control-table
│       │   │   │   │   │                               alignments
│       │   │   │   │   └── backfill/               ← proactive backfills (run on every deployment)
│       │   │   │   └── repositories/               ← typed repository base + core repositories
│       │   │   ├── cache/                          ← two-tier cache (in-process LRU + Redis) · stampede guard ·
│       │   │   │                                      key namespacing · distributed locks
│       │   │   ├── queue/                          ← BullMQ queue registry · abstract job processor ·
│       │   │   │                                      cron & repeatable-job scheduler · autoscaler
│       │   │   ├── ratelimit/                      ← Redis-backed sliding-window rate limiter (atomic
│       │   │   │                                      dual-window check-and-increment)
│       │   │   ├── resilience/                     ← circuit breaker (rolling window) · retry policy
│       │   │   │                                      (exponential backoff, 429 / Retry-After aware)
│       │   │   ├── http/                           ← Fastify server · external API client · PEP function
│       │   │   │                                      dispatcher · error boundary
│       │   │   │   ├── routes/                     ← health (liveness / readiness / startup) · metrics ·
│       │   │   │   │                                  admin · info · inbound webhooks · module dashboard (MDIS)
│       │   │   │   └── middleware/                  ← API-key + OAuth2 authentication · request logging
│       │   │   ├── mdis/                           ← Module Dashboard Interface System endpoints
│       │   │   ├── webhooks/                       ← outbound webhook delivery processing
│       │   │   │                                      (provider-specific HMAC verification)
│       │   │   ├── i18n/                           ← locale loading, namespace merging, resolution ·
│       │   │   │                                      date / number / currency / duration formatters
│       │   │   ├── analytics/                      ← buffered, pseudonymized usage analytics flushed
│       │   │   │                                      off the command path
│       │   │   ├── observability/                  ← unified observability subsystem
│       │   │   │   ├── logging/                    ← structured root logger factory with context scoping
│       │   │   │   ├── metrics/                    ← Prometheus registry + all core metric definitions
│       │   │   │   └── tracing/                    ← OpenTelemetry SDK initialization + tracer factory
│       │   │   ├── cli/                            ← module scaffolding & CLI tooling
│       │   │   ├── discord/                        ← direct discord.js integration: client builder ·
│       │   │   │                                      live & mock gateway adapters (no wrapper library)
│       │   │   ├── errors/                         ← error taxonomy: root error class + concrete subclasses
│       │   │   │                                      (configuration · module · command · permission · database ·
│       │   │   │                                      cache · external API · validation)
│       │   │   ├── operational/                     ← operational tooling: backup & restore service
│       │   │   └── shutdown/                       ← nine-step graceful shutdown · in-flight work tracker
│       │   │
│       │   ├── commands/                           ← the unified command system — the single canonical command
│       │   │                                         tree: routing · registration · Discord upsert ·
│       │   │                                         collision resolution · command ceiling · the BCCM
│       │   │                                         change queue · component-interaction dispatch
│       │   │                                         (buttons · selects · modals · autocomplete)
│       │   │
│       │   ├── shared/                             ← cross-cutting utilities importable by any module or
│       │   │                                         subsystem; re-exports manifest.schema.ts from the
│       │   │                                         swastik package so the manifest contract has one source
│       │   │   ├── types/                          ← Discord type augmentations · command context · pagination
│       │   │   ├── utils/                          ← snowflake · crypto · retry · paginator · and the
│       │   │   │                                      safeJoin / assertPathInside filesystem-containment guard
│       │   │   │                                      enforced on every Swastik filesystem join
│       │   │   ├── constants/                     ← embed color palette · Discord API limits · duration constants
│       │   │   └── testing/                        ← pre-wired DI container for unit tests
│       │   │       ├── fixtures/                   ← shared fixture factories
│       │   │       └── helpers/                    ← database & event-bus test helpers
│       │   │
│       │   ├── entry/                              ← one entrypoint per deployable process: main bot (the only
│       │   │                                         gateway+modules entry) · queue workers (worker.ts — the
│       │   │                                         truncated bootstrapWorker() that skips Discord login and the
│       │   │                                         API / health servers) · migration-only · Power Engine
│       │   │                                         Panel · CLAI operator terminal (ssh-clai.ts — the ssh2
│       │   │                                         public-key server) · Swastik deploy / hot-reload /
│       │   │                                         hot-swap · credentials issuance
│       │   │
│       │   └── monetization/                       ← reserved scaffold — intentionally empty until a billing
│       │                                             model is chosen; nothing outside depends on it; empty is
│       │                                             the expected complete state
│       │
│       └── tests/                                  ← app-level test root (module tests live colocated in each
│           ├── integration/                          module's __tests__/ on the volumes)
│           │   ├── http/                           ← health-endpoint & Fastify integration tests
│           │   └── modules/                        ← module lifecycle integration tests
│           ├── unit/                               ← core unit suites
│           ├── smoke/                              ← post-deploy smoke checks
│           ├── e2e/                               ← end-to-end scenarios (gateway + commands)
│           ├── load/                               ← load & performance suites
│           └── chaos/                              ← fault-injection / chaos suites
│
├── packages/                                       ← versioned shared workspace packages
│   └── swastik/                                    ← the Swastik module-authoring SDK — the versioned standalone
│       │                                              package every module author imports through its scoped
│       │                                              entry points; framework internals are never an import
│       │                                              surface for module authors
│       ├── types/                                  ← public authoring type definitions
│       ├── schemas/                                ← Zod schemas — manifest.schema.ts is the canonical module
│       │                                              manifest contract (re-exported by the app's shared/)
│       └── _template/                             ← the reference module template — the canonical 11-folder
│           ├── commands/                           layout every module follows, identical regardless of purpose
│           ├── events/                             ← Discord gateway event handlers
│           ├── services/                           ← business-logic layer / orchestrators (own transactions)
│           ├── repositories/                       ← all SQL for the module's own tables (repository pattern)
│           ├── jobs/                               ← delayed & durable queue job processors
│           ├── tasks/                              ← cron / scheduled tasks
│           ├── config/                             ← module configuration schema
│           ├── migrations/                         ← module-owned table migrations
│           ├── locales/                            ← required base locale + incrementally contributed
│           │                                          translations (load validation fails without the base locale)
│           └── __tests__/                          ← colocated unit & integration tests
│               └── fixtures/                       ← module test fixture factories
│
├── artifacts/                                     ← sandboxed tooling playgrounds (generated — not core runtime)
│   ├── api-server/                                ← standalone API-server sandbox
│   │   ├── .replit-artifact/                      ← artifact build definition
│   │   └── src/
│   │       ├── lib/                               ← API client helpers & shared logic
│   │       ├── middlewares/                       ← API middlewares (error, not-found, …)
│   │       └── routes/                            ← route handlers per resource
│   └── mockup-sandbox/                            ← UI mockup sandbox (component playground for dashboards)
│       ├── .replit-artifact/                      ← artifact build definition
│       └── src/
│           ├── .generated/                        ← generated routing & components
│           ├── components/
│           │   └── ui/                            ← full generated UI component set
│           ├── hooks/                             ← React hooks
│           └── lib/                               ← auth guard · query client · shared utils
│
├── assets/                                        ← shared static/binary assets
│   ├── images/                                    ← icons, illustrations, screenshots
│   ├── audio/                                     ← audio assets
│   ├── fonts/                                     ← custom fonts
│   └── branding/                                  ← logos & brand marks
│
├── design/                                        ← brand design system (complements assets/branding)
│   ├── brand/                                     ← brand guidelines, tokens, palette
│   ├── mockups/                                   ← dashboard, portal & bot-surface mockups
│   └── ui-kit/                                    ← reusable UI components & patterns
│
├── docs/                                          ← workspace-level documentation — the canonical document set
│   ├── blueprint.md                               ← primary engineering reference — the normative baseline
│   ├── documentation.md                           ← archived legacy architecture record, retained for the
│   │                                                decisions the blueprint inherits
│   ├── interface.md                               ← end-user Discord-facing interface specification
│   ├── directory.md                               ← this document — the repository tree reference
│   ├── directive.md                               ← project directives and bans
│   ├── master-prompt.md                           ← bot system identity and personality prompt
│   ├── concept.md                                 ← concept definitions and glossary of framework terms
│   ├── change-log.md                              ← version-history ledger for the document set
│   ├── definitions.md                             ← foundational definitions
│   ├── adr/                                       ← architecture decision records — ADR-001 … ADR-011,
│   │                                                the eleven cross-cutting decision records
│   ├── ur/                                        ← frozen upgradation-request program records
│   ├── reference/                                 ← reference material
│   ├── changelog/                                 ← historical change records
│   └── rfcs/                                      ← requests for comments / decision docs
│
├── lib/                                           ← shared workspace libraries (generated)
│   ├── api-client-react/                          ← generated React API client
│   │   └── src/
│   │       └── generated/                         ← generated data-fetching hooks
│   ├── api-spec/                                  ← OpenAPI spec & client-generation config (source of generated clients)
│   ├── api-zod/                                   ← generated validation schemas
│   │   └── src/
│   │       └── generated/
│   │           └── types/                         ← generated typed models
│   └── db/                                        ← database package (client, migrations, seed) for the
│       └── src/                                     website / control plane
│           └── schema/                            ← table schemas
│
├── scripts/                                       ← repository guard scripts (run in CI)
│   ├── check-workflows.mjs                        ← asserts that every GitHub Action is SHA-pinned and that
│   │                                                no secrets appear inside run: blocks
│   ├── check-configmap-keys.mjs                  ← diffs Kubernetes configmap keys against the ENV_KEYS
│   │                                                schema — the config-drift guard
│   └── src/                                       ← general script sources & post-merge hook
│
├── specs/                                         ← formal specifications
│   ├── modules/                                   ← module-level specs
│   ├── api/                                       ← API specs
│   └── rfcs/                                      ← specification RFCs
│
├── tools/                                         ← internal tooling
│   └── release-manager/                           ← Release Manager tooling — release automation scripts,
│       ├── scripts/                                  release configuration, release-note & announcement
│       ├── config/                                  templates; the Release Manager actuator itself is a
│       └── templates/                               separately built, Swastik-coordinated release service,
│                                                    with reverse GitHub sync — system changes are
│                                                    committed back to the Git system-of-record
│
└── website/                                       ← public web presence + module dashboard web UI
    ├── public/                                    ← static public assets
    └── src/
        ├── app/                                   ← marketing site / application shell & routing
        ├── dashboard/                             ← operator dashboard (Power Engine Panel web surface)
        ├── portal/                                ← developer portal (module marketplace / dev center)
        ├── components/                            ← shared React components
        ├── lib/                                   ← client libraries, auth, utils
        └── styles/                                ← global styles
```

---

**Runtime module topology** — external Kubernetes volumes, not repository content. All feature modules live on these volumes; nothing under them is committed to the repository. Every module follows the identical 11-folder canonical layout defined by the reference template at `packages/swastik/_template/`.

```text
/mnt/modules/                                      ← MODULES_DIR default mount root — the blind-discovery
│                                                     source scanned by the loader at bootstrap
│
├── modules-admin/                                 ← [Admin] tier volume
│   │
│   │   ── [ILLUSTRATIVE EXAMPLES ONLY — never shipped] ──
│   └── core-admin/                                ← [Admin]       — administration suite
│
├── modules-core/                                  ← [Core] tier volume
│   ├── health/                                    ← Core-tier /health command module — seeded onto the
│   │                                                 core volume via promotion on every fresh install
│   ├── hello/                                     ← Core-tier /hello command module — seeded onto the
│   │                                                 core volume via promotion on every fresh install
│   │
│   │   ── [ILLUSTRATIVE EXAMPLES ONLY — never shipped] ──
│   ├── guild-settings/                            ← [Core]        — per-guild configuration surface
│   └── utility/                                   ← [Core]        — everyday utility commands
│
├── modules-standard/                              ← [Standard] tier volume
│   │
│   │   ── [ILLUSTRATIVE EXAMPLES ONLY — never shipped] ──
│   ├── moderation/                                ← [Standard]    — the fully worked example module
│   ├── auto-moderation/                          ← [Standard]    — automated content enforcement
│   ├── anti-raid/                                 ← [Standard]    — anti-raid / anti-nuke protection
│   ├── verification/                             ← [Standard]    — member verification gates
│   ├── logging/                                   ← [Standard]    — guild event logging
│   ├── welcome/                                  ← [Standard]    — welcome & onboarding
│   ├── leveling/                                 ← [Standard]    — XP & leveling
│   ├── economy/                                  ← [Standard]    — economy & currency
│   ├── starboard/                               ← [Standard]    — starboard messages
│   ├── reaction-roles/                           ← [Standard]    — reaction-assigned roles
│   ├── polls/                                    ← [Standard]    — polls & voting
│   ├── birthdays/                                ← [Standard]    — birthday announcements
│   ├── tags/                                     ← [Standard]    — custom tags / snippets
│   ├── reminders/                                ← [Standard]    — scheduled reminders
│   ├── threads-manager/                          ← [Standard]    — thread housekeeping
│   ├── giveaways/                                ← [Standard]    — giveaways
│   └── tickets/                                  ← [Standard]    — support tickets
│
└── modules-marketplace/                           ← [Marketplace] tier volume
    │
    │   ── [ILLUSTRATIVE EXAMPLES ONLY — never shipped] ──
    ├── music/                                     ← [Marketplace] — music playback
    └── integrations/                              ← [Marketplace] — third-party integrations

/data/swastik-staging/                             ← Swastik staging area — uploads are validated, built,
                                                    and promoted here; promotion to the live tree is an
                                                    atomic symlink swap to /data/swastik-live (the live
                                                    volume the module loader reads)
```

Tier-at-rest is enforced: a module must live on the volume matching its manifest-declared tier, and first-party modules reach the tier volumes only through the promotion pipeline.

---

**Legend**

- **Tier labels** — `[Admin]` · `[Core]` · `[Standard]` · `[Marketplace]`: the four-tier module system. Each tier has its own Kubernetes volume, and a module must reside on the volume matching its manifest-declared tier (tier-at-rest enforcement).
- **External volumes** — the module volumes and the Swastik staging area are runtime Kubernetes mounts, not repository content; they are documented here because all feature-module storage lives outside the repository. A fresh installation ships only the reference template (at `packages/swastik/_template/`) plus the `health` and `hello` Core-tier command modules, seeded via promotion onto the core volume.
- **Illustrative modules** — the 22 catalog modules named on the tier volumes are **illustrative examples only** — they demonstrate the module contract and are never shipped as part of the framework.
- **Directories only** — individual files are deliberately out of scope of this diagram, with the exception of the named governance files under `.github/` and `dependabot.yml`, the repository guard scripts, the entry points, and the nine canonical documents under `docs/`, whose placement is normative.
