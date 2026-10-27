---
id: SPEC-04-REQUEST-LAYER-0003
title: DIVISION 0 — SYSTEM OVERVIEW & THE CORE COMMAND SURFACE
kind: spec
status: normative
version: 5.0.0
authority_scope: [04-request-layer]
anchors: [DIVISION_0_SYSTEM_OVERVIEW, WHAT_DUMBY_IS, THE_BLUEPRINT_BLUEPRINT_MD, THE_DOCUMENTATION_SET, THE_CORE_COMMAND_SURFACE, SCOPE_OF_THIS_DOCUMENT, CONTRACT, ACCEPTANCE, EDGES_BLUEPRINT]
contracts: [contracts/rbac.enums.json, contracts/commands.json, contracts/ui-renderer.schema.json, contracts/events.catalog.json]
acceptance: [ACC-REQ-0003-1]
owners: [framework-maintainers]
last_verified_commit: null
review_state: pending-evidence
---

## DIVISION 0 — SYSTEM OVERVIEW & THE CORE COMMAND SURFACE

### 0.1 What Dumby Is

Dumby is a Unified Modular Bot System: a single TypeScript application runtime — one process family, one dependency graph, one event bus, one permission engine, one configuration system — into which independently-authored, independently-versioned, independently-toggleable modules are loaded as the exclusive source of every behavior the bot exhibits, administrative capability included. The framework never special-cases itself: every command the framework ships is itself a module, loaded through the identical manifest contract, the identical DI container, and the identical lifecycle hooks a third-party author would use.

The two design words carrying the whole system are **Unified** and **Modular**. Unified means there is exactly one bootstrap sequence, one dependency graph, one event bus, one permission engine, one configuration system, and one operational surface, shared without exception by every feature the framework runs. Modular means every unit of behavior is a self-contained, independently loadable, independently testable, independently disposable module with a declared contract for everything it needs and everything it exposes.

### 0.2 The Blueprint (blueprint.md)

The blueprint is the complete engineering and implementation reference at version 5.0.0 (Consolidated Re-Baseline Edition). It spans 48 numbered sections across 9 parts, covering architecture, design, lifecycle, infrastructure, security, operations, module catalog, power engine panel, and administrative interfaces. Cross-cutting decisions are recorded as Architecture Decision Records under archive/v5.0.0-records/adr/. The stack is TypeScript (strict mode), Node.js LTS ≥ 22, discord.js v14, PostgreSQL, Redis, BullMQ, Fastify, Pino/Prometheus/OpenTelemetry.

Key structural elements from the blueprint relevant to the end-user interface:

- **Module Manifest (§11.2):** The manifest is validated by a strict Zod schema with 28+ fields including name, version, tier, description, devId, commands, events, intents, dependencies, configSchema, and assets path. The manifest is the complete table of contents for a module without opening a second file.

- **Four-Tier System (§13):** Admin (bot-owner-only, dev guild), Core (always loaded, never disabled, RBAC Layer 6 skipped — governed by native Discord permissions), Standard (enabled by default, per-guild disableable), Marketplace (not pre-installed, explicit install required).

- **Permission Engine (§21):** Seven layers. Layer 6 is a pure backend rank function with six ranks — OWNER > ADMINISTRATOR > MODERATOR > HELPER > MEMBER > RESTRICTED — evaluated from live Discord state and never written anywhere. Layer 7 holds guild-side grants — permit, blacklist, whitelist, cooldown, and rate-limit — scoped role > group > set with most-specific-wins resolution, applying to module commands only and never overriding Layers 1–3, the bot-capability check, or the RESTRICTED floor. Grants are resolved fresh on every interaction.

- **Components V2 and the Renderer (§16.5, §20):** The core Renderer is the single presentation authority. Every user-facing surface is a Components V2 container (Container type 17, Text Display type 10, `IS_COMPONENTS_V2` flag 32768). Classic embeds (EmbedBuilder/MessageEmbed) are banned across four enforcement layers, mirroring the prefix-command ban (§4; ADR-001 in archive/v5.0.0-records/adr/).

- **BCCM (§15.8):** Bot Command Cosmetics for Marketplace — guild-level command renaming and aliasing, queued and batched through `guild_command_queue` within a 12–13 hour window rather than instant, constrained by Discord's 200-per-day guild-command-creation limit.

- **Persona System — Twill (§35):** A bring-your-own-identity feature: guild administrators supply their own bot token and application, Dumby hosts the instance, and each persona is bound to exactly one server. Persona creation is handled through the Twill registration API (§44), not through any Discord-facing command. The main bot operates under a complete DM prohibition; Twill instances decide their own DM behavior.

### 0.3 The Documentation Set

The documentation set is anchored by blueprint.md 5.0.0, the engineering authority this reference defers to throughout. Supporting documents: concept.md carries the framework glossary (including the Renderer, buffer embed, formal notice frame, density Modes D/M/C, Core Command Surface, Twill, and Release Manager entries); directive.md carries the ban registry (prefix-command ban, classic-embed ban, DM prohibition) with their enforcement layers; documentation.md is the frozen legacy architecture record, retained for historical decisions that the blueprint supersedes; and archive/v5.0.0-records/adr/ records the cross-cutting tension decisions. Version 5.0.0 is a consolidated re-baseline: every document in the set carries the same version and the same vocabulary.

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

## Contract
- `contracts/rbac.enums.json`
- `contracts/commands.json`
- `contracts/ui-renderer.schema.json`
- `contracts/events.catalog.json`

## Acceptance
```acceptance
- id: ACC-REQ-0003-1
  check: "The Core Command Surface is exactly /dashboard /health /browse /queue /persona /permit /modules /hello"
  test: tests/integration/core-command-surface.spec.ts
```

## Edges (-> blueprint)
- SPEC-04-REQUEST-LAYER -> SPEC-02-ARCHITECTURE (dispatch enters the core runtime)
- SPEC-04-REQUEST-LAYER#RENDERER -> documentation/ (every surface is renderer-issued)
