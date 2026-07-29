---
name: Dumby build state
description: Architecture constraints for the Dumby Discord bot framework (apps/main) and how it's wired into this Replit project.
---

## Important constraints
- `apps/main` is a standalone pnpm package (`@workspace/dumby`), NOT part of the Replit artifact system.
  Do NOT create an artifact for it — it is a headless Discord bot, not a previewable web app. It runs
  via a plain `configureWorkflow` workflow instead (`pnpm --filter @workspace/dumby run start`).
- The bot runs headless by default (`DISCORD_ADAPTER=mock`, the schema default). Live gateway mode
  needs `DISCORD_ADAPTER=live` plus a real `BOT_TOKEN` — see `discord-bot-live-setup.md` for how
  those credentials are obtained (not via a Replit integration).
- `audit_logs` is insert-only forever. No UPDATE or DELETE ever.
- Permission engine layers 2/3/5/6 fail-closed; layers 4/7 fail-open. This asymmetry is intentional —
  do not "normalize" it.
- Coverage floors are per-layer, never blended averages.

**Why:** These decisions trace to `blueprint.md`/`directive.md` and the 3 resolved conflicts in
`apps/main/../docs/master-prompt.md` §0.4 (see `apps/main/docs/adr/`).

## Process/port topology
Only `src/entry/main.ts` → `bootstrap()` is run by the "Dumby Bot" workflow, and it binds three HTTP
servers: health (`HEALTH_PORT`), metrics (`METRICS_PORT`), and the admin/PEP API (`API_PORT`) — in
that order, late in an 18-stage boot sequence (Discord gateway login + command registration happen
*before* the API server binds). `src/entry/pep.ts`, `swastik.ts`, and `credentials.ts` are separate
entry scripts with their own hardcoded/`.env`-driven ports; they are not started by `main.ts` and
don't need a workflow unless that Tier 2/3 surface is specifically in scope.

This project's `API_PORT`/`HEALTH_PORT`/`METRICS_PORT` are overridden via shared env vars (away from
the `.env.example` defaults of 8080/8081/8082) because those defaults collide with this workspace's
`artifacts/api-server` and `artifacts/mockup-sandbox` services — see `discord-bot-live-setup.md` for
the general port-collision lesson.

## Data layer
Postgres is this project's built-in Replit database (`DATABASE_URL` auto-injected, not requested
manually) — Dumby's own Knex migrations (`apps/main/src/db/migrations/`) run against it independently
of the workspace's shared `lib/db` (Drizzle) package; the two coexist in the same Postgres instance
via disjoint tables. Redis (cache L2 + BullMQ queue) runs as a local `redis-server` process, not a
hosted service — see `discord-bot-live-setup.md`.
