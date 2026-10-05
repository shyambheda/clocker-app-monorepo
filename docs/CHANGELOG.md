# Changelog

Entries are added when a phase is signed off and merged.

## Phase 0: Monorepo, Docker, docs foundation (2026-10-05)

### Added

- pnpm workspaces + Turborepo monorepo with `apps/api`, `apps/web`, `apps/admin`, `packages/shared`, `packages/config`.
- `@clocker/shared` timezone utilities (`TimeZoneSchema`, `effectiveTimeZone`, `formatInTimeZone`) with tests.
- API skeleton (Fastify, env validation, redacting logger, graceful shutdown, `GET /health/live`) and worker skeleton (Redis connection).
- Next.js skeletons for web (`/`, `/portal`, `/panel`) and admin (noindex).
- Multi-stage Dockerfiles (dev and runtime targets) and Docker Compose for the full local stack.
- Railway config-as-code for `api`, `worker`, `web`, `admin`.
- Documentation structure, decision records, roadmap, and the phase loop.

### Fixed

- Docker dev containers no longer print `.env not found` (they use `dev:docker` scripts; env comes from compose).

### Security

- Supply-chain settings: install scripts allowlisted, 24h minimum release age, strict peer dependencies, Dependabot.
- Runtime images run as non-root with read-only application files and production dependencies only.
- Local ports bound to 127.0.0.1. Redis requires a password and never evicts queued jobs.
