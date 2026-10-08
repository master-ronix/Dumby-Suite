---
id: SPEC-02-ARCHITECTURE-0010
title: 10. Dependency Injection & Service Container
kind: spec
status: normative
version: 5.0.0
authority_scope: [02-architecture]
anchors: [DEPENDENCY_INJECTION_SERVICE_CONTA, PURPOSE_AND_ROLE, BINDING_TOKENS, 10_2_ADDITION_QUEUEMANAGER, 10_2_ADDITION_OPERATOR, 10_2_ADDITION_MEMORY, 10_2_ADDITION_MANAGED, 10_2_ADDITION_ESM, 10_2_ADDITION_ESLINT, 10_2_ADDITION_THE, 10_2_ADDITION_CONTRACT, 10_2_ADDITION_COMPONENT]
contracts: []
acceptance: [ACC-ARCH-0010-1, ACC-ARCH-0010-2, ACC-ARCH-0010-3, ACC-ARCH-0010-4, ACC-ARCH-0010-5, ACC-ARCH-0010-6]
owners: [framework-maintainers]
last_verified_commit: null
review_state: pending-evidence
---

## 10. Dependency Injection & Service Container

**Status:** [SPEC]

### 10.1 Purpose and Role

The DI container is the single mechanism by which services are shared across the framework
and between modules. There are no module-level singletons, no global variables reachable
through bare imports, and no service-locator calls inside method bodies. Every dependency
arrives through the constructor, resolved by the container from a token. This makes every
class independently testable through mock substitution (§37.3) and makes the cross-module
dependency graph fully explicit.

**The decision rule — why constructor injection, exclusively:**

- *A service locator* (a class calling `container.resolve` internally) hides real
  dependencies inside method bodies; answering "what does this class need" requires
  reading every method; and the class cannot be swapped per test without a live container.
- *Constructor injection* makes a class's full dependency list its constructor signature; a
  unit test constructs the class directly with hand-built fakes and needs no container; and
  the resolution algorithm (§10.5) can detect cycles statically, before any code runs.

Modules declare exported service interfaces (`provides`) and consumed dependencies
(`depends`) as DI tokens, checked at Stage 11. Compatibility today is verified by semver
satisfaction only, which misses contract breaks; the target is type-level contract checks
against the tokens' declarations.

### 10.2 Binding Tokens

Every service is identified by a `Symbol`, never a string — unambiguous (no
string-collision risk across modules), unspoofable (a `Symbol` equals only itself), and
type-safe when paired with TypeScript generics, so `resolve<T>` needs no manual cast.

The core token registry declares a fixed set of core services, each bound to a
`Symbol('core.<Name>')`. The registry
(`apps/main/src/di/tokens.ts`) declares **22 core tokens**: Logger, Config, Db, EventBus,
Cache, Queue, ModuleRegistry, PermissionResolver, Metrics, I18n, CommandRegistry,
CommandRouter, Renderer, InteractionRegistry, CommandCeilingService,
CollisionResolutionService, Personas, EventRouter, Scheduler, AdminEvalGate, OAuth2, and
MtpTokens. Module tokens are
namespaced under `module.<moduleId>.<Name>`, so two modules may each declare a
`ReminderService` token without colliding.

Core tokens are registered at bootstrap Stage 09; module tokens are registered at Stage 12
**in topological dependency order**, so a module whose `depends` references another
module's token can safely resolve it at construction time.

- **Registered-but-never-resolved is a wiring defect.** A service bound to its token but
  never resolved on the live path does nothing, however correct its implementation. The
  permission resolver is the canonical example: it must be resolved in the live request
  path, and the Layer 7 grant code it governs must be invoked by it.
- **The repository pattern is the sole database abstraction.** Every data access goes
  through a repository class resolved by its token, never through raw query helpers or
  direct database clients in command or service code. Mixed abstractions are forbidden,
  enforced by lint.

### 10.3 Binding Lifetimes

```
TABLE 10-A — Lifetimes
```

- **singleton** — one instance per container, created on first resolution and reused.
  Typical for services, repositories, and connection wrappers.
- **transient** — a new instance on every resolution, for stateless utility objects.
  Rarely used.
- **scoped** — one instance per command-execution scope, via a child container (§10.6),
  for per-request context objects that must never bleed between concurrent executions.

### 10.4 The Dependency Declaration Pattern

Constructor injection plus manifest registration. A service class declares its
dependencies as constructor parameters; the manifest's `services` entry names the token,
the class, the lifetime, and an ordered `deps` array. The container reads `deps` and
injects the resolved arguments in declared order. There are **no decorators, no
`reflect-metadata`, and no annotation magic** — every dependency is stated explicitly as a
`Symbol` in the `deps` array (P1), statically checkable against the TypeScript interface
types those tokens are typed against.

### 10.5 The Resolution Algorithm

```
DIAGRAM 10-A — container.resolve(token)
```

1. Check the singleton cache; a hit returns the cached instance.
2. Look up the binding; if absent, throw a token-not-bound error.
3. Push the token onto the resolution stack (a set of tokens currently resolving); if it
   is already present, throw immediately with the full cycle path (e.g. "A → B → C → A"),
   never a generic "circular dependency" message.
4. Resolve each entry in `deps`, recursively (step 1 again per dependency).
5. Construct the instance with the resolved dependencies, in declared order.
6. Pop the token from the resolution stack.
7. If the lifetime is singleton, store the instance in the singleton cache.
8. Return the instance.

Because the stack check happens before any recursive resolution, a cycle is caught with
the complete path attached rather than as a runtime surprise. Detection runs at Stage 09
(core tokens) or Stage 12 (module tokens), so a cycle is a startup failure, not a
production incident. The usual fix is a design change — one of the three services should
depend on an event instead of a direct call (§14.1) — not a runtime workaround.

### 10.6 Module-Scoped Child Containers

For the scoped lifetime, the container creates a **child container** per command-execution
context. The child inherits every binding from its parent (it can resolve singletons
normally) but keeps its own scope-level instance cache, isolated from every other
concurrently-running scope. When the scope ends, the child container is discarded,
releasing its scoped instances. This is the mechanism behind the command context
(§17.5): a per-request object that must never bleed between concurrent interactions, even
two from the same user in the same guild arriving milliseconds apart.

```
DIAGRAM 10-B — Scoped container lifecycle

Interaction A → child container A → context A
  (singletons resolved through the parent, shared;
   scoped instances live only in child A)
  → A completes → child A discarded
Interaction B (concurrent) → child B
  (a cache completely independent of A, even for the same user and guild)
  → B completes → child B discarded
```

### 10.7 The Container in Testing

The `MockContainer` (§37.3) is a pre-configured container that replaces every external
dependency — database, cache, event bus, HTTP client — with in-memory test doubles that
expose typed assertion methods. A unit test creates a `MockContainer`, registers the class
under test with its real class, and resolves it; the class believes it is talking to real
infrastructure, but every call is intercepted and recorded. No process-level setup, no
real database, no network — the direct payoff of P8. Module isolation is enforced through
DI scoping (P2): a module's reach is confined to its own scope, and the module contract
defines the only surface it may touch.

### 10.8 Managed Resources and Auto-Cleanup

Because modules are hot-swapped in-process (§8.6), resource cleanup cannot rely on author
discipline. Three mechanisms close the leak vectors:

- A timer service replaces raw `setTimeout`/`setInterval`; timers are auto-registered in a
  per-module set and cleared on unload.
- The internal event bus uses weak references plus a finalisation registry, so a module's
  listeners are dereferenced by scope on unload.
- The cache manager tags entries by owning module and flushes the module's namespace on
  unload, for both the L1 cache and the L2 invalidation.

Prevention lives in the container, the event bus, and the cache manager, so a misbehaving
module cannot leak resources past its own lifecycle.

### 10.9 Open Items Carried Forward

- **Contract compatibility checks on update.** Compatibility is currently semver-only; the
  target is a contract diff with breaking-change enforcement, so a `provides` change that
  breaks a consumer is caught rather than merely version-bumped.
- **Reachability, not existence.** A subsystem that exists, compiles, and has passing tests
  but is never imported by anything that runs is not delivered. Audits must measure
  reachability, and the resolver, the RBAC grant path, and the pipeline are the named
  components where existence and reachability have diverged historically.

Both are tracked in `status/code-reconciliation.json` and the capabilities ledger.

## Contract
None (conceptual).

## Acceptance
```acceptance
- id: ACC-ARCH-0010-1
  check: "Every service is identified by a Symbol token; no string tokens exist"
  test: tests/unit/di-symbol-tokens.spec.ts
- id: ACC-ARCH-0010-2
  check: "Dependencies arrive only via constructor injection; no service-locator calls exist"
  test: tests/arch/no-service-locator.spec.ts
- id: ACC-ARCH-0010-3
  check: "Circular dependencies are detected at boot, before any code runs"
  test: tests/unit/di-cycle-detection.spec.ts
- id: ACC-ARCH-0010-4
  check: "Core tokens register at stage 09; module tokens at stage 12 in topological order"
  test: tests/integration/di-registration-order.spec.ts
- id: ACC-ARCH-0010-5
  check: "PermissionResolver is resolved in the live request path (not merely registered)"
  test: tests/integration/permission-resolver-wired.spec.ts
- id: ACC-ARCH-0010-6
  check: "The repository pattern is the sole DB abstraction; `no-repository-in-command` lint passes"
  test: tests/arch/repository-pattern.spec.ts
```

## Edges (-> blueprint)
- SPEC-02-ARCHITECTURE-0010#CHILD_CONTAINERS -> SPEC-03-MODULES (module-scoped child containers)

## Named entities

**classes, interfaces & symbols:** `CaseRepository`, `CaseService`, `HttpServer`, `ICaseRepository`, `IGuildConfigService`, `ILogger`, `InfractionRepository`, `ModerationService`, `PermResolver`, `ServiceA`, `ServiceB`, `ServiceC`, `Symbols`, `Zod-validates`, `caseRepo`, `eventName`, `messagePattern`

**error classes:** `CircularDependencyError`

**config/env constants:** `MODERATION_TOKENS`, `MODULE_DISCOVERY`, `TOKEN_NOT_BOUND`

**events & identifiers:** `CacheManager.flushNamespace`, `MODERATION_TOKENS.CaseRepository`, `MODERATION_TOKENS.CaseService`, `Moderation.CaseRepository`, `Moderation.CaseService`, `Moderation.InfractionRepository`, `Moderation.ModerationService`, `TOKENS.EventBus`, `TOKENS.GuildConfig`, `TOKENS.ServiceA`, `TOKENS.ServiceB`, `TOKENS.ServiceC`
