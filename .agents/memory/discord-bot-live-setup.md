---
name: Connecting a live Discord bot on Replit
description: Environment-level constraints when wiring a real Discord bot (gateway login + slash commands) into a Replit project — connector limitations, Redis hosting, port planning.
---

## Discord's Replit connector cannot issue a bot token
The Discord *connector* available via `searchIntegrations`/`ProposeIntegration` is OAuth2/user-proxy
only — it authenticates as a signed-in Discord user and proxies REST calls (read profile, list
channels/messages, etc. via `connectors.proxy("discord", ...)`).

**Why:** A gateway-connected bot (persistent WebSocket login, slash-command registration) needs its
own Application + Bot created in the Discord Developer Portal by the project owner. There is no API
to mint that from an OAuth-authorized user token, so the connector fundamentally can't produce one.

**How to apply:** When a project needs a real bot identity (not just "read my Discord data as me"),
don't propose the Discord connector — go straight to `requestSecrets` for `BOT_TOKEN` (plus
`APPLICATION_ID` if anything needs it as config). Point the user to: Developer Portal → Bot tab →
Reset Token; General Information tab → Application ID. Discord's own OAuth2 → URL Generator (scopes
`bot` + `applications.commands`) builds the server-invite link for them — no need to hand-construct
it from the application ID. A guild's slash commands propagate instantly when registered per-guild,
vs. up to ~1 hour for global registration, so ask for a development guild ID for fast iteration/testing.

## Redis has no Replit-managed integration or connector
Install the `redis` Nix system dependency (`installSystemDependencies(["redis"])`) and run it as its
own process: `redis-server --port 6379 --bind 127.0.0.1 --save '' --appendonly no` via
`configureWorkflow` (`outputType: "console"`, no `waitForPort` — 6379 isn't in the workflow-supported
port list and Redis isn't HTTP anyway). Confirm readiness with `redis-cli -h 127.0.0.1 -p 6379 ping`
instead of waiting on the port.

## Check for port collisions before wiring a non-artifact backend workflow
Existing `artifacts/*` services in the same project already bind ports (a web service is commonly on
8080, a Vite/mockup preview on 8081, etc). A second backend process with its own hardcoded default
ports (health/metrics/API listeners typical of an imported framework) will crash with `EADDRINUSE`
against those — and if the conflicting `.listen()` call happens late in a multi-stage boot sequence,
everything before it (DB, cache, gateway login) can succeed first, masking the real cause in a
truncated log.

**How to apply:** Before assigning ports to a new non-artifact workflow, run
`lsof -iTCP -sTCP:LISTEN -P -n` (or `ss -ltnp`) to see everything already bound in the container, and
remap the new process's ports (via its own env vars, not by hand-editing `.replit`) to values that
are actually free — preferring the workflow-supported list (3000-3003, 4200, 5000, 5173, 6000, 6800,
8000, 8008, 8080, 8099, 9000) for whichever single port needs external `waitForPort` health-checking.
