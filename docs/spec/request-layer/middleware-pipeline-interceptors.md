---
id: SPEC-04-REQUEST-LAYER-0019
title: 19. Middleware Pipeline & Interceptors
kind: spec
status: normative
version: 5.0.0
authority_scope: [04-request-layer]
anchors: [MIDDLEWARE_PIPELINE_INTERCEPTORS, THE_ONION_MODEL, BUILT_IN_MIDDLEWARE_STAGES, CUSTOM_MIDDLEWARE_AUTHORING, THE_ROOT_ERROR_BOUNDARY, POWER_ENGINE_FREEDOM_BY, THREE_SCOPE_CONFIG_MODEL, CONTRACT, ACCEPTANCE, EDGES_BLUEPRINT]
contracts: [contracts/rbac.enums.json, contracts/commands.json, contracts/ui-renderer.schema.json, contracts/events.catalog.json]
acceptance: [ACC-REQ-0019-1, ACC-REQ-0019-2, ACC-REQ-0019-3, ACC-REQ-0019-4]
owners: [framework-maintainers]
last_verified_commit: null
review_state: pending-evidence
---

## 19. Middleware Pipeline & Interceptors

**Status:** [SPEC]

### 19.1 The Onion Model

Every command execution passes through a composed chain of middleware before reaching
`Command.execute`, structured as nested layers — the classic "onion" composition, where each
layer wraps the next, calling `next` to proceed inward and running its own post-processing
on the way back out once `next` resolves.

```
DIAGRAM 19-A — Onion composition

 ┌─ Maintenance Mode ─────────────────────────────────────────────┐
 │ ┌─ Admin Gate ─────────────────────────────────────────────┐ │
 │ │ ┌─ Trace ─────────────────────────────────────────────┐ │ │
 │ │ │ ┌─ Auth ─────────────────────────────────────────┐ │ │ │
 │ │ │ │ ┌─ Guild Config → Locale → Rate Limit →         │ │ │ │
 │ │ │ │ │   Permission → RBAC → Cooldown → Defer →      │ │ │ │
 │ │ │ │ │   Analytics → module/command-scoped middleware │ │ │ │
 │ │ │ │ │   ┌───────────────────────┐                     │ │ │ │
 │ │ │ │ │   │ Command.execute       │                     │ │ │ │
 │ │ │ │ │   └───────────────────────┘                     │ │ │ │
 │ │ │ │ └───── .after runs on the way back out ────┘      │ │ │ │
```

The pipeline is built once during bootstrap at Stage 09: the bootstrap constructs the
pipeline, registers all twelve built-in stages in canonical priority order, and injects the
composed executor into the command router ahead of module load — so no dispatch path exists
that bypasses the chain. A structural wiring test runs in CI: it boots a bare pipeline,
asserts every built-in stage is present exactly once in priority order, and asserts the
router resolves its executor from the composed chain. The rate-limiter and cooldown counters
live in Redis (the atomic check-and-increment of §21.5), shared across every replica, never
in per-process memory.

Any layer can call `reject(reason)` instead of `next` — execution short-circuits outward
immediately; only that layer's own `.after` (if any) and the outermost cleanup run. A deeper
layer, and `Command.execute` itself, never runs.

### 19.2 Built-In Middleware Stages — Complete Reference

Priority is a signed integer; lower numbers run first (outermost). Ties resolve in
manifest-declaration order. The twelve built-in stages and their real priorities are:

```
TABLE 19-A — The twelve built-in stages

Priority  Stage              Behaviour on failure / abort
−20       maintenance-mode   a global maintenance flag short-circuits every command with
                             a maintenance notice, except a small allow-list of
                             Admin-tier commands that manage maintenance itself
−10       admin-tier-gate    Admin-tier only. Owner check fails → SILENT reject, no
                             reply, warn-level log (§13.6 Layer 2)
  0       trace              opens the root span, generates the correlation id, binds
                             the child logger. Never aborts.
 10       auth               resolves the invoking user; a guildOnly command from a DM →
                             reject with a "server only" ephemeral reply
 20       guild-config       loads per-guild config into the context. A load failure
                             degrades to defaults rather than aborting — a config
                             outage never blocks every command guild-wide
 30       locale             binds the locale from guild config or Discord's own hint.
                             Never aborts.
 40       rate-limit         atomic Redis check-and-increment (§21.5). Over limit →
                             reject with a cooldown-remaining ephemeral reply
 50       permission         Discord bitfield check — permission engine Layer 5 (§21.2).
                             Fails → reject, ephemeral reply naming the missing permission
 60       rbac               Dumby rank check — Layer 6 (§21.2). Skipped entirely for
                             Core-tier commands. Fails → reject, ephemeral reply
 70       cooldown           per-user-per-command cooldown, distinct from the rate
                             limiter above. Fails → reject with a remaining-time reply
 80       defer              defers the reply when the command requires it; issues the
                             buffer embed. Never aborts.
 90       analytics          records the invocation start. Never aborts.
```

Above these, **module-global middleware** (manifest-declared, `global: true`) runs at 100+,
applying to every command in every module; **command-scoped middleware** declared on the
individual command runs at 200+.

### 19.3 Custom Middleware Authoring

```
CODE REFERENCE 19-A — BaseMiddleware shape

abstract class BaseMiddleware {
  abstract priority: number;
  abstract execute(context: CommandContext, next: () => Promise<void>): Promise<void>;
  // Optional — runs on the way back out, only if next was called and resolved
  async after?(context: CommandContext): Promise<void>;
}

class RequiresPremiumMiddleware extends BaseMiddleware {
  priority = 150;
  async execute(context, next) {
    if (!context.guildConfig.premiumEnabled) {
      throw new PermissionDeniedError('REQUIRES_PREMIUM');
    }
    await next();
  }
}
```

A middleware never calls `next` more than once, and never mutates context fields it does not
own — a module-scoped middleware writes only to `context.metadata`, never to a
core-populated field like `context.rbacRole`. Both constraints are enforced by lint rule.

### 19.4 The Root Error Boundary

The pipeline wraps the entire onion — every built-in stage, every module-global and
command-scoped middleware, and `Command.execute` itself — in one outermost try/catch, the
single place any error occurring anywhere in a command's execution is guaranteed to be
caught.

```
DIAGRAM 19-B — Error boundary decision tree

An error is thrown or a promise rejects, anywhere in the pipeline
  → Is it a recognized DumbyError subclass?
      YES → use its declared user-facing message and HTTP-equivalent status
      NO  → treat as UNEXPECTED: log at error with the full stack and context;
            a generic "Something went wrong" ephemeral reply — never a raw stack
            trace or internal message; increment the unexpected-errors counter
  → Reply to the interaction (edit the deferred reply if the defer stage ran;
    otherwise a fresh ephemeral reply)
  → the trace stage closes the span with an error status; the analytics stage
    records the failed outcome
  → command execution ends — the process itself is never at risk from a
    command-level error
```

The boundary is what keeps ordinary command errors from ever reaching the process-level
`unhandledRejection`/`uncaughtException` handlers (§9.4).

### 19.5 Power Engine "Freedom by Default" — Principle vs. Capacity Alignment

The Power Engine operates on a "freedom by default" practice: controls exist in the
middleware pipeline, but the framing of which controls are mandatory versus optional must be
honest. The specification requires the principle and the enforcement capacity to be aligned:
each control layer documented as either **always-on** (a capacity constraint) or
**configurable** (principle-driven), with the "freedom by default" framing applied only to
the configurable layers. P14 ("freedom by default, authority by exception") sits in tension
with Power Engine's seventeen control domains and its instant global kill switch; that
tension is acknowledged explicitly rather than papered over.

### 19.6 Three-Scope Config Model — the Process-Module Scope

The configuration system defines three distinct scopes, each with its own validation,
lifecycle, and access boundaries:

- **Process — core**: environment variables, validated at Stage 02 against the root schema.
- **Process — module**: environment variables prefixed with the module name, validated at
  Stage 11 against each module's own declared config schema.
- **Guild**: the per-guild config document in PostgreSQL, mutable at runtime, validated on
  every write against the same schema the read path deserializes against.

The process-module scope is the one that is easy to omit: without it, a module's own
environment variables are not validated against the module's own schema, so a mismatch
surfaces only at module load.

### 19.7 How To Verify This Section Against the Code

- The pipeline and its ordering: `apps/main/src/middleware/middleware-pipeline.ts`.
- The twelve built-in stages and their priorities: the `priority` field of each file under
  `apps/main/src/middleware/built-in/`.
- The middleware base class: `apps/main/src/middleware/base-middleware.ts`.
- The root error boundary: `apps/main/src/http/error-boundary.ts`.

Divergences are recorded in `status/code-reconciliation.json`.

## Contract
- `contracts/rbac.enums.json`
- `contracts/commands.json`
- `contracts/ui-renderer.schema.json`
- `contracts/events.catalog.json`

## Acceptance
```acceptance
- id: ACC-REQ-0019-1
  check: "The pipeline runs the {{counts.middleware_stages}} built-in stages in the fixed priority order -20..90"
  test: tests/integration/middleware-order.spec.ts
- id: ACC-REQ-0019-2
  check: "The pipeline is built at Stage 09 and injected into CommandRouter before Stage 12; no dispatch bypasses it"
  test: tests/integration/pipeline-wiring.spec.ts
- id: ACC-REQ-0019-3
  check: "A structural wiring test asserts every built-in stage is present exactly once in priority order"
  test: tests/ci/pipeline-structure.spec.ts
- id: ACC-REQ-0019-4
  check: "Rate-limit/cooldown counters live in Redis (shared across replicas), never per-process memory"
  test: tests/integration/ratelimit-redis.spec.ts
```

## Edges (-> blueprint)
- SPEC-04-REQUEST-LAYER -> SPEC-02-ARCHITECTURE (dispatch enters the core runtime)
- SPEC-04-REQUEST-LAYER#RENDERER -> documentation/ (every surface is renderer-issued)

## Named entities

**classes, interfaces & symbols:** `AbortController`, `BufferMiddleware`, `MiddlewarePipeline`, `REST-style`, `camelCase`

**config/env constants:** `CORE_TOKENS`, `PIPELINE_WIRING`

**events & identifiers:** `context.guildConfig.`, `command.suspend`, `command.unsuspend`, `developer.unsuspend`, `guild.unsuspend`, `module.unsuspend`, `persona.suspend`
**files & artifacts:** `src/mdis/`

