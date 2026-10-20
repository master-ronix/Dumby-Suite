---
id: SPEC-03-MODULES-0012
title: 12. Building a Module — A Complete Worked Example
kind: spec
status: normative
version: 5.0.0
authority_scope: [03-modules]
anchors: [BUILDING_A_MODULE_A, THE_AUTHORING_CONTRACT_IN, STEP_1_SCAFFOLD, STEP_2_THE_MANIFEST, PNPM_BUILD_MODULE_SINGLE, STEP_3_THE_COMMAND, STEP_3_CONTINUED_THE, STEP_3_CONTINUED_MIGRATION, STEP_4_THE_UNIT, THE_FULL_EXECUTION_TRACE]
contracts: [contracts/module-manifest.schema.json]
acceptance: [ACC-MOD-0012-1, ACC-MOD-0012-2, ACC-MOD-0012-3]
owners: [framework-maintainers]
last_verified_commit: null
review_state: pending-evidence
---

## 12. Building a Module — A Complete Worked Example

**Status:** [SPEC]

### 12.1 The Authoring Contract, In Brief

A four-step path from an empty directory to a reviewed, installable artifact: **scaffold**
a manifest-valid skeleton; **define** the manifest and command surface (choosing the tier
honestly against the actual command list, §13); **implement** the entry, logic, and data
layers each in its own file (the three-layer rule, §11.5); then **test, document, and
submit** — a unit test per service, an integration test per database-touching path, the
`eventsCatalog` kept current, and, for a third-party module, the five-gate review pipeline
(§16).

The worked example below (a "reminders" module) is a **teaching artifact** illustrating
the framework's own conventions — not a specification of what any catalogued module must
contain. It is grounded in the real authoring surface: `defineCommand` from
`@workspace/swastik`, a handler that returns **page data**, and the 11-folder layout.

### 12.2 Step 1 — Scaffold

`pnpm dumby scaffold module reminders` prompts for a description, the structural
components (commands, services, repositories, jobs, events, routes), whether database
tables are needed (generating a skeleton migration), a config schema stub, and a locale
stub. The output is a skeleton at `packages/modules/reminders/` whose manifest validates
against the schema, and which is **registered but DISABLED** — you enable it explicitly
once it does something.

### 12.3 Step 2 — The Manifest

The manifest declares identity, tier, the command surface, dependencies, jobs, services,
repositories, migrations, locales, and the `eventsCatalog`. For the reminders module: a
`standard` tier (it is a feature a guild may toggle), `hardcoded: false`, a `devId` issued
at registration and a `buildId` issued per uploaded version, `intents: []` (DMs are sent
over REST, not a gateway subscription), one command, one queue (`reminders:deliveries`),
one service with its repository, queue, and event-bus dependencies, and two catalogued
events (`reminders.reminder.scheduled`, `reminders.reminder.delivered`).

> **Authoring-surface note.** The specification describes the manifest as a `.ts` file
> exporting `defineManifest(...)` with typed class references and structured
> `depends`/`provides`/`services` entries. The current tree ships a `manifest.json` per
> module and a `@workspace/swastik` package that exports `defineModule` and
> `defineCommand`. The richer typed shape is the target; the JSON shape is the interim.
> Both are covered in `status/code-reconciliation.json` (REC-003, REC-004, REC-020).

### 12.4 Step 3 — The Command Layer

A command is authored with `defineCommand`. It declares a name, a description, the pages
it renders, its permission requirement, and an `execute` function. Validation is the
command layer's job; the handler parses input, throws a typed `ValidationError` on bad
input, delegates to the service, and returns **page data** — never a Discord payload.

```ts
import { defineCommand } from '@workspace/swastik';

export const helloCommand = defineCommand({
  name: 'hello',
  description: 'Responds with a hello world greeting',
  pages: ['greeting'],
  permissions: { rbac: 'MEMBER' },
  execute: (_interaction, context) => ({
    page: 'greeting',
    data: { greeting: String(context.config['greeting'] ?? 'Hello, World!') },
  }),
});
```

The core Renderer derives the entire presentation from the returned data. Two operational
facts to keep in mind: Swastik remains a separate process and the runtime does **not**
watch the filesystem for module changes — activation is driven by an explicit swap request
through Swastik, not filesystem events; and in-process hot-swap is implemented as a
dedicated reload handler (`onUnload → re-import → onLoad → onReady`) on a mounted volume,
not by a rolling restart.

### 12.5 Step 3, Continued — The Service Layer

The service holds the business rules and is constructed with its dependencies (repository,
queue, event bus). For `schedule`, the rules are: a horizon check (throw
`ValidationError('REMINDERS_TOO_FAR_OUT', { maxDays: 90 })` if too far out), create the
reminder with `status: 'pending'`, then emit `reminders.reminder.scheduled`.

Note the decoupling: the service does **not** enqueue the job itself. A dedicated
subscriber owns the event → job translation, so the scheduling logic can change without
touching the business decision. And `emit` invokes the subscriber synchronously but does
**not** await its async work — `schedule` returns as soon as the subscriber is invoked,
not once its enqueue has settled.

### 12.6 Step 3, Continued — The Repository Layer

The repository extends the framework's typed base repository, declares the one table it
owns (exclusively, per P2), and exposes query methods. `findDuePending(before, limit)`,
`create`, `findById`, and `updateById` are the shape. Every read and write goes through
Knex here; there is no ORM and no active-record entity.

### 12.7 Step 3, Continued — The Job Layer

The delivery job extends the framework's processor base. The queue manager must hold a
module-scoped worker-lifecycle map and close each worker on a processor swap, so a stale
reference to retired code cannot survive a hot-swap. `process(job)` fetches the reminder,
performs an **idempotency check** (BullMQ is at-least-once, so a re-run must be a safe
no-op — `if (!reminder || reminder.status !== 'pending') return`), sends the DM, marks the
reminder delivered, and emits `reminders.reminder.delivered`.

### 12.8 Step 3, Continued — Migration and Locale

The migration creates the module's own table with its columns, a status column, audit
columns, and an index on the columns the read path filters on, plus a working `down()`.
The locale file ships at least `en-US.json` — its absence fails Stage 11 validation.

### 12.9 Step 4 — The Unit Test

The unit test uses the `MockContainer`, which replaces every external dependency with an
in-memory double. It asserts that `schedule` creates a pending reminder and emits the
scheduled event, and that a reminder beyond the maximum horizon is rejected with the
expected `ValidationError`. No database, no network.

### 12.10 The Full Execution Trace

```
DIAGRAM 12-A — /remind create through delivery, end to end

User → middleware pipeline (auth, guild-config, rate-limit, permission, RBAC, cooldown)
     → RemindCommand.execute (parses "in 1 hour" → fireAt; validation HERE)
     → ReminderService.schedule (horizon check)
     → ReminderRepository.create → INSERT into PostgreSQL
     → EventBus.emit('reminders.reminder.scheduled')   (synchronous subscriber)
         → subscriber enqueues the BullMQ job (jobId reminder:{id}, delay 1 hour)
     → interaction reply ("Got it — I'll remind you in 1 hour.")

one hour later:
BullMQ worker → ReminderDeliveryJob.process (idempotency check: still pending? yes)
     → Discord REST sends the DM → updateById(status: 'delivered')
     → emit 'reminders.reminder.delivered'
```

### 12.11 What "Done" Looks Like

A finished module declares its tier honestly; owns every table it touches; publishes a
`provides`/`eventsCatalog` surface exactly as wide as others genuinely need and no wider
(anything published becomes part of its own semver contract); meets the unit and
integration coverage floor; and, if third-party, has passed the five-gate review pipeline.
The contract is identical for core-shipped and third-party modules — the module system
**is** the framework's public extension API.

### 12.12 Choosing the Right Tier

Third-party developers always ship Marketplace. The framework team chooses Admin if the
module manages the bot itself, Core if it is framework-essential for every guild, and
Standard if it is a common feature a guild may toggle. The full tier model is §13.

### 12.13 Designing the Module's Interface

Design the commands, events, permissions, configuration, and dashboard before coding.
Command design follows progressive disclosure — prefer `/ban`, `/kick`, `/warn` over a
"god command" with an `action` option. Event design subscribes minimally (a specific event
name, not a wildcard). Permission design is granular (a separate permission per function).
Configuration design gives every field a working default, so a module can be enabled with
no config and still function.

### 12.14 Implementing the Lifecycle Hooks

`onLoad` creates caches and prepares resources; `onEnable` starts active processes;
`onDisable` stops them; `onUnload` clears caches and releases references (after it, the
code is gone from memory); `onConfigChange` updates cached values. Each must be idempotent
(§11.7).

### 12.15 Implementing Command Handlers — Five Patterns

**Validate-first** (check every precondition before acting); **confirm-destructive** (use
the confirmation helper for ban/kick/delete/reset); **defer-long-running** (defer for work
over ~2.5 s); **paginate-large-results** (use the pagination helper); **ephemeral-sensitive**
(send sensitive data so only the invoker sees it).

### 12.16 Implementing Event Handlers — Four Patterns

**Filter-early** (check relevance and return immediately if the event is not for you);
**cache-first** (check the cache before the database); **fire-and-forget** (for events that
need no response); **respond-if-configured** (check config before sending anything).

### 12.17 Writing Tests

The pyramid is broad unit tests, a narrower integration layer, and a small end-to-end tip.
Unit tests mock their dependencies through the `MockContainer` and run in milliseconds;
integration tests use real Redis and PostgreSQL and cover database access, event delivery,
and the middleware pipeline; contract tests, provided by the framework team, verify the
module satisfies the module contract and run against every module.

### 12.18 Preparing for Publication

Run the full suite, the contract tests, the linter, the type checker, and the coverage
report against the floors; perform the security review (no hardcoded secrets, input
validated, output encoded, errors handled, dependencies scanned); create the catalogue
entry and a release tag.

### 12.19 Post-Publication

Monitor resource usage and errors through the control plane, respond to feedback, ship
patch versions for fixes and minor versions for features, update dependencies and re-run
the Module Gateway verification, and deprecate deliberately when the module is no longer
maintained.

### 12.20 The `swastik` Authoring Package

Module authoring code imports the `swastik` package — a versioned, standalone package with
**scoped entry points**, not deep framework-path imports. It is published and versioned
independently of the runtime, and a module's dependency on it is a normal semver pin
recorded in the Compatibility Ledger (§14).

```
PACKAGE 12-A — Scoped entry points

swastik/manifest  — defineModule / defineManifest, the manifest schema, tier/visibility
                    co-constraint types
swastik/commands  — defineCommand, the declared-response types the Renderer consumes,
                    permission declarations
swastik/events    — IEventHandler, eventsCatalog declaration helpers
swastik/testing   — MockContainer, fixtures, the module test harness
swastik/scaffold  — scaffolding CLI templates and validators
```

The rule is absolute: a module never imports from a framework-internal path. Every type,
helper, and schema arrives through one of these scoped entry points, so the authoring
contract stays stable while framework internals reorganize. An import from a framework
internal fails the upload gate's import scan.

### 12.21 Module Sovereignty and Strict TypeScript

Every module owns its database tables exclusively, and Knex plus the repository pattern is
the framework's only database abstraction — there are no active-record entities. TypeScript
strict mode is non-negotiable and enforced project-wide (including
`exactOptionalPropertyTypes` and `noUncheckedIndexedAccess`); no JavaScript source ships,
and `tsc` is the mandatory first-position CI gate. A module that does not typecheck under
the same strict flags does not build.

### 12.22 How To Verify This Section Against the Code

- The authoring surface: `packages/swastik/src/index.ts` (`defineModule`, `defineCommand`,
  `moduleTiers`).
- A worked command: `packages/modules/hello-world/src/commands/hello.command.ts`.
- A worked module entry: `packages/modules/hello-world/src/index.ts`.
- The template layout: `packages/swastik/_template/`.
- The build/push flow: `apps/main/scripts/build-modules.ts`,
  `apps/main/scripts/push-modules.ts`.

## Contract
- `contracts/module-manifest.schema.json`

## Acceptance
```acceptance
- id: ACC-MOD-0012-1
  check: "The scaffold command produces a manifest-valid module skeleton"
  test: tests/modules/scaffold.spec.ts
- id: ACC-MOD-0012-2
  check: "A module ships a unit test per service and an integration test per DB-touching path"
  test: tests/modules/worked-example.spec.ts
- id: ACC-MOD-0012-3
  check: "`eventsCatalog` is current for every event the module emits"
  test: tests/modules/events-catalog-current.spec.ts
```

## Edges (-> blueprint)
- SPEC-03-MODULES -> SPEC-02-ARCHITECTURE (modules load into the core DI child container)
- SPEC-03-MODULES -> SPEC/00-GOVERNANCE (tier + licence rules)
- SPEC-03-MODULES#SWASTIK -> SPEC-06-OPERATIONS (hot-swap + promotion pipeline)

## Named entities

**classes, interfaces & symbols:** `ChatInputCommandInteraction`, `ConfirmationHelper`, `DM-delivered`, `ILogger`, `IQueueManager`, `IReminderRepository`, `IReminderService`, `PaginationHelper`, `ReminderDeliveredPayload`, `ReminderDeliveryJob`, `ReminderRepository`, `ReminderRow`, `ReminderScheduledPayload`, `ScheduleReminderInput`, `Standardized`, `addStringOption`, `buildSuccessEmbed`, `delayMs`, `formatRelative`, `futureDate`, `gRPC`, `notNullable`, `parseRelativeOrAbsoluteTime`, `reminderId`, `setDescription`, `setName`, `setRequired`, `toBe`, `useTz`

**config/env constants:** `BAN_MEMBERS`, `MAX_REMINDER_HORIZON_MS`, `REMINDERS_TOKENS`, `REMINDERS_UNPARSEABLE_TIME`

**events & identifiers:** `REMINDERS_TOKENS.ReminderRepository`, `REMINDERS_TOKENS.ReminderService`, `ReminderRepository.updateById`, `Reminders.ReminderRepository`, `Reminders.ReminderService`, `TOKENS.EventBus`, `container.eventBus.assertEmitted`, `input.fireAt`, `input.fireAt.getTime`, `interaction.guildId`, `interaction.options.getString`, `job.data.reminderId`, `knex.schema.createTable`, `knex.schema.dropTable`, `notNullable.defaultTo`, `opt.setName`, `payload.fireAt.getTime`, `payload.reminderId`, `primary.defaultTo`, `rejects.toThrow`, `reminder.fireAt`, `reminder.userId`, `t.bigInteger`, `this.discordClient.users.fetch`, `this.eventBus.emit`, `this.findMany`, `this.repo.findById`, `this.repo.updateById`

**files & artifacts:** `ReminderDeliveryJob.ts`, `ReminderRepository.ts`, `ReminderService.ts`, `ReminderService.unit.test.ts`, `_create_reminders.ts`, `remind.command.ts`, `apps/main/tsconfig.json`
