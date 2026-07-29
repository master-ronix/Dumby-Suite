# Compliance Documentation

This directory documents compliance posture for the Dumby Unified Modular Bot System against the authoritative specification matrices in `blueprint.md §45` and `directive.md §46`.

## Compliance Matrix: blueprint.md §45

The following table walks every row of the blueprint compliance matrix. Items marked ✅ are fully implemented; ⚠️ are partially implemented with a noted limitation; ❌ are explicitly deferred with an ADR reference.

| Area | Status | Notes |
|---|---|---|
| 18-stage bootstrap | ✅ | All stages implemented in `src/bootstrap/bootstrap.ts` |
| Graceful 9-step shutdown | ✅ | `src/shutdown/shutdown.ts`; `terminationGracePeriodSeconds: 190` in k8s |
| DI container (Symbol tokens, 3 lifetimes, cycle detection) | ✅ | `src/di/container.ts` |
| Config validation (Zod, strict, field-level errors) | ✅ | `src/config/env.schema.ts` |
| Database (Knex, core schema, partial-index uniqueness) | ✅ | `src/db/`, all migrations with `down()` |
| Cache (L1+L2+StampedeGuard, negative caching, early refresh) | ✅ | `src/cache/` |
| Event bus (cycle guard, bounded depth 20) | ✅ | `src/events/event-bus.ts` |
| Command framework (registry, router, collision detection) | ✅ | `src/commands/` |
| Middleware pipeline (all 12 stages, strict priority) | ✅ | `src/middleware/` |
| Permission engine (7 layers, correct fail-open/closed) | ✅ | `src/permissions/resolver.ts` |
| RBAC (6-role hierarchy, groups, sets, grants) | ✅ | `src/permissions/rbac.ts` |
| Module system (manifest schema, registry, loader, lifecycle) | ✅ | `src/modules/` |
| ESLint architecture rules (5 custom rules) | ✅ | `eslint.config.mjs` |
| Error taxonomy (8 subclasses) | ✅ | `src/errors/taxonomy.ts` |
| Health endpoints (3 probes, correct stage gating) | ✅ | `src/http/routes/health.routes.ts` |
| Observability (Pino, Prometheus, OTel) | ✅ | `src/logging/`, `src/metrics/`, `src/tracing/` |
| Rate limiting (dual-window + fail-closed fallback) | ✅ | `src/ratelimit/`, `src/middleware/built-in/rate-limit.ts` |
| Job queue (BullMQ, autoscaler) | ✅ Tier 2 | `src/queue/`; single-node only (ADR 005 — BullMQ SPOF) |
| i18n (mandatory en-US locale per module) | ✅ | `src/i18n/` |
| `/health` and `/hello` modules (interface.md spec) | ✅ | `src/modules/health/`, `src/modules/hello/` |
| `_template` module | ✅ | `src/modules/_template/` |
| Webhook signature verification infrastructure | ✅ | `src/http/routes/admin.routes.ts` |
| PEP (17 domains, pre-action audit) | ✅ Tier 2 | `src/http/power-engine-dispatcher.ts`, `src/entry/pep.ts` |
| Credentials Service (Argon2id, local bind, revocable) | ✅ Tier 2 | `src/entry/credentials.ts` |
| CLAI (SSH public-key auth, REPL, private-only) | ⚠️ Tier 3 | Stub — ssh2 dep not installed (ADR 001, ADR 004) |
| Swastik (developer registration, build tracking, promote) | ⚠️ Tier 3 | REST API functional; staging uses local filesystem (ADR 004) |
| Persona/Twill (data model, binding) | ❌ Tier 3 | Data model exists in schema; no entry point (ADR 004) |
| MDIS backend (dashboardSchema, 4 auto-endpoints) | ❌ Tier 3 | Contract defined in module manifests; REST not wired (ADR 004) |
| Marketplace review pipeline | ❌ Out of scope | No third-party developer ecosystem yet (blueprint.md §36.1) |
| Monetization (src/monetization/) | ❌ Reserved | Empty directory per blueprint.md §7.6 |
| Docker (multi-stage: builder + runtime) | ✅ | `Dockerfile` |
| Kubernetes (base + staging/production overlays) | ✅ | `deploy/k8s/` |
| Terraform modules (database, cache, kubernetes) | ✅ Tier 2 | `deploy/terraform/modules/` |
| CI/CD (5 GitHub Actions workflows) | ✅ | `.github/workflows/` |
| No runtime sandbox for third-party modules | ⚠️ Open item | Documented in ADR 005 |
| BullMQ Redis single-point-of-failure | ⚠️ Open item | Documented in ADR 005 |

## Compliance Matrix: directive.md §46

The 62-item directive compliance checklist maps to the same build as the blueprint matrix above. Key items:

| Item | Status |
|---|---|
| tsc --noEmit is CI gate #1 | ✅ ci.yml job 1 |
| No .js source files | ✅ All source is .ts |
| ESM ("type": "module", "module": "NodeNext") | ✅ package.json + tsconfig |
| pnpm, frozen lockfile in CI | ✅ ci.yml |
| No console.log in server code | ✅ Logger wrapper enforced |
| Secrets via env only | ✅ No committed secrets |
| audit_logs insert-only | ✅ No UPDATE/DELETE against audit_logs anywhere |
| Every migration has a working down() | ✅ All 30+ migrations |
| Coverage floors (per-layer) | ⚠️ Global floor met; per-layer CI enforcement pending |
| Fail-closed/fail-open asymmetry | ✅ Matches §4.5 exactly |
| Core tier skips RBAC (Layer 6) | ✅ Validated by tier-rules.ts |
| terminationGracePeriodSeconds: 190 | ✅ deploy/k8s/base/deployment.yaml |
| maxUnavailable: 0, maxSurge: 1 | ✅ deploy/k8s/base/deployment.yaml |
| Three k8s probes (startup/liveness/readiness) | ✅ deploy/k8s/base/deployment.yaml |

## Deferred Items

All explicitly deferred items have corresponding ADRs in `docs/adr/`:
- ADR 001: CLAI SSH public-key-only (conflict resolution)
- ADR 002: Flattened directory layout (conflict resolution)
- ADR 003: deploy/ vs infra/ naming (conflict resolution)
- ADR 004: Three-tier build scope
- ADR 005: Inherited open items (no runtime sandbox, BullMQ SPOF)
