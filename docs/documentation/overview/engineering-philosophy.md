---
id: DOC-OVERVIEW-0010
title: 10. ENGINEERING PHILOSOPHY
kind: documentation
status: derived
version: 5.0.0
authority_scope: [10-engineering-philosophy]
contracts: []
acceptance: []
owners: [framework-maintainers]
last_verified_commit: null
review_state: pending-evidence
---

## 10. ENGINEERING PHILOSOPHY

### 10.1 Explicit Over Implicit

Nothing is auto-detected by filename magic where a manifest field could say it explicitly. A command is a command because the manifest lists it, not because it lives in a folder named `commands/`. The manifest is a complete table of contents for a module without opening a second file. This principle eliminates an entire category of bug: the "it worked when I named the file correctly" class of failure.

### 10.2 Configuration Without Code

Anything an operator or guild administrator should reasonably change — a threshold, a channel ID, a currency name, a cooldown — is a configuration value, validated against a typed schema, never a constant requiring a code change and a redeploy. Configuration is per-guild, hot-reloadable, and validated against the module's Zod schema at write time. A guild admin changes a setting through the dashboard; the module's `onConfigChange` hook fires; the module reacts immediately. No restart. No redeploy.

### 10.3 Freedom by Default, Authority by Exception

Modules are free to act without asking, and the framework grants authority only through explicit, declared exceptions — never by default. A module is loaded, its commands are registered, its events are subscribed, and it begins operating. The framework does not require the module to request permission to function. Permission restrictions — rate limits, RBAC roles, blacklists — are exceptions layered on top of the default-allow posture, declared explicitly in the manifest or configured by the guild administrator.

### 10.4 Isolation Through Structure, Not Discipline

Module isolation is enforced by the build itself failing, not by reviewer discipline. ESLint rules prevent cross-module imports. Zod schema namespacing prevents configuration key collisions. The DI container prevents modules from accessing services they have not declared as dependencies. The ServiceLocator's tier-based access control prevents Marketplace modules from accessing Admin-tier services. These are not guidelines that rely on developers remembering to follow them — they are structural enforcement mechanisms that make violation impossible without changing the build configuration.

### 10.5 Security Built In, Not Bolted On

Security is built into the framework, not added as an afterthought. Input sanitisation is automatic — the InputSanitizer runs on every interaction. Output encoding is automatic — the ResponseBuilder encodes user content. Authentication is required for all web endpoints. Authorisation is enforced by the seven-layer permission resolution engine. Secrets are managed by the SecretsManager and are never exposed to modules. The Module Gateway verifies third-party modules before they are available for installation. The defence-in-depth strategy ensures that multiple security layers protect against different threat vectors — there is no single gate whose failure opens everything.

### 10.6 Production-Grade by Construction

Dumby is not a prototype that might grow into a production system. It is designed from the first commit for production deployment: stateless processes, externalised state, horizontal scaling, zero-downtime updates, structured logging, distributed tracing, metrics collection, circuit breakers, retry policies, dead-letter queues, and graceful shutdown. A single-server operator running one process benefits from the same architectural guarantees as a multi-region deployment serving tens of thousands of guilds — the guarantees are structural, not optional add-ons that a small deployment can skip.

---

---
