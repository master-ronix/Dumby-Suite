---
id: SPEC-07-LIFECYCLE-0042
title: 42. Versioning, Release & Migration
kind: spec
status: normative
version: 5.0.0
authority_scope: [07-lifecycle]
anchors: [VERSIONING_RELEASE_MIGRATION, SEMANTIC_VERSIONING_FRAMEWORK_AND, BREAKING_CHANGE_MANAGEMENT_DEPRECA, CHANGESETS_AUTOMATED_CHANGELOG, DATABASE_MIGRATION_DISCIPLINE, CONTRACT, ACCEPTANCE, EDGES_BLUEPRINT]
contracts: []
acceptance: [ACC-LIFE-0042-1]
owners: [framework-maintainers]
last_verified_commit: null
review_state: pending-evidence
---

## 42. Versioning, Release & Migration

**Status:** [SPEC]

### 42.1 Semantic Versioning — Framework and Module, Independently

Two independent version numbers, never conflated: the **framework's own version** (the core
codebase — bootstrap, DI container, permission engine, everything in the core) and **each
module's own version** (its manifest's version field). A framework bump does not imply a module
bump, and vice versa.

The manifest's framework-compatibility range is checked with the same range-satisfaction
evaluator that governs module dependencies: at every module load — bootstrap, hot-swap, fresh
install — the declared range is evaluated against the running framework version, and a module
whose range the framework does not satisfy fails to load with an error naming both versions. A
major-version mismatch is never a load-time warning; only within-range minor drift may be.

### 42.2 Breaking Change Management & Deprecation Windows

P11 — deprecation over breaking change — governs any change to a module's public contract: its
provided tokens' method signatures, its emitted event payloads, or its command names.

```
DIAGRAM 42-A — The deprecation path

a breaking change is identified
  → the OLD shape is marked deprecated (a JSDoc tag at minimum; ideally a runtime warning
    logged on first use per process lifetime, not per-call)
  → BOTH old and new shapes coexist for a documented deprecation window
  → a major version bump — the version-pinning mechanism makes this enforceable, because a
    consumer pinned to the old major never resolves the breaking change until it updates
    its pin
  → the deprecated shape is removed only after the window closes
```

### 42.3 Changesets & Automated Changelog

Every PR introducing a user-facing change includes a changeset file describing the change and
its intended semver bump category, authored at PR time. The release workflow aggregates every
accumulated changeset on merge to main, computes the correct combined version bump, and
generates the changelog entry automatically.

### 42.4 Database Migration Discipline

Migration mechanics are specified in §24.4 — core migrations before module migrations, both in
declared order, every migration file exporting a working `down` as a hard requirement. The
deprecate-before-break philosophy applies to a module's *code* contract; the reversible-migration
requirement applies to its *data* contract. Every schema change ships as a versioned, reversible
migration; destructive operations go through explicit confirmation and audit logging; and there
is no "just delete the row" shortcut that bypasses the audit trail.

### 42.5 How To Verify This Section Against the Code

- The changeset config and accumulated changesets: `apps/main/.changeset/`.
- The release workflow: `apps/main/.github/workflows/release.yml`.
- The migration runner: `apps/main/scripts/migrate.ts`, `src/db/knexfile.ts`.

Divergences are recorded in `status/code-reconciliation.json`.

## Contract
None (conceptual).

## Acceptance
```acceptance
- id: ACC-LIFE-0042-1
  check: "Semver is enforced and the Compatibility Ledger gates releases/deployments"
  test: tests/ci/compatibility-ledger.spec.ts
```

## Edges (-> blueprint)
- SPEC-07-LIFECYCLE -> orchestration/ (build pipeline)
- SPEC-07-LIFECYCLE -> SPEC-06-OPERATIONS (runbooks + SLOs)

## Named entities

**classes, interfaces & symbols:** `frameworkApiVersion`

**files & artifacts:** `CHANGELOG.md`
**events & identifiers:** `reminders@1.4.0`

