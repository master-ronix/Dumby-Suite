# Runbook — Command-Permission Authorization (instant command hiding)

**Authority:** `docs/spec/request-layer/command-framework-routing-engine.md` §17.6/§17.7,
`docs/spec/operations/multi-identity-operation-twill-personas.md`.
**Scope:** how to make a module disable hide its commands **instantly** through Discord's own
integration permissions, instead of waiting for the queued batch push. This is the "primary" half of a
disable; the BCCM queue is the "eventual" half and needs nothing from you.

This runbook is application-local and non-normative; the corpus under `docs/` is the authority.

## Why this is needed at all

A disable has exactly two halves:

1. **Instant** — a `@everyone` deny override written on each of the module's commands through
   Discord's *Edit Application Command Permissions* endpoint (Server Settings → Integrations). The
   command stays registered but is hidden from members immediately.
2. **Eventual** — the queued BCCM batch push removes the commands. §17.7: queued at T₀, prepare window
   from T₀+12h, push at the T₀+24h outer ceiling.

Half 1 needs a **user OAuth2 Bearer token** carrying `applications.commands.permissions.update`. A
**bot** token is rejected by that endpoint (`Bots cannot use this endpoint`), which is why a bot
install alone cannot do it. Without such a token the disable still completes — state is written and
the queue is fed — but nothing hides instantly, and the command answers `MODULE_DISABLED` until the
batch push lands.

The bot cannot mint that token. Someone with **Manage Server** in the guild authorizes it once.

## What you need before starting

| Setting | Purpose |
|---|---|
| `OAUTH_CLIENT_ID` | the application being authorized (the internal profile's application) |
| `OAUTH_CLIENT_SECRET` | exchanged for the token at the callback |
| `OAUTH_REDIRECT_URI` | must match the portal registration **exactly** |
| `ENCRYPTION_ROOT_KEY` | seals the access/refresh token at rest |
| a public host | the callback is a browser redirect, so the app must be reachable at its own URL |

## Step 1 — register the redirect URI

Discord Developer Portal → your application → **OAuth2** → **Redirects** → add the value of
`OAUTH_REDIRECT_URI` verbatim. Two callback paths are accepted by the app — `/auth/callback` and the
older `/oauth/callback` — but register **exactly** the one your env names. A mismatch fails the
exchange with `oauth2-callback-failed`; Discord exposes no API to read the registered list, so this is
the one step that cannot be checked from the running app.

You do **not** configure scopes in the portal. The app requests them itself:
`identify`, `guilds`, `applications.commands.permissions.update`.

## Step 2 — authorize the internal profile

Open this in a browser, signed in as an account with **Manage Server** in the guild:

```
https://<your-host>/auth/authorize?guild=<GUILD_ID>
```

**Do not add `bot=1`.** That is the separate *install* flow (`bot applications.commands` plus the
permissions bitfield); it produces no user token and cannot hide commands.

On approval the callback:

1. exchanges the code for an access + refresh token;
2. checks the account can manage that guild — otherwise it returns **403 Not permitted** and stores
   nothing;
3. seals both tokens and writes a row to `command_permission_tokens` keyed by
   `(applicationId, guildId)`, with `scope = applications.commands.permissions.update`;
4. renders **Connected — "Module disables will now hide their commands instantly."**

## Step 3 — verify it took

```sql
select "applicationId", "guildId", status, scope, "accessTokenExpiresAt", "lastRefreshedAt"
from command_permission_tokens;
```

Expect `status = active` and `scope = applications.commands.permissions.update`. In the log, expect
`oauth2-connected`. Then disable a module and check the outcome line:

```
module-command-access-set applied=1 removed=0
```

`applied=1` is the instant override working. `applied=0` means no usable token was found — go back to
Step 1 and check the redirect URI, then Step 2 again.

## Step 4 — each persona needs her own authorization

The endpoint and the token are **per application**. A persona's module is hidden through *her*
application, so she needs her own row:

```
https://<your-host>/auth/authorize?guild=<GUILD_ID>&app=<HER_APPLICATION_ID>
```

Two prerequisites for that URL to work:

- her **OAuth client secret** must be registered (Twill registration, `oauthClientSecret` — required
  since `UR-20261021-095`), otherwise the app answers *"That persona has no OAuth2 client secret
  registered"*;
- **her own** application must have **her** redirect URI registered in her developer portal.

Without her row, her modules fall back to state + queue: correct, but not instant.

## Token lifetime

Access tokens expire. `refreshDue()` runs at bootstrap and refreshes rows that carry a refresh token;
`lastRefreshedAt` records it. `resolveAccessToken` returns nothing for a row that is `revoked`,
`expired`, or unreadable — in which case a disable degrades to state + queue rather than failing.

## The stored token is the mechanism; the env var is a legacy hatch

The supported path is the **store**: `command_permission_tokens`, one row per (application, guild),
holding a SEALED access and refresh token, refreshed by a scheduled job every six hours. Nothing about
that is per-environment or per-restart — a profile that has been connected stays connected.

Precedence, in `setModuleCommandAccess`:

1. `commandPermissionTokens.resolveAccessToken(application, guild)` — the stored token. If it has
   lapsed since the last scheduled refresh it is refreshed **on demand, once**, and re-read; a healthy
   store therefore never behaves like a missing one.
2. `DISCORD_COMMAND_PERMISSIONS_TOKEN` — only for the **internal profile**, only when no stored token
   exists. It is static, unrefreshed, cannot serve a persona, and must be rotated by hand. Whenever it
   is actually used the log says so: `command-access-env-fallback-used`.

If you see `command-access-env-fallback-used`, the connect flow has not been run for that application —
and that variable is doing the work. Run Step 2 and it stops.

The boot log answers the same question before you touch anything:
`command-access-instant-disable envFallback=<true|false> storedApplications=[…]`.

## What this runbook does not fix

- **The queued removal still takes up to 24h** (§17.7 DIAGRAM 17-A). That is by design: Discord caps
  guild-command creation at 200/day, and batching is what conserves it.
- **A disable no longer deletes commands as a fallback.** `UR-20261026-097` removed that third path,
  which had been de-registering commands instantly and producing `UNKNOWN_COMMAND` instead of
  `MODULE_DISABLED`.
