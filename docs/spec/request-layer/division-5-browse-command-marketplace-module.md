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

The `/browse` command opens the Marketplace — the module discovery and installation surface. It lists
what the guild can **install or re-enable** and installs a selected module in place, never by sending a
new message.

The surface is renderer-issued Components v2 (ADR-001). The frame title names the surface; the content
carries no repeated "Marketplace" heading.

---

### 5.2 Command Specification

**Command name:** `/browse`
**Module:** `browse` (Core-tier, single-command module)
**Description:** Browse the marketplace, discover modules, and install them.
**Arguments:** None.
**Permissions:** Available to all users for browsing; installation requires Discord Administrator permission.
**Response:** Buffer embed, then the marketplace page render in place of the navigation message.

---

### 5.3 Marketplace Page Layout — Mode D

```
┌─────────────────────────────────────────────────────────┐
│                    BANNER (YouTube thumbnail size)        │
│  [Marketplace banner — Dumby default marketplace banner] │
├─────────────────────────────────────────────────────────┤
│                                                           │
│  Explore new modules to install          [Discover icon]  │
│  Dumby | Marketplace                                      │
│  -# Developed by Quixotic Mnemonics                       │
│                                                           │
├─────────────────────────────────────────────────────────┤
│                                                           │
│  [logo] moderation        — Ban, kick, mute, and warn  [i]│
│  [logo] leveling          — XP tracking and rank cards [i]│
│  [logo] economy           — Virtual currency and shop  [i]│
│  [logo] music             — Voice playback             [i]│
│  -# Previously installed — select to re-enable            │
│                                                           │
├─────────────────────────────────────────────────────────┤
│                                                           │
│  -# Developed by Quixotic Mnemonics                     │
│                                                           │
├─────────────────────────────────────────────────────────┤
│                                                           │
│  [STRING SELECT — install]                                │
│  [Home]  (permanent, first slot, sentinel `__home__`)     │
│  moderation · leveling · economy · music · …              │
│                                                           │
└─────────────────────────────────────────────────────────┘
```

The Discover control is a **Section accessory**, so Discord renders it on the right of the text line:
it sits on the same line as the title. There is no separate control row, and **no dividers are
introduced** between the content blocks.

---

### 5.4 The Catalogue — What Is Listed

`/browse` lists what the guild can **install or re-enable**, and nothing else:

- **marketplace** modules not enabled for the guild;
- **standard** modules the guild has **disabled**, marked `Previously installed — select to re-enable`.

**Core and Admin modules are never listed.** They are the framework's and are not the guild's to
install. A core module's absence from this page is the rule, not an omission.

Each entry carries the module's own logo emoji beside its name. Ranking and trending are deferred.

---

### 5.5 The Install Dropdown

A String Select at the bottom of the frame lists the modules currently shown. Two caps keep the
listing and the dropdown in sync:

| Constant | Limit | Why |
|---|---|---|
| `MARKETPLACE_MODULE_CAP` | 24 modules per page | leaves one dropdown slot for Home |
| `INSTALL_DROPDOWN_CAP` | 25 options | Discord's String Select maximum |

**Home is a permanent first option.** The dropdown's first slot is always **Home** — the framework's
white home icon, sentinel value `__home__`. Selecting it returns to the main view, resetting any
search, and installs nothing. Because that option is always present the dropdown is **always enabled**;
there is no disabled empty-state placeholder, and no separate Home button.

**Installation flow.**

1. An administrator selects a module from the dropdown.
2. The invoker re-check passes — the selecting user is the invoking user. A non-invoker's selection is
   silently rejected (§2.4).
3. The permission check runs. A user without Discord Administrator gets a `FORBIDDEN` notice frame; a
   module that is no longer listed gets `NOT_FOUND`.
4. The install writes `guild_module_states` (`enabled: true`, `state: 'active'`) and enqueues the
   module's commands for re-registration on the guild command change queue (BCCM). Idempotency absorbs
   any retry: re-selecting during installation returns the current state and never double-installs.
5. The message is edited into the updated render. **No new message is sent at any point.**

---

### 5.6 Discover and Search

The Discover control opens a **modal** text input. Submitting it re-renders the page with the results
for that query; results are capped at 25 and the install dropdown is synced to them. Home in the
dropdown resets the view to the unfiltered catalogue.

---

### 5.7 Inline Info

Each listed module carries an **Info** control in-line after its name, as a Section accessory. It
returns that module's descriptive content **privately** — ephemeral, visible only to the user who
asked.

---

### 5.8 Density Modes — Marketplace

- **Mode D:** Full page — banner, complete catalogue with per-module lines, footer, install dropdown.
- **Mode M:** No banner; the catalogue collapses to a count summary by tier plus the names of newly
  available modules; install dropdown retained.
- **Mode M/C:** A single line — available count, marketplace count — and the footer mode control.

---

### 5.9 Title & Attribution

```
Dumby | Marketplace
-# Developed by Quixotic Mnemonics
```

The Marketplace is a framework-level surface: its title names the surface, and its attribution credits
the framework developer — the same grammar as every other page (§1.5).

---

### 5.10 Arrangement History

This Division was corrected six times between 2026-10-11 and 2026-10-12, each correction superseding
the last. They are **not** restated here as competing normative text — §5.1–§5.9 above is the single
current statement. The corrections, in order, for anyone tracing a decision:

| Record | What it changed |
|---|---|
| UR-20261011-003 | Discover control and modal search; no in-content heading; private inline Info |
| UR-20261011-004 | Discover and Home in a control row; bold content title; dropdown always present |
| UR-20261011-005 | No introduced dividers; Home returns to the browse view, not the dashboard |
| UR-20261011-006 | Home becomes a permanent first dropdown option; the Home button is removed; caps reconciled |
| UR-20261011-007 | Discover moves in-line with the title; the standalone control row is removed |
| UR-20261011-010 | Catalogue scope — install or re-enable; core and admin never listed; "Previously installed" |

---

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
