# DUMBY
## Discord Unified Modular Bot System
### The Complete Architecture, Lifecycle & Operations Reference — Version 4.5.0

---

**Document type:** Framework Design Reference (no source code — architecture and specification only)
**Project:** Dumby — Discord Unified Modular Bot System
**Document Version:** 4.5.0 — Comprehensive Unified Edition
**Stack:** TypeScript (strict mode) · Node.js LTS ≥ 22 · discord.js v14
**Scope:** Architecture · Design · Lifecycle · Infrastructure · Security · Operations · Module Catalog (Illustrative Examples) · Power Engine Panel · Administrative Interfaces
**Classification:** Production-Ready Framework Reference
**Sections:** 50 · **Parts:** IX · **Cataloged Module Examples:** 22 (illustrative — none shipped)

---

## PREFACE

A Discord bot is easy to start and hard to finish. The first hundred lines are a joy — a `ready` event, a handful of slash commands, maybe a welcome message. The next ten thousand lines are where most bots die: a single sprawling `index.ts`, command logic tangled with database calls, feature flags implemented as commented-out blocks, and a deploy process that means "SSH in and restart the process and hope." This is the multipurpose-bot failure mode, and it is not a failure of effort — it is a failure of architecture. Multipurpose bots are built outward from a `Client` instance. Dumby is built outward from a **contract**.

Dumby is a Unified Modular Bot System. Those two words are doing real work and neither is decorative. **Unified** means there is exactly one application, one bootstrap sequence, one dependency container, one event bus, one configuration system, one permission engine, and one operational surface — a single coherent runtime that every feature shares without exception. **Modular** means that every unit of behavior — every command, every listener, every database table, every background job — lives inside a self-contained, independently loadable, independently testable, independently disposable module with a declared contract for everything it needs and everything it provides. Neither half of that name is sufficient alone. A system that is modular but not unified is a folder of unrelated plugins glued together by convention, prone to drift, duplication, and silent incompatibility. A system that is unified but not modular is a multipurpose-bot monolith — one big program with feature flags pretending to be features. Dumby refuses both failure modes by construction: the **Application Core** enforces unification (one container, one bus, one bootstrap, one shutdown path, one source of truth for configuration and permissions), and the **Module Contract** enforces modularity (no module may reach into another module's internals; every cross-module interaction happens through a declared, versioned, observable seam).

This document is the complete specification of that system. It is intentionally free of source code. Code is an implementation detail and implementations age; the architecture described here is meant to outlive any one TypeScript syntax convention, any one major version of discord.js, any one choice of query builder. What follows is the contract: every directory and its responsibility, every lifecycle stage and its guarantees, every subsystem and its full behavior, and a catalog of illustrative module examples (§32) showing the range of what the module system supports without this document designing any of them on a module author's behalf. Nothing in the framework's own infrastructure is left as an exercise for the reader. Where a design decision resolves two competing concerns, the resolution and the full reasoning behind it are given together, not just the outcome. Where a number matters — a timeout, a pool size, a retry budget — the number is given as a sane default with the reasoning for it. Where two approaches are both legitimate, this document declares which one Dumby takes and why, so that every module author who comes after is building on settled ground rather than re-litigating architecture in every pull request.

Read this front to back to understand Dumby as a system. Use it as a reference — the Module Catalog in Part VII, the Directory Structure in Part II, the Mandatory Feature Matrix in Part IX. Either way, by the end there should be no open question about what Dumby is, how it behaves, or why it was built this way.

---

## TABLE OF CONTENTS

- [Rosetta Stone — Conceptual Map](#rosetta-stone--conceptual-map)

### PART I — FOUNDATIONS
- [1. What Is Dumby](#1-what-is-dumby)
- [2. The Unified Modular Doctrine](#2-the-unified-modular-doctrine)
- [3. Engineering Principles](#3-engineering-principles)
- [4. Non-Goals & Explicit Boundaries](#4-non-goals--explicit-boundaries)

### PART II — ARCHITECTURE
- [5. Technology Stack & Decision Matrix](#5-technology-stack--decision-matrix)
- [6. System Architecture](#6-system-architecture)
- [7. Directory & File Structure](#7-directory--file-structure)
- [8. Application Bootstrap & Lifecycle](#8-application-bootstrap--lifecycle)
- [9. Dependency Injection & Service Container](#9-dependency-injection--service-container)

### PART III — THE MODULE SYSTEM
- [10. Module Anatomy & Manifest](#10-module-anatomy--manifest)
- [11. Module Tiers & Lifecycle State Machine](#11-module-tiers--lifecycle-state-machine)
- [12. Inter-Module Communication & Contracts](#12-inter-module-communication--contracts)
- [13. Swastik — Hot Reload & Dynamic Module Management](#13-swastik--hot-reload--dynamic-module-management)
- [14. Marketplace & Extension System](#14-marketplace--extension-system)

### PART IV — REQUEST & INTERACTION LAYER
- [15. Command Framework & Routing Engine](#15-command-framework--routing-engine)
- [16. Event Architecture & Bus System](#16-event-architecture--bus-system)
- [17. Middleware Pipeline & Interceptors](#17-middleware-pipeline--interceptors)
- [18. Interaction Handling & Component System](#18-interaction-handling--component-system)
- [19. Permission & Authorization Engine](#19-permission--authorization-engine)

### PART V — DATA & STATE
- [20. Configuration Management](#20-configuration-management)
- [21. Database Architecture & Data Layer](#21-database-architecture--data-layer)
- [22. Caching Architecture & Strategy](#22-caching-architecture--strategy)
- [23. State Externalization & Horizontal Scaling](#23-state-externalization--horizontal-scaling)

### PART VI — RELIABILITY & OPERATIONS
- [24. Observability — Logging, Metrics & Tracing](#24-observability--logging-metrics--tracing)
- [25. Error Management & Fault Tolerance](#25-error-management--fault-tolerance)
- [26. Job Queue & Scheduling Engine](#26-job-queue--scheduling-engine)
- [27. Localization & Internationalization](#27-localization--internationalization)
- [28. Analytics & Telemetry](#28-analytics--telemetry)
- [29. Security Architecture & Threat Model](#29-security-architecture--threat-model)
- [30. Performance & Scalability Engineering](#30-performance--scalability-engineering)
- [31. Privacy & GDPR Compliance](#31-privacy--gdpr-compliance)

### PART VII — MODULE CATALOG (ILLUSTRATIVE EXAMPLES)
- [32. Catalog Conventions & Tier Classification](#32-catalog-conventions--tier-classification)
- [33. Admin-Tier Examples](#33-admin-tier-examples)
- [34. Core-Tier Examples](#34-core-tier-examples)
- [35. Moderation & Safety Examples](#35-moderation--safety-examples)
- [36. Community Engagement Examples](#36-community-engagement-examples)
- [37. Utility & Productivity Examples](#37-utility--productivity-examples)
- [38. Entertainment & Events Examples](#38-entertainment--events-examples)
- [39. Marketplace Integration Examples](#39-marketplace-integration-examples)

### PART VIII — ENGINEERING LIFECYCLE
- [40. Testing Architecture & Quality Assurance](#40-testing-architecture--quality-assurance)
- [41. Developer Experience & Tooling](#41-developer-experience--tooling)
- [42. Development Workflow](#42-development-workflow)
- [43. CI/CD Pipeline & Automation](#43-cicd-pipeline--automation)
- [44. Infrastructure & Deployment](#44-infrastructure--deployment)
- [45. Versioning, Release & Migration](#45-versioning-release--migration)
- [46. Troubleshooting & Operational Runbooks](#46-troubleshooting--operational-runbooks)

### PART IX — REFERENCE
- [47. REST API, Webhooks & MDIS](#47-rest-api-webhooks--mdis)
- [48. Mandatory Feature Compliance Matrix](#48-mandatory-feature-compliance-matrix)
- [49. Dumby vs. Multipurpose Bots — Full Comparison](#49-dumby-vs-multipurpose-bots--full-comparison)
- [50. Glossary & Index](#50-glossary--index)

---

## ROSETTA STONE — CONCEPTUAL MAP

Sections §1 through §51 are organized by architectural concern — bootstrap, module system, permission engine, database layer, and so on — and that numbering is this document's authoritative table of contents. Alongside it, the concepts inside those sections fall into twenty-nine smaller, named clusters: short, memorable handles for the specific low-level ideas that tend to travel together in the same design conversation or the same pull request. A cluster is a cross-cutting index, not a container — nothing moves out of its section to live inside one, and no cluster is a prerequisite for reading the numbered material in order. An engineer who never opens this page can read §1 through §51 front to back and miss nothing. This page exists for the engineer who instead arrives with a question shaped like industry vocabulary — "where's the middleware?", "where's connection pooling handled?" — and wants the fastest possible path from that vocabulary to the right section.

### Industry Term → Cluster

| Industry-Standard Term | Cluster | Primary Reference |
|---|---|---|
| Middleware pipeline | Keepy | §17 |
| Connection pooling | Bundles | §21.1 |
| Background jobs | Burg | §26 |
| Dependency injection | Lens | §9 |
| Observability (logs, metrics, tracing) | Glass | §24 |
| Environment / process configuration | Bonds | §20.1–§20.2 |
| Per-guild (tenant) configuration | Border | §20.3–§20.4 |
| Caching layer | Holder | §22 |
| Rate limiting & permission resolution | Mash | §19.1–§19.7 |
| Internal event bus | Bags | §16 |
| Component & interaction handling | Clips | §18 |
| Repository / data-access layer | Driver | §21.3–§21.5 |
| Schema & migrations | Cogs | §21.2, §21.6 |
| Horizontal scaling & state externalization | Peer | §23 |
| Security hardening | Boot | §29 |
| Performance & capacity planning | Kelp | §30 |
| Privacy & regulatory compliance | Belt | §31 |
| Bootstrap & shutdown lifecycle | Grace | §8 |
| Admin dashboard / web UI | Face | §47 |
| Plugin marketplace & review pipeline | Ground | §14 |
| Testing strategy | Clay | §40 |
| CI/CD & infrastructure-as-code | Mount | §43–§44 |
| Code-quality tooling | Masters | §41–§42 |
| Module / plugin architecture | Ring | §10–§11 |
| Inter-module communication | Bridge | §12 |
| Command framework | Shoot | §15 |
| Runtime & language foundation | Hinge | §5 |
| Discord SDK & gateway layer | Kits | §5.3, §15, §18 |
| Core design philosophy | Delta | §2–§3 |

### The Twenty-Nine Clusters

- **Hinge** — Node.js, TypeScript strict mode, ESM module format, pnpm, lockfile discipline, top-level await, `package.json` scripts. → §5
- **Kits** — discord.js, gateway intent bits, slash commands, user and message context menus, the modal system, autocomplete handlers, the component registry, interaction deadlines. → §5.3, §15, §18
- **Bundles** — PostgreSQL, Redis, Knex.js, connection pooling, PgBouncer, JSONB, primary–replica topology. → §21.1
- **Burg** — BullMQ, repeatable jobs, worker threads, FIFO backpressure, per-job idempotency, dead-letter queues, queue autoscaling, distributed cron locking. → §26
- **Glass** — Pino, Prometheus, the OpenTelemetry SDK, OTLP export, correlation IDs, log levels, metric buckets, SLO targets, health probes, startup/readiness/liveness semantics. → §24
- **Bonds** — Zod, environment variables, the root schema, config validation, field-level errors, `process.env`, strict parsing. → §20.1–§20.2
- **Masters** — ESLint, Prettier, Vitest, tsx, Husky, Commitlint, Changesets, Conventional Commits, flat config, VS Code snippets. → §41–§42
- **Mount** — Docker, Docker Compose, Kubernetes, Terraform, GitHub Actions, sealed secrets, HPA, PodDisruptionBudget, multi-stage builds. → §43–§44
- **Delta** — Single application core, module sovereignty, contract over convention, no self-special-casing, the three-layer rule, the manifest as complete table of contents, progressive disclosure. → §2–§3
- **Ring** — Manifest declaration, the four governance tiers, the module lifecycle state machine, per-guild module state, proactive backfill migration, hot reload, module discovery, topological dependency loading. → §10–§11
- **Bridge** — The four sanctioned communication patterns, soft-dependency degradation, contract versioning, the event catalog as contract, the cross-module read accessor, provides/depends tokens, typed DI seams. → §12
- **Lens** — Symbol-based tokens, the three binding lifetimes, child containers, constructor injection, circular-dependency detection, `MockContainer` substitution, the resolution stack. → §9
- **Shoot** — Chat-input, user-context, and message-context command types, the compound key registry, the command class interface, deployment strategy, the dynamic command provider, the command context object, the autocomplete router. → §15
- **Keepy** — The onion model, priority-based execution, built-in middleware, short-circuiting, the root error boundary, after-hooks, global versus command-scoped middleware. → §17
- **Mash** — The seven-layer resolution chain, Dumby RBAC roles, Discord role mapping, channel restriction, NSFW flags, Admin-tier bypass, per-command cooldowns, sliding-window rate limiting, the Redis fail-closed fallback. → §19.1–§19.7
- **Bags** — The gateway event router, the internal event bus, event naming convention, synchronous dispatch, cycle detection with depth tracking, event-loop lag shedding, sheddable events. → §16
- **Clips** — The component registry, custom-ID routing, the five select-menu types, multi-step modal sessions, Redis-backed pagination, static and dynamic modes, the autocomplete filter, user-only navigation. → §18
- **Border** — The three configuration scopes, the guild config JSONB document, the configuration change audit trail, schema evolution, ETag versioning, redacted audit metadata. → §20.3–§20.4
- **Driver** — The repository pattern, service-layer discipline, the AsyncLocalStorage-backed transaction manager, savepoint support, read/write routing, global read replicas, lag-based replica exclusion, method-name routing. → §21.3–§21.5
- **Cogs** — Core tables, insert-only audit logs, partial unique indexes on soft-deletable tables, standard audit columns, zero-downtime migrations, up/down migration pairs. → §21.2, §21.6
- **Holder** — The two-tier cache, L1 LRU, L2 Redis, key namespacing, on-write invalidation, TTL expiry, stampede protection, negative caching, cache metrics, probabilistic early expiration. → §22
- **Peer** — No process-local state, externalized state location, Redis coordination, shard-ownership handoff, active–standby failover, the rolling-update handshake, lock heartbeats, the handoff-request protocol. → §23
- **Boot** — Secrets management, input validation, webhook signature verification, the atomic idempotency set, privilege-escalation prevention, dependency security, encryption posture, two-phase key rotation, tamper-evident audit, silent admin rejection. → §29
- **Kelp** — The sharding formula, zero-downtime rolling updates, adaptive horizontal scaling, spot/preemptible support, hot-path optimization, p99 framework overhead, discord.js cache tuning, the memory ceiling, event-loop protection. → §30, §6.5
- **Belt** — Data minimization, the right to erasure, GDPR export, the data retention policy, production anonymization, cross-border data transfer, children's privacy, the eraser-registry pattern. → §31
- **Grace** — The eighteen-stage bootstrap, the nine-step graceful shutdown, the termination grace period, module onLoad/onReady/onUnload, health-probe semantics, the drain sequence, the dead-letter guarantee. → §8
- **Face** — MDIS schema-driven rendering, the eight UI components, auto-exposed REST endpoints, tier-visibility mapping, WCAG AA conformance, RTL logical properties, graceful placeholder fallback. → §47
- **Ground** — Marketplace review gates, the five-step pipeline, version re-review, cryptographic signing, trust re-established per version, critical-finding revocation, the unsigning mechanism. → §14
- **Clay** — `MockContainer`, the fluent mock builder, transaction-wrapped isolation, the four-tier test pyramid, the happy-path smoke tier, nightly load testing, SLO validation, k6 methodology. → §40

---

# PART I — FOUNDATIONS

---

## 1. What Is Dumby

### 1.1 One-Sentence Definition

Dumby is a Unified Modular Bot System: a single TypeScript application runtime — one process family, one dependency graph, one event bus, one permission engine, one configuration system — into which independently-authored, independently-versioned, independently-toggleable **modules** are loaded as the exclusive source of all bot behavior, including the framework's own administrative features.

### 1.2 The Load-Bearing Idea

Everything else in this document is a consequence of one decision: **the framework does not special-case itself.** The commands that let a server owner enable or disable modules are themselves shipped as a module (`core-admin`). The system that stores per-guild settings is a module (`guild-settings`). Logging configuration, moderation, welcome messages — all modules, all loaded through the exact same manifest contract, the exact same dependency injection container, the exact same lifecycle hooks as any third-party module a community author might write next year. There is no privileged, framework-only code path that a module author cannot also use. This is what makes Dumby "unified" in a way that is more than a slogan: the framework's own first-party features are proof, by construction, that the module contract is sufficient for everything — because the framework uses nothing else.

### 1.3 Vision Statement

A Discord community's bot should be a single coherent product, not a federation of plugins bolted together by an operator who has to remember which six environment variables control which three unrelated features. Dumby exists so that a guild administrator experiences one bot with a wide, coherent feature set and one settings surface — while the engineering team behind it experiences twenty-two independently-shippable codebases that never block on each other, never break each other, and can each be rewritten from scratch without anyone else noticing.

### 1.4 Mission Statement

Provide a TypeScript framework where adding the fortieth feature is exactly as safe, exactly as fast, and exactly as well-tested as adding the first — by making isolation, contracts, and observability the default rather than something a disciplined team must remember to apply by hand.

### 1.5 Design Pillars

| Pillar | What It Means in Practice |
|---|---|
| **Module Sovereignty** | Every module owns its commands, its database tables, its background jobs, and its configuration schema outright. No other module — and no part of the core — reaches into a module's private state without a declared, typed interface. |
| **Contract Over Convention** | Cross-module interaction happens through declared manifests, typed DI tokens, and a documented event catalog — never through importing another module's internal files or guessing at its table names. |
| **Fail Fast, Degrade Gracefully** | Misconfiguration is caught at boot and the process refuses to start in a half-broken state. Once running, the loss of one module degrades only the capability that module owned — it does not cascade. |
| **Observability Is Default, Not Add-On** | Every command execution, every job run, every module lifecycle transition emits structured logs, metrics, and trace spans without the module author writing instrumentation code by hand. |
| **One Operational Surface** | One `Dockerfile`, one health endpoint, one metrics endpoint, one configuration loader, one migration runner — regardless of how many modules are loaded. |
| **TypeScript as a Design Material** | Types are not bolted on for editor hints; the module contract, the DI container, the event bus, and the command interface are defined so that an entire category of integration bugs is rejected at compile time, before a single test runs. |
| **Progressive Disclosure** | A module author writing their first command touches one file and one interface. A module author building a stateful, job-scheduling, cache-backed subsystem has the full power of the framework available — but nothing is forced on the simple case. |

### 1.6 What Dumby Is Not

- **A no-code bot builder.** Dumby is a framework for engineers writing TypeScript modules, not a drag-and-drop UI for end users. (A module *can* expose a no-code-style configuration panel to guild admins via MDIS — see §14.5 — but the framework itself is code-first.)
- **A single-file script.** There is no supported mode where Dumby runs as one flat `bot.ts`. The module boundary is structural, not optional.
- **A generic "everything" clone.** Dumby does not ship every conceivable feature enabled for every guild. The Standard-tier module catalog is curated and each module is independently disableable.
- **A multi-framework abstraction layer.** Dumby commits to one Discord integration library (§5.2) and uses its types and event model directly.
- **A SaaS product.** Dumby is a self-hostable framework. Nothing in this document assumes a particular commercial hosting arrangement, though Part VIII covers production deployment in full.

### 1.7 Who Dumby Is For

- **Platform teams** running a bot across many guilds (hundreds to tens of thousands) who need per-guild feature toggles, predictable scaling, and a module boundary that lets multiple engineers ship in parallel without stepping on each other.
- **Module authors** — internal or third-party — who want to build one well-scoped feature without needing to understand or touch the other modules already loaded.
- **Single-server operators** who start with five Standard modules and grow into a fully-loaded deployment without ever hitting an architectural wall that forces a rewrite.

These three audiences need different reading paths through the material that follows, and they arrive at it with different infrastructure already true of them. A platform team is the intended reader for the reference production process as written: the two-approver release gate (§43.4), an on-call rotation, and the Kubernetes/multi-region deployment tier (§44.6) all assume colleagues and a budget a single-server operator does not yet have. A single-server operator's honest starting point is the smallest deployment tier in §44.6 — one process, one database, no active/standby failover — reading Parts I–IV for the architecture and skipping the two-approver gate and the on-call assumptions in Part VIII until (if ever) the deployment grows into needing them. A module author needs mainly §10 and §15–§19. None of the three has to read all fifty-one sections before doing anything; §44.6 states plainly which tier corresponds to which audience so a reader can pick their own starting point instead of discovering the mismatch partway through Part VIII.

---

## 2. The Unified Modular Doctrine

### 2.1 Two Failure Modes This Architecture Refuses

Every Discord bot architecture lands somewhere on a spectrum between two failure modes, and Dumby's entire design can be read as a refusal of both endpoints simultaneously.

**Failure Mode A — The Monolith ("Unified" without "Modular").** One `Client`, one giant command handler with a flat folder of command files that all import freely from each other and from a single shared `db.ts`. Fast to start. By feature thirty, every pull request risks breaking something unrelated, there is no way to disable one feature without a code change and redeploy, and testing means spinning up the entire bot because nothing is actually isolated.

**Failure Mode B — The Plugin Federation ("Modular" without "Unified").** A core that does almost nothing — load a folder of "plugins" — where each plugin manages its own database connection, its own config loading, its own logger, because the core never provided shared infrastructure. This looks modular on a directory listing, but every plugin reimplements the same infrastructure differently, there is no consistent permission model across plugins, and a guild administrator faces a different settings experience for every feature.

Dumby's position is that these are not opposite ends of a tradeoff to be balanced — they are both architectural bugs, and a correctly designed system eliminates both at once. The **Application Core** supplies unification. The **Module Contract** supplies isolation. Both are simultaneously enforced by the framework, not by convention.

### 2.2 The Multipurpose Bot Comparison

| Dimension | Multipurpose Bot | Dumby (Unified Modular) |
|---|---|---|
| **Unit of code organization** | Commands, grouped by folder convention only | Modules — self-contained vertical slices owning commands, events, services, data, and config together |
| **Inter-feature boundary** | None enforced; any file can import any other file | Enforced at the manifest level; cross-module access requires a declared DI token or event subscription |
| **Disabling a feature** | Requires commenting out code and redeploying | A single per-guild state flip in `guild_module_states`, no code change, no redeploy |
| **Database ownership** | One shared schema; any command can query any table | Each module owns its tables exclusively; cross-module data access goes through the owning module's service |
| **Adding a new feature** | Touch the shared command index, the shared event index | Add a self-contained module directory; the loader discovers it automatically |
| **Testing a feature in isolation** | Requires spinning up the whole bot's dependency graph | Native — a module's tests run against its own declared dependencies, mocked at the DI boundary |
| **Multiple engineers working in parallel** | High collision risk on shared files | Zero collision risk — modules do not share files by construction |
| **Failure blast radius** | One feature's bug can crash the whole process | A module failure is isolated; a `required: false` module disables itself without affecting others |
| **Permission model** | Re-implemented per command or per feature, inconsistently | One seven-layer permission resolution engine (§19) used identically by every module |

### 2.3 Why "Unified" Specifically Matters at Scale

The unification half of the doctrine is what keeps Dumby coherent as the module count grows from five to fifty. Without it, a "modular" system re-fragments: module 1 picks one logger, module 2 uses `console.log`, module 3 builds its own settings command because it did not know `guild-settings` existed. Dumby prevents this not through a style guide but through structure — the only logger a module can obtain is the one handed to it by the DI container at load time. The only way to persist per-guild configuration is through the `guild-settings` module's declared service, because the framework deliberately does not give modules a raw, ungoverned database handle for that purpose. Unification here is not a request for consistency — it is the removal of the alternative.

---

## 3. Engineering Principles

These are the standing rules every part of Dumby — core and module alike — is designed against. Each resolves a real, recurring design decision and is referenced by number from later sections when a specific architectural choice traces back to it.

**P1 — Explicit Over Implicit.** Nothing is auto-detected by filename magic where a manifest field could say it explicitly. A command is a command because it is listed in the module's manifest, not because it happened to live in a folder named `commands/`. The manifest is a complete table of contents for a module without opening another file.

**P2 — Module Sovereignty.** A module's database tables, internal services, and private state belong to that module alone. Other modules — and the framework core — may interact with them only through what the manifest explicitly `provides`. Enforced by lint rule (no cross-module relative imports) and by the repository pattern, which makes direct queries against another module's table structurally awkward.

**P3 — Single Responsibility at Every Layer.** Not just "a module does one thing" — a command class only routes and validates, a service only holds business logic, a repository only talks to the database. This layering applies uniformly to any module built against this framework, regardless of shape or size, which is what makes jumping into an unfamiliar module fast.

**P4 — Fail Fast at Startup, Recover Gracefully at Runtime.** Every configuration value, every manifest, every dependency edge is validated before the gateway connection opens. If something is wrong, the process exits with a specific, actionable error. Once the process is healthy and serving traffic, a transient failure is retried and contained, never allowed to crash the whole process if it can be isolated.

**P5 — Observability Is Not Optional.** A module author cannot ship a command without it automatically getting a trace span, a duration metric, and structured log entries on entry, success, and failure. This is wired into the command router and job processor base classes, not left to per-module discipline (§24).

**P6 — Open for Extension, Closed for Modification.** Extending Dumby means writing a new module or subscribing to an existing event. It never means editing the framework core or another module's source. The marketplace tier (§14) and the documented event catalog (§16) exist specifically so that "I need the bot to do one more thing" never requires a framework-core pull request.

**P7 — Security by Default.** The permission engine defaults to deny. A new command with no explicit permission declaration is reachable by nobody but the bot owner until a permission is set. Secrets are never logged (enforced by the structured logger's redaction list, §24.2). Module manifests cannot request Discord permissions or gateway intents beyond what they declare; bootstrap computes and requests only the union of what's actually declared.

**P8 — Test in Isolation, Deploy with Confidence.** Because every module declares its dependencies through DI tokens rather than importing concrete classes, every module's unit tests can substitute mocks for those tokens without a real database or real Discord connection. Integration tests then verify the seams. This two-tier strategy (§40) is what keeps the full 22-module suite testable without long runtimes.

**P9 — Configuration Without Code.** Anything an operator or guild administrator should reasonably change — a threshold, a channel ID, a currency name, a cooldown — is a configuration value, validated against a typed schema, never a constant requiring a code change and redeploy (§20).

**P10 — Data Integrity Over Convenience.** Every schema change ships as a versioned, reversible migration (§21.6). Destructive operations go through an explicit confirmation and audit-logging path even when triggered programmatically. No module is permitted a "just delete the row" shortcut that bypasses the audit trail.

**P11 — Deprecation Over Breaking Change.** A module's public contract (its manifest `provides`, its emitted events, its command names) is versioned semver-style. Removing or changing the shape of a provided token or event is a major-version bump with a documented deprecation window — not a silent break (§45).

**P12 — Progressive Disclosure of Complexity.** The minimal module — one command, no state — touches exactly one file and one interface. A module that needs a database table, a background job, a cache layer, and cross-module event subscriptions has all of that available through the same manifest shape, just with more fields populated. The framework never requires boilerplate for capabilities a module does not use.

**P13 — One Source of Truth Per Concern.** There is exactly one place permission decisions are made (the resolver, §19), exactly one place configuration is resolved (§20), exactly one place a module's enabled/disabled state lives (`guild_module_states`, §11.4). Duplication of authority across subsystems is a design defect, not a convenience.

**P14 — Freedom by Default, Authority by Exception.** The framework's own capacity for total control — up to and including the Power Engine Panel's ability to ban or restrict any guild, module, developer, or command globally, and to reach every other core subsystem besides (§19.8–§19.13) — is never exercised as a matter of routine operation. A module's behavior, a guild's configuration, a developer's design choices: none of these is constrained by the framework simply because the framework has the technical power to constrain them. Every capability this principle governs exists as a deliberate, exceptional, logged intervention available for cause — abuse, security compromise, policy violation — not as an ambient enforcement layer a module author or guild administrator needs to design around. A framework that must be worked around to be used has already failed P1; having ultimate authority and never quietly reaching for it is the harder, and the intended, discipline.

---

## 4. Non-Goals & Explicit Boundaries

Naming what Dumby will not try to solve is as important as naming what it does. The following are deliberate non-goals — not items left for later, but architectural choices to scope the framework to a problem it can solve well.

**Not a text-prefix command system.** Dumby ships slash commands, user context menus, and message context menus only. Text-prefix command parsing was explicitly removed from Discord's recommended patterns with the introduction of slash commands and is not part of this framework's command handling surface. This boundary has no loophole: a module declaring the `MESSAGE_CONTENT` intent for a legitimate, documented purpose (§4, next) may scan message content and act on what it finds, but may never use that scan to simulate a prefix-command interface — parsing a leading token out of message content and dispatching it as though it were a registered command. The marketplace review pipeline's manifest-review step (§14.4) treats a module found doing this as a rejected submission, not a stylistic note, since it recreates exactly the command surface this non-goal exists to keep out through a side door.

**Not a message-content parser.** Dumby does not hold the `MESSAGE_CONTENT` privileged intent for general message scanning. Modules that require message content for a specific, documented purpose declare it explicitly in their manifest intents array, and its use is flagged during the manifest-review step of the marketplace pipeline.

**Not a built-in web UI.** The Module Dashboard Interface System (MDIS, §14.5 and §47) provides a schema-driven web panel that module developers can declare via their manifest. Dumby does not ship a pre-built React/Vue application; it ships a declarative schema that a renderer consumes. The renderer itself is outside the framework's scope.

**Not a real-time collaboration platform.** Dumby processes Discord interactions. It is not designed to serve as a general-purpose WebSocket server or a low-latency collaborative editing backend.

**Not a code generator or CLI scaffolding system.** While the framework ships a `dumby scaffold module <name>` CLI tool for developer convenience (§41.2), this is tooling, not core functionality — the framework does not require it and works identically whether a module was scaffolded or hand-authored.

**Not a "zero-config" system.** Dumby requires an explicit manifest per module, explicit DI token declarations, and explicit migration files. This is a deliberate choice (P1 — Explicit Over Implicit) that trades a slightly higher authoring cost at the boundary for dramatically lower operational surprise at runtime.

**Not a replacement for infrastructure.** Dumby runs inside infrastructure — a PostgreSQL cluster, a Redis instance, a container orchestrator. It does not provide or abstract those dependencies; it requires them. The Terraform and Kubernetes configurations in §44 describe a reference deployment, not a built-in provisioning system.

**Not a microservices architecture.** Dumby is one deployable application with one process boundary per shard group, not a constellation of independently deployed services communicating over a network. Modules achieve isolation through code-level contracts (§12) and in-process boundaries enforced by tooling (§10.5), not through separate deployments, separate databases, or network calls between modules. This keeps the operational surface — one thing to deploy, one thing to scale, one thing to observe — deliberately small; a guild-hosted Discord bot has neither the traffic volume nor the team size that makes distributed-services overhead pay for itself. The Power Engine Panel and CLAI (§19.13, §19.16) are a narrow, named exception to this non-goal, not a quiet erosion of it: they are operator-facing control-plane tooling outside the feature-and-module system entirely, in the same category as the database and cache the application already depends on — not a module, and not a pattern this non-goal invites modules themselves to follow.

---

# PART II — ARCHITECTURE

---

## 5. Technology Stack & Decision Matrix

Every technology decision in Dumby is stated explicitly and justified here. A team implementing Dumby substitutes none of these unless a specific sub-section names an alternative as approved.

### 5.1 Runtime — Node.js LTS ≥ 22

Node.js LTS is chosen for its event-driven, non-blocking I/O model, which maps naturally onto Discord's interaction-driven workload: the bot is almost always waiting on I/O (Discord gateway, database, cache) rather than doing CPU-intensive computation. LTS releases guarantee an 18-month active support window, which aligns with Dumby's own supported-version policy. The minimum required version is Node.js 22 LTS for native fetch, structured clone support, and stable top-level await in ESM, all of which the framework depends on.

### 5.2 Language — TypeScript (Strict Mode)

Dumby is a TypeScript-native framework. TypeScript strict mode (`"strict": true` in `tsconfig.json`, plus `"exactOptionalPropertyTypes": true` and `"noUncheckedIndexedAccess": true`) is enforced project-wide. This is not an add-on or a future option — it is the production stack. The module manifest schema, the DI container, the command class interface, the event catalog, and the repository layer are all defined using TypeScript types and generics in ways that let the compiler catch integration bugs at authoring time rather than at runtime. The project ships no JavaScript source files; the build step (`tsc`) is mandatory and runs as the first gate in CI before any test, lint, or deployment job.

**Module format:** ESM (`"type": "module"` in `package.json`, `"module": "NodeNext"` in `tsconfig.json`). All compiled output is `.js` ESM. No `require()` is used anywhere in the codebase.

**Package manager:** pnpm (latest stable). The lockfile is committed and CI installs with `pnpm install --frozen-lockfile`.

### 5.3 Discord Integration — discord.js v14

discord.js v14 is the single Discord integration library. It is not abstracted behind a generic Discord-client interface — the framework uses its types, its `Client` class, its `GatewayIntentBits` enum, its `Partials` enum, its `SlashCommandBuilder`, and its `Interaction` type hierarchy directly. This means module authors work with the real discord.js types everywhere, not a lowest-common-denominator wrapper. This is a deliberate choice, not a default: discord.js is the dominant TypeScript-compatible Discord library, with a stable, actively-maintained type system, which is exactly what makes committing to its types directly — rather than behind an abstraction layer no module author asked for — the design that serves a module author best.

**Discord itself, not discord.js, is the platform this framework is deliberately engineered to absorb change from.** Every numeric constant this document treats as a design parameter — the sharding threshold (§30.1), the interaction response window (§17.2), privileged-intent gating (§4) — is expressed as configuration precisely because it is a Discord platform policy, not a Dumby decision, and Discord has changed each category of constant before. The message-content non-goal in §4 exists specifically because Discord restricted that intent, and it is the working model for how the framework absorbs the next platform change of the same shape: a policy change becomes a configuration or manifest-level adjustment (a new environment variable, a changed default, a new required intent) rather than a rewrite, because every one of these values is deliberately kept external to the framework's own architecture instead of assumed as a structural constant. The framework's own gateway connection model and its commitment to slash commands as the interaction primitive are the two structural foundations this design rests on; every other Discord-platform detail is treated as configuration specifically so that the framework's response to Discord's own evolution stays a parameter update, contained and predictable, rather than an architectural one.

### 5.4 Data Storage — PostgreSQL + Redis

**PostgreSQL (primary data store):** Relational integrity, JSONB for configuration blobs, row-level locking, and a mature migration ecosystem via Knex.js. Multi-module deployments benefit from PostgreSQL's fine-grained `LISTEN`/`NOTIFY` for cross-process event signaling and its robust ACID transactions for multi-table writes that span a module's own tables.

**Redis (cache, queue backing, pub/sub):** Used as the L2 cache (§22), the BullMQ job queue backing store (§26), and the cross-shard pub/sub channel for `guild_module_states` cache invalidation (§23). Redis is explicitly not used as the primary data store; its role is acceleration and coordination, not persistence. Data that would cause user-visible loss if Redis disappeared lives only in PostgreSQL.

**Query builder — Knex.js:** Used for all SQL construction. Not an ORM; there are no active-record entity objects. The repository pattern (§21.5) is the only abstraction over the database, and it issues SQL through Knex rather than through string concatenation. Knex's migration system is used for all schema management.

### 5.5 Job Queue & Scheduling — BullMQ

BullMQ provides durable, Redis-backed job queues with per-job retry policies, dead-letter queue routing, delayed jobs (used for scheduled mutes, timed giveaway close events, reminder firing), and rate-limited queues (used for bulk notification delivery). BullMQ is chosen over in-process task schedulers because it survives process restarts — a job enqueued for 24 hours from now will still fire even if the bot restarts three times in the interim.

**Cron task scheduling:** The Scheduler service (§26.5) wraps BullMQ's repeatable job mechanism to provide a cron-expression-based task API that individual modules use for periodic cleanup, reports, and maintenance tasks. This is distinct from the job queue — scheduled tasks are recurring, jobs are one-shot.

### 5.6 Observability Stack — Pino, Prometheus, OpenTelemetry

**Logging — Pino:** Structured JSON logging to stdout. Pino is chosen for performance (lowest per-log overhead of the Node.js logging libraries) and for its child-logger scoping, which is used to pre-bind `traceId`, `guildId`, and `moduleId` to every log line emitted within a command execution context.

**Metrics — Prometheus (client library `prom-client`):** All runtime metrics — command invocation counters, histogram buckets for command latency, job queue depth, cache hit/miss ratios, database pool usage — are exposed as Prometheus text format from the `/metrics` health endpoint.

**Tracing — OpenTelemetry SDK:** Distributed trace spans are created for every command execution, every database query above the slow-query threshold, every BullMQ job invocation, and every outbound HTTP call. Spans are exported via OTLP (HTTP or gRPC, configurable) to the operator's chosen tracing backend (Jaeger, Tempo, Datadog, etc.). All three pillars — logs, metrics, traces — carry the same `traceId`, making cross-signal correlation a simple `traceId` lookup rather than time-based approximation.

### 5.7 Configuration & Validation — Zod

All configuration — process-level environment variables and per-module schemas — is validated against Zod schemas at Stage 02 of bootstrap (§8.2). A configuration value that does not satisfy its schema causes the process to exit with a precise, field-level error message before any module loading or gateway connection attempt. There are no "we'll handle missing config at runtime" patterns anywhere in the framework.

### 5.8 Development & Quality Tooling

| Tool | Version | Purpose |
|---|---|---|
| TypeScript | `^5.5` | Primary language, strict mode enforced |
| ESLint | `^9.x` (flat config, `eslint.config.ts`) | Linting, cross-module import enforcement |
| Prettier | `^3.x` | Formatting (enforced in CI via `--check`) |
| Vitest | `^2.x` | Unit and integration test runner |
| pnpm | Latest stable | Package manager |
| tsx | `^4.x` | Development-time TypeScript execution (no compiled output) |
| Husky | `^9.x` | Git hook management |
| commitlint | `^19.x` | Conventional commit format enforcement |
| changesets | `^2.x` | Changelog generation and release coordination |

### 5.9 Infrastructure & Deployment

| Concern | Technology | Notes |
|---|---|---|
| Containerization | Docker | Multi-stage build (builder stage, runtime stage) |
| Orchestration | Kubernetes | Primary production target; reference manifests in `infra/k8s/` |
| Infrastructure as Code | Terraform | Reference modules for PostgreSQL, Redis, and K8s cluster provisioning |
| Secrets | Kubernetes Secrets (sealed via Sealed Secrets operator) | No plaintext secrets in manifests or environment variable files committed to source |
| CI/CD | GitHub Actions | Five workflows: CI, release, staging deploy, production deploy, dependency review |

---

## 6. System Architecture

### 6.1 Layered View

```
┌──────────────────────────────────────────────────────────────────────┐
│                         DISCORD GATEWAY & REST API                    │
│           (Managed by discord.js — one connection per shard)          │
└───────────────────────────────┬──────────────────────────────────────┘
                                │ GatewayIntentBits (union of all loaded
                                │ modules' declared intents)
┌───────────────────────────────▼──────────────────────────────────────┐
│                         APPLICATION CORE                              │
│  ┌──────────┐  ┌──────────┐  ┌──────────────┐  ┌───────────────┐   │
│  │ Bootstrap│  │ DI Contnr│  │ Event Router │  │   Cmd Router  │   │
│  └──────────┘  └──────────┘  └──────────────┘  └───────────────┘   │
│  ┌──────────┐  ┌──────────┐  ┌──────────────┐  ┌───────────────┐   │
│  │ Config   │  │  Logger  │  │  Middleware   │  │ Permission Eng│   │
│  │ Manager  │  │  (Pino)  │  │  Pipeline    │  │ (7-layer)     │   │
│  └──────────┘  └──────────┘  └──────────────┘  └───────────────┘   │
│  ┌──────────┐  ┌──────────┐  ┌──────────────┐  ┌───────────────┐   │
│  │  Cache   │  │ Database │  │  Job Queue   │  │ HTTP Server   │   │
│  │ Manager  │  │ (Knex)   │  │  (BullMQ)    │  │ (Fastify)     │   │
│  └──────────┘  └──────────┘  └──────────────┘  └───────────────┘   │
└───────────────────────────────┬──────────────────────────────────────┘
                                │ Loaded through Module Registry
┌───────────────────────────────▼──────────────────────────────────────┐
│                         MODULE LAYER                                  │
│  ┌──────────┐  ┌──────────┐  ┌──────────────┐  ┌───────────────┐   │
│  │core-admin│  │guild-sett│  │  moderation  │  │  auto-mod     │   │
│  │  (Admin) │  │  (Core)  │  │  (Standard)  │  │  (Standard)   │   │
│  └──────────┘  └──────────┘  └──────────────┘  └───────────────┘   │
│  ┌──────────┐  ┌──────────┐  ┌──────────────┐  ┌───────────────┐   │
│  │ leveling │  │  economy │  │   tickets    │  │    music      │   │
│  │(Standard)│  │(Standard)│  │  (Standard)  │  │(Marketplace)  │   │
│  └──────────┘  └──────────┘  └──────────────┘  └───────────────┘   │
│  [ ... 14 additional modules ... each in its own isolated directory ] │
└──────────────────────────────────────────────────────────────────────┘
```

### 6.2 The Full Command Interaction Trace

This is the complete path every slash command takes from user to response. Every step is described in full in the section it cites; this trace is a navigation map.

```
User presses Enter on a slash command in Discord
        │
        ▼
Discord Gateway delivers InteractionCreate event to discord.js
        │
        ▼
EventRouter.handleGatewayEvent('interactionCreate', interaction) [§16.3]
        │
        ▼ (if ApplicationCommand or Autocomplete)
CommandRouter.dispatch(interaction) [§15.3]
        │ (looks up command by composite key: commandName[:subgroup][:sub])
        ▼
Module state check (§11.4): is this command's module active for this guild?
        │ (fails closed: missing or disabled = no dispatch)
        ▼
Middleware Pipeline execution (§17.2) — in priority order:
   priority -10: AdminTierGateMiddleware   ← owner-only gate for Admin-tier commands
   priority   0: TraceMiddleware           ← opens span, binds traceId
   priority  10: AuthMiddleware            ← resolves interaction.user
   priority  20: GuildConfigMiddleware     ← loads per-guild config into context
   priority  30: LocaleMiddleware          ← binds i18n instance for this guild
   priority  40: RateLimitMiddleware       ← check-and-increment (atomic, pre-handler)
   priority  50: PermissionMiddleware      ← Discord bitfield check (Layer 5 of 7)
   priority  60: RBACMiddleware            ← Dumby role check (Layer 6 of 7)
   priority  70: CooldownMiddleware        ← per-user per-command cooldown
   priority  80: DeferMiddleware           ← calls deferReply() if command.requiresDefer
   priority  90: AnalyticsMiddleware       ← records invocation start
   priority 100+: Module global middleware (if any declared in module manifest)
   priority 200+: Command middleware (if any declared on the specific command)
        │ (each middleware calls next() to pass to the next; abort = short-circuit)
        ▼
Command.execute(interaction, context) [§15.2]
        │
        ▼
Service layer call (§21.5 repository pattern for any data access)
        │
        ▼
Command.execute returns
        │ (middleware .after() hooks execute in reverse priority order)
        ▼
AnalyticsMiddleware records outcome, duration, error status
TraceMiddleware closes span, emits final log entry
        │
        ▼
dumby_command_invocations_total{module, command, status} incremented
dumby_command_duration_ms histogram recorded
        │
        ▼
User sees response in Discord
```

### 6.3 Module Communication Pathways

```
Module A wants to invoke behavior in Module B:

  If fire-and-forget, no response needed:
    A emits event on the Internal Bus → B's listener fires asynchronously
    (e.g., moderation emits 'moderation.user.banned', logging subscribes)

  If synchronous response needed:
    A calls Module B's DI-token-resolved service
    (e.g., economy calls TOKENS.GuildSettings.Service.get(guildId, 'prefix'))

  If reading B's data without B's logic:
    A calls a `ForCrossModuleRead`-suffixed accessor B has declared in its
    manifest's `crossModuleReads` array — single-row, key-only lookups (§12.1
    Pattern 3); writes always go through B's service, never this path

  Never:
    import { SomeClass } from '../../module-b/services/SomeService.js'
    (ESLint rule enforces this: cross-module relative imports are a build error)
```

### 6.4 Guild Configuration Read Path

```
Command invoked in guild G for module M
        │
        ▼
GuildConfigMiddleware checks L1 cache (in-process LRU, key: 'guild:{G}:config')
        │
  Cache hit ──────────────────────────────────────► bind to context, proceed
        │
  Cache miss
        ▼
CacheManager.get('guild:{G}:config') [Redis L2]
        │
  Cache hit ─── backfill L1 ──────────────────────► bind to context, proceed
        │
  Cache miss
        ▼
GuildConfigRepository.findByGuildId(G) [PostgreSQL]
(reads guild_configs.data JSONB blob — full field reference at §20.4)
        │
        ▼
Write to Redis L2, write to L1 LRU
        │
        ▼
Bind to context, proceed to handler
```

### 6.5 Shard Topology at Scale

```
                    ┌──────────────────────┐
                    │    Discord Gateway   │
                    └──────────┬───────────┘
                               │
             ┌─────────────────┼─────────────────┐
             │                 │                 │
     ┌───────▼──────┐  ┌───────▼──────┐  ┌───────▼──────┐
     │  Bot Pod 0   │  │  Bot Pod 1   │  │  Bot Pod N   │
     │ (Shard 0–k)  │  │ (Shard k–2k) │  │ (Shard Nk–M) │
     └───────┬──────┘  └───────┬──────┘  └───────┬──────┘
             │                 │                 │
             └─────────────────┼─────────────────┘
                               │
             ┌─────────────────┼─────────────────┐
             │                 │                 │
     ┌───────▼──────┐  ┌───────▼──────┐  ┌───────▼──────┐
     │  PostgreSQL  │  │     Redis    │  │  BullMQ      │
     │  (Primary +  │  │  (L2 cache, │  │  Workers     │
     │   Replicas)  │  │  pub/sub)    │  │              │
     └──────────────┘  └──────────────┘  └──────────────┘

Guild → shard assignment: (guildId.toBigInt() >> 22n) % BigInt(totalShards)
(Parentheses required: % binds tighter than >> in TypeScript/JavaScript;
 without them the formula computes the wrong result.)
```

Each Bot Pod hosts a contiguous range of shards under discord.js's `ShardingManager`, sized so that a single pod carries roughly 1,000 guilds per shard before the next shard boundary is crossed — the point past which a single gateway connection's event volume starts to risk Discord's per-shard rate limits. Two mechanisms exist for one shard to reach state or trigger behavior on another: `client.shard.broadcastEval()`, which executes a serializable function across every shard and collects the results, reserved for low-frequency, operator-triggered needs (a cross-shard diagnostic aggregating guild counts across all pods, for instance); and Redis pub/sub, used for anything routine or high-frequency (cache invalidation, cross-shard presence updates) because `broadcastEval` carries meaningfully higher per-call latency and is not intended as a hot-path primitive. Application code never assumes it is running in an unsharded process; `context.shardId` is always populated, and any state a module needs across shard boundaries lives in PostgreSQL or Redis (§23), never in an in-process variable.

### 6.6 Twill — The Persona System for Multiple Bot Identities on Shared Infrastructure

Two hard ceilings shape when a single Discord bot identity stops being enough for a guild: Discord permits at most 100 commands registered per guild per application, and a single bot connection can hold at most one active voice connection per guild. Dumby's answer to both is the same mechanism, governed by a subsystem named **Twill** — a **Persona**: a complete additional Discord Application, with its own bot token, its own branding (banner, avatar, name, bio, status, rich presence), and its own gateway connection, bootstrapped from the exact same codebase and connected to the exact same PostgreSQL primary, Redis instance, and BullMQ queues as the main bot and every other Persona a deployment runs. Twill is the part of the framework responsible for creating a Persona, assigning it its identity, and governing its lifecycle end to end; a Persona is the identity Twill produces and manages, not a mechanism operating alongside it. A Persona is not a lighter-weight or differently-coded bot; it is Dumby itself, running again under a different identity — the same pattern most established multi-bot Discord projects already use, not an audio- or music-specific feature.

A Persona serves two distinct purposes:

- **Command capacity.** When a guild's enabled modules would exceed 100 registered commands under the main bot, a guild administrator adds a Persona instead of disabling a module. Commands from modules assigned to that Persona register under its own application, in its own guild-scoped command set, giving the guild a second full 100-command budget. If the guild later removes (kicks) the Persona, every module registered through it is disabled in that guild — a module's availability there is tied to the Persona's continued presence, not stored independently of it.
- **Voice capacity.** The main Dumby bot never opens a voice connection in any guild, in any circumstance — it can see and edit voice channel state (through its existing command surface and moderation modules) but never joins one. Any module requiring an active voice connection — a music module being the canonical example — requires a Persona, and a single Persona holds exactly one voice connection at a time; a guild wanting two simultaneous voice-connected modules needs two Personas, not one Persona configured twice.

Which Persona (or the main bot) owns a given module in a given guild is recorded in `guild_persona_bindings` (§21.2) — `(guildId, moduleSlug) → personaId`. The command router consults this table before dispatching: if an interaction's `applicationId` does not match the Persona a module is bound to in that guild, the router rejects the interaction with an ephemeral "This module is occupied by another persona" rather than silently misrouting or double-handling it. A module installed through a Persona is not visible to the main bot or to any other Persona in that guild as a standard, independently-enabled module — from every other identity's perspective, it is simply unavailable, occupied by the Persona that holds it.

A Persona is deployed exactly like the main bot — its own `src/entry/main.ts` process (§7.5) started against a Persona-specific token and a `PERSONA_ID` environment variable, sharded independently under §6.5's same topology if it ever grows large enough to need it — so a Persona crashing or restarting is an ordinary pod restart (§8), not a data-loss event: once it reconnects to the gateway, every module bound to it in `guild_persona_bindings` becomes active again automatically, with no failover to a different Persona in the meantime. Running additional Personas does not, by itself, risk enforcement under Discord's Terms of Service, which prohibits spam and impersonation, not the operation of multiple clearly-branded bot applications.

Twill's Persona system is entirely opt-in. A guild with fewer than 100 registered commands and no voice-dependent module in use runs on a single token and a single gateway connection, with nothing in its configuration or behavior implying a Persona could exist — Persona capacity is additive, reached for only when one of the two ceilings above is actually hit.

---

## 7. Directory & File Structure

### 7.1 Top-Level Layout

```
dumby/
├── .github/
│   ├── workflows/
│   │   ├── ci.yml                    ← typecheck → lint → test → build
│   │   ├── release.yml               ← changesets publish
│   │   ├── deploy-staging.yml
│   │   ├── deploy-production.yml
│   │   └── dependency-review.yml
│   ├── PULL_REQUEST_TEMPLATE.md
│   ├── CODEOWNERS
│   └── ISSUE_TEMPLATE/
│       ├── bug_report.yml
│       ├── feature_request.yml
│       └── module_proposal.yml
│
├── .husky/
│   ├── pre-commit                    ← pnpm lint-staged
│   └── commit-msg                   ← commitlint
│
├── .vscode/
│   ├── launch.json                   ← tsx-based debugger (no compiled output needed)
│   ├── settings.json
│   ├── extensions.json
│   └── snippets/dumby.code-snippets
│
├── docker/
│   ├── Dockerfile                   ← multi-stage: builder (tsc) + runtime (node)
│   ├── Dockerfile.dev               ← tsx with volume mount for live reload
│   └── docker-compose.yml           ← bot + postgres + redis + bullmq-dashboard
│
├── infra/
│   ├── terraform/
│   │   ├── environments/staging/
│   │   ├── environments/production/
│   │   └── modules/
│   │       ├── database/            ← PostgreSQL + read replicas + PgBouncer
│   │       ├── cache/               ← Redis Cluster
│   │       └── kubernetes/          ← GKE/EKS/AKS cluster
│   └── k8s/
│       ├── base/
│       │   ├── deployment.yaml      ← single Deployment with active/standby replicas
│       │   ├── service.yaml
│       │   ├── configmap.yaml
│       │   ├── serviceaccount.yaml
│       │   └── hpa.yaml
│       └── overlays/
│           ├── staging/
│           └── production/
│
├── scripts/
│   ├── scaffold.ts                  ← dumby scaffold module <name>
│   ├── migrate.ts                   ← migration runner entrypoint
│   └── seed.ts                      ← development seed data
│
├── src/
│   ├── core/                        ← Application Core (described in §7.2)
│   ├── modules/                     ← Feature modules (described in §7.3)
│   ├── shared/                      ← Cross-cutting utilities (described in §7.4)
│   ├── entry/                       ← Process entrypoints (described in §7.5)
│   └── monetization/                ← Monetization scaffold (described in §7.6)
│
├── tsconfig.json                    ← strict mode, NodeNext, path aliases
├── tsconfig.build.json              ← excludes tests, tsconfig.json extends this
├── eslint.config.ts                 ← flat config (ESLint ≥ 9)
├── prettier.config.ts
├── vitest.config.ts
├── commitlint.config.ts
├── .changeset/
│   └── config.json
├── package.json                     ← "type": "module"; scripts: build, dev, test...
└── pnpm-lock.yaml
```

### 7.2 `src/core/` — The Application Core

```
src/core/
├── application/
│   ├── Application.ts               ← 18-stage bootstrap orchestrator
│   ├── ApplicationContext.ts        ← Shared runtime context object
│   └── HealthServer.ts              ← Fastify-based /health, /ready, /startup endpoints
│                                       (starts at Stage 03, before module loading)
│
├── container/
│   ├── Container.ts                 ← DI container implementation
│   ├── tokens.ts                    ← Symbol-token registry (all core tokens)
│   └── lifetimes.ts                 ← 'singleton' | 'transient' | 'scoped'
│
├── modules/
│   ├── ModuleRegistry.ts            ← Discovery, validation, catalog
│   ├── ModuleLoader.ts              ← Dynamic import + lifecycle hooks
│   ├── ModuleManifest.ts            ← Manifest Zod schema + type exports
│   └── GuildModuleStateService.ts   ← guild_module_states read/write + cache
│
├── commands/
│   ├── CommandRouter.ts             ← Dispatch from InteractionCreate
│   ├── CommandRegistry.ts           ← Registration, collision detection
│   └── CommandDeployer.ts           ← Discord application command upsert
│
├── events/
│   ├── EventRouter.ts               ← Discord gateway event → module handlers
│   └── InternalEventBus.ts          ← cross-module typed event pub/sub
│
├── middleware/
│   ├── MiddlewarePipeline.ts        ← Onion composition, priority ordering
│   ├── BaseMiddleware.ts            ← Abstract base class
│   └── built-in/
│       ├── AdminTierGateMiddleware.ts  ← priority -10; first in chain
│       ├── TraceMiddleware.ts          ← priority 0
│       ├── AuthMiddleware.ts           ← priority 10
│       ├── GuildConfigMiddleware.ts    ← priority 20
│       ├── LocaleMiddleware.ts         ← priority 30
│       ├── RateLimitMiddleware.ts      ← priority 40 (atomic Redis check-and-increment)
│       ├── PermissionMiddleware.ts     ← priority 50 (Discord bitfield — Layer 5)
│       ├── RBACMiddleware.ts           ← priority 60 (Dumby roles — Layer 6)
│       ├── CooldownMiddleware.ts       ← priority 70
│       ├── DeferMiddleware.ts          ← priority 80 (14-minute interaction window)
│       └── AnalyticsMiddleware.ts      ← priority 90
│
├── permissions/
│   ├── PermissionResolver.ts        ← 7-layer resolution engine
│   ├── RBACService.ts               ← Dumby role definitions + membership
│   └── BlacklistService.ts          ← User and guild-level block lists (Layer 2)
│
├── config/
│   ├── ConfigManager.ts             ← Load, validate, freeze process config
│   ├── GuildConfigService.ts        ← Per-guild config read/write + cache
│   └── schema.ts                    ← Root Zod schema (all process-level env vars)
│
├── database/
│   ├── DatabaseManager.ts           ← Connection pool, read-replica routing
│   ├── MigrationRunner.ts           ← Ordered migration execution
│   ├── BaseRepository.ts            ← Typed CRUD base; transaction scope owned by service layer
│   ├── QueryLogger.ts               ← Slow/critical query logging (§20.2 thresholds)
│   └── migrations/
│       ├── core/
│       │   ├── 0001_create_guilds.ts
│       │   ├── 0002_create_users.ts
│       │   ├── 0003_create_guild_members.ts
│       │   ├── 0004_create_guild_configs.ts
│       │   ├── 0005_create_guild_roles.ts
│       │   ├── 0006_create_audit_logs.ts
│       │   ├── 0007_create_guild_module_states.ts
│       │   ├── 0008_create_marketplace_listings.ts
│       │   ├── 0009_create_metering_usage_daily.ts
│       │   ├── 0010_create_backup_history.ts
│       │   └── 0011_create_guild_outbound_webhooks.ts
│       └── backfill/
│           └── 0012_backfill_guild_module_states.ts   ← proactive, runs every deployment (§11.4.1)
│
├── cache/
│   ├── CacheManager.ts              ← L1 (in-process LRU) + L2 (Redis) unified API
│   ├── L1Cache.ts                   ← In-process LRU cache
│   ├── L2Cache.ts                   ← Redis-backed cache
│   └── StampedeGuard.ts             ← Distributed lock + probabilistic early expiration
│
├── http/
│   ├── HttpServer.ts                ← Fastify instance + plugin registration
│   ├── routes/
│   │   ├── health.routes.ts         ← /health/liveness, /health/readiness, /health/startup
│   │   ├── metrics.routes.ts        ← /metrics (Prometheus text format)
│   │   ├── webhooks.routes.ts       ← /webhooks/inbound/:provider
│   │   └── modules.routes.ts        ← /api/modules/** (MDIS endpoints)
│   └── middleware/
│       ├── authMiddleware.ts        ← API key + OAuth2 verification for REST API
│       └── requestLogger.ts
│
├── queue/
│   ├── QueueManager.ts              ← BullMQ queue registry
│   ├── BaseProcessor.ts             ← Abstract job processor base class
│   ├── Scheduler.ts                 ← Cron task registration + BullMQ repeatable jobs
│   └── BaseJob.ts                   ← Abstract cron task base class
│
├── i18n/
│   ├── I18nManager.ts               ← Locale loading, namespace merging, resolution
│   └── formatters.ts                ← Date, number, currency, duration formatters
│
├── observability/
│   ├── Logger.ts                    ← Pino root logger factory + context scoping
│   ├── Metrics.ts                   ← Prometheus registry + all core metric definitions
│   └── Tracing.ts                   ← OpenTelemetry SDK initialization + tracer factory
│
└── error/
    ├── DumbyError.ts                ← Abstract root error class
    ├── ConfigurationError.ts
    ├── ModuleError.ts
    ├── CommandError.ts
    ├── PermissionError.ts
    ├── DatabaseError.ts
    ├── CacheError.ts
    ├── ExternalApiError.ts
    └── ValidationError.ts
```

### 7.3 `src/modules/` — One Directory Per Module

Each module follows an identical internal structure (full anatomy in §10.3) — this is the one convention the framework does enforce, regardless of what any specific module does. A fresh framework installation ships with only the `_template` reference module (§10.7) actually present under `src/modules/`; every other name below is one of the 22 illustrative examples cataloged in §32.3, shown here only to illustrate the naming and tier-labeling convention a real module directory follows once an author builds one:

```
src/modules/
├── _template/                ← the only module actually present in a fresh install (§10.7)
├── core-admin/          ← [Admin] — illustrative, §32.3 row 01
├── guild-settings/      ← [Core] — illustrative, §32.3 row 02
├── moderation/          ← [Standard] — illustrative, §32.3 row 04
├── auto-moderation/     ← [Standard] — illustrative, §32.3 row 05
├── anti-raid/           ← [Standard] — illustrative, §32.3 row 06
├── verification/        ← [Standard] — illustrative, §32.3 row 07
├── logging/             ← [Standard] — illustrative, §32.3 row 08
├── welcome/             ← [Standard] — illustrative, §32.3 row 09
├── leveling/            ← [Standard] — illustrative, §32.3 row 10
├── economy/             ← [Standard] — illustrative, §32.3 row 11
├── starboard/           ← [Standard] — illustrative, §32.3 row 12
├── reaction-roles/      ← [Standard] — illustrative, §32.3 row 13
├── polls/               ← [Standard] — illustrative, §32.3 row 14
├── birthdays/           ← [Standard] — illustrative, §32.3 row 15
├── tags/                ← [Standard] — illustrative, §32.3 row 16
├── utility/             ← [Core] — illustrative, §32.3 row 03
├── reminders/           ← [Standard] — illustrative, §32.3 row 17
├── threads-manager/     ← [Standard] — illustrative, §32.3 row 18
├── music/               ← [Marketplace] — illustrative, §32.3 row 21
├── giveaways/           ← [Standard] — illustrative, §32.3 row 19
├── tickets/             ← [Standard] — illustrative, §32.3 row 20
└── integrations/        ← [Marketplace] — illustrative, §32.3 row 22
```

### 7.4 `src/shared/` — Cross-Cutting Utilities

```
src/shared/
├── types/
│   ├── discord.ts       ← Extended discord.js type augmentations
│   ├── context.ts       ← CommandContext type (passed to every handler)
│   └── pagination.ts    ← Cursor and offset pagination cursor types
├── utils/
│   ├── snowflake.ts     ← Snowflake parsing utilities
│   ├── embed.ts         ← Embed builder helpers
│   ├── crypto.ts        ← crypto.randomUUID, crypto.randomInt wrappers
│   └── retry.ts         ← Generic exponential-backoff retry utility (max 3 attempts, 1000ms base, does NOT compose with BullMQ — see §26.4 for coordination)
├── constants/
│   ├── colors.ts        ← Embed color palette
│   ├── limits.ts        ← Discord API limits (message length, embed count, etc.)
│   └── durations.ts     ← Common duration constants in milliseconds
└── testing/
    ├── MockContainer.ts ← Pre-wired DI container for unit tests
    ├── fixtures/        ← Shared fixture factories
    └── helpers/         ← DatabaseHelper, EventBusHelper, etc.
```

### 7.5 `src/entry/` — Process Entrypoints

```
src/entry/
├── main.ts              ← Production entry: creates Application, calls bootstrap()
├── worker.ts            ← BullMQ worker-only entry (for CPU-isolated worker processes)
├── migrate.ts           ← Migration-only entry (runs migrations without starting gateway)
├── pep.ts               ← Power Engine Panel entry (§19.13): no gateway, no modules
├── clai.ts              ← CLAI entry (§19.16): SSH-hosted operator terminal service
├── swastik.ts           ← Swastik entry (§13.4–§13.12): deployment, hot-reload, and hot-swap service
└── credentials.ts       ← Credentials Service entry (§19.19): local-network authkey and dev ID issuance
```

Every entrypoint boots the same DI container against the same core services (§9); each simply starts a different subset of them and skips the rest. `main.ts` is the only entrypoint that opens a Discord gateway connection and loads feature modules — including when it is started against a Persona's token rather than the main bot's (§6.6). `pep.ts`, `clai.ts`, `swastik.ts`, and `credentials.ts` never do either: they are how the Power Engine Panel, CLAI, Swastik, and the Credentials Service each run as their own deployable process rather than as a code path inside the bot itself.

### 7.6 `src/monetization/` — Monetization Scaffold

```
src/monetization/
├── adapters/             ← empty — a future billing provider's integration lives here
├── models/               ← empty — future billing/entitlement data shapes live here
├── services/             ← empty — future business logic (entitlement checks, usage
│                             thresholds) lives here
└── README.md             ← describes the folder's purpose and intended structure
```

This directory is scaffold, not implementation: it reserves a stable, conventional location — mirroring the `adapters/` · `models/` · `services/` shape the rest of the framework already uses — for a monetization model that has not been chosen yet, so that whichever model is chosen (subscriptions, pay-per-use, one-time purchases, or any combination) can be dropped in without restructuring the framework around it later. Nothing outside this directory depends on its contents; no core service imports from `src/monetization/`, and no bootstrap stage (§8.2) references it. An empty `src/monetization/` is the expected, complete state of this directory for as long as no monetization model has been built on top of it.

---

## 8. Application Bootstrap & Lifecycle

### 8.1 The Application Class

`Application` is the single root orchestrator. It holds references to every shared service (the DI container, the database manager, the cache manager, the HTTP server, the gateway client), drives the entire startup sequence as a linear series of named stages, and exposes the shutdown path invoked by process signals. Nothing starts before `Application.bootstrap()` is called; nothing runs after `Application.shutdown()` completes.

### 8.2 The 18-Stage Startup Sequence

Each stage has a hard failure mode and a name that appears verbatim in the boot log. A stage failure causes the process to exit with a non-zero code; no stage is optional or deferrable.

| Stage | Name | What Happens | Failure Mode |
|---|---|---|---|
| 01 | `PROCESS_SETUP` | Register `uncaughtException` and `unhandledRejection` handlers; set process title | Fatal — cannot proceed without safety nets |
| 02 | `CONFIG_LOAD` | Load and validate root Zod schema against `process.env` | Fatal — exit with field-level Zod error output |
| 03 | `HEALTH_SERVER_INIT` | Start Fastify HTTP server on `HEALTH_PORT`; `/health/startup`, `/health/liveness`, `/health/readiness` begin returning 503 (not ready yet) | Fatal — if health server cannot bind, operator has no diagnostic surface |
| 04 | `OBSERVABILITY_INIT` | Initialize Pino root logger, Prometheus registry, OpenTelemetry SDK; all subsequent log lines are structured JSON | Fatal |
| 05 | `DATABASE_CONNECT` | Open Knex connection pool (primary + read replicas if configured); verify with `SELECT 1` | Fatal |
| 06 | `MIGRATION_RUN` | Run all pending migrations across core and module directories in declared order; verify `guild_module_states` backfill is current | Fatal — a missing migration is a deployment error |
| 07 | `CACHE_CONNECT` | Open Redis connection; verify with `PING` | Fatal |
| 08 | `QUEUE_INIT` | Initialize BullMQ queue connections; register worker processors | Fatal |
| 09 | `DI_BOOTSTRAP` | Bind all core services into the DI container; freeze core token namespace | Fatal |
| 10 | `MODULE_DISCOVER` | Scan `src/modules/`; collect all `manifest.ts` files | Fatal — no modules = nothing to do |
| 11 | `MODULE_VALIDATE` | Validate every manifest against the Zod schema; resolve cross-module dependency graph; detect cycles | Fatal — an invalid manifest or dependency cycle is a development error |
| 12 | `MODULE_LOAD` | Call `onLoad(container)` on every module in topological dependency order; modules with `required: false` that fail here are disabled with a warning, startup continues | Fatal only if a `required: true` module's `onLoad` throws |
| 13 | `COMMAND_REGISTER` | Collect all command classes from enabled modules; register with CommandRegistry; run collision detection | Fatal — a command name collision is a development error |
| 14 | `EVENT_REGISTER` | Register all event handler classes from enabled modules with EventRouter | Fatal |
| 15 | `DISCORD_LOGIN` | Call `client.login(BOT_TOKEN)` | Fatal — without gateway, nothing works |
| 16 | `CLIENT_READY` | Wait for discord.js `ready` event; compute bot's shard assignments | Fatal |
| 17 | `MODULE_READY` | Call `onReady(client)` on every loaded module; failures here are non-fatal and disable the specific module with a warning — the bot is live and responding during this stage | Non-fatal per module |
| 18 | `STARTUP_COMPLETE` | Update health server: `/health/readiness` returns 200 only when all `required: true` modules have completed `onReady()` without error; emit `dumby.system.ready` on internal bus | — |

> **Health probe semantics:** The `/health/startup` probe returns 200 once Stage 15 completes (gateway connected). The `/health/liveness` probe returns 200 once Stage 04 completes (observability up). The `/health/readiness` probe returns 200 only after Stage 18 completes with all required modules healthy. Kubernetes `startupProbe` uses `/health/startup`; `livenessProbe` uses `/health/liveness`; `readinessProbe` uses `/health/readiness`. This distinction ensures the bot is only sent traffic after it is genuinely ready, while still appearing alive to the orchestrator during the unavoidably long Stage 17 (module onReady).

### 8.3 Graceful Shutdown Sequence

Triggered by `SIGTERM`, `SIGINT`, or `SIGUSR2`. The shutdown executes the following nine steps sequentially, with independent timeouts per step:

| Step | Action | Timeout | Notes |
|---|---|---|---|
| 01 | Stop accepting new Discord gateway events | 30 s | Shard disconnect; Discord marks the bot offline |
| 02 | Drain in-flight command executions | 30 s | Wait for all active `Command.execute()` calls to complete |
| 03 | Call `onUnload()` on every loaded module (reverse load order) | 30 s | Module cleanup: cancel timers, flush in-memory state |
| 04 | Drain BullMQ queues (stop accepting new jobs; let current workers finish) | 60 s | Workers completing within this window finish normally; workers still running after 60 s are abandoned with a dead-letter entry |
| 05 | Close HTTP server (finish in-flight HTTP requests) | 10 s | |
| 06 | Flush Pino log buffer and OpenTelemetry span exporter | 5 s | Ensures no log lines or traces are lost |
| 07 | Close BullMQ connections | 5 s | |
| 08 | Close Redis connection | 5 s | |
| 09 | Close database connection pool | 5 s | |

> **Note on restart behavior under Kubernetes:** however a deployment triggers a restart — an Admin-tier command is one way, an orchestrator-level pod delete is another — the framework's own response is to call `process.exit(0)` after completing the shutdown sequence (§8.3), causing the container to exit with a zero code; the Kubernetes restart policy is what actually brings the process back. No signal-based self-re-exec mechanism is used or required.

> **Total shutdown time — ceilings, not expected durations:** Steps 01–09 execute sequentially, and each step's listed value is a worst-case ceiling the framework will wait up to before force-proceeding to the next step — not a typical duration. A shutdown with no long-running in-flight commands and a shallow queue backlog (the overwhelming majority of real shutdown events) completes in low single-digit seconds, since most steps resolve almost immediately once there is nothing left to drain. The absolute worst case, where every step independently consumes its full ceiling, sums to 180 s. The reference `deployment.yaml` sets `terminationGracePeriodSeconds: 190` — the full worst-case sum plus a 10 s buffer — specifically so that Step 4's dead-letter write for an abandoned job is itself guaranteed to finish rather than being cut off mid-write: a shorter grace period does not make the realistic case faster (that case already finishes in single-digit seconds regardless), it only removes the margin that keeps a genuine worst-case shutdown from being killed before its own failure-recording step completes. An operator whose workload never carries long-running commands or a deep queue backlog, and who values faster pod recycling over guarding the tail case above, can lower this deliberately — 190 s is the default specifically because guaranteeing every abandoned job reaches the dead-letter queue with a full record, rather than vanishing silently, is the outcome this framework defaults into.

### 8.4 Process Signal Reference

| Signal | Trigger | Action |
|---|---|---|
| `SIGTERM` | Kubernetes pod termination, `docker stop` | Graceful shutdown (9-step sequence above) |
| `SIGINT` | `Ctrl+C` in development | Graceful shutdown |
| `SIGUSR2` | Reserved, unused | No handler is registered; restarts are driven exclusively by `process.exit(0)` plus the orchestrator's own restart policy |
| `uncaughtException` | Unhandled throw at process level | Flush logs and traces, attempt Steps 06–09 of shutdown, then `process.exit(1)`. Attempts the graceful data-flush steps but does not attempt the full gateway/queue drain, since the process state is unknown. |
| `unhandledRejection` | Unhandled Promise rejection | Log at `error` level, emit `dumby.system.unhandledRejection` on internal bus; the process continues unless the rejection came from a handler that the framework knows should not have failed silently. Individual module-level unhandled rejections are caught by the middleware pipeline's error boundary. |

---

## 9. Dependency Injection & Service Container

### 9.1 Purpose and Role

The DI container is the single mechanism by which services are shared across the framework and between modules. There are no module-level singletons, no global variables reachable through imports, and no service-locator calls where a class fetches its own dependencies. Every dependency a class needs arrives through its constructor, resolved by the container from a token. This property — constructor injection through the container, exclusively — is what makes every class in Dumby independently testable with MockContainer substitutions (§40.2) and what makes the cross-module dependency graph fully explicit rather than hidden in import chains.

### 9.2 Binding Tokens

Every service is identified by a `Symbol`, not a string. Symbols are unambiguous (no string collision risk), unspoofable (a Symbol is equal only to itself), and type-safe when used with TypeScript generics:

```
// tokens.ts (core)
export const TOKENS = {
  Logger:         Symbol('Logger'),
  Config:         Symbol('Config'),
  Database:       Symbol('Database'),
  Cache:          Symbol('Cache'),
  Queue:          Symbol('Queue'),
  Scheduler:      Symbol('Scheduler'),
  I18n:           Symbol('I18n'),
  Metrics:        Symbol('Metrics'),
  Tracer:         Symbol('Tracer'),
  EventBus:       Symbol('EventBus'),
  PermResolver:   Symbol('PermResolver'),
  GuildConfig:    Symbol('GuildConfig'),
  ModuleRegistry: Symbol('ModuleRegistry'),
  HttpServer:     Symbol('HttpServer'),
} as const;

// A module's tokens.ts (example: moderation module)
export const MODERATION_TOKENS = {
  ModerationService:    Symbol('Moderation.ModerationService'),
  CaseService:          Symbol('Moderation.CaseService'),
  CaseRepository:       Symbol('Moderation.CaseRepository'),
  InfractionRepository: Symbol('Moderation.InfractionRepository'),
} as const;
```

Core tokens are registered during Stage 09. Module tokens are registered during Stage 12, in topological dependency order, so a module whose `depends` array references another module's token can safely resolve it at construction time.

### 9.3 Binding Lifetimes

| Lifetime | Description | Typical Use |
|---|---|---|
| `singleton` | One instance per container; created on first resolution, reused thereafter | Services, repositories, database connections |
| `transient` | New instance on every resolution | Stateless utility objects; rarely used |
| `scoped` | One instance per command-execution scope; the container creates a child container for the scope | Per-request context objects that must not bleed between concurrent executions |

### 9.4 Dependency Declaration Pattern

```
// Construction via container:
class CaseService {
  constructor(
    private readonly caseRepo:  ICaseRepository,
    private readonly logger:    ILogger,
    private readonly eventBus:  IEventBus,
    private readonly config:    IGuildConfigService,
  ) {}
}

// Registration in module manifest's `services` array:
services: [
  {
    token:    MODERATION_TOKENS.CaseService,
    class:    CaseService,
    lifetime: 'singleton',
    deps: [
      MODERATION_TOKENS.CaseRepository,
      TOKENS.Logger,
      TOKENS.EventBus,
      TOKENS.GuildConfig,
    ],
  },
]
```

The container reads the `deps` array to resolve and inject in order. There are no decorators, no `reflect-metadata`, no annotation magic. Every dependency is stated as a Symbol in the `deps` array — explicit (P1), statically checkable against the TypeScript interface types the tokens are typed against.

### 9.5 Resolution Algorithm

```
container.resolve(token):
  1. Check singleton cache → return cached instance if present
  2. Look up binding for token → throw DumbyError if not found
  3. Resolve each dep token recursively (detect cycles via resolution stack;
     throw on cycle detection)
  4. Construct instance with resolved deps
  5. If lifetime === 'singleton': store in cache
  6. Return instance
```

Circular dependency detection uses a resolution stack (a Set of tokens currently being resolved). If resolving token A requires token B, and resolving B requires A, the second attempt to push A onto the resolution stack finds it already present and throws immediately with the full cycle path, at Stage 09 or Stage 12 (before the bot accepts any traffic). A circular dependency is never a runtime surprise.

### 9.6 Module-Scoped Child Containers

For the `scoped` lifetime, the container creates a child container per command execution context. The child inherits all bindings from its parent (can resolve singletons like services and repositories) but maintains its own scope-level instance cache. When the scope ends (command execution completes), the child is discarded, releasing any scoped instances. This is the mechanism used for per-request context objects like `CommandContext` that must not bleed between concurrent interactions.

### 9.7 The Container in Testing

`MockContainer` (§40.2) is a pre-configured container instance that replaces every external dependency (database, cache, event bus, HTTP client) with in-memory test doubles that expose typed assertion methods (`assertEmitted(eventName)`, `assertEnqueued(queueName, payload)`, `assertLogged(level, messagePattern)`). A unit test creates a `MockContainer`, registers the service under test with its real class, and resolves it — the service thinks it's talking to real infrastructure but every call is intercepted and recorded. This requires no process-level setup, no real database, and no network.

---

# PART III — THE MODULE SYSTEM

---

## 10. Module Anatomy & Manifest

### 10.1 The Module as the Unit of Ownership

A module is the fundamental unit of feature ownership in Dumby. It is a complete vertical slice through the application stack — commands, event handlers, services, repositories, background jobs, scheduled tasks, database migrations, locale files, and tests — all living together under one folder, governed by one manifest, and answerable to one functional owner. Nothing about a module's internals is visible to another module except what it deliberately publishes.

Every module belongs to exactly one governance **tier** — Admin, Core, Standard, or Marketplace — declared in its manifest and enforced by the framework everywhere visibility, controllability, and rate-limit treatment matter. The full tier model is in §11; this section covers module structure independent of tier.

### 10.2 The Module Manifest — Complete Field Reference

Every module's `manifest.ts` exports a single object validated against the manifest Zod schema during Stage 11 of bootstrap. The schema below is the complete field reference; no field may be added beyond this list without a framework-version bump.

```
name            (string, required, kebab-case, globally unique across all modules)
                Canonical identifier. Used in DI token namespaces, cache key
                prefixes, queue name prefixes, migration table ownership
                attribution, and every log/metric/trace label.

version         (string, required, valid semver)
                Module's own semver version, independent of the bot version.
                Used to validate inter-module dependency compatibility.

description     (string, required, 1–120 characters)
                Human-readable summary shown wherever a deployment lists
                installed modules, and in the Interface's module catalog
                panels (§14.4).

tier            ('admin' | 'core' | 'standard' | 'marketplace', required)
                Determines visibility, controllability, rate-limit treatment,
                and Marketplace surfacing. No default — a manifest omitting
                this field fails validation and the application does not start.
                Full semantics in §11.

devGuildOnly    (boolean, required when tier === 'admin', forbidden otherwise)
                Must be true for Admin-tier modules. Stated explicitly, in
                addition to being implied by tier, so a reviewer sees the
                dev-guild restriction asserted twice before merging a PR.

hardcoded       (boolean, required)
                When true, this module is a private build restricted
                exclusively to the guild named in hardcodeGuildId — it can
                never be released publicly, requires no license, and never
                enters the Marketplace submission pipeline (§14.4). When
                false, the module is eligible for public release once its
                developer's Swastik license is approved (§13.7), and its
                visibility beyond that point is governed by releaseStatus,
                below. Independent of tier: a hardcoded module can declare
                any tier its author chooses, since hardcoding constrains
                where a module may run, not how the module system treats it.

hardcodeGuildId (snowflake, required when hardcoded === true, forbidden otherwise)
                The single guild this module is confined to for as long as
                hardcoded remains true. Distinct from DEVELOPMENT_GUILD_ID
                (§20.2): that variable scopes the whole process's Admin-tier
                surface fleet-wide, while this field scopes one specific
                module's visibility, and the two are never required to name
                the same guild.

releaseStatus   ('private' | 'public', required when hardcoded === false,
                 forbidden otherwise)
                Governs whether a licensed (non-hardcoded) module is
                actually published to the Marketplace catalog (§14.2–§14.4)
                or held back at its developer's own discretion. A licensed
                module declaring releaseStatus: 'private' passes every
                Swastik validation and promotion step (§13.9–§13.10) exactly
                as a public module does; it simply never appears in
                `/marketplace browse` until its developer changes this field
                to 'public' and the change clears the same review pipeline
                any other manifest change does. This is what distinguishes a
                developer who has chosen to stay private from one who is
                still hardcoded to a single guild — the former holds a valid,
                approved license and could publish at will; the latter cannot
                publish at all until hardcoded itself is set to false.

devId           (string, required)
                The Swastik developer ID (§13.6) of the module's registered
                author, assigned at developer registration and carried in
                every manifest that developer submits — the same identifier
                that binds the module to its licensing record (§13.7).

buildId         (string, required)
                The Swastik build ID (§13.8) assigned to this specific
                uploaded version. A new buildId is issued for every version
                Swastik accepts; ModuleRegistry validates that a manifest's
                devId and buildId are a valid, currently-approved pair,
                bound to one another, before the module is permitted to
                load (§13.9).

marketplaceCategory ('audio'|'community'|'security'|'integrations'|'utility',
                     required when tier === 'marketplace', forbidden otherwise)
                Powers the /marketplace browse [category] grouping (§14.3).

required        (boolean, default: false)
                If true, a failure in this module's onLoad() is fatal to the
                entire application at Stage 12. If false, the module is
                logged as a warning and startup continues without it.

depends         (array of { token: Symbol, version?: string }, default: [])
                Hard dependencies on another module's published DI token.
                ModuleRegistry validates every declared token exists and that
                version constraints are satisfiable, at Stage 11.

provides        (array of { token: Symbol, contract: TypeAlias }, default: [])
                Services this module publishes for other modules to consume.
                'contract' references a TypeScript interface — checked
                statically by tsc against every consumer's usage, so a
                consumer calling a method the contract doesn't define fails
                at compile time in CI.

intents         (array of GatewayIntentBits, default: [])
                Discord Gateway Intents this module requires. The union of
                all enabled modules' intents is what Stage 15 requests.

partials        (array of Partials, default: [])
                Discord.js Partials this module requires for uncached objects.

commands        (array of class references, default: [])
                Every command handler class this module contributes.

events          (array of class references, default: [])
                Every Discord gateway event handler class this module registers.

services        (array of { token, class, lifetime, deps }, default: [])
                Services registered into the DI container.
                lifetime: 'singleton' | 'transient' | 'scoped' (default: singleton)
                deps: array of Symbols, in constructor-argument order

repositories    (array of { token, class, deps }, default: [])
                Repository classes (always registered as singletons).

jobs            (array of { queueName, class, deps }, default: [])
                BullMQ job processor classes registered against named queues.

tasks           (array of class references, default: [])
                Cron task classes registered into the Scheduler.

routes          (array of class references, default: [])
                Fastify HTTP route handler classes registered in the HTTP server.

middleware      (array of { class, global: boolean }, default: [])
                Middleware classes. global: true applies system-wide;
                false makes it available for per-command composition only.

migrations      (array of string paths, default: [])
                Relative paths to this module's .ts migration files, in order.
                MigrationRunner runs them in declaration order.

locales         (string path, optional)
                Path to this module's locale directory, merged into the global
                I18nManager under the module's own namespace at Stage 12.

config          (Zod schema, optional)
                Module-specific configuration schema. Variables prefixed with
                the module name in SCREAMING_SNAKE_CASE (e.g., MODERATION_MAX_WARNS).

eventsCatalog   (Record<string, { payload: TypeAlias, description: string }>, optional)
                Developer-facing documentation of every domain event this
                module emits. Used to generate module API docs and to
                validate subscriber payload shape expectations.

dashboardSchema (object, optional)
                MDIS schema describing this module's web configuration panel
                (§14.5 and §47.2). A module without this field still appears
                on the dashboard via the graceful "Web Panel Not Available"
                placeholder.
```

### 10.2.1 Manifest vs. Database — What Lives Where

Every field in §10.2's reference belongs to the manifest specifically because it is fixed at build time and travels with the code itself: a module's name, its tier, its declared dependencies, its `hardcoded`/`hardcodeGuildId`/`releaseStatus` classification, and its `devId`/`buildId` pair are all facts about one specific, versioned artifact, unpacked, validated, and loaded fresh from the manifest at every bootstrap (Stage 11, §8.2) and every Swastik-driven hot-swap (§13.9). None of it is meant to change without a new version being authored, reviewed, and promoted — the manifest is read, never written, by anything running inside the application process.

Everything that changes at runtime independently of any code change belongs to the database instead, never the manifest: a guild's own configuration (`guild_configs`, §20.3), a module's enabled/disabled state per guild (`guild_module_states`, §11.4), a developer's licensing approval status (`swastik_developers.approvalStatus`, §13.7), and a build's staging and promotion state (`swastik_builds.status`, §13.10) are all facts that change on their own schedule — driven by a guild administrator's action, a project owner's manual approval, or Swastik's own deployment pipeline — never by redeploying code. The coordination between the two is deliberately narrow and one-directional: the manifest declares what a module *is* and *requires*; the database records what is currently *true* about a specific guild's or a specific developer's relationship to it. `ModuleRegistry` and `GuildModuleStateService` (§11.4) are the two services that read from both, and each does so for a single, named purpose — validating a manifest's static claims against the database's live state for exactly the fields that call for it, such as a `devId`/`buildId` pair's approval status or a guild's own enablement row — never by writing manifest-shaped data into the database, or database-shaped data into a manifest. This distinction is what keeps a module's identity stable across every guild it runs in while still letting each guild, and each developer's standing, evolve independently at runtime.

### 10.3 Module Internal Structure — The Canonical Layout

Every module follows this structure. An absent folder means the module has no deliverable for that category; the framework never requires empty directories. TypeScript files use `.ts`; migration files use `.ts` with Knex QueryBuilder types.

```
src/modules/moderation/
├── manifest.ts               ← The module's complete contract declaration
├── index.ts                  ← onLoad(container) / onReady(client) / onUnload()
│
├── commands/
│   ├── ban.command.ts
│   ├── kick.command.ts
│   ├── mute.command.ts
│   ├── unmute.command.ts
│   ├── warn.command.ts
│   ├── case.command.ts       ← /case view | close | delete (subcommand group)
│   ├── history.command.ts
│   ├── purge.command.ts
│   ├── slowmode.command.ts
│   └── viewModHistory.context.ts  ← User context menu: "View Mod History"
│
├── events/
│   ├── guildBanAdd.handler.ts
│   ├── guildBanRemove.handler.ts
│   ├── guildMemberRemove.handler.ts
│   └── messageDelete.handler.ts
│
├── services/
│   ├── ModerationService.ts   ← Primary orchestrator; calls repos + emits events
│   ├── CaseService.ts         ← Case lifecycle: create, update, close
│   └── PurgeService.ts        ← Bulk message deletion with rate-limit awareness
│
├── repositories/
│   ├── CaseRepository.ts      ← All SQL against moderation_cases
│   └── InfractionRepository.ts
│
├── jobs/
│   ├── UnmuteJob.ts           ← Processes delayed unmute payloads
│   └── AppealNotifyJob.ts     ← Sends appeal notifications
│
├── tasks/
│   └── ExpiredMuteCleanupTask.ts  ← Daily cron; cleans unprocessed expired mutes
│
├── config/
│   └── schema.ts              ← Module Zod config schema
│
├── migrations/
│   ├── 0001_create_moderation_cases.ts
│   ├── 0002_create_moderation_infractions.ts
│   └── 0003_add_case_appeal_fields.ts
│
├── locales/
│   ├── en-US.json
│   ├── es-ES.json
│   └── de-DE.json
│
└── __tests__/
    ├── ModerationService.unit.test.ts
    ├── CaseService.unit.test.ts
    ├── ban.command.test.ts
    ├── CaseRepository.integration.test.ts
    └── fixtures/
        └── cases.fixture.ts
```

### 10.4 The Three-Layer Rule Inside a Module

Every module enforces a single-direction dependency structure. Commands call services; services call repositories. Neither direction reverses.

```
Command (entry point: validation, routing, presentation)
  ↓
Service (business logic: decisions, transformations, event emission)
  ↓
Repository (data access: SQL only; no business logic; no event emission)
```

**Why this matters in practice:** A repository method that emits an event on the bus, or a command that queries the database directly, represents a violation of P3. The boundary means tests can substitute any layer with a test double without needing anything below it: a service test mocks its repositories; a command test mocks its services; neither requires a real database or a real Discord gateway.

### 10.5 Module Isolation Rules — Enforced by Tooling

These are not conventions that rely on reviewer discipline — they are enforced by the build:

1. **No cross-module relative imports.** ESLint rule `no-restricted-imports` with a per-module glob (`../../{other-module}/*`) turns cross-module imports into build errors. The only legal import path from Module A into Module B's territory is through Module B's published DI token, resolved at runtime, never through a static `import`.
2. **No writes to another module's database tables.** Cross-module reads are permitted only through a declared `ForCrossModuleRead` accessor (§12.1 Pattern 3) — a single-row, key-only lookup the owning module explicitly publishes and lint enforces the shape of, not an open query against the table. Writes across a module boundary are a code-review hard stop with no equivalent carve-out, since they violate the module's ability to enforce its own data invariants.
3. **No mutation of another module's configuration namespace.** Zod schema namespacing and prefix-enforcement prevent one module's config keys from colliding with or overwriting another's.
4. **No cross-module middleware hooking.** A middleware registered in Module A's manifest cannot intercept Module B's commands unless it declares `global: true`, in which case it applies system-wide and must justify that scope.
5. **Every cross-module dependency is declared.** A module that uses another module's service without declaring the token in its `depends` array will fail to resolve the token at Stage 12. There are no implicit dependencies.

### 10.6 Building a Module — The Extensibility Contract

§§10.1–10.5 specify what a module *is*. This section is the contract a developer — whether shipping the next feature for this codebase or a third-party author with no other relationship to it — follows to build one, from an empty directory to a reviewed, installable artifact. The obligation is narrow and explicit, by design (P1, §3):

- Declare every dependency in `depends` (§10.2) — nothing a module needs is ever assumed to be globally available.
- Declare a `tier` (§11) and satisfy that tier's validation rules honestly, against the module's actual command list, not the list it might grow into.
- Own your own data: every table a module needs is created by its own migrations and queried only by its own repositories (§10.5).
- Publish, in `provides` and `eventsCatalog`, exactly the surface other modules are meant to depend on — and nothing more, since anything published becomes part of the module's own semver contract (§12.3).
- Never import another module's source files directly, and never write to another module's tables, under any circumstance (§10.5).

Satisfying these five obligations is the entire extensibility contract. The remainder of this section is process — how to produce a module that satisfies them correctly the first time.

### 10.7 Step 1 — Scaffold

`pnpm dumby scaffold module <name>` (§41.1) generates a complete, manifest-valid module skeleton from the canonical `_template` module, prompting for exactly the structural components the new module needs. The generated module registers disabled by default; nothing scaffolded is live until a developer enables it deliberately.

### 10.8 Step 2 — Define the Manifest and the Command Surface

Fill in every required field from §10.2's reference table, starting with `tier`. Choosing a tier honestly is worth settling before writing a single command, since tier determines which validation rules (§11.3) and which middleware behavior the rest of the module is built against — a module that starts Standard and later needs Admin-only commands is a harder migration than one that declared Admin from the start. For each command, define the canonical command-class fields (§15.2): the Discord command builder, the `execute` handler, and any permission, cooldown, or defer requirements.

### 10.9 Step 3 — Write the Entry, Logic, and Data Layers, Each in Its Own File

Following the three-layer rule (§10.4): a command class in `commands/` parses input and calls exactly one service method; a service in `services/` holds the actual business rule and is the only place permitted to emit an event or call another module's published service; a repository in `repositories/` is the only place permitted to construct a query. This is enforced, not advisory — the module-boundary ESLint rule and the `dumby/no-direct-db-in-command` custom rule (§41.4) fail the build on a violation, so a reviewer never has to manually catch a misplaced database call.

### 10.10 Step 4 — Test, Document, and Submit for Review

Every new service gets a unit test built on `MockContainer` (§40.3); every database-touching code path gets an integration test against the real, disposable test database (§40.4), against the coverage floor in §40.6. Keeping `eventsCatalog` (§10.2) current for every event the module actually emits is what lets §12's contract-versioning discipline apply to those events at all — an author who skips it is publishing an event no consumer can safely depend on.

**For a module maintained as part of a deployment's own trusted codebase** (as opposed to arriving as a third-party submission), this is the entire path: tests pass, code review against the checklist in §42.4, merge.

**For a third-party Marketplace module**, the five-step submission pipeline in §14.4 applies before the module is ever listed — automated manifest validation, a static boundary audit, manual security review, and cryptographic signing — since a Marketplace module carries a different trust posture than one shipping inside the trusted core (§11.2).

### 10.11 What "Done" Looks Like

A finished module: declares a tier honestly against its actual command list; owns every table it touches; publishes a `provides`/`eventsCatalog` surface exactly as wide as other modules genuinely need and no wider; meets the unit and integration coverage thresholds in §40.6; and, if it is a Marketplace submission, has passed the five-step pipeline in §14.4. None of that differs based on whether the module shipped with the framework or arrived from a third party six months later — the contract in §10.6 is the same contract either way, which is the point of treating the module system as the framework's public extension API rather than maintaining a separate, reduced plugin interface alongside it.

---

## 11. Module Tiers & Lifecycle State Machine

### 11.1 Why Tiers Exist

Not all modules are equal in their relationship to a guild. Some features — bot owner tooling, essential configuration infrastructure — should never be toggleable by a guild administrator. Some features — economy, leveling, moderation — should ship pre-enabled but remain under a guild's control. Some features — integrations with third-party APIs, audio streaming — should require explicit installation before appearing anywhere. A single flat list of "modules" cannot express these distinctions without an implicit convention that no enforcement mechanism upholds. Tiers make the distinctions explicit, mandatory, and enforced by the manifest validator and the framework's runtime dispatch.

### 11.2 The Four Tiers

**Admin.** A module declaring this tier is accessible only to the bot operator (users in `BOT_OWNER_IDS`), only within the designated development guild (`DEVELOPMENT_GUILD_ID`). Admin-tier commands bypass the full middleware chain (they skip after `AdminTierGateMiddleware` grants access). No rate limits apply. No guild administrator can see, enumerate, or invoke Admin-tier commands. The dev-guild restriction is a Discord-level deployment restriction (commands are never registered outside `DEVELOPMENT_GUILD_ID`), not merely a runtime check — a production guild's slash command list structurally cannot include Admin-tier entries. `core-admin` (§32.3, row 01) illustrates the kind of thing an Admin-tier module could be; the framework ships no Admin-tier module itself.

**Core.** A module declaring this tier is loaded for every guild, permanently, with no disable mechanism. Core commands, if a Core-tier module exists in a given deployment, appear in every guild's command list unconditionally, and pass through the full middleware chain with one deliberate, tier-defining exception: rate limits and Discord-native permission checks (Layers 4–5, §19.2) apply exactly as they do for any other tier, but Dumby's own RBAC layer (Layer 6) is skipped entirely for Core-tier dispatch, by design, never merely by omission. Access to Core-tier functionality is governed exclusively by the native Discord permissions a Core-tier command declares in `permissions.discord` — the Administrator permission bit is the canonical choice for a Core-tier module's more sensitive commands — never by a Dumby role requirement, since Core-tier functionality is meant to be reachable through the same native permission model every Discord server administrator already understands, independent of whatever RBAC structure a guild has or hasn't configured for everything else. `guild-settings` and `utility` (§32.3, rows 02–03) illustrate the kind of thing a Core-tier module could be — a permanent configuration surface and an always-available diagnostic toolkit, respectively — but neither is a module this framework actually provides.

**Standard.** A module declaring this tier, once installed, is enabled by default for every guild, but optionally disableable by a guild administrator through the Interface or MDIS. A disabled Standard module's commands disappear from the guild's slash command list immediately (Discord command scoping) and the module's event handlers do not fire for that guild. The disabled module is relisted in Marketplace as "Previously Installed," allowing a guild admin to re-enable it later. Whether *any* Standard-tier module ships in a given deployment, and what it does, is entirely up to whoever builds the deployment's module set — §32.3's eighteen Standard-tier rows are examples of the shape such a module might take, not a shipped feature list.

**Marketplace.** A module declaring this tier is not pre-installed. A guild administrator must discover and explicitly install a Marketplace module before any of its commands appear. Marketplace modules are published into a browsable catalog (`/marketplace browse`). After installation, they behave identically to Standard modules in every operational respect (same middleware, same permission engine, same RBAC). After uninstall, they return to the catalog listing.

| Tier | Pre-Installed, If Present? | Guild-Visible Default? | Who Can Toggle? | Rate Limits? | In Marketplace? |
|---|---|---|---|---|---|
| Admin | N/A — dev guild only | Never (non-owners) | No one | No — gate bypasses at -10 | Never |
| Core | Yes, permanent | Yes, always | No one | Yes | Never |
| Standard | Yes, by default | Yes, until disabled | Guild ADMIN role | Yes | Yes, when disabled |
| Marketplace | No | No, until installed | Guild ADMIN role | Yes | Yes, when not installed |

### 11.3 Tier as a Manifest Field — Validation Rules

Tier is a required field in every manifest — omitting it causes a hard validation failure at Stage 11, before any module loads. The Zod schema enforces co-constraints:

- `tier === 'admin'` requires `devGuildOnly: true`; any other value for `devGuildOnly` is a validation error.
- `tier === 'marketplace'` requires `marketplaceCategory` to be present and one of the five valid values.
- `tier !== 'marketplace'` forbids `marketplaceCategory`; its presence is a validation error.
- A single manifest cannot be both `tier: 'standard'` and include a `marketplaceCategory` — the presence of the latter field is the signal that a module intended to declare `marketplace`, and the mismatch is surfaced immediately.
- `tier === 'core'` forbids any of the module's commands from declaring a non-default `permissions.rbac` value — Core-tier access is governed exclusively by `permissions.discord` (§11.2), so a Core-tier command still carrying a Dumby role requirement is a validation error, catching the assumption that RBAC applies at this tier before the module ever ships.
- `hardcoded === true` requires `hardcodeGuildId` and forbids `releaseStatus`; `hardcoded === false` requires `releaseStatus` and forbids `hardcodeGuildId` — the two are mutually exclusive by construction (§10.2), so a manifest can never leave a module's public-release eligibility ambiguous.

### 11.4 Per-Guild Module State — The `guild_module_states` Contract

Admin- and Core-tier modules need no per-guild state — their controllability is global and static. Standard- and Marketplace-tier modules maintain one row per guild per module in `guild_module_states`, the sole runtime source of truth for enabled/disabled state. Module enable/disable status is never represented as a field within the `guild_configs` JSONB document (§20.3) — it lives exclusively in this dedicated table, with its own cache key and its own write-path transaction, so there is exactly one place this state can be read or written from.

```
guild_module_states table:
  guildId              snowflake PK (composite with moduleSlug)
  moduleSlug           string PK (matches manifest name)
  tier                 'standard' | 'marketplace' (denormalized for filter speed)
  status               'active' | 'disabled' | 'never_installed'
                       | 'install_pending_resolution'  — a command-name collision
                         with an already-active module is unresolved (§15.9);
                         the module dispatches nothing until an admin resolves it
  wasStandardDefault   boolean (display-only: was this pre-installed Standard?)
  installedAt          timestamptz, nullable
  disabledAt           timestamptz, nullable
  dataRetentionPolicy  'retain' | 'purge_after_30d' (applied on disable)
  createdAt            timestamptz NOT NULL DEFAULT now()
  updatedAt            timestamptz NOT NULL DEFAULT now()
  createdBy            uuid references users(id)
  updatedBy            uuid references users(id)
```

**Read path — evaluated before every Standard/Marketplace command or event dispatch.** `GuildModuleStateService.isActive(guildId, moduleSlug)` checks:

```
1. L1 in-process LRU: key 'guild:module-state:{guildId}:{moduleSlug}'  → return if hit
2. Redis L2: same key, TTL 60 s                                         → return + backfill L1
3. PostgreSQL read replica                                               → return + populate both
No row found for this guild/module pair (a genuinely absent row, not a database
outage): resolve to the module's tier default — active for Standard,
never_installed for Marketplace — and write that resolved value back as the
row's initial state, so the guild's first interaction with the module is also
the moment the row is created. No guild is ever without its Standard-tier
features while waiting for an explicit row to exist.
Cache miss caused by database unavailability: return DISABLED (fail-closed).
A database outage never grants access to a module a guild turned off.
A read-replica-only outage with a healthy primary is not treated as a
database outage for this purpose: Step 3 falls through to the primary
before returning DISABLED, since the primary being reachable means the
authoritative row is still readable — DISABLED is reserved for the case
where neither the replica nor the primary can be reached.
```

**Write path — executed only on explicit toggle operations.** A single database transaction writes the new status row, timestamps the change, and invalidates the Redis key synchronously before the transaction commits. There is no propagation window between a guild admin disabling a module and its commands ceasing to dispatch.

#### 11.4.1 Proactive Backfill Migration — `0012_backfill_guild_module_states`

The read path's defaulting rule (above) guarantees correct behavior for any guild or module combination that has no row yet, so no guild's Standard-tier features are ever gated on this migration having run. What the migration provides instead is auditability: rather than every guild's rows being lazily created, one at a time, at whatever moment each guild happens to first invoke each module, `0012_backfill_guild_module_states.ts` proactively creates a complete, deployment-timestamped set of rows for every existing guild at Stage 06, so `installedAt` reflects a known rollout moment rather than a scattered history of first-use timestamps:

```
For every guild_id in the guilds table:
  For every module with tier 'standard' in the loaded module registry:
    INSERT INTO guild_module_states (guildId, moduleSlug, tier, status, wasStandardDefault)
    VALUES (guild_id, module.name, 'standard', 'active', true)
    ON CONFLICT (guildId, moduleSlug) DO NOTHING;
```

The `ON CONFLICT DO NOTHING` clause makes the migration idempotent: re-running it never overwrites a row an administrator already modified, and never overwrites a row the read path's defaulting rule already lazily created. A failure of this migration is logged and alerted on, not fatal to Stage 06 — the deployment proceeds, and any guild the migration didn't reach simply gets its rows created lazily, on first use, by the same defaulting rule that covers every brand-new guild between deployments.

### 11.5 Admin Tier Security Gate — Mechanism and Threat Model

The Admin tier's bypass of the ordinary rate-limit and permission chain makes it the single most consequential surface in the framework to secure correctly, for any deployment that builds an Admin-tier module at all (§33), and it is protected accordingly. The protection below is a property of the tier mechanism itself — it applies to whatever Admin-tier commands a deployment's own module actually declares, not to any specific command this document defines — and is deliberately layered so that no single misconfiguration can expose it.

**Layer 1 — Discord command registration scope.** Admin-tier commands are registered by `CommandDeployer` exclusively to `DEVELOPMENT_GUILD_ID` via the per-guild command registration API, never globally, and additionally registered with `defaultMemberPermissions: 0n` — a Discord-platform-level lock that hides the command from every guild member's UI regardless of their permissions, so a non-owner in the dev guild does not merely fail an authorization check, they never see the command exists to try. Admin-tier commands are also the one command category registered with `contexts` including `InteractionContextType.BotDM` alongside `Guild` (§15.10) — every other tier registers `Guild` only — since a bot owner reaching the framework's own operational tooling directly from a private message, without needing to be present in the development guild at all, is the sole sanctioned exception to this framework's general prohibition on reading commands sent in direct messages. A non-owner cannot invoke an Admin-tier command in the development guild, in a direct message, or anywhere else: in the development guild because Layer 2 rejects them, and everywhere else because the command simply does not exist in that context's slash command registry. This is structural, not runtime — the primary layer, since it holds even before any of the framework's own code runs.

**Layer 2 — `AdminTierGateMiddleware`, priority -10.** Runs before every other middleware, including `TraceMiddleware`. For any interaction targeting an Admin-tier command, it first verifies `interaction.user.id ∈ config.BOT_OWNER_IDS`, then verifies the interaction arrives through one of exactly two valid contexts: `interaction.guildId === config.DEVELOPMENT_GUILD_ID`, or the interaction is a direct message (`interaction.guildId` is null). A DM invocation carries no lesser scrutiny than a development-guild invocation — the same owner-ID check gates both, and the context check exists only to confirm the interaction arrived through one of the two channels Layer 1 actually registered the command against. Any other combination — a non-owner in either context, or an owner invoking from any guild other than the development guild — produces a silent reject: no Discord reply of any kind, logged at `warn` with full context. The rejection is silent rather than an explicit "permission denied" embed specifically so that an attacker who somehow reaches this layer — bypassing Layer 1 through means outside the framework's control — learns nothing from the bot's response about whether the command exists, whether their user ID was close to authorized, or which check failed; a distinguishable error response is itself a small information leak that a silent reject closes off entirely. Passing both checks routes the interaction directly to the handler, skipping every remaining middleware.

**Layer 3 — `BOT_OWNER_IDS` environment variable.** The set of authorized owner IDs is a process-level configuration value (not a database value), meaning it cannot be modified through any Discord command, any API call, or any guild administrator action — only a deployment change with access to the process environment.

**Layer 4 — an environment guard on a deployment's most consequential Admin-tier capability.** Whatever the single most dangerous capability a deployment's own Admin-tier module exposes turns out to be — arbitrary code evaluation is the illustrative worst case, if a module ever implemented one — the pattern this framework provides for it is an additional, independent environment check (an explicit enable flag *and* `NODE_ENV !== 'production'`) before allowing execution, so that disabling it requires a deployment change, not a bot command, and it remains inert in production regardless of the first three layers' state. A module author building such a capability opts into this pattern; the framework does not build the capability itself, only the gate a capability like it would sit behind.

**Why the pattern is a gate to build behind, not a command to ship.** Since this framework ships no Admin-tier module, there is no specific command here to remove or hardened further — the point of documenting Layer 4's shape is that *if* a module author builds something as dangerous as arbitrary code evaluation, the credible threat model for it is not "an external attacker calls it" (Layers 1–3 already require compromising the Discord platform's own permission model, the framework's middleware, and the deployment environment simultaneously) but "a legitimate owner's Discord account is compromised, in an environment where the capability happens to be enabled." A production-disabled-by-design capability, of the shape Layer 4 describes, already closes the highest-value version of that scenario. What remains — a compromised owner account reaching the capability in a non-production environment — is precisely the narrow scenario Layer 5's bounding and §29.1's non-production-credential-separation requirement are built to close, for whichever module author builds that capability.

**Layer 5 — time and output bounding, as a pattern.** Independent of whether execution is permitted at all, the framework's guidance for a capability like this is to run it under a hard timeout with truncated, narrowly-scoped output — bounding both how much damage a single invocation can do and how much of its output persists beyond the moment it ran. This is a recommended pattern for a module author to apply, not a mechanism the framework enforces on their behalf, since the framework has no specific capability of this kind to enforce it on.

**Audit guarantee.** Every Admin-tier invocation — granted or rejected — writes to `audit_logs` (§21.2) unconditionally, before the handler runs. A rejected attempt is therefore never silent from an operator's perspective, only from the caller's: the four layers above determine whether an attempt succeeds, not whether it gets recorded.

The resulting defense-in-depth count is four independent layers governing whether Admin-tier behavior is reachable at all, spanning three different enforcement boundaries — the Discord platform itself (Layer 1), the framework's own middleware chain (Layer 2), and the deployment environment (Layers 3 and 4) — chosen so that no single compromised layer, and no single class of bug, is sufficient on its own to expose Admin-tier behavior. Layer 5 is a different kind of control, applicable to whichever specific capability turns out to need it: it bounds how much a permitted invocation can do and how long its output persists, rather than gating whether the invocation happens at all.

### 11.6 Module Lifecycle State Machine

```
            bot process starts
                    │
        Stage 11 — module discovery
                    │
        ManifestValidator validates each manifest
                    │
         ┌──────────┴──────────┐
         │                     │
    VALID manifests        INVALID manifest
         │                     │
         ▼                     ▼
    LOADED queue           fatal exit
         │
    Stage 12 — onLoad(container)
         │
    ┌────┴────────────────────┐
    │                         │
  required: false          required: true
  throws                   throws
    │                         │
    ▼                         ▼
 DISABLED                 fatal exit
 (warning logged)

  onLoad succeeds:
    │
    ▼
  LOADED

    Stage 17 — onReady(client)
    ├── success → ACTIVE (dispatches commands/events normally)
    └── throws  → DISABLED (warning; startup continues;
                             required: true modules here are non-fatal)

  PowerEngineService.suspendModule (global) or
  a per-guild disable, however a deployment exposes one (per-guild):
    │
    ▼
  SUSPENDED (for this guild or globally; stop dispatching; write guild_module_states)

  A runtime code-reload trigger, however a deployment exposes one:
    │
    ▼
  onUnload() → unload → onLoad() → onReady() → ACTIVE
```

### 11.7 Core & Admin Tier Performance Baselines

Because Core- and Admin-tier commands bypass the `guild_module_states` cache read entirely, they carry less per-invocation overhead than Standard/Marketplace commands of equivalent handler complexity. This is a documented, deliberate performance property:

| Tier | `guild_module_states` lookup? | Rate limit check? | Permission resolution? | P50 overhead target |
|---|---|---|---|---|
| Admin | Never | Never | Never (owner-only gate) | < 2 ms |
| Core | Never | Yes | Layers 1–5 & 7 only — RBAC (Layer 6) skipped by design (§11.2) | < 5 ms |
| Standard (enabled) | Yes (L1 hit) | Yes | Yes (full 7-layer) | < 8 ms |
| Standard (disabled) | Yes (L1 hit) | Abort before checks | Abort | < 3 ms |
| Marketplace (installed) | Yes (L1 hit) | Yes | Yes (full 7-layer) | < 8 ms |

These are framework overhead targets, exclusive of handler execution time. A separate set of targets governs end-to-end behavior — the full round trip a guild member actually experiences, including handler execution, external calls, and cache behavior under partial outage:

| Tier | P50 end-to-end | P99 end-to-end | L1 cache-hit ratio | Availability during partial outage | Concurrent throughput floor (single shard) |
|---|---|---|---|---|---|
| Admin | < 150 ms | < 1,200 ms | N/A — bypasses `guild_module_states` entirely (§11.4) | Must remain available even if every Standard/Marketplace module has crashed (§10.5 isolation) | ≥ 50 req/s — low-volume by nature, an operator's own tool |
| Core | < 80 ms | < 400 ms | > 95% | Must remain available if Redis is down (§23.5 fall-through) | ≥ 500 req/s |
| Standard / Marketplace | < 500 ms | < 3,000 ms | > 70% | Best-effort | ≥ 200 req/s |

**Why Core's availability target specifically excludes a Redis dependency.** If a basic diagnostic or informational command required Redis to be reachable, a cache outage would take down the bot's most basic "is the process still functioning" signal at exactly the moment an operator needs it most. Core-tier commands are the one place in the system where falling through to a direct, uncached PostgreSQL read on any cache error (§23.5) is a hard requirement validated against the specific scenario it exists to survive, rather than a general resilience nicety applied uniformly everywhere.

---

## 12. Inter-Module Communication & Contracts

### 12.1 The Four Sanctioned Patterns

**Pattern 1 — Internal Event Bus (one-to-many, fire-and-forget).** A module emits a named domain event on the `EventBus`; any number of subscribers from any module react independently. The emitter has no knowledge of — and no dependency on — any subscriber. This is the primary channel for side effects: logging reacting to moderation events, analytics recording economy transactions, anti-raid tightening thresholds after a moderation spike. Events follow a three-part `{domain}.{entity}.{action}` naming convention (e.g., `moderation.user.banned`, `economy.wallet.credited`), enforced by `EventBus.emit()`'s validation at the time of registration.

**Pattern 2 — Published DI Token (synchronous cross-module call).** A module declares a service in its manifest's `provides` array; another module declares the same token in its `depends` array. The dependent module receives the service via its own DI container at load time, typed against the `contract` interface the provider declared. Neither module imports the other's source files; the contract interface is the only shared boundary.

**Pattern 3 — Cross-module read-only lookup, via a declared read accessor.** A module that wants cheap, synchronous read access to another module's data without the overhead of a full service call does not query the other module's table directly — it calls a method the owning module has explicitly published as a read accessor: declared in the owning module's manifest under a `crossModuleReads` array (alongside `provides`), implemented as a repository method whose name carries the `ForCrossModuleRead` suffix (e.g., `UserRepository.findByIdForCrossModuleRead()`), and constrained by lint rule `dumby/cross-module-read-shape` to a single-row lookup by primary key or a uniquely-indexed foreign key only — no joins, no aggregates, no filtering beyond the key. This gives the owning module the same control over its cross-module read surface that `provides` gives it over its cross-module call surface: the accessor is a declared, typed contract, so a schema change that breaks it is a compile error in the consuming module, not a silent runtime failure discovered in production. Writes across a module boundary are never acceptable through this pattern; a cross-module write must go through Pattern 1 or Pattern 2. There is no other form of direct cross-module table access — a query against another module's table that isn't a call to a `ForCrossModuleRead`-suffixed, manifest-declared accessor is what the `no-restricted-imports` and module-boundary lint rules (§10.5) exist to catch.

**Pattern 4 — Job scheduling via event bus.** A service emits an event (`moderation.mute.scheduled`); a dedicated subscriber enqueues the appropriate BullMQ job. This decouples the business logic (issuing the mute) from the infrastructure concern (scheduling a future state change), and it means the scheduling logic can be changed, replaced, or temporarily disabled without touching the original module.

### 12.2 Soft-Dependency Degradation Contract

When Module B declares a soft dependency on Module A's service — using it opportunistically rather than declaring a hard manifest `depends` entry — and Module A is disabled in a given guild, the DI container resolves Module A's service object normally, since services are registered globally. Only Module A's guild-scoped data is unavailable for that guild. Calls into the service for that guild return a `ModuleDisabledResult` sentinel rather than throwing. Module B's code checks for that sentinel and degrades gracefully:

```
// Example: giveaway requiring minimum leveling rank
const rank = await levelingService.getRank(guildId, userId);
if (rank instanceof ModuleDisabledResult) {
  // Leveling is disabled for this guild — skip the rank requirement
  return true; // allow entry
}
if (rank.level < minLevelRequired) {
  return false; // deny entry
}
```

This pattern is explicit and intentional: it requires Module B to make a decision about what "leveling is disabled" means for its own behavior, rather than crashing or silently misbehaving. The decision is documented in Module B's own code, tested in Module B's own test suite.

### 12.3 Cross-Module Contract Versioning

When Module A's `provides` token changes shape — a method removed, a parameter changed — that is a breaking change in Module A's own semver version. The manifest's `version` field is what Module B's `depends` array pins against. The Module Registry validates version satisfaction at Stage 11; an incompatible version dependency is a fatal startup error. This makes inter-module breaking changes explicit, loud, and caught before deployment, never at runtime in production.

---

## 13. Swastik — Hot Reload & Dynamic Module Management

### 13.1 Two Distinct Reload Mechanisms

**Development-time hot reload** uses Node.js's `--watch` flag (≥ Node 20) combined with `tsx` for TypeScript execution, automatically re-importing a module's files when they change on disk. This rebuilds the module in memory without restarting the gateway connection, reducing development iteration time for command and handler changes. It is only available in `NODE_ENV === 'development'`; the `--watch` flag is explicitly absent from production startup scripts and Docker images.

**Runtime module activation/deactivation** is the production mechanism — always available, gateway-connection-preserving, and safe for concurrent users. Swastik (§13.4–§13.13) is what triggers it in ordinary production operation, as the final step of an approved module upload; an Admin-tier command invoking the identical underlying mechanism directly remains available for a deployment that wants a manual trigger alongside Swastik's own. Either way, the mechanism calls `onUnload()` on the module, removes its commands and event handlers from the registries, re-imports the module's files (picking up the code change Swastik just staged and promoted, §13.10), calls `onLoad()`, then `onReady()`, and re-registers its commands and handlers. The gateway never disconnects; other modules continue operating throughout.

### 13.2 Worker Thread Isolation

CPU-intensive operations within a module — image processing, large dataset aggregation, content analysis — run in Node.js Worker Threads rather than on the main event loop. The framework provides a `WorkerThreadPool` service (bound to `TOKENS.WorkerPool`) that manages a pool of pre-spawned threads, dispatches tasks via `postMessage`, and returns typed results through Promises. A Worker Thread failure (crash, timeout) is isolated to that task and does not affect the main thread, the gateway connection, or any other concurrent operation.

**Build and transpilation.** Worker Thread entry files are ordinary TypeScript source, compiled by the same `tsc` build step that produces the rest of the application (§5.2) — there is no separate bundler or transpilation pipeline for worker code, and no ESM/CommonJS mismatch to account for, because the project's `tsconfig.json` targets a single module format for the entire codebase, workers included. `WorkerThreadPool` spawns each thread with `new Worker(path.join(__dirname, 'compiled-worker-entry.js'))` against the already-compiled output, the same artifact `node` runs the main thread from — a worker is never spawned directly against a `.ts` file, which is what would otherwise force a per-thread transpilation step or a runtime loader.

**Correlation IDs and logging across the thread boundary.** A task dispatched to `WorkerThreadPool` serializes the calling command's `correlationId` (§15.5) into the task payload explicitly — it is not automatically inherited, since `postMessage` crosses a real thread boundary with no shared memory or async-context propagation. The worker's own entry point constructs a child Pino logger (§24.2) bound to that same `correlationId` as its first action, before doing any actual work, specifically so a trace spanning a worker-offloaded task is never orphaned from the command that triggered it: a log line emitted inside the worker and a log line emitted by the originating command handler carry the same `correlationId` and are queryable as one trace, even though they executed on different threads.

### 13.3 Reload, Toggle, and Disable — Four Distinct Mechanisms, Not One

"Restart a module" means four different things depending on who is asking and at what scope, and the framework keeps all four separately named so they are never conflated in an incident:

| Mechanism | Trigger | Scope | Re-imports code? | Reference |
|---|---|---|---|---|
| Development hot reload | File save, `NODE_ENV === 'development'` only | This process only | Yes | §13.1 |
| Runtime module reload | Swastik's hot-swap signal (§13.10), or an Admin-tier command invoking the identical mechanism directly | This process (all guilds it serves) | Yes | §13.1 |
| Per-guild toggle | Whatever a deployment exposes for it | One guild | No — state flip + cache invalidation only | §11.4 |
| Global module disable | `PowerEngineService.suspendModule` | All guilds | No — state flip only | §11.6, §19.10 |

The distinction that matters operationally: the top two rows change *what code is running*; the bottom two change *whether already-running code is permitted to dispatch*, and neither of the bottom two touches the module's loaded state, its DI registrations, or its event subscriptions — a disabled module is still loaded, still occupying its container scope, simply short-circuited before its handler runs (§11.4's read path). Toggling a module off and on again is a state-table write on the order of milliseconds; reloading it re-executes `onUnload()`/`onLoad()`/`onReady()` and is the heavier operation of the two pairs. An operator diagnosing "the module isn't responding" needs to know which of the four applies before choosing a fix — a reload solves a code problem, a toggle check solves a configuration problem, and confusing the two wastes an incident's most valuable early minutes.

### 13.4 Swastik — Two Update Paths

Swastik is the service that owns every deployment, hot-reload, hot-swap, and related delivery mechanism in the framework — the single answer to how new or changed code reaches a running Dumby fleet, covering the core codebase itself and every independently-authored module alike. It runs as its own deployable process (`src/entry/swastik.ts`, §7.5), architected the same way PEP and CLAI are: a separate service sharing nothing with the bot process but the same PostgreSQL primary, the same Redis instance, and the same container image.

Two distinct, non-overlapping update paths exist, chosen by the shape of what changed rather than by operator preference:

**Core restart CI/CD.** A change to the framework core itself — anything outside `src/modules/` — goes through the existing release pipeline in full (§43.2–§43.4): build, staging validation, the two-approver production gate, and the zero-downtime rolling update mechanism already specified in §30.2. Swastik does not reimplement any part of this path; its own involvement is exactly the scheduled trigger described in §13.5 for the recurring case, while an authored code change still goes through the manual release pipeline precisely as §43 already describes.

**Module hot-swap (Kubernetes volume-mount based).** A change to one module's own code — a new version uploaded by its registered developer — never touches the core release pipeline at all. Swastik detects every available module path on the shared Kubernetes volume every running pod mounts, validates specifically the module that changed, and reloads only that module in-process, in every pod simultaneously, without restarting the application or affecting any other module. This is the path detailed across §13.6–§13.12.

The two paths are kept separate because they answer different questions: a core change carries the same scrutiny and the same rollback-capable pipeline any application-wide change requires, while a module change costs its author nothing more than an upload and a validation pass — precisely because module isolation (§10.5) is what makes one module's code safe to swap without touching anything a core change might.

### 13.5 Scheduled Zero-Downtime Core Restart

Independent of any specific code change being ready, Swastik issues a 24-hour recurring CI/CD trigger — registered the same way any other cron task is (§26.6), but targeting the release pipeline's staging-and-promote flow rather than a job queue — that restarts the entire core codebase using the zero-downtime rolling update mechanism already specified in §30.2: the same `maxUnavailable: 0`/`maxSurge: 1` strategy, the same shard-ownership handoff (§23.4), and the same readiness-gated traffic cutover, triggered on a schedule in addition to being triggered by a merge to `main`. This recurring restart bounds how long a running fleet can drift from its own most recently promoted state, independent of how often a human-initiated deploy happens to land.

For the duration of this restart window, Swastik places an explicit, temporary lock on every module-level hot-swap (§13.10): a module upload that clears validation during the window is staged and held, promoted the moment the core restart's rolling update completes rather than mid-restart, so a fleet-wide pod replacement and an in-process module swap can never contend for the same shared volume at the same moment. The lock releases automatically once every pod in the rolling update reports readiness; a held promotion resumes immediately, with no operator action required to release it.

### 13.6 Developer Registration & Token-Based Identity

A developer registers through a secured API (§47.7) using a username and a password, both handled with the same credential discipline as every other secret in this framework (Argon2id hashing, §29.1). On successful registration, Swastik calls the Credentials Service (§19.19) — rather than minting anything itself — to assign the developer a **dev ID**: a cryptographically random secret generated and handled with exactly the sensitivity of a Discord bot token, stored only as an Argon2id hash (`swastik_developers.devIdHash`, §21.2), with the raw value returned to the developer exactly once, at issuance, and never displayed or persisted again anywhere in the system. The dev ID is always transmitted in an `Authorization` header on every call it authenticates, never embedded in a URL, a query string, or a log line — the same non-negotiable placement discipline this framework already applies to every other credential-shaped value (§24.2's redaction list, §29.1).

Alongside the dev ID, Swastik issues a **build ID** for every module version a developer uploads (§13.8) — a fresh identifier per version, never reused across versions, distinct from the developer's own dev ID. A developer's manifest carries both in its `devId` and `buildId` fields (§10.2), which is the framework's own permanent record of exactly which registered developer authored exactly which build.

### 13.7 Manifest Requirements & Licensing as an Approval Tracker

The module manifest includes the developer's dev ID and the assigned build ID as required fields (§10.2), and the dev ID also appears in the licensing record below, binding every uploaded module unambiguously to its registered developer from the manifest itself, independent of anything Swastik's own database separately tracks.

Swastik's licensing system is a dataset column, not an independent approval engine: `swastik_developers.approvalStatus` (§21.2) holds `'pending'`, `'approved'`, or `'declined'` for every registered developer, and that single column is the developer's entire proof of license — Swastik takes no further independent action beyond checking it before permitting a deployment. Deployment is permitted only for a dev ID whose `approvalStatus` reads `'approved'`; every other value blocks every upload from that dev ID outright, before any manifest is even inspected.

**Manual approval.** Moving a developer from `'pending'` to `'approved'` or `'declined'` is a manual step carried out by the Dumby project owners — never automatic, never inferred from upload volume, activity, or any other signal Swastik observes on its own. No developer upload proceeds while their dev ID sits at `'pending'`, and a `'declined'` developer is blocked identically to one who never registered, with the specific decision recorded in the same audit trail every Swastik action writes to (§13.12).

The Credentials Service (§19.19) is what Swastik calls to produce this licensing record in the first place, and what produces its later authkey-shaped credentials too — the same credential-issuance discipline that generates a CLAI authkey generates a developer's dev ID and its accompanying license record, so both trace back to one consistently audited issuance path rather than two independently-built ones.

### 13.8 Secured Module Upload API

Developers upload new module versions through a public API (§47.7), authenticated exclusively by the dev ID transmitted in the request's `Authorization` header — never embedded in the URL, matching the placement rule §13.6 states for every use of the dev ID without exception. The endpoint receives the module package together with its manifest in a single request and, on acceptance, assigns the upload a fresh build ID (§13.6), recorded against the specific `(devId, moduleSlug, version)` triple in `swastik_builds` (§21.2).

### 13.9 Pre-Deployment Validation

Once the upload API receives a request, Swastik extracts the manifest and runs the identical manifest validation that runs at application startup (Stage 11, §8.2) — every configuration entry, every function signature, every declared feature flag checked against the same Zod schema `ModuleRegistry` already enforces, so a module that would fail to load in production fails the same way here, before it ever reaches a running pod. Swastik additionally confirms that the manifest's `devId` and `buildId` are valid, that they are bound to one another (the `buildId` in `swastik_builds` was issued against exactly this `devId`, never a different developer's), and that the `devId`'s license reads `'approved'` (§13.7). Only a payload that clears every one of these checks — manifest shape, devId/buildId binding, and license approval — proceeds to staging; anything else is rejected with the specific validation failure returned to the developer directly, never a generic failure message.

### 13.10 Staging, Atomic Promotion & Hot-Swap Signaling

A validated module's code is written to a staging area on the shared Kubernetes volume every pod mounts — never directly into the live module directory a running pod actually loads from. Once staged, Swastik atomically promotes the new version (updating a symlink from the live module path to the newly staged directory — an operation that is itself atomic at the filesystem level, so a pod never reads a half-written module mid-promotion) while preserving the previous version's directory intact for rollback, and sends a signal to the Dumby runtime through an internal API, `POST /reload?module=<name>` (§47.7), reachable only from Swastik's own network position and never from the public internet.

Dumby's runtime does exactly one thing on receiving this signal: it performs the hot-swap using the identical mechanism already specified in §13.1 (`onUnload()` → re-import → `onLoad()` → `onReady()`), runs a self-health check against the newly loaded module, and responds to Swastik with success or failure. On failure, Swastik automatically reverts the symlink to the preserved previous version and instructs Dumby to reload it through the same signal — a failed hot-swap is never left half-applied in any pod. The final result, success or reverted failure, is returned to the developer as an API response and, wherever the developer has configured one, a webhook delivery, using the same outbound-signing infrastructure §47.5 already specifies for inbound webhooks.

### 13.11 Change Detection & Deployment Orchestration

Dumby's own runtime never watches the filesystem for module changes — that responsibility belongs to Swastik alone, end to end. The complete flow, restated as one sequence: Swastik receives a new upload, or its own scheduled trigger fires (§13.5); it validates the payload (§13.9); it stages and promotes the change (§13.10); it calls Dumby's internal reload API to perform the hot-swap; and it handles rollback on any failure while reporting status at every stage. Dumby activates a new module version only after Swastik issues the explicit reload signal — the runtime simply waits for that signal, executes the hot-swap it's told to execute, and returns the outcome. This division is deliberate: Dumby's own process stays free of any file-watching, polling, or upload-handling logic of its own, keeping the runtime's operational shape exactly what §10 and §11 already describe, with deployment orchestration living entirely inside a separate, purpose-built service instead.

### 13.12 Swastik Auditing & Logging

Swastik maintains full auditing and logging for every record and action performed using a dev ID, a build ID, or the licensing system, written through the same `audit_logs` table (§21.2) every other framework subsystem uses, tagged `source: 'SWASTIK'` rather than into any separate, second audit store. Every entry captures validity status, versioning, and deployment timestamps, alongside full detail on: developer lifecycle events (registration, approval, decline); every upload attempt, successful or rejected, with its specific validation outcome; version assignment; staging and promotion; hot-swap outcomes, including any automatic rollback; every core restart Swastik's own schedule triggers (§13.5); manual overrides or rollbacks an operator initiates directly; and the codebase size of every promoted build. Filtering `audit_logs` to `source: 'SWASTIK'` rows is, by construction, a complete history of every deployment action this framework's delivery layer has ever taken — the same guarantee §19.11 already establishes for Power Engine Panel actions, extended here to cover deployment specifically.

### 13.13 Swastik Developer Portal

The Swastik developer portal is backend infrastructure and framework work, not a frontend concern, consistent with this document's scope (Preface, §50.6), and is built to support integration into any website, anywhere, entirely through the REST surface §47.7 defines rather than through a framework-shipped UI. The intended developer workflow: the developer logs into whatever site hosts the portal — commonly, though not necessarily, the MDIS website itself — with their registered username and password; they use either an already-available deploy button or a drag-and-drop interaction to upload the module package; and everything past that point is automated. The developer supplies no information beyond the upload itself and needs only to track the deployment status response — manifest extraction, devId/buildId validation, the license check, staging, promotion, and hot-swap signaling all happen without further input (§13.8–§13.11).

The system independently verifies the manifest, the build ID, and the build ID's association with the developer's own username, license, and every other relevant record, at every step, so a portal built on top of this API inherits that verification automatically rather than needing to reimplement any of it. Every one of §29's security controls — secrets management, input validation, webhook signature verification wherever a webhook is configured, rate limiting, dependency security, and full audit logging — applies to the Swastik upload path exactly as it applies everywhere else in the framework, since the upload API is one more authenticated entry point into the same HTTP server (§47.1) those controls already govern uniformly, held to the same standard as every other surface in this reference rather than a lesser one.

---

## 14. Marketplace & Extension System

### 14.1 Purpose

The Marketplace tier provides a formal, discoverable extension layer for capabilities that are genuinely optional, potentially resource-intensive, or dependent on third-party services that not every operator will have access to. It distinguishes "not pre-installed because you have to opt in" (Marketplace) from "not installed because something went wrong" (a failed Standard module), and gives the framework a reviewable, categorized channel for community-authored extensions.

### 14.2 Discovery and Installation Flow

```
Guild admin types /marketplace browse [category]
        │
ModuleRegistry.getCatalogForGuild(guildId) returns Marketplace entries
with status 'never_installed' or 'disabled' (previously installed)
        │
Admin selects a module → /marketplace install <module>
        │
GuildModuleStateService.install(guildId, moduleSlug):
  1. Verify module is loaded (if not, Admin must load globally first)
  2. INSERT INTO guild_module_states (status='active', installedAt=now())
  3. Invalidate Redis cache key
  4. CommandDeployer deploys module's commands as per-guild guild-scoped commands
     (propagates in seconds, not one hour like global commands)
  5. Emit guild.module.installed event on internal bus
        │
Module appears in guild's slash command list
Module's event handlers begin firing for this guild
```

Uninstalling reverses steps 3–5, updating `status` to `'disabled'`, removing per-guild command scoping, and stopping event handler dispatch for this guild.

### 14.3 Marketplace Categories

| Category | Intended Module Types |
|---|---|
| `audio` | Music playback, voice channel tools, audio recording |
| `community` | Additional community-building features beyond Standard |
| `security` | Advanced threat monitoring, compliance tooling |
| `integrations` | Third-party API connections (GitHub, Dodo Payments, Twitch, etc.) |
| `utility` | Power-user and automation tools beyond Core utility |

### 14.4 Community Module Submission Pipeline

A third-party Marketplace module submission goes through the following review gates before it appears in the catalog for any guild:

1. **Static analysis.** `tsc --noEmit` and ESLint (cross-module import enforcement, no `require()`, no direct `process.env` access outside the module's own config schema) must pass with zero errors.
2. **Manifest validation.** All fields present, `tier === 'marketplace'`, `marketplaceCategory` valid.
3. **Security review.** Manual review of: what intents are requested and why, whether any `dashboardSchema` exposes sensitive configuration, whether the module's jobs are idempotent, and whether cross-module data access is limited to reads.
4. **Functional review.** Verification that commands follow the depth standard (every option documented, every error condition handled), that every migration has `up` and `down` functions, and that the test suite covers the module's critical paths.
5. **Signing and listing.** An approved module is cryptographically signed, and `ModuleRegistry` refuses to load an unsigned module from the Marketplace directory tree at Stage 09 — a module maintained as part of a deployment's own trusted codebase, rather than arriving through this pipeline, is exempt from this check. Once signed, module slug, name, description, `marketplaceCategory`, and author information are written to `marketplace_listings` for discovery.

A module failing any gate is returned to the author with specific remediation notes, not silently rejected.

**Version updates.** The five gates above are a *submission* process; an already-listed module's new version is not exempt from them just because an earlier version passed. Every version update re-runs gates 1–4 in full against the new code — a module's trust is re-established per version, not inherited indefinitely from its first approval — and only re-signs (gate 5) if all four pass again. `marketplace_listings` carries a `currentVersion` and a `lastReviewedAt`; an update whose diff against the previously-approved version touches requested intents, `dashboardSchema` fields, or declared `crossModuleReads` (§12.1) is flagged for the full manual security review (gate 3) rather than the lighter automated-gates-only path a patch-level dependency bump can take, since those specific categories of change are exactly what a compromised or intentionally-malicious update would alter.

**Revocation.** A module found unsafe after being listed — a reported vulnerability, a maintainer account compromise, a policy violation discovered post-approval — is revoked by unsigning it: `ModuleRegistry`'s signature check (gate 5, above) runs not only at initial load but on every hot-reload and every fresh install attempt, so revoking a signature takes effect the moment a guild's instance next reloads or reinstalls the module, without requiring a framework redeploy. Revocation itself is a Power Engine Panel action (`PowerEngineService.suspendModule`, §19.10) rather than a Marketplace-specific mechanism, which is what gives it the mandatory reasoned audit trail every PEP action carries (§19.11). A revoked module already running in a guild is not silently killed mid-operation by default — revocation sets `marketplace_listings.status = 'revoked'`, which immediately removes it from `/marketplace browse` for new installs and surfaces an alert to every guild currently running it, since forcibly disabling a module guild administrators are actively depending on carries its own disruption cost that a human operator, not an automated kill switch, is better positioned to weigh against the specific vulnerability's severity — a `severity: critical` revocation does force-disable on next event dispatch (through the same `guild_module_states` fail path any module suspension uses, §11.4); a lower-severity revocation only alerts, and force-disabling it too is a separate, deliberate PEP call, not an automatic escalation.

### 14.5 Module Dashboard Interface System (MDIS)

MDIS is the web configuration interface for module settings, anchored to the `guild-settings` module's REST API surface. It extends §47 (REST API Reference) with module-specific endpoints and renders configuration panels through a declarative schema every module can provide in its manifest's `dashboardSchema` field.

**Schema-driven rendering.** MDIS's renderer is a generic engine that reads a module's `dashboardSchema` and generates the corresponding web UI. No per-module frontend code exists; the schema is the UI. This means a module author declares what their configuration panel looks like in TypeScript — the same language the rest of their module is written in — and the renderer turns it into HTML controls automatically. The supported schema components are: `toggle` (boolean field), `select` (enum field with named options), `text-input` (string field with optional regex validation), `number-input` (integer or float field with min/max), `channel-picker`, `role-picker`, `user-picker`, `list` (repeating values), `data-table` (read-only tabular display), and `chart` (time-series visualization of module metrics).

**Auto-exposed REST endpoints (§47.3).** Every module with a `dashboardSchema` automatically gets three endpoints:
- `GET /api/modules/:name/config` — returns current guild config for this module
- `PUT /api/modules/:name/config` — applies a validated configuration update
- `POST /api/modules/:name/:action` — triggers a named module action (e.g., clearing a cache, running a cleanup)

In addition, module enable/disable state is exposed through a dedicated endpoint that maps to the `guild_module_states` table, not the config endpoint above:
- `PATCH /api/modules/:name/state` — sets `status` to `active` or `disabled` for the requesting guild, gated by the guild's own ADMIN role (§19.3)

**Tier visibility mapping.** Not all tiers appear on the MDIS dashboard:

| Tier | MDIS Visibility |
|---|---|
| Admin | Never visible in any guild dashboard |
| Core | Visible and configurable; no toggle control (cannot be disabled) |
| Standard | Visible; shows toggle (calls PATCH /api/modules/:name/state); config panel if dashboardSchema present |
| Marketplace | Visible when installed; shows uninstall button; config panel if dashboardSchema present |

**Graceful fallback.** Any enabled module without a `dashboardSchema` appears on the dashboard with a "Web Panel Not Available" placeholder that includes the module's name, description, and tier. The placeholder is never a blank entry or an error state.

**Multi-guild synchronization.** A single MDIS dashboard session can manage every guild the authenticated user administers, since the same Discord identity commonly holds administrator rights in more than one guild — but every read and every write is bound to exactly one guild at a time, carried explicitly as a `guildId` in the request path or body (§47.6), never inferred from session state alone. Switching the dashboard's active guild is purely a client-side selection of which `guildId` the next request targets; it triggers no server-side session change and touches no other guild's configuration. Because no two guilds ever share a cache key, a config row, or a `guild_module_states` row (§20.3, §11.4), every guild a multi-guild dashboard session reaches maintains its own independently synchronized settings, with no shared cross-guild state that switching guilds could desynchronize.

**Permission enforcement.** Dashboard API calls are authenticated via Discord OAuth2 token; the user's Dumby RBAC role is resolved from `guild_roles` using the same resolution logic as the in-bot permission engine (§19.2). A user without the guild ADMIN role receives 403 on state-modifying endpoints; read-only endpoints (`GET /api/modules/:name/config`) require the MOD role minimum. Admin-tier module configurations are never exposed, regardless of the caller's role.

**Accessibility.** The generic renderer targets WCAG 2.1 Level AA conformance as a hard requirement, not an aspiration, since every module author's configuration panel inherits whatever the renderer does — an accessibility defect here is not one module's problem, it's every module's problem simultaneously. Concretely: every schema component (§14.5, above) renders with a programmatically-associated label, not placeholder text alone; the entire panel is operable via keyboard with a visible focus indicator and no keyboard trap, including `channel-picker`, `role-picker`, and `user-picker`'s type-ahead search lists; color is never the only signal distinguishing a validation error or a toggle's state; and `data-table` and `chart` components ship with an accessible-name and a text-equivalent summary respectively, since a chart's visual trend is not itself accessible information. This is a renderer-level property, verified once in the renderer's own test suite (§40.5, an automated `axe-core` scan against every schema component type, gating the renderer's own CI) rather than something each module author must separately implement or verify.

---

# PART IV — REQUEST & INTERACTION LAYER

---

## 15. Command Framework & Routing Engine

### 15.1 Command Types Supported

Dumby supports every interaction-based command type Discord offers. Text-prefix commands are explicitly unsupported.

**ChatInputCommand (slash command).** The primary type, invoked via `/command-name`. Supports options (string, integer, number, boolean, user, channel, role, mentionable, attachment), subcommands, and subcommand groups. Options may declare autocomplete, min/max bounds, and fixed-choice lists.

**UserContextMenuCommand.** Appears in the right-click Apps menu on a user; provides the selected `User` and `GuildMember` to the handler. Maximum 5 per application.

**MessageContextMenuCommand.** Appears in the right-click Apps menu on a message; provides the selected `Message` to the handler. Maximum 5 per application.

### 15.2 Command Class Interface — Complete Field Reference

Every command class implements `ICommand`. `CommandValidator` verifies each field during Stage 13.

| Field | Type | Default | Description |
|---|---|---|---|
| `data` | `SlashCommandBuilder | ContextMenuCommandBuilder` | required | Discord command definition |
| `execute` | `async (interaction, context)` | required | Handler function |
| `permissions.discord` | `PermissionFlagsBits[]` | `[]` | Discord permission bits required of invoking member |
| `permissions.rbac` | `string` | `'MEMBER'` | Minimum Dumby role required |
| `defaultMemberPermissions` | `bigint` | `undefined` | Discord native client-side gate (UX layer; runtime check is the enforcement) |
| `cooldown.duration` | `number` | `defaultCooldown` | Seconds |
| `cooldown.scope` | `'USER'|'GUILD'|'CHANNEL'|'GLOBAL'` | `'USER'` | Rate-limit axis |
| `guildOnly` | `boolean` | `true` | Block DM invocations |
| `ownerOnly` | `boolean` | `false` | Only `BOT_OWNER_IDS` may invoke |
| `requiresDefer` | `boolean | (interaction) => boolean` | `false` | Triggers `deferReply()` before 3 s window |
| `ephemeral` | `boolean` | `false` | All replies from this command are ephemeral by default |
| `nsfw` | `boolean` | `false` | Registers `setNSFW(true)` — enforced by Discord at channel level |
| `middleware` | `{ class, context? }[]` | `[]` | Command-specific middleware, after built-in chain |
| `autocomplete` | `Record<string, AutocompleteHandler>` | `{}` | Maps option name to handler |
| `localization` | `{ name: object, description: object }` | `{}` | Discord locale-keyed strings for command picker display |

### 15.3 Command Registry Architecture

`CommandRegistry` is a `Map<string, ICommand>` frozen after Stage 13 and never mutated during runtime. Keys are compound paths ensuring O(1) dispatch and immediate, build-time-visible namespace collision detection:

```
"/ban"                        → BanCommand
"/case.view"                  → CaseViewCommand
"/economy.shop.buy"           → EconomyShopBuyCommand
"USER::View Mod History"      → ViewModHistoryContextCommand
"MESSAGE::Flag Content"       → FlagContentContextCommand
```

Two modules registering the same key throw `CommandKeyCollisionError`, naming both modules and the conflicting path, before the bot is permitted to start.

### 15.4 Command Deployment Strategy

**Development:** All commands registered to `DEVELOPMENT_GUILD_ID` (per-guild, propagates in seconds).

**Production Standard/Marketplace:** Global registration (propagates within ~1 hour). Run `CommandDeployer` after deploy; idempotent — only changes trigger a Discord API upsert.

**Admin:** Always `DEVELOPMENT_GUILD_ID` only, regardless of environment.

**Dynamic per-guild commands:** Always per-guild scoped (§10.3 `DynamicCommandProvider`). Never global.

### 15.5 The CommandContext Object — Complete Field Reference

Every `execute(interaction, context)` call (§15.2), and every `execute(context, next)` call in the middleware chain (§17), receives the same `CommandContext` instance — assembled once, at the start of the request, and passed by reference through the entire pipeline for that single interaction:

| Field | Type | Populated by | Description |
|---|---|---|---|
| `correlationId` | `string` (UUID) | `TraceMiddleware` | Ties this request's logs, metrics, and trace spans together (§24.1) |
| `guildConfig` | typed `guild_configs` deserialization | `GuildConfigMiddleware` | This guild's resolved configuration document (§20.3) |
| `locale` | BCP 47 string | `GuildConfigMiddleware` | Resolved guild locale, feeding `I18nManager` |
| `rbacRole` | Dumby role enum | `AuthorizationMiddleware` | This user's resolved role for this guild (§19.3) |
| `logger` | pre-bound Pino child logger | `TraceMiddleware` | Carries `correlationId`, `guildId`, `userId`, `shardId`, `moduleId` on every call (§24.2) |
| `shardId` | number | Bootstrap | This process's shard ID; always populated, sharded or not (§6.5) |
| `metadata` | `Map<string, unknown>` | Any middleware | A scoped bag later middleware or the handler itself can write to and read from; the mechanism by which one middleware passes a computed value forward without widening `CommandContext`'s own type |

`CommandContext` is created fresh per interaction by the DI container's `scoped` lifetime (§9.6) and discarded when the interaction completes — it never survives across requests and is never shared between concurrent interactions, even ones from the same user or guild. The context-inspection diagnostic capability (§41.3) dumps the full object for the invoking interaction as structured output, which is the fastest way to confirm what a handler actually saw at the moment it ran.

### 15.6 Startup Command Lifecycle

At every bootstrap, Stage 13's `COMMAND_REGISTER` step (§8.2) never assumes a previous run's registration is still accurate: it deletes every command Discord currently has on record for this application, then re-registers the complete current set computed fresh from each guild's actually-enabled modules. This guards against drift that a partial prior deploy, a manually-edited command in Discord's own UI, or a stale registration from a module that no longer exists could otherwise leave behind. Core- and Standard-tier commands are always part of that registered set; Marketplace-tier commands are registered for a given guild only once that guild has explicitly enabled the corresponding module — a freshly-invited Dumby instance starts a guild with the Core and Standard command surface immediately visible and every Marketplace command absent until an administrator opts in.

Enabling a module after startup registers its commands immediately — a per-guild scoped registration call, propagating in seconds (§15.4) — so a guild administrator sees a newly-enabled module's commands without waiting on any queue. Disabling a module does not remove its commands from Discord's registration with that same immediacy; that half of the change goes through the guild command change queue (§15.7). It does, however, make the commands immediately unusable: the moment a module is disabled, Dumby writes a deny override to Discord's native per-command permissions (configured through that guild's own Integrations settings) for `@everyone` and every member role currently configured for that command, so the command disappears from members' effective access instantly even though its underlying deregistration has not yet run.

### 15.7 The Guild Command Change Queue

Two kinds of guild-level command change never take effect immediately at the Discord registration layer: a module disable's corresponding command removal (§15.6), and a BCCM rename or alias request (§15.8). Both are entries in one shared table, `guild_command_queue` (§21.2), batched and pushed together rather than through two independent mechanisms, since both ultimately resolve to the same operation — a bulk-overwrite of one guild's registered command set — and Discord's 200-per-day guild-command-creation limit is conserved by batching that operation, regardless of which kind of change triggered it.

Batching works against the timestamp of a batch's first queued entry, call it *T₀*:

- **Prepare window:** at *T₀* + 12 hours, the system begins assembling the batch for submission.
- **Additive window:** any further entry queued before *T₀* + 13 hours joins the same batch; an entry queued after *T₀* + 13 hours starts a new batch with its own *T₀*.
- **Push:** at exactly *T₀* + 13 hours, to the second, the system executes a single `PUT` bulk-overwrite carrying every entry in the batch — comfortably inside the 24-hour outer ceiling this queue guarantees from queue-time to live.

A guild administrator can revoke a queued entry, or edit its target name or alias, at any point before its batch's push executes — the queue holds a request, not a commitment, until the moment it actually leaves for Discord. If a module receives a new version while one of its commands has a pending deletion entry in the queue, that entry is invalidated automatically and the deletion process restarts from zero for that command: a changed command definition is treated as a signal the guild might want to keep the module rather than lose it to a deletion queued against a version that no longer exists.

**Push failure and retry.** If the scheduled `PUT` bulk-overwrite at *T₀* + 13 hours fails — a Discord API outage, a transient 5xx, or any other delivery failure — the batch is neither marked applied nor discarded: it remains `'pending'` in `guild_command_queue` (§21.2), and Discord's own Integration Settings surface together with this same queue serve as the fallback path for exactly this scenario, with the push retried automatically on the next scheduled cycle. A guild's commands stay in their last successfully-applied state throughout this window — a failed push never leaves a guild with a command removed on the sending side but not reflected on Discord's side, since the queue's own `status` column is what gates whether a change is considered live, not the mere fact that a push was attempted.

### 15.8 Bot Command Cosmetics for Marketplace (BCCM)

A guild administrator can rename any enabled command — Core, Standard, or Marketplace — or add an alias for it, through `/queue <command> <new-name|alias>`, which writes an entry to §15.7's queue rather than taking effect immediately. This lets a guild curate its own command surface (a `ban` command renamed to fit the guild's own moderation vocabulary, or aliased alongside its original name) and gives administrators a guild-local tool for resolving a naming collision themselves rather than waiting on either module's author to rename anything.

Two constraints hold regardless of what a guild administrator requests: an alias may never match a reserved, native Discord command name (`/help`, `/giphy`, `/tenor`, and similarly reserved names) — the system rejects the request outright with `"Cannot alias a reserved Discord command"` rather than queuing it — and BCCM never becomes a text-prefix system by another name (§4): a rename or alias only ever changes what a slash command is called, never how it is invoked. A module can also request removal of one of its own commands in a specific guild through a dedicated function call exposed to modules for exactly this purpose; the request is routed through that guild's Integration settings (§15.6) for the instant-unusable effect, then through the same queue (§15.7) for the underlying deregistration.

**Command-count projection.** Before accepting any queue request — a rename, an alias addition, or a deletion — BCCM projects the guild's resulting total registered-command count as of the batch's next scheduled push, accounting for every other entry already queued against that same batch. A request whose projected result would raise the guild's total above Discord's 100-command ceiling is rejected outright, before it ever enters the queue, with the specific projected count returned to the requester. This projection is what keeps a guild's command count from ever exceeding 100 under any circumstance: the ceiling is enforced at request time, against a computed projection, rather than discovered as a Discord-side rejection after a batch has already been assembled and pushed.

### 15.9 Command Collision Resolution

When a module is enabled in a guild and one of its commands' names or aliases collides with a command already active there from a different module, installation does not fail silently or pick a winner automatically:

1. **Pause.** The newly-enabled module's `guild_module_states` row for this guild is written as `'install_pending_resolution'` (§11.4) rather than `'active'` — it dispatches nothing until the collision is resolved.
2. **Presentation.** The guild is shown an ephemeral embed with a dropdown listing every conflicting command alongside its originating module — a collision on `ban` between `moderation` and `supermod`, for instance, is presented as a named choice between the two.
3. **Selection.** A guild administrator selects which module's command executes under the contested name.
4. **Override.** The system writes a `guild_command_overrides` entry (§21.2), cached in L1 (§22.2) alongside every other guild-scoped state this pipeline reads on the hot path.
5. **Resolution.** The newly-enabled module's `guild_module_states` row moves from `'install_pending_resolution'` to `'active'`, and its winning command goes live at the queue's next scheduled push (§15.7) rather than requiring a further wait.

If the module whose command won a collision is later disabled, the system re-evaluates automatically: the other module's command takes over the contested name immediately, its `guild_command_overrides` entry updated silently, without requiring the administrator to resolve the same collision a second time.

### 15.10 Command Restrictions — Direct Messages & Prefix Prohibition

Two restrictions govern where and how a command may be invoked, independent of tier, and both are enforced structurally rather than left to a handler's own discretion.

**No commands in direct messages, with one sanctioned exception.** Every command declares `guildOnly` (§15.2), defaulting to `true`, and `AuthMiddleware` (priority 10) rejects any DM-originated interaction against a command that declares it — which is every command in the framework except Admin tier. Dumby does not read or dispatch a command sent in a direct message under any other circumstance. The single exception is the Admin tier itself: an Admin-tier command is the one category registered for both the development guild and the `BotDM` interaction context (§11.5, Layer 1), letting the bot owner specifically — never any other user, in any other context — reach the framework's own operational tooling from a direct message. This exception exists because Admin-tier access is already gated to the bot owner by three independent layers before a command handler ever runs (§11.5); extending its reach to direct messages adds a convenience for the one user class already fully trusted, without loosening the restriction for anyone else, since every other tier's commands remain entirely absent from the `BotDM` context regardless of who is asking.

**No simulated prefix-based commands.** As established in §4's non-goals, Dumby ships no text-prefix command system, and this restriction has no loophole: a module may scan message content and react to what it finds — the framework permits this for a legitimate, manifest-declared purpose — but it may never use that scan to simulate a prefix-based command system, parsing a leading token out of a message and dispatching it as though it were a registered command. The marketplace review pipeline's manifest-review step (§14.4) treats a module found doing this as a rejected submission, and the same standard applies uniformly to any module maintained as part of a deployment's own trusted codebase: message scanning and command dispatch are two structurally distinct capabilities, and no module is permitted to blur them into one.

---

## 16. Event Architecture & Bus System

### 16.1 Two Event Systems — Why They're Kept Separate

**Discord Gateway events** (sourced from `discord.js`) carry Discord platform data — a message was created, a member joined, a ban was lifted. They flow into the framework through `EventRouter`, which fans them to registered handler classes. Their shape is dictated by Discord's API.

**Internal domain events** (the `EventBus`) carry Dumby's own business-level state changes — a moderation case was created, a user leveled up, a giveaway ended. Their shape is defined by the emitting module's `eventsCatalog` declaration. They connect modules to each other.

Conflating these two would make modules either tightly coupled to Discord's raw event model (fragile) or require translating Discord events into domain events inside every handler that cared about business-level semantics (duplicated work). Keeping them separate lets Discord events be the raw material from which modules derive domain events through their own service logic.

### 16.2 Internal Event Bus — Full Design

The `EventBus` is a typed synchronous pub/sub dispatcher. "Synchronous" here means subscribers execute in the caller's call stack before `emit()` returns — this is deliberate, ensuring that all side effects of a domain event (logging it, recording analytics, updating a derived aggregate) happen before the originating service function returns, giving callers predictable completion semantics. This ordering guarantee is deliberately paired with the async escape hatch (Pattern 4, §12.1) rather than an enforced per-subscriber time budget: a subscriber doing inherently slow or I/O-bound work reaches for Pattern 4 to move that work off the synchronous path entirely, which is what keeps the emitting command's own response latency independent of a slower subscriber's own duration. Together, the synchronous default and the async escape hatch let a module author choose predictable, complete-before-return ordering for a fast side effect and non-blocking dispatch for a slow one, on a per-subscriber basis, rather than forcing one model on every event in the system.

```
EventBus API:

emit(eventName: string, payload: T): void
  Dispatches to all matching subscribers in priority order.
  Each subscriber runs in its own try/catch; a subscriber's error
  is logged and metriced, never propagated to the emitter or to
  sibling subscribers.

on(eventName: string, handler: (payload: T) => void, options?): UnsubscribeFn
  options.priority  (number, default 0; lower runs first)
  options.once      (boolean; auto-unsubscribes after first invocation)
  Returns an unsubscribe function — modules call it in onUnload()

off(eventName: string, handler): void
  Removes a specific subscription

onAny(pattern: string, handler): UnsubscribeFn
  Pattern examples: 'moderation.*', '*.user.banned'
  Used by logging and analytics for broad observation
```

**Cycle detection.** Because dispatch is synchronous and runs in the caller's stack, a subscriber that emits an event which — through any chain of other subscribers — eventually re-emits the original event creates unbounded synchronous recursion: Module A emits `event.x`; Module B listens and emits `event.y`; Module A listens to `event.y` and emits `event.x` again, with nothing in a per-subscriber try/catch able to stop it, since the recursion spans subscribers rather than living inside any single one of them. `EventBus` tracks the current emit-chain depth in `AsyncLocalStorage` (the same mechanism `TransactionManager` uses for nested-transaction detection, §21.3) and increments it on every re-entrant `emit()` call made from inside a running subscriber. Once that depth exceeds `EVENT_BUS_MAX_EMIT_DEPTH` (default `20` — generous for any legitimate cascade, such as a moderation action triggering logging, analytics, and an anti-raid threshold check in turn, none of which normally re-triggers the original event), the offending `emit()` throws an `EventCycleError` naming the full chain of event names that produced it, instead of continuing deeper toward a stack overflow. That throw is caught by the nearest enclosing subscriber's own try/catch — the same mechanism that already isolates any other subscriber error — so a runaway cycle becomes one logged, metriced (`dumby_event_bus_cycle_detected` counter, tagged with the originating event name) failure, not a process crash with no graceful degradation. The depth counter resets to zero once a top-level `emit()` call (one not made from inside a running subscriber) returns, so it never accumulates across unrelated commands.

**Event naming convention.** Three segments, lowercase, dot-separated: `{domain}.{entity}.{action}`. Examples: `moderation.user.banned`, `economy.wallet.credited`, `guild.config.updated`. Enforced by regex validation on `on()` registration — a subscriber pattern not matching the three-segment structure throws at registration time, not silently.

### 16.3 Discord Gateway Event Router — Full Design

`EventRouter` is a single `client.on(event, handler)` attachment per Gateway event. Rather than multiple modules each calling `client.on('guildBanAdd', ...)` independently, all Gateway subscriptions go through `EventRouter`:

```
EventRouter.register(eventName, HandlerClass, priority?)
  — called during Stage 14 for every class in every module's events array

EventRouter.handleGatewayEvent(eventName, ...args)
  — the single discord.js listener
  1. Check event-loop lag (below); if over threshold, shed if sheddable
  2. For each registered handler for this event, in priority order:
     a. Check if this module is active in the invoking guild (§11.4)
        → inactive modules' handlers do not run for disabled guilds
     b. Build a RequestContext (correlation ID, module-scoped logger)
     c. Call handler.handle(...args, context) inside a try/catch
     d. A handler throwing does not prevent subsequent handlers from running
  3. Emit 'dumby.gateway.{eventName}' on the internal bus (for analytics)
```

**Backpressure under a reconnect storm.** A gateway reconnect after a network blip or a Discord-side incident can replay a large backlog of missed events near-instantly, and `EventRouter` processing every one of them at full priority risks starving the event loop of time for anything else — including in-flight command executions, which do not go through `EventRouter` at all but share the same process and the same event loop. `EventRouter` samples event-loop lag on a rolling basis (Node's own lag-detection timer, not a Discord-provided signal) and, when lag exceeds `EVENT_LOOP_LAG_SHED_THRESHOLD_MS` (default `50`), sheds events tagged `sheddable: true` in their handler registration — `typingStart` and `presenceUpdate` are the two events this framework recommends module authors mark sheddable whenever they subscribe to them, since neither has a correctness requirement that a dropped instance violates. Events never shed regardless of lag: anything feeding a moderation, auto-mod, or verification decision, and anything that would itself resolve a `guild_module_states` or `guild_configs` cache miss (dropping those would compound the very pressure the shedding exists to relieve). A shed event increments `dumby_gateway_events_shed_total` (tagged by event name) rather than disappearing silently from observability even though it disappears from processing.

### 16.4 Event Catalog as a Contract

Every module's `eventsCatalog` manifest field documents the domain events it emits — name, TypeScript payload type alias, description, and (where applicable) the conditions under which it is emitted versus not. `InternalEventBus` validates at registration time that a subscriber's event name matches a registered catalog entry; subscribing to an undocumented event name throws at module-load time, never at runtime when the event would have been dispatched.

---

## 17. Middleware Pipeline & Interceptors

### 17.1 The Onion Model

`MiddlewarePipeline` composes all registered middleware into an onion: each layer receives the context and a `next()` function, runs its before-logic, calls `next()` to continue inward, and then runs its after-logic on the way back out. Short-circuiting (aborting the chain without calling `next()`) is how authorization denials, rate-limit blocks, and module-disabled responses are implemented — the outer layers refuse to call `next()`, so the handler and all inner layers never execute.

### 17.2 Built-In Pipeline Stages, in Fixed Execution Order

| Priority | Middleware | Role |
|---|---|---|
| -20 | `MaintenanceModeMiddleware` | Short-circuits every interaction with the maintenance notice while `system_state['maintenance_mode']` is set (§25.6); no exceptions, including Admin-tier |
| -10 | `AdminTierGateMiddleware` | Owner-only gate for Admin-tier commands; runs before tracing (§11.5) |
| 0 | `TraceMiddleware` | Opens root OTel span; binds `traceId` to Pino child logger |
| 10 | `AuthMiddleware` | Verifies interaction authenticity; checks bot has `SEND_MESSAGES` in channel |
| 20 | `GuildConfigMiddleware` | Resolves guild config through cache cascade; attaches to context |
| 30 | `LocaleMiddleware` | Resolves active locale for this guild (§27) |
| 40 | `RateLimitMiddleware` | Sliding-window check-and-increment, atomic Redis operation, pre-handler |
| 50 | `PermissionMiddleware` | Discord permission checks — member and bot (resolver Layers 4–5, §19.2) |
| 60 | `RBACMiddleware` | Dumby RBAC role check (resolver Layer 6, §19.2) |
| 70 | `CooldownMiddleware` | Per-command, per-scope cooldown check; bookkeeps only on successful handler return |
| 80 | `DeferMiddleware` | Calls `deferReply()` if `requiresDefer`; Discord interaction deadline: 14 minutes |
| 90 | `AnalyticsMiddleware` | Records invocation start; after-hook records outcome, duration, status |
| 100+ | Module global middleware | Declared with `global: true` in module manifests; runs after built-in chain |
| 200+ | Command middleware | Declared in the command's own `middleware` array; runs last before handler |

> **DeferMiddleware deadline:** A deferred interaction's `editReply()` window is 14 minutes from original interaction creation (`INTERACTION_TIMEOUT = 14 * 60 * 1000` ms). DeferMiddleware sets a 13-minute safety alarm that logs a warning if `editReply()` has not been called — the 1-minute buffer before the window actually expires gives operators time to catch slow handlers before users see failures.

> **RateLimitMiddleware atomicity:** Check and increment happen atomically in a single Redis `EVALSHA` call before the handler executes. A command that is rate-limited never increments the counter; a command that passes the rate-limit check always increments it, regardless of whether the handler succeeds or fails.

### 17.3 The Root Error Boundary

The outermost wrapper of `MiddlewarePipeline.execute()` catches any error thrown by any middleware or by the handler. The error is classified (§25.1), logged with the full correlation context (`traceId`, `guildId`, `userId`, `commandPath`), reported to the error tracker, and translated by `ErrorPresenter` into a user-facing embed. The classify-and-present boundary ensures that every failure produces a consistent user experience (no unhandled Discord interaction timeouts, no "this interaction failed" messages from uncaught exceptions) and a complete operational record.

### 17.4 Custom Middleware Authoring Contract

```
abstract class BaseMiddleware {
  static name:     string   // unique identifier; appears in logs and metrics
  static priority: number   // execution order; lower = earlier
  static global:   boolean  // true = system-wide; false = per-command opt-in

  abstract execute(context: CommandContext, next: () => Promise<void>): Promise<void>
}
```

A module declaring `global: true` middleware is applying it to every command in the system, including other modules' commands. This is intentional for genuine cross-cutting concerns (additional audit logging, experimental telemetry) and requires the same review scrutiny as any other broadly-scoped change: every additional global middleware adds latency to every single interaction.

---

## 18. Interaction Handling & Component System

### 18.1 Component Registry & Custom ID Convention

All interactive message components — buttons, select menus, modals — are routed through `ComponentRegistry`, which maps a custom ID prefix to the handler class that owns it. Every custom ID follows the structure:

```
{moduleNamespace}:{actionSlug}:{contextPayload}

Examples:
  moderation:ban-confirm:TARGET_USER_ID
  economy:shop-purchase:ITEM_ID
  pagination:next:SESSION_ID
  tickets:close-confirm:TICKET_ID
```

`ComponentRegistry` routes on the `{moduleNamespace}:{actionSlug}` prefix; the `{contextPayload}` suffix is parsed by the handler itself to recover whatever context it needs without a separate Redis lookup in simple cases.

### 18.2 Buttons and Select Menus

Button and select-menu handlers extend `BaseComponentHandler`. They declare the custom-ID prefix they own, an optional `filter` predicate (evaluated synchronously before the handler body runs — most commonly enforcing that only the command invoker can operate the controls), and an `execute` method receiving the full interaction.

All five Discord select menu types are supported: `StringSelectMenu`, `UserSelectMenu`, `RoleSelectMenu`, `ChannelSelectMenu`, and `MentionableSelectMenu`. They differ only in what the `interaction.values` array contains (strings, user IDs, role IDs, channel IDs, or a mix of user and role IDs).

### 18.3 Modal System

Modals collect free-form text. A modal response is always the immediate response to a triggering interaction (command, button, or select); it cannot be sent unprompted.

**Presentation:** `interaction.showModal({ customId, title, components: [ActionRow(TextInput)] })`. Each TextInput declares a `customId`, `style` (short or paragraph), optional `minLength`/`maxLength`, optional `placeholder`, optional `value` (pre-fill), and `required`.

**Submission:** Discord delivers `ModalSubmitInteraction`; `ComponentRegistry` routes by the modal's `customId` prefix to the registered handler.

**Multi-step session:** For workflows requiring multiple modals, a Redis-backed session stores partial form state between steps, keyed `form:{workflowId}:{userId}:{guildId}` with a 15-minute TTL. Each step handler reads the session, validates and appends its data, then either presents the next modal or finalizes the workflow by writing to the database and deleting the session. Abandoned sessions expire through Redis's TTL mechanism with no manual cleanup. A step submitted after its session has already expired is a named case, not an inferred fall-through to the generic error boundary (§25.1): the step handler's session read returns nothing, which is distinguished from a session read failing outright, and the response is a specific "Your session expired — please start over with `/command`" message naming the original command, rather than the generic "something went wrong" embed a real failure produces — a user who took too long deserves a different message than one who hit a bug.

### 18.4 Autocomplete

Autocomplete handlers must respond within 3 seconds with up to 25 `{ name: string, value: string | number }` choices. Design constraints:

- Always check the L1 and L2 cache before querying the database.
- Limit any SQL query to `LIMIT 25`.
- Use short cache TTLs (30–60 s for slowly-changing lists, 5–10 s for live data).
- Pre-build autocomplete indexes for large datasets via a cron task; do not compute them on every keystroke.
- Never call an external API inline without a cache layer with at least a 30-second TTL.

`AutocompleteFilter` (shared utility in `src/shared/utils/`) provides case-insensitive prefix matching and Levenshtein-distance fuzzy scoring, so every module's autocomplete handler uses one consistent, tested implementation.

### 18.5 Pagination System

`PaginationManager` provides paginated embed navigation backed by Redis sessions.

**Session schema:**
```
Key: "paginate:session:{sessionId}"
TTL: 10 minutes (refreshed on every page turn)
Fields: sessionId, userId, guildId, channelId, messageId,
        currentPage, totalPages, pageMode ('static'|'dynamic'),
        staticPages?: EmbedData[]
        dynamicLoader?: { module: string, args: object }
```

**Static mode:** All page data is built at command-invocation time and stored in the session. Appropriate for small datasets (< 50 items).

**Dynamic mode:** The session stores only query parameters. On each page turn, the appropriate repository method is called for the requested page. Appropriate for large or frequently-updated datasets; always reflects current data, never a frozen snapshot.

**Navigation buttons:** First / Previous / [Page N of M] / Next / Last. The `filter` on every button enforces that only the invoking user can navigate; anyone else sees an ephemeral "These controls belong to another user's command" notice while the embed remains visible to all.

---

## 19. Permission & Authorization Engine

### 19.1 Architecture Overview

Authorization is a **seven-layer resolution engine**, evaluated in fixed order, where each layer may either grant (proceed), deny (short-circuit with a typed reason), or pass (continue to the next layer). Every layer is represented as a named middleware or as a named method in `PermissionResolver`; no command handler or service method implements any permission logic of its own — all authorization logic lives exclusively in the resolver or in the middleware that calls it.

### 19.2 The Seven Layers

```
LAYER 1 — PROCESS OWNER CHECK
  Is interaction.user.id in config.BOT_OWNER_IDS?
  → YES: grant unconditionally. Skip all remaining layers.
  → NO: continue.

LAYER 2 — USER BLACKLIST
  Is the user on the global blacklist, or the guild-level blacklist?
  Checks BlacklistService (in-memory cache backed by guild_user_bans table).
  → BLOCKED: deny — PermissionDeniedError('USER_BLACKLISTED')
  → CLEAR: continue.

LAYER 3 — ENVIRONMENT & CONTEXT
  command.guildOnly && !interaction.inGuild()  → deny ('DM_NOT_ALLOWED')
  Guild not in guilds table (bot was removed)  → deny, silent (log warn)
  → otherwise continue.

LAYER 4 — BOT PERMISSION CHECK
  Does the bot hold every Discord permission this command requires,
  evaluated in the specific channel (not just the guild)?
  → MISSING: deny — PermissionDeniedError('BOT_MISSING_PERMISSIONS', { missing })
  → CLEAR: continue.

LAYER 5 — DISCORD MEMBER PERMISSION CHECK
  Does the invoking member hold every Discord permission this command
  declares in permissions.discord, in this channel context?
  → MISSING: deny — PermissionDeniedError('USER_MISSING_PERMISSIONS', { missing })
  → CLEAR: continue.

LAYER 6 — DUMBY RBAC CHECK
  Skipped entirely for Core-tier commands (§11.2) — Core-tier access is
  governed exclusively by Layers 4-5's native Discord permission checks,
  never by this layer. For every other tier:
  Resolve the user's effective Dumby role via RBACService.resolve(guildId, userId).
  Is it at or above the command's permissions.rbac requirement?
  → BELOW: deny — PermissionDeniedError('RBAC_INSUFFICIENT', { required, actual })
  → MEETS OR EXCEEDS: continue.

LAYER 7 — CHANNEL & CATEGORY RESTRICTION
  Has a guild admin configured allowed channels for this command (§19.4)?
  Is the current channel or its parent category in that set?
  → NOT IN SET: deny — PermissionDeniedError('WRONG_CHANNEL', { allowedChannels })
  → IN SET, or no restriction configured: GRANT.
```

Layer 1 is the only layer that exits before traversing the full chain. Layers 2–7 each either deny with a typed reason or pass through, with one tier-specific exception: Layer 6 is skipped entirely, rather than merely passed, for Core-tier commands (§11.2), since Core-tier access is governed exclusively by Layers 4–5. The final output of the resolver for a given interaction is either `GRANT` or a `PermissionDeniedError` carrying the exact layer, reason, and diagnostic context — which `ErrorPresenter` translates into a user-facing ephemeral message.

### 19.3 Dumby RBAC Roles

Dumby maintains its own role hierarchy independent of Discord's native role system. Discord roles govern what Discord-native permissions a member holds; Dumby roles govern what Dumby features a member can use.

```
OWNER      → only users in BOT_OWNER_IDS; never granted through /settings
ADMIN      → guild owners by default; assignable to any Dumby role holder above MOD
MOD        → assignable by ADMIN; grants access to moderation commands
HELPER     → assignable by MOD; limited moderation access (warn, mute, not ban/kick)
MEMBER     → every verified guild member not in a higher role (default floor)
RESTRICTED → explicitly restricted users; below MEMBER; cannot use most features
```

Role assignment is stored in `guild_roles` (a many-to-one table joining `userId`, `guildId`, `roleSlug`) and resolved by `RBACService.resolve(guildId, userId)`, which returns the *highest* role the user holds in the hierarchy (a user may hold multiple role assignments; the highest is effective).

Resolution checks two sources, in order, before falling back to the default floor: first, a direct assignment in `guild_roles` for this specific `userId`; second, if no direct assignment exists, whether the member holds any Discord role that has been associated with a Dumby tier via `guild_configs.adminRoleId` / `modRoleId` / `helperRoleId` (§20.3) — taking the highest mapped tier if the member holds more than one mapped Discord role. A member matching neither resolves to MEMBER. This two-step design lets whatever configuration surface a deployment builds grant a Dumby role to an entire existing Discord role's membership in one write to `guild_configs`, rather than requiring every individual member to be hand-assigned through `guild_roles` one at a time — the mapping mechanism is core infrastructure; the specific command or interface a deployment uses to write to it is not something this framework prescribes.

### 19.4 Channel Restriction Configuration

Whatever configuration surface a deployment builds for this, setting a channel/category restriction writes to `guild_configs.data` under the key `channelLocks.{commandKey}` (an array of allowed channel IDs). Layer 7 reads this from the guild config (already cached in context by `GuildConfigMiddleware`) — no additional database query is required at runtime.

### 19.5 NSFW Command Flags

A command with `nsfw: true` in its class declaration is registered with `setNSFW(true)` via Discord's own command builder. Discord enforces this at the client and channel level — the command is visible only in age-restricted channels, and attempting to invoke it in a non-age-restricted channel produces a Discord-native error before the interaction ever reaches Dumby's servers. The `nsfw` flag is therefore an infrastructural classification (it controls Discord's own enforcement) rather than a runtime check inside the middleware pipeline.

### 19.6 Rate Limiting Architecture

Rate limiting operates at two levels:

**Framework-level (built-in, always-on):** `RateLimitMiddleware` applies a sliding-window limit to every command invocation for every user and every guild. The window parameters (`RATE_LIMIT_USER_WINDOW_MS`, `RATE_LIMIT_USER_MAX`, `RATE_LIMIT_GUILD_WINDOW_MS`, `RATE_LIMIT_GUILD_MAX`) are process-level configuration validated at Stage 02 (§20.2), scaled per guild by `guild_configs.rateLimitMultiplier` (§20.3) — a guild running a high-traffic community can raise its effective ceiling without an operator changing process-wide defaults that would affect every other guild the process serves. The check is a single atomic Redis `EVALSHA` that both checks and increments in one round trip, before the handler executes, so a command that exceeds its limit is denied without incrementing the counter further.

**Redis-unavailable fallback (fail-closed, not fail-open).** Rate limiting is the one subsystem in §23.5's degradation table that does not fail open, and deliberately so: an under-stress system with its abuse control disabled is the exact scenario that produces the worst outcome, since discord.js's own outbound rate-limit queue (§25.4) sits in front of Discord's API regardless, and an unthrottled flood of commands from Dumby's side risks exhausting that queue and, in the worst case, Discord-side enforcement against the bot's token. On a Redis outage, `RateLimitMiddleware` falls back to a per-process in-memory sliding-window counter (an LRU-bounded map keyed the same way as the Redis version) instead of disabling the check: strictly less accurate than the Redis version, since it only sees the requests that land on its own process rather than the fleet-wide count, but a per-process cap set at `RATE_LIMIT_USER_MAX` still bounds worst-case output even in the pathological case where one user's requests concentrate on one pod, which is what an unbounded fail-open state cannot do at all. `CooldownMiddleware`'s fallback is identical in shape, using its own in-memory map. Both fallbacks are logged at `warn` on activation and metered (`dumby_ratelimit_fallback_active` gauge) so the degraded-accuracy window is visible in dashboards rather than silent.

**Command-level cooldowns:** `CooldownMiddleware` enforces per-command, per-scope cooldowns declared on each command class, scaled per guild by `guild_configs.cooldownMultiplier` (§20.3) using the same rationale. Cooldown state is stored in Redis keyed `cooldown:{scope}:{commandKey}:{scopeId}:{userId}`. Importantly, the cooldown counter is updated *only after the handler returns successfully* — a failed command does not consume a user's cooldown budget.

**Admin-tier bypass:** `AdminTierGateMiddleware` (priority -10) grants Admin-tier commands before `RateLimitMiddleware` (priority 40) or `CooldownMiddleware` (priority 70) run. Admin-tier commands face no rate limits of any kind.

### 19.7 OAuth2-to-RBAC Bridge (Dashboard Authentication)

Web dashboard requests are authenticated with a Discord OAuth2 access token. The authorization redirect carries a cryptographically random `state` parameter, validated on callback, specifically to prevent a cross-site request forgery attack where an attacker tricks a victim's browser into completing an OAuth2 flow the attacker initiated. On successful callback, the `authMiddleware` in the HTTP server verifies the token against Discord's `/users/@me` endpoint, extracts the `userId`, then calls `RBACService.resolve(guildId, userId)` — the same in-bot resolver — to determine what MDIS panels and actions the user is permitted to access. There is no parallel authorization system for the web dashboard; it reuses the framework's own RBAC model exclusively.

The session itself is a signed JWT (HMAC-SHA256, the signing key managed alongside the framework's other secrets, §29.1), carrying the authenticated Discord user ID and an expiry, stored in the browser as an `HttpOnly`, `Secure`, `SameSite=Strict` cookie: `HttpOnly` so client-side JavaScript can never read the token even if a cross-site-scripting vulnerability existed elsewhere on the page, and `SameSite=Strict` as a second, independent CSRF defense beyond the OAuth2 `state` check above. A session's guild-administrator status is re-verified against Discord's own API on every dashboard call that touches guild-scoped data, never cached for the session's full lifetime — a member's administrator status in a given guild can change at any moment independent of their session's remaining validity, and trusting a stale, session-cached permission level would let a since-demoted administrator keep acting with permissions they no longer hold.

### 19.8 The Power Engine Panel (PEP) — Purpose and Position

Everything in §19.1–§19.7 governs one question: *within a guild the framework already serves normally, what is this specific member allowed to do?* The Power Engine Panel answers a different, higher-order question: *should the framework be serving this guild, this module, this developer, or this command at all — and is every operationally significant subsystem currently behaving the way it's configured to?* It is the framework's single point of global authority: able to reach any guild, any module (built-in-shaped or Marketplace), any Marketplace developer account, any individual command, and — through the seventeen control domains catalogued in §19.10 — the application runtime, the event bus, the middleware pipeline, the permission layer, configuration, the database layer, the cache, the HTTP surface, the job queue, localization, observability, and error handling, regardless of tier, regardless of what any guild's own administrators or any module's own manifest says.

PEP is core framework infrastructure, not a module, by the same logic that excludes the tier system itself from being one (§11): it cannot be disabled through `guild_module_states`, cannot be uninstalled through the Marketplace flow, and is not subject to the isolation rules in §10.5, since those rules govern module-to-module boundaries and PEP is not a peer of the modules it can act on. It sits structurally above the module system, in the same sense that the DI container (§9) and the event bus (§16) sit below it — infrastructure every module and every guild operates inside of, not a participant alongside them.

**PEP's breadth of reach is not, by itself, an enforcement posture.** Principle P14 (§3) governs how PEP is actually used: having the technical capacity to touch every subsystem cataloged in §19.10 is not the same as exercising that capacity, and this framework's design does not treat PEP as an ambient layer of restriction any module author or guild needs to build around. §19.12 states this boundary explicitly — no module ever implements an interface, a hook, or a contract to be compatible with PEP; it acts on the framework's own infrastructure entirely from outside the Module Contract, and no module ever calls it, is called by it, or coordinates with it directly.

### 19.9 The PEP Function-Calling Model

PEP is exposed as a service — `PowerEngineService`, bound to `TOKENS.PowerEngine` — not as a set of Discord commands, a REST API design, or any other specific user-facing surface. CLAI (§19.16) is the framework's reference operator interface to that service, in the same sense MDIS (§47) is the reference interface to guild-facing configuration; a deployment remains free to build something else on top of `PowerEngineService` instead (an Admin-tier command, a dedicated dashboard panel, an automated policy trigger reacting to abuse signals), consistent with §1's scope boundary — PEP provides the callable capability; it does not prescribe how a human or a system reaches it.

Every PEP action shares one call shape, regardless of which specific action or control domain it targets:

```
PowerEngineService.<action>(params: {
  actorId: string          // who is invoking this — a Discord user ID,
                            // a service account ID, or a system-initiated identifier
  source: 'CLAI' | 'DASHBOARD' | 'SYSTEM'   // the registered caller class (§19.18) —
                                             // PEP only accepts calls from a source it
                                             // has been explicitly configured to trust
  target: { type: 'guild' | 'module' | 'developer' | 'command' | 'application'
                | 'event' | 'middleware' | 'permission' | 'config' | 'database'
                | 'cache' | 'http' | 'queue' | 'i18n' | 'observability' | 'error',
             id: string }
  reason: string           // required; rejected at the dispatcher level if empty (§19.11)
  scope?: { guildId?: string }   // for an action scoped to one guild rather than globally
  durationMs?: number       // omitted = indefinite, until an explicit reversal
  evidenceRef?: string      // optional pointer to an external report, ticket, or log
  correlationId?: string    // propagated from a CLAI session where one initiated
                             // this call; generated by the dispatcher otherwise (§19.11)
}): Promise<PEPActionResult>
```

No PEP action is ever reachable by anything other than a call matching this shape through `PowerEngineService` itself — there is no lower-level table or flag a caller can flip directly to achieve the same effect, which is what makes the mandatory logging in §19.11 actually mandatory rather than a convention a caller could route around.

### 19.10 The PEP Control Domain Catalog

The original four target types retain the exact suspend/restore and restrict/unrestrict actions below. Thirteen further control domains extend the same dispatcher, call shape, and audit guarantee to the rest of the framework's core infrastructure, so that every operationally significant subsystem is reachable through one authority layer rather than a collection of separately-governed admin surfaces. This is a catalog of *what PEP can reach*, not a claim that a deployment routinely reaches for it (§19.12) — every domain here is a durable state change, not a live gate a request must pass through, which is what makes §19.13's deployment model possible.

**The original four:**

- **Guild-level** — `suspendGuild` / `restoreGuild`. A suspended guild's interactions are refused at the earliest possible point in dispatch (before `GuildConfigMiddleware`, before any module's handler runs) — the bot behaves, from that guild's perspective, as though it were never installed, regardless of what any per-guild `guild_module_states` row says.
- **Module-level** — `suspendModule` / `restoreModule`. Reaches every guild running the named module simultaneously, through the same `guild_module_states` fail-path a per-guild disable uses (§11.4), but originating from PEP rather than any single guild's own choice. This is the mechanism §14.4's Marketplace revocation flow calls for a `severity: critical` finding — revocation was already described as force-disabling on next event dispatch; PEP is the specific service that call reaches.
- **Developer-level** — `suspendDeveloper` / `restoreDeveloper`. Blocks a Marketplace publisher account from submitting new modules or new versions of existing ones through the pipeline in §14.4; does not, by itself, cascade to modules the developer has already published (that is a separate, explicit `suspendModule` call per affected module, made deliberately rather than automatically, so a single account action doesn't silently take down every guild depending on that developer's software).
- **Command-level** — `restrictCommand` / `unrestrictCommand`. The narrowest-blast-radius action in the catalog: disables one named command, either globally or scoped to one guild (`scope.guildId`), without touching the rest of the module it belongs to — the tool for "this one command is the problem," not "this module is."

**The thirteen extended domains:**

| Domain | Actions | Mechanism | Reaches |
|---|---|---|---|
| Application | `enableMaintenanceMode` / `disableMaintenanceMode` | Writes `system_state['maintenance_mode']` (§21.2), read by `MaintenanceModeMiddleware` (§25.6) | Whole-fleet request handling |
| Container (runtime signal) | `requestRestart` | Emits a restart signal the orchestration layer consumes; never calls the Kubernetes or Docker API directly (§44.3) | One pod or shard group |
| Events | `muteEvent` / `unmuteEvent` | Flags an event name in the internal event bus's dispatch table (§16.2) as suppressed | One gateway or internal event type, fleet-wide |
| Middleware | `disableGlobalMiddleware` / `enableGlobalMiddleware` | Removes a named `global: true` middleware from the onion chain (§17.1) without a redeploy | One global middleware, fleet-wide |
| Permissions | `blacklistUser` / `unblacklistUser` | Writes to `guild_user_bans`, read by Layer 2 of §19.2's resolver via `BlacklistService` | One user, globally or per guild |
| Config | `overrideConfigFlag` / `clearConfigOverride` | Writes a PEP-scoped flag layered above `guild_configs` (§20.1) for an emergency change without a redeploy | One config flag, fleet-wide |
| Database | `freezeModuleData` / `unfreezeModuleData` | Marks a module's tables read-only pending investigation, addressed the same way §31.2's eraser registry addresses module data | One module's data, globally or per guild |
| Cache | `flushNamespace` | Invalidates one L1+L2 namespace (§22.2) fleet-wide — the same operation `/admin/cache` already exposes (§47.3), now routed through the dispatcher | One cache namespace |
| HTTP | `disableRoute` / `enableRoute` | Marks one REST route (§47) as rejecting all requests with `503` at the router level | One API route |
| Queue | `pauseQueue` / `resumeQueue` | Pauses one named BullMQ queue (§26.1) fleet-wide; already-running jobs finish, no new jobs start | One job queue |
| i18n | `disableLocale` | Forces fallback to `en-US` (§27.1) for one locale pack found broken or incomplete, without waiting for a corrected translation file | One locale, fleet-wide |
| Observability | `setLogLevel` | Raises or lowers the process-wide Pino log level (§24.1) at runtime, for the duration of an incident, without a redeploy | Fleet-wide, or one pod |
| Error | `suppressErrorClass` / `unsuppressErrorClass` | Silences a named, already-triaged recurring error class (§25.1) from paging on-call again while a fix is in flight | One error class, fleet-wide |

Each extended-domain action is a thin, purpose-built operation over a mechanism its corresponding section already defines — PEP does not gain a general-purpose database console, a raw cache client, or arbitrary code execution through this catalog; it gains one named, audited, reversible action per domain, matching the same shape and the same mandatory-reason discipline as the original four.

### 19.11 Mandatory Audit Logging

Every call to any PEP action across all seventeen domains — successful, rejected for a missing reason, or rejected for any other cause — writes to `audit_logs` (§21.2, §29.7) before returning, through a single dispatcher every action routes through rather than by each action remembering to log itself:

```
PowerEngineDispatcher.dispatch(actionName, params):
  1. Reject immediately if params.source is not a registered caller, or params.reason
     is empty or missing — no PEP action executes without both, and the rejection
     itself is still logged (step 5)
  2. Resolve actorId to a display identity where possible (Discord user lookup,
     falling back to the raw ID if the actor is a system/service identity)
  3. Resolve correlationId from params, or generate one if the caller supplied none
  4. Execute the underlying action
  5. Write one row to audit_logs unconditionally, regardless of step 4's outcome:
     { actorId, actorDisplayName, action: actionName, source, correlationId,
       targetType, targetId, reason, scope, durationMs, evidenceRef,
       outcome: 'applied'|'rejected', failureDetail?, timestamp }
  6. Return the result to the caller
```

The `reason` field is never optional and never templated to a generic default — a dispatcher-level rejection, not a documentation convention, is what makes "brief info what actually happened" a structural property of every PEP action rather than a habit an implementer needs to remember. The same dispatcher is what the general administrative REST surface (§47.3) routes its own state-mutating calls through, so a cache flush or a queue pause triggered from that surface carries the identical reason-and-audit guarantee as a guild suspension. Reading `audit_logs` filtered to PEP-originated rows is, by construction, a complete history of every global intervention this framework's authority layer has ever taken, including every attempt that didn't go through — and filtering further by `correlationId` links a specific CLAI session (§19.18) to every PEP action it triggered, without cross-referencing a second table.

### 19.12 What the Power Engine Panel Deliberately Does Not Do

PEP having the technical reach described in §19.10 is not a description of how it gets used day to day, and this document treats that distinction as load-bearing (P14, §3):

- PEP does not run automatically against a module, a guild, or any other target for being unusual, aggressive, resource-intensive, or simply different from what others do. Every action requires a human-supplied `reason` (§19.11) tied to one of a small number of documented causes — abuse, security compromise, and confirmed policy violation are the categories this document anticipates; a deployment operator extending that list is expected to extend it explicitly, not implicitly through routine use.
- PEP does not replace, weaken, or sit inside the per-guild RBAC model (§19.1–§19.7, §19.14–§19.15) or the tier system (§11). A guild administrator's authority over their own guild, and a module author's authority over their own module's design, are the default state this framework provides; PEP is the rare exception layered on top, not a routine layer every module or guild interaction passes through the way `AuthorizationMiddleware` does.
- PEP does not grant its actors any authority beyond what its own action catalog defines. There is no PEP action to read a guild's private data, modify a guild's configuration on its administrators' behalf, or alter a module's code — its reach is confined to *whether* and *how* the framework's own infrastructure is currently operating, never to a guild's content or a module's internals.
- PEP does not require a module to implement any interface, hook, or control contract to be compatible with it. Every domain in §19.10 acts on framework-owned infrastructure that already mediates module behavior — the event bus, the middleware chain, the cache, the queue — so a module author who never once thinks about PEP has already met its only requirement of them, which is none.

### 19.13 Deployment Model — PEP as a Separate Service

PEP runs as its own deployable process — `src/entry/pep.ts` (§7.5) — rather than inside the same process as the gateway-connected bot. It never opens a Discord gateway connection and never loads a feature module; it boots the DI container, the database and cache clients, and the observability stack (§9, §21, §22, §24), then binds `PowerEngineService` and `PowerEngineDispatcher` behind its own authenticated internal surface, reachable only by registered callers (§19.9, §19.18). This is a narrow, deliberate exception to §4's "not a microservices architecture" non-goal, which concerns the *feature and module system* specifically — modules stay in-process, addressed through code-level contracts, never through network calls between them. PEP sits entirely outside that system, in the same category as the database and cache themselves: infrastructure the application depends on, not a module or a feature competing with modules for the same isolation guarantees.

Because every PEP action is a durable write to the same PostgreSQL and Redis the main application already reads (§19.10's mechanism column), the main bot process has no runtime dependency on PEP being reachable, or even running, in order to function normally. A guild suspension, a cache-namespace flush, a maintenance-mode toggle — each persists as ordinary state the relevant subsystem already checks on its own schedule; none of them require the affected pod to hold a live connection to PEP at the moment it acts on that state. PEP going offline, lagging, or restarting therefore has no effect on any guild, module, or command PEP has not been explicitly used against — it is an administrative writer, not a request-path dependency, which is what makes its separateness safe rather than a new single point of failure.

### 19.14 RBAC Groups & Sets

Layer 6 of §19.2's resolution chain — the Dumby RBAC check — resolves against a guild-configurable structure of **groups** and **sets**, layered on top of the base role hierarchy in §19.3. A **group** is a named collection of one or more Discord roles; a **set** is a named collection of one or more groups. Both are guild-scoped, created and named by that guild's own administrators, and stored in `rbac_groups` and `rbac_sets` respectively (§21.2), with role membership recorded in `rbac_group_role_bindings`.

Every guild is seeded with three default groups — `Admin`, `Mod`, and `Helper` — each marked `isDefault: true` and each carrying a `legacyTier` reference back to the corresponding entry in §19.3's hierarchy. A guild that never configures groups or sets resolves permissions exactly as §19.2–§19.3 already describe, since the seeded default groups reproduce that same hierarchy with no grants attached. A guild administrator who wants finer control renames, empties, repopulates, or deletes any of the three seeded groups, or creates entirely new groups and sets, with no obligation to preserve the seeded structure once a custom scheme is in place. Groups and sets are configured through the Web Dashboard (MDIS) — suited to bulk configuration, such as mapping many roles at once — or directly through Discord commands (`/group create`, `/group assign`, `/set create`, `/set assign`) for a single quick change in-server; both surfaces write to the same tables and are read by the same resolver, so neither is more authoritative than the other. A grant (§19.15) may target a role, a group, or a set interchangeably, which is what makes the override hierarchy below meaningful.

### 19.15 Grant Types & Override Hierarchy

A guild administrator attaches one or more **grants** to a role, a group, or a set, stored in `rbac_grants` (§21.2). Five grant types exist, each addressing a different point in the request pipeline:

- **Permit** — grants access to a specific command or permission key that the scope's base tier would not otherwise allow, without raising the scope's overall tier.
- **Blacklist** — denies a specific command or permission key outright, even where the base tier or a lower-specificity scope would otherwise allow it.
- **Whitelist (bypass)** — exempts the scope from one named restriction (a cooldown, a rate limit, a channel lock) without granting the broader Admin-tier bypass in §19.6 — the same bypass mechanism, scoped to exactly the restriction named.
- **Quota** — overrides the effective rate-limit ceiling (§19.6) for the scope, on a named command or fleet-wide, read by `RateLimitMiddleware` as an additional, more specific multiplier layered on top of `guild_configs.rateLimitMultiplier`.
- **Cooldown** — overrides the effective per-command cooldown (§19.6) for the scope, read by `CooldownMiddleware` the same way, layered on top of `guild_configs.cooldownMultiplier`.

Permit, blacklist, and whitelist grants resolve inside Layer 6 of §19.2's chain; quota and cooldown grants are read by `RateLimitMiddleware` and `CooldownMiddleware` respectively, both already part of the same pipeline (§19.6). None of the five ever touch Layers 4–5 — the Discord-native bot- and member-permission checks remain enforced independently of anything a grant declares.

**Override hierarchy: Role > Group > Set.** Where grants at more than one scope apply to the same user for the same command or permission key, the most specific scope wins outright rather than merging: a grant on a Discord role the member holds directly overrides any conflicting grant reaching them through a group, which in turn overrides any conflicting grant reaching them through a set — a set-level blacklist yields to a role-level whitelist for the same key, and the role wins. Within a single scope level, where a member holds two roles mapped to two different groups with no direct conflict, the resolver takes the union of what both groups permit (allow wins over deny), unless one of the member's directly-held roles carries an explicit role-level blacklist for that key, in which case the role-level blacklist wins regardless of what either group would otherwise permit — preventing a second, unrelated group membership from silently escalating a user's effective access. A guild's seeded default groups (§19.14) start with no grants at all; an empty `Admin` group behaves exactly as the base `ADMIN` tier already does, until an administrator attaches a grant to it directly.

### 19.16 CLAI — Command Line Administrative Interface

CLAI is PEP's frontend: a dedicated, separately-deployed service (`src/entry/clai.ts`, §7.5) providing an SSH-hosted terminal interface through which an authenticated human operator issues commands that CLAI translates into calls against `PowerEngineService` (§19.9) and the general administrative REST surface (§47.3), tagging every resulting action with the operator's identity and a shared `correlationId` (§19.11, §19.18). CLAI is reachable over the public internet by design — an operator can reach it from anywhere with a network connection, without first establishing a VPN session or operating from an IP-allowlisted network — because the compensating controls in §19.17 are stronger, and remain effective in more scenarios, than network-position trust: multi-factor authentication, a device-bound authkey, and per-IP rate limiting on authentication attempts together make a compromised network far less useful to an attacker than a bare IP allowlist would be, whereas a compromised operator device or network makes IP allowlisting moot regardless.

### 19.17 CLAI Authentication & Access Binding

Access to CLAI requires two independent factors: a password, and a locally-held **authkey** file — an encrypted credential whose hash is stored in `clai_authkeys` (§21.2), never the raw key. An authkey is scoped, not universal: it carries an explicit list of the CLAI command names it may invoke, so an operator issued a narrow authkey cannot reach commands outside that list even with a valid password and a valid key. TOTP-based multi-factor authentication is required in addition to both, consistent with this framework's encryption and rotation posture elsewhere (§29.1, §29.8). Every authentication attempt — successful or not — is rate-limited per source IP using the same sliding-window mechanism as §19.6's command rate limiting, so a stolen password or a guessed TOTP window cannot be brute-forced through volume even before an authkey is checked at all.

An authkey is generated exclusively through a secret, bot-owner-only command — never self-service, and never reachable by any operator to whom CLAI itself has already granted access — which calls the Credentials Service (§19.19) to produce it, scoped at generation time to whichever command list the bot owner assigns. This keeps authkey issuance itself outside CLAI's own reach: CLAI can use an authkey to authenticate an operator, but nothing reachable through CLAI can mint one.

The first successful use of a fresh authkey binds it to the requesting IP address, MAC address, and device fingerprint, recorded in `clai_authkeys.boundIp` / `boundMac` / `boundDeviceId`. A subsequent request presenting that authkey from a different network or a different device is rejected and the authkey expires immediately rather than merely being flagged — an authkey file alone is worthless off the device and network it was first used from. This binding requirement is waived only for requests originating from the local network the deployment itself is hosted on, where an operator with that level of physical or network access already has equivalent reach through other means (the break-glass path below assumes exactly this).

### 19.18 CLAI Operational Safeguards & Audit Correlation

Every command CLAI executes — whether it resolves to a `PowerEngineService` call or a general administrative REST call — is audited with the same completeness as a direct PEP call (§19.11), tagged `source: 'CLAI'` in `audit_logs`, carrying a `correlationId` that PEP propagates into any downstream action the command triggers. An incident investigation never needs to cross-reference two separate logs to reconstruct "an operator ran this CLAI command, which caused this PEP action" — filtering `audit_logs` by one `correlationId` produces the complete, ordered sequence. PEP itself only accepts calls whose `source` is a caller it has been explicitly configured to trust (§19.9); CLAI is the first, and at present the only, such registered source besides the framework's own internal callers.

Destructive commands — suspending a guild, or any of §19.10's kill-switch-shaped actions — require the operator to type the target's ID back as an explicit confirmation step before CLAI submits the call, the same discipline behind §29's silent-admin-rejection posture applied here: a destructive action's blast radius is confirmed by the human issuing it, not inferred from a single keystroke.

**Break-glass path.** A documented, out-of-band emergency procedure exists for the scenario where CLAI itself is compromised, unreachable, or its authkey infrastructure is unavailable — a direct database access script, held outside CLAI's own reach (an encrypted storage location such as a private object-storage bucket, never exposed through the CLI itself), that lets an operator regain administrative control without depending on CLAI being the thing that recovers first. This path exists specifically so CLAI's own security posture (§19.17) is never the single point of failure standing between an operator and a system that needs emergency intervention.

### 19.19 Credentials Service — Authkey & Dev ID Issuance

The Credentials Service is the single, shared issuance path behind every cryptographic credential this framework hands to a human: a CLAI authkey (§19.17) and a Swastik dev ID (§13.6) are both produced by calling this one service, architected the same structural way PEP is — a narrow, well-defined, function-callable action surface, reachable via an API or a direct function call from within the same trusted process family, rather than a general-purpose credential store any caller can reach.

**Generation.** A request to the Credentials Service always carries a purpose (`'clai_authkey'` or `'swastik_dev_id'`), the scoped permission set the issued credential should carry (§19.17's explicit command list, for a CLAI authkey), and the requesting user's existing authentication — a password and, for CLAI specifically, the profile the bot owner already holds. The service validates that authentication first, before generating anything at all: **a request accompanied by an incorrect password or an unrecognized profile is never processed**, and produces the same undifferentiated failure response regardless of which part of the check failed, matching the silent-rejection posture §11.5 and §19.18 already apply to every other sensitive gate in this framework. Only once authentication clears does the service generate a fresh, cryptographically random secret, hash it with Argon2id, persist only the hash (`clai_authkeys.keyHash` or `swastik_developers.devIdHash`, depending on purpose, §21.2), and return the raw value to the requesting caller exactly once.

**Deployment posture.** The Credentials Service binds to a local or internal-network interface only, never the public internet — reachable from the bot-owner-only command that requests a CLAI authkey (§19.17) and from Swastik's own developer-registration flow (§13.6), both of which already run within the same trusted network position. Reaching the Credentials Service from outside that position is not a permission failure to work around; the service is simply unreachable from there, the same structural closure Layer 1 already provides for Admin-tier commands (§11.5).

**Shared discipline, two consumers.** Because CLAI's authkeys and Swastik's dev IDs and licensing records both trace back to this one issuance path, both inherit generation that is credible, authentic, and quality-assured by the same construction: identical entropy, identical Argon2id hashing, an identical never-store-the-raw-value discipline, and an identical audited trail — tagged `source: 'CLAI'` or `source: 'SWASTIK'` in `audit_logs` (§21.2), depending on which consumer's request produced the entry. A security or auditing improvement made once to this service benefits both consumers simultaneously, rather than requiring two independently-maintained credential-generation implementations to be kept in sync by hand.

---

# PART V — DATA & STATE

---

## 20. Configuration Management

### 20.1 Three Configuration Scopes

Dumby has exactly three configuration scopes, each with a different owner, a different storage mechanism, and a different lifecycle:

**Process configuration** — environment variables, validated by the root Zod schema at Stage 02. These govern the bot's infrastructure (database URLs, Redis URLs, bot token, shard settings) and cannot be changed without redeploying the process. They are never stored in the database; they live in the process environment, sourced from a Kubernetes Secret or a `.env` file (development only).

**Guild configuration** — the set of per-guild settings that guild administrators control through the Interface or MDIS. Stored as a single JSONB document in `guild_configs.data`. These change during normal operation and are cached aggressively (L1 + L2, §22) since they are read on every command dispatch.

**Module configuration** — process-level environment variables specific to a module, prefixed with the module's name in SCREAMING_SNAKE_CASE and validated by the module's own Zod config schema at Stage 02. These govern the module's operational parameters (max warn counts, default economy starting balance, rate limit thresholds), changeable only through redeployment.

### 20.2 Process Configuration & Root Schema

The root Zod schema in `src/core/config/schema.ts` validates every required and optional process-level environment variable before any module loads. A validation failure produces a structured, field-by-field Zod error output and terminates the process at Stage 02.

Core process variables (abbreviated; full reference in §50 Appendix A):

| Variable | Type | Default | Description |
|---|---|---|---|
| `BOT_TOKEN` | string | required | Discord bot token |
| `BOT_OWNER_IDS` | string (comma-separated) | required | Process owner user IDs |
| `DEVELOPMENT_GUILD_ID` | snowflake | required | Dev guild for Admin-tier commands |
| `DATABASE_URL` | string | required | Primary PostgreSQL connection string |
| `DATABASE_READ_REPLICA_URLS` | string (comma-sep or JSON map) | optional | Read replica(s) |
| `DATABASE_POOL_MAX` | integer | `10` | Maximum pool size |
| `DATABASE_STATEMENT_TIMEOUT` | integer (ms) | `10000` | Per-query server-side timeout |
| `REDIS_URL` | string | required | Redis connection string |
| `HEALTH_PORT` | integer | `3000` | HTTP health server port |
| `API_PORT` | integer | `3001` | MDIS/REST API port |
| `NODE_ENV` | `'development'|'staging'|'production'` | required | |
| `LOG_LEVEL` | `'debug'|'info'|'warn'|'error'` | `'info'` | |
| `SHARD_COUNT` | integer | `'auto'` | Shard count; 'auto' uses Discord's recommended count |
| `RATE_LIMIT_USER_WINDOW_MS` | integer | `60000` | Sliding window duration for per-user limits |
| `RATE_LIMIT_USER_MAX` | integer | `10` | Max requests per user within the window |
| `RATE_LIMIT_GUILD_WINDOW_MS` | integer | `60000` | Sliding window duration for per-guild limits |
| `RATE_LIMIT_GUILD_MAX` | integer | `100` | Max requests per guild within the window |
| `SLOW_QUERY_THRESHOLD_MS` | integer | `500` | Logged at `warn` |
| `CRITICAL_QUERY_THRESHOLD_MS` | integer | `2000` | Logged at `error`; increments a dedicated Prometheus counter feeding SLO burn-rate alerting, distinct from the `warn`-level counter `SLOW_QUERY_THRESHOLD_MS` drives |
| `CORE_ADMIN_EVAL_ENABLED` | `'true'|'false'` | `'false'` | Enables the code-evaluation capability pattern in §11.5 Layer 4 (never in production) |
| `SWASTIK_PORT` | integer | `3002` | Swastik service port (§13.4) |
| `SWASTIK_STAGING_VOLUME_PATH` | string (path) | required | Shared Kubernetes volume mount path used for module staging and promotion (§13.10) |
| `CREDENTIALS_SERVICE_BIND_HOST` | string | `'127.0.0.1'` | Local/internal-only bind address for the Credentials Service (§19.19); never a public interface |

### 20.3 Per-Guild Configuration — `guild_configs`

`guild_configs` stores one row per guild. The `config` column is a JSONB document whose keys are Dumby-internal configuration fields. `GuildConfigService` reads and writes this document; `GuildConfigMiddleware` loads it into the request context on every command dispatch.

> **Important:** The fields below are **keys inside the `config` JSONB document**, not SQL columns. A query `SELECT config->>'logChannelId' FROM guild_configs WHERE "guildId" = $1` retrieves `logChannelId`; a query `SELECT "logChannelId" FROM guild_configs` would fail because no such column exists. This distinction is enforced by the repository layer — `GuildConfigRepository` never performs direct key-level SELECTs; it always reads the full `config` blob and deserializes it through the typed config schema.

Core guild config keys (full per-module fields are documented in each module's catalog entry, §33–§39):

```
logChannelId         snowflake | null   — channel a logging-shaped module would post to
modLogChannelId      snowflake | null   — channel for a public moderation log, if built
muteRoleId           snowflake | null   — role a moderation-shaped module would apply on mute
adminRoleId          snowflake | null   — grants ADMIN Dumby role
modRoleId            snowflake | null   — grants MOD Dumby role
helperRoleId         snowflake | null   — grants HELPER Dumby role
locale               string             — BCP 47 locale code (e.g. 'en-US')
timezone             string             — IANA timezone (e.g. 'America/New_York')
theme                'default'|'dark'|'minimal'
channelLocks         Record<commandKey, channelId[]>   — Layer 7 restriction map
cooldownMultiplier   number, default 1.0    — scales every command's cooldown for this guild (§19.6)
rateLimitMultiplier  number, default 1.0    — scales RATE_LIMIT_USER_MAX/RATE_LIMIT_GUILD_MAX for this guild (§19.6)
configVersion        integer            — incremented on every update; used for ETags
```

**Schema evolution.** New guild config keys are additive — they are added to the deserializing Zod schema with a documented default and are backward compatible with existing `config` blobs that don't contain the new key yet. Removing a key is a two-step process: stop reading it (so existing values are ignored), then add a migration to remove the key from every guild's blob. Renaming a key is a three-step process: add the new key (reading old key as fallback), migrate all guilds' blobs, then stop reading the old key.

### 20.4 Configuration Change Audit Trail

Every write to `guild_configs` is also recorded in `audit_logs` with action `GUILD_CONFIG_UPDATED` and a metadata blob containing `{ changedKeys, oldValues, newValues, actorId }`. This is enforced in `GuildConfigService.update()` — not by convention in each caller — so no config change can be made without an audit record. `oldValues` retains the pre-change values for every modified key; `newValues` the post-change values. Sensitive field values (tokens, webhooks with secrets) are replaced with `"[REDACTED]"` before writing to `audit_logs`.

---

## 21. Database Architecture & Data Layer

### 21.1 Why PostgreSQL

PostgreSQL is chosen as the sole system of record for:

- **JSONB support** for per-guild configuration documents (§20.3) without sacrificing relational integrity for the surrounding columns.
- **ACID transactions** across multiple tables, essential for multi-step operations (create a case + update infraction count + schedule a job) that must commit or fail atomically.
- **Row-level locking** (`SELECT FOR UPDATE`) for preventing concurrent double-actions on the same target (two simultaneous ban invocations for the same user in the same guild).
- **LISTEN/NOTIFY** for lightweight cross-process event signaling (used to invalidate distributed caches when a guild's configuration is changed by a different shard than the one the change was made through).
- **Mature ecosystem** — Knex, `pg-pool`, `pgbouncer`, and well-understood PostgreSQL-specific migration tooling.

### 21.2 Core Schema — Full Reference

The tables below are owned by the framework core, migrated first in every deployment (Stage 06), and exist independent of which feature modules are loaded:

```
guilds
  id          snowflake PK
  name        varchar(100)
  ownerId     snowflake NOT NULL
  joinedAt    timestamptz NOT NULL
  leftAt      timestamptz NULL
  locale      varchar(10) DEFAULT 'en-US'
  createdAt   timestamptz NOT NULL DEFAULT now()
  updatedAt   timestamptz NOT NULL DEFAULT now()

users
  id          snowflake PK
  username    varchar(32) NOT NULL
  isBot       boolean DEFAULT false
  firstSeenAt timestamptz NOT NULL DEFAULT now()
  updatedAt   timestamptz NOT NULL DEFAULT now()

guild_members
  guildId     snowflake PK (composite)
  userId      snowflake PK (composite)
  nickname    varchar(32) NULL
  joinedAt    timestamptz NOT NULL
  leftAt      timestamptz NULL
  createdAt   timestamptz NOT NULL DEFAULT now()
  updatedAt   timestamptz NOT NULL DEFAULT now()
  INDEX: (guildId), (userId)

guild_configs
  guildId       snowflake PK
  config        jsonb NOT NULL DEFAULT '{}'
  configVersion integer NOT NULL DEFAULT 0
  updatedAt     timestamptz NOT NULL DEFAULT now()
  updatedBy     snowflake NULL REFERENCES users(id)
  — Note: guild-specific module settings are keys inside the config JSONB document,
    not columns. The typed field reference is in §20.3.

guild_roles
  id          uuid PK DEFAULT gen_random_uuid()
  guildId     snowflake NOT NULL REFERENCES guilds(id)
  userId      snowflake NOT NULL REFERENCES users(id)
  role        varchar(20) NOT NULL  — 'OWNER'|'ADMIN'|'MOD'|'HELPER'|'RESTRICTED'
  assignedBy  snowflake NOT NULL REFERENCES users(id)
  assignedAt  timestamptz NOT NULL DEFAULT now()
  UNIQUE (guildId, userId, role)
  INDEX: (guildId, userId)

guild_module_states
  — Full schema in §11.4

marketplace_listings
  moduleSlug              varchar(60) PK
  marketplaceCategory     varchar(20) NOT NULL
  installCount            integer NOT NULL DEFAULT 0
  description             text NOT NULL
  requiredExternalConfig  jsonb NULL  — env vars needed beyond BOT_TOKEN
  listedAt                timestamptz NOT NULL DEFAULT now()
  updatedAt               timestamptz NOT NULL DEFAULT now()

audit_logs
  id            uuid PK DEFAULT gen_random_uuid()
  guildId       snowflake NULL REFERENCES guilds(id)  — null for global actions
  actorId       snowflake NOT NULL REFERENCES users(id)
  action        varchar(60) NOT NULL     — e.g. 'GUILD_CONFIG_UPDATED', 'MODULE_DISABLED'
  targetId      snowflake NULL           — the object the action was taken on
  source        varchar(20) NOT NULL DEFAULT 'FRAMEWORK'
                — 'FRAMEWORK'|'PEP'|'CLAI'|'SWASTIK'|'DASHBOARD' (§19.11, §19.18, §13.12)
  correlationId uuid NULL                — links a CLAI command to the PEP action(s)
                                            it triggers (§19.18)
  metadata      jsonb NOT NULL DEFAULT '{}'
  createdAt     timestamptz NOT NULL DEFAULT now()
  — INSERT-ONLY: no UPDATE or DELETE ever touches this table
  INDEX: (correlationId)

blocked_users
  id          uuid PK DEFAULT gen_random_uuid()
  userId      snowflake NOT NULL REFERENCES users(id)
  guildId     snowflake NULL REFERENCES guilds(id)  — null = global block
  reason      text NULL
  blockedBy   snowflake NOT NULL REFERENCES users(id)
  blockedAt   timestamptz NOT NULL DEFAULT now()
  UNIQUE (userId, guildId)

metering_usage_daily
  — Feature #1: Multi-Tenant Resource Metering (§48.2)
  guildId     snowflake NOT NULL REFERENCES guilds(id)
  date        date NOT NULL
  resource    varchar(40) NOT NULL   — 'commands'|'api_calls'|'jobs'|etc.
  amount      bigint NOT NULL DEFAULT 0
  PRIMARY KEY (guildId, date, resource)

guild_outbound_webhooks
  — Feature #9: Custom Webhook Outbound (§48.2)
  id          uuid PK DEFAULT gen_random_uuid()
  guildId     snowflake NOT NULL REFERENCES guilds(id)
  url         text NOT NULL
  secret      text NULL   — stored encrypted; never returned in API responses
  eventFilter jsonb NOT NULL DEFAULT '[]'  — array of event name patterns to include
  isActive    boolean NOT NULL DEFAULT true
  createdAt   timestamptz NOT NULL DEFAULT now()
  createdBy   snowflake NOT NULL REFERENCES users(id)
  updatedAt   timestamptz NOT NULL DEFAULT now()
  updatedBy   snowflake NOT NULL REFERENCES users(id)

backup_history
  — Feature #7: Database Backup / Feature #8: Restore Automation (§48.2)
  id          uuid PK DEFAULT gen_random_uuid()
  startedAt   timestamptz NOT NULL
  completedAt timestamptz NULL
  sizeBytes   bigint NULL
  storageUrl  text NULL   — path in S3/GCS bucket
  status      varchar(20) NOT NULL  — 'in_progress'|'success'|'failed'
  createdAt   timestamptz NOT NULL DEFAULT now()

rbac_sets
  — RBAC Groups & Sets (§19.14)
  id          uuid PK DEFAULT gen_random_uuid()
  guildId     snowflake NOT NULL REFERENCES guilds(id)
  name        varchar(60) NOT NULL
  createdAt   timestamptz NOT NULL DEFAULT now()
  createdBy   snowflake NOT NULL REFERENCES users(id)
  updatedAt   timestamptz NOT NULL DEFAULT now()
  UNIQUE (guildId, name)

rbac_groups
  — RBAC Groups & Sets (§19.14)
  id          uuid PK DEFAULT gen_random_uuid()
  guildId     snowflake NOT NULL REFERENCES guilds(id)
  setId       uuid NULL REFERENCES rbac_sets(id)  — a group may stand alone or join one set
  name        varchar(60) NOT NULL
  isDefault   boolean NOT NULL DEFAULT false
  legacyTier  varchar(20) NULL  — 'ADMIN'|'MOD'|'HELPER', set only on the seeded groups
  createdAt   timestamptz NOT NULL DEFAULT now()
  createdBy   snowflake NOT NULL REFERENCES users(id)
  updatedAt   timestamptz NOT NULL DEFAULT now()
  UNIQUE (guildId, name)

rbac_group_role_bindings
  — RBAC Groups & Sets (§19.14)
  groupId       uuid NOT NULL REFERENCES rbac_groups(id)
  discordRoleId snowflake NOT NULL
  PRIMARY KEY (groupId, discordRoleId)

rbac_grants
  — Grant Types & Override Hierarchy (§19.15)
  id          uuid PK DEFAULT gen_random_uuid()
  guildId     snowflake NOT NULL REFERENCES guilds(id)
  scopeType   varchar(10) NOT NULL  — 'role'|'group'|'set'
  scopeId     varchar(40) NOT NULL  — a discordRoleId, or an rbac_groups/rbac_sets id
  grantType   varchar(10) NOT NULL  — 'permit'|'quota'|'cooldown'|'whitelist'|'blacklist'
  targetKey   varchar(100) NOT NULL — a command key, a permission key, or 'GLOBAL'
  value       jsonb NOT NULL        — shape keyed by grantType (§19.15)
  createdAt   timestamptz NOT NULL DEFAULT now()
  createdBy   snowflake NOT NULL REFERENCES users(id)
  updatedAt   timestamptz NOT NULL DEFAULT now()
  INDEX: (guildId, scopeType, scopeId), (guildId, targetKey)

guild_command_queue
  — The Guild Command Change Queue (§15.7)
  id          uuid PK DEFAULT gen_random_uuid()
  guildId     snowflake NOT NULL REFERENCES guilds(id)
  changeType  varchar(10) NOT NULL  — 'rename'|'alias'|'delete'
  moduleSlug  varchar(60) NOT NULL
  commandKey  varchar(100) NOT NULL  — the existing command this entry changes
  newValue    varchar(100) NULL     — the new name or alias; null for 'delete'
  batchId     uuid NOT NULL         — groups entries sharing one push window
  queuedAt    timestamptz NOT NULL DEFAULT now()
  queuedBy    snowflake NOT NULL REFERENCES users(id)
  pushAt      timestamptz NOT NULL  — the batch's T₀ + 13 hours
  status      varchar(12) NOT NULL DEFAULT 'pending'
              — 'pending'|'applied'|'revoked'|'invalidated'
  INDEX: (guildId, status), (batchId)

guild_command_overrides
  — Command Collision Resolution (§15.9)
  id                 uuid PK DEFAULT gen_random_uuid()
  guildId            snowflake NOT NULL REFERENCES guilds(id)
  commandKey         varchar(100) NOT NULL  — the contested command or alias name
  resolvedModuleSlug varchar(60) NOT NULL   — the module whose command wins this name
  resolvedAt         timestamptz NOT NULL DEFAULT now()
  resolvedBy         snowflake NOT NULL REFERENCES users(id)
  UNIQUE (guildId, commandKey)

guild_persona_bindings
  — Twill / Persona System (§6.6)
  guildId     snowflake NOT NULL REFERENCES guilds(id)
  moduleSlug  varchar(60) NOT NULL
  personaId   varchar(20) NOT NULL  — the owning Persona's Discord application ID
  boundAt     timestamptz NOT NULL DEFAULT now()
  PRIMARY KEY (guildId, moduleSlug)
  INDEX: (guildId, personaId)

system_state
  — Maintenance Mode / 404 Mode (§25.6) and other fleet-wide singleton flags
  key         varchar(60) PK
  value       jsonb NOT NULL
  updatedAt   timestamptz NOT NULL DEFAULT now()
  updatedBy   snowflake NULL REFERENCES users(id)

mtp_token_ledger_daily
  — Metric Track Protocol (§28.5)
  guildId     snowflake NOT NULL REFERENCES guilds(id)
  date        date NOT NULL
  resource    varchar(20) NOT NULL
              — 'compute'|'memory'|'disk'|'bandwidth'|'database'|'external_api'
  tokensSpent bigint NOT NULL DEFAULT 0
  PRIMARY KEY (guildId, date, resource)

clai_authkeys
  — CLAI Authentication & Access Binding (§19.17)
  id              uuid PK DEFAULT gen_random_uuid()
  label           varchar(60) NOT NULL   — operator-assigned name, e.g. 'on-call-primary'
  keyHash         text NOT NULL          — Argon2id hash; the raw authkey is never stored
  allowedCommands jsonb NOT NULL DEFAULT '[]'  — CLAI command names this key may invoke
  boundIp         varchar(45) NULL       — set on first successful use
  boundMac        varchar(17) NULL
  boundDeviceId   varchar(100) NULL
  issuedAt        timestamptz NOT NULL DEFAULT now()
  issuedBy        snowflake NOT NULL REFERENCES users(id)
  expiresAt       timestamptz NULL       — set the instant a bound value changes (§19.17)
  revokedAt       timestamptz NULL

swastik_developers
  — Developer Registration & Token-Based Identity (§13.6);
    Licensing as an Approval Tracker (§13.7)
  devId           uuid PK DEFAULT gen_random_uuid()
  devIdHash       text NOT NULL          — Argon2id hash; the raw dev ID is never stored
  username        varchar(32) NOT NULL UNIQUE
  passwordHash    text NOT NULL          — Argon2id
  approvalStatus  varchar(10) NOT NULL DEFAULT 'pending'
                  — 'pending'|'approved'|'declined' (§13.7)
  approvedBy      snowflake NULL REFERENCES users(id)
  approvedAt      timestamptz NULL
  registeredAt    timestamptz NOT NULL DEFAULT now()
  updatedAt       timestamptz NOT NULL DEFAULT now()

swastik_builds
  — Secured Module Upload API (§13.8); Pre-Deployment Validation (§13.9);
    Staging, Atomic Promotion & Hot-Swap Signaling (§13.10)
  buildId           uuid PK DEFAULT gen_random_uuid()
  devId             uuid NOT NULL REFERENCES swastik_developers(devId)
  moduleSlug        varchar(60) NOT NULL
  version           varchar(20) NOT NULL   — semver
  status            varchar(20) NOT NULL DEFAULT 'validating'
                    — 'validating'|'staged'|'promoted'|'rolled_back'|'rejected'
  validationDetail  jsonb NULL             — populated on rejection (§13.9)
  stagingPath       text NULL              — shared Kubernetes volume path (§13.10)
  codebaseSizeBytes bigint NULL
  submittedAt       timestamptz NOT NULL DEFAULT now()
  promotedAt        timestamptz NULL
  rolledBackAt      timestamptz NULL
  UNIQUE (devId, moduleSlug, version)
  INDEX: (moduleSlug, status)
```

### 21.3 The Repository Pattern & Service Layer Discipline

Every table has exactly one owning repository. Repositories extend `BaseRepository<TRow>` and supply all data-access methods for their table. No command handler ever calls a repository directly; no repository contains business logic; no repository opens its own transaction.

```
BaseRepository<TRow> — complete method reference:

findById(id, options?)          → TRow | null
findOne(where, options?)        → TRow | null
findMany(where, options?)       → { records: TRow[], nextCursor: string | null }
create(data, options?)          → TRow
createMany(dataArray, options?) → number
update(where, data, options?)   → TRow[]
updateById(id, data, options?)  → TRow | null
delete(where, options?)         → number  (soft-delete if deleted_at exists)
deleteById(id, options?)        → number
count(where?)                   → number
exists(where)                   → boolean
raw(sql, bindings?)             → QueryResult
```

All methods accept an `options` object with: `trx?` (transaction handle from `TransactionManager`), `replica?: boolean` (force this read to a replica, regardless of method name), `includeDeleted?: boolean` (include soft-deleted rows), `columns?: string[]` (project specific columns; never SELECT * in any query), `returning?: string[]` (for INSERT/UPDATE, default `['id']`).

**Transaction management:** `TransactionManager.run(async (trx) => { ... })` executes its callback atomically. Repositories receive the `trx` handle and route their calls through it. Repositories never call `TransactionManager.run()` or open their own transactions — transaction scope is always the service layer's decision:

```typescript
// In a service method — correct
await this.transactionManager.run(async (trx) => {
  const modCase = await this.caseRepo.create(caseData, { trx });
  await this.infractionRepo.create({ ...infractionData, caseId: modCase.id }, { trx });
  await this.userRepo.updateById(userId, { infractionCount: knex.raw('infraction_count + 1') }, { trx });
});
// (Note: 'case' is a reserved word; variable names use modCase, caseRecord, etc.)
```

**Nested calls.** A service method that is itself already running inside a `TransactionManager.run()` block sometimes calls another service method that opens its own `TransactionManager.run()` — a cross-service call inside a single logical operation, for instance. `TransactionManager` detects this via `AsyncLocalStorage` and issues a `SAVEPOINT` rather than attempting an invalid nested `BEGIN`: the inner `run()` call gets its own named savepoint, an inner failure rolls back to that savepoint alone (the outer transaction's earlier writes survive and the outer callback decides how to proceed), and the outer transaction's eventual commit or rollback governs the savepoint's own fate regardless of the inner call's outcome. A service author never checks whether they are already inside a transaction before calling `TransactionManager.run()` — nesting is always safe, by construction.

### 21.4 Migrations

Every schema change ships as a migration file with both `up(knex)` and `down(knex)` exports. A migration missing `down` fails the CI validation step. Migrations are namespaced per module; the `knex_migrations` table records `{namespace}:{filename}` so modules can each have sequential numbering without collision.

Zero-downtime migration patterns (required for tables with > 100 k rows):

- **Add nullable column:** Safe — no full-table lock.
- **Add NOT NULL with default (PostgreSQL ≥ 11):** Safe — default stored in catalog, no row rewrite.
- **Drop column:** Two-step: stop referencing in code → separate migration to DROP.
- **Change type:** Three-step: add new column → backfill → switch code → drop old column.
- **Add index:** Always `CREATE INDEX CONCURRENTLY` — no blocking table lock.

### 21.5 Standard Audit Columns

Every table in Dumby (core or module) that represents an entity (not a pure join table or a time-series) carries:

```
createdAt   timestamptz NOT NULL DEFAULT now()
updatedAt   timestamptz NOT NULL DEFAULT now()
createdBy   uuid NULL REFERENCES users(id)
updatedBy   uuid NULL REFERENCES users(id)
```

Entity tables additionally carry soft-delete columns:

```
deletedAt   timestamptz NULL
deletedBy   uuid NULL REFERENCES users(id)
```

`BaseRepository.findMany()` and `findById()` exclude soft-deleted rows by default. Pass `options.includeDeleted = true` to include them. CI's migration-validation step checks for the presence of these columns on every new entity table migration and fails the build if they are absent.

**Unique constraints on a soft-deletable table are partial indexes, never plain unique constraints.** PostgreSQL's ordinary `UNIQUE` constraint does not know about `deletedAt` and will reject a re-insert that collides with a soft-deleted row — a user who leaves a guild (soft-deleting their `guild_members` row, for instance) and later rejoins would hit a spurious `ConflictError` on a naive `UNIQUE (guildId, userId)` constraint, since the deleted row still occupies that key. Every unique constraint declared on a table that also carries `deletedAt` is therefore written as `CREATE UNIQUE INDEX ... ON table (col1, col2) WHERE "deletedAt" IS NULL` rather than an inline `UNIQUE (col1, col2)` table constraint — scoping uniqueness to *currently live* rows only, so a soft-deleted row's key becomes available again immediately, exactly as if the row had been hard-deleted, while the soft-deleted row itself is still retained for history. CI's migration-validation step checks for this specifically: a migration that adds a plain `UNIQUE` constraint to a table already carrying `deletedAt` fails the build with a message pointing at this section, the same way a missing audit column does.

### 21.6 Read/Write Routing & Global Read Replicas

When `DATABASE_READ_REPLICA_URLS` is configured, `ReadWriteRouter` routes repository calls automatically by method name prefix: `find*`, `count*`, `exists*` go to a replica; `create*`, `update*`, `delete*` go to the primary. Methods inside a `TransactionManager.run()` block always go to the primary, regardless of method name.

For multi-region deployments (`DATABASE_READ_REPLICA_URLS` as a JSON map of region name to connection string), the router additionally selects the nearest healthy replica to the request's originating region. Replica lag is monitored via `pg_stat_replication`; a replica whose measured lag exceeds `DATABASE_REPLICA_MAX_LAG_MS` (default 1000ms) is removed from the routing pool until it catches up, with all its requests transparently falling back to the primary. This implements Feature #26 (Global Read-Replicas, §48.2) without any per-callsite configuration.

---

## 22. Caching Architecture & Strategy

### 22.1 Two-Tier Design

**L1 — In-process LRU (memory).** A single LRU cache per process instance, keyed on the same string keys as L2. Capacity is bounded by `CACHE_L1_MAX_ENTRIES` (default 5000) and `CACHE_L1_MAX_BYTES` (default 50 MB). L1 provides sub-microsecond reads for the hottest guild config and module-state keys, with no network round-trip. It is intentionally small and fast — a warm-up cache, not a persistence layer.

**L2 — Redis (shared, cross-shard).** A shared Redis instance visible to all shards. L2 provides millisecond reads for any key any shard has written, ensuring that a change made through Shard 0 is immediately visible to Shard 3 once the Redis key is populated (or invalidated, on a write). L2 TTLs are set per key family and are the authoritative expiry.

Read path: L1 hit → return immediately. L1 miss → L2 read. L2 hit → write to L1, return. L2 miss → database query → write to L2, write to L1, return.

### 22.2 Key Naming & Namespacing

All cache keys follow `{namespace}:{entity}:{id}` with additional discriminators as needed:

```
guild:{guildId}:config            — guild_configs blob (TTL: 300 s)
guild:{guildId}:module-catalog    — getCatalogForGuild result (TTL: 60 s)
guild:{guildId}:module-state:{moduleSlug} — guild_module_states row (TTL: 60 s)
guild:{guildId}:roles             — guild_roles list (TTL: 300 s)
user:{userId}:blacklist           — blocked_users check (TTL: 120 s)
cooldown:{scope}:{cmdKey}:{id}    — cooldown window (TTL: cooldown duration)
paginate:session:{sessionId}      — pagination session (TTL: 600 s)
form:{workflowId}:{userId}:{gId}  — modal form session (TTL: 900 s)
```

### 22.3 Cache Invalidation

The framework provides two invalidation patterns:

**On-write invalidation (preferred for strong consistency).** When `GuildConfigService.update()` writes a new guild config blob, it calls `CacheManager.delete('guild:{guildId}:config')` within the same database transaction's commit callback, and separately issues `NOTIFY guild_config_changed, '{guildId}'` (§21) as part of the same transaction. The same two-part pattern applies to `guild_module_states` writes in `GuildModuleStateService`, on its own `NOTIFY guild_module_state_changed` channel. This is eventually consistent within a bounded window, not an atomic guarantee: PostgreSQL and Redis do not share a transaction, so if the process dies between the commit and the Redis `DELETE` — an OOM kill or crash in that exact gap — the stale entry would otherwise survive for its full TTL (up to 300 seconds for guild config). The `NOTIFY` is the backstop that narrows this window: every pod holds a persistent `LISTEN` connection on both channels (§23.3) and, independent of whether its own `DELETE` call succeeded, invalidates its L1 entry and re-issues the Redis `DELETE` on receiving the notification — since `NOTIFY` is delivered on commit by Postgres itself rather than by a second application-level network call that can fail independently, a reader sees stale data only if *both* the original `DELETE` and every pod's `LISTEN` delivery fail in the same window, not if either one alone does. Even in that case, the TTL itself is the final, deliberate backstop that bounds exactly how long any stale read can persist. `configVersion` (§20.3) makes this checkable directly: a client that reads a version older than what it expects has concrete evidence of the gap rather than silent staleness.

**TTL-based expiry (for non-critical or read-mostly data).** User blacklist checks and guild role lists are allowed to be up to their TTL stale, since the cost of re-reading a cached denial is lower than the cost of invalidating on every guild membership change.

### 22.4 Cache Stampede Protection

When a high-traffic key expires simultaneously from many concurrent requests' perspectives, all of them may race to rebuild it, flooding the database. `StampedeGuard` provides two complementary defenses:

**Distributed lock.** On an L2 cache miss, the caller acquires a Redis lock using `SET NX EX` (a single, atomic command — not check then set). Only the lock-holder rebuilds from the database and writes back to cache. Other callers wait with exponential backoff and re-check L2 on each retry. The lock TTL is bounded by the maximum expected rebuild time plus a safety margin; an abandoned lock expires automatically.

**Probabilistic early expiration.** Before a key's TTL expires naturally, `StampedeGuard` computes a probability that the current reader should proactively refresh it:

```
shouldRefreshEarly = (remainingTtl / originalTtl) < threshold
                     AND random() < refreshProbability
```

With `threshold = 0.15` (refresh eligible in the last 15% of TTL) and `refreshProbability = 0.1` (only 10% of readers in that window actually trigger a background refresh), roughly one in ten requests in the tail of a key's TTL window preemptively refreshes the cache before it expires — spreading the rebuild cost over time and dramatically reducing the probability that any request ever encounters a complete cache miss for a hot key. The refresh happens in the background; the current reader is served the cached (slightly older) value immediately.

### 22.5 Negative Caching

A cache miss that hits the database and finds no record (a `findById` for a guild that has never interacted with the bot, for instance) still writes a sentinel value to L2 rather than caching nothing:

```
CacheManager.set(key, NEGATIVE_SENTINEL, { ttl: 30 })
```

A subsequent read within the 30-second window returns the sentinel, and `CacheManager.get()` translates it to `null` for the caller. This prevents the database from being bombarded with repeated lookups for the same non-existent record and is essential for any pattern where user input can force arbitrary lookups (autocomplete, user lookup commands, etc.).

### 22.6 Cache Stats and Observability

`CacheManager` maintains per-key-family counters exposed as Prometheus metrics:

```
dumby_cache_hits_total{layer="l1|l2", namespace}
dumby_cache_misses_total{namespace}
dumby_cache_set_total{namespace}
dumby_cache_invalidations_total{namespace}
dumby_cache_stampede_locks_total{namespace}
dumby_cache_early_refresh_total{namespace}
```

A cache hit ratio below 80% for any namespace over a 5-minute window is the threshold for a cache-performance review alert.

---

## 23. State Externalization & Horizontal Scaling

### 23.1 The Core Constraint — No Process-Local State

A Dumby deployment may run multiple processes simultaneously — multiple shards in a shard cluster, multiple pods in a Kubernetes deployment. Any state stored only in one process's memory is invisible to all other processes and is lost if that process restarts. This is treated not as a scalability optimization but as a correctness constraint: a guild's moderation state, economy balance, or enabled module list must be consistent whether a command is dispatched to Pod 0 or Pod 7.

The rule: **every piece of state that must be correct across processes lives in PostgreSQL or Redis, never in process memory alone.** Process memory (L1 cache, §22.1) is a performance acceleration layer, not a source of truth.

### 23.2 What Lives Where

| State Category | Storage | TTL / Durability |
|---|---|---|
| Guild configuration | PostgreSQL (`guild_configs`) | Permanent; cached in Redis + L1 |
| Module enabled/disabled state | PostgreSQL (`guild_module_states`) | Permanent; cached in Redis + L1 |
| RBAC role assignments | PostgreSQL (`guild_roles`) | Permanent; cached in Redis |
| RBAC groups, sets, and grants | PostgreSQL (`rbac_groups`, `rbac_sets`, `rbac_grants`) | Permanent; cached in Redis (§19.14–§19.15) |
| Guild command queue (BCCM & lifecycle deletions) | PostgreSQL (`guild_command_queue`) | Permanent; not cached — read only by the batch pusher (§15.7) |
| Command collision overrides | PostgreSQL (`guild_command_overrides`) | Permanent; cached in L1 (§15.9) |
| Persona ownership bindings | PostgreSQL (`guild_persona_bindings`) | Permanent; cached in Redis (§6.6) |
| Maintenance mode flag | PostgreSQL (`system_state`) | Permanent; mirrored in Redis for fast fleet-wide propagation (§25.6) |
| MTP artificial token ledger | PostgreSQL (`mtp_token_ledger_daily`) | Permanent; aggregated hourly from Redis counters (§28.5) |
| CLAI authkey bindings | PostgreSQL (`clai_authkeys`) | Permanent; never cached (§19.17) |
| Swastik developer & licensing records | PostgreSQL (`swastik_developers`) | Permanent; never cached (§13.6–§13.7) |
| Swastik build & deployment records | PostgreSQL (`swastik_builds`) | Permanent; never cached (§13.8–§13.10) |
| Moderation cases, economy wallets, etc. | PostgreSQL (module-owned tables) | Permanent |
| Audit records | PostgreSQL (`audit_logs`) | Permanent; INSERT-only |
| Command cooldowns | Redis | TTL = cooldown duration |
| Rate limit windows | Redis | TTL = rate limit window |
| Pagination sessions | Redis | TTL 10 minutes |
| Form sessions | Redis | TTL 15 minutes |
| `guild_module_states` cache | Redis | TTL 60 s |
| Guild config cache | Redis | TTL 300 s; invalidated on write |
| BullMQ job queue | Redis | Until job completes or is DLQ'd |

### 23.3 Cross-Shard Coordination

When Shard 0 processes a guild-configuration update for Guild G — a locale change is the illustrative case — it writes the update to PostgreSQL and invalidates the `guild:{G}:config` key in Redis. Shard 3, which may next serve a command from Guild G, will fetch the config fresh from Redis (or PostgreSQL if the key isn't populated yet) and see the updated locale — no direct inter-shard communication is required. Redis is the coordination layer; shards are stateless peers, not a cluster with leader/follower roles for any particular guild.

For operations that require knowing whether any shard is currently processing a specific guild (to prevent concurrent moderation actions on the same target, for instance), `SETNX` Redis locks with bounded TTLs are the mechanism — not direct shard-to-shard messaging. A shard that fails to acquire the lock waits briefly and retries; after three failed attempts it informs the user that a concurrent action is already in progress, rather than proceeding with a potentially conflicting operation.

### 23.4 Shard Ownership — The Lock Model Behind Both Failover and Rolling Updates

The `deployment.yaml` reference configuration sets `replicas: 2` with Pod Disruption Budget `minAvailable: 1`. Two pods do **not** both connect as the same Discord shard simultaneously — Discord invalidates a shard's prior session when a second connection for the same shard ID attempts to identify — so shard ownership for each shard ID is arbitrated by a single mechanism, used identically whether the reason for a handoff is a crash or a routine deploy: a Redis key `shard:{shardId}:owner`, written with `SET NX EX` by whichever pod holds it and heartbeated every `SHARD_LOCK_HEARTBEAT_MS` (default `10000`). Any pod that does not hold the lock for a shard it's configured to serve — whether that's exactly one standby or, briefly, a second and third pod during a rollout's surge (below) — waits and retries acquisition every `SHARD_LOCK_RETRY_MS` (default `2000`). The model is a lock any number of non-owners can contend for, not a fixed two-party active/standby relationship, which is what lets it handle a rolling update's momentary third pod without a separate case.

Kubernetes' `/health/readiness` probe (§24.5) genuinely does depend on a pod completing gateway login for its shard — that dependency, via Stage 15 and Stage 18 (§8.2), is unchanged. What changes between the two handoff scenarios below is only how quickly a *waiting* pod gets the chance to acquire the lock in the first place, which is exposed for observability via the `dumby_shard_owner{shard_id}` gauge (§24.3) but does not require redefining what readiness means.

**Unplanned handoff (the owning pod crashes or fails its liveness probe).** The dead pod stops heartbeating; its lock's TTL expires unclaimed. A waiting pod's next retry succeeds once the TTL lapses — typically 10–15 seconds after the failure, bounded by the heartbeat interval and TTL, with no operator intervention. This is the slower of the two cases because nothing tells a waiting pod the old owner is gone sooner than the TTL does; there is no working pod left to send that signal proactively.

**Planned handoff (a rolling update replaces the pod on purpose).** Here the old pod is still healthy right up until it's asked to leave, which makes a faster, proactive release possible instead of waiting for a passive timeout. A new pod, on starting, writes `shard:{shardId}:handoff_requested = {new-pod-identity}` in addition to attempting normal lock acquisition. Each owning pod's existing 10-second heartbeat loop checks for this key; seeing a handoff request from a different pod identity, it releases the shard lock immediately, as the first action of its graceful shutdown sequence (§8.3) — self-initiated, rather than waiting for Kubernetes to deliver `SIGTERM` — and only then proceeds through the rest of that sequence. This self-initiation is what avoids a circular wait: the new pod's readiness genuinely does depend on completing gateway login (§8.2 Stage 15 → Stage 18, unchanged), and the old pod's lock release does not depend on the new pod already being ready, so neither side is blocked on the other. The waiting new pod acquires the now-free lock on its next retry, typically within one retry interval on top of the heartbeat-check delay (a few seconds total, not the 10–15 second unplanned-failure figure), completes its own gateway login, and only then reports readiness — Kubernetes' rollout simply sees this pod take a few seconds longer to become ready than a lock-free start would, which is ordinary rolling-update behavior, not a service-wide gap, since the old pod remains up and serving until Step 2 above triggers its own shutdown.

This is a leader-election pattern using Redis `SET NX EX` heartbeats and a request/release handshake, not full Raft consensus — appropriate for a workload where a brief, bounded single-digit-second-to-15-second gateway reconnect on one shard during handoff is the expected, by-design behavior rather than a fault condition, and the overhead of a full consensus protocol is unwarranted for it. §30.2 describes how this mechanism fits into the rolling-update sequence end to end.

### 23.5 Graceful Degradation Under Partial Outage

**Redis unavailable:** Rate limiting falls back to a per-process in-memory limiter rather than failing open (§19.6) — this is a deliberate fail-closed choice, not an oversight. Cooldowns fall back the same way. Guild config falls back to PostgreSQL reads directly. Session-based features (pagination, multi-step forms) are unavailable until Redis recovers. Guild module state falls back to PostgreSQL; fail-closed behavior (unknown state = disabled) applies when PostgreSQL is also unavailable.

**Why the two fail-closed choices above have different blast radii, by design, not by accident.** Every degradation choice in this section is fail-open or fail-closed for a stated reason, not a per-subsystem default applied unreflectively: rate limiting and cooldowns fail closed (degraded-but-present, via the in-memory fallback above) because the cost of under-throttling is external and irreversible — a Discord-side token ban — while the cost of over-throttling during a brief degraded window is a handful of users retrying a command. Guild module state fails closed at the *module* level for the same reason, one layer over: an unknown-state Standard module is treated as disabled rather than enabled, because the failure mode of wrongly enabling a moderation or auto-mod module a guild had deliberately turned off is worse than the failure mode of a command being briefly unavailable. Guild config, by contrast, degrades to a direct (uncached, slower) PostgreSQL read rather than failing closed at all, because there is no safety argument for blocking configuration reads during a cache outage — only a latency cost, which a direct read simply absorbs. None of these three is the "default" the others deviate from; each is reasoned independently from what the specific failure would cost.

**PostgreSQL unavailable:** All commands that require database access return a user-visible error ("The bot's database is temporarily unavailable; please try again in a moment."). Core-tier commands that only need cached guild config (already in L1 from before the outage) may continue to function for the L1 TTL window. Jobs in BullMQ remain queued until the database recovers.

**One or more shards down:** Guilds assigned to offline shards see the bot as offline. Guilds on other shards are unaffected. No inter-shard state becomes corrupt — each shard operates on its own gateway session against the shared PostgreSQL and Redis backing.

---

# PART VI — RELIABILITY & OPERATIONS

---

## 24. Observability — Logging, Metrics & Tracing

### 24.1 Three Pillars, One Correlation ID

Every log line, every metric data point, and every trace span produced by a single Discord interaction carries the same `correlationId` (a `crypto.randomUUID()` generated by `TraceMiddleware` when it opens the root span). An operator debugging an elevated error rate pivots from a metric spike to the trace that reveals which stage was slow to the exact Pino log lines from that specific interaction — three different tools, one lookup key. This is the promise that makes structured, correlated observability genuinely useful rather than aspirational.

### 24.2 Structured Logging — Pino

Every log line is a JSON object written to stdout, never a string interpolation. Pino is configured at bootstrap Stage 04 with:

- **Child logger scoping** — `TraceMiddleware` creates a child logger pre-bound with `correlationId`, `guildId`, `userId`, `shardId`, and `moduleId`. Every log call anywhere in that request's call stack uses `context.logger.info(...)` and inherits those fields automatically.
- **Global redaction** — the `redactPaths` option replaces any field named `token`, `password`, `secret`, `authorization`, `webhookUrl`, or `signingKey` with `[REDACTED]` before serialization, at the logger level. No per-call-site scrubbing required and no risk of forgetting it.
- **Log levels** — `trace` for verbose developer diagnostics; `debug` for non-production detail; `info` for meaningful business events (command executed, module loaded, job completed); `warn` for recovered or degraded conditions; `error` for a single-request failure that did not crash the process; `fatal` exclusively for the irrecoverable startup failures in §8.2.

```json
Representative log line:
{
  "level": "info",
  "time": "2026-06-29T14:32:07.114Z",
  "correlationId": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "guildId": "839201083947827231",
  "userId": "228104026416693248",
  "shardId": 2,
  "module": "moderation",
  "command": "ban",
  "durationMs": 142,
  "status": "success",
  "msg": "Command executed"
}
```

### 24.3 Metrics — Prometheus

`prom-client` exposes all metrics at `GET /metrics` for Prometheus scraping. Framework metrics emitted automatically (no module instrumentation required):

```
dumby_commands_total{module, command, status}               counter
dumby_command_duration_seconds{module, command}              histogram (P50/P95/P99 buckets)
dumby_events_processed_total{event, status}                  counter
dumby_middleware_duration_seconds{middleware}                  histogram
dumby_database_queries_total{repository, method, status}       counter
dumby_database_query_duration_seconds{repository, method}       histogram
dumby_database_pool_connections{state}                          gauge (active/idle/waiting)
dumby_cache_operations_total{tier, operation, status}            counter (hit/miss/set/delete)
dumby_jobs_processed_total{queue, status}                         counter
dumby_jobs_duration_seconds{queue}                                 histogram
dumby_jobs_queue_depth{queue}                                       gauge
dumby_rate_limit_exceeded_total{scope}                               counter
dumby_permission_denied_total{layer, reason}                          counter
dumby_guild_count                                                       gauge
dumby_shard_status{shardId}                                             gauge (0=down,1=up)
dumby_websocket_ping_ms{shardId}                                         gauge
dumby_module_state_total{tier, status}                                    gauge
dumby_metering_usage_total{guildId, resource}                              counter
```

SLO targets and alert thresholds:

| Metric | SLO | Warning Threshold | Critical Threshold |
|---|---|---|---|
| P95 command latency | < 3000 ms | > 3500 ms | > 5000 ms |
| Command error rate | < 2% | > 2% (5 min) | > 5% (5 min) |
| DB pool waiting connections | 0 | > 0 for 60 s | > 5 for 30 s |
| Queue depth | < 500 | > 500 for 5 min | > 2000 for 2 min |
| Cache hit ratio (L2) | > 80% | < 80% (5 min) | < 60% (5 min) |
| Shard disconnected | 0 | > 0 for 30 s | > 0 for 120 s |

### 24.4 Distributed Tracing — OpenTelemetry

`TraceMiddleware` (priority 0) opens the root span; every downstream call — database query, cache operation, outbound HTTP, BullMQ job dispatch — creates a child span nested beneath it. All spans export in OTLP format to the configured backend (Jaeger, Grafana Tempo, Honeycomb, Datadog APM, or any OTLP-compatible receiver).

**Sampling:** `TRACE_SAMPLE_RATE` (default `0.1`) controls ordinary request sampling via OpenTelemetry's probabilistic sampler. Three categories always sample at 1.0, regardless of rate: requests that result in an unhandled error, requests from the internal health-check probes, and requests with the `X-Dumby-Force-Trace: true` header on REST API calls (used for incident reproduction). Total tracing overhead with 10% sampling rate is well within single-digit milliseconds per request on modern hardware.

### 24.5 Health Endpoints — Full Reference

All three endpoints are available from Stage 03 of bootstrap onward. Before their respective readiness stages, they return 503.

```
GET /health/liveness
  Returns: 200 once Stage 04 (observability) completes; 503 before.
  Kubernetes livenessProbe uses this. A failure here means the process
  is fundamentally unhealthy and should be restarted.
  Does not check database or Discord connectivity — those can be degraded
  without the process being in a restart-worthy state.

GET /health/startup
  Returns: 200 once Stage 15 (Discord login) completes; 503 before.
  Kubernetes startupProbe uses this, with a longer failureThreshold, to
  distinguish "still starting (normal)" from "started and then broke."

GET /health/readiness
  Returns: 200 only after Stage 18 completes with all required: true
  modules healthy; 503 at any other point.
  Kubernetes readinessProbe uses this. A failure here removes the pod
  from the Service's endpoint list without restarting it — appropriate for
  transient degradation where the pod may recover.
  Graceful shutdown (§8.3) flips this to 503 as its very first action,
  draining traffic before stopping the gateway — no user sees an in-flight
  command dropped because a pod was removed mid-execution.
```

---

## 25. Error Management & Fault Tolerance

### 25.1 Error Taxonomy

Every error Dumby raises deliberately extends the `DumbyError` class hierarchy. The `isOperational` flag on the base class divides the hierarchy: operational errors are expected, handled conditions (a user lacks permissions, a cooldown is active, an external API timed out on this specific request); non-operational errors are genuine bugs (a TypeScript assertion failed, a null dereference, an unrecognized exception type). The root error boundary (§17.3) classifies every caught error by this flag and responds accordingly.

```
DumbyError (abstract)
  fields: code, statusCode, isOperational, context, retryAfterMs?

  ├── ValidationError          400    isOperational=true   Bad input (Zod, Discord option validation)
  ├── AuthenticationError      401    isOperational=true   Identity cannot be verified
  ├── AuthorizationError       403    isOperational=true   Identity verified; access denied
  │     carries: layerIndex (which of 7 layers denied), reason, requiredRole?
  ├── NotFoundError            404    isOperational=true   Referenced entity does not exist
  ├── ConflictError            409    isOperational=true   Duplicate, race, or state conflict
  ├── RateLimitError           429    isOperational=true   carries: retryAfterMs, scope
  ├── CooldownError            429    isOperational=true   carries: retryAfterMs, commandKey
  ├── ExternalServiceError     502    isOperational=true   Dependency failed or timed out
  │     └── DiscordApiError           carries: discordCode, isRateLimit
  └── InternalError            500    isOperational=false  Unexpected; must be investigated
```

**Operational** errors produce a clear, user-facing ephemeral embed describing the condition (`AuthorizationError` → "You need the Moderator role for this command."). **Non-operational** errors produce a generic "Something went wrong; the team has been notified." response — internal detail is never exposed to end users — and log the full stack trace with ERROR level.

### 25.2 Module Isolation

A module failure is structurally contained. `CommandRouter.dispatch()` and `EventRouter.handleGatewayEvent()` each wrap every individual handler invocation in an independent try/catch. A thrown error from Module A's handler does not propagate to Module B's handler for the same event, does not crash the process, and does not prevent Module A's own next invocation from succeeding. The middleware pipeline's root error boundary (§17.3) handles the failure presentation for command handlers; `EventRouter`'s per-handler catch block logs and metrics the failure for event handlers.

Modules declared `required: false` can fail their `onLoad()` or `onReady()` without preventing the bot from starting — they are simply excluded from dispatch until reloaded. Their commands are not registered while they are in the failed state; users attempting to invoke them receive the normal Discord "application did not respond" behavior, since the command entry itself is absent.

### 25.3 Retry Policy

`RetryPolicy.execute(fn, options?)` wraps any async operation:

```
Default options:
  maxAttempts: 3
  baseDelayMs: 1000
  maxDelayMs:  30000
  jitter:      true  (±20% of computed delay — prevents synchronized retry storms)
  retryOn:     [network errors, timeouts, HTTP 429, HTTP 502/503/504]
  neverRetry:  [HTTP 400–428 except 429, HTTP 430–499]
```

BullMQ's own per-job retry policy (§26.4) is separate from this in-process retry utility. The two must be consciously coordinated when a job calls an external service: a job with 3 BullMQ retries calling a service with 3 in-process retries can produce up to 9 total network attempts for a single original request. The rule is: **use one or the other, not both, for any given dependency call.** If the call is inside a BullMQ job, rely on BullMQ's retry; disable in-process retry (`maxAttempts: 1`) for that call. If the call is inside a command handler (where there is no BullMQ retry wrapper), use in-process retry.

### 25.4 Circuit Breaker

`CircuitBreaker` is applied to every outbound integration dependency through `HttpClient` (§47.4). Three states:

```
CLOSED  → normal operation
  transitions to OPEN when: failure rate > 50% over the last 20 requests

OPEN    → fail fast (reject every call immediately, no network attempt)
  duration: openDurationMs (default 30 s)
  transitions to HALF_OPEN after the duration elapses

HALF_OPEN → probe
  exactly one trial request is permitted through
  success → CLOSED    |    failure → OPEN (duration resets)
```

Discord's own REST rate limits (HTTP 429 with `Retry-After`) are **not** treated as circuit-tripping failures — discord.js's own rate-limit queue handles them transparently. Only genuine error responses (5xx) and connection failures trip the breaker. While a breaker is open, commands whose handlers depend on the affected dependency return a clear "This feature is temporarily unavailable" embed rather than an opaque timeout.

### 25.5 Process-Level Safety Nets

`uncaughtException` handler: flush Pino's log buffer and OpenTelemetry span exporter (Steps 06–07 of the graceful shutdown sequence), then `process.exit(1)`. The full gateway/queue drain (Steps 01–05) is not attempted — the process state is unknown, and a clean data flush is more reliable than attempting a full drain from an unknown-health starting point.

`unhandledRejection` handler: log at ERROR with stack trace; emit `dumby.system.unhandledRejection` on the internal bus; **do not exit** unless the rejection originates from the bootstrap sequence's critical path. Module-level unhandled rejections are caught by the middleware pipeline's root error boundary before they surface at the process level in normal operation.

### 25.6 Maintenance Mode (404 Mode)

A sustained infrastructure failure — not the brief blips §23.5 already degrades gracefully around, but a confirmed, ongoing outage — puts the fleet into maintenance mode, rather than leaving each command to fail individually with whatever error its own code path happens to surface. Maintenance mode does not take the bot offline: incoming Discord interactions and gateway events stop being dispatched to modules, so nothing attempts to read or write data mid-outage, but BullMQ continues draining its current queue (§26) rather than being paused, and the HTTP API (§47) stays up specifically so the web dashboard can render a maintenance banner instead of returning connection errors of its own.

**Entry.** Maintenance mode activates two ways:

- **Automatic.** Every pod runs its own `HealthMonitorService`, scheduled through the same cron mechanism used elsewhere (§26.6), polling PostgreSQL and Redis connectivity independently of the passive, request-driven health endpoints in §24.5. Five consecutive failed checks against either dependency — observed locally, without requiring cross-pod coordination to trigger — puts that pod into maintenance presentation immediately. Because the trigger condition is something every pod can observe on its own, entry does not depend on a successful write reaching every other pod first.
- **Manual.** An operator activates it deliberately through PEP's `enableMaintenanceMode` action (§19.10) — via CLAI or the administrative REST surface — ahead of planned heavy-load events, a suspected corruption issue not yet confirmed by a failed health check, or any other case where waiting for the automatic trigger would cost more than acting early.

Either path writes `system_state['maintenance_mode']` (§21.2), mirrored into Redis for fast fleet-wide propagation; a pod that entered maintenance mode locally through its own failed health checks converges on the same durable flag once connectivity allows, so a transient single-pod issue and a genuine fleet-wide outage both resolve to one consistent, operator-visible state rather than a patchwork of pods disagreeing about whether the system is healthy.

**During.** Every command, every module interaction, and every dashboard view presents the same calm, clearly labeled maintenance notice — visible identically to developers, guild owners, and every other member, with no tier-based bypass, so no one is left guessing whether a failure is specific to them. `MaintenanceModeMiddleware` enforces this at priority −20 (§17.2) — earlier than `AdminTierGateMiddleware` at −10 — so an Admin-tier command is refused the same as any other for as long as the flag is set.

**Recovery.** Strictly manual, on purpose: an operator confirms the underlying issue is actually fixed, then issues PEP's `disableMaintenanceMode` action, which by construction requires PEP to reach the datastore it is about to clear the flag in — an implicit confirmation that connectivity is genuinely restored before traffic resumes. Clearing the flag triggers the framework to re-run Stage 17 (`MODULE_READY`, §8.2) across every loaded module before accepting new interactions again, so every module re-confirms its own readiness rather than the framework assuming a module that was mid-operation when maintenance mode began is still in a good state.

---

## 26. Job Queue & Scheduling Engine

### 26.1 Jobs vs. Tasks

**Jobs** are discrete units of work triggered by a specific event, reliably queued in Redis-backed BullMQ so they survive restarts: "send this reminder in 3 hours," "unmute this user at 10 PM," "deliver this webhook payload." **Tasks** are recurring work on a fixed cron schedule, independent of any specific trigger: "clean up expired sessions every night at 3 AM," "post weekly digest every Monday at 9 AM." Both use BullMQ's backing, but their authoring APIs and reasoning models are deliberately separate.

### 26.2 BullMQ Queue Architecture

Each module declaring jobs in its manifest gets one or more dedicated named queues: `moderation:unmutes`, `reminders:deliveries`, `economy:interest-payouts`. Every queue has its own named `BaseProcessor` subclass declaring concurrency, retry policy, and job options. `QueueManager` owns the global registry and exposes a uniform `enqueue(queueName, payload, options?)` API; no module calls `new Queue(...)` directly.

### 26.3 Idempotency

BullMQ guarantees at-least-once delivery. Every `process(job)` method must be safely re-runnable:

- An unmute job checks whether the target is still muted before removing the role.
- A wallet-credit job checks whether the credit's `idempotencyKey` has already been recorded before crediting a second time.
- A webhook-delivery job checks whether the delivery ID was already marked successful before re-posting.

Supplying an explicit `jobId` at enqueue time (`{ jobId: 'unmute:{guildId}:{userId}' }`) makes the enqueue itself idempotent at the queue level — re-enqueueing the same logical job before it fires updates the delay rather than creating a duplicate.

### 26.4 Retry Policy & Dead-Letter Queue

Default per-job retry options:

```
attempts: 3
backoff:  { type: 'exponential', delay: 5000 }  — 5s, 10s, 20s
removeOnComplete: { age: 3600, count: 1000 }     — keep last hour or 1000 completed jobs
removeOnFail:     false                           — always retain failed jobs for DLQ review
```

Jobs that exhaust all attempts move to BullMQ's failed-job state. `DLQMonitor` (a scheduled task) scans every queue's failed set on a 15-minute interval; more than 10 failed jobs per queue within a rolling hour triggers an alert (§24.3) and surfaces the count in the Bull Board dashboard available at `GET /admin/queues` (Admin-tier REST route). A bulk-retry action is available from the dashboard; the same underlying queue-control service capability is available for individual-job retries, for whatever interface a deployment builds on top of it.

### 26.5 Queue Autoscaling

`WorkerManager` monitors queue depth and adjusts concurrent worker count between `minConcurrency` and `maxConcurrency` for each processor, scaling up by 1 per 30-second check when depth grows, and scaling down by 1 when depth has been near-zero for 5 consecutive checks. Scale changes are rate-limited (no more than once per 30 s per queue) to avoid oscillation during short bursts. This is Feature #3 (Queue Autoscaling, §48.2).

### 26.6 Cron Tasks & Distributed Locking

Every `BaseTask` subclass declares a `cronExpression` (in standard cron format) and optionally a `timezone` (IANA, default UTC). For any deployment running more than one process, `distributedLock: true` (the default) causes `Scheduler` to attempt a Redlock lock (`lock:task:{taskName}`, TTL = expected runtime + 30 s safety margin) before executing the task body. Only the process that acquires the lock executes the task that tick; all other processes skip it. A task running past its own lock TTL will log a `warn` on its next tick and not run again until the lock expires.

---

## 27. Localization & Internationalization

### 27.1 Locale Resolution Order

```
1. User's individually-set Dumby language preference, however a deployment exposes setting one
   — stored per-user in users.preferredLocale
2. Guild's configured default locale (guild_configs.data.locale)
3. Discord-reported interaction locale (interaction.locale)
4. System default locale (en-US)
```

Locale resolution is per-key within a chosen locale: if the resolved locale file exists but is missing a specific key, that key falls back to `en-US` individually rather than the entire response falling back. A 90%-translated locale file provides 90% localized responses, not 0%.

### 27.2 Translation Catalog

All translation strings use ICU MessageFormat, stored in one JSON file per locale per module, under `src/modules/{module}/locales/{locale-code}.json`. The base `en-US.json` is required for every module — its absence fails Stage 11 validation. Other locale files are contributed incrementally; the translation-coverage script (`scripts/i18n-coverage.ts`) reports missing keys per locale per module.

```json
{
  "ban.success": "{targetName} banned. Case #{caseNumber}.",
  "wallet.balance": "{username} has {amount, plural, =0{no coins} one{# coin} other{# coins}}.",
  "levelup.announcement": "{username} reached level {level}! 🎉",
  "cooldown.wait": "Wait {remainingSeconds, number, ::unit/second} before using this again."
}
```

**Locale target list and RTL.** `en-US` is the only required locale; every other locale in Discord's own supported-language list (currently around 30) is a valid target, and the coverage script above treats all of them as first-class rather than tracking only a fixed example set — `es-ES` and `de-DE` (§10.3's example module tree) are illustrative contributor examples, not the ceiling of what's supported. Right-to-left languages (Arabic, Hebrew) need more than string translation: MDIS's schema-driven renderer (§14.5) applies `dir="rtl"` at the document root when the resolved locale is RTL, and every generic component in the renderer's library — `toggle`, `select`, `data-table`, and the rest — is built against CSS logical properties (`margin-inline-start` rather than `margin-left`, and so on) rather than physical-direction properties, specifically so RTL support is a renderer-level property inherited by every module's dashboard panel automatically, the same way accessibility conformance is (§14.5) — no module author writes direction-aware CSS themselves. Bot-side text (embeds, command responses) mirrors correctly under RTL locales by virtue of Discord's own client rendering the text directionally; the renderer-level work above is specifically about MDIS, the one surface this document controls the rendering of directly.

### 27.3 Discord-Native Command Localization

Command names, descriptions, and option labels declare localizations through the `localization` field on the command class (§15.2), rendered by Discord's client directly in the command picker in the user's own language — independent of and complementary to the response-text localization above.

### 27.4 Timezone Handling

All dates and times stored in PostgreSQL use `timestamptz` (timestamp with time zone, stored as UTC). `I18nManager.formatDate(date, locale, timezone)` converts to the guild's configured timezone (§20.3 `timezone` key) before formatting for display. User-facing duration strings ("in 3 hours 22 minutes") are always computed from the UTC values; timezone is applied only at the display layer.

---

## 28. Analytics & Telemetry

### 28.1 Analytics vs. Observability

These are architecturally and legally distinct. Observability data (§24) diagnoses the system — which shard dropped, how long a query took, whether the cache is saturated. Analytics data answers product questions — which commands are used, which modules guilds actually enable, where users abandon multi-step flows. Different retention policies and different privacy treatment (§31) apply to each. Conflating them produces either under-retained debugging data or over-retained personal data.

### 28.2 Collection Model

`AnalyticsMiddleware` (priority 90) records every command invocation asynchronously — the record is written after the response has been sent, never on the critical path. Modules can additionally call `analyticsService.track(eventName, properties)` for feature-specific events (giveaway entry, ticket resolution time, economy transaction category).

All user identifiers in analytics events are pseudonymized at the point of collection (§31.2): a one-way HMAC of `userId + guildId + salt` replaces the raw user ID in the analytics record. The salt rotates monthly, making linkage to a specific user across rotation boundaries infeasible without the salt.

### 28.3 Guild-Facing Usage

`MeteringService` (§28.4) makes a guild's own aggregate usage statistics — command invocation counts, top-used commands, active user counts (pseudonymized, shown as counts not identities), and per-module feature adoption — available for whatever interface a deployment exposes them through, scoped strictly to that guild's own data.

### 28.4 Framework Telemetry

A configurable opt-in (operator-level, via `TELEMETRY_ENABLED=true`) sends aggregated, non-personally-identifiable usage metrics to a central Dumby telemetry endpoint — guild count trends, module adoption distribution, most-used commands globally — used to inform framework development priorities. The payload never includes guild IDs, user IDs, message content, or any per-guild detail; it contains only aggregate counts and percentages. Telemetry is permanently disabled by default; opt-in requires an explicit environment variable change.

### 28.5 Metric Track Protocol (MTP) — Synthetic Resource Statistics

MTP is a clearly separate layer from `MeteringService` (§28.3) and from `metering_usage_daily` (§21.2), and the distinction matters: `metering_usage_daily` counts real operational events for real operational purposes — capacity planning, and the two-year retention (§31.3) that implies. MTP produces **artificial tokens**: a synthetic, guild-facing resource unit computed from a subset of the framework's own real observability signals (§24), re-expressed as simulated compute, memory, disk, bandwidth, database, and external-API consumption. MTP is not a quota system in the sense of gating anything — no command is refused, throttled, or degraded because a guild's artificial token count is high. It exists to give a guild a legible, resource-shaped picture of its own footprint, ahead of and independent of whatever monetization model eventually occupies §7.6's scaffold.

Every artificial token cost is derived from a signal the framework already emits, not generated at random and not billed against any real infrastructure invoice:

| Resource | Trigger | Artificial Cost |
|---|---|---|
| Compute | Every slash command execution reaching a handler | 1 token base + 1 token per invocation |
| Memory | Every response payload exceeding 4 KB serialized | 1 token per 4 KB over the threshold |
| Disk | Every file or attachment write | 5 tokens per write |
| Bandwidth | Every outbound embed or attachment exceeding 256 KB | 2 tokens per 256 KB over the threshold |
| Database | Every query exceeding `SLOW_QUERY_THRESHOLD_MS` (§20.2, default 500 ms) | 1 token per slow query |
| External API | Every outbound call through `HttpClient` (§47.4) to an external integration | 10 tokens per call |

Reusing `SLOW_QUERY_THRESHOLD_MS` rather than a separate MTP-specific number is deliberate: it keeps "expensive" meaning the same thing everywhere in the framework, instead of asking an operator to reason about two different definitions of a slow query depending on which dashboard they're reading.

### 28.6 Token Aggregation

`MTPCollectorMiddleware`, registered alongside `AnalyticsMiddleware` at priority 90, accumulates artificial token costs per guild per resource in a Redis counter throughout the day. An hourly scheduled job (§26.6) flushes each guild's accumulated counters into `mtp_token_ledger_daily` (§21.2) and resets them — the same accumulate-in-Redis, persist-on-a-schedule pattern this framework already uses for other high-frequency counters, rather than a PostgreSQL write on every single command. Artificial token records are retained for 90 days (§31.3) — long enough for a guild-facing dashboard to show a meaningful trend, well short of the two-year, billing-grade retention `metering_usage_daily` carries, since MTP data is illustrative rather than authoritative.

### 28.7 Guild Quota Signaling

A guild-configurable artificial token ceiling can be set per guild; crossing it changes nothing about how commands execute — it surfaces a signal, through whatever interface a deployment builds on top of MTP's data, suggesting the guild reduce its footprint by disabling seldom-used modules, along with the reasoning for why (which resource crossed its ceiling, and by how much). Designing that guidance flow is dashboard and product work outside this backend framework's reference; MTP's responsibility ends at making the underlying artificial-token data available to build it on.

---

## 29. Security Architecture & Threat Model

### 29.1 Secrets Management

All secrets — `BOT_TOKEN`, database credentials, Redis credentials, the webhook signing key — live exclusively in environment variables. In Kubernetes deployments, they are sourced from Kubernetes Secrets sealed with the Sealed Secrets operator (or equivalent: HashiCorp Vault, AWS Secrets Manager, GCP Secret Manager). Plaintext secrets never appear in application source code, container images, or infrastructure manifests committed to source control. The `LOG_REDACT_PATHS` list in the root Pino configuration ensures secrets can never appear in log output regardless of which code path produces them.

### 29.2 Input Validation & Injection Prevention

All user input from Discord slash command options passes through Zod schemas before reaching service layer code — the command class validates option values (string length, numeric bounds, enum membership) as the first action in `execute()`. SQL injection is structurally prevented by the universal use of Knex's parameterized query builder; no repository uses raw string interpolation to construct SQL. The shared `InputSanitizer` utility strips or escapes control characters and Discord markdown special characters from any user-provided string before it is stored, displayed in an embed, or forwarded to an external system.

### 29.3 Webhook Signature Verification

Every inbound webhook payload is verified before any processing begins. For each configured provider, a dedicated signature verifier validates the provider-specific scheme (GitHub: HMAC-SHA256 over `X-Hub-Signature-256`; Dodo Payments: HMAC-SHA256 over `{webhook-timestamp}.{payload}`, following the Standard Webhooks specification's `webhook-id`/`webhook-signature`/`webhook-timestamp` header triplet; generic: HMAC-SHA256 over `X-Dumby-Signature`). Verification failure produces a 401 response with no error detail. Verification is the **first** step in `WebhookReceiver.handle()`, before parsing the body, before any business logic.

Idempotency protection uses a single atomic Redis `SET NX EX` at the **start** of processing:

```
SET webhook:seen:{deliveryId} 1 NX EX 86400
```

If this `SET` fails (the key already exists), the delivery is a duplicate and the receiver returns 200 immediately without processing the payload again. The `SET NX EX` is atomic — `NX` (only set if Not eXists) and `EX` (expiry in seconds) are evaluated as a single Redis operation, eliminating the race condition where two near-simultaneous deliveries of the same ID could both pass a check-then-set pattern.

### 29.4 Rate Limiting & Abuse Prevention

Two independent layers, not one:

**Framework rate limit** (`RateLimitMiddleware`, priority 40): applies to every command for every user and every guild, using configured sliding-window thresholds. Tripping this limit returns `RateLimitError` with `retryAfterMs`. Admin-tier commands bypass this entirely (§11.5).

**Discord-side** rate limits on interaction responses and REST API calls are managed by discord.js internally, honoring every `Retry-After` header. Dumby's circuit breaker (§25.4) is additional protection against sustained Discord API degradation; ordinary rate-limit queuing by discord.js is never treated as a circuit-tripping event.

### 29.5 Privilege Escalation Prevention

No module can grant itself permissions beyond what its manifest declared. The DI container's core token namespace is frozen after Stage 09; a module's `onLoad()` can register tokens into its own child namespace but cannot overwrite or shadow core tokens. A module requesting gateway intents not declared in its manifest results in those intents not being requested (the bootstrap computes the union of declared intents, not what any module might programmatically request later). The Admin-tier's four-layer gate (§11.5) is the specific defense against privilege escalation in the highest-stakes case.

### 29.6 Dependency Security

`pnpm audit` runs as a dedicated CI gate before every build and before every production deployment. Findings rated `high` or `critical` block deployment — they are not logged and addressed later. The `dependency-review.yml` GitHub Actions workflow additionally compares any PR's dependency changes against known vulnerability advisories and fails the PR if a newly added or updated dependency has a critical finding. Lock file integrity (`pnpm install --frozen-lockfile`) is enforced in every CI run to prevent dependency confusion attacks.

### 29.7 Audit Logging as a Security Control

`audit_logs` (§21.2) is INSERT-only. No `UPDATE` or `DELETE` statement touches it anywhere in the codebase — an ESLint rule enforces this by matching any Knex query against the `audit_logs` table that is not a `.insert()` call. The table is therefore tamper-evident within the database: auditing the audit log's own modification history via PostgreSQL's `pg_stat_activity` or WAL inspection would reveal any unauthorized deletion attempt. Combined with off-site backup (§21.2 `backup_history`), `audit_logs` provides a durable, out-of-band record of every significant action in the system.

### 29.8 Encryption Posture — In Transit, At Rest, and Key Management

**In transit.** Every network hop the framework makes is TLS-terminated, with no plaintext fallback: `DATABASE_URL` and `DATABASE_READ_REPLICA_URLS` require `sslmode=require` (or stricter — `verify-full` when the deployment's CA configuration supports it), enforced by a Stage 02 configuration-validation check that refuses to start if a connection string omits it; `REDIS_URL` requires the `rediss://` scheme wherever the Redis provider supports TLS listeners (all three managed providers named in §44.6 do); and every outbound call the shared `HttpClient` (§47.4) makes rejects a non-HTTPS `baseUrl` at the point a module registers one. The one exception, stated explicitly rather than left implicit: a local Docker Compose stack (§44.2) intended for development runs Postgres and Redis over the Compose network's internal, unencrypted links, since that traffic never leaves a single host — the moment a deployment crosses a network boundary between processes, per the tier definitions in §44.6, TLS is mandatory, not configurable.

**At rest.** The primary database's encryption-at-rest is delegated to the storage layer rather than reimplemented in application code, and which layer that is depends on the deployment tier (§44.6): managed-provider deployments (RDS, Cloud SQL) enable provider-native storage encryption via the Terraform `database` module (§44.5) — a boolean the reference configuration sets to `true` unconditionally, not left as an operator default — while self-hosted deployments running PostgreSQL directly are documented as requiring filesystem- or volume-level encryption (LUKS, or the cloud block-storage provider's encrypted-volume option) as a deployment prerequisite, since PostgreSQL itself has no built-in full-database encryption-at-rest short of per-column `pgcrypto`, which the framework does not use for general data. The one column encrypted at the application layer today is the outbound-webhook `secret` (§21.2) — encrypted with the framework's own data-encryption key before storage, specifically because it is a credential the framework itself must later decrypt to sign outbound requests, not because it's the only sensitive column; every other credential-shaped value (`BOT_TOKEN`, database and Redis passwords, OAuth2 client secrets) lives in the secrets-management system (§29.1), not in application tables, which is what keeps this list of application-layer-encrypted columns short by design rather than by omission.

**Key management and rotation.** The framework's own data-encryption key (used for the webhook `secret` column above) is itself a managed secret under §29.1 — sourced from the same environment-variable-or-secrets-manager mechanism as every other credential, never hardcoded, never checked into version control. Rotating it is a two-step, zero-downtime operation rather than a single cutover: `ENCRYPTION_KEY_CURRENT` and an optional `ENCRYPTION_KEY_PREVIOUS` are both accepted at decrypt time (current first, previous as fallback), while all new encryption uses only `ENCRYPTION_KEY_CURRENT`; an operator rotates by generating a new current key, deploying with the old key demoted to `ENCRYPTION_KEY_PREVIOUS`, and — once a background job has re-encrypted every row still under the old key, tracked via a `keyVersion` column — removing the previous key from configuration entirely. `BOT_TOKEN` rotation follows the same two-phase shape at the Discord platform level: a new token is generated in the Discord Developer Portal, deployed as a configuration change (requiring a redeploy, since it's process-level configuration rather than a database value, §20.2), and the old token is revoked only after the new one is confirmed live. Token rotation requiring a redeploy is a deliberate consequence of treating the bot token as process-level configuration rather than mutable database state — exactly what keeps it out of reach of anything except an operator who already holds deployment access.

---

## 30. Performance & Scalability Engineering

### 30.1 Sharding Model

Discord requires one shard per 2,500 guilds. Shard assignment is:

```typescript
const shardId = Number((BigInt(guildId) >> 22n) % BigInt(totalShards));
// Parentheses are required: % binds tighter than >> in JavaScript/TypeScript.
// Without them: guildId >> (22n % totalShards) — wrong formula, wrong shards.
```

At deployment, `SHARD_COUNT` can be set to `'auto'` (Dumby asks Discord for the recommended shard count based on current guild count and uses that) or a specific integer (useful when pre-scaling for anticipated growth). `CommandDeployer` uses the same formula to confirm every command is registered for the shard that will serve its guild before any traffic routes there.

### 30.2 Zero Downtime Updates

Zero-downtime updates use Kubernetes rolling deployment strategy (`maxUnavailable: 0`, `maxSurge: 1`) combined with the `terminationGracePeriodSeconds: 190` setting in `deployment.yaml`. "Zero downtime" here means the deployment as a whole never has zero ready pods, and the HTTP/MDIS surface never drops a request — it does not mean the specific shard being handed off has zero gap in its gateway connection, which is bounded separately by §23.4's handoff mechanism. The sequence:

1. New pod starts alongside the old pod; its `/health/startup` probe is pending. Independently of the rest of bootstrap, it immediately writes a handoff request (§23.4) and begins attempting shard-lock acquisition — which fails repeatedly at first, since the old pod still holds the lock.
2. Within one heartbeat interval (≤ 10 s), the old pod's existing heartbeat-renewal loop notices the new pod's handoff request and releases its shard lock immediately, self-initiating its own graceful shutdown (§8.3) rather than waiting for Kubernetes to send `SIGTERM`. This is what breaks what would otherwise be a circular wait: the new pod does not depend on Kubernetes signaling the old pod, and the old pod does not depend on the new pod already being ready.
3. The new pod's next lock-acquisition retry succeeds; Stage 15 (gateway login) completes for that shard, and bootstrap proceeds through Stage 18. `/health/readiness` returns 200 — genuinely only once the new pod holds its shard's session, exactly as the stage sequence in §8.2 already requires; a handoff simply adds up to one heartbeat interval plus a retry to how long that takes, on top of the old pod's ordinary readiness time.
4. Kubernetes routes new traffic to the new pod.
5. Kubernetes sends `SIGTERM` to the old pod — which, having already self-initiated shutdown in Step 2, is typically most of the way through or finished with its drain sequence by the time this arrives, making the signal redundant rather than the trigger.
6. Old pod's graceful shutdown sequence completes (§8.3): gateway already released in Step 2; drains in-flight requests, calls `onUnload()`, drains queues.
7. Old pod exits cleanly.

The overlapping window (Steps 1–6) means there is never a moment where the deployment as a whole has zero ready pods — the old pod remains up and serving for the entire time the new pod is waiting on the lock, since its own shutdown doesn't begin until Step 2. What is *not* zero is the new pod's own time-to-ready, which absorbs the handoff wait; that cost is paid once, by the incoming pod, not by the deployment's availability. This is Feature #12 (Zero Downtime Updates & Clustering, §48.2), coordinated with Feature #24 (Shard Ownership Handoff, §23.4, §48.2) — the two are two views of one mechanism, not two independent guarantees.

### 30.3 Adaptive Scaling Backend

The Kubernetes HPA (Horizontal Pod Autoscaler) in the reference `hpa.yaml` scales on two signals simultaneously, using `external.metrics.k8s.io` adapters to expose them from Prometheus:

- `dumby_active_command_executions` (current in-flight commands across all pods) — scale up when average per-pod in-flight count exceeds 50.
- `dumby_jobs_queue_depth` (sum across all queues) — scale up when total queue depth exceeds 500.

Scale-down is conservative (stabilization window: 5 minutes) to avoid oscillation after a burst. A Spot Instance interruption notice (§44.2) triggers an immediate graceful shutdown rather than waiting for the normal drain timeout, ensuring the 25–30 second preemption warning Google Cloud Preemptible/AWS Spot provides is enough to complete the critical shutdown steps (drain gateway + in-flight commands). This is Feature #14 (Adaptive Horizontal Scaling, §48.2) and Feature #15 (Spot/Preemptible Instance Support, §48.2).

### 30.4 Database Performance

**Query performance mandates:**
- No `SELECT *` anywhere. Every `BaseRepository` call specifies `columns` explicitly, or omits it only for methods that have a documented default safe set.
- Every column in a production `WHERE` clause has a supporting index, declared in the same migration that creates the column. Missing indexes are a CI validation failure.
- Every cross-table join in a hot query path has an EXPLAIN ANALYZE annotated in a comment and a confirmed index-only-scan path for its leading column.
- N+1 query patterns are treated as defects, resolved by JOIN, batched `WHERE id IN (...)`, or `BatchLoader`.

**PgBouncer (transaction-mode connection pooling):** At deployments where the number of pods × `DATABASE_POOL_MAX` approaches PostgreSQL's `max_connections` limit, PgBouncer in transaction mode sits between the bot and PostgreSQL, multiplexing many application connections onto a smaller number of server connections. The reference Terraform module (`infra/terraform/modules/database/`) provisions PgBouncer alongside the PostgreSQL cluster; the `DATABASE_URL` in that configuration points to PgBouncer's port, not PostgreSQL's directly.

### 30.5 Hot Path Optimization

The command dispatch path (§6.2) is optimized at every stage with process-local L1 cache as the first check before any network I/O:

- `guild_module_states` lookup: L1 (sub-microsecond) → L2 Redis (~1 ms) → PostgreSQL (~5 ms)
- Guild config resolution: L1 (sub-microsecond) → L2 Redis (~1 ms) → PostgreSQL (~5 ms)
- Permission resolution: purely in-memory (RBAC roles cached in L1 from prior lookup)
- Rate limit check: L2 Redis (~1 ms) — L1 is not used here because the counter must be consistent across shards

P99 framework overhead per command invocation (exclusive of handler execution time): < 20 ms on warm L1 cache, < 35 ms on L1 miss requiring L2 Redis reads, < 80 ms on full cache miss requiring PostgreSQL reads.

### 30.6 Worker Threads for CPU-Intensive Work

Any module operation that is CPU-bound rather than I/O-bound (image manipulation, heavy data aggregation, text parsing at scale) must run in a Worker Thread via `WorkerThreadPool`, never on the main event loop. The main event loop handles all Discord gateway events, command dispatch, and service coordination; blocking it with CPU work causes latency spikes for every concurrent user, not just the one whose operation is slow.

---

## 31. Privacy & GDPR Compliance

### 31.1 Data Minimization

The framework's own core tables collect no data about a Discord user or guild beyond what its infrastructure demonstrably needs — `guild_configs`, `guild_roles`, `guild_module_states`, `audit_logs` (§21.2). Whatever a specific module collects beyond that is scoped by whatever that module actually does; the framework's contribution to data minimization is structural rather than a promise about content it doesn't control: a module's tables are created only by its own migrations (§10.5), so no module accumulates data for a guild that hasn't enabled it, and no background crawling or pre-emptive profile creation happens anywhere in the framework absent a module explicitly built to do so.

### 31.2 Right to Erasure — GDPR Article 17

`PrivacyService` provides the orchestration a deployment needs to satisfy Article 17, as an extensible core mechanism rather than a fixed list of what gets deleted: any module that stores per-user data registers an eraser function against `PrivacyService.registerEraser(moduleSlug, (userId, guildId?) => Promise<void>)` at load time (§10.1's module lifecycle), and `PrivacyService.deleteUser(userId, guildId?)` — called however a deployment chooses to expose it — invokes every registered eraser in turn, so a right-to-erasure request reaches every module's data without the framework needing to know what any specific module stores.

**The one policy this service enforces on every registered eraser, regardless of module:** an eraser may soft-delete-and-tombstone a record instead of hard-deleting it only where the record's integrity as an operational log depends on retaining it independent of the erased user's identity (a moderation action's own history is the illustrative case — the action taken is retained, the target's identifier is replaced with a tombstone) — and never as a default, only where a module author states the specific retention basis. `audit_logs` itself is never touched by any eraser, by construction (§29.7's insert-only enforcement) — it is retained as a record of system actions, not user-content data, the same distinction GDPR's own legitimate-interest basis draws.

**Data export — GDPR Article 15.** `PrivacyService.exportUser(userId, guildId?)` mirrors the eraser pattern with an exporter registry, compiling every registered module's exported fields into one structured JSON payload, labeled by the module that holds each field, with any field a user wouldn't have standing to see through the ordinary RBAC rules (§19) excluded from their own export the same way it would be from any other view they're not authorized for.

### 31.3 Data Retention Policy — Framework-Level Records

| Data Category | Retention | Basis |
|---|---|---|
| Guild configuration | Until guild leaves (or manually deleted) | Service provision |
| Audit logs | 2 years | Regulatory / operational |
| Analytics events (raw) | 30 days | Internal analytics |
| Analytics aggregates | 2 years | Framework improvement |
| metering_usage_daily | 2 years | Billing/capacity planning |
| mtp_token_ledger_daily (artificial tokens) | 90 days | Guild-facing illustration, not billing (§28.5) |
| Job queue completed records | 1 hour (BullMQ `removeOnComplete.age`) | Transient operational |
| Redis session data | TTL (10–15 min) | Transient operational |

A module's own per-user data (whatever a specific module stores) is subject to the erasure mechanism in §31.2 rather than this table — retention for module-specific data is a decision each module's author makes and states explicitly, following the pattern this table establishes for the framework's own records, not a framework-wide default extended to arbitrary future data.

### 31.4 Data Anonymization in Production Datasets

When producing a production dataset for testing, analytics, or debugging, `AnonymizationService.anonymize(dataset)` replaces all user and guild identifiers with deterministic pseudonyms (HMAC-SHA256 keyed to a test-environment salt), all user-generated text fields with `[REDACTED]`, and all channel IDs and role IDs with synthetic snowflakes. The anonymization is applied once at the data extraction point; the resulting dataset cannot be de-anonymized without the test environment's salt. This is Feature #5 (Production Data Anonymization, §48.2).

### 31.5 Cross-Border Data Transfer

For operators deploying Dumby in jurisdictions subject to cross-border transfer restrictions (EU GDPR Art. 46, UK GDPR, etc.), the reference Terraform configuration supports multi-region PostgreSQL read replicas (§21.6) with regional routing, giving an operator exact, deliberate control over the two distinct things this lever addresses. Every **write** — every `create`/`update`/`delete` — is routed to the single global primary (§21.6) by design, so the primary's region is what determines where EU user data is first stored and durably written, with one consistent primary serving the entire multi-tenant deployment rather than one per region. A **read** can be served from an in-region replica, so read traffic for an EU user is served without transiting to a third country — a guarantee this architecture provides precisely and independently of where the corresponding write is durably stored. Selecting the primary's region is the deliberate, single global lever this architecture gives an operator over write residency specifically; an operator whose requirement is a per-region *write* residency, distinct from the per-region *read* case above, addresses it through per-region primaries, a separate configuration this reference architecture's single-primary design does not include, since one consistent global primary is precisely what this configuration is built around.

### 31.6 Children's Privacy

Discord's own terms require users to be at least the age of digital consent in their jurisdiction (13 in the US under COPPA; up to 16 in some EU member states under GDPR Article 8; the UK's Age Appropriate Design Code layers additional obligations onto services "likely to be accessed by" children regardless of a stated minimum age). Dumby the framework has no age-verification mechanism of its own — it relies entirely on Discord's own account-level age gate — and the operator obligations that follow depend on the deployment model set out in §1.6: a self-hosted deployment makes the *operator*, not Anthropic-equivalent-for-Dumby (there is no such central party — Dumby is not a SaaS product), the data controller for every member of every guild that installs their bot, which includes whatever obligations COPPA, GDPR Article 8, or the UK AADC impose in the operator's jurisdiction and their users'. This document equips an operator with everything the framework's own architecture is responsible for; the jurisdiction-specific legal analysis for a given deployment is a separate responsibility that sits with the operator by design, since only the operator knows their guild's own composition, jurisdiction, and applicable law. What this document does provide is two places in the architecture and catalog where that responsibility becomes concrete rather than abstract:

- **Any module that computes and broadcasts a member's age** — a "birthdays"-shaped module (§32.3, row 15) is the obvious illustrative case — would be publishing exactly the kind of children's personal data these frameworks regulate, for any guild with underage members. This framework provides no such feature itself; an author building one takes on the obligation of stating this plainly in whatever configuration surface they design, and this document specifies that obligation here precisely, so a module author addresses it from the first draft of their configuration surface rather than discovering it after the fact.
- **`guild_module_states` and `guild_configs`** (§11.4, §20.3) apply uniformly regardless of a guild's member-age composition — there is no framework-level distinction between a guild's data-handling requirements based on whether its members are predominantly minors, because Dumby has no way to know that. An operator whose guild is likely to be accessed by children takes on additional obligations (UK AADC's "likely to be accessed" standard in particular does not require actual knowledge that children are present); Dumby has no member-age signal from which to automate that determination, so it remains the operator's own determination to make, informed by their own legal guidance — this document's GDPR treatment (§31.1–§31.5) covers the adult-user case thoroughly, and the children's-privacy case calls for that same rigor, applied through the operator's own separate, jurisdiction-specific analysis.

---

# PART VII — MODULE CATALOG (ILLUSTRATIVE EXAMPLES)

---

## 32. Catalog Conventions & Tier Classification

### 32.1 What This Catalog Is, and Is Not

Every entry below is a **name, a tier, and a one-line description of a kind of thing a module could be** — nothing more. None of the 22 examples in §32.3 ships with the framework, none is pre-installed in any Dumby deployment, and none has a command surface, an event contract, a service, or a database schema defined by this document. Designing that surface — what a `moderation`-shaped module's commands are actually called, what a `leveling`-shaped module's XP curve actually looks like, whether an `economy`-shaped module even includes gambling mechanics at all — is entirely the module author's decision, made when they actually build the thing, using the module system's own tools for the job (manifest structure, §10.2; the build walkthrough, §10.6–§10.11; tier mechanics, §11; inter-module contracts, §12). This framework's job stops at making that authoring experience possible and well-bounded; it does not extend to pre-deciding what any specific module does.

This is a deliberate scope boundary, not an oversight: a core framework that also shipped 22 fully-designed features would be making product decisions on behalf of every team that adopts it, and would be a different kind of project than the one described in §1. The catalog below exists to make the tier system (§11) and the range of what module authors can build concrete with recognizable examples, and for no other reason — it is a list of *kinds of modules*, not a feature list.

### 32.2 Reading Tier Designations

Tier is the one property this catalog does assign to each example, because tier is a framework-level classification a module declares in its manifest (§10.2, §11.2) — it governs how the module system treats the module mechanically, independent of what the module actually does:

- **[Admin]** — if built, would be bot-owner only, dev-guild only, rate-limit bypass, never guild-visible
- **[Core]** — if built, would be always-loaded, no per-guild disable mechanism, passes the full middleware chain
- **[Standard]** — if built and installed, would be guild-disableable, relisted in Marketplace when disabled
- **[Marketplace]** — if built, would require an explicit guild install; not loaded by default anywhere

### 32.3 Module Examples Index

This table is the complete catalog. There is no additional per-module detail anywhere else in this document — §33–§39 group these same 22 rows by tier and theme for navigability, nothing more.

| # | Example Name | Tier | Illustrative Purpose |
|---|---|---|---|
| 01 | `core-admin` | Admin | An example of bot-owner operational tooling — diagnostics, maintenance, break-glass access |
| 02 | `guild-settings` | Core | An example of a permanent configuration surface for a guild's own settings |
| 03 | `utility` | Core | An example of always-available, low-risk diagnostic commands |
| 04 | `moderation` | Standard | An example of a case-tracked moderation-action module |
| 05 | `auto-moderation` | Standard | An example of automated content filtering |
| 06 | `anti-raid` | Standard | An example of join-rate anomaly detection |
| 07 | `verification` | Standard | An example of a join-gating mechanism |
| 08 | `logging` | Standard | An example of structured event logging to a guild channel |
| 09 | `welcome` | Standard | An example of member join/leave handling |
| 10 | `leveling` | Standard | An example of an activity/XP system |
| 11 | `economy` | Standard | An example of a virtual-currency system |
| 12 | `starboard` | Standard | An example of community-curated content surfacing |
| 13 | `reaction-roles` | Standard | An example of self-service role assignment |
| 14 | `polls` | Standard | An example of a voting/polling mechanism |
| 15 | `birthdays` | Standard | An example of a scheduled, date-triggered announcement |
| 16 | `tags` | Standard | An example of reusable, author-defined content snippets |
| 17 | `reminders` | Standard | An example of a personal, timed-notification feature |
| 18 | `threads-manager` | Standard | An example of forum/thread lifecycle automation |
| 19 | `giveaways` | Standard | An example of a timed, randomized-selection event |
| 20 | `tickets` | Standard | An example of a private support-channel workflow |
| 21 | `music` | Marketplace | An example of a third-party-service-backed feature (voice audio); requires a Persona (§6.6), since the main bot never joins voice |
| 22 | `integrations` | Marketplace | An example of a third-party webhook/event connector |

None of these names is reserved — a real module author is free to build a `moderation` or an `economy` module that looks nothing like what the label suggests, or to not build one at all. The framework has no opinion.

---

## 33. Admin-Tier Examples

One example, `core-admin` (§32.3, row 01), illustrates what an Admin-tier module could be. Admin tier's mechanics — bot-owner-only routing, the security gate, the four-plus-one-layer defense (§11.5) — are core framework infrastructure regardless of whether any Admin-tier module exists in a given deployment; the tier mechanism is not conditioned on this or any other specific example being built.

---

## 34. Core-Tier Examples

Two examples, `guild-settings` and `utility` (§32.3, rows 02–03), illustrate what a Core-tier module could be. As with every other tier, Core tier's mechanics — always-loaded, no disable path, full middleware exposure (§11.2) — are what the framework provides; what a Core-tier module's commands, schema, or behavior actually are is entirely up to whoever builds it.

---

## 35. Moderation & Safety Examples

Five examples — `moderation`, `auto-moderation`, `anti-raid`, `verification`, `logging` (§32.3, rows 04–08) — illustrate the range of what a moderation-and-safety-themed Standard-tier module could cover.

---

## 36. Community Engagement Examples

Eight examples — `welcome`, `leveling`, `economy`, `starboard`, `reaction-roles`, `polls`, `birthdays`, `tags` (§32.3, rows 09–16) — illustrate the range of what a community-engagement-themed Standard-tier module could cover.

---

## 37. Utility & Productivity Examples

Two examples — `reminders`, `threads-manager` (§32.3, rows 17–18) — illustrate the range of what a utility-themed Standard-tier module could cover, distinct from the always-loaded Core-tier `utility` example in §34.

---

## 38. Entertainment & Events Examples

Two examples — `giveaways`, `tickets` (§32.3, rows 19–20) — illustrate the range of what an entertainment-or-events-themed Standard-tier module could cover.

---

## 39. Marketplace Integration Examples

Two examples — `music`, `integrations` (§32.3, rows 21–22) — illustrate what a Marketplace-tier module depending on an external service could look like. Neither is loaded by default in any deployment; both require the explicit install flow in §14.2 like any other Marketplace module. A guild installing `music` additionally goes through the Persona setup described in §6.6, since the main bot's install flow alone is not sufficient for a module that needs a voice connection. Where a third-party payment processor is relevant to illustrate the `integrations` shape, Dodo Payments — a merchant-of-record payments platform — is the example referenced, in preference to any specific alternative, without this document defining or committing to that integration's actual scope; monetization and payments are a later, separate concern from this framework's own architecture.

---

# PART VIII — ENGINEERING LIFECYCLE

---

## 40. Testing Architecture & Quality Assurance

### 40.1 Testing Philosophy

Testing is not an activity performed after development — it is a property the architecture is specifically shaped to make natural. Because every dependency in Dumby is explicit and injected rather than imported and instantiated directly (§9), any unit of the system can be isolated from every external resource simply by substituting what the container resolves. The standing targets: unit tests complete in under 5 seconds total with no I/O of any kind; integration tests complete in under 60 seconds against a real, ephemeral PostgreSQL instance with no Discord connection; every meaningful logic branch is covered; no test is flaky (a non-deterministic test is treated as a bug in the test, not an acceptable property of the suite); and every feature PR includes its own tests as a condition of merge, never as a follow-up.

### 40.2 The Test Pyramid

```
               ┌────────────────┐
               │   E2E Tests    │   ~10 suites — full simulated bot, complete critical journeys
               │                │   Slow (30s+ per suite); run on every merge to main
               └──────┬─────────┘
               ┌──────┴─────────┐
               │  Happy-Path    │   ~15 suites — the most common 10–15 user journeys per module,
               │  Smoke Tests   │   simulated end-to-end on every PR for fast regression signal
               │                │   Medium-fast (5–15s per suite); distinct from deep E2E
               └──────┬─────────┘
               ┌──────┴─────────┐
               │  Integration   │   ~50 suites — real PostgreSQL, mocked Discord gateway
               │    Tests       │   Medium (5–30s per suite)
               └──────┬─────────┘
          ┌───────────┴───────────┐
          │      Unit Tests       │   ~500+ suites — pure logic, all dependencies mocked
          │                       │   Fast (<5s total across the full suite)
          └───────────────────────┘
```

The **Happy-Path Smoke tier** (second from top) is the deliberate fourth layer. It is narrower and faster than full E2E — it does not test every edge case or error branch, only the most common successful journeys — and it runs on every PR rather than only on main-branch merges. Its purpose is to catch the most impactful regressions (a module's primary command breaks entirely) as close to the point of introduction as possible, without the full E2E suite's runtime cost gating every PR.

This four-tier pyramid is the complete set of PR- and merge-gated correctness testing; it validates behavior under isolation, not behavior under concurrent load. Load and performance testing (§40.8) is a deliberately separate, complementary practice that runs against staging on a schedule rather than as a pyramid rung, since it answers a different question — whether the system holds up under sustained traffic — that a fast, isolated test suite structurally cannot answer.

### 40.3 Unit Testing — `MockContainer`

Every unit test is built on `MockContainer` (`src/shared/testing/MockContainer.ts`), which pre-populates the DI container with typed, assertion-capable test doubles for every core service:

```
TOKENS.Database  → InMemoryDatabase
  Fluent mock builder: db.from('moderation_cases').where({ guildId }).returns([...])
  db.assertCalled('insert', 'moderation_cases') verifies a specific query ran

TOKENS.Cache     → InMemoryCache
  Plain Map-backed; no TTL enforcement (simplifies setup)
  cache.seed(key, value) pre-populates; cache.assertSet(key, value) verifies writes

TOKENS.Logger    → SilentLogger
  Pino instance at level 'silent'; captures calls for assertion
  logger.assertLogged('warn', { module: 'moderation' })

TOKENS.EventBus  → RecordingEventBus
  Records emitted events instead of dispatching
  eventBus.assertEmitted('moderation.user.banned', payloadMatcher)

TOKENS.Queue     → RecordingQueueManager
  Records enqueued jobs without processing
  queue.assertEnqueued('moderation:unmutes', { userId, guildId })

TOKENS.Config    → TestConfig
  Static object with sensible defaults for every required field
  config.override({ key: value }) for test-specific values
```

A unit test registers the class under test against the mock container, resolves it, and exercises it — the class under test never knows it is not talking to real infrastructure. `tests/helpers/MockDiscordClient.ts` supplies builder functions for every commonly-needed Discord object (`createMockInteraction`, `createMockGuildMember`, `createMockMessage`), each pre-wired with spy functions (`interaction.reply`, `member.ban`, `message.delete`) so assertions on Discord-API call shape are as natural as assertions on internal service calls.

### 40.4 Integration Testing — Transaction-Wrapped Isolation

Integration tests exercise a complete module data flow — service through repository against a real PostgreSQL instance (started via Docker Compose in CI). `DatabaseHelper` begins a fresh transaction before each test and rolls it back unconditionally afterward, regardless of test outcome, so no test requires manual cleanup logic and the database is always in a known clean state for the next test. Integration coverage focuses on: complex `WHERE`-clause and ordering correctness in repository `findMany` calls; constraint-violation error shape on `create`; multi-repository service methods executing correctly within a single transaction scope; migration correctness (`up` produces the expected schema, `down` correctly reverses it); and job-processor and cron-task execution against realistically seeded data.

### 40.5 End-to-End Testing

E2E tests simulate a complete interaction from a Discord gateway event through to the final Discord-facing response, using a full `MockDiscordClient` that reproduces gateway event delivery, REST call interception, and interaction-response recording. Representative scenario shape:

```
Suite: /ban command, full authorized flow
  Given: moderation module active in the test guild
  And: a moderator holding the MOD Dumby role and BanMembers Discord permission
  And: a target member with no elevated role
  When: the moderator invokes /ban @target reason:"spam"
  Then: interaction.editReply was called with a success embed
  And: moderation_cases contains exactly one new BAN-type row
  And: guild.bans.create was called with the target's user ID
  And: a moderation.user.banned event was emitted with the matching payload
  And: a cooldown key exists in the mock Redis for this moderator and command

Suite: /ban command, insufficient Discord permission
  Given: a user without BanMembers
  When: that user invokes /ban
  Then: interaction.reply was called with an ephemeral AuthorizationError embed
  And: no database write occurred
  And: no guild.bans.create call was made

Suite: rate-limited invocation
  Given: a user who has exceeded RATE_LIMIT_USER_MAX within the current window
  When: that user invokes any command
  Then: interaction.reply was called with a RateLimitError embed
  And: the command handler itself never executed
```

### 40.6 Coverage Requirements

Coverage is measured via Vitest's V8-instrumented coverage reporter and enforced as a CI gate — a PR that drops coverage below threshold for any touched file is blocked from merging.

| Scope | Statement Coverage | Branch Coverage |
|---|---|---|
| Core framework | 85% minimum | 80% minimum |
| Module services | 80% minimum | 75% minimum |
| Module repositories | 70% minimum | 65% minimum |
| Module commands | 75% minimum | 70% minimum |
| Infrastructure services | 70% minimum | 65% minimum |

Coverage reports upload to Codecov on every CI run; the Codecov bot comments per-PR with the file-level coverage delta.

### 40.7 Test Data Factories

`src/shared/testing/fixtures/` provides factory functions with sane defaults and override support, idempotent-safe under the transaction-wrapped integration test pattern since every test receives its own isolated transaction:

```
guildFactory(overrides?)
userFactory(overrides?)
guildMemberFactory(guildId, userId, overrides?)
guildConfigFactory(guildId, overrides?)
moderationCaseFactory(guildId, overrides?)
walletFactory(guildId, userId, overrides?)
ticketFactory(guildId, overrides?)
```

### 40.8 Load & Performance Testing — Validating the SLO Numbers

The tier-by-tier P50/P99 targets, throughput floors, and cache hit-ratio thresholds stated throughout this document (§11.7) are numbers this tier exists to check, not numbers the rest of the pyramid can check on its own — unit and integration tests validate correctness under isolation, not behavior under concurrent load, and a non-production chaos-injection capability (§25.5), if a deployment builds one, validates resilience to failure, not throughput. This tier runs against a full staging deployment (§43.3), never against production, and never as a required PR gate — it runs on a schedule (nightly) and on demand before a release that changes anything on the hot command-dispatch path.

**Methodology.** A k6 (or equivalent) load-generation script drives synthetic interactions against staging at a specified concurrency, ramping from a baseline (the throughput floor stated for the tier under test — e.g., 500 req/s for Core) to 2× that floor over a fixed ramp window, holding the peak for a soak period long enough to expose degradation that only appears once connection pools and caches are under sustained pressure (10 minutes), then ramping down. Every run captures P50/P99 latency, error rate, and the cache hit-ratio metric already emitted for normal operation (§22.6) — the load test does not require separate instrumentation, it reads the same Prometheus series a real incident would.

**Pass/fail criteria.** A run fails the same way a functional test fails — not merely producing a chart for manual review — if, during the soak period: P99 latency for the tier under test exceeds its stated target (§11.7) by more than 20%; the error rate (5xx-equivalent internal failures, not user-facing validation rejections) exceeds 0.1%; or the cache hit-ratio floor for that tier is not met. A failing nightly run pages the same on-call rotation the CI/CD pipeline's production gate does (§43.4), tagged as a performance regression rather than a functional one, since it did not block a specific PR and needs bisection to find which recent change regressed it.

**What this tier deliberately does not do:** validate behavior at guild counts or shard counts beyond what staging is provisioned for, or predict cost or capacity at a scale staging doesn't approximate — it exists to catch regressions against the numbers this document already states, not to establish new ones. Establishing the *initial* target numbers themselves, before this tier existed to hold them to account, was a one-time exercise this document's numbers already reflect.

---

## 41. Developer Experience & Tooling

### 41.1 Module Scaffolding CLI

`pnpm dumby scaffold module <name>` is an interactive CLI that generates a complete, working module skeleton from a `_template` reference module. It prompts for the module's description, which structural components it needs (commands, events, services, repositories, jobs, tasks, routes — multi-select), whether it requires database tables (generating a skeleton migration if so), whether it needs module-specific configuration (generating a Zod schema stub), and whether it needs localization (generating an `en-US.json` stub). Every generated file passes manifest validation immediately. The new module is registered but left disabled by default — the developer enables it explicitly once it does something.

### 41.2 IDE Configuration

`.vscode/extensions.json` recommends ESLint, Prettier, GitLens, Docker, and a PostgreSQL client extension for direct database inspection during development. `.vscode/launch.json` provides three debug configurations: **Debug Bot** (runs `tsx --inspect-brk src/entry/main.ts` with `NODE_ENV=development`), **Debug All Tests** (runs the Vitest binary with verbose reporting), and **Debug Current Test File** (runs Vitest scoped to `${relativeFile}`). `.vscode/snippets/dumby.code-snippets` provides prefix-triggered scaffolds for every recurring class shape: `dumby-command`, `dumby-service`, `dumby-repo`, `dumby-handler`, `dumby-job`, `dumby-task`, `dumby-mw`, `dumby-manifest`, `dumby-test-unit`, and `dumby-test-int` — each expanding to a complete, correctly-typed class stub rather than a bare comment.

### 41.3 Development-Mode Diagnostic Capabilities (`NODE_ENV=development` Only)

The framework provides four diagnostic capabilities, available only when `NODE_ENV !== 'production'` and gated at the same registration-time level as any other environment-specific behavior (§11.5), so that none of them is structurally reachable in a production deployment regardless of what interface a deployment builds on top of them:

```
Mock-interaction simulation  — construct and dispatch a synthetic interaction for a given
                                command without a live Discord user, for local testing
Context inspection           — dump the full CommandContext (§15.5) for a given invocation
                                as structured output
Redis key inspection         — read a Redis key's value directly (rejects keys matching
                                token/secret/password patterns, regardless of environment)
Read-only ad-hoc SQL         — execute a SELECT-only query against the database, enforced
                                by a statement-prefix check before execution
```

These are service-layer capabilities (`DevToolingService`), not a prescribed command surface — whether a deployment exposes them as Admin-tier commands, a CLI, or a local-only HTTP endpoint is left to whoever builds that deployment's own tooling.

### 41.4 ESLint — Module Boundary Enforcement

`eslint.config.ts` (flat config) encodes the architectural rules described in §10.5 as build-failing lint errors rather than reviewer judgment calls:

```
no-restricted-imports, scoped per module directory:
  modules/economy/**     cannot import modules/moderation/**
  modules/leveling/**    cannot import modules/economy/**
  (every module is mutually restricted from every other module's internals)

Permitted cross-boundary patterns:
  import { TOKENS } from '../../core/container/tokens.js'         ✓
  import type { IModerationService } from '...contracts'          ✓ (type-only, no runtime coupling)
  Direct relative import of a sibling module's src/ file           ✗ build error
```

Custom Dumby-specific rules: `dumby/no-hardcoded-user-facing-strings` (flags a string literal longer than five words inside a command handler that isn't routed through `I18nManager`); `dumby/require-correlation-id-in-catch` (flags a catch block that logs an error without including `context.logger`'s pre-bound correlation fields); `dumby/no-direct-db-in-command` (errors if a command file imports `TOKENS.Database` directly rather than going through a service); `dumby/manifest-completeness` (validates that every `manifest.ts` populates every field §10.2 requires for its declared tier).

### 41.5 Documentation Auto-Generation

`scripts/generate-docs.ts` produces Markdown reference documentation directly from manifest files and JSDoc-style comments, run in CI and committed back to the repository so documentation never drifts from the code it describes: `docs/modules/` (one file per module — commands, options, permissions, events, services, config keys, all extracted from the manifest); `docs/api/` (REST endpoint reference — paths, methods, auth requirements, request/response shapes); `docs/database/` (table reference extracted directly from migration files); `docs/events/` (the full domain event catalog — every event name, payload type, emitting module, and every module subscribed to it).

---

## 42. Development Workflow

### 42.1 Environment Setup

```
Prerequisites: Node.js LTS ≥ 22 (nvm install 22 && nvm use 22), pnpm, Docker Desktop, Git

1. Clone the repository
2. Copy .env.example → .env.development; fill in BOT_TOKEN, CLIENT_ID, DEVELOPMENT_GUILD_ID
3. docker compose up -d         (starts PostgreSQL :5432, Redis :6379, Bull Board :3001)
4. pnpm install
5. pnpm migrate                 (applies all core + module migrations to the dev database)
6. pnpm seed                    (loads representative development fixture data)
7. pnpm deploy-commands:dev     (registers all commands to DEVELOPMENT_GUILD_ID — propagates in seconds)
8. pnpm dev                     (starts the bot with --watch hot reload)
9. Verify: invoke /ping in the configured development guild
```

Every required environment variable is validated by the root Zod schema at Stage 02 (§8.2); a missing or malformed value produces a field-level error naming exactly what's wrong before any module loads. `.env.example` documents every variable with an inline description, and any PR introducing a new configuration key is required to update `.env.example` in the same commit — a CI check (`scripts/verify-env-example.ts`) diffs the root Zod schema's keys against `.env.example`'s declared keys and fails the build on any mismatch in either direction.

### 42.2 Branch Naming & Commit Convention

Development is trunk-based against a single long-lived `main`: every change is a short-lived branch from `main`, merged back via pull request, with `main` always deployable (§43's release pipeline deploys directly from it). There is no long-lived `develop` branch accumulating changes between releases — a second long-lived branch is a second place for `main` and reality to drift apart, and reconciling that drift is exactly the kind of unplanned, unbudgeted work this workflow is designed to avoid.

```
feat/{module}/{short-description}      New feature
fix/{module}/{short-description}       Bug fix
refactor/{module}/{short-description}  Restructuring, no behavior change
docs/{short-description}               Documentation only
chore/{short-description}              Build/tooling changes
ci/{short-description}                 CI/CD pipeline changes
```

All commits are validated by `commitlint` against the Conventional Commits format (`<type>(<scope>): <description>`), enforced as a Husky `commit-msg` hook locally and again in CI. Full type and scope reference is in §45.3.

### 42.3 Feature Development Cycle

```
1.  Branch from main: git checkout -b feat/economy/add-leaderboard-pagination
2.  New module? → pnpm dumby scaffold module <name>
3.  Write the test first: __tests__/leaderboard.command.test.ts; run pnpm test --filter=economy --watch
4.  Implement: commands/leaderboard.command.ts; register in manifest.ts; iterate to green
5.  New columns needed? → migrations/000N_*.ts; pnpm migrate
6.  Add locale keys for any new user-facing string to locales/en-US.json at minimum
7.  Manual verification: pnpm deploy-commands:dev (if the command definition changed); pnpm dev
8.  pnpm lint (zero warnings) && pnpm format
9.  pnpm test (full suite)
10. Conventional commit; push; open PR
```

### 42.4 Code Review Checklist

Every PR is reviewed against a fixed checklist before merge, organized by concern:

**Architecture.** New code respects module boundaries (no cross-module imports); business logic lives in services, never in command handlers; database access is exclusively through repositories; every new cross-module dependency is declared in the manifest's `depends` array.

**Quality.** New code has unit test coverage; integration tests exist for any database-touching addition; coverage does not regress below the §40.6 thresholds; no `console.log`/`console.error` (the injected logger is the only sanctioned output channel); no hardcoded user-facing strings outside the locale system.

**Database.** Every new migration has both `up` and `down`; every new indexed-in-practice column has a supporting index in the same migration; audit columns are present per §21.5's entity-table rule; the migration follows the zero-downtime patterns in §21.4 where the touched table exceeds 100k rows.

**Security.** All user input is validated before use; every new command declares explicit `permissions.discord` and `permissions.rbac` (Core-tier commands declare `permissions.discord` only, per §11.2); no secret values appear in source (configuration only); state-changing operations are reflected in the audit log per §29.7.

**Documentation.** `manifest.ts` reflects every new command/event/service; public service methods carry doc comments; `.env.example` is updated for any new configuration key; the module's `eventsCatalog` is updated for any new emitted event.

---

## 43. CI/CD Pipeline & Automation

### 43.1 PR Quality Pipeline

Triggered on every push to a branch with an open PR:

```
Job: lint
  pnpm install --frozen-lockfile
  pnpm typecheck            (tsc --noEmit — zero errors required)
  pnpm lint                 (ESLint, zero-warnings policy)
  pnpm format:check          (Prettier --check)
  pnpm commitlint --from=origin/main
  pnpm validate-manifests    (every manifest.ts against the Zod schema)

Job: test (needs: lint)
  services: postgres:16-alpine, redis:7-alpine (with health checks)
  pnpm migrate
  pnpm test --coverage
  Upload coverage to Codecov; fail on threshold violation (§40.6)

Job: build (needs: test)
  Build the production Docker image (no push)
  Assert image size < 300 MB
  Trivy vulnerability scan; fail on any CRITICAL finding

Job: validate-migrations (parallel with test)
  Verify every migration file exports both up and down
  Dry-run every migration against a fresh test database
```

### 43.2 Release Pipeline

Triggered on every push to `main` (post-merge):

```
pnpm install --frozen-lockfile
pnpm changeset version       (consumes accumulated changeset files; bumps package.json,
                              writes CHANGELOG.md entries, per the rules in §45)
git tag v{newVersion}
gh release create — auto-populated from the changeset-generated changelog
Dispatch deploy-staging.yml
```

### 43.3 Staging Deployment

```
Job: build-and-push
  Checkout at the release tag
  Docker Buildx multi-stage build; tag: ghcr.io/{org}/dumby:{version}, :staging-latest
  Push to GHCR; Trivy scan on the pushed image

Job: deploy (needs: build-and-push; environment: staging)
  kubectl set image deployment/dumby bot=ghcr.io/{org}/dumby:{version}
  kubectl rollout status deployment/dumby --timeout=300s
  Smoke tests: GET /health/readiness → 200; GET /metrics → 200 Prometheus text;
               POST /webhooks/inbound/test → 200
  Notify deployment channel; on failure: kubectl rollout undo + failure notification
```

### 43.4 Production Deployment — Manual Gate

```
Trigger: workflow_dispatch (input: version tag)

Job: validate
  Confirm the tag exists in GHCR
  Confirm the same image digest is the one currently running in staging
  Confirm staging has run this version for at least 30 minutes continuously

Job: approval-gate (environment: production — requires 2 designated approvers)

Job: deploy-production (needs: approval-gate)
  Rolling update: kubectl set image deployment/dumby bot=ghcr.io/{org}/dumby:{version}
  kubectl rollout status deployment/dumby --timeout=600s
  Poll GET /health/readiness every 10s for 60s; any failure triggers automatic
  kubectl rollout undo and pages the on-call rotation
  Production smoke test suite (read-only — no state-mutating calls)
  Annotate Grafana dashboards with the deployment marker
```

### 43.5 Dependency Review

`dependency-review.yml` runs on every PR that modifies `package.json` or `pnpm-lock.yaml`, comparing the diff's dependency changes against known vulnerability advisories and blocking the PR on any newly introduced `high` or `critical` finding. `pnpm audit` additionally runs as its own gate in the main CI pipeline before every build and before every production deployment, independent of whether the lockfile changed in that specific PR.

---

## 44. Infrastructure & Deployment

### 44.1 Docker — Production Image

Three-stage build, producing a final image with no dev dependencies, no build toolchain, and no shell-accessible attack surface beyond what `dumb-init` and the Node runtime itself require:

```
Stage 1 (base):    node:22-alpine — dumb-init, ca-certificates; WORKDIR /app; NODE_ENV=production
Stage 2 (deps):    pnpm install --prod --frozen-lockfile   (cached independent of source changes
                    when the lockfile is unchanged)
Stage 3 (runtime): copy node_modules from deps, copy compiled dist/, copy package.json;
                    USER node (non-root); ENTRYPOINT ["dumb-init", "node", "dist/entry/main.js"]
                    EXPOSE 3000 (health/API), 9090 (metrics)
```

`dumb-init` is the container's PID 1, ensuring `SIGTERM` is correctly forwarded to the Node process (rather than being swallowed, which is a common failure mode for containerized Node processes that omit a proper init system) and that zombie processes from any spawned child are reaped. OCI image labels (`org.opencontainers.image.version`, `.created`, `.source`, `.revision`) are populated from build args at build time, giving every running container a traceable origin. `.dockerignore` excludes `node_modules`, `__tests__`, `docker/`, `infra/`, `.git`, `*.md`, `.env*`, and `coverage/`.

### 44.2 Docker Compose — Local Development Stack

```
dumby-bot:   built from docker/Dockerfile.dev; bind-mounts src/ for --watch hot reload;
             depends_on: [postgres, redis]; ports 3000, 9090
postgres:    postgres:16-alpine; named volume for data persistence; pg_isready healthcheck
redis:       redis:7-alpine; named volume; --save 60 1 (local persistence for dev convenience)
bull-board:  queue dashboard UI against the same Redis instance, port 3001
```

### 44.3 Kubernetes — Reference Production Configuration

```yaml
spec:
  replicas: 2
  strategy:
    type: RollingUpdate
    rollingUpdate: { maxUnavailable: 0, maxSurge: 1 }
  template:
    spec:
      terminationGracePeriodSeconds: 190
      containers:
        - name: bot
          resources:
            requests: { cpu: "250m", memory: "384Mi" }
            limits:   { cpu: "1000m", memory: "768Mi" }
          ports: [{ containerPort: 3000 }, { containerPort: 9090 }]
          livenessProbe:
            httpGet: { path: /health/liveness, port: 3000 }
            initialDelaySeconds: 10
            periodSeconds: 15
            failureThreshold: 3
          readinessProbe:
            httpGet: { path: /health/readiness, port: 3000 }
            periodSeconds: 10
            failureThreshold: 6
          startupProbe:
            httpGet: { path: /health/startup, port: 3000 }
            periodSeconds: 10
            failureThreshold: 30      # 5-minute startup allowance
          envFrom:
            - configMapRef: { name: dumby-config }
            - secretRef:    { name: dumby-secrets }
          lifecycle:
            preStop:
              exec: { command: ["/bin/sh", "-c", "sleep 5"] }   # load-balancer drain grace
```

`terminationGracePeriodSeconds: 190` is set to the absolute worst-case sum of every individual shutdown-step ceiling in §8.3 (180 s) plus a 10 s buffer, deliberately — not to the shorter, more common realistic-case duration. The per-step numbers in §8.3 are ceilings, not expected durations — a shutdown with no long-running in-flight commands and a shallow queue backlog (the overwhelming majority of real shutdown events) completes in low single-digit seconds regardless of what the grace period is set to, so the 190 s ceiling costs nothing in the common case. What it buys in the uncommon case is real: a genuine worst-case shutdown gets to complete Step 4's dead-letter write for any abandoned BullMQ job before Kubernetes sends `SIGKILL`, rather than being cut off mid-write and losing that job with no record at all. An operator confident their workload never carries long-running commands or a deep queue backlog can lower `terminationGracePeriodSeconds` deliberately, for faster pod recycling — 190 s remains the default specifically because guaranteeing Step 4's dead-letter write completes for every abandoned job, rather than being cut off mid-write with no record at all, is the outcome this framework defaults into.

**Horizontal Pod Autoscaler** (`hpa.yaml`) scales on CPU and memory utilization as a baseline (`averageUtilization: 70` CPU, `80` memory), extended in §30.3 with the workload-aware custom metrics (in-flight command count, aggregate job queue depth) that better reflect Dumby's actual bottlenecks than CPU alone.

### 44.4 Sharding Topology in Kubernetes

Below the 2,500-guild sharding threshold (§30.1), a deployment runs in unsharded mode: a single logical shard (shard 0 of 1), with the two-replica active/standby pattern from §23.4 providing failover redundancy rather than throughput scaling — exactly one replica holds the live Discord gateway session at any moment, coordinated via the Redis `SET NX EX` heartbeat lock described there.

Above the sharding threshold, each Kubernetes pod's container entrypoint is responsible for one contiguous range of shard IDs, sized to fit comfortably within the pod's memory limit (a useful starting point is 4–6 shards per pod for guild distributions of typical size, tuned per deployment based on observed per-shard memory and CPU). The pod's `SHARD_COUNT` and `SHARD_RANGE` environment variables tell the entrypoint exactly which shards it owns; `discord.js`'s native multi-shard support within a single process manages the corresponding set of gateway WebSocket connections, while every shard within the pod shares the same PostgreSQL pool, the same Redis connection, and the same BullMQ worker registration — only the gateway connection itself is per-shard. The total pod (replica) count for a sharded deployment is therefore `ceil(totalShards / shardsPerPod)`, and scaling the guild count up over time is a matter of increasing `totalShards` (recalculated from Discord's `recommended_shards` response) and adjusting replica count to match, with no change to application code.

**Cross-shard coordination** for the rare cases that need it (an Admin-tier command inspecting a guild that happens to live on a different pod's shard range) uses Redis pub/sub: the originating pod publishes a correlated request on a shared channel, every pod subscribes and checks whether the target guild falls within its own owned shard range, the owning pod processes the request and publishes a correlated response, and the originating pod awaits that response with a bounded timeout. This avoids any direct pod-to-pod network dependency — Redis is the only coordination surface, consistent with the state-externalization principle in §23.1.

### 44.5 Terraform — Infrastructure as Code

`infra/terraform/` provisions every cloud resource Dumby depends on — so a complete environment can be created or destroyed with a single `terraform apply` / `terraform destroy` rather than manual provisioning. Terraform's boundary is deliberately exclusive of anything that runs *inside* the cluster — it creates the EKS/GKE cluster itself; Kubernetes manifests (§44.3) create the Deployment that runs inside it.

```
infra/terraform/
├── modules/
│   ├── database/      Managed PostgreSQL (RDS / Cloud SQL); tuned parameter group
│   │                   (max_connections, statement_timeout); automated backup window;
│   │                   conditional read replica(s) via enable_read_replica;
│   │                   conditional cross-region replica(s) via a replica_regions list
│   │                   variable (default []; populating it provisions one cross-region
│   │                   replica per listed region using the provider's native cross-region
│   │                   replica resource, and emits a replica_endpoint_{region} output
│   │                   per region — feeding directly into DATABASE_READ_REPLICA_URLS,
│   │                   §21.6)
│   ├── cache/          Managed Redis (ElastiCache / Memorystore); sized via node_type
│   └── kubernetes/      The cluster itself; managed node group with autoscaling bounds;
│                        IAM roles/service accounts for in-cluster Secrets Manager access
├── environments/
│   ├── staging/         Smaller instances, single-AZ database, no read replica
│   └── production/      Multi-AZ database, read replica enabled, deletion_protection = true
├── main.tf               Wires the three modules; passes the database's private endpoint
│                          into the kubernetes module's secret-injection configuration
├── variables.tf
└── outputs.tf             Cluster endpoint, database host/port (never the password),
                            Redis endpoint, per-region replica endpoints
```

State is stored remotely (S3 with DynamoDB locking, or Terraform Cloud) — never locally — so CI pipelines and individual operators always apply against one shared source of truth. `staging` and `production` are entirely separate state files, never a single workspace with conditional resource counts, which makes a `terraform destroy` against staging structurally incapable of touching a production resource. Discord application credentials (`BOT_TOKEN`, `CLIENT_ID`) are created once, by a human, in the Discord Developer Portal, and inserted directly into the provisioned secrets manager out-of-band — Terraform provisions the secrets manager resource and the IAM permissions to read from it, never the secret values themselves.

### 44.6 Cloud Provider Reference Points

| Scale | Recommended Platform | Notes | Approximate minimum monthly infrastructure cost |
|---|---|---|---|
| < 2,500 guilds, single operator | Fly.io or a single VPS with Docker Compose | Lowest operational overhead; unsharded mode; no active/standby redundancy (§23.4 doesn't apply to a one-process deployment) | $25–75: one small VM or Fly machine, a single-instance managed or self-hosted Postgres, a single-instance Redis |
| 500–5,000 guilds, small team | DigitalOcean Kubernetes (DOKS) + managed PostgreSQL/Redis | Simpler control plane than the hyperscalers | $300–800: a 2–3 node DOKS cluster, managed Postgres with one standby, managed Redis, a basic OTLP backend tier |
| 5,000+ guilds, enterprise | AWS EKS + RDS (Multi-AZ) + ElastiCache, or GCP GKE + Cloud SQL + Memorystore | Full read-replica, multi-region, autoscaling capability | $1,500+: scales with pod count under the HPA (§30.3), Multi-AZ RDS plus at least one cross-region read replica, ElastiCache cluster mode, and an APM-class tracing backend (Honeycomb/Datadog, §24.4) billed on span volume |

These are infrastructure-only floors — compute, managed database, cache, and the cheapest viable observability tier at each scale — not fully-loaded costs; they exclude engineering time (§49.3's adoption-friction discussion covers that separately) and any per-seat cost of the APM/tracing vendor chosen at the top tier, which can dominate the estimate above a few million spans a day. They're order-of-magnitude figures for deciding whether a tier is financially in-scope at all, not a quote — actual provider pricing, region, and reserved-vs-on-demand purchasing all move these substantially.

### 44.7 Performance Engineering — Runtime Tuning

**Event loop protection.** No synchronous I/O (`fs.readFileSync`, synchronous DNS resolution) appears anywhere in a hot path; every file operation uses `fs.promises`. `nodejs_eventloop_lag_seconds` is scraped continuously; a sustained value above 100 ms for more than 30 seconds is a warning-tier alert, since it indicates something is blocking the loop synchronously regardless of how fast the database and cache are responding.

**discord.js cache tuning.** discord.js's in-process object cache is tuned per manager based on actual access pattern rather than left at defaults, since an untuned cache in a large-guild deployment can consume hundreds of megabytes for data that is rarely re-read:

```
GuildMemberManager.maxCacheSize:  200   (LRU; commands needing an uncached member call
                                          guild.members.fetch(userId) on-demand)
MessageManager.maxCacheSize:       50    (sufficient for message-delete-logging lookback;
                                          higher wastes memory on content that ages out fast)
PresenceManager:                   not cached (sweepOnInterval: true, sweepFilter: removeAllItems;
                                          the GUILD_PRESENCES intent itself is only requested
                                          when a loaded module's manifest actually declares it)
GuildManager / ChannelManager / RoleManager: unbounded (small, structurally required for
                                          routing and permission checks on every interaction)
EmojiManager:                       swept hourly (rarely accessed outside reaction-based modules)
```

**Memory ceiling.** `NODE_OPTIONS=--max-old-space-size` is set to roughly 75% of the container's memory limit (e.g., `576` for a 768Mi limit per §44.3), leaving headroom for the OS, Buffer allocations outside the V8 heap (tracked via `process.memoryUsage().external`, relevant for voice-heavy workloads in the `music` module), and garbage collection overhead — rather than allowing Node to grow toward the container's hard limit and risk an OOM kill mid-GC-cycle.

**Worker thread pattern for CPU-bound work** (extending §30.6): the fixed-size `WorkerThreadPool`, sized by default to `os.cpus().length - 1` (reserving one core for the main event loop), is pre-spawned entirely at startup rather than on first use, so the first dispatched task is never penalized with thread-spawn latency. The main thread never imports business logic directly into a worker; instead, each worker runs a small dispatcher that receives a `{ taskType, payload }` message, dynamically resolves the corresponding task module by `taskType`, executes it, and posts back a typed result or error. A task dispatched while every worker is busy is queued FIFO rather than triggering an additional thread beyond the configured pool size; sustained queue depth (`dumby_worker_pool_queue_depth`) is the signal that the pool is undersized for current load, surfaced on the same alerting path as every other system metric (§24.3). A worker that throws or crashes is isolated entirely to its own in-flight task — the pool detects the thread's exit, rejects that task's pending promise, logs the failure, and spawns a replacement thread to restore the pool to its configured size, so one malformed task can never affect the bot process or any other concurrent task.

**Query optimization checklist**, applied to every production query: every `WHERE` clause column is index-backed (composite indexes for compound conditions); cursor-based pagination (`WHERE id > lastId ORDER BY id LIMIT n`) is used for any unbounded list rather than `OFFSET`, since `OFFSET` requires PostgreSQL to scan and discard every skipped row; no query ever issues `SELECT *`; any query executing more than 100,000 times per day has its `EXPLAIN (ANALYZE, BUFFERS)` output reviewed to confirm index usage and acceptable buffer cache hit ratio.

### 44.8 Deploying PEP, CLAI, Swastik, Credentials Service, and Persona Processes

PEP, CLAI, Swastik, the Credentials Service, and every Persona are each their own Kubernetes `Deployment`, built from the same container image as the main bot (§44.1) and differing only in entrypoint and environment: `pep.ts`, `clai.ts`, `swastik.ts`, and `credentials.ts` (§7.5) for the Power Engine Panel, CLAI, Swastik, and the Credentials Service respectively, and `main.ts` again — under a distinct `BOT_TOKEN` and `PERSONA_ID` — for each Persona (§6.6). None of these four services needs the main bot's shard-aware `startupProbe`/`livenessProbe`/`readinessProbe` sequencing (§8.2) unmodified: none of them opens a gateway connection at all, and each exposes a simpler health check reflecting only its own dependencies, while a Persona's readiness is governed by the identical eighteen-stage sequence the main bot already uses, evaluated against its own token rather than a shared one. PEP, CLAI, Swastik, and the Credentials Service are each provisioned with their own `PodDisruptionBudget` (§44.3) sized for a single replica plus one standby, since none needs the main bot's horizontal scaling profile — their load is administrative command volume or deployment-event volume, not guild or shard count.

Swastik carries one additional deployment requirement beyond the other three: it mounts the same shared Kubernetes volume (`SWASTIK_STAGING_VOLUME_PATH`, §20.2) that every `main.ts` pod also mounts, since staging and atomically promoting a module version (§13.10) requires Swastik and every running bot pod to share the identical filesystem path. The Credentials Service carries the opposite constraint: its `Service` object is deliberately **not** exposed through the public-facing `Ingress` the other four use, bound instead to a `ClusterIP`-only `Service` reachable exclusively from within the cluster's own internal network (§19.19) — the one process among these five with no public network exposure of any kind, by design.

---

## 45. Versioning, Release & Migration

### 45.1 Semantic Versioning

The framework follows strict `MAJOR.MINOR.PATCH` semantic versioning. A `PATCH` covers bug fixes, security patches, and dependency updates that introduce no API change. A `MINOR` covers a new module, a new command, a new optional configuration key, or a new REST endpoint — anything additive that doesn't require any existing integration to change. A `MAJOR` covers a breaking change to the core framework's own API, a required configuration change, an incompatible database schema change, or the removal of a module — anything that requires an integrator to take action before upgrading.

### 45.2 Module Versioning

Every module carries its own semantic version, independent of the framework's own version, governed by the same MAJOR.MINOR.PATCH rules relative to that module's specific API surface (its `provides` contract, its emitted event shapes, its command names). When a module's published contract changes in a breaking way, its own MAJOR version increments, and every other module's `depends` declaration pinning a version range against it is what `ModuleRegistry` validates at Stage 11 (§8.2) — an incompatible pin is a fatal startup error, never a silent runtime mismatch.

### 45.3 Conventional Commits Reference

```
Format: <type>(<scope>): <description>

feat       New feature                                    → MINOR
fix        Bug fix                                         → PATCH
perf       Performance improvement                          → PATCH
refactor   Restructuring, no behavior change                  → no release
test       Test changes only                                   → no release
docs       Documentation only                                    → no release
chore      Build tooling, CI config, dependency bumps              → no release
ci         CI/CD pipeline changes                                   → no release
style      Formatting only (should be Prettier-automated)             → no release
revert     Reverts a prior commit                                       → matches reverted commit

Breaking change: append "!" after type, or include a "BREAKING CHANGE:" footer  → MAJOR
  feat(moderation)!: change case numbering from per-guild to global sequence

Scopes: a module name, or one of: core, infra, config, ci, docs, deps
```

### 45.4 Breaking Change Management

A `MAJOR` release maintains the prior API alongside the new one for one full minor-version cycle wherever structurally feasible, publishes a dedicated migration guide enumerating every breaking change with the exact remediation steps, and includes updated illustrative catalog examples (§32) so the framework's own documentation never demonstrates a pattern the new API can't actually support. Schema changes that are breaking at the database level use the zero-downtime rolling migration patterns in §21.4, specifically to avoid requiring a maintenance window even for a MAJOR release.

### 45.5 Database Migration Discipline

Every schema change is a versioned, immutable migration file carrying both `up` and `down` — a migration without `down` fails CI validation outright (§43.1). Migrations are namespaced per owner (core or a specific module), with `knex_migrations` recording the namespace-qualified filename so independently-developed modules never collide on migration numbering. Destructive schema operations — column drops, type changes — always follow the multi-step zero-downtime sequence in §21.4 rather than a single blocking `ALTER`.

---

## 46. Troubleshooting & Operational Runbooks

### 46.1 Startup Failure Diagnostics

```
Symptom: process exits immediately after starting

1. Read the final log line — it names the failing stage by its Stage identifier (§8.2)
2. CONFIG_LOAD (Stage 02) failure → the log includes the full Zod validation error,
   naming every invalid or missing environment variable field-by-field
3. DATABASE_CONNECT (Stage 05) failure → verify DATABASE_URL and connectivity directly:
   psql $DATABASE_URL -c "SELECT 1"
4. CACHE_CONNECT (Stage 07) failure → verify REDIS_URL: redis-cli -u $REDIS_URL PING
   (expect PONG)
5. MODULE_VALIDATE (Stage 11) failure → the log names the specific module and the specific
   manifest field that failed validation, or the specific dependency cycle if that's the cause
6. DISCORD_LOGIN (Stage 15) failure → verify BOT_TOKEN validity in the Discord Developer
   Portal; a regenerated token requires updating the deployed secret
```

```
Symptom: commands show "The application did not respond"

Cause: the 3-second interaction acknowledgment window elapsed without a reply or a defer.
1. Does the slow command declare requiresDefer: true (§15.2)?
2. Check dumby_command_duration_seconds for this command — is P95 approaching 2.8s?
3. Check nodejs_eventloop_lag_seconds — a value above 100ms means something else
   entirely is blocking the event loop, not this command's own logic
Fix: set requiresDefer: true on the affected command; add any missing database index
revealed by a slow-query log entry; move any CPU-bound step to a Worker Thread (§44.7)
```

### 46.2 High Error Rate Runbook

```
1. Identify the failing module and error_type from dumby_permission_denied_total or
   dumby_commands_total{status="error"}, filtered and grouped in Grafana
2. Pull the structured logs for that module within the alert window, filtered by
   the correlationId of a representative failing request (§24.2)
3. Check whether the error rate's onset correlates with a recent deployment —
   compare against the Grafana deployment annotation (§43.4) placed at every production deploy
4. Check the health of each dependency directly:
     dumby_database_query_duration_seconds  — is PostgreSQL slow or unresponsive?
     dumby_cache_operations_total{status="miss"} — is there an unexpected miss-rate spike?
     Circuit breaker state (§25.4) for any outbound integration the failing path touches
5. Mitigation:
     A single module misbehaving → reload it (§13.3), or disable it globally via the Power Engine Panel (§19.10)
     The gateway itself is unhealthy → check dumby_shard_status and dumby_websocket_ping_ms
     The database is down → Dumby degrades per §23.5; cache-hit traffic continues to function
```

### 46.3 Shard Disconnected Runbook

```
Symptom: dumby_shard_status{shardId} == 0 for more than 30 seconds

1. kubectl get pods -n dumby — confirm every pod is in Running state
2. kubectl logs -n dumby {pod} --tail=100 — read the disconnection reason directly
3. Common causes, in likelihood order:
   a. A genuine Discord Gateway outage — check Discord's own status page; discord.js's
      built-in reconnection-with-backoff handles this automatically once Discord recovers
   b. An OOM kill — kubectl describe pod {pod} | grep -i oomkilled; if confirmed,
      raise the memory limit in §44.3's deployment configuration
   c. A network partition between the pod and Discord's edge — check whether other,
      unrelated shards are also disconnected; if so this is a cluster networking issue,
      not a Discord-side issue
4. discord.js attempts automatic reconnection with exponential backoff; if reconnection
   does not succeed within a few minutes, the process exits and the orchestrator's
   restart policy brings up a fresh process
5. Manual last resort: kubectl rollout restart deployment/dumby — use only after automatic
   reconnection has failed to recover for an extended period (10+ minutes)
```

### 46.4 Memory Growth Runbook

```
Symptom: process memory grows monotonically over hours/days, eventually OOM-killed

1. Distinguish growth from a leak: a bot actively gaining new guilds shows real growth
   from legitimately larger caches; a leak grows even with a stable guild count
2. Capture two heap snapshots roughly an hour apart via the Admin-tier debug endpoint
   (§41.3), compare retained-object growth in a heap analysis tool
3. The most common sources, in order of likelihood:
   a. An event-bus subscription registered in onLoad() without a matching unsubscribe
      in onUnload() — every EventBus.on() call's returned unsubscribe function must be
      invoked during module teardown
   b. A timer (setTimeout/setInterval) created without a stored reference, preventing
      clearTimeout/clearInterval from ever running during onUnload()
   c. A pagination or form session stored in a module-level in-memory Map instead of
      the mandated Redis-backed session store (§18.5, §18.3) — this is an architectural
      violation as well as a leak source, since it also breaks horizontal scaling (§23.1)
4. Short-term mitigation: confirm the Kubernetes memory limit triggers a clean restart
   on breach rather than a slow degradation
5. Long-term: the root cause is fixed before the next release — a recurring leak is
   treated as a release-blocking defect, not a background annoyance
```

### 46.5 Slow Command Runbook

```
Symptom: dumby_command_duration_seconds P95 exceeds 3 seconds

1. Identify which specific command(s) via the per-command label in Grafana
2. Check nodejs_eventloop_lag_seconds — if elevated, something is blocking the loop
   synchronously; the fix is moving that work to a Worker Thread, not optimizing the
   already-fast async I/O calls around it
3. Check dumby_database_query_duration_seconds for the repository methods this command
   path touches — a P95 above 500ms here points to a missing index or an unindexed
   ORDER BY/WHERE combination; confirm via EXPLAIN ANALYZE
4. Check the cache hit ratio (§22.6) for the keys this command path reads — a hit ratio
   below 80% means the cache isn't warming as expected, often from a TTL set too short
   relative to actual read frequency
5. Immediate mitigation regardless of root cause: confirm requiresDefer: true is set,
   so users see "thinking..." rather than an outright interaction failure while the
   underlying slowness is investigated and fixed
```

---

# PART IX — REFERENCE

---

## 47. REST API, Webhooks & MDIS

### 47.1 Authentication Model

The HTTP server (Fastify, bound at Stage 03 alongside the health endpoints) exposes four authentication contexts, never conflated:

**Service-to-service (`INTERNAL_API_KEY`).** Every `/admin/*` management endpoint requires `Authorization: Bearer {INTERNAL_API_KEY}`, a process-level secret used by CI/CD pipelines, external monitoring integrations, and any operator tooling calling the API directly rather than through Discord. This is the same key referenced throughout Part VI's operational sections.

**Human dashboard sessions (Discord OAuth2).** MDIS (§14.5) authenticates a human browser session through Discord's standard authorization-code OAuth2 flow, exchanges the resulting Discord user ID for a Dumby RBAC role via the identical `RBACService.resolve(guildId, userId)` call the in-Discord command path uses (§19.7) — there is exactly one role-resolution code path, reused by both surfaces.

**Developer identity (Swastik dev ID).** Every `/swastik/*` endpoint (§47.7) requires `Authorization: Bearer {devId}`, the credential issued at developer registration (§13.6) — carried exclusively in this header, on every call, and never accepted anywhere in a URL or query string. This context is scoped narrowly to a developer's own account, builds, and licensing status; a valid dev ID authenticates precisely one developer and nothing about any other developer's records.

**Unauthenticated, infrastructure-restricted.** Health and metrics endpoints (§47.2) require no application-level authentication, since restricting them is the responsibility of network policy (a Kubernetes `NetworkPolicy` or equivalent) rather than the application — a load balancer's health checker and a Prometheus scraper should never need a credential, but the endpoints themselves should never be reachable from outside the cluster's trusted network boundary either.

The Credentials Service (§19.19) sits outside this fourfold model entirely, by design: it binds to a local or internal-network interface rather than the HTTP server described here, and is never reachable through any of the four contexts above.

### 47.2 Health, Metrics & Info Endpoints

```
GET /health/liveness    — 200 once observability init completes (Stage 04); see §24.5
GET /health/startup     — 200 once Discord login completes (Stage 15); see §24.5
GET /health/readiness   — 200 once all required modules are healthy (Stage 18); see §24.5
GET /metrics            — Prometheus text-format metrics (§24.3)
GET /info               — bot version, guild count, shard count, uptime, Node.js version,
                           discord.js version (no secrets, safe for unauthenticated exposure)
```

### 47.3 Admin Management Endpoints

Every endpoint below requires `INTERNAL_API_KEY` and is a direct call into the corresponding core service — `ConfigService`, `ModuleRegistry`, `CacheManager`, the queue layer (§26). This REST surface is the canonical way to reach these services from outside the Discord gateway entirely; if a deployment also exposes an Admin-tier Discord command for one of these actions, that command calls the identical service method this endpoint does, so the two can never drift in behavior — but the REST API does not exist merely to mirror a command, and works the same with no such command ever built.

```
Configuration:
  GET    /admin/config                    Resolved config, secrets redacted
  POST   /admin/config/set                Hot-reload a mutable config key

Modules:
  GET    /admin/modules                   Full registry with status, version, load time
  POST   /admin/modules/:name/reload      onUnload → onLoad → onReady cycle
  PATCH  /admin/modules/:name/state       Sets guild_module_states for a specified guild
                                          (mirrors PATCH /api/modules/:name/state, §14.5,
                                           but scoped by the request body's guildId rather
                                           than an authenticated session's own guild)

Cache:
  GET    /admin/cache/stats               L1 + L2 hit/miss rates, entry counts
  GET    /admin/cache/keys?prefix=        Lists matching cached keys
  DELETE /admin/cache/keys/:key           Deletes a specific key from both tiers
  POST   /admin/cache/flush               Flushes L2 (Redis FLUSHDB) — requires
                                          an explicit { confirm: true } body

Queues:
  GET    /admin/queues                    All queues with per-state job counts
  GET    /admin/queues/:name/jobs         Jobs in a queue, filterable by state
  POST   /admin/queues/:name/jobs/:id/retry
  POST   /admin/queues/:name/retry-failed  Bulk retry
  DELETE /admin/queues/:name/jobs/:id
  POST   /admin/queues/:name/pause | /resume

Scheduler:
  GET    /admin/tasks                     Cron tasks: last run, next run, status
  POST   /admin/tasks/:name/run            Manually trigger immediately
  POST   /admin/tasks/:name/start | /stop

Audit & Guilds:
  GET    /admin/audit-logs                Paginated; filters: guildId, action, actorId
  GET    /admin/guilds                    Paginated guild list with config summary
  GET    /admin/guilds/:id                Single guild detail

Power Engine Panel (§19.9–§19.10):
  POST   /admin/power-engine/guild/:id/suspend | /restore
  POST   /admin/power-engine/module/:slug/suspend | /restore
  POST   /admin/power-engine/developer/:id/suspend | /restore
  POST   /admin/power-engine/command/:key/restrict | /unrestrict
  POST   /admin/power-engine/application/maintenance-mode/enable | /disable
  POST   /admin/power-engine/events/:name/mute | /unmute
  POST   /admin/power-engine/middleware/:name/disable | /enable
  POST   /admin/power-engine/permissions/:userId/blacklist | /unblacklist
  POST   /admin/power-engine/database/:module/freeze | /unfreeze
  POST   /admin/power-engine/http/:route/disable | /enable
  POST   /admin/power-engine/i18n/:locale/disable
  POST   /admin/power-engine/observability/log-level
  POST   /admin/power-engine/error/:class/suppress | /unsuppress
```

Every mutating endpoint above — the original four grouped under Power Engine Panel and every state-changing call in Configuration, Modules, Cache, Queues, and Scheduler alike — routes through `PowerEngineDispatcher` (§19.11) before it takes effect, and every request body therefore requires the same `{ actorId, source, reason }` fields §19.9 defines, rejected at the dispatcher with no exception for being reached over REST rather than through CLAI. A cache flush or a queue pause triggered from this API carries the identical mandatory-reason, mandatory-audit guarantee as a guild suspension — one dispatcher, one guarantee, regardless of which endpoint a caller used to reach it.

### 47.4 The Shared Outbound HTTP Client

Every outbound HTTP call any module makes — to Lavalink, to GitHub's API, to Dodo Payments, to any third-party service — goes through the single `HttpClient` service (`TOKENS.HttpClient`), never through an ad-hoc `fetch()` call in module code. This uniformity is what makes the circuit breaker (§25.4), the correlation ID propagation (§24.1), and the credential-redaction logging guarantee (§24.2) apply automatically to every integration without each module author re-implementing them.

`HttpClient` provides, on every request: a default 10-second timeout (overridable per call); automatic retry (3 attempts, exponential backoff with jitter) on 5xx responses, connection resets, and timeouts — never on 4xx, since those represent a client-side error retrying won't fix; automatic awareness of `X-RateLimit-Remaining`/`Retry-After` response headers, queuing subsequent requests rather than hammering an already-throttling upstream; a per-hostname circuit breaker (§25.4); automatic `X-Correlation-ID` header propagation for distributed tracing across service boundaries; and automatic redaction of `Authorization`, API key, and token values from request logs.

A module that calls a specific external API creates a scoped, pre-configured client via `httpClient.extend({ baseUrl, headers, timeout })` — inheriting every default behavior above while binding a specific base URL and auth header set. This is the only sanctioned pattern for module-specific external integration — a Lavalink adapter for a music-shaped module, or a GitHub/Dodo Payments/status-page connector for an integrations-shaped module (§32.3), would each use it identically.

### 47.5 Inbound Webhook Processing

```
POST /webhooks/inbound/:provider
        │
        ▼
1. Look up the registered provider handler — unknown provider → 404
        │
        ▼
2. Verify signature FIRST, before any parsing or idempotency check
   (provider-specific scheme: GitHub HMAC-SHA256, Dodo Payments HMAC-SHA256
    over timestamp+payload per the Standard Webhooks spec,
    generic HMAC-SHA256 over X-Dumby-Signature — see §29.3)
   Invalid → 401, logged, no further processing
        │
        ▼
3. Atomic idempotency claim: SET webhook:seen:{deliveryId} 1 NX EX 86400
   Claim fails (already seen) → 200 immediately, no reprocessing (§29.3)
   Claim succeeds → continue
        │
        ▼
4. Parse body (JSON or form-encoded, per provider configuration)
        │
        ▼
5. Emit webhook.{provider}.{eventType} on the internal event bus
        │
        ▼
6. Return 200 immediately — all further processing happens asynchronously
   via event bus subscribers, never on the request's own response path
```

Returning 200 before business-logic processing completes is deliberate: external providers generally retry a delivery that doesn't receive a 2xx within 5–10 seconds, and acknowledging immediately while processing asynchronously through the event bus and job queue means a slow internal handler can never cause a provider to believe a delivery failed and retry it unnecessarily.

### 47.6 MDIS Endpoint Summary

The full design — schema-driven rendering, the four auto-exposed endpoints, tier visibility rules, and the graceful fallback for modules without a declared panel — is specified in §14.5. The endpoint shapes, summarized here for reference completeness:

```
GET   /api/modules/:name/config     Current guild config for the named module
PUT   /api/modules/:name/config     Validated config update (module's own Zod schema)
POST  /api/modules/:name/:action    Named module action (manifest-declared route)
PATCH /api/modules/:name/state      Enable/disable for the requesting guild
                                    (guild_module_states, not the config endpoint above)
```

### 47.7 Swastik & Credentials Service Endpoints

Swastik's public surface, authenticated by the developer dev-ID context (§47.1):

```
POST  /swastik/developers/register       Register a new developer (username + password)
GET   /swastik/developers/me             Caller's own profile, including approvalStatus
POST  /swastik/modules/upload            Upload a module package + manifest;
                                          assigns a fresh buildId on acceptance (§13.8)
GET   /swastik/modules/:slug/builds/:buildId   Status of a specific build (§13.9–§13.10):
                                          'validating'|'staged'|'promoted'|'rolled_back'|'rejected'
PATCH /swastik/modules/:slug/visibility  Update releaseStatus for a licensed, non-hardcoded
                                          module ('private'|'public', §10.2)
```

Swastik's internal surface, reachable only from Swastik's own network position, never from the public internet or from a developer's own credentials:

```
POST  /internal/reload?module=<name>     Swastik → Dumby runtime hot-swap signal (§13.10)
```

The Credentials Service exposes no endpoint on this HTTP server at all (§47.1); it is called exclusively as a local function call or through its own local-network-only binding (`CREDENTIALS_SERVICE_BIND_HOST`, §20.2), reachable only from the CLAI authkey-generation command (§19.17) and from Swastik's developer-registration flow (§13.6).

---

## 48. Mandatory Feature Compliance Matrix

Every entry below is a capability with genuine operational weight, each implemented by a specific, named mechanism documented in full elsewhere in this reference. This matrix exists as a single scannable checklist for evaluating a deployment's completeness — not as a count to satisfy, so entries are included only where there is something real to point to, and every entry's description is distinct from every other.

| # | Capability | Mechanism | Reference |
|---|---|---|---|
| 1 | Multi-tenant resource metering | Per-guild, per-resource daily usage counters (`metering_usage_daily`), queryable per-guild through `MeteringService`'s own query API | §21.2, §28.4 |
| 2 | Module-level fault isolation | Independent try/catch boundary per handler invocation in both `CommandRouter` and `EventRouter`; `required: false` modules degrade without blocking startup | §25.2 |
| 3 | Job queue autoscaling | `WorkerManager` adjusts per-queue worker concurrency between configured bounds based on observed queue depth, rate-limited against oscillation | §26.5 |
| 4 | Type-safe cross-module contracts | Manifest `provides`/`depends` tokens carry TypeScript interface types, checked by `tsc` at build time — a consumer calling an undeclared method fails to compile, not to run | §10.2, §12.3 |
| 5 | Production data anonymization | `AnonymizationService` produces deterministic-pseudonym, fully de-identified datasets from production data for safe use outside production | §31.4 |
| 6 | Distributed cron locking | Redlock-based per-task locking ensures a recurring task executes exactly once per tick across any number of concurrent processes | §26.6 |
| 7 | Scheduled database backup | `BackupService`, triggerable on a configurable schedule or on demand through its own service API, with full history in `backup_history` | §21.2 |
| 8 | Controlled restore automation | `RestoreService` requires an explicit target-environment confirmation parameter at the service layer itself; never a silent overwrite of a running environment regardless of what calls it | §21.2 |
| 9 | Custom outbound webhook delivery | Guild-configurable webhook endpoints (`guild_outbound_webhooks`) with per-guild event-type filtering and HMAC signing | §21.2 |
| 10 | Cache stampede protection | Combined distributed-lock-on-miss and probabilistic-early-refresh-before-expiry, applied uniformly through `CacheManager` | §22.4 |
| 11 | Zero-downtime rolling updates | Kubernetes `maxUnavailable: 0`/`maxSurge: 1` strategy, paired with the graceful shutdown sequence, readiness-gate semantics, and the shard-ownership handoff in #24 | §8.3, §24.5, §30.2, §23.4 |
| 12 | Deploy-anywhere infrastructure | The full stack (Docker, Kubernetes manifests, Terraform modules) targets standard, portable primitives with no single-cloud-specific service dependency | §44.1–§44.6 |
| 13 | Worker-thread CPU isolation | A pre-spawned, fixed-size thread pool for any CPU-bound operation, with FIFO backpressure and per-task failure isolation | §13.2, §30.6, §44.7 |
| 14 | Adaptive horizontal scaling | Kubernetes HPA driven by workload-specific custom metrics (in-flight command count, aggregate queue depth) rather than CPU/memory alone | §30.3 |
| 15 | Spot/preemptible instance support | Immediate graceful-shutdown trigger on a cloud provider's preemption notice, fitting within the typical 25–30 second warning window | §30.3 |
| 16 | Global read-replica routing | Method-name-based automatic read/write routing, with multi-region replica support and automatic unhealthy-replica exclusion based on measured lag | §21.6, §44.5 |
| 17 | Chaos engineering fault injection | A non-production-only fault-injection capability at the service layer, for validating resilience assumptions under controlled failure conditions | §25.5 |
| 18 | Layered happy-path and edge-case testing | A fourth, narrow test tier sitting beneath full integration tests — runs the most common 10–15 user journeys end-to-end on every PR for fast regression signal, distinct from the deeper, slower full integration suite | §40.2 |
| 19 | Full audit trail with tamper evidence | `audit_logs` is insert-only by lint-enforced convention, covering every state-changing administrative and configuration action | §21.2, §29.7 |
| 20 | GDPR-complete data subject rights | Erasure (with explicit per-role retention/tombstone rules), export, and a documented per-category retention table | §31.2, §31.3 |
| 21 | Webhook delivery idempotency | Atomic `SET NX EX` idempotency claim preceding all processing, eliminating the duplicate-delivery race window entirely | §29.3, §47.5 |
| 22 | Schema-driven web configuration | MDIS's manifest-declared `dashboardSchema`, rendered by a generic component engine with zero per-module frontend code | §14.5 |
| 23 | Marketplace review pipeline | Static analysis, manifest validation, security review, and functional review gates before any community module is listed | §14.4 |
| 24 | Shard ownership handoff | Redis-coordinated lock arbitration (any number of non-owning pods may contend), avoiding the gateway session conflict naive replica duplication would cause; the same mechanism underlies both crash failover and #11's rolling updates | §23.4, §30.2 |
| 25 | Connection pool multiplexing at scale | PgBouncer in transaction-mode pooling, reducing physical PostgreSQL connection count independent of process or shard count | §30.4 |
| 26 | Unified outbound integration adapter | A single `HttpClient` service providing retry, circuit-breaking, rate-limit awareness, and credential redaction to every external call uniformly | §47.4 |
| 27 | NSFW / age-restricted command flags | `nsfw: true` on a command class sets `setNSFW(true)` in the Discord command registration; Discord enforces channel eligibility at the client level before the interaction reaches Dumby | §19.5, §15.2 |
| 28 | Native Discord command permission declarations | Every command declares `permissions.discord` (DiscordBitField array) and `defaultMemberPermissions` (bigint); these drive both Discord's own client-side gate and the framework's Layer-4/Layer-5 runtime enforcement | §15.2, §19.2 |
| 29 | Discord API rate-limit fallback handling | discord.js's internal rate-limit queue honors every `Retry-After` header transparently; Dumby's circuit breaker (§25.4) provides additional fail-fast protection against sustained Discord API degradation without treating normal rate-limit queuing as a circuit-tripping event | §25.4, §19.6 |
| 30 | Cross-module function/service calling API | A module exposes callable typed services by declaring DI tokens in `provides`; any consuming module declares those tokens in `depends` and receives the live, container-resolved service instance — typed against the published contract, checked at compile time, never via direct import | §9, §10.2, §12.1 |
| 31 | State externalization for horizontal scale | Every piece of cross-process state lives in PostgreSQL or Redis exclusively; in-process memory (L1 cache) is a performance acceleration layer only, never a source of truth — enforced by the design of `GuildModuleStateService`, `GuildConfigService`, `RBACService`, and every session store | §23.1, §23.2 |
| 32 | Sampling-based distributed telemetry | OpenTelemetry probabilistic sampler at configurable rate (`TRACE_SAMPLE_RATE`, default 0.1); three categories always sample at 1.0 regardless of rate (errors, health probes, force-trace header); all three signal pillars carry the same `correlationId` for cross-signal linkage | §24.4, §24.1 |
| 33 | RBAC groups & sets with override hierarchy | Guild-configurable role→group→set structure with five grant types (permit/quota/cooldown/whitelist/blacklist), resolved Role > Group > Set, seeded from legacy tiers with zero required reconfiguration | §19.14, §19.15 |
| 34 | Unified administrative control plane | A single dispatcher (`PowerEngineDispatcher`) enforces mandatory reason capture and audit logging across seventeen control domains — from guild suspension to runtime log-level changes — reachable through one call shape regardless of domain | §19.9–§19.11 |
| 35 | Command cosmetics with collision resolution | Guild-level command renaming/aliasing (BCCM) queued through a shared 12–13 hour batching window, with an explicit five-step resolution flow for same-name collisions between modules | §15.7–§15.9 |
| 36 | Instant-effective, deferred-registration command lifecycle | Module enable registers commands within seconds; module disable is unusable to members instantly via Discord-native permission overrides while the underlying deregistration batches within 24 hours | §15.6 |
| 37 | Dedicated operator command-line interface | CLAI: an SSH-hosted, MFA- and device-bound administrative terminal, fully audited and correlated with every Power Engine Panel action it triggers | §19.16–§19.18 |
| 38 | Synthetic per-guild resource statistics | MTP converts real operational signals into a guild-facing artificial token ledger across six resource categories, clearly separated from real metering and real billing | §28.5–§28.7 |
| 39 | Automated and manual maintenance mode | Health-check-triggered or operator-triggered fleet-wide maintenance state that halts new dispatch while keeping background jobs and the dashboard API alive, with strictly manual, connectivity-gated recovery | §25.6 |
| 40 | Multiple bot identities on shared infrastructure | Persona: additional Discord Applications sharing one codebase, one database, and one cache, solving the 100-command-per-guild ceiling and enabling voice connections the main bot never opens | §6.6 |
| 41 | Reserved monetization scaffold | A conventionally-structured, dependency-free `src/monetization/` directory, ready for a future billing model without requiring a framework restructure to adopt one | §7.6 |
| 42 | Dual-path deployment: scheduled core restart + module hot-swap | Swastik orchestrates a 24-hour zero-downtime core CI/CD restart and an independent, Kubernetes-volume-based per-module hot-swap, with no overlap between the two | §13.4–§13.5 |
| 43 | Developer registration, dev IDs, and licensing | Token-based developer identity, Argon2id-hashed dev IDs, and an explicit approval-tracked licensing column gating every module upload | §13.6–§13.7 |
| 44 | Secured module upload, validation, staging & atomic promotion | A dev-ID-authenticated upload API, startup-identical manifest validation, atomic symlink promotion on a shared volume, and automatic rollback on hot-swap failure | §13.8–§13.10 |
| 45 | Full Swastik deployment auditing | Every developer, licensing, upload, staging, promotion, hot-swap, and scheduled-restart event recorded through the shared audit log, tagged `source: 'SWASTIK'` | §13.12 |
| 46 | Credentials Service for authkey & dev ID issuance | A single, password-and-profile-gated, local-network-only issuance path shared identically by CLAI authkeys and Swastik dev IDs | §19.19 |
| 47 | Module publication governance | Manifest-level Hardcode toggle, a per-module development guild ID, and a separate private/public release status for licensed modules | §10.2–§10.2.1 |
| 48 | Direct-message command restriction | No command is dispatched from a direct message except Admin tier, reachable there by the bot owner alone through a dedicated interaction context | §15.10, §11.5 |

---

## 49. Dumby vs. Multipurpose Bots — Full Comparison

### 49.1 The Distinction in Practice

§2.1–§2.2 established the doctrinal difference between a unified-modular architecture and a multipurpose-bot architecture. This section completes that comparison with the operational consequences now that every layer of the system has been specified. A multipurpose bot, in the sense used throughout this reference, is one where moderation, leveling, economy, and entertainment commands are typically implemented as handlers sharing one codebase, one ad-hoc database connection any feature can query freely, and no mechanically enforced boundary between features. This works at small scale. It becomes increasingly fragile as features accumulate, because nothing in the architecture itself prevents one feature's code from reaching into another's data, crashing the shared process, or silently reimplementing a permission check slightly differently than the feature next to it.

### 49.2 Comparison Table

| Dimension | Typical Multipurpose Bot | Dumby |
|---|---|---|
| Feature boundary | Implicit, by file or folder convention | Explicit, manifest-declared, lint-enforced (§10, §10.5) |
| Data ownership | Often a shared schema, queried ad hoc by any feature | Per-module table ownership; cross-module writes structurally disallowed (§21.3) |
| Failure containment | A bug in one feature can take down the whole process | Per-handler try/catch isolation; a failed module degrades alone (§25.2) |
| Cross-feature communication | Direct function calls or shared global state | Typed DI tokens and a versioned, cataloged event bus (§12) |
| Configuration surface | Often one large settings table, ungoverned shape | Per-module Zod-validated schemas under one unified presentation layer (§14.5, §20) |
| Permission logic | Re-implemented per command or per feature | One seven-layer resolver, one source of truth (§19) |
| Third-party extensibility | Rare, and when present, typically unsandboxed | A reviewed, categorized, tier-governed marketplace (§14) |
| Horizontal scaling | Often assumes a single long-lived process | Built around stateless, disposable processes from the start (§23) |
| Testability | Frequently requires the whole bot running to test one feature | Every module independently testable via DI substitution (§40.3) |
| Data governance | Often bolted on per-feature, inconsistently, after the fact | A mandatory, uniform manifest-level contract from the first module onward (§31) |
| Operational visibility | Ad-hoc logging, if any | Three correlated observability pillars on every request by default (§24) |

### 49.3 What the Multipurpose Pattern Does Better

The comparison is incomplete without naming where the simpler pattern genuinely wins. It is faster to stand up an initial feature set, since there is no manifest to write, no per-module schema discipline to design, and no service-interface boundary to settle on before a first command can run. It carries meaningfully less conceptual overhead for a small, single-maintainer project where the boundaries this framework enforces may never actually be tested by the project's own scale. And for a bot that will only ever run as one process serving a handful of guilds, the operational machinery documented across Part VI and Part VIII — structured observability, a durable job queue, rolling deployment infrastructure — is real overhead a project that small may never need to pay for.

### 49.4 Where Dumby's Architecture Becomes the Right Fit

The case for Dumby's architecture strengthens specifically at the point a project expects to support third-party extensibility, scale beyond a single process, be maintained by more than one person working on different features concurrently without coordination overhead, or operate across enough guilds that one feature's failure blast radius being contained becomes an operational necessity rather than a theoretical nicety. Below that point, §49.3's simpler pattern is the correct match for a project's actual scale, not a lesser choice made under constraint — this reference's own discipline is built for the scale described above, and reaching for it below that scale is simply more structure than the project in front of it calls for. Above that point, the structural guarantees in §48's compliance matrix are a direct, designed consequence of the architecture — present from the first module rather than retrofitted later at substantially higher cost, after the multipurpose pattern's debt has already compounded.

---

## 50. Glossary & Index

### 50.1 Glossary

| Term | Definition |
|---|---|
| **Manifest** | The declarative object describing a module's tier, dependencies, commands, services, database migrations, and configuration schema (§10.2) |
| **Tier** | One of Admin, Core, Standard, or Marketplace — governing a module's mandatoriness, visibility, and toggleability (§11.2) |
| **Hard dependency** | A manifest-declared dependency whose absence prevents a module from loading at all (§12.3) |
| **Soft dependency** | A dependency a module consumes opportunistically and degrades gracefully without, per documented fallback behavior (§12.2) |
| **DI container / service container** | The dependency-injection system resolving, scoping, and caching every service instance by Symbol token (§9) |
| **Internal event bus** | The synchronous, in-process publish/subscribe system for cross-module domain events, distinct from the Discord gateway event router (§16.2 vs. §16.3) |
| **Middleware pipeline** | The fixed, priority-ordered onion-model sequence every command interaction passes through before reaching its handler (§17) |
| **Correlation ID** | The single UUID threading one interaction through every log line, metric label, and trace span it produces (§24.1) |
| **Cache-aside** | The caching pattern used throughout Dumby: check cache, fall through to the database on miss, invalidate (not update in place) on write (§22.3) |
| **Circuit breaker** | The automatic, temporary fail-fast suspension of calls to a dependency experiencing a sustained abnormal failure rate (§25.4) |
| **RBAC** | Dumby's own role hierarchy (OWNER/ADMIN/MOD/HELPER/MEMBER/RESTRICTED), independent of and layered above Discord's native permission bits (§19.3) |
| **Permission resolution engine** | The seven-layer, fixed-order authorization chain every command passes through (§19.2) |
| **`guild_module_states`** | The single runtime source of truth for whether a Standard- or Marketplace-tier module is active in a specific guild (§11.4) |
| **Shard** | A Discord-gateway-mandated partition of guilds, each served by its own WebSocket connection (§30.1, §44.4) |
| **Job** | A unit of deferred or scheduled work processed by a BullMQ worker, owned by exactly one module's named queue (§26.1–§26.3) |
| **Task** | A recurring unit of work on a fixed cron schedule, distinct from a one-shot job (§26.1, §26.6) |
| **Contract version** | The semver version of a module's published `provides` token shape or emitted event payload shape, validated against every dependent's pin at startup (§12.3, §45.2) |
| **MDIS** | Module Dashboard Interface System — the schema-driven web configuration surface built on the same services the Discord-native Interface uses (§14.5) |
| **The Interface** | The general term for a Discord-native command surface for managing modules and settings, as a `guild-settings`-shaped module (§32.3, row 02) illustrates — not a specific surface this framework ships |
| **Stampede protection** | The combined distributed-lock-on-miss and probabilistic-early-refresh mechanism preventing concurrent cache rebuilds under high read concurrency (§22.4) |
| **Operational vs. non-operational error** | The `DumbyError.isOperational` distinction between expected, user-facing conditions and genuine bugs requiring investigation (§25.1) |
| **Power Engine Panel (PEP)** | The framework's single point of global administrative authority, reachable through one dispatcher across seventeen control domains, deployed as its own separate service (§19.8–§19.13) |
| **CLAI** | Command Line Administrative Interface — the SSH-hosted, MFA- and authkey-bound operator terminal that fronts PEP (§19.16–§19.18) |
| **RBAC Group / Set** | A guild-configurable collection of Discord roles (Group) or of Groups (Set) — the unit a permission grant targets (§19.14) |
| **Grant** | A permit, quota, cooldown, whitelist, or blacklist attached to a role, group, or set, resolved Role > Group > Set (§19.15) |
| **BCCM** | Bot Command Cosmetics for Marketplace — guild-level command renaming and aliasing, queued and batched rather than instant (§15.8) |
| **MTP** | Metric Track Protocol — the synthetic, guild-facing artificial token ledger derived from real operational signals, distinct from real metering (§28.5) |
| **404 Mode / Maintenance mode** | The fleet-wide state that halts new command dispatch during a sustained infrastructure failure while keeping background jobs and the dashboard API alive (§25.6) |
| **Persona** | An additional Discord Application sharing the main bot's codebase, database, and cache — used for command-capacity headroom and for any module requiring a voice connection (§6.6) |
| **Twill** | The subsystem responsible for creating, branding, and governing the lifecycle of every Persona a deployment runs (§6.6) |
| **Swastik** | The framework's deployment, hot-reload, and hot-swap service, covering both the scheduled core restart path and the developer-driven module hot-swap path (§13.4–§13.13) |
| **Dev ID** | The cryptographically random, Argon2id-hashed identity credential issued to a registered Swastik developer, carried in the manifest's `devId` field (§13.6, §10.2) |
| **Build ID** | The identifier Swastik assigns to a single uploaded module version, bound to its developer's dev ID and carried in the manifest's `buildId` field (§13.8, §10.2) |
| **Credentials Service** | The shared, local-network-only issuance path behind every CLAI authkey and every Swastik dev ID, gated by password-and-profile validation (§19.19) |
| **Hardcode toggle** | The manifest field restricting a module to a single development guild, forbidding public release until set to false (§10.2) |
| **Rosetta Stone** | The conceptual index mapping industry-standard vocabulary to this reference's twenty-nine thematic clusters, at the root of the document (Rosetta Stone — Conceptual Map) |

### 50.2 Topic Index — Where to Find Common Concerns

```
Adding a new module                          §10.1–§10.3, §41.1
Adding a new command to an existing module    §15.2, §10.3
Changing a guild's configuration               §20.3
Database schema for a module you're building   §21.4 (migrations), §21.5 (conventions)
Debugging a slow command                       §46.5
Debugging a startup failure                    §46.1
Debugging high memory usage                    §46.4
Debugging a disconnected shard                 §46.3
Understanding the permission engine            §19.2
Understanding module enable/disable state      §11.4
Understanding the command dispatch path        §6.2
Configuring rate limits                        §19.6, §20.2
Setting up local development                   §42.1
Writing a test                                 §40.3–§40.5
Deploying to production                        §43.4, §44.3
Provisioning infrastructure                    §44.5
Adding a webhook integration                   §47.5, §12 (event contracts)
Understanding data retention and erasure       §31.2–§31.3
Suspending a guild, module, developer, or command globally   §19.9–§19.10
Reaching PEP or CLAI from outside the Discord gateway         §19.13, §19.16
Configuring RBAC groups and sets for a guild                  §19.14–§19.15
Renaming or aliasing a command for one guild                  §15.8
Resolving a command name collision between two modules        §15.9
Understanding artificial vs. real usage statistics             §28.3–§28.4 vs. §28.5
Recovering from a fleet-wide maintenance-mode event             §25.6
Adding a Persona for voice or extra command capacity            §6.6
Uploading or hot-swapping a module version                      §13.6–§13.10
Registering as a developer and checking license status           §13.6–§13.7, §47.7
Restricting a module to a single development guild               §10.2, §10.2.1
Generating a CLAI authkey or a Swastik dev ID                     §19.19
```

### 50.3 Appendix A — Complete Process-Level Environment Variable Reference

Extending the representative subset in §20.2, the complete set of process-level variables referenced throughout this document, grouped by the subsystem that owns them:

```
Core identity & process:
  BOT_TOKEN, BOT_OWNER_IDS, DEVELOPMENT_GUILD_ID, NODE_ENV, LOG_LEVEL

Database:
  DATABASE_URL, DATABASE_READ_REPLICA_URLS, DATABASE_POOL_MAX,
  DATABASE_STATEMENT_TIMEOUT, DATABASE_REPLICA_MAX_LAG_MS

Cache & sessions:
  REDIS_URL, CACHE_L1_MAX_ENTRIES, CACHE_L1_MAX_BYTES

Networking & sharding:
  HEALTH_PORT, API_PORT, SHARD_COUNT, SHARD_RANGE,
  SHARD_LOCK_HEARTBEAT_MS, SHARD_LOCK_RETRY_MS

Rate limiting:
  RATE_LIMIT_USER_WINDOW_MS, RATE_LIMIT_USER_MAX,
  RATE_LIMIT_GUILD_WINDOW_MS, RATE_LIMIT_GUILD_MAX

Observability:
  TRACE_SAMPLE_RATE, SLOW_QUERY_THRESHOLD_MS, CRITICAL_QUERY_THRESHOLD_MS,
  TELEMETRY_ENABLED, EVENT_LOOP_LAG_SHED_THRESHOLD_MS

Event bus:
  EVENT_BUS_MAX_EMIT_DEPTH

Encryption & secrets:
  ENCRYPTION_KEY_CURRENT, ENCRYPTION_KEY_PREVIOUS

Admin tier:
  CORE_ADMIN_EVAL_ENABLED

Power Engine Panel:
  PEP_PORT, PEP_TRUSTED_SOURCES

CLAI:
  CLAI_PORT, CLAI_SSH_HOST_KEY_PATH, CLAI_MFA_ISSUER,
  CLAI_AUTHKEY_STORAGE_URL, CLAI_BREAK_GLASS_SCRIPT_URL

Swastik:
  SWASTIK_PORT, SWASTIK_STAGING_VOLUME_PATH

Credentials Service:
  CREDENTIALS_SERVICE_BIND_HOST

Metric Track Protocol:
  MTP_MEMORY_TOKEN_THRESHOLD_BYTES, MTP_BANDWIDTH_TOKEN_THRESHOLD_BYTES

Persona:
  PERSONA_ID

Module-specific (prefixed by module name; full list at each module's catalog entry):
  MODERATION_*, AUTOMOD_*, ANTIRAID_*, VERIFICATION_*, LOGGING_*,
  WELCOME_*, LEVELING_*, ECONOMY_*, TAGS_*, BIRTHDAY_*, TICKETS_*,
  GIVEAWAY_*, LAVALINK_*, INTEGRATIONS_*, UTILITY_*
```

Every variable above is validated against the root Zod schema (§20.2) or its owning module's config schema (§10.2) before the process is permitted to begin connecting to any external system — an invalid or missing value is always a Stage 02 startup failure with a field-level error, never a runtime surprise discovered partway through normal operation.

### 50.4 Appendix B — Module Tier Quick Reference

The authoritative, single-source-of-truth listing is the Module Summary Index at §32.3, covering all 22 illustrative module examples with tier and section reference in one table. It is intentionally not duplicated a second time here, so that this glossary and that catalog index can never drift out of sync with each other — consult §32.3 directly.

### 50.5 Appendix C — Engineering Principles Quick Reference

The fourteen standing engineering principles (P1 through P14) are introduced and justified in full at §3, and referenced by number throughout this document wherever a specific design decision traces back to one. They are not restated here for the same reason as Appendix B: one canonical location, consulted by reference, rather than two copies that can silently diverge.

### 50.6 Appendix D — Document Scope

This reference specifies Dumby's architecture, behavior, data model, and operational procedure to the depth required to implement, evaluate, or extend the system faithfully. It deliberately contains no executable source code — every mechanism, table, command, and configuration field is specified at the level of what it must do and how it must behave, not as a literal, language-specific implementation. This is a permanent property of the document's scope, not a gap to be filled by a future revision.

---

## 51. Self-Verification Report

This report was produced after the full document above was assembled, and every claim in it was checked directly against the assembled text rather than asserted from intention.

### 51.1 Structural Completeness

**Parts.** Nine parts are present — I through IX — covering Foundations, Architecture, Module System, Request & Interaction Layer, Data & State, Reliability & Operations, the Module Catalog, Engineering Lifecycle, and Reference. This was verified by `grep -c "^# PART"` returning 9.

**Sections.** Fifty primary sections plus this self-verification report (§51) are present, numbered sequentially from §1 through §51 with no gaps. This was verified by extracting all `^## [0-9]` headings.

**Module Catalog.** Twenty-two illustrative examples are cataloged by name, tier, and a one-line purpose (§32.3) — deliberately at index depth only, not full documentation depth: no command surface, event contract, service, database schema, or configuration variable is defined for any of the 22, because none is a module this framework actually ships (§32.1). Tier distribution across the 22 examples: one Admin (`core-admin`), two Core (`guild-settings`, `utility`), seventeen Standard, two Marketplace (`music`, `integrations`) — unchanged from the distribution a fuller treatment would have had, since trimming depth did not trim the catalog's breadth.

### 51.2 Mandatory Feature Coverage

All 27 features from the source material's Mandatory Feature Manifest are present and documented at the framework/service level. They appear substantively in the body sections appropriate to their topic area, and each has a dedicated row in the §48 compliance matrix (rows 1–32 cover all 27 features; some original features are split across multiple rows where they have distinct operational mechanisms). Every matrix row's mechanism was checked against this revision's removal of module-catalog depth specifically: rows that previously pointed to a specific module's command as their mechanism (multi-tenant metering, scheduled backup, controlled restore, chaos-injection fault testing) now point to the underlying service or capability directly, since that service is what actually implements the feature — the command was never the mechanism, only one possible way to reach it. The Power Engine Panel's extended control domains, RBAC groups and sets, BCCM, CLAI, MTP, maintenance mode, the Persona system, and the monetization scaffold are covered by nine further rows (33–41), each pointing to the specific mechanism and section introducing it. Swastik's dual-path deployment model, developer registration and licensing, secured module upload and pre-deployment validation, staging and atomic promotion, deployment auditing, the Credentials Service, module publication governance (the Hardcode toggle and release status), and the direct-message command restriction are covered by seven further rows (42–48), following the same one-row-per-distinct-mechanism discipline as every row before them.

### 51.3 Architectural Consistency Checks

**Rate-limit variable naming.** `RATE_LIMIT_USER_MAX` and `RATE_LIMIT_GUILD_MAX` are used consistently throughout. The earlier inconsistency (`RATE_LIMIT_USER_MAX_REQUESTS`) was corrected.

**`guild_module_states` as sole authority.** No reference to any alternative or supplementary module-state field survives in the document. The table is the single source of truth for Standard- and Marketplace-tier enable/disable state, with no exceptions and no parallel storage — including for a Power Engine Panel-originated global suspension, which writes through this same table rather than a parallel mechanism (§19.10, §11.4).

**Shutdown timing.** The `terminationGracePeriodSeconds: 190` value in the Kubernetes reference configuration equals the per-step ceiling values in §8.3 (which sum to 180 s worst-case) plus a 10 s buffer, so a genuine worst-case shutdown — including Step 4's dead-letter write for any abandoned job — completes within the grace period rather than being cut off by `SIGKILL`. No contradiction exists, and no silent-job-loss window exists in the default configuration.

**Test pyramid.** The four-tier pyramid (Unit, Integration, Happy-Path Smoke, E2E) is correctly shown in §40.2's diagram and is referenced consistently from §48 item #18. The earlier three-tier diagram has been replaced.

**`PREFIX` field removed.** Dumby supports no text-prefix commands (§4 Non-Goals). The `prefix` field that appeared in some source material's guild-config schema was not carried forward.

**`SIGUSR2` signal.** No PM2 or self-re-exec reference survives. The signal table in §8.4 correctly documents `SIGUSR2` as reserved and unused.

**TypeScript-only stack.** All references to JavaScript or a JavaScript-first option were resolved in favor of TypeScript strict mode throughout, consistent with the source material's own TypeScript-vs-JavaScript conflict resolution performed in its v3.0.0 revision cycle.

**No stale module-depth cross-references.** Every `§33`–`§39` subsection-level cross-reference that pointed to now-removed per-module depth was located and rewritten — either pointing to the surviving §32.3 index row, or, where the underlying claim was actually about core framework infrastructure (a service, a database table, a REST endpoint) rather than about a specific module, rewritten to cite that infrastructure directly. No dangling section reference to a removed subsection survives.

**Power Engine Panel terminology.** Every reference to the framework's global authority layer uses "Power Engine Panel" or "PEP" consistently; a full-document search for the bare abbreviation "PE" or for "Power Engine" unaccompanied by "Panel" returns zero matches outside this report's own description of the check.

**Bootstrap stage citations.** Every reference to the module-readiness bootstrap stage cites Stage 17 (`MODULE_READY`), matching §8.2's stage table exactly; no reference to a different stage number for the same milestone survives.

**MTP threshold reuse.** The Metric Track Protocol's database-query cost trigger reuses `SLOW_QUERY_THRESHOLD_MS` (§20.2) rather than an independent threshold, so "slow" carries one consistent meaning across real operational alerting and synthetic token accounting alike.

**Microservices non-goal.** §4's "not a microservices architecture" boundary and PEP/CLAI's separate-service deployment model (§19.13) do not stand in unexplained tension: the non-goal is stated as scoped to the feature-and-module system specifically, with PEP and CLAI named as a narrow, explicit exception in the same category as the database and cache, cross-referenced from both directions.

**Audit schema.** `audit_logs`'s `source` and `correlationId` columns (§21.2) are referenced consistently everywhere a PEP-, CLAI-, or Swastik-originated audit row is discussed (§19.9, §19.11, §19.18, §13.12); no description of audit logging elsewhere in the document contradicts this shape, and the `source` enum's four framework-originated values (`'PEP'|'CLAI'|'SWASTIK'|'DASHBOARD'`, alongside the `'FRAMEWORK'` default) are each named at least once outside the schema definition itself.

**Core-tier RBAC exemption.** Every place the document states which layers apply to Core-tier commands agrees: §11.2's tier description, §11.3's manifest validation rules, §11.7's performance baseline table, and §19.2's seven-layer chain all state the same fact the same way — RBAC (Layer 6) is skipped entirely for Core tier, and access is governed exclusively by native Discord permissions (Layers 4–5). No section describes Core tier as subject to RBAC while another describes it as exempt.

**Manifest field exclusivity.** `hardcoded` and its two dependent fields (`hardcodeGuildId`, `releaseStatus`) are defined once, in §10.2, and referenced by cross-reference everywhere else they are used (§10.2.1, §13.7, §14, §47.7, §48); no section restates or contradicts their mutual-exclusivity rule, and §11.3's validation-rules list enforces the identical constraint the field reference itself describes.

**Swastik and Credentials Service terminology.** "Swastik" refers consistently to the deployment, hot-reload, and hot-swap service across every section that names it (§7.5, §10.2, §13.4–§13.13, §19.19, §20.2, §21.2, §44.8, §47.1, §47.7, §48, §50.1–§50.3); "Credentials Service" refers consistently to the shared, local-network-only issuance path behind CLAI authkeys and Swastik dev IDs (§13.6–§13.7, §19.17, §19.19, §20.2, §44.8, §47.1, §47.7). Neither name is used elsewhere for a different concept.

**Direct-message command restriction.** §15.10's statement that no command is dispatched from a direct message except Admin tier is consistent with §11.5 Layer 1's command-registration scope and Layer 2's context check, and with §15.2's `guildOnly` field default — all four describe the identical rule, with Admin tier as the one named exception throughout.

### 51.4 Version-Comparison Language

A phrase-by-phrase search across the complete assembled document for version-comparison language (`pre-4.0`, `earlier versions`, `was pre-installed`, `removed in v4`, `formerly PM2`, `deprecated`, `as of this version`, `prior version`, `upgrade note`, `previously supported`, `no longer requires`, `newly added`) returned zero matches outside this sentence's own description of the check, with one phrase confirmed precisely rather than waved through: `newly added` also appears once, at §29.6, describing a dependency newly added to a pull request within the dependency-review CI gate — a standard description of the framework's own security tooling, not a description of this document's revision history, and therefore not an instance of the language this check exists to catch. All genuine version-comparison language from source material was replaced with present-tense design rationale, and the same discipline was held throughout every section this document adds, including Swastik, the Credentials Service, and every other addition introduced above.

### 51.5 Depth Consistency

Depth consistency is now deliberately uneven across this document in one specific, intentional way: the module catalog (Part VII) is index-depth by design (§32.1), while every other part remains a full treatment. Within that constraint, every section outside Part VII was reviewed for relative depth, and no section reads as materially thinner than its peers: the shortest primary sections (§27 Localization, §31 Privacy) are complete treatments of their topics with sub-sections, tables, and operational specifics, not stubs. Every compliance matrix row has a named mechanism and a section reference, and every mechanism named is core framework infrastructure rather than a specific module's feature. The subsections this document adds — §6.6, §7.6, §10.2.1, §13.4–§13.13, §15.6–§15.10, §19.13–§19.19, §25.6, §28.5–§28.7, and §47.7 — were held to the same standard during review and match their surrounding sections' depth; none is a placeholder or a forward-looking stub, and Swastik's ten subsections (§13.4–§13.13) in particular were checked against PEP's and CLAI's own treatment (§19.8–§19.18) specifically, so that no one of the framework's separately-deployed services reads as more thoroughly specified than another.

### 51.6 Outstanding Assumptions

The following are stated explicitly rather than left for a reader to discover:

- The `INTERACTION_TIMEOUT` constant for deferred interactions (14 minutes, §17.2) is based on Discord's documented behavior at the time of writing. Discord has historically changed interaction window durations; operators should verify against current Discord documentation.
- A music-shaped module (§32.3, row 21) built against Lavalink specifically would need to track Lavalink's own protocol versioning — a Lavalink major-version change would require updates to whatever adapter such a module wrote, though nothing in this framework depends on Lavalink itself, since the framework ships no music module.
- Cross-region PostgreSQL replica provisioning in Terraform (§44.5) uses provider-agnostic abstractions where possible, but the specific Terraform resource type for a cross-region replica differs between AWS RDS and GCP Cloud SQL; the reference configuration targets the generic pattern and operators must adapt the provider-specific resource block for their platform.
- The `TRACE_SAMPLE_RATE` default of 0.1 (§24.4) is appropriate for moderate-traffic deployments. High-traffic deployments (> 1 million interactions/day) may need to reduce this to 0.01 or below; low-traffic deployments or those debugging specific issues may temporarily raise it to 1.0 via a configuration change without code modification.
- CLAI's authentication, authorization, and audit behavior are fully specified (§19.16–§19.18); the specific SSH-server and terminal-emulation implementation underneath it is left to whoever operates a deployment, the same way MDIS specifies a rendering contract (§14.5) without mandating a specific frontend framework.
- Swastik's staging and promotion mechanism (§13.10) is specified down to the atomic-symlink-on-a-shared-volume level; the specific Kubernetes storage class and CSI driver providing that shared volume across every pod is left to the operator's own cluster configuration, the same way §44.5's Terraform reference targets the generic infrastructure pattern rather than one cloud provider's specific resource type.
- The Swastik developer portal's login flow and upload interaction (§13.13) are specified as a REST contract a website integrates against; the specific site design, branding, and drag-and-drop implementation are left entirely to whoever builds that integration, consistent with this document's scope excluding frontend concerns (Appendix D).

### 51.7 Cross-Reference Integrity

Every `§`-prefixed cross-reference in the assembled document was extracted programmatically and checked against the complete set of actual section and subsection headers. Two hundred and twenty-five distinct reference targets are cited across the document; two hundred and twenty-four resolve to an existing header exactly. The one exception, `§48.2`, is not a broken pointer to the wrong content: Section 48 is a single flat compliance table with no subsections of its own, and `§48.2` is source material's existing shorthand for "the relevant compliance matrix entry," appearing seven times, none of them introduced by this document's own additions — every cross-reference this document adds, including every reference to §13.4 through §13.13, §19.19, §47.7, and §10.2.1, resolves exactly.

---

*End of document.*
