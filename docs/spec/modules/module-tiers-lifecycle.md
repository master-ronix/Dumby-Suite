---
id: SPEC-03-MODULES-0013
title: 13. Module Tiers & Lifecycle
kind: spec
status: normative
version: 5.0.0
authority_scope: [03-modules]
anchors: [MODULE_TIERS_LIFECYCLE, WHY_TIERS_EXIST, THE_FOUR_TIERS, TIER_AS_A_MANIFEST, PER_GUILD_MODULE_STATE, PROACTIVE_BACKFILL_MIGRATION, ADMIN_TIER_SECURITY_GATE, DESIGN_CONSIDERATION_AST_BASED, DESIGN_CONSIDERATION_SANDBOXED_MAN, DESIGN_CONSIDERATION_SOURCE_OF, DESIGN_CONSIDERATION_HASH_BOUND, DESIGN_CONSIDERATION_CRYPTOGRAPHIC]
contracts: [contracts/module-manifest.schema.json]
acceptance: [ACC-MOD-0013-1, ACC-MOD-0013-2, ACC-MOD-0013-3, ACC-MOD-0013-4]
owners: [framework-maintainers]
last_verified_commit: null
review_state: pending-evidence
---

## 13. Module Tiers & Lifecycle

**Status:** [SPEC]

### 13.1 Why Tiers Exist

Bot-owner tooling and essential configuration infrastructure should never be toggleable by
a guild admin; common features should ship pre-enabled but stay under guild control; and
integrations with third-party APIs should require explicit installation. A single flat
list of modules cannot express those distinctions without an implicit convention. Tiers
make them **explicit, mandatory, and enforced by both the manifest validator and the
runtime dispatcher**.

### 13.2 The Four Tiers

```
TABLE 13-A — Tier reference

┌──────────────┬──────────────┬───────────────┬────────────────┬────────────┬──────────────┐
│ Tier         │ Pre-installed│ Guild-visible │ Who toggles    │ Rate limits│ In catalog   │
├──────────────┼──────────────┼───────────────┼────────────────┼────────────┼──────────────┤
│ Admin        │ n/a (dev     │ never (non-   │ no one         │ bypassed   │ never        │
│              │ guild only)  │ owners)       │                │ (prio −10) │              │
│ Core         │ yes, perm.   │ always        │ no one         │ yes        │ never        │
│ Standard     │ yes, default │ until disabled│ guild ADMIN    │ yes        │ if disabled  │
│ Marketplace  │ no           │ after install │ guild ADMIN    │ yes        │ if absent    │
└──────────────┴──────────────┴───────────────┴────────────────┴────────────┴──────────────┘
```

**Admin.** Accessible only to users in the process owner list, only within the designated
dev guild. Commands bypass the full middleware chain once the owner gate grants access —
no rate limits, and no guild admin can see, enumerate, or invoke them. The dev-guild
restriction is a **Discord-level deployment restriction** (the commands are never
registered outside the dev guild), not merely a runtime check, so a production guild's
slash-command list structurally cannot include Admin entries.

**Core.** Loaded for every guild, permanently, with no disable mechanism. Commands appear
in every guild's command list unconditionally. Access is governed **exclusively by the
native Discord permissions a Core command declares** — by design, never by omission — and
a Core command MUST NOT carry an RBAC requirement (the tier rule enforces this).

**Standard.** Once installed, enabled by default for every guild, optionally disableable
by a guild admin. A disabled Standard module's commands disappear from that guild's
command list immediately and its event handlers stop firing; the module is relisted in the
catalogue as "Previously Installed," so an admin can re-enable it.

**Marketplace.** Not pre-installed; a guild admin must discover and install it explicitly
before its commands appear. Once installed it behaves identically to Standard in every
operational respect (same middleware, same permission engine, same RBAC).

### 13.3 Tier as a Manifest Field — Validation Rules

Tier is required in every manifest — omitting it is a hard validation failure at Stage 11,
before any module loads. The schema enforces:

- `tier === 'admin'` ⇒ `devGuildOnly` MUST be true.
- `tier === 'marketplace'` ⇒ `marketplaceCategory` MUST be present and valid.
- `tier !== 'marketplace'` ⇒ `marketplaceCategory` MUST be absent (its presence on a
  Standard module signals a tier mismatch and fails validation).
- `tier === 'core'` ⇒ no command may declare a non-default RBAC value (Core is
  RBAC-exempt; a Core command still carrying an RBAC requirement is caught before the
  module ships).
- `hardcoded === true` ⇒ `hardcodeGuildId` required, `visibility` MUST be `'private'`,
  `releaseStatus` MUST be `'private'`.
- `hardcoded === false` ⇒ `visibility` required, `hardcodeGuildId` forbidden (mutually
  exclusive by construction).
- `releaseStatus` ∈ {`private`, `public`}, co-constrained with the hardcoded triad via
  `superRefine` (§11.2); the browsable catalogue's listing filters admit `releaseStatus
  'public'` only.
- `visibility` ∈ {`public`, `unlisted`, `private`}, validated at all three manifest
  validation points and co-constrained with tier and the hardcoded toggle.
- `guildId` values are branded snowflake types (`GuildId`) end to end — a userId or
  channel ID passed where a guild ID is expected is a compile-time error, never a silent
  scoping bypass.
- `hardcoded === true` permanently pins the module to `hardcodeGuildId`: its commands
  register as guild-scoped commands in that guild only (§17.4), it can never be released
  publicly, and it requires `private` visibility.

> **Divergence — spec is authority, code is the gap.** The runtime `tier-rules.ts` enforces
> a subset (admin⇒devGuildOnly, marketplace⇒category, core⇒no RBAC). The
> visibility/releaseStatus triad above is the specification; it is not yet enforced in
> code (`status/code-reconciliation.json`, REC-001, REC-002, REC-019).

### 13.4 Per-Guild Module State — The `guild_module_states` Contract

Admin- and Core-tier modules need no per-guild state — their controllability is global and
static. Standard- and Marketplace-tier modules keep one row per guild per module in
`guild_module_states` (the schema and read path are in §11.8). Two properties matter here:

- **Cache invalidation uses an acknowledged transport** (Redis Streams with consumer
  acknowledgements) or version-stamped keys with a shortened TTL on safety-critical reads,
  so a dropped invalidation cannot leave a pod serving stale state.
- **Enable/disable state is never a field inside the `guild_configs` JSONB document.** It
  lives exclusively in this dedicated table, with its own cache key and its own write-path
  transaction — exactly one place to read and write it (P13).

Discovery reads a configurable root — the tier-volume root (`MODULES_DIR`, default
`/mnt/modules`), never an in-tree `src/modules/`. Discovery logic is otherwise unchanged:
it expects a subdirectory containing a manifest.

### 13.5 Proactive Backfill Migration

The read path's defaulting rule already guarantees correct behaviour for any guild/module
pair with no row, so no guild's Standard-tier features are ever gated on a backfill. The
backfill exists for **auditability**: a migration creates a complete, deployment-timestamped
set of rows for every existing guild during bootstrap Stage 06, so `installedAt` reflects a
known rollout moment. It is idempotent (`ON CONFLICT DO NOTHING`), so re-running never
overwrites an admin-modified row, and a failure is logged and alerted on but **not fatal
to Stage 06** — the deployment proceeds and unreached guilds get rows lazily.

Migrations are expand-only before a rollout and compatible with the old code; destructive
drops and constraint tightening are deferred until the new version is stable.

### 13.6 The Admin-Tier Security Gate — Mechanism and Threat Model

Admin tier's bypass of the ordinary rate-limit and permission chain makes it the single
most consequential surface to secure. The protection is a property of the tier mechanism
itself, deliberately layered.

- **Dispatch-path invariant.** Every command dispatch path — including any live or
  hot-swap router — MUST compose the canonical middleware pipeline and resolve the
  permission resolver, rather than an inline scope check followed by a direct `execute`. A
  thinner router that bypasses the chain is a security hole.
- **Layer 1 — Discord command registration scope** (structural; holds before any framework
  code runs): Admin commands are registered exclusively to the dev guild, never globally,
  and with `defaultMemberPermissions: 0n`, a platform-level lock that hides them from every
  member's UI regardless of permissions.
- **Layer 2 — the admin-tier-gate middleware (priority −10)**: verifies the invoker is in
  the owner allow-list and the interaction arrives through a valid context. Any other
  combination is a **silent reject** — no Discord reply, logged at warn with full context.
  Silence is deliberate: a distinguishable "permission denied" is an information leak.
- **Layer 3 — the owner-ids environment variable**: process-level config, not a database
  value, so it cannot be changed through any command, API call, or guild-admin action.
- **Layer 4 — an environment guard** on the most dangerous Admin capability (a pattern,
  not a shipped feature): an explicit enable flag AND a non-production environment before
  execution. It stays inert in production regardless of Layers 1–3.
- **Layer 5 — time and output bounding**: independent of whether execution is permitted,
  run under a hard timeout with truncated, narrowly-scoped output.

The defence spans three independent enforcement boundaries — the Discord platform, the
framework's middleware chain, and the deployment environment — so no single compromised
layer suffices. **Audit guarantee:** every Admin-tier invocation, granted or rejected,
writes to `audit_logs` unconditionally, before the handler runs.

**Threat analysis.** Direct privilege escalation is prevented by the gate. Indirect
escalation (a non-owner reaching Admin functionality through a Standard/Marketplace module
that depends on an Admin module) is prevented by the dependency rule that Standard and
Marketplace modules may not declare Admin-tier dependencies. Token theft is mitigated
because Admin commands are interactions, invokable only through Discord's interaction
system. Supply-chain attacks are prevented by the container's access control — a
Marketplace module cannot request Admin-tier services. The residual, credible threat is
not "an external attacker calls it" but "a legitimate owner's account is compromised in an
environment where the capability happens to be enabled" — which Layer 4 closes by design
and Layer 5 bounds.

### 13.7 The Module Lifecycle State Machine

```
DIAGRAM 13-C — The full lifecycle

bot start → Stage 11 discovery → ManifestValidator
   VALID → LOADED ; INVALID → fatal exit
Stage 12 onLoad(container)
   required:false throws → DISABLED (warning) ; required:true throws → fatal exit
Stage 17 onReady(client)
   success → ACTIVE ; throws → DISABLED (warning; even required:true is non-fatal here)
global suspend / per-guild disable → SUSPENDED (guild_module_states written)
runtime hot-swap → onUnload → unload → onLoad → onReady → ACTIVE
```

Two operational mechanisms belong with the machine:

- **Fleet-wide command kill switch.** A `disabled_commands` row with a nullable `guildId`
  (`NULL` means fleet-wide) carries a partial unique index so there is exactly one
  fleet-wide override per command. Dispatch consults the disabled set before the handler
  runs; a disabled command's interaction resolves to the formal notice frame with reason
  code `COMMAND_SUSPENDED`.
- **Two-phase module suspension.** Phase one is immediate: the framework writes Discord
  permission-overwrite rows denying `@everyone` (and each configured role) on the module's
  commands, so they vanish from members' effective access within seconds. Phase two is
  cleanup: the deregistrations are enqueued on the guild command change queue and applied
  at the queue's batch cadence, conserving the guild-command creation budget. Between the
  phases the commands are already unusable — the deny overrides are the enforcement, the
  deregistration is bookkeeping.

**Toggle vs. reload.** Toggling a module off or on is a state-table write on the order of
milliseconds — it never touches the module's loaded state, DI registrations, or event
subscriptions. Reloading re-executes the full `onUnload → onLoad → onReady` cycle. This is
the distinction the operational runbooks depend on.

**Unload performs real teardown.** Unloading flushes the module's cache namespace and
closes its per-module queue workers alongside `onUnload`'s own release work. Teardown
failures are contained per module: a cache flush or worker close that throws is logged and
the unload loop continues, so one module's stuck teardown never aborts a fleet-wide unload
or a hot-swap chain.

### 13.8 How To Verify This Section Against the Code

- The tier co-constraints: `apps/main/src/module-system/tier-rules.ts`
  (`validateTierRules`, `defaultEnabledForTier`).
- The tier enum: `apps/main/src/module-system/manifest.schema.ts`.
- The admin-tier gate: `apps/main/src/permissions/admin-tier-gate.ts`,
  `src/middleware/built-in/admin-tier-gate.ts`.
- Module storage volumes: `apps/main/src/config/env.schema.ts`.

Divergences are recorded in `status/code-reconciliation.json`.

## Contract
- `contracts/module-manifest.schema.json`

## Acceptance
```acceptance
- id: ACC-MOD-0013-1
  check: "Exactly {{counts.module_tiers}} tiers exist; per-guild enable/disable fails closed and `guild_module_states` backfill is current"
  test: tests/modules/tiers.spec.ts
- id: ACC-MOD-0013-2
  check: "Admin-tier commands are never registered outside the dev guild and pass the 5-layer gate"
  test: tests/modules/admin-gate.spec.ts
- id: ACC-MOD-0013-3
  check: "Core-tier modules load for every guild with no disable mechanism"
  test: tests/modules/core-non-disableable.spec.ts
- id: ACC-MOD-0013-4
  check: "A disabled Standard/Marketplace module's commands leave the guild list immediately and its handlers stop"
  test: tests/modules/disable-behaviour.spec.ts
```

## Edges (-> blueprint)
- SPEC-03-MODULES -> SPEC-02-ARCHITECTURE (modules load into the core DI child container)
- SPEC-03-MODULES -> SPEC/00-GOVERNANCE (tier + licence rules)
- SPEC-03-MODULES#SWASTIK -> SPEC-06-OPERATIONS (hot-swap + promotion pipeline)

## Named entities (from the original reference)

The original reference named these entities in "13. Module Tiers & Lifecycle". They are preserved here so no identifier is lost in the restructure.

**classes, interfaces & symbols:** `Engine-tunable`, `MiddlewarePipeline`, `botOwnerIds`, `commandId`
