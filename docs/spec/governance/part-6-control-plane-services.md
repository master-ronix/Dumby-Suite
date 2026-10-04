---
id: SPEC-00-GOVERNANCE-0008
title: PART 6 — CONTROL-PLANE SERVICES
kind: spec
status: normative
version: 5.0.0
authority_scope: [00-governance]
contracts: []
acceptance: [ACC-GOV-0008-1]
owners: [framework-maintainers]
last_verified_commit: null
review_state: pending-evidence
---

# PART 6 — CONTROL-PLANE SERVICES

### D-6.1 — The Exteriority Axiom

**Rule (MUST).** The control-plane services — the bot, Swastik, Power Engine
Panel, CLAI, and the Credentials Service — are separately-deployed services
that never live inside the gateway-connected process and are never modules.
They are infrastructure in the same category as the database itself, not a
pattern modules may imitate (the narrow, named exception to the
microservices non-goal). The Release Manager in particular owns
its own repository, image, manifests, and CI — placing it under the bot's
entry directory creates a circular bootstrap dependency (deploying the bot
would require deploying the deployer) and is forbidden.

### D-6.2 — Power Engine Panel (Power Engine)

**Rule (MUST).** Power Engine is the global administrative authority, implemented as
a documented function-calling model over a fixed catalog of 17 control
domains, with unconditional audit logging of every invocation regardless of
outcome. Its capacity — suspend any guild, module, developer, or command
globally, reach into every core subsystem — is exercised only as deliberate,
logged intervention for cause (abuse, security compromise, confirmed policy
violation), never as routine operation (P14: freedom by default, authority
by exception). Live policy enforcement is applied by the framework's own
policy-enforcement dispatcher at evaluation time; an external
policy-enforcement service has no sanctioned channel for injecting
overrides into a running deployment.

### D-6.3 — CLAI — Operator Terminal

**Rule (MUST).** CLAI provides out-of-band operator access independent of
gateway health, transported over SSH public-key authentication (the ssh2
dependency is the specified transport — the historical plaintext-TCP gap is
a defect to close, not a mode to keep). Session model and command surface
follow blueprint §22.7; every session is audited.

### D-6.4 — Credentials Service — One Issuance Path

**Rule (MUST).** A single shared path issues every credential: cryptographically
random generation, Argon2id hashing at rest (never a raw value persisted
anywhere), `Authorization`-header-only transmission, and independent
revocability. This one policy applies uniformly to bot tokens, developer
devIds, and service-to-service tokens. devId is as sensitive as a bot token
(hash-only storage, issued once). Swastik delegates identity issuance to this
service rather than minting credentials itself.

### D-6.5 — Swastik Is a Control Plane, Not a Request Plane

**Rule (MUST).** Swastik owns deployment, hot reload, hot-swap, developer
registration, licensing, and the marketplace pipeline — it never sits on the
request path. Its target posture is shift-left, fail-fast, crypto-verified
validation across the whole pipeline (the trust-based-checks / late-failures
posture is the misalignment to eliminate, per the blueprint's standing rule).
Release Manager–Swastik coordination uses a renewable Redis lease (30 s TTL, 10 s
heartbeat, fencing tokens, durable PostgreSQL record): core releases pause
module hot-swaps, valid uploads queue (HTTP 202), and scheduled restarts
defer while a release holds the lease; on Release Manager crash the lease
expires and
Swastik resumes within the bounded TTL.

### D-6.6 — Personas (Twill): Opt-In, Additive, Shared Infrastructure

**Rule (MUST).** Multiple bot identities run as separate processes on the
same PostgreSQL, Redis, and job queues — each with its own token, shard
allocation, and module enablement profile, bound per-guild. The mechanism is
reached for only when a hard Discord ceiling (100 commands per guild per
application, or one active voice connection per bot per guild) is actually
hit — never preemptively. A persona instance is a Twill instance: the
guild administrator supplies its bot token and application, Dumby hosts the
process, and one persona is bound to one server. Twill's free charter
carries the explicit sunset condition recorded in ADR-008, and instances
are registered through the Twill registration API (ADR-011). Each
Twill instance decides its own DM behavior within the main bot's
prohibition (D-1.7).

---

## Acceptance
```acceptance
- id: ACC-GOV-0008-1
  check: "The five control-plane services are separately-built and share only PostgreSQL/Redis/image"
  test: tests/arch/control-plane.spec.ts
```
