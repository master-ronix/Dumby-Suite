# First-party Swastik modules (M6 re-seed)

The first-party modules that used to live in `apps/main/src/modules` are authored
here as Swastik module packages and reach their tier volume **only** through the
Swastik promotion path. Nothing in this tree — or in the tooling that builds it —
writes to a tier volume directly (blueprint §15.8, `docs/adr/ADR-005.md`).

## Package layout

```
packages/modules/<slug>/manifest.json     runtime manifest (validated by the strict Zod schema)
packages/modules/<slug>/src/index.ts      self-contained lifecycle hooks; no framework imports
```

A promoted module is loaded with `import()` straight off a tier volume, so the
bundle must be standalone: it may not import from `apps/main/src` or any other
workspace package. `esbuild` inlines the module's own sources at build time, and
the Swastik route refuses anything that fails its static load verification
(`node --check` on the staged `index.js`).

## Seed set and tier volumes

| package | tier | promoted into |
| --- | --- | --- |
| `browse`, `dashboard`, `health`, `modules`, `permit`, `persona`, `queue` | `core` | `modules-core` |
| `hello-world` | `standard` | `modules-standard` |

The promotion target is derived from the manifest tier by the Swastik entry
(`liveVolumeForTier`), asserted to stay inside `MODULES_DIR`. The bootstrap tier
loader independently enforces the same rule: a `core` manifest found in
`modules-standard` is a tier-at-rest violation and aborts the volume scan.

## Seeding

```bash
# 1. build artifacts (apps/main/dist-modules/<slug>/{manifest.json,index.js})
pnpm --filter @workspace/dumby build:modules

# 2. first run: provision the first-party developer + approved license
pnpm --filter @workspace/dumby seed:modules --provision-governance

# 3. promote (--human-approved is required for a first promotion; the server
#    refuses without it)
pnpm --filter @workspace/dumby seed:modules --human-approved
```

Useful flags: `--modules health,hello-world` (subset), `--no-build` (reuse the
existing artifacts), `--swastik-url`, `--dev-id`, `--username`.

Environment: `INTERNAL_API_KEY` (mandatory, authenticates `/internal/deploy`),
`DATABASE_URL` (governance check), `SWASTIK_PORT` (default target). Override the
first-party identity with `FIRST_PARTY_DEV_ID`.

`--provision-governance` is the only mode that writes to the database, and it
writes nothing but the `developers` / `licenses` rows that the deploy route
requires (`devId` must exist, be `approved`, and hold an `approved` license whose
tier class covers the manifest tier). There is deliberately no HTTP surface for
license approval, so the seed supplies it.

## What the seed does not do

Each package currently ships lifecycle hooks only. A promoted bundle receives the
DI container but no module-facing service accessor, so these manifests declare no
commands until the framework exposes a registration surface to promoted modules
(`ModuleLoader.loadAll` resolves `CORE_TOKENS.CommandRegistry` on the host side;
a module cannot reach that token). Seeding is therefore proof of the promotion
path, not of the command surface.
