# DUMBY FRAMEWORK
## Complete Engineering & Implementation Reference

```
Document Class    : Independent Engineering Reference & Developer Blueprint
Subject System    : Dumby — Discord Unified Modular Bot System
Derived From      : Full architectural analysis of the Dumby v4.5.0 design specification
Stack             : TypeScript (strict) · Node.js LTS ≥ 22 · discord.js v14 ·
                     PostgreSQL · Redis · BullMQ · Fastify · Pino/Prometheus/OpenTelemetry
Document Form     : Architecture, behavior, and contract reference — no compiled
                     source code shipped; every mechanism is specified to the level
                     of what it must do and how it must behave
Intended Readers  : Framework maintainers · module authors · platform/SRE operators ·
                     engineering leads evaluating the architecture
Structure         : 9 Parts · 48 Sections · Appendices
```

---

## PART 0 — ORIENTATION

### 0.1 What This Document Is

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

### 0.2 How To Read This Reference

Three reader profiles recur throughout; each has a different honest entry point.

```
READER PROFILE            PRIMARY INTEREST                    START AT
─────────────────────────────────────────────────────────────────────────
Module author              "How do I ship one feature safely   Part III (§11–§12),
                             without learning the whole system?" then Part IV (§17–§21)

Platform / SRE operator     "How do I run this in production,   Part II (§8–§9),
                             scale it, and not get paged at 3am?" Part VI, Part VIII

Framework maintainer /      "How does the whole system fit       Front to back —
architecture reviewer       together, and why these choices?"    Parts I → IX in order
```

A module author who only ever reads §11 (Module Anatomy), §12 (Worked Example), §17
(Command Framework), and §21 (Permission Engine) has enough to ship a correct,
well-behaved module. A single-server operator running one process, one database, and
no active/standby redundancy should read Part I for the architecture and can safely
defer the two-approver release gate (§40.4) and on-call assumptions (§43) until — if
ever — the deployment grows into needing them; §41.6's cloud-provider reference table
states plainly which infrastructure tier corresponds to which audience.

### 0.3 Concept Index — Industry Vocabulary → Section Reference

A reader arriving with general backend vocabulary rather than Dumby-specific terms
gets the fastest path to the right section here.

```
CONCEPT LOOKUP TABLE

Middleware / interceptor chain .......... §19  (Middleware Pipeline)
Dependency injection / IoC container ..... §10  (DI & Service Container)
Connection pooling ........................ §24.2 (Why PostgreSQL / pooling)
Background job processing ................. §29  (Job Queue & Scheduling)
Observability (logs/metrics/traces) ....... §27  (Observability)
Process-level configuration ................ §23.1 (Configuration Scopes)
Per-tenant (per-guild) configuration ....... §23.3 (Guild Configuration)
Caching layer / cache-aside ................ §25  (Caching Architecture)
Rate limiting & cooldowns .................. §21.5 (Rate Limiting)
Internal pub/sub event bus ................. §18  (Event Architecture)
UI component / interaction routing ......... §20  (Interaction & Components)
Repository / data-access layer ............. §24.3 (Repository Pattern)
Schema migrations .......................... §24.4 (Migrations)
Horizontal scaling / stateless processes ... §26  (State Externalization)
Security hardening & threat model .......... §32  (Security Architecture)
Capacity planning & SLOs ................... §33  (Performance Engineering)
Regulatory / privacy compliance ............ §34  (Privacy & Compliance)
Startup / shutdown lifecycle ............... §8–§9 (Bootstrap & Shutdown)
Admin web dashboard ........................ §16.4 (MDIS)
Plugin marketplace .......................... §16  (Marketplace & Extension)
Testing strategy ........................... §37  (Testing Architecture)
CI/CD & infrastructure-as-code .............. §40–§41 (CI/CD, Infra & Deployment)
Linting / formatting / commit discipline .... §38  (Developer Experience)
Plugin / module architecture ............... §11, §13 (Module Anatomy, Tiers)
Cross-module contracts ...................... §14  (Inter-Module Communication)
Command routing ............................ §17  (Command Framework)
Runtime & language choice .................. §5   (Technology Stack)
Discord SDK / gateway integration ........... §5.3, §17, §20
Design philosophy / first principles ........ §1–§3 (Foundations)
Role-based access control (RBAC) ........... §21.3–§21.7 (RBAC, Groups, Grants)
Global administrative override .............. §22  (Power Engine Panel)
Operator terminal / break-glass access ...... §22.5–§22.7 (CLAI)
Multiple bot identities / voice capacity .... §35  (Twill & Personas)
Hot reload / zero-downtime deploy ........... §15  (Swastik)
```

### 0.4 System-at-a-Glance

```
FIGURE 0-A — DUMBY IN ONE DIAGRAM

  ┌───────────────────────────────────────────────────────────────────┐
  │                        DISCORD PLATFORM                            │
  │        (Gateway WebSocket · REST API · Interactions API)          │
  └──────────────────────────────┬────────────────────────────────────┘
                                  │  one connection per shard
  ┌──────────────────────────────▼────────────────────────────────────┐
  │  APPLICATION CORE  — the "Unified" half of the doctrine            │
  │                                                                     │
  │   Bootstrap → DI Container → Event Router → Command Router         │
  │   Middleware Pipeline → Permission Engine → Config Manager         │
  │   Cache Manager → Database Manager → Job Queue → HTTP Server       │
  │                                                                     │
  │   Exactly one instance of each of the above per process. No        │
  │   module ever constructs its own copy of any core service.         │
  └──────────────────────────────┬────────────────────────────────────┘
                                  │  loaded through the Module Registry,
                                  │  every seam typed and declared
  ┌──────────────────────────────▼────────────────────────────────────┐
  │  MODULE LAYER  — the "Modular" half of the doctrine                 │
  │                                                                     │
  │   N independently-owned vertical slices, each with its own          │
  │   commands, events, services, repositories, jobs, migrations,       │
  │   locales, and tests — visible to each other only through what      │
  │   each module's manifest explicitly publishes.                      │
  └───────────────────────────────────────────────────────────────────┘
                                  │
  ┌──────────────────────────────▼────────────────────────────────────┐
  │  EXTERNALIZED STATE  — PostgreSQL (system of record) + Redis        │
  │  (acceleration & coordination). No cross-process state lives        │
  │  anywhere else, ever (§26.1).                                        │
  └───────────────────────────────────────────────────────────────────┘

  Parallel, separately-deployed control-plane services (never modules,
  never part of the gateway-connected process):
    • Power Engine Panel (PEP)  — global administrative authority (§22)
    • CLAI                      — SSH-hosted operator terminal (§22.5)
    • Swastik                   — deployment / hot-reload / hot-swap (§15)
    • Credentials Service       — shared credential issuance (§22.7)
    • Persona processes         — additional bot identities (§35)
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

# PART I — FOUNDATIONS & PHILOSOPHY

---

## 1. What Dumby Is

### 1.1 Definition

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

  ✗  A hidden config table only core code can write to
  ✗  A privileged import path bypassing the DI container
  ✗  An admin command implemented as inline framework code instead of a module
  ✗  A framework-only database connection that ignores repository ownership rules
  ✓  Every one of the above is expressed instead as: a module, a manifest, a
     declared dependency, a typed service contract
```

### 1.3 Vision & Mission

**Vision.** A guild's bot should present as one coherent product with one settings
surface — never a federation of plugins an operator has to remember six unrelated
environment variables for. The engineering team behind it, meanwhile, should
experience a set of independently-shippable codebases that never block on each other,
never break each other, and can each be rewritten from zero without anyone else
noticing.

**Mission.** Provide a TypeScript framework in which shipping the fortieth feature is
exactly as safe, fast, and well-tested as shipping the first — by making isolation,
typed contracts, and observability the default path, not something a disciplined team
must remember to bolt on.

### 1.4 Design Pillars

```
TABLE 1-A — The Seven Design Pillars

┌────────────────────────────┬──────────────────────────────────────────────┐
│ Pillar                     │ What it means in practice                     │
├────────────────────────────┼──────────────────────────────────────────────┤
│ Module Sovereignty         │ A module owns its commands, tables, jobs, and │
│                            │ config schema outright. Nothing outside it    │
│                            │ reaches into that state without a declared,   │
│                            │ typed interface.                              │
├────────────────────────────┼──────────────────────────────────────────────┤
│ Contract Over Convention   │ Cross-module interaction happens through      │
│                            │ manifests, typed DI tokens, and a documented  │
│                            │ event catalog — never by importing another    │
│                            │ module's files or guessing its table names.   │
├────────────────────────────┼──────────────────────────────────────────────┤
│ Fail Fast, Degrade         │ Misconfiguration is caught at boot; the       │
│ Gracefully                 │ process refuses to start half-broken. Once    │
│                            │ live, one module's failure degrades only     │
│                            │ the capability it owned — never cascades.    │
├────────────────────────────┼──────────────────────────────────────────────┤
│ Observability By Default   │ Every command, job, and lifecycle transition  │
│                            │ emits structured logs, metrics, and trace     │
│                            │ spans without hand-written instrumentation.   │
├────────────────────────────┼──────────────────────────────────────────────┤
│ One Operational Surface    │ One Dockerfile, one health endpoint, one      │
│                            │ metrics endpoint, one config loader, one      │
│                            │ migration runner — regardless of module      │
│                            │ count.                                        │
├────────────────────────────┼──────────────────────────────────────────────┤
│ TypeScript as Design       │ The module contract, DI container, event bus, │
│ Material                   │ and command interface are defined so a whole  │
│                            │ class of integration bug is rejected at       │
│                            │ compile time, before a test even runs.        │
├────────────────────────────┼──────────────────────────────────────────────┤
│ Progressive Disclosure     │ A first command touches one file, one         │
│                            │ interface. A stateful, job-scheduling,        │
│                            │ cache-backed module has the whole framework   │
│                            │ available — nothing forced on the simple      │
│                            │ case.                                         │
└────────────────────────────┴──────────────────────────────────────────────┘
```

### 1.5 Explicit Non-Identity — What Dumby Is Not

- **Not a no-code bot builder.** Dumby is a code-first framework for engineers writing
  TypeScript modules. A module *can* expose a no-code-style configuration panel to
  guild admins via MDIS (§16.4), but authoring a module itself is not no-code.
- **Not a single-file script.** There is no supported mode where Dumby runs as one flat
  entry file. The module boundary is structural, not a style preference.
- **Not a generic "everything" clone.** Dumby does not ship every conceivable feature
  pre-enabled for every guild; the Standard-tier catalog is curated and every module is
  independently disableable.
- **Not a multi-framework abstraction layer.** Dumby commits to one Discord integration
  library (§5.3) and uses its types and event model directly rather than hiding behind
  a lowest-common-denominator wrapper.
- **Not a SaaS product.** Dumby is a self-hostable framework. Nothing in this reference
  assumes a specific commercial hosting arrangement.

### 1.6 Who This Is For

```
TABLE 1-B — Audience → Fit

┌─────────────────────┬───────────────────────────────────────────────────┐
│ Audience             │ Why Dumby's shape fits them                        │
├─────────────────────┼───────────────────────────────────────────────────┤
│ Platform teams       │ Running across hundreds to tens of thousands of    │
│                       │ guilds; need per-guild toggles, predictable       │
│                       │ scaling, and a boundary letting many engineers     │
│                       │ ship in parallel without collisions.               │
├─────────────────────┼───────────────────────────────────────────────────┤
│ Module authors        │ Internal or third-party; want to build one        │
│ (internal/third-party) │ well-scoped feature without learning every other │
│                       │ module already loaded.                             │
├─────────────────────┼───────────────────────────────────────────────────┤
│ Single-server         │ Start with a handful of Standard modules and grow  │
│ operators             │ into a fully-loaded deployment without ever        │
│                       │ hitting an architectural wall that forces a       │
│                       │ rewrite.                                           │
└─────────────────────┴───────────────────────────────────────────────────┘
```

---

## 2. The Unified + Modular Doctrine

### 2.1 Two Failure Modes This Architecture Refuses Simultaneously

Every bot architecture lands somewhere between two failure modes. Dumby's entire
design reads as a simultaneous refusal of both endpoints — not a balance point between
them, but a structure that rules both out by construction.

```
FIGURE 2-A — The Failure-Mode Spectrum Dumby Refuses

  FAILURE MODE A                DUMBY'S POSITION              FAILURE MODE B
  "The Monolith"           (Application Core enforces    "The Plugin Federation"
  Unified, not Modular      unification; Module Contract   Modular, not Unified
                            enforces isolation — both,
                            simultaneously, by tooling)

  One giant command         One coherent runtime,          A core that does
  handler; every file       every feature a self-          almost nothing but
  imports every other       contained module with a        load a folder of
  file and a shared         declared contract, sharing     "plugins," each
  db.ts. Fast to start;     the same DI container,         reimplementing its
  by feature thirty every   permission engine, and event   own DB connection,
  PR risks breaking         bus — but never reaching        config loading, and
  something unrelated.      into another module's          logger differently.
  No feature can be         internals directly.             Looks modular on a
  disabled without a code                                   directory listing;
  change and redeploy.                                      no consistent
                                                             permission model
                                                             across "plugins."
```

### 2.2 Multipurpose Bot vs. Dumby — Structural Comparison

```
TABLE 2-A — Structural Comparison

┌────────────────────────────┬────────────────────────────┬─────────────────────────────┐
│ Dimension                  │ Typical Multipurpose Bot    │ Dumby                        │
├────────────────────────────┼────────────────────────────┼─────────────────────────────┤
│ Unit of organization        │ Commands grouped by folder  │ Modules — self-contained    │
│                             │ convention only              │ vertical slices owning      │
│                             │                              │ commands, events, services, │
│                             │                              │ data, and config together   │
├────────────────────────────┼────────────────────────────┼─────────────────────────────┤
│ Inter-feature boundary       │ None enforced; any file      │ Enforced at the manifest    │
│                             │ imports any other file       │ level; cross-module access  │
│                             │                              │ requires a declared token    │
│                             │                              │ or event subscription        │
├────────────────────────────┼────────────────────────────┼─────────────────────────────┤
│ Disabling a feature          │ Comment out code, redeploy   │ One per-guild state flip,   │
│                             │                              │ no code change, no redeploy  │
├────────────────────────────┼────────────────────────────┼─────────────────────────────┤
│ Database ownership           │ One shared schema; any       │ Each module owns its tables │
│                             │ command queries any table    │ exclusively                 │
├────────────────────────────┼────────────────────────────┼─────────────────────────────┤
│ Parallel engineering          │ High collision risk on       │ Zero collision risk —       │
│                             │ shared files                 │ modules share no files       │
├────────────────────────────┼────────────────────────────┼─────────────────────────────┤
│ Failure blast radius         │ One feature's bug can crash  │ Per-handler isolation; a     │
│                             │ the whole process             │ failed module disables      │
│                             │                              │ itself alone                │
├────────────────────────────┼────────────────────────────┼─────────────────────────────┤
│ Permission model              │ Re-implemented per command,  │ One seven-layer resolver,   │
│                             │ inconsistently                │ one source of truth (§21)   │
└────────────────────────────┴────────────────────────────┴─────────────────────────────┘
```

### 2.3 Why "Unified" Specifically Matters as Module Count Grows

The unification half of the doctrine is what keeps the system coherent as module count
grows from five to fifty. Without it, a "modular" system quietly re-fragments: module
1 picks one logger, module 2 calls a raw console output, module 3 builds its own
settings command because it never discovered a settings module already existed.
Dumby prevents this through structure rather than a style guide: the only logger a
module can obtain is the one the DI container hands it at load time; the only way to
persist per-guild configuration is through the guild-settings surface's declared
service, because no module is ever handed a raw, ungoverned database handle for that
purpose. Unification here is not a request for consistency — it removes the
alternative entirely.

## 3. Engineering Principles (P1–P14)

These are the standing rules every part of the system — core and module alike — is
designed against. Later sections cite these by number whenever a specific
architectural choice traces back to one of them; treat this section as the constitution
the rest of the reference is case law for.

```
P1  — EXPLICIT OVER IMPLICIT
      Nothing is auto-detected by filename magic where a manifest field could say
      it explicitly. A command is a command because the manifest lists it, not
      because it lives in a folder named commands/. The manifest is a complete
      table of contents for a module without opening a second file.

P2  — MODULE SOVEREIGNTY
      A module's tables, internal services, and private state belong to it alone.
      Other modules — and the core — interact with them only through what the
      manifest explicitly provides. Enforced by lint rule (no cross-module
      relative imports) and by the repository pattern, which makes a direct query
      against another module's table structurally awkward to even attempt.

P3  — SINGLE RESPONSIBILITY AT EVERY LAYER
      Not just "a module does one thing" — a command class only routes and
      validates, a service only holds business logic, a repository only talks to
      the database. This layering is uniform across every module regardless of
      size, which is what makes jumping into an unfamiliar module fast.

P4  — FAIL FAST AT STARTUP, RECOVER GRACEFULLY AT RUNTIME
      Every config value, manifest, and dependency edge is validated before the
      gateway connection opens. A bad value exits the process with a specific,
      actionable error. Once healthy, a transient failure is retried and
      contained — never allowed to crash the whole process if it can be
      isolated.

P5  — OBSERVABILITY IS NOT OPTIONAL
      A module author cannot ship a command without it automatically getting a
      trace span, a duration metric, and structured log entries on entry,
      success, and failure — wired into the command router and job processor
      base classes, never left to per-module discipline (§27).

P6  — OPEN FOR EXTENSION, CLOSED FOR MODIFICATION
      Extending the system means writing a new module or subscribing to an
      existing event. It never means editing the core or another module's
      source. The Marketplace tier (§16) and the documented event catalog (§18)
      exist specifically so "the bot needs one more thing" never requires a
      core pull request.

P7  — SECURITY BY DEFAULT
      The permission engine defaults to deny. A new command with no explicit
      permission declaration is reachable by nobody but the bot owner until a
      permission is set. Secrets are never logged (enforced by the structured
      logger's redaction list, §27.2). A module cannot request intents or
      permissions beyond what its manifest declares.

P8  — TEST IN ISOLATION, DEPLOY WITH CONFIDENCE
      Because every module declares dependencies through DI tokens rather than
      importing concrete classes, every unit test substitutes mocks for those
      tokens with no real database or Discord connection. Integration tests then
      verify the seams (§37).

P9  — CONFIGURATION WITHOUT CODE
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

## 4. Non-Goals & Explicit Boundaries

Naming what this framework will not try to solve is as load-bearing as naming what it
does. Each boundary below is a deliberate scope decision, not an item deferred to a
future version.

```
TABLE 4-A — Non-Goals and Their Rationale

┌───────────────────────────────┬───────────────────────────────────────────────┐
│ Non-Goal                       │ Rationale                                      │
├───────────────────────────────┼───────────────────────────────────────────────┤
│ Text-prefix commands           │ Slash commands, user-context menus, and        │
│                                │ message-context menus are the complete         │
│                                │ interaction surface. A module may scan message │
│                                │ content for a declared, legitimate purpose but │
│                                │ may never parse a leading token out of that    │
│                                │ content and dispatch it as a simulated prefix   │
│                                │ command — there is no loophole version of this │
│                                │ non-goal; review treats a module found doing   │
│                                │ this as a rejected submission (§16.5), not a   │
│                                │ style note.                                    │
├───────────────────────────────┼───────────────────────────────────────────────┤
│ General message-content        │ The framework does not hold a broad           │
│ scanning                       │ message-content grant for general parsing.     │
│                                │ A module needing content for a specific,       │
│                                │ documented purpose declares the intent          │
│                                │ explicitly and its use is flagged in manifest   │
│                                │ review.                                        │
├───────────────────────────────┼───────────────────────────────────────────────┤
│ A shipped, built-in web UI     │ MDIS (§16.4) is a schema-driven contract a      │
│                                │ module declares against; the framework ships    │
│                                │ the rendering contract and a generic renderer,  │
│                                │ never a pre-built React/Vue application on top  │
│                                │ of it.                                          │
├───────────────────────────────┼───────────────────────────────────────────────┤
│ A real-time collaboration      │ Dumby processes Discord interactions. It is not │
│ platform                       │ a general-purpose WebSocket server or a         │
│                                │ low-latency collaborative-editing backend.      │
├───────────────────────────────┼───────────────────────────────────────────────┤
│ A code generator as core       │ The scaffolding CLI (§38.1) is developer         │
│ functionality                  │ convenience, not core functionality — the       │
│                                │ framework behaves identically whether a module  │
│                                │ was scaffolded or hand-authored.                │
├───────────────────────────────┼───────────────────────────────────────────────┤
│ A "zero-config" system          │ An explicit manifest per module, explicit DI    │
│                                │ token declarations, and explicit migration      │
│                                │ files are required (P1). This trades a slightly │
│                                │ higher authoring cost for dramatically lower    │
│                                │ operational surprise at runtime.                │
├───────────────────────────────┼───────────────────────────────────────────────┤
│ A replacement for               │ Dumby runs inside infrastructure — PostgreSQL, │
│ infrastructure                 │ Redis, a container orchestrator. It requires    │
│                                │ these; it does not abstract or provide them.    │
│                                │ The Terraform and Kubernetes references (§41)   │
│                                │ describe a reference deployment, not a built-in │
│                                │ provisioning system.                            │
├───────────────────────────────┼───────────────────────────────────────────────┤
│ A microservices architecture    │ One deployable application, one process        │
│                                │ boundary per shard group — not a constellation │
│                                │ of independently deployed services. Modules     │
│                                │ isolate through code-level contracts (§14) and  │
│                                │ in-process tooling (§11.5), never through       │
│                                │ separate deployments or network calls between   │
│                                │ modules. The Power Engine Panel and CLAI (§22)  │
│                                │ are a narrow, named exception — operator-facing │
│                                │ control-plane tooling outside the               │
│                                │ feature-and-module system entirely, in the same │
│                                │ category as the database and cache the         │
│                                │ application already depends on, not a pattern   │
│                                │ this non-goal invites modules to imitate.       │
└───────────────────────────────┴───────────────────────────────────────────────┘
```

**Why boundaries are specified this precisely.** A framework that states "we don't do
X" without stating the exact shape of X invites a module author to reach the same
outcome through a side door — a message-content scanner that simulates prefix commands
technically avoids "the framework ships a prefix-command parser" while recreating
everything that non-goal exists to prevent. Every non-goal above is stated at the level
of the *outcome* it forbids, not merely the mechanism, specifically to close that kind
of loophole.

# PART II — CORE ARCHITECTURE

---

## 5. Technology Stack & Decision Rationale

Every technology choice below is stated explicitly and justified; a team adopting this
architecture substitutes none of them without documenting why in the same style as this
section.

### 5.1 Runtime — Node.js LTS ≥ 22

Node's event-driven, non-blocking I/O model maps naturally onto an interaction-driven
workload: the process is almost always waiting on I/O (Discord gateway, database,
cache) rather than doing CPU-bound work. LTS releases guarantee a defined active
support window aligned with the framework's own version policy. Node 22 is the floor
specifically for native `fetch`, structured-clone support, and stable top-level
`await` in ESM — all load-bearing for the bootstrap and module-loading design in §8.

### 5.2 Language — TypeScript, Strict Mode, Non-Negotiable

Strict mode (`"strict": true`, plus `"exactOptionalPropertyTypes": true` and
`"noUncheckedIndexedAccess": true`) is enforced project-wide as the production stack,
not a future option. The manifest schema, the DI container, the command class
interface, the event catalog, and the repository layer are all defined using types and
generics specifically so the compiler catches integration bugs at authoring time rather
than at runtime. No JavaScript source ships; `tsc` is a mandatory, first-position CI
gate before lint, test, or deploy.

```
MODULE FORMAT & TOOLING
  Module format     : ESM ("type": "module", "module": "NodeNext")
  Package manager   : pnpm, lockfile committed, CI runs --frozen-lockfile
  require()         : never used anywhere in the codebase
```

### 5.3 Discord Integration — discord.js v14, Used Directly

discord.js v14 is the single Discord integration library, used directly rather than
hidden behind a generic Discord-client abstraction — its `Client` class,
`GatewayIntentBits`, `Partials`, `SlashCommandBuilder`, and `Interaction` type
hierarchy are the types module authors work with everywhere. This is a deliberate
choice, not a lazy default: discord.js is the dominant TypeScript-compatible Discord
library with a stable, actively maintained type system, which is exactly what makes
committing to its types directly — rather than behind a wrapper no module author asked
for — the design that serves a module author best.

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

### 5.4 Data Storage — PostgreSQL (System of Record) + Redis (Acceleration)

```
TABLE 5-A — Storage Role Separation

┌─────────────┬───────────────────────────────────────────────────────────┐
│ Store        │ Role                                                       │
├─────────────┼───────────────────────────────────────────────────────────┤
│ PostgreSQL   │ Sole system of record. JSONB for per-guild config blobs   │
│              │ without sacrificing relational integrity elsewhere. ACID  │
│              │ transactions for multi-table writes. Row-level locking     │
│              │ (SELECT FOR UPDATE) against concurrent double-actions on   │
│              │ the same target. LISTEN/NOTIFY for cross-process cache    │
│              │ invalidation signaling.                                    │
├─────────────┼───────────────────────────────────────────────────────────┤
│ Redis        │ L2 cache, BullMQ queue backing store, cross-shard pub/sub. │
│              │ Explicitly not the primary data store — its role is        │
│              │ acceleration and coordination. Any data whose loss would   │
│              │ be user-visible lives only in PostgreSQL.                  │
└─────────────┴───────────────────────────────────────────────────────────┘

Query builder: Knex.js — not an ORM. No active-record entities. The repository
pattern (§24.3) is the only abstraction over the database and issues SQL through
Knex rather than string concatenation. Knex's migration system handles all schema
management (§24.4).
```

### 5.5 Job Queue & Scheduling — BullMQ

BullMQ provides durable, Redis-backed job queues with per-job retry policies,
dead-letter routing, delayed jobs (scheduled mutes, timed close events, reminder
firing), and rate-limited queues. It is chosen over an in-process scheduler
specifically because it survives process restarts: a job enqueued for 24 hours from
now still fires even if the process restarts three times in the interim. Cron-style
recurring work (§29.6) wraps BullMQ's repeatable-job mechanism behind a distinct API,
since recurring tasks and one-shot jobs have different authoring models and should
never be conflated.

### 5.6 Observability Stack — Pino, Prometheus, OpenTelemetry

```
Logging   — Pino     : structured JSON to stdout; lowest per-log overhead of Node
                        logging libraries; child-logger scoping pre-binds traceId,
                        guildId, moduleId to every log line in a request's call stack
Metrics   — prom-client: command counters, latency histograms, queue depth, cache
                        hit/miss ratios, DB pool usage — all exposed as Prometheus
                        text format from /metrics
Tracing   — OpenTelemetry SDK: a root span per command execution; child spans for
                        every DB query above the slow threshold, every job
                        invocation, every outbound HTTP call; OTLP export to any
                        compatible backend (Jaeger, Tempo, Honeycomb, Datadog APM)

All three pillars carry the same traceId — cross-signal correlation is a lookup,
never a time-based approximation (§27.1).
```

### 5.7 Configuration & Validation — Zod

All configuration — process-level environment variables and every module's own schema
— validates against Zod schemas during bootstrap Stage 02 (§8.2). A value failing its
schema exits the process with a precise, field-by-field error before any module loads
or any gateway connection is attempted. There is no "handle missing config at runtime"
pattern anywhere in this architecture.

### 5.8 Development & Quality Tooling

```
TABLE 5-B — Tooling Reference

┌───────────────┬───────────────────┬───────────────────────────────────┐
│ Tool           │ Version            │ Purpose                            │
├───────────────┼───────────────────┼───────────────────────────────────┤
│ TypeScript     │ ^5.5                │ Primary language, strict mode      │
│ ESLint         │ ^9.x (flat config)  │ Linting, module-boundary enforcement│
│ Prettier       │ ^3.x                │ Formatting, CI --check gate         │
│ Vitest         │ ^2.x                │ Unit + integration test runner      │
│ pnpm           │ latest stable       │ Package manager                     │
│ tsx            │ ^4.x                │ Dev-time TS execution, no build step│
│ Husky          │ ^9.x                │ Git hook management                 │
│ commitlint     │ ^19.x               │ Conventional Commit enforcement     │
│ changesets     │ ^2.x                │ Changelog generation & release coord│
└───────────────┴───────────────────┴───────────────────────────────────┘
```

### 5.9 Infrastructure & Deployment Targets

```
TABLE 5-C — Infrastructure Stack

┌───────────────────┬─────────────────────────┬──────────────────────────┐
│ Concern             │ Technology                │ Notes                     │
├───────────────────┼─────────────────────────┼──────────────────────────┤
│ Containerization    │ Docker                    │ Multi-stage build          │
│ Orchestration        │ Kubernetes               │ Primary production target  │
│ Infra-as-code        │ Terraform                │ PostgreSQL, Redis, cluster  │
│ Secrets              │ Sealed Kubernetes Secrets │ No plaintext in manifests  │
│                     │ (or Vault / cloud manager)│ or committed env files     │
│ CI/CD                │ GitHub Actions           │ Five workflows (§40)        │
└───────────────────┴─────────────────────────┴──────────────────────────┘
```

---

## 6. System Architecture & Layered View

### 6.1 The Layered Architecture

```
DIAGRAM 6-A — Full Layered View

┌────────────────────────────────────────────────────────────────────────┐
│                      DISCORD GATEWAY & REST API                         │
│              (one WebSocket connection per shard, via discord.js)       │
└─────────────────────────────────┬────────────────────────────────────────┘
                                   │ GatewayIntentBits = union of every
                                   │ loaded module's declared intents
┌─────────────────────────────────▼────────────────────────────────────────┐
│                          APPLICATION CORE                                 │
│  ┌───────────┐ ┌───────────┐ ┌──────────────┐ ┌────────────────┐        │
│  │ Bootstrap │ │ DI Container│ │ Event Router │ │ Command Router  │       │
│  └───────────┘ └───────────┘ └──────────────┘ └────────────────┘        │
│  ┌───────────┐ ┌───────────┐ ┌──────────────┐ ┌────────────────┐        │
│  │ Config     │ │ Logger     │ │ Middleware    │ │ Permission      │       │
│  │ Manager    │ │ (Pino)     │ │ Pipeline      │ │ Engine (7-layer)│       │
│  └───────────┘ └───────────┘ └──────────────┘ └────────────────┘        │
│  ┌───────────┐ ┌───────────┐ ┌──────────────┐ ┌────────────────┐        │
│  │ Cache      │ │ Database   │ │ Job Queue     │ │ HTTP Server     │       │
│  │ Manager    │ │ Manager    │ │ (BullMQ)      │ │ (Fastify)       │       │
│  └───────────┘ └───────────┘ └──────────────┘ └────────────────┘        │
└─────────────────────────────────┬────────────────────────────────────────┘
                                   │ loaded through the Module Registry
┌─────────────────────────────────▼────────────────────────────────────────┐
│                            MODULE LAYER                                   │
│    N independently-owned modules, each Admin / Core / Standard /          │
│    Marketplace tier, each with its own commands, events, services,        │
│    repositories, jobs, migrations, locales, and tests                      │
└────────────────────────────────────────────────────────────────────────┘
```

Every box inside the Application Core exists exactly once per process. No module ever
constructs its own database pool, its own cache client, or its own logger — every one
of those instances is handed to it by the DI container (§10), which is what makes "one
operational surface regardless of module count" (Pillar 6, §1.4) a structural property
rather than a discipline.

### 6.2 The Complete Command Interaction Trace

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
EventRouter.handleGatewayEvent('interactionCreate', interaction)   [§18.3]
        │
        ▼ (ApplicationCommand or Autocomplete)
CommandRouter.dispatch(interaction)                                 [§17.3]
        │  looks up by composite key: commandName[:subgroup][:sub]
        ▼
Module-active check for this guild                                  [§13.4]
        │  fails closed: missing or disabled row ⇒ no dispatch
        ▼
MIDDLEWARE PIPELINE, strict priority order                           [§19.2]
   -20  MaintenanceModeMiddleware   — short-circuits everything if set
   -10  AdminTierGateMiddleware     — owner-only gate, Admin tier only
     0  TraceMiddleware            — opens span, binds traceId
    10  AuthMiddleware             — resolves interaction.user
    20  GuildConfigMiddleware      — loads per-guild config into context
    30  LocaleMiddleware           — binds i18n instance
    40  RateLimitMiddleware        — atomic check-and-increment, pre-handler
    50  PermissionMiddleware       — Discord bitfield check (Layer 5 of 7)
    60  RBACMiddleware             — Dumby role check (Layer 6 of 7)
    70  CooldownMiddleware         — per-user per-command cooldown
    80  DeferMiddleware            — deferReply() if command.requiresDefer
    90  AnalyticsMiddleware        — records invocation start
   100+ module-global middleware (manifest-declared)
   200+ command-scoped middleware (command-declared)
        │  each layer calls next() to continue; abort ⇒ short-circuit
        ▼
Command.execute(interaction, context)                                [§17.2]
        │
        ▼
Service layer call → repository pattern for any data access          [§24.3]
        │
        ▼
Command.execute returns
        │  middleware .after() hooks run in reverse priority order
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
CacheManager.get('guild:{G}:config')  [Redis L2]
        │
   hit ─┴─ backfill L1 ────────────────► bind to context, proceed
        │
   miss
        ▼
GuildConfigRepository.findByGuildId(G)  [PostgreSQL — reads the config JSONB
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
                    │    Discord Gateway    │
                    └──────────┬───────────┘
                               │
             ┌─────────────────┼─────────────────┐
             │                 │                 │
     ┌───────▼──────┐  ┌───────▼──────┐  ┌───────▼──────┐
     │  Bot Pod 0    │  │  Bot Pod 1    │  │  Bot Pod N    │
     │  (Shard 0–k)  │  │  (Shard k–2k) │  │  (Shard Nk–M) │
     └───────┬──────┘  └───────┬──────┘  └───────┬──────┘
             │                 │                 │
             └─────────────────┼─────────────────┘
                               │
             ┌─────────────────┼─────────────────┐
             │                 │                 │
     ┌───────▼──────┐  ┌───────▼──────┐  ┌───────▼──────┐
     │  PostgreSQL   │  │     Redis     │  │  BullMQ       │
     │  (Primary +   │  │  (L2 cache,   │  │  Workers       │
     │   Replicas)   │  │   pub/sub)    │  │               │
     └──────────────┘  └──────────────┘  └──────────────┘

Shard assignment formula:
  shardId = (guildId.toBigInt() >> 22n) % BigInt(totalShards)
  (Parentheses matter: % binds tighter than >> in TypeScript/JavaScript —
   omitting them computes guildId >> (22n % totalShards), which is wrong.)
```

Each pod hosts a contiguous shard range under discord.js's `ShardingManager`, sized so
a single pod carries roughly 1,000 guilds per shard before crossing the point where a
single gateway connection's event volume risks Discord's per-shard rate limits. Two
mechanisms let one shard reach state on another: `client.shard.broadcastEval()` — a
serializable function executed across every shard, reserved for low-frequency,
operator-triggered needs, since it carries meaningfully higher per-call latency than a
hot-path primitive should — and Redis pub/sub, used for anything routine or
high-frequency (cache invalidation, cross-shard presence updates). Application code
never assumes it runs unsharded; `context.shardId` is always populated, and any state a
module needs across shard boundaries lives in PostgreSQL or Redis (§26), never in a
process-local variable.

### 6.6 Multiple Bot Identities — Twill & Personas (Summary)

Two hard Discord-platform ceilings shape when a single bot identity stops being
enough for a guild: at most 100 commands may be registered per guild per application,
and a single bot connection holds at most one active voice connection per guild.
**Twill** is the subsystem responsible for creating, branding, and governing the
lifecycle of a **Persona** — a complete additional Discord Application, its own token,
its own branding, its own gateway connection, bootstrapped from the identical codebase
and sharing the identical PostgreSQL primary, Redis instance, and job queues as the
main bot and every other Persona a deployment runs. A Persona is not a lighter-weight
bot; it is the framework running again under a different identity, giving a guild a
second full command budget or a second concurrent voice connection. This mechanism is
opt-in and additive — reached for only when one of the two ceilings is actually hit —
and is specified completely in §35.

---

## 7. Directory & File Structure

### 7.1 Top-Level Layout

```
TREE 7-A — Repository Root

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
│   └── commit-msg                    ← commitlint
│
├── .vscode/
│   ├── launch.json                   ← tsx-based debugger, no compiled output needed
│   ├── settings.json
│   ├── extensions.json
│   └── snippets/dumby.code-snippets
│
├── docker/
│   ├── Dockerfile                    ← multi-stage: builder (tsc) + runtime (node)
│   ├── Dockerfile.dev                ← tsx with volume mount for live reload
│   └── docker-compose.yml            ← bot + postgres + redis + bullmq-dashboard
│
├── infra/
│   ├── terraform/
│   │   ├── environments/{staging,production}/
│   │   └── modules/{database,cache,kubernetes}/
│   └── k8s/
│       ├── base/{deployment,service,configmap,serviceaccount,hpa}.yaml
│       └── overlays/{staging,production}/
│
├── scripts/
│   ├── scaffold.ts                   ← dumby scaffold module <name>
│   ├── migrate.ts                    ← migration runner entrypoint
│   └── seed.ts                       ← development seed data
│
├── src/
│   ├── core/                         ← Application Core (§7.2)
│   ├── modules/                      ← Feature modules (§7.3)
│   ├── shared/                       ← Cross-cutting utilities (§7.4)
│   ├── entry/                        ← Process entrypoints (§7.5)
│   └── monetization/                 ← Reserved monetization scaffold (§7.6)
│
├── tsconfig.json                     ← strict mode, NodeNext, path aliases
├── tsconfig.build.json               ← excludes tests
├── eslint.config.ts                  ← flat config
├── prettier.config.ts
├── vitest.config.ts
├── commitlint.config.ts
├── .changeset/config.json
├── package.json                      ← "type": "module"
└── pnpm-lock.yaml
```

### 7.2 `src/core/` — The Application Core

```
TREE 7-B — Application Core Layout

src/core/
├── application/
│   ├── Application.ts               ← 18-stage bootstrap orchestrator (§8)
│   ├── ApplicationContext.ts        ← shared runtime context object
│   └── HealthServer.ts              ← Fastify /health, /ready, /startup (starts
│                                        Stage 03, before module loading)
├── container/
│   ├── Container.ts                 ← DI container implementation (§10)
│   ├── tokens.ts                    ← Symbol-token registry (core tokens)
│   └── lifetimes.ts                 ← 'singleton' | 'transient' | 'scoped'
├── modules/
│   ├── ModuleRegistry.ts            ← discovery, validation, catalog
│   ├── ModuleLoader.ts              ← dynamic import + lifecycle hooks
│   ├── ModuleManifest.ts            ← manifest Zod schema + type exports
│   └── GuildModuleStateService.ts   ← guild_module_states read/write + cache
├── commands/
│   ├── CommandRouter.ts             ← dispatch from InteractionCreate (§17)
│   ├── CommandRegistry.ts           ← registration, collision detection
│   └── CommandDeployer.ts           ← Discord application command upsert
├── events/
│   ├── EventRouter.ts               ← gateway event → module handlers (§18)
│   └── InternalEventBus.ts          ← cross-module typed event pub/sub
├── middleware/
│   ├── MiddlewarePipeline.ts        ← onion composition, priority ordering (§19)
│   ├── BaseMiddleware.ts            ← abstract base class
│   └── built-in/                    ← the eleven built-in stages, one file each
├── permissions/
│   ├── PermissionResolver.ts        ← 7-layer resolution engine (§21)
│   ├── RBACService.ts               ← Dumby role definitions + membership
│   └── BlacklistService.ts          ← user/guild block lists (Layer 2)
├── config/
│   ├── ConfigManager.ts             ← load, validate, freeze process config
│   ├── GuildConfigService.ts        ← per-guild config read/write + cache
│   └── schema.ts                    ← root Zod schema (§23.2)
├── database/
│   ├── DatabaseManager.ts           ← pool, read-replica routing (§24)
│   ├── MigrationRunner.ts           ← ordered migration execution
│   ├── BaseRepository.ts            ← typed CRUD base; transactions owned by
│   │                                    the service layer
│   ├── QueryLogger.ts               ← slow/critical query logging
│   └── migrations/{core,backfill}/  ← 11 core tables + 1 proactive backfill
├── cache/
│   ├── CacheManager.ts              ← L1 + L2 unified API (§25)
│   ├── L1Cache.ts / L2Cache.ts
│   └── StampedeGuard.ts             ← distributed lock + early expiration
├── http/
│   ├── HttpServer.ts                ← Fastify instance + plugins
│   ├── routes/{health,metrics,webhooks,modules}.routes.ts
│   └── middleware/{authMiddleware,requestLogger}.ts
├── queue/
│   ├── QueueManager.ts              ← BullMQ queue registry
│   ├── BaseProcessor.ts             ← abstract job processor base
│   ├── Scheduler.ts                 ← cron registration + repeatable jobs
│   └── BaseJob.ts                   ← abstract cron task base
├── i18n/
│   ├── I18nManager.ts               ← locale loading, namespace merging
│   └── formatters.ts                ← date/number/currency/duration
├── observability/
│   ├── Logger.ts / Metrics.ts / Tracing.ts
└── error/
    └── DumbyError.ts + eight concrete subclasses (§28.1)
```

### 7.3 `src/modules/` — One Directory Per Module

Every module follows an identical internal structure (§11.3) — the one convention the
framework does enforce, regardless of what any specific module does. A fresh
installation ships with only the `_template` reference module actually present; every
other module name is an author's own addition, following an identical naming and
tier-labeling convention:

```
TREE 7-C — Module Directory Convention

src/modules/
├── _template/                 ← the only module present in a fresh install
├── {module-name}/              ← [Admin | Core | Standard | Marketplace]
├── {module-name}/
└── ...                          one directory per independently-owned module
```

### 7.4 `src/shared/` — Cross-Cutting Utilities

```
TREE 7-D — Shared Utilities

src/shared/
├── types/
│   ├── discord.ts       ← extended discord.js type augmentations
│   ├── context.ts       ← CommandContext type (§17.5)
│   └── pagination.ts    ← cursor and offset pagination types
├── utils/
│   ├── snowflake.ts, embed.ts, crypto.ts
│   └── retry.ts         ← exponential-backoff utility (max 3 attempts, 1000ms
│                           base; does NOT compose with BullMQ retry — §28.3)
├── constants/
│   └── colors.ts, limits.ts, durations.ts
└── testing/
    ├── MockContainer.ts ← pre-wired DI container for unit tests (§37.3)
    ├── fixtures/
    └── helpers/
```

### 7.5 `src/entry/` — Process Entrypoints

```
TREE 7-E — Entrypoints, One Per Deployable Process

src/entry/
├── main.ts              ← production entry: creates Application, calls bootstrap()
├── worker.ts            ← BullMQ worker-only entry (CPU-isolated worker processes)
├── migrate.ts           ← migration-only entry, no gateway
├── pep.ts               ← Power Engine Panel entry (§22.3): no gateway, no modules
├── clai.ts              ← CLAI entry (§22.5): SSH-hosted operator terminal
├── swastik.ts           ← Swastik entry (§15): deployment/hot-reload/hot-swap
└── credentials.ts       ← Credentials Service entry (§22.7): local authkey/dev-ID issuance
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
├── adapters/     ← empty — a future billing provider's integration lives here
├── models/       ← empty — future billing/entitlement data shapes live here
├── services/     ← empty — future business logic (entitlement checks, usage
│                    thresholds) lives here
└── README.md     ← describes the folder's purpose and intended structure
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

## 8. Application Bootstrap Sequence

### 8.1 The Application Class

`Application` is the single root orchestrator. It holds references to every shared
service — the DI container, the database manager, the cache manager, the HTTP server,
the gateway client — drives startup as a linear series of named stages, and exposes
the shutdown path invoked by process signals. Nothing starts before
`Application.bootstrap()` is called; nothing runs after `Application.shutdown()`
completes. This single-entry, single-exit design is what makes "one bootstrap
sequence" (§0.4) a literal property of the codebase rather than an aspiration.

### 8.2 The Eighteen-Stage Startup Sequence

Each stage has a hard failure mode and a name that appears verbatim in the boot log.
A stage failure exits the process with a non-zero code; no stage is optional or
deferrable — this is Principle P4 (§3) made concrete.

```
TABLE 8-A — Complete Bootstrap Stage Reference

┌────┬────────────────────┬──────────────────────────────────────────┬───────────────────┐
│ St.│ Name                │ What Happens                               │ Failure Mode        │
├────┼────────────────────┼──────────────────────────────────────────┼───────────────────┤
│ 01 │ PROCESS_SETUP       │ Register uncaughtException /              │ Fatal — no safety   │
│    │                    │ unhandledRejection handlers; set process   │ net without this    │
│    │                    │ title                                      │                     │
│ 02 │ CONFIG_LOAD         │ Load & validate root Zod schema against    │ Fatal — field-level │
│    │                    │ process.env                                │ Zod error output    │
│ 03 │ HEALTH_SERVER_INIT  │ Start Fastify on HEALTH_PORT; all three    │ Fatal — no          │
│    │                    │ health endpoints begin returning 503       │ diagnostic surface  │
│    │                    │ (not ready yet)                            │ otherwise           │
│ 04 │ OBSERVABILITY_INIT  │ Init Pino root logger, Prometheus registry,│ Fatal               │
│    │                    │ OpenTelemetry SDK; all further log lines   │                     │
│    │                    │ are structured JSON                        │                     │
│ 05 │ DATABASE_CONNECT    │ Open Knex pool (primary + read replicas    │ Fatal               │
│    │                    │ if configured); verify with SELECT 1       │                     │
│ 06 │ MIGRATION_RUN       │ Run pending migrations, core then module,  │ Fatal — missing     │
│    │                    │ in declared order; verify                  │ migration is a      │
│    │                    │ guild_module_states backfill is current    │ deployment error    │
│ 07 │ CACHE_CONNECT       │ Open Redis connection; verify with PING    │ Fatal               │
│ 08 │ QUEUE_INIT          │ Init BullMQ queue connections; register    │ Fatal               │
│    │                    │ worker processors                          │                     │
│ 09 │ DI_BOOTSTRAP        │ Bind all core services into the container; │ Fatal               │
│    │                    │ freeze the core token namespace             │                     │
│ 10 │ MODULE_DISCOVER     │ Scan src/modules/; collect manifest.ts     │ Fatal — no modules  │
│    │                    │ files                                       │ means nothing to do │
│ 11 │ MODULE_VALIDATE     │ Validate every manifest against the Zod    │ Fatal — invalid     │
│    │                    │ schema; resolve cross-module dependency     │ manifest or         │
│    │                    │ graph; detect cycles                       │ dependency cycle is │
│    │                    │                                             │ a development error │
│ 12 │ MODULE_LOAD         │ Call onLoad(container) on every module in  │ Fatal only if a     │
│    │                    │ topological order; required:false modules  │ required:true       │
│    │                    │ that throw here are disabled with a warning│ module's onLoad     │
│    │                    │ and startup continues                      │ throws               │
│ 13 │ COMMAND_REGISTER    │ Collect command classes from enabled       │ Fatal — a name      │
│    │                    │ modules; register with CommandRegistry;    │ collision is a      │
│    │                    │ run collision detection                    │ development error   │
│ 14 │ EVENT_REGISTER      │ Register event handler classes from        │ Fatal               │
│    │                    │ enabled modules with EventRouter            │                     │
│ 15 │ DISCORD_LOGIN       │ Call client.login(BOT_TOKEN)                │ Fatal — nothing     │
│    │                    │                                             │ works without a     │
│    │                    │                                             │ gateway connection  │
│ 16 │ CLIENT_READY        │ Wait for discord.js's ready event; compute │ Fatal               │
│    │                    │ this process's shard assignments            │                     │
│ 17 │ MODULE_READY        │ Call onReady(client) on every loaded       │ Non-fatal per       │
│    │                    │ module; failures disable the specific       │ module — the bot is │
│    │                    │ module with a warning                       │ live and responding │
│    │                    │                                             │ during this stage   │
│ 18 │ STARTUP_COMPLETE    │ /health/readiness returns 200 only once    │ —                   │
│    │                    │ every required:true module has completed   │                     │
│    │                    │ onReady() without error; emit               │                     │
│    │                    │ dumby.system.ready on the internal bus       │                     │
└────┴────────────────────┴──────────────────────────────────────────┴───────────────────┘
```

```
DIAGRAM 8-A — Bootstrap as a State Machine

  [process start]
        │
   ┌────▼────┐  fail ⇒ exit(1), Zod error / connectivity error / etc.
   │ 01 → 09 │──────────────────────────────────────────────────────►  [DEAD]
   │ (linear,│
   │ all     │
   │ fatal)  │
   └────┬────┘
        │ all nine pass
   ┌────▼────┐  invalid manifest / dep cycle ⇒ exit(1)
   │ 10 → 11 │──────────────────────────────────────────────────────►  [DEAD]
   └────┬────┘
        │
   ┌────▼─────────────┐  required:true module throws ⇒ exit(1)
   │ 12 MODULE_LOAD     │───────────────────────────────────────────►  [DEAD]
   │ (per-module;        │
   │ required:false      │
   │ failures ⇒ DISABLED,│
   │ startup continues)  │
   └────┬─────────────┘
        │
   ┌────▼────┐  collision / registration error ⇒ exit(1)
   │ 13 → 16 │──────────────────────────────────────────────────────►  [DEAD]
   └────┬────┘
        │ gateway connected, shard assignments known
   ┌────▼─────────────┐
   │ 17 MODULE_READY    │  per-module failure ⇒ that module → DISABLED
   │ (bot is LIVE and    │  (warning only; bot keeps responding)
   │ responding here)    │
   └────┬─────────────┘
        │
   ┌────▼────┐
   │ 18       │  all required:true modules healthy
   │ STARTUP_ │─────────────────────────────────────────► [READY — serving traffic]
   │ COMPLETE │
   └─────────┘
```

**Health probe semantics** — three endpoints, three distinct readiness contracts:

```
TABLE 8-B — Health Endpoint ↔ Bootstrap Stage Mapping

┌───────────────────┬───────────────────────┬──────────────────────────────────┐
│ Endpoint            │ Returns 200 once...     │ Kubernetes probe purpose           │
├───────────────────┼───────────────────────┼──────────────────────────────────┤
│ /health/liveness    │ Stage 04 completes       │ livenessProbe — a failure here     │
│                    │ (observability up)      │ means fundamentally unhealthy;     │
│                    │                          │ restart the process                │
│ /health/startup     │ Stage 15 completes       │ startupProbe — distinguishes       │
│                    │ (gateway connected)      │ "still starting" from "started     │
│                    │                          │ then broke," with a longer         │
│                    │                          │ failureThreshold                   │
│ /health/readiness   │ Stage 18 completes, all  │ readinessProbe — a failure removes │
│                    │ required modules healthy │ the pod from the Service endpoint  │
│                    │                          │ list without restarting it —       │
│                    │                          │ correct for transient degradation  │
└───────────────────┴───────────────────────┴──────────────────────────────────┘
```

This three-way split exists because the unavoidably long duration of Stage 17
(calling `onReady()` across every module) must not read as "the process is broken" to
an orchestrator — the process is genuinely alive and its gateway connection genuinely
works well before every module finishes initializing. Collapsing all three checks into
one endpoint would force a choice between an orchestrator restarting a healthy-but-
still-initializing pod (if the check is too strict) or routing traffic to a pod with a
broken required module (if the check is too lenient). Three independently-gated
endpoints avoid the trade-off entirely.

---

## 9. Graceful Shutdown & Signal Handling

### 9.1 The Nine-Step Shutdown Sequence

Triggered by `SIGTERM` or `SIGINT`. The shutdown executes nine steps sequentially,
each with its own independent timeout — a later step never starts before an earlier
one has either completed or exhausted its own ceiling.

```
TABLE 9-A — Graceful Shutdown Steps

┌────┬───────────────────────────────────────────┬─────────┬────────────────────────┐
│ St.│ Action                                       │ Timeout  │ Notes                    │
├────┼───────────────────────────────────────────┼─────────┼────────────────────────┤
│ 01 │ Stop accepting new gateway events            │ 30 s     │ Shard disconnect;        │
│    │                                              │          │ Discord marks bot        │
│    │                                              │          │ offline                  │
│ 02 │ Drain in-flight command executions            │ 30 s     │ Wait for active           │
│    │                                              │          │ Command.execute() calls  │
│    │                                              │          │ to finish                 │
│ 03 │ Call onUnload() on every loaded module        │ 30 s     │ Cancel timers, flush      │
│    │ (reverse load order)                          │          │ in-memory state           │
│ 04 │ Drain BullMQ queues (stop accepting new       │ 60 s     │ In-flight workers finish  │
│    │ jobs; let current workers finish)              │          │ normally; workers still  │
│    │                                              │          │ running after 60s are      │
│    │                                              │          │ abandoned with a          │
│    │                                              │          │ dead-letter entry         │
│ 05 │ Close HTTP server (finish in-flight requests)  │ 10 s     │                          │
│ 06 │ Flush Pino log buffer and OTel span exporter   │ 5 s      │ No log lines or traces    │
│    │                                              │          │ are lost                  │
│ 07 │ Close BullMQ connections                       │ 5 s      │                          │
│ 08 │ Close Redis connection                          │ 5 s      │                          │
│ 09 │ Close database connection pool                 │ 5 s      │                          │
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

  0s     30s        60s              120s                    180s   190s
  │──01──│           │                │                       │      │
  │      │──02──│                     │                       │      │
  │             │──03──│              │                       │      │
  │                    │───────04────────────────────────────►│      │
  │                                                            │──05─►│
  │                                                             (05-09
  │                                                              overlap
  │                                                              within
  │                                                              their own
  │                                                              windows,
  │                                                              25s total)
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
│ Signal              │ Trigger                          │ Action                          │
├───────────────────┼────────────────────────────────┼──────────────────────────────┤
│ SIGTERM             │ Kubernetes pod termination,       │ Graceful shutdown (§9.1's       │
│                    │ docker stop                       │ nine-step sequence)              │
│ SIGINT              │ Ctrl+C in development             │ Graceful shutdown                │
│ SIGUSR2             │ Reserved, unused                  │ No handler is registered;        │
│                    │                                   │ restarts are driven               │
│                    │                                   │ exclusively by process.exit(0)   │
│                    │                                   │ plus the orchestrator's own      │
│                    │                                   │ restart policy                    │
│ uncaughtException   │ Unhandled throw at process level  │ Flush logs/traces (Steps 06–07   │
│                    │                                   │ of §9.1 only — not the full      │
│                    │                                   │ gateway/queue drain, since        │
│                    │                                   │ process state is unknown), then  │
│                    │                                   │ process.exit(1)                   │
│ unhandledRejection  │ Unhandled Promise rejection       │ Log at error level; emit          │
│                    │                                   │ dumby.system.unhandledRejection; │
│                    │                                   │ process continues — module-level │
│                    │                                   │ rejections are caught by the      │
│                    │                                   │ middleware root error boundary    │
│                    │                                   │ (§19.4) before reaching here in   │
│                    │                                   │ normal operation                  │
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
draining in-flight commands, still healthy enough to run every module's `onUnload()`
cleanly) risks compounding a bad state with more work executed under it. The safer
response is the minimum necessary to avoid losing observability data — flush logs and
traces — then exit immediately and let the orchestrator start a fresh, known-good
process.

An `unhandledRejection`, by contrast, does not imply a violated invariant — it
typically means one specific asynchronous operation failed without its rejection being
caught, not that the whole process is compromised. The default response is therefore
to log and continue rather than exit, on the reasoning that terminating the entire
process over one uncaught rejection would convert an isolated, already-contained
failure into a fleet-wide availability event. In ordinary operation this handler
should rarely fire at all: the middleware pipeline's root error boundary (§19.4)
already catches everything thrown or rejected inside a command's execution path before
it could ever reach the process-level handler.

## 10. Dependency Injection & Service Container

### 10.1 Purpose and Role

The DI container is the single mechanism by which services are shared across the
framework and between modules. There are no module-level singletons, no global
variables reachable through bare imports, and no service-locator calls where a class
reaches out and fetches its own dependencies. Every dependency a class needs arrives
through its constructor, resolved by the container from a token. This property —
constructor injection through the container, exclusively, with no exceptions — is what
makes every class independently testable via mock substitution (§37.3) and what makes
the cross-module dependency graph fully explicit rather than hidden inside import
chains.

```
DECISION RULE — Why Constructor Injection, Exclusively

  Service locator pattern (class calls container.resolve() internally)
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
string-collision risk across modules that might reuse a common name like
`"Logger"`), unspoofable (a `Symbol` is equal only to itself, so no module can
accidentally or deliberately shadow another's token), and type-safe when paired with
TypeScript generics — a token's associated type flows through `container.resolve<T>()`
without a manual cast.

```
CODE REFERENCE 10-A — Token Registry Shape

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

// A module's own tokens.ts — namespaced under the module name
export const MODERATION_TOKENS = {
  ModerationService:    Symbol('Moderation.ModerationService'),
  CaseService:          Symbol('Moderation.CaseService'),
  CaseRepository:       Symbol('Moderation.CaseRepository'),
  InfractionRepository: Symbol('Moderation.InfractionRepository'),
} as const;
```

Core tokens are registered during bootstrap Stage 09 (§8.2). Module tokens are
registered during Stage 12, **in topological dependency order** — meaning a module
whose `depends` array references another module's token can safely resolve that token
at construction time, because the module it depends on has already had its own tokens
registered by the time Stage 12 reaches it.

### 10.3 Binding Lifetimes

```
TABLE 10-A — Container Lifetimes

┌────────────┬──────────────────────────────────────┬────────────────────────────┐
│ Lifetime    │ Description                            │ Typical use                  │
├────────────┼──────────────────────────────────────┼────────────────────────────┤
│ singleton   │ One instance per container; created on │ Services, repositories,      │
│            │ first resolution, reused thereafter     │ database connections         │
│ transient   │ New instance on every resolution        │ Stateless utility objects;   │
│            │                                        │ rarely used                  │
│ scoped      │ One instance per command-execution      │ Per-request context objects  │
│            │ scope; the container creates a child     │ that must never bleed        │
│            │ container for the scope                  │ between concurrent           │
│            │                                        │ executions                   │
└────────────┴──────────────────────────────────────┴────────────────────────────┘
```

### 10.4 Dependency Declaration Pattern

```
CODE REFERENCE 10-B — Constructor Injection + Manifest Registration

// Construction via container — the class only ever sees interfaces
class CaseService {
  constructor(
    private readonly caseRepo:  ICaseRepository,
    private readonly logger:    ILogger,
    private readonly eventBus:  IEventBus,
    private readonly config:    IGuildConfigService,
  ) {}
}

// Registration in the module manifest's `services` array
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
  ServiceC depends on TOKENS.ServiceA        ← cycle

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
                                    │      (completely independent instance
                                    │       cache from child A, even for the
                                    │       same user/guild)
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

# PART III — THE MODULE SYSTEM

---

## 11. Module Anatomy & Manifest

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
Zod schema during bootstrap Stage 11. This is the complete field reference — no field
may be added beyond this list without a framework-version bump (Principle P1: the
manifest is a complete table of contents for a module without opening a second file).

```
MANIFEST FIELD REFERENCE — COMPLETE

name              (string, required, kebab-case, globally unique)
                  Canonical identifier. Used in DI token namespaces, cache-key
                  prefixes, queue-name prefixes, migration-ownership attribution,
                  and every log/metric/trace label.

version           (string, required, valid semver)
                  The module's own semver version, independent of the framework's
                  own version. Validates inter-module dependency compatibility.

description       (string, required, 1–120 characters)
                  Human-readable summary shown wherever installed modules are
                  listed, including the extension-system's catalog panels (§16.4).

tier              ('admin' | 'core' | 'standard' | 'marketplace', required)
                  Determines visibility, controllability, rate-limit treatment, and
                  marketplace surfacing. No default — an omitted field fails
                  validation and the application does not start. Full semantics §13.

devGuildOnly      (boolean, required when tier === 'admin', forbidden otherwise)
                  Must be true for Admin-tier modules. Stated explicitly — in
                  addition to being implied by tier — so a reviewer sees the
                  dev-guild restriction asserted twice before merging a change.

hardcoded         (boolean, required)
                  true  ⇒ this module is a private build restricted exclusively to
                          the guild in hardcodeGuildId; can never be released
                          publicly; never enters the extension-submission pipeline.
                  false ⇒ the module is eligible for public release once its
                          developer's licensing is approved (§15.7); visibility
                          beyond that is governed by releaseStatus below.
                  Independent of tier: a hardcoded module may declare any tier —
                  hardcoding constrains WHERE a module runs, not how the module
                  system treats it.

hardcodeGuildId   (snowflake, required when hardcoded === true, forbidden otherwise)
                  The single guild this module is confined to while hardcoded
                  remains true. Distinct from the process-level dev-guild variable
                  (§23.2): that variable scopes the whole process's Admin-tier
                  surface fleet-wide; this field scopes one module's visibility —
                  the two are never required to name the same guild.

releaseStatus     ('private' | 'public', required when hardcoded === false,
                   forbidden otherwise)
                  Governs whether a licensed (non-hardcoded) module is actually
                  published to the extension catalog or held back at its
                  developer's own discretion. A 'private' module passes every
                  validation and promotion step exactly as a 'public' module does
                  — it simply never appears in the browsable catalog until its
                  developer flips this field, and that change clears the same
                  review pipeline any other manifest change does.

devId             (string, required)
                  The registered developer identifier of the module's author
                  (§15.6), carried in every manifest that developer submits — the
                  same identifier binding the module to its licensing record.

buildId           (string, required)
                  The identifier assigned to this specific uploaded version
                  (§15.8). A fresh buildId is issued per accepted version; the
                  registry validates that a manifest's devId/buildId is a valid,
                  currently-approved pair before the module is permitted to load.

marketplaceCategory ('audio'|'community'|'security'|'integrations'|'utility',
                     required when tier === 'marketplace', forbidden otherwise)
                  Powers the extension catalog's category grouping (§16.3).

required          (boolean, default: false)
                  true  ⇒ a failure in this module's onLoad() is fatal to the
                          entire application at Stage 12.
                  false ⇒ the module is logged as a warning and startup
                          continues without it.

depends           (array of { token: Symbol, version?: string }, default: [])
                  Hard dependencies on another module's published DI token.
                  Validated — token existence and version-range satisfiability —
                  at Stage 11.

provides          (array of { token: Symbol, contract: TypeAlias }, default: [])
                  Services this module publishes for other modules to consume.
                  `contract` references a TypeScript interface, checked statically
                  by tsc against every consumer's usage — a consumer calling a
                  method the contract doesn't define fails at compile time in CI.

intents           (array of GatewayIntentBits, default: [])
                  Discord Gateway Intents this module requires. The union across
                  every enabled module is what bootstrap Stage 15 requests.

partials          (array of Partials, default: [])
                  discord.js Partials this module requires for uncached objects.

commands          (array of class references, default: [])
                  Every command handler class this module contributes.

events            (array of class references, default: [])
                  Every gateway event handler class this module registers.

services          (array of { token, class, lifetime, deps }, default: [])
                  Services registered into the DI container. lifetime defaults to
                  'singleton'; deps is an ordered array of Symbols (§10.4).

repositories      (array of { token, class, deps }, default: [])
                  Repository classes — always registered as singletons.

jobs              (array of { queueName, class, deps }, default: [])
                  BullMQ job-processor classes registered against named queues.

tasks             (array of class references, default: [])
                  Cron task classes registered into the Scheduler.

routes            (array of class references, default: [])
                  Fastify HTTP route handler classes registered on the HTTP server.

middleware        (array of { class, global: boolean }, default: [])
                  Middleware classes. global: true applies system-wide; false
                  makes it available only for per-command composition.

migrations        (array of string paths, default: [])
                  Relative paths to this module's own .ts migration files, run in
                  declaration order by MigrationRunner.

locales           (string path, optional)
                  Path to this module's locale directory, merged into the global
                  I18nManager under the module's own namespace at Stage 12.

config            (Zod schema, optional)
                  Module-specific configuration schema. Variables are prefixed
                  with the module name in SCREAMING_SNAKE_CASE.

eventsCatalog     (Record<string, { payload: TypeAlias, description: string }>,
                  optional)
                  Developer-facing documentation of every domain event this
                  module emits — powers both generated docs and subscriber
                  payload-shape validation.

dashboardSchema   (object, optional)
                  MDIS schema describing this module's web configuration panel
                  (§16.4). Absent ⇒ the module still appears on the dashboard via
                  a graceful "Web Panel Not Available" placeholder.
```

### 11.3 Manifest vs. Database — What Lives Where

Every field in §11.2's reference belongs to the manifest specifically because it is
fixed at build time and travels with the code itself: a module's name, tier, declared
dependencies, `hardcoded`/`hardcodeGuildId`/`releaseStatus` classification, and its
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
│ Lives in the MANIFEST (build-time)   │ Lives in the DATABASE (runtime)          │
├────────────────────────────────────┼────────────────────────────────────────┤
│ Module name, version, tier            │ Per-guild enabled/disabled state          │
│ hardcoded / hardcodeGuildId /          │ Per-guild configuration values            │
│   releaseStatus classification        │ Developer licensing approval status        │
│ devId / buildId pair                  │ Build staging & promotion status           │
│ Declared dependencies (depends)       │ RBAC role/group/set assignments            │
│ Published services (provides)         │ Audit history of every change              │
│ Commands, events, jobs, tasks, routes │                                            │
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

```
TREE 11-A — Canonical Module Layout (moderation used as the illustrative shape)

src/modules/moderation/
├── manifest.ts               ← the module's complete contract declaration
├── index.ts                  ← onLoad(container) / onReady(client) / onUnload()
│
├── commands/
│   ├── ban.command.ts
│   ├── kick.command.ts
│   ├── mute.command.ts
│   ├── warn.command.ts
│   ├── case.command.ts       ← /case view | close | delete (subcommand group)
│   ├── history.command.ts
│   ├── purge.command.ts
│   └── viewModHistory.context.ts  ← user context menu: "View Mod History"
│
├── events/
│   ├── guildBanAdd.handler.ts
│   ├── guildBanRemove.handler.ts
│   ├── guildMemberRemove.handler.ts
│   └── messageDelete.handler.ts
│
├── services/
│   ├── ModerationService.ts   ← primary orchestrator; calls repos + emits events
│   ├── CaseService.ts         ← case lifecycle: create, update, close
│   └── PurgeService.ts        ← bulk deletion with rate-limit awareness
│
├── repositories/
│   ├── CaseRepository.ts      ← all SQL against this module's own case table
│   └── InfractionRepository.ts
│
├── jobs/
│   ├── UnmuteJob.ts           ← processes delayed unmute payloads
│   └── AppealNotifyJob.ts
│
├── tasks/
│   └── ExpiredMuteCleanupTask.ts  ← daily cron; sweeps unprocessed expired mutes
│
├── config/
│   └── schema.ts              ← module Zod config schema
│
├── migrations/
│   ├── 0001_create_cases.ts
│   ├── 0002_create_infractions.ts
│   └── 0003_add_case_appeal_fields.ts
│
├── locales/
│   ├── en-US.json             ← required; Stage 11 validation fails without it
│   └── {other-locale}.json    ← contributed incrementally
│
└── __tests__/
    ├── ModerationService.unit.test.ts
    ├── CaseService.unit.test.ts
    ├── ban.command.test.ts
    ├── CaseRepository.integration.test.ts
    └── fixtures/
```

### 11.5 The Three-Layer Rule Inside a Module

Every module enforces a single-direction dependency structure — commands call
services; services call repositories; neither direction reverses.

```
DIAGRAM 11-A — The Three-Layer Rule

  Command   (entry point: validation, routing, presentation)
     │
     ▼
  Service   (business logic: decisions, transformations, event emission)
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

  ✗ command.execute() calling this.database.query(...) directly
      → bypasses the service layer entirely; no business rule is enforced,
        no event is emitted, and the command becomes untestable without a
        real database
  ✗ repository.findActiveCases() calling this.eventBus.emit(...)
      → a repository has no business context for WHEN an event should fire;
        that decision belongs one layer up
  ✗ service.banUser() calling another module's repository directly
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
│ # │ Rule                                  │ Enforcement                           │
├───┼─────────────────────────────────────┼────────────────────────────────────┤
│ 1 │ No cross-module relative imports.      │ ESLint no-restricted-imports rule    │
│   │ The only legal path from Module A into │ with a per-module glob               │
│   │ Module B's territory is B's published  │ (../../{other-module}/*) — a build   │
│   │ DI token, resolved at runtime.          │ error, never a runtime one.          │
├───┼─────────────────────────────────────┼────────────────────────────────────┤
│ 2 │ No writes to another module's tables.  │ Reads only through a declared         │
│   │ Cross-module reads only through a       │ ForCrossModuleRead accessor (§14.1   │
│   │ declared accessor; writes across a      │ Pattern 3), lint-shape-constrained;   │
│   │ module boundary are never acceptable.   │ writes are a code-review hard stop    │
│   │                                        │ with no equivalent carve-out.         │
├───┼─────────────────────────────────────┼────────────────────────────────────┤
│ 3 │ No mutation of another module's         │ Zod schema namespacing +               │
│   │ configuration namespace.                │ prefix-enforcement prevents key        │
│   │                                        │ collisions or overwrites.              │
├───┼─────────────────────────────────────┼────────────────────────────────────┤
│ 4 │ No cross-module middleware hooking.     │ A middleware in Module A's manifest    │
│   │                                        │ cannot intercept Module B's commands   │
│   │                                        │ unless declared global: true, which    │
│   │                                        │ applies system-wide and must justify   │
│   │                                        │ that scope in review.                  │
├───┼─────────────────────────────────────┼────────────────────────────────────┤
│ 5 │ Every cross-module dependency is        │ A module using another's service       │
│   │ declared. No implicit dependencies      │ without declaring the token in         │
│   │ exist anywhere in the system.           │ depends fails to resolve it at Stage   │
│   │                                        │ 12 — a fatal startup error, not a      │
│   │                                        │ silent null.                           │
└───┴─────────────────────────────────────┴────────────────────────────────────┘
```

## 12. Building a Module — A Complete Worked Example

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
  ◉ commands   ◉ services   ◉ repositories   ◉ jobs   ◯ events   ◯ routes
? Requires database tables? Yes → skeleton migration generated
? Needs module-specific configuration? Yes → Zod schema stub generated
? Needs localization? Yes → en-US.json stub generated

✔ Module skeleton created at src/modules/reminders/
✔ Manifest validates against the Zod schema
✔ Registered but DISABLED — enable it explicitly once it does something
```

### 12.3 Step 2 — The Manifest

```
FILE — src/modules/reminders/manifest.ts

export const REMINDERS_TOKENS = {
  ReminderService:    Symbol('Reminders.ReminderService'),
  ReminderRepository: Symbol('Reminders.ReminderRepository'),
} as const;

export default defineManifest({
  name:        'reminders',
  version:     '1.0.0',
  description: 'Personal, timed notifications a user schedules for themself',
  tier:        'standard',
  hardcoded:   false,
  releaseStatus: 'private',
  devId:       '<issued at developer registration, §15.6>',
  buildId:     '<issued per uploaded version, §15.8>',
  required:    false,

  intents: [],   // no privileged intent needed — DMs are sent via REST, not
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

### 12.4 Step 3 — The Command Layer

```
FILE — src/modules/reminders/commands/remind.command.ts

export class RemindCommand implements ICommand {
  data = new SlashCommandBuilder()
    .setName('remind')
    .setDescription('Schedule a personal reminder')
    .addStringOption(opt => opt.setName('when').setDescription('e.g. "in 3 hours"').setRequired(true))
    .addStringOption(opt => opt.setName('message').setDescription('What to remind you of').setRequired(true));

  permissions = { discord: [], rbac: 'MEMBER' };
  cooldown    = { duration: 10, scope: 'USER' as const };
  guildOnly   = false;          // a personal reminder is meaningful from a DM too
  requiresDefer = false;         // parsing + one INSERT comfortably clears 3s

  async execute(interaction: ChatInputCommandInteraction, context: CommandContext) {
    const when    = interaction.options.getString('when', true);
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
      userId:  interaction.user.id,
      guildId: interaction.guildId,   // null if invoked from a DM — the service
                                       // layer decides what that means, not this file
      message,
      fireAt,
    });

    await interaction.reply({
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
FILE — src/modules/reminders/services/ReminderService.ts

export class ReminderService implements IReminderService {
  constructor(
    private readonly repo:     IReminderRepository,
    private readonly queue:    IQueueManager,
    private readonly eventBus: IEventBus,
  ) {}

  async schedule(input: ScheduleReminderInput): Promise<Reminder> {
    // Business rule lives here, never in the command file or the repository
    const delayMs = input.fireAt.getTime() - Date.now();
    if (delayMs > MAX_REMINDER_HORIZON_MS) {
      throw new ValidationError('REMINDERS_TOO_FAR_OUT', { maxDays: 90 });
    }

    const reminder = await this.repo.create({
      userId:  input.userId,
      guildId: input.guildId,
      message: input.message,
      fireAt:  input.fireAt,
      status:  'pending',
    });

    // Pattern 4 (§14.1): scheduling logic is decoupled from the business
    // decision to create a reminder — a subscriber, not this method, owns
    // enqueueing. This keeps ReminderService swappable/testable without a
    // real queue. emit() invokes the subscriber synchronously but does NOT
    // await its async enqueue work (§18.4) — schedule() returns as soon as
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
    delay: payload.fireAt.getTime() - Date.now(),
    jobId: `reminder:${payload.reminderId}`,   // idempotent enqueue (§29.3)
  });
});
```

### 12.6 Step 3, Continued — The Repository Layer

```
FILE — src/modules/reminders/repositories/ReminderRepository.ts

export class ReminderRepository extends BaseRepository<ReminderRow> {
  protected table = 'reminders';   // owned exclusively by this module (P2, §3)

  async findDuePending(before: Date, limit = 100): Promise<ReminderRow[]> {
    const { records } = await this.findMany(
      { status: 'pending', fireAt: { lte: before } },
      { columns: ['id', 'userId', 'guildId', 'message', 'fireAt'], limit },
    );
    return records;
  }
  // create / findById / updateById / etc. inherited from BaseRepository (§24.3)
  // — no bespoke SQL needed beyond the one query this module's access
  //   pattern actually requires
}
```

### 12.7 Step 3, Continued — The Job Layer

```
FILE — src/modules/reminders/jobs/ReminderDeliveryJob.ts

export class ReminderDeliveryJob extends BaseProcessor<{ reminderId: string }> {
  constructor(
    private readonly repo:   IReminderRepository,
    private readonly logger: ILogger,
  ) { super(); }

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
FILE — src/modules/reminders/migrations/0001_create_reminders.ts

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('reminders', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    t.bigInteger('userId').notNullable();          // snowflake, stored as bigint
    t.bigInteger('guildId').nullable();             // null ⇒ scheduled from a DM
    t.text('message').notNullable();
    t.timestamp('fireAt', { useTz: true }).notNullable();
    t.string('status', 12).notNullable().defaultTo('pending');
    // Standard audit columns, per §24.5 — every entity table carries these
    t.timestamp('createdAt', { useTz: true }).notNullable().defaultTo(knex.fn.now());
    t.timestamp('updatedAt', { useTz: true }).notNullable().defaultTo(knex.fn.now());
    t.index(['status', 'fireAt']);   // supports findDuePending's WHERE clause
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTable('reminders');
}
```

```json
FILE — src/modules/reminders/locales/en-US.json

{
  "reminders.set.success": "Got it — I'll remind you {relativeTime}.",
  "reminders.error.unparseable-time": "I couldn't understand \"{input}\" as a time."
}
```

### 12.9 Step 4 — The Unit Test

```
FILE — src/modules/reminders/__tests__/ReminderService.unit.test.ts

describe('ReminderService.schedule', () => {
  it('creates a pending reminder and emits reminders.reminder.scheduled', async () => {
    const container = new MockContainer();
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

  it('rejects a reminder scheduled beyond the maximum horizon', async () => {
    const container = new MockContainer();
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
  RemindCommand.execute()
       │  parses "in 1 hour" → fireAt; validation lives HERE (three-layer rule)
       ▼
  ReminderService.schedule()
       │  business rule: horizon check
       ▼
  ReminderRepository.create()  ──► INSERT INTO reminders (...) [PostgreSQL]
       │
       ▼
  EventBus.emit('reminders.reminder.scheduled', {...})
       │  synchronous — the subscriber below runs before schedule() returns
       ▼
  Subscriber enqueues BullMQ job, jobId 'reminder:{id}', delay = 1 hour
       │
       ▼
  interaction.reply() — user sees "Got it — I'll remind you in 1 hour."

  ── 1 hour later ──

  BullMQ worker picks up 'reminders:deliveries' job
       │
       ▼
  ReminderDeliveryJob.process()
       │  idempotency check: still 'pending'? → yes
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
(§37.6); and, if it is a third-party submission, has passed the five-gate review
pipeline (§16.5). None of that differs based on whether the module shipped with the
core codebase or arrived from a third party six months later — the contract above is
the same either way, which is the point of treating the module system as the
framework's public extension API rather than maintaining a separate, reduced plugin
interface alongside it.

## 13. Module Tiers & Lifecycle

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
│ Tier        │ Pre-Installed?     │ Guild-Visible      │ Who Toggles? │ Rate Limits? │ In      │
│            │                    │ Default?           │              │              │ Catalog?│
├────────────┼──────────────────┼──────────────────┼─────────────┼─────────────┼─────────┤
│ Admin       │ N/A — dev guild     │ Never (non-owners) │ No one       │ No — bypass   │ Never   │
│            │ only               │                    │              │ at priority   │         │
│            │                    │                    │              │ -10           │         │
│ Core        │ Yes, permanent      │ Yes, always         │ No one       │ Yes           │ Never   │
│ Standard    │ Yes, by default     │ Yes, until disabled │ Guild ADMIN  │ Yes           │ Yes, if │
│            │                    │                    │ role         │              │ disabled│
│ Marketplace │ No                  │ No, until installed │ Guild ADMIN  │ Yes           │ Yes, if │
│            │                    │                    │ role         │              │ absent  │
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
of the permission engine, §21.2) apply exactly as for any other tier, but the
framework's own RBAC layer (Layer 6) is **skipped entirely** for Core-tier dispatch —
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

  tier === 'admin'        ⇒ devGuildOnly MUST be true
  tier === 'marketplace'  ⇒ marketplaceCategory MUST be present and valid
  tier !== 'marketplace'  ⇒ marketplaceCategory MUST be absent
  tier === 'standard' AND marketplaceCategory present  ⇒ validation error
                            (the field's presence signals a tier mismatch)
  tier === 'core'         ⇒ no command may declare a non-default permissions.rbac
                            value — Core-tier access is governed exclusively by
                            permissions.discord (§13.2); a Core-tier command still
                            carrying an RBAC requirement is caught before the
                            module ever ships
  hardcoded === true       ⇒ hardcodeGuildId required, releaseStatus forbidden
  hardcoded === false      ⇒ releaseStatus required, hardcodeGuildId forbidden
                            (mutually exclusive by construction — a manifest can
                            never leave a module's public-release eligibility
                            ambiguous)
```

### 13.4 Per-Guild Module State — The `guild_module_states` Contract

Admin- and Core-tier modules need no per-guild state — their controllability is
global and static. Standard- and Marketplace-tier modules maintain one row per guild
per module in `guild_module_states`, the **sole** runtime source of truth for
enabled/disabled state (Principle P13). Module enable/disable status is never
represented as a field inside the `guild_configs` JSONB document (§23.3) — it lives
exclusively in this dedicated table, with its own cache key and its own write-path
transaction, so there is exactly one place this state can be read or written from.

```
SCHEMA 13-A — guild_module_states

guild_module_states
  guildId              snowflake  PK (composite with moduleSlug)
  moduleSlug           string     PK (matches manifest name)
  tier                 'standard' | 'marketplace'   -- denormalized for filter speed
  status               'active' | 'disabled' | 'never_installed'
                       | 'install_pending_resolution'
                         -- a command-name collision with an already-active module
                         -- is unresolved (§17.9); the module dispatches nothing
                         -- until an admin resolves it
  wasStandardDefault   boolean    -- display-only: was this pre-installed Standard?
  installedAt          timestamptz, nullable
  disabledAt           timestamptz, nullable
  dataRetentionPolicy  'retain' | 'purge_after_30d'   -- applied on disable
  createdAt / updatedAt / createdBy / updatedBy        -- standard audit columns
```

```
DIAGRAM 13-A — Read Path (Evaluated Before Every Standard/Marketplace Dispatch)

  GuildModuleStateService.isActive(guildId, moduleSlug)
        │
        ▼
  1. L1 in-process LRU  key: 'guild:module-state:{guildId}:{moduleSlug}'
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
        │     tier default: active for Standard, never_installed for
        │     Marketplace; WRITE that resolved value back as the row's
        │     initial state — the guild's first interaction with the module
        │     is also the moment its row is created. No guild is ever
        │     without its Standard-tier features while waiting for an
        │     explicit row to exist.
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

### 13.6 Admin-Tier Security Gate — Mechanism and Threat Model

Admin tier's bypass of the ordinary rate-limit and permission chain makes it the
single most consequential surface in the framework to secure correctly, for any
deployment that builds an Admin-tier module at all. The protection below is a property
of the tier *mechanism* itself — it applies to whatever Admin-tier commands a
deployment's own module declares, not to any specific command this reference defines —
and is deliberately layered so no single misconfiguration exposes it.

```
DIAGRAM 13-B — The Five-Layer Admin-Tier Defense

  LAYER 1 — DISCORD COMMAND REGISTRATION SCOPE (structural, holds before any
            framework code runs)
    Admin-tier commands are registered exclusively to the development guild,
    never globally, AND with defaultMemberPermissions: 0n — a platform-level
    lock hiding the command from every member's UI regardless of their
    permissions. A non-owner in the dev guild doesn't fail a check; they never
    see the command exists to try. Admin-tier is also the ONE category
    registered for direct-message context alongside guild context (§17.10) —
    every other tier registers guild-only.
        │
        ▼
  LAYER 2 — AdminTierGateMiddleware, PRIORITY -10 (runs before every other
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
    throws                    throws
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
      └── throws  → DISABLED (warning; startup continues; even a
                               required:true module is non-fatal here)

    Global suspend (Power Engine Panel, §22.2) or a per-guild disable:
      │
      ▼
    SUSPENDED (for this guild, or globally; stop dispatching;
               guild_module_states written accordingly)

    A runtime hot-swap trigger (Swastik, §15):
      │
      ▼
    onUnload() → unload → onLoad() → onReady() → ACTIVE
```

Toggling a module off and on again is a state-table write on the order of
milliseconds — it never touches the module's loaded state, its DI registrations, or
its event subscriptions. A disabled module is still loaded, still occupying its
container scope, simply short-circuited before its handler runs (§13.4's read path).
Reloading it, by contrast, re-executes the full `onUnload()` → `onLoad()` → `onReady()`
cycle and is the meaningfully heavier of the two operations — the operational
distinction between "is this a code problem or a configuration problem" that §43.4's
runbooks depend on getting right early in an incident.

### 13.8 Core & Admin Tier Performance Baselines

Because Core- and Admin-tier commands bypass the `guild_module_states` cache read
entirely, they carry less per-invocation overhead than Standard/Marketplace commands
of equivalent handler complexity — a documented, deliberate performance property, not
an incidental one.

```
TABLE 13-B — Framework Overhead by Tier (excludes handler execution time)

┌─────────────────────┬────────────────┬──────────────┬───────────────────┬─────────┐
│ Tier                  │ Module-state     │ Rate limit    │ Permission          │ P50     │
│                      │ lookup?          │ check?        │ resolution?         │ target  │
├─────────────────────┼────────────────┼──────────────┼───────────────────┼─────────┤
│ Admin                 │ Never             │ Never          │ Never (owner-gate) │ < 2 ms  │
│ Core                  │ Never             │ Yes            │ Layers 1–5 & 7 only │ < 5 ms  │
│                      │                  │              │ — RBAC (Layer 6)     │         │
│                      │                  │              │ skipped by design    │         │
│ Standard (enabled)     │ Yes (L1 hit)      │ Yes            │ Full 7-layer         │ < 8 ms  │
│ Standard (disabled)    │ Yes (L1 hit)      │ Abort first    │ Abort first          │ < 3 ms  │
│ Marketplace (installed)│ Yes (L1 hit)      │ Yes            │ Full 7-layer         │ < 8 ms  │
└─────────────────────┴────────────────┴──────────────┴───────────────────┴─────────┘
```

```
TABLE 13-C — End-to-End Targets (full round trip, including handler execution)

┌─────────────────────┬──────────┬──────────┬────────────────┬───────────────────────┐
│ Tier                  │ P50       │ P99       │ L1 hit ratio    │ Availability under      │
│                      │ end-to-end│ end-to-end│                │ partial outage           │
├─────────────────────┼──────────┼──────────┼────────────────┼───────────────────────┤
│ Admin                 │ < 150 ms  │ < 1200 ms │ N/A (bypasses    │ Must remain available    │
│                      │          │          │ guild_module_    │ even if every Standard/  │
│                      │          │          │ states entirely) │ Marketplace module has   │
│                      │          │          │                │ crashed (§11.6 isolation)│
│ Core                  │ < 80 ms   │ < 400 ms  │ > 95%           │ Must remain available if │
│                      │          │          │                │ Redis is down (§26.5     │
│                      │          │          │                │ fall-through)             │
│ Standard / Marketplace│ < 500 ms  │ < 3000 ms │ > 70%           │ Best-effort               │
└─────────────────────┴──────────┴──────────┴────────────────┴───────────────────────┘
```

**Why Core's availability target specifically excludes a Redis dependency.** If a
basic diagnostic or informational command required Redis reachability, a cache outage
would take down the bot's most basic "is the process still functioning" signal at
exactly the moment an operator needs it most. Core-tier commands are the one place in
the system where falling through to a direct, uncached PostgreSQL read on any cache
error is a hard requirement validated against the exact scenario it exists to survive,
rather than a general resilience nicety applied uniformly everywhere.

## 14. Inter-Module Communication

### 14.1 The Four Sanctioned Patterns

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
```

```
TABLE 14-A — Choosing the Right Pattern

┌────────────────────────────────────┬───────────────────────────────────┐
│ "I need to..."                       │ Use...                              │
├────────────────────────────────────┼───────────────────────────────────┤
│ React to something happening         │ Pattern 1 — subscribe to the event  │
│ elsewhere, no response needed         │                                     │
│ Call another module's business logic  │ Pattern 2 — depend on its published │
│ and get a typed result                │ DI token                             │
│ Read one row of another module's      │ Pattern 3 — call its                │
│ data cheaply, synchronously            │ ForCrossModuleRead accessor          │
│ Turn a business event into deferred    │ Pattern 4 — emit the event, let a   │
│ or background work                    │ dedicated subscriber enqueue a job  │
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
version dependency is a **fatal startup error**, never a silent runtime mismatch. This
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

## 15. Swastik — Deployment, Hot-Reload & Hot-Swap

Swastik is the service that owns every deployment, hot-reload, hot-swap, and related
delivery mechanism in the framework — the single answer to how new or changed code
reaches a running fleet, covering the core codebase itself and every
independently-authored module alike. It runs as its own deployable process
(`src/entry/swastik.ts`), architected the same way the Power Engine Panel and CLAI are:
a separate service sharing nothing with the bot process but the same PostgreSQL
primary, the same Redis instance, and the same container image.

### 15.1 Two Distinct Reload Mechanisms — Not to Be Confused

```
TABLE 15-A — Development Hot Reload vs. Runtime Module Activation

┌────────────────────────┬─────────────────────────────┬────────────────────────┐
│                          │ Development Hot Reload        │ Runtime Module          │
│                          │                               │ Activation               │
├────────────────────────┼─────────────────────────────┼────────────────────────┤
│ Mechanism                │ Node's --watch (≥ Node 20)     │ onUnload() → re-import   │
│                          │ + tsx, re-importing changed     │ → onLoad() → onReady(),  │
│                          │ files                          │ triggered by Swastik's   │
│                          │                               │ hot-swap signal           │
│ Environment               │ NODE_ENV === 'development'     │ Always available;        │
│                          │ only — --watch is absent from   │ production mechanism      │
│                          │ production startup scripts and  │                          │
│                          │ Docker images                   │                          │
│ Gateway connection         │ Preserved                       │ Preserved — never        │
│                          │                               │ disconnects; other       │
│                          │                               │ modules keep operating   │
│ Concurrent-user safety     │ Not a concern (dev only)        │ Safe by design           │
└────────────────────────┴─────────────────────────────┴────────────────────────┘
```

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

### 15.3 Reload, Toggle, and Disable — Four Distinct Mechanisms

"Restart a module" means four different things depending on who is asking and at what
scope. Keeping all four separately named prevents them from being conflated during an
incident.

```
TABLE 15-B — The Four Mechanisms

┌──────────────────────┬────────────────────────┬──────────────┬───────────┐
│ Mechanism               │ Trigger                   │ Scope           │ Re-imports │
│                        │                          │                │ code?      │
├──────────────────────┼────────────────────────┼──────────────┼───────────┤
│ Development hot reload  │ File save, dev only        │ This process    │ Yes        │
│                        │                          │ only           │            │
│ Runtime module reload    │ Swastik's hot-swap signal, │ This process    │ Yes        │
│                        │ or an equivalent            │ (all guilds it │            │
│                        │ Admin-tier trigger          │ serves)         │            │
│ Per-guild toggle         │ Whatever a deployment       │ One guild       │ No — state │
│                        │ exposes for it              │                │ flip only  │
│ Global module disable    │ Power Engine Panel          │ All guilds      │ No — state │
│                        │ suspendModule (§22.2)       │                │ flip only  │
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

### 15.6 Developer Registration & Token-Based Identity

A developer registers through a secured API (§44.7) using a username and password,
handled with the same credential discipline as every other secret in this architecture
(Argon2id hashing, §32.1). On successful registration, Swastik calls the Credentials
Service (§22.7) — rather than minting anything itself — to assign the developer a
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

### 15.7 Licensing as an Approval Tracker

The module manifest includes the developer's dev ID and the assigned build ID as
required fields, and the dev ID also appears in the licensing record below, binding
every uploaded module unambiguously to its registered developer from the manifest
itself, independent of anything Swastik's own database separately tracks.

Swastik's licensing system is **a dataset column, not an independent approval engine**:
a developer's `approvalStatus` holds `'pending'`, `'approved'`, or `'declined'`, and
that single column is the developer's entire proof of license — Swastik takes no
further independent action beyond checking it before permitting a deployment.
Deployment is permitted only for a dev ID whose status reads `'approved'`; every other
value blocks every upload from that dev ID outright, before any manifest is even
inspected.

**Manual approval, always.** Moving a developer from `'pending'` to `'approved'` or
`'declined'` is a manual step carried out by the project owners — never automatic,
never inferred from upload volume, activity, or any other signal Swastik observes on
its own. No developer upload proceeds while their dev ID sits at `'pending'`, and a
`'declined'` developer is blocked identically to one who never registered.

### 15.8 Secured Module Upload, Validation, Staging & Promotion

```
DIAGRAM 15-B — From Upload To Live, Step By Step

  Developer uploads a module package + manifest
  (Authorization: Bearer {devId} — never in the URL)
        │
        ▼
  Swastik assigns a fresh buildId, recorded against
  (devId, moduleSlug, version) in the build table
        │
        ▼
  PRE-DEPLOYMENT VALIDATION
    • Runs the IDENTICAL manifest validation that runs at bootstrap Stage 11
      — the same Zod schema, the same checks — so a module that would fail
      to load in production fails the same way here, before reaching a pod
    • Confirms devId/buildId are bound to one another (never a different
      developer's buildId)
    • Confirms the devId's license reads 'approved'
    │  any check fails ⇒ rejected with the SPECIFIC failure returned to the
    │  developer directly, never a generic message
        ▼
  STAGING
    Validated code is written to a staging area on the shared Kubernetes
    volume every pod mounts — never directly into the live module directory
    a running pod actually loads from
        │
        ▼
  ATOMIC PROMOTION
    A symlink from the live module path to the newly staged directory is
    updated atomically at the filesystem level — a pod never reads a
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
    onUnload() → re-import → onLoad() → onReady() → self-health check
        │
   ┌────┴────┐
   │         │
  PASS      FAIL
   │         │
   ▼         ▼
  live    Swastik automatically reverts the symlink to the preserved
          previous version and re-signals a reload — a failed hot-swap
          is NEVER left half-applied in any pod
        │
        ▼
  Result (success or reverted failure) returned to the developer as an API
  response, and — wherever configured — a signed webhook delivery
```

### 15.9 Change Detection & Deployment Orchestration

Dumby's own runtime **never** watches the filesystem for module changes — that
responsibility belongs to Swastik alone, end to end. The full flow, restated as one
sequence: Swastik receives an upload or its own scheduled trigger fires; it validates
the payload; it stages and promotes the change; it calls the runtime's internal reload
API to perform the hot-swap; and it handles rollback on any failure while reporting
status at every stage. The runtime activates a new module version only after Swastik
issues the explicit reload signal — it simply waits for that signal, executes the
hot-swap it's told to execute, and returns the outcome. This division is deliberate:
the runtime stays free of any file-watching, polling, or upload-handling logic of its
own, with deployment orchestration living entirely inside a separate, purpose-built
service instead.

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

### 15.11 The Developer Portal

The developer portal is backend infrastructure, not a frontend concern — built to
support integration into any website through the REST surface (§44.7) rather than
through a framework-shipped UI. The intended workflow: a developer logs into whatever
site hosts the portal with their registered username and password; uses a deploy
button or drag-and-drop interaction to upload the module package; and everything past
that point is automated — manifest extraction, devId/buildId validation, the license
check, staging, promotion, and hot-swap signaling all happen without further input.
The developer supplies no information beyond the upload itself and needs only to track
the deployment status response.

Every security control specified in §32 (secrets management, input validation, webhook
signature verification, rate limiting, dependency security, full audit logging)
applies to the upload path exactly as it applies everywhere else — the upload API is
one more authenticated entry point into the same HTTP server those controls already
govern uniformly, held to the same standard as every other surface in this reference.

## 16. Marketplace, MDIS & Extension System

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
  'never_installed' or 'disabled' (previously installed)
        │
        ▼
  Admin selects a module → install
        │
        ▼
  GuildModuleStateService.install(guildId, moduleSlug):
    1. Verify the module is loaded fleet-wide (if not, an operator must load
       it globally first)
    2. INSERT INTO guild_module_states (status='active', installedAt=now())
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

### 16.3 Marketplace Categories

```
TABLE 16-A — Category Reference

┌────────────────┬─────────────────────────────────────────────────────┐
│ Category         │ Intended Module Types                                  │
├────────────────┼─────────────────────────────────────────────────────┤
│ audio             │ Music playback, voice channel tools, audio recording   │
│ community         │ Additional community-building features beyond Standard │
│ security          │ Advanced threat monitoring, compliance tooling         │
│ integrations      │ Third-party API connections                            │
│ utility           │ Power-user and automation tools beyond Core utility    │
└────────────────┴─────────────────────────────────────────────────────┘
```

### 16.4 Community Module Submission Pipeline

A third-party submission clears five gates before it appears in the catalog for any
guild.

```
DIAGRAM 16-B — Five-Gate Review Pipeline

  GATE 1 — Static Analysis
    tsc --noEmit + ESLint (cross-module import enforcement, no require(), no
    direct process.env access outside the module's own config schema) — zero
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
  remediation notes — never silently rejected.
```

**Version updates are not exempt from re-review.** Every new version of an
already-listed module re-runs Gates 1–4 in full — trust is re-established per version,
not inherited indefinitely from first approval — and only re-signs (Gate 5) if all
four pass again. An update whose diff against the previously-approved version touches
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

```
TABLE 16-B — Supported Schema Components

  toggle          boolean field
  select          enum field with named options
  text-input      string field, optional regex validation
  number-input    integer or float field, min/max bounds
  channel-picker, role-picker, user-picker
  list            repeating values
  data-table      read-only tabular display
  chart           time-series visualization of module metrics
```

**Auto-exposed REST endpoints.** Every module with a `dashboardSchema` automatically
gets `GET /api/modules/:name/config`, `PUT /api/modules/:name/config`, and
`POST /api/modules/:name/:action`. Enable/disable state is exposed through a
**separate** endpoint mapping to `guild_module_states`, never the config endpoint:
`PATCH /api/modules/:name/state`, gated by the guild's own ADMIN role.

```
TABLE 16-C — Tier Visibility on the Dashboard

┌─────────────┬───────────────────────────────────────────────────────┐
│ Tier          │ MDIS Visibility                                          │
├─────────────┼───────────────────────────────────────────────────────┤
│ Admin         │ Never visible in any guild dashboard                      │
│ Core          │ Visible and configurable; no toggle control (cannot be    │
│              │ disabled)                                               │
│ Standard      │ Visible; toggle shown; config panel if dashboardSchema    │
│              │ present                                                 │
│ Marketplace   │ Visible when installed; uninstall button; config panel   │
│              │ if dashboardSchema present                               │
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

**Permission enforcement.** Dashboard API calls authenticate via a Discord OAuth2
token; the caller's RBAC role resolves from the same source and the same resolution
logic the in-bot permission engine uses (§21.7). A user without the guild ADMIN role
receives 403 on state-modifying endpoints; read-only endpoints require MOD at minimum.
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

### 17.1 Command Types Supported

The framework supports every interaction-based command type Discord offers.
Text-prefix commands are explicitly unsupported (§4).

```
TABLE 17-A — Command Types

┌───────────────────────────┬────────────────────────────────────────────────┐
│ Type                        │ Behavior                                          │
├───────────────────────────┼────────────────────────────────────────────────┤
│ ChatInputCommand (slash)     │ The primary type, invoked via /command-name.       │
│                            │ Supports options (string, integer, number,        │
│                            │ boolean, user, channel, role, mentionable,         │
│                            │ attachment), subcommands, and subcommand groups.   │
│                            │ Options may declare autocomplete, min/max bounds,  │
│                            │ and fixed-choice lists.                            │
│ UserContextMenuCommand       │ Appears in the right-click Apps menu on a user;    │
│                            │ provides the selected User and GuildMember.        │
│                            │ Maximum 5 per application.                         │
│ MessageContextMenuCommand    │ Appears in the right-click Apps menu on a          │
│                            │ message; provides the selected Message. Maximum    │
│                            │ 5 per application.                                 │
└───────────────────────────┴────────────────────────────────────────────────┘
```

### 17.2 Command Class Interface — Complete Field Reference

Every command class implements `ICommand`; a validator verifies each field during
bootstrap Stage 13.

```
TABLE 17-B — ICommand Fields

┌─────────────────────────┬────────────────────────────────┬───────────────┐
│ Field                      │ Type                              │ Default         │
├─────────────────────────┼────────────────────────────────┼───────────────┤
│ data                       │ SlashCommandBuilder |              │ required        │
│                            │ ContextMenuCommandBuilder          │                │
│ execute                    │ async (interaction, context)      │ required        │
│ permissions.discord         │ PermissionFlagsBits[]              │ []              │
│ permissions.rbac            │ string                             │ 'MEMBER'        │
│ defaultMemberPermissions    │ bigint                            │ undefined       │
│ cooldown.duration           │ number (seconds)                   │ defaultCooldown │
│ cooldown.scope              │ 'USER'|'GUILD'|'CHANNEL'|'GLOBAL' │ 'USER'          │
│ guildOnly                   │ boolean                           │ true            │
│ ownerOnly                   │ boolean                           │ false           │
│ requiresDefer                │ boolean | (interaction)=>boolean  │ false           │
│ ephemeral                   │ boolean                           │ false           │
│ nsfw                        │ boolean                           │ false           │
│ middleware                  │ { class, context? }[]              │ []              │
│ autocomplete                 │ Record<optionName, Handler>        │ {}              │
│ localization                 │ { name: {}, description: {} }      │ {}              │
└─────────────────────────┴────────────────────────────────┴───────────────┘
```

`defaultMemberPermissions` is a UX-layer, client-side gate only — the runtime
enforcement is always the middleware chain's own Layer 4/5 checks (§21.2), never the
Discord-side hint alone. `nsfw: true` is an infrastructural classification handled
entirely by Discord's own client — the command is only visible in age-restricted
channels, and invoking it elsewhere never reaches Dumby's servers at all.

### 17.3 Command Registry Architecture

`CommandRegistry` is a `Map<string, ICommand>`, frozen after Stage 13 and never
mutated during runtime. Keys are compound paths, giving O(1) dispatch and
build-time-visible namespace collision detection:

```
CODE REFERENCE 17-A — Registry Key Shapes

"/ban"                        → BanCommand
"/case.view"                  → CaseViewCommand
"/economy.shop.buy"           → EconomyShopBuyCommand
"USER::View Mod History"      → ViewModHistoryContextCommand
"MESSAGE::Flag Content"       → FlagContentContextCommand
```

Two modules registering the same key throw `CommandKeyCollisionError`, naming both
modules and the conflicting path, **before the bot is permitted to start** — this is a
Stage 13 fatal error, not a runtime surprise.

### 17.4 Command Deployment Strategy

```
TABLE 17-C — Deployment Scope by Context

┌────────────────────────────┬───────────────────────────────────────────────┐
│ Context                      │ Scope                                            │
├────────────────────────────┼───────────────────────────────────────────────┤
│ Development                  │ All commands registered to the development       │
│                              │ guild — per-guild, propagates in seconds          │
│ Production Standard/          │ Global registration — propagates within ~1 hour;  │
│ Marketplace                   │ CommandDeployer runs post-deploy, idempotent —    │
│                              │ only real changes trigger a Discord API upsert    │
│ Admin                        │ Always the development guild only, regardless of  │
│                              │ environment                                       │
│ Dynamic per-guild commands     │ Always per-guild scoped; never global             │
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
│ Field             │ Type                            │ Populated by                    │
├────────────────┼──────────────────────────────┼─────────────────────────────┤
│ correlationId     │ string (UUID)                   │ TraceMiddleware                  │
│ guildConfig       │ typed guild_configs deserialize │ GuildConfigMiddleware             │
│ locale            │ BCP 47 string                   │ GuildConfigMiddleware             │
│ rbacRole          │ Dumby role enum                 │ RBACMiddleware                    │
│ logger            │ pre-bound Pino child logger      │ TraceMiddleware — carries         │
│                  │                                │ correlationId, guildId, userId,   │
│                  │                                │ shardId, moduleId on every call   │
│ shardId           │ number                          │ Bootstrap — always populated,     │
│                  │                                │ sharded or not                    │
│ metadata          │ Map<string, unknown>            │ Any middleware — a scoped bag     │
│                  │                                │ later middleware or the handler   │
│                  │                                │ itself reads/writes, without       │
│                  │                                │ widening CommandContext's type    │
└────────────────┴──────────────────────────────┴─────────────────────────────┘
```

`CommandContext` is created fresh per interaction by the DI container's `scoped`
lifetime (§10.6) and discarded when the interaction completes — it never survives
across requests and is never shared between concurrent interactions, even two from the
same user in the same guild.

### 17.6 Startup Command Lifecycle

At every bootstrap, Stage 13's `COMMAND_REGISTER` step never assumes a previous run's
registration is still accurate: it deletes every command Discord currently has on
record for the application, then re-registers the complete current set computed fresh
from each guild's actually-enabled modules. This guards against drift a partial prior
deploy, a manually-edited command in Discord's own UI, or a stale registration from a
now-removed module could otherwise leave behind. Core- and Standard-tier commands are
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

  T₀           T₀+12h                    T₀+13h                    T₀+24h (outer ceiling)
  │─ queued ───┤── prepare window ────────┤── PUSH ────────────────────────►│
               (assembling the batch)     (single bulk PUT, to the second)

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

**No commands in direct messages, with one sanctioned exception.** Every command
declares `guildOnly`, defaulting to `true`, and `AuthMiddleware` rejects any
DM-originated interaction against a command declaring it — which is every command in
the framework except Admin tier. The single exception is Admin tier itself: registered
for both the development guild and the direct-message interaction context, letting the
bot owner specifically — never any other user, in any other context — reach the
framework's own operational tooling from a DM. This exists because Admin-tier access
is already gated to the bot owner by multiple independent layers before a handler ever
runs (§13.6); extending its reach to DMs adds a convenience for the one user class
already fully trusted, without loosening the restriction for anyone else.

**No simulated prefix-based commands.** As established in §4's non-goals, this
restriction has no loophole: a module may scan message content and react to what it
finds for a legitimate, manifest-declared purpose, but may never use that scan to
simulate a prefix-based command system — parsing a leading token out of a message and
dispatching it as though it were a registered command. Review treats a module found
doing this as a rejected submission (§16.4), and the same standard applies uniformly to
any module maintained as part of a deployment's own trusted codebase — message
scanning and command dispatch are two structurally distinct capabilities, and no
module is permitted to blur them into one.

## 18. Event Architecture & Bus System

### 18.1 Two Distinct Event Systems — Not to Be Conflated

```
TABLE 18-A — Gateway Events vs. Internal Domain Events

┌────────────────────┬─────────────────────────────┬──────────────────────────┐
│                       │ Gateway Events                 │ Internal Domain Events      │
├────────────────────┼─────────────────────────────┼──────────────────────────┤
│ Source                │ Discord (via discord.js's       │ Any module's own service     │
│                      │ Client)                        │ code                         │
│ Routed by             │ EventRouter                     │ InternalEventBus             │
│ Naming                │ discord.js's own event names     │ {domain}.{entity}.{action}   │
│                      │ (messageCreate, guildBanAdd, …) │ (moderation.user.banned, …)  │
│ Consumers             │ Module-registered IEventHandler  │ Any module's subscriber        │
│                      │ classes                         │                              │
│ Guild-scoped dispatch  │ Checked against                │ Not automatically checked —   │
│ gate                  │ guild_module_states, same as     │ a subscriber that cares about │
│                      │ commands (§13.4)                 │ per-guild state checks it      │
│                      │                                │ itself, since not every        │
│                      │                                │ internal event even has a      │
│                      │                                │ single associated guild         │
└────────────────────┴─────────────────────────────┴──────────────────────────┘
```

### 18.2 Gateway Event Handler Interface

```
TABLE 18-B — IEventHandler Fields

┌───────────┬───────────────────────────────────┬──────────────────────────┐
│ Field       │ Type                                 │ Notes                       │
├───────────┼───────────────────────────────────┼──────────────────────────┤
│ event       │ keyof ClientEvents                   │ e.g. 'guildBanAdd'          │
│ once        │ boolean                              │ default false               │
│ handle      │ async (...args: ClientEvents[E]) => void │ required                │
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
   ▼    ▼                 ▼                       ▼
  Moderation module's   Logging module's        Analytics module's
  handler (writes case  handler (posts to        handler (increments
  record if this ban    configured log           a ban-count metric) —
  wasn't already logged  channel) — independent   independent try/catch
  by /ban itself)        try/catch                 
   │  each check its own module's guild_module_states before running;
   │  each wrapped independently — a throw in one never blocks the others
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
`eventsCatalog` declarations — meaning `emit()` and `on()` are both compile-time
checked against the payload shape a module actually declared publishing, and a typo in
an event name is a TypeScript error, never a silently-ignored runtime no-op.

**Execution model.** `emit()` invokes every registered listener synchronously, in
registration order — each listener is called within the same tick as `emit()` itself.
It does **not**, however, await any listener's return value: a listener declared
`async` begins executing up to its first `await`, at which point control returns to
`emit()`, which proceeds to the next listener and then returns to its caller — it
never waits for any listener's promise to settle. The bus is therefore synchronous
with respect to *invocation order* and fire-and-forget with respect to *completion*. A
listener that throws synchronously, or whose returned promise later rejects, has that
error caught and logged by the bus itself — tagged with the event name and the
subscribing module — never propagated back to the emitting call and never capable of
affecting the emitter's own control flow. This is why §12.5's worked example enqueues
a job from inside a listener rather than awaiting anything from `emit()` directly: the
emitting service is finished the instant `emit()` returns, regardless of how long the
listener's own async work takes to finish.

### 18.5 Cycle Detection — Bounded Emit Depth

A listener that itself emits an event, whose own listener emits the original event
again, would recurse indefinitely without a guard. `InternalEventBus` tracks emit
depth per logical emit-chain (not globally — two unrelated top-level emits each start
their own chain at depth 0) and enforces `EVENT_BUS_MAX_EMIT_DEPTH`, defaulting to
`20`. Exceeding it throws `EventCycleError`, carrying the full chain of event names
that produced the overflow, logged at `error` level with the originating module
identified — breaking the cycle deterministically rather than allowing a stack
overflow to crash the process.

### 18.6 The Event Catalog as a Contract

A module's manifest `eventsCatalog` field is not optional documentation — it is the
authoritative, machine-checked declaration of every domain event that module may emit.
Two things depend on it being accurate: the `EventCatalog` type merge described in
§18.4, which makes an undeclared event's payload untyped (and therefore a TypeScript
error for any subscriber trying to use it meaningfully), and the community submission
review's Gate 4 (§16.4), which cross-checks emitted events against declared ones for
any third-party module. Keeping `eventsCatalog` current is, in effect, the same
obligation as keeping a public API's documentation current — for internal event
consumers, it is the API.

## 19. Middleware Pipeline

### 19.1 The Onion Model

Every command execution passes through a composed chain of middleware before reaching
`Command.execute()`, structured as nested layers — the classic "onion" composition
where each layer wraps the next, calling `next()` to proceed inward and running any of
its own post-processing logic on the way back out once `next()` resolves.

```
DIAGRAM 19-A — Onion Composition

  ┌─ Maintenance Mode ─────────────────────────────────────────────┐
  │ ┌─ Admin Gate ─────────────────────────────────────────────┐   │
  │ │ ┌─ Trace ─────────────────────────────────────────────┐  │   │
  │ │ │ ┌─ Auth ─────────────────────────────────────────┐  │  │   │
  │ │ │ │ ┌─ ... (Guild Config, Locale, Rate Limit,        │  │  │   │
  │ │ │ │ │      Permission, RBAC, Cooldown, Defer,        │  │  │   │
  │ │ │ │ │      Analytics, module/command-scoped) ...     │  │  │   │
  │ │ │ │ │        ┌───────────────────────┐              │  │  │   │
  │ │ │ │ │        │  Command.execute()      │              │  │  │   │
  │ │ │ │ │        └───────────────────────┘              │  │  │   │
  │ │ │ │ └───────── .after() runs on the way back out ────┘  │  │   │
  │ │ │ └───────────────────────────────────────────────────┘  │   │
  │ │ └───────────────────────────────────────────────────────┘   │
  │ └───────────────────────────────────────────────────────────┘   │
  └───────────────────────────────────────────────────────────────┘

  Any layer can call reject(reason) instead of next() — execution short-circuits
  outward immediately; only that layer's own .after() (if any) and the outermost
  cleanup run. A deeper layer, and Command.execute() itself, never runs.
```

### 19.2 Built-In Middleware Stages — Complete Reference

Priority is a signed integer; lower numbers run first (outermost). Ties resolve in
manifest-declaration order.

```
TABLE 19-A — Built-In Stages

┌──────┬───────────────────────┬─────────────────────────────────────────────┐
│Prior.│ Middleware               │ Behavior on Failure / Abort                    │
├──────┼───────────────────────┼─────────────────────────────────────────────┤
│ -20  │ MaintenanceModeMiddleware │ Global maintenance flag set → every command    │
│      │                         │ short-circuits with a maintenance-notice reply │
│      │                         │ (§28.6), except a small allow-list of          │
│      │                         │ Admin-tier commands that manage maintenance    │
│      │                         │ mode itself                                    │
│  -10 │ AdminTierGateMiddleware   │ Admin-tier only. Owner check fails → SILENT     │
│      │                         │ reject, no reply, warn-level log (§13.6 Layer  │
│      │                         │ 2)                                             │
│    0 │ TraceMiddleware           │ Opens the root span, generates                │
│      │                         │ correlationId, binds the child logger. Never   │
│      │                         │ aborts.                                        │
│   10 │ AuthMiddleware             │ Resolves interaction.user into an internal      │
│      │                         │ user record; guildOnly command from a DM →     │
│      │                         │ reject with a "server only" ephemeral reply    │
│   20 │ GuildConfigMiddleware      │ Loads per-guild config (§6.4's cascade) into    │
│      │                         │ context.guildConfig. A load failure degrades   │
│      │                         │ to defaults rather than aborting — a config    │
│      │                         │ outage never blocks every command guild-wide   │
│   30 │ LocaleMiddleware           │ Binds context.locale from guild config or       │
│      │                         │ Discord's own locale hint. Never aborts.       │
│   40 │ RateLimitMiddleware        │ Atomic Redis check-and-increment (§21.5).      │
│      │                         │ Over limit → reject with a cooldown-remaining  │
│      │                         │ ephemeral reply                                │
│   50 │ PermissionMiddleware       │ Discord bitfield check — permission engine     │
│      │                         │ Layer 5 (§21.2). Fails → reject, ephemeral     │
│      │                         │ "missing permission" reply naming the specific │
│      │                         │ permission                                     │
│   60 │ RBACMiddleware             │ Dumby role check — Layer 6 (§21.2). Skipped     │
│      │                         │ entirely for Core-tier commands (§13.2). Fails │
│      │                         │ → reject, ephemeral reply                      │
│   70 │ CooldownMiddleware         │ Per-user-per-command cooldown, distinct from    │
│      │                         │ the guild/user rate limiter above. Fails →     │
│      │                         │ reject with remaining-time reply               │
│   80 │ DeferMiddleware            │ Calls interaction.deferReply() if              │
│      │                         │ command.requiresDefer resolves true. Never     │
│      │                         │ aborts.                                        │
│   90 │ AnalyticsMiddleware        │ Records invocation start. Never aborts.        │
│ 100+ │ Module-global middleware   │ Manifest-declared, global: true — applies       │
│      │                         │ to every command in every module, not just     │
│      │                         │ its own                                        │
│ 200+ │ Command-scoped middleware  │ Declared on the individual command's own        │
│      │                         │ middleware array                               │
└──────┴───────────────────────┴─────────────────────────────────────────────┘
```

### 19.3 Custom Middleware Authoring

```
CODE REFERENCE 19-A — BaseMiddleware Shape

abstract class BaseMiddleware {
  abstract priority: number;

  abstract execute(
    context: CommandContext,
    next: () => Promise<void>,
  ): Promise<void>;

  // Optional — runs on the way back out, only if next() was called and
  // resolved (i.e. never runs if this layer or a deeper one rejected)
  async after?(context: CommandContext): Promise<void>;
}

// Example: a module-scoped middleware enforcing a feature flag
class RequiresPremiumMiddleware extends BaseMiddleware {
  priority = 150;

  async execute(context: CommandContext, next: () => Promise<void>) {
    if (!context.guildConfig.premiumEnabled) {
      throw new PermissionDeniedError('REQUIRES_PREMIUM');
    }
    await next();
  }
}
```

A middleware never calls `next()` more than once, and never mutates
`CommandContext` fields it does not own (a module-scoped middleware writes only to
`context.metadata`, never to a core-populated field like `context.rbacRole`) — both
constraints are enforced by lint rule rather than left to convention.

### 19.4 The Root Error Boundary

`MiddlewarePipeline` wraps the entire onion — every built-in stage, every
module-global and command-scoped middleware, and `Command.execute()` itself — in one
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
  YES        NO
   │          │
   ▼          ▼
  Use its declared        Treat as UNEXPECTED:
  user-facing message      • Log at 'error' with full
  and HTTP-equivalent        stack trace and context
  status code               • Generic "Something went
   │                          wrong" ephemeral reply —
   │                          never a raw stack trace or
   │                          internal message shown to
   │                          the user
   │                        • Increment
   │                          dumby_errors_unexpected_total
   ▼                       ▼
  Reply to the interaction (edit the deferred reply if
  DeferMiddleware already ran; otherwise a fresh ephemeral reply)
        │
        ▼
  TraceMiddleware's .after() closes the span with an error status
  AnalyticsMiddleware's .after() records the failed outcome
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

## 20. Interaction & Component Handling

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
             │           │           │
             │           │           └─ short opaque reference (a case ID, an
             │           │              index — never a full JSON blob; large
             │           │              context is looked up from the database
             │           │              using this reference, not encoded inline)
             │           └─ identifies which registered handler class parses
             │              the payload and executes
             └─ owning module — InteractionRegistry routes by this prefix
                before any handler-specific parsing happens

  A handler registers ONE parse(customId) => context function and ONE
  execute(interaction, context) function; InteractionRegistry does the
  prefix-based dispatch, then calls parse() to reconstruct context, then
  execute().
```

Encoding a database reference rather than the full state keeps every `custom_id` well
under Discord's limit regardless of how much context a component's action logically
needs, and — just as importantly — means a component's behavior always reflects the
database's *current* state at click time rather than a stale snapshot serialized when
the component was first rendered, which matters whenever the underlying data (a case's
status, a poll's vote tally) can change between when a message is sent and when a user
eventually interacts with it.

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

### 20.3 Authorization Re-Check on Component Interactions

A button rendered in a message is visible, and clickable, by anyone who can see that
channel — not only the user the original command was invoked by. Any component whose
action should be restricted to the original invoker, or to a specific role, re-checks
that authorization explicitly inside its own `execute()`, using the same
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
than issuing a fresh database query on every keystroke; a handler that cannot resolve
suggestions from cache in time returns an empty list rather than risk the window
closing with no response at all.

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

## 21. Permission & Authorization Engine

### 21.1 Purpose & the Seven-Layer Model

`PermissionResolver` is the single, unified engine deciding whether a given user, in a
given guild and channel, is authorized to invoke a given command — the one source of
truth Principle P13 requires for this concern. Every surface that needs an
authorization answer, the command pipeline and the MDIS dashboard API alike, calls
through this same resolver rather than maintaining a parallel check of its own (§21.7).

Resolution proceeds through seven ordered layers. Each layer can produce a definitive
ALLOW (short-circuiting every remaining layer), a definitive DENY (short-circuiting
every remaining layer), or PASS (defer to the next layer). Only if every layer passes
without a definitive answer does the framework fall through to the final default:
allow.

```
DIAGRAM 21-A — Seven-Layer Resolution Flow

  Layer 1: Global Bot Owner Override
    user.id ∈ BOT_OWNER_IDS?  ── YES ──► ALLOW (bypass everything below)
        │ NO
        ▼
  Layer 2: Blacklist Check
    user or guild on the global block list?  ── YES ──► DENY (silent, logged)
        │ NO
        ▼
  Layer 3: Guild & Module Availability
    guild known + module active for this guild? (§13.4's read path;
    fail-closed on data unavailability)  ── NO ──► DENY (silent, log warn)
        │ YES
        ▼
  Layer 4: Channel Restriction
    command/module restricted to an allow-list or deny-list of channels
    in this guild's config?  ── VIOLATED ──► DENY (ephemeral notice)
        │ PASS
        ▼
  Layer 5: Discord Native Permission Bitfield
    invoking member holds every permission in command.permissions.discord?
      ── NO ──► DENY (ephemeral, names the missing permission)
        │ YES
        ▼
  Layer 6: Dumby RBAC Role         [SKIPPED for Core tier — §13.2]
    resolved RBAC role ≥ command.permissions.rbac in the hierarchy?
      ── NO ──► DENY (ephemeral)
        │ YES
        ▼
  Layer 7: Explicit Grant Override
    a specific permit/blacklist/whitelist grant targeting this user or
    role exists for this command?  ── grant says DENY ──► DENY
                                    ── grant says ALLOW ──► ALLOW
        │ no grant on record
        ▼
      ALLOW (default)
```

### 21.2 Layer-by-Layer Reference

```
TABLE 21-A — Fail-Open vs. Fail-Closed by Layer

┌───┬──────────────────────────┬──────────────┬───────────────────────────┐
│ # │ Layer                       │ On Data        │ Rationale                    │
│   │                            │ Unavailability │                              │
├───┼──────────────────────────┼──────────────┼───────────────────────────┤
│ 1 │ Bot owner override           │ N/A — env var,  │ A static list; no data       │
│   │                            │ always resolvable│ dependency to fail on         │
│ 2 │ Blacklist                    │ FAIL CLOSED     │ Cache/DB unreachable ⇒ deny  │
│   │                            │ (deny)          │ — never risk letting a       │
│   │                            │                │ blocked actor through        │
│ 3 │ Guild & module availability   │ FAIL CLOSED     │ §13.4 — a database outage    │
│   │                            │ (deny)          │ never grants access to a     │
│   │                            │                │ disabled module               │
│ 4 │ Channel restriction           │ FAIL OPEN       │ An unreadable restriction      │
│   │                            │ (allow)         │ list degrades to "no          │
│   │                            │                │ restriction" rather than       │
│   │                            │                │ blocking every channel        │
│ 5 │ Discord permission bitfield   │ FAIL CLOSED     │ Sourced directly from the     │
│   │                            │ (deny)          │ interaction payload itself —  │
│   │                            │                │ never actually "unavailable"   │
│ 6 │ Dumby RBAC role               │ FAIL CLOSED,    │ An unresolvable role           │
│   │                            │ role → MEMBER   │ degrades to the lowest         │
│   │                            │                │ standing non-restricted role,  │
│   │                            │                │ never to an elevated one       │
│ 7 │ Explicit grant override       │ FAIL OPEN (no    │ An unreadable grant table      │
│   │                            │ grant applies)  │ falls through to Layer 6's     │
│   │                            │                │ outcome rather than blocking   │
│   │                            │                │ everything                     │
└───┴──────────────────────────┴──────────────┴───────────────────────────┘
```

The asymmetry above is deliberate, not accidental: layers that gate access to
something potentially destructive or globally scoped (blacklist, module availability)
fail closed; layers that merely refine an already-granted access (channel scoping,
grant overrides) fail open, so an infrastructure hiccup in a secondary system degrades
a command's precision rather than taking down its basic availability.

### 21.3 RBAC Roles

Six roles form a strict hierarchy, resolved once per interaction by `RBACService` and
cached on `CommandContext.rbacRole` for the remainder of that request.

```
TABLE 21-B — RBAC Role Hierarchy (highest to lowest)

┌────────────┬──────────────────────────────────────────────────────────┐
│ Role         │ Typical Resolution                                          │
├────────────┼──────────────────────────────────────────────────────────┤
│ OWNER        │ The guild's Discord-native owner, always, regardless of any  │
│            │ RBAC group configuration                                    │
│ ADMIN        │ Mapped via an RBAC group (§21.4) from one or more Discord     │
│            │ roles a guild administrator designates                      │
│ MOD          │ Mapped via an RBAC group from designated moderator roles      │
│ HELPER        │ Mapped via an RBAC group from a lighter-weight support tier   │
│ MEMBER        │ The default for any authenticated guild member with no       │
│            │ elevated group membership                                    │
│ RESTRICTED    │ Explicitly assigned — a member flagged as restricted by an   │
│            │ RBAC group or grant; ranks below MEMBER, denied by default    │
│            │ wherever a command's permissions.rbac requires MEMBER or       │
│            │ higher                                                       │
└────────────┴──────────────────────────────────────────────────────────┘
```

A command declaring `permissions.rbac: 'MOD'` is satisfied by `MOD`, `ADMIN`, or
`OWNER` — the hierarchy is inclusive upward, exactly like Discord's own native
permission model, so module authors reason about it the same way they already reason
about Discord permissions.

### 21.4 RBAC Groups & Sets

A guild does not configure RBAC role-by-role for every Discord role it has — it
configures **Groups**: a named mapping from one or more Discord role IDs to a single
Dumby RBAC role. A guild with both a "Head Moderator" and "Trial Moderator" Discord
role can map both into one `MOD`-level group, or split them across `ADMIN` and
`HELPER` respectively — the mapping is entirely the guild's own choice, resolved fresh
against the invoking member's current Discord roles on every interaction rather than
cached indefinitely, so a role change in Discord takes effect on the member's very
next command.

A **Set** bundles multiple Layer-7 grants (§21.6) — a curated collection of specific
permit/blacklist/whitelist rules an administrator can apply to a group in one action,
rather than authoring each grant individually. Sets exist purely for administrative
convenience; they resolve to the identical individual grants Layer 7 evaluates either
way.

### 21.5 Rate Limiting

Rate limiting is a distinct concern from authorization — a user can be fully
authorized to run a command and still be temporarily throttled. `RateLimitMiddleware`
(priority 40, ahead of the permission layers) performs an atomic Redis
check-and-increment against two independent windows simultaneously:

```
TABLE 21-C — Rate Limit Defaults

┌─────────────────────────┬──────────┬────────────────────────────────┐
│ Dimension                  │ Default    │ Behavior                          │
├─────────────────────────┼──────────┼────────────────────────────────┤
│ Per-user window             │ 60,000 ms  │ Max 10 commands per user in the   │
│                            │            │ rolling window                    │
│ Per-guild window             │ 60,000 ms  │ Max 100 commands per guild in the │
│                            │            │ rolling window                    │
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

### 21.6 Explicit Grants — Layer 7 in Detail

A grant is the most specific, most overriding unit of authorization the engine
recognizes — targeted at one user or one Discord role, for one command or one entire
module, in one guild.

```
TABLE 21-D — Grant Types

┌────────────┬───────────────────────────────────────────────────────────┐
│ Grant Type   │ Effect                                                        │
├────────────┼───────────────────────────────────────────────────────────┤
│ permit        │ Explicitly allows, overriding a Layer 6 RBAC denial for this   │
│              │ specific target — e.g. one trusted MEMBER granted access to a  │
│              │ MOD-gated command without a full role change                    │
│ blacklist     │ Explicitly denies, overriding a Layer 6 RBAC allow for this    │
│              │ specific target — e.g. one ADMIN specifically barred from a     │
│              │ particular command after a trust incident, without demoting     │
│              │ their whole role                                               │
│ whitelist     │ Restricts a command to ONLY explicitly whitelisted targets,     │
│              │ regardless of RBAC role — used for narrow, break-glass-style    │
│              │ commands where role membership alone shouldn't be sufficient     │
│ quota         │ A usage ceiling over a rolling window, distinct from the        │
│              │ global rate limiter (§21.5) — e.g. a target permitted to use a  │
│              │ command at most 5 times per day                                │
│ cooldown      │ A target-specific cooldown duration overriding the command's    │
│              │ own default cooldown field                                     │
└────────────┴───────────────────────────────────────────────────────────┘
```

Grants are the mechanism an administrator reaches for when the blunt instrument of
"change this person's role" is the wrong tool — precision authorization without
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

## 22. Power Engine Panel, CLAI & Credentials Service

### 22.1 Why These Are Separate Services, Not Modules

Three capabilities in this architecture sit outside the module system entirely rather
than being expressed as an Admin-tier module: the Power Engine Panel (global
administrative authority), CLAI (an operator terminal), and the Credentials Service
(shared secret issuance). Each is deployed as its own process (§7.5), sharing only the
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
guild, module, developer, or command, fleet-wide, instantly, regardless of what any
individual guild administrator or module author has configured.

PEP exposes its capabilities as a catalog of **callable functions** — each with a
name, a typed parameter schema, and a description — rather than a fixed set of
hardcoded terminal commands. This shape is deliberate: the identical schema format
serves PEP's REST API (§44.6), CLAI's terminal (§22.5), and, because the schema shape
already matches what a tool-calling-capable interface expects, it leaves the door open
to a structured natural-language front end being layered on top later without any
change to PEP's own implementation — the function catalog is the single contract every
future caller, human or automated, is validated against identically.

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
  One of 17 control domain functions executes
        │
        ▼
  Mandatory audit_logs write (source: 'PEP'), BEFORE any response is returned
        │
        ▼
  Result returned to caller
```

### 22.3 PEP Control Domain Catalog

Seventeen control domains in total: four original, foundational domains, and thirteen
extended domains that reach into every other core subsystem this reference documents.

```
TABLE 22-A — The Four Original Control Domains

┌──────────────────┬────────────────────────────────────────────────────┐
│ Function            │ Effect                                                │
├──────────────────┼────────────────────────────────────────────────────┤
│ suspendGuild        │ Immediately blocks the bot from responding to ANY      │
│                    │ interaction originating in the named guild, fleet-     │
│                    │ wide, regardless of that guild's own configuration     │
│ suspendModule        │ Immediately disables the named module fleet-wide,      │
│                    │ overriding every individual guild's own enabled state  │
│                    │ for it — a global kill switch above guild_module_      │
│                    │ states                                                │
│ suspendDeveloper     │ Blocks every module authored by the named devId from   │
│                    │ deploying further versions AND, at the operator's       │
│                    │ discretion, force-disables their already-live modules   │
│ suspendCommand       │ Immediately disables one specific command fleet-wide,  │
│                    │ across every module and every guild — the narrowest    │
│                    │ of the four, for a single misbehaving command rather   │
│                    │ than an entire module                                  │
└──────────────────┴────────────────────────────────────────────────────┘
```

```
TABLE 22-B — The Thirteen Extended Control Domains, By Subsystem

┌──────────────────────┬──────────────────────────────────────────────────┐
│ Subsystem Reached       │ Function(s)                                          │
├──────────────────────┼──────────────────────────────────────────────────┤
│ Maintenance Mode (§28.6) │ enterMaintenanceMode / exitMaintenanceMode             │
│ Cache (§25)              │ flushCacheNamespace — targeted invalidation of an       │
│                        │ entire key prefix, for recovering from a stale-cache    │
│                        │ incident without a full process restart                 │
│ Job Queue (§29)           │ pauseQueue / resumeQueue / requeueDeadLetter           │
│ Rate Limits (§21.5)       │ overrideRateLimit — temporary per-guild or per-user     │
│                        │ exception, for a legitimate high-volume use case that   │
│                        │ would otherwise be throttled                            │
│ Shard Management (§6.5)   │ restartShardGroup — targeted restart of one shard      │
│                        │ range without a fleet-wide rolling update                │
│ Deployment (Swastik, §15) │ triggerCoreRestart / rollbackModuleVersion — an        │
│                        │ operator-initiated equivalent of Swastik's own          │
│                        │ scheduled and hot-swap paths                            │
│ Persona Management (§35) │ suspendPersona — the Persona-scoped equivalent of        │
│                        │ suspendGuild/suspendModule, reachable independently     │
│                        │ per additional bot identity                             │
│ Audit (§24.2)             │ queryAuditLog — structured search across the shared     │
│                        │ audit_logs table, the same table every domain above      │
│                        │ writes to                                               │
│ Marketplace (§16)         │ revokeModuleSignature — the mechanism behind §16.4's    │
│                        │ revocation path                                          │
│ Credentials (§22.7)       │ rotateCredential — force-rotation of a specific issued   │
│                        │ dev ID or service credential ahead of its natural cycle │
└──────────────────────┴──────────────────────────────────────────────────┘
```

Every one of the seventeen writes an unconditional, reasoned `audit_logs` entry —
tagged `source: 'PEP'` — before returning a result to its caller, with no exception:
Principle P14's "deliberate, logged intervention" is enforced structurally by making
the audit write a precondition of the function completing at all, not a best-effort
side effect that could be skipped under load or failure.

### 22.4 PEP Deployment & Access Model

PEP runs with no gateway connection and no loaded modules — it never speaks Discord's
Gateway protocol at all, only its own authenticated REST surface (§44.6). Access
requires a credential issued by the Credentials Service (§22.7) and bound to a named
operator identity, distinct from — and held to at least the same scrutiny as —
Admin-tier's `BOT_OWNER_IDS` check (§13.6): the two overlap in practice for a typical
deployment's smallest operator set, but PEP's own access list is independently
configured rather than inherited automatically from the bot-owner list, since not
every Admin-tier-capable Discord user necessarily needs fleet-wide REST access to
PEP's control domains.

### 22.5 CLAI — Purpose & Access Model

CLAI (Command Line Administrative Interface) is an SSH-hosted operator terminal
providing direct, interactive access to PEP's function catalog from outside Discord
entirely. Its defining property is independence from every other part of the stack
that could be the thing currently broken: CLAI requires only SSH reachability and
PEP's own health, meaning it remains a viable intervention path even when the
Discord gateway connection is down, a specific shard group is unresponsive, or a
core restart is mid-rollout — exactly the failure modes in which an operator most
needs a way in that does not itself depend on the thing failing.

Authentication is SSH public-key only — no password path exists — with each
operator's key registered individually and revocable independently, so removing one
compromised or departed operator's access never requires rotating a shared secret
every other operator also relies on.

### 22.6 CLAI Session Model & Command Surface

A CLAI session is a REPL: a connecting operator is dropped into an interactive prompt
that resolves each typed command to a call against PEP's function catalog, rendering
results in human-readable form (tables for list-shaped results, formatted diffs for
state changes) rather than raw JSON — the terminal is a presentation layer over PEP's
functions, not an independent capability surface with its own logic. Every command a
CLAI session issues carries the connecting operator's identity through to PEP's own
audit write, so `audit_logs` distinguishes an intervention made through CLAI from one
made through PEP's REST API directly, even though both ultimately invoke the identical
function.

```
TABLE 22-C — CLAI Session Properties

┌────────────────────┬─────────────────────────────────────────────────┐
│ Property              │ Behavior                                             │
├────────────────────┼─────────────────────────────────────────────────┤
│ Idle timeout           │ Session terminates automatically after a bounded     │
│                      │ idle period — no indefinitely-open privileged         │
│                      │ terminal left unattended                              │
│ Command history         │ Persisted per-operator for the operator's own        │
│                      │ later reference; never shared across operators        │
│ Destructive-action       │ A function whose effect is broad or irreversible      │
│ confirmation           │ (suspendGuild, suspendDeveloper with force-disable,   │
│                      │ triggerCoreRestart) requires an explicit typed          │
│                      │ confirmation matching the target's name — the same     │
│                      │ discipline Principle P10 (§3) requires of destructive  │
│                      │ operations anywhere else in the system                 │
└────────────────────┴─────────────────────────────────────────────────┘
```

### 22.7 Credentials Service — Shared Issuance Path

The Credentials Service is the single, shared issuance path for every credential this
architecture hands out at runtime — Swastik's developer dev IDs and build IDs (§15.6),
PEP and CLAI operator access credentials, and any internal service-to-service
authentication token one control-plane process needs to call another. Consolidating
issuance into one service, rather than letting Swastik, PEP, and CLAI each mint their
own credentials independently, is what makes Principle P13 hold for secret issuance
specifically: exactly one place generates, hashes, and revokes credentials, so an
audit of "every credential this system has ever issued" is one table, not a
reconciliation across three.

```
TABLE 22-D — Credential Handling Discipline

┌───────────────────────┬─────────────────────────────────────────────┐
│ Rule                     │ Applied Uniformly To                             │
├───────────────────────┼─────────────────────────────────────────────┤
│ Generated cryptographically│ Every credential this service issues, no        │
│ random                    │ exceptions                                     │
│ Stored only as an Argon2id │ The raw value is never persisted anywhere,       │
│ hash                       │ including in this service's own database        │
│ Displayed exactly once,    │ At issuance time only; a lost credential is      │
│ at issuance                │ rotated, never retrieved                        │
│ Always transmitted via      │ Never in a URL, a query string, or a log line —  │
│ Authorization header       │ the same placement discipline as a Discord bot   │
│                           │ token (§32.1)                                   │
│ Independently revocable    │ Revoking one credential never requires rotating  │
│                           │ any other credential the same service has issued │
└───────────────────────┴─────────────────────────────────────────────┘
```

### 22.8 How the Control Plane Fits Together

```
DIAGRAM 22-B — Control-Plane Services, Complete Relationship

  ┌─────────────────────┐
  │  Credentials Service   │◄───────────────┐  issues dev IDs, build IDs,
  │  (src/entry/            │                │  operator credentials, and
  │   credentials.ts)       │                │  service-to-service tokens
  └──────────┬───────────┘                │  to every service around it
             │ issues to                     │
   ┌─────────┼─────────────────┬───────────┘
   │         │                 │
   ▼         ▼                 ▼
┌──────┐ ┌───────────┐ ┌──────────────┐
│Swastik│ │    PEP     │ │     CLAI       │
│(§15)  │ │ (function   │ │ (SSH terminal, │
│       │ │  catalog,   │ │  calls PEP's   │
│       │ │  §22.2)     │ │  functions)    │
└───┬───┘ └─────┬──────┘ └───────┬───────┘
    │           │                │
    │  each independently deployed; each shares only the underlying
    │  PostgreSQL primary and Redis instance with the bot process —
    │  never the bot's gateway connection or module registry
    │           │                │
    ▼           ▼                ▼
┌───────────────────────────────────────────────────────────┐
│              PostgreSQL (audit_logs, shared state)             │
│              Redis (cache invalidation signals, pub/sub)       │
└───────────────────────────────────────────────────────────┘
                     ▲
                     │ the bot process itself (src/entry/main.ts) reads/
                     │ writes the same stores, and is the ONLY one of the
                     │ five processes with a live Discord gateway connection
                     │ and a loaded module registry
              ┌──────┴──────┐
              │  Bot Process   │
              │  (main.ts)     │
              └──────────────┘
```

Every arrow in this diagram terminates at PostgreSQL or Redis — never at another
control-plane service's in-process state — which is precisely what allows each of
these five processes to fail, restart, or scale independently of the other four
without any of them needing to know the others exist beyond the shared data layer.

# PART V — DATA & STATE

---

## 23. Configuration Management

### 23.1 Three Configuration Scopes

```
TABLE 23-A — Configuration Scope Reference

┌──────────────────┬───────────────────┬────────────┬───────────────────────┐
│ Scope               │ Storage              │ Mutable at  │ Validated               │
│                    │                     │ Runtime?    │                        │
├──────────────────┼───────────────────┼────────────┼───────────────────────┤
│ Process — Core       │ Environment          │ No — a       │ Bootstrap Stage 02,     │
│                    │ variables             │ change       │ against the root Zod     │
│                    │                     │ requires a  │ schema                   │
│                    │                     │ redeploy    │                        │
│ Process — Module     │ Environment          │ No — same   │ Bootstrap Stage 11,     │
│                    │ variables, module-    │ as above    │ against each module's    │
│                    │ name-prefixed         │            │ own declared Zod schema │
│ Guild                │ PostgreSQL            │ Yes — a      │ On every write, against │
│                    │ (guild_configs        │ command or  │ the same schema the      │
│                    │ JSONB document)       │ MDIS write  │ read path deserializes  │
│                    │                     │ takes        │ against                 │
│                    │                     │ effect       │                        │
│                    │                     │ immediately │                        │
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

  BOT_TOKEN: z.string().min(1),
  BOT_OWNER_IDS: z.string().transform(s => s.split(',')),   // snowflakes, CSV
  DEV_GUILD_ID: z.string().regex(/^\d{17,20}$/),

  DATABASE_URL: z.string().url(),
  DATABASE_POOL_MAX: z.coerce.number().default(10),
  DATABASE_STATEMENT_TIMEOUT_MS: z.coerce.number().default(10_000),
  DATABASE_REPLICA_URLS: z.string().optional(),               // CSV, optional
  DATABASE_REPLICA_MAX_LAG_MS: z.coerce.number().default(1_000),

  REDIS_URL: z.string().url(),
  HEALTH_PORT: z.coerce.number().default(3000),

  RATE_LIMIT_USER_WINDOW_MS: z.coerce.number().default(60_000),
  RATE_LIMIT_USER_MAX: z.coerce.number().default(10),
  RATE_LIMIT_GUILD_WINDOW_MS: z.coerce.number().default(60_000),
  RATE_LIMIT_GUILD_MAX: z.coerce.number().default(100),

  CACHE_L1_MAX_ENTRIES: z.coerce.number().default(5_000),
  CACHE_L1_MAX_BYTES: z.coerce.number().default(50 * 1024 * 1024),

  TRACE_SAMPLE_RATE: z.coerce.number().min(0).max(1).default(0.1),
  SLOW_QUERY_THRESHOLD_MS: z.coerce.number().default(500),
  CRITICAL_QUERY_THRESHOLD_MS: z.coerce.number().default(2_000),
  EVENT_LOOP_LAG_SHED_THRESHOLD_MS: z.coerce.number().default(50),

  EVENT_BUS_MAX_EMIT_DEPTH: z.coerce.number().default(20),
  SHARD_LOCK_HEARTBEAT_MS: z.coerce.number().default(10_000),
  SHARD_LOCK_RETRY_MS: z.coerce.number().default(2_000),
});
```

A missing required field or a value failing its refinement (an out-of-range number, a
malformed URL) produces a field-by-field Zod error printed to stderr before the
process exits — never a downstream `undefined` surfacing as a confusing runtime
symptom three subsystems away from its actual cause. The full variable reference,
every default included, is consolidated in Appendix A (§48.1).

### 23.3 Guild-Level Configuration

`guild_configs` holds one row per guild, keyed by `guildId`, with a `settings` JSONB
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
  locale: z.string().default('en-US'),
  timezone: z.string().default('UTC'),
  prefix: z.string().max(5).optional(),   // display-only convenience value;
                                           // never a functional command prefix (§4)
  moderation: z.object({
    logChannelId: z.string().regex(/^\d{17,20}$/).optional(),
    muteRoleId: z.string().regex(/^\d{17,20}$/).optional(),
  }).default({}),
  channelRestrictions: z.record(z.string(), z.object({
    mode: z.enum(['allow', 'deny']),
    channelIds: z.array(z.string()),
  })).default({}),
  premiumEnabled: z.boolean().default(false),
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

## 24. Database Architecture

### 24.1 Why PostgreSQL, Restated

§5.4 covers the storage role split at the stack-decision level; the concrete reasons
PostgreSQL specifically — rather than a document store or a lighter embedded database
— fits this architecture: **JSONB** gives `guild_configs` schema flexibility without
sacrificing relational integrity for every table that *is* strictly relational (cases,
audit entries, module state); **transactions** guarantee a multi-table write (a
moderation case plus its infraction record plus an audit entry) either fully commits
or fully rolls back; **row-level locking** (`SELECT ... FOR UPDATE`) prevents two
concurrent commands from double-processing the same target row — two moderators
clicking "Ban" on the same user within the same second resolve deterministically
rather than racing; and **`LISTEN`/`NOTIFY`** provides a lightweight, no-extra-
infrastructure channel for cross-process cache-invalidation signaling as a fallback
alongside Redis pub/sub (§25.4).

### 24.2 Complete Schema Reference

```
SCHEMA 24-A — Core Tables (Owned by the Application Core, Never a Module)

guilds
  id                snowflake  PK
  name               string
  joinedAt            timestamptz
  leftAt              timestamptz, nullable   -- non-null ⇒ bot no longer present;
                                              -- Layer 3 (§21.2) denies on this
  shardId             integer

users
  id                 snowflake  PK
  globalBanned        boolean    default false  -- platform-wide, independent of
                                                 -- any guild-scoped blacklist entry

guild_configs
  guildId             snowflake  PK, REFERENCES guilds(id)
  settings            jsonb      -- validated against the schema in §23.3
  createdAt / updatedAt / createdBy / updatedBy    -- standard audit columns (§24.5)

guild_roles                                        -- RBAC Groups (§21.4)
  id                 uuid       PK
  guildId             snowflake  REFERENCES guilds(id)
  groupName            string
  dumbyRole            enum       -- OWNER|ADMIN|MOD|HELPER|MEMBER|RESTRICTED
  discordRoleIds        snowflake[]
  createdAt / updatedAt / createdBy / updatedBy

guild_module_states                                 -- full reference at §13.4
  guildId, moduleSlug   composite PK
  tier / status / wasStandardDefault / installedAt / disabledAt / dataRetentionPolicy
  createdAt / updatedAt / createdBy / updatedBy

grants                                              -- Layer 7 explicit overrides (§21.6)
  id                 uuid       PK
  guildId             snowflake
  targetType           'user' | 'role'
  targetId             snowflake
  scopeType            'command' | 'module'
  scopeName            string
  grantType            'permit'|'blacklist'|'whitelist'|'quota'|'cooldown'
  grantValue           jsonb      -- e.g. { "maxPerDay": 5 } for a quota grant
  createdAt / updatedAt / createdBy / updatedBy

blocked_users                                       -- Layer 2 blacklist (§21.2)
  id                 uuid       PK
  userId               snowflake
  guildId              snowflake, nullable   -- null ⇒ global platform-wide block
  reason               text
  blockedBy             snowflake
  blockedAt             timestamptz
  expiresAt             timestamptz, nullable

audit_logs                                          -- append-only, never updated
  id                 uuid       PK
  source               string     -- 'PEP' | 'SWASTIK' | 'CLAI' | 'GUILD' |
                                  -- 'MDIS' | a module's own name
  actorId               snowflake or service-identity string
  action                string
  targetType / targetId
  beforeState / afterState    jsonb, nullable each
  reason               text, nullable
  timestamp             timestamptz

developers                                          -- Swastik (§15.6–§15.7)
  devId                string     PK (opaque identifier; the secret itself is
                                  Argon2id-hashed, never stored raw)
  username              string
  approvalStatus         'pending' | 'approved' | 'declined'
  registeredAt / approvedAt / approvedBy

builds                                              -- Swastik (§15.8)
  buildId               string     PK
  devId                 string     REFERENCES developers(devId)
  moduleSlug             string
  version               string     -- semver
  validationStatus        'pending'|'passed'|'rejected'
  promotedAt              timestamptz, nullable

marketplace_listings                                -- Marketplace catalog (§16.4)
  moduleSlug             string     PK
  devId                 string     REFERENCES developers(devId)
  category               enum       -- audio|community|security|integrations|utility
  description             string
  signatureValid           boolean    -- false ⇒ revoked (§16.4); load refused
  listedAt

metering_usage_daily                                -- MTP (§31.4)
  guildId, date          composite PK
  metricUnitsConsumed      integer
  breakdown              jsonb      -- per-module contribution to the day's total
```

Every module-owned table — `reminders`, `cases`, `infractions`, and every table any
other module's migrations create — lives in this same database but is never listed
here: it belongs exclusively to its owning module (Principle P2), created by that
module's own migrations (§24.4), and is invisible to this reference's core schema
precisely because the core has no business knowing it exists beyond the generic
migration-tracking table every module's migrations register against.

### 24.3 The Repository Pattern

`BaseRepository<T>` is the sole abstraction over Knex — every module's own repository
classes extend it, inheriting a typed CRUD surface rather than hand-writing query
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
  // same connection/replica logic as everything above — never raw pg
  protected queryBuilder(): Knex.QueryBuilder<T>;
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
group in declared order, tracked in a shared `knex_migrations` ledger table recording
what has already run so re-running the process never re-applies a completed
migration. Every migration file exports both `up()` and `down()` — a migration without
a working `down()` fails Gate 4 of the community review pipeline (§16.4) for any
third-party submission, and is a code-review blocker for a first-party one, since an
irreversible migration is exactly the kind of one-way door Principle P10 (§3) exists
to prevent.

### 24.5 Standard Audit Columns

Every entity table in the system — core-owned and module-owned alike — carries the
same four columns, in the same order, with the same semantics, so "who created or last
touched this row, and when" is answerable identically regardless of which table is
being inspected:

```
createdAt   timestamptz, not null, default now()
updatedAt   timestamptz, not null, default now(), bumped by application code
            (never a database trigger — the application layer is the one place
            that knows *why* an update happened, which the audit_logs entry
            for the same change depends on)
createdBy   snowflake or service-identity string, nullable (null ⇒ system-
            generated, e.g. a backfill migration)
updatedBy   snowflake or service-identity string, nullable
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

## 25. Caching Architecture

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
│ Data Shape                │ Strategy                                            │
├────────────────────────┼─────────────────────────────────────────────────┤
│ Config-shaped (guild        │ Write-through with synchronous invalidation:       │
│ config, module state)       │ the write transaction commits, THEN the cache      │
│                          │ key is deleted (never merely overwritten — a        │
│                          │ deleted key forces the next read to repopulate      │
│                          │ from source, which is simpler to reason about       │
│                          │ than keeping a cached copy in sync with a partial   │
│                          │ update)                                            │
│ Frequently-changing         │ Short, fixed TTL (seconds to low minutes),          │
│ aggregate (leaderboards,    │ accepting brief staleness rather than paying the   │
│ usage counters)             │ cost of invalidating on every contributing write   │
│ Cross-process invalidation   │ Redis pub/sub broadcasts an invalidation message   │
│ (a write on Pod A must       │ every pod subscribes to, so Pod B's and Pod C's    │
│ clear Pod B's and Pod C's    │ L1 copies of the same key are cleared within one   │
│ L1 copy too)                 │ pub/sub round trip of the write, rather than       │
│                          │ waiting out L1's own TTL                            │
└────────────────────────┴─────────────────────────────────────────────────┘
```

### 25.4 Stampede Protection

Two complementary mechanisms guard against a cache-miss "thundering herd" — many
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
    ACQUIRED   NOT ACQUIRED (another process is already recomputing)
     │           │
     ▼           ▼
    Compute     Poll briefly for the lock-holder to populate the cache;
    fresh       if still empty after a bounded wait, proceed to compute
    value,      independently rather than block indefinitely — a slow
    write        origin query never cascades into every waiting request
    cache,      timing out together
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
│ ALWAYS Externalized (PostgreSQL     │ NEVER Externalized (process-local,       │
│ or Redis)                          │ genuinely disposable)                     │
├─────────────────────────────────┼────────────────────────────────────────┤
│ Guild configuration                  │ L1 cache contents (a per-process           │
│ Module enabled/disabled state         │ accelerator over L2 — losing it costs     │
│ RBAC groups, sets, and grants          │ one cache-miss round trip, nothing more)  │
│ Moderation cases, economy balances,   │ In-flight command execution state (the    │
│ every module's persisted business     │ interaction itself is re-deliverable by   │
│ data                                 │ Discord if truly lost, though in practice │
│ Job queue state (BullMQ, Redis-        │ the shutdown sequence's drain step,       │
│ backed)                              │ §9.1, avoids this outright)               │
│ Audit history                         │ Worker thread pool state (§15.2 — a        │
│ Developer licensing and build          │ pool is rebuilt fresh on process start,   │
│ records                              │ never a source of truth for anything)     │
│ Shard ownership locks (Redis, with     │ Metrics counters BEFORE their periodic     │
│ TTL — §26.4)                         │ scrape (Prometheus's own pull model         │
│                                      │ tolerates this; nothing depends on a       │
│                                      │ counter surviving a crash between scrapes) │
└─────────────────────────────────┴────────────────────────────────────────┘
```

### 26.3 Cross-Shard Coordination

§6.5 introduced the two mechanisms; the distinction that governs which to reach for is
frequency and latency tolerance. `client.shard.broadcastEval()` serializes a function
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
  ACQUIRED   NOT ACQUIRED (another live process already owns shard N)
   │           │
   ▼           ▼
  Connect     Do NOT connect this shard; retry acquisition every
  gateway     SHARD_LOCK_RETRY_MS (default 2,000 ms) — this is the
  for shard N  expected, normal path during a rolling update's brief
   │           overlap window between an old pod and its replacement
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

This is what makes the rolling-update handoff in §33.2 safe: a new pod's attempt to
claim a shard the outgoing pod still legitimately owns simply retries on the interval
above until the outgoing pod's graceful shutdown releases the lock explicitly —
there is never a window where both pods believe they own the same shard
simultaneously.

### 26.5 Graceful Degradation Under Partial Outage

```
TABLE 26-B — Behavior Under Each Partial Outage

┌────────────────────────┬───────────────────────────────────────────────┐
│ Outage                    │ Behavior                                            │
├────────────────────────┼───────────────────────────────────────────────┤
│ Redis unreachable          │ L2 cache and shard-lock heartbeats both fail.       │
│                          │ Cache reads fall through to PostgreSQL directly       │
│                          │ (§13.8's Core-tier availability guarantee depends     │
│                          │ on this specifically); shard locks fall back to        │
│                          │ their last-known TTL and expire naturally — a         │
│                          │ prolonged Redis outage eventually risks shard          │
│                          │ ownership ambiguity, which is why Redis's own          │
│                          │ availability is treated as a first-class SLO           │
│                          │ target (§33.5), not merely an accelerator's           │
│                          │ uptime                                              │
│ Read replica lagging        │ Router falls back to the primary automatically       │
│ beyond DATABASE_REPLICA_    │ once polled lag exceeds the threshold (§24.6) —      │
│ MAX_LAG_MS                  │ never silently serves stale reads past the           │
│                          │ configured tolerance                                 │
│ One shard's gateway          │ Isolated to that shard's guilds only — every other   │
│ connection drops             │ shard, and every other pod, continues normally.       │
│                          │ discord.js's own reconnection logic handles the       │
│                          │ resume automatically in the common case                │
└────────────────────────┴───────────────────────────────────────────────┘
```

# PART VI — RELIABILITY, SECURITY & OPERATIONS

---

## 27. Observability

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
  correlationId = uuid()
        │
   ┌────┼──────────────────────┬─────────────────────────┐
   ▼    ▼                      ▼                          ▼
  Pino child logger        OTel root span              Prometheus labels
  bound to                 attribute                    (traceId as exemplar
  correlationId,            correlationId=...            on the histogram
  guildId, userId,                                       observation, where
  moduleId, shardId                                      the backend supports
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

**Redaction.** A fixed, centrally-maintained list of field-name patterns —
`token`, `password`, `secret`, `apiKey`, `authorization`, and their case-insensitive
and nested-path variants — is scrubbed to `[REDACTED]` by the logger itself before any
line is serialized, regardless of how deeply nested the field is in a logged object.
This is enforced at the logger level specifically so a module author logging an entire
request payload for debugging purposes cannot accidentally leak a credential merely by
forgetting to strip it manually first — Principle P7 (§3) made structural rather than
left to individual discipline.

```
TABLE 27-A — Log Levels and Usage

┌────────┬──────────────────────────────────────────────────────────────┐
│ Level    │ Usage                                                             │
├────────┼──────────────────────────────────────────────────────────────┤
│ trace    │ Per-middleware-layer entry/exit — enabled only in targeted local    │
│         │ debugging, never in a deployed environment by default              │
│ debug    │ Cache hit/miss detail, individual query timing below the slow       │
│         │ threshold                                                        │
│ info     │ Command invocation start/success, job completion, lifecycle          │
│         │ transitions (module load/unload, bootstrap stage completion)        │
│ warn     │ A degraded-but-recovered condition: a rejected Admin-tier attempt,   │
│         │ a slow query, a required:false module's onLoad failure                │
│ error    │ An unexpected error reaching the root error boundary, a critical      │
│         │ query, a failed job exhausting its retries                           │
└────────┴──────────────────────────────────────────────────────────────┘
```

### 27.3 Metrics

`prom-client` exposes Prometheus text format from `GET /metrics` (§44.2). The core
metric families every deployment gets without any module-specific instrumentation:

```
TABLE 27-B — Core Metric Families

┌─────────────────────────────────────┬────────────────────────────────────┐
│ Metric                                 │ Type       │ Labels                   │
├─────────────────────────────────────┼───────────┼──────────────────────────┤
│ dumby_commands_total                    │ Counter    │ module, command, status    │
│ dumby_command_duration_seconds           │ Histogram  │ module, command             │
│ dumby_cache_requests_total                │ Counter    │ tier, result                │
│ dumby_errors_unexpected_total             │ Counter    │ module (where attributable) │
│ dumby_queue_depth                        │ Gauge      │ queueName                   │
│ dumby_queue_job_duration_seconds           │ Histogram  │ queueName, status           │
│ dumby_db_pool_active_connections           │ Gauge      │ —                          │
│ dumby_db_query_duration_seconds            │ Histogram  │ table, operation             │
│ dumby_shard_gateway_latency_ms             │ Gauge      │ shardId                     │
│ dumby_guild_module_active                 │ Gauge      │ moduleSlug (fleet-wide count)│
└─────────────────────────────────────┴───────────┴──────────────────────────┘
```

Alerting rules built on these families feed the SLO targets specified in §33.5 — a
sustained drop in `dumby_cache_requests_total{result="hit"}`'s ratio, a rise in
`dumby_command_duration_seconds`'s P99 bucket, or a nonzero, climbing
`dumby_queue_depth` for a queue that should normally drain quickly are each early,
specific signals rather than a single generic "something is wrong" alert.

### 27.4 Distributed Tracing

The OpenTelemetry SDK opens a root span per command execution (at `TraceMiddleware`,
priority 0) and automatically instruments child spans for anything crossing a
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

### 27.5 Health Endpoints, Restated

§8.2's Table 8-B specifies the three health endpoints' relationship to the bootstrap
sequence in full; they are, in observability terms, the fourth signal alongside logs,
metrics, and traces — the one an orchestrator polls directly rather than one a human
operator queries during an investigation.

## 28. Error Management & Fault Tolerance

### 28.1 Error Taxonomy

`DumbyError` is the abstract base every recognized error extends — carrying a
machine-readable `code`, an HTTP-status-equivalent for logging/metrics
classification, a `userMessage` safe to surface in an ephemeral reply, and an
`isOperational` flag distinguishing an expected, handled failure mode from a genuine
bug. This is exactly the distinction the root error boundary's decision tree (§19.4)
branches on.

```
TABLE 28-A — The Eight Concrete Subclasses

┌────────────────────────┬────────────┬──────────────────────────────────┐
│ Subclass                  │ HTTP-Equiv. │ Represents                          │
├────────────────────────┼────────────┼──────────────────────────────────┤
│ ValidationError            │ 400          │ Malformed or out-of-bounds input,     │
│                          │            │ caught in the command layer per the    │
│                          │            │ three-layer rule (§11.5); e.g. §12.4's │
│                          │            │ REMINDERS_UNPARSEABLE_TIME             │
│ PermissionDeniedError       │ 403          │ Any authorization failure — Layers      │
│                          │            │ 4–7 of the permission engine (§21),     │
│                          │            │ or a module-level check like §19.3's    │
│                          │            │ REQUIRES_PREMIUM                       │
│ NotFoundError               │ 404          │ A referenced resource doesn't exist     │
│                          │            │ (a case ID, a reminder ID)              │
│ ConflictError               │ 409          │ A state conflict — double-processing,   │
│                          │            │ an already-resolved case being closed    │
│                          │            │ again                                  │
│ RateLimitExceededError      │ 429          │ §21.5's global limiter or a command's    │
│                          │            │ own cooldown                            │
│ ExternalServiceError        │ 502          │ A Discord REST call or a module's       │
│                          │            │ third-party integration failed          │
│ ConfigurationError          │ 500          │ A startup-time or dependency-graph      │
│                          │            │ integrity violation — the parent class   │
│                          │            │ for CircularDependencyError (§10.5),    │
│                          │            │ CommandKeyCollisionError (§17.3), and   │
│                          │            │ EventCycleError (§18.5)                 │
│ InternalError               │ 500          │ Unexpected/uncategorized — what the     │
│                          │            │ root error boundary treats as the       │
│                          │            │ "UNEXPECTED" branch when a thrown error  │
│                          │            │ is not a recognized DumbyError at all    │
└────────────────────────┴────────────┴──────────────────────────────────┘
```

`isOperational: true` on the first six means "this is a normal, expected outcome of
some input or state — reply with `userMessage` and move on." `ConfigurationError` and
`InternalError` default `isOperational: false` — both represent something structurally
wrong rather than a normal rejected request, and both are logged with full context and
alerted on rather than treated as routine.

### 28.2 Module & Handler Isolation, Recap

This reference establishes module- and handler-level isolation in three places, each
guarding a different execution path with the identical underlying philosophy — one
failure never cascades beyond the boundary that owns it:

```
TABLE 28-B — Isolation Boundaries Across the System

┌──────────────────────┬──────────────────────────────────────────────────┐
│ Boundary                │ Guarantee                                            │
├──────────────────────┼──────────────────────────────────────────────────┤
│ Command execution         │ The root error boundary (§19.4) catches everything    │
│                        │ inside one command's pipeline — a failing command      │
│                        │ never affects a concurrently-running one               │
│ Gateway event handlers     │ EventRouter wraps each registered handler in its       │
│                        │ own try/catch (§18.3) — one module's handler throwing  │
│                        │ never blocks another module's handler for the same     │
│                        │ event                                                │
│ Module load/ready         │ A required:false module's onLoad or onReady failure     │
│                        │ disables that module alone (§8.2, Stages 12 & 17) —    │
│                        │ startup and runtime both continue                       │
└──────────────────────┴──────────────────────────────────────────────────┘
```

### 28.3 Retry Policy — In-Request Utility vs. Job Retry

Two independent retry mechanisms exist in this architecture, deliberately not
unified into one, because they solve different problems:

```
TABLE 28-C — Two Retry Mechanisms, Never Composed

┌────────────────────┬─────────────────────────┬────────────────────────────┐
│                       │ src/shared/utils/retry.ts │ BullMQ Job Retry (§29.4)      │
├────────────────────┼─────────────────────────┼────────────────────────────┤
│ Scope                 │ Within a single synchronous │ Across a job's entire re-      │
│                      │ request/handler execution   │ queue-and-re-execute lifecycle │
│ Typical delay          │ Sub-second to low seconds    │ Seconds to minutes             │
│ Use case               │ A flaky external call inside │ A job whose entire attempt      │
│                      │ a command handler — retry     │ failed and needs a fresh,       │
│                      │ before the interaction's 3-  │ later-scheduled attempt          │
│                      │ second response window        │                                │
│                      │ closes                       │                                │
│ Defaults               │ maxAttempts: 3, baseDelayMs:  │ attempts: 3, exponential         │
│                      │ 1000, maxDelayMs: 30000,      │ backoff: 5s / 10s / 20s          │
│                      │ ±20% jitter                  │                                │
│ Never composes with    │ A handler retrying a call      │ that itself lives inside a job   │
│ the other              │ processor would double the retry surface unpredictably —        │
│                      │ never nest one inside the other for the same operation          │
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
    │                                                    ▼
  CLOSED ─────────────────────────────────────────────► OPEN
  (calls pass                                       (calls fail
   through normally,                                  immediately,
   failures tracked                                   NO call reaches
   in a rolling                                       the downstream
   window of the                                      dependency —
   last 20)                                           this is the
    ▲                                                  point: stop
    │                                                  making a bad
    │           trial call succeeds                    situation worse)
    │      ┌─────────────────────────┐                     │
    │      │                          │                     │ 30s elapsed
    └──HALF_OPEN◄─────────────────────┘                     │
       (one trial call        trial call fails               │
        permitted through)         │                        │
           ▲                       ▼                        │
           └───────────────────  OPEN  ◄──────────────────────┘
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

### 28.6 Maintenance Mode

A global, Redis-backed flag — set and cleared exclusively through PEP's
`enterMaintenanceMode`/`exitMaintenanceMode` control domains (§22.3) — checked by
`MaintenanceModeMiddleware` at priority `-20`, the outermost layer of the entire
pipeline (§19.2). While set, every command short-circuits with a maintenance notice
reply, except a small, explicitly allow-listed set of Admin-tier commands capable of
managing maintenance mode itself — an operator is never locked out of the one
mechanism needed to end the maintenance window they started. Maintenance mode is the
tool reached for ahead of a risky migration or during an active incident where write
traffic specifically needs to stop while the underlying issue is resolved, without
requiring a full process restart to achieve that pause.

## 29. Job Queue & Scheduling

### 29.1 Jobs vs. Tasks — Two Different Authoring Models

```
TABLE 29-A — Jobs vs. Tasks

┌─────────────┬───────────────────────────────┬───────────────────────────────┐
│               │ Jobs                            │ Tasks                            │
├─────────────┼───────────────────────────────┼───────────────────────────────┤
│ Manifest field │ jobs (§11.2) — queueName + class │ tasks (§11.2) — a class list        │
│ Trigger        │ Enqueued programmatically,        │ Registered into the Scheduler at   │
│               │ optionally delayed (§12.5's        │ load time, fired on a cron          │
│               │ worked example)                  │ expression                        │
│ Base class     │ BaseProcessor<TPayload>            │ BaseTask                          │
│ Cardinality     │ One instance of work per enqueue  │ One firing per cron tick,          │
│               │ call — many jobs typically exist    │ fleet-wide (never once per pod —   │
│               │ concurrently, one per user action    │ §29.6's distributed lock)          │
│ Failure handling│ BullMQ's own retry + DLQ (§29.4)   │ Logged and alerted; a missed tick   │
│               │                                   │ is not automatically retried —      │
│               │                                   │ the next scheduled tick is the      │
│               │                                   │ natural recovery                   │
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
acknowledging the job, for instance). Every `BaseProcessor.process()` implementation
is therefore required to be idempotent: safely re-runnable with the same payload
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
│ attempts           │ 3                                                        │
│ backoff            │ Exponential: 5s, then 10s, then 20s                       │
│ On exhaustion       │ Moved to a dead-letter entry, preserving the full payload  │
│                   │ and every attempt's failure reason — never silently         │
│                   │ dropped                                                  │
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

A recurring task registered into the `Scheduler` must fire exactly once per tick
**fleet-wide**, not once per pod — a naive cron registration inside every pod's own
process would fire N times for an N-pod deployment. `Scheduler` guards every tick with
the identical distributed-lock pattern §26.4 uses for shard ownership: on each
scheduled tick, every pod attempts `SET 'task-lock:{taskName}:{tickTimestamp}' NX`;
exactly one succeeds and executes the task; every other pod's attempt fails the `NX`
check and skips that tick entirely, with no retry needed, since one execution
fleet-wide is precisely the intended outcome.

## 30. Localization & Internationalization

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
its `.after()` hook records the outcome, duration, and status once execution
completes. Writes batch in-memory and flush to PostgreSQL on an interval — never a
synchronous write on the command's own critical path, so analytics collection can
never be the reason a command's response is slow, and a batch-write failure never
fails the command it was describing.

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

MTP's entire purpose is to be the data foundation a future monetization model would
consume — mapping directly onto the reserved-but-empty `src/monetization/` scaffold
(§7.6) — without the framework itself implementing any billing, quota-enforcement, or
payment logic today. A deployment can run MTP purely for its own operational insight
(which modules are actually driving load) with zero monetization behavior attached,
today, indefinitely; nothing about running MTP obligates a deployment to build billing
on top of it later.

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

## 32. Security Architecture

### 32.1 Secrets Management

Every secret — the Discord bot token, database credentials, Redis credentials, and
every credential the Credentials Service issues (§22.7) — is supplied exclusively
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
specified in full at §22.7's Table 22-D: cryptographically random generation, Argon2id
hashing at rest (never a raw value persisted anywhere), `Authorization`-header-only
transmission, and independent revocability. This is one policy applied uniformly,
not a separate discipline invented per subsystem.

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
  Signature present and well-formed?  ── NO ──► 401, reject, log at warn
        │ YES
        ▼
  Signature valid against the configured shared secret?  ── NO ──► 401, reject
        │ YES
        ▼
  Timestamp within the replay-protection tolerance window
  (requests outside a bounded window, regardless of a valid
  signature, are rejected — a captured, valid-signature request
  cannot be replayed indefinitely)  ── OUTSIDE WINDOW ──► 401, reject
        │ WITHIN WINDOW
        ▼
  Payload is now trusted input — proceed to the module's own Zod
  schema validation (§32.2) and business logic
```

A webhook route with no signature verification configured refuses to register at all
during Stage 14 — there is no supported "unverified webhook" mode a module can opt
into, deliberately, since an unauthenticated inbound HTTP endpoint accepting
arbitrary payloads is one of the more common real-world paths into a system exactly
like this one.

### 32.4 Privilege Escalation Prevention

```
TABLE 32-A — Escalation Vectors and Their Structural Blocks

┌────────────────────────────┬──────────────────────────────────────────┐
│ Vector                        │ Structural Block                              │
├────────────────────────────┼──────────────────────────────────────────┤
│ A module requesting broader     │ The Gateway Intent union is computed ONCE,     │
│ Discord intents at runtime       │ from every loaded module's manifest            │
│ than it declared                │ (§11.2's intents field), at Stage 15 —         │
│                                │ nothing after login can add to it; a           │
│                                │ manifest field, not a runtime call, is the     │
│                                │ only path to requesting an intent               │
│ A lower-tier module reaching      │ The three-layer rule (§11.5) and the module    │
│ Admin-tier authority              │ isolation rules (§11.6) mean no module can      │
│                                │ import or invoke another module's code         │
│                                │ directly; Admin tier's own five-layer gate      │
│                                │ (§13.6) is independent of and additional to    │
│                                │ this                                          │
│ A guild administrator             │ RBAC role resolution (§21.3) is computed fresh  │
│ self-granting elevated role       │ from actual Discord role membership on every   │
│ without the corresponding         │ interaction — a guild config write cannot       │
│ Discord role                     │ itself grant an RBAC role; only an actual        │
│                                │ Discord-side role assignment, or an explicit    │
│                                │ Layer 7 grant an existing ADMIN/OWNER issues     │
│                                │ (§21.6), can                                   │
│ A module writing to another        │ Isolation Rule 2 (§11.6) — cross-module writes  │
│ module's tables directly          │ are never acceptable through any sanctioned     │
│                                │ pattern (§14.1); this is a code-review hard     │
│                                │ stop with no carve-out                          │
└────────────────────────────┴──────────────────────────────────────────┘
```

### 32.5 Dependency Security

The `pnpm` lockfile is committed and CI runs with `--frozen-lockfile` (§5.2) — a
build never silently resolves a different dependency tree than what was reviewed. A
dedicated `dependency-review.yml` workflow (§7.1) runs on every pull request
introducing or updating a dependency, blocking the merge if the change introduces a
package with a known critical- or high-severity vulnerability, and flagging (without
necessarily blocking) anything lower-severity for reviewer judgment. Dependency
footprint is treated as an ongoing design concern in code review — a new dependency
for functionality the standard library or an already-present dependency could
reasonably cover is a legitimate review objection, not merely a style preference,
since every added dependency is also an added trust boundary.

### 32.6 Audit Logging, Recap

`audit_logs` (§24.2) is the single, append-only, never-updated record every
consequential action in the system writes to — PEP's seventeen control domains
(§22.3, mandatory before any result is returned), Swastik's full deployment lifecycle
(§15.10), every guild configuration change (§23.5), and Admin-tier invocations both
granted and rejected (§13.6). Security review of "what happened and who did it" is
never a reconstruction exercise across scattered application logs — it is one table,
filterable by `source`, `actorId`, or `targetType`/`targetId`.

### 32.7 Encryption Posture

```
TABLE 32-B — Encryption Responsibility

┌────────────────────┬─────────────────────────────────────────────────┐
│ Layer                 │ Treatment                                            │
├────────────────────┼─────────────────────────────────────────────────┤
│ In transit — DB,        │ TLS, application-enforced (the Knex connection       │
│ Redis, HTTP ingress     │ config and Redis client config both require it       │
│                      │ where the target endpoint supports it; the reference   │
│                      │ Kubernetes deployment terminates external TLS at the   │
│                      │ ingress, §41.2)                                      │
│ In transit — Discord     │ Inherent — discord.js's gateway and REST clients      │
│ gateway/REST             │ both use TLS unconditionally; not a configuration     │
│                      │ this application controls or could disable             │
│ At rest — database       │ Infrastructure-layer responsibility (the cloud         │
│ and cache volumes       │ provider's disk/volume encryption, per §41.6's        │
│                      │ Terraform reference), not reimplemented at the         │
│                      │ application layer — avoiding a second, weaker,         │
│                      │ hand-rolled encryption layer on top of infrastructure  │
│                      │ that already does this correctly                       │
│ Credential-shaped         │ Argon2id hashing, never symmetric or asymmetric         │
│ values specifically      │ encryption — a password-shaped secret should NEVER    │
│                      │ be recoverable in plaintext by anyone, including the    │
│                      │ system itself, which is precisely what a one-way hash   │
│                      │ guarantees and reversible encryption does not          │
└────────────────────┴─────────────────────────────────────────────────┘
```

## 33. Performance & Scalability Engineering

### 33.1 Sharding Model, Recap

The shard topology, assignment formula, and cross-shard coordination mechanisms are
specified in full at §6.5 and §26.3–§26.4. The performance-relevant summary: each pod
carries a contiguous shard range sized to stay well clear of Discord's own per-shard
gateway rate limits, and no application code ever assumes an unsharded topology —
`context.shardId` is always populated, sharded deployment or not.

### 33.2 Zero-Downtime Rolling Updates

A core deployment update — the outcome of the release pipeline (§40.2–§40.4) or
Swastik's own scheduled restart trigger (§15.5) — uses a Kubernetes rolling-update
strategy configured `maxUnavailable: 0` / `maxSurge: 1`: at every point during the
rollout, capacity never drops below the pre-update pod count, and at most one extra
pod exists temporarily above it.

```
DIAGRAM 33-A — Rolling Update Sequence, Per Replaced Pod

  New pod scheduled (surge — count is now N+1 momentarily)
        │
        ▼
  New pod runs bootstrap Stages 01–18 (§8.2) — including the FULL module load
  and onReady() cycle
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

### 33.3 Adaptive & Horizontal Scaling

```
TABLE 33-A — Scaling Targets by Component

┌───────────────────┬───────────────────────────────────────────────────┐
│ Component            │ HorizontalPodAutoscaler Target                        │
├───────────────────┼───────────────────────────────────────────────────┤
│ Bot pods (gateway-      │ A blend of CPU utilization and shard count per pod —  │
│ connected)             │ CPU alone under-signals load for a mostly I/O-bound   │
│                      │ workload, so shard count acts as a floor ensuring       │
│                      │ scale-out keeps pace with guild growth even when CPU     │
│                      │ usage looks moderate                                   │
│ Dedicated worker         │ dumby_queue_depth (§27.3), per §29.5 — a backing-up    │
│ pods                   │ queue is a more direct capacity signal than CPU for an │
│                      │ I/O-bound job workload                                 │
│ HTTP server (if           │ Request rate and P95 latency on the Fastify listener,  │
│ deployed separately)     │ where a deployment splits it from the bot pods entirely│
└───────────────────┴───────────────────────────────────────────────────┘
```

### 33.4 Database Performance Practices

Connection pooling (`DATABASE_POOL_MAX`, default `10` per process, §23.2) bounds how
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

### 33.5 Service Level Objectives & Alerting Thresholds

```
TABLE 33-B — SLO Reference

┌─────────────────────────┬─────────────┬─────────────┬─────────────────┐
│ Signal                     │ Target        │ Warn          │ Critical           │
├─────────────────────────┼─────────────┼─────────────┼─────────────────┤
│ Command P95 end-to-end       │ < 3,000 ms    │ ≥ 3,000 ms    │ ≥ 5,000 ms         │
│ latency (all tiers blended)  │              │              │                   │
│ Unexpected error rate         │ < 2%          │ ≥ 2%          │ ≥ 5%               │
│ (dumby_errors_unexpected_    │              │              │                   │
│ total / dumby_commands_total)│              │              │                   │
│ Cache hit ratio (Standard/      │ > 70%         │ ≤ 70%         │ ≤ 50%               │
│ Marketplace tier)              │              │              │                   │
│ Cache hit ratio (Core tier)     │ > 95%         │ ≤ 95%         │ ≤ 85%               │
│ Queue depth (any queue,          │ Draining      │ Sustained       │ Sustained growth,   │
│ sustained trend)               │ within        │ growth over    │ approaching worker    │
│                              │ minutes       │ 15 minutes     │ saturation           │
│ Redis availability              │ 99.9%         │ Any observed    │ Any sustained outage  │
│                              │              │ blip           │ beyond a few minutes  │
└─────────────────────────┴─────────────┴─────────────┴─────────────────┘
```

Every threshold above maps to a Prometheus alerting rule built on the metric families
in §27.3; the specific per-tier P50/P99 targets from §13.8 are the finer-grained
companion to this table's blended, system-wide view — §13.8 is what a module author
tunes their own handler against, and this table is what an on-call operator is paged
against.

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

## 34. Privacy & Compliance

### 34.1 Data Minimization

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
dedicated erasure workflow that reaches every module, not just the core-owned tables:
every repository's `BaseRepository` (§24.3) exposes a standard `purgeByUserId` /
`purgeByGuildId` hook, and every module is expected to implement it against its own
tables — the same three-layer rule and module-sovereignty boundary that keeps a
module's data private from other modules is also what makes each module solely
responsible for correctly erasing its own share of a user's data on request. A
central `ErasureCoordinator` service invokes every registered module's hook and
records the outcome in `audit_logs`, giving a single, auditable confirmation that
erasure reached every table across the entire system rather than only the tables a
manually-maintained checklist happened to remember.

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

## 35. Multi-Identity Operation — Twill & Personas

### 35.1 The Two Ceilings That Motivate a Second Identity

Two hard, platform-level ceilings define when one Discord Application is no longer
enough for a guild's needs, independent of anything this framework controls:

```
TABLE 35-A — The Two Ceilings

┌───────────────────────┬─────────────────────────────────────────────────┐
│ Ceiling                  │ Consequence Once Reached                            │
├───────────────────────┼─────────────────────────────────────────────────┤
│ 100 registered commands   │ A guild running enough Core, Standard, and             │
│ per guild per application  │ Marketplace modules simultaneously can exhaust the     │
│                        │ command budget a single application is allotted —       │
│                        │ §17.8's BCCM projection check (rename/alias/deletion    │
│                        │ requests) enforces this ceiling but cannot create        │
│                        │ additional budget beyond it                             │
│ One active voice           │ A single bot connection holds at most one concurrent    │
│ connection per guild        │ voice-channel connection — a guild wanting, say, an     │
│ per application            │ audio-playback module and an independent voice-based    │
│                        │ moderation/recording module active at the same time      │
│                        │ cannot do so under one identity                        │
└───────────────────────┴─────────────────────────────────────────────────┘
```

### 35.2 What a Persona Is — and Is Not

A **Persona** is not a lighter-weight bot, a feature flag, or a second process running
reduced functionality — it is the identical framework, bootstrapped through the
identical eighteen-stage sequence (§8.2), running as a genuinely separate Discord
Application: its own application ID, its own bot token, its own branding (name,
avatar, description), and its own gateway connection, requiring its own separate
server invite into any guild that wants to use it. **Twill** is the subsystem
responsible for a Persona's entire lifecycle — creation, branding configuration,
deployment, and eventual retirement — but a running Persona is simply another
instance of `src/entry/main.ts` (§7.5), started against a different bot token, sharing
the same PostgreSQL primary, the same Redis instance, and the same BullMQ queues as
the main bot and every other Persona a deployment runs.

```
TABLE 35-B — Main Bot vs. Persona

┌────────────────────────┬───────────────────────────┬───────────────────┐
│                          │ Main Bot                    │ Persona              │
├────────────────────────┼───────────────────────────┼───────────────────┤
│ Discord Application ID     │ The deployment's primary      │ A distinct, separately │
│                          │ identity                    │ registered application │
│ Bot token                 │ Primary BOT_TOKEN              │ Its own token, issued   │
│                          │                              │ and stored with          │
│                          │                              │ identical discipline     │
│                          │                              │ (§32.1)                │
│ Command budget              │ Its own 100-command ceiling,   │ An independent, separate│
│                          │ per guild                    │ 100-command ceiling,     │
│                          │                              │ per guild               │
│ Voice connection capacity    │ One per guild                  │ One per guild,          │
│                          │                              │ independent of the       │
│                          │                              │ main bot's own            │
│ Codebase / module registry   │ Same codebase                  │ IDENTICAL codebase —    │
│                          │                              │ never a fork or a         │
│                          │                              │ reduced build            │
│ Database / cache / queues    │ Shared                        │ Shared — same instances │
│ RBAC, permission engine,     │ Same engine, same source of      │ Same engine, same       │
│ guild config                │ truth                          │ source of truth         │
└────────────────────────┴───────────────────────────┴───────────────────┘
```

### 35.3 Persona Bindings — Which Identity Runs What

A guild administrator configures **persona bindings**: a mapping, stored alongside
`guild_module_states` (§13.4), from a specific module to the identity — main bot or a
named Persona — that should register and dispatch that module's commands and event
handlers for this guild. A guild that has invited both the main bot and one Persona
might bind its audio-playback module to the Persona specifically to claim an
independent voice connection, while every other module stays bound to the main bot
by default. This is a per-guild choice; a Persona brought into one guild for its
independent voice capacity has no bearing on how any other guild that has also invited
it chooses to bind its own modules.

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

Creating, branding, and deploying a new Persona is a Twill operation reserved to
process owners — the same `BOT_OWNER_IDS` list gating Admin-tier access (§13.6) — and
is exercised through Admin-tier tooling or an equivalent PEP-adjacent workflow, never
something a guild administrator can trigger unilaterally. A guild administrator's own
authority is limited to persona *bindings* for Personas the deployment's owners have
already created and invited — deciding which already-available identity handles which
module for their own guild, not spinning up new identities themselves. This mirrors
the same authority split already established between P14's global-authority
capability (§3) and a guild's own local, per-guild configuration (§23.3): the decision
to bring a new identity into existence at all is a fleet-wide, deliberate act; the
decision to use one for a specific guild's own convenience is not.

# PART VII — MODULE CATALOG & EXTENSION PATTERNS

---

## 36. Catalog Conventions & Illustrative Module Index

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
│ # │ Name                  │ Tier          │ Marketplace   │ One-Line Purpose             │
│   │                      │              │ Category       │                            │
├───┼────────────────────┼─────────────┼─────────────┼────────────────────────────┤
│ 1 │ diagnostics-console    │ admin         │ —              │ Owner-only live process       │
│   │                      │              │              │ introspection (memory,        │
│   │                      │              │              │ event-loop lag, DI state)      │
│ 2 │ fleet-control           │ admin         │ —              │ Discord-native wrapper over a  │
│   │                      │              │              │ curated subset of PEP's        │
│   │                      │              │              │ control domains (§22.3)        │
├───┼────────────────────┼─────────────┼─────────────┼────────────────────────────┤
│ 3 │ help                    │ core          │ —              │ Dynamically generated command  │
│   │                      │              │              │ reference, always current       │
│   │                      │              │              │ against the live registry      │
│ 4 │ ping                    │ core          │ —              │ Gateway and API latency        │
│   │                      │              │              │ diagnostic                    │
│ 5 │ settings                │ core          │ —              │ Guild-facing surface for        │
│   │                      │              │              │ guild_configs and module        │
│   │                      │              │              │ enable/disable state (§1.2's    │
│   │                      │              │              │ own running proof)             │
│ 6 │ guild-info              │ core          │ —              │ Server metadata, member count,   │
│   │                      │              │              │ boost tier, creation date       │
├───┼────────────────────┼─────────────┼─────────────┼────────────────────────────┤
│ 7 │ moderation              │ standard      │ —              │ ban/kick/mute/warn/case         │
│   │                      │              │              │ management (§11–§12's shape)    │
│ 8 │ welcome                 │ standard      │ —              │ Join/leave message composition │
│ 9 │ leveling                │ standard      │ —              │ XP and rank tracking            │
│10 │ logging                 │ standard      │ —              │ Configurable event-to-channel   │
│   │                      │              │              │ audit logging                  │
│11 │ auto-role               │ standard      │ —              │ Role assignment on join          │
│12 │ reaction-roles           │ standard      │ —              │ Self-service role selection      │
│13 │ birthdays                │ standard      │ —              │ Scheduled birthday               │
│   │                      │              │              │ announcements                  │
│14 │ starboard                │ standard      │ —              │ Cross-posting highly-reacted     │
│   │                      │              │              │ messages                       │
│15 │ anti-raid                │ standard      │ —              │ Join-rate anomaly detection and  │
│   │                      │              │              │ temporary lockdown              │
│16 │ giveaways                │ standard      │ —              │ Timed entry/winner-selection     │
│   │                      │              │              │ events                         │
├───┼────────────────────┼─────────────┼─────────────┼────────────────────────────┤
│17 │ audio-playback           │ marketplace   │ audio          │ Voice-channel music/audio        │
│   │                      │              │              │ playback                       │
│18 │ ticketing                │ marketplace   │ community      │ Private support-channel workflow │
│19 │ economy                  │ marketplace   │ community      │ Virtual currency, shop, minigames │
│20 │ translate                │ marketplace   │ utility        │ On-demand or reaction-triggered   │
│   │                      │              │              │ message translation             │
│21 │ stream-alerts             │ marketplace   │ integrations   │ Twitch/YouTube live-notification │
│   │                      │              │              │ webhooks                       │
│22 │ verification              │ marketplace   │ security       │ Captcha/rule-acknowledgment gate  │
│   │                      │              │              │ before full server access        │
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
│   │ where I expect? A moderation-adjacent idea that turns out to need no  │
│   │ guild-level disable ever might actually be Core, not Standard.         │
│ 2 │ Does this genuinely need to be a NEW module, or does it belong as a    │
│   │ feature inside an existing one? A second leveling-adjacent idea might  │
│   │ be a command added to #9 rather than module #23.                      │
│ 3 │ If this is Marketplace-tier, which of the five categories (§16.3)      │
│   │ actually fits — and if none does comfortably, is this really          │
│   │ Marketplace-appropriate, or does it belong at Standard tier instead?   │
└───┴───────────────────────────────────────────────────────────────────┘
```

The worked example in §12 is the actual authoring reference once these three
questions are answered — this catalog's job ends at helping a module author place
their idea correctly within the tier and category system before they open their first
file.

# PART VIII — ENGINEERING LIFECYCLE

---

## 37. Testing Architecture & QA

### 37.1 Testing Philosophy

Principle P8 (§3) — test in isolation, deploy with confidence — is the entire
philosophy underlying this section: every class's dependencies arrive through the DI
container (§10), which means every class is testable in complete isolation from real
infrastructure, and the test pyramid below is organized around exploiting that
property as fully as possible before paying the much higher cost of an integration or
end-to-end test.

### 37.2 The Four-Tier Test Pyramid

```
DIAGRAM 37-A — Test Pyramid, Illustrative Scale for a Mature Deployment

                          ▲
                         ╱ ╲          E2E (~10)
                        ╱   ╲         Full stack, real test Discord guild,
                       ╱─────╲        real bot connection — slowest, run
                      ╱       ╲       pre-release rather than per-commit
                     ╱  Smoke  ╲      Happy-path smoke (~15)
                    ╱   (~15)   ╲     One golden-path assertion per critical
                   ╱─────────────╲    command — fast enough to run pre-deploy
                  ╱                ╲  as a release gate
                 ╱   Integration    ╲  Integration (~50)
                ╱      (~50)         ╲ Repository against a real test-database
               ╱───────────────────── ╲ instance; service+repository together
              ╱                        ╲
             ╱          Unit             ╲ Unit (~500+)
            ╱          (~500+)            ╲ Every service, command, and
           ╱───────────────────────────────╲ middleware class in isolation via
                                              MockContainer (§10.7) — the large
                                              base of the pyramid, run on every
                                              commit
```

```
TABLE 37-A — Pyramid Layer Reference

┌─────────────┬──────────────────────────────┬───────────────┬───────────────┐
│ Layer          │ What It Verifies                 │ Real Infra?     │ Run Frequency   │
├─────────────┼──────────────────────────────┼───────────────┼───────────────┤
│ Unit           │ One class's logic, in isolation,   │ None —          │ Every commit,    │
│               │ via MockContainer (§10.7)          │ MockContainer   │ every PR         │
│               │                                  │ substitutes      │                │
│               │                                  │ everything       │                │
│ Integration     │ A repository against a real test-  │ Real test-       │ Every PR         │
│               │ database instance; a service+       │ database         │                │
│               │ repository pair together            │ instance         │                │
│ Happy-Path      │ One golden-path assertion per       │ MockContainer,   │ Pre-deploy,      │
│ Smoke           │ critical command — fast enough to    │ minimal real     │ release gate     │
│               │ gate a release without full E2E cost │ infra           │                │
│ E2E             │ The full stack against a real test    │ Real Discord     │ Pre-release,     │
│               │ Discord guild and a real bot            │ test guild, real │ not per-commit   │
│               │ connection                          │ bot connection   │                │
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

```
TABLE 37-B — Coverage Floors by Layer (statement / branch)

┌─────────────────────────────┬───────────────┬───────────────┐
│ Layer                          │ Statement       │ Branch          │
├─────────────────────────────┼───────────────┼───────────────┤
│ Application Core (src/core/)    │ 85%             │ 80%             │
│ Module services                 │ 80%             │ 75%             │
│ Module commands                  │ 75%             │ 70%             │
│ Repositories (core and module)   │ 70%             │ 65%             │
│ Infra-adjacent services            │ 70%             │ 65%             │
│ (queue processors, HTTP routes)  │               │               │
└─────────────────────────────┴───────────────┴───────────────┘
```

CI enforces these as hard gates per-layer, not as a single repository-wide average —
a change that adds well-tested module code cannot mask a drop in Core coverage by
diluting a blended average; each layer's own floor must hold independently.

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

## 38. Developer Experience & Tooling

### 38.1 Scaffolding CLI

`pnpm dumby scaffold module <name>` (§12.2 demonstrates it in full) is developer
convenience, not core functionality (§4's non-goals) — it generates a manifest-valid
skeleton matching whatever structural components the author selects (commands,
services, repositories, jobs, events, routes), a stub migration if the module needs a
table, and a stub locale file, but the framework behaves identically whether a module
was scaffolded or hand-authored from nothing. The scaffold's only special power is
saving a developer from retyping the same boilerplate every module needs; it confers
no capability a hand-written module lacks.

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

Beyond the cross-module import ban already specified at §11.6 Rule 1, the project's
flat ESLint configuration includes several rules specific to this architecture's own
invariants rather than generic style preferences:

```
TABLE 38-A — Architecture-Specific Lint Rules

┌────────────────────────────┬──────────────────────────────────────────┐
│ Rule                          │ Catches                                        │
├────────────────────────────┼──────────────────────────────────────────┤
│ no-cross-module-relative-import│ §11.6 Rule 1 — the foundational module          │
│                              │ isolation guarantee                              │
│ no-direct-process-env          │ Any process.env access outside a module's own    │
│                              │ declared config schema (§23.4) — configuration    │
│                              │ must be validated, never read ad hoc              │
│ no-repository-in-command       │ A command file importing a repository class       │
│                              │ directly, bypassing the service layer (§11.5's    │
│                              │ three-layer rule)                               │
│ no-event-emit-in-repository    │ A repository method calling eventBus.emit —       │
│                              │ business-event decisions belong to the service    │
│                              │ layer (§11.5)                                    │
│ require-eventsCatalog-entry    │ An eventBus.emit() call for an event name not     │
│                              │ present in the emitting module's own manifest     │
│                              │ eventsCatalog (§18.6) — the catalog and actual    │
│                              │ emission can never silently drift apart          │
└────────────────────────────┴──────────────────────────────────────────┘
```

### 38.5 Documentation Auto-Generation

A dedicated build step reads every loaded module's manifest — its `description`,
`eventsCatalog`, `dashboardSchema`, and command definitions' own descriptions — and
generates a browsable reference site without any module author maintaining separate,
hand-written documentation prose. This is what keeps §18.6's "the eventsCatalog is,
in effect, the API documentation" claim true in practice rather than aspirational: the
generated docs and the actual runtime contract are mechanically guaranteed to agree,
since both are read from the identical manifest source rather than one being a
manually-updated description of the other.

## 39. Development Workflow

### 39.1 Local Environment Setup

```
$ git clone <repo> && cd dumby
$ pnpm install --frozen-lockfile
$ cp .env.example .env               # fill in a development bot token, dev guild ID
$ docker compose -f docker/docker-compose.yml up -d postgres redis
$ pnpm migrate:latest
$ pnpm dev                           # tsx --watch src/entry/main.ts
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
  pnpm lint && pnpm typecheck && pnpm test   (identical commands CI runs)
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

### 39.4 Code Review Checklist

Beyond ordinary code-quality review, a reviewer on this codebase specifically checks:

```
TABLE 39-A — Architecture-Specific Review Checklist

┌───┬───────────────────────────────────────────────────────────────────┐
│ 1 │ Tier honesty — does the declared tier (§13.3) actually match how this │
│   │ module is meant to be controlled, not just what's convenient to ship? │
│ 2 │ Three-layer rule — no repository logic in a command, no business rule │
│   │ in a repository, no event emission below the service layer (§11.5).   │
│ 3 │ No cross-module reach beyond the four sanctioned patterns (§14.1) —    │
│   │ lint catches the import case; review catches subtler violations.       │
│ 4 │ Every migration has a working down() (§24.4).                          │
│ 5 │ eventsCatalog is current against every actual eventBus.emit() call     │
│   │ (§18.6, backed by the require-eventsCatalog-entry lint rule, §38.4).   │
│ 6 │ New jobs are idempotent (§29.3) — reviewer specifically checks the      │
│   │ pre-condition-check pattern is present, not merely that a test exists.  │
│ 7 │ Coverage floors met per layer (§37.4), not merely a blended average.    │
└───┴───────────────────────────────────────────────────────────────────┘
```

## 40. CI/CD Pipeline

### 40.1 CI Workflow (`ci.yml`)

Runs on every pull request and every push to `main`, as a strict, fail-fast sequence
— a later stage never runs if an earlier one fails, since there is no value in
running tests against code that doesn't even typecheck:

```
DIAGRAM 40-A — CI Sequence

  pnpm install --frozen-lockfile
        │
        ▼
  tsc --noEmit           (typecheck — strict mode, §5.2)
        │
        ▼
  eslint .                (lint — including every architecture-specific rule, §38.4)
        │
        ▼
  prettier --check .      (format)
        │
        ▼
  vitest run --coverage   (the full unit + integration pyramid, §37.2;
                            coverage gates enforced per-layer, §37.4)
        │
        ▼
  tsc -p tsconfig.build.json   (production build — confirms the deployable
                                artifact itself compiles cleanly, not just
                                the dev-time type check)
```

### 40.2 Release Workflow (`release.yml`)

Triggered on merge to `main`. Runs `changesets version` to compute the next semver
bump from accumulated changeset files (§42.3) and `changesets publish` to tag the
release and generate the changelog — fully automated, requiring no manual version
bump commit from any contributor.

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

### 40.5 Dependency Review (`dependency-review.yml`)

Specified in full at §32.5 — runs on any PR introducing or updating a dependency,
blocking on critical/high-severity known vulnerabilities.

```
TABLE 40-A — Workflow Summary

┌───────────────────────────┬──────────────────────┬─────────────────────────┐
│ Workflow                     │ Trigger                 │ Gate                        │
├───────────────────────────┼──────────────────────┼─────────────────────────┤
│ ci.yml                        │ Every PR, every push to  │ Fully automated             │
│                              │ main                    │                            │
│ release.yml                   │ Merge to main             │ Fully automated             │
│ deploy-staging.yml             │ Merge to main             │ Fully automated             │
│ deploy-production.yml           │ Manual dispatch, or       │ Two-approver manual gate,    │
│                              │ post-staging-validation  │ always                      │
│ dependency-review.yml           │ PR touching dependencies  │ Automated, severity-gated    │
└───────────────────────────┴──────────────────────┴─────────────────────────┘
```

## 41. Infrastructure & Deployment

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

```
TREE 41-A — k8s Manifest Organization

infra/k8s/
├── base/
│   ├── deployment.yaml        ← the bot Deployment (main.ts entrypoint)
│   ├── service.yaml           ← ClusterIP, fronting the health/metrics/HTTP port
│   ├── configmap.yaml         ← non-secret configuration values
│   ├── serviceaccount.yaml
│   └── hpa.yaml               ← HorizontalPodAutoscaler (§33.3)
└── overlays/
    ├── staging/                ← Kustomize overlay: staging-specific replica
    │                              count, resource requests, image tag
    └── production/              ← production-specific values; the ONLY overlay
                                   deploy-production.yml is permitted to apply
```

```
CODE REFERENCE 41-A — Deployment Spec, Representative Slice

spec:
  strategy:
    type: RollingUpdate
    rollingUpdate:
      maxUnavailable: 0     # §33.2 — capacity never drops during a rollout
      maxSurge: 1
  template:
    spec:
      terminationGracePeriodSeconds: 190   # §9.1's worst-case 180s + 10s buffer
      containers:
        - name: dumby-bot
          livenessProbe:
            httpGet: { path: /health/liveness, port: 3000 }
          startupProbe:
            httpGet: { path: /health/startup, port: 3000 }
            failureThreshold: 30            # generous — Stage 17's module
                                             # onReady() cycle can legitimately
                                             # take a while under a large module
                                             # count
          readinessProbe:
            httpGet: { path: /health/readiness, port: 3000 }
```

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
│   ├── staging/       ← environment-specific variable values, remote state backend
│   └── production/    ← same, production values — explicitly never sharing a
│                          state file with staging
└── modules/
    ├── database/       ← managed PostgreSQL instance, replica configuration,
    │                      backup/retention policy, region (§34.5's data-residency
    │                      hook)
    ├── cache/          ← managed Redis instance
    └── kubernetes/      ← cluster provisioning, node pool sizing
```

Database and cache **region** is an explicit, top-level variable in the `database`
and `cache` modules specifically so a data-residency requirement is satisfied by
setting one Terraform variable per environment, never by threading region-awareness
through application code (§34.5).

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

### 41.6 Cloud Provider Reference — Sizing to Deployment Scale

```
TABLE 41-A — Deployment Tier Reference

┌──────────────────┬───────────────────────────────────────────────────────┐
│ Deployment Scale     │ Reasonable Infrastructure Shape                            │
├──────────────────┼───────────────────────────────────────────────────────┤
│ Single-server          │ One process, one small managed (or even self-hosted)       │
│ operator               │ PostgreSQL instance, one small Redis instance. No             │
│                      │ read replicas, no HPA, no multi-approver release gate         │
│                      │ needed in practice — §0.2's guidance to defer that            │
│                      │ ceremony until it's actually load-bearing applies directly     │
│                      │ here.                                                       │
│ Growing platform        │ Multiple bot pods behind an HPA (§33.3), a managed             │
│                      │ PostgreSQL primary with at least one read replica,             │
│                      │ managed Redis, dedicated worker pods for queue processing       │
│                      │ (§29.5), staging environment mirroring production topology.    │
│ Large-scale fleet        │ Full sharding across many pods, multiple read replicas,       │
│                      │ dedicated worker pod pools per queue category, the full         │
│                      │ two-approver production gate genuinely earning its keep,        │
│                      │ Personas in active use for guilds pushing command-budget or     │
│                      │ voice-capacity limits (§35).                                   │
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

### 42.1 Semantic Versioning — Framework and Module, Independently

Two independent version numbers exist side by side in this architecture, and they are
never conflated: the **framework's own version** (the core codebase — bootstrap,
DI container, permission engine, and everything else in `src/core/`) and **each
module's own version** (its manifest's `version` field, §11.2). A framework version
bump does not imply any module needs a version bump, and vice versa — a module
author ships `reminders@1.4.0` on their own schedule, entirely independent of
whichever framework version it happens to be loaded into, constrained only by
whatever compatibility range the module's own `package.json` (or manifest-level
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

### 42.4 Migration Discipline, Recap

§24.4 specifies migration mechanics in full — core migrations before module
migrations, both in declared order, every migration file exporting a working `down()`
as a hard requirement rather than best practice. The versioning discipline above and
the migration discipline in §24.4 are two views of the same underlying value:
Principle P11's deprecate-before-break philosophy applies to a module's *code*
contract, and P10's (§3) reversible-migration requirement applies to its *data*
contract — together, they are what makes upgrading a module, or the framework itself,
a routine, low-risk operation rather than an event requiring careful, bespoke
coordination every time.

## 43. Troubleshooting & Operational Runbooks

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
  2. Check for an accumulating event listener — a module's onLoad() registering
     an event-bus subscription without a matching removal in onUnload() is the
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
and **mitigate before you're certain** — §43.2's suspend-then-investigate ordering and
§43.5's unconditional defer-check both exist because restoring user-facing stability
and understanding root cause are separate goals, and the first should never wait on
the second when a fast, safe mitigation (a suspend, a rollback, a defer flag) is
already available.

# PART IX — REFERENCE

---

## 44. REST API, Webhooks & MDIS Reference

### 44.1 Four Authentication Contexts, Never Conflated

The HTTP server (Fastify, bound at Bootstrap Stage 03 alongside the health endpoints,
§8.2) exposes four authentication contexts, each with its own credential type,
verification path, and permitted surface — never conflated, never accepted
interchangeably by an endpoint expecting a different one.

```
TABLE 44-A — Authentication Contexts

┌───────────────────┬───────────────────────┬────────────────────────────┐
│ Context               │ Credential               │ Governs Access To            │
├───────────────────┼───────────────────────┼────────────────────────────┤
│ MDIS dashboard         │ Discord OAuth2 user       │ Guild configuration,          │
│                      │ token                    │ module state — routed through │
│                      │                          │ PermissionResolver (§21.7)     │
│ Swastik developer       │ Dev ID, issued by the      │ Module upload, versioning,     │
│                      │ Credentials Service        │ own-developer status (§15.6)  │
│                      │ (§22.7), Bearer header    │                              │
│ PEP / CLAI operator      │ Operator credential,       │ The seventeen control          │
│                      │ issued by the Credentials  │ domains (§22.3) — never        │
│                      │ Service                    │ reachable from the public      │
│                      │                          │ internet directly (§41.5)      │
│ Inbound webhook          │ Provider-specific          │ A module's own registered      │
│                      │ signature (HMAC-SHA256      │ webhook route only (§32.3)     │
│                      │ or the originating          │                              │
│                      │ service's own scheme)      │                              │
└───────────────────┴───────────────────────┴────────────────────────────┘
```

### 44.2 Health, Metrics & Info Endpoints

```
GET /health/liveness      → §8.2 Table 8-B (Stage 04 gate)
GET /health/startup       → §8.2 Table 8-B (Stage 15 gate)
GET /health/readiness     → §8.2 Table 8-B (Stage 18 gate)
GET /metrics              → Prometheus text format, §27.3's metric families
GET /info                 → framework version, loaded module count by tier,
                             shard range this pod owns — unauthenticated,
                             deliberately free of anything guild-identifying
```

### 44.3 Module Configuration & State Endpoints (MDIS)

Specified in full at §16.4; the endpoint shapes, restated for reference completeness:

```
GET   /api/modules/:name/config     → current guild config for this module
PUT   /api/modules/:name/config     → update, validated against the module's
                                       own dashboardSchema-declared fields
POST  /api/modules/:name/:action    → module-defined custom actions
PATCH /api/modules/:name/state      → enable/disable — a SEPARATE endpoint from
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
schema CLAI's terminal (§22.6) validates against before ever reaching PEP itself,
since CLAI is a presentation layer over this same API, not an independent capability
surface.

### 44.7 Swastik Developer & Upload API

```
POST /api/swastik/register           → developer registration (§15.6)
POST /api/swastik/modules/:slug/upload  → module package + manifest upload (§15.8),
                                          Authorization: Bearer {devId}
GET  /api/swastik/modules/:slug/status  → validation/staging/promotion status for
                                          the developer's own most recent upload
```

## 45. Mandatory Feature Compliance Matrix

A requirements-traceability checklist: every row names one capability this
architecture is required to provide, and points to where it is specified in full.
Intended use — a reviewer confirming a specific deployment, fork, or audit has not
silently dropped a load-bearing capability while adapting this reference to its own
needs.

```
TABLE 45-A — Compliance Matrix

┌────┬──────────────────────────────────────────────────┬──────────────┐
│ #  │ Capability                                            │ Specified At   │
├────┼──────────────────────────────────────────────────┼──────────────┤
│ 01 │ Single, unified bootstrap sequence, no partial-start     │ §8            │
│    │ state permitted                                        │              │
│ 02 │ Graceful shutdown with independent per-step timeouts     │ §9            │
│ 03 │ Fail-fast configuration validation before any gateway     │ §8.2, §23.2   │
│    │ connection                                             │              │
│ 04 │ Dependency injection with compile-time-checkable          │ §10           │
│    │ contracts, no service locator pattern                    │              │
│ 05 │ Circular dependency detection at boot, not runtime         │ §10.5         │
│ 06 │ Complete, self-describing module manifest contract         │ §11.2         │
│ 07 │ Enforced three-layer separation within every module         │ §11.5         │
│ 08 │ Tooling-enforced module isolation (no cross-module          │ §11.6         │
│    │ imports/writes)                                         │              │
│ 09 │ Four-tier module governance model                          │ §13           │
│ 10 │ Per-guild module enable/disable with fail-closed            │ §13.4         │
│    │ defaulting                                              │              │
│ 11 │ Five-layer Admin-tier defense in depth                     │ §13.6         │
│ 12 │ Four sanctioned, and only four, inter-module               │ §14.1         │
│    │ communication patterns                                   │              │
│ 13 │ Graceful soft-dependency degradation                      │ §14.2         │
│ 14 │ Semver-enforced cross-module contract versioning           │ §14.3, §42.1  │
│ 15 │ Hot-swap of a single module without a core restart           │ §15.1, §15.8  │
│ 16 │ Worker-thread isolation for CPU-intensive work               │ §15.2         │
│ 17 │ Scheduled, zero-downtime core restart independent of         │ §15.5         │
│    │ ad hoc deploys                                           │              │
│ 18 │ Developer registration, licensing gate, and revocable         │ §15.6–§15.7   │
│    │ approval                                                 │              │
│ 19 │ Five-gate community module review pipeline                  │ §16.4         │
│ 20 │ Schema-driven, accessible web configuration UI (MDIS)        │ §16.5         │
│ 21 │ Fatal, build-time command-name collision detection            │ §17.3         │
│ 22 │ Bounded, batched guild command change queue                  │ §17.7         │
│ 23 │ Enforced 100-command-per-guild ceiling                     │ §17.8         │
│ 24 │ Five-step guild-facing command collision resolution           │ §17.9         │
│ 25 │ No text-prefix commands, no simulated prefix parsing           │ §4, §17.10    │
│ 26 │ Per-handler isolation on gateway event dispatch               │ §18.3         │
│ 27 │ Bounded internal-event-bus cycle detection                  │ §18.5         │
│ 28 │ Composable, priority-ordered middleware with a single         │ §19           │
│    │ root error boundary                                     │              │
│ 29 │ Stateless, database-referencing component custom_id            │ §20.1         │
│    │ scheme                                                    │              │
│ 30 │ Mandatory re-authorization on sensitive component clicks        │ §20.3         │
│ 31 │ Seven-layer permission resolution, fail-closed where           │ §21           │
│    │ it matters                                              │              │
│ 32 │ Global bot-owner override that bypasses every other layer       │ §21.2         │
│ 33 │ Explicit, targeted per-user/role grant overrides              │ §21.6         │
│ 34 │ One permission engine shared by the bot and the web           │ §21.7         │
│    │ dashboard, no parallel implementation                     │              │
│ 35 │ Global administrative authority via a documented function       │ §22.2–§22.3   │
│    │ catalog (PEP)                                            │              │
│ 36 │ Out-of-band operator access independent of gateway health       │ §22.5         │
│    │ (CLAI)                                                    │              │
│ 37 │ Single, shared credential issuance path                       │ §22.7         │
│ 38 │ Three-scope configuration model (process-core,                │ §23.1         │
│    │ process-module, guild)                                    │              │
│ 39 │ Full config-change audit trail                              │ §23.5         │
│ 40 │ Repository pattern as the sole database abstraction            │ §24.3         │
│ 41 │ Every migration reversible (working down())                   │ §24.4         │
│ 42 │ Two-tier cache with stampede protection and negative           │ §25           │
│    │ caching                                                   │              │
│ 43 │ Zero process-local state whose loss would be user-visible       │ §26.1–§26.2   │
│ 44 │ Shard-ownership lock model preventing dual shard                │ §26.4         │
│    │ connections                                              │              │
│ 45 │ Correlated logs, metrics, and traces via one correlationId       │ §27.1         │
│ 46 │ Eight-subclass error taxonomy with operational/                │ §28.1         │
│    │ non-operational distinction                                │              │
│ 47 │ Idempotency required of every job processor                  │ §29.3         │
│ 48 │ Reachable maintenance mode that cannot lock out its own          │ §28.6         │
│    │ operators                                                 │              │
└────┴──────────────────────────────────────────────────────────┴──────────────┘
```

Beyond these forty-eight, every capability specified in Parts V–IX not enumerated
above — locale resolution (§30), MTP usage metering (§31.4), the full security
architecture (§32), SLO-driven alerting (§33.5), privacy/erasure (§34), Persona
governance (§35.5), the testing pyramid (§37.2), and the complete CI/CD and
infrastructure reference (§40–§41) — is load-bearing in its own right; this table's
forty-eight rows are the capabilities most load-bearing to get right *first*, not an
exhaustive restatement of everything else in this reference.

## 46. Dumby vs. Multipurpose Bots — Capability Comparison

§2.2 established the *structural* comparison — organization, boundaries, failure
blast radius. This section complements it with a capability-level view, for a reader
specifically evaluating whether to adopt this architecture over a conventional
multipurpose-bot codebase.

```
TABLE 46-A — Capability Comparison

┌─────────────────────────┬───────────────────────────┬─────────────────────────┐
│ Capability                 │ Typical Multipurpose Bot      │ Dumby                       │
├─────────────────────────┼───────────────────────────┼─────────────────────────┤
│ Adding a new feature          │ Edit shared files; risk of      │ Add a module; zero risk to  │
│                            │ regressing unrelated features     │ any existing module (§11.6)  │
│ Third-party extensibility      │ Rare; usually requires forking    │ First-class Marketplace tier │
│                            │ the whole bot                    │ and review pipeline (§16)     │
│ Multiple bot identities         │ Not supported, or a completely     │ Twill/Personas, sharing the  │
│ (command/voice capacity)       │ separate bot to manage manually    │ same codebase and data (§35)  │
│ Zero-downtime deploys           │ Uncommon; a deploy usually means    │ Structural requirement,       │
│                            │ a brief outage                    │ enforced by state             │
│                            │                                  │ externalization (§26, §33.2)  │
│ Per-guild feature control       │ Often all-or-nothing, or ad hoc      │ Uniform, tier-driven          │
│                            │ per-command flags                  │ guild_module_states model     │
│                            │                                  │ (§13.4)                       │
│ Unified permission model        │ Re-implemented per command,         │ One seven-layer engine,       │
│                            │ inconsistent coverage              │ shared by bot and dashboard   │
│                            │                                  │ (§21, §21.7)                  │
│ Observability                  │ Ad hoc console.log, if anything      │ Structured logs, metrics, and │
│                            │                                  │ traces by default, unified by  │
│                            │                                  │ correlationId (§27)           │
│ Operational control plane       │ None — a code change and redeploy    │ PEP, CLAI, Swastik, and the   │
│                            │ is the only lever                  │ Credentials Service, all       │
│                            │                                  │ independent of bot-process     │
│                            │                                  │ health (§22)                  │
│ Compliance tooling               │ Bespoke per-deployment, if it        │ Framework-level erasure and   │
│                            │ exists at all                      │ retention model (§34)         │
└─────────────────────────┴───────────────────────────┴─────────────────────────┘
```

The comparison is not a claim that a conventional multipurpose bot is poorly built —
many are engineered carefully within their own scope. It is a claim about what
becomes available, structurally and by default, once module sovereignty, contract-
based communication, and a unified operational surface are treated as load-bearing
architecture rather than aspirational conventions a team tries to maintain by
discipline alone.

## 47. Glossary & Topic Index

### 47.1 Glossary

```
TABLE 47-A — Term Reference

┌────────────────────────┬──────────────────────────────────────────────────┐
│ Term                      │ Definition                                          │
├────────────────────────┼──────────────────────────────────────────────────┤
│ Admin tier                 │ The dev-guild-only, owner-only, middleware-bypassing  │
│                          │ module tier (§13.2)                                │
│ BCCM                       │ Bot Command Cosmetics for Marketplace — guild-level    │
│                          │ command rename/alias tooling (§17.8)                │
│ CLAI                       │ Command Line Administrative Interface — SSH-hosted     │
│                          │ operator terminal over PEP's function catalog (§22.5) │
│ Core tier                  │ The permanently-loaded, non-disableable module tier,   │
│                          │ skipping RBAC resolution by design (§13.2)          │
│ CommandContext             │ The per-interaction, scoped-container object carrying   │
│                          │ correlationId, guildConfig, locale, rbacRole, logger,   │
│                          │ shardId, and metadata (§17.5)                       │
│ Credentials Service        │ The single, shared issuance path for every runtime     │
│                          │ credential in the system (§22.7)                    │
│ DI Container                │ The dependency-injection service registry — the sole   │
│                          │ mechanism for sharing services across the codebase     │
│                          │ (§10)                                              │
│ DumbyError                  │ The abstract base class for the eight-subclass error   │
│                          │ taxonomy (§28.1)                                    │
│ Grant                      │ A targeted Layer-7 permission override — permit,       │
│                          │ blacklist, whitelist, quota, or cooldown (§21.6)     │
│ Manifest                    │ A module's complete, self-describing contract          │
│                          │ declaration (§11.2)                                 │
│ Marketplace tier             │ The opt-in-install module tier, reviewed through the   │
│                          │ five-gate pipeline (§13.2, §16.4)                   │
│ MDIS                       │ Module Dashboard Interface System — the schema-driven   │
│                          │ web configuration UI (§16.5)                        │
│ Module                     │ The fundamental unit of feature ownership — a complete  │
│                          │ vertical slice governed by one manifest (§11.1)      │
│ MTP                        │ Metric Track Protocol — module-agnostic usage metering  │
│                          │ in abstract units (§31.4)                           │
│ PEP                        │ Power Engine Panel — the global administrative         │
│                          │ authority, exposed as a function catalog (§22.2)     │
│ Persona                    │ An additional, fully independent Discord Application    │
│                          │ identity running the same codebase (§35.2)          │
│ RBAC Group                 │ A named mapping from Discord role(s) to one Dumby RBAC  │
│                          │ role (§21.4)                                       │
│ Standard tier               │ The pre-installed-but-guild-disableable module tier    │
│                          │ (§13.2)                                            │
│ Stampede Guard              │ The distributed-lock + probabilistic-early-refresh     │
│                          │ mechanism preventing cache-miss thundering herds       │
│                          │ (§25.4)                                            │
│ Swastik                    │ The deployment/hot-reload/hot-swap subsystem governing  │
│                          │ every code-delivery path in the framework (§15)      │
│ Three-Layer Rule             │ Command → Service → Repository, one-directional,       │
│                          │ inside every module (§11.5)                        │
│ Tier                       │ A module's governance classification — Admin, Core,     │
│                          │ Standard, or Marketplace (§13.2)                     │
│ Token (DI)                  │ A Symbol-based, unforgeable service identifier (§10.2) │
│ Twill                      │ The subsystem governing Persona creation, branding, and  │
│                          │ lifecycle (§35.2)                                   │
└────────────────────────┴──────────────────────────────────────────────────┘
```

### 47.2 Topic Index — Quick Navigation

```
TABLE 47-B — Section Index by Part

┌──────────────────────────────────────┬───────────────────────────────────┐
│ Part                                    │ Sections                             │
├──────────────────────────────────────┼───────────────────────────────────┤
│ 0 — Orientation                          │ §0.1–§0.4                           │
│ I — Foundations & Philosophy              │ §1 What Dumby Is · §2 Doctrine ·      │
│                                        │ §3 Principles P1–P14 · §4 Non-Goals   │
│ II — Core Architecture                    │ §5 Stack · §6 Architecture · §7        │
│                                        │ Directory Structure · §8 Bootstrap ·   │
│                                        │ §9 Shutdown · §10 DI Container         │
│ III — The Module System                    │ §11 Anatomy & Manifest · §12 Worked    │
│                                        │ Example · §13 Tiers & Lifecycle · §14  │
│                                        │ Inter-Module Comms · §15 Swastik ·     │
│                                        │ §16 Marketplace & MDIS                │
│ IV — Request & Interaction Layer            │ §17 Commands · §18 Events · §19         │
│                                        │ Middleware · §20 Interactions · §21     │
│                                        │ Permissions · §22 PEP/CLAI/Credentials │
│ V — Data & State                          │ §23 Configuration · §24 Database ·     │
│                                        │ §25 Caching · §26 State Externalization│
│ VI — Reliability, Security & Operations     │ §27 Observability · §28 Errors · §29   │
│                                        │ Jobs · §30 i18n · §31 Analytics/MTP ·   │
│                                        │ §32 Security · §33 Performance · §34    │
│                                        │ Privacy · §35 Twill & Personas         │
│ VII — Module Catalog                       │ §36 Catalog & Extension Patterns      │
│ VIII — Engineering Lifecycle                │ §37 Testing · §38 DX & Tooling · §39   │
│                                        │ Workflow · §40 CI/CD · §41              │
│                                        │ Infrastructure · §42 Versioning · §43   │
│                                        │ Runbooks                              │
│ IX — Reference                            │ §44 REST/MDIS · §45 Compliance Matrix  │
│                                        │ · §46 Comparison · §47 Glossary · §48  │
│                                        │ Appendices                            │
└──────────────────────────────────────┴───────────────────────────────────┘
```

## 48. Appendices

### 48.1 Appendix A — Complete Environment Variable Reference

```
TABLE 48-A — Every Process-Level Variable Referenced In This Document

┌──────────────────────────────────┬──────────────┬───────────────────────┐
│ Variable                            │ Default        │ Specified At            │
├──────────────────────────────────┼──────────────┼───────────────────────┤
│ NODE_ENV                            │ (required)     │ §23.2                  │
│ LOG_LEVEL                           │ info           │ §23.2, §27.2           │
│ BOT_TOKEN                           │ (required)     │ §23.2, §32.1           │
│ BOT_OWNER_IDS                        │ (required)     │ §13.6, §23.2           │
│ DEV_GUILD_ID                         │ (required)     │ §13.2, §13.6, §23.2    │
│ DATABASE_URL                         │ (required)     │ §23.2                  │
│ DATABASE_POOL_MAX                     │ 10             │ §23.2, §33.4           │
│ DATABASE_STATEMENT_TIMEOUT_MS           │ 10,000         │ §23.2, §33.4           │
│ DATABASE_REPLICA_URLS                   │ (optional)     │ §23.2, §24.6           │
│ DATABASE_REPLICA_MAX_LAG_MS             │ 1,000          │ §23.2, §24.6, §26.5     │
│ REDIS_URL                            │ (required)     │ §23.2                  │
│ HEALTH_PORT                          │ 3000           │ §23.2                  │
│ RATE_LIMIT_USER_WINDOW_MS               │ 60,000         │ §21.5, §23.2           │
│ RATE_LIMIT_USER_MAX                    │ 10             │ §21.5, §23.2           │
│ RATE_LIMIT_GUILD_WINDOW_MS              │ 60,000         │ §21.5, §23.2           │
│ RATE_LIMIT_GUILD_MAX                   │ 100            │ §21.5, §23.2           │
│ CACHE_L1_MAX_ENTRIES                   │ 5,000          │ §23.2, §25.1           │
│ CACHE_L1_MAX_BYTES                     │ 50 MB          │ §23.2, §25.1           │
│ TRACE_SAMPLE_RATE                      │ 0.1            │ §23.2, §27.4           │
│ SLOW_QUERY_THRESHOLD_MS                 │ 500            │ §23.2, §24.6, §43.5     │
│ CRITICAL_QUERY_THRESHOLD_MS              │ 2,000          │ §23.2, §24.6           │
│ EVENT_LOOP_LAG_SHED_THRESHOLD_MS          │ 50             │ §23.2, §28.5           │
│ EVENT_BUS_MAX_EMIT_DEPTH                 │ 20             │ §18.5, §23.2           │
│ SHARD_LOCK_HEARTBEAT_MS                  │ 10,000         │ §23.2, §26.4           │
│ SHARD_LOCK_RETRY_MS                     │ 2,000          │ §23.2, §26.4, §43.3     │
│ TELEMETRY_ENABLED                      │ true           │ §31.5                  │
│ {MODULE_NAME}_*                        │ module-defined  │ §11.2, §23.4 (e.g.      │
│                                    │               │ REMINDERS_MAX_HORIZON_ │
│                                    │               │ DAYS, §12.3)           │
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
│ Subclass                 │ HTTP-Equiv.  │ isOperational    │
├───────────────────────┼─────────────┼────────────────┤
│ ValidationError            │ 400          │ true             │
│ PermissionDeniedError       │ 403          │ true             │
│ NotFoundError               │ 404          │ true             │
│ ConflictError               │ 409          │ true             │
│ RateLimitExceededError      │ 429          │ true             │
│ ExternalServiceError        │ 502          │ true             │
│ ConfigurationError          │ 500          │ false            │
│ InternalError               │ 500          │ false            │
└───────────────────────┴─────────────┴────────────────┘
Full reference: §28.1
```

### 48.4 Appendix D — Tier Quick Reference Card

```
TABLE 48-C — Tier Card

┌─────────────┬───────────┬───────────┬────────────┬───────────────┐
│ Tier          │ Installed?  │ Toggle?     │ RBAC Layer 6 │ Catalog?        │
├─────────────┼───────────┼───────────┼────────────┼───────────────┤
│ Admin          │ Dev guild   │ N/A         │ N/A          │ Never           │
│ Core           │ Always      │ Never       │ Skipped      │ Never           │
│ Standard        │ By default  │ Guild ADMIN  │ Full         │ If disabled     │
│ Marketplace     │ Opt-in      │ Guild ADMIN  │ Full         │ If not installed│
└─────────────┴───────────┴───────────┴────────────┴───────────────┘
Full reference: §13
```

### 48.5 Appendix E — Engineering Principles Quick Reference Card

```
P1  Explicit over implicit           P8   Test in isolation, deploy confident
P2  Module sovereignty               P9   Configuration without code
P3  Single responsibility, every layer P10 Data integrity over convenience
P4  Fail fast, degrade gracefully     P11  Deprecation over breaking change
P5  Observability is not optional    P12  Progressive disclosure of complexity
P6  Open for extension, closed for   P13  One source of truth per concern
    modification                    P14  Freedom by default, authority by
P7  Security by default                  exception

Full reference: §3
```

---

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

A reader who takes nothing else from this document should take the shape underneath
§0.4's opening diagram: one unified core enforcing consistency, one strict module
contract enforcing isolation, and a deliberate, load-bearing wall between the two that
every other mechanism in this reference — from the bootstrap sequence to the
permission engine to the deployment pipeline — exists to keep intact as the system
grows from its first module to its hundredth.
