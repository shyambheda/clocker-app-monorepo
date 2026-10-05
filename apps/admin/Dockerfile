# syntax=docker/dockerfile:1.7
# Image for @repo/admin (Next.js).
# Build from the repo root:  docker build -f apps/admin/Dockerfile .
#   --target dev      -> hot-reload image used by docker-compose
#   (default) runtime -> small production image (Next.js standalone output) used by Railway

ARG NODE_VERSION=24

FROM node:${NODE_VERSION}-bookworm-slim AS base
ENV PNPM_HOME=/pnpm \
    PATH=/pnpm:$PATH \
    NEXT_TELEMETRY_DISABLED=1
RUN corepack enable
WORKDIR /repo

# 1. Keep only the files @repo/admin needs.
FROM base AS pruner
RUN npm install -g turbo@2.11.7
COPY . .
RUN turbo prune @repo/admin --docker

# 2. Install dependencies (cached layer).
FROM base AS deps
COPY --from=pruner /repo/out/json/ .
RUN --mount=type=cache,id=pnpm,target=/pnpm/store pnpm install --frozen-lockfile

# Development image: source is bind-mounted by docker-compose for hot reload.
FROM deps AS dev
COPY --from=pruner /repo/out/full/ .
ENV NODE_ENV=development
EXPOSE 3001
CMD ["pnpm", "--filter", "@repo/admin", "dev"]

# 3. Build the standalone server bundle.
FROM deps AS builder
COPY --from=pruner /repo/out/full/ .
# Next.js puts NEXT_PUBLIC_ values into the build. Railway gives service variables as build args.
ARG NEXT_PUBLIC_APP_NAME
ENV NEXT_PUBLIC_APP_NAME=${NEXT_PUBLIC_APP_NAME}
RUN pnpm turbo run build --filter=@repo/admin

# 4. Runtime: only the standalone bundle, non-root user.
# Node runs as PID 1. The Next.js standalone server handles SIGTERM itself.
FROM node:${NODE_VERSION}-bookworm-slim AS runtime
ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    TZ=UTC \
    HOSTNAME=0.0.0.0 \
    PORT=3001
WORKDIR /app
# Files stay owned by root (read-only for the app user), except Next's cache directory.
COPY --from=builder /repo/apps/admin/.next/standalone ./
COPY --from=builder /repo/apps/admin/.next/static ./apps/admin/.next/static
COPY --from=builder /repo/apps/admin/public ./apps/admin/public
RUN mkdir -p apps/admin/.next/cache && chown node:node apps/admin/.next/cache
USER node
EXPOSE 3001
HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD ["node", "-e", "fetch('http://127.0.0.1:'+(process.env.PORT||3001)+'/').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"]
CMD ["node", "apps/admin/server.js"]
