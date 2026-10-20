# syntax=docker/dockerfile:1
# Multi-stage build (blueprint.md §37 / directive.md §39):
#   base   — shared Node.js image with pnpm
#   deps   — production dependency install
#   builder— typecheck + compile (swastik SDK, the bot, the first-party modules)
#   runtime— final minimal image (no devDependencies, no source .ts files)
#
# Build context MUST be the workspace root (contains pnpm-lock.yaml,
# pnpm-workspace.yaml, and apps/main/).

FROM node:22-slim AS base
WORKDIR /app
RUN corepack enable && corepack prepare pnpm@10 --activate

# ── Stage: deps ────────────────────────────────────────────────────────────────
FROM base AS deps
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json tsconfig.base.json .npmrc ./
COPY apps/main/package.json apps/main/tsconfig.json apps/main/tsconfig.tests.json ./apps/main/
COPY packages/swastik/package.json ./packages/swastik/
RUN pnpm install --frozen-lockfile --prod --filter @workspace/dumby

# ── Stage: builder ─────────────────────────────────────────────────────────────
# Install all deps (including devDeps) so tsc/esbuild can run.
FROM base AS builder
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json tsconfig.base.json .npmrc ./
COPY apps/main/package.json apps/main/tsconfig.json apps/main/tsconfig.tests.json ./apps/main/
COPY packages/swastik/package.json ./packages/swastik/
# The first-party module packages are workspace projects (pnpm-workspace.yaml
# globs `packages/modules/*`) and each declares `@workspace/swastik`. Their
# manifests must be present BEFORE `pnpm install`, otherwise pnpm never links
# @workspace/swastik into each module's node_modules and esbuild cannot resolve
# it while bundling the modules (`build:modules` fails with "Could not resolve
# \"@workspace/swastik\""). Copying the packages first also keeps the lockfile's
# importers for `packages/modules/*` in sync with the workspace.
COPY packages/modules ./packages/modules
RUN pnpm install --frozen-lockfile
COPY packages/swastik ./packages/swastik
COPY apps/main/src ./apps/main/src
COPY apps/main/scripts ./apps/main/scripts
# Build the swastik SDK (the bot imports it), typecheck + compile the bot, build the
# first-party module bundles, and place them on their tier volumes inside the image.
# Option A — the image ships NO modules. Modules live on the tier volume mounts and are pushed into
# them through the Swastik flow after the service is up (see scripts/push-modules.ts).
RUN pnpm --filter @workspace/swastik build \
 && pnpm --filter @workspace/dumby typecheck \
 && pnpm --filter @workspace/dumby build \
 && pnpm --filter @workspace/dumby build:modules

# ── Stage: runtime ─────────────────────────────────────────────────────────────
FROM base AS runtime
ENV NODE_ENV=production
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/apps/main/node_modules ./apps/main/node_modules
COPY --from=builder /app/apps/main/dist ./apps/main/dist
COPY --from=builder /app/apps/main/scripts ./apps/main/scripts
# UR-20261021-095 — the built module bundles. The image still ships no *live* modules (Option A); the
# start script pushes these into the tier volumes through the sanctioned Swastik deploy flow, so the
# volumes carry real provenance rather than hand-copied files.
COPY --from=builder /app/apps/main/dist-modules ./apps/main/dist-modules
# §11.5 - the banner asset the API surface serves at /assets/dumby-banner.png.
COPY apps/main/assets ./apps/main/assets
# apps/main/node_modules/@workspace/swastik links to /app/packages/swastik, so the whole
# SDK (package.json + compiled dist + its own node_modules for `zod`) must be present.
COPY --from=builder /app/packages/swastik ./packages/swastik
# Option A — the module root is the tier VOLUME MOUNTS. The image bakes no modules; MODULES_DIR
# points at the mount, and modules are pushed into it through the Swastik flow after the service is
# up (`pnpm push:modules`). The mount must be writable by the non-root `node` user (RAILWAY_RUN_UID=0).
ENV MODULES_DIR=/mnt/modules
COPY apps/main/package.json apps/main/tsconfig.json ./apps/main/
EXPOSE 8080 8081 8082
USER node
WORKDIR /app/apps/main
# UR-20261021-095 — seed the tier volumes through the Swastik flow, then run the bot. The bot starts
# unconditionally, so a seeding failure degrades to the previous behaviour, never a dead container.
CMD ["node", "scripts/start-production.mjs"]
