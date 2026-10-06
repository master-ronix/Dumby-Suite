---
id: SPEC-04-REQUEST-LAYER-0009
title: DIVISION 6 — /queue COMMAND (BCCM QUEUE MODULE)
kind: spec
status: normative
version: 5.0.0
authority_scope: [04-request-layer]
anchors: [DIVISION_6_QUEUE_COMMAND, OVERVIEW, COMMAND_SPECIFICATION, COMMAND_ARGUMENTS, BCCM_ACTION_TYPES, QUEUE_LIST_VIEW_NO, QUEUE_ENTRY_BUTTONS, QUEUE_SUBMISSION_FLOW, BATCHING_WINDOW, DENSITY_MODES_QUEUE, TITLE_ATTRIBUTION, CONTRACT]
contracts: [contracts/rbac.enums.json, contracts/commands.json, contracts/ui-renderer.schema.json, contracts/events.catalog.json]
acceptance: [ACC-REQ-0009-1]
owners: [framework-maintainers]
last_verified_commit: null
review_state: pending-evidence
---

## DIVISION 6 — /queue COMMAND (BCCM QUEUE MODULE)

---

### 6.1 Overview

The `/queue` command manages the BCCM (Bot Command Cosmetics for Marketplace) queue. BCCM batches guild-level command renames, aliases, and disable requests through the `guild_command_queue` table within a 12–13 hour batching window. This is the interface for guild administrators to submit, review, edit, and cancel pending command change requests.

### 6.2 Command Specification

**Command name:** `/queue`
**Module:** `queue` (Core-tier, single-command module)
**Description:** Manage BCCM command queue actions — submit, view, edit, and cancel pending command changes.
**Arguments:** See §6.3.
**Permissions:** Available to all users for viewing; submission and modification requires Discord Administrator permission or Manage Guild permission.
**Response:** Buffer embed, then the queue page render in place of the navigation message.

### 6.3 Command Arguments

The `/queue` command accepts the following slash command arguments:

| Argument | Type | Required | Description |
|---|---|---|---|
| `command` | String | No | The command name to queue an action for (e.g., `ban`, `kick`) — autocomplete-enabled (§2.5) |
| `alias` | String | No | An alias name to add for the command |
| `new-name` | String | No | A new name to rename the command to |
| `disable` | Boolean | No | Set to `true` to disable the command, `false` to re-enable |
| `action` | String (choices) | No | The BCCM action type: `rename`, `alias`, `disable`, `enable` |

**When arguments are provided:** The command submits a new queue entry with the specified parameters. The entry is added to the `guild_command_queue` table and will be processed during the next batch push (within the 12–13 hour window).

**When no arguments are provided:** The command displays the list of all queued command actions that have been submitted for this guild but not yet processed.

### 6.4 BCCM Action Types

The BCCM system supports the following action types, all of which are available as arguments to `/queue`:

**Rename (`new-name` argument):**
Changes what a slash command is called in this guild. The rename only changes what the command is called, never how it is invoked — it remains a slash command, not a text-prefix command. Renames are batched and take effect within 12–13 hours.

**Alias (`alias` argument):**
Adds an additional name alongside the command's original name. The command becomes callable by both its original name and the alias. Aliases are subject to the same batching window.

**Disable (`disable: true`):**
Disables a command in this guild. The command becomes unusable immediately via Discord permission overrides, but the underlying deregistration happens during the next batch push.

**Enable (`disable: false`):**
Re-enables a previously disabled command. The command becomes usable immediately via permission overrides, with the re-registration batched.

**Constraints:**
- An alias may never match a reserved, native Discord command name (`/help`, `/giphy`, `/tenor`, etc.). The system rejects the request outright with a formal notice frame (`reason: NOT_FOUND` on the reserved-name check, with the human explanation "Cannot alias a reserved Discord command.").
- BCCM never becomes a text-prefix system — a rename or alias only changes what a slash command is called, never how it is invoked.
- Before accepting any queue request, BCCM projects the guild's resulting total registered-command count. A request that would raise the guild's total above Discord's 100-command ceiling is rejected outright, before it enters the queue, with the specific projected count returned in the notice explanation.

### 6.5 Queue List View (No Arguments)

When `/queue` is invoked without arguments, the frame displays the list of all queued command actions for this guild:

```
┌─────────────────────────────────────────────────────────┐
│                    BANNER (YouTube thumbnail size)        │
│  [Queue banner — Dumby default]                           │
├─────────────────────────────────────────────────────────┤
│                                                           │
│  Dumby | Queue                                            │
│  -# Developed by Quixotic Mnemonics v5.0.0                │
│                                                           │
├─────────────────────────────────────────────────────────┤
│                                                           │
│  Pending Command Queue Actions                            │
│  Batch window: next push in ~8h 23m                       │
│                                                           │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━               │
│                                                           │
│  #1  Action: Rename                                       │
│      Command: ban                                         │
│      New Name: timeout                                    │
│      Submitted: 2026-09-18 14:32 UTC                       │
│      Submitted by: @AdminUser                             │
│      Status: Queued                                       │
│      [Edit]  [Cancel]                                     │
│                                                           │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━               │
│                                                           │
│  #2  Action: Alias                                        │
│      Command: kick                                        │
│      Alias: yeet                                          │
│      Submitted: 2026-09-18 15:10 UTC                       │
│      Submitted by: @AnotherAdmin                           │
│      Status: Queued                                       │
│      [Edit]  [Cancel]                                     │
│                                                           │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━               │
│                                                           │
│  Total queued: 3   |   Next batch push: ~8h 23m           │
│                                                           │
├─────────────────────────────────────────────────────────┤
│                                                           │
│  -# Developed by Quixotic Mnemonics v5.0.0   [D][M][C]  │
│                                                           │
├─────────────────────────────────────────────────────────┤
│                                                           │
│  [INTERACTIVE DROPDOWN — Navigate to other pages]         │
│                                                           │
└─────────────────────────────────────────────────────────┘
```

### 6.6 Queue Entry Buttons

Every queued command action has two buttons, each carrying a registry-minted customId (§2.4) scoped to the queue entry:

**[Edit] button:**
Opens an interactive editing modal for that specific queue entry. The admin can modify:
- The command name (for rename/alias actions)
- The new name or alias value
- The disable/enable toggle
- The action type

After the modal is submitted, the message passes through the buffer state and is edited into the updated queue list view. A non-invoker's click on [Edit] is silently rejected; a retried modal submit is absorbed by idempotency protection and returns the current entry state.

**[Cancel] button:**
Cancels the queue request. When clicked, the queue entry is removed from the `guild_command_queue` table and the message is edited in place to show the updated queue list with the cancelled entry removed. Idempotency protection means a second click (or a network replay) never errors — it simply re-renders the queue list without the already-cancelled entry. A non-invoker's click is silently rejected.

### 6.7 Queue Submission Flow

When `/queue` is invoked with arguments:

1. The buffer embed is sent (§2.1).
2. The command validates the arguments: the command name exists, the alias/new-name is not a reserved Discord command, and the projected command count does not exceed the 100-command ceiling.
3. If validation fails, the buffer is edited into the formal notice frame with the specific reason code and human explanation (§2.3) — no ephemeral error text, no partial render.
4. If validation passes, the queue entry is written to `guild_command_queue`.
5. The message is edited into the updated queue list render with the new entry at the bottom, including its [Edit] and [Cancel] buttons, and the batch window countdown.

### 6.8 Batching Window

The BCCM batching window operates on a 12–13 hour cycle. All queued actions for a guild are batched and pushed together as a single bulk-overwrite of the guild's registered command set. This conserves Discord's 200-per-day guild-command-creation limit. The queue list view displays the estimated time remaining until the next batch push.

### 6.9 Density Modes — Queue

- **Mode D:** Full page — banner, every queued entry in full detail with its buttons, totals line, footer, navigation dropdown.
- **Mode M:** No banner; each queued entry collapses to a single line (`#1 Rename ban → timeout — Queued`); buttons retained per entry; dropdown retained.
- **Mode C:** A single line — total queued and time to next batch push — plus the footer mode control.

### 6.10 Title & Attribution

The queue page uses:
```
Dumby | Queue
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
- id: ACC-REQ-0009-1
  check: "`/queue` shows the guild command-change queue state"
  test: tests/integration/queue.spec.ts
```

## Edges (-> blueprint)
- SPEC-04-REQUEST-LAYER -> SPEC-02-ARCHITECTURE (dispatch enters the core runtime)
- SPEC-04-REQUEST-LAYER#RENDERER -> documentation/ (every surface is renderer-issued)
