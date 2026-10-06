# Database

The database is Postgres on Neon. Refer to decisions [0003](../decisions/0003-neon-postgres-drizzle.md)
and [0011](../decisions/0011-test-databases-local-and-neon.md).
The API and the worker connect to it through the database adapter in `apps/api/src/db/`.

## Branches and connection strings

| Neon branch | Used by                                    |
| ----------- | ------------------------------------------ |
| `main`      | production (Railway)                       |
| `dev`       | development (`pnpm dev`, Docker Compose)   |
| `ci-test-*` | `pnpm test:neon` only. Each run makes one. |

Each environment has two connection strings:

| Variable                 | Role       | Connection          | Used by                               |
| ------------------------ | ---------- | ------------------- | ------------------------------------- |
| `DATABASE_URL`           | `app_user` | pooled (`-pooler`)  | API and worker at runtime             |
| `DATABASE_MIGRATION_URL` | owner role | direct (not pooled) | migrate script and `drizzle-kit` only |

The two strings must include `?sslmode=require` on Neon.

## Roles

| Role         | Rights                                                                               | Phase   |
| ------------ | ------------------------------------------------------------------------------------ | ------- |
| owner        | Owns the schema. Runs the migrations. Neon makes this role (`neondb_owner`)          | Neon    |
| `app_user`   | `SELECT`, `INSERT`, `UPDATE`, `DELETE` on tables. No DDL. Row Level Security applies | Phase 2 |
| `admin_user` | Bypasses Row Level Security. Only the admin module uses it. Each action is audited   | Phase 4 |

Migration `0000_db_roles.sql` makes `app_user` with `NOSUPERUSER NOCREATEDB NOCREATEROLE NOBYPASSRLS
NOREPLICATION`. It gives these rights:

- `CONNECT` on the database and `USAGE` on the `public` schema.
- Default privileges: `SELECT, INSERT, UPDATE, DELETE` on new tables and `USAGE, SELECT` on new
  sequences that the owner makes. Thus each new table is available to `app_user` without a new grant.
- No `CREATE` on `public`. `app_user` cannot make, change or drop tables.

The migration also sets these values for each session of `app_user`:

| Setting                               | Value | Reason                                                |
| ------------------------------------- | ----- | ----------------------------------------------------- |
| `timezone`                            | `UTC` | All instants are UTC (docs/architecture/timezones.md) |
| `statement_timeout`                   | `15s` | A slow query cannot hold a connection for a long time |
| `idle_in_transaction_session_timeout` | `30s` | An open transaction cannot hold locks for a long time |

The migration does not change the attributes of an existing role. `ALTER ROLE ... NOSUPERUSER` needs a
real superuser, and Neon does not give one.

## Password of app_user

You do not make `app_user` in the Neon console. The migrate script does it:

1. Make a password: `openssl rand -hex 24`.
2. Put it into `DATABASE_URL` with the user `app_user` and the pooled host.
3. Run the migrate script. It makes the role (first run) and sets the password from `DATABASE_URL`.

The script sends the password to Postgres as a bind parameter, and `format('%L')` quotes it on the
server. The script does not write the password or a connection string to the log or to an error message.

## Migrations

- The Drizzle schema is in `apps/api/src/db/schema/`. The SQL migrations are in `apps/api/drizzle/`.
- Make a migration from the schema: `pnpm --filter @repo/api db:generate`.
- Make a custom SQL migration (roles, policies, functions):
  `pnpm --filter @repo/api exec drizzle-kit generate --custom --name=<name>`.
- Apply the migrations:

  | Where          | Command                                                             |
  | -------------- | ------------------------------------------------------------------- |
  | Local          | `pnpm --filter @repo/api db:migrate` (reads `.env`)                 |
  | Docker Compose | the one-shot `migrate` service. The `api` service starts after it   |
  | Railway        | the pre-deploy command `node dist/migrate.js` of the `api` service  |
  | Tests          | the test database providers run the same function (`runMigrations`) |

The migrate script (`src/migrate.ts` and `src/db/migrator.ts`) does these steps:

1. In production, it stops with an error if `DATABASE_URL` does not use `app_user`.
   In development, it writes a warning if `DATABASE_URL` uses the owner role.
2. It connects with `DATABASE_MIGRATION_URL` and applies the new migrations in one transaction.
3. It sets the password of `app_user` from `DATABASE_URL`.
4. In production, it stops with an error if `app_user` is a superuser or has `BYPASSRLS`.

Write each migration so that a second run does not fail (for example `IF NOT EXISTS`).
Drizzle records the applied migrations in the table `drizzle.__drizzle_migrations`.

## Tenancy and Row Level Security

All tenant data access goes through `withTenant(db, orgId, fn)` (`src/db/tenant.ts`):

1. It validates `orgId` as a UUID. A value that is not a UUID is a programming error (`TypeError`).
2. It starts a transaction.
3. It runs `select set_config('app.org_id', $1, true)`. The value applies to this transaction only.
4. It runs `fn(tx)` and commits.

Get `orgId` from the session (Phase 4). Never get it from the request body or the URL.

A tenant table (Phase 4) has Row Level Security and this policy:

```sql
alter table <table> enable row level security;
create policy tenant_isolation on <table>
  using (org_id = nullif(current_setting('app.org_id', true), '')::uuid)
  with check (org_id = nullif(current_setting('app.org_id', true), '')::uuid);
```

Use `nullif(..., '')`. After a transaction with `set_config(..., true)`, the setting on the same
connection is an empty string, not `NULL`. Then `''::uuid` gives an error. With `nullif`, a query
outside `withTenant` gets no rows and no error. The integration tests check this behavior.

The owner role bypasses Row Level Security on its own tables. Thus the runtime never uses the owner role.

## Test databases

The test database adapter is in `apps/api/test/db/`. Each provider has `create()` and `destroy()`.

| Command                 | Provider | Database                                        | Redis             |
| ----------------------- | -------- | ----------------------------------------------- | ----------------- |
| `pnpm test:integration` | `local`  | Postgres 18 container (Testcontainers)          | Redis 8 container |
| `pnpm test:neon`        | `neon`   | a new Neon branch `ci-test-<utc-time>-<random>` | Redis 8 container |

- The two commands need Docker.
- Each provider runs the real migrate function with a random `app_user` password. The tests connect
  as `app_user`, as in production.
- The local containers stop after the run, also after Ctrl+C. Testcontainers also starts a small
  reaper container (Ryuk). It removes the containers if the test process stops unexpectedly.
- The Neon provider makes the branch from `NEON_PARENT_BRANCH` with an expiry time of 2 hours (if the
  Neon plan accepts it). It deletes the branch after the run, and on Ctrl+C or SIGTERM. It also deletes
  `ci-test-*` branches that are older than 2 hours.
- Use the same Postgres major version in the local container as in the Neon project
  (`POSTGRES_IMAGE` in `apps/api/test/db/local-provider.ts`).

`pnpm test:neon` needs `NEON_API_KEY`, `NEON_PROJECT_ID` and `NEON_PARENT_BRANCH` in `.env`.
