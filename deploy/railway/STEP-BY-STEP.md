# Dumby on Railway — step-by-step

## The one rule for variables
ALL variables live in exactly ONE place: Railway -> your project -> the
`@workspace/dumby` service -> **Variables** tab.
- **+ New Variable**: add one (a name box and a value box).
- **Raw Editor**: paste many `KEY=VALUE` lines at once.

Build / Deploy / Network are settings, not variables. Nothing else holds config.

---

## Step 0 — Confirm the bot is online
Deploy tab -> look for `discord-client-ready`. If it is absent, the bot is not
connected; see Troubleshooting at the bottom. Do the optional steps only once the
bot is online.

---

## Step 1 — Public domain (do this before OAuth)
Railway -> `@workspace/dumby` -> **Network** -> *Generate Domain*.
Target port: **8080**. Copy the URL, e.g. `https://dumby-production.up.railway.app`.

---

## Step 2 — Dashboard / MDIS OAuth (client id + secret)
Where the values come from: **Discord Developer Portal -> your app -> OAuth2**.

In Railway -> Variables, add three variables:
```
OAUTH_CLIENT_ID=<Client ID>
OAUTH_CLIENT_SECRET=<Client Secret>          # OAuth2 -> Reset Secret
OAUTH_REDIRECT_URI=https://<your-domain>/oauth/callback
```
Then in the Developer Portal -> OAuth2 -> **Redirects** -> add the SAME
`https://<your-domain>/oauth/callback` -> Save.

Redeploy. Success = the Deploy log shows `oauth2-client-state configured: true`.

---

## Step 3 — Build-provenance signing (OPTIONAL)
The command runs on YOUR computer, not in Railway. You paste its OUTPUT into a variable.

1. On your machine:
   ```
   openssl genpkey -algorithm ed25519 -out dumby-signing.pem
   ```
2. Flatten the PEM to a single line (Railway variables are single-line):
   ```
   tr -d '\n' < dumby-signing.pem
   ```
3. Railway -> Variables -> add:
   ```
   BUILD_SIGNING_KEY_ID=dumby-dev-1
   BUILD_SIGNING_PRIVATE_KEY=<the single-line PEM from step 2>
   ```
Success = the `module-provenance-unverified` warning disappears.
Skip this entirely if you only want the baked first-party modules.

---

## Step 4 — Modules and the control plane

**Modules.** Option A ships an image with **no** modules: they live on the tier volumes under
`MODULES_DIR`, and the image's start command seeds them through the Swastik deploy flow on the first
boot of an empty volume, then runs the bot.

**One-time approval (ADR-006).** The *first* promotion of a module requires explicit human approval.
The boot seed will not approve on its own — set this variable once to give that approval, then deploy:

```
MODULE_SEED_HUMAN_APPROVED=true
```

Success = the deploy log shows `push-modules-lite: 8 module(s) pushed` (not "0 module(s)"). Once the
tier volumes hold the modules, the seed is skipped on every later boot, and you can **remove** the
variable. Without it, the seed reports `first promotion of this module requires human approval` for
each module and pushes nothing — the gate is working, not failing.

> **Do NOT add Swastik as a separate Railway service to hold modules.** A Railway volume mounts to
> exactly one service, and `MODULES_DIR` is mounted on `@workspace/dumby`. A separate Swastik service
> has its own filesystem and **cannot** write the app's tier volumes — which is why the volumes come up
> empty if you try. Swastik runs inside the app container during the boot seed (on loopback), so the
> volume is written where it lives and every module carries real provenance.

**Control-plane services (OPTIONAL).** Each is the SAME GitHub repo added as a NEW Railway service
with a different Start Command. Give each the same `DATABASE_URL`, `REDIS_URL`, `INTERNAL_API_KEY`.
These are for *operating* the platform (developer registration/approval, persona hosting, the console);
they do not hold module storage.

| Service | Start Command | Notes |
|---|---|---|
| credentials | `node dist/entry/credentials.js` | set `CREDENTIALS_SERVICE_URL` to its private domain |
| power-engine | `node dist/entry/power-engine.js` | needs `POWER_ENGINE_OPERATOR_IDS` |
| twill | `node dist/entry/twill.js` | persona host |
| clai | `node dist/entry/ssh-clai.js` | an SSH server -> needs a TCP Proxy, not an HTTP domain |

---

## Step 5 — Cleanup
Delete the duplicate **Postgres** service (keep one) and the
`@workspace/api-server` service (the Replit scaffold, not Dumby).

---

## Troubleshooting — bot not online
Read the **Deploy** tab. Exactly one of these is true:
- `discord-client-ready` present, no crash -> login worked; the bot is online.
- `Fatal bootstrap error: ...` right after `DISCORD_LOGIN` -> the **BOT_TOKEN** is
  rejected (`TokenInvalid` / `Used disallowed intents`). Re-copy the token (no
  quotes, no trailing whitespace).
- `command-deploy-failed` -> registration failed but the bot stays online.

Also confirm: the bot is **invited** to `DEV_GUILD_ID` with the `bot` and
`applications.commands` scopes, and `DEV_GUILD_ID` / `BOT_OWNER_IDS` are real
17-20 digit snowflakes (`BOT_OWNER_IDS` comma-separated).
