# Deploying Dumby on Railway

Railway maps one Compose service to one Railway service. Dumby's runtime needs are
described in `apps/main/docker-compose.yml`; this file is the Railway translation.

## Services

| Railway service | Source | Notes |
|---|---|---|
| `@workspace/dumby` | GitHub repo (this repo) | The bot. Builds from `apps/main/Dockerfile` via root `railway.json`. |
| `Postgres` | Railway Postgres template | System of record. Keep **one**. |
| `Redis` | Railway Redis template | **Required** — cache, shard locks, pub/sub, BullMQ. |
| `Swastik` | Same repo, command `node dist/entry/swastik.js` | Only needed to seed/promote modules. Mount the same volume. |

## Build settings (config as code)

The repo root carries `railway.json`:

```json
{ "build": { "builder": "DOCKERFILE", "dockerfilePath": "apps/main/Dockerfile" },
  "deploy": { "healthcheckPath": "/health/liveness", "restartPolicyType": "ON_FAILURE" } }
```

- The Dockerfile **must** build with the workspace root as context (it COPYs
  `pnpm-lock.yaml`, `pnpm-workspace.yaml`, `tsconfig.base.json`), so leave Root
  Directory at `/`.
- Railway auto-detects a `Dockerfile` at the source root; ours lives at
  `apps/main/Dockerfile`, hence the explicit `dockerfilePath`.
- Healthcheck `/health/liveness` returns 200 once bootstrap Stage 04 is reached.
  Do **not** use `/health/readiness` — it only returns 200 at Stage 18 (all
  required modules healthy), so it would block every deploy until modules exist.

## Volumes

**The module root is the Railway volume at `/mnt/modules`** (Option B — the volume is the source of
truth). The loader reads **only** `MODULES_DIR` and its four tier sub-directories (`swastik-loader.ts`),
and `MODULES_DIR`, `SWASTIK_LIVE_VOLUME_PATH` and `SWASTIK_STAGING_VOLUME_PATH` all point **into the
volume**, so promoted modules **persist across redeploys**.

Attach one Railway volume to `@workspace/dumby` at **`/mnt/modules`**. Railway mounts volumes as root
and the image runs as the non-root `node` user, so set `RAILWAY_RUN_UID=0` (see the variables template).

> **Seeding.** The mount **shadows** the baked tree the image carries at `/mnt/modules`, so a fresh
> volume is empty and the bot boots with **zero commands** until it is seeded. Seed once (the Swastik
> pipeline writes the first-party modules and, with W1, their provenance):
> `pnpm --filter @workspace/dumby seed:modules --provision-governance` → `seed:modules --human-approved`.
> Because those modules are promoted, **run the provenance backfill** before enforcing the floor
> (UR-20261018-093 stage 3) — see `backfill-runbook-2026-10-19.md`.

## Variables

Paste `deploy/railway/railway.env.example` into the service's Raw Editor. Required
keys (bootstrap fails at Stage 02 without them): `DATABASE_URL`, `REDIS_URL`,
`QUEUE_REDIS_URL`, `DEV_GUILD_ID`, `INTERNAL_API_KEY` (≥32 chars),
`ENCRYPTION_ROOT_KEY` (base64 of exactly 32 bytes). `BOT_TOKEN` is required only
when `DISCORD_ADAPTER=live`.

## Migrations

No separate step: bootstrap Stage 06 (`MIGRATION_RUN`) runs `knex.migrate.latest()`
on start, so starting the app applies pending migrations against `DATABASE_URL`.

## Modules

The loader blind-discovers modules from `MODULES_DIR`'s tier sub-directories; an empty root = zero
modules = zero commands. This deployment keeps the module root on the **volume** (`/mnt/modules`,
Option B), so modules added or promoted at runtime **survive redeploys** — at the cost of seeding the
volume on first boot (see **Volumes**).

To add or update a module: `pnpm --filter @workspace/dumby build:modules` →
`seed:modules --provision-governance` → `seed:modules --human-approved`. The first promotion of any
module is human-gated (ADR-006). Swastik writes to `SWASTIK_LIVE_VOLUME_PATH` (under `MODULES_DIR`), so
the loader reads it on the next reload.

## Verification

- `GET /health/liveness` → 200, then `/health/startup`, then `/health/readiness`.
- `GET /metrics` contains `dumby_` series; `GET /api/info` responds.
- `pnpm --filter @workspace/dumby migrate:status` → 45 completed, 0 pending.
