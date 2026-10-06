---
id: SPEC-00-GOVERNANCE-0003
title: PART 1 — FOUNDATIONS & DOCTRINE
kind: spec
status: normative
version: 5.0.0
authority_scope: [00-governance]
contracts: []
acceptance: [ACC-GOV-0003-1]
owners: [framework-maintainers]
last_verified_commit: null
review_state: pending-evidence
---

# PART 1 — FOUNDATIONS & DOCTRINE

The rules in this part are the constitution everything else in this directive
is case law for. Every architectural choice made anywhere in the project
SHOULD be traceable to one of these rules, and where it is not, that choice
deserves a second look.

### D-1.1 — The Unified Modular Doctrine is the Governing Invariant

**Rule (MUST).** The system is one coherent application from the outside and
N independently-owned modules from the inside. There is exactly one bootstrap
sequence, one dependency graph, one event bus, one permission engine, one
configuration system, and one operational surface, shared without exception
by every feature the framework runs — administrative capability included.

**Rationale.** A system modular without being unified degenerates into a folder
of drifting plugins; unified without being modular degenerates into a monolith
with feature flags standing in for isolation. The Application Core enforces
unification; the module contract enforces isolation. Both, simultaneously.

**Verification.** Review: any second implementation of a core concern (a second
logger, a second settings path, a second permission check) is a defect.

### D-1.2 — The Framework Never Special-Cases Itself

**Rule (MUST).** The framework's own first-party behavior — the commands that
toggle features, the service that persists guild settings, moderation and
logging configuration — ships as ordinary modules, loaded through the identical
manifest contract, DI container, and lifecycle hooks a third-party author
would use. No hidden config table only core code can write to, no privileged
import path bypassing DI, no admin command implemented as inline framework
code, no framework-only database connection.

**Rationale.** This is what makes "unified" more than marketing: the module
contract is proven sufficient for everything because the framework itself is
built on nothing else.

**Verification.** Review + ESLint boundary rules; every framework-shipped
capability MUST be reachable as a module in the registry.

### D-1.3 — Adopt the Fourteen Engineering Principles as Standing Rules

**Rule (MUST).** Development decisions are made against P1–P14 of blueprint
§3. In condensed, directive form:

````
P1  Explicit over implicit — nothing is auto-detected by filename magic
    where a manifest field could say it explicitly; the manifest is a
    complete table of contents for a module without opening a second file.
P2  Module sovereignty — a module's tables, internal services, and private
    state belong to it alone; access only via its manifest-published surface.
P3  Single responsibility at every layer — commands route and validate,
    services hold business logic, repositories talk to the database.
P4  Fail fast at startup, recover gracefully at runtime — every config
    value, manifest, and dependency edge is validated before the gateway
    connection opens; once live, a transient failure is contained, never
    allowed to cascade.
P5  Observability is not optional — every command, job, and lifecycle
    transition emits structured logs, metrics, and trace spans without
    hand-written instrumentation.
P6  Open for extension, closed for modification — extending means writing a
    new module or subscribing to an event, never editing core or another
    module's source.
P7  Security by default — permissions default to deny; secrets never logged;
    a module cannot request intents or permissions beyond its manifest.
P8  Test in isolation, deploy with confidence — dependencies arrive through
    DI tokens, so unit tests substitute mocks with no real infrastructure.
P9  Configuration without code — anything an operator or guild admin should
    reasonably change is a typed, validated config value, never a constant
    requiring a redeploy.
P10 Data integrity over convenience — every schema change ships as a
    versioned, reversible migration; destructive operations are confirmed
    and audit-logged even when programmatic.
P11 Deprecation over breaking change — public contracts are semver-versioned;
    changing shape is a major bump with a documented deprecation window.
P12 Progressive disclosure of complexity — the minimal module touches one
    file and one interface; nothing is forced on the simple case.
P13 One source of truth per concern — exactly one place resolves permissions,
    exactly one resolves configuration, exactly one holds per-guild module
    state; duplicated authority is a design defect.
P14 Freedom by default, authority by exception — total-control capacity
    (Power Engine) exists as deliberate, logged intervention for cause, never as an
    ambient enforcement layer anyone must design around.
````

**Verification.** Review; later parts of this directive encode each principle
into concrete gates, and their citations trace back here.

### D-1.4 — Non-Goals Are Outcome-Level Boundaries, Not Mechanism Notes

**Rule (MUST NOT).** The framework does not ship, and no subsystem may
recreate the outcome of:

1. **Text-prefix commands.** Slash commands, user-context menus, and
   message-context menus are the complete interaction surface. A module may
   scan message content for a declared, legitimate purpose but MUST NOT parse
   a leading token and dispatch it as a simulated prefix command. This is
   enforced at four layers: architecture (no text-command registration system,
   no `textPrefixes` field, interaction-shaped command contexts only),
   lint/CI, the marketplace review pipeline, and runtime dispatch. A
   submission found doing it is rejected, not styled. Its full
   enforcement-layer obligations and the standing coverage audit are stated
   in the Ban Registry (D-1.7).
2. **General message-content scanning.** No broad message-content grant for
   general parsing; a specific documented purpose requires a declared intent,
   flagged in manifest review.
3. **A shipped, built-in web UI.** The framework ships a schema-driven
   rendering contract (MDIS) and a generic renderer — never a pre-built
   React/Vue application on top of it. (Interface surfaces themselves are out
   of this directive's scope.)
4. **A real-time collaboration platform.** Dumby processes Discord
   interactions; it is not a general-purpose WebSocket or collaborative
   editing backend.
5. **A code generator as core functionality.** The scaffolding CLI is
   developer convenience; the framework behaves identically whether a module
   was scaffolded or hand-authored.
6. **A "zero-config" system.** Explicit manifests, explicit DI token
   declarations, and explicit migration files are required. Higher authoring
   cost is traded for lower operational surprise.
7. **A replacement for infrastructure.** The framework runs inside
   PostgreSQL, Redis, and a container orchestrator; it abstracts none of them.
   Terraform/Kubernetes references describe a reference deployment, not a
   built-in provisioning system.
8. **A microservices architecture.** One deployable application, one process
   boundary per shard group. Modules isolate through code-level contracts and
   in-process tooling, never separate deployments or network calls between
   modules — with the single narrow exception of the five control-plane
   services (Part 6).

**Rationale.** Each boundary is stated at the level of the *outcome* it
forbids so there is no side door — e.g., a message scanner that simulates
prefix commands technically avoids "shipping a prefix parser" while recreating
everything the non-goal exists to prevent.

**Verification.** ESLint rules + CI + review pipeline; each non-goal names its
enforcement layers so coverage gaps are visible rather than assumed.

### D-1.5 — Fail Fast at Startup, Recover Gracefully at Runtime

**Rule (MUST).** Misconfiguration is caught at boot; the process refuses to
start half-broken. Once healthy, one module's failure degrades only the
capability it owned — never cascades.

**Verification.** Boot-time validation gates (Part 3); isolation boundaries
(Part 7).

### D-1.6 — Dishonesty About Status Is Itself a Defect

**Rule (MUST).** Where implementation lags the specification — an open ADR, a
declared-only subsystem, a known single point of failure — the gap is recorded
(badge, audit register, or change log), not papered over. Known examples this
directive inherits and keeps visible: BullMQ's single Redis instance as an
open SPOF — pg-boss fallback deferred, tracked open in the blueprint's
audit register — and the requirement that the
spec-vs-implementation gap never be silently widened.

**Verification.** Change-log and audit-register discipline.

### D-1.7 — The Ban Registry: Total Prohibitions, Four Enforcement Layers

**Rule (MUST).** Three behaviors are banned outright — not discouraged, not
style-guided, banned. Each ban is enforced at the same four enforcement
layers, and a ban enforced at fewer than all four is a coverage defect, not
a softer ban:

````
1  Architecture — no code path, registration system, manifest field, or API
   surface through which the banned behavior can be expressed.
2  Lint/CI — an automated gate that fails the build on the banned construct.
3  Marketplace review — a submission exhibiting the behavior is rejected,
   not styled.
4  Runtime — the dispatch path refuses the behavior even if every earlier
   layer was bypassed.
````

**Ban 1 — prefix-command simulation (D-1.4 #1).** No text-prefix command
surface exists at any layer: slash commands, user-context menus, and
message-context menus are the complete interaction surface. Bans rot at the
newest edge, so the prefix-command ban's coverage MUST be audited against
every ingestion surface that comes into existence and extended to each —
GitHub repository triggers, the TypeScript compilation path, renderer
authoring. A new ingestion surface MUST NOT go live without prefix-ban
coverage at every applicable layer.

**Ban 2 — classic embeds (ADR-001).** Module code MUST NOT construct or
import `EmbedBuilder` or `MessageEmbed`. All presentation is renderer-issued
Components v2: modules declare command schemas and the renderer derives the
presentation, and the module-authoring surface exposes no embed-construction
API through which the ban could be sidestepped. This ban supersedes the
4.5.1 SDUI compromise. The migration window declared in ADR-001 governs the
transition — during the window, violations in not-yet-migrated code are
tracked as scheduled migration failures; when the window closes, all four
layers enforce without grandfathering.

**Ban 3 — unsolicited direct messages (ADR-002).** The main bot MUST NOT
send unsolicited direct messages — the prohibition is complete, and there is
no tier exception. Operator communication travels the out-of-band
control-plane surfaces (CLAI, Power Engine), and the DM prohibition MUST NOT weaken
the guarantee that maintenance and intervention remain reachable without
locking out the operators themselves (D-5.1, D-6.3). Twill persona
instances decide their own DM behavior; this ban binds the main bot.

**Verification.** Adversarial tests at each layer — prefix simulation,
embed construction, and DM dispatch each fail closed at the designated
layers (Part 8 acceptance); the lint rules run in CI; the marketplace
review pipeline rejects submissions on sight of any ban.

---

## Acceptance
```acceptance
- id: ACC-GOV-0003-1
  check: "The Ban Registry bans prefix commands, classic embeds, and unsolicited DMs, each with four enforcement layers"
  test: tests/arch/ban-registry.spec.ts
```
