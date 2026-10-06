---
id: ENGINE-ENTRY
title: Entry Decision Procedure
kind: engine
status: engine
version: 5.2.0
chain_role: detect
preceded_by: prompts/meta-prompt.md
handoff_to: orchestration/master-prompt.md (State A build | State C enforcement) | migration/migration-prompt.md (State B migration)
change_log: upgradation/change-log.md
---

# Entry — Entry Decision Procedure

## 1. Identity

- **Chain role:** *detect* — the single deterministic state-detection procedure of the trigger chain.
- **Preceded by:** `prompts/meta-prompt.md`, which calls this procedure at step 3.
- **Hands off to:** the caller — `prompts/meta-prompt.md` uses the result to hand off to `orchestration/master-prompt.md` (State A — build, or State C — enforcement) or `migration/migration-prompt.md` (State B — migration).
- **Authority:** it reads the authority layer; it does not decide authority.

## 2. Purpose

Give the chain one deterministic, unambiguous way to (a) resolve the docs base path, (b) load the authority layer, and (c) classify the run into exactly one of **three** states — Greenfield, Migration, or Enforcement — so the handoff in `prompts/meta-prompt.md` is mechanical, not a judgment call.

The third state exists because the codebase and the specification can be at the *same* version with **no** pending delta: nothing to build, nothing to migrate, and no active work order. In that steady state the chain must not dead-end on an empty migration template — it falls through to enforcement, which verifies the running code against the corpus.

## 3. Preconditions

- `docs/manifest.json` and `docs/status/capabilities.json` are readable.
- `apps/main/` is inspectable.

## 4. Inputs

| Input | Path | Use |
|-------|------|-----|
| Corpus manifest | `manifest.json` | the normative artifact set |
| Capability ledger | `status/capabilities.json` | build / defer decisions |
| State probe | `apps/main/` | greenfield vs existing |
| Work-order probe | `upgradation/UR-*.md` (dynamic) | is there an active migration delta? |
| Live ledger | `migration-ledger.md` (repository root) | is any migration item still open? |
| Authority order | `spec/governance/directive-charter-how-to-use-this-document.md` | conflict resolution |

## 5. Ordered Steps

1. **Resolve the docs base path ONCE** (default `docs/`) — never assume `docs/`.
2. Read `manifest.json`. Treat only `status: normative` artifacts as authority. Never read `archive/**` as current.
3. **Probe the work order (dynamic — no static list).** Discover request records by globbing `upgradation/UR-*.md` — the same dynamic discovery `scripts/docs/check-ur.mjs` performs; there is no registry to consult and none to update. Then read the live ledger `migration-ledger.md` at the repository root, if present. The work order is **ACTIVE** only while it holds **open work** — at least one real ledger item not `DONE`. It is **INACTIVE** in every other case: no request record and no ledger; a ledger whose items are all `DONE` (nothing left to update); a request record whose ledger is fully `DONE` (the delta has landed); or an unconstructed template ledger whose rows are placeholders — placeholders are not items. Updates are occasional and manually requested, so INACTIVE is the normal steady state of a mature repository.
4. **Classify the run into exactly one state:**
   - `apps/main/` empty or absent → **State A — Greenfield** → the caller runs `orchestration/master-prompt.md` in build mode (phases 0 → 8).
   - `apps/main/` contains code **and** the work order is ACTIVE → **State B — Migration** → the caller runs `migration/migration-prompt.md`.
   - `apps/main/` contains code **and** the work order is INACTIVE (nothing left to build or land — including a fully-`DONE` ledger) → **State C — Enforcement** → the caller runs `orchestration/master-prompt.md` in enforcement mode (§3 audit → §4 remediation → §6 enforcement), corpus-wide.
5. Load ONLY the department spec(s) for the task plus their `contracts/` — not the whole corpus.
6. Obey `status/capabilities.json`: do not build `deferred` items; do not re-implement `implemented` ones.
7. Reference behaviour by `SPEC-…` id and interfaces by `contracts/` path — never re-derive from prose.
8. A change is complete only when its `acceptance` block's test passes.

## 6. Artefacts Produced

| Artefact | Path | When |
|----------|------|------|
| State determination (Greenfield / Migration / Enforcement) | in-run | step 4 |
| Work-order probe result (ACTIVE / INACTIVE) | in-run | step 3 |

## 7. Acceptance Criteria

- The docs base path is resolved exactly once.
- The state is classified as exactly one of Greenfield / Migration / Enforcement.
- The classification names the work-order probe result it rests on.
- Only the department spec(s) for the task were loaded.

## 8. Change-Log Record

This procedure writes no line of its own — its result is recorded by the caller's activation line in `upgradation/change-log.md` (§8 of `prompts/meta-prompt.md`).
