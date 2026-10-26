---
id: SPEC-04-REQUEST-LAYER-0010
title: DIVISION 7 — /persona COMMAND (PERSONA MODULE — TWILL)
kind: spec
status: normative
version: 5.0.0
authority_scope: [04-request-layer]
anchors: [DIVISION_7_PERSONA_COMMAND, OVERVIEW, COMMAND_SPECIFICATION, PERSONA_PAGE_LAYOUT_MODE, PERSONA_LISTING_CONTENT, PERSONA_CREATION_CONFIGURATION_TWI, DM_BEHAVIOR, DENSITY_MODES_PERSONA, TITLE_ATTRIBUTION, CONTRACT, ACCEPTANCE, EDGES_BLUEPRINT]
contracts: [contracts/rbac.enums.json, contracts/commands.json, contracts/ui-renderer.schema.json, contracts/events.catalog.json]
acceptance: [ACC-REQ-0010-1]
owners: [framework-maintainers]
last_verified_commit: null
review_state: pending-evidence
---

## DIVISION 7 — /persona COMMAND (PERSONA MODULE — TWILL)

---

### 7.1 Overview

The `/persona` command lists all activated personas with their command inventory and other information. Personas are Dumby's **Twill** capability: a bring-your-own-identity model in which a guild administrator supplies their own bot token and application, Dumby hosts the instance, and each persona is bound to exactly one server — one persona, one server. Persona creation and configuration happen exclusively through the **Twill registration API** (blueprint.md §35, §44); no Discord-facing command creates or reconfigures a persona. The `/persona` command is the read-only listing surface.

### 7.2 Command Specification

**Command name:** `/persona`
**Module:** `persona` (Core-tier, single-command module)
**Description:** View activated personas and their command inventory.
**Arguments:** None.
**Permissions:** Available to all users for viewing. Persona creation, token binding, and configuration are handled through the Twill registration API by the guild administrator who owns the application.
**Response:** Buffer embed, then the persona page render in place of the navigation message.

### 7.3 Persona Page Layout — Mode D

```
┌─────────────────────────────────────────────────────────┐
│                    BANNER (YouTube thumbnail size)        │
│  [Persona banner — Dumby default]                         │
├─────────────────────────────────────────────────────────┤
│                                                           │
│  Dumby | Persona                                          │
│  -# Developed by Quixotic Mnemonics v5.0.0                │
│                                                           │
├─────────────────────────────────────────────────────────┤
│                                                           │
│  Active Personas                                           │
│                                                           │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━               │
│                                                           │
│  Main Bot (Primary)                                       │
│  Application ID: 1234567890123456789                       │
│  Display Name: Dumby                                      │
│  Bound Server: this guild (primary deployment)            │
│  Shards: 1                                                 │
│  Bound Modules: 8 (dashboard, health, browse, queue,     │
│                      persona, permit, modules, hello)    │
│  DM Behavior: Prohibited (main bot)                       │
│  Status: ● Online                                         │
│                                                           │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━               │
│                                                           │
│  Community Bot (Twill)                                  │
│  Application ID: 9876543210987654321                       │
│  Display Name: Community Bot                              │
│  Bound Server: this guild (one persona = one server)      │
│  Shards: 1                                                 │
│  Claimed Modules: 3 (leveling, moderation, economy)      │
│  DM Behavior: decided by the Twill instance             │
│  Status: ● Online                                         │
│                                                           │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━               │
│                                                           │
│  Claimed Modules (Main Bot):                              │
│  standard: leveling  economy                             │
│  (core is shared — never listed under any profile)       │
│                                                           │
│  ℹ️ Persona creation and configuration are handled        │
│     through the Twill registration API.                 │
│                                                           │
├─────────────────────────────────────────────────────────┤
│                                                           │
│  -# Developed by Quixotic Mnemonics v5.0.0   [D][M][C]  │
│                                                           │
├─────────────────────────────────────────────────────────┤
│                                                           │
│  [INTERACTIVE DROPDOWN — Navigate to other pages]         │
│                                                           │
└─────────────────────────────────────────────────────────┘
```

### 7.4 Persona Listing Content

For each activated persona, the listing shows:

- **Persona name** (display name) and whether it is the primary bot or a Twill persona.
- **Application ID** (the Discord application ID for this persona — supplied by the guild administrator for Twill personas).
- **Bound server** (each persona is bound to exactly one server; the main bot is the primary deployment).
- **Shard allocation** (number of shards assigned to this persona).
- **Claimed modules** (the guild-scoped modules this profile holds — `guild_persona_bindings` for a
  persona, the enablement record for the main bot). Core and admin tiers are shared and are never
  listed under a profile. Ownership is specified once in §44 Module Lifecycle & Ownership.
- **DM behavior** (the main bot shows "Prohibited"; a Twill instance shows the DM behavior its instance has decided).
- **Status** (Online/Offline/Connecting — based on gateway connection state).
- **Nothing else.** The page does not list a profile's commands: a profile's command set is the
  framework's, derived from ownership at deploy time, not a property of the profile.

If no Twill personas are active (only the main bot exists), the listing shows only the main bot entry.

### 7.5 Persona Creation & Configuration — Twill Registration API

Persona creation, token binding, shard allocation, and module enablement profiles are handled exclusively through the **Twill registration API** — the administrative API surface for bring-your-own-identity hosting (blueprint.md §35; the API family is specified in §44). Under the Twill model the guild administrator supplies their own bot token and application; Dumby hosts the running instance; and the registration binds the persona to exactly one server. None of these operations are performed through `/persona` or any other Discord-facing command. The listing includes an informational note stating where persona management is handled.

The page carries an **Info control on a persona profile only** — never on the main bot's, which has no
OAuth redirect to register and nothing to invite. The card it opens carries the OAuth redirect callback
guide and nothing else: Discord publishes no API for an application's redirect list, so whether the URL
the card asks for is actually registered cannot be read, and the page must not imply otherwise.

### 7.6 DM Behavior

The main bot operates under a complete DM prohibition — it never initiates or answers direct messages. Twill instances decide their own DM behavior: each instance's configuration, set at registration, determines whether that persona accepts DMs. The persona listing displays each instance's DM behavior.

### 7.7 Density Modes — Persona

- **Mode D:** Full page — banner, every persona entry in full detail, command inventory, footer, navigation dropdown.
- **Mode M:** No banner; each persona collapses to a single line (name, bound server, status); the main bot's command inventory retained; dropdown retained.
- **Mode C:** A single line — active persona count and the main bot's status — plus the footer mode control.

### 7.8 Title & Attribution

The persona page uses:
```
Dumby | Persona
-# Developed by Quixotic Mnemonics v5.0.0
```

---

## Contract
- `contracts/rbac.enums.json`
- `contracts/commands.json`
- `contracts/ui-renderer.schema.json`
- `contracts/events.catalog.json`

## Acceptance
```acceptance
- id: ACC-REQ-0010-1
  check: "`/persona` manages Twill personas (one persona = one server)"
  test: tests/integration/persona.spec.ts
```

## Edges (-> blueprint)
- SPEC-04-REQUEST-LAYER -> SPEC-02-ARCHITECTURE (dispatch enters the core runtime)
- SPEC-04-REQUEST-LAYER#RENDERER -> documentation/ (every surface is renderer-issued)
