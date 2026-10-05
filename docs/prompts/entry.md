---
id: ENGINE-ENTRY
title: Entry Decision Procedure
kind: engine
status: engine
version: 5.1.0
chain_role: detect
preceded_by: prompts/meta-prompt.md
handoff_to: orchestration/master-prompt.md | migration/migration-prompt.md
change_log: upgradation/change-log.md
---

# Entry — Entry Decision Procedure

## 1. Identity

- **Chain role:** *detect* — the single deterministic state-detection procedure of the trigger chain.
- **Preceded by:** `prompts/meta-prompt.md`, which calls this procedure at step 3.
- **Hands off to:** the caller — `prompts/meta-prompt.md` uses the result to hand off to `orchestration/master-prompt.md` (State A) or `migration/migration-prompt.md` (State B).
- **Authority:** it reads the authority layer; it does not decide authority.

## 2. Purpose

Give the chain one deterministic, unambiguous way to (a) resolve the docs base path, (b) load the authority layer, and (c) classify the state of `apps/main/` as Greenfield or Existing — so the handoff in `prompts/meta-prompt.md` is mechanical, not a judgment call.

## 3. Preconditions

- `docs/manifest.json` and `docs/status/capabilities.json` are readable.
- `apps/main/` is inspectable.

## 4. Inputs

| Input | Path | Use |
|-------|------|-----|
| Corpus manifest | `manifest.json` | the normative artifact set |
| Capability ledger | `status/capabilities.json` | build / defer decisions |
| State probe | `apps/main/` | greenfield vs existing |
| Authority order | `spec/governance/directive-charter-how-to-use-this-document.md` | conflict resolution |

## 5. Ordered Steps

1. **Resolve the docs base path ONCE** (default `docs/`) — never assume `docs/`.
2. Read `manifest.json`. Treat only `status: normative` artifacts as authority. Never read `archive/**` as current.
3. Detect the state of `apps/main/`:
   - empty/missing → **Greenfield** → the caller runs `orchestration/master-prompt.md`.
   - contains code → **Existing** → the caller runs `migration/migration-prompt.md`.
4. Load ONLY the department spec(s) for the task plus their `contracts/` — not the whole corpus.
5. Obey `status/capabilities.json`: do not build `deferred` items; do not re-implement `implemented` ones.
6. Reference behaviour by `SPEC-…` id and interfaces by `contracts/` path — never re-derive from prose.
7. A change is complete only when its `acceptance` block's test passes.

## 6. Artefacts Produced

| Artefact | Path | When |
|----------|------|------|
| State determination (Greenfield / Existing) | in-run | step 3 |

## 7. Acceptance Criteria

- The docs base path is resolved exactly once.
- The state is classified as exactly one of Greenfield / Existing.
- Only the department spec(s) for the task were loaded.

## 8. Change-Log Record

This procedure writes no line of its own — its result is recorded by the caller's activation line in `upgradation/change-log.md` (§8 of `prompts/meta-prompt.md`).
