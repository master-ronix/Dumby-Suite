---
id: SPEC-00-GOVERNANCE-0006
title: PART 4 — MODULE SYSTEM FRAMEWORK
kind: spec
status: normative
version: 5.0.0
authority_scope: [00-governance]
contracts: []
acceptance: [ACC-GOV-0006-1]
owners: [framework-maintainers]
last_verified_commit: null
review_state: pending-evidence
---

# PART 4 — MODULE SYSTEM FRAMEWORK

*This part governs the engine that discovers, validates, loads, isolates,
communicates with, and disposes of modules. It does not govern module
authorship.*

### D-4.1 — The Manifest Is the Complete Contract

**Rule (MUST).** Every module ships a manifest validated by a strict Zod
schema (28+ fields, including name, version, tier, description, commands,
events, intents, dependencies, configSchema, and the dashboard schema
contract). The manifest is a complete table of contents for a module without
opening a second file — nothing is inferred from file layout, naming, or
convention (P1). Validation is three-time: at intake (upload), at bootstrap
Stage 11, and on every reload.

### D-4.2 — Tier Semantics and Co-Constraints

**Rule (MUST).** The tier field is required in every manifest — omission is a
hard Stage 11 failure. The four tiers behave exactly as specified:

````
Admin        — dev-guild only; registered nowhere else (a Discord-level
               deployment restriction, not a runtime check); owner-gated;
               bypasses the post-gate middleware chain; no rate limits;
               never guild-visible to non-owners.
Core         — loaded for every guild, permanently, no disable mechanism;
               passes the full middleware chain; access governed exclusively
               by the native Discord permissions the command declares —
               a Core-tier command MUST NOT carry a non-default RBAC value.
Standard     — enabled by default once installed; per-guild disableable by
               the guild ADMINISTRATOR role; a disabled module's commands disappear
               from that guild immediately and its handlers stop firing.
Marketplace  — not pre-installed; requires explicit install by a guild
               admin; once installed behaves identically to Standard.
````

The schema enforces the co-constraints at validation time: `admin` ⇒
`devGuildOnly` true; `marketplace` ⇒ `marketplaceCategory` present and valid;
non-marketplace ⇒ category absent; `core` ⇒ no command declares non-default
`permissions.rbac`; `hardcoded` ⇔ `hardcodeGuildId`/`releaseStatus` are
mutually exclusive so public-release eligibility is never ambiguous.

### D-4.3 — Per-Guild Module State: One Table, Fail Closed

**Rule (MUST).** `guild_module_states` (composite key guildId + moduleSlug)
is the single source of truth for whether a module is enabled in a guild
(P13). The dispatch path fails closed: a missing or disabled row ⇒ no
dispatch. A proactive backfill migration keeps the table current as modules
are added, and its currency is verified at Stage 06.

### D-4.4 — Isolation Enforced by Tooling, Not Convention

**Rule (MUST).** Module isolation is structural:

1. An ESLint rule turns any cross-module relative import into a build error.
2. The repository pattern makes a direct query against another module's
   table structurally awkward — and rule/lint coverage extends to the subtler
   violations (see the review checklist, D-8.8).
3. Cross-module writes through the read-only lookup path are never
   acceptable.
4. Within every module, the three-layer rule holds: commands route and
   validate; services hold business logic and emit events; repositories talk
   to the database. No repository logic in a command, no business rule in a
   repository, no event emission below the service layer.

### D-4.5 — Exactly Five Sanctioned Inter-Module Patterns

**Rule (MUST).** The complete set of legal cross-module interactions is:

````
1  Internal Event Bus      — one-to-many, fire-and-forget domain events;
                            emitters have no knowledge of subscribers;
                            names follow {domain}.{entity}.{action},
                            regex-validated at registration.
2  Published DI Token      — synchronous, typed cross-module service call via
                            manifest-declared provides/depends; the interface
                            is the only shared boundary.
3  Cross-Module Read-Only  — the ForCrossModuleRead accessor: single-row,
   Lookup                    key-only lookup declared in crossModuleReads;
                            no joins, aggregates, or filtering beyond the key;
                            writes NEVER through this path.
4  Job Scheduling via      — a subscriber enqueues jobs from emitted events,
   Event Bus                  decoupling business logic from scheduling.
5  Global Data Emit        — a module publishes a durable, schema'd public
                            dataset for cross-module consumption through a
                            read/aggregate API; the emitter owns the dataset
                            contract, consumers read it and never write
                            through it (ADR-004).
````

Any cross-module interaction not expressible as one of these five is an
architecture violation, not an unstated sixth pattern.

### D-4.6 — Soft-Dependency Degradation and Contract Versioning

**Rule (MUST).** A module declaring an optional dependency MUST degrade
gracefully when the dependency is absent — the dependent feature is disabled
with a warning, never a crash. Cross-module contracts (provided tokens,
emitted events) are semver-versioned; a consumer pins a range and is never
silently resolved onto a breaking change (see D-8.9 for the deprecation
window).

### D-4.7 — Module Lifecycle Is a State Machine

**Rule (MUST).** Modules transition through documented lifecycle states with
complete transition rules; the hooks are `onLoad(container)`, `onReady(client)`,
`onUnload()` called at the specified points in bootstrap (Stages 12/17) and
shutdown (Step 03, reverse load order). A module that fails its own hook
disables itself alone — the failure never escapes the module boundary
(P4, D-7.3).

### D-4.8 — The Event Catalog Is a Contract, Enforced

**Rule (MUST).** Every internal event a module can emit is declared in the
event catalog, and every catalog entry carries a payload schema. Three gates
back the catalog:

````
Lint/CI        — an eventBus.emit() call whose event lacks a catalog entry,
                 or whose payload fails the entry's schema, fails the build.
                 A prefix-prohibition lint rejects any event name that embeds
                 a command prefix: the event bus MUST NOT become a side door
                 to the prefix-command ban (D-1.7).
Upload review  — module upload produces a catalog-consistency report
                 (declared events and payload shapes against the catalog)
                 as part of review feedback.
Runtime        — the bus fails closed on an emit that fails membership or
                 payload validation.
````

The catalog is the documentation surface third parties subscribe against;
keeping it current is a review checklist item (D-8.8), and the drift check
SHOULD be automated there as well.

### D-4.9 — Untrusted Module Code Is Never Executed During Validation

**Rule (MUST).** The validation pipeline MUST NOT `import()` an uploaded
module to read its manifest — `import()` executes arbitrary code inside the
validation process. Manifest reading is static AST extraction; validation
runs sandboxed, so an uploaded module cannot harm the validation process.
Compiled `.js` uploads are rejected at intake: modules are uploaded as
TypeScript source and compiled by the zero-trust build pipeline before
staging.

### D-4.10 — Signed, Hash-Bound, Atomically Promoted Modules

**Rule (MUST).** Every module artifact carries a cryptographic signature
verified on every load and reload; the compiled artifact is bound to its
source hash and build identity; promotion to live uses atomic, crash-safe
symlink-pointer promotion so a crash mid-swap cannot leave a
half-deployed module set; a failed post-promotion health check triggers
automated rollback. Where the signing subsystem is not yet present,
hash-bound provenance verification against the build record is the enforced
floor — and signature verification MUST NOT be claimed as present before it
ships (D-1.6).

### D-4.11 — Module Storage: Volumes, Not Images

**Rule (MUST).** The Docker image contains only the Application Core — no
modules baked in. Module source lives on external Kubernetes volumes: a
staging volume (uploads, validation, build) and four per-tier live volumes —
admin, core, standard, marketplace — with the module's tier enforced at rest
(ADR-005). Both staging and the live volumes are `ReadWriteMany` (EFS/NFS)
for multi-replica access. Per-module PVC mounts at the modules directory make
single-module updates image-free operations. Bootstrap discovers modules by
blind scan of the tier volumes — no registry seed, no hardcoded module list
(P1). This split is also what keeps the image small and the supply chain
auditable.

### D-4.12 — Hot Reload: Two Mechanisms, Never Confused

**Rule (MUST).** In-process reload (the Swastik loader over the shared
volume) and core restart are distinct mechanisms with distinct triggers, and
the code keeps them distinct. CPU-intensive module work runs in worker
threads/processes with their own quotas — worker-thread isolation is the
pattern for anything that could contend with the gateway event loop. The
target-state direction — per-module process sandbox isolation over a narrow
RPC interface with permission scope and resource limits enforced at the
sandbox boundary — SHOULD be tracked toward, not away from.

### D-4.13 — Admin-Tier and Marketplace Governance Gates

**Rule (MUST).**

1. The Admin tier is protected by five explicit defense-in-depth layers
   (owner, dev-guild, tier, role, contextual) — not a single owner-ID check.
   Layer 4's `NODE_ENV !== 'production'` guard derives its real force from
   categorical non-production/production credential separation (D-7.5).
2. The public deploy/upload endpoint is rate-limited with anomaly detection.
3. Every per-module, per-version, per-action administrative change carries
   an audit trail with source attribution.
4. Developer registration implements a formal licensing gate with
   multi-state approval (pending → license-verified → approved/rejected) —
   a bare `approvalStatus` column is not a workflow.
5. Dev tokens are stored hash-only and issued once (D-6.4).
6. Community module submission passes the five-gate review pipeline, and
   uploads receive a dependency review report as part of review feedback.

### D-4.14 — Command-Set Governance

**Rule (MUST).**

1. Command-name collisions are detected at build/registration time and are
   fatal — a collision is a development error, never silently resolved.
2. The 100-command-per-guild ceiling is enforced; guild command changes are
   queued and batched through the guild command change queue within the
   12–13 hour window, respecting Discord's 200-per-day creation limit; the
   deregistration batch window is honored rather than expecting instant
   removal.
3. Guild-facing command collision resolution follows the documented
   five-step process.
4. The Ban Registry holds at the command layer: no text-prefix command
   surface exists anywhere, and no command path dispatches an unsolicited
   direct message (D-1.7).

---

## Acceptance
```acceptance
- id: ACC-GOV-0006-1
  check: "Module framework mandates: manifest contract, four tiers, five sanctioned cross-module patterns"
  test: tests/arch/module-mandates.spec.ts
```
