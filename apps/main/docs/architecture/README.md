# Architecture Documentation

This directory contains the architectural documentation for the Dumby Unified Modular Bot System.

## Contents

- **[System Overview](#system-overview)** — The high-level architecture diagram and component relationships.
- **[Bootstrap Sequence](#bootstrap-sequence)** — The 18-stage startup sequence.
- **[Module System](#module-system)** — How modules are discovered, validated, and loaded.
- **[Middleware Pipeline](#middleware-pipeline)** — The 12-stage middleware onion.
- **[Permission Engine](#permission-engine)** — The 7-layer authorization system.
- **[Database Schema](#database-schema)** — The complete core schema reference.
- **[Caching Architecture](#caching-architecture)** — L1/L2 cache design.
- **[Control Plane](#control-plane)** — PEP, CLAI, Swastik, Credentials Service.

## System Overview

```
DISCORD GATEWAY & REST API
        │  GatewayIntentBits = union of every loaded module's declared intents
        ▼
APPLICATION CORE  (one instance per process)
  Bootstrap → DI Container → Event Router → Command Router
  Middleware Pipeline → Permission Engine (7-layer) → Config Manager
  Cache Manager → Database Manager → Job Queue → HTTP Server
        │  loaded through the Module Registry
        ▼
MODULE LAYER  (N independently-owned modules)
        │
        ▼
EXTERNALIZED STATE — PostgreSQL (system of record) + Redis (acceleration)
```

## Bootstrap Sequence

The 18-stage bootstrap sequence is fully implemented in `src/bootstrap/bootstrap.ts` and `src/bootstrap/stages.ts`. See `blueprint.md §6` and `master-prompt.md §4.2` for the authoritative sequence.

Key health probe gates:
- `/health/liveness` → 200 once Stage 04 OBSERVABILITY_INIT is reached
- `/health/startup` → 200 once Stage 15 DISCORD_LOGIN is reached
- `/health/readiness` → 200 once Stage 18 STARTUP_COMPLETE + all required modules healthy

## Module System

Modules live in `src/modules/<slug>/`. Each module exports:
- `manifest.ts` — The `ModuleManifest` object validated by Zod at bootstrap Stage 11
- `index.ts` — Lifecycle hooks (`onLoad`, `onReady`, `onUnload`)

Module isolation is **tooling-enforced**: five custom ESLint rules prevent cross-module imports, direct process.env access, repository use in commands, event emission from repositories, and undeclared event names. See `eslint.config.mjs`.

## Middleware Pipeline

Executed in ascending priority order (lower number = outermost stage):

| Priority | Stage |
|---|---|
| -20 | MaintenanceModeMiddleware |
| -10 | AdminTierGateMiddleware |
| 0 | TraceMiddleware |
| 10 | AuthMiddleware |
| 20 | GuildConfigMiddleware |
| 30 | LocaleMiddleware |
| 40 | RateLimitMiddleware |
| 50 | PermissionMiddleware |
| 60 | RBACMiddleware |
| 70 | CooldownMiddleware |
| 80 | DeferMiddleware |
| 90 | AnalyticsMiddleware |

## Permission Engine

7-layer resolver in `src/permissions/resolver.ts`. Core tier skips Layer 6 (RBAC) by design. See `blueprint.md §21` and `master-prompt.md §4.5` for the complete specification.

## Database Schema

All core tables are in `src/db/migrations/`. Every entity table carries four standard audit columns (`createdAt`, `updatedAt`, `createdBy`, `updatedBy`), and unique constraints on soft-deletable tables are partial indexes (`WHERE "deletedAt" IS NULL`).

Source of truth: `blueprint.md §24.2` ("Complete Schema Reference").

## Caching Architecture

Two-tier cache behind the `CacheManager` API:
- **L1**: In-process LRU (`L1Cache`, `lru-cache`), max 5,000 entries / 50 MB
- **L2**: Redis-backed (`L2Cache`, `ioredis`), shared fleet-wide
- **StampedeGuard**: Distributed lock (SET NX EX) + probabilistic early refresh

See `src/cache/` and `blueprint.md §10`.

## Control Plane

Four separately-deployed processes sharing the same PostgreSQL primary and Redis instance:

| Service | Entry point | Tier | Status |
|---|---|---|---|
| Power Engine Panel (PEP) | `src/entry/pep.ts` | Tier 2 | Functional |
| CLAI | `src/entry/clai.ts` | Tier 3 | Stub — see ADR 004 |
| Swastik | `src/entry/swastik.ts` | Tier 3 | Partial — see ADR 004 |
| Credentials Service | `src/entry/credentials.ts` | Tier 2 | Functional |

See `master-prompt.md §4.11` and `docs/adr/` for scoping decisions.
