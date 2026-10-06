# Dumby Project Status

## Current State

<!-- One paragraph: what the repository currently is and ships. -->

## Module Delivery Boundary

<!-- How modules reach runtime: Swastik upload → validation → staging → promotion → hot-swap. -->

## Verification Commands

Run from the repository root:

```bash
pnpm install --frozen-lockfile
pnpm --filter @workspace/dumby typecheck
pnpm --filter @workspace/dumby lint
pnpm --filter @workspace/dumby test:unit
```
