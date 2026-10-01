# DUMBY FRAMEWORK
## Complete Engineering & Implementation Reference

**Document type:** Framework Engineering Reference (no shipping source code — architecture, specification, and illustrative fragments only)
**Project:** Dumby — Discord Unified Modular Bot System
**Document Version:** 5.0.0 — Consolidated Re-Baseline Edition (record in change-log.md)
**Stack:** TypeScript (strict mode) · Node.js LTS ≥ 22 · discord.js v14 · PostgreSQL · Redis · BullMQ · Fastify · Pino/Prometheus/OpenTelemetry
**Scope:** Architecture · Design · Lifecycle · Infrastructure · Security · Operations · Module Catalog (Illustrative Examples) · Power Engine Panel · Administrative Interfaces
**Classification:** Engineering Reference — implementation status is stated per section by the status badges and the Audit Register
**Edition note:** 5.0.0 is a consolidated re-baseline of the entire reference: the core Renderer and buffer-embed presentation model (§20.8–§20.9), the RBAC Layer 6/7 redesign (§21), tier volumes replacing the in-tree module layout (§7.3), the six-state license machine (§15.7), the Compatibility Ledger (§14.4), Global Data Emit as the fifth cross-module pattern (§14.1), the Twixter persona model (§35), and envelope encryption (§32.7). The eleven cross-cutting decisions behind these changes are recorded as ADR-001…ADR-011 (docs/adr/); the three source request records are registered frozen under docs/ur/.
**Sections:** 48 (numbered) + Appendices A–C + the Implementation Status & Audit Register · **Parts:** 0–IX (Part 0 is orientation; Parts I–IX carry the numbered sections) · **Cataloged Module Examples:** 22 (illustrative — none shipped)

---

## TABLE OF CONTENTS

### PART 0 — ORIENTATION

### PART I — FOUNDATIONS

- [1. What Is Dumby](#1-what-is-dumby)
- [2. The Unified Modular Doctrine](#2-the-unified-modular-doctrine)
- [3. Engineering Principles (P1–P14)](#3-engineering-principles-p1p14)
- [4. Non-Goals & Explicit Boundaries](#4-non-goals--explicit-boundaries)
### PART II — ARCHITECTURE

- [5. Technology Stack & Decision Matrix](#5-technology-stack--decision-matrix)
- [6. System Architecture](#6-system-architecture)
- [7. Directory & File Structure](#7-directory--file-structure)
- [8. Application Bootstrap & Lifecycle](#8-application-bootstrap--lifecycle)
- [9. Graceful Shutdown & Signal Handling](#9-graceful-shutdown--signal-handling)
- [10. Dependency Injection & Service Container](#10-dependency-injection--service-container)
### PART III — THE MODULE SYSTEM

- [11. Module Anatomy & Manifest](#11-module-anatomy--manifest)
- [12. Building a Module — A Complete Worked Example](#12-building-a-module--a-complete-worked-example)
- [13. Module Tiers & Lifecycle](#13-module-tiers--lifecycle)
- [14. Inter-Module Communication](#14-inter-module-communication)
- [15. Swastik — Hot Reload & Dynamic Module Management](#15-swastik--hot-reload--dynamic-module-management)
- [16. Marketplace, MDIS & Extension System](#16-marketplace-mdis--extension-system)
### PART IV — REQUEST & INTERACTION LAYER

- [17. Command Framework & Routing Engine](#17-command-framework--routing-engine)
- [18. Event Architecture & Bus System](#18-event-architecture--bus-system)
- [19. Middleware Pipeline & Interceptors](#19-middleware-pipeline--interceptors)
- [20. Interaction & Component Handling](#20-interaction--component-handling)
- [21. Permission & Authorization Engine](#21-permission--authorization-engine)
- [22. Power Engine Panel, CLAI & Credentials Service](#22-power-engine-panel-clai--credentials-service)
### PART V — DATA & STATE

- [23. Configuration Management](#23-configuration-management)
- [24. Database Architecture](#24-database-architecture)
- [25. Caching Architecture](#25-caching-architecture)
- [26. State Externalization & Horizontal Scaling](#26-state-externalization--horizontal-scaling)
### PART VI — RELIABILITY & OPERATIONS

- [27. Observability — Logging, Metrics & Tracing](#27-observability--logging-metrics--tracing)
- [28. Error Management & Fault Tolerance](#28-error-management--fault-tolerance)
- [29. Job Queue & Scheduling](#29-job-queue--scheduling)
- [30. Localization & Internationalization](#30-localization--internationalization)
- [31. Analytics, Telemetry & MTP](#31-analytics-telemetry--mtp)
- [32. Security Architecture & Threat Model](#32-security-architecture--threat-model)
- [33. Performance & Scalability Engineering](#33-performance--scalability-engineering)
- [34. Privacy & GDPR Compliance](#34-privacy--gdpr-compliance)
- [35. Multi-Identity Operation — Twixter & Personas](#35-multi-identity-operation--twixter--personas)
### PART VII — MODULE CATALOG (ILLUSTRATIVE EXAMPLES)

- [36. Catalog Conventions & Illustrative Module Index](#36-catalog-conventions--illustrative-module-index)
### PART VIII — ENGINEERING LIFECYCLE

- [37. Testing Architecture & QA](#37-testing-architecture--qa)
- [38. Developer Experience & Tooling](#38-developer-experience--tooling)
- [39. Development Workflow](#39-development-workflow)
- [40. CI/CD Pipeline](#40-cicd-pipeline)
- [41. Infrastructure & Deployment](#41-infrastructure--deployment)
- [42. Versioning, Release & Migration](#42-versioning-release--migration)
- [43. Troubleshooting & Operational Runbooks](#43-troubleshooting--operational-runbooks)
### PART IX — REFERENCE

- [44. REST API, Webhooks & MDIS Reference](#44-rest-api-webhooks--mdis-reference)
- [45. Mandatory Feature Compliance Matrix](#45-mandatory-feature-compliance-matrix)
- [46. Dumby vs. Multipurpose Bots — Capability Comparison](#46-dumby-vs-multipurpose-bots--capability-comparison)
- [47. Glossary & Topic Index](#47-glossary--topic-index)
- [48. Appendices](#48-appendices)

---

# PART 0 — ORIENTATION

## 0.1 What This Document Is

This is a standalone, developer-facing engineering reference for Dumby, a Discord bot
architecture built around a single governing idea: a bot framework should be **one
coherent application** from the outside and **N independently-owned modules** from the
inside, with a hard, tooling-enforced wall between "coherent" and "monolithic." Nothing
in the pages that follow assumes you have read any other document first. Every
subsystem — bootstrap, the module contract, the permission engine, the data layer, the
deployment machinery — is specified completely: purpose, structure, execution flow,
failure modes, defaults, and the reasoning behind each non-obvious choice.

This reference is organized so it can be read two ways:

- **Front to back**, as a systems-design narrative — each Part builds on guarantees
 established by the Part before it.
- **As a lookup reference**, using the Concept Index (§0.3) or the Glossary & Topic
 Index (§47) to jump directly to the mechanism you need.

Where the source material treated something as a finished decision, this reference
keeps that decision and explains the engineering trade-off behind it. Where additional
depth adds real value to a developer building on top of Dumby — worked examples, fuller
sequence diagrams, explicit edge-case tables — this reference adds it. Nothing here
requires cross-referencing an external document to be understood.

## 0.2 How To Read This Reference

Three reader profiles recur throughout; each has a different honest entry point.

```
READER PROFILE PRIMARY INTEREST START AT
─────────────────────────────────────────────────────────────────────────
Module author "How do I ship one feature safely Part III (§11–§12),
 without learning the whole system?" then Part IV (§17–§21)

Platform / SRE operator "How do I run this in production, Part II (§8–§9),
 scale it, and not get paged at 3am?" Part VI, Part VIII

Framework maintainer / "How does the whole system fit Front to back —
architecture reviewer together, and why these choices?" Parts I → IX in order
```

> **Complexity trade-off:** First-command authors touch 28+ manifest fields,
> 11+ command-class fields, service injection, repository pattern, and middleware
> priorities. Progressive disclosure (P12) is stated but the framework is
> necessarily complex — this is a legitimate but real onboarding trade-off.

> **Length caveat:** This reference is ~988 KB (12,699 lines) — an encyclopedia,
> not a quick reference. Module authors may feel overwhelmed. Layered
> docs with a quick-start separate from the full reference are the
> target state. Use the reader-profile table above to find your entry point.

A module author who only ever reads §11 (Module Anatomy), §12 (Worked Example), §17
(Command Framework), and §21 (Permission Engine) has enough to ship a correct,
well-behaved module. A single-server operator running one process, one database, and
no active/standby redundancy should read Part I for the architecture and can safely
defer the two-approver release gate (§40.4) and on-call assumptions (§43) until — if
ever — the deployment grows into needing them; §41.6's cloud-provider reference table
states plainly which infrastructure tier corresponds to which audience.

> **Note on `directory.md`:** The project structure document (`docs/directory.md`) describes an aspirational target layout. Many directories it specifies (`_template/`, `src/http/middleware/`, `src/db/migrations/core/`, `tests/smoke/`, `tests/e2e/`, `tests/chaos/`, `deploy/terraform/modules/cache/`, `tools/release_manager/`) do not yet exist in the delivered repository subset. Reserved directories are honestly labeled as such.

## 0.3 Rosetta Stone — Conceptual Map

A reader arriving with general backend vocabulary rather than Dumby-specific terms
gets the fastest path to the right section here.

```
CONCEPT LOOKUP TABLE

Middleware / interceptor chain ......... §19 (Middleware Pipeline)
Dependency injection / IoC container .... §10 (DI & Service Container)
Connection pooling ....................... §24.2 (Why PostgreSQL / pooling)
Background job processing ................ §29 (Job Queue & Scheduling)
Observability (logs/metrics/traces) ...... §27 (Observability)
Process-level configuration ............... §23.1 (Configuration Scopes)
Per-tenant (per-guild) configuration ...... §23.3 (Guild Configuration)
Caching layer / cache-aside ............... §25 (Caching Architecture)
Rate limiting & cooldowns ................. §21.5 (Rate Limiting)
Internal pub/sub event bus ................ §18 (Event Architecture)
UI component / interaction routing ........ §20 (Interaction & Components)
Repository / data-access layer ............ §24.3 (Repository Pattern)
Schema migrations ......................... §24.4 (Migrations)
Horizontal scaling / stateless processes .. §26 (State Externalization)
Security hardening & threat model ......... §32 (Security Architecture)
Capacity planning & SLOs .................. §33 (Performance Engineering)
Regulatory / privacy compliance ........... §34 (Privacy & Compliance)
Startup / shutdown lifecycle .............. §8–§9 (Bootstrap & Shutdown)
Admin web dashboard ....................... §16.4 (MDIS)
Plugin marketplace ......................... §16 (Marketplace & Extension)
Testing strategy .......................... §37 (Testing Architecture)
CI/CD & infrastructure-as-code ............. §40–§41 (CI/CD, Infra & Deployment)
Linting / formatting / commit discipline ... §38 (Developer Experience)
Plugin / module architecture .............. §11, §13 (Module Anatomy, Tiers)
Cross-module contracts ..................... §14 (Inter-Module Communication)
Command routing ........................... §17 (Command Framework)
Runtime & language choice ................. §5 (Technology Stack)
Discord SDK / gateway integration .......... §5.6, §17, §20
Design philosophy / first principles ....... §1–§3 (Foundations)
Role-based access control (RBAC) .......... §21.3–§21.7 (RBAC, Groups, Grants)
Global administrative override ............. §22 (Power Engine Panel)
Operator terminal / break-glass access ..... §22.6–§22.8 (CLAI)
Multiple bot identities / voice capacity ... §35 (Twixter & Personas)
Hot reload / zero-downtime deploy .......... §15 (Swastik)
```

## 0.4 System-at-a-Glance

```
FIGURE 0-A — DUMBY IN ONE DIAGRAM

 ┌───────────────────────────────────────────────────────────────────┐
 │ DISCORD PLATFORM │
 │ (Gateway WebSocket · REST API · Interactions API) │
 └──────────────────────────────┬────────────────────────────────────┘
 │ one connection per shard
 ┌──────────────────────────────▼────────────────────────────────────┐
 │ APPLICATION CORE — the "Unified" half of the doctrine │
 │ │
 │ Bootstrap → DI Container → Event Router → Command Router │
 │ Middleware Pipeline → Permission Engine → Config Manager │
 │ Cache Manager → Database Manager → Job Queue → HTTP Server │
 │ │
 │ Exactly one instance of each of the above per process. No │
 │ module ever constructs its own copy of any core service. │
 └──────────────────────────────┬────────────────────────────────────┘
 │ loaded through the Module Registry,
 │ every seam typed and declared
 ┌──────────────────────────────▼────────────────────────────────────┐
 │ MODULE LAYER — the "Modular" half of the doctrine │
 │ │
 │ N independently-owned vertical slices, each with its own │
 │ commands, events, services, repositories, jobs, migrations, │
 │ locales, and tests — visible to each other only through what │
 │ each module's manifest explicitly publishes. │
 └───────────────────────────────────────────────────────────────────┘
 │
 ┌──────────────────────────────▼────────────────────────────────────┐
 │ EXTERNALIZED STATE — PostgreSQL (system of record) + Redis │
 │ (acceleration & coordination). No cross-process state lives │
 │ anywhere else, ever (§26.1). │
 └───────────────────────────────────────────────────────────────────┘

 Parallel, separately-deployed control-plane services (never modules,
 never part of the gateway-connected process):
 • Power Engine Panel (PEP) — global administrative authority (§22)
 • CLAI — operator terminal: a real ssh2 public-key SSH server at src/entry/ssh-clai.ts (§22.6)
 • Swastik — deployment / hot-reload / hot-swap (§15)
 • Credentials Service — shared credential issuance (§22.8)
 • Persona processes — additional bot identities (§35)
```

The two design words carrying the whole system are **Unified** and **Modular**, and
neither is decorative. *Unified* means there is exactly one bootstrap sequence, one
dependency graph, one event bus, one permission engine, one configuration system, and
one operational surface, shared without exception by every feature the framework runs
— including the framework's own administrative tooling, which ships as an ordinary
module rather than as privileged, special-cased code. *Modular* means every unit of
behavior is a self-contained, independently loadable, independently testable,
independently disposable module with a declared contract for everything it needs and
everything it exposes. A system that is modular without being unified degenerates into
a folder of loosely related plugins, prone to drift and silent incompatibility. A
system that is unified without being modular degenerates into a monolith with feature
flags standing in for real isolation. Dumby is engineered to make both failure modes
structurally unavailable rather than merely discouraged — the Application Core (Part
II) enforces unification; the Module Contract (Part III) enforces isolation.

---

# PART I — FOUNDATIONS

---

## 1. What Is Dumby

**Status:** [SPEC]

### 1.1 One-Sentence Definition

Dumby is a **Unified Modular Bot System**: a single TypeScript application runtime —
one process family, one dependency graph, one event bus, one permission engine, one
configuration system — into which independently-authored, independently-versioned,
independently-toggleable **modules** are loaded as the exclusive source of every
behavior the bot exhibits, administrative capability included.

### 1.2 The Load-Bearing Idea

Every other design decision in this reference is a consequence of one rule: **the
framework never special-cases itself.** The commands that let a guild owner enable or
disable features are themselves shipped as a module. The service that persists
per-guild settings is a module. Moderation, welcome messages, logging configuration —
all modules, loaded through the identical manifest contract, the identical DI
container, the identical lifecycle hooks a third-party author would use next year.
There is no privileged, framework-only code path unavailable to a module author. This
is what makes "unified" more than marketing language: the framework's own first-party
behavior is living proof that the module contract is sufficient for *everything*,
because the framework itself is built on nothing else.

```
CONSEQUENCE CHECK — what "no self-special-casing" actually rules out

 ✗ A hidden config table only core code can write to
 ✗ A privileged import path bypassing the DI container
 ✗ An admin command implemented as inline framework code instead of a module
 ✗ A framework-only database connection that ignores repository ownership rules
 ✓ Every one of the above is expressed instead as: a module, a manifest, a
 declared dependency, a typed service contract
```

### 1.3 Vision Statement

A guild's bot should present as one coherent product with one settings
surface — never a federation of plugins an operator has to remember six unrelated
environment variables for. The engineering team behind it, meanwhile, should
experience a set of independently-shippable codebases that never block on each other,
never break each other, and can each be rewritten from zero without anyone else
noticing.

### 1.4 Mission Statement

Provide a TypeScript framework in which shipping the fortieth feature is
exactly as safe, fast, and well-tested as shipping the first — by making isolation,
typed contracts, and observability the default path, not something a disciplined team
must remember to bolt on.

### 1.5 Design Pillars

```
TABLE 1-A — The Seven Design Pillars

┌────────────────────────────┬──────────────────────────────────────────────┐
│ Pillar │ What it means in practice │
├────────────────────────────┼──────────────────────────────────────────────┤
│ Module Sovereignty │ A module owns its commands, tables, jobs, and │
│ │ config schema outright. Nothing outside it │
│ │ reaches into that state without a declared, │
│ │ typed interface. │
├────────────────────────────┼──────────────────────────────────────────────┤
│ Contract Over Convention │ Cross-module interaction happens through │
│ │ manifests, typed DI tokens, and a documented │
│ │ event catalog — never by importing another │
│ │ module's files or guessing its table names. │
├────────────────────────────┼──────────────────────────────────────────────┤
│ Fail Fast, Degrade │ Misconfiguration is caught at boot; the │
│ Gracefully │ process refuses to start half-broken. Once │
│ │ live, one module's failure degrades only │
│ │ the capability it owned — never cascades. │
├────────────────────────────┼──────────────────────────────────────────────┤
│ Observability By Default │ Every command, job, and lifecycle transition │
│ │ emits structured logs, metrics, and trace │
│ │ spans without hand-written instrumentation. │
├────────────────────────────┼──────────────────────────────────────────────┤
│ One Operational Surface │ One Dockerfile, one health endpoint, one │
│ │ metrics endpoint, one config loader, one │
│ │ migration runner — regardless of module │
│ │ count. │
├────────────────────────────┼──────────────────────────────────────────────┤
│ TypeScript as Design │ The module contract, DI container, event bus, │
│ Material │ and command interface are defined so a whole │
│ │ class of integration bug is rejected at │
│ │ compile time, before a test even runs. │
├────────────────────────────┼──────────────────────────────────────────────┤
│ Progressive Disclosure │ A first command touches one file, one │
│ │ interface. A stateful, job-scheduling, │
│ │ cache-backed module has the whole framework │
│ │ available — nothing forced on the simple │
│ │ case. │
└────────────────────────────┴──────────────────────────────────────────────┘
```

### 1.6 What Dumby Is Not

- **Not a no-code bot builder.** Dumby is a code-first framework for engineers writing
 TypeScript modules. A module *can* expose a no-code-style configuration panel to
 guild admins via MDIS (§16.4), but authoring a module itself is not no-code.
- **Not a single-file script.** There is no supported mode where Dumby runs as one flat
 entry file. The module boundary is structural, not a style preference.
- **Not a generic "everything" clone.** Dumby does not ship every conceivable feature
 pre-enabled for every guild; the Standard-tier catalog is curated and every module is
 independently disableable.
- **Not a multi-framework abstraction layer.** Dumby commits to one Discord integration
 library (§5.6) and uses its types and event model directly rather than hiding behind
 a lowest-common-denominator wrapper.
- **Not a SaaS product.** Dumby is a self-hostable framework. Nothing in this reference
 assumes a specific commercial hosting arrangement.

### 1.7 Who Dumby Is For

```
TABLE 1-B — Audience → Fit

┌─────────────────────┬───────────────────────────────────────────────────┐
│ Audience │ Why Dumby's shape fits them │
├─────────────────────┼───────────────────────────────────────────────────┤
│ Platform teams │ Running across hundreds to tens of thousands of │
│ │ guilds; need per-guild toggles, predictable │
│ │ scaling, and a boundary letting many engineers │
│ │ ship in parallel without collisions. │
├─────────────────────┼───────────────────────────────────────────────────┤
│ Module authors │ Internal or third-party; want to build one │
│ (internal/third-party) │ well-scoped feature without learning every other │
│ │ module already loaded. │
├─────────────────────┼───────────────────────────────────────────────────┤
│ Single-server │ Start with a handful of Standard modules and grow │
│ operators │ into a fully-loaded deployment without ever │
│ │ hitting an architectural wall that forces a │
│ │ rewrite. │
└─────────────────────┴───────────────────────────────────────────────────┘
```

---

## 2. The Unified Modular Doctrine

**Status:** [SPEC]

### 2.1 Two Failure Modes This Architecture Refuses

Every bot architecture lands somewhere between two failure modes. Dumby's entire
design reads as a simultaneous refusal of both endpoints — not a balance point between
them, but a structure that rules both out by construction.

```
FIGURE 2-A — The Failure-Mode Spectrum Dumby Refuses

 FAILURE MODE A DUMBY'S POSITION FAILURE MODE B
 "The Monolith" (Application Core enforces "The Plugin Federation"
 Unified, not Modular unification; Module Contract Modular, not Unified
 enforces isolation — both,
 simultaneously, by tooling)

 One giant command One coherent runtime, A core that does
 handler; every file every feature a self- almost nothing but
 imports every other contained module with a load a folder of
 file and a shared declared contract, sharing "plugins," each
 db.ts. Fast to start; the same DI container, reimplementing its
 by feature thirty every permission engine, and event own DB connection,
 PR risks breaking bus — but never reaching config loading, and
 something unrelated. into another module's logger differently.
 No feature can be internals directly. Looks modular on a
 disabled without a code directory listing;
 change and redeploy. no consistent
 permission model
 across "plugins."
```

### 2.2 The Multipurpose Bot Comparison

```
TABLE 2-A — Structural Comparison

┌────────────────────────────┬────────────────────────────┬─────────────────────────────┐
│ Dimension │ Typical Multipurpose Bot │ Dumby │
├────────────────────────────┼────────────────────────────┼─────────────────────────────┤
│ Unit of organization │ Commands grouped by folder │ Modules — self-contained │
│ │ convention only │ vertical slices owning │
│ │ │ commands, events, services, │
│ │ │ data, and config together │
├────────────────────────────┼────────────────────────────┼─────────────────────────────┤
│ Inter-feature boundary │ None enforced; any file │ Enforced at the manifest │
│ │ imports any other file │ level; cross-module access │
│ │ │ requires a declared token │
│ │ │ or event subscription │
├────────────────────────────┼────────────────────────────┼─────────────────────────────┤
│ Disabling a feature │ Comment out code, redeploy │ One per-guild state flip, │
│ │ │ no code change, no redeploy │
├────────────────────────────┼────────────────────────────┼─────────────────────────────┤
│ Database ownership │ One shared schema; any │ Each module owns its tables │
│ │ command queries any table │ exclusively │
├────────────────────────────┼────────────────────────────┼─────────────────────────────┤
│ Parallel engineering │ High collision risk on │ Zero collision risk — │
│ │ shared files │ modules share no files │
├────────────────────────────┼────────────────────────────┼─────────────────────────────┤
│ Failure blast radius │ One feature's bug can crash │ Per-handler isolation; a │
│ │ the whole process │ failed module disables │
│ │ │ itself alone │
├────────────────────────────┼────────────────────────────┼─────────────────────────────┤
│ Permission model │ Re-implemented per command, │ One seven-layer resolver, │
│ │ inconsistently │ one source of truth (§21) │
└────────────────────────────┴────────────────────────────┴─────────────────────────────┘
```

### 2.3 Why "Unified" Specifically Matters at Scale

The unification half of the doctrine is what keeps the system coherent as module count
grows from five to fifty. Without it, a "modular" system quietly re-fragments: module
1 picks one logger, module 2 calls a raw console output, module 3 builds its own
settings command because it never discovered a settings module already existed.
Dumby prevents this through structure rather than a style guide: the Docker image contains only the Application Core — src/core and src/shared — with every module living on the per-tier volumes and reaching a pod exclusively through Swastik promotion (§7.3), reducing the image from ~500MB to ~50MB; the only logger a module can obtain is the one the DI container hands it at load time; the only way to
persist per-guild configuration is through the guild-settings surface's declared
service, because no module is ever handed a raw, ungoverned database handle for that
purpose. Unification here is not a request for consistency — it removes the
alternative entirely.

## 3. Engineering Principles (P1–P14)

**Status:** [SPEC]

These are the standing rules every part of the system — core and module alike — is
designed against. Later sections cite these by number whenever a specific
architectural choice traces back to one of them; treat this section as the constitution
the rest of the reference is case law for.

```
P1 — EXPLICIT OVER IMPLICIT
 Nothing is auto-detected by filename magic where a manifest field could say
 it explicitly. A command is a command because the manifest lists it, not
 because it lives in a folder named commands/. The manifest is a complete
 table of contents for a module without opening a second file.

P2 — MODULE SOVEREIGNTY
 A module's tables, internal services, and private state belong to it alone.
 Other modules — and the core — interact with them only through what the
 manifest explicitly provides. Enforced by lint rule (no cross-module
 relative imports) and by the repository pattern, which makes a direct query
 against another module's table structurally awkward to even attempt.

P3 — SINGLE RESPONSIBILITY AT EVERY LAYER
 Not just "a module does one thing" — a command class only routes and
 validates, a service only holds business logic, a repository only talks to
 the database. This layering is uniform across every module regardless of
 size, which is what makes jumping into an unfamiliar module fast.

P4 — FAIL FAST AT STARTUP, RECOVER GRACEFULLY AT RUNTIME
 Every config value, manifest, and dependency edge is validated before the
 gateway connection opens. A bad value exits the process with a specific,
 actionable error. Once healthy, a transient failure is retried and
 contained — never allowed to crash the whole process if it can be
 isolated.

P5 — OBSERVABILITY IS NOT OPTIONAL
 A module author cannot ship a command without it automatically getting a
 trace span, a duration metric, and structured log entries on entry,
 success, and failure — wired into the command router and job processor
 base classes, never left to per-module discipline (§27).

P6 — OPEN FOR EXTENSION, CLOSED FOR MODIFICATION
 Extending the system means writing a new module or subscribing to an
 existing event. It never means editing the core or another module's
 source. The Marketplace tier (§16) and the documented event catalog (§18)
 exist specifically so "the bot needs one more thing" never requires a
 core pull request.

P7 — SECURITY BY DEFAULT
 The permission engine defaults to deny. A new command with no explicit
 permission declaration is reachable by nobody but the bot owner until a
 permission is set. Secrets are never logged (enforced by the structured
 logger's redaction list, §27.2). A module cannot request intents or
 permissions beyond what its manifest declares.

P8 — TEST IN ISOLATION, DEPLOY WITH CONFIDENCE
 Because every module declares dependencies through DI tokens rather than
 importing concrete classes, every unit test substitutes mocks for those
 tokens with no real database or Discord connection. Integration tests then
 verify the seams (§37).

P9 — CONFIGURATION WITHOUT CODE
 Anything an operator or guild admin should reasonably change — a
 threshold, a channel ID, a cooldown — is a typed, validated configuration
 value, never a constant requiring a code change and redeploy (§23).

P10 — DATA INTEGRITY OVER CONVENIENCE
 Every schema change ships as a versioned, reversible migration (§24.4).
 Destructive operations go through explicit confirmation and audit-logging
 even when triggered programmatically. No module gets a "just delete the
 row" shortcut that bypasses the audit trail.

P11 — DEPRECATION OVER BREAKING CHANGE
 A module's public contract — its provided tokens, emitted events, command
 names — is versioned semver-style. Changing the shape of a provided token
 or event is a major-version bump with a documented deprecation window, not
 a silent break (§42).

P12 — PROGRESSIVE DISCLOSURE OF COMPLEXITY
 The minimal module — one command, no state — touches exactly one file and
 one interface. A module needing a table, a background job, a cache layer,
 and cross-module event subscriptions has all of that available through the
 same manifest shape, just with more fields populated. No boilerplate is
 required for capabilities a module doesn't use.

P13 — ONE SOURCE OF TRUTH PER CONCERN
 Exactly one place resolves permissions (§21), exactly one place resolves
 configuration (§23), exactly one place holds a module's per-guild
 enabled/disabled state (`guild_module_states`, §13.4). Duplication of
 authority across subsystems is treated as a design defect, not a
 convenience.

P14 — FREEDOM BY DEFAULT, AUTHORITY BY EXCEPTION
 The framework's capacity for total control — up to and including the
 Power Engine Panel's ability to suspend any guild, module, developer, or
 command globally, and reach every other core subsystem besides (§22) — is
 never exercised as routine operation. A module's behavior, a guild's
 configuration, a developer's design choices are not constrained by the
 framework merely because the framework has the technical power to
 constrain them. Every capability P14 governs exists as a deliberate,
 logged intervention available for cause (abuse, security compromise,
 confirmed policy violation) — never as an ambient enforcement layer a
 module author or guild admin needs to design around.
```

**Reading P1–P14 as a system, not a list.** The fourteen principles are not
independent — they resolve into three clusters that reinforce each other. P1, P2, P3,
and P13 are about **where authority for a decision lives** (always exactly one place,
always declared rather than inferred). P4, P5, P7, and P8 are about **what the system
guarantees automatically**, so correctness and visibility are not something a module
author has to remember to add. P6, P9, P11, P12, and P14 are about **how the system
grows without becoming unsafe to change** — extension, configuration, and authority
are all designed to expand a deployment's capability without ever requiring a rewrite
of what already works. P10 sits slightly apart, guarding the data layer specifically,
because data-integrity mistakes are the one category of bug this architecture cannot
undo after the fact the way it can roll back a bad deploy.

---

### P12 — Progressive Disclosure of Complexity

The developer-experience rule: start minimal, grow on demand. The `_template` module provides the smallest correct starting point and the manifest supports progressive field addition — a module author writes the minimal manifest first and adds commands, events, jobs, and dashboard schema only as the module grows (`modules/_template/`, `modules/manifest.schema.ts`).

### Fail-Fast / Security-by-Default / Explicit Contracts — the Swastik Alignment Gap

The standing rule is fail-fast validation at startup, security-by-default, and explicit contracts. Swastik is currently misaligned with these principles (trust-based checks, late failures); the target is shift-left, fail-fast, crypto-verified validation across the Swastik pipeline.

Docker Compose (`apps/main/docker-compose.yml`) exposes ports 8080/8081/8082, while the Kubernetes base manifests (`deploy/k8s/base/configmap.yaml`, `deploy/k8s/base/service.yaml`) use 3000/9090/9091. This discrepancy exists because the K8s ConfigMap is production-shaped. Operators must use the documented port mapping when curling health endpoints locally vs. in-cluster. Ports should be env-driven (`PORT`, `HEALTH_PORT`) to avoid hardcoding.

Developer registration via `entry/swastik.ts` must implement a formal licensing gate beyond the `approvalStatus` column. The workflow must include license validation and multi-state approval (pending → license-verified → approved/rejected). The current `approvalStatus` column alone does not constitute a formal approval workflow with licensing verification.

- ** Build from SHA (never branch head), cosign signing, SBOM, provenance, digest pin. The specification requires: ** Build from immutable Git SHA; registry/dumby@sha256; SBOM; cosign; provenance; metadata in PostgreSQL.

- ** Renewable Redis lease + PostgreSQL durable record; fencing tokens; heartbeat; lock/unlock API. The specification requires: ** Redis key drm:core-release:lease:{env}, TTL 30s, heartbeat 10s, fencing token; lock/renew/unlock API; queue valid uploads; defer scheduled restart.

- ** Rolling (default maxUnavailable:0,maxSurge:1), blue-green with shard handoff, phased ramp, DAG workload ordering. The specification requires: ** Selectable strategies; DAG order: expand-only migrations→workers→main bot→personas→reconciliation.

- ** Canary: error rate (<2% target, ≥5% critical), P95 (<3000ms, ≥5000ms critical), shard/queue/cache/DB health; min-sample guard; external-dep correlation. The specification requires: ** Prometheus-based canary with differential analysis and external-dep correlation.

- ** Config diff, expand-only migrations, advisory lock, migration ledger. The specification requires: ** Config validation against root schema; additive safety; expand-only migrations; advisory lock; migration ledger in deployment record.

- **Intent:** Zero-downtime core deploys.
- **Purpose:** Never drop capacity during rolling update.
- Deployment/dumby: 2 replicas, rolling update maxSurge 1 / maxUnavailable 0, `terminationGracePeriodSeconds: 190`, runAsNonRoot uid 1000; startup/liveness/readiness probes on health port; HPA 2–10 on CPU 70%/mem 80%; SA `automountServiceAccountToken: false`.
- The system maintains this; pair with gateway session resume.

- **Intent:** Confirm the background job subsystem.
- **Purpose:** Establish queue as delivered Tier-2.
- queue-manager.ts (182L) + autoscaler.ts (86L): Queue/Worker/QueueEvents, removeOnComplete (1hr/1000), removeOnFail:false, 5 attempts exponential backoff, idempotencyKey, pause/resume/retryFailed/deleteJob, DLQ monitor; tests exist.
- Address the single-Redis single point of failure.

## 4. Non-Goals & Explicit Boundaries

**Status:** [SPEC]

Boundary clarification (live config override): runtime policy enforcement is internal to the framework. The Effective Config Descriptor's live policy overrides are applied by the framework's own policy-enforcement dispatcher (PowerEngineDispatcher) at evaluation time; an external Policy-Enforcement-Point service issuing live configuration overrides is not a framework component and has no sanctioned channel for injecting overrides into a running deployment.

Naming what this framework will not try to solve is as load-bearing as naming what it
does. Each boundary below is a deliberate scope decision, not an item deferred to a
future version.

```
TABLE 4-A — Non-Goals and Their Rationale

┌───────────────────────────────┬───────────────────────────────────────────────┐
│ Non-Goal │ Rationale │
├───────────────────────────────┼───────────────────────────────────────────────┤
│ Text-prefix commands │ Slash commands, user-context menus, and │
│ │ message-context menus are the complete │
│ │ interaction surface. A module may scan message │
│ │ content for a declared, legitimate purpose but │
│ │ may never parse a leading token out of that │
│ │ content and dispatch it as a simulated prefix │
│ │ command — there is no loophole version of this │
│ │ non-goal; review treats a module found doing │
│ │ this as a rejected submission (§16.5), not a │
│ │ style note. │
├───────────────────────────────┼───────────────────────────────────────────────┤
│ General message-content │ The framework does not hold a broad │
│ scanning │ message-content grant for general parsing. │
│ │ A module needing content for a specific, │
│ │ documented purpose declares the intent │
│ │ explicitly and its use is flagged in manifest │
│ │ review. │
├───────────────────────────────┼───────────────────────────────────────────────┤
│ A shipped, built-in web UI │ MDIS (§16.4) is a schema-driven contract a │
│ │ module declares against; the framework ships │
│ │ the rendering contract and a generic renderer, │
│ │ never a pre-built React/Vue application on top │
│ │ of it. │
├───────────────────────────────┼───────────────────────────────────────────────┤
│ A real-time collaboration │ Dumby processes Discord interactions. It is not │
│ platform │ a general-purpose WebSocket server or a │
│ │ low-latency collaborative-editing backend. │
├───────────────────────────────┼───────────────────────────────────────────────┤
│ A code generator as core │ The scaffolding CLI (§38.1) is developer │
│ functionality │ convenience, not core functionality — the │
│ │ framework behaves identically whether a module │
│ │ was scaffolded or hand-authored. │
├───────────────────────────────┼───────────────────────────────────────────────┤
│ A "zero-config" system │ An explicit manifest per module, explicit DI │
│ │ token declarations, and explicit migration │
│ │ files are required (P1). This trades a slightly │
│ │ higher authoring cost for dramatically lower │
│ │ operational surprise at runtime. │
├───────────────────────────────┼───────────────────────────────────────────────┤
│ A replacement for │ Dumby runs inside infrastructure — PostgreSQL, │
│ infrastructure │ Redis, a container orchestrator. It requires │
│ │ these; it does not abstract or provide them. │
│ │ The Terraform and Kubernetes references (§41) │
│ │ describe a reference deployment, not a built-in │
│ │ provisioning system. │
├───────────────────────────────┼───────────────────────────────────────────────┤
│ A microservices architecture │ One deployable application, one process │
│ │ boundary per shard group — not a constellation │
│ │ of independently deployed services. Modules │
│ │ isolate through code-level contracts (§14) and │
│ │ in-process tooling (§11.5), never through │
│ │ separate deployments or network calls between │
│ │ modules. The Power Engine Panel and CLAI (§22) │
│ │ are a narrow, named exception — operator-facing │
│ │ control-plane tooling outside the │
│ │ feature-and-module system entirely, in the same │
│ │ category as the database and cache the │
│ │ application already depends on, not a pattern │
│ │ this non-goal invites modules to imitate. │
└───────────────────────────────┴───────────────────────────────────────────────┘
```

**Why boundaries are specified this precisely.** A framework that states "we don't do
X" without stating the exact shape of X invites a module author to reach the same
outcome through a side door — a message-content scanner that simulates prefix commands
technically avoids "the framework ships a prefix-command parser" while recreating
everything that non-goal exists to prevent. Every non-goal above is stated at the level
of the *outcome* it forbids, not merely the mechanism, specifically to close that kind
of loophole.

Boundary: executing untrusted module code during validation is a non-goal. Swastik must never import an uploaded module to read its manifest — import executes arbitrary code inside the validation process. Manifest reading is static AST extraction and validation runs sandboxed, so an uploaded module cannot harm the validation process itself.

### Known Single Point of Failure — BullMQ's Redis Instance (Open Item)

The single Redis instance backing BullMQ queues is a single point of failure; it is tracked as an open item in the legacy ADR record, and the pg-boss PostgreSQL fallback is deferred to V2. The companion open item is that modules load in-process with no runtime sandbox. Affected components: QueueManager and the autoscaler.

### The Control-Plane Exception to the Microservices Non-Goal

The microservices non-goal carries one narrow, named exception: five separately-deployed control-plane services (bot, Swastik, Power Engine Panel, CLAI, Credentials). These are control-plane infrastructure in the same category as the database itself — not a general decomposition of business logic into services. §4 and §22 state this jointly, and the framing should stay honest about the exception's narrowness.

### Four Enforcement Layers Against Prefix Commands

The 'no text-prefix commands' non-goal is enforced at four layers, and every ingestion surface the framework operates is covered by at least one of them: (1) architecture — no text-command registration system exists, no `textPrefixes` field exists, and `ICommand` requires an interaction-shaped context, so the register-and-dispatch seam a prefix system needs is simply absent; (2) lint/CI — the flat ESLint ruleset rejects prefix-shaped parsing at compile time, and the same rules run inside the Swastik trusted build over uploaded TypeScript source, so a module cannot compile past the ban by skipping local checks; (3) the marketplace review pipeline — Gate 1's automated analysis and Gate 3's manual security review both treat simulated prefix dispatch as a rejected submission, including for new ingestion surfaces such as repository-triggered deployments (§15.12), which pass through the identical gates before any code is staged; (4) runtime dispatch — the CommandRouter only accepts Discord Interactions, so a prefix-shaped payload has no code path to reach even if every earlier layer were bypassed. The rendered surface is covered by construction as well: the Renderer emits only interaction responses (§20.8), so there is no presentation path through which a simulated prefix reply could be issued. Each layer's coverage is kept under review as new ingestion surfaces are added, so the boundary has no side door.

### Four Enforcement Layers Against Classic Embeds

The companion non-goal — no hand-built classic embeds — bans `EmbedBuilder` and `MessageEmbed` from module code with the identical four-layer structure as the prefix-command ban (ADR-001, docs/adr/): (1) architecture — `ICommand.execute` returns a declarative response consumed by the core Renderer (§20.8), so no code path exists through which a module could construct and send a raw embed payload; (2) lint/CI — the `no-embed-builder` rule (§38.4) rejects any import of `EmbedBuilder`/`MessageEmbed` in module source, enforced locally and inside the Swastik trusted build; (3) the marketplace review pipeline — an import that slips past the automated gate fails Gate 1's artifact scan and Gate 3's manual review identically to a prefix-command violation; (4) runtime dispatch — the Renderer is the only constructor of Discord payloads on the response path, and it emits Components v2 exclusively. A migration window applies to first-party and community modules during the Phase 2 rollout, after which all four layers are enforced without exception.

### Direct discord.js, No Wrapper

discord.js v14 is used directly — no wrapper layer. The wrapper's usual job of hiding platform constants is instead handled by keeping numeric constants (sharding threshold, interaction response window, etc.) configurable in `apps/main/src/discord/client-builder.ts`. Maintain the no-wrapper boundary and keep platform constants configurable.

### Knex, Not an ORM

The data layer uses Knex.js directly — no ORM, no active-record entities. Repositories issue SQL through Knex (`apps/main/src/db/repositories/base.repository.ts`), keeping queries explicit and reviewable. Maintain this boundary.

# PART II — ARCHITECTURE

---

## 5. Technology Stack & Decision Matrix

**Status:** [SPEC]

Every technology choice below is stated explicitly and justified; a team adopting this

### 5.1 Exteriority Axiom — Separately-Built Control-Plane Services

The Release Manager is an external, separately-built, separately-deployed control-plane service. It must never live inside `/dumby/src/entry/` — doing so creates a circular bootstrap dependency (deploying Dumby would require deploying the deployer). Release Manager owns its own repository, Docker image, K8s manifests, and CI/CD pipeline. Canonical entry: `/dumby-release-manager/src/entry/release-manager.ts` (monorepo variant: `/platform/release-manager/src/entry/release-manager.ts`). Paths `/dumby/src/entry/release-manager.ts` and `/dumby/dist/entry/release-manager.js` are forbidden. The Release Manager is also the deploy path's system of record: every deployment change it applies is committed back to the Git system-of-record (reverse GitHub sync), so the repository never drifts from the running cluster state.
architecture substitutes none of them without documenting why in the same style as this
section.

### 5.2 Runtime — Node.js LTS ≥ 22

Node's event-driven, non-blocking I/O model maps naturally onto an interaction-driven
workload: the process is almost always waiting on I/O (Discord gateway, database,
cache) rather than doing CPU-bound work. LTS releases guarantee a defined active
support window aligned with the framework's own version policy. Node 22 is the floor
specifically for native `fetch`, structured-clone support, and stable top-level
`await` in ESM — all load-bearing for the bootstrap and module-loading design in §8.

### 5.3 Language — TypeScript, Strict Mode, Non-Negotiable

Strict mode (`"strict": true`, plus `"exactOptionalPropertyTypes": true` and
`"noUncheckedIndexedAccess": true`) is enforced project-wide as the production stack,
not a future option. The manifest schema, the DI container, the command class

### 5.4 Persistent Volume Claim for Module Storage — Four Per-Tier Volumes

Module storage is organized as four per-tier volumes plus a staging volume —
`modules-admin`, `modules-core`, `modules-standard`, and `modules-marketplace`
(the live, served module sets, one per tier), and `swastik-staging` (incoming
uploads, validation, build). Tier-at-rest is enforced: a module's files live on
the volume matching its manifest-declared tier, and Swastik refuses to stage or
promote a module whose declared tier and target volume disagree (ADR-005,
docs/adr/). The in-tree `src/modules/` layout does not exist — every module,
including first-party ones, is seeded onto its tier volume through the normal
promotion pipeline (§15.8), which is what keeps first-party and community
modules on the identical delivery, validation, and audit path. All volumes are
`ReadWriteMany` (EFS/NFS) for multi-replica access; EBS block store is not used
for module storage. This split enables instant hot-swaps, guild-specific module
sets, and per-tier isolation without any hardcoded module list in the image.
Avoid on single-node hostPath clusters.

### 5.5 Per-Module Process Sandbox Isolation

No module shares a process with core or any other module. Every module runs in
its own sandboxed worker (separate process/container, own CPU + memory quota),
talking to core over a narrow RPC interface, with permission scope and resource
limits enforced at the sandbox boundary. This replaces the current in-process
`swastik-loader.ts` dynamic import and is the main structural change that makes
hot-swap safe and reliable. Trade-off: IPC overhead vs in-process calls.

interface, the event catalog, and the repository layer are all defined using types and
generics specifically so the compiler catches integration bugs at authoring time rather
than at runtime. Module uploads are TypeScript source, not compiled JavaScript: the Swastik
Zero-Trust Build Pipeline compiles and validates uploaded `.ts` before staging.
Compiled `.js` uploads are rejected at intake. `tsc` remains a mandatory,
first-position CI gate before lint, test, or deploy. The Application Core is open-source: its
source is public, while the Marketplace and confirmed-developer submission
pipeline remain gated. Closed-source, confirmed-developer-only distribution is
superseded by an open core with a gated marketplace.

```
MODULE FORMAT & TOOLING
 Module format : ESM ("type": "module", "module": "NodeNext")
 Package manager : pnpm, lockfile committed, CI runs --frozen-lockfile
 require : never used anywhere in the codebase

 Docker image : contains ONLY the Application Core; no modules baked in.
 The CI build is split so the core image and module artifacts
 are produced and versioned independently.

 Module source : external Kubernetes volume (`MODULES_DIR`), not baked into
 the Docker image; the image contains only the Application Core.

```

### 5.6 Discord Integration — discord.js v14, Used Directly

### 5.7 a Open Core, Gated Marketplace

The Application Core is open-source. The Marketplace and the confirmed-developer
submission/review pipeline remain gated — open core, gated marketplace. This
supersedes the closed-source, confirmed-developer-only model.

discord.js v14 is the single Discord integration library, used directly rather than
hidden behind a generic Discord-client abstraction — its `Client` class,
`GatewayIntentBits`, `Partials`, `SlashCommandBuilder`, and `Interaction` type
hierarchy are the types module authors work with everywhere. This is a deliberate
choice, not a lazy default: discord.js is the dominant TypeScript-compatible Discord
library with a stable, actively maintained type system, which is exactly what makes
committing to its types directly — rather than behind a wrapper no module author asked
for — the design that serves a module author best.

**Privileged-intent whitelist.** The intents a deployment may request are
whitelisted: `MessageContent`, `GuildMembers`, and `GuildPresences` are rejected
with a `ConfigurationError` at bootstrap Stage 02 (§23.2) when present in any
module's manifest `intents` array or the process configuration — the platform's
zero-knowledge slash-command posture (§4) is enforced, not assumed. Non-privileged
intents pass without ceremony.

**Discord the platform, not discord.js the library, is what this architecture is
engineered to absorb change from.** Every numeric constant this reference treats as a
design parameter — the sharding threshold (§33.1), the interaction response window
(§19.2), privileged-intent gating (§4) — is expressed as configuration precisely
because it is a Discord *platform policy*, not a design decision of this framework, and
Discord has changed each category of constant before. The message-content non-goal in
§4 exists specifically because Discord itself restricted that intent, and it is the
working model for the next platform change of the same shape: a policy change becomes
a configuration or manifest-level adjustment (a new environment variable, a changed
default, a newly required intent), never a rewrite, because every one of these values
is deliberately kept external to the architecture rather than assumed as a structural
constant. The gateway connection model and the commitment to slash commands as the
interaction primitive are the two structural foundations everything else rests on;
every other Discord-platform detail is treated as configuration.

### 5.8 Data Storage — PostgreSQL (System of Record) + Redis (Acceleration)

```
TABLE 5-A — Storage Role Separation

┌─────────────┬───────────────────────────────────────────────────────────┐
│ Store │ Role │
├─────────────┼───────────────────────────────────────────────────────────┤
│ PostgreSQL │ Sole system of record. JSONB for per-guild config blobs │
│ │ without sacrificing relational integrity elsewhere. ACID │
│ │ transactions for multi-table writes. Row-level locking │
│ │ (SELECT FOR UPDATE) against concurrent double-actions on │
│ │ the same target. LISTEN/NOTIFY for cross-process cache │
│ │ invalidation signaling. │
├─────────────┼───────────────────────────────────────────────────────────┤
│ Redis │ L2 cache, BullMQ queue backing store, cross-shard pub/sub. │
│ │ Explicitly not the primary data store — its role is │
│ │ acceleration and coordination. Any data whose loss would │
│ │ be user-visible lives only in PostgreSQL. │
└─────────────┴───────────────────────────────────────────────────────────┘

Query builder: Knex.js — not an ORM. No active-record entities. The repository
pattern (§24.3) is the only abstraction over the database and issues SQL through
Knex rather than string concatenation. Knex's migration system handles all schema
management (§24.4).
```

### 5.9 Job Queue & Scheduling — BullMQ

BullMQ provides durable, Redis-backed job queues with per-job retry policies,
dead-letter routing, delayed jobs (scheduled mutes, timed close events, reminder
firing), and rate-limited queues. It is chosen over an in-process scheduler
specifically because it survives process restarts: a job enqueued for 24 hours from
now still fires even if the process restarts three times in the interim. Cron-style
recurring work (§29.6) wraps BullMQ's repeatable-job mechanism behind a distinct API,
since recurring tasks and one-shot jobs have different authoring models and should
never be conflated. Cron parsing is BullMQ's own: no `cron-parser` dependency exists
in the tree — recurring schedules are expressed as repeatable-job patterns, and a
dependency whose only consumer was retired is removed with it.

### 5.10 Observability Stack — Pino, Prometheus, OpenTelemetry

```
Logging — Pino : structured JSON to stdout; lowest per-log overhead of Node
 logging libraries; child-logger scoping pre-binds traceId,
 guildId, moduleId to every log line in a request's call stack
Metrics — prom-client: command counters, latency histograms, queue depth, cache
 hit/miss ratios, DB pool usage — all exposed as Prometheus
 text format from /metrics
Tracing — OpenTelemetry SDK: a root span per command execution; child spans for
 every DB query above the slow threshold, every job
 invocation, every outbound HTTP call; OTLP export to any
 compatible backend (Jaeger, Tempo, Honeycomb, Datadog APM)

All three pillars carry the same traceId — cross-signal correlation is a lookup,
never a time-based approximation (§27.1).
```

### 5.11 Configuration & Validation — Zod

All configuration — process-level environment variables and every module's own schema
— validates against Zod schemas during bootstrap Stage 02 (§8.2). A value failing its
schema exits the process with a precise, field-by-field error before any module loads
or any gateway connection is attempted. There is no "handle missing config at runtime"
pattern anywhere in this architecture.

### 5.12 Development & Quality Tooling

```
TABLE 5-B — Tooling Reference

┌───────────────┬───────────────────┬───────────────────────────────────┐
│ Tool │ Version │ Purpose │
├───────────────┼───────────────────┼───────────────────────────────────┤
│ TypeScript │ ^5.5 │ Primary language, strict mode │
│ ESLint │ ^9.x (flat config) │ Linting, module-boundary enforcement│
│ Prettier │ ^3.x │ Formatting, CI --check gate │
│ Vitest │ ^2.x │ Unit + integration test runner │
│ pnpm │ latest stable │ Package manager │
│ tsx │ ^4.x │ Dev-time TS execution, no build step│
│ Husky │ ^9.x │ Git hook management │
│ commitlint │ ^19.x │ Conventional Commit enforcement │
│ changesets │ ^2.x │ Changelog generation & release coord│
└───────────────┴───────────────────┴───────────────────────────────────┘
```

### 5.13 Infrastructure & Deployment Targets

```
TABLE 5-C — Infrastructure Stack

┌───────────────────┬─────────────────────────┬──────────────────────────┐
│ Concern │ Technology │ Notes │
├───────────────────┼─────────────────────────┼──────────────────────────┤
│ Containerization │ Docker │ Multi-stage build │
│ Orchestration │ Kubernetes │ Primary production target │
│ Infra-as-code │ Terraform │ PostgreSQL, Redis, cluster │
│ Secrets │ Sealed Kubernetes Secrets │ No plaintext in manifests │
│ │ (or Vault / cloud manager)│ or committed env files │
│ CI/CD │ GitHub Actions │ Five workflows (§40) │
└───────────────────┴─────────────────────────┴──────────────────────────┘
```

---

## 6. System Architecture

**Status:** [SPEC]

### 6.1 Layered View

```
DIAGRAM 6-A — Full Layered View

┌────────────────────────────────────────────────────────────────────────┐
│ DISCORD GATEWAY & REST API │
│ (one WebSocket connection per shard, via discord.js) │
└─────────────────────────────────┬────────────────────────────────────────┘
 │ GatewayIntentBits = union of every
 │ loaded module's declared intents
┌─────────────────────────────────▼────────────────────────────────────────┐
│ APPLICATION CORE │
│ ┌───────────┐ ┌───────────┐ ┌──────────────┐ ┌────────────────┐ │
│ │ Bootstrap │ │ DI Container│ │ Event Router │ │ Command Router │ │
│ └───────────┘ └───────────┘ └──────────────┘ └────────────────┘ │
│ ┌───────────┐ ┌───────────┐ ┌──────────────┐ ┌────────────────┐ │
│ │ Config │ │ Logger │ │ Middleware │ │ Permission │ │
│ │ Manager │ │ (Pino) │ │ Pipeline │ │ Engine (7-layer)│ │
│ └───────────┘ └───────────┘ └──────────────┘ └────────────────┘ │
│ ┌───────────┐ ┌───────────┐ ┌──────────────┐ ┌────────────────┐ │
│ │ Cache │ │ Database │ │ Job Queue │ │ HTTP Server │ │
│ │ Manager │ │ Manager │ │ (BullMQ) │ │ (Fastify) │ │
│ └───────────┘ └───────────┘ └──────────────┘ └────────────────┘ │
└─────────────────────────────────┬────────────────────────────────────────┘
 │ loaded through the Module Registry
┌─────────────────────────────────▼────────────────────────────────────────┐
│ MODULE LAYER │
│ N independently-owned modules, each Admin / Core / Standard / │
│ Marketplace tier, each with its own commands, events, services, │
│ repositories, jobs, migrations, locales, and tests │
└────────────────────────────────────────────────────────────────────────┘
```

Every box inside the Application Core exists exactly once per process. No module ever
constructs its own database pool, its own cache client, or its own logger — every one
of those instances is handed to it by the DI container (§10), which is what makes "one
operational surface regardless of module count" (Pillar 6, §1.4) a structural property
rather than a discipline.

### 6.2 The Full Command Interaction Trace

This is the full path a slash command takes from a user's keypress to a visible
response. Each step names the section that specifies it in full — this trace is a
navigation map, not a substitute for those sections.

```
DIAGRAM 6-B — Command Dispatch, End to End

User presses Enter on a slash command
 │
 ▼
Discord Gateway → discord.js delivers InteractionCreate
 │
 ▼
EventRouter.handleGatewayEvent('interactionCreate', interaction) [§18.3]
 │
 ▼ (ApplicationCommand or Autocomplete)
CommandRouter.dispatch(interaction) [§17.3]
 │ looks up by composite key: commandName[:subgroup][:sub]
 ▼
Module-active check for this guild [§13.4]
 │ fails closed: missing or disabled row ⇒ no dispatch
 ▼
MIDDLEWARE PIPELINE, strict priority order [§19.2]
 -20 MaintenanceModeMiddleware — short-circuits everything if set
 -10 AdminTierGateMiddleware — owner-only gate, Admin tier only
 0 TraceMiddleware — opens span, binds traceId
 10 AuthMiddleware — resolves interaction.user
 20 GuildConfigMiddleware — loads per-guild config into context
 30 LocaleMiddleware — binds i18n instance
 40 RateLimitMiddleware — atomic check-and-increment, pre-handler
 50 PermissionMiddleware — Discord bitfield check (Layer 5 of 7)
 60 RBACMiddleware — Dumby role check (Layer 6 of 7)
 70 CooldownMiddleware — per-user per-command cooldown
 80 DeferMiddleware — deferReply if command.requiresDefer
 90 AnalyticsMiddleware — records invocation start
 100+ module-global middleware (manifest-declared)
 200+ command-scoped middleware (command-declared)
 │ each layer calls next to continue; abort ⇒ short-circuit
 ▼
Command.execute(interaction, context) [§17.2]
 │
 ▼
Service layer call → repository pattern for any data access [§24.3]
 │
 ▼
Command.execute returns
 │ middleware .after hooks run in reverse priority order
 ▼
AnalyticsMiddleware records outcome/duration/status
TraceMiddleware closes span, emits final structured log line
 │
 ▼
dumby_commands_total{module,command,status} incremented
dumby_command_duration_seconds histogram recorded
 │
 ▼
User sees the response in Discord
```

### 6.3 Module Communication Pathways

```
DIAGRAM 6-C — How Module A Reaches Module B

 Fire-and-forget, no response needed
 A emits an event on the Internal Bus → B's listener fires asynchronously
 (e.g. moderation emits 'moderation.user.banned'; logging subscribes)

 Synchronous response needed
 A resolves Module B's published DI token and calls the typed service
 (e.g. economy calls TOKENS.GuildSettings.Service.get(guildId, 'prefix'))

 Cheap read of B's data, without B's logic
 A calls a ForCrossModuleRead-suffixed accessor B declared in its manifest's
 crossModuleReads array — single-row, key-only lookup only (§14.1 Pattern 3);
 writes always go through B's service, never this path

 NEVER
 import { SomeClass } from '../../module-b/services/SomeService.js'
 — an ESLint rule turns any cross-module relative import into a build error
```

### 6.4 Guild Configuration Read Path

```
DIAGRAM 6-D — Cache Cascade for Per-Guild Config

Command invoked in guild G, module M
 │
 ▼
GuildConfigMiddleware checks L1 (in-process LRU): key 'guild:{G}:config'
 │
 hit ─┴────────────────────────────────► bind to context, proceed
 │
 miss
 ▼
CacheManager.get('guild:{G}:config') [Redis L2]
 │
 hit ─┴─ backfill L1 ────────────────► bind to context, proceed
 │
 miss
 ▼
GuildConfigRepository.findByGuildId(G) [PostgreSQL — reads the config JSONB
 document, full field reference §23.3]
 │
 ▼
Write Redis L2, write L1 LRU
 │
 ▼
Bind to context, proceed to handler
```

### 6.5 Shard Topology At Scale

```
DIAGRAM 6-E — Sharding Topology

 ┌──────────────────────┐
 │ Discord Gateway │
 └──────────┬───────────┘
 │
 ┌─────────────────┼─────────────────┐
 │ │ │
 ┌───────▼──────┐ ┌───────▼──────┐ ┌───────▼──────┐
 │ Bot Pod 0 │ │ Bot Pod 1 │ │ Bot Pod N │
 │ (Shard 0–k) │ │ (Shard k–2k) │ │ (Shard Nk–M) │
 └───────┬──────┘ └───────┬──────┘ └───────┬──────┘
 │ │ │
 └─────────────────┼─────────────────┘
 │
 ┌─────────────────┼─────────────────┐
 │ │ │
 ┌───────▼──────┐ ┌───────▼──────┐ ┌───────▼──────┐
 │ PostgreSQL │ │ Redis │ │ BullMQ │
 │ (Primary + │ │ (L2 cache, │ │ Workers │
 │ Replicas) │ │ pub/sub) │ │ │
 └──────────────┘ └──────────────┘ └──────────────┘

Shard assignment formula:
 shardId = (guildId.toBigInt >> 22n) % BigInt(totalShards)
 (Parentheses matter: % binds tighter than >> in TypeScript/JavaScript —
 omitting them computes guildId >> (22n % totalShards), which is wrong.)
```

Each pod hosts a contiguous shard range under discord.js's `ShardingManager`, sized so
a single pod carries roughly 1,000 guilds per shard before crossing the point where a
single gateway connection's event volume risks Discord's per-shard rate limits. Two
mechanisms let one shard reach state on another: `client.shard.broadcastEval` — a
serializable function executed across every shard, reserved for low-frequency,
operator-triggered needs, since it carries meaningfully higher per-call latency than a
hot-path primitive should — and Redis pub/sub, used for anything routine or
high-frequency (cache invalidation, cross-shard presence updates). Application code
never assumes it runs unsharded; `context.shardId` is always populated, and any state a
module needs across shard boundaries lives in PostgreSQL or Redis (§26), never in a
process-local variable.

### 6.6 Twixter — The Persona System for Multiple Bot Identities on Shared Infrastructure

Two hard Discord-platform ceilings shape when a single bot identity stops being
enough for a guild: at most 100 commands may be registered per guild per application,
and a single bot connection holds at most one active voice connection per guild.
**Twixter** is the subsystem responsible for creating, branding, and governing the
lifecycle of a **Persona** — a complete additional Discord Application whose token and
application are supplied by the guild administrator themselves (bring-your-own-identity),
while Dumby hosts and operates the instance. One Persona is bound to exactly one
server (single-server-bound): a Twixter instance serves the single guild that
commissioned it and is never shared across guilds. The instance is bootstrapped from
the identical codebase and shares the identical PostgreSQL primary, Redis instance,
and job queues as the main bot and every other Persona a deployment runs. Personas
run under a free charter with an explicit sunset condition (§35.6, ADR-008). A Persona is not a lighter-weight
bot; it is the framework running again under a different identity, giving a guild a
second full command budget or a second concurrent voice connection. This mechanism is
opt-in and additive — reached for only when one of the two ceilings is actually hit —
and is specified completely in §35.

---

## 7. Directory & File Structure

**Status:** [SPEC]

### 7.1 Top-Level Layout

```
TREE 7-A — Repository Root

dumby/
├── .github/
│ ├── workflows/
│ │ ├── ci.yml ← typecheck → lint → test → build
│ │ ├── release.yml ← changesets publish
│ │ ├── deploy-staging.yml
│ │ ├── deploy-production.yml
│ │ └── dependency-review.yml
│ ├── PULL_REQUEST_TEMPLATE.md
│ ├── CODEOWNERS
│ └── ISSUE_TEMPLATE/
│ ├── bug_report.yml
│ ├── feature_request.yml
│ └── module_proposal.yml
│
├── .husky/
│ ├── pre-commit ← pnpm lint-staged
│ └── commit-msg ← commitlint
│
├── .vscode/
│ ├── launch.json ← tsx-based debugger, no compiled output needed
│ ├── settings.json
│ ├── extensions.json
│ └── snippets/dumby.code-snippets
│
├── docker/
│ ├── Dockerfile ← multi-stage: builder (tsc) + runtime (node)
│ ├── Dockerfile.dev ← tsx with volume mount for live reload
│ └── docker-compose.yml ← bot + postgres + redis + bullmq-dashboard
│
├── infra/
│ ├── terraform/
│ │ ├── environments/{staging,production}/
│ │ └── modules/{database,cache,kubernetes}/
│ └── k8s/
│ ├── base/{deployment,service,configmap,serviceaccount,hpa}.yaml
│ └── overlays/{staging,production}/
│
├── scripts/
│ ├── scaffold.ts ← dumby scaffold module <name>
├── scripts/
│ ├── scaffold.ts ← dumby scaffold module <name>
│ ├── migrate.ts ← migration runner entrypoint
│ # NOTE: knexfile.ts only points at src/db/migrations/ — 3 migrations
│ # under src/commands/migrations/ are invisible to Knex and never execute.
│ └── seed.ts ← development seed data
│
├── src/
│ ├── core/ ← Application Core (§7.2)
│ │ # The legacy flat-layout ADR is superseded by the tier-volume
│ │ # decision (ADR-005, docs/adr/) — modules no longer live in-tree.
│ │ # No src/modules/ exists: feature modules live on the four
│ │ # per-tier volumes (§7.3) and are seeded through promotion.
│ ├── commands/ ← the unified command framework (§17): CommandRouter,
│ │ CommandRegistry, CommandDeployer, GuildCommandChangeQueue/Scheduler,
│ │ collision resolution, the tier ceiling, and BCCM — resolving
│ │ ADR 002 by living at src/ top level, never under src/core/
│ ├── shared/ ← Cross-cutting utilities (§7.4)
│ ├── entry/ ← Process entrypoints (§7.5)

│ ├── entry/ ← Process entrypoints (§7.5)
│ │ # DANGLING REFS: entry/clai.ts and http/routes/admin.routes.ts
│ │ # reference entry/ssh-clai.ts and STATUS_AND_VERIFICATION.md
│ │ # — neither file exists. Create them or remove the references.
│ └── monetization/ ← Reserved monetization scaffold (§7.6)
│
├── tsconfig.json ← strict mode, NodeNext, path aliases
├── tsconfig.build.json ← excludes tests
├── eslint.config.ts ← flat config
├── prettier.config.ts
├── vitest.config.ts
├── commitlint.config.ts
├── .changeset/config.json
├── package.json ← "type": "module"; engines.node ≥22
│ # HARD REQUIREMENT: Node ≥22 (engine constraint). Deployers must
│ # verify — Node 20 will fail. Dockerfile must use node:22-alpine.
└── pnpm-lock.yaml
```

### 7.2 `src/core/` — The Application Core

```
TREE 7-B — Application Core Layout

src/core/
├── application/
│ ├── Application.ts ← 18-stage bootstrap orchestrator (§8)
│ ├── ApplicationContext.ts ← shared runtime context object
│ └── HealthServer.ts ← Fastify /health, /ready, /startup (starts
│ Stage 03, before module loading)
├── container/
│ ├── Container.ts ← DI container implementation (§10)
│ ├── tokens.ts ← Symbol-token registry (core tokens)
│ └── lifetimes.ts ← 'singleton' | 'transient' | 'scoped'
├── modules/
│ ├── ModuleRegistry.ts ← discovery, validation, catalog
│ ├── ModuleLoader.ts ← dynamic import + lifecycle hooks
│ ├── ModuleManifest.ts ← manifest Zod schema + type exports
│ └── GuildModuleStateService.ts ← guild_module_states read/write + cache
├── events/
│ ├── EventRouter.ts ← gateway event → module handlers (§18)
│ └── InternalEventBus.ts ← cross-module typed event pub/sub
├── middleware/
│ ├── MiddlewarePipeline.ts ← onion composition, priority ordering (§19)
│ ├── BaseMiddleware.ts ← abstract base class
│ └── built-in/ ← the twelve built-in stages, one file each
├── permissions/
│ ├── PermissionResolver.ts ← 7-layer resolution engine (§21)
│ ├── RBACService.ts ← Dumby role definitions + membership
│ └── BlacklistService.ts ← user/guild block lists (Layer 2)
├── config/
│ ├── ConfigManager.ts ← load, validate, freeze process config
│ ├── GuildConfigService.ts ← per-guild config read/write + cache
│ └── schema.ts ← root Zod schema (§23.2)
├── database/
│ ├── DatabaseManager.ts ← pool, read-replica routing (§24)
│ ├── MigrationRunner.ts ← ordered migration execution
│ ├── BaseRepository.ts ← typed CRUD base; transactions owned by
│ │ the service layer
│ ├── QueryLogger.ts ← slow/critical query logging
│ └── migrations/{core,backfill}/ ← 11 core tables + 1 proactive backfill
├── cache/
│ ├── CacheManager.ts ← L1 + L2 unified API (§25)
│ ├── L1Cache.ts / L2Cache.ts
│ └── StampedeGuard.ts ← distributed lock + early expiration
├── http/
│ ├── HttpServer.ts ← Fastify instance + plugins
│ ├── routes/{health,metrics,webhooks,modules}.routes.ts
│ └── middleware/{authMiddleware,requestLogger}.ts
├── queue/
│ ├── QueueManager.ts ← BullMQ queue registry
│ ├── BaseProcessor.ts ← abstract job processor base
│ ├── Scheduler.ts ← cron registration + repeatable jobs
│ └── BaseJob.ts ← abstract cron task base
├── i18n/
│ ├── I18nManager.ts ← locale loading, namespace merging
│ └── formatters.ts ← date/number/currency/duration
├── observability/
│ ├── Logger.ts / Metrics.ts / Tracing.ts
└── error/
 └── DumbyError.ts + eight concrete subclasses (§28.1)
```

### 7.3 Module Storage — Four Per-Tier Volumes (No `src/modules/`)

There is no in-tree `src/modules/` directory: module storage lives entirely on the
four per-tier Kubernetes volumes — `modules-admin`, `modules-core`,
`modules-standard`, `modules-marketplace` — plus the `swastik-staging` volume
(§5.4). Every module on a volume follows the identical internal structure (§11.4)
with an identical naming and tier-labeling convention, and a module's tier is
enforced at rest: it must live on the volume matching its manifest-declared tier.
First-party modules are seeded onto the core volume through the same Swastik
promotion pipeline any community module passes through (ADR-005, docs/adr/);
nothing in the repository or the container image enumerates modules, so the
framework discovers what exists by reading the volumes, never by consulting a
hardcoded list.

```
TREE 7-C — Module Volume Layout

/mnt/modules/
├── staging/ ← Swastik upload, validation, and build area
├── admin/ ← Admin-tier modules only
├── core/ ← Core-tier modules only (seeded via promotion)
├── standard/ ← Standard-tier modules only
└── marketplace/ ← Marketplace-tier modules only
   └── {module-name}/ ← one directory per independently-owned module
```

### 7.4 `src/shared/` — Cross-Cutting Utilities

```
TREE 7-D — Shared Utilities

src/shared/
├── types/
│ ├── discord.ts ← extended discord.js type augmentations
│ ├── context.ts ← CommandContext type (§17.5)
│ └── pagination.ts ← cursor and offset pagination types
├── utils/
│ ├── snowflake.ts, embed.ts, crypto.ts
│ └── retry.ts ← exponential-backoff utility (max 3 attempts, 1000ms
│ base; does NOT compose with BullMQ retry — §28.3)
├── constants/
│ └── colors.ts, limits.ts, durations.ts
└── testing/
 ├── MockContainer.ts ← pre-wired DI container for unit tests (§37.3)
 ├── fixtures/
 └── helpers/
```

### 7.5 `src/entry/` — Process Entrypoints

```
TREE 7-E — Entrypoints, One Per Deployable Process

src/entry/
├── main.ts ← production entry: creates Application, calls bootstrap
├── worker.ts ← BullMQ worker-only entry (CPU-isolated worker processes)
├── migrate.ts ← migration-only entry, no gateway
├── pep.ts ← Power Engine Panel entry (§22.3): no gateway, no modules
├── clai.ts ← CLAI entry (§22.6): SSH-hosted operator terminal
├── swastik.ts ← Swastik entry (§15): deployment/hot-reload/hot-swap
└── credentials.ts ← Credentials Service entry (§22.8): local authkey/dev-ID issuance
```

Every entrypoint boots the identical DI container against the identical core services
(§10); each simply starts a subset of them and skips the rest. `main.ts` is the only
entrypoint that opens a gateway connection and loads feature modules — including when
started against a Persona's token rather than the main bot's (§35). The other five
never do either: they are how PEP, CLAI, Swastik, and the Credentials Service each run
as their own deployable process rather than a code path inside the bot.

### 7.6 `src/monetization/` — Reserved Monetization Scaffold

```
TREE 7-F — Monetization Scaffold (Intentionally Empty)

src/monetization/
├── adapters/ ← empty — a future billing provider's integration lives here
├── models/ ← empty — future billing/entitlement data shapes live here
├── services/ ← empty — future business logic (entitlement checks, usage
│ thresholds) lives here
└── README.md ← describes the folder's purpose and intended structure
```

This directory is scaffold, not implementation — it reserves a stable, conventional
location, mirroring the `adapters/` · `models/` · `services/` shape the rest of the
framework already uses, for a monetization model that has not been chosen yet, so
whichever model is eventually chosen (subscriptions, pay-per-use, one-time purchases,
or a combination) can be dropped in without restructuring the framework around it
later. Nothing outside this directory depends on its contents; no core service imports
from it, and no bootstrap stage references it. An empty `src/monetization/` is the
expected, complete state of this directory for as long as no monetization model has
been built on top of it.

### 7.6.1 Monetization Scaffold — Deferral Status

The `src/monetization/` directory is currently at ~0% implementation — the empty directory structure is documented as the "expected, complete state." However, this deferral lacks explicit rationale for why monetization is deferred and what conditions would trigger implementation. The specification requires either a defined monetization feature (with at minimum a chosen model — subscription, pay-per-use, or one-time) or an explicit deferral document with rationale (e.g., "monetization is deferred until module marketplace adoption reaches N guilds"), ensuring the empty scaffold is a conscious decision rather than an oversight.

The `POST /api/pep/:functionName` route in `src/entry/pep.ts` must dispatch to real domain handlers in `PowerEngineService` based on the function name, rather than echoing the request body back as a no-op (`async => body`). The function-name → handler dispatch mapping must cover all 17 documented PEP control domains.

- **Intent:** SSH-hosted admin REPL.
- This is specified but not yet implemented.
- The system must use real SSH (ssh2 library, public-key auth).

- **Intent:** Layer 7 explicit grant override.
- This is specified but not yet implemented.
- This must be wired into the live request path.

## 8. Application Bootstrap & Lifecycle

**Status:** [SPEC]

### 8.1 The Application Class

`Application` is the single root orchestrator. It holds references to every shared
service — the DI container, the database manager, the cache manager, the HTTP server,
the gateway client — drives startup as a linear series of named stages, and exposes
the shutdown path invoked by process signals. Nothing starts before
`Application.bootstrap` is called; nothing runs after `Application.shutdown`
completes. This single-entry, single-exit design is what makes "one bootstrap
sequence" (§0.4) a literal property of the codebase rather than an aspiration.

### 8.2 The 18-Stage Startup Sequence

Each stage has a hard failure mode and a name that appears verbatim in the boot log.

> **Core volume reload is a non-operation:** mounting a new core version over the running volume does NOT reload in-memory code — Node's `require.cache`/ESM loader cache ignores disk overwrites, and re-importing core breaks live objects (DB pool, gateway client, middleware pipeline). Core changes REQUIRE a process restart (rolling update); in-place core cache invalidation is forbidden.

> **Hot-swap leak vector — zombie accumulation between restarts:** Swastik hot-swaps occur *between* the 24-hour scheduled restarts, so any resource (timers, listeners, workers) not auto-cleared on unload accumulates across swaps until the next restart. The framework MUST auto-clear every registered resource via the resource registry's `onUnload` auto-hook on every swap, not only on full process restart.

> **Hot-reload leak vector — stale timers:** a module's `onUnload` is not guaranteed to clear timers/interval handles it created, so a hot-swap can leave a stale timer closure referencing retired code. The framework MUST auto-clear every timer registered through `ITimerService` on unload (an `onUnload` auto-hook), rather than relying on author discipline — this is one of five documented leak vectors.
A stage failure exits the process with a non-zero code; no stage is optional or
deferrable — this is Principle P4 (§3) made concrete.

```
TABLE 8-A — Complete Bootstrap Stage Reference

┌────┬────────────────────┬──────────────────────────────────────────┬───────────────────┐
│ St.│ Name │ What Happens │ Failure Mode │
├────┼────────────────────┼──────────────────────────────────────────┼───────────────────┤
│ 01 │ PROCESS_SETUP │ Register uncaughtException / │ Fatal — no safety │
│ │ │ unhandledRejection handlers; set process │ net without this │
│ │ │ title │ │
│ 02 │ CONFIG_LOAD │ Load & validate root Zod schema against │ Fatal — field-level │
│ │ │ process.env │ Zod error output │
│ 03 │ HEALTH_SERVER_INIT │ Start Fastify on HEALTH_PORT; all three │ Fatal — no │

 (with `SO_REUSEADDR`, or a delayed-start-with-retry, so that a new pod starting while a previous pod is still inside its 9-step graceful shutdown — up to 180s — does not throw `EADDRINUSE` from Fastify `listen`; the Kubernetes `terminationGracePeriodSeconds` MUST exceed the worst-case shutdown so two pods never contend for `HEALTH_PORT` simultaneously)
│ │ │ health endpoints begin returning 503 │ diagnostic surface │
│ │ │ (not ready yet) │ otherwise │
│ 04 │ OBSERVABILITY_INIT │ Init Pino root logger, Prometheus registry,│ Fatal │
│ │ │ OpenTelemetry SDK; all further log lines │ │
│ │ │ are structured JSON │ │
│ 05 │ DATABASE_CONNECT │ Open Knex pool (primary + read replicas │ Fatal │
│ │ │ if configured); verify with SELECT 1 │ │
│ 06 │ MIGRATION_RUN │ Run pending migrations, core then module, │ Fatal — missing │
│ │ │ in declared order; verify │ migration is a │
│ │ │ guild_module_states backfill is current │ deployment error │
│ 07 │ CACHE_CONNECT │ Open Redis connection; verify with PING │ Fatal │
│ 08 │ QUEUE_INIT │ Init BullMQ queue connections; register │ Fatal │
│ │ │ worker processors │ │
│ 09 │ DI_BOOTSTRAP │ Bind all core services into the container; │ Fatal │
│ │ │ freeze the core token namespace │ │
│ 10 │ MODULE_DISCOVER │ Blind-discover modules on the four tier │ Fatal — no modules │
│ │ │ volumes: enumerate whatever the volumes │ means nothing to do │
│ │ │ hold; no hardcoded module list exists; │ (a tier volume being │
│ │ │ collect manifest.ts files │ empty is not fatal) │
│ 11 │ MODULE_VALIDATE │ Validate every manifest against the Zod │ Fatal — invalid │
│ │ │ schema; resolve cross-module dependency │ manifest or │
│ │ │ graph; detect cycles │ dependency cycle is │
│ │ │ │ a development error │
│ 12 │ MODULE_LOAD │ Call onLoad(container) on every module in │ Fatal only if a │
│ │ │ topological order; required:false modules │ required:true │
│ │ │ that throw here are disabled with a warning│ module's onLoad │
│ │ │ and startup continues │ throws │
│ 13 │ COMMAND_REGISTER │ Collect command classes from enabled │ Fatal — a name │
│ │ │ modules; register with CommandRegistry; │ collision is a │
│ │ │ run collision detection │ development error │
│ 14 │ EVENT_REGISTER │ Register event handler classes from │ Fatal │
│ │ │ enabled modules with EventRouter │ │
│ 15 │ DISCORD_LOGIN │ Call client.login(BOT_TOKEN) │ Fatal — nothing │
│ │ │ │ works without a │
│ │ │ │ gateway connection │
│ 16 │ CLIENT_READY │ Wait for discord.js's ready event; compute │ Fatal │
│ │ │ this process's shard assignments │ │
│ 17 │ MODULE_READY │ Call onReady(client) on every loaded │ Non-fatal per │
│ │ │ module; failures disable the specific │ module — the bot is │
│ │ │ module with a warning │ live and responding │
│ │ │ │ during this stage │
│ 18 │ STARTUP_COMPLETE │ /health/readiness returns 200 only once │ — │
│ │ │ every required:true module has completed │ │
│ │ │ onReady without error; emit │ │
│ │ │ dumby.system.ready on the internal bus │ │
└────┴────────────────────┴──────────────────────────────────────────┴───────────────────┘
```

```
DIAGRAM 8-A — Bootstrap as a State Machine

 [process start]
 │
 ┌────▼────┐ fail ⇒ exit(1), Zod error / connectivity error / etc.
 │ 01 → 09 │──────────────────────────────────────────────────────► [DEAD]
 │ (linear,│
 │ all │
 │ fatal) │
 └────┬────┘
 │ all nine pass
 ┌────▼────┐ invalid manifest / dep cycle ⇒ exit(1)
 │ 10 → 11 │──────────────────────────────────────────────────────► [DEAD]
 └────┬────┘
 │
 ┌────▼─────────────┐ required:true module throws ⇒ exit(1)
 │ 12 MODULE_LOAD │───────────────────────────────────────────► [DEAD]
 │ (per-module; │
 │ required:false │
 │ failures ⇒ DISABLED,│
 │ startup continues) │
 └────┬─────────────┘
 │
 ┌────▼────┐ collision / registration error ⇒ exit(1)
 │ 13 → 16 │──────────────────────────────────────────────────────► [DEAD]
 └────┬────┘
 │ gateway connected, shard assignments known
 ┌────▼─────────────┐
 │ 17 MODULE_READY │ per-module failure ⇒ that module → DISABLED
 │ (bot is LIVE and │ (warning only; bot keeps responding)
 │ responding here) │
 └────┬─────────────┘
 │
 ┌────▼────┐
 │ 18 │ all required:true modules healthy
 │ STARTUP_ │─────────────────────────────────────────► [READY — serving traffic]
 │ COMPLETE │
 └─────────┘
```

**Health probe semantics** — three endpoints, three distinct readiness contracts:

```
TABLE 8-B — Health Endpoint ↔ Bootstrap Stage Mapping

┌───────────────────┬───────────────────────┬──────────────────────────────────┐
│ Endpoint │ Returns 200 once.. │ Kubernetes probe purpose │
├───────────────────┼───────────────────────┼──────────────────────────────────┤
│ /health/liveness │ Stage 04 completes │ livenessProbe — a failure here │
│ │ (observability up) │ means fundamentally unhealthy; │
│ │ │ restart the process │
│ /health/startup │ Stage 15 completes │ startupProbe — distinguishes │
│ │ (gateway connected) │ "still starting" from "started │
│ │ │ then broke," with a longer │
│ │ │ failureThreshold │
│ /health/readiness │ Stage 18 completes, all │ readinessProbe — a failure removes │
│ │ required modules healthy │ the pod from the Service endpoint │
│ │ │ list without restarting it — │
│ │ │ correct for transient degradation │
└───────────────────┴───────────────────────┴──────────────────────────────────┘
```

This three-way split exists because the unavoidably long duration of Stage 17
(calling `onReady` across every module) must not read as "the process is broken" to
an orchestrator — the process is genuinely alive and its gateway connection genuinely
works well before every module finishes initializing. Collapsing all three checks into
one endpoint would force a choice between an orchestrator restarting a healthy-but-
still-initializing pod (if the check is too strict) or routing traffic to a pod with a
broken required module (if the check is too lenient). Three independently-gated
endpoints avoid the trade-off entirely.


### Worker-Only Bootstrap Path

`src/entry/worker.ts` runs `bootstrapWorker()`, not the full `bootstrap()`: the
worker path executes the infrastructure stages — config validation, observability,
database, cache, queue, and DI bootstrap, then module discovery and job-processor
registration — and skips Stage 15 `DISCORD_LOGIN`, Stage 16 `CLIENT_READY`, and the
API and health servers entirely. A worker process never opens a gateway connection
and never serves HTTP. A runtime role assertion guards the split: a process started
with `ROLE=worker` that finds itself holding a Discord client or an open HTTP
listener exits fatally, and the full bootstrap refuses to start in the worker role —
the two paths cannot silently converge.

### Entrypoint Side-Effect Guard

Every entrypoint runs its side effects only under the main-module guard —
`require.main === module` in CommonJS, or
`import.meta.url === pathToFileURL(process.argv[1]!).href` in ESM. Importing an
entrypoint — from a test, a tool, or another entrypoint — never boots a
process: `main.ts`, `pep.ts`, `ssh-clai.ts`, `credentials.ts`, `swastik.ts`,
and `worker.ts` all begin with the guard, and their top-level code does nothing
but define and export their bootstrap functions. `worker.ts` remains the honest
truncated path: `bootstrapWorker()`, the infrastructure stages, and nothing
else.

---

The 12-stage middleware pipeline is constructed at bootstrap Stage 09 and wired into the live `src/commands/` router: the composed executor is injected into `CommandRouter` ahead of module load, and the structural wiring test in CI asserts the chain is present in priority order on every build.

The live command dispatch path routes through all 12 middleware stages, including DeferMiddleware (priority 80), TraceMiddleware (priority 0), PermissionMiddleware, RateLimitMiddleware, AnalyticsMiddleware (priority 90), and all others.

**Proof-of-Existence (No Reference Implementation)**
No shipped code, no reference implementation, no stated implementation status. The 48-row compliance matrix presumes a deployment exists to check against.

A reference implementation passing the compliance matrix, validated against real guilds.

**Phase 3: Request/interaction pipeline (~70% written / ~25-30% functional)**
~70% written / ~25-30% functional — middleware + permission engine exist with correct priorities, but the live router bypasses both.

Live router uses the middleware pipeline and `PermissionResolver`.

**src/commands/ (the canonical command system) spec-faithful implementation is orphaned dead code (~0% wired)**
src/commands/ (the canonical command system) = 2,926 lines, own tests + migrations, fully orphaned (no external importers); tests still run in CI.

src/commands/ (the canonical command system) wired as the canonical router OR consolidated into the live path; CI tests reflect actual execution.

**Admin-tier gate is a single gate, not 5 explicit layers**
AdminTierGateMiddleware/AdminTierGate is a single gate checking botOwnerIds, not the 5 explicit layers documented.

Either implement the 5-layer gate or update docs to describe the single-gate reality.

**Config Schema Cross-Check at Upload**
Missing.

Config consistency report.

**Layer 7 rbac.ts supporting code never called (~0% reachable)**
rbac.ts Layer 7 code exists but has no callers.

rbac.ts reached via PermissionResolver Layer 7 evaluation; all four override types exercised.

Compute the union of all module-declared intents once at login.

The framework requests only the union of declared intents, never a broad precautionary set; intents are immutable after login, and pre-login intent-permission validation rejects privileged intents a deployment has not allow-listed before the gateway connection is opened.

Registers first-party modules at bootstrap.

Bootstrap registers first-party modules from the tier volumes through promotion — including the `/health` Core-tier and `/hello` Standard-tier modules — with no module-specific imports in the core image: first-party modules load from the external module volumes exactly like every other module.

- ** Application.ts running Stages 1-18.

Application.ts runs Stages 1–18 exactly as specified.

### 8.13 Spec-faithful good-faith engineering (bootstrap, shutdown, DI, middleware)

- Fully Implemented — 18-stage bootstrap, 9-step graceful shutdown, DI container, and 12-stage middleware pipeline (priorities included) all match the spec exactly. A later migration correctly self-corrected an earlier Swastik table-naming conflict.
- Preserved; not regressed by the fixes for through .

### 8.12 OpenTelemetry Tracing

- Delivered (~46-56 LOC).
- Maintained.

### 8.11 DI container verified (Symbol tokens, 3 lifetimes, freeze, child containers)

- container.ts (166L) implements DI with Symbol tokens, 3 lifetimes (singleton/transient/scoped), freeze after Stage 09, child containers, circular-dependency detection, mock-container for tests.
- Maintain.

The documented three-scope config model — process-core, process-module, guild — is formalized with an explicit `ModuleConfigScope` abstraction distinct from process-core (`env.schema.ts`) and guild (`guild_configs` JSONB).

**Mechanism:** Each module declares a per-module Zod `configSchema` in its manifest (`manifest.schema.ts` in the `swastik` authoring package — `configSchema` field). The `src/config/` layer binds namespaced environment variables into a `ModuleConfigScope` instance, so module config is loaded, validated, and namespaced separately from process-core and guild config.

**

Framework-enforced auto-cleanup of module resources: (A) an injected `ITimerService` with raw `setTimeout`/`setInterval` forbidden and `resourceTracker.clearAllTimers` called on unload; (B) `InternalEventBus` using `WeakRef` + `FinalizationRegistry` so listeners are dereferenced by scopeId; (C) CacheManager entries tagged by owning module and evicted on unload. Prevention lives in the DI Container, EventBus, and CacheManager so a misbehaving module cannot leak resources past its lifecycle.

## 9. Graceful Shutdown & Signal Handling

**Status:** [SPEC]

### 9.1 The 9-Step Shutdown Sequence

Triggered by `SIGTERM` or `SIGINT`. The shutdown executes nine steps sequentially,
each with its own independent timeout — a later step never starts before an earlier
one has either completed or exhausted its own ceiling.

**Kubernetes alignment.** `deploy/k8s/base/deployment.yaml` sets `terminationGracePeriodSeconds: 190`, matching the spec's 180-second worst-case shutdown plus a 10-second buffer. Maintain the value, and verify the graceful-shutdown logic actually respects this window.

```
TABLE 9-A — Graceful Shutdown Steps

┌────┬───────────────────────────────────────────┬─────────┬────────────────────────┐
│ St.│ Action │ Timeout │ Notes │
├────┼───────────────────────────────────────────┼─────────┼────────────────────────┤
│ 01 │ Stop accepting new gateway events │ 30 s │ Shard disconnect; │
│ │ │ │ Discord marks bot │
│ │ │ │ offline │
│ 02 │ Drain in-flight command executions │ 30 s │ Wait for active │
│ │ │ │ Command.execute calls │
│ │ │ │ to finish │
│ 03 │ Call onUnload on every loaded module │ 30 s │ Cancel timers, flush │
│ │ (reverse load order) │ │ in-memory state │
│ 04 │ Drain BullMQ queues (stop accepting new │ 60 s │ In-flight workers finish │
│ │ jobs; let current workers finish) │ │ normally; workers still │
│ │ │ │ running after 60s are │
│ │ │ │ abandoned with a │
│ │ │ │ dead-letter entry │
│ 05 │ Close HTTP server (finish in-flight requests) │ 10 s │ │
│ 06 │ Flush Pino log buffer and OTel span exporter │ 5 s │ No log lines or traces │
│ │ │ │ are lost │
│ 07 │ Close BullMQ connections │ 5 s │ │
│ 08 │ Close Redis connection │ 5 s │ │
│ 09 │ Close database connection pool │ 5 s │ │
└────┴───────────────────────────────────────────┴─────────┴────────────────────────┘

Worst-case sum of every ceiling: 180 s.
```

**Ceilings, not expected durations.** Each listed value is a worst-case bound the
process will wait *up to* before force-proceeding — not a typical duration. A shutdown
with no long-running in-flight commands and a shallow queue backlog (the overwhelming
majority of real shutdown events) completes in low single-digit seconds, since most
steps resolve almost immediately once there's nothing left to drain. The absolute
worst case — every step independently consuming its full ceiling — sums to 180 seconds.

**Why the deployment default sets `terminationGracePeriodSeconds: 190`.** This is the
full worst-case sum (180 s) plus a 10-second buffer, specifically so that Step 4's
dead-letter write for an abandoned job is itself guaranteed to finish rather than being
cut off mid-write by a Kubernetes `SIGKILL`. A shorter grace period does not make the
realistic case faster — that case already finishes in single-digit seconds regardless
of the ceiling — it only removes the margin that keeps a genuine worst-case shutdown
from being killed before its own failure-recording step completes. An operator whose
workload never carries long-running commands or a deep queue backlog, and who values
faster pod recycling over guarding this tail case, can lower this deliberately; 190 s
is the default specifically because guaranteeing every abandoned job reaches the
dead-letter queue with a full record — rather than vanishing silently — is the outcome
this architecture defaults into.

```
DIAGRAM 9-A — Shutdown Sequence Timeline (Worst Case)

 0s 30s 60s 120s 180s 190s
 │──01──│ │ │ │ │
 │ │──02──│ │ │ │
 │ │──03──│ │ │ │
 │ │───────04────────────────────────────►│ │
 │ │──05─►│
 │ (05-09
 │ overlap
 │ within
 │ their own
 │ windows,
 │ 25s total)
 └────────────────────────────────────────────────────────────┴──────┘
 buffer ──┘
```

### 9.2 Restart Behavior Under Kubernetes

However a deployment triggers a restart — an Admin-tier command is one way, an
orchestrator-level pod delete is another — the framework's own response is identical:
call `process.exit(0)` after completing the shutdown sequence, causing the container to
exit with a zero code. The Kubernetes restart policy is what actually brings the
process back; no signal-based self-re-exec mechanism is used or required anywhere in
this architecture.

### 9.3 Process Signal Reference

```
TABLE 9-B — Signal Handling

┌───────────────────┬────────────────────────────────┬──────────────────────────────┐
│ Signal │ Trigger │ Action │
├───────────────────┼────────────────────────────────┼──────────────────────────────┤
│ SIGTERM │ Kubernetes pod termination, │ Graceful shutdown (§9.1's │
│ │ docker stop │ nine-step sequence) │
│ SIGINT │ Ctrl+C in development │ Graceful shutdown │
│ SIGUSR2 │ Reserved, unused │ No handler is registered; │
│ │ │ restarts are driven │
│ │ │ exclusively by process.exit(0) │
│ │ │ plus the orchestrator's own │
│ │ │ restart policy │
│ uncaughtException │ Unhandled throw at process level │ Flush logs/traces (Steps 06–07 │
│ │ │ of §9.1 only — not the full │
│ │ │ gateway/queue drain, since │
│ │ │ process state is unknown), then │
│ │ │ process.exit(1) │
│ unhandledRejection │ Unhandled Promise rejection │ Log at error level; emit │
│ │ │ dumby.system.unhandledRejection; │
│ │ │ process continues — module-level │
│ │ │ rejections are caught by the │
│ │ │ middleware root error boundary │
│ │ │ (§19.4) before reaching here in │
│ │ │ normal operation │
└───────────────────┴────────────────────────────────┴──────────────────────────────┘
```

> **Precision note.** `SIGUSR2` is reserved and structurally unused — no handler is
> ever registered for it, and every restart path in this architecture (an Admin-tier
> restart, an orchestrator pod delete, a Swastik-driven core restart, §15.3) resolves
> to the identical `process.exit(0)` + orchestrator-restart-policy path described in
> §9.2. Treat any reference elsewhere to "SIGUSR2 as a shutdown trigger" as informal
> shorthand for "one of the two real triggers, SIGTERM or SIGINT" rather than a third,
> independent trigger — this table is the authoritative statement of what each signal
> does.

### 9.4 Why `uncaughtException` and `unhandledRejection` Are Handled Differently

An `uncaughtException` means the process's internal state is no longer trustworthy —
some invariant the rest of the codebase assumes has already been violated. Attempting
a full graceful drain (accepting the gateway is still healthy enough to finish
draining in-flight commands, still healthy enough to run every module's `onUnload`
cleanly) risks compounding a bad state with more work executed under it. The response is a
bounded fatal sequence, registered once at Stage 01 and never re-registered ad hoc:
the handler writes a fatal-level log entry carrying the error, its stack, and the
current correlation ID; emits the `system.fatalError` internal event (consumed by
Admin tier for P0 alerting); attempts the graceful shutdown sequence under a hard
15-second ceiling — flush logs and traces, disable modules in tier order
(Marketplace, Standard, Core, Admin), disconnect shards; and exits with code 1
whether or not the graceful path completed in time, letting the orchestrator start
a fresh, known-good process.

An `unhandledRejection`, by contrast, does not imply a violated invariant — it
typically means one specific asynchronous operation failed without its rejection being
caught, not that the whole process is compromised. The default response is therefore
to log and continue rather than exit, on the reasoning that terminating the entire
process over one uncaught rejection would convert an isolated, already-contained
failure into a fleet-wide availability event. In ordinary operation this handler
should rarely fire at all: the middleware pipeline's root error boundary (§19.4)
already catches everything thrown or rejected inside a command's execution path before
it could ever reach the process-level handler.

Console output outside the structured logger is structurally banned: the ESLint
configuration enables `no-console` with a single allow-listed entry for the
logging module's own sink, so an accidental `console.log` fails lint rather
than bypassing the correlation-ID-carrying log lines the fatal handler and every
downstream consumer depend on.

### Forward-Only BootstrapProgress State Machine

Bootstrap progress (`stages.ts`) is a forward-only state machine: stages advance monotonically and never regress, mirroring the sequencing discipline of the nine-step shutdown in §9.1. Delivered and correct — maintain the invariant that no stage can be re-entered or skipped backward.

### Shard-Ownership Lock During Rolling Updates

Exactly one process holds the live gateway connection per shard, tracked as a Redis key with a heartbeat TTL. During a rolling update the incoming pod retries until the outgoing pod releases the lock as part of graceful shutdown, so handover is bounded by the shutdown ceiling rather than by hope. Residual risk: a prolonged Redis outage leaves shard ownership ambiguous, which is why Redis availability is a first-class SLO target. The protocol — Redis SETNX acquisition, heartbeat renewal, bounded retry, and the `SHARD_LOCK_*` environment variables — is implemented under `apps/main/src/discord/`.

## 10. Dependency Injection & Service Container

**Status:** [SPEC]

### 10.1 Purpose and Role

The DI container is the single mechanism by which services are shared across the
framework and between modules. There are no module-level singletons, no global
variables reachable through bare imports, and no service-locator calls where a class
reaches out and fetches its own dependencies. Every dependency a class needs arrives
through its constructor, resolved by the container from a token. This property —

**provides / depends tokens.** Modules declare their exported service interfaces (`provides`) and consumed dependencies (`depends`) as DI tokens, checked at Stage 11. Compatibility is currently verified by semver satisfaction only, which misses contract breaks; the target is type-level contract checks against the tokens' `.d.ts` definitions (TypeScript type checker; provides/depends registry).

constructor injection through the container, exclusively, with no exceptions — is what
makes every class independently testable via mock substitution (§37.3) and what makes
the cross-module dependency graph fully explicit rather than hidden inside import
chains.

```
DECISION RULE — Why Constructor Injection, Exclusively

 Service locator pattern (class calls container.resolve internally)
 ✗ Hides a class's real dependencies inside its method bodies
 ✗ Makes "what does this class need to run" require reading every method
 ✗ Cannot be swapped per-test without a live container instance

 Constructor injection (dependencies arrive as constructor arguments)
 ✓ A class's full dependency list is its constructor signature — nothing hidden
 ✓ A unit test constructs the class directly with hand-built fakes, no
 container required at all, if that's simpler than MockContainer for a
 given test
 ✓ The container's own resolution algorithm (§10.5) can statically detect
 cycles before any code runs, because the graph is fully declared up front
```

### 10.2 Binding Tokens

Every service is identified by a `Symbol`, never a string. Symbols are unambiguous (no

 A token that is registered into the container but never resolved where it is consumed is a wiring defect, not a working feature: `PermissionResolver` is registered against its token but MUST be resolved in the live request path, and the Layer 7 `rbac.ts` code (permit/blacklist/whitelist/cooldown/rate-limit) it governs MUST be invoked by it. A registered-but-never-resolved resolver and an absent `grants` table together make the documented permission layers unenforceable.

The Repository pattern is the sole database abstraction: every data access goes
through a repository class resolved by its DI token, never through raw query
helpers or direct DB clients in command/service code. Mixed abstractions are
forbidden and enforced by the `no-repository-in-command` lint rule (§38.4).

string-collision risk across modules that might reuse a common name like
`"Logger"`), unspoofable (a `Symbol` is equal only to itself, so no module can

 accidentally or deliberately shadow another's token). Registration without resolution is explicitly out of scope for a token's correctness: a service bound into the container that no code path ever resolves is a dead binding. `PermissionResolver` is registered but, resolved in ~0% of request paths — it MUST be resolved from DI in the middleware/command path so the Layer 7 `rbac.ts` code it owns is actually invoked.
accidentally or deliberately shadow another's token), and type-safe when paired with
TypeScript generics — a token's associated type flows through `container.resolve<T>`
without a manual cast.

```
CODE REFERENCE 10-A — Token Registry Shape

// tokens.ts (core)
export const TOKENS = {
 Logger: Symbol('Logger'),
 Config: Symbol('Config'),
 Database: Symbol('Database'),
 Cache: Symbol('Cache'),
 Queue: Symbol('Queue'),
 Scheduler: Symbol('Scheduler'),
 I18n: Symbol('I18n'),
 Metrics: Symbol('Metrics'),
 Tracer: Symbol('Tracer'),
 EventBus: Symbol('EventBus'),
 PermResolver: Symbol('PermResolver'),
 GuildConfig: Symbol('GuildConfig'),
 ModuleRegistry: Symbol('ModuleRegistry'),
 HttpServer: Symbol('HttpServer'),
} as const;

// A module's own tokens.ts — namespaced under the module name
export const MODERATION_TOKENS = {
 ModerationService: Symbol('Moderation.ModerationService'),
 CaseService: Symbol('Moderation.CaseService'),
 CaseRepository: Symbol('Moderation.CaseRepository'),
 InfractionRepository: Symbol('Moderation.InfractionRepository'),
} as const;
```

Core tokens are registered during bootstrap Stage 09 (§8.2). Module tokens are

ModuleRegistry.discover accepts a configurable root directory (default
`src/modules/`, overridable via `MODULES_DIR`), so the served module set can point
at a mounted persistent volume rather than a baked-in image layer.

registered during Stage 12, **in topological dependency order** — meaning a module
whose `depends` array references another module's token can safely resolve that token
at construction time, because the module it depends on has already had its own tokens
registered by the time Stage 12 reaches it.

### §10.2 Addition — QueueManager Worker Lifecycle Map (moduleSlug → Worker[])

QueueManager with per-module worker registry + dead-letter fallback handoff.

### §10.2 Addition — Operator-authored security policy lockfile (JSON, checked at Stage 11)

Operator-authored JSON validated against module manifests at Stage 11.

### §10.2 Addition — Memory Leak Detection

ModuleRegistry acts as memory detective during Swastik hot-swaps; CI integration simulates load/unload 50× and blocks PRs on linear heap growth.

### §10.2 Addition — Managed Resource Registry (Auto-Cleanup on Unload)

Three mechanisms: (A) ITimerService replacing raw setTimeout/setInterval, auto-registered in a Set per module; (B) EventBus WeakRef + FinalizationRegistry, framework iterates scopeId listeners on unload; (C) CacheManager.flushNamespace(moduleSlug) on unload for L1 + Redis invalidation for L2.

### §10.2 Addition — ESM Loader Import Restrictions

Loader-hook-based import allowlist.

### §10.2 Addition — ESLint Rule `no-direct-interaction-reply`

Custom ESLint rule blocks these imports/calls; the only object passed to `execute` is a read-only interaction for data access (options, user, guild).

### §10.2 Addition — The Core Renderer Binding

The Renderer is bound as a core singleton (its DI token resolved by `CommandRouter`
post-middleware): it takes the declarative response a command returns, (1)
Zod-validates it against the command's declared schema, (2) builds the Discord
Components v2 payload, (3) handles defer/edit/ephemeral, and (4) applies the
standard frame — accent, footer, timestamp — from the guild's configuration. The
full grammar, slot, and mode specification is §20.8; the core-owned renderer is what
makes the classic-embed ban (§4) enforceable at the architectural layer.

### §10.2 Addition — Contract Compatibility Checks on Update

Contract diff + breaking-change enforcement.

### §10.2 Addition — Component Interaction Handlers (Buttons, Select Menus, Modals)

{moduleNamespace}:{handlerKey}:{contextPayload} encoding, IComponentHandler for buttons/selects, mandatory re-authorization for sensitive components.

### §10.2 Addition — Shipped `/health` Core-Tier and `/hello` Standard-Tier Command Modules

A Core-tier command module (`/health`) and a Standard-tier command module (`/hello`, slug `hello-world`) seeded onto their tier volumes through the promotion pipeline, installed permanently, non-disableable, returning Ping/Latency (`/health`) and "Hello, World!" (`/hello`) via Components V2, each with `devId`/`buildId` and `en-US.json`.

### 10.3 Binding Lifetimes

```
TABLE 10-A — Container Lifetimes

┌────────────┬──────────────────────────────────────┬────────────────────────────┐
│ Lifetime │ Description │ Typical use │
├────────────┼──────────────────────────────────────┼────────────────────────────┤
│ singleton │ One instance per container; created on │ Services, repositories, │
│ │ first resolution, reused thereafter │ database connections │
│ transient │ New instance on every resolution │ Stateless utility objects; │
│ │ │ rarely used │
│ scoped │ One instance per command-execution │ Per-request context objects │
│ │ scope; the container creates a child │ that must never bleed │
│ │ container for the scope │ between concurrent │
│ │ │ executions │
└────────────┴──────────────────────────────────────┴────────────────────────────┘
```

### 10.4 Dependency Declaration Pattern

```
CODE REFERENCE 10-B — Constructor Injection + Manifest Registration

// Construction via container — the class only ever sees interfaces
class CaseService {
 constructor(
 private readonly caseRepo: ICaseRepository,
 private readonly logger: ILogger,
 private readonly eventBus: IEventBus,
 private readonly config: IGuildConfigService,
 ) {}
}

// Registration in the module manifest's `services` array
services: [
 {
 token: MODERATION_TOKENS.CaseService,
 class: CaseService,
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

The container reads the `deps` array to resolve and inject arguments in declared
order. There are no decorators, no `reflect-metadata`, no annotation magic — every
dependency is stated explicitly as a `Symbol` in the `deps` array (Principle P1),
statically checkable against the TypeScript interface types those tokens are typed
against.

### 10.5 Resolution Algorithm

```
DIAGRAM 10-A — container.resolve(token)

 1. Check the singleton cache
 └─ present? → return cached instance, done
 2. Look up the binding for this token
 └─ not found? → throw DumbyError('TOKEN_NOT_BOUND')
 3. Push token onto the resolution stack (a Set of tokens currently resolving)
 └─ already present? → throw immediately with the FULL cycle path —
 e.g. "A → B → C → A" — never a generic "circular dependency" message
 4. Resolve each entry in `deps`, recursively (step 1 again, per dep)
 5. Construct the instance with resolved deps, in declared order
 6. Pop token from the resolution stack
 7. If lifetime === 'singleton': store in the singleton cache
 8. Return the instance
```

Because the resolution stack check happens *before* any recursive resolution begins,
a circular dependency is caught with the complete cycle path attached to the error —
never a runtime surprise discovered mid-request. This detection runs during bootstrap
Stage 09 (core tokens) or Stage 12 (module tokens), meaning a circular dependency is a
startup failure, not a production incident.

```
EXAMPLE — Circular Dependency Detection in Practice

 ServiceA depends on TOKENS.ServiceB
 ServiceB depends on TOKENS.ServiceC
 ServiceC depends on TOKENS.ServiceA ← cycle

 container.resolve(TOKENS.ServiceA):
 push A → resolve deps → push B → resolve deps → push C → resolve deps
 → attempt to push A again → A is ALREADY in the resolution stack
 → throw CircularDependencyError('ServiceA → ServiceB → ServiceC → ServiceA')

 This throws at Stage 09/12, before the gateway ever connects — the fix is a
 design change (usually: one of the three should depend on an event instead
 of a direct service call, per Pattern 1 in §14.1), not a runtime workaround.
```

### 10.6 Module-Scoped Child Containers

For the `scoped` lifetime, the container creates a **child container** per command
execution context. The child inherits every binding from its parent (it can resolve
singletons like services and repositories normally) but maintains its own
scope-level instance cache, isolated from every other concurrently-running scope. When
the scope ends — the command execution completes — the child container is discarded,
releasing any scoped instances with it. This is the mechanism behind `CommandContext`
(§17.5): a per-request object that must never bleed between concurrent interactions,
even two interactions from the same user in the same guild arriving milliseconds apart.

```
DIAGRAM 10-B — Scoped Container Lifecycle

 Interaction A arrives ──► child container A created ──► CommandContext A
 │
 (singletons resolved through
 parent container, shared;
 scoped instances live only
 in child A)
 │
 Interaction A completes ──► child container A discarded

 Interaction B arrives (concurrently) ──► child container B created
 │ (completely independent instance
 │ cache from child A, even for the
 │ same user/guild)
 Interaction B completes ──► child container B discarded
```

### 10.7 The Container in Testing

`MockContainer` (§37.3) is a pre-configured container instance that replaces every
external dependency — database, cache, event bus, HTTP client — with in-memory test
doubles exposing typed assertion methods: `assertEmitted(eventName)`,
`assertEnqueued(queueName, payload)`, `assertLogged(level, messagePattern)`. A unit
test creates a `MockContainer`, registers the class under test with its **real**
class, and resolves it — the class under test believes it is talking to real
infrastructure, but every call is intercepted and recorded for assertion. This
requires no process-level setup, no real database, and no network — the direct payoff
of Principle P8 (§3).

Module isolation is enforced through DI scoping (P2): a module's "tentacles" are confined to its own DI scope, and the module contract defines the only surface it may reach through.

- DI (P2) + Module Contract confine module reach.

- Maintain; exploit for leak protection.

Bootstrap runs as a deterministic 18-stage startup sequence (`src/bootstrap/bootstrap.ts`) with clear failure points — Stage 02 CONFIG_LOAD, Stage 06 MIGRATION_RUN, Stage 10 MODULE_DISCOVERY, Stage 11 MODULE_VALIDATE, Stage 18 readiness.

- 18-stage bootstrap (`src/bootstrap/bootstrap.ts`).

- Maintain; extend Stage 10/18 for volume loading.

Workloads roll out as a DAG: expand-only migrations first, then worker workloads, then the main bot, then persona workloads, and post-rollout reconciliation last.

- Confirmed.

- Implement in rollout controller.

Modules may communicate only through the four sanctioned cross-module patterns (§14.1); cross-module reach violations are a review checklist item, with automated enforcement via the Swastik static analyzer as the target.

- Manual review checklist item.

- Automated enforcement where feasible.

### Application Core Shared Infrastructure

The Application Core provides the shared infrastructure that keeps a 'modular' system from degrading into a plugin federation: one DI container, one event bus (`InternalEventBus`), one permission engine, one configuration system. This is what prevents the six-different-loggers problem — modules consume these shared services rather than building parallel ones, and the invariant must be maintained.

# PART III — THE MODULE SYSTEM

---

## 11. Module Anatomy & Manifest

**Status:** [SPEC]

### 11.1 The Module as the Unit of Ownership

A module is the fundamental unit of feature ownership in this architecture. It is a
complete vertical slice through the application stack — commands, event handlers,
services, repositories, background jobs, scheduled tasks, database migrations, locale
files, and tests — all living together under one folder, governed by one manifest, and
answerable to one functional owner. Nothing about a module's internals is visible to
another module except what it deliberately publishes.

Every module belongs to exactly one governance **tier** — Admin, Core, Standard, or
Marketplace — declared in its manifest and enforced by the framework everywhere
visibility, controllability, and rate-limit treatment matter. The full tier model is
§13; this section covers module structure independent of tier.

### 11.2 The Module Manifest — Complete Field Reference

Every module's `manifest.ts` exports a single object validated against the manifest
Zod schema during bootstrap Stage 11. **The same Zod schema must be shared between
Swastik's upload-time validator and the main bot's Stage 11 validator** — schema drift
between the two causes "it worked in staging but not production" surprises. A single
shared schema package imported by both is the target state.
Zod schema during bootstrap Stage 11. This is the complete field reference — no field

. The manifest-driven, in-process isolation model is *tooling-enforced in-process isolation with per-handler fault containment* — it does NOT guarantee zero collision risk across modules sharing one process; the "zero collision risk" claim is technically inaccurate for in-process isolation. Where untrusted modules must be isolated, the architecture extends to worker-thread/subprocess isolation (a `worker_threads` pool) rather than relying on lint rules and manifest validation alone.
may be added beyond this list without a framework-version bump (Principle P1: the
manifest is a complete table of contents for a module without opening a second file).

```
MANIFEST FIELD REFERENCE — COMPLETE

name (string, required, kebab-case, globally unique)
 Canonical identifier. Used in DI token namespaces, cache-key
 prefixes, queue-name prefixes, migration-ownership attribution,
 and every log/metric/trace label.

version (string, required, valid semver)
 The module's own semver version, independent of the framework's
 own version. Validates inter-module dependency compatibility.

description (string, required, 1–120 characters)
 Human-readable summary shown wherever installed modules are
 listed, including the extension-system's catalog panels (§16.4).

tier ('admin' | 'core' | 'standard' | 'marketplace', required)
 Determines visibility, controllability, rate-limit treatment, and
 marketplace surfacing. No default — an omitted field fails
 validation and the application does not start. Full semantics §13.

devGuildOnly (boolean, required when tier === 'admin', forbidden otherwise)
 Must be true for Admin-tier modules. Stated explicitly — in
 addition to being implied by tier — so a reviewer sees the
 dev-guild restriction asserted twice before merging a change.

hardcoded (boolean, required)
 true ⇒ this module is a private build restricted exclusively to
 the guild in hardcodeGuildId, permanently: the binding can
 never be released, never be widened, and the module can never
 enter the extension-submission pipeline. `hardcoded: true`
 requires visibility === 'private' (§13.3) and pins the
 module's command registration to that guild alone — its
 commands register as guild-scoped commands in
 hardcodeGuildId only (§17.4), never globally.
 false ⇒ the module is eligible for public release once its
 developer's licensing is approved (§15.7); visibility
 beyond that is governed by the visibility field below.
 Independent of tier: a hardcoded module may declare any tier —
 hardcoding constrains WHERE a module runs, not how the module
 system treats it.

hardcodeGuildId (snowflake, required when hardcoded === true, forbidden otherwise)

 The `guildId` compared against `hardcodeGuildId` MUST be type-safely threaded as a guild snowflake (a branded `GuildId` type), never a user snowflake; the equality check `module.hardcoded && module.hardcodeGuildId !== guildId` must be compiled against the guild-scoped parameter so a userId passed in its place is a type error, not a silent authorization bypass.
 The single guild this module is confined to while hardcoded
 remains true. Distinct from the process-level dev-guild variable
 (§23.2): that variable scopes the whole process's Admin-tier
 surface fleet-wide; this field scopes one module's visibility (validated against the guild ID literal at registration, never a user ID) —
 the two are never required to name the same guild.

visibility ('public' | 'unlisted' | 'private', required when
 hardcoded === false, forbidden otherwise)
 The module's first-class visibility, validated at all three
 manifest validation points — development, upload, and activation
 — and co-constrained with tier and the hardcoded toggle
 (§13.3). 'public' lists the module in the browsable extension
 catalog (§16.2). 'unlisted' installs by direct reference but
 never appears in any browsable listing. 'private' is invisible
 to every guild but the owning developer's own. A 'private' or
 'unlisted' module passes every validation and promotion step
 exactly as a 'public' module does — and a visibility change
 clears the same review pipeline any other manifest change does.

releaseStatus ('private' | 'public', required)
 The module's release-publication state, required on every manifest — there
 is no implicit default. The manifest schema is a discriminated union on
 `hardcoded`: the `hardcoded: true` variant carries `hardcodeGuildId` and
 admits only `releaseStatus: 'private'`; the `hardcoded: false` variant
 forbids `hardcodeGuildId` and admits either value. On top of the union, the
 visibility triad runs as a single `superRefine` block on the shared schema:
 `hardcoded === true` requires `releaseStatus === 'private'` and a present
 `hardcodeGuildId`; `hardcoded === false` forbids `hardcodeGuildId`;
 `releaseStatus === 'public'` requires `hardcoded === false` and
 `visibility === 'public'`. A manifest that violates any leg of the triad
 fails with one error naming the conflicting fields together, not three
 independent field errors. The rules run at all three manifest validation
 points — development, upload, activation — on the same shared schema, and
 the `guildId` compared against `hardcodeGuildId` is threaded as the branded
 `GuildId` snowflake type, never a bare string. Marketplace co-constraint:
 a `tier: 'marketplace'` module may only write a catalog listing row with
 `releaseStatus: 'public'` and `visibility: 'public'` — a private or
 unlisted module passes validation and promotion but never appears in the
 browsable catalog (§16.2).

devId (string, required)
 The registered developer identifier of the module's author
 (§15.6), carried in every manifest that developer submits — and
 required to equal the subject of the license under which the
 module is submitted (§15.7): a manifest whose devId does not
 match its license's subject fails validation at upload, before
 anything is staged.

buildId (string, required)
 The identifier assigned to this specific uploaded version
 (§15.8). A fresh buildId is issued per accepted version; the
 registry validates that a manifest's devId/buildId is a valid,
 currently-approved pair before the module is permitted to load.

marketplaceCategory ('audio'|'community'|'security'|'integrations'|'utility',
 required when tier === 'marketplace', forbidden otherwise)
 Powers the extension catalog's category grouping (§16.3). The category is a
 closed five-value enum — no free-form string is accepted at any validation
 point: the catalog's grouping depends on every listing landing in one of the
 five buckets, so an unknown category fails validation rather than creating a
 sixth group by accident.

required (boolean, default: false)
 true ⇒ a failure in this module's onLoad is fatal to the
 entire application at Stage 12.
 false ⇒ the module is logged as a warning and startup
 continues without it.

depends (array of { token: Symbol, version: string }, default: [])
 Hard dependencies on another module's published DI token. Bare token
 entries are not accepted: every entry is a `{ token, version }` pin —
 `token` the published DI token, `version` a semver range (`^1.2.0`,
 `~2.0.0`, `>=1.4.0`, or an exact pin). Stage 11 runs a range-satisfaction
 evaluator over every entry: a token that resolves to no loaded module, or a
 loaded module whose version does not satisfy the declared range, is a fatal
 Stage 11 startup error naming the token, the required range, and the
 version actually found. The same evaluator runs at every module load —
 hot-swap included — so a promoted module whose dependency has drifted out
 of range fails to load rather than running against an unverified pair.

provides (array of { token: Symbol, contract: TypeAlias }, default: [])
 Services this module publishes for other modules to consume.
 `contract` references a TypeScript interface, checked statically
 by tsc against every consumer's usage — a consumer calling a
 method the contract doesn't define fails at compile time in CI.

intents (array of GatewayIntentBits, default: [])
 Discord Gateway Intents this module requires. The union across
 every enabled module is what bootstrap Stage 15 requests.

partials (array of Partials, default: [])
 discord.js Partials this module requires for uncached objects.

commands (array of class references, default: [])
 Every command handler class this module contributes.

events (array of class references, default: [])
 Every gateway event handler class this module registers. Stage 11 asserts
 `events[] ⊆ eventsCatalog`: every event name a handler class registers is
 resolved against the closed events catalog the framework publishes, and a
 handler for an event name outside the catalog — unsupported, misspelled, or
 invented — fails validation at Stage 11, before load, rather than registering
 silently against nothing.

services (array of { token, class, lifetime, deps }, default: [])
 Services registered into the DI container. lifetime defaults to
 'singleton'; deps is an ordered array of Symbols (§10.4).

repositories (array of { token, class, deps }, default: [])
 Repository classes — always registered as singletons.

jobs (array of { queueName, class, deps }, default: [])
 BullMQ job-processor classes registered against named queues.

tasks (array of class references, default: [])
 Cron task classes registered into the Scheduler.

routes (array of class references, default: [])
 Fastify HTTP route handler classes registered on the HTTP server.

middleware (array of { class, global: boolean }, default: [])
 Middleware classes. global: true applies system-wide; false
 makes it available only for per-command composition.

migrations (array of string paths, default: [])
 Relative paths to this module's own .ts migration files, run in
 declaration order by MigrationRunner.

locales (string path, optional)
 Path to this module's locale directory, merged into the global
 I18nManager under the module's own namespace at Stage 12.

config (Zod schema, optional)
 Module-specific configuration schema. Variables are prefixed
 with the module name in SCREAMING_SNAKE_CASE.

eventsCatalog (Record<string, { payload: TypeAlias, description: string }>,
 optional)
 Developer-facing documentation of every domain event this
 module emits — powers both generated docs and subscriber
 payload-shape validation.

dashboardSchema (object, optional)
 MDIS schema describing this module's web configuration panel
 (§16.4). Absent ⇒ the module still appears on the dashboard via
 a graceful "Web Panel Not Available" placeholder.
```

**The manifest contract at upload.** `devId` and `buildId` are required at
upload with no default and no fallback: a manifest missing either fails the
shared Zod schema at the Swastik boundary (§15.8), before anything is staged —
the same schema Stage 11 validates against in the bot process, so the identity
chain binds exactly once, at the same place the artifact enters the system.

Tier, `hardcoded`, `visibility`, `devGuildOnly`, and `marketplaceCategory` are
co-constrained, and the shared schema evaluates all eighteen cases:

```
TABLE 11-A — Manifest Co-Constraint Truth Table (18 cases)

┌────┬─────────────┬───────────┬────────────┬──────────────────────┬───────────────────────┬─────────────────┐
│ #  │ tier        │ hardcoded │ visibility │ devGuildOnly         │ marketplaceCategory   │ verdict        │
├────┼─────────────┼───────────┼────────────┼──────────────────────┼───────────────────────┼─────────────────┤
│ 1  │ admin       │ false     │ public     │ required, must be    │ forbidden            │ VALID          │
│ 2  │ admin       │ false     │ unlisted   │ true                 │ forbidden            │ VALID          │
│ 3  │ admin       │ false     │ private    │ true                 │ forbidden            │ VALID          │
│ 4  │ admin       │ true      │ private    │ true                 │ forbidden            │ VALID          │
│ 5  │ core        │ false     │ public     │ forbidden            │ forbidden            │ VALID          │
│ 6  │ core        │ false     │ unlisted   │ forbidden            │ forbidden            │ VALID          │
│ 7  │ core        │ false     │ private    │ forbidden            │ forbidden            │ VALID          │
│ 8  │ core        │ true      │ private    │ forbidden            │ forbidden            │ VALID          │
│ 9  │ standard    │ false     │ public     │ forbidden            │ forbidden            │ VALID          │
│ 10 │ standard    │ false     │ unlisted   │ forbidden            │ forbidden            │ VALID          │
│ 11 │ standard    │ false     │ private    │ forbidden            │ forbidden            │ VALID          │
│ 12 │ standard    │ true      │ private    │ forbidden            │ forbidden            │ VALID          │
│ 13 │ marketplace │ false     │ public     │ forbidden            │ required, one of the │ VALID          │
│ 14 │ marketplace │ false     │ unlisted   │ forbidden            │ five enum values     │ VALID          │
│ 15 │ marketplace │ false     │ private    │ forbidden            │ (see enum above)     │ VALID          │
│ 16 │ marketplace │ true      │ private    │ forbidden            │ required             │ VALID          │
│ 17 │ any         │ true      │ public or  │ —                    │ —                    │ INVALID —      │
│    │             │           │ unlisted   │                      │                      │ hardcoded     │
│    │             │           │            │                      │                      │ forces private │
│ 18 │ any         │ any       │ any        │ devGuildOnly on a    │ category outside     │ INVALID —      │
│    │             │           │            │ non-admin tier, or   │ the five-value enum  │ rejected       │
│    │             │           │            │ devGuildOnly unset   │ on marketplace tier │ outright       │
│    │             │           │            │ on admin tier        │                      │                │
└────┴─────────────┴───────────┴────────────┴──────────────────────┴───────────────────────┴─────────────────┘
```

### 11.3 Manifest vs. Database — What Lives Where

Every field in §11.2's reference belongs to the manifest specifically because it is
fixed at build time and travels with the code itself: a module's name, tier, declared
dependencies, `hardcoded`/`hardcodeGuildId`/`visibility` classification, and its
`devId`/`buildId` pair are all facts about one specific, versioned artifact — unpacked,
validated, and loaded fresh from the manifest at every bootstrap and every hot-swap
(§15.9). None of it is meant to change without a new version being authored, reviewed,
and promoted; the manifest is read, never written, by anything running inside the
application process.

Everything that changes at runtime, independently of any code change, belongs to the
database instead — never the manifest: a guild's own configuration
(`guild_configs`, §23.3), a module's enabled/disabled state per guild
(`guild_module_states`, §13.4), a developer's licensing approval status, and a build's
staging/promotion state are all facts that change on their own schedule, driven by a
guild administrator's action, a project owner's manual approval, or the deployment
pipeline's own progress — never by redeploying code.

```
TABLE 11-A — Manifest vs. Database, Side by Side

┌────────────────────────────────────┬────────────────────────────────────────┐
│ Lives in the MANIFEST (build-time) │ Lives in the DATABASE (runtime) │
├────────────────────────────────────┼────────────────────────────────────────┤
│ Module name, version, tier │ Per-guild enabled/disabled state │
│ hardcoded / hardcodeGuildId / │ Per-guild configuration values │
│ visibility classification │ Developer license state (§15.7) │
│ devId / buildId pair │ Build staging & promotion status │
│ Declared dependencies (depends) │ RBAC role/group/set assignments │
│ Published services (provides) │ Audit history of every change │
│ Commands, events, jobs, tasks, routes │ │
└────────────────────────────────────┴────────────────────────────────────────┘
```

The coordination between the two is deliberately narrow and one-directional: the
manifest declares what a module *is* and *requires*; the database records what is
currently *true* about a specific guild's or developer's relationship to it. The
module registry and the per-guild state service are the two components that read from
both, each for a single, named purpose — validating a manifest's static claims against
the database's live state exactly where that call is needed (a devId/buildId
approval-status check, for instance) — never by writing manifest-shaped data into the
database, or database-shaped data into a manifest. This distinction is what keeps a
module's identity stable across every guild it runs in while still letting each
guild's configuration, and each developer's standing, evolve independently at runtime.

### 11.4 Module Internal Structure — The Canonical Layout

Every module follows this structure. An absent folder means the module has no
deliverable in that category — the framework never requires empty directories.

**Sole authority for module state.** The `guild_module_states` table is the single source of truth for module enabled/disabled state (P13, One Source of Truth). This is an architectural invariant: no code path may write module state to any other table (`src/core/modules/` state management; documentation.md §11.4 and its §51 self-verification report explicitly check this property).

```
TREE 11-A — Canonical Module Layout (moderation used as the illustrative shape)

packages/modules/moderation/
├── manifest.ts ← the module's complete contract declaration
├── index.ts ← onLoad(container) / onReady(client) / onUnload
│
├── commands/
│ ├── ban.command.ts
│ ├── kick.command.ts
│ ├── mute.command.ts
│ ├── warn.command.ts
│ ├── case.command.ts ← /case view | close | delete (subcommand group)
│ ├── history.command.ts
│ ├── purge.command.ts
│ └── viewModHistory.context.ts ← user context menu: "View Mod History"
│
├── events/
│ ├── guildBanAdd.handler.ts
│ ├── guildBanRemove.handler.ts
│ ├── guildMemberRemove.handler.ts
│ └── messageDelete.handler.ts
│
├── services/
│ ├── ModerationService.ts ← primary orchestrator; calls repos + emits events
│ ├── CaseService.ts ← case lifecycle: create, update, close
│ └── PurgeService.ts ← bulk deletion with rate-limit awareness
│
├── repositories/
│ ├── CaseRepository.ts ← all SQL against this module's own case table
│ └── InfractionRepository.ts
│
├── jobs/
│ ├── UnmuteJob.ts ← processes delayed unmute payloads
│ └── AppealNotifyJob.ts
│
├── tasks/
│ └── ExpiredMuteCleanupTask.ts ← daily cron; sweeps unprocessed expired mutes
│
├── config/
│ └── schema.ts ← module Zod config schema
│
├── migrations/
│ ├── 0001_create_cases.ts
│ ├── 0002_create_infractions.ts
│ └── 0003_add_case_appeal_fields.ts
│
├── locales/
│ ├── en-US.json ← required; Stage 11 validation fails without it
│ └── {other-locale}.json ← contributed incrementally
│
└── __tests__/
 ├── ModerationService.unit.test.ts
 ├── CaseService.unit.test.ts
 ├── ban.command.test.ts
 ├── CaseRepository.integration.test.ts
 └── fixtures/
```

### Module Lifecycle Hooks (onLoad, onReady, onUnload)

The Framework Core's ModuleLoader owns the module registry, loader, validation, and lifecycle through three hooks: `onLoad(container)` (wiring from the DI container), `onReady(client)` (gateway connected), `onUnload` (full resource release so a hot-swap can replace the module). Document each hook's purpose, execution order, and error handling — a throwing `onLoad` aborts the module load; a throwing `onUnload` is contained.

### The Module Contract — manifest.ts

The manifest is the module's complete structural declaration; provenance (developer identity, artifact hashes) is missing from the `builds` table today. The contract stays as-is: `manifest.ts` remains structural, and the `builds` table becomes the provenance record.

### Legacy ADR 002 — Flattened Directory Layout (Superseded)

The legacy ADR 002 fixed `src/` as a flat namespace with no `src/core/` wrapper. It is superseded by the tier-volume decision (ADR-005, docs/adr/): module storage no longer lives under `src/` at all — modules live on the four per-tier volumes (§7.3), and first-party modules are seeded through promotion like every other module. The numbered ADR series now lives in docs/adr/.

### 11.5 The Three-Layer Rule Inside a Module

Every module enforces a single-direction dependency structure — commands call
services; services call repositories; neither direction reverses.

```
DIAGRAM 11-A — The Three-Layer Rule

 Command (entry point: validation, routing, presentation)
 │
 ▼
 Service (business logic: decisions, transformations, event emission)
 │
 ▼
 Repository (data access: SQL only — no business logic, no event emission)
```

**Why this matters in practice.** A repository method that emits an event on the bus,
or a command that queries the database directly, violates Principle P3 (Single
Responsibility at Every Layer). The boundary exists so tests can substitute any layer
with a test double without needing anything below it: a service test mocks its
repositories; a command test mocks its services; neither requires a real database or a
real gateway connection (§37.3).

```
ANTI-PATTERN CATALOG — What the Three-Layer Rule Forbids

 ✗ command.execute calling this.database.query(...) directly
 → bypasses the service layer entirely; no business rule is enforced,
 no event is emitted, and the command becomes untestable without a
 real database
 ✗ repository.findActiveCases calling this.eventBus.emit(...)
 → a repository has no business context for WHEN an event should fire;
 that decision belongs one layer up
 ✗ service.banUser calling another module's repository directly
 → skips both module sovereignty (P2) AND the three-layer rule at once;
 the correct path is a published DI token (§14.1 Pattern 2) or a
 ForCrossModuleRead accessor (§14.1 Pattern 3)
```

### 11.6 Module Isolation Rules — Enforced by Tooling, Not Convention

These are not guidelines that rely on reviewer discipline — every one of them is
enforced by the build itself failing.

```
TABLE 11-B — Isolation Rules and Their Enforcement Mechanism

┌───┬─────────────────────────────────────┬────────────────────────────────────┐
│ # │ Rule │ Enforcement │
├───┼─────────────────────────────────────┼────────────────────────────────────┤
│ 1 │ No cross-module relative imports. │ ESLint no-restricted-imports rule │
│ │ The only legal path from Module A into │ with a per-module glob │
│ │ Module B's territory is B's published │ (../../{other-module}/*) — a build │
│ │ DI token, resolved at runtime. │ error, never a runtime one. │
├───┼─────────────────────────────────────┼────────────────────────────────────┤
│ 2 │ No writes to another module's tables. │ Reads only through a declared │
│ │ Cross-module reads only through a │ ForCrossModuleRead accessor (§14.1 │
│ │ declared accessor; writes across a │ Pattern 3), lint-shape-constrained; │
│ │ module boundary are never acceptable. │ writes are a code-review hard stop │
│ │ │ with no equivalent carve-out. │
├───┼─────────────────────────────────────┼────────────────────────────────────┤
│ 3 │ No mutation of another module's │ Zod schema namespacing + │
│ │ configuration namespace. │ prefix-enforcement prevents key │
│ │ │ collisions or overwrites. │
├───┼─────────────────────────────────────┼────────────────────────────────────┤
│ 4 │ No cross-module middleware hooking. │ A middleware in Module A's manifest │
│ │ │ cannot intercept Module B's commands │
│ │ │ unless declared global: true, which │
│ │ │ applies system-wide and must justify │
│ │ │ that scope in review. │
├───┼─────────────────────────────────────┼────────────────────────────────────┤
│ 5 │ Every cross-module dependency is │ A module using another's service │
│ │ declared. No implicit dependencies │ without declaring the token in │
│ │ exist anywhere in the system. │ depends fails to resolve it at Stage │
│ │ │ 12 — a fatal startup error, not a │
│ │ │ silent null. │
└───┴─────────────────────────────────────┴────────────────────────────────────┘
```

### 11.7 The Module Contract — Complete Field Reference

The module contract is the formal interface that every module must implement. It is validated at load time by the ModuleValidator. If any required field is missing or invalid, the module is rejected and transitions to ERROR state. The contract consists of the following fields.

The name field is a string in kebab-case (lowercase letters, digits, and hyphens). It must be globally unique — no two modules may share the same name. The name is used as the module's identifier in the Module Registry, in event namespaces, in permission keys, in the Interface Hub, and in the file system path. Changing a module's name after it has been deployed is not supported — it would break event subscriptions, permission references, and database queries that use the old name.

The tier field is one of Admin, Core, Standard, or Marketplace. It determines the module's visibility, controllability, resilience guarantees, and resource allocation. The tier is declared at development time and cannot be changed at runtime — only the bot owner can reassign a module's tier through the Admin configuration, and even then, the module must be reloaded for the change to take effect.

The version field is a semantic version string (MAJOR.MINOR.PATCH). It is used for compatibility checking — the framework checks the module's declared framework API version against the current framework version. A major version mismatch indicates a breaking change and the module is rejected. A minor version mismatch is allowed with a warning.

The description field is a one to two sentence summary of the module's purpose. It is displayed in the Interface Hub's module list and in the help command. It should be immediately understandable to a non-technical user.

The dependencies field is an array of module names and framework service identifiers that the module requires. Framework service dependencies (database, cache, logger, etc.) are always available. Module dependencies are checked: if a declared module dependency is not loaded or is in ERROR state, the module load fails. The dependency graph must be acyclic — circular dependencies are detected and rejected at load time.

The permissions field is an array of permission objects. Each permission has a key (a string in the format moduleName.permissionName), a name (a human-readable label), a description (what the permission allows), and a default level (everyone, guild_admins, or nobody). Permission keys must be globally unique — no two modules may register the same permission key.

The configSchema field is a Zod schema that defines the module's configuration structure. The schema must have parseable defaults — every field must have a default value that passes validation. This ensures that a module can be enabled in a guild without any configuration and will function correctly with its defaults. The schema is used to validate configuration changes from the Interface Hub, the API, and the configuration command.

The commands field is an array of command definitions. Each command has a name (globally unique, kebab-case), a description (1-100 characters), an array of options (each with a name, description, type, required flag, and optional autocomplete flag), a handler function reference, the command's tier (inherited from the module), an optional permission key, and an optional rate limit configuration (cooldown duration, per-user or per-guild).

The events field is an array of event subscriptions. Each subscription includes the event name (with namespace, e.g., guild.memberAdd), the handler function reference, and an optional filter function. The handler receives the event payload and the module's service container.

The jobs field is an optional array of job definitions. Each job has a name, a schedule (cron expression or interval), a handler function reference, and options (priority, retry count, timeout). Jobs are registered with the SchedulerService at module load time.

The dashboardSchema field is an optional MDIS schema. If present, it defines the module's web configuration panel. The schema includes sections (logical groupings of fields), fields (each with a key, label, description, type, default value, validation rules, and visibility conditions), and actions (buttons that trigger module-defined operations).

### 11.8 Module Lifecycle Hooks — Complete Reference

The lifecycle hooks are the module's opportunity to initialize resources, register handlers, and clean up. Each hook has a specific purpose and is called at a specific point in the lifecycle.

The onLoad hook is called once when the module is first loaded. It receives the resolved service container with all declared dependencies injected. The module uses this hook to initialize internal state, register background jobs, prepare caches, and set up any resources needed for command and event handling. If onLoad throws an error, the module transitions to ERROR state and the error is logged at the error level with the full stack trace. This hook is called exactly once per load — it is not called on enable/disable transitions. The onLoad hook should be idempotent — calling it twice with the same services should not cause side effects. This is important because the framework may retry a failed load.

The onEnable hook is called when the module transitions from DISABLED to ENABLED. It is optional — if not provided, the module is considered enabled immediately. This hook is used to start active processes: beginning a polling loop, establishing a voice connection, starting a scheduled task. If onEnable throws an error, the module remains in DISABLED state and the error is logged. The onEnable hook should be idempotent — calling it when the module is already enabled should not cause side effects.

The onDisable hook is called when the module transitions from ENABLED to DISABLED. It is optional. This hook is used to stop active processes: ending a polling loop, disconnecting from voice, cancelling scheduled tasks. If onDisable throws an error, the error is logged but the module still transitions to DISABLED. The onDisable hook is always called before onUnload. The onDisable hook should be idempotent — calling it when the module is already disabled should not cause side effects.

The onError hook is called when the module encounters an unrecoverable error during loading or runtime. It is optional. This hook allows the module to perform cleanup specific to error scenarios: notifying guild owners that the module is unavailable, releasing external resources, recording the error state. If onError throws an error, the error is logged but the module still transitions to ERROR.

The onUnload hook is called when the module is being unloaded. It is the final cleanup hook — all handlers are deregistered, all resources are released, all background jobs are cancelled. If onUnload throws an error, the error is logged but the module still transitions to UNLOADED. This hook is called exactly once per unload. The onUnload hook must be idempotent — the framework may call it during shutdown even if the module was already unloaded.

The onConfigChange hook is called when the module's per-guild configuration is changed. It receives the old configuration and the new configuration. The module uses this hook to react to configuration changes without requiring a reload: updating cached values, changing rate limits, switching channels. If onConfigChange throws an error, the error is logged but the configuration change is still applied.

### 11.9 Module Isolation Rules — Enforced by Tooling

Module isolation is enforced by a combination of TypeScript's type system, the Service Locator's access control, and the Module Validator's static analysis. These rules are not conventions — they are enforced at compile time and load time.

Rule 1: No module may import another module's internal files. The ESLint configuration includes a rule that prevents imports from src/modules/[other-module]/. Modules may only import from the framework's typed service interfaces (src/core/types/) and their own directory.

Rule 2: No module may directly access the Knex client. The DatabaseService wraps Knex with a typed, tier-aware service. Marketplace modules receive a rate-limited wrapper that counts queries against the per-guild quota. Attempting to bypass the wrapper by importing Knex directly is prevented by the ESLint rule that blocks imports from src/services/DatabaseService.ts (only the typed interface is importable).

Rule 3: No module may directly access the Redis client. The CacheService wraps Redis with a typed, tier-aware service. Marketplace modules receive a rate-limited wrapper that counts cache operations against the per-guild quota.

Rule 4: No module may access the filesystem. The framework does not provide a filesystem service to modules. Modules that need to read configuration files use the ConfigManager. Modules that need to write data use the DatabaseService or CacheService. The ESLint configuration blocks imports from the fs and path modules.

Rule 5: No module may spawn child processes. The framework does not provide a process management service to modules. The ESLint configuration blocks imports from the child_process module.

Rule 6: No module may access environment variables directly. The framework loads all environment variables at boot and exposes them through the ConfigManager. Modules access configuration through the injected ConfigService, not through process.env.

Rule 7: No module may register global event listeners. The framework provides the EventBus for all event communication. Modules may not use process.on, process.once, or any other global event registration mechanism. The ESLint configuration blocks these patterns.

Rule 8: No module may modify the module registry. The ModuleRegistry is a Core infrastructure service that is not injectable into modules. Only the framework's internal lifecycle manager can add, remove, or modify module registrations.

### 11.10 Per-Guild Module State — The guild_module_states Contract

Every module's state in a specific guild is tracked in the guild_module_states table in PostgreSQL. This table is the single source of truth for module enablement, configuration, and lifecycle state per guild.

The table schema includes: guild_id (the Discord guild ID), module_name (the module's unique name), enabled (boolean, whether the module is enabled in this guild), config (JSONB, the module's per-guild configuration validated against its Zod schema), installed_at (timestamp, when the module was first installed/enabled in this guild), last_enabled_at (timestamp, when the module was last enabled), last_disabled_at (timestamp, when the module was last disabled, null if currently enabled), error_count (integer, running count of errors since last reset), last_error (text, the last error message, null if no errors), and resource_usage (JSONB, current resource usage for Marketplace modules).

The default state for a newly-joined guild is determined by the module's tier. Admin and Core modules are enabled by default — the guild_module_states row is created with enabled=true when the bot joins a guild. Standard modules are enabled by default — the row is created with enabled=true and the default config from the Zod schema. Marketplace modules are not installed by default — no row is created until the guild owner installs the module from the Marketplace.

When a Standard module is disabled in a guild, the enabled field is set to false and last_disabled_at is updated. The module's commands are deregistered from Discord for that guild. The module's event subscriptions are paused (the module remains in memory but does not receive events). The module appears in the Marketplace listing for that guild, available for re-enablement. When re-enabled, the enabled field is set to true, last_enabled_at is updated, commands are re-registered, and event subscriptions are resumed. The module's configuration is preserved across disable/enable cycles.

### 11.11 Admin Tier Security Gate — Mechanism and Threat Analysis

The Admin tier security gate is the mechanism that prevents non-owner users from accessing Admin-tier commands. It is the first middleware in the pipeline and runs before permission resolution, rate limiting, and input validation.

The gate operates by checking the invoking user's Discord ID against the owner_ids array in the global configuration. If the user's ID is in the array, the gate passes and the request continues through the middleware pipeline. If the user's ID is not in the array, the gate rejects the request with a "You do not have permission to use this command" message and the handler is never invoked.

The threat analysis for the Admin tier security gate considers several attack vectors. Direct privilege escalation (a non-owner user attempting to invoke an Admin command) is prevented by the gate — the request is rejected before the handler is invoked. Indirect privilege escalation (a non-owner user attempting to access Admin functionality through a Standard or Marketplace module that has a dependency on an Admin module) is prevented by the dependency rules — Standard and Marketplace modules may not declare dependencies on Admin-tier modules. Token theft (an attacker obtaining the bot token and using it to invoke Admin commands directly via the Discord API) is mitigated by the fact that Admin commands are slash commands, not API endpoints — they can only be invoked through Discord's interaction system, which requires the user to be authenticated as the bot owner. Supply chain attacks (a malicious Marketplace module attempting to access Admin functionality) are prevented by the Service Locator's access control — Marketplace modules cannot request Admin-tier services.

### 11.12 Module Lifecycle State Machine — Complete Transition Rules

The module lifecycle state machine governs all state transitions for every module. The transitions are guarded — a module cannot skip states. Every transition is logged with a timestamp, the module name, the old state, the new state, and the triggering event.

The UNLOADED state is the initial state for all modules at bot startup. In this state, the module's code is not in memory, no handlers are registered, and no events are received. The module cannot receive commands or events. The only valid transition from UNLOADED is to LOADING (triggered by a load request from the Module Loader).

The LOADING state is a transient state during which the module's code is being imported, its manifest is being validated, its dependencies are being resolved, its services are being injected, and its onLoad hook is being called. If the load succeeds, the module transitions to ENABLED (or DISABLED if it is disabled by configuration). If the load fails (missing dependency, invalid manifest, onLoad throws), the module transitions to ERROR.

The ENABLED state is the normal operating state. The module can receive commands, process events, and interact with other modules through the event bus. Its commands are registered with Discord, its event subscriptions are active, and its background jobs are running. The module can transition to DISABLED (triggered by a disable request from a guild owner or Admin), to ERROR (triggered by a runtime error exceeding the tier's error threshold), or to UNLOADING (triggered by an unload request from Admin or during shutdown).

The DISABLED state means the module is loaded but not active. It cannot receive commands or events. Its commands are deregistered from Discord, its event subscriptions are paused, and its background jobs are cancelled. The module remains in memory — its code is loaded and its services are injected, but its handlers are not registered. A disabled Standard module appears in the Marketplace listing for that guild. The module can transition to ENABLED (triggered by an enable request) or to UNLOADING (triggered by an unload request).

The ERROR state means the module encountered an unrecoverable error. Its onError hook has been called (if provided). The module is not active. The error details are logged and visible in the Admin debug dashboard. An Admin user can attempt to reload the module, which transitions it back to LOADING. For Marketplace modules, the error state triggers automatic per-guild disablement after the tier's error threshold (10 errors in 60 seconds) is exceeded.

The UNLOADING state is a transient state during which the module's onUnload hook is being called, its handlers are being deregistered, its background jobs are being cancelled, and its dependencies are being released. The only valid transition from UNLOADING is to UNLOADED.

### 11.13 Hot Reload Sequence — Detailed Walkthrough

Hot reload allows a module to be unloaded and reloaded at runtime without restarting the bot process. This is essential for development (testing changes without restarting) and for production (applying module updates without downtime).

The hot reload sequence proceeds as follows. First, the Admin or developer initiates a reload request for a specific module (via the /dumby reload command, the Interface Hub, or the CLI). The LifecycleManager receives the request and initiates the unload sequence. The module transitions from ENABLED (or DISABLED) to UNLOADING. The onDisable hook is called (if the module was enabled). The onUnload hook is called. All command handlers are deregistered from the CommandRegistry. All event subscriptions are removed from the EventBus. All background jobs are cancelled in the SchedulerService. All permission registrations are removed from the PermissionService. The module transitions to UNLOADED.

Then, the load sequence begins. The ModuleLoader re-imports the module's code (fetching the latest version from disk). The ModuleValidator re-validates the manifest. The ServiceLocator re-resolves dependencies and re-injects services. The onLoad hook is called. Commands, events, jobs, and permissions are re-registered. The module transitions to ENABLED (or remains DISABLED if it is disabled by configuration).

The one unavoidable boundary is that hot reload cannot change the module's tier. If a module was declared as Standard and the developer changes it to Core, the hot reload will fail with a "tier change not supported" error. The module must be fully unloaded and the bot restarted for a tier change to take effect. This is because the tier affects the module's visibility, controllability, and resource allocation — all of which are evaluated at boot time.

### 11.14 The Extension Contract — Building a Third-Party Module

The extension contract is the complete specification that a third-party developer must satisfy to build a module for Dumby's Marketplace. It is the same contract that built-in modules satisfy — there is no "second-class" contract for third-party modules. The differences are in the tier (always Marketplace for third-party) and in the additional constraints (resource quotas, security sandboxing, per-guild isolation).

A third-party module begins with the scaffolding CLI, which generates the complete directory structure. The developer fills in the manifest, implements the lifecycle hooks, defines commands and events, writes tests, and adds translations. The module is then published to the Marketplace catalog.

The Marketplace catalog entry includes: the module name, version, description, author, homepage, repository URL, dependencies, permissions, config schema summary, and installation instructions. Guild owners browse the catalog through the Interface Hub, view module details, and install with a single click.

Installation triggers the Module Gateway, which verifies the module's contract against the current framework API version, checks for known security vulnerabilities in the module's declared dependencies, runs the module in a sandboxed environment during installation to detect crashes before enabling it for users, and rejects modules that fail any of these checks.

Once installed, the module is subject to per-guild resource quotas: maximum 5,000 milliseconds of CPU time per minute, maximum 50MB memory usage, maximum 1,000 cache keys, maximum 100 database queries per minute, maximum 50 HTTP requests per minute, maximum 200 event publications per minute, and maximum 10 event subscriptions. Quotas are enforced by the ResourceQuotaEnforcer, which wraps the service injections for Marketplace modules. Quota usage is exposed as Prometheus metrics and visible in the Interface Hub.

### 11.15 The Module Scaffolding Tool — Complete Reference

The module scaffolding CLI generates a complete module directory structure with all required files. The command takes a module name and tier as arguments. The generated structure includes the module.ts file (implementing the IModule interface with the declared tier), a commands directory with a template command, an events directory, a services directory, a jobs directory, a models directory with a template migration, a permissions.ts file with a template permission, a config.ts file with a Zod schema and defaults, a dashboard.ts file with a template MDIS schema, an i18n directory with an en-US.json template, and a tests directory with happy path, unit, and contract test stubs.

The CLI also updates the pnpm-workspace.yaml file with the new module path. For Marketplace modules, it adds the module to the marketplace catalog JSON file. The CLI validates the module name for kebab-case compliance and checks for collisions with existing modules.

The scaffolding tool is designed to make the "cold start" of a new module as fast as possible. A developer runs one command and gets a compilable, testable module skeleton. The developer's job is to fill in the business logic — the framework infrastructure (lifecycle hooks, dependency injection, command routing, event dispatch, permission resolution, configuration management) is already wired up by the scaffold. Generated code imports only the `swastik` authoring package's scoped entry points (§12.21) — a scaffolded module contains zero framework-internal imports by construction, and compiles against the package's published types.

---

---

### 11.16 The Extension Contract — Full Definition

The extension contract is the formal specification that every third-party module must satisfy. It is a binding agreement between the module developer and the framework — the framework guarantees to provide certain services and capabilities, and the module guarantees to conform to certain rules and constraints. The contract is enforced at multiple levels: at compile time (by TypeScript's type system), at load time (by the ModuleValidator), at runtime (by the ServiceLocator's access control and the ResourceQuotaEnforcer), and at publish time (by the Module Gateway).

The extension contract defines the following guarantees and obligations.

The framework guarantees: a typed service container with all declared dependencies injected and ready to use, a middleware pipeline that processes every interaction through the seven fixed layers before the module's handler is invoked, an event bus that delivers subscribed events to the module's handlers in priority order, a configuration system that loads, validates, and hot-reloads the module's per-guild configuration, a permission system that resolves user permissions through the seven-layer resolution sequence, a database service with connection pooling, read replica routing, and transaction support, a cache service with L1/L2 two-tier caching, a logging service with module-scoped child loggers, a metrics service for custom metrics, a tracing service for custom spans, a job queue for background processing, an internationalization service for translations, an HTTP service for external API calls, and a standardized embed and component builder for consistent response formatting.

The module guarantees: a valid manifest with all required fields correctly typed, lifecycle hooks that are idempotent and complete within reasonable timeframes (onLoad within 10 seconds, onEnable within 5 seconds, onDisable within 5 seconds, onUnload within 5 seconds), command handlers that complete within the 15-minute follow-up window, event handlers that complete within 100 milliseconds for Core events and 500 milliseconds for Standard/Marketplace events, no direct access to other modules' internal code, no direct access to the database or Redis (only through the typed service interfaces), no direct access to the filesystem or process spawning, no direct access to environment variables (only through the ConfigManager), no global event listeners (only through the EventBus), and no modification of the module registry.

### 11.17 The Module Manifest — Complete Schema

The module manifest is the object returned by the module's default export. It is a TypeScript object that implements the IModule interface. The ModuleValidator validates every field at load time.

The name field is a string. It must be in kebab-case (lowercase letters, digits, and hyphens only). It must be between 3 and 32 characters. It must be globally unique — no two modules may share the same name. It is used as the module's identifier in the Module Registry, in event namespaces, in permission keys, in the Interface Hub, in the file system path, and in cache key prefixes. Changing a module's name after deployment is not supported.

The tier field is one of: "Admin", "Core", "Standard", "Marketplace". It determines the module's visibility, controllability, resilience, and resource allocation. For third-party modules, it must be "Marketplace".

The version field is a semantic version string. It must follow the format MAJOR.MINOR.PATCH (e.g., "1.0.0"). Pre-release suffixes are allowed (e.g., "1.0.0-beta.1"). Build metadata is allowed (e.g., "1.0.0+build.123").

The frameworkApiVersion field is a semantic version string. It specifies the framework API version that the module was developed against. The ModuleValidator checks this against the current framework version: a major version mismatch causes rejection, a minor version mismatch causes a warning.

The description field is a string between 1 and 200 characters. It is displayed in the Interface Hub's module list and in the help command.

The dependencies field is an array of strings. Each string is either a framework service identifier ("database", "cache", "logger", "http", "tracing", "metrics", "i18n", "scheduler", "audit", "permission") or a module name. Framework services are always available. Module dependencies are checked: if a declared module dependency is not loaded or is in ERROR state, the module load fails.

The permissions field is an array of permission objects. Each permission object has: key (string, format: "moduleName.permissionName", globally unique), name (string, 1-100 characters, human-readable label), description (string, 1-200 characters, what the permission allows), default_level (one of: "everyone", "guild_admins", "nobody").

The configSchema field is a Zod schema. It defines the module's configuration structure. Every field in the schema must have a default value that passes validation. The schema is used to validate configuration changes from the Interface Hub, the API, and the configuration command.

The commands field is an array of command definition objects. Each command has: name (string, kebab-case, 1-32 characters, globally unique), description (string, 1-100 characters), options (array of option objects, each with: name, description, type, required, autocomplete, choices, min_value, max_value, channel_types), handler (function reference), permission_key (optional string, must match a permission in the permissions array), rate_limit (optional object with: cooldown_seconds, per_user, per_guild), installation_context (optional, "GUILD_INSTALL" or "USER_INSTALL"), interaction_contexts (optional array of "GUILD", "BOT_DM", "PRIVATE_CHANNEL"), response_format (optional, "embed", "text", "component", or "hybrid").

The events field is an array of event subscription objects. Each subscription has: event_name (string, with namespace, e.g., "guild.memberAdd"), handler (function reference), filter (optional function reference), priority (optional integer).

The jobs field is an optional array of job definition objects. Each job has: name (string), schedule (string, cron expression or interval like "every 5 minutes"), handler (function reference), options (optional object with: priority, retry_count, timeout_seconds).

The dashboardSchema field is an optional MDIS schema object. It defines the module's web configuration panel with sections, fields, and actions.

The lifecycle field is an object with function references: onLoad (required, called once at load), onEnable (optional, called on enable), onDisable (optional, called on disable), onError (optional, called on error), onUnload (optional, called at unload), onConfigChange (optional, called on configuration change).

### 11.18 The Service Container — What the Module Receives

When a module is loaded, the ServiceLocator creates a service container for the module. The service container is an object that contains all the services that the module has declared as dependencies. Each service is a typed interface — the module interacts with the service through its interface, not its implementation.

For a Marketplace module, the services are wrapped in quota-enforcing wrappers: the DatabaseService is wrapped in a QuotaEnforcingDatabaseService that counts queries and rejects queries when the quota is exceeded, the CacheService is wrapped in a QuotaEnforcingCacheService that counts operations, the HttpService is wrapped in a QuotaEnforcingHttpService that counts HTTP requests, and the EventBus is wrapped in a QuotaEnforcingEventBus that counts event publications. The wrappers are transparent — the module uses the same interface as an unwrapped service. The only difference is that exceeding a quota throws a QuotaExceededError.

The service container also includes a module-scoped child logger (from the LoggerService), a module-scoped tracer (from the TracingService), and a module-scoped metrics collector (from the MetricsService). These are pre-configured with the module's name, so all log entries, trace spans, and metrics from the module are automatically labeled with the module's name.

### 11.19 The Module Isolation Guarantee

The module isolation guarantee states that a module cannot affect other modules or the framework through its actions. This is enforced by the following mechanisms.

Type-level isolation: the module's TypeScript code can only import from the framework's typed interfaces (src/core/types/) and its own directory. The ESLint configuration prevents imports from other modules' directories and from the framework's internal implementation files.

Service-level isolation: the module receives typed service interfaces, not implementation classes. The module cannot access the internals of a service (e.g., the Knex client inside the DatabaseService). The service interfaces expose only the methods that the module is allowed to call.

Data-level isolation: the module's database access is through its own repositories, which query the module's own tables. The module cannot query other modules' tables (enforced by the ESLint configuration that blocks imports from other modules' model directories).

Cache-level isolation: the module's cache keys are prefixed with the module's name (e.g., "dumby:marketplace:my-module:..."). The module cannot read or write other modules' cache keys (the CacheService's module-scoped wrapper enforces this).

Event-level isolation: the module's event subscriptions are for specific event names (Marketplace modules cannot use wildcard subscriptions). The module's event publications are namespaced with the module's name.

Resource-level isolation: the module's resource usage is counted and enforced by the ResourceQuotaEnforcer. Exceeding quotas throws a QuotaExceededError, which prevents the module from consuming unbounded resources.

Error-level isolation: if the module's handler throws an unhandled error, the error boundary catches it, logs it, increments the module's error counter, and sends a generic error response. The error does not propagate to other modules or the framework. If the module's error count exceeds the tier's threshold, the module is auto-disabled, but other modules and the framework continue operating.

---

---

Module artifacts are signed over their exact bytes together with source and gate hashes, and the signature is verified at every load, preventing artifact substitution between review and runtime.

- Identity-only signing.

- Full signing.

Proposed structural change: each module runs in its own sandbox worker (process or container) with a narrow RPC boundary to the core, permission scoping, and resource limits at the boundary. A module swap then becomes worker replacement rather than in-process patching, eliminating the stale-closure / dangling-listener class of hot-reload bugs.

- Proposed main structural change.

- Every module in own sandbox process; swap = worker replacement not in-process patching; solves stale-closure/dangling-listener class of hot-reload bugs.

Content-addressed staging: the build ID is `semver + content hash` (e.g. `2.3.1+sha256:9f1c…`) and staging never overwrites artifacts in place, so the build identity doubles as an integrity check — tamper-evident builds.

- Design specifies Build ID = `semver + content hash`, e.g. `2.3.1+sha256:9f1c…`.

- Implemented as the build identity scheme.

External module loading: modules are loaded from an external Kubernetes volume (`/mnt/modules`) rather than baked into the immutable container image. Bootstrap Stage 10 (MODULE_DISCOVERY) scans `MODULES_DIR`; the container image contains only the Application Core.

- Blueprint scans `src/modules/` during bootstrap Stage 10; modules packaged inside the Docker image layer.

- Modules sourced from a Kubernetes Persistent Volume / hostPath mounted at `/mnt/modules`; container image contains only the Application Core.

The manifest is the module contract: declarative, versioned, shipped with the module, declaring defaults, entry points, permission scope, and dependencies. It is validated three times — locally before upload (fast feedback), at the upload API (gate), and immediately before activation (drift catch).

- Validated three times: locally before upload (fast feedback), at upload API (gate), and immediately before activation (drift catch).

- Maintain triple validation.

may be added beyond this list without a framework-version bump (Principle P1: the
manifest is a complete table of contents for a module without opening a second file).

> **Config cross-check gap:** Swastik does not verify that the module's
> declared config Zod schema matches the schema the code actually uses.
> If compiled code reads `process.env.LEGACY_VAR` while the manifest
> declares `NEW_VAR`, the mismatch surfaces only at module `onLoad`
> startup failure. Runtime config injection via DI is the target state.

## 12. Building a Module — A Complete Worked Example

**Status:** [SPEC]

### 12.1 The Authoring Contract, In Brief

Building a module is a four-step path from an empty directory to a reviewed,
installable artifact: **scaffold** a manifest-valid skeleton; **define** the manifest
and command surface, choosing tier honestly against the module's actual command list
(§13 governs which validation rules that choice triggers); **implement** the entry,
logic, and data layers each in their own file, respecting the three-layer rule
(§11.5); then **test, document, and submit** — a unit test per service, an
integration test per database-touching path, `eventsCatalog` kept current for every
emitted event, and (for a third-party submission specifically) the five-gate review
pipeline in §16.5.

The rest of this section demonstrates that contract concretely, with a single module
built out completely across every layer. **This worked example is a teaching artifact
illustrating the framework's own conventions — it is not a specification of what any
catalog-listed module must contain**, consistent with this reference's treatment of
the module catalog as index-depth by design (§36.1). A "reminders"-shaped module is
used because its scope is small enough to show in full without the example itself
becoming the point.

### 12.2 Step 1 — Scaffold

```
$ pnpm dumby scaffold module reminders

? Description: Personal, timed notifications a user schedules for themself
? Structural components needed: (multi-select)
 ◉ commands ◉ services ◉ repositories ◉ jobs ◯ events ◯ routes
? Requires database tables? Yes → skeleton migration generated
? Needs module-specific configuration? Yes → Zod schema stub generated
? Needs localization? Yes → en-US.json stub generated

✔ Module skeleton created at packages/modules/reminders/
✔ Manifest validates against the Zod schema
✔ Registered but DISABLED — enable it explicitly once it does something
```

### 12.3 Step 2 — The Manifest

```
FILE — packages/modules/reminders/manifest.ts

export const REMINDERS_TOKENS = {
 ReminderService: Symbol('Reminders.ReminderService'),
 ReminderRepository: Symbol('Reminders.ReminderRepository'),
} as const;

export default defineManifest({
 name: 'reminders',
 version: '1.0.0',
 description: 'Personal, timed notifications a user schedules for themself',
 tier: 'standard',
 hardcoded: false,
 visibility: 'private',
 devId: '<issued at developer registration, §15.6>',
 buildId: '<issued per uploaded version, §15.8>',
 required: false,

 intents: [], // no privileged intent needed — DMs are sent via REST, not
 // via a gateway subscription

 commands: [RemindCommand],
 jobs: [
 { queueName: 'reminders:deliveries', class: ReminderDeliveryJob,
 deps: [REMINDERS_TOKENS.ReminderRepository, TOKENS.Logger] },
 ],

 services: [
 { token: REMINDERS_TOKENS.ReminderService, class: ReminderService,
 lifetime: 'singleton',
 deps: [REMINDERS_TOKENS.ReminderRepository, TOKENS.Queue, TOKENS.EventBus] },
 ],
 repositories: [
 { token: REMINDERS_TOKENS.ReminderRepository, class: ReminderRepository,
 deps: [TOKENS.Database] },
 ],

 migrations: ['migrations/0001_create_reminders.ts'],
 locales: 'locales/',

 eventsCatalog: {
 'reminders.reminder.scheduled': {
 payload: 'ReminderScheduledPayload',
 description: 'Emitted when a user successfully schedules a reminder',
 },
 'reminders.reminder.delivered': {
 payload: 'ReminderDeliveredPayload',
 description: 'Emitted after a reminder is successfully DM-delivered',
 },
 },
});
```

#### 12.3.1 `pnpm build:module` — Single-Module Compilation

A pnpm script `build:module <name>` is added to `package.json` that compiles a single module's TypeScript to JavaScript without rebuilding the entire Docker image. This supports the hot-reload workflow (kubectl cp + POST /admin/modules/:name/reload).

**Behavior:**
- Accepts a module name argument and resolves `packages/modules/<name>/`.
- Runs a manifest validation pre-build step (rejects if `manifest.ts` is missing or invalid).
- Invokes `tsc` (or `tsup`) with module-level `tsconfig.json` scoped to that directory.
- Emits compiled output to `dist/modules/<name>/`, ready for `kubectl cp` or volume mount.

**

**Dependency:** Redis-backed state.

### 12.4 Step 3 — The Command Layer

```
FILE — packages/modules/reminders/commands/remind.command.ts

export class RemindCommand implements ICommand {
 data = new SlashCommandBuilder
 .setName('remind')
 .setDescription('Schedule a personal reminder')
 .addStringOption(opt => opt.setName('when').setDescription('e.g. "in 3 hours"').setRequired(true))
 .addStringOption(opt => opt.setName('message').setDescription('What to remind you of').setRequired(true));

 permissions = { discord: [], rbac: 'MEMBER' };
 cooldown = { duration: 10, scope: 'USER' as const };
 guildOnly = false; // a personal reminder is meaningful from a DM too
 requiresDefer = false; // parsing + one INSERT comfortably clears 3s

 async execute(interaction: ChatInputCommandInteraction, context: CommandContext) {
 const when = interaction.options.getString('when', true);
 const message = interaction.options.getString('message', true);

 // Validation is the command layer's job — the service layer assumes
 // well-formed input (§11.5's three-layer rule)
 const fireAt = parseRelativeOrAbsoluteTime(when);
 if (!fireAt) {
 throw new ValidationError('REMINDERS_UNPARSEABLE_TIME', { input: when });
 }

 const reminderService = context.container.resolve<IReminderService>(
 REMINDERS_TOKENS.ReminderService,
 );
 const reminder = await reminderService.schedule({
 userId: interaction.user.id,
 guildId: interaction.guildId, // null if invoked from a DM — the service
 // layer decides what that means, not this file
 message,
 fireAt,
 });

 await interaction.reply({

// NOTE: Swastik remains a separate process; the runtime does NOT
// watch the filesystem for module changes. Module activation is driven by an
// explicit swap request through Swastik, not by fs events.

// NOTE: In-process module hot-swap is implemented via a dedicated
// reload handler (onUnload → re-import → onLoad → onReady) on a mounted volume,
// NOT by kubectl rollout. Module changes are swap-in-place; the bot process stays up.

// NOTE: The in-process reload model (onUnload → re-import → onLoad →
// onReady in the shared bot process) is superseded by per-module sandboxed
// worker processes. Swap = start a new isolated worker, retire the old one;
// the module talks to core over a narrow RPC boundary (child_process/worker_threads
// or sidecar containers, gRPC/IPC, cgroups). This is the main structural change
// that makes hot-swap safe and reliable.

 // NOTE: interaction.reply gives modules total UI freedom (colors,
 // layout, field ordering) — a deliberate compromise, not an enforced
 // standard. Standardized utilities (§20.6, §30, §17.2) are encouraged
 // but not mandated for transactional responses.
 embeds: [buildSuccessEmbed(context.locale, 'reminders.set.success', {
 relativeTime: formatRelative(fireAt, context.locale),
 })],
 ephemeral: true,
 });
 }
}
```

### 12.5 Step 3, Continued — The Service Layer

```
FILE — packages/modules/reminders/services/ReminderService.ts

export class ReminderService implements IReminderService {
 constructor(
 private readonly repo: IReminderRepository,
 private readonly queue: IQueueManager,
 private readonly eventBus: IEventBus,
 ) {}

 async schedule(input: ScheduleReminderInput): Promise<Reminder> {
 // Business rule lives here, never in the command file or the repository
 const delayMs = input.fireAt.getTime - Date.now;
 if (delayMs > MAX_REMINDER_HORIZON_MS) {
 throw new ValidationError('REMINDERS_TOO_FAR_OUT', { maxDays: 90 });
 }

 const reminder = await this.repo.create({
 userId: input.userId,
 guildId: input.guildId,
 message: input.message,
 fireAt: input.fireAt,
 status: 'pending',
 });

 // Pattern 4 (§14.1): scheduling logic is decoupled from the business
 // decision to create a reminder — a subscriber, not this method, owns
 // enqueueing. This keeps ReminderService swappable/testable without a
 // real queue. emit invokes the subscriber synchronously but does NOT
 // await its async enqueue work (§18.4) — schedule returns as soon as
 // the subscriber below has been INVOKED, not necessarily once its own
 // BullMQ call has settled.
 this.eventBus.emit('reminders.reminder.scheduled', {
 reminderId: reminder.id, userId: reminder.userId, fireAt: reminder.fireAt,
 });

 return reminder;
 }
}

// A dedicated subscriber owns the event → job translation (kept in index.ts's
// onLoad, or its own events/ file if the module grows event handlers):
eventBus.on('reminders.reminder.scheduled', async (payload) => {
 await queue.enqueue('reminders:deliveries', { reminderId: payload.reminderId }, {
 delay: payload.fireAt.getTime - Date.now,
 jobId: `reminder:${payload.reminderId}`, // idempotent enqueue (§29.3)
 });
});
```

### 12.6 Step 3, Continued — The Repository Layer

```
FILE — packages/modules/reminders/repositories/ReminderRepository.ts

export class ReminderRepository extends BaseRepository<ReminderRow> {
 protected table = 'reminders'; // owned exclusively by this module (P2, §3)

 async findDuePending(before: Date, limit = 100): Promise<ReminderRow[]> {
 const { records } = await this.findMany(
 { status: 'pending', fireAt: { lte: before } },
 { columns: ['id', 'userId', 'guildId', 'message', 'fireAt'], limit },
 );
 return records;
 }
 // create / findById / updateById / etc. inherited from BaseRepository (§24.3)
 // — no bespoke SQL needed beyond the one query this module's access
 // pattern actually requires
}
```

### 12.7 Step 3, Continued — The Job Layer

```
FILE — packages/modules/reminders/jobs/ReminderDeliveryJob.ts

export class ReminderDeliveryJob extends BaseProcessor<{ reminderId: string }> {

// The QueueManager MUST hold a module-scoped worker-lifecycle map and call
// Worker.close on every processor swap, so that a stale reference to a
// previous processor cannot survive a hot-swap and dispatch a job to retired
// code. Closing the Worker forces BullMQ to release its internal Set of active
// jobs for that processor.
 constructor(
 private readonly repo: IReminderRepository,
 private readonly logger: ILogger,
 ) { super; }

 async process(job: Job<{ reminderId: string }>): Promise<void> {
 const reminder = await this.repo.findById(job.data.reminderId);

 // Idempotency (§29.3): BullMQ guarantees at-least-once delivery, so a
 // re-run of this exact job must be a safe no-op
 if (!reminder || reminder.status !== 'pending') {
 this.logger.info('Reminder already delivered or removed — skipping', {
 reminderId: job.data.reminderId,
 });
 return;
 }

 const user = await this.discordClient.users.fetch(reminder.userId);
 await user.send({ content: `⏰ Reminder: ${reminder.message}` });

 await this.repo.updateById(reminder.id, { status: 'delivered' });
 this.eventBus.emit('reminders.reminder.delivered', { reminderId: reminder.id });
 }
}
```

### 12.8 Step 3, Continued — Migration and Locale

```
FILE — packages/modules/reminders/migrations/0001_create_reminders.ts

export async function up(knex: Knex): Promise<void> {
 await knex.schema.createTable('reminders', (t) => {
 t.uuid('id').primary.defaultTo(knex.raw('gen_random_uuid'));
 t.bigInteger('userId').notNullable; // snowflake, stored as bigint
 t.bigInteger('guildId').nullable; // null ⇒ scheduled from a DM
 t.text('message').notNullable;
 t.timestamp('fireAt', { useTz: true }).notNullable;
 t.string('status', 12).notNullable.defaultTo('pending');
 // Standard audit columns, per §24.5 — every entity table carries these
 t.timestamp('createdAt', { useTz: true }).notNullable.defaultTo(knex.fn.now);
 t.timestamp('updatedAt', { useTz: true }).notNullable.defaultTo(knex.fn.now);
 t.index(['status', 'fireAt']); // supports findDuePending's WHERE clause
 });
}

export async function down(knex: Knex): Promise<void> {
 await knex.schema.dropTable('reminders');
}
```

```json
FILE — packages/modules/reminders/locales/en-US.json

{
 "reminders.set.success": "Got it — I'll remind you {relativeTime}.",
 "reminders.error.unparseable-time": "I couldn't understand \"{input}\" as a time."
}
```

### 12.9 Step 4 — The Unit Test

```
FILE — packages/modules/reminders/__tests__/ReminderService.unit.test.ts

describe('ReminderService.schedule', => {
 it('creates a pending reminder and emits reminders.reminder.scheduled', async => {
 const container = new MockContainer;
 container.register(REMINDERS_TOKENS.ReminderService, ReminderService);
 const service = container.resolve<IReminderService>(REMINDERS_TOKENS.ReminderService);

 const reminder = await service.schedule({
 userId: '123', guildId: '456', message: 'stand up', fireAt: futureDate(3600_000),
 });

 expect(reminder.status).toBe('pending');
 container.eventBus.assertEmitted('reminders.reminder.scheduled', {
 reminderId: reminder.id,
 });
 });

 it('rejects a reminder scheduled beyond the maximum horizon', async => {
 const container = new MockContainer;
 const service = container.resolve<IReminderService>(REMINDERS_TOKENS.ReminderService);

 await expect(service.schedule({
 userId: '123', guildId: null, message: 'too far', fireAt: futureDate(200 * 86_400_000),
 })).rejects.toThrow(ValidationError);
 });
});
```

### 12.10 The Full Execution Trace

```
DIAGRAM 12-A — /remind create Through Delivery, End to End

 User: /remind when:"in 1 hour" message:"stand up"
 │
 ▼
 Middleware pipeline (§19.2) — auth, guild-config, rate-limit, permission,
 RBAC, cooldown all pass; no defer needed
 │
 ▼
 RemindCommand.execute
 │ parses "in 1 hour" → fireAt; validation lives HERE (three-layer rule)
 ▼
 ReminderService.schedule
 │ business rule: horizon check
 ▼
 ReminderRepository.create ──► INSERT INTO reminders (...) [PostgreSQL]
 │
 ▼
 EventBus.emit('reminders.reminder.scheduled', {...})
 │ synchronous — the subscriber below runs before schedule returns
 ▼
 Subscriber enqueues BullMQ job, jobId 'reminder:{id}', delay = 1 hour
 │
 ▼
 interaction.reply — user sees "Got it — I'll remind you in 1 hour."

 ── 1 hour later ──

 BullMQ worker picks up 'reminders:deliveries' job
 │
 ▼
 ReminderDeliveryJob.process
 │ idempotency check: still 'pending'? → yes
 ▼
 Discord REST: send DM to user
 │
 ▼
 ReminderRepository.updateById(id, { status: 'delivered' })
 │
 ▼
 EventBus.emit('reminders.reminder.delivered', {...})
```

### 12.11 What "Done" Looks Like

A finished module: declares a tier honestly against its actual command list; owns
every table it touches; publishes a `provides`/`eventsCatalog` surface exactly as wide
as other modules genuinely need and no wider (since anything published becomes part of
this module's own semver contract, §14.3); meets the unit/integration coverage floor
(§37); and, if it is a third-party submission, has passed the five-gate review
pipeline (§16.5). None of that differs based on whether the module shipped with the
core codebase or arrived from a third party six months later — the contract above is
the same either way, which is the point of treating the module system as the
framework's public extension API rather than maintaining a separate, reduced plugin
interface alongside it.

### 12.12 Choosing the Right Tier

The first decision when building a module is the tier. For third-party developers, the choice is always Marketplace — third-party developers cannot create Admin, Core, or Standard modules. For the framework team, the choice depends on the module's purpose.

If the module manages the bot itself (system administration, global configuration, debug inspection, module lifecycle management), it should be an Admin module. Admin modules are bot-owner-only and bypass application-level rate limits. If the module provides framework-essential functionality that every guild needs (help system, settings management, permission management, module management), it should be a Core module. Core modules cannot be disabled by guild owners. If the module provides a common feature that guild owners may want to enable or disable (moderation, logging, welcome, leveling, economy, tickets, giveaways), it should be a Standard module. Standard modules are enabled by default but can be disabled.

### 12.13 Designing the Module's Interface

Before writing any code, the developer designs the module's interface: the commands it will provide, the events it will subscribe to, the permissions it will declare, the configuration it will accept, and the dashboard it will render.

Command design follows the principle of progressive disclosure: simple commands for common tasks, advanced commands for complex tasks. Each command should do one thing well. Avoid "god commands" that try to do everything with many options. Instead, provide multiple focused commands (e.g., /ban, /kick, /warn instead of /moderate action:ban user:@user reason:...).

Event subscription design follows the principle of minimal subscription: subscribe only to events that the module needs. Subscribing to all events (using wildcards) wastes resources and may expose the module to events it does not need. Subscribe to specific events (e.g., guild.memberAdd, not guild.*).

Permission design follows the principle of granular control: declare permissions that map to the module's functionality. Instead of one "manage" permission that controls everything, declare separate permissions for each function (e.g., "moderation.ban", "moderation.kick", "moderation.warn", "moderation.view", "moderation.config"). This allows guild administrators to fine-tune who can do what.

Configuration design follows the principle of sensible defaults: every configuration field has a default value that makes the module work correctly out of the box. The guild owner should be able to enable the module without any configuration and have it work. Configuration options are for customization, not for basic functionality.

### 12.14 Implementing the Lifecycle Hooks

The lifecycle hooks are the module's opportunity to initialize resources, register handlers, and clean up. The developer implements each hook according to the module's needs.

The onLoad hook is where the module initializes its internal state. The developer uses this hook to: create internal caches (Maps for frequently accessed data), initialize service references (store references to injected services for use in command handlers), prepare any resources needed for command and event handling (e.g., compile regular expressions, load translation files, pre-compute lookup tables), and register background jobs (if the module has scheduled tasks).

The onEnable hook is where the module starts active processes. The developer uses this hook to: start polling loops (if the module polls an external API), establish connections (e.g., connect to an external WebSocket), and start scheduled tasks that should only run when the module is enabled.

The onDisable hook is where the module stops active processes. The developer uses this hook to: stop polling loops, close connections, and cancel scheduled tasks. The onDisable hook must be idempotent — calling it when the module is already disabled should not cause errors.

The onUnload hook is where the module releases all resources. The developer uses this hook to: clear internal caches, release service references, and cancel any remaining background jobs. The onUnload hook is the final cleanup — after it completes, the module's code is removed from memory.

The onConfigChange hook is where the module reacts to configuration changes. The developer uses this hook to: update cached values (e.g., if the welcome channel changes, update the cached channel ID), change rate limits (e.g., if the cooldown is changed, update the rate limit configuration), and switch channels (e.g., if the logging channel changes, update the target channel for log messages).

### 12.15 Implementing Command Handlers

Command handlers are the module's primary interface with users. Each command handler receives an interaction context and executes the command's business logic. The developer implements command handlers following these patterns.

The validate-first pattern: the handler first validates all preconditions before executing the main logic. For example, a ban command first checks if the target user is bannable, if the bot has the BAN_MEMBERS permission, and if the target's role hierarchy is below the bot's. Only after all checks pass does the handler execute the ban.

The confirm-destructive pattern: for destructive commands (ban, kick, delete, reset), the handler uses the ConfirmationHelper to ask the user for confirmation before executing the action. This prevents accidental destructive actions.

The defer-long-running pattern: for commands that take more than 2.5 seconds (e.g., data exports, bulk operations), the handler calls defer at the beginning and sends the response when the operation completes.

The paginate-large-results pattern: for commands that return large amounts of data, the handler uses the PaginationHelper to split the results across multiple pages.

The ephemeral-sensitive pattern: for commands that return sensitive information (e.g., a user's moderation history), the handler sends the response as an ephemeral message so that only the invoking user can see it.

### 12.16 Implementing Event Handlers

Event handlers are the module's way of reacting to Discord events. Each event handler receives an event context and processes the event. The developer implements event handlers following these patterns.

The filter-early pattern: the handler first checks if the event is relevant to the module (e.g., is the module enabled in this guild? is the event from a channel the module cares about?). If not, the handler returns immediately without processing. This minimizes unnecessary work.

The cache-first pattern: the handler first checks the cache for any data it needs (e.g., the guild's configuration, the user's profile). Only on a cache miss does it query the database. This minimizes database load.

The fire-and-forget pattern: for events that do not require a response (e.g., logging a member join), the handler processes the event and returns without sending a message to Discord. This minimizes Discord API calls.

The respond-if-configured pattern: for events that may require a response (e.g., welcoming a new member), the handler checks the configuration to determine if a response should be sent. If the welcome message is configured, the handler sends it. If not, the handler returns without sending.

### 12.17 Writing Tests

Tests are essential for module quality. The developer writes tests following the testing pyramid: a broad base of unit tests, a narrower layer of integration tests, and a small tip of E2E tests.

Unit tests cover: command handlers (verify that the handler produces the correct response for various inputs), event handlers (verify that the handler processes events correctly), utility functions (verify that helper functions produce correct outputs), and configuration validation (verify that the Zod schema accepts valid configurations and rejects invalid ones). Dependencies are mocked — the service container is replaced with mock services that return predefined data. Unit tests run in milliseconds.

Integration tests cover: database access (verify that the module's repositories correctly query the database), event delivery (verify that the module's event handlers receive and process events from the EventBus), and the middleware pipeline (verify that the module's commands pass through the middleware pipeline correctly). Integration tests use a real Redis and PostgreSQL instance (in Docker containers). Integration tests run in seconds.

Contract tests verify that the module satisfies the module contract. The framework team provides contract tests that run against every module. The developer ensures that the module passes all contract tests.

### 12.18 Preparing for Publication

Before publishing the module, the developer: runs the full test suite (pnpm test) and ensures all tests pass, runs the contract tests (pnpm test:contract) and ensures all contract tests pass, runs the linter (pnpm lint) and ensures no lint errors, runs the type checker (pnpm typecheck) and ensures no type errors, checks the test coverage (pnpm test:coverage) and ensures it meets the targets (90 percent line, 80 percent branch), performs a security review (check for hardcoded secrets, input sanitization, output encoding, error handling, dependency security), creates the marketplace catalog entry, and creates a release tag.

### 12.19 Post-Publication

After the module is published, the developer: monitors the module's performance through the Interface Hub (resource usage, error count, installation count), responds to user feedback through the Marketplace's review system and the support Discord server, fixes bugs and releases patch versions, adds features and releases minor versions, updates dependencies and re-runs the Module Gateway verification, and deprecates the module when it is no longer maintained (following the deprecation process).

---

### 12.21 The `swastik` Authoring Package

Module authoring code imports the **`swastik` package** — a versioned, standalone
package with scoped entry points, not deep framework-path imports. The package is
published and versioned independently of the framework runtime, and a module's
dependency on it is a normal semver pin recorded in the Compatibility Ledger
(§14.4):

```
PACKAGE 12-A — Scoped Entry Points

 swastik/manifest      defineManifest, the manifest schema, and
                       the tier/visibility/hardcode co-constraint
                       types (§11.2)
 swastik/commands      ICommand, the declared-response types the
                       Renderer consumes, middleware and permission
                       declarations (§17.2)
 swastik/events        IEventHandler, the eventsCatalog declaration
                       helpers (§18.6)
 swastik/testing       MockContainer, fixtures, and the module test
                       harness (§37.3)
 swastik/scaffold      The scaffolding CLI's templates and validators
                       (§11.15, §38.1)
```

The rule is absolute: a module never imports from a framework-internal path. Every
type, helper, and schema a module author consumes arrives through one of these
scoped entry points, so the authoring contract is stable even while the framework's
internals reorganize underneath it — the tier-volume migration (§7.3) and the
renderer transition (§20.8) are invisible to a module that imports only the package.
This is a breaking change for modules importing framework internals: those imports
fail the upload gate's import scan (§15.8), and the migration is the scaffolding
CLI's `swastik migrate` path.

### Module Sovereignty: Table Ownership and the Repository Pattern

Every module owns its database tables exclusively. Knex — a query builder, deliberately not an ORM — plus the repository pattern is the framework's only database abstraction (see `apps/main/src/db/repositories/base.repository.ts`); there are no active-record entities, and none are planned. All reads and writes of a module's data flow through that module's own repositories, which makes a cross-module direct query structurally awkward to write and immediately visible in review. This is intentional: module sovereignty acts as both an isolation boundary and a privacy control.

### Strict TypeScript Is Non-Negotiable

Strict TypeScript is enforced project-wide — including `exactOptionalPropertyTypes` and `noUncheckedIndexedAccess` — and no JavaScript source ships. `tsc` is the mandatory first-position CI gate, ahead of lint, test, and deploy (`apps/main/tsconfig.json`, `.github/workflows/ci.yml`). Module authors inherit this obligation directly: a module that does not typecheck cleanly under the same strict flags does not build, and strictness is part of the authoring contract rather than an optional style preference.

### 12.20 Module Development Lifecycle — From Concept to Production

This section documents the complete lifecycle of a module from the initial concept through production deployment. It is the guide for a developer who wants to build and publish a module on Dumby's Marketplace.

#### 90.1 Concept and Planning

The module development lifecycle begins with a concept. The developer identifies a need that is not met by existing modules — perhaps the guild needs a sophisticated poll system with ranked voting, or a ticket system with custom workflows, or a music module with playlist management. The developer evaluates whether the concept is suitable for Dumby by checking the following criteria.

The concept should be a self-contained feature that does not require deep integration with other modules. While modules can communicate through the EventBus and Published Service Contracts, deeply integrated features (that require synchronous access to another module's internal state) are better implemented as part of that other module. The concept should fit within one of the four tiers. If the concept is infrastructure (managing the bot itself), it should be an Admin or Core module — but third-party developers cannot create Admin or Core modules, so the concept must be a feature module (Standard or Marketplace). The concept should not duplicate an existing module's functionality. If an existing module covers 80 percent of the concept, the developer should consider contributing to that module rather than creating a new one. The concept should be implementable within the resource quotas (for Marketplace modules): 5,000ms CPU per minute, 50MB memory, 1,000 cache keys, 100 database queries per minute, 50 HTTP requests per minute, 200 event publications per minute, 10 event subscriptions.

#### 90.2 Scaffolding

The developer runs the scaffolding CLI: pnpm dumby scaffold --name my-poll-system --tier marketplace. The CLI generates the complete module directory structure with all required files. The developer reviews the generated files and begins implementation.

#### 90.3 Implementation

The developer implements the module by filling in the generated files. The module.ts file is the main entry point — it implements the IModule interface and exports the module manifest. The developer fills in the manifest fields (name, tier, version, description, dependencies, permissions, configSchema, commands, events, jobs, dashboardSchema, lifecycle hooks).

The commands directory contains the module's command definitions. Each command is defined in its own file. The developer implements the command handler function, which receives the interaction context and executes the command's business logic. The developer also implements the autocomplete handler (if the command has autocomplete-enabled options).

The events directory contains the module's event subscriptions. Each subscription is defined in its own file. The developer implements the event handler function, which receives the event context and processes the event.

The services directory contains the module's internal services — repositories for database access, helpers for business logic, and adapters for external APIs. The developer implements these services as typed classes that receive their dependencies through the service container.

The jobs directory contains the module's background job definitions. Each job is defined in its own file. The developer implements the job handler function, which receives the job data and executes the job's business logic.

The models directory contains the module's database migrations. The developer adds the module's database tables as a Knex migration.

The permissions.ts file defines the module's permissions. The developer declares the permission keys, their human-readable names, their descriptions, and their default levels.

The config.ts file defines the module's configuration schema using Zod. The developer defines the configuration fields, their types, their validation rules, and their default values.

The dashboard.ts file defines the module's MDIS dashboard schema. The developer defines the configuration panel's sections, fields, and actions.

The i18n directory contains the module's translation files. The developer creates at least an en-US.json file with all user-facing strings.

The tests directory contains the module's test files. The developer writes unit tests for command handlers, event handlers, utility functions, and configuration validation. The developer also writes integration tests for database access, event delivery, and the middleware pipeline.

#### 90.4 Testing

The developer runs the test suite: pnpm test. The unit tests run first (fast, in-memory), followed by the integration tests (slower, requires Docker for PostgreSQL and Redis). The developer fixes any test failures and ensures that the coverage targets (90 percent line, 80 percent branch) are met.

The developer also runs the contract tests: pnpm test:contract. The contract tests verify that the module satisfies the module contract — the formal interface that the framework requires. If any contract test fails, the module cannot be loaded.

The developer tests the module manually by starting the bot in the development environment (pnpm dev) and invoking the module's commands in the test guild. The developer verifies that the commands work correctly, that the events are processed correctly, and that the configuration panel renders correctly in the Interface Hub.

#### 90.5 Security Review

Before publishing, the developer performs a security review of the module. The review checks for: hardcoded secrets (API keys, tokens, passwords — these should be loaded from the ConfigManager, not hardcoded), input sanitization (all user input is sanitized — the InputSanitizer handles this automatically, but the developer should verify that no raw user input is passed to the database or external APIs), output encoding (all user-provided content in responses is encoded — the ResponseBuilder handles this automatically, but the developer should verify), error handling (all errors are caught and handled gracefully — no unhandled promise rejections, no sensitive information in error messages), and dependency security (all npm dependencies are scanned for known vulnerabilities using npm audit).

#### 90.6 Publishing to the Marketplace

The developer publishes the module to the Marketplace catalog. The publishing process is: the developer creates a marketplace entry in the catalog JSON file with the module's name, version, description, author, homepage, repository, dependencies, permissions, and config schema summary. The developer commits the module to the repository and creates a release tag . The CI pipeline runs the full test suite and builds the module. The Module Gateway verifies the module (contract verification, dependency security scanning, static code analysis, sandboxed execution, resource quota validation). If all checks pass, the module is added to the Marketplace catalog and is available for installation.

#### 90.7 Maintenance

After publishing, the developer maintains the module by fixing bugs, adding features, and updating dependencies. Bug fixes are released as patch versions ( → ). New features are released as minor versions ( → ). Breaking changes are released as major versions ( → ) with a migration guide.

The developer monitors the module's performance through the Interface Hub's module management panel, which shows the module's resource usage, error count, and installation count. The developer responds to user feedback through the Marketplace's review system and the support Discord server.

#### 90.8 Deprecation

If the developer decides to deprecate the module (stop maintaining it), the following process is followed. The developer marks the module as deprecated in the Marketplace catalog. The Interface Hub displays a deprecation warning for guild owners who have the module installed. The developer provides a migration path (if a replacement module exists) or a data export tool (so guild owners can export their data before the module is removed). After a 90-day deprecation period, the module is removed from the Marketplace catalog. Guild owners who have the module installed can continue using it, but no new installations are allowed. The module's source code remains available in the repository for reference.

---

## 13. Module Tiers & Lifecycle

**Status:** [SPEC]

### 13.1 Why Tiers Exist

Not all modules stand in the same relationship to a guild. Bot-owner tooling and
essential configuration infrastructure should never be toggleable by a guild
administrator. Features like moderation or leveling should ship pre-enabled but stay
under a guild's control. Integrations with third-party APIs or audio streaming should
require explicit installation before appearing anywhere. A single flat list of
"modules" cannot express these distinctions without an implicit convention no
enforcement mechanism upholds — tiers make the distinctions explicit, mandatory, and
enforced by both the manifest validator and the runtime dispatcher.

### 13.2 The Four Tiers

```
TABLE 13-A — Tier Reference

┌────────────┬──────────────────┬──────────────────┬─────────────┬─────────────┬─────────┐
│ Tier │ Pre-Installed? │ Guild-Visible │ Who Toggles? │ Rate Limits? │ In │
│ │ │ Default? │ │ │ Catalog?│
├────────────┼──────────────────┼──────────────────┼─────────────┼─────────────┼─────────┤
│ Admin │ N/A — dev guild │ Never (non-owners) │ No one │ No — bypass │ Never │
│ │ only │ │ │ at priority │ │
│ │ │ │ │ -10 │ │
│ Core │ Yes, permanent │ Yes, always │ No one │ Yes │ Never │
│ Standard │ Yes, by default │ Yes, until disabled │ Guild │ Yes │ Yes, if │
│ │ │ │ ADMINISTRATOR │ │ disabled│
│ Marketplace │ No │ No, until installed │ Guild │ Yes │ Yes, if │
│ │ │ │ ADMINISTRATOR │ │ absent │
└────────────┴──────────────────┴──────────────────┴─────────────┴─────────────┴─────────┘
```

**Admin.** Accessible only to users in the process owner list, only within the
designated development guild. Admin-tier commands bypass the full middleware chain
(they skip everything after the owner-gate grants access, §19.2) — no rate limits
apply, and no guild administrator can see, enumerate, or invoke them. The dev-guild
restriction is a Discord-level deployment restriction — commands are never registered
outside the development guild — not merely a runtime check; a production guild's slash
command list structurally cannot include Admin-tier entries.

**Core.** Loaded for every guild, permanently, with no disable mechanism. If a
Core-tier module exists in a deployment, its commands appear in every guild's command
list unconditionally and pass through the full middleware chain with one deliberate,
tier-defining exception: rate limits and Discord-native permission checks (Layers 4–5
of the permission engine, §21.2) apply exactly as for any other tier, but AdminTierGateMiddleware implements the documented five explicit admin-gate layers, not a single botOwnerIds check, so each layer (owner, dev-guild, tier, role, contextual) is evaluated as specified —

bootstrap.ts instantiates MiddlewarePipeline at Stage 09 and the live CommandRouter.dispatch runs every interaction through it — the composed chain is the only dispatch path, asserted by the structural wiring test in CI (§19.1).

A single PermissionResolver drives all documented middleware layers with the specified fail semantics: layers 4 and 7 fail-open; layers 2, 3, 5, and 6 fail-closed (per §4). The live middleware files are reconciled to the documented 7-layer model.

PermissionResolver, although registered in the DI container, must be resolved and invoked as a mandatory stage of every command dispatch through the 12-stage middleware pipeline; registration without resolution is a defect, not a design.

The single live command router (src/commands/register-all.ts) must dispatch every interaction through the 12-stage middleware pipeline, invoking PermissionResolver, rate limiting, and audit logging; the orphaned spec-faithful src/commands/ (the canonical command system) router is removed and CI no longer tests dead code.
by design, never by omission. Access to Core-tier functionality is governed
exclusively by the native Discord permissions a Core-tier command declares, since
Core-tier functionality is meant to be reachable through the permission model every
Discord server administrator already understands, independent of whatever RBAC
structure a guild has or hasn't configured.

**Standard.** Once installed, enabled by default for every guild, but optionally
disableable by a guild administrator. A disabled Standard module's commands disappear
from that guild's slash command list immediately, and its event handlers stop firing
for that guild. The disabled module is relisted in the extension catalog as
"Previously Installed," letting an admin re-enable it later.

**Marketplace.** Not pre-installed. A guild administrator must discover and explicitly
install a Marketplace module before any of its commands appear. Once installed,
Marketplace modules behave identically to Standard modules in every operational
respect — same middleware, same permission engine, same RBAC. Uninstalling returns the
module to the catalog listing.

### 13.3 Tier as a Manifest Field — Validation Rules

Tier is required in every manifest — omitting it is a hard validation failure at
Stage 11, before any module loads. The Zod schema enforces these co-constraints:

```
VALIDATION RULES — Tier Co-Constraints

 tier === 'admin' ⇒ devGuildOnly MUST be true
 tier === 'marketplace' ⇒ marketplaceCategory MUST be present and valid
 tier !== 'marketplace' ⇒ marketplaceCategory MUST be absent
 tier === 'standard' AND marketplaceCategory present ⇒ validation error
 (the field's presence signals a tier mismatch)
 tier === 'core' ⇒ no command may declare a non-default permissions.rbac
 value — Core-tier access is governed exclusively by
 permissions.discord (§13.2); a Core-tier command still
 carrying an RBAC requirement is caught before the
 module ever ships
 hardcoded === true ⇒ hardcodeGuildId required, visibility MUST be 'private',
 releaseStatus MUST be 'private'
 hardcoded === false ⇒ visibility required, hardcodeGuildId forbidden
 (mutually exclusive by construction — a manifest can
 never leave a module's public-release eligibility
 ambiguous)
 releaseStatus ∈ { 'private' | 'public' } — co-constrained with the hardcoded
 triad through the manifest schema's superRefine (§11.2);
 the browsable catalog's listing filters admit releaseStatus
 'public' only, so a 'private' or hardcoded module never appears
 in any listing (§16.2)
 guildId values are branded snowflake types (`GuildId`) end to end — a
 userId or channel ID passed where a guild ID is expected is a
 compile-time error, never a silent scoping bypass (§11.2)
 visibility ∈ { 'public' | 'unlisted' | 'private' } — the first-class
 visibility enum, validated at all three manifest validation points
 (development, upload, activation) and co-constrained with tier and
 the hardcoded toggle. 'public' lists the module in the browsable
 catalog; 'unlisted' is installable by direct reference but never
 listed; 'private' is invisible to every guild but the owning
 developer's (§11.2).
 hardcoded === true permanently pins the module to hardcodeGuildId:
 its commands register as guild-scoped commands in that guild only
 (§17.4), it can never be released publicly, and it requires
 'private' visibility (§11.2)
```

### 13.4 Per-Guild Module State — The `guild_module_states` Contract

Admin- and Core-tier modules need no per-guild state — their controllability is
global and static. Standard- and Marketplace-tier modules maintain one row per guild
per module in `guild_module_states`, guild_module_states cache invalidation uses an acknowledged transport (Redis Streams with consumer acknowledgements) or version-stamped cache keys with a shortened TTL on safety-critical reads, so a dropped invalidation cannot leave a pod serving stale state for up to 60s. Module enable/disable status is never

ModuleRegistry.discover accepts a configurable root directory: default src/modules in development, overridable via the MODULES_DIR env var (e.g. /mnt/modules in production). The discovery logic (expects a subdirectory containing manifest.ts) is unchanged.
represented as a field inside the `guild_configs` JSONB document (§23.3) — it lives
exclusively in this dedicated table, with its own cache key and its own write-path
transaction, so there is exactly one place this state can be read or written from.

```
SCHEMA 13-A — guild_module_states

guild_module_states
 guildId snowflake PK (composite with moduleSlug)
 moduleSlug string PK (matches manifest name)
 tier 'standard' | 'marketplace' -- denormalized for filter speed
 status 'active' | 'disabled' | 'never_installed'
 | 'install_pending_resolution'
 -- a command-name collision with an already-active module
 -- is unresolved (§17.9); the module dispatches nothing
 -- until an admin resolves it
 wasStandardDefault boolean -- display-only: was this pre-installed Standard?
 installedAt timestamptz, nullable
 disabledAt timestamptz, nullable
 dataRetentionPolicy 'retain' | 'purge_after_30d' -- applied on disable
 createdAt / updatedAt / createdBy / updatedBy -- standard audit columns
```

```
DIAGRAM 13-A — Read Path (Evaluated Before Every Standard/Marketplace Dispatch)

 GuildModuleStateService.isActive(guildId, moduleSlug)
 │
 ▼
 1. L1 in-process LRU key: 'guild:module-state:{guildId}:{moduleSlug}'
 │ hit ─────────────────────────────────────────────► return
 │ miss
 ▼
 2. Redis L2, same key, TTL 60s
 │ hit ── backfill L1 ──────────────────────────────► return
 │ miss
 ▼
 3. PostgreSQL read replica
 │
 ├─ row FOUND ────────────────────── populate both caches, return
 │
 ├─ row GENUINELY ABSENT (not an outage) ──► resolve to the module's
 │ tier default: active for Standard, never_installed for
 │ Marketplace; WRITE that resolved value back as the row's
 │ initial state — the guild's first interaction with the module
 │ is also the moment its row is created. No guild is ever
 │ without its Standard-tier features while waiting for an
 │ explicit row to exist.
 │
 └─ CACHE MISS CAUSED BY DATABASE UNAVAILABILITY ──► return DISABLED
 (fail-closed). A database outage never grants access to a
 module a guild turned off. NOTE: a read-replica-only outage
 with a healthy primary is NOT treated as a database outage
 for this purpose — Step 3 falls through to the primary before
 returning DISABLED; DISABLED is reserved for the case where
 neither replica nor primary is reachable.
```

**Write path.** Executed only on explicit toggle operations. A single database
transaction writes the new status row, timestamps the change, and invalidates the
Redis key synchronously before the transaction commits — there is no propagation
window between a guild admin disabling a module and its commands ceasing to dispatch.

### 13.5 Proactive Backfill Migration

The read path's defaulting rule above guarantees correct behavior for any guild/module
pair with no row yet, so no guild's Standard-tier features are ever gated on a backfill
having run. What a proactive backfill migration provides instead is **auditability**:
rather than every guild's rows being created lazily, one at a time, at whatever moment
each guild first invokes each module, a backfill migration proactively creates a
complete, deployment-timestamped set of rows for every existing guild during bootstrap
Stage 06, so `installedAt` reflects a known rollout moment rather than a scattered
history of first-use timestamps.

```
PSEUDO-SQL 13-A — Backfill Logic

For every guild_id in the guilds table:
 For every module with tier 'standard' in the loaded module registry:
 INSERT INTO guild_module_states (guildId, moduleSlug, tier, status, wasStandardDefault)
 VALUES (guild_id, module.name, 'standard', 'active', true)
 ON CONFLICT (guildId, moduleSlug) DO NOTHING;
```

The `ON CONFLICT DO NOTHING` clause makes this idempotent: re-running it never
overwrites a row an administrator already modified, and never overwrites a row the
read path's defaulting rule already lazily created. A failure here is logged and
alerted on, not fatal to Stage 06 — the deployment proceeds, and any guild the
migration didn't reach simply gets its rows created lazily by the same defaulting rule
that covers every brand-new guild.

Expand-only migrations: pre-rollout migrations are expand-only and compatible with the old code; destructive drops and constraint tightening are deferred until the new version is stable.

- Confirmed.

- Implement in migration runner.

### 13.6 Admin-Tier Security Gate — Mechanism and Threat Model

Admin tier's bypass of the ordinary rate-limit and permission chain makes it the

5-layer defense: (1) IP allowlist, (2) auth token, (3) bot owner check, (4) audit pre-log, (5) rate limit — or per spec §13.6.

single most consequential surface in the framework to secure correctly, for any
deployment that builds an Admin-tier module at all. The protection below is a property
of the tier *mechanism* itself — it applies to whatever Admin-tier commands a
deployment's own module declares, not to any specific command this reference defines —
and is deliberately layered so no single misconfiguration exposes it.

> **Dispatch-path invariant:** every command dispatch path — including any live/hot-swap command router — MUST compose the canonical `MiddlewarePipeline` and resolve `PermissionResolver` rather than performing an inline scope check followed by a direct `execute`. A thinner live router that bypasses the middleware chain (tier/permission/rbac/cooldown) is a security hole; only the hexagonal `CommandRouter` that routes through the pipeline is permitted to dispatch commands.

```
DIAGRAM 13-B — The Five-Layer Admin-Tier Defense

 LAYER 1 — DISCORD COMMAND REGISTRATION SCOPE (structural, holds before any
 framework code runs)
 Admin-tier commands are registered exclusively to the development guild,
 never globally, AND with defaultMemberPermissions: 0n — a platform-level
 lock hiding the command from every member's UI regardless of their
 permissions. A non-owner in the dev guild doesn't fail a check; they never
 see the command exists to try. Every tier, Admin included, registers
 guild-context only — the complete DM prohibition (§17.10) applies uniformly,
 with no exception for any tier of the main bot.
 │
 ▼
 LAYER 2 — AdminTierGateMiddleware, PRIORITY -10 (runs before every other

 (Confirmed-developer gatekeeping): The review pipeline must address the
 social dynamics of confirmed-developer-only gating — the risk that a small
 gatekeeper cohort becomes a bottleneck or single point of trust failure. The
 gate is documented here as a pattern with explicit reviewer-rotation and
 multiple-approver requirements, not a single developer's discretion.

 middleware, including tracing)
 Verifies: interaction.user.id ∈ BOT_OWNER_IDS, AND the interaction arrives
 through one of exactly two valid contexts (development guild, or a DM — no
 lesser scrutiny for either). Any other combination ⇒ SILENT REJECT: no
 Discord reply of any kind, logged at warn with full context. Silence is
 deliberate — a distinguishable "permission denied" response is itself a
 small information leak an attacker could use to confirm a command exists
 or that their user ID was close to authorized.
 │
 ▼
 LAYER 3 — BOT_OWNER_IDS environment variable
 Process-level configuration, not a database value — cannot be modified
 through any command, any API call, or any guild administrator action. Only
 a deployment change with access to the process environment changes it.
 │
 ▼
 LAYER 4 — ENVIRONMENT GUARD on a deployment's most dangerous Admin-tier
 capability (a pattern, not a shipped feature)
 Whatever the single most dangerous capability a deployment's own
 Admin-tier module exposes turns out to be (arbitrary code evaluation is
 the illustrative worst case), the pattern this framework provides is an
 additional, independent check — an explicit enable flag AND
 NODE_ENV !== 'production' — before allowing execution. Disabling it
 requires a deployment change, not a bot command, and it stays inert in
 production regardless of Layers 1–3's state.
 │
 ▼
 LAYER 5 — TIME AND OUTPUT BOUNDING (a pattern, applied per-capability)

 (Single permission engine): Both the bot command path and the web/MDIS
 path resolve permissions through the SAME pure 7-layer resolver — there is no
 separate trusted-source resolver for the web surface. Matrix item #34 (split
 engines) is resolved by wiring web through the bot's resolver.

 (Permission engine wiring): The pure 7-layer permission resolver and the
 12-stage middleware pipeline are wired into the live command dispatch path so
 every interaction — bot and web — flows through the single engine. No command
 bypasses resolver Layers 4–6 or the middleware chain.

 Independent of whether execution is permitted at all: run under a hard
 timeout with truncated, narrowly-scoped output, bounding both how much
 damage one invocation can do and how much of its output persists.
```

**Why the pattern is a gate to build behind, not a shipped command.** The framework
ships no Admin-tier module itself — the point of specifying Layer 4's shape is that
*if* a module author builds something as dangerous as arbitrary code evaluation, the
credible threat model is not "an external attacker calls it" (Layers 1–3 already
require compromising the Discord platform's permission model, the middleware chain,
and the deployment environment simultaneously) but "a legitimate owner's account is
compromised, in an environment where the capability happens to be enabled." A
production-disabled-by-design capability already closes the highest-value version of
that scenario; what remains — a compromised owner account reaching the capability in a
non-production environment — is exactly what Layer 5's bounding and the non-production
credential-separation requirement (§32.1) are built to close.

**Audit guarantee.** Every Admin-tier invocation — granted or rejected — writes to
`audit_logs` unconditionally, before the handler runs. A rejected attempt is never
silent from an operator's perspective, only from the caller's: the layers above
determine whether an attempt succeeds, not whether it gets recorded.

The resulting defense-in-depth spans **three independent enforcement boundaries** —
the Discord platform itself (Layer 1), the framework's own middleware chain (Layer 2),
and the deployment environment (Layers 3–4) — chosen so no single compromised layer,
and no single class of bug, is sufficient on its own to expose Admin-tier behavior.
Layer 5 is a different kind of control: it bounds how much a *permitted* invocation can
do, rather than gating whether the invocation happens at all.

#### Design Consideration — AST-Based Manifest Extraction

Target-state hardening of manifest validation: Swastik parses `manifest.ts` as an AST (TypeScript compiler API / ts-morph), extracts the exported object literal / `defineManifest` argument **without evaluating any JavaScript**, validates the extracted shape against the Zod schema, and resolves class/function identifiers only to confirm existence — never instantiating them. Today Swastik `import`s the manifest directly, which is an RCE vector; AST extraction closes that door while preserving full TypeScript type-safety and keeping the manifest in `.ts` form (it supersedes the rejected JSON-manifest proposal). Honest manifests are unaffected.

#### Design Consideration — Sandboxed Manifest & Validation Execution

The entire validation pipeline (AST parsing, type-checking, linting, compilation) should run inside a lightweight container or Node `vm` sandbox with no network, filesystem, or `require` access, rather than in Swastik's own process as it does today. Isolation at this stage eliminates validation-stage RCE while remaining transparent to developers; the actual hot-swap later loads the vetted module in the main process with normal permissions.

#### Design Consideration — Source-of-Truth Uploads + Trusted Builder

Swastik should accept TypeScript source only and build the artifact itself in an isolated trusted builder (Docker build container running tsc, ESLint, pnpm). Source-only acceptance plus a trusted build eliminates the current JavaScript bypass of compile-time checks — today pre-built JS is accepted. Impact: Critical; Feasibility: High.

#### Design Consideration — Hash-Bound buildId

Every `buildId` should be cryptographically bound to the source archive hash, compiled artifact hash, lockfile hash, gate results, and signature — today it is bound only to the developer identity (`builds` table, promotion check). Promotion must reject any hash mismatch, closing the artifact-substitution attack in which clean source is submitted for review but a different artifact is later uploaded. This protects legitimate builds from tampering.

#### Design Consideration — Cryptographic Signing of the Compiled Artifact

Signing should apply to all modules — including first-party ones — and the runtime module loader should verify the signature at load, rather than relying on the devId/buildId pairing alone. This strengthens Gate 5 without changing module behavior.
#### Design Consideration — Build Provenance as DB Metadata

The `builds` table should be extended with provenance columns recorded per build (source revision, builder image, gate outcomes, artifact hashes), keeping provenance in the database rather than the manifest and preserving the manifest-vs-database distinction. Today no provenance columns exist.
#### Design Consideration — What Gate 5 Signing Actually Signs

The signed-fields list must be documented and enforced identically by the Gate 5 signer and the runtime verifier; today signing exists but the signed fields are unspecified. Pinning the exact field set (module identity, artifact hash, provenance) closes the ambiguity about what a valid signature attests, strengthening integrity without changing module behavior.

#### Design Consideration — Disposable Migration Dry-Run + Forbidden-SQL Scan

Migrations currently run live at startup only. The specification requires a Swastik migration validator that dry-runs every migration against a disposable Postgres instance — with a forbidden-SQL scan for destructive statements — before anything touches production. Impact: High; Feasibility: High.

#### Design Consideration — Manifest as Compile-Time API

The manifest already catches roughly 90% of integration bugs at boot; the target state extends its generative uses — UIResponse validation, SBOM generation, auto-generated documentation, MDIS UI construction, and dependency-graph computation — all readable from the manifest without executing business logic.
#### Design Consideration — Migration Validation Reports

Migration `down` presence is today a manual review item only. The Swastik analyzer should validate every migration against a disposable test DB and emit a validation report as part of the upload pipeline, turning the checklist item into a mechanical gate.
#### Design Consideration — Require Source Upload + Server-Side Compilation & Linting

Swastik's upload endpoint requires TypeScript source and performs server-side compilation and linting in its trusted builder context (Gate 1, §15.8), removing the local build step entirely for developers: a developer pushes source, and the build is the platform's job. High impact, high feasibility — it reuses existing CI tooling, and modules are small so builds are cheap.

#### Design Consideration — Gate 1 at Every Upload

Gate 1 runs at every upload through Swastik's isolated builder context (§15.8), Marketplace and non-Marketplace modules alike, so developers receive the same errors at upload time they would receive locally. A standalone trusted-builder service issuing signed attestations is deferred greenfield work; until it exists, the in-Swastik isolated builder is the single compilation path.
#### Design Consideration — SBOM Generation + Malware/Secret Scanning

The trusted builder should generate an SBOM for every module build and run malware and secret scanning over the source and dependencies, with results attached to the build record. Impact: High; Feasibility: Medium.

#### Design Consideration — Sign the Exact Artifact, Not Just the Module Identity

The Gate 5 signature must cover the deployed bytes plus provenance hashes, not just module identity; today the signature scope is unspecified, leaving an identity-only risk where a valid signature could vouch for substituted content. The runtime verifier checks the artifact hash against the signed provenance on every load.

#### Design Consideration — Static JavaScript Analysis After Build

The post-build static JS analyzer inside the trusted build rejects forbidden patterns in the compiled output (dynamic `require`, network calls outside sanctioned adapters, filesystem access outside module scope), complementing source-level lint; compliant modules pass automatically.

The target-state build pipeline is a twelve-step trusted builder: source-only intake, lockfile resolution, dependency audit, SBOM generation, compilation, lint, static analysis, tests, artifact hashing, signing, provenance recording, and promotion. This prevents hand-written JavaScript from bypassing compile-time rules and is the engineering backbone of the zero-trust upload model.
**Admin-Tier Environment Guard (Layer 4).** Layer 4 of the admin-tier gate is a manual operator control: a human operator must explicitly set an enable flag **and** ensure `NODE_ENV !== 'production'` before any dangerous Admin-tier capability (such as code evaluation) can execute. Because Admin-tier modules are never publicly reviewed — they exist only in a deployment's own codebase and are reviewed internally via the PR process — the environment guard itself is the structural security gate for deployment.

- Specified — Admin-tier modules are never publicly reviewed; they exist only in the deployment's own codebase; Layer 4 environment guard requires explicit enable flag + `NODE_ENV !== 'production'`.

- Environment guard enforced in code and deployment config; admin capabilities fail-closed outside the enable conditions.

Defense-in-depth firewall: different mechanisms guard different boundaries — the permission resolver, the HTTP server, ESLint rules, and the power-engine dispatcher — so there is no single gate whose failure opens everything.

- Five boundary-specific firewall mechanisms implemented.

- Maintained as the security architecture.

single most consequential surface in the framework to secure correctly, for any
deployment that builds an Admin-tier module at all. Developer identity is split: a
public Dev Account ID (safe to embed in the manifest §10.2 and licensing) is
distinct from the private Dev Token, which is header-only authentication and must
never be shipped inside a module. This resolves the contradiction where the
secret dev ID was simultaneously embedded in the shipped manifest.

### §13.6 Addition — Deployment Rate Limits on Every Deployment Surface

Every deployment surface — manual upload, repository-triggered deployment (§15.11),
and operator-initiated deployment — passes a token-bucket + cooldown rate limiter
with four independent dimensions: per-developer, per-repository, per-module, and
global. Each dimension has its own token bucket and its own cooldown window, all
four are PEP-tunable at runtime through the policy-tuning controls (§22.2) with the
previous value recorded in the audit row, and exceeding any one of them queues the
deployment rather than dropping it: the deployment is accepted with a 429-equivalent
response naming the earliest admissible time, and the queue drains in arrival order
under the same limits. The per-dimension windows are coupled to the anomaly
detection on the deploy endpoint: a burst that trips the anomaly detector tightens
the offending dimension's bucket automatically until an operator relaxes it. The
goal is abuse control without a denial-of-service against legitimate continuous
deployment — a developer pushing ten reviewed fixes in an hour is normal; ten
unreviewed pushes in a minute is not, and the two must be distinguishable by the
limiter, not by an operator reading graphs.

Per-IP/per-developer rate limits, anomaly detection (burst patterns, geo anomalies), alerting.

### §13.6 Addition — Per-Module, Per-Version, Per-Action Audit Trail (source: 'SWASTIK')

Structured audit rows with the documented fields.

### §13.6 Addition — Credentials Service Symmetry (Swastik Delegates Identity Issuance)

Swastik → Credentials Service call for all identity issuance.

### §13.6 Addition — ssh2 Dependency for CLAI

ssh2 npm package installed; `ssh-clai.ts` runs the SSH server with public-key auth against the `clai_operators`/`clai_authkeys` tables.

### §13.6 Addition — Dev Token Hash-Only Storage, Issued Once

Argon2id hash in swastik_developers; raw token shown once.

### 13.7 Module Lifecycle State Machine

```
DIAGRAM 13-C — Full Module Lifecycle

 bot process starts
 │
 Stage 11 — module discovery
 │
 ManifestValidator validates each manifest
 │
 ┌──────────┴──────────┐
 │ │
 VALID manifests INVALID manifest
 │ │
 ▼ ▼
 LOADED queue fatal exit
 │
 Stage 12 — onLoad(container)
 │
 ┌────┴────────────────────┐
 │ │
 required: false required: true
 throws throws
 │ │
 ▼ ▼
 DISABLED fatal exit
 (warning logged)

 onLoad succeeds:
 │
 ▼
 LOADED

 Stage 17 — onReady(client)
 ├── success → ACTIVE (dispatches commands/events normally)
 └── throws → DISABLED (warning; startup continues; even a
 required:true module is non-fatal here)

 Global suspend (Power Engine Panel, §22.2) or a per-guild disable:
 │
 ▼
 SUSPENDED (for this guild, or globally; stop dispatching;
 guild_module_states written accordingly)

 A runtime hot-swap trigger (Swastik, §15):
 │
 ▼
 onUnload → unload → onLoad → onReady → ACTIVE
```

**Fleet-wide command kill switch.** `suspendCommand` (§22.4) writes a
`disabled_commands` row with a nullable `guildId` — `NULL` means fleet-wide — and
the table carries a partial unique index on `commandId` `WHERE "guildId" IS NULL`
alongside the `(commandId, guildId)` unique index, so there is exactly one
fleet-wide override per command rather than N per-guild rows standing in for it.
Dispatch consults the disabled-override set before the handler runs: a disabled
command's interactions resolve to the formal notice frame (§20.9) with reason code
`COMMAND_SUSPENDED`, fleet-wide or in the named guild exactly as the row scopes it.


**Module suspension is two-phase.** `suspendModule` acts in two distinct phases.
Phase one is immediate: the framework writes Discord permission-overwrite rows
denying `@everyone` — and every role each of the module's commands is currently
configured for — on the module's registered commands, so they vanish from members'
effective access within seconds, even though their Discord registrations still
exist. Phase two is cleanup: the corresponding deregistrations are enqueued on the
guild command change queue (§17.7) and applied at the queue's batch cadence,
conserving the guild-command creation budget. Between the two phases the commands
are already unusable — the deny overrides are the enforcement; the deregistration
is bookkeeping.

Toggling a module off and on again is a state-table write on the order of
milliseconds — it never touches the module's loaded state, its DI registrations, or
its event subscriptions. A disabled module is still loaded, still occupying its
container scope, simply short-circuited before its handler runs (§13.4's read path).
Reloading it, by contrast, re-executes the full `onUnload` → `onLoad` → `onReady`
cycle and is the meaningfully heavier of the two operations — the operational
distinction between "is this a code problem or a configuration problem" that §43.4's
runbooks depend on getting right early in an incident.

**Unload performs real teardown.** Unloading a module is not merely dropping it
from the dispatch tables: the framework's unload sequence flushes the module's
cache namespace (every CacheManager key under its namespace prefix, §25) and
closes its per-module queue workers (the QueueManager `moduleSlug → Worker[]`
map, §29) alongside the `onUnload` hook's own release work. Teardown failures
are contained per module: a cache flush or worker close that throws is logged
and the unload loop continues — one module's stuck teardown never aborts a
fleet-wide unload or a hot-swap chain.

### 13.8 Core & Admin Tier Performance Baselines

Because Core- and Admin-tier commands bypass the `guild_module_states` cache read

Build ID formatted as `2.3.1+sha256:9f1c…` — semver plus content hash of the build.

entirely, they carry less per-invocation overhead than Standard/Marketplace commands
of equivalent handler complexity — a documented, deliberate performance property, not
an incidental one.

```
TABLE 13-B — Framework Overhead by Tier (excludes handler execution time)

┌─────────────────────┬────────────────┬──────────────┬───────────────────┬─────────┐
│ Tier │ Module-state │ Rate limit │ Permission │ P50 │
│ │ lookup? │ check? │ resolution? │ target │
├─────────────────────┼────────────────┼──────────────┼───────────────────┼─────────┤
│ Admin │ Never │ Never │ Never (owner-gate) │ < 2 ms │
│ Core │ Never │ Yes │ Layers 1–5 & 7 only │ < 5 ms │
│ │ │ │ — RBAC (Layer 6) │ │
│ │ │ │ skipped by design │ │
│ Standard (enabled) │ Yes (L1 hit) │ Yes │ Full 7-layer │ < 8 ms │
│ Standard (disabled) │ Yes (L1 hit) │ Abort first │ Abort first │ < 3 ms │
│ Marketplace (installed)│ Yes (L1 hit) │ Yes │ Full 7-layer │ < 8 ms │
└─────────────────────┴────────────────┴──────────────┴───────────────────┴─────────┘
```

```
TABLE 13-C — End-to-End Targets (full round trip, including handler execution)

┌─────────────────────┬──────────┬──────────┬────────────────┬───────────────────────┐
│ Tier │ P50 │ P99 │ L1 hit ratio │ Availability under │
│ │ end-to-end│ end-to-end│ │ partial outage │
├─────────────────────┼──────────┼──────────┼────────────────┼───────────────────────┤
│ Admin │ < 150 ms │ < 1200 ms │ N/A (bypasses │ Must remain available │
│ │ │ │ guild_module_ │ even if every Standard/ │
│ │ │ │ states entirely) │ Marketplace module has │
│ │ │ │ │ crashed (§11.6 isolation)│
│ Core │ < 80 ms │ < 400 ms │ > 95% │ Must remain available if │
│ │ │ │ │ Redis is down (§26.5 │
│ │ │ │ │ fall-through) │
│ Standard / Marketplace│ < 500 ms │ < 3000 ms │ > 70% │ Best-effort │
└─────────────────────┴──────────┴──────────┴────────────────┴───────────────────────┘
```

**Why Core's availability target specifically excludes a Redis dependency.** If a
basic diagnostic or informational command required Redis reachability, a cache outage
would take down the bot's most basic "is the process still functioning" signal at
exactly the moment an operator needs it most. Core-tier commands are the one place in
the system where falling through to a direct, uncached PostgreSQL read on any cache
error is a hard requirement validated against the exact scenario it exists to survive,
rather than a general resilience nicety applied uniformly everywhere.

### Structural Privilege-Escalation Prevention: The Four Blocked Vectors

Privilege escalation is blocked structurally rather than by convention, across four vectors: (1) runtime intent broadening — the Discord intent union is computed exactly once at login (`apps/main/src/discord/client-builder.ts`), so no runtime code path can widen it; (2) lower-tier to Admin authority — the three-layer rule plus the Admin gate make the jump impossible regardless of input; (3) a guild admin self-granting an elevated role — RBAC resolves fresh from the member's actual Discord roles on every check, so a bot-issued role confers nothing; (4) one module writing another module's tables — a code-review hard stop backed by the repository pattern and ESLint rules in `apps/main/src/permissions/`.

### Tier Co-Constraints Enforced at Validation (Stage 11)

Tier choice carries hard co-constraints, enforced at manifest validation (Stage 11) before any module loads (`apps/main/src/modules/tier-rules.ts`, `apps/main/src/modules/manifest.schema.ts`): the admin tier requires `devGuildOnly=true`; the marketplace tier requires a `marketplaceCategory`; the core tier forbids non-default RBAC; and `hardcoded` and `visibility` are mutually exclusive, with `hardcoded: true` requiring `visibility: 'private'`. A manifest that violates its tier's co-constraints fails validation outright rather than degrading at runtime.

## 14. Inter-Module Communication

**Status:** [SPEC]

### 14.1 The Five Sanctioned Patterns

Explicit enumeration — the five sanctioned cross-module patterns are: (1) Internal Event Bus (one-to-many, fire-and-forget domain events); (2) Published DI Token (synchronous cross-module service call via manifest-declared provides/depends); (3) Cross-Module Read-Only Lookup (the ForCrossModuleRead single-row accessor); (4) Job Scheduling via Event Bus (a subscriber enqueues jobs from emitted events); (5) Global Data Emit (durable, schema'd public datasets with a read/aggregate API). This list is exhaustive: any cross-module interaction not expressible as one of these five patterns is an architecture violation. The fifth pattern's admission is recorded as ADR-004 (docs/adr/), which amends the earlier four-pattern enumeration explicitly rather than leaving the older claim standing.

```
DIAGRAM 14-A — The Complete Set of Legal Cross-Module Interactions

 PATTERN 1 — Internal Event Bus (one-to-many, fire-and-forget)
 A module emits a named domain event; any number of subscribers from any
 module react independently. The emitter has no knowledge of — and no
 dependency on — any subscriber. Primary channel for side effects: logging
 reacting to moderation events, analytics recording economy transactions,
 anti-raid tightening thresholds after a moderation spike. Event names
 follow {domain}.{entity}.{action} — enforced by regex validation at
 registration time.

 PATTERN 2 — Published DI Token (synchronous cross-module call)
 Module A declares a service in its manifest's provides array; Module B
 declares the same token in its depends array. B receives the service via
 its own DI container at load time, typed against the published contract
 interface. Neither module imports the other's source files — the
 interface is the only shared boundary.

 PATTERN 3 — Cross-Module Read-Only Lookup (ForCrossModuleRead accessor)
 A module wanting cheap, synchronous read access to another module's data
 — without the overhead of a full service call — does not query the
 table directly. It calls a method the owning module explicitly published
 as a read accessor: declared in the manifest's crossModuleReads array,
 implemented as a repository method carrying the ForCrossModuleRead
 suffix, constrained by lint rule to a single-row lookup by primary key or
 a uniquely-indexed foreign key only — no joins, no aggregates, no
 filtering beyond the key. Writes are NEVER acceptable through this
 pattern; a cross-module write goes through Pattern 1 or Pattern 2.

 PATTERN 4 — Job Scheduling via Event Bus
 A service emits an event (e.g. a "mute scheduled" event); a dedicated
 subscriber enqueues the corresponding job. This decouples the business
 logic (issuing the mute) from the infrastructure concern (scheduling a
 future state change) — the scheduling logic can change, be replaced, or
 be temporarily disabled without touching the originating module. §12.5's
 worked example uses exactly this pattern.

 PATTERN 5 — Global Data Emit (durable, schema'd public datasets)
 A module publishes a named public dataset through a declared emit
 surface: the dataset's schema is declared in the module's manifest
 (validated at Stage 11 like any other contract), the owning module
 writes updates through its own repository, and every other module
 reads through the read/aggregate API the framework exposes over the
 dataset — never through direct table access. The dataset is durable
 (backed by the owning module's own tables), versioned with the module's
 semver, and publicly readable by any module that declares a dependency
 on the emitting module's dataset token. Reads return current state;
 the aggregate API exposes the grouping/summarization operations the
 declared schema supports, and nothing the schema does not authorize.
 Global Data Emit is the pattern for genuinely shared reference data —
 leaderboards, catalogs, public counters — where one module owns the
 write path and the whole fleet wants read access without coupling to
 the owning module's services.
```

```
TABLE 14-A — Choosing the Right Pattern

┌────────────────────────────────────┬───────────────────────────────────┐
│ "I need to..." │ Use.. │
├────────────────────────────────────┼───────────────────────────────────┤
│ React to something happening │ Pattern 1 — subscribe to the event │
│ elsewhere, no response needed │ │
│ Call another module's business logic │ Pattern 2 — depend on its published │
│ and get a typed result │ DI token │
│ Read one row of another module's │ Pattern 3 — call its │
│ data cheaply, synchronously │ ForCrossModuleRead accessor │
│ Turn a business event into deferred │ Pattern 4 — emit the event, let a │
│ or background work │ dedicated subscriber enqueue a job │
│ Publish reference data other modules │ Pattern 5 — declare a Global Data │
│ can read and aggregate without │ Emit dataset and serve it through │
│ coupling to your services │ the read/aggregate API │
└────────────────────────────────────┴───────────────────────────────────┘
```

### 14.2 Soft-Dependency Degradation Contract

When Module B declares a soft dependency on Module A's service — using it
opportunistically rather than declaring a hard manifest `depends` entry — and Module A
is disabled in a given guild, the DI container still resolves Module A's service
object normally, since services are registered globally; only Module A's guild-scoped
*data* is unavailable for that guild. Calls into the service for that guild return a
`ModuleDisabledResult` sentinel rather than throwing, and Module B's code checks for
that sentinel explicitly:

```
CODE REFERENCE 14-A — Graceful Degradation Pattern

// Example: a giveaway module requiring a minimum leveling rank
const rank = await levelingService.getRank(guildId, userId);
if (rank instanceof ModuleDisabledResult) {
 // Leveling is disabled for this guild — skip the rank requirement
 return true; // allow entry
}
if (rank.level < minLevelRequired) {
 return false; // deny entry
}
```

This pattern is explicit and intentional: it requires Module B to make a deliberate
decision about what "the dependency is disabled" means for its own behavior, rather
than crashing or silently misbehaving. That decision is documented in Module B's own
code and exercised by Module B's own test suite — no framework mechanism can make this
decision on a module author's behalf, because only the module knows what a missing
soft dependency should mean for its feature.

### 14.3 Cross-Module Contract Versioning

When Module A's `provides` token changes shape — a method removed, a parameter
changed — that is a breaking change in Module A's own semver version (§42.2). The
manifest's `version` field is exactly what Module B's `depends` array pins against.
The module registry validates version satisfaction at Stage 11; an incompatible

 beyond semver, Swastik MUST resolve the full dependency graph during static analysis and perform type-level compatibility checks of `provides`/`depends` contracts (method signatures, event payloads, config schema); a mismatch forces a version bump. Semver rules (§42.2) and developer discipline are not a substitute for contract-level verification — a `^1.0.0` pin that resolves a breaking 2.0.0 with a changed signature is not actually compatible.
version dependency is a **fatal startup error**, never a silent runtime mismatch. This

 Semver range satisfaction alone is insufficient: on every module update Swastik MUST compare the new `provides` contract against the currently-approved contract (removed/renamed method, changed param/return type, removed event, changed payload, incompatible config schema) and force a major-version bump on any breaking change — runtime type-checking of method signatures, not just range checks, at Stage 11.
makes inter-module breaking changes explicit, loud, and caught before deployment —
never discovered in production.

```
FAILURE-MODE COMPARISON — Why Version Pinning Matters

 Without version pinning:
 Module A ships v2.0.0, removing a method Module B calls
 → Module B's code compiles fine against the OLD interface type
 → at runtime, the call throws — discovered by a user hitting the bug

 With version pinning (this architecture):
 Module B's manifest declares depends: [{ token: A_TOKEN, version: '^1.0.0' }]
 Module A ships v2.0.0
 → Stage 11 validates the pin against the loaded version, finds it
 unsatisfied, and refuses to start the process
 → discovered by whoever deployed the change, in a failed deployment,
 before any user is affected
```

#### Design Consideration — Contract Compatibility via .d.ts + Type Checker

Contract compatibility between `provides` and `depends` should be verified from the emitted `.d.ts` artifacts using the TypeScript type checker, not semver ranges alone. Swastik's contract checker compares the declared interface surface of each new module version against what dependents compiled against, making an incompatible patch bump a build-time failure rather than a production incident. Impact: High; Feasibility: Medium.

### 14.4 The Compatibility Ledger

Every cross-boundary contract in the framework — module-to-framework, module-to-module
(`provides`/`depends` tokens and their contract shapes), surface-to-core (REST families,
§44.8; MDIS schemas, §16.5; webhook payload versions, §32.3), and the manifest schema
itself (§11.2) — is registered in the **Compatibility Ledger**: a machine-readable
registry recording, for each contract, its version and the exact window of versions
each counterpart accepts (minimum inclusive, maximum exclusive, and any excluded
known-bad versions).

The ledger is not documentation — it is a gate. A core release cannot ship until
every registered contract window held by currently-deployed modules is satisfied by
the new core's contract versions, and a module deployment cannot be promoted until
its declared contract windows are satisfied by the running core and by every
co-deployed dependency. Both checks are mechanical queries against the ledger, run
at release time (§40.2) and at promotion time (§15.8) respectively, and both fail
closed: an unregistered contract is treated as unsatisfied, not as exempt.

The §45 compliance matrix is generated from the ledger — each matrix row's
"Specified At" reference is derived from the contract registration it points at, so
the matrix can never drift from the registry that actually gates releases. The
ledger stands up in Phase 0 as an empty-but-enforced skeleton: the gate is active
from the first registered contract onward, and contracts are added as the subsystems
that own them land.

## 15. Swastik — Hot Reload & Dynamic Module Management

**Status:** [SPEC]

Swastik is the service that owns every deployment, hot-reload, hot-swap, and related
delivery mechanism in the framework — the single answer to how new or changed code
reaches a running fleet, covering the core codebase itself and every
independently-authored module alike. It runs as its own deployable process

**Development-time hot reload is not Swastik.** It is Node.js `--watch` + tsx, gated on `NODE_ENV === 'development'` only: file change → re-import, with `onUnload` running before the new version loads. A production guard must prevent this path from activating outside development — Swastik is the production-time mechanism, and the two must not be confused (§15.1).

(`src/entry/swastik.ts`), architected the same way the Power Engine Panel and CLAI are:
a separate service sharing nothing with the bot process but the same PostgreSQL
primary, the same Redis instance, and the same container image.

### 15.1 Two Distinct Reload Mechanisms — Not to Be Confused

```
TABLE 15-A — Development Hot Reload vs. Runtime Module Activation

┌────────────────────────┬─────────────────────────────┬────────────────────────┐
│ │ Development Hot Reload │ Runtime Module │
│ │ │ Activation │
├────────────────────────┼─────────────────────────────┼────────────────────────┤
│ Mechanism │ Node's --watch (≥ Node 20) │ onUnload → re-import │
│ │ + tsx, re-importing changed │ → onLoad → onReady, │
│ │ files │ triggered by Swastik's │
│ │ │ hot-swap signal │
│ Environment │ NODE_ENV === 'development' │ Always available; │
│ │ only — --watch is absent from │ production mechanism │
│ │ production startup scripts and │ │
│ │ Docker images │ │
│ Gateway connection │ Preserved │ Preserved — never │
│ │ │ disconnects; other │
│ │ │ modules keep operating │
│ Concurrent-user safety │ Not a concern (dev only) │ Safe by design │
└────────────────────────┴─────────────────────────────┴────────────────────────┘
```

Internal runtime API endpoint called by Swastik after atomic symlink promotion to trigger module hot-swap. Distinct from the admin-facing /admin/modules/:name/reload.

The internal runtime API exposes `POST /internal/reload?module=<name>`, called by Swastik after atomic symlink promotion (and distinct from the admin-facing `/admin/modules/:name/reload`): it takes a module parameter, executes the full lifecycle sequence, and reports the outcome to Swastik, which performs automatic rollback on failure.

Define the exact in-process module reload sequence triggered by Swastik's reload signal.

The in-process reload sequence triggered by Swastik's reload signal is: (1) `onUnload` cleanup together with the framework's own teardown — the module's cache namespace is flushed and its per-module queue workers are closed (§13.7), (2) re-import of the module files, (3) onLoad(container) re-registering DI, (4) onReady(client) re-registering commands and events, and (5) a self-health check, with the outcome reported to Swastik. A failed hot-swap is never left half-applied — Swastik reverts to the preserved previous version automatically.

### 15.2 Worker Thread Isolation

CPU-intensive work inside a module — image processing, large dataset aggregation,
content analysis — runs in Node.js Worker Threads, never on the main event loop. A
`WorkerThreadPool` service manages a pool of pre-spawned threads, dispatches tasks via
`postMessage`, and returns typed results through Promises. A Worker Thread failure
(crash, timeout) is isolated entirely to that task; it never affects the main thread,
the gateway connection, or any other concurrent operation.

Worker entry files are ordinary TypeScript compiled by the identical `tsc` build step
producing the rest of the application — there is no separate bundler or transpilation
pipeline for worker code, and no ESM/CommonJS mismatch to account for. `WorkerThreadPool`
spawns each thread against the already-compiled output, the same artifact `node` runs
the main thread from — a worker is never spawned directly against a `.ts` source file.

**Correlation across the thread boundary.** A task dispatched to `WorkerThreadPool`
serializes the calling command's `correlationId` into the task payload explicitly — it
is *not* automatically inherited, since `postMessage` crosses a real thread boundary
with no shared memory or async-context propagation. The worker's entry point
constructs a child logger bound to that same `correlationId` as its first action,
before any actual work, specifically so a trace spanning a worker-offloaded task is
never orphaned from the command that triggered it.

Safely reload modules that own BullMQ queues without leaking worker references.

QueueManager keeps a map of `moduleSlug -> Worker[]` and manages the worker lifecycle across hot-swaps: pause the queue, wait for the current job to finish (or dead-letter it as a fallback), close the old Workers, and spawn new ones with the new processor code.

### 15.3 Reload, Toggle, and Disable — Four Distinct Mechanisms

"Restart a module" means four different things depending on who is asking and at what
scope. Keeping all four separately named prevents them from being conflated during an
incident.

```
TABLE 15-B — The Four Mechanisms

┌──────────────────────┬────────────────────────┬──────────────┬───────────┐
│ Mechanism │ Trigger │ Scope │ Re-imports │
│ │ │ │ code? │
├──────────────────────┼────────────────────────┼──────────────┼───────────┤
│ Development hot reload │ File save, dev only │ This process │ Yes │
│ │ │ only │ │
│ Runtime module reload │ Swastik's hot-swap signal, │ This process │ Yes │
│ │ or an equivalent │ (all guilds it │ │
│ │ Admin-tier trigger │ serves) │ │
│ Per-guild toggle │ Whatever a deployment │ One guild │ No — state │
│ │ exposes for it │ │ flip only │
│ Global module disable │ Power Engine Panel │ All guilds │ No — state │
│ │ suspendModule (§22.2) │ │ flip only │
└──────────────────────┴────────────────────────┴──────────────┴───────────┘
```

The distinction that matters operationally: the top two rows change **what code is
running**; the bottom two change **whether already-running code is permitted to
dispatch** — and neither of the bottom two touches the module's loaded state, its DI
registrations, or its event subscriptions. A disabled module is still loaded, still
occupying its container scope, simply short-circuited before its handler runs. An
operator diagnosing "the module isn't responding" needs to know which of the four
applies before choosing a fix — a reload solves a code problem, a toggle check solves a
configuration problem, and confusing the two wastes an incident's most valuable early
minutes (§43.2's runbook is built around exactly this distinction).

### 15.4 Two Update Paths, Chosen By What Changed

```
DIAGRAM 15-A — Core Restart vs. Module Hot-Swap

 A change to the CORE codebase (anything outside src/modules/)
 │
 ▼
 Goes through the FULL release pipeline (§40.2–§40.4): build, staging
 validation, the two-approver production gate, and the zero-downtime rolling
 update mechanism (§33.2). Swastik does not reimplement any part of this
 path — its only involvement is the scheduled trigger below.

 A change to ONE MODULE's own code (a new version uploaded by its developer)
 │
 ▼
 NEVER touches the core release pipeline. Swastik detects every available
 module path on the shared Kubernetes volume every pod mounts, validates
 specifically the changed module, and reloads ONLY that module — in every
 pod simultaneously — without restarting the application or affecting any
 other module. Full detail: §15.6–§15.9.
```

The two paths are kept separate because they answer different questions: a core
change carries the same scrutiny and the same rollback-capable pipeline any
application-wide change requires, while a module change costs its author nothing more
than an upload and a validation pass — precisely because module isolation (§11.6) is
what makes one module's code safe to swap without touching anything a core change
might.

Release Manager and Swastik coordinate through a renewable Redis lease (`release-manager:core-release:lease:{environment}`, 30-second default TTL, 10-second heartbeat) guarded by fencing tokens so stale instances cannot issue instructions. While Release Manager holds the lease, Swastik pauses module hot-swaps, queues valid uploads, and defers the scheduled restart.

- Specified — Redis key: `release-manager:core-release:lease:{environment}`, TTL: 30 seconds default, heartbeat: every 10 seconds, fencing token for stale instruction rejection. Lock/unlock via `POST /internal/swastik/core-release/lock`, `/lock/renew`, `/unlock`. Valid uploads → 202 Accepted (queued). Invalid uploads → rejected with specific errors.

- Implemented lease protocol with fencing tokens and crash recovery.

During a rolling core restart, Swastik places a global lock on module-level swaps so filesystem promotion never collides with pod replacement; the lock releases only when every pod reports readiness.

- Specified — 24-hour scheduled restart locks out module swaps. Lock releases when all pods report readiness.

- Implemented lock mechanism coordinating with Kubernetes rolling update.

Every lease or lock carries a monotonically increasing fencing token, and instructions carrying a token lower than the current one are rejected. This prevents stale Release Manager/Swastik instances (split-brain or expired lease holders) from issuing instructions; the same mechanism is proposed for shard locks and cache-stampede protection.

- Specified.

- Monotonic fencing token on lease; instructions with token < current are rejected.

**Core Cannot Be Hot-Reloaded (Full Restart Required).** The core (`src/core/` — DI container, command router, middleware pipeline, database connections, event bus) cannot be hot-reloaded: a core change requires a full process restart. `/admin reload module` is strictly for `src/modules/`, never `src/core/`; the Node.js module cache (`require.cache` / ESM loader cache) makes in-place core swapping unreliable.

- The core (`src/core/`) — DI container, command router, middleware pipeline, database connections, event bus — cannot be hot-reloaded. When the bot starts, it reads core files, compiles them, and stores them in Node.js's module cache (require.cache or ESM loader cache). Overwriting files on disk doesn't change the running code. Re-importing core breaks every active reference (database connection pool, gateway client, middleware pipeline are live objects).

- Maintain as architectural constraint; document clearly that `/admin reload module` is strictly for `src/modules/`, never `src/core/`.

**Dev Hot-Reload (tsx --watch) vs Production Hot-Swap (symlink + signal).** Two reload models, deliberately different: development uses `tsx --watch` (auto re-import on save, gateway stays connected); production uses the compiled `.js` artifact as the source of truth with symlink + explicit signal promotion — production never auto-scans folders.

- Dev: `NODE_ENV=development`, tsx --watch auto re-imports on save, gateway stays connected. Prod: compiled `.js` artifact is source of truth; symlink + signal path.

- Maintain; production never auto-scans folders.

Reload is pipeline-signal-only: modules reload exclusively from Swastik's own explicit `POST /reload?module=<name>` (or `/internal/reload`) signal. A generic "anything changed" file watcher would be a second, unauthenticated way to get code live; any file-integrity watcher must run alert-only, never as a hot-swap trigger.

- Design: detection is the pipeline's own explicit "ready" signal. If a file-integrity watcher is desired for extra safety, run it as alert-only, never as a hot-swap trigger.

- Implemented; no generic watcher triggers production swaps.

**Two Update Paths (Core Restart vs Module Hot-Swap).** The two update paths exist because core changes and module changes have different risk profiles: core restart goes through the full CI/CD pipeline, two-approver gate, and Kubernetes rolling update with shard handoff; module hot-swap uses the shared-volume symlink swap with auto-rollback. Routing between the paths is automatic, decided by what changed (`src/core/` and `src/shared/` versus the module volumes).

**The reload loop, restated.** Every module promotion follows the identical closed
loop: promotion → reload signal → verified health-check → automatic rollback. The
health check is not advisory — the promotion is not "done" until the reloaded module
reports healthy, and a failed or timed-out health check reverts the symlink to the
preserved previous version and re-signals a reload of that version. No gate in the
loop can be bypassed by an operator shortcut, a repository trigger, or a batch
operation; the only human-controlled entry into the loop is the first promotion of a
brand-new module, which passes a human review gate before the loop starts (§16.4).

**The automation boundary (ADR-006, docs/adr/).** Updates to an already-approved
module are auto-approved when — and only when — the diff between the new version and
the currently-approved one is computable and falls inside the automated gates'
authority (dependency bumps, non-sensitive code changes, manifest fields the
automated gates validate); the loop then runs without human involvement. The first
promotion of a module — and any update whose diff touches requested intents,
`dashboardSchema` fields, declared `crossModuleReads`, or anything else the manual
security review (Gate 3) exists to judge — always passes the human gate. Diff-based
auto-approval for updates, human gate for first promotion: the boundary is exact and
non-configurable.

- Two paths specified: Core Restart (CI/CD + Kubernetes rolling update with shard handoff) and Module Hot-Swap (in-process reload via shared volume symlink swap). .

- Path routing automated based on changed paths (e.g., `src/core/` vs `src/modules/`).

### 15.5 Scheduled Zero-Downtime Core Restart

Independent of any specific code change being ready, Swastik issues a **24-hour
recurring trigger** — registered the same way any other cron task is (§29.6), but
targeting the release pipeline's staging-and-promote flow rather than a job queue —
that restarts the entire core codebase using the identical zero-downtime rolling
update mechanism specified in §33.2: the same `maxUnavailable: 0`/`maxSurge: 1`
strategy, the same shard-ownership handoff (§26.4), and the same readiness-gated
traffic cutover, triggered on a schedule in addition to being triggered by a merge to
the main branch. This recurring restart bounds how long a running fleet can drift from
its own most recently promoted state, independent of how often a human-initiated
deploy happens to land.

For the duration of this restart window, Swastik places an explicit, temporary lock on
every module-level hot-swap: a module upload clearing validation during the window is
staged and held, promoted the moment the core restart's rolling update completes
rather than mid-restart — so a fleet-wide pod replacement and an in-process module
swap can never contend for the same shared volume at the same moment. The lock
releases automatically once every pod in the rolling update reports readiness; a held
promotion resumes immediately, with no operator action required.

#### Design Consideration — BullMQ Worker Hot-Swap

Modules that own queues require a pause → drain → close → respawn sequence on hot-swap: pause the queue, wait for the current job to finish (or dead-letter it as a fallback), gracefully close the old Workers, then spawn new ones with the new processor code — closing a `Worker` releases BullMQ's active-jobs Set. Without this, long-lived Workers hold stale processor-function references after a swap and leak. QueueManager already keeps the `moduleSlug -> Worker[]` map needed to orchestrate the sequence.

#### Design Consideration — Canary Reload

Before a fleet-wide promotion, Swastik should hot-swap a single canary replica and watch `dumby_memory_usage_gauge` (and related health signals), autonomously rolling back that specific replica on regression. This bounds the blast radius of a bad module to one replica's users. Impact: High; Feasibility: Medium (requires canary selection infra in the Swastik canary selector).

#### Design Consideration — Staging Smoke Load + Promotion Readiness Checks

Promotion from staging to production should require a smoke load in the Swastik staging runtime plus explicit readiness checks at the promotion gate, so an artifact is exercised against real Discord interactions before fleet rollout. Impact: High; Feasibility: High.

#### Design Consideration — Verify Signature on Every Load and Reload

Signature verification points must be specified and enforced at every load and reload: the runtime module loader, the hot-swap reload path, and PEP revocation checks. This enforces the intended Marketplace revocation model — a revoked or tampered artifact cannot re-enter a running process through any path.

### 15.6 Developer Registration & Token-Based Identity

A developer registers through a secured API (§44.7) using a username and password,
handled with the same credential discipline as every other secret in this architecture
(Argon2id hashing, §32.1). On successful registration, Swastik calls the Credentials
Service (§22.8) — rather than minting anything itself — to assign the developer a
**dev ID**: a cryptographically random secret generated and handled with exactly the
sensitivity of a Discord bot token, stored only as an Argon2id hash, with the raw
value returned to the developer exactly once, at issuance, and never displayed or
persisted again anywhere in the system. The dev ID is always transmitted in an
`Authorization` header on every call it authenticates, never embedded in a URL, a
query string, or a log line — the same non-negotiable placement discipline this
architecture applies to every credential-shaped value.

Alongside the dev ID, Swastik issues a **build ID** for every module version a
developer uploads — a fresh identifier per version, never reused across versions,
distinct from the developer's own dev ID. A developer's manifest carries both in its
`devId` and `buildId` fields (§11.2), which is the framework's permanent record of
exactly which registered developer authored exactly which build.

### 15.7 Licensing — The Six-State License Machine

Licensing is a governed state machine, not a dataset column. A developer's license —
the authority under which they may publish and deploy modules — moves through exactly
six states:

```
DIAGRAM 15-C — License State Machine

 pending ──► under-review ──► approved ──► suspended ⇄ restored
                                    │                        │
                                    └────────► revoked ◄─────┘
 (every non-terminal state can transition to revoked)
```

**State semantics.** `pending` is the state a new registration starts in: no upload
proceeds. `under-review` is set when a reviewer picks the application up; it blocks
uploads identically. `approved` is the only state that permits deployment and
promotion. `suspended` is a real state split, not a relabeled decline: the license row
itself carries `suspendedAt`, `suspendedBy`, and `suspensionReason`, set by the
suspending act and cleared on `restored`. Every promotion, upload, and version bump
from that developer is blocked; every build of theirs still in a pending state
(`RECEIVED` through `STAGED`) is rejected with a terminal status and the
suspension's reason; and when the suspension carries the force-disable flag, the
developer's live modules are unloaded across the fleet through the same unload path
§15.1 defines — not merely short-circuited at dispatch — until the license is
`restored`. `restored` returns a suspended license to `approved` — it is reachable
only from `suspended`, and the pair forms the temporary-intervention cycle. `revoked`
is terminal: the developer's dev ID is barred permanently, their live modules are
force-disabled at the operator's discretion (§22.4's suspendDeveloper), and no
administrative action short of a new registration can reopen it.

**Transitions are governed, never automatic.** Moving a license into `under-review`,
`approved`, `suspended`, `restored`, or `revoked` is carried out by the project
owners through the governance API (§44.8) or the Power Engine Panel — never inferred
from upload volume, activity, or any other signal Swastik observes on its own.
Automated triggers exist only for suspension and revocation: a confirmed security
finding against a developer's module (Gate 3, §16.4) automatically moves the license
to `suspended` pending review, and a confirmed malicious-artifact finding moves it to
`revoked`.

Every governance action validates its input before any state changes: a
malformed payload returns `400` with field-level errors, an unknown developer or
license returns `404` rather than silently succeeding, and suspension accepts an
optional force-disable flag that disables the developer's already-live modules
along with the suspension itself (§22.4's `suspendDeveloper`).

**devId–license binding.** The manifest's `devId` must equal the license's subject
(§11.2): a module whose manifest devId does not match the license under which it is
submitted fails validation at upload, before anything is staged. The binding is
queryable end-to-end — from a paper license certificate (§22.8), through the license
record, to every build and Deployment Record the license ever authorized — so "which
license produced this running module" is always a single query, not a reconstruction.

**Suspension blocks promotions, from either side.** A suspension of the license OR of
the developer's registration blocks every pending and future promotion for that
developer's modules, fleet-wide, for exactly as long as the suspension holds; a
promotion already in flight when the suspension lands completes or rolls back under
its own existing rules (§15.4), but no new promotion starts.

**Tier-specific license classes.** Four license classes exist, one per module tier —
admin, core, standard, marketplace — each carrying its own review depth, revocation
terms, and renewal obligations. A license authorizes publication at its own tier and
below; the class is bound into the license record and verified at every manifest
validation point alongside the state itself.

**Paper certificates.** Every approved license is issued as a Credentials Service
paper certificate carrying a verifiable license ID (§22.8) — a document a developer
can print, and an auditor can verify against the license record's public fingerprint
without access to any internal system.

### 15.7.2 Module Publication Governance Fields — Unconfirmed

The module manifest schema (`manifest.schema.ts`, 3.8KB) and `tier-rules.ts` validation exist, but several publication governance fields — including the "Hardcode toggle" and other compliance-related manifest fields — are unconfirmed: it is unclear whether they are validated, enforced, or merely declared. The specification requires all publication governance fields confirmed as validated by the schema, documented in the manifest specification, and enforced during both pre-deployment validation (§15.8) and bootstrap Stage 11.

### 15.7.1 Command Deregistration — 12–13 Hour Batch Window Gap

Command removal from the Discord registry is currently specified to be batched through `guild_command_queue`, with a 12–13 hour window between queue time and the batch push. This creates a operational gap: a guild administrator who disables a malicious or buggy module must wait up to 13 hours for the corresponding command to be removed from Discord's registry. The specification requires an implemented two-phase approach: (1) an instant deny override using Discord permission overrides that makes the command immediately non-functional for guild members, and (2) the batched deregistration through the queue for the actual Discord API command removal.
### 15.8 Secured Module Upload, Validation, Staging & Promotion

```
DIAGRAM 15-B — From Upload To Live, Step By Step

 Developer uploads a TypeScript source tarball via multipart/form-data —
 manifest.ts, package.json, pnpm-lock.yaml, source tree, hard-capped at
 64 MiB; Swastik runs the trusted builder and produces the artifact, rather
 than accepting pre-built JS
 (Authorization: Bearer {devId} — never in the URL)
 │
 ▼
 Swastik assigns a fresh buildId and signs the full provenance byte set (moduleSlug + version + devId + buildId + sourceHash + artifactHash + gateResultsHash), recorded against (devId, moduleSlug, version) in the build table
 (devId, moduleSlug, version) in the build table
 │
 ▼
 PRE-DEPLOYMENT VALIDATION

 must also bind the buildId to the source archive hash, compiled artifact hash, lockfile hash, and gate results, and sign the exact artifact bytes staged for promotion; the runtime loader verifies that signature covers the deployed bytes — identity-only devId/buildId pairing does not constitute a signature over the artifact
 • Manifests are read by AST-parsing manifest.ts with the TypeScript compiler API (never by executing import), so upload validation evaluates the declared manifest statically without running untrusted module code
 — the same Zod schema, the same checks — so a module that would fail
 to load in production fails the same way here, before reaching a pod
 • Confirms devId/buildId are bound to one another (never a different
 developer's buildId)
 • Confirms the devId's license state reads 'approved' — and that the
 manifest's devId equals the license's subject (§15.7), that the
 license's tier class covers the module's declared tier, and that
 neither the license nor the developer's registration is suspended

The validation pipeline is expanded from 8 controls to a 19-step ordered trust-chain check: trusted build, provenance hash binding, full-provenance signing, contract/migration comparison against a disposable DB, plus the existing manifest, devId/buildId binding, license, staging, promotion, hot-swap, rollback, and audit controls.
 │ any check fails ⇒ rejected with the SPECIFIC failure returned to the
 │ developer directly, never a generic message
 ▼
 STAGING
 Validated code is written to a staging area on the shared Kubernetes
 volume every pod mounts — never directly into the live module directory
 a running pod actually loads from
 │
 ▼
 ATOMIC PROMOTION
 Before the live pointer is swapped, Swastik runs the module's selftest in an isolated worker with a bounded timeout; only a passing selftest triggers the atomic swap — a single `fs.renameSync` of the staged pointer over the live pointer, executed under a Redis lock (`SET NX EX` on `swastik:promote:{moduleSlug}`) so a promotion never interleaves with a core restart. A failure or timeout fails the promotion at the filesystem level — nothing is swapped — and a failed reload after the swap reverts the pointer to the preserved previous version, so a pod never reads a
 half-written module mid-promotion. The previous version's directory is
 preserved intact for rollback.
 │
 ▼
 HOT-SWAP SIGNAL
 Swastik calls an internal-only API (reachable exclusively from Swastik's
 own network position, never the public internet) telling the Dumby
 runtime to hot-swap the named module
 │
 ▼
 RUNTIME EXECUTES THE IDENTICAL MECHANISM FROM §15.1:
 onUnload → re-import → onLoad → onReady → self-health check
 │
 ┌────┴────┐
 │ │
 PASS FAIL
 │ │
 ▼ ▼
 live Swastik automatically reverts the symlink to the preserved
 previous version and re-signals a reload — a failed hot-swap
 is NEVER left half-applied in any pod
 │
 ▼
 Result (success or reverted failure) returned to the developer as an API
 response, and — wherever configured — a signed webhook delivery
```

 • **UIResponse Schema Validation (GAP):** Stage 11 currently validates the module manifest (Zod schema) but does NOT validate that a module's test harness returns a syntactically valid `UIResponse` object. The target state extends Stage 11 to validate `UIResponse` schema compliance in the module's test harness output, ensuring that a module whose command handlers produce malformed responses fails validation before deployment — not at runtime in production.
 • **Semver Cross-Module Version Range Checking (GAP):** Manifest validation currently checks semver format only (`x.y.z`), not version range expressions (`^1.2.0`, `~1.2.0`, `>=1.2.0`). A module declaring a dependency on `^1.2.0` of another module is not validated against the depended module's actual version at load time. The target state extends manifest validation to resolve range expressions against depended module versions, failing validation if a required range is not satisfied.

### Swastik Upload Intake — Tarball, Validation & Path Containment

`POST /swastik/modules/upload` accepts the module's TypeScript source as a tarball on `multipart/form-data` — manifest.ts, package.json, pnpm-lock.yaml, and the source tree in one archive, hard-capped at 64 MiB, with a larger body rejected by 413 before it finishes buffering. A single-string source body is not an accepted shape at all. Extraction is zip-slip-safe: every archive entry is resolved against the staging root and checked with `assertPathInside(stagingRoot, resolvedPath)` before anything is written, and one entry whose resolved path escapes the staging root aborts the entire upload with nothing written.

Every Swastik request body is Zod-validated before any handler logic runs: `slug` must match `^[a-z0-9][a-z0-9-]{1,62}[a-z0-9]$` and `version` must match strict semver — `MAJOR.MINOR.PATCH` with optional pre-release and build suffixes; a body failing its schema returns 400 with field-level errors and never reaches the filesystem. Every filesystem join on the module volumes is assembled by `safeJoin(volumeRoot, ...components)` — there is no other sanctioned way to build a module-volume path. `safeJoin` re-validates each request-derived component against its declared pattern (`slug` against the kebab-case pattern above, `version` against strict semver, `devId`/`buildId` against their issued-ID shapes), then resolves the joined path and asserts `assertPathInside(volumeRoot, resolved)` before returning it — so every request-derived path is pattern-valid and provably inside the volume root it belongs to on every call, not only at upload. A component failing its pattern, or a resolution escaping the root, throws `PathContainmentError` and the request fails closed with nothing written; a lint rule fails the build on any `path.join` reaching a module volume with an unvalidated component, and no handler constructs a module-volume path by plain string concatenation.

Uploaded modules are validated against the same Zod schema used at application startup through the seven-check pipeline — (1) manifest shape, (2) command schema, (3) config schema, (4) dev ID validity, (5) build ID validity, (6) build ID binding, and (7) license approval — each rejecting on failure at the upload boundary, before anything is staged.

### Deploy Authorization — Owner Approval, Never Auto-Approval

`/internal/deploy` and every deploy-granting surface resolves the caller's `devId` against the `developers` table (§24.2) and proceeds only when that developer's license state reads `approved` (§15.7). An unknown developer — no `developers` row — or one in `pending` state is never auto-approved: the deploy is refused with 403 before any build, staging, or promotion step runs, the refusal is audited (`DEVELOPER_DEPLOY_DENIED`, source `SWASTIK`), and the attempt creates a pending approval request in the owner approval workflow. The deployment owner reviews that request through the governance API (§44.8) and either approves — which transitions the developer to `approved`, after which subsequent deploys proceed normally — or rejects it with a reason the developer can read.

### Module Ownership — the `modules` Table

Every published module slug has exactly one owning developer, recorded in the `modules` table (`slug`, `ownerDevId`, `createdAt`, `ownershipTransferredAt`). The first accepted upload of a fresh slug claims ownership; every subsequent upload or deploy of that slug resolves the caller's devId against the row, and a caller who is not the owner is refused with 403 before validation, staging, or promotion runs — the refusal audited as `MODULE_UPLOAD_DENIED_NON_OWNER`. Ownership transfer is an explicit operator action through the governance API (§44.8), never a side effect of an upload.

A database constraint closes the internal-approval hole: an approval write for a module must reference an approver identity that resolves to a project owner, and a CHECK constraint plus trigger reject any approvals row whose actor is a service, an automation, or the module's own owner — no code path, internal automation included, can self-approve a module into `approved` state.

### Swastik HTTP Throttling

The Swastik Fastify application registers `@fastify/rate-limit` across its entire surface: a global bucket of 30 requests per minute per caller, with a tighter registration bucket — 5 per minute — on the developer-registration, upload, and deploy routes. A caller that exceeds a bucket receives 429 with a `Retry-After` header; throttled attempts are audited like any other refusal, so abuse of the deployment surface is visible in the same audit trail as its successful use.

### Internal-Surface Authentication on Swastik

Every `/internal/*` route on Swastik's Fastify app — deploy grants, promotion triggers, reload signaling — installs a single preHandler that compares the presented `x-internal-api-key` header against `INTERNAL_API_KEY` with `crypto.timingSafeEqual` over fixed-length digests, before route logic, catalog lookup, or body parsing beyond the size limit runs. A missing or mismatched key is rejected with 401 and an audit row (`action: INTERNAL_AUTH_DENIED`, `source: 'SWASTIK'`) recording the route and the caller's address — never the presented value. The operator CLI sends the header on every `/internal/*` call it makes, reading the key from its own environment, so no unauthenticated client path into the internal surface exists at all.

Module promotion is crash-safe: the new version is written to `versions/{module}-{version}/`, the `live/{module}` symlink is atomically updated, the reload signal is sent, and the symlink is reverted on failure with the previous version preserved on disk — no pod ever reads a half-written module.

### 15.8.3 Safe Manifest Extraction

Swastik MUST NOT obtain the manifest by `import`/`require` of the uploaded module (that is a remote-code-execution vector). The manifest is extracted via static AST parsing (TypeScript compiler API / ts-morph) of the `defineManifest(...)` argument object literal, without evaluating any JavaScript. Where AST extraction is impossible, extraction falls back to a disposable sandbox with no network/fs/env/child-process access — never to direct evaluation against the trusted process.

### 15.8.2 Artifact–Source Hash Binding

Each `buildId` MUST be bound, in the builds table, to the source archive hash, the compiled artifact hash, the lockfile hash, the gate results, and the signature. Identity-level binding (devId/buildId pairing) alone does not prevent substitution: a runtime loader MUST verify that the signature covers the *deployed artifact bytes* before load, so an artifact swapped after signing is rejected.

### 15.8.1 Sandboxed Validation Execution

All validation performed on an uploaded module — AST traversal, type-checking, linting, and compilation — MUST run inside a lightweight sandbox (a Node `vm` isolate or disposable container) with no network, filesystem, `process.env`, or child-process access. Validation never evaluates untrusted module source by importing it; the manifest is extracted via static AST parsing. Trust in an authenticated, approved developer is not a substitute for this boundary.

### 15.8.2 Module Marketplace Full Flow — Partial

The module marketplace flow is partial. The upload, validation, staging, and promotion pipeline (§15.8) is functional, but the full five-gate review pipeline — including automated security scanning, manual review gate, licensing verification, integration testing, and approval workflow — is not fully implemented. The specification requires a complete five-gate review pipeline where each gate has explicit pass/fail criteria and the pipeline cannot be short-circuited.
### 15.8.1 Swastik Hot-Swap Subsystem — Tier 3 Scaffold (~30%)

The Swastik hot-swap subsystem is a Tier 3 partial scaffold at approximately 30% completion. Developer registration and build tracking are functional, and local filesystem staging/promotion works in development. The full hot-swap pipeline — including K8s volume staging, licensing gate enforcement, and the approval workflow — is not yet complete. The specification requires either a fully functional hot-swap mechanism or an honestly scoped V2 deferral with documented rationale.

### §15.8 Addition — Gate 1 Runs Inside Swastik's Isolated Builder

Gate 1 (tsc, ESLint, SBOM, build attestations) runs inside Swastik's own isolated
builder context — ephemeral, network-restricted, with no access to the live volumes
or process state — because Swastik accepts only raw TypeScript source and compiles
it itself: a pre-compiled JavaScript upload is rejected at intake (§5.5), so there is
no artifact a developer could pre-build that skips the gate. Every build emits a
machine-readable SBOM and a build attestation bound to the source and artifact
hashes. A standalone trusted-builder service, separate from Swastik, is deferred
greenfield work and is not yet specified; until it exists, Swastik's in-process
isolated builder is the only compilation path. The Release Manager runs from its own
external repository with an independent Docker image, independent Kubernetes
manifests, and the `release-manager.ts` entrypoint driving its phase state machine
(§15.4).

### Signed Build Provenance & Load-Time Verification

Every accepted build carries full provenance in the `builds` table: `sourceArchiveHash`, `artifactHash`, `lockfileHash`, `gateResultsHash`, the machine-readable SBOM, the Ed25519 `signature` with its `signatureKeyId`, and the `signedDescriptor` — the signature computed over the exact promoted artifact bytes bound to the provenance tuple (moduleSlug, version, devId, buildId, sourceHash, artifactHash, gateResultsHash). A build row missing any provenance column is not promotable, and identity-level binding (a devId/buildId pair) never substitutes for the signature.

The runtime loader verifies the Ed25519 signature before every load and every reload — bootstrap, hot-swap, fresh install, and post-revocation re-check — and refuses the load outright on verification failure: the module is neither imported nor executed, the refusal is audited, and the previous version keeps serving. An artifact swapped after signing fails this check because the signature no longer covers the deployed bytes. The **signed Effective Config Descriptor** — module id, build id, resolved config (manifest defaults plus live PEP overrides), approval status, approver, timestamp, and revocation flag — is mounted read-only in the module sandbox, and its signature is verified at the same load boundary as the artifact's. `signModule` runs on Gate 5 approval and `revokeModuleSignature` on revocation (§16.4). The Ed25519 signing subsystem itself — key ceremony, custody, and rotation — is deferred greenfield work; until it lands, Swastik's in-process signer holds the keys, and every verification gate specified here is enforced regardless.

### Atomic Promotion — renameSync Swap Under Redis Lock

Promotion is a single atomic filesystem operation on the shared RWX volume. The validated build is fully materialized at `versions/{module}/{version}/` first; the swap itself is a temp-symlink flip: a fresh symlink (`live/{module}.tmp` → the version directory) is created with `symlinkSync` and immediately verified, then moved over `live/{module}` with exactly one `fs.renameSync(stagedPointer, livePointer)` — atomic within the same volume, so no pod can observe a half-applied module mid-promotion, and a crash between symlink creation and rename leaves only an ignorable temp file, never a broken live pointer. The swap runs under a Redis lock (`SET NX EX`, key `swastik:promote:{moduleSlug}`) held until every pod has acknowledged the reload, so a scheduled core restart (§15.4) and a module promotion can never interleave. After the flip, a containment assertion re-resolves the live pointer and asserts `assertPathInside(volumeRoot, resolved)` — a swap that resolved outside the volume root fails the promotion and rolls back. Rollback detects dangling links with `lstatSync` rather than `stat`: a live symlink whose target directory was pruned or never landed is caught without following it, and the pointer is re-pointed at the newest surviving known-good version before any pod reads through it. The previous version's directory is preserved intact for instant rollback, and retention pruning removes superseded version directories only beyond the retention window — configurable through Swastik config, default the last 3 known-good versions.

### Staging Volume Bounds

Staging is a bounded resource, not an unbounded scratch area. Swastik enforces its bounds before any byte is written: a per-developer build quota (concurrent staged builds, configurable, default 5) and a per-developer byte quota, both checked at intake — an upload that would exceed either is refused with 429 naming the quota — and a per-slug bound on retained staged versions (default 3), beyond which upload is refused with 429 until promotion or pruning frees a slot; a body that alone exceeds the staging volume's per-upload ceiling is refused with 413 before buffering completes. Staged content is content-hash deduplicated: uploads whose source archives hash identically share one staged copy, so re-uploading an unchanged tree stages nothing new. The staging volume also carries a total volume bound — a high-watermark check precedes every write, and an upload that would push the volume past its bound is refused with 429 alongside an operator alert, so no volume of developer traffic can fill the shared volume every pod mounts.

### Unified Build Status Vocabulary

One status vocabulary governs the entire pipeline end to end — `RECEIVED → VALIDATING → BUILDING → VALIDATED → STAGED → PROMOTING → LIVE` for the success path, with exactly two terminal failure states: `REJECTED` (a gate failed) and `ROLLED_BACK` (promotion or reload failed and the previous version was restored). The same words appear on the upload API's response, the Deployment Records (§15.12), the developer portal, and PEP's deployment queries — no subsystem invents its own synonyms, and every state transition is an audited event in the same vocabulary.

### Selftest Gate Before Promotion

The staged build must pass its selftest before the pointer swap: the module's healthcheck and declared self-checks run in an isolated worker with a bounded timeout, against the staged bytes on the volume — the same healthcheck contract §15.1's reload sequence ends with, executed before anything goes live. A failing or timing-out selftest fails the promotion at the filesystem boundary (nothing is swapped, the previous version keeps serving) and is returned to the developer with the specific failing check named; the reload signal is only ever sent for a promotion whose selftest passed.

### 15.9 Change Detection & Deployment Orchestration

Dumby's own runtime **never** watches the filesystem for module changes — that

§15.9 documents that all module hot-swap relies on ReadWriteMany volumes (NFS, EFS) — the four per-tier volumes plus staging (§5.4); operators must ensure the filesystem is not a single point of failure and handle stale NFS handles via re-export or a CSI driver supporting atomic symlink updates. Tier-at-rest is enforced on every promotion: the symlink swap targets only the volume matching the module's declared tier.

responsibility belongs to Swastik alone, end to end. The full flow, restated as one
sequence: Swastik receives an upload or its own scheduled trigger fires; it validates
the payload; it stages and promotes the change; it calls the runtime's internal reload
API to perform the hot-swap; and it handles rollback on any failure while reporting
status at every stage. The runtime activates a new module version only after Swastik
issues the explicit reload signal — it simply waits for that signal, executes the
hot-swap it's told to execute, and returns the outcome. This division is deliberate:
the runtime stays free of any file-watching, polling, or upload-handling logic of its
own, with deployment orchestration living entirely inside a separate, purpose-built


### Bot-Side Reload Surface & HotSwapService

The runtime's internal reload API is `POST /internal/reload` — reachable exclusively from Swastik's own network position, authenticated with the timing-safe `x-internal-api-key` preHandler every internal surface shares (§22.5) — naming the module and version to activate. On receipt, `HotSwapService` runs the per-module sequence: pause the module's queue consumers, drain in-flight jobs to completion or their bounded timeout, then respawn the module (`onUnload` → re-import → `onLoad` → `onReady`, §15.1) and resume its queues, reporting the outcome back to Swastik. A reload that fails at any step triggers the rollback: the live pointer reverts to the preserved previous version, the failed build is marked `ROLLED_BACK` in the unified status vocabulary, and Swastik re-signals the reload against the restored version. Before queues resume, the re-imported module's registration is swapped in atomically: the frozen registry snapshot `CommandRouter` and `EventRouter` dispatch against is replaced only after `onReady` succeeds, and `deployAll` then re-registers the module's guild commands for the new build — no pod ever dispatches against a half-registered module. Any failure in the sequence triggers auto-revert: the previous version is re-imported and re-registered through the same frozen-registry replacement, and the failed build's status records the revert.
service instead.

### Runtime Import Verification — Hash Check, Cache-Busting, Manifest Match

Before the runtime imports a module version from the volume, it verifies the bytes: the loader hashes the on-disk artifact and compares it against the `builds` row for the named buildId (§15.8's provenance tuple). A mismatch — or a buildId with no row — never imports: the directory is moved into the quarantine area (`quarantine/{buildId}/`), the load is refused, and the refusal is audited with both hashes recorded. The import URL is cache-busted: the dynamic import path carries the buildId (`versions/{module}/{version}/index.js?b={buildId}`), so the ESM loader cache cannot serve a previous version's bytes across a hot-swap — a stale-cache import is structurally impossible, not merely unlikely. Immediately before activation, the loader asserts the manifest/directory match: every file the manifest declares (entry point, migrations, locale directory) exists in the version directory, and the directory holds no entry the manifest does not account for — a module cannot activate on a partially written or tampered tree.

### §15.9 Addition — Kubernetes Volume Mount at /mnt/modules

Deployment spec mounts a shared volume (emptyDir or persistent volume) at `/mnt/modules` and sets `MODULES_DIR=/mnt/modules`.

### §15.9 Addition — Health-Check Verification of Module Symlink/Volume Readability

`/health/readiness` verifies the symlink at `/mnt/modules` is readable and contains required modules; on hang, probe fails and K8s removes the pod from the Service without crashing it.

### §15.9 Addition — Gateway Session Resume / Shard Handoff for Zero-Downtime Core Restart

Rolling update with shard handoff / gateway session resume across ≥2 replicas.

### §15.9 Addition — Per-Module Process Isolation (Sandboxed Workers)

Each module runs in own process/container with CPU + memory quota, talking to core over a narrow RPC interface with permission scope and resource limits enforced at the boundary.

### §15.9 Addition — Automated Rollback on Failed Health Check

The last N known-good versions are retained on the shared volume — configurable via Swastik config, default the last 3 — and the live pointer auto-reverts on a failed health check or reload, with the developer notified automatically.

### 15.10 Swastik Auditing & Logging

Swastik maintains full auditing for every record and action performed using a dev ID,
a build ID, or the licensing system, written through the same `audit_logs` table
(§24.2) every other subsystem uses, tagged `source: 'SWASTIK'` rather than into a
separate audit store. Every entry captures validity status, versioning, and deployment
timestamps, alongside: developer lifecycle events (registration, approval, decline);
every upload attempt with its specific validation outcome; version assignment; staging
and promotion; hot-swap outcomes including any automatic rollback; every scheduled
core restart (§15.5); manual overrides an operator initiates directly; and the
codebase size of every promoted build. Filtering `audit_logs` to `source: 'SWASTIK'`
rows is, by construction, a complete history of every deployment action this
framework's delivery layer has ever taken.

**Swastik (the hot-swap subsystem).** Swastik is the hot-swap subsystem: a separate control-plane process owning module detection, validation, staging, atomic symlink promotion, reload signaling, auto-rollback, devId/buildId issuance, licensing, and audit logging. Marketplace modules reach it through the five-gate pipeline.

- Swastik owns staging + atomic symlink replacement, auto-rollback, devId/buildId, licensing, audit logging; Marketplace modules pass the 5-gate pipeline.

- Swastik preserved as control-plane; additive updates ( through ) evolve it into a trusted build/verification/provenance pipeline.

Swastik is an administrative control plane, separate from the request plane: a separately deployable service (`src/entry/swastik.ts`) that orchestrates all code delivery — developer registration, module upload, validation, staging, atomic promotion, reload, and rollback — while the bot itself serves requests.

- Defined concept; separate service.

- Maintained + per-module isolation.

### 15.11 The Developer Portal & Repository Binding

The developer portal is backend infrastructure, not a frontend concern — built to
support integration into any website through the REST surface (§44.8) rather than
through a framework-shipped UI. The intended workflow: a developer logs into whatever
site hosts the portal with their registered username and password; uses a deploy
button or drag-and-drop interaction to upload the module package; and everything past
that point is automated — manifest extraction, devId/buildId validation, the license
check, staging, promotion, and hot-swap signaling all happen without further input.
The developer supplies no information beyond the upload itself and needs only to track
the deployment status response.

**Repository binding.** A developer may bind a source repository to their registered
identity through the portal: an OIDC-validated binding in which the portal verifies
the developer's ownership of the repository through their identity provider's OIDC
assertion, once, at binding time. Once bound, a push to the repository's default
branch triggers a Swastik deployment automatically — the same upload → validate →
stage → promote → reload pipeline §15.8 defines, invoked by the push event rather
than by an upload — with no operator in the loop. The developer story this enables
is end-to-end: repository bind, push, deploy, automatic reload, dashboard
visibility, paper license — zero operator intervention. The binding is revocable
through the same portal surface, and every push-triggered deployment is subject to
the identical license, rate-limit (§13.6), and validation gates a manual upload
passes; the trigger changes, the gates do not.

### 15.12 Deployment Records

Every deployment — upload-triggered, push-triggered, or operator-initiated — produces
a durable **Deployment Record**: an append-only row binding the deployment's trigger
(who or what initiated it, including the OIDC-verified repository identity for
push-triggered deployments), the devId and buildId deployed, the module and version,
the validation and gate outcomes, the promotion result, the health-check outcome of
the verified reload loop (§15.4), and the rollback result if any. Deployment Records
are the source behind the status endpoint (§44.8), the operator's deployment history
view, and the audit trail's deployment slice (§15.10) — a deployment that leaves no
record is, by construction, a deployment that did not happen.

Every security control specified in §32 (secrets management, input validation, webhook
signature verification, rate limiting, dependency security, full audit logging)
applies to the upload path exactly as it applies everywhere else — the upload API is
one more authenticated entry point into the same HTTP server those controls already
govern uniformly, held to the same standard as every other surface in this reference.

### BCCM — Command Collision Resolution

The command router implements BCCM collision resolution so that two modules registering the same command name never silently override each other. Collision detection and resolution (five-step detect → pause → resolve → finalize, with `CommandCeilingService` enforcing the 100-command ceiling) is part of the command registration system (`src/commands/ (the canonical command system)CommandRouter`, spec §15; dep ).

### Release Manager–Swastik Scheduled Restart Synchronization

When Release Manager performs a scheduled restart it coordinates with Swastik through a bidirectional protocol: (1) 'I'm deploying, lock hot-swaps'; (2) 'here's my fencing token'; (3) 'I've stopped'; (4) restart-complete. All four message types are required for the protocol to close. Implementation: `swastik/lock-client.ts`, `swastik/queue-reconciliation.ts`, `swastik/scheduled-restart.ts`.

**The Licensing Row Is a Dataset Row, Not Enforcement.** The developer-licensing record in `swastik_developers` is just a dataset row: keep it minimal. Enforcement is the signed descriptor, not the row — registration data and enforcement are deliberately separated.

### Swastik's Evolving Role — from Doorman to TSA + Kitchen

Swastik's original design was a doorman: license check plus file copy. The realized role is TSA + kitchen — scan, build, sign, and smoke-test every module before it is admitted. Keep the pipeline stages aligned to that stronger model.

### Swastik Volume Loader and the External Module Volume

Swastik loads external modules from a live volume via dynamic import: `modules/swastik-loader.ts` with `SWASTIK_LIVE_VOLUME_PATH`, and `modules/register-all.ts` delegating to `loadModulesFromSwastikVolume`. The target is the defined external-volume model with sandboxing; metering tables already exist in migrations (`entry/swastik.ts`).

### Three-Time Manifest Validation

The design specifies manifest validation at three points: locally in development, at upload (`parseManifest`), and immediately before activation. Current code validates at upload and at module start; the third check — immediately before activation — must be added so a module cannot be activated on stale or tampered manifest data (`entry/swastik.ts`, `modules/manifest.schema.ts`, `modules/swastik-loader.ts`).

### Multi-Tenancy: Per-Namespace Module Sets via Volume Mounts

The same core image can serve entirely different module sets per namespace or persona: each namespace attaches its own PersistentVolumeClaim and Deployment `volumeMounts`, with `MODULES_DIR` pointing at the mounted path (for example, Pod A mounts a volume of Moderation modules while Pod B mounts an Economy set). Requirements are ReadWriteMany volumes and per-namespace PV/PVC provisioning. Note that `hardcodeGuildId` module fields remain meaningful under this model — they scope runtime guild behavior and are independent of where the module's files live on disk.

### Swastik's Architectural Identity: Control Plane, Not Request Plane

Swastik is an administrative control-plane service, not a request-processing plane. It owns the module delivery lifecycle — upload, validate, stage, promote, hot-swap — via symlink promotion on a shared Kubernetes volume (`/mnt/modules/swastik-staging` and the per-tier live volumes under `/mnt/modules`) with automatic rollback. It makes no Discord gateway connection and loads no modules; it shares only the PostgreSQL primary, the Redis instance, and the container image with the bot (a different entrypoint: `src/entry/swastik.ts`, with volumes declared in `apps/main/deploy/k8s/base/swastik-volumes.yaml`). The separation is load-bearing: Swastik needs filesystem access and cross-pod orchestration that would violate module isolation if it were itself a module.

## 16. Marketplace, MDIS & Extension System

**Status:** [SPEC]

### 16.1 Purpose

The Marketplace tier provides a formal, discoverable extension layer for capabilities
that are genuinely optional, potentially resource-intensive, or dependent on
third-party services not every operator has access to. It distinguishes "not
pre-installed because you opt in" (Marketplace) from "not installed because something
went wrong" (a failed Standard module), and gives the framework a reviewable,
categorized channel for community-authored extensions.

### 16.2 Discovery and Installation Flow

```
DIAGRAM 16-A — Install Flow

 Guild admin browses the catalog, optionally filtered by category
 │
 ▼
 ModuleRegistry.getCatalogForGuild(guildId) returns entries with status
 'never_installed' or 'disabled' (installed earlier) — filtered by each
 module's manifest `visibility` (§11.2): 'public' entries list in the
 browsable catalog, 'unlisted' entries install only by direct reference,
 and 'private' entries never appear for any guild but the owning
 developer's
 │
 ▼
 Admin selects a module → install
 │
 ▼
 GuildModuleStateService.install(guildId, moduleSlug):
 1. Verify the module is loaded fleet-wide (if not, an operator must load
 it globally first)
 2. INSERT INTO guild_module_states (status='active', installedAt=now)
 3. Invalidate the Redis cache key
 4. CommandDeployer deploys the module's commands as per-guild scoped
 commands — propagates in seconds, not the ~1 hour of a global
 registration
 5. Emit guild.module.installed on the internal bus
 │
 ▼
 Module appears in the guild's slash command list;
 its event handlers begin firing for this guild

 UNINSTALLING reverses steps 3–5: status → 'disabled', per-guild command
 scoping removed, event dispatch stops for this guild.
```

- ** discover scans MODULES_DIR for subdirectories with manifest.ts.

ModuleRegistry.discover scans the configured module volumes — the four per-tier volumes plus staging, rooted at `MODULES_DIR` (default `/mnt/modules` in production) — using blind discovery for subdirectories containing manifest.ts; no hardcoded module list exists anywhere in the core image.

### 16.3 Marketplace Categories

```
TABLE 16-A — Category Reference

┌────────────────┬─────────────────────────────────────────────────────┐
│ Category │ Intended Module Types │
├────────────────┼─────────────────────────────────────────────────────┤
│ audio │ Music playback, voice channel tools, audio recording │
│ community │ Additional community-building features beyond Standard │
│ security │ Advanced threat monitoring, compliance tooling │
│ integrations │ Third-party API connections │
│ utility │ Power-user and automation tools beyond Core utility │
└────────────────┴─────────────────────────────────────────────────────┘
```

### 16.4 Community Module Submission Pipeline

A third-party submission clears five gates before it appears in the catalog for any

**Marketplace Review Pipeline Specification**
The pipeline's review stages run static and dynamic analysis, supply-chain attack detection, and a defined revocation SLA, with SAST/DAST, SBOM, signed artifacts, revocation automation, and sandboxed execution. Detection performance — what the automated gates catch and what they miss — is tracked as measured detection rates in CI against a growing corpus of known-bad samples, and every claim the review process makes about its effectiveness is stated in that measured form. The rates are tunable targets driven toward their floor release over release, and the corpus grows with every confirmed finding.

guild.

```
DIAGRAM 16-B — Five-Gate Review Pipeline

 GATE 1 — Static Analysis
 tsc --noEmit + ESLint (cross-module import enforcement, no require, no
 direct process.env access outside the module's own config schema, no
 EmbedBuilder/MessageEmbed imports per the embed ban, §4) — zero
 errors required
 │
 ▼
 GATE 2 — Manifest Validation
 All required fields present; tier === 'marketplace'; marketplaceCategory
 is one of the five valid values
 │
 ▼
 GATE 3 — Security Review (manual)
 What intents are requested and why; whether any dashboardSchema exposes
 sensitive configuration; whether jobs are idempotent; whether
 cross-module data access is limited to reads
 │
 ▼
 GATE 4 — Functional Review
 Commands follow the depth standard (every option documented, every error
 condition handled); every migration has up AND down; the test suite
 covers critical paths
 │
 ▼
 GATE 5 — Signing and Listing
 An approved module is cryptographically signed; the module registry
 refuses to load an unsigned module from the extension directory tree at
 Stage 09 (a module maintained as part of a deployment's own trusted
 codebase is exempt from this check). Once signed, the listing is written
 to the catalog for discovery.

 A module failing any gate is returned to the author with specific


**Listing writes and the visibility path.** The catalog's developer identifier is the
`devId` string itself — the same identifier the Credentials Service issues and the
`developers` table keys on — written to `marketplace_listings.devId` (§24.2) with no
separate `developerId` namespace to drift against it. Visibility changes flow through
`PATCH /swastik/modules/:slug/visibility`: the endpoint validates the new
`releaseStatus`/`visibility` pair against the manifest triad (§11.2) and writes the
corresponding `marketplace_listings` rows in the same transaction — publishing or
unpublishing the listing so the catalog and the manifest never disagree about a
module's publicness.
 remediation notes — never silently rejected.
```

**Version updates are not exempt from re-review.** Every new version of an
already-listed module re-runs Gates 1–4 in full — trust is re-established per version,
not inherited indefinitely from first approval — and only re-signs (Gate 5) if all
four pass again. An update whose diff against the currently-approved version touches
requested intents, `dashboardSchema` fields, or declared `crossModuleReads` is flagged
for the full manual security review (Gate 3) rather than the lighter automated-gates-
only path a patch-level dependency bump can take, since those specific categories of
change are exactly what a compromised or intentionally malicious update would alter.

**Revocation.** A module found unsafe after listing — a reported vulnerability, a
maintainer account compromise, a discovered policy violation — is revoked by unsigning
it: the registry's signature check runs not only at initial load but on every
hot-reload and fresh-install attempt, so revoking a signature takes effect the moment a
guild's instance next reloads or reinstalls the module, without a framework redeploy.
Revocation is a Power Engine Panel action (§22.2) rather than a Marketplace-specific
mechanism, which is what gives it the mandatory reasoned audit trail every such action
carries. A revoked module already running in a guild is not silently killed
mid-operation by default: revocation immediately removes it from new-install browsing
and alerts every guild currently running it, since force-disabling a module guild
administrators actively depend on carries its own disruption cost a human operator is
better positioned to weigh than an automated kill switch — a critical-severity
revocation does force-disable on next event dispatch; a lower-severity one only alerts,
and escalating it further is a separate, deliberate call.

**Hot-Swap Module Version Upgrade (Architecture Only)**
[SPEC] — Swastik's delivery pipeline is specified end to end (§15.8–§15.9): tarball intake with safeJoin containment, hash-bound builds, bounded staging, temp-symlink promotion under Redis lock, the bot-side /internal/reload consumer, and auto-revert on a failed hot-swap.

A fully implemented Swastik service with: module upload API (/swastik/modules/upload), manifest validation, devId/buildId/license validation, staging directory management on shared Kubernetes volume, atomic symlink promotion, and reload API invocation (POST /internal/reload).

**In-process hot-swap (`CommandLifecycleHotSwapService`) (~30%)**
Service exists + tested; not wired. Missing ~70% (bootstrap wiring, live integration).

Hot-swap diff computation + live registry swap without restart.

**SBOM requirement.** SBOM generation is confirmed for the Release Manager pipeline and still conceptual for modules. Target: every module build in the pipeline produces a machine-readable SBOM so submissions carry a dependency inventory through these gates.

Define the automated static analysis gate.

Automated Gate 1 (tsc + ESLint, including the embed-ban rule) runs immediately on upload and must pass before the submission is queued for manual review.

Define the signing gate that binds a module to its review approval.

Gate 5 signs approved modules after review; the runtime registry refuses to load unsigned modules from the extension directory at Stage 09 unless they are part of the deployment's own trusted codebase, and the signature is verified again at every load and reload..

### 16.5 Module Dashboard Interface System (MDIS)

MDIS is the schema-driven web configuration interface for module settings, extending
the general REST reference (§44) with module-specific endpoints and rendering
configuration panels through a declarative schema any module can provide in its
manifest's `dashboardSchema` field.

**Schema-driven rendering.** MDIS's renderer is a generic engine that reads a
module's `dashboardSchema` and generates the corresponding web UI — no per-module
frontend code exists; the schema *is* the UI. A module author declares what their
configuration panel looks like in TypeScript, the same language the rest of their
module is written in, and the renderer turns it into HTML controls automatically.
This is the same declaration principle the interaction surface uses — authors
declare schemas, the core Renderer derives presentation (§20.8) — applied to the
web: one authoring model, two rendering targets.

```
TABLE 16-B — Supported Schema Components

 toggle boolean field
 select enum field with named options
 text-input string field, optional regex validation
 number-input integer or float field, min/max bounds
 channel-picker, role-picker, user-picker
 list repeating values
 data-table read-only tabular display
 chart time-series visualization of module metrics
```

**Auto-exposed REST endpoints.** Every module with a `dashboardSchema` automatically
gets `GET /api/modules/:name/config`, `PUT /api/modules/:name/config`, and
`POST /api/modules/:name/:action`. Enable/disable state is exposed through a
**separate** endpoint mapping to `guild_module_states`, never the config endpoint:
`PATCH /api/modules/:name/state`, gated by the guild's own ADMINISTRATOR role.

```
TABLE 16-C — Tier Visibility on the Dashboard

┌─────────────┬───────────────────────────────────────────────────────┐
│ Tier │ MDIS Visibility │
├─────────────┼───────────────────────────────────────────────────────┤
│ Admin │ Never visible in any guild dashboard │
│ Core │ Visible and configurable; no toggle control (cannot be │
│ │ disabled) │
│ Standard │ Visible; toggle shown; config panel if dashboardSchema │
│ │ present │
│ Marketplace │ Visible when installed; uninstall button; config panel │
│ │ if dashboardSchema present │
└─────────────┴───────────────────────────────────────────────────────┘
```

**Graceful fallback.** Any enabled module without a `dashboardSchema` appears with a
"Web Panel Not Available" placeholder naming the module and its tier — never a blank
entry or an error state.

**Multi-guild synchronization.** A single dashboard session can manage every guild the
authenticated user administers, since the same Discord identity commonly holds
administrator rights in more than one guild — but every read and write is bound to
exactly one guild at a time, carried explicitly as a `guildId`, never inferred from
session state alone. Switching the dashboard's active guild is a purely client-side
selection of which `guildId` the next request targets; it triggers no server-side
session change and touches no other guild's configuration. Because no two guilds ever
share a cache key, a config row, or a `guild_module_states` row, every guild a
multi-guild session reaches maintains its own independently synchronized settings.

**Instant MDIS ↔ backend sync.** MDIS and the backend stay synchronized through
per-guild Redis pub/sub change events rather than polling windows: every
configuration write, module-state change, or governance action the backend commits
publishes a change event on the guild's channel, and every MDIS-connected client —
and every pod's L1 cache (§25.3) — subscribes to the guild channels it serves. The
sync is bidirectional: a dashboard write commits through the backend's validated
write path and its resulting change event is what updates every other open dashboard
viewing the same guild, so two administrators editing the same panel always see each
other's committed changes without a refresh. Change events carry the guildId, the
changed key, and a monotonic version stamp — never the value itself — and subscribers
re-read through the normal validated read path, so a dropped event degrades to the
underlying read, never to stale certainty.

**Permission enforcement.** Dashboard API calls authenticate via a Discord OAuth2
token; the caller's RBAC role resolves from the same source and the same resolution
logic the in-bot permission engine uses (§21.7). A user without the guild ADMINISTRATOR role
receives 403 on state-modifying endpoints; read-only endpoints require MODERATOR at minimum.
Admin-tier module configurations are never exposed, regardless of caller role.

**Accessibility as a renderer property, not a per-module obligation.** The generic
renderer targets WCAG 2.1 Level AA conformance as a hard requirement, since every
module author's panel inherits whatever the renderer does — an accessibility defect
there is every module's problem simultaneously. Every schema component renders with a
programmatically associated label, the entire panel is keyboard-operable with a
visible focus indicator and no keyboard trap, color is never the sole signal for a
validation error or toggle state, and `data-table`/`chart` ship with an accessible name
and a text-equivalent summary respectively. This is verified once, in the renderer's
own test suite (an automated accessibility scan gating the renderer's CI), rather than
something each module author separately implements or verifies.

# PART IV — REQUEST & INTERACTION LAYER

---

## 17. Command Framework & Routing Engine

**Status:** [SPEC]

### 17.1 Command Types Supported

The framework supports every interaction-based command type Discord offers.
Text-prefix commands are explicitly unsupported (§4).

```
TABLE 17-A — Command Types

┌───────────────────────────┬────────────────────────────────────────────────┐
│ Type │ Behavior │
├───────────────────────────┼────────────────────────────────────────────────┤
│ ChatInputCommand (slash) │ The primary type, invoked via /command-name. │
│ │ Supports options (string, integer, number, │
│ │ boolean, user, channel, role, mentionable, │
│ │ attachment), subcommands, and subcommand groups. │
│ │ Options may declare autocomplete, min/max bounds, │
│ │ and fixed-choice lists. │
│ UserContextMenuCommand │ Appears in the right-click Apps menu on a user; │
│ │ provides the selected User and GuildMember. │
│ │ Maximum 5 per application. │
│ MessageContextMenuCommand │ Appears in the right-click Apps menu on a │
│ │ message; provides the selected Message. Maximum │
│ │ 5 per application. │
└───────────────────────────┴────────────────────────────────────────────────┘
```

### 17.2 Command Class Interface — Complete Field Reference

Every command class implements `ICommand`; a validator verifies each field during

Every command class implements `ICommand`; a validator verifies each field during
bootstrap Stage 13.

> **Component interactions gap:** The InteractionRegistry exists (~46 LOC)
> but the custom_id encoding scheme `{moduleNamespace}:{handlerKey}:{contextPayload}`
> and button/select-menu handlers are NOT implemented. V1 ships Components V2
> static-only; dynamic component interactions are deferred to V2.
bootstrap Stage 13.

Renderer-only authoring: modules return a declarative response from
`execute` rather than crafting Discord payloads directly. The module
author declares the command's schema — options, response shape, component
flows — and the core Renderer (§20.8) derives the presentation from that
declaration: it builds the Discord Components v2 payload, injects the
standard frame, and issues the buffer embed (§20.9). The author never
owns visual presentation, never constructs an embed (banned, §4), and never
calls a response method on the interaction object directly.

There is exactly one command system: the `ICommand` interface dispatched through
the Core `CommandRouter`. The legacy `src/commands/` directory that bypassed the
middleware pipeline is removed; all commands — including core first-party ones —
are modules implementing `ICommand` and go through the same dispatch path.
Context-menu commands (user and message) are dispatched through the identical
router — the `USER::`/`MESSAGE::` registry keys of §17.3 resolve through the same
lookup as slash commands and run the same middleware pipeline. Dispatch fails
closed on an unknown tier: a command whose module tier cannot be resolved to one of
the four known tiers is rejected before its handler runs, never routed on a default.

```
TABLE 17-B — ICommand Fields

┌─────────────────────────┬────────────────────────────────┬───────────────┐
│ Field │ Type │ Default │
├─────────────────────────┼────────────────────────────────┼───────────────┤
│ data │ SlashCommandBuilder | │ required │
│ │ ContextMenuCommandBuilder │ │
│ execute │ async (interaction, context) => │ required │
│ │ Promise<DeclaredResponse> — a │ │
│ │ schema-conformant value the │ │
│ │ Renderer renders (§20.8) │ │
│ permissions.discord │ PermissionFlagsBits[] │ [] │
│ permissions.rbac │ string │ 'MEMBER' │
│ defaultMemberPermissions │ bigint │ undefined │
│ cooldown.duration │ number (seconds) │ defaultCooldown │
│ cooldown.scope │ 'USER'|'GUILD'|'CHANNEL'|'GLOBAL' │ 'USER' │
│ guildOnly │ boolean │ true │
│ ownerOnly │ boolean │ false │
│ requiresDefer │ boolean | (interaction)=>boolean │ false │
│ ephemeral │ boolean │ false │
│ nsfw │ boolean │ false │
│ middleware │ { class, context? }[] │ [] │
│ autocomplete │ Record<optionName, Handler> │ {} │
│ localization │ { name: {}, description: {} } │ {} │
└─────────────────────────┴────────────────────────────────┴───────────────┘
```

`defaultMemberPermissions` is a UX-layer, client-side gate only — the runtime

Worker-thread isolation is extended from hot-swap to general module sandboxing:
all modules (not just those being swapped) run in isolated worker processes with
their own CPU/memory quotas, so a broken or malicious module can only take down its
own worker, never the core or sibling modules.

enforcement is always the middleware chain's own Layer 4/5 checks (§21.2), never the
Discord-side hint alone. `nsfw: true` is an infrastructural classification handled
entirely by Discord's own client — the command is only visible in age-restricted
channels, and invoking it elsewhere never reaches Dumby's servers at all.

Three distinct "routers" handle traffic — `CommandRouter` (Discord), the Fastify `HttpServer` (HTTP), and the DI Container + Event Bus (internal) — with no single proxy in the middle. The DI container is the type-safe transportation system that physically injects dependencies (`di/container.ts`, `di/tokens.ts`).

- Three distinct "routers" handle traffic: CommandRouter (Discord), Fastify HttpServer (HTTP), DI Container + Event Bus (internal). No single proxy.

- Maintained as the architectural foundation.

Background listener pattern: message scanning is a background service (`EventRouter` delivers `messageCreate` events to handlers) while command execution is a foreground interaction (`CommandRouter`) — and they never touch. The manifest's `events` vs `commands` arrays declare the two surfaces separately.

- Fully Implemented. Message scanning is a background service (EventRouter delivers messageCreate events to handlers). Command execution is a foreground interaction (CommandRouter only accepts Discord Interactions). These two things never touch — they live in separate worlds with separate rules, separate entry points, and separate purposes.

- Maintain as architectural invariant; document the separation principle in the developer guide.

Discord's Message Content privileged intent is the infra-level privacy gate behind the slash-command mandate: prefix commands force a bot to read every message in a server, while slash commands are zero-knowledge — Discord's client tells the bot exactly what command to run. MESSAGE_CONTENT is requested only by modules that explicitly declare it in their manifest `intents` array.

- Prefix commands force a bot to read every message in a server to check if it starts with a specific character (!, ?, etc.). This gives the bot full access to chat history. Discord made reading message content a privileged intent — bots must pass a rigorous review process, and many are denied.

- Maintain the architecture that uses slash commands as the primary interface; MESSAGE_CONTENT intent is only requested by modules that explicitly need it (auto-mod, analytics).

Hexagonal architecture (ports & adapters) in the command framework: 11 port interfaces in `src/commands/ports.ts` (~215 LOC) — LoggerPort, EventBusPort, AuditLogPort, and others — with all 14 services depending on ports rather than concrete implementations, enabling mock substitution in tests (12 test files use mock port implementations).

- 11 port interfaces defined in src/commands/ports.ts (~215 LOC). All 14 services depend on ports. 12 test files use mock port implementations.

- Maintained as the testability foundation.

Slash commands are zero-knowledge command transactions: when a user types `/`, Discord's client tells the bot exactly what command to run with what inputs — the bot never sees message content for routing. Dumby enforces slash-only commands with zero message-content parsing in `command-router.ts`/`command-registry.ts`.

- Dumby enforces slash-only commands. Zero message-content parsing for command routing.

- Maintained as the command model.

### 17.3 Command Registry Architecture

`CommandRegistry` is a `Map<string, ICommand>`, frozen after Stage 13 and never
mutated during runtime. Keys are compound paths, giving O(1) dispatch and
build-time-visible namespace collision detection:

```
CODE REFERENCE 17-A — Registry Key Shapes

"/ban" → BanCommand
"/case.view" → CaseViewCommand
"/economy.shop.buy" → EconomyShopBuyCommand
"USER::View Mod History" → ViewModHistoryContextCommand
"MESSAGE::Flag Content" → FlagContentContextCommand
```

Two modules registering the same key throw `CommandKeyCollisionError`, naming both
modules and the conflicting path, **before the bot is permitted to start** — this is a
Stage 13 fatal error, not a runtime surprise.

**One tree, at `src/commands/`.** The command framework lives as a single subtree at
top-level `src/commands/` — routing (`CommandRouter`), registration
(`CommandRegistry`), upsert planning (`CommandDeployer`, `CommandDeploymentPlanner`),
collision resolution, the per-tier command ceiling, and BCCM — resolving ADR 002:
there is no `src/core/commands/` subtree, the fourteen command services are imported
from `src/commands/` by the bootstrap path and the hot-swap path alike, and no
command-system code exists anywhere else in the tree.

### 17.4 Command Deployment Strategy

```
TABLE 17-C — Deployment Scope by Context

┌────────────────────────────┬───────────────────────────────────────────────┐
│ Context │ Scope │
├────────────────────────────┼───────────────────────────────────────────────┤
│ Development │ All commands registered to the development │
│ │ guild — per-guild, propagates in seconds │
│ Production Standard/ │ Global registration — propagates within ~1 hour; │
│ Marketplace │ CommandDeployer runs post-deploy, idempotent — │
│ │ only real changes trigger a Discord API upsert │
│ Admin │ Always the development guild only, regardless of │
│ │ environment │
│ Dynamic per-guild commands │ Always per-guild scoped; never global │
│ Hardcoded modules │ Always scoped to hardcodeGuildId alone — a │
│ │ hardcoded:true module's commands register in │
│ │ that guild only, never globally and never in any │
│ │ other guild, for as long as the module exists │
└────────────────────────────┴───────────────────────────────────────────────┘
```

### 17.5 The CommandContext Object — Complete Field Reference

Every `execute(interaction, context)` call, and every middleware
`execute(context, next)` call (§19), receives the same `CommandContext` instance —
assembled once at the start of the request and passed by reference through the entire
pipeline for that single interaction.

```
TABLE 17-D — CommandContext Fields

┌────────────────┬──────────────────────────────┬─────────────────────────────┐
│ Field │ Type │ Populated by │
├────────────────┼──────────────────────────────┼─────────────────────────────┤
│ correlationId │ string (UUID) │ TraceMiddleware │
│ guildConfig │ typed guild_configs deserialize │ GuildConfigMiddleware │
│ locale │ BCP 47 string │ GuildConfigMiddleware │
│ rbacRole │ Dumby role enum │ RBACMiddleware │
│ logger │ pre-bound Pino child logger │ TraceMiddleware — carries │
│ │ │ correlationId, guildId, userId, │
│ │ │ shardId, moduleId on every call │
│ shardId │ number │ Bootstrap — always populated, │
│ │ │ sharded or not │
│ metadata │ Map<string, unknown> │ Any middleware — a scoped bag │
│ │ │ later middleware or the handler │
│ │ │ itself reads/writes, without │
│ │ │ widening CommandContext's type │
└────────────────┴──────────────────────────────┴─────────────────────────────┘
```

`CommandContext` is created fresh per interaction by the DI container's `scoped`
lifetime (§10.6) and discarded when the interaction completes — it never survives
across requests and is never shared between concurrent interactions, even two from the
same user in the same guild.

### 17.6 Startup Command Lifecycle

At every bootstrap, Stage 13's `COMMAND_REGISTER` step never bulk-deletes the
application's Discord command registration: a boot-time delete-then-reregister would
briefly unregister every command fleet-wide and burn the guild-command creation
budget on every restart. Instead the stage computes the current desired set fresh
from each guild's actually-enabled modules, diffs it against what Discord currently
has on record, and enqueues the differences as guild-level changes on the same change
queue (§17.7). A partial prior deploy, a manually-edited command in Discord's own
UI, or a stale registration from a now-removed module is reconciled guild by guild
through the queue — without a window in which every command is simultaneously
absent. Core- and Standard-tier commands are
always part of the registered set; Marketplace-tier commands register for a guild only
once that guild has explicitly enabled the module — a freshly-invited instance shows
the Core and Standard surface immediately, with every Marketplace command absent until
an administrator opts in.

Enabling a module after startup registers its commands immediately — a per-guild
scoped call propagating in seconds. Disabling a module does **not** remove its
commands from Discord's registration with that same immediacy — that half of the
change goes through the command change queue (§17.7). It does, however, make the
commands immediately unusable: the moment a module is disabled, the framework writes a
deny override to Discord's native per-command permissions for `@everyone` and every
role currently configured for that command, so the command disappears from members'
effective access instantly, even though its underlying deregistration hasn't run yet.

### 17.7 The Guild Command Change Queue

Two kinds of guild-level command change never take effect immediately at the Discord
registration layer: a module disable's corresponding command removal, and a rename or
alias request (§17.8). Both are entries in one shared queue table, batched and pushed
together rather than through two independent mechanisms, since both ultimately resolve
to the same operation — a bulk-overwrite of one guild's registered command set — and
Discord's 200-per-day guild-command-creation limit is conserved by batching regardless
of which kind of change triggered it.

```
DIAGRAM 17-A — Batching Timeline, Anchored to T₀ (first queued entry's timestamp)

 T₀ T₀+12h T₀+13h T₀+24h (outer ceiling)
 │─ queued ───┤── prepare window ────────┤── PUSH ────────────────────────►│
 (assembling the batch) (single bulk PUT, to the second)

 Any entry queued before T₀+13h joins this batch.
 An entry queued after T₀+13h starts a NEW batch with its own T₀.
```

A guild administrator can revoke a queued entry, or edit its target name or alias, at
any point before its batch's push executes — the queue holds a request, not a
commitment, until the moment it actually leaves for Discord. If a module receives a
new version while one of its commands has a pending deletion entry queued, that entry
is invalidated automatically and the deletion process restarts from zero — a changed
command definition is treated as a signal the guild might want to keep the module
rather than lose it to a deletion queued against a version that no longer exists.

**Push failure and retry.** If the scheduled bulk-overwrite fails — a Discord API
outage, a transient 5xx — the batch is neither marked applied nor discarded: it
remains `pending`, and the queue's own status is what gates whether a change is
considered live, with the push retried automatically on the next scheduled cycle. A
guild's commands stay in their last successfully-applied state throughout this window
— a failed push never leaves a guild with a command removed on the sending side but
not reflected on Discord's side.

### 17.8 Bot Command Cosmetics for Marketplace (BCCM)

A guild administrator can rename any enabled command — Core, Standard, or
Marketplace — or add an alias for it, through a queue-writing command that goes
through §17.7's batching rather than taking effect immediately. This lets a guild
curate its own command surface (renaming `ban` to fit its own moderation vocabulary,
or aliasing it alongside the original) and gives administrators a guild-local tool for
resolving a naming collision themselves rather than waiting on either module's author.

Two constraints hold regardless of what an administrator requests: an alias may never
match a reserved, native Discord command name — rejected outright with a specific
error rather than queued — and BCCM never becomes a text-prefix system by another name
(§4): a rename or alias only ever changes what a slash command is *called*, never how
it is invoked.

**Command-count projection.** Before accepting any queue request — a rename, an alias
addition, or a deletion — the projected resulting total registered-command count as of
the batch's next scheduled push is computed, accounting for every other entry already
queued against that same batch. A request whose projected result would raise the
guild's total above Discord's 100-command ceiling is rejected outright, before it ever
enters the queue, with the specific projected count returned to the requester. This is
what keeps a guild's command count from ever exceeding 100 under any circumstance: the
ceiling is enforced at request time, against a computed projection, rather than
discovered as a Discord-side rejection after a batch has already been assembled and
pushed.

### 17.8.1 BCCM — Change-Queue Wiring

BCCM is a constructed service, not a declared one: `CommandCosmeticsService` is
built at bootstrap and registered in the container, and every rename or alias
request it accepts is persisted through a knex-backed repository over the same
guild command change-queue table §17.7 specifies — one queue, one repository, one
batching timeline for deletions, renames, and aliases alike. The service enforces
both hooks at request time: the command-count ceiling projection of §17.8 (a
request whose projected result would exceed the 100-command ceiling is rejected
before it enters the queue), and the collision hook of §17.9 (a rename or alias
that collides with a command active from another module routes through the
five-step collision resolution rather than shadowing it). Reserved command names
are rejected with a specific error at request time, never queued.

### 17.9 Command Collision Resolution

When a module is enabled in a guild and one of its commands collides by name or alias
with a command already active there from a different module, installation does not
fail silently or pick a winner automatically.

```
DIAGRAM 17-B — Five-Step Collision Resolution

 1. PAUSE
 The newly-enabled module's guild_module_states row is written as
 'install_pending_resolution' rather than 'active' — it dispatches
 nothing until the collision is resolved.
 │
 ▼
 2. PRESENTATION
 The guild sees an ephemeral embed with a dropdown listing every
 conflicting command alongside its originating module.
 │
 ▼
 3. SELECTION
 A guild administrator selects which module's command executes under
 the contested name.
 │
 ▼
 4. OVERRIDE
 A command-override entry is written, cached in L1 alongside every
 other guild-scoped state this pipeline reads on the hot path.
 │
 ▼
 5. RESOLUTION
 The newly-enabled module's row moves to 'active', and its winning
 command goes live at the queue's next scheduled push — no further wait.
```

If the module whose command won a collision is later disabled, the system
re-evaluates automatically: the other module's command takes over the contested name
immediately, its override entry updated silently, without requiring the administrator
to resolve the same collision a second time.

### 17.10 Command Restrictions — Direct Messages & Prefix Prohibition

Two restrictions govern where and how a command may be invoked, independent of tier,
both enforced structurally rather than left to a handler's own discretion.

**No commands in direct messages — a complete prohibition for the main bot.**
Every command, in every tier including Admin, declares `guildOnly: true` and registers
guild-context only; `AuthMiddleware` rejects any DM-originated interaction outright.
There is no exception, no sanctioned DM surface, and no configuration that opens one
for the main bot (ADR-002, docs/adr/). The operator path that the old Admin-tier DM
exception used to serve is fully covered by the control plane instead: PEP's
authenticated REST surface and CLAI's SSH terminal (§22) are both reachable when the
gateway is down, and §28.6's maintenance-mode allow-list keeps the operators of that
mechanism from being locked out of it — the lockout-avoidance path is re-verified
against this complete prohibition. Twixter instances (§35) decide their own DM
behavior: a Persona is a separate Discord Application commissioned by its guild, and
its DM posture is the guild administrator's choice, not the framework's.

**No simulated prefix-based commands.** As established in §4's non-goals, this
restriction has no loophole: a module may scan message content and react to what it
finds for a legitimate, manifest-declared purpose, but may never use that scan to
simulate a prefix-based command system — parsing a leading token out of a message and
dispatching it as though it were a registered command. Review treats a module found
doing this as a rejected submission (§16.4), and the same standard applies uniformly to
any module maintained as part of a deployment's own trusted codebase — message
scanning and command dispatch are two structurally distinct capabilities, and no
module is permitted to blur them into one.

### 17.11 Complete Command Interaction Trace — Step by Step

This section provides the definitive, step-by-step trace of a command interaction from the moment a user types a slash command in Discord to the moment the bot's response appears on their screen. Every component, every check, every transformation is documented here. This trace is the reference for understanding how Dumby processes a single interaction end-to-end.

#### 87.1 The User Action

A user in a Discord guild types /moderation ban in the message input field. Discord's client displays the command in the command picker. The user selects the command. Discord displays the command's options: user (required, the user to ban) and reason (optional, the reason for the ban). The user selects a target user from the user picker and types a reason: "Spamming in multiple channels."

#### 87.2 Discord Sends the Interaction

Discord's servers construct an INTERACTION_CREATE gateway event. The event payload includes: the interaction ID (a unique identifier for this interaction), the interaction token (used for responding to the interaction), the application ID (the bot's application ID), the interaction type (2 — APPLICATION_COMMAND), the command name ("ban"), the command options (user: 123456789, reason: "Spamming in multiple channels"), the guild ID, the channel ID, the user's ID, the user's permissions in the channel, the guild's locale, and the timestamp.

Discord sends this event to the bot's gateway connection as a zlib-compressed WebSocket frame. The event arrives at the bot's GatewayClient.

#### 87.3 GatewayClient Receives the Event

The GatewayClient receives the WebSocket frame. It decompresses the zlib payload using the persistent decompression context. It parses the JSON payload. It extracts the opcode (0 — DISPATCH), the sequence number (used for heartbeats and resume), the event name (INTERACTION_CREATE), and the event data. It updates the internal sequence number counter. It passes the event name and data to the EventDispatcher.

#### 87.4 EventDispatcher Routes the Event

The EventDispatcher receives the INTERACTION_CREATE event. It determines the event namespace (interaction.create). It looks up all subscribers for this namespace. The primary subscriber is the InteractionRouter (which subscribes to interaction.create). The EventDispatcher creates an event context and delivers it to the InteractionRouter.

#### 87.5 InteractionRouter Looks Up the Command

The InteractionRouter receives the interaction context. It determines the interaction type (2 — APPLICATION_COMMAND). It extracts the command name ("ban"). It looks up the command in the CommandRegistry by name. The CommandRegistry returns the command definition: module_name ("moderation"), handler (the ban command's handler function), tier ("Standard"), permission_key ("moderation.ban"), rate_limit (cooldown: 10 seconds per user), and response_format ("embed").

#### 87.6 InteractionRouter Creates the Interaction Context

The InteractionRouter creates an interaction context object containing: the interaction ID, the interaction token, the application ID, the guild ID, the channel ID, the user ID, the user's permissions, the command name, the command options, the module name, the tier, the permission key, the rate limit configuration, the response format, the service container (the moderation module's injected services), and a response helper (with methods: reply, defer, editReply, followUp, ephemeral).

#### 87.7 Middleware Pipeline — Layer 1: Tier Guard

The interaction context enters the middleware pipeline. Layer 1 is the Tier Guard. The Tier Guard checks the command's tier: "Standard." Standard-tier commands are available to all users — no tier restriction. The Tier Guard passes the request to the next middleware.

#### 87.8 Middleware Pipeline — Permission Resolution

The PermissionResolver runs the canonical seven-layer sequence of Table 21-A. Layer 1 (Bot Owner Override): the user's ID is not in BOT_OWNER_IDS — continue. Layer 2 (Blacklist): the user and guild are not on the block list — continue. Layer 3 (Guild & Module Availability, fail-closed): the guild is known and the moderation module is active for it — continue. Layer 4 (Channel Restriction): no channel restriction applies in this channel — continue. Layer 5 (Discord Permission Bitfield): the member holds BAN_MEMBERS — continue. Layer 6 (RBAC Rank, pure backend function): the member's live Discord state resolves to MODERATOR, which satisfies the command's declared requirement — and Layer 5 and Layer 6 are evaluated conjunctively: both must hold. Layer 7 (Grant Override): the guild has no grant — permit, blacklist, whitelist, cooldown, or rate-limit — targeting this member for this command, so the default outcome stands: allow. The Permission Resolver passes the request onward.

#### 87.9 Middleware Pipeline — Layer 3: Rate Limiter

Layer 3 is the Rate Limiter. It checks the command's rate limit: cooldown of 10 seconds per user. The Rate Limiter queries Redis for the key "dumby:ratelimit:cooldown:moderation.ban:{user_id}." The key does not exist (the user has not invoked this command recently). The Rate Limiter sets the key with a TTL of 10 seconds and passes the request to the next middleware.

#### 87.10 Middleware Pipeline — Layer 4: Input Validator

Layer 4 is the Input Validator. It validates the command options against the command's Zod schema. The user option (123456789) is validated as a valid Discord user ID (a Snowflake — a 64-bit integer). The reason option ("Spamming in multiple channels") is validated as a string within the maximum length (500 characters). The InputSanitizer processes the reason: HTML entity encoding (no HTML entities found), SQL injection detection (no SQL patterns found), Discord markdown limiting (no problematic markdown found), URL validation (no URLs found), and length limiting (within limits). The Input Validator passes the validated options to the next middleware.

#### 87.11 Middleware Pipeline — Layer 5: Audit Logger

Layer 5 is the Audit Logger. It creates an audit log entry in the audit_logs table: guild_id, action ("command.moderation.ban"), actor_id (the invoking user's ID), target_id (the target user's ID), reason ("Spamming in multiple channels"), timestamp, and metadata (the command options). The Audit Logger does not reject requests — it always calls next.

#### 87.12 Middleware Pipeline — Module Handler

The moderation module's ban command handler is invoked with the interaction context. The handler executes the following business logic.

First, the handler fetches the target user from the cache (L1 cache hit — the user was cached during a previous interaction). The handler checks if the target user is bannable (the bot's role hierarchy is above the target user's highest role — it is). The handler calls the Discord REST API to ban the user: PUT /guilds/{guild_id}/bans/{user_id} with the reason. The REST client sends the request with the bot token in the Authorization header.

Discord processes the ban request. If the ban succeeds, Discord returns a 204 No Content response. If the ban fails (e.g., the bot lacks permissions, the target user is an admin), Discord returns a 403 Forbidden response with an error message.

The handler never constructs a payload — classic embeds are banned outright (§4) — it returns a schema-conformant success declaration: the outcome, the target user, the reason, and the response's mode (§20.8). The declaration is handed back to the pipeline.

#### 87.13 Middleware Pipeline — The Renderer

The Renderer receives the handler's declared response. It validates the declaration against the command's declared schema, fills the static Components v2 grammar (frame, divider, title/subtitle, footer) and the dynamic slots (accent — the official blurple #5865F2, ADR-010; banner; module identity for the moderation module; content from the declaration), and edits the buffer embed that has been holding the interaction since receipt (§20.9) into the final Components v2 render: POST /interactions/{interaction_id}/{interaction_token}/callback edits the deferred buffer into the finished payload. Had the handler failed, the buffer would instead be edited into the formal notice frame with a reason code and this interaction's trace correlation ID.

#### 87.14 Discord Displays the Response

Discord receives the callback response. It displays the embed in the channel where the command was invoked. The user sees the "User Banned" embed with the target user's name and the reason.

#### 87.15 Post-Processing

After the response is sent, the following post-processing occurs. The dumby_command_duration_seconds histogram is updated with the total duration (from interaction receipt to response submission). The dumby_commands_total counter is incremented with labels: command ("ban"), module ("moderation"), status. The interaction context is discarded (it is not cached — interaction contexts are single-use). The audit log entry is visible in the Interface Hub's audit log panel. The command appears in the user's interaction history (if analytics is enabled).

#### 87.16 The Complete Timeline

The entire interaction takes approximately 50-100 milliseconds from the moment the GatewayClient receives the event to the moment the response is submitted to Discord. The breakdown is: GatewayClient decompression and parsing (1 millisecond), EventDispatcher routing (1 millisecond), InteractionRouter lookup (1 millisecond), middleware pipeline layers 1-5 (5-10 milliseconds), module handler execution (20-50 milliseconds — including the Discord REST API call to ban the user), response formatting and submission (5-10 milliseconds), and post-processing (1-2 milliseconds). The Discord REST API call to ban the user is the longest single operation (20-40 milliseconds depending on Discord's API latency).

---

## 18. Event Architecture & Bus System

**Status:** [SPEC]

### 18.1 Two Distinct Event Systems — Not to Be Conflated

```
TABLE 18-A — Gateway Events vs. Internal Domain Events

┌────────────────────┬─────────────────────────────┬──────────────────────────┐
│ │ Gateway Events │ Internal Domain Events │
├────────────────────┼─────────────────────────────┼──────────────────────────┤
│ Source │ Discord (via discord.js's │ Any module's own service │
│ │ Client) │ code │
│ Routed by │ EventRouter │ InternalEventBus │
│ Naming │ discord.js's own event names │ {domain}.{entity}.{action} │
│ │ (messageCreate, guildBanAdd, …) │ (moderation.user.banned, …) │
│ Consumers │ Module-registered IEventHandler │ Any module's subscriber │
│ │ classes │ │
│ Guild-scoped dispatch │ Checked against │ Not automatically checked — │
│ gate │ guild_module_states, same as │ a subscriber that cares about │
│ │ commands (§13.4) │ per-guild state checks it │
│ │ │ itself, since not every │
│ │ │ internal event even has a │
│ │ │ single associated guild │
└────────────────────┴─────────────────────────────┴──────────────────────────┘
```

### 18.2 Gateway Event Handler Interface

```
TABLE 18-B — IEventHandler Fields

┌───────────┬───────────────────────────────────┬──────────────────────────┐
│ Field │ Type │ Notes │
├───────────┼───────────────────────────────────┼──────────────────────────┤
│ event │ keyof ClientEvents │ e.g. 'guildBanAdd' │
│ once │ boolean │ default false │
│ handle │ async (...args: ClientEvents[E]) => void │ required │
└───────────┴───────────────────────────────────┴──────────────────────────┘
```

### 18.3 EventRouter Dispatch

`EventRouter` maintains `Map<eventName, IEventHandler[]>`, aggregated from every
enabled module's manifest `events` array during Stage 14. On any registered gateway
event firing, it resolves the guild (where the event carries one) and, for each
registered handler, checks that handler's owning module's `guild_module_states`
before invoking it — a `messageDelete` handler belonging to a disabled logging module
never fires for that guild, exactly as a disabled module's commands never dispatch.
Events with no single associated guild (`shardDisconnect`, `shardReconnecting`, a
DM-channel event) skip this check and invoke every registered handler unconditionally.

`EventRouter` and the event-loop lag monitor are constructed and started as part
of bootstrap — Stage 09 wires the router together with its per-module handler
map, and Stage 16 binds it to the live client — so there is no configuration in
which gateway events arrive with no router (or no lag monitor) running behind
them.

Every handler invocation is wrapped in its own try/catch, exactly as the middleware
pipeline's root error boundary wraps command execution (§19.4) — one module's handler
throwing never prevents any other module's handler for the same event from running.
This is module isolation (§11.6) applied to the event path specifically.

```
DIAGRAM 18-A — One Gateway Event, Multiple Independent Handlers

 Discord: guildBanAdd fires
 │
 ▼
 EventRouter looks up handlers registered for 'guildBanAdd'
 │
 ┌────┼─────────────────┬──────────────────────┐
 ▼ ▼ ▼ ▼
 Moderation module's Logging module's Analytics module's
 handler (writes case handler (posts to handler (increments
 record if this ban configured log a ban-count metric) —
 wasn't already logged channel) — independent independent try/catch
 by /ban itself) try/catch
 │ each check its own module's guild_module_states before running;
 │ each wrapped independently — a throw in one never blocks the others
```

### 18.4 InternalEventBus — Typed Cross-Module Pub/Sub

```
CODE REFERENCE 18-A — InternalEventBus API Shape

interface IEventBus {
 emit<K extends keyof EventCatalog>(event: K, payload: EventCatalog[K]): void;
 on<K extends keyof EventCatalog>(event: K, listener: (payload: EventCatalog[K]) => void | Promise<void>): void;
 off<K extends keyof EventCatalog>(event: K, listener: Function): void;
}
```

`EventCatalog` is a global type built by merging every loaded module's manifest
`eventsCatalog` declarations — meaning `emit` and `on` are both compile-time
checked against the payload shape a module actually declared publishing, and a typo in
an event name is a TypeScript error, never a silently-ignored runtime no-op.

**Execution model.** `emit` invokes every registered listener synchronously, in
registration order — each listener is called within the same tick as `emit` itself.
It does **not**, however, await any listener's return value: a listener declared
`async` begins executing up to its first `await`, at which point control returns to
`emit`, which proceeds to the next listener and then returns to its caller — it
never waits for any listener's promise to settle. The bus is therefore synchronous
with respect to *invocation order* and fire-and-forget with respect to *completion*. A
listener that throws synchronously, or whose returned promise later rejects, has that
error caught and logged by the bus itself — tagged with the event name and the
subscribing module — never propagated back to the emitting call and never capable of
affecting the emitter's own control flow. This is why §12.5's worked example enqueues
a job from inside a listener rather than awaiting anything from `emit` directly: the
emitting service is finished the instant `emit` returns, regardless of how long the
listener's own async work takes to finish. The bus additionally exposes
`emitSync`, which awaits each listener sequentially and surfaces the first
failure to its caller — reserved for ordering-critical flows (the config-change
cascade and the shutdown sequence are its only sanctioned uses), while every
other emitter uses the default fire-and-forget `emit`. A guard test exercises
the default path with a throwing test listener registered ahead of a healthy
one: the throw is contained and logged, and the healthy listener still runs —
subscriber isolation is a tested invariant of the bus, not a convention.

### 18.5 Cycle Detection — Bounded Emit Depth

A listener that itself emits an event, whose own listener emits the original event
again, would recurse indefinitely without a guard. `InternalEventBus` tracks emit
depth per logical emit-chain (not globally — two unrelated top-level emits each start
their own chain at depth 0) and enforces `EVENT_BUS_MAX_EMIT_DEPTH`, defaulting to
`20`. Exceeding it throws `EventCycleError`, carrying the full chain of event names
that produced the overflow, logged at `error` level with the originating module
identified — breaking the cycle deterministically rather than allowing a stack
overflow to crash the process.

### 18.5.3 Early-Refresh Cache Path — Unwired (Phase 1 ~80%)

The 18-stage bootstrap sequence, DI container, schema validation, and L1/L2 cache layer are solid at approximately 80% completion. The remaining gap is the early-refresh cache path: the cache lifecycle does not include an early-refresh mechanism that proactively refreshes cache entries before TTL expiry, leaving a window where expired entries cause synchronous cache misses. The specification requires an early-refresh stage wired into the cache lifecycle at the correct bootstrap stage, refreshing entries asynchronously before expiry to eliminate the miss window.
### 18.5.2 onUnload Cleanup — Author Discipline vs Framework Guarantee

DI scoping and the Module Contract exist, but `onUnload` cleanup currently relies on module author discipline — the framework does not auto-clean resources (timers, event subscriptions, cache entries) when a module is unloaded. If a module author forgets to release resources in `onUnload`, those resources leak. The specification requires framework-level auto-cleanup: on unload, the framework automatically cancels any `ITimerService` timers the module registered, unsubscribes its `EventBus` listeners, and invalidates its `CacheManager` entries — regardless of whether `onUnload` is implemented correctly.
### 18.5.1 Personas Subsystem — Registration and Dispatch Wiring

The personas subsystem (`PersonaCommandBindingService` and its supporting tables
`persona_identities`, `guild_persona_bindings`) is wired end to end: the service is
registered in `src/bootstrap/bootstrap.ts`, persona identities load during startup
(the bound Persona's process boots against `PERSONA_ID`), and command-key bindings
resolve through the single command system. Persona creation runs through the Twixter
registration API (§35.5) — the MDIS-only wording is superseded (ADR-011, docs/adr/) —
and dispatch enforces the "occupied by another persona" gate: a command key already
registered by one Persona is rejected ephemerally for a different Persona rather than
silently overridden.

### 18.6 The Event Catalog as a Contract

A module's manifest `eventsCatalog` field is not optional documentation — it is
the authoritative, machine-checked declaration of every domain event that module
may emit, and the *payload shape* of each declared event is part of the contract:
every catalog entry declares a Zod payload schema, and a change from
`{ userId, guildId, reason }` to `{ banId, userId, guildId }` is a
backward-incompatible payload change that requires a major-version bump (§42.2),
not a passing check. Three things depend on it being accurate: the `EventCatalog`
type merge described in §18.4, which makes an undeclared event's payload untyped
(and therefore a TypeScript error for any subscriber trying to use it
meaningfully); a build-time lint rule (`require-eventsCatalog-entry`, §38.4) that
fails the build when an `eventBus.emit` call's event name or payload shape does not
match the declared catalog schema — and rejects any module event declared or
emitted under the reserved `dumby.` prefix, which is reserved for core emissions
— and the community submission review's Gate 4 (§16.4), which cross-checks
emitted events against declared ones for any third-party module. Enforcement is
completed at runtime by the module-scoped bus wrapper (§31.4.1), which validates
membership and payload on every emit, and at upload time by the Swastik static
analyzer's `catalogConsistency` report. Keeping `eventsCatalog` current is, in
effect, the same obligation as keeping a public API's documentation current — for
internal event consumers, it is the API.

#### Design Consideration — eventsCatalog Backward-Compat Enforcement

`eventsCatalog` payload changes should be required to be backward-compatible, or force a major-version bump, enforced by a lint rule / schema-version check (§18.6 catalog, §38.4 ESLint). This prevents silent subscriber breakage when a producer module evolves its event payloads. Impact: High; Feasibility: Medium.

### 18.7 Complete Event Processing Trace — Step by Step

This section provides the definitive, step-by-step trace of a Discord gateway event from the moment Discord sends it to the moment all subscribers have processed it.

#### 88.1 The Discord Event

A new member joins a guild where the bot is present. Discord's servers detect the member join and construct a GUILD_MEMBER_ADD gateway event. The event payload includes: the guild ID, the member object (user ID, username, discriminator, avatar, roles, joined_at timestamp, nick, premium_since), and the event timestamp.

Discord sends this event to the bot's gateway connection as a zlib-compressed WebSocket frame.

#### 88.2 GatewayClient Receives the Event

The GatewayClient receives the WebSocket frame. It decompresses the zlib payload. It parses the JSON payload. It extracts the opcode (0 — DISPATCH), the sequence number, the event name (GUILD_MEMBER_ADD), and the event data. It updates the internal sequence number counter. It passes the event name and data to the EventDispatcher.

#### 88.3 EventDispatcher Routes the Event

The EventDispatcher receives the GUILD_MEMBER_ADD event. It determines the event namespace (guild.memberAdd). It looks up all subscribers for this namespace. The following modules have subscribed to this event: the Welcome module (Standard tier, priority 10), the Logging module (Standard tier, priority 10), the Leveling module (Standard tier, priority 10), the Auto-Mod module (Standard tier, priority 10), and the Anti-Raid module (Standard tier, priority 10). No Admin or Core tier modules have subscribed to this event.

#### 88.4 Event Delivery — Welcome Module

The EventDispatcher creates an event context and delivers it to the Welcome module's handler. The Welcome module's handler receives the event context. It reads the guild's configuration from the ConfigManager (cached in L1 — 0.5 milliseconds). It checks if the Welcome module is enabled in this guild (it is). It reads the welcome message template from the configuration ("Welcome, {user}, to {guild}!"). It translates the template using the I18nService (cached in L1 — 0.5 milliseconds). It reads the welcome channel ID from the configuration. It sends the welcome message to the welcome channel via the REST API: POST /channels/{channel_id}/messages with the translated message. The REST call takes approximately 30 milliseconds. The handler completes.

#### 88.5 Event Delivery — Logging Module

The EventDispatcher delivers the event to the Logging module's handler. The Logging module's handler receives the event context. It reads the guild's logging configuration (cached in L1). It determines that member join events should be logged. It creates a log embed (green color, "Member Joined" title, member name and ID in the description). It sends the embed to the logging channel via the REST API. The REST call takes approximately 30 milliseconds. The handler completes.

#### 88.6 Event Delivery — Leveling Module

The EventDispatcher delivers the event to the Leveling module's handler. The Leveling module's handler receives the event context. It checks if the member already exists in the leveling database (the member just joined, so they likely don't). It creates a new leveling record for the member in the database: user_id, guild_id, xp=0, level=0, last_message_timestamp=null. The database insert takes approximately 10 milliseconds. The handler completes.

#### 88.7 Event Delivery — Auto-Mod Module

The EventDispatcher delivers the event to the Auto-Mod module's handler. The Auto-Mod module's handler receives the event context. It checks the member's account age (created_at timestamp from the member object). If the account is less than 7 days old, it flags the member for monitoring (records the flag in the database). The handler completes.

#### 88.8 Event Delivery — Anti-Raid Module

The EventDispatcher delivers the event to the Anti-Raid module's handler. The Anti-Raid module's handler receives the event context. It increments a join counter in Redis (key: "dumby:antiraid:joins:{guild_id}:{minute}" with a 60-second TTL). It checks if the join count exceeds the raid threshold (e.g., 10 joins per minute). If it does, it triggers the raid protection protocol (alerts the guild owner, enables slow mode, optionally kicks new members). In this case, the join count is 1 — below the threshold. The handler completes.

#### 88.9 Post-Processing

After all subscribers have processed the event, the following post-processing occurs. The event_delivery_duration_ms histogram is updated with the total duration for each subscriber. The event_delivered_total counter is incremented for each subscriber. If any subscriber threw an error, the error is logged and the subscriber's error counter is incremented. The event is discarded (it is not cached — gateway events are not persisted).

#### 88.10 The Complete Timeline

The entire event processing takes approximately 100-200 milliseconds from the moment the GatewayClient receives the event to the moment all subscribers have completed. The breakdown is: GatewayClient decompression and parsing (1 millisecond), EventDispatcher routing (1 millisecond), and subscriber handler execution (20-50 milliseconds per subscriber, executed sequentially in priority order). The total is the sum of all subscribers' execution times (since they are delivered sequentially), which is approximately 100-200 milliseconds for five subscribers.

For high-volume events (e.g., MESSAGE_CREATE in an active guild), the EventDispatcher processes events in parallel across shards, ensuring that one shard's events do not block another shard's events. Within a single shard, events are processed sequentially to maintain ordering guarantees.

---

## 19. Middleware Pipeline & Interceptors

**Status:** [SPEC]

### 19.1 The Onion Model

Every command execution passes through a composed chain of middleware before reaching
`Command.execute`, structured as nested layers — the classic "onion" composition
where each layer wraps the next, calling `next` to proceed inward and running any of
its own post-processing logic on the way back out once `next` resolves.

**Fixed priority ordering.** Middleware executes in a fixed order from priority -20 to 90: MaintenanceMode, AdminTierGate, Trace, Auth, GuildConfig, Locale, RateLimit, Permission, RBAC, Cooldown, Defer, Analytics (`middleware-pipeline.ts`). The pipeline is built once during bootstrap, at Stage 09 (PIPELINE_WIRING):
`bootstrap()` constructs `MiddlewarePipeline`, registers all twelve built-in
stages in the canonical priority order above, and injects the composed executor
into `CommandRouter` ahead of Stage 12 module load — no dispatch path exists that
bypasses the chain. A structural wiring test runs in CI: it boots a bare
pipeline and asserts every built-in stage is present exactly once in priority
order, and asserts `CommandRouter` resolves its executor from the composed chain
— a stage that goes unwired fails the build rather than failing silently in
production. The rate-limiter and
cooldown counters live in Redis (the atomic check-and-increment of §21.5), shared
across every replica, never in per-process memory.

The seven-layer permission engine provides a unified permission model across the entire feature surface (versus per-command checks): bot-owner override, blacklist, guild/module availability, channel restriction, Discord native bitfield, RBAC role, and explicit grant override, over a six-role hierarchy. The target adds exhaustive test coverage of each layer's accept/reject path.

- Spec: 7 layers — bot-owner override, blacklist, guild/module availability (fail-closed), channel restriction, Discord native bitfield, RBAC rank (Layer 6, pure backend function), grant override (Layer 7, guild-side grants). Six-rank ladder (OWNER > ADMIN > MOD > HELPER > MEMBER > RESTRICTED) inclusive upward; ADMIN/MOD/HELPER are fixed permission-bit bundles; RESTRICTED is the automatic floor; default requirement MEMBER; Layer 5+6 declarations combine conjunctively. Layer 7 grants: permit/blacklist/whitelist/cooldown/rate-limit. Deliberate asymmetry: destructive-access layers fail closed (deny), access-refining layers fail open (allow). Dual-window rate limiting (per-user + per-guild) + per-command cooldowns via atomic Redis check-and-increment.

- Maintain as-is; add exhaustive test coverage for each layer's accept/reject path.

```
DIAGRAM 19-A — Onion Composition

 ┌─ Maintenance Mode ─────────────────────────────────────────────┐
 │ ┌─ Admin Gate ─────────────────────────────────────────────┐ │
 │ │ ┌─ Trace ─────────────────────────────────────────────┐ │ │
 │ │ │ ┌─ Auth ─────────────────────────────────────────┐ │ │ │
 │ │ │ │ ┌─ .. (Guild Config, Locale (I18nManager registered in CORE_TOKENS, resolution: guild → user → en-US), Rate Limit, │ │ │ │
 │ │ │ │ │ Permission, RBAC, Cooldown, Defer, │ │ │ │
 │ │ │ │ │ Analytics, module/command-scoped) .. │ │ │ │
 │ │ │ │ │ ┌───────────────────────┐ │ │ │ │
 │ │ │ │ │ │ Command.execute │ │ │ │ │
 │ │ │ │ │ └───────────────────────┘ │ │ │ │
 │ │ │ │ └───────── .after runs on the way back out ────┘ │ │ │
 │ │ │ └───────────────────────────────────────────────────┘ │ │
 │ │ └───────────────────────────────────────────────────────┘ │
 │ └───────────────────────────────────────────────────────────┘ │
 └───────────────────────────────────────────────────────────────┘

 Any layer can call reject(reason) instead of next — execution short-circuits
 outward immediately; only that layer's own .after (if any) and the outermost
 cleanup run. A deeper layer, and Command.execute itself, never runs.
```

### 19.2 Built-In Middleware Stages — Complete Reference

Priority is a signed integer; lower numbers run first (outermost). Ties resolve in
manifest-declaration order.

> **Leak vector:** An `await` on an external API that never resolves holds
> the entire async context and the module's lexical scope indefinitely.
> AbortController/timeouts on module async operations are specified but
> not yet enforced — this is one of five documented hot-swap leak vectors.

> **PEP Endpoint Count:** The PEP (Power Engine Panel) exposes 17 control domains across its API surface. Earlier documentation cited inconsistent counts (14 in compliance README, 17 in API docs, 36 in one audit). The authoritative count is 17 control domains; the endpoint table in §7 and the compliance matrix in §45 must both reflect this single accurate figure.

```
TABLE 19-A — Built-In Stages

┌──────┬───────────────────────┬─────────────────────────────────────────────┐
│Prior.│ Middleware │ Behavior on Failure / Abort │
├──────┼───────────────────────┼─────────────────────────────────────────────┤
│ -20 │ MaintenanceModeMiddleware │ Global maintenance flag set → every command │
│ │ │ short-circuits with a maintenance-notice reply │
│ │ │ (§28.6), except a small allow-list of │
│ │ │ Admin-tier commands that manage maintenance │
│ │ │ mode itself │
│ -10 │ AdminTierGateMiddleware │ Admin-tier only. Owner check fails → SILENT │
│ │ │ reject, no reply, warn-level log (§13.6 Layer │
│ │ │ 2) │
│ 0 │ TraceMiddleware │ Opens the root span, generates │
│ │ │ correlationId, binds the child logger. Never │
│ │ │ aborts. │
│ 10 │ AuthMiddleware │ Resolves interaction.user into an internal │
│ │ │ user record; guildOnly command from a DM → │
│ │ │ reject with a "server only" ephemeral reply │
│ 20 │ GuildConfigMiddleware │ Loads per-guild config (§6.4's cascade) into │
│ │ │ context.guildConfig. A load failure degrades │
│ │ │ to defaults rather than aborting — a config │
│ │ │ outage never blocks every command guild-wide │
│ 30 │ LocaleMiddleware │ Binds context.locale from guild config or │
│ │ │ Discord's own locale hint. Never aborts. │
│ 40 │ RateLimitMiddleware │ Atomic Redis check-and-increment (§21.5). │
│ │ │ Over limit → reject with a cooldown-remaining │
│ │ │ ephemeral reply │
│ 50 │ PermissionMiddleware │ Discord bitfield check — permission engine │
│ │ │ Layer 5 (§21.2). Fails → reject, ephemeral │
│ │ │ "missing permission" reply naming the specific │
│ │ │ permission │
│ 60 │ RBACMiddleware │ Dumby role check — Layer 6 (§21.2). Skipped │
│ │ │ entirely for Core-tier commands (§13.2). Fails │
│ │ │ → reject, ephemeral reply │
│ 70 │ CooldownMiddleware │ Per-user-per-command cooldown, distinct from │
│ │ │ the guild/user rate limiter above. Fails → │
│ │ │ reject with remaining-time reply │
│ 80 │ BufferMiddleware │ Issues the buffer embed on every │
│ │ │ interaction (§20.9), then edits it into the │
│ │ │ final render or the formal notice frame. │
│ │ │ Never aborts. │
│ 90 │ AnalyticsMiddleware │ Records invocation start. Never aborts. │
│ 100+ │ Module-global middleware │ Manifest-declared, global: true — applies │
│ │ │ to every command in every module, not just │
│ │ │ its own │
│ 200+ │ Command-scoped middleware │ Declared on the individual command's own │
│ │ │ middleware array │
└──────┴───────────────────────┴─────────────────────────────────────────────┘
```

> **Webhook signature verification gap:** no webhook-signature middleware exists.
> An HMAC-SHA256 verifier with a replay-protection window is specified but not
> built — routes must refuse to register without a verifier.

### 19.3 Custom Middleware Authoring

```
CODE REFERENCE 19-A — BaseMiddleware Shape

abstract class BaseMiddleware {
 abstract priority: number;

 abstract execute(
 context: CommandContext,
 next: => Promise<void>,
 ): Promise<void>;

 // Optional — runs on the way back out, only if next was called and
 // resolved (i.e. never runs if this layer or a deeper one rejected)
 async after?(context: CommandContext): Promise<void>;
}

// Example: a module-scoped middleware enforcing a feature flag
class RequiresPremiumMiddleware extends BaseMiddleware {
 priority = 150;

 async execute(context: CommandContext, next: => Promise<void>) {
 if (!context.guildConfig.premiumEnabled) {
 throw new PermissionDeniedError('REQUIRES_PREMIUM');
 }
 await next;
 }
}
```

A middleware never calls `next` more than once, and never mutates
`CommandContext` fields it does not own (a module-scoped middleware writes only to
`context.metadata`, never to a core-populated field like `context.rbacRole`) — both
constraints are enforced by lint rule rather than left to convention.

### 19.4 The Root Error Boundary

`MiddlewarePipeline` wraps the entire onion — every built-in stage, every
module-global and command-scoped middleware, and `Command.execute` itself — in one
outermost try/catch, the single place any error occurring anywhere in a command's
execution is guaranteed to be caught.

```
DIAGRAM 19-B — Error Boundary Decision Tree

 An error is thrown or a Promise rejects, anywhere in the pipeline
 │
 ▼
 Is it a recognized DumbyError subclass? (§28.1)
 │
 ┌────┴────┐
 YES NO
 │ │
 ▼ ▼
 Use its declared Treat as UNEXPECTED:
 user-facing message • Log at 'error' with full
 and HTTP-equivalent stack trace and context
 status code • Generic "Something went
 │ wrong" ephemeral reply —
 │ never a raw stack trace or
 │ internal message shown to
 │ the user
 │ • Increment
 │ dumby_errors_unexpected_total
 ▼ ▼
 Reply to the interaction (edit the deferred reply if
 DeferMiddleware already ran; otherwise a fresh ephemeral reply)
 │
 ▼
 TraceMiddleware's .after closes the span with an error status
 AnalyticsMiddleware's .after records the failed outcome
 │
 ▼
 Command execution ends — the process itself is never at risk from a
 command-level error; only unhandledRejection/uncaughtException (§9.4)
 threaten the process, and the boundary here is specifically what keeps
 ordinary command errors from ever reaching that level
```

This boundary is what makes Principle P4's "recover gracefully at runtime" concrete at
the request level: a module author never writes their own top-level try/catch around
an entire command purely to avoid leaking a stack trace to a user, because the pipeline
already guarantees that outcome for every command in the system uniformly.

### 19.5 PEP "Freedom by Default" — Principle vs Capacity Alignment

The Policy Enforcement Point (PEP) operates on a "freedom by default" practice: controls exist in the middleware pipeline (§19.1–19.2), but the framing of which controls are mandatory versus optional is incomplete. The principle states that modules should be free to operate unless explicitly restricted, but the capacity to enforce restrictions (e.g., rate limiting, feature flags, tier-based caps) is not fully documented as aligned with this principle. The specification requires the PEP principle and enforcement capacity honestly aligned: each control layer in the middleware pipeline is documented as either always-on (capacity constraint) or configurable (principle-driven), with the "freedom by default" framing applied only to configurable layers.
### 19.6 Three-Scope Config Model — Process-Module Scope Missing

The configuration system currently defines two scopes: core (global framework config) and guild (per-guild config). A formal process-module scope — where each module's `{MODULE_NAME}_*` environment variables are validated against the module's own manifest config schema — does not exist as a distinct scope. Module-level configuration is currently handled ad hoc through env vars without a formal scope boundary. The specification requires three distinct config scopes: core, guild, and process-module, each with its own validation, lifecycle, and access boundaries.

- ** CommandRouter dispatching via the 12-stage middleware pipeline.

CommandRouter dispatches every interaction through the 12-stage middleware pipeline and resolves PermissionResolver as a mandatory stage of every dispatch.

Flag the onion executor.

The onion executor is used by the live command router.

Catalog the discord.js native response methods that modules call on the interaction object.

Command handlers declare their responses; the Renderer issues every Discord reply (§20.8). The interaction object handed to `execute` is read-only for data access (options, user, guild) — response methods are never called by module code.

In the SDUI proposal, CommandRouter takes the returned UIResponse object, runs it through the Dumby UI Compiler (validate Zod → build Discord payload → handle deferral/ephemeral → inject branding).

CommandRouter takes the response object a command returns and runs it through the core Renderer: validate against the declared command schema, build the Discord Components v2 payload, handle deferral/ephemerality, and apply the standard frame (§20.8).

Failure containment relies on per-handler isolation: every handler invocation runs inside an independent error boundary in both `CommandRouter` and `EventRouter`, so a throwing handler is contained to that single invocation — the process and all other modules keep running.

- `required: false` flag, per-handler try/catch in the event router, hot-swap rollback mechanism, worker-thread isolation and error boundaries.

- Maintain all containment primitives; never allow a module to bypass the error boundary.

Memory leak threat model, five vectors: (1) hot-reload zombies (uncleared `setInterval`), (2) silent event-bus subscribers, (3) BullMQ worker retention, (4) L1 cache orbiters, (5) orphaned closures retained by long-lived core references. Each vector is addressed by Layer 2 prevention mechanisms (ITimerService, InternalEventBus, CacheManager, QueueManager).

- Five vectors identified: (1) Hot-Reload Zombie (uncleared setInterval), (2) Silent Event Bus Subscribers, (3) BullMQ Worker Retention, (4) L1 Cache Orbiters, (5) Async Hanging Promises.

- Each vector addressed by Layer 2 prevention mechanisms.

> **Admin Route Naming Standard:** PEP admin routes in `http/routes/admin.routes.ts` must use consistent REST-style naming aligned to the 17 documented control domains (`guild.unsuspend`, `module.unsuspend`, `developer.unsuspend`, `command.suspend`, `command.unsuspend`, `persona.suspend`). Backward-compatible route aliases should be provided where existing camelCase action names are renamed.

A new MDIS backend realizes compliance feature #20: the manifest's optional `dashboardSchema` field is rendered into a per-module configuration UI served to a web dashboard.

**Mechanism:** `src/mdis/` exposes admin routes that read each module's `dashboardSchema` (declared in `modules/manifest.schema.ts`), serve the JSON Schema to the dashboard, and persist submitted guild-config values. Permissions flow through the single permission engine (bot + web).

**
**Dependency:** Redis-backed state.
**Compliance:** feature #20.

## 20. Interaction & Component Handling

**Status:** [SPEC]

### 20.1 The Component Registry & Custom ID Encoding

Buttons, select menus, and modals are stateless from the framework's perspective —
Discord does not correlate a component interaction back to the command invocation that
created it. Routing depends entirely on the component's `custom_id`, a string field
Discord caps at 100 characters, so `InteractionRegistry` encodes routing information
into a compact, structured scheme rather than relying on server-side session state:

```
CODE REFERENCE 20-A — Custom ID Scheme

 {moduleNamespace}:{handlerKey}:{contextPayload}

 Example: "moderation:case-close:c_4f81a2"
 │ │ │
 │ │ └─ short opaque reference (a case ID, an
 │ │ index — never a full JSON blob; large
 │ │ context is looked up from the database
 │ │ using this reference, not encoded inline)
 │ └─ identifies which registered handler class parses
 │ the payload and executes
 └─ owning module — InteractionRegistry routes by this prefix
 before any handler-specific parsing happens

 Action ID ownership belongs to the Core InteractionRegistry: module authors no
longer encode custom IDs on buttons/components themselves. The registry mints,
encodes, and owns every `custom_id`, dispatching prefix-based to a handler's
parse/execute functions. This centralises component routing and prevents
custom_id collisions across modules.
```

Encoding a database reference rather than the full state keeps every `custom_id` well
under Discord's limit regardless of how much context a component's action logically
needs, and — just as importantly — means a component's behavior always reflects the
database's *current* state at click time rather than a stale snapshot serialized when
the component was first rendered, which matters whenever the underlying data (a case's
status, a poll's vote tally) can change between when a message is sent and when a user
eventually interacts with it.

**Design consideration — core-owned semantic action routing:** the registry should support a semantic action routing scheme in which Core prefixes each `actionId` with `module:guild:userId:hash` (fitting Discord's 100-character `custom_id` limit), routes via `InteractionRegistry`, and enforces button-click idempotency in Redis. Standardizing component routing and idempotency at the Core keeps individual modules from re-implementing ad-hoc custom_id parsing and duplicate-click protection.

### 20.2 Buttons & Select Menus

Button and select-menu handlers register through the same manifest surface as
commands — a class implementing `IComponentHandler`, listed in a module's manifest —
and pass through a reduced slice of the middleware pipeline: `TraceMiddleware`,
`AuthMiddleware`, `GuildConfigMiddleware`, and `LocaleMiddleware` always run;
`RateLimitMiddleware`, `PermissionMiddleware`, and `RBACMiddleware` run only when the
handler explicitly opts in, since not every component click represents a privileged
action worth the same scrutiny as a slash command invocation. `CooldownMiddleware`
never applies to components — Discord's own per-interaction throttling already bounds
click frequency, and a component-specific cooldown would need session state the
stateless routing model above deliberately avoids.

Buttons, selects, modals, and autocomplete all dispatch through
`InteractionRegistry` on a `custom_id` the registry itself minted (§20.1) — a
component whose `custom_id` was not minted by the registry is dropped as
untrusted input, never routed. Registry dispatch is idempotent per interaction:
the interaction ID is recorded in Redis with a bounded TTL, and a duplicate
submission of the same ID returns the original outcome instead of re-executing
the handler — double-clicks and Discord retries never double-execute a
component action. The invoker re-check (§20.3) runs inside registry dispatch for
every component whose `custom_id` encodes an invoker binding, before the
handler sees the interaction.

### 20.3 Authorization Re-Check on Component Interactions

A button rendered in a message is visible, and clickable, by anyone who can see that
channel — not only the user the original command was invoked by. Any component whose
action should be restricted to the original invoker, or to a specific role, re-checks
that authorization explicitly inside its own `execute`, using the same
`PermissionResolver` the command pipeline itself calls (§21), rather than assuming the
component's mere existence implies the clicking user is authorized. This is a
mandatory pattern for any moderation-relevant or destructive component action — a
"Confirm Ban" button's handler independently re-verifies the clicking user holds
moderation permission, since Discord itself enforces nothing about who is allowed to
click a button once it has been rendered.

### 20.4 Modals

Modal submissions (`ModalSubmitInteraction`) follow the identical registry and
`custom_id` scheme as buttons and selects, with one platform-driven difference: a
modal is shown in direct response to an interaction — a button click, most commonly —
so a module opening one never defers first; deferral and a modal display are mutually
exclusive within the same interaction response.

### 20.5 Autocomplete

An option declaring `autocomplete: true` in its `SlashCommandBuilder` definition
routes to the handler function registered under that option's name in the command's
`autocomplete` map (§17.2). Discord's platform gives an autocomplete handler a strict,
short response window, which is why autocomplete implementations are expected to read
from cache — typically the same L1/L2 cascade config reads already use (§25) — rather
than issuing a fresh database query on every keystroke; the framework's autocomplete
dispatcher enforces an internal 800-millisecond budget (`AUTOCOMPLETE_BUDGET_MS`,
default 800) on every autocomplete invocation — well inside Discord's 1-second
window: a handler that has not produced suggestions by the budget's expiry has
its in-flight result discarded and an empty list is returned in its place, so
the interaction always receives a well-formed response inside the platform
window rather than risking it closing with no response at all.

### 20.6 Pagination Pattern

Multi-page embed content (a paginated `/history` result, a leaderboard) follows a
shared pattern rather than each module reinventing navigation: a `Paginator` utility
in `src/shared/utils/` accepts a data-fetching function and a page size, renders
Previous/Next buttons whose `custom_id` encodes the target page number and the
original query's parameters (never the full result set), and re-queries the
underlying data fresh on every page turn using the encoded parameters. Nothing about a
paginated view is held in server-side session memory between clicks — the same
stateless philosophy as §20.1's routing scheme applies to pagination specifically,
which is also why a paginated view naturally reflects any data change that happened
between page turns, rather than showing a snapshot frozen at the moment the first page
was rendered.

### 20.7 Advanced Interaction Patterns

#### 84.1 Multi-Step Command Flows

Many commands require multiple steps to complete — a configuration wizard, a moderation action with confirmation, or a multi-step setup process. Dumby provides several patterns for implementing multi-step flows.

The button-based flow uses buttons for step navigation. The module sends an embed with buttons (Next, Previous, Cancel). Each button click triggers a MESSAGE_COMPONENT interaction, which the ComponentHandler routes to the module's component handler. The handler updates the embed with the next step's content and new buttons. The flow state (current step, collected data) is stored in Redis with a 5-minute TTL. This pattern is suitable for short flows (3-5 steps) where each step is simple.

The select-menu-based flow uses select menus for data collection. The module sends an embed with a select menu (e.g., "Select a channel"). The user selects an option, which triggers a MESSAGE_COMPONENT interaction. The handler records the selection and sends the next step with a new select menu or a text input. This pattern is suitable for flows that require the user to select from predefined options.

The modal-based flow uses modals for text input. The module sends a button (e.g., "Enter reason"). The user clicks the button, which opens a modal with a text input. The user fills in the text input and submits the modal, which triggers a MODAL_SUBMIT interaction. The handler processes the input and sends the next step. This pattern is suitable for flows that require free-text input from the user.

The hybrid flow combines buttons, select menus, and modals in a single multi-step process. The module uses the appropriate component type for each step — buttons for navigation, select menus for predefined choices, modals for free-text input. The flow state is stored in Redis with a 5-minute TTL, and each step's component handler updates the state and sends the next step. This pattern is the most flexible and is used for complex flows like the module configuration wizard.

#### 84.2 The Confirmation Pattern — Detailed Implementation

The confirmation pattern is used for destructive actions (ban, kick, delete, reset). The pattern ensures that the user explicitly confirms the action before it is executed. The implementation uses the ConfirmationHelper utility.

When a destructive command is invoked, the module's command handler calls the ConfirmationHelper with the action description, the confirm handler, and the cancel handler. The ConfirmationHelper sends an embed with the action description and two buttons: Confirm (red, danger style) and Cancel (gray, secondary style). The embed includes a warning message: "This action cannot be undone."

The ConfirmationHelper stores the flow state in Redis with a 30-second TTL. The state includes the module name, the action description, the confirm handler reference, the cancel handler reference, the invoking user's ID, and the interaction context. Only the invoking user can click the buttons — other users who click receive a "Only the user who invoked this command can confirm or cancel" message.

If the user clicks Confirm, the ConfirmationHelper calls the confirm handler, which executes the destructive action and sends a success message. If the user clicks Cancel, the ConfirmationHelper calls the cancel handler, which sends a cancellation message. If the user does not click either button within 30 seconds, the ConfirmationHelper sends a "Confirmation timed out" message and the action is not executed.

#### 84.3 The Paginated Embed Pattern

The paginated embed pattern is used for displaying large amounts of data in a navigable format. The implementation uses the PaginationHelper utility.

The module's command handler calls the PaginationHelper with the data (or a data source function for dynamic mode), the page size (items per page), and a render function (that formats a page of data into an embed). The PaginationHelper sends the first page with Previous (disabled on the first page), Next, and Page X of Y buttons. The pagination state is stored in Redis with a 5-minute TTL.

When the user clicks Next or Previous, the PaginationHelper fetches the requested page, calls the render function to format it, and updates the message with the new embed and updated buttons. When the user reaches the last page, the Next button is disabled. When the user is on the first page, the Previous button is disabled.

The pagination state expires after 5 minutes of inactivity. When the state expires, the buttons stop working (clicking them produces a "This pagination has expired" message). The user can re-invoke the command to start a new pagination session.

#### 84.4 The Progressive Disclosure Pattern

The progressive disclosure pattern is used for commands that return complex information. Instead of sending all information at once, the command sends a summary with expandable sections. The user can click buttons to expand specific sections for more detail.

The implementation uses Components V2 sections. The command sends an embed with a summary and several expand buttons (e.g., "Show Details", "Show Permissions", "Show Configuration"). When the user clicks an expand button, the handler updates the message to include the expanded section. The user can click the button again to collapse the section.

This pattern is useful for commands like /userinfo (show a summary by default, with expandable sections for roles, permissions, activity, and moderation history) and /serverinfo (show a summary by default, with expandable sections for channels, roles, emojis, and integrations).

#### 84.5 The Autocomplete-Sourced Command Pattern

The autocomplete-sourced command pattern uses autocomplete to help users find and select specific entities (users, channels, roles) without typing their IDs. The command has an autocomplete-enabled option that the module populates with suggestions as the user types.

The implementation uses the AutocompleteHandler. The module's autocomplete handler receives the current option value (what the user has typed) and returns a list of suggestions. For user lookups, the suggestions are guild members whose usernames match the typed value. For channel lookups, the suggestions are guild channels whose names match. For role lookups, the suggestions are guild roles whose names match.

The autocomplete handler must complete within 800 milliseconds (the framework auto-responds with an empty list at 900 milliseconds). For performance, the handler should query the L1 cache (which stores guild members, channels, and roles) rather than the database. If the L1 cache does not have the data (e.g., for a large guild where not all members are cached), the handler should query the database with a limit of 25 results (Discord's maximum number of autocomplete suggestions).

#### 84.6 The Deferred Response Pattern

The deferred response pattern is used for commands that take more than 2.5 seconds to complete. The framework auto-defers the interaction at 2.5 seconds, and the module sends a follow-up response when the command completes.

The implementation uses the response helper's defer method. The module's command handler calls defer at the beginning of the handler if it knows the command will take more than 2.5 seconds (e.g., a data export command that queries a large dataset). The framework sends a "Thinking..." message to the user (with a loading indicator). The module continues processing the command and calls editReply or followUp when the command completes.

The deferred response has a 15-minute window. If the module does not send a response within 15 minutes, the interaction token expires and the user sees "The bot did not respond" (the "Thinking..." message is replaced with this error). The module should track the time and send a progress update if the command is taking longer than expected.

#### 84.7 The Ephemeral Configuration Wizard Pattern

The ephemeral configuration wizard pattern is used for commands that guide the user through a multi-step configuration process. The entire wizard runs in ephemeral messages, ensuring that the configuration process is private to the user.

The implementation uses the hybrid flow pattern with ephemeral responses. The command handler sends the first step as an ephemeral message with a select menu or buttons. Each subsequent step is also sent as an ephemeral message. The flow state is stored in Redis with a 5-minute TTL.

When the wizard is complete, the handler sends a summary of the configuration and a "Save" button. When the user clicks Save, the configuration is validated against the module's Zod schema, persisted to the database, and a success message is sent. If the user does not complete the wizard within 5 minutes, the flow state expires and the user must start over.

This pattern is used by the module configuration command (e.g., /moderation config) to guide the user through the module's settings step by step, This pattern is used by the module configuration command (e.g. /moderation config) to guide the user through the module's settings step by step, explaining each setting and offering sensible defaults.

### 20.8 The Core Renderer — Grammar, Slots, and Modes

The Renderer is a core-owned subsystem: the single constructor of every Discord payload
the framework's user-facing surfaces emit. Module authors never build payloads — they
declare command schemas (options, response shapes, component flows), and the Renderer
derives the presentation from those declarations. The classic `EmbedBuilder` and
`MessageEmbed` are banned from module code by the same four-layer enforcement
structure as the prefix-command ban (§4, ADR-001).

**The static grammar — Components v2.** Every render is built from the static
grammar:

```
RENDER GRAMMAR — Static Elements (Components v2)

 frame        the outer container every render lives inside
 divider      a horizontal separator between content sections
 title /      the render's heading pair — the A4 title and
 subtitle     attribution grammar (ADR-009): title states the
              command or page's name; the subtitle carries the
              attribution ("Dumby • {module}") in one fixed form
 footer       the standard footer: framework identity, module
              identity, timestamp
```

**The dynamic slots.** Into that static frame, the Renderer fills the declared slots:

```
RENDER SLOTS — Dynamic Elements

 accent        the single official accent colour, blurple
               #5865F2 (ADR-010) — one value, everywhere, so
               every surface the framework renders is visibly
               part of one system
 banner        an optional per-module banner image, declared
               in the module's identity, never per-command
 module        the rendering module's identity — name and
 identity      attribution, filling the subtitle/footer grammar
 content       the command's declared response content —
               text, sections, and the components the schema
               authorizes (buttons, selects, modals)
```

**The three density modes.** Every render is issued in exactly one density
mode:

```
TABLE 20-C — Render Modes

┌────────┬────────────────────────────────────────────────────┐
│ Mode │ Meaning │
├────────┼────────────────────────────────────────────────────┤
│ D │ Detailed — the full render: every section and │
│ │ data point the surface declares │
│ M │ Medium — the condensed summary: the │
│ │ essentials, with detail collapsed │
│ C │ Compact — the single-line status render │
└────────┬────────────────────────────────────────────────────┘
```

The Renderer selects the default mode per surface and context — direct command
invocations and the dashboard home default to Mode D; confirmations and transient
results default to Mode C — and the invoking user can switch the density of any page
through the footer's D/M/C control; the choice is invoker-scoped and applies to
subsequent renders of the same navigation message (interface.md §2). The mode changes
density, never content semantics: a Mode C health page and a Mode D health page report
the same system. The Renderer's own test suite — including
the accessibility conformance checks — is the one place presentation correctness is
verified, so every module inherits a correct, accessible render by construction
(§16.5's accessibility-as-a-renderer-property principle applied to the interaction
surface).

### 20.9 The Buffer Embed & Formal Notice Frames

**The buffer embed.** Every interaction — every slash command, component click,
modal submit, and autocomplete request — receives an instant buffer embed at
acknowledgment time, before any business logic runs. The buffer is a minimal,
mode-neutral render whose only job is to occupy the interaction's response slot so the
user sees the framework is working, within the platform's acknowledgment window, every
time. When the command completes, the buffer is edited into the final render
(§20.8); the buffer never persists as the response for a completed command.

**The formal notice frame.** When a command cannot complete — handler failure,
maintenance mode, unknown command, rejection at any middleware layer — the buffer is
edited into the formal notice frame instead: the single, merged failure,
maintenance, and unknown-command presentation. A formal notice carries exactly two
machine-correlatable fields:

```
FORMAL NOTICE — Required Fields

 reason code     a stable, documented, machine-readable code
                 naming why the interaction did not produce a
                 normal render (e.g. MAINTENANCE_MODE,
                 PERMISSION_DENIED, MODULE_SUSPENDED,
                 RATE_LIMITED, UNKNOWN_COMMAND,
                 HANDLER_FAILED)

 trace           the interaction's correlation ID (§27.1) —
 correlation ID  the same ID joining the notice to its log
                 lines, spans, and audit rows, so a user
                 reporting "I saw this code" is one lookup
                 away from the full request trace
```

The merged frame is deliberate: failure, maintenance, and unknown-command are all
"the framework is telling you it cannot do what you asked" and share one visual
grammar, one vocabulary of reason codes, and one correlation discipline — a user
never has to learn three different failure presentations, and an operator triaging a
user report never has to ask which of the three they saw. The buffer-then-notice flow
composes with the auto-deferred interaction lifecycle: an overdue interaction that
somehow has neither a final render nor a notice is guaranteed a logged overdue event
by the interaction-timeout watchdog.

---

## 21. Permission & Authorization Engine


**Status:** [SPEC]

### 21.1 Purpose & the Seven-Layer Model

`PermissionResolver` is the single, unified engine deciding whether a given user, in a
given guild and channel, is authorized to invoke a given command — the one source of
truth Principle P13 requires for this concern. Every surface that needs an
authorization answer, the command pipeline and the MDIS dashboard API alike, calls
through this same resolver rather than maintaining a parallel check of its own (§21.7).

This section is the single normative statement of the seven-layer model: wherever
any other description of authorization appears, it defers to the ordering in
DIAGRAM 21-A and Table 21-A below.

Resolution proceeds through seven ordered layers. Each layer can produce a definitive ALLOW (short-circuiting every remaining layer), a definitive DENY (short-circuiting every remaining layer), or PASS (defer to the next layer). Only if every layer passes without a definitive answer does the framework fall through to the final default: allow.

**RBAC override order.** Layer 7 grant scopes resolve Role → group → set, most-specific wins, evaluated by the RBAC service as part of the seven-layer resolver (`src/permissions/`). The precedence — which of role, group, or set wins — is fixed so the hierarchy is never ambiguous.

```
DIAGRAM 21-A — Seven-Layer Resolution Flow

 Layer 1: Global Bot Owner Override
 user.id ∈ BOT_OWNER_IDS? ── YES ──► ALLOW (bypass everything below)
 │ NO
 ▼
 Layer 2: Blacklist Check
 user or guild on the global block list? ── YES ──► DENY (silent, logged)
 │ NO
 ▼
 Layer 3: Guild & Module Availability
 guild known + module active for this guild? (§13.4's read path;
 fail-closed on data unavailability) ── NO ──► DENY (silent, log warn)
 │ YES
 ▼
 Layer 4: Channel Restriction
 command/module restricted to an allow-list or deny-list of channels
 in this guild's config? ── VIOLATED ──► DENY (ephemeral notice)
 │ PASS
 ▼
 Layer 5: Discord Native Permission Bitfield
 invoking member holds every permission in command.permissions.discord?
 ── NO ──► DENY (ephemeral, names the missing permission)
 │ YES
 ▼
 Layer 6: RBAC Rank (the pure backend rank function)
 [SKIPPED for Core tier — §13.2]
 the rank evaluated (never written) from the member's live
 Discord state satisfies command.permissions.rbac?
 Layers 5 and 6 combine conjunctively (AND) — both must hold.
 ── NO ──► DENY (ephemeral)
 │ YES
 ▼
 ALLOW (default)

 (Layer 7 — the grant override — is consulted immediately after
 Layer 3, before Layers 4–6: for a module command, an applicable
 Layer 7 grant's outcome is final and overrides whatever Layers
 4–6 would otherwise decide. With no applicable grant, resolution
 continues through Layers 4–6 as drawn.)
```

### 21.2 Layer-by-Layer Reference

```
TABLE 21-A — Fail-Open vs. Fail-Closed by Layer

┌───┬──────────────────────────┬──────────────┬───────────────────────────┐
│ # │ Layer │ On Data │ Rationale │
│ │ │ Unavailability │ │
├───┼──────────────────────────┼──────────────┼───────────────────────────┤
│ 1 │ Bot owner override │ N/A — env var, │ A static list; no data │
│ │ │ always resolvable│ dependency to fail on │
│ 2 │ Blacklist │ FAIL CLOSED │ Cache/DB unreachable ⇒ deny │
│ │ │ (deny) │ — never risk letting a │
│ │ │ │ blocked actor through │
│ 3 │ Guild & module availability │ FAIL CLOSED │ §13.4 — a database outage │
│ │ │ (deny) │ never grants access to a │
│ │ │ │ disabled module │
│ 4 │ Channel restriction │ FAIL OPEN │ An unreadable restriction │
│ │ │ (allow) │ list degrades to "no │
│ │ │ │ restriction" rather than │
│ │ │ │ blocking every channel │
│ 5 │ Discord permission bitfield │ FAIL CLOSED │ Sourced directly from the │
│ │ │ (deny) │ interaction payload itself — │
│ │ │ │ never actually "unavailable" │
│ 6 │ RBAC rank (Layer 6 │ FAIL CLOSED, │ An unresolvable rank │
│ │ function) │ rank → MEMBER │ degrades to MEMBER, the │
│ │ │ │ lowest standing │
│ │ │ │ non-restricted rank, │
│ │ │ │ never to an elevated one │
│ 7 │ Grant override │ FAIL OPEN (no │ An unreadable grant table │
│ │ (guild-side grants) │ grant applies) │ falls through to Layers │
│ │ │ │ 4–6's outcome rather than │
│ │ │ │ blocking everything │
└───┴──────────────────────────┴──────────────┴───────────────────────────┘
```

**Layer 2 persistence.** The blacklist is backed by the `blocked_users` table
(§24.2) — global rows (`guildId` null) and guild-scoped rows, each with an optional
expiry — read through a `BlacklistLookup` service with a TTL cache in front of the
table, and written exclusively through PEP's blacklist write endpoints
(`blockUser`/`unblockUser` in the blacklist family, §22.3); there is no
in-memory-only list, and the cache's TTL bounds how long an unblock can lag behind
its write.

The asymmetry above is deliberate, not accidental: layers that gate access to
something potentially destructive or globally scoped (blacklist, module availability)
fail closed; layers that merely refine an already-granted access (channel scoping,
grant overrides) fail open, so an infrastructure hiccup in a secondary system degrades
a command's precision rather than taking down its basic availability.

### 21.3 RBAC Layer 6 — The Pure Backend Rank Function

Layer 6 is a **pure backend function**: it *evaluates* a member's rank from live
Discord state and never *writes* a rank anywhere — no table stores a member's rank,
no role assignment ever persists, and the rank is recomputed from the interaction's
own member data on every resolution. Six ranks form a strict hierarchy:

```
TABLE 21-B — RBAC Rank Ladder (highest to lowest)

┌────────────┬──────────────────────────────────────────────────────────┐
│ Rank │ Resolution (evaluated from live Discord state) │
├────────────┼──────────────────────────────────────────────────────────┤
│ OWNER │ The guild's ownership account — the member Discord │
│ │ reports as the guild's owner. Distinct from the Layer 1 │
│ │ bot-owner override (BOT_OWNER_IDS): that environment │
│ │ variable is a process-owner identity, not a rank, and │
│ │ it short-circuits at Layer 1, never inside Layer 6. │
│ ADMIN │ The member holds the ADMINISTRATOR bundle — a fixed │
│ │ permission-bit bundle defined by the framework, never │
│ │ configurable per guild (canonically: Discord's │
│ │ ADMINISTRATOR bit). │
│ MOD │ The member holds the MODERATOR bundle — a fixed │
│ │ permission-bit bundle (canonically: KICK_MEMBERS, │
│ │ BAN_MEMBERS, MODERATE_MEMBERS, MANAGE_MESSAGES). │
│ HELPER │ The member holds the HELPER bundle — a lighter, │
│ │ fixed support-tier bundle. │
│ MEMBER │ The default rank for any authenticated guild member │
│ │ who holds none of the bundles above — and the default │
│ │ requirement every command's permissions.rbac carries │
│ │ when it declares nothing. │
│ RESTRICTED│ The automatic floor: a member flagged as restricted │
│ │ (by a Layer 7 blacklist grant or a platform │
│ │ restriction) sits at RESTRICTED, below MEMBER, and is │
│ │ denied by default wherever a command requires MEMBER │
│ │ or higher. │
└────────────┴──────────────────────────────────────────────────────────┘
```

The canonical names are MODERATOR and ADMINISTRATOR (the short ladder forms ADMIN
and MOD are accepted notation inside the ladder itself). ADMIN, MOD, and HELPER are
fixed permission-bit bundles — a guild cannot redefine which Discord permissions
constitute its moderators, because the whole point of Layer 6 is that a rank means
the same thing in every guild and derives from what the member actually holds on
Discord right now, not from what a configuration table last recorded.

A command declaring `permissions.rbac: 'MODERATOR'` is satisfied by MODERATOR,
ADMINISTRATOR, or OWNER — the ladder is inclusive upward, exactly like Discord's
own native permission model, so module authors reason about it the same way they
already reason about Discord permissions. Layer 5 and Layer 6 declarations combine
**conjunctively (AND)**: a command that declares both Discord permissions and an
RBAC requirement is satisfied only when the member holds every declared Discord
permission *and* meets the declared rank — neither substitutes for the other.

### 21.4 RBAC Groups & Sets

A guild does not configure RBAC rank-by-rank — Layer 6 ranks are evaluated from live
Discord state and are never assigned (§21.3). What a guild configures are **Groups**:
named mappings from one or more Discord role IDs to a single unit of grant scoping. A
guild with both a "Head Moderator" and "Trial Moderator" Discord role can map both
into one moderator group, and author one grant against the group instead of one
grant per role. Groups exist purely as Layer 7 scope targets (§21.6) — administrative
convenience, never a rank source.

A **Set** is a set of groups (a Layer 7 scope): a named bundle of groups an
administrator can target with a single grant, exactly as a group bundles roles.

**Persistence.** The RBAC substrate is persisted across four tables —
`rbac_groups` (a group and its Discord role IDs), `rbac_group_roles` (role-to-group
membership), `rbac_grants` (the Layer 7 grant rows), and `rbac_sets` (set
membership) — all accessed through a single knex-backed repository. Role resolution
is two-step: the resolver first evaluates the fixed rank ladder from the member's
live Discord state (§21.3), then resolves the invoking member's Discord roles into
groups and sets through the repository for Layer 7 grant scoping. Migration seeds
the default groups (`moderator`, `helper`) so a fresh deployment's grant surface is
never empty. The
scope hierarchy is **role > group > set** — most-specific wins: a grant targeting the
member's Discord role overrides a grant targeting a group containing it, which
overrides a grant targeting a set containing that group. Scopes are resolved fresh
against the invoking member's current Discord roles on every interaction rather than
cached indefinitely, so a role change in Discord takes effect on the member's very
next command.

### 21.5 Rate Limiting

Rate limiting is a distinct concern from authorization — a user can be fully
authorized to run a command and still be temporarily throttled. `RateLimitMiddleware`
(priority 40, ahead of the permission layers) performs an atomic check-and-increment
of both windows in a single Redis Lua script — one `EVALSHA` that reads and
increments the per-user and per-guild counters together, so a concurrent burst can
never slip past either window between two separate commands:

```
TABLE 21-C — Rate Limit Defaults

┌─────────────────────────┬──────────┬────────────────────────────────┐
│ Dimension │ Default │ Behavior │
├─────────────────────────┼──────────┼────────────────────────────────┤
│ Per-user window │ 60,000 ms │ Max 10 commands per user in the │
│ │ │ rolling window │
│ Per-guild window │ 60,000 ms │ Max 100 commands per guild in the │
│ │ │ rolling window │
└─────────────────────────┴──────────┴────────────────────────────────┘
```

Both are configurable per-deployment via environment variables, and a module may
declare a stricter **command-specific** cooldown (§17.2's `cooldown` field, enforced
separately by `CooldownMiddleware` at priority 70) layered on top of these two global
windows — the global limiter protects the platform and the database from abusive
volume; a command-specific cooldown protects that command's own semantics (a `/daily`
economy command cooling down for 24 hours has nothing to do with abuse prevention).
Exceeding either global window returns an ephemeral reply naming the remaining wait
time; it is never a silent drop.


The Swastik control-plane application holds its own HTTP surface to the same
discipline: its Fastify instance registers `@fastify/rate-limit` globally at 30
requests per minute per caller, with a tighter registration bucket (§15.8) on the
developer-registration, upload, and deploy routes — an unthrottled deployment
surface is a denial-of-service target against the control plane whatever its
authentication story.

### 21.6 Layer 7 — Guild-Side Grants

A grant is the most specific, most overriding unit of authorization the engine
recognizes — a guild-side rule targeting one user, one Discord role, one group, or
one set (§21.4), for one command or one entire module, in one guild.

```
TABLE 21-D — Grant Types

┌────────────┬───────────────────────────────────────────────────────────┐
│ Grant Type │ Effect │
├────────────┼───────────────────────────────────────────────────────────┤
│ permit │ Explicitly allows, overriding a Layer 4–6 denial for this │
│ │ specific target — e.g. one trusted MEMBER granted access │
│ │ to a MODERATOR-gated command without a role change │
│ blacklist │ Explicitly denies, overriding a Layer 4–6 allow for this │
│ │ specific target — e.g. one ADMINISTRATOR specifically │
│ │ barred from a particular command after a trust incident, │
│ │ without demoting their whole rank — and the only mechanism │
│ │ that places a member at the RESTRICTED floor (§21.3) │
│ whitelist │ Restricts a command to ONLY explicitly whitelisted targets, │
│ │ regardless of rank — used for narrow, break-glass-style │
│ │ commands where rank alone shouldn't be sufficient │
│ cooldown │ A target-specific cooldown duration overriding the command's │
│ │ own default cooldown field │
│ rate-limit │ A usage ceiling over a rolling window for this target, │
│ │ distinct from the global rate limiter (§21.5) — e.g. a │
│ │ target permitted to use a command at most 5 times per day │
└────────────┴───────────────────────────────────────────────────────────┘
```

**Evaluation.** Layer 7 is consulted immediately after Layer 3 and is evaluated
**above Layers 4–6**: when a grant applies to the interaction, the grant's outcome is
final. Grants apply to **module commands only** — a grant never reaches a core
command, preserving module sovereignty from the other direction (the module author's
declared contract holds unless the guild explicitly overrides it, and the framework's
own commands are never subject to guild-side overrides).

**Scope resolution.** Scopes are **role > group > set**, most-specific wins: when
grants at different scopes conflict, the most specific one targeting the invoking
member decides. Grants are **resolved fresh per interaction** — never cached across
interactions — so a revoked or edited grant takes effect on the member's very next
command, exactly like a Discord role change does at Layer 6.

**The override boundary — exhaustive and non-configurable.** Layer 7 grants can
override exactly and only Layers 4–6, and module commands only. The boundary is
exhaustive and non-configurable: no grant, no grant type, and no configuration can
touch

- Layer 1 (the bot-owner override),
- Layer 2 (the blacklist),
- Layer 3 (guild and module availability, fail-closed),
- the bot-capability check (the Layer 5 Discord permission bitfield the bot's own
  identity must hold for a command to function at all), or
- the RESTRICTED floor's meaning (a blacklist grant can place a member at RESTRICTED;
  nothing can lift RESTRICTED's below-MEMBER standing by grant).

There is no privileged grant type, no operator override grant, and no configuration
flag that widens this list — the boundary is a property of the engine, not a policy.

**Sovereignty — an open question, honestly held.** Whether the guild or the module
author is sovereign over a command's Discord-bit gate (Layer 5) for commands whose
authors declare stricter requirements than Discord's own defaults remains an open
design question; the current resolution — guild grants override Layers 4–6, module
commands only — is the operative rule until it is settled and recorded.

Grants are the mechanism an administrator reaches for when the blunt instrument of
"change this person's rank" is the wrong tool — precision authorization without
restructuring a guild's entire role hierarchy over one exception.

### 21.7 The OAuth2 Bridge — One Engine, Two Surfaces

MDIS (§16.4) authenticates dashboard requests via a Discord OAuth2 token rather than a
bot-side interaction, but it resolves authorization through the identical
`PermissionResolver` instance the command pipeline uses — never a parallel,
independently-maintained check. The bridge does exactly one thing: exchange the
OAuth2 token for the same internal user/guild identity pair the bot side would derive
from an `Interaction` object, then hand that pair to `PermissionResolver` unchanged.
Every layer above — blacklist, module availability, channel restriction (interpreted
as "which module panels are visible" for the dashboard context), RBAC role, and
grants — evaluates identically regardless of which surface asked. This is Principle
P13 applied specifically to authorization: one engine, reachable from two transport
layers, is what guarantees a permission change an administrator makes is never visible
on the dashboard but not enforced in the bot, or the reverse.

### The Five-Layer Admin-Tier Defense in Depth

Admin-tier access is guarded by five distinct defense layers, specified in full at
§13.6's DIAGRAM 13-B: (1) Discord command registration scope — dev-guild-only
registration with `defaultMemberPermissions: 0n`; (2) `AdminTierGateMiddleware` at
priority −10 — BOT_OWNER_IDS membership plus a valid context, silent-reject on
failure; (3) the BOT_OWNER_IDS environment variable itself — process-level
configuration no command or API can modify; (4) the per-capability environment guard
on a deployment's most dangerous Admin-tier capability; (5) time and output bounding
on every such capability. The layers are independent by design — no single
misconfiguration exposes the tier — and every one of the five is part of the
normative model this reference specifies.

## 22. Power Engine Panel, CLAI & Credentials Service

**Status:** [SPEC]

### 22.1 Why These Are Separate Services, Not Modules

CLAI authenticates operators through a real ssh2-based SSH server with public-key
authentication against the `clai_operators`/`clai_authkeys` tables (§22.10) — its
canonical entrypoint is `src/entry/ssh-clai.ts`. Three capabilities in this
architecture sit outside the module system entirely rather
than being expressed as an Admin-tier module: the Power Engine Panel (global
administrative authority), CLAI (an operator terminal), and the Credentials Service
(shared secret issuance). Each is deployed as its own process (§7.5), sharing only the underlying PostgreSQL and Redis instances with the bot process. CLAI uses the already-installed ssh2 dependency for SSH public-key authentication (replacing the fingerprint-text SSH REPL); no plaintext credential path remains

Telemetry initialization defaults to OFF and parses TELEMETRY_ENABLED case-insensitively with explicit truthy/falsy handling via Zod enum validation; on any ambiguous or unset value it fails closed (off) for compliance-sensitive deployments.
underlying PostgreSQL and Redis instances with the bot process — never the bot's own
gateway connection, never its module registry. This placement is deliberate and traces
directly to §4's microservices non-goal and its named exception: these three are
control-plane infrastructure in the same category as the database itself, not
application features — and critically, each remains reachable even in a failure mode
where the bot process itself is completely down, which is exactly the scenario in
which an operator most needs them. An Admin-tier module, by contrast, only ever runs
*inside* the bot process — useless the moment that process is the thing in trouble.

### 22.2 Power Engine Panel (PEP) — Purpose & the Function-Calling Model

PEP is the framework's global administrative authority — the concrete mechanism
behind Principle P14 (§3): a capacity for total, fleet-wide control that exists for
deliberate, logged intervention, never as ambient enforcement. It can suspend any

never as ambient enforcement. It can suspend any
 guild, module, developer, or command, fleet-wide, instantly.

> **Canary caveat:** Symlink promotion for module hot-swap is currently
> fleet-wide, not canary — all pods read the new version simultaneously.
> A logic bug that passes structural validation breaks all pods at once;
> canary-based promotion (one pod, health-check, then fleet) is a known gap.
guild, module, developer, or command, fleet-wide, instantly, regardless of what any
individual guild administrator or module author has configured.

> **P14 tension:** P14 ("freedom by default, authority by exception") is
> contradicted by PEP's 17 control domains — the framework has an instant
> global kill switch (suspendGuild/Module/Developer/Command). This is
> correct for abuse/security response but should be acknowledged explicitly.

> **Access and transport.** Every PEP route — and the admin routes that share
> its action registry — authenticates the caller with a bearer credential issued
> by the Credentials Service (§22.8) and validated against the configured operator
> allow-list; a request without both is rejected with 401 before any function
> catalog lookup happens. The `source` recorded on every audit row is derived by
> the server from the authenticated caller and the serving route, never accepted
> from the request body. Trust is network-derived and token-presented in
> combination: the call must both arrive over the interface the listener is
> bound to and carry a valid operator token, so neither a network position
> alone nor a leaked token presented from outside the control-plane boundary
> authenticates. PEP's HTTP listener binds loopback (127.0.0.1) by
> default; the bind host is deliberately configurable for deployments that
> terminate authentication at a private network boundary, and it is never
> `0.0.0.0` out of the box.

PEP exposes its capabilities as a catalog of **callable functions** — each with a
name, a typed parameter schema, and a description — rather than a fixed set of
hardcoded terminal commands. The catalog contains three kinds of callable function:

- **Act functions** — the control domains of §22.3–§22.4: suspend, resume, restart,
  revoke, and every other state-changing intervention, each audited after its
  handler completes, with the outcome recorded.
- **Observe and read functions** — the mirror set: current fleet state (guilds,
  modules, developers, commands, shards), grant and license state, audit-log queries,
  queue depths, rate-limit windows, and deployment history (§15.12's Deployment
  Records). Observe functions never mutate state and never write an audit row for the
  read itself, but they are authenticated, rate-limited, and schema-validated exactly
  like act functions — an operator tuning a response is never guessing at state.
- **Policy-tuning controls** — the read/write pair for tunable policy: rate-limit
  windows (§21.5), cooldown overrides, deployment rate-limit buckets (§13.6), and
  detection thresholds. Every tuning write is itself a PEP act function: audited,
  reasoned, and reversible, with the previous value recorded in the audit row.

Long-running views stream over **Server-Sent Events**: a subscribed client receives
push updates for the state it is observing (fleet health, deployment progress through
the §15.12 records, audit tail) rather than polling. The SSE surface carries the same
authentication as every other PEP route and is what gives PEP's REST API a
frontend-quality bar — a dashboard, the developer portal, or a future operator UI can
be built entirely against PEP's own API without a parallel backend ever being
written. This shape is deliberate: the identical schema format serves PEP's REST API
(§44.6), CLAI's terminal (§22.6), and any structured front end layered on top later
without any change to PEP's own implementation — the function catalog is the single
contract every caller, human or automated, is validated against identically.

```
DIAGRAM 22-A — PEP as a Function Catalog, Not a Command List

 Caller (CLAI terminal, authenticated REST client, or a future structured
 natural-language front end)
 │
 ▼
 PEP Function Dispatcher
 validates the call against the named function's typed parameter schema
 (rejects malformed calls before any side effect)
 │
 ▼
 One of 17 control domain functions executes through the shared action registry — every entry resolves to a real domain handler, and an entry without one returns 501 Not Implemented without writing an audit row

All 17 control domain functions expose typed Zod parameter schemas, descriptions, REST API exposure, and CLAI terminal command mappings through the shared action registry that serves PEP's REST surface, CLAI's terminal, and the admin routes identically; an entry that does not yet resolve to a domain handler returns 501 and never writes an audit row for an action that did not occur.
 │
 ▼
 Mandatory append-only audit_logs write (source: 'PEP', server-derived) enforced by a Postgres trigger blocking UPDATE/DELETE, performed after the domain handler completes so the row records the true outcome — applied, failed, or rejected — never a prediction; revocation and rejected calls are audited as well

Canary revocation checks run on every module load (bootstrap, discovery, onLoad, onReady, hot-swap, fresh install, and immediately after any PEP signature revocation) rather than only at process restart, so a revoked module cannot execute for up to a full process lifetime.


**Catalog integrity at boot.** Every catalog entry is a real adapter over an
existing subsystem — the maintenance domain drives §28.6's maintenance switch, the
cache domain drives CacheManager, the queue domain drives QueueManager — or it is
explicitly marked not-implemented and returns `501`. A control-plane process asserts
this at boot: every registered catalog entry must resolve to a domain handler or an
explicit not-implemented marker, and an entry wired to no backend fails the boot —
a marker-only domain that silently no-ops is a lying control surface, worse than an
absent one. No route exists without a backing catalog entry.

A no-stub test walks every registered admin and PEP route in CI: each route must
resolve to a real domain handler or carry the explicit not-implemented marker,
and a route whose handler is an empty `async () => {}` returning
`200 {ok:true}` fails the test. An honest `501 NOT_IMPLEMENTED` is acceptable
anywhere the primitive does not yet exist; a fake success is not, anywhere.

Revocation status is verified at every load boundary — bootstrap, module discovery, onLoad, onReady, hot-swap, fresh install, and post-PEP revocation — against the PEP revocation list, not only at process restart.

Revocation propagation is verified at all six module-load boundaries plus post-PEP: Swastik's signature verifier, the runtime loader, and PEP revokeModuleSignature each emit audit-logged verification events so a revocation is provably observed at every boundary.
 │
 ▼
 Result returned to caller
```

### 22.3 PEP Control Domain Catalog

> **Module validation gap:** Validation happens once at upload time.
> A module that passes structural validation but has a logic bug still
> breaks when loaded, and since symlink promotion affects all pods at
> once, the failure hits all pods simultaneously. Canary-based promotion
> (one replica, observe, then fleet) is the specified but unimplemented fix.

#### 22.3.1 Re-authorization on Component Clicks

Component interactions (button, select, modal submit) re-run permission checks before executing — compliance feature #30 (Tier 3 scaffold).

**Mechanism:** The interaction handler in `src/interactions/interaction-registry.ts` constructs a `PermissionContext` from the interaction (decoded from the `custom_id` scheme) and invokes `resolvePermission` (in `src/permissions/resolver.ts`) before dispatching the handler. If the check fails, the interaction is rejected with an authorization error rather than executed.

**
**Compliance:** feature #30.

**PEP (Power Engine Panel).** PEP is specified at `src/entry/pep.ts`: the four
foundational domains and thirteen extended domains dispatch through the shared
action registry. `suspendDeveloper` validates its input against a Zod schema
before any state changes — a malformed payload returns `400` with field-level
errors, and an unknown `devId` returns `404` rather than silently succeeding — and
accepts an optional force-disable flag that, when set, propagates: the license row
takes the `suspendedAt`/`suspendedBy`/`suspensionReason` split (§15.7), every
pending build the developer has in flight is rejected, and their already-live
modules are unloaded across the fleet through the §15.1 unload path rather than
merely short-circuited.

Control-plane shared state is centralized: every shared-state key the control
plane writes is declared in one keys module alongside its consuming service, and a
key without a live consumer is removed rather than parked — no control-plane
action writes a state row that nothing reads back.

### 22.4 PEP Control Domain Catalog

Seventeen control domains in total: four original, foundational domains, and thirteen
extended domains that reach into every other core subsystem this reference documents.
Within the credentials domain, the `credentials.issue` / `credentials.rotate` /
`credentials.revoke` family (§22.8) is the governance surface for license
identifiers, CLAI operator keypairs, developer tokens, and service-to-service
credentials.

```
TABLE 22-A — The Four Original Control Domains

┌──────────────────┬────────────────────────────────────────────────────┐
│ Function │ Effect │
├──────────────────┼────────────────────────────────────────────────────┤
│ suspendGuild │ Immediately blocks the bot from responding to ANY │
│ │ interaction originating in the named guild, fleet- │
│ │ wide, regardless of that guild's own configuration │
│ suspendModule │ Immediately disables the named module fleet-wide, │
│ │ overriding every individual guild's own enabled state │
│ │ for it — a global kill switch above guild_module_ │
│ │ states │
│ suspendDeveloper │ Blocks every module authored by the named devId from │
│ │ deploying further versions AND, at the operator's │
│ │ discretion, force-disables their already-live modules │
│ suspendCommand │ Immediately disables one specific command fleet-wide, │
│ │ across every module and every guild — the narrowest │
│ │ of the four, for a single misbehaving command rather │
│ │ than an entire module │
└──────────────────┴────────────────────────────────────────────────────┘
```

```
TABLE 22-B — The Thirteen Extended Control Domains, By Subsystem

┌──────────────────────┬──────────────────────────────────────────────────┐
│ Subsystem Reached │ Function(s) │
├──────────────────────┼──────────────────────────────────────────────────┤
│ Maintenance Mode (§28.6) │ enterMaintenanceMode / exitMaintenanceMode │
│ Cache (§25) │ flushCacheNamespace — targeted invalidation of an │
│ │ entire key prefix, for recovering from a stale-cache │
│ │ incident without a full process restart │
│ Job Queue (§29) │ pauseQueue / resumeQueue / requeueDeadLetter │
│ Rate Limits (§21.5) │ overrideRateLimit — temporary per-guild or per-user │
│ │ exception, for a legitimate high-volume use case that │
│ │ would otherwise be throttled │
│ Shard Management (§6.5) │ restartShardGroup — targeted restart of one shard │
│ │ range without a fleet-wide rolling update │
│ Deployment (Swastik, §15) │ triggerCoreRestart / rollbackModuleVersion — an │
│ │ operator-initiated equivalent of Swastik's own │
│ │ scheduled and hot-swap paths │
│ Persona Management (§35) │ suspendPersona — the Persona-scoped equivalent of │
│ │ suspendGuild/suspendModule, reachable independently │
│ │ per additional bot identity │
│ Audit (§24.2) │ queryAuditLog — structured search across the shared │
│ │ audit_logs table, the same table every domain above │
│ │ writes to │
│ Marketplace (§16) │ revokeModuleSignature — the mechanism behind §16.4's │
│ │ revocation path │
│ Credentials (§22.8) │ The credentials domain: credentials.issue / │
│ │ credentials.rotate / credentials.revoke — issuance of │
│ │ licenses' paper-certificate identifiers, CLAI operator │
│ │ keypairs, developer tokens, and service-to-service │
│ │ credentials; rotation ahead of natural cycles; and │
│ │ revocation taking effect at the next verification. │
│ │ rotateCredential remains the single-call form for the │
│ │ common force-rotation case. │
└──────────────────────┴──────────────────────────────────────────────────┘
```

Every one of the seventeen writes an unconditional, reasoned `audit_logs` entry —
tagged `source: 'PEP'`, derived by the server from the authenticated caller — after
its domain handler completes and before returning a result to its caller, with no
exception: the row records the handler's actual outcome (applied, failed, or
rejected), so the audit trail can never claim an intervention that did not happen.
Principle P14's "deliberate, logged intervention" is enforced structurally by making
the outcome-bearing audit write part of the function's completion path, not a
best-effort side effect that could be skipped under load or failure.

**queryAuditLog.** The audit query domain reads the corrected `audit_logs` column
set (§24.2) — `source`, `actorId`, `action`, `targetType`, `targetId`,
`beforeState`/`afterState`, `reason`, `outcome`, `timestamp` — and never references
a column the audit writer does not populate; writer and reader are contract-tested


**Control-domain SQL contract.** Each act function's persistence layer runs against
the exact schema §24.2 declares: `suspendCommand` inserts into `disabled_commands`
honoring the partial unique index on `commandId WHERE "guildId" IS NULL`;
`revokeModuleSignature` updates the `signing_keys` row's revocation columns
(`revokedAt`, `revokedBy`, `revocationReason`) rather than deleting the key; and the
audit writer populates exactly the `audit_logs` column set `queryAuditLog` reads. A
contract test exercises all four statements — the suspendCommand insert, the
signing-keys revoke, the audit write, and the audit query — against a disposable
schema-per-test database in CI, so a statement that drifts from the schema fails the
build instead of throwing at the next operator invocation.

The credentials revoke route follows the same contract. It keys its update on
the `keyId` the `credentials` table actually defines — never a column the table
does not carry — and returns `404` when the update touches zero rows rather
than reporting success for a nonexistent credential. Its `audit_logs` entry is
written only after the handler has succeeded: a failed or refused revoke
records the refusal with its reason, never an allowed outcome, and the row
carries the credential's real metadata — purpose, devId hash where present,
issuedAt, revokedAt, and the revocation reason — serialized into the audit
payload rather than an empty object.
against the same schema so drift between them fails CI rather than crashing at
query time.

### 22.5 PEP Deployment & Access Model

PEP runs with no gateway connection and no loaded modules — it never speaks Discord's
Gateway protocol at all, only its own authenticated REST surface (§44.6). Access
requires a credential issued by the Credentials Service (§22.8) and bound to a named
operator identity, distinct from — and held to at least the same scrutiny as —
Admin-tier's `BOT_OWNER_IDS` check (§13.6): the two overlap in practice for a typical
deployment's smallest operator set, but PEP's own access list is independently


**Internal-surface authentication.** Every internal HTTP surface — PEP's REST
routes, the admin routes sharing its action registry, CLAI's dispatch bridge, the
Credentials Service's issue/revoke endpoints, Swastik's `/internal/*` routes, and
the bot's `/internal/reload` (§15.9) — authenticates service-to-service calls with
a timing-safe `x-internal-api-key` preHandler: the presented key is compared in
constant time before any handler, route lookup, or body parsing runs, and a missing
or mismatched key is rejected with 401 before anything else executes. Each such
listener binds loopback (127.0.0.1) by default, with the bind host configurable
for deployments that terminate authentication at a private network boundary — and
the Docker Compose control-plane mapping publishes every internal port on
`127.0.0.1:` only, never `0.0.0.0`, so an internal surface is unreachable from
outside the host without an explicit operator decision. The `source` field
carried on control-plane requests is request metadata, never an authorization
input: trust derives solely from the presented service-to-service credential
and the interface the call arrived on, so a declared-but-unauthenticated source
changes nothing about what a call may do.
configured rather than inherited automatically from the bot-owner list, since not
every Admin-tier-capable Discord user necessarily needs fleet-wide REST access to
PEP's control domains.

### 22.6 CLAI — Purpose & Access Model

CLAI (Command Line Administrative Interface) is an SSH-hosted operator terminal
providing direct, interactive access to PEP's function catalog from outside Discord
entirely. Its defining property is independence from every other part of the stack
that could be the thing currently broken: CLAI requires only SSH reachability and
PEP's own health, meaning it remains a viable intervention path even when the
Discord gateway connection is down, a specific shard group is unresponsive, or a
core restart is mid-rollout — exactly the failure modes in which an operator most
needs a way in that does not itself depend on the thing failing.

**Key management.** Each operator's public key is registered in the `clai_operators`/`clai_authkeys` tables; revocation is a credentials-domain action (§22.8) that takes effect on the very next connection attempt, so a departing operator loses access immediately.


Where an operator cannot register an SSH keypair — a headless automation context —
CLAI admits token-verified authentication instead: a Credentials-Service-issued
operator token verified timing-safely over the same transport, so there are exactly
two sanctioned paths, registered public key or issued token. The fingerprint-text
REPL is disabled in production builds: a session on a production CLAI server offers
no fingerprint recital and no unauthenticated prompt of any kind, and every command
issued inside a session dispatches through the real authenticated PEP function
dispatcher (§22.2) carrying the operator's identity — never an echo.

Authentication is SSH public-key only — no password path exists — with each
operator's key registered individually in `clai_authkeys` and verified against the table on every connection, so a revocation takes effect on the very next connection attempt. Removing one
compromised or departed operator's access never requires rotating a shared secret
every other operator also relies on.

**Transport hardening.** The ssh2 server holds its authentication state in a
synchronous flag: the authenticated bit is set inside the `publickey` callback
before any stream is opened, so a session can never reach a command prompt from
an authentication state that is still resolving. Sessions are bounded by
connection and byte limits — a session exceeding its byte ceiling is terminated,
and the per-IP connection cap blocks session pileups — and every byte the
session writes to the operator's terminal passes through an ANSI escape
stripper, so command output (or a module it inspected) cannot smuggle terminal
control sequences into the operator's session.

**Session guards and operator lifecycle.** A session terminates after a bounded
idle period — 10 minutes (Table 22-C, §22.7); destructive functions require the
typed confirmation named there; repeated failed connections from a single source
IP trip a per-IP authentication limiter with escalating backoff; and destructive
control domains additionally require a TOTP second factor verified after the
publickey step, so possession of an operator's SSH key alone is not enough to
run them. Operator lifecycle is a first-class surface: `POST /admin/operators`
(register, rotate, revoke) plus a deployment seed script provisions operators
through the credentials domain — keypairs and TOTP secrets issued, rotated, and
revoked through `credentials.issue` / `credentials.rotate` /
`credentials.revoke` (§22.8), never hand-registered on the host — and a
revocation removes both the keypair and the TOTP binding on the next connection
attempt.

### The 17 PEP Control Domains and Unconditional Audit

PEP exposes its capabilities as a catalog of callable functions — each entry carries a name, a typed parameter schema, and a description. The catalog spans 17 control domains: the four original suspend primitives (`suspendGuild`, `suspendModule`, `suspendDeveloper`, `suspendCommand`) plus thirteen extended domains, including maintenance, cache, job queue, rate limits, shard management, deployment, persona, audit, marketplace, and credentials. Every invocation writes an unconditional `audit_logs` entry after its domain handler completes, recording the true outcome — audit is part of the function's completion path, not an optional afterthought. The identical schema format serves both the PEP REST API and the CLAI terminal (implemented in `apps/main/src/http/power-engine-dispatcher.ts`), keeping the catalog shape future-proof for an NLP front-end.

### 22.7 CLAI Session Model & Command Surface

A CLAI session is a REPL: a connecting operator is dropped into an interactive prompt
that resolves each typed command to a call against PEP's function catalog, rendering
results in human-readable form (tables for list-shaped results, formatted diffs for
state changes) rather than raw JSON — the terminal is a presentation layer over PEP's
functions, not an independent capability surface with its own logic. Every command a
CLAI session issues carries the connecting operator's identity through to PEP's own
audit write, so `audit_logs` distinguishes an intervention made through CLAI from one
made through PEP's REST API directly, even though both ultimately invoke the identical
function.

Every command a CLAI session issues executes against the real PEP route: the
dispatch bridge presents a Credentials-Service-issued service-to-service
credential (`purpose: 'service_to_service'`, §22.8) on each call, so CLAI's
privilege over PEP is an issued credential, never a network position or an
asserted identity. Each command mints a correlation ID that travels on the PEP
call and is written into both the CLAI session's audit row and the PEP
handler's audit row, so a terminal intervention and the control-plane change
it caused join on a single `correlationId`. Rendering is honest: the terminal
shows the handler's actual outcome — a failed or rejected invocation renders
the failure and its reason, never a fabricated success line.

```
TABLE 22-C — CLAI Session Properties

┌────────────────────┬─────────────────────────────────────────────────┐
│ Property │ Behavior │
├────────────────────┼─────────────────────────────────────────────────┤
│ Idle timeout │ Session terminates automatically after a │
│ │ 10-minute idle period — no indefinitely-open │
│ │ privileged terminal left unattended │
│ Command history │ Persisted per-operator for the operator's own │
│ │ later reference; never shared across operators │
│ Destructive-action │ A function whose effect is broad or irreversible │
│ confirmation │ (suspendGuild, suspendDeveloper with force-disable, │
│ │ triggerCoreRestart) requires an explicit typed │
│ │ confirmation matching the target's name — the same │
│ │ discipline Principle P10 (§3) requires of destructive │
│ │ operations anywhere else in the system │
└────────────────────┴─────────────────────────────────────────────────┘
```

### 22.8 Credentials Service — Shared Issuance Path

The Credentials Service is the single, shared issuance path for every credential this

**Dev ID Expiry / Auto-Renewal Unspecified**
§22.8 says credentials are revocable but mentions neither expiry nor auto-renewal.

Documented dev-ID lifecycle with explicit expiry, renewal, and break-glass recovery.

architecture hands out at runtime — Swastik's developer dev IDs and build IDs (§15.6),
PEP and CLAI operator access credentials (including CLAI operator keypairs, issued
and rotated through the credentials domain's issue/rotate/revoke functions), any
internal service-to-service authentication token one control-plane process needs to
call another, and the verifiable license IDs every approved license's paper
certificate carries (§15.7). Consolidating issuance into one service, rather than
letting Swastik, PEP, and CLAI each mint their own credentials independently, is what
makes Principle P13 hold for secret issuance specifically: exactly one place
generates, hashes, and revokes credentials, so an audit of "every credential this
system has ever issued" is one table, not a reconciliation across three. Paper
license certificates are issued here because the license ID they carry is a
credential-shaped value — verifiable against the license record's public fingerprint,
never reproducible from it.

```
TABLE 22-D — Credential Handling Discipline

┌───────────────────────┬─────────────────────────────────────────────┐
│ Rule │ Applied Uniformly To │
├───────────────────────┼─────────────────────────────────────────────┤
│ Generated cryptographically│ Every credential this service issues, no │
│ random │ exceptions │
│ Stored only as an Argon2id │ The raw value is never persisted anywhere, │
│ hash │ including in this service's own database │
│ Displayed exactly once, │ At issuance time only; a lost credential is │
│ at issuance │ rotated, never retrieved │
│ Always transmitted via │ Never in a URL, a query string, or a log line — │
│ Authorization header │ the same placement discipline as a Discord bot │
│ │ token (§32.1) │
│ Independently revocable │ Revoking one credential never requires rotating │
│ │ any other credential the same service has issued │
└───────────────────────┴─────────────────────────────────────────────┘
```

**CLAI SSH transport.** CLAI's transport is the ssh2 public-key server specified
at §22.10 — public-key-only authentication against the operator tables, no
password or fingerprint-text path, sessions bounded by the idle-timeout and
typed-confirmation discipline of §22.7.

**PEP function dispatch.** Every control domain in the catalog dispatches to a
real domain handler behind the validated envelope, with the shared action registry
serving PEP's REST surface, CLAI's terminal, and the admin routes identically; an
entry that does not yet resolve to a handler returns `501 Not Implemented` and
writes no audit row; audit logging is mandatory on every action that does execute.

**Service authentication and port.** The Credentials Service's issue and verify
endpoints authenticate bearers: a bootstrap token delivered to the operator
exactly once at deployment, compared timing-safely (no early-exit string
comparison), and — once the service has issued operator credentials — those
credentials in turn. The issuance and verification surface is rate-limited per
caller and carries a Fastify `bodyLimit` sized to the smallest valid
issue/verify payload, so an oversized body is refused with 413 before it
finishes buffering. Every issuance — dev IDs, build IDs, operator keypairs,
service tokens, license IDs — writes an `audit_logs` row tagged
`source: 'CREDENTIALS'`. The service's listen port comes from
`CREDENTIALS_SERVICE_PORT` (default 8086, §23.2), read by


**Developer credentials storage.** Developer secrets live in the `credentials`
table — `keyId`, `purpose`, `credentialHash` (Argon2id), `devIdHash`, `status`,
`createdAt`, `revokedAt` — one row per issued secret, keyed by `keyId`. `purpose`
is a closed enum (`'devId' | 'buildId' | 'password' | 'service_to_service' |
'operator_keypair' | 'license_id'`); a value outside the enum is rejected by the
schema, never silently stored. A developer's devId token is stored only as its
Argon2id hash keyed by that `keyId`, and the developer identity itself only as
the `devIdHash` column — no plaintext devId is persisted anywhere in this table.
The caller presents the keyId together with the secret, the service hashes the
presented secret and compares it against the single row the keyId names, so
verification never scans or compares across developers. Verification is
delegated to this service alone: Swastik and the developer portal never hash or
compare developer credentials themselves — they call the verify endpoint and act
on its verdict. Refusals are indistinguishable: an unknown keyId, a mismatched
secret, and a pending identity all return the identical 401 body with no field
named, and no log line, metric label, or audit row ever contains a fragment —
not even a prefix — of the presented secret. Password registration (§15.6)
writes the same table with `purpose: 'password'`. A newly registered
developer's rows start in `status: 'pending'` and fail verification as an unknown
identity until the owner approval workflow (§15.8) transitions them to `active` —
an unknown or pending caller is refused before any deploy-granting logic runs.
`src/entry/credentials.ts` — never hardcoded in the entrypoint.

**Licensing gate for Swastik developer registration.** Developer registration runs
through the six-state license machine (§15.7): no upload is enabled until the
developer's license reaches `approved`, and suspension or revocation of the license
or the registration blocks promotions from either side. Registration, review, and
the tier-specific license classes are exercised through the governance API family
(§44.8).

**PEP Enforcement / Live Config Override Absent from F3 Rewrite**
The "pep enforcement / live config override" idea from the original spec is not in the F3 rewrite at all.

Explicit decision: either reintroduce as the Effective Config Descriptor's override feed or document as intentionally out of scope.

### 22.9 How the Control Plane Fits Together

```
DIAGRAM 22-B — Control-Plane Services, Complete Relationship

 ┌─────────────────────┐
 │ Credentials Service │◄───────────────┐ issues dev IDs, build IDs,
 │ (src/entry/ │ │ operator credentials, and
 │ credentials.ts) │ │ service-to-service tokens
 └──────────┬───────────┘ │ to every service around it
 │ issues to │
 ┌─────────┼─────────────────┬───────────┘
 │ │ │
 ▼ ▼ ▼
┌──────┐ ┌───────────┐ ┌──────────────┐
│Swastik│ │ PEP │ │ CLAI │
│(§15) │ │ (function │ │ (SSH terminal, │
│ │ │ catalog, │ │ calls PEP's │
│ │ │ §22.2) │ │ functions) │
└───┬───┘ └─────┬──────┘ └───────┬───────┘
 │ │ │
 │ each independently deployed; each shares only the underlying
 │ PostgreSQL primary and Redis instance with the bot process —
 │ never the bot's gateway connection or module registry
 │ │ │
 ▼ ▼ ▼
┌───────────────────────────────────────────────────────────┐
│ PostgreSQL (audit_logs, shared state) │
│ Redis (cache invalidation signals, pub/sub) │
└───────────────────────────────────────────────────────────┘
 ▲
 │ the bot process itself (src/entry/main.ts) reads/
 │ writes the same stores, and is the ONLY one of the
 │ five processes with a live Discord gateway connection
 │ and a loaded module registry
 ┌──────┴──────┐
 │ Bot Process │
 │ (main.ts) │
 └──────────────┘
```

Every arrow in this diagram terminates at PostgreSQL or Redis — never at another
control-plane service's in-process state — which is precisely what allows each of
these five processes to fail, restart, or scale independently of the other four
without any of them needing to know the others exist beyond the shared data layer.

### 22.10 CLAI — SSH Public-Key Operator Terminal

CLAI binds 127.0.0.1 and authenticates operators via ssh2 public-key verification against the clai_operators/clai_authkeys tables. No node:net plaintext REPL path exists in the specification, and there is no plaintext credential channel of any kind. PEP dispatch is issued over the authenticated SSH session, carrying the operator's identity through to PEP's audit write (§22.7). The command surface presented inside the session is the PEP function catalog itself — observe, read, policy-tuning, and act functions (§22.2) — so an operator's terminal session and an authenticated REST call are two views of one engine, never two engines.

- ** signModule on Gate 5 approval; revokeModuleSignature on revocation.

signModule runs on Gate 5 approval and revokeModuleSignature on revocation, both exposed via `/api/pep/*` and the marketplace-admin surface.

CLAI's control-plane entry point is a real SSH server (`src/entry/ssh-clai.ts`, ssh2 library) with public-key-only operator authentication; no plaintext TCP or fingerprint-text path exists.

Hash credential-shaped values with Argon2id, never reversible encryption.

Password-shaped credential values are hashed with Argon2id and are never reversibly encrypted; recoverable in-process-readable credentials use envelope encryption instead (§32.7), and all other at-rest encryption is delegated to infrastructure.

### devId / buildId Developer Identity Chain

Every developer is issued a `devId` by the Credentials Service and every uploaded module version receives a `buildId`; the module's `manifest.ts` carries both, binding each module to its developer. The binding is currently identity-only, which permits substitution — the target is a hash-bound `buildId` tied to source/artifact hashes plus a signature (Credentials Service, `manifest.ts`, `builds` table).

### devId Sensitivity — the Bot-Token Analogy

The devId/Dev Token is handled with exactly the sensitivity of a Discord bot token; it is the project's canonical reference for bearer-secret handling (Argon2id hashing, once-only issuance, Authorization-header transport). That bar is precisely what makes any embedding of the devId inside a shipped manifest a critical fault.

### Entry Point Separation

Seven entry points (`src/entrypoints/main.ts`, `pep.ts`, `ssh-clai.ts`, and the rest) each boot the same DI container but start different service subsets. Maintain the separation, and document each entry point's purpose and service subset in the runbook.

Three capabilities in this architecture sit outside the module system entirely rather

# PART V — DATA & STATE

---

## 23. Configuration Management

**Status:** [SPEC]

### 23.1 Three Configuration Scopes

```
TABLE 23-A — Configuration Scope Reference

┌──────────────────┬───────────────────┬────────────┬───────────────────────┐
│ Scope │ Storage │ Mutable at │ Validated │
│ │ │ Runtime? │ │
├──────────────────┼───────────────────┼────────────┼───────────────────────┤
│ Process — Core │ Environment │ No — a │ Bootstrap Stage 02, │
│ │ variables │ change │ against the root Zod │
│ │ │ requires a │ schema │
│ │ │ redeploy │ │
│ Process — Module │ Environment │ No — same │ Bootstrap Stage 11, │
│ │ variables, module- │ as above │ against each module's │
│ │ name-prefixed │ │ own declared Zod schema │
│ Guild │ PostgreSQL │ Yes — a │ On every write, against │
│ │ (guild_configs │ command or │ the same schema the │
│ │ JSONB document) │ MDIS write │ read path deserializes │
│ │ │ takes │ against │
│ │ │ effect │ │
│ │ │ immediately │ │
└──────────────────┴───────────────────┴────────────┴───────────────────────┘
```

The dividing line is simple and absolute: anything that should never differ between
one guild and the next, or that changing incorrectly could threaten the process's
ability to start at all, is process-level and requires a deployment. Anything a guild
should reasonably be able to tune for itself is guild-level and takes effect the
instant it's written — no restart, no redeploy, ever, for a guild-level change.

### 23.2 Process-Level Core Configuration — Root Schema

Validated during Stage 02 (§8.2), before any module, any database connection
verification beyond this schema check, or any gateway connection is attempted. A
representative slice of the root schema's shape:

```
CODE REFERENCE 23-A — Root Config Schema (Representative Slice)

const rootConfigSchema = z.object({
 NODE_ENV: z.enum(['development', 'staging', 'production']),
 LOG_LEVEL: z.enum(['trace','debug','info','warn','error']).default('info'),

 BOT_TOKEN: z.string.min(1), // MUST be non-empty — empty token
 // crashes Stage 15 (DISCORD_LOGIN).
 // Example secrets must use <REPLACE_WITH_REAL_TOKEN>,
 // never ''.
 BOT_OWNER_IDS: z.string.transform(s => s.split(',')), // snowflakes, CSV
 DEV_GUILD_ID: z.string.regex(/^\d{17,20}$/), // REQUIRED snowflake
 // (17-20 digits) — an unset or malformed value
 // fails Stage 02 with a field-level Zod error:
 // there is no optional mode that silently
 // disables the entire Admin tier

 DATABASE_URL: z.string.url,
 DATABASE_POOL_MAX: z.coerce.number.default(10),
 DATABASE_STATEMENT_TIMEOUT_MS: z.coerce.number.default(10_000),
 // CAUTION: Drift across environments (Dev: 30000, Staging: 10000,
 // Prod: 5000) causes production-only failures. A query taking 8s times
 // out in production but passes in staging/dev. Config drift detection needed.
 DATABASE_REPLICA_URLS: z.string.optional, // CSV, optional
 DATABASE_REPLICA_MAX_LAG_MS: z.coerce.number.default(1_000),
 DATABASE_SSL: z.coerce.boolean.default(false), // TLS to PostgreSQL —
 // wired into the Knex pool's ssl option (primary
 // and read replicas) at Stage 05

 REDIS_URL: z.string.url,
 REDIS_TLS: z.coerce.boolean.default(false), // TLS to Redis — wired into
 // the Redis client's tls option at Stage 07
 HEALTH_PORT: z.coerce.number.default(3000),

 CREDENTIALS_SERVICE_PORT: z.coerce.number.default(8086), // the Credentials
 // Service listen port — read by
 // src/entry/credentials.ts; never
 // hardcoded in the entrypoint (§22.8)

 INTERNAL_API_KEY: z.string().min(NODE_ENV === 'production' ? 32 : 1),
 // the shared service-to-service key for every
 // /internal/* surface (§22.5) — at least 32
 // characters in production; compared
 // timing-safely, never logged, never in a URL

 SHARD_COUNT: z.coerce.number.int.min(1).default(1),
 SHARD_RANGE: z.string.optional, // parsed only when SHARD_COUNT > 1
 // (§26.4) — "0-3" or "0,2,5"; a range whose
 // endpoints fall outside 0..SHARD_COUNT-1,
 // reversed bounds, or non-numeric tokens fail
 // Stage 02 with a Zod error

 RATE_LIMIT_USER_WINDOW_MS: z.coerce.number.default(60_000),
 RATE_LIMIT_USER_MAX: z.coerce.number.default(10),
 RATE_LIMIT_GUILD_WINDOW_MS: z.coerce.number.default(60_000),
 RATE_LIMIT_GUILD_MAX: z.coerce.number.default(100),

 CACHE_L1_MAX_ENTRIES: z.coerce.number.default(5_000),
 CACHE_L1_MAX_BYTES: z.coerce.number.default(50 * 1024 * 1024),

 // Telemetry must be opt-in (fail-safe off by default). Boolean env vars
 // should use explicit parseBoolean — not strict === 'true' — to handle
 // case variations and unset variables without silently enabling telemetry.
 TELEMETRY_ENABLED: z.coerce.boolean.default(false),
 TRACE_SAMPLE_RATE: z.coerce.number.min(0).max(1).default(0.1),
 SLOW_QUERY_THRESHOLD_MS: z.coerce.number.default(500),
 CRITICAL_QUERY_THRESHOLD_MS: z.coerce.number.default(2_000),
 EVENT_LOOP_LAG_SHED_THRESHOLD_MS: z.coerce.number.default(50),

 EVENT_BUS_MAX_EMIT_DEPTH: z.coerce.number.default(20),
 SHARD_LOCK_HEARTBEAT_MS: z.coerce.number.default(10_000),
 SHARD_LOCK_RETRY_MS: z.coerce.number.default(2_000),
});
```

Every key declared in the root schema has either a live consumer or an explicit
operator-runbook entry: CI diffs the schema's keys against the code that reads
them and the operator runbook's documented operator-only keys, and a declared
key with neither a consumer nor a runbook entry fails the build — a key nothing
reads is removed, not parked (the same discipline §22.3 applies to control-plane
shared state). `CREDENTIALS_SERVICE_PORT` defaults to 8086 and is the single
source of the Credentials Service's listen port; `INTERNAL_API_KEY` must be at
least 32 characters in production and is rejected at Stage 02 otherwise.

Privileged Discord intents are additionally gated by a fixed whitelist validated
at Stage 02 (§5.6): `MessageContent`, `GuildMembers`, and `GuildPresences` anywhere
in the resolved intent set — a module manifest's `intents` array or the process
configuration — fail validation with a `ConfigurationError` naming the offending
intent, rather than being accepted silently.

A missing required field or a value failing its refinement (an out-of-range number, a

> **Validation bypass:** Zod schemas using `z.record(z.unknown)` accept
> any nested structure — malformed data passes validation but crashes at
> runtime. Strict recursive Zod schemas with no `z.unknown` escape
> hatches, or runtime validation on first access, are needed.

A missing required field or a value failing its refinement (an out-of-range number, a
malformed URL) produces a field-by-field Zod error printed to stderr before the
process exits — never a downstream `undefined` surfacing as a confusing runtime
symptom three subsystems away from its actual cause. The full variable reference,
every default included, is consolidated in Appendix A (§48.1).


The root schema exports its complete key set as `ENV_KEYS` — the single
machine-readable list of every environment variable the process consumes — which the
configmap-sync CI check (§41.2) diffs against the Kubernetes configmap and
`.env.example`, so a key dropped from the schema, added to the configmap, or missing
from either is a CI failure rather than a silent gap discovered in production.

Transport security for the two state stores is first-class configuration:
`DATABASE_SSL` enables TLS on the PostgreSQL pool (read replicas included) and
`REDIS_TLS` on the Redis client, both wired into their connection managers rather
than accepted and ignored. No unused key-bearing variables are carried in the
schema: key material belongs to the §32.7 envelope-encryption hierarchy (a root key
from the secret store unwrapping per-record data keys), and nothing else reads an
`ENCRYPTION_KEY_*` variable; no `JWT_SIGNING_KEY` exists at all — the HTTP surface
authenticates with Credentials-Service-issued bearer tokens and HMAC shared secrets
(§32.3), not JWTs — so an env var with no consuming subsystem is removed from the
schema rather than parked.

#### Design Consideration — Docker vs K8s Port & Adapter Default Reconciliation

The Docker Compose file, Kubernetes configmap, and `.env.example` should agree on port numbers and adapter defaults, so an operator moving between local and cluster contexts is not silently misconfigured by a stale default.

### 23.3 Guild-Level Configuration

`guild_configs` holds one row per guild, keyed by `guildId`, with a `settings` JSONB

 JSONB schema evolution over `settings` MUST be backward-compatible: new fields are optional with defaults, and a newly-added field never turns an existing valid row into a read-time validation failure. Any non-additive change requires a pre-deployment data migration that backfills existing rows before the new schema is deployed.
column validated against a Zod schema on every write and deserialized against that
same schema on every read — so a value that made it into the column always conforms
to the current schema shape, and a schema evolution (a new optional field, a renamed
key handled through a migration) never produces a read-time surprise. The read path's
full cache cascade — L1 in-process LRU, then Redis L2, then PostgreSQL — is specified
in §6.4 and applies identically here; §23.1's "takes effect immediately" claim depends
on the write path's synchronous cache invalidation, specified in general form in
§13.4 and applied to `guild_configs` the same way.

```
CODE REFERENCE 23-B — Guild Config Schema (Representative Slice)

const guildConfigSchema = z.object({
 locale: z.string.default('en-US'),
 timezone: z.string.default('UTC'),
 prefix: z.string.max(5).optional, // display-only convenience value;
 // never a functional command prefix (§4)
 moderation: z.object({
 logChannelId: z.string.regex(/^\d{17,20}$/).optional,
 muteRoleId: z.string.regex(/^\d{17,20}$/).optional,
 }).default({}),
 channelRestrictions: z.record(z.string, z.object({
 mode: z.enum(['allow', 'deny']),
 channelIds: z.array(z.string),
 })).default({}),
 premiumEnabled: z.boolean.default(false),
});
```

Every module-specific setting a guild administrator can tune lives inside this same
document, namespaced under the module's own key — a module never gets its own
separate guild-scoped table for simple configuration values, keeping "where is this
guild's setting stored" a single, uniform answer regardless of which module owns the
setting.

### 23.4 Process-Level Module Configuration

A module's own `config` manifest field (§11.2) declares a Zod schema for *process*-
level values that module needs — not guild-tunable settings (those go through
§23.3), but deployment-level parameters like an external API key a specific module
integrates with, or a hard operational ceiling like `reminders`'s
`MAX_REMINDER_HORIZON_DAYS` from the worked example (§12.5). These validate at Stage
11 alongside the manifest itself, using environment variables prefixed with the
module's own name in `SCREAMING_SNAKE_CASE` — `REMINDERS_MAX_HORIZON_DAYS`, for
instance — so no two modules can collide on a variable name, and a misconfigured
module-level value is caught at the same startup stage a misconfigured manifest is,
rather than surfacing as a confusing runtime failure the first time that module's code
path actually runs.

### 23.5 Configuration Audit Trail

Every write to `guild_configs` — whether via a command, MDIS, or an internal
migration — is recorded in `audit_logs` (§24.2) with the specific diff: which keys
changed, their old and new values, the acting user, and a timestamp. This is what
makes "who changed this setting and when" answerable for any guild without needing to
reconstruct it from command logs scattered across whichever module happened to expose
the setting — one table, one query, regardless of which module or interface made the
change.

State externalization constraint: user-visible state never lives in a single process's memory. Processes are stateless; PostgreSQL (Knex) is the durable store and Redis (ioredis) carries cache and shard-ownership locks with TTL. Degradation is graceful: Redis down falls through to PG, and shard locks fall back to TTL expiry.

- Spec: stateless processes, shard-ownership locks (Redis with TTL), graceful degradation under partial outage (Redis down → fall through to PG; shard locks fall back to TTL; read replica lagging → router falls back to primary; one shard drops → isolated to that shard's guilds). Documented state-placement reference table. P95/P99 latency targets, error-rate alerting, cache hit-ratio monitoring, load testing as release gate. .

- Maintain as architectural principle; ensure no module stores cross-process state in memory.

The "encrypted license file" is replaced by an Effective Config Descriptor: a signed descriptor proving provenance — signed always (it came from Swastik, unaltered), encrypted only when a value is genuinely confidential — containing module id, build id, and resolved config, mounted read-only per module.

- Design: signed always (proves it came from Swastik, unaltered); encrypted only if a value is genuinely confidential. Contents: module id, build id, resolved config (manifest defaults + live policy overrides), approval status, approver, timestamp, revocation flag. Mounted read-only into the module's own sandbox. The registration row (dev id ↔ module id ↔ approval status) "does nothing but existing" — stays as designed.

- Implemented and mounted read-only per module.

## 24. Database Architecture

**Status:** [SPEC]

### 24.1 Why PostgreSQL

§5.8 covers the storage role split at the stack-decision level; the concrete reasons
PostgreSQL specifically — rather than a document store or a lighter embedded database
— fits this architecture: **JSONB** gives `guild_configs` schema flexibility without
sacrificing relational integrity for every table that *is* strictly relational (cases,
audit entries, module state); **transactions** guarantee a multi-table write (a
moderation case plus its infraction record plus an audit entry) either fully commits
or fully rolls back; **row-level locking** (`SELECT .. FOR UPDATE`) prevents two
concurrent commands from double-processing the same target row — two moderators
clicking "Ban" on the same user within the same second resolve deterministically
rather than racing; and **`LISTEN`/`NOTIFY`** provides a lightweight, no-extra-
infrastructure channel for cross-process cache-invalidation signaling as a fallback
alongside Redis pub/sub (§25.4).

### 24.2 Complete Schema Reference

```
SCHEMA 24-A — Core Tables (Owned by the Application Core, Never a Module)

guilds
 id snowflake PK
 name string
 joinedAt timestamptz
 leftAt timestamptz, nullable -- non-null ⇒ bot no longer present;
 -- Layer 3 (§21.2) denies on this
 shardId integer

users
 id snowflake PK
 globalBanned boolean default false -- platform-wide, independent of
 -- any guild-scoped blacklist entry

guild_configs
 guildId snowflake PK, REFERENCES guilds(id)
 settings jsonb -- validated against the schema in §23.3
 createdAt / updatedAt / createdBy / updatedBy -- standard audit columns (§24.5)

guild_roles -- Layer 7 grant-scope groups (§21.4); ranks are
 -- never written (Layer 6 evaluates them from live
 -- Discord state, §21.3)
 id uuid PK
 guildId snowflake REFERENCES guilds(id)
 groupName string
 discordRoleIds snowflake[] -- bundled into one grant scope
 createdAt / updatedAt / createdBy / updatedBy

guild_module_states -- full reference at §13.4
 guildId, moduleSlug composite PK
 tier / status / wasStandardDefault / installedAt / disabledAt / dataRetentionPolicy
 createdAt / updatedAt / createdBy / updatedBy

grants -- Layer 7 guild-side grants (§21.6); module commands only
 id uuid PK
 guildId snowflake
 targetType 'user' | 'role' | 'group' | 'set' -- scope precedence
 -- role > group > set, most-specific wins (§21.4)
 targetId text -- snowflake for user/role, group/set name otherwise
 scopeType 'command' | 'module'
 scopeName string
 grantType 'permit'|'blacklist'|'whitelist'|'cooldown'|'rate-limit'
 grantValue jsonb -- e.g. { "maxPerDay": 5 } for a rate-limit grant
 createdAt / updatedAt / createdBy / updatedBy

blocked_users -- Layer 2 blacklist (§21.2)
 id uuid PK
 userId snowflake
 guildId snowflake, nullable -- null ⇒ global platform-wide block
 reason text
 blockedBy snowflake
 blockedAt timestamptz
 expiresAt timestamptz, nullable

audit_logs -- append-only, never updated
 id uuid PK
 source string -- 'PEP' | 'SWASTIK' | 'CLAI' | 'GUILD' |
 -- 'MDIS' | a module's own name
 actorId snowflake or service-identity string
 action string
 targetType / targetId
 beforeState / afterState jsonb, nullable each
 reason text, nullable
 timestamp timestamptz

developers -- Swastik (§15.6–§15.7)
 devId string PK (opaque identifier; the secret itself is
 Argon2id-hashed, never stored raw)
 username string
 licenseState 'pending' | 'under-review' | 'approved' |
 'suspended' | 'restored' | 'revoked'
 -- the six-state license machine (§15.7); the manifest's
 -- devId must equal the license's subject
 registeredAt / approvedAt / approvedBy

builds -- Swastik (§15.8)
 buildId string PK
 devId string REFERENCES developers(devId)
 moduleSlug string
 version string -- semver
 validationStatus 'pending'|'passed'|'rejected'
 sourceArchiveHash / artifactHash / lockfileHash / gateResultsHash
 sbom jsonb -- machine-readable dependency inventory
 signature text -- Ed25519 over the artifact bytes + provenance tuple
 signatureKeyId string
 signedDescriptor jsonb -- signed Effective Config Descriptor (§15.8)
 promotedAt timestamptz, nullable

marketplace_listings -- Marketplace catalog (§16.4)
 moduleSlug string PK
 devId string REFERENCES developers(devId)
 category enum -- audio|community|security|integrations|utility
 description string
 signatureValid boolean -- false ⇒ revoked (§16.4); load refused
 listedAt

metering_usage_daily -- MTP (§31.4)
 guildId, date composite PK
 metricUnitsConsumed integer
 breakdown jsonb -- per-module contribution to the day's total
```

Every module-owned table — `reminders`, `cases`, `infractions`, and every table any
other module's migrations create — lives in this same database but is never listed
here: it belongs exclusively to its owning module (Principle P2), created by that
module's own migrations (§24.4), and is invisible to this reference's core schema
precisely because the core has no business knowing it exists beyond the generic
migration-tracking table every module's migrations register against.

**13 Partial Features: DB Migration Exists But No Service Class**
13 features have database tables but no service class. Named examples: `metering_usage_daily`, `backup_history`, `guild_outbound_webhooks`, `webhook_deliveries_idempotency`, `mtp_token_ledger_daily`.

Each table has a corresponding service class with CRUD/business logic, registered in the DI container, with tests.

**Build Provenance Metadata Schema**
Build provenance is stored on every accepted build as the `builds` provenance columns
declared above — `sourceArchiveHash`, `artifactHash`, `lockfileHash`,
`gateResultsHash`, `sbom`, `signature`, `signatureKeyId`, `signedDescriptor` — and
verified at load (§15.8).

**BullMQ/Redis Fallback (Single Point of Failure Unresolved)**
No DB-backed fallback; Redis SPOF acknowledged.

Postgres-backed fallback for job state.

**`guild_command_queue` table exists with no processing logic (~10%)**
The `guild_command_queue` table exists (migration M018) and is declared Tier 1, but no processing logic is wired. The implementation inventory, however, records `GuildCommandChangeQueue` and `GuildCommandChangeScheduler` as implemented — indicating the wiring may exist in the unified command tree but is not connected to the bootstrap command path.

GuildCommandChangeScheduler.start invoked from bootstrap, processing the queue on interval.

**Distributed cron locking (~60%)**
Primitives exist; usage unconfirmed. Missing ~40% (verified usage).

Scheduler wraps each cron task in `RedisLockStore.acquire`.

**Infrastructure Primitives Exist But No Higher-Level Logic**
Read-replica routing, shard ownership handoff, PgBouncer config, and distributed cron locking have infrastructure primitives (RedisLockStore, Knex pooling) but not the higher-level logic that uses them.

Read-replica routing logic, shard handoff arbitration, PgBouncer connection pooling, and distributed cron lock acquisition all implemented and tested.

**Marketplace review pipeline / MTP ledger / Webhook delivery (compliance #9,21,23,38)**
Custom outbound webhook delivery — `guild_outbound_webhooks` migration, no delivery service (PARTIAL #9; see also ). Webhook delivery idempotency — `webhook_deliveries_idempotency` migration + RedisLockStore SET NX EX, no delivery code using it (PARTIAL #21). Marketplace review pipeline — `marketplace_listings` migration, no review service (PARTIAL #23). MTP synthetic token ledger — `mtp_token_ledger_daily` migration, no MTP service (PARTIAL #38).

Services implemented or formally deferred.

**Multi-tenant resource metering (compliance #1)**
`metering_usage_daily` migration exists; no MeteringService class found; table exists but no service code.

MeteringService writing to `metering_usage_daily`.

**Dev ID / Dev Token split (devId as cryptographic secret, not public certificate).** Dev ID / Dev Token split: the Dev ID is a public identifier (safe in manifests, URLs, logs, licensing) while the Dev Token is a private bearer secret with Discord-token discipline — issued once, shown once, stored server-side only as a hash, sent only via `Authorization: Bearer`, never logged (Pino redaction, §24.2).

- Design specifies Dev ID (public UUID) + Dev Token (private bearer, issued once, shown once, stored server-side as hash only, sent only via `Authorization: Bearer`, never in URL/manifest/module code, revocable, rotatable, optionally scoped per module). Account creation requires manual approval + MFA..

- Enforced secrecy — devId never appears in any public artifact. PDF certificates contain only buildId and human-readable license text.

### 24.2.1 Audit Log Partitioning & Retention

`audit_logs` is append-only and grows without bound; at high write volume it can fill the database disk and stall PostgreSQL. The table MUST be range-partitioned by `created_at` (PostgreSQL declarative partitioning, e.g. `pg_partman`), with an automated retention policy archiving and dropping partitions older than the configured retention window (default 90 days, archived to cold storage). No partition is ever truncated in place; retention is partition-drop only.

### 24.3 The Repository Pattern

> **ADR-005 contradiction:** ADR-005 claims "no dynamic require/import
> of unknown paths" as a sandbox mitigation, but `swastik-loader.ts:77`
> performs exactly that — a dynamic import of a runtime-determined path.
> The ADR understates the arbitrary-code-execution risk and must be
> rewritten to acknowledge the dynamic import honestly.

`BaseRepository<T>` is the sole abstraction over Knex — every module's own repository

> **Compliance #40 violation:** Bootstrap and migration paths use raw Knex
directly (SELECT 1 health check, migration runs). Migrations are an
unavoidable exception, but non-migration raw Knex in business logic
bypasses slow-query logging and circuit-breaker integration.

— every module's own repository
classes extend it, inheriting a typed CRUD surface rather than hand-writing query

classes extend it, inheriting a typed CRUD surface rather than hand-writing query
boilerplate for the common cases.

> **Compliance #40 violation:** Bootstrap, admin routes, and entry points
> use raw `db.knex('table')` calls (e.g. `guild_module_states`,
> `audit_logs`), bypassing BaseRepository. This risks N+1 queries,
> missing-index misuse, and audit-trail inconsistency. All DB access
> must route through repositories.
boilerplate for the common cases.

```
CODE REFERENCE 24-A — BaseRepository Surface

abstract class BaseRepository<T extends { id: string | number }> {
 protected abstract table: string;
 constructor(protected readonly db: IDatabaseManager) {}

 async findById(id: T['id']): Promise<T | null>;
 async findMany(filter: Partial<T> & RangeFilters<T>, opts?: QueryOptions):
 Promise<{ records: T[]; total: number }>;
 async create(data: Omit<T, 'id' | 'createdAt' | 'updatedAt'>): Promise<T>;
 async updateById(id: T['id'], data: Partial<T>): Promise<T | null>;
 async deleteById(id: T['id']): Promise<boolean>;

 // Escape hatch for genuinely bespoke queries, still routed through the

 // CAUTION: The Swastik loader (swastik-loader.ts:77) performs a dynamic
 // import of a runtime-determined path — this contradicts ADR-005's claim
 // of "no dynamic require/import of unknown paths." The ACE risk is
 // larger than the ADR admits and must be acknowledged or sandboxed.
 // Escape hatch for genuinely bespoke queries, still routed through the
 // same connection/replica logic as everything above — never raw pg
 protected queryBuilder: Knex.QueryBuilder<T>;
}
```

A repository method never emits an event, never applies a business rule, and never
calls another module's repository directly (§11.5's three-layer rule, §11.6's
isolation rules) — its entire surface is data access, nothing else. Cross-table
transactions spanning multiple repositories are owned by the **service** layer, which
receives a `TransactionManager` and passes the transaction context down into each
repository call explicitly — a repository is never responsible for deciding when a
transaction begins or commits, only for participating in one it's handed.

```
CODE REFERENCE 24-B — Service-Owned Transaction

async banAndLogCase(input: BanInput): Promise<Case> {
 return this.txManager.transaction(async (trx) => {
 await this.discordApi.banMember(input.guildId, input.userId);
 const caseRecord = await this.caseRepo.create(input, trx);
 await this.auditRepo.create({ ...auditFields, caseId: caseRecord.id }, trx);
 return caseRecord;
 });
 // if ANY step throws, the whole transaction rolls back — no partial case
 // record ever exists without its corresponding audit entry
}
```

### 24.4 Migrations

Every module owns its own `migrations/` directory (§11.4); `MigrationRunner`
(Bootstrap Stage 06) executes **core migrations first, then module migrations**, each

, each group ordered by a topological sort over declared module dependencies rather than alphabetical filename order, so a migration that references another module's table cannot run before that table exists. Deferred/deferrable foreign-key constraints are applied where a strict topological order is impossible
group in declared order, tracked in a shared `knex_migrations` ledger table recording
what has already run so re-running the process never re-applies a completed
migration. Every migration file exports both `up` and `down` — a migration without

, and before promotion Swastik MUST run a disposable-DB migration dry-run: spin up a disposable Postgres, run `up` then `down`, check idempotency, scan for forbidden raw SQL, and verify a clean rollback — reporting the result to the developer. Migrations MUST NOT run live at bot startup as the first validation of `up`/`down` correctness; only Gate 4 manual review currently checks `down` presence
a working `down` fails Gate 4 of the community review pipeline (§16.4) for any
third-party submission, and is a code-review blocker for a first-party one, since an
irreversible migration is exactly the kind of one-way door Principle P10 (§3) exists
to prevent.

### 24.5 Standard Audit Columns

Every entity table in the system — core-owned and module-owned alike — carries the
same four columns, in the same order, with the same semantics, so "who created or last
touched this row, and when" is answerable identically regardless of which table is
being inspected:

```
createdAt timestamptz, not null, default now
updatedAt timestamptz, not null, default now, bumped by application code
 (never a database trigger — the application layer is the one place
 that knows *why* an update happened, which the audit_logs entry
 for the same change depends on)
createdBy snowflake or service-identity string, nullable (null ⇒ system-
 generated, e.g. a backfill migration)
updatedBy snowflake or service-identity string, nullable
```

### 24.6 Read/Write Routing & Slow Query Logging

Every write goes to the primary, unconditionally. Reads route to a configured replica
when `DATABASE_REPLICA_URLS` is set, **unless** the calling code explicitly requests
primary-consistency — a read immediately following a write in the same logical
operation (reading back a row a transaction just committed) always targets the
primary, since a replica's replication lag could otherwise return stale data to code
that just wrote the authoritative version. `DATABASE_REPLICA_MAX_LAG_MS` (default
`1000`) bounds how stale a replica is permitted to be before the router stops sending
it traffic and falls back to the primary automatically — measured by polling the
replica's own replication-lag metric, not inferred from query latency.


`DATABASE_SSL` (§23.2) is wired into the `ssl` option of both the primary and the
read-replica pools, and `REDIS_TLS` into the Redis client's `tls` option — the flags
are consumed by the connection managers that own those clients, never parsed and
dropped.

`QueryLogger` wraps every query with duration tracking against two independent
thresholds: `SLOW_QUERY_THRESHOLD_MS` (default `500`) logs at `warn` with the query
shape (parameterized, never with literal bound values, to avoid ever logging sensitive
data incidentally passed as a parameter) and duration; `CRITICAL_QUERY_THRESHOLD_MS`
(default `2000`) logs at `error` and increments a dedicated Prometheus counter feeding
directly into the alerting rules specified in §27.3. Both thresholds are independent
of the general command-latency SLOs (§33.5) — a query can comfortably clear the
critical threshold while the command it's part of still breaches its own end-to-end
latency target, and each is instrumented and alerted on separately so an incident
investigation can distinguish "the database is slow" from "the handler is slow for
some other reason" immediately rather than by elimination.

### 24.7 Connection Pool Tuning

The database connection pool is a critical performance component. The pool size determines how many concurrent database operations the bot can perform. If the pool is too small, operations queue up and latency increases. If the pool is too large, the database is overwhelmed and performance degrades.

The optimal pool size is calculated using the formula: pool_size = (average_query_duration * peak_queries_per_second) / (1 - safety_factor). For example, if the average query duration is 10 milliseconds, the peak query rate is 100 queries per second, and the safety factor is 0.2 (20 percent headroom), the pool size is (0.01 * 100) / (1 - 0.2) = 1 / 0.8 = 1.25, rounded up to 2. In practice, the minimum pool size is 5 (to handle burst traffic) and the maximum is 20 (to prevent overwhelming the database).

The idle timeout determines how long an idle connection is kept before being closed. The default is 30 seconds — connections that have not been used for 30 seconds are closed to free resources on the database. The connection timeout determines how long the pool waits for a connection before timing out. The default is 10 seconds — if no connection is available within 10 seconds, the query fails with a timeout error.

### 24.8 Query Optimization

Database query optimization is essential for maintaining performance as the dataset grows. The following strategies are used to optimize queries.

Indexing: all frequently queried columns are indexed. The guild_id column is indexed on all guild-scoped tables (module_state, permissions, audit_logs, analytics_events). The user_id column is indexed on all user-scoped tables. The module_name column is indexed on module_state. Composite indexes are used for multi-column queries (e.g., guild_id + module_name on module_state). Indexes are created via Knex migrations and are visible in the migration files.

Query projection: the query selects only the needed columns. Instead of SELECT * (which fetches all columns), the query fetches only the columns that the module needs. This reduces data transfer and memory usage.

Cursor-based pagination: instead of OFFSET/LIMIT (which becomes slow as the offset grows), cursor-based pagination uses a cursor (typically the primary key) to fetch the next page. The query WHERE id > cursor ORDER BY id LIMIT pageSize is efficient regardless of the page number.

Batch queries: instead of N+1 queries (fetching related entities one at a time), batch queries fetch all related entities in a single query. Knex joins fetch related entities in a single query (a JOIN, or a separate query with an IN clause).

Read replicas: read queries are automatically routed to read replicas by the DatabaseService. This distributes the read load across multiple database instances, reducing the load on the primary.

### 24.9 Schema Partitioning

Large tables (audit_logs, analytics_events) are partitioned by date to maintain query performance as data grows. Monthly partitions ensure that queries for recent data scan only the current month's partition, not the entire table.

The partitioning strategy uses PostgreSQL's native partitioning (DECLARATIVE PARTITIONING). The parent table is partitioned by RANGE on the timestamp column. Each partition covers one month. A monthly background job creates the next month's partition before the current month ends. Old partitions are dropped after the retention period (365 days for audit_logs, 90 days for analytics_events).

### 24.10 Transaction Management

Dumby uses Knex's transaction support for operations that require atomicity. A transaction ensures that either all operations succeed (commit) or none succeed (rollback). This prevents partial updates that could leave the database in an inconsistent state.

The interactive transaction pattern is used for complex transactions: knex.transaction(async (trx) => { .. }). The transaction object (trx) is used for all database operations within the callback. If the callback throws an error, the transaction is rolled back. If the callback completes without error, the transaction is committed.

The timeout for interactive transactions is 5 seconds (configurable). If a transaction exceeds the timeout, it is rolled back and a TransactionTimeoutError is thrown. This prevents long-running transactions from holding locks and blocking other operations.

### 24.11 Database Monitoring

The database is monitored through prom-client metrics. The following metrics are collected: dumby_db_query_duration_seconds (histogram, labeled by table and operation) and dumby_db_pool_active_connections (gauge) from the core metric catalog (§27.3), together with pool-size, pool-idle, and per-replica lag gauges for the read-replica fleet (§24.6).

Slow queries (taking more than 100 milliseconds) are logged at the warn level with the query text and duration. The slow query log is reviewed weekly and queries are optimized by adding indexes, rewriting queries, or changing the data access pattern.

The connection pool is monitored for exhaustion. If the active connection count exceeds 80 percent of the pool size, a warning is logged. If it reaches 100 percent, an error is logged and the pool size is increased (either automatically by the HPA or manually by the bot owner).

---

---

## 25. Caching Architecture

**Redis High Availability — Architectural Requirement.** Redis serves as the L2 cache, BullMQ queue backing store, cross-shard pub/sub, and shard-ownership lock store — four critical coordination concerns in a single service. A single-instance Redis is a coordination failure point that can cascade into shard ambiguity and queue loss. For multi-pod production deployments, a Redis HA topology (Cluster mode or Sentinel, managed via ElastiCache/MemoryStore or self-hosted) is a **mandatory architectural requirement**, with documented failover behavior, split-brain prevention, and an SLO target of Redis availability ≥ 99.95%. The graceful-degradation table (cache falls through to PostgreSQL; shard locks fall back to TTL) covers transient outages; the HA topology eliminates the persistent single-point-of-failure risk.

**Status:** [SPEC]

### 25.1 Two-Tier Design

```
DIAGRAM 25-A — L1 / L2 Cascade (generalized form of §6.4's config-specific example)

 Request for key K
 │
 ▼
 L1 — in-process LRU (CACHE_L1_MAX_ENTRIES=5000, CACHE_L1_MAX_BYTES=50MB)
 Sub-millisecond; scoped to ONE process — a fleet of N pods holds up to N
 independent copies of the same hot key, which is the deliberate trade:
 L1 optimizes single-process latency at the cost of instant fleet-wide
 consistency, which is exactly what L2's invalidation broadcast (§25.3)
 exists to bound.
 │ miss
 ▼
 L2 — Redis, shared fleet-wide
 Single-digit-millisecond; one authoritative cached copy every pod reads
 │ miss
 ▼
 Origin — PostgreSQL (primary or replica, per §24.6's routing rules)
 Populates L2, then L1, on the way back out
```

`CacheManager` exposes one unified API over both tiers — `get`, `set`, `invalidate` —
so calling code never manages L1 and L2 as two separate concerns; the cascade and the
backfill-on-miss behavior are internal to the manager.

### 25.2 Key Namespacing Convention

```
{domain}:{entity}:{identifier}[:{sub-scope}]

 guild:config:{guildId}
 guild:module-state:{guildId}:{moduleSlug}
 user:profile:{userId}
 economy:balance:{guildId}:{userId}
 leaderboard:{guildId}:{period}
```

Namespacing by domain is what makes `flushCacheNamespace` (PEP's extended control
domain, §22.3) a targeted, prefix-based invalidation rather than an all-or-nothing
flush — an operator recovering from a stale-cache incident in one subsystem clears
exactly that subsystem's keys, leaving every other domain's cached data untouched.

### 25.3 Invalidation Strategies

```
TABLE 25-A — Invalidation Approach by Data Shape

┌────────────────────────┬─────────────────────────────────────────────────┐
│ Data Shape │ Strategy │
├────────────────────────┼─────────────────────────────────────────────────┤
│ Config-shaped (guild │ Write-through with synchronous invalidation: │
│ config, module state) │ the write transaction commits, THEN the cache │
│ │ key is deleted (never merely overwritten — a │
│ │ deleted key forces the next read to repopulate │
│ │ from source, which is simpler to reason about │
│ │ than keeping a cached copy in sync with a partial │
│ │ update) │
│ Frequently-changing │ Short, fixed TTL (seconds to low minutes), │
│ aggregate (leaderboards, │ accepting brief staleness rather than paying the │
│ usage counters) │ cost of invalidating on every contributing write │
│ Cross-process invalidation │ Redis pub/sub broadcasts an invalidation message │
│ (a write on Pod A must │ every pod subscribes to, so Pod B's and Pod C's │
│ clear Pod B's and Pod C's │ L1 copies of the same key are cleared within one │
│ L1 copy too) │ pub/sub round trip of the write, rather than │
│ │ waiting out L1's own TTL │
└────────────────────────┴─────────────────────────────────────────────────┘
```

### 25.4 Stampede Protection

Two complementary mechanisms guard against a cache-miss "thundering herd" — many

> **Failure mode — lock-holder crash:** if the lock holder crashes after acquiring the SETNX lock but before populating the cache, the lock persists until its TTL expires; concurrent waiters that exhaust their brief poll MUST NOT fall back to independent computation (which produces N duplicate database queries). They must continue to coalesce on the single in-flight recompute, and the fallback-to-compute path is permitted only after an explicit lease-expiry re-acquire, never merely on poll timeout.
concurrent requests for the same expired key all falling through to the database
simultaneously.

```
DIAGRAM 25-B — Stampede Guard

 MECHANISM 1 — Distributed Lock on True Miss
 Request hits L2 miss
 │
 ▼
 Attempt Redis SETNX 'lock:{key}' with a short TTL
 │
 ┌────┴────┐
 ACQUIRED NOT ACQUIRED (another process is already recomputing)
 │ │
 ▼ ▼
 Compute Poll briefly for the lock-holder to populate the cache;
 fresh if still empty after a bounded wait, proceed to compute
 value, independently rather than block indefinitely — a slow
 write origin query never cascades into every waiting request
 cache, timing out together
 release
 lock

 MECHANISM 2 — Probabilistic Early Refresh (avoids the miss entirely
 for a hot key under steady load)
 Every L2 read checks remaining TTL as a fraction of original TTL
 │
 remaining fraction < 0.15 (STAMPEDE_EARLY_REFRESH_THRESHOLD)?
 │ yes
 ▼
 Roll against 0.10 (STAMPEDE_REFRESH_PROBABILITY) —
 a probabilistic hit triggers an ASYNC background refresh while still
 serving the current, not-yet-expired value to THIS request
 │
 ▼
 Refreshes for a hot key are smoothed across the entire window before
 expiry, rather than concentrated in the instant it actually expires
```

The two mechanisms target different scenarios: Mechanism 2 prevents most true misses
from happening at all for consistently hot keys; Mechanism 1 bounds the damage on
whatever miss still gets through — a cold key on first request, a key whose refresh
lost the probabilistic roll every time, or an L1-only miss on a pod that just
restarted.

### 25.5 Negative Caching

A lookup that resolves to "does not exist" — a user record for someone who left the
guild, a case ID that was never valid — is cached as an explicit negative result with
its own, shorter TTL, rather than left uncached. Without this, a client repeatedly
querying for the same non-existent key (a malformed ID submitted by a user, a stale
reference in another guild's data) would hit the database on every single request,
indistinguishable at the cache layer from a legitimate cold key. `CacheManager`
represents a negative result with a dedicated sentinel value distinct from `null` used
for "not yet cached" — so a genuine cache miss and a cached negative result are never
confused with each other.

### 25.6 Observability

Every cache operation increments `dumby_cache_requests_total{tier, result}` (`result`
∈ `hit` | `miss` | `negative_hit`), feeding the hit-ratio targets in §13.8's
performance baselines and the alerting rules in §27.3 — a hit ratio drop is one of the
fastest available signals that a deployment's cache is misconfigured or under-
provisioned relative to its actual working set, well before that misconfiguration
shows up as elevated database load or degraded command latency.

## 26. State Externalization & Horizontal Scaling

**Status:** [SPEC]

### 26.1 The Core Constraint

No state whose loss or divergence would be user-visible is ever held only in a single
process's memory. Every pod in a deployment must be able to crash, restart, or be
replaced by an orchestrator at any moment without losing anything a user would notice
— which is only possible because everything that matters lives in PostgreSQL or
Redis, never in a process-local variable, a module-level singleton holding business
data, or an in-memory `Map` standing in for a database table. This is the structural
precondition for the zero-downtime rolling update mechanism (§33.2): a pod can be
replaced mid-operation specifically because nothing important was ever uniquely inside
it.

### 26.2 What Lives Where

```
TABLE 26-A — State Placement Reference

┌─────────────────────────────────┬────────────────────────────────────────┐
│ ALWAYS Externalized (PostgreSQL │ NEVER Externalized (process-local, │
│ or Redis) │ genuinely disposable) │
├─────────────────────────────────┼────────────────────────────────────────┤
│ Guild configuration │ L1 cache contents (a per-process │
│ Module enabled/disabled state │ accelerator over L2 — losing it costs │
│ RBAC groups, sets, and grants │ one cache-miss round trip, nothing more) │
│ Moderation cases, economy balances, │ In-flight command execution state (the │
│ every module's persisted business │ interaction itself is re-deliverable by │
│ data │ Discord if truly lost, though in practice │
│ Job queue state (BullMQ, Redis- │ the shutdown sequence's drain step, │
│ backed) │ §9.1, avoids this outright) │
│ Audit history │ Worker thread pool state (§15.2 — a │
│ Developer licensing and build │ pool is rebuilt fresh on process start, │
│ records │ never a source of truth for anything) │
│ Shard ownership locks (Redis, with │ Metrics counters BEFORE their periodic │
│ TTL — §26.4) │ scrape (Prometheus's own pull model │
│ │ tolerates this; nothing depends on a │
│ │ counter surviving a crash between scrapes) │
└─────────────────────────────────┴────────────────────────────────────────┘
```

### 26.3 Cross-Shard Coordination

§6.5 introduced the two mechanisms; the distinction that governs which to reach for is
frequency and latency tolerance. `client.shard.broadcastEval` serializes a function
and executes it across every shard in the fleet, collecting results — powerful, but
carrying meaningfully higher per-call latency than a hot-path primitive should, since
it requires a round trip to every shard and waits on the slowest one. It is reserved
for low-frequency, operator-triggered needs: computing a fleet-wide guild count on
demand, or forcing a targeted diagnostic across every shard during an incident. Redis
pub/sub handles everything routine or high-frequency instead — cache invalidation
broadcasts (§25.3), cross-shard presence updates, and any other signal that needs to
reach every pod but cannot tolerate `broadcastEval`'s latency profile at volume.

### 26.4 Shard Ownership Lock Model

Exactly one process may hold the live gateway connection for a given shard ID at any
moment — two processes connecting the same shard simultaneously risks duplicate event
processing and platform-level connection penalties. Ownership is tracked as a Redis
key per shard ID, written with a TTL and refreshed on a heartbeat:

```
DIAGRAM 26-A — Shard Ownership Lock Lifecycle

 Process starts, claims shard N
 │
 ▼
 SET 'shard-lock:{N}' {processId} NX EX {ttl}
 │
 ┌────┴────┐
 ACQUIRED NOT ACQUIRED (another live process already owns shard N)
 │ │
 ▼ ▼
 Connect Do NOT connect this shard; retry acquisition every
 gateway SHARD_LOCK_RETRY_MS (default 2,000 ms) — this is the
 for shard N expected, normal path during a rolling update's brief
 │ overlap window between an old pod and its replacement
 ▼
 Heartbeat: refresh the lock's TTL every SHARD_LOCK_HEARTBEAT_MS
 (default 10,000 ms) for as long as this process holds the shard
 │
 ▼
 Process shuts down gracefully (§9.1, Step 01) → lock released explicitly
 OR
 Process crashes without releasing → lock expires naturally once its TTL
 lapses (bounded by the heartbeat interval — never longer than one missed
 heartbeat's worth of staleness) → another process's next retry attempt
 succeeds
```

**Shard spawn configuration.** `SHARD_COUNT` and `SHARD_RANGE` are process-level
configuration (§23.2): when `SHARD_COUNT > 1`, the entrypoint parses `SHARD_RANGE`
(e.g. `0-3` or `0,2,5`) and passes `shards` and `shardCount` to the discord.js
`Client` options, so the process connects exactly the range it claims under the
ownership lock above; a malformed or out-of-range `SHARD_RANGE` — endpoints outside
`0..SHARD_COUNT-1`, reversed bounds, non-numeric tokens — fails fast at Stage 02
with a Zod error rather than booting a mis-sharded client.

This is what makes the rolling-update handoff in §33.2 safe: a new pod's attempt to
claim a shard the outgoing pod still legitimately owns simply retries on the interval
above until the outgoing pod's graceful shutdown releases the lock explicitly —
there is never a window where both pods believe they own the same shard
simultaneously.

### 26.5 Graceful Degradation Under Partial Outage

```
TABLE 26-B — Behavior Under Each Partial Outage

┌────────────────────────┬───────────────────────────────────────────────┐
│ Outage │ Behavior │
├────────────────────────┼───────────────────────────────────────────────┤
│ Redis unreachable │ L2 cache and shard-lock heartbeats both fail. │
│ │ Cache reads fall through to PostgreSQL directly │
│ │ (§13.8's Core-tier availability guarantee depends │
│ │ on this specifically); shard locks fall back to │
│ │ their last-known TTL and expire naturally — a │
│ │ prolonged Redis outage eventually risks shard │
│ │ ownership ambiguity, which is why Redis's own │
│ │ availability is treated as a first-class SLO │
│ │ target (§33.5), not merely an accelerator's │
│ │ uptime │
│ Read replica lagging │ Router falls back to the primary automatically │
│ beyond DATABASE_REPLICA_ │ once polled lag exceeds the threshold (§24.6) — │
│ MAX_LAG_MS │ never silently serves stale reads past the │
│ │ configured tolerance │
│ One shard's gateway │ Isolated to that shard's guilds only — every other │
│ connection drops │ shard, and every other pod, continues normally. │
│ │ discord.js's own reconnection logic handles the │
│ │ resume automatically in the common case │
└────────────────────────┴───────────────────────────────────────────────┘
```

# PART VI — RELIABILITY & OPERATIONS

---

## 27. Observability — Logging, Metrics & Tracing

**Status:** [SPEC]

### 27.1 Three Pillars, One Correlation ID

Every command execution, job run, and HTTP request generates a `correlationId` (a
UUID, bound to `CommandContext` by `TraceMiddleware` at priority 0, §19.2) that is
attached identically to every log line, every trace span, and — where relevant —
propagated into a job's own payload metadata when work is deferred to the queue.
Cross-signal correlation is therefore always a direct lookup — searching one ID in
logs, traces, and metrics-adjacent exemplars all resolve to the same request — never
a time-window approximation reconstructed after the fact.

```
DIAGRAM 27-A — One correlationId, Three Signals

 Command invoked
 │
 ▼
 correlationId = uuid
 │
 ┌────┼──────────────────────┬─────────────────────────┐
 ▼ ▼ ▼ ▼
 Pino child logger OTel root span Prometheus labels
 bound to attribute (traceId as exemplar
 correlationId, correlationId=.. on the histogram
 guildId, userId, observation, where
 moduleId, shardId the backend supports
 exemplars)
```

### 27.2 Structured Logging

Pino is the sole logger. Every log line is structured JSON to stdout — never
plain-text interpolation — which is what makes log aggregation (Loki, CloudWatch
Logs, a hosted ELK stack) queryable by field rather than by regex against free text.
A child logger is created once per request scope, pre-bound with the identifying
fields above, and handed to every layer of that request through `CommandContext.logger`
— a module author never manually attaches `correlationId` to a log call; it is already
there on every call made through the context-bound logger.

**Redaction.** Redaction is configured as Pino `redact` paths with deep
wildcards — `*.token`, `*.*.token`, `*.password`, `*.secret`, `*.authorization`,
`*.apiKey`, `*.webhookUrl`, `*.signingKey`, and the further-nested variants of each
(matched case-insensitively) — so a credential nested at any depth of a logged
object is scrubbed to `[REDACTED]` by the logger itself before any line is
serialized, regardless of how deeply nested the field is in a logged object.
This is enforced at the logger level specifically so a module author logging an entire
request payload for debugging purposes cannot accidentally leak a credential merely by
forgetting to strip it manually first — Principle P7 (§3) made structural rather than
left to individual discipline.

```
TABLE 27-A — Log Levels and Usage

┌────────┬──────────────────────────────────────────────────────────────┐
│ Level │ Usage │
├────────┼──────────────────────────────────────────────────────────────┤
│ trace │ Per-middleware-layer entry/exit — enabled only in targeted local │
│ │ debugging, never in a deployed environment by default │
│ debug │ Cache hit/miss detail, individual query timing below the slow │
│ │ threshold │
│ info │ Command invocation start/success, job completion, lifecycle │
│ │ transitions (module load/unload, bootstrap stage completion) │
│ warn │ A degraded-but-recovered condition: a rejected Admin-tier attempt, │
│ │ a slow query, a required:false module's onLoad failure │
│ error │ An unexpected error reaching the root error boundary, a critical │
│ │ query, a failed job exhausting its retries │
└────────┴──────────────────────────────────────────────────────────────┘
```

#### 27.2.1 Distributed Cron Lock Usage

Cron tasks acquire a distributed lock before execution so that only one scheduler instance runs a given job at a time across replicas.

**Mechanism:** Before dispatching a cron job, `queue/scheduler.ts` issues a `SET <lockkey> <token> NX EX <ttl>` against the `RedisLockStore`. If the lock is not acquired, the run is skipped. On completion, the holder releases the lock only if the token matches (safe against stale holders).

**Dependency:** `RedisLockStore`.
**Compliance:** feature #6.

### 27.3 Metrics

`prom-client` exposes Prometheus text format from `GET /metrics` (§44.2). The core
metric families every deployment gets without any module-specific instrumentation:

```
TABLE 27-B — Core Metric Families

┌─────────────────────────────────────┬────────────────────────────────────┐
│ Metric │ Type │ Labels │
├─────────────────────────────────────┼───────────┼──────────────────────────┤
│ dumby_commands_total │ Counter │ module, command, status │
│ dumby_command_duration_seconds │ Histogram │ module, command │
│ dumby_cache_requests_total │ Counter │ tier, result │
│ dumby_errors_unexpected_total │ Counter │ module (where attributable) │
│ dumby_queue_depth │ Gauge │ queueName │
│ dumby_queue_job_duration_seconds │ Histogram │ queueName, status │
│ dumby_db_pool_active_connections │ Gauge │ — │
│ dumby_db_query_duration_seconds │ Histogram │ table, operation │
│ dumby_shard_gateway_latency_ms │ Gauge │ shardId │
│ dumby_guild_module_active │ Gauge │ moduleSlug (fleet-wide count)│
└─────────────────────────────────────┴───────────┴──────────────────────────┘
```

Alerting rules built on these families feed the SLO targets specified in §33.5 — a
sustained drop in `dumby_cache_requests_total{result="hit"}`'s ratio, a rise in
`dumby_command_duration_seconds`'s P99 bucket, or a nonzero, climbing
`dumby_queue_depth` for a queue that should normally drain quickly are each early,
specific signals rather than a single generic "something is wrong" alert.

### 27.4 Distributed Tracing

`initTracing` is called during bootstrap Stage 04 (OBSERVABILITY_INIT, §8.2),
configuring the OpenTelemetry SDK and its OTLP exporter before any middleware or
gateway activity begins. `TraceMiddleware` (priority 0) then opens a real root span
per command execution and automatically instruments child spans for anything
crossing a
meaningful boundary: every database query above `SLOW_QUERY_THRESHOLD_MS` (§24.6),
every job invocation, and every outbound HTTP call a module's service layer makes.
Spans export via OTLP to any compatible backend — Jaeger, Tempo, Honeycomb, or a
hosted APM product — configured purely through the standard OTLP exporter environment
variables, with no framework-specific export logic to maintain.

`TRACE_SAMPLE_RATE` (default `0.1`) governs what fraction of traces are actually
recorded and exported in a production deployment, trading complete visibility for
sustainable overhead and storage cost at volume; every span belonging to a request
that also produces an `error`-level log line is sampled unconditionally regardless of
this rate, so a failing request is never the one that got sampled out.

### 27.5 Health Endpoints — Full Reference

§8.2's Table 8-B specifies the three health endpoints' relationship to the bootstrap
sequence in full; they are, in observability terms, the fourth signal alongside logs,
metrics, and traces — the one an orchestrator polls directly rather than one a human
operator queries during an investigation.

## 28. Error Management & Fault Tolerance

**Status:** [SPEC]

### 28.1 Error Taxonomy

`DumbyError` is the abstract base every recognized error extends — carrying a
machine-readable `code`, an HTTP-status-equivalent for logging/metrics
classification, a `userMessage` safe to surface in an ephemeral reply, and an
`isOperational` flag distinguishing an expected, handled failure mode from a genuine
bug. This is exactly the distinction the root error boundary's decision tree (§19.4)
branches on. Every user-visible failure surfaces through the formal notice frame
(§20.9): the buffer embed is edited into the merged failure/maintenance/unknown-command
presentation carrying a reason code drawn from this taxonomy and the interaction's
trace correlation ID — a failed command never leaves the buffer hanging, and never
shows a raw error message.

```
TABLE 28-A — The Eight Concrete Subclasses

┌────────────────────────┬────────────┬──────────────────────────────────┐
│ Subclass │ HTTP-Equiv. │ Represents │
├────────────────────────┼────────────┼──────────────────────────────────┤
│ ValidationError │ 400 │ Malformed or out-of-bounds input, │
│ │ │ caught in the command layer per the │
│ │ │ three-layer rule (§11.5); e.g. §12.4's │
│ │ │ REMINDERS_UNPARSEABLE_TIME │
│ PermissionDeniedError │ 403 │ Any authorization failure — Layers │
│ │ │ 4–7 of the permission engine (§21), │
│ │ │ or a module-level check like §19.3's │
│ │ │ REQUIRES_PREMIUM │
│ NotFoundError │ 404 │ A referenced resource doesn't exist │
│ │ │ (a case ID, a reminder ID) │
│ ConflictError │ 409 │ A state conflict — double-processing, │
│ │ │ an already-resolved case being closed │
│ │ │ again │
│ RateLimitExceededError │ 429 │ §21.5's global limiter or a command's │
│ │ │ own cooldown │
│ ExternalServiceError │ 502 │ A Discord REST call or a module's │
│ │ │ third-party integration failed │
│ ConfigurationError │ 500 │ A startup-time or dependency-graph │
│ │ │ integrity violation — the parent class │
│ │ │ for CircularDependencyError (§10.5), │
│ │ │ CommandKeyCollisionError (§17.3), and │
│ │ │ EventCycleError (§18.5) │
│ InternalError │ 500 │ Unexpected/uncategorized — what the │
│ │ │ root error boundary treats as the │
│ │ │ "UNEXPECTED" branch when a thrown error │
│ │ │ is not a recognized DumbyError at all │
└────────────────────────┴────────────┴──────────────────────────────────┘
```

`isOperational: true` on the first six means "this is a normal, expected outcome of
some input or state — reply with `userMessage` and move on." `ConfigurationError` and
`InternalError` default `isOperational: false` — both represent something structurally
wrong rather than a normal rejected request, and both are logged with full context and
alerted on rather than treated as routine.

### 28.2 Module Isolation

This reference establishes module- and handler-level isolation in three places, each
guarding a different execution path with the identical underlying philosophy — one
failure never cascades beyond the boundary that owns it. The five-vector leak model
(hot-reload zombies, silent event-bus subscribers, BullMQ worker retention, L1 cache
orbiters, orphaned closures retained by long-lived core references) extends to the
v5.0 surfaces with the same prevention mechanisms: the Renderer's per-render state is
per-interaction and unreferenced once the render is issued; buffer embeds hold no
module references; tier-volume promotions swap whole directories rather than mutating
live module state; and the per-guild pub/sub channels (§16.5) are cleaned up with the
guild's cache namespace. Leak-regression suites run in CI on every change that touches
an unload path, reload path, or the Renderer's lifecycle, so a new containment gap is a
failed build, not a production leak discovered at the next restart.

```
TABLE 28-B — Isolation Boundaries Across the System

┌──────────────────────┬──────────────────────────────────────────────────┐
│ Boundary │ Guarantee │
├──────────────────────┼──────────────────────────────────────────────────┤
│ Command execution │ The root error boundary (§19.4) catches everything │
│ │ inside one command's pipeline — a failing command │
│ │ never affects a concurrently-running one │
│ Gateway event handlers │ EventRouter wraps each registered handler in its │
│ │ own try/catch (§18.3) — one module's handler throwing │
│ │ never blocks another module's handler for the same │
│ │ event │
│ Module load/ready │ A required:false module's onLoad or onReady failure │
│ │ disables that module alone (§8.2, Stages 12 & 17) — │
│ │ startup and runtime both continue │
└──────────────────────┴──────────────────────────────────────────────────┘
```

### 28.3 Retry Policy — In-Request Utility vs. Job Retry

Two independent retry mechanisms exist in this architecture, deliberately not
unified into one, because they solve different problems:

```
TABLE 28-C — Two Retry Mechanisms, Never Composed

┌────────────────────┬─────────────────────────┬────────────────────────────┐
│ │ src/shared/utils/retry.ts │ BullMQ Job Retry (§29.4) │
├────────────────────┼─────────────────────────┼────────────────────────────┤
│ Scope │ Within a single synchronous │ Across a job's entire re- │
│ │ request/handler execution │ queue-and-re-execute lifecycle │
│ Typical delay │ Sub-second to low seconds │ Seconds to minutes │
│ Use case │ A flaky external call inside │ A job whose entire attempt │
│ │ a command handler — retry │ failed and needs a fresh, │
│ │ before the interaction's 3- │ later-scheduled attempt │
│ │ second response window │ │
│ │ closes │ │
│ Defaults │ maxAttempts: 3, baseDelayMs: │ attempts: 3, exponential │
│ │ 1000, maxDelayMs: 30000, │ backoff: 5s / 10s / 20s │
│ │ ±20% jitter │ │
│ Never composes with │ A handler retrying a call │ that itself lives inside a job │
│ the other │ processor would double the retry surface unpredictably — │
│ │ never nest one inside the other for the same operation │
└────────────────────┴─────────────────────────┴────────────────────────────┘
```

The jitter on the in-request utility exists specifically to prevent many concurrent
requests hitting the same transient failure from retrying in lockstep and
re-creating the exact load spike that caused the original failure.

### 28.4 Circuit Breaker

A service wrapping an external dependency — a third-party API a Marketplace module
integrates with, or Discord's own REST endpoints under sustained degradation — can
apply `CircuitBreaker` around that specific call path to stop making calls to a
downstream system that has already demonstrated it is failing, rather than letting
every request queue up behind a dependency that isn't going to answer.

```
DIAGRAM 28-A — Circuit Breaker State Machine

 failure rate ≥ 50% over the last 20 requests
 ┌──────────────────────────────────────────────────┐
 │ ▼
 CLOSED ─────────────────────────────────────────────► OPEN
 (calls pass (calls fail
 through normally, immediately,
 failures tracked NO call reaches
 in a rolling the downstream
 window of the dependency —
 last 20) this is the
 ▲ point: stop
 │ making a bad
 │ trial call succeeds situation worse)
 │ ┌─────────────────────────┐ │
 │ │ │ │ 30s elapsed
 └──HALF_OPEN◄─────────────────────┘ │
 (one trial call trial call fails │
 permitted through) │ │
 ▲ ▼ │
 └─────────────────── OPEN ◄──────────────────────┘
```

While `OPEN`, every call against the wrapped dependency fails fast with
`ExternalServiceError` — no network call is attempted at all — which is what protects
both the failing downstream dependency from additional load while it recovers, and
this process's own resources from piling up requests waiting on a call that was never
going to succeed.

### 28.5 Process-Level Safety Nets — Event Loop Lag Shedding

Beyond the process-level signal handlers already specified (§9.3–§9.4),
`Application` monitors event-loop lag continuously. Once measured lag exceeds
`EVENT_LOOP_LAG_SHED_THRESHOLD_MS` (default `50`), the process enters a load-shedding
posture: new interaction acknowledgments are prioritized over background and
non-critical work (scheduled task ticks, low-priority queue consumption are
deliberately throttled) until lag returns under threshold. This protects already-
in-flight command executions from starvation caused by a burst of background load,
rather than letting every category of work compete for the event loop equally during
a spike.

While the shedding posture is active, incoming gateway events are triaged by
domain: protected domains — interactions already acknowledged, commands in
flight, shutdown writes, and audit writes — are never shed; unprotected domains
(non-critical event handlers, background scheduling) are dropped for as long as
lag persists. Every shed event increments the `gatewayEventsShedTotal` counter
at its increment site in the dispatch path, so the volume of deliberately
dropped work is a first-class, alertable metric rather than an invisible loss.

### 28.6 Maintenance Mode

A global, Redis-backed flag — set and cleared exclusively through PEP's
`enterMaintenanceMode`/`exitMaintenanceMode` control domains (§22.3) — checked by
`MaintenanceModeMiddleware` at priority `-20`, the outermost layer of the entire
pipeline (§19.2). While set, every command's buffer embed is edited into the formal
notice frame with reason code `MAINTENANCE_MODE` (§20.9) — the same merged frame, and
the same reason-code + correlation-ID discipline, the framework uses for handler
failures and unknown commands. The only commands exempted are a small, explicitly
allow-listed set of Admin-tier commands capable of managing maintenance mode itself —
an operator is never locked out of the one mechanism needed to end the maintenance
window they started, and with the main bot's complete DM prohibition (§17.10) this
allow-list plus the control plane (§22) is the verified lockout-avoidance path.
Maintenance mode is the tool reached for ahead of a risky migration or during an
active incident where write traffic specifically needs to stop while the underlying
issue is resolved, without requiring a full process restart to achieve that pause.

The flag is mirrored in Redis, and every pod's `MaintenanceModeMiddleware` observes
the mirror through a short-interval poller backed by the same invalidation pub/sub
the cache uses — entering or leaving maintenance mode therefore propagates to every
pod without a restart. `exitMaintenanceMode` additionally re-runs module readiness
(Stage 17's semantics) before `/health/readiness` returns 200 again, so no pod can
report ready on the strength of a pre-maintenance module set that changed while
traffic was paused.

### 28.7 The Error Hierarchy

Dumby defines a structured error hierarchy that classifies errors by type and determines the appropriate recovery strategy. All errors in the hierarchy extend a base FrameworkError class that includes a correlation ID, a timestamp, the module name, and a user-facing message.

TransientError indicates a temporary failure that is likely to resolve on retry — network timeouts, ECONNRESET, ETIMEDOUT. These errors are retried up to 3 times with exponential backoff and jitter (base delay 1 second, max delay 30 seconds, max retries 3, jitter 0-500 milliseconds). No circuit breaker is triggered. No alert is sent.

RateLimitError indicates a Discord API rate limit (429). The error includes the retry_after value from Discord's response. The request is retried after the retry_after delay. No circuit breaker. A warning is logged. Admin-tier requests are queued but not bypassed — Discord's hard limit applies to all tiers.

ValidationError indicates invalid user input. Not retried. No circuit breaker. No alert. The user receives a descriptive error message indicating which input was invalid and why.

PermissionError indicates the user lacks permission. Not retried. No circuit breaker. No alert (expected behavior). The user receives a "You do not have permission" message.

ModuleError indicates the module's handler threw an unhandled exception. Not retried. Circuit breaker is triggered after the tier's error threshold. Tier-specific alerts: Admin 3 errors triggers P0, Core 5 errors triggers P1 and degraded mode, Standard/Marketplace 10 errors triggers P2 and auto-disable per guild.

DependencyError indicates a required dependency is unavailable (database down, Redis down). Retried 3 times then circuit breaker opens. Alert is sent: Admin P0, Core P1 and degraded, Standard P2 and unavailable, Marketplace P2 and auto-disable per guild.

FatalError indicates an unrecoverable process-level error (out of memory, unhandled rejection). Not retried. No circuit breaker (process is terminating). P0 alert for all tiers. Process restart is handled by Kubernetes.

### 28.8 Process-Level Failure Handling

The framework registers global handlers for unhandledRejection and uncaughtException. These handlers perform the following sequence: log the error at the fatal level with the full stack trace and correlation ID, emit a system.fatalError internal event (consumed by Admin tier for P0 alerting), attempt graceful shutdown (15-second timeout: disable modules in tier order Marketplace then Standard then Core then Admin, finish in-flight requests, disconnect shards), and if graceful shutdown exceeds 15 seconds, force-exit with exit code 1. Kubernetes restarts the pod automatically.

### 28.9 Recovery Strategies

Each error type has a defined recovery strategy. For transient errors, the strategy is retry with exponential backoff and jitter. For rate limit errors, the strategy is queue and retry after retry_after. For validation and permission errors, the strategy is reject with a user-facing message. For module errors, the strategy is circuit breaker and auto-disable at threshold. For dependency errors, the strategy is circuit breaker and graceful degradation. For fatal errors, the strategy is graceful shutdown and Kubernetes restart.

### 28.10 Discord API Degradation Handling

When the Discord API is degraded (gateway disconnects, REST API returns 5xx errors, or rate limits are hit persistently), Dumby follows a specific degradation path. The Gateway Client attempts reconnection with exponential backoff. If reconnection fails after 3 attempts, the bot enters gateway-down mode: all event processing pauses, the Interface Hub displays a "Discord connection lost" banner, and the bot owner is alerted. The REST Client queues requests and processes them when the API recovers, draining through a per-priority queue — Admin and Core requests ahead of Standard, Marketplace last — so a saturated API window never starves privileged tiers behind a flood of low-priority retries. If the queue exceeds 1,000 pending requests, non-critical requests are dropped. The bot remains in degraded mode until the gateway reconnects and the REST API recovers.

---

### 28.11 The Bulkhead Pattern

The bulkhead pattern isolates resources by tier, preventing a failure in one tier from consuming resources needed by another tier. Dumby implements bulkheads at multiple levels.

The HTTP bulkhead separates HTTP connection pools by tier. Admin and Core HTTP requests use a dedicated connection pool with no size limit. Standard HTTP requests use a connection pool with a maximum of 50 concurrent requests. Marketplace HTTP requests use a connection pool with a maximum of 10 concurrent requests per guild. If a pool is exhausted, requests queue up rather than failing. This ensures that a Marketplace module making excessive HTTP requests does not consume connections needed by Core modules.

The database bulkhead separates database connections by tier. Admin and Core database queries use a dedicated connection pool (or a reserved portion of the shared pool). Standard queries use the shared pool. Marketplace queries use a limited portion of the shared pool (enforced by the QuotaEnforcingDatabaseService). If the shared pool is exhausted, Marketplace queries are rejected first (to preserve capacity for Standard and Core queries).

The event bus bulkhead separates event delivery by tier. Admin and Core event handlers are delivered from a high-priority queue. Standard and Marketplace event handlers are delivered from a low-priority queue. If the low-priority queue is full, events are dropped (Marketplace first, then Standard). The high-priority queue is never affected by low-priority queue saturation.

### 28.12 The Timeout Pattern

Every external operation has a timeout. Timeouts prevent hanging — if an operation does not complete within the expected time, it is cancelled and an error is returned. This prevents a single slow operation from blocking the entire process.

HTTP request timeout: the default timeout for HTTP requests is 30 seconds. For marketplace modules, the timeout is 10 seconds. If a request does not receive a response within the timeout, it is cancelled and a TimeoutError is thrown. The timeout is configurable per request.

Database query timeout: the default timeout for database queries is 30 seconds (configurable via the statement_timeout setting in the configuration). If a query does not complete within the timeout, PostgreSQL cancels the query and returns an error. Slow queries (taking more than 100 milliseconds) are logged at the warn level.

Cache operation timeout: the default timeout for Redis operations is 5 seconds. If a Redis operation does not complete within the timeout, it is cancelled and the cache degrades to L1 only (L2 is marked as unavailable). The framework retries the Redis connection every 30 seconds and resumes L2 caching when the connection is restored.

Command handler timeout: the command handler does not have an explicit timeout, but the 15-minute follow-up window is a hard limit imposed by Discord. If the handler does not send a response within 15 minutes, the interaction token expires and no further responses can be sent. The framework arms a follow-up watchdog: at `FOLLOWUP_ALARM_MS` (default 13 minutes — the `INTERACTION_TIMEOUT` budget minus a two-minute response margin) the watchdog fires a warning and, if the handler has produced no response at all, attempts a graceful "still working" follow-up, so both the developer and the user get a signal before the window closes; at 15 minutes the token expiry is logged at error.

Event handler timeout: event handlers should complete within 100 milliseconds (Core) or 500 milliseconds (Standard/Marketplace). If a handler exceeds 500 milliseconds, it is marked as a slow consumer (Section 56.5). If a handler exceeds 5 seconds, it is forcefully terminated (the handler's promise is rejected with a TimeoutError) and the module's error counter is incremented.

Job handler timeout: the default timeout for job handlers is 5 minutes (configurable per job). If a job does not complete within the timeout, BullMQ marks the job as failed and retries it (if retries are configured). The timeout prevents a single job from blocking a worker indefinitely.

### 28.13 The Graceful Degradation Pattern

Graceful degradation provides limited functionality when a dependency is unavailable. Instead of failing completely, the system continues to operate with reduced capabilities.

Database degradation: if the database becomes unavailable, the framework switches to read-only mode. Commands that only read data (e.g., /userinfo, /serverinfo) continue to work using cached data. Commands that write data (e.g., /ban, /config set) fail with a "The database is temporarily unavailable. Please try again later." message. The Interface Hub displays a "Database unavailable" banner. The framework retries the database connection every 10 seconds and resumes full operation when the connection is restored.

Redis degradation: if Redis becomes unavailable, the framework switches to L1-only caching. L1 cache hits continue to work normally. L1 cache misses fall back to the database (instead of L2). Rate limiting falls back to in-process counting (using a Map with TTL) instead of Redis-based counting. This is less accurate (rate limits are per-process, not per-cluster) but prevents complete failure. The event bus switches to in-process delivery (no cross-pod event delivery). The job queue is paused (jobs cannot be enqueued or processed without Redis). The framework retries the Redis connection every 30 seconds and resumes full operation when the connection is restored.

Discord API degradation: if the Discord REST API is degraded (returning 5xx errors consistently), the framework enters Discord-degraded mode. Command responses are queued and sent when the API recovers. If the queue exceeds 1,000 pending responses, non-critical responses are dropped (the user sees no response, but the command is logged). The gateway connection is maintained separately from the REST API — if the REST API is degraded but the gateway is connected, the bot continues to receive events and can process them (it just cannot send responses). The framework retries failed REST API requests with exponential backoff.

### 28.14 The Retry Pattern

The retry pattern handles transient failures by retrying the operation after a delay. Dumby uses exponential backoff with jitter for retries. The `RetryPolicy` (`src/shared/utils/retry.ts`, §28.3) is wired into the framework `HttpClient` itself: every call through the wrapper — module HTTP calls included — retries transient failures per this policy and honors a `429` response by waiting exactly the server's `Retry-After` (bounded by the policy's max delay) plus jitter before the next attempt, so no caller re-implements retry or rate-limit handling around its HTTP calls.

The retry configuration for HTTP requests: max retries 3, base delay 1 second, max delay 30 seconds, jitter 0-500 milliseconds. The delay for retry N is: min(base_delay * 2^(N-1) + random(0, jitter), max_delay). For example, retry 1 waits 1 second + 0-500ms jitter, retry 2 waits 2 seconds + 0-500ms jitter, retry 3 waits 4 seconds + 0-500ms jitter.

The retry configuration for database queries: max retries 3, base delay 100 milliseconds, max delay 1 second, jitter 0-100 milliseconds. Database retries are shorter because database failures are often very transient (e.g., a brief network blip).

The retry configuration for Redis operations: max retries 3, base delay 100 milliseconds, max delay 1 second, jitter 0-100 milliseconds. After all retries are exhausted, the framework degrades to L1-only caching (Section 95.3).

The retry configuration for Discord gateway reconnections: max retries unlimited (the framework always tries to reconnect), base delay 1 second, max delay 60 seconds, jitter 0-1 second. The backoff increases with each failed attempt, reducing the load on Discord's servers during outages.

### 28.15 The Circuit Breaker Pattern — Detailed Implementation

The circuit breaker has three states: closed (normal operation — requests pass through), open (tripped — requests fail immediately without making a network call), and half-open (testing — a single request is allowed through to test if the dependency has recovered).

The circuit breaker decides on a rolling window, not a consecutive-failure count: the breaker keeps the outcomes of the last 20 calls per dependency and opens when at least half of them — ≥50% of the window — failed. A dependency that fails intermittently but mostly succeeds never opens it, while one failing consistently does, regardless of how the failures interleave. When the circuit opens, all subsequent requests fail immediately with a `CircuitOpenError` — a member of the typed error taxonomy (§28.1) with its own recovery strategy, so a caller can distinguish "the dependency is tripped" from "the dependency just failed". No network calls are made — the circuit breaker short-circuits the request to prevent further load on the failing dependency.

The circuit breaker transitions from open to half-open after a 30-second cooldown. In half-open state, a single request is allowed through. If the request succeeds, the circuit breaker closes (resumes normal operation). If the request fails, the circuit breaker reopens (and the cooldown starts again).

The circuit breaker tracks failures by dependency: each external dependency (database, Redis, Discord API, specific HTTP hosts) has its own circuit breaker. A failure in one dependency does not trip the circuit breaker for another dependency. This ensures that a database outage does not prevent the bot from responding to commands that don't need the database (e.g., /help, which uses cached data).

The circuit breaker state is visible in the Interface Hub's system status dashboard. When a circuit breaker is open, the dashboard shows a red indicator with the dependency name and the time since the circuit opened. This helps the bot owner identify which dependency is causing issues.

### 28.16 The Idempotency Pattern

Idempotency ensures that processing the same operation multiple times produces the same result as processing it once. This is essential for at-least-once delivery systems (where the same event may be delivered more than once).

Dumby implements idempotency at the event handler level. Each event has a unique event ID (generated by the publisher). The EventDeduplicator (optional, per subscription) tracks event IDs in a Redis set with a 5-minute TTL. When an event is delivered, the deduplicator checks if the event ID is in the set. If it is, the event is skipped (already processed). If it is not, the event ID is added to the set and the handler is invoked.

Modules can also implement their own idempotency. For example, a leveling module that awards XP for message events should check if the message has already been processed (by checking the database for the message ID). If it has, the handler returns without awarding XP again. This is important because the Discord gateway may resend events after a reconnection.

---

Detect memory leaks during Swastik hot-swaps by comparing heap snapshots before and after onUnload.

**Deferred, not yet specified:** heap-diff leak detection (snapshot before onUnload, trigger GC, second snapshot, compare against `MEMORY_LEAK_THRESHOLD_KB`, reporting with a `warning: true` header in the Swastik response) is greenfield work outside the current scope. Until it lands, leak protection rests on the Managed Resource Registry's auto-cleanup (§10.2) and the CI load/unload growth check.

Shift leak protection from developer discipline to framework enforcement via DI-scoped resource tracking.

Leak protection is framework enforcement, not developer discipline: (A) the ITimerService wrapper forbids direct setTimeout/setInterval and auto-clears a module's registered timers on unload; (B) EventBus subscriptions use WeakRef + FinalizationRegistry cleanup; (C) CacheManager invalidates the module's key namespace on unload.

**Vitest Configuration Location:** The test configuration files `vitest.config.ts` and `vitest.integration.config.ts` must be confirmed present at the `apps/main/` root (not under `src/`). They are referenced in `package.json` scripts and must be discoverable at the project root for Vitest to resolve them correctly.

## 29. Job Queue & Scheduling

**Status:** [SPEC]

### 29.1 Jobs vs. Tasks — Two Different Authoring Models

```
TABLE 29-A — Jobs vs. Tasks

┌─────────────┬───────────────────────────────┬───────────────────────────────┐
│ │ Jobs │ Tasks │
├─────────────┼───────────────────────────────┼───────────────────────────────┤
│ Manifest field │ jobs (§11.2) — queueName + class │ tasks (§11.2) — a class list │
│ Trigger │ Enqueued programmatically, │ Registered into the Scheduler at │
│ │ optionally delayed (§12.5's │ load time, fired on a cron │
│ │ worked example) │ expression │
│ Base class │ BaseProcessor<TPayload> │ BaseTask │
│ Cardinality │ One instance of work per enqueue │ One firing per cron tick, │
│ │ call — many jobs typically exist │ fleet-wide (never once per pod — │
│ │ concurrently, one per user action │ §29.6's distributed lock) │
│ Failure handling│ BullMQ's own retry + DLQ (§29.4) │ Logged and alerted; a missed tick │
│ │ │ is not automatically retried — │
│ │ │ the next scheduled tick is the │
│ │ │ natural recovery │
└─────────────┴───────────────────────────────┴───────────────────────────────┘
```

A job answers "do this one specific thing, once, possibly later" (deliver this one
reminder); a task answers "do this recurring maintenance sweep on a schedule"
(§12's `ExpiredMuteCleanupTask` sweeping any mute whose end time passed without its
corresponding job firing, as a safety net rather than the primary mechanism).

### 29.2 BullMQ Architecture

`QueueManager` maintains one BullMQ `Queue` instance per registered `queueName`,
backed by the shared Redis instance. `BaseProcessor` subclasses register as BullMQ
`Worker`s, each with a configurable concurrency — how many jobs from that queue a
single process instance processes in parallel. Workers can run inside the main bot
process or be split into dedicated worker-only processes (`src/entry/worker.ts`,
§7.5) for CPU-isolation when a queue's workload is heavy enough to risk contending
with the gateway connection's own event loop needs.

### 29.3 Idempotency — A Hard Requirement, Not a Suggestion

BullMQ guarantees **at-least-once** delivery — a job may be processed more than once
under specific failure conditions (a worker crashing after completing work but before
acknowledging the job, for instance). Every `BaseProcessor.process` implementation
is therefore required **and framework-enforced** to be idempotent via an idempotency key tracked in the BullMQ job data (framework-level deduplication on retry), not merely a documented expectation: safely re-runnable with the same payload
producing no additional side effect beyond the first successful run. §12.7's
`ReminderDeliveryJob` demonstrates the canonical pattern — checking the record's
current `status` before acting, and treating anything other than the expected
pre-condition state as "already handled, nothing to do" rather than re-executing the
side effect. `jobId` is set deliberately in the worked example's enqueue call
specifically to make the *enqueue* operation itself idempotent too — enqueuing the
same `jobId` twice is a safe no-op at the queue level, guarding against a
double-enqueue from a retried event-bus listener producing two competing jobs for the
same logical reminder.

### 29.4 Retry & Dead-Letter Queue

```
TABLE 29-B — Job Retry Defaults

┌─────────────────┬──────────────────────────────────────────────────────┐
│ attempts │ 3 │
│ backoff │ Exponential: 5s, then 10s, then 20s │
│ On exhaustion │ Moved to a dead-letter entry, preserving the full payload │
│ │ and every attempt's failure reason — never silently │
│ │ dropped │
└─────────────────┴──────────────────────────────────────────────────────┘
```

A dead-lettered job is visible to an operator through PEP's `requeueDeadLetter`
control domain (§22.3) for manual inspection and, where the underlying issue has been
resolved, manual re-queueing — the framework never silently discards work it
couldn't complete.

### 29.5 Concurrency & Autoscaling

Each queue's worker concurrency is an explicit, per-queue configuration value rather
than a single global setting — a queue whose jobs are lightweight and I/O-bound
(reminder delivery) can run a high concurrency safely, while a queue whose jobs are
CPU-heavier is deliberately kept lower to avoid starving the event loop of a process
also serving live gateway traffic. In a Kubernetes deployment, dedicated worker
processes (§7.5's `worker.ts` entry) scale horizontally via a `HorizontalPodAutoscaler`
targeting `dumby_queue_depth` (§27.3) rather than CPU alone — a queue backing up is a
more direct signal that more worker capacity is needed than CPU utilization is, since
an I/O-bound queue can back up while CPU usage stays low.

### 29.6 Cron Tasks & Distributed Locking

The `Scheduler` itself is constructed at bootstrap Stage 08 (QUEUE_INIT, §8.2)
alongside the BullMQ queue connections, with every registered cron task class's
consumer registered there — before any pod reports ready. A recurring task
registered into the `Scheduler` must fire exactly once per tick **fleet-wide**, not
once per pod — a naive cron registration inside every pod's own
process would fire N times for an N-pod deployment. `Scheduler` guards every tick with
the identical distributed-lock pattern §26.4 uses for shard ownership: on each
scheduled tick, every pod attempts `SET 'task-lock:{taskName}:{tickTimestamp}' NX`;
exactly one succeeds and executes the task; every other pod's attempt fails the `NX`
check and skips that tick entirely, with no retry needed, since one execution
fleet-wide is precisely the intended outcome.

## 30. Localization & Internationalization

**Status:** [SPEC]

### 30.1 Locale Resolution Order

`LocaleMiddleware` (priority 30, §19.2) resolves `context.locale` through a fixed
precedence, evaluated once per interaction:

```
DIAGRAM 30-A — Locale Resolution Precedence

 1. Guild config's explicit locale setting (§23.3's guildConfigSchema.locale)
 — a guild administrator's deliberate choice always wins when present
 │ absent
 ▼
 2. Discord's own interaction.locale hint (the invoking user's Discord
 client language setting)
 │ absent / unsupported by this deployment's loaded translations
 ▼
 3. Deployment default — 'en-US'
```

### 30.2 Translation Catalog Structure

Every module ships its own `locales/` directory (§11.4), with `en-US.json` mandatory
— Stage 11 validation fails a module missing it, since English is the deployment
default and the fallback of last resort for any key untranslated in a resolved
locale. `I18nManager` merges every module's locale files into one global catalog,
namespaced by module name so two modules can use the same short key
(`"error.not-found"`) without colliding. A translation key missing in the resolved
locale falls back to `en-US` for that key specifically — a partially-translated locale
degrades key-by-key, never as an all-or-nothing swap back to English for the entire
response.

```
CODE REFERENCE 30-A — Namespaced Lookup

i18n.t('reminders:reminders.set.success', { relativeTime }, context.locale)
 │
 └─ resolves to reminders' own en-US.json entry from §12.8, with
 {relativeTime} interpolated — collision-free against any other
 module's own 'reminders.set.success'-shaped key, if one existed
```

### 30.3 Right-to-Left Language Support

Locale files support RTL languages (Arabic, Hebrew) identically to any other
locale — translation strings are plain text with no directional markup embedded by
the framework itself. Discord's own client renders RTL text correctly based on the
string's Unicode directionality; the framework's responsibility ends at supplying a
correctly-translated, correctly-encoded string, since message rendering direction is a
client-side concern entirely outside this architecture's scope.

### 30.4 Timezone & Formatting

`formatters.ts` (§7.4) provides locale- and timezone-aware date, number, duration, and
currency formatting, built on the standard `Intl` API rather than a bespoke
implementation. A displayed date or time always resolves against the relevant guild's
configured `timezone` (§23.3) — never the server process's own local timezone, which
is deployment-dependent and meaningless to a guild's members — falling back to UTC
when a guild hasn't set one explicitly. `formatRelative`, used in §12.4's worked
example, produces locale-appropriate relative-time phrasing ("in 3 hours," "hace 3
horas") rather than a hardcoded English-only string interpolated with a raw duration.

## 31. Analytics, Telemetry & MTP

**Status:** [SPEC]

### 31.1 Analytics vs. Observability — A Deliberate Separation

Observability (§27) answers "is the system healthy right now, and why." Analytics
answers a different question entirely: "how is this product actually being used."
The two are kept structurally separate — different tables, different retention
policies, different consumers — because conflating them tends to produce a system that
serves neither question well: an incident responder querying trace spans doesn't need
usage trend data mixed in, and a product decision about which module to invest in
doesn't need Prometheus's high-cardinality, short-retention operational metrics.

### 31.2 Collection Model

`AnalyticsMiddleware` (priority 90, §19.2) records every command invocation's start;
its `.after` hook records the outcome, duration, and status once execution
completes. Writes batch in-memory and flush to PostgreSQL on an interval — never a
synchronous write on the command's own critical path, so analytics collection can
never be the reason a command's response is slow, and a batch-write failure never
fails the command it was describing. Identifiers are pseudonymized before they ever
enter a buffer: user and guild IDs are replaced by HMAC-SHA-256 pseudonyms keyed by
a salt that rotates monthly (each pseudonym carries its salt epoch so older rows
remain joinable within their own month), and raw IDs never reach the analytics
tables.

### 31.3 Guild-Facing Usage Analytics

A guild's own administrators can see their guild's command usage, active-module
breakdown, and member engagement trends through MDIS (§16.4) — every module with a
`dashboardSchema` declaring a `chart` component (§16.4's Table 16-B) can surface its
own usage data this way. This data is strictly guild-scoped: an administrator sees
only their own guild's analytics, never cross-guild comparisons or platform-wide
aggregates, which belong to a different audience entirely (§31.5).

### 31.4 Metric Track Protocol (MTP)

MTP is the framework's internal, module-agnostic usage-metering standard, writing to
`metering_usage_daily` (§24.2). Rather than every module inventing its own bespoke
"how much was this guild using me" accounting, MTP defines one common unit — an
abstract **metric unit**, not a real-world currency or API token — that any module can
report consumption in, weighted by a configurable formula (a command invocation,
a background job execution, and a megabyte-day of stored data each convert to metric
units at their own configured rate). The result is one column,
`metricUnitsConsumed`, that is directly comparable across every module and every
guild, with a `breakdown` JSONB column preserving which module contributed how much
of a given day's total.

**Comparability caveat.** Because the metric-unit conversion formula is configured per deployment, `metricUnitsConsumed` totals are only comparable within a single deployment. Either standardize default metric weights or keep per-deployment configuration documented with explicit comparison caveats (MTP configuration, telemetry aggregation).

MTP's entire purpose is to be the data foundation a future monetization model would
consume — mapping directly onto the reserved-but-empty `src/monetization/` scaffold
(§7.6) — without the framework itself implementing any billing, quota-enforcement, or
payment logic today. A deployment can run MTP purely for its own operational insight
(which modules are actually driving load) with zero monetization behavior attached,
today, indefinitely; nothing about running MTP obligates a deployment to build billing
on top of it later.

#### 31.4.1 eventsCatalog Consistency Reports and Runtime Enforcement

Every `eventBus.emit` call must correspond to a declared `eventsCatalog` entry. Two enforcement layers are introduced to prevent catalog drift (subscribers expecting events that are never emitted):

1. **Upload-time report (Swastik static analyzer).** AST emit-call extraction walks the module source, collects every `eventBus.emit("<name>", <payload>)` invocation, and cross-checks each against the module's `eventsCatalog`. The upload response includes a `catalogConsistency` report listing emitted-but-undeclared and declared-but-never-emitted events. Severity is Medium.
2. **Runtime enforcement (InternalEventBus, module-scoped wrapper).** A module-scoped event bus wrapper intercepts each `emit` at runtime and validates that (a) the event name exists in the catalog, (b) the payload matches the Zod schema declared for that event, and (c) the name follows the `{domain}.{entity}.{action}` format. Mismatches throw and are logged rather than silently dropped.

**Dependency:** Redis-backed state.

### 31.5 Framework Telemetry

Distinct from both observability and guild-facing analytics: an opt-out, deployment-
level telemetry channel reporting fully anonymized, aggregate signals about the
framework's own usage — framework version, Node.js runtime version, and a count of
loaded modules broken down by tier — to help the framework's own maintainers
understand adoption and prioritize development. Controlled by a single
`TELEMETRY_ENABLED` environment variable, defaulting to `true` but documented
prominently and trivial to disable. No guild ID, user ID, message content, or any
guild-identifying value of any kind ever leaves a deployment through this channel —
the payload shape is fixed and auditable specifically so "what does framework
telemetry send" is a question answerable by reading one small, stable schema rather
than trusting an opaque black box.

## 32. Security Architecture & Threat Model

**Status:** [SPEC]

### 32.1 Secrets Management

Every secret — the Discord bot token, database credentials, Redis credentials, and

 every credential the Credentials Service issues (§22.8) — is supplied exclusively through environment variables injected by the orchestrator. Rotating a secret (e.g. `BOT_TOKEN`) MUST trigger an automated rolling restart, or be served through an external-secrets/Vault agent that hot-reloads without restart, so that no fleet-wide cutover leaves every pod holding a now-invalid token and disconnecting simultaneously.
every credential the Credentials Service issues (§22.8) — is supplied exclusively
through environment variables injected by the orchestrator (Kubernetes Secrets,
sealed at rest, or an external vault), never committed to source control and never
baked into a container image layer. `.env` files are `.gitignore`d unconditionally;
CI includes a secret-scanning step that fails the build on any pattern resembling a
committed credential, independent of developer discipline.

**Non-production credential separation.** A production deployment's bot token,
database credentials, and every other production secret are categorically distinct
values from any staging or development environment's equivalents — never shared,
never reused across environments, never derived from one another. This is what gives
§13.6's Admin-tier Layer 4 environment guard (`NODE_ENV !== 'production'`) its actual
security force: even in the scenario where that check were somehow subverted, the
actual production credentials required to cause meaningful damage simply do not exist
in a non-production environment's configuration to begin with. The check and the
credential separation are two independent layers protecting the same outcome, exactly
as intended — one gate failing does not expose what the other still protects.

**Credential handling discipline.** Every credential-shaped value — Discord bot
tokens, developer dev IDs, service-to-service tokens — follows the identical rules
specified in full at §22.8's Table 22-D: cryptographically random generation,
`Authorization`-header-only transmission, and independent revocability. At rest, the
two schemes of §32.7 apply without overlap: Argon2id one-way hashing for everything
verifiable by hash, and envelope encryption (root key → DEKs → per-record
AES-256-GCM) for the narrow class of recoverable, in-process-readable credentials —
the boundary between them is the question "does anything in this process ever need to
read the value back to do its job?" If no, it is hashed; if yes, it is
envelope-encrypted, and it is a candidate for that class only with that justification
on record. This is one policy applied uniformly, not a separate discipline invented
per subsystem.

### 32.2 Input Validation

Every trust boundary validates against an explicit Zod schema before any business
logic runs — command options (via discord.js's own typed option accessors, which
themselves fail closed on a type mismatch), HTTP request bodies on every REST route
(§44), inbound webhook payloads (§32.3), process configuration (§23.2), and every
module manifest (§11.2, Stage 11). No layer in this architecture trusts data merely
because it arrived from another layer inside the same process — the manifest
validator does not assume a module's own config schema is well-formed just because
the manifest itself parsed successfully, and a command handler does not assume a
webhook's payload is trustworthy just because it reached the handler at all.
Filesystem paths assembled from request-derived components are built exclusively
through `safeJoin` (§15.8) — component-pattern validation plus an
`assertPathInside` containment assertion on every join — never by plain string
concatenation, so a request-derived path component can never escape the volume root
it belongs to.

### 32.3 Webhook Signature Verification

Every inbound webhook route a module registers (§11.2's `routes` field, distinct from
outbound webhook *delivery* covered in §44.5) verifies a cryptographic signature —
HMAC-SHA256 against a shared secret, or the originating service's own signature
scheme where one is mandated — before any payload is parsed as trusted input.

```
DIAGRAM 32-A — Inbound Webhook Verification Gate

 Request arrives at a module's registered webhook route
 │
 ▼
 Signature present and well-formed? ── NO ──► 401, reject, log at warn
 │ YES
 ▼
 Signature valid against the configured shared secret? ── NO ──► 401, reject
 │ YES
 ▼
 Timestamp within the replay-protection tolerance window
 (requests outside a bounded window, regardless of a valid
 signature, are rejected — a captured, valid-signature request
 cannot be replayed indefinitely) ── OUTSIDE WINDOW ──► 401, reject
 │ WITHIN WINDOW
 ▼
 Payload is now trusted input — proceed to the module's own Zod
 schema validation (§32.2) and business logic
```

A webhook route with no signature verification configured refuses to register at all
during Stage 14 — there is no supported "unverified webhook" mode a module can opt
into, deliberately, since an unauthenticated inbound HTTP endpoint accepting
arbitrary payloads is one of the more common real-world paths into a system exactly


**HMAC computation.** Every HMAC-SHA256 computation in the system — inbound
verification (above), outbound delivery signing (§44.5), and internal request
signing — uses Node's `crypto.createHmac('sha256', key)` with the secret passed as
the HMAC key, never a plain SHA-256 digest over a message with a key appended: a
`sha256(message + key)` construction is not an HMAC and is a review reject. The
implementation is regression-tested against the RFC 4231 HMAC-SHA-256 test vectors,
which run in CI on every change to any crypto-path file — the vectors are the proof
the primitive is an HMAC, not a lookalike.
like this one.

### 32.4 Privilege Escalation Prevention

```
TABLE 32-A — Escalation Vectors and Their Structural Blocks

┌────────────────────────────┬──────────────────────────────────────────┐
│ Vector │ Structural Block │
├────────────────────────────┼──────────────────────────────────────────┤
│ A module requesting broader │ The Gateway Intent union is computed ONCE, │
│ Discord intents at runtime │ from every loaded module's manifest │
│ than it declared │ (§11.2's intents field), at Stage 15 — │
│ │ nothing after login can add to it; a │
│ │ manifest field, not a runtime call, is the │
│ │ only path to requesting an intent │
│ A lower-tier module reaching │ The three-layer rule (§11.5) and the module │
│ Admin-tier authority │ isolation rules (§11.6) mean no module can │
│ │ import or invoke another module's code │
│ │ directly; Admin tier's own five-layer gate │
│ │ (§13.6) is independent of and additional to │
│ │ this │
│ A guild administrator │ RBAC role resolution (§21.3) is computed fresh │
│ self-granting elevated role │ from actual Discord role membership on every │
│ without the corresponding │ interaction — a guild config write cannot │
│ Discord role │ itself grant an RBAC role; only an actual │
│ │ Discord-side role assignment, or an explicit │
│ │ Layer 7 grant an existing ADMINISTRATOR/OWNER │
│ │ (§21.6), can │
│ A module writing to another │ Isolation Rule 2 (§11.6) — cross-module writes │
│ module's tables directly │ are never acceptable through any sanctioned │
│ │ pattern (§14.1); this is a code-review hard │
│ │ stop with no carve-out │
└────────────────────────────┴──────────────────────────────────────────┘
```

### 32.5 Dependency Security

The `pnpm` lockfile is committed and CI runs with `--frozen-lockfile` (§5.3) — a
build never silently resolves a different dependency tree than what was reviewed. A
dedicated `dependency-review.yml` workflow (§7.1) runs on every pull request
introducing or updating a dependency, blocking the merge if the change introduces a
package with a known critical- or high-severity vulnerability, and flagging (without
necessarily blocking) anything lower-severity for reviewer judgment. Dependency
footprint is treated as an ongoing design concern in code review — a new dependency
for functionality the standard library or an already-present dependency could
reasonably cover is a legitimate review objection, not merely a style preference,
since every added dependency is also an added trust boundary.

### 32.6 Audit Logging as a Security Control

`audit_logs` (§24.2) is the single, append-only, never-updated record every
consequential action in the system writes to — PEP's seventeen control domains
(§22.3, mandatory before any result is returned), Swastik's full deployment lifecycle
(§15.10), every guild configuration change (§23.5), and Admin-tier invocations both
granted and rejected (§13.6). Security review of "what happened and who did it" is
never a reconstruction exercise across scattered application logs — it is one table,
filterable by `source`, `actorId`, or `targetType`/`targetId`.


Module artifact integrity is enforced at every load boundary: the runtime loader
verifies the build's Ed25519 signature over the artifact bytes and its provenance
tuple (§15.8) before the module is imported, and a verification failure refuses the
load with an audited refusal — no unsigned or tampered module executes from the live
volumes. The signing subsystem's key ceremony is deferred greenfield work; the
verification gate is specified and enforced regardless.

### 32.7 Encryption Posture

```
TABLE 32-B — Encryption Responsibility

┌────────────────────┬─────────────────────────────────────────────────┐
│ Layer │ Treatment │
├────────────────────┼─────────────────────────────────────────────────┤
│ In transit — DB, │ TLS, application-enforced (the Knex connection │
│ Redis, HTTP ingress │ config and Redis client config both require it │
│ │ where the target endpoint supports it; the reference │
│ │ Kubernetes deployment terminates external TLS at the │
│ │ ingress, §41.2) │
│ In transit — Discord │ Inherent — discord.js's gateway and REST clients │
│ gateway/REST │ both use TLS unconditionally; not a configuration │
│ │ this application controls or could disable │
│ At rest — database │ Infrastructure-layer responsibility (the cloud │
│ and cache volumes │ provider's disk/volume encryption, per §41.6's │
│ │ Terraform reference), not reimplemented at the │
│ │ application layer — avoiding a second, weaker, │
│ │ hand-rolled encryption layer on top of infrastructure │
│ │ that already does this correctly │
│ Credential-shaped │ Argon2id hashing — a password-shaped secret is │
│ values that never │ never recoverable in plaintext by anyone, │
│ need in-process │ including the system itself: one-way hashing │
│ recovery │ only, never reversible encryption │
│ Credential-shaped │ Envelope encryption for the narrow class of │
│ values the system │ recoverable, in-process-readable credentials │
│ must read back │ (ADR-003, docs/adr/): a root key wraps data │
│ (envelope │ encryption keys (DEKs); each record is sealed │
│ encryption) │ with its own DEK under AES-256-GCM. Root-key │
│ │ custody lives in the orchestrator's secret │
│ │ store; DEKs never leave the process; rotation │
│ │ re-wraps DEKs without touching records. This │
│ │ class is exactly and only credentials whose │
│ │ verification requires reading them back — │
│ │ anything a hash can verify never gets this │
│ │ treatment │
└────────────────────┴─────────────────────────────────────────────────┘
```

### 32.8 Token Security

The bot token is the most sensitive secret in the system. If compromised, an attacker can impersonate the bot, read all guild data, perform actions as the bot, and potentially compromise the Discord servers that the bot is in. Dumby implements multiple layers of token security.

The token is loaded from the BOT_TOKEN environment variable (or from the SecretsManager if Vault or Doppler is configured). It is stored in memory only — it is never written to disk, never logged at any level, never included in error messages, and never exposed to modules through the service container. The GatewayClient uses the token to identify with Discord's gateway. The REST client uses the token to authenticate REST API calls.

The framework detects potential token leakage by scanning all log entries for patterns that match Discord bot tokens (which have a specific format: a base64-encoded string of approximately 50-60 characters). If a token-like pattern is found in a log entry, the entry is redacted (the token is replaced with "[REDACTED]") and a security alert is sent to the bot owner.

Token rotation is the process of generating a new token and updating the bot's configuration. The bot owner rotates the token in the Discord Developer Portal (Reset Token button) and updates the BOT_TOKEN environment variable. The bot is restarted to load the new token. The old token is immediately invalidated by Discord — any connections using the old token are disconnected. Token rotation should be performed if the token is suspected to be compromised, if a team member with token access leaves, or as a regular security practice (every 6-12 months).


Internal service-to-service calls follow the same discipline at a smaller scale:
every internal surface authenticates its callers with a timing-safe
`x-internal-api-key` preHandler and binds loopback by default (§22.5) — a service
key is compared in constant time, never with an early-exit string comparison, and an
internal listener is never published beyond the host without an explicit operator
decision. Developer credential verification is delegated to the Credentials Service
(§22.8) and its refusals are indistinguishable: an unknown keyId, a mismatched
secret, and a pending identity all return the identical 401 body, so a caller learns
nothing about which factor failed, and no credential fragment — not even a prefix —
is ever written to a log line, metric label, or audit row.

### 32.9 Dependency Security

All npm dependencies are scanned for known vulnerabilities using npm audit and Snyk. The scan runs in the CI pipeline on every pull request and on a nightly schedule. High-severity vulnerabilities block the CI pipeline — the pull request cannot be merged until the vulnerability is fixed (by updating the dependency to a non-vulnerable version or by replacing the dependency with an alternative). Medium and low-severity vulnerabilities are flagged as warnings but do not block the pipeline.

Dependency updates are managed by Dependabot (or Renovate), which creates pull requests automatically when new versions of dependencies are released. The bot owner reviews the pull request, checks the changelog, runs the test suite, and merges if all tests pass. Automated dependency updates ensure that the bot stays current with security patches without manual effort.

### 32.10 Input Validation — Deep Dive

Input validation is the first line of defense against injection attacks. Dumby's InputSanitizer performs multiple passes on every interaction's options. The deep dive covers each pass in detail.

HTML entity encoding: the InputSanitizer replaces the characters <, >, &, ", ' with their HTML entity equivalents (&lt;, &gt;, &amp;, &quot;, &#39;). This prevents XSS (cross-site scripting) if the input is ever rendered in a web context (e.g., the Interface Hub). The encoding is applied to all string options before they are passed to the module's handler.

SQL injection detection: the InputSanitizer checks the input against a library of SQL injection patterns. The patterns include: UNION SELECT (attempts to combine results from multiple tables), OR 1=1 (attempts to bypass WHERE clauses), DROP TABLE (attempts to delete tables), INSERT INTO (attempts to insert malicious data), -- and /* (comment injection to truncate queries), and semicolons followed by SQL keywords (attempts to execute multiple statements). If any pattern matches, the input is rejected with a "Invalid input detected" message. The detection uses case-insensitive matching and handles obfuscated patterns (e.g., URL encoding, hex encoding).

Discord markdown limiting: the InputSanitizer restricts Discord markdown to a safe subset. Allowed markdown: bold (**text**), italic (*text* or _text_), underline (__text__), strikethrough (~~text~~), code blocks (text), inline code (`text`), headers (# text), and links ([text](url)). Disallowed markdown: mentions (@user, @role, @everyone, @here), channel mentions (#channel), and emoji (:emoji:). The disallowed markdown is stripped from the input (not rejected — the input is accepted but the markdown is removed). This prevents mention injection (a user trying to mention @everyone through a command option).

URL validation: the InputSanitizer checks any URL in the input. URLs must use HTTPS (HTTP URLs are rejected with a "Only HTTPS URLs are allowed" message). URLs must belong to an allowed domain list (if the command specifies one — e.g., the /embed command may only allow URLs from imgur.com and discord.com). URLs are checked against a blocklist of known malicious domains (maintained by the framework team and updated regularly). If a URL is on the blocklist, the input is rejected with a "This URL is not allowed" message.

Length limiting: the InputSanitizer truncates input to the maximum length specified in the command's option definition. Discord already limits option lengths (string options are limited to 6,000 characters by Discord), but the InputSanitizer applies the module-specified limit (which may be shorter than Discord's limit). Truncation prevents buffer overflow attacks and ensures that the input fits within the database column's maximum size.

### 32.11 Output Encoding — Deep Dive

Output encoding prevents injection attacks by encoding user-provided content before including it in responses. The ResponseBuilder encodes user-provided content in all responses.

User-provided content in embeds: when a module includes user-provided content in an embed (e.g., a username in a title, a reason in a description), the ResponseBuilder wraps the content in a code block or inline code. This prevents the content from being interpreted as Discord markdown. For example, if a user's reason is "**BANNED**", the embed shows "`**BANNED**`" (the markdown is not rendered — it is displayed as literal text).

User-provided content in URLs: when a module includes user-provided content in a URL (e.g., a search query in a link), the ResponseBuilder URL-encodes the content. This prevents URL injection (a user adding query parameters to a URL that the module did not intend).

User mentions: when a module mentions a user in a response, the ResponseBuilder uses Discord's mention format (<@user_id>) rather than the user's name. This prevents mention injection (a user changing their nickname to "@everyone" and the bot echoing it, which would mention @everyone in the channel).

---

---

## 33. Performance & Scalability Engineering

**Status:** [SPEC]

### 33.1 Sharding Model

The shard topology, assignment formula, and cross-shard coordination mechanisms are
specified in full at §6.5 and §26.3–§26.4. The performance-relevant summary: each pod
carries a contiguous shard range sized to stay well clear of Discord's own per-shard
gateway rate limits, and no application code ever assumes an unsharded topology —
`context.shardId` is always populated, sharded deployment or not.

### 33.2 Zero-Downtime Rolling Updates

A core deployment update — the outcome of the release pipeline (§40.2–§40.4) or
Swastik's own scheduled restart trigger (§15.5) — uses a Kubernetes rolling-update
strategy configured `maxUnavailable: 0` / `maxSurge: 1`: at every point during the

 with a configured rollout progress deadline that triggers **automatic rollback** (`kubectl rollout undo`) when the new pod fails health checks within the deadline, rather than pausing the rollout for manual intervention. A canary managed by the Release Manager with auto-rollback is the equivalent for module hot-swaps.
rollout, capacity never drops below the pre-update pod count, and at most one extra
pod exists temporarily above it.

```
DIAGRAM 33-A — Rolling Update Sequence, Per Replaced Pod

 New pod scheduled (surge — count is now N+1 momentarily)
 │
 ▼
 New pod runs bootstrap Stages 01–18 (§8.2) — including the FULL module load
 and onReady cycle
 │
 ▼
 New pod's /health/readiness returns 200 (Stage 18 complete, every required
 module healthy)
 │
 ▼
 Kubernetes adds the new pod to the Service endpoint list — it now receives
 a share of traffic
 │
 ▼
 Kubernetes sends SIGTERM to ONE old pod
 │
 ▼
 Old pod executes the full 9-step graceful shutdown (§9.1), including
 releasing its shard-ownership locks (§26.4) explicitly at Step 01
 │
 ▼
 New pod's shard-claim retry (already polling every SHARD_LOCK_RETRY_MS,
 §26.4) succeeds the moment the old pod's lock releases — no gap where a
 shard is unowned
 │
 ▼
 Old pod exits; count returns to N; Kubernetes proceeds to the next pod
```

This repeats one pod at a time until every pod in the deployment is running the new
version, which is why the shard-ownership lock model (§26.4) is a hard prerequisite
for this update strategy to be safe at all — without it, a brief window where both the
old and new pod believe they own the same shard would be possible during exactly this
handoff.

#### Design Consideration — In-Cluster Postgres/Redis Dev Overlay

To make `kubectl apply` self-sufficient for local development, `deploy/k8s/overlays/dev/` should gain an in-cluster PostgreSQL and Redis (dev-only, non-production grade) so a single overlay brings up the complete stack without external service dependencies. Impact: Medium; Feasibility: High.

#### Design Consideration — Configuration Diffing and Reconciliation

The Release Manager should diff the target configuration against the live cluster (`config/dumby-config-diff.ts`, `config/configmap-patcher.ts`) and apply changes additively: breaking removals require explicit policy approval before proceeding. This resolves config drift between Git and the cluster — currently listed as a historical con of the pre-Release-Manager approach — as a first-class reconciliation guarantee rather than a manual check.

#### Design Consideration — DB Pool-Sizing Formula in Terraform

The reference Terraform module should set `max_connections = (max_pods × pool_max × 1.2) + 20`, paired with a startup assertion that refuses to boot when the configured `DATABASE_POOL_MAX` would exceed the server's provisioned capacity. Codifying the formula prevents connection-flood incidents instead of diagnosing them after the fact. Impact: High; Feasibility: High.

Decouple modules from the base image by mounting a per-module PVC at `/app/dist/modules/<name>` (or `/mnt/modules`), treating modules as plugins rather than image content. Staging already ships the `swastik-staging` PVC and the per-tier live volumes (all nested under `MODULES_DIR`); extending this per module makes single-module updates an image-free operation.
Release Manager renews the Redis core-release lease every 10s with a 30s TTL; crash causes lease expiry and Swastik resumes after bounded TTL.

The lease heartbeat renews every 10 s with a 30 s TTL, exactly as specified in §15.4.

Monotonic fencing token prevents stale instructions during core release.

Monotonic fencing tokens prevent stale instructions during a core release, exactly as specified in §15.4.

Ensure correct deployment sequence for workers, bots, and personas.

Deployment follows the DAG order: (1) expand-only migrations, (2) worker workloads, (3) main bot workloads, (4) persona workloads, (5) post-rollout reconciliation.

### 33.3 Adaptive & Horizontal Scaling

```
TABLE 33-A — Scaling Targets by Component

┌───────────────────┬───────────────────────────────────────────────────┐
│ Component │ HorizontalPodAutoscaler Target │
├───────────────────┼───────────────────────────────────────────────────┤
│ Bot pods (gateway- │ A blend of CPU utilization and shard count per pod — │
│ connected) │ CPU alone under-signals load for a mostly I/O-bound │
│ │ workload, so shard count acts as a floor ensuring │
│ │ scale-out keeps pace with guild growth even when CPU │
│ │ usage looks moderate │
│ Dedicated worker │ dumby_queue_depth (§27.3), per §29.5 — a backing-up │
│ pods │ queue is a more direct capacity signal than CPU for an │
│ │ I/O-bound job workload │
│ HTTP server (if │ Request rate and P95 latency on the Fastify listener, │
│ deployed separately) │ where a deployment splits it from the bot pods entirely│
└───────────────────┴───────────────────────────────────────────────────┘
```

### 33.4 Database Performance Practices

Connection pooling (`DATABASE_POOL_MAX`, default `10` per process, §23.2) bounds how

 The fleet-wide connection budget MUST satisfy `max_pods × DATABASE_POOL_MAX × 1.2 + 20 ≤ PostgreSQL max_connections`; `DATABASE_POOL_MAX` is tuned down as pod count scales up and a connection pooler (PgBouncer in transaction mode) fronts PostgreSQL so the application never reaches the server's connection ceiling. An HPA pod ceiling is derived from this formula rather than chosen independently.

§33.4 states: "A deployment with N pods must ensure N × DATABASE_POOL_MAX ≤ PostgreSQL's max_connections. The reference Terraform module sets max_connections = (max_pods × pool_max × 1.2) + 20."

many concurrent connections any single pod opens against PostgreSQL — with fleet-wide
connection count scaling with pod count, `DATABASE_POOL_MAX` is tuned down as pod
count scales up, in coordination with PostgreSQL's own configured connection ceiling,
rather than left at a fixed per-pod value that could exhaust the database's total
connection budget during a large scale-out. `DATABASE_STATEMENT_TIMEOUT_MS` (default
`10,000`) prevents one runaway query from holding a connection indefinitely. Every
module-owned table's migrations are expected to include the indexes its own known
query patterns require — §12.8's `reminders` migration indexing `(status, fireAt)`
specifically because `findDuePending` filters and would otherwise scan on both — with
index coverage for hot query paths treated as a standard code-review checklist item
alongside the migration's own correctness.

#### Design Consideration — Rollback Completion Criteria

Auto-rollback is specified, but its completion criteria are not. The specification requires explicit completion criteria enforced by Swastik's rollback logic (active symlink read-back, audit events per step) plus alerting when a rollback fails or stalls. This makes an existing safety mechanism reliable enough to depend on.
### 33.5 Service Level Objectives & Alerting Thresholds

```
TABLE 33-B — SLO Reference

┌─────────────────────────┬─────────────┬─────────────┬─────────────────┐
│ Signal │ Target │ Warn │ Critical │
├─────────────────────────┼─────────────┼─────────────┼─────────────────┤
│ Command P95 end-to-end │ < 3,000 ms │ ≥ 3,000 ms │ ≥ 5,000 ms │
│ latency (all tiers blended) │ │ │ │
│ Unexpected error rate │ < 2% │ ≥ 2% │ ≥ 5% │
│ (dumby_errors_unexpected_ │ │ │ │
│ total / dumby_commands_total)│ │ │ │
│ Cache hit ratio (Standard/ │ > 70% │ ≤ 70% │ ≤ 50% │
│ Marketplace tier) │ │ │ │
│ Cache hit ratio (Core tier) │ > 95% │ ≤ 95% │ ≤ 85% │
│ Queue depth (any queue, │ Draining │ Sustained │ Sustained growth, │
│ sustained trend) │ within │ growth over │ approaching worker │
│ │ minutes │ 15 minutes │ saturation │
│ Redis availability │ 99.9% │ Any observed │ Any sustained outage │
│ │ │ blip │ beyond a few minutes │
└─────────────────────────┴─────────────┴─────────────┴─────────────────┘
```

Every threshold above maps to a Prometheus alerting rule built on the metric families
in §27.3; the specific per-tier P50/P99 targets from §13.8 are the finer-grained
companion to this table's blended, system-wide view — §13.8 is what a module author
tunes their own handler against, and this table is what an on-call operator is paged
against. Every threshold here is a measured, tunable quantity: each is tracked in CI
against the release corpus, restated in its measured form wherever it is claimed, and
adjusted by evidence rather than assertion (ADR-007, docs/adr/). No target in this
reference is stated as an absolute guarantee — a target is a number with an alert
wired to it, and its detection and error rates are themselves measured and reported.

#### 33.5.1 Duplicate Source Detection

The Swastik upload handler detects when a developer uploads the exact same source archive twice.

**Mechanism:** On upload, the handler computes a SHA-256 `sourceArchiveHash` of the incoming archive and looks it up against the `builds.sourceArchiveHash` column. On a match it responds `"This source has already been built as buildId X"`; policy may still assign a new buildId.

**Dependency:** Redis-backed state.

### 33.6 Hot Path Optimization

The command dispatch hot path — everything between `interactionCreate` firing and a
handler beginning execution — is the one execution path in the system held to the
tightest performance discipline, since its overhead is paid on literally every
interaction regardless of what that interaction ends up doing. Three properties keep
it fast: the module-active check and every middleware-layer config lookup reads
through the L1 in-process cache in the overwhelming majority of cases (§13.4, §6.4),
never touching Redis or PostgreSQL on the common path; `CommandRegistry`'s
`Map`-based lookup (§17.3) is O(1) regardless of how many commands a deployment has
registered; and Core-tier's deliberate skip of the RBAC layer (§13.2, §21.1) removes
an entire resolution step from the one tier explicitly expected to carry the least
possible overhead. Worker thread offloading (§15.2) is the complementary discipline
on the other side of this same concern — anything CPU-heavy enough to threaten the
event loop's ability to keep servicing this hot path promptly is moved off it
entirely, rather than optimized in place.

## 34. Privacy & GDPR Compliance

**Status:** [SPEC]

### 34.1 Data Minimization

The Global Data Emit pattern (§14.1, Pattern 5) falls under this section's discipline
explicitly: a published public dataset may carry only data its declared schema
publishes, the schema is reviewed at Gate 3 (§16.4) for personal-data content, and a
dataset found to emit personal data without an explicit, documented purpose is a
rejected submission — public durability (the dataset is readable by every module in
the fleet) is exactly the property that makes minimization non-negotiable for it.

A module's manifest declares exactly the Discord intents it requires (§11.2); the
framework requests only the union of what loaded modules actually declare, never a
broad, precautionary set of intents "in case a future feature needs them." The same
discipline applies to stored data: a module's schema captures what its own feature
genuinely needs to function, not every field Discord's API happens to expose about a
user or message. This is not merely a compliance nicety — it is the direct, practical
consequence of Principle P2 (Module Sovereignty, §3) and the intents field being a
mandatory manifest declaration rather than an ambient runtime capability (§32.4):
minimization is enforced by the same mechanism that enforces module isolation, not by
a separate policy layered on top.

### 34.2 Right to Erasure

A user or guild administrator's request to delete personal data is handled through a

**purgeByUserId Hook Coverage Verification**
A module can add a user-data table without implementing purgeByUserId; the ErasureCoordinator calls a no-op hook and data remains.

A manifest/CI check requires purgeByUserId for any module declaring user-data tables; the hook must be non-empty and tested.

dedicated erasure workflow that reaches every module, not just the core-owned tables:
every repository's `BaseRepository` (§24.3) exposes a standard `purgeByUserId` /
`purgeByGuildId` hook, and every module is **required** to implement `purgeByUserId` / `purgeByGuildId` against its own
tables — the same three-layer rule and module-sovereignty boundary that keeps a
module's data private from other modules is also what makes each module solely
responsible for correctly erasing its own share of a user's data on request. A
central `ErasureCoordinator` service invokes every registered module's hook and
records the outcome in `audit_logs`, giving a single, auditable confirmation that
erasure reached every table across the entire system rather than only the tables a
manually-maintained checklist happened to remember.

The coordinator is deliberately conservative: if any module's `purgeByUserId` hook fails or times out, erasure completes with "partial success" and no automatic retry — the gap stays visible in `audit_logs` rather than being hidden. The target state adds retry, a dead-letter queue, and post-erasure verification.

- ErasureCoordinator specified (§34.2). Calls each module's `purgeByUserId` hook. If a hook partially fails (timeout), erasure completes with "partial success" — no retry..

- Implemented coordinator with retry, dead-letter queue, and verification.

### 34.3 Data Retention Policies

`guild_module_states.dataRetentionPolicy` (§13.4's schema) governs what happens to a
module's guild-scoped data when that module is disabled or uninstalled:
`'retain'` keeps the data intact against the possibility of re-enabling later;
`'purge_after_30d'` schedules a cron task (§29.6) to erase it if the module remains
disabled past that window. This is a per-guild, per-module choice — a guild
administrator disabling a moderation module because they're reorganizing their
server's structure likely wants `'retain'`; a guild administrator uninstalling a
Marketplace integration they no longer use may prefer the data purged automatically
rather than lingering indefinitely.

### 34.4 Anonymization in Analytics & Telemetry

Guild-facing usage analytics (§31.3) are guild-scoped by construction — never
aggregated across guilds in a way that could re-identify one guild's usage pattern
from another's. Framework telemetry (§31.5) goes further: no guild-identifying,
user-identifying, or content value of any kind is included in its fixed, auditable
payload schema, by design rather than by best-effort scrubbing after the fact — the
schema itself has no field capable of carrying that data, which is a stronger
guarantee than a redaction step applied to a payload that could otherwise contain it.

### 34.5 Cross-Border Data Transfer

Because PostgreSQL and Redis are the sole locations any persistent state lives
(§26.1), a deployment's data residency posture is entirely a function of where an
operator provisions those two stores — the application layer has no independent data
locality behavior to reason about beyond that. The Terraform reference (§41.6) treats
database and cache region as an explicit, top-level configuration input specifically
so an operator with a regional data-residency requirement (EU guild data staying in
an EU region, for instance) satisfies it at the infrastructure layer, once, rather
than needing region-awareness threaded through application code.

### 34.6 Children's Privacy

Discord's own platform terms restrict use of the service to users meeting Discord's
minimum age requirement, and this architecture neither collects data intended to
verify or contradict a user's stated age nor implements any child-specific data
handling beyond what already applies uniformly to every user under §34.1–§34.4 — data
minimization, erasure, and retention apply identically regardless of who the data
belongs to. A deployment operating in a context with additional child-specific
regulatory obligations beyond Discord's own platform terms is responsible for
whatever additional controls that context requires; this architecture's uniform
privacy posture is a floor, not a substitute for jurisdiction-specific legal review.

## 35. Multi-Identity Operation — Twixter & Personas

**Status:** [SPEC]

### 35.1 The Two Ceilings That Motivate a Second Identity

Two hard, platform-level ceilings define when one Discord Application is no longer
enough for a guild's needs, independent of anything this framework controls:

```
TABLE 35-A — The Two Ceilings

┌───────────────────────┬─────────────────────────────────────────────────┐
│ Ceiling │ Consequence Once Reached │
├───────────────────────┼─────────────────────────────────────────────────┤
│ 100 registered commands │ A guild running enough Core, Standard, and │
│ per guild per application │ Marketplace modules simultaneously can exhaust the │
│ │ command budget a single application is allotted — │
│ │ §17.8's BCCM projection check (rename/alias/deletion │
│ │ requests) enforces this ceiling but cannot create │
│ │ additional budget beyond it │
│ One active voice │ A single bot connection holds at most one concurrent │
│ connection per guild │ voice-channel connection — a guild wanting, say, an │
│ per application │ audio-playback module and an independent voice-based │
│ │ moderation/recording module active at the same time │
│ │ cannot do so under one identity │
└───────────────────────┴─────────────────────────────────────────────────┘
```

### 35.2 What a Persona Is — and Is Not

A **Persona** is not a lighter-weight bot, a feature flag, or a second process running

Enforce token uniqueness via Kubernetes Secret naming and validate token uniqueness at Stage 15 startup.

reduced functionality — it is the identical framework, bootstrapped through the
identical eighteen-stage sequence (§8.2), running as a genuinely separate Discord
Application: its own application ID, its own bot token, its own branding (name,
avatar, description), and its own gateway connection, requiring its own separate
server invite into any guild that wants to use it. The guild administrator
commissioning the Persona supplies that application and token themselves
(bring-your-own-identity): the guild owns the Discord identity, and Dumby hosts and
operates the instance. One Persona serves exactly one server (single-server-bound) —
a Twixter instance is commissioned by a guild, bound to that guild, and never shared
across guilds. **Twixter** is the subsystem responsible for a Persona's entire
lifecycle — registration through the Twixter registration API (ADR-011, docs/adr/),
branding configuration, deployment, and eventual retirement — but a running Persona
is simply another instance of `src/entry/main.ts` (§7.5), started against the
commissioning guild's token, sharing the same PostgreSQL primary, the same Redis
instance, and the same BullMQ queues as the main bot and every other Persona a
deployment runs.

```
TABLE 35-B — Main Bot vs. Persona

┌────────────────────────┬───────────────────────────┬───────────────────┐
│ │ Main Bot │ Persona │
├────────────────────────┼───────────────────────────┼───────────────────┤
│ Discord Application ID │ The deployment's primary │ A distinct, separately │
│ │ identity │ registered application │
│ Bot token │ Primary BOT_TOKEN │ Supplied by the │
│ │ │ commissioning guild │
│ │ │ administrator │
│ │ │ (bring-your-own- │
│ │ │ identity), stored with │
│ │ │ identical discipline │
│ │ │ (§32.1) │
│ Command budget │ Its own 100-command ceiling, │ An independent, separate│
│ │ per guild │ 100-command ceiling, │
│ │ │ per guild │
│ Voice connection capacity │ One per guild │ One per guild, │
│ │ │ independent of the │
│ │ │ main bot's own │
│ Codebase / module registry │ Same codebase │ IDENTICAL codebase — │
│ │ │ never a fork or a │
│ │ │ reduced build │
│ Database / cache / queues │ Shared │ Shared — same instances │
│ RBAC, permission engine, │ Same engine, same source of │ Same engine, same │
│ guild config │ truth │ source of truth │
└────────────────────────┴───────────────────────────┴───────────────────┘
```

#### Design Consideration — Heap-Diff Watcher

A proposed three-layer memory-leak detection architecture: (1) a Heap Diff Watcher that snapshots and diffs heap profiles between intervals; (2) a Managed Resource Registry for framework-enforced cleanup; (3) a graceful memory-pressure valve. Implemented together as core framework features, leak protection becomes a default property of the runtime rather than an operator's postmortem chore. Impact: High; Feasibility: Medium.

### 35.3 Persona Bindings — Which Identity Runs What

A guild administrator configures **persona bindings**: a mapping, stored alongside
`guild_module_states` (§13.4), from a specific module to the identity — main bot or a
named Persona — that should register and dispatch that module's commands and event
handlers for this guild. A guild that has invited both the main bot and one Persona
might bind its audio-playback module to the Persona specifically to claim an
independent voice connection, while every other module stays bound to the main bot
by default. The binding table `guild_persona_bindings` is keyed
`(guildId, moduleSlug)` — the primary key names one module in one guild, and a
unique constraint makes exactly one live binding per pair, because the unit of
binding is one module in one guild, not the guild as a whole — and
`persona_identities` carries each Persona's `discordApplicationId`, the Discord
application ID its process presents; the binding service resolves dispatch by
exactly these columns. Bindings persist in a real repository: the
`guild_persona_bindings` rows are read and written through a typed repository
against PostgreSQL (§24.2), never an in-memory mock, and the bind is locked
while live — a bind request naming a different persona for an already-bound
`(guildId, moduleSlug)` pair is refused with an ephemeral "occupied by another
persona" notice, and only an explicit unbind (or the module's disable) releases
the lock for a new bind to claim. This is a per-guild choice; a Persona brought into one guild for its
independent voice capacity has no bearing on how any other guild that has also invited
it chooses to bind its own modules. A Persona process boots against its own
`PERSONA_ID` environment variable, and the binding service is constructed at
bootstrap alongside it (§18.5.1); at dispatch, the "occupied by another persona"
gate holds — a command key already registered by one Persona in a guild is rejected
for a different Persona rather than silently overridden.

```
DIAGRAM 35-A — Persona Binding at Dispatch Time

 Gateway event / interaction arrives at Persona P's own gateway connection
 │
 ▼
 CommandRouter / EventRouter resolve exactly as they would for the main bot
 (§17.3, §18.3) — the persona binding determines WHICH commands and
 handlers were registered against Persona P's own Discord Application in
 the first place (§35.4); once an interaction lands on Persona P's
 connection, dispatch proceeds through the identical pipeline
```

### 35.4 Command & Voice Allocation Across Personas

Command deployment (§17.4) is computed per-identity: for a given guild, the main
bot's `CommandDeployer` registers only the modules bound to the main bot for that
guild; a Persona's own `CommandDeployer` instance — running inside that Persona's own
process — registers only the modules bound to it. The two command budgets are
therefore genuinely independent 100-command ceilings, and a guild using both
identities effectively has up to 200 available command slots split however its
persona bindings allocate them. Voice connection allocation works identically:
whichever identity a voice-dependent module is bound to is the identity whose single
per-guild voice connection that module uses, and binding two voice-dependent modules
to two different identities is precisely how a guild gets both running concurrently.

### 35.5 Governance

Persona registration runs through the **Twixter registration API**: the guild
administrator registers the Discord application they already own, the API validates
the application's existence and the registrar's authority over it, and the resulting
Persona is bound to that one guild (ADR-011, docs/adr/). Because the identity is the
guild's own, hosting it is not an act of fleet authority — but the host's side of the
operation (provisioning the Persona's process, secrets, and quota against the shared
infrastructure) is reserved to process owners, exercised through the same
`BOT_OWNER_IDS`-gated surface as every other infrastructure act. A guild
administrator's own authority covers their Persona's bindings, branding, DM posture,
and retirement — deciding which of their modules their Persona handles, never
another guild's. This mirrors the same authority split already established between
P14's global-authority capability (§3) and a guild's own local, per-guild
configuration (§23.3): hosting capacity is a fleet-wide, deliberate act; the use of
an identity a guild already owns for that guild's own convenience is not.

### 35.6 The Twixter Charter — Free Default, Explicit Sunset

Personas run under a **free charter**: a guild commissions a Persona, supplies its own
application and token, and pays nothing to the host for the instance — the free default
is the only charter v5.0 specifies, and no monetization wiring exists for Twixter (the
reserved monetization scaffold, §7.6, stays empty and out of scope). The charter
carries an **explicit sunset condition** (ADR-008, docs/adr/): the free default ends
when the hosting cost of Persona capacity stops being incidental — concretely, when
Persona fleet capacity requires dedicated infrastructure beyond the shared deployment,
or when any per-Persona cost line becomes measurable in the host's accounting,
whichever comes first. What happens at the sunset is a recorded decision at that
point, not a silent change: existing single-server-bound Personas will be honored
under a grandfathering decision made openly, and the sunset condition itself is the
contract that makes the free default honest — it was never an unconditional forever.

# PART VII — MODULE CATALOG (ILLUSTRATIVE EXAMPLES)

---

## 36. Catalog Conventions & Illustrative Module Index

**Status:** [SPEC]

### 36.1 Why This Catalog Is Index-Depth by Design

This is a deliberately different kind of section from everything preceding it. Every
other Part in this reference specifies a *mechanism* — the bootstrap sequence, the
permission engine, the caching layer — completely, because a mechanism is something
every deployment shares regardless of which modules it happens to run. A module
catalog is different in kind: it is a list of the *sorts* of things module authors
build on top of those mechanisms, not a further layer of framework specification.
Fully designing all twenty-two entries below — their exact commands, their exact
schemas — would misrepresent this catalog as a second, competing specification
sitting alongside Part III's actual module contract, when its real purpose is
narrower: giving a reader a concrete sense of the *range* of what the tier system and
module contract are built to support, and a naming/categorization convention to follow
when adding a new one. §12's worked `reminders` example is the actual "how to build a
module" reference; this catalog is a map of the territory, not a second set of
blueprints.

### 36.2 Illustrative Module Index

```
TABLE 36-A — Twenty-Two Illustrative Modules by Tier

┌───┬────────────────────┬─────────────┬─────────────┬────────────────────────────┐
│ # │ Name │ Tier │ Marketplace │ One-Line Purpose │
│ │ │ │ Category │ │
├───┼────────────────────┼─────────────┼─────────────┼────────────────────────────┤
│ 1 │ diagnostics-console │ admin │ — │ Owner-only live process │
│ │ │ │ │ introspection (memory, │
│ │ │ │ │ event-loop lag, DI state) │
│ 2 │ fleet-control │ admin │ — │ Discord-native wrapper over a │
│ │ │ │ │ curated subset of PEP's │
│ │ │ │ │ control domains (§22.3) │
├───┼────────────────────┼─────────────┼─────────────┼────────────────────────────┤
│ 3 │ help │ core │ — │ Dynamically generated command │
│ │ │ │ │ reference, always current │
│ │ │ │ │ against the live registry │
│ 4 │ ping │ core │ — │ Gateway and API latency │
│ │ │ │ │ diagnostic │
│ 5 │ settings │ core │ — │ Guild-facing surface for │
│ │ │ │ │ guild_configs and module │
│ │ │ │ │ enable/disable state (§1.2's │
│ │ │ │ │ own running proof) │
│ 6 │ guild-info │ core │ — │ Server metadata, member count, │
│ │ │ │ │ boost tier, creation date │
├───┼────────────────────┼─────────────┼─────────────┼────────────────────────────┤
│ 7 │ moderation │ standard │ — │ ban/kick/mute/warn/case │
│ │ │ │ │ management (§11–§12's shape) │
│ 8 │ welcome │ standard │ — │ Join/leave message composition │
│ 9 │ leveling │ standard │ — │ XP and rank tracking │
│10 │ logging │ standard │ — │ Configurable event-to-channel │
│ │ │ │ │ audit logging │
│11 │ auto-role │ standard │ — │ Role assignment on join │
│12 │ reaction-roles │ standard │ — │ Self-service role selection │
│13 │ birthdays │ standard │ — │ Scheduled birthday │
│ │ │ │ │ announcements │
│14 │ starboard │ standard │ — │ Cross-posting highly-reacted │
│ │ │ │ │ messages │
│15 │ anti-raid │ standard │ — │ Join-rate anomaly detection and │
│ │ │ │ │ temporary lockdown │
│16 │ giveaways │ standard │ — │ Timed entry/winner-selection │
│ │ │ │ │ events │
├───┼────────────────────┼─────────────┼─────────────┼────────────────────────────┤
│17 │ audio-playback │ marketplace │ audio │ Voice-channel music/audio │
│ │ │ │ │ playback │
│18 │ ticketing │ marketplace │ community │ Private support-channel workflow │
│19 │ economy │ marketplace │ community │ Virtual currency, shop, minigames │
│20 │ translate │ marketplace │ utility │ On-demand or reaction-triggered │
│ │ │ │ │ message translation │
│21 │ stream-alerts │ marketplace │ integrations │ Twitch/YouTube live-notification │
│ │ │ │ │ webhooks │
│22 │ verification │ marketplace │ security │ Captcha/rule-acknowledgment gate │
│ │ │ │ │ before full server access │
└───┴────────────────────┴─────────────┴─────────────┴────────────────────────────┘
```

None of the twenty-two rows above has a command surface, a schema, or an event
catalog defined by this reference — consistent with §36.1. Every one is a name, a
tier, and a one-line statement of intent, exactly deep enough to illustrate the tier
system's range and nothing deeper.

### 36.3 Using This Catalog When Designing a New Module

Three checks worth running against this table before starting a new module,
independent of which of the twenty-two names (if any) it resembles:

```
TABLE 36-B — Pre-Design Checklist

┌───┬───────────────────────────────────────────────────────────────────┐
│ 1 │ Does an honest reading of §13.3's tier co-constraints put this module │
│ │ where I expect? A moderation-adjacent idea that turns out to need no │
│ │ guild-level disable ever might actually be Core, not Standard. │
│ 2 │ Does this genuinely need to be a NEW module, or does it belong as a │
│ │ feature inside an existing one? A second leveling-adjacent idea might │
│ │ be a command added to #9 rather than module #23. │
│ 3 │ If this is Marketplace-tier, which of the five categories (§16.3) │
│ │ actually fits — and if none does comfortably, is this really │
│ │ Marketplace-appropriate, or does it belong at Standard tier instead? │
└───┴───────────────────────────────────────────────────────────────────┘
```

The worked example in §12 is the actual authoring reference once these three
questions are answered — this catalog's job ends at helping a module author place
their idea correctly within the tier and category system before they open their first
file.

# PART VIII — ENGINEERING LIFECYCLE

---

## 37. Testing Architecture & QA

**Status:** [SPEC]

### 37.1 Testing Philosophy

Principle P8 (§3) — test in isolation, deploy with confidence — is the entire
philosophy underlying this section: every class's dependencies arrive through the DI
container (§10), which means every class is testable in complete isolation from real
infrastructure, and the test pyramid below is organized around exploiting that
property as fully as possible before paying the much higher cost of an integration or
end-to-end test.

**Honesty invariants for the suite itself (ADR-007, docs/adr/).** Detection and
quality claims are stated in measured form everywhere in this reference: the review
pipeline's detection rates are tracked against a corpus of known-bad samples and
reported as measured, tunable numbers driven toward their floor; the leak-regression
suites report the five leak vectors' containment as a tracked rate over the
load/unload and Renderer lifecycle suites; no test tier or gate is described as
catching "all" or "zero" of anything, because a rate that is measured can be improved
and a rate that is asserted absolutely cannot be verified at all. CI asserts the
measured rates stay at or above their current recorded values, and the recorded
values move only with evidence.

### 37.2 The Four-Tier Test Pyramid

```
DIAGRAM 37-A — Test Pyramid, Illustrative Scale for a Mature Deployment

 ▲
 ╱ ╲ E2E (~10)
 ╱ ╲ Full stack, real test Discord guild,
 ╱─────╲ real bot connection — slowest, run
 ╱ ╲ pre-release rather than per-commit
 ╱ Smoke ╲ Happy-path smoke (~15)
 ╱ (~15) ╲ One golden-path assertion per critical
 ╱─────────────╲ command — fast enough to run pre-deploy
 ╱ ╲ as a release gate
 ╱ Integration ╲ Integration (~50)
 ╱ (~50) ╲ Repository against a real test-database
 ╱───────────────────── ╲ instance; service+repository together
 ╱ ╲
 ╱ Unit ╲ Unit (~500+)
 ╱ (~500+) ╲ Every service, command, and
 ╱───────────────────────────────╲ middleware class in isolation via
 MockContainer (§10.7) — the large
 base of the pyramid, run on every
 commit
```

```
TABLE 37-A — Pyramid Layer Reference

┌─────────────┬──────────────────────────────┬───────────────┬───────────────┐
│ Layer │ What It Verifies │ Real Infra? │ Run Frequency │
├─────────────┼──────────────────────────────┼───────────────┼───────────────┤
│ Unit │ One class's logic, in isolation, │ None — │ Every commit, │
│ │ via MockContainer (§10.7) │ MockContainer │ every PR │
│ │ │ substitutes │ │
│ │ │ everything │ │
│ Integration │ A repository against a real test- │ Real test- │ Every PR │
│ │ database instance; a service+ │ database │ │
│ │ repository pair together │ instance │ │
│ Happy-Path │ One golden-path assertion per │ MockContainer, │ Pre-deploy, │
│ Smoke │ critical command — fast enough to │ minimal real │ release gate │
│ │ gate a release without full E2E cost │ infra │ │
│ E2E │ The full stack against a real test │ Real Discord │ Pre-release, │
│ │ Discord guild and a real bot │ test guild, real │ not per-commit │
│ │ connection │ bot connection │ │
└─────────────┴──────────────────────────────┴───────────────┴───────────────┘
```

### 37.3 MockContainer & Fixtures, Expanded

§10.7 introduced `MockContainer`'s role in unit testing; `src/shared/testing/fixtures/`
supplies reusable, realistic sample data — a fixture guild, a fixture user, a fixture
moderation case — so tests across the codebase share a consistent baseline rather than
each hand-rolling ad-hoc test data. A well-formed unit test for a service constructs a
`MockContainer`, registers the class under test with its real implementation,
resolves it, exercises it, and asserts against the container's typed assertion
methods (`assertEmitted`, `assertEnqueued`, `assertLogged`) — no real network call, no
real database, no real Discord connection, ever, at this layer.

### 37.4 Coverage Requirements

Coverage floors are deliberately not uniform across the codebase — code closer to the
framework's own core carries a stricter bar than a module's own repository layer,
reflecting how much blast radius a regression in each layer actually carries.

**Verification item.** The floors in Table 37-B are per-layer, not a single global threshold. Verify that the Vitest coverage configuration (§37.4) actually enforces the statement/branch floors per layer as documented.

```
TABLE 37-B — Coverage Floors by Layer (statement / branch)

┌─────────────────────────────┬───────────────┬───────────────┐
│ Layer │ Statement │ Branch │
├─────────────────────────────┼───────────────┼───────────────┤
│ Application Core (src/core/) │ 85% │ 80% │
│ Module services │ 80% │ 75% │
│ Module commands │ 75% │ 70% │
│ Repositories (core and module) │ 70% │ 65% │
│ Infra-adjacent services │ 70% │ 65% │
│ (queue processors, HTTP routes) │ │ │
└─────────────────────────────┴───────────────┴───────────────┘
```

CI enforces these as hard gates per-layer, not as a single repository-wide average —
a change that adds well-tested module code cannot mask a drop in Core coverage by
diluting a blended average; each layer's own floor must hold independently.

Verification status: the per-layer floors above and the five architecture-specific ESLint rules (§38.4) are independently checkable — the floors are encoded in the project's Vitest coverage thresholds and the rules in its flat ESLint configuration. Any divergence between this table and the enforced thresholds, or a blanket average replacing per-layer gates, is a defect to be reported against this section.

### Mock-First Discord (Headless Testing)

Testing is mock-first: `MockGatewayAdapter` (~76 LOC) with deterministic guild-to-shard assignment via `guildId hash mod shardCount`, paired with `gateway.live-adapter.ts` for live connections. This headless, deterministic foundation is what the coverage floors in this section assume — no live Discord dependency in the test suite.

### 37.4.4 Vitest Configuration — Referenced but Location Unconfirmed

`vitest.config.ts` and `vitest.integration.config.ts` are referenced in `apps/main/package.json` test scripts, but their existence at the expected repo/app root location has not been confirmed. If these config files are missing or misplaced, test execution and coverage collection (§37.4) would fail silently or use defaults. The specification requires confirmation that both configs exist at `apps/main/vitest.config.ts` and `apps/main/vitest.integration.config.ts`, resolve correctly, and enforce the per-layer coverage thresholds defined in TABLE 37-B.

### 37.4.3 Proactive Backfill Migration — Declared Only (~10%)

Proactive backfill migration is declared in the migration runner specification but not yet implemented at approximately 10% completion. The backfill phase is intended to run data migration scripts proactively (ahead of deploy-time migration) for large datasets that would cause deploy-time delays. The specification requires a backfill phase integrated into the migration runner that can be triggered independently of deployments, with progress tracking and idempotent execution.
### 37.4.2 i18n, Data Erasure, Webhook Verification — Missing or Unwired

Circuit breaker and rate limiting are live and tested, but three subsystems are either missing or unwired: (1) the i18n module (`I18nManager` exists in `src/i18n/` with formatters and tests but is not registered in `CORE_TOKENS` or called by any middleware), (2) the data erasure service (compliance requirement), and (3) webhook signature verification middleware. The specification requires all three subsystems wired into the bootstrap and middleware pipeline, with per-layer coverage floors met per §37.4.
### 37.4.1 SLO Alerting Thresholds — Declared Only (~20%)

SLO alerting thresholds are declared in observability configuration but not yet implemented as active alert rules or dashboards. The current state is approximately 20% — threshold values are specified but no Prometheus alert rules, Alertmanager routing, or Grafana dashboards have been created. The specification requires alert rules wired to Alertmanager with corresponding dashboards for each declared SLO (latency, error rate, throughput).
### 37.5 Load & Performance Testing

Distinct from the four functional layers above, load testing validates the SLO
targets specified in §33.5 directly, against a staging deployment rather than unit-
level mocks — synthetic interaction volume ramped against staging's HTTP and gateway
surfaces, measuring the same P95/P99 latency and error-rate signals production
alerting watches for. This is a release-gate activity for changes touching the hot
dispatch path specifically (the middleware pipeline, the permission engine, the cache
layer) rather than a per-commit check, since realistic load generation is
meaningfully more expensive to run than the functional pyramid above and targets a
different question — not "is this correct" but "does this still meet its latency
budget at realistic volume."

Coverage thresholds in vitest.config.ts are set per-layer (independent floors matching the spec) rather than a single blanket 70/65/70/70 floor, so a weak layer cannot be masked by aggregate coverage.

## 38. Developer Experience & Tooling

**Status:** [SPEC]

### 38.1 Scaffolding CLI

`pnpm dumby scaffold module <name>` (§12.2 demonstrates it in full) is developer
convenience, not core functionality (§4's non-goals) — it generates a manifest-valid
skeleton matching whatever structural components the author selects (commands,
services, repositories, jobs, events, routes), a stub migration if the module needs a
table, and a stub locale file, but the framework behaves identically whether a module
was scaffolded or hand-authored from nothing. The scaffold's only special power is
saving a developer from retyping the same boilerplate every module needs; it confers
no capability a hand-written module lacks.

**All Feature Categories: Zero Shipped Features**
0% implemented. All 11 feature categories are "architecturally supported as a module" but none are shipped. The pattern is uniform: "Supported as a module. No shipped [feature]."

First-party Standard-tier modules shipped for each category, each with commands, events, services, repositories, migrations, locales, and tests.

**Phase 4: Shipped modules (0%)**
0% — `/health`, `/hello` don't exist anywhere.

Both commands implemented and wired.

**Shipped `/health` and `/hello` modules do not exist on disk**
ABSENT. `src/modules/` contains only framework files (loader.ts, registry.ts, manifest.schema.ts, tier-rules.ts, topo-sort.ts, swastik-loader.ts, register-all.ts). Zero module directories. `register-all.ts` delegates entirely to `loadModulesFromSwastikVolume` which reads a mounted volume at runtime; no module source packages ship in the repo.

`health` (Core-tier) and `hello` (Standard-tier) modules (each with manifest and built artifact) promoted onto their tier volumes, registered so `/health` and `/hello` resolve at runtime.

**All 22 Illustrative Modules: None Built**
0% implemented. 22 modules cataloged as illustrative examples; none built or shipped.

22 modules built, tested, and deployed as Standard-tier first-party modules, or explicitly marked as illustrative design examples.

**Phase 2: Module system infra (~65%)**
~65% — schema/loader well-built; no `_template`; loads nothing first-party.

`_template` present; first-party modules loadable.

**register-all.ts loads no first-party modules**
register-all.ts empty of first-party imports; loads from external Swastik volume only; no _template module either.

register-all.ts imports and registers shipped first-party modules; _template scaffold present.

**Module system loads nothing first-party and has no _template (~65%)**
Schema/loader solid (~65%); no _template; loads nothing first-party.

_template module present; scaffolding CLI generates from it; first-party modules registered.

### 38.2 IDE Configuration & Snippets

The committed `.vscode/` directory (§7.1) ships a `tsx`-based debugger configuration
requiring no separate compiled-output step, editor settings matching the project's
Prettier/ESLint configuration exactly (so a contributor's auto-format-on-save produces
output identical to what CI's own format check expects), and a snippet library
(`dumby.code-snippets`) for the most repetitive authoring patterns — a new command
class skeleton, a new repository method, a manifest service entry — reducing
boilerplate friction without needing the full scaffolding CLI for a small addition to
an existing module.

### 38.3 Dev-Mode Diagnostics

Beyond development hot reload itself (§15.1), `NODE_ENV === 'development'` enables
additional diagnostic surface not present in staging or production: `trace`-level
logging by default rather than `info`, a verbose DI container resolution log (useful
for debugging a dependency that resolved to something unexpected), and relaxed rate
limits so a developer iterating rapidly against their own local guild doesn't trip
the same throttling a production user would.

### 38.4 Custom ESLint Rules

Enforcement scope: the rules in this section are compile-time constraints on source and cannot be enforced on post-compilation JavaScript — bundling and minification erase the module boundaries they inspect. Uploaded artifacts are covered by complementary measures instead: source-of-truth uploads, a post-build JS scan for banned cross-module imports, and runtime module resolution through the ESM loader.

Beyond the cross-module import ban already specified at §11.6 Rule 1, the project's

> **Compliance matrix note:** The 48-row compliance matrix in
> `docs/compliance/README.md` contains internal contradictions around
> items #23 (100-command-per-guild ceiling) and #24 (5-step collision
> resolution). Each row must be unambiguous and cross-reference the
> implementing file.

Beyond the cross-module import ban already specified at §11.6 Rule 1, the project's

, the import ban is enforceable only on TypeScript compiled by the trusted build; uploaded JavaScript bypasses ESLint entirely via dynamic `import` of computed paths or `require` in CommonJS. Swastik MUST run a post-build static JS scan (cross-module relative imports, direct DB imports outside repositories, `require`/dynamic `import` of suspicious paths, `process.env`/`node:fs`/`node:net`/`node:child_process` access, obfuscation, `eval`, top-level side effects) backed by ESM loader hooks that enforce the same restrictions at runtime.

Error detection is shifted left from runtime to upload time: the Swastik build
pipeline runs `tsc`, the architecture-specific lint rules below, and manifest
validation during module upload, so type and contract failures surface before a
module is ever staged — not at a 3 AM runtime restart.

flat ESLint configuration includes several rules specific to this architecture's own

flat ESLint configuration includes several rules specific to this architecture's own
invariants rather than generic style preferences.

> **Config schema gap:** No verification exists that a module's declared
> config Zod schema matches the config the code actually uses. Code may
> read `process.env` directly, bypassing the declared schema. A config
> consistency report and runtime config injection are needed.

 These rules are enforced on the uploaded artifact by the trusted build (§15.8), which accepts TypeScript source and runs `tsc --noEmit` plus this ruleset before signing — pre-compiled JavaScript is never accepted, so the architecture-specific lint rules cannot be sidestepped by shipping a hand-compiled artifact that skips the trusted build.
invariants rather than generic style preferences:

Scope note: these rules bind the TypeScript source under review. `tsc --noEmit` plus the rules below establish that the reviewed source is compliant; they do not establish that an uploaded JS artifact was compiled from that source. Manifest validation and the licensing/build-ID chain carry no such proof — artifact provenance is closed only by a trusted builder producing signed build attestations. Until that lands, provenance of uploaded artifacts is explicitly not guaranteed.

 For non-Marketplace uploads there is no technical barrier enforcing these rules on the deployed artifact: ESLint runs only during TypeScript compilation, while Swastik operates on compiled JS and never re-runs ESLint. The rules therefore MUST be re-enforced by a post-build static JS scan plus ESM loader import restrictions on the deployed artifact, so that isolation does not rest on developer honesty and the licence agreement.

```
TABLE 38-A — Architecture-Specific Lint Rules

> **Enforcement scope:** the rules in TABLE 38-A are NOT enforceable on uploaded JavaScript as-is — they run only during the trusted TypeScript build. Swastik MUST run a post-build static JS scan (cross-module relative imports, direct DB imports outside repositories, `require`/dynamic `import`, `process.env` access, `node:fs`/`node:net`/`node:child_process` access, obfuscation, `eval`, top-level side effects) and apply ESM loader hooks so the same invariants hold on the deployed artifact at build and runtime.

┌────────────────────────────┬──────────────────────────────────────────┐
│ Rule │ Catches │
├────────────────────────────┼──────────────────────────────────────────┤
│ no-cross-module-relative-import│ §11.6 Rule 1 — the foundational module │

 — and this rule, like the rest of TABLE 38-A, MUST be enforced on the uploaded artifact via a post-build static JS scan plus ESM loader hooks, not only at TypeScript compile time; tsc/ESLint do not run on uploaded JavaScript as-is, so without the post-build scanner and loader restrictions the isolation guarantee does not hold for uploaded modules.
│ │ isolation guarantee │
│ no-direct-process-env │ Any process.env access outside a module's own
│ │ declared config schema (§23.4) — enforcement must
│ │ be on the artifact (trusted builder), not dev honesty │
│ │ declared config schema (§23.4) — configuration │
│ │ must be validated, never read ad hoc │
│ no-embed-builder │ Any import or use of `EmbedBuilder` or │
│ │ `MessageEmbed` in module source — the │
│ │ classic-embed ban's lint layer (§4, §20.8); │
│ │ payload construction belongs to the core │
│ │ Renderer alone │
│ no-repository-in-command │ A command file importing a repository class │
│ │ directly, bypassing the service layer (§11.5's │
│ │ three-layer rule) │
│ no-event-emit-in-repository │ A repository method calling eventBus.emit — │
│ │ business-event decisions belong to the service │
│ │ layer (§11.5) │
│ require-eventsCatalog-entry │ Compile-time ONLY — Swastik has no visibility
│ │ into emitted events at upload time. Catalog
│ │ drift (emitted event not declared, or declared
│ │ event never emitted) goes undetected. AST-based
│ │ static analysis at upload is the target state. │

│ zero-trust-build-pipeline │ A Swastik module upload that bypasses the manifest │
│ │ validation + build pipeline (file-mover stage is │
│ │ replaced by a Zero-Trust Build Pipeline that │
│ │ compiles, signs, and stages the module atomically) │

│ │ present in the emitting module's own manifest │
│ │ eventsCatalog (§18.6) — the catalog and actual │
│ │ emission can never silently drift apart │
└────────────────────────────┴──────────────────────────────────────────┘
```

**Component interactions (Components V2 static-only, ~20%)**
Only static Components V2 (Container + TextDisplay) for /health and /hello; custom_id scheme, buttons, select menus, re-auth on clicks, modals, autocomplete, paginator all not implemented/declared.

InteractionRegistry + component handlers.

eventsCatalog consistency is enforced in both directions: statically, the require-eventsCatalog-entry rule rejects any eventBus.emit call whose event name is absent from the emitting module's own manifest eventsCatalog (§18.6), and at runtime a bus wrapper re-checks emitted names against the loaded catalog, so the declared catalog and actual emissions cannot silently drift apart.

#### Design Consideration — ESM Loader Import Restrictions

Isolation is currently enforced only at compile time via ESLint. Node ESM loader hooks should additionally enforce import allowlists at runtime, so a module that circumvents the linter still cannot reach forbidden code paths at load time. Reinforces the existing module isolation rules in the runtime module loader.

A project-wide ESLint rule forbidding direct `interaction.reply` calls outside Core would mechanically enforce the UIResponse/SDUI contract at authoring time, so the declarative UI vocabulary cannot be silently bypassed by a module styling its own raw embeds.
Zero-trust build pipeline: every uploaded package is untrusted input until validation, build provenance, licensing, and signature verification all succeed. The pipeline moves from trust-based to zero-trust.

- Trust-based.

- Zero-trust.

**Module Compilation.** Define the compile-time guarantee model (strict TS, ESLint, isolation rules, eventsCatalog accuracy) that Swastik currently cannot enforce post-compilation. Establish that compile-time guarantees can only be reliably enforced on source, motivating source-of-truth uploads.

- Guarantees enforced only via CI/lint for co-built modules; not for uploaded JS.

- Guarantees enforced via trusted server-side build on source.

- Compile-time lint rule only; manual review check; no upload/runtime enforcement.
- Upload + runtime enforcement.

- Enforced via ESLint (`no-cross-module-relative-import`) at compile time and manual review.

- Enforced at compile time, Swastik upload, and runtime (ESM loader restrictions).

### 38.4.1 Verification Status — Architecture-Specific ESLint Rules

The architecture-specific lint rules listed in TABLE 38-A (§38.4) are declared in the project's flat ESLint configuration. CI enforcement requires confirmed presence of all six rules (`no-cross-module-relative-import`, `no-direct-process-env`, `no-embed-builder`, `no-repository-in-command`, `no-event-emit-in-repository`, `require-eventsCatalog-entry`) with CI-enforced failure on violation. Verification should confirm each rule is active in the ESLint flat config and that the CI pipeline (`ci.yml`) runs ESLint as a hard gate — not a warning-only check. If any rule is missing or misconfigured, isolation enforcement is weaker than the documentation assumes.

**Dependency hygiene.** `knip` runs as a CI check and fails the build when an
unused dependency, unused export, or unresolved file lingers in `package.json`.
`ssh2` and `jose` are retained as dependencies of — and only of — their consuming
subsystems, CLAI's SSH server (§22.6) and the license/envelope cryptography
(§15.7, §32.7) respectively, so the dependency tree carries no speculative weight
and no orphaned package survives a refactor.

### 38.5 Documentation Auto-Generation

A dedicated build step reads every loaded module's manifest — its `description`,
`eventsCatalog`, `dashboardSchema`, and command definitions' own descriptions — and
generates a browsable reference site without any module author maintaining separate,
hand-written documentation prose. **CAUTION:** The Documentation Claims
Inventory marks some implemented features (guild_command_queue,
generate-docs.ts) as "no processing logic" or "declared" — stale claims
that create false impressions of gaps. Cross-reference with the Code
Reality Inventory is needed. This
hand-written documentation prose. This is what keeps §18.6's "the eventsCatalog is,
in effect, the API documentation" claim true in practice rather than aspirational: the
generated docs and the actual runtime contract are mechanically guaranteed to agree,
since both are read from the identical manifest source rather than one being a

since both are read from the identical manifest source rather than one being a
manually-updated description of the other.

> **Manifest drift risk:** If a developer updates command implementation
> but forgets the manifest's `commands` array, auto-generated docs show
> the old command. The command works (class exists) but docs are wrong.
> A CI check verifying manifest commands match actual class implementations is needed.
manually-updated description of the other.

## 39. Development Workflow

**Status:** [SPEC]

### 39.1 Local Environment Setup

```
$ git clone <repo> && cd dumby
$ pnpm install --frozen-lockfile
$ cp .env.example .env # fill in a development bot token, dev guild ID
$ docker compose -f docker/docker-compose.yml up -d postgres redis
$ pnpm migrate:latest
$ pnpm dev # tsx --watch src/entry/main.ts
```

`pnpm dev` runs the identical bootstrap sequence (§8.2) any environment runs, with
development hot reload (§15.1) layered on top via `--watch` — there is no separate,
reduced "local mode" bootstrap path to keep in sync with production's own startup
logic.

### 39.2 Branching & Commit Convention

Branch names carry an intent prefix — `feature/`, `fix/`, `chore/`, `refactor/` —
though the enforced discipline lives in the commit message, not the branch name.
`commitlint`, wired through Husky's `commit-msg` hook (§7.1), rejects any commit not
following the Conventional Commits format (`feat:`, `fix:`, `chore:`, `refactor:`,
`docs:`, `test:`, each optionally scoped, e.g. `feat(reminders): add snooze option`).
This discipline is what makes `changesets`-driven changelog generation (§42.3)
automatic rather than a manually-curated release note.

### 39.3 The Feature Development Cycle

```
DIAGRAM 39-A — Standard Cycle

 Issue or module proposal (using the .github/ISSUE_TEMPLATE, §7.1)
 │
 ▼
 Branch created, scaffolded if it's a new module (§38.1)
 │
 ▼
 Implementation, following the three-layer rule (§11.5) and isolation
 rules (§11.6) throughout
 │
 ▼
 Unit tests written alongside implementation, not after — a PR touching
 service or command code without corresponding test changes is a review
 flag, not merely a coverage-gate failure
 │
 ▼
 pnpm lint && pnpm typecheck && pnpm test (identical commands CI runs)
 │
 ▼
 PR opened against main, using .github/PULL_REQUEST_TEMPLATE.md
 │
 ▼
 CI pipeline (§40.1) — automated gates
 │
 ▼
 Human review — §39.4's checklist
 │
 ▼
 Merge → changesets release flow (§42.3) picks up the change for the
 next version bump
```

### Docker Build Context Is the Workspace Root

Docker builds must run with the workspace root (`Dumby-Suite-main/`) as the build context: `docker build -f apps/main/docker/Dockerfile .` from the repo root. Building with `context=apps/main` breaks because the Dockerfile COPY directives reference repo-root paths. Keep the workspace-root context and document it in the Dockerfile header comment (`apps/main/docker/Dockerfile`).

### directive.md — Normative Engineering Rules (MUST/SHOULD/MAY)

`directive.md` is the imperative rule set translating the architecture into actionable gates: structured MUST/SHOULD/MAY requirements (RFC 2119) for the Application Core and control-plane services, in eight parts, explicitly excluding frontend and module-authoring guidance. It is non-enforcing but authoritative — enforcement is via tooling (ESLint rules, `tsc` gates), not the document itself — and it stays derived from and subordinate to blueprint.md.

### 39.4 Code Review Checklist

Beyond ordinary code-quality review, a reviewer on this codebase specifically checks:

```
TABLE 39-A — Architecture-Specific Review Checklist

┌───┬───────────────────────────────────────────────────────────────────┐
│ 1 │ Tier honesty — does the declared tier (§13.3) actually match how this │
│ │ module is meant to be controlled, not just what's convenient to ship? │
│ 2 │ Three-layer rule — no repository logic in a command, no business rule │
│ │ in a repository, no event emission below the service layer (§11.5). │
│ 3 │ No cross-module reach beyond the four sanctioned patterns (§14.1) — │
│ │ lint catches the import case; review catches subtler violations. │
│ 4 │ Every migration has a working down (§24.4). │
│ 5 │ eventsCatalog is current against every actual eventBus.emit call │
│ │ (§18.6, backed by the require-eventsCatalog-entry lint rule, §38.4). │
│ 6 │ New jobs are idempotent (§29.3) — reviewer specifically checks the │
│ │ pre-condition-check pattern is present, not merely that a test exists. │
│ 7 │ Coverage floors met per layer (§37.4), not merely a blended average. │
└───┴───────────────────────────────────────────────────────────────────┘
```

**Design consideration — dependency review reports:** the Swastik upload pipeline should run a dependency scanner and return a dependency review report to the developer as part of review feedback, surfacing supply-chain risk before promotion rather than after deployment.

#### Design Consideration — Prioritized Subsystem Test Plan

Test coverage should be written in priority order using the existing DI infrastructure (`di/mock-container.ts`, the 11 ports exposed by `core/commands/ports.ts`): bootstrap, cache, db, queue, events, http, permissions, modules, middleware, shutdown. No tests exist today for 25+ subsystems despite the infrastructure being available; rated the single highest-impact action for code confidence.

#### Design Consideration — MockContainer + 11-Port Test Bootstrap

The 11-port architecture and `MockContainer` should be used to bootstrap the test suite for all subsystems, not only `core/commands` — mocks for every port make subsystem tests fast and hermetic. Rated the single highest-impact action available: the architecture exists and is simply unused for testing outside one subsystem.

**Design consideration — codify checklist items as automated pre-checks:** the automatable items in Table 39-A — eventsCatalog drift against actual `eventBus.emit` calls (item 5) and missing `down` on migrations (item 4) — should become ESLint/static-analysis gates, and an AST check for the idempotency pre-condition pattern (item 6) is feasible. Tier honesty (item 1) remains partly a judgment call and stays manual. This converts review discipline into compile-time failure wherever the tooling supports it.

### Mandatory Webhook Signature Verification

Every inbound webhook route verifies a cryptographic signature (HMAC-SHA256 or the provider's origin scheme) before parsing; no unverified payload is ever processed (`apps/main/src/http/` webhook registration, Stage 14). This is a review-checklist item: a route accepting unsigned webhooks is a blocking defect.

Base class for idempotent job processors; should check pre-conditions before acting.

A static review rule flags job processors missing pre-condition (idempotency) checks, so idempotency is not left to manual review discipline alone.

Each migration must export up and a working down.

Each migration exports a working `up` and `down`; the promotion pipeline verifies both through a disposable-DB dry-run and a forbidden-SQL scan, so migration correctness is never first exercised live at bot startup.

### 39.5 The Module Scaffolding CLI

The module scaffolding CLI is the starting point for all module development. The command is: pnpm dumby scaffold --name my-module --tier standard. This generates a complete module directory at packages/modules/my-module/ with all required files: module.ts (implementing the IModule interface), commands/ directory with a template command, events/ directory, services/ directory, jobs/ directory, models/ directory with a template migration, permissions.ts with a template permission, config.ts with a Zod schema and defaults, dashboard.ts with a template MDIS schema, i18n/ directory with an en-US.json template, and __tests__/ directory with test stubs.

The CLI also updates the pnpm-workspace.yaml file with the new module path and adds the module to the tsconfig.json paths for IDE autocompletion. For Marketplace modules, it adds the module to the marketplace catalog JSON file with a draft entry that the developer can fill in. The CLI validates the module name for kebab-case compliance and checks for collisions with existing modules.

### 39.6 Local Development Environment

The local development environment is set up with a single command: pnpm dev. This command starts: the TypeScript compiler in watch mode (tsc --watch) for automatic recompilation on file changes, the bot process (node dist/index.js) with the NODE_ENV environment variable set to development, a local PostgreSQL instance (via docker-compose), a local Redis instance (via docker-compose), and the Interface Hub web server (for testing the dashboard). The development environment uses a test bot token and a test guild, ensuring that development does not affect the production bot.

Hot reload is available in development: when a module's source file changes, the framework detects the change and reloads the module automatically (without restarting the entire bot process). This provides a fast development loop — change the code, save, see the result in Discord within seconds. Hot reload is disabled in production (where deployments use the full build-and-deploy pipeline).

### 39.7 Code Review Process

All code changes must be reviewed before merging to the main branch. The code review process ensures that changes meet Dumby's quality standards and do not introduce security vulnerabilities, performance regressions, or architectural violations.

The reviewer checks: does the change follow the module contract (lifecycle hooks, manifest fields, permission declarations)? Does the change introduce cross-module imports (which are forbidden by the ESLint configuration)? Does the change introduce direct database or Redis access (which is forbidden — modules must use the typed service interfaces)? Does the change introduce security vulnerabilities (SQL injection, XSS, token leakage)? Does the change degrade performance (N+1 queries, unbounded loops, memory leaks)? Does the change include tests (unit tests for new functions, integration tests for new interactions)? Does the change include translations (at least en-US for new user-facing strings)?

### 39.8 Debugging Tools

Dumby provides several debugging tools accessible through the Admin tier. The /dumby debug module <name> command shows a module's current state, its dependencies, its resource usage, and its recent errors. The /dumby debug event <event-name> command shows the subscribers for a specific event and the recent event delivery statistics. The /dumby debug command <command-name> command shows the command's middleware pipeline, its permission configuration, and its recent invocation statistics. The /dumby debug cache <cache-type> command shows the cache's size, hit rate, and eviction statistics. The /dumby debug perf command shows the bot's performance metrics: command latency, event delivery latency, database query latency, and cache hit rates. The Interface Hub's live log viewer shows real-time log entries with filtering by module, level, and correlation ID.

### 39.9 Developer Documentation

Dumby provides comprehensive developer documentation. The Module Development Guide covers the module contract, lifecycle hooks, command framework, event system, permission system, configuration system, and testing strategy. The API Reference provides the complete TypeScript type definitions for all framework interfaces (IModule, ICommand, IEvent, IJob, IPermission, etc.). The Examples repository contains complete, working example modules that demonstrate common patterns: a simple command module, an event-driven module, a module with background jobs, a module with the Interface Hub dashboard, and a Marketplace module with resource quotas. The Migration Guide covers how to migrate a module from one framework version to another, including breaking changes and their mitigations.

---

## 40. CI/CD Pipeline

**Status:** [SPEC]

### 40.1 CI Workflow (`ci.yml`)

Runs on every pull request and every push to `main`, as a strict, fail-fast sequence
— a later stage never runs if an earlier one fails, since there is no value in
running tests against code that doesn't even typecheck:

```
DIAGRAM 40-A — CI Sequence

 pnpm install --frozen-lockfile
 │
 ▼
 tsc --noEmit (typecheck — strict mode, §5.3)
 │
 ▼
 eslint . (lint — including every architecture-specific rule, §38.4)
 │
 ▼
 prettier --check . (format)
 │
 ▼
 vitest run --coverage (the full unit + integration pyramid, §37.2;
 coverage gates enforced per-layer, §37.4)
 │
 ▼
 tsc -p tsconfig.build.json (production build — confirms the deployable
 artifact itself compiles cleanly, not just
 the dev-time type check)
```

Compute source archive hash, compiled artifact hash, lockfile hash, gate results hash, and SBOM for provenance binding.

Provenance binding computes the source archive hash, compiled artifact hash, lockfile hash, gate results hash, and SBOM for every build.


**Workflow location, publishing, and definition of done.** All five workflows —
`ci.yml`, `release.yml`, `deploy-staging.yml`, `deploy-production.yml`,
`dependency-review.yml` — live at the repository root under `.github/workflows/`
(§7.1); GitHub Actions never triggers a workflow from a subdirectory, so a workflow
file found under `apps/main/.github/` or anywhere below the root is dead
configuration — a CI check fails the build if a workflow file appears anywhere but
the root. The repository's `.github/` carries the full operator surface alongside
the workflows: the issue and pull-request templates (`.github/ISSUE_TEMPLATE/`,
`.github/PULL_REQUEST_TEMPLATE.md`, §7.1) and a root `CODEOWNERS` mapping every
path to an owning reviewer, so a PR touching crypto, authentication, or the
module loader is routed to its mandatory reviewers by the platform rather than
by convention. The release workflow's publish step is real: `changesets publish` builds,
tags, and publishes to the configured registry with provenance attestations
attached — not a dry-run or a logged intention. The definition of done for any
change is the CI integration tier: a change is complete when the integration suite
— `vitest` against real PostgreSQL and Redis (§37) — passes in the pipeline, not
when unit tests alone pass.

Define the exact 12-step release workflow from deploy request to finalize/rollback.

**Deferred, not yet specified:** the full twelve-phase release service is greenfield work outside the current scope — the Release Manager's specified behavior is repository-triggered deployment with Deployment Records (§15.12) and lease coordination (§15.4). The phased sequence, retained for planning, is: (1) deploy request received, (2) Phase 0 INTAKE, (3) Phase 1 PREFLIGHT, (4) Phase 2 BUILD, (5) Phase 3 ARTIFACT VERIFICATION, (6) Phase 4 CONFIG AND MIGRATION, (7) Phase 5 LEASE ACQUISITION, (8) Phase 6 SWASTIK LOCK, (9) Phase 7 ROLLOUT, (10) Phase 8 CANARY VALIDATION, (11) Phase 9 FINALIZE (PASS), (12) Phase R ROLLBACK (FAIL).

### 40.2 Release Workflow (`release.yml`)

Triggered on merge to `main`. Runs `changesets version` to compute the next semver

The core change path is: CI build → automatic staging → two-approver review
gate → rolling rollout. This dual-approver gate is distinct from the module-only
Swastik upload path and is the mandatory human checkpoint before any core release
reaches production.

bump from accumulated changeset files (§42.3) and `changesets publish` to tag the

The module-only change path (Swastik upload → manifest validation → atomic symlink
swap) is the second update path and does not touch this core release workflow at
all. It is intentionally separate so module updates feel like feature toggles,
not deployments.

Two distinct update paths exist: (1) core change — CI → staging → two-approver
gate → rolling rollout (this section); (2) module-only change — Swastik upload →
validation → atomic symlink swap, no core restart. The two paths are independent:
a module-only change never triggers a core image rebuild or rollout.

release and generate the changelog — fully automated, requiring no manual version
bump commit from any contributor.

> **Dead-code tests:** vitest.config.ts explicitly includes
> `src/commands/ (the canonical command system)__tests__/**` — tests run against unwired code,
> inflating apparent coverage. Test count is not a reliable proxy for
> product completeness in this repo.

 A core restart is triggered only by an actual core release, not by a fixed
timer. Scheduled/periodic restarts are removed; restart cadence follows release
cadence so a stable core is not needlessly disrupted.

 Deployment audit/change tracking is keyed on the Swastik `audit_log`
(per-version, per-action records) rather than the Git SHA, so module-only
changes that never touch `main` are still fully tracked and attributable.

Specified. Four-tier test pyramid (unit, integration, smoke, E2E). Coverage floors enforced per-layer in CI. MockContainer substitutes all dependencies. Architecture-only.

Implemented test framework with MockContainer, coverage enforcement, and all four tiers.

**Layered Testing (4-Tier Pyramid Unfulfilled)**
Integration tests need PG+Redis; smoke/e2e/load/chaos missing.

Full pyramid.

**Test coverage 75.78%, CI has no coverage gate**
11 unit test files + 1 helpers file, all in `core/commands/__tests__/`. No tests for bootstrap, cache, queue, events, http, middleware, permissions, modules, db, resilience, ratelimit, shutdown, tracing, metrics, logging, i18n, interactions, shared, config, application, discord, di, errors. `package.json` declares test scripts and references `vitest.config.ts` / `vitest.integration.config.ts` so infrastructure is wired.

Unit tests for every subsystem; priority order bootstrap, cache, db, queue, events, http, permissions, modules, middleware, shutdown.

### 40.2.2 MDIS Dashboard Backend — Missing

The module manifest schema declares an optional `dashboardSchema` field in `manifest.schema.ts`, intended to allow modules to define custom dashboard data shapes. However, no backend implementation exists to serve dashboard data per module manifests — there is no endpoint, no data aggregation service, and no rendering pipeline. The specification requires either an MDIS (Module Dashboard Integration Service) backend serving dashboard data per module manifests, or an explicit V2 non-goal with documented rationale.

### 40.2.1 Happy-Path Smoke Test Tier — Selection Criteria Gap

The Happy-Path Smoke Test tier (§40.2) defines smoke tests as fast, per-PR suites covering the most common user journeys, but lacks precise selection criteria for what constitutes a qualifying "journey." The current definition is vague — "the most common 10–15 user journeys per module" — without specifying how journeys are selected, what coverage they must provide, or how they differ from E2E tests beyond speed. The specification requires an explicit selection criteria document defining: (1) what defines a "journey" (a single complete command invocation from input to response), (2) which journeys qualify (the top N by usage frequency from analytics), and (3) the boundary between smoke and E2E (smoke = happy path only, E2E = includes error branches).

### 40.2.1 Phase 7 CI/CD — Terraform Environment Roots (Incomplete)

Phase 7 (CI/CD, Docker, K8s, Terraform) is approximately 80% complete. All five GitHub Actions workflows are implemented and both deployment layouts (Docker and K8s) are functional. The remaining gap is that Terraform environment roots (`env/dev`, `env/staging`, `env/prod`) contain placeholder configuration rather than fully configured infrastructure definitions. The specification requires Terraform env roots with complete variable definitions, backend state configuration, provider blocks, and module references for each environment.
### 40.2.1 Rollback Retention Policy

The release workflow must retain not just a single previous version for rollback, but the last few good builds. The retention policy should be configurable via Swastik config with a sensible default (e.g., last 3 successful builds). This ensures operators can roll back beyond one version if the immediately prior release is also defective.

### 40.3 Staging Deployment (`deploy-staging.yml`)

Triggered automatically on every merge to `main`, no manual approval required — the
low-stakes, fast-feedback deployment target where the rolling-update mechanism
(§33.2), the release's own database migrations, and the full feature set are
exercised against real (non-production) infrastructure before anything reaches an
actual guild-serving fleet.

### 40.4 Production Deployment (`deploy-production.yml`)

Requires an explicit **two-approver manual gate** — two distinct human approvals,
not one, before the workflow proceeds — reflecting that a production deployment is the
one action in this entire pipeline capable of affecting every guild a deployment
serves simultaneously. Once approved, the workflow executes the identical
zero-downtime rolling-update mechanism specified in §33.2, the same mechanism
Swastik's own scheduled restart trigger (§15.5) uses — there is exactly one rollout
mechanism in this architecture, reached by every trigger that needs it, never a
separate "manual deploy path" diverging from the automated one.

**Emergency break-glass procedure:** during a verified emergency, a single approver holding a verified 2FA factor may deploy a hotfix without the second approval, subject to a written post-mortem obligation tracked as a mandatory post-incident review. The override is recorded in `audit_logs` alongside the normal deployment entries, so emergency responsiveness never comes at the cost of accountability.

The Release Manager's lease reconciliation, phase recovery, and rollback map naturally onto the controller pattern; implementing it as a controller-runtime operator (Go, Kubebuilder) would make desired-vs-actual state convergence idiomatic rather than bespoke. The Release Manager is specified as a service; a controller-operator implementation remains a design option with no contract change. Impact: Medium; Feasibility: High.

Release Manager is an external, separately built, Swastik-coordinated release actuator: it never lives at `/dumby/src/entry/release-manager.ts` or `/dumby/dist/entry/drm.js`. Canonical path: `/dumby-release-manager/src/entry/release-manager.ts` (monorepo variant `/platform/drm/src/entry/release-manager.ts`), with its own repository, build artifact, and deployment. This specification supersedes all earlier drafts that placed Release Manager inside `dumby/src/entry/`.

- Specified — Release Manager is never `/dumby/src/entry/release-manager.ts` or `/dumby/dist/entry/drm.js`. Canonical path: `/dumby-release-manager/src/entry/release-manager.ts`. Monorepo variant: `/platform/drm/src/entry/release-manager.ts`. Separate repository, build artifact, deployment.

- Implemented Release Manager in separate repository with independent Docker image and Kubernetes manifests.

Release Manager's Kubernetes RBAC is deliberately narrow: its ServiceAccount cannot read secrets, delete volumes, or mutate RBAC, and a NetworkPolicy restricts it to private-network access. Release Manager holds only the minimal permissions required for release operations (server-side apply under field manager `release-manager`).

- Specified — Release Manager ServiceAccount with least-privilege RBAC. Can't read secrets, delete volumes, or mutate RBAC. NetworkPolicy for private-network access.

- Implemented RBAC with documented permission scope.

The shared Kubernetes volume is the coordination medium for staging and symlinks across pods (`/var/dumby/modules/{staging,live,versions}/` layout): every pod sees the same code at the same time. It is availability-critical infrastructure.

- `/var/dumby/modules/{staging,live,versions}/` layout.

- Maintain; treat as availability-critical.

Define the production deployment gate.

Production deploys pass a two-approver gate enforced in the CI workflow with two distinct approvers.

Define all HTTP API endpoints for Release Manager operations.

Release Manager operations expose `POST /api/v1/deploy`, `GET /api/v1/status?deploy_id=uuid`, `GET /api/v1/stream?deploy_id=uuid` (SSE), `POST /api/v1/rollback`, `POST /api/v1/abort`, `POST /api/v1/deploy?dry_run=true`, `GET /health/liveness`, and `GET /health/readiness` — every endpoint authenticated.

### 40.5 Dependency Review (`dependency-review.yml`)

Specified in full at §32.5 — runs on any PR introducing or updating a dependency,
blocking on critical/high-severity known vulnerabilities.

```
TABLE 40-A — Workflow Summary

┌───────────────────────────┬──────────────────────┬─────────────────────────┐
│ Workflow │ Trigger │ Gate │
├───────────────────────────┼──────────────────────┼─────────────────────────┤
│ ci.yml │ Every PR, every push to │ Fully automated │
│ │ main │ │
│ release.yml │ Merge to main │ Fully automated │
│ deploy-staging.yml │ Merge to main │ Fully automated │
│ deploy-production.yml │ Manual dispatch, or │ Two-approver manual gate, │
│ │ post-staging-validation │ always │
│ dependency-review.yml │ PR touching dependencies │ Automated, severity-gated │
└───────────────────────────┴──────────────────────┴─────────────────────────┘
```

### 40.6 Workflow Security Conventions

Every workflow in `.github/workflows/` follows one secrets discipline. Secrets
reach steps as step-level `env:` values or over stdin — never as command-line
arguments, where they surface in process listings and CI logs; a step that
interpolates a secret into a command line fails review. Kubernetes credentials
never persist on the runner: a deploy step materializes its kubeconfig with
`mktemp`, applies it, and removes it in a `trap` on EXIT within the same step.
GitHub Actions are pinned by full commit SHA — never by tag or branch, which
are mutable references — and `dependabot.yml` at the repository root
(`.github/dependabot.yml`) keeps both package dependencies and the pinned
actions current, opening reviewable PRs for updates. `check-workflows.mjs`
runs in CI and fails the build on any workflow that violates these
conventions: an unpinned action reference, a secret passed on a command line,
or a kubeconfig written outside the mktemp/trap pattern.

## 41. Infrastructure & Deployment

**Runtime Vulnerability Scanning in the Release Manager Pipeline.** The Release Manager integrates runtime image vulnerability scanning (Trivy or Grype on the built container image) into its build and artifact-verification phases. Deploys fail on Critical CVEs; the scan correlates against the SBOM and fails the policy gate when a Critical-severity vulnerability is present in any layer. This closes the gap between static SBOM/signature checks and exploitable runtime flaws.

**Status:** [SPEC]

### 41.1 Docker & Multi-Stage Build

```
DIAGRAM 41-A — Multi-Stage Dockerfile Structure

 STAGE 1 — builder
 FROM node:22-slim
 Install full dependency tree (including devDependencies)
 Run tsc -p tsconfig.build.json → compiled JS output
 │
 ▼
 STAGE 2 — runtime
 FROM node:22-slim
 Install ONLY production dependencies (pnpm install --prod --frozen-lockfile)
 Copy ONLY the compiled output from Stage 1 — no TypeScript source, no
 devDependencies, no test files ship in the final image
 Non-root user; read-only root filesystem where the base image permits it
```

The multi-stage split keeps the shipped image free of anything not required to run
the compiled application — smaller attack surface, smaller image size, faster pull on
scale-out.

### 41.2 Kubernetes Reference Configuration

The reference deployment mounts the four per-tier module volumes plus staging
(§5.4) at `/mnt/modules/{admin,core,standard,marketplace,staging}` and sets
`MODULES_DIR=/mnt/modules`; no module content is baked into any image. The Release
Manager runs as its own deployment with least-privilege RBAC (§22.5) and reverse
GitHub sync — every deployment change it applies is committed back to the Git
system-of-record, so the repository and the cluster cannot silently diverge
(§5.1).

```
TREE 41-A — k8s Manifest Organization

infra/k8s/
├── base/
│ ├── deployment.yaml ← the bot Deployment (main.ts entrypoint)
│ ├── service.yaml ← ClusterIP, fronting the health/metrics/HTTP port
│ ├── configmap.yaml ← non-secret configuration values
│ ├── serviceaccount.yaml
│ └── hpa.yaml ← HorizontalPodAutoscaler (§33.3)
└── overlays/
 ├── staging/ ← Kustomize overlay: staging-specific replica
 │ count, resource requests, image tag
 └── production/ ← production-specific values; the ONLY overlay
 deploy-production.yml is permitted to apply
```

```
CODE REFERENCE 41-A — Deployment Spec, Representative Slice

spec:
 strategy:
 type: RollingUpdate
 rollingUpdate:
 maxUnavailable: 0 # §33.2 — capacity never drops during a rollout
 maxSurge: 1
 template:
 spec:
 terminationGracePeriodSeconds: 190 # §9.1's worst-case 180s + 10s buffer
 containers:
 - name: dumby-bot
 livenessProbe:
 httpGet: { path: /health/liveness, port: 3000 }
 startupProbe:
 httpGet: { path: /health/startup, port: 3000 }
 failureThreshold: 30 # generous — Stage 17's module
 # onReady cycle can legitimately
 # take a while under a large module
 # count
 readinessProbe:
 httpGet: { path: /health/readiness, port: 3000 }
```

Deploy-manifest and environment-schema agreement is CI-enforced, not assumed.
The configmap's statement-timeout key is `DATABASE_STATEMENT_TIMEOUT_MS` — the
identical key §23.2's root schema validates, in milliseconds — so a deployment
manifest and an env schema that disagree is caught before apply, not discovered as
a query that times out only in one environment. A `verify-env` CI job cross-checks
every key in the configmap and `.env.example` against the Zod root schema and fails
on any unknown or missing key; `kubeconform` validates every Kubernetes manifest
against its schema in the same pipeline; and the bot Deployment's strategy is
verified to remain `RollingUpdate` with `maxUnavailable: 0` (§33.2) — a silent
regression to `Recreate` fails the same job.


**Readiness and the live module volume.** `/health/readiness` (Stage 18) verifies
the live volume is actually serving modules, not merely that the process reached
Stage 18: it stats `/mnt/modules` (detecting a stale or unmounted NFS handle),
confirms each declared tier directory is present and non-empty, and reads every
`required: true` module's manifest from the volume. Any failure returns 503 and
removes the pod from the Service without restarting it — a transient volume hiccup
degrades capacity rather than triggering a restart storm. The same `verify-env` job
additionally diffs the configmap's key set against the schema's exported `ENV_KEYS`
(§23.2), so a key present in one and absent from the other fails CI rather than
disappearing silently in production.

### 41.3 Sharding Topology in Kubernetes

The bot `Deployment` (not a `StatefulSet`) is deliberate: shard ownership is dynamic,
Redis-lock-mediated (§26.4), not tied to a pod's stable network identity the way a
`StatefulSet` would provide — any pod can claim any currently-unowned shard range, so
the stable-identity guarantee a `StatefulSet` exists to provide is simply unneeded
here, and a plain `Deployment` (with all the simpler scaling and rollout semantics
that come with it) is the correct, sufficient primitive.

### 41.4 Terraform Infrastructure-as-Code

```
TREE 41-B — Terraform Module Organization

infra/terraform/
├── environments/
│ ├── staging/ ← environment-specific variable values, remote state backend
│ └── production/ ← same, production values — explicitly never sharing a
│ state file with staging
└── modules/
 ├── database/ ← managed PostgreSQL instance, replica configuration,
 │ backup/retention policy, region (§34.5's data-residency

**Data Residency Enforcement in Terraform**
Data residency is controlled by PostgreSQL/Redis placement; Terraform doesn't enforce region constraints, and no alert fires on region mismatch.

Terraform enforces region constraints with compliance-policy guards and region-mismatch alerts.

 │ hook)
 ├── cache/ ← managed Redis instance
 └── kubernetes/ ← cluster provisioning, node pool sizing
```

Database and cache **region** is an explicit, top-level variable in the `database`
and `cache` modules specifically so a data-residency requirement is satisfied by
setting one Terraform variable per environment, never by threading region-awareness
through application code (§34.5).

**Terraform modules (~20%)**
3 modules with READMEs; no `.tf` content beyond placeholder; env roots reserved. Missing ~80%.

Working modules + env `main.tf`.

Swastik imports the manifest to obtain its exported object, executing top-level code.

Direct import is never used to read a manifest — the manifest is extracted by static AST parsing instead (§15.8.3).

### 41.5 Deploying the Control-Plane Services & Personas

PEP, CLAI, Swastik, and the Credentials Service (§22) each get their own Kubernetes
`Deployment` — typically single-replica or small-replica-count, since none of them
carries gateway-connected, shardable load the way the bot process does — reachable
only from within the cluster's own network (CLAI's SSH listener and PEP's REST API
are never exposed on a public-facing Service/Ingress; an operator reaches them through
a bastion, VPN, or `kubectl port-forward`, never the open internet directly). A
Persona (§35) deploys as an entirely separate instance of the bot `Deployment` itself
— same manifests, same image, different `Secret` supplying its own distinct bot
token — never a special-cased workload type of its own.


Worker processes (`src/entry/worker.ts`) deploy as their own `Deployment` with
`ROLE=worker`, running `bootstrapWorker()` (§8) — no gateway connection, no API or
health server — and scale on the queue-depth and job-wait metrics §29 exposes
rather than the gateway-shaped signals the bot Deployment scales on.

### 41.6 Cloud Provider Reference — Sizing to Deployment Scale

```
TABLE 41-A — Deployment Tier Reference

┌──────────────────┬───────────────────────────────────────────────────────┐
│ Deployment Scale │ Reasonable Infrastructure Shape │
├──────────────────┼───────────────────────────────────────────────────────┤
│ Single-server │ One process, one small managed (or even self-hosted) │
│ operator │ PostgreSQL instance, one small Redis instance. No │
│ │ read replicas, no HPA, no multi-approver release gate │
│ │ needed in practice — §0.2's guidance to defer that │
│ │ ceremony until it's actually load-bearing applies directly │
│ │ here. │
│ Growing platform │ Multiple bot pods behind an HPA (§33.3), a managed │
│ │ PostgreSQL primary with at least one read replica, │
│ │ managed Redis, dedicated worker pods for queue processing │
│ │ (§29.5), staging environment mirroring production topology. │
│ Large-scale fleet │ Full sharding across many pods, multiple read replicas, │
│ │ dedicated worker pod pools per queue category, the full │
│ │ two-approver production gate genuinely earning its keep, │
│ │ Personas in active use for guilds pushing command-budget or │
│ │ voice-capacity limits (§35). │
└──────────────────┴───────────────────────────────────────────────────────┘
```

### 41.7 Runtime Tuning

Container resource `requests` and `limits` are set per-environment overlay (§41.2),
sized against observed steady-state memory and CPU from staging load testing (§37.5)
rather than guessed — a `limits.memory` set too tight risks the container being OOM-
killed mid-command, discarding whatever in-flight work existed at that moment despite
every effort elsewhere in this architecture (§26.1) to keep that work recoverable;
sizing generously enough to absorb realistic peak load, informed by actual
measurement, is the operational discipline that keeps the architecture's own
resilience guarantees meaningful in practice.

## 42. Versioning, Release & Migration

**Status:** [SPEC]

### 42.1 Semantic Versioning — Framework and Module, Independently

Two independent version numbers exist side by side in this architecture, and they are
never conflated: the **framework's own version** (the core codebase — bootstrap,
DI container, permission engine, and everything else in `src/core/`) and **each
module's own version** (its manifest's `version` field, §11.2). A framework version
bump does not imply any module needs a version bump, and vice versa — a module
author ships `reminders@1.4.0` on their own schedule, entirely independent of
whichever framework version it happens to be loaded into, constrained only by
whatever compatibility range the module's own `package.json` (or manifest-level


The manifest's `frameworkApiVersion` compatibility range is checked with the same
range-satisfaction evaluator that governs `depends` (§11.2): at every module load —
bootstrap, hot-swap, and fresh install alike — the declared range is evaluated
against the running framework version, and a module whose range the framework does
not satisfy fails to load with an error naming both versions, exactly as a failed
dependency pin does. A major-version mismatch is never a load-time warning; only
within-range minor drift may be.
equivalent) declares against the framework's API surface.

### 42.2 Breaking Change Management & Deprecation Windows

Principle P11 (§3) — deprecation over breaking change — governs any change to a
module's own public contract: its `provides` tokens' method signatures, its emitted
event payloads (§18.6's `eventsCatalog`), or its command names. A breaking change to
any of these is:

```
DIAGRAM 42-A — The Deprecation Path

 A breaking change is identified as necessary
 │
 ▼
 The OLD shape is marked deprecated (a JSDoc @deprecated tag minimum;
 ideally a runtime warning logged on first use per process lifetime,
 not per-call, to avoid log-flooding a heavily-used deprecated path)
 │
 ▼
 BOTH old and new shapes coexist for a documented deprecation window
 │
 ▼
 A major version bump (§14.3's version-pinning mechanism is what makes
 this enforceable — a consumer pinned to the old major version simply
 never resolves the breaking change until it deliberately updates its
 own pin)
 │
 ▼
 The deprecated shape is removed only after the documented window closes
```

### 42.3 Changesets & Automated Changelog

Every PR introducing a user-facing change includes a changeset file (`.changeset/*.md`,
generated via `pnpm changeset`) describing the change and its intended semver bump
category (major/minor/patch) — authored by the contributor at PR time, when the
context for *why* the change matters is freshest, rather than reconstructed later from
commit history. `release.yml` (§40.2) aggregates every accumulated changeset on merge
to `main`, computes the correct combined version bump, and generates the changelog
entry automatically — a contributor never hand-edits a `CHANGELOG.md` or manually
decides a version number.

### 49.5 Database Migration Discipline

§24.4 specifies migration mechanics in full — core migrations before module
migrations, both in declared order, every migration file exporting a working `down`
as a hard requirement rather than best practice. The versioning discipline above and
the migration discipline in §24.4 are two views of the same underlying value:
Principle P11's deprecate-before-break philosophy applies to a module's *code*
contract, and P10's (§3) reversible-migration requirement applies to its *data*
contract — together, they are what makes upgrading a module, or the framework itself,
a routine, low-risk operation rather than an event requiring careful, bespoke
coordination every time.

## 43. Troubleshooting & Operational Runbooks

**Status:** [SPEC]

### 43.1 Runbook: Startup Failure

```
SYMPTOM — Pod fails to reach Ready; /health/startup never returns 200

 1. Check pod logs for the LAST bootstrap stage name logged (§8.2's Table 8-A) —
 the stage name IS the diagnosis. A failure at Stage 02 is a config problem;
 Stage 05/07 is a database/Redis reachability problem; Stage 11/12 is a
 manifest or module-code problem introduced by a recent change.
 2. Stage 02 (CONFIG_LOAD) failure → read the Zod field-level error directly;
 it names the exact variable and constraint that failed.
 3. Stage 05/07 (DATABASE_CONNECT/CACHE_CONNECT) failure → verify network policy,
 credentials, and that the target service is actually reachable from the
 pod's network position — NOT a code-level bug in the overwhelming majority
 of cases.
 4. Stage 11 (MODULE_VALIDATE) failure → the error names the offending module
 and the specific manifest field or dependency-cycle path (§10.5); this is
 almost always traceable to whatever module changed most recently.
 5. Stage 12 (MODULE_LOAD) failure on a required: true module → check whether
 this module's required flag is still an accurate reflection of its actual
 importance — a module that shouldn't be able to take down the whole
 process is a design smell worth revisiting, not just a bug to patch.
```

### 43.2 Runbook: High Error Rate

```
SYMPTOM — dumby_errors_unexpected_total / dumby_commands_total crosses the
 warn or critical threshold (§33.5)

 1. Filter by module and command label on dumby_errors_unexpected_total FIRST —
 an error spike concentrated in one module/command is a very different
 incident than one spread evenly across everything.
 2. Concentrated in one module → check whether that module was part of the
 most recent Swastik hot-swap (§15.10's audit log is the fastest way to
 confirm timing correlation) before assuming a pre-existing bug just
 started manifesting on its own.
 3. Spread across everything → suspect a shared-infrastructure cause first:
 database (§24.6's slow/critical query metrics), cache (§25.6's hit
 ratio), or Redis reachability (§26.5) — NOT module code, since no single
 module code change plausibly explains an even spread across unrelated
 modules.
 4. If a specific recent module version is implicated, PEP's suspendModule or
 Swastik's rollbackModuleVersion (§22.3) is the fastest mitigation —
 resolve root cause after restoring stability, not before.
 5. Every DumbyError-taxonomy error (§28.1) logged at this point already
 carries isOperational: false or true — filter on that flag specifically to
 separate "a lot of normal validation rejections" from "a lot of genuine
 bugs," since the two look identical in an undifferentiated error-count
 graph but require completely different responses.
```

### 43.3 Runbook: Shard Disconnect

```
SYMPTOM — dumby_shard_gateway_latency_ms for a specific shardId goes stale or
 the shard stops appearing in metrics entirely

 1. Confirm scope FIRST — one shard, or every shard on one pod, or fleet-wide?
 One shard alone is very likely a Discord-side gateway session issue
 discord.js's own reconnection logic is already handling (§26.5); every
 shard on one pod suggests a pod-level network problem; fleet-wide
 suggests a Discord platform incident, not this deployment.
 2. Check whether the affected shard's ownership lock (§26.4) is still held
 by the pod that's supposed to own it, or whether it expired and no other
 pod has claimed it yet — a stuck, unclaimed lock after a pod crash
 (rather than a graceful shutdown that would have released it explicitly)
 is the specific failure mode to check for.
 3. If the lock is unclaimed and no pod is retrying acquisition, verify the
 retry loop itself is running (SHARD_LOCK_RETRY_MS, default 2,000 ms,
 §26.4) rather than manually intervening in the lock table directly —
 manual lock manipulation risks creating exactly the dual-ownership
 scenario the lock exists to prevent.
 4. A single pod restart (graceful, via the standard shutdown path, §9.1) is
 almost always sufficient and safer than any manual lock-table edit.
```

### 43.4 Runbook: Memory Growth

```
SYMPTOM — Pod memory usage climbs steadily rather than reaching a stable
 steady state

 1. Distinguish a genuine leak from an under-provisioned L1 cache FIRST —
 check CACHE_L1_MAX_ENTRIES / CACHE_L1_MAX_BYTES (§23.2) against actual L1
 size; an L1 cache that's simply sized larger than the deployment's real
 working set looks identical to a leak on a memory graph but isn't one.
 2. Check for an accumulating event listener — a module's onLoad registering
 an event-bus subscription without a matching removal in onUnload is the
 single most common actual leak source in a system built around long-lived
 event subscriptions (§18.4); this shows up specifically as memory growth
 that correlates with module reload frequency (§15.3), not steady request
 volume.
 3. Check the Worker Thread pool (§15.2) isn't accumulating unreturned
 threads — a pool that grows without bound under sustained CPU-heavy job
 volume rather than staying at its configured size is a distinct, second
 common source.
 4. A heap snapshot comparison across two points in the growth curve is the
 conclusive diagnostic once the above are ruled out — this framework
 specifies no bespoke memory-profiling tool of its own; standard Node.js
 inspector tooling attached to a running pod is the correct approach here.
```

### 43.5 Runbook: Slow Command

```
SYMPTOM — dumby_command_duration_seconds P95/P99 for a specific command
 crosses the tier's own target (§13.8) or the blended SLO (§33.5)

 1. Check dumby_db_query_duration_seconds filtered to this command's known
 query patterns FIRST — a query newly crossing SLOW_QUERY_THRESHOLD_MS or
 CRITICAL_QUERY_THRESHOLD_MS (§24.6) is the most common root cause and the
 fastest to confirm or rule out.
 2. If no query is implicated, check whether this command recently lost
 defer-eligibility or gained a new synchronous external call (§28.4's
 circuit breaker pattern is the fix if an external dependency is the
 culprit).
 3. Check the relevant cache hit ratio for this command's tier (§13.8,
 §25.6) — a ratio below its tier's target, especially a drop concentrated
 around a specific key namespace (§25.2), is often traceable to a TTL set
 too short relative to actual read frequency, more often than to a true
 capacity problem.
 4. Check whether event-loop lag shedding (§28.5) is active — if so, this
 command's slowness may be a symptom of general process load rather than
 anything specific to this command at all.
 5. Immediate mitigation, regardless of confirmed root cause: verify
 requiresDefer: true is set for this command (§17.2) so users see a
 "thinking…" state rather than an outright interaction failure while the
 underlying slowness is investigated and fixed properly.
```

### 43.6 General Incident Response Principles

Two habits run through every runbook above and are worth stating once, explicitly,
rather than repeating in each: **scope before cause** — establish how widespread a
symptom is before forming a theory about why, since scope alone (one command vs. one
module vs. fleet-wide) usually eliminates most candidate explanations immediately —
and **mitigate before certainty** — §43.2's suspend-then-investigate ordering and
§43.5's unconditional defer-check both exist because restoring user-facing stability
and understanding root cause are separate goals, and the first should never wait on
the second when a fast, safe mitigation (a suspend, a rollback, a defer flag) is
already available.

### §43 Addition — Known Failure Scenarios & Mitigations Appendix

A new "Infrastructure Failure Modes (Derived from Design)" section after runbooks (§43) or as an appendix, with a table of Failure Scenario | Detection | Mitigation | Reference.

### §43 Addition — Per-layer Vitest coverage thresholds

Independent per-layer thresholds matching the documented floors.

### 43.11 Release Manager Server-Side Apply with Field Manager

- Specified — server-side apply with field manager `release-manager`.
- Implemented server-side apply in Kubernetes rollout.

### 43.12 Developer Registration & Licensing (devId + approvalStatus)

- Partially Implemented — design documented; MFA and dev-token split flagged missing.
- MFA + split identity + per-version approval.

### 43.13 Discord API 429 handling

- Partial/Missing. Acknowledgement guard only; honoring of 429 responses with `Retry-After` remains unwired.

### 43.14 Error taxonomy

- Partially Implemented (13 classes, `retryable` vs `isOperational`).
- Reconciled.

### 43.15 Event Loop Lag Shedding

- EventLoopLagMonitor (~78 LOC) — IMPLEMENTED. Measures tick drift, calls onLag callback when > threshold (default 50ms). Metrics: gatewayEventsShedTotal counter.
- Maintained as the backpressure mechanism.

### 43.16 Event bus with cycle detection and protected domains

- EventBus (171L) with cycle detection (maxEmitDepth: 20, EventCycleError), protected event domains, priority ordering; tests exist. Gateway EventRouter and InternalEventBus kept separate.
- Maintain.

### 43.17 HTTP servers (API/health/metrics)

- Fully Implemented. `http/server.ts` (58–59L) — `buildApiServer` (helmet + rate-limit), `buildHealthServer`, `buildMetricsServer`; health routes (liveness/readiness/startup/probes), info, metrics (Prometheus).

### 43.18 I18nManager

- This is specified but not yet implemented. (outside its own folder).
- Wired.

### 43.19 Idempotent Deploy / No-Op Detection

- Confirmed.
- Implemented idempotency.

### 43.20 Mock Gateway Adapter and Mock Container for Testing

- Fully Implemented. The mock gateway adapter and mock container for testing show genuine testing discipline. They enable unit-testing a DI-heavy framework without external dependencies. The middleware test alone is 25KB.
- Maintain as-is; document the mock patterns for module authors to use in their own tests.

### 43.21 Module Hot-Swap (In-Process Reload via Shared Volume Symlink)

- Partially Implemented — design documented; in-process reload mechanism described; isolation/rollback gaps flagged.
- Safe hot-swap with isolation + canary + auto-rollback.

### 43.22 Module Validation Pipeline (7 Checks)

- Partially Implemented — 7 checks documented; same-Zod-schema-as-startup reuse; pre-activation third pass missing.
- Three-stage validation including pre-activation.

### 43.23 Module loader + topo-sort + Swastik loader

- Fully Implemented. `loader.ts` (140–141L, loadAll/readyAll/unloadAll/unload, fatal vs degraded), `topo-sort.ts` (89–90L, Kahn's algorithm, cycle detection), `manifest.schema.ts` (111–112L, Zod, 27+ fields), `tier-rules.ts` (67L), `swastik-loader.ts` (109–110L, dynamic import), `registry.ts` (43L).
### 43.24 Observability (Pino + prom-client + OTel)

- Fully Implemented. `logger.ts` (77L, Pino + redact), `metrics/registry.ts` (86L, prom-client, 5+ metrics: commands_total, rate_limit_rejections, permission_denials, cache_hits/misses, db_query_duration, module_load_duration), `tracing.ts` (56L, OTel SDK + OTLP). The tracing claim carries a recorded survey disagreement — one inventory records the SDK wiring, another flags it as not confirmed — noted here rather than silently resolved.

### 43.25 PEP dispatcher (Power Engine)

- Envelope correct; domains mostly stubs.
- Domains implemented.

### 43.26 Proxy-Based Acknowledgement Guard In Command Router

- Fully Implemented. The command router uses a Proxy-based acknowledgement guard that auto-defers if a handler doesn't acknowledge within a timeout.
- Maintain as-is; make the timeout configurable per-command via manifest.

### 43.27 Resilience (circuit breaker + retry policy)

- Both live; ~45% of Phase 5.
- Maintained + add i18n/erasure/webhook-verify.

### 43.28 RetryPolicy

- This is specified but not yet implemented. (a simpler helper is used instead).
- Consolidated.

### 43.29 State Externalization (Shard-Ownership Lock + Graceful Degradation)

- Fully Implemented (per docs).
- Maintained.

### 43.30 `shouldEarlyRecompute` (probabilistic early refresh)

- This is specified but not yet implemented.
- Wired.

### 43.31 i18n (en-US)

- Fully Implemented. `i18n-manager.ts` (68–69L) — `register`, `t` with `{{param}}` interpolation, en-US fallback, `loadLocaleFile`, `buildBundle`; `formatters.ts` (22L). Notes: only en-US shipped (V1 scope).

### 43.32 pnpm minimumReleaseAge 1-Day Gate

- `pnpm-workspace.yaml` enforces a 1-day release-age gate with `minimumReleaseAgeExclude` override.
- The system maintains this; read the comment block before excluding.

### 43.33 7-layer permission resolver with fail-open/closed asymmetry

- resolver.ts (145L) + rbac.ts (77L) implement 7 layers (bot owner, blacklist, guild/module availability, channel restriction, Discord bitfield, RBAC role, explicit grant) with deliberate per-layer fail-open/fail-closed asymmetry; default-allow on fall-through; tests exist.
- The system maintains this; note no web dashboard shares it yet.

### 43.34 Module-level fault isolation (compliance #2)

- `CommandRouter` try/catch around `execute`; `EventRouter` per-handler try/catch; `ModuleLoader` fatal/degraded classification.
- Maintained; verified on the `CommandRouter` live path (§19.2's structural wiring test).

### 43.35 PEP dispatcher with unconditional audit logging

- power-engine-dispatcher.ts (112L) validates actorId/source/reason, rejects untrusted sources, writes an audit_logs entry for EVERY attempt (allowed or rejected) BEFORE handler execution.
- Maintain audit-as-precondition semantics.

### 43.36 Port-based dependency inversion (11 interfaces in core/commands/ports.ts)

- core/commands/ports.ts defines 11 interfaces that command services depend on, enabling testability without real infrastructure.
- Maintain.

### 43.37 Probabilistic Early Recompute (PER) algorithm

- The cache implements PER to proactively refresh hot keys before expiry, preventing stampede bursts.
- Maintain.

### 43.38 Scaffolding CLI

- Scaffolding CLI documented; no _template module found.
- CLI + _template present.

### 43.39 Swastik module delivery with symlink promotion + rollback

- swastik.ts (315L): developer registration, module upload with manifest validation, build staging to filesystem, promotion via symlink swap with rollback, deploy endpoint, audit logging. No K8s volume staging, no licensing gate, no formal approval workflow.
- Add K8s volume staging for production; add licensing/approval workflow.

# PART IX — REFERENCE

---

## 44. REST API, Webhooks & MDIS Reference

**Status:** [SPEC]

### 44.1 Four Authentication Contexts, Never Conflated

The HTTP server (Fastify, bound at Bootstrap Stage 03 alongside the health endpoints,
§8.2) exposes four authentication contexts, each with its own credential type,
verification path, and permitted surface — never conflated, never accepted
interchangeably by an endpoint expecting a different one.


**Inbound webhook verification contract.** A module's registered webhook route only
registers at Stage 14 with a verification configuration, and verification is
provider-specific: each supported provider's scheme — its HMAC construction, header
names, timestamp handling, encoding — is implemented as its own verifier rather
than one generic digest check. Every verified request additionally passes a
5-minute replay window (an older timestamp is rejected regardless of signature
validity) and a Redis idempotency check keyed on the delivery identifier, so a
captured valid request replayed inside the window still cannot double-apply. Stage
14 refuses to register a webhook route whose provider verifier is missing: no
unverified inbound webhook route can exist (§32.3).

```
TABLE 44-A — Authentication Contexts

┌───────────────────┬───────────────────────┬────────────────────────────┐
│ Context │ Credential │ Governs Access To │
├───────────────────┼───────────────────────┼────────────────────────────┤
│ MDIS dashboard │ Discord OAuth2 user │ Guild configuration, │
│ │ token │ module state — routed through │
│ │ │ PermissionResolver (§21.7) │
│ Swastik developer │ Dev ID, issued by the │ Module upload, versioning, │
│ │ Credentials Service │ own-developer status (§15.6) │
│ │ (§22.8), Bearer header │ │
│ PEP / CLAI operator │ Operator credential, │ The seventeen control │
│ │ issued by the Credentials │ domains (§22.3) — never │
│ │ Service │ reachable from the public │
│ │ │ internet directly (§41.5) │
│ Inbound webhook │ Provider-specific │ A module's own registered │
│ │ signature (HMAC-SHA256 │ webhook route only (§32.3) │
│ │ or the originating │ │
│ │ service's own scheme) │ │
└───────────────────┴───────────────────────┴────────────────────────────┘
```

#### 44.1.1 Kind-Based End-to-End K8s Script

`scripts/kind-dev-up.sh` provisions a local Kubernetes cluster end-to-end to reduce friction for local testing of Dumby.

**Steps performed by the script:**
1. Create a Kind cluster (or reuse an existing one).
2. Build the Docker image and load it into the Kind node (`kind load docker-image`).
3. Create the `dumby-secrets` Secret from local env/values.
4. Apply kustomize overlays under `deploy/k8s/overlays/staging/`.

**.

### 44.2 Health, Metrics & Info Endpoints

```
GET /health/liveness → §8.2 Table 8-B (Stage 04 gate)
GET /health/startup → §8.2 Table 8-B (Stage 15 gate)
GET /health/readiness → §8.2 Table 8-B (Stage 18 gate)
GET /metrics → Prometheus text format, §27.3's metric families
GET /info → framework version (generated from package.json at build
 time — never a hardcoded literal), loaded module count by tier,
 shard range this pod owns, total guild count served by the fleet,
 and runtime versions (Node.js, discord.js) — unauthenticated,
 deliberately free of anything guild-identifying (aggregate counts only)
```

### 44.3 Module Configuration & State Endpoints (MDIS)

Specified in full at §16.4; the endpoint shapes, restated for reference completeness:

```
GET /api/modules/:name/config → current guild config for this module
PUT /api/modules/:name/config → update, validated against the module's
 own dashboardSchema-declared fields
POST /api/modules/:name/:action → module-defined custom actions
PATCH /api/modules/:name/state → enable/disable — a SEPARATE endpoint from
 /config, writing to guild_module_states
 (§13.4), never conflated with config
```

### 44.4 Outbound HTTP Client

Any module's service layer making a call to a third-party API does so through a
shared `HttpClient` wrapper rather than a bare `fetch` call — the wrapper applies
consistent timeout defaults, integrates the retry utility (§28.3, for idempotent
requests only) and `CircuitBreaker` (§28.4) automatically, and instruments every call
with an OpenTelemetry child span (§27.4) so an outbound third-party call is visible in
the same trace as the command that triggered it, without the calling module writing
any tracing code itself.

### 44.5 Outbound Webhook Delivery

Where a deployment configures one, Swastik delivers a signed webhook to a developer's
registered endpoint reporting deployment status (§15.8's final step) — validation
result, promotion outcome, or an automatic rollback. The payload is signed with the
same HMAC discipline §32.3 requires of *inbound* webhooks, so a developer receiving
this notification can verify it genuinely originated from this deployment's Swastik
instance rather than trusting an unauthenticated POST body.

### 44.6 PEP REST API

Every one of PEP's seventeen control domains (§22.3) is reachable as an authenticated
POST to `/api/pep/{functionName}`, with a request body validated against that
function's own typed parameter schema (§22.2's function-catalog model) — the identical
schema CLAI's terminal (§22.7) validates against before ever reaching PEP itself,
since CLAI is a presentation layer over this same API, not an independent capability
surface.

### 44.7 Swastik Developer & Upload API

```
POST /api/swastik/register → developer registration (§15.6)
POST /api/swastik/modules/:slug/upload → module package + manifest upload (§15.8),
 Authorization: Bearer {devId}
GET /api/swastik/modules/:slug/status → validation/staging/promotion status for
 the developer's own most recent upload
```

### 44.8 Versioned API Families

The REST surface is organized into versioned, OpenAPI-documented API families. Every
family is versioned independently (an `/api/v1/...` path carries its own contract,
registered in the Compatibility Ledger §14.4), documented by a machine-generated
OpenAPI specification published alongside each release, and held to the
frontend-quality bar PEP established (§22.2) — schema-validated inputs, streaming
updates where a view is live, and error bodies a client can program against:

```
TABLE 44-B — API Families

┌──────────────────────┬─────────────────────────────────────────────────┐
│ Family │ Serves │
├──────────────────────┼─────────────────────────────────────────────────┤
│ catalog │ Module discovery and installation: browsable listings │
│ │ (visibility-aware, §11.2), categories (§16.3), │
│ │ install/uninstall flows (§16.2) │
│ developer │ Developer self-service: registration (§15.6), │
│ self-service │ repository binding and push-triggered deployment │
│ │ (§15.11), upload, status, Deployment Records (§15.12) │
│ governance │ License machine transitions, review workflow, │
│ │ suspension/revocation (§15.7, §16.4) │
│ installs │ Per-guild installed-module state and configuration │
│ │ — the MDIS backend (§16.5, §44.3) │
│ Twixter │ Persona registration API, bindings, branding, │
│ │ charter status (§35) │
│ webhooks │ Inbound verification contract (§32.3) and │
│ │ outbound signed delivery (§44.5) │
└──────────────────────┴─────────────────────────────────────────────────┘
```

The families exist so the future developer portal and any web frontend can be built
entirely against documented, versioned contracts — never against ad-hoc endpoints —
and so a contract change in one family is a ledger entry (and a semver bump) rather
than a silent break for every client at once.

## 45. Mandatory Feature Compliance Matrix

**Status:** [SPEC]

A requirements-traceability checklist: every row names one capability this
architecture is required to provide, and points to where it is specified in full.
Intended use — a reviewer confirming a specific deployment, fork, or audit has not
silently dropped a load-bearing capability while adapting this reference to its own
needs. The matrix is generated from the Compatibility Ledger (§14.4): each row's
"Specified At" reference is derived from the contract registration it points at, so
the matrix cannot drift from the registry that actually gates core releases and
module deployments — regenerating this table is a mechanical ledger query, not a
manual editorial act.

```
TABLE 45-A — Compliance Matrix

┌────┬──────────────────────────────────────────────────┬──────────────┐
│ # │ Capability │ Specified At │
├────┼──────────────────────────────────────────────────┼──────────────┤
│ 01 │ Single, unified bootstrap sequence, no partial-start │ §8 │
│ │ state permitted │ │
│ 02 │ Graceful shutdown with independent per-step timeouts │ §9 │
│ 03 │ Fail-fast configuration validation before any gateway │ §8.2, §23.2 │
│ │ connection │ │
│ 04 │ Dependency injection with compile-time-checkable │ §10 │
│ │ contracts, no service locator pattern │ │
│ 05 │ Circular dependency detection at boot, not runtime │ §10.5 │
│ 06 │ Complete, self-describing module manifest contract │ §11.2 │
│ 07 │ Enforced three-layer separation within every module │ §11.5 │
│ 08 │ Tooling-enforced module isolation (no cross-module │ §11.6 │
│ │ imports/writes) │ │
│ 09 │ Four-tier module governance model │ §13 │
│ 10 │ Per-guild module enable/disable with fail-closed │ §13.4 │
│ │ defaulting │ │
│ 11 │ Five-layer Admin-tier defense in depth │ §13.6 │
│ 12 │ Five sanctioned, and only five, inter-module │ §14.1 │
│ │ communication patterns (Global Data Emit included) │ │
│ 13 │ Graceful soft-dependency degradation │ §14.2 │
│ 14 │ Semver-enforced cross-module contract versioning │ §14.3, §42.1 │
│ 15 │ Hot-swap of a single module without a core restart │ §15.1, §15.8 │
│ 16 │ Worker-thread isolation for CPU-intensive work │ §15.2 │
│ 17 │ Scheduled, zero-downtime core restart independent of │ §15.5 │
│ │ ad hoc deploys │ │
│ 18 │ Developer registration, licensing gate, and revocable │ §15.6–§15.7 │
│ │ approval │ │
│ 19 │ Five-gate community module review pipeline │ §16.4 │
│ 20 │ Schema-driven, accessible web configuration UI (MDIS) │ §16.5 │
│ 21 │ Fatal, build-time command-name collision detection │ §17.3 │
│ 22 │ Bounded, batched guild command change queue │ §17.7 │
│ 23 │ Enforced 100-command-per-guild ceiling │ §17.8 │
│ 24 │ Five-step guild-facing command collision resolution │ §17.9 │
│ 25 │ No text-prefix commands, no simulated prefix parsing │ §4, §17.10 │
│ 26 │ Per-handler isolation on gateway event dispatch │ §18.3 │
│ 27 │ Bounded internal-event-bus cycle detection │ §18.5 │
│ 28 │ Composable, priority-ordered middleware with a single │ §19 │
│ │ root error boundary │ │
│ 29 │ Stateless, database-referencing component custom_id │ §20.1 │
│ │ scheme │ │
│ 30 │ Mandatory re-authorization on sensitive component clicks │ §20.3 │
│ 31 │ Seven-layer permission resolution — the single │ §21 │
│ │ normative ordering, fail-closed where it matters, │ │
│ │ Layer 6 pure backend rank function, Layer 7 │ │
│ │ guild-side grants with a non-configurable override │ │
│ │ boundary │ │
│ 32 │ Global bot-owner override that bypasses every other layer │ §21.2 │
│ 33 │ Layer 7 guild-side grants — permit, blacklist, │ §21.6 │
│ │ whitelist, cooldown, rate-limit; module commands │ │
│ │ only; most-specific scope wins │ │
│ 34 │ One permission engine shared by the bot and the web │ §21.7 │
│ │ dashboard, no parallel implementation │ │
│ 35 │ Global administrative authority via a documented function │ §22.2–§22.3 │
│ │ catalog (PEP) │ │
│ 36 │ Out-of-band operator access independent of gateway health │ §22.6 │
│ │ (CLAI) │ │
│ 37 │ Single, shared credential issuance path │ §22.8 │
│ 38 │ Three-scope configuration model (process-core, │ §23.1 │
│ │ process-module, guild) │ │
│ 39 │ Full config-change audit trail │ §23.5 │
│ 40 │ Repository pattern as the sole database abstraction │ §24.3 │
│ 41 │ Every migration reversible (working down) │ §24.4 │
│ 42 │ Two-tier cache with stampede protection and negative │ §25 │
│ │ caching │ │
│ 43 │ Zero process-local state whose loss would be user-visible │ §26.1–§26.2 │
│ 44 │ Shard-ownership lock model preventing dual shard │ §26.4 │
│ │ connections │ │
│ 45 │ Correlated logs, metrics, and traces via one correlationId │ §27.1 │
│ 46 │ Eight-subclass error taxonomy with operational/ │ §28.1 │
│ │ non-operational distinction │ │
│ 47 │ Idempotency required of every job processor │ §29.3 │
│ 48 │ Reachable maintenance mode that cannot lock out its own │ §28.6 │
│ │ operators │ │
│ 49 │ Core-owned Renderer — Components v2 grammar, dynamic │ §20.8 │
│ │ slots, Modes D/M/C; authors declare schemas │ │
│ 50 │ Buffer embed on every interaction, edited into the │ §20.9 │
│ │ final render or the formal notice frame │ │
│ 51 │ Classic embeds banned via four enforcement layers │ §4, §38.4 │
│ 52 │ Six-state license machine with devId-equals-subject │ §15.7 │
│ │ binding and tier-specific license classes │ │
│ 53 │ Compatibility Ledger gating core releases and module │ §14.4 │
│ │ deployments; this matrix generated from it │ │
│ 54 │ Four per-tier module volumes, tier-at-rest enforced, │ §5.4, §7.3 │
│ │ blind discovery at bootstrap │ │
│ 55 │ First-class manifest visibility enum validated at all │ §11.2, §13.3 │
│ │ three manifest validation points │ │
│ 56 │ Deployment rate limits (token-bucket + cooldown, │ §13.6 │
│ │ PEP-tunable) on every deployment surface │ │
│ 57 │ Repository-triggered deployment with OIDC-validated │ §15.11 │
│ │ binding and durable Deployment Records │ │
│ 58 │ Instant MDIS ↔ backend sync over per-guild Redis │ §16.5 │
│ │ pub/sub change events │ │
│ 59 │ Envelope encryption for recoverable in-process- │ §32.7 │
│ │ readable credentials; Argon2id for everything else │ │
│ 60 │ Twixter personas: bring-your-own-identity, │ §35 │
│ │ single-server-bound, free charter with explicit │ │
│ │ sunset condition │ │
└────┴──────────────────────────────────────────────────────────┴──────────────┘
```

Beyond these sixty, every capability specified in Parts V–IX not enumerated
above — locale resolution (§30), MTP usage metering (§31.4), the full security
architecture (§32), SLO-driven alerting (§33.5), privacy/erasure (§34), Persona
governance (§35.5), the testing pyramid (§37.2), and the complete CI/CD and
infrastructure reference (§40–§41) — is load-bearing in its own right; this table's
rows are the capabilities most load-bearing to get right *first*, not an exhaustive
restatement of everything else in this reference — and the ledger query that
regenerates the table is what keeps that set honest as capabilities are added.

## 46. Dumby vs. Multipurpose Bots — Capability Comparison

**Status:** [SPEC]

§2.2 established the *structural* comparison — organization, boundaries, failure
blast radius. This section complements it with a capability-level view, for a reader
specifically evaluating whether to adopt this architecture over a conventional
multipurpose-bot codebase.

```
TABLE 46-A — Capability Comparison

┌─────────────────────────┬───────────────────────────┬─────────────────────────┐
│ Capability │ Typical Multipurpose Bot │ Dumby │
├─────────────────────────┼───────────────────────────┼─────────────────────────┤
│ Adding a new feature │ Edit shared files; risk of │ Add a module; zero risk to │
│ │ regressing unrelated features │ any existing module (§11.6) │
│ Third-party extensibility │ Rare; usually requires forking │ First-class Marketplace tier │
│ │ the whole bot │ and review pipeline (§16) │
│ Multiple bot identities │ Not supported, or a completely │ Twixter/Personas, sharing the │
│ (command/voice capacity) │ separate bot to manage manually │ same codebase and data (§35) │
│ Zero-downtime deploys │ Uncommon; a deploy usually means │ Structural requirement, │
│ │ a brief outage │ enforced by state │
│ │ │ externalization (§26, §33.2) │
│ Per-guild feature control │ Often all-or-nothing, or ad hoc │ Uniform, tier-driven │
│ │ per-command flags │ guild_module_states model │
│ │ │ (§13.4) │
│ Unified permission model │ Re-implemented per command, │ One seven-layer engine, │
│ │ inconsistent coverage │ shared by bot and dashboard │
│ │ │ (§21, §21.7) │
│ Observability │ Ad hoc console.log, if anything │ Structured logs, metrics, and │
│ │ │ traces by default, unified by │
│ │ │ correlationId (§27) │
│ Operational control plane │ None — a code change and redeploy │ PEP, CLAI, Swastik, and the │
│ │ is the only lever │ Credentials Service, all │
│ │ │ independent of bot-process │
│ │ │ health (§22) │
│ Compliance tooling │ Bespoke per-deployment, if it │ Framework-level erasure and │
│ │ exists at all │ retention model (§34) │
└─────────────────────────┴───────────────────────────┴─────────────────────────┘
```

The comparison is not a claim that a conventional multipurpose bot is poorly built —
many are engineered carefully within their own scope. It is a claim about what
becomes available, structurally and by default, once module sovereignty, contract-
based communication, and a unified operational surface are treated as load-bearing
architecture rather than aspirational conventions a team tries to maintain by
discipline alone.

### 46.11 MDIS backend

- Missing. `dashboardSchema` field in manifest; no backend.

### 46.12 Persona system data model (compliance #40)

- `entry/clai.ts` (188 lines): SSH REPL with SSH public-key authentication (clai_operators table), PEP dispatch, session management, help/whoami/quit commands.
- Real SSH via ssh2 public-key transport at `src/entry/ssh-clai.ts` (§22.6).

## 47. Glossary & Topic Index

**Status:** [SPEC]

### 47.1 Glossary

```
TABLE 47-A — Term Reference

┌────────────────────────┬──────────────────────────────────────────────────┐
│ Term │ Definition │
├────────────────────────┼──────────────────────────────────────────────────┤
│ Admin tier │ The dev-guild-only, owner-only, middleware-bypassing │
│ │ module tier (§13.2) │
│ BCCM │ Bot Command Cosmetics for Marketplace — guild-level │
│ │ command rename/alias tooling (§17.8) │
│ CLAI │ Command Line Administrative Interface — SSH-hosted │
│ │ operator terminal over PEP's function catalog (§22.6) │
│ Core tier │ The permanently-loaded, non-disableable module tier, │
│ │ skipping RBAC resolution by design (§13.2) │
│ CommandContext │ The per-interaction, scoped-container object carrying │
│ │ correlationId, guildConfig, locale, rbacRole, logger, │
│ │ shardId, and metadata (§17.5) │
│ Credentials Service │ The single, shared issuance path for every runtime │
│ │ credential in the system (§22.8) │
│ DI Container │ The dependency-injection service registry — the sole │
│ │ mechanism for sharing services across the codebase │
│ │ (§10) │
│ DumbyError │ The abstract base class for the eight-subclass error │
│ │ taxonomy (§28.1) │
│ Grant │ A targeted Layer-7 guild-side override — permit, │
│ │ blacklist, whitelist, cooldown, or rate-limit; │
│ │ module commands only (§21.6) │
│ Manifest │ A module's complete, self-describing contract │
│ │ declaration (§11.2) │
│ Marketplace tier │ The opt-in-install module tier, reviewed through the │
│ │ five-gate pipeline (§13.2, §16.4) │
│ MDIS │ Module Dashboard Interface System — the schema-driven │
│ │ web configuration UI (§16.5) │
│ Module │ The fundamental unit of feature ownership — a complete │
│ │ vertical slice governed by one manifest (§11.1) │
│ MTP │ Metric Track Protocol — module-agnostic usage metering │
│ │ in abstract units (§31.4) │
│ PEP │ Power Engine Panel — the global administrative │
│ │ authority, exposed as a function catalog (§22.2) │
│ Persona │ An additional, fully independent Discord Application │
│ │ identity running the same codebase (§35.2) │
│ RBAC Group │ A named mapping from Discord role(s) to a single Layer-7 │
│ │ grant scope — never a rank source (§21.4) │
│ Standard tier │ The pre-installed-but-guild-disableable module tier │
│ │ (§13.2) │
│ Stampede Guard │ The distributed-lock + probabilistic-early-refresh │
│ │ mechanism preventing cache-miss thundering herds │
│ │ (§25.4) │
│ Swastik │ The deployment/hot-reload/hot-swap subsystem governing │
│ │ every code-delivery path in the framework (§15) │
│ Buffer embed │ The instant acknowledgment render issued on every │
│ │ interaction, edited into the final render or the │
│ │ formal notice frame (§20.9) │
│ Compatibility │ The machine-readable registry of every │
│ Ledger │ cross-boundary contract version window; gates │
│ │ core releases and module deployments; §45 is │
│ │ generated from it (§14.4) │
│ Deployment │ The durable, append-only record binding a │
│ Record │ deployment's trigger, identities, gate │
│ │ outcomes, and rollback result (§15.12) │
│ Envelope │ Root key → DEKs → per-record AES-256-GCM, for │
│ encryption │ recoverable in-process-readable credentials │
│ │ only; everything else stays Argon2id-hashed │
│ │ (§32.7) │
│ Formal notice │ The merged failure/maintenance/unknown-command │
│ frame │ frame carrying a reason code and the trace │
│ │ correlation ID (§20.9) │
│ Global Data │ The fifth sanctioned cross-module pattern — │
│ Emit │ durable, schema'd public datasets with a │
│ │ read/aggregate API (§14.1) │
│ Hardcoded │ A module permanently pinned to one guild via │
│ module │ hardcoded: true + hardcodeGuildId; requires │
│ │ private visibility (§11.2, §13.3) │
│ License state │ The six-state machine — pending → │
│ machine │ under-review → approved → suspended ⇄ │
│ │ restored → revoked — governing every │
│ │ developer license (§15.7) │
│ Modes D/M/C │ The Renderer's three density modes — detailed, │
│ │ medium, compact — default selected per surface, │
│ │ invoker-switchable (§20.8) │
│ Release │ The external, separately-built release │
│ Manager │ actuator and deploy-path system of record, │
│ │ with reverse GitHub sync (§5.1) │
│ Renderer │ The core-owned, single constructor of every │
│ │ Discord payload; Components v2 grammar + │
│ │ dynamic slots (§20.8) │
│ Tier volumes │ The four per-tier module storage volumes │
│ │ (admin/core/standard/marketplace) + staging; │
│ │ tier-at-rest enforced (§5.4, §7.3) │
│ Visibility │ The manifest's first-class public/unlisted/ │
│ │ private enum, validated at all three manifest │
│ │ validation points (§11.2) │
│ Three-Layer Rule │ Command → Service → Repository, one-directional, │
│ │ inside every module (§11.5) │
│ Tier │ A module's governance classification — Admin, Core, │
│ │ Standard, or Marketplace (§13.2) │
│ Token (DI) │ A Symbol-based, unforgeable service identifier (§10.2) │
│ Twixter │ The subsystem governing Persona creation, branding, and │
│ │ lifecycle (§35.2) │
└────────────────────────┴──────────────────────────────────────────────────┘
```

### 47.2 Topic Index — Quick Navigation

```
TABLE 47-B — Section Index by Part

┌──────────────────────────────────────┬───────────────────────────────────┐
│ Part │ Sections │
├──────────────────────────────────────┼───────────────────────────────────┤
│ 0 — Orientation │ §0.1–§0.4 │
│ I — Foundations & Philosophy │ §1 What Dumby Is · §2 Doctrine · │
│ │ §3 Principles P1–P14 · §4 Non-Goals │
│ II — Core Architecture │ §5 Stack · §6 Architecture · §7 │
│ │ Directory Structure · §8 Bootstrap · │
│ │ §9 Shutdown · §10 DI Container │
│ III — The Module System │ §11 Anatomy & Manifest · §12 Worked │
│ │ Example · §13 Tiers & Lifecycle · §14 │
│ │ Inter-Module Comms · §15 Swastik · │
│ │ §16 Marketplace & MDIS │
│ IV — Request & Interaction Layer │ §17 Commands · §18 Events · §19 │
│ │ Middleware · §20 Interactions · §21 │
│ │ Permissions · §22 PEP/CLAI/Credentials │
│ V — Data & State │ §23 Configuration · §24 Database · │
│ │ §25 Caching · §26 State Externalization│
│ VI — Reliability, Security & Operations │ §27 Observability · §28 Errors · §29 │
│ │ Jobs · §30 i18n · §31 Analytics/MTP · │
│ │ §32 Security · §33 Performance · §34 │
│ │ Privacy · §35 Twixter & Personas │
│ VII — Module Catalog │ §36 Catalog & Extension Patterns │
│ VIII — Engineering Lifecycle │ §37 Testing · §38 DX & Tooling · §39 │
│ │ Workflow · §40 CI/CD · §41 │
│ │ Infrastructure · §42 Versioning · §43 │
│ │ Runbooks │
│ IX — Reference │ §44 REST/MDIS · §45 Compliance Matrix │
│ │ · §46 Comparison · §47 Glossary · §11 │
│ │ Appendices │
└──────────────────────────────────────┴───────────────────────────────────┘
```

### Supply-Chain Gate: pnpm minimumReleaseAge

The workspace enforces a one-day release-age gate via `minimumReleaseAge` in `pnpm-workspace.yaml`: newly published package versions cannot be installed until they have aged a full day, insulating builds from yanked or compromised fresh releases. Exclusions, where genuinely required, go in `minimumReleaseAgeExclude` after reading the comment block in the workspace file; the exclude list is itself governed policy — each entry should carry a justification and be revisited rather than accumulating silently.

## 48. Appendices

### 48.1 Appendix A — Complete Environment Variable Reference

```
TABLE 48-A — Every Process-Level Variable Referenced In This Document

┌──────────────────────────────────┬──────────────┬───────────────────────┐
│ Variable │ Default │ Specified At │
├──────────────────────────────────┼──────────────┼───────────────────────┤
│ NODE_ENV │ (required) │ §23.2 │
│ LOG_LEVEL │ info │ §23.2, §27.2 │
│ BOT_TOKEN │ (required) │ §23.2, §32.1 │
│ BOT_OWNER_IDS │ (required) │ §13.6, §23.2 │
│ DEV_GUILD_ID │ (required) │ §13.2, §13.6, §23.2 │
│ DATABASE_URL │ (required) │ §23.2 │
│ DATABASE_POOL_MAX │ 10 │ §23.2, §33.4 │
│ DATABASE_STATEMENT_TIMEOUT_MS │ 10,000 │ §23.2, §33.4 │
│ DATABASE_REPLICA_URLS │ (optional) │ §23.2, §24.6 │
│ DATABASE_REPLICA_MAX_LAG_MS │ 1,000 │ §23.2, §24.6, §26.5 │
│ REDIS_URL │ (required) │ §23.2 │
│ HEALTH_PORT │ 3000 │ §23.2 │
│ RATE_LIMIT_USER_WINDOW_MS │ 60,000 │ §21.5, §23.2 │
│ RATE_LIMIT_USER_MAX │ 10 │ §21.5, §23.2 │
│ RATE_LIMIT_GUILD_WINDOW_MS │ 60,000 │ §21.5, §23.2 │
│ RATE_LIMIT_GUILD_MAX │ 100 │ §21.5, §23.2 │
│ CACHE_L1_MAX_ENTRIES │ 5,000 │ §23.2, §25.1 │
│ CACHE_L1_MAX_BYTES │ 50 MB │ §23.2, §25.1 │
│ TRACE_SAMPLE_RATE │ 0.1 │ §23.2, §27.4 │
│ SLOW_QUERY_THRESHOLD_MS │ 500 │ §23.2, §24.6, §43.5 │
│ CRITICAL_QUERY_THRESHOLD_MS │ 2,000 │ §23.2, §24.6 │
│ EVENT_LOOP_LAG_SHED_THRESHOLD_MS │ 50 │ §23.2, §28.5 │
│ EVENT_BUS_MAX_EMIT_DEPTH │ 20 │ §18.5, §23.2 │
│ SHARD_LOCK_HEARTBEAT_MS │ 10,000 │ §23.2, §26.4 │
│ SHARD_LOCK_RETRY_MS │ 2,000 │ §23.2, §26.4, §43.3 │
│ TELEMETRY_ENABLED │ true │ §31.5 │
│ {MODULE_NAME}_* │ module-defined │ §11.2, §23.4 (e.g. │
│ │ │ REMINDERS_MAX_HORIZON_ │
│ │ │ DAYS, §12.3) │
└──────────────────────────────────┴──────────────┴───────────────────────┘
```

### 48.2 Appendix B — Metrics Catalog

Restated from §27.3 for standalone reference use:

```
dumby_commands_total{module,command,status}
dumby_command_duration_seconds{module,command}
dumby_cache_requests_total{tier,result}
dumby_errors_unexpected_total{module}
dumby_queue_depth{queueName}
dumby_queue_job_duration_seconds{queueName,status}
dumby_db_pool_active_connections
dumby_db_query_duration_seconds{table,operation}
dumby_shard_gateway_latency_ms{shardId}
dumby_guild_module_active{moduleSlug}
```

### 48.3 Appendix C — Error Taxonomy Quick Reference

```
TABLE 48-B — DumbyError Subclasses

┌───────────────────────┬─────────────┬────────────────┐
│ Subclass │ HTTP-Equiv. │ isOperational │
├───────────────────────┼─────────────┼────────────────┤
│ ValidationError │ 400 │ true │
│ PermissionDeniedError │ 403 │ true │
│ NotFoundError │ 404 │ true │
│ ConflictError │ 409 │ true │
│ RateLimitExceededError │ 429 │ true │
│ ExternalServiceError │ 502 │ true │
│ ConfigurationError │ 500 │ false │
│ InternalError │ 500 │ false │
└───────────────────────┴─────────────┴────────────────┘
Full reference: §28.1
```

### 48.4 Appendix D — Tier Quick Reference Card

```
TABLE 48-C — Tier Card

┌─────────────┬───────────┬───────────┬────────────┬───────────────┐
│ Tier │ Installed? │ Toggle? │ RBAC Layer 6 │ Catalog? │
├─────────────┼───────────┼───────────┼────────────┼───────────────┤
│ Admin │ Dev guild │ N/A │ N/A │ Never │
│ Core │ Always │ Never │ Skipped │ Never │
│ Standard │ By default │ Guild ADMINISTRATOR │ Full │ If disabled │
│ Marketplace │ Opt-in │ Guild ADMINISTRATOR │ Full │ If not installed│
└─────────────┴───────────┴───────────┴────────────┴───────────────┘
Full reference: §13
```

### 48.5 Appendix E — Engineering Principles Quick Reference Card

```
P1 Explicit over implicit P8 Test in isolation, deploy confident
P2 Module sovereignty P9 Configuration without code
P3 Single responsibility, every layer P10 Data integrity over convenience
P4 Fail fast, degrade gracefully P11 Deprecation over breaking change
P5 Observability is not optional P12 Progressive disclosure of complexity
P6 Open for extension, closed for P13 One source of truth per concern
 modification P14 Freedom by default, authority by
P7 Security by default exception

Full reference: §3
```

---

### 48.6 Appendix F — Discord API Rate Limit Reference

Discord's API enforces rate limits to prevent abuse. The following rate limits are relevant to Dumby's operation.

Global rate limit: 50 requests per second per bot token. Exceeding this limit results in a 429 response with a retry_after value. The REST client queues requests to stay within this limit.

Channel message rate limit: 5 requests per 2 seconds per channel. This applies to all message-sending operations (POST /channels/{channel_id}/messages).

Guild command registration rate limit: 5,000 registrations per 24 hours per guild. This applies to the PUT /applications/{application_id}/guilds/{guild_id}/commands endpoint.

Global command registration rate limit: 200 registrations per hour. This applies to the PUT /applications/{application_id}/commands endpoint.

Guild member retrieval rate limit: 1 request per 1 second per guild. This applies to the GET /guilds/{guild_id}/members endpoint.

Audit log retrieval rate limit: 1 request per 10 seconds per guild. This applies to the GET /guilds/{guild_id}/audit-logs endpoint.

Interaction response deadline: 3 seconds for the initial response, 15 minutes for follow-ups. Autocomplete response deadline: 1 second.

### 48.7 Appendix G — Kubernetes Resource Reference

The following Kubernetes resources are deployed for Dumby.

The Deployment manages the bot pods. It is configured with replicas (per the base Deployment, bounded by the HPA), strategy (rolling update with maxSurge 1 and maxUnavailable 0 for zero-downtime), and template (pod spec with containers, volumes, and environment variables).

The Service exposes the bot's web endpoints (Interface Hub, metrics, health checks) within the cluster. It is configured with type ClusterIP (internal only — an Ingress or LoadBalancer provides external access), ports (the base-manifest set: 3000 health, 9090 metrics, 9091 HTTP surface, per `deploy/k8s/base/service.yaml`), and selector (matching the Deployment's pod labels).

The HorizontalPodAutoscaler automatically scales the Deployment on resource metrics. It is configured with minReplicas, maxReplicas, and targetCPUUtilizationPercentage (70).

The PodDisruptionBudget ensures a minimum number of pods are always available during voluntary disruptions. It is configured with minAvailable: 1.

The ConfigMap contains non-secret configuration (environment variables, configuration files). It is mounted as environment variables or as files in the pod.

The Secret contains secret configuration (bot token, database password, Redis password, OAuth2 client secret). It is created from the SecretsManager and is mounted as environment variables in the pod.

The Ingress provides external access to the Interface Hub. It is configured with TLS termination, host-based routing, and path-based routing.

### 48.8 Appendix H — Monitoring Dashboard Queries

The following Prometheus queries are used in the Grafana dashboards.

Command rate: sum(rate(dumby_commands_total[5m])) by (command). This shows the rate of command invocations per command over the last 5 minutes.

Command p99 latency: histogram_quantile(0.99, sum(rate(dumby_command_duration_seconds_bucket[5m])) by (le, command)). This shows the p99 latency per command.

Error rate: sum(rate(dumby_errors_unexpected_total[5m])) by (module) / sum(rate(dumby_commands_total[5m])) by (module). This shows the unexpected-error rate per module.

Event queue depth: dumby_queue_depth. This shows the current queue depth.

Cache hit rate: sum(rate(dumby_cache_requests_total{result="hit"}[5m])) by (tier) / sum(rate(dumby_cache_requests_total[5m])) by (tier). This shows the cache hit rate per cache tier.

Database connection pool: dumby_db_pool_active_connections. This shows the active connection count against the pool.

Gateway latency: dumby_shard_gateway_latency_ms. This shows the current gateway latency per shard.

### 48.9 Appendix I — Troubleshooting Quick Reference

Bot not responding: check gateway status, check module states, check permissions, check rate limits, check error logs.

High memory: check L1 cache size, check event queue depth, check module resource usage, check for memory leaks.

High latency: check the dumby_command_duration_seconds histogram, check the dumby_db_query_duration_seconds histogram, check the cache hit rate, check the queue depth.

Database errors: check connection pool metrics, check slow query log, check replica lag, check disk usage.

Gateway disconnects: check close codes, check identify rate, check session start limit, check network connectivity.

Module errors: check module error count, check module error log, check module dependencies, check module configuration.

Interface Hub errors: check the OAuth2 configuration, check the Credentials-Service session tokens, check API rate limits, check frontend console errors.

---

## Appendix A — Extended Reference: Discord API Surface

This section provides the exhaustive technical reference for the Discord API surface that Dumby integrates with. It is reference material for engineers implementing or extending Dumby's gateway, REST, and interaction subsystems. Every number, limit, and behavior described here is current as of Discord API version 10 and is verified against Discord's official documentation.

### A.1 Gateway Protocol

The Discord Gateway is a WebSocket connection that delivers real-time events to the bot. Dumby connects to the gateway using the wss://gateway.discord.gg URL with the query parameters ?v=10&encoding=json&compress=zlib-stream. The API version is pinned to 10. The encoding defaults to JSON, with ETF (binary encoding) available as an option requiring the etf-parser native addon. Compression uses zlib-stream (stream-based, persistent decompression context) as the default, with zlib-payload (per-payload decompression) as an alternative. The capabilities bitfield is sent during identification and includes bits for compressed payloads (bit 15), heartbeat acknowledgment (bit 19), and other protocol features.

The heartbeat interval is specified by the server in the HELLO event (typically 41,250 milliseconds). Dumby sends a heartbeat (opcode 1) at this interval and expects a heartbeat acknowledgment (opcode 11). If no acknowledgment is received within the interval, the connection is considered dead and a reconnection is attempted. The identify rate limit is 1 identify per 5 seconds per token — enforced by Discord and cannot be bypassed by any tier. The session start limit is 1,000 sessions per 24 hours for standard bots and 14,000 for large bots, replenished at approximately 1 session per 5 seconds (standard) or 1 per 0.25 seconds (large bot).

### A.2 Gateway Close Codes

Gateway close codes indicate why the WebSocket connection was closed and determine the reconnection strategy. Dumby categorizes these into recoverable and fatal codes.

Recoverable close codes trigger automatic reconnection with exponential backoff and jitter: 4000 (Unknown Error — Discord server error, reconnect with backoff), 4001 (Unknown Opcode — sent an invalid opcode, reconnect after fixing), 4002 (Decode Error — sent an invalid payload, reconnect after fixing), 4003 (Not Authenticated — sent a payload before identifying, reconnect and identify), 4007 (Invalid Seq — sent an invalid sequence number, reconnect and resume), 4008 (Rate Limited — sent too many payloads, backoff and reconnect), and 4009 (Session Timed Out — the session expired, reconnect and identify with a new session).

Fatal close codes cause the bot to halt and alert the bot owner: 4004 (Authentication Failed — the token is invalid, do not reconnect to avoid token ban), 4010 (Invalid Shard — the shard configuration is invalid), 4011 (Sharding Required — the guild count exceeds what one shard can handle, sharding must be enabled), 4013 (Invalid Intent — an invalid intent bit was requested), and 4014 (Disallowed Intent — a privileged intent was requested but not enabled in the Developer Portal). Fatal close codes trigger a P0 alert and the bot does not reconnect until the configuration is fixed.

### A.3 Complete Gateway Event Reference

The Discord Gateway dispatches over 60 named events. Each event requires a specific intent and is routed to specific tiers within Dumby. The following is a comprehensive listing.

READY and RESUMED require no intent and are handled by Core tier for session management. APPLICATION_COMMAND_PERMISSIONS_UPDATE requires the APPLICATION_COMMANDS intent and is handled by Core for permission synchronization. AUTO_MODERATION_RULE_CREATE, UPDATE, and DELETE require the AUTO_MODERATION_CONFIGURATION intent. AUTO_MODERATION_ACTION_EXECUTION requires the AUTO_MODERATION_EXECUTION intent and is handled by Core for event routing. CHANNEL_CREATE, UPDATE, DELETE, and PINS_UPDATE require the GUILDS intent. THREAD_CREATE, UPDATE, DELETE, LIST_SYNC, MEMBER_UPDATE, and MEMBERS_UPDATE require the GUILDS intent (THREAD_MEMBERS_UPDATE also accepts GUILD_MEMBERS). ENTITLEMENT_CREATE, UPDATE, and DELETE require the MONETIZATION intent. GUILD_CREATE, UPDATE, and DELETE require the GUILDS intent and are handled by Core for guild lifecycle management. GUILD_BAN_ADD and REMOVE require the GUILD_MODERATION intent. GUILD_EMOJIS_UPDATE, STICKERS_UPDATE, INTEGRATIONS_UPDATE, ROLE_CREATE, UPDATE, and DELETE require the GUILDS intent. GUILD_MEMBER_ADD, UPDATE, and REMOVE require the GUILD_MEMBERS privileged intent. GUILD_MEMBERS_CHUNK requires GUILD_MEMBERS. GUILD_SCHEDULED_EVENT_CREATE, UPDATE, DELETE, USER_ADD, and USER_REMOVE require the GUILD_SCHEDULED_EVENTS intent. INTEGRATION_CREATE, UPDATE, and DELETE require the GUILD_INTEGRATIONS intent. INTERACTION_CREATE requires no intent and is handled by Core for interaction routing. INVITE_CREATE and DELETE require the GUILD_INVITES intent. MESSAGE_CREATE and UPDATE require GUILD_MESSAGES (or MESSAGE_CONTENT for content). MESSAGE_DELETE and DELETE_BULK require GUILD_MESSAGES. MESSAGE_POLL_VOTE_ADD and REMOVE require GUILD_MESSAGE_POLLS or DIRECT_MESSAGE_POLLS. MESSAGE_REACTION_ADD, REMOVE, REMOVE_ALL, and REMOVE_EMOJI require GUILD_MESSAGE_REACTIONS or DIRECT_MESSAGE_REACTIONS. PRESENCE_UPDATE requires the GUILD_PRESENCES privileged intent. STAGE_INSTANCE_CREATE, UPDATE, and DELETE require the GUILDS intent. SUBSCRIPTION_CREATE, UPDATE, and DELETE require the MONETIZATION intent. TYPING_START requires GUILD_MESSAGE_TYPING or DIRECT_MESSAGE_TYPING. USER_UPDATE requires no intent. VOICE_CHANNEL_EFFECT_SEND and VOICE_STATE_UPDATE require GUILD_VOICE_STATES. VOICE_SERVER_UPDATE requires no intent. WEBHOOKS_UPDATE requires the GUILD_WEBHOOKS intent.

### A.4 Intent Landscape

Dumby declares non-privileged intents by default: GUILDS (bit 0), GUILD_MODERATION (bit 2), GUILD_MESSAGES (bit 9), GUILD_VOICE_STATES (bit 7), AUTO_MODERATION_EXECUTION (bit 21), and APPLICATION_COMMANDS (bit 24). These six intents are always requested and do not require special approval in the Developer Portal.

Privileged intents are optional and declared per-module: GUILD_MEMBERS (bit 1) is required by modules that need to track member joins, leaves, and updates. GUILD_PRESENCES (bit 8) is required by modules that need to track user online/offline status. MESSAGE_CONTENT (bit 15) is required by modules that need to read the content of messages (as opposed to just metadata like author, channel, and timestamp). When a module requires a privileged intent, the Interface Hub warns the guild owner during enablement or installation, explaining that the intent must be enabled in the Discord Developer Portal. If the intent is not enabled, the module's events will not fire and the module will not function correctly.

Additional non-privileged intents available but not always declared: GUILD_EMOJIS_AND_STICKERS (bit 3), GUILD_INTEGRATIONS (bit 4), GUILD_WEBHOOKS (bit 5), GUILD_INVITES (bit 6), GUILD_MESSAGE_REACTIONS (bit 10), GUILD_MESSAGE_TYPING (bit 11), DIRECT_MESSAGES (bit 12), DIRECT_MESSAGE_REACTIONS (bit 13), DIRECT_MESSAGE_TYPING (bit 14), GUILD_SCHEDULED_EVENTS (bit 16), AUTO_MODERATION_CONFIGURATION (bit 20), GUILD_MESSAGE_POLLS (bit 22), DIRECT_MESSAGE_POLLS (bit 23), and MONETIZATION (bit 29).

### A.5 Interaction Types and Response Deadlines

Discord sends five types of interactions, each with specific response deadlines. PING interactions (type 1) are health checks from Discord's webhook system and must be responded to within 1 second. The framework handles these automatically — no module is involved. APPLICATION_COMMAND interactions (type 2) are slash command and context menu invocations. The initial response deadline is 3 seconds, with a 15-minute follow-up window. MESSAGE_COMPONENT interactions (type 3) are button clicks and select menu selections, with the same 3-second/15-minute deadlines. APPLICATION_COMMAND_AUTOCOMPLETE interactions (type 4) are autocomplete requests triggered when a user types in an autocomplete-enabled option. The response deadline is 1 second. MODAL_SUBMIT interactions (type 5) are modal form submissions, with the same 3-second/15-minute deadlines as application commands.

Dumby auto-defers interactions at 2.5 seconds (providing a 500ms buffer before the 3-second deadline) if the module handler has not yet responded. After deferral, the module has up to 15 minutes to send a follow-up response. These deadlines apply to all tiers — even commands that bypass application-level rate limits must respond within Discord's deadlines. The 15-minute follow-up window is a hard limit imposed by Discord — after it expires, the interaction token is invalidated and no further responses can be sent.

### A.6 Application Command Types

Discord supports four application command types. CHAT_INPUT (type 1) is the standard slash command, invoked from the text input command picker. It is the primary command type for all modules and supports options (string, integer, number, boolean, user, channel, role, mentionable, attachment), subcommands, and subcommand groups. USER (type 2) is a user context menu command, invoked by right-clicking a user and selecting the command from the context menu. It is used for per-user actions like moderation. MESSAGE (type 3) is a message context menu command, invoked by right-clicking a message. It is used for per-message actions like flagging or starring. PRIMARY_ENTRY_POINT (type 4) is an entry point command for embedded UI experiences, used only by Core for framework entry points.

### A.7 Installation Contexts and Interaction Contexts

Discord supports two installation contexts. GUILD_INSTALL (type 0) means the application is installed to a guild and its commands are available in that guild. USER_INSTALL (type 1) means the application is installed to a user and its commands are available everywhere the user is, even in guilds where the bot is not a member. Dumby defaults to GUILD_INSTALL for all modules. USER_INSTALL is supported for Core modules only — user-installed commands work across all guilds the user is in, even guilds where the bot is not a member.

Discord supports three interaction contexts. GUILD (type 0) means the command can be used in a guild. BOT_DM (type 1) means the command can be used in a direct message with the bot. PRIVATE_CHANNEL (type 2) means the command can be used in a private channel between users. All modules support GUILD context by default. Core modules and modules that deliver to DMs (like reminders) support BOT_DM. Admin-tier commands are restricted to GUILD context in the dev server only — they are never available in DM or private channel contexts.

### A.8 OAuth2 Scopes

Dumby uses the following OAuth2 scopes for different purposes. The bot scope is used when adding the bot to a guild (Admin tier — bot installation). The applications.commands scope is used to install slash commands to a guild (Core — command installation). The applications.commands.permissions.update scope is used to update per-guild command permissions (Core — permission synchronization). The applications.commands.update scope is used to update commands for USER_INSTALL applications (Core — user-installable command updates). The identify scope is used to get the user's ID, username, and avatar (Core — Interface Hub authentication). The guilds scope is used to list the user's guilds (Core — Interface Hub guild list). The guilds.members.read scope is used to read guild members (Core — Interface Hub member list). The webhook.incoming scope is used to create webhooks (Standard — Custom Webhook Outbound feature).

The Interface Hub uses the Authorization Code Grant with PKCE flow. The user is redirected to Discord's OAuth2 authorization URL with the identify and guilds scopes. After the user authorizes, Discord redirects back to the Interface Hub's callback URL with an authorization code. The Interface Hub exchanges the code for an access token and a refresh token. The access token is used to fetch the user's identity and guild list. A session bearer token is issued for subsequent API calls. Admin endpoints require additional owner verification — the session identity must resolve to a configured bot owner (BOT_OWNER_IDS, §13.6).

### A.9 AutoMod Landscape

Discord's AutoMod system provides server-side content moderation with five trigger types. KEYWORD (type 1) matches keywords or regular expressions in message content. HARMFUL_LINK (type 2) detects and blocks malicious URLs. SPAM (type 3) detects spam patterns in message content. KEYWORD_PRESET (type 4) uses Discord-maintained keyword lists including profanity, sexual content, and slurs. MENTION_SPAM (type 5) detects excessive mentions in a single message.

Action types include BLOCK_MESSAGE (type 1, blocks the message and alerts the member), SEND_ALERT_MESSAGE (type 2, sends an alert to a designated channel), TIMEOUT_USER (type 3, applies a timeout to the user), QUARANTINE_USER (type 4, quarantines the user by applying a designated role), and BLOCK_MESSAGE_INTERACTION (type 6, blocks the message and prevents interaction-based actions).

The AUTO_MODERATION_ACTION_EXECUTION event (intent: AUTO_MODERATION_EXECUTION) is dispatched when an AutoMod rule triggers. In Dumby, this event is received by the Core tier event handler, which routes it to the internal event bus. This ensures that AutoMod events are always available for logging and analytics, even if the enhanced AutoMod management module is not installed.

### A.10 Audit Log Action Categories

Discord audit logs categorize actions into groups. Guild Update actions (GUILD_UPDATE) record changes to guild settings. Channel actions (CHANNEL_CREATE, UPDATE, DELETE, OVERWRITE_CREATE, OVERWRITE_UPDATE, OVERWRITE_DELETE) record channel and permission changes. Member actions (MEMBER_KICK, MEMBER_PRUNE, MEMBER_BAN_ADD, MEMBER_BAN_REMOVE, MEMBER_UPDATE, MEMBER_ROLE_UPDATE, MEMBER_MOVE, MEMBER_DISCONNECT) record member management actions. Role actions (ROLE_CREATE, UPDATE, DELETE) record role changes. Invite actions (INVITE_CREATE, UPDATE, DELETE) record invite changes. Webhook actions (WEBHOOK_CREATE, UPDATE, DELETE) record webhook changes. Emoji actions (EMOJI_CREATE, UPDATE, DELETE) record emoji changes. Message actions (MESSAGE_DELETE, MESSAGE_BULK_DELETE, MESSAGE_PIN, MESSAGE_UNPIN) record message management actions. Application Command Permission updates (APPLICATION_COMMAND_PERMISSION_UPDATE) record command permission changes. AutoMod actions (AUTO_MODERATION_RULE_CREATE, UPDATE, DELETE, BLOCK_MESSAGE) record AutoMod rule changes. Bot Add/Remove (BOT_ADD, BOT_REMOVE) records when bots are added to or removed from the guild.

The Audit Reader (Core infrastructure) reads audit logs via the REST API endpoint GET /guilds/{guild_id}/audit-logs. The rate limit is 1 audit log request per 10 seconds per guild — this is a Discord-imposed limit that no tier can bypass. The Audit Reader caches the most recent audit log entries in Redis (TTL 10 minutes) to reduce API calls. When a gateway event indicates an action was performed (e.g., GUILD_BAN_ADD), the Audit Reader queries the audit log to determine the actor (the user who performed the action), as this information is not included in the gateway event itself.

### A.11 Voice Connection Lifecycle

The Discord voice connection lifecycle consists of several stages. First, the bot sends a VOICE_STATE_UPDATE gateway payload with the target channel ID to join a voice channel. Discord responds with a VOICE_SERVER_UPDATE event containing the voice server endpoint and a token. The bot then connects to the voice server via WebSocket (wss://[endpoint]). After connection, the bot sends a Voice Identify (opcode 0) with the server_id, user_id, session_id, and token. The voice server responds with a Ready event (opcode 4) containing the SSRC (synchronization source) and port for UDP audio transport. The bot sends a Select Protocol (opcode 2) message choosing the encryption mode. The bot then sends heartbeats (opcode 3) every 5 seconds and Speaking (opcode 5) indicators when audio is being transmitted.

Audio is transported via UDP using Opus-encoded frames in 20-millisecond intervals. Each frame is encrypted with the selected encryption mode before being sent with RTP headers. The available encryption modes are xsalsa20_poly1305_lite (lightweight, recommended default), xsalsa20_poly1305_suffix (suffix-based nonce), xsalsa20_poly1305 (original mode, deprecated), aead_aes256_gcm_rtpsize (modern AEAD cipher, recommended for new implementations), and aead_xchacha20_poly1305_rtpsize (modern AEAD cipher).

The audio pipeline in Dumby's Music module (when installed) decodes the source via FFmpeg to raw PCM (48kHz, 16-bit, stereo), optionally applies audio filters (bassboost, nightcore, vaporwave, 8D, tremolo, vibrato) via FFmpeg's audio filter chain, encodes to Opus format (128kbps default, configurable), encrypts with the selected mode, and sends via UDP with RTP headers in 20-millisecond frames.

### A.12 Sharding Parameters

Sharding parameters govern how Dumby distributes gateway connections across multiple WebSocket connections. The recommended maximum is 2,500 guilds per shard — beyond this, event delivery latency degrades. The large bot sharding threshold is 150,000 guilds — bots exceeding this must use large bot sharding, which multiplies the shard count by 16. The maximum concurrency is 1 for standard bots (1 simultaneous IDENTIFY request) and 16 for large bots (16 simultaneous IDENTIFY requests). The session start limit is 1,000 per 24 hours for standard bots and 14,000 for large bots, replenished at approximately 1 per 5 seconds (standard) or 1 per 0.25 seconds (large bot). The heartbeat interval is server-specified, typically approximately 41,250 milliseconds.

Worker thread sharding distributes shards across Node.js worker threads. Each worker manages a configurable number of shards (default 2). Worker thread crashes do not affect other workers' shards. The main process coordinates worker lifecycle — spawn, respawn, and redistribute. When a worker crashes, the ShardManager detects the crash (via missed heartbeats) and respawns the worker's shards on another worker.

### A.13 Native Addons

Several optional native addons improve performance for specific subsystems. zlib-sync provides faster zlib decompression for gateway payloads — the fallback is the built-in zlib module, which is approximately 3 times slower in CPU usage. bufferutil provides faster WebSocket buffer operations — the fallback is built-in buffer handling, which is slower. sodium-native provides faster voice encryption (xsalsa20) — the fallback is tweetnacl, a pure JavaScript implementation that is approximately 5 times slower. better-sqlite3 provides fast local SQLite for testing — only used in the test environment. FFmpeg is required for audio transcoding in the Music module — without it, audio features are unavailable. @discordjs/voice is required for voice connection management. libsodium-wrappers is used as a voice encryption fallback when sodium-native is not installed. opusscript is used for Opus encoding when sodium-native is not installed.

The framework probes for each addon at boot. If an optional addon is missing, the framework logs a warning and uses the fallback. If a required addon is missing, the framework logs an error and disables the dependent feature. The Admin tier can force-enable features without addons for debugging purposes, but this is not recommended for production use.

### A.14 Discord Entity Cache Strategy

Dumby maintains an in-memory cache of Discord entities for fast access. The caching strategy varies by entity type. Guilds are always cached with no size limit and no TTL — they are invalidated by GUILD_UPDATE and GUILD_DELETE events. Channels are always cached for the current guild with no size limit — invalidated by CHANNEL_UPDATE and CHANNEL_DELETE. Roles are always cached for the current guild — invalidated by GUILD_ROLE_UPDATE and GUILD_ROLE_DELETE. Members use an LRU cache with a maximum of 10,000 per guild and a 30-minute TTL — invalidated by GUILD_MEMBER_UPDATE and GUILD_MEMBER_REMOVE. Users use an LRU cache with a maximum of 50,000 entries and a 60-minute TTL — invalidated by USER_UPDATE. Messages use an LRU cache with a maximum of 1,000 per channel and a 5-minute TTL — invalidated by MESSAGE_UPDATE and MESSAGE_DELETE. Presences use an LRU cache with a maximum of 10,000 entries and a 5-minute TTL — invalidated by PRESENCE_UPDATE. Emojis are always cached for the current guild — invalidated by GUILD_EMOJIS_UPDATE. Voice states are always cached for the current guild — invalidated by VOICE_STATE_UPDATE.

Cache warming at boot populates guild, channel, and role caches during the READY event. Member caches are warmed lazily on first access per guild. The Interface API warms user caches on authentication. Module caches are warmed per-guild on module installation.

### A.15 Resource Sizing Reference

Dumby is designed to scale from a single guild to hundreds of thousands of guilds. The following resource sizing table guides deployment configuration across six scale tiers.

At the Small scale (1 to 100 guilds), the deployment uses 1 shard, 1 pod, 0.5 vCPU per pod, 512MB RAM per pod, a db.t3.micro database, and a cache.t3.micro Redis instance. This is a single container with all tiers running in one process.

At the Medium scale (100 to 1,000 guilds), the deployment uses 1 shard, 2 pods, 1 vCPU per pod, 1GB RAM per pod, a db.t3.small database, and a cache.t3.small Redis. This provides high availability with 2 pods sharing a database.

At the Large scale (1,000 to 5,000 guilds), the deployment uses 2 shards, 3 pods, 2 vCPU per pod, 2GB RAM per pod, a db.t3.medium database, and a cache.t3.medium Redis. This adds sharding and a read replica.

At the Very Large scale (5,000 to 25,000 guilds), the deployment uses 4 to 10 shards, 5 pods, 4 vCPU per pod, 4GB RAM per pod, a db.r6g.large database, and a cache.r6g.large Redis. This adds multi-shard support, read replicas, and dedicated worker pods.

At the Enterprise scale (25,000 to 100,000 guilds), the deployment uses 10 to 40 shards, 10 pods, 4 vCPU per pod, 8GB RAM per pod, a db.r6g.xlarge database with 2 read replicas, and a cache.r6g.xlarge Redis cluster. This adds multi-region deployment, horizontal pod autoscaling, and spot instances for non-critical workloads.

At the Massive scale (100,000+ guilds), the deployment uses 40 or more shards (with large bot sharding at 16x multiplier), 20 or more pods, 8 vCPU per pod, 16GB RAM per pod, a db.r6g.2xlarge database with 5 global read replicas, and a cache.r6g.2xlarge Redis multi-region cluster. This tier requires large bot sharding, global replicas, and tier-dedicated worker pods.

## Appendix B — Extended Reference: Interface Hub

### B.1 The Web Dashboard Architecture

The Interface Hub is a Single Page Application (SPA) that runs in the bot owner's or guild administrator's browser. The frontend is built with React and is served as static assets by the Fastify backend. The frontend communicates with the backend via the REST API.

The SPA architecture was chosen over a server-side rendered (SSR) approach because: the dashboard is highly interactive (configuration changes, module management, log viewing all require real-time updates without page reloads), the backend is a bot framework (not a web server — offloading rendering to the client reduces backend load), and the SPA can be cached by a CDN (reducing backend load for static assets).

The frontend uses React with TypeScript (for type safety matching the backend), React Router (for client-side routing), Tailwind CSS (for styling — utility-first CSS framework that produces small, consistent styles), and TanStack Query (for data fetching with caching, refetching, and optimistic updates). The frontend does not use a global state management library (like Redux) — TanStack Query's cache serves as the state manager for server data, and React's useState/useReducer serves as the state manager for UI state.

### B.2 Authentication and Session Management

The Interface Hub authenticates administrators through the Discord OAuth2 flow; session identity is carried by bearer tokens issued by the Credentials Service (§22.8) — the same issuance path every other authenticated HTTP surface uses, with no separate JWT machinery anywhere in the framework (§23.2). After the OAuth2 flow completes, the backend exchanges the verified Discord identity for a session bearer token with a bounded lifetime. The token is stored in an HttpOnly cookie (not in localStorage — HttpOnly cookies are not accessible to JavaScript, preventing XSS attacks from stealing the token).

For each API request, the browser automatically includes the session cookie. The backend's HTTP authentication layer verifies the bearer token against the Credentials Service (§22.8), checks the expiration, and extracts the user's identity. If the token is expired, the layer returns a 401 Unauthorized response, and the frontend automatically re-runs the OAuth2 flow to obtain a fresh session token, after which the original request is retried. If re-authentication fails, the user is redirected to the login page.

### B.3 The Module Management Panel

The module management panel is the primary interface for guild owners to manage their guild's modules. The panel displays a list of all available modules, grouped by tier (Admin, Core, Standard, Marketplace). Each module entry shows the module's name, description, current state (enabled, disabled, error), and a quick-action button (enable, disable, configure, uninstall).

Clicking on a module opens the module's detail view, which shows the module's commands (with descriptions and permission requirements), events (with subscription details), permissions (with current overrides for this guild), configuration (the MDIS panel), and resource usage (for Marketplace modules). The detail view also shows the module's recent errors (if any) and a reload button (for Admin users).

### B.4 The Permission Management Panel

The permission management panel allows guild administrators to manage permissions for their guild. The panel displays a matrix of permissions (rows) and roles/users (columns). Each cell shows the permission's state for that role or user: ALLOW (green), DENY (red), or DEFAULT (gray). The administrator can click a cell to cycle through the states: DEFAULT → ALLOW → DENY → DEFAULT.

The panel also shows the permission's default level (everyone, guild_admins, or nobody) and a description of what the permission allows. The administrator can add new roles or users to the matrix by searching for them (the search uses Discord's API to find roles and users in the guild). Changes are saved immediately (PUT /api/guilds/:guildId/permissions) and are applied in real-time — the next command invocation uses the updated permissions.

### B.5 The Audit Log Panel

The audit log panel displays the guild's audit log entries. The entries are shown in a paginated table with columns for timestamp, actor (the user who performed the action), action, target (the entity affected by the action), reason (if provided), and metadata (additional context). The table can be filtered by actor, action type, and date range. The entries can be exported as CSV (for compliance audits or record-keeping).

The audit log panel reads from the audit_logs table in the database. The table is partitioned by date (monthly partitions), ensuring that queries for recent entries are fast (they scan only the current month's partition). Entries older than the retention period (365 days) are automatically deleted by a daily background job.

### B.6 The Live Log Viewer

The live log viewer displays the bot's log entries in real-time. The viewer uses Server-Sent Events (SSE) to receive log entries from the backend — the backend publishes log entries to a Redis pub/sub channel, and the SSE endpoint subscribes to the channel and forwards entries to the browser. The viewer can be filtered by module, log level, and correlation ID. The viewer shows the last 1,000 entries and scrolls automatically as new entries arrive.

The live log viewer is available only to Admin users (bot owners). Guild administrators do not have access to the live log viewer — it may contain log entries from other guilds, which would violate privacy. The live log viewer is rate-limited to 100 entries per second (to prevent the browser from being overwhelmed during high-volume logging).

### B.7 The System Status Dashboard

The system status dashboard provides an overview of the bot's health. It shows: gateway status (connected, disconnected, reconnecting), shard count and per-shard latency, module count and per-module state, database connection pool status (active, idle, max), Redis connection status, cache hit rate, event queue depth, job queue depth, memory usage, CPU usage, and uptime. The dashboard updates every 5 seconds (polling the /api/admin/system endpoint). The dashboard is available only to Admin users.

### B.8 The Marketplace Browser

The marketplace browser allows guild owners to discover and install third-party modules. The browser displays the marketplace catalog as a grid of module cards, each showing the module's name, description, author, rating, installation count, and an "Install" button. The grid can be filtered by category (moderation, utility, music, economy, etc.) and sorted by rating, installation count, or last updated.

Clicking on a module card opens the module's detail page, which shows the full description, screenshots (if provided by the author), permissions required, configuration options, changelog, and an "Install" button. The detail page also shows reviews from other guild owners (if the marketplace supports reviews). Installing a module from the marketplace browser triggers the installation flow (Section 72.3).

## Appendix C — Extended Reference: Operational Excellence

### C.1 The Operations Runbook

The operations runbook is the bot owner's guide to running Dumby in production. It covers the day-to-day operations, periodic maintenance, and incident response procedures that keep the bot healthy.

Daily operations include: check the system status dashboard (gateway connected, modules enabled, error rate normal), review P2 alerts from the last 24 hours, check the event queue depth and job queue depth for anomalies, verify that the daily backup completed successfully, and review the cache hit rate (should be above 90 percent).

Weekly operations include: review P1 alerts from the last week, check database disk usage (should be below 80 percent), review slow query logs and optimize queries taking more than 100 milliseconds, check Redis memory usage (should be below 80 percent of maxmemory), verify that the weekly test restore completed successfully, review module resource usage trends (identify modules with growing resource consumption), and update marketplace modules if updates are available.

Monthly operations include: review P0 alerts from the last month, perform a security audit (run the security audit checklist from Section 61.8), review and rotate secrets (bot token, database password, Redis password, OAuth2 client secret), review data retention compliance (verify that data older than retention periods is deleted), review and update the deployment configuration (HPA thresholds, resource limits, replica counts), review module ecosystem health (which modules are most used, which are erroring most), and plan capacity for the next month (based on growth trends).

### C.2 Incident Response

Incident response is the process of identifying, diagnosing, and resolving issues that affect the bot's availability or functionality. Dumby's incident response follows a five-step process.

Step 1 is detection. Incidents are detected by: automated alerts (Prometheus alerting rules firing P0, P1, or P2 alerts), user reports (guild owners reporting issues through the support channel), the system status dashboard (showing red or yellow indicators), or the live log viewer (showing error-level log entries).

Step 2 is triage. The bot owner (or on-call operator) assesses the incident's severity: P0 (bot is down or data is at risk — immediate response required), P1 (significant degradation — response within 1 hour), P2 (minor degradation — response within 4 hours). The severity determines the response urgency and communication requirements.

Step 3 is diagnosis. The operator uses the debugging tools (Section 68.4) to identify the root cause: check the live log viewer for error entries, check the system status dashboard for infrastructure issues, check the module management panel for module errors, check the metrics dashboard for performance anomalies, check the audit log for recent configuration changes, and check Discord's status page for ongoing incidents.

Step 4 is resolution. The operator applies the appropriate fix: restart the affected module (through the Interface Hub or the /dumby reload command), restart the affected pod (through kubectl delete pod), rollback a deployment (through the Admin tier), disable a problematic module, revert a configuration change, or escalate to the module developer (for third-party module issues).

Step 5 is post-incident review. After the incident is resolved, the operator documents: what happened (the incident description), when it happened (timeline of detection, response, and resolution), why it happened (root cause analysis), how it was resolved (the fix applied), what could be improved (preventive measures), and what follow-up actions are needed (code changes, configuration changes, monitoring improvements).

### C.3 Capacity Planning

Capacity planning ensures that the bot has sufficient resources to handle growth. The capacity planning process is based on growth trends and resource utilization metrics.

Guild growth is tracked monthly. The bot owner monitors the rate of new guild joins (average per month) and projects future growth. When the projected guild count approaches a scale tier boundary (e.g., approaching 1,000 guilds — the Medium to Large boundary), the bot owner plans the scale-up: increase the shard count, increase the pod count, upgrade the database instance, and upgrade the Redis instance.

Resource utilization is tracked weekly. The bot owner monitors CPU usage (should be below 70 percent — the HPA target), memory usage (should be below 80 percent — the HPA target), database connection pool utilization (should be below 50 percent of the pool size), Redis memory usage (should be below 80 percent of maxmemory), and disk usage (should be below 80 percent). When any resource approaches its threshold, the bot owner plans a capacity increase.

### C.4 Disaster Recovery

Disaster recovery is the process of recovering from a catastrophic failure — complete database loss, complete Redis loss, or complete infrastructure loss.

Database disaster recovery: if the primary database is lost, the recovery process is: provision a new PostgreSQL instance, restore the latest full backup from S3, replay WAL segments up to the point of failure (point-in-time recovery), verify the restore with smoke tests, update the DATABASE_URL environment variable to point to the new instance, and restart the bot pods. Data loss is limited to the time between the last WAL segment and the failure (typically less than 5 minutes, as WAL segments are archived in real-time).

Redis disaster recovery: if the Redis instance is lost, the recovery process is: provision a new Redis instance, update the REDIS_URL environment variable to point to the new instance, and restart the bot pods. No data restoration is needed — Redis is a cache, and all data in Redis can be reconstructed from the database. The L1 and L2 caches will be repopulated as the bot processes requests.

Complete infrastructure loss: if the entire Kubernetes cluster is lost, the recovery process is: provision a new Kubernetes cluster, deploy the Helm chart (or Kustomize manifests), provision new database and Redis instances, restore the database from the latest backup, update environment variables, and verify that the bot is operational. The recovery time depends on the infrastructure provider's provisioning time (typically 30-60 minutes).

### C.5 Multi-Region Deployment

For bots with a global user base, multi-region deployment provides geographic redundancy and reduced latency. Dumby supports multi-region deployment through Kubernetes node affinity and geo-distributed database read replicas.

The primary region (US East) hosts the database primary, the Redis primary, and the primary bot pods. The secondary regions (EU West, AP South) host database read replicas, Redis replicas, and regional bot pods. Traffic is routed to the nearest region via a global load balancer (like AWS Route 53 or Cloudflare).

In a regional failure (e.g., US East goes down), the failover process is: promote the EU West read replica to primary (using PostgreSQL's pg_promote command), update the DATABASE_URL to point to the new primary, restart the bot pods in EU West, and update the DNS to route all traffic to EU West. The failover takes approximately 5-10 minutes. Data loss is limited to the replication lag at the time of failure (typically less than 5 seconds).

### C.6 The Service Level Agreement

Dumby's service level agreement (SLA) defines the expected availability and performance of the bot. The SLA is a commitment to the bot owner and guild owners, not a legal contract.

Availability: the bot should be available 99.5 percent of the time per month (approximately 3.6 hours of downtime per month). This includes planned maintenance (deployments, migrations) and unplanned downtime (incidents). Availability is measured by the health check endpoint — if the readiness check returns non-200 for more than 5 consecutive minutes, it counts as downtime.

Command latency: 95 percent of commands should respond within 200 milliseconds (excluding Discord API transit time). This is measured by the dumby_command_duration_seconds histogram. Commands that exceed 500 milliseconds are logged as warnings.

Event processing: 95 percent of events should be processed within 100 milliseconds (Core tier) or 500 milliseconds (Standard/Marketplace tier). This is measured by the event_delivery_duration_ms histogram metric.

Recovery time: P0 incidents should be resolved within 1 hour. P1 incidents should be resolved within 4 hours. P2 incidents should be resolved within 24 hours.

### C.7 Update and Patch Management

Dumby's update and patch management process ensures that the bot stays current with security patches, bug fixes, and new features.

Security patches are released as patch versions (e.g., → ) and are applied immediately. The bot owner is notified of security patches through the Interface Hub's notification system. Security patches do not require configuration changes or module updates.

Bug fixes are released as patch versions and are applied during the next maintenance window (typically within 1 week of release). Bug fixes are documented in the changelog and are tested in the staging environment before deployment to production.

New features are released as minor versions (e.g., → ) and are applied during a scheduled maintenance window. New features are announced at least 1 week before release, giving the bot owner time to review the changelog and plan the update. New features are tested in the staging environment for at least 1 week before deployment to production.

Breaking changes are released as major versions (e.g., → ) and require a migration guide. The bot owner reviews the migration guide, updates custom modules, tests in the staging environment, and schedules a maintenance window for the update. Major version releases are announced at least 1 month before release.

### C.8 The Community and Ecosystem

Dumby's community and ecosystem are essential for the framework's long-term success. The community provides modules, translations, documentation, and support.

The module marketplace is the primary community contribution channel. Developers build and publish modules, which are verified by the Module Gateway and made available to guild owners. The marketplace includes a rating system (1-5 stars) and a review system, allowing guild owners to evaluate modules before installation.

The translation program allows community members to contribute translations for modules. Translations are submitted as pull requests to the module's repository and are reviewed by the module author. Accepted translations are included in the next module release.

The documentation program allows community members to contribute to the framework's documentation. Documentation includes tutorials, guides, API references, and example modules. Documentation is submitted as pull requests to the framework's repository and is reviewed by the framework team.

The support program provides community-based support through Discord (a support server where users can ask questions, report bugs, and request features). The framework team monitors the support server and responds to questions. Community members can also earn recognition by helping other users.

## Appendix — Implementation Status & Audit Register

> **Genre boundary.** All audit entries, update notes, and status annotations are extracted here from the narrative. Each entry cites the section it was extracted from. **Status legend:** [SPEC] = architecture only · [SPECIFIED] = normative v5.0 specification with a named rollout phase · [PROTO] = prototype exists · [IMPL] = implemented · [TESTED] = tested at scale · [DEPLOYED] = running in production.
>
> **v5.0 re-baseline restatements.** Statuses restated against the 5.0.0 Consolidated Re-Baseline: CLAI's SSH transport (§22.6, §22.10) is [SPECIFIED — Phase 4]: a real ssh2 public-key server at `src/entry/ssh-clai.ts`, with no plaintext REPL remaining in the specification; Components V2 (§20.8) is [SPECIFIED — Phase 2]: the core Renderer with the static grammar, dynamic slots, and Modes D/M/C supersedes the earlier ~20%-implemented static-only Components V2 scaffold; Swastik (§15) is [SPECIFIED — Phases 1–3]: the tier-volume model, six-state license machine, trusted-build intake, and verified reload loop supersede the earlier ~30% hot-swap scaffold; the remaining v5.0 subsystems and their phases are recorded below.
>
> **v5.0 subsystem status (Phase 0–4 rollout).** Phase 0 — groundwork: the eleven ADRs (docs/adr/), the Compatibility Ledger skeleton (§14.4), `swastik` package repository, accent + title-grammar decisions. Phase 1 — module contract: raw TypeScript-only upload (§15.8), tier volumes (§5.4, §7.3), blind discovery (§8.2), `swastik` authoring package (§12.21), promotion loop (§15.4), deployment rate limits (§13.6) — all [SPECIFIED]. Phase 2 — the Renderer: core Renderer (§20.8), buffer embed and formal notices (§20.9), schema-declared authoring (§17.2), embed ban (§4) — all [SPECIFIED]. Phase 3 — governance & identity: license machine (§15.7), devId binding (§11.2), license classes and paper certificates (§22.8), credentials domain (§22.4), repository-triggered deployment (§15.11–§15.12), visibility enum (§11.2), hardcode toggle (§13.3) — all [SPECIFIED]. Phase 4 — platform surfaces: CLAI console (§22.6–§22.10), REST API families (§44.8), MDIS pub/sub sync (§16.5), Twixter (§35) — all [SPECIFIED]. The 52 deferred greenfield items remain out of scope and must not be described as features; the shipped user-facing surface remains /health and /hello until the phased rollout records otherwise below.

### Extracted audit entries

#### [From front matter] Doc-drift note:

> **Doc-drift note:** "JavaScript-based" phrasing survived in earlier
> versions until v4.0.0. The framework is TypeScript — all language
> descriptions must use accurate "TypeScript" phrasing throughout.

####

> A single canonical command subsystem is consolidated (the top-level src/commands/ tree); no other command directory is canonical

#### [From §2 (The Unified Modular Doctrine)] — Swastik (External-Module System)

- **Intent:** Swastik is the external-module system responsible for hot-swap/hot-reload of modules on a running system. It is a separately-deployed service (src/entry/swastik.ts) that orchestrates uploads, validation, staging, and atomic promotion.
- **Purpose:** Orchestrate module version upgrades on a running system without core restarts.
- [SPEC] — Swastik is specified end to end (§15): tarball upload with path containment, validation, bounded staging, atomic symlink promotion, reload API invocation, and the bot-side /internal/reload consumer.
- Fully implemented Swastik service with upload, validation, staging, atomic symlink promotion, and reload API invocation.

#### [From §3 (Engineering Principles (P1–P14))] Standalone `grants` DB table + migration

- ABSENT — only the narrower `rbac_grants` (role/group/set-scoped) exists; the standalone `grants` table was never created.
- `grants` migration created, Knex-visible, with standard audit columns and partial-index uniqueness, queried by the wired permission engine.

#### [From §3 (Engineering Principles (P1–P14))] Guild Command Change Queue Processing Logic

- Table exists (M018 migration); no processing logic. (Note: Code Reality Inventory shows GuildCommandChangeQueue.ts and GuildCommandChangeScheduler.ts ARE implemented — discrepancy between doc claims and code reality.)
- Queue processing with deduplication, batched deployment, and scheduler polling.

#### [From §3 (Engineering Principles (P1–P14))] MTP (synthetic token ledger) service

- `mtp_token_ledger_daily` migration exists; no service.
- MTP service writing daily token ledger entries.

#### [From §3 (Engineering Principles (P1–P14))] Multi-Version Rollback History (keep last few good builds staged)

- F4/F5 describe preserving the previous version for instant rollback (single-version retention).
- Keep the last few known-good builds staged on the shared volume; auto-revert pointer on failed health check before or after swap.

#### [From §3 (Engineering Principles (P1–P14))] Outbound Webhook Delivery Service

- Two migrations exist; admin endpoints to manage webhooks exist (`GET/POST/DELETE /admin/guilds/:guildId/webhooks`); no delivery processor.
- BullMQ processor that dequeues webhook deliveries, posts via `HttpClient`, records idempotency, retries on failure.

#### [From §3 (Engineering Principles (P1–P14))] Service Classes for Partial-Implementation Tables

- Database migrations exist; no service classes written.
- Service classes for metering, backup, outbound webhooks, webhook delivery idempotency, and token ledger.

#### [From §3 (Engineering Principles (P1–P14))] `AnonymizationService` (production data anonymization)

- ABSENT. No `AnonymizationService` found anywhere.
- Anonymization pipeline integrated with ErasureCoordinator export path.

#### [From §3 (Engineering Principles (P1–P14))] `BackupService` (scheduled database backup)

- `backup_history` migration (1.2KB) exists; no `BackupService` class.
- Scheduled backup service with success/failure recording and restore linkage.

#### [From §3 (Engineering Principles (P1–P14))] `MeteringService` implementation (multi-tenant resource metering)

- Table `metering_usage_daily` created by migration; no `MeteringService` class anywhere in codebase.
- `MeteringService` recording daily usage buckets with repository, admin endpoint, and eraser registration.

#### [From §3 (Engineering Principles (P1–P14))] — Atomic Symlink Promotion (crash-safe swap)

- **Intent:** Module is either fully old or fully new at the filesystem level; no half-written reads.
- **Purpose:** Crash-safety for the hot swap.
- New version written to `versions/<mod>-vX.Y.Z/`; symlink in `live/` atomically updated; previous version preserved; on reload failure symlink reverts.
- Maintain as the core hot-swap mechanism.

####

> parsing manifest.ts via static AST extraction (no code execution)

####

> ### 3.2.1 Port Mapping: Docker Compose vs Kubernetes

####

> ### 3.11.1 Licensing Gate

####

> #### — Release Manager source integrity & build (immutable SHA, SBOM, signing, provenance)

####

> #### — Release Manager–Swastik lease coordination (fencing tokens, heartbeat, upload queueing)

####

> #### — Release Manager Deployment Strategies (Rolling, Blue-Green, Phased Ramp, DAG)

####

> #### — Release Manager canary analysis with correlation & minimum-sample guard

####

> #### — Release Manager config & migration safety (expand-only, advisory lock, destructive deferral)

####

> #### — K8s Rolling Update with Zero-Unavailable (maxSurge 1 / maxUnavailable 0)

####

> #### — BullMQ queue + autoscaler + DLQ + scheduler

#### [From §4 (Non-Goals & Explicit Boundaries)] — Release Manager 10-phase release state machine

- ** IDLE→PHASE0 INTAKE→1 PREFLIGHT→2 BUILD→3 ARTIFACT VERIFY→4 CONFIG&MIGRATION→5 LEASE→6 SWASTIK LOCK→7 ROLLOUT→8 CANARY→9 FINALIZE / R: ROLLBACK; terminals ABORTED/FAILED/RECONCILING/NO_OP. The specification requires: ** Implemented state machine with durable phase checkpoints.

####

> The error taxonomy in `src/errors/taxonomy.ts` implements 13 subclasses extending `DumbyError`, each carrying `httpStatus`, a `retryable` flag, and `toJSON`. The documented set in Appendix B must be updated to match: `ValidationError`, `PermissionDeniedError`, `NotFoundError`, `ConflictError`, `ExternalServiceError`, `ConfigurationError`, `InternalError`, `RateLimitedError`, `MaintenanceModeError`, `DependencyUnavailableError`, `EventCycleError`, `UnauthorizedError`, `CommandCeilingExceededError`, and `CollisionPendingError`. The `isOperational` field is absent; code uses `retryable`.

####

> Invalid uploads are rejected with specific validation errors

#### [From §6 (System Architecture)] — PEP (Policy Enforcement Point)

- **Intent:** Emergency authority for revocation, suspension, emergency disablement with mandatory audit logging.
- **Purpose:** Fully implemented enforcement methods + audit logging.
- [SPEC] — every control domain resolves to a real domain handler or returns an honest 501 NOT_IMPLEMENTED; the no-stub test walks every route (§22.3).
- Full enforcement + audit; Swastik enforces PEP decisions.

#### [From §7 (Directory & File Structure)] — /health slash command

- **Intent:** Documented Core-tier shipped command.
- Missing.
- Built.

#### [From §7 (Directory & File Structure)] — Live CommandRouter (thinner than spec)

- **Intent:** Routes slash interactions.
- Partially Implemented — wired to bootstrap, bypasses middleware, no collision resolution/cosmetics/hot-swap.
- Middleware-integrated.

#### [From §7 (Directory & File Structure)] — Spec-complete CommandRouter / registry (`src/commands/ (the canonical command system)`)

- **Intent:** Full command system with collision resolution, cosmetics, hot-swap, key codec, etc.
- Dead Code — zero external importers; 3 migrations Knex never sees.
- Wired or deleted (B2-023/B2-047).

#### [From §7 (Directory & File Structure)] — Observability (logging/metrics/tracing, items 217-239) implemented

- ** Metrics (drm_deploy_total, deploy_duration, phase_duration, rollback_total, swastik_lock_*, canary_*, lease_*, reconcile_mismatch_*), logs (service:'drm',deploy_id,phase,actor_id,trace_id), tracing spans per phase. The specification requires: ** Metrics + logs + traces as specified.

#### [From §7 (Directory & File Structure)] — Two-tier cache (L1 LRU + L2 Redis + PER + stampede guard + negative caching)

- **Intent:** Catalog the two-tier cache with stampede protection and probabilistic early refresh.
- **Purpose:** L1 in-process LRU (max 5000 entries / 50MB, sub-ms) + L2 Redis (fleet-wide, single-digit-ms) behind unified CacheManager API.
- CacheManager (~180 LOC), L1Cache (~157 LOC), RedisLockStore (~95 LOC), StampedeGuard (~42 LOC), key-namespace (~116 LOC) — ALL IMPLEMENTED. PER formula, negative caching, write-through invalidation, pub/sub cross-pod L1 invalidation.
- Maintained as production-grade cache.

####

> ### 7.10.1 PEP Route Dispatch

####

> #### — CLAI (control-plane operator terminal)

####

> #### — RBAC grants (permit/blacklist/whitelist/cooldown/rate-limit)

#### [From §8 (Application Bootstrap & Lifecycle)] Design consideration — shared connection pooler.

> **Design consideration — shared connection pooler.** Rather than raising PostgreSQL `max_connections` as pod count grows, deploy PgBouncer or pgcat as a shared connection pooler in front of PostgreSQL. This mitigates pool exhaustion during scale-out and reduces per-pod connection pressure on the Stage 05 connect path. Impact: Medium; feasibility: Medium.

#### [From §8 (Application Bootstrap & Lifecycle)] Roadmap note — environment-variable schema cross-check.

> **Roadmap note — environment-variable schema cross-check.** A Stage 02 failure is a config problem discovered at pod startup. Swastik can catch it earlier: extract the module's config Zod schema at upload time and simulate validation against the current (or a sample) environment, reporting missing or mis-typed variables before the module is ever staged. Cheap, because it reuses the same schema. Impact: Medium; feasibility: High.

#### [From §8 (Application Bootstrap & Lifecycle)] — 18-Stage Bootstrap (Delivered, Spec-Match)

- **Intent:** Verify that the bootstrap sequence is real implementation, not stubs.
- **Purpose:** A deterministic startup sequence from process setup to STARTUP_COMPLETE.
- Fully Implemented. The 18-stage bootstrap starts a health server before module loading, separates queue Redis from cache Redis, creates a frozen root container before spawning a child container for modules. Wired with real Redis, PostgreSQL (Knex), discord.js, and Fastify.
- Maintain forward-only advanceTo progress; keep startup/liveness/readiness probes gated by stage.

#### [From §8 (Application Bootstrap & Lifecycle)] Design consideration — enforce the overhead budget as CI gates.

> **Design consideration — enforce the overhead budget as CI gates.** The stated framework-overhead targets (P50 < 8 ms, P99 < 20 ms per command) are currently aspirations. `scripts/load-test.ts` should be wired into CI as a benchmarked gate so regressions against the budget fail the build — this budget is also the basis for rejecting per-command runtime policy checks. Impact: Medium; feasibility: Medium.

#### [From §8 (Application Bootstrap & Lifecycle)] Webhook Signature Verification Infrastructure

- Specified. Every inbound webhook route verifies HMAC-SHA256 with replay protection. Unverified webhooks refuse to register during Stage 14. No supported unverified-webhook mode.
- Implemented mandatory webhook verification with replay protection and Stage 14 registration gate.

#### [From §8 (Application Bootstrap & Lifecycle)] Zero-downtime mechanism for core restart (rolling/blue-green + gateway resume)

- Design specifies the requirement; K8s deployment.yaml has rolling update strategy, and a restart-window lock prevents a core-restart/module-hot-swap race condition.
- Implemented rolling/blue-green + Discord gateway session resume / shard handoff.

#### [From §8 (Application Bootstrap & Lifecycle)] Shard ownership handoff arbitration

- `RedisLockStore` (96L) with acquire/release; `SHARD_LOCK_*` env vars declared; no protocol in bootstrap.
- Bootstrap shard-claim sequence with TTL renewal and graceful release on shutdown.

**Middleware pipeline wired into live dispatch**

#### [From §8 (Application Bootstrap & Lifecycle)] — 12-stage middleware pipeline

- **Intent:** Request/interaction pipeline with 12 stages and correct priorities.
- **Purpose:** Live router routes through all 12 stages.
- [SPEC] — the pipeline is constructed at bootstrap Stage 09 with all twelve built-ins in priority order and injected into the live router; the structural wiring test asserts the chain on every build (§19.1).
- Live traffic flows through the 12-stage pipeline.

#### [From §8 (Application Bootstrap & Lifecycle)] Function reference — `topologicalLoadOrder` / `classifyLoadFailures` (Live):

> **Function reference — `topologicalLoadOrder` / `classifyLoadFailures` (Live):** Ensure modules load in dependency order; detect cycles. Status: topologicalLoadOrder (~89 LOC) — IMPLEMENTED. ModuleDependencyCycleError on cycle, UnknownModuleDependencyError on missing dep, classifyLoadFailures for fatal vs non-fatal. Requirement: Maintained as the module ordering mechanism. touchpoints: modules/topo-sort.ts.
#### [From §8 (Application Bootstrap & Lifecycle)] Intent Union Computation at Login

#### [From §8 (Application Bootstrap & Lifecycle)] register-all.ts

#### [From §8 (Application Bootstrap & Lifecycle)] 18-stage bootstrap Application

####

> #### 8.4.1 Process-Module Config Scope (`ModuleConfigScope`)

####

> #### Design Consideration — Managed Resource Registry

#### [From §9 (Graceful Shutdown & Signal Handling)] — 9-Step Graceful Shutdown

- **Intent:** Confirm the most load-bearing infrastructure matches spec exactly.
- **Purpose:** Establish graceful shutdown as delivered Tier-1.
- `bootstrap/stages.ts` defines 18 stage names + 9 shutdown step names as literal ordered string-literal arrays matching `master-prompt.md` §4/§4 exactly. `bootstrap/bootstrap.ts` wires Postgres (Knex), Redis (ioredis, twice — cache + queue), BullMQ, DI container, live/mock Discord gateway, calls `progress.advanceTo(...)`. Health gates `isLive`/`isStarted`/`isReady` keyed to stages 04/15/18. K8s `terminationGracePeriodSeconds: 190` exact.
- Maintain the 9-step sequence.

#### [From §10 (Dependency Injection & Service Container)] Design consideration — operator policy lockfile.

> **Design consideration — operator policy lockfile.** An operator-authored JSON policy file — `allowedExternalDomains`, `maxCommandsPerModule`, `forbiddenIntents`, `requiredRBACFloor` — loaded once at Stage 11 and enforced when module manifests are validated: declarations that violate the policy fail the load (or log a severe warning). Checking only at bootstrap/hot-reload — never per command — preserves the sub-20 ms P50 overhead budget while giving operators a central, verified-once gate. A ~10-line Zod check makes this high feasibility. Impact: High; feasibility: High.

#### [From §10 (Dependency Injection & Service Container)] Design consideration — three-layer memory-leak guardian.

> **Design consideration — three-layer memory-leak guardian.** Memory-leak protection should be a default runtime property, not opt-in: detection in observability and CI, prevention in the DI container/EventBus/CacheManager (enforcing cleanup discipline at bind and subscribe time), remediation in the Kubernetes probes and Swastik's suspend/rollback path. The DI discipline this section specifies already provides the hooks; they need to be made enforcing. Impact: High; feasibility: Medium.

#### [From §10 (Dependency Injection & Service Container)] Roadmap note — ESLint rule `dumby/no-orphaned-closures`.

> **Roadmap note — ESLint rule `dumby/no-orphaned-closures`.** The module structure is rigid enough that a linter always knows where `onUnload` lives. A custom ESLint rule can therefore require that every `setTimeout` is assigned to a variable cleared in `onUnload`, and that every `EventBus.on` unsubscribe function is stored and called — blocking leak-prone PRs at CI before they reach production. Impact: Medium; feasibility: High.

#### [From §10 (Dependency Injection & Service Container)] `PowerEngineService` class missing

- ABSENT — only the generic dispatcher wrapper exists; no `PowerEngineService` class.
- Service class backing all 17 domains, registered in DI.

#### [From §10 (Dependency Injection & Service Container)] ESLint Rule dumby/no-orphaned-closures (Static Leak Guard)

- ABSENT — proposed; justified by rigid module structure (§10.3) letting the linter know where onUnload lives.
- ESLint rule fails CI instantly on orphaned closures.

#### [From §10 (Dependency Injection & Service Container)] ITimerService DI Token (Forbid Raw setTimeout/setInterval in Modules)

- ABSENT — proposed.
- ITimerService injected into every module container scope; resourceTracker.clearAllTimers auto-called on unload.

#### [From §10 (Dependency Injection & Service Container)] — Cross-Module Synchronous Calls via provides/depends

Maintain as-is; document the contract validation and version constraint checking.

#### [From §10 (Dependency Injection & Service Container)] — Manifest Contract (hardcoded/hardcodeGuildId/visibility triad)

- **Intent:** Every capability explicit — intents, commands, jobs, provides tokens, events, schemas — declared up front; validated at startup so a malformed module doesn't load.
- **Purpose:** Truth contract, not config file.
- Fully Implemented (per docs) — 28+ required/optional fields; compile-time provides-contract checking via TS types.
- Maintained.

#### [From §10 (Dependency Injection & Service Container)] Module Isolation via DI Scoping (P2) + Module Contract

#### [From §10 (Dependency Injection & Service Container)] Bootstrap 18-Stage Startup Sequence

#### [From §10 (Dependency Injection & Service Container)] DAG Workload Ordering

#### [From §10 (Dependency Injection & Service Container)] Four Sanctioned Cross-Module Communication Patterns

#### [From §11 (Module Anatomy & Manifest)] Design consideration — diff-based auto-approval heuristic.

> **Design consideration — diff-based auto-approval heuristic.** Version updates whose manifest diff does not touch permission scope, entry points, or dependencies can be auto-approved — the extension-store pattern: nobody hand-reviews a changelog typo. A manifest diff comparator gates the approval workflow, while sensitive-diff updates stay in the manual queue. Trade-off: this is a heuristic, not a guarantee. Impact: Medium; feasibility: High.

#### [From §11 (Module Anatomy & Manifest)] Roadmap note — duplicate source detection on upload.

> **Roadmap note — duplicate source detection on upload.** Swastik should hash the uploaded source and dedupe against earlier staged builds, rejecting accidental duplicate uploads before compute is spent staging them. Saves compute and keeps the build record unambiguous about which artifact is which. Impact: Low; feasibility: High.

#### [From §11 (Module Anatomy & Manifest)] Roadmap note — general module sandboxing via worker threads.

> **Roadmap note — general module sandboxing via worker threads.** Worker-thread isolation is currently specified for CPU-intensive work only. Extending it to a `ModuleWorkerHost` running untrusted Marketplace modules in isolated worker threads with IPC would make the marketplace trust model structural rather than review-based. Impact: High for marketplace trust; feasibility: Low (V2).

#### [From §11 (Module Anatomy & Manifest)] Roadmap note — module self-test entries.

> **Roadmap note — module self-test entries.** The `module_selftest_entries` table exists but nothing invokes it. A module self-test runner, executed at deploy/staging time from Swastik, would turn the table into its intended purpose: per-module health validation before promotion. Impact: Medium; feasibility: Medium.

#### [From §11 (Module Anatomy & Manifest)] Design consideration — framework-injected runtime config.

> **Design consideration — framework-injected runtime config.** Each module currently applies its own config schema during `onLoad` (Stage 12). A stronger contract is framework injection: bootstrap reads the manifest's declared config schema, validates the environment once, and hands the module a frozen, typed, validated config object — guaranteeing the declared schema is the schema actually used, and giving developers typed config for free. Impact: Medium; feasibility: High.

####

> requires the module to contain the public Dev ID and the buildId; the private Dev Token never ships inside the manifest

####

> The Credentials Service listen port must be config-driven via the Zod-validated `env.schema.ts` (`CREDENTIALS_SERVICE_PORT`, default `8086`), consistent with all sibling services that source ports from environment configuration. The hardcoded `8086` in `src/entry/credentials.ts` must be replaced with the config value.

#### [From §11 (Module Anatomy & Manifest)] Cryptographic Signing & Provenance

#### [From §11 (Module Anatomy & Manifest)] Per-Module Sandbox Worker (process/container isolation + RPC boundary)

#### [From §11 (Module Anatomy & Manifest)] Content-Addressed Staging (never overwrite in place)

#### [From §11 (Module Anatomy & Manifest)] External Module Loading

#### [From §11 (Module Anatomy & Manifest)] Manifest as Module Contract (declarative, versioned, ships with module)

####

> no field

#### [From §12 (Building a Module — A Complete Worked Example)] Design consideration — runtime `eventsCatalog` enforcement.

> **Design consideration — runtime `eventsCatalog` enforcement.** The catalog is currently enforced only by compile-time lint. Wrapping each module's event bus in a module-scoped emitter that checks `emit` against the manifest's declared `eventsCatalog` would make an undeclared event a runtime error at the source, not a lint warning that can be skipped. Impact: Medium; feasibility: High.

#### [From §12 (Building a Module — A Complete Worked Example)] Roadmap note — static analysis of `eventsCatalog` and dependencies.

> **Roadmap note — static analysis of `eventsCatalog` and dependencies.** A post-build static analyzer should cross-check emitted events, `provides` tokens, and dependency declarations against the manifest, rejecting the upload with clear errors on mismatch. Fast, deterministic, and it enforces the framework's own contract discipline before code ever reaches a pod. Impact: Medium; feasibility: High.

#### [From §12 (Building a Module — A Complete Worked Example)] Roadmap note — local module validator CLI.

> **Roadmap note — local module validator CLI.** A `pnpm dumby module validate` CLI that mirrors Swastik's upload-time checks would let module authors catch contract, event, config, and migration failures locally — before upload, and reproducibly. Zero trade-off for compliant developers; every rejection it prevents is a failed upload that never happened. Impact: Medium; feasibility: High.

#### [From §12 (Building a Module — A Complete Worked Example)] UIResponse Type Schema

- ABSENT.
- `dumby/core/ui/ResponseSchema.ts` defines `UIResponse = | { type:'card'; title?; body:UIComponent[]; actions?:UIComponent[]; ephemeral?:boolean } | { type:'modal'; title; fields:UIInput[]; submitAction:string } | { type:'pagination'; data:UIComponent[]; pageSize:number }`.

#### [From §12 (Building a Module — A Complete Worked Example)] Discord API 429 rate-limit handling/retry

- CommandRouter acknowledgement guard exists; no 429 handling/retry logic.
- `CommandDeployer` and gateway calls respect Discord rate-limit headers with bucketed backoff.

#### [From §12 (Building a Module — A Complete Worked Example)] Server-Driven UI (SDUI) — UIResponse Schema Replacing interaction.reply

- ABSENT — proposed; document currently gives modules total freedom over interaction.reply (§12.4 RemindCommand builds custom embed).
- ICommand.execute returns Promise<UIResponse>; ESLint rule no-direct-interaction-reply hard-blocks interaction.reply/editReply/followUp/EmbedBuilder.

#### [From §12 (Building a Module — A Complete Worked Example)] — defineManifest({...})

**Specification.** Used by module authors; the exported object is read via static AST extraction of the `defineManifest(...)` argument (TypeScript Compiler API / ts-morph) — never by executing the module.

Argument extracted via AST without evaluation.

#### [From §12 (Building a Module — A Complete Worked Example)] — onLoad(container) / onReady(client) (Module Lifecycle Hooks)

Maintained.

#### [From §12 (Building a Module — A Complete Worked Example)] — onUnload (Module Cleanup Hook)

Framework auto-cleans via resource tracker.

#### [From §12 (Building a Module — A Complete Worked Example)] — I18nManager + formatters

Add additional locales.

#### [From §12 (Building a Module — A Complete Worked Example)] — Modules (loader + manifest schema + topo-sort + Swastik loader)

Maintain; wire core/commands into the active path.

####

> A single canonical retry mechanism is used: consolidate resilience/retry-policy.ts with shared/utils/retry.ts (exponential backoff with jitter and retryable detection) and remove the unused duplicate.

####

> PersonaCommandBindingService and CommandLifecycleHotSwapService are wired into bootstrap.ts and core/commands/ so persona bindings take effect and hot-swap is triggerable via the reload API; the built-and-tested classes are no longer without an entry point.

####

> All table access goes through typed repositories (BaseRepository / InsertOnlyRepository); no raw knex('table') calls remain outside repositories in bootstrap, admin routes, or entry points, and audit_logs uses InsertOnlyRepository.

####

> ErasureCoordinator is registered in the DI container (src/di/tokens.ts) and exposed for module registration of erasers/exporters; the implemented coordinator is no longer zero-caller.

#### [From §13 (Module Tiers & Lifecycle)] Expand-Only Migrations / Destructive Deferral

#### [From §13 (Module Tiers & Lifecycle)] — Seven-Layer Permission Engine (PermissionResolver)

- **Intent:** The single, unified engine deciding whether a given user, in a given guild and channel, is authorized to invoke a given command — the one source of truth (P13).
- **Purpose:** Serve as the sole permission authority for all command dispatches and dashboard API requests.
- [SPEC] — resolved as a mandatory stage of every dispatch through the 12-stage middleware pipeline (§19.1); the structural wiring test fails the build if the live router bypasses it.
- Fully Implemented and wired into every command dispatch through the middleware pipeline.

#### [From §13 (Module Tiers & Lifecycle)] — PEP Seventeen Control Domains

- **Intent:** A catalog of callable functions for deliberate, logged intervention.
- **Purpose:** Enable fleet-wide response to abuse/security without redeploy.
- 17 domains (suspendGuild, suspendModule, suspendDeveloper, suspendCommand + 13 extended); each writes an unconditional audit_logs entry before returning.
- Maintain; the schema is future-proof for a natural-language front end.

#### [From §13 (Module Tiers & Lifecycle)] Design Consideration — Trusted Builder, Twelve-Step Pipeline

#### [From §13 (Module Tiers & Lifecycle)] Defense-in-Depth Firewall (No Single Gate)

####

> Admin tier's bypass of the ordinary rate-limit and permission chain makes it the

#### [From §14 (Inter-Module Communication)] — ModuleDisabledResult Sentinel

Maintain; add a lint rule for unchecked sentinels.

####

> consolidated retry utility (exponential backoff, jitter, max-attempts)

####

> **Design consideration — type-level compatibility checks:** beyond semver range satisfaction, the specification requires for Swastik to resolve the full dependency graph and perform type-level compatibility checks between `provides` and `depends` contracts using the TypeScript type checker, so a breaking contract change forces a major-version bump instead of surfacing as a silent runtime `TypeError` in production. This turns version pinning from a convention into a mechanically enforced guarantee.

#### [From §15 (Swastik — Hot Reload & Dynamic Module Management)] — ICommand Interface (SlashCommandBuilder Required)

- **Intent:** The command interface that all module commands must implement. Requires a SlashCommandBuilder, making text-prefix commands structurally impossible.
- **Purpose:** Serve as the mandatory contract for all commands, requiring SlashCommandBuilder or ContextMenuCommandBuilder.
- Specified. ICommand interface requires a SlashCommandBuilder. The manifest has no textPrefixes field.
- Maintained as SlashCommandBuilder-required. No text-prefix fields added.

#### [From §15 (Swastik — Hot Reload & Dynamic Module Management)] — Command system (`commands/`, flat)

- **Status:** Fully Implemented. `command-registry.ts` (79L, `CommandCollisionError`), `command-router.ts` (196L, Proxy acknowledgement guard), `command-deployer.ts` (216L), `command-ceiling.ts` (64L, MAX_COMMANDS_PER_GUILD=100), `collision-resolution.ts` (145L, 5-step). Notes: this is the WIRED subsystem.

#### [From §15 (Swastik — Hot Reload & Dynamic Module Management)] POST /internal/reload?module=<name> (Hot-Swap Signal)

#### [From §15 (Swastik — Hot Reload & Dynamic Module Management)] Hot-Swap Reload Sequence (onUnload → re-import → onLoad → onReady → health)

#### [From §15 (Swastik — Hot Reload & Dynamic Module Management)] Function reference — `QueueManager.enqueue` (idempotencyKey) — `queue/queue-manager.ts`:

> **Function reference — `QueueManager.enqueue` (idempotencyKey) — `queue/queue-manager.ts`:** L1 check → L2 check → stampede-guarded recompute → populate both tiers. Negative caching with sentinel. Status: CacheManager.get<T> — IMPLEMENTED. L1→L2→recompute cascade, write-through set, delete (L2 first then L1), invalidatePattern. Requirement: Maintained as the unified cache API. touchpoints: cache/cache-manager.ts, cache/l1-cache.ts, cache/stampede-guard.ts.
#### [From §15 (Swastik — Hot Reload & Dynamic Module Management)] BullMQ Worker Hot-Swap Handling

#### [From §15 (Swastik — Hot Reload & Dynamic Module Management)] — Release Manager GitHub→deploy integration with OIDC

- **Intent:** Routes Discord Interactions (slash commands, context menus) to registered command handlers. Structurally incapable of routing text-prefix commands.
- **Purpose:** Serve as the sole command dispatch entry point, accepting only Interaction objects and routing to commands via a Map<string, ICommand> keyed by slash-command paths.
- Specified. The CommandRegistry is a Map<string, ICommand> where keys are slash-command paths. No text-based dispatch exists. The function CommandRouter.dispatchText('kick', message) does not exist.
- Maintained as Interaction-only. No text dispatch capability added.

#### [From §15 (Swastik — Hot Reload & Dynamic Module Management)] Release Manager Security Threat Model

#### [From §15 (Swastik — Hot Reload & Dynamic Module Management)] Global Lock During Core Restart

#### [From §15 (Swastik — Hot Reload & Dynamic Module Management)] Renewable Lease + Fencing Token

#### [From §15 (Swastik — Hot Reload & Dynamic Module Management)] Pipeline-signal-only reload (no generic file watcher)

#### [From §15 (Swastik — Hot Reload & Dynamic Module Management)] — Manifest Validation (Zod Schema, Shared with Startup Stage 11)

Single shared schema package + pre-activation pass.

#### [From §15 (Swastik — Hot Reload & Dynamic Module Management)] — devId/buildId Binding Check (§13)

Maintained.

#### [From §15 (Swastik — Hot Reload & Dynamic Module Management)] — Developer Upload & Status Tracking (§15.8, §15.11)

Maintain API response + optional signed webhook.

####

> Approval scope is per-version, not developer-level: routine semver bumps auto-approve, while any change to declared permissions, entry points, or dependencies is flagged for manual review via a manifest diff comparator.

####

> The onUnload → onLoad → onReady hot-swap sequence is shipped as executable TypeScript in the Swastik service and Dumby runtime (POST /internal/reload): atomic symlink management, command/event re-registration, and automatic rollback on any lifecycle-hook failure

####

> The builds table carries provenance columns sourceArchiveHash, artifactHash, lockfileHash, gateResultsHash, signature, and sbomRef, bound to the buildId so every promotion is provably tied to a verified artifact

####

> Swastik assigns a buildId in semver+content-hash form (2.3.1+sha256:9f1c…) stored in swastik_builds.buildId and the manifest buildId field, replacing the integer counter

####

>

####

>

####

> , AND Swastik MUST accept TypeScript source (not pre-compiled JavaScript) and run a trusted build itself — `tsc --noEmit` plus the architecture-specific ESLint ruleset (§38.4) in a secure container — producing the artifact it then stages. Manifest Zod validation alone does not verify that uploaded JS was compiled from reviewed TypeScript

####

> (whose signature is verified at every load boundary — initial import, hot-swap re-import, and reload — not only at process restart; `PEP.revokeModuleSignature` triggers immediate re-verification of the affected module at the next load boundary)

#### [From §15 (Swastik — Hot Reload & Dynamic Module Management)] POST /swastik/modules/upload (Module Upload Endpoint)

#### [From §15 (Swastik — Hot Reload & Dynamic Module Management)] Auto-rollback on hot-swap failure

#### [From §15 (Swastik — Hot Reload & Dynamic Module Management)] Module Upload & Manifest Validation Pipeline

#### [From §15 (Swastik — Hot Reload & Dynamic Module Management)] Atomic Symlink Promotion & Rollback

#### [From §15 (Swastik — Hot Reload & Dynamic Module Management)] Swastik as Administrative Control Plane (separate from request plane)

#### [From §16 (Marketplace, MDIS & Extension System)] ModuleRegistry.discover — Configurable Root Scan

#### [From §16 (Marketplace, MDIS & Extension System)] — Background Listener Pattern (Message Scanning)

- **Intent:** Catalog the architectural pattern where message scanning is a background service separate from command execution.
- **Purpose:** Modules can read every message and react (auto-mod, sentiment, archiving, spam detection) but cannot turn that into a command system. Two separate worlds: background scanning (EventRouter) vs foreground interaction (CommandRouter).
- Fully implemented. EventRouter delivers messageCreate events to handlers. CommandRouter only accepts Interactions. No text dispatch function exists.
- Maintained as the core design principle.

#### [From §16 (Marketplace, MDIS & Extension System)] — Review Feedback Is Specific (Never Generic Rejection)

Maintain specific feedback requirement.

####

>

#### [From §16 (Marketplace, MDIS & Extension System)] Gate 1 (automated static analysis)

#### [From §16 (Marketplace, MDIS & Extension System)] Gate 5 (cryptographic signing)

#### [From §17 (Command Framework & Routing Engine)] Port-based dependency inversion (hexagonal command ports)

#### [From §17 (Command Framework & Routing Engine)] Background Listener Pattern

#### [From §17 (Command Framework & Routing Engine)] Discord's Message Content Privileged Intent

#### [From §17 (Command Framework & Routing Engine)] Hexagonal Architecture (Ports & Adapters) in Core/Commands

#### [From §17 (Command Framework & Routing Engine)] Zero-Knowledge Command Transactions (Slash Commands)

#### [From §17 (Command Framework & Routing Engine)] Function reference — Command Collision Resolution UX:

> **Function reference — Command Collision Resolution UX:** On install collision, the admin sees an ephemeral embed with a dropdown to resolve the conflict (§17.9). Status: Implemented (§17.9); admin never interacts with the review pipeline.; Requirement: Implemented collision-detection + dropdown resolution UI. touchpoints: Install flow (§16.2), collision resolver (§17.9), ephemeral embed UI., §17.9 Command Collision Resolution; install flow (§16.2).
#### [From §17 (Command Framework & Routing Engine)] — Core/Commands Hexagonal Architecture

- **Intent:** Catalog the most substantial subsystem: 14 services + types + ports + 3 migrations + 12 test files (~2,749 LOC).
- **Purpose:** Complete command lifecycle management: deployment planning, hot-swap, persona binding, guild-level change queuing, collision resolution, cosmetic management.
- FULLY BUILT. 14 services: CommandRegistry, CommandRouter, CommandDeployer, CommandDeploymentPlanner, CommandCollisionResolver, CommandKeyCodec, CommandValidationService, CommandCosmeticsService, CommandCountProjectionService, CommandLifecycleHotSwapService, CommandRestrictionGuard, GuildCommandChangeQueue, GuildCommandChangeScheduler, PersonaCommandBindingService.
- Maintained as the primary command subsystem.

#### [From §17 (Command Framework & Routing Engine)] — GuildCommandChangeQueue + GuildCommandChangeScheduler

Wire GuildCommandChangeScheduler.start into bootstrap.

#### [From §17 (Command Framework & Routing Engine)] — PersonaCommandBindingService

Wire into persona entry point.

#### [From §17 (Command Framework & Routing Engine)] — commands/ subsystem (registry, router, deployer, ceiling, collision)

Reconcile with core/commands/.

#### [From §17 (Command Framework & Routing Engine)] — core/commands/ hexagonal subsystem (14 services + ports + types + 3 migrations + 12 tests)

Wire into bootstrap.

#### [From §19 (Middleware Pipeline & Interceptors)] CommandRouter Only Accepts Discord Interactions

#### [From §19 (Middleware Pipeline & Interceptors)] `MiddlewarePipeline.execute` (Unused by Live Router)

#### [From §19 (Middleware Pipeline & Interceptors)] interaction.reply / deferReply / editReply / followUp / showModal

#### [From §19 (Middleware Pipeline & Interceptors)] CommandRouter (Post-Middleware UI Compiler in SDUI)

#### [From §19 (Middleware Pipeline & Interceptors)] — SlidingWindowRateLimiter

Maintain.

#### [From §19 (Middleware Pipeline & Interceptors)] Failure Containment via Per-Handler Isolation

#### [From §19 (Middleware Pipeline & Interceptors)] Memory Leak Threat Model (Five Vectors)

####

>

####

> #### 19.6.1 MDIS Backend — Schema-Driven Web Config UI

#### [From §20 (Interaction & Component Handling)] Core-Owned InteractionRegistry with Action ID Prefixing

- ABSENT — proposed alongside SDUI.
- Core resolves actionId → module handler; idempotency for button clicks enforced at Core via Redis.

#### [From §20 (Interaction & Component Handling)] Stateless custom_id scheme (Components V2)

- `interaction-registry.ts` (47L) exists but minimal; no stateless scheme.
- Encoded custom_id format (e.g. `module:action:payload`) parseable without server state.

#### [From §20 (Interaction & Component Handling)] WebhookRenderer (Sanctioned Exception to UI Ban)

- ABSENT — proposed.
- WebhookRenderer utility enforcing UIResponse schema for async messages.

#### [From §20 (Interaction & Component Handling)] — InteractionRegistry

Wire the custom_id encoding scheme and button/select dispatch.

#### [From §20 (Interaction & Component Handling)] — Pagination / Form Sessions (PaginationManager)

Maintain as-is; document the PaginationManager API and Redis session storage pattern.

#### [From §22 (Power Engine Panel, CLAI & Credentials Service)] Explicit CLAI SSH Key Lifecycle Boundary Statement

- The document (§22.6) says each operator's key is registered individually and revocable independently, but does not describe the revocation mechanism or whether keys are re-read at runtime.
- An explicit statement such as: "CLAI's SSH key file is read once at daemon start. Rotating an operator's key requires a kubectl rollout restart deployment/clai."

#### [From §22 (Power Engine Panel, CLAI & Credentials Service)] `entry/ssh-clai.ts` File

- Referenced in a source comment; file absent.
- A real `entry/ssh-clai.ts` using the `ssh2` library for public-key auth.

#### [From §22 (Power Engine Panel, CLAI & Credentials Service)] — CLAI (Control-Plane Entry Point)

- **Intent:** CLAI is an SSH-hosted operator terminal providing direct, interactive access to PEP's function catalog from outside Discord entirely. Its defining property is independence from every other part of the stack that could be the thing currently broken.
- **Purpose:** Provide a viable intervention path even when the Discord gateway is down, a shard group is unresponsive, or a core restart is mid-rollout.
- Specified as SSH-hosted terminal with public-key authentication. Architecture-only. Project context indicates entry/clai.ts may be a SSH (ssh2) socket — a spec-vs-implementation mismatch.
- Implemented SSH-hosted terminal with per-operator key registration/revocation, connecting to PEP's function catalog.

#### [From §22 (Power Engine Panel, CLAI & Credentials Service)] PEP signModule / revokeModuleSignature

#### [From §22 (Power Engine Panel, CLAI & Credentials Service)] entry/clai.ts (SSH (ssh2) server)

#### [From §22 (Power Engine Panel, CLAI & Credentials Service)] Argon2id Credential Hashing

#### [From §22 (Power Engine Panel, CLAI & Credentials Service)] Function reference — Credentials Service (Argon2id, Internal Network Binding):

> **Function reference — Credentials Service (Argon2id, Internal Network Binding):** Provide a reference for the credentials service contract. Status: Fully Implemented. Credentials Service uses Argon2id for credential hashing. Internal-network-only binding for the credentials service. Separate entry point: `credentials.ts`. Requirement: Maintain as-is; ensure the internal-network-only binding is enforced at the network level (Kubernetes NetworkPolicy). touchpoints: src/entrypoints/credentials.ts; src/core/credentials/ (CredentialsService); spec §19.

####

> > **ADR-005 deferral:** Hot-swap mechanism, worker-thread isolation,
> scheduled zero-downtime core restart, and runtime sandbox are all
> absent — correctly deferred per ADR-005 as V2 capabilities. No runtime
> sandbox exists; modules load in-process. Worker-thread sandboxing is
> planned for untrusted marketplace modules.

#### [From §23 (Configuration Management)] Design consideration — feature-flag lifecycle management.

> **Design consideration — feature-flag lifecycle management.** Temporary flags parked in `guild_configs` settings tend to become permanent: over months dozens accumulate and nobody remembers which are still relevant — code becomes an unmaintainable mess of conditionals. A feature-flag registry with expiration dates and automated cleanup (or a dedicated flag service) would keep this table from decaying.

#### [From §23 (Configuration Management)] Roadmap note — repository abstraction for `guild_configs` access.

> **Roadmap note — repository abstraction for `guild_configs` access.** Direct Knex calls against `guild_configs` outside the repository layer should be refactored into `src/db/repositories/` so this table — like every other table — is reached through a single owned abstraction. The cache-invalidation and schema-evolution guarantees above assume all writes flow through the validated path; scattered Knex calls quietly break that assumption. Impact: Low; feasibility: High.

#### [From §23 (Configuration Management)] State Externalization constraint (cross-process state in PG/Redis)

#### [From §23 (Configuration Management)] Effective Config Descriptor (signed, replaces "encrypted license file")

#### [From §24 (Database Architecture)] — Two-Tier Cache with Stampede Protection

- **Intent:** L1 in-process LRU cache, L2 Redis cache, with stampede protection combining distributed lock on true miss (Redis SETNX with short TTL) and probabilistic early refresh.
- **Purpose:** Provide high-performance caching with protection against cache stampede and negative caching.
- Specified. Two-tier cache (L1 in-process LRU, L2 Redis) with stampede protection, negative caching with sentinel value, cross-process invalidation via Redis pub/sub.
- Implemented two-tier cache with both stampede protection mechanisms.

#### [From §24 (Database Architecture)] — Observability (Pino + prom-client + OpenTelemetry, one correlationId)

- **Intent:** Three pillars, one correlationId: logs (Pino child logger pre-bound with correlationId/guildId/userId), metrics (prom-client auto-instrumented), traces (OpenTelemetry, OTLP export).
- **Purpose:** Structured, correlated telemetry.
- Fully Implemented (per docs) — logger-level redaction; unconditional sampling of error traces.
- Maintained; extend with memory metrics.

#### [From §24 (Database Architecture)] — BaseRepository + InsertOnlyRepository

Maintain; ensure no raw Knex outside repos/migrations.

####

> migration #24 clai_authkeys (deprecated, superseded by the clai_operators/clai_authkeys design, §22.10)

#### [From §25 (Caching Architecture)] — `shouldEarlyRecompute` (PER, Unused)

Called by CacheManager.get.

#### [From §28 (Error Management & Fault Tolerance)] Heap Diff Watcher (Layer 1: Detection)

#### [From §28 (Error Management & Fault Tolerance)] Managed Resource Registry (Layer 2: Prevention)

#### [From §28 (Error Management & Fault Tolerance)] Function reference — DbClient (Knex wrapper with circuit breaker + slow query logging):

> **Function reference — DbClient (Knex wrapper with circuit breaker + slow query logging):** Provide a reference for the HTTP client contract. Status: Fully Implemented. Modules call `httpClient.extend({ baseUrl, headers })` then `.get`, `.post`, etc. Framework Core provides circuit breaker, retries, and correlation-ID propagation.; Requirement: Maintain as-is; document the circuit breaker configuration and retry policy. touchpoints: `apps/main/src/http/client.ts`, src/core/http/HttpClient; circuit breaker; retry logic; spec §28.

####

>

#### [From §29 (Job Queue & Scheduling)] — Job Queue (BullMQ + autoscaler + scheduler + DLQ)

Maintain as-is; document the retry policy configuration and dead-letter queue handling.

#### [From §29 (Job Queue & Scheduling)] — QueueManager Worker Lifecycle (pause → finish → close → spawn)

Implemented with dead-letter fallback.

#### [From §33 (Performance & Scalability Engineering)] Design Consideration — Per-Module Volume Mount

#### [From §33 (Performance & Scalability Engineering)] Lease Heartbeat (10s / TTL 30s)

#### [From §33 (Performance & Scalability Engineering)] Fencing Token Generation

#### [From §33 (Performance & Scalability Engineering)] Release Manager DAG Workload Ordering

#### [From §37 (Testing Architecture & QA)] — Per-Layer Coverage Floors (§37.4)

Maintain per-layer floors.

#### [From §38 (Developer Experience & Tooling)] — Scaffolding CLI (pnpm dumby scaffold module)

A working `dumby scaffold module <name>` CLI command that copies the `_template` module, renames it, generates a valid manifest.ts, and creates the directory structure.

#### [From §38 (Developer Experience & Tooling)] — pnpm dumby module validate (proposed CLI)

_template-backed scaffolding.

#### [From §38 (Developer Experience & Tooling)] Design Consideration — `no-direct-interaction-reply` ESLint Rule

#### [From §38 (Developer Experience & Tooling)] Zero-Trust Build Pipeline

####

> ### 38.11 eventsCatalog

####

> Isolation rules and the four sanctioned cross-module patterns complement the import ban: today they are enforced via ESLint (`no-cross-module-relative-import`) at compile time plus manual review; the target adds enforcement at Swastik upload and at runtime (ESM loader restrictions, ).

#### [From §39 (Development Workflow)] — Local Testing Commands (§39.1, §39.3)

Maintain local command set.

#### [From §39 (Development Workflow)] — DI container (Symbol tokens, 3 lifetimes, child containers)

- **Intent:** Dependency injection container registering services including PermissionResolver.
- **Purpose:** All registered DI tokens resolved by their consumers.
- DI container matches spec; PermissionResolver registered, never resolved.
- PermissionResolver resolved and invoked.

#### [From §39 (Development Workflow)] Function reference — 7-Point Architecture Review Checklist (§39.4):

> **Function reference — 7-Point Architecture Review Checklist (§39.4):** (1) Tier Honesty; (2) Three-Layer Rule (no repo logic in command, no business logic in repo); (3) No cross-module reach — only 4 sanctioned patterns (§14.1); (4) Migrations — every migration has working `down`; (5) Eve… Status: Implemented (§39.4) — explicit 7-point checklist. Requirement: Maintain all 7 points; ensure reviewer specifically checks the pre-condition-check pattern for idempotency. touchpoints: §39.4 checklist; §14.1 sanctioned patterns; `eventsCatalog`; `eventBus.emit`; `BaseProcessor` jobs; §37.4 coverage floors.
#### [From §39 (Development Workflow)] BaseProcessor (job processor base class)

#### [From §39 (Development Workflow)] migration up / down

#### [From §40 (CI/CD Pipeline)] Function reference — Core Release Pipeline (Path A):

> **Function reference — Core Release Pipeline (Path A):** Merge → CI (`ci.yml`, §40.1: tsc/ESLint/Prettier/Vitest with coverage) → Staging (`deploy-staging.yml`, §40.3: auto on merge, no human approval) → Production gate (`deploy-production.yml`, §40.4: two distinct human appro… Status: Implemented. Requirement: Maintain the two-approver manual production gate. touchpoints: `ci.yml` (§40.1); `deploy-staging.yml` (§40.3); `deploy-production.yml` (§40.4); Kubernetes rolling update (§33.2); 18-stage bootstrap (§8.2); 9-step graceful shutdown (§9.1).
#### [From §40 (CI/CD Pipeline)] SBOM / Hash Computation

#### [From §40 (CI/CD Pipeline)] Release Manager Complete Release Workflow Sequence

#### [From §40 (CI/CD Pipeline)] — Release Manager State Machine (10 Phases + Terminal States)

- **Intent:** Define the deterministic phase progression for Release Manager releases.
- **Purpose:** Crash-recoverable release pipeline with durable checkpoints.
- Specified — IDLE → PHASE 0: INTAKE → PHASE 1: PREFLIGHT → PHASE 2: BUILD → PHASE 3: ARTIFACT VERIFICATION → PHASE 4: CONFIG AND MIGRATION → PHASE 5: LEASE ACQUISITION → PHASE 6: SWASTIK LOCK → PHASE 7: ROLLOUT → PHASE 8: CANARY VALIDATION → (PASS) PHASE 9: FINALIZE → SUCCESS / (FAIL) PHASE R: ROLLBACK → ROLLED_BACK. Terminal states: ABORTED, FAILED, RECONCILING, NO_OP.
- Implemented state machine with persistent phase checkpoints in PostgreSQL.

#### [From §40 (CI/CD Pipeline)] — Release Manager Fencing Tokens

- **Intent:** Prevent stale Release Manager instances from issuing instructions after crash/restart.
- **Purpose:** Monotonic fencing tokens reject stale instructions.
- Specified — fencing tokens are monotonic, preventing stale instructions. Included in Swastik lock API requests.
- Implemented fencing token generation and validation in Swastik.

#### [From §40 (CI/CD Pipeline)] — Release Manager Configuration & Migration Management

- **Intent:** Validate config, diff against live cluster, run expand-only migrations before rollout.
- **Purpose:** Safe, backward-compatible config and migration changes.
- Specified — config source `dumby/deploy/deploy-config.yaml`, schema validation against Dumby root Zod schema, config diff (target vs live cluster), additive safety (breaking removals require explicit policy approval), expand-only migrations (pre-rollout, compatible with old code), destructive deferral (drops/tightening deferred until stable), advisory lock (exclusive, prevents concurrent runs), migration ledger (applied identifiers recorded in deployment record).
- Fully implemented config and migration management.

#### [From §40 (CI/CD Pipeline)] Source-of-Truth Uploads (TypeScript Only Default)

- Arbitrary compiled JS accepted.
- TypeScript source + manifest.ts + lockfile + migrations + locales + tests; Swastik builds the artifact.

#### [From §40 (CI/CD Pipeline)] Static JavaScript Analysis After Build

- No post-build JS scan.
- Post-build static JS scanner.

#### [From §40 (CI/CD Pipeline)] Trusted Builder (Isolated Build Environment)

- No isolated build step; artifact provenance is not controlled.
- Builder sequence: receive source, verify license, frozen-lockfile install, dependency review, tsc --noEmit, ESLint, Prettier, tests, tsc compile, emit JS+sourcemaps+.d.ts, hash artifact, store immutably.

#### [From §40 (CI/CD Pipeline)] TypeScript-to-JavaScript Compilation Step in Swastik Pipeline

- "Although not spelled out explicitly, this step is mandatory" — implicitly required, not documented as an explicit pipeline stage.
- Explicit compilation stage in Swastik pipeline between validation and staging.

#### [From §40 (CI/CD Pipeline)] Worker-Thread Sandboxing for Untrusted Marketplace Modules

- ABSENT (V2/deferred).
- Per-module worker-thread or VM sandbox with IPC.

#### [From §40 (CI/CD Pipeline)] Build ID as semver + content hash (Integrity Check)

- Deep-Analysis describes buildId as per-version identifier; Design upgrades it to semver+hash.
- Build ID = version + sha256 content hash, recorded in swastik_builds.

#### [From §40 (CI/CD Pipeline)] Build-time `catalog.json` (SBOM-style capability manifest) + CI validation

- Partial — `generate-docs.ts` produces Markdown docs but no unified JSON catalog.
- `catalog.json` emitted and CI-gated.

#### [From §40 (CI/CD Pipeline)] CI/CD build scripts to place first-party modules on the volume

- CI compiles `src/modules` and bakes them into the Docker image.
- `tsc` no longer compiles `src/modules`; the Docker image is purely `src/core` and `src/shared`; CI/CD places first-party modules on the volume or via Swastik upload.

#### [From §40 (CI/CD Pipeline)] Contract declaration artifacts (.d.ts + hashes)

- No contract artifacts emitted.
- .d.ts + contract hashes + compatibility reports stored in registry.

#### [From §40 (CI/CD Pipeline)] SBOM Generation for Module Builds

- No SBOM.
- SBOM per build stored in registry.

**Four-Tier Test Pyramid with MockContainer**

#### [From §40 (CI/CD Pipeline)] — Swastik Hot-Swap (Module Version Upgrade)

- **Intent:** Separate core changes (full pipeline, two approvers, rolling update) from module changes (hot-swap, atomic symlink, auto-rollback) because they have different risk profiles.
- **Purpose:** Core = full release pipeline; Module = atomic symlink promotion with rollback on failure.
- `entry/swastik.ts`: `/internal/reload` (hot-swap via symlink), `/internal/deploy` (full deploy), rollback support, dev registration (`/swastik/developers/register`, `/swastik/developers/me`), upload → `parseManifest` validation → staging dir → symlink promotion → rollback on failure, `writeAudit` for DEVELOPER_REGISTERED/BUILD_STAGED/BUILD_PROMOTED/BUILD_ROLLED_BACK/MODULE_DEPLOYED.
- Maintained; reconcile with the specified revised design (sandbox isolation, health-gated promotion).

#### [From §40 (CI/CD Pipeline)] Design Consideration — Release Manager as a Kubernetes Controller

#### [From §40 (CI/CD Pipeline)] The Release Manager as External Release Actuator

#### [From §40 (CI/CD Pipeline)] Release Manager Least Privilege RBAC

#### [From §40 (CI/CD Pipeline)] Shared Kubernetes Volume as Critical Infrastructure

#### [From §40 (CI/CD Pipeline)] deploy-production.yml two-approver manual gate

#### [From §40 (CI/CD Pipeline)] Release Manager Deploy Request API Endpoints

#### [From §41 (Infrastructure & Deployment)] — ESLint Enforcement (no-restricted-imports, dumby/forbidden-core-import)

- **Intent:** Build-time enforcement preventing modules from importing core routing internals (CommandRouter, Container, etc.) to bypass the official APIs.
- **Purpose:** Block cross-module imports into src/core/ at build time, failing CI if attempted.
- Specified. ESLint rule no-restricted-imports (section 41.4) forbids cross-module imports into src/core/. Custom rule dumby/forbidden-core-import catches bypass attempts. Build fails in CI.
- Maintained and enforced. All cross-module imports into core blocked at build time.

#### [From §41 (Infrastructure & Deployment)] — Tooling-Enforced Boundaries (Constitution vs Policy)

- **Intent:** Encode architectural invariants in tooling (ESLint/tsc gates), not docs that can be ignored.
- **Purpose:** "Constitution vs policy" — good architecture encodes invariants in tooling.
- Five enforced rules: no cross-module imports (ESLint `no-cross-module-relative-import`); no direct DB access from commands (`no-repository-in-command`); no event emission from repositories (`no-event-emit-in-repository`); no unverifiable webhooks (registration-time validation); no unscrubbed secrets in logs (logger-level redaction).
- Maintain all as MUST-level gates (RFC 2119) per `directive.md`.

#### [From §41 (Infrastructure & Deployment)] Function reference — ESLint no-restricted-imports Forbids Cross-Module Core Imports:

> **Function reference — ESLint no-restricted-imports Forbids Cross-Module Core Imports:** Ensure the ESLint rule blocks any attempt to bypass the official APIs. Status: Fully Implemented. The ESLint rule `no-restricted-imports` (§41.4) forbids cross-module imports into `src/core/`. The custom rule `dumby/forbidden-core-import` catches any attempt to bypass the official APIs. The build fails in CI; the PR is blocked. Requirement: Maintain as-is; ensure the ESLint rules cover all core internal modules. touchpoints: .eslintrc (no-restricted-imports rule); custom ESLint plugin dumby/forbidden-core-import; CI pipeline (tsc --noEmit + eslint); spec §41.4.

####

> the third Terraform module `cache` (note: the repo directory is currently named `redis` in `deploy/terraform/modules/redis/`; it must be renamed to `cache` to match the spec, or a documented exception must be recorded)

#### [From §41 (Infrastructure & Deployment)] import / require of manifest (RCE path)

#### [From §41 (Infrastructure & Deployment)] Design consideration — Release Manager–GitHub integration via OIDC.

> **Design consideration — Release Manager–GitHub integration via OIDC.** GitHub Actions should trigger Release Manager deployments (`POST /api/v1/deploy`) using short-lived, secret-free OIDC tokens instead of long-lived Release Manager tokens stored in GitHub secrets: GitHub mints an OIDC token, Release Manager validates it against GitHub's JWKS endpoint and checks repository and environment claims. The two-approver gate is best kept GitHub-native (Environment Protection Rules) with Release Manager holding the deploy record. Impact: High; feasibility: High.

#### [From §41 (Infrastructure & Deployment)] Design consideration — Release Manager implementation language.

> **Design consideration — Release Manager implementation language.** Release Manager is external to Dumby's application runtime, so its language stack is unconstrained by the Node.js/TypeScript requirements of the bot itself. A Go implementation (`cmd/release-manager/main.go`, multi-stage golang-to-scratch Dockerfile) would yield a static binary under 20 MB with ~10-50 ms startup, idiomatic Kubernetes patterns (client-go, controller-runtime, Kubebuilder), SRE affinity, and natural goroutine modeling of the phase machine; Rust (kube-rs, sqlx, redis-rs, axum) is the evaluated alternative. Impact: Medium; feasibility: High.

#### [From §41 (Infrastructure & Deployment)] Roadmap note — custom-metrics autoscaling via KEDA.

> **Roadmap note — custom-metrics autoscaling via KEDA.** The current HPA (`deploy/k8s/base/hpa.yaml`) scales on resource metrics only. A queue-depth-driven alternative — a KEDA `ScaledObject` reacting to BullMQ queue depth and Node event-loop lag — would scale on real backpressure rather than CPU utilization, which poorly represents a gateway-and-queue workload. Impact: Medium; feasibility: Medium.

#### [From §41 (Infrastructure & Deployment)] Design consideration — content-addressed artifact identity.

> **Design consideration — content-addressed artifact identity.** Every artifact Swastik stages should be content-addressed so that "what's running" is always verifiable: the build ID is semver plus a content hash (SHA-256) over the artifact bytes, and storage paths derive from that hash. The bytes behind an ID cannot quietly change without the ID itself changing, giving the deployment pipeline tamper-evidence as an integrity principle rather than an afterthought. Impact: Medium (tamper-evidence); feasibility: High.

#### [From §41 (Infrastructure & Deployment)] Operational review note — verify deploy manifest content, not just structure.

> **Operational review note — verify deploy manifest content, not just structure.** Terraform and Kubernetes manifests have been verified structurally; a content-level review (resource requests, probes, security context, replica counts, secret references) is still owed, and the two audit assets disagree on whether it happened. Reconcile before treating the deploy definitions as canonical. Impact: Medium; feasibility: High.

#### [From §41 (Infrastructure & Deployment)] Roadmap note — `catalog.json` capability manifest.

> **Roadmap note — `catalog.json` capability manifest.** Extend `scripts/generate-docs.ts` to also emit a unified `catalog.json` (SBOM-style capability manifest) and add a CI validation step against it. This gives operators a single machine-readable source of truth for "what is this deployment actually capable of?" and aligns with the explicit-over-implicit principle. Impact: Medium; feasibility: High.

#### [From §41 (Infrastructure & Deployment)] Design consideration — end-to-end deployment flow.

> **Design consideration — end-to-end deployment flow.** The runbook's six-step flow (Terraform apply, kubeconfig, Docker build/push to ECR, `kubectl apply -k`, migrate, verify readiness) should be codified end to end: `deploy-staging.yml` and `deploy-production.yml` already automate the later steps, and the Terraform-output-to-Secret handoff is the least-automated link to close. Impact: Medium; feasibility: High.

#### [From §41 (Infrastructure & Deployment)] Roadmap note — dry-run upload endpoint.

> **Roadmap note — dry-run upload endpoint.** A dry-run variant of the upload endpoint would let developers verify an upload — manifest validation, schema checks, contract checks — without side effects: nothing staged, nothing promoted. Should ship with rate limiting and audit logging. Impact: Medium; feasibility: High.

#### [From §41 (Infrastructure & Deployment)] Roadmap note — detailed upload status API.

> **Roadmap note — detailed upload status API.** Swastik's HTTP API should expose the pipeline's existing stage-level state (validate, stage, promote) so developers can see exactly where an upload succeeded or failed rather than inferring it from logs. Cheap to build because it only surfaces state the pipeline already holds. Impact: Medium; feasibility: High.

#### [From §41 (Infrastructure & Deployment)] Design consideration — volume-mounted module directories.

> **Design consideration — volume-mounted module directories.** Modules can be decoupled from the container image entirely by mounting an `emptyDir` or PersistentVolumeClaim at the module directories; the module loader reads whatever files are present on disk, so the framework needs no special support — this is a standard Kubernetes feature. CI/CD writes compiled modules to the volume and triggers the reload API. Best suited to frequent module updates; note the partial-write risk during copies. Impact: Medium; feasibility: High.

#### [From §41 (Infrastructure & Deployment)] Design consideration — sidecar/init-container module writer.

> **Design consideration — sidecar/init-container module writer.** CI/CD can write the compiled module directly to the mounted volume through a sidecar or init container, with the main bot reading the directory and the reload API triggering the swap — permanently bypassing Docker image rebuilds for module changes. Pairs naturally with the hybrid core/module split above. Impact: Medium; feasibility: High.

#### [From §41 (Infrastructure & Deployment)] Design consideration — multi-tenancy via per-namespace module volumes.

> **Design consideration — multi-tenancy via per-namespace module volumes.** All pods currently run the same module set. A roadmap direction is namespace-scoped PVCs so that Pod A mounts `vol-a` (Moderation) while Pod B mounts `vol-b` (Economy) from the same core image — same framework, different module sets per tenant. This is the "holy grail" multi-tenancy posture, but it requires the volume-mount module delivery model to be adopted first. Impact: High; feasibility: Low (V2).

#### [From §41 (Infrastructure & Deployment)] Roadmap note — Swastik as a separately deployed service.

> **Roadmap note — Swastik as a separately deployed service.** The specification places Swastik in its own process with an upload API, a Kubernetes volume, and a reload API; the current entry point still lives in the monolith (`entry/swastik.ts`). Completing the extraction is what makes the control-plane topology described here real: module delivery and promotion must remain reachable when the bot process is down. Impact: High; feasibility: Medium.

#### [From §41 (Infrastructure & Deployment)] Design consideration — hybrid immutable core + mutable modules.

> **Design consideration — hybrid immutable core + mutable modules.** Separate the deployment paths of the two code layers: the core codebase (`src/core/`) ships via standard CI/CD (Docker image rebuild plus Kubernetes rolling update — zero-downtime but a full restart), while modules (`src/modules/`) live on a persistent volume and update through the reload API with no restart, surviving pod crashes via the PVC. A `pnpm build:module` script (not yet present) would compile modules and copy them to the volume. This is the production-grade pattern used by established plugin systems. Impact: High; feasibility: Medium.

#### [From §41 (Infrastructure & Deployment)] — Terraform Module Composition (database / redis / kubernetes)

Compose in environment roots.

#### [From §43 (Troubleshooting & Operational Runbooks)] Documentation practice — cross-reference design sections and runbooks.

> **Documentation practice — cross-reference design sections and runbooks.** Every failure mode described in a design section should carry a pointer to its matching recovery runbook, and every runbook should point back to the design section that explains the failure. Canonical form: "See §8.2 Stage 06 for migration failure diagnosis; for recovery, see §43.1 Runbook: Startup Failure." A failure mode documented in the design but not in the runbook delays diagnosis during an incident — the design says why, the runbook says what to do, and neither should be found without the other. Impact: Medium; feasibility: High.

#### [From §43 (Troubleshooting & Operational Runbooks)] Roadmap note — human-readable remediation notes in rejections.

> **Roadmap note — human-readable remediation notes in rejections.** Validation rejections should carry structured, human-readable remediation guidance — what failed, which field, and how to fix it — rather than a generic error. Improves developer success without weakening validation, and shortens the path from a Stage 11/12 rejection to the fix this runbook walks through. Impact: Medium; feasibility: High.

#### [From §43 (Troubleshooting & Operational Runbooks)] Design consideration — shift-left error detection.

> **Design consideration — shift-left error detection.** Every failure this runbook diagnoses is one that could have been caught earlier: contract drift, undeclared events, config mismatches, and bad migrations are all detectable at upload/validate time, with local reproducibility, instead of at 3 AM via a failed startup. The local validator and upload-time checks are the mechanism; this runbook is the backstop, not the front line. Impact: Medium; feasibility: High.

#### [From §43 (Troubleshooting & Operational Runbooks)] Roadmap note — machine-readable error taxonomy.

> **Roadmap note — machine-readable error taxonomy.** The framework's error responses should come from a defined, machine-readable taxonomy (e.g., `SWASTIK_MANIFEST_INVALID` with `field: "tier"`) instead of opaque failure strings, so triage of error-rate incidents like the one above can be automated rather than inferred from logs. Impact: Medium; feasibility: High.

#### [From §43 (Troubleshooting & Operational Runbooks)] — Golden Image Principle (Immutable Container Images)

- **Intent:** In production, the container image should be immutable — a single, versioned artifact that represents exactly what is running.
- **Purpose:** Maintain immutable container images as the source of truth for production deployments.
- The CI/CD pipeline (section 43.4) builds versioned Docker images. The principle is documented but can be violated by volume-mounting core files.
- Immutable images enforced — core files never mounted as writable volumes; CI/CD pipeline is the sole path for core changes.

#### [From §43 (Troubleshooting & Operational Runbooks)] Terraform environment root `main.tf` files are unwritten placeholders

- `deploy/terraform/environments/{staging,production}/` are "reserved placeholders" — README says "provider credentials are supplied by operators." No `.tf` content beyond placeholder. The runbook itself supplies an example `main.tf` for the reader to write.
- Working `main.tf` per environment invoking `module "database"`, `module "redis"`, `module "kubernetes"` with variables for vpc_id, subnet_ids, sg ids, and an S3 backend with DynamoDB locking.

#### [From §43 (Troubleshooting & Operational Runbooks)] dumby-secrets Kubernetes Secret not in repo

- The base manifests read env from ConfigMap `dumby-config` (defined) and Secret `dumby-secrets` (NOT in repo). The runbook gives a manual `kubectl create secret generic dumby-secrets --from-literal=...` command with dev placeholder values.
- Either (a) an ExternalSecrets/sealed-secrets manifest that creates dumby-secrets, or (b) a documented `kubectl create secret` command in the runbook.

#### [From §43 (Troubleshooting & Operational Runbooks)] Advanced-scaling infrastructure (custom-metrics HPA, PgBouncer, spot instances, read-replica routing)

- HPA is basic (CPU/memory); no custom-metrics pipeline, no PgBouncer, no spot handling, read-replica routing declared but implementation unknown.
- Custom-metrics HPA, PgBouncer config, read-replica routing logic, optional spot support.

#### [From §43 (Troubleshooting & Operational Runbooks)] Container securityContext / fsGroup for non-root access

- ABSENT — no documented `securityContext`/`fsGroup` tuning for the module volume.
- Pod `securityContext.fsGroup` set to a group owning `/mnt/modules`; bot container has read/execute; Swastik staging area writable.

#### [From §43 (Troubleshooting & Operational Runbooks)] Local-Cluster Postgres+Redis K8s Manifest

- K8s base manifests have no Postgres/Redis Deployment/Service resources.
- Add StatefulSet or Deployment + Service for Postgres 16 and Redis 7 in a local-dev overlay or base.

#### [From §43 (Troubleshooting & Operational Runbooks)] PgBouncer connection pool multiplexing

- DbClient uses Knex pooling; docker-compose exists; no PgBouncer config file.
- PgBouncer sidecar in compose + K8s, or transaction-pooling config.

#### [From §43 (Troubleshooting & Operational Runbooks)] Read-replica active routing logic

- DbClient has pool config, statement/critical thresholds; "read replica configuration supported" but no active routing.
- Knex read-replica pool with read/write splitting for `SELECT` queries.

### Open items

- **[From 1.2.1]** Path

`entry/worker.ts` currently calls the same `bootstrap` as `entry/main.ts`, including Discord login stages. A dedicated worker-only bootstrap path should skip Stages 15–16 (DISCORD_LOGIN / CLIENT_READY) via a worker-mode flag, enabling conditional stage execution. This is documented as a fast-follow and must be implemented to avoid unnecessary Discord gateway connections for worker processes. (owner: framework maintainers; Requirement: next minor version)
- **[From 2.2.1]** tion

Two Docker Compose files exist: `apps/main/docker-compose.yml` (canonical, 4 services) and `apps/main/docker/docker-compose.yml` (a wrapper using the Docker Compose v2 include directive). To avoid confusion, either consolidate to a single compose file or add a header comment in the wrapper explaining the include relationship and pointing to the canonical file. (owner: framework maintainers; Requirement: next minor version)
- **[From §22.5]** Replace the entry/clai.ts SSH server (ssh2 library) with the specified ssh2-based SSH server with public-key auth against the clai_operators/clai_authkeys tables; the plaintext REPL is insecure-by-design and must not be described as hardened. (owner: framework maintainers; Requirement: next minor version)

### Integrated-content provenance

Content merged from the former Extended Reference was renumbered into the host sections listed below (original numbering → current numbering):

- Extended Reference §48: 48.1 → §11.7
- Extended Reference §48: 48.2 → §11.8
- Extended Reference §48: 48.3 → §11.9
- Extended Reference §48: 48.4 → §11.10
- Extended Reference §48: 48.5 → §11.11
- Extended Reference §48: 48.6 → §11.12
- Extended Reference §48: 48.7 → §11.13
- Extended Reference §48: 48.8 → §11.14
- Extended Reference §48: 48.9 → §11.15
- Extended Reference §94: 94.1 → §11.16
- Extended Reference §94: 94.2 → §11.17
- Extended Reference §94: 94.3 → §11.18
- Extended Reference §94: 94.4 → §11.19
- Extended Reference §92: 92.1 → §12.12
- Extended Reference §92: 92.2 → §12.13
- Extended Reference §92: 92.3 → §12.14
- Extended Reference §92: 92.4 → §12.15
- Extended Reference §92: 92.5 → §12.16
- Extended Reference §92: 92.6 → §12.17
- Extended Reference §92: 92.7 → §12.18
- Extended Reference §92: 92.8 → §12.19
- Extended Reference §91: 91.1 → §24.7
- Extended Reference §91: 91.2 → §24.8
- Extended Reference §91: 91.3 → §24.9
- Extended Reference §91: 91.4 → §24.10
- Extended Reference §91: 91.5 → §24.11
- Extended Reference §53: 53.1 → §28.7
- Extended Reference §53: 53.2 → §28.8
- Extended Reference §53: 53.3 → §28.9
- Extended Reference §53: 53.4 → §28.10
- Extended Reference §95: 95.1 → §28.11
- Extended Reference §95: 95.2 → §28.12
- Extended Reference §95: 95.3 → §28.13
- Extended Reference §95: 95.4 → §28.14
- Extended Reference §95: 95.5 → §28.15
- Extended Reference §95: 95.6 → §28.16
- Extended Reference §96: 96.1 → §32.8
- Extended Reference §96: 96.2 → §32.9
- Extended Reference §96: 96.3 → §32.10
- Extended Reference §96: 96.4 → §32.11
- Extended Reference §68: 68.1 → §39.5
- Extended Reference §68: 68.2 → §39.6
- Extended Reference §68: 68.3 → §39.7
- Extended Reference §68: 68.4 → §39.8
- Extended Reference §68: 68.5 → §39.9
- Extended Reference §93: 93.1 → §48.6
- Extended Reference §93: 93.2 → §48.7
- Extended Reference §93: 93.3 → §48.8
- Extended Reference §93: 93.4 → §48.9

### Badge accuracy note

Section badges are set to [SPEC] uniformly in this edition because per-section verification against the repository requires a maintainer evidence pass. Any upgrade of a section badge to [PROTO]/[IMPL]/[TESTED]/[DEPLOYED] must cite the audit entry and repository evidence that justifies it.

## Colophon

This reference was assembled section by section as a complete, standalone
engineering document — every mechanism specified to the level of purpose, structure,
execution flow, failure behavior, and the reasoning behind its non-obvious choices,
with cross-references throughout so any single section can be read on its own without
losing the thread back to the rest of the system. Where a design choice carries a
trade-off, that trade-off is stated explicitly rather than left implicit; where a
capability is deliberately narrower than it could be (the module catalog's
index-depth treatment, §36.1; the monetization scaffold's deliberate emptiness, §7.6),
the narrowness is itself documented as a decision, not an omission.

This 5.0.0 edition is a consolidated re-baseline: it states the system the v5.0
rollout will ship — the Renderer, the tier volumes, the license machine, the
Compatibility Ledger, and the Layer 6/7 permission model — as normative
specification, with implementation status carried honestly by the per-section
badges and the Audit Register rather than by prose. The three source request
records behind the re-baseline are registered frozen under docs/ur/, and the
decisions that traded one good against another are recorded as ADR-001…ADR-011
(docs/adr/).

A reader who takes nothing else from this document should take the shape underneath
§0.4's opening diagram: one unified core enforcing consistency, one strict module
contract enforcing isolation, and a deliberate, load-bearing wall between the two that
every other mechanism in this reference — from the bootstrap sequence to the
permission engine to the deployment pipeline — exists to keep intact as the system
grows from its first module to its hundredth.
