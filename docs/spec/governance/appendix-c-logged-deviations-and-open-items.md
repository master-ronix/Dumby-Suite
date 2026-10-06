---
id: SPEC-00-GOVERNANCE-0013
title: APPENDIX C — LOGGED DEVIATIONS (TRUE UNKNOWNS WITH NO OWNING ROW)
kind: spec
status: normative
version: 5.0.0
authority_scope: [00-governance]
contracts: []
acceptance: [ACC-GOV-0013-1]
owners: [framework-maintainers]
last_verified_commit: null
review_state: pending-evidence
---

# APPENDIX C — LOGGED DEVIATIONS (TRUE UNKNOWNS WITH NO OWNING ROW)

Each item below is specified nowhere and owned by no request row or migration work-order item. It is recorded here as a **logged deviation** rather than silently dropped. Each is routed to the M9 residual tail unless a dedicated row is raised; where an item already carries a partial implementation, its scope gap is stated.

| # | Gap | Home |
|---|---|---|
| 1 | `InputSanitizer` input hardening (§32.10) — specified, not implemented; validation today is the Zod input-validator stage | blueprint §32.10 ([SPEC], logged deviation) |
| 2 | Dynamic token-leak scanning + owner alert (§32.8) | M9 residual |
| 3 | D-7.5.5 policy lockfile / ESM import restriction / `no-direct-interaction-reply` lint | M9 residual |
| 4 | Owner-approval workflow clause (UR-B-01) — reopened PARTIAL | M9 residual |
| 5 | Connection/byte limits clause (UR-C-06) — reopened PARTIAL | M9 residual |
| 6 | Audit-log partitioning + retention (§24.2.1) | M9 residual |
| 7 | Standard `createdBy`/`updatedBy` audit columns (§24.5) | M9 residual |
| 8 | Read-replica routing + `DATABASE_SSL`/`REDIS_TLS` | M9 residual |
| 9 | `eventsCatalog` payload schemas + enforcement gates | M9 residual |
| 10 | Redis pub/sub cross-process L1 invalidation | M9 residual |
| 11 | OpenAPI publication + Compatibility-Ledger registration for HTTP families | M9 residual |
| 12 | The five §43 runbooks | M9 residual |
| 13 | Repository-pattern adoption (raw `db.knex` bypass) | M9 residual |
| 14 | `blocked_users.expiresAt` + global-block uniqueness hole | M9 residual |
| 15 | Worker-only bootstrap + `ROLE=worker` assertion | M9 residual |
| 16 | Configmap ↔ `ENV_KEYS` drift guard (`check-configmap-keys.mjs`) | M9 residual |
| 17 | Husky / commitlint dead wiring | M9 residual |
| 18 | `analytics` / `mdis` / `webhooks` / `operational` / `cli` subsystems | M9 residual |
| 19 | Split-brained maintenance mode; in-memory idempotency / rate-limit | M9 residual |
| 20 | Component-path bypass of the Renderer; invoker re-check bypass for non-minted customIds | M9 residual |
| 21 | Dead legacy colour palette + `EMBED_COLORS` | M9 residual |
| 22 | Duplicated component constants (`components-v2.ts` vs `constants/index.ts`) | M9 residual |
| 23 | Persona ids from a process-local counter | M9 residual |
| 24 | i18n wiring + mandatory `en-US.json` Stage-11 validation | M9 residual |

---

Beyond these twenty-four, every capability specified in blueprint Parts V–IX
— locale resolution, usage metering, the full security architecture, SLO
alerting, privacy/erasure, persona governance, the testing pyramid, and the
complete CI/CD and infrastructure reference — is load-bearing in its own
right and governed by the corresponding part of this directive. The
twenty-four above are the capabilities most load-bearing to get right
*first*, not an exhaustive restatement.

---

**End of directive.** Version 5.0.0 — record all future revisions in
`change-log.md`.

## Acceptance
```acceptance
- id: ACC-GOV-0013-1
  check: "Each logged deviation is owned by a row or explicitly deferred (no silent unknowns)"
  test: tests/ci/deviations-owned.spec.ts
```
