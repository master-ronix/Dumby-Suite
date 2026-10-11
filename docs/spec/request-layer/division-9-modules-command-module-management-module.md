---
id: SPEC-04-REQUEST-LAYER-0012
title: DIVISION 9 — /modules COMMAND (MODULE MANAGEMENT MODULE)
kind: spec
status: normative
version: 5.0.0
authority_scope: [04-request-layer]
anchors: [DIVISION_9_MODULES_COMMAND, OVERVIEW, COMMAND_SPECIFICATION, MODULES_PAGE_LAYOUT_MODE, MODULE_LIST_CONTENT, MODULE_DETAILS_DROPDOWN, MODULE_DETAIL_INFORMATION, UNINSTALL_BUTTON, DENSITY_MODES_MODULES, TITLE_ATTRIBUTION, CONTRACT, ACCEPTANCE]
contracts: [contracts/rbac.enums.json, contracts/commands.json, contracts/ui-renderer.schema.json, contracts/events.catalog.json]
acceptance: [ACC-REQ-0012-1]
owners: [framework-maintainers]
last_verified_commit: null
review_state: pending-evidence
---

## DIVISION 9 — /modules COMMAND (MODULE MANAGEMENT MODULE)

---

### 9.1 Overview

The `/modules` command displays a list of all activated, installed, and Standard-tier modules in the current guild. It provides an interactive dropdown for viewing detailed module information and an uninstall button for removing modules.

### 9.2 Command Specification

**Command name:** `/modules`
**Module:** `modules` (Core-tier, single-command module)
**Description:** View activated/installed/standard-tier modules and manage them.
**Arguments:** None.
**Permissions:** Available to all users for viewing; uninstallation requires Discord Administrator permission.
**Response:** Buffer embed, then the modules page render in place of the navigation message.

### 9.3 Modules Page Layout — Mode D

```
┌─────────────────────────────────────────────────────────┐
│                    BANNER (YouTube thumbnail size)        │
│  [Modules banner — Dumby default]                         │
├─────────────────────────────────────────────────────────┤
│                                                           │
│  Dumby | Modules                                          │
│  -# Developed by Quixotic Mnemonics v5.0.0                │
│                                                           │
├─────────────────────────────────────────────────────────┤
│                                                           │
│  Installed & Standard-Tier Modules                        │
│                                                           │
│  ✅ dashboard    v1.0.0   Core      — Central navigation  │
│  ✅ health       v1.0.0   Core      — System health      │
│  ✅ browse       v1.0.0   Core      — Marketplace        │
│  ✅ queue        v1.0.0   Core      — BCCM queue mgmt    │
│  ✅ persona      v1.0.0   Core      — Persona listing    │
│  ✅ permit       v1.0.0   Core      — Grant management   │
│  ✅ modules      v1.0.0   Core      — Module management  │
│  ✅ hello-world  v1.0.0   Standard  — Hello world test   │
│                                                           │
├─────────────────────────────────────────────────────────┤
│                                                           │
│  -# Developed by Quixotic Mnemonics v5.0.0   [D][M][C]  │
│                                                           │
├─────────────────────────────────────────────────────────┤
│                                                           │
│  [INTERACTIVE DROPDOWN — Select Module for Details]       │
│                                                           │
│  Select an installed module to view details:               │
│  ✅ dashboard   — Central navigation hub                  │
│  ✅ health       — System health & diagnostics             │
│  ✅ hello-world  — Hello world test module                 │
│  ...                                                       │
│                                                           │
└─────────────────────────────────────────────────────────┘
```

### 9.4 Module List Content

The top section lists all activated, installed, and Standard-tier modules in the guild:

- **Logo emoji prefix:** Each module's logo emoji (from the module's assets directory) appears before the module name. If no logo is available, the default module emoji is used.
- **Module info:** Name, version, tier, and short description.
- **Core-tier modules:** Always present, never disabled. Marked with `✅`.
- **Standard-tier modules:** Present and enabled by default. Can be disabled per-guild. Marked with `✅` when enabled.
- **Installed Marketplace modules:** Present if the guild admin has installed them. Marked with `✅`.

### 9.5 Module Details Dropdown

Below the module list, an interactive dropdown (String Select Menu) allows the guild admin to select an installed module to view detailed information:

**Dropdown option format:**
```
{logo_emoji} {module_name} — {short_description}
```

When a module is selected, the message passes through the buffer state and is edited into the module's detail page:

```
┌─────────────────────────────────────────────────────────┐
│                    BANNER (YouTube thumbnail size)        │
│  [Module's own banner from assets directory]              │
├─────────────────────────────────────────────────────────┤
│                                                           │
│  Dumby | Hello World                                      │
│  -# Developed by Quixotic Mnemonics v1.0.0                │
│                                                           │
├─────────────────────────────────────────────────────────┤
│                                                           │
│  📦 hello-world                                            │
│                                                           │
│  Description: A simple hello world module for testing     │
│               the Dumby dashboard and module system.       │
│                                                           │
│  Tier:          Standard                                   │
│  Version:       1.0.0                                     │
│  Developer:     Quixotic Mnemonics (qm-dev-001)          │
│  Command Count: 1 (/hello)                                 │
│  Status:        ✅ Enabled                                  │
│  Installed:     2026-09-18 10:00 UTC                      │
│                                                           │
│  Commands:                                                 │
│  /hello — Responds with "Hello, World!"                    │
│                                                           │
│  Usage:                                                    │
│  Invoke /hello — the buffer appears instantly, then the   │
│  greeting render.                                           │
│                                                           │
│  [Uninstall]                                               │
│                                                           │
├─────────────────────────────────────────────────────────┤
│                                                           │
│  -# Developed by Quixotic Mnemonics v1.0.0   [D][M][C]  │
│                                                           │
├─────────────────────────────────────────────────────────┤
│                                                           │
│  [INTERACTIVE DROPDOWN — Navigate to other pages]         │
│                                                           │
└─────────────────────────────────────────────────────────┘
```

### 9.6 Module Detail Information

The module detail page shows:

- **Module's own banner** (YouTube thumbnail size) from the module's assets directory. If not available, a default banner is generated in the official accent colour with the module's logo emoji.
- **Module name** with logo emoji prefix.
- **Description** (from the manifest or the extended description from assets).
- **Tier** (Admin/Core/Standard/Marketplace).
- **Version** (semver from the manifest).
- **Developer** (the module's real developer, from `devId`).
- **Command count** (number of commands this module ships).
- **Status** (Enabled/Disabled/Error).
- **Installed date** (when the module was first installed/enabled in this guild, from `guild_module_states.installed_at`).
- **Command list** (all commands the module provides, with their descriptions).
- **Usage information** (how to use the module's commands).

### 9.7 Uninstall Button

The module detail page includes an **[Uninstall]** button. When clicked:

1. The invoker re-check runs; a non-invoker's click is silently rejected (§2.4). The permission check runs; a user without the Discord Administrator permission sees a `FORBIDDEN` formal notice frame.
2. The module is disabled for this guild (the `enabled` field in `guild_module_states` is set to `false`).
3. The module's commands are deregistered from Discord for this guild (they disappear from the guild's slash command list immediately via Discord command scoping).
4. The module's event subscriptions are paused (the module remains in memory but does not receive events).
5. For Standard-tier modules: the module appears in the Marketplace listing as "Previously Installed," allowing re-enablement.
6. For Marketplace modules: the module is fully uninstalled and returns to the marketplace catalog.
7. The message is edited in place to return to the modules list page, with the uninstalled module removed from the installed list.
8. **Core-tier modules cannot be uninstalled** — they are permanently loaded and the uninstall button is not rendered for them.

Idempotency protection absorbs double-clicks and network retries: a second uninstall attempt returns the already-updated module state, never an error.

### 9.8 Density Modes — Modules

- **Mode D:** Full page — banner, complete module listing, details dropdown, footer.
- **Mode M:** No banner; module list collapses to a tier-grouped count summary; details dropdown retained.
- **Mode C:** A single line — installed module count by tier — plus the footer mode control.

### 9.9 Title & Attribution

The modules list page uses:
```
Dumby | Modules
-# Developed by Quixotic Mnemonics v5.0.0
```

When viewing a specific module's detail page, the title and attribution change to the module's identity:
```
Dumby | {ModuleName}
-# Developed by {ModuleDeveloper} v{ModuleVersion}
```

---

---

### 9.10 Modules Page Rework (UR-20261011-009) — the current arrangements

> **Authority.** The operator's final authority (UR-20261011-009, 11/10/2026); supersedes the earlier
> clauses of this Division where they conflict.

- **Fallback logo vs decoration.** A module that declares no `ui.icon` shows the framework **fallback
  logo** (`module-fallback-icon.png`, `dumby_module_fallback`). The white-square asset (`dumby_module`)
  is NOT a logo fallback: it is the neutral **command decoration** beside each command on the
  dashboard's **module-specific page**.
- **Clean listing.** The listing leads with a compact header (`Installed Modules · N`) and renders
  each module as a **Section** — its logo, bold name and **title-cased tier** on the heading, its
  description as `-#` subtext. It is paginated (`MODULES_PAGE_SIZE`).
- **Inline Info.** Each module carries an **Info** control in-line after it (a Section accessory). The
  former per-module Uninstall/disable button rows and the instruction line are removed.
- **Detail card.** The Info control returns the module's detail card **privately (ephemeral)**, always.
  The card carries an **icon-only** uninstall/disable control (a bold white trash icon,
  `dumby_uninstall`, no label), **disabled** for a core-tier module (never uninstallable) and for an
  uninstalled/disabled marketplace-tier module. Selecting it disables the module for the guild and
  refreshes the card in place.
- **Navigation.** The `/modules` navigation row matches the dashboard's — an **icon-only Home** (to
  the dashboard home) plus **Next page** / **Previous page** — with a control disabled at its bound.

### 9.11 Modules Info Card & Lifecycle (UR-20261011-010) — the current arrangements

> **Authority.** The operator's final authority (UR-20261011-010, 11/10/2026); supersedes §9.5–§9.7
> and §9.10 where they conflict.

- **Info card.** The module Info control returns a **formal, banner-less** card rendered at **medium
  density (Mode M)** as a **single content block** — no per-field dividers. It carries the module
  logo and display name with its tier, the description, and the meaningful facts: **developer**
  (resolved by NAME, never the raw `devId`), **version**, **status**, and the **command inventory**.
- **Developer attribution.** Framework-shipped / first-party modules attribute to **Quixotic
  Mnemonics**; the raw `devId` is never shown as the developer.
- **No control on core.** A **core** module's Info renders **no** uninstall/disable control — core is
  permanently loaded and never uninstallable (§13.2).
- **Disable / enable.** The card's uninstall control (Standard/Marketplace) is a **state write** to
  `guild_module_states` (`enabled:false, state:'disabled'`), which short-circuits the module's
  dispatch immediately (§13.7) and **enqueues its commands on the guild command change queue (BCCM)**
  for batched Discord deregistration (§6.4/§17.7). The disabled module relists in `/browse` as
  **"Previously installed"** and is re-enabled through the `/browse` dropdown (the inverse: state
  `enabled:true` + a BCCM re-registration enqueue). Per §15.3 a toggle is a **state change**, not an
  unload — it does not tear the module down fleet-wide.
- **Navigation.** The `/modules` **Home** control returns to **`/modules` page 0** (this surface's own
  main view), not the dashboard; Next/Previous page the listing.

## Contract
- `contracts/rbac.enums.json`
- `contracts/commands.json`
- `contracts/ui-renderer.schema.json`
- `contracts/events.catalog.json`

## Acceptance
```acceptance
- id: ACC-REQ-0012-1
  check: "`/modules` lists/installs/enables modules per guild"
  test: tests/integration/modules-cmd.spec.ts
```

## Edges (-> blueprint)
- SPEC-04-REQUEST-LAYER -> SPEC-02-ARCHITECTURE (dispatch enters the core runtime)
- SPEC-04-REQUEST-LAYER#RENDERER -> documentation/ (every surface is renderer-issued)
