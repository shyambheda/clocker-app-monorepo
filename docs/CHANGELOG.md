# Changelog

We add an entry when the owner signs off a phase and the phase merges.

## Phase 1: Neutral starter foundation (2026-10-06)

### Added

- Product identity from configuration: `APP_NAME` (API and worker) and `NEXT_PUBLIC_APP_NAME` (web and admin, put into the build).
- `DEFAULT_APP_NAME` and `resolveAppName` in `@repo/shared`, with tests.
- The API and the worker write the product name to the log at start.
- `docs/STYLE.md` (Simplified Technical English rules and glossary), `docs/ADOPTING.md` (start a product from the starter), `docs/architecture/adapters.md` (adapter rule).
- Decision records 0009 (starter and neutral identity), 0010 (adapters), 0011 (test databases, amends 0003), 0012 (STE docs).
- The approved plan for Phase 2 (`docs/phases/phase-02-api-foundation.md`).

### Changed

- The repository is a neutral SaaS starter (`saas-starter-monorepo`). No product name is in the code or the docs.
- The package scope is `@repo/*`. The Compose project name is `saas-starter` (`COMPOSE_PROJECT_NAME` overrides it).
- All docs use Simplified Technical English and `example.com` placeholders.
- The roadmap has new phase numbers: Phase 2 is the API foundation.
- The Railway guide lists `APP_NAME` and `NEXT_PUBLIC_APP_NAME`. The web and admin Dockerfiles give `NEXT_PUBLIC_APP_NAME` to the build.
- `CLAUDE.md`: git identity rule for cloud sessions, adapter rule and documentation language rule.

### Security

- No change to the behavior of the apps. No new dependencies. No secrets in the repository.

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
