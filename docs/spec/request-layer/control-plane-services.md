---
id: SPEC-04-REQUEST-LAYER-0022
title: 22. Power Engine Panel, CLAI & Credentials Service
kind: spec
status: normative
version: 5.0.0
authority_scope: [04-request-layer]
anchors: [POWER_ENGINE_PANEL_CLAI, WHY_THESE_ARE_SEPARATE, POWER_ENGINE_PANEL_POWER, POWER_ENGINE_CONTROL_DOMAIN, RE_AUTHORIZATION_ON_COMPONENT, POWER_ENGINE_CONTROL_DOMAIN, POWER_ENGINE_DEPLOYMENT_ACCESS, CLAI_PURPOSE_ACCESS_MODEL, THE_17_POWER_ENGINE, CLAI_SESSION_MODEL_COMMAND, CREDENTIALS_SERVICE_SHARED_ISSUANC, HOW_THE_CONTROL_PLANE]
contracts: [contracts/rbac.enums.json, contracts/commands.json, contracts/ui-renderer.schema.json, contracts/events.catalog.json]
acceptance: [ACC-REQ-0022-1, ACC-REQ-0022-2, ACC-REQ-0022-3]
owners: [framework-maintainers]
last_verified_commit: null
review_state: pending-evidence
---

## 22. Power Engine Panel, CLAI & Credentials Service

**Status:** [SPEC]

### 22.1 Why These Are Separate Services, Not Modules

Three capabilities sit **outside the module system entirely** rather than being expressed as
Admin-tier modules: the Power Engine Panel (global administrative authority), CLAI (an
operator terminal), and the Credentials Service (shared secret issuance). Each is deployed
as its own process, sharing only the underlying PostgreSQL and Redis instances with the bot
process. CLAI authenticates operators through a real SSH server with public-key
authentication against the operator tables; its canonical entrypoint is
`apps/main/src/entry/ssh-clai.ts`. No plaintext credential path remains anywhere.

These three are control-plane infrastructure in the same category as the database itself,
not application features — and each remains reachable even in a failure mode where the bot
process is completely down. An Admin-tier module only ever runs *inside* the bot process,
which is precisely why these three cannot be Admin-tier modules.

### 22.2 Power Engine — Purpose & the Function-Calling Model

Power Engine is the framework's global administrative authority — the concrete mechanism
behind P14: a capacity for total, fleet-wide control that exists for deliberate, logged
intervention, never as ambient enforcement. It can suspend any guild, module, developer, or
command, fleet-wide, instantly, regardless of what any individual guild administrator or
module author has configured.

**Access and transport.** Every Power Engine route — and the admin routes that share its
action registry — authenticates the caller with a bearer credential issued by the Credentials
Service (§22.8) and validated against the configured operator allow-list; a request without
both is rejected with 401 before any function catalogue lookup happens. The `source` recorded
on every audit row is derived by the server from the authenticated caller and the serving
route, never accepted from the request body. Power Engine's HTTP listener binds loopback by
default; the bind host is configurable, never `0.0.0.0` out of the box.

Power Engine exposes its capabilities as a catalogue of **callable functions** — each with a
name, a typed parameter schema, and a description — rather than a fixed set of hardcoded
terminal commands. Three kinds:

- **Act functions** — the control domains of §22.3–§22.4: suspend, resume, restart, revoke,
  and every other state-changing intervention, each audited after its handler completes.
- **Observe and read functions** — current fleet state (guilds, modules, developers,
  commands, shards), grant and licence state, audit-log queries, queue depths, rate-limit
  windows, and deployment history. They never mutate state and never write an audit row for
  the read itself, but they are authenticated, rate-limited, and schema-validated exactly
  like act functions.
- **Policy-tuning controls** — the read/write pair for tunable policy: rate-limit windows,
  cooldown overrides, deployment rate-limit buckets, and detection thresholds. Every tuning
  write is itself an act function: audited, reasoned, and reversible, with the previous value
  recorded in the audit row.

Long-running views stream over **server-sent events**: a subscribed client receives push
updates (fleet health, deployment progress, audit tail) rather than polling. The identical
schema format serves Power Engine's REST API, CLAI's terminal, and any structured front end
layered on top later.

```
DIAGRAM 22-A — Power Engine as a function catalogue, not a command list

Caller (CLAI terminal, authenticated REST client, or a future front end)
  → the function dispatcher validates the call against the named function's typed
    parameter schema (rejects malformed calls before any side effect)
  → one of 17 control-domain functions executes through the shared action registry —
    every entry resolves to a real domain handler, and an entry without one returns
    501 Not Implemented without writing an audit row
  → a mandatory append-only audit_logs write (source derived by the server), enforced
    by a Postgres trigger blocking UPDATE/DELETE, performed AFTER the domain handler
    completes so the row records the true outcome
```

**Catalogue integrity at boot.** Every catalogue entry is a real adapter over an existing
subsystem — the maintenance domain drives the maintenance switch, the cache domain drives the
cache manager, the queue domain drives the queue manager — or it is explicitly marked
not-implemented and returns 501. A control-plane process asserts this at boot: every
registered catalogue entry must resolve to a domain handler or an explicit not-implemented
marker, and an entry wired to no backend fails the boot. A **no-stub test** walks every
registered admin and Power Engine route in CI: each route must resolve to a real domain
handler or carry the explicit not-implemented marker, and a route whose handler is an empty
`async () => {}` returning `200 {ok:true}` fails the test. An honest 501 is acceptable
anywhere the primitive does not yet exist; a fake success is not.

### 22.3 The Four Original Control Domains

```
TABLE 22-A — The four foundational suspend primitives

suspendGuild      immediately blocks the bot from responding to ANY interaction
                  originating in the named guild, fleet-wide, regardless of that guild's
                  own configuration
suspendModule     immediately disables the named module fleet-wide, overriding every
                  individual guild's own enabled state for it — a global kill switch
                  above guild_module_states
suspendDeveloper  blocks every module authored by the named developer from deploying
                  further versions AND, at the operator's discretion, force-disables
                  their already-live modules
suspendCommand    immediately disables one specific command fleet-wide, across every
                  module and every guild — the narrowest of the four
```

`suspendDeveloper` validates its input against a schema before any state changes — a
malformed payload returns 400 with field-level errors, and an unknown developer id returns
404 — and accepts an optional force-disable flag that, when set, propagates: the licence row
takes its suspended split (§15.7), every pending build the developer has in flight is
rejected, and their already-live modules are unloaded across the fleet through the §15.1
unload path.

### 22.4 The Thirteen Extended Control Domains

```
TABLE 22-B — The extended domains, by subsystem

Maintenance      enterMaintenanceMode / exitMaintenanceMode
Cache            flushCacheNamespace — targeted invalidation of an entire key prefix
Job queue        pauseQueue / resumeQueue / requeueDeadLetter
Rate limits      overrideRateLimit — a temporary per-guild or per-user exception
Shard mgmt       restartShardGroup — targeted restart of one shard range
Deployment       triggerCoreRestart / rollbackModuleVersion
Persona mgmt     suspendPersona
Audit            queryAuditLog — structured search across the shared audit table
Marketplace      revokeModuleSignature
Credentials      credentials.issue / credentials.rotate / credentials.revoke
```

Together with the four foundational primitives, that is **seventeen control domains**. Every
one writes an unconditional, reasoned audit entry — with its source derived by the server —
after its domain handler completes and before returning a result, with no exception: the row
records the handler's actual outcome (applied, failed, or rejected).

**Control-domain SQL contract.** Each act function's persistence layer runs against the exact
schema the data section declares: `suspendCommand` inserts into `disabled_commands` honouring
the partial unique index on the command id where the guild id is null; `revokeModuleSignature`
updates the signing-keys row's revocation columns rather than deleting the key; and the audit
writer populates exactly the audit column set that `queryAuditLog` reads. A contract test
exercises all four statements against a disposable schema-per-test database in CI.

### 22.5 Deployment & Access Model

Power Engine runs with **no gateway connection and no loaded modules** — it never speaks
Discord's gateway protocol at all, only its own authenticated REST surface. Access requires a
credential issued by the Credentials Service and bound to a named operator identity, distinct
from — and held to at least the same scrutiny as — the Admin tier's owner-ids check. Power
Engine's own access list is independently configured rather than inherited automatically from
the bot-owner list.

**Internal-surface authentication.** Every internal HTTP surface — Power Engine's REST
routes, the admin routes sharing its action registry, CLAI's dispatch bridge, the Credentials
Service's issue/revoke endpoints, Swastik's internal routes, and the bot's reload endpoint —
authenticates service-to-service calls with a timing-safe internal API key pre-handler: the
presented key is compared in constant time before any handler, route lookup, or body parsing
runs, and a missing or mismatched key is rejected with 401 before anything else executes.
Each such listener binds loopback by default, with the bind host configurable; the Docker
Compose control-plane mapping publishes every internal port on loopback only, never
`0.0.0.0`.

### 22.6 CLAI — Purpose & Access Model

CLAI (the Command Line Administrative Interface) is an SSH-hosted operator terminal providing
direct, interactive access to Power Engine's function catalogue from outside Discord
entirely. Its defining property is independence from every other part of the stack that could
be the thing currently broken: CLAI requires only SSH reachability and Power Engine's own
health — remaining a viable intervention path even when the Discord gateway connection is
down, a specific shard group is unresponsive, or a core restart is mid-rollout.

**Key management.** Each operator's public key is registered in the operator tables;
revocation is a credentials-domain action that takes effect on the very next connection
attempt. Where an operator cannot register an SSH keypair — a headless automation context —
CLAI admits token-verified authentication instead: a Credentials-Service-issued operator token
verified timing-safely over the same transport — exactly **two sanctioned paths, registered
public key or issued token**. A session offers no fingerprint recital and no unauthenticated
prompt, and every command issued inside a session dispatches through the real authenticated
Power Engine function dispatcher carrying the operator's identity. Authentication is
**SSH public-key only** — no password path exists — so removing one compromised or departed
operator's access never requires rotating a shared secret.

**Transport hardening.** The SSH server holds its authentication state in a synchronous flag:
the authenticated bit is set inside the public-key callback before any stream is opened.
Sessions are bounded by connection and byte limits — a session exceeding its byte ceiling is
terminated, and a per-IP connection cap blocks session pileups — and every byte the session
writes to the operator's terminal passes through an **ANSI escape stripper**.

**Session guards and operator lifecycle.** A session terminates after a bounded idle period —
**10 minutes**; destructive functions require a typed confirmation matching the target's
name; repeated failed connections from a single source IP trip a per-IP authentication
limiter with escalating backoff; and destructive control domains additionally require a
**TOTP second factor** verified after the public-key step. Operator lifecycle is a
first-class surface: register, rotate, and revoke endpoints plus a deployment seed script
provision operators through the credentials domain — keypairs and TOTP secrets issued,
rotated, and revoked through the credentials domain, never hand-registered on the host — and
a revocation removes both the keypair and the TOTP binding on the next connection attempt.

### 22.7 CLAI Session Model & Command Surface

A CLAI session is a REPL: a connecting operator is dropped into an interactive prompt that
resolves each typed command to a call against Power Engine's function catalogue, rendering
results in human-readable form (tables for list-shaped results, formatted diffs for state
changes) rather than raw JSON. Every command carries the connecting operator's identity
through to Power Engine's own audit write, so the audit log distinguishes a CLAI intervention
from a REST one.

Every command a CLAI session issues executes against the **real Power Engine route**: the
dispatch bridge presents a Credentials-Service-issued service-to-service credential on each
call. Each command mints a **correlation id** that travels on the Power Engine call and is
written into both the CLAI session's audit row and the Power Engine handler's audit row.
Rendering is honest: the terminal shows the handler's actual outcome — a failed or rejected
invocation renders the failure and its reason, never a fabricated success line.

```
TABLE 22-C — CLAI session properties

Idle timeout                session terminates automatically after a 10-minute idle period
Command history             persisted per-operator for the operator's own later reference;
                            never shared across operators
Destructive confirmation    a function whose effect is broad or irreversible requires an
                            explicit typed confirmation matching the target's name
```

### 22.8 Credentials Service — Shared Issuance Path

The Credentials Service is the **single, shared issuance path** for every credential this
architecture hands out at runtime — Swastik's developer and build ids, Power Engine and CLAI
operator access credentials (including CLAI operator keypairs), any internal
service-to-service authentication token, and the verifiable licence ids every approved
licence's paper certificate carries. Consolidating issuance into one service is what makes
P13 hold for secret issuance specifically: exactly one place generates, hashes, and revokes
credentials.

```
TABLE 22-D — Credential handling discipline (applied uniformly)

Generated cryptographically random      every credential this service issues, no exceptions
Stored only as an Argon2id hash         the raw value is never persisted anywhere,
                                        including in this service's own database
Displayed exactly once, at issuance     a lost credential is rotated, never retrieved
Always transmitted via Authorization    never in a URL, a query string, or a log line —
header                                  the same placement discipline as a bot token
Independently revocable                 revoking one credential never requires rotating
                                        any other the same service has issued
```

**Developer credential storage.** Developer secrets live in a credentials table — key id,
purpose, credential hash (Argon2id), developer-id hash, status, created and revoked
timestamps — one row per issued secret, keyed by the key id. The `purpose` field is a closed
enum (`devId | buildId | password | service_to_service | operator_keypair | license_id`); a
value outside the enum is rejected by the schema. The caller presents the key id together
with the secret; the service hashes the presented secret and compares it against the single
row the key id names, so verification never scans or compares across developers. Verification
is delegated to this service alone: Swastik and the developer portal never hash or compare
developer credentials themselves. **Refusals are indistinguishable:** an unknown key id, a
mismatched secret, and a pending identity all return the identical 401 body with no field
named, and no log line, metric label, or audit row ever contains a fragment — not even a
prefix — of the presented secret. A newly registered developer's rows start in a pending
status and fail verification as an unknown identity until the owner-approval workflow
transitions them to active.

**Service authentication and port.** The issue and verify endpoints authenticate bearers: a
bootstrap token delivered to the operator exactly once at deployment, compared timing-safely,
and — once the service has issued operator credentials — those credentials in turn. The
issuance and verification surface is rate-limited per caller and carries a body limit sized
to the smallest valid issue/verify payload, so an oversized body is refused with 413 before
it finishes buffering. Every issuance writes an audit row tagged with its source. The listen
port comes from the `CREDENTIALS_SERVICE_PORT` environment variable (default **8086**), read
by the credentials entrypoint — never hardcoded.

### 22.9 How the Control Plane Fits Together

```
DIAGRAM 22-B — The control-plane services, complete relationship

Credentials Service  (entry/credentials.ts)
   issues dev ids, build ids, operator credentials, and service-to-service tokens to
   every service around it
        → Swastik          (module delivery, §15)
        → Power Engine     (the function catalogue, §22.2)
        → CLAI             (the SSH terminal, which calls Power Engine's functions)

Shared stores: PostgreSQL (the audit log and shared state) and Redis (cache-invalidation
signals, pub/sub).

The Bot Process (entry/main.ts) reads and writes the same stores and is the ONLY one of
the five processes with a live Discord gateway connection and a loaded module registry.

Every arrow terminates at PostgreSQL or Redis — never at another control-plane service's
in-process state — which is what allows each of these five processes to fail, restart, or
scale independently.
```

### 22.10 CLAI — SSH Public-Key Operator Terminal

CLAI binds loopback and authenticates operators via SSH public-key verification against the
operator tables. The SSH host key is generated fresh at every process start and is **not
persisted**, so operators cannot pin a fingerprint across restarts; this ephemerality is an
accepted risk, mitigated by the loopback bind. No plaintext REPL path exists, and there is no
plaintext credential channel of any kind. Power Engine dispatch is issued over the
authenticated SSH session, carrying the operator's identity through to Power Engine's audit
write. The command surface presented inside the session is the Power Engine function
catalogue itself — observe, read, policy-tuning, and act functions — so an operator's
terminal session and an authenticated REST call are two views of one engine.

Seven entry points (the bot, the worker, the migration runner, Power Engine, the SSH CLAI
server, Swastik, and the Credentials Service) each boot the same DI container but start
different service subsets.

### 22.11 How To Verify This Section Against the Code

- The Power Engine entrypoint and dispatcher: `apps/main/src/entry/power-engine.ts`,
  `src/http/power-engine-dispatcher.ts`, `src/http/power-engine-catalog.ts`.
- The admin routes and the internal-auth guard: `apps/main/src/http/routes/admin.routes.ts`,
  `src/http/internal-auth.ts`.
- The CLAI entrypoint: `apps/main/src/entry/ssh-clai.ts`.
- The Credentials Service entrypoint and clients:
  `apps/main/src/entry/credentials.ts`, `src/credentials/*`.
- The control-plane ports: `apps/main/src/config/env.schema.ts` (8083 Power Engine, 8084
  CLAI, 8085 Swastik, 8086 Credentials, 8090 Twill).

Divergences are recorded in `status/code-reconciliation.json`.

## Contract
- `contracts/rbac.enums.json`
- `contracts/commands.json`
- `contracts/ui-renderer.schema.json`
- `contracts/events.catalog.json`

## Acceptance
```acceptance
- id: ACC-REQ-0022-1
  check: "Every Power Engine route resolves to a real domain handler or returns an honest 501 NOT_IMPLEMENTED"
  test: tests/integration/power-engine-no-stubs.spec.ts
- id: ACC-REQ-0022-2
  check: "CLAI uses the ssh2 public-key server; no plaintext TCP REPL exists"
  test: tests/arch/clai-ssh.spec.ts
- id: ACC-REQ-0022-3
  check: "Credentials Service hashes with Argon2id and binds to the internal network only; one issuance path"
  test: tests/integration/credentials.spec.ts
```

## Edges (-> blueprint)
- SPEC-04-REQUEST-LAYER -> SPEC-02-ARCHITECTURE (dispatch enters the core runtime)
- SPEC-04-REQUEST-LAYER#RENDERER -> documentation/ (every surface is renderer-issued)

## Named entities

**classes, interfaces & symbols:** `Admin-tier-capable`, `Auto-Renewal`, `Canary-based`, `Destructive-action`, `Password-shaped`, `Persona-scoped`, `Rewrite`, `bodyLimit`, `commandId`, `credentialHash`, `devIdHash`, `issuedAt`, `keyId`, `preHandler`, `revocationReason`, `revokedAt`, `revokedBy`, `rotateCredential`

**events & identifiers:** `queryAuditLog.`
