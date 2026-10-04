# 0003: Neon Postgres (no local Postgres) + Drizzle ORM

- Status: Accepted (Phase 0)

## Context

We need managed Postgres with reliable backups. We considered Railway Postgres (lowest latency, but
volume-based backups and more self-management) and Neon.

## Decision

Neon (project "Clocker App", AWS ap-southeast-1). Branch `main` is production, `dev` is for local
development, and every automated test run creates and deletes its own branch via the Neon API.
There is no Postgres container locally. Drizzle ORM provides typed queries and SQL migrations.
Neon Auth, Functions and AI gateway are disabled.

## Consequences

- Point-in-time restore and instant branching for development, tests and future preview environments.
- A few milliseconds of latency between Railway and Neon. Both run in Singapore to keep it small.
  Disable scale-to-zero on the production branch to avoid cold starts.
- Local development needs internet access. Tests need `NEON_API_KEY` locally and in CI.
- Plain Postgres + Drizzle keeps us portable (pg_dump/restore and a new `DATABASE_URL`).
