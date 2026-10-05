---
id: SPEC-00-ORIENTATION-0000-0000-0-2-HOW-TO-READ-THIS-REFE
title: 0.2 How To Read This Reference
kind: spec
status: normative
version: 5.0.0
authority_scope: [00-orientation]
contracts: []
acceptance: [ACC-ORI-0002B-1]
owners: [framework-maintainers]
last_verified_commit: null
review_state: pending-evidence
---

## 0.2 How To Read This Reference

Three reader profiles recur throughout; each has a different honest entry point.

```
READER PROFILE PRIMARY INTEREST START AT
─────────────────────────────────────────────────────────────────────────
Module author "How do I ship one feature safely Part III (§11–§12),
 without learning the whole system?" then Part IV (§17–§21)

Platform / SRE operator "How do I run this in production, Part II (§8–§9),
 scale it, and not get paged at 3am?" Part VI, Part VIII

Framework maintainer / "How does the whole system fit Front to back —
architecture reviewer together, and why these choices?" Parts I → IX in order
```

> **Complexity trade-off:** First-command authors touch 28+ manifest fields,
> 11+ command-class fields, service injection, repository pattern, and middleware
> priorities. Progressive disclosure (P12) is stated but the framework is
> necessarily complex — this is a legitimate but real onboarding trade-off.

> **Length caveat:** This reference is ~988 KB (12,699 lines) — an encyclopedia,
> not a quick reference. Module authors may feel overwhelmed. Layered
> docs with a quick-start separate from the full reference are the
> target state. Use the reader-profile table above to find your entry point.

A module author who only ever reads §11 (Module Anatomy), §12 (Worked Example), §17
(Command Framework), and §21 (Permission Engine) has enough to ship a correct,
well-behaved module. A single-server operator running one process, one database, and
no active/standby redundancy should read Part I for the architecture and can safely
defer the two-approver release gate (§40.4) and on-call assumptions (§43) until — if
ever — the deployment grows into needing them; §41.6's cloud-provider reference table
states plainly which infrastructure tier corresponds to which audience.

> **Note on `directory.md`:** The project structure document (`docs/directory.md`) describes an aspirational target layout. Many directories it specifies (`_template/`, `src/http/middleware/`, `src/db/migrations/core/`, `tests/smoke/`, `tests/e2e/`, `tests/chaos/`, `deploy/terraform/modules/cache/`, `tools/release_manager/`) do not yet exist in the delivered repository subset. Reserved directories are honestly labeled as such.

## Acceptance
```acceptance
- id: ACC-ORI-0002B-1
  check: "The reading guide names the two reader profiles and the load-on-demand rule"
  test: tests/docs/how-to-read.spec.ts
```
