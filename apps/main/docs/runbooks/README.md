# Runbooks

Operational runbooks for the Dumby Unified Modular Bot System.

## Table of Contents

1. [Deploying a New Release](#deploying-a-new-release)
2. [Rolling Back a Release](#rolling-back-a-release)
3. [Enabling / Disabling Maintenance Mode](#enabling--disabling-maintenance-mode)
4. [Suspending a Guild or Module](#suspending-a-guild-or-module)
5. [Flushing a Cache Namespace](#flushing-a-cache-namespace)
6. [Database Migration Rollback](#database-migration-rollback)
7. [Rotating Credentials](#rotating-credentials)
8. [Investigating a Production Incident](#investigating-a-production-incident)

---

## Deploying a New Release

1. Merge your PR to `main`. The `release.yml` workflow triggers automatically via changesets.
2. If the release workflow creates a "Version Packages" PR, merge it to cut a versioned release.
3. The `deploy-staging.yml` workflow deploys automatically to staging on merge to `main`.
4. For production: navigate to GitHub Actions → `deploy-production.yml` → Run workflow. **Two distinct approvers** are required before the deployment proceeds (configured in the GitHub environment protection rules).
5. Monitor `/health/readiness` on the production cluster — it returns 200 once Stage 18 is complete.

---

## Rolling Back a Release

1. Open GitHub Actions → `deploy-production.yml` → Run workflow with the previous image tag.
2. Alternatively, use `kubectl set image deployment/dumby dumby=dumby:<previous-sha>`.
3. The pod's 18-stage bootstrap and all health probes will gate traffic until the rollback is healthy.

---

## Enabling / Disabling Maintenance Mode

Maintenance mode is controlled via the Power Engine Panel (Power Engine):

```
POST /api/admin/power-engine/maintenance.enable
Body: { "actorId": "<operator-id>", "source": "dashboard", "reason": "<incident-description>" }
```

```
POST /api/admin/power-engine/maintenance.disable
Body: { "actorId": "<operator-id>", "source": "dashboard", "reason": "<all-clear>" }
```

Every Power Engine call writes an unconditional `audit_logs` row before returning. An empty `reason` is rejected.

---

## Suspending a Guild or Module

```
# Suspend a guild (stops all bot responses in that guild)
POST /api/admin/power-engine/guild.suspend
Body: { "actorId": "...", "source": "dashboard", "reason": "ToS violation", "guildId": "..." }

# Suspend a specific module globally
POST /api/admin/power-engine/module.suspend
Body: { "actorId": "...", "source": "dashboard", "reason": "...", "moduleSlug": "..." }
```

---

## Flushing a Cache Namespace

```
POST /api/admin/power-engine/cache.flush
Body: { "actorId": "...", "source": "dashboard", "reason": "config corruption", "namespace": "guild:*" }
```

This issues a `SCAN`+`DEL` against the Redis namespace pattern and publishes a cross-pod L1 invalidation event.

---

## Database Migration Rollback

```bash
pnpm migrate:down   # Rolls back the most recent migration batch
pnpm migrate        # Re-runs pending migrations
pnpm migrate:status # Shows migration history
```

**Every migration has a working `down()` function** — this is a CI gate (failing migrations are rejected in the `ci.yml` test job).

---

## Rotating Credentials

The Credentials Service (`src/entry/credentials.ts`) exposes:

```
POST /credentials/revoke
Body: { "credentialId": "..." }

POST /credentials/issue
Body: { "label": "...", "registeredBy": "..." }
```

The new plaintext token is returned exactly once in the response. Store it securely immediately; it is never stored in plaintext and cannot be recovered.

---

## Investigating a Production Incident

1. Check `/health/liveness` and `/health/readiness` — determines bootstrap stage.
2. Query Prometheus metrics at `/metrics` — look for error rate spikes, rate-limit rejections.
3. Query structured logs (Pino JSON → your log aggregator) — filter by `correlationId` from the failing interaction.
4. Use CLAI (SSH) to run Power Engine commands without direct database access: `audit query --limit 50 --after <timestamp>`.
5. Check `audit_logs` table for recent Power Engine actions: `SELECT * FROM audit_logs ORDER BY id DESC LIMIT 100;`

**CLAI is accessible only from a private network position** (bastion/VPN) — it is never exposed on a public interface (ADR 001).
