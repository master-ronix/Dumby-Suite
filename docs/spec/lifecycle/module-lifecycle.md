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

**The model in one line.** A module's state in a guild is **enable/disable** plus **occupancy** —
*which* profile holds it — and both are decided by **overrides, priority and hierarchy** rather than by
a single flag:

- the **tier** is the outermost override: it decides the scope (global or guild) and the default;
- the **guild's row** is the next: it overrides the tier default, and records *who* turned it on;
- the **claim** is the innermost, and applies only to the guild-scoped tiers;
- and the **hierarchy** is that a shared tier (core, admin) outranks all of it — it is nobody's, always.

Changing an assignment is therefore a **backend state change**, and it costs a **command re-registration
over REST — never a reconnect**. See §5.

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

#### Failure policy — the same read, two stances

A failed read **fails open** for events and **fails closed** for command dispatch. That asymmetry is
deliberate: refusing a command is recoverable, running one for a disabled guild is not.

| Read | On failure | Why |
| --- | --- | --- |
| `isModuleEnabledForGuild` — command dispatch | **fail closed** | a refused command is recoverable; running one for a disabled guild is not |
| `isModuleEnabledForGuild` — event router, queue, scheduler | **fail open** | dropping live work silently is worse than acting on a state we could not read |
| `enabledByForGuild` | **undefined**, and it says so | ownership must never be GUESSED from an unreadable row |
| `resolveCommandOwner` with an unreadable enablement | keeps the binding | two profiles believing they own one module is worse than a claim that lingers |

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

```
if (tier === 'core' || tier === 'admin')      return 'shared';   // global outranks everything
const enabled = await isModuleEnabledForGuild(guildId, moduleId);
if (!enabled)                                  return undefined;  // nobody holds it
if (enabledBy is a profile id)                 return enabledBy;  // the enabler decides
if (enabledBy === 'main')                      return 'main';
if (a live binding exists)                     return binding.personaId;  // legacy rows only
return 'main';
```

The ORDER is the rule. Global tier first; a disabled module second; the recorded enabler third; the
binding is a fallback for rows that predate the column, and only then does an enabled-but-unclaimed
module fall to the internal profile.

### The rows disagreeing: every combination

| Tier | State | `enabledBy` | Binding | Resolved owner |
| --- | --- | --- | --- | --- |
| core / admin | any | any | any | **shared** |
| standard | disabled | any | any | **nobody** |
| standard | active | P1 | P1 | **P1** |
| standard | active | P1 | none | **P1** |
| standard | active | `main` | none | **`main`** |
| standard | active | `main` | P1 | **`main`** — the enabler outranks the binding |
| standard | active | missing | P1 | **P1** — legacy row |
| standard | active | missing | none | **`main`** |
| marketplace | no row | — | — | **nobody** — disabled by default |

The two rows worth reading twice are the ones where the binding and the enabler disagree: **the enabler
wins**, because it is what the guild's state actually recorded. A binding is evidence of a claim; the
enabler is evidence of what happened.

## 5. The workflows, exactly

### Install / enable

`installModule(moduleId, guildId, actorId, applicationId)`:

1. resolve the owner (§4). If someone else holds it → **refuse**, `PersonaOccupiedError`.
2. no owner → clear any binding still on record. The install only reaches here when the module is
   available, so a binding present now belongs to a claim that no longer holds.
3. a **persona** installing an unclaimed module → **claim it** (write the binding).
4. write the state: `enabled: true`, `state: 'active'`, **`enabledBy` = the acting profile**.
5. `setModuleCommandAccess(..., true)` — the instant half, if a token exists for that application.
6. enqueue the BCCM command change, push it, then **refresh the commands** of the profiles whose hold
   on this module changed — a REST call. **No reconnect**: the profile stays online.

### Disable / uninstall

`uninstallModule(moduleId, guildId, actorId, applicationId)`:

1. write the state: `enabled: false`, `state: 'disabled'`, **`enabledBy: null`**.
2. **release the claim** — `unbindModule`.
3. `setModuleCommandAccess(..., false)`.
4. enqueue the BCCM deregistration, push it.
5. **refresh the commands** of the profile that held it — a REST call, no reconnect.

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
- `refreshCommands` — rebuild the registry from `modulesBoundTo`, push the new command set over REST,
  swap the registry the dispatch path reads, re-attach the handler. **The client is never destroyed and
  `login` is never called**, so the profile never goes offline. This is what a module assignment does.
- `reloadPersona` — stop and start. Used only where a new connection is genuinely required: a
  **registration** (there is no client yet) and a **credential rotation** (the live connection holds a
  token that has been replaced).
- `stopPersona` — destroy the client. The BCCM owns the command deregistration.

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

## 7. Worked examples

Each example follows one change from the member's action to every surface that reacts. The reads and
writes named are the ones in §4 and §5; nothing else happens.

### 7.1 The internal profile is added to a guild first, then a persona joins

**Setup.** Guild `G`. No module has been touched. The internal profile is added, then persona `P` is
registered and bound to `G`.

| Step | What happens | Why |
| --- | --- | --- |
| 1 | The internal profile boots and deploys its commands | `resolveCommandOwner(G, 'hello-world')` → no binding, no enabler, enabled by tier default → `'main'`. It registers the module |
| 2 | `P` is registered through Twill | her bot token and OAuth client secret are sealed; `status: 'active'` |
| 3 | `P`'s runtime starts and asks `modulesBoundTo(P)` | for `hello-world`: no binding of hers → nothing to keep. She registers only core |
| 4 | `P` opens `/modules` | the listing filters `heldFlags[i] !== true` first, then enablement. `hello-world` is **not hers** → excluded, even though standard is on by default |

**The point.** "Standard is enabled by default" is a statement about a guild's row, **not** about a
profile's right to hold it. The default decides whether an untouched module is *on*, and an untouched
enabled module is the **internal profile's** — so the persona neither lists it nor registers it, and
cannot take it until it is released. Two different questions, and conflating them is what makes an
operator expect a persona to hold a module the internal profile already has.

### 7.2 The persona is added first, then the internal profile

The mirror of 7.1, and the outcome is the mirror too. `P` disables nothing: she takes a module that is
**unheld**, so `enabledBy` is her id and the binding is hers (§7.3, roles swapped). When the internal
profile's deployer runs it asks `resolveCommandOwner` per module, is told `'main'` for everything
except `hello-world`, and registers that set. `hello-world` is answered by `P` alone.

Note what is **not** how this works: the internal profile does not get `hello-world` "because standard
is enabled by default". A module a persona holds is not hers to take, and the default says nothing
about that.

### 7.3 A persona installs a standard module the internal profile has released

**Setup.** Guild `G`. `hello-world` was enabled by default and is therefore the **internal profile's**
(§7.1). The internal profile disables it, and `P` then selects it from `/browse`.

| Step | Read / write | Value |
| --- | --- | --- |
| 0 | the internal profile disables it | `enabled: false`, `state: 'disabled'`, `enabledBy: null` |
| 1 | `resolveCommandOwner(G, 'hello-world')` | **undefined** — disabled, so unheld |
| 2 | clear any stale binding | none |
| 3 | `bindModuleToPersona` | a binding: `(G, hello-world) → P` |
| 4 | `guild_module_states` upsert | `enabled: true`, `state: 'active'`, **`enabledBy: P`** |
| 5 | `setModuleCommandAccess(..., true)` | the instant hide/restrict, if `P`'s application has a token |
| 6 | BCCM | the command change is queued, then pushed |
| 7 | **restart the profiles hosting `G`** | `P`'s runtime rebuilds from `modulesBoundTo`, which now keeps `hello-world` |

**Why step 0 is required, and this is the part that reads backwards at first.** An untouched standard
module is enabled by the tier default, and an enabled module with no enabler recorded resolves to the
**internal profile**. So a persona cannot take an untouched standard module — it is already the
internal profile's, and her install is refused as occupied. That is the operator's own rule: *whichever
profile is in the guild first holds the standard modules.* The module has to be **released** (disabled,
which nulls the enabler and drops the claim) before another profile may take it.

**And the converse holds too.** If the persona is added first and takes `hello-world` (§7.3 with the
roles swapped), the internal profile's deployer asks `resolveCommandOwner` per module, is told `'main'`
for everything except that one, and registers that set — it does **not** get a standard module a
persona already holds, "default enabled" notwithstanding.

### 7.4 A persona disables her own module

**Setup.** `P` holds `hello-world` (§7.3) and opens the module card, then presses the trash control.

| Step | Read / write | Value |
| --- | --- | --- |
| 1 | `guild_module_states` upsert | `enabled: false`, `state: 'disabled'`, **`enabledBy: null`** |
| 2 | `unbindModule(G, hello-world)` | the binding is released — the claim does not outlive the install |
| 3 | `setModuleCommandAccess(..., false)` | the instant hide, if a token exists |
| 4 | BCCM | deregistration queued and pushed |
| 5 | **restart the profiles hosting `G`** | `P` rebuilds without `hello-world`; she stops answering it |

**After this.** `resolveCommandOwner(G, 'hello-world')` → the module is **disabled** → **nothing**. Held
by nobody. `P`'s `/modules` no longer lists it, and the internal profile can install it.

### 7.5 The internal profile installs what a persona just gave up

Continuing 7.4: the internal profile selects `hello-world`.

| Step | Value |
| --- | --- |
| `resolveCommandOwner` | `undefined` — disabled, so unheld |
| clear a stale binding | **releases `P`'s binding if one somehow survived** — this is the guard that stops a stale claim from reading live the instant this install enables the module |
| claim | not taken — the internal profile does not claim |
| state upsert | `enabled: true`, `state: 'active'`, **`enabledBy: 'main'`** |
| outcome | owner is `'main'`; `P`'s listing excludes it and her runtime does not register it |

**This sequence is the one that was broken for three attempts.** The uninstall released the binding
but the install did not clear one, so a stale binding became live again the moment the install enabled
the module — and the module the internal profile had just installed appeared under the persona.

### 7.6 A Twill unbind

`DELETE /twill/personas/:id/bindings/hello-world`, called by the operator rather than through Discord.

1. the persona is looked up; 404 if unknown;
2. the live binding is looked up; 404 if none;
3. **the same `uninstallModule` the in-app control calls** runs the whole of §7.4 — state, claim,
   instant access, BCCM, restart.

It used to release the binding and stop. The rest of the chain was missing, so her commands stayed
registered and her runtime kept serving them.

### 7.7 A credential rotation

`POST /twill/personas/:id/credentials` with a new bot token.

1. the new token is verified as belonging to **her** application, then sealed; a digest is stored;
2. the old sealed value is replaced;
3. **her runtime restarts.**

Step 3 is not optional: the runtime holds the *previous* token in a live gateway connection. Without
the restart she keeps running on a credential that has been replaced.

### 7.8 A marketplace module

Same shape as §7.3, with three differences: `defaultEnabledForTier('marketplace')` is **false**, so an
untouched marketplace module reads *off*; the manifest must declare a `marketplaceCategory` or tier
validation rejects it; and the marketplace side carries a `builds` row whose `validationStatus` is
visible in the readout.

### 7.9 A core module

`browse`, `dashboard`, `health` and the rest. `resolveCommandOwner` answers **`'shared'` before
anything else is read** — no binding, no row, no enabler changes that. It cannot be disabled (the row
is never consulted for it), it is never a profile's, and it is registered globally rather than
per-guild.

### 7.10 A stale claim, and how it is healed

**Setup.** A binding exists for `hello-world` but the module is disabled — the state left behind by
the old uninstall, which released nothing.

| Surface | What it does | Result |
| --- | --- | --- |
| `resolveCommandOwner` | disabled → **nothing** | the module is free |
| `modulesBoundTo` at boot | for each of her bindings, ask the owner; if it is not her, **release it** and log `persona-binding-reconciled` | the stale binding is gone |
| The module-chain readout | reports the state, the enabler, the binding and the resolved owner **raw** | the disagreement is visible before it is acted on |

The reconciliation is why an operator does not have to repair the database by hand: a binding whose
module is disabled is dropped at the one place bindings are read.

### 7.11 No command-permission token for a profile

**Setup.** `P` holds `hello-world`. No token was ever authorized for her application.

1. the state is written, the binding is taken, the BCCM deregistration is queued and pushed — **all of
   it happens**;
2. only the **instant** hide/restrict is skipped, because it needs a user OAuth2 token for **her**
   application and a bot token is rejected on that endpoint;
3. the readout reports `commandPermissionToken: "missing"` for the module she holds, so the gap is
   visible rather than inferred;
4. the boot reports `command-access-instant-disable { envFallback, storedApplications }` — the
   applications that *do* hold a token.

### 7.12 Two profiles answering the same command

The defect this document exists to make impossible to miss.

**What was wrong.** The runtime built a profile's command set from the **raw bindings**, while the
deployer, `/browse`, the install path and the ownership read all used `resolveCommandOwner`. Two
sources for one fact: a module the ownership read had given to the internal profile was still
registered by the persona, and **both bots answered it**.

**What happens now.** `modulesBoundTo` asks `resolveCommandOwner` — the same read everything else
asks. One holder per guild-scoped module, and every surface agrees on who that is.

**How you would catch a recurrence.** `GET /twill/guilds/:guildId/module-chain`: the `owner` field is
what the system decided, and `state.enabledBy` and `binding.personaId` are the raw inputs. If they
disagree, the readout says so instead of one surface quietly winning.

## 8. How to see it

`GET /twill/guilds/:guildId/module-chain` reports every module's whole chain raw: tier, state row,
enabling profile, binding, resolved owner, build state, the holder's registration status, and whether
the holder can disable instantly. It **decides nothing** — the disagreement between rows is the answer.

## 9. The gaps, stated rather than smoothed

- **A profile going online and offline on a module change — fixed twice over.** It was wrong twice: a
  restart for what is a backend state change, and a restart of EVERY profile in the guild rather than
  the ones affected. A module assignment changes which commands a profile OFFERS; it does not change
  who the profile is or how it connects. It now costs a **REST re-deploy** (`refreshCommands`), scoped
  to the profiles whose ownership of that module moved. **Zero downtime.**
- **A persona's instant disable needs a user OAuth2 token**, per application, minted through
  `/auth/authorize?app=<her application id>`. Until that is done for her, only the BCCM applies.
- **`enabledBy` is a single column.** If a module's enablement is ever legitimately shared between
  profiles, this model does not express it — the model is one holder per guild-scoped module.

## 10. Concurrency, partial failure and recovery

An independent review of this specification asked four questions. Three are answerable from the code;
the fourth was a defect, now fixed.

### 10.1 Two profiles install the same unclaimed module at the same time

**The one-holder invariant is enforced by the database, not by the read.** `guild_persona_bindings` has
a composite primary key on `(guildId, moduleSlug)`, and the bind is an upsert against it:

```
.insert(row).onConflict(['guildId', 'moduleSlug']).merge({ personaId, deletedAt: null })
```

So at most one binding can exist for a guild-scoped module. The claim is written **before** the state,
and the state records `enabledBy` — and `resolveCommandOwner` reads `enabledBy` **first**. Two racers
therefore end with:

| Interleaving | binding | `enabledBy` | resolved owner |
| --- | --- | --- | --- |
| A binds, B binds, A writes state, B writes state | B | B | **B** |
| B binds, A binds, A writes state, B writes state | A | B | **B** |
| A binds, A writes state, B binds, B writes state | B | B | **B** |

The **owner is always the last state writer**, because the state is what the read consults first. The
binding can lag behind it in one interleaving, which is precisely the disagreement §7.10 describes: it
is visible in the readout, and the reconciliation releases it at the next read of bindings. A transient
binding is not a second holder.

**What is not guaranteed:** the two writes are not in one transaction, so between them the rows can
disagree. Nothing reads the binding without going through the owner, so no surface acts on the
disagreement — but an operator reading the raw rows at that instant will see it.

### 10.2 The database write succeeds and the rest does not

The **state row is the authority**; everything after it is derived and recoverable.

| Step | If it fails | Recovery |
| --- | --- | --- |
| state write | nothing else ran | the operator retries; nothing is half-applied |
| BCCM enqueue | the queue is BullMQ on Redis — the job is durable, with `attempts: 5` and exponential backoff | retried automatically |
| BCCM push | the same job is retried; the push is idempotent (a set of command changes per guild) | retried automatically |
| command refresh | the commands are re-deployed from the current state | the next refresh, or a restart, converges |
| runtime restart (registration, rotation only) | the profile comes back on the next boot | boot |

The one ordering that matters is that the state is written **before** the queue, so a crash between
them loses the push, not the fact. A lost push is recoverable — the next module change, or the periodic
batch push, re-derives the command set from the state.

### 10.3 Core and admin cannot be disabled per guild

Correct, and by design. They are **global**: `isModuleEnabledForGuild` returns true without reading a
row, and `resolveCommandOwner` answers `'shared'` before anything else. A guild-level disable for them
would need a **different mechanism**, because there is no per-guild row for the read to consult — and
adding one would break the property that a shared module is nobody's.

### 10.4 The restart loop

Was a defect, twice over: a restart for what is a backend state change, and a restart of every profile
in the guild rather than the ones affected. **Fixed.** A module assignment now re-registers commands
over REST (`refreshCommands`) and **never reconnects**; the restart is reserved for a registration and
a credential rotation, which genuinely need a new connection. See §5 and §9.

## 10. Concurrency, partial failure and recovery

An independent review of this specification asked four questions. Three are answerable from the code;
the fourth was a defect, now fixed.

### 10.1 Two profiles install the same unclaimed module at the same time

**The one-holder invariant is enforced by the database, not by the read.** `guild_persona_bindings` has
a composite primary key on `(guildId, moduleSlug)`, and the bind is an upsert against it:

```
.insert(row).onConflict(['guildId', 'moduleSlug']).merge({ personaId, deletedAt: null })
```

So at most one binding can exist for a guild-scoped module. The claim is written **before** the state,
and the state records `enabledBy` — and `resolveCommandOwner` reads `enabledBy` **first**. Two racers
therefore end with:

| Interleaving | binding | `enabledBy` | resolved owner |
| --- | --- | --- | --- |
| A binds, B binds, A writes state, B writes state | B | B | **B** |
| B binds, A binds, A writes state, B writes state | A | B | **B** |
| A binds, A writes state, B binds, B writes state | B | B | **B** |

The **owner is always the last state writer**, because the state is what the read consults first. The
binding can lag behind it in one interleaving, which is precisely the disagreement §7.10 describes: it
is visible in the readout, and the reconciliation releases it at the next read of bindings. A transient
binding is not a second holder.

**What is not guaranteed:** the two writes are not in one transaction, so between them the rows can
disagree. Nothing reads the binding without going through the owner, so no surface acts on the
disagreement — but an operator reading the raw rows at that instant will see it.

### 10.2 The database write succeeds and the rest does not

The **state row is the authority**; everything after it is derived and recoverable.

| Step | If it fails | Recovery |
| --- | --- | --- |
| state write | nothing else ran | the operator retries; nothing is half-applied |
| BCCM enqueue | the queue is BullMQ on Redis — the job is durable, with `attempts: 5` and exponential backoff | retried automatically |
| BCCM push | the same job is retried; the push is idempotent (a set of command changes per guild) | retried automatically |
| command refresh | the commands are re-deployed from the current state | the next refresh, or a restart, converges |
| runtime restart (registration, rotation only) | the profile comes back on the next boot | boot |

The one ordering that matters is that the state is written **before** the queue, so a crash between
them loses the push, not the fact. A lost push is recoverable — the next module change, or the periodic
batch push, re-derives the command set from the state.

### 10.3 Core and admin cannot be disabled per guild

Correct, and by design. They are **global**: `isModuleEnabledForGuild` returns true without reading a
row, and `resolveCommandOwner` answers `'shared'` before anything else. A guild-level disable for them
would need a **different mechanism**, because there is no per-guild row for the read to consult — and
adding one would break the property that a shared module is nobody's.

### 10.4 The restart loop

Was a defect, twice over: a restart for what is a backend state change, and a restart of every profile
in the guild rather than the ones affected. **Fixed.** A module assignment now re-registers commands
over REST (`refreshCommands`) and **never reconnects**; the restart is reserved for a registration and
a credential rotation, which genuinely need a new connection. See §5 and §9.

## Acceptance
```acceptance
- id: ACC-LIFE-0044-1
  check: "Every guild-scoped module resolves to at most ONE holder per guild; a disabled module resolves to none; core and admin resolve to 'shared'; and the runtime registers a profile's commands from the same ownership read every other surface uses"
```
