---
id: SPEC-00-ORIENTATION-0000-0000-0-4-SYSTEM-AT-A-GLANCE
title: 0.4 System-at-a-Glance
kind: spec
status: normative
version: 5.0.0
authority_scope: [00-orientation]
contracts: []
acceptance: [ACC-ORI-0004-1]
owners: [framework-maintainers]
last_verified_commit: null
review_state: pending-evidence
---

## 0.4 System-at-a-Glance

```
FIGURE 0-A — DUMBY IN ONE DIAGRAM

 ┌───────────────────────────────────────────────────────────────────┐
 │ DISCORD PLATFORM │
 │ (Gateway WebSocket · REST API · Interactions API) │
 └──────────────────────────────┬────────────────────────────────────┘
 │ one connection per shard
 ┌──────────────────────────────▼────────────────────────────────────┐
 │ APPLICATION CORE — the "Unified" half of the doctrine │
 │ │
 │ Bootstrap → DI Container → Event Router → Command Router │
 │ Middleware Pipeline → Permission Engine → Config Manager │
 │ Cache Manager → Database Manager → Job Queue → HTTP Server │
 │ │
 │ Exactly one instance of each of the above per process. No │
 │ module ever constructs its own copy of any core service. │
 └──────────────────────────────┬────────────────────────────────────┘
 │ loaded through the Module Registry,
 │ every seam typed and declared
 ┌──────────────────────────────▼────────────────────────────────────┐
 │ MODULE LAYER — the "Modular" half of the doctrine │
 │ │
 │ N independently-owned vertical slices, each with its own │
 │ commands, events, services, repositories, jobs, migrations, │
 │ locales, and tests — visible to each other only through what │
 │ each module's manifest explicitly publishes. │
 └───────────────────────────────────────────────────────────────────┘
 │
 ┌──────────────────────────────▼────────────────────────────────────┐
 │ EXTERNALIZED STATE — PostgreSQL (system of record) + Redis │
 │ (acceleration & coordination). No cross-process state lives │
 │ anywhere else, ever (§26.1). │
 └───────────────────────────────────────────────────────────────────┘

 Parallel, separately-deployed control-plane services (never modules,
 never part of the gateway-connected process):
 • Power Engine Panel (Power Engine) — global administrative authority (§22)
 • CLAI — operator terminal: a real ssh2 public-key SSH server at src/entry/ssh-clai.ts (§22.6)
 • Swastik — deployment / hot-reload / hot-swap (§15)
 • Credentials Service — shared credential issuance (§22.8)
 • Persona processes — additional bot identities (§35)
```

The two design words carrying the whole system are **Unified** and **Modular**, and
neither is decorative. *Unified* means there is exactly one bootstrap sequence, one
dependency graph, one event bus, one permission engine, one configuration system, and
one operational surface, shared without exception by every feature the framework runs
— including the framework's own administrative tooling, which ships as an ordinary
module rather than as privileged, special-cased code. *Modular* means every unit of
behavior is a self-contained, independently loadable, independently testable,
independently disposable module with a declared contract for everything it needs and
everything it exposes. A system that is modular without being unified degenerates into
a folder of loosely related plugins, prone to drift and silent incompatibility. A
system that is unified without being modular degenerates into a monolith with feature
flags standing in for real isolation. Dumby is engineered to make both failure modes
structurally unavailable rather than merely discouraged — the Application Core (Part
II) enforces unification; the Module Contract (Part III) enforces isolation.

---

## Acceptance
```acceptance
- id: ACC-ORI-0004-1
  check: "The system-at-a-glance diagram matches the current architecture"
  test: tests/docs/system-at-a-glance.spec.ts
```
