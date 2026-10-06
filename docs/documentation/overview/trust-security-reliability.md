---
id: DOC-OVERVIEW-0011
title: 11. TRUST, SECURITY & RELIABILITY
kind: documentation
status: derived
version: 5.0.0
authority_scope: [11-trust-security-reliability]
contracts: []
acceptance: []
owners: [framework-maintainers]
last_verified_commit: null
review_state: pending-evidence
---

## 11. TRUST, SECURITY & RELIABILITY

### 11.1 The Trust Stack

Trust in Dumby is built on four layers, each reinforcing the others:

**Provenance trust.** Every module has a known developer — either hired by Dumby's company or licensed through a formal agreement. Every module version has a `devId` and `buildId` pair validated at load time. Every module is cryptographically signed after passing the review pipeline. A guild operator can trace any module back to the developer who built it and the review that approved it.

**Architectural trust.** The module contract, the DI container, and the lint rules enforce isolation boundaries that prevent a module from accessing another module's data, infrastructure, or internals — even if the module is malicious. The ServiceLocator's tier-based access control ensures that Marketplace modules receive quota-enforcing wrappers around every service, preventing unbounded resource consumption. The seven-layer permission engine ensures that every interaction is authorised before it reaches the handler.

**Operational trust.** The framework's observability infrastructure — structured logging, Prometheus metrics, OpenTelemetry tracing — means that every action is recorded, every error is logged, and every performance issue is traceable. The audit log table records every administrative action with actor, source, reason, and timestamp. An operator can answer "who did what, when, and why" for any change in the system.

**Commercial trust.** Dumby is a product backed by a company. The company has a commercial interest in maintaining the product, fixing bugs, responding to security reports, and providing support. This is the trust layer that open-source projects and hobby bots cannot provide — the assurance that someone is accountable and incentivised to keep the system running.

### 11.2 Reliability Engineering

Dumby's reliability is engineered, not hoped for:

- **Per-handler fault containment.** A throwing handler is caught by the module's error boundary. The module is marked as in error state. Other modules and the core continue running. For Marketplace modules, automatic per-guild disablement triggers after 10 errors in 60 seconds — protecting the guild from a repeatedly failing module.
- **Graceful shutdown.** Signal handling (SIGTERM, SIGINT) triggers an ordered shutdown: stop accepting new interactions, finish in-flight requests, flush logs, close database connections, close Redis connections, disconnect from the gateway. No data loss, no orphaned connections.
- **State externalisation.** No cross-process state lives anywhere except PostgreSQL (system of record) and Redis (acceleration and coordination). A process crash is not a data-loss event — the state is in the database, and a new process picks up where the old one left off.
- **Zero-downtime updates.** The Swastik hot-reload system unloads and reloads modules at runtime without restarting the process. A module update takes effect immediately — no restart, no dropped interactions, no downtime.
- **Horizontal scaling.** Multiple bot processes share the same PostgreSQL and Redis infrastructure. Any process can handle any interaction. Load is distributed across processes. A process failure is handled by the orchestrator (Kubernetes), which spins up a replacement.

### 11.3 The Permission Engine

The seven-layer permission resolution engine is the authoritative model for authorisation across the entire feature surface; its single normative statement is `spec/request-layer/permission-authorization-engine.md` §21, to which this summary defers:

1. **Bot Owner Override** — the user is identified in `BOT_OWNER_IDS`; access granted unconditionally. This is an operator override, not a rank.
2. **Blacklist Check** — the user or guild is on a blacklist; access denied.
3. **Guild/Module Availability** — the module is enabled in this guild; if not, access denied.
4. **Channel Restriction** — the command is allowed in this channel; if not, access denied.
5. **Discord Native Permission** — the user has the required Discord permission bits; if not, access denied.
6. **RBAC Role** — the user's Dumby rank (OWNER/ADMINISTRATOR/MODERATOR/HELPER/MEMBER/RESTRICTED) grants access; if not, access denied. OWNER here is the guild's ownership account — distinct from the bot-owner override in Layer 1, which is not a rank.
7. **Explicit Grant Override** — a Layer 7 override (permit, whitelist, blacklist, cooldown, rate-limit) applies; it is consulted immediately after Layer 3, above Layers 4–6, and its outcome is final.

Resolution follows DIAGRAM 21-A in `spec/request-layer/permission-authorization-engine.md` §21 in the fixed sequence **1 → 2 → 3 → 7 → 4 → 5 → 6** — Layer 7 is consulted immediately after Layer 3, above Layers 4–6. Two scopes deny by default: the **module-availability check at Layer 3 fails closed** (an unknown or disabled guild/module denies rather than allows), and the **rank resolution at Layer 6 denies by default** (a command with no explicit permission declaration is unreachable by any non-owner user, and RESTRICTED is the automatic floor). Every other layer refines access above that floor; only Layer 1's operator override bypasses it.

No command handler implements any permission logic of its own. All authorisation logic lives exclusively in the resolver or in the middleware that calls it. This means permission policy is consistent across every module — there is one permission model, not N models that happen to agree most of the time.

---

---
