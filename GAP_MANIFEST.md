# GAP MANIFEST — Build-Engine Audit

**Generated:** 2026-10-06
**Protocol:** `docs/orchestration/master-prompt.md` §3 (Codebase State Detection & Audit Protocol)
**Repository:** `master-ronix/Dumby-Suite`
**Branch / ref:** `feature/dev` @ `b6ae1a6d860902274cd3c237d68c1c886687ba8b`
**Codebase state:** State C — Enforcement (code present; work order INACTIVE)
**Entry procedure followed:** `docs/prompts/entry.md` → `orchestration/master-prompt.md` (enforcement mode)
**Run mode:** State C — audit (§3) → remediation (§4) → enforcement pass (§6), corpus-wide.

---

## 0. State determination (entry.md §4)

- **Docs base path:** `docs/` (resolved once).
- **Authority layer:** `docs/manifest.json` read; normative set = `blueprint/`, `spec/**` (10 departments), `contracts/` (9). `documentation/` is derived; `archive/**` is not current. Precedence is owned by `spec/governance/directive-charter-how-to-use-this-document.md` §0.2 and is cited, not restated.
- **State probe (`apps/main/`):** contains code — 205 `.ts` source files, 18,464 LOC, 45 Knex migrations.
- **Work-order probe:** `upgradation/UR-*.md` → **none present** (glob empty); `migration-ledger.md` (repo root) → an **unconstructed template** (all rows are placeholders `<ID>`/`<Title>`/`<status>`, no real items). ⇒ work order **INACTIVE**.
- **Classification:** code present **and** work order INACTIVE → **State C — Enforcement**. `migration/migration-prompt.md` §0.0 work-order guard correctly refuses (no active work order); `master-prompt.md` enforcement mode governs.

---

## 1. Classification Summary

| # | Subsystem | State | Evidence |
|---|-----------|-------|----------|
| 1 | Compile (`tsc --noEmit`) | `COMPLETE` | `pnpm --filter @workspace/dumby typecheck` → exit 0 |
| 2 | Unit tests (`vitest`, unit config) | `COMPLETE` | 66 files / 757 tests passed / 0 failed |
| 3 | Lint (ESLint, `--max-warnings=0`) | `COMPLETE` | exit 0, zero warnings |
| 4 | Format (Prettier `--check`) | `COMPLETE` | "All matched files use Prettier code style" |
| 5 | Documentation gates (`docs/scripts/docs/check-*.mjs`) | `COMPLETE` | 25 / 25 gates green |
| 6 | Bootstrap (18-stage) | `COMPLETE` | `src/bootstrap/bootstrap.ts`; stage tests pass; readiness 503→200 |
| 7 | DI container | `COMPLETE` | reconciliation REC-017 `match`; frozen-core + MockContainer tested |
| 8 | Middleware pipeline | `COMPLETE` | 12 built-in middlewares at `src/middleware/built-in/`; REC-009 `match` |
| 9 | Permission engine | `COMPLETE` | fail-closed `permissions/resolver.ts`; REC-010 `match` |
| 10 | Module system / manifest contract | `COMPLETE` | full contract expressed in `packages/swastik/src/manifest.ts` (see §2 F1) |
| 11 | Renderer / embed ban | `COMPLETE` | 0 `new EmbedBuilder`/`new MessageEmbed` in `src/`; REC-015 `match` |
| 12 | Command router (single canonical) | `COMPLETE` | one impl `src/commands/command-router.ts`; wired in `bootstrap.ts`; test enforces single router |
| 13 | Migrations | `COMPLETE` | 45 migrations, every one exports `down()` |
| 14 | Module storage discipline | `COMPLETE` | no `apps/main/src/modules`; `MODULES_DIR` tier volumes referenced; REC-012 `match` |
| 15 | First-party command surface | `COMPLETE` | all 8 present under `packages/modules/`: dashboard, health, browse, queue, persona, permit, modules, hello-world |
| 16 | Docs ↔ code reconciliation ledger | `COMPLETE` | re-verified at HEAD; 22/22 rows `match` (F1 fixed) |
| 17 | `tests/unit/tier-rules.test.ts` + modules contract suite | `COMPLETE` | duplicate key removed; out-of-enum case added (F2 fixed) |
| 18 | Capability ledger (`status/capabilities.json`) | `COMPLETE` | CAP-004/005 corrected; derived `compliance.json` regenerated (F3 fixed) |
| 19 | Coverage floors (`test:coverage`, D-8.2) | `FAULTY` | 55.8% statements / 52.4% branches vs a 70/65 blended floor; config is blended, not per-layer (see §2 F5) |
| 20 | Flow / integration / Docker / K8s verification | `UNVERIFIED` | require embedded Postgres, live Postgres+Redis, image build, cluster — not available in this sandbox (see §2 F4) |

---

## 2. Gaps & Deviations

### F1 — `status/code-reconciliation.json` stale relative to HEAD (FIXED — 2026-10-06)
**Status:** resolved — ledger re-verified at HEAD `b6ae1a6d`; the seven rows now `match`; counts 22 match / 0 gap. Gate `check-code-reconciliation` green.
- **Spec:** `docs/status/code-reconciliation.json` note — *"the specification is authority; where the code is narrower, the code is the gap to close."*
- **Delta:** the ledger's `verified_commit` is `e60ee66`; the audited branch HEAD is `b6ae1a6d…`. Its 7 `code-gap` rows are **all module-manifest fields** — REC-001 `releaseStatus`, REC-002 `visibility`, REC-005 required fields, REC-019 `marketplaceCategory`, REC-020 `depends`/`provides`/`services` shapes, REC-021 `devId`/`buildId`, REC-022 `required` flag.
- **Code truth at HEAD:** `packages/swastik/src/manifest.ts` now expresses the full contract — `visibility` triad (`public|unlisted|private`), `releaseStatus` (`private|public`), `devId` + `buildId` required, `marketplaceCategory` enum (`audio|community|security|integrations|utility`), `required` flag, `depends {token,version}`, `provides {token,contract}`, `services {token,class,lifetime,deps}`, `crossModuleReads`. The 7 recorded gaps now **match**.
- **Remedy:** re-verify and re-point the ledger to HEAD; flip REC-001/002/005/019/020/021/022 from `code-gap` to `match` (or add a `resolution` field, as REC-003 carries). The `check-code-reconciliation` gate passes today because it does not assert commit freshness.

### F2 — `tests/unit/tier-rules.test.ts` encoded a defective fixture (FIXED — 2026-10-06)
**Status:** resolved — duplicate `marketplaceCategory` key removed; an out-of-enum rejection case added to `tests/modules/tier-co-constraints.spec.ts`; unit suite + modules contract suite green.
- **Spec:** a test must prove specified behavior; the marketplace category enum is `audio|community|security|integrations|utility` (`contracts/module-manifest.schema.json`).
- **Delta:** the fixture object literal declares `marketplaceCategory: 'utility'` **and then** `marketplaceCategory: 'entertainment'` — a duplicate key (esbuild/vite warn at transform time). The effective value is `'entertainment'`, which is **not** a member of the enum, yet the test asserts `isTierValid(...) === true`. The test is misleading and the `--max-warnings=0` ESLint gate does not catch it (the key duplication is not in the linted rule scope for that path).
- **Remedy:** remove the duplicate key and assert against a valid enum value; add a negative case proving an out-of-enum category is rejected. Consider adding `no-dupe-keys` to the test lint scope so the class of defect is caught by a gate.

### F3 — `status/capabilities.json` carried stale rows contradicted by the code (FIXED — 2026-10-06)
**Status:** resolved — CAP-004 and CAP-005 corrected to `implemented`; derived `compliance.json` regenerated; `check-status-evidence` + `check-compliance` green.
- **Delta:** CAP-005 says the canonical command system (`src/commands/`) is *"Dead Code — zero external importers."* At HEAD, `src/commands/command-router.ts` is the single canonical `CommandRouter`, constructed in `bootstrap.ts`, registered under `CORE_TOKENS.CommandRouter`, and dispatched on every interaction; `tests/unit/command-tree-structure.test.ts` asserts exactly one router implementation and no imports from retired command trees. CAP-004 (*"thinner than spec"*) similarly predates the current wiring.
- **Remedy:** regenerate `capabilities.json` from the audit register against HEAD; correct CAP-005's status and evidence. Deferred items (CAP-001/002/003/007/008/009/011/013/015/016) remain correctly out of scope — do not build them.

### F4 — Unverified verification surfaces (UNVERIFIED, not defects)
- The following were **not executed** in this run because they require services/infrastructure unavailable in the sandbox, and are recorded honestly as unverified rather than `COMPLETE`: `test:flow` (embedded PostgreSQL), `test:integration` (live Postgres + Redis, D-8.10), the Docker multi-stage image build (D-8.6), and K8s manifest apply. (The coverage surface, previously listed here, is now run and reported separately as F5.)
- **Environment note (not a code defect):** the workspace declares `engines.node >= 22`; this run executed on Node 20.20.2. Typecheck, lint, format, and the unit suite nonetheless pass. Re-run on Node 22 to remove the engine warning.

### F5 — Coverage floors unmet (FAULTY — OPEN; a defect against directive D-8.2)
**Status:** open — not landable as a one-shot; requires authoring the missing subsystem tests plus a per-layer threshold config.
- **Spec:** directive D-8.2 — *"CI enforces these floors per layer — never as a blended repository-wide average"* (Application Core 85/80, module services 80/75, module commands 75/70, repositories 70/65, infra-adjacent 70/65). *"Any divergence between these floors and the enforced Vitest thresholds is a defect reported against this directive."*
- **Delta:** `vitest run --coverage` measures **55.8% statements / 52.4% branches / 57.5% functions / 56.6% lines** against the configured blended floor of 70/65/70/70 — the gate **fails** (CI Gate 4, `test:coverage`). Two distinct defects: (1) the floors are not met; (2) the config enforces a single **blended** threshold, which D-8.2 explicitly prohibits (per-layer, never blended). Including the acceptance `.spec` suites in the coverage run barely moves the number (55.84% statements), so the shortfall is genuine untested code, not a config artifact — e.g. `src/webhooks/*`, `src/shutdown/fatal-handler.ts`, and several `src/shared/**` utilities sit near 0%.
- **Remedy (not one-shot):** author the missing unit/subsystem tests in the D-8.3 priority order (bootstrap, cache, db, queue, events, http, permissions, modules, middleware, shutdown) to lift each layer to its floor, then re-express `vitest.config.ts` thresholds **per layer** (glob-scoped) to satisfy D-8.2 rather than a blended average. Verify by `test:coverage`.

---

## 3. Remediation Plan

Ordered by `master-prompt.md` §3.4 severity. No compile-blocking faults were found, so the list begins at the test/ledger tier:

1. **F2 (test fault, highest actionable)** — fix the `tier-rules.test.ts` fixture; add the out-of-enum negative case; wire `no-dupe-keys` into the test lint scope. Verify by `pnpm --filter @workspace/dumby test:unit`.
2. **F1 (docs↔code ledger staleness)** — re-verify `status/code-reconciliation.json` against HEAD `b6ae1a6d`; update the 7 manifest rows. Verify by `check-code-reconciliation` gate plus a commit-freshness assertion.
3. **F3 (capability ledger staleness)** — regenerate `status/capabilities.json` from the audit register; correct CAP-004/CAP-005. Verify by `check-status-evidence` / `check-compliance` gates.
4. **F5 (coverage floors, open)** — author the missing subsystem tests in D-8.3 order and re-express the Vitest thresholds per layer per D-8.2; verify by `test:coverage`. This is the remaining blocker to an all-`COMPLETE` manifest.
5. **F4 (unverified surfaces)** — run the flow, integration, Docker, and K8s verifications on Node 22 with live Postgres + Redis in CI; fold the results back into this manifest.

**Enforcement-pass status:** the one-shot remediation (§4) closed F1, F2 and F3; the re-audit produced no `MISSING` items and no compile-blocking `FAULTY` items, and every gate except coverage is green. The pass does **not** close: **F5 (coverage floors) is open and is a defect against directive D-8.2**, and the F4 surfaces (flow suite, integration with live Postgres+Redis, Docker build, K8s apply) still require services unavailable in this sandbox and remain **tracked, not claimed**. Per master-prompt §6.1 an open `FAULTY` item keeps the manifest from all-`COMPLETE`, so the Definition of Done (§6.2) is not yet met — close F5, then re-run the pass.

---

*Generated by the Dumby build engine — `prompts/meta-prompt.md` 5.2.0 → `orchestration/master-prompt.md` 5.2.0 (enforcement mode).*
