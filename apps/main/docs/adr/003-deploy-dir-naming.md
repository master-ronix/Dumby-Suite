# ADR 003 — Deploy Directory and Table Naming Conventions

**Status:** Accepted  
**Date:** 2026-07-28  
**Resolves:** Conflict 3 between `blueprint.md` and `directive.md`

---

## Context

`directive.md §46` appends three small conflicts:

1. **`deploy/` vs `infra/`** — `blueprint.md §29` shows `deploy/`; `directive.md §36` shows `infra/`.
2. **`developers` vs `swastik_developers`** — `blueprint.md §15.5` uses `developers`; `directive.md §42` uses `swastik_developers`.
3. **`builds` vs `swastik_builds`** — same mismatch for the builds table.

## Decision

| Item | Chosen | Source |
|---|---|---|
| Root dir for K8s/Terraform | `deploy/` | `blueprint.md §29` |
| Developer table | `developers` | `blueprint.md §15.5` |
| Builds table | `builds` | `blueprint.md §15.5` |

`blueprint.md` is the higher-authority document (§0.3 precedence order). `directive.md §36` and `directive.md §42` are superseded.

## Consequences

- K8s manifests live at `deploy/k8s/`, Terraform at `deploy/terraform/`.
- DB migrations create tables named `developers` and `builds` (already in `src/db/migrations/`).
- Any operator scripts or runbooks that reference `infra/`, `swastik_developers`, or `swastik_builds` must be updated.

## Sources

- `blueprint.md §0.3` (precedence), `§15.5` (table names), `§29` (dir names)  
- `directive.md §36`, `§42` (superseded)
