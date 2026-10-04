---
id: SPEC-01-FOUNDATIONS-0003
title: 3. Engineering Principles (P1–P14)
kind: spec
status: normative
version: 5.0.0
authority_scope: [01-foundations]
anchors: [ENGINEERING_PRINCIPLES_P1_P14, P12_PROGRESSIVE_DISCLOSURE_OF, FAIL_FAST_SECURITY_BY, CONTRACT, ACCEPTANCE, EDGES_BLUEPRINT]
contracts: []
acceptance: [ACC-FOUND-0003-1]
owners: [framework-maintainers]
last_verified_commit: null
review_state: pending-evidence
---

## 3. Engineering Principles (P1–P14)

**Status:** [SPEC]

These are the standing rules every part of the system — core and module alike — is
designed against. Later sections cite them by number whenever a specific mechanism is a
consequence of a principle. They are maintained as the constitution of the architecture:
defined once here, cited by number elsewhere, and checked by the self-verification
report, so a principle that stops being true is a finding rather than a footnote.

Each principle below carries its own enforcement mechanism — the mechanism is what makes
it a principle rather than an aspiration. A principle whose enforcement is "review
discipline" is, by this document's own standard, not yet enforced.

**P1 — Explicit Over Implicit.** Nothing is discovered by filename magic where a
manifest field could say it. A command is a command because the manifest lists it, not
because its file sits in a `commands/` directory. The manifest is a complete table of
contents for a module without opening another file. *Enforced by:* the `.strict()`
manifest schema — an unknown field fails validation — and by discovery that reads the
manifest rather than the filesystem.

**P2 — Module Sovereignty.** A module's tables, internal services, and private state
belong to it alone; every other module, including the core, interacts with it only
through what the manifest explicitly `provides`. *Enforced by:* ESLint rules that reject
cross-module relative imports, the repository pattern that prevents cross-table queries,
and the four sanctioned inter-module patterns (§14).

**P3 — Single Responsibility at Every Layer.** A command class routes and validates; a
service holds business logic; a repository talks to the database. This three-layer rule
applies uniformly, and a command handler that imports a repository is a build failure.
*Enforced by:* the `no-repository-imports-in-command-handlers` ESLint rule.

**P4 — Fail Fast at Startup, Recover Gracefully at Runtime.** Every configuration value,
manifest, and dependency edge is validated before the gateway opens; a broken
configuration exits the process with a specific, actionable, field-level error. Once
live, transient failures are retried and contained rather than propagated. *Enforced
by:* the 18-stage bootstrap, which refuses to advance past `CONFIG_LOAD` on a bad
environment (§8).

**P5 — Observability Is Not Optional.** Every command automatically receives a trace
span, a duration metric, and structured log entries on entry, success, and failure —
wired into the command router and job-processor base classes rather than hand-written.
*Enforced by:* the middleware pipeline (`trace`, priority 0) and the processor base
classes.

**P6 — Open for Extension, Closed for Modification.** Extending the system means adding
a module or subscribing to an existing event; it never means editing the core or another
module's source. The Marketplace tier and the event catalogue exist so that "do one more
thing" never requires a core pull request. *Enforced by:* the module loader and the
event catalogue contract.

**P7 — Security by Default.** The permission engine defaults to deny: a new command with
no explicit permission declaration is reachable only by the bot owner until a permission
is set. Secrets are never logged, via the logger's redaction list. Manifests cannot
request Discord permissions or intents beyond what they declare, and bootstrap requests
only the union of what is declared. *Enforced by:* the resolver's deny-by-default
ordering (§21) and the logger redaction configuration.

**P8 — Test in Isolation, Deploy with Confidence.** Dependencies are declared through DI
tokens rather than concrete imports, so unit tests substitute mocks without a real
database or a live Discord connection; integration tests verify the seams. *Enforced
by:* the `MockContainer` and the typed DI token registry (§10).

**P9 — Configuration Without Code.** Anything an operator or guild admin should
reasonably change — a threshold, a channel ID, a currency name, a cooldown — is a
configuration value validated against a typed schema, never a literal in source.
*Enforced by:* per-module config schemas and the root environment schema (§23).

**P10 — Data Integrity Over Convenience.** Every schema change ships as a versioned,
reversible migration; destructive operations go through explicit confirmation and audit
logging; there is no "just delete the row" shortcut that bypasses the audit trail.
*Enforced by:* the migration runner's requirement that every migration have a working
`down()`, and the insert-only trigger on `audit_logs`.

**P11 — Deprecation Over Breaking Change.** A module's public contract — its provided
tokens, its emitted events, its command names — is semver-versioned. Removing or
changing a provided token or event is a major bump with a documented deprecation window.
*Enforced by:* the compatibility ledger release gate (§42).

**P12 — Progressive Disclosure of Complexity.** A minimal module — one command, no state
— is one file and one interface. A stateful, job-scheduling, cache-backed module uses
the same manifest shape with more fields filled in. No boilerplate is imposed for
capabilities a module does not use. *Enforced by:* the manifest's optional fields and
their defaults.

**P13 — One Source of Truth Per Concern.** There is exactly one place permission
decisions are made (the resolver, §21), one place configuration is resolved (§23), and
one place a module's enabled/disabled state lives (`guild_module_states`, §13.4).
Duplication of authority is a design defect, not a style preference. *Enforced by:* the
architecture tests that assert a single canonical path per concern.

**P14 — Freedom by Default, Authority by Exception.** The framework's total-control
capacity — up to the Power Engine Panel's ability to ban or restrict any guild, module,
developer, or command globally, and to reach every other core subsystem — is never
exercised routinely. Every governed capability is a deliberate, exceptional, logged
intervention for cause (abuse, security compromise, policy violation), not ambient
enforcement. *Enforced by:* the Power Engine's requirement that every action carry
`{ actorId, source, reason }`, unconditional audit logging, and CLAI's SSH-key
authentication.

### 3.1 The Working Principle Set

Alongside the fourteen constitutional principles, ten working principles govern
day-to-day engineering and are checked by tooling, review, and CI:

1. **Strict typing** — TypeScript strict from line one; every variable, parameter, and
   return value typed; `any` forbidden by ESLint; interfaces for every framework
   contract.
2. **Isolation** — each module is self-contained (its own directory, dependencies, tests,
   translations); it cannot import another module's internals, cannot access the
   database or Redis directly, and cannot touch the filesystem or spawn processes.
3. **Resilience** — every external dependency is wrapped in a resilience layer: circuit
   breaker, bulkhead, retry with exponential backoff and jitter, timeout, graceful
   degradation. These are built into the framework services, so they apply automatically.
4. **Observability** — every operation is logged (Pino structured JSON), measured
   (Prometheus via `prom-client`), and traced (OpenTelemetry), correlated by a
   correlation ID propagated through the middleware pipeline, the event bus, and the job
   queue.
5. **Predictability** — the system is deterministic and documented; configuration is
   validated against schemas and rejected at load time; module lifecycle states are
   explicit and every transition is logged; there are no hidden behaviours, implicit
   defaults, or magic.
6. **Performance** — the middleware pipeline stays under 15 ms for the built-in layers;
   the L1 cache is sub-millisecond; queries are optimised through the repository pattern
   and pooling; background jobs are asynchronous and non-blocking; a memory monitor
   alerts on unbounded growth.
7. **Security** — input sanitisation on every interaction, output encoding through the
   renderer, authentication on all control-plane endpoints (OAuth2 with PKCE),
   authorization through the seven-layer engine, secrets via the secrets manager and
   never exposed to modules, and third-party verification at the Module Gateway.
8. **Extensibility** — new modules, commands, events, and middleware can be added
   without modifying framework code; the extension contract is identical to the built-in
   module contract, so there is no second-class contract.
9. **Testability** — services are injected through the container and therefore mockable;
   the repository pattern abstracts the database (an in-memory database works in tests);
   middleware is composable; a fault-injection framework exists; the test pyramid
   covers unit, integration, contract, and end-to-end.
10. **Documentation** — every interface, service, middleware, lifecycle hook, and config
    option is documented alongside its code and reviewed; this reference is the
    definitive source.

### 3.2 How the Principles Interact, and How Conflicts Resolve

The principles reinforce one another. Typed interfaces (P1) make behaviour explicit and
therefore observable (P5). Isolated modules (P2) fail without bringing down the
framework (P3's blast-radius containment). You cannot optimise what you cannot measure
(P4 enables P6). Gateway verification (P7) is what makes third-party extension (P8)
safe. And P9 and P10 — configuration and data integrity — are what let everything else
change safely.

When principles conflict, the resolution order is fixed: **security and resilience take
precedence over performance and extensibility.** A few milliseconds of middleware
latency is the price of authorization and validation; Marketplace resource quotas
deliberately limit extensibility so that one module cannot consume the whole system.

### 3.3 Standing Rules Beyond the Numbered Principles

Three further rules are load-bearing enough to state explicitly, because they recur
across the codebase:

- **Identifiers are not secrets, content-addressing, and atomic writes.** Identifiers
  are never secrets, and secrets never ship inside code; every artifact is
  content-addressed (its hash *is* its identity); every write is atomic (a rename or
  swap, never a partial write). These three rules are upheld across the Swastik
  entrypoint, the module loader, and the builds table.
- **The Release Manager never lives inside the Dumby application source tree.** A
  Release Manager inside Dumby would create a circular bootstrap dependency. Its
  canonical path is separate from the application; this is non-negotiable and supersedes
  earlier drafts.
- **Tooling-enforced boundaries over documentation.** Good architecture encodes its
  invariants in tooling — ESLint rules, `tsc` gates, logger redaction — rather than in
  prose. Where a rule can be a build failure, it should be one.

### 3.4 Known Boundaries To Keep Honest

Two standing caveats belong with the principles so they are not mistaken for completed
work:

- **Port mapping.** The local Docker Compose stack exposes the API on 8080, health on
  8081, and metrics on 8082, while the Kubernetes base manifests use a different set.
  The mapping must be documented, and the ports should be environment-driven rather than
  hardcoded. The full port table lives in §5 and is reconciled against the runtime
  schema in `status/code-reconciliation.json`.
- **A specification-first project.** Dumby's architecture is complete while its
  production evidence is not: reliability claims describe the design, not an operating
  track record. The principles above are enforced in the tree; the *operational*
  guarantees they imply are gated on a reference deployment that does not yet exist.
  Saying otherwise would violate P1.2's honesty rule.

## Contract
None (conceptual).

## Acceptance
```acceptance
- id: ACC-FOUND-0003-1
  check: "Each principle P1-P14 has an identified enforcement mechanism (lint, type, runtime, or CI)"
  test: tests/arch/principles-coverage.spec.ts
```

## Edges (-> blueprint)
- SPEC-01-FOUNDATIONS-0003 -> SPEC/00-GOVERNANCE (each principle is enforced by a named mechanism)
