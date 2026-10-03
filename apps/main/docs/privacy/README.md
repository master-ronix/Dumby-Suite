# Privacy Documentation

This directory contains the privacy and data governance documentation for the Dumby Unified Modular Bot System.

## GDPR-Adjacent Design

Dumby's data handling is designed to support GDPR-style erasure and export rights at the framework level, so individual modules don't have to implement this independently.

### Erasure/Export Coordinator

The framework provides a pluggable erasure and export interface:

```typescript
// Register an eraser for user data owned by your module:
registerEraser(moduleId: string, eraser: (userId: string) => Promise<void>)

// Register an exporter for user data:
registerExporter(moduleId: string, exporter: (userId: string) => Promise<unknown>)
```

The two shipped modules (`health`, `hello`) register no eraser or exporter because they store no per-user data.

### Data Categories

| Category | Storage | Retention |
|---|---|---|
| Guild configuration | PostgreSQL `guild_configs` | Until guild removes the bot |
| User identity (Discord snowflake) | PostgreSQL `users` | Until erasure request |
| Command invocation analytics | PostgreSQL `audit_logs` | Indefinite (insert-only, cannot be deleted) |
| Per-user cooldowns | Redis (ephemeral) | TTL-based, typically 60–900 seconds |
| Cache entries | Redis (ephemeral) | TTL-based per cache family |

### Audit Log Immutability

The `audit_logs` table is **insert-only by design** (enforced by ESLint rule matching non-`.insert()` Knex calls against this table). This means audit records for Power Engine actions cannot be deleted, even in response to a GDPR erasure request. This is intentional: administrative audit records must be retained for security and accountability purposes.

### Secrets Handling

- All secrets are injected as environment variables at runtime, never committed to source control.
- The `REDACT_PATHS` list in `src/logging/logger.ts` centrally prevents secret-shaped log fields from appearing in log output, regardless of nesting depth.
- The Credentials Service (`src/entry/credentials.ts`) stores all credentials as Argon2id hashes; plaintext is displayed exactly once and never stored.

## Data Minimization

Dumby collects only what is needed for operation:
- Discord user IDs (snowflakes) — required for permission resolution and RBAC
- Guild IDs — required for multi-tenancy
- Invocation metadata (command name, timestamp, outcome) — required for rate limiting, cooldowns, and audit

No message content is read or stored except when a module explicitly declares the `MessageContent` intent and registers handlers for it. No module in the current build does so.

## Localization and Language Rights

The i18n system (`src/i18n/`) supports per-locale message bundles. The mandatory `en-US.json` file ships with every module; additional locales may be added without code changes to the framework.
