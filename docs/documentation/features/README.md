---
id: DOC-FEATURES
title: Features
kind: documentation
status: derived
version: 5.0.0
authority_scope: [features]
contracts: []
acceptance: []
owners: [framework-maintainers]
last_verified_commit: null
review_state: pending-evidence
---

# Features

What each part of the system is and how to use it. Every page is derived from the department
spec that owns the behaviour; the spec wins on any conflict.

- [core-command-surface](core-command-surface.md) — the commands a user can reach, and what each one does
- [module-system](module-system.md) — how modules are discovered, loaded, isolated and disposed
- [permissions-rbac](permissions-rbac.md) — the seven-layer permission engine and the RBAC model
- [renderer-presentation](renderer-presentation.md) — the core Renderer, the buffer contract and the formal notice frame
- [data-and-state](data-and-state.md) — PostgreSQL, Redis, the two-tier cache and the job queue
- [observability](observability.md) — logging, metrics and tracing
- [testing-and-flow](testing-and-flow.md) — the test tiers and the flow suite

Divergences between a page and the running code are recorded in `status/code-reconciliation.json`.
