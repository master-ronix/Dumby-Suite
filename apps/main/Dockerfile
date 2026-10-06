# syntax=docker/dockerfile:1
# Multi-stage build (blueprint.md §37 / directive.md §39):
#   base   — shared Node.js image with pnpm
#   deps   — production dependency install
#   builder— typecheck + any future compiled assets
#   runtime— final minimal image (no devDependencies, no source .ts files)
#
# Build context MUST be the workspace root (contains pnpm-lock.yaml,
# pnpm-workspace.yaml, and apps/main/).

FROM node:22-slim AS base
WORKDIR /app
RUN corepack enable && corepack prepare pnpm@latest --activate

# ── Stage: deps ────────────────────────────────────────────────────────────────
FROM base AS deps
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json tsconfig.base.json ./
COPY apps/main/package.json apps/main/tsconfig.json apps/main/tsconfig.tests.json ./apps/main/
COPY packages/swastik/package.json ./packages/swastik/
RUN --mount=type=cache,target=/root/.local/share/pnpm/store \
    pnpm install --frozen-lockfile --prod --filter @workspace/dumby

# ── Stage: builder ─────────────────────────────────────────────────────────────
# Install all deps (including devDeps) so tsc can run.
FROM base AS builder
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json tsconfig.base.json ./
COPY apps/main/package.json apps/main/tsconfig.json apps/main/tsconfig.tests.json ./apps/main/
COPY packages/swastik/package.json packages/swastik/tsconfig.json ./packages/swastik/
RUN --mount=type=cache,target=/root/.local/share/pnpm/store \
    pnpm install --frozen-lockfile
COPY apps/main/src ./apps/main/src
COPY apps/main/scripts ./apps/main/scripts
COPY packages/swastik/src ./packages/swastik/src
RUN pnpm --filter @workspace/dumby typecheck && pnpm --filter @workspace/dumby build

# ── Stage: runtime ─────────────────────────────────────────────────────────────
FROM base AS runtime
ENV NODE_ENV=production
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/apps/main/node_modules ./apps/main/node_modules
COPY --from=builder /app/apps/main/dist ./apps/main/dist
COPY --from=builder /app/apps/main/scripts ./apps/main/scripts
COPY --from=builder /app/packages/swastik/dist ./packages/swastik/dist
COPY apps/main/package.json apps/main/tsconfig.json ./apps/main/
COPY packages/swastik/package.json ./packages/swastik/
EXPOSE 8080 8081 8082
USER node
WORKDIR /app/apps/main
CMD ["node", "dist/entry/main.js"]
