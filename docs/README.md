# Dumby Documentation System

The restructured, hand-authored documentation corpus for **Dumby — the Discord Unified
Modular Bot System** (repo `master-ronix/Dumby-Suite`). Lossless, code-grounded, and
gate-verified.

## Three trees, one system

- **`blueprint/`** — the **wiring**: how the parts connect, coordinate, stay compatible, and
  flow from the root to the end-user surface, seen from every role. Start here to understand
  how Dumby holds together as one machine.
- **`documentation/`** — the **nodes**: the wiki and the API book — what each part *is*.
- **`spec/`** — the **behavioural source**: what each mechanism *must do*, by department.

Supporting: `contracts/` (machine-readable interfaces) · `status/` (ledgers) · `adr/`
(decision records) · `archive/v4.5.1/` (quarantined legacy) · `_inbox/` (the frozen
pre-restructure source records the corpus was derived from) · `orchestration/ migration/
upgradation/ prompts/` (build & migration assets) · `_generated/` (generated index).

**Boundary.** `apps/main/docs/` (adr · api · architecture · compliance · privacy · runbooks ·
security) is an application-local, **non-normative** set. It is **outside this corpus and its
gates**; nothing there is an authority. The single normative ADR series is `adr/` (ADR-001 …
ADR-016). `check-corpus-boundary` guards this boundary; `apps/main/docs/` carries no corpus
front-matter and makes no normative claim.

## Reading paths

- **Human:** `blueprint/system-map.md` (how it fits) → `documentation/` (what it is) → the
  relevant `spec/<dept>/`.
- **Agent / build engine:** `manifest.json` → `prompts/meta-prompt.md` → `prompts/entry.md`
  (a single deterministic **tri-state** procedure — build / migrate / enforce) → only the
  `spec/<dept>/` + `contracts/` you need.
- **Module author:** `documentation/guides/building-a-module.md` → `spec/modules/`.
- **Operator:** `documentation/features/core-command-surface.md` → `spec/lifecycle/`.

## Verification

Every source heading is mapped to a target file, and a gate verifies each heading is actually
present in its target (`status/coverage-ledger.json`, 2,246 rows). Run all 30 gates from `docs/`:

```
cd docs
for g in scripts/docs/check-*.mjs; do node "$g"; done
```

CI runs the same loop: `.github/workflows/docs-gates.yml` at the **repository root** executes
every gate on any change under `docs/` (a `.github/` nested under `docs/` would be inert).

Gates (30): manifest · coverage · **ledger-content** · frontmatter · contracts · **compliance** · counts · no-restatement · archive-guard · **asset-adaptation** · status-evidence · anchors · anchor-paths · **edges** · acceptance · reconciliation · code-reconciliation · **entities** · **terminology** · **authority** · **facts** · **normative-markers** · **chain** · **chain-states** · **corpus-boundary** · **side-docs** · **ur** · **generated** · **section-order** · **supersession**.

**Verification status (policy).** These gates are structural: they prove the corpus is internally
consistent and single-sourced, not that a human has reviewed every section, and they do **not** run
the application `tsc` / `vitest` (the app typecheck is a separate gate). Per-file
`review_state` and `last_verified_commit` are **reserved for human attestation** and read
`pending-evidence` / `null` throughout by policy — the corpus is **machine-verified only**; a
`null` verifying commit is the honest default, never evidence of a review that did not happen.
(Attestation is tracked by `UR-20261008-001` and `UR-20261010-001`.)

**Version model.** One project, several version lines, each with a defined meaning:
`corpus_version` (the corpus edition, `manifest.json`) · the **engine** version (`5.2.0` —
`prompts/`, `orchestration/`, `migration/`) · the **spec** version (`5.0.0` — `spec/**`,
`blueprint/`, `contracts/`) · the **change-log** version (the highest released track in
`upgradation/change-log.md`). A bare `5.x.y` in prose names the change-log track unless a
document says otherwise.

**Last independent audit.** 2026-10-21, against `feature/dev` @ `9ea2dc4` — a full-scope corpus
audit + code-track reconciliation whose findings (DOC-1 … DOC-11) are formalised as
`upgradation/UR-20261021-094.md`; the prior audit's findings (DR-1 … DR-12,
`upgradation/UR-20261018-092.md`) and (AU-1 … AU-11, `upgradation/UR-20261016-091.md`) are closed
under it. The audit's date, commit, scope and request are also recorded machine-readably in
`status/audit-age.json`. The audit's date and commit are recorded here so audit staleness is visible the same way
provenance staleness is.

**Branch model.** `feature/dev` is the **development** branch and `main` is the **deployment**
branch; both are live on their hosts. Every change lands on `feature/dev` first and is promoted to
`main`. The provenance strings in this corpus name `feature/dev` as the branch a claim was verified
against — the branch on which development lands.

Where the specification and the running code diverge, the divergence is recorded in
`status/code-reconciliation.json` — never smoothed over.
