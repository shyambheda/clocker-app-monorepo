# 0011: Test databases: local Postgres and Neon

- Status: Accepted (Phase 1, implementation in Phase 2). Amends [0003](0003-neon-postgres-drizzle.md).

## Context

0003 uses Neon for all databases, and a disposable Neon branch for each test run. Neon branches give
the same behavior as production. But each query in a test goes over the internet. A test run also needs
an API key and can leave branches if the run stops before the cleanup.

## Decision

Use two test database providers, behind one interface (`create()` and `destroy()`):

1. Local (default, `pnpm test:integration`): a disposable Postgres container (Testcontainers), with the
   same major version as the Neon project. A disposable Redis container is also used.
2. Neon (`pnpm test:neon`): a disposable Neon branch from `NEON_PARENT_BRANCH`. Run it before you close
   each phase. CI also runs it (Phase 7).

Development and production use only Neon (branches `dev` and `main`). There is no Postgres in
`docker compose up`.

## Consequences

- The default integration tests are fast, work offline and need only Docker.
- Local Postgres is different from Neon in some areas: the connection pooler, role limits (no real
  superuser on Neon, a password strength rule) and the extensions. The Neon run finds these differences.
- Tests connect as `app_user`, as in production. Thus a superuser in the local container does not hide RLS problems.
