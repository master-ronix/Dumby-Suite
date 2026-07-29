# API Documentation

This directory documents the HTTP API surfaces of the Dumby Unified Modular Bot System.

## API Servers

Dumby runs **three separate Fastify instances** on distinct ports, so health/metrics remain reachable even under API-port load (blueprint.md §13):

| Server | Port (env var) | Purpose |
|---|---|---|
| Health Server | `HEALTH_PORT` (default 8081) | Kubernetes/Docker health probes only |
| Metrics Server | `METRICS_PORT` (default 8082) | Prometheus scrape endpoint |
| API Server | `API_PORT` (default 8080) | Admin REST, PEP, module routes, webhooks |

## Health Endpoints

All three probes are on the **Health Server** only. They have **no dependency** on the rest of the app beyond `BootstrapProgress`.

### `GET /health/liveness`

Returns `200` once bootstrap Stage 04 (`OBSERVABILITY_INIT`) is reached. Returns `503` before that.

```json
// 200 OK
{ "status": "live" }

// 503 Service Unavailable
{ "status": "starting", "stage": "CONFIG_LOAD" }
```

### `GET /health/startup`

Returns `200` once bootstrap Stage 15 (`DISCORD_LOGIN`) is reached. Returns `503` before that.

```json
// 200 OK
{ "status": "started" }
```

### `GET /health/readiness`

Returns `200` once Stage 18 (`STARTUP_COMPLETE`) AND all `required: true` modules are healthy. Used by Kubernetes to gate traffic routing.

```json
// 200 OK
{ "status": "ready" }
```

## Metrics Endpoint

### `GET /metrics`

Returns Prometheus text format. Scraped by your metrics stack (Prometheus/Grafana).

Registered counters/histograms include:
- `dumby_commands_total` — command invocations by name and outcome
- `dumby_rate_limit_rejections_total` — rate limit hits by scope and command
- `dumby_permission_denials_total` — permission denials by layer
- `dumby_cache_hits_total` / `dumby_cache_misses_total` — per cache tier
- `dumby_db_query_duration_ms` — query duration histogram
- `dumby_module_load_duration_ms` — per-module load time

## Admin API

All admin routes require the `Authorization: Bearer <INTERNAL_API_KEY>` header. Requests without a valid key are rejected with `401`.

### `GET /info`

Returns basic process info (non-sensitive: version, uptime, node version).

### Power Engine Panel (PEP)

Every PEP call requires `{ actorId, source, reason }` in the request body. An empty `reason` or an untrusted `source` (not in `PEP_TRUSTED_SOURCES`) is rejected with `400` and an audit row is written for the rejection.

**Base path:** `POST /api/admin/power-engine/{action}`

| Action | Domain |
|---|---|
| `guild.suspend` / `guild.unsuspend` | Guild lifecycle |
| `module.suspend` / `module.unsuspend` | Module lifecycle |
| `developer.suspend` / `developer.unsuspend` | Swastik developer lifecycle |
| `command.suspend` / `command.unsuspend` | Command lifecycle |
| `maintenance.enable` / `maintenance.disable` | Maintenance mode |
| `cache.flush` | Cache management |
| `queue.pause` / `queue.resume` | Job queue lifecycle |
| `queue.requeue-dead-letter` | Dead-letter recovery |
| `ratelimit.override` | Rate limit override |
| `shard.restart` | Shard group restart |
| `deployment.trigger` | Deployment trigger |
| `persona.suspend` | Persona lifecycle |
| `audit.query` | Audit log query |
| `marketplace.revoke-signature` | Marketplace signature revocation |
| `credentials.rotate` | Credential rotation |

## Module Routes

Module-registered routes are mounted under `/api/modules/{module-slug}/`. Each module declares its routes in its manifest and registers them in its `index.ts` `onLoad` hook. Routes inherit the admin API's authentication requirement.

## Webhook Verification

All webhook routes must be registered with a signature verifier. A route without one is rejected at registration time — this is enforced at bootstrap Stage 09 (DI_BOOTSTRAP), not at request time.

Supported verification schemes:
- HMAC-SHA256 (Discord, GitHub-style)
- Ed25519 (Discord interaction endpoints)
