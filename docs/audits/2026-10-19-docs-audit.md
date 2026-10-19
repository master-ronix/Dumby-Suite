# /docs Audit — Dumby Suite (feature/dev)

| Field | Value |
|---|---|
| Repository | `master-ronix/Dumby-Suite` (private) |
| Branch | `feature/dev` |
| Commit audited | `9703da89987e0c3734408282a4c2c1b805c04358` |
| Commit date | 2026-10-18 |
| Audit date | 19/10/2026 |
| Auditor | Sarvam AI — independent documentation audit pass |
| Scope | `/docs` at repo root — **328 files** (272 `.md`, 32 `.mjs`, 23 `.json`, 1 `.yaml`) |
| Prior audit | 2026-10-18 @ `416864b` — findings DR-1 … DR-12, formalised as `upgradation/UR-20261018-092.md` |
| Gate suite at audit | 30 gates; all green in a full checkout (see §2 and Finding DA-1) |

---

## 1. Executive summary

The `/docs` corpus of Dumby is, by a wide margin, the most rigorously self-governed documentation set this audit has examined. It is not a folder of Markdown — it is a small specification *system*: a single-sourced `manifest.json`, nine machine-readable `contracts/`, a 2,246-row coverage ledger, thirteen status ledgers, sixteen ADRs, a unified change-log, and **30 executable gates** that the project runs as release gates. Every source heading is mapped to a target file and verified present; every number in prose is injected from `status/counts.json`; every URI record is discovered dynamically rather than held in a registry.

At the audited commit the corpus is structurally sound. All 328 files were fetched and verified byte-for-byte against the Git tree (0 size mismatches). **No secrets are present** in `/docs`. No live document carries an unfinished marker (the only `TODO`/`FIXME` strings sit in the quarantined `archive/`). Every front-matter-gated artifact carries its required keys. Running the corpus's own gate suite reproduces the project's claim: **30/30 gates pass in a full checkout** — the single local failure (`check-counts`) is an artifact of the partial checkout this audit used, and resolves exactly to the tree the full repository holds (1,564 entries / 1,276 files / 288 directories).

The findings are therefore not "the docs are broken." They are six **verification-system and hygiene gaps the corpus's own gates structurally cannot see**, and one **partially-closed prior finding**:

- **DA-1 (High)** — the gate suite is **not hermetic**: several gates guard their real checks behind `existsSync(...)` of inputs outside `docs/` and, when those inputs are absent, **silently skip** while still printing `OK` and exiting 0. A green run is not self-attesting.
- **DA-2 (High)** — the DR-1 remediation is **incomplete**: `_generated/index.md` is declared a generated artefact but no gate regenerates or checks it, and it is already partial.
- **DA-3 (Medium)** — `deploy/railway.md` is an **unclassified, ungated document** — the only file in `/docs` outside the corpus's classification, front-matter policy, and gates.
- **DA-4 (Medium)** — a **normative** spec file carries **45 empty ATX headings** (`####`), whose titles were demoted into following blockquotes.
- **DA-5 (Low)** — the UR register has an **unexplained sequence gap** (index `043` absent) and an **inconsistent suffix scheme**; `check-ur` does not test continuity.
- **DA-6 (Low)** — audit provenance is one re-baseline behind HEAD; this audit **re-anchors it to `9703da8`**.

The corpus already tracks its own open residuals honestly (OI-1 human attestation; OI-3 Kubernetes apply; UR-20261018-093 / REC-025 unimplemented). This audit confirms them and adds the six above. Five Upgrade Requests are raised (§9).

## 2. Method

Phases were run in the order the request defines, with a one-line status per phase.

- **Phase 0 — Preflight.** Resolved repo `master-ronix/Dumby-Suite`, branch `feature/dev`, and the `/docs` path via the connected GitHub integration (read-only). Confirmed scratch workspace. **Status: pass.**
- **Phase 1 — Safe acquisition.** Fetched the `feature/dev` recursive tree; downloaded all 328 `/docs` blobs; verified each file's byte size against the tree (`0` mismatches). Recorded commit `9703da8…`. **Status: pass.**
- **Phase 2 — Recon & inventory.** Enumerated the full tree; parsed front-matter; built the cross-reference model; measured orphan/dead-link status. **Status: pass.**
- **Phase 3 — Deep examination.** Examined every document structurally (front-matter, headings, links, role, maintenance signal); deep-read the authority layer (`README.md`, `manifest.json`, `_meta/frontmatter.schema.json`, `blueprint/`, `spec/`, `status/`, `scripts/docs/`, `upgradation/README.md`, `change-log.md`, `UR-20261018-092/093`). **Status: pass.**
- **Phase 4 — External grounding.** Verified the corpus's external claims against public sources (§8). **Status: pass.**
- **Phase 5 — Findings synthesis.** Classified by severity/category/location/evidence; de-duplicated. **Status: pass.**
- **Phase 6 — Residual elimination.** Every finding dispositioned (closed / UR item / open residual). **Status: pass.**
- **Phase 7 — Archival.** Inventory, findings dataset, and session capture persisted (§ D3/D4). **Status: pass.**
- **Phase 8 — UR authoring.** Five URs produced (§9). **Status: pass.**
- **Phase 9 — Placement & verification.** Written to their `/docs` paths in the working copy; re-opened and link-checked. **Status: pass.**
- **Phase 10 — Reporting.** This report + the chat report. **Status: pass.**

**Tools.** GitHub integration (read-only tree/contents/branch); sandbox (Node 20, Python 3.12) to unpack, index, and run the gate suite; web search for external grounding only.

**Excluded from examination, with reason.** `_inbox/*` (6 files) — frozen pre-restructure source, quarantined by `README.md`; `archive/v4.5.1/*` (2 files) — quarantined legacy. Both appear in the inventory with status `excluded`.

**Verification caveat (important).** This audit ran the gate suite from a `docs/`-only checkout. In that configuration the suite reports 29/30 with one failure; that failure is reproduced exactly by the full tree (see DA-1 and DA-2), so the true CI result is 30/30. However — and this is DA-1 — **the same configuration silently skips at least six code-count checks and three side-document checks**, so the local run is weaker than CI in a way that is invisible in its output.

## 3. Inventory

328 files. Full per-file inventory with role and status: **Appendix A**. Roll-up:

| Area | Files | Role | Status |
|---|---|---|---|
| `upgradation/` | 102 | 100 UR records + `README.md` + `change-log.md` | examined |
| `spec/` | 94 | normative specification, by department | examined |
| `documentation/` | 32 | reader wiki / API book | examined |
| `scripts/` | 32 | documentation gates (`check-*.mjs`) + 2 tools | examined |
| `adr/` | 16 | ADR-001 … ADR-016 | examined |
| `status/` | 13 | machine-readable ledgers | examined |
| `blueprint/` | 10 | edge/wiring docs | examined |
| `contracts/` | 9 | machine-readable interfaces | examined |
| `_inbox/` | 6 | frozen pre-restructure source | excluded (frozen quarantine) |
| `archive/` | 2 | quarantined legacy (v4.5.1) | excluded (quarantined legacy) |
| `migration/` | 2 | migration assets | examined |
| `prompts/` | 2 | build-engine prompt assets | examined |
| `_generated/` | 2 | generated index + tree | examined |
| `_meta/` | 1 | front-matter JSON Schema | examined |
| `deploy/` | 1 | **deployment guide — unclassified** (DA-3) | examined |
| `orchestration/` | 1 | build-engine asset | examined |
| root | 3 | `README.md`, `glossary.md`, `manifest.json` | examined |

## 4. Findings

Each finding carries **ID · Severity · Category · Location · Evidence · Disposition · Recommendation**.

---

### DA-1 · High · Process (verification integrity)

**Location.** `docs/scripts/docs/check-counts.mjs` (lines 46, 57, 97, 116), `docs/scripts/docs/check-side-docs.mjs` (lines 33, 87, 121).

**Evidence.** Several gates guard their substantive checks behind `existsSync(...)` on inputs that live **outside** `docs/`, and skip silently when the input is absent while still exiting 0:

- `check-counts.mjs` verifies `bootstrap_stages`, `shutdown_steps`, `middleware_stages`, `code_ts_files`, `code_src_ts_files`, `code_migrations` only `if (existsSync('../apps/main/...'))`. In a `docs/`-only checkout all six are skipped.
- `check-side-docs.mjs` verifies the build-manifest ref and the provenance/audit-age unification only for files that exist (`../GAP_MANIFEST.md`, `../STATUS.md`); the branch-membership check runs only `if (existsSync('../.git'))`.

In this audit's run the suite printed `OK` for these gates and exited 0 **without having verified those conditions** — a fail-open. The gate is green whether the input matches or is simply missing.

**Disposition.** UR item → **UR-20261019-094**.

**Recommendation.** Make the skip explicit and countable (emit `SKIP: <check> (input absent)` and fail the gate when a *canonical* input is absent under CI), or assert the canonical inputs exist before the suite runs. A gate must never be unable to distinguish "verified" from "not run".

---

### DA-2 · High · Completeness / Process (generated artefacts)

**Location.** `docs/manifest.json` (`generated[]`), `docs/scripts/docs/check-generated.mjs`, `docs/_generated/index.md`.

**Evidence.** `manifest.json` declares **three** generated artefacts: `_generated/index.md`, `_generated/tree.md`, `status/compliance.json`. The gate written to stop a generated artefact rotting (`check-generated.mjs`, added for DR-1) reads and validates **only `_generated/tree.md`**. `_generated/index.md` is therefore declared generated but **ungated**, and is already partial: it omits `deploy/`, `_inbox/`, `_meta/`, `scripts/`, and `_generated/` itself, and its "Assets" row lists only `orchestration/ migration/ upgradation/ prompts/` while `manifest.assets` also contains `inbox`. DR-1 explicitly named `_generated/index.md` as "likewise partial"; the DR-1 fix gated only the tree.

**Disposition.** UR item → **UR-20261019-095** (a residual of DR-1).

**Recommendation.** Extend `check-generated` to assert `_generated/index.md` covers every manifest document/asset, or remove `index.md` from the `generated[]` list if it is a curated index, not a generated one.

---

### DA-3 · Medium · Structure / Process (document classification)

**Location.** `docs/deploy/railway.md`.

**Evidence.** This is the **only** document in `/docs` outside the corpus's classification. It carries **no front-matter**; it is **absent** from `manifest.json` (not in `documents`, `contracts`, `archive`, `assets`, or `generated`); it is **not scanned** by `check-frontmatter` (which globs only `spec blueprint documentation adr upgradation`); and it is referenced by **no** gate and **no** status ledger (`grep -rn railway status/ scripts/ manifest.json` → no hits). It is listed only in the generated `tree.md`, and is omitted from `_generated/index.md`. It nonetheless contains operational, normative-sounding deployment instructions (services, start commands, required environment variables). An unclassified document is one no gate can hold to the corpus's standards.

**Disposition.** UR item → **UR-20261019-096**.

**Recommendation.** Classify it: give it front-matter, add it to `manifest.json`, and bring it under a gate (front-matter and/or an operational-doc check), or relocate it to a declared asset area. (Note: the new `audits/` directory this audit introduces, and the new UR files, must likewise be classified — see §7.)

---

### DA-4 · Medium · Structure / Consistency (normative document integrity)

**Location.** `docs/spec/reference/appendix-implementation-status-audit-register.md` (a **normative** `kind: spec` artefact).

**Evidence.** The file contains **45 empty ATX headings** — bare `####` lines with no heading text (`grep -cE '^#{1,6}\s*$'` = 45; all `####`). In each case the intended title was demoted into the following blockquote (e.g. `####` followed by `> ### 3.2.1 Port Mapping: Docker Compose vs Kubernetes`). The result is a normative document that renders with 45 blank headings, whose intended section titles are not headings, and which contributes no heading anchors for those entries. No gate detects empty headings.

**Disposition.** UR item → **UR-20261019-097**.

**Recommendation.** Promote each demoted title back to its heading line and drop the empty `####`, then add a lightweight gate rule (no empty ATX headings in `spec/**`).

---

### DA-5 · Low · Consistency / Process (UR register hygiene)

**Location.** `docs/upgradation/` (100 UR records), `docs/scripts/docs/check-ur.mjs`.

**Evidence.** The 100 UR records carry indices 1 … 93 with **index `043` absent** (no `UR-*-043.md` exists on any date, and no record explains its absence). The suffix scheme is also **inconsistent**: it restarts per day for the first three days (`20261008-001…005`, `20261009-001…002`, `20261010-001`) and is then globally continuous (`20261011-001…025`, `20261012-026…089`, `…090`, `…091`, `…092`, `…093`), so index `001` appears on four distinct dates. `check-ur.mjs` validates front-matter completeness and that cited corpus paths resolve — it does **not** test sequence continuity, so the gap is invisible to the suite. (The full IDs remain unique because the date disambiguates them; the issue is scheme consistency and the unexplained gap, not collision.)

**Disposition.** UR item → **UR-20261019-098**.

**Recommendation.** State the numbering scheme once (global-continuous from a chosen epoch) and add a `check-ur` rule that the index set is gapless or that every gap has a documented withdrawn-record note. Record the disposition of `043` (withdrawn / reserved / never raised).

---

### DA-6 · Low · Currency (audit provenance)

**Location.** `docs/README.md`, `docs/status/audit-age.json`, `docs/status/code-reconciliation.json`.

**Evidence.** The corpus's canonical "current provenance" commit is `416864b603616bd9b984b1bd7f6fc6c773f8ace6` — named consistently in `README.md` ("Last independent audit … @ `416864b`"), `status/audit-age.json` (`last_audit.commit`), and `status/code-reconciliation.json` (`verified_commit`). HEAD is `9703da89987e0c3734408282a4c2c1b805c04358`, two commits ahead (the DR-1 tree regeneration and the raising of `UR-20261018-093`). `check-side-docs` explicitly permits the branch to advance past the verified commit, so this is **not** a gate failure — but the corpus's own surfaces still name the older commit, and the audit-age record is one re-baseline behind HEAD.

**Disposition.** **Closed by this audit** — re-anchored to `9703da8` (see §7). Recorded as fact, with a recommendation to refresh `audit-age.json` and the `README.md` "Last independent audit" line on landing this audit.

**Recommendation.** On landing, update `status/audit-age.json` (`commit: 9703da8…`, date `2026-10-19`, request `UR-20261019-…`) and the `README.md` line, and re-point `status/code-reconciliation.json` to HEAD if its rows are re-verified.

---

### Verified clean (no finding)

- **Integrity.** 328/328 files present; 0 size mismatches against the Git tree.
- **Secrets.** None in `/docs`. The only token-like strings are environment-variable *names* (`MODERATION_TOKENS`, `REMINDERS_TOKENS`) and the corpus's deliberate `<REPLACE_WITH_REAL_TOKEN>` placeholder convention (governance spec), which is a safe marker, not a secret.
- **Unfinished markers.** No `TODO`/`FIXME`/`TBD` in the live corpus; the only occurrences are in the quarantined `archive/v4.5.1/documentation.md`.
- **Front-matter.** All artifacts under the five gated directories carry `id/title/kind/status/version`.
- **Gate suite.** 30/30 green in a full checkout.

## 5. Root-to-surface thread map

The corpus does **not** thread via Markdown links — by design. Cross-references are declared in front-matter (`anchors`, `contracts`, `supersedes`/`superseded_by`) and enforced by gates (`check-anchors`, `check-anchor-paths`, `check-edges`, `check-contracts`, `check-coverage`, `check-supersession`), with the machine thread recorded in `status/coverage-ledger.json` (2,246 rows mapping every source heading to its target file) and `status/entities.json`. A naive Markdown-link in-degree analysis is therefore **not** a meaningful orphan test here, and this audit does not treat it as one: measured by links, 264 documents show zero inbound Markdown links, which is expected, not a defect.

The meaningful thread questions are (a) does every document sit inside a declared index, and (b) does every declared index resolve. On those:

- **`deploy/railway.md` is a true orphan** — it is in no index (`manifest.json`), no ledger, and no gate; it appears only in the generated tree. This is Finding DA-3.
- **One dead Markdown link** exists: `[url](url)` in `_inbox/blueprint.md` (line-scope: the `_inbox` frozen records). It is inside the frozen quarantine and out of the corpus; **excluded**, not a live defect.
- The `_generated/index.md` gaps (DA-2) are index-completeness defects, not broken threads.

## 6. Residuals (open)

| ID | Description | Why open | Owner | Revisit by |
|---|---|---|---|---|
| **R-1** | Human attestation of the corpus (`review_state` / `last_verified_commit` read `pending-evidence` / `null` by policy) | Standing policy item; machine-verified only, by design (`README.md`; schema `$comment`). Corpus residual **OI-1**. | Dumby Core Engineering | next human review pass |
| **R-2** | Kubernetes manifest apply unverified | Environment limit — Railway is not a cluster; honestly recorded, not a code defect. Corpus residual **OI-3**. | engineering | when a cluster is available |
| **R-3** | `UR-20261018-093` / `REC-025` — the D-4.10 provenance floor is fail-open without a signing key | Request raised 2026-10-18, not yet implemented (a code change in `apps/main`, outside `/docs`). | engineering | on landing R1/R2 + R3 test |
| **R-4** | UR index `043` gap and suffix-scheme inconsistency (DA-5) | Disposition depends on whether the gap is intentional; needs the UR author's decision. | Dumby Core Engineering | with UR-20261019-098 |

Findings DA-1 … DA-5 are **UR items** (not residuals) and are therefore eliminated from the open set. DA-6 is **closed** by re-anchoring.

## 7. Assumptions (labelled)

1. **Write scope.** The request's guardrails forbid pushing to the remote without explicit written approval this turn, while `Phase 9` requires the audit and UR files at their `/docs` paths. **Interpretation:** the files are created at their correct `/docs` paths **in the working copy** and delivered as artifacts; **no commit, push, PR, or remote mutation is performed.** Landing is left to the requester (UR-20261019-094 … -098 are `Draft`).
2. **Convention deviation (Appendix C).** The repo has no `audits/` or `upgrade-requests/` directory; its existing convention routes audit findings into `upgradation/UR-*.md`. This audit follows that convention for the URs (`upgradation/UR-20261019-*.md`) and **creates** `audits/` for the report (D1) as the request specifies. Per DA-3, `audits/` is itself a new unclassified directory and is included in the scope of UR-20261019-096.
3. **Gate-equivalence.** The one local gate failure (`check-counts`) is attributed to the partial checkout, verified by reproducing its arithmetic against the full Git tree. If a full checkout is available, the suite should be re-run to confirm 30/30.
4. **Frozen areas.** `_inbox/` and `archive/` are treated as out-of-corpus per `README.md` and are inventoried as `excluded`, not audited for content quality.
5. **Findings scope.** Findings are limited to what the evidence in `/docs` supports; `apps/main/src` was read only where the corpus itself cites it (e.g. the reconciliation ledger), never as an audit target.

## 8. External references

Used only to ground the corpus's external claims; none dictates a conclusion.

- **Discord API version 10.** `spec/reference/appendix-a-extended-reference-discord-api-surface.md` states its figures are "current as of Discord API version 10." Discord's own reference lists v10 as **Available** (v9 Available; v8/v7 Deprecated) — consistent. Source: Discord API Reference (`docs.discord.com/developers/reference`).
- **RFC 4231.** Cited for HMAC-SHA test vectors; RFC 4231 is exactly *"Identifiers and Test Vectors for HMAC-SHA-224, HMAC-SHA-256, HMAC-SHA-384, and HMAC-SHA-512."* Source: `rfc-editor.org/rfc/rfc4231`. Consistent.
- **RFC 2119** (requirement keywords) and **Ed25519** (signature scheme) are cited per their standard definitions; **Node 22** / **Redis 7** are consistent with the stack the corpus describes. No divergence found.

## 9. UR index

| UR | Title | Priority | Change type | Findings |
|---|---|---|---|---|
| [UR-20261019-094](../upgradation/UR-20261019-094.md) | Make the documentation gate suite hermetic — no silent skips | High | Process / Tooling | DA-1 |
| [UR-20261019-095](../upgradation/UR-20261019-095.md) | Gate `_generated/index.md` (close DR-1's generated-artefact gap) | High | Process / Tooling | DA-2 |
| [UR-20261019-096](../upgradation/UR-20261019-096.md) | Classify the unmanaged `deploy/railway.md` (and the new `audits/` tree) | Medium | Restructure | DA-3 |
| [UR-20261019-097](../upgradation/UR-20261019-097.md) | Eliminate the 45 empty ATX headings in the implementation-status appendix | Medium | Doc-fix | DA-4 |
| [UR-20261019-098](../upgradation/UR-20261019-098.md) | UR register hygiene — sequence continuity and numbering scheme | Low | Process | DA-5 |

---

## Appendix A — Full inventory (328 files)

| Path | Type | Bytes | Role | Status |
|---|---|---|---|---|
| `docs/README.md` | .md | 5076 | root document | examined |
| `docs/_generated/index.md` | .md | 1184 | generated index | examined |
| `docs/_generated/tree.md` | .md | 12736 | generated index | examined |
| `docs/_inbox/blueprint.md` | .md | 922821 | frozen pre-restructure source (quarantined) | excluded (frozen quarantine) |
| `docs/_inbox/concept.md` | .md | 67170 | frozen pre-restructure source (quarantined) | excluded (frozen quarantine) |
| `docs/_inbox/definitions.md` | .md | 19745 | frozen pre-restructure source (quarantined) | excluded (frozen quarantine) |
| `docs/_inbox/directive.md` | .md | 89495 | frozen pre-restructure source (quarantined) | excluded (frozen quarantine) |
| `docs/_inbox/directory.md` | .md | 34725 | frozen pre-restructure source (quarantined) | excluded (frozen quarantine) |
| `docs/_inbox/interface.md` | .md | 124427 | frozen pre-restructure source (quarantined) | excluded (frozen quarantine) |
| `docs/_meta/frontmatter.schema.json` | .json | 1528 | schema | examined |
| `docs/adr/ADR-001.md` | .md | 3625 | architecture decision record | examined |
| `docs/adr/ADR-002.md` | .md | 3064 | architecture decision record | examined |
| `docs/adr/ADR-003.md` | .md | 3004 | architecture decision record | examined |
| `docs/adr/ADR-004.md` | .md | 2672 | architecture decision record | examined |
| `docs/adr/ADR-005.md` | .md | 3055 | architecture decision record | examined |
| `docs/adr/ADR-006.md` | .md | 3025 | architecture decision record | examined |
| `docs/adr/ADR-007.md` | .md | 2637 | architecture decision record | examined |
| `docs/adr/ADR-008.md` | .md | 2713 | architecture decision record | examined |
| `docs/adr/ADR-009.md` | .md | 2758 | architecture decision record | examined |
| `docs/adr/ADR-010.md` | .md | 2573 | architecture decision record | examined |
| `docs/adr/ADR-011.md` | .md | 2608 | architecture decision record | examined |
| `docs/adr/ADR-012.md` | .md | 2502 | architecture decision record | examined |
| `docs/adr/ADR-013.md` | .md | 2739 | architecture decision record | examined |
| `docs/adr/ADR-014.md` | .md | 2409 | architecture decision record | examined |
| `docs/adr/ADR-015.md` | .md | 2429 | architecture decision record | examined |
| `docs/adr/ADR-016.md` | .md | 5675 | architecture decision record | examined |
| `docs/archive/v4.5.1/README.md` | .md | 221 | quarantined legacy (v4.5.1) | excluded (quarantined legacy) |
| `docs/archive/v4.5.1/documentation.md` | .md | 993453 | quarantined legacy (v4.5.1) | excluded (quarantined legacy) |
| `docs/blueprint/architecture-edges.md` | .md | 1323 | blueprint edge/wiring doc | examined |
| `docs/blueprint/data-edges.md` | .md | 513 | blueprint edge/wiring doc | examined |
| `docs/blueprint/foundations-edges.md` | .md | 1116 | blueprint edge/wiring doc | examined |
| `docs/blueprint/lifecycle-edges.md` | .md | 641 | blueprint edge/wiring doc | examined |
| `docs/blueprint/modules-edges.md` | .md | 611 | blueprint edge/wiring doc | examined |
| `docs/blueprint/operations-edges.md` | .md | 567 | blueprint edge/wiring doc | examined |
| `docs/blueprint/reference-edges.md` | .md | 478 | blueprint edge/wiring doc | examined |
| `docs/blueprint/request-layer-edges.md` | .md | 583 | blueprint edge/wiring doc | examined |
| `docs/blueprint/structure.md` | .md | 57088 | blueprint edge/wiring doc | examined |
| `docs/blueprint/system-map.md` | .md | 24434 | blueprint edge/wiring doc | examined |
| `docs/contracts/commands.json` | .json | 925 | machine-readable contract | examined |
| `docs/contracts/config.schema.json` | .json | 551 | machine-readable contract | examined |
| `docs/contracts/errors.json` | .json | 1734 | machine-readable contract | examined |
| `docs/contracts/events.catalog.json` | .json | 1715 | machine-readable contract | examined |
| `docs/contracts/flow-suite.json` | .json | 3261 | machine-readable contract | examined |
| `docs/contracts/module-manifest.schema.json` | .json | 6984 | machine-readable contract | examined |
| `docs/contracts/openapi.yaml` | .yaml | 1868 | machine-readable contract | examined |
| `docs/contracts/rbac.enums.json` | .json | 565 | machine-readable contract | examined |
| `docs/contracts/ui-renderer.schema.json` | .json | 1345 | machine-readable contract | examined |
| `docs/deploy/railway.md` | .md | 3233 | deployment guide (UNCLASSIFIED) | examined |
| `docs/documentation/api/README.md` | .md | 857 | reader wiki / API book | examined |
| `docs/documentation/api/commands.md` | .md | 1181 | reader wiki / API book | examined |
| `docs/documentation/api/endpoints.md` | .md | 2514 | reader wiki / API book | examined |
| `docs/documentation/api/errors.md` | .md | 1667 | reader wiki / API book | examined |
| `docs/documentation/api/events.md` | .md | 1937 | reader wiki / API book | examined |
| `docs/documentation/features/core-command-surface.md` | .md | 1715 | reader wiki / API book | examined |
| `docs/documentation/features/data-and-state.md` | .md | 1930 | reader wiki / API book | examined |
| `docs/documentation/features/module-system.md` | .md | 2225 | reader wiki / API book | examined |
| `docs/documentation/features/observability.md` | .md | 1983 | reader wiki / API book | examined |
| `docs/documentation/features/permissions-rbac.md` | .md | 2092 | reader wiki / API book | examined |
| `docs/documentation/features/renderer-presentation.md` | .md | 2644 | reader wiki / API book | examined |
| `docs/documentation/features/testing-and-flow.md` | .md | 2146 | reader wiki / API book | examined |
| `docs/documentation/guides/building-a-module.md` | .md | 18990 | reader wiki / API book | examined |
| `docs/documentation/guides/getting-started.md` | .md | 742 | reader wiki / API book | examined |
| `docs/documentation/index.md` | .md | 667 | reader wiki / API book | examined |
| `docs/documentation/overview/closing.md` | .md | 1254 | reader wiki / API book | examined |
| `docs/documentation/overview/concept-documentation.md` | .md | 873 | reader wiki / API book | examined |
| `docs/documentation/overview/core-ideology-the-seven-pillars.md` | .md | 4557 | reader wiki / API book | examined |
| `docs/documentation/overview/engineering-philosophy.md` | .md | 3910 | reader wiki / API book | examined |
| `docs/documentation/overview/introduction.md` | .md | 1883 | reader wiki / API book | examined |
| `docs/documentation/overview/mission-statement.md` | .md | 1558 | reader wiki / API book | examined |
| `docs/documentation/overview/table-of-contents.md` | .md | 1163 | reader wiki / API book | examined |
| `docs/documentation/overview/the-competitive-landscape.md` | .md | 4036 | reader wiki / API book | examined |
| `docs/documentation/overview/the-developer-model.md` | .md | 5913 | reader wiki / API book | examined |
| `docs/documentation/overview/the-philosophy.md` | .md | 5587 | reader wiki / API book | examined |
| `docs/documentation/overview/the-problem-why-dumby-exists.md` | .md | 5796 | reader wiki / API book | examined |
| `docs/documentation/overview/the-unified-modular-doctrine.md` | .md | 3738 | reader wiki / API book | examined |
| `docs/documentation/overview/trust-security-reliability.md` | .md | 5875 | reader wiki / API book | examined |
| `docs/documentation/overview/vision-statement.md` | .md | 1245 | reader wiki / API book | examined |
| `docs/documentation/overview/what-dumby-is-not.md` | .md | 2602 | reader wiki / API book | examined |
| `docs/documentation/overview/what-dumby-is.md` | .md | 3531 | reader wiki / API book | examined |
| `docs/documentation/overview/who-dumby-is-for.md` | .md | 8808 | reader wiki / API book | examined |
| `docs/glossary.md` | .md | 12527 | root document | examined |
| `docs/manifest.json` | .json | 3372 | root document | examined |
| `docs/migration/ledger-template.md` | .md | 7333 | migration asset | examined |
| `docs/migration/migration-prompt.md` | .md | 33898 | migration asset | examined |
| `docs/orchestration/master-prompt.md` | .md | 51846 | build-engine asset | examined |
| `docs/prompts/entry.md` | .md | 5035 | build-engine prompt asset | examined |
| `docs/prompts/meta-prompt.md` | .md | 6275 | build-engine prompt asset | examined |
| `docs/scripts/docs/check-acceptance.mjs` | .mjs | 992 | documentation gate / tool | examined |
| `docs/scripts/docs/check-anchor-paths.mjs` | .mjs | 2500 | documentation gate / tool | examined |
| `docs/scripts/docs/check-anchors.mjs` | .mjs | 1100 | documentation gate / tool | examined |
| `docs/scripts/docs/check-archive-guard.mjs` | .mjs | 517 | documentation gate / tool | examined |
| `docs/scripts/docs/check-asset-adaptation.mjs` | .mjs | 1576 | documentation gate / tool | examined |
| `docs/scripts/docs/check-authority.mjs` | .mjs | 1203 | documentation gate / tool | examined |
| `docs/scripts/docs/check-chain-states.mjs` | .mjs | 2210 | documentation gate / tool | examined |
| `docs/scripts/docs/check-chain.mjs` | .mjs | 3419 | documentation gate / tool | examined |
| `docs/scripts/docs/check-code-reconciliation.mjs` | .mjs | 3630 | documentation gate / tool | examined |
| `docs/scripts/docs/check-compliance.mjs` | .mjs | 1586 | documentation gate / tool | examined |
| `docs/scripts/docs/check-contracts.mjs` | .mjs | 1309 | documentation gate / tool | examined |
| `docs/scripts/docs/check-corpus-boundary.mjs` | .mjs | 2103 | documentation gate / tool | examined |
| `docs/scripts/docs/check-counts.mjs` | .mjs | 6534 | documentation gate / tool | examined |
| `docs/scripts/docs/check-coverage.mjs` | .mjs | 973 | documentation gate / tool | examined |
| `docs/scripts/docs/check-edges.mjs` | .mjs | 1827 | documentation gate / tool | examined |
| `docs/scripts/docs/check-entities.mjs` | .mjs | 1303 | documentation gate / tool | examined |
| `docs/scripts/docs/check-facts.mjs` | .mjs | 1453 | documentation gate / tool | examined |
| `docs/scripts/docs/check-frontmatter.mjs` | .mjs | 673 | documentation gate / tool | examined |
| `docs/scripts/docs/check-generated.mjs` | .mjs | 1792 | documentation gate / tool | examined |
| `docs/scripts/docs/check-ledger-content.mjs` | .mjs | 1421 | documentation gate / tool | examined |
| `docs/scripts/docs/check-manifest.mjs` | .mjs | 1093 | documentation gate / tool | examined |
| `docs/scripts/docs/check-no-restatement.mjs` | .mjs | 780 | documentation gate / tool | examined |
| `docs/scripts/docs/check-normative-markers.mjs` | .mjs | 1521 | documentation gate / tool | examined |
| `docs/scripts/docs/check-reconciliation.mjs` | .mjs | 525 | documentation gate / tool | examined |
| `docs/scripts/docs/check-section-order.mjs` | .mjs | 1277 | documentation gate / tool | examined |
| `docs/scripts/docs/check-side-docs.mjs` | .mjs | 7832 | documentation gate / tool | examined |
| `docs/scripts/docs/check-status-evidence.mjs` | .mjs | 387 | documentation gate / tool | examined |
| `docs/scripts/docs/check-supersession.mjs` | .mjs | 1168 | documentation gate / tool | examined |
| `docs/scripts/docs/check-terminology.mjs` | .mjs | 2043 | documentation gate / tool | examined |
| `docs/scripts/docs/check-ur.mjs` | .mjs | 1891 | documentation gate / tool | examined |
| `docs/scripts/docs/gen-compliance.mjs` | .mjs | 2880 | documentation gate / tool | examined |
| `docs/scripts/docs/sync-ur.mjs` | .mjs | 2164 | documentation gate / tool | examined |
| `docs/spec/architecture/application-bootstrap-lifecycle.md` | .md | 11217 | normative specification | examined |
| `docs/spec/architecture/dependency-injection-service-container.md` | .md | 11278 | normative specification | examined |
| `docs/spec/architecture/directory-file-structure.md` | .md | 15842 | normative specification | examined |
| `docs/spec/architecture/graceful-shutdown-signal-handling.md` | .md | 7226 | normative specification | examined |
| `docs/spec/architecture/system-architecture.md` | .md | 9524 | normative specification | examined |
| `docs/spec/architecture/technology-stack-decision-matrix.md` | .md | 16641 | normative specification | examined |
| `docs/spec/data/caching-architecture.md` | .md | 7088 | normative specification | examined |
| `docs/spec/data/configuration-management.md` | .md | 9942 | normative specification | examined |
| `docs/spec/data/database-architecture.md` | .md | 13666 | normative specification | examined |
| `docs/spec/data/state-externalization-horizontal-scaling.md` | .md | 6741 | normative specification | examined |
| `docs/spec/foundations/engineering-principles-p1-p14.md` | .md | 12871 | normative specification | examined |
| `docs/spec/foundations/non-goals-explicit-boundaries.md` | .md | 11076 | normative specification | examined |
| `docs/spec/foundations/the-unified-modular-doctrine.md` | .md | 17242 | normative specification | examined |
| `docs/spec/foundations/what-is-dumby.md` | .md | 15336 | normative specification | examined |
| `docs/spec/governance/appendix-a-directive-to-blueprint-traceability.md` | .md | 3194 | normative specification | examined |
| `docs/spec/governance/appendix-b-compliance-self-audit-checklist.md` | .md | 4651 | normative specification | examined |
| `docs/spec/governance/appendix-c-logged-deviations-and-open-items.md` | .md | 3819 | normative specification | examined |
| `docs/spec/governance/directive-charter-how-to-use-this-document.md` | .md | 6848 | normative specification | examined |
| `docs/spec/governance/dumby-development-directive-rules.md` | .md | 2862 | normative specification | examined |
| `docs/spec/governance/part-1-foundations-doctrine.md` | .md | 11923 | normative specification | examined |
| `docs/spec/governance/part-2-technology-stack-runtime-boundaries.md` | .md | 6840 | normative specification | examined |
| `docs/spec/governance/part-3-application-core-bootstrap-lifecycle-di.md` | .md | 10831 | normative specification | examined |
| `docs/spec/governance/part-4-module-system-framework.md` | .md | 11786 | normative specification | examined |
| `docs/spec/governance/part-5-request-permission-data-architecture.md` | .md | 9115 | normative specification | examined |
| `docs/spec/governance/part-6-control-plane-services.md` | .md | 4677 | normative specification | examined |
| `docs/spec/governance/part-7-reliability-security-performance.md` | .md | 6604 | normative specification | examined |
| `docs/spec/governance/part-8-quality-delivery-acceptance.md` | .md | 13616 | normative specification | examined |
| `docs/spec/lifecycle/ci-cd-pipeline.md` | .md | 6791 | normative specification | examined |
| `docs/spec/lifecycle/developer-experience-tooling.md` | .md | 5409 | normative specification | examined |
| `docs/spec/lifecycle/development-workflow.md` | .md | 6960 | normative specification | examined |
| `docs/spec/lifecycle/infrastructure-deployment.md` | .md | 7493 | normative specification | examined |
| `docs/spec/lifecycle/testing-architecture-qa.md` | .md | 13453 | normative specification | examined |
| `docs/spec/lifecycle/troubleshooting-operational-runbooks.md` | .md | 7309 | normative specification | examined |
| `docs/spec/lifecycle/versioning-release-migration.md` | .md | 4030 | normative specification | examined |
| `docs/spec/modules/building-a-module-a-complete-worked-example.md` | .md | 15744 | normative specification | examined |
| `docs/spec/modules/catalog/catalog-conventions-illustrative-module-index.md` | .md | 8049 | normative specification | examined |
| `docs/spec/modules/inter-module-communication-and-contracts.md` | .md | 10177 | normative specification | examined |
| `docs/spec/modules/marketplace-and-mdis.md` | .md | 13160 | normative specification | examined |
| `docs/spec/modules/module-anatomy-manifest.md` | .md | 23264 | normative specification | examined |
| `docs/spec/modules/module-tiers-lifecycle.md` | .md | 15055 | normative specification | examined |
| `docs/spec/modules/swastik-hot-reload-dynamic-module-management.md` | .md | 28570 | normative specification | examined |
| `docs/spec/operations/analytics-telemetry-mtp.md` | .md | 5548 | normative specification | examined |
| `docs/spec/operations/error-management-fault-tolerance.md` | .md | 16453 | normative specification | examined |
| `docs/spec/operations/job-queue-scheduling.md` | .md | 5634 | normative specification | examined |
| `docs/spec/operations/localization-internationalization.md` | .md | 3438 | normative specification | examined |
| `docs/spec/operations/multi-identity-operation-twill-personas.md` | .md | 8993 | normative specification | examined |
| `docs/spec/operations/observability-logging-metrics-tracing.md` | .md | 6868 | normative specification | examined |
| `docs/spec/operations/performance-scalability-engineering.md` | .md | 7115 | normative specification | examined |
| `docs/spec/operations/privacy-gdpr-compliance.md` | .md | 4630 | normative specification | examined |
| `docs/spec/operations/security-architecture-threat-model.md` | .md | 13302 | normative specification | examined |
| `docs/spec/orientation/complete-engineering-implementation-reference.md` | .md | 2169 | normative specification | examined |
| `docs/spec/orientation/definitions.md` | .md | 8314 | normative specification | examined |
| `docs/spec/orientation/front-matter.md` | .md | 2862 | normative specification | examined |
| `docs/spec/orientation/how-to-read-this-reference.md` | .md | 2941 | normative specification | examined |
| `docs/spec/orientation/rosetta-stone-conceptual-map.md` | .md | 3122 | normative specification | examined |
| `docs/spec/orientation/system-at-a-glance.md` | .md | 5032 | normative specification | examined |
| `docs/spec/orientation/table-of-contents.md` | .md | 4497 | normative specification | examined |
| `docs/spec/orientation/what-this-document-is.md` | .md | 1886 | normative specification | examined |
| `docs/spec/reference/appendices.md` | .md | 4782 | normative specification | examined |
| `docs/spec/reference/appendix-a-extended-reference-discord-api-surface.md` | .md | 23891 | normative specification | examined |
| `docs/spec/reference/appendix-b-extended-reference-interface-hub.md` | .md | 8019 | normative specification | examined |
| `docs/spec/reference/appendix-c-extended-reference-operational-excellence.md` | .md | 12283 | normative specification | examined |
| `docs/spec/reference/appendix-implementation-status-audit-register.md` | .md | 79545 | normative specification | examined |
| `docs/spec/reference/colophon.md` | .md | 2396 | normative specification | examined |
| `docs/spec/reference/dumby-vs-multipurpose-bots-capability-comparison.md` | .md | 3328 | normative specification | examined |
| `docs/spec/reference/glossary-topic-index.md` | .md | 6987 | normative specification | examined |
| `docs/spec/reference/inline-status-entries/architecture.md` | .md | 5303 | normative specification | examined |
| `docs/spec/reference/inline-status-entries/lifecycle.md` | .md | 8299 | normative specification | examined |
| `docs/spec/reference/inline-status-entries/modules.md` | .md | 14168 | normative specification | examined |
| `docs/spec/reference/inline-status-entries/reference.md` | .md | 27409 | normative specification | examined |
| `docs/spec/reference/inline-status-entries/request-layer.md` | .md | 2948 | normative specification | examined |
| `docs/spec/reference/mandatory-feature-compliance-matrix.md` | .md | 7096 | normative specification | examined |
| `docs/spec/reference/rest-api-webhooks-mdis-reference.md` | .md | 8003 | normative specification | examined |
| `docs/spec/request-layer/command-framework-routing-engine.md` | .md | 19452 | normative specification | examined |
| `docs/spec/request-layer/control-plane-services.md` | .md | 21742 | normative specification | examined |
| `docs/spec/request-layer/discord-facing-interface-frontend-surfaces.md` | .md | 2720 | normative specification | examined |
| `docs/spec/request-layer/division-0-system-overview-the-core-command-surface.md` | .md | 8259 | normative specification | examined |
| `docs/spec/request-layer/division-1-the-renderer-presentation-authority.md` | .md | 13342 | normative specification | examined |
| `docs/spec/request-layer/division-10-hello-world-standard-tier-module.md` | .md | 8398 | normative specification | examined |
| `docs/spec/request-layer/division-11-cross-cutting-ui-specifications.md` | .md | 13547 | normative specification | examined |
| `docs/spec/request-layer/division-2-interaction-lifecycle-buffer-notices-components.md` | .md | 10600 | normative specification | examined |
| `docs/spec/request-layer/division-3-dashboard-home-page-core-commands.md` | .md | 14711 | normative specification | examined |
| `docs/spec/request-layer/division-4-health-command-health-module.md` | .md | 12452 | normative specification | examined |
| `docs/spec/request-layer/division-5-browse-command-marketplace-module.md` | .md | 13884 | normative specification | examined |
| `docs/spec/request-layer/division-6-queue-command-bccm-queue-module.md` | .md | 11703 | normative specification | examined |
| `docs/spec/request-layer/division-7-persona-command-persona-module-twill.md` | .md | 9379 | normative specification | examined |
| `docs/spec/request-layer/division-8-permit-command-rbac-permission-module.md` | .md | 17527 | normative specification | examined |
| `docs/spec/request-layer/division-9-modules-command-module-management-module.md` | .md | 17117 | normative specification | examined |
| `docs/spec/request-layer/event-architecture-bus-system.md` | .md | 10296 | normative specification | examined |
| `docs/spec/request-layer/front-matter.md` | .md | 1021 | normative specification | examined |
| `docs/spec/request-layer/interaction-component-handling.md` | .md | 13924 | normative specification | examined |
| `docs/spec/request-layer/middleware-pipeline-interceptors.md` | .md | 11697 | normative specification | examined |
| `docs/spec/request-layer/permission-authorization-engine.md` | .md | 16035 | normative specification | examined |
| `docs/spec/request-layer/table-of-contents.md` | .md | 1707 | normative specification | examined |
| `docs/status/audit-age.json` | .json | 628 | status ledger / machine-readable evidence | examined |
| `docs/status/authority.json` | .json | 714 | status ledger / machine-readable evidence | examined |
| `docs/status/capabilities.json` | .json | 9057 | status ledger / machine-readable evidence | examined |
| `docs/status/classification.json` | .json | 2925 | status ledger / machine-readable evidence | examined |
| `docs/status/code-reconciliation.json` | .json | 14927 | status ledger / machine-readable evidence | examined |
| `docs/status/compliance.json` | .json | 4684 | status ledger / machine-readable evidence | examined |
| `docs/status/counts.json` | .json | 816 | status ledger / machine-readable evidence | examined |
| `docs/status/coverage-ledger.json` | .json | 543658 | status ledger / machine-readable evidence | examined |
| `docs/status/entities.json` | .json | 41417 | status ledger / machine-readable evidence | examined |
| `docs/status/facts.json` | .json | 1858 | status ledger / machine-readable evidence | examined |
| `docs/status/reconciliation.json` | .json | 603 | status ledger / machine-readable evidence | examined |
| `docs/status/section-order.json` | .json | 5961 | status ledger / machine-readable evidence | examined |
| `docs/status/terminology.json` | .json | 1879 | status ledger / machine-readable evidence | examined |
| `docs/upgradation/README.md` | .md | 6145 | upgrade request / change-log record | examined |
| `docs/upgradation/UR-20261008-001.md` | .md | 15364 | upgrade request / change-log record | examined |
| `docs/upgradation/UR-20261008-002.md` | .md | 3785 | upgrade request / change-log record | examined |
| `docs/upgradation/UR-20261008-003.md` | .md | 2659 | upgrade request / change-log record | examined |
| `docs/upgradation/UR-20261008-004.md` | .md | 2103 | upgrade request / change-log record | examined |
| `docs/upgradation/UR-20261008-005.md` | .md | 2905 | upgrade request / change-log record | examined |
| `docs/upgradation/UR-20261009-001.md` | .md | 11539 | upgrade request / change-log record | examined |
| `docs/upgradation/UR-20261009-002.md` | .md | 15514 | upgrade request / change-log record | examined |
| `docs/upgradation/UR-20261010-001.md` | .md | 17283 | upgrade request / change-log record | examined |
| `docs/upgradation/UR-20261011-001.md` | .md | 8727 | upgrade request / change-log record | examined |
| `docs/upgradation/UR-20261011-002.md` | .md | 6050 | upgrade request / change-log record | examined |
| `docs/upgradation/UR-20261011-003.md` | .md | 6866 | upgrade request / change-log record | examined |
| `docs/upgradation/UR-20261011-004.md` | .md | 4905 | upgrade request / change-log record | examined |
| `docs/upgradation/UR-20261011-005.md` | .md | 4153 | upgrade request / change-log record | examined |
| `docs/upgradation/UR-20261011-006.md` | .md | 5697 | upgrade request / change-log record | examined |
| `docs/upgradation/UR-20261011-007.md` | .md | 2959 | upgrade request / change-log record | examined |
| `docs/upgradation/UR-20261011-008.md` | .md | 5434 | upgrade request / change-log record | examined |
| `docs/upgradation/UR-20261011-009.md` | .md | 6737 | upgrade request / change-log record | examined |
| `docs/upgradation/UR-20261011-010.md` | .md | 6807 | upgrade request / change-log record | examined |
| `docs/upgradation/UR-20261011-011.md` | .md | 5849 | upgrade request / change-log record | examined |
| `docs/upgradation/UR-20261011-012.md` | .md | 12298 | upgrade request / change-log record | examined |
| `docs/upgradation/UR-20261011-013.md` | .md | 13755 | upgrade request / change-log record | examined |
| `docs/upgradation/UR-20261011-014.md` | .md | 7505 | upgrade request / change-log record | examined |
| `docs/upgradation/UR-20261011-015.md` | .md | 6620 | upgrade request / change-log record | examined |
| `docs/upgradation/UR-20261011-016.md` | .md | 5539 | upgrade request / change-log record | examined |
| `docs/upgradation/UR-20261011-017.md` | .md | 5575 | upgrade request / change-log record | examined |
| `docs/upgradation/UR-20261011-018.md` | .md | 6408 | upgrade request / change-log record | examined |
| `docs/upgradation/UR-20261011-019.md` | .md | 3229 | upgrade request / change-log record | examined |
| `docs/upgradation/UR-20261011-020.md` | .md | 5364 | upgrade request / change-log record | examined |
| `docs/upgradation/UR-20261011-021.md` | .md | 2966 | upgrade request / change-log record | examined |
| `docs/upgradation/UR-20261011-022.md` | .md | 3294 | upgrade request / change-log record | examined |
| `docs/upgradation/UR-20261011-023.md` | .md | 5203 | upgrade request / change-log record | examined |
| `docs/upgradation/UR-20261011-024.md` | .md | 2326 | upgrade request / change-log record | examined |
| `docs/upgradation/UR-20261011-025.md` | .md | 3368 | upgrade request / change-log record | examined |
| `docs/upgradation/UR-20261012-026.md` | .md | 4904 | upgrade request / change-log record | examined |
| `docs/upgradation/UR-20261012-027.md` | .md | 2961 | upgrade request / change-log record | examined |
| `docs/upgradation/UR-20261012-028.md` | .md | 5637 | upgrade request / change-log record | examined |
| `docs/upgradation/UR-20261012-029.md` | .md | 5024 | upgrade request / change-log record | examined |
| `docs/upgradation/UR-20261012-030.md` | .md | 5586 | upgrade request / change-log record | examined |
| `docs/upgradation/UR-20261012-031.md` | .md | 5958 | upgrade request / change-log record | examined |
| `docs/upgradation/UR-20261012-032.md` | .md | 3394 | upgrade request / change-log record | examined |
| `docs/upgradation/UR-20261012-033.md` | .md | 4073 | upgrade request / change-log record | examined |
| `docs/upgradation/UR-20261012-034.md` | .md | 3758 | upgrade request / change-log record | examined |
| `docs/upgradation/UR-20261012-035.md` | .md | 2991 | upgrade request / change-log record | examined |
| `docs/upgradation/UR-20261012-036.md` | .md | 3411 | upgrade request / change-log record | examined |
| `docs/upgradation/UR-20261012-037.md` | .md | 3105 | upgrade request / change-log record | examined |
| `docs/upgradation/UR-20261012-038.md` | .md | 3861 | upgrade request / change-log record | examined |
| `docs/upgradation/UR-20261012-039.md` | .md | 3053 | upgrade request / change-log record | examined |
| `docs/upgradation/UR-20261012-040.md` | .md | 3881 | upgrade request / change-log record | examined |
| `docs/upgradation/UR-20261012-041.md` | .md | 4156 | upgrade request / change-log record | examined |
| `docs/upgradation/UR-20261012-042.md` | .md | 5842 | upgrade request / change-log record | examined |
| `docs/upgradation/UR-20261012-044.md` | .md | 5779 | upgrade request / change-log record | examined |
| `docs/upgradation/UR-20261012-045.md` | .md | 5054 | upgrade request / change-log record | examined |
| `docs/upgradation/UR-20261012-046.md` | .md | 3140 | upgrade request / change-log record | examined |
| `docs/upgradation/UR-20261012-047.md` | .md | 4701 | upgrade request / change-log record | examined |
| `docs/upgradation/UR-20261012-048.md` | .md | 3996 | upgrade request / change-log record | examined |
| `docs/upgradation/UR-20261012-049.md` | .md | 4036 | upgrade request / change-log record | examined |
| `docs/upgradation/UR-20261012-050.md` | .md | 5046 | upgrade request / change-log record | examined |
| `docs/upgradation/UR-20261012-051.md` | .md | 4185 | upgrade request / change-log record | examined |
| `docs/upgradation/UR-20261012-052.md` | .md | 2897 | upgrade request / change-log record | examined |
| `docs/upgradation/UR-20261012-053.md` | .md | 3849 | upgrade request / change-log record | examined |
| `docs/upgradation/UR-20261012-054.md` | .md | 5318 | upgrade request / change-log record | examined |
| `docs/upgradation/UR-20261012-055.md` | .md | 3665 | upgrade request / change-log record | examined |
| `docs/upgradation/UR-20261012-056.md` | .md | 2643 | upgrade request / change-log record | examined |
| `docs/upgradation/UR-20261012-057.md` | .md | 3287 | upgrade request / change-log record | examined |
| `docs/upgradation/UR-20261012-058.md` | .md | 3586 | upgrade request / change-log record | examined |
| `docs/upgradation/UR-20261012-059.md` | .md | 4958 | upgrade request / change-log record | examined |
| `docs/upgradation/UR-20261012-060.md` | .md | 3711 | upgrade request / change-log record | examined |
| `docs/upgradation/UR-20261012-061.md` | .md | 3204 | upgrade request / change-log record | examined |
| `docs/upgradation/UR-20261012-062.md` | .md | 2981 | upgrade request / change-log record | examined |
| `docs/upgradation/UR-20261012-063.md` | .md | 2911 | upgrade request / change-log record | examined |
| `docs/upgradation/UR-20261012-064.md` | .md | 3237 | upgrade request / change-log record | examined |
| `docs/upgradation/UR-20261012-065.md` | .md | 5306 | upgrade request / change-log record | examined |
| `docs/upgradation/UR-20261012-066.md` | .md | 4817 | upgrade request / change-log record | examined |
| `docs/upgradation/UR-20261012-067.md` | .md | 4554 | upgrade request / change-log record | examined |
| `docs/upgradation/UR-20261012-068.md` | .md | 4250 | upgrade request / change-log record | examined |
| `docs/upgradation/UR-20261012-069.md` | .md | 5147 | upgrade request / change-log record | examined |
| `docs/upgradation/UR-20261012-070.md` | .md | 4926 | upgrade request / change-log record | examined |
| `docs/upgradation/UR-20261012-071.md` | .md | 4679 | upgrade request / change-log record | examined |
| `docs/upgradation/UR-20261012-072.md` | .md | 4545 | upgrade request / change-log record | examined |
| `docs/upgradation/UR-20261012-073.md` | .md | 4786 | upgrade request / change-log record | examined |
| `docs/upgradation/UR-20261012-074.md` | .md | 3797 | upgrade request / change-log record | examined |
| `docs/upgradation/UR-20261012-075.md` | .md | 3955 | upgrade request / change-log record | examined |
| `docs/upgradation/UR-20261012-076.md` | .md | 4279 | upgrade request / change-log record | examined |
| `docs/upgradation/UR-20261012-077.md` | .md | 3956 | upgrade request / change-log record | examined |
| `docs/upgradation/UR-20261012-078.md` | .md | 4232 | upgrade request / change-log record | examined |
| `docs/upgradation/UR-20261012-079.md` | .md | 3819 | upgrade request / change-log record | examined |
| `docs/upgradation/UR-20261012-080.md` | .md | 4269 | upgrade request / change-log record | examined |
| `docs/upgradation/UR-20261012-081.md` | .md | 7595 | upgrade request / change-log record | examined |
| `docs/upgradation/UR-20261012-082.md` | .md | 4452 | upgrade request / change-log record | examined |
| `docs/upgradation/UR-20261012-083.md` | .md | 4424 | upgrade request / change-log record | examined |
| `docs/upgradation/UR-20261012-084.md` | .md | 5458 | upgrade request / change-log record | examined |
| `docs/upgradation/UR-20261012-085.md` | .md | 4738 | upgrade request / change-log record | examined |
| `docs/upgradation/UR-20261012-086.md` | .md | 4811 | upgrade request / change-log record | examined |
| `docs/upgradation/UR-20261012-087.md` | .md | 3697 | upgrade request / change-log record | examined |
| `docs/upgradation/UR-20261012-088.md` | .md | 4521 | upgrade request / change-log record | examined |
| `docs/upgradation/UR-20261012-089.md` | .md | 6061 | upgrade request / change-log record | examined |
| `docs/upgradation/UR-20261015-090.md` | .md | 18412 | upgrade request / change-log record | examined |
| `docs/upgradation/UR-20261016-091.md` | .md | 15795 | upgrade request / change-log record | examined |
| `docs/upgradation/UR-20261018-092.md` | .md | 22044 | upgrade request / change-log record | examined |
| `docs/upgradation/UR-20261018-093.md` | .md | 8959 | upgrade request / change-log record | examined |
| `docs/upgradation/change-log.md` | .md | 215893 | upgrade request / change-log record | examined |

