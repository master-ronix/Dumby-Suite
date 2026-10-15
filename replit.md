# Dumby — Unified Modular Bot System

A TypeScript (ESM, Node ≥ 22) modular Discord bot framework: one bootstrap sequence, one DI
container, one permission engine, one configuration system, into which independently-authored
**modules** load as the sole source of every behavior the bot exhibits.

## Run & Operate

```sh
# Install (workspace root)
pnpm install

# Typecheck Dumby only
pnpm --filter @workspace/dumby run typecheck

# Run all unit tests
pnpm --filter @workspace/dumby run test

# Run tests with coverage
pnpm --filter @workspace/dumby run test:coverage

# Run the bot (needs .env from .env.example)
pnpm --filter @workspace/dumby run start

# Dev mode (tsx watch)
pnpm --filter @workspace/dumby run dev

# Run migrations
pnpm --filter @workspace/dumby run migrate

# Deploy modules through Swastik
pnpm --filter @workspace/dumby run swastik:deploy
```

## Stack

- **Runtime:** Node.js ≥ 22, TypeScript strict + NodeNext modules, ESM only
- **Discord:** discord.js v14, no wrapper abstraction
- **DB:** PostgreSQL via Knex.js (no ORM), 45 core migrations
- **Cache:** L1 (in-process LRU) + L2 (Redis via ioredis)
- **Queue:** BullMQ (Redis-backed)
- **HTTP:** Fastify (health, metrics, admin REST, Power Engine)
- **Logging:** Pino (structured JSON)
- **Metrics:** prom-client
- **Tracing:** OpenTelemetry SDK
- **Validation:** Zod at every trust boundary
- **Tests:** Vitest (85 test files, 865 tests)

## Where Things Live

```
workspace/
├── apps/main/                 ← Dumby bot framework (THE BUILD)
│   ├── src/
│   │   ├── bootstrap/         ← 18-stage startup sequence
│   │   ├── di/                ← Container + Symbol tokens + 3 lifetimes
│   │   ├── commands/          ← CommandRegistry, CommandRouter, CommandDeployer, BCCM
│   │   ├── events/            ← InternalEventBus + cycle detection
│   │   ├── middleware/        ← 12 built-in pipeline stages
│   │   ├── permissions/       ← 7-layer resolver + RBAC + blacklist
│   │   ├── config/            ← Zod env schema + ConfigService
│   │   ├── db/                ← Knex client + 45 migrations + BaseRepository
│   │   ├── cache/             ← L1Cache + CacheManager + StampedeGuard + key-namespace
│   │   ├── rendering/         ← the core Renderer + page-data + module-icons
│   │   ├── http/              ← Fastify servers + PowerEngineDispatcher
│   │   ├── queue/             ← QueueManager + autoscaler
│   │   ├── module-system/     ← manifest schema + registry + loader + developer-registry
│   │   ├── interactions/      ← InteractionRegistry (custom_id minting + dispatch)
│   │   ├── entry/             ← main, worker, power-engine, clai, swastik, credentials
│   │   └── ...                ← errors, resilience, ratelimit, shutdown, discord, i18n, ...
│   ├── tests/                 ← unit / flow / integration / modules / ci suites
│   └── .env.example           ← all required env vars documented
├── packages/
│   ├── swastik/               ← the module-authoring SDK (defineCommand + manifest schema)
│   └── modules/               ← the eight first-party modules
│       ├── dashboard/  health/  browse/  queue/
│       └── persona/    permit/  modules/ hello-world/
├── docs/                      ← the documentation corpus (blueprint / documentation / spec /
│                                  contracts / status / adr / upgradation / orchestration …)
├── assets/  design/  specs/  tools/  website/   ← reserved placeholders
```

## Architecture Decisions

- **No `src/core/` wrapper:** all core subsystems (`bootstrap/`, `di/`, `commands/`, …) are direct
  siblings under `apps/main/src/`.
- **One canonical command path:** a single `CommandRouter` (`src/commands/command-router.ts`),
  wired in `bootstrap.ts`; no retired command trees.
- **The Renderer is the only presentation path:** Components v2; the classic
  `EmbedBuilder`/`MessageEmbed` ban is absolute.
- **Modules never live in this repository:** they reach runtime only through Swastik (upload →
  validate → stage → atomic promote → reload) on per-tier volumes.
- **Permission engine fail-open/fail-closed asymmetry is intentional:** layers 2, 3, 5, 6 fail
  closed; layers 4, 7 fail open. Do not "normalize" this.
- **Accent identity:** amber `#FFCA6D` is the framework default, with per-module accents
  (ADR-012, superseding ADR-010's blurple).

## Three-Tier Build Scope

| Tier | Status |
|---|---|
| Tier 1 (full) | Bootstrap · Shutdown · DI · Config · DB + migrations · Cache (L1+L2+StampedeGuard) · Commands · Events · Middleware (12 stages) · Permissions (7 layers) · RBAC · Module system · Renderer · Errors · Observability · `/health` + `/hello` · Health endpoints · HTTP server |
| Tier 2 (functional) | Job queue (BullMQ) · Rate limiting · Webhook infra · Power Engine · Credentials Service |
| Tier 3 (scaffolded) | CLAI (SSH REPL) · Swastik (filesystem staging) · Persona/Twill data model · MDIS backend contract |

## Gotchas

- `pnpm test` / `pnpm typecheck` must be run from `apps/main/` or with `--filter @workspace/dumby`.
- The bot runs headless by default (no live Discord token required) — `DISCORD_ADAPTER=mock`.
- `audit_logs` is insert-only forever — no UPDATE or DELETE against that table, ever.
- Every migration needs a working `down()` or CI will fail.
- Coverage floors are **per-layer** (Core 85/80, services 80/75, commands 75/70, repos 70/65,
  infra 70/65) — never blended.
- The documentation gates do **not** run `tsc`; the app typecheck is a separate gate.

## Pointers

- Documentation corpus: `docs/` (entry point `docs/README.md`; manifest `docs/manifest.json`).
- Build engine: `docs/prompts/meta-prompt.md` → `docs/prompts/entry.md` →
  `docs/orchestration/master-prompt.md` | `docs/migration/migration-prompt.md`.
- Decision records: `docs/adr/` (15 ADRs).
- Reconciliation ledgers: `docs/status/code-reconciliation.json`, `migration-ledger.md`.
- See the `pnpm-workspace` skill for workspace structure and conventions.
