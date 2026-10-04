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

The HTTP server exposes health, metrics, info, the MDIS configuration API, the Swastik
developer/upload API, and the control plane. The OpenAPI spec is single-sourced in
`contracts/openapi.yaml` (and `lib/api-spec/openapi.yaml`).

**Health, metrics, info**

```
GET /health/liveness   → 200 once observability is up (Stage 04)
GET /health/startup    → 200 once the gateway is connected (Stage 15)
GET /health/readiness  → 200 once all required modules are healthy (Stage 18)
GET /metrics           → Prometheus text format
GET /info              → build/version info, module counts by tier, shard range, aggregate
                         guild count, runtime versions (unauthenticated, aggregate only)
```

**MDIS (module configuration & state)**

```
GET   /api/modules/{name}/config    → current guild config for this module
PUT   /api/modules/{name}/config    → update, validated against the module's schema
POST  /api/modules/{name}/{action}  → module-defined custom actions
PATCH /api/modules/{name}/state     → enable/disable (writes guild_module_states — a
                                      separate endpoint from /config, never conflated)
```

**Swastik (developer & upload)**

```
POST /api/swastik/register                 → developer registration
POST /api/swastik/modules/{slug}/upload    → module package + manifest upload
GET  /api/swastik/modules/{slug}/status    → validation/staging/promotion status
```

**Control plane**

```
POST /api/pep/{functionName}   → one of the 17 Power Engine control domains, validated
                                 against that function's typed parameter schema
POST /admin/operators          → operator register / rotate / revoke
POST /internal/reload          → the module hot-swap signal (Swastik → bot, internal only)
```

**Four authentication contexts, never conflated:** the MDIS dashboard uses a Discord OAuth2
token (routed through the permission resolver); a Swastik developer uses an issued dev id in
the Authorization header; an operator uses an issued operator credential; and an inbound
webhook uses a provider-specific signature. Every `/internal/*` surface additionally requires
a timing-safe internal API key and binds loopback by default.
