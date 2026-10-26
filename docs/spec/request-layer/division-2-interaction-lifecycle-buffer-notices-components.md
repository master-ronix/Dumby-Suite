---
id: SPEC-04-REQUEST-LAYER-0005
title: DIVISION 2 — INTERACTION LIFECYCLE: BUFFER, NOTICES & COMPONENTS
kind: spec
status: normative
version: 5.0.0
authority_scope: [04-request-layer]
anchors: [DIVISION_2_INTERACTION_LIFECYCLE, THE_BUFFER_EMBED, EDIT_IN_PLACE_NAVIGATION, THE_FORMAL_NOTICE_FRAME, INTERACTIVE_COMPONENT_DISPATCH, AUTOCOMPLETE, DEFERRED_INTERACTIONS_THE_FOLLOW, CONTRACT, ACCEPTANCE, EDGES_BLUEPRINT]
contracts: [contracts/rbac.enums.json, contracts/commands.json, contracts/ui-renderer.schema.json, contracts/events.catalog.json]
acceptance: [ACC-REQ-0005-1, ACC-REQ-0005-2, ACC-REQ-0005-3]
owners: [framework-maintainers]
last_verified_commit: null
review_state: pending-evidence
---

## DIVISION 2 — INTERACTION LIFECYCLE: BUFFER, NOTICES & COMPONENTS

### 2.1 The Buffer Embed

On every interaction that passes the invoker re-check (§2.4), the Renderer immediately sends a **buffer embed** — a minimal frame acknowledging the interaction — and then edits that buffer into the final render, or into the formal notice frame when the outcome is a failure, a maintenance condition, or an unknown command. No interaction is ever left without a visible acknowledgement while its result is computed.

**Buffer frame specification:**

```
┌─────────────────────────────────────────────────────────┐
│  Dumby | {SurfaceName}                                   │
│  -# Developed by {Developer}                              │
├─────────────────────────────────────────────────────────┤
│  ⏳ Preparing {SurfaceName}…                              │
└─────────────────────────────────────────────────────────┘
```

The buffer carries the identity band (title and attribution per §1.5), one accent-coloured divider, and a single "Preparing…" line. In Mode C the buffer is a single text line with the surface identity. The buffer contains no interactive components except, where already present, the footer mode control.

**Composition with edit-in-place.** The buffer lifecycle composes with the edit-in-place navigation invariant (§2.2): there is always exactly one message in play. When the interaction is a new command invocation, the buffer is the initial reply. When the interaction is a component interaction on an existing navigation message — a dropdown select, a button, a modal submit — the buffer state is applied to that same message: the frame briefly enters the buffer presentation and is then edited into the result. In both cases the user's acknowledgement is instant and the final state lands as an edit of the same message.

### 2.2 Edit-in-Place Navigation Invariant

Every interaction in the Dumby dashboard system edits the existing navigation message in place rather than sending new messages. The flow:

1. User invokes `/dashboard` → the buffer is sent as the initial message and edited into the dashboard home render.
2. User selects a module from the dropdown → the same message enters the buffer state and is edited to show that module's page.
3. User selects "Dashboard (Home)" from the dropdown → the same message is edited back to the home page.
4. User invokes `/health` (or any other core command) → if a navigation message from the same user exists in the channel, it is edited to show the health page; if none exists, a new message is sent (buffer first) and becomes the navigation message for future edits.

This behaviour applies to all frames defined in this document: page navigation, command-specific dropdowns, buttons, modal submits, and mode switches. No command or component sends a new message after the initial navigation message exists. One message, edited in place — with the buffer as the instant acknowledgement of every step (§2.1).

### 2.3 The Formal Notice Frame

The formal notice frame is the Renderer's unified presentation for failure, maintenance, and unknown-command outcomes. One frame and one grammar serve all three: there are no ad-hoc error messages in the Dumby interface.

**Frame specification:**

```
┌─────────────────────────────────────────────────────────┐
│  Dumby | {SurfaceName}                                   │
│  -# Developed by {Developer}                              │
├─────────────────────────────────────────────────────────┤
│  ⚠ {Notice heading}                                      │
│                                                           │
│  {One-to-three line human explanation}                    │
│                                                           │
│  reason: {REASON_CODE}                                    │
│  trace: {correlationId}                                   │
└─────────────────────────────────────────────────────────┘
```

- **Banner slot omitted.** Notices render in the minimal frame regardless of the page's density mode.
- **Reason code.** A machine-readable, stable, uppercase token from the table below. Reason codes are part of the interface contract: tooling and support quote them verbatim.
- **Trace correlation ID.** Minted per interaction. The trace joins the notice to the audit log and telemetry spans (blueprint.md §27), and is the reference a user quotes in a support request.

**Reason code table:**

| Reason code | Category | Typical trigger |
|---|---|---|
| `UNKNOWN_COMMAND` | Input | The invoked command is not registered or not available |
| `MAINTENANCE` | System | Maintenance mode is active |
| `NOT_FOUND` | State | The selected target (module, queue entry, grant target) does not exist |
| `FORBIDDEN` | Authorization | The user's Layer 6 rank, Layer 7 resolution, or Discord permission bits are below the requirement |
| `RESTRICTED` | Authorization | The RESTRICTED floor applies |
| `COOLDOWN` | Throttling | A cooldown is active for the user and command |
| `RATE_LIMITED` | Throttling | A rate limit is exceeded |
| `GUILD_UNAVAILABLE` | Availability | The module is not available in this guild |
| `MODULE_DISABLED` | Availability | The module is disabled in this guild — its commands stay registered so the member is told *why*, and the router refuses them here rather than letting dispatch report `UNKNOWN_COMMAND` |
| `MODULE_ERROR` | Failure | A module handler failed during execution |
| `OVERDUE` | Failure | The interaction expired before its final render; an overdue event was logged (§2.6) |

The notice frame is the only failure presentation. Validation failures (§6.7), permission denials (§8.4), install rejections (§5.5), and expiry outcomes (§2.6) all render through it.

**A refusal is private.** A module refusal is for the member who tried the action, not an
announcement to the channel. It is delivered as a **private follow-up**, never by editing the message
that carries the page.

The constraint is structural, not cosmetic. The component registry acknowledges every control with a
*public* `deferUpdate` before the handler runs — that is what lets the handler edit the existing
message in place — and an edit cannot change an existing message's ephemerality. So a notice that rides
the page edit is public by construction, and putting the private grammar on it produces a
channel-visible card with no accent and no footer. A follow-up is a new message, and a new message can
be private.

**Order is part of the contract.** The refusal is sent **before** the page refresh. Sent after a
failing refresh it is swallowed and the member sees nothing at all; sent first, the member is always
told and the refresh is best-effort, so a refresh failure cannot cost the notice.

**A refusal names both parties.** A refusal has two: who was refused, and who holds the thing. The
message names both, because wording that names only the holder invites the reader to assume the actor
is the same kind of profile — an assumption that is wrong whenever the actor is the resident bot, which
is not a persona at all.

### 2.4 Interactive Component Dispatch

All interactive components — buttons, select menus, modals, and autocomplete — are dispatched through the **InteractionRegistry** (blueprint.md §20). The contract:

- **Minted customIds.** Every component carries a registry-minted customId encoding its origin, page, and action. Hand-written free-text customIds are not part of the authoring contract; the Renderer mints them when it derives a flow from a schema (§1.7).
- **Invoker re-check.** On every component interaction, the registry re-checks that the interacting user is the invoker of the navigation message. A non-invoker's interaction is **silently rejected** — the 403-equivalent: no buffer, no notice frame, no edit, and no visible change for anyone. The navigation message belongs to the user who invoked it.
- **Idempotency protection.** Retries — double-clicks, network replays, resubmitted modals — are recognized by the registry and return the current state without re-executing the action. Installing twice, granting twice, or cancelling twice is not possible through retry; the second attempt lands as the already-achieved result.

Component dispatch ordering with the buffer lifecycle: the invoker re-check runs first; an interaction that passes it receives the buffer (§2.1); idempotency is evaluated before the action executes.

### 2.5 Autocomplete

Autocomplete-enabled command options answer within an **800 ms budget**. If the full answer set cannot be computed within the budget, the Renderer serves the cached or partial result set rather than an empty or late answer — an autocomplete response is never blank-by-default and never arrives after the budget has lapsed. Autocomplete is available on the option spaces where it matters: command names in `/queue`, command and grant targets in `/permit`, and module search in `/browse`.

### 2.6 Deferred Interactions & the Follow-Up Watchdog

Interactions whose final render cannot be produced within the acknowledgement window are auto-deferred; the buffer is already visible to the user (§2.1). If an auto-deferred interaction would expire before its final render can land, a **13-minute follow-up watchdog** guarantees a logged overdue event: the buffer is edited into an `OVERDUE` formal notice frame for the user, and the overdue event is recorded with the interaction's trace correlation ID for operator review. The engineering contract (defer windows, the watchdog alarm, and the retry policy it consumes) is specified in blueprint.md §20 and §28.

The user-visible guarantee is the complete failure UX: **buffer first, then either the final render or a formal notice — never silence.**

---

## Contract
- `contracts/rbac.enums.json`
- `contracts/commands.json`
- `contracts/ui-renderer.schema.json`
- `contracts/events.catalog.json`

## Acceptance
```acceptance
- id: ACC-REQ-0005-1
  check: "Every interaction is answered instantly with a buffer embed, edited exactly once into the final render or a formal notice frame"
  test: tests/integration/buffer-then-render.spec.ts
- id: ACC-REQ-0005-2
  check: "Navigation edits in place (one message), never posting superseded messages"
  test: tests/integration/edit-in-place.spec.ts
- id: ACC-REQ-0005-3
  check: "Formal notice frames carry a machine-readable reason code and a trace correlation id"
  test: tests/unit/notice-frame.spec.ts
```

## Edges (-> blueprint)
- SPEC-04-REQUEST-LAYER -> SPEC-02-ARCHITECTURE (dispatch enters the core runtime)
- SPEC-04-REQUEST-LAYER#RENDERER -> documentation/ (every surface is renderer-issued)
