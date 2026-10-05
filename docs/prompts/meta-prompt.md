---
id: PROMPTS-META-PROMPT-MD
title: Build Engine Trigger (Activation)
kind: engine
status: engine
version: 5.1.0
chain_role: activate
preceded_by: operator
handoff_to: orchestration/master-prompt.md (State A) | migration/migration-prompt.md (State B)
change_log: upgradation/change-log.md
---

# Meta-Prompt — Build Engine Trigger

## 1. Identity

- **Chain role:** *activate* — the single activation entry of the trigger chain.
- **Preceded by:** an operator or agent. This is the first document of the chain that is run.
- **Hands off to:** `orchestration/master-prompt.md` (State A — greenfield) **or** `migration/migration-prompt.md` (State B — existing codebase). Exactly one fires.
- **Terminal sink:** `upgradation/change-log.md` — every run records itself there.
- **Authority:** this document selects and hands off; it does not build, migrate, or override the corpus authority order.

## 2. Purpose

Activate work on the project. It loads the authority layer, detects the state of the codebase, and hands the run to exactly one downstream prompt — the master prompt to build, or the migration prompt to bring an existing codebase or corpus up to the current specification. It is the only document an operator or agent must be pointed at to start a run, and the only place that decides which of the two protocols governs.

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
| Authority order | `spec/governance/directive-charter-how-to-use-this-document.md` | which document wins on conflict |
| Entry procedure | `prompts/entry.md` | the single deterministic state-detection procedure |

## 5. Ordered Steps

1. **Resolve the docs base path once** (default `docs/`); never assume it.
2. **Load the authority layer.** Read `manifest.json`; treat only `status: normative` artifacts as authority and never read `archive/**` as current. Read the precedence order from `spec/governance/directive-charter-how-to-use-this-document.md` — cite it, never restate it.
3. **Detect the state.** Run the single deterministic procedure in `prompts/entry.md` against `apps/main/`.
4. **Hand off — exactly one path fires:**
   - `apps/main/` empty or absent → **State A (greenfield)** → run `orchestration/master-prompt.md`.
   - `apps/main/` contains code → **State B (existing)** → run `migration/migration-prompt.md`.
5. **Return condition.** The handoff target returns when it has met its own Acceptance Criteria and written its Change-Log Record into `upgradation/change-log.md`. On return, verify that record exists; if it does not, the run is not complete.
6. **Record the activation.** Append the activation line (§8) to `upgradation/change-log.md`.

### First action — state detection

Before building anything, determine the state of `apps/main/` (step 3). This is the run's first action; the full, deterministic procedure is `prompts/entry.md`, and the classification it returns selects the handoff in step 4.

### Operating rules

The build engine's operating rules are owned by `orchestration/master-prompt.md` (Build Discipline and the Remediation Protocol) and are cited here, never restated: read before you build or fix; audit before you trust; remediate rather than rebuild unnecessarily; every fix needs a test; re-audit after fixing; the enforcement pass is mandatory; precedence is fixed and is read from `spec/governance/directive-charter-how-to-use-this-document.md`; be honest about status; keep one canonical path; the acceptance gate is not optional.

## 6. Artefacts Produced

| Artefact | Path | When |
|----------|------|------|
| State determination (Greenfield / Existing) | in-run | step 3 |
| Activation record | `upgradation/change-log.md` | step 6 |
| Delegated build or migration records | `upgradation/change-log.md` | on downstream return |

## 7. Acceptance Criteria

- Exactly one handoff target was selected and run.
- The selected target met its Acceptance Criteria and its Change-Log Record is present in `upgradation/change-log.md`.
- The activation line (§8) is present in `upgradation/change-log.md`.

## 8. Change-Log Record

Per the entry discipline in `upgradation/change-log.md` §1.5, this document writes one **Activation** line per run:

```
- <date> · meta-prompt 5.1.0 · state=<Greenfield|Existing> · handoff=<master-prompt|migration-prompt> · return=<met|unmet>
```
