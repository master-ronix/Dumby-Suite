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
present in its target (`status/coverage-ledger.json`, 2,246 rows). Run all gates with:

```
for g in scripts/docs/check-*.mjs; do node "$g"; done
```

Gates: manifest · coverage · **ledger-content** · frontmatter · contracts · counts ·
no-restatement · archive-guard · status-evidence · anchors · anchor-paths · acceptance ·
reconciliation · code-reconciliation · **entities** · **terminology** · **authority** ·
**facts** · **normative-markers** · **chain** · **chain-states**.

**Verification status.** These gates are structural: they prove the corpus is internally
consistent and single-sourced, not that a human has reviewed every section. Per-file
`review_state` and `last_verified_commit` record human verification and currently read
`pending-evidence` / `null` throughout — treat the corpus as machine-verified, human-review
pending.

Where the specification and the running code diverge, the divergence is recorded in
`status/code-reconciliation.json` — never smoothed over.
