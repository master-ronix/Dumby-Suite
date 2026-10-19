---
id: DEPLOY-RAILWAY
title: Deploying Dumby on Railway
kind: documentation
status: derived
version: 1.0
authority_scope: [operations]
owners: [operator]
---

# Deploying Dumby on Railway

This workspace is a **pnpm monorepo**, which drives every deployment decision
below. The build context for every Railway service must be the **repository
root** — if a service's Root Directory is pointed at a package folder
(`apps/main`, `artifacts/api-server`), `pnpm install` cannot see
`pnpm-workspace.yaml` / `pnpm-lock.yaml` and the build fails.

## Which services exist

| Package | Path | Deploy? | Why |
| --- | --- | --- | --- |
| `@workspace/dumby` | `apps/main` | **Yes** | The bot. `start` = `node dist/entry/main.js` |
| `@workspace/api-server` | `artifacts/api-server` | **Yes** | HTTP API. `start` = `node --enable-source-maps ./dist/index.mjs` |
| `@workspace/mockup-sandbox` | `artifacts/mockup-sandbox` | No | Design/component-preview artifact; only a `dev` command is defined |
| `@workspace/api-spec` | `lib/api-spec` | No | Library (codegen only) |
| `@workspace/api-client-react` | `lib/api-client-react` | No | Library |

Only the first two should be Railway services. The other three have no
runnable entry point, which is why Railpack reports
`No start command detected`.

## Giving each service a start command

Railpack reads the start command from the **root of the directory being
built**. Because every service builds from the repo root, you must tell it
which command belongs to which service. Two ways:

1. **Dashboard (simplest).** On each service, set the Start Command directly:
   - `@workspace/dumby` → `pnpm --filter @workspace/dumby start`
   - `@workspace/api-server` → `pnpm --filter @workspace/api-server start`

2. **In the repo.** Each deployable package carries a `railpack.json` with its
   own `deploy.startCommand`. Point the service at it with an environment
   variable (the path is relative to the build root):

   ```
   RAILPACK_CONFIG_FILE=apps/main/railpack.json
   RAILPACK_CONFIG_FILE=artifacts/api-server/railpack.json
   ```

   Do **not** place a `railpack.json` at the repository root — it would apply
   to every service at once, so only one of them could ever be correct.

The build itself needs no overrides: the root `pnpm build` compiles the whole
workspace (including `@workspace/swastik`, which `apps/main` resolves at
runtime), and `apps/main`'s `prebuild` re-builds swastik on its own too.

## Required environment variables (bot)

`src/config/env.schema.ts` fails bootstrap at Stage 02 unless these six are
set — they are the only fields with no default. See
`apps/main/.env.railway.example`.

| Variable | Value |
| --- | --- |
| `DEV_GUILD_ID` | 17–20 digit Discord snowflake |
| `DATABASE_URL` | `${{Postgres.DATABASE_URL}}` |
| `REDIS_URL` | `${{Redis.REDIS_URL}}/0` |
| `QUEUE_REDIS_URL` | `${{Redis.REDIS_URL}}/1` |
| `INTERNAL_API_KEY` | ≥32 chars — `openssl rand -hex 32` |
| `ENCRYPTION_ROOT_KEY` | base64 of 32 bytes — `openssl rand -base64 32` |

Add the Railway Postgres and Redis plugins first. Railway Postgres needs TLS;
set `DATABASE_SSL=true` if the connection is refused. The bot runs headless
against the mock Discord gateway by default, so no `BOT_TOKEN` is needed.

## The api-server

`@workspace/api-server` exposes `/api/healthz`. If you attach a Railway
healthcheck, point it at that path.

## Swastik module volumes

The bot loads external modules from the module root (`MODULES_DIR`, default `/mnt/modules`).
Swastik stages and promotes modules onto the same mount. These variables are set on the service
and are part of the deployment surface (UR-20261019-096 / DA-9):

| Variable | Purpose |
| --- | --- |
| `SWASTIK_LIVE_VOLUME_PATH` | the live module volume Swastik promotes into |
| `SWASTIK_STAGING_VOLUME_PATH` | the shared staging volume used for module staging and promotion |
| `SWASTIK_QUARANTINE_PATH` | where a module that fails load-time provenance verification is quarantined (§15.9) |
| `MODULES_DIR` | the module root the loader reads (`/mnt/modules` in the image, `/app/baked-modules` when baked) |
