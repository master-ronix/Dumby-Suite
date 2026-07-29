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

# Run migrations
pnpm --filter @workspace/dumby run migrate

# Scaffold a new module
pnpm --filter @workspace/dumby run scaffold:module
```

The bot itself and its Redis dependency run as Replit workflows (not from the shell directly) — see "Where Things Live" below.

## Stack

- **Runtime:** Node.js >= 22, TypeScript strict + NodeNext modules, ESM only
- **Discord:** discord.js v14, no wrapper abstraction
- **DB:** PostgreSQL via Knex.js (no ORM), 30 core migrations — uses Replit's built-in Postgres (`DATABASE_URL` is auto-injected, no manual config)
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
├── apps/main/              ← Dumby bot framework (THE BUILD, @workspace/dumby)
│   ├── src/
│   │   ├── bootstrap/      ← 18-stage startup sequence
│   │   ├── di/             ← Container + Symbol tokens + 3 lifetimes
│   │   ├── commands/       ← CommandRegistry, CommandRouter, CommandDeployer
│   │   ├── events/         ← InternalEventBus + cycle detection
│   │   ├── middleware/     ← 12 built-in pipeline stages
│   │   ├── permissions/    ← 7-layer resolver + RBAC + blacklist
│   │   ├── config/         ← Zod env schema + ConfigService
│   │   ├── db/             ← Knex client + migrations + BaseRepository
│   │   ├── cache/          ← L1Cache + CacheManager + StampedeGuard + key-namespace
│   │   ├── http/           ← Fastify servers + PowerEngineDispatcher
│   │   ├── queue/          ← QueueManager + autoscaler
│   │   ├── modules/        ← manifest schema + registry + loader + module skeletons
│   │   │   ├── health/     ← Core: /health command (Components V2)
│   │   │   ├── hello/      ← Core: /hello command (Components V2)
│   │   │   └── _template/  ← Module scaffolding template
│   │   ├── entry/          ← main, worker, pep, clai, swastik, credentials
│   │   └── ...             ← errors, resilience, ratelimit, shutdown, discord, i18n, ...
│   ├── tests/               ← 33 test files, 446 tests
│   ├── deploy/              ← k8s (base + overlays) + Terraform modules (reference only — not used on Replit)
│   ├── docs/adr/            ← 5 ADRs covering all resolved conflicts + open items
│   └── .env.example         ← All required env vars documented (Replit uses workflow env vars/secrets instead of a real .env file)
├── docs/                    ← Architecture source documents (blueprint, directive, interface, master-prompt, etc.)
├── artifacts/               ← Unrelated Replit scaffold (api-server, mockup-sandbox) — not part of the Dumby product surface
├── lib/                     ← Shared workspace libs for the artifacts/ scaffold (unused by Dumby, which has its own src/db)
├── assets/, design/, specs/, tools/release_manager/, website/ ← Reserved placeholders from the original Dumby project layout
└── scripts/                 ← Shared workspace utility scripts (unrelated to Dumby's own apps/main/scripts)
```

## Architecture Decisions

- **No `src/core/` wrapper:** All core subsystems (`bootstrap/`, `di/`, `commands/`, etc.) are direct siblings under `src/` — reconciled from `directive.md` §16.2 against the actual directory layout.
- **CLAI is SSH-public-key-only:** Never password, never TOTP, never public internet — Conflict 1 from `master-prompt.md` §0.4, resolved in favor of `blueprint.md`/`directive.md`.
- **`deploy/` not `infra/`:** Directory naming follows `directory.md` (ground truth), not `blueprint.md`/`documentation.md`.
- **Permission engine fail-open/fail-closed asymmetry is intentional:** Layers 2, 3, 5, 6 fail closed; layers 4, 7 fail open. Do not "normalize" this.
- **Stampede guard + PER both active:** Both mechanisms run together on hot keys — distributed lock for true misses, probabilistic early refresh to amortize most misses before they happen.
- **`apps/main` is a standalone pnpm package, not a Replit artifact.** Dumby is a headless Discord bot, not a previewable web app — do not wrap it in `artifact.toml`. It runs via plain Replit workflows instead.
- **Redis runs as a local workflow process, not a hosted service.** Replit has no managed Redis offering, so a `redis-server` process (installed as a Nix system dependency) is started as its own workflow and addressed via `127.0.0.1`.

## Product

Dumby's entire end-user-facing surface today is two slash commands, both replying with Discord Components V2 (a Container + one Text Display, no embeds, nothing interactive):

- `/health` — public, no args; shows live gateway Ping (ms) and command round-trip Latency (ms).
- `/hello` — public, no args; replies exactly `Hello, World!`.

Everything else in `src/modules/` beyond `health` and `hello` is scaffolded module skeletons for future build-out, not shipped behavior — see `docs/interface.md` for the authoritative end-user contract.

## Three-Tier Build Scope

| Tier | Status |
|---|---|
| Tier 1 (full) | Bootstrap · Shutdown · DI · Config · DB+migrations · Cache (L1+L2+StampedeGuard) · Commands · Events · Middleware (12 stages) · Permissions (7 layers) · RBAC · Module system · Errors · Observability · `/health` + `/hello` · Health endpoints · HTTP server |
| Tier 2 (functional) | Job queue (BullMQ) · Rate limiting · Webhook infra · PEP (all 17 domains) · Credentials Service |
| Tier 3 (scaffolded) | CLAI (SSH REPL) · Swastik (filesystem staging) · Persona/Twill data model · MDIS backend contract |

## User preferences

_Populate as you build._

## Gotchas

- `pnpm test` / `pnpm typecheck` must be run from `apps/main/` or with `--filter @workspace/dumby`.
- The bot runs headless by default (no live Discord token required) — `DISCORD_ADAPTER=mock` is the schema default. Live mode (`DISCORD_ADAPTER=live`) requires `BOT_TOKEN`.
- `audit_logs` is insert-only forever — no UPDATE or DELETE against that table, ever.
- Every migration needs a working `down()` or CI will fail.
- Coverage floors are **per-layer** (Core 85/80, services 80/75, commands 75/70, repos 70/65, infra 70/65) — never blended.
- `docker-compose.yml` and the Dockerfile in `apps/main/` are reference-only for non-Replit environments — Replit has no container runtime, so Postgres comes from the built-in database and Redis runs as a native workflow process instead.

## Pointers

- Source architecture documents: `docs/` (blueprint.md, directive.md, interface.md, etc.)
- Build execution brief: `docs/master-prompt.md`
- ADRs: `apps/main/docs/adr/` (5 decisions covering the 3 cross-doc conflicts + 3-tier scope + 2 open items)
- See the `pnpm-workspace` skill for workspace structure and conventions.
