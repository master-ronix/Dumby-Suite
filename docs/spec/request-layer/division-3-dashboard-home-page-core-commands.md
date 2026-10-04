---
id: SPEC-04-REQUEST-LAYER-0006
title: DIVISION 3 — DASHBOARD HOME PAGE (CORE COMMANDS)
kind: spec
status: normative
version: 5.0.0
authority_scope: [04-request-layer]
anchors: [DIVISION_3_DASHBOARD_HOME, OVERVIEW, THE_DASHBOARD_COMMAND, DASHBOARD_HOME_RENDER_FRAME, BANNER_SPECIFICATION, TITLE_ATTRIBUTION, CORE_COMMAND_LIST, INTERACTIVE_DROPDOWN_NAVIGATION, DENSITY_MODES_DASHBOARD, EDIT_IN_PLACE_BEHAVIOUR, DEFAULT_VALUES_THE_ASSETS, CONTRACT]
contracts: [contracts/rbac.enums.json, contracts/commands.json, contracts/ui-renderer.schema.json, contracts/events.catalog.json]
acceptance: [ACC-REQ-0006-1]
owners: [framework-maintainers]
last_verified_commit: null
review_state: pending-evidence
---

## DIVISION 3 — DASHBOARD HOME PAGE (CORE COMMANDS)

---

### 3.1 Overview

The `/dashboard` command is the single entry point to the entire Dumby user-facing interface. When invoked, the Renderer sends the buffer embed (§2.1) as the initial message and edits it into the dashboard home render — a single Components V2 frame that serves as the home page of the bot. All subsequent navigation — to module pages, to command-specific interfaces, back to the dashboard — happens by editing this same message in place (§2.2). Every "send a page" instruction in this document means "edit the existing navigation message into that page's render, buffer first."

### 3.2 The /dashboard Command

**Command name:** `/dashboard`
**Module:** `dashboard` (Core-tier, single-command module)
**Description:** Opens the Dumby dashboard — the central navigation hub for all core commands and module pages.
**Permissions:** Governed by native Discord permissions (Core-tier skips RBAC Layer 6). The command is available to all users who can see it in the guild's slash command list. Sensitive sub-navigation (e.g., `/permit`) may require the Discord Administrator permission bit.
**Cooldown:** None (Core-tier commands pass through the full middleware chain but are not subject to Dumby RBAC).
**Response:** Buffer embed, then the dashboard home render — Components V2 (Container type 17, `IS_COMPONENTS_V2` flag 32768). The response is a non-ephemeral message that persists in the channel and is edited in place for all subsequent navigation.

### 3.3 Dashboard Home Render — Frame Layout (Mode D)

```
┌─────────────────────────────────────────────────────────┐
│                    BANNER (YouTube thumbnail size)        │
│                                                           │
│  [Dumby banner image — sourced from the framework's      │
│   own assets directory. If no banner is available, the   │
│   Renderer generates a default banner in the official    │
│   accent colour (#5865F2).]                              │
│                                                           │
├─────────────────────────────────────────────────────────┤
│                                                           │
│  Dumby | Dashboard                                        │
│  -# Developed by Quixotic Mnemonics v5.0.0                │
│                                                           │
├─────────────────────────────────────────────────────────┤
│                                                           │
│  Core Commands                                            │
│                                                           │
│  /health   — System health, ping & latency               │
│  /browse   — Browse the module marketplace               │
│  /queue    — Manage BCCM command queue actions           │
│  /persona  — View active personas & command inventory    │
│  /permit   — Manage guild-side grants, lists & limits    │
│  /modules  — View, manage & uninstall installed modules  │
│                                                           │
├─────────────────────────────────────────────────────────┤
│                                                           │
│  -# Developed by Quixotic Mnemonics v5.0.0   [D][M][C]  │
│                                                           │
├─────────────────────────────────────────────────────────┤
│                                                           │
│  [INTERACTIVE DROPDOWN — String Select Menu]              │
│                                                           │
│  Navigate to:                                             │
│   🏠 Dashboard (Home)                                     │
│   ✅ [installed] Module Name — short description          │
│   🛒 [marketplace] Module Name — short description        │
│   ...                                                     │
│                                                           │
└─────────────────────────────────────────────────────────┘
```

### 3.4 Banner Specification

**Size:** YouTube thumbnail dimensions (1280×720 pixels, 16:9 aspect ratio).
**Source:** The framework's own assets directory. The manifest declares the path to the assets directory where the banner, logo, and description are stored.
**Fallback:** If no banner is available in the assets directory, the Renderer generates a default banner: the official accent colour (`#5865F2`) as a gradient background with the Dumby logo and name centred.
**For module pages:** Every module page's banner comes from the module's manifest-declared assets directory. If no banner is available, the Renderer generates one in the official accent colour with the module's logo emoji and name centred. The accent is the framework's; module identity is carried by the logo and name.

### 3.5 Title & Attribution

The dashboard home page carries the A4 grammar (§1.5):

```
Dumby | Dashboard
-# Developed by Quixotic Mnemonics v5.0.0
```

Module pages replace the surface name and the attribution with the module's identity: `Dumby | Leveling` with `-# Developed by {ModuleDeveloper} v{ModuleVersion}`. The navigation dropdown is the only component present on every page in every mode; the identity band and footer change to match the current surface.

### 3.6 Core Command List

The dashboard home page displays a direct list of the Core Command Surface's Core-tier commands (§0.4). Each is a separate individual Core-tier module with a single command:

| Command | Module | Purpose |
|---|---|---|
| `/health` | `health` (Core-tier) | Ping latency and full system health information |
| `/browse` | `browse` (Core-tier) | Browse the marketplace, install/uninstall modules |
| `/queue` | `queue` (Core-tier) | Manage BCCM command queue actions (renames, aliases, disables) |
| `/persona` | `persona` (Core-tier) | List activated personas with command inventory |
| `/permit` | `permit` (Core-tier) | Manage Layer 7 guild-side grants, lists, cooldowns, rate limits |
| `/modules` | `modules` (Core-tier) | View activated/installed/standard-tier modules, uninstall |

The list is rendered as a formatted text section within the content slot, between the identity band and the footer. `/hello` (hello-world, Standard-tier) is not part of the Core command list; it appears in the navigation dropdown under installed modules (§3.7).

### 3.7 Interactive Dropdown Navigation

Every page — the dashboard home and every module page — contains an interactive selection dropdown menu (Discord String Select Menu component) for accessing different pages, in Modes D and M. The dropdown is the primary navigation mechanism.

**Dropdown contents:**

1. **Dashboard (Home)** — always present, always the first option.
2. **Installed modules** — each installed/active module in the current guild, prefixed with an emoji marking it as installed.
3. **Marketplace modules** — each available-but-uninstalled module, prefixed with a different emoji marking it as marketplace.

**Emoji prefix convention:**

- Installed module prefix: `✅` (or equivalent checkmark-style emoji) — the module is currently installed and active in this guild.
- Marketplace module prefix: `🛒` (or equivalent cart-style emoji) — the module is available in the marketplace but not yet installed.

These emoji are used ONLY in the dropdown option descriptions for marking installed vs. marketplace status. They are not used anywhere else in the frame.

**Dropdown option format:**
```
{emoji} {ModuleName} — {short description}
```

Example dropdown options:
```
🏠 Dashboard (Home)
✅ Leveling — XP tracking and rank cards
✅ Moderation — Ban, kick, mute, and warn
🛒 Music — Voice channel music playback
🛒 Starboard — Pin star-reacted messages
```

**Interaction behaviour:**

When a user selects an option, the invoker re-check runs (§2.4), the message enters the buffer state, and the same message is edited into the selected page's render. The banner, title, attribution, and content slots all update to reflect the selected module. The dropdown itself remains at the bottom of the frame, updated to reflect the current page and available navigation targets. When the user is on a specific module's page, that module's entry is marked as the dropdown's default value.

### 3.8 Density Modes — Dashboard

- **Mode D:** The full home page — banner, core command list with one line per command, footer, and the full navigation dropdown.
- **Mode M:** No banner; the core command list collapses to a compact two-column summary (command — purpose, single line each); dropdown retained.
- **Mode C:** A single identity line, a one-line summary of the guild's module state (e.g., "8 modules available · 2 in marketplace"), and the footer mode control. No dropdown; switching back to D or M restores it.

### 3.9 Edit-in-Place Behaviour

Every interaction that changes what the user sees edits the existing navigation message, buffer first (§2.1, §2.2):

1. User invokes `/dashboard` → buffer, then the dashboard home render, as a new message.
2. User selects a module from the dropdown → the same message is edited to show that module's page.
3. User selects "Dashboard (Home)" → the same message is edited back to the home page.
4. User invokes `/health` (or any other core command) → the existing navigation message from the same user is edited to show the health page; if none exists, a new one is sent.

This applies to all frames in this document. No command or component sends a new message after the initial navigation message exists.

### 3.10 Default Values & the Assets Directory

When a module does not provide assets (banner, logo, description) through its manifest's assets directory path:

- **Default banner:** the Renderer generates a banner in the official accent colour (`#5865F2`) as a gradient background with the module's logo emoji and name centred.
- **Default logo emoji:** a generic module emoji (`📦`).
- **Default description:** the module's manifest `description` field (1–120 characters, required in the manifest).

The manifest declares the path to the module's assets directory. The assets directory contains:

| Asset | Purpose |
|---|---|
| `banner.png` (or `.jpg`) | YouTube thumbnail-size banner image (1280×720) |
| `logo.png` (or `.jpg`) | Module logo image, used to generate the emoji-format logo |
| `description.md` | Extended description text (if different from the manifest description) |

If any asset is missing, the default value for that asset is used. The manifest does not inline asset data — it contains the path to the assets directory, and the framework reads individual files from that directory at load time.

---

---

## Contract
- `contracts/rbac.enums.json`
- `contracts/commands.json`
- `contracts/ui-renderer.schema.json`
- `contracts/events.catalog.json`

## Acceptance
```acceptance
- id: ACC-REQ-0006-1
  check: "`/dashboard` renders the documented frame in Mode D with edit-in-place navigation"
  test: tests/integration/dashboard.spec.ts
```

## Edges (-> blueprint)
- SPEC-04-REQUEST-LAYER -> SPEC-02-ARCHITECTURE (dispatch enters the core runtime)
- SPEC-04-REQUEST-LAYER#RENDERER -> documentation/ (every surface is renderer-issued)
