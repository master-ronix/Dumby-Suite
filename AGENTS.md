# AGENTS.md — Dumby Suite

## What this repo is

- pnpm monorepo with one real application: `apps/main` (`@workspace/dumby`) — the Dumby
  Discord bot plus its Fastify control plane. TypeScript, ESM, Node >= 22, pnpm >= 9.
- Everything else is support or a placeholder:
  - `lib/*` and `artifacts/*` are a Replit-generated web/API scaffold (Drizzle, Orval,
    React/Vite) — **not** part of the bot. The bot's DB layer is `apps/main/src/db` (Knex),
    not `lib/db` (Drizzle).
  - `assets/`, `design/`, `specs/`, `website/` are README-only reserved directories.
  - `tools/release_manager/` is a real release-time Compatibility Ledger gate.
- Feature modules do **not** live under `apps/main/src`. The framework is
  `apps/main/src/module-system/`; first-party module packages are authored in
  `packages/modules/<slug>/` (ADR-005: tier volumes replace `/src/modules`).
- `GAP_MANIFEST.md` and `replit.md` are point-in-time artifacts and can be stale — verify
  claims against the tree before trusting them.

## Commands

Run from the repo root. Verification chain (mirrors CI; run in this order before pushing):

- `pnpm install --frozen-lockfile`
- `pnpm --filter @workspace/dumby typecheck` — the only typecheck an app change needs.
- `pnpm typecheck` (root) — additionally builds the `lib/*` project references (`tsc --build`)
  and typechecks `artifacts/**` and `scripts/`. Use it when touching anything outside `apps/main/src`.
- `pnpm --filter @workspace/dumby lint` — ESLint `--max-warnings=0`; zero warnings allowed.
- `pnpm --filter @workspace/dumby format` — `prettier --check` (read-only). `format:fix` rewrites.
- `pnpm --filter @workspace/dumby test:coverage` — Vitest; includes only `tests/unit/**/*.test.ts`.
  Global floors 70 stmt / 65 branch / 70 func / 70 line (no per-directory floors). No external services.
- `pnpm --filter @workspace/dumby test:integration` — needs live Postgres + Redis
  (`docker compose up` in `apps/main`); serial per file, 20s timeouts.

Build & run (all `--filter @workspace/dumby`):

- `dev` = `tsx watch src/bootstrap/bootstrap.ts`; `start:dev` = `tsx src/entry/main.ts`.
- `build` = `tsc -p tsconfig.json` → `dist/`; `start` = `node dist/entry/main.js` (needs `build` first).
- `migrate` / `migrate:down` / `migrate:status` — Knex (`scripts/migrate.ts` via tsx) against `DATABASE_URL`.
- `verify:env`, `verify:all`, `test:smoke`, `seed`.

Docker — build context is the **workspace root**, not `apps/main/`:

- `docker build --file apps/main/Dockerfile --tag dumby:local .` (multi-stage: deps → builder → runtime).

## Architecture invariants (enforced by `apps/main/eslint.config.mjs`)

These are build failures, not review habits:

1. **No classic embeds** — `EmbedBuilder` / `MessageEmbed` are banned (ADR-001); all presentation
   is renderer-issued Components v2.
2. **No direct `process.env`** — config flows through `ConfigService` / `parseEnv()`. Exemptions:
   `src/config/env.schema.ts`, `src/entry/**`, `src/bootstrap/bootstrap.ts`, `src/db/knexfile.ts`,
   `scripts/**`, `tests/**`.
3. **No cross-module deep imports** — cross-module reads go through a declared
   `*ForCrossModuleRead` accessor or the manifest `crossModuleReads`.
4. **No repository imports in command handlers** — commands → services → repositories (three-layer rule).
5. **No event emission in repositories** — repositories may not import `InternalEventBus`.
6. **Events must be cataloged** — every emitted event must appear in the module manifest's
   `eventsCatalog` (validated at bootstrap Stage 11).

Also enforced: `no-explicit-any`, `no-unused-vars` (except `_`-prefixed args), no floating
promises, `consistent-type-imports`, `import/no-cycle` (maxDepth 5).

Note: the ESLint blocks that target `src/modules/**`, and the `vitest.config.ts` coverage exclude
for `src/modules/register-all.ts`, reference the retired path and currently match nothing.

## Module authoring & the Swastik promotion path

- A module package is `packages/modules/<slug>/manifest.json` + `src/index.ts` (self-contained
  lifecycle hooks). It may **not** import from `apps/main/src` or any other workspace package —
  esbuild inlines its sources, and Swastik runs `node --check` on the staged bundle.
- `manifest.json` is validated by a Zod `.strict()` schema
  (`apps/main/src/module-system/manifest.schema.ts`): any unknown field fails. `name` is
  lowercase-kebab-case, `version` is semver, `required` is mandatory, `tier` is one of
  admin|core|standard|marketplace. Event names are `{domain}.{entity}.{action}`; cross-module
  accessor names must end with `ForCrossModuleRead`.
- Promotion target is derived from the manifest tier (`liveVolumeForTier`): `modules-admin` /
  `modules-core` / `modules-standard` / `modules-marketplace` under `MODULES_DIR` (`/mnt/modules`).
  A tier mismatch at rest aborts the volume scan. Nothing writes a tier volume directly.
- Seed flow: `build:modules` → `seed:modules --provision-governance` (first run) →
  `seed:modules --human-approved` (a first promotion requires it). Needs `INTERNAL_API_KEY` and `DATABASE_URL`.
- First-party set — core: browse, dashboard, health, modules, permit, persona, queue;
  standard: hello-world. `packages/swastik/_template/` is the scaffolding template.

## Config & environment

- `apps/main/src/config/env.schema.ts` validates env. Add new vars there **and** to
  `apps/main/.env.example` together. Required: `DATABASE_URL`, `REDIS_URL`, `QUEUE_REDIS_URL`,
  `INTERNAL_API_KEY` (>= 32 chars), `ENCRYPTION_ROOT_KEY` (base64, exactly 32 bytes).
  `BOT_TOKEN` is required only when `DISCORD_ADAPTER=live`.
- Only keys the schema knows are read (`pickEnvKeys`), so stray process env vars are ignored;
  a bad value fails bootstrap at Stage 02 (CONFIG_LOAD) with a field-level report.
- `.env.example` uses docker-compose hostnames (`postgres`, `redis`). Outside compose, point
  `DATABASE_URL` at `localhost:5432` and keep `DISCORD_ADAPTER=mock` (never `live` without a real token).
  Local compose ports: API 8080, health 8081, metrics 8082, Swastik 8085.

## Domain invariants

- `audit_logs` is insert-only — a Postgres trigger blocks UPDATE/DELETE; use the
  `InsertOnlyRepository`. Never UPDATE or DELETE against it.
- Every migration needs a working `down()` or CI fails.
- The permission resolver is a 7-layer sequence with a deliberate asymmetry: layers 2, 3, 5, 6
  fail **closed**; layers 4 and 7 fail **open**. Do not "normalize" it.
- Bootstrap is 18 stages (`src/bootstrap/stages.ts`). Stage 06 `MIGRATION_RUN` runs
  `knex.migrate.latest()`, so **starting the app applies pending migrations** against `DATABASE_URL`.

## Spec docs (authority order)

The restructured corpus under `docs/` is the authority, in this order: `docs/blueprint/` (the
architectural wiring) → `docs/spec/governance/` (the imperative `D-<part>.<rule>` rules and the
single normative precedence list) → `docs/spec/request-layer/` (the Discord/dashboard surfaces) →
`docs/spec/**` by department. Record decisions in `docs/upgradation/change-log.md` and
`docs/adr/` (**15** ADRs, ADR-001 … ADR-015). `docs/spec/architecture/directory-file-structure.md`
specifies the *intended* full tree — it lists CI pipelines, husky, changesets and similar that are
not all present, so trust the tree over it. `apps/main/docs/architecture/README.md` is a fast
orientation; note that `apps/main/docs/` is an application-local, **non-normative** set and is
**outside the corpus and its gates** (see `docs/README.md`). These spec files are large — read the
relevant section rather than the whole file. The pre-restructure source records (`blueprint.md`,
`directive.md`, `interface.md`, `directory.md`) live frozen under `docs/_inbox/`; the frozen
request records live under `docs/upgradation/`. This file is itself point-in-time — verify a path
against the tree before trusting it.

## CI & supply chain

- `.github/workflows/ci.yml`: a single `gates` job (gitleaks → dependency-review on PR → root+app
  typecheck → lint → format → test:coverage → build → SBOM + supply-chain hashes), then
  `integration` (live Postgres 16 + Redis 7, applies migrations, runs test:integration) and
  `docker` (builds from the workspace root).
- `pnpm-workspace.yaml` sets `minimumReleaseAge: 1440` (a 24h supply-chain delay). Do not disable
  it; only add trusted packages to `minimumReleaseAgeExclude` (currently `@replit/*`, `stripe-replit-sync`).

## Gotchas

- App TS is strict ESM/NodeNext with `verbatimModuleSyntax`, `exactOptionalPropertyTypes`,
  `noUncheckedIndexedAccess`, `noPropertyAccessFromIndexSignature` — relative imports need the
  `.js` extension and type-only imports are required.
- Never commit `apps/main/.env`, `dist/`, `coverage/`, or Swastik volume mirrors.
