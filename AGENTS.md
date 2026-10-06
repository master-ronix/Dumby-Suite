# Repository Guidelines

## Scope & Workspace Layout

This pnpm monorepo (`pnpm-workspace.yaml`) has exactly one real application: `apps/main`
(`@workspace/dumby`) — a modular Discord bot with a Fastify control plane. Everything else
(`assets/`, `design/`, `specs/`, `website/`, `tools/`, `artifacts/`, `lib/*`) is a
placeholder or a small support package. Do not treat stubs as implemented; `GAP_MANIFEST.md`
is a point-in-time audit artifact (via `docs/master-prompt.md` §3) and can be stale — verify
claims against the tree before trusting them.

The bot runtime behavior is supplied by **modules**: first-party modules in
`apps/main/src/modules/` plus third-party modules loaded at bootstrap Stage 10 from the
Swastik live volume (`SWASTIK_LIVE_VOLUME_PATH`). See `STATUS.md` for the delivery boundary.

## Commands (Node >=22, pnpm >=9)

CI mirror chain (`.github/workflows/ci.yml`): `typecheck → lint → format → test:unit + test:coverage → test:integration → docker build`.

Run gates sequentially — a later gate never runs if an earlier one fails.

Verification from repo root (run in this order before pushing):

- `pnpm install --frozen-lockfile`
- `pnpm --filter @workspace/dumby typecheck` — the only typecheck an app change needs.
  Root `pnpm typecheck` additionally runs `tsc --build` (lib/* project references) and
  typechecks `artifacts/**` and `scripts/`; use it when touching anything outside `apps/main/src`.
- `pnpm --filter @workspace/dumby lint` — ESLint `--max-warnings=0`; zero warnings allowed.
- `pnpm --filter @workspace/dumby format` — `prettier --check` (read-only). Use
  `format:fix` to actually reformat.
- `pnpm --filter @workspace/dumby test:coverage` — Vitest; includes `tests/unit/**` and
  `src/core/commands/__tests__/**`. Enforces floors (70 stmt / 65 branch /
  70 func / 70 line globally; per-directory floors in CI). No external services required.
- `pnpm --filter @workspace/dumby test:integration` — requires **live Postgres + Redis**
  (CI spins them up; locally `docker compose up` in `apps/main`) and **requires migrations
  already applied** (`pnpm migrate`). Serial per-file, 20s timeouts see `vitest.integration.config.ts`.
- `pnpm --filter @workspace/dumby test` — same as `test:unit` (default vitest config).

Build & run:

- `pnpm --filter @workspace/dumby dev` — `tsx watch src/bootstrap/bootstrap.ts` (bootstrap, no request pipeline).
- `pnpm --filter @workspace/dumby start:dev` — `tsx src/entry/main.ts`.
- `pnpm --filter @workspace/dumby start` — `node dist/entry/main.js`; requires `build` first.
- `pnpm --filter @workspace/dumby build` — `tsc -p tsconfig.json` → `dist/`.
- `pnpm --filter @workspace/dumby migrate|migrate:down|migrate:status` — Knex migrations
  (`scripts/migrate.ts`, TS via tsx) against `DATABASE_URL`.
- `pnpm --filter @workspace/dumby verify:env|verify:all|test:smoke` — env / deployment smoke checks.

Docker (context = **workspace root**, not `apps/main/`):

- `docker build --file apps/main/Dockerfile --tag dumby:local .` — multi-stage build;
  `deps` (prod deps only) → `builder` (typecheck + build) → `runtime` (minimal, no devDeps).

## Architecture Invariants (enforced by `apps/main/eslint.config.mjs`)

These five rules are encoded as build failures, not review habits; respect them or lint fails:

1. **No cross-module relative imports.** Modules may not deep-import sibling module
   internals. Cross-module reads go through a declared `*ForCrossModuleRead` accessor or
   the module manifest (`crossModuleReads`).
2. **No direct `process.env`** anywhere. Config flows through `ConfigService` /
   `parseEnv()`. Exemptions only: `src/config/env.schema.ts`, `src/entry/**`, `src/bootstrap/bootstrap.ts`,
   `src/db/knexfile.ts`, `scripts/**`, `tests/**`.
3. **No repository imports in command handlers** (`src/modules/*/commands/**`). Commands →
   services → repositories (three-layer rule).
4. **No event emission in repositories** — repositories may not import `InternalEventBus`.
5. **Events must be cataloged** — every event a module emits must be in the module manifest's
   `eventsCatalog` (validated at bootstrap Stage 11, not by ESLint).

Also enforced: `no-explicit-any`, `no-unused-vars` (except `_`-prefixed args), no floating
promises, type-only imports (`consistent-type-imports`), and `import/no-cycle` (maxDepth 5).

## Module Development (`src/modules/<slug>/`)

Each module is `manifest.ts` (the `ModuleManifest` object) + `index.ts` (lifecycle hooks
`onLoad` / `onReady` / `onUnload`) + `commands/`, `locales/`, `assets/`. Pattern-match on
`health` or `hello-world`.

- `manifest.schema.ts` builds the manifest schema with Zod `.strict()` — **any field not in
  the schema fails validation** at Stage 11, by design. Read that schema before writing a manifest.
- Module `name` must be lowercase-kebab-case; versions semver; `required` is mandatory.

## Config & Environment

- Env is validated by `src/config/env.schema.ts`: strict mode **rejects unknown keys** and
  fails bootstrap at Stage 02 with a field-level report. Add new vars to the schema AND
  `.env.example` together.
- `apps/main/.env.example` uses the docker-compose service hostnames (`postgres`, `redis`).
  For tests or tooling run outside compose, point `DATABASE_URL` at `localhost:5432` and
  keep `DISCORD_ADAPTER=mock` (never set `live` without a real token).
- Local compose (`apps/main/docker-compose.yml`) exposes API 8080, health 8081, metrics 8082,
  Swastik 8085.

## Spec Docs (authoritative, precedence-ordered)

`docs/blueprint.md` is the sole architectural authority; `docs/directive.md` translates it
into imperative `D-<part>.<rule>` rules; `docs/interface.md` governs only end-user Discord/
dashboard surfaces; record design decisions/changes in `docs/change-log.md` and `docs/adr/`.
`apps/main/docs/architecture/README.md` is a fast orientation summary. These spec files are
very large — consult the relevant section rather than reading wholesale.

## CI & Release

- CI runs on push to `main` and PRs (`.github/workflows/ci.yml`): single `gates` job with
  sequential steps (typecheck → lint → format → test:coverage → build), then `integration`
  (live Postgres + Redis, runs migrations) and `docker` (build from workspace root).
- SBOM generated via `anchore/sbom-action`; supply-chain hashes recorded in step summary.
- `pnpm-workspace.yaml` sets `minimumReleaseAge: 1440` (supply-chain defense): newly published
  npm packages fail to install for ~24h. Do not disable it; only add trusted packages to
  `minimumReleaseAgeExclude` temporarily.
- Recent history mixes `feat: ...` / `fix: ...` with plain imperative subjects; concise
  imperative with an optional type prefix is the norm.

## Gotchas

- App TS is strict ESM/NodeNext with `verbatimModuleSyntax`, `exactOptionalPropertyTypes`,
  `noUncheckedIndexedAccess` — type-only imports are required and quoted relative imports
  must carry the `.js` extension (NodeNext resolution; the `tsx` dev runners also require it).
- Never commit `apps/main/.env`, `dist/`, `coverage/`, or Swastik volume mirrors.