# DUMBY CORE ENGINEERING DIRECTIVE
## Backend, Architecture & Infrastructure Development Rules for the Application Core

```
Document Class     : Development Directive — Engineering Rules & Guidelines (Non-Enforcing)
Governs            : src/core/, control-plane services (PEP, CLAI, Swastik, Credentials
                      Service), infra/, docker/, CI/CD, and every backend engineering
                      practice surrounding them
Excludes           : Frontend/website code, end-user interface & UX presentation,
                      individual feature-module authorship & the module catalog
Controlling Source : blueprint.md — "DUMBY FRAMEWORK: Complete Engineering &
                      Implementation Reference" (v4.5.0 architecture)
Supporting Context : documentation.md, directory.md, interface.md (informational only)
Status              : Living document — revise on architectural change; see §52
Nature              : Guidance for engineers. Not a system prompt.
                      Not a runtime artifact. Not self-enforcing. See §0.1.
```

---

## HOW TO READ THIS DOCUMENT

This directive uses **normative keywords** with fixed meaning throughout, in the style
of RFC 2119:

| Keyword | Meaning |
|---|---|
| **MUST** / **MUST NOT** | Non‑negotiable. A violation is a defect that blocks merge or release. |
| **SHOULD** / **SHOULD NOT** | Strong default. A deviation is permitted only with a documented, reviewed reason recorded in the PR or ADR. |
| **MAY** | Latitude left to implementer judgment. |

**"Core"**, wherever used below, means: `src/core/` (the Application Core), the four
control-plane services deployed alongside it (Power Engine Panel, CLAI, Swastik,
Credentials Service — see Part IV, §24), and the infrastructure, tooling, and process
that build, test, deploy, and operate them. **"Module"** means an independently‑owned
feature package living under `src/modules/` — module authorship is out of this
directive's scope (§0.3).

---

## TABLE OF CONTENTS

**PART 0 — PURPOSE, SCOPE & GOVERNANCE OF THIS DIRECTIVE**
&nbsp;&nbsp;§0.1 What This Document Is (and Is Not) · §0.2 Scope — What Is Governed Here ·
§0.3 Explicit Exclusions · §0.4 Source Authority & Precedence · §0.5 Reader Profiles ·
§0.6 Definition of "Done" for the Core

**PART I — GOVERNING PHILOSOPHY**
&nbsp;&nbsp;§1 The Prime Directive · §2 What the Core Is, Precisely · §3 The Fourteen
Engineering Principles (P1–P14) · §4 Non-Goals & Explicit Boundaries · §5 Operationalizing
the Quality Bar

**PART II — TECHNOLOGY STACK DIRECTIVES**
&nbsp;&nbsp;§6 Runtime & Language · §7 Discord Integration Layer · §8 Data Storage · §9 Job
Queue & Scheduling Engine · §10 Observability Stack · §11 Configuration & Validation ·
§12 Tooling & Quality Gates · §13 Infrastructure & Deployment Targets · §14 Substitution
Policy

**PART III — SYSTEM ARCHITECTURE DIRECTIVES**
&nbsp;&nbsp;§15 Layered Architecture Rule · §16 Core Directory Structure · §17 Application
Bootstrap Directive · §18 Graceful Shutdown Directive · §19 Dependency Injection &
Service Container Directive

**PART IV — REQUEST & EVENT PROCESSING ENGINE DIRECTIVES**
&nbsp;&nbsp;§20 Command Routing Engine · §21 Event Architecture & Bus · §22 Middleware
Pipeline · §23 Interaction & Component Handling Engine · §24 Permission & Authorization
Engine · §25 Control-Plane Services (PEP, CLAI, Credentials Service, Swastik-as-Deployment)

**PART V — DATA & STATE DIRECTIVES**
&nbsp;&nbsp;§26 Configuration Management · §27 Database Architecture · §28 Caching
Architecture · §29 State Externalization & Horizontal Scaling

**PART VI — RELIABILITY, SECURITY & OPERATIONS DIRECTIVES**
&nbsp;&nbsp;§30 Observability · §31 Error Management & Fault Tolerance · §32 Job Queue &
Scheduling Operations · §33 Localization Infrastructure · §34 Analytics & Telemetry ·
§35 Security Architecture · §36 Performance & Scalability Engineering · §37 Privacy &
Compliance · §38 Multi-Identity Operation Infrastructure (Twill/Personas)

**PART VII — ENGINEERING LIFECYCLE DIRECTIVES**
&nbsp;&nbsp;§39 Testing Architecture · §40 Developer Tooling & Experience · §41 Development
Workflow · §42 CI/CD Pipeline · §43 Infrastructure & Deployment · §44 Versioning, Release
& Migration · §45 Troubleshooting & Operational Runbooks

**PART VIII — REFERENCE & GOVERNANCE**
&nbsp;&nbsp;§46 Mandatory Core Capability Compliance Checklist · §47 Environment Variable
Reference · §48 Metrics Catalog · §49 Error Taxonomy Quick Reference · §50 Engineering
Principles Quick Reference · §51 Glossary · §52 Document Governance & Change Control

---

# PART 0 — PURPOSE, SCOPE & GOVERNANCE OF THIS DIRECTIVE

---

## §0.1 What This Document Is (and Is Not)

This is a **development directive**: a structured set of engineering rules, standards,
and working practices governing how the Dumby Application Core — its architecture,
backend services, data layer, security posture, and operational lifecycle — is
designed, built, reviewed, deployed, and evolved.

It is **derived from, and subordinate to**, `blueprint.md` ("DUMBY FRAMEWORK — Complete
Engineering & Implementation Reference"), which remains the canonical architectural
specification. This directive translates that architecture into imperative,
actionable engineering rules, quality gates, and checklists a team can build directly
against.

**What this document is not:**

- It is **not a system prompt**. It does not run, execute, or address any model or
  tool at runtime. It is read by engineers *as
  documentation*, the same way a `CONTRIBUTING.md` or `ARCHITECTURE.md` file is read.
- It is **not a self-enforcing mechanism**. Nothing in this document polices the
  codebase automatically. Wherever a rule below says something is "enforced," it means
  enforced *by the project's own tooling* — ESLint rules, `tsc`, CI gates, code
  review — as described in that rule, never by this document acting on the project.
- It is **not a replacement for `blueprint.md`**. Where a rule here needs deeper
  mechanism-level detail than a directive should carry, it points back to the
  corresponding section of `blueprint.md` rather than re-deriving it.
- It is **not a legal or contractual artifact**. It is engineering guidance.

## §0.2 Scope — What Is Governed Here

This directive governs the **Application Core** and everything required to make it a
coherent, production-grade system, specifically:

| In Scope | Where Covered |
|---|---|
| Bootstrap & shutdown lifecycle | Part III |
| Dependency injection / service container | Part III |
| Command routing, event bus, middleware, interaction-handling **engines** (the mechanism, not any specific command's content) | Part IV |
| Permission & authorization engine | Part IV |
| Control-plane services: Power Engine Panel, CLAI, Credentials Service, and Swastik (strictly as the deployment/hot-reload mechanism) | Part IV |
| Configuration system, database architecture, caching, state externalization | Part V |
| Observability, error handling, job queue engine, i18n **infrastructure**, analytics/telemetry backend, security architecture, performance engineering, privacy/compliance, multi-identity (Persona) infrastructure | Part VI |
| Testing strategy, developer tooling, workflow, CI/CD, infrastructure-as-code, versioning, operational runbooks | Part VII |

## §0.3 Explicit Exclusions

Three categories are **deliberately and completely out of scope** for this directive.
They are governed by separate documentation, and nothing below should be read as
guidance for them:

1. **Frontend.** Any website, dashboard client application, portal UI, design system,
   or UI-kit code (e.g., a repository's `website/`, `design/`, `assets/` workspaces) is
   excluded. This directive covers only the backend contracts such a frontend would
   consume (REST endpoints, the permission engine, the config store) — never its
   implementation, styling, or component structure.
2. **End-user interface & UX.** The visual and interactive experience a Discord user
   or guild administrator sees — panel layouts, embed composition, dashboard "look and
   feel," the Module Dashboard Interface System's rendered output, marketplace browsing
   UX, button/menu copy — is excluded. This directive covers the backend mechanisms
   that *serve* such an interface (routing, statelessness, re-authorization, schema
   contracts) but never its presentation. The current UX surface is described,
   contextually only, in `interface.md`.
3. **Modules.** Guidance for authoring individual feature modules — business logic,
   the module catalog, a "how to build a module" tutorial, or the marketplace
   submission workflow from a module developer's point of view — is excluded. This
   directive covers only the core **contracts** the module system depends on (the DI
   container, the event bus, tooling-enforced isolation, the manifest *validator*) to
   the extent needed to specify what the **core** must provide or enforce. It never
   prescribes how to design or implement a module's own commands, services, schema, or
   feature set.

Any reference to a module, the marketplace, or an end-user surface elsewhere in this
document appears **only** as a boundary or interface the core must expose or respect —
never as authoring guidance for it.

## §0.4 Source Authority & Precedence

- `blueprint.md` is the **top-priority, controlling architectural source** for this
  directive. Every rule below traces back to it. Where this directive cites a
  supporting document for corroborating detail, `blueprint.md` still governs in the
  event of any conflict.
- `documentation.md` is a companion architectural document covering substantially the
  same system; it is used here **only as supplementary context** — occasionally
  contributing concrete detail (e.g., column-level schema definitions, specific
  webhook-signature schemes) that enriches a rule already established by `blueprint.md`.
  It never introduces a rule `blueprint.md` does not support.
- `directory.md` (the actual monorepo layout) and `interface.md` (the current
  end-user Discord surface) are **informational context only** — used to ground this
  directive in the real repository shape and to make the exclusions in §0.3 concrete,
  never as a source of engineering rules.
- **If `blueprint.md` changes, this directive must be revised to match.** The reverse
  is never true: this directive does not drive architectural decisions; it packages
  them for execution.

## §0.5 Reader Profiles

| Reader | Primary Question | Start At |
|---|---|---|
| Core engineer (new to the codebase) | "What are the non-negotiable rules for working in `src/core/`?" | Part I, then Part III |
| Platform / SRE operator | "How do I run, scale, and operate this without getting paged unnecessarily?" | Part VI, Part VII |
| Subsystem engineer | "What does 'done' look like for the piece I've been asked to build?" | The relevant Part, then §46 |
| Tech lead / reviewer | "How do I audit a PR or a fork for architectural compliance?" | §46 (Compliance Checklist), then the cited section |

## §0.6 Definition of "Done" for the Core

This directive's scope is the **backend/core/infrastructure layer**, not the complete
end-user product. A "finished, ready-to-use" outcome under this directive means:

- Every Part 0–VII rule marked **MUST** is satisfied and verifiable (by test, by CI
  gate, or by inspection against §46's checklist).
- The core boots deterministically through all eighteen bootstrap stages (§17),
  shuts down gracefully (§18), and exposes all three health endpoints correctly.
- The core runs with **zero modules loaded** and remains fully healthy — module
  content is never a precondition for core health, by design (§1, §4).
- The core is deployable via the Docker/Kubernetes/Terraform reference in §43,
  observable via §30, and secured per §35.
- It does **not** mean a frontend exists, a specific end-user UX has been built, or
  any particular feature module has been authored — those are separate, out-of-scope
  deliverables governed elsewhere (§0.3).

# PART I — GOVERNING PHILOSOPHY

---

## §1. The Prime Directive

The core's entire reason for existing is to be **one coherent application from the
outside and the enforcement mechanism for N independently-owned modules from the
inside** — with a hard, tooling-enforced wall between "coherent" and "monolithic."
*Unified* means there is exactly one bootstrap sequence, one dependency graph, one
event bus, one permission engine, one configuration system, and one operational
surface. *Modular* is the property the core makes possible for everything built on top
of it, without the core needing to know what any given module does.

**Rule 1.1 — No self-special-casing.** The core **MUST NOT** grant itself, or any
first-party capability, a privileged code path unavailable to a module author. In
practice this means:

| Forbidden | Required Instead |
|---|---|
| A hidden config table only core code can write to | A declared, typed configuration schema (§26) |
| A privileged import path bypassing the DI container | Constructor injection through a registered token (§19) |
| A framework-only database connection ignoring repository ownership | The repository pattern (§27.3), no exceptions |
| An admin capability implemented as inline framework code | A function in the Power Engine Panel's catalog (§25), auditable identically to every other control action |

**Rule 1.2 — Both failure modes are structurally forbidden, not merely discouraged.**
The core **MUST** refuse both of the following simultaneously, by construction rather
than by convention:

- *The Monolith* — one giant handler, shared mutable state, no feature disableable
  without a redeploy.
- *The Plugin Federation* — a core so thin it provides no consistent permission model,
  logging, or configuration, leaving every module to reinvent its own.

**Rule 1.3 — The core is the exclusive owner of every shared runtime concern.** Every
service in the diagram below exists **exactly once per process**. No module, and no
first-party capability, ever constructs its own copy.

```
  Bootstrap → DI Container → Event Router → Command Router
  Middleware Pipeline → Permission Engine → Config Manager
  Cache Manager → Database Manager → Job Queue → HTTP Server
```

Parallel, separately-deployed control-plane services — **never modules, never part of
the gateway-connected process** — sit alongside this core: the Power Engine Panel
(global administrative authority), CLAI (an SSH-hosted operator terminal), Swastik
(deployment / hot-reload / hot-swap), the Credentials Service (shared credential
issuance), and Persona processes (additional bot identities). Full treatment: §25, §38.

## §2. What the Core Is, Precisely

**Definition.** The core is the single TypeScript application runtime — one process
family, one dependency graph, one event bus, one permission engine, one configuration
system — into which independently-authored modules are loaded as the exclusive source
of every behavior the bot exhibits, administrative capability included.

**Mission for core engineering specifically.** Shipping the fortieth capability the
core must support is exactly as safe, fast, and well-tested as shipping the first —
by making isolation, typed contracts, and observability the default path the core
provides, not something a disciplined team must remember to bolt on for every module
that arrives later.

**What the core is not (Rule 2.1):**

- **Not a no-code system.** The core is a code-first TypeScript runtime.
- **Not a single-file script.** There is no supported mode where the application runs
  as one flat entry file. The module boundary the core enforces is structural.
- **Not a multi-framework abstraction layer.** The core commits to one Discord
  integration library (§7) and uses its types directly rather than hiding behind a
  lowest-common-denominator wrapper.
- **Not a SaaS product.** The core is a self-hostable framework. Nothing in this
  directive assumes a specific commercial hosting arrangement.

## §3. The Fourteen Engineering Principles (P1–P14)

These are the **standing constitution** every core subsystem is designed against.
Every architectural rule elsewhere in this directive traces back to one or more of
these. Treat a proposed change that cannot be justified against at least one of them
as suspect by default.

```
P1  — EXPLICIT OVER IMPLICIT
      Nothing is auto-detected by filename magic where an explicit declaration could
      say it. A capability exists because it is declared, not because it lives in a
      conventionally-named folder.

P2  — SOVEREIGNTY OF OWNERSHIP
      A subsystem's own tables, internal services, and private state belong to it
      alone. Everything else interacts with them only through what is explicitly
      published. Enforced by lint rule and by the repository pattern, which makes a
      direct query against another owner's table structurally awkward to attempt.

P3  — SINGLE RESPONSIBILITY AT EVERY LAYER
      A command/route class only routes and validates; a service only holds business
      logic; a repository only talks to the database. This layering is uniform
      everywhere in the core.

P4  — FAIL FAST AT STARTUP, RECOVER GRACEFULLY AT RUNTIME
      Every config value and dependency edge is validated before the gateway
      connection opens. A bad value exits the process with a specific, actionable
      error. Once healthy, a transient failure is retried and contained — never
      allowed to crash the whole process if it can be isolated.

P5  — OBSERVABILITY IS NOT OPTIONAL
      No command, job, or lifecycle transition can be shipped without automatically
      getting a trace span, a duration metric, and structured log entries — wired
      into the router and processor base classes, never left to per-feature
      discipline (§30).

P6  — OPEN FOR EXTENSION, CLOSED FOR MODIFICATION
      Extending the system means adding a new subscriber to a documented event
      catalog or a new binding to the DI container. It never means editing the
      core's own internals to special-case a new caller.

P7  — SECURITY BY DEFAULT
      The permission engine defaults to deny. Secrets are never logged — enforced by
      the structured logger's redaction list (§30). No component can request
      capabilities beyond what it explicitly declares.

P8  — TEST IN ISOLATION, DEPLOY WITH CONFIDENCE
      Every core class declares dependencies through DI tokens rather than importing
      concrete classes, so every unit test substitutes mocks with no real database or
      Discord connection (§39).

P9  — CONFIGURATION WITHOUT CODE
      Anything an operator should reasonably change is a typed, validated
      configuration value, never a constant requiring a code change and redeploy
      (§26).

P10 — DATA INTEGRITY OVER CONVENIENCE
      Every schema change ships as a versioned, reversible migration (§27.4).
      Destructive operations go through explicit confirmation and audit-logging even
      when triggered programmatically.

P11 — DEPRECATION OVER BREAKING CHANGE
      A public contract — a provided token, an emitted event, an endpoint shape — is
      versioned semver-style. Changing its shape is a major-version bump with a
      documented deprecation window, never a silent break (§44).

P12 — PROGRESSIVE DISCLOSURE OF COMPLEXITY
      The minimal capability touches exactly one file and one interface. A capability
      needing state, a background job, a cache layer, and cross-cutting event
      subscriptions has all of that available through the same declaration shape,
      just with more fields populated.

P13 — ONE SOURCE OF TRUTH PER CONCERN
      Exactly one place resolves permissions (§24), exactly one place resolves
      configuration (§26), exactly one place holds enabled/disabled state. Duplicated
      authority across subsystems is a design defect, not a convenience.

P14 — FREEDOM BY DEFAULT, AUTHORITY BY EXCEPTION
      The core's capacity for total control (up to and including suspending any
      guild, module, developer, or command globally, §25) is never exercised as
      routine operation. Every such capability exists for deliberate, logged
      intervention — never as an ambient enforcement layer anyone needs to design
      around.
```

**Rule 3.1 — Read P1–P14 as a system, not a checklist.** They resolve into three
clusters, and a design review **SHOULD** identify which cluster a change touches:

| Cluster | Principles | Concern |
|---|---|---|
| Where authority lives | P1, P2, P3, P13 | Always exactly one place, always declared rather than inferred |
| What the system guarantees automatically | P4, P5, P7, P8 | Correctness and visibility are never something an author must remember to add |
| How the system grows without becoming unsafe | P6, P9, P11, P12, P14 | Extension, configuration, and authority expand capability without requiring a rewrite |

P10 sits apart, guarding the data layer specifically — data-integrity mistakes are the
one class of defect this architecture cannot undo the way it can roll back a bad
deploy.

## §4. Non-Goals & Explicit Boundaries

Naming what the core will **not** do is as load-bearing as naming what it does. Each
boundary is a deliberate, permanent scope decision — **not** an item deferred to a
future version, and **not** something to route around via a side door.

| Non-Goal | Rule |
|---|---|
| Text-prefix commands | The core **MUST NOT** parse a leading token out of message content and dispatch it as a simulated command. Slash commands and context menus are the complete interaction surface. There is no loophole version of this rule — a workaround that achieves the same outcome by another mechanism is still a violation. |
| General message-content scanning | The core **MUST NOT** hold a broad message-content grant for general parsing. |
| A shipped, built-in web UI | The core provides a schema-driven *contract* and a generic renderer (out of this directive's scope per §0.3) — never a pre-built frontend application bundled with it. |
| A real-time collaboration platform | The core processes Discord interactions. It is **not** a general-purpose WebSocket server. |
| A code generator as core functionality | Scaffolding tooling (§40) is developer convenience. The core **MUST** behave identically regardless of whether a component was scaffolded or hand-authored. |
| A "zero-config" system | Explicit schemas and explicit dependency declarations are required (P1) — this trades a slightly higher authoring cost for dramatically lower operational surprise at runtime. |
| A replacement for infrastructure | The core runs inside PostgreSQL, Redis, and a container orchestrator. It requires these; it does not abstract or provide them. |
| A microservices architecture | One deployable application, one process boundary per shard group. The control-plane services (§25) are a narrow, named exception in the same category as the database itself — never a pattern to imitate elsewhere. |

**Rule 4.1 — Non-goals are stated at the level of outcome, not mechanism.** A design
that technically avoids the letter of a non-goal ("we don't ship a prefix-command
*parser*") while recreating its outcome (a message-scanner that simulates one) is a
violation of the non-goal, not a clever exception to it.

## §5. Operationalizing the Quality Bar

The abstract qualities this directive is held to — precise, robust, scalable,
maintainable, production-ready, and so on — are not decorative. Each maps to a
concrete mechanism specified elsewhere in this directive. A design or PR that claims
one of these qualities **MUST** be able to point to the corresponding mechanism below,
not merely assert the adjective.

| Quality | Concrete Meaning in This Codebase |
|---|---|
| Precise / Rigorous | Zod-validated schemas at every trust boundary (§26, §35.2); Symbol-based DI tokens, never strings (§19.2) |
| Robust / Reliable | Fail-fast startup (§17), per-handler and per-module isolation (§31.2), circuit breakers (§31.4) |
| Scalable | State externalization (§29), shard-ownership locking (§29.4), horizontal autoscaling targets (§36.3) |
| Maintainable / Cohesive | Layered architecture with a single-direction dependency rule (§15), one source of truth per concern (P13) |
| Extensible | Contract-based extension points — DI tokens, the internal event bus, versioned public contracts (P6, P11) |
| Production-Ready / Enterprise-Grade | The full engineering lifecycle: CI gates (§42), two-approver production deploys (§42.4), SLO-driven alerting (§36.5) |
| Future-Proof | Discord *platform* policy is absorbed as configuration, never as a structural assumption (§7) |
| Secure by Default | Deny-by-default permission engine (§24), secrets never logged (§35.1), defense-in-depth on privileged surfaces (§24.7) |
| Observable | One correlation ID unifying logs, metrics, and traces for every request (§30.1) |
| Actionable / Strategic | Every rule below is either a **MUST** with a verification method, or a **SHOULD** with a documented-exception path — never an unfalsifiable aspiration |

# PART II — TECHNOLOGY STACK DIRECTIVES

Every technology choice below **MUST** be treated as a deliberate, documented decision.
A team adopting a substitute for any of them **MUST** document the trade-off in the
same style as this Part — never swap silently.

---

## §6. Runtime & Language Mandates

**Rule 6.1 — Runtime.** Node.js **LTS ≥ 22 MUST** be the runtime floor. This is not
an arbitrary minimum: native `fetch`, structured-clone support, and stable top-level
`await` in ESM are load-bearing for the bootstrap and module-loading design (§17).

**Rule 6.2 — Language.** TypeScript **strict mode is non-negotiable**:
`"strict": true`, plus `"exactOptionalPropertyTypes": true` and
`"noUncheckedIndexedAccess": true`, enforced project-wide as the production
configuration, never a future aspiration. `tsc` **MUST** be a mandatory, first-position
CI gate before lint, test, or deploy (§42.1).

**Rule 6.3 — Module format & tooling.**

| Concern | Requirement |
|---|---|
| Module format | ESM only — `"type": "module"`, `"module": "NodeNext"` |
| Package manager | pnpm, lockfile committed, CI **MUST** run with `--frozen-lockfile` |
| `require()` | **MUST NOT** appear anywhere in the codebase |
| JavaScript source | **MUST NOT** ship — every file compiles from TypeScript |

## §7. Discord Integration Layer Mandate

**Rule 7.1.** discord.js v14 **MUST** be the single Discord integration library, used
directly — its `Client`, `GatewayIntentBits`, `Partials`, `SlashCommandBuilder`, and
`Interaction` type hierarchy are the types every core and module author works with.
This is deliberate, not a shortcut: wrapping it behind a generic abstraction serves no
one, since discord.js already is the dominant, actively-maintained, TypeScript-native
option.

**Rule 7.2 — What the architecture absorbs change from.** The core is engineered to
absorb change from **the Discord platform**, not from discord.js the library. Every
numeric constant treated as a design parameter elsewhere in this directive — the
sharding threshold (§36.1), the interaction response window (§22.2), privileged-intent
gating (§4) — **MUST** be expressed as configuration, because each is a *platform
policy*, not a design decision of this codebase, and platform policy changes before
architecture does. A platform policy change **MUST** resolve to a configuration or
schema-level adjustment (a new environment variable, a changed default, a newly
required intent) — **never** a rewrite.

**Rule 7.3.** The gateway connection model and the commitment to slash commands as the
interaction primitive are the two structural foundations everything else rests on.
Every other Discord-platform detail is configuration.

## §8. Data Storage Mandates

**Rule 8.1 — Role separation.**

| Store | Role | Constraint |
|---|---|---|
| PostgreSQL | Sole system of record. JSONB for flexible config documents without sacrificing relational integrity elsewhere. ACID transactions for multi-table writes. Row-level locking (`SELECT FOR UPDATE`) against concurrent double-actions. `LISTEN`/`NOTIFY` for cross-process invalidation signaling. | Any data whose loss would be user-visible **MUST** live only here. |
| Redis | L2 cache, job-queue backing store, cross-shard pub/sub. | Explicitly **NOT** the primary data store — acceleration and coordination only. |

**Rule 8.2 — Query builder.** Knex.js **MUST** be the query builder — **not** an ORM,
**no** active-record entities. The repository pattern (§27.3) is the only
abstraction over the database and issues SQL through Knex, never string
concatenation. Knex's migration system **MUST** handle all schema management (§27.4).

## §9. Job Queue & Scheduling Engine Mandate

**Rule 9.1.** BullMQ **MUST** provide durable, Redis-backed job queues — chosen over
an in-process scheduler specifically because it survives process restarts: a job
enqueued for 24 hours from now still fires even across intervening restarts.

**Rule 9.2.** Cron-style recurring work **MUST** wrap BullMQ's repeatable-job
mechanism behind a **distinct** API from one-shot jobs (§32.1) — recurring tasks and
one-shot jobs have different authoring models and **MUST NOT** be conflated.

## §10. Observability Stack Mandate

| Layer | Technology | Requirement |
|---|---|---|
| Logging | Pino | Structured JSON to stdout; child-logger scoping pre-binds `traceId`, `guildId`, `moduleId` to every log line in a request's call stack |
| Metrics | prom-client | Command counters, latency histograms, queue depth, cache hit/miss ratios, DB pool usage exposed as Prometheus text format from `/metrics` |
| Tracing | OpenTelemetry SDK | A root span per command execution; child spans for every slow-threshold DB query, job invocation, and outbound HTTP call; OTLP export to any compatible backend |

**Rule 10.1.** All three pillars **MUST** carry the same `correlationId` — cross-signal
correlation is a lookup, **never** a time-based approximation. Full treatment: §30.1.

## §11. Configuration & Validation Mandate

**Rule 11.1.** All configuration — process-level environment variables and every
declared schema — **MUST** validate against Zod schemas during bootstrap Stage 02
(§17.2). A value failing its schema **MUST** exit the process with a precise,
field-by-field error before any component loads or any gateway connection is
attempted. There **MUST NOT** be a "handle missing config at runtime" code path
anywhere in the core.

## §12. Tooling & Quality Gates Mandate

| Tool | Version Floor | Purpose |
|---|---|---|
| TypeScript | ^5.5 | Primary language, strict mode |
| ESLint | ^9.x (flat config) | Linting, architecture-boundary enforcement |
| Prettier | ^3.x | Formatting, CI `--check` gate |
| Vitest | ^2.x | Unit + integration test runner |
| pnpm | latest stable | Package manager |
| tsx | ^4.x | Dev-time TS execution, no build step |
| Husky | ^9.x | Git hook management |
| commitlint | ^19.x | Conventional Commit enforcement |
| changesets | ^2.x | Changelog generation & release coordination |

## §13. Infrastructure & Deployment Targets Mandate

| Concern | Technology | Notes |
|---|---|---|
| Containerization | Docker | Multi-stage build (§43.1) |
| Orchestration | Kubernetes | Primary production target |
| Infra-as-code | Terraform | PostgreSQL, Redis, cluster (§43.4) |
| Secrets | Sealed Kubernetes Secrets (or Vault / cloud secrets manager) | No plaintext in manifests or committed env files |
| CI/CD | GitHub Actions | Five workflows (§42) |

## §14. Substitution Policy

**Rule 14.1.** A technology listed in §6–§13 **MUST NOT** be substituted without a
written rationale of equivalent rigor to this Part, reviewed and merged as an
Architecture Decision Record before the substitution lands. Silent substitution is
always a defect, regardless of whether the substitute is objectively reasonable.

# PART III — SYSTEM ARCHITECTURE DIRECTIVES

---

## §15. Layered Architecture Rule

**Rule 15.1 — The layered view is mandatory, not illustrative.**

```
┌────────────────────────────────────────────────────────────────────────┐
│                      DISCORD GATEWAY & REST API                         │
│              (one WebSocket connection per shard, via discord.js)       │
└─────────────────────────────────┬────────────────────────────────────────┘
                                   │ GatewayIntentBits = union of every
                                   │ loaded component's declared intents
┌─────────────────────────────────▼────────────────────────────────────────┐
│                          APPLICATION CORE                                 │
│  Bootstrap · DI Container · Event Router · Command Router                │
│  Config Manager · Logger (Pino) · Middleware Pipeline ·                  │
│  Permission Engine (7-layer) · Cache Manager · Database Manager ·        │
│  Job Queue (BullMQ) · HTTP Server (Fastify)                              │
└─────────────────────────────────┬────────────────────────────────────────┘
                                   │ loaded through the Module Registry
┌─────────────────────────────────▼────────────────────────────────────────┐
│                            MODULE LAYER  (out of this directive's scope)  │
└────────────────────────────────────────────────────────────────────────┘
```

**Rule 15.2.** Every box inside the Application Core **MUST** exist exactly once per
process. Nothing outside the core **MUST** ever be permitted to construct its own
database pool, cache client, or logger — every instance is handed out by the DI
container (§19), which is what makes "one operational surface regardless of what is
loaded on top" a structural property rather than a discipline.

**Rule 15.3 — The complete request trace is a contract, not a diagram.** Every
interaction **MUST** flow through this exact sequence; no stage may be skipped, and no
stage may be reordered without an Architecture Decision Record:

```
Discord Gateway → discord.js delivers InteractionCreate
  → EventRouter.handleGatewayEvent('interactionCreate', interaction)     [§21]
  → CommandRouter.dispatch(interaction)                                  [§20]
       looks up by composite key: commandName[:subgroup][:sub]
  → Module/feature-active check for this guild (fail closed)            [§27]
  → MIDDLEWARE PIPELINE, strict priority order                           [§22]
  → Command.execute(interaction, context)                                [§20]
  → Service layer → repository pattern for any data access               [§27.3]
  → middleware .after() hooks run in reverse priority order
  → metrics + trace span closed; structured log line emitted
  → User sees the response in Discord
```

**Rule 15.4 — Cross-boundary reach has exactly one legal set of paths.** Anything
outside the core **MUST** reach a core service only through: (a) an event emitted on
the internal bus, (b) a resolved, published DI token, or (c) a declared, read-only
accessor. A relative import reaching into another owner's internal files **MUST** be a
build-time ESLint error, never a runtime concern.

## §16. Core Directory Structure

**Rule 16.1 — Reconciling the idealized core layout with the actual repository.**
The controlling architecture (`blueprint.md`) specifies an idealized single-application
root; the actual repository (`directory.md`) is a monorepo. This directive's authority
maps onto the monorepo as follows — **only the left-hand column is in scope here**:

| In Scope (this directive) | Out of Scope (governed elsewhere) |
|---|---|
| `apps/main/src/` (all of it except `src/modules/*` internals) | `apps/main/src/modules/{module-name}/*` internals — module authorship |
| `apps/main/docker/`, `apps/main/deploy/{k8s,terraform}/` | `website/` — frontend |
| `apps/main/.github/`, `.husky/`, `.vscode/`, `scripts/` | `design/`, `assets/` — brand/UI assets |
| `apps/main/tests/` (unit, integration, smoke, e2e, load, chaos) | `apps/main/docs/` content that documents modules or UX specifically |
| `apps/main/tsconfig*.json`, `eslint.config.ts`, `prettier.config.ts`, `vitest.config.ts`, `commitlint.config.ts`, `.changeset/` | `specs/`, `docs/` at the monorepo root when module- or product-facing |

**Rule 16.2 — Required top-level layout inside `apps/main/`.**

```
apps/main/
├── .github/workflows/         ← ci.yml, release.yml, deploy-staging.yml,
│                                  deploy-production.yml, dependency-review.yml
├── .github/CODEOWNERS, ISSUE_TEMPLATE/
├── .husky/                    ← pre-commit (lint-staged), commit-msg (commitlint)
├── .vscode/                   ← tsx debugger config, shared settings, snippets
├── docker/                    ← Dockerfile (multi-stage), Dockerfile.dev, compose
├── deploy/k8s/{base,overlays}/, deploy/terraform/{environments,modules}/
├── scripts/                   ← scaffold.ts, migrate.ts, seed.ts
├── src/
│   ├── bootstrap/, application/  ← Application.ts, ApplicationContext.ts, HealthServer.ts
│   ├── di/                    ← Container.ts, tokens.ts, lifetimes.ts
│   ├── commands/               ← CommandRouter.ts, CommandRegistry.ts, CommandDeployer.ts
│   ├── events/                 ← EventRouter.ts, InternalEventBus.ts
│   ├── middleware/              ← MiddlewarePipeline.ts, BaseMiddleware.ts, built-in/
│   ├── permissions/             ← PermissionResolver.ts, RBACService.ts, BlacklistService.ts
│   ├── config/                 ← ConfigManager.ts, GuildConfigService.ts, schema.ts
│   ├── db/                    ← DatabaseManager.ts, MigrationRunner.ts, BaseRepository.ts,
│   │                              QueryLogger.ts, migrations/{core,backfill}/, repositories/
│   ├── cache/                  ← CacheManager.ts, L1Cache.ts, L2Cache.ts, StampedeGuard.ts
│   ├── http/                   ← HttpServer.ts, routes/, middleware/built-in/
│   ├── queue/                   ← QueueManager.ts, BaseProcessor.ts, Scheduler.ts, BaseJob.ts
│   ├── i18n/                    ← I18nManager.ts, formatters.ts
│   ├── logging/, metrics/, tracing/   ← Logger.ts, Metrics.ts, Tracing.ts
│   ├── errors/                 ← DumbyError.ts + eight concrete subclasses
│   ├── resilience/              ← retry.ts, CircuitBreaker.ts
│   ├── ratelimit/, shutdown/, discord/
│   ├── shared/{types,utils,constants,testing}/
│   ├── entry/                  ← main.ts, worker.ts, migrate.ts, pep.ts, clai.ts,
│   │                              swastik.ts, credentials.ts  (§16.4)
│   └── monetization/{adapters,models,services}/   ← reserved, intentionally empty (§16.5)
└── tests/{integration,unit,smoke,e2e,load,chaos}/
```

**Rule 16.3 — Module directory is a sibling, not a subject.** `src/modules/` **MUST**
exist as the discovery root the Module Registry scans, containing only a `_template`
reference on a fresh install. Its internal contents, naming, and per-module structure
are **out of this directive's scope** (§0.3) — the core's obligation ends at
discovering, validating, and loading whatever is placed there correctly.

**Rule 16.4 — Process entrypoints, one per deployable process.**

| Entry file | Role | Opens a gateway connection? | Loads modules? |
|---|---|---|---|
| `main.ts` | Production entry — the only entrypoint that connects to Discord | Yes | Yes |
| `worker.ts` | BullMQ worker-only entry, CPU-isolated | No | No |
| `migrate.ts` | Migration-only entry | No | No |
| `pep.ts` | Power Engine Panel (§25) | No | No |
| `clai.ts` | CLAI operator terminal (§25) | No | No |
| `swastik.ts` | Deployment/hot-reload/hot-swap service (§25) | No | No |
| `credentials.ts` | Credentials Service (§25) | No | No |

Every entrypoint **MUST** boot the identical DI container against the identical core
services (§19); each simply starts a subset and skips the rest.

**Rule 16.5 — The monetization scaffold stays empty until a model is chosen.**
`src/monetization/{adapters,models,services}/` **MUST** remain scaffold-only — no core
service **MUST** import from it, and no bootstrap stage **MUST** reference it — until a
monetization model is deliberately chosen. Its purpose is to reserve a stable,
conventional location matching the rest of the codebase's shape so that whichever
model is eventually chosen can be dropped in without restructuring the core around it
later. An empty directory here is the correct, complete state, not a gap.

## §17. Application Bootstrap Directive

**Rule 17.1 — Single entry, single exit.** `Application` **MUST** be the single root
orchestrator holding references to every shared service. Nothing **MUST** start before
`Application.bootstrap()` is called; nothing **MUST** run after `Application.shutdown()`
completes.

**Rule 17.2 — The eighteen-stage sequence is mandatory and ordered.** Every stage
**MUST** have a hard failure mode and a name that appears verbatim in the boot log. No
stage is optional or deferrable (Principle P4).

| # | Stage | What Happens | Failure Mode |
|---|---|---|---|
| 01 | `PROCESS_SETUP` | Register `uncaughtException`/`unhandledRejection` handlers; set process title | Fatal |
| 02 | `CONFIG_LOAD` | Load & validate root Zod schema against `process.env` | Fatal — field-level Zod error |
| 03 | `HEALTH_SERVER_INIT` | Start Fastify on `HEALTH_PORT`; all three health endpoints return 503 | Fatal |
| 04 | `OBSERVABILITY_INIT` | Init Pino root logger, Prometheus registry, OpenTelemetry SDK | Fatal |
| 05 | `DATABASE_CONNECT` | Open Knex pool (primary + read replicas); verify with `SELECT 1` | Fatal |
| 06 | `MIGRATION_RUN` | Run pending migrations, core then module, in declared order | Fatal |
| 07 | `CACHE_CONNECT` | Open Redis connection; verify with `PING` | Fatal |
| 08 | `QUEUE_INIT` | Init BullMQ queue connections; register worker processors | Fatal |
| 09 | `DI_BOOTSTRAP` | Bind all core services into the container; freeze the core token namespace | Fatal |
| 10 | `MODULE_DISCOVER` | Scan `src/modules/`; collect manifest files | Fatal |
| 11 | `MODULE_VALIDATE` | Validate every manifest; resolve dependency graph; detect cycles | Fatal |
| 12 | `MODULE_LOAD` | Call `onLoad(container)` in topological order | Fatal only if a `required:true` component throws |
| 13 | `COMMAND_REGISTER` | Collect command classes; register; run collision detection | Fatal on collision |
| 14 | `EVENT_REGISTER` | Register event handler classes with `EventRouter` | Fatal |
| 15 | `DISCORD_LOGIN` | Call `client.login(BOT_TOKEN)` | Fatal |
| 16 | `CLIENT_READY` | Wait for discord.js's ready event; compute this process's shard assignments | Fatal |
| 17 | `MODULE_READY` | Call `onReady(client)`; failures disable that component alone | Non-fatal per component |
| 18 | `STARTUP_COMPLETE` | `/health/readiness` returns 200 once every required component is healthy; emit `dumby.system.ready` | — |

**Rule 17.3 — Health endpoints gate on distinct stages; they MUST NOT be collapsed
into one.**

| Endpoint | Returns 200 Once... | Kubernetes Probe Purpose |
|---|---|---|
| `/health/liveness` | Stage 04 completes | `livenessProbe` — failure means fundamentally unhealthy; restart |
| `/health/startup` | Stage 15 completes | `startupProbe` — distinguishes "still starting" from "started then broke" |
| `/health/readiness` | Stage 18 completes, all required components healthy | `readinessProbe` — failure removes the pod from traffic without restarting it |

Collapsing all three into one endpoint forces a choice between an orchestrator
restarting a healthy-but-still-initializing pod, or routing traffic to a pod with a
broken required component. Three independently-gated endpoints avoid the trade-off
entirely — this **MUST NOT** be simplified away.

**Rule 17.4 — Startup command registration never trusts a prior run.** At every
bootstrap, Stage 13 **MUST** delete every command Discord currently has on record for
the application, then re-register the complete current set computed fresh — this
guards against drift from a partial prior deploy or a stale registration.

## §18. Graceful Shutdown Directive

**Rule 18.1 — The nine-step sequence, triggered by `SIGTERM` or `SIGINT`.** Each step
**MUST** carry its own independent timeout; a later step **MUST NOT** start before an
earlier one has completed or exhausted its own ceiling.

| # | Action | Timeout |
|---|---|---|
| 01 | Stop accepting new gateway events | 30 s |
| 02 | Drain in-flight command executions | 30 s |
| 03 | Call `onUnload()` on every loaded component (reverse load order) | 30 s |
| 04 | Drain job queues — in-flight workers finish; new jobs refused | 60 s |
| 05 | Close HTTP server (finish in-flight requests) | 10 s |
| 06 | Flush log buffer and trace exporter | 5 s |
| 07 | Close job-queue connections | 5 s |
| 08 | Close Redis connection | 5 s |
| 09 | Close database connection pool | 5 s |

Worst-case sum: **180 s**.

**Rule 18.2 — `terminationGracePeriodSeconds` MUST be set to 190**, not less: the
full worst-case sum (180 s) plus a 10-second buffer, so that an abandoned job's
dead-letter write is guaranteed to finish rather than being cut off by a Kubernetes
`SIGKILL`. These are **ceilings, not expected durations** — a shutdown with no deep
queue backlog completes in low single-digit seconds; the ceiling exists to protect the
genuine worst case, not to slow down the common one. A deployment that never carries
long-running commands or a deep backlog **MAY** lower this deliberately.

**Rule 18.3 — Signal handling MUST NOT be conflated.**

| Signal | Trigger | Action |
|---|---|---|
| `SIGTERM` | Pod termination, `docker stop` | Full graceful shutdown (§18.1) |
| `SIGINT` | Ctrl+C in development | Full graceful shutdown |
| `SIGUSR2` | — | Reserved, **unused** — no handler is ever registered; restarts always resolve to `process.exit(0)` + orchestrator restart policy |
| `uncaughtException` | Unhandled throw at process level | Flush logs/traces only (§18.1 Steps 06–07), then `process.exit(1)` — **not** the full drain, since process state is no longer trustworthy |
| `unhandledRejection` | Unhandled promise rejection | Log at error level; process **continues** — a full-process exit over one uncaught rejection would convert an isolated failure into a fleet-wide event |

**Rule 18.4.** Every restart path in the system (an operator-initiated restart, an
orchestrator pod delete, a scheduled core restart) **MUST** resolve to the identical
`process.exit(0)` + orchestrator-restart-policy path. No signal-based self-re-exec
mechanism is used or permitted.

## §19. Dependency Injection & Service Container Directive

**Rule 19.1 — Constructor injection, exclusively; no service locator, ever.** Every
dependency a class needs **MUST** arrive through its constructor, resolved by the
container from a token. A class **MUST NOT** call `container.resolve()` on itself
internally. This is what makes every class independently testable via mock
substitution (§39) and what makes the dependency graph fully explicit rather than
hidden inside import chains.

**Rule 19.2 — Tokens MUST be `Symbol`s, never strings.** Symbols are unambiguous (no
string-collision risk), unspoofable (a `Symbol` equals only itself), and type-safe
when paired with generics.

**Rule 19.3 — Binding lifetimes.**

| Lifetime | Description | Use |
|---|---|---|
| `singleton` | One instance per container; created on first resolution | Services, repositories, database connections |
| `transient` | New instance on every resolution | Stateless utility objects; rarely used |
| `scoped` | One instance per command-execution scope, via a child container | Per-request context objects that must never bleed between concurrent executions |

**Rule 19.4 — Resolution MUST detect cycles before any recursive resolution begins,**
with the full cycle path attached to the error (e.g., `"A → B → C → A"`), never a
generic message. This runs during bootstrap (Stage 09 for core tokens, Stage 12 for
component tokens) — a circular dependency **MUST** be a startup failure, never a
runtime surprise.

```
1. Check the singleton cache → present? return cached instance.
2. Look up the binding → not found? throw TOKEN_NOT_BOUND.
3. Push token onto the resolution stack → already present? throw with full cycle path.
4. Resolve each entry in `deps`, recursively.
5. Construct the instance with resolved deps, in declared order.
6. Pop token from the resolution stack.
7. If singleton: cache it.
8. Return the instance.
```

**Rule 19.5 — Scoped child containers MUST isolate concurrent executions
completely.** The child inherits every parent binding but maintains its own
scope-level instance cache, discarded when the scope ends. Two interactions from the
same user in the same guild arriving milliseconds apart **MUST NOT** share any scoped
state.

**Rule 19.6 — Testing MUST use a pre-wired mock container, never a live one.** A
mock-container implementation **MUST** replace every external dependency (database,
cache, event bus, HTTP client) with in-memory test doubles exposing typed assertion
methods (e.g., `assertEmitted`, `assertEnqueued`, `assertLogged`). A unit test
constructs it, registers the real class under test, resolves it, and asserts — no real
process-level setup, no real database, no network, ever, at this layer.

# PART IV — REQUEST & EVENT PROCESSING ENGINE DIRECTIVES

---

## §20. Command Routing Engine Directive

**Rule 20.1 — Supported interaction types.** The command engine **MUST** support
exactly three interaction shapes: `CHAT_INPUT` (slash commands, nestable up to command
→ subcommand-group → subcommand), `USER` context-menu commands, and `MESSAGE`
context-menu commands. No other invocation shape is legal (§4).

**Rule 20.2 — `CommandRegistry` MUST be a frozen, O(1) lookup structure.** Built once
at boot (Stage 13), keyed by a composite string
(`commandName[:subgroup][:sub]`) mapping to exactly one command class. **Collision
detection MUST be fatal at boot** — two commands resolving to the identical key
**MUST** abort startup with both offending command identifiers named in the error,
never resolved silently by load order.

**Rule 20.3 — Deployment scope is declared per command, not inferred.** A command
manifest **MUST** declare whether it deploys `GLOBAL` (propagates to every guild, up
to ~1 hour delay) or `GUILD` (a specific guild, near-instant). Core- and Standard-tier
commands **MUST** always be part of the registered set for every guild; commands
belonging to a marketplace-style tier **MUST** register for a guild only once that
guild has explicitly enabled the owning component — never proactively.

**Rule 20.4 — Startup command registration MUST NOT trust a prior run.** Every
bootstrap (Stage 13) **MUST** delete every command Discord currently has on record for
the application, then re-register the complete current set computed fresh — this is
the only way to guard against drift from a partial prior deploy, a manually-edited
command, or a stale registration left by a since-removed component. Enabling a
component after startup **MUST** register its commands immediately via a per-guild
scoped call (seconds-level propagation). Disabling a component **MUST NOT** wait to
remove Discord-side registration before revoking access — the moment a component is
disabled, the engine **MUST** write a deny override to Discord's native per-command
permissions for `@everyone` and every configured role, so the command becomes
unusable instantly even though its deregistration is batched (Rule 20.5).

**Rule 20.5 — The guild command change queue is the only path for two kinds of
change:** a disable's corresponding command removal, and a cosmetic rename/alias
request. Both **MUST** share one queue table, batched together, because both resolve
to the same bulk-overwrite operation and both are subject to Discord's 200-per-day
guild-command-creation ceiling.

```
Batching timeline, anchored to T₀ (first queued entry's timestamp):
  T₀ ─ queued ─► T₀+12h (prepare window) ─► T₀+13h PUSH (single bulk PUT)
  Outer ceiling: T₀+24h. An entry queued after T₀+13h starts a new batch.
```

- A queued entry **MUST** remain revocable or editable up until its batch's push
  executes — the queue holds a request, not a commitment.
- If the owning component receives a new version while a deletion entry is pending,
  that entry **MUST** be invalidated and the deletion restarted from zero.
- A failed push **MUST** remain `pending` (never marked applied or discarded) and
  retry automatically on the next scheduled cycle — a guild's commands **MUST** stay
  in their last successfully-applied state throughout.

**Rule 20.6 — Cosmetic renaming/aliasing ("BCCM") MUST go through the same queue and
MUST NOT become a second command system.** A guild administrator **MAY** rename or
alias any enabled command through a queue-writing request. Two constraints are
absolute:

- An alias **MUST NOT** match a reserved, native Discord command name — rejected
  outright, never queued.
- Renaming/aliasing **MUST NOT** become a text-prefix system by another name — it only
  ever changes what a slash command is *called*, never how it is invoked (§4).
- Before accepting any such request, the engine **MUST** compute the projected
  resulting command count as of the batch's next push, accounting for every other
  already-queued entry, and reject outright — before queuing — any request that would
  push the guild's total above Discord's 100-command ceiling.

**Rule 20.7 — Command-name collisions between two independently-enabled components
MUST pause, never auto-resolve.**

```
1. PAUSE      — newly-enabled component's state row → 'install_pending_resolution';
                dispatches nothing until resolved.
2. PRESENT    — guild sees an ephemeral prompt listing every conflicting command
                alongside its origin.
3. SELECT     — an administrator chooses which command wins the contested name.
4. OVERRIDE   — a command-override entry is written and cached alongside every
                other guild-scoped hot-path state.
5. RESOLVE    — the newly-enabled component's row → 'active'; the winning command
                goes live at the queue's next scheduled push.
```

If the winning component is later disabled, the engine **MUST** re-evaluate
automatically — the other component's command **MUST** take over the contested name
immediately, without requiring the administrator to resolve the same collision twice.

**Rule 20.8 — Two invocation restrictions are structural, not per-handler discretion.**

- Every command declares `guildOnly` (default `true`); `AuthMiddleware` **MUST**
  reject any DM-originated interaction against a command declaring it. The single
  sanctioned exception is Admin tier, registered for both the development guild and
  the DM context — because Admin-tier access is already gated by the five-layer
  defense (§24.7) before any handler runs.
- No simulated prefix-based command dispatch, with **no loophole** — parsing a
  leading token from message content and dispatching it as though it were a
  registered command is prohibited regardless of the mechanism used to achieve it
  (§4, Rule 4.1).

**Rule 20.9 — `CommandContext` is the single object every layer downstream of routing
receives**, carrying (at minimum): the raw interaction, resolved guild config, resolved
member/user records, resolved `rbacRole`, bound `locale`, a scoped child-container
reference, the request's `correlationId`, and a scoped logger. No command **MUST**
reach for ambient state outside this object.

## §21. Event Architecture & Bus Directive

**Rule 21.1 — Two event systems exist and MUST NOT be conflated.**

| | Gateway Events | Internal Domain Events |
|---|---|---|
| Source | Discord, via discord.js's `Client` | Any component's own service code |
| Routed by | `EventRouter` | `InternalEventBus` |
| Naming | discord.js's own names (`messageCreate`, `guildBanAdd`, …) | `{domain}.{entity}.{action}` (e.g. `moderation.user.banned`) |
| Guild-scoped dispatch gate | Checked against per-guild active state, identically to commands | Not automatic — a subscriber checks its own gating if it needs one |

**Rule 21.2 — `EventRouter` MUST wrap every handler invocation in its own try/catch.**
One handler throwing **MUST NOT** prevent any other registered handler for the same
event from running — this is module-isolation discipline applied to the event path.
Events carrying no single associated guild (`shardDisconnect`, a DM-channel event)
**MUST** skip the per-guild gate and invoke every registered handler unconditionally.

**Rule 21.3 — `InternalEventBus`'s execution model MUST be synchronous-invocation,
fire-and-forget-completion — and this MUST NOT be "fixed" into a fully-awaited
model.** `emit()` invokes every registered listener synchronously in registration
order within the same tick, but does **not** await any listener's returned promise —
an `async` listener runs to its first `await`, then control returns to `emit()`
regardless of how long the listener's remaining work takes. A listener that throws
synchronously, or whose promise later rejects, **MUST** have that error caught and
logged by the bus itself (tagged with event name and subscribing component) — **never**
propagated back to the emitter and never capable of affecting the emitter's control
flow. Any workflow needing guaranteed completion **MUST** enqueue a job from inside the
listener rather than depend on `emit()` awaiting anything.

**Rule 21.4 — Emit depth MUST be bounded per logical emit-chain.** A guard tracks emit
depth per chain (two unrelated top-level emits each start at depth 0) and enforces a
configurable ceiling, defaulting to **20**. Exceeding it **MUST** throw a typed cycle
error carrying the full chain of event names, logged at error level — breaking the
cycle deterministically rather than risking a stack overflow.

**Rule 21.5 — The event catalog is a compile-time contract, not documentation.**
`emit()` and `on()` **MUST** be checked against a merged type built from every
loaded component's own declared event-catalog entries — an undeclared event's payload
**MUST** be untyped, surfacing as a TypeScript error for any consumer, never a silent
runtime no-op.

## §22. Middleware Pipeline Directive

**Rule 22.1 — The pipeline is a strict onion, priority-ordered, lower number
outermost.** Ties resolve in declaration order. The built-in stages, their priorities,
and their failure behavior **MUST** be exactly as follows — no built-in stage may be
removed, reordered, or silently bypassed by a specific command:

| Priority | Stage | Behavior on Failure/Abort |
|---|---|---|
| -20 | `MaintenanceModeMiddleware` | Global maintenance flag set → every command short-circuits with a maintenance notice, except an allow-listed set of Admin-tier commands that manage maintenance mode itself |
| -10 | `AdminTierGateMiddleware` | Admin-tier only. Owner check fails → **silent** reject, no reply, warn-level log |
| 0 | `TraceMiddleware` | Opens root span, generates `correlationId`, binds scoped logger. Never aborts |
| 10 | `AuthMiddleware` | Resolves `interaction.user` to an internal record; `guildOnly` command from a DM → reject with a "server only" ephemeral reply |
| 20 | `GuildConfigMiddleware` | Loads per-guild config into context. Load failure **degrades to defaults**, never aborts — a config outage must not block every command guild-wide |
| 30 | `LocaleMiddleware` | Binds `context.locale`. Never aborts |
| 40 | `RateLimitMiddleware` | Atomic Redis check-and-increment. Over limit → reject with cooldown-remaining reply |
| 50 | `PermissionMiddleware` | Discord bitfield check (Permission Engine Layer 5). Fails → reject, names the missing permission |
| 60 | `RBACMiddleware` | Dumby role check (Layer 6), skipped entirely for Core-tier commands. Fails → reject |
| 70 | `CooldownMiddleware` | Per-user-per-command cooldown, distinct from the global limiter. Fails → reject with remaining time |
| 80 | `DeferMiddleware` | Calls `deferReply()` if the command declares it requires one. Never aborts |
| 90 | `AnalyticsMiddleware` | Records invocation start. Never aborts |
| 100+ | Component-global middleware | Declared `global: true` — applies across every command in every component, not just its own |
| 200+ | Command-scoped middleware | Declared on the individual command |

**Rule 22.2 — Custom middleware authoring contract.** A custom middleware **MUST**
extend the base class, declare a numeric `priority`, and implement `execute(context,
next)`; it **MAY** implement an `after()` hook that runs only if `next()` resolved
(never if this layer or a deeper one rejected). Two constraints are enforced by lint
rule, not convention, and **MUST NOT** be violated:

- A middleware **MUST NOT** call `next()` more than once.
- A middleware **MUST NOT** mutate a `CommandContext` field it does not own — a
  component-scoped middleware writes only to `context.metadata`, never to a
  core-populated field such as `context.rbacRole`.

**Rule 22.3 — The root error boundary wraps the entire onion in one outermost
try/catch** — every built-in stage, every custom middleware, and `Command.execute()`
itself. This is the single place any error occurring anywhere in a command's
execution is guaranteed to be caught:

```
Error thrown / promise rejects, anywhere in the pipeline
  → recognized DumbyError subclass (§31.1)?
       YES → use its declared user-facing message + status code
       NO  → treat as UNEXPECTED: log at 'error' with full stack + context;
             generic "something went wrong" ephemeral reply — never a raw
             stack trace or internal message shown to the user
  → reply sent (edit deferred reply if DeferMiddleware ran; else fresh ephemeral)
  → TraceMiddleware.after() closes span with error status;
    AnalyticsMiddleware.after() records the failed outcome
  → execution ends — only uncaughtException/unhandledRejection threaten the
    process itself; this boundary is precisely what keeps an ordinary
    command-level error from ever reaching that level
```

A component author **MUST NOT** need to write a top-level try/catch around an entire
command purely to avoid leaking an internal error to a user — the pipeline guarantees
that outcome uniformly for every command in the system.

## §23. Interaction & Component Handling Engine Directive

*(Backend routing mechanics only — visual layout and copy are out of this directive's
scope, §0.3.)*

**Rule 23.1 — Components are stateless from the engine's perspective.** Discord does
not correlate a component interaction back to the command invocation that created it,
so routing **MUST** depend entirely on `custom_id` (Discord's 100-character cap),
encoded as:

```
{ownerNamespace}:{handlerKey}:{contextPayload}
```

`contextPayload` **MUST** be a short, opaque reference (a case ID, an index) —
**never** a full serialized state blob. Larger context **MUST** be looked up fresh from
the database using that reference at click time. This guarantees every `custom_id`
stays well under Discord's limit regardless of logical context size, and — just as
importantly — guarantees a component's behavior always reflects the database's
*current* state rather than a snapshot frozen at render time.

**Rule 23.2 — Component handlers pass through a reduced, explicit middleware slice.**
`TraceMiddleware`, `AuthMiddleware`, `GuildConfigMiddleware`, and `LocaleMiddleware`
**MUST** always run; `RateLimitMiddleware`, `PermissionMiddleware`, and
`RBACMiddleware` **MUST** run only when the handler explicitly opts in — not every
click warrants slash-command-level scrutiny. `CooldownMiddleware` **MUST NOT** apply
to components at all (Discord's own per-interaction throttling already bounds click
frequency, and a component cooldown would require the session state this stateless
model deliberately avoids).

**Rule 23.3 — Sensitive component actions MUST independently re-verify
authorization inside their own `execute()`, via the same `PermissionResolver` the
command pipeline uses (§24) — never by assuming the component's mere existence
implies the clicking user is authorized.** A button visible in a channel is clickable
by anyone who can see that channel, not only the original invoker. This is mandatory
for any moderation-relevant or destructive component action.

**Rule 23.4 — Modal display and interaction deferral are mutually exclusive within
the same interaction response.** A modal is shown in direct response to an
interaction (most commonly a button click); a handler opening one **MUST NOT** defer
first.

**Rule 23.5 — Autocomplete handlers MUST resolve from cache, not from a fresh query
on every keystroke.** Discord's strict, short autocomplete response window means a
handler unable to resolve suggestions from the L1/L2 cache cascade in time **MUST**
return an empty list rather than risk the window closing with no response.

**Rule 23.6 — Pagination MUST follow the shared, stateless `Paginator` pattern.**
Previous/Next buttons encode the target page number and original query parameters in
`custom_id` (never the full result set); every page turn re-queries fresh using those
encoded parameters. Nothing about a paginated view **MUST** be held in server-side
session memory between clicks.

## §24. Permission & Authorization Engine Directive

**Rule 24.1 — `PermissionResolver` is the single, unified authorization engine.**
Every surface needing an authorization answer — the command pipeline and any external
API surface alike — **MUST** call through this one resolver rather than maintaining a
parallel check (Principle P13).

**Rule 24.2 — Resolution MUST proceed through exactly seven ordered layers,** each
producing a definitive `ALLOW` (short-circuits everything below), a definitive `DENY`
(short-circuits everything below), or `PASS` (defer downward). Falling through every
layer with no definitive answer **MUST** default to **allow**.

```
1. Global Bot Owner Override  — user ∈ BOT_OWNER_IDS? → ALLOW, bypass all below
2. Blacklist Check             — user/guild globally blocked? → DENY (silent, logged)
3. Guild & Module Availability — guild known + module active? → DENY if not (silent)
4. Channel Restriction          — allow/deny-listed channel violated? → DENY (ephemeral)
5. Discord Native Permission    — member holds required Discord bitfield? → DENY if not
6. Dumby RBAC Role [skipped for Core tier] — resolved role ≥ required? → DENY if not
7. Explicit Grant Override      — a permit/blacklist/whitelist grant on record?
                                   grant says DENY → DENY; grant says ALLOW → ALLOW;
                                   no grant → ALLOW (default)
```

**Rule 24.3 — Fail-open vs. fail-closed is layer-specific and MUST NOT be
normalized to one behavior across all seven.**

| Layer | On Data Unavailability | Why |
|---|---|---|
| 1 — Owner override | N/A (env var, always resolvable) | No data dependency |
| 2 — Blacklist | **FAIL CLOSED** (deny) | Never risk letting a blocked actor through on a cache/DB miss |
| 3 — Guild/module availability | **FAIL CLOSED** (deny) | A database outage must never grant access to a disabled module |
| 4 — Channel restriction | **FAIL OPEN** (allow) | An unreadable restriction list degrades to "no restriction," not "block every channel" |
| 5 — Discord permission bitfield | **FAIL CLOSED** (deny) | Sourced directly from the interaction payload — never actually "unavailable" |
| 6 — RBAC role | **FAIL CLOSED**, degrades to lowest non-restricted role | An unresolvable role must degrade downward, never to an elevated one |
| 7 — Grant override | **FAIL OPEN** (falls through to Layer 6's outcome) | An unreadable grant table must not block everything |

This asymmetry is deliberate: layers gating something destructive or globally scoped
fail closed; layers merely refining an already-granted access fail open, so an
infrastructure hiccup in a secondary system degrades precision, never basic
availability.

**Rule 24.4 — RBAC is a strict six-role hierarchy, inclusive upward.**

`OWNER` (guild's Discord-native owner, always) → `ADMIN` → `MOD` → `HELPER` → `MEMBER`
(default) → `RESTRICTED` (ranks below `MEMBER`, denied wherever a command requires
`MEMBER` or higher). A command requiring `MOD` **MUST** be satisfied by `MOD`, `ADMIN`,
or `OWNER` — reasoned about identically to Discord's own native permission model.

**Rule 24.5 — Guilds configure RBAC via Groups, resolved fresh per interaction, never
cached indefinitely.** A Group is a named mapping from one or more Discord role IDs to
one Dumby RBAC role, resolved against the invoking member's *current* Discord roles on
every interaction — a Discord-side role change **MUST** take effect on that member's
very next command, not on some later cache expiry.

**Rule 24.6 — Rate limiting is a distinct concern from authorization and MUST run
ahead of the permission layers (priority 40, §22.1).** Two independent rolling windows,
checked atomically:

| Dimension | Default Window | Default Ceiling |
|---|---|---|
| Per-user | 60,000 ms | 10 commands |
| Per-guild | 60,000 ms | 100 commands |

Both **MUST** be configurable per deployment via environment variables. A
command-specific cooldown (declared per-command, enforced separately at priority 70)
**MAY** layer on top — the global limiter protects the platform and database from
abusive volume; a command-specific cooldown protects that command's own semantics.
Exceeding either **MUST** return an ephemeral reply naming the remaining wait — never a
silent drop.

**Rule 24.7 — Explicit grants (Layer 7) are the most specific, most overriding
authorization unit,** targeted at one user or role, for one command or one entire
component, in one guild:

| Grant Type | Effect |
|---|---|
| `permit` | Overrides a Layer 6 RBAC denial for this specific target |
| `blacklist` | Overrides a Layer 6 RBAC allow for this specific target |
| `whitelist` | Restricts a command to ONLY whitelisted targets, regardless of RBAC role |
| `quota` | A usage ceiling over a rolling window, distinct from the global rate limiter |
| `cooldown` | A target-specific cooldown overriding the command's own default |

**Rule 24.8 — Any external, non-bot surface authenticating via a bridged identity
(e.g., an OAuth2-authenticated API client) MUST resolve authorization through this
identical `PermissionResolver` instance — never a parallel, independently-maintained
check.** The bridge's only job is exchanging its own token for the same internal
user/guild identity pair an `Interaction` object would yield, then handing that pair
to the resolver unchanged. This is Principle P13 applied to authorization specifically
— exactly one engine, reachable from multiple transport layers, guarantees a
permission change is never visible on one surface but unenforced on another.

**Rule 24.9 — Admin-tier commands (or any comparably privileged capability a
deployment builds) MUST be defended by five independent layers, not by any single
one of them.** This is a property of the *tier mechanism* itself, not of any specific
command:

```
LAYER 1 — Discord registration scope (structural, holds before any code runs)
  Registered exclusively to the development guild, defaultMemberPermissions: 0n
  (hidden from every member's UI regardless of permissions). The ONE tier also
  registered for the direct-message context.

LAYER 2 — AdminTierGateMiddleware, priority -10 (before every other middleware)
  Verifies user ∈ BOT_OWNER_IDS AND arrival via dev guild or DM. Any other
  combination → SILENT reject (no reply of any kind), warn-level log. Silence
  is deliberate — a distinguishable "denied" response is itself an information
  leak confirming a command exists or a user ID was close to authorized.

LAYER 3 — BOT_OWNER_IDS environment variable
  Process-level config, not a database value. Unmodifiable by any command, any
  API call, or any guild administrator action.

LAYER 4 — Environment guard on the single most dangerous capability
  An explicit enable flag AND NODE_ENV !== 'production' required together.
  Disabling requires a deployment change, not a bot command; stays inert in
  production regardless of Layers 1–3.

LAYER 5 — Time and output bounding, per-capability
  Hard timeout, truncated/narrowly-scoped output — bounds how much damage one
  invocation can do and how much of its output persists, independent of
  whether execution was permitted at all.
```

The credible threat model Layers 1–4 collectively close is external compromise; what
Layer 5 bounds is the residual case of a legitimately compromised owner account
reaching an enabled capability in a non-production environment. **Every Admin-tier
invocation — granted or rejected — MUST write to `audit_logs` unconditionally, before
the handler runs.**

## §25. Control-Plane Services Directive

**Rule 25.1 — Four services sit outside the module system entirely and MUST each be
deployed as their own process,** sharing only the underlying PostgreSQL and Redis
instances with the bot process — never its gateway connection, never its module
registry:

| Service | Entry Point | Purpose |
|---|---|---|
| Power Engine Panel (PEP) | `src/entry/pep.ts` | Global administrative authority — the concrete mechanism behind Principle P14 |
| CLAI | `src/entry/clai.ts` | SSH-hosted operator terminal calling PEP's function catalog |
| Credentials Service | `src/entry/credentials.ts` | Single shared issuance path for every runtime credential |
| Swastik | `src/entry/swastik.ts` | Deployment, hot-reload & hot-swap mechanism *(described here strictly as core deployment infrastructure — its module-marketplace-facing developer workflow is out of this directive's scope, §0.3)* |

This placement traces directly to the microservices non-goal's named exception
(§4): each remains reachable even when the bot process itself is completely down —
exactly the scenario in which an operator most needs them. A capability that only
runs *inside* the bot process is useless the moment that process is the thing in
trouble.

**Rule 25.2 — PEP MUST expose its capabilities as a catalog of callable functions —
name, typed parameter schema, description — never as a fixed set of hardcoded
terminal commands.** The identical schema shape **MUST** serve every present and
future caller (a REST client, CLAI's terminal) identically:

```
Caller → PEP Function Dispatcher
  validates the call against the named function's typed parameter schema,
  rejecting malformed calls before any side effect
    → one of 17 control-domain functions executes
    → mandatory audit_logs write (source: 'PEP'), BEFORE any response returns
    → result returned to caller
```

**Rule 25.3 — The seventeen control domains MUST cover, at minimum:** four
foundational domains — `suspendGuild`, `suspendModule`, `suspendDeveloper`,
`suspendCommand` (each fleet-wide, overriding any individual guild's own
configuration) — and thirteen extended domains reaching: maintenance mode, targeted
cache-namespace invalidation, job-queue pause/resume/dead-letter-requeue, temporary
rate-limit override, targeted shard-group restart, deployment-triggered core restart
and module-version rollback, per-Persona suspension, structured audit-log query,
marketplace-signature revocation, and forced credential rotation. **Every one of the
seventeen MUST write an unconditional, reasoned `audit_logs` entry before returning a
result** — Principle P14's "deliberate, logged intervention" is enforced structurally
by making the audit write a precondition of completion, never a best-effort side
effect.

**Rule 25.4 — PEP's own access control MUST be independently configured, never
inherited automatically from `BOT_OWNER_IDS`.** PEP never opens a Discord gateway
connection — only its own authenticated REST surface — and access requires a
credential issued by the Credentials Service (Rule 25.6), bound to a named operator
identity held to at least the scrutiny of the Admin-tier owner check, but tracked
independently.

**Rule 25.5 — CLAI MUST authenticate by SSH public key only — no password path.**
Each operator's key **MUST** be registered and revocable individually, so removing one
compromised or departed operator's access never requires rotating a shared secret
every other operator relies on. A CLAI session **MUST**:

- Be a REPL resolving typed commands to PEP function calls, rendering human-readable
  output — a presentation layer over PEP, never an independent capability surface
  with its own logic.
- Carry the connecting operator's identity through to PEP's own audit write, so
  `audit_logs` distinguishes a CLAI-originated intervention from a direct-REST one.
- Terminate automatically after a bounded idle period.
- Require explicit typed confirmation, matching the target's name, before executing
  any broad or irreversible function.

**Rule 25.6 — The Credentials Service MUST be the single, shared issuance path for
every runtime credential** — Swastik's developer/build identifiers, PEP/CLAI operator
credentials, and any inter-service authentication token — never issued independently
by each consuming service. This is Principle P13 applied to secret issuance: exactly
one place generates, hashes, and revokes, so an audit of every credential ever issued
is one table, not a reconciliation across several.

| Rule | Applied Uniformly To |
|---|---|
| Generated cryptographically random | Every issued credential, no exceptions |
| Stored only as an Argon2id hash | The raw value is never persisted anywhere, including in this service's own store |
| Displayed exactly once, at issuance | A lost credential is rotated, never retrieved |
| Always transmitted via `Authorization` header | Never in a URL, query string, or log line |
| Independently revocable | Revoking one credential never requires rotating any other |

**Rule 25.7 — Every control-plane relationship MUST terminate at the shared
PostgreSQL/Redis layer — never at another control-plane service's in-process state.**
This is what allows each of the five processes (bot, PEP, CLAI, Swastik, Credentials
Service) to fail, restart, or scale independently of the other four without any of
them needing to know the others exist beyond the shared data layer.

# PART V — DATA & STATE DIRECTIVES

---

## §26. Configuration Management Directive

**Rule 26.1 — Three configuration scopes, with an absolute dividing line.**

| Scope | Storage | Mutable at Runtime? | Validated |
|---|---|---|---|
| Process — Core | Environment variables | No — requires a redeploy | Bootstrap Stage 02, against the root Zod schema |
| Process — Component | Environment variables, name-prefixed | No — same as above | Bootstrap Stage 11, against each component's own declared schema |
| Guild | PostgreSQL (`guild_configs` JSONB) | **Yes** — takes effect immediately | On every write, against the same schema the read path deserializes against |

**Rule 26.2.** Anything that should never differ between guilds, or whose incorrect
value could threaten process startup, **MUST** be process-level and **MUST** require a
deployment to change. Anything a guild should reasonably tune for itself **MUST** be
guild-level and **MUST** take effect the instant it is written — no restart, no
redeploy, ever, for a guild-level change.

**Rule 26.3 — The root config schema MUST validate during Stage 02, before any
database verification or gateway connection.** A representative, non-exhaustive slice
of required shape:

```typescript
const rootConfigSchema = z.object({
  NODE_ENV: z.enum(['development', 'staging', 'production']),
  BOT_TOKEN: z.string().min(1),
  BOT_OWNER_IDS: z.string().transform(s => s.split(',')),
  DEV_GUILD_ID: z.string().regex(/^\d{17,20}$/),
  DATABASE_URL: z.string().url(),
  DATABASE_POOL_MAX: z.coerce.number().default(10),
  DATABASE_STATEMENT_TIMEOUT_MS: z.coerce.number().default(10_000),
  DATABASE_REPLICA_MAX_LAG_MS: z.coerce.number().default(1_000),
  REDIS_URL: z.string().url(),
  RATE_LIMIT_USER_WINDOW_MS: z.coerce.number().default(60_000),
  RATE_LIMIT_USER_MAX: z.coerce.number().default(10),
  CACHE_L1_MAX_ENTRIES: z.coerce.number().default(5_000),
  TRACE_SAMPLE_RATE: z.coerce.number().min(0).max(1).default(0.1),
  SLOW_QUERY_THRESHOLD_MS: z.coerce.number().default(500),
  CRITICAL_QUERY_THRESHOLD_MS: z.coerce.number().default(2_000),
  EVENT_LOOP_LAG_SHED_THRESHOLD_MS: z.coerce.number().default(50),
  EVENT_BUS_MAX_EMIT_DEPTH: z.coerce.number().default(20),
  SHARD_LOCK_HEARTBEAT_MS: z.coerce.number().default(10_000),
  SHARD_LOCK_RETRY_MS: z.coerce.number().default(2_000),
});
```

A missing required field or a refinement failure **MUST** produce a field-by-field
error printed before the process exits — never a downstream `undefined` surfacing as
a confusing symptom three subsystems away from its cause. Full variable reference:
§47.

**Rule 26.4 — Guild-level config MUST live in one JSONB document per guild,
validated against a schema on every write and every read.** Every component-specific
setting a guild administrator can tune **MUST** live inside this same document,
namespaced under that component's own key — never a separate guild-scoped table for
simple configuration values. The full L1→L2→origin read cascade (§28.1) and the
synchronous invalidate-on-write path (§28.3) both apply here identically — "takes
effect immediately" (Rule 26.2) is a direct consequence of the write path invalidating
the cache key before the transaction returns, never of the cache TTL alone.

**Rule 26.5 — Process-level component configuration MUST use name-prefixed
environment variables, validated at Stage 11 alongside manifest validation.** No two
components can collide on a variable name; a misconfigured component-level value
**MUST** be caught at the same startup stage as a malformed manifest, never surfacing
as a confusing runtime failure the first time that code path executes.

**Rule 26.6 — Every write to guild-level configuration MUST be recorded in
`audit_logs` with the specific diff** — changed keys, old and new values, acting
identity, timestamp — so "who changed this and when" is answerable from one table,
regardless of which interface made the change.

## §27. Database Architecture Directive

**Rule 27.1 — PostgreSQL is the sole system of record; Redis is acceleration only.**
The rationale is specific, not generic: JSONB gives schema flexibility for
configuration documents without sacrificing relational integrity elsewhere;
transactions guarantee a multi-table write either fully commits or fully rolls back;
row-level locking (`SELECT ... FOR UPDATE`) prevents two concurrent actions from
double-processing the same target row; `LISTEN`/`NOTIFY` provides a no-extra-
infrastructure fallback channel for cross-process invalidation alongside Redis
pub/sub.

**Rule 27.2 — The core-owned schema is fixed and MUST NOT be extended casually.**
Every table below belongs to the Application Core; every other table in the database
belongs exclusively to whatever component created it via its own migrations and
**MUST NOT** appear in core code, core queries, or this directive's schema:

```
guilds                 id (PK) · name · joinedAt · leftAt (nullable — non-null means
                        bot no longer present) · shardId

users                  id (PK) · globalBanned (platform-wide, independent of any
                        guild-scoped blacklist entry)

guild_configs           guildId (PK, FK→guilds) · settings (jsonb, §26.4) ·
                        standard audit columns (§27.5)

guild_roles             id (PK) · guildId (FK) · groupName · dumbyRole (enum:
                        OWNER|ADMIN|MOD|HELPER|MEMBER|RESTRICTED) ·
                        discordRoleIds[] · standard audit columns

guild_module_states     guildId+moduleSlug (composite PK) · tier · status ·
                        wasStandardDefault · installedAt · disabledAt ·
                        dataRetentionPolicy · standard audit columns

grants                  id (PK) · guildId · targetType (user|role) · targetId ·
                        scopeType (command|module) · scopeName · grantType
                        (permit|blacklist|whitelist|quota|cooldown) ·
                        grantValue (jsonb) · standard audit columns

blocked_users           id (PK) · userId · guildId (nullable — null ⇒ global
                        platform-wide block) · reason · blockedBy · blockedAt ·
                        expiresAt (nullable)

audit_logs              id (PK) · source (PEP|SWASTIK|CLAI|GUILD|MDIS|component
                        name) · actorId · action · targetType/targetId ·
                        beforeState/afterState (jsonb, nullable) · reason
                        (nullable) · timestamp   — APPEND-ONLY, never updated

developers              devId (PK, opaque) · username · approvalStatus
                        (pending|approved|declined) · registeredAt/approvedAt/
                        approvedBy   [Swastik-issued; core-owned control table]

builds                  buildId (PK) · devId (FK) · moduleSlug · version (semver) ·
                        validationStatus (pending|passed|rejected) · promotedAt
                        (nullable)   [Swastik-issued; core-owned control table]

marketplace_listings    moduleSlug (PK) · devId (FK) · category · description ·
                        signatureValid (false ⇒ revoked, load refused) · listedAt

metering_usage_daily    guildId+date (composite PK) · metricUnitsConsumed ·
                        breakdown (jsonb — per-component contribution, §34.3)
```

**Rule 27.3 — `BaseRepository<T>` is the sole abstraction over the query builder;
no ORM, no active-record entities, no raw query strings outside a repository.**

```typescript
abstract class BaseRepository<T extends { id: string | number }> {
  protected abstract table: string;
  constructor(protected readonly db: IDatabaseManager) {}
  async findById(id: T['id']): Promise<T | null>;
  async findMany(filter: Partial<T> & RangeFilters<T>, opts?: QueryOptions):
    Promise<{ records: T[]; total: number }>;
  async create(data: Omit<T, 'id' | 'createdAt' | 'updatedAt'>): Promise<T>;
  async updateById(id: T['id'], data: Partial<T>): Promise<T | null>;
  async deleteById(id: T['id']): Promise<boolean>;
  protected queryBuilder(): Knex.QueryBuilder<T>;  // escape hatch, still routed
                                                     // through the same connection/
                                                     // replica logic — never raw pg
}
```

A repository method **MUST NOT** emit an event, apply a business rule, or call
another owner's repository directly — its entire surface is data access. Cross-table
transactions **MUST** be owned by the service layer via an injected transaction
manager passed explicitly into each repository call — a repository is never
responsible for deciding when a transaction begins or commits, only for participating
in one it is handed:

```typescript
async banAndLogCase(input: BanInput): Promise<Case> {
  return this.txManager.transaction(async (trx) => {
    await this.discordApi.banMember(input.guildId, input.userId);
    const caseRecord = await this.caseRepo.create(input, trx);
    await this.auditRepo.create({ ...auditFields, caseId: caseRecord.id }, trx);
    return caseRecord;
  }); // any step throwing rolls back the whole transaction — no partial case
      // record ever exists without its corresponding audit entry
}
```

**Rule 27.4 — Migrations MUST run core migrations first, then component migrations,
tracked in one shared ledger table.** Every migration file **MUST** export both `up()`
and `down()` — an irreversible migration is a code-review blocker, since it is exactly
the kind of one-way door Principle P10 exists to prevent.

**Rule 27.5 — Every entity table — core-owned and component-owned alike — MUST
carry the identical four audit columns, in the same order, with the same
semantics:**

```
createdAt   timestamptz, not null, default now()
updatedAt   timestamptz, not null, default now(), bumped by APPLICATION code —
            never a database trigger, since the application layer is the one place
            that knows *why* an update happened, which the corresponding
            audit_logs entry depends on
createdBy   snowflake or service-identity string, nullable (null ⇒ system-generated)
updatedBy   snowflake or service-identity string, nullable
```

**Rule 27.6 — Read/write routing MUST send every write to the primary,
unconditionally, and MUST route reads to a replica only when doing so cannot
produce a stale-read hazard.** A read immediately following a write within the same
logical operation **MUST** target the primary explicitly. `DATABASE_REPLICA_MAX_LAG_MS`
(default `1000`) **MUST** bound how stale a replica may be before the router falls back
to the primary automatically — measured from the replica's own replication-lag
metric, never inferred from query latency.

**Rule 27.7 — Every query MUST be timed against two independent, separately-alerted
thresholds:** `SLOW_QUERY_THRESHOLD_MS` (default `500`, logs at `warn` with a
parameterized — never literal-value — query shape) and
`CRITICAL_QUERY_THRESHOLD_MS` (default `2,000`, logs at `error` and increments a
dedicated metric). These **MUST** be tracked separately from end-to-end command
latency SLOs (§36.5) so an incident investigation can distinguish "the database is
slow" from "the handler is slow for some other reason" immediately.

## §28. Caching Architecture Directive

**Rule 28.1 — A two-tier cascade, exposed through one unified API.** `CacheManager`
**MUST** expose a single `get`/`set`/`invalidate` surface over both tiers — calling
code **MUST NOT** manage L1 and L2 as separate concerns.

```
Request for key K
  → L1: in-process LRU (default max 5,000 entries / 50MB) — sub-millisecond,
    scoped to ONE process (a fleet of N pods holds up to N independent copies
    of the same hot key — the deliberate trade L2's invalidation broadcast
    exists to bound)
  → miss → L2: Redis, shared fleet-wide — single-digit-millisecond, one
    authoritative copy every pod reads
  → miss → Origin: PostgreSQL, per the read-routing rules (§27.6) — populates
    L2, then L1, on the way back out
```

**Rule 28.2 — Cache keys MUST follow one namespacing convention:**
`{domain}:{entity}:{identifier}[:{sub-scope}]` (e.g., `guild:config:{guildId}`,
`user:profile:{userId}`). This is what makes targeted, prefix-based cache-namespace
invalidation (an available control-plane function, §25.3) possible without an
all-or-nothing flush.

**Rule 28.3 — Invalidation strategy MUST match data shape, not be applied
uniformly:**

| Data Shape | Required Strategy |
|---|---|
| Config-shaped (guild config, module state) | Write-through: commit the write transaction, **then** delete the cache key (never merely overwrite) — a deleted key forces the next read to repopulate from source rather than requiring the cache to stay in sync with a partial update |
| Frequently-changing aggregates (leaderboards, usage counters) | Short, fixed TTL — accept brief staleness rather than invalidate on every contributing write |
| Cross-process invalidation (a write on one pod must clear every other pod's L1 copy) | Redis pub/sub broadcast — every pod's L1 copy is cleared within one round trip of the write, never waiting out L1's own TTL |

**Rule 28.4 — Stampede protection MUST implement both complementary mechanisms, not
either alone.**

- *Distributed lock on true miss*: on an L2 miss, attempt `SET lock:{key} NX EX
  {ttl}`. Acquired → compute fresh, write cache, release lock. Not acquired → poll
  briefly for the lock-holder to populate; if still empty after a bounded wait,
  compute independently rather than block indefinitely.
- *Probabilistic early refresh*: on every L2 read, if remaining TTL fraction falls
  below a threshold (default 0.15), roll against a refresh probability (default
  0.10) — a hit triggers an async background refresh while still serving the
  current, not-yet-expired value to the requesting call. This smooths refreshes for
  a hot key across the whole window before expiry rather than concentrating them at
  the instant of expiry.

**Rule 28.5 — A lookup resolving to "does not exist" MUST be cached as an explicit
negative result with its own shorter TTL, using a sentinel distinct from the "not yet
cached" `null`** — otherwise a client repeatedly querying a non-existent key hits the
database on every request, indistinguishable at the cache layer from a legitimate
cold key.

**Rule 28.6 — Every cache operation MUST increment
`dumby_cache_requests_total{tier, result}`** (`result` ∈ `hit`/`miss`/`negative_hit`)
— a hit-ratio drop is one of the fastest available signals of cache
misconfiguration, well before it manifests as elevated database load.

## §29. State Externalization & Horizontal Scaling Directive

**Rule 29.1 — No state whose loss or divergence would be user-visible MUST ever be
held only in a single process's memory.** Every pod **MUST** be replaceable by an
orchestrator at any moment without losing anything a user would notice — the
structural precondition for zero-downtime rolling updates (§43.3).

**Rule 29.2 — State placement MUST follow this classification exactly:**

| ALWAYS Externalized (PostgreSQL/Redis) | NEVER Externalized (process-local, disposable) |
|---|---|
| Guild configuration, module enabled/disabled state | L1 cache contents (losing it costs one cache-miss round trip) |
| RBAC groups/sets/grants | In-flight command execution state (Discord can re-deliver; the shutdown drain step avoids this regardless) |
| Every component's persisted business data | Worker thread pool state (rebuilt fresh on process start) |
| Job queue state (BullMQ, Redis-backed) | Metrics counters before their periodic scrape |
| Audit history, developer/build records | — |
| Shard ownership locks (Redis, TTL-bound) | — |

**Rule 29.3 — Cross-shard coordination MUST choose mechanism by frequency and
latency tolerance, not by convenience.** `client.shard.broadcastEval()` is reserved
for low-frequency, operator-triggered needs (a fleet-wide count on demand, a targeted
diagnostic) — it carries meaningfully higher per-call latency since it round-trips
every shard and waits on the slowest. Redis pub/sub **MUST** handle everything routine
or high-frequency (cache invalidation broadcasts, cross-shard presence updates).

**Rule 29.4 — Exactly one process MUST hold the live gateway connection for a given
shard ID at any moment, enforced by a Redis-backed ownership lock, never by
convention:**

```
Process starts, claims shard N:
  SET shard-lock:{N} {processId} NX EX {ttl}
    ACQUIRED     → connect gateway for shard N; heartbeat-refresh the lock's
                   TTL every SHARD_LOCK_HEARTBEAT_MS (default 10,000 ms)
    NOT ACQUIRED → do NOT connect; retry every SHARD_LOCK_RETRY_MS (default
                   2,000 ms) — the expected, normal path during a rolling
                   update's brief overlap window
  Release: graceful shutdown releases explicitly; a crash releases naturally
  once the TTL lapses (bounded by at most one missed heartbeat's staleness)
```

This is what makes a rolling-update handoff safe: a new pod's claim attempt on a
shard the outgoing pod still owns simply retries until the outgoing pod's graceful
shutdown releases the lock explicitly — there **MUST NOT** be a window where two pods
believe they own the same shard.

**Rule 29.5 — Every partial-outage mode MUST degrade in a specified, tested way —
never in whatever way happens to fall out of the code:**

| Outage | Required Behavior |
|---|---|
| Redis unreachable | Cache reads fall through to PostgreSQL directly; shard locks fall back to last-known TTL and expire naturally. Redis availability **MUST** be treated as a first-class SLO target (§36.5), not merely an accelerator's uptime. |
| Read replica lagging beyond `DATABASE_REPLICA_MAX_LAG_MS` | Router falls back to the primary automatically — **MUST NOT** silently serve stale reads past the configured tolerance |
| One shard's gateway connection drops | Isolated to that shard's guilds only; every other shard and pod **MUST** continue normally; discord.js's own reconnection logic handles the resume in the common case |

# PART VI — RELIABILITY, SECURITY & OPERATIONS DIRECTIVES

---

## §30. Observability Directive

**Rule 30.1 — One `correlationId` MUST unify all three signal pillars for every
command execution, job run, and HTTP request.** Generated as a UUID at
`TraceMiddleware` (priority 0), it **MUST** be attached identically to every log line,
every trace span, and propagated into a job's own payload metadata when work is
deferred to the queue. Cross-signal correlation **MUST** be a direct ID lookup — never
a time-window reconstruction after the fact.

**Rule 30.2 — Pino is the sole logger; every line is structured JSON, never
plain-text interpolation.** A child logger **MUST** be created once per request scope,
pre-bound with `correlationId`, `guildId`, `userId`, `moduleId`, `shardId`, and handed
down through `CommandContext.logger` — an author never manually attaches these
fields.

**Rule 30.3 — Redaction of secret-shaped fields MUST happen at the logger level,
not by author discipline.** A fixed, centrally-maintained list of field-name patterns
(`token`, `password`, `secret`, `apiKey`, `authorization`, and case-insensitive/nested
variants) **MUST** be scrubbed to `[REDACTED]` before any line is serialized,
regardless of nesting depth — Principle P7 made structural.

| Level | Usage |
|---|---|
| `trace` | Per-middleware entry/exit — targeted local debugging only, never enabled by default in a deployed environment |
| `debug` | Cache hit/miss detail, sub-threshold query timing |
| `info` | Command start/success, job completion, lifecycle transitions |
| `warn` | Degraded-but-recovered: a rejected Admin-tier attempt, a slow query, a non-required component's load failure |
| `error` | Unexpected error at the root boundary, a critical query, a job exhausting its retries |

**Rule 30.4 — `prom-client` MUST expose Prometheus text format from `GET /metrics`,
and every deployment MUST get the following metric families with zero
component-specific instrumentation required:**

| Metric | Type | Labels |
|---|---|---|
| `dumby_commands_total` | Counter | module, command, status |
| `dumby_command_duration_seconds` | Histogram | module, command |
| `dumby_cache_requests_total` | Counter | tier, result |
| `dumby_errors_unexpected_total` | Counter | module (where attributable) |
| `dumby_queue_depth` | Gauge | queueName |
| `dumby_queue_job_duration_seconds` | Histogram | queueName, status |
| `dumby_db_pool_active_connections` | Gauge | — |
| `dumby_db_query_duration_seconds` | Histogram | table, operation |
| `dumby_shard_gateway_latency_ms` | Gauge | shardId |
| `dumby_guild_module_active` | Gauge | moduleSlug (fleet-wide count) |

**Rule 30.5 — Distributed tracing MUST open one root span per command execution
(at `TraceMiddleware`) and MUST auto-instrument child spans for every DB query above
the slow-query threshold, every job invocation, and every outbound HTTP call.**
`TRACE_SAMPLE_RATE` (default `0.1`) governs the recorded fraction — but **every span
belonging to a request that also produces an `error`-level log line MUST be sampled
unconditionally**, regardless of the configured rate. A failing request must never be
the one that got sampled out.

**Rule 30.6.** The three health endpoints (§17.3) **MUST** be treated as the fourth
observability signal — the one an orchestrator polls directly rather than one a human
queries during an investigation.

## §31. Error Management & Fault Tolerance Directive

**Rule 31.1 — `DumbyError` is the abstract base every recognized error extends,**
carrying a machine-readable `code`, an HTTP-status-equivalent, a `userMessage` safe
for an ephemeral reply, and an `isOperational` flag. Exactly eight concrete subclasses
**MUST** cover the taxonomy:

| Subclass | HTTP-Equiv. | Represents |
|---|---|---|
| `ValidationError` | 400 | Malformed/out-of-bounds input |
| `PermissionDeniedError` | 403 | Any authorization failure (Layers 4–7, §24, or a component-level check) |
| `NotFoundError` | 404 | A referenced resource doesn't exist |
| `ConflictError` | 409 | A state conflict — double-processing, an already-resolved action repeated |
| `RateLimitExceededError` | 429 | The global limiter or a command's own cooldown |
| `ExternalServiceError` | 502 | A Discord REST call or a third-party integration failed |
| `ConfigurationError` | 500 | A startup-time or dependency-graph integrity violation — parent to `CircularDependencyError`, `CommandKeyCollisionError`, `EventCycleError` |
| `InternalError` | 500 | Unexpected/uncategorized — the root boundary's "UNEXPECTED" branch |

`isOperational: true` on the first six means "an expected outcome — reply and move
on." `ConfigurationError` and `InternalError` default `isOperational: false` — both
represent something structurally wrong and **MUST** be logged with full context and
alerted on, never treated as routine.

**Rule 31.2 — Isolation MUST hold at exactly three boundaries, each independently:**

| Boundary | Guarantee |
|---|---|
| Command execution | The root error boundary (§22.3) catches everything inside one command's pipeline — a failing command never affects a concurrently-running one |
| Gateway event handlers | `EventRouter` wraps each handler in its own try/catch (§21.2) — one component's handler throwing never blocks another's for the same event |
| Component load/ready | A non-required component's `onLoad`/`onReady` failure disables that component alone (Stages 12 & 17) — startup and runtime both continue |

**Rule 31.3 — Two retry mechanisms exist and MUST NEVER be composed (nested one
inside the other for the same operation):**

| | In-Request Retry Utility | BullMQ Job Retry |
|---|---|---|
| Scope | Within one synchronous handler execution | Across a job's entire re-queue-and-re-execute lifecycle |
| Typical delay | Sub-second to low seconds | Seconds to minutes |
| Use case | A flaky external call inside a handler — retry before the interaction's response window closes | A job whose whole attempt failed, needing a fresh later attempt |
| Defaults | `maxAttempts: 3`, `baseDelayMs: 1000`, `maxDelayMs: 30000`, ±20% jitter | `attempts: 3`, exponential backoff 5s/10s/20s |

The in-request utility's jitter **MUST** exist specifically to prevent many concurrent
requests retrying in lockstep and recreating the load spike that caused the original
failure.

**Rule 31.4 — A `CircuitBreaker` MUST be available to wrap any external dependency
call path**, with this exact state machine: `CLOSED` (calls pass through, failures
tracked in a rolling window of the last 20) → transitions to `OPEN` once failure rate
reaches **≥ 50% over the last 20 requests** (calls fail immediately, no network
attempt made) → after **30 seconds**, transitions to `HALF_OPEN` (one trial call
permitted) → trial succeeds → `CLOSED`; trial fails → back to `OPEN`.

**Rule 31.5 — Event-loop lag MUST be monitored continuously; exceeding
`EVENT_LOOP_LAG_SHED_THRESHOLD_MS` (default 50) MUST trigger load-shedding** —
interaction acknowledgments prioritized over background/non-critical work (scheduled
task ticks, low-priority queue consumption throttled) until lag returns under
threshold.

**Rule 31.6 — A global maintenance-mode flag, set/cleared exclusively through the
control plane (§25.3), MUST be checked by the outermost middleware layer
(priority -20).** While set, every command **MUST** short-circuit with a maintenance
notice, except an explicitly allow-listed set of commands capable of ending
maintenance mode itself — an operator **MUST NOT** be locked out of the one mechanism
needed to end the window they started.

## §32. Job Queue & Scheduling Operations Directive

**Rule 32.1 — Jobs and tasks are two distinct authoring models and MUST NOT be
conflated:**

| | Jobs | Tasks |
|---|---|---|
| Trigger | Enqueued programmatically, optionally delayed | Registered into the Scheduler, fired on a cron expression |
| Base class | `BaseProcessor<TPayload>` | `BaseTask` |
| Cardinality | One instance of work per enqueue call | One firing per cron tick, **fleet-wide** (never once per pod) |
| Failure handling | BullMQ's own retry + DLQ | Logged and alerted; a missed tick is not auto-retried — the next scheduled tick is the natural recovery |

**Rule 32.2 — Every job processor's `process()` implementation MUST be idempotent**
— safely re-runnable with the same payload producing no additional side effect beyond
the first successful run (BullMQ guarantees only at-least-once delivery). The
canonical pattern: check the record's current status before acting; treat anything
other than the expected precondition as "already handled." `jobId` **SHOULD** be set
deliberately at enqueue time so the enqueue operation itself is idempotent — enqueuing
the same `jobId` twice **MUST** be a safe no-op at the queue level.

**Rule 32.3 — Retry defaults MUST be `attempts: 3`, exponential backoff `5s → 10s →
20s`; on exhaustion, a job MUST move to a dead-letter entry preserving the full
payload and every attempt's failure reason — never silently dropped.** A
dead-lettered job **MUST** remain visible to an operator for manual inspection and
requeue via the control plane.

**Rule 32.4 — Worker concurrency MUST be an explicit, per-queue configuration
value, not one global setting.** Dedicated worker processes **MUST** scale
horizontally targeting `dumby_queue_depth` rather than CPU alone — a backing-up queue
is a more direct capacity signal for I/O-bound job workloads.

**Rule 32.5 — Every scheduled tick MUST fire exactly once fleet-wide, enforced by a
distributed lock**, using the identical pattern as shard-ownership locking (§29.4):
every pod attempts `SET task-lock:{taskName}:{tickTimestamp} NX`; exactly one
succeeds and executes; every other pod's attempt fails the check and skips that tick
— no retry needed, since one execution fleet-wide is the intended outcome.

## §33. Localization Infrastructure Directive

*(Backend resolution mechanism only — translated copy itself is content, not
architecture, and is out of this directive's scope where it pertains to end-user
surfaces, §0.3.)*

**Rule 33.1 — Locale resolution MUST follow a fixed precedence, evaluated once per
interaction:** (1) guild config's explicit locale setting, if present, always wins;
(2) Discord's own `interaction.locale` hint; (3) deployment default (`en-US`).

**Rule 33.2 — `I18nManager` MUST merge every component's locale files into one
global catalog, namespaced by owner name so identical short keys never collide.**
`en-US.json` **MUST** be mandatory for every component (validation-time failure if
missing) — it is both the deployment default and the fallback of last resort. A
missing translation key in a resolved locale **MUST** fall back to `en-US` for that
key specifically — a partially-translated locale degrades key-by-key, never as an
all-or-nothing swap back to English for the entire response.

**Rule 33.3 — RTL languages MUST be supported identically to any other locale** —
translation strings are plain text with no directional markup embedded by the
framework; Discord's own client renders RTL text based on Unicode directionality. The
framework's responsibility ends at supplying a correctly-encoded string.

**Rule 33.4 — Date/time/number/currency formatting MUST be locale- and
timezone-aware, built on the standard `Intl` API, and MUST resolve against the
relevant guild's configured timezone — never the server process's own local
timezone** (deployment-dependent and meaningless to a guild's members), falling back
to UTC when unset.

## §34. Analytics & Telemetry Directive

**Rule 34.1 — Analytics and observability MUST be kept structurally separate** —
different tables, different retention policies, different consumers. Observability
answers "is the system healthy right now"; analytics answers "how is this product
actually being used." Conflating them serves neither question well.

**Rule 34.2 — Analytics collection MUST NOT be on any command's critical path.**
Writes batch in-memory and flush to PostgreSQL on an interval — never a synchronous
write during command execution — so analytics collection can never be the reason a
command's response is slow, and a batch-write failure never fails the command it was
describing.

**Rule 34.3 — Guild-facing usage analytics MUST be strictly guild-scoped** — an
administrator sees only their own guild's data, never cross-guild comparisons or
platform-wide aggregates.

**Rule 34.4 — The Metric Track Protocol (MTP) MUST be the one common,
module-agnostic usage-metering standard**, writing to `metering_usage_daily`, so no
component invents its own bespoke accounting. MTP defines one abstract **metric
unit** — not a real-world currency or API token — that any component reports
consumption in, weighted by a configurable formula (a command invocation, a
background job execution, a megabyte-day of storage each convert at their own
configured rate). The result **MUST** be one column, `metricUnitsConsumed`, directly
comparable across every component and guild, with a `breakdown` JSONB column
preserving per-component contribution. MTP's entire purpose is to be the data
foundation a future monetization model would consume, mapping onto the reserved,
empty monetization scaffold (§16.5) — **without the core itself implementing any
billing, quota-enforcement, or payment logic.** A deployment **MAY** run MTP purely
for its own operational insight, indefinitely, with zero monetization behavior
attached.

**Rule 34.5 — Framework telemetry MUST be a distinct, opt-out channel reporting
only fully anonymized, aggregate signals** (framework version, Node.js runtime
version, loaded-component count by tier) — controlled by one `TELEMETRY_ENABLED`
variable, defaulting `true` but documented and trivial to disable. **No guild ID, user
ID, message content, or guild-identifying value of any kind MUST ever leave a
deployment through this channel** — the payload shape is fixed and auditable by
design, not by best-effort redaction.

## §35. Security Architecture Directive

**Rule 35.1 — Every secret MUST be supplied exclusively through environment
variables injected by the orchestrator** (Kubernetes Secrets sealed at rest, or an
external vault) — never committed to source control, never baked into an image
layer. `.env` files **MUST** be unconditionally `.gitignore`d; CI **MUST** include a
secret-scanning step failing the build on any pattern resembling a committed
credential, independent of developer discipline.

**Rule 35.2 — Non-production credential separation is mandatory.** A production
deployment's secrets **MUST** be categorically distinct values from any staging or
development equivalent — never shared, never reused, never derived from one another.
This is what gives the Admin-tier Layer 4 environment guard (§24.9) its actual
security force: even if that check were somehow subverted, the production credentials
required to cause meaningful damage simply do not exist in a non-production
configuration.

**Rule 35.3 — Every credential-shaped value follows one uniform handling
discipline** (§25.6's Table applies without exception): cryptographically random
generation, Argon2id hashing at rest (never a raw value persisted anywhere),
`Authorization`-header-only transmission, independent revocability.

**Rule 35.4 — Every trust boundary MUST validate against an explicit Zod schema
before any business logic runs** — command options, HTTP request bodies, inbound
webhook payloads, process configuration, every component manifest. No layer **MUST**
trust data merely because it arrived from another layer inside the same process.

**Rule 35.5 — Every inbound webhook route MUST verify a cryptographic signature
before any payload is parsed as trusted input**, following this exact gate:

```
Request arrives → signature present & well-formed? NO → 401, reject, warn-log
  → YES → signature valid against configured shared secret? NO → 401, reject
  → YES → timestamp within replay-protection tolerance window? OUTSIDE → 401, reject
  → WITHIN → payload now trusted — proceed to schema validation + business logic
```

**A webhook route with no signature verification configured MUST refuse to
register at all** — there is no supported "unverified webhook" mode.

**Rule 35.6 — Privilege escalation MUST be structurally blocked at each of these
vectors, not merely discouraged by convention:**

| Vector | Structural Block |
|---|---|
| A component requesting broader Discord intents at runtime than declared | The intent union is computed ONCE, from every loaded component's manifest, before login — nothing after login can add to it |
| A lower-privilege component reaching elevated authority | Structural isolation prevents any component from importing or invoking another's code directly; the Admin-tier gate (§24.9) is independent of and additional to this |
| A guild administrator self-granting an elevated RBAC role | RBAC resolution is computed fresh from actual Discord role membership on every interaction — a config write cannot itself grant an RBAC role |
| Direct cross-boundary writes to another owner's tables | Never acceptable through any sanctioned pattern — a code-review hard stop with no carve-out |

**Rule 35.7 — Dependency security MUST be a CI gate, not a periodic manual
review.** The lockfile is committed; CI runs with `--frozen-lockfile`. A dedicated
dependency-review workflow **MUST** run on every PR introducing or updating a
dependency, blocking merge on any newly-introduced critical/high-severity known
vulnerability, and flagging lower-severity issues for reviewer judgment. A new
dependency for functionality the standard library or an already-present dependency
could reasonably cover **IS** a legitimate review objection — every added dependency
is also an added trust boundary.

**Rule 35.8 — `audit_logs` MUST be the single, append-only, never-updated record
every consequential action writes to** — every control-plane function (§25.3),
deployment lifecycle events, every guild configuration change (§26.6), every
Admin-tier invocation granted or rejected (§24.9). Security review of "what happened
and who did it" **MUST** be answerable from one table, never a reconstruction across
scattered application logs.

**Rule 35.9 — Encryption responsibility MUST be assigned per layer, never
reimplemented where infrastructure already provides it:**

| Layer | Treatment |
|---|---|
| In transit — DB, Redis, HTTP ingress | TLS, application-enforced (Knex and Redis client configs both require it where supported; external TLS terminates at the ingress) |
| In transit — Discord gateway/REST | Inherent — discord.js's clients use TLS unconditionally; not application-configurable |
| At rest — database and cache volumes | Infrastructure-layer responsibility (cloud provider disk/volume encryption via Terraform) — **not** reimplemented at the application layer as a second, weaker, hand-rolled encryption layer |
| Credential-shaped values specifically | Argon2id hashing, **never** symmetric/asymmetric encryption — a password-shaped secret must never be recoverable in plaintext by anyone, including the system itself |

## §36. Performance & Scalability Engineering Directive

**Rule 36.1.** No application code **MUST** ever assume an unsharded topology —
`context.shardId` is always populated, sharded deployment or not. Each pod carries a
contiguous shard range sized to stay well clear of Discord's own per-shard gateway
rate limits.

**Rule 36.2 — Rolling updates MUST use `maxUnavailable: 0` / `maxSurge: 1`,** and
**MUST** follow this exact per-pod sequence:

```
New pod scheduled (surge, count momentarily N+1)
  → runs the full 18-stage bootstrap, including full component load + onReady
  → /health/readiness returns 200 → added to Service endpoints, receives traffic
  → Kubernetes sends SIGTERM to ONE old pod
  → old pod executes the full 9-step graceful shutdown, releasing shard-
    ownership locks explicitly at Step 01
  → new pod's already-polling shard-claim retry succeeds the moment the lock
    releases — no gap where a shard is unowned
  → old pod exits; count returns to N; proceed to next pod
```

This repeats one pod at a time. The shard-ownership lock model (§29.4) is a **hard
prerequisite** for this strategy to be safe — without it, a window where both old and
new pod believe they own the same shard would be possible during the handoff.

**Rule 36.3 — Scaling targets MUST be component-specific, never CPU alone
fleet-wide:**

| Component | Autoscaling Target |
|---|---|
| Bot pods (gateway-connected) | Blend of CPU utilization and shard count per pod — shard count acts as a floor so scale-out keeps pace with guild growth even when CPU looks moderate |
| Dedicated worker pods | `dumby_queue_depth` — a backing-up queue is a more direct capacity signal than CPU for I/O-bound job workloads |
| Separately-deployed HTTP server | Request rate and P95 latency |

**Rule 36.4.** `DATABASE_POOL_MAX` (default 10 per process) **MUST** be tuned down as
pod count scales up, in coordination with PostgreSQL's own connection ceiling — never
left fixed while fleet-wide connection count scales unbounded with pod count.
`DATABASE_STATEMENT_TIMEOUT_MS` (default 10,000) **MUST** prevent one runaway query
from holding a connection indefinitely. Every owner's migrations **MUST** include the
indexes its own known query patterns require — index coverage for hot paths is a
standard code-review checklist item.

**Rule 36.5 — SLOs MUST be tracked at these targets, with warn/critical
thresholds distinct from target:**

| Signal | Target | Warn | Critical |
|---|---|---|---|
| Command P95 end-to-end latency | < 3,000 ms | ≥ 3,000 ms | ≥ 5,000 ms |
| Unexpected error rate | < 2% | ≥ 2% | ≥ 5% |
| Cache hit ratio (non-Core tiers) | > 70% | ≤ 70% | ≤ 50% |
| Cache hit ratio (Core tier) | > 95% | ≤ 95% | ≤ 85% |
| Queue depth trend | Draining within minutes | Sustained growth over 15 min | Sustained growth, approaching worker saturation |
| Redis availability | 99.9% | Any observed blip | Any sustained outage beyond a few minutes |

**Rule 36.6 — The command-dispatch hot path (`interactionCreate` firing → handler
beginning execution) is held to the tightest performance discipline in the system**
and **MUST** preserve all three of: the module-active check and middleware config
lookups resolving through L1 cache in the overwhelming majority of cases (never
touching Redis/PostgreSQL on the common path); `CommandRegistry`'s O(1) map-based
lookup regardless of command count; and Core tier's deliberate skip of the RBAC
resolution step. Anything CPU-heavy enough to threaten the event loop's ability to
service this path promptly **MUST** be moved off it entirely (worker thread
offloading), never optimized in place.

## §37. Privacy & Compliance Directive

**Rule 37.1 — Data minimization is enforced by the same mechanism that enforces
component isolation, not by a separate policy layered on top.** The framework
**MUST** request only the union of Discord intents its loaded components actually
declare — never a broad, precautionary set "in case a future feature needs them." The
same discipline applies to stored data: capture what a feature genuinely needs, not
every field an upstream API happens to expose.

**Rule 37.2 — A right-to-erasure workflow MUST reach every owner's tables, not
just core-owned ones.** Every repository **MUST** expose a standard
`purgeByUserId`/`purgeByGuildId` hook; a central erasure-coordinator service invokes
every registered hook and records the outcome in `audit_logs` — a single, auditable
confirmation that erasure reached every table system-wide, never dependent on a
manually-maintained checklist.

**Rule 37.3 — Data retention MUST be a per-guild, per-component configurable
choice** between `retain` (keep intact against possible re-enabling) and
`purge_after_30d` (a scheduled task erases it if the component remains disabled past
that window) — never a single fleet-wide default applied uniformly regardless of
guild preference.

**Rule 37.4 — Anonymization guarantees MUST be structural, not best-effort.**
Guild-facing analytics **MUST** be guild-scoped by construction, never aggregated
across guilds in a way that could re-identify one guild's pattern from another's.
Framework telemetry's payload schema **MUST** have no field capable of carrying
guild-identifying, user-identifying, or content data at all — a stronger guarantee
than a redaction step applied after the fact to a payload that could otherwise carry
it.

**Rule 37.5 — Data residency MUST be satisfied entirely at the infrastructure
layer.** Because PostgreSQL and Redis are the sole locations any persistent state
lives, a deployment's data-residency posture is a function of where those two stores
are provisioned. Database and cache region **MUST** be an explicit, top-level
Terraform configuration input — never something requiring region-awareness threaded
through application code.

**Rule 37.6.** This architecture's uniform privacy posture (minimization, erasure,
retention applied identically regardless of who data belongs to) is a **floor, not a
substitute**, for any jurisdiction-specific regulatory obligation (including
child-specific rules) a given deployment may additionally be subject to.

## §38. Multi-Identity Operation Infrastructure Directive (Twill/Personas)

**Rule 38.1 — Two hard, platform-level ceilings — not a framework limitation — are
what motivate supporting more than one identity per deployment:** a 100-registered-
command ceiling per guild per application, and one concurrent voice connection per
guild per application. Neither can be raised by any mechanism this framework
provides — only a second identity works around them.

**Rule 38.2 — A Persona MUST be the identical framework, bootstrapped through the
identical eighteen-stage sequence, as a genuinely separate Discord Application** —
its own application ID, bot token, branding, gateway connection — never a lighter
build, a feature flag, or a reduced-functionality process. A running Persona **MUST**
share the same PostgreSQL primary, Redis instance, and job queues as the main bot and
every other Persona.

| | Main Bot | Persona |
|---|---|---|
| Command budget | Its own 100/guild ceiling | An independent, separate 100/guild ceiling |
| Voice capacity | One per guild | One per guild, independent of the main bot's |
| Codebase | Primary | **Identical** — never a fork or reduced build |
| Database/cache/queues | Shared | Shared — same instances |
| RBAC/permission engine/config | Same source of truth | Same source of truth |

**Rule 38.3 — Persona bindings (which identity runs which component, per guild)
MUST be a guild-level configuration choice, stored alongside module-state data** —
never a fleet-wide default. Command deployment and voice-connection allocation
**MUST** be computed per-identity: each identity's own `CommandDeployer` registers
only the components bound to it, yielding genuinely independent 100-command budgets
per identity.

**Rule 38.4 — Creating, branding, and deploying a new Persona MUST be reserved to
process owners** (the identical list gating Admin-tier access), exercised only
through owner-level tooling — **never** something a guild administrator can trigger
unilaterally. A guild administrator's authority is limited to *binding* an
already-created, already-invited Persona to specific components for their own guild
— never to instantiating new identities.

# PART VII — ENGINEERING LIFECYCLE DIRECTIVES

---

## §39. Testing Architecture Directive

**Rule 39.1.** Principle P8 — test in isolation, deploy with confidence — governs
this entire section. Because every class's dependencies arrive through the DI
container (§19), every class **MUST** be testable in complete isolation from real
infrastructure, and the pyramid below **MUST** be organized to exploit that as fully
as possible before paying the higher cost of an integration or end-to-end test.

**Rule 39.2 — The four-tier pyramid, illustrative scale for a mature deployment:**

| Layer | What It Verifies | Real Infra? | Run Frequency |
|---|---|---|---|
| Unit (~500+, the large base) | One class's logic in isolation, via `MockContainer` | None — mocks substitute everything | Every commit, every PR |
| Integration (~50) | A repository against a real test-database instance; a service+repository pair together | Real test-database instance | Every PR |
| Happy-Path Smoke (~15) | One golden-path assertion per critical command | `MockContainer`, minimal real infra | Pre-deploy, release gate |
| E2E (~10) | The full stack against a real test Discord guild and real bot connection | Real Discord test guild, real connection | Pre-release, not per-commit |

**Rule 39.3 — A well-formed unit test MUST construct `MockContainer`, register the
real class under test, resolve it, exercise it, and assert against typed assertion
methods (`assertEmitted`, `assertEnqueued`, `assertLogged`)** — no real network call,
no real database, no real Discord connection, ever, at this layer. Reusable, realistic
fixture data (a fixture guild, user, case) **MUST** live in one shared location so tests
across the codebase share a consistent baseline rather than hand-rolling ad hoc data
per test.

**Rule 39.4 — Coverage floors MUST be enforced per-layer as hard CI gates, never as
a single repository-wide blended average:**

| Layer | Statement | Branch |
|---|---|---|
| Application Core (`src/core/`) | 85% | 80% |
| Component services | 80% | 75% |
| Component commands | 75% | 70% |
| Repositories (core and component) | 70% | 65% |
| Infra-adjacent services (queue processors, HTTP routes) | 70% | 65% |

A change that adds well-tested component code **MUST NOT** be able to mask a drop in
Core coverage by diluting a blended average — each layer's own floor holds
independently.

**Rule 39.5 — Load and performance testing is a distinct, release-gate activity for
changes touching the hot dispatch path** (middleware pipeline, permission engine,
cache layer) — synthetic interaction volume ramped against a staging deployment,
measuring the same P95/P99 latency and error-rate signals production alerting
watches. This validates SLO targets (§36.5) directly against real infrastructure,
never against unit-level mocks, and is **not** a per-commit check.

## §40. Developer Tooling & Experience Directive

**Rule 40.1 — Scaffolding tooling is developer convenience, never core
functionality (§4).** A scaffolding CLI generating a manifest-valid skeleton **MUST**
produce output the framework treats identically to a hand-authored equivalent — its
only power is saving retyped boilerplate, never conferring a capability a hand-written
component lacks.

**Rule 40.2 — Committed editor configuration MUST match CI's own format/lint
expectations exactly**, so a contributor's auto-format-on-save produces output
identical to what CI's format check expects — never a source of "works on my machine"
formatting drift.

**Rule 40.3 — Development-mode diagnostics MUST be additive, never a different code
path from production.** `NODE_ENV === 'development'` **MAY** enable `trace`-level
logging by default, a verbose DI resolution log, and relaxed rate limits for local
iteration — but the bootstrap sequence, middleware pipeline, and every architectural
rule elsewhere in this directive **MUST** behave identically to production.

**Rule 40.4 — Architecture-specific lint rules MUST be enforced by tooling, never
left to review discipline alone:**

| Rule | Catches |
|---|---|
| `no-cross-module-relative-import` | The foundational isolation guarantee — a component reaching into another owner's internal files |
| `no-direct-process-env` | Any `process.env` access outside a declared, validated config schema |
| `no-repository-in-command` | A command file importing a repository directly, bypassing the service layer |
| `no-event-emit-in-repository` | A repository method calling `eventBus.emit` — business-event decisions belong to the service layer |
| `require-eventsCatalog-entry` | An `emit()` call for an event name absent from the emitting component's own declared catalog |

**Rule 40.5 — API/contract documentation MUST be generated from the same manifest
source the runtime reads, never hand-maintained prose describing it separately.** This
is what keeps a published contract and its actual runtime behavior mechanically
guaranteed to agree.

## §41. Development Workflow Directive

**Rule 41.1 — Local development MUST run the identical bootstrap sequence (§17)
every environment runs**, with hot-reload layered on top via a file watcher — there
**MUST NOT** be a separate, reduced "local mode" bootstrap path to keep in sync with
production's own startup logic.

**Rule 41.2 — Commit messages MUST follow Conventional Commits**
(`feat:`, `fix:`, `chore:`, `refactor:`, `docs:`, `test:`, optionally scoped),
enforced by a commit-message hook, rejecting any non-conforming commit. This
discipline is a hard prerequisite for automated changelog generation (§44.3) —
**never** a stylistic nicety.

**Rule 41.3 — The standard feature cycle MUST be:** issue/proposal → branch →
implementation (following the layering and isolation rules throughout) → unit tests
written *alongside* implementation, not after (a PR touching service/command code
with no corresponding test change is a review flag) → local `lint && typecheck &&
test` (identical commands CI runs) → PR opened → CI gates → human review → merge →
automated release flow picks up the change.

**Rule 41.4 — Code review MUST specifically check, beyond ordinary code quality:**

| # | Check |
|---|---|
| 1 | Tier/privilege honesty — does a declared privilege level genuinely match how this component is meant to be controlled, not merely what's convenient to ship? |
| 2 | Layering — no repository logic in a command, no business rule in a repository, no event emission below the service layer |
| 3 | No cross-boundary reach beyond sanctioned patterns — lint catches the import case; review catches subtler violations |
| 4 | Every migration has a working `down()` |
| 5 | The event catalog is current against every actual `emit()` call |
| 6 | New jobs are idempotent — the pre-condition-check pattern is present, not merely that a test exists |
| 7 | Coverage floors met per-layer, not merely a blended average |

## §42. CI/CD Pipeline Directive

**Rule 42.1 — CI MUST run as a strict, fail-fast sequence on every PR and every
push to the main branch — a later stage never runs if an earlier one fails:**

```
pnpm install --frozen-lockfile
  → tsc --noEmit                      (typecheck, strict mode)
  → eslint .                          (lint, including every architecture rule)
  → prettier --check .                (format)
  → vitest run --coverage             (full pyramid; per-layer coverage gates)
  → tsc -p tsconfig.build.json         (production build — confirms the
                                        deployable artifact compiles cleanly,
                                        not merely the dev-time type check)
```

**Rule 42.2 — Release MUST be fully automated on merge to main** — computing the
next semver bump from accumulated changeset files and generating the changelog with
no manual version-bump commit from any contributor.

**Rule 42.3 — Staging deployment MUST trigger automatically on every merge to
main, with no manual approval required** — the fast-feedback target where the
rolling-update mechanism, this release's migrations, and the full feature set are
exercised against real (non-production) infrastructure before reaching a
guild-serving fleet.

**Rule 42.4 — Production deployment MUST require an explicit two-approver manual
gate — two distinct human approvals, never one** — reflecting that it is the one
action in the pipeline capable of affecting every guild simultaneously. Once
approved, it **MUST** execute the identical zero-downtime rolling-update mechanism
(§36.2) every other trigger uses — there is exactly **one** rollout mechanism in this
architecture, never a separate "manual deploy path" diverging from the automated one.

**Rule 42.5 — Dependency review MUST run on any PR introducing or updating a
dependency**, blocking merge on any newly-introduced critical/high-severity known
vulnerability.

| Workflow | Trigger | Gate |
|---|---|---|
| CI | Every PR, every push to main | Fully automated |
| Release | Merge to main | Fully automated |
| Staging deploy | Merge to main | Fully automated |
| Production deploy | Manual dispatch or post-staging-validation | Two-approver manual gate, always |
| Dependency review | PR touching dependencies | Automated, severity-gated |

## §43. Infrastructure & Deployment Directive

**Rule 43.1 — The container build MUST be multi-stage, and the shipped image MUST
contain nothing beyond the compiled application:**

```
STAGE 1 (builder): full dependency tree (incl. devDependencies) → tsc build
STAGE 2 (runtime): production dependencies ONLY, copying ONLY the compiled
  output from Stage 1 — no TypeScript source, no devDependencies, no test
  files. Non-root user; read-only root filesystem where the base image permits.
```

**Rule 43.2 — Kubernetes manifests MUST be organized as `base/` + environment
`overlays/`,** with production the only overlay the production-deploy workflow is
permitted to apply. The reference deployment spec **MUST** set:

```yaml
strategy:
  type: RollingUpdate
  rollingUpdate: { maxUnavailable: 0, maxSurge: 1 }   # §36.2
template:
  spec:
    terminationGracePeriodSeconds: 190   # §18.2 — worst-case 180s + 10s buffer
    containers:
      - livenessProbe:  { httpGet: { path: /health/liveness,  port: 3000 } }
        startupProbe:   { httpGet: { path: /health/startup,   port: 3000 },
                           failureThreshold: 30 }   # generous — component
                                                     # onReady() can legitimately
                                                     # take a while at scale
        readinessProbe: { httpGet: { path: /health/readiness, port: 3000 } }
```

**Rule 43.3 — The bot workload MUST be a `Deployment`, never a `StatefulSet`.**
Shard ownership is dynamic and Redis-lock-mediated (§29.4), not tied to a pod's stable
network identity — the stable-identity guarantee a `StatefulSet` provides is
unneeded, and the simpler scaling/rollout semantics of a `Deployment` are the correct,
sufficient primitive.

**Rule 43.4 — Infrastructure-as-code MUST separate environments completely — never
sharing a state file between staging and production.** Database and cache **region**
**MUST** be an explicit, top-level module variable, satisfying any data-residency
requirement by setting one variable per environment rather than threading
region-awareness through application code.

**Rule 43.5 — Every control-plane service (§25) and every Persona (§38) MUST get
its own Kubernetes `Deployment`**, typically single- or small-replica-count since none
carries shardable gateway load. CLAI's SSH listener and PEP's REST API **MUST NOT** be
exposed on a public-facing Service/Ingress — reachable only via bastion, VPN, or an
equivalent in-cluster-only path. A Persona **MUST** deploy as an entirely separate
instance of the identical bot `Deployment` manifest and image, differing only in the
`Secret` supplying its own distinct bot token — never a special-cased workload type.

**Rule 43.6 — Infrastructure sizing MUST scale with deployment stage, not be
over-engineered for a single-server operator nor under-provisioned for a large
fleet:**

| Scale | Reasonable Shape |
|---|---|
| Single-server operator | One process, one small managed Postgres, one small Redis. No read replicas, no HPA, no multi-approver gate needed in practice. |
| Growing platform | Multiple bot pods behind an HPA, a primary with ≥1 read replica, managed Redis, dedicated worker pods, a staging environment mirroring production topology. |
| Large-scale fleet | Full sharding across many pods, multiple read replicas, dedicated worker pools per queue category, the two-approver gate genuinely earning its keep, Personas in active use. |

**Rule 43.7 — Resource `requests`/`limits` MUST be sized from observed steady-state
measurement (staging load testing, §39.5), never guessed.** A `limits.memory` set too
tight risks an OOM-kill mid-command, discarding in-flight work despite every other
effort in this architecture to keep that work recoverable.

## §44. Versioning, Release & Migration Directive

**Rule 44.1 — Two independent version numbers MUST exist side by side and MUST
NEVER be conflated:** the framework's own version (the core codebase) and each
component's own version. A framework version bump **MUST NOT** imply any component
needs a version bump, and vice versa.

**Rule 44.2 — Any breaking change to a public contract (a provided token's
signature, an emitted event payload, a command name) MUST follow the deprecation
path — a breaking change is never shipped directly:**

```
Breaking change identified as necessary
  → OLD shape marked deprecated (minimum: a documented deprecation notice;
    ideally a runtime warning logged once per process lifetime, not per-call,
    to avoid log-flooding a heavily-used deprecated path)
  → BOTH old and new shapes coexist for a documented deprecation window
  → major version bump (a consumer pinned to the old major version never
    resolves the breaking change until it deliberately updates its own pin)
  → the deprecated shape is removed only after the window closes
```

**Rule 44.3 — Every PR introducing a user-facing change MUST include a changeset
file** describing the change and its intended semver category, authored by the
contributor at PR time — never reconstructed later from commit history. The release
workflow aggregates every accumulated changeset on merge, computing the correct
combined version bump and changelog entry automatically; a contributor **MUST NEVER**
hand-edit the changelog or manually decide a version number.

**Rule 44.4.** Migration discipline (§27.4) and this section's deprecation
discipline are two views of one value: Principle P11 governs a component's *code*
contract; Principle P10's reversible-migration requirement governs its *data*
contract. Together they **MUST** make upgrading a component, or the framework itself,
a routine, low-risk operation — never an event requiring bespoke coordination.

## §45. Troubleshooting & Operational Runbooks Directive

**Rule 45.1 — Runbook: Startup Failure.** *Symptom: pod fails to reach Ready;
`/health/startup` never returns 200.*

1. The **last bootstrap stage name logged is the diagnosis** — Stage 02 is a config
   problem; Stage 05/07 is a database/Redis reachability problem; Stage 11/12 is a
   manifest or component-code problem from a recent change.
2. Stage 02 failure → read the field-level validation error directly; it names the
   exact variable and constraint that failed.
3. Stage 05/07 failure → verify network policy, credentials, and actual reachability
   from the pod's network position — **not** a code-level bug in the overwhelming
   majority of cases.
4. Stage 11 failure → the error names the offending component and the specific
   manifest field or dependency-cycle path — almost always traceable to whatever
   changed most recently.
5. Stage 12 failure on a `required: true` component → check whether that `required`
   flag still accurately reflects its actual importance — a component that shouldn't
   be able to take down the whole process is a design smell worth revisiting, not
   just a bug to patch.

**Rule 45.2 — Runbook: High Error Rate.** *Symptom: the unexpected-error ratio
crosses a warn or critical threshold (§36.5).*

1. Filter by component/command label **first** — a spike concentrated in one is a
   very different incident than one spread evenly.
2. Concentrated → check whether that component was part of the most recent
   deployment/hot-swap before assuming a pre-existing bug just started manifesting.
3. Spread across everything → suspect shared infrastructure first (database
   slow/critical query metrics, cache hit ratio, Redis reachability) — **not**
   component code, since no single change plausibly explains an even spread.
4. If a specific recent version is implicated, a control-plane suspend or version
   rollback (§25.3) is the fastest mitigation — resolve root cause **after**
   restoring stability, not before.
5. Filter on the `isOperational` flag specifically to separate "a lot of normal
   validation rejections" from "a lot of genuine bugs" — the two look identical in
   an undifferentiated error-count graph but require completely different responses.

**Rule 45.3 — Runbook: Shard Disconnect.** *Symptom: a shard's gateway-latency
metric goes stale or the shard stops appearing in metrics.*

1. Confirm scope first — one shard (likely a Discord-side session issue already
   self-healing), every shard on one pod (pod-level network problem), or fleet-wide
   (a Discord platform incident, not this deployment).
2. Check whether the affected shard's ownership lock is still held by its expected
   owner, or expired with no other pod having claimed it — a stuck, unclaimed lock
   after a crash (rather than a graceful release) is the specific failure mode to
   check for.
3. If unclaimed with no pod retrying, verify the retry loop itself is running
   **rather than manually intervening in the lock table directly** — manual lock
   manipulation risks creating exactly the dual-ownership scenario the lock exists
   to prevent.
4. A single graceful pod restart is almost always sufficient and safer than any
   manual lock-table edit.

**Rule 45.4 — Runbook: Memory Growth.** *Symptom: pod memory climbs steadily
rather than reaching a stable steady state.*

1. Distinguish a genuine leak from an under-provisioned L1 cache first — an L1
   simply sized larger than the real working set looks identical to a leak on a
   memory graph but isn't one.
2. Check for an accumulating event listener — a component registering an
   event-bus subscription on load without a matching removal on unload is the single
   most common actual leak source; this correlates with reload frequency, not
   steady request volume.
3. Check the worker thread pool isn't accumulating unreturned threads under
   sustained CPU-heavy job volume.
4. A heap snapshot comparison across two points in the growth curve is the
   conclusive diagnostic once the above are ruled out — standard Node.js inspector
   tooling, no bespoke profiling tool of this framework's own.

**Rule 45.5 — Runbook: Slow Command.** *Symptom: a command's P95/P99 crosses its
target.*

1. Check database query duration for this command's known query patterns first — a
   query newly crossing a slow/critical threshold is the most common root cause and
   fastest to confirm or rule out.
2. If no query is implicated, check whether the command recently lost
   defer-eligibility or gained a new synchronous external call (a circuit breaker is
   the fix if an external dependency is the culprit).
3. Check the relevant cache hit ratio — a ratio below target, especially concentrated
   around a specific key namespace, is more often a TTL set too short than a true
   capacity problem.
4. Check whether event-loop lag shedding is active — the command's slowness may be a
   symptom of general process load, not anything specific to it.
5. Immediate mitigation regardless of confirmed root cause: verify defer-on-invoke is
   set for this command so users see a "thinking…" state rather than an outright
   failure while the underlying slowness is investigated properly.

**Rule 45.6 — Two habits govern every runbook above and MUST be applied
generally, not only where explicitly repeated:** **scope before cause** — establish
how widespread a symptom is before forming a theory about why, since scope alone
usually eliminates most candidate explanations immediately; and **mitigate before
you're certain** — restoring user-facing stability and understanding root cause are
separate goals, and the first must never wait on the second when a fast, safe
mitigation (a suspend, a rollback, a defer flag) is already available.

# PART VIII — REFERENCE & GOVERNANCE

---

## §46. Mandatory Core Capability Compliance Checklist

A synthesis, drawn across every Part of this directive, of the capabilities most
load-bearing to get right — usable as a build checklist while implementing the core,
or an audit checklist while reviewing a fork or a PR against it. Every row is a
**MUST** stated elsewhere in this directive; this table exists for at-a-glance
verification, not as a new source of rules.

| # | Capability | Directive Ref |
|---|---|---|
| 01 | Single, unified 18-stage bootstrap sequence; no partial-start state permitted | §17 |
| 02 | Graceful shutdown with independent per-step timeouts, `terminationGracePeriodSeconds: 190` | §18 |
| 03 | Fail-fast configuration validation before any gateway connection | §17.2 (Stage 02), §26.3 |
| 04 | Dependency injection via `Symbol` tokens exclusively; no service locator | §19.1–§19.2 |
| 05 | Circular dependency detection at boot, not runtime, with full cycle path in the error | §19.4 |
| 06 | Three independently-gated health endpoints (liveness/startup/readiness) | §17.3 |
| 07 | Command registration never trusts a prior run — delete-then-re-register every boot | §20.4 |
| 08 | Fatal, build-time command-key collision detection | §20.2 |
| 09 | Guild command change queue, batched, with revocable pending entries | §20.5 |
| 10 | Enforced 100-command-per-guild ceiling, checked by projection before queuing | §20.6 |
| 11 | Five-step guild-facing command collision resolution, never an automatic pick | §20.7 |
| 12 | No text-prefix commands, no simulated prefix parsing, with no loophole | §4, §20.8 |
| 13 | Per-handler isolation on gateway event dispatch — one throw never blocks another | §21.2 |
| 14 | Bounded internal-event-bus cycle detection (default depth 20) | §21.4 |
| 15 | Compile-time-checked event catalog — an undeclared event is a type error | §21.5 |
| 16 | Composable, priority-ordered middleware with exactly one root error boundary | §22.1, §22.3 |
| 17 | Stateless, database-referencing component `custom_id` scheme | §23.1 |
| 18 | Mandatory re-authorization on sensitive component clicks — never assumed | §23.3 |
| 19 | Seven-layer permission resolution, fail-closed where destructive/global | §24.2–§24.3 |
| 20 | Global bot-owner override bypassing every other permission layer | §24.2 Layer 1 |
| 21 | Explicit, targeted per-user/role grant overrides (permit/blacklist/whitelist/quota/cooldown) | §24.7 |
| 22 | One permission engine shared by every authenticated surface — no parallel implementation | §24.8 |
| 23 | Five-layer Admin-tier (or equivalent privileged-capability) defense in depth | §24.9 |
| 24 | Control-plane services (PEP/CLAI/Credentials/Swastik) each independently deployed, sharing only the data layer | §25.1, §25.7 |
| 25 | Global administrative authority via a documented, typed function catalog, never ad hoc terminal commands | §25.2–§25.3 |
| 26 | Every control-plane function writes an unconditional audit entry before returning | §25.3 |
| 27 | Out-of-band operator access independent of gateway/process health | §25.5 |
| 28 | Single, shared credential issuance path; Argon2id hashing; display-once | §25.6 |
| 29 | Three-scope configuration model (process-core, process-component, guild) | §26.1 |
| 30 | Guild-level configuration changes take effect immediately, no restart | §26.2, §26.4 |
| 31 | Full configuration-change audit trail with before/after diff | §26.6 |
| 32 | Repository pattern as the sole database abstraction — no ORM, no raw queries outside it | §27.3 |
| 33 | Every migration reversible — a working `down()` is mandatory, not best practice | §27.4 |
| 34 | Uniform four-column audit trail on every entity table | §27.5 |
| 35 | Read/write routing with replica-lag-bounded fallback to primary | §27.6 |
| 36 | Two-tier cache with both stampede-protection mechanisms and negative caching | §28.1, §28.4–§28.5 |
| 37 | Zero process-local state whose loss or divergence would be user-visible | §29.1–§29.2 |
| 38 | Shard-ownership lock model preventing dual gateway connections | §29.4 |
| 39 | Correlated logs, metrics, and traces via one `correlationId` | §30.1 |
| 40 | Centrally-enforced secret redaction in every log line, regardless of nesting | §30.3 |
| 41 | Eight-subclass error taxonomy with an operational/non-operational distinction | §31.1 |
| 42 | Two retry mechanisms (in-request vs. job), never composed | §31.3 |
| 43 | Circuit breaker available for external dependency calls | §31.4 |
| 44 | Reachable maintenance mode that cannot lock out its own operators | §31.6 |
| 45 | Idempotency required of every job processor | §32.2 |
| 46 | Every scheduled tick fires exactly once fleet-wide, lock-enforced | §32.5 |
| 47 | Data minimization — only the union of actually-declared intents/fields | §37.1 |
| 48 | Right-to-erasure workflow reaching every owner's tables via a standard hook | §37.2 |
| 49 | Structural (not best-effort) anonymization in framework telemetry | §37.4 |
| 50 | Secrets exclusively via orchestrator-injected environment variables; CI secret-scanning | §35.1 |
| 51 | Non-production credential separation — categorically distinct from production | §35.2 |
| 52 | Every trust boundary validated against an explicit schema before business logic | §35.4 |
| 53 | Every inbound webhook route signature-verified; unverifiable routes refuse to register | §35.5 |
| 54 | Structural privilege-escalation blocks at every named vector | §35.6 |
| 55 | Dependency-review CI gate blocking known critical/high-severity vulnerabilities | §35.7 |
| 56 | Zero-downtime rolling updates (`maxUnavailable: 0` / `maxSurge: 1`) with safe shard handoff | §36.2 |
| 57 | SLO-driven alerting with target/warn/critical thresholds, not single generic alerts | §36.5 |
| 58 | Persona (multi-identity) support as the identical framework, never a lighter build | §38.2 |
| 59 | Coverage floors enforced per architectural layer, never a blended average | §39.4 |
| 60 | Fully automated changelog/versioning via changesets; no hand-edited version bumps | §44.3 |
| 61 | Two-approver manual gate on every production deployment, always | §42.4 |
| 62 | One rollout mechanism reached by every deployment trigger — no divergent manual path | §42.4 |

## §47. Environment Variable Reference

| Variable | Default | Directive Ref |
|---|---|---|
| `NODE_ENV` | *(required)* | §26.3 |
| `LOG_LEVEL` | `info` | §26.3, §30.2 |
| `BOT_TOKEN` | *(required)* | §26.3, §35.1 |
| `BOT_OWNER_IDS` | *(required)* | §24.9, §26.3 |
| `DEV_GUILD_ID` | *(required)* | §24.9, §26.3 |
| `DATABASE_URL` | *(required)* | §26.3 |
| `DATABASE_POOL_MAX` | `10` | §26.3, §36.4 |
| `DATABASE_STATEMENT_TIMEOUT_MS` | `10,000` | §26.3, §36.4 |
| `DATABASE_REPLICA_URLS` | *(optional)* | §26.3, §27.6 |
| `DATABASE_REPLICA_MAX_LAG_MS` | `1,000` | §26.3, §27.6, §29.5 |
| `REDIS_URL` | *(required)* | §26.3 |
| `HEALTH_PORT` | `3000` | §26.3 |
| `RATE_LIMIT_USER_WINDOW_MS` | `60,000` | §24.6, §26.3 |
| `RATE_LIMIT_USER_MAX` | `10` | §24.6, §26.3 |
| `RATE_LIMIT_GUILD_WINDOW_MS` | `60,000` | §24.6, §26.3 |
| `RATE_LIMIT_GUILD_MAX` | `100` | §24.6, §26.3 |
| `CACHE_L1_MAX_ENTRIES` | `5,000` | §26.3, §28.1 |
| `CACHE_L1_MAX_BYTES` | `50 MB` | §26.3, §28.1 |
| `TRACE_SAMPLE_RATE` | `0.1` | §26.3, §30.5 |
| `SLOW_QUERY_THRESHOLD_MS` | `500` | §26.3, §27.7 |
| `CRITICAL_QUERY_THRESHOLD_MS` | `2,000` | §26.3, §27.7 |
| `EVENT_LOOP_LAG_SHED_THRESHOLD_MS` | `50` | §26.3, §31.5 |
| `EVENT_BUS_MAX_EMIT_DEPTH` | `20` | §21.4, §26.3 |
| `SHARD_LOCK_HEARTBEAT_MS` | `10,000` | §26.3, §29.4 |
| `SHARD_LOCK_RETRY_MS` | `2,000` | §26.3, §29.4, §36.2 |
| `TELEMETRY_ENABLED` | `true` | §34.5 |
| `{COMPONENT_NAME}_*` | component-defined | §26.5 |

## §48. Metrics Catalog Reference

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

Full definitions and alerting relationships: §30.4, §36.5.

## §49. Error Taxonomy Quick Reference

| Subclass | HTTP-Equiv. | `isOperational` |
|---|---|---|
| `ValidationError` | 400 | `true` |
| `PermissionDeniedError` | 403 | `true` |
| `NotFoundError` | 404 | `true` |
| `ConflictError` | 409 | `true` |
| `RateLimitExceededError` | 429 | `true` |
| `ExternalServiceError` | 502 | `true` |
| `ConfigurationError` | 500 | `false` |
| `InternalError` | 500 | `false` |

Full definitions: §31.1.

## §50. Engineering Principles Quick Reference

```
P1  Explicit over Implicit           P8  Test in Isolation
P2  Sovereignty of Ownership          P9  Configuration without Code
P3  Single Responsibility per Layer    P10 Data Integrity over Convenience
P4  Fail Fast / Recover Gracefully     P11 Deprecation over Breaking Change
P5  Observability Is Not Optional      P12 Progressive Disclosure of Complexity
P6  Open for Extension, Closed for     P13 One Source of Truth per Concern
    Modification                     P14 Freedom by Default, Authority by
P7  Security by Default                    Exception
```

Full definitions: §3.

## §51. Glossary

| Term | Definition |
|---|---|
| Admin tier | The dev-guild-only, owner-only, middleware-bypassing privilege tier (§24.9) |
| BCCM | Bot Command Cosmetics for Marketplace — guild-level command rename/alias tooling (§20.6) |
| CLAI | Command Line Administrative Interface — SSH-hosted operator terminal over PEP's function catalog (§25.5) |
| Core tier | The permanently-loaded, non-disableable component tier, skipping RBAC resolution by design (§22.1, §24.2) |
| `CommandContext` | The per-interaction, scoped object carrying `correlationId`, `guildConfig`, `locale`, `rbacRole`, logger, `shardId`, metadata (§20.9) |
| Credentials Service | The single, shared issuance path for every runtime credential (§25.6) |
| DI Container | The dependency-injection service registry — the sole mechanism for sharing services (§19) |
| `DumbyError` | The abstract base class for the eight-subclass error taxonomy (§31.1) |
| Grant | A targeted Layer-7 permission override — permit, blacklist, whitelist, quota, or cooldown (§24.7) |
| MDIS | Module Dashboard Interface System — the schema-driven web configuration UI *(out of this directive's scope, §0.3; named here only as a boundary the permission engine and REST layer must serve identically to the bot, §24.8)* |
| Metric Unit | MTP's abstract, currency-agnostic unit of usage consumption (§34.4) |
| MTP | Metric Track Protocol — module-agnostic usage metering in abstract units (§34.4) |
| PEP | Power Engine Panel — the global administrative authority, exposed as a function catalog (§25.2) |
| Persona | An additional, fully independent Discord Application identity running the identical codebase (§38.2) |
| RBAC Group | A named mapping from Discord role(s) to one Dumby RBAC role (§24.5) |
| Standard tier | The pre-installed-but-guild-disableable component tier *(tier concept only; specific Standard-tier components are out of scope, §0.3)* |
| Stampede Guard | The distributed-lock + probabilistic-early-refresh mechanism preventing cache-miss thundering herds (§28.4) |
| Swastik | The deployment/hot-reload/hot-swap control-plane service *(covered here strictly as core deployment infrastructure, §25.1; its module-marketplace-facing workflow is out of scope, §0.3)* |
| Tier | A component's governance classification — Admin, Core, Standard, or Marketplace — insofar as tier affects core routing/permission behavior (§20.3, §24.2) |
| Token (DI) | A `Symbol`-based, unforgeable service identifier (§19.2) |
| Twill | The subsystem governing Persona creation, branding, and lifecycle (§38.5) |

## §52. Document Governance & Change Control

**Rule 52.1.** This directive is a **living document**, not a point-in-time
snapshot. It **MUST** be revised whenever `blueprint.md` changes in a way that affects
core/backend/infrastructure architecture — never left to drift out of sync with its
controlling source (§0.4).

**Rule 52.2.** A change to this directive **SHOULD** be reviewed with the same rigor
as a change to the architecture it documents — a rule altered here without a
corresponding architectural justification is itself a defect.

**Rule 52.3.** This directive **MUST NOT** be treated as, or repurposed into, a
system prompt, an automated policy engine, or any form of runtime-enforced
configuration. Its authority is exercised through the humans and tooling that read
it and act on it — code review, CI gates, architecture decision records — never
through the document acting on the codebase directly (§0.1).

**Rule 52.4.** Extending this directive's scope to cover frontend, end-user
interface, or module-authorship content (§0.3) **MUST NOT** happen by incremental
addition to this document. Such content, if and when it is produced, **MUST** live in
its own separate directive, cross-referenced from here rather than merged into it —
preserving the separation of concerns this directive itself exists to model.

**Rule 52.5.** Where this directive and `blueprint.md` appear to disagree,
`blueprint.md` governs (§0.4), and the disagreement **MUST** be treated as a defect in
this directive to be corrected, not as an ambiguity to be argued around case-by-case.

---

*End of DUMBY CORE ENGINEERING DIRECTIVE. This document translates `blueprint.md`'s
architecture into actionable, verifiable engineering rules for the Application Core.
It is guidance for engineers — read it, build against it, review
against it — not an instruction set that executes on its own.*
