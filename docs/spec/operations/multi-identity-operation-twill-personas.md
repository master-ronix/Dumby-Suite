---
id: SPEC-06-OPERATIONS-0035
title: 35. Multi-Identity Operation — Twill & Personas
kind: spec
status: normative
version: 5.0.0
authority_scope: [06-operations]
anchors: [MULTI_IDENTITY_OPERATION_TWILL, THE_TWO_CEILINGS_THAT, WHAT_A_PERSONA_IS, DESIGN_CONSIDERATION_HEAP_DIFF, PERSONA_BINDINGS_WHICH_IDENTITY, COMMAND_VOICE_ALLOCATION_ACROSS, GOVERNANCE, THE_TWILL_CHARTER_FREE, CONTRACT, ACCEPTANCE, EDGES_BLUEPRINT]
contracts: [contracts/errors.json]
acceptance: [ACC-OPS-0035-1]
owners: [framework-maintainers]
last_verified_commit: null
review_state: pending-evidence
---

## 35. Multi-Identity Operation — Twill & Personas

**Status:** [SPEC]

### 35.1 The Two Ceilings That Motivate a Second Identity

```
TABLE 35-A — The two ceilings

100 registered commands per guild per application
    A guild running enough Core/Standard/Marketplace modules can exhaust the budget; the
    command-cosmetics projection check enforces this ceiling but cannot create additional
    budget
One active voice connection per guild per application
    A single bot connection holds at most one concurrent voice-channel connection — a guild
    wanting an audio-playback module and an independent voice-moderation module active
    simultaneously cannot do so under one identity
```

### 35.2 What a Persona Is — and Is Not

A **persona** is not a lighter-weight bot, a feature flag, or a reduced-functionality second
process — it is the identical framework, bootstrapped through the identical eighteen-stage
sequence, running as a genuinely separate Discord application: its own application id, bot
token, branding, and gateway connection, requiring its own separate server invite. The guild
administrator commissioning the persona supplies that application and token themselves
(**bring-your-own-identity**): the guild owns the Discord identity, and Dumby hosts and
operates the instance. One persona serves exactly one server (**single-server-bound**).

**Twill** is the subsystem responsible for a persona's entire lifecycle — registration through
the Twill registration API (ADR-011), branding configuration, deployment, retirement — but a
running persona is simply another instance of the main entrypoint, started against the
commissioning guild's token, sharing the same PostgreSQL primary, Redis instance, and queues.

```
TABLE 35-B — Main bot vs. persona

                       Main bot                    Persona
Discord application id the deployment's primary    a distinct, separately registered
                       identity                     application
Bot token              the primary token           supplied by the commissioning guild
                                                   administrator (bring-your-own-identity),
                                                   stored with identical discipline
Command budget         its own 100-command         an independent, separate 100-command
                       ceiling per guild           ceiling per guild
Voice capacity         one per guild               one per guild, independent of the main
                                                   bot's
Codebase / registry    same codebase               IDENTICAL codebase — never a fork or a
                                                   reduced build
Database / cache /     shared                      shared — same instances
queues
RBAC / permission /    same engine, same source    same engine, same source of truth
guild config           of truth
```

**One identity's fault is contained to that identity.** Because a persona is the same framework under a
different identity, its failure modes have to be scoped the same way its successes are:

- **The interaction handler never throws.** Chat-input commands go to that persona's own router; buttons
  and select menus go to the shared component registry; anything else is ignored. A throw here would
  take a gateway listener down for every identity on the process, so the handler absorbs it.
- **A router that cannot be constructed degrades that persona to components-only.** The persona still
  serves its controls; it stops answering commands. It does not fail to start, and the failure is
  logged.
- **Router configuration has one description.** A persona's router is configured by the same function the
  resident bot's is, so "the framework running again under a different identity" is true of the wiring
  and not only of the boot sequence.

### 35.3 Persona Bindings — Which Identity Runs What

A guild admin configures **persona bindings**: a mapping, stored alongside the per-guild module
state, from a specific module to the identity (main bot or a named persona) that registers and
dispatches that module's commands and event handlers for this guild. The binding table is keyed
by `(guildId, moduleSlug)` with a unique constraint making exactly one live binding per pair,
and the persona identities table carries each persona's Discord application id; the binding
service resolves dispatch by exactly these columns.

Bindings persist in a real repository — rows read and written through a typed repository
against PostgreSQL, never an in-memory mock. The bind is **locked while live**: a bind request
naming a different persona for an already-bound pair is refused with an ephemeral "occupied by
another persona" notice, and only an explicit unbind (or the module's disable) releases the
lock. A persona process boots against its own persona-id environment variable; the binding
service is constructed at bootstrap alongside it; and at dispatch the "occupied by another
persona" gate holds — a command key already registered by one persona is rejected for a
different persona rather than silently overridden.

```
DIAGRAM 35-A — Persona binding at dispatch time

a gateway event/interaction arrives at persona P's own gateway connection
  → the command router and event router resolve exactly as for the main bot
  → the persona binding determined WHICH commands/handlers were registered against P's
    application
  → once an interaction lands on P's connection, dispatch proceeds through the identical
    pipeline
```

### 35.4 Command & Voice Allocation Across Personas

Command deployment is computed per identity: the main bot's deployer registers only the modules
bound to the main bot for that guild, and a persona's own deployer registers only the modules
bound to it. The two command budgets are genuinely independent 100-command ceilings — a guild
using both has up to 200 available slots. Voice-connection allocation is identical: whichever
identity a voice-dependent module is bound to uses that identity's single per-guild voice
connection.

Command cosmetics are scoped the same way. The Bot Command Cosmetics for Marketplace (BCCM)
state — a command's rename, its enabled/disabled override, its pending-change queue, and its
per-guild daily-create counter — is keyed by the **acting application**, not by the guild alone,
so a rename the main bot applies and one a persona applies in the same guild never collide on a
shared key. The main bot's rows carry the empty application scope (every pre-existing row is
unchanged); a persona's rows carry its own application id. Each identity runs its **own** BCCM
batch push against its own application scope, so a rename a persona queues through `/queue`
reaches Discord without the main bot's push — which deliberately ignores the persona's scope —
ever touching it.

### 35.5 Governance

Persona registration runs through the **Twill registration API**: the guild admin registers the
Discord application they own; the API validates the application's existence and the registrar's
authority; and the resulting persona is bound to that one guild (ADR-011). The host's side —
provisioning the persona's process, secrets, and quota against shared infrastructure — is
reserved to process owners, exercised through the same owner-gated surface as every
infrastructure act. A guild admin's authority covers their persona's bindings, branding, DM
posture, and retirement — never another guild's.

### 35.6 The Twill Charter — Free Default, Explicit Sunset

Personas run under a **free charter**: a guild commissions a persona, supplies its own
application and token, and pays nothing to the host. The free default is the only charter the
current specification describes, and no monetization wiring exists for Twill (the monetization
scaffold stays empty). The charter carries an **explicit sunset condition** (ADR-008): the free
default ends when the hosting cost of persona capacity stops being incidental — concretely,
when persona fleet capacity requires dedicated infrastructure beyond the shared deployment, or
when any per-persona cost line becomes measurable in the host's accounting, whichever comes
first. Existing single-server-bound personas are honored under an open grandfathering decision.

### 35.7 How To Verify This Section Against the Code

- The persona binding service and repository:
  `apps/main/src/personas/persona-command-binding.service.ts`, `src/personas/persona.repository.ts`.
- The persona tables: `apps/main/src/db/migrations/20260101000020_create_persona_identities.ts`,
  `..._create_guild_persona_bindings.ts`.
- The persona entrypoint: `apps/main/src/entry/twill.ts`.

Divergences are recorded in `status/code-reconciliation.json`.

### 35.8 The Registration & Management Surface

The Twill API is the **only** surface that creates or reconfigures a persona. No Discord-facing command
does either. It is served by the API process and gated by `TWILL_ROUTES_ON_API`; the registrar registry
below it is what makes a registration possible at all.

**Credential gating is the precondition, not a feature.** A registration proves the applicant holds the
application — by presenting its bot token to `verifyApplicationOwnership` — before anything is created.
This is the operator's rule (*"registration of persona via twill must only be done using sensitive
credentials"*) and it is recorded here so a later reader does not relax it.

| Method | Path | Purpose |
|---|---|---|
| `POST` | `/twill/personas/register` | Register a persona against a proven application |
| `GET` | `/twill/personas` | Every persona, identity only. A revoked persona is absent: revocation is a soft delete |
| `GET` | `/twill/personas/:personaId` | One persona's detail |
| `PATCH` | `/twill/personas/:personaId` | Update the persona's presentation — presence, status quote, accent |
| `DELETE` | `/twill/personas/:personaId` | Revoke. Soft delete; the row survives, the persona stops serving |
| `POST` | `/twill/personas/:personaId/credentials` | Rotate the sealed credentials |
| `POST` | `/twill/personas/:personaId/rebind` | Change the one guild the persona is bound to |
| `POST` | `/twill/personas/:personaId/reload` | Restart that persona alone — never the process |
| `GET` | `/twill/personas/:personaId/status` | Presence and runtime state |
| `GET` | `/twill/personas/:personaId/charter` | The charter status — free default, explicit sunset (ADR-008) |
| `POST` | `/twill/personas/:personaId/bindings` | Bind a module to the persona |
| `DELETE` | `/twill/personas/:personaId/bindings/:moduleSlug` | Release a binding |
| `GET` | `/twill/registrars` | The registrar registry — who may register which application |
| `POST` | `/twill/registrars` | Grant a registrar |
| `DELETE` | `/twill/registrars/:authority/:applicationId` | Withdraw a grant |
| `GET` | `/twill/guilds/:guildId/module-chain` | The raw ownership chain for every module in a guild — tier, state row, enabling profile, binding, resolved owner (§44) |

**A mutation never requires a process restart.** A binding change, a rebind or a credential rotation
re-registers over REST; the reload route restarts one persona's runtime, which is the only operation
that needs a new connection.

## Contract
- `contracts/errors.json`

## Acceptance
```acceptance
- id: ACC-OPS-0035-1
  check: "A Twill persona is bring-your-own-identity and bound to exactly one server; the free charter carries an explicit sunset condition"
  test: tests/integration/twill.spec.ts
```

## Edges (-> blueprint)
- SPEC-06-OPERATIONS -> all departments (observability + errors are cross-cutting)
- SPEC-06-OPERATIONS#SECURITY -> SPEC/00-GOVERNANCE (secrets, ban registry enforcement)

## Named entities

**classes, interfaces & symbols:** `discordApplicationId`, `PERSONA_ID`
