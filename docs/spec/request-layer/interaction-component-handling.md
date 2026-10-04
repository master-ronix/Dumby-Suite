---
id: SPEC-04-REQUEST-LAYER-0020
title: 20. Interaction & Component Handling
kind: spec
status: normative
version: 5.0.0
authority_scope: [04-request-layer]
anchors: [INTERACTION_COMPONENT_HANDLING, THE_COMPONENT_REGISTRY_CUSTOM, BUTTONS_SELECT_MENUS, AUTHORIZATION_RE_CHECK_ON, MODALS, AUTOCOMPLETE, PAGINATION_PATTERN, ADVANCED_INTERACTION_PATTERNS, MULTI_STEP_COMMAND_FLOWS, THE_CONFIRMATION_PATTERN_DETAILED, THE_PAGINATED_EMBED_PATTERN, THE_PROGRESSIVE_DISCLOSURE_PATTERN]
contracts: [contracts/rbac.enums.json, contracts/commands.json, contracts/ui-renderer.schema.json, contracts/events.catalog.json]
acceptance: [ACC-REQ-0020-1, ACC-REQ-0020-2, ACC-REQ-0020-3]
owners: [framework-maintainers]
last_verified_commit: null
review_state: pending-evidence
---

## 20. Interaction & Component Handling

**Status:** [SPEC]

### 20.1 The Component Registry & Custom ID Encoding

Buttons, select menus, and modals are stateless from the framework's perspective — Discord
does not correlate a component interaction back to the command invocation that created it.
Routing depends entirely on the component's `custom_id`, a string Discord caps at **100
characters**, so the interaction registry encodes routing information into a compact,
structured scheme rather than relying on server-side session state.

```
CODE REFERENCE 20-A — The custom-id scheme

  {moduleNamespace}:{handlerKey}:{contextPayload}
  Example: "moderation:case-close:c_4f81a2"

  moduleNamespace → the owning module — the registry routes by this prefix before
                    any handler-specific parsing happens
  handlerKey      → identifies which registered handler parses the payload and executes
  contextPayload  → a short opaque reference (a case id, an index — never a full JSON
                    blob; large context is looked up from the database using this reference)
```

Action-id ownership belongs to the **core registry**: module authors no longer encode custom
ids on buttons themselves. The registry mints, encodes, and owns every `custom_id`,
dispatching by prefix to a handler's parse/execute functions. This centralises component
routing and prevents custom-id collisions across modules. Encoding a database reference
rather than full state keeps every id well under Discord's limit and means a component's
behaviour always reflects the database's **current** state at click time rather than a stale
snapshot.

### 20.2 Buttons & Select Menus

Button and select-menu handlers register through the same manifest surface as commands — a
class implementing the component-handler interface, listed in a module's manifest — and pass
through a **reduced slice** of the middleware pipeline: the trace, auth, guild-config, and
locale stages always run; rate-limit, permission, and RBAC run only when the handler
explicitly opts in; cooldown **never** applies to components.

Buttons, selects, modals, and autocomplete all dispatch through the registry on a
`custom_id` the registry itself minted (§20.1) — a component whose `custom_id` was not
minted by the registry is **dropped as untrusted input**, never routed. Registry dispatch is
**idempotent per interaction**: the interaction id is recorded in Redis with a bounded TTL,
and a duplicate submission returns the original outcome instead of re-executing. The invoker
re-check (§20.3) runs inside registry dispatch for every component whose id encodes an
invoker binding.

### 20.3 Authorization Re-Check on Component Interactions

A button rendered in a message is visible, and clickable, by anyone who can see that channel
— not only the user the original command was invoked by. Any component whose action should
be restricted to the original invoker, or to a specific role, re-checks that authorization
explicitly inside its own handler, using the same permission resolver the command pipeline
calls (§21). This is the mandatory pattern for any moderation-relevant or destructive
component action — a "Confirm Ban" button's handler independently re-verifies that the
clicking user holds moderation permission.

### 20.4 Modals

Modal submissions follow the identical registry and custom-id scheme as buttons and selects,
with one platform-driven difference: a modal is shown in direct response to an interaction —
a button click, most commonly — so a module opening one never defers first. Deferral and a
modal display are mutually exclusive within the same interaction response.

### 20.5 Autocomplete

An option declaring `autocomplete: true` routes to the handler registered under that
option's name in the command's autocomplete map (§17.2). Discord's platform gives an
autocomplete handler a strict, short response window, so implementations read from cache
(the L1/L2 cascade, §25) rather than issuing a fresh database query on every keystroke. The
framework's dispatcher enforces an internal **800-millisecond budget** — well inside
Discord's 1-second window: a handler that has not produced suggestions by the budget's
expiry has its in-flight result discarded and an empty list returned in its place.

### 20.6 Pagination Pattern

Multi-page content follows a shared pattern rather than each module reinventing navigation:
a paginator utility accepts a data-fetching function and a page size, renders Previous/Next
buttons whose `custom_id` encodes the target page number and the original query's parameters
(never the full result set), and re-queries the underlying data fresh on every page turn
using the encoded parameters. Nothing about a paginated view is held in server-side session
memory between clicks — the same stateless philosophy as the routing scheme.

### 20.7 Advanced Interaction Patterns

- **Multi-step flows.** Button-based flows (Next / Previous / Cancel buttons, flow state in
  Redis with a 5-minute TTL) for short flows; select-menu flows for choosing from predefined
  options; modal flows for text input; and hybrid flows combining all three for complex
  wizards such as the module-configuration wizard.
- **The confirmation pattern.** For destructive actions, a confirmation helper sends a
  render describing the action with Confirm (danger) and Cancel (secondary) buttons and a
  "this cannot be undone" warning. Flow state lives in Redis with a **30-second TTL**. Only
  the invoking user can click — another user who clicks receives "Only the user who invoked
  this command can confirm or cancel." Confirm executes the action; Cancel abandons it; no
  click within 30 seconds yields "Confirmation timed out" and the action does not execute.
- **The paginated pattern.** A pagination helper sends the first page with Previous
  (disabled on page one), Next, and "Page X of Y" buttons; pagination state lives in Redis
  with a **5-minute TTL**. On click it fetches the requested page and updates the message.
  After 5 minutes of inactivity the buttons stop working and the command must be re-invoked.
- **Progressive disclosure.** For complex information, a summary with expandable sections;
  expand buttons reveal detail. Used by the user-info and server-info surfaces.
- **Autocomplete-sourced commands.** Suggestions from a name-match lookup, completing within
  the 800 ms budget, querying L1 first and the database with a limit of **25** results
  (Discord's maximum) only on a miss.
- **The deferred response pattern.** For commands taking more than ~2.5 seconds: the
  framework auto-defers, the module sends a follow-up when complete, and the deferred
  response has a **15-minute window** — if no response arrives within it, the interaction
  token expires and the user sees "the bot did not respond."
- **The ephemeral configuration wizard.** An entire wizard in ephemeral messages, flow state
  in Redis with a 5-minute TTL, ending in a Save button that validates the configuration
  against the module's schema and persists it.

### 20.8 The Core Renderer — Grammar, Slots, and Modes

The Renderer is a **core-owned subsystem**: the single constructor of every Discord payload
the framework's user-facing surfaces emit. Module authors never build payloads — they declare
command schemas (options, response shapes, component flows), and the Renderer derives the
presentation. The classic `EmbedBuilder` and `MessageEmbed` are **banned from module code**
by the same four-layer enforcement structure as the prefix-command ban (§4, ADR-001).

```
Static grammar — Components v2
  frame        the outer container every render lives inside
  divider      a horizontal separator between content sections
  title/subtitle  the render's heading pair — the A4 title and attribution grammar
               (ADR-009): the title states the command or page's name; the subtitle
               carries the attribution in one fixed form
  footer       the standard footer: framework identity, module identity, timestamp

Dynamic slots
  accent       the single official accent colour, blurple #5865F2 (ADR-010) — one
               value, everywhere
  banner       an optional per-module banner image, declared in the module's identity,
               never per-command
  module identity  the rendering module's identity — name and attribution, filling the
               subtitle/footer grammar
  content      the command's declared response content — text, sections, and the
               components the schema authorizes (buttons, selects, modals)
```

```
TABLE 20-C — The three density modes

D — Detailed   the full render: every section and data point the surface declares
M — Medium     the condensed summary: the essentials, with detail collapsed
C — Compact    the single-line status render
```

The Renderer selects the default mode per surface and context — direct command invocations
and the dashboard home default to D; confirmations and transient results default to C — and
the invoking user can switch the density of any page through the footer's D/M/C control; the
choice is invoker-scoped and applies to subsequent renders of the same navigation message.
The mode changes density, never content semantics. The Renderer's own test suite — including
the accessibility conformance checks — is the one place presentation correctness is verified,
so every module inherits a correct, accessible render by construction.

### 20.9 The Buffer Embed & Formal Notice Frames

**The buffer embed.** Every interaction — every slash command, component click, and modal
submit — receives an instant buffer embed at acknowledgment time, before any business logic
runs. **Autocomplete requests are the deliberate exception:** they must be answered within
the 1-second window and never receive a buffer embed. The buffer is a minimal, mode-neutral
render whose only job is to occupy the interaction's response slot. When the command
completes, the buffer is edited into the final render; the buffer never persists as the
response for a completed command.

**The formal notice frame.** When a command cannot complete — handler failure, maintenance
mode, unknown command, rejection at any middleware layer — the buffer is edited into the
formal notice frame instead: the single, merged failure, maintenance, and unknown-command
presentation. A formal notice carries exactly **two** machine-correlatable fields:

- **reason code** — a stable, documented, machine-readable code naming why the interaction
  did not produce a normal render, one of the normative set: `UNKNOWN_COMMAND`,
  `MAINTENANCE`, `NOT_FOUND`, `FORBIDDEN`, `RESTRICTED`, `COOLDOWN`, `RATE_LIMITED`,
  `GUILD_UNAVAILABLE`, `MODULE_ERROR`, `OVERDUE`.
- **trace correlation id** — the interaction's correlation id, the same id joining the
  notice to its log lines, spans, and audit rows.

The merged frame is deliberate: failure, maintenance, and unknown-command all share one
visual grammar, one vocabulary of reason codes, and one correlation discipline. The
buffer-then-notice flow composes with the auto-deferred interaction lifecycle: an overdue
interaction that somehow has neither a final render nor a notice is guaranteed a logged
overdue event by the interaction-timeout watchdog — the renderer's own follow-up alarm fires
at 13 minutes.

### 20.10 How To Verify This Section Against the Code

- The component registry and the id scheme:
  `apps/main/src/interactions/interaction-registry.ts`.
- The renderer, its modes, its notice reason codes, and the follow-up alarm:
  `apps/main/src/rendering/core-renderer.ts` (the ten reason codes and
  `FOLLOWUP_ALARM_MS = 13 * 60 * 1000`).
- The component-v2 builders and the accent token:
  `apps/main/src/shared/utils/components-v2.ts`, `src/shared/constants/colors.ts`
  (`0x5865f2`).

Divergences are recorded in `status/code-reconciliation.json`.

## Contract
- `contracts/rbac.enums.json`
- `contracts/commands.json`
- `contracts/ui-renderer.schema.json`
- `contracts/events.catalog.json`

## Acceptance
```acceptance
- id: ACC-REQ-0020-1
  check: "custom_id encodes `{moduleNamespace}:{handlerKey}:{contextPayload}` and is stateless (no server session)"
  test: tests/unit/custom-id.spec.ts
- id: ACC-REQ-0020-2
  check: "Sensitive component clicks re-authorize at click time"
  test: tests/integration/component-reauth.spec.ts
- id: ACC-REQ-0020-3
  check: "Autocomplete answers within the 800 ms budget; deferred interactions are covered by the 13-minute watchdog"
  test: tests/integration/interaction-timers.spec.ts
```

## Edges (-> blueprint)
- SPEC-04-REQUEST-LAYER -> SPEC-02-ARCHITECTURE (dispatch enters the core runtime)
- SPEC-04-REQUEST-LAYER#RENDERER -> documentation/ (every surface is renderer-issued)

## Named entities (from the original reference)

The original reference named these entities in this section. They are preserved here so no identifier is lost in the restructure.

**classes, interfaces & symbols:** `ComponentHandler`, `ConfirmationHelper`, `ModalSubmitInteraction`, `PaginationHelper`, `Standardizing`

**config/env constants:** `APPLICATION_COMMAND_AUTOCOMPLETE_RESULT`, `AUTOCOMPLETE_BUDGET_MS`

**events & identifiers:** `AutocompleteHandler.`, `IDs.`
