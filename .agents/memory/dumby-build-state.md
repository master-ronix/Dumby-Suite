---
name: Dumby build state
description: What was in the zip, what was missing, what was created, current test/typecheck state.
---

## What came in the zip
The uploaded zip (`attached_assets/workspace_1785273535404.zip`) contained a nearly-complete
pre-built `apps/main/` codebase (474 files) covering all Phases 0–8 of the master prompt,
plus `docs/` (all 8 source documents), and empty placeholder dirs for `assets/`, `design/`,
`specs/`, `tools/`, `website/`.

The zip was extracted to `/tmp/dumby_extract/workspace/` and then copied into the workspace root.

## What was missing (had to be created)
Three files in `src/cache/` were absent from the zip:
- `src/cache/l1-cache.ts` — in-process LRU cache (O(1) doubly-linked-list + Map)
- `src/cache/redis-lock-store.ts` — RedisLockStore (ioredis SET NX Lua CAS) + InMemoryLockStore (test/fallback)
- `src/cache/stampede-guard.ts` — wraps recompute with distributed lock
- `src/cache/key-namespace.ts` — key builders + TTL registry + PER (probabilistic early recompute)
  (`key-namespace.ts` was also missing, caught by a second test run)

**Why:** These files are imported in `bootstrap.ts` and `di/tokens.ts` but were not bundled in the zip.

## Current state (after fixes)
- `pnpm typecheck` — CLEAN (no errors)
- `pnpm test` — 33 test files, 446 tests, ALL PASSING
- pnpm-workspace.yaml updated to include `apps/*` so Dumby is a recognized workspace package

## Important constraints
- `apps/main` is a standalone pnpm package (`@workspace/dumby`), NOT part of the Replit artifact system.
  Do NOT create an artifact for it — it is a Discord bot, not a web app.
- The bot runs headless by default (DISCORD_ADAPTER=mock). A real `BOT_TOKEN` is required to connect live.
- `audit_logs` is insert-only forever. No UPDATE or DELETE ever.
- Permission engine layers 2/3/5/6 fail-closed; layers 4/7 fail-open. This asymmetry is intentional.
- Coverage floors are per-layer, never blended averages.

**Why:** These decisions trace to `blueprint.md`/`directive.md` and the 3 resolved conflicts in `master-prompt.md` §0.4.
