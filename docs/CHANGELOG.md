# Changelog

We add an entry when the owner signs off a phase and the phase merges.

## Phase 0: Monorepo, Docker, docs foundation (2026-10-05)

### Added

- pnpm workspaces + Turborepo monorepo with `apps/api`, `apps/web`, `apps/admin`, `packages/shared`, `packages/config`.
- Timezone utilities in `@repo/shared` (`TimeZoneSchema`, `effectiveTimeZone`, `formatInTimeZone`) with tests.
- API skeleton (Fastify, env validation, logger with redaction, graceful shutdown, `GET /health/live`) and worker skeleton (Redis connection).
- Next.js skeletons for web (`/`, `/portal`, `/panel`) and admin (noindex).
- Multi-stage Dockerfiles (dev and runtime targets) and Docker Compose for the full local stack.
- Railway config-as-code for `api`, `worker`, `web`, `admin`.
- Documentation structure, decision records, roadmap, and the phase loop.

### Fixed

- Docker dev containers do not show `.env not found` (they use `dev:docker` scripts; Compose supplies the env variables).

### Security

- Supply-chain settings: allowlist for install scripts, 24 h minimum release age, strict peer dependencies, Dependabot.
- Runtime images run as non-root, with read-only application files and only production dependencies.
- Local ports bind to 127.0.0.1. Redis needs a password and does not delete queued jobs.

Note: Phase 1 changed the package scope in this entry from the old product scope to `@repo/*`.
