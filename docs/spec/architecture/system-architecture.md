---
id: SPEC-02-ARCHITECTURE-0006
title: 6. System Architecture
kind: spec
status: normative
version: 5.0.0
authority_scope: [02-architecture]
anchors: [SYSTEM_ARCHITECTURE, LAYERED_VIEW, THE_FULL_COMMAND_INTERACTION, MODULE_COMMUNICATION_PATHWAYS, GUILD_CONFIGURATION_READ_PATH, SHARD_TOPOLOGY_AT_SCALE, TWILL_THE_PERSONA_SYSTEM, CONTRACT, ACCEPTANCE, EDGES_BLUEPRINT]
contracts: []
acceptance: [ACC-ARCH-0006-1, ACC-ARCH-0006-2, ACC-ARCH-0006-3]
owners: [framework-maintainers]
last_verified_commit: null
review_state: pending-evidence
---

## 6. System Architecture

**Status:** [SPEC]

### 6.1 The Layered View

```
DIAGRAM 6-A — The three layers
```

- **Discord gateway & REST API.** One WebSocket connection per shard, via discord.js.
  The requested `GatewayIntentBits` is the union of every loaded module's declared
  intents — never a broad precautionary set.
- **Application Core.** Each of the following exists exactly once per process: Bootstrap,
  the DI Container, the Event Router, the Command Router, the Config Manager, the Logger,
  the Middleware Pipeline, the Permission Engine (7-layer), the Cache Manager, the
  Database Manager, the Job Queue, and the HTTP Server.
- **Module layer.** N independently-owned modules, each Admin/Core/Standard/Marketplace
  tier, each with its own commands, events, services, repositories, jobs, migrations,
  locales, and tests.

The key property is negative: no module constructs its own database pool, cache client,
or logger. Every one is handed to the module by the DI container (§10). That is what makes
"one operational surface regardless of module count" a structural property rather than a
convention.

### 6.2 The Full Command Interaction Trace

```
DIAGRAM 6-B — From keypress to visible response
```

1. The user presses Enter on a slash command.
2. The Discord gateway delivers an `InteractionCreate` to discord.js.
3. `EventRouter.handleGatewayEvent('interactionCreate', interaction)` routes it (§18.3).
4. For an application command or autocomplete, `CommandRouter.dispatch(interaction)`
   looks up the handler by the composite key `commandName[:subgroup][:sub]` (§17.3).
5. The module-active check for this guild runs (§13.4). It fails closed: a missing or
   disabled `guild_module_states` row means no dispatch.
6. The **middleware pipeline** runs in strict priority order (§19.2). The twelve built-in
   stages and their priorities are:

   | Priority | Stage | Responsibility |
   |---|---|---|
   | −20 | maintenance-mode | short-circuits everything while maintenance is set |
   | −10 | admin-tier-gate | owner-only gate for Admin-tier commands |
   | 0 | trace | opens the span, binds `traceId` |
   | 10 | auth | resolves the invoking user |
   | 20 | guild-config | loads per-guild config into the context |
   | 30 | locale | binds the i18n instance |
   | 40 | rate-limit | atomic check-and-increment, pre-handler |
   | 50 | permission | Discord permission-bitfield check (Layer 5 of 7) |
   | 60 | rbac | Dumby rank check (Layer 6 of 7) |
   | 70 | cooldown | per-user, per-command cooldown |
   | 80 | defer | defer the reply when the command requires it |
   | 90 | analytics | records invocation start |

   Module-global middleware (manifest-declared) runs above 100; command-scoped middleware
   above 200. Each stage calls `next` to continue; aborting short-circuits the chain.

7. `Command.execute(interaction, context)` runs (§17.2).
8. Any data access goes through the service layer to the repository pattern (§24.3).
9. On return, the middleware `.after` hooks run in reverse priority order.
10. The analytics stage records outcome, duration, and status; the trace stage closes the
    span and emits the final structured log line.
11. `dumby_commands_total{module,command,status}` is incremented and the
    `dumby_command_duration_seconds` histogram is recorded.
12. The user sees the response in Discord.

### 6.3 Module Communication Pathways

```
DIAGRAM 6-C — How module A reaches module B
```

- **Fire-and-forget, no response needed:** A emits an event on the internal bus; B's
  listener fires asynchronously (moderation emits `moderation.user.banned`; logging
  subscribes).
- **Synchronous response needed:** A resolves B's published DI token and calls the typed
  service.
- **Cheap read of B's data without B's logic:** A calls a `ForCrossModuleRead`-suffixed
  accessor that B declared in its manifest's `crossModuleReads` array — a single-row,
  key-only lookup only (§14.1); writes always go through B's service.
- **Never:** a cross-module relative import. An ESLint rule turns
  `import { X } from '../../module-b/services/X.js'` into a build error.

### 6.4 The Guild Configuration Read Path

```
DIAGRAM 6-D — The cache cascade
```

1. A command is invoked in guild G by module M.
2. The guild-config middleware checks L1 (in-process LRU) at key `guild:{G}:config`; a hit
   binds the value to the context and proceeds.
3. A miss calls `CacheManager.get('guild:{G}:config')` against Redis L2; a hit backfills
   L1, binds, and proceeds.
4. A miss reads the config JSONB document from PostgreSQL through the guild-config
   repository (full field reference §23.3).
5. The value is written to Redis L2 and to the L1 LRU, bound to the context, and the
   handler proceeds.

### 6.5 Shard Topology At Scale

```
DIAGRAM 6-E — Shard topology
```

The gateway connects to bot pods 0..N, each hosting a contiguous shard range (pod 0:
shards 0..k; pod 1: shards k..2k; pod N: shards Nk..M), backed by PostgreSQL (primary plus
replicas), Redis, and BullMQ workers.

- **Shard assignment:** `shardId = (guildId.toBigInt() >> 22n) % BigInt(totalShards)`. The
  parentheses matter: `%` binds tighter than `>>` in TypeScript/JavaScript, so omitting
  them computes `guildId >> (22n % totalShards)`, which is wrong.
- Each pod hosts a contiguous range under discord.js's sharding manager, sized so a single
  pod carries roughly **1,000 guilds per shard** before a single gateway connection's
  event volume risks Discord's per-shard rate limits.
- Two mechanisms reach state on another shard: `client.shard.broadcastEval` (a
  serializable function executed across every shard, reserved for low-frequency,
  operator-triggered needs) and Redis pub/sub (anything routine or high-frequency — cache
  invalidation, cross-shard presence).
- Application code never assumes it runs unsharded: `context.shardId` is always
  populated, and any state needed across shard boundaries lives in PostgreSQL or Redis
  (§26), never in a process-local variable.

### 6.6 Twill — Personas for Multiple Bot Identities on Shared Infrastructure

Two hard Discord-platform ceilings decide when one bot identity stops being enough: **at
most 100 commands registered per guild per application**, and **a single bot connection
holding at most one active voice connection per guild**.

**Twill** is the subsystem that creates, brands, and governs the lifecycle of a
**persona** — a complete additional Discord application whose token and application are
supplied by the guild administrator themselves (*bring-your-own-identity*), while Dumby
hosts and operates the instance. One persona is bound to exactly one server
(*single-server-bound*): a Twill instance serves the single guild that commissioned it
and is never shared across guilds. A persona is bootstrapped from the identical codebase
and shares the identical PostgreSQL primary, Redis instance, and job queues as the main
bot and every other persona. Personas run under a free charter with an explicit sunset
condition (§35.6, ADR-008). A persona is not a lighter-weight bot; it is the framework
running again under a different identity, giving a guild a second full command budget or
a second concurrent voice connection. It is opt-in and additive — reached for only when
one of the two ceilings is actually hit. It is specified completely in §35.

### 6.7 How To Verify This Section Against the Code

- The twelve middleware stages and their priorities are the `priority` values of the files
  under `apps/main/src/middleware/built-in/`.
- The module-active fail-closed check is `availability.moduleActive` in
  `apps/main/src/permissions/resolver.ts` (Layer 3).
- The event routing entrypoint is `apps/main/src/events/event-router.ts`; the internal bus
  is `apps/main/src/events/event-bus.ts`.
- The command router is `apps/main/src/commands/command-router.ts`.

Divergences between this section and the tree are recorded in
`status/code-reconciliation.json`.

## Contract
None (conceptual).

## Acceptance
```acceptance
- id: ACC-ARCH-0006-1
  check: "Every interaction traverses the layered command trace in the documented order"
  test: tests/integration/command-trace.spec.ts
- id: ACC-ARCH-0006-2
  check: "Cross-module interaction uses only the five sanctioned patterns; any other path fails lint"
  test: tests/arch/cross-module-patterns.spec.ts
- id: ACC-ARCH-0006-3
  check: "The shard-count formula yields the documented assignment at scale"
  test: tests/unit/shard-topology.spec.ts
```

## Edges (-> blueprint)
- SPEC-02-ARCHITECTURE-0006#COMMAND_TRACE -> SPEC-04-REQUEST-LAYER (the trace is the request pipeline)
- SPEC-02-ARCHITECTURE-0006#MODULE_COMMS -> SPEC-03-MODULES (five sanctioned patterns)

## Named entities (from the original reference)

The original reference named these entities in "6. System Architecture". They are preserved here so no identifier is lost in the restructure.

**classes, interfaces & symbols:** `ApplicationCommand`, `ForCrossModuleRead-suffixed`, `ShardingManager`, `SomeClass`, `GuildConfigRepository.findByGuildId`, `TOKENS.GuildSettings.Service.get`, `SomeService.js`
