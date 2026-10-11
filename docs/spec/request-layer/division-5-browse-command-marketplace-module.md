---
id: SPEC-04-REQUEST-LAYER-0008
title: DIVISION 5 — /browse COMMAND (MARKETPLACE MODULE)
kind: spec
status: normative
version: 5.0.0
authority_scope: [04-request-layer]
anchors: [DIVISION_5_BROWSE_COMMAND, OVERVIEW, COMMAND_SPECIFICATION, MARKETPLACE_PAGE_LAYOUT_MODE, INSTALLED_MODULES_LIST, MARKETPLACE_INSTALLATION_DROPDOWN, MODULE_INFORMATION_IN_DROPDOWN, DENSITY_MODES_MARKETPLACE, TITLE_ATTRIBUTION, CONTRACT, ACCEPTANCE, EDGES_BLUEPRINT]
contracts: [contracts/rbac.enums.json, contracts/commands.json, contracts/ui-renderer.schema.json, contracts/events.catalog.json]
acceptance: [ACC-REQ-0008-1]
owners: [framework-maintainers]
last_verified_commit: null
review_state: pending-evidence
---

## DIVISION 5 — /browse COMMAND (MARKETPLACE MODULE)

---

### 5.1 Overview

The `/browse` command opens the Marketplace interface — a Components V2 frame that lists all installed and Standard-tier modules and provides an interactive dropdown for browsing and installing marketplace modules. This is the module discovery and installation surface.

### 5.2 Command Specification

**Command name:** `/browse`
**Module:** `browse` (Core-tier, single-command module)
**Description:** Browse the marketplace, discover modules, and install them.
**Arguments:** None.
**Permissions:** Available to all users for browsing; installation requires Discord Administrator permission.
**Response:** Buffer embed, then the marketplace page render in place of the navigation message.

### 5.3 Marketplace Page Layout — Mode D

```
┌─────────────────────────────────────────────────────────┐
│                    BANNER (YouTube thumbnail size)        │
│  [Marketplace banner — Dumby default marketplace banner] │
├─────────────────────────────────────────────────────────┤
│                                                           │
│  Dumby | Marketplace                                      │
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
│  [INTERACTIVE DROPDOWN — Install Marketplace Modules]     │
│                                                           │
│  Select a module to install:                               │
│  🛒 moderation   — Ban, kick, mute, and warn             │
│  🛒 leveling      — XP tracking and rank cards            │
│  🛒 economy       — Virtual currency and shop            │
│  🛒 music         — Voice channel music playback          │
│  ...                                                       │
│                                                           │
└─────────────────────────────────────────────────────────┘
```

### 5.4 Installed Modules List

The top section of the marketplace page shows all installed and Standard-tier modules in the current guild:

- **Installed modules** are listed with their logo emoji as a prefix before the name, followed by version, tier, and a short description.
- **Standard-tier modules** are enabled by default for every guild and appear in this list.
- **Core-tier modules** (the Core Command Surface, including the dashboard) appear here as permanently installed.
- **Installed marketplace modules** also appear here with their logo emoji prefix.

**List format:**
```
{logo_emoji} {module_name}   v{version}   {tier}   — {short_description}
```

### 5.5 Marketplace Installation Dropdown

At the end of the frame (below the installed modules list and the divider), an interactive dropdown (String Select Menu) contains a list of all marketplace or uninstalled modules:

**Dropdown option format:**
```
🛒 {module_name} — {short description}
```

Each option's description includes the module's name, a small description, and the module's logo (rendered as emoji format where possible, or omitted if not available).

**Installation flow:**

1. A guild administrator invokes `/browse` and selects a marketplace module from the dropdown.
2. The invoker re-check passes (the selecting user is the invoking user); the message enters the buffer state (§2.1). A non-invoker's selection is silently rejected (§2.4).
3. The permission check runs: if the selecting user lacks the Discord Administrator permission, the buffer is edited into a `FORBIDDEN` formal notice frame. If the module is no longer listed, a `NOT_FOUND` notice frame.
4. On success, the module is installed for this guild. Idempotency protection absorbs any retry: re-selecting the same module before or during installation returns the current state and never double-installs.
5. The message is edited into the updated marketplace render: the module moves to the "Installed & Standard-Tier Modules" list, its logo emoji now prefixes its name there, and the dropdown no longer lists it.
6. No new message is sent at any point.

**Standard-tier modules that were previously disabled** appear in the marketplace list and can be re-enabled through the same dropdown. When re-enabled, they move back to the installed list.

### 5.6 Module Information in Dropdown

Each dropdown option for a marketplace module includes:

- The module name (kebab-case identifier).
- A short description (truncated to fit Discord select menu option description limits — 100 characters max).
- The module's logo emoji as a prefix, marking it as a marketplace (uninstalled) module.

### 5.7 Density Modes — Marketplace

- **Mode D:** Full page — banner, complete installed-modules listing with per-module lines, footer, install dropdown.
- **Mode M:** No banner; installed modules collapse to a count summary by tier plus the names of newly installed modules; install dropdown retained.
- **Mode C:** A single line — installed count, marketplace count — and the footer mode control.

### 5.8 Title & Attribution

The marketplace page uses the standard grammar (§1.5), naming its surface:
```
Dumby | Marketplace
-# Developed by Quixotic Mnemonics v5.0.0
```

The Marketplace is a framework-level surface: its title names the surface, and its attribution credits the framework developer — the same grammar as every other page.

---

---

### 5.12 Browse Page Update (UR-20261011-003) — the current arrangements

> **Authority.** The operator's final authority (UR-20261011-003, 11/10/2026); supersedes the earlier
> clauses of this Division where they conflict.

- **No in-content heading.** The frame title (`Dumby Suite | Marketplace`) names the surface; the
  content carries no repeated "Marketplace" heading.
- **Discover control (top).** A Section at the top of the content carries the **Discover** control
  (a generated bold white magnifier icon) in-line after its text. It opens a **modal** text input.
- **Listing.** The main page lists the available, **not-installed** marketplace modules, each with the
  framework's default module logo emoji beside its name. (Ranking / trending is deferred.)
- **Search.** Submitting the Discover modal re-renders the page with the results for the query; the
  results are capped at 25 and the install dropdown is synced to them.
- **Inline Info.** Each module carries an **Info** control in-line after its name (a Section
  accessory). It returns the module's descriptive content **privately (ephemeral)**.
- **Install dropdown.** A String Select at the bottom of the frame lists the shown modules; selecting
  one installs it for the guild.

### 5.13 Browse Page Corrections (UR-20261011-004) — the current arrangements

> **Authority.** The operator's final authority (UR-20261011-004, 11/10/2026); supersedes §5.12 where
> they conflict.

- **Control row.** A row at the top of the content carries **Discover** (the magnifier icon plus the
  word "Discover") and **Home** (the framework's white home icon, returning to the dashboard home).
  *(A Discord Section renders its accessory on the right, so the controls sit in a row above the
  title rather than left of it — a platform constraint.)*
- **Title.** The content title is bold: `Explore new modules to install`.
- **Install dropdown.** The install dropdown is **always present**; when no modules are available it
  is a **disabled** placeholder, so the control never disappears.

### 5.14 Browse Page Corrections (UR-20261011-005) — the current arrangements

> **Authority.** The operator's final authority (UR-20261011-005, 11/10/2026); supersedes §5.13 where
> they conflict.

- **No extra dividers.** The content blocks (the control row, the title, the listing, the dropdown)
  carry **no introduced dividers** between them.
- **Control row.** Discover and Home remain together as one row, placed adjacent to the title.
- **Home.** The Home control returns to the **/browse** main view — resetting any search back to the
  available-modules listing — not the dashboard home.

### 5.15 Browse Page — Home in the Install Dropdown (UR-20261011-006) — the current arrangements

> **Authority.** The operator's final authority (UR-20261011-006, 11/10/2026); supersedes §5.14
> where they conflict.

- **Home is a permanent dropdown option.** The install **String Select** carries a permanent
  **Home** entry in its **first slot**, above every module option (the framework's white home icon;
  sentinel value `__home__`). Selecting it returns to the **/browse** main view — resetting any
  search — and installs nothing.
- **The Home button is removed.** The control row carries **Discover** only; the dropdown is the
  Home control's sole surface.
- **The dropdown is always enabled.** Because the permanent Home option is always present, the
  control always has a selectable entry; the former empty-state disabled placeholder is retired.
- **The caps are reconciled.** The install dropdown holds at most **25** options
  (`INSTALL_DROPDOWN_CAP` — Discord's String Select limit) and the per-page module listing holds at
  most **24** modules (`MARKETPLACE_MODULE_CAP`), reserving one dropdown slot for Home, so the
  listing and the dropdown stay in sync (24 modules + Home = 25 options).

### 5.16 Browse Page — Discover In-Line with the Title (UR-20261011-007) — the current arrangements

> **Authority.** The operator's final authority (UR-20261011-007, 11/10/2026); supersedes §5.15
> where they conflict.

- **Discover sits in-line with the title.** The browse title is a **Section** whose **accessory is
  the Discover control**; a Section renders its single accessory on the right of the text line, so
  Discover appears on the **same line as the title**. The standalone control row above the title is
  removed.

## Contract
- `contracts/rbac.enums.json`
- `contracts/commands.json`
- `contracts/ui-renderer.schema.json`
- `contracts/events.catalog.json`

## Acceptance
```acceptance
- id: ACC-REQ-0008-1
  check: "`/browse` lists catalog entries filtered by manifest visibility"
  test: tests/integration/browse.spec.ts
```

## Edges (-> blueprint)
- SPEC-04-REQUEST-LAYER -> SPEC-02-ARCHITECTURE (dispatch enters the core runtime)
- SPEC-04-REQUEST-LAYER#RENDERER -> documentation/ (every surface is renderer-issued)
