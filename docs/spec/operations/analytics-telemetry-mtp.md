---
id: SPEC-06-OPERATIONS-0031
title: 31. Analytics, Telemetry & MTP
kind: spec
status: normative
version: 5.0.0
authority_scope: [06-operations]
anchors: [ANALYTICS_TELEMETRY_MTP, ANALYTICS_VS_OBSERVABILITY_A, COLLECTION_MODEL, GUILD_FACING_USAGE_ANALYTICS, METRIC_TRACK_PROTOCOL_MTP, EVENTSCATALOG_CONSISTENCY_REPORTS_, FRAMEWORK_TELEMETRY, CONTRACT, ACCEPTANCE, EDGES_BLUEPRINT]
contracts: [contracts/errors.json]
acceptance: [ACC-OPS-0031-1]
owners: [framework-maintainers]
last_verified_commit: null
review_state: pending-evidence
---

## 31. Analytics, Telemetry & MTP

**Status:** [SPEC]

### 31.1 Analytics vs. Observability — A Deliberate Separation

Observability answers "is the system healthy right now, and why." Analytics answers "how is
this product actually being used." They are kept structurally separate — different tables,
retention policies, and consumers.

### 31.2 Collection Model

The analytics middleware (priority 90) records every command invocation's start; its after
hook records the outcome, duration, and status. Writes batch in memory and flush to PostgreSQL
on an interval — never a synchronous write on the command's critical path. Identifiers are
pseudonymised before entering the buffer: user and guild ids are replaced by HMAC-SHA-256
pseudonyms keyed by a salt that rotates monthly, each pseudonym carrying its salt epoch so
older rows remain joinable within their month. Raw ids never reach the analytics tables.

### 31.3 Guild-Facing Usage Analytics

A guild's administrators see their guild's command usage, active-module breakdown, and member
engagement trends through the MDIS surface — any module with a dashboard schema declaring a
chart component can surface its own usage data. This is strictly guild-scoped: an admin sees
only their own guild's analytics, never cross-guild comparisons or platform-wide aggregates.

### 31.4 The Metric Track Protocol (MTP)

MTP is the framework's internal, module-agnostic usage-metering standard, writing to a
per-guild-per-day metering table. It defines one common unit — an abstract **metric unit**, not
a currency or an API token — that any module can report consumption in, weighted by a
configurable formula (a command invocation, a background job execution, and a megabyte-day of
stored data each convert to metric units at their own configured rate). The result is one
column, directly comparable across every module and guild, with a breakdown column preserving
which module contributed how much of a day's total.

**Comparability caveat.** Because the conversion formula is configured per deployment, the
totals are only comparable within a single deployment. Either the default metric weights must
be standardised, or per-deployment configuration must be documented with explicit comparison
caveats. MTP is the data foundation a future monetization model would consume — mapping onto
the reserved-but-empty monetization scaffold — without the framework implementing billing,
quota, or payment today. A deployment can run MTP purely for its own operational insight,
indefinitely.

### 31.4.1 Event-Catalog Consistency Reports and Runtime Enforcement

Every emit call must correspond to a declared catalogue entry. Two enforcement layers prevent
catalogue drift. At **upload time**, the Swastik static analyzer walks the module source,
collects every emit invocation, and cross-checks against the module's declared catalogue,
returning a consistency report listing emitted-but-undeclared and declared-but-never-emitted
events. At **runtime**, a module-scoped bus wrapper intercepts each emit and validates that the
event name exists in the catalogue, that the payload matches the declared schema, and that the
name follows the `{domain}.{entity}.{action}` pattern — mismatches throw and are logged rather
than silently dropped.

### 31.5 Framework Telemetry

Distinct from both observability and guild-facing analytics, this is an opt-out,
deployment-level telemetry channel reporting fully anonymised, aggregate signals about the
framework's own usage — framework version, Node.js runtime version, and a count of loaded
modules broken down by tier. It is controlled by a single environment variable. No guild id,
user id, message content, or any guild-identifying value ever leaves a deployment through this
channel: the payload shape is fixed and auditable, so the guarantee is structural rather than
a redaction applied after the fact.

### 31.6 How To Verify This Section Against the Code

- The MTP token calculator: `apps/main/src/analytics/mtp-token-calculator.ts` — the
  `MtpTokenCalculator` class (the legacy §28.5 cost table, thresholds injected from
  `MTP_MEMORY_TOKEN_THRESHOLD_BYTES` / `MTP_BANDWIDTH_TOKEN_THRESHOLD_BYTES`), exported
  alongside `CORE_TOKENS.MtpTokens`.
- The analytics middleware: `apps/main/src/middleware/built-in/analytics.ts`.
- The metering migration:
  `apps/main/src/db/migrations/20260101000010_create_metering_usage_daily.ts`.

Divergences are recorded in `status/code-reconciliation.json`.

## Contract
- `contracts/errors.json`

## Acceptance
```acceptance
- id: ACC-OPS-0031-1
  check: "MTP usage metering records per-guild token/usage rows without leaking PII"
  test: tests/integration/mtp-metering.spec.ts
```

## Edges (-> blueprint)
- SPEC-06-OPERATIONS -> all departments (observability + errors are cross-cutting)
- SPEC-06-OPERATIONS#SECURITY -> SPEC/00-GOVERNANCE (secrets, ban registry enforcement)

## Named entities

**classes, interfaces & symbols:** `catalogConsistency`
