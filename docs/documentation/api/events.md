---
id: DOC-API-EVENTS
title: API — Events
kind: documentation
status: derived
version: 5.0.0
authority_scope: [api]
contracts: []
acceptance: []
owners: [framework-maintainers]
last_verified_commit: null
review_state: pending-evidence
---

# Events

Two distinct event systems, never conflated: **gateway events** (from Discord, routed by the
event router) and **internal domain events** (a module's own service code, published on the
internal bus). The catalogue is single-sourced in `contracts/events.catalog.json`.

**Gateway events** (13 catalogued) — `guildMemberAdd`, `guildMemberRemove`, `messageCreate`,
`messageDelete`, `guildBanAdd`, `guildBanRemove`, `interactionCreate`, `channelCreate`,
`channelDelete`, `roleCreate`, `roleDelete`, `guildCreate`, `guildDelete`. Each handler runs
inside its own error boundary, so one module's throwing handler never blocks another's for the
same event.

**Internal domain events** follow the `{domain}.{entity}.{action}` naming convention, enforced
by a regex at registration. The catalogued topics include `dumby.system.ready`,
`moderation.case.created`, `moderation.ban.issued`, `moderation.mute.scheduled`,
`economy.transaction.recorded`, `logging.event.received`, and `antiraid.threshold.crossed`.

**The event catalogue is a contract.** A module's manifest declares every event it may emit,
with a payload schema; an emit whose name is absent from the catalogue fails a build-time lint
rule, and a runtime bus wrapper re-validates membership and payload on every emit. A payload
change is a backward-incompatible change requiring a major version bump.

**The internal bus is synchronous with respect to invocation order and fire-and-forget with
respect to completion** — it invokes listeners in registration order within the same tick but
never awaits their promises. Emit depth is bounded per chain (default 20); exceeding it throws
an `EventCycleError` naming the full chain.
