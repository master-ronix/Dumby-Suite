# DUMBY — End-User Application Reference

## Discord-Facing Interface & Frontend Surfaces

### Version 5.0.0 — Consolidated Re-Baseline

---

**Document type:** End-User Application Reference (frontend, Discord-facing interface, user interaction surfaces only)

**Project:** Dumby — Discord Unified Modular Bot System

**Version:** 5.0.0

**Applicable surfaces:** Discord slash commands, Discord Components V2 frames, interactive dropdown menus, buttons, modals, autocomplete, and the in-Discord navigation experience only. No web dashboard, Developer Portal, CLAI SSH terminal, Bull Board UI, HTML generator, or external web frontend is included in this reference.

**Core principle of this document:** Every surface defined below is issued by the core Renderer. Module authors declare command schemas; the Renderer derives the presentation, the components, and the flows. The Core Command Surface — `/dashboard`, `/health`, `/browse`, `/queue`, `/persona`, `/permit`, `/modules`, and `/hello` — is the reference implementation set for the grammar this document specifies.

**Relationship to engineering authority:** Where this reference defers to the engineering specification, it cross-references blueprint.md (principally §4 Directives & Bans, §11.2 Module Manifest, §12 Authoring Package, §13 Tiers, §16.5 Renderer Service, §17 Command Framework, §20 Interaction & Component Handling, §21 Permission Engine, §22.6 Operator Terminal, §27 Audit & Telemetry, §28 Resilience, §35 Personas — Twill, §44 API Families) and the ADR series under docs/adr/. Implementation status for every capability specified here is tracked in blueprint.md's audit register, not in this document.

---

## TABLE OF CONTENTS

### DIVISIONS

- Division 0 — System Overview & the Core Command Surface
- Division 1 — The Renderer: Presentation Authority
- Division 2 — Interaction Lifecycle: Buffer, Notices & Components
- Division 3 — Dashboard Home Page (Core Commands)
- Division 4 — /health Command (Health Module)
- Division 5 — /browse Command (Marketplace Module)
- Division 6 — /queue Command (BCCM Queue Module)
- Division 7 — /persona Command (Persona Module — Twill)
- Division 8 — /permit Command (RBAC Permission Module)
- Division 9 — /modules Command (Module Management Module)
- Division 10 — Hello World Standard-Tier Module
- Division 11 — Cross-Cutting UI Specifications

---

## DIVISION 0 — SYSTEM OVERVIEW & THE CORE COMMAND SURFACE

### 0.1 What Dumby Is

Dumby is a Unified Modular Bot System: a single TypeScript application runtime — one process family, one dependency graph, one event bus, one permission engine, one configuration system — into which independently-authored, independently-versioned, independently-toggleable modules are loaded as the exclusive source of every behavior the bot exhibits, administrative capability included. The framework never special-cases itself: every command the framework ships is itself a module, loaded through the identical manifest contract, the identical DI container, and the identical lifecycle hooks a third-party author would use.

The two design words carrying the whole system are **Unified** and **Modular**. Unified means there is exactly one bootstrap sequence, one dependency graph, one event bus, one permission engine, one configuration system, and one operational surface, shared without exception by every feature the framework runs. Modular means every unit of behavior is a self-contained, independently loadable, independently testable, independently disposable module with a declared contract for everything it needs and everything it exposes.

### 0.2 The Blueprint (blueprint.md)

The blueprint is the complete engineering and implementation reference at version 5.0.0 (Consolidated Re-Baseline Edition). It spans 48 numbered sections across 9 parts, covering architecture, design, lifecycle, infrastructure, security, operations, module catalog, power engine panel, and administrative interfaces. Cross-cutting decisions are recorded as Architecture Decision Records under docs/adr/. The stack is TypeScript (strict mode), Node.js LTS ≥ 22, discord.js v14, PostgreSQL, Redis, BullMQ, Fastify, Pino/Prometheus/OpenTelemetry.

Key structural elements from the blueprint relevant to the end-user interface:

- **Module Manifest (§11.2):** The manifest is validated by a strict Zod schema with 28+ fields including name, version, tier, description, devId, commands, events, intents, dependencies, configSchema, and assets path. The manifest is the complete table of contents for a module without opening a second file.

- **Four-Tier System (§13):** Admin (bot-owner-only, dev guild), Core (always loaded, never disabled, RBAC Layer 6 skipped — governed by native Discord permissions), Standard (enabled by default, per-guild disableable), Marketplace (not pre-installed, explicit install required).

- **Permission Engine (§21):** Seven layers. Layer 6 is a pure backend rank function with six ranks — OWNER > ADMIN > MOD > HELPER > MEMBER > RESTRICTED (canonical names ADMINISTRATOR and MODERATOR) — evaluated from live Discord state and never written anywhere. Layer 7 holds guild-side grants — permit, blacklist, whitelist, cooldown, and rate-limit — scoped role > group > set with most-specific-wins resolution, applying to module commands only and never overriding Layers 1–3, the bot-capability check, or the RESTRICTED floor. Grants are resolved fresh on every interaction.

- **Components V2 and the Renderer (§16.5, §20):** The core Renderer is the single presentation authority. Every user-facing surface is a Components V2 container (Container type 17, Text Display type 10, `IS_COMPONENTS_V2` flag 32768). Classic embeds (EmbedBuilder/MessageEmbed) are banned across four enforcement layers, mirroring the prefix-command ban (§4; ADR-001 in docs/adr/).

- **BCCM (§15.8):** Bot Command Cosmetics for Marketplace — guild-level command renaming and aliasing, queued and batched through `guild_command_queue` within a 12–13 hour window rather than instant, constrained by Discord's 200-per-day guild-command-creation limit.

- **Persona System — Twill (§35):** A bring-your-own-identity feature: guild administrators supply their own bot token and application, Dumby hosts the instance, and each persona is bound to exactly one server. Persona creation is handled through the Twill registration API (§44), not through any Discord-facing command. The main bot operates under a complete DM prohibition; Twill instances decide their own DM behavior.

### 0.3 The Documentation Set

The documentation set is anchored by blueprint.md 5.0.0, the engineering authority this reference defers to throughout. Supporting documents: concept.md carries the framework glossary (including the Renderer, buffer embed, formal notice frame, density Modes D/M/C, Core Command Surface, Twill, and Release Manager entries); directive.md carries the ban registry (prefix-command ban, classic-embed ban, DM prohibition) with their enforcement layers; documentation.md is the frozen legacy architecture record, retained for historical decisions that the blueprint supersedes; and docs/adr/ records the cross-cutting tension decisions. Version 5.0.0 is a consolidated re-baseline: every document in the set carries the same version and the same vocabulary.

### 0.4 The Core Command Surface

The Core Command Surface is the Renderer's reference implementation set — the command set that demonstrates, in full, the grammar specified in Divisions 1 and 2:

| Command | Module | Tier | Purpose |
|---|---|---|---|
| `/dashboard` | `dashboard` | Core | Central navigation hub — the home page |
| `/health` | `health` | Core | System health, ping & latency |
| `/browse` | `browse` | Core | Browse the module marketplace |
| `/queue` | `queue` | Core | Manage BCCM command queue actions |
| `/persona` | `persona` | Core | View active personas & command inventory |
| `/permit` | `permit` | Core | Manage Layer 7 guild-side grants |
| `/modules` | `modules` | Core | View, manage & uninstall installed modules |
| `/hello` | `hello-world` | Standard | Hello-world test module (Division 10) |

The Core Command Surface is the shipping user-facing surface. Every other capability specified in this reference — marketplace installation flows, Twill persona listings, Layer 7 grant management — is specified here as the target interface; its implementation status is tracked in blueprint.md's audit register, not in this document.

### 0.5 Scope of This Document

This document covers exclusively the end-user-facing interface surfaces:

1. The `/dashboard` command and its Components V2 frame — the central navigation hub.
2. The six Core-tier command modules: `/health`, `/browse`, `/queue`, `/persona`, `/permit`, `/modules`.
3. The interactive dropdown navigation system that pages between the dashboard and module pages.
4. The Hello World Standard-tier module (`/hello`).

Surfaces explicitly excluded because they are not end-user Discord-facing interfaces:

- Web dashboard / module configuration panels (blueprint.md §16.4)
- Developer Portal UI (Swastik developer portal)
- CLAI SSH Terminal UI (§22.6) and its operator lifecycle
- Bull Board UI (job queue monitoring)
- HTML generator / static site generation
- Interactive Terminal UI (TUI)
- REST API / webhooks (§44)
- Power Engine Panel web interface (§22)
- Twill registration API (persona creation; §35, §44)

---

---

## DIVISION 1 — THE RENDERER: PRESENTATION AUTHORITY

### 1.1 Single Presentation Authority

The core Renderer is the single presentation authority for every Discord-facing surface in Dumby. No module, no core subsystem, and no helper library constructs message payloads directly: every page, every buffer, every formal notice, and every interactive component the user sees is issued by the Renderer against the grammar defined in this division. The engineering contract for the Renderer service is specified in blueprint.md §16.5 and §20.

Three consequences follow:

- **Visual consistency.** One frame grammar, one accent colour, one typography hierarchy, and one failure voice across every surface — framework and third-party alike.
- **Enforceability.** Bans hold because there is exactly one emission path. The classic-embed prohibition (§1.8) and the prefix-command prohibition (blueprint.md §4) are terminal at the Renderer: no code path can route around them.
- **Author leverage.** A module author declares what a command offers — its schema and its data. The Renderer decides how it looks, how it paginates, how it confirms, and how it fails.

### 1.2 Static Frame Grammar (Components V2)

Every renderer page is built from the same static Components V2 grammar: frames, dividers, title/subtitle, and footer. The static grammar is identical on every surface; only the dynamic slots (§1.3) vary.

| Element | Discord component | Role in the frame |
|---|---|---|
| Frame | Container (type 17, `IS_COMPONENTS_V2` flag 32768) | The top-level page frame; exactly one per page |
| Divider | Separator (type 14) | Delimits the identity band, each content section, and the footer |
| Title / subtitle | Text Display (type 10) | Surface/module identity and attribution, per the grammar in §1.5 |
| Footer | Text Display (type 10) + mode control | Attribution repeat, density mode control (§1.4), trace reference on notices |

The canonical vertical order of a renderer page:

```
┌─────────────────────────────────────────────────────────┐
│  [BANNER SLOT — media gallery]                            │
├─────────────────────────────────────────────────────────┤
│  Dumby | {SurfaceName}                                   │
│  -# Developed by {Developer} v{Version}                   │
├─────────────────────────────────────────────────────────┤
│  [MODULE IDENTITY SLOT]                                  │
├─────────────────────────────────────────────────────────┤
│  [CONTENT SLOT — section 1]                              │
│  ───── divider ─────                                      │
│  [CONTENT SLOT — section 2]                              │
│  ───── divider ─────                                      │
│  [CONTENT SLOT — section n]                              │
├─────────────────────────────────────────────────────────┤
│  [FOOTER — attribution repeat + mode control]             │
├─────────────────────────────────────────────────────────┤
│  [NAVIGATION DROPDOWN — mode-dependent]                  │
└─────────────────────────────────────────────────────────┘
```

The banner slot is omitted in Modes M and C (§1.4). The navigation dropdown is present in Modes D and M and omitted in Mode C.

### 1.3 Dynamic Slots

Four dynamic slots fill the static frame. The Renderer owns the resolution of every slot; module authors influence slots only through their manifest and command schema.

| Slot | Resolved from | Content |
|---|---|---|
| **Accent** | Renderer (fixed) | The official accent colour, blurple `#5865F2` |
| **Banner** | Module or framework assets directory | 1280×720 banner image (Media Gallery type 12) |
| **Module identity** | Module manifest (`devId`, name, version, logo) | Logo emoji, module name, version, developer |
| **Content** | Command schema + handler output | Page-specific sections (per-command divisions below) |

**Accent slot.** The official accent colour is blurple `#5865F2` — a single official value. It is a property of the Dumby interface, not of individual modules: dividers, footer rules, the buffer indicator, the formal notice marker, and default banner gradients are all rendered in `#5865F2`. Module visual identity is carried by the banner and module identity slots. Modules do not override the accent.

**Banner slot.** A 1280×720 image (YouTube thumbnail dimensions, 16:9 aspect ratio) served as a full-width media gallery. Every module's manifest declares its assets directory; if the directory contains no banner, the Renderer generates one using the official accent colour as a gradient background with the module's logo emoji and name centred (§11.5).

**Module identity slot.** The module's logo emoji (from `logo.png` in its assets directory, or the default `📦`), its display name, its version, and its developer (`devId`). For framework-shipped surfaces the developer is Quixotic Mnemonics.

**Content slot.** The body of the page. The Renderer derives it from the command's declared schema and the data returned by the command handler, laid out as divider-separated sections. The per-command divisions of this reference specify what each content slot contains.

### 1.4 Density Modes D / M / C

All renderer pages honor three density modes. Every page defined in Divisions 3–9 is specified in all three densities; the mode changes density, never content semantics — a Mode C health page and a Mode D health page report the same system.

| Mode | Name | Frame | Content | Navigation |
|---|---|---|---|---|
| **D** | Detailed | Full: banner, title/subtitle, all sections, footer | Every section rendered in full | Full navigation dropdown |
| **M** | Medium (compact) | No banner; title/subtitle and footer retained | Section summaries and key values; long listings collapsed to counts | Full navigation dropdown |
| **C** | Compact (minimal) | Identity line and footer only | A single summary line (status, total, or confirmation) | No dropdown; the footer mode control restores density |

Mode selection: the Renderer selects the default mode per surface and context — direct command invocations and the dashboard home default to Mode D; confirmations and transient results default to Mode C. The footer carries a D/M/C mode control; the invoking user can switch the density of any page, and the choice is invoker-scoped and applies to subsequent renders of the same navigation message. Mode switching is a component interaction like any other (§2.4): it passes through the invoker re-check and is idempotent.

### 1.5 Title & Attribution Grammar

One grammar governs titles and attribution on every renderer page — there are no per-surface exceptions:

```
Dumby | {SurfaceName}
-# Developed by {Developer} v{Version}
```

- **Title** — the surface or module identity: `Dumby | Dashboard`, `Dumby | Health`, `Dumby | Marketplace`, `Dumby | Hello World`. The title names the page the user is on.
- **Attribution** — the footer/subtitle line, rendered in Discord subtext formatting (`-#`): the real developer of the surface. Framework-shipped surfaces attribute to **Quixotic Mnemonics** with the framework version (`v5.0.0`); module pages attribute to the module's real developer (from `devId`) with the module's version.

The attribution line appears directly below the title and is repeated in the footer of the frame. Framework-level surfaces — the Marketplace among them — use their surface name in the title and attribute to the framework developer, because they are framework-shipped surfaces; the grammar is identical everywhere.

### 1.6 Official Accent Colour

The official accent colour of the Dumby interface is blurple, `#5865F2`. It is the single official value: every accent element on every renderer-issued surface — dividers, footer rules, buffer indicators, notice markers, default banner gradients, and button accent styling — uses it. The accent is fixed by the framework and is not a configurable or per-module property.

### 1.7 Authoring Model: Schemas In, Renders Out

Module authors declare **command schemas**; the Renderer derives the presentation, the components, and the flows. The schema declares the command's name, description, options (including which options support autocomplete), and the page descriptors the command can render. The command handler returns data against one of its declared page descriptors; the Renderer turns that data into a frame — buffer first (§2.1), then the final render or the formal notice frame (§2.3).

Imperative component construction is not part of the authoring contract. A module that returns raw component arrays, embeds, or hand-built payloads violates the contract and fails closed at the dispatch boundary: the user sees the formal notice frame, and the violation is logged.

What the Renderer derives from a schema:

- The complete frame — static grammar and dynamic slots — in all three density modes.
- Navigation: the always-present dropdown wiring and edit-in-place paging.
- Selection flows: command, target, and option dropdowns with search enabled where the option space is large.
- Confirmation and edit modals for destructive or multi-field actions.
- The buffer lifecycle, the formal notice lifecycle, autocomplete budgeting, and idempotency protection.

The authoring contract and the `swastik` package that carries it are specified in blueprint.md §12 and §17.2. Division 10 contains a complete schema-authored example.

### 1.8 Embed Policy: Components V2 Only

Classic embeds — the discord.js `EmbedBuilder` and `MessageEmbed` types — are banned from every Dumby surface. All presentation is Components V2 containers. The ban is enforced by four layers, mirroring the prefix-command ban (blueprint.md §4):

1. **Authoring-time lint** — the lint set rejects `EmbedBuilder`/`MessageEmbed` imports and construction in module and core code.
2. **Load-time validation** — manifest validation and module loading refuse any module whose declared render contract requires classic embeds.
3. **Dispatch-time boundary** — the Renderer is the only emission path; a handler response that is not a valid render descriptor never reaches Discord, and the user sees the formal notice frame instead.
4. **Release gate** — promotion and CI fail any module or core change that reintroduces classic embed construction; the same gate audits the renderer path so that new ingestion surfaces are covered as they appear.

A migration window applies per ADR-001 (docs/adr/). Within the window, modules still emitting classic embeds are flagged by layers 1 and 4; when the window closes, all four layers enforce unconditionally.

---

---

## DIVISION 2 — INTERACTION LIFECYCLE: BUFFER, NOTICES & COMPONENTS

### 2.1 The Buffer Embed

On every interaction that passes the invoker re-check (§2.4), the Renderer immediately sends a **buffer embed** — a minimal frame acknowledging the interaction — and then edits that buffer into the final render, or into the formal notice frame when the outcome is a failure, a maintenance condition, or an unknown command. No interaction is ever left without a visible acknowledgement while its result is computed.

**Buffer frame specification:**

```
┌─────────────────────────────────────────────────────────┐
│  Dumby | {SurfaceName}                                   │
│  -# Developed by {Developer} v{Version}                   │
├─────────────────────────────────────────────────────────┤
│  ⏳ Preparing {SurfaceName}…                              │
└─────────────────────────────────────────────────────────┘
```

The buffer carries the identity band (title and attribution per §1.5), one accent-coloured divider, and a single "Preparing…" line. In Mode C the buffer is a single text line with the surface identity. The buffer contains no interactive components except, where already present, the footer mode control.

**Composition with edit-in-place.** The buffer lifecycle composes with the edit-in-place navigation invariant (§2.2): there is always exactly one message in play. When the interaction is a new command invocation, the buffer is the initial reply. When the interaction is a component interaction on an existing navigation message — a dropdown select, a button, a modal submit — the buffer state is applied to that same message: the frame briefly enters the buffer presentation and is then edited into the result. In both cases the user's acknowledgement is instant and the final state lands as an edit of the same message.

### 2.2 Edit-in-Place Navigation Invariant

Every interaction in the Dumby dashboard system edits the existing navigation message in place rather than sending new messages. The flow:

1. User invokes `/dashboard` → the buffer is sent as the initial message and edited into the dashboard home render.
2. User selects a module from the dropdown → the same message enters the buffer state and is edited to show that module's page.
3. User selects "Dashboard (Home)" from the dropdown → the same message is edited back to the home page.
4. User invokes `/health` (or any other core command) → if a navigation message from the same user exists in the channel, it is edited to show the health page; if none exists, a new message is sent (buffer first) and becomes the navigation message for future edits.

This behaviour applies to all frames defined in this document: page navigation, command-specific dropdowns, buttons, modal submits, and mode switches. No command or component sends a new message after the initial navigation message exists. One message, edited in place — with the buffer as the instant acknowledgement of every step (§2.1).

### 2.3 The Formal Notice Frame

The formal notice frame is the Renderer's unified presentation for failure, maintenance, and unknown-command outcomes. One frame and one grammar serve all three: there are no ad-hoc error messages in the Dumby interface.

**Frame specification:**

```
┌─────────────────────────────────────────────────────────┐
│  Dumby | {SurfaceName}                                   │
│  -# Developed by {Developer} v{Version}                   │
├─────────────────────────────────────────────────────────┤
│  ⚠ {Notice heading}                                      │
│                                                           │
│  {One-to-three line human explanation}                    │
│                                                           │
│  reason: {REASON_CODE}                                    │
│  trace: {correlationId}                                   │
└─────────────────────────────────────────────────────────┘
```

- **Banner slot omitted.** Notices render in the minimal frame regardless of the page's density mode.
- **Reason code.** A machine-readable, stable, uppercase token from the table below. Reason codes are part of the interface contract: tooling and support quote them verbatim.
- **Trace correlation ID.** Minted per interaction. The trace joins the notice to the audit log and telemetry spans (blueprint.md §27), and is the reference a user quotes in a support request.

**Reason code table:**

| Reason code | Category | Typical trigger |
|---|---|---|
| `UNKNOWN_COMMAND` | Input | The invoked command is not registered or not available |
| `MAINTENANCE` | System | Maintenance mode is active |
| `NOT_FOUND` | State | The selected target (module, queue entry, grant target) does not exist |
| `FORBIDDEN` | Authorization | The user's Layer 6 rank, Layer 7 resolution, or Discord permission bits are below the requirement |
| `RESTRICTED` | Authorization | The RESTRICTED floor applies |
| `COOLDOWN` | Throttling | A cooldown is active for the user and command |
| `RATE_LIMITED` | Throttling | A rate limit is exceeded |
| `GUILD_UNAVAILABLE` | Availability | The module is not available in this guild |
| `MODULE_ERROR` | Failure | A module handler failed during execution |
| `OVERDUE` | Failure | The interaction expired before its final render; an overdue event was logged (§2.6) |

The notice frame is the only failure presentation. Validation failures (§6.7), permission denials (§8.4), install rejections (§5.5), and expiry outcomes (§2.6) all render through it.

### 2.4 Interactive Component Dispatch

All interactive components — buttons, select menus, modals, and autocomplete — are dispatched through the **InteractionRegistry** (blueprint.md §20). The contract:

- **Minted customIds.** Every component carries a registry-minted customId encoding its origin, page, and action. Hand-written free-text customIds are not part of the authoring contract; the Renderer mints them when it derives a flow from a schema (§1.7).
- **Invoker re-check.** On every component interaction, the registry re-checks that the interacting user is the invoker of the navigation message. A non-invoker's interaction is **silently rejected** — the 403-equivalent: no buffer, no notice frame, no edit, and no visible change for anyone. The navigation message belongs to the user who invoked it.
- **Idempotency protection.** Retries — double-clicks, network replays, resubmitted modals — are recognized by the registry and return the current state without re-executing the action. Installing twice, granting twice, or cancelling twice is not possible through retry; the second attempt lands as the already-achieved result.

Component dispatch ordering with the buffer lifecycle: the invoker re-check runs first; an interaction that passes it receives the buffer (§2.1); idempotency is evaluated before the action executes.

### 2.5 Autocomplete

Autocomplete-enabled command options answer within an **800 ms budget**. If the full answer set cannot be computed within the budget, the Renderer serves the cached or partial result set rather than an empty or late answer — an autocomplete response is never blank-by-default and never arrives after the budget has lapsed. Autocomplete is available on the option spaces where it matters: command names in `/queue`, command and grant targets in `/permit`, and module search in `/browse`.

### 2.6 Deferred Interactions & the Follow-Up Watchdog

Interactions whose final render cannot be produced within the acknowledgement window are auto-deferred; the buffer is already visible to the user (§2.1). If an auto-deferred interaction would expire before its final render can land, a **13-minute follow-up watchdog** guarantees a logged overdue event: the buffer is edited into an `OVERDUE` formal notice frame for the user, and the overdue event is recorded with the interaction's trace correlation ID for operator review. The engineering contract (defer windows, the watchdog alarm, and the retry policy it consumes) is specified in blueprint.md §20 and §28.

The user-visible guarantee is the complete failure UX: **buffer first, then either the final render or a formal notice — never silence.**

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

## DIVISION 4 — /health COMMAND (HEALTH MODULE)

---

### 4.1 Overview

The `/health` command is a Core-tier module shipping a single slash command. It provides comprehensive system health information covering hardware, software, bandwidth, network, API ping latency, module count, server usage, and as much health-related data as possible. This is the diagnostic surface for the bot. The health page is the canonical demonstration of the density modes: the same report renders in full detail (D), as a condensed summary (M), or as a single status line (C).

### 4.2 Command Specification

**Command name:** `/health`
**Module:** `health` (Core-tier, single-command module)
**Description:** Displays comprehensive system health and diagnostic information.
**Arguments:** None.
**Permissions:** Available to all users (Core-tier, governed by native Discord permissions).
**Response:** Buffer embed, then the health page render in place of the navigation message.

### 4.3 Health Page Layout — Mode D

```
┌─────────────────────────────────────────────────────────┐
│                    BANNER (YouTube thumbnail size)        │
│  [Dumby health banner — default or custom]               │
├─────────────────────────────────────────────────────────┤
│                                                           │
│  Dumby | Health                                           │
│  -# Developed by Quixotic Mnemonics v5.0.0                │
│                                                           │
├─────────────────────────────────────────────────────────┤
│                                                           │
│  📊 SYSTEM HEALTH REPORT                                  │
│                                                           │
│  ━━ Discord API ━━                                        │
│  Gateway Ping:     42ms                                   │
│  REST API Ping:    38ms                                   │
│  Gateway Status:   Connected                              │
│  Shard Count:      1                                      │
│  Session Start:    2026-09-18 10:30:00 UTC                │
│  Reconnects:       0                                      │
│                                                           │
│  ━━ Bot Process ━━                                        │
│  Uptime:            3d 4h 12m                             │
│  Node.js Version:   v22.x.x                               │
│  Memory Usage:      128.5 MB / 512 MB                     │
│  CPU Usage:         2.3%                                  │
│  Heap Used:         64.2 MB                                │
│  Heap Total:         128.0 MB                            │
│  Event Loop Lag:    1.2ms                                  │
│  Active Handles:   15                                     │
│  Active Requests:   3                                      │
│                                                           │
│  ━━ Modules ━━                                             │
│  Total Loaded:      8                                      │
│  Core-tier:         7 (dashboard, health, browse, queue,  │
│                          persona, permit, modules)         │
│  Standard-tier:     1 (hello-world)                       │
│  Marketplace-tier:  0                                      │
│  Admin-tier:        0                                      │
│  Error Count:       0                                      │
│                                                           │
│  ━━ Database ━━                                           │
│  PostgreSQL Status: Connected                              │
│  Connection Pool:   8/20 active                            │
│  Query Latency:     2.1ms avg                             │
│  Migration Version: 0035                                    │
│                                                           │
│  ━━ Cache ━━                                              │
│  Redis Status:      Connected                              │
│  L1 Cache Size:     1,247 entries                          │
│  L2 (Redis) Keys:   3,891 entries                          │
│  Hit Rate:          94.2%                                   │
│                                                           │
│  ━━ Network ━━                                            │
│  Outbound Bandwidth: 1.2 MB/s                              │
│  Inbound Bandwidth:  0.8 MB/s                              │
│  Active HTTP Requests: 2                                    │
│  External API Status:  All operational                     │
│                                                           │
│  ━━ Guilds & Users ━━                                     │
│  Total Guilds:      142                                     │
│  Total Users:       8,432                                  │
│  Active Interactions (24h): 1,205                          │
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

### 4.4 Health Data Points

The `/health` command must contain each and every piece of information about the Dumby system — hardware, software, bandwidth, network, API ping latency, module count, server usage, and as much health-related data as possible:

**Discord API health:**
- Gateway WebSocket ping (milliseconds)
- REST API ping (milliseconds)
- Gateway connection status (Connected/Reconnecting/Disconnected)
- Active shard count
- Session start time
- Reconnect count since startup
- Discord API rate limit status (remaining/global limit)

**Bot process health:**
- Process uptime (days/hours/minutes)
- Node.js runtime version
- Memory usage (RSS, heap used, heap total, external)
- CPU usage percentage
- Event loop lag (milliseconds)
- Active handles count
- Active requests count
- Garbage collection stats (if available)

**Module health:**
- Total loaded module count
- Breakdown by tier (Admin, Core, Standard, Marketplace)
- Module error count (total across all modules)
- Any modules in ERROR state (listed by name)

**Database health:**
- PostgreSQL connection status
- Connection pool utilisation (active/max)
- Average query latency
- Current migration version
- Database size (if queryable)

**Cache health:**
- Redis connection status
- L1 cache (in-memory) entry count
- L2 cache (Redis) key count
- Cache hit rate percentage
- Redis memory usage

**Network health:**
- Outbound bandwidth (bytes/second)
- Inbound bandwidth (bytes/second)
- Active HTTP requests
- External API connectivity status
- HttpService circuit breaker state (open/closed per host)

**Guild & user metrics:**
- Total guild count
- Total user count (users who have interacted with the bot)
- Active interactions in the last 24 hours
- Commands invoked in the last 24 hours (count)

**Job queue health:**
- BullMQ queue status
- Active job count
- Failed job count
- Dead letter queue count

### 4.5 Density Modes — Health

- **Mode D:** The full report — every section and every data point above.
- **Mode M:** No banner; one status line per section (Discord API, Bot Process, Modules, Database, Cache, Network, Guilds & Users, Job Queues) with each section's headline values only (gateway ping, uptime, module total, connection states, hit rate, guild count).
- **Mode C:** A single status line — overall state (operational/degraded), gateway ping, uptime, and module count — plus the footer mode control.

### 4.6 Display Format & Failure Presentation

The health data is displayed as structured text within the content slot, organized into clearly delimited sections (visual separators like `━━`). Each section has a header emoji and title. The data is presented in a key-value format with aligned colons for readability.

Degraded subsystems are flagged in place: a failed or reconnecting subsystem renders its section header with a warning marker and its degraded values; the overall Mode C status line reflects the worst subsystem state. If the health command itself cannot complete — because the module is unavailable or the bot is in maintenance mode — the user sees the formal notice frame with the appropriate reason code (`GUILD_UNAVAILABLE`, `MAINTENANCE`, or `MODULE_ERROR`) rather than a partial or stale report.

### 4.7 Title & Attribution

The health page uses:
```
Dumby | Health
-# Developed by Quixotic Mnemonics v5.0.0
```

---

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

## DIVISION 6 — /queue COMMAND (BCCM QUEUE MODULE)

---

### 6.1 Overview

The `/queue` command manages the BCCM (Bot Command Cosmetics for Marketplace) queue. BCCM batches guild-level command renames, aliases, and disable requests through the `guild_command_queue` table within a 12–13 hour batching window. This is the interface for guild administrators to submit, review, edit, and cancel pending command change requests.

### 6.2 Command Specification

**Command name:** `/queue`
**Module:** `queue` (Core-tier, single-command module)
**Description:** Manage BCCM command queue actions — submit, view, edit, and cancel pending command changes.
**Arguments:** See §6.3.
**Permissions:** Available to all users for viewing; submission and modification requires Discord Administrator permission or Manage Guild permission.
**Response:** Buffer embed, then the queue page render in place of the navigation message.

### 6.3 Command Arguments

The `/queue` command accepts the following slash command arguments:

| Argument | Type | Required | Description |
|---|---|---|---|
| `command` | String | No | The command name to queue an action for (e.g., `ban`, `kick`) — autocomplete-enabled (§2.5) |
| `alias` | String | No | An alias name to add for the command |
| `new-name` | String | No | A new name to rename the command to |
| `disable` | Boolean | No | Set to `true` to disable the command, `false` to re-enable |
| `action` | String (choices) | No | The BCCM action type: `rename`, `alias`, `disable`, `enable` |

**When arguments are provided:** The command submits a new queue entry with the specified parameters. The entry is added to the `guild_command_queue` table and will be processed during the next batch push (within the 12–13 hour window).

**When no arguments are provided:** The command displays the list of all queued command actions that have been submitted for this guild but not yet processed.

### 6.4 BCCM Action Types

The BCCM system supports the following action types, all of which are available as arguments to `/queue`:

**Rename (`new-name` argument):**
Changes what a slash command is called in this guild. The rename only changes what the command is called, never how it is invoked — it remains a slash command, not a text-prefix command. Renames are batched and take effect within 12–13 hours.

**Alias (`alias` argument):**
Adds an additional name alongside the command's original name. The command becomes callable by both its original name and the alias. Aliases are subject to the same batching window.

**Disable (`disable: true`):**
Disables a command in this guild. The command becomes unusable immediately via Discord permission overrides, but the underlying deregistration happens during the next batch push.

**Enable (`disable: false`):**
Re-enables a previously disabled command. The command becomes usable immediately via permission overrides, with the re-registration batched.

**Constraints:**
- An alias may never match a reserved, native Discord command name (`/help`, `/giphy`, `/tenor`, etc.). The system rejects the request outright with a formal notice frame (`reason: NOT_FOUND` on the reserved-name check, with the human explanation "Cannot alias a reserved Discord command.").
- BCCM never becomes a text-prefix system — a rename or alias only changes what a slash command is called, never how it is invoked.
- Before accepting any queue request, BCCM projects the guild's resulting total registered-command count. A request that would raise the guild's total above Discord's 100-command ceiling is rejected outright, before it enters the queue, with the specific projected count returned in the notice explanation.

### 6.5 Queue List View (No Arguments)

When `/queue` is invoked without arguments, the frame displays the list of all queued command actions for this guild:

```
┌─────────────────────────────────────────────────────────┐
│                    BANNER (YouTube thumbnail size)        │
│  [Queue banner — Dumby default]                           │
├─────────────────────────────────────────────────────────┤
│                                                           │
│  Dumby | Queue                                            │
│  -# Developed by Quixotic Mnemonics v5.0.0                │
│                                                           │
├─────────────────────────────────────────────────────────┤
│                                                           │
│  Pending Command Queue Actions                            │
│  Batch window: next push in ~8h 23m                       │
│                                                           │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━               │
│                                                           │
│  #1  Action: Rename                                       │
│      Command: ban                                         │
│      New Name: timeout                                    │
│      Submitted: 2026-09-18 14:32 UTC                       │
│      Submitted by: @AdminUser                             │
│      Status: Queued                                       │
│      [Edit]  [Cancel]                                     │
│                                                           │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━               │
│                                                           │
│  #2  Action: Alias                                        │
│      Command: kick                                        │
│      Alias: yeet                                          │
│      Submitted: 2026-09-18 15:10 UTC                       │
│      Submitted by: @AnotherAdmin                           │
│      Status: Queued                                       │
│      [Edit]  [Cancel]                                     │
│                                                           │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━               │
│                                                           │
│  Total queued: 3   |   Next batch push: ~8h 23m           │
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

### 6.6 Queue Entry Buttons

Every queued command action has two buttons, each carrying a registry-minted customId (§2.4) scoped to the queue entry:

**[Edit] button:**
Opens an interactive editing modal for that specific queue entry. The admin can modify:
- The command name (for rename/alias actions)
- The new name or alias value
- The disable/enable toggle
- The action type

After the modal is submitted, the message passes through the buffer state and is edited into the updated queue list view. A non-invoker's click on [Edit] is silently rejected; a retried modal submit is absorbed by idempotency protection and returns the current entry state.

**[Cancel] button:**
Cancels the queue request. When clicked, the queue entry is removed from the `guild_command_queue` table and the message is edited in place to show the updated queue list with the cancelled entry removed. Idempotency protection means a second click (or a network replay) never errors — it simply re-renders the queue list without the already-cancelled entry. A non-invoker's click is silently rejected.

### 6.7 Queue Submission Flow

When `/queue` is invoked with arguments:

1. The buffer embed is sent (§2.1).
2. The command validates the arguments: the command name exists, the alias/new-name is not a reserved Discord command, and the projected command count does not exceed the 100-command ceiling.
3. If validation fails, the buffer is edited into the formal notice frame with the specific reason code and human explanation (§2.3) — no ephemeral error text, no partial render.
4. If validation passes, the queue entry is written to `guild_command_queue`.
5. The message is edited into the updated queue list render with the new entry at the bottom, including its [Edit] and [Cancel] buttons, and the batch window countdown.

### 6.8 Batching Window

The BCCM batching window operates on a 12–13 hour cycle. All queued actions for a guild are batched and pushed together as a single bulk-overwrite of the guild's registered command set. This conserves Discord's 200-per-day guild-command-creation limit. The queue list view displays the estimated time remaining until the next batch push.

### 6.9 Density Modes — Queue

- **Mode D:** Full page — banner, every queued entry in full detail with its buttons, totals line, footer, navigation dropdown.
- **Mode M:** No banner; each queued entry collapses to a single line (`#1 Rename ban → timeout — Queued`); buttons retained per entry; dropdown retained.
- **Mode C:** A single line — total queued and time to next batch push — plus the footer mode control.

### 6.10 Title & Attribution

The queue page uses:
```
Dumby | Queue
-# Developed by Quixotic Mnemonics v5.0.0
```

---

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
│  Bound Modules: 3 (leveling, moderation, economy)        │
│  DM Behavior: decided by the Twill instance             │
│  Status: ● Online                                         │
│                                                           │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━               │
│                                                           │
│  Command Inventory (Main Bot):                            │
│  /dashboard  /health  /browse  /queue                    │
│  /persona   /permit  /modules  /hello                   │
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
- **Bound modules** (list of modules bound to this persona via `guild_persona_bindings`).
- **DM behavior** (the main bot shows "Prohibited"; a Twill instance shows the DM behavior its instance has decided).
- **Status** (Online/Offline/Connecting — based on gateway connection state).
- **Command inventory** (list of all slash commands available under this persona's 100-command budget).

If no Twill personas are active (only the main bot exists), the listing shows only the main bot entry.

### 7.5 Persona Creation & Configuration — Twill Registration API

Persona creation, token binding, shard allocation, and module enablement profiles are handled exclusively through the **Twill registration API** — the administrative API surface for bring-your-own-identity hosting (blueprint.md §35; the API family is specified in §44). Under the Twill model the guild administrator supplies their own bot token and application; Dumby hosts the running instance; and the registration binds the persona to exactly one server. None of these operations are performed through `/persona` or any other Discord-facing command. The listing includes an informational note stating where persona management is handled.

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
## DIVISION 8 — /permit COMMAND (RBAC PERMISSION MODULE)

---

### 8.1 Overview

The `/permit` command manages the guild-side of Dumby's permission system. It requires an argument to be specified, with only limited available options: `grant`, `whitelist`, `blacklist`, `cooldown`, `rate-limit`, and all other Layer 7 tools. Each argument triggers a different interactive flow for managing that specific aspect of the permission system.

The permission engine has two layers that matter to this command (blueprint.md §21):

- **Layer 6 — rank function.** A pure backend function that evaluates a user's rank from live Discord state — it is evaluated, never written. It provides the six-rank ladder against which command requirements are checked.
- **Layer 7 — guild-side grants.** The guild-managed override layer: permit, blacklist, whitelist, cooldown, and rate-limit grants, scoped and resolved per interaction.

The `/permit` command is the user-facing interface for managing Layer 7 grants. It never touches Layer 6 ranks (they are not writable) and never the core enforcement layers (see §8.4).

### 8.2 Command Specification

**Command name:** `/permit`
**Module:** `permit` (Core-tier, single-command module)
**Description:** Manage guild-side grants — permits, whitelists, blacklists, cooldowns, and rate limits.
**Arguments:** See §8.3.
**Permissions:** Requires Discord Administrator permission (Core-tier, governed by native Discord permissions).
**Response:** Buffer embed, then the permit flow render in place of the navigation message.

### 8.3 Command Arguments

The `/permit` command requires one of the following arguments:

| Argument | Description |
|---|---|
| `grant` | Manage permit grants for a command, for specific roles, groups, or sets |
| `whitelist` | Add a user or role to the whitelist for a command |
| `blacklist` | Add a user or role to the command-scoped blacklist for a command |
| `cooldown` | Set cooldown duration and scope for a command |
| `rate-limit` | Set rate limits for a command |

If `/permit` is invoked without an argument, the frame shows an informational message listing the available sub-commands and their purposes.

### 8.4 RBAC Vocabulary Reference

The vocabulary below is the normative model the `/permit` flows operate on. The full engineering specification is blueprint.md §21.

**Layer 6 — the rank function.** A pure backend function, evaluated from live Discord state and never written anywhere. Six ranks, ordered:

| Rank | Canonical name | Level | Description |
|---|---|---|---|
| OWNER | — | 6 | The guild's ownership account |
| ADMIN | ADMINISTRATOR | 5 | Guild administrator — fixed permission-bit bundle |
| MOD | MODERATOR | 4 | Guild moderator — fixed permission-bit bundle |
| HELPER | — | 3 | Limited moderation — reduced fixed bundle |
| MEMBER | — | 2 | Default rank — the default command requirement |
| RESTRICTED | — | 1 | Restricted access — the automatic floor |

Properties that hold everywhere:

- ADMIN/MOD/HELPER are fixed permission-bit bundles; guilds cannot redefine what the ranks mean.
- RESTRICTED is the automatic floor: a RESTRICTED user cannot be raised by any grant.
- MEMBER is the default requirement for commands that declare no rank requirement.
- Layer 6 ranks are not stored, not assignable, and not manageable through `/permit` or any other surface — they are derived fresh from live Discord state on every interaction.
- A command's Discord-bit gate and its Layer 5+6 declarations combine conjunctively (AND): both must pass.

**Layer 7 — guild-side grants.** What `/permit` manages:

- **Grant types:** `permit`, `blacklist`, `whitelist`, `cooldown`, `rate-limit`.
- **Grant scopes:** role > group > set — when multiple grants match, the most-specific scope wins.
- **Command scope:** grants target module commands only. Core-tier commands and core commands are not grant-manageable.
- **Override boundary — hard and non-configurable:** Layer 7 grants never override Layers 1–3 (bot-owner override, the blacklist, guild/module availability), never the bot-capability check, and never the RESTRICTED floor. A permit cannot lift a user above a rank requirement, and nothing can lift a RESTRICTED user.
- **Resolution freshness:** the grant set is resolved fresh on every interaction — an edit through `/permit` takes effect on the very next command invocation, with no cache window.

### 8.5 /permit grant — Interactive Flow

When `/permit grant` is invoked, the following multi-step interactive flow begins. Each step buffers and edits the same navigation message in place. Every component interaction passes the invoker re-check (§2.4); every action is idempotent on retry.

**Step 1: Command Selection**

The message is edited to show a dropdown (String Select Menu) containing the module commands the guild administrator can manage grants for — module commands only (§8.4):

```
┌─────────────────────────────────────────────────────────┐
│                    BANNER (YouTube thumbnail size)        │
├─────────────────────────────────────────────────────────┤
│                                                           │
│  Dumby | Permit                                           │
│  -# Developed by Quixotic Mnemonics v5.0.0                │
│                                                           │
├─────────────────────────────────────────────────────────┤
│                                                           │
│  Grant Access — Step 1: Select Command                    │
│                                                           │
│  Choose a module command to manage grant access:          │
│                                                           │
│  [DROPDOWN — Select Command]                              │
│  📦 ban         moderation v2.1.0 — Ban a member         │
│  📦 kick        moderation v2.1.0 — Kick a member        │
│  📦 mute        moderation v2.1.0 — Timeout a member     │
│  📦 warn        moderation v2.1.0 — Warn a member         │
│  📦 play        music v1.3.0     — Play music            │
│  ...                                                       │
│                                                           │
├─────────────────────────────────────────────────────────┤
│                                                           │
│  -# Developed by Quixotic Mnemonics v5.0.0   [D][M][C]  │
│                                                           │
└─────────────────────────────────────────────────────────┘
```

Each dropdown option includes:
- The module's logo emoji (from the module's assets directory).
- The command name.
- The module name and version, and related info, in the option description.

The dropdown is autocomplete-backed where the command space is large (§2.5).

**Step 2: Role/Group/Set Selection**

After a command is selected, the message is edited to show a new dropdown for selecting the grant scope target:

```
┌─────────────────────────────────────────────────────────┐
│  Grant Access — Step 2: Select Target                     │
│  Command: ban (moderation v2.1.0)                         │
│                                                           │
│  Choose a role, group, or set to manage grants for:      │
│  (Search enabled — type to filter)                         │
│                                                           │
│  [DROPDOWN — Select Roles/Groups/Sets]                    │
│  👤 @Moderator       (Role)                               │
│  👥 Moderation Team  (Group)                              │
│  📋 Senior Staff     (Set)                                │
│  👤 @Helper          (Role)                               │
│  ...                                                       │
└─────────────────────────────────────────────────────────┘
```

This dropdown has the search button enabled, allowing the admin to type and filter through roles, groups, and sets. A **set** is a set of groups; the three grant scopes are role > group > set, with most-specific-wins resolution at interaction time (§8.4).

**Step 3: Grant Details & Action Buttons**

After a role/group/set is selected, the message is edited to show all grants related to that selection for the chosen command, with three action buttons:

```
┌─────────────────────────────────────────────────────────┐
│  Grant Access — Step 3: Grant Details                     │
│                                                           │
│  Command:  ban (moderation v2.1.0)                        │
│  Target:   @Moderator (Role)                              │
│                                                           │
│  Current Grants:                                           │
│  ┌───────────────────────────────────────────────────┐    │
│  │ Grant Type:  permit                                │    │
│  │ Effect:      ALLOW                                  │    │
│  │ Scope:       Role                                    │    │
│  │ Granted by:  @AdminUser on 2026-09-14              │    │
│  │ Expires:    Never                                   │    │
│  └───────────────────────────────────────────────────┘    │
│                                                           │
│  [Grant Access]  [Grant Decline]  [Grant Edit]            │
└─────────────────────────────────────────────────────────┘
```

The three buttons:

- **[Grant Access]:** Creates a `permit` grant (ALLOW) for the selected command to the selected role/group/set. The grant is written to the grant store and takes effect on the very next interaction — Layer 7 is resolved fresh per interaction (§8.4).
- **[Grant Decline]:** Creates a `blacklist`-typed deny for the selected command and target. A deny at Layer 7 blocks the command for that target. Note the override boundary: a deny cannot push past Layers 1–3, the bot-capability check, or the RESTRICTED floor, and a permit can never lift a target above a Layer 6 rank requirement.
- **[Grant Edit]:** Opens an interactive editing modal for modifying the existing grant — the grant type, an expiration time, or other grant parameters. After the modal is submitted, the message passes through the buffer state and is edited into the updated grant details.

Users affected by a grant change see the formal notice frame (`FORBIDDEN` or the relevant reason code) when a subsequent invocation is denied — never an unexplained failure.

### 8.6 /permit whitelist — Interactive Flow

When `/permit whitelist` is invoked:

**Step 1: Command Selection** — Same as grant Step 1: dropdown to select a module command (autocomplete-backed).

**Step 2: Target Selection** — Dropdown to select a user or role to whitelist for the selected command. Search is enabled.

**Step 3: Whitelist Details** — Shows the current whitelist status for the selected target and command, with three buttons:

- **[Add to Whitelist]:** Adds the selected user/role to the command's whitelist. A whitelisted user is exempted from the Layer 7 permit check for that command — but never from Layers 1–3, the bot-capability check, or the RESTRICTED floor (§8.4).
- **[Remove from Whitelist]:** Removes the user/role from the whitelist.
- **[Edit Whitelist Entry]:** Opens a modal to modify the whitelist entry (e.g., scope, expiration).

### 8.7 /permit blacklist — Interactive Flow

When `/permit blacklist` is invoked:

**Step 1: Command Selection** — Same dropdown to select a module command.

**Step 2: Target Selection** — Dropdown to select a user or role to blacklist for the selected command. Search is enabled.

**Step 3: Blacklist Details** — Shows the current blacklist status with three buttons:

- **[Add to Blacklist]:** Adds the user/role to the command-scoped blacklist. A blacklisted user's invocation of that command is denied at Layer 7 resolution and presented as a `FORBIDDEN` formal notice frame (§2.3) — never a bare or unexplained failure.
- **[Remove from Blacklist]:** Removes the user/role from the command-scoped blacklist.
- **[Edit Blacklist Entry]:** Opens a modal to modify the blacklist entry (e.g., scope, reason, expiration).

### 8.8 /permit cooldown — Interactive Flow

When `/permit cooldown` is invoked:

**Step 1: Command Selection** — Dropdown to select a module command.

**Step 2: Target Selection** — Dropdown to select a user, role, group, or set. Search is enabled.

**Step 3: Cooldown Details** — Shows the current cooldown settings:

- **Current cooldown:** the duration and scope (e.g., "10 seconds per user").
- **[Set Cooldown]:** Opens a modal to set a new cooldown duration (in seconds) and scope (USER/GUILD/CHANNEL/GLOBAL).
- **[Remove Cooldown]:** Removes the custom cooldown, reverting to the command's default.
- **[Edit Cooldown]:** Opens a modal to modify the existing cooldown parameters.

Cooldown grants are Layer 7 grants: they are enforced by the rate-limiter middleware reading the freshly resolved grant set, and they apply to module commands only. The cooldown books only on a successful handler return — a failed command execution does not consume the cooldown.

### 8.9 /permit rate-limit — Interactive Flow

When `/permit rate-limit` is invoked:

**Step 1: Command Selection** — Dropdown to select a module command or the module itself.

**Step 2: Target Selection** — Dropdown to select a user, role, group, or set. Search is enabled.

**Step 3: Rate-Limit Details** — Shows the current rate-limit settings:

- **Current rate limit:** the usage allowance and window (e.g., "10 uses per minute per user").
- **[Set Rate Limit]:** Opens a modal to set a new limit (number of uses, time window, scope: USER/GUILD/CHANNEL/GLOBAL).
- **[Remove Rate Limit]:** Removes the custom rate limit, reverting to the command's default.
- **[Edit Rate Limit]:** Opens a modal to modify the existing rate-limit parameters.

Rate-limit grants are Layer 7 grants enforced by the rate-limiter middleware with atomic check-and-increment operations for cross-process consistency. A user exceeding the limit sees the `RATE_LIMITED` formal notice frame; a user inside an active cooldown sees `COOLDOWN`.

### 8.10 Density Modes — Permit

- **Mode D:** Full flow — banner, the step content in full (dropdown listings, grant detail cards), footer.
- **Mode M:** No banner; dropdown options show name + module only (descriptions dropped); grant cards collapse to two lines.
- **Mode C:** A single line naming the current step and selection (e.g., "Permit · grant · ban → @Moderator") plus the footer mode control. The dropdowns of the active step remain interactive.

### 8.11 Title & Attribution

The permit page uses:
```
Dumby | Permit
-# Developed by Quixotic Mnemonics v5.0.0
```

---

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

## DIVISION 10 — HELLO WORLD STANDARD-TIER MODULE

---

### 10.1 Overview

A simple "Hello World" Standard-tier module for testing the Dumby dashboard, module listing, marketplace, navigation, and renderer systems. This module provides a single `/hello` command that responds with "Hello, World!" — and it is the reference example of the schema-declared authoring model (§1.7): the module declares a command schema and returns data; the Renderer does everything else.

### 10.2 Module Specification

**Module name:** `hello-world`
**Tier:** Standard
**Version:** 1.0.0
**Description:** A simple hello world module for testing the Dumby dashboard and module system.
**Developer:** Quixotic Mnemonics (`qm-dev-001`)
**Commands:** 1 (`/hello`)
**Marketplace category:** `utility`

### 10.3 Manifest

```typescript
// hello-world/manifest.ts — the module's declared contract

import { z } from 'zod';

export const manifest = {
  name: 'hello-world',
  version: '1.0.0',
  description: 'A simple hello world module for testing the Dumby dashboard and module system.',
  tier: 'standard' as const,
  hardcoded: false,
  releaseStatus: 'public' as const,
  devId: 'qm-dev-001',
  buildId: 'hello-world-1.0.0-001',
  marketplaceCategory: 'utility' as const,
  required: false,
  depends: [],
  provides: [],
  intents: [],
  partials: [],
  commands: [],  // populated via command schema references
  events: [],
  services: [],
  repositories: [],
  jobs: [],
  tasks: [],
  routes: [],
  middleware: [],
  migrations: [],
  locales: './locales',
  config: z.object({
    greeting: z.string().default('Hello, World!'),
  }),
  eventsCatalog: {},
  assetsPath: './assets',
};
```

The module lives in the Standard-tier volume; the tier-volume layout and its mount points are specified in blueprint.md §7.3 and directory.md.

### 10.4 Module Structure

```
hello-world/
├── manifest.ts               ← Module contract declaration
├── index.ts                   ← onLoad / onReady / onUnload lifecycle hooks
│
├── commands/
│   └── hello.command.ts       ← /hello command schema & handler
│
├── locales/
│   └── en-US.json            ← Required locale file
│
├── assets/
│   ├── banner.png            ← YouTube thumbnail-size banner (1280×720)
│   └── logo.png              ← Module logo image
│
└── __tests__/
    └── hello.command.test.ts ← Unit test
```

### 10.5 Command Implementation — Schema Declaration

The `/hello` command is authored as a declared schema plus a data-returning handler. The module never constructs components, embeds, or flags: the Renderer derives the entire presentation from the schema.

```typescript
// hello-world/commands/hello.command.ts

import { defineCommand } from 'swastik';

export const helloCommand = defineCommand({
  name: 'hello',
  description: 'Responds with a hello world greeting',
  pages: ['greeting'],
});

export async function execute(interaction, context) {
  // Return data against a declared page — the Renderer handles the
  // buffer, the frame, the A4 title & attribution, and the modes.
  return {
    page: 'greeting',
    data: {
      greeting: context.config.greeting,   // "Hello, World!"
      module: 'hello-world',
      version: '1.0.0',
      developer: 'Quixotic Mnemonics',
    },
  };
}
```

When `/hello` is invoked:

1. The Renderer sends the buffer embed instantly (§2.1).
2. The handler executes and returns the `greeting` page data.
3. The buffer is edited into the greeting render — a Components V2 frame in the current density mode: Mode D carries the banner, the A4 identity band (`Dumby | Hello World`, `-# Developed by Quixotic Mnemonics v1.0.0`), the greeting content, the footer, and (per §1.4) no navigation dropdown in Mode D for this terminal confirmation unless the user arrived via navigation; Mode C renders the greeting as a single line with the identity band.

The handler contains no component construction, no embed usage, no flag handling — a violation of any of these fails closed at the dispatch boundary (§1.7, §1.8).

### 10.6 Lifecycle Hooks

```typescript
// hello-world/index.ts

export async function onLoad(container) {
  // Initialize module — no special setup needed for hello-world
  const logger = container.resolve(TOKENS.Logger);
  logger.info('hello-world module loaded');
}

export async function onReady(client) {
  // Gateway connected — nothing to do for hello-world
  const logger = container.resolve(TOKENS.Logger);
  logger.info('hello-world module ready');
}

export async function onUnload() {
  // Cleanup — nothing to clean up for hello-world
}
```

### 10.7 Locale File

```json
// hello-world/locales/en-US.json
{
  "hello.response": "Hello, World!",
  "hello.description": "Responds with a hello world greeting"
}
```

### 10.8 Assets

**banner.png:** A 1280×720 image with the official accent colour (`#5865F2`) gradient, the hello-world module logo emoji, and the module name "Hello World" centred.

**logo.png:** A simple module logo image that can be rendered as an emoji-format icon in Discord.

If either asset is missing, the Renderer generates the default in the official accent colour (§3.10). The accent itself is fixed — modules do not carry their own accent colour (§1.6).

### 10.9 Dashboard Integration

When the hello-world module is installed and enabled in a guild:

1. It appears in the `/modules` command's module list with its logo emoji prefix.
2. It appears in the `/browse` command's installed modules list.
3. It appears in the dashboard dropdown navigation, prefixed with `✅` (installed).
4. Selecting it from the dropdown navigates to its module page, showing its banner, title ("Dumby | Hello World"), developer attribution, description, commands, and usage.
5. The `/hello` command is available as a slash command in the guild, and every invocation is buffered then rendered (§10.5).

### 10.10 Testing Checklist

The hello-world module is designed to test:

- [ ] Module loads successfully at bootstrap without errors
- [ ] `/hello` command appears in the guild's slash command list
- [ ] `/hello` responds with the buffer embed first, then the greeting render
- [ ] The greeting render is a Components V2 frame — no classic embed is ever emitted
- [ ] The render carries the A4 title and attribution grammar (`Dumby | Hello World` / `Developed by Quixotic Mnemonics v1.0.0`)
- [ ] Module appears in `/modules` list with logo emoji
- [ ] Module appears in `/browse` installed list
- [ ] Module appears in dashboard dropdown with `✅` prefix
- [ ] Module detail page shows correct banner, title, developer, and version
- [ ] Density modes switch correctly on the greeting render and module page (D/M/C)
- [ ] A non-invoker's interaction with the greeting render's components is silently rejected
- [ ] Module can be disabled (Standard-tier, per-guild disableable)
- [ ] When disabled, module disappears from slash command list
- [ ] When disabled, module appears in `/browse` as "Previously Installed"
- [ ] Module can be re-enabled from the marketplace listing
- [ ] Uninstall button removes the module and returns to the modules list

---

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
1. Start a 1280×720 canvas with a gradient background in the official accent colour, `#5865F2`.
2. Centre the module's logo emoji on the banner.
3. Add the module's name as text below the logo.
4. Save and serve the generated banner.

This ensures every module page has a visually consistent banner regardless of whether the module author provided one — and every generated banner carries the single official accent.

### 11.6 Title & Attribution Format

The title format for all pages follows the single A4 grammar (§1.5):

```
Dumby | {PageName}
-# Developed by {Developer} v{Version}
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
- **Power Engine Panel web interface** — the PEP web interface is an administrative surface.
- **Twill registration API** — persona creation and configuration (blueprint.md §35, §44). `/persona` only lists.

The end-user interface of Dumby is the Discord-facing Components V2 dashboard system specified in this reference: the Core Command Surface, its navigation, and the renderer grammar that issues every one of them.

---

*End of Dumby End-User Application Reference — Version 5.0.0*
