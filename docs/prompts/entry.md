---
id: ENGINE-ENTRY
title: Entry Decision Procedure
kind: engine
status: engine
version: 5.0.0
---

# Entry (single deterministic procedure)

<!-- structure-adapted: references point at the restructured corpus -->
> **Corpus layout (restructured).** The two centralised documents are now `blueprint/` (the
> *wiring* — how everything connects, coordinates, stays compatible, and flows from root to the
> end-user surface, for every role) and `documentation/` (the *wiki / API book*). The behavioural
> specification is distributed by department under `spec/<department>/` (governance, orientation,
> foundations, architecture, modules, request-layer, data, operations, lifecycle, reference). The
> old single files map as: the blueprint → `spec/<dept>/` (wiring in `blueprint/`); the directive
> → `spec/governance/`; the interface spec → `spec/request-layer/`; the directory reference →
> `spec/architecture/directory-file-structure.md`; the concept doc → `documentation/overview/`;
> the change log → `upgradation/change-log.md`; the definitions index →
> `spec/orientation/definitions.md`; `adr/` stays `adr/`; the request records → `upgradation/`;
> the legacy record → `archive/v4.5.1/documentation.md`. Machine layer: `manifest.json`,
> `contracts/`, `status/`. Entry: `prompts/entry.md`.


**Resolve the docs base path ONCE** (default `docs/`) — never assume `docs/`.

1. Read `manifest.json`. Treat only `status: normative` artifacts as authority. Never read `archive/**` as current.
2. Detect the state of `apps/main/`:
   - empty/missing -> **Greenfield** -> run `orchestration/master-prompt.md`.
   - contains code   -> **Existing**   -> run `migration/migration-prompt.md`.
3. Load ONLY the department spec(s) for the task + their `contracts/` — not the whole corpus.
4. Obey `status/capabilities.json`: do not build `deferred` items; do not re-implement `implemented` ones.
5. Reference behaviour by `SPEC-…` ID and interfaces by `contracts/` path — never re-derive from prose.
6. A change is complete only when its `acceptance` block's test passes.
