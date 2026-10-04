---
id: DOC-FEAT-PERMISSIONS-RBAC
title: Permissions & RBAC
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

# Permissions & RBAC

Authorization is answered by one engine — the seven-layer permission resolver — and every
surface that needs an answer (the command pipeline and the web dashboard alike) calls through
it rather than keeping a parallel check.

**The seven layers**, in order: (1) global bot-owner override, (2) blacklist, (3) guild and
module availability, (7) guild-side grant override — consulted immediately after layer 3 — then
(4) channel restriction, (5) the Discord permission bitfield, and (6) the RBAC rank. Layers 5
and 6 combine conjunctively. Each layer returns a definitive allow, a definitive deny, or a
pass; only if every layer passes does resolution fall through to allow.

**The fail-open / fail-closed asymmetry is deliberate.** Layers 2, 3, 5, and 6 fail closed
(deny on data unavailability); layers 4 and 7 fail open (allow / no grant). Layers that gate
access to something destructive fail closed; layers that merely refine an already-granted
access fail open.

**RBAC is a pure backend rank function.** A member's rank — OWNER, ADMINISTRATOR, MODERATOR,
HELPER, MEMBER, RESTRICTED — is evaluated from live Discord state on every interaction and
never written anywhere. The ladder is inclusive upward. Guilds configure **groups** (named
mappings from Discord roles to a grant scope) and **sets** (bundles of groups); these exist
purely as Layer-7 scope targets, never as a rank source.

**Layer 7 grants** — permit, blacklist, whitelist, cooldown, and rate-limit — are the most
specific override, applying to module commands only, resolved fresh per interaction, with the
scope hierarchy role > group > set. Their override boundary is exhaustive and non-configurable.

The full model is in `spec/request-layer/` §21; `contracts/rbac.enums.json` carries the rank
and grant enumerations.
