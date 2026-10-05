# 0003: Neon Postgres (no local Postgres) + Drizzle ORM

- Status: Accepted (Phase 0). Amended by [0011](0011-test-databases-local-and-neon.md).

## Context

The starter needs managed Postgres with reliable backups. We compared Railway Postgres (lowest latency,
but backups of volumes and more work to operate) and Neon.

## Decision

Use Neon. Each product makes its own Neon project, in the same region as its Railway services.
Branch `main` is for production. Branch `dev` is for local development. There is no Postgres container
for development. Drizzle ORM supplies typed queries and SQL migrations. Disable Neon Auth, Functions and
the AI gateway.

0011 changes one part of this decision: the tests use disposable databases, local or on Neon.

## Consequences

- Point-in-time restore and fast branches for development, tests and later preview environments.
- Some milliseconds of latency between Railway and Neon. Put the two in the same region.
  Disable scale-to-zero on the production branch. This prevents cold starts.
- Local development needs internet access.
- Plain Postgres + Drizzle keeps the starter portable (pg_dump/restore and a new `DATABASE_URL`).
