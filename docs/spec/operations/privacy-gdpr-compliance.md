---
id: SPEC-06-OPERATIONS-0034
title: 34. Privacy & GDPR Compliance
kind: spec
status: normative
version: 5.0.0
authority_scope: [06-operations]
anchors: [PRIVACY_GDPR_COMPLIANCE, DATA_MINIMIZATION, RIGHT_TO_ERASURE, DATA_RETENTION_POLICIES, ANONYMIZATION_IN_ANALYTICS_TELEMET, CROSS_BORDER_DATA_TRANSFER, CHILDREN_S_PRIVACY, CONTRACT, ACCEPTANCE, EDGES_BLUEPRINT]
contracts: [contracts/errors.json]
acceptance: [ACC-OPS-0034-1]
owners: [framework-maintainers]
last_verified_commit: null
review_state: pending-evidence
---

## 34. Privacy & GDPR Compliance

**Status:** [SPEC]

### 34.1 Data Minimisation

The Global Data Emit pattern (§14) allows a published public dataset to carry only the data its
declared schema publishes; the schema is reviewed at the security gate for personal-data
content, and a dataset emitting personal data without an explicit documented purpose is a
rejected submission. A module's manifest declares exactly the Discord intents it requires, and
the framework requests only the union of what loaded modules declare — never a broad
precautionary set. The same discipline governs stored data: a module stores what its feature
needs and nothing more.

### 34.2 Right to Erasure

A dedicated erasure workflow reaches every module: the base repository exposes a standard
per-user and per-guild purge hook, and **every module is required to implement** these against
its own tables. A central erasure coordinator invokes every registered module's hook and
records the outcome in the audit log.

**Hook coverage verification.** A module can add a user-data table without implementing the
purge hook, in which case the coordinator calls a no-op and the data remains. A
manifest/CI check therefore requires the purge hook for any module declaring user-data tables,
and the hook must be non-empty and tested. The coordinator is deliberately conservative: if any
module's hook fails or times out, erasure completes with "partial success" and no automatic
retry — the gap stays visible in the audit log. The target state adds retry, a dead-letter
queue, and post-erasure verification.

### 34.3 Data Retention Policies

The per-guild-per-module state row carries a data-retention policy governing what happens to a
module's guild-scoped data when that module is disabled or uninstalled: `retain` keeps the data
intact (for possible re-enabling), while `purge_after_30d` schedules a cron task to erase it if
the module remains disabled past that window. The choice is per-guild and per-module.

### 34.4 Anonymisation in Analytics & Telemetry

Guild-facing analytics are guild-scoped by construction. Framework telemetry goes further: no
guild-identifying, user-identifying, or content value is included in its fixed payload schema —
by design, the schema itself has no field capable of carrying that data, which is a stronger
guarantee than redaction after the fact.

### 34.5 Cross-Border Data Transfer

Because PostgreSQL and Redis are the sole locations any persistent state lives (§26.1), data
residency is a function of where those two stores are provisioned. The infrastructure reference
treats database and cache region as an explicit top-level configuration input.

### 34.6 Children's Privacy

Discord's platform terms restrict use to users meeting its minimum age; this architecture
neither collects age-verification data nor implements child-specific handling beyond the
minimisation, erasure, retention, and anonymisation rules above, which apply uniformly. A
deployment with additional child-specific regulatory obligations is responsible for those
controls — this uniform posture is a floor, not a substitute for jurisdiction-specific legal
review.

### 34.7 How To Verify This Section Against the Code

- The erasure coordinator: `apps/main/src/shared/erasure-coordinator.ts`.
- The per-module retention policy: the `guild_module_states` migration and the module state
  service.
- The telemetry flag: `apps/main/src/config/env.schema.ts` (`TELEMETRY_ENABLED`).

Divergences are recorded in `status/code-reconciliation.json`.

## Contract
- `contracts/errors.json`

## Acceptance
```acceptance
- id: ACC-OPS-0034-1
  check: "Data export and erasure are implemented; the audit log is insert-only and tamper-evident"
  test: tests/integration/gdpr.spec.ts
```

## Edges (-> blueprint)
- SPEC-06-OPERATIONS -> all departments (observability + errors are cross-cutting)
- SPEC-06-OPERATIONS#SECURITY -> SPEC/00-GOVERNANCE (secrets, ban registry enforcement)

## Named entities (from the original reference)

The original reference named these entities in "34. Privacy & GDPR Compliance". They are preserved here so no identifier is lost in the restructure.

**classes, interfaces & symbols:** `purgeByGuildId`, `purgeByUserId`, `guild_module_states.dataRetentionPolicy`
