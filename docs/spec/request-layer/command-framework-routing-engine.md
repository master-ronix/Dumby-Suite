---
id: SPEC-04-REQUEST-LAYER-0017
title: 17. Command Framework & Routing Engine
kind: spec
status: normative
version: 5.0.0
authority_scope: [04-request-layer]
anchors: [COMMAND_FRAMEWORK_ROUTING_ENGINE, COMMAND_TYPES_SUPPORTED, COMMAND_CLASS_INTERFACE_COMPLETE, COMMAND_REGISTRY_ARCHITECTURE, COMMAND_DEPLOYMENT_STRATEGY, THE_COMMANDCONTEXT_OBJECT_COMPLETE, STARTUP_COMMAND_LIFECYCLE, THE_GUILD_COMMAND_CHANGE, BOT_COMMAND_COSMETICS_FOR, BCCM_CHANGE_QUEUE_WIRING, COMMAND_COLLISION_RESOLUTION, COMMAND_RESTRICTIONS_DIRECT_MESSAG]
contracts: [contracts/rbac.enums.json, contracts/commands.json, contracts/ui-renderer.schema.json, contracts/events.catalog.json]
acceptance: [ACC-REQ-0017-1, ACC-REQ-0017-2, ACC-REQ-0017-3, ACC-REQ-0017-4]
owners: [framework-maintainers]
last_verified_commit: null
review_state: pending-evidence
---

## 17. Command Framework & Routing Engine

**Status:** [SPEC]

### 17.1 Command Types Supported

The framework supports every interaction-based command type Discord offers; text-prefix
commands are explicitly unsupported (§4).

```
TABLE 17-A — Command types

ChatInputCommand (slash)   the primary type, invoked /command-name. Supports options
                           (string, integer, number, boolean, user, channel, role,
                           mentionable, attachment), subcommands, and subcommand
                           groups. Options may declare autocomplete, min/max bounds,
                           and fixed-choice lists.
UserContextMenuCommand     appears in the right-click Apps menu on a user; provides
                           the selected user and guild member. Max 5 per application.
MessageContextMenuCommand  appears in the right-click Apps menu on a message; provides
                           the selected message. Max 5 per application.
```

### 17.2 The Command Interface — Complete Field Reference

Every command implements the framework's command interface, and a validator verifies each
field at bootstrap Stage 13. A command declares a schema and returns a value the Renderer
renders — the author never crafts a Discord payload, never constructs an embed (banned,
§4), and never calls a response method on the interaction object directly.

```
TABLE 17-B — Command fields (field / type / default)

data                     SlashCommandBuilder | ContextMenuCommandBuilder   required
execute                  async (interaction, context) => DeclaredResponse required
permissions.discord      PermissionFlagsBits[]                            []
permissions.rbac         string                                           'MEMBER'
defaultMemberPermissions bigint                                           undefined
cooldown.duration        number (seconds)                                 defaultCooldown
cooldown.scope           'USER'|'GUILD'|'CHANNEL'|'GLOBAL'                'USER'
guildOnly                boolean                                          true
ownerOnly                boolean                                          false
requiresDefer            boolean | (interaction) => boolean                false
ephemeral                boolean                                          false
nsfw                     boolean                                          false
middleware               { class, context? }[]                            []
autocomplete             Record<optionName, Handler>                      {}
localization             { name: {}, description: {} }                    {}
```

Three rules that are easy to get wrong:

- **`defaultMemberPermissions` is a UX-layer, client-side gate only.** Runtime enforcement
  is always the middleware chain's own Layer 4/5 checks (§21.2), never the Discord-side
  hint alone.
- **`nsfw: true` is an infrastructural classification handled entirely by Discord's own
  client** — the command is only visible in age-restricted channels, and invoking it
  elsewhere never reaches Dumby's servers.
- **`guildOnly` is always true for the main bot.** The complete DM prohibition (§17.10)
  means every command, in every tier including Admin, registers guild-context only.

There is exactly one command system: the command interface dispatched through the core
command router. Context-menu commands dispatch through the identical router — the
`USER::`/`MESSAGE::` registry keys resolve through the same lookup as slash commands and
run the same middleware pipeline. Dispatch **fails closed on an unknown tier**: a command
whose module tier cannot be resolved to one of the four known tiers is rejected before its
handler runs, never routed on a default.

### 17.3 Command Registry Architecture

The registry is a map from a compound key to a command, **frozen after Stage 13** and never
mutated at runtime. Keys are compound paths, giving O(1) dispatch and build-time-visible
namespace collision detection.

```
CODE REFERENCE 17-A — Registry key shapes

"/ban"                 → BanCommand
"/case.view"           → CaseViewCommand
"/economy.shop.buy"    → EconomyShopBuyCommand
"USER::View Mod History"    → ViewModHistoryContextCommand
"MESSAGE::Flag Content"     → FlagContentContextCommand
```

Two modules registering the same key throw a collision error naming both modules and the
conflicting path, **before the bot is permitted to start** — a Stage 13 fatal error, not a
runtime surprise. The command framework lives as a single subtree at top-level
`src/commands/` — routing, registration, upsert planning, collision resolution, the
per-tier command ceiling, and the command-cosmetics service — resolving ADR-002: there is
no `src/core/commands/` subtree, and the bootstrap path and the hot-swap path import the
same services.

### 17.4 Command Deployment Strategy

```
TABLE 17-C — Deployment scope by context

Development              all commands registered to the development guild — per-guild,
                         propagates in seconds
Production Standard/     global registration — propagates within ~1 hour; the deployer
Marketplace              runs post-deploy and is idempotent (only real changes upsert)
Admin                    always the development guild only, regardless of environment
Dynamic per-guild        always per-guild scoped; never global
Hardcoded modules        always scoped to hardcodeGuildId alone — never globally, never
                         in any other guild, for as long as the module exists
```

**The persona runtime deploys by the same split, scoped to its bound guild.** A persona registers the
same command set as the resident bot, and the scope is decided by tier, not by identity:

- **core** payloads go to the **global** route — core is shared and undisputed, so it answers in DMs and
  in any guild the persona is reached in;
- **standard and marketplace** payloads go to the persona's **bound guild** only;
- **no command is ever registered in both scopes** — the persona registers each command exactly once;
- an **empty set still clears both scopes**, so a profile that loses every command does not leave a
  stale registration behind.

A persona is guild-bounded: it registers the full set, and rejects an invocation that arrives from a
guild it does not serve. Registration scope is not the enforcement mechanism — the dispatch check is.

**A DM invocation is refused, not dropped.** DM use is prohibited for the resident bot by design, and
the refusal must be *sent*: an invocation with no guild has no reply to edit, so it answers through a
fresh notice naming the DM prohibition rather than throwing before anything is sent. A silent throw
surfaces to the member as "The application did not respond", which tells them nothing.

### 17.5 The CommandContext Object

Every `execute(interaction, context)` call, and every middleware `execute(context, next)`
call, receives the **same `CommandContext` instance** — assembled once at the start of the
request and passed by reference through the entire pipeline for that single interaction.

```
TABLE 17-D — CommandContext fields (field / type / populated by)

correlationId  string (UUID)              TraceMiddleware
guildConfig    typed guild-config value   GuildConfigMiddleware
locale         BCP 47 string              GuildConfigMiddleware
rbacRole       Dumby role enum            RBACMiddleware
logger         pre-bound child logger     TraceMiddleware — carries correlationId,
                                          guildId, userId, shardId, moduleId
shardId        number                     Bootstrap — always populated, sharded or not
metadata       Map<string, unknown>       any middleware — a scoped bag later stages or
                                          the handler read/write without widening the type
```

The context is created fresh per interaction by the DI container's `scoped` lifetime
(§10.6) and discarded when the interaction completes — it never survives across requests
and is never shared between concurrent interactions, even two from the same user in the
same guild.

### 17.6 Startup Command Lifecycle

Stage 13 **never bulk-deletes** the application's Discord command registration — a
boot-time delete-then-reregister would briefly unregister every command fleet-wide and burn
the guild-command creation budget on every restart. Instead it computes the desired set
fresh from each guild's actually-enabled modules, diffs it against what Discord currently
has on record, and enqueues the differences as guild-level changes on the change queue
(§17.7). A partial prior deploy, a manually-edited command, or a stale registration from a
now-removed module is reconciled guild by guild — without a window in which every command
is simultaneously absent.

Core- and Standard-tier commands are always part of the registered set; Marketplace-tier
commands register for a guild only once that guild has explicitly enabled the module.
Enabling a module after startup registers its commands immediately (per-guild, seconds).
Disabling a module does **not** remove its commands with the same immediacy — that half goes
through the change queue — but it does make them **immediately unusable**: the moment a
module is disabled, the framework writes a **deny override** to Discord's native per-command
permissions for `@everyone` and every configured role, so the command disappears from
members' effective access instantly even though its deregistration has not run yet.

### 17.7 The Guild Command Change Queue

Two kinds of guild-level command change never take effect immediately at the registration
layer: a module disable's command removal, and a rename or alias request (§17.8). Both are
entries in **one shared queue table**, batched and pushed together — both ultimately resolve
to the same operation (a bulk-overwrite of one guild's registered command set), and
Discord's **200-per-day guild-command-creation limit** is conserved by batching regardless
of which kind of change triggered it.

```
DIAGRAM 17-A — Batching timeline, anchored to T₀ (the first queued entry)

 T₀            T₀+12h   T₀+13h                        T₀+24h (outer ceiling)
 │─ queued ────┤──── prepare window ──────────────────┤── PUSH ──────────────►│
 (assembling the batch)              (single bulk PUT, to the second)
```

Any entry queued **before T₀+13h** joins this batch; an entry queued **after T₀+13h**
starts a new batch with its own T₀. Rules:

- A guild administrator can revoke a queued entry, or edit its target name or alias, at any
  point **before its batch's push executes** — the queue holds a request, not a commitment,
  until the moment it leaves for Discord.
- If a module receives a new version while one of its commands has a pending deletion
  queued, that entry is **invalidated automatically** and the deletion restarts from zero —
  a changed definition is a signal the guild may want to keep the module.
- **Push failure and retry.** If the scheduled bulk-overwrite fails, the batch is neither
  marked applied nor discarded: it remains `pending`, and the queue's own status is what
  gates whether a change is considered live, with the push retried on the next scheduled
  cycle. A guild's commands stay in their last successfully-applied state throughout.

### 17.8 Bot Command Cosmetics for Marketplace (BCCM)

A guild administrator can **rename** any enabled command or add an **alias** for it,
through a queue-writing command that goes through §17.7's batching rather than taking effect
immediately. This lets a guild curate its own command surface and gives administrators a
guild-local tool for resolving a naming collision themselves. Two constraints hold
regardless of request:

1. An alias may **never** match a reserved, native Discord command name — rejected outright
   with a specific error rather than queued.
2. BCCM **never becomes a text-prefix system by another name** (§4): a rename or alias only
   changes what a slash command is *called*, never how it is invoked.

**Command-count projection.** Before accepting any queue request, the projected resulting
total registered-command count as of the batch's next push is computed, accounting for
every other entry already queued against that batch. A request whose projected result would
raise the guild's total above Discord's **100-command ceiling** is rejected before it
enters the queue, with the specific projected count returned to the requester.

BCCM is a **constructed** service, not a declared one: it is built at bootstrap and
registered in the container. Every rename or alias request is persisted through a
knex-backed repository over the same change-queue table — one queue, one repository, one
batching timeline for deletions, renames, and aliases alike. The service enforces both
hooks at request time: the command-count ceiling projection, and the collision hook (§17.9).

### 17.9 Command Collision Resolution

When a module is enabled in a guild and one of its commands collides by name or alias with
a command already active there from a different module, installation does not fail silently
or pick a winner automatically.

```
DIAGRAM 17-B — Five-step collision resolution

1. PAUSE        the newly-enabled module's state row is written as
                'install_pending_resolution' rather than 'active' — it dispatches
                nothing until the collision is resolved
2. PRESENTATION the guild sees a renderer-issued Components v2 panel with a dropdown
                listing every conflicting command alongside its originating module
3. SELECTION    a guild administrator selects which module's command executes under
                the contested name
4. OVERRIDE     a command-override entry is written and cached in L1 alongside every
                other guild-scoped state this pipeline reads on the hot path
5. RESOLUTION   the newly-enabled module's row moves to 'active', and its winning
                command goes live at the queue's next scheduled push
```

If the module whose command won a collision is later disabled, the system re-evaluates
automatically: the other module's command takes over the contested name immediately, its
override entry updated silently, without requiring the administrator to resolve the same
collision a second time.

### 17.10 Command Restrictions — Direct Messages & Prefix Prohibition

**No commands in direct messages — a complete prohibition for the main bot.** Every
command, in every tier including Admin, declares `guildOnly: true` and registers
guild-context only; the auth stage rejects any DM-originated interaction outright. There is
no exception, no sanctioned DM surface, and no configuration that opens one for the main
bot (ADR-002). The operator path the old Admin-tier DM exception served is fully covered by
the control plane instead: Power Engine's authenticated REST surface and CLAI's SSH
terminal (§22) are both reachable when the gateway is down, and the maintenance-mode
allow-list keeps the operators of that mechanism from being locked out of it. Twill
instances (§35) decide their own DM behaviour: a persona is a separate Discord application
commissioned by its guild, and its DM posture is the guild administrator's choice.

**No simulated prefix-based commands.** A module may scan message content and react to what
it finds for a legitimate, manifest-declared purpose, but may never use that scan to
simulate a prefix-based command system — parsing a leading token out of a message and
dispatching it as though it were a registered command. Review treats a module found doing
this as a **rejected submission** (§16.4), and the same standard applies to any module
maintained as part of a deployment's own trusted codebase. Message scanning and command
dispatch are two structurally distinct capabilities.

### 17.11 Complete Command Interaction Trace — Step by Step

The definitive end-to-end trace of a single slash-command interaction.

```
DIAGRAM 17-C — From keypress to response

 1. The user types /moderation ban, selects a target, and types a reason.
 2. Discord constructs an INTERACTION_CREATE gateway event (interaction id, token,
    application id, type 2 APPLICATION_COMMAND, command name, options, guild id,
    channel id, user id, the user's channel permissions, guild locale, timestamp)
    and sends it zlib-compressed.
 3. The gateway client decompresses, parses, extracts the opcode and event name,
    updates its sequence counter, and passes the event to the dispatcher.
 4. The dispatcher routes it to the interaction router.
 5. The interaction router looks the command up in the registry and recovers its
    module, tier, permission key, rate-limit config, and response format.
 6. The interaction router builds the interaction context (a scoped container).
 7. The middleware pipeline runs in strict priority order — maintenance, admin gate,
    trace, auth, guild config, locale, rate limit, permission, RBAC, cooldown, defer,
    analytics.
 8. The handler executes: it fetches the target from cache, checks the bot's role
    hierarchy, and calls the Discord REST API. It never constructs a payload — it
    returns a schema-conformant declaration.
 9. The Renderer validates the declaration, fills the static Components v2 grammar
    and the dynamic slots (accent amber #FFCA6D, banner, module identity, content),
    and edits the buffer embed held since receipt into the final render.
10. Discord displays the response; the metrics histogram and counter update; the
    interaction context is discarded.
```

The whole path is roughly 50–100 ms, dominated by the outbound Discord REST call.

### 17.12 How To Verify This Section Against the Code

- The command router and registry: `apps/main/src/commands/command-router.ts`,
  `src/commands/command-registry.ts`.
- Deployment and collision resolution: `apps/main/src/commands/command-deployer.ts`,
  `src/commands/collision-resolution.ts`, `src/commands/command-ceiling.ts`.
- The middleware pipeline the router composes: `apps/main/src/middleware/middleware-pipeline.ts`.
- The Renderer that issues every response: `apps/main/src/rendering/core-renderer.ts`.

Divergences are recorded in `status/code-reconciliation.json`.

## Contract
- `contracts/rbac.enums.json`
- `contracts/commands.json`
- `contracts/ui-renderer.schema.json`
- `contracts/events.catalog.json`

## Acceptance
```acceptance
- id: ACC-REQ-0017-1
  check: "Only interaction-based command types are supported; no text-prefix command path exists"
  test: tests/arch/no-prefix-commands.spec.ts
- id: ACC-REQ-0017-2
  check: "Every command class implements `ICommand` and is validated at Stage 13"
  test: tests/integration/command-interface.spec.ts
- id: ACC-REQ-0017-3
  check: "There is exactly one command system (ICommand via CommandRouter); the legacy `src/commands/` path is removed"
  test: tests/arch/single-command-system.spec.ts
- id: ACC-REQ-0017-4
  check: "Dispatch fails closed on an unknown module tier (never routed on a default)"
  test: tests/unit/tier-fail-closed.spec.ts
```

## Edges (-> blueprint)
- SPEC-04-REQUEST-LAYER -> SPEC-02-ARCHITECTURE (dispatch enters the core runtime)
- SPEC-04-REQUEST-LAYER#RENDERER -> documentation/ (every surface is renderer-issued)

## Named entities

**classes, interfaces & symbols:** `AuditLogPort`, `EventBusPort`, `EventDispatcher`, `HttpServer`, `LoggerPort`, `Spamming`

**error classes:** `CommandKeyCollisionError`

**config/env constants:** `BAN_MEMBERS`

**events & identifiers:** `GatewayClient.`, `GuildMember.`, `InteractionRouter.`
**files & artifacts:** `src/commands/ports.ts`

