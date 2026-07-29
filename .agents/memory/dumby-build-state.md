---
name: Dumby build state
description: What the Dumby Discord bot framework build contains and its current verified state.
---

## Source
Brought in from `Dumby_Suite-main_1785340765721.zip` (attached asset). The zip contained
a nearly-complete Phase 0–8 build produced by a prior agent session.

## Location in workspace
- `apps/main/` — the full Dumby codebase (`@workspace/dumby`)
- `docs/` — the 8 source documents (blueprint.md, directive.md, documentation.md, interface.md, directory.md, concept.md, change-log.md, master-prompt.md)
- `assets/`, `design/`, `specs/`, `tools/`, `website/` — reserved empty placeholder dirs per master-prompt §1.3

## Verified state (after copy into this workspace)
- `pnpm --filter @workspace/dumby typecheck` — CLEAN
- `pnpm test` (run from `apps/main/`) — 34 test files, 457 tests, ALL PASSING

## pnpm-workspace.yaml
`apps/*` added to the `packages:` list so `@workspace/dumby` is recognized.

## Key architecture constraints
- `apps/main` is a standalone Node.js app (NOT a Replit web artifact). Do NOT create an artifact for it.
- Discord bot; runs headless. Real `BOT_TOKEN`, `DATABASE_URL`, `REDIS_URL` required for live operation.
- `audit_logs` table is insert-only forever — no UPDATE or DELETE anywhere.
- Permission engine: layers 2/3/5/6 fail-closed; layers 4/7 fail-open. Asymmetry is intentional.
- Coverage floors are per-layer (Core 85/80, services 80/75, commands 75/70, repos 70/65, infra 70/65) — never blended.
- 18-stage bootstrap, 9-step graceful shutdown, `terminationGracePeriodSeconds: 190` in K8s manifests.
- CLAI: SSH public-key auth only, never password/TOTP, reachable from private network only.
- Module isolation enforced by 5 custom ESLint rules (build failures, not review comments).

**Why:** All decisions trace to blueprint.md / directive.md and the 3 resolved conflicts in master-prompt.md §0.4.
