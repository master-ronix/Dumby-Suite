# Runbook — Live ownership test (module ↔ command, two profiles)

**Authority:** `docs/spec/request-layer/command-framework-routing-engine.md` §17.6/§17.7,
`docs/spec/modules/module-tiers-lifecycle.md`, `docs/spec/request-layer/division-5-browse-command-marketplace-module.md`.
**Scope:** what to look at, what "correct" looks like, and which log lines settle it — after a change
to the ownership reads or the command path.

This runbook is application-local and non-normative; the corpus under `docs/` is the authority.

## The one rule everything follows

A guild-scoped module (standard / marketplace) belongs to **one profile per server**, and its commands
follow it. Core and admin are **shared** — every profile answers them.

So for `hello-world` in one guild there are exactly three possible states, and every surface must
agree about which one you are in:

| State | Who holds it | `/modules` | `/dashboard` | `/health` (standard-tier) | `/browse` |
|---|---|---|---|---|---|
| **Unheld + disabled** | nobody | not listed, both | no page, both | 0, both | listed as **previously installed** |
| **Held by main** | `main` | listed on main only | page on main only | main 1, persona 0 | **occupied by Dumby Profile** on persona; absent from main's list |
| **Held by persona** | her id | listed on her only | page on her only | persona 1, main 0 | **occupied by <her name>** on main; absent from her list |

If any surface disagrees with the row above, the disagreement is a read, not the data — that is what
`agrees` in the boot log exists to tell you.

## Step 1 — read the boot log first, before touching any command

After a restart, one line per guild-scoped module per persona guild:

```
module-state guildId=… moduleId=hello-world tier=standard
  enabledBy=<id|none> binding=<id|none> resolvedOwner=<id|none> agrees=true|false
```

- `agrees=true` — the state row and the binding name the same holder. **The data is right; any
  disagreement you then see on a page is a reader.**
- `agrees=false` — the rows genuinely disagree. Stop and fix the state before reading anything else.
- `resolvedOwner=none` with `enabledBy=none` — nobody holds it (a disabled module resolves to nobody,
  by design; `none` is not `main`).
- `resolvedOwner=main` — the internal profile holds it, whether it installed it or merely enabled it
  first.

## Step 2 — the four surfaces, in this order

Run each as **both** profiles and compare against the table.

1. `/health` — `Standard-tier` count. This is inventory: it must match `/modules`, because both read
   ownership. If `/health` says 0 and `/modules` lists it, that is the runtime-registry read leaking
   back in.
2. `/modules` — the listing is what the profile HOLDS.
3. `/dashboard` — a separate page per held standard module; none for one it does not hold.
4. `/browse` — the install dropdown. The option's description is the tell:
   - `Standard · available` — nobody holds it, this profile may take it.
   - `Standard · previously installed` — the guild disabled it; selecting re-enables it.
   - `Standard · occupied by <name>` — **another** profile holds it. "occupied by Dumby Profile" while
     the main bot neither lists nor draws a page for it is the historical bug: a module nobody held,
     labelled as the internal profile's.

## Step 3 — invoke the command from the profile that does NOT hold it

This is the asymmetry check. Both profiles must tell the same story, in their own voice:

| From | Expected notice | Reason code |
|---|---|---|
| the holder | runs normally | — |
| the other profile, when the command is registered for it | "Not available in this server — another profile in this server holds it…" | `OUT_OF_SCOPE` |
| the other profile, when the command is NOT in its registry | the same `OUT_OF_SCOPE` notice | `OUT_OF_SCOPE` |
| anyone, when the module is switched off | "This module is switched off…" | `MODULE_DISABLED` |
| anyone, for a command that never existed | "That command is not registered or is not available here." | `UNKNOWN_COMMAND` |

`UNKNOWN_COMMAND` for a module another profile holds is **wrong** — it says the command does not
exist when the truth is that it is not yours. A persona's registry is filtered to what she holds, so
her router has to consult the unfiltered registry to tell those two apart.

## Step 4 — the disable path, without touching Discord settings

A disable has two halves, and you can verify **both** from the database and the log — no integration
panel, no manual BCCM test:

**Half 1 — the instant restrict (needs a Bearer token).** On a disable, look for:

```
module-command-access-set applied=<n> removed=<n>
```

- `applied=1 removed=0` — the `@everyone` deny override was written. The command is hidden at once and
  stays registered.
- `applied=0 removed=0` — no usable token, so nothing was hidden instantly. The command stays
  registered and answers `MODULE_DISABLED`. **`removed` must never be non-zero again** — a non-zero
  `removed` means a disable deleted the command instead of restricting it, which is the defect that
  made `/hello` vanish and answer `UNKNOWN_COMMAND`.
- `command-access-token-missing` in the log is the diagnostic for `applied=0`: run the connect flow in
  `command-permission-authorization.md`.

**Half 2 — the queued removal (no token needed).** The disable writes rows to the queue:

```sql
select "guildId", "commandKey", "applicationId", status, "createdAt"
from guild_command_queue
where "guildId" = '<GUILD_ID>' and status = 'pending'
order by "createdAt" desc;
```

One row per command of the module, with `applicationId` = the **owner's** application (the persona's,
or `''` for the main bot). Then, when the batch runs:

```
bccm-batch-push-complete dryRun=false guilds=<n> sent=<n>
```

`guilds=0 sent=0` on a boot with nothing queued is normal. A pending row that survives several cycles
means the push is not reaching that guild — check `applicationId` on the row against the profile you
expected.

The window is §17.7's: queued at T₀, prepare window from T₀+12h, push at the T₀+24h outer ceiling. A
disable's removal is **eventual by design** — Discord caps guild-command creation at 200/day, and the
batch is what conserves it.

**Half 1 and half 2 both revert on a re-enable.** A module toggled twice inside the window used to
leave a pending removal and a pending re-registration in the same batch, and the replay decided the
outcome by row order — so a member who switched the module back on could watch its command disappear.
Now the change that contradicts a queued one **revokes** it:

- on **enable**, any pending `disable` rows for that module's commands are soft-deleted
  (`deletedAt` set) before the `enable` row is written — log line `bccm-queue-revoked`;
- on **disable**, any pending `enable` rows are revoked the same way;
- `pendingEntries` returns rows in `createdAt` order, so even a revocation that failed to write cannot
  make the replay non-deterministic.

Verify with the same query as above: after a re-enable, **no** `disable` row should be `pending` for
those command keys. And on the Discord side, an enable re-writes the `@everyone` permission to allow —
which is the command's default state. Discord publishes no DELETE for command permissions, so "remove
the override" is not an operation that exists; re-writing the default is the restore.

## Step 5 — what each log line means, in one place

| Line | Meaning |
|---|---|
| `module-state … agrees=` | the state row and binding agree (or do not) |
| `command-absent-from-profile-registry … answer=` | a command was missing from a filtered registry and the router explained why |
| `command-scope-owned-elsewhere` | **should no longer appear** — dispatch used to log it and proceed |
| `page-data-owner-read-failed` | the ownership read threw; `/browse` will under-report |
| `resolve-command-owner-enabled-read-failed` | the enablement read threw inside the resolver |
| `module-command-access-set applied= removed=` | half 1 of a disable |
| `bccm-batch-push-complete guilds= sent=` | half 2 |
| `persona-runtime-started … commands=` | her registered command count — it must equal core + what she holds |

## What this runbook does not cover

- **Running the connect flow.** See `command-permission-authorization.md`.
- **Applying the K8s manifests.** Railway is not a cluster; that item stays unverified by design.
- **A profile that is not present in the guild.** Ownership is per guild; a profile with no presence
  answers nothing anywhere.
