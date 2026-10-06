---
id: DOC-FEAT-CORE-COMMAND-SURFACE
title: Core Command Surface
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

# The Core Command Surface

The Core Command Surface is the reference set of renderer-issued commands an operator and a
member meet first. It is the operator's single settings surface — one home, one place to
install modules, one place to manage the guild's command surface — presented through the one
Renderer.

| Command | Tier | What it is for |
|---|---|---|
| `/dashboard` | core | the guild-admin home page — the entry point to everything else |
| `/health` | core | the health/status report |
| `/browse` | core | marketplace discovery — browse and install modules |
| `/queue` | core | the BCCM command-change queue (renames/aliases/deletions, batched) |
| `/persona` | core | Twill persona management |
| `/permit` | core | RBAC Layer 6/7 grants |
| `/modules` | core | module management — enable/disable per guild |
| `/hello` | standard | the reference module — the smallest complete example |

Every one of these is an ordinary module on the manifest contract; none is privileged
framework code. Core-tier commands are loaded for every guild and cannot be disabled by a
guild administrator; the one Standard-tier command (`/hello`) can be toggled. The guild's
total registered-command count is capped at **100** per guild, enforced at request time
against a computed projection.

The command set is single-sourced in `contracts/commands.json`; the per-page layouts are
specified in `spec/request-layer/` Divisions 3–10.
