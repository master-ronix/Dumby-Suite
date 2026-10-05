---
id: SPEC-03-MODULES-0016
title: 16. Marketplace, MDIS & Extension System
kind: spec
status: normative
version: 5.0.0
authority_scope: [03-modules]
anchors: [MARKETPLACE_MDIS_EXTENSION_SYSTEM, PURPOSE, DISCOVERY_AND_INSTALLATION_FLOW, MARKETPLACE_CATEGORIES, COMMUNITY_MODULE_SUBMISSION_PIPELI, MODULE_DASHBOARD_INTERFACE_SYSTEM, CONTRACT, ACCEPTANCE, EDGES_BLUEPRINT]
contracts: [contracts/module-manifest.schema.json]
acceptance: [ACC-MOD-0016-1, ACC-MOD-0016-2, ACC-MOD-0016-3]
owners: [framework-maintainers]
last_verified_commit: null
review_state: pending-evidence
---

## 16. Marketplace, MDIS & Extension System

**Status:** [SPEC]

### 16.1 Purpose

The Marketplace tier provides a formal, discoverable extension layer for capabilities that
are genuinely optional, potentially resource-intensive, or dependent on third-party
services not every operator has. It distinguishes "not pre-installed because you opt in"
(Marketplace) from "not installed because something went wrong" (a failed Standard module),
and gives the framework a reviewable, categorised channel for community-authored
extensions.

### 16.2 Discovery and Installation Flow

```
DIAGRAM 16-A — The install flow

Guild admin browses the catalogue (optionally filtered by category)
  → ModuleRegistry.getCatalogForGuild(guildId) returns entries with status
    'never_installed' or 'disabled' — filtered by each module's manifest
    visibility (§11.2): 'public' entries list in the browsable catalogue,
    'unlisted' entries install only by direct reference, and 'private'
    entries never appear for any guild but the owning developer's
  → the admin selects a module → install → GuildModuleStateService.install:
       1. verify the module is loaded fleet-wide
       2. INSERT guild_module_states (status='active', installedAt=now)
       3. invalidate the Redis cache key
       4. the command deployer deploys the module's commands as per-guild
          scoped commands (seconds, not the ~1 hour of a global registration)
       5. emit guild.module.installed on the internal bus
  → the module appears in the guild's slash-command list; its event handlers
    begin firing for this guild.
```

Uninstalling reverses steps 3–5: status → `disabled`, per-guild command scoping removed,
and event dispatch stops for this guild.

`ModuleRegistry.discover` scans the configured module volumes — the four per-tier volumes
plus staging, rooted at `MODULES_DIR` — using **blind discovery** for subdirectories
containing a manifest. **No hardcoded module list exists anywhere in the core image.**

### 16.3 Marketplace Categories

```
TABLE 16-A — The closed five-value category enum

audio         Music playback, voice-channel tools, audio recording
community     Additional community-building features beyond Standard
security      Advanced threat monitoring, compliance tooling
integrations  Third-party API connections
utility       Power-user and automation tools beyond Core utility
```

The enum is closed: an unknown category fails validation rather than creating a sixth
group.

### 16.4 The Five-Gate Community Submission Pipeline

A third-party submission clears **five gates** before it appears in the catalogue for any
guild.

```
DIAGRAM 16-B — The five-gate review pipeline

GATE 1 — Static analysis
  tsc --noEmit + ESLint: cross-module import enforcement, no require, no direct
  process.env access outside the module's own config schema, no EmbedBuilder /
  MessageEmbed imports (the embed ban). Zero errors required.

GATE 2 — Manifest validation
  all required fields present; tier === 'marketplace'; marketplaceCategory is one
  of the five valid values.

GATE 3 — Security review (manual)
  what intents are requested and why; whether any dashboardSchema exposes
  sensitive configuration; whether jobs are idempotent; whether cross-module data
  access is limited to reads.

GATE 4 — Functional review
  commands follow the depth standard (every option documented, every error
  condition handled); every migration has up AND down; the test suite covers the
  critical paths.

GATE 5 — Signing and listing
  an approved module is cryptographically signed; the registry refuses to load an
  unsigned module from the extension directory at Stage 09 (a module maintained as
  part of a deployment's own trusted codebase is exempt). Once signed, the listing
  is written to the catalogue.
```

A module failing any gate is returned to the author with specific remediation notes —
never silently rejected. **Version updates are not exempt from re-review:** every new
version re-runs Gates 1–4 in full, because trust is re-established per version, not
inherited indefinitely from first approval. An update whose diff touches requested intents,
`dashboardSchema` fields, or declared `crossModuleReads` is flagged for the full manual
security review rather than the lighter automated-gates-only path a patch-level dependency
bump can take.

**Listing writes and the visibility path.** The catalogue's developer identifier is the
`devId` string itself — the same identifier the Credentials Service issues and the
developers table keys on — written to the listing row with no separate developer-id
namespace to drift against it. Visibility changes flow through a
`PATCH /swastik/modules/:slug/visibility` endpoint that validates the new
`releaseStatus`/`visibility` pair against the manifest triad (§11.2) and writes the
corresponding listing rows in the same transaction — so the catalogue and the manifest never
disagree about a module's publicness.

**Revocation.** A module found unsafe after listing is revoked by **unsigning** it: the
registry's signature check runs not only at initial load but on every hot-reload and
fresh-install attempt, so revoking a signature takes effect the moment a guild's instance
next reloads or reinstalls — without a framework redeploy. Revocation is a Power Engine
Panel action rather than a Marketplace-specific mechanism, which gives it the mandatory
reasoned audit trail every such action carries. A revoked module already running is not
silently killed mid-operation by default: revocation immediately removes it from new-install
browsing and alerts every guild currently running it. A critical-severity revocation does
force-disable on next event dispatch; a lower-severity one only alerts, and escalating it
further is a separate, deliberate call.

**Detection honesty.** The automated gates' performance — what they catch and what they
miss — is tracked as **measured detection rates in CI against a growing corpus of
known-bad samples**. Every effectiveness claim is stated in that measured form, and the
corpus grows with every confirmed finding. This is the standing rule that detection honesty
applies everywhere: no absolute claims, only measured rates.

### 16.5 The Module Dashboard Interface System (MDIS)

MDIS is the schema-driven web configuration interface for module settings, extending the
REST reference with module-specific endpoints and rendering configuration panels through a
declarative schema any module can provide in its manifest's `dashboardSchema` field.

**Schema-driven rendering.** MDIS's renderer is a generic engine that reads a module's
`dashboardSchema` and generates the corresponding web UI — **no per-module frontend code
exists; the schema is the UI.** This is the same declaration principle as the interaction
surface: authors declare schemas, and the core Renderer derives presentation. One authoring
model, two rendering targets.

```
TABLE 16-B — Supported schema components

toggle          boolean field
select          enum field with named options
text-input      string field, optional regex validation
number-input    integer/float field, min/max bounds
channel-picker / role-picker / user-picker
list            repeating values
data-table      read-only tabular display
chart           time-series visualisation of module metrics
```

**Auto-exposed REST endpoints.** Every module with a `dashboardSchema` automatically gets
`GET /api/modules/:name/config`, `PUT /api/modules/:name/config`, and
`POST /api/modules/:name/:action`. Enable/disable state is exposed through a **separate**
endpoint mapping to the guild module state, never the config endpoint:
`PATCH /api/modules/:name/state`, gated by the guild's own administrator role.

```
TABLE 16-C — Tier visibility on the dashboard

Admin        never visible in any guild dashboard
Core         visible and configurable; no toggle control (cannot be disabled)
Standard     visible; toggle shown; config panel if dashboardSchema present
Marketplace  visible when installed; uninstall button; config panel if present
```

**Graceful fallback.** Any enabled module without a `dashboardSchema` appears with a "Web
Panel Not Available" placeholder naming the module and its tier — never a blank entry or an
error state.

**Multi-guild synchronisation.** A single dashboard session can manage every guild the
authenticated user administers, but every read and write is bound to **exactly one guild at
a time**, carried explicitly as a guild id, never inferred from session state. Switching the
active guild is a purely client-side selection of which guild the next request targets; it
triggers no server-side session change and touches no other guild's configuration. Because
no two guilds share a cache key, a config row, or a module-state row, every guild a
multi-guild session reaches maintains its own independently synchronised settings.

**Instant MDIS ↔ backend sync.** Synchronisation uses per-guild Redis pub/sub change events
rather than polling: every configuration write, module-state change, or governance action
the backend commits publishes a change event on the guild's channel, and every connected
client — and every pod's L1 cache — subscribes to the guild channels it serves. The sync is
bidirectional: a dashboard write commits through the backend's validated write path and its
resulting change event updates every other open dashboard viewing the same guild, so two
admins editing the same panel always see each other's committed changes without a refresh.
Change events carry the guild id, the changed key, and a **monotonic version stamp — never
the value itself** — and subscribers re-read through the normal validated read path, so a
dropped event degrades to the underlying read, never to stale certainty.

**Permission enforcement.** Dashboard API calls authenticate via a Discord OAuth2 token; the
caller's RBAC role resolves from the same source and resolution logic the in-bot permission
engine uses. A user without the guild administrator role receives 403 on state-modifying
endpoints; read-only endpoints require at least the moderator rank. Admin-tier module
configurations are never exposed, regardless of caller role.

**Accessibility is a renderer property, not a per-module obligation.** The generic renderer
targets WCAG 2.1 Level AA as a hard requirement, because every module author's panel
inherits whatever the renderer does — an accessibility defect there is every module's
problem simultaneously. Every schema component renders with a programmatically associated
label; the panel is keyboard-operable with a visible focus indicator and no keyboard trap;
colour is never the sole signal for a validation error or toggle state; and tables and
charts ship with an accessible name and a text-equivalent summary. This is verified once, in
the renderer's own test suite, rather than by each module author.

### 16.6 How To Verify This Section Against the Code

- The marketplace listing table and its visibility column:
  `apps/main/src/db/migrations/20260101000007_create_marketplace_listings.ts`.
- The module registry and catalogue read path:
  `apps/main/src/module-system/registry.ts`.
- The install path and per-guild command deployment:
  `apps/main/src/commands/command-deployer.ts`, `src/module-system/registry.ts`.
- The module-state table: `apps/main/src/db/migrations/20260101000006_create_guild_module_states.ts`.

Where this section and the tree disagree, the disagreement is recorded in
`status/code-reconciliation.json`.

## Contract
- `contracts/module-manifest.schema.json`

## Acceptance
```acceptance
- id: ACC-MOD-0016-1
  check: "Install flow: verify loaded fleet-wide -> INSERT guild_module_states(active) -> invalidate Redis -> deploy per-guild commands"
  test: tests/integration/install-flow.spec.ts
- id: ACC-MOD-0016-2
  check: "Manifest `visibility` (public/unlisted/private) governs catalog listing exactly"
  test: tests/modules/visibility.spec.ts
- id: ACC-MOD-0016-3
  check: "Community submissions pass the five-gate review pipeline before publication"
  test: tests/modules/review-pipeline.spec.ts
```

## Edges (-> blueprint)
- SPEC-03-MODULES -> SPEC-02-ARCHITECTURE (modules load into the core DI child container)
- SPEC-03-MODULES -> SPEC/00-GOVERNANCE (tier + licence rules)
- SPEC-03-MODULES#SWASTIK -> SPEC-06-OPERATIONS (hot-swap + promotion pipeline)

## Named entities

**classes, interfaces & symbols:** `MDIS-connected`, `developerId`, `marketplace_listings.devId`
