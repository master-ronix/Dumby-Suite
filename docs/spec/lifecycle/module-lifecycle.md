---
id: SPEC-07-LIFECYCLE-0044
title: 44. Module Lifecycle & Ownership
kind: spec
status: normative
version: 5.0.0
authority_scope: [07-lifecycle]
anchors: []
contracts: []
acceptance: [ACC-LIFE-0044-1]
owners: [framework-maintainers]
last_verified_commit: null
review_state: pending-evidence
---

## 44. Module Lifecycle & Ownership

**Status:** [SPEC]

This is the current behaviour, read from the code rather than from intent. Where the two differ, the
gap is named at the end rather than smoothed over.

## 1. The actors

| Actor | What it is | Identity |
| --- | --- | --- |
| **Profile** | every actor in the platform. The **internal profile** is the platform's own; **persona profiles** arrive through Twill registration. There is no "main bot" versus "persona" as kinds of thing | a row in `persona_identities`, carrying `discordApplicationId` and a sealed bot token |
| **Internal profile** | the profile the platform itself runs | not a row in `persona_identities`; identified in code as the literal `'main'` |
| **Guild** | a Discord server. Standard and marketplace modules are scoped to one | `guildId` |
| **Application** | a Discord application — one per profile. Credentials, commands and the instant-disable token are all per application | `discordApplicationId` |

**Scopes.** Core and Admin modules are **global** — loaded for everyone, never guild-scoped.
Standard and Marketplace modules are **guild-scoped** — a guild has a row per module, and one profile
holds each.

## 2. The tiers

| Tier | Scope | Default | Who may hold it |
| --- | --- | --- | --- |
| `admin` | global | always on | nobody — it is not a profile's, and the manifest must declare `devGuildOnly` |
| `core` | global | always on | nobody — shared, and the row is never consulted |
| `standard` | guild | **on** (`defaultEnabledForTier` returns true for everything except marketplace) | one profile per guild, first to install |
| `marketplace` | guild | **off** | one profile per guild, first to install; the manifest must declare `marketplaceCategory` |

`defaultEnabledForTier(tier)` is `tier !== 'marketplace'`. That single line is why a standard module
nobody has touched reads as enabled, and a marketplace one does not.

## 3. The factors, and what each one does

| Factor | Read from | Effect |
| --- | --- | --- |
| **Tier** | the manifest, in memory | decides the scope (global/guild), the default, and whether the module can be a profile's at all |
| **Guild enable state** | `guild_module_states.enabled` + `.state` | whether the module is ON in that guild. `enabled === true && state === 'active'` is the only reading that counts as enabled |
| **Enabling profile** | `guild_module_states.enabledBy` | **who turned it on.** This is the fact ownership is decided from |
| **Claim (binding)** | `guild_persona_bindings` (live rows) | a profile's claim on a guild-scoped module |
| **Registration status** | `persona_identities.status` | whether a profile is `active`; a non-active profile is not hosted |
| **Build state** | `builds` (`version`, `validationStatus`, `promotedAt`) | the marketplace side: whether a build exists and passed validation |
| **Command-permission token** | the sealed store, per (application, guild) | whether a profile can hide a command **instantly**; without it only the BCCM de-registration applies |

## 4. The two rules everything else follows

### Enablement — is the module ON in this guild?

`isModuleEnabledForGuild(guildId, moduleId)`:

1. `guildId === null` (a DM) → **false**.
2. tier is `core` or `admin` → **true**, without reading a row. These carry no disable mechanism.
3. otherwise read the row:
   - no row → `defaultEnabledForTier(tier)` — on for standard, off for marketplace;
   - row → `enabled === true && state === 'active'`.

A failed read **fails open** for events and **fails closed** for command dispatch. That asymmetry is
deliberate: refusing a command is recoverable, running one for a disabled guild is not.

### Ownership — whose is it?

`resolveCommandOwner(guildId, moduleSlug)`:

1. tier is `core` or `admin` → **`'shared'`**. Shared tiers belong to nobody, and answering otherwise
   is what made core modules look like a profile's.
2. read the guild's enablement:
   - **disabled** → **undefined.** Held by nobody, whatever a binding still says.
   - enabled → continue.
3. ask **who enabled it** (`enabledBy`):
   - a profile id → **that profile**;
   - `'main'` → **the internal profile**.
4. no enabler recorded (a row written before the column existed):
   - a live binding → that profile;
   - otherwise → **`'main'`**.

Step 3 is the fix for a long-running defect: the read could previously ask only *"is it enabled?"* and
then assume the internal profile, so a persona's own install came back as the internal profile's.

## 5. The workflows, exactly

### Install / enable

`installModule(moduleId, guildId, actorId, applicationId)`:

1. resolve the owner (§4). If someone else holds it → **refuse**, `PersonaOccupiedError`.
2. no owner → clear any binding still on record. The install only reaches here when the module is
   available, so a binding present now belongs to a claim that no longer holds.
3. a **persona** installing an unclaimed module → **claim it** (write the binding).
4. write the state: `enabled: true`, `state: 'active'`, **`enabledBy` = the acting profile**.
5. `setModuleCommandAccess(..., true)` — the instant half, if a token exists for that application.
6. enqueue the BCCM command change, push it, **then restart the profiles hosting that guild**.

### Disable / uninstall

`uninstallModule(moduleId, guildId, actorId, applicationId)`:

1. write the state: `enabled: false`, `state: 'disabled'`, **`enabledBy: null`**.
2. **release the claim** — `unbindModule`.
3. `setModuleCommandAccess(..., false)`.
4. enqueue the BCCM deregistration, push it.
5. **restart the profiles hosting that guild.**

Steps 2 and 5 are both load-bearing. Without 2 the binding outlives the install and reads as live
again the moment anything enables the module; without 5 the profile keeps serving the command set it
registered at boot.

### Registration — what a profile actually offers

`modulesBoundTo(personaId)` is what the runtime builds the profile's command registry from:

1. read the profile's bindings;
2. for each, ask `resolveCommandOwner` — **the same read every other surface asks**;
3. the owner matches → keep it; otherwise **release the binding** and log
   `persona-binding-reconciled`;
4. the surviving list is what the profile registers.

Before this, the runtime read the **raw bindings** while everything else read `resolveCommandOwner`.
Two sources for one fact: a module the ownership read had given to one profile was still registered by
another, and **both bots answered it**.

### Termination

- `stopPersona` — destroy the client, deregister nothing (the BCCM owns that).
- `reloadPersona` — stop, rebuild the registry from `modulesBoundTo`, start.
- A module change restarts every profile bound to that guild.
- A credential rotation restarts the profile, because the runtime holds the **previous** token in a
  live gateway connection.

### The entry points, and how they agree

| Entry point | What it calls |
| --- | --- |
| The in-app control (the module card's trash) | `uninstallModule` |
| `DELETE /twill/personas/:id/bindings/:slug` | **the same `uninstallModule`**, injected as a dependency |
| `POST /twill/personas/:id/...` (registration, rotation) | `reloadPersona` |
| The deployer | `resolveCommandOwner` per module, to decide what the internal profile registers |

## 6. The practical cases

| # | Situation | What happens |
| --- | --- | --- |
| 1 | Standard module, nobody has touched it | reads **enabled** (tier default). Owner: no binding, no enabler → `'main'` |
| 2 | Internal profile installs it | `enabledBy = 'main'`; owner `'main'`. No binding — the internal profile does not claim |
| 3 | Persona installs an unclaimed one | binding written, `enabledBy = her id`; owner **her** |
| 4 | The other profile tries to install | **refused** — `PersonaOccupiedError` |
| 5 | Persona disables her own | state disabled, `enabledBy` nulled, **binding released**. Now held by nobody |
| 6 | Internal profile installs it after that | available; `enabledBy = 'main'`; owner `'main'` |
| 7 | A core or admin module | `'shared'` always — never a profile's, regardless of any row |
| 8 | Marketplace module, no row | reads **disabled** (tier default). Installing is what turns it on |
| 9 | A binding exists but the module is disabled | owner **undefined**. The claim does not survive the disable |
| 10 | Two profiles both answer a command | a defect: the runtime read raw bindings while the rest read the owner. Fixed; the readout shows it if it recurs |
| 11 | No command-permission token for a profile | the instant hide/restrict is **inert**; the BCCM deregistration still applies |
| 12 | A row written before `enabledBy` existed | falls back to the binding, then to `'main'` — never a guess |

## 7. How to see it

`GET /twill/guilds/:guildId/module-chain` reports every module's whole chain raw: tier, state row,
enabling profile, binding, resolved owner, build state, the holder's registration status, and whether
the holder can disable instantly. It **decides nothing** — the disagreement between rows is the answer.

## 8. The gaps, stated rather than smoothed

- **A profile going online and offline on a short loop.** The runtime has no timer, so something is
  restarting it. The strongest suspect is the restart a module change now performs, if a module change
  is itself being triggered repeatedly. Not yet confirmed — it needs the runtime log.
- **A persona's instant disable needs a user OAuth2 token**, per application, minted through
  `/auth/authorize?app=<her application id>`. Until that is done for her, only the BCCM applies.
- **`enabledBy` is a single column.** If a module's enablement is ever legitimately shared between
  profiles, this model does not express it — the model is one holder per guild-scoped module.

## Acceptance
```acceptance
- id: ACC-LIFE-0044-1
  check: "Every guild-scoped module resolves to at most ONE holder per guild; a disabled module resolves to none; core and admin resolve to 'shared'; and the runtime registers a profile's commands from the same ownership read every other surface uses"
```
