---
id: DOC-OVERVIEW-0009
title: 9. CORE IDEOLOGY — THE SEVEN PILLARS
kind: documentation
status: derived
version: 5.0.0
authority_scope: [9-core-ideology-the-seven-pillars]
contracts: []
acceptance: []
owners: [framework-maintainers]
last_verified_commit: null
review_state: pending-evidence
---

## 9. CORE IDEOLOGY — THE SEVEN PILLARS

These are the standing principles that govern every decision in Dumby — architecture, development, operations, and product strategy. Every feature, every trade-off, every exclusion traces back to one or more of these pillars.

### Pillar 1 — Module Sovereignty

A module owns its commands, its database tables, its event subscriptions, its jobs, its configuration schema, and its lifecycle outright. Nothing outside it reaches into that state without a declared, typed interface. This is what makes a module independently developable, independently testable, and independently disposable. A module can be rewritten from zero without any other module or the core knowing — as long as it honours its declared contract.

### Pillar 2 — Contract Over Convention

Cross-module interaction happens through manifests, typed DI tokens, and a documented event catalog — never by importing another module's files or guessing its table names. Convention says "you should do it this way." Contract says "you cannot do it any other way." Dumby uses contracts because conventions degrade under pressure — a deadline approaches, a developer takes a shortcut, and the convention is violated. A contract enforced by the compiler and the build system cannot be violated without the build failing.

### Pillar 3 — Fail Fast, Degrade Gracefully

Misconfiguration is caught at boot — the process refuses to start half-broken. Once live, one module's failure degrades only the capability it owned — never cascading to crash the process or affect other modules. A moderation module that throws an error disables itself; the leveling module, the music module, and the ticket module continue running. The error is logged, the module is marked as in error state, and the administrator is notified. The system does not pretend the failure did not happen, but it does not let it spread.

### Pillar 4 — Observability by Default

Every command, every job, and every lifecycle transition emits structured logs, metrics, and trace spans without hand-written instrumentation. A developer does not need to remember to add logging — the framework wraps every handler, every job, and every event subscription automatically. This is what makes Dumby operable at scale: when something goes wrong in a deployment serving hundreds of guilds, the operator can find the problem through metrics and traces rather than through guesswork.

### Pillar 5 — One Operational Surface

One Dockerfile, one health endpoint, one metrics endpoint, one config loader, one migration runner — regardless of module count. A deployment with forty modules has the same operational surface as a deployment with four. The operator does not learn a new monitoring interface for each module, because there is one. The operator does not run a different migration command for each module, because there is one migration runner that handles every module's migrations in declaration order. This is what makes Dumby unified in practice, not just in theory.

### Pillar 6 — TypeScript as Design Material

The module contract, the DI container, the event bus, and the command interface are defined so that a whole class of integration bug is rejected at compile time — before a test even runs. TypeScript strict mode is not a preference; it is the production stack. The manifest schema, the command class interface, the event catalog, and the repository layer are all defined using TypeScript types and generics in ways that let the compiler catch the bugs that would otherwise be discovered at runtime, in production, at 3 AM.

### Pillar 7 — Progressive Disclosure

A first command touches one file and one interface. A stateful, job-scheduling, cache-backed module has the whole framework available — nothing forced on the simple case. A developer writes the minimal manifest first and adds commands, events, jobs, and configuration schema only as the module grows. The framework provides a template module that is the smallest correct starting point, and the manifest supports progressive field addition. This is what makes Dumby accessible to developers building their first module while not limiting what they can build as they grow.

---

---
