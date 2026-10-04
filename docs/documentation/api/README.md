---
id: DOC-API
title: API Reference
kind: documentation
status: derived
version: 5.0.0
authority_scope: [api]
contracts: []
acceptance: []
owners: [framework-maintainers]
last_verified_commit: null
review_state: pending-evidence
---

# API Reference

The machine-readable interfaces of the system, generated from `contracts/`:

- [commands](commands.md) — the Core Command Surface (8 commands, 100-per-guild ceiling)
- [endpoints](endpoints.md) — the HTTP surface (health, metrics, info, MDIS, Swastik, control plane)
- [errors](errors.md) — the error taxonomy (base + 14 concrete classes)
- [events](events.md) — the gateway events and the internal domain-event catalogue

Every contract carries an `$id` and is validated by a CI gate. Where a contract and the
running code differ, the difference is recorded in `status/code-reconciliation.json`.
