---
id: SPEC-01-FOUNDATIONS-0004
title: 4. Non-Goals & Explicit Boundaries
kind: spec
status: normative
version: 5.0.0
authority_scope: [01-foundations]
anchors: [NON_GOALS_EXPLICIT_BOUNDARIES, KNOWN_SINGLE_POINT_OF, THE_CONTROL_PLANE_EXCEPTION, FOUR_ENFORCEMENT_LAYERS_AGAINST, FOUR_ENFORCEMENT_LAYERS_AGAINST, DIRECT_DISCORD_JS_NO, KNEX_NOT_AN_ORM, CONTRACT, ACCEPTANCE, EDGES_BLUEPRINT]
contracts: []
acceptance: [ACC-FOUND-0004-1, ACC-FOUND-0004-2]
owners: [framework-maintainers]
last_verified_commit: null
review_state: pending-evidence
---

## 4. Non-Goals & Explicit Boundaries

**Status:** [SPEC]

This section is the negative space of the architecture: the outcomes Dumby deliberately
refuses, and the boundaries it holds so that scope cannot creep. It is framed honestly —
Dumby is not a general-purpose microservices architecture for features, but it does
deploy a small number of **control-plane services** (Power Engine, CLAI, Swastik,
Credentials) that are deliberate, named exceptions to the non-goals below. Stating both
at once is the point: the boundary is real, and so is the exception.

### 4.1 The Non-Goals

- **Not an external React/Vue SPA.** Dumby ships no pre-built web application consuming
  MDIS APIs. MDIS is a schema-driven panel declared via the manifest; the renderer is
  outside framework scope. If a deployment builds an external front-end against the
  MDIS endpoints (`GET`/`PUT /api/modules/:name/config`, `PATCH
  /api/modules/:name/state`, `GET /api/guilds`, and the Discord OAuth2 flow), that
  front-end must implement WCAG 2.1 AA — but it is not part of Dumby.
- **Not a text-prefix command system.** Dumby ships slash commands, user context menus,
  and message context menus only. Text-prefix parsing is not part of the command
  surface. There is no loophole: a module that declares `MESSAGE_CONTENT` for a
  legitimate documented purpose may scan message content and act on it, but it may
  **never** simulate a prefix-command interface — parsing a leading token and
  dispatching as if it were a registered command. The marketplace review step treats
  such a submission as rejected.
- **Not a general message-content parser.** Dumby does not hold `MESSAGE_CONTENT` for
  general scanning; a module that needs it declares it explicitly in its manifest
  `intents`, which is flagged during manifest review. The *background listener* pattern
  is fully supported — auto-moderation, sentiment analysis, contextual responses,
  archiving, spam detection — because it is a background service rather than a
  foreground interaction surface.
- **Not a built-in web UI.** MDIS is a declarative schema a renderer consumes, not a
  shipped application.
- **Not general-purpose microservices for features.** The separately-deployable
  artifacts are control-plane exceptions, not a decomposition of business logic.
- **Not a real-time collaboration platform** — not a general WebSocket server or a
  low-latency collaborative-editing backend.
- **Not a code generator or CLI scaffolding system.** `dumby scaffold module <name>` is
  tooling (§38); the framework behaves identically whether a module was scaffolded or
  hand-authored.
- **Not a "zero-config" system.** It requires an explicit manifest, explicit DI token
  declarations, and explicit migration files. This is P1's trade: higher authoring cost
  at the boundary, in exchange for lower operational surprise.
- **Not a replacement for infrastructure.** Dumby runs *inside* a PostgreSQL cluster,
  Redis, and a container orchestrator, and requires them; the Terraform and Kubernetes
  in §41 are a reference deployment, not a provisioning system. It requires
  Docker-capable infrastructure: a non-root sandbox without a Docker daemon cannot run
  Postgres and Redis locally.
- **Redis is a deliberate concentration point.** Cache, queues, pub/sub, and distributed
  locks all depend on a single Redis instance; production requires Redis HA
  (replication plus sentinel or a managed equivalent).
- **Not a microservices architecture.** One deployable application with one process
  boundary per shard group; modules achieve isolation through code-level contracts and
  in-process boundaries enforced by tooling. The Power Engine Panel and CLAI are a
  narrow, named exception — operator-facing control-plane tooling outside the
  feature-and-module system.

### 4.2 What Dumby Deliberately Does Not Do

It is not a Discord client; not a music-streaming service (the music module uses
third-party sources); not a web-hosting platform (the Interface Hub serves only the REST
API, the dashboard, and webhooks); not a database (modules use the typed database
service); not a message queue (modules use the typed scheduler service); not a CDN
(static assets are served from pod-local storage). It does **not** support multiple
Discord bot tokens in a single process — one token per process; the Twill persona system
provides multiple identities, but each persona has its own process and shard set. It
provides no end-to-end encryption for user data: data is encrypted at rest and in
transit, but the framework sees decrypted data. It does not guarantee message delivery
(retries are bounded). It does not support self-hosting the marketplace catalogue: the
catalogue is a central endpoint, and private modules are installed directly via the
Admin tier.

### 4.3 The Boundary Between Framework and Module

The framework provides infrastructure: the gateway connection, the event bus, the
middleware pipeline, the service container, configuration management, the database, the
cache, logging, metrics, tracing, the job queue, the REST API, the Interface Hub,
internationalisation, security, permissions, deployment, and CI/CD. Modules provide
features: commands, event handlers, background jobs, dashboard panels, permission
declarations, and configuration schemas. The framework never implements feature logic.
This bidirectional isolation is what lets the framework and its modules evolve
independently, and it is enforced by the module isolation rules (§14).

### 4.4 The Control-Plane Exception

The microservices non-goal carries exactly one narrow, named exception: five
separately-deployed control-plane services — the bot, Swastik, the Power Engine Panel,
CLAI, and the Credentials Service. These are control-plane infrastructure in the same
category as the database itself, not a decomposition of business logic. §4 and §22 state
this jointly, and the framing should stay honest about how narrow the exception is.

### 4.5 The Ban Registry — Four Enforcement Layers

Two behaviours are banned absolutely, and each ban is enforced at four independent
layers so that no single bypass is sufficient.

**Prefix commands.** The "no text-prefix commands" non-goal is enforced by: (1)
*architecture* — no text-command registration system exists, no `textPrefixes` field
exists, and the command interface requires an interaction-shaped context, so the
register-and-dispatch seam a prefix system needs is simply absent; (2) *lint/CI* — the
ESLint ruleset rejects prefix-shaped parsing at compile time, and the same rules run
inside the Swastik trusted build over uploaded source, so a module cannot compile past
the ban by skipping local checks; (3) the *marketplace review pipeline* — automated
analysis and manual security review both treat simulated prefix dispatch as a rejected
submission; (4) *runtime dispatch* — the command router accepts only Discord
interactions, so a prefix-shaped payload has no code path to reach. The rendered surface
is covered by construction: the renderer emits only interaction responses.

**Classic embeds.** The companion non-goal bans `EmbedBuilder` and `MessageEmbed` from
module code (ADR-001), with the identical four-layer structure: (1) *architecture* — a
command returns a declarative response consumed by the core renderer, so no code path
exists through which a module could construct and send a raw embed; (2) *lint/CI* — the
`no-embed-builder` rule rejects any import of `EmbedBuilder`/`MessageEmbed` in module
source, enforced locally and inside the Swastik trusted build; (3) the *review
pipeline* — a slipped import fails artifact scan and manual review; (4) *runtime* — the
renderer is the only constructor of Discord payloads on the response path, and it emits
Components v2 exclusively. A migration window applies during rollout, after which all
four layers are enforced without exception.

A third prohibition — **unsolicited direct messages** — is enforced on the same
pattern; the main bot never sends a direct message, and the permission-denied and error
paths issue their formal notice frames in-channel instead.

### 4.6 Direct discord.js, No Wrapper; Knex, Not an ORM

Two further boundaries are held deliberately. Discord.js v14 is used directly, with no
wrapper layer; the wrapper's usual job — hiding platform constants — is instead handled
by keeping numeric constants (the sharding threshold, the interaction response window,
and similar) configurable in `discord/client-builder.ts`. And the data layer uses Knex
directly, with no ORM and no active-record entities: repositories issue SQL through Knex
(`db/repositories/base.repository.ts`), keeping queries explicit and reviewable.

### 4.7 Known Single Point of Failure (Open Item)

The single Redis instance backing the BullMQ queues is a single point of failure. It is
tracked as an open item in the legacy ADR record; the pg-boss PostgreSQL fallback is
deferred to a later version. The companion open item is that modules load in-process
with no runtime sandbox. The affected components are the queue manager and the
autoscaler.

### 4.8 The Honesty Boundary

Finally, a boundary about claims rather than code. Dumby is a **specification-first
project**: the architecture is complete while production evidence is not. There is no
reference deployment yet, and the reliability claims throughout this reference describe
the design, not an operating track record. Documentation integrity is distinct from
documentation incompleteness — a factually wrong statement about a feature (an ADR
asserting a hardened mechanism that was never built) is worse than an honest "not
implemented." The standard this reference holds itself to is that every claim it makes
about the tree is checkable against the tree, and where a claim and the code disagree,
the disagreement is recorded rather than papered over (`status/code-reconciliation.json`).

## Contract
None (conceptual).

## Acceptance
```acceptance
- id: ACC-FOUND-0004-1
  check: "Each banned pattern (prefix commands, classic embeds, unsolicited DMs) fails its lint/grep gate"
  test: tests/arch/ban-registry.spec.ts
- id: ACC-FOUND-0004-2
  check: "No module ships in-tree under `src/`; no `.github/` exists under `apps/main/`"
  test: tests/arch/non-goals.spec.ts
```

## Edges (-> blueprint)
- SPEC-01-FOUNDATIONS-0004#BAN_REGISTRY -> SPEC/00-GOVERNANCE (four enforcement layers per ban)

## Named entities

**classes, interfaces & symbols:** `Policy-Enforcement-Point`, `PowerEngineDispatcher`
