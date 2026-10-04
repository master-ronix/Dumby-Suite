---
id: SPEC-04-REQUEST-LAYER-0004
title: DIVISION 1 — THE RENDERER: PRESENTATION AUTHORITY
kind: spec
status: normative
version: 5.0.0
authority_scope: [04-request-layer]
anchors: [DIVISION_1_THE_RENDERER, SINGLE_PRESENTATION_AUTHORITY, STATIC_FRAME_GRAMMAR_COMPONENTS, DYNAMIC_SLOTS, DENSITY_MODES_D_M, TITLE_ATTRIBUTION_GRAMMAR, OFFICIAL_ACCENT_COLOUR, AUTHORING_MODEL_SCHEMAS_IN, EMBED_POLICY_COMPONENTS_V2, CONTRACT, ACCEPTANCE, EDGES_BLUEPRINT]
contracts: [contracts/rbac.enums.json, contracts/commands.json, contracts/ui-renderer.schema.json, contracts/events.catalog.json]
acceptance: [ACC-REQ-0004-1, ACC-REQ-0004-2, ACC-REQ-0004-3]
owners: [framework-maintainers]
last_verified_commit: null
review_state: pending-evidence
---

## DIVISION 1 — THE RENDERER: PRESENTATION AUTHORITY

### 1.1 Single Presentation Authority

The core Renderer is the single presentation authority for every Discord-facing surface in Dumby. No module, no core subsystem, and no helper library constructs message payloads directly: every page, every buffer, every formal notice, and every interactive component the user sees is issued by the Renderer against the grammar defined in this division. The engineering contract for the Renderer service is specified in `spec/modules/marketplace-and-mdis.md` §.5 and §20.

Three consequences follow:

- **Visual consistency.** One frame grammar, one accent colour, one typography hierarchy, and one failure voice across every surface — framework and third-party alike.
- **Enforceability.** Bans hold because there is exactly one emission path. The classic-embed prohibition (§1.8) and the prefix-command prohibition (`spec/foundations/non-goals-explicit-boundaries.md` §) are terminal at the Renderer: no code path can route around them.
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

The authoring contract and the `swastik` package that carries it are specified in `spec/modules/building-a-module-a-complete-worked-example.md` § and §17.2. Division 10 contains a complete schema-authored example.

### 1.8 Embed Policy: Components V2 Only

Classic embeds — the discord.js `EmbedBuilder` and `MessageEmbed` types — are banned from every Dumby surface. All presentation is Components V2 containers. The ban is enforced by four layers, mirroring the prefix-command ban (`spec/foundations/non-goals-explicit-boundaries.md` §):

1. **Authoring-time lint** — the lint set rejects `EmbedBuilder`/`MessageEmbed` imports and construction in module and core code.
2. **Load-time validation** — manifest validation and module loading refuse any module whose declared render contract requires classic embeds.
3. **Dispatch-time boundary** — the Renderer is the only emission path; a handler response that is not a valid render descriptor never reaches Discord, and the user sees the formal notice frame instead.
4. **Release gate** — promotion and CI fail any module or core change that reintroduces classic embed construction; the same gate audits the renderer path so that new ingestion surfaces are covered as they appear.

A migration window applies per ADR-001 (docs/adr/). Within the window, modules still emitting classic embeds are flagged by layers 1 and 4; when the window closes, all four layers enforce unconditionally.

---

---

## Contract
- `contracts/rbac.enums.json`
- `contracts/commands.json`
- `contracts/ui-renderer.schema.json`
- `contracts/events.catalog.json`

## Acceptance
```acceptance
- id: ACC-REQ-0004-1
  check: "Every surface is issued by the Renderer using the Components v2 grammar (Container/TextDisplay/Separator/ActionRow)"
  test: tests/integration/renderer-grammar.spec.ts
- id: ACC-REQ-0004-2
  check: "The accent is the single non-configurable blurple #5865F2 and titles follow the A4 grammar"
  test: tests/unit/renderer-accent-title.spec.ts
- id: ACC-REQ-0004-3
  check: "Classic embeds are banned: no `EmbedBuilder`/`MessageEmbed` import passes the lint/grep gate"
  test: tests/arch/embed-ban.spec.ts
```

## Edges (-> blueprint)
- SPEC-04-REQUEST-LAYER -> SPEC-02-ARCHITECTURE (dispatch enters the core runtime)
- SPEC-04-REQUEST-LAYER#RENDERER -> documentation/ (every surface is renderer-issued)
