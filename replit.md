# Dumby — Unified Modular Bot System

A TypeScript Discord bot framework: one bootstrap sequence, one DI container, one permission engine, one configuration system, into which independently-authored modules load as the sole source of every behavior the bot exhibits.

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
- **DB:** PostgreSQL via Knex.js (no ORM), 30 core migrations
- **Cache:** L1 (in-process LRU) + L2 (Redis via ioredis)
- **Queue:** BullMQ (Redis-backed)
- **HTTP:** Fastify (health, metrics, admin REST, PEP)
- **Logging:** Pino (structured JSON)
- **Metrics:** prom-client
- **Tracing:** OpenTelemetry SDK
- **Validation:** Zod at every trust boundary
- **Tests:** Vitest (33 test files, 446 tests passing)

## Where Things Live

```
workspace/
├── apps/main/              ← Dumby bot framework (THE BUILD)
│   ├── src/
│   │   ├── bootstrap/      ← 18-stage startup sequence
│   │   ├── di/             ← Container + Symbol tokens + 3 lifetimes
│   │   ├── commands/       ← CommandRegistry, CommandRouter, CommandDeployer
│   │   ├── events/         ← InternalEventBus + cycle detection
│   │   ├── middleware/      ← 12 built-in pipeline stages
│   │   ├── permissions/    ← 7-layer resolver + RBAC + blacklist
│   │   ├── config/         ← Zod env schema + ConfigService
│   │   ├── db/             ← Knex client + 30 migrations + BaseRepository
│   │   ├── cache/          ← L1Cache + CacheManager + StampedeGuard + key-namespace
│   │   ├── http/           ← Fastify servers + PowerEngineDispatcher
│   │   ├── queue/          ← QueueManager + autoscaler
│   │   ├── modules/        ← manifest schema + registry + loader + 22 modules
│   │   │   ├── health/     ← Core: /health command (Components V2)
│   │   │   ├── hello/      ← Core: /hello command (Components V2)
│   │   │   └── _template/  ← Module scaffolding template
│   │   ├── entry/          ← main, worker, pep, clai, swastik, credentials
│   │   └── ...             ← errors, resilience, ratelimit, shutdown, discord, i18n, ...
│   ├── tests/unit/         ← 33 test files, 446 tests
│   ├── deploy/             ← k8s (base + overlays) + Terraform modules
│   ├── docs/adr/           ← 5 ADRs covering all resolved conflicts + open items
│   └── .env.example        ← All required env vars documented
├── docs/                   ← Architecture source documents (blueprint, directive, etc.)
├── assets/                 ← Reserved placeholder
├── design/                 ← Reserved placeholder
├── specs/                  ← Reserved placeholder
├── tools/release_manager/  ← Reserved placeholder
└── website/                ← Reserved placeholder (MDIS frontend; out of scope)
```

## Architecture Decisions

- **No `src/core/` wrapper:** All core subsystems (`bootstrap/`, `di/`, `commands/`, etc.) are direct siblings under `src/` — reconciled from `directive.md` §16.2 against the actual directory layout.
- **CLAI is SSH-public-key-only:** Never password, never TOTP, never public internet — Conflict 1 from `master-prompt.md` §0.4, resolved in favor of `blueprint.md`/`directive.md`.
- **`deploy/` not `infra/`:** Directory naming follows `directory.md` (ground truth), not `blueprint.md`/`documentation.md`.
- **Permission engine fail-open/fail-closed asymmetry is intentional:** Layers 2, 3, 5, 6 fail closed; layers 4, 7 fail open. Do not "normalize" this.
- **Stampede guard + PER both active:** Both mechanisms run together on hot keys — distributed lock for true misses, probabilistic early refresh to amortize most misses before they happen.

## Three-Tier Build Scope

| Tier | Status |
|---|---|
| Tier 1 (full) | Bootstrap · Shutdown · DI · Config · DB+migrations · Cache (L1+L2+StampedeGuard) · Commands · Events · Middleware (12 stages) · Permissions (7 layers) · RBAC · Module system · Errors · Observability · `/health` + `/hello` · Health endpoints · HTTP server |
| Tier 2 (functional) | Job queue (BullMQ) · Rate limiting · Webhook infra · PEP (all 17 domains) · Credentials Service |
| Tier 3 (scaffolded) | CLAI (SSH REPL) · Swastik (filesystem staging) · Persona/Twixter data model · MDIS backend contract |

## User Preferences

_Populate as you build._

## Gotchas

- `pnpm test` / `pnpm typecheck` must be run from `apps/main/` or with `--filter @workspace/dumby`.
- The bot runs headless by default (no live Discord token required) — `DISCORD_ADAPTER=mock` in `.env.example`.
- `audit_logs` is insert-only forever — no UPDATE or DELETE against that table, ever.
- Every migration needs a working `down()` or CI will fail.
- Coverage floors are **per-layer** (Core 85/80, services 80/75, commands 75/70, repos 70/65, infra 70/65) — never blended.

## Pointers

- Source architecture documents: `docs/` (blueprint.md, directive.md, interface.md, etc.)
- Build execution brief: `docs/master-prompt.md`
- ADRs: `apps/main/docs/adr/` (5 decisions covering the 3 cross-doc conflicts + 3-tier scope + 2 open items)
- See the `pnpm-workspace` skill for workspace structure and conventions.
