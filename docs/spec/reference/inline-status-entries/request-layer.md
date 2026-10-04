---
id: SPEC-REF-INLINE-STATUS-REQUEST-LAYER
title: Inline Status & Design Entries — request-layer
kind: spec
status: normative
version: 5.0.0
authority_scope: [reference]
contracts: []
acceptance: [ACC-REF-INLINE-request-layer]
owners: [framework-maintainers]
last_verified_commit: null
review_state: pending-evidence
---

## Inline status & design entries — request-layer

Status, `Design Consideration`, and `§X Addition` entries the original reference interleaved inline, consolidated here verbatim for this department.

### 18.5.3 Early-Refresh Cache Path — Unwired (Phase 1 ~80%)

The 18-stage bootstrap sequence, DI container, schema validation, and L1/L2 cache layer are solid at approximately 80% completion. The remaining gap is the early-refresh cache path: the cache lifecycle does not include an early-refresh mechanism that proactively refreshes cache entries before TTL expiry, leaving a window where expired entries cause synchronous cache misses. The specification requires an early-refresh stage wired into the cache lifecycle at the correct bootstrap stage, refreshing entries asynchronously before expiry to eliminate the miss window.

### 22.3.1 Re-authorization on Component Clicks

Component interactions (button, select, modal submit) re-run permission checks before executing — compliance feature #30 (Tier 3 scaffold).

**Mechanism:** The interaction handler in `src/interactions/interaction-registry.ts` constructs a `PermissionContext` from the interaction (decoded from the `custom_id` scheme) and invokes `resolvePermission` (in `src/permissions/resolver.ts`) before dispatching the handler. If the check fails, the interaction is rejected with an authorization error rather than executed.

**
**Compliance:** feature #30.

**Power Engine (Power Engine Panel).** Power Engine is specified at `src/entry/power-engine.ts`: the four
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

## Acceptance
```acceptance
- id: ACC-REF-INLINE-request-layer
  check: "Every inline status/design entry is preserved verbatim for this department"
  test: tests/docs/inline-status-entries.spec.ts
```