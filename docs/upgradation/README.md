---
id: UR-REGISTER
title: Frozen Request Records
kind: ur
status: normative
version: 1.0
---

# docs/ur/ — Frozen Program Request Records

This directory is the register of the authoritative request records of the Dumby v5.0.0
program. Each entry below identifies a record, its version, and its freeze status, and
summarizes its scope as the record itself describes it. The content of the registered
records is frozen and authoritative for the requests they define; the documents
themselves are archived with the program records, not copied here. This register is a
finding aid and a provenance anchor, not a substitute for the records.

---

## UR-20260918-001 — Dumby Documentation Re-Baseline to v5.0 — Consolidated Program (121 Requests)

**Identity:** UR-20260918-001 · **Version:** 1.0 (Template v1.0, filled instance) ·
**Date:** 18/09/2026 · **Requester:** Dumby Core Engineering — Quixotic Mnemonics

**Freeze status:** Executed by the v5.0.0 re-baseline; recorded in change-log.md.

**Scope.** The consolidated upgradation request governing this re-baseline. It absorbs all
121 verified requests from the three source programs — 31 program URs, 88
implementation-flaw corrections, and 2 RBAC requirements — into one cross-documentation
change directive over the twelve-document corpus, carrying a 12-document impact matrix,
the ADRs (ADR-001 … ADR-015) that record the program's cross-cutting tensions, and a phased rollout in
which documentation gates are release gates. Its scope rule is strict: every change must
be traceable to a source request ID, and anything not traceable — including the 52
deferred greenfield items — is out of scope. Related records: the three source programs
registered below.

## 5.0-UR-1 — Dumby_Upgradation_Request_v5.md

**Identity:** Dumby_Upgradation_Request_v5.md · **Version:** 5.0-UR-1 · **Date:**
18/09/2026

**Freeze status:** Frozen.

**Scope.** The v5.0 upgrade program source record. It defines the upgrade program as 31
URs organized across 7 workstreams, identifies the 11 cross-cutting tensions this
re-baseline records as ADRs, defines the phased rollout and the program's acceptance
definition, and carries a glossary of 18 new program terms. It is the authoritative record
of the program requests, their tensions, and their acceptance criteria; the re-baseline
preserves its intent verbatim through the normalized program URs.

## @ be39a52 — Dumby-Suite_Upgrade_Request.md

**Identity:** Dumby-Suite_Upgrade_Request.md · **Version:** verified at commit
`be39a52` of the Dumby-Suite repository · **Date:** 18/09/2026

**Freeze status:** Frozen.

**Scope.** The implementation-flaw correction source record: 88 requests in Groups A/B/C,
severity-graded 17 Critical / 31 High / 40 Medium, produced by a three-pass evidence
chain (specification extraction, full codebase flaw audit, independent re-verification
with 0 of 235 withdrawals and 35 false negatives surfaced, consolidating 270 verified
findings). It also records the reasoned greenfield exclusions — 52 deferred items with
no code to document — which are out of scope and must not be smuggled into correction
requests. **Standing constraint:** its line-number references were verified at commit
`be39a52` and must be re-verified against working HEAD before any cited file/line is
treated as current.

## 1.0 — RBAC_Flaws_and_Requirements.md

**Identity:** RBAC_Flaws_and_Requirements.md · **Version:** 1.0 · **Date:** 18/09/2026

**Freeze status:** Frozen.

**Scope.** The RBAC source record: 21 documented flaws of the current RBAC implementation,
plus the two upgradation requirements it carries — R1, Layer 6 as a pure-backend ranks
function (six ranks, evaluated never written, from live Discord state), and R2, Layer 7
guild-side grants (scopes role > group > set, most-specific wins, module commands only,
with a hard non-configurable override boundary). One open question it leaves unsettled is
carried as a documented open question in blueprint.md §21: guild vs module-author
sovereignty over a command's Discord-bit gate.

---

**Closing note.** The three source records (5.0-UR-1, the Suite request @ `be39a52`, and
the RBAC requirements) must not be modified. Changes to the program are new request
records raised under their own IDs — never edits to frozen ones.

> **Frozen-inbox quarantine.** The retired `docs/ur/` path persists only inside the frozen
> `_inbox/` records; it must never be quoted forward into the live corpus. The live request
> directory is `upgradation/`.

---

## UR detection (dynamic)

> **Note on `counts.ur_requests`.** `status/counts.json` records 121 UR requests (31 program URs,
> 88 implementation-flaw corrections, 2 RBAC requirements) and `status/reconciliation.json` anchors
> three UR rows. Those figures describe the **source program**, not files in this tree: the source
> request records are archived with the program and are represented here only by the frozen records
> listed above. This register is therefore **provenance-only** — it is not the live list of records;
> the live records are the `upgradation/UR-*.md` files themselves. **Live vs source-program:** the live count is read from `scripts/docs/check-ur.mjs` (it is 98 at 2026-10-16); `counts.ur_requests` (121) is the frozen source-program total and is never the live count.

UR records are discovered at run time by `scripts/docs/check-ur.mjs`: any `upgradation/UR-*.md`
is detected and validated automatically (front-matter complete, `kind: ur`, every cited corpus
path resolving) — there is no registry to update, so the record file itself is the only *content* change (the generated `_generated/tree.md` and the single-sourced tree counts in `status/counts.json` refresh with it, as with any file addition). **The count is not restated here** — read it from the probe
(`node scripts/docs/check-ur.mjs`). URs are provenance and are deliberately **excluded** from `status/coverage-ledger.json`
and `status/entities.json`. To opt a UR's headings into the coverage ledger, run
`node scripts/docs/sync-ur.mjs` (and `node scripts/docs/sync-ur.mjs --clear` to revert).
