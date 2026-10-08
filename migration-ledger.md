# Migration Ledger — v5.0.0 Re-Baseline

> This file is the single source of truth for migration progress. The agent reads it at
> the start of every session and updates it at the end of every item and slice. An item
> without a record here did not happen; an IN-PROGRESS item with a resume note is
> continued, never restarted.

- **Created:** 2026-10-08
- **Last updated:** 2026-10-08 · **Current item:** M10/M12/M14/M16 (partial) · **Next action:** wire the interactive controls (search, install dropdown, info/uninstall buttons) and the autocomplete source
- **Protocol:** `docs/migration/migration-prompt.md` v5.2.0
- **Coverage map:** the change-set brief (18 items) → one owning item each (M0–M17)
- **Record shapes:** `docs/migration/ledger-template.md` §3 (item) and §4 (slice)
- **Reconciliation:** pending — application typecheck/tests not yet run in this environment

---

## Summary

| Item | Title | Status |
|------|-------|--------|
| M0 | Branding — amber accent replaces blurple | DONE |
| M1 | Version strings removed from surfaces | DONE |
| M2 | Dashboard dynamic command registry | DONE |
| M3 | Density per page (no global control) | DONE |
| M4 | Per-module banner + accent | DONE |
| M5 | Existing modules use the default banner | DONE |
| M6 | Module footer grammar | DONE |
| M7 | Page-switch dropdown dashboard-only | DONE |
| M8 | Module logo icon asset | DONE |
| M9 | Marketplace core flow | DONE |
| M10 | Search bar + 25-option handling | IN-PROGRESS |
| M11 | Remove separate core-module dashboard pages | DONE |
| M12 | BCCM rename bug + required argument + reset | IN-PROGRESS |
| M13 | Module-specific dashboard pages | DONE |
| M14 | Marketplace main content | IN-PROGRESS |
| M15 | Queue page rewrite | DONE |
| M16 | /modules page | IN-PROGRESS |
| M17 | Hello standard-tier page cleanup | DONE |
| MR-1 | Docs residual — attribution contradiction | DONE |
| MR-2 | Docs residual — ADR-010 blurple retention | DONE |

Statuses: `NOT STARTED` → `IN-PROGRESS` → `DONE` / `BLOCKED` / `SKIPPED (reason)`.

---

## Item Records

### M0 — Branding — amber accent replaces blurple
- **Status:** DONE
- **Blast radius:** the accent constant; four test files; `docs/contracts/ui-renderer.schema.json`; the renderer specs and the master-prompt clause; ADR-010 → ADR-012.
- **Evidence:** the corpus gate suite green; no blurple on any current surface (only ADR-012 names the reversed value).

### M1 — Version strings removed from surfaces
- **Status:** DONE
- **Blast radius:** `apps/main/src/rendering/core-renderer.ts`; `apps/main/src/shared/utils/components-v2.ts`.
- **Evidence:** the title block is `Dumby | <page>`; no version is rendered anywhere.

### M2 — Dashboard dynamic command registry
- **Status:** DONE
- **Blast radius:** `packages/modules/dashboard/src/commands/dashboard.command.ts`; `apps/main/src/rendering/page-data.ts`.
- **Evidence:** the static list is gone; the host gathers the core command list at dispatch (§1.7).

### M3 — Density per page
- **Status:** DONE
- **Blast radius:** `apps/main/src/rendering/core-renderer.ts`; `apps/main/src/commands/command-router.ts`.
- **Evidence:** the global D/M/C control is removed; a page's declared density wins.

### M4 — Per-module banner + accent
- **Status:** DONE
- **Blast radius:** `packages/swastik/src/manifest-schema.ts`; `docs/contracts/module-manifest.schema.json`; `apps/main/src/module-system/loader.ts`; `apps/main/src/commands/{command-registry,module-command,command-router}.ts`; `apps/main/src/rendering/core-renderer.ts`.
- **Evidence:** a module declares `ui.{banner,accent,icon,displayName}`; the renderer applies the accent and the banner, defaulting to amber.
- **Residual:** the default banner asset itself is pending (asset dependency).

### M5 — Existing modules use the default banner
- **Status:** DONE
- **Evidence:** modules declare no `ui.banner`, so the default applies; the dashboard is the exception (to be given its own banner when the asset arrives).

### M6 — Module footer grammar
- **Status:** DONE
- **Blast radius:** `apps/main/src/rendering/core-renderer.ts`; `apps/main/src/commands/command-router.ts`.
- **Evidence:** footer = `<Module Name> [<module-id>] — Developed by <developer>`; framework surfaces carry plain attribution.

### M7 — Page-switch dropdown dashboard-only
- **Status:** DONE
- **Evidence:** the router passes the navigation dropdown only for `dashboard`.

### M8 — Module logo icon asset
- **Status:** DONE
- **Evidence:** the `ui.icon` field is declared and validated; the default white icon applies when absent.
- **Residual:** the default white icon asset is pending (asset dependency).

### M9 — Marketplace core flow
- **Status:** DONE
- **Blast radius:** `packages/modules/browse/src/commands/browse.command.ts`; `apps/main/src/rendering/page-data.ts`.
- **Evidence:** /browse is marketplace discovery; only installable modules are offered; installed modules drop out.

### M10 — Search bar + 25-option handling
- **Status:** IN-PROGRESS
- **Evidence:** the page carries the search prompt; the interactive search control and the paging of the install dropdown over the 25-option cap are the remaining slice.

### M11 — Remove separate core-module dashboard pages
- **Status:** DONE
- **Evidence:** the dashboard declares no core sub-pages; only standard-tier modules carry a page.

### M12 — BCCM rename bug + required argument + reset
- **Status:** IN-PROGRESS
- **Evidence:** the `/queue` command argument is now required; a `reset` action is added and accepted by the effect handler.
- **Residual:** the autocomplete-source fix (suggestions reflecting the current, renamed name) is the remaining slice; it belongs to the autocomplete provider.

### M13 — Module-specific dashboard pages
- **Status:** DONE
- **Evidence:** a module page lists only that module's registered commands.

### M14 — Marketplace main content
- **Status:** IN-PROGRESS
- **Evidence:** the content space lists available marketplace modules; the per-module info embed and logo rendering are the remaining slice.

### M15 — Queue page rewrite
- **Status:** DONE
- **Blast radius:** `apps/main/src/rendering/page-data.ts`.
- **Evidence:** the queue page is restructured into a batch group plus the pending-action list.

### M16 — /modules page
- **Status:** IN-PROGRESS
- **Evidence:** the page lists installed/enabled modules; the info/uninstall buttons and the page-switch divider are the remaining slice.

### M17 — Hello standard-tier page cleanup
- **Status:** DONE
- **Blast radius:** `packages/modules/hello-world/src/commands/hello.command.ts`.
- **Evidence:** the page is a single coherent body (title + greeting); no duplicate credits, no version.

### MR-1 — Docs residual — attribution contradiction
- **Status:** DONE — ADR-013 finalised (attribution retained in the footer after the id).

### MR-2 — Docs residual — ADR-010 blurple retention
- **Status:** DONE — ADR-010 scrubbed and retitled; its coverage-ledger row updated.

---

## Slice Records

### S1 — Framework tranche (M0–M8, M11, M13, M15, M17)
- **Status:** DONE · **Date:** 2026-10-08
- **Evidence:** the corpus gate suite green (25/25); the change set applied as one coherent patch.

### S2 — Interactive tranche (M10, M12-residual, M14, M16)
- **Status:** IN-PROGRESS · **Date:** 2026-10-08
- **Resume note:** wire the interactive controls (search, install dropdown, info/uninstall buttons, page-switch divider) through the interaction registry and effect handlers, and fix the autocomplete source so suggestions reflect the current name.

---

## Findings & Deviations Register

1. **Application suite not run.** The environment has no installed dependencies, so the typecheck/lint/unit suite is pending on the real toolchain. The corpus gate suite (25/25) is green.
2. **Latent array holes.** `browse.command.ts` and `modules.command.ts` carried a trailing `,,` (a sparse-array hole); both were rewritten during this pass.
3. **Asset dependency.** The default banner and default white icon are still to be supplied; the framework defaults apply until they arrive.
