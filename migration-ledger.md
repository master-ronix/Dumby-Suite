# Migration Ledger — v5.0.0 Re-Baseline

> **This file is the single source of truth for migration progress.** The agent reads it at the start of every session and updates it at the end of every item. An item without a record here did not happen; an IN-PROGRESS item with a resume note is continued, never restarted.
>
> Created: 2026-09-26 · Protocol: `workspace/docs/migration-prompt.md` v5.0.2 (twenty-item work order: M0–M8 → MR-1–MR-8 → M9–M11) · Status: IN PROGRESS
>
> **Starting-state note (2026-09-26, session 1).** This ledger was created from `docs/migration-ledger-template.md` after the previous ledger was deleted in commit `9f7e427`. Git history shows earlier sessions landed work under commit `d334cfb` ("land v5.0.0 re-baseline module system, renderer, RBAC, governance, persona, and crypto work") and `581499e` ("promote builds into tier volumes and seed first-party modules") **without any surviving ledger record**. Per rule R6 an item without a ledger record is not done, so M1–M8 and MR-1…MR-8 are recorded below as NOT STARTED *pending verification*, not as clean baselines — their done-gates are unproven, and M0's own triage (below) found substantial v5.0.0 work already present in the tree. Verifying those items is M11's convergence duty; do not treat this ledger's NOT STARTED marks as evidence the code is absent.

---

## Summary

| Item | Title | Status |
|------|-------|--------|
| M0 | P0 security flaws | IN-PROGRESS |
| M1 | Tier volumes & blind discovery | NOT STARTED |
| M2 | Unified command tree | NOT STARTED |
| M3 | Core Renderer, buffer-then-render, embed ban | NOT STARTED |
| M4 | RBAC Layer 6/7 redesign | NOT STARTED |
| M5 | License machine, Compatibility Ledger, Deployment Records | NOT STARTED |
| M6 | Swastik promotion pipeline | NOT STARTED |
| M7 | Twixter persona model | NOT STARTED |
| M8 | Envelope encryption | NOT STARTED |
| MR-1 | hello-world module rewrite (Standard-tier) | NOT STARTED |
| MR-2 | health module rewrite (Core-tier) | NOT STARTED |
| MR-3 | browse module rewrite (Core-tier) | NOT STARTED |
| MR-4 | queue module rewrite (Core-tier) | NOT STARTED |
| MR-5 | persona module rewrite (Core-tier) | NOT STARTED |
| MR-6 | permit module rewrite (Core-tier) | NOT STARTED |
| MR-7 | modules module rewrite (Core-tier) | NOT STARTED |
| MR-8 | dashboard module rewrite (Core-tier) | NOT STARTED |
| M9 | Remaining implementation-flaw corrections | NOT STARTED |
| M10 | Terminology & legacy-name sweep | NOT STARTED |
| M11 | Convergence pass | NOT STARTED |

Statuses: `NOT STARTED` → `IN-PROGRESS` → `DONE` / `BLOCKED` / `SKIPPED (reason)`.

---

## Item Records

### M0 — P0 security flaws

- **Status:** IN-PROGRESS
- **Started:** 2026-09-26 · **Completed:** —
- **Source of truth read:** `docs/ur/UR-20260918-001` §8.1.2 rows 34–37 (Group A), 64–69 (Group B), 92–98 (Group C); severity vocabulary line 991 (`Critical` → P0, `High` → P1, `Medium` → P2). 17 P0 rows total.
- **Blast radius (declared 2026-09-26, before any edit):** the files named by the 17 P0 rows —
  - Control-plane auth / bind: `apps/main/src/http/server.ts`, `apps/main/src/http/internal-auth.ts`, `apps/main/src/http/routes/admin.routes.ts`, `apps/main/src/http/routes/info.routes.ts`, `apps/main/src/http/power-engine-dispatcher.ts`, `apps/main/src/bootstrap/bootstrap.ts`, `apps/main/src/config/env.schema.ts`, `apps/main/.env.example`, `apps/main/docker-compose.yml`
  - Entry points: `apps/main/src/entry/swastik.ts`, `apps/main/src/entry/pep.ts`, `apps/main/src/entry/ssh-clai.ts`, `apps/main/src/entry/credentials.ts`
  - Path containment: `apps/main/src/shared/utils/path-guard.ts`, `apps/main/src/module-system/swastik-loader.ts`, `apps/main/src/module-system/promotion.ts`
  - Dispatch: `apps/main/src/commands/command-router.ts`
  - Credentials / provenance storage: `apps/main/src/credentials/**`, `apps/main/src/db/migrations/**`
  - Tests: `apps/main/tests/unit/m0-*.test.ts` (new/extended only)
  - Everything else is read-only for M0. Bootstrap stages, DI, shutdown, renderer, RBAC, personas, crypto and the command tree are OUT of the fence (R4) — including `bootstrap.ts`, whose *bind-host literals* are in the fence but whose stage sequence is not.
- **P0 row triage (read-only survey, 2026-09-26 — status is against the tree, not the UR doc):**

| Row | UR location | Subject | Tree state |
|---|---|---|---|
| UR-A-01 | §22.2, §22.3 | PEP/admin trust self-declared `source`; binds all interfaces | **DONE** (slice 1) — `source` now derived from `request.ip`, never the body; every `/admin/*` route behind the constant-time key; three bind hosts default to `127.0.0.1` |
| UR-A-02 | §22.6 | CLAI TCP-fingerprint REPL | **DONE** — `entry/ssh-clai.ts` is a real ssh2 public-key-only server; no TCP REPL in tree |
| UR-A-03 | §17.3, §19 | Ad-hoc dispatch; middleware dead; unknown tier fails open | **PARTIAL** (materially reduced, slice 4) — the fail-open is closed: `command-router.ts:266` no longer returns early on an unresolved tier, and the two `?? 'standard'` coercions are gone, so an unresolved tier is denied before dispatch and never evaluated as the least-privileged tier. Remaining clauses of row 36 are its own named **UR-C-09 dependency** (P1 → M9): 4 of 12 middlewares still inert (finding #3), though the router's real `PermissionResolver` is the effective gate; `src/core/commands` unification is moot per §17.3/ADR 002 |
| UR-A-04 | §22.3 | PEP stubs fake success | **DONE** (slice 3) — all 22 no-op PEP actions now answer 501 `NOT_IMPLEMENTED` without dispatching, writing state, or recording an `allowed` audit row; 12 admin routes were already honest, and 8 admin routes + `pep.ts` + `ssh-clai.ts` were not |
| UR-B-01 | §15.8 | `/internal/deploy` auto-approves unknown devs | **DONE** — auto-approver removed; 403 for unknown/pending at `swastik.ts:534-542` |
| UR-B-02 | §15.8 | Upload/deploy unvalidated; paths from raw `version` | **PARTIAL** — `path-guard.ts` + zod exist and cover `swastik.ts`/`promotion.ts`; slice 2 closed the loader half (`swastik-loader.ts` now parses every discovered entry name through `assertSafeSlug`/`assertSafeVersion` and asserts the realpath is inside `modulesDir`); the four "unguarded joins" at `:62,71,78-79,112` are gone except the const-tuple volume join, which was never attacker-influenced |
| UR-B-03 | §22, §32 | Internal surfaces expose 0.0.0.0; key never checked | **DONE** (slice 1) — constant-time preHandler on the API server's `/admin/*` plus PEP/CLAI/Twixter/credentials and Swastik `/internal/*`; `API_BIND_HOST`/`HEALTH_BIND_HOST`/`METRICS_BIND_HOST` default to `127.0.0.1`; compose ports loopback-pinned |
| UR-B-04 | §15.8, §32 | Loader imports any file on the live volume | **OPEN** — no hash/Ed25519 verify, no quarantine, no signed descriptor; `builds` has no provenance columns |
| UR-B-05 | §22.8 | Developer identity self-declared tokens | **OPEN** — no `credentials` table; `devId` is a plaintext PK (`20260101000032:9`) used directly as the bearer token |
| UR-B-06 | §22.3 | PEP trusts body `source`; audit lies | **DONE** (slice 1) — `source` is server-derived on all three surfaces; slice 3 additionally removed the false `allowed` audit rows that the no-op handlers produced |
| UR-C-01 | §15.8, §32 | Request-derived path components unvalidated | **PARTIAL** — `safeJoin`/`assertPathInside`/`assertSafeSlug`/`assertSafeVersion` exist; slice 2 applied them in the loader (entry-name parse + realpath containment) |
| UR-C-02 | §15.8, §32 | Swastik `/internal/*` unauthenticated | **DONE** (slice 5) — one shared constant-time `registerInternalAuth` preHandler is now the *only* gate on the Swastik app, default-protecting every route except three declared developer bearer routes. Closes findings #5, #6. Rejections write an `INTERNAL_AUTH_DENIED` audit row. Both in-repo clients (compose healthcheck, `verify-all.ts`) present the header |
| UR-C-03 | §15.7 | No module ownership; auto-approver exists | **PARTIAL** — auto-approver gone; no ownership table, no non-owner 403; `manifest.devId` optional ⇒ zero binding |
| UR-C-04 | §22.8 | Credentials Service broken and unauthenticated | **PARTIAL** — sealed store is real; the argon2 branch targets `api_sessions`, which has no `id`/`credentialHash`/`label` columns, so it cannot execute; no rate limit/bodyLimit |
| UR-C-05 | §22.8, §32 | devIds plaintext; differentiated failures | **OPEN** — no `devIdHash`; `swastik.ts:209-215` answers 401 vs 404 (failure oracle) |
| UR-C-06 | §22.6 | CLAI fake TCP REPL | **DONE** — same as UR-A-02 |
| UR-C-07 | §15.9 | No verification before import; ESM cache stale | **PARTIAL** (was OPEN) — slice 2 added the manifest/directory match and the symlink containment check; still OPEN on hash verify, quarantine and cache-busted import URLs |

  **Status after slice 5: 8 of 17 rows fully DONE** (UR-A-01, UR-A-02, UR-A-04, UR-B-01, UR-B-03, UR-B-06, UR-C-02, UR-C-06). **9 still need work** — 6 partial (UR-A-03, UR-B-02, UR-C-01, UR-C-03, UR-C-04, UR-C-07) and 3 open (UR-B-04, UR-B-05, UR-C-05). This item is larger than one session.
  - **Why 8 and not more:** UR-A-03 and UR-C-07 are *materially reduced but still partial* by design — both name UR-C-09 (P1 → M9) as their own dependency, so M0 cannot close them without doing M9's work out of order (R4). UR-B-02/UR-C-01/UR-C-03/UR-C-04 are loader/tier-volume work that slice 6 still owes or that is only half-satisfiable while promotion runs through Swastik. Slice 6 is the last M0 slice; if it cannot close the remainder honestly, the residue is routed with evidence rather than force-fitted.
- **Done-gate evidence (tests):**
  - Slice 1 — `tests/unit/m0-security.test.ts` (14 assertions across 3 new `describe` blocks), **verified fail-before / pass-after** by reverting `server.ts` + `admin.routes.ts` and re-running: 5 tests failed, then passed again on restore. Covers: `/admin/*` 401 without a key; missing / wrong-length / wrong-value keys return byte-identical bodies with no fingerprint leak; `/api/info` on the same server still 200; a body-supplied `source: 'pep-internal'` no longer satisfies an allow-list that omits the peer IP (403 `UNTRUSTED_SOURCE`); a genuinely trusted loopback peer still gets 200; bind hosts default to `127.0.0.1` and are overridable; bootstrap contains no wildcard literal.
  - Slice 2 — 10 new assertions (2 `describe` blocks), **6 of them verified fail-before / pass-after** by stashing only `swastik-loader.ts` to HEAD: `Tests 6 failed | 20 passed` on revert, `Tests 26 passed` on restore. Full detail in the slice-2 record below.
  - Slice 3 — 6 new tests (1 `describe` block), **5 of them verified fail-before / pass-after** by stashing `admin.routes.ts` + `pep.ts` + `ssh-clai.ts` to HEAD: `Tests 8 failed | 24 passed` on revert (5 slice-3 + 3 slice-1 tests that share `admin.routes.ts`), `Tests 32 passed` on restore. The sixth asserts a *pre-existing* dispatcher property the fix depends on — a throwing handler records no `allowed` row — and is therefore expected to pass in both states. Full detail in the slice-3 record below.
  - **Full unit suite run after slice 3: 75 files / 857 tests, all green.** This is the widest gate any M0 slice has run, and it is what surfaced the two collateral test-contract problems recorded as findings #13 and #14 and fixed under deviations #6 and #7.
  - Slice 4 — 7 new tests (1 `describe` block), **5 of them verified fail-before / pass-after** by stashing only `command-router.ts` to HEAD: `Tests 5 failed | 34 passed` on revert, `39 passed` on restore. The revert proved the exploit rather than merely a missing denial — the handler **executed** (`expected "vi.fn()" to not be called at all, but actually been called 1 times`). 2 further tests are deliberate no-regression controls that pass in both states. Full detail, including why the first draft of these tests proved nothing, in the slice-4 record below.
  - **Full unit suite run after slice 4: 75 files / 864 tests, all green.** This run is what found `m7-persona.test.ts` (deviation #9) — the second slice running where a targeted net would have missed collateral.
  - `tsc --noEmit` clean, `eslint --max-warnings=0` clean (whole app), `prettier --check` clean (whole app).
  - Slices 5–6: no proving test yet. **M0 is not DONE.**
- **What changed:** slices 1, 2, 3 and 4 — see the slice records below. Slices 5–6 not started.

#### M0 slice 2 — loader path containment + manifest/directory match (UR-B-02, UR-C-01, loader half of UR-C-07) + finding #2 — DONE

- **Blast radius (declared 2026-09-26, before any edit — R2):**
  - `apps/main/src/module-system/swastik-loader.ts` — the only source file whose logic changes.
  - `apps/main/src/entry/swastik.ts` — **finding #2 only** (a `setErrorHandler` on the Swastik instance, mirroring `http/server.ts:28`). No route, gate or status logic in this file is in scope for slice 2; findings #5, #6 and the UR-C-02 work are slice 5.
  - `apps/main/tests/unit/m0-*.test.ts` — extended (the M0 test scope declared above). Existing `module-loader.test.ts` and `first-party-module-seed.test.ts` are **read-only**: they are the no-regression net for this slice, not a file to edit.
  - Everything else read-only, including `bootstrap.ts` (the loader's option contract is unchanged so the single call site at `bootstrap.ts:307` needs no edit — this is why no optional `stagingVolume` option was added; see judgment calls), `path-guard.ts` and `promotion.ts` (both already export/apply everything needed).
- **Re-verified triage of the four "unguarded joins" before editing** (the ledger's slice-2 pointer to `:62,71,78-79,112` is corrected here — the tree is the source of truth, and not all four are the same severity):
  - `:62` `join(modulesDir, volumeName)` — **not a finding.** `volumeName` iterates the frozen `MODULE_VOLUME_NAMES` const tuple; it is not caller- or request-influenced. Left unguarded deliberately; guarding it would be noise.
  - `:71` `join(volumePath, entry)` — **finding.** `entry` is a raw `readdir` name, never validated as a slug or a `<slug>__<version>` promoted directory, so any directory name in a tier volume is loaded as a module.
  - `:78` `resolve(entryPath)` — **the actual containment hole.** `resolve` is purely lexical; it does not follow symlinks and no `assertPathInside` follows it, so a tier-volume entry that is a symlink is imported from wherever it points.
  - `:79,112` `join(moduleDir, 'manifest.json' | 'index.js')` — consequence of the two above: they inherit an unvalidated `moduleDir`.
  - Missing **manifest/directory match** (UR-C-07's loader half) — the loader registers under `manifest.name` with no check that it equals the directory it was found in.
- **What changed (slice 2):**
  1. `swastik-loader.ts` — every discovered entry name is now parsed by `parseDiscoveredModuleName` into a `{slug, version}` pair using the existing `assertSafeSlug` / `assertSafeVersion` guards, and an unparseable name is a hard per-entry failure rather than a silent load. This closes the ledger-prior-session claim that "path guards exist and cover `swastik-loader.ts`" — they did not; the file imported them nowhere before this slice.
  2. `swastik-loader.ts` — `resolve(entryPath)` is replaced by `realpathSync(entryPath)` followed by `assertPathInside(modulesRoot, moduleDir)`, where `modulesRoot` is `realpathSync(modulesDir)` computed once before the volume loop. This is the real UR-C-01 fix: `resolve` is purely lexical, so a tier-volume entry that is a symlink was imported from wherever it pointed. Both sides are realpath'd on purpose — `/tmp` is a symlink on macOS, so comparing a realpath'd child against a symlinked root would reject every legitimate module.
  3. `swastik-loader.ts` — `manifest.name` must equal the directory slug, and for a `<slug>__<version>` directory the manifest version must equal the directory version. This is the loader half of UR-C-07, mirroring `promotion.ts:93-104` (the reference implementation named in the resume note).
  4. `entry/swastik.ts` (finding #2 only) — the Swastik instance now installs a `setErrorHandler` built from the same two pieces the API server uses (`http/server.ts:28`): a `PathGuardError` becomes a 400 carrying a static body, and everything else falls through to the shared `toErrorResponse`, which cannot echo `err.message`. Previously Fastify's default handler answered `{"statusCode":500,...,"message":"path \"/etc\" escapes root \"/mnt/modules\""}`.
- **Done-gate evidence (tests):** 10 new assertions in `tests/unit/m0-security.test.ts` (2 `describe` blocks), of which **6 are proven fail-before / pass-after** by stashing only `swastik-loader.ts` back to HEAD and re-running: exactly those 6 fail, the other 20 in the file (including all of slice 1) still pass, and restoring the file turns them green again. Revert experiment output: `Tests 6 failed | 20 passed` → `Tests 26 passed`. They cover: a tier-volume symlink escaping the module root is refused and never registered (`registry.count() === 0`); the refusal is attributable to containment (the logged error contains `escapes root`, not a downstream load error); a symlink that stays *inside* the module root is still loaded, so the guard does not break the promotion shape; four malformed directory names are all refused; a non-semver version segment is refused; a manifest/directory name disagreement is refused; a manifest/directory version disagreement is refused; `__rollback` / `__incoming` / dotfile entries are still skipped rather than failed.
  - No-regression run: **128 tests across 10 suites pass** — `m0-security`, `module-loader`, `first-party-module-seed`, `m6-promotion`, `m9-promotion-lock`, `command-registry-router`, `m9-info-routes`, `m9-control-plane`, `admin-routes`, `tier-rules`. `tsc --noEmit` clean, `eslint --max-warnings=0` clean (whole app), `prettier --check` clean (whole app).
  - **Honest limitation:** the finding-#2 tests are *structural* (source-string assertions) plus one behavioral test of the shared `toErrorResponse` fallback, not a behavioral test of the Swastik handler itself. `entry/swastik.ts` is not behind the `isMainEntry` guard (`src/entry/is-main-entry.ts`), so importing it in a unit test would start a listener and open Postgres/Redis connections. Adding that guard is UR-C-23, a **non-P0 row belonging to M9**, not this slice. Recorded so the gate is not overclaimed.
- **Judgment calls / deviations:**
  - **The legal on-disk entry shape is two-fold, so `assertSafeSlug` alone would have been wrong.** `promoteAtomically` writes a bare `<slug>` symlink, but `swastik.ts:99` (`safeModulePathSegment`) and the first-party seed tooling both name promoted directories `<slug>__<version>`, and `first-party-module-seed.test.ts` exercises the latter. `parseDiscoveredModuleName` accepts exactly both forms and nothing else. The first draft of this slice's tests wrongly assumed a symlink named `..` could exist; it cannot on any POSIX filesystem and `readdir` never returns it, so that test was replaced with the achievable malformed-name cases.
  - **The containment root is `modulesDir`, and this is now a load-bearing config constraint.** An optional `stagingVolume` option was considered and rejected: adding it would need a `bootstrap.ts` edit, which R4 puts outside M0's fence, and an option nothing sets is a check that does not run. Both shipped deployment shapes (`docker-compose.yml:43-45`, `deploy/k8s/base/configmap.yaml:33-34`) mount staging at `/mnt/modules/swastik-staging`, inside `MODULES_DIR`, so `modulesDir` is the correct and sufficient root today. **A deployment that mounts `SWASTIK_STAGING_VOLUME_PATH` outside `MODULES_DIR` will now fail closed** — its promoted symlinks resolve out of the root. That is the safe direction to fail, and it is recorded here so M6/M9 treat the nesting as a requirement rather than a coincidence.
  - **The containment check is inside the per-entry `try`**, deliberately. Hoisting it would make one bad directory name abort the whole discovery loop instead of failing one module, contradicting the file's existing "collect failures, then refuse to start half-broken" contract.
  - **The manifest/directory checks run before the existing tier-at-rest check**, matching `promotion.ts`'s order (name, then version, then load). `first-party-module-seed.test.ts`'s tier-mismatch tests still pass and now pass *for the right reason* rather than by accident of ordering.
  - **`moduleDir` is now the realpath, not the lexical path**, so the `source` field in the `module-volume-loaded` log is the physical path actually imported, and the import URL is pinned to a verified physical path rather than a re-traversable symlink (narrowing, not eliminating, a TOCTOU window). `volumeName` plus `module` in the same log line still reconstructs the live-volume path.
  - **`path-guard.ts` and `promotion.ts` were not modified.** Both already exported/applied everything this slice needed, which is what the resume note predicted.
- **Slice 2 status:** DONE. **M0 is still IN-PROGRESS** — slices 3–6 outstanding at the time of writing; slice 3 has since landed (see below).

- **Judgment calls / deviations:**
  - **The tree, not the UR document, is the source of truth for P0 status.** Three rows the UR lists as pending (UR-A-02, UR-B-01, UR-C-06) are already fixed in the tree, and `m0-security.test.ts` already asserts two of them. The UR is a frozen provenance record; re-fixing landed rows would be the opportunistic rewrite R4 forbids.
  - **`AGENTS.md` is stale on two points** and was not followed: it describes `src/modules/<slug>/` (removed — modules load from tier volumes) and `src/core/commands/__tests__/**` (never existed in this tree). Logged as out-of-scope finding #1.
  - M0's done-gate says "no control plane accepts unauthenticated connections." `GET /api/info` is left reachable: no P0 row names it, and closing it may break a dashboard surface that needs pre-auth metadata. Recorded for M9 triage rather than decided unilaterally. `/swastik/status` is also left open and logged (finding #5) because it is the compose healthcheck probe.
  - The trusted-source allow-list is now an **IP** list checked against the socket peer (`request.ip`), which is what `.env.example` already implied (`PEP_TRUSTED_SOURCES=127.0.0.1,::1`) but the code never enforced. `trustProxy` is off, so `request.ip` is not header-spoofable. If a proxy is ever put in front, `trustProxy` must be configured deliberately or this check becomes spoofable — flagged for M9.
  - `docker-compose.yml` had the app's `8080/8081/8082` published on **all** host interfaces while postgres/redis/swastik were loopback-pinned. Pinned, since UR-B-03 asks for "loopback compose mapping" and the inconsistency was itself part of the exposure.
- **Resume note (if IN-PROGRESS):** **Slices 1, 2, 3, 4 and 5 landed and verified** (see the environment note in slice 5's closeout before re-running lint/typecheck: they were green on this tree, but the box is now memory-starved) (slice 1 = UR-A-01 + UR-B-03 + UR-B-06; slice 2 = UR-B-02 + UR-C-01 + the loader half of UR-C-07, plus finding #2; slice 3 = UR-A-04, findings #7, #13, #14; slice 4 = the P0 clause of UR-A-03, findings #17–#19; slice 5 = UR-C-02, findings #5, #6). **8 of 17 P0 rows are DONE; 9 still need work** (6 partial, 3 open). Last verified state: 75 files / 876 tests green (three consecutive clean full runs), `typecheck` + `lint` + `format` + `test:coverage` all clean. This item is larger than one session — **do not start M1.**
  - **Slice 5 is DONE** (UR-C-02; findings #5, #6). Landing it first was the right order: the healthcheck decision could not be made honestly until the gate's placement was understood, and slice 5 resolved the "is the probe an unauthenticated client?" question by making the probe a *service* caller. Note the k8s manifests were checked (`deploy/k8s/**`) and contain **no** `/swastik/status` reference, so the probe-contract change touches exactly two files, both declared.
  - **Next: slice 6 = the last M0 slice.** Candidate scope, in the UR's own words: **UR-B-04, UR-B-05, UR-C-05** (the three *open* P0 rows — `devId` is a plaintext bearer token, `REDACT_PATHS` does not redact `devId`, and the credentials/provenance storage clauses) plus whatever of the six *partial* rows (UR-A-03, UR-B-02, UR-C-01, UR-C-03, UR-C-04, UR-C-07) is genuinely closable without crossing into M9.
  - **Slice 6 must start with a real triage, not a code dive.** Two hard constraints learned the expensive way this item:
    1. **UR-A-03 and UR-C-07 cannot be fully closed in M0.** Both name UR-C-09 (row 100, *High* → P1 → M9) as their own dependency. Slice 4 already reduced UR-A-03 as far as honestly possible. If slice 6 "closes" them, that means doing M9's work out of order and violating R4 — so they stay PARTIAL with routing evidence.
    2. **Read §4's fail-before rule into the plan, not the afterthought.** Three slices in a row now show that a coarse revert drags in other slices' work (slice 5's 4-file revert broke 4 tests belonging to slices 1 and 2). Decide up front which assertions are *mechanism* and which are *intent* so a deliberate mechanism change is a declared deviation, not a surprise.
  - **Then, and only then, M0 may be marked DONE and M1 started.** If slice 6 leaves residue, the residue is routed to the item that owns it — do not force-fit a row to make the counter reach 17.
  - After slice 5: slice 6 = provenance, ownership and credentials schema work (UR-B-04, UR-C-03, the UR-C-07 remainder — hash verify, quarantine, cache-busted import URLs — UR-B-05, UR-C-04 + finding #4, UR-C-05 + finding #9). Slice 6 is the largest and involves `db/migrations/**`; expect it to need more than one session, and consider whether M0 should close at slice 5 with a partial slice 6 recorded as a BLOCKED item rather than being closed dishonestly.
  - **Constraints carried forward:**
    - **Run the full `pnpm test:unit` suite at the end of every remaining slice, not just the targeted net.** Slice 1 shipped green while having silently broken 3 tests (finding #13); slice 3's full run found the 2 collateral contract breaks (findings #13, #14); slice 4's full run found `m7-persona.test.ts` (deviation #9). Three slices running, three times a targeted net would have shipped red. Treat the full suite as the gate, not the net.
    - **Before writing a fail-open/fail-closed test, check whether something upstream already denies the case.** Slice 4's first draft used the real `PermissionResolver` and 5 of 6 tests passed against the *vulnerable* code, because `resolver.ts:153` denies any command lacking `permissionDeclared` (finding #18). Stub the surrounding engine to allow, so the control under test is the only thing that can deny.
    - Slice 6: the loader's containment root is now `modulesDir`, so a deployment mounting `SWASTIK_STAGING_VOLUME_PATH` outside `MODULES_DIR` fails closed. Both shipped shapes nest it correctly; M6 should treat the nesting as a requirement.
    - `pep.ts` and `ssh-clai.ts` have only **structural** coverage (finding #16) because neither is behind the `isMainEntry` guard and both start listeners at module scope. Do not attempt behavioral tests for them before UR-C-23 lands in M9; you will hang on open sockets, not fail cleanly.
    - Do not wire `QueueManager.pause()` (finding #15) or add a 501 class to `src/errors/taxonomy.ts` in M0 — both are M9 (UR-B-08 / error-contract) work by design, and R4 keeps them outside this item.
    - Nothing is committed. Slices 1–4 plus the slice-3 and slice-4 addenda are uncommitted working-tree changes.

#### M0 slice 3 — honest 501 on the fake successes (UR-A-04) + finding #7 — DONE

- **Blast radius (declared 2026-09-27, before any edit — R2):**
  - `apps/main/src/http/routes/admin.routes.ts` — eight routes only: `feature-flags/toggle` (`:209-216`) and the seven of finding #7 (`:273-405`). The twelve existing `sendNotImplemented` routes, `sendDispatchResult`, `sendNotImplemented` itself, the real routes (`suspendDeveloper`, `suspendCommand`, `exitMaintenanceMode`, `queryAuditLog`, the command-ceiling and collision routes) and the slice-1 auth work are **not** in scope for this slice.
  - `apps/main/src/entry/pep.ts` and `apps/main/src/entry/ssh-clai.ts` — the two remaining fakes. Dispatcher wiring, the audit writer, the ssh2 transport and `authenticateOperator` are read-only.
  - `apps/main/tests/unit/m0-security.test.ts` — extended (the declared M0 test scope).
  - Read-only: `tests/unit/m9-control-plane.test.ts` (its twelve-action honest-501 walk is the **reference implementation** to match and the no-regression net), `src/queue/queue-manager.ts`, `src/errors/taxonomy.ts`, `src/http/error-boundary.ts` (all three examined to decide *where* the shared answer should live — see judgment calls).
  - `src/http/power-engine-dispatcher.ts` and `src/errors/**` are **not** touched: the taxonomy has no 501 class and adding one is a cross-cutting error-contract change belonging to M9, and the dispatcher already does the right thing when its handler throws.
- **Re-verified triage of UR-A-04 before editing.** The ledger described "3 fake successes"; the tree has **eleven** defects across three surfaces, and the root cause is shared and simpler than the per-site description suggests: **every** offending route passes a handler to `dispatcher.dispatch` that performs no operation — `async () => body` (`pep.ts:57`), `async () => args` (`ssh-clai.ts:86`), `async () => {}` (`admin.routes.ts:213`), and `async () => { write system_state }` (the seven). `PowerEngineDispatcher` has **no domain catalog**; it validates, calls whatever handler it is given, and — on success — writes an `outcome: 'allowed'` audit row. So a no-op handler yields a 200 *plus* a false audit row.
  - The **seven** write a `system_state` row keyed `queue_paused:*`, `deadletter-requeue:*`, `ratelimit-override:*`, `restart-shard:*`, `core-restart`, `rollback:*`. Verified read-only sweep across `apps/main/**` (src, `db/migrations`, scripts) excluding the route file itself and tests: **zero** readers of any of those keys. They are write-only rows, so a 200 is a claim with no reader and the write itself is the mechanism of the lie — a route that answers 501 must not mutate the database.
  - `admin.routes.ts:213` `feature-flags.toggle`: the string `feature-flag`/`featureFlag` appears nowhere else in `src/` — no feature-flag subsystem exists at all.
  - `pep.ts` has a **second, unreported** honesty defect: `return reply.code(200).send(result)` returns **200 even when the dispatcher rejected** the request, so a missing `actorId` or an untrusted source is reported to the caller as success. `admin.routes.ts` has the correct mapping in `sendDispatchResult` (403); `pep.ts` never uses it.
- **What changed (slice 3):**
  1. `admin.routes.ts` — eight routes now call the **existing** `sendNotImplemented(reply, action)` and nothing else: `feature-flags/toggle` plus finding #7's seven. `dispatcher.dispatch` and `db.knex` are no longer reached, so each answers 501 `NOT_IMPLEMENTED` and writes neither state nor audit. The seven `system_state` writes are gone, which is the point — a route that answers 501 must not leave a row behind.
  2. `pep.ts` — the handler passed to `dispatch` now **throws** `PepActionNotImplementedError` instead of returning the request body, and the route maps it to 501 `NOT_IMPLEMENTED`. Throwing rather than returning a sentinel is what keeps the audit honest: `PowerEngineDispatcher.dispatch` writes an `outcome: 'allowed'` row for any handler that *resolves*, so a sentinel return would still leave a false success in `audit_logs`.
  3. `pep.ts` — a **rejected** dispatch now answers **403 `DUMBY_POWER_ENGINE_REJECTED`** instead of 200. This is the unreported second defect above; the mapping was copied from `sendDispatchResult`, which `admin.routes.ts` already had.
  4. `pep.ts` — `request.body` is null-guarded (`(request.body ?? {})`). Previously a bodyless POST threw a `TypeError` into the catch and answered 400 with a confusing message; it now answers a clean 403 `MISSING_ACTOR_ID`.
  5. `ssh-clai.ts` — `handlePepCommand`'s handler throws the same way, and the shell reply becomes `NOT IMPLEMENTED: <fn> has no backing primitive implemented yet`. The pre-existing `REJECTED: <reason>` branch is **preserved** (an empty `reason` in the operator's JSON is reachable and still rejects) — the first draft of this change dropped it, because a dispatcher rejection *resolves* rather than throws, and was caught by the no-regression run.
- **Done-gate evidence (tests):** 6 new tests in one `describe` block (`M0 control plane reports no fake successes (UR-A-04, finding #7)`, `tests/unit/m0-security.test.ts:481`) in `tests/unit/m0-security.test.ts`. **5 proven fail-before / pass-after** by stashing the three source files to HEAD — revert produced `8 failed | 24 passed`, of which the 5 slice-3 failures were: the eight-route honest-501 walk; the "refused action writes no state and dispatches nothing" check (asserting `knex` and `dispatch` are never called and the body contains no `queue_paused`); the source-level assertion that no `dispatch(<action>, body, async () => {})` remains and none of the six fake `system_state` key prefixes (`queue_paused`, `deadletter-requeue`, `ratelimit-override`, `restart-shard`, `core-restart`, `rollback:`) survive anywhere in the file; the PEP source contract; and the CLAI source contract. Restore returned `32 passed`.
  - A first draft of the PEP assertion was **tautological** and was rewritten before the gate was accepted: it asserted `not.toContain("code: 'DUMBY_POWER_ENGINE_REJECTED', rejectionReason: outcome")`, which passes trivially now that the two fields sit on separate lines — it would have passed even if the 200-on-rejection defect were still present. Replaced with two positive assertions (`reply.code(403).send` and `code: 'DUMBY_POWER_ENGINE_REJECTED'` are present) alongside the existing `not.toContain('reply.code(200).send(result)')`. A negated `toContain` on a line-joined string is worse than no assertion at all, because it reads as coverage.
  - The 6th test is deliberately **not** a fail-before test: it proves a *pre-existing* property of `PowerEngineDispatcher` (a throwing handler records no `allowed` audit row, already covered at `m9-control-plane.test.ts:36`) that the fix depends on. It passes in both states by design, and is recorded here so it is not mistaken for a gate.
  - **Honest limitation:** the `pep.ts` and `ssh-clai.ts` assertions are **structural** (source-string), not behavioral. Both files execute side effects at module scope — `pep.ts:94` `.listen({ port: env.PEP_PORT, host: '127.0.0.1' })` and `ssh-clai.ts:189` `startClaiSshServer();` — and neither is behind the `isMainEntry` guard (verified: zero occurrences in either file), so neither can be imported in a unit test. This is the same limitation as finding #2, now affecting both entry points; the guard is UR-C-23 and belongs to M9. The eight admin routes, which carry the majority of the defects, **are** behaviorally tested through `registerAdminRoutes`.
  - Verification after the addendum (deviations #6, #7): targeted net 70/70 across 8 suites; **full unit suite 75 files / 857 tests green**; `tsc --noEmit`, `eslint --max-warnings=0`, `prettier --check` all clean.
- **Judgment calls / deviations:**
  - **No new 501 error class was added to `src/errors/taxonomy.ts`.** The taxonomy has no 501 type, and adding one is a cross-cutting error-contract change that would ripple into every surface's error handling — out of M0's declared radius, and properly an M9 concern. The 501 answer is instead the ad-hoc `{ error: { code: 'NOT_IMPLEMENTED', message } }` shape that `admin.routes.ts` already established and that `m9-control-plane.test.ts` already pins. The fix conforms to the existing contract instead of redefining it.
  - **The shared 501 body was not moved into `src/http/error-boundary.ts`**, which is its natural home and where the other entry points already get `toErrorResponse` (finding #2). `error-boundary.ts` is not in M0's blast radius, and importing a reply helper out of `http/routes/admin.routes.ts` into an entry point would be bad layering. `PepActionNotImplementedError` is therefore declared locally in each of the two entry points — a deliberate, logged duplication. Consolidating all three into `error-boundary.ts` is the right M9 cleanup.
  - **`QueueManager.pause()` exists (`src/queue/queue-manager.ts:89`) and was deliberately NOT wired up.** The honest 501 is what UR-A-04 (P0) asks for; UR-B-08 ("implement adapters over existing subsystems; … honest 501") is a **P1** row and belongs to M9. Wiring it needs a new `AdminRoutesDeps` member plus threading through `bootstrap.ts`, which R4 puts outside M0. Consequence: `sendNotImplemented`'s fixed wording — "has no backing primitive implemented yet" — is slightly imprecise for the queue actions, since the primitive exists and is simply unrouted. The precise truth is recorded as finding #15 rather than encoded in a per-route message, which would have meant changing the shared helper for one caller.
  - **`pep.ts`'s trailing `return reply.code(501)` is unreachable at runtime** (the handler always throws) and exists to satisfy the type checker. It is kept deliberately: if a real PEP backend is ever wired in, this route must still refuse rather than silently start claiming success, and 501-not-implemented is the correct refusal for "no backend here".
  - **The two test-file updates are logged as deviations #6 and #7 rather than treated as R3 out-of-scope fixes.** A test whose only assertion is "this route still returns 200 and still dispatches" encodes the exact defect the work-order item exists to remove; it cannot be preserved by an honest fix. R3 protects unrelated *code* from opportunistic repair — it is not a licence to keep a regression test green. Both files are named in Deviations with the reason and the finding number.
- **Slice 3 status:** DONE. **M0 is still IN-PROGRESS** — slices 4–6 outstanding at the time of writing; slice 4 has since landed (see below).

#### M0 slice 1 — admin surface authentication (UR-A-01, UR-B-03, UR-B-06) — DONE

- **Files touched:** `src/http/server.ts`, `src/http/internal-auth.ts`, `src/http/routes/admin.routes.ts`, `src/config/env.schema.ts`, `src/bootstrap/bootstrap.ts` (three bind-host literals only — the stage sequence is untouched), `.env.example`, `docker-compose.yml`, `scripts/e2e-test.ts` (mechanical unblock, deviation #1), `tests/unit/m0-security.test.ts` (extended).
- **What changed:**
  1. The API server now requires the constant-time `x-internal-api-key` on every `/admin/*` route, via the existing `registerInternalAuth` helper, with a rejected-attempt warn log. Previously all ~30 admin routes plus `GET /admin/config` were reachable with no credential at all on a `0.0.0.0` socket.
  2. `registerInternalAuth` gained an optional `shouldProtect` predicate so one implementation of the constant-time check serves both the whole-instance shape (PEP, CLAI, Twixter, credentials) and the path-scoped shape (API server). No new auth code path was introduced.
  3. `source` is now derived server-side from `request.ip` instead of read out of the JSON body. This is the UR-A-01/UR-B-06 fix proper: previously any client could satisfy the allow-list by typing `127.0.0.1` into a payload, because the allow-list holds IP strings and the check compared a self-declared string against it.
  4. `API_BIND_HOST` / `HEALTH_BIND_HOST` / `METRICS_BIND_HOST` replace three hardcoded `0.0.0.0` literals and default to `127.0.0.1`. `.env.example` documents why each surface should only be widened deliberately; compose opts the container in explicitly.
- **Tests that prove it:** recorded under *Done-gate evidence* above, with the revert experiment that demonstrates they fail before the fix.
- **Judgment calls:** the gate covers `/admin/*` but deliberately not `GET /api/info`; compose's app ports are now loopback-pinned; the e2e script was repaired rather than left broken. All three are argued above and in Deviations #1–#2.

#### M0 slice 4 — fail closed on unknown module tier (UR-A-03) — DONE

- **Blast radius (declared 2026-09-27, before any edit — R2):**
  - `apps/main/src/commands/command-router.ts` — the only source file whose logic changes. It is already inside M0's declared blast radius ("Dispatch: `src/commands/command-router.ts`").
  - `apps/main/tests/unit/m0-*.test.ts` — extended (the M0 test scope declared for the item).
  - `apps/main/tests/unit/command-registry-router.test.ts` and `apps/main/tests/unit/m3-embed-and-dm.test.ts` — **fixture correction only**: existing tests that register a command for a module with no `registerModule` call, then dispatch it, will be denied by this fix. They currently depend on the fail-open. Adding the missing `registerModule(...)` line restores the state production always has. This is a **declared extension** to the item's test scope, and it is logged as deviation #8; the alternative (leaving 9 dispatch tests red) is not acceptable and silently weakening the fix to keep them green is not either.
  - Everything else read-only for slice 4. In particular **not** in scope: `src/middleware/built-in/**` (the four neutered middlewares' resolvers — see finding #3's routing below and why M0 cannot honestly close them), `src/module-system/command-registry.ts`, `bootstrap.ts`, the renderer's error→reason map, and the pipeline wiring (UR-C-09 / UR-B-10, both P1 and M9's).
- **Source of truth read (full sections, per §4 step 2):** UR §8.1.2 row 36 (UR-A-03 → blueprint §17.3, §19); `docs/blueprint.md` §17.3 (Command Registry Architecture), §19.1 (The Onion Model), §19.2 (Built-In Middleware Stages, TABLE 19-A), §21.2 referenced by §19.1 for Layers 5/6.
- **What the source of truth actually demands, and what M0 can honestly deliver.** Row 36's full remedy is "Unify dispatch on `src/core/commands`; bootstrap router + all 12 built-in middlewares; fail closed on unknown tier; context menus dispatched" — and the row's own last column says **"Depends on UR-C-09 wiring"**. UR-C-09 is row 100, severity *High* (P1), i.e. **M9**, not M0. So UR-A-03 cannot be fully closed inside the P0 item, and pretending otherwise would mean doing M2/M4/M9's work out of order (R4, §5). M0 therefore takes the one clause of row 36 that is P0 and self-contained — **"fail closed on unknown tier"** — and routes the rest with evidence. Two sub-clauses of row 36 are already moot or done: §17.3 resolves ADR 002 and states "there is no `src/core/commands/` subtree" (so "unify dispatch on `src/core/commands`" is superseded — the tree is already single at `src/commands/`, confirming finding #1), and the four neutered middlewares are the UR-C-09 dependency, not a P0 fix.
- **The defect, verified in the tree (not taken from the UR):** `CommandRegistry.getModuleTier(moduleId)` returns `ModuleTier | undefined`, and the tier map is populated only by `registerModule`, called from exactly one place — `src/module-system/loader.ts:81`, via `tryResolve(...)?` — *before* the module's `onLoad`. Three fail-open sites consume the same missing value:
  1. `command-router.ts:266` `if (!tier) return;` — an unresolved tier skips **every** scope check, including the admin-tier restriction to the dev guild. This is the literal "fail open" of row 36.
  2. `command-router.ts:164` and `:206` `this.registry.tierForCommand(command) ?? 'standard'` — an unresolved tier is silently coerced to **`standard`, the least-privileged tier**, weakening the `PermissionResolver` evaluation.
  3. `bootstrap.ts:175-176` `isAdminTierCommand` — `getModuleTier(def.moduleId) === 'admin'` is `false` for an unresolved tier, so `AdminTierGateMiddleware` (priority −10) also degrades to a no-op. Not edited in this slice (bootstrap wiring is UR-C-09/M9), but this is why site 1 alone is sufficient: `assertCommandInScope` runs at `command-router.ts:111`, **before** the pipeline and before `def.execute`, so a throw there denies the command regardless of what the gate does.
- **Test impact predicted before implementing (and confirmed after):** 9 existing dispatch tests across the two files named above build a registry that production cannot produce — a command whose module has no tier. They pass today *because* of the fail-open. Recorded here before the edit so the breakage is attributable to the fix rather than discovered afterwards.
- **What changed:**
  1. New private `requireModuleTier(command, guildId): ModuleTier` in `command-router.ts`. An unresolved tier logs `command-tier-unresolved` at error level and throws `CommandScopeDeniedError` with tier `'unresolved'`. Three call sites use it, so the tier is resolved **once, loudly, and non-optionally** instead of being re-derived and silently defaulted at each consumer.
  2. `assertCommandInScope` no longer contains `if (!tier) return;`. It calls `requireModuleTier` first, so an unresolved tier is denied before any scope rule is consulted.
  3. The two `this.registry.tierForCommand(command) ?? 'standard'` coercions (`:164`, `:206`) are gone. An unresolved tier can no longer be evaluated as `standard` — the least-privileged tier — by the `PermissionResolver`.
  4. `CommandScopeDeniedError.tier` widened from `ModuleTier` to `ModuleTier | 'unresolved'`. Verified no consumer reads that field: the only other reference is `core-renderer.ts:193`, which matches on `err.name` and is therefore unaffected.
- **Why `CommandScopeDeniedError` and not a new error class.** `core-renderer.ts:189-196` maps errors to a notice reason by `err.name` string, with an unnamed default of `MODULE_ERROR` ("Module error"). A new `CommandTierUnresolvedError` would have been shown to the user as a module fault — blaming the module for a wiring defect — and closing that gap honestly would have required editing `core-renderer.ts`, which is **not** in this slice's fence. Reusing the existing class gets `FORBIDDEN` ("Not permitted" / "Your permissions do not allow this action.") for free, keeps the fence honest, and there is a dedicated test asserting the notice is `FORBIDDEN` and **not** `Module error` so the choice cannot silently regress.
- **The masking effect, and why the first draft of the tests proved nothing (recorded because it is the most important thing found in this slice):** the first version of these tests used the real `PermissionResolver` and 5 of 6 **passed against the fail-open code**. Cause: `src/permissions/resolver.ts:153-155` — `if (ctx.hasExplicitPermissionDeclaration !== true) return deny(7, ...)`. The fixtures did not set `permissionDeclared`, so the resolver denied them at layer 7 for a reason entirely unrelated to the tier, and the tier fail-open was never exercised. The tests were rewritten to stub the resolver to allow everything, which makes the tier check the only thing that *can* deny. Two consequences worth keeping:
  - The tier fail-open was **partly masked in production** by that layer-7 deny, which is likely why no existing test caught it.
  - The real exploit therefore requires a **properly declared** command — exactly the well-formed case. That is the shape the new tests use, and it is the sharpest demonstration available: against the old code the handler is not merely "not denied", it **executes** (`expected "vi.fn()" to not be called at all, but actually been called 1 times`).
- **Done-gate evidence (tests):** 7 new tests in one `describe` block in `tests/unit/m0-security.test.ts`. **5 proven fail-before / pass-after** by stashing only `command-router.ts` to HEAD: revert gave `Tests 5 failed | 34 passed`, restore gave `39 passed`. The 5 that must fail do: the properly-declared command is denied rather than executed; it cannot execute in a guild it was never scoped to; it cannot borrow the dev guild to satisfy the admin gate; the permission engine is never consulted with a coerced `standard` tier; and the denial renders as `FORBIDDEN` and not `Module error`. The other 2 are deliberate **no-regression controls** that pass in both states (a resolved tier still executes; a resolved `admin` tier is still confined to the dev guild) — recorded here so they are not mistaken for gates.
  - Verification: **full unit suite 75 files / 864 tests, all green** (was 857 — +7 new). `tsc --noEmit`, `eslint --max-warnings=0`, `prettier --check` all clean.
- **Fixture corrections (declared extension, deviations #8–#9):** 10 one-line `registerModule(...)` additions — 8 in `command-registry-router.test.ts`, 1 in `m3-embed-and-dm.test.ts`, 1 in `m7-persona.test.ts` (a single shared `buildRouter` helper, so one line fixed 2 failing tests). No assertion was weakened, deleted, or reworded; each line only restores the `registerModule` call that `module-system/loader.ts:81` makes in production. `m7-persona.test.ts` was **not** in the pre-declared radius — it was found by the full-suite run, which is the second slice in a row where a targeted net would have missed collateral (see the resume note).
- **What was deliberately NOT done, with routing (the honest part of this slice):**
  - **The four neutered middlewares (finding #3) are not fixed here, and M0 cannot fix them honestly.** Re-verified in the tree: the four are `PermissionMiddleware` (`getMemberPermissions: async () => []`, `getRequiredPermissions: () => []`), `RBACMiddleware` (`getHighestRole: async () => null`), `CooldownMiddleware` (`getCooldownMs: () => 0`) and `DeferMiddleware` (`requiresDefer: () => false`) at `bootstrap.ts:231-252`. Two findings change how serious this is, in opposite directions:
    - **Less serious than first recorded:** the enforcement is not actually dead. `CommandRouter.assertPermissionAllowed` (`:159-210`) already runs the **real** `PermissionResolver` — confirmed wired at `bootstrap.ts:286` with `new PermissionResolver()` from `:159` — against real `interaction.memberPermissions`, the command's real `requiredMemberPermissions`/`requiredRank`, and Layer 6/7 grant state. The four middleware are therefore *inert duplicates* of a live control, not the only control. That is why UR-A-03's "no dispatch path bypasses the chain" is not the whole story: the router is the effective gate.
    - **Still not closable in M0:** `getHighestRole` is permission-engine **Layer 6**, which is M4's item outright ("RBAC Layer 6/7 redesign"); the rate-limiter and cooldown stores are specified in §19.1 to live in **Redis** and that wiring is UR-B-10 (row 73, P1 → M9); `getMemberPermissions` cannot be implemented correctly at all without changing the `DiscordPermissionChecker` resolver signature in `src/middleware/built-in/permission.ts` (the resolver receives only `(userId, guildId)`, never the interaction) — a file that is in no item's current fence — and it would duplicate the check the router already performs correctly. Fixing any of these inside M0 means doing M2/M4/M9 work out of order (R4, §5), so finding #3 is re-routed with this evidence rather than patched.
  - **`bootstrap.ts:175-176` `isAdminTierCommand` is not changed.** It also degrades to a no-op on an unresolved tier, but it is pipeline wiring (UR-C-09 → M9). It is also no longer independently exploitable: `assertCommandInScope` runs at `:111`, before the pipeline and before `def.execute`, so an unresolved tier is denied regardless of what the gate decides.
  - **`CommandRegistry.register` still accepts a command for an unregistered module.** Refusing at registration time would fail the build earlier and match §17.3/§19.1's "fails the build rather than failing silently", but it changes the registry's public contract and would break registration-order assumptions across the module loader. Recorded as a hardening follow-up, not done here.
- **Effect on the P0 triage:** UR-A-03 moves PARTIAL → **PARTIAL, materially reduced**. `command-router.ts:266` no longer fails open, which closes the clause of row 36 that is P0 and self-contained. Row 36's remaining clauses ("bootstrap router + all 12 built-in middlewares", "context menus dispatched") are the UR-C-09 dependency the row itself names, at P1, and belong to M9; the `src/core/commands` unification clause is already moot per §17.3 (ADR 002 — there is no such subtree).
- **Slice 4 status:** DONE. **M0 is still IN-PROGRESS** — slices 5 and 6 outstanding.

#### M0 slice 5 — Swastik internal-surface auth (UR-C-02) + findings #5, #6 — DONE

- **Blast radius (declared 2026-09-27, before any edit — R2):**
  - `apps/main/src/entry/swastik.ts` — inside M0's declared entry-point fence. Its `/internal/*` gate is consolidated onto the shared `registerInternalAuth`, and the two unkeyed routes (findings #5, #6) are brought under it. No route's *business* logic changes, and the three developer-facing bearer routes are explicitly exempted, not silently altered.
  - `apps/main/src/http/internal-auth.ts` — already in M0's fence ("Control-plane auth / bind"). Gains the Swastik route-classification predicate, because the security policy has to be a pure, importable, testable function rather than a string buried in an entry point that cannot be imported (finding #11).
  - `apps/main/docker-compose.yml` — already in M0's fence. The healthcheck probe must become an authenticated caller (see below).
  - `apps/main/scripts/verify-all.ts` — **declared extension**, outside the item's fence; the `waitFor` on `/swastik/status` is a shipped verification path that would break the moment the route is keyed. Logged as deviation #10. Precedent: slice 1 deviation #1 (`scripts/e2e-test.ts`).
  - `apps/main/tests/unit/m0-*.test.ts` — extended (the M0 test scope).
  - Read-only: every other file. In particular **not** in scope — `src/middleware/**`, `bootstrap.ts`, `src/commands/**`, the developer-facing bearer routes' semantics, and UR-B-05/UR-C-05 (`devId` is a plaintext bearer token), which is slice 6.
- **Source of truth read (full passages, per §4 step 2):** UR §8.1.2 row 93 (UR-C-02 → blueprint §15.8, §32); `docs/blueprint.md:4700` (§15.8, the Swastik `/internal/*` contract: single preHandler, `crypto.timingSafeEqual` over fixed-length digests, 401 + `INTERNAL_AUTH_DENIED` audit row recording route and caller address but **never** the presented value, "no unauthenticated client path into the internal surface exists at all"); `:7050-7063` (§22.5, internal-surface authentication: "a missing or mismatched key is rejected with 401 before anything else executes", each listener loopback by default, and "`source` … is request metadata, never an authorization input"); `:9177-9183` (§32, same discipline at service-to-service scale); `:1584-1605` (Table 8-B health probe semantics, for the healthcheck decision).
- **State of the tree, verified (not taken from the UR or the ledger):** the ledger's triage row for UR-C-02 said "`/internal/reload` + `/internal/deploy` keyed; `/swastik/status` fully open; `/swastik/developers/register` unkeyed". Re-checked, and the "keyed" half is only *partly* true, in a way worth recording: both internal routes are guarded by a hand-rolled local helper `requireInternalKey` (`swastik.ts:369-381`) rather than the shared `registerInternalAuth`. It is genuinely constant-time (`constantTimeEqual`) so it is not a timing hole, but it differs from the spec in three ways: it runs **inside** the handler instead of as a `preHandler` (so the spec's "before route logic … runs" ordering is not met), it writes **no audit row** on rejection (the spec requires `INTERNAL_AUTH_DENIED`), and it duplicates logic that already exists. So this slice closes the two open routes *and* removes the duplicate, rather than adding a third copy of the key check.
- **The healthcheck decision, made explicitly (this was the open question in the resume note).** `GET /swastik/status` is the compose healthcheck probe (`docker-compose.yml:115`) and is also polled by `scripts/verify-all.ts:38`. The spec's own health surface is the main deployment's `/health/{liveness,startup,readiness}` (Table 8-B, blueprint:1584), and it is a different service on a different port; Swastik has no spec-named probe endpoint, so `/swastik/status` is a bespoke route doing double duty. Options considered: (a) leave it unauthenticated and strip it down to a bare liveness signal; (b) add a new unauthenticated `/swastik/live` and keep the data behind the key; (c) **key it and make the probe an authenticated caller.** Chosen: (c). Reasons: the probe already runs *inside the container* with `env_file: .env`, so `INTERNAL_API_KEY` is in its environment and it can authenticate as a service — which is exactly what §22.5 describes a healthcheck of an internal surface to be; the route's real payload is not liveness at all but operational disclosure (developer and build **counts**, plus the absolute `stagingVolume`, `liveVolume` and per-tier volume **paths**), which is the actual security content of finding #5 and would survive option (a); and (b) would leave a second unauthenticated route on an internal surface, which §15.8's "no unauthenticated client path into the internal surface exists at all" forbids. Recorded as a judgment call because it changes an operator-visible contract.

- **What changed:**
  1. **`shouldProtectSwastikRoute(request)` added to `src/http/internal-auth.ts`** — the route policy, as a pure, importable function. It returns `true` (gate) for everything **except** an explicit three-entry developer exemption list: `GET /swastik/developers/me`, `POST /swastik/modules/upload`, `GET /swastik/modules/:slug/builds/:buildId`. Chosen shape is **default-protect, explicit exemption**, not default-open: a route added to Swastik next quarter is authenticated unless somebody deliberately classifies it. The alternative (enumerating the protected set) would silently open every future route, which is the exact failure mode §15.8's "no unauthenticated client path into the internal surface exists at all" is written to prevent. `url` is split on `?` before matching, and entries are `(method, anchored-regex)` pairs, so a query string or a path-prefix cannot borrow an exemption.
  2. **`swastik.ts` now installs the shared `registerInternalAuth` preHandler** with `expectedKey: env.INTERNAL_API_KEY`, `shouldProtect: shouldProtectSwastikRoute`, and an audit callback. The hand-rolled `requireInternalKey` helper and both of its per-handler call sites are **deleted**, along with the now-unused `constantTimeEqual` and `FastifyRequest`/`FastifyReply` imports. Net effect: one key-check implementation in the service, not two.
  3. **Rejection writes an `INTERNAL_AUTH_DENIED` audit row** via `writeAudit`, which fixes `source: 'SWASTIK'` from server context (never from the body) and records path, method, `keyFingerprint`, and caller address — never the presented key. **Allowed** requests are logged at debug only, deliberately: blueprint:4700 requires the audit row on *rejection*, and a DB insert per authenticated call would add write load the spec never asked for. This matches the admin gate's existing pattern in `http/server.ts:42-46`.
  4. **The gate is registered inside `startSwastik()` after `await init()`**, not at module scope. This is load-bearing and is the one non-obvious change in the slice: `env` is assigned by `init()` (`swastik.ts:55`), so a module-scope registration would have captured `undefined` as the expected key and rejected *every* caller including a correct one. A test pins the ordering so this cannot regress.
  5. **Both `/swastik/status` callers now authenticate:** the compose healthcheck sends `x-internal-api-key` from its own environment (the container already has `INTERNAL_API_KEY` via `env_file: .env`), and `scripts/verify-all.ts` passes the key and **throws early with a clear message if `INTERNAL_API_KEY` is unset**, instead of silently polling for 60s and timing out with a misleading "Timed out waiting for …".
- **Done-gate evidence (tests):** **11 new tests** in one `describe` block in `tests/unit/m0-security.test.ts` — 9 gates, plus 2 net from the per-client sweep described below (it began as 1 loop test and was rewritten into 3, one per client). **Proven fail-before** by stashing the four slice-5 source files to HEAD: `Tests 13 failed | 35 passed`, restore `48 passed`. Attribution of the 13, since the revert is necessarily coarse and three of these files carry slice 1/2 work:
  - **9 are slice-5 gates:** the six `shouldProtectSwastikRoute` policy tests (all `/internal/*` protected; the two formerly-ungated routes now protected; the three developer bearer routes still reachable; unknown routes default-protected; query strings cannot smuggle; an exemption cannot be borrowed by prefix or method), the two wiring tests (shared gate installed and no hand-rolled check remains; hook ordered after `init()`), and the client test (healthcheck + verify script both present the key). The six policy tests fail-before because `shouldProtectSwastikRoute` did not exist at HEAD — the import is `undefined` and calling it throws.
  - **4 are collateral, and each is explained rather than dismissed:** `internal deploy requires the internal key and never auto-approves developers` (a slice-2 test whose `requireInternalKey` assertion this slice deliberately rewrote — deviation #11); `the Swastik instance installs a path-guard-aware error handler` and `the rejection body is static and carries no server path` (slice-2 tests; HEAD `swastik.ts` has **no** `setErrorHandler` at all, verified `git show HEAD:… | grep -c setErrorHandler` → `0`, so reverting the file removes slice 2's fix); `the key gate does not swallow non-admin routes on the same server` (slice-1 test; HEAD `internal-auth.ts` has no `shouldProtect` short-circuit, so the admin gate reverts to gating *every* route and `/api/info` 401s). This is the third slice in a row where the revert touches other slices' work — the pattern that makes the full-suite run mandatory.
  - Verification: **full unit suite 75 files / 876 tests, all green** (was 864 — +11 new). `test:coverage` exits 0 at 82.44% stmt / 79% branch / 83.19% func / 83.05% line. `tsc --noEmit`, `eslint --max-warnings=0`, `prettier --check` all clean, and `test:coverage` exits 0 at 82.44% stmt / 79% branch / 83.19% func / 83.05% line (floors 70/65/70/70).
  - **Environment note, for the next session (2026-09-27):** the box degraded to ~68MB free / 1.2GB swapped partway through final verification (the box has 951MB total; `opencode` itself holds ~38%). Consequences: full `eslint .` and `tsc` runs that were green earlier in this slice now time out at respectable limits; the three 876/876 full-suite runs and the `test:coverage` run all completed on the degraded box, so tests are solid, but **if you need to re-run `pnpm lint` / `pnpm typecheck`, expect 25+ minutes or a timeout** and free memory first. It is not a code regression — scoped `eslint` over exactly the 5 touched TS files is re-verified exit 0, and full lint/typecheck were both green on this identical tree before the degradation.
  - **Recorded because it would otherwise look like a false alarm:** an early full-suite run during this slice reported 1 failure whose test name was not captured, and it did not reproduce in **three subsequent full runs** (876/876 each). The same window showed a 13x runtime swing (40s → 550s, with `import` alone at ~180s), i.e. the machine was under extreme load; that is consistent with a timeout-sensitive flake but is **not** a diagnosis. Not written off: if a single failure ever reappears in this suite, treat the name as the priority, not the red count.
  - **A Vitest footgun hit while writing the client sweep:** `expect(message, actual).toMatch(re)` reported a *passing* regex as failing against content that demonstrably contained it, while the same two-argument form with `toContain` behaved correctly. Reproduced only via the overload, and not chased to a root cause. Rewritten as one test per client with single-argument `expect`, which also gives better failure output. Flagged because any other test in the suite using the two-argument form with `toMatch` should be checked.
- **Effect on the P0 triage:** UR-C-02 moves PARTIAL → **DONE**. Findings #5 and #6 close. Both of the row's remedy clauses are now met: the constant-time `preHandler` + 401 + `INTERNAL_AUTH_DENIED` audit row of §15.8 is the *only* gate on the Swastik app, **and** every in-repo client of the internal surface presents the header.
  - **The second clause was false at HEAD, and finding it nearly got missed.** The row says the clients send the header "and all callers do". On the first pass this slice audited the two callers the resume note named (the compose healthcheck, `verify-all.ts`) and moved on. A repo-wide grep for `internal/deploy|internal/reload|swastik/status|developers/register` run *after* the client list was written down **found a third client, `scripts/swastik-deploy.ts`, which sends no key at all** (finding #20). It could not have worked before this slice either, because the pre-existing `requireInternalKey` already demanded the header — so this is a pre-existing break, not a regression, but it means the "all callers do" clause was untrue at HEAD for a reason unrelated to the two findings this slice was opened for. Fixed (deviation #12), and the test is now **one test per enumerated client** so the list cannot silently rot again. The lesson worth keeping: a grep performed *after* writing "I have enumerated every X" is what actually enumerates every X.
- **What was deliberately NOT done, with routing:**
  - **`devId` remains a plaintext bearer token** (UR-B-05 / UR-C-05). Keying registration does not fix that: anyone holding a `devId` still has full developer access, and `devId` values are readable from the `developers` table and are logged. That is **slice 6**.
  - **`/swastik/status` still returns operational counts and absolute volume paths** to whoever holds the key. Narrowing the *payload* is a separate question from gating the *route*; the spec's §15.8 asks for authentication, not for a response allowlist, and inventing a narrower contract would be a design change nobody asked for. Recorded as a follow-up, not silently ignored.
  - **No `isMainEntry` guard was added to `swastik.ts`.** It still calls `startSwastik()` at module scope (finding #11), which is why 3 of the 9 slice-5 gates are structural source assertions rather than behavioural `inject()` tests. The fix is UR-C-23 → M9. Mitigated here by making the *policy* a pure importable function — so what matters is tested behaviourally even though the wiring is not.
  - **No second copy of the key check was added to `pep.ts`.** It has a `registerInternalAuth` gate (slice 3) but with no `shouldProtect`, so it gates its whole app; that is correct for PEP, whose surface is entirely internal, and touching it was out of the declared radius.
- **Judgment calls / deviations:** deviation #10 (`scripts/verify-all.ts` edited outside the item's declared fence — the `waitFor` on a now-keyed route would otherwise break a shipped verification path; precedent: slice 1 deviation #1). Deviation #11 (a slice-2 test assertion rewritten from `requireInternalKey(request, reply)` to the shared-gate assertions that now provide the same guarantee; the test's *intent* — deploy is key-gated — is unchanged, and its other three assertions are untouched). The healthcheck-contract change is recorded in full above as a judgment call.
- **Slice 5 status:** DONE. **M0 is still IN-PROGRESS** — slice 6 outstanding.

### M1 — Tier volumes & blind discovery
- **Status:** NOT STARTED
- **Started:** — **Completed:** —
- **Blast radius (declare before editing):** —
- **Done-gate evidence (tests):** —
- **What changed:** —
- **Judgment calls / deviations:** —
- **Resume note (if IN-PROGRESS):** —

### M2 — Unified command tree

- **Status:** NOT STARTED
- **Started:** — **Completed:** —
- **Blast radius (declare before editing):** —
- **Done-gate evidence (tests):** —
- **What changed:** —
- **Judgment calls / deviations:** —
- **Resume note (if IN-PROGRESS):** —

### M3 — Core Renderer, buffer-then-render, embed ban

- **Status:** NOT STARTED
- **Started:** — **Completed:** —
- **Blast radius (declare before editing):** —
- **Done-gate evidence (tests):** —
- **What changed:** —
- **Judgment calls / deviations:** —
- **Resume note (if IN-PROGRESS):** —

### M4 — RBAC Layer 6/7 redesign

- **Status:** NOT STARTED
- **Started:** — **Completed:** —
- **Blast radius (declare before editing):** —
- **Done-gate evidence (tests):** —
- **What changed:** —
- **Judgment calls / deviations:** —
- **Resume note (if IN-PROGRESS):** —

### M5 — License machine, Compatibility Ledger, Deployment Records

- **Status:** NOT STARTED
- **Started:** — **Completed:** —
- **Blast radius (declare before editing):** —
- **Done-gate evidence (tests):** —
- **What changed:** —
- **Judgment calls / deviations:** —
- **Resume note (if IN-PROGRESS):** —

### M6 — Swastik promotion pipeline

- **Status:** NOT STARTED
- **Started:** — **Completed:** —
- **Blast radius (declare before editing):** —
- **Done-gate evidence (tests):** —
- **What changed:** —
- **Judgment calls / deviations:** —
- **Resume note (if IN-PROGRESS):** —

### M7 — Twixter persona model

- **Status:** NOT STARTED
- **Started:** — **Completed:** —
- **Blast radius (declare before editing):** —
- **Done-gate evidence (tests):** —
- **What changed:** —
- **Judgment calls / deviations:** —
- **Resume note (if IN-PROGRESS):** —

### M8 — Envelope encryption

- **Status:** NOT STARTED
- **Started:** — **Completed:** —
- **Blast radius (declare before editing):** —
- **Done-gate evidence (tests):** —
- **What changed:** —
- **Judgment calls / deviations:** —
- **Resume note (if IN-PROGRESS):** —

### MR-1 — hello-world module (Standard-tier)

- **Status:** NOT STARTED
- **Started:** — **Completed:** —
- **Salvage audit (kept vs superseded, from `pre-m1-modules`):** —
- **Blast radius (declare before editing):** —
- **Done-gate evidence (live):** —
- **Promotion evidence (stage → 19-step validation → smoke → atomic promotion):** —
- **What changed:** —
- **Judgment calls / deviations:** —
- **Resume note (if IN-PROGRESS):** —

### MR-2 — health module (Core-tier)

- **Status:** NOT STARTED
- **Started:** — **Completed:** —
- **Salvage audit (kept vs superseded, from `pre-m1-modules`):** —
- **Blast radius (declare before editing):** —
- **Done-gate evidence (live):** —
- **Promotion evidence (stage → 19-step validation → smoke → atomic promotion):** —
- **What changed:** —
- **Judgment calls / deviations:** —
- **Resume note (if IN-PROGRESS):** —

### MR-3 — browse module (Core-tier)

- **Status:** NOT STARTED
- **Started:** — **Completed:** —
- **Salvage audit (kept vs superseded, from `pre-m1-modules`):** —
- **Blast radius (declare before editing):** —
- **Done-gate evidence (live):** —
- **Promotion evidence (stage → 19-step validation → smoke → atomic promotion):** —
- **What changed:** —
- **Judgment calls / deviations:** —
- **Resume note (if IN-PROGRESS):** —

### MR-4 — queue module (Core-tier)

- **Status:** NOT STARTED
- **Started:** — **Completed:** —
- **Salvage audit (kept vs superseded, from `pre-m1-modules`):** —
- **Blast radius (declare before editing):** —
- **Done-gate evidence (live):** —
- **Promotion evidence (stage → 19-step validation → smoke → atomic promotion):** —
- **What changed:** —
- **Judgment calls / deviations:** —
- **Resume note (if IN-PROGRESS):** —

### MR-5 — persona module (Core-tier)

- **Status:** NOT STARTED
- **Started:** — **Completed:** —
- **Salvage audit (kept vs superseded, from `pre-m1-modules`):** —
- **Blast radius (declare before editing):** —
- **Done-gate evidence (live):** —
- **Promotion evidence (stage → 19-step validation → smoke → atomic promotion):** —
- **What changed:** —
- **Judgment calls / deviations:** —
- **Resume note (if IN-PROGRESS):** —

### MR-6 — permit module (Core-tier)

- **Status:** NOT STARTED
- **Started:** — **Completed:** —
- **Salvage audit (kept vs superseded, from `pre-m1-modules`):** —
- **Blast radius (declare before editing):** —
- **Done-gate evidence (live):** —
- **Promotion evidence (stage → 19-step validation → smoke → atomic promotion):** —
- **What changed:** —
- **Judgment calls / deviations:** —
- **Resume note (if IN-PROGRESS):** —

### MR-7 — modules module (Core-tier)

- **Status:** NOT STARTED
- **Started:** — **Completed:** —
- **Salvage audit (kept vs superseded, from `pre-m1-modules`):** —
- **Blast radius (declare before editing):** —
- **Done-gate evidence (live):** —
- **Promotion evidence (stage → 19-step validation → smoke → atomic promotion):** —
- **What changed:** —
- **Judgment calls / deviations:** —
- **Resume note (if IN-PROGRESS):** —

### MR-8 — dashboard module (Core-tier)

- **Status:** NOT STARTED
- **Started:** — **Completed:** —
- **Salvage audit (kept vs superseded, from `pre-m1-modules`):** —
- **Blast radius (declare before editing):** —
- **Done-gate evidence (live):** —
- **Promotion evidence (stage → 19-step validation → smoke → atomic promotion):** —
- **What changed:** —
- **Judgment calls / deviations:** —
- **Resume note (if IN-PROGRESS):** —

### M9 — Remaining implementation-flaw corrections

- **Status:** NOT STARTED
- **Started:** — **Completed:** —
- **Per-flaw rows (add one line each: flaw ID → file → test → status):** —
- **What changed:** —
- **Judgment calls / deviations:** —
- **Resume note (if IN-PROGRESS):** —

### M10 — Terminology & legacy-name sweep

- **Status:** NOT STARTED
- **Started:** — **Completed:** —
- **Blast radius (declare before editing):** —
- **Done-gate evidence (grep results):** —
- **What changed:** —
- **Judgment calls / deviations:** —
- **Resume note (if IN-PROGRESS):** —

### M11 — Convergence pass

- **Status:** NOT STARTED
- **Started:** — **Completed:** —
- **Full-project typecheck:** — **Full test suite:** —
- **Out-of-scope findings triage:** —
- **Final handoff note:** —

---

## Out-of-Scope Findings Register

> Every defect, compile error, or oddity noticed OUTSIDE the current item's blast radius. Recorded per migration-prompt rule R3. NEVER fixed inline (except one-line mechanical unblocks, which are logged as such).

| # | Date | Seen during | File / location | Finding | Belongs to item | Triage |
|---|------|-------------|-----------------|---------|-----------------|--------|
| 1 | 2026-09-26 | M0 blast-radius mapping | `AGENTS.md` | Describes `src/modules/<slug>/` as the first-party module location and `src/core/commands/__tests__/**` as a test glob. Neither exists: modules load from tier volumes under `MODULES_DIR`, commands live in `src/commands/`, and there is no `src/core` tree. | backlog | backlog |
| 2 | 2026-09-26 | M0 blast-radius mapping | `apps/main/src/entry/swastik.ts:182` | The Swastik Fastify instance is built with no `setErrorHandler` (the only one in the tree is `http/server.ts:28`), so a thrown `assertSafeSlug`/`assertSafeVersion`/`assertPathInside` surfaces as a 500 whose message echoes an absolute server path. | M0 slice 2 | **fixed-in-slice-2** |
| 3 | 2026-09-26 | M0 blast-radius mapping | `apps/main/src/bootstrap/bootstrap.ts:231-252` | 4 of the 12 wired middlewares are neutered by hardcoded stub resolvers at construction: Permission (`getRequiredPermissions: () => []`), RBAC (`getHighestRole: async () => null`), Cooldown (`getCooldownMs: () => 0`), Defer (`requiresDefer: () => false`). Each returns early, so the middleware is present but inert. | UR-A-03 | **re-routed in slice 4 — see below** |
| 4 | 2026-09-26 | M0 blast-radius mapping | `apps/main/src/entry/credentials.ts:56-68` | The argon2 branch inserts `{ id, credentialHash, label, registeredBy, updatedAt }` into `api_sessions`, which has columns `userId`, `sessionTokenHash`, `expiresAt`, `createdAt` only. The insert cannot execute. | UR-C-04 | route-to-item |
| 5 | 2026-09-26 | M0 blast-radius mapping | `apps/main/src/entry/swastik.ts:696` (now `:705`, line numbers drifted as slices 2–5 landed) | `GET /swastik/status` has no authentication at all and is used as the compose healthcheck probe. | UR-C-02 | route-to-item | **RESOLVED (slice 5)** — now gated by the shared `registerInternalAuth` preHandler; the probe authenticates as a service. Note the original line reference was stale even when recorded. |
| 6 | 2026-09-26 | M0 blast-radius mapping | `apps/main/src/entry/swastik.ts:184` (now `:206`) | `POST /swastik/developers/register` is the one `/swastik/*` write route with no internal-key gate, so a developer can self-register from any reachable interface. | UR-C-02 | route-to-item | **RESOLVED (slice 5)** — registration is now operator-mediated; it is the one non-`/internal/*` route the predicate protects by default. Residual: `devId` is still a plaintext bearer (UR-B-05/UR-C-05, slice 6). |
| 7 | 2026-09-26 | M0 blast-radius mapping | `apps/main/src/http/routes/admin.routes.ts:273-405` | Seven PEP actions (`pauseQueue`, `resumeQueue`, `requeueDeadLetter`, `overrideRateLimit`, `restartShardGroup`, `triggerCoreRestart`, `rollbackModuleVersion`) insert a JSON blob into `system_state` and return success without touching the queue, limiter, shard manager, or any module. Near-fake successes: they are 200s, not 501s, so the honest-stub test does not catch them. | UR-A-04 | **fixed-in-slice-3** |
| 8 | 2026-09-26 | M0 blast-radius mapping | `apps/main/src/licensing/deployment-records.ts:99` | `AppendOnlyDeploymentRecords` is referenced only by itself and its own test; `entry/swastik.ts` never imports it, so the `deployment_records` table created by `20260101000033` is never written. | M5 | route-to-item |
| 20 | 2026-09-27 | M0 slice 5 | `apps/main/scripts/swastik-deploy.ts:47` | The deploy CLI called `POST /internal/deploy` with only a `Content-Type` header and **never sent `x-internal-api-key`**, so it could not have worked against the pre-existing `requireInternalKey` gate either. Found by grepping every caller of the gated surface *after* declaring the slice's client list complete — the first pass missed it. | UR-C-02 | same-item — **fixed in slice 5**; it is the concrete proof that UR-C-02's "CLI sends header" clause was untrue at HEAD for reasons unrelated to this slice's two named findings. |
| 9 | 2026-09-26 | M0 blast-radius mapping | `apps/main/src/logging/logger.ts:13-36` | `REDACT_PATHS` does not include `devId`, so developer identifiers are not redacted from logs while other credential-ish keys are. | UR-C-05 | route-to-item |
| 10 | 2026-09-26 | M0 blast-radius mapping | `apps/main/src/config/env.schema.ts:88-90` | `CLAI_MFA_ISSUER`, `CLAI_BREAK_GLASS_SCRIPT_URL`, `CLAI_AUTHKEY_STORAGE_URL` are declared in the schema but read by no code; no `mfa` or `break-glass` string exists in `src/`. Declared-but-dead config. | M0 / M9 | route-to-item |
| 11 | 2026-09-27 | M0 slice 2 | `apps/main/src/entry/swastik.ts:184` | The Swastik instance is still not behind the `isMainEntry` guard (`src/entry/is-main-entry.ts`, used by `main.ts`/`worker.ts`), so it cannot be imported in a unit test: doing so would call `listen()` and open Postgres/Redis connections. This is why the finding-#2 tests are structural rather than behavioral. Putting the entry point behind the guard is UR-C-23. | M9 (UR-C-23) | route-to-item |
| 12 | 2026-09-27 | M0 slice 2 | `apps/main/src/module-system/swastik-loader.ts` | The loader's containment root is `modulesDir`, so `SWASTIK_STAGING_VOLUME_PATH` must be nested inside `MODULES_DIR` or promoted symlinks fail closed. Both shipped shapes (`docker-compose.yml:44`, `deploy/k8s/base/configmap.yaml:34`) nest it at `/mnt/modules/swastik-staging`, so nothing is broken today, but nothing in the schema or compose enforces it. | M6 (Swastik promotion pipeline) | route-to-item |
| 13 | 2026-09-27 | M0 slice 3 | `apps/main/tests/unit/m9-revoke-suspend.test.ts:10` | **Slice-1 regression that slice 1 never caught.** This file's harness sets `trustedSources: ['dashboard', 'swastik-internal']` and sends `source: 'dashboard'` in the request body. Slice 1 changed `extractRequest` to derive `source` from `request.ip`, so under `app.inject` the source became `127.0.0.1`, which is not in the list, and 3 tests failed with 403. Slice 1's no-regression run covered 10 suites and did not include this file, so the damage shipped silently inside M0's own slice 1. Found only because slice 3 ran the **full** unit suite (857 tests) rather than the targeted net. | M0 (slice 1) | **fixed-in-slice-3-addendum** |
| 14 | 2026-09-27 | M0 slice 3 | `apps/main/tests/unit/admin-routes.test.ts:61` | The test `PEP feature-flags endpoint dispatches to power engine` asserted `statusCode === 200` **and** that `dispatch` was called — i.e. it actively pinned the fake success as the expected contract. It is a regression test for finding #7, not a legitimate specification, so no honest fix can leave it green. | UR-A-04 | **fixed-in-slice-3-addendum** |
| 15 | 2026-09-27 | M0 slice 3 | `apps/main/src/queue/queue-manager.ts:89` | `QueueManager.pause()` is fully implemented but has no caller: the `pauseQueue`/`resumeQueue` admin routes are the intended entry point and were 200-returning no-ops. Slice 3 makes them honest 501s, which satisfies the P0 requirement (UR-A-04) but leaves an existing subsystem unrouted. Wiring it needs a new `AdminRoutesDeps` member plus `bootstrap.ts` threading. | M9 (UR-B-08, P1) | route-to-item |
| 16 | 2026-09-27 | M0 slice 3 | `apps/main/src/entry/pep.ts:94`, `apps/main/src/entry/ssh-clai.ts:189` | Both entry points call `.listen(...)` / `startClaiSshServer()` at module scope and neither is behind the existing `isMainEntry` guard (`src/entry/is-main-entry.ts`, used by `main.ts`/`worker.ts`; verified zero occurrences in either file), so **neither can be imported in a unit test** — importing would bind a real port. This is the direct cause of the structural-only coverage of the slice-3 entry-point fixes, and it generalises finding #11 from Swastik to all three entry points. | M9 (UR-C-23) | route-to-item |
| 17 | 2026-09-27 | M0 slice 4 | `apps/main/src/commands/command-router.ts:212-220` | `createMiddlewareContext` returns `meta: {}`, but `DeferMiddleware` reads its interaction from `ctx.meta['interaction']` (`built-in/defer.ts:24-25`). So the defer stage is **dead by construction**, not merely by stub: `requiresDefer` returning `true` would still never defer, because the interaction is never put in the context. This is a fifth dead-wiring defect, separate from finding #3, and it also means any future middleware needing the raw interaction has the same problem. | M3 (Core Renderer / buffer-then-render) or M9 (UR-C-09) | route-to-item |
| 18 | 2026-09-27 | M0 slice 4 | `apps/main/src/permissions/resolver.ts:153-155` | `if (ctx.hasExplicitPermissionDeclaration !== true) return deny(7, 'no explicit permission declaration exists for this action')` — the resolver denies any command that does not set `permissionDeclared`. This **masked** the slice-4 tier fail-open well enough that 5 of the first 6 tests written for it passed against the vulnerable code, because the fixtures lacked the flag and were denied for an unrelated reason. Worth its own record: a fail-closed backstop at layer 7 silently covering a different defect at an earlier layer is a hazard for any future fail-open audit, since the obvious test always passes. | M0 (recorded; not changed) | route-to-item |
| 19 | 2026-09-27 | M0 slice 4 | `apps/main/src/commands/command-registry.ts:38-45` | `register(def)` accepts a command for a `moduleId` that has no entry in `moduleTiers`, i.e. it will build the exact fail-open state that slice 4 had to defend against at dispatch time. Nothing rejects the mismatch, so the defect is reachable by any module that registers a command under another module's id. Slice 4 closed the consequence (deny at dispatch) but not the cause. Refusing at registration would match §17.3/§19.1's "fails the build rather than failing silently", at the cost of changing the registry's public contract and registration-order assumptions in the module loader. | M0 (hardening follow-up) or M2 (unified command tree) | route-to-item |

Triage values: `route-to-item` (reopen/attach a work-order item) · `backlog` (pre-re-baseline, unrelated) · `mechanical-unblock-done` (logged one-line fix).

---

## Deviations

> Any action taken under this migration that the migration prompt's rules R1–R10 would not cover. Deviations must be recorded here, never silent.

| # | Date | Item | Deviation | Reason |
|---|------|------|-----------|--------|
| 1 | 2026-09-26 | M0 slice 1 | Edited `apps/main/scripts/e2e-test.ts`, which sits outside the declared M0 blast radius. Added an `adminHeaders()` helper supplying `x-internal-api-key`, and dropped the now-ignored `source: 'dashboard'` field from three request bodies. | Mechanical unblock under R3, caused directly by slice 1. The script called `/admin/*` with no key and declared a body `source`; leaving it would have shipped a knowingly-broken e2e path. Treated as `mechanical-unblock-done`. |
| 2 | 2026-09-26 | M0 slice 1 | Edited `apps/main/docker-compose.yml` environment and port mappings (pinned `8080/8081/8082` to `127.0.0.1`, set the three bind hosts to `0.0.0.0` inside the container). | UR-B-03 names "configurable bind host; loopback compose mapping" explicitly, and the file is inside the declared blast radius. Required: the new loopback default would otherwise have made the published container ports unreachable. |
| 3 | 2026-09-26 | M0 triage | Read-only survey of all 17 P0 rows, including files that will not be edited in the next slices. | M0's source of truth is "the flaw tables … filtered to priority P0. Read the flaw rows before touching anything." The triage table is a prerequisite for declaring a blast radius at all (R2), not a fix. |
| 4 | 2026-09-26 | M0 triage | No full-project `tsc --noEmit` and no master-prompt audit were run. | R5 makes a full-project compile a gate for M11 only; the master prompt's audit protocol becomes governing only after every work-order item is DONE. Per-item gates used instead: targeted `vitest` over the blast radius, plus `eslint --max-warnings=0` and `prettier --check` on changed files. |
| 5 | 2026-09-27 | M0 slice 2 | Read-only survey outside the slice-2 blast radius: `module-loader.test.ts`, `first-party-module-seed.test.ts`, `m6-promotion.test.ts`, `promotion.ts`, `env.schema.ts`, `docker-compose.yml`, `deploy/k8s/base/configmap.yaml`. None edited. | Same category as deviation #3. Required to declare the blast radius honestly under R2: the legal on-disk entry shape turned out to be two-fold (`<slug>` symlink from `promoteAtomically` vs `<slug>__<version>` real directory from the seed tooling), and a wrong assumption there would have written a guard that broke the promotion path. Reading the callers and their tests before choosing the assertion is the prerequisite for the choice, not a fix. |
| 6 | 2026-09-27 | M0 slice 3 | Edited `apps/main/tests/unit/admin-routes.test.ts:61-80`, outside the declared slice-3 blast radius. Rewrote `PEP feature-flags endpoint dispatches to power engine` → `... answers honest 501 and dispatches nothing (UR-A-04)`, replacing the 200 + `dispatch`-was-called assertions with 501 + `NOT_IMPLEMENTED` + `dispatch` **not** called. | Finding #14: the test's only assertion was that the fake success still lies, making it a regression test for the very defect UR-A-04 exists to remove. R3 says log out-of-scope defects and do not fix them — but R3 protects unrelated *code* from opportunistic repair, and it cannot mean a test asserting the defect must be kept green. Precedent: slice 1 deviation #1. No production code outside the radius was touched. |
| 7 | 2026-09-27 | M0 slice 3 | Edited `apps/main/tests/unit/m9-revoke-suspend.test.ts:10`, outside the declared slice-3 blast radius. One line: added `'127.0.0.1'` to the harness `trustedSources` fixture. | Finding #13: this is **slice 1's** damage, not slice 3's — slice 1 made `source` server-derived and silently broke 3 tests that its own no-regression run never covered. R3's explicit "one-line mechanical unblocking fix" exception. The fixture is a test-local allow-list, not production config, so there is no security effect. The now-ignored `source: 'dashboard'` fields left in three request bodies are cosmetic and were deliberately left for the owning slice rather than widened into a third unrelated edit. |
| 8 | 2026-09-27 | M0 slice 4 | Added one `registerModule(...)` line to each of 8 dispatch fixtures in `apps/main/tests/unit/command-registry-router.test.ts` and 1 in `apps/main/tests/unit/m3-embed-and-dm.test.ts` — outside the item's declared test scope, though **declared in the slice-4 blast radius before editing** rather than discovered afterwards. | These 9 tests built a registry state production cannot produce (a command whose module has no tier) and passed *because* of the fail-open slice 4 removes. The lines restore exactly what `module-system/loader.ts:81` does in production. No assertion was weakened, deleted, or reworded — this is not "changing tests to fit the implementation", it is repairing fixtures that encoded the defect. R3 applies to fixing unrelated *code*; these are the item's own tests, failing as a direct and predicted consequence of its own source change (the prediction is recorded in the slice-4 blast radius). |
| 9 | 2026-09-27 | M0 slice 4 | Added one `registerModule('audio', 'core')` line to the shared `buildRouter` helper in `apps/main/tests/unit/m7-persona.test.ts`, which was **not** in the declared slice-4 blast radius at all. | Same category as #8, but it is an honest scope miss: the pre-declared radius named two test files and the full-suite run found a third, fixing 2 further failures with one line. The alternative was a red suite. Logged rather than quietly absorbed because the radius was declared before editing and this file was not on it — the deviation is the extension, not the fix. Tier `'core'` chosen to match the dominant real-module tier (`dist-modules/*/manifest.json`) and to keep the m7 tests testing persona ownership rather than tier scoping. |
| 10 | 2026-09-27 | M0 slice 5 | Edited `apps/main/scripts/verify-all.ts`, outside the item's declared fence (only `docker-compose.yml` was named among the clients). Its `waitFor` on `GET /swastik/status` would have polled a now-keyed route for 60s and died with a misleading `Timed out waiting for …/swastik/status`. | UR-C-02 keys the status route, so the slice's own decision created the breakage; the alternative was leaving a shipped verification path knowingly broken. Precedent: slice 1 deviation #1 (`scripts/e2e-test.ts`). The `waitFor` helper gained an optional `headers` argument so the change is additive and the three other call sites (health/metrics) are untouched. The key is read from `process.env` and never logged or interpolated into a URL. |
| 11 | 2026-09-27 | M0 slice 5 | Rewrote one assertion in a slice-2 test: `internal deploy requires the internal key and never auto-approves developers` asserted `requireInternalKey(request, reply)` exists, which is precisely the hand-rolled helper slice 5 deleted. Replaced with assertions on the shared gate that now provides the same guarantee (`registerInternalAuth(app, {` + `shouldProtect: shouldProtectSwastikRoute`). | Same category as slice 3 deviation #6: the old assertion pinned a *mechanism* while the test's stated intent ("internal deploy requires the internal key") is unchanged and still enforced — in fact more strongly, since a `preHandler` runs before the handler rather than inside it. The test's other three assertions (`developer is not registered for deployment`, no `swastik-auto-dev-created`, no forced `approvalStatus: 'approved'`) are untouched. Logged because the test predates this slice and was not in its declared radius. |
| 12 | 2026-09-27 | M0 slice 5 | Edited `apps/main/scripts/swastik-deploy.ts`, outside the item's declared fence, adding the `INTERNAL_API_HEADER` import, an explicit `INTERNAL_API_KEY is required` throw, and the header on the `/internal/deploy` request. | UR-C-02's remedy says "CLI sends header" **verbatim**, and this is the deploy CLI, so the file is inside the row even though it was not on the radius sheet. The pre-existing gate already rejected unauthenticated `/internal/deploy` (finding #20), so this did **not** newly break a working path — it repaired one that could never have worked. Mirrors `seed-first-party-modules.ts`, which already did this correctly, so the in-repo pattern was copied rather than invented. |

