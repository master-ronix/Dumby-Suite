---
id: SPEC-01-FOUNDATIONS-0002
title: 2. The Unified Modular Doctrine
kind: spec
status: normative
version: 5.0.0
authority_scope: [01-foundations]
anchors: [THE_UNIFIED_MODULAR_DOCTRINE, TWO_FAILURE_MODES_THIS, THE_MULTIPURPOSE_BOT_COMPARISON, WHY_UNIFIED_SPECIFICALLY_MATTERS, CONTRACT, ACCEPTANCE, EDGES_BLUEPRINT]
contracts: []
acceptance: [ACC-FOUND-0002-1, ACC-FOUND-0002-2]
owners: [framework-maintainers]
last_verified_commit: null
review_state: pending-evidence
---

## 2. The Unified Modular Doctrine

**Status:** [SPEC]

### 2.1 The Doctrine Stated Plainly

The doctrine is a single, deliberately narrow position: Dumby is **one unified,
single-in-process application**. One container, one memory space, one dependency
injection container; modules share that container directly; there are **no network hops
between internal calls**. This is not a limitation waiting to be lifted — it is the
doctrine, and it is the reason a central transport firewall between modules is rejected
as both unnecessary and harmful. Isolation in Dumby is achieved by *code-level contracts
and in-process boundaries enforced by tooling*, never by process or network separation.

### 2.2 Two Failure Modes This Architecture Refuses

Every bot architecture lands somewhere between two failure modes, and Dumby's whole
shape is a refusal of both.

**Failure Mode A — The Monolith ("unified" without "modular").** One `Client`, one
giant handler, a flat folder of command files importing freely from one another and a
shared `db.ts`. By feature 30, every pull request risks breaking unrelated things; no
feature can be disabled without a code change and a redeploy; testing any one feature
means standing up the whole bot's dependency graph. The word "unified" is satisfied and
"modular" is absent.

**Failure Mode B — The Plugin Federation ("modular" without "unified").** A core that
does almost nothing, and plugins that each manage their own database connection, their
own configuration, their own logger. It looks modular in a directory listing, but it
reimplements infrastructure differently per plugin, has no consistent permission model,
and gives the operator a different settings experience for every feature. The word
"modular" is satisfied and "unified" is absent.

Dumby treats both as **architectural bugs** and eliminates them together: the
**Application Core supplies unification** and the **Module Contract supplies isolation**,
and both are enforced by the framework rather than left to convention.

### 2.3 The Multipurpose-Bot Comparison

```
TABLE 2-A — Structural comparison

┌──────────────────────────┬─────────────────────────────┬───────────────────────────────────┐
│ Dimension                │ Multipurpose bot            │ Dumby                             │
├──────────────────────────┼─────────────────────────────┼───────────────────────────────────┤
│ Unit of code organisation│ Commands grouped by folder  │ Modules — self-contained vertical │
│                          │ convention                  │ slices owning commands, events,   │
│                          │                             │ services, data, and config        │
├──────────────────────────┼─────────────────────────────┼───────────────────────────────────┤
│ Inter-feature boundary   │ None enforced               │ Enforced at the manifest level;   │
│                          │                             │ cross-module needs a declared DI  │
│                          │                             │ token or an event subscription    │
├──────────────────────────┼─────────────────────────────┼───────────────────────────────────┤
│ Disabling a feature      │ Comment out code + redeploy │ Per-guild state flip in           │
│                          │                             │ guild_module_states; no code      │
│                          │                             │ change, no redeploy               │
├──────────────────────────┼─────────────────────────────┼───────────────────────────────────┤
│ Database ownership       │ One shared schema; any      │ Each module owns its tables;      │
│                          │ command touches any table   │ cross-module data only via the    │
│                          │                             │ owning module's service           │
├──────────────────────────┼─────────────────────────────┼───────────────────────────────────┤
│ Adding a feature         │ Touch a shared command or   │ Add a self-contained module       │
│                          │ event index                 │ package; the loader discovers it  │
├──────────────────────────┼─────────────────────────────┼───────────────────────────────────┤
│ Testing in isolation     │ Spin up the whole bot's     │ Native — tests run against        │
│                          │ dependency graph            │ declared deps, mocked at the DI   │
│                          │                             │ boundary                          │
├──────────────────────────┼─────────────────────────────┼───────────────────────────────────┤
│ Parallel engineers       │ High collision risk on      │ Zero collision — modules share no │
│                          │ shared files                │ files by construction             │
├──────────────────────────┼─────────────────────────────┼───────────────────────────────────┤
│ Failure blast radius     │ One feature's bug can crash │ Per-handler isolation; a failed   │
│                          │ the whole process           │ module disables itself alone      │
├──────────────────────────┼─────────────────────────────┼───────────────────────────────────┤
│ Permission model         │ Re-implemented per command, │ One seven-layer resolver, one     │
│                          │ inconsistently              │ source of truth (§21)             │
└──────────────────────────┴─────────────────────────────┴───────────────────────────────────┘
```

### 2.4 Why "Unified" Specifically Matters at Scale

The unification half of the doctrine is what keeps the system coherent as the module
count grows from five to fifty. Without it, a "modular" system quietly re-fragments:
module 1 picks one logger, module 2 calls raw `console.log`, module 3 builds its own
settings command because it never discovered a settings module already existed.

Dumby prevents this through structure rather than a style guide. The Docker image
contains only the Application Core — `src/core` and `src/shared` — with every module
living on the per-tier volumes and reaching a pod exclusively through Swastik promotion
(§7.3); the image drops from roughly 500 MB to roughly 50 MB as a side effect. The only
logger a module can obtain is the one the DI container hands it at load time; the only
way to persist per-guild configuration is through the settings surface's declared
service, because no module is ever handed a raw, ungoverned database handle for that
purpose. As the doctrine puts it: unification here is not a request for consistency — it
is the removal of the alternative.

### 2.5 Unified Modular vs. Monolithic vs. Microservice

"Unified modular" is a specific architectural position, not a synonym for either of its
neighbours.

- **A monolithic bot** is a single codebase with no formal boundaries, shared global
  state, and inline event handling. It is fast to build and does not scale in
  complexity.
- **A microservice bot** is a set of separate services communicating over a network,
  each with its own process, database, and deployment. It offers strong isolation at the
  cost of network overhead, deployment complexity, and an operational burden that is
  disproportionate for a Discord bot.
- **A unified modular bot** is the middle ground: a single process with shared
  infrastructure — one database pool, one Redis connection, one gateway connection, one
  middleware pipeline — but formal module boundaries. Each module is self-contained, yet
  shares the framework's infrastructure. It gets microservice-grade isolation without
  network calls, separate deploys, or separate databases.

The operative word is "unified": one database, one cache, one error handler, one logger,
one middleware pipeline. This reduces resource consumption — one pool instead of N — and
it is what guarantees that every feature is governed by the same rules.

### 2.6 Why Unified Modular Wins for Discord Specifically

Discord's API is designed around a single connection per bot token: one identify, one
heartbeat, one session. Sharding shares that token and session limit. The platform
therefore favours a single process, or a small number of processes sharing one token,
over a fleet of independent services. Enabling a module adds functionality without
adding infrastructure.

Sharing is safe here because modules share infrastructure but **not state**. Each module
owns its own database tables (enforced by the repository pattern), its cache keys are
namespaced, and its events are namespaced. The sharing is of the connection and the
service wrapper, not of the data.

### 2.7 The Four-Tier Module System

The tier system is not a feature; it is the organising principle that governs every
other architectural decision. A module's tier is declared at development time, is part
of its identity, and determines four things at once: **visibility, controllability,
resilience guarantees, and resource allocation.** The runtime schema enumerates exactly
four tiers (`module-system/manifest.schema.ts`): `admin`, `core`, `standard`,
`marketplace`.

- **Admin tier** — bot-owner-only infrastructure modules: system administration, global
  configuration, debug inspection, module lifecycle management. Their commands bypass
  application-level rate limits. They are restricted to the development server (the
  configured owner guild) and are never available in other guilds. They cannot be
  disabled by guild owners — they are always enabled. Their errors raise P0 alerts and
  they have unlimited resource access.
- **Core tier** — framework-essential modules every guild needs: help, settings
  management, permission management, module management. Their commands are available to
  everyone unless permission-restricted. They cannot be disabled by guild owners. Errors
  raise P1 alerts and the module enters a degraded mode. Resource access is unlimited.
- **Standard tier** — feature modules guild owners may enable or disable: moderation,
  logging, welcome, levelling, economy, tickets, giveaways, starboard, reaction roles,
  polls, reminders, tags, verification, anti-raid, birthdays, thread management. Their
  commands are available to users with the appropriate permission. They can be disabled.
  Errors raise P2 alerts and the module is auto-disabled after **10 errors in 60
  seconds**. Resource limits are generous but bounded.
- **Marketplace tier** — third-party modules installed from the marketplace, subject to
  resource quotas, security sandboxing, and Module Gateway verification. Guild owners
  can install, uninstall, and update them. Errors raise P2 and auto-disable **per guild**
  after 10 errors in 60 seconds. Strict quotas are enforced by the resource-quota
  enforcer.

The tiers form a trust hierarchy: Admin is fully trusted, Core is trusted, Standard is
conditionally trusted, Marketplace is minimally trusted. In the shipped code the tier
co-constraints are enforced mechanically (`module-system/tier-rules.ts`): an Admin-tier
module MUST set `devGuildOnly: true` and no other tier may; a Marketplace-tier module
MUST declare a `marketplaceCategory`; and a Core-tier command MUST NOT declare an RBAC
requirement, because Core is RBAC-exempt.

### 2.8 The Tier Guard

The tier guard is the first middleware in the pipeline and runs before everything else —
before permission resolution, before rate limiting, before input validation
(`middleware/built-in/admin-tier-gate.ts`, priority −10). It checks the invoking user's
access to the command's tier:

- For **Admin-tier** commands it requires the user's Discord ID to be in the owner
  allow-list; otherwise the request is rejected. This gate is **absolute** — no
  middleware or configuration can override it, and not even `MANAGE_GUILD` or an
  explicit allow override can invoke an Admin command unless the user is an owner.
- For **Core, Standard, and Marketplace** commands it passes control to the next stage.
  Tier does not determine access for these; the permission engine does.

### 2.9 Tier-Based Event, Service, and Error Rules

The tiers also govern what a module may subscribe to, what services it may reach, and
how its failures are handled.

**Event subscriptions.** Admin-tier modules may subscribe to any event, including
system events such as `system.shutdown`, `system.fatalError`, `module.loaded`, and
`module.unloaded`. Core-tier modules may subscribe to any gateway or internal event
except system events, which are reserved for Admin. Standard-tier modules may subscribe
to gateway and module events but may not use cross-namespace wildcards — `guild.*` is
refused while `guild.member*` is allowed. Marketplace-tier modules may not use wildcard
subscriptions at all; they must name each event.

**Service access.** Admin-tier modules may reach every service, including the
admin-only debug, config, and module services. Core-tier modules may reach everything
except admin-specific services. Standard-tier modules may reach everything except
admin- and core-specific services. Marketplace-tier modules reach wrapped services that
enforce quotas. The audit reader is available to Core and Standard but not to
Marketplace; the permission service is available to all tiers, but Marketplace modules
may only read permissions, never modify them.

**Error handling.** Admin-tier modules raise a P0 alert at 3 errors in 60 seconds (the
owner is paged immediately) and are not auto-disabled, because they are critical
infrastructure. Core-tier modules raise P1 at 5 in 60 seconds (notified within an hour)
and enter degraded mode rather than being disabled. Standard-tier modules raise P2 at
10 in 60 seconds (notified within four hours) and are auto-disabled globally. Marketplace
modules use the same 10-in-60 threshold but auto-disable per guild.

## Contract
None (conceptual).

## Acceptance
```acceptance
- id: ACC-FOUND-0002-1
  check: "Cross-module access requires a declared DI token or event subscription; direct imports/writes fail the build"
  test: tests/arch/module-isolation.spec.ts
- id: ACC-FOUND-0002-2
  check: "Neither failure mode is present: no monolith (modules are isolated) and no plugin federation (one DI/event/permission/config)"
  test: tests/arch/doctrine.spec.ts
```

## Edges (-> blueprint)
- SPEC-01-FOUNDATIONS-0002#FAILURE_MODES -> SPEC-03-MODULES (contract enforces isolation)
- SPEC-01-FOUNDATIONS-0002#MULTIPURPOSE_COMPARISON -> SPEC-04-REQUEST-LAYER (one seven-layer resolver)

## Named entities

**classes, interfaces & symbols:** `Spectrum`
