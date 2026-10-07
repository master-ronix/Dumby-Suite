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

Attach one Railway volume to `@workspace/dumby` at **`/mnt/modules`** so promoted
modules survive redeploys. Railway mounts volumes as root; the image runs as the
non-root `node` user, so set `RAILWAY_RUN_UID=0` on the service (see the variables
template) to avoid permission errors writing to the volume.

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

The loader blind-discovers modules from the tier volumes; empty volumes = zero
modules = zero commands. Populate them through the Swastik promotion pipeline
(`AGENTS.md`): `pnpm --filter @workspace/dumby build:modules` →
`seed:modules --provision-governance` → `seed:modules --human-approved`. The first
promotion of any module is human-gated (ADR-006).

## Verification

- `GET /health/liveness` → 200, then `/health/startup`, then `/health/readiness`.
- `GET /metrics` contains `dumby_` series; `GET /api/info` responds.
- `pnpm --filter @workspace/dumby migrate:status` → 45 completed, 0 pending.
