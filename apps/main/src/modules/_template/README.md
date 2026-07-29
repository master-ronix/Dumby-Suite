# Module template

This folder is intentionally documentation-only. The actual, authoritative
template lives in [`scripts/scaffold-module.ts`](../../../scripts/scaffold-module.ts):
every one of its `manifestFile()`, `serviceFile()`, `repositoryFile()`,
`jobFile()`, `taskFile()`, `routeFile()`, `localeFile()`,
`dashboardSchemaFile()`, `eraserFile()`, `exporterFile()`, and `indexFile()`
functions is the literal template for that file type, parameterized by a
`ModuleSpec`.

To scaffold a new module:

```ts
import { writeModule } from '../../scripts/scaffold-module.js';

writeModule({
  slug: 'my-new-module',
  displayName: 'My New Module',
  tier: 'standard',
  index: 23,
  depends: ['guild-settings'],
});
```

or add the spec to the `MODULES` array and run:

```bash
pnpm scaffold:module
```

For a concrete, fully generated example to read instead of the templating
functions themselves, see [`src/modules/guild-settings`](../guild-settings)
(Core tier, no dependencies) or [`src/modules/economy`](../economy)
(Standard tier, depends on `guild-settings`) — both were produced by this
same generator and are exercised by
[`tests/unit/modules/generated-modules.test.ts`](../../../tests/unit/modules/generated-modules.test.ts).

Every generated module intentionally proves framework capability only — one
service, one repository, one module-owned table, one event, one job, one
task, one route, one locale file, one dashboard schema, one eraser, one
exporter — and never implements product-specific business logic (spec
section 9). Real product behavior for `moderation`, `economy`, `music`,
etc. is out of scope for V1.
