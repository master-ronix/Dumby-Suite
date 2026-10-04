---
id: SPEC-03-MODULES-0014
title: 14. Inter-Module Communication
kind: spec
status: normative
version: 5.0.0
authority_scope: [03-modules]
anchors: [INTER_MODULE_COMMUNICATION, THE_FIVE_SANCTIONED_PATTERNS, SOFT_DEPENDENCY_DEGRADATION_CONTRA, CROSS_MODULE_CONTRACT_VERSIONING, DESIGN_CONSIDERATION_CONTRACT_COMP, THE_COMPATIBILITY_LEDGER, CONTRACT, ACCEPTANCE, EDGES_BLUEPRINT]
contracts: [contracts/module-manifest.schema.json]
acceptance: [ACC-MOD-0014-1, ACC-MOD-0014-2, ACC-MOD-0014-3, ACC-MOD-0014-4]
owners: [framework-maintainers]
last_verified_commit: null
review_state: pending-evidence
---

## 14. Inter-Module Communication

**Status:** [SPEC]

### 14.1 The Five Sanctioned Patterns

Cross-module interaction is not free-form. It happens through exactly five sanctioned
patterns, and this list is **exhaustive**: any interaction not expressible as one of them
is an architecture violation. The fifth pattern's admission is recorded as ADR-004, which
amends the earlier four-pattern enumeration explicitly rather than leaving the older claim
standing.

```
DIAGRAM 14-A — The complete set of legal cross-module interactions

PATTERN 1 — Internal Event Bus (one-to-many, fire-and-forget)
  A module emits a named domain event; any number of subscribers from any
  module react independently. The emitter has no knowledge of — and no
  dependency on — any subscriber. The primary channel for side effects:
  logging reacting to moderation events, analytics recording economy
  transactions, anti-raid tightening thresholds after a spike. Event names
  follow {domain}.{entity}.{action}, enforced by regex at registration.

PATTERN 2 — Published DI Token (synchronous cross-module call)
  Module A declares a service in its manifest's provides array; Module B
  declares the same token in its depends array. B receives the service via
  its own DI container at load time, typed against the published contract
  interface. Neither module imports the other's source files — the
  interface is the only shared boundary.

PATTERN 3 — Cross-Module Read-Only Lookup (ForCrossModuleRead accessor)
  For cheap, synchronous read access to another module's data without a
  full service call. Declared in the manifest's crossModuleReads array,
  implemented as a repository method carrying the ForCrossModuleRead
  suffix, and lint-constrained to a single-row lookup by primary key or a
  uniquely-indexed foreign key only — no joins, no aggregates, no filtering
  beyond the key. Writes are NEVER acceptable through this pattern; a
  cross-module write goes through Pattern 1 or Pattern 2.

PATTERN 4 — Job Scheduling via Event Bus
  A service emits an event (e.g. "mute scheduled"); a dedicated subscriber
  enqueues the corresponding job. This decouples the business logic
  (issuing the mute) from the infrastructure concern (scheduling a future
  state change) — the scheduling logic can change, be replaced, or be
  disabled without touching the originating module.

PATTERN 5 — Global Data Emit (durable, schema'd public datasets)
  A module publishes a named public dataset through a declared emit
  surface; the dataset's schema is declared in the manifest (validated at
  Stage 11), the owning module writes updates through its own repository,
  and every other module reads through the read/aggregate API the framework
  exposes — never direct table access. The dataset is durable, versioned
  with the module's semver, and readable by any module that declares a
  dependency on the emitting module's dataset token. For genuinely shared
  reference data — leaderboards, catalogues, public counters.
```

### 14.2 Choosing the Right Pattern

```
TABLE 14-A — The decision table

┌──────────────────────────────────────────────────────┬───────────┐
│ You want to …                                         │ Use       │
├──────────────────────────────────────────────────────┼───────────┤
│ react to something, no response needed                │ Pattern 1 │
│ call another module's business logic, get a result    │ Pattern 2 │
│ read one row cheaply and synchronously                │ Pattern 3 │
│ turn a business event into deferred/background work   │ Pattern 4 │
│ publish reference data others can read/aggregate      │ Pattern 5 │
└──────────────────────────────────────────────────────┴───────────┘
```

### 14.3 The Soft-Dependency Degradation Contract

When module B declares a **soft** dependency on module A's service — using it
opportunistically, not as a hard `depends` entry — and A is disabled in a guild, the DI
container still resolves A's service object normally (services are registered globally);
only A's guild-scoped **data** is unavailable. Calls into the service for that guild return
a `ModuleDisabledResult` sentinel rather than throwing, and B's code checks for it
explicitly.

```ts
// CODE REFERENCE 14-A — graceful degradation
const rank = await levelingService.getRank(guildId, userId);
if (rank instanceof ModuleDisabledResult) {
  return true;            // leveling is disabled here — skip the requirement
}
if (rank.level < minLevelRequired) return false;
```

This is deliberate. B must make its own decision about what "the dependency is disabled"
means for its behaviour, document it in B's own code, and exercise it in B's own tests —
no framework mechanism can make that decision on the author's behalf.

### 14.4 Cross-Module Contract Versioning

When module A's `provides` token changes shape — a method removed, a parameter changed —
that is a breaking change in A's own semver. The manifest's `version` field is exactly what
B's `depends` array pins against, and the registry validates version satisfaction at
Stage 11: an incompatible version dependency is a **fatal startup error**, never a silent
runtime mismatch.

Beyond semver, Swastik must resolve the full dependency graph during static analysis and
perform **type-level compatibility checks** of the `provides`/`depends` contracts — method
signatures, event payloads, config schemas — forcing a version bump on any breaking change.
Semver rules plus developer discipline are not a substitute for contract-level
verification: a `^1.0.0` pin that resolves a 2.0.0 with a changed signature is not actually
compatible.

```
FAILURE-MODE COMPARISON — why pinning matters

Without pinning: A ships v2.0.0 removing a method B calls. B still compiles against the
old interface type. At runtime the call throws — discovered by a user hitting the bug.

With pinning: B declares depends: [{ token: A_TOKEN, version: '^1.0.0' }]. A ships
v2.0.0. Stage 11 validates the pin against the loaded version, finds it unsatisfied, and
refuses to start — discovered by whoever deployed the change, before any user is affected.
```

The target state verifies compatibility from the emitted `.d.ts` artifacts using the
TypeScript type checker, not semver ranges alone, so an incompatible patch bump is a
build-time failure.

### 14.5 The Compatibility Ledger

Every cross-boundary contract — module-to-framework, module-to-module (`provides`/`depends`
tokens and their contract shapes), surface-to-core (REST families, MDIS schemas, webhook
payload versions), and the manifest schema itself — is registered in the **Compatibility
Ledger**: a machine-readable registry recording, for each contract, its version and the
exact window of versions each counterpart accepts (minimum inclusive, maximum exclusive,
and any excluded known-bad versions).

The ledger is a **gate, not documentation**. A core release cannot ship until every
registered contract window held by currently-deployed modules is satisfied by the new
core's contract versions; a module deployment cannot be promoted until its declared
contract windows are satisfied by the running core and by every co-deployed dependency.
Both checks are mechanical queries against the ledger, run at release time and at
promotion time, and both **fail closed** — an unregistered contract is treated as
unsatisfied, not exempt. The compliance matrix is generated from the ledger, so it can
never drift from the registry that gates releases.

### 14.6 How To Verify This Section Against the Code

- The cross-module accessor shape and its `ForCrossModuleRead` suffix rule:
  `apps/main/src/module-system/manifest.schema.ts` (`crossModuleReadSchema`).
- The event-name pattern (`{domain}.{entity}.{action}`):
  `apps/main/src/events/event-bus.ts` (`EVENT_NAME_PATTERN`).
- The `ModuleDisabledResult` sentinel: `apps/main/src/errors/taxonomy.ts`.
- The release gate that consumes the ledger: `tools/release_manager/release-gate.ts`.

Where this section and the tree disagree, the disagreement is recorded in
`status/code-reconciliation.json`.

## Contract
- `contracts/module-manifest.schema.json`

## Acceptance
```acceptance
- id: ACC-MOD-0014-1
  check: "Cross-module interaction uses only the five sanctioned patterns; any other path fails lint"
  test: tests/arch/five-patterns.spec.ts
- id: ACC-MOD-0014-2
  check: "Event names match `{domain}.{entity}.{action}` (regex-enforced at registration)"
  test: tests/unit/event-name-format.spec.ts
- id: ACC-MOD-0014-3
  check: "Pattern 3 reads are single-row by PK/unique FK only; cross-module writes never use it"
  test: tests/arch/cross-module-read.spec.ts
- id: ACC-MOD-0014-4
  check: "Pattern 5 datasets declare their schema in the manifest and are validated at Stage 11"
  test: tests/modules/global-data-emit.spec.ts
```

## Edges (-> blueprint)
- SPEC-03-MODULES -> SPEC-02-ARCHITECTURE (modules load into the core DI child container)
- SPEC-03-MODULES -> SPEC/00-GOVERNANCE (tier + licence rules)
- SPEC-03-MODULES#SWASTIK -> SPEC-06-OPERATIONS (hot-swap + promotion pipeline)
