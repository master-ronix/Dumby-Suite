---
id: DOC-FEAT-MODULE-SYSTEM
title: The Module System
kind: documentation
status: derived
version: 5.0.0
authority_scope: [features]
contracts: []
acceptance: []
owners: [framework-maintainers]
last_verified_commit: null
review_state: pending-evidence
---

# The Module System

A module is the fundamental unit of feature ownership: a complete vertical slice — commands,
events, services, repositories, jobs, migrations, config, and translations — in one package,
governed by one manifest, answerable to one owner. Nothing inside a module is visible to
another module except what it deliberately publishes.

**The manifest is the complete contract.** It declares identity (name, version, description,
tier), classification (`hardcoded`/`hardcodeGuildId`, visibility and release status, developer
and build ids, marketplace category, required), and contract (`provides`/`depends` tokens,
commands, events and the event catalogue, services, repositories, jobs, tasks, routes,
middleware, migrations, locales, config, dashboard schema, and cross-module read accessors).
It is read, never written, by anything in the process.

**Four tiers.** Admin (dev-guild-only, owner-only, non-disableable), Core (framework-essential,
non-disableable, RBAC-exempt), Standard (enabled by default, guild-disableable), and
Marketplace (opt-in install, reviewed). The tier determines visibility, controllability,
resilience guarantees, and resource allocation, and is enforced at rest — a module lives on
the volume matching its declared tier.

**Admission is a fixed sequence.** The loader blind-discovers modules on the tier volumes,
validates every manifest and resolves the dependency graph, calls `onLoad` in topological
order, registers commands and events, and calls `onReady` once the gateway is connected. A
`required: false` module that fails disables alone; the process and every other module
continue.

**Three layers inside.** Commands call services; services call repositories; neither reverses.
A command that imports a repository, a repository that emits an event, or a module that imports
another module's files are all build failures.

See `contracts/module-manifest.schema.json`; the full model is in `spec/modules/`.
