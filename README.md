# Dumby — Unified Modular Bot System

A modular Discord bot framework: one TypeScript application, one bootstrap sequence, one dependency graph, one permission engine — into which independently-authored **modules** load as the exclusive source of every behavior the bot exhibits.

## Quickstart

```bash
pnpm install
pnpm --filter @workspace/dumby typecheck
pnpm --filter @workspace/dumby lint
pnpm --filter @workspace/dumby test:unit
```

See `apps/main/README.md` for full deployment instructions.
See `STATUS.md` for the current implementation and delivery boundary.

## Repository Structure

```
workspace/
├── apps/main/         ← The build target (bot + all subsystems)
├── assets/            ← reserved
├── design/            ← reserved
├── docs/              ← Architecture specifications
├── specs/             ← reserved
├── tools/             ← reserved
└── website/           ← reserved
```
