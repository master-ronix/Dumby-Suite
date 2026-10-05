---
id: SPEC-04-REQUEST-LAYER-0013
title: DIVISION 10 — HELLO WORLD STANDARD-TIER MODULE
kind: spec
status: normative
version: 5.0.0
authority_scope: [04-request-layer]
anchors: [DIVISION_10_HELLO_WORLD, OVERVIEW, MODULE_SPECIFICATION, MANIFEST, MODULE_STRUCTURE, COMMAND_IMPLEMENTATION_SCHEMA_DECL, LIFECYCLE_HOOKS, LOCALE_FILE, ASSETS, DASHBOARD_INTEGRATION, TESTING_CHECKLIST, CONTRACT]
contracts: [contracts/rbac.enums.json, contracts/commands.json, contracts/ui-renderer.schema.json, contracts/events.catalog.json]
acceptance: [ACC-REQ-0013-1]
owners: [framework-maintainers]
last_verified_commit: null
review_state: pending-evidence
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

## Contract
- `contracts/rbac.enums.json`
- `contracts/commands.json`
- `contracts/ui-renderer.schema.json`
- `contracts/events.catalog.json`

## Acceptance
```acceptance
- id: ACC-REQ-0013-1
  check: "`/hello` (hello-world, devId qm-dev-001) returns "Hello, World!" via Components V2"
  test: tests/integration/hello.spec.ts
```

## Edges (-> blueprint)
- SPEC-04-REQUEST-LAYER -> SPEC-02-ARCHITECTURE (dispatch enters the core runtime)
- SPEC-04-REQUEST-LAYER#RENDERER -> documentation/ (every surface is renderer-issued)
