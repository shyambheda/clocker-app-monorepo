# syntax=docker/dockerfile:1.7
# Image for the API and the worker (same code, different start command).
# Build from the repo root:  docker build -f apps/api/Dockerfile .
#   --target dev      -> hot-reload image used by docker-compose
#   (default) runtime -> small production image used by Railway

ARG NODE_VERSION=24

FROM node:${NODE_VERSION}-bookworm-slim AS base
ENV PNPM_HOME=/pnpm \
    PATH=/pnpm:$PATH \
    TZ=UTC
RUN corepack enable
WORKDIR /repo

# 1. Keep only the files @repo/api needs (its code, workspace deps, pruned lockfile).
FROM base AS pruner
RUN npm install -g turbo@2.11.7
COPY . .
RUN turbo prune @repo/api --docker

# 2. Install all dependencies (cached layer: only re-runs when package.json/lockfile change).
FROM base AS deps
COPY --from=pruner /repo/out/json/ .
RUN --mount=type=cache,id=pnpm,target=/pnpm/store pnpm install --frozen-lockfile

# Development image: source is bind-mounted by docker-compose for hot reload.
# Env comes from docker-compose (env_file + environment), so no .env file is read here.
FROM deps AS dev
COPY --from=pruner /repo/out/full/ .
ENV NODE_ENV=development
EXPOSE 4000
CMD ["pnpm", "--filter", "@repo/api", "dev:docker"]

# 3. Compile TypeScript into dist/, then collect dist/ plus production dependencies only.
FROM deps AS builder
COPY --from=pruner /repo/out/full/ .
RUN pnpm turbo run build --filter=@repo/api
RUN --mount=type=cache,id=pnpm,target=/pnpm/store \
    pnpm --filter=@repo/api deploy --prod --legacy /prod/api

# 4. Runtime: no build tools, no dev dependencies, non-root user.
# Node runs as PID 1. That is safe here because the app installs its own SIGTERM handler
# (close-with-grace) and spawns no child processes.
FROM node:${NODE_VERSION}-bookworm-slim AS runtime
ENV NODE_ENV=production \
    TZ=UTC \
    PORT=4000
WORKDIR /app
# Files stay owned by root, so the app user can read but not modify its own code.
COPY --from=builder /prod/api .
USER node
EXPOSE 4000
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD ["node", "-e", "fetch('http://127.0.0.1:'+(process.env.PORT||4000)+'/health/live').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"]
CMD ["node", "dist/server.js"]
