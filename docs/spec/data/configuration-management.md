---
id: SPEC-05-DATA-0023
title: 23. Configuration Management
kind: spec
status: normative
version: 5.0.0
authority_scope: [05-data]
anchors: [CONFIGURATION_MANAGEMENT, THREE_CONFIGURATION_SCOPES, PROCESS_LEVEL_CORE_CONFIGURATION, DESIGN_CONSIDERATION_DOCKER_VS, GUILD_LEVEL_CONFIGURATION, PROCESS_LEVEL_MODULE_CONFIGURATION, CONFIGURATION_AUDIT_TRAIL, CONTRACT, ACCEPTANCE, EDGES_BLUEPRINT]
contracts: [contracts/config.schema.json]
acceptance: [ACC-DATA-0023-1, ACC-DATA-0023-2, ACC-DATA-0023-3]
owners: [framework-maintainers]
last_verified_commit: null
review_state: pending-evidence
---

## 23. Configuration Management

**Status:** [SPEC]

### 23.1 Three Configuration Scopes

```
TABLE 23-A — Configuration scope reference

Scope              Storage                          Mutable at runtime?  Validated
Process — core     environment variables            no (needs a redeploy)  Stage 02, root Zod schema
Process — module   env vars, module-name-prefixed   no                     Stage 11, the module's schema
Guild              PostgreSQL (guild_configs JSONB) yes (takes effect now)  on every write, same schema
```

The dividing line is exact: anything that should never differ between one guild and the
next, or that changing incorrectly could threaten the process's ability to start at all, is
process-level and requires a deployment. Anything a guild should reasonably tune for itself
is guild-level and takes effect the instant it is written — no restart, no redeploy, ever.

### 23.2 Process-Level Core Configuration — The Root Schema

Validated during Stage 02, before any module loads and before any gateway connection is
attempted. A representative slice of the root schema:

```
CODE REFERENCE 23-A — Root config schema (representative)

NODE_ENV                     enum(development|staging|production)
LOG_LEVEL                    enum(trace|debug|info|warn|error), default 'info'
BOT_TOKEN                    string, min 1  (empty token crashes Stage 15)
BOT_OWNER_IDS                CSV → string[]  (snowflakes)
DEV_GUILD_ID                 /^\d{17,20}$/  (required; unset/malformed fails Stage 02)
DATABASE_URL                 url
DATABASE_POOL_MAX            int, default 10
DATABASE_STATEMENT_TIMEOUT_MS int, default 10_000
DATABASE_REPLICA_URLS        CSV, optional
DATABASE_REPLICA_MAX_LAG_MS  int, default 1_000
REDIS_URL                    url
HEALTH_PORT                  int, default 8081
CREDENTIALS_SERVICE_PORT     int, default 8086
INTERNAL_API_KEY             string (≥32 in production) — the /internal/* shared key
SHARD_COUNT / SHARD_RANGE    int default 1 / string (parsed only when SHARD_COUNT > 1)
RATE_LIMIT_USER_WINDOW_MS    default 60_000     RATE_LIMIT_USER_MAX    default 10
RATE_LIMIT_GUILD_WINDOW_MS   default 60_000     RATE_LIMIT_GUILD_MAX   default 100
CACHE_L1_MAX_ENTRIES         default 5_000      CACHE_L1_MAX_BYTES     default 50 MiB
TELEMETRY_ENABLED            bool, default false (opt-in, fail-safe off)
TRACE_SAMPLE_RATE            number 0..1, default 0.1
SLOW_QUERY_THRESHOLD_MS      default 500         CRITICAL_QUERY_THRESHOLD_MS default 2_000
EVENT_LOOP_LAG_SHED_THRESHOLD_MS default 50
EVENT_BUS_MAX_EMIT_DEPTH     default 20
SHARD_LOCK_HEARTBEAT_MS      default 10_000      SHARD_LOCK_RETRY_MS    default 2_000
```

The schema's rules are as important as its fields:

- **Every key has a live consumer or an explicit operator-runbook entry.** CI diffs the
  schema's keys against the code that reads them and the runbook's operator-only keys; a
  declared key with neither fails the build. The root schema exports its complete key set as
  a machine-readable list, which the configmap-sync CI check diffs against the Kubernetes
  configmap and `.env.example`.
- **Privileged Discord intents are gated by a fixed whitelist** validated at Stage 02:
  `MessageContent`, `GuildMembers`, and `GuildPresences` anywhere in the resolved intent set
  fail validation with a configuration error naming the offending intent.
- **A missing required field or a failing refinement produces a field-by-field Zod error
  printed before the process exits** — never a downstream `undefined`.
- **Two naming conventions:** the canonical development-guild key plus an accepted
  compatibility alias; an unrecognized key present in the environment is *ignored, not
  rejected*. `.env.example` is generated from the exported key set.
- **No key-bearing variables beyond the encryption root.** Key material belongs to the
  envelope-encryption hierarchy (§32.7); no other variable reads an encryption key, and no
  JWT signing key exists at all — the HTTP surface authenticates with issued bearer tokens
  and HMAC shared secrets, not JWTs.

> **Code note.** The runtime `env.schema.ts` also carries the control-plane ports
> (Power Engine 8083, CLAI 8084, Swastik 8085, Credentials 8086, Twill 8090) and the module
> volume paths (`MODULES_DIR`, `SWASTIK_*_VOLUME_PATH`). The specification must reflect that
> full set; the earlier docs listed only 8080/8081/8082/8085. Tracked as REC-011.

### 23.3 Guild-Level Configuration

`guild_configs` holds one row per guild, keyed by guild id, with a `settings` JSONB column
validated against a Zod schema on every write and deserialized against that same schema on
every read.

```
CODE REFERENCE 23-B — Guild config schema (representative)

locale                string, default 'en-US'
timezone              string, default 'UTC'
prefix                string max 5, optional — a DISPLAY-ONLY convenience value, never a
                      functional command prefix (§4)
moderation            { logChannelId?, muteRoleId? }  (snowflake regexes)
channelRestrictions   record<commandKey, { mode: 'allow'|'deny', channelIds: string[] }>
premiumEnabled        boolean, default false
```

**JSONB schema evolution over `settings` MUST be backward-compatible:** new fields are
optional with defaults, and a newly-added field never turns an existing valid row into a
read-time validation failure. Any non-additive change requires a pre-deployment data
migration that backfills existing rows before the new schema ships. The read path is the
cache cascade of §6.4 — L1 in-process LRU, then Redis L2, then PostgreSQL — and the
"takes effect immediately" claim depends on the write path's synchronous cache invalidation
(§13.4).

Every module-specific setting a guild administrator can tune lives inside this same
document, namespaced under the module's own key — a module never gets its own separate
guild-scoped table for simple configuration values.

### 23.4 Process-Level Module Configuration

A module's own `config` manifest field declares a Zod schema for *process*-level values that
module needs — not guild-tunable settings, but deployment-level parameters such as an
external API key a module integrates with, or a hard operational ceiling like a reminder
horizon. These validate at **Stage 11** alongside the manifest itself, using environment
variables prefixed with the module's own name in SCREAMING_SNAKE_CASE (for example,
`REMINDERS_MAX_HORIZON_DAYS`), so no two modules can collide on a variable name.

### 23.5 Configuration Audit Trail

Every write to `guild_configs` — via a command, MDIS, or an internal migration — is recorded
in `audit_logs` with the specific diff: which keys changed, their old and new values, the
acting user, and a timestamp. One table, one query, regardless of which module or interface
made the change.

### 23.6 State Externalization Constraint

User-visible state never lives in a single process's memory. Processes are stateless;
PostgreSQL is the durable store and Redis carries cache and shard-ownership locks with TTLs.
Degradation is graceful: Redis down falls through to PostgreSQL, and shard locks fall back
to TTL expiry. A documented state-placement reference table (§26.2) makes the rule explicit.

### 23.7 The Effective Config Descriptor

The "encrypted licence file" of earlier drafts is replaced by an **Effective Config
Descriptor**: a signed descriptor proving provenance — signed always (it came from Swastik,
unaltered), encrypted only when a value is genuinely confidential — containing the module
id, build id, and resolved config (manifest defaults plus live policy overrides), approval
status, approver, timestamp, and revocation flag. It is mounted read-only into the module's
own sandbox. The registration row (developer id ↔ module id ↔ approval status) stays as
designed.

### 23.8 How To Verify This Section Against the Code

- The root environment schema (the full key set, ports, and defaults):
  `apps/main/src/config/env.schema.ts`.
- The config service and the per-guild config service:
  `apps/main/src/config/config.service.ts`, `src/config/guild-config.service.ts`.
- The guild configs migration:
  `apps/main/src/db/migrations/20260101000004_create_guild_configs.ts`.

Divergences are recorded in `status/code-reconciliation.json`.

## Contract
- `contracts/config.schema.json`

## Acceptance
```acceptance
- id: ACC-DATA-0023-1
  check: "Three config scopes exist: core (process), guild, and process-module"
  test: tests/unit/config-scopes.spec.ts
- id: ACC-DATA-0023-2
  check: "The root config schema is Zod-validated at Stage 02 before any DB or gateway connection"
  test: tests/integration/config-validated-early.spec.ts
- id: ACC-DATA-0023-3
  check: "A guild-level config change takes effect immediately with no restart or redeploy"
  test: tests/integration/guild-config-hotapply.spec.ts
```

## Edges (-> blueprint)
- SPEC-05-DATA -> SPEC-02-ARCHITECTURE (PostgreSQL system of record; Redis acceleration)
- SPEC-05-DATA -> SPEC-03-MODULES (each module owns its tables)

## Named entities

**classes, interfaces & symbols:** `JWTs`, `SHARD_COUNT-1`, `guildConfigSchema`, `parseBoolean`, `rootConfigSchema`, `DEVELOPMENT_GUILD_ID`, `ENCRYPTION_KEY_`, `JWT_SIGNING_KEY`, `MAX_REMINDER_HORIZON_DAYS`, `z.unknown`
