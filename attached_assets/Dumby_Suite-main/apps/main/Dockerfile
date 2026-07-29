# syntax=docker/dockerfile:1
# Multi-stage build (blueprint.md §37 / directive.md §39):
#   base   — shared Node.js image with pnpm
#   deps   — production dependency install
#   builder— typecheck + any future compiled assets
#   runtime— final minimal image (no devDependencies, no source .ts files)

FROM node:22-slim AS base
WORKDIR /app
RUN corepack enable && corepack prepare pnpm@latest --activate

# ── Stage: deps ────────────────────────────────────────────────────────────────
FROM base AS deps
COPY package.json pnpm-lock.yaml ./
RUN --mount=type=cache,target=/root/.local/share/pnpm/store \
    pnpm install --frozen-lockfile --prod

# ── Stage: builder ─────────────────────────────────────────────────────────────
# Install all deps (including devDeps) so tsc can run.
FROM base AS builder
COPY package.json pnpm-lock.yaml tsconfig.json tsconfig.tests.json ./
RUN --mount=type=cache,target=/root/.local/share/pnpm/store \
    pnpm install --frozen-lockfile
COPY src ./src
COPY scripts ./scripts
# Typecheck only — no emit needed because runtime uses tsx/esm.
RUN pnpm typecheck

# ── Stage: runtime ─────────────────────────────────────────────────────────────
FROM base AS runtime
ENV NODE_ENV=production
# Copy production node_modules from deps stage (no devDeps in final image).
COPY --from=deps /app/node_modules ./node_modules
# Copy validated source from builder stage.
COPY --from=builder /app/src ./src
COPY --from=builder /app/scripts ./scripts
COPY package.json tsconfig.json ./
EXPOSE 3000 9090 9091
# Run as non-root for security hardening (blueprint.md §32.2).
USER node
# tsx/esm allows running TypeScript directly without a separate build step.
CMD ["node", "--import", "tsx/esm", "src/entry/main.ts"]
