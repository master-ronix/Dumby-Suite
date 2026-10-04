---
id: DOC-OVERVIEW-0006
title: 6. THE UNIFIED MODULAR DOCTRINE
kind: documentation
status: derived
version: 5.0.0
authority_scope: [6-the-unified-modular-doctrine]
contracts: []
acceptance: []
owners: [framework-maintainers]
last_verified_commit: null
review_state: pending-evidence
---

## 6. THE UNIFIED MODULAR DOCTRINE

### 6.1 The Doctrine

The unified modular doctrine is the single governing idea from which every other decision in Dumby follows:

A bot should be **one coherent application** from the outside and **N independently-owned modules** from the inside, with a hard, tooling-enforced wall between "coherent" and "monolithic."

**Unified** means there is exactly one bootstrap sequence, one dependency graph, one event bus, one permission engine, one configuration system, and one operational surface, shared without exception by every feature the framework runs — including the framework's own administrative tooling, which ships as an ordinary module rather than as privileged, special-cased code.

**Modular** means every unit of behaviour is a self-contained, independently loadable, independently testable, independently disposable module with a declared contract for everything it needs and everything it exposes. A module owns its commands, its database tables, its event subscriptions, its jobs, its configuration schema, and its lifecycle. Nothing outside it reaches into that state without a declared, typed interface.

### 6.2 Why Both Words Matter

A system that is modular without being unified degenerates into a folder of loosely related plugins. Module 1 picks one logger; module 2 calls `console.log`; module 3 builds its own settings command because it never discovered a settings module already existed. Each plugin reimplements infrastructure that already exists, slightly differently, with slightly different bugs. The result looks modular on a directory listing but produces inconsistent behaviour across the feature surface.

A system that is unified without being modular degenerates into a monolith with feature flags standing in for real isolation. Every feature shares the same codebase, the same release cycle, and the same failure domain. Disabling a feature requires a code change. A bug in one feature can crash the whole process. Parallel engineering is high-collision because every PR touches shared files.

Dumby is engineered to make both failure modes structurally unavailable rather than merely discouraged. The application core enforces unification — there is exactly one instance of each core service per process, and no module ever constructs its own copy. The module contract enforces isolation — modules interact only through declared DI tokens, typed event subscriptions, and documented cross-module accessors, enforced by lint rules and compile-time type checking.

### 6.3 What the Doctrine Means in Practice

For a guild member: the commands they see are the commands their guild has enabled. Each command works independently. If the moderation module has a bug, the leveling module is unaffected. If the music module is disabled, the ticket module continues running.

For a guild operator: one bot, one dashboard, one permission system. When they enable a module, it inherits the guild's existing configuration. When they disable one, the rest continues. They manage features, not infrastructure.

For a developer: they write business logic, not infrastructure. The framework provides the Discord connection, the database, the cache, the event bus, the permission engine, the job queue, the logging, the metrics, the tracing, the configuration, the hot-reload, and the deployment pipeline. The developer provides what the module does — and nothing else.

---

---
