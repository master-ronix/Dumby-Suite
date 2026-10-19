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

**The module root is `/app/baked-modules`, in the image layer — not `/mnt/modules`.** The loader
reads **only** `MODULES_DIR` and its four tier sub-directories (`swastik-loader.ts`), so a Railway
volume mounted at `/mnt/modules` is **not in the read path**: modules placed there are never loaded.
Keep `MODULES_DIR=/app/baked-modules` (see `railway.env.example`).

Railway mounts any volume as root; the image runs as the non-root `node` user, so set
`RAILWAY_RUN_UID=0` on the service (see the variables template) if a volume is used.

> **Decision — persistence of promoted modules.** This image **bakes** the first-party modules and
the current config is **baked-only**: Swastik promotes to `SWASTIK_LIVE_VOLUME_PATH`
(`/app/baked-modules/modules-core`), the same tree the loader reads, but that tree is the image layer,
so a promoted module is **ephemeral** (lost on redeploy). If promoted modules must **survive
redeploys**, move the module root to the mounted volume — set `MODULES_DIR`, `SWASTIK_LIVE_VOLUME_PATH`
and `SWASTIK_STAGING_VOLUME_PATH` all under the mount — and seed the baked modules into it (the mount
shadows the baked tree). That is a deployment decision, tracked as audit finding DA-10.

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
modules = zero commands. This image **bakes** the first-party Core Command Surface at
`/app/baked-modules`, so the bot boots with its commands and needs no external volume.

To add or update a module at runtime, use the Swastik promotion pipeline (`AGENTS.md`):
`pnpm --filter @workspace/dumby build:modules` → `seed:modules --provision-governance` →
`seed:modules --human-approved`. The first promotion of any module is human-gated (ADR-006). Swastik
writes to `SWASTIK_LIVE_VOLUME_PATH` — under `MODULES_DIR`, so the loader reads it — but that tree is
the image layer, so a promoted module is ephemeral unless the module root is moved to a volume
(see **Volumes**).

## Verification

- `GET /health/liveness` → 200, then `/health/startup`, then `/health/readiness`.
- `GET /metrics` contains `dumby_` series; `GET /api/info` responds.
- `pnpm --filter @workspace/dumby migrate:status` → 45 completed, 0 pending.
