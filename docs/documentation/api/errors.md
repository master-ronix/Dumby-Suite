---
id: DOC-API-ERRORS
title: API — Error Taxonomy
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

# Error Taxonomy

Every recognized error extends the base `DumbyError`, which carries a machine-readable code,
an HTTP-status-equivalent for classification, a user-safe message, and a retryable flag. The
full set is single-sourced in `contracts/errors.json` — the base plus **14 concrete classes**,
matching `apps/main/src/errors/taxonomy.ts` exactly.

| Class | HTTP | Retryable |
|---|---|---|
| `ValidationError` | 400 | no |
| `PermissionDeniedError` | 403 | no |
| `NotFoundError` | 404 | no |
| `ConflictError` | 409 | no |
| `ExternalServiceError` | 502 | yes |
| `ConfigurationError` | 500 | no |
| `InternalError` | 500 | no |
| `RateLimitedError` | 429 | yes |
| `MaintenanceModeError` | 503 | no |
| `DependencyUnavailableError` | 503 | yes |
| `EventCycleError` | 500 | no |
| `UnauthorizedError` | 401 | no |
| `CommandCeilingExceededError` | 409 | no |
| `CollisionPendingError` | 409 | no |

**User-visible failures** surface through the formal notice frame: the buffer embed is edited
into the merged failure/maintenance/unknown-command presentation carrying a reason code from
the normative set and the interaction's trace correlation id. A failed command never leaves
the buffer hanging and never shows a raw error message.

> The earlier corpus contradicted itself on the number of error classes (eight, thirteen,
> nine, and fourteen all appeared); this contract resolves it to one exact list.
