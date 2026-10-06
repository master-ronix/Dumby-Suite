# syntax=docker/dockerfile:1
# Build from the workspace root:
#   docker build -f apps/main/docker/Dockerfile .
#
# Build context MUST be the workspace root: this is a pnpm workspace, so pnpm
# needs every package manifest present to validate the lockfile. See
# ../../.dockerignore for exclusions.

FROM node:22-slim AS base
WORKDIR /app
RUN corepack enable && corepack prepare pnpm@latest --activate

FROM base AS deps
COPY . .
RUN --mount=type=cache,target=/root/.local/share/pnpm/store \
    pnpm install --frozen-lockfile --prod --filter @workspace/dumby

FROM base AS builder
COPY . .
RUN --mount=type=cache,target=/root/.local/share/pnpm/store \
    pnpm install --frozen-lockfile
RUN pnpm --filter @workspace/dumby build

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
