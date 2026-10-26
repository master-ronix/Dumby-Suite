---
id: SPEC-04-REQUEST-LAYER-0021
title: 21. Permission & Authorization Engine
kind: spec
status: normative
version: 5.0.0
authority_scope: [04-request-layer]
anchors: [PERMISSION_AUTHORIZATION_ENGINE, PURPOSE_THE_SEVEN_LAYER, LAYER_BY_LAYER_REFERENCE, RBAC_LAYER_6_THE, RBAC_GROUPS_SETS, RATE_LIMITING, LAYER_7_GUILD_SIDE, THE_OAUTH2_BRIDGE_ONE, THE_FIVE_LAYER_ADMIN, CONTRACT, ACCEPTANCE, EDGES_BLUEPRINT]
contracts: [contracts/rbac.enums.json, contracts/commands.json, contracts/ui-renderer.schema.json, contracts/events.catalog.json]
acceptance: [ACC-REQ-0021-1, ACC-REQ-0021-2, ACC-REQ-0021-3, ACC-REQ-0021-4, ACC-REQ-0021-5]
owners: [framework-maintainers]
last_verified_commit: null
review_state: pending-evidence
---

## 21. Permission & Authorization Engine

**Status:** [SPEC]

### 21.1 Purpose & the Seven-Layer Model

The permission resolver is the single, unified engine deciding whether a given user, in a
given guild and channel, is authorized to invoke a given command — the one source of truth
P13 requires. Every surface that needs an authorization answer (the command pipeline and the
MDIS dashboard API alike) calls through this same resolver rather than maintaining a parallel
check of its own (§21.7).

This section is the single normative statement of the seven-layer model: wherever any other
description of authorization appears, it defers to the ordering here. Resolution proceeds
through **seven ordered layers**. Each layer can produce a definitive **ALLOW** (short-
circuiting every remaining layer), a definitive **DENY** (short-circuiting every remaining
layer), or **PASS** (defer to the next layer). Only if every layer passes without a
definitive answer does the framework fall through to the final default: **allow**.

```
DIAGRAM 21-A — The seven-layer resolution flow

Layer 1  Global bot-owner override   user.id ∈ BOT_OWNER_IDS?  YES → ALLOW (bypass all)
Layer 2  Blacklist check             user or guild blocked?    YES → DENY (silent, logged)
Layer 3  Guild & module availability guild known + module active for this guild?
                                     (fail-closed on data unavailability)  NO → DENY
Layer 7  Grant override              consulted IMMEDIATELY AFTER Layer 3: an applicable
                                     grant's outcome is final and overrides Layers 4–6
Layer 4  Channel restriction         allow-list / deny-list violated?  → DENY (ephemeral)
Layer 5  Discord permission bitfield member holds every declared Discord permission?
                                     NO → DENY (ephemeral, names the missing permission)
Layer 6  RBAC rank (pure function)   [SKIPPED for Core tier] the rank evaluated from the
                                     member's live Discord state satisfies the declared
                                     rank? Layers 5 and 6 combine conjunctively (AND)
→ ALLOW (default)
```

Note the ordering precisely: Layer 7 is consulted immediately after Layer 3, **above** Layers
4–6 — when a grant applies, its outcome is final. With no applicable grant, resolution
continues through Layers 4–6 as drawn. RBAC grant scopes resolve **role → group → set**,
most-specific wins.

### 21.2 Layer-by-Layer Reference

```
TABLE 21-A — Fail-open vs. fail-closed by layer

#  Layer                       On data unavailability   Rationale
1  Bot-owner override          N/A                      a static env list; no data to fail on
2  Blacklist                   FAIL CLOSED (deny)       never risk letting a blocked actor through
3  Guild & module availability FAIL CLOSED (deny)       a DB outage never grants access to a
                                                        module a guild turned off
4  Channel restriction         FAIL OPEN (allow)        an unreadable list degrades to "no
                                                        restriction" rather than blocking all
5  Discord permission bitfield FAIL CLOSED (deny)       sourced from the interaction payload
                                                        itself — never actually unavailable
6  RBAC rank                   FAIL CLOSED (→ MEMBER)   an unresolvable rank degrades to the
                                                        lowest non-restricted rank
7  Grant override              FAIL OPEN (no grant)     an unreadable grant table falls through
                                                        to Layers 4–6's outcome
```

The asymmetry is deliberate: layers that gate access to something potentially destructive or
globally scoped (blacklist, module availability) fail closed; layers that merely refine an
already-granted access (channel scoping, grant overrides) fail open. Layer 5 is sourced
directly from the interaction payload, so it is never actually unavailable; Layer 6 degrades
to the lowest standing rank, never to an elevated one.

**Layer 2 persistence.** The blacklist is backed by a `blocked_users` table — global rows
(null guild) and guild-scoped rows, each with an optional expiry — read through a lookup
service with a TTL cache in front of the table, and written exclusively through the Power
Engine's blacklist write endpoints. There is no in-memory-only list, and the cache's TTL
bounds how long an unblock can lag behind its write.

### 21.3 RBAC Layer 6 — The Pure Backend Rank Function

Layer 6 is a **pure backend function**: it *evaluates* a member's rank from live Discord
state and never *writes* a rank anywhere — no table stores a member's rank, no role
assignment ever persists, and the rank is recomputed from the interaction's own member data
on every resolution. Six ranks form a strict hierarchy.

```
TABLE 21-B — The RBAC rank ladder (highest to lowest)

OWNER          the guild's ownership account — the member Discord reports as owner.
               Distinct from the Layer 1 bot-owner override (that env var is a
               process-owner identity, not a rank, and short-circuits at Layer 1)
ADMINISTRATOR  holds the ADMINISTRATOR bundle — a fixed permission-bit bundle
MODERATOR      holds the MODERATOR bundle — a fixed permission-bit bundle
HELPER         holds the HELPER bundle — a lighter, fixed support-tier bundle
MEMBER         the default rank for any authenticated member holding none of the above,
               and the default requirement every command carries when it declares nothing
RESTRICTED     the automatic floor — below MEMBER; denied by default wherever a command
               requires MEMBER or higher
```

The canonical names are MODERATOR and ADMINISTRATOR (the short ladder forms ADMIN and MOD
are accepted notation inside the ladder itself). ADMINISTRATOR, MODERATOR, and HELPER are
fixed permission-bit bundles — a guild cannot redefine which Discord permissions constitute
its moderators, because a rank means the same thing in every guild and derives from what the
member actually holds on Discord right now. A command declaring an RBAC requirement of
MODERATOR is satisfied by MODERATOR, ADMINISTRATOR, or OWNER — the ladder is **inclusive
upward**, exactly like Discord's own native permission model. **Layers 5 and 6 combine
conjunctively (AND):** a command declaring both Discord permissions and an RBAC requirement
is satisfied only when the member holds every declared Discord permission *and* meets the
declared rank — neither substitutes for the other.

### 21.4 RBAC Groups & Sets

A guild does not configure RBAC rank-by-rank — Layer 6 ranks are evaluated from live Discord
state and are never assigned (§21.3). What a guild configures are **Groups**: named mappings
from one or more Discord role ids to a single unit of grant scoping. A guild with both a
"Head Moderator" and a "Trial Moderator" role can map both into one moderator group and
author one grant against the group instead of one grant per role. Groups exist purely as
Layer 7 scope targets (§21.6) — administrative convenience, never a rank source. A **Set** is
a named bundle of groups an administrator can target with a single grant.

**Persistence.** The RBAC substrate is persisted across four tables — groups, group-role
membership, grants, and sets — all accessed through a single knex-backed repository. Role
resolution is two-step: the resolver first evaluates the fixed rank ladder from the member's
live Discord state (§21.3), then resolves the invoking member's Discord roles into groups and
sets through the repository for Layer 7 grant scoping. Migration seeds the default groups
(moderator, helper). The scope hierarchy is **role > group > set** — most-specific wins —
and scopes are resolved fresh against the invoking member's current Discord roles on every
interaction rather than cached indefinitely.

### 21.5 Rate Limiting

Rate limiting is a distinct concern from authorization. The rate-limit middleware (priority
40, ahead of the permission layers) performs an **atomic check-and-increment of both windows
in a single Redis Lua script** — one `EVALSHA` that reads and increments the per-user and
per-guild counters together, so a concurrent burst can never slip past either window between
two separate commands.

```
TABLE 21-C — Rate-limit defaults

Per-user window   60,000 ms   max 10 commands per user in the rolling window
Per-guild window  60,000 ms   max 100 commands per guild in the rolling window
```

Both are configurable per-deployment via environment variables, and a module may declare a
stricter **command-specific** cooldown layered on top of these two global windows — the
global limiter protects the platform and the database from abusive volume; a command-specific
cooldown protects that command's own semantics (a daily economy command cooling down for 24
hours has nothing to do with abuse prevention). Exceeding either global window returns an
ephemeral reply naming the remaining wait time — never a silent drop. The Swastik control
plane holds its own HTTP surface to the same discipline: a global bucket of 30 requests per
minute per caller, with a tighter registration bucket on the developer-registration, upload,
and deploy routes.

### 21.6 Layer 7 — Guild-Side Grants

A grant is the most specific, most overriding unit of authorization the engine recognizes —
a guild-side rule targeting one user, one Discord role, one group, or one set, for one
command or one entire module, in one guild.

```
TABLE 21-D — Grant types

permit      explicitly allows, overriding a Layer 4–6 denial for this specific target
blacklist   explicitly denies, overriding a Layer 4–6 allow for this specific target —
            and the only mechanism that places a member at the RESTRICTED floor
whitelist   restricts a command to ONLY explicitly whitelisted targets, regardless of
            rank — used for narrow, break-glass-style commands
cooldown    a target-specific cooldown duration overriding the command's own default
rate-limit  a usage ceiling over a rolling window for this target, distinct from the
            global rate limiter — e.g. a target permitted at most 5 uses per day
```

**Evaluation.** Layer 7 is consulted immediately after Layer 3 and is evaluated **above**
Layers 4–6: when a grant applies to the interaction, the grant's outcome is final. **Grants
apply to module commands only** — a grant never reaches a core command. Scopes resolve
**role > group > set**, most-specific wins, and grants are **resolved fresh per interaction**,
never cached across interactions.

**The override boundary — exhaustive and non-configurable.** Layer 7 grants can override
exactly and only Layers 4 and 6 and Layer 5's member-side sub-check, and module commands
only. No grant, no grant type, and no
configuration can touch: Layer 1 (the bot-owner override); Layer 2 (the blacklist); Layer 3
(guild and module availability, fail-closed); the bot-capability check (Layer 5's bot-side sub-check — the Discord
permission bitfield the bot's own identity must hold for a command to function at all; Layer
5's member-side sub-check is overridable by grant); or
the RESTRICTED floor's meaning (a blacklist grant can place a member at RESTRICTED; nothing
can lift RESTRICTED's below-MEMBER standing by grant). There is no privileged grant type, no
operator override grant, and no configuration flag that widens this list — the boundary is a
property of the engine, not a policy.

**Sovereignty — an open question, honestly held.** Whether the guild or the module author is
sovereign over a command's Discord-bit gate (Layer 5) for commands whose authors declare
stricter requirements than Discord's own defaults remains an open design question; the
current resolution — guild grants override Layers 4–6, module commands only — is the
operative rule until it is settled and recorded.

### 21.7 The OAuth2 Bridge — One Engine, Two Surfaces

MDIS authenticates dashboard requests via a Discord OAuth2 token rather than a bot-side
interaction, but it resolves authorization through the **identical resolver instance** the
command pipeline uses — never a parallel, independently-maintained check. The bridge does
exactly one thing: exchange the OAuth2 token for the same internal user/guild identity pair
the bot side would derive from an interaction, then hand that pair to the resolver unchanged.
Every layer above — blacklist, module availability, channel restriction (interpreted as
"which module panels are visible" for the dashboard context), RBAC role, and grants —
evaluates identically regardless of which surface asked. This is P13 applied specifically to
authorization.

The admin-tier access surface is additionally guarded by the five-layer defence in depth
specified in §13.6 — dev-guild-only registration with a zeroed default member permission, the
admin-tier gate middleware at priority −10, the owner-ids environment variable, a
per-capability environment guard, and time/output bounding — the layers independent by
design.

**The command-permission token — the only route to instant command hiding.** The dashboard's OAuth2
bridge authorizes *reads*. Hiding a command's permissions on Discord in the same second it changes needs
a second, user-scoped token, and that is what this flow exists for. Without it a change reaches Discord
only through the queued BCCM deregistration; with it the change lands immediately.

- **Storage.** `guild_command_permission_tokens` holds one row per guild and application: the
  authorizing user, the token expiry, a status, and the **ids of two sealed credentials** — access and
  refresh. The token *values* are never stored in the clear. They are sealed with the same envelope root
  key the credentials service uses (`ENCRYPTION_ROOT_KEY`), so a database dump alone yields no usable
  token.
- **The callback.** `/auth/callback` validates the CSRF `state` cookie, exchanges the authorization code,
  verifies through `/users/@me/guilds` that the authorizing user can **Manage** the guild, and only then
  stores the sealed token set. A user who cannot manage the guild authorizes nothing.
- **The surface.** `/dashboard` carries the **Authorize Dumby** control and the current connection status,
  so an operator can see whether the token exists and whether it is still live.
- **Refresh.** The access token is refreshed from the sealed refresh token; a refresh failure is surfaced
  as a status, never as a silent loss of instant hiding.

The authorization is per guild and per application: a persona acting in a guild needs its own
authorization, because the token is scoped to the application that will carry out the change.

### 21.8 How To Verify This Section Against the Code

- The seven-layer resolver and its fail-open/fail-closed ordering:
  `apps/main/src/permissions/resolver.ts`.
- The rank ladder and the canonical names: `apps/main/src/permissions/rank.ts`.
- RBAC groups, sets, and grants: `apps/main/src/permissions/rbac.ts`,
  `src/permissions/grant-surface.ts`, and the `rbac_*` migrations.
- The blacklist: `apps/main/src/permissions/db-blacklist.ts`.
- The rate limiter: `apps/main/src/ratelimit/sliding-window.ts`.

Divergences are recorded in `status/code-reconciliation.json`.

## Contract
- `contracts/rbac.enums.json`
- `contracts/commands.json`
- `contracts/ui-renderer.schema.json`
- `contracts/events.catalog.json`

## Acceptance
```acceptance
- id: ACC-REQ-0021-1
  check: "Authorization resolves through the {{counts.rbac_layers}} ordered layers of DIAGRAM 21-A (no parallel check exists)"
  test: tests/integration/seven-layers.spec.ts
- id: ACC-REQ-0021-2
  check: "Layer 6 is a pure backend rank function over OWNER>ADMINISTRATOR>MODERATOR>HELPER>MEMBER>RESTRICTED"
  test: tests/unit/rbac-rank.spec.ts
- id: ACC-REQ-0021-3
  check: "Layer 7 grants resolve role->group->set with most-specific-wins"
  test: tests/unit/grant-precedence.spec.ts
- id: ACC-REQ-0021-4
  check: "Fail semantics hold: layers 2/3/5/6 fail-closed; layers 4/7 fail-open; Layer 1 override bypasses all"
  test: tests/integration/permission-fail-semantics.spec.ts
- id: ACC-REQ-0021-5
  check: "One resolver is shared by the bot and the MDIS dashboard (no second implementation)"
  test: tests/arch/single-permission-engine.spec.ts
```

## Edges (-> blueprint)
- SPEC-04-REQUEST-LAYER -> SPEC-02-ARCHITECTURE (dispatch enters the core runtime)
- SPEC-04-REQUEST-LAYER#RENDERER -> documentation/ (every surface is renderer-issued)

## Named entities

**classes, interfaces & symbols:** `BlacklistLookup`, `MODERATOR-gated`, `blockUser`, `unblockUser`

**config/env constants:** `BAN_MEMBERS`, `KICK_MEMBERS`, `MANAGE_MESSAGES`, `MODERATE_MEMBERS`
**events & identifiers:** `rbac_group_roles`

