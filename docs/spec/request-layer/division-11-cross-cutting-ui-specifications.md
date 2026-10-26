---
id: SPEC-04-REQUEST-LAYER-0014
title: DIVISION 11 — CROSS-CUTTING UI SPECIFICATIONS
kind: spec
status: normative
version: 5.0.0
authority_scope: [04-request-layer]
anchors: [DIVISION_11_CROSS_CUTTING, COMPONENTS_V2_TECHNICAL_REQUIREMEN, EDIT_IN_PLACE_UNIVERSAL, DROPDOWN_ALWAYS_PRESENT, EMOJI_USAGE_RULES, BANNER_GENERATION, TITLE_ATTRIBUTION_FORMAT, MODE_RENDERING_MATRIX, PAGE_NAVIGATION_SUMMARY, BUTTON_COMPONENT_SPECIFICATIONS, FORMAL_NOTICE_REASON_CODE, SCOPE_BOUNDARY_WHAT_IS]
contracts: [contracts/rbac.enums.json, contracts/commands.json, contracts/ui-renderer.schema.json, contracts/events.catalog.json]
acceptance: [ACC-REQ-0014-1, ACC-REQ-0014-2]
owners: [framework-maintainers]
last_verified_commit: null
review_state: pending-evidence
---

## DIVISION 11 — CROSS-CUTTING UI SPECIFICATIONS

---

### 11.1 Components V2 — Technical Requirements

All frames defined in this document are Discord Components V2, issued by the Renderer (Division 1). The technical requirements, as specified in the blueprint (§16.5, §20):

- **Container type:** 17 (top-level frame component)
- **Text Display type:** 10 (rich text content within frames)
- **IS_COMPONENTS_V2 flag:** 32768 (set on every renderer-issued interaction response)
- **Media Gallery type:** 12 (banner images)
- **Separator type:** 14 (dividers between sections)
- **String Select Menu:** Available within Components V2 frames
- **Button:** Available within Components V2 frames (within Action Row type 1)

The Components V2 format allows flexible and customizable layouts that are not possible with traditional Discord embeds. Banners are displayed as full-width media galleries, text sections use text display components with markdown formatting, and interactive elements (dropdowns, buttons) are embedded directly within the frame.

Classic embeds (`EmbedBuilder`/`MessageEmbed`) are banned outright — see §1.8 for the four enforcement layers and ADR-001 (docs/adr/) for the migration window.

### 11.2 Edit-in-Place — Universal Behaviour

Every interaction in the Dumby dashboard system edits the existing navigation message in place rather than sending new messages, with the buffer embed as the instant acknowledgement of every step (Division 2). This applies to:

- Navigating between pages via the dropdown
- Invoking any core command (`/health`, `/browse`, `/queue`, `/permit`, `/modules`, `/persona`)
- Selecting options in command-specific dropdowns (e.g., permit grant flow)
- Clicking buttons (Edit, Cancel, Uninstall, Grant Access, etc.)
- Submitting modals
- Switching density modes

The first command invocation in a channel sends the initial message (buffer first). All subsequent interactions edit that message. If a user invokes a core command without a prior navigation message in the channel, a new message is sent (which then becomes the navigation message for future edits).

### 11.3 Dropdown — Always Present

Every page — the dashboard home and every module page — must contain the interactive selection dropdown menu for accessing different pages, in Modes D and M. The dropdown is always present as long as the user is navigating between the home page and different module pages.

The dropdown is positioned at the bottom of every frame, below the content area and the footer. It lists:

1. Dashboard (Home) — always first.
2. All installed modules (with `✅` prefix).
3. All marketplace modules (with `🛒` prefix).

When the user is on a specific module's page, that module's entry in the dropdown is marked as selected (Discord select menu default value). Mode C frames omit the dropdown; the footer mode control restores it.

### 11.4 Emoji Usage Rules

Emoji are used in exactly two places in the Dumby dashboard system:

1. **Module logo emoji** — displayed before module names in lists, dropdown options, and module detail pages. Sourced from the module's assets directory (generated from `logo.png`). Used in the installed modules list, marketplace list, module detail dropdown, and command selection dropdowns.

2. **Installed/Marketplace prefix emoji** — two specific emoji used ONLY in the dropdown option descriptions to mark modules as installed or marketplace:
   - `✅` — installed module
   - `🛒` — marketplace (uninstalled) module

These emoji are NOT used anywhere else in the frame. They do not appear in the main content area, in command lists, or in button labels. The restriction is intentional to maintain a clean, professional appearance in the content areas while providing clear visual differentiation in the navigation dropdown.

### 11.5 Banner Generation

When a module does not provide a banner in its assets directory, the Renderer generates a custom banner:

**Generation process:**
1. Start a 1280×720 canvas with a gradient background in the official accent colour, `#FFCA6D`.
2. Centre the module's logo emoji on the banner.
3. Add the module's name as text below the logo.
4. Save and serve the generated banner.

This ensures every module page has a visually consistent banner regardless of whether the module author provided one — and every generated banner carries the single official accent.

### 11.6 Title & Attribution Format

The title format for all pages follows the single A4 grammar (§1.5):

```
Dumby | {PageName}
-# Developed by {Developer}
```

Where:
- `{PageName}` is "Dashboard" for the home page, or the surface/module display name for every other page (e.g., "Health", "Queue", "Marketplace", "Hello World").
- `{Developer}` is "Quixotic Mnemonics" for framework-shipped surfaces (with the framework version, `v5.0.0`), or the module's real developer (from `devId`) for third-party modules (with the module's version).
- `{Version}` is the framework version for framework surfaces, or the module's semver version from its manifest for module pages.

Every page — including framework-level surfaces such as the Marketplace — uses this grammar. There are no per-surface exceptions; a page's title names its surface or module identity, and its footer credits its real developer.

### 11.7 Mode Rendering Matrix

How the three density modes render on each Core Command Surface page:

| Surface | Mode D | Mode M | Mode C |
|---|---|---|---|
| Dashboard | Full command list + dropdown | Compact command list + dropdown | Module-state summary line |
| /health | Full report, all sections | Section headline values | Status line + gateway ping |
| /browse | Full installed list + install dropdown | Tier counts + install dropdown | Installed/marketplace counts line |
| /queue | Full entry cards with buttons | One line per entry, buttons kept | Queued total + next push time |
| /persona | Full persona entries + inventory | One line per persona | Persona count + main bot status |
| /permit | Full step content + grant cards | Condensed lists + grant lines | Current step + selection line |
| /modules | Full module list + details dropdown | Tier-grouped counts + dropdown | Module count by tier |
| /hello | Full greeting frame | Greeting + identity line | Greeting line + identity |

### 11.8 Page Navigation Summary

The complete navigation graph:

```
                         ┌──────────────┐
                         │   Dashboard   │◄──── /dashboard command
                         │   (Home)      │
                         └──────┬───────┘
                                │
                    ┌───────────┼───────────┐
                    │           │           │
              ┌─────▼─────┐ ┌──▼──┐ ┌─────▼─────┐
              │  /health  │ │ ... │ │  /modules  │
              │   page    │ │     │ │   page     │
              └─────┬─────┘ └──┬──┘ └─────┬─────┘
                    │           │           │
                    │    ┌──────┴──────┐    │
                    │    │ Module      │    │
                    │    │ Detail Page │    │
                    │    └─────────────┘    │
                    │                       │
                    └───────┬───────────────┘
                            │
                    ┌───────▼───────┐
                    │   Dropdown    │
                    │  Navigation   │
                    └───────────────┘
```

All navigation happens through the dropdown (buffer → edit, every hop). Core commands (`/health`, `/browse`, etc.) can also be invoked directly as slash commands, which edits the navigation message to show the corresponding page.

### 11.9 Button & Component Specifications

Buttons used across the dashboard system — every one carrying a registry-minted customId, protected by the invoker re-check, and idempotent on retry (§2.4):

| Button | Page | Action |
|---|---|---|
| [Edit] | Queue list | Open the edit modal for a queued command action |
| [Cancel] | Queue list | Cancel a queued command action |
| [Grant Access] | Permit grant Step 3 | Create a permit (ALLOW) grant |
| [Grant Decline] | Permit grant Step 3 | Create a deny grant |
| [Grant Edit] | Permit grant Step 3 | Open the modal to edit an existing grant |
| [Add to Whitelist] | Permit whitelist | Whitelist a user/role |
| [Remove from Whitelist] | Permit whitelist | Remove from whitelist |
| [Edit Whitelist Entry] | Permit whitelist | Open the modal to modify a whitelist entry |
| [Add to Blacklist] | Permit blacklist | Add a user/role to the command-scoped blacklist |
| [Remove from Blacklist] | Permit blacklist | Remove from blacklist |
| [Edit Blacklist Entry] | Permit blacklist | Open the modal to modify a blacklist entry |
| [Set Cooldown] | Permit cooldown | Open the modal to set a cooldown |
| [Remove Cooldown] | Permit cooldown | Remove custom cooldown |
| [Edit Cooldown] | Permit cooldown | Open the modal to modify a cooldown |
| [Set Rate Limit] | Permit rate-limit | Open the modal to set a rate limit |
| [Remove Rate Limit] | Permit rate-limit | Remove custom rate limit |
| [Edit Rate Limit] | Permit rate-limit | Open the modal to modify a rate limit |
| [Uninstall] | Module detail | Uninstall a module |
| [D] [M] [C] | Every footer | Switch the page's density mode |

All buttons and modals edit the navigation message in place when used. No button sends a new message. A non-invoker's click is silently rejected; a retry returns the current state without re-executing.

### 11.10 Formal Notice Reason-Code Index

The formal notice frame (§2.3) is the single failure, maintenance, and unknown-command presentation across every surface in this reference. The reason-code table is normative: `UNKNOWN_COMMAND`, `MAINTENANCE`, `NOT_FOUND`, `FORBIDDEN`, `RESTRICTED`, `COOLDOWN`, `RATE_LIMITED`, `GUILD_UNAVAILABLE`, `MODULE_ERROR`, `OVERDUE`. Every denial, expiry, or failure a user can encounter in Divisions 3–10 renders through this frame with one of these codes and a trace correlation ID.

### 11.11 Scope Boundary — What Is NOT Included

The following surfaces are not part of this end-user reference and are not Discord-facing:

- **Web dashboard / module configuration panels** — schema-driven web configuration for modules (blueprint.md §16.4). Modules declare a `dashboardSchema` in their manifest; the web renderer generates the UI. No web dashboard is documented here.
- **Developer Portal UI** — the Swastik developer portal is backend infrastructure for module deployment, not an end-user interface.
- **CLAI SSH Terminal UI** — the operator terminal and its lifecycle (operator authentication, idle disconnect, session model; blueprint.md §22.6). An operator surface, not an end-user surface.
- **Bull Board UI** — BullMQ job-queue monitoring dashboard.
- **HTML generator** — no HTML generation or static site building is part of the Discord interface.
- **Interactive Terminal UI (TUI)** — no terminal user interface.
- **REST API / webhooks** — the API families (blueprint.md §44) are machine surfaces, not end-user interfaces.
- **Power Engine Panel web interface** — the Power Engine web interface is an administrative surface.
- **Twill registration API** — persona creation and configuration (blueprint.md §35, §44). `/persona` only lists.

The end-user interface of Dumby is the Discord-facing Components V2 dashboard system specified in this reference: the Core Command Surface, its navigation, and the renderer grammar that issues every one of them.

---

*End of Dumby End-User Application Reference — Version 5.0.0*

## Contract
- `contracts/rbac.enums.json`
- `contracts/commands.json`
- `contracts/ui-renderer.schema.json`
- `contracts/events.catalog.json`

## Acceptance
```acceptance
- id: ACC-REQ-0014-1
  check: "Density modes D/M/C render uniformly across every surface"
  test: tests/integration/density-modes.spec.ts
- id: ACC-REQ-0014-2
  check: "The reason-code index is complete and every notice uses one of the defined codes"
  test: tests/unit/reason-codes.spec.ts
```

## Edges (-> blueprint)
- SPEC-04-REQUEST-LAYER -> SPEC-02-ARCHITECTURE (dispatch enters the core runtime)
- SPEC-04-REQUEST-LAYER#RENDERER -> documentation/ (every surface is renderer-issued)
