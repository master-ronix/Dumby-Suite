# Migration Ledger — v5.0.0 Re-Baseline

> This file is the single source of truth for migration progress. The agent reads it at the start of every session and updates it at the end of every item and slice. An item without a record here did not happen; an IN-PROGRESS item with a resume note is continued, never restarted. A closed request row without its change-log line (rule R11) did not happen either.

- **Created:** 2026-10-01
- **Last updated:** 2026-10-02 (v1.16) · **Current item:** **M8 DONE** · **Next item:** M3/M4 residuals (HttpClient 429, prefix-ban audit, grant-writer wiring) → MR-1
- **Protocol:** `docs/migration-prompt.md` v5.3.0 (rules R1–R12; work order M0–M8 → MR-1…MR-8 → M9–M11)
- **Record shapes:** `docs/migration-ledger-template.md` v2.2 §3 (item) and §4 (slice)
- **Coverage map:** 121 request rows (UR-20260918-001 §8.1.2) → one owning item each, per the prompt's §3.0
- **Construction note:** this ledger was built entry by entry from the template's record shapes, seeded with the template's §2 snapshot — it is **not** a copy of the template file. The retired pre-5.1.0 session ledger (removed from the repository at `df1225e`; originally created 2026-09-26 after `9f7e427`) is recoverable in git history at `0c625c1`; its slice 1–5 records and its findings/deviations registers are **carried forward below in condensed form** with that commit named as their provenance, because they are the only surviving record of landed work.
- **Reconciliation:** R12 state-of-record reconciliation is **PARTIAL** — the M0 correction (UR 2.0 §8.13.2 SC-01) is recorded below; the M1–M9 tree triage is **not yet performed** and therefore blocks M1 (see the reconciliation block).

---

## Summary

| Item | Title | Status |
|------|-------|--------|
| M0 | P0 security flaws (17 severity-Critical suite rows) | **DONE** — slices 1–5 landed (`0c625c1`); slices 6a, 6b, 6c-i, 6c-ii, 6c-iii and 6c-iv landed. Row board **16 DONE / 1 PARTIAL / 0 OPEN** (UR-A-03 routed to M9). |
| M1 | Tier volumes & blind discovery | **DONE** — R12-credited (rows 4/5/19); directory target met, `packages/swastik` present; manifest-contract drift routed to M6 |
| M2 | Unified command tree | **PARTIAL** — R12: merge DONE (unified `src/commands`, no `src/core`); the deployer still does boot-time delete-then-reregister, whose remedy (change queue/BCCM) is M9's row 44 |
| M3 | Core Renderer, buffer-then-render, embed ban | **PARTIAL** — R12: renderer + embed ban + DM prohibition + interaction registry present; done-gate gated on MR-1…MR-8 (command surface is stubs); row 120 (HttpClient/retry) routed to M9 |
| M4 | RBAC Layer 6/7 redesign | **DONE** — R12: ranks/grant surface/blacklist/persistence/resolver present; runtime grant writer implemented (`rbac-grant.repository.ts`); writer wiring routed (finding #25) |
| M5 | License machine, Compatibility Ledger, Deployment Records | **DONE** — R12: rows 2/6/18/20 already landed (M0); row 8 deployment-records writer implemented + wired; E4 `tools/release_manager` now under the typecheck gate; row 23 routed to M6 |
| M6 | Swastik promotion pipeline | **PARTIAL** — R12: pipeline + provenance present; finding #23 fixed (loader guard armed in `bootstrap.ts`); **manifest single-source (E9 D3) + `packages/swastik` layout drift (E2 S-26) outstanding** |
| M7 | Twixter persona model | **DONE** — R12: persona model/bindings/migrations present; ADR-003 gap fixed (persona bot token now stored sealed, not only as a digest) |
| M8 | Envelope encryption | **DONE** — R12: envelope + sealed credentials present; scope-boundary verification implemented (`CREDENTIAL_STORE_INVENTORY` + `verifyEnvelopeScope` + audit test) |
| MR-1 | hello-world module rewrite (Standard-tier) | NOT STARTED — module sources live in `packages/modules/` (lifecycle-only stubs today) |
| MR-2 | health module rewrite (Core-tier) | NOT STARTED |
| MR-3 | browse module rewrite (Core-tier) | NOT STARTED |
| MR-4 | queue module rewrite (Core-tier) | NOT STARTED |
| MR-5 | persona module rewrite (Core-tier) | NOT STARTED |
| MR-6 | permit module rewrite (Core-tier) | NOT STARTED |
| MR-7 | modules module rewrite (Core-tier) | NOT STARTED |
| MR-8 | dashboard module rewrite (Core-tier) | NOT STARTED |
| M9 | Remaining implementation-flaw corrections | Record: NOT STARTED — **tree: shaped code present** (`m9-*` suites) — reconcile, R12 |
| M10 | Terminology & legacy-name sweep | NOT STARTED — record says NOT STARTED, §3.0.3 reports the living set already clean |
| M11 | Convergence pass | NOT STARTED — the only item that may run a full-project gate (R5) and the master prompt's audit protocol |

Statuses: `NOT STARTED` → `IN-PROGRESS` → `DONE` / `BLOCKED` / `SKIPPED (reason)`. A record of NOT STARTED with shaped code in the tree is a **reconciliation finding**, not a green light to rebuild (R12).

---

## State-of-Record Reconciliation (R12 / §3.0.2) — DONE

| Step | Status | Record |
|---|---|---|
| 1. Rebuild the ledger from the tree | **DONE (structure)** | This file, built from the template's shapes; no wholesale copy. |
| 1a. Re-triage **M0's 17 P0 rows** against the tree | **DONE** | M0 item record below, re-verified 2026-10-01 at working HEAD (`ac599fe`). |
| 1b. Re-triage the other 104 rows against the tree | **DONE (item level, 2026-10-02)** | Every item M1–M11 re-triaged against the tree at `2c5d801`; verdicts in the table below. MR-1…MR-8 own no source rows. |
| 2. Correct the M0 record (5 DONE / 9 PARTIAL / 3 OPEN) | **DONE** | UR 2.0 §8.13.2 SC-01 — UR-B-01, UR-B-03, UR-C-06 reopened to PARTIAL. |
| 3. Record ahead-of-record work (SC-02) | **DONE** | Credited per the owner's decision on UR §8.1.3 #19 — credit where the tree meets the row; see the verdict table. |
| 4. Record corrections SC-04 and CF-22 | **DONE** | Applied at slice 6a's close (deviation #13). |
| 5. Resolve the blocking open questions | **RESOLVED (2026-10-02, owner)** | #13 keep flat `src/` (route any restructure to M10/M11); #14 `packages/modules/<slug>/` is canonical (document it); #15 hello-world tier — MR-1's decision, carried; #18 the env-default volume vocabulary is canonical; #19 credit ahead-of-record work where the tree meets the row. |

### R12 re-triage verdicts (item level, against the tree at `2c5d801`)

| Item | Rows (§3.0 map) | Verdict | Tree evidence / residue |
|---|---|---|---|
| M1 | 4, 5, 19 | **DONE** | Blind discovery at `MODULE_DISCOVER`, no hardcoded module list (row 5); `src/modules` absent, five tier volumes mounted under `/mnt/modules`, tier-at-rest enforced by volume (row 19); `packages/swastik` present with scoped entry points (`./entrypoints/core|admin|standard|marketplace`) (row 4). Row 4's manifest-contract drift is M6's (rows 57–58, 75–76, 78, 83, 89, 105, 113, 117). |
| M2 | 74 | **PARTIAL** | Unified `src/commands/` present; no `src/core/commands` remnant. Single-router behaviour unverified. |
| M3 | 9–12, 21, 28, 111, 120 | **PARTIAL** | `core-renderer.ts` wired into the router; buffer-then-render, notice frames, embed ban (`m3-embed-and-dm.test.ts`) present; all 8 modules are stubs → done-gate NOT met. |
| M4 | 32–33, 40–42 | **PARTIAL** | RBAC tables (migrations 14–17) + `src/permissions/*` present; no runtime grant writer; role-vocabulary drift. |
| M5 | 2, 6, 8, 18, 20, 23 | **PARTIAL** | License machine, compatibility ledger, deployment records, migration 33 present; `tools/release_manager` outside the quality gate. |
| M6 | 15, 25–27, 30, 57–58, 75–76, 78, 83, 89, 105, 113, 117 | **PARTIAL** | `promotion.ts` + `m6-promotion.test.ts` present; manifest single-source + `packages/swastik` layout drift remain. |
| M7 | 16, 29, 45–46, 112 | **PARTIAL** | `src/personas/*`, migrations 20/21/34, `m7-persona.test.ts` present; ADR-003 token-digest gap. |
| M8 | 22 | **PARTIAL** | `src/crypto/*`, sealed credentials, migration 35, `m8-envelope.test.ts` present; scope-boundary verification. |
| M9 | the remaining 57 rows (§3.0 map) | **PARTIAL** | `m9-*` suites + `createHmac` present; runtime largely inert (queues/scheduler/gateway/tracing/metrics); CI hygiene. |
| M10 | 3 | **PARTIAL** | Canonical vocabulary clean in the living set; residual legacy in non-living files. |
| M11 | 13, 14 | **NOT STARTED** | The measurement/honesty audits + the 121/121 reconciliation itself. |

Each item's row-level triage is copied into its item record when it is claimed (prompt §3.0). The M1–M9-shaped code is now **credited** where the tree meets the row (owner decision #19), so the verdicts above are the credited tally, not a PRESENT-IN-TREE placeholder.

**Provenance of the ahead-of-record work** (E10 RC-5; commits verified): the prior ledger was removed at `9f7e427` (2026-09-26); the v5.0.0 re-baseline work landed at `d334cfb` + `581499e` (2026-09-26) with no ledger record and no R11 lines. **Contradiction recorded, not propagated:** E9 (`Dumby-Suite-Audit_2.md` §27/D28) asserts `packages/modules` is absent; E2 S-27, E5 MOD-02, E7 A1, E10 I11 and direct tree inspection confirm eight packages are present. The tree wins.

**Evidence-set internal inconsistency:** E9 §27/D28 vs. E2 S-27 on `packages/modules` — the triage trusts the tree (see above).

**Volume-path vocabulary** (E7 F3; E10 C-10/I12): deployed staging `/mnt/modules/swastik-staging`, live `/mnt/modules/modules-core`, both nested inside `MODULES_DIR=/mnt/modules`. `STATUS.md` / `directory.md`'s `/data/swastik-*` is the wrong vocabulary. Code name: `TIER_VOLUME_NAMES` = `modules-admin/core/standard/marketplace` + `swastik-staging`.

**M0 landing history:** slices 1–5 committed on `feature/dev` in `0c625c1` (2026-09-29). Last verified state at that commit: 75 files / 876 tests green; typecheck, lint, format, coverage clean. **Not re-verified in this session yet** — see the M0 item record's verification note.

---

## Item Records

### M0 — P0 security flaws

- **Status:** DONE (all 17 rows triaged: 16 DONE, 1 PARTIAL-routed to M9)
- **Started:** 2026-09-26 · **Completed:** 2026-10-02
- **Request rows owned (from the coverage map, prompt §3.0):** 17 severity-Critical suite rows — UR §8.1.2 rows 34–37 (`UR-A-01`…`UR-A-04`), 64–69 (`UR-B-01`…`UR-B-06`), 92–98 (`UR-C-01`…`UR-C-07`)
- **Evidence references (UR 2.0 §8.13):** SC-01 (three rows overstated); SC-02 (ahead-of-record work); TU-25-class security residuals (§32.10 InputSanitizer, §32.8 token-leak scanning, D-7.5.5 policy lockfile — no owning item, prompt §3.0.4); E1 §3, E3 §1.2, E6 GOV-01 for the reopened rows
- **Provenance of ahead-of-record work (if any):** none for M0's rows — M0's own landed slices are `0c625c1` (recorded). The 5 DONE / 9 PARTIAL / 3 OPEN correction itself is UR 2.0's, not the tree's.
- **Source of truth read:**
  - `docs/ur/UR-20260918-001_Consolidated_Re-Baseline_Request.md` §8.1.2 rows 34–37, 64–69, 92–98 — **read 2026-10-01** (the 17 P0 rows in full)
  - `docs/blueprint.md` §15.8 (Swastik internal auth; provenance columns; Ed25519; signed descriptor), §15.9 / "Runtime Import Verification — Hash Check, Cache-Busting, Manifest Match" (blueprint:4782), §22.5 (internal-surface auth), §22.8 (Credentials Service; TABLE 22-D credential-handling discipline), §32 (credential leak model), §21/§24.2 where a row names them
  - `docs/migration-prompt.md` §3.0 (coverage), §3.0.2 (R12), §3.0.3 (tree-state evidence map), §3.0.4 (true unknowns), §M0, §4 (per-item loop), §5 (slice mechanics), §6 (R11) — **read 2026-10-01**
- **Blast radius (declared 2026-09-26 by the retired ledger, carried forward; slice-6 sub-radius declared separately below — R2):**
  - Control-plane auth / bind: `apps/main/src/http/server.ts`, `apps/main/src/http/internal-auth.ts`, `apps/main/src/http/routes/admin.routes.ts`, `apps/main/src/http/routes/info.routes.ts`, `apps/main/src/http/power-engine-dispatcher.ts`, `apps/main/src/config/env.schema.ts`, `apps/main/.env.example`, `apps/main/docker-compose.yml`
  - Entry points: `apps/main/src/entry/swastik.ts`, `apps/main/src/entry/pep.ts`, `apps/main/src/entry/ssh-clai.ts`, `apps/main/src/entry/credentials.ts`, `apps/main/src/entry/twixter.ts`
  - Path containment: `apps/main/src/shared/utils/path-guard.ts`, `apps/main/src/module-system/swastik-loader.ts`, `apps/main/src/module-system/promotion.ts`
  - Dispatch: `apps/main/src/commands/command-router.ts`
  - Credentials / provenance storage: `apps/main/src/credentials/**`, `apps/main/src/db/migrations/**`, `apps/main/src/db/repositories/**` (sealed-credential + any new credential/build-provenance repositories)
  - Logging: `apps/main/src/logging/logger.ts` (UR-C-05's "no fragments in logs" clause; finding #9)
  - Tests: `apps/main/tests/unit/m0-*.test.ts` (new/extended only), plus fixture corrections declared per slice as deviations
  - Everything else read-only for M0. Bootstrap stages, DI, shutdown, renderer, RBAC, personas, crypto internals and the command tree are OUT of the fence (R4) — including `bootstrap.ts`, whose *bind-host literals* are in the fence but whose stage sequence is not.
- **Row triage (tree-vs-UR, re-verified 2026-10-01 at `ac599fe` — status is against the tree, not the UR document):**

| Row | UR §8.1.2 | Subject | Tree state (verified 2026-10-01) | Status |
|---|---|---|---|---|
| UR-A-01 | 34 | PEP/admin trust self-declared `source`; binds all interfaces | `source` derived from `request.ip`, never the body; `/admin/*` behind the constant-time key; three bind hosts default to `127.0.0.1` | DONE |
| UR-A-02 | 35 | CLAI TCP-fingerprint REPL | `entry/ssh-clai.ts` is a real ssh2 public-key-only server; no TCP REPL in tree | DONE |
| UR-A-03 | 36 | Ad-hoc dispatch; middleware dead; unknown tiers fail open | Tier fail-open closed in slice 4; residue is the row's own named UR-C-09 dependency (4 of 12 middlewares inert — finding #3) plus `createMiddlewareContext`'s `meta: {}` (finding #17) | **PARTIAL, routed → M9** |
| UR-A-04 | 37 | PEP stubs fake success | All 22 no-op PEP actions answer 501 `NOT_IMPLEMENTED` with no state write and no false `allowed` audit row | DONE |
| UR-B-01 | 64 | `/internal/deploy` auto-approves unknown developers | Auto-approve insert gone; 403 for unknown/pending at `swastik.ts:538-545`. **Residue (SC-01): no owner approval workflow** — `approvalStatus` is only ever written `pending` (register) or `declined` (admin route); the sole `approved` writer in-repo is `scripts/seed-first-party-modules.ts:175,182`, an operator script, not an approval surface. **Slice 6c-iii:** the `developer_approvals` table (migration 41), the governance surface `POST /admin/governance/developers/:devId/{approve,decline}`, the pending-request workflow a refused deploy creates, and credential activation through the Credentials Service. Owner-list/credential-activator wiring routed (finding #24) | DONE (slice 6c-iii) |
| UR-B-02 | 65 | Upload/deploy bodies unvalidated; paths from raw `version` | `path-guard.ts` + Zod cover `swastik.ts`/`promotion.ts`; slice 2 closed the loader half. `swastik.ts:330,331,583,584` join `manifest.json`/`index.js` onto a `safeJoin`-derived staging dir | DONE |
| UR-B-03 | 66 | Internal surfaces expose 0.0.0.0; key never checked | Constant-time preHandler everywhere; `API/HEALTH/METRICS_BIND_HOST` default `127.0.0.1`; compose loopback-pinned. **Residue (SC-01): bind-host configurability covers 1 of 5 entry-point services** — only `credentials.ts` sources its host from env (`CREDENTIALS_SERVICE_BIND_HOST`); `pep.ts:94`, `ssh-clai.ts:183`, `swastik.ts:742`, `twixter.ts:74` still hardcode the loopback literal (pre-6c-i). **Slice 6c-i:** all four now source their host from `PEP_BIND_HOST`/`CLAI_BIND_HOST`/`SWASTIK_BIND_HOST`/`TWIXTER_BIND_HOST`, each defaulting `127.0.0.1` | DONE (slice 6c-i) |
| UR-B-04 | 67 | Loader imports any file on the live volume | `builds` (migration 32) carries **no** provenance columns; `swastik-loader.ts:160` imports with no hash verify, no signature, no quarantine, no cache-bust (pre-6b). **Slice 6b:** migration 39 adds the eight provenance columns; `build-signing.ts` signs/verifies with an in-process key; the loader verifies the on-disk artifact against the `builds` row and refuses + quarantines on any mismatch | DONE (slice 6b) |
| UR-B-05 | 68 | Developer identity self-declared tokens | No `credentials` table (no migration creates one); `devId` is the `developers` PK (migration 32:10) **and** the bearer token: `swastik.ts:224` returns it, `:231,241,356` accept it as `Bearer <devId>` (pre-6a) | DONE (slice 6a) |
| UR-B-06 | 69 | PEP trusts body `source`; audit lies | `source` server-derived on all three surfaces; false `allowed` rows removed with the no-op handlers | DONE |
| UR-C-01 | 92 | Request-derived path components unvalidated | `safeJoin`/`assertPathInside`/`assertSafeSlug`/`assertSafeVersion` present and applied on every request-derived join; loader entry names parsed + realpath containment (slice 2) | DONE |
| UR-C-02 | 93 | Swastik `/internal/*` unauthenticated | One shared constant-time preHandler is the app's only gate; default-protect with an explicit three-route developer exemption; `INTERNAL_AUTH_DENIED` audit row; both in-repo clients present the header (healthcheck, `verify-all.ts`, `swastik-deploy.ts`) | DONE |
| UR-C-03 | 94 | No module ownership; auto-approver exists | Auto-approver gone. **Slice 6c-ii landed:** migration 40 adds the `modules` ownership table (`slug`, `ownerDevId`, `createdAt`, `ownershipTransferredAt`); the upload and deploy routes claim a fresh slug and refuse a non-owner (`MODULE_UPLOAD_DENIED_NON_OWNER` / `MODULE_DEPLOY_DENIED_NON_OWNER`) before staging; `manifest.devId` is now required on upload. **Residue: the DB constraint against internal approvals** (needs the approvals table) — **landed in slice 6c-iii** (the `developer_approvals` actor CHECK) | DONE (slices 6c-ii + 6c-iii) |
| UR-C-04 | 95 | Credentials Service broken and unauthenticated | `readable` branch is real (envelope-sealed). **Residue: the argon2 branch inserts `{id, credentialHash, label, registeredBy, revokedAt}` into `api_sessions`, which has `userId`/`sessionTokenHash`/`expiresAt`/`createdAt` — the insert cannot execute** (`credentials.ts:56-68`); no verify endpoint; no rate limit; no `bodyLimit` | DONE (slice 6a) |
| UR-C-05 | 96 | devIds plaintext; differentiated failures | **No `devIdHash` anywhere in the tree**; `swastik.ts:230/233,240/243,355/358` answer **401 for a missing/malformed header and 404 for an unknown devId** — a failure oracle; `REDACT_PATHS` omits `devId` (finding #9); `redact()` at `swastik.ts:94-96` emits a 4+4 fragment of it in logs and audit rows | DONE (slice 6a) |
| UR-C-06 | 97 | CLAI fake TCP REPL | ssh2 public-key-only server present (the REPL itself is done). **Slice 6c-iv:** a bounded session pool (`CLAI_MAX_SESSIONS`), a per-session byte budget (`CLAI_MAX_BYTES_PER_SESSION`), and hardened ANSI/control stripping (`clai-session-limits.ts`) | DONE (slice 6c-iv) |
| UR-C-07 | 98 | No verification before import; ESM cache stale | Manifest/directory match + symlink containment landed in slice 2. **Residue: hash verify against `builds`, quarantine move, cache-busted import URL** — all three landed in slice 6b | DONE (slice 6b) |

- **Tally:** **16 DONE** / **1 PARTIAL, routed** / **0 OPEN** on the 17-row board after slices 6a–6c-iv (see the reconciled bullets below); the UR 2.0 headline **5 DONE / 9 PARTIAL / 3 OPEN** is retained as provenance, not re-asserted.

  **Correction recorded here, because the board above and the 5/9/3 tally do not reconcile and the discrepancy is the row board's arithmetic, not a status change:** the template's §2 board lists DONE as *UR-A-01, UR-A-02, UR-A-04, UR-B-06, UR-C-02* (5 rows) — but UR-B-02 and UR-C-01 were closed by slice 2 and were **PARTIAL** on the board, while UR-A-02 and UR-C-06 are the *same defect* (the CLAI TCP REPL) counted once. Reconciling the board against the tree:
  - **DONE (16):** UR-A-01, UR-A-02, UR-A-04, UR-B-01 (slice 6c-iii), UR-B-02, UR-B-03 (slice 6c-i), UR-B-04 (slice 6b), UR-B-05 (slice 6a), UR-B-06, UR-C-01, UR-C-02, UR-C-03 (slices 6c-ii + 6c-iii), UR-C-04 (slice 6a), UR-C-05 (slice 6a), UR-C-06 (slice 6c-iv), UR-C-07 (slice 6b)
  - **PARTIAL, routed (1):** UR-A-03 (→M9)
  - **OPEN (0).**
  - 16 + 1 + 0 = **17 rows, 0 orphans.** The template's 5/9/3 splits UR-C-06 (CLAI) as a separate DONE row from UR-A-02 while counting UR-B-02 and UR-C-01 as partial; the tree does not support that split. **The row-level board above is authoritative; the 5/9/3 tally is retained as UR 2.0's headline and is not re-asserted.** Logged as deviation #14 — a state-of-record correction is not a unilateral re-credit, and M11 reconciles the count.
- **Tree state (R12 reconciliation):** M0 is the one item whose rows have been re-triaged against working HEAD (this table). The other items' rows are **not yet** re-triaged — the summary table's "tree: shaped code present" marks come from the prompt's §3.0.3 evidence map, not from a fresh triage.
- **Ahead-of-record work (UR 2.0 SC-02):** none inside M0's 17 rows. Slice 1–5 landed *with* ledger records at the time (the retired ledger); what they lacked was R11 change-log lines, backfilled at the 5.1.0 revision and re-corrected by SC-01.
- **Done-gate evidence (tests):**
  - Slice 1 — `tests/unit/m0-security.test.ts`, 14 assertions in 3 `describe` blocks; verified fail-before/pass-after by reverting `server.ts` + `admin.routes.ts` (5 failed → passed on restore).
  - Slice 2 — 10 new assertions, 6 proven fail-before/pass-after by stashing only `swastik-loader.ts` (`6 failed | 20 passed` → `26 passed`).
  - Slice 3 — 6 new tests, 5 proven fail-before/pass-after (`8 failed | 24 passed` → `32 passed`); the 6th is a deliberate no-regression control.
  - Slice 4 — 7 new tests, 5 proven fail-before/pass-after by stashing only `command-router.ts` (`5 failed | 34 passed` → `39 passed`); the revert proved the exploit (the handler **executed**), and 2 further tests are no-regression controls.
  - Slice 5 — 11 new tests (9 gates + 2 client tests), proven fail-before by stashing four files (`13 failed | 35 passed` → `48 passed`); the 4 non-slice-5 failures are explained collateral from the coarse revert.
  - Full unit suite after each slice: 857 → 864 → 876 tests, all green. `tsc --noEmit`, `eslint --max-warnings=0`, `prettier --check`, `test:coverage` (82.44% stmt / 79% branch) clean at `0c625c1`.
  - **Slice 6b** — `tests/unit/m0-build-provenance.test.ts` (new, 15 tests): signer/verifier round-trip plus tamper, unknown-key and forged-signature refusal; `InMemoryBuildStore` behaviour; the loader's five enforcement paths (a matching build loads; a tampered artifact, a missing `builds` row, a missing sidecar, and an untrusted signature each refuse and quarantine under `quarantine/{buildId}/` with **both** hashes logged); the buildId cache-bust proven by loading fresh bytes after a simulated hot swap; and a no-regression control for the unguarded path. Proven fail-before two ways — with the two new modules moved aside the file cannot load (`Cannot find module`), and with the loader guard forced off 5 enforcement tests fail (10 pass). Full unit suite **916 passed / 77 files** (901 before). Scoped `tsc --noEmit` clean. Migration 39's `up()`/`down()` compiled to SQL (8 columns + index added; 8 dropped) — **not** run against a live Postgres (no server in this environment; deviation #21).
  - **Slice 6c-i** — `tests/unit/m0-bind-hosts.test.ts` (new, 9 tests, structural — the four entry points run module-scope side effects and are not importable, findings #11/#16): each of `pep.ts`/`ssh-clai.ts`/`swastik.ts`/`twixter.ts` sources its listen host from `env.<X>_BIND_HOST` and contains no `'127.0.0.1'` literal; `env.schema` declares each key defaulting to loopback; `.env.example` documents each. Proven fail-before by reverting the four entry files and the four keys (**9 failed / 9**); restored: 9/9. Full unit suite **925 passed / 78 files** (916 before). Scoped `tsc --noEmit` clean.
  - **Slice 6c-ii** — `tests/unit/m0-module-ownership.test.ts` (new, 6 tests): the three `decideModuleOwnership` outcomes; the in-memory store's claim/transfer semantics; a structural assertion that `swastik.ts` enforces ownership and requires `manifest.devId`. Proven fail-before by moving `module-ownership.ts` aside (the file cannot load). Full unit suite **931 passed / 79 files** (925 before). Scoped `tsc --noEmit` clean. Migration 40 compiled to valid PostgreSQL (table + FK + index) — **not** run against a live Postgres (deviation #21).
  - **Slice 6c-iii** — `tests/unit/m0-owner-approval.test.ts` (new, 7 tests): the five `decideDeveloperApproval` outcomes (owner approves/declines; non-owner, subject, automation, empty actor all refused) and the in-memory approval store's request/decide semantics. Proven fail-before by moving `developer-approval.ts` aside. 
  - **Slice 6c-iv** — `tests/unit/m0-clai-limits.test.ts` (new, 7 tests): hardened ANSI/control stripping (CSI, OSC, other escapes, stray controls) and the session limiter (admit to max then refuse; free on close; byte-budget enforcement). Proven fail-before by moving `clai-session-limits.ts` aside. Full unit suite after 6c-iii/6c-iv: **945 passed / 81 files** (931 before). Scoped `tsc --noEmit` clean. Migrations 40/41 not run against a live Postgres (deviation #21).
- **Change-log entry recorded (R11):** slices 1–5 backfilled in `docs/change-log.md` (v5.0.0 implementation track) at the 5.1.0 revision, then corrected by SC-01. Slice 6's lines are written at slice close (§6).
- **What changed:** slices 1–5 — see the slice records below. All of slice 6 landed: 6a (developer credentials), 6b (build provenance + load-time verification), 6c-i (bind-host coverage), 6c-ii (module ownership), 6c-iii (owner-approval workflow), 6c-iv (CLAI session limits).
- **Judgment calls / deviations:** deviations #1–#12 below (all inherited from the retired ledger and carried forward), plus #13–#15 recorded by this session.
- **What was deliberately NOT done, with routing:** UR-A-03's middleware/pipeline residue → M9 (UR-C-09, P1, named by the row itself); UR-C-07's hash-verify/quarantine/cache-bust residue → slice 6; `GET /api/info` left reachable (no P0 row names it) → M9; `QueueManager.pause()` unrouted → M9 (UR-B-08); `signing_keys` table exists (migration 28) with `publicKey`/`algorithm` but **no private key column** → slice 6 must decide custody honestly (see slice 6) .
- **Resume note:** M0 is DONE. **Next is M1 — but run the R12 state-of-record reconciliation first** (§3.0.2 step 1b: re-triage the remaining 104 rows against the tree), which the ledger records as blocking M1; the open policy questions (UR §8.1.3 #13–#19) also gate specific items and must not be decided unilaterally.

#### M0 slice 1 — admin surface authentication (UR-A-01, UR-B-03, UR-B-06) — DONE

*Carried forward condensed from the retired ledger (`git show 0c625c1:migration-ledger.md`, lines 173–183). Full prose recoverable there.*

- **Blast radius (declared 2026-09-26):** `src/http/server.ts`, `src/http/internal-auth.ts`, `src/http/routes/admin.routes.ts`, `src/config/env.schema.ts`, `src/bootstrap/bootstrap.ts` (three bind-host literals only), `.env.example`, `docker-compose.yml`, `scripts/e2e-test.ts` (deviation #1), `tests/unit/m0-security.test.ts`.
- **What changed:** the API server requires the constant-time `x-internal-api-key` on every `/admin/*` route; `registerInternalAuth` gained an optional `shouldProtect` predicate; `source` is derived from `request.ip`, not the JSON body; `API/HEALTH/METRICS_BIND_HOST` replace three hardcoded `0.0.0.0` literals and default to `127.0.0.1`.
- **Done-gate evidence:** 14 assertions, 5 proven fail-before/pass-after (revert of `server.ts` + `admin.routes.ts`).
- **Judgment calls:** the gate covers `/admin/*` but not `GET /api/info`; compose's app ports loopback-pinned; `/admin/*` trusted-source allow-list is an **IP** list checked against the socket peer (flagged for M9: a future proxy needs deliberate `trustProxy`).

#### M0 slice 2 — loader path containment + manifest/directory match (UR-B-02, UR-C-01, loader half of UR-C-07) + finding #2 — DONE

*Carried forward condensed (`0c625c1:migration-ledger.md`, lines 90–119).*

- **Blast radius (declared 2026-09-26):** `src/module-system/swastik-loader.ts` (the only logic-changing source file); `src/entry/swastik.ts` (finding #2 only — a `setErrorHandler`); `tests/unit/m0-*.test.ts`. Everything else read-only, including `path-guard.ts`, `promotion.ts`, `bootstrap.ts`.
- **What changed:** discovered entry names are parsed into `{slug, version}` via `assertSafeSlug`/`assertSafeVersion` (unparseable = hard per-entry failure); `resolve(entryPath)` replaced by `realpathSync` + `assertPathInside(modulesRoot, moduleDir)`; `manifest.name`/version must equal the directory's; `swastik.ts` installs a path-guard-aware `setErrorHandler` with a static 400 body.
- **Done-gate evidence:** 10 new assertions, 6 proven fail-before/pass-after (`6 failed | 20 passed` → `26 passed`). Honest limitation recorded: the `swastik.ts` assertions are structural (source-string) because the file is not behind `isMainEntry` (UR-C-23 → M9).
- **Standing judgment calls carried forward:** the containment root is `modulesDir`, so staging **must** nest inside `MODULES_DIR` or promoted symlinks fail closed (both shipped shapes do); the containment check stays inside the per-entry `try`; `moduleDir` is the realpath.
- **Corrects a prior-session claim:** the retired ledger's earlier note that "path guards … cover `swastik-loader.ts`" was false — the file imported them nowhere before slice 2.

#### M0 slice 3 — honest 501 on the fake successes (UR-A-04) + finding #7 — DONE

*Carried forward condensed (`0c625c1:migration-ledger.md`, lines 142–172).*

- **Blast radius (declared 2026-09-27):** eight routes in `src/http/routes/admin.routes.ts`; `src/entry/pep.ts`; `src/entry/ssh-clai.ts`; `tests/unit/m0-*.test.ts`. Read-only: `m9-control-plane.test.ts` (the reference implementation), `queue-manager.ts`, `errors/taxonomy.ts`, `error-boundary.ts`.
- **What changed:** the eight fake-success routes now call the existing `sendNotImplemented` and write no state and no audit row; `pep.ts`'s handler **throws** `PepActionNotImplementedError` (a sentinel return would still let the dispatcher write a false `allowed` row); a rejected PEP dispatch answers 403 `DUMBY_POWER_ENGINE_REJECTED` instead of 200; `request.body` null-guarded.
- **Done-gate evidence:** 6 tests, 5 proven fail-before/pass-after (`8 failed | 24 passed` → `32 passed`). One tautological first-draft assertion was rewritten **before** the gate was accepted — recorded so it is not mistaken for coverage.
- **Judgment calls:** no new 501 error class (cross-cutting error-contract change → M9); no consolidation into `error-boundary.ts` (out of radius; `PepActionNotImplementedError` is deliberately duplicated per entry point); `QueueManager.pause()` deliberately not wired (UR-B-08 → M9, finding #15).

#### M0 slice 4 — fail closed on unknown module tier (UR-A-03) — DONE

*Carried forward condensed (`0c625c1:migration-ledger.md`, lines 184–217).*

- **Blast radius (declared 2026-09-27):** `src/commands/command-router.ts` (only logic-changing source file); `tests/unit/m0-*.test.ts`; `command-registry-router.test.ts` + `m3-embed-and-dm.test.ts` (fixture correction only — deviations #8); `m7-persona.test.ts` found later by the full-suite run (deviation #9). Explicitly **not** in scope: `src/middleware/built-in/**`, `command-registry.ts`, `bootstrap.ts`, the renderer.
- **Source of truth read:** UR row 36; `blueprint.md` §17.3, §19.1, §19.2, §21.2.
- **What changed:** new private `requireModuleTier(command, guildId)`; `assertCommandInScope` no longer returns early on an unresolved tier; the two `tierForCommand(command) ?? 'standard'` coercions are gone; `CommandScopeDeniedError.tier` widened to include `'unresolved'`.
- **Done-gate evidence:** 7 tests, 5 proven fail-before/pass-after (`5 failed | 34 passed` → `39 passed`); 2 deliberate no-regression controls. Full suite 864/864 green.
- **Why UR-A-03 stays PARTIAL:** row 36's own dependency column names **UR-C-09 (row 100, High → P1 → M9)**, so its remaining clauses ("bootstrap router + all 12 built-ins", "context menus dispatched") cannot be closed in M0 without doing M9's work out of order (R4, §5 rule 5). The `src/core/commands` clause is moot — blueprint §17.3/ADR-002 state there is no such subtree.
- **Test-design lesson recorded:** the first draft used the real `PermissionResolver` and 5 of 6 tests **passed against the vulnerable code**, because `resolver.ts:153` denies any command lacking `permissionDeclared` (finding #18). The tests stub the engine so the tier check is the only thing that can deny.

#### M0 slice 5 — Swastik internal-surface auth (UR-C-02) + findings #5, #6, #20 — DONE

*Carried forward condensed (`0c625c1:migration-ledger.md`, lines 219–253).*

- **Blast radius (declared 2026-09-27):** `src/entry/swastik.ts`, `src/http/internal-auth.ts`, `apps/main/docker-compose.yml`, `scripts/verify-all.ts` (deviation #10), `tests/unit/m0-*.test.ts`. Explicitly out: UR-B-05/UR-C-05 (slice 6).
- **What changed:** `shouldProtectSwastikRoute(request)` added to `internal-auth.ts` as a pure importable **default-protect** policy with an explicit three-route developer exemption (`GET /swastik/developers/me`, `POST /swastik/modules/upload`, `GET /swastik/modules/:slug/builds/:buildId`), matched as `(method, anchored-regex)` pairs on the query-stripped path; the Swastik app installs the shared `registerInternalAuth` preHandler **after `init()`** (env is assigned there — a module-scope registration would capture `undefined`); rejection writes an `INTERNAL_AUTH_DENIED` audit row with the route/method/fingerprint and caller address but never the presented key; the hand-rolled `requireInternalKey` is deleted; both in-repo clients of `/swastik/status` now authenticate as services, and a third client (`scripts/swastik-deploy.ts`, finding #20) was found by grepping **after** writing the client list and fixed (deviation #12).
- **Done-gate evidence:** 11 tests (9 gates + 2 client tests); fail-before `13 failed | 35 passed` → restore `48 passed`. Full suite 876/876 green; coverage 82.44% stmt.
- **Healthcheck decision (recorded as a judgment call because it changes an operator-visible contract):** `GET /swastik/status` is **keyed**, and the compose probe authenticates as a service from its own environment — rather than adding a second unauthenticated route, which §15.8's "no unauthenticated client path into the internal surface exists at all" forbids.
- **Deliberately not done:** `/swastik/status`'s *payload* still discloses counts and absolute volume paths (narrowing the payload is a design change nobody asked for → follow-up); no `isMainEntry` guard (UR-C-23 → M9, finding #11); `devId` remains a plaintext bearer (slice 6).

#### M0 slice 6 — provenance, ownership, credentials (UR-B-04, UR-B-05, UR-C-05 + the closable partials) — DONE (6a–6c-v all closed below)

- **Status:** DONE (sub-parts **6a DONE**, **6b DONE**, **6c-i DONE**, **6c-ii DONE**, **6c-iii DONE**, **6c-iv DONE**, **6c-v DONE**, **6c-vi DONE**)
- **Started:** 2026-10-01 · **Completed:** —
- **Request rows owned:** UR-B-04 (row 67), UR-B-05 (row 68), UR-C-05 (row 96) — the three OPEN rows. Closable partials in the same sub-fence: UR-C-04 (row 95, credentials service), UR-C-07 (row 98, the hash-verify/quarantine/cache-bust remainder), UR-B-03 (row 66, bind-host coverage), UR-B-01 (row 64, owner approval workflow), UR-C-03 (row 94, module ownership).
- **Rows that M0 cannot close, and why (decided before editing, §5 rule 5):** UR-A-03 → routed to M9 (its own UR-C-09 dependency). UR-C-06's CLAI limit clauses are in scope for 6c only if 6a/6b land first; if they do not, they close PARTIAL with the CLAI session code untouched rather than being started blind.
- **Source of truth read:**
  - `blueprint.md` §22.8 (7163–7258): the Credentials Service is the single shared issuance path; TABLE 22-D (generated cryptographically, stored only as an Argon2id hash, displayed exactly once, always via the Authorization header, independently revocable); **Developer credentials storage** — the `credentials` table with `keyId`, `purpose` (closed enum), `credentialHash` (Argon2id), `devIdHash`, `status`, `createdAt`, `revokedAt`; "no plaintext devId is persisted anywhere in this table"; the caller presents the keyId together with the secret; "verification never scans or compares across developers"; "Verification is delegated to this service alone"; "Refusals are indistinguishable … the identical 401 body with no field named, and no log line, metric label, or audit row ever contains a fragment — not even a prefix — of the presented secret"; password registration writes `purpose: 'password'`; new rows start `status: 'pending'` and fail verification "as an unknown identity until the owner approval workflow (§15.8) transitions them to `active`".
  - `blueprint.md` §15.8 (4738, 4782): provenance columns on `builds` (`sourceArchiveHash`, `artifactHash`, `lockfileHash`, `gateResultsHash`, SBOM, Ed25519 `signature`, `signatureKeyId`, `signedDescriptor`); "A build row missing any provenance column is not promotable"; the loader verifies before **every** load and refuses outright, auditing the refusal; "Runtime Import Verification" — hash the on-disk artifact, compare against the `builds` row, mismatch or no row ⇒ never import, move to `quarantine/{buildId}/`, audit with both hashes; cache-busted import URL carrying the buildId; manifest/directory match immediately before activation.
  - `blueprint.md` §15.8 (4684): unknown or pending developer is never auto-approved; 403 before any build/staging/promotion step; refusal audited as `DEVELOPER_DEPLOY_DENIED`; "the attempt creates a pending approval request in the owner approval workflow", reviewed through the governance API (§44.8).
  - `blueprint.md` §15.6 (4505, 613): developer registration runs a formal licensing gate beyond the `approvalStatus` column; multi-state approval (pending → license-verified → approved/rejected).
  - `blueprint.md` §13.6 (3929): Swastik delegates identity issuance to the Credentials Service.
- **Blast radius (declared 2026-10-01, before any edit — R2).** Extends M0's declared radius in exactly these places:
  - `apps/main/src/db/migrations/**` — new migrations only (the `credentials` table for 6a; `builds` provenance columns for 6b). Every migration must ship a working `down()`.
  - `apps/main/src/credentials/**` — the credential store/service for developer credentials (new files), alongside the existing sealed-credential service.
  - `apps/main/src/db/repositories/credential.repository.ts` (new) — the `credentials` table access.
  - `apps/main/src/entry/credentials.ts` — the broken argon2 branch (finding #4), the missing verify endpoint, rate limit + `bodyLimit`, audit rows tagged `source: 'CREDENTIALS'`.
  - `apps/main/src/entry/swastik.ts` — the three developer-facing bearer routes, registration, the 401 oracle, `redact()`'s devId fragments, and (6c) an owner-approval surface.
  - `apps/main/src/module-system/swastik-loader.ts` — (6b) hash verify, quarantine, cache-busted import.
  - `apps/main/src/module-system/build-signing.ts` (new) — (6b) the Ed25519 provenance signer/verifier.
  - `apps/main/src/config/env.schema.ts` + `apps/main/.env.example` — (6b) signing-key configuration, (6c) bind-host keys for the four hardcoded surfaces. New keys go in **both** files together.
  - `apps/main/src/logging/logger.ts` — (6a) `devId`/secret redaction paths (UR-C-05, finding #9).
  - `apps/main/tests/unit/m0-*.test.ts` — extended (the item's declared test scope).
  - **Read-only, explicitly:** `bootstrap.ts` (stage sequence), `src/middleware/**`, `src/permissions/**`, `src/rendering/**`, `src/commands/**`, `promotion.ts`'s atomic-swap logic (its **signature/descriptor write** may change in 6b; the `renameSync` + lock path may not), the renderer, personas, `db/client.ts`, and every file outside this list.
- **Re-verified triage before editing (the tree, not the UR):**
  1. `developers.devId` is the **primary key** (`20260101000032:10`) and is returned verbatim by registration (`swastik.ts:224`) and accepted verbatim as the bearer token on three routes (`:231`, `:241`, `:356`). It is also an FK target: `builds.devId → developers.devId` (`:30-33`) and `licenses.subjectDevId`. **Consequence recorded:** the devId cannot stop being an identifier without re-plumbing migrations 32/33, which is M5/M6/M9 work. §22.8's "no plaintext devId … in this table" is satisfied by not persisting it in `credentials`, not by deleting it from `developers`.
  2. The 401-vs-404 oracle is real and is in **two** places, not one: `swastik.ts:230/233` (`/developers/me`), `:240/243` (upload), `:355/358` (build status). A fourth differentiated answer sits at `:247` — a 403 whose message embeds `dev.approvalStatus`, naming a field.
  3. `REDACT_PATHS` (`logger.ts:9-33`) has no `devId`, `devIdHash`, `credentialHash`, `keyId`, `secret`-fragment or `*Bearer*` path — confirming finding #9. `redact()` (`swastik.ts:94-96`) is a 4+4 fragment emitter used in 9 audit/log call sites.
  4. Finding #4 re-verified: `credentials.ts:56-68` inserts `{id, credentialHash, label, registeredBy, revokedAt, createdAt, updatedAt}` into `api_sessions`; migration 29 gives that table `userId`, `sessionTokenHash`, `expiresAt`, `createdAt` only ⇒ the argon2 branch throws on every call.
  5. UR-B-04 re-verified: migration 32's `builds` has `buildId, devId, moduleSlug, version, validationStatus, promotedAt, createdAt, updatedAt` and **no** provenance column; `swastik-loader.ts:160` is `await import(pathToFileURL(indexPath).href)` — no hash, no signature, no buildId, no cache-bust.
  6. UR-B-01/UR-C-03 re-verified: the only writers of `approvalStatus` are `swastik.ts:213` (`pending`), `admin.routes.ts:227` (`declined`), and the operator seed script (`approved`); there is no approval surface, no ownership table, and `manifest.devId` is optional so `swastik.ts:289`'s binding check no-ops when absent.
  7. UR-B-03 re-verified: bind-host configurability exists **only** in `credentials.ts:117`; `pep.ts:94`, `ssh-clai.ts:183`, `swastik.ts:742`, `twixter.ts:74` hardcode `127.0.0.1`.

#### M0 slice 6a — developer credentials (UR-B-05, UR-C-05, UR-C-04) — DONE

- **Status:** DONE
- **Started:** 2026-10-01 · **Completed:** 2026-10-01
- **Request rows closed:** UR-B-05 (row 68) — DONE. UR-C-05 (row 96) — DONE for the credential half (redaction + no-log-oracle); its `devId` redactor clause is resolved by the decision below, see deviations #16–#18. UR-C-04 (row 95) — DONE (Credentials Service: real storage, verify endpoint, `bodyLimit`, per-caller rate limit, `CREDENTIALS`-tagged audit rows).
- **Design decisions (binding on 6b/6c):**
  1. **`devId` stays a plaintext identifier; it stops being a credential.** `developers.devId` remains the primary key and an FK target for `builds.devId` and `licenses.subjectDevId`. What changed is that it is no longer accepted as a bearer token and is never persisted in the `credentials` table — §22.8's constraint is scoped to that table, and re-plumbing the FK graph is M5/M6/M9 work. Consequence: UR-C-05's "no log line contains a fragment of a credential secret" is satisfied; "no log line contains a fragment of the devId" is satisfied by keeping `redact()`'s 4+4 fragments for the *identifier*, which is not secret material, and the fragments are operator correlation handles.
  2. **Credential presentation is `Authorization: Bearer <keyId>.<secret>`.** The keyId is a non-secret lookup handle; the secret is the only secret. §22.8 requires the caller to "present the keyId together with the secret", which this satisfies without inventing a second header.
  3. **Issuance and verification are delegated to the Credentials Service alone** (§13.6, §22.8). `DeveloperCredentialService` + `PostgresCredentialStore` live behind `POST /credentials/issue-devid` and `POST /credentials/verify`. Swastik holds no credential material and never hashes a secret; it holds only an `HttpCredentialClient`. `InMemoryCredentialStore` exists so the proving tests need no database (same pattern as `sealed-credential.repository.ts`).
  4. **One refusal, constructed rather than repeated.** `credential-refusal.ts` exports a frozen `{}` and status `401`; `DeveloperCredentialService` throws exactly one `CredentialVerificationError` whose message is a fixed string and whose `reason` field exists only for operator logs. Every refusal path — unknown keyId, wrong secret, revoked, pending, identity mismatch, unbound credential, transport failure, unapproved developer — returns those same bytes. The differentiated 404s and the 403 that named `approvalStatus` are gone.
  5. **The binding is re-checked, not trusted.** `developers.credentialKeyId` (migration 38, partial unique index, nullable) names the credential. `authenticateDeveloperCredential` looks the developer up *by* keyId, then passes the resolved `devId` into verification, so the service re-compares it against the `devIdHash` recorded at issuance. Repointing a live credential at another developer row fails verification rather than authenticating — which is why `devIdHash` is load-bearing and why an `s2s` credential presented with a devId is refused.
  6. **New rows start `pending`** and fail verification as an unknown identity until an owner transitions them to `active` (§22.8). 6c builds that approval workflow; until it lands, **no developer credential can become `active`, so registration is not yet usable end-to-end.** Recorded as the deliberate sequencing below rather than as a bug.
  7. **`CREDENTIALS_SERVICE_URL` + `CREDENTIALS_SERVICE_TIMEOUT_MS` are new env keys**, added to `env.schema.ts` and `.env.example` together. A transport failure is a refusal (fail closed), not a bypass.
- **What changed:**
  - `20260101000037_create_credentials.ts` (new) — the §22.8 `credentials` table: `keyId` PK, `purpose` closed native enum (`devId|buildId|password|service_to_service|operator_keypair|license_id`), `credentialHash` text, `devIdHash` nullable, `status` enum (`pending|active|revoked`) defaulting `pending`, `createdAt`, `revokedAt`, indexes on `purpose` and `devIdHash`. `down()` drops the table and both enum types.
  - `20260101000038_add_developer_credential_key_id.ts` (new) — adds `developers.credentialKeyId` (nullable) plus a partial unique index, so many unregistered developers can exist but two can never share a credential.
  - `src/db/repositories/credential.repository.ts` (new) — `CredentialStore` interface with `PostgresCredentialStore` and `InMemoryCredentialStore`; nothing here can emit a secret.
  - `src/credentials/developer-credential.service.ts` (new) — issuance (Argon2id both for the secret and for `devIdHash`; `keyId`/`secret` from `randomBytes`) and verification against the single row the keyId names. `reason` on the error is for logs only.
  - `src/credentials/credential-client.ts` (new) — `HttpCredentialClient` (`verify` + `issueDevId`) over `x-internal-api-key`, 2s timeout, fail-closed on transport error.
  - `src/credentials/developer-bearer.ts` (new) — `parseDeveloperCredential` (bare devId, empty keyId/secret, or a second `.` are all refused before any lookup) and `authenticateDeveloperCredential` (the resolution order + the single outcome type).
  - `src/credentials/credential-refusal.ts` (new) — the frozen shared 401 body.
  - `src/entry/credentials.ts` — **finding #4 closed.** The argon2 branch no longer inserts into `api_sessions`; it goes through `DeveloperCredentialService`. Added `POST /credentials/verify` (per-route 60/min on top of a 300/min app-wide `@fastify/rate-limit`, `bodyLimit: 4096`), `POST /credentials/issue-devid`, and `writeAudit` rows tagged `source: 'CREDENTIALS'`. `DELETE /credentials/:id` now revokes a `credentials` row by `keyId`.
  - `src/entry/swastik.ts` — registration calls `issueDevId` and binds `credentialKeyId`, returning the secret exactly once with `format: '<keyId>.<secret>'`. All three developer routes (`/developers/me`, `/modules/upload`, `/modules/:slug/builds/:buildId`) go through `authenticateDeveloper`; the per-route 401/404 pairs and the `approvalStatus`-naming 403 are replaced by the shared refusal, with the precise reason to `logger.warn` + a `DEVELOPER_AUTH_REFUSED` audit row. Refusals no longer log a devId fragment.
  - `src/logging/logger.ts` — `REDACT_PATHS` gains `credentialHash`, `devIdHash` (root, 1- and 2-level) and `*.credential.secret` / `*.*.credential.secret`. `keyId` and `devId` are deliberately **not** redacted per decision #1.
  - `apps/main/docker-compose.yml` — a `credentials` service running `dist/entry/credentials.js` (it had no container at all, so nothing could have reached the new endpoints); `swastik` gets `CREDENTIALS_SERVICE_URL: http://credentials:8086`.
  - `apps/main/.env.example` — the two new keys, with the compose hostname noted.
- **Done-gate evidence (tests):**
  - `tests/unit/m0-developer-credentials.test.ts` (new, 25 tests): bearer parsing (incl. bare-devId refusal), frozen empty refusal body at 401, `REDACT_PATHS` behaviour against a real pino stream (hash redacted nested, secret redacted inside a credential object, `keyId` still permitted), issuance storing only `$argon2id$` hashes and never the plaintext secret or devId, a real-argon2id end-to-end verify, every refusal reason asserted to produce **one** message, and the four `authenticateDeveloperCredential` outcomes.
  - **Revert experiment (R-proving):** with the seven new source files moved aside and the test file in place, the file fails to load — `Cannot find module '../../src/db/repositories/credential.repository.js'`. Restored: 21/21 (pre-redaction tests), 25/25 after. The pre-existing suite is 876 tests; the slice adds 25.
  - **Migrations verified against a live Postgres 16** (scratch DB `dumby_m0cred`, dropped after): all 7 columns present, insert succeeds, the `purpose` enum rejects an unknown value, `down()` drops the table and **both** enum types (no residue), `credentialKeyId` is added, its unique index rejects a duplicate while **multiple NULLs are allowed** (the partial index behaves), and `down()` removes the column. Scratch DB dropped; no residue.
  - `pnpm --filter @workspace/dumby typecheck` clean · `lint` clean at `--max-warnings=0` · `format` clean · full unit suite **901 passed / 76 files** · coverage 82.21 stmt / 78.62 branch / 82.79 func / 82.74 line, above the 70/65/70/70 floors.
- **Judgment calls / deviations:** #16 (the `devId`-as-identifier decision and why `redact()` stays), #17 (new `credentials` compose service + two env keys, all inside the declared radius), #18 (a `credentials` table adjacent to M8's `sealed_credentials` — disjoint by construction: hashes only, no sealed values), #19 (registration now depends on the Credentials Service being reachable, a new runtime coupling), #20 (`pnpm migrate` is broken in this workspace for a pre-existing reason — see below).
- **What was deliberately NOT done, with routing:**
  - **The owner approval workflow** (§15.8) that transitions `pending → active`, and the governance API surface that reviews it → **6c** (UR-B-01). Until then no credential verifies; that is the sequence the row itself prescribes, not a shortcut.
  - **`builds` provenance columns, Ed25519 signing, loader hash-verify/quarantine/cache-bust** → **6b** (UR-B-04, UR-C-07).
  - **`devIdHash` for `purpose: 'password'` registration** (§22.8 names it) → **6c**, with the password surface; no password route exists today.
  - **`GET /credentials/readable/:id` returns sealed values to any internal caller** — that is `SealedCredentialService`'s pre-existing contract (M8), untouched here.
  - **Bind-host keys for the other three surfaces** → **6c** (UR-B-03).
  - **An `isMainEntry` guard on `credentials.ts`/`swastik.ts`** → M9 (UR-C-23, finding #11) — unchanged by this slice.
  - **Rate limiting on the Swastik developer routes** → the UR's rate-limit row is P2/M9; 6a rate-limits the Credentials Service, which is where brute force actually lands.
- **Resume note:** 6a is closed. Next is **6b** (provenance: `builds` columns, the Ed25519 signer, and the loader's verify/quarantine/cache-bust). Before starting it, read finding #21 — `signing_keys` has **no private-key column**, so 6b must decide custody explicitly, and read finding #22 — nothing on disk ties a loaded directory to a `builds` row, so 6b creates that link. Note the M8 adjacency note: 6a wrote `credentials` (hashes only), so M8's `sealed_credentials` scope stays disjoint.

#### M0 slice 6b — build provenance & load-time verification (UR-B-04, UR-C-07) — DONE

- **Status:** DONE
- **Started:** 2026-10-01 · **Completed:** 2026-10-01
- **Request rows owned:** UR-B-04 (row 67, `builds` provenance columns + the loader's verify-before-import) and UR-C-07 (row 98, the named residue: hash-verify against `builds`, quarantine move, cache-busted import URL). UR-B-05/UR-C-05/UR-C-04 closed in 6a; UR-B-01/UR-B-03/UR-C-03/UR-C-06 are 6c.
- **Findings to close / consume:** #21 (`signing_keys` has no private-key column → 6b must decide key custody explicitly) and #22 (nothing on disk ties a loaded directory to a `builds` row → 6b creates that link).
- **Source of truth read (2026-10-01):**
  - `docs/blueprint.md` §15.8 "Signed Build Provenance & Load-Time Verification" (blueprint:4736) — the `builds` provenance columns (`sourceArchiveHash`, `artifactHash`, `lockfileHash`, `gateResultsHash`, SBOM, Ed25519 `signature`, `signatureKeyId`, `signedDescriptor`); "a build row missing any provenance column is not promotable"; identity-level binding never substitutes for the signature; the signer holds the keys in-process until the deferred key-ceremony work lands.
  - `docs/blueprint.md` §15.8.2 "Artifact–Source Hash Binding" (blueprint:4706) — the `buildId` is bound to the source/artifact/lockfile/gate hashes and the signature; the loader must verify the signature covers the *deployed artifact bytes* before load.
  - `docs/blueprint.md` §15.9 "Runtime Import Verification — Hash Check, Cache-Busting, Manifest Match" (blueprint:4780) — hash the on-disk artifact, compare against the `builds` row for the named buildId; mismatch or no row ⇒ never import, move the directory to `quarantine/{buildId}/`, refuse, audit with **both** hashes; the import URL carries the buildId (`…?b={buildId}`) so the ESM cache cannot serve stale bytes.
  - Existing tree: `src/module-system/swastik-loader.ts` (import at :160, no verify/cache-bust), `src/db/migrations/20260101000032_align_swastik_control_tables.ts` (`builds` shape, no provenance column), `src/db/migrations/20260101000028_create_signing_keys.ts` (public key only), `src/db/repositories/credential.repository.ts` (the `Postgres*Store` + `InMemory*Store` pattern to mirror), `src/module-system/promotion.ts` (the atomic-swap + staging-dir write site).
- **Blast radius (declared 2026-10-01, before any edit — R2 / §5 rule 1).** A strict subset of slice 6's declared radius:
  - `apps/main/src/db/migrations/20260101000039_add_build_provenance.ts` (new) — the `builds` provenance columns. Working `down()` required.
  - `apps/main/src/db/repositories/build.repository.ts` (new) — `BuildStore` + `PostgresBuildStore` + `InMemoryBuildStore`.
  - `apps/main/src/module-system/build-signing.ts` (new) — the Ed25519 provenance signer/verifier, the canonical descriptor, the artifact hash, and the on-disk provenance sidecar read/write.
  - `apps/main/src/module-system/swastik-loader.ts` — verify-before-import, quarantine move, cache-busted import URL. (Manifest/directory match is **not** re-done — slice 2 landed it; R4.)
  - `apps/main/src/module-system/promotion.ts` — the signature/descriptor **write only** (the sidecar is written into the staged dir before the flip). The `renameSync` swap, lock path, and containment assertions are untouched.
  - `apps/main/src/config/env.schema.ts` + `apps/main/.env.example` — signing-key + quarantine-path configuration (both files together).
  - `apps/main/tests/unit/m0-build-provenance.test.ts` (new) — the slice's done-gate.
  - **Read-only, explicitly:** `bootstrap.ts` (its `loadModulesFromTierVolumes` call site is the stage sequence — **not** edited; wiring the guard there is routed as a finding), `manifest.schema.ts`, `tier-rules.ts`, `registry.ts`, `loader.ts`, `path-guard.ts`, and every file outside this list.
- **Design decisions (binding; recorded before coding):**
  1. **Key custody is explicit (closes finding #21).** The Ed25519 **private** key is held **in-process** and sourced from `BUILD_SIGNING_PRIVATE_KEY`; it is **never** persisted. `signing_keys` keeps its public-key-only registry shape (no migration adds a private-key column). This is exactly what §15.8 sanctions ("until it lands, Swastik's in-process signer holds the keys"). The `signatureKeyId` column records which key signed.
  2. **The directory→`builds`-row link is an on-disk sidecar (closes finding #22).** Promotion writes `build-provenance.json` (buildId + the full provenance tuple + signature) into the promoted directory; the loader reads it to learn the buildId, then looks the row up. The promoted entry name alone never identifies a build, so the sidecar is the link §15.9 assumes exists.
  3. **Verification is an injected guard, not a hidden global.** `loadModulesFromTierVolumes` gains optional `buildStore`, `verifier`, and `quarantineDir`. When they are absent the loader behaves exactly as before and logs one `module-provenance-unverified` warning per call (backward compatible; the existing 901-test suite is the proof). When they are present the load is verified. The production wiring (bootstrap) is out of this slice's fence — routed as finding #23.
  4. **Fail closed on the guard path.** Any of {no sidecar, no `builds` row, artifact-hash mismatch, bad signature} ⇒ quarantine + refuse + `failed` (which the loader already escalates to a hard startup failure). The audit/log records **both** hashes (expected from the row, computed from disk) and never the signature bytes.
  5. **Cache-busting is unconditional on the verified path.** The import specifier is `fileURL(index.js)?b={buildId}`, so the ESM cache cannot serve a previous version's bytes across a hot swap — structural, not merely likely.
- **Triage (tree vs. UR, before editing):** UR-B-04 re-verified — `builds` (migration 32) has no provenance column and `swastik-loader.ts:160` is a bare `await import(pathToFileURL(indexPath).href)`. UR-C-07's residue re-verified — no hash compare, no quarantine, no `?b=` on the import URL; the manifest/directory match is present (slice 2).
- **What changed:**
  - `20260101000039_add_build_provenance.ts` (new) — the eight §15.8 provenance columns on `builds` (`sourceArchiveHash`, `artifactHash`, `lockfileHash`, `gateResultsHash`, `sbom` jsonb, `signature`, `signatureKeyId`, `signedDescriptor`) plus an `artifactHash` index. All nullable so the migration applies over existing rows; a row missing any column is not promotable. `down()` drops all eight.
  - `src/module-system/build-signing.ts` (new) — `hashBytes`/`hashFile` (`sha256:`-prefixed), `canonicalDescriptor` (fixed field order), `BuildSigner` (`fromPrivateKey`/`fromPkcs8Pem`/`fromSeed`, `signTuple`, `signSidecar`), `BuildSignatureVerifier` (`registerKey`, `verifyTuple`), `generateBuildSigningKeyPair`, and the sidecar read/write (`readBuildProvenanceSidecar`/`writeBuildProvenanceSidecar`/`tupleFromSidecar`).
  - `src/db/repositories/build.repository.ts` (new) — `BuildStore` + `PostgresBuildStore` + `InMemoryBuildStore`, mirroring the credential-store pattern.
  - `src/module-system/swastik-loader.ts` — `cacheBustedImportUrl` (`?b={buildId}`), `ModuleProvenanceRefusedError`, `verifyBuildProvenance` (sidecar → row → hash compare → signature), `quarantineModuleDir` (`quarantine/{buildId}/`), and the guarded branch in the load loop; the import specifier is now the cache-busted URL. The existing name/version/tier/containment checks are untouched.
  - `src/module-system/promotion.ts` — `promoteAtomically`/`promoteUnderLock` accept an optional `provenance` sidecar and write it into the staged dir before the flip (removed on failure). The `renameSync` swap, lock path, and containment assertions are unchanged.
  - `src/config/env.schema.ts` + `apps/main/.env.example` — `BUILD_SIGNING_KEY_ID`, `BUILD_SIGNING_PRIVATE_KEY`, `SWASTIK_QUARANTINE_PATH` (both files together).
- **Done-gate evidence (tests):**
  - `tests/unit/m0-build-provenance.test.ts` (new, 15 tests): the signer/verifier round-trip and its three refusal paths (tampered artifact hash, unknown key, forged signature); `fromSeed` rejects a non-32-byte seed; `InMemoryBuildStore` semantics; the loader's five enforcement paths (a matching build loads; a tampered artifact, a missing `builds` row, a missing sidecar, and an untrusted signature each refuse and quarantine under `quarantine/{buildId}/`, with **both** hashes in the refusal log); the buildId cache-bust proven end-to-end by loading fresh bytes after a simulated hot swap; and one no-regression control for the unguarded path.
  - **Revert experiment (R-proving, two ways):** with the two new modules moved aside the file cannot load (`Cannot find module '../../src/db/repositories/build.repository.js'`); with the loader guard forced off (`guardActive = false`) **5 enforcement tests fail / 10 pass**. Restored: 15/15.
  - **Full unit suite: 916 passed / 77 files** (901 before — the slice adds 15). Scoped `tsc --noEmit` clean. Migration 39's builder calls compiled to valid PostgreSQL (up: 8 columns + 1 index; down: 8 drops) — **not** run against a live Postgres (deviation #21).
- **Judgment calls / deviations:** #21 (migration verified structurally, not on a live server — no Postgres here), #22 (the loader guard is an injected, optional dependency so the pre-existing suite stays green; wiring is routed), #23 (the promoted directory now carries the sidecar file). Findings #21 and #22 are closed; finding #23 is recorded.
- **What was deliberately NOT done, with routing:**
  - **Arming the guard in production** — `bootstrap.ts`'s `loadModulesFromTierVolumes` call site does not pass `buildStore`/`verifier`; `bootstrap.ts` is outside this slice's fence (its stage sequence is read-only). → **finding #23, routed to M6** (the item that owns the loader's production wiring and the hot-swap pipeline).
  - **Re-doing the manifest/directory match** — already landed in slice 2 (R4). Untouched.
  - **A private-key column on `signing_keys`** — deliberately not added; custody is in-process (finding #21 resolved by decision, not by a migration).
  - **`signModule` on Gate-5 / `revokeModuleSignature` on revocation** — the signer/verifier exist and are tested; wiring them into the (not-yet-built) Gate-5 approval flow is 6c/M6 work.
- **Resume note:** 6b is closed. Next is **6c** (ownership + owner-approval workflow + bind-host coverage — UR-B-01, UR-B-03, UR-C-03, UR-C-06), the last M0 slice. Do not start M1 (R10).

#### M0 slice 6c-i — bind-host coverage (UR-B-03) — DONE

- **Status:** DONE
- **Started:** 2026-10-02 · **Completed:** 2026-10-02
- **Request row closed:** UR-B-03 (row 66) — DONE. Its SC-01 residue was "bind-host configurability covers 1 of 5 entry-point services"; all four remaining entry points now source their listen host from the environment.
- **Blast radius (declared before editing — R2):** `apps/main/src/entry/pep.ts`, `apps/main/src/entry/ssh-clai.ts`, `apps/main/src/entry/swastik.ts`, `apps/main/src/entry/twixter.ts`; `apps/main/src/config/env.schema.ts` + `apps/main/.env.example`; `apps/main/tests/unit/m0-bind-hosts.test.ts` (new). Read-only: everything else.
- **What changed:**
  - `env.schema.ts` + `.env.example` — four new keys, `PEP_BIND_HOST`, `CLAI_BIND_HOST`, `SWASTIK_BIND_HOST`, `TWIXTER_BIND_HOST`, each `z.string().default('127.0.0.1')` (both files together, per the repo's env contract).
  - `pep.ts` (`:94`), `twixter.ts` (`:74`), `swastik.ts` (`:854`) — `host: '127.0.0.1'` → `host: env.<X>_BIND_HOST`.
  - `ssh-clai.ts` (`:183–184`) — both the `server.listen` host argument and the `clai-ssh-started` log field.
- **Done-gate evidence (tests):** `tests/unit/m0-bind-hosts.test.ts` (new, 9 tests, structural): each entry point uses its env key and contains no `'127.0.0.1'` literal; `env.schema` declares each key with the loopback default; `.env.example` documents each. **Revert experiment (R-proving):** reverting the four entry files and the four keys → **9 failed / 9**; restored → 9/9. Full unit suite **925 passed / 78 files** (916 before). Scoped `tsc --noEmit` clean.
- **Coverage note (recorded, not a defect):** the four entry points run side effects at module scope and are not behind `isMainEntry` (findings #11/#16, UR-C-23 → M9), so they cannot be imported in a unit test; coverage is structural, exactly as slices 2 and 5 established. Behavioural proof of the bound host arrives when M9 adds the `isMainEntry` guards.
- **What was deliberately NOT done, with routing:** no change to the compose port mappings (already loopback-pinned, deviation #2); the entry points' `isMainEntry` guards → M9 (UR-C-23).
- **Resume note:** 6c-i is closed. Next is **6c-ii** (module ownership + owner-approval workflow — UR-C-03, UR-B-01), then **6c-iii** (CLAI session limits — UR-C-06).

#### M0 slice 6c-ii — module ownership (UR-C-03) — DONE (row PARTIAL, routed)

- **Status:** DONE (slice); UR-C-03 narrowed, not closed
- **Started:** 2026-10-02 · **Completed:** 2026-10-02
- **Request row:** UR-C-03 (row 94). Landed: the `modules` ownership table, the non-owner refusal on upload and deploy, and a required `manifest.devId`. The remaining clause — "no DB constraint against internal approvals" — needs the approvals table and routes to 6c-iii with UR-B-01.
- **Blast radius (declared before editing — R2):** `apps/main/src/db/migrations/20260101000040_create_module_ownership.ts` (new); `apps/main/src/module-system/module-ownership.ts` (new); `apps/main/src/db/repositories/module-ownership.repository.ts` (new); `apps/main/src/entry/swastik.ts`; `apps/main/tests/unit/m0-module-ownership.test.ts` (new). Read-only: everything else.
- **What changed:** migration 40 creates `modules` (`slug` PK, `ownerDevId` FK→`developers.devId`, `createdAt`, `ownershipTransferredAt`, owner index). `module-ownership.ts` holds the pure `decideModuleOwnership` (claim / owned / denied) and the `ModuleOwnershipStore` interface; the repository adds Postgres + in-memory stores. `swastik.ts` gains `resolveModuleOwnership`, enforced in both the upload and deploy routes after the license gate (claim a fresh slug; 403 + `MODULE_UPLOAD_DENIED_NON_OWNER` / `MODULE_DEPLOY_DENIED_NON_OWNER` for a non-owner); the upload route now requires `manifest.devId`.
- **Done-gate evidence (tests):** `tests/unit/m0-module-ownership.test.ts` (new, 6 tests) — the three ownership decisions; the in-memory store's claim/transfer semantics; a structural assertion that `swastik.ts` enforces ownership and requires `manifest.devId`. **Revert experiment (R-proving):** moving `module-ownership.ts` aside → the file cannot load. Full unit suite **931 passed / 79 files** (925 before). Scoped `tsc --noEmit` clean. Migration 40 compiled to valid PostgreSQL (table + FK + index); **not** run against a live Postgres (deviation #21).
- **Judgment calls / deviations:** #24 (ownership is enforced inline in `swastik.ts` through a `PostgresModuleOwnershipStore` rather than an injected dependency, because the entry point constructs its own `db`; the pure decision and the store are unit-tested independently).
- **What was deliberately NOT done, with routing:** the approvals table + its owner-actor CHECK/trigger constraint → **6c-iii** (with the owner-approval workflow); ownership transfer has no surface yet (operator-only, §44.8) → 6c-iii.
- **Resume note:** 6c-ii is closed. Next is **6c-iii** (owner-approval workflow + the approvals-table constraint — UR-B-01, UR-C-03's remaining clause), then **6c-iv** (CLAI session limits — UR-C-06).

#### M0 slice 6c-iii — owner-approval workflow (UR-B-01 + UR-C-03's constraint) — DONE

- **Status:** DONE
- **Started:** 2026-10-02 · **Completed:** 2026-10-02
- **Request rows:** UR-B-01 (row 64) — DONE; UR-C-03's remaining clause (the DB constraint against internal approvals) — DONE.
- **Blast radius (declared before editing — R2):** `apps/main/src/db/migrations/20260101000041_create_developer_approvals.ts` (new); `apps/main/src/governance/developer-approval.ts` (new); `apps/main/src/db/repositories/developer-approval.repository.ts` (new); `apps/main/src/credentials/credential-client.ts`; `apps/main/src/entry/credentials.ts`; `apps/main/src/http/routes/admin.routes.ts`; `apps/main/src/entry/swastik.ts`; `apps/main/tests/unit/m0-owner-approval.test.ts` (new). Read-only: everything else.
- **What changed:** migration 41 adds `developer_approvals` (requestId, devId FK, status, requestedAt, decidedBy, decidedAt, reason) with §15.8's actor CHECK (no self, no service/automation) and a partial unique index (one open request per developer). `governance/developer-approval.ts` holds the pure `decideDeveloperApproval`. The repository adds Postgres + in-memory stores. `credentials.ts` gains `POST /credentials/:keyId/activate`; `credential-client.ts` gains `CredentialActivator.activate`. `admin.routes.ts` adds `POST /admin/governance/developers/:devId/{approve,decline}`. `swastik.ts` creates a pending request when a non-approved developer attempts an upload or deploy (§15.8).
- **Done-gate evidence (tests):** `tests/unit/m0-owner-approval.test.ts` (new, 7 tests). **Revert experiment:** moving `developer-approval.ts` aside → the file cannot load. Full unit suite **945 passed / 81 files**. Scoped `tsc --noEmit` clean. Migration 41 not run against a live Postgres (deviation #21).
- **Judgment calls / deviations:** #24 (governance deps optional; wiring routed), #25 (approver identity from the body `actorId` validated against `projectOwnerIds`), #26 (`developers.approvalStatus` is the UR-B-01 surface, kept distinct from M5's license machine).
- **What was deliberately NOT done, with routing:** the `licenses` six-state machine's governed transitions (§15.7/§44.8) → **M5** (its shaped code already exists in `src/licensing/`); wiring the governance deps → finding #24.
- **Resume note:** 6c-iii is closed. Next is 6c-iv.

#### M0 slice 6c-iv — CLAI session limits (UR-C-06) — DONE

- **Status:** DONE
- **Started:** 2026-10-02 · **Completed:** 2026-10-02
- **Request row:** UR-C-06 (row 97) — DONE (the SC-01 residue — no connection limit, no byte limit, no ANSI stripping — is closed).
- **Blast radius (declared before editing — R2):** `apps/main/src/entry/clai-session-limits.ts` (new); `apps/main/src/entry/ssh-clai.ts`; `apps/main/src/config/env.schema.ts` + `apps/main/.env.example`; `apps/main/tests/unit/m0-clai-limits.test.ts` (new). Read-only: everything else.
- **What changed:** `clai-session-limits.ts` holds a hardened `stripAnsi` (CSI + OSC + any `ESC`+printable + stray C0 controls) and a `ClaiSessionLimiter` (max concurrent sessions + per-session byte budget). `ssh-clai.ts` admits a session only if the pool has room, accounts every chunk against the budget (closing on overflow), and uses the hardened stripper. `CLAI_MAX_SESSIONS` (5) and `CLAI_MAX_BYTES_PER_SESSION` (65536) added to schema + example.
- **Done-gate evidence (tests):** `tests/unit/m0-clai-limits.test.ts` (new, 7 tests). **Revert experiment:** moving `clai-session-limits.ts` aside → the file cannot load. Full unit suite **945 passed / 81 files**. Scoped `tsc --noEmit` clean.
- **What was deliberately NOT done, with routing:** a live ssh2 behavioural test (the entry point runs module-scope side effects and is not importable — findings #11/#16 → M9); coverage is the pure module.
- **Resume note:** 6c-iv is closed. **M0 is complete.**

#### M0 slice 6c-v — decided governance model (operator identity, generic approvals, license authority) — DONE

- **Status:** DONE (post-close refinement of 6c-iii under the owner's A/A/A decision)
- **Started:** 2026-10-02 · **Completed:** 2026-10-02
- **Context:** the owner chose option **A** for all three open decisions — (1) a project owner is a PEP operator (§22.5), (2) one generic `approvals` table, (3) `licenses.state` is authoritative. 6c-iii had shipped a placeholder (body `actorId` + `projectOwnerIds`, a developer-only table, `approvalStatus` written directly); this slice replaces it with the decided model.
- **Blast radius (declared before editing — R2):** `env.schema.ts` + `.env.example`; `db/migrations/20260101000041_create_approvals.ts` (new, supersedes `create_developer_approvals.ts`); `governance/approval.ts` (new); `db/repositories/approval.repository.ts` (new); `licensing/license-store.ts` (new); `entry/credentials.ts`; `credentials/credential-client.ts`; `http/routes/admin.routes.ts`; `entry/swastik.ts`; `tests/unit/m0-owner-approval.test.ts`. Deleted: `governance/developer-approval.ts`, `db/repositories/developer-approval.repository.ts`, `db/migrations/20260101000041_create_developer_approvals.ts`.
- **What changed:** `PEP_OPERATOR_IDS` (the independently-configured operator allow-list, §22.5). `POST /credentials/issue-operator` issues an `operator_keypair` credential bound to the operator id, started `active`; `CredentialIssuer.issueOperator` added. The governance route now requires a PEP operator bearer credential (`keyId.secret`), verifies it through the Credentials Service (re-checking the bound operator id), and requires the identity in `PEP_OPERATOR_IDS`. The developer-only table is replaced by the generic `approvals` table (subjectType developer|module|ownership_transfer) with the §15.8 actor CHECK. Approval drives the developer's **license** `pending → under-review → approved` (via `transitionLicense`); `developers.approvalStatus` is derived; a decline revokes the license. `swastik.ts` writes a `developer`-typed pending request.
- **Done-gate evidence (tests):** `tests/unit/m0-owner-approval.test.ts` (rewritten, 12 tests) — the five `decideApproval` outcomes; the generic store's `(subjectType, subjectId)` keying; the license-authority path (`approveLicenseRecord` drives pending→under-review→approved; already-approved unchanged; revoked has no path back; `licenseFromRow`). **Revert experiment:** moving `approval.ts` aside → the file cannot load. Full unit suite **950 passed / 81 files**. Scoped `tsc --noEmit` clean. Migration 41 compiled to valid SQL (2 enums + table + index; CHECK + partial unique index via raw SQL).
- **Judgment calls / deviations:** #27 (the just-added `developer_approvals` migration is superseded by the generic `approvals` table — pre-deployment, no data), #28 (the approval drives M5's shaped license machine — a contained use; the full §15.7/§44.8 governance family remains M5's).
- **What was deliberately NOT done, with routing:** wiring `operatorAllowList`/`operatorVerifier`/`credentialActivator` where `adminDeps` is built (bootstrap) → finding #24 (partially resolved); the rest of the §44.8 governance family (suspend/restore/revoke endpoints) → M5.
- **Resume note:** 6c-v is closed. M0 remains DONE; next is M1 (R12 reconciliation first).

#### M0 slice 6c-vi — governance-deps wiring (finding #24) — DONE

- **Status:** DONE
- **Started:** 2026-10-02 · **Completed:** 2026-10-02
- **What changed:** `bootstrap.ts` constructs one `HttpCredentialClient` (Credentials Service URL + internal key + timeout) and passes it to `buildApiServer`'s `adminDeps` as both `operatorVerifier` and `credentialActivator`, alongside `operatorAllowList: config.get('PEP_OPERATOR_IDS')`. The governance approve/decline route is now armed end-to-end.
- **Blast radius:** `apps/main/src/bootstrap/bootstrap.ts` — outside M0's declared fence (deviation #29, per the owner's explicit instruction); the edit only supplies the three deps and one client construction, not the stage sequence.
- **Done-gate evidence:** scoped `tsc --noEmit` clean; full unit suite **950 passed / 81 files** (run with `--testTimeout=30000` — the argon2 tests in `m0-developer-credentials.test.ts` exceed the 5s default on this 2-core sandbox; they pass at 30s, confirmed in isolation).
- **Resume note:** finding #24 is closed. M0 remains DONE; next is M1.

### M1 — Tier volumes & blind discovery

- **Status:** DONE (R12-credited; no code change required — the tree already meets the done-gate) · **Started:** 2026-10-02 · **Completed:** 2026-10-02
- **Request rows owned:** row 4 (`UR-04`), row 5 (`UR-05`), row 19 (`UR-19`)
- **Source of truth read (2026-10-02):** `blueprint.md` §5.4 (tier volumes), §7.3 (layout), §15.9 (change detection); `directory.md` (volume layout); prompt §M1.
- **Row triage (tree vs UR, at `2c5d801`):**
  - **Row 5 (`UR-05`)** — blind discovery from tier volumes at bootstrap; no hardcoded module list → **DONE**. `bootstrap.ts:308` calls `loadModulesFromTierVolumes` at `MODULE_DISCOVER`; no registry seed and no hardcoded module list in `bootstrap.ts`/`registry.ts`.
  - **Row 19 (`UR-19`)** — four per-tier volumes + staging; tier-at-rest; `/src/modules` deleted → **DONE**. No `src/modules` in the tree; `docker-compose.yml` mounts `modules-admin/core/standard/marketplace` + `swastik-staging` under `MODULES_DIR=/mnt/modules`; the loader enforces tier-at-rest by volume (slices 2/6b).
  - **Row 4 (`UR-04`)** — versioned standalone `swastik` SDK package with scoped entry points → **DONE** (`packages/swastik` = `@workspace/swastik` 0.1.0 with `exports` for `./manifest` and `./entrypoints/{core,admin,standard,marketplace}`, plus `_template`). The manifest-contract drift the evidence set notes (TS types in `src/manifest.ts` vs a Zod `schemas/manifest.schema.ts`; `_template` folder set) is **M6's** manifest-contract rows (57–58, 75–76, 78, 83, 89, 105, 113, 117), not M1's.
- **Blast radius:** none — no file edited (R12 credits the ahead-of-record work; R4 forbids opportunistic restructure). The `packages/swastik` layout drift and doc alignment route to M6/M10.
- **Done-gate (verified, not asserted):** a module on a tier volume is discovered with zero registry edits ✓; the loader reads only the tier volumes ✓; tier-at-rest is enforced by volume ✓; no `src/modules` directory ✓.
- **Provenance of ahead-of-record work:** `d334cfb` / `581499e` (2026-09-26) — credited per the owner's decision on UR §8.1.3 #19.
- **Change-log (R11):** rows 4/5/19 written (marked credited).
- **Resume note:** M1 is closed. Next is **M2** (row 74).

### M2 — Unified command tree

- **Status:** PARTIAL (R12-credited; row 74's enqueue-changes clause routed to M9) · **Started:** 2026-10-02 · **Completed:** —
- **Request rows owned:** row 74 (`UR-B-11`)
- **Source of truth read (2026-10-02):** `blueprint.md` §17, §15.4; `directory.md` (`src/commands/`); ADR-002; prompt §M2.
- **Row triage (tree vs UR, at `eef2f71`):** **Row 74 (`UR-B-11`)** — "boot-time delete-then-reregister of commands; enqueue guild changes; merge `src/core/commands` into `src/commands`, resolving ADR 002" → **PARTIAL**. *Merge clause* → **DONE**: unified `src/commands/` (`command-router`, `-registry`, `-deployer`, `-ceiling`, `collision-resolution`); no `src/core/commands` remnant. *Enqueue-guild-changes clause* → **NOT DONE, routed**: `command-deployer.ts` still `put`s an empty body then the new set at boot (global + per guild); the change-queue/BCCM that replaces it is **M9's row 44** (`UR-A-11` — "command-change machinery unwired").
- **Blast radius:** none (triage only).
- **Done-gate:** the merge is met; the deploy-then-reregister clause is not, and its remedy is M9's row 44.
- **Change-log (R11):** row 74 written (PARTIAL-routed).
- **Resume note:** M2 is PARTIAL; the enqueue residue is M9's. Next is **M3**.

### M3 — Core Renderer, buffer-then-render & the embed ban

- **Status:** PARTIAL (R12-credited; done-gate gated on MR-1…MR-8) · **Started:** 2026-10-02 · **Completed:** —
- **Request rows owned:** rows 9–12 (`UR-09`…`UR-12`), 21 (`UR-21`), 28 (`UR-28`), plus 111 (`UR-C-20`), 120 (`UR-C-29`)
- **Source of truth read (2026-10-02):** `blueprint.md` §20.8/§20.9 (renderer grammar, buffer/notice frames), §17.11, §19.2, §28.6; `interface.md`; ADR-001 (embed ban), ADR-002 (DM), ADR-009/010 (title/accent); prompt §M3.
- **Row triage (tree vs UR, at `450f5e8`):** Row 9 **PRESENT** — `core-renderer.ts` (288 ln): `CoreRenderer`, Modes D/M/C, `RenderDescriptor`/`FormalNoticeDescriptor`/`NoticeReasonCode`, accent `DEFAULT_ACCENT_COLOR = 0x5865f2` (`shared/utils/components-v2.ts`), A4 footer attribution. Row 10 **PRESENT** — buffer→single-edit + formal notice frames; `FOLLOWUP_ALARM_MS` (13-min watchdog). Row 11 **PARTIAL** — the renderer derives presentation from a descriptor, but is unexercised (no module declares commands) → **MR-1…MR-8**. Row 12 **DONE** — `eslint.config.mjs` `no-restricted-imports`/`no-restricted-syntax` on `EmbedBuilder`/`MessageEmbed`; `m3-embed-and-dm.test.ts` greps source. Row 21 **PRESENT** — DM prohibition in the router; same test. Row 28 **PARTIAL** — the four prefix-ban enforcement layers' coverage is not recorded. Row 111 **PRESENT** — `interaction-registry.ts`: `mintCustomId`, `invokerMatches` re-check, idempotency key, `AUTOCOMPLETE_BUDGET_MS = 800`. Row 120 **PARTIAL** — the 13-min watchdog is present; `withRetry` (`shared/utils/retry.ts`) has no consumer — the §44.4 HttpClient honouring 429 is absent → **M9** (§28).
- **Blast radius:** none this pass (triage only).
- **Done-gate:** NOT met — the command surface is stubs (`commands: []`), so "every user-facing surface is renderer-issued" holds only after **MR-1…MR-8**; the renderer/bans/dispatch themselves are present.
- **Change-log (R11):** rows 9–12/21/28/111/120 written.
- **Resume note:** M3 is PARTIAL. Next is **M4** (RBAC Layer 6/7).

### M4 — RBAC Layer 6/7 redesign

- **Status:** DONE (R12-credited; runtime grant writer implemented) · **Started:** 2026-10-02 · **Completed:** 2026-10-02
- **Request rows owned:** rows 32–33 (`R1`, `R2`), 40–42 (`UR-A-07`…`UR-A-09`)
- **Source of truth read (2026-10-02):** `blueprint.md` §21 (Table 21-A), §13.6, §16.4; `concept.md` §16.1; `interface.md` (`/permit`); prompt §M4.
- **Row triage (tree vs UR, at `e5ba5b5`):** Row 32 (`R1`, Layer 6) **PRESENT** — `rank.ts` canonical ranks OWNER/ADMINISTRATOR/MODERATOR/HELPER/MEMBER/RESTRICTED + `CANONICAL_RANK_NAMES` (ADMIN→ADMINISTRATOR, MOD→MODERATOR — the D21 drift handled); `resolver.ts` layer sequence. Row 33 (`R2`, Layer 7) **DONE** — `grant-surface.ts` (pure boundary + apply/remove, `InMemoryGrantSurface`) + `rbac.ts` resolution present, **plus the runtime grant writer `src/db/repositories/rbac-grant.repository.ts`** (`PostgresGrantWriter`/`InMemoryGrantWriter`, persisting to `rbac_grants` with the rate-limit↔quota alias). Row 40 (`UR-A-07`, Layer 2 blacklist) **PRESENT** — `db-blacklist.ts` `DbBlacklistLookup`. Row 41 (`UR-A-08`, RBAC persistence) **PRESENT** — `rbac.ts` + migrations 14–17. Row 42 (`UR-A-09`, layer order) **PRESENT** — `resolver.ts`.
- **What changed:** `src/db/repositories/rbac-grant.repository.ts` (new) — the runtime grant writer: `GrantWriter` (`list`/`apply`/`remove`), `PostgresGrantWriter` (soft-delete + insert on `rbac_grants`, reusing the pure `grantBoundaryViolation`), `InMemoryGrantWriter`, and the `grantToRow`/`grantFromRow` mapping (rate-limit↔quota alias).
- **Done-gate evidence (tests):** `tests/unit/m4-grant-writer.test.ts` (new, 7 tests) — the row mapping round-trip; the in-memory writer's apply/list/remove + the core-tier boundary refusal; the Postgres writer's soft-delete+insert, remove, and boundary refusal (via a fake knex). **Revert experiment:** moving `rbac-grant.repository.ts` aside → the file cannot load. Full unit suite **957 passed / 82 files**. Scoped `tsc --noEmit` clean.
- **Blast radius:** `src/db/repositories/rbac-grant.repository.ts` (new) + `tests/unit/m4-grant-writer.test.ts` (new). Read-only: everything else.
- **Done-gate:** the Layer 6/7 logic and the runtime grant writer are present; the writer is not yet wired into bootstrap/resolver (finding #25).
- **Change-log (R11):** rows 32/33/40/41/42 written.
- **Resume note:** M4 is DONE (grant writer implemented; wiring routed to finding #25). Next is **M5**.

### M5 — License machine, Compatibility Ledger & Deployment Records

- **Status:** DONE (R12-credited; deployment-records writer + release_manager gate implemented) · **Started:** 2026-10-02 · **Completed:** 2026-10-02
- **Request rows owned:** rows 2 (`UR-02`), 6 (`UR-06`), 8 (`UR-08`), 18 (`UR-18`), 20 (`UR-20`), 23 (`UR-23`)
- **Source of truth read (2026-10-02):** `blueprint.md` §15.7, §14.4, §15.12, §44.8; `directive.md` D-8.10; prompt §M5.
- **Row triage (tree vs UR, at `88b17f2`):** Row 2 (`UR-02`) **DONE** (M0 slice 2 — the Swastik error handler). Row 6 (`UR-06`) **DONE** (M0 slice 5 — the register route is keyed). Row 8 (`UR-08`) **DONE** — `AppendOnlyDeploymentRecords` was referenced only by itself and its test; added `src/db/repositories/deployment-record.repository.ts` (`PostgresDeploymentRecordStore`/`InMemoryDeploymentRecordStore`) and wired it into `entry/swastik.ts`'s `/internal/deploy` path (a record on promote; rolled-back/not-attempted on failure). Row 18 (`UR-18`) **DONE** (M0 slice 4 — recorded). Row 20 (`UR-20`) **DONE** (M0 slice 5). Row 23 (`UR-23`) **ROUTED → M6** (the loader verification guard's production wiring — `bootstrap.ts` is M6's). E4 (`tools/release_manager` outside every gate) **DONE** — it is now a workspace package (`@workspace/release-manager`) with a `typecheck` script, added to `pnpm-workspace.yaml` and the root `typecheck` filter.
- **What changed:** `src/db/repositories/deployment-record.repository.ts` (new); `entry/swastik.ts` (`recordDeployment` helper + two call sites); `tools/release_manager/{package.json,tsconfig.json}` (new); `pnpm-workspace.yaml`, `package.json`, `pnpm-lock.yaml`.
- **Done-gate evidence (tests):** `tests/unit/m5-deployment-records.test.ts` (new, 6 tests) — the row mapping round-trip, the in-memory store + the append-only invariant, the Postgres adapter. **Revert experiment:** moving the repository aside → the file cannot load. Full unit suite **963 passed / 83 files**. `apps/main` + `tools/release_manager` `tsc --noEmit` clean.
- **Blast radius:** as above.
- **Change-log (R11):** rows 2/6/8/18/20 written; row 23 routed.
- **Resume note:** M5 is DONE (row 23 routed to M6). Next is **M6**.

### M6 — Swastik promotion pipeline

- **Status:** PARTIAL (R12-credited; finding #23 fixed; manifest single-source outstanding) · **Started:** 2026-10-02 · **Completed:** —
- **Request rows owned:** rows 15, 25–27, 30, 57–58, 75–76, 78, 83, 89, 105, 113, 117
- **Source of truth read (2026-10-02):** `blueprint.md` §12.21, §15, §11.2; ADR-006; prompt §M6.
- **Row triage (tree vs UR, at `f40a772`):** the promotion pipeline (`promotion.ts`, `m6-promotion.test.ts`) and build provenance (`build-signing.ts`, `build.repository.ts`, the `build-provenance.json` sidecar) are present. **Finding #23 DONE** — `bootstrap.ts` now constructs `PostgresBuildStore(db.knex)` + a `BuildSignatureVerifier` (public key derived from `BUILD_SIGNING_KEY_ID`/`BUILD_SIGNING_PRIVATE_KEY`) and arms the loader guard via `loadModulesFromTierVolumes`; without a key it keeps the pre-6b warn-and-import behaviour (judgment call: arming with no key would quarantine every module). **Outstanding:** the manifest single-source (E9 D3 — three definitions: `packages/swastik/src/manifest.ts`, `apps/main/src/module-system/manifest.schema.ts`, `apps/main/src/module-system/tier-rules.ts`) and `packages/swastik` layout drift (E2 S-26).
- **What changed:** `bootstrap.ts` (guard wiring); `tests/unit/m6-loader-guard-wiring.test.ts` (new).
- **Done-gate evidence (tests):** `m6-loader-guard-wiring.test.ts` (3 tests; dropping the guard argument → the wiring test fails). Full unit suite **966 passed / 84 files**; `tsc --noEmit` clean.
- **Blast radius:** `bootstrap.ts`, the new test.
- **Change-log (R11):** finding #23 written; the manifest-single-source rows pending.
- **Resume note:** M6 is PARTIAL — the manifest single-source + `packages/swastik` layout remain (a cross-package refactor). Next is **M7**.

### M7 — Twixter persona model

- **Status:** DONE (R12-credited; ADR-003 sealed-token fix implemented) · **Started:** 2026-10-02 · **Completed:** 2026-10-02
- **Request rows owned:** rows 16 (`UR-16`), 29 (`UR-29`), 45–46 (`UR-A-12`, `UR-A-13`), 112 (`UR-C-21`)
- **Source of truth read (2026-10-02):** `blueprint.md` §35; ADR-003, ADR-008, ADR-011; `interface.md` persona division; prompt §M7.
- **Row triage (tree vs UR, at `9dc79ff`):** `src/personas/*` (persona model, bindings, command-binding service), migrations 20/21/34 and `m7-persona.test.ts` are present — bring-your-own-identity, single-server-bound, the free-charter sunset (ADR-008), the occupied-by-another-persona gate, `PERSONA_ID`. **ADR-003 gap DONE** — `persona.botTokenDigest` hashed a value Twixter must *use*; `PersonaIdentity`/`PersonaRegistrationInput` now carry `botTokenSealed: SealedEnvelope` (envelope encryption, M8's `crypto/envelope.ts`), with `sealPersonaBotToken`/`openPersonaBotToken`/`derivePersonaBotTokenDigest` and a `persona_identities.botTokenSealed` column (migration 42).
- **What changed:** `src/personas/persona.ts`; `src/personas/persona.repository.ts`; `src/db/migrations/20260101000042_add_persona_sealed_token.ts` (new); `tests/unit/m7-persona-sealed-token.test.ts` (new); `tests/unit/m7-persona.test.ts` (fixture gains the sealed token).
- **Done-gate evidence (tests):** `m7-persona-sealed-token.test.ts` (5 tests) — seal→open round-trip, the digest is one-way, a missing sealed token is refused, the store round-trip, a wrong key cannot open. **Revert experiment:** dropping the sealed token from the built identity → 2 tests fail. Full unit suite **971 passed / 85 files**; `tsc --noEmit` clean.
- **Blast radius:** `src/personas/**`, migration 42, the two tests.
- **Change-log (R11):** rows 16/29/45/46/112 written.
- **Resume note:** M7 is DONE. Next is **M8**.

### M8 — Envelope encryption

- **Status:** DONE (R12-credited; scope-boundary verification implemented) · **Started:** 2026-10-02 · **Completed:** 2026-10-02
- **Request rows owned:** row 22 (`UR-22`)
- **Source of truth read (2026-10-02):** `blueprint.md` §32.7; ADR-003; prompt §M8.
- **Row triage (tree vs UR, at `01fd7d6`):** Row 22 (`UR-22`) **DONE** — `src/crypto/{envelope,envelope-scope}.ts` + `src/credentials/sealed-credential.service.ts` + `src/db/repositories/sealed-credential.repository.ts` + migration 35 + `m8-envelope.test.ts` are present (root key → DEK → AES-256-GCM, rotation, the boundary guard). **E6 GOV-13 (scope-boundary verification) DONE** — added `CREDENTIAL_STORE_INVENTORY` + `verifyEnvelopeScope` (checks the at-rest stores against ADR-003's invariant) and a verification test that also audits the migrations (`credentials` holds hashes only; `sealed_credentials` + `persona_identities.botTokenSealed` hold envelopes).
- **What changed:** `src/crypto/envelope-scope.ts` (inventory + `verifyEnvelopeScope`); `tests/unit/m8-scope-verification.test.ts` (new).
- **Done-gate evidence (tests):** `m8-scope-verification.test.ts` (6 tests) — the inventory verifies clean, both violation directions, and the three migration audits. **Revert experiment:** un-exporting `verifyEnvelopeScope` → 3 tests fail. Full unit suite **977 passed / 86 files**; `tsc --noEmit` clean.
- **Blast radius:** `src/crypto/envelope-scope.ts`, the new test.
- **Change-log (R11):** row 22 written.
- **Resume note:** M8 is DONE. Next: the M3/M4 residuals, then **MR-1…MR-8**.

### MR-1 — hello-world module rewrite (Standard-tier)

- **Status:** NOT STARTED · **Started:** — · **Completed:** —
- **Request rows owned:** none of its own (§3.0: the MR block implements UR-11's reference set against M1–M8 interfaces)
- **Tree state:** `packages/modules/hello-world` is a lifecycle-only stub; built by `apps/main/scripts/build-first-party-modules.ts` (esbuild → `dist-modules/`)
- **Source of truth read:** `interface.md` hello-world division + **§10.10** testing checklist (UR 2.0 CF-17: "Division 8.10" was a miscite); `blueprint.md` §11, §12.21 — **not yet read**
- **Blast radius (declare before editing):** — **Row triage / Tree state / Done-gate evidence / Change-log entry (R11) / What changed / Judgment calls / Deliberately NOT done, with routing:** — **Resume note:** prerequisite — every item M0–M8 DONE, or stop and report; never rewrite a module against an interface that does not exist.

### MR-2 — health module rewrite (Core-tier)

- **Status:** NOT STARTED · **Started:** — · **Completed:** — **Request rows owned:** none of its own
- **Source of truth read:** `interface.md` `/health` card spec — not yet read. **Done-gate:** full card renders exactly; edit-in-place only, never a second message.
- **Blast radius / triage / evidence / change-log / what changed / judgment calls / routing:** — **Resume note:** blocked (MR prerequisites).

### MR-3 — browse module rewrite (Core-tier)

- **Status:** NOT STARTED · **Started:** — · **Completed:** — **Request rows owned:** none of its own
- **Source of truth read:** `interface.md` browse division — not yet read. **Done-gate:** install/uninstall round-trips through the Swastik pipeline.
- **Blast radius / triage / evidence / change-log / what changed / judgment calls / routing:** — **Resume note:** blocked.

### MR-4 — queue module rewrite (Core-tier)

- **Status:** NOT STARTED · **Started:** — · **Completed:** — **Request rows owned:** none of its own
- **Source of truth read:** `interface.md` queue division; `blueprint.md` §17.8 + §17.8.1 (BCCM, `guild_command_queue`) — not yet read. **Done-gate:** renames/aliases/disables in the 12–13h window; respect Discord's 200/day creation limit; honest pending UI.
- **Blast radius / triage / evidence / change-log / what changed / judgment calls / routing:** — **Resume note:** blocked.

### MR-5 — persona module rewrite (Core-tier)

- **Status:** NOT STARTED · **Started:** — · **Completed:** — **Request rows owned:** none of its own
- **Source of truth read:** `interface.md` persona division; `blueprint.md` §35; ADR-008, ADR-011 — not yet read. **Done-gate:** activated personas + command inventory per spec.
- **Blast radius / triage / evidence / change-log / what changed / judgment calls / routing:** — **Resume note:** blocked.

### MR-6 — permit module rewrite (Core-tier)

- **Status:** NOT STARTED · **Started:** — · **Completed:** — **Request rows owned:** none of its own
- **Source of truth read:** `interface.md` permit division; `blueprint.md` §21; `concept.md` §16.1 — not yet read. **Done-gate:** grants resolve through the seven-layer engine with exact L6/7 vocabulary.
- **Blast radius / triage / evidence / change-log / what changed / judgment calls / routing:** — **Resume note:** blocked.

### MR-7 — modules module rewrite (Core-tier)

- **Status:** NOT STARTED · **Started:** — · **Completed:** — **Request rows owned:** none of its own
- **Source of truth read:** `interface.md` modules division — not yet read. **Done-gate:** uninstall removes a module's commands; disabled handlers stop firing.
- **Blast radius / triage / evidence / change-log / what changed / judgment calls / routing:** — **Resume note:** blocked.

### MR-8 — dashboard module rewrite (Core-tier)

- **Status:** NOT STARTED · **Started:** — · **Completed:** — **Request rows owned:** none of its own
- **Source of truth read:** `interface.md` dashboard division (§0.4, §3.4–§3.7) — not yet read. **Done-gate:** edit-in-place on every interaction; dropdown on every page; navigates to every live module.
- **Blast radius / triage / evidence / change-log / what changed / judgment calls / routing:** — **Resume note:** blocked.

### M9 — Remaining implementation-flaw corrections

- **Status:** NOT STARTED (tree: shaped code present — reconcile, R12) · **Started:** — · **Completed:** —
- **Request rows owned:** 57 rows — program rows 1 (`UR-01`), 7 (`UR-07`), 17 (`UR-17`), 24 (`UR-24`), 31 (`UR-31`) and every suite row not owned by M0–M8, including the residual clauses of rows M0 closed PARTIAL (UR-A-03's middleware wiring, UR-C-07's verify/quarantine/cache-bust if slice 6 does not land, UR-B-02's and UR-C-01's remaining clauses, UR-C-03, UR-C-04)
- **Evidence references:** E1 §2.2 + E5 §31 (CI hygiene: SHA-pin, secrets off `run:`, Dependabot); true unknowns routed here — UR-C-23 (`isMainEntry` guards, findings #11/#16), UR-B-08 (finding #15 `QueueManager.pause()`), finding #3 (inert middlewares), finding #17 (`createMiddlewareContext` `meta: {}`), finding #18 (layer-7 backstop masking earlier defects), finding #19 (`command-registry.register` accepts an unregistered module), finding #1 (`AGENTS.md` stale paths)
- **Provenance of ahead-of-record work:** `d334cfb` (2026-09-26) — `m9-*` suites and `createHmac` (UR-B-19)
- **Source of truth read:** UR §8.1.2 — the suite rows not owned elsewhere, excluding the P0 rows — **not yet read**
- **Blast radius (declare before editing):** per flaw row, declared before each fix
- **Row triage / Tree state / Done-gate evidence / Change-log entry (R11) / What changed / Judgment calls / routing:** — **Resume note:** blocked (M0 first).

### M10 — Terminology & legacy-name sweep

- **Status:** NOT STARTED — §3.0.3 reports canonical vocabulary already clean across the living set (E6 GOV-05) · **Started:** — · **Completed:** —
- **Request rows owned:** row 3 (`UR-03`) and the residual legacy-name sweep
- **Evidence references:** CF-22 (legacy "DRM" in the change-log's living open-items section — pending, see deviation #13)
- **Provenance of ahead-of-record work:** `d334cfb` (2026-09-26)
- **Source of truth read:** change-log "Changed — shared facts": "DRM" → **Release Manager** (with reverse GitHub sync), "Twill" → **Twixter**, canonical ranks **MODERATOR / ADMINISTRATOR** — **not yet read this session**
- **Blast radius (declare before editing):** every file containing a legacy name (mechanical, textual) — **Row triage / Tree state / Done-gate evidence / Change-log entry (R11) / What changed / Judgment calls / routing:** — **Resume note:** blocked (M9 first). Text-level only; no behaviour changes in this item.

### M11 — Convergence pass

- **Status:** NOT STARTED · **Started:** — · **Completed:** —
- **Request rows owned:** rows 13 (`UR-13`), 14 (`UR-14`) — the honesty/measurement audits — plus the 121/121 reconciliation itself
- **Evidence references:** E1 §1.1 classification matrix (242 findings); E7 §2 executed verification; E9's 310-file disposition and 29 cross-cutting duplications (D1–D29)
- **Provenance of ahead-of-record work:** —
- **Source of truth read:** `docs/master-prompt.md` §3 (audit protocol) and §6 (enforcement pass) — **not yet read**
- **Blast radius (declare before editing):** — **Row triage / Tree state / Done-gate evidence / Change-log entry (R11) / What changed / Judgment calls / routing:** — **Resume note:** the only item that may run a full-project `tsc --noEmit` (R5) and the only item after which the master prompt's audit protocol governs again.

---

## Out-of-Scope Findings Register

> Every defect, compile error, or oddity noticed OUTSIDE the current item's blast radius. Recorded per migration-prompt rule R3. NEVER fixed inline (except one-line mechanical unblocks, logged as such). Findings #1–#19 and #20 are carried forward from the retired ledger (`0c625c1:migration-ledger.md`); line references were valid at that commit and may have drifted — re-verify before acting.

| # | Date | Seen during | File / location | Finding | Belongs to item | Triage |
|---|------|-------------|-----------------|---------|-----------------|--------|
| 1 | 2026-09-26 | M0 blast-radius mapping | `AGENTS.md` | Described `src/modules/<slug>/` and `src/core/commands/__tests__/**`; neither exists. Modules load from tier volumes, commands live in `src/commands/`, there is no `src/core` tree. **Partially repaired at `ac599fe`** (AGENTS.md now says `packages/modules/<slug>/`) — the stale `src/core/commands/__tests__` glob is not referenced any more; the underlying flat-vs-`src/core/` question remains a true unknown (prompt §3.0.4). | M10 / true unknown | backlog + route-to-item |
| 2 | 2026-09-26 | M0 blast-radius mapping | `src/entry/swastik.ts:182` | Swastik Fastify instance built with no `setErrorHandler`, so a path-guard throw surfaced as a 500 echoing an absolute server path. | M0 slice 2 | **fixed-in-slice-2** |
| 3 | 2026-09-26 | M0 blast-radius mapping | `src/bootstrap/bootstrap.ts:231-252` | 4 of 12 wired middlewares are neutered by hardcoded stub resolvers at construction (Permission, RBAC, Cooldown, Defer). Re-verified in slice 4: the enforcement is **not** wholly dead — `CommandRouter.assertPermissionAllowed` runs the real `PermissionResolver` — so they are inert duplicates of a live control. `getHighestRole` is Layer 6 (**M4**); the limiter/cooldown stores are Redis (UR-B-10 → M9). | UR-A-03 → M9 / M4 | **re-routed in slice 4** |
| 4 | 2026-09-26 | M0 blast-radius mapping | `src/entry/credentials.ts:56-68` | The argon2 branch inserts `{id, credentialHash, label, registeredBy, revokedAt}` into `api_sessions`, which has `userId`/`sessionTokenHash`/`expiresAt`/`createdAt` only ⇒ cannot execute. **Re-verified 2026-10-01: still open, then closed by slice 6a** — the branch now issues through `DeveloperCredentialService` into the new `credentials` table. | UR-C-04 → M0 slice 6 | **RESOLVED (slice 6a)** |
| 5 | 2026-09-26 | M0 blast-radius mapping | `src/entry/swastik.ts:696→705` | `GET /swastik/status` had no authentication and is the compose healthcheck probe. | UR-C-02 | **RESOLVED (slice 5)** |
| 6 | 2026-09-26 | M0 blast-radius mapping | `src/entry/swastik.ts:184→203` | `POST /swastik/developers/register` was the one unkeyed `/swastik/*` write route. | UR-C-02 | **RESOLVED (slice 5)**; residual = `devId` still a plaintext bearer (slice 6) |
| 7 | 2026-09-26 | M0 blast-radius mapping | `src/http/routes/admin.routes.ts:273-405` | Seven PEP actions wrote JSON into `system_state` and returned 200 without touching the queue, limiter or shard manager. | UR-A-04 | **fixed-in-slice-3** |
| 8 | 2026-09-26 | M0 blast-radius mapping | `src/licensing/deployment-records.ts:99` | `AppendOnlyDeploymentRecords` is referenced only by itself and its test; `entry/swastik.ts` never imports it, so `deployment_records` (migration 33) is never written. | M5 | route-to-item |
| 9 | 2026-09-26 | M0 blast-radius mapping | `src/logging/logger.ts:13-36` | `REDACT_PATHS` does not include `devId`, so developer identifiers are not redacted while other credential-ish keys are. **Re-verified 2026-10-01: still open, then narrowed by slice 6a** — `credentialHash`/`devIdHash`/nested `credential.secret` are now redacted (tested against a real pino stream); the devId itself is kept as an operator correlation handle, see deviation #16. | UR-C-05 → M0 slice 6 | **RESOLVED (slice 6a), narrowed by #16** |
| 10 | 2026-09-26 | M0 blast-radius mapping | `src/config/env.schema.ts:88-90` | `CLAI_MFA_ISSUER`, `CLAI_BREAK_GLASS_SCRIPT_URL`, `CLAI_AUTHKEY_STORAGE_URL` are declared in the schema and read by no code. | M9 | route-to-item |
| 11 | 2026-09-27 | M0 slice 2 | `src/entry/swastik.ts:184` | Not behind `isMainEntry`, so it cannot be imported in a unit test — the cause of the structural-only coverage for slices 2 and 5. | M9 (UR-C-23) | route-to-item |
| 12 | 2026-09-27 | M0 slice 2 | `src/module-system/swastik-loader.ts` | The containment root is `modulesDir`, so `SWASTIK_STAGING_VOLUME_PATH` must nest inside `MODULES_DIR` or promoted symlinks fail closed. Both shipped shapes nest correctly; nothing in the schema or compose enforces it. | M6 | route-to-item |
| 13 | 2026-09-27 | M0 slice 3 | `tests/unit/m9-revoke-suspend.test.ts:10` | Slice-1 regression slice 1 never caught (harness trusted a body `source`; slice 1 made it server-derived). Found only by the full suite. | M0 slice 1 | **fixed-in-slice-3-addendum** |
| 14 | 2026-09-27 | M0 slice 3 | `tests/unit/admin-routes.test.ts:61` | The test pinned the fake success (200 + `dispatch` called) — a regression test for finding #7. | UR-A-04 | **fixed-in-slice-3-addendum** |
| 15 | 2026-09-27 | M0 slice 3 | `src/queue/queue-manager.ts:89` | `QueueManager.pause()` is implemented but unrouted; the admin routes that would call it are honest 501s. | M9 (UR-B-08) | route-to-item |
| 16 | 2026-09-27 | M0 slice 3 | `src/entry/pep.ts:94`, `src/entry/ssh-clai.ts:189` | Both entry points execute side effects at module scope and neither is behind `isMainEntry`, so neither can be imported in a unit test. Generalises finding #11. | M9 (UR-C-23) | route-to-item |
| 17 | 2026-09-27 | M0 slice 4 | `src/commands/command-router.ts:212-220` | `createMiddlewareContext` returns `meta: {}` but `DeferMiddleware` reads the interaction from `ctx.meta['interaction']` ⇒ the defer stage is dead by construction, not merely stubbed. | M3 / M9 (UR-C-09) | route-to-item |
| 18 | 2026-09-27 | M0 slice 4 | `src/permissions/resolver.ts:153-155` | Layer 7 denies any command lacking `permissionDeclared`, which **masked** the slice-4 tier fail-open well enough that 5 of the first 6 tests written for it passed against the vulnerable code. | M0 (recorded, not changed) | route-to-item |
| 19 | 2026-09-27 | M0 slice 4 | `src/commands/command-registry.ts:38-45` | `register(def)` accepts a command for a `moduleId` with no tier entry — it builds the fail-open state slice 4 had to defend against. Slice 4 closed the consequence, not the cause. | M0 hardening / M2 | route-to-item |
| 20 | 2026-09-27 | M0 slice 5 | `scripts/swastik-deploy.ts:47` | The deploy CLI never sent `x-internal-api-key`, so it could not have worked against the pre-existing gate either. Found by grepping callers **after** declaring the client list complete. | UR-C-02 | **fixed-in-slice-5** |
| 21 | 2026-10-01 | M0 slice 6 triage | `src/db/migrations/20260101000028_create_signing_keys.ts` | The `signing_keys` table stores `publicKey`, `algorithm` and `active`, but has **no private-key column**, so the Ed25519 signing key §15.8 requires has no custody anywhere in the schema. Any signer built in slice 6b must decide custody explicitly rather than discovering this mid-implementation. | UR-B-04 → M0 slice 6b | **RESOLVED (slice 6b)** — the private key is held in-process from `BUILD_SIGNING_PRIVATE_KEY` and never persisted; `signing_keys` stays public-key-only (no migration adds a private-key column). Slice 6b decision #1. |
| 22 | 2026-10-01 | M0 slice 6 triage | `src/module-system/swastik-loader.ts:160` | The dynamic import carries no buildId, so the ESM cache can serve a previous version's bytes across a hot swap. The promoted entry name (`<slug>` or `<slug>__<version>`) does not identify a build, so there is currently **nothing on disk** that ties a loaded directory to a `builds` row. | UR-C-07 → M0 slice 6b | **RESOLVED (slice 6b)** — promotion writes `build-provenance.json` (buildId + signature) into the promoted directory and the loader reads it, so a directory is tied to its `builds` row; the import URL is `index.js?b={buildId}`. Slice 6b decision #2. |
| 23 | 2026-10-01 | M0 slice 6b | `src/bootstrap/bootstrap.ts:307` | The loader's §15.8/§15.9 verification is an injected guard (`buildStore` + `verifier`); the production call site does not yet pass it, so the guard is not armed in the shipped binary. `bootstrap.ts` is outside slice 6b's fence (its stage sequence is read-only). | M6 (loader production wiring) | **open — routed** |
| 24 | 2026-10-02 | M0 slice 6c-iii | `src/http/routes/admin.routes.ts` (`AdminRoutesDeps`) | The governance deps `operatorAllowList`, `operatorVerifier` and `credentialActivator` are optional; until the caller that constructs `adminDeps` (bootstrap) supplies them, the approve/decline route fail-closes and approval does not activate the credential. `bootstrap.ts` is outside this slice's fence. | M6/M9 (admin deps wiring) | **RESOLVED (slice 6c-vi)** — `bootstrap.ts` now supplies all three deps (one shared `HttpCredentialClient`). |
| 25 | 2026-10-02 | M4 | `src/db/repositories/rbac-grant.repository.ts` | The runtime grant writer exists and is tested, but nothing constructs it in `bootstrap.ts` / wires it into the resolver, so Layer 7 grants still cannot be written at runtime through the app. | M9 (runtime wiring) | **open — routed** |

Triage values: `route-to-item` (reopen/attach a work-order item) · `backlog` (pre-re-baseline, unrelated) · `mechanical-unblock-done` (logged one-line fix).

---

## Deviations

> Any action taken under this migration that the prompt's rules R1–R12 would not cover. Deviations must be recorded here, never silent. #1–#12 are carried forward verbatim in substance from the retired ledger (`0c625c1:migration-ledger.md`).

| # | Date | Item | Deviation | Reason |
|---|------|------|-----------|--------|
| 1 | 2026-09-26 | M0 slice 1 | Edited `apps/main/scripts/e2e-test.ts`, outside the declared radius: added an `adminHeaders()` helper supplying `x-internal-api-key` and dropped the now-ignored `source` field from three bodies. | Mechanical unblock under R3 caused directly by slice 1 — the script called `/admin/*` with no key. |
| 2 | 2026-09-26 | M0 slice 1 | Edited `apps/main/docker-compose.yml` environment and port mappings (loopback-pinned `8080/8081/8082`; bind hosts set to `0.0.0.0` in-container). | UR-B-03 names "configurable bind host; loopback compose mapping" and the file is inside the radius; without it the new loopback default makes the published ports unreachable. |
| 3 | 2026-09-26 | M0 triage | Read-only survey of all 17 P0 rows, including files not edited in later slices. | M0's source of truth is the P0 flaw rows; the triage is a prerequisite for declaring a radius (R2), not a fix. |
| 4 | 2026-09-26 | M0 triage | No full-project `tsc --noEmit` and no master-prompt audit were run. | R5 makes a full-project compile a gate for M11 only. Per-item gates used instead. |
| 5 | 2026-09-27 | M0 slice 2 | Read-only survey outside the slice radius (`module-loader.test.ts`, `first-party-module-seed.test.ts`, `m6-promotion.test.ts`, `promotion.ts`, `env.schema.ts`, `docker-compose.yml`, `deploy/k8s/base/configmap.yaml`). None edited. | Required to declare the radius honestly: the legal on-disk entry shape is two-fold, and a wrong assumption would have written a guard that broke the promotion path. |
| 6 | 2026-09-27 | M0 slice 3 | Edited `tests/unit/admin-routes.test.ts:61-80`, outside the slice radius: rewrote the feature-flags test from "200 + dispatch called" to "501 + dispatch not called". | Finding #14 — the test asserted the defect the row exists to remove. R3 protects unrelated *code*, not a test that pins the defect. |
| 7 | 2026-09-27 | M0 slice 3 | Edited `tests/unit/m9-revoke-suspend.test.ts:10` (one line: added `'127.0.0.1'` to the harness fixture). | Finding #13 — slice 1's damage, found by the full-suite run. R3's explicit one-line mechanical exception. |
| 8 | 2026-09-27 | M0 slice 4 | Added one `registerModule(...)` line to 8 fixtures in `command-registry-router.test.ts` and 1 in `m3-embed-and-dm.test.ts` — declared in the slice radius before editing. | These 9 tests built a registry state production cannot produce and passed *because* of the fail-open slice 4 removes. No assertion weakened, deleted or reworded. |
| 9 | 2026-09-27 | M0 slice 4 | Added one `registerModule('audio','core')` line to the shared `buildRouter` in `tests/unit/m7-persona.test.ts`, **not** in the declared radius. | An honest scope miss found by the full-suite run; the alternative was a red suite. Logged because the radius was declared before editing and this file was not on it. |
| 10 | 2026-09-27 | M0 slice 5 | Edited `scripts/verify-all.ts`, outside the item's fence: its `waitFor` on `GET /swastik/status` would have died with a misleading timeout once the route was keyed. | UR-C-02's own decision created the breakage. Precedent: deviation #1. The helper gained an optional `headers` argument; the key is never logged or interpolated into a URL. |
| 11 | 2026-09-27 | M0 slice 5 | Rewrote one assertion in a slice-2 test that pinned the deleted hand-rolled `requireInternalKey` helper. | Same category as #6: the assertion pinned a mechanism, not the intent; the intent ("deploy is key-gated") is now enforced more strongly by a `preHandler`. |
| 12 | 2026-09-27 | M0 slice 5 | Edited `scripts/swastik-deploy.ts`, adding the header, an `INTERNAL_API_KEY is required` throw, and the import. | UR-C-02's remedy says "CLI sends header" verbatim — the file is inside the row. Repaired a path that could never have worked. |
| 13 | 2026-10-01 | M0 slice 6a (reconciliation) | The R12 step-4 corrections **applied to `docs/change-log.md`** at slice 6a's close (R11): CF-22's legacy "DRM" in the v4.6.0 narrative, and SC-04's master-table line counts. | Deferred from the reconciliation pass to the next change-log edit, which turned out to be this slice's close (R11) — the same debt pattern the prompt records for its own earlier revisions (E6 GOV-23). **Correction to the recorded correction:** SC-04's own figures (blueprint 13,139, concept 581) were stale by the time they were applied. Re-measured on the working tree at slice 6a: blueprint **13,147**, concept **583**. The change-log now carries the re-measured counts and a note that the UR 2.0 figures were superseded, rather than transcribing a stale number that was already wrong. A state-of-record correction must be re-verified against the tree, not copied (same principle as #14). |
| 14 | 2026-10-01 | M0 slice 6 (reconciliation) | M0's row board in this ledger reads **7 DONE / 7 PARTIAL / 3 OPEN**, not the template snapshot's **5 / 9 / 3**. The headline tally is retained as UR 2.0's, but the row-level board is not re-asserted in the snapshot's shape. | The snapshot's board credits UR-A-02 and UR-C-06 as two DONE rows for the *same* defect (the CLAI TCP REPL) while holding UR-B-02 and UR-C-01 at PARTIAL, though slice 2 closed both. 7 + 7 + 3 = 17 with 0 orphans. **A state-of-record correction is not a unilateral re-credit** (R12 / UR §8.1.3 #19): the row-level evidence is recorded, the tally is not re-asserted, and M11 reconciles. |
| 15 | 2026-10-01 | M0 slice 6 | No full-project `tsc --noEmit` and no master-prompt audit were run for slice 6 either, at the session owner's explicit instruction; verification is scoped to the slice's own tests, a scoped typecheck of the blast-radius paths, and the full **unit** suite (which the standing slice constraint §5 rule 4 requires). | R5 already forbids a full-project compile loop between items; the owner reaffirmed it for this session. Recorded so the missing gate is visible rather than silently absent — the full-project typecheck remains owed at M11. |
| 16 | 2026-10-01 | M0 slice 6a | `developers.devId` stays a plaintext identifier and `redact()` keeps emitting its 4+4 fragments; only the credential secret and the two Argon2id hashes are redacted. `devId` is no longer accepted as a bearer token. | §22.8's storage rule is scoped to the `credentials` table ("no plaintext devId is persisted anywhere **in this table**"), and `devId` is the PK plus an FK target for `builds.devId` and `licenses.subjectDevId` — removing it is a migration-graph change belonging to M5/M6/M9. The row's real defect was that the devId *authenticated* anyone; that is closed. Recorded because it narrows UR-C-05's literal wording and the narrowing is a judgment call, not a fact from the UR. |
| 17 | 2026-10-01 | M0 slice 6a | Added a `credentials` service to `docker-compose.yml` and two new env keys (`CREDENTIALS_SERVICE_URL`, `CREDENTIALS_SERVICE_TIMEOUT_MS`). | The credentials entry point had **no** container, so the new verify/issue endpoints would have been unreachable from Swastik in every compose deployment — §13.6/§22.8 delegate to a service that did not exist. All three files were inside the slice's declared radius (radius line for `docker-compose.yml` and `env.schema.ts` + `.env.example`), and new keys went into schema and example together per the repo's env contract. |
| 18 | 2026-10-01 | M0 slice 6a | The new `credentials` table sits adjacent to M8's `sealed_credentials`. | Pre-flagged in M8's record before 6a coded. Disjoint by construction and verified by inspection: 6a stores Argon2id hashes and a hash-bound devId only; no sealed value, no envelope, no `wrappedKey`. M8's scope is unaffected. |
| 19 | 2026-10-01 | M0 slice 6a | Developer registration now makes Swastik depend on a reachable Credentials Service (`POST /credentials/issue-devid`). A failure returns 500 rather than silently registering a developer with no credential. | §22.8/§13.6 require issuance to be delegated to that service alone, so the coupling is the row's design, not a convenience. Failing loudly is correct: the alternative (inserting a developer row with no credential) would produce exactly the unbound-credential state the slice exists to prevent. |
| 20 | 2026-10-01 | M0 slice 6a | `pnpm migrate` cannot run in this workspace, so the two new migrations were verified against a **scratch database** created via `docker exec` instead of via `pnpm migrate`. | Pre-existing and unrelated to this slice: the local `dumby` DB records migrations as `*.js` while `pnpm migrate` runs through `tsx` and loads `*.ts`, so knex reports the directory corrupt. Verification substituted a throwaway `dumby_m0cred` database, exercising `up()` and `down()` for both migrations plus the enum and unique-index constraints; the scratch database was dropped and left no residue. Recorded because the substitution is a weaker gate than the real migration runner and M11 should re-run it. |
| 21 | 2026-10-01 | M0 slice 6b | Migration 39 verified by compiling its `up()`/`down()` to SQL with a connection-less knex `pg` client, **not** against a live Postgres. | No Postgres server is available in this environment (only the `psql` client; no `pg_ctl`/`initdb`/docker), unlike slice 6a which used a scratch DB via `docker exec`. The SQL is valid and symmetric (8 columns + index added; 8 dropped), but constraint behaviour was not exercised against a server. A weaker gate than slice 6a's; M11 should re-run the real migration runner (see also deviation #20). |
| 22 | 2026-10-01 | M0 slice 6b | `loadModulesFromTierVolumes` gained **optional** `buildStore`/`verifier`/`quarantineDir`; when absent it warns once and imports unverified (pre-6b behaviour). | Required to keep the 901-test suite green without editing the six existing loader test files (R3: log, don't fix; R4: no opportunistic rewrite of tests). The production wiring that arms the guard is out of this slice's fence (finding #23). The slice's own tests exercise the armed path. |
| 23 | 2026-10-01 | M0 slice 6b | The provenance sidecar (`build-provenance.json`) is written into the promoted directory by `promoteAtomically`, so a promoted module directory carries an extra file beyond its manifest. | §15.8 sanctions the signature/descriptor write in the promotion path (the ledger's slice-6 radius names it); the manifest/directory match is name/version-based (slice 2) and does not enumerate directory entries, so the sidecar does not trip it. Recorded because the on-disk shape of a promoted directory changed. |
| 24 | 2026-10-02 | M0 slice 6c-ii | Module ownership is enforced inline in `swastik.ts` by constructing a `PostgresModuleOwnershipStore(db.knex)` inside each of the upload and deploy routes, rather than through an injected dependency. | The entry point (`swastik.ts`) builds its own `db`/knex and is not importable in a unit test (finding #11), so there is no seam to inject through without a larger refactor (out of fence). The pure `decideModuleOwnership` and the store are unit-tested independently; the route wiring is covered structurally. |
| 25 | 2026-10-02 | M0 slice 6c-iii | The governance route reads the approver from the Power Engine body `actorId` and validates it against `projectOwnerIds`; the owner identity model is not otherwise defined in the blueprint. | Every `/admin/power-engine/*` route already carries a body `actorId` (the established pattern), so this reuses it rather than inventing a new identity header. §15.8's "identity that resolves to a project owner" is satisfied by membership in `projectOwnerIds`. Recorded because the blueprint does not define the owner registry, and this is the judgment call that fills the gap. |
| 26 | 2026-10-02 | M0 slice 6c-iii | `developers.approvalStatus` (pending/approved/declined) is treated as the developer-approval surface for UR-B-01, left distinct from the `licenses` six-state machine (M5). | UR-B-01's own words ("transitions the developer to `approved`") name the developer column, and §15.7's license machine is M5's item with its shaped code already present. Reconciling the two is a design decision that belongs to M5, not M0. Recorded so the split is visible. |
| 27 | 2026-10-02 | M0 slice 6c-v | The `developer_approvals` migration added in slice 6c-iii is deleted and superseded by the generic `approvals` table (migration 41, same slot). | The owner chose the generic-table option (A) after 6c-iii shipped; nothing was deployed and no data existed, so rewriting the unshipped migration is cleaner than a create-then-drop pair. Recorded because a pushed migration was rewritten. |
| 28 | 2026-10-02 | M0 slice 6c-v | The approval route drives the `licenses` six-state machine (`transitionLicense`) to make `licenses.state` authoritative (decision A). | §15.7 makes the license the authority for "may publish/deploy"; the license machine's shaped code already exists. Driving one approval transition is a contained use of that code; the full §15.7/§44.8 governance family remains M5's item (R10). |
| 29 | 2026-10-02 | M0 slice 6c-vi | `src/bootstrap/bootstrap.ts` is edited (the admin-deps wiring) — outside M0's declared fence, whose read-only note listed bootstrap's stage sequence. | The owner explicitly instructed the residual (finding #24) be fixed. The edit only supplies the three governance deps and adds one client construction; it does not change the stage sequence. Recorded because the file was declared read-only. |

---

## Change-Log Discipline (R11)

Every request row that reaches DONE or PARTIAL-routed in a pass gets **one line** in `docs/change-log.md` under the *v5.0.0 implementation track — per-request record*, citing the request ID, its UR §8.1.2 row number, the ledger item/slice, a one-clause record of the change, the status, and the proof. OPEN rows get no line until they close. M11's convergence gate reconciles the counts: ledger DONE/PARTIAL rows ↔ change-log lines ↔ the 121-row coverage map.

**Format** (clarified per E6 GOV-27): the change-log's M0 table is five columns — `Request | Row | item/slice | Record | Status` — with the proof folded into the `Record` cell. That shape is compliant; M11 must read it as the norm, not as a missing column.

**Debt recorded (E6 GOV-23):** migration-prompt 5.0.0/5.0.1/5.0.2 and ledger template v1.0 (2026-09-24/25) carried no change-log lines. Recorded as a backfill in the implementation track, dated to their original issue dates, at the next change-log edit (see deviation #13). The 5.1.0–5.3.0 prompt revisions and template 2.1–2.2 were recorded at their own revisions (`048ae67`, `09b64f3`, `f06b85b`, `4d80327`, `3fdc811`).

**Protocol revisions of this ledger itself** are change-log events under the same discipline.

**State:** slices 1–5 backfilled and SC-01-corrected; slice 6a's lines were written at its close (UR-B-05/UR-C-04/UR-C-05); slice 6b's lines are written at this close (UR-B-04/UR-C-07, added to the M0 table above).

---

## Ledger Revision History

| Version | Date | Author | Change |
|---|---|---|---|
| 1.0 | 2026-10-01 | Dumby Core Engineering | Fresh construction from `docs/migration-ledger-template.md` v2.2's record shapes, seeded with its §2 snapshot (protocol v5.3.0). Slice 1–5 records, findings #1–#20 and deviations #1–#12 carried forward from the retired ledger (`0c625c1`). M0's 17 P0 rows re-triaged against working HEAD (`ac599fe`); slice 6 claimed and its blast radius declared. R12 reconciliation recorded as PARTIAL (M0 done, M1–M9 tree triage outstanding — which blocks M1). |
| 1.1 | 2026-10-01 | Dumby Core Engineering | **Slice 6a closed** (UR-B-05, UR-C-04, UR-C-05 → DONE). Recorded its design decisions (7, binding on 6b/6c), done-gate evidence, deviations #16–#20, and the routing of what was deliberately left undone. Deviations #13 (SC-04/CF-22 applied, with SC-04's own figures found stale and re-measured) and the header/row-board pointers updated. Next: 6b — read findings #21 and #22 first. |
| 1.2 | 2026-10-01 | Dumby Core Engineering | **Slice 6b closed** (UR-B-04, UR-C-07 → DONE). `builds` provenance columns (migration 39), the Ed25519 signer/verifier (`build-signing.ts`, in-process key custody — finding #21), the loader's verify-before-import + quarantine + buildId cache-bust, the `build-provenance.json` sidecar written by promotion (finding #22), and the env keys. Findings #21/#22 resolved and #23 recorded; deviations #21–#23 added; the M0 row board reconciled to 12 DONE / 5 PARTIAL / 0 OPEN (the 6a record had already closed UR-B-05/UR-C-04/UR-C-05). Next: 6c. |
| 1.3 | 2026-10-02 | Dumby Core Engineering | **Slice 6c-i closed** (UR-B-03 → DONE): the four remaining entry points (`pep.ts`, `ssh-clai.ts`, `swastik.ts`, `twixter.ts`) now source their listen host from `PEP_BIND_HOST`/`CLAI_BIND_HOST`/`SWASTIK_BIND_HOST`/`TWIXTER_BIND_HOST` (env keys + `.env.example`); structural test `m0-bind-hosts.test.ts`. Row board 13 DONE / 4 PARTIAL / 0 OPEN. Next: 6c-ii (ownership + owner-approval workflow), then 6c-iii (CLAI limits). |
| 1.4 | 2026-10-02 | Dumby Core Engineering | **Slice 6c-ii closed** (UR-C-03 narrowed): migration 40 adds the `modules` ownership table; the upload and deploy routes claim a fresh slug and refuse a non-owner before staging; `manifest.devId` is required on upload. `tests/unit/m0-module-ownership.test.ts` (6 tests). Deviation #24. Board unchanged at 13 DONE / 4 PARTIAL / 0 OPEN (UR-C-03's approvals-table constraint routes to 6c-iii). Next: 6c-iii (owner-approval workflow), then 6c-iv (CLAI limits). |
| 1.5 | 2026-10-02 | Dumby Core Engineering | **M0 closed.** Slice 6c-iii (UR-B-01 + UR-C-03's constraint → DONE): owner-approval workflow — migration 41 `developer_approvals` + actor CHECK, `governance/developer-approval.ts`, the `POST /admin/governance/developers/:devId/{approve,decline}` surface, credential activation (`POST /credentials/:keyId/activate` + client), and the pending-request workflow. Slice 6c-iv (UR-C-06 → DONE): CLAI session limits (`clai-session-limits.ts`, env keys). Findings #24 recorded; deviations #25–#26 added. Row board **16 DONE / 1 PARTIAL / 0 OPEN** (UR-A-03 → M9). Full suite 945/81 green. Next: M1 (blocked by the R12 reconciliation). |
| 1.6 | 2026-10-02 | Dumby Core Engineering | **Slice 6c-v closed** — the governance model refined to the owner's A/A/A decision: PEP operator identity (`PEP_OPERATOR_IDS` + `operator_keypair` issuance + bearer validation), one generic `approvals` table (supersedes `developer_approvals`), and `licenses.state` made authoritative on approval. Deviations #27–#28 added; finding #24 partially resolved. Full suite 950/81 green. M0 remains DONE; next M1 (R12 first). |
| 1.7 | 2026-10-02 | Dumby Core Engineering | **Slice 6c-vi closed** (finding #24 resolved): `bootstrap.ts` supplies `operatorAllowList` (`PEP_OPERATOR_IDS`), `operatorVerifier` and `credentialActivator` (one shared `HttpCredentialClient`) to `adminDeps`, arming the governance approve/decline route end-to-end. Deviation #29 (bootstrap edited, outside the M0 fence, per owner instruction). Full suite 950/81 green. M0 remains DONE; next M1. |
| 1.8 | 2026-10-02 | Dumby Core Engineering | **R12 reconciliation completed** (item-level re-triage of M1–M11 against the tree; ahead-of-record work credited per owner decision #19; open questions #13/#14/#15/#18/#19 resolved). **M1 closed DONE** (rows 4/5/19 credited; no code change — the tree meets the done-gate). Next: M2 (row 74). |
| 1.9 | 2026-10-02 | Dumby Core Engineering | **M2 triaged → PARTIAL.** Row 74 (`UR-B-11`): merge clause DONE (unified `src/commands`, no `src/core`); enqueue-guild-changes clause NOT done — `command-deployer.ts` still does boot-time delete-then-reregister — routed to M9's row 44 (change queue/BCCM). Next: M3. |
| 1.10 | 2026-10-02 | Dumby Core Engineering | **M3 triaged → PARTIAL.** Rows 9/10/12/21/111 present (renderer, buffer-then-render, embed ban, DM prohibition, interaction registry); row 11 unexercised (→ MR-1…MR-8); row 28 (prefix-ban audit) and row 120 (HttpClient/retry → M9) partial. Done-gate gated on MR-1…MR-8. Next: M4. |
| 1.11 | 2026-10-02 | Dumby Core Engineering | **M4 triaged → PARTIAL.** Rows 32/40/41/42 present (canonical ranks, grant surface, blacklist, RBAC persistence, resolver); row 33 PARTIAL — **no runtime grant writer** (no Postgres surface writing `rbac_grants`). Next: M5. |
| 1.12 | 2026-10-02 | Dumby Core Engineering | **M4 closed DONE** — implemented the runtime grant writer (`src/db/repositories/rbac-grant.repository.ts`: `PostgresGrantWriter`/`InMemoryGrantWriter`, `rbac_grants` persistence, rate-limit↔quota alias). `tests/unit/m4-grant-writer.test.ts` (7 tests; revert → cannot load). Full suite 957/82 green. Finding #25 recorded (writer not yet wired into bootstrap). Next: M5. |
| 1.13 | 2026-10-02 | Dumby Core Engineering | **M5 closed DONE** — implemented the deployment-records writer (`src/db/repositories/deployment-record.repository.ts`) and wired it into `/internal/deploy`; brought `tools/release_manager` under the typecheck gate as a workspace package (`@workspace/release-manager`). `tests/unit/m5-deployment-records.test.ts` (6 tests; revert → cannot load). Full suite 963/83 green; both tsc projects clean. Row 23 routed to M6. Next: M6. |
| 1.14 | 2026-10-02 | Dumby Core Engineering | **M6 triaged → PARTIAL, finding #23 fixed.** `bootstrap.ts` now arms the loader's §15.8/§15.9 provenance guard (`PostgresBuildStore` + `BuildSignatureVerifier`, key from `BUILD_SIGNING_*`). `tests/unit/m6-loader-guard-wiring.test.ts` (3 tests; drop the guard argument → fails). Full suite 966/84 green. Outstanding: manifest single-source (E9 D3) + `packages/swastik` layout drift (E2 S-26). Next: M7. |
| 1.15 | 2026-10-02 | Dumby Core Engineering | **M7 closed DONE** — implemented the ADR-003 fix: the persona bot token is now stored sealed (`botTokenSealed: SealedEnvelope` via `crypto/envelope.ts`; `sealPersonaBotToken`/`openPersonaBotToken`/`derivePersonaBotTokenDigest`; `persona_identities.botTokenSealed`, migration 42), not only as a digest. `tests/unit/m7-persona-sealed-token.test.ts` (5 tests; revert → 2 fail). Full suite 971/85 green; tsc clean. Next: M8. |
| 1.16 | 2026-10-02 | Dumby Core Engineering | **M8 closed DONE** — implemented the E6 GOV-13 scope-boundary verification: `CREDENTIAL_STORE_INVENTORY` + `verifyEnvelopeScope` in `crypto/envelope-scope.ts`, plus `tests/unit/m8-scope-verification.test.ts` (6 tests incl. migration audits; un-export → 3 fail). Full suite 977/86 green; tsc clean. Next: M3/M4 residuals, then MR-1. |
