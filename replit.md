# Dumby — Unified Modular Bot System

A TypeScript Discord bot framework: one bootstrap sequence, one permission engine, one configuration system — into which independently-authored modules load as the exclusive source of every behavior the bot exhibits. As of this build, the end-user surface is exactly two Core-tier slash commands: `/health` and `/hello`.

## Run & Operate

```bash
# Install workspace dependencies (first time)
pnpm install

# Typecheck apps/main
pnpm --filter @workspace/dumby typecheck

# Run all tests (457 unit + integration, ~3s)
pnpm --filter @workspace/dumby test

# Run in mock/headless mode (no live Discord token required)
pnpm --filter @workspace/dumby dev

# Run database migrations (requires DATABASE_URL)
pnpm --filter @workspace/dumby migrate

# Seed first-party developer records
pnpm --filter @workspace/dumby seed
```

## Stack

- Node.js 22+, TypeScript 5 (strict + exactOptionalPropertyTypes + noUncheckedIndexedAccess)
- ESM modules, pnpm workspaces
- Discord.js v14 (no wrapper)
- PostgreSQL + Knex.js (no ORM)
- Redis (BullMQ, L2 cache, pub/sub)
- Fastify (HTTP server: health, metrics, admin REST)
- Pino (structured JSON logging), prom-client (metrics), OpenTelemetry (tracing)
- Zod (config + all trust boundaries)
- Vitest (tests), ESLint flat config, Prettier
- Docker multi-stage, Kubernetes (base + overlays), Terraform modules (single-operator tier)

## Where things live

- `apps/main/` — THE build target (the Dumby bot codebase)
- `apps/main/src/` — flattened source: bootstrap/, di/, commands/, events/, middleware/, permissions/, config/, db/, cache/, http/, queue/, i18n/, logging/, metrics/, tracing/, errors/, resilience/, ratelimit/, shutdown/, discord/, modules/, shared/, entry/, monetization/
- `apps/main/src/modules/health/` — `/health` slash command (Core tier)
- `apps/main/src/modules/hello/` — `/hello` slash command (Core tier)
- `apps/main/src/modules/_template/` — module scaffold for new modules
- `apps/main/src/entry/` — process entry points: main.ts, pep.ts, clai.ts, swastik.ts, credentials.ts, migrate.ts, worker.ts
- `apps/main/tests/` — unit/ and integration/ test suites
- `apps/main/.github/workflows/` — 5 CI/CD workflows (ci, release, deploy-staging, deploy-production, dependency-review)
- `apps/main/docs/adr/` — 5 Architecture Decision Records
- `docs/` — all 7 Dumby specification documents (master-prompt.md, blueprint.md, directive.md, documentation.md, interface.md, directory.md, concept.md, change-log.md)

## Architecture decisions

- **Flat src/ layout** (no src/core/ wrapper) — ADR 002, directive.md §16 governs
- **CLAI: SSH public-key auth only, private-network only** — ADR 001, blueprint.md §22.5 governs
- **deploy/ directory naming, developers/builds table names** — ADR 003 resolves conflicts between blueprint.md and documentation.md
- **Three-tier build scope** — ADR 004: Tier 1 (full), Tier 2 (functional single-node), Tier 3 (scaffolded stub)
- **Inherited open items** — ADR 005: no runtime sandbox for modules; BullMQ is single-point-of-failure

## Product

Dumby runs as a headless Discord bot process. On first install (zero catalog modules present), exactly two commands appear in every guild: `/health` (shows gateway ping and command latency) and `/hello` (replies "Hello, World!"). The module system, permission engine, RBAC, caching, job queue, and control-plane services (PEP, CLAI, Swastik, Credentials Service) are the machinery that make shipping the 40th module as safe as the first two.

## Credentials required before live deployment

The following must be supplied in a real `.env` (copy `.env.example`):
- `BOT_TOKEN` — Discord bot token
- `BOT_OWNER_IDS` — CSV of owner Discord snowflakes
- `DEVELOPMENT_GUILD_ID` — dev guild snowflake
- `DATABASE_URL`, `REDIS_URL`, `QUEUE_REDIS_URL` — connection strings
- `INTERNAL_API_KEY`, `JWT_SIGNING_KEY`, `ENCRYPTION_KEY_CURRENT` — generated secrets (see `.env.example`)

## User preferences

_Populate as you build._

## Gotchas

- `pnpm --filter @workspace/dumby typecheck` uses `tsc --noEmit`; `build` needs `PORT`/`BASE_PATH` env vars (only present in workflow context)
- `src/monetization/` is permanently empty — no imports to/from it anywhere in the core
- All 22 catalog modules (moderation, economy, leveling, etc.) are index-depth placeholders only — no commands, no schemas, no services
- `DISCORD_ADAPTER=mock` runs headless with no live token required; set to `live` for real gateway connection
- `audit_logs` is insert-only forever — lint rule enforces no UPDATE/DELETE against it

## Pointers

- See `docs/master-prompt.md` for the complete build brief and phase plan
- See `docs/blueprint.md` for the authoritative architecture specification
- See `apps/main/docs/adr/` for all 5 Architecture Decision Records
- See `apps/main/.env.example` for all required environment variables
