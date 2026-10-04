---
id: SPEC-04-REQUEST-LAYER-0018
title: 18. Event Architecture & Bus System
kind: spec
status: normative
version: 5.0.0
authority_scope: [04-request-layer]
anchors: [EVENT_ARCHITECTURE_BUS_SYSTEM, TWO_DISTINCT_EVENT_SYSTEMS, GATEWAY_EVENT_HANDLER_INTERFACE, EVENTROUTER_DISPATCH, INTERNALEVENTBUS_TYPED_CROSS_MODUL, CYCLE_DETECTION_BOUNDED_EMIT, EARLY_REFRESH_CACHE_PATH, ONUNLOAD_CLEANUP_AUTHOR_DISCIPLINE, PERSONAS_SUBSYSTEM_REGISTRATION_AN, THE_EVENT_CATALOG_AS, DESIGN_CONSIDERATION_EVENTSCATALOG, COMPLETE_EVENT_PROCESSING_TRACE]
contracts: [contracts/rbac.enums.json, contracts/commands.json, contracts/ui-renderer.schema.json, contracts/events.catalog.json]
acceptance: [ACC-REQ-0018-1, ACC-REQ-0018-2, ACC-REQ-0018-3]
owners: [framework-maintainers]
last_verified_commit: null
review_state: pending-evidence
---

## 18. Event Architecture & Bus System

**Status:** [SPEC]

### 18.1 Two Distinct Event Systems — Not to Be Conflated

```
TABLE 18-A — Gateway events vs. internal domain events

                 Gateway events              Internal domain events
Source           Discord (via discord.js)    any module's own service code
Routed by        EventRouter                 InternalEventBus
Naming           discord.js's own names      {domain}.{entity}.{action}
                 (messageCreate, …)          (moderation.user.banned, …)
Consumers        module IEventHandler        any module's subscriber
                 classes
Guild-scoped     checked against             not automatically checked — a subscriber
dispatch gate    guild_module_states, same   that cares about per-guild state checks it
                 as commands (§13.4)         itself, since not every internal event has
                                             a single associated guild
```

The two systems are kept separate deliberately: one is the platform's ingress, the other is
the framework's internal pub/sub, and conflating them would couple module logic to
discord.js's event vocabulary.

### 18.2 The Gateway Event Handler Interface

```
TABLE 18-B — IEventHandler fields

event   keyof ClientEvents            e.g. 'guildBanAdd'
once    boolean                       default false
handle  async (...args) => void       required
```

### 18.3 EventRouter Dispatch

The router maintains a map from event name to handlers, aggregated from every enabled
module's manifest during Stage 14. On any registered gateway event firing, it resolves the
guild (where the event carries one) and, for each registered handler, checks that handler's
owning module's state before invoking it — a `messageDelete` handler belonging to a disabled
logging module never fires for that guild, exactly as a disabled module's commands never
dispatch. Events with no single associated guild (`shardDisconnect`, a DM-channel event)
skip this check and invoke every registered handler unconditionally.

The router and the event-loop lag monitor are constructed and started as part of bootstrap —
Stage 09 wires the router with its per-module handler map, Stage 16 binds it to the live
client — so there is no configuration in which gateway events arrive with no router (or no
lag monitor) running. Every handler invocation is wrapped in its own try/catch, exactly as
the middleware pipeline's root error boundary wraps command execution (§19.4): one module's
handler throwing never prevents any other module's handler for the same event from running.
This is module isolation applied to the event path.

```
DIAGRAM 18-A — One gateway event, multiple independent handlers

Discord guildBanAdd fires
  → EventRouter looks up handlers
  → moderation handler  (writes a case record if the ban wasn't already logged)
  → logging handler     (posts to the configured log channel)
  → analytics handler   (increments a ban-count metric)
each checks its own module's state before running, each wrapped independently.
```

### 18.4 InternalEventBus — Typed Cross-Module Pub/Sub

```
CODE REFERENCE 18-A — InternalEventBus API shape

interface IEventBus {
  emit<K extends keyof EventCatalog>(event: K, payload: EventCatalog[K]): void;
  on<K extends keyof EventCatalog>(event: K, listener: (payload: EventCatalog[K]) => void | Promise<void>): void;
  off<K extends keyof EventCatalog>(event: K, listener: Function): void;
}
```

The `EventCatalog` type is a global type built by merging every loaded module's manifest
`eventsCatalog` declarations, so `emit` and `on` are compile-time checked against the
payload shape a module actually declared publishing — a typo in an event name is a
TypeScript error, never a silently-ignored runtime no-op.

**Execution model.** `emit` invokes every registered listener **synchronously, in
registration order** — each listener is called within the same tick as `emit` itself. It
does **not**, however, await any listener's return value: an async listener begins executing
up to its first `await`, at which point control returns to `emit`, which proceeds to the
next listener and then returns to its caller — it never waits for any listener's promise to
settle. The bus is therefore **synchronous with respect to invocation order and
fire-and-forget with respect to completion**. A listener that throws synchronously, or whose
returned promise later rejects, has that error caught and logged by the bus itself — tagged
with the event name and the subscribing module — never propagated back to the emitting call.

The bus additionally exposes `emitSync`, which awaits each listener sequentially and
surfaces the first failure to its caller — reserved for ordering-critical flows (the
config-change cascade and the shutdown sequence are its only sanctioned uses). A guard test
exercises the default path with a throwing listener registered ahead of a healthy one: the
throw is contained and logged, and the healthy listener still runs — subscriber isolation is
a **tested invariant** of the bus.

### 18.5 Cycle Detection — Bounded Emit Depth

The bus tracks emit depth **per logical emit-chain** (not globally — two unrelated top-level
emits each start their own chain at depth 0) and enforces a maximum depth, defaulting to
**20**. Exceeding it throws an `EventCycleError` carrying the full chain of event names that
produced the overflow, logged at error level with the originating module identified —
breaking the cycle deterministically rather than allowing a stack overflow.

### 18.6 The Event Catalog as a Contract

A module's manifest `eventsCatalog` field is the authoritative, machine-checked declaration
of every domain event that module may emit, and the **payload shape** of each declared event
is part of the contract: every catalog entry declares a payload schema, and a change from
`{ userId, guildId, reason }` to `{ banId, userId, guildId }` is a backward-incompatible
payload change requiring a major-version bump.

Three things depend on the catalog being accurate:

1. The `EventCatalog` type merge (§18.4), which makes emit/on compile-time checked.
2. A build-time lint rule that fails the build when an emit call's event name or payload
   shape does not match the declared catalog — and rejects any module event declared or
   emitted under the reserved core prefix.
3. The community submission review's functional gate (§16.4), which cross-checks emitted
   events against declared ones.

Enforcement is completed at runtime by the module-scoped bus wrapper, which validates
membership and payload on every emit, and at upload time by the Swastik static analyzer's
catalogue-consistency report.

### 18.7 Complete Event Processing Trace — Step by Step

```
DIAGRAM 18-B — One gateway event through every subscriber

1. A new member joins → GUILD_MEMBER_ADD, sent zlib-compressed.
2. The gateway client decompresses, parses, extracts the opcode and event name.
3. The dispatcher routes to the subscribers for guild.memberAdd (all Standard tier).
4. Welcome   — reads guild config (L1), checks the module is enabled, renders the
               template, translates it, and sends via REST.
5. Logging   — reads logging config (L1), builds the log render, sends via REST.
6. Leveling  — creates the member's leveling record.
7. Auto-mod  — checks account age; flags a young account for monitoring.
8. Anti-raid — increments a Redis join counter and checks the raid threshold.
9. Post-processing — per-subscriber duration histograms and counters; a subscriber
   that threw is logged and its error counter incremented. The event is discarded
   (gateway events are not persisted).
```

Subscribers execute sequentially in priority order. For high-volume events, the dispatcher
processes events in parallel across shards; within a single shard, events are processed
sequentially to maintain ordering guarantees.

### 18.8 How To Verify This Section Against the Code

- The internal bus, its depth guard, and the event-name pattern:
  `apps/main/src/events/event-bus.ts`.
- The gateway router and the protected-domain list: `apps/main/src/events/event-router.ts`.
- The event-loop-lag monitor: `apps/main/src/events/event-loop-lag.ts`.

Divergences are recorded in `status/code-reconciliation.json`.

## Contract
- `contracts/rbac.enums.json`
- `contracts/commands.json`
- `contracts/ui-renderer.schema.json`
- `contracts/events.catalog.json`

## Acceptance
```acceptance
- id: ACC-REQ-0018-1
  check: "Two distinct event systems exist: EventRouter (gateway) and InternalEventBus (cross-module pub/sub)"
  test: tests/unit/event-systems.spec.ts
- id: ACC-REQ-0018-2
  check: "Event names match `{domain}.{entity}.{action}` and every subscription names a catalog entry"
  test: tests/unit/event-catalog.spec.ts
- id: ACC-REQ-0018-3
  check: "Internal bus emit depth is bounded (cycle detection) and a cyclic emit is rejected"
  test: tests/unit/event-cycle.spec.ts
```

## Edges (-> blueprint)
- SPEC-04-REQUEST-LAYER -> SPEC-02-ARCHITECTURE (dispatch enters the core runtime)
- SPEC-04-REQUEST-LAYER#RENDERER -> documentation/ (every surface is renderer-issued)

## Named entities (from the original reference)

The original reference named these entities in this section. They are preserved here so no identifier is lost in the restructure.

**classes, interfaces & symbols:** `Backward-Compat`, `EventDispatcher`, `I18nService`, `MDIS-only`, `Module-registered`, `catalogConsistency`, `eventName`, `shardReconnecting`

**config/env constants:** `PERSONA_ID`
