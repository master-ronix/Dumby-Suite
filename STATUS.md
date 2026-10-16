# Dumby Project Status

## Current State

Dumby is a TypeScript (ESM, Node ≥ 22) modular Discord bot framework: one pnpm monorepo
(`apps/main/` = the bot and all subsystems; `packages/swastik/` = the module-authoring SDK;
`packages/modules/` = eight first-party modules). It ships a single bootstrap sequence (18
stages), one DI container, one command router, one seven-layer permission engine, one Renderer
(Components v2; the classic embed ban is absolute), a Knex/PostgreSQL data layer, an L1+L2 cache,
a BullMQ job queue, and Pino/prom-client/OpenTelemetry observability. Its documentation corpus
(`docs/`) is gate-verified (27/27) and code-grounded; where spec and code diverge the divergence
is recorded in `docs/status/code-reconciliation.json`. Current chain state: **State C — Enforcement**
(the migration work order is closed — M82 superseded by M83, M74 model confirmed; see `migration-ledger.md`).

## Module Delivery Boundary

Feature modules reach runtime only through Swastik, never by being placed in this repository:
**upload → validation → bounded staging → atomic symlink promotion → reload**, on external
per-tier Kubernetes volumes rooted at `MODULES_DIR` (default `/mnt/modules`; tiers
admin | core | standard | marketplace, plus `swastik-staging`). No module code lives under
`apps/main/src/`.

## Verification Commands

Run from the repository root:

```bash
pnpm install --frozen-lockfile
pnpm -r --filter "./packages/**" --if-present run build   # build workspace packages first
pnpm --filter @workspace/dumby typecheck
pnpm --filter @workspace/dumby lint
pnpm --filter @workspace/dumby test:unit
```

The workspace-package build is required before any test command: the app imports
`@workspace/swastik` at runtime and in tests.
