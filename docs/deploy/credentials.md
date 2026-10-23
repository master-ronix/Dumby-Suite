# Credentials and tokens

Dumby Suite is a backend SaaS and marketplace platform. Every actor in it is a **PROFILE**, and each
profile is a Discord **application** with its own application id.

- The **internal profile** is the platform's own — it is one profile among many, not a privileged
  category, and it exists so the platform has a bot of its own.
- **Persona profiles** arrive through **Twill registration**, bringing their own bot token and client
  secret, which the platform seals and then never reads again in the clear.

There is no "main bot" and there is no "persona" as distinct kinds of thing. There are profiles, and
the code and the docs should say so. Where an older comment says otherwise, the comment is stale.

This document is the inventory: what each credential is, who it belongs to, where it lives, what it
authorises, and what a leak would reach. It contains **names only** — never a value.

## The inventory

| # | Credential | Owner | Where it lives | What it authorises | Blast radius if leaked |
| --- | --- | --- | --- | --- | --- |
| 1 | `BOT_TOKEN` | the internal profile | environment (plain) | Login and REST as the internal profile's application | Full control of the internal profile: any guild it is in, any command it offers |
| 2 | persona bot token | one persona profile each | `persona_identities.botTokenSealed`, sealed with `ENCRYPTION_ROOT_KEY`; a digest is kept for lookup | Login and REST as **that** profile's application | Full control of that profile — its guilds, its commands, its presence |
| 3 | `OAUTH_CLIENT_ID` / `OAUTH_CLIENT_SECRET` / `OAUTH_REDIRECT_URI` | the internal profile | environment (plain) | The OAuth2 code exchange — the invite-with-OAuth flow, and minting user tokens for the internal profile | Can mint user tokens for the internal profile; can impersonate a consenting user within the granted scopes |
| 4 | `DISCORD_COMMAND_PERMISSIONS_TOKEN` | the internal profile | environment (plain) | `applications.commands.permissions.update` for the internal profile — the instant hide/restrict of a command in Server Settings → Integrations | Can hide or restrict any command of the internal profile in any guild |
| 5 | per-application command-permission token | **any** profile | the sealed credential store, refreshed before expiry; one row per application | The same scope, for **that** application only | Can hide or restrict that profile's commands in the guilds it is in |
| 6 | `ENCRYPTION_ROOT_KEY` | the platform | environment (plain); must decode to exactly 32 bytes | Unsealing — **every** sealed credential: every profile's bot token, every command-permission token | **Catastrophic.** It unseals the whole fleet's credentials. It is the single most valuable secret in the deployment |
| 7 | `INTERNAL_API_KEY` | the platform | environment (plain), minimum 32 characters | The internal service APIs — Swastik, Power Engine, CLAI, the Credentials Service — including module deployment and credential issuance | Can deploy a module, issue a credential, and drive the internal services |
| 8 | `BUILD_SIGNING_KEY_ID` / `BUILD_SIGNING_PRIVATE_KEY` / `BUILD_SIGNING_PUBLIC_KEY` | the platform | environment (plain) | Module provenance — the loader trusts a signed sidecar and a matching `builds` row | Can forge a module the loader will accept as first-party |
| 9 | `DATABASE_URL` (+ `DATABASE_REPLICA_URLS`) | the platform | environment (plain) | Every table: guild state, module state, persona identities, the sealed credential store | Every guild's configuration, and every sealed credential it can copy |
| 10 | `REDIS_URL` / `QUEUE_REDIS_URL` | the platform | environment (plain) | The cache and the command queue (BCCM) | Cache poisoning; injecting or dropping queued command changes |
| 11 | Twill registrant's bot token + client secret | the registrant | submitted over HTTP, verified against the application id, then sealed; a digest is kept | Registering a persona profile for that application | — (it is the registrant's own credential, and the platform seals it rather than storing it in the clear) |

## How a credential is protected

Two tiers, and the difference matters:

- **Platform credentials live in the environment, in plain text.** That is deliberate: they must be
  readable at boot with nothing else available, and the platform cannot seal the key that unseals
  everything. Their protection is the platform's — a private repository, a private deployment, and an
  environment only the operator can read.
- **Per-profile credentials are sealed at rest.** A persona's bot token and a command-permission
  token are sealed with `ENCRYPTION_ROOT_KEY` before they are written, and read only when the platform
  needs to act as that profile. A **digest** is stored alongside so a token can be recognised without
  being unsealed.

## The one thing that cannot be a bot token

`applications.commands.permissions.update` — the instant command hide/restrict — **rejects a bot
token**. Discord answers `403 Bots cannot use this endpoint`, and a bot cannot mint this token for
itself. It must be a **user OAuth2 token** the operator provisions per application. Consequences:

- Each profile needs its own, minted through that profile's own authorisation. One value cannot serve
  the fleet, because the endpoint is per application.
- The environment variable exists so the **internal profile** has one without the dashboard flow. It
  is a fallback for that profile alone; a persona profile has no equivalent unless a token was stored
  for her application.
- When no token is available the module disable is **not** inert: the state is written and the BCCM
  deregistration is enqueued. Only the instant half is skipped, and the boot log reports it —
  `command-access-instant-disable { armed }`.

## Rotation

| Credential | Rotation |
| --- | --- |
| profile bot token | Reset in the Discord developer portal, then re-register or re-seal. A persona's token is submitted through Twill again; the previous sealed value is replaced |
| command-permission token | Re-authorise the application; the store refreshes on its own until the grant is revoked, at which point the refresh fails and the token must be minted again |
| `ENCRYPTION_ROOT_KEY` | Requires re-sealing every sealed credential. Not a drop-in replacement |
| `INTERNAL_API_KEY` | Change it on every service that reads it, together — they authenticate to each other with it |
| `BOT_TOKEN`, OAuth pair, database and cache URLs | Reset at the source and redeploy |

## What this document is not

It is not a secret store, and it deliberately carries no values. If you need to know whether a given
credential is configured, read the boot log rather than this file.
