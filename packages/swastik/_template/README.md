# Swastik Module Template

This template is the reference authoring layout for a module before upload to Swastik. It is **not**
loaded from the repository — promoted modules are discovered from the tier volumes under `MODULES_DIR`.

## Layout

```
<slug>/
  manifest.json          # name, version, tier, devId, commands, events, services, ...
  src/index.ts           # exports MODULE_SLUG, commands, onLoad/onReady/onUnload
  src/commands/*.ts      # defineCommand(...) from @workspace/swastik
  events/ jobs/ services/ repositories/ migrations/ locales/ assets/ ui/ tests/ config/
```

## Building a module in isolation (no main codebase)

A module's **only** dependency is the Swastik SDK. You never import the bot.

1. **Scaffold** — copy this `_template/` into a new package.
2. **Install the SDK** — the SDK is publishable; depend on the published version instead of the
   workspace link:
   ```json
   { "dependencies": { "@workspace/swastik": "^0.1.0" } }
   ```
   (In the monorepo it is `"workspace:*"`; in an isolated environment install the published package.)
3. **Author** — write `manifest.json` (declare `devId`, `tier`, `commands`, …) and `src/index.ts`
   using `defineCommand` / `defineEvent` from `@workspace/swastik`.
4. **Typecheck** — `tsc -p tsconfig.json --noEmit` (this template's tsconfig).
5. **Bundle** — esbuild bundles `src/index.ts` → `index.js` (with the manifest, locales and assets).
6. **Push** — POST the bundle to a running Swastik:
   `POST <swastik>/internal/deploy { moduleSlug, version, devId, manifest, indexSource }`.

The only contracts are the **SDK**, the **shared manifest schema**, and the **Swastik deploy API**.
