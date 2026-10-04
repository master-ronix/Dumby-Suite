---
id: DOC-GUIDE-BUILD-A-MODULE
title: Building a Module — Developer's Guide
kind: documentation
status: derived
version: 5.0.0
authority_scope: [guides, modules]
contracts: [contracts/module-manifest.schema.json]
owners: [framework-maintainers]
---
# Building a Module — Developer's Guide

The practical, end-to-end guide for writing a Dumby module: what a module *is*, the
contract it must satisfy, how to build each layer, how to test it, how it reaches
production, and how it plugs into the rest of the ecosystem. Read this to *learn the
craft*; read `spec/modules/` to settle an argument.

This guide is grounded in the authoring surface the framework actually exposes —
`packages/swastik`, the module package layout, and the promotion flow — so the code
samples here compile against the real package. Where the specification is wider than the
current implementation, the guide says so and points at the gap rather than quietly
following the narrower shape.

---

## 1. What a module actually is

A module is a **self-contained vertical slice** of the bot: a package that owns its own
commands, services, repositories, jobs, migrations, configuration schema, and
translations, and that reaches the rest of the system only through declared, typed
contracts. It is not a folder of command files. It is an independently-versioned,
independently-toggleable unit whose boundary the build enforces.

Two things are true of every module, first-party or third-party:

- It is authored in `packages/modules/<slug>/` (or, for a community module, uploaded to
  Swastik), never inside `apps/main/src`. The framework discovers it at runtime from a
  per-tier volume, not from a hardcoded list.
- It is admitted through the identical contract a framework author uses. There is no
  privileged path — the eight first-party modules are ordinary packages.

---

## 2. The four-step path

1. **Scaffold** — create the canonical package layout.
2. **Manifest** — declare identity, tier, commands, dependencies, config, and events.
3. **Implement the layers** — command → service → repository → job, plus config and
   locale.
4. **Test, document, submit** — pass the test pyramid, then walk the promotion pipeline.

Everything else in this guide elaborates one of those four steps.

---

## 3. Step 1 — Scaffold

A module is a package with the canonical layout. The framework ships a template
(`packages/swastik/_template/`) whose folders are the ones the loader and the tooling
expect:

```
packages/modules/<slug>/
├── manifest.json          ← identity + contract (the only file the loader reads first)
├── package.json           ← name, version, the @workspace/swastik dependency
├── tsconfig.json
├── src/
│   ├── index.ts           ← the module entry: exports commands + lifecycle hooks
│   └── commands/          ← one file per command
├── services/              ← business logic
├── repositories/          ← the only path to your tables
├── jobs/                  ← background / scheduled work
├── events/                ← event handlers
├── migrations/            ← your tables, versioned and reversible
├── config/                ← your config schema
├── locales/               ← en-US.json (required) and others
├── assets/                ← static assets your module serves
├── ui/                    ← the MDIS dashboard schema, if you expose one
└── tests/                 ← colocated tests
```

The `src/index.ts` entry exports your commands and your lifecycle hooks; the loader
imports it and calls the hooks in order (see §12).

---

## 4. Step 2 — The manifest

The manifest is the complete contract. It is the one file that tells the framework
everything it needs to admit, validate, and load the module, and the one file a reviewer
reads to understand what the module does without opening another file (principle P1).

The specified field set is the one in `contracts/module-manifest.schema.json`. In
outline:

- **Identity** — `name` (lowercase-kebab-case), `version` (semver), `description`, `tier`
  (`admin` | `core` | `standard` | `marketplace`).
- **Classification** — `devGuildOnly` (true only for Admin tier), `hardcoded` and
  `hardcodeGuildId` (a private, single-guild build), `visibility` and `releaseStatus`
  (the publication state), `devId` and `buildId` (the developer and build identifiers),
  `marketplaceCategory` (required for Marketplace tier), and `required` (whether a load
  failure is fatal).
- **Contract** — `provides` (the DI tokens you publish) and `depends` (the tokens you
  consume), `commands`, `events` and `eventsCatalog`, `services`, `repositories`, `jobs`,
  `tasks`, `routes`, `middleware`, `migrations`, `locales`, `config`, `dashboardSchema`,
  and `crossModuleReads`.

```
manifest.json — the health module's, in full

{
  "name": "health",
  "version": "1.0.0",
  "description": "Displays comprehensive system health and diagnostic information.",
  "tier": "core",
  "hardcoded": false,
  "releaseStatus": "stable",
  "marketplaceCategory": "utility",
  "required": false,
  "depends": [], "provides": [], "intents": [], "partials": [],
  "commands": [{ "name": "health", "description": "Displays comprehensive system health." }],
  "events": [], "services": [], "repositories": [], "jobs": [], "tasks": [],
  "routes": [], "middleware": [], "migrations": [], "locales": ["en-US"],
  "config": {}, "eventsCatalog": [], "crossModuleReads": []
}
```

**The tier co-constraints** are enforced mechanically and are the manifest's sharpest
rules:

- `tier: 'admin'` ⇒ `devGuildOnly: true`; no other tier may set it.
- `tier: 'marketplace'` ⇒ a `marketplaceCategory` must be present.
- `tier: 'core'` ⇒ no command may declare an RBAC requirement (Core is RBAC-exempt).

> **Code gap to be aware of.** The specification describes a richer manifest than the
> runtime schema currently validates: `visibility` as a required field, `releaseStatus`
> as `['private','public']`, `depends`/`provides`/`services` as arrays of structured
> objects, `devId`/`buildId` as required, and `marketplaceCategory` as a closed enum. The
> current `manifest.json` schema accepts the narrower shape shown above. Per the project's
> standing rule the specification is the target; these are implementation gaps, listed in
> `status/code-reconciliation.json`. Write to the specification, and expect the loader to
> tighten to it.

---

## 5. Step 3 — Implement the layers

### 5.1 The command layer — declare a schema, return page data

A command is authored with `defineCommand` from `@workspace/swastik`. It declares a name,
a description, the pages it renders, its permission requirement, and an `execute`
function. **The handler returns page data, not a Discord payload.** The core Renderer
derives the entire presentation — frame, accent, components, density mode — from what you
return. You never construct components or embeds; the classic-embed ban is enforced at
the architectural layer, not by your discipline.

```ts
import { defineCommand } from '@workspace/swastik';

export const helloCommand = defineCommand({
  name: 'hello',
  description: 'Responds with a hello world greeting',
  pages: ['greeting'],
  permissions: { rbac: 'MEMBER' },
  execute: (_interaction, context) => ({
    page: 'greeting',
    data: {
      greeting: String(context.config['greeting'] ?? 'Hello, World!'),
      module: 'hello-world',
      version: '1.0.0',
      developer: 'Quixotic Mnemonics',
    },
  }),
});
```

The command validates its input and delegates. It does not hold business rules and it does
not touch the database — the three-layer rule (P3) makes a command that imports a
repository a build failure.

### 5.2 The service layer — where business rules live

A service holds the logic: it takes validated input, applies the rules, coordinates
repositories, and emits domain events. It receives its dependencies — repositories, the
logger, the event bus — through its constructor, resolved by the DI container from tokens
(§10). A service never reaches for a global and never queries the database directly.

### 5.3 The repository layer — the only path to your tables

Your module owns its tables outright (module sovereignty, P2). Every read and write goes
through a repository class, which issues SQL through Knex — there is no ORM and no
active-record entity. Repositories may not import the event bus, because emitting an event
from a repository is a layering violation. Cross-module reads never query another module's
table: they call that module's `ForCrossModuleRead` accessor (§14), a single-row lookup by
key.

### 5.4 The job layer — idempotent by contract

Work that must happen later, or must survive a restart, is a BullMQ job. Jobs are
at-least-once, so **every job must be idempotent**: running it twice must be safe. A job
that schedules a future state change (a scheduled mute, a timed close) is enqueued by a
subscriber reacting to a domain event, not by the service that emitted it — that keeps
business logic decoupled from the queue.

### 5.5 The anti-pattern catalog — what the build rejects

These are build failures, not review comments:

- Importing another module's files (`../../other-module/...`).
- Importing a repository from a command handler (breaks the three-layer rule).
- Importing `EmbedBuilder` / `MessageEmbed` (classic-embed ban).
- Emitting an event from a repository.
- Emitting an event whose name is not in your manifest's `eventsCatalog`.
- Using a raw `setTimeout` / `setInterval` instead of the timer service.
- Reaching a database client, a Redis client, or the filesystem directly.

### 5.6 Errors — one taxonomy, one notice frame

Throw from the framework's error taxonomy (`DumbyError` and its subclasses) so the root
error boundary can classify the failure. You never build the user-facing failure message:
the Renderer issues a formal notice frame carrying a reason code and a trace correlation
id. A module that fails does not go silent.

---

## 6. Step 4 — Test, document, submit

Write unit tests against the `MockContainer`, which replaces every external dependency
with an in-memory double — no database, no network. Write integration tests for the seams
(real Postgres and Redis). Meet the coverage floor. Document the module's public surface
(its provided tokens, its emitted events, its commands, its config). Then walk the
promotion pipeline (§8).

---

## 7. The `swastik` package — your only import surface

`@workspace/swastik` is the module-authoring package, and it is the **only** workspace
package a module may import. It exports:

- `defineModule` and the `ModuleManifest` / `ModuleTier` / `ModuleLifecycle` types;
- `defineCommand` and the `CommandContext`, `CommandDeclaration`, `CommandHandler`, and
  `CommandPageData` types;
- `moduleTiers`.

A module may not import from `apps/main/src` or any other workspace package. The bundle
that Swastik stages inlines the module's own sources and runs a syntax check on the
result, so an out-of-bounds import fails before the module is ever promoted.

---

## 8. How your module reaches production (the Swastik pipeline)

Modules are never committed into the application image. They travel a promotion pipeline:

1. **Build** — `pnpm build:modules` compiles the first-party module sources to bundles.
2. **Seed / upload** — `pnpm seed:modules` (first run with `--provision-governance`, then
   `--human-approved`) promotes modules onto their tier volumes. A community module is
   uploaded to Swastik instead.
3. **Stage** — the module lands in the staging area (`swastik-staging`) for validation.
4. **Promote** — Swastik validates the manifest and tier, then promotes the module to the
   volume matching its declared tier under `MODULES_DIR` (`/mnt/modules`): `modules-admin`,
   `modules-core`, `modules-standard`, or `modules-marketplace`. A tier mismatch at rest
   aborts the volume scan.
5. **Discover** — at the next startup (or hot-swap), the loader blind-discovers the module
   on its volume and loads it through the identical contract.

The seed flow needs `INTERNAL_API_KEY` and `DATABASE_URL`; the first promotion of a module
requires the human-approved flag, because a first promotion is a governance act.

---

## 9. How your module plugs into the ecosystem

Five sanctioned patterns, and only five, connect your module to the rest (§14):

1. **Internal event bus** — emit a `{domain}.{entity}.{action}` event; any subscriber
   reacts, and you never know who.
2. **Published DI token** — publish a service in `provides`; a consumer declares the same
   token in `depends` and receives it, typed against your contract.
3. **Cross-module read-only lookup** — a `ForCrossModuleRead` accessor for a cheap
   single-row read; never a write.
4. **Job scheduling via the event bus** — a subscriber turns your emitted event into queued
   work.
5. **Global Data Emit** — a durable, schema'd public dataset with a read/aggregate API
   (ADR-004).

Any cross-module interaction not expressible as one of these five is an architecture
violation.

### 9.1 The subsystems your module builds against

You do not build these; you *use* them. Here is exactly how each one touches your code.

- **Manifest** — `module.manifest.ts`, validated by the `swastik` schema. It declares your
  identity (`name`, `tier`, `devId`), your `depends`/`provides` tokens, your `commands`,
  your `events`, and your `services`. Nothing you do at runtime is legal unless the manifest
  declares it. This is the file the loader reads (via AST extraction, never `import()`) and
  the file the marketplace reads.
- **RBAC / the permission engine** — you do **not** write permission checks. You declare a
  requirement on the command (`rbac: { permission: 'moderation.ban', level: 'guild' }`) and the
  seven-layer resolver enforces it before your handler runs. Core-tier commands must not
  declare RBAC (Core is RBAC-exempt). Name the requirement correctly; do not call a checker.
- **Renderer** — you never build an embed or a message payload. Your command returns *page
  data* (title, slots, rows, buttons); the Renderer composes the Components v2 frame, applies
  the accent token, and renders it. Classic `EmbedBuilder`/`MessageEmbed` is banned outright
  (ADR-001). If you find yourself formatting a string into a box, you are doing the Renderer's job.
- **BCCM (the command-collision & change-queue manager)** — when your module registers
  commands, BCCM owns the guild command registry: it detects collisions (fatal), batches the
  per-guild upsert into the change queue, and enforces the command ceiling. You register through
  the framework; BCCM is why you never call Discord's command API directly, and why a name
  collision with another module stops the build rather than silently winning.
- **Swastik** — the promotion pipeline (see §8). It compiles, signs, and promotes your module
  onto its tier volume; hot-swap and rollback are its concern, not yours.
- **Credentials Service / Power Engine** — if your module issues or checks developer
  credentials, it delegates to the Credentials Service; if it enforces policy, it routes
  through the Power Engine. You never store or compare a raw token yourself.

---

## 10. The execution trace — what happens when a user runs your command

Your command's `execute` is the *last* thing to run, not the first. When a user invokes
it:

1. The gateway delivers the interaction; the router looks up your command.
2. The module-active check passes (your module is enabled for this guild).
3. The twelve-stage middleware pipeline runs in priority order — maintenance, admin gate,
   trace, auth, guild config, locale, rate limit, permission, RBAC, cooldown, defer,
   analytics.
4. Your `execute` runs and returns page data.
5. The Renderer validates the data against your declared page schema and issues the
   render; the middleware `.after` hooks run in reverse order.
6. Metrics and the trace span close; the user sees the response.

Read this once and you know where every concern lives: authorization is the engine's,
presentation is the Renderer's, validation is yours, business logic is the service's,
persistence is the repository's, and observability is threaded through all of it by one
correlation id.

---

## 11. What "done" looks like

A module is done when: it has the canonical layout; its manifest validates and satisfies
the tier co-constraints; every layer respects the three-layer rule; every job is
idempotent; its events are catalogued; its tables are owned and migrated reversibly; its
unit and integration tests pass and the coverage floor is met; it ships an `en-US.json`;
and it loads, responds, and unloads cleanly through the promotion pipeline.

---

## 12. The lifecycle hooks

Your module entry exports three hooks, called by the loader in order:

- `onLoad(container)` — runs at Stage 12, in topological dependency order. Register your
  services and repositories here; resolve what you depend on.
- `onReady(client)` — runs at Stage 17, once the gateway is connected. A failure here
  disables your module alone, with a warning — the bot stays live.
- `onUnload()` — runs during shutdown (Step 03) in reverse load order, and on hot-swap.
  Cancel your timers, flush your in-memory state, release your resources. The framework
  auto-clears anything registered through the timer service, the event bus, and the cache
  manager, so a missed cleanup cannot leak past your lifecycle.

---

## 13. Choosing a tier

- **Admin** — bot-owner-only infrastructure; dev-guild-only, non-disableable, unlimited
  resources, P0 on error. Rarely the right answer for a feature.
- **Core** — framework-essential, every guild needs it; non-disableable, RBAC-exempt.
- **Standard** — a common feature a guild may toggle; enabled by default, disableable.
- **Marketplace** — optional, resource-heavy, or third-party; opt-in. Third-party
  developers are always Marketplace.

Declare the tier honestly: it is enforced at rest, and a mismatch between your declared
tier and your volume aborts the scan.

---

## 14. Publication

Run the full suite, the contract tests, the linter, and the type checker; meet the
coverage floor; pass the security review (no hardcoded secrets, input sanitised, output
encoded, dependencies scanned); create the catalogue entry and a release tag. Then watch
resource usage and errors through the control plane, respond to feedback, ship patch and
minor versions, and deprecate deliberately when the module is no longer maintained.

---

*Learn the craft here; settle the argument in the spec. The module contract is the
framework's front door — build as if you were writing the hundredth module, because the
system was designed so that the hundredth is exactly as safe, fast, and well-tested as
the first.*
