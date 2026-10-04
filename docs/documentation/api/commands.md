---
id: DOC-API-COMMANDS
title: API — Core Commands
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

# Core Command Surface

The reference set of renderer-issued commands, single-sourced in `contracts/commands.json`.

| Command | Tier | Role |
|---|---|---|
| `/dashboard` | core | guild admin home |
| `/health` | core | health / status |
| `/browse` | core | marketplace discovery |
| `/queue` | core | BCCM command-change queue |
| `/persona` | core | Twill persona management |
| `/permit` | core | RBAC Layer 6/7 grants |
| `/modules` | core | module management |
| `/hello` | standard | reference module |

**Ceiling:** 100 registered commands per guild. The ceiling is enforced at request time
against a computed projection (accounting for every other queued change against the same
batch), not after the fact.

Each command is an ordinary module on the manifest contract; the Core-tier set is
non-disableable and the one Standard-tier command is toggleable. Per-page layouts are in
`spec/request-layer/` Divisions 3–10.
