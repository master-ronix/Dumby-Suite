---
id: SPEC-04-REQUEST-LAYER-0011
title: DIVISION 8 — /permit COMMAND (RBAC PERMISSION MODULE)
kind: spec
status: normative
version: 5.0.0
authority_scope: [04-request-layer]
anchors: [DIVISION_8_PERMIT_COMMAND, OVERVIEW, COMMAND_SPECIFICATION, COMMAND_ARGUMENTS, RBAC_VOCABULARY_REFERENCE, PERMIT_GRANT_INTERACTIVE_FLOW, PERMIT_WHITELIST_INTERACTIVE_FLOW, PERMIT_BLACKLIST_INTERACTIVE_FLOW, PERMIT_COOLDOWN_INTERACTIVE_FLOW, PERMIT_RATE_LIMIT_INTERACTIVE, DENSITY_MODES_PERMIT, TITLE_ATTRIBUTION]
contracts: [contracts/rbac.enums.json, contracts/commands.json, contracts/ui-renderer.schema.json, contracts/events.catalog.json]
acceptance: [ACC-REQ-0011-1]
owners: [framework-maintainers]
last_verified_commit: null
review_state: pending-evidence
---

## DIVISION 8 — /permit COMMAND (RBAC PERMISSION MODULE)

---

### 8.1 Overview

The `/permit` command manages the guild-side of Dumby's permission system. It requires an argument to be specified, with only limited available options: `grant`, `whitelist`, `blacklist`, `cooldown`, `rate-limit`, and all other Layer 7 tools. Each argument triggers a different interactive flow for managing that specific aspect of the permission system.

The permission engine has two layers that matter to this command (`spec/request-layer/permission-authorization-engine.md` §):

- **Layer 6 — rank function.** A pure backend function that evaluates a user's rank from live Discord state — it is evaluated, never written. It provides the six-rank ladder against which command requirements are checked.
- **Layer 7 — guild-side grants.** The guild-managed override layer: permit, blacklist, whitelist, cooldown, and rate-limit grants, scoped and resolved per interaction.

The `/permit` command is the user-facing interface for managing Layer 7 grants. It never touches Layer 6 ranks (they are not writable) and never the core enforcement layers (see §8.4).

### 8.2 Command Specification

**Command name:** `/permit`
**Module:** `permit` (Core-tier, single-command module)
**Description:** Manage guild-side grants — permits, whitelists, blacklists, cooldowns, and rate limits.
**Arguments:** See §8.3.
**Permissions:** Requires Discord Administrator permission (Core-tier, governed by native Discord permissions).
**Response:** Buffer embed, then the permit flow render in place of the navigation message.

### 8.3 Command Arguments

The `/permit` command requires one of the following arguments:

| Argument | Description |
|---|---|
| `grant` | Manage permit grants for a command, for specific roles, groups, or sets |
| `whitelist` | Add a user or role to the whitelist for a command |
| `blacklist` | Add a user or role to the command-scoped blacklist for a command |
| `cooldown` | Set cooldown duration and scope for a command |
| `rate-limit` | Set rate limits for a command |

If `/permit` is invoked without an argument, the frame shows an informational message listing the available sub-commands and their purposes.

### 8.4 RBAC Vocabulary Reference

The vocabulary below is the normative model the `/permit` flows operate on. The full engineering specification is `spec/request-layer/permission-authorization-engine.md` §.

**Layer 6 — the rank function.** A pure backend function, evaluated from live Discord state and never written anywhere. Six ranks, ordered:

| Rank | Canonical name | Level | Description |
|---|---|---|---|
| OWNER | — | 6 | The guild's ownership account |
| ADMIN | ADMINISTRATOR | 5 | Guild administrator — fixed permission-bit bundle |
| MOD | MODERATOR | 4 | Guild moderator — fixed permission-bit bundle |
| HELPER | — | 3 | Limited moderation — reduced fixed bundle |
| MEMBER | — | 2 | Default rank — the default command requirement |
| RESTRICTED | — | 1 | Restricted access — the automatic floor |

Properties that hold everywhere:

- ADMIN/MOD/HELPER are fixed permission-bit bundles; guilds cannot redefine what the ranks mean.
- RESTRICTED is the automatic floor: a RESTRICTED user cannot be raised by any grant.
- MEMBER is the default requirement for commands that declare no rank requirement.
- Layer 6 ranks are not stored, not assignable, and not manageable through `/permit` or any other surface — they are derived fresh from live Discord state on every interaction.
- A command's Discord-bit gate and its Layer 5+6 declarations combine conjunctively (AND): both must pass.

**Layer 7 — guild-side grants.** What `/permit` manages:

- **Grant types:** `permit`, `blacklist`, `whitelist`, `cooldown`, `rate-limit`.
- **Grant scopes:** role > group > set — when multiple grants match, the most-specific scope wins.
- **Command scope:** grants target module commands only. Core-tier commands and core commands are not grant-manageable.
- **Override boundary — hard and non-configurable:** Layer 7 grants never override Layers 1–3 (bot-owner override, the blacklist, guild/module availability), never the bot-capability check, and never the RESTRICTED floor. A permit cannot lift a user above a rank requirement, and nothing can lift a RESTRICTED user.
- **Resolution freshness:** the grant set is resolved fresh on every interaction — an edit through `/permit` takes effect on the very next command invocation, with no cache window.

### 8.5 /permit grant — Interactive Flow

When `/permit grant` is invoked, the following multi-step interactive flow begins. Each step buffers and edits the same navigation message in place. Every component interaction passes the invoker re-check (§2.4); every action is idempotent on retry.

**Step 1: Command Selection**

The message is edited to show a dropdown (String Select Menu) containing the module commands the guild administrator can manage grants for — module commands only (§8.4):

```
┌─────────────────────────────────────────────────────────┐
│                    BANNER (YouTube thumbnail size)        │
├─────────────────────────────────────────────────────────┤
│                                                           │
│  Dumby | Permit                                           │
│  -# Developed by Quixotic Mnemonics v5.0.0                │
│                                                           │
├─────────────────────────────────────────────────────────┤
│                                                           │
│  Grant Access — Step 1: Select Command                    │
│                                                           │
│  Choose a module command to manage grant access:          │
│                                                           │
│  [DROPDOWN — Select Command]                              │
│  📦 ban         moderation v2.1.0 — Ban a member         │
│  📦 kick        moderation v2.1.0 — Kick a member        │
│  📦 mute        moderation v2.1.0 — Timeout a member     │
│  📦 warn        moderation v2.1.0 — Warn a member         │
│  📦 play        music v1.3.0     — Play music            │
│  ...                                                       │
│                                                           │
├─────────────────────────────────────────────────────────┤
│                                                           │
│  -# Developed by Quixotic Mnemonics v5.0.0   [D][M][C]  │
│                                                           │
└─────────────────────────────────────────────────────────┘
```

Each dropdown option includes:
- The module's logo emoji (from the module's assets directory).
- The command name.
- The module name and version, and related info, in the option description.

The dropdown is autocomplete-backed where the command space is large (§2.5).

**Step 2: Role/Group/Set Selection**

After a command is selected, the message is edited to show a new dropdown for selecting the grant scope target:

```
┌─────────────────────────────────────────────────────────┐
│  Grant Access — Step 2: Select Target                     │
│  Command: ban (moderation v2.1.0)                         │
│                                                           │
│  Choose a role, group, or set to manage grants for:      │
│  (Search enabled — type to filter)                         │
│                                                           │
│  [DROPDOWN — Select Roles/Groups/Sets]                    │
│  👤 @Moderator       (Role)                               │
│  👥 Moderation Team  (Group)                              │
│  📋 Senior Staff     (Set)                                │
│  👤 @Helper          (Role)                               │
│  ...                                                       │
└─────────────────────────────────────────────────────────┘
```

This dropdown has the search button enabled, allowing the admin to type and filter through roles, groups, and sets. A **set** is a set of groups; the three grant scopes are role > group > set, with most-specific-wins resolution at interaction time (§8.4).

**Step 3: Grant Details & Action Buttons**

After a role/group/set is selected, the message is edited to show all grants related to that selection for the chosen command, with three action buttons:

```
┌─────────────────────────────────────────────────────────┐
│  Grant Access — Step 3: Grant Details                     │
│                                                           │
│  Command:  ban (moderation v2.1.0)                        │
│  Target:   @Moderator (Role)                              │
│                                                           │
│  Current Grants:                                           │
│  ┌───────────────────────────────────────────────────┐    │
│  │ Grant Type:  permit                                │    │
│  │ Effect:      ALLOW                                  │    │
│  │ Scope:       Role                                    │    │
│  │ Granted by:  @AdminUser on 2026-09-14              │    │
│  │ Expires:    Never                                   │    │
│  └───────────────────────────────────────────────────┘    │
│                                                           │
│  [Grant Access]  [Grant Decline]  [Grant Edit]            │
└─────────────────────────────────────────────────────────┘
```

The three buttons:

- **[Grant Access]:** Creates a `permit` grant (ALLOW) for the selected command to the selected role/group/set. The grant is written to the grant store and takes effect on the very next interaction — Layer 7 is resolved fresh per interaction (§8.4).
- **[Grant Decline]:** Creates a `blacklist`-typed deny for the selected command and target. A deny at Layer 7 blocks the command for that target. Note the override boundary: a deny cannot push past Layers 1–3, the bot-capability check, or the RESTRICTED floor, and a permit can never lift a target above a Layer 6 rank requirement.
- **[Grant Edit]:** Opens an interactive editing modal for modifying the existing grant — the grant type, an expiration time, or other grant parameters. After the modal is submitted, the message passes through the buffer state and is edited into the updated grant details.

Users affected by a grant change see the formal notice frame (`FORBIDDEN` or the relevant reason code) when a subsequent invocation is denied — never an unexplained failure.

### 8.6 /permit whitelist — Interactive Flow

When `/permit whitelist` is invoked:

**Step 1: Command Selection** — Same as grant Step 1: dropdown to select a module command (autocomplete-backed).

**Step 2: Target Selection** — Dropdown to select a user or role to whitelist for the selected command. Search is enabled.

**Step 3: Whitelist Details** — Shows the current whitelist status for the selected target and command, with three buttons:

- **[Add to Whitelist]:** Adds the selected user/role to the command's whitelist. A whitelisted user is exempted from the Layer 7 permit check for that command — but never from Layers 1–3, the bot-capability check, or the RESTRICTED floor (§8.4).
- **[Remove from Whitelist]:** Removes the user/role from the whitelist.
- **[Edit Whitelist Entry]:** Opens a modal to modify the whitelist entry (e.g., scope, expiration).

### 8.7 /permit blacklist — Interactive Flow

When `/permit blacklist` is invoked:

**Step 1: Command Selection** — Same dropdown to select a module command.

**Step 2: Target Selection** — Dropdown to select a user or role to blacklist for the selected command. Search is enabled.

**Step 3: Blacklist Details** — Shows the current blacklist status with three buttons:

- **[Add to Blacklist]:** Adds the user/role to the command-scoped blacklist. A blacklisted user's invocation of that command is denied at Layer 7 resolution and presented as a `FORBIDDEN` formal notice frame (§2.3) — never a bare or unexplained failure.
- **[Remove from Blacklist]:** Removes the user/role from the command-scoped blacklist.
- **[Edit Blacklist Entry]:** Opens a modal to modify the blacklist entry (e.g., scope, reason, expiration).

### 8.8 /permit cooldown — Interactive Flow

When `/permit cooldown` is invoked:

**Step 1: Command Selection** — Dropdown to select a module command.

**Step 2: Target Selection** — Dropdown to select a user, role, group, or set. Search is enabled.

**Step 3: Cooldown Details** — Shows the current cooldown settings:

- **Current cooldown:** the duration and scope (e.g., "10 seconds per user").
- **[Set Cooldown]:** Opens a modal to set a new cooldown duration (in seconds) and scope (USER/GUILD/CHANNEL/GLOBAL).
- **[Remove Cooldown]:** Removes the custom cooldown, reverting to the command's default.
- **[Edit Cooldown]:** Opens a modal to modify the existing cooldown parameters.

Cooldown grants are Layer 7 grants: they are enforced by the rate-limiter middleware reading the freshly resolved grant set, and they apply to module commands only. The cooldown books only on a successful handler return — a failed command execution does not consume the cooldown.

### 8.9 /permit rate-limit — Interactive Flow

When `/permit rate-limit` is invoked:

**Step 1: Command Selection** — Dropdown to select a module command or the module itself.

**Step 2: Target Selection** — Dropdown to select a user, role, group, or set. Search is enabled.

**Step 3: Rate-Limit Details** — Shows the current rate-limit settings:

- **Current rate limit:** the usage allowance and window (e.g., "10 uses per minute per user").
- **[Set Rate Limit]:** Opens a modal to set a new limit (number of uses, time window, scope: USER/GUILD/CHANNEL/GLOBAL).
- **[Remove Rate Limit]:** Removes the custom rate limit, reverting to the command's default.
- **[Edit Rate Limit]:** Opens a modal to modify the existing rate-limit parameters.

Rate-limit grants are Layer 7 grants enforced by the rate-limiter middleware with atomic check-and-increment operations for cross-process consistency. A user exceeding the limit sees the `RATE_LIMITED` formal notice frame; a user inside an active cooldown sees `COOLDOWN`.

### 8.10 Density Modes — Permit

- **Mode D:** Full flow — banner, the step content in full (dropdown listings, grant detail cards), footer.
- **Mode M:** No banner; dropdown options show name + module only (descriptions dropped); grant cards collapse to two lines.
- **Mode C:** A single line naming the current step and selection (e.g., "Permit · grant · ban → @Moderator") plus the footer mode control. The dropdowns of the active step remain interactive.

### 8.11 Title & Attribution

The permit page uses:
```
Dumby | Permit
-# Developed by Quixotic Mnemonics v5.0.0
```

---

---

## Contract
- `contracts/rbac.enums.json`
- `contracts/commands.json`
- `contracts/ui-renderer.schema.json`
- `contracts/events.catalog.json`

## Acceptance
```acceptance
- id: ACC-REQ-0011-1
  check: "`/permit` manages Layer 6/7 grants in the RBAC vocabulary"
  test: tests/integration/permit.spec.ts
```

## Edges (-> blueprint)
- SPEC-04-REQUEST-LAYER -> SPEC-02-ARCHITECTURE (dispatch enters the core runtime)
- SPEC-04-REQUEST-LAYER#RENDERER -> documentation/ (every surface is renderer-issued)
