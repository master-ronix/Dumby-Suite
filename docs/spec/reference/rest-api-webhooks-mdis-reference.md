---
id: SPEC-08-REFERENCE-0044
title: 44. REST API, Webhooks & MDIS Reference
kind: spec
status: normative
version: 5.0.0
authority_scope: [08-reference]
anchors: [REST_API_WEBHOOKS_MDIS, FOUR_AUTHENTICATION_CONTEXTS_NEVER, KIND_BASED_END_TO, HEALTH_METRICS_INFO_ENDPOINTS, MODULE_CONFIGURATION_STATE_ENDPOIN, OUTBOUND_HTTP_CLIENT, OUTBOUND_WEBHOOK_DELIVERY, POWER_ENGINE_REST_API, SWASTIK_DEVELOPER_UPLOAD_API, VERSIONED_API_FAMILIES, CONTRACT, ACCEPTANCE]
contracts: []
acceptance: [ACC-REF-0044-1]
owners: [framework-maintainers]
last_verified_commit: null
review_state: pending-evidence
---

## 44. REST API, Webhooks & MDIS Reference

**Status:** [SPEC]

### 44.1 Four Authentication Contexts, Never Conflated

The HTTP server is bound at bootstrap Stage 03 alongside the health endpoints. It exposes four
authentication contexts, each with its own credential type, verification path, and permitted
surface — never accepted interchangeably.

```
TABLE 44-A — Authentication contexts

Context                     Credential                          Governs access to
MDIS dashboard              Discord OAuth2 user token           guild configuration and module
                                                                state — routed through the
                                                                permission resolver
Swastik developer           a dev id issued by the Credentials  module upload, versioning, and
                            Service, in the Authorization       the developer's own status
                            header
Power Engine / CLAI         an operator credential issued by    the seventeen control domains —
operator                    the Credentials Service             never reachable from the public
                                                                internet directly
Inbound webhook             a provider-specific signature       a module's own registered
                            (HMAC-SHA256 or the origin's own    webhook route only
                            scheme)
```

**Inbound webhook verification contract.** A module's registered webhook route registers at
Stage 14 only with a verification configuration, and verification is provider-specific — each
supported provider's scheme (HMAC construction, header names, timestamp handling, encoding) is
implemented as its own verifier, not one generic digest check. Every verified request
additionally passes a 5-minute replay window (an older timestamp is rejected regardless of
signature validity) and a Redis idempotency check keyed on the delivery identifier. Stage 14
refuses to register a webhook route whose provider verifier is missing.

### 44.2 Health, Metrics & Info Endpoints

```
GET /health/liveness   → returns 200 once observability is up (Stage 04)
GET /health/startup    → returns 200 once the gateway is connected (Stage 15)
GET /health/readiness  → returns 200 once all required modules are healthy (Stage 18)
GET /metrics           → Prometheus text format — the metric families of §27.3
GET /info              → framework version (generated from package.json at build time, never
                         a hardcoded literal), loaded module count by tier, the shard range
                         this pod owns, the fleet's total guild count, and runtime versions
                         (Node.js, discord.js) — unauthenticated, and deliberately free of
                         anything guild-identifying (aggregate counts only)
```

### 44.3 Module Configuration & State Endpoints (MDIS)

The MDIS endpoint shapes, specified in full at §16.5:

```
GET   /api/modules/:name/config   → current guild config for this module
PUT   /api/modules/:name/config   → update, validated against the module's own
                                    dashboardSchema-declared fields
POST  /api/modules/:name/:action  → module-defined custom actions
PATCH /api/modules/:name/state    → enable/disable — a SEPARATE endpoint from /config,
                                    writing to guild_module_states, never conflated with
                                    config
```

### 44.4 Outbound HTTP Client

Any module's service layer calling a third-party API does so through a shared HTTP client
wrapper rather than a bare fetch — the wrapper applies consistent timeout defaults, integrates
the retry utility (for idempotent requests only) and the circuit breaker automatically, and
instruments every call with a tracing child span.

### 44.5 Outbound Webhook Delivery

Where configured, Swastik delivers a signed webhook to a developer's registered endpoint
reporting deployment status — the validation result, the promotion outcome, or an automatic
rollback. The payload is signed with the same HMAC discipline the inbound contract requires.

### 44.6 Power Engine REST API

Every one of Power Engine's seventeen control domains is reachable as an authenticated POST to
`/api/pep/{functionName}`, with a request body validated against that function's own typed
parameter schema — the identical schema CLAI's terminal validates against. The dispatcher
lives at `apps/main/src/http/power-engine-dispatcher.ts`, and the catalogue at
`src/http/power-engine-catalog.ts`.

### 44.7 Swastik Developer & Upload API

```
POST /api/swastik/register                 → developer registration
POST /api/swastik/modules/:slug/upload     → module package + manifest upload,
                                             Authorization: Bearer {devId}
GET  /api/swastik/modules/:slug/status     → validation/staging/promotion status for the
                                             developer's own most recent upload
```

### 44.8 Versioned API Families

The REST surface is organised into versioned, OpenAPI-documented API families. Every family is
versioned independently — an `/api/v1/...` path carries its own contract, registered in the
Compatibility Ledger — documented by a machine-generated OpenAPI spec published alongside each
release, and held to the same quality bar the control plane established.

```
TABLE 44-B — API families

catalog                module discovery and installation: browsable listings
                       (visibility-aware), categories, install/uninstall flows
developer self-service registration, repository binding and push-triggered deployment,
                       upload, status, deployment records
governance             licence-machine transitions, review workflow,
                       suspension/revocation
installs               per-guild installed-module state and configuration — the MDIS
                       backend
Twill                  persona registration API, bindings, branding, charter status
webhooks               inbound verification contract and outbound signed delivery
```

The families exist so a future developer portal and any web frontend can be built against
documented, versioned contracts — never ad-hoc endpoints — and so a contract change in one
family is a ledger entry and a semver bump rather than a silent break for every client at once.

### 44.9 How To Verify This Section Against the Code

- The HTTP server and routes: `apps/main/src/http/server.ts`, `src/http/routes/`.
- The internal-auth guard: `apps/main/src/http/internal-auth.ts`.
- The OpenAPI spec: `lib/api-spec/openapi.yaml`, `contracts/openapi.yaml`.
- The control-plane dispatcher and catalogue: `apps/main/src/http/power-engine-dispatcher.ts`,
  `src/http/power-engine-catalog.ts`.

Divergences are recorded in `status/code-reconciliation.json`. The three this section's own path
layout carries are `REC-036` (the info, MDIS and Swastik families are mounted at `/api/info`,
`/mdis/*` and `/swastik/*`), `REC-037` (the control plane is mounted per action under
`/admin/power-engine/*`, not as `POST /api/pep/{functionName}`) and `REC-038` (the gateway and
operator paths are declared and not mounted). The mounted surface itself is enumerated in
`contracts/openapi.yaml`.

## Contract
None (conceptual).

## Acceptance
```acceptance
- id: ACC-REF-0044-1
  check: "The OpenAPI contract and the mounted surface agree in both directions: every path the contract declares is registered by the server, and every path the server registers is declared by the contract"
  test: tests/unit/openapi-parity.test.ts
```

## Edges (-> blueprint)
- SPEC-08-REFERENCE -> status/compliance.json (generated from contracts + capabilities)

## Named entities

**classes, interfaces & symbols:** `CircuitBreaker`
