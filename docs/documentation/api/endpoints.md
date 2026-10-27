---
id: DOC-API-ENDPOINTS
title: API — HTTP Surface
kind: documentation
status: derived
version: 5.0.0
authority_scope: [api]
contracts: []
acceptance: []
owners: [framework-maintainers]
last_verified_commit: null
review_state: pending-evidence
---

# HTTP Surface

The HTTP server exposes health, metrics, info, the MDIS module API, the Swastik developer and
upload API, the operational and Twill surfaces, and the Power Engine control plane. The
mounted surface is single-sourced in `contracts/openapi.yaml`, which enumerates every route
registration under `apps/main/src`; this page is its prose companion.

Where the specification names a different URL layout for a family, the divergence is recorded
in `status/code-reconciliation.json` (`REC-036`, `REC-037`, `REC-038`) — never smoothed over.
The paths below are the ones the server mounts today.

**Health, metrics, info**

```
GET /health/liveness   → 200 once observability is up (Stage 04)
GET /health/startup    → 200 once the gateway is connected (Stage 15)
GET /health/readiness  → 200 once all required modules are healthy (Stage 18)
GET /metrics           → Prometheus text format
GET /api/info          → build/version info, module counts by tier, shard range, aggregate
                         guild count, runtime versions (unauthenticated, aggregate only)
GET /openapi.yaml      → this contract, served by the app
```

**MDIS (module discovery, installation & state)**

```
GET  /mdis/catalog                          → browsable module catalogue
GET  /mdis/modules/{slug}                   → one module's record
GET  /mdis/guilds/{guildId}/installed       → what this guild has installed
POST /mdis/guilds/{guildId}/install         → install for a guild
POST /mdis/guilds/{guildId}/uninstall       → uninstall for a guild
```

**Swastik (developer & upload)**

```
GET  /swastik/developers/me                        → the caller's developer record
POST /swastik/developers/register                  → developer registration
POST /swastik/modules/upload                       → module package + manifest upload
GET  /swastik/modules/{slug}/builds/{buildId}      → one build's validation/promotion record
GET  /swastik/status                               → validation/staging/promotion status
```

**Control plane and operational surfaces**

```
GET  /admin/config                        → effective configuration read
GET  /admin/system/maintenance-mode       → read maintenance mode
POST /admin/system/maintenance-mode       → write maintenance mode
POST /admin/power-engine/{action}         → one Power Engine control action, validated
                                            against that action's typed parameter schema
POST /admin/governance/developers/{devId}/approve   → governance decision
POST /admin/governance/developers/{devId}/decline   → governance decision
GET  /operational/status                  → operational status read
GET  /operational/runbooks                → runbook index
GET  /twill/personas                      → persona registry
GET  /twill/registrars                    → registrar registry
POST /internal/deploy                     → the module deploy signal (internal only)
POST /internal/reload                     → the module hot-swap signal (Swastik → bot, internal only)
```

**Four authentication contexts, never conflated:** the MDIS dashboard uses a Discord OAuth2
token (routed through the permission resolver); a Swastik developer uses an issued dev id in
the Authorization header; an operator uses an issued operator credential; and an inbound
webhook uses a provider-specific signature. Every `/internal/*` surface additionally requires
a timing-safe internal API key and binds loopback by default.
