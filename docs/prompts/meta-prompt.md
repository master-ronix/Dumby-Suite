---
id: PROMPTS-META-PROMPT-MD
title: Build Engine Trigger (Activation)
kind: engine
status: engine
version: 5.2.0
chain_role: activate
preceded_by: operator
handoff_to: orchestration/master-prompt.md (State A build | State C enforcement) | migration/migration-prompt.md (State B migration)
change_log: upgradation/change-log.md
---

# Meta-Prompt — Build Engine Trigger

## 1. Identity

- **Chain role:** *activate* — the single activation entry of the trigger chain.
- **Preceded by:** an operator or agent. This is the first document of the chain that is run.
- **Hands off to:** exactly one of three routes — `orchestration/master-prompt.md` in **build** mode (State A — greenfield) or in **enforcement** mode (State C — code present, no active work order), **or** `migration/migration-prompt.md` (State B — an active migration work order). Exactly one fires.
- **Terminal sink:** `upgradation/change-log.md` — every run records itself there.
- **Authority:** this document selects and hands off; it does not build, migrate, enforce, or override the corpus authority order.

## 2. Purpose

Activate work on the project. It loads the authority layer, detects the state of the codebase **and** the state of the work order, and hands the run to exactly one downstream protocol: build (greenfield), migrate (an active request work order), or enforce (code present, nothing to build or migrate). It is the only document an operator or agent must be pointed at to start a run, and the only place that decides which protocol governs.

**Updates are occasional and manually requested.** A migration delta exists only when a human has raised a request record (`upgradation/UR-*.md`) or left items open in the live ledger. There is no scheduled migration and no static work order: the chain detects both dynamically, and in their absence — including when a migration ledger is fully `DONE` and nothing is left to update — it enforces rather than stalls. The chain never dead-ends on an empty migration template.

## 3. Preconditions

- The repository is present, with `apps/main/` and `docs/` at its root.
- `docs/manifest.json` and `docs/status/capabilities.json` are present and readable.
- The operator or agent has read access to the whole repository.

## 4. Inputs

| Input | Path | Use |
|-------|------|-----|
| Corpus manifest | `manifest.json` | the normative artifact set |
| Capability ledger | `status/capabilities.json` | what to build, what to defer, what not to re-implement |
| State probe | `apps/main/` | greenfield vs existing |
| Work-order probe | `upgradation/UR-*.md` (dynamic) + `migration-ledger.md` | is there an active migration delta? |
| Authority order | `spec/governance/directive-charter-how-to-use-this-document.md` | which document wins on conflict |
| Entry procedure | `prompts/entry.md` | the single deterministic state-detection procedure |

## 5. Ordered Steps

1. **Resolve the docs base path once** (default `docs/`); never assume it.
2. **Load the authority layer.** Read `manifest.json`; treat only `status: normative` artifacts as authority and never read `archive/**` as current. Read the precedence order from `spec/governance/directive-charter-how-to-use-this-document.md` — cite it, never restate it.
3. **Detect the state.** Run the single deterministic procedure in `prompts/entry.md` against `apps/main/` and the work order.
4. **Hand off — exactly one route fires:**
   - `apps/main/` empty or absent → **State A (greenfield)** → run `orchestration/master-prompt.md` in build mode.
   - `apps/main/` contains code **and** an active work order exists → **State B (migration)** → run `migration/migration-prompt.md`.
   - `apps/main/` contains code **and** no active work order exists (nothing left to build or land — including a ledger whose items are all `DONE`) → **State C (enforcement)** → run `orchestration/master-prompt.md` in enforcement mode (§3 audit → §4 remediation → §6 enforcement), corpus-wide.
5. **Return condition.** The handoff target returns when it has met its own Acceptance Criteria and written its Change-Log Record into `upgradation/change-log.md`. On return, verify that record exists; if it does not, the run is not complete.
6. **Record the activation.** Append the activation line (§8) to `upgradation/change-log.md`.

### First action — state detection

Before building anything, determine the state (step 3). This is the run's first action; the full, deterministic procedure is `prompts/entry.md`, and the classification it returns selects the handoff in step 4. The procedure probes the work order dynamically — globbing `upgradation/UR-*.md` and reading `migration-ledger.md` — so the route is decided from what the repository actually contains, never from a static list.

### Operating rules

The build engine's operating rules are owned by `orchestration/master-prompt.md` (Build Discipline and the Remediation Protocol) and are cited here, never restated: read before you build or fix; audit before you trust; remediate rather than rebuild unnecessarily; every fix needs a test; re-audit after fixing; the enforcement pass is mandatory; precedence is fixed and is read from `spec/governance/directive-charter-how-to-use-this-document.md`; be honest about status; keep one canonical path; the acceptance gate is not optional.

## 6. Artefacts Produced

| Artefact | Path | When |
|----------|------|------|
| State determination (Greenfield / Migration / Enforcement) | in-run | step 3 |
| Activation record | `upgradation/change-log.md` | step 6 |
| Delegated build, migration, or enforcement records | `upgradation/change-log.md` | on downstream return |

## 7. Acceptance Criteria

- Exactly one handoff route was selected and run.
- The selected target met its Acceptance Criteria and its Change-Log Record is present in `upgradation/change-log.md`.
- The activation line (§8) is present in `upgradation/change-log.md`.

## 8. Change-Log Record

Per the entry discipline in `upgradation/change-log.md` §1.5, this document writes one **Activation** line per run:

```
- <date> · meta-prompt 5.2.0 · state=<Greenfield|Migration|Enforcement> · handoff=<master-prompt:build|migration-prompt|master-prompt:enforce> · return=<met|unmet>
```
