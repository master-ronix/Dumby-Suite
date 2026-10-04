---
id: SPEC-REF-INLINE-STATUS-ARCHITECTURE
title: Inline Status & Design Entries — architecture
kind: spec
status: normative
version: 5.0.0
authority_scope: [reference]
contracts: []
acceptance: [ACC-REF-INLINE-architecture]
owners: [framework-maintainers]
last_verified_commit: null
review_state: pending-evidence
---

## Inline status & design entries — architecture

Status, `Design Consideration`, and `§X Addition` entries the original reference interleaved inline, consolidated here verbatim for this department.

### 8.11 DI container verified (Symbol tokens, 3 lifetimes, freeze, child containers)

- container.ts (166L) implements DI with Symbol tokens, 3 lifetimes (singleton/transient/scoped), freeze after Stage 09, child containers, circular-dependency detection, mock-container for tests.
- Maintain.

The documented three-scope config model — process-core, process-module, guild — is formalized with an explicit `ModuleConfigScope` abstraction distinct from process-core (`env.schema.ts`) and guild (`guild_configs` JSONB).

**Mechanism:** Each module declares a per-module Zod `configSchema` in its manifest (`manifest.schema.ts` in the `swastik` authoring package — `configSchema` field). The `src/config/` layer binds namespaced environment variables into a `ModuleConfigScope` instance, so module config is loaded, validated, and namespaced separately from process-core and guild config.

**

Framework-enforced auto-cleanup of module resources: (A) an injected `ITimerService` with raw `setTimeout`/`setInterval` forbidden and `resourceTracker.clearAllTimers` called on unload; (B) `InternalEventBus` using `WeakRef` + `FinalizationRegistry` so listeners are dereferenced by scopeId; (C) CacheManager entries tagged by owning module and evicted on unload. Prevention lives in the DI Container, EventBus, and CacheManager so a misbehaving module cannot leak resources past its lifecycle.

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

### §10.2 Addition — QueueManager Worker Lifecycle Map (moduleSlug → Worker[])

QueueManager with per-module worker registry + dead-letter fallback handoff.

### §10.2 Addition — Operator-authored security policy lockfile (JSON, checked at Stage 11)

Operator-authored JSON validated against module manifests at Stage 11.

### §10.2 Addition — ESM Loader Import Restrictions

Loader-hook-based import allowlist.

### §10.2 Addition — Component Interaction Handlers (Buttons, Select Menus, Modals)

{moduleNamespace}:{handlerKey}:{contextPayload} encoding, IComponentHandler for buttons/selects, mandatory re-authorization for sensitive components.

### §10.2 Addition — Shipped `/health` Core-Tier and `/hello` Standard-Tier Command Modules

A Core-tier command module (`/health`) and a Standard-tier command module (`/hello`, slug `hello-world`) seeded onto their tier volumes through the promotion pipeline, installed permanently, non-disableable, returning Ping/Latency (`/health`) and "Hello, World!" (`/hello`) via Components V2, each with `devId`/`buildId` and `en-US.json`.

## Acceptance
```acceptance
- id: ACC-REF-INLINE-architecture
  check: "Every inline status/design entry is preserved verbatim for this department"
  test: tests/docs/inline-status-entries.spec.ts
```