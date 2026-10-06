# Dumby Project Status

## Current State

Dumby is a TypeScript Discord bot framework built around an 18-stage bootstrap,
DI-first service access, centralized configuration validation, Knex-backed
database access, Redis-backed cache and queue services, command routing,
middleware, permissions, observability, and graceful shutdown.

The core repository ships the framework and runtime infrastructure only. Runtime
behavior is supplied by modules loaded from the Swastik-managed live module
volume configured by `SWASTIK_LIVE_VOLUME_PATH`.

## Module Delivery Boundary

Module source packages are not baked into the core image. Swastik owns module
delivery through upload, validation, staging, promotion, and hot-swap. At
runtime, bootstrap Stage 10 (`MODULE_DISCOVER`) reads the mounted live volume,
validates each promoted module manifest, imports the compiled module package,
and registers it with the module registry.

Kubernetes manifests define separate persistent volume claims for Swastik
staging and live paths:

- `/data/swastik-staging`
- `/data/swastik-live`

The configured live path must match `SWASTIK_LIVE_VOLUME_PATH`.

## Verification Commands

Run from the repository root:

```bash
pnpm install --frozen-lockfile
pnpm --filter @workspace/dumby typecheck
pnpm --filter @workspace/dumby lint
pnpm --filter @workspace/dumby test:unit
```

Integration tests require Postgres and Redis.

## Operational Notes

Use `apps/main/.env.example` as the configuration template. Do not commit local
secrets, environment files, dependency directories, build outputs, coverage, or
Swastik volume contents.
