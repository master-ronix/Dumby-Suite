# ADR 002 — Directory Layout: Flat `src/` (No `src/core/` Wrapper)

**Status:** Accepted  
**Date:** 2026-07-28  
**Resolves:** Conflict 2 between `blueprint.md` and `documentation.md`

---

## Context

`documentation.md §3.1` proposes `src/core/` as a sub-directory grouping all framework infrastructure. `blueprint.md §3` shows a flat `src/` layout where framework folders (`bootstrap/`, `di/`, `events/`, etc.) are direct children of `src/`, not nested inside a `src/core/` wrapper.

## Decision

**The flat layout is canonical.** `src/` is a flat namespace:

```
src/
  bootstrap/   cache/   commands/   config/   db/
  di/          discord/ errors/     events/   http/
  i18n/        logging/ metrics/    middleware/ modules/
  monetization/ permissions/ queue/ ratelimit/ resilience/
  shared/      shutdown/ tracing/
```

There is no `src/core/` wrapper.

## Consequences

- All cross-`src/` imports are flat: `import { … } from '../events/event-bus.js'` not `'../../core/events/event-bus.js'`.
- The custom ESLint rule `no-cross-module-relative-import` enforces that modules inside `src/modules/` do not reach into sibling module directories via relative paths — this rule is simpler to implement without a `core/` indirection.
- The 22 module skeletons are already structured correctly.

## Sources

- `blueprint.md §3` (binding)  
- `documentation.md §3.1` (superseded)
