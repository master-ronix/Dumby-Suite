---
id: SPEC-06-OPERATIONS-0032
title: 32. Security Architecture & Threat Model
kind: spec
status: normative
version: 5.0.0
authority_scope: [06-operations]
anchors: [SECURITY_ARCHITECTURE_THREAT_MODEL, SECRETS_MANAGEMENT, INPUT_VALIDATION, WEBHOOK_SIGNATURE_VERIFICATION, PRIVILEGE_ESCALATION_PREVENTION, DEPENDENCY_SECURITY, AUDIT_LOGGING_AS_A, ENCRYPTION_POSTURE, TOKEN_SECURITY, DEPENDENCY_SECURITY, INPUT_VALIDATION_DEEP_DIVE, OUTPUT_ENCODING_A_RENDERER]
contracts: [contracts/errors.json]
acceptance: [ACC-OPS-0032-1, ACC-OPS-0032-2, ACC-OPS-0032-3]
owners: [framework-maintainers]
last_verified_commit: null
review_state: pending-evidence
---

## 32. Security Architecture & Threat Model

**Status:** [SPEC]

### 32.1 Secrets Management

Every secret — the Discord bot token, database credentials, Redis credentials, and every
credential the Credentials Service issues — is supplied exclusively through environment
variables injected by the orchestrator (sealed Kubernetes secrets, or an external vault),
never committed to source control and never baked into an image layer. `.env` files are
gitignored unconditionally, and CI includes a secret-scanning step that fails the build on any
pattern resembling a committed credential.

**Rotating a secret must trigger an automated rolling restart, or be served through an
external-secrets agent that hot-reloads without restart** — so that no fleet-wide cutover
leaves every pod holding a now-invalid token and disconnecting simultaneously.

**Non-production credential separation.** Production secrets are categorically distinct values
from staging/dev equivalents — never shared, reused, or derived. This is what gives the
Admin-tier environment guard its actual security force: even if the guard's check were
subverted, the production credentials simply do not exist in non-production config. Two
independent layers.

**Credential handling discipline.** Every credential-shaped value follows the same rules —
cryptographically random generation, Authorization-header-only transmission, independent
revocability. At rest, two schemes apply without overlap: **Argon2id one-way hashing** for
everything verifiable by hash, and **envelope encryption** (root key → data-encryption keys →
per-record AES-256-GCM) for recoverable, in-process-readable credentials. The boundary is the
question "does anything in this process ever need to read the value back to do its job?" If no
→ hashed; if yes → envelope-encrypted, and only with that justification on record.

### 32.2 Input Validation

Every trust boundary validates against an explicit schema before business logic runs — command
options (via typed option accessors that fail closed on type mismatch), HTTP request bodies on
every REST route, inbound webhook payloads, process configuration, and every module manifest.
No layer trusts data merely because it arrived from another layer in the same process.
Filesystem paths assembled from request-derived components are built exclusively through the
containment-guard helper — component-pattern validation plus a path-containment assertion on
every join — never plain string concatenation.

### 32.3 Webhook Signature Verification

Every inbound webhook route a module registers verifies a cryptographic signature —
HMAC-SHA256 against a shared secret, or the originating service's own scheme — before any
payload is parsed as trusted input.

```
DIAGRAM 32-A — Inbound webhook verification gate

signature present and well-formed?          NO → 401 reject + warn
signature valid against the shared secret?  NO → 401
timestamp within the replay-protection      OUTSIDE → 401 (a captured valid-signature
tolerance window?                           request cannot be replayed indefinitely)
WITHIN → payload trusted; proceed to the module's own schema validation and business logic
```

A webhook route with no signature verification configured **refuses to register at all during
Stage 14** — there is no supported "unverified webhook" mode. Every HMAC-SHA256 computation
(inbound verification, outbound delivery signing, internal request signing) uses the platform's
HMAC primitive with the secret as the key — never `sha256(message + key)`, which is not an
HMAC and is a review reject — and is regression-tested against RFC 4231 test vectors in CI on
every crypto-path change.

### 32.4 Privilege Escalation Prevention

```
TABLE 32-A — Escalation vectors and their structural blocks

A module requesting broader Discord intents at runtime than declared
    The gateway-intent union is computed ONCE from every loaded module's manifest at
    Stage 15 — nothing after login can add to it; a manifest field, not a runtime call,
    is the only path

A lower-tier module reaching Admin-tier authority
    The three-layer rule and the module isolation rules — no module can import or invoke
    another's code; the Admin tier's five-layer gate is independent and additional

A guild admin self-granting an elevated role without the Discord role
    RBAC rank is computed fresh from actual Discord role membership on every interaction —
    a guild config write cannot grant a rank; only an actual Discord role assignment, or an
    explicit Layer 7 grant by an existing administrator/owner, can

A module writing to another module's tables directly
    Isolation Rule 2 — cross-module writes are never acceptable; a code-review hard stop
    with no carve-out
```

### 32.5 Dependency Security

The package manager's lockfile is committed and CI runs with a frozen lockfile, so a build
never silently resolves a different tree than the one reviewed. A dedicated dependency-review
workflow runs on every PR that introduces or updates a dependency, blocking the merge on any
critical or high-severity known vulnerability and flagging lower severities. Dependency
footprint is treated as an ongoing design concern in review: a new dependency for functionality
the standard library or an existing dependency could cover is a legitimate review objection.

### 32.6 Audit Logging as a Security Control

The append-only, never-updated audit table is the single record every consequential action
writes to — the Power Engine's control domains (mandatory before any result), Swastik's full
deployment lifecycle, every guild configuration change, and Admin-tier invocations both
granted and rejected. Security review is therefore one table, filterable by source, actor, or
target. Module artifact integrity is enforced at every load boundary: the runtime loader
verifies the build's signature over the artifact bytes and its provenance tuple before the
module is imported, and a verification failure refuses the load with an audited refusal.

### 32.7 Encryption Posture

```
TABLE 32-B — Encryption responsibility

In transit — DB, Redis, HTTP ingress
    TLS, application-enforced (the DB connection config and Redis client config both
    require it where the endpoint supports it; the reference deployment terminates
    external TLS at the ingress)

In transit — Discord gateway/REST
    Inherent — the gateway and REST clients both use TLS unconditionally

At rest — database and cache volumes
    Infrastructure-layer responsibility (the cloud provider's disk/volume encryption,
    per the Terraform reference), not reimplemented at the app layer

Credential-shaped values that never need in-process recovery
    Argon2id hashing — one-way, never reversible

Credential-shaped values the system must read back (envelope encryption)
    A root key wraps data-encryption keys; each record is sealed with its own DEK under
    AES-256-GCM. Root-key custody in the orchestrator's secret store; DEKs never leave
    the process; rotation re-wraps DEKs without touching records.
```

### 32.8 Token Security

The bot token is the most sensitive secret. It is loaded from the environment, stored in memory
only — never written to disk, never logged at any level, never in error messages, never
exposed to modules through the service container — and used by the gateway client to identify
and the REST client to authenticate. The framework scans log entries for patterns matching a
Discord bot token; a token-like pattern causes the entry to be redacted and a security alert
sent to the bot owner. Rotation happens in the Discord developer portal and the bot is
restarted to load the new token, invalidating the old one immediately.

Internal service-to-service calls authenticate with a timing-safe internal-API-key pre-handler
and bind loopback by default — the key compared in constant time, never an early-exit string
comparison, and an internal listener never published beyond the host without an explicit
operator decision. Developer credential verification is delegated to the Credentials Service,
whose refusals are indistinguishable: an unknown key id, a mismatched secret, and a pending
identity all return the identical 401 body, and no credential fragment — not even a prefix — is
written to a log line, metric label, or response body. The one documented exception is the
audit row: a rejected internal-auth attempt records the route, the caller's address, and a
short one-way digest prefix of the presented key — never the key itself or a recoverable
fragment.

### 32.9 Input Validation — Deep Dive

> **Status: logged deviation.** The input sanitizer described here is specified but not
> implemented in the tree, and no work-order item owns it. Validation today is performed by
> the command's Zod schema at the input-validator middleware stage, which is where injection
> defence actually lands; the passes below are the target state for a sanitizer layer.

The target sanitizer performs: **HTML entity encoding** (replacing the HTML-significant
characters with entities) applied to all string options before the handler; **SQL-injection
pattern detection** (checking input against a library of patterns — union-select, boolean
tautologies, destructive statements, comment injection — case-insensitively and tolerant of
encoding obfuscation); **Discord-markdown limiting** (allowing a safe subset and stripping
mentions, channel mentions, and emoji to prevent mention injection); **URL validation**
(HTTPS-only, allowed-domain and blocklist checks); and **length limiting** (truncating to the
module-specified maximum, which may be shorter than Discord's own limit).

### 32.10 Output Encoding — A Renderer Property

Output encoding is a property of the core Renderer, not a per-module obligation. There is no
classic-embed path and no HTML surface — embeds are banned — so the Renderer neutralises user
content at that one boundary. **Mention suppression:** user text is rendered so any user, role,
everyone, here, or channel mention displays as literal text, and the Renderer never echoes a
nickname into a mention; a genuine mention is emitted by the module supplying the target id,
which the Renderer turns into a real mention. **Markup neutrality:** user content is not
interpreted as markdown on surfaces requiring literal display — the Renderer code-wraps or
escapes it. **URL handling:** user-provided values forming part of a link are URL-encoded by
the Renderer, so a user cannot append query parameters or retarget a link.

### 32.11 How To Verify This Section Against the Code

- The logger redaction list: `apps/main/src/logging/logger.ts`.
- The internal-auth guard: `apps/main/src/http/internal-auth.ts`.
- The path-containment guard: `apps/main/src/shared/utils/path-guard.ts`.
- The envelope encryption: `apps/main/src/crypto/envelope.ts`, `src/crypto/envelope-scope.ts`.
- The HMAC regression test: `apps/main/tests/unit/m9-hmac-rfc4231.test.ts`.

Divergences are recorded in `status/code-reconciliation.json`.

### 32.12 devId Sensitivity — the Bot-Token Analogy

The devId / dev token is handled with exactly the sensitivity of a Discord bot token; it is
the project's canonical reference for bearer-secret handling — Argon2id hashing, once-only
issuance, and Authorization-header transport, never a URL, query string, or log line. That
bar is precisely what makes any embedding of the devId inside a shipped manifest a critical
fault: the identifier may appear in a manifest only as the non-secret `devId` value, never
the secret token itself.

## Contract
- `contracts/errors.json`

## Acceptance
```acceptance
- id: ACC-OPS-0032-1
  check: "All secrets arrive via orchestrator-injected env vars; CI secret-scanning fails on committed credentials"
  test: tests/ci/secret-scan.spec.ts
- id: ACC-OPS-0032-2
  check: "Non-production credentials are categorically distinct from production (never shared/reused)"
  test: tests/arch/credential-separation.spec.ts
- id: ACC-OPS-0032-3
  check: "Webhook payloads are HMAC-verified and escalation attempts are blocked; Argon2id for secrets, envelope encryption for recoverable credentials"
  test: tests/integration/security-controls.spec.ts
```

## Edges (-> blueprint)
- SPEC-06-OPERATIONS -> all departments (observability + errors are cross-cutting)
- SPEC-06-OPERATIONS#SECURITY -> SPEC/00-GOVERNANCE (secrets, ban registry enforcement)

## Named entities

**classes, interfaces & symbols:** `Doppler`, `Renovate`, `Truncation`, `keyId`, `preHandler`

**events & identifiers:** `crypto.createHmac`
