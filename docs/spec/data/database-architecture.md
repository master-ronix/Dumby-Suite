---
id: SPEC-05-DATA-0024
title: 24. Database Architecture
kind: spec
status: normative
version: 5.0.0
authority_scope: [05-data]
anchors: [DATABASE_ARCHITECTURE, WHY_POSTGRESQL, COMPLETE_SCHEMA_REFERENCE, AUDIT_LOG_PARTITIONING_RETENTION, THE_REPOSITORY_PATTERN, MIGRATIONS, STANDARD_AUDIT_COLUMNS, READ_WRITE_ROUTING_SLOW, CONNECTION_POOL_TUNING, QUERY_OPTIMIZATION, SCHEMA_PARTITIONING, TRANSACTION_MANAGEMENT]
contracts: [contracts/config.schema.json]
acceptance: [ACC-DATA-0024-1, ACC-DATA-0024-2, ACC-DATA-0024-3, ACC-DATA-0024-4]
owners: [framework-maintainers]
last_verified_commit: null
review_state: pending-evidence
---

## 24. Database Architecture

**Status:** [SPEC]

### 24.1 Why PostgreSQL

**JSONB** gives the guild config document schema flexibility without sacrificing relational
integrity for every table that *is* strictly relational (cases, audit entries, module
state); **transactions** guarantee a multi-table write — a moderation case plus its
infraction record plus an audit entry — either fully commits or fully rolls back; **row-level
locking** (`SELECT ... FOR UPDATE`) prevents two concurrent commands from double-processing
the same target row; and **`LISTEN`/`NOTIFY`** provides a lightweight, no-extra-infrastructure
channel for cross-process cache-invalidation signalling as a fallback alongside Redis pub/sub.

### 24.2 Complete Schema Reference

The early developer/build tables of the legacy design are superseded by the `developers` and
`builds` tables below and are not part of the live schema.

```
SCHEMA 24-A — Core tables (owned by the application core, never a module)

guilds               id snowflake PK; name; joinedAt; leftAt nullable (non-null ⇒ the
                     bot is no longer present — Layer 3 denies on this); shardId
users                id snowflake PK; globalBanned boolean default false (platform-wide,
                     independent of any guild-scoped blacklist entry)
guild_configs        guildId snowflake PK REFERENCES guilds; settings jsonb (validated
                     against §23.3); standard audit columns
guild_roles          Layer 7 grant-scope groups; id uuid PK; guildId; groupName;
                     discordRoleIds snowflake[]; audit columns
guild_module_states  guildId + moduleSlug composite PK; tier; status; wasStandardDefault;
                     installedAt; disabledAt; dataRetentionPolicy; audit columns
grants               Layer 7 grants; id uuid PK; guildId; targetType ('user'|'role'|
                     'group'|'set'); targetId; scopeType ('command'|'module'); scopeName;
                     grantType ('permit'|'blacklist'|'whitelist'|'cooldown'|'rate-limit');
                     grantValue jsonb; audit columns
blocked_users        Layer 2 blacklist; id uuid PK; userId; guildId nullable (null ⇒
                     global); reason; blockedBy; blockedAt; expiresAt nullable
audit_logs           APPEND-ONLY, never updated; id uuid PK; source; actorId; action;
                     targetType/targetId; beforeState/afterState jsonb; reason; timestamp
developers           devId string PK (opaque; the secret is Argon2id-hashed, never raw);
                     username; licenseState (the six-state machine); registeredAt;
                     approvedAt; approvedBy
builds               buildId string PK; devId REFERENCES developers; moduleSlug; version;
                     validationStatus; sourceArchiveHash/artifactHash/lockfileHash/
                     gateResultsHash; sbom jsonb; signature; signatureKeyId;
                     signedDescriptor jsonb; promotedAt nullable
marketplace_listings moduleSlug string PK; devId REFERENCES developers; category enum;
                     description; signatureValid boolean (false ⇒ revoked; load refused);
                     listedAt
metering_usage_daily guildId + date composite PK; metricUnitsConsumed integer;
                     breakdown jsonb
```

Every module-owned table — reminders, cases, infractions, and every table any other module's
migrations create — lives in this same database but is never listed here: it belongs
exclusively to its owning module (P2), created by that module's own migrations, invisible to
the core schema.

**Open items flagged in this section.** Several features have a database table but no service
class — resource metering, backup history, outbound webhooks, webhook-delivery idempotency,
the MTP synthetic-token ledger, and the marketplace review pipeline. Each needs a service
class with CRUD/business logic, registered in the DI container, with tests. The BullMQ/Redis
fallback is unresolved: there is no database-backed fallback for job state, so Redis remains
an acknowledged single point of failure for the queue. And the guild command change-queue
table exists with no processing logic wired — its scheduler must be invoked from bootstrap.

### 24.2.1 Audit Log Partitioning & Retention

`audit_logs` is append-only and grows without bound; at high write volume it can fill the
database disk and stall PostgreSQL. The table **must be range-partitioned by `created_at`**
(PostgreSQL declarative partitioning), with an automated retention policy archiving and
dropping partitions older than the configured window (default **90 days**, archived to cold
storage). No partition is ever truncated in place; retention is **partition-drop only**.

### 24.3 The Repository Pattern

The base repository is the **sole abstraction over Knex** — every module's own repository
classes extend it, inheriting a typed CRUD surface.

```
CODE REFERENCE 24-A — BaseRepository surface

abstract class BaseRepository<T extends { id: string | number }> {
  protected abstract table: string;
  constructor(protected readonly db: IDatabaseManager) {}

  async findById(id: T['id']): Promise<T | null>;
  async findMany(filter: Partial<T> & RangeFilters<T>, opts?: QueryOptions):
    Promise<{ records: T[]; total: number }>;
  async create(data: Omit<T, 'id' | 'createdAt' | 'updatedAt'>): Promise<T>;
  async updateById(id: T['id'], data: Partial<T>): Promise<T | null>;
  async deleteById(id: T['id']): Promise<boolean>;

  // Escape hatch for genuinely bespoke queries, still routed through the same
  // connection/replica logic — never raw pg
  protected queryBuilder: Knex.QueryBuilder<T>;
}
```

A repository method never emits an event, never applies a business rule, and never calls
another module's repository directly. Cross-table transactions spanning multiple repositories
are owned by the **service** layer, which receives a transaction manager and passes the
transaction context down into each repository call explicitly.

```
CODE REFERENCE 24-B — Service-owned transaction

async banAndLogCase(input: BanInput): Promise<Case> {
  return this.txManager.transaction(async (trx) => {
    await this.discordApi.banMember(input.guildId, input.userId);
    const caseRecord = await this.caseRepo.create(input, trx);
    await this.auditRepo.create({ ...auditFields, caseId: caseRecord.id }, trx);
    return caseRecord;
  });
  // if ANY step throws, the whole transaction rolls back — no partial case record
  // ever exists without its corresponding audit entry
}
```

### 24.4 Migrations

Every module owns its own migrations directory; the migration runner (**bootstrap Stage 06**)
executes **core migrations first, then module migrations**, each group ordered by a
**topological sort over declared module dependencies** rather than alphabetical filename
order, so a migration that references another module's table cannot run before that table
exists. Deferred foreign-key constraints are applied where a strict topological order is
impossible. Tracking uses a shared ledger table so re-running never re-applies a completed
migration.

Every migration exports both `up` and `down` — a migration without a working `down` fails
the community review's functional gate for a third-party submission, and is a code-review
blocker for a first-party one. Before promotion, Swastik must run a **disposable-database
migration dry-run**: spin up a disposable Postgres, run `up` then `down`, check idempotency,
scan for forbidden raw SQL, and verify a clean rollback. Migrations must not run live at bot
startup as the first validation of `up`/`down` correctness.

### 24.5 Standard Audit Columns

Every entity table — core-owned and module-owned alike — carries the same four columns, in
the same order, with the same semantics:

- `createdAt` — timestamptz, not null, default now.
- `updatedAt` — timestamptz, not null, default now, **bumped by application code** (never a
  database trigger — the application layer is the one place that knows *why* an update
  happened, which the audit entry for the same change depends on).
- `createdBy` — snowflake or service-identity string, nullable (null ⇒ system-generated).
- `updatedBy` — snowflake or service-identity string, nullable.

### 24.6 Read/Write Routing & Slow Query Logging

Every write goes to the **primary**, unconditionally. Reads route to a configured replica
when replica URLs are set, **unless** the calling code explicitly requests primary
consistency (a read immediately following a write in the same logical operation always
targets the primary). A max-lag setting (default 1000 ms) bounds how stale a replica may be
before the router stops sending it traffic and falls back to the primary automatically —
measured by polling the replica's own replication-lag metric, not inferred from query
latency.

The query logger wraps every query with duration tracking against two independent thresholds:
the slow threshold (default 500 ms) logs at warn with the query shape (parameterized, never
with literal bound values) and duration; the critical threshold (default 2000 ms) logs at
error and increments a dedicated counter feeding the alerting rules. Both are independent of
the general command-latency SLOs.

### 24.7 Connection Pool Tuning

The optimal pool size follows `pool_size = (average_query_duration × peak_qps) / (1 −
safety_factor)`. In practice the minimum pool size is **5** (burst traffic) and the maximum
**20** (to avoid overwhelming the database). The idle timeout defaults to **30 seconds** and
the connection timeout to **10 seconds**.

### 24.8 Query Optimization

Index `guild_id` on all guild-scoped tables, `user_id` on all user-scoped tables,
`module_name` on module state, and composite indexes for multi-column queries (for example
`guild_id + module_name` on module state). Select only needed columns, never `SELECT *`. Use
cursor-based pagination (`WHERE id > cursor ORDER BY id LIMIT pageSize`), which is efficient
regardless of page number. Batch queries with joins or an IN clause instead of N+1, and route
read queries to replicas.

### 24.9 Schema Partitioning

Large tables (`audit_logs`, `analytics_events`) are partitioned by month using PostgreSQL
native declarative partitioning, with a monthly background job creating the next month's
partition before the current month ends. Old partitions are dropped after the retention
period (365 days for audit, 90 days for analytics).

### 24.10 Transaction Management

Knex transactions with the interactive pattern: all operations inside the callback use the
transaction handle; if the callback throws, the transaction rolls back; otherwise it commits.
The timeout defaults to **5 seconds** (configurable); exceeding it rolls back and throws a
transaction-timeout error.

### 24.11 Database Monitoring

Metrics include a query-duration histogram (labelled by table and operation) and a
pool-active-connections gauge, together with pool-size, pool-idle, and per-replica lag
gauges. The pool is monitored for exhaustion: above **80%** of pool size a warning is logged;
at **100%** an error is logged and the pool size is increased.

### 24.12 How To Verify This Section Against the Code

- The Knex client and the replica router: `apps/main/src/db/client.ts`,
  `src/db/replica-router.ts`.
- The base repository and the core repositories:
  `apps/main/src/db/repositories/base.repository.ts` and siblings.
- The core migrations (44 of them):
  `apps/main/src/db/migrations/`.
- The insert-only audit table: the migration creating `audit_logs` and its trigger.

Divergences are recorded in `status/code-reconciliation.json`.

## Contract
- `contracts/config.schema.json`

## Acceptance
```acceptance
- id: ACC-DATA-0024-1
  check: "PostgreSQL is the sole system of record; multi-table writes are transactional; row locking uses SELECT..FOR UPDATE"
  test: tests/integration/db-transactions.spec.ts
- id: ACC-DATA-0024-2
  check: "Every migration is reversible (a working `down` exists) and runs core-then-module in declared order"
  test: tests/integration/migrations-reversible.spec.ts
- id: ACC-DATA-0024-3
  check: "The repository pattern is the sole DB abstraction; no raw query helpers in command/service code"
  test: tests/arch/repository-only.spec.ts
- id: ACC-DATA-0024-4
  check: "Legacy `swastik_developers`/`swastik_builds` tables are absent from the live schema"
  test: tests/arch/no-legacy-tables.spec.ts
```

## Edges (-> blueprint)
- SPEC-05-DATA -> SPEC-02-ARCHITECTURE (PostgreSQL system of record; Redis acceleration)
- SPEC-05-DATA -> SPEC-03-MODULES (each module owns its tables)

## Named entities (from the original reference)

The original reference named these entities in this section. They are preserved here so no identifier is lost in the restructure.

**classes, interfaces & symbols:** `DB-backed`, `Discord-token`, `Higher-Level`, `Indexing`, `MigrationRunner`, `Postgres-backed`, `QueryLogger`, `TransactionManager`, `maxPerDay`

**error classes:** `TransactionTimeoutError`

**events & identifiers:** `BaseRepository.`, `DatabaseService.`, `RedisLockStore.acquire`
