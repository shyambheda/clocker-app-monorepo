# Phase 2: API foundation and security

- Branch: `phase-02-api-foundation`
- Status: Awaiting sign-off (plan approved by the owner on 2026-10-05, build done on 2026-10-06)

## Goal

Make the API safe to expose to the internet, and connect it to Postgres (Neon). Phase 3 (jobs) and
Phase 4 (auth, RLS) use this foundation.

## Decisions (approved)

| Topic               | Decision                                                                                                                                      |
| ------------------- | --------------------------------------------------------------------------------------------------------------------------------------------- |
| DB driver           | `pg` (node-postgres) over TCP + the Drizzle `node-postgres` adapter. It works with all Postgres hosts                                         |
| `app_user` password | The migrate script reads the user and the password from `DATABASE_URL` and sets them on the role                                              |
| API reference UI    | Scalar at `/reference` in development. Not registered in production (404). `docs/api/openapi.json` is the spec                                |
| Tests               | `pnpm check` runs unit tests only (no network). `pnpm test:integration` uses local containers. `pnpm test:neon` uses a disposable Neon branch |
| Error shape         | `{ error: { code, message, requestId } }`. Validation errors (400) also have `details: [{ path, message }]`                                   |

## Default values (the owner can change them in review)

- Body limit: 100 KB for all routes.
- Rate limit: 300 requests for each minute for each IP (env variables). `/health/live` is exempt.
  If Redis fails, the limiter lets the request through and writes an error to the log.
- A request with an `Origin` that is not on the allowlist (or `Origin: null`) gets 403 `ORIGIN_NOT_ALLOWED`.
  The origin of the API (`API_URL`) is on the allowlist automatically.
- POST, PUT, PATCH and DELETE requests with a `Cookie` header must have an `Origin` on the allowlist.
  Else 403 `ORIGIN_REQUIRED`. Requests with only a bearer token and requests without cookies are not affected.
- `trustProxy` = `TRUST_PROXY_HOPS` (0 locally, 1 on Railway).
- The Railway deploy health check uses `/health/ready`. The Docker `HEALTHCHECK` stays on `/health/live`.

## Scope

### 1. Plugin order (`apps/api/src/app.ts`)

`buildApp({ config, deps })` does not call `ready()`. Tests can add test routes. `deps` is `{ db, redis }`,
so unit tests can use fakes. The order:

1. Fastify options: `trustProxy`, `bodyLimit`, `onProtoPoisoning: 'error'`, `onConstructorPoisoning: 'error'`,
   `requestIdHeader: false` (ignore request ids from clients), `genReqId: randomUUID`, `requestTimeout: 30 s`,
   `return503OnClosing`. Each reply has the `x-request-id` header.
2. Zod type provider (`fastify-type-provider-zod`): validator compiler and serializer compiler.
3. Central error handler and not-found handler (`plugins/error-handler.ts`). They come first, so that all
   errors (CORS, rate limit, body parser) have the same shape.
4. `@fastify/helmet`: CSP `default-src 'none'; frame-ancestors 'none'; base-uri 'none'; form-action 'none'`,
   CORP `same-site`, HSTS (1 year, includeSubDomains) in production.
5. Origin check + `@fastify/cors` (`plugins/cors.ts`): exact match against `CORS_ORIGINS`,
   `credentials: true`, explicit methods and headers, `maxAge: 600`.
6. Origin check for cookie writes (`plugins/origin-check.ts`). It does not apply to `/webhooks/*`.
7. `@fastify/rate-limit` (`plugins/rate-limit.ts`): Redis store (`nameSpace: 'rl:'`), key `request.ip`,
   429 through the error handler with `Retry-After`. Memory store only when there is no Redis (unit tests).
8. OpenAPI (`plugins/openapi.ts`): `@fastify/swagger` with `jsonSchemaTransform`. Scalar at `/reference`
   only when `NODE_ENV` is not `production`. A less strict CSP applies only to `/reference`.
9. Routes: `modules/health/routes.ts` (live and ready) with Zod schemas for input and output.
10. `onClose`: close the pg pool and Redis.

### 2. Errors (`plugins/error-handler.ts`, `lib/errors.ts`)

- `AppError(status, code, safeMessage)` for our own errors.
- Codes: `VALIDATION_FAILED` (400), `INVALID_BODY` (400, bad JSON and prototype poisoning),
  `PAYLOAD_TOO_LARGE` (413), `UNSUPPORTED_MEDIA_TYPE` (415), `NOT_FOUND` (404), `RATE_LIMITED` (429),
  `ORIGIN_NOT_ALLOWED` and `ORIGIN_REQUIRED` (403), `INTERNAL_ERROR` (500, message "Something went wrong").
- Other 4xx errors get a fixed message for each status. The response never contains a stack trace,
  SQL or an internal message. The log gets the full error with the `requestId`.
- The error codes and `ApiErrorResponseSchema` are in `packages/shared/src/api/errors.ts`.

### 3. Log (`lib/logger.ts`)

- Add redaction paths: `x-api-key`, `proxy-authorization`, `*.passwordHash`, `*.accessToken`,
  `*.refreshToken`, `*.connectionString`, `*.databaseUrl`, `*.cookie`, `*.authorization`, fields in `err`.
- Request serializer: method, path **without the query string**, `requestId`, IP.
- Do not write connection URLs to the log.

### 4. Health (`modules/health/routes.ts`)

- `GET /health/live`: same behavior, now with a Zod schema (`HealthLiveResponseSchema` in shared).
- `GET /health/ready`: `SELECT 1` on the pool and Redis `PING`, each with a 2 s timeout, in parallel.
  200 `{ status: 'ok', checks: { database: 'ok', redis: 'ok' } }` or
  503 `{ status: 'unavailable', checks: { database: 'fail', redis: 'ok' } }`.
  No error text, no host names, no timings.

### 5. Env variables (`config/env.ts`, `.env.example`)

- API: `DATABASE_URL`, `REDIS_URL`, `API_URL`, `CORS_ORIGINS` (list of origins: scheme, host and port
  only, no path, no `*`), `TRUST_PROXY_HOPS` (0 to 5, default 0), `RATE_LIMIT_MAX` (default 300),
  `RATE_LIMIT_WINDOW_MS` (default 60000).
- Migrate: `DATABASE_MIGRATION_URL`, `DATABASE_URL`, `NODE_ENV`.
- Tests: `TEST_DB_PROVIDER` (`local` or `neon`), and for Neon `NEON_API_KEY`, `NEON_PROJECT_ID`, `NEON_PARENT_BRANCH`.

### 6. Database adapter (`apps/api/src/db/`, `apps/api/drizzle/`)

- `client.ts`: the only file that imports `pg`. `createDb(url)` returns `{ db, pool, ping }`.
  Pool: max 10, connect timeout 5 s, idle 30 s, `application_name` from `APP_NAME`.
- `schema/index.ts`: empty for now.
- `drizzle.config.ts` uses `DATABASE_MIGRATION_URL`. Migrations are in `apps/api/drizzle/`.
- Migration `0000_db_roles.sql` (custom SQL, idempotent):
  - Make the role `app_user` if it does not exist: `NOSUPERUSER NOCREATEDB NOCREATEROLE NOBYPASSRLS NOREPLICATION`.
  - `CONNECT` on the database, `USAGE` on `public`. Default privileges: `SELECT, INSERT, UPDATE, DELETE`
    on new tables, `USAGE, SELECT` on new sequences. No DDL rights.
  - Role settings: `timezone=UTC`, `statement_timeout=15s`, `idle_in_transaction_session_timeout=30s`.
  - `admin_user` comes in Phase 4.
- `migrate.ts` (bundled to `dist/migrate.js`): connects with `DATABASE_MIGRATION_URL`, runs the Drizzle
  migrator, then sets the `app_user` password from `DATABASE_URL` (with `format('%L')`, not in the log).
  In production it stops with an error if `DATABASE_URL` does not use `app_user`, or if the role has BYPASSRLS.
  In development it writes a warning if `DATABASE_URL` uses the owner role.
- `tenant.ts`: `withTenant(db, orgId, fn)`. It validates `orgId` as a UUID, starts a transaction, runs
  `select set_config('app.org_id', $1, true)`, then runs `fn(tx)`. Phase 4 policies read
  `current_setting('app.org_id', true)::uuid`.
- `package.json`: add `drizzle` to `files`. Scripts: `db:generate`, `db:migrate`, `db:migrate:docker`.
- Railway: `apps/api/railway.json` gets `preDeployCommand: ["node dist/migrate.js"]` and the health
  check `/health/ready`. Compose gets a one-shot `migrate` service. `api` waits for it.

### 7. Redis (`apps/api/src/redis/client.ts`)

One ioredis factory: lazy connect, few retries for HTTP paths, an error listener.

### 8. OpenAPI

- `scripts/generate-openapi.ts` (`pnpm --filter @repo/api openapi`) writes `docs/api/openapi.json`.
  The title comes from `APP_NAME`.
- A unit test fails if the file in git is different from the generated file.

### 9. Test database adapter (`apps/api/test/db/`)

- Interface `TestDatabaseProvider` with `create()` and `destroy()`.
- `local-provider.ts`: Testcontainers Postgres (the same major version as the Neon project; read it from
  Neon during the build) and Testcontainers Redis. The containers stop after the run, also after a crash.
- `neon-provider.ts`: makes a branch `ci-test-<utc-time>-<random>` from `NEON_PARENT_BRANCH` through the
  Neon API, with an expiry time if the API accepts it. Deletes old `ci-test-*` branches (older than 2 hours).
  Deletes its branch in teardown and on SIGINT/SIGTERM.
- The two providers run the real migrate function, with a random `app_user` password for the run.

### 10. Tests

Unit (no network, part of `pnpm check`):

- env parsing (CORS origins, defaults, no values in errors)
- helmet headers and CSP (API and `/reference`)
- CORS: allowed origin gets the CORS headers; a different origin and its preflight get 403 with the error shape
- cookie write without `Origin` gets 403; with an allowed `Origin` it passes; bearer only passes
- 429 with the error shape and `Retry-After`
- 413 for a large body; 400 for `__proto__` and `constructor.prototype` bodies
- 400 validation shape, 404 shape, 500 shape without message and stack
- the response schema removes an unknown field (test route)
- `x-request-id` exists, and the API ignores an id from the client
- `trustProxy` hops give the correct `request.ip`
- ready check 200 and 503 with fakes, without details
- log redaction and removal of query strings
- OpenAPI file is current
- `withTenant` rejects an `orgId` that is not a UUID
- `/reference` gives 404 in production

Integration (same suite for `local` and `neon`):

- ready check 200 with a real database and Redis
- the rate limit is shared by two app instances through Redis
- migrations run two times without an error
- `app_user` has no BYPASSRLS, is not a superuser and cannot make tables
- `withTenant` with a test table that has RLS: the tenant sees only its rows; without a tenant, no rows
- ready check 503 when Redis is not available

### 11. Docs (in STE)

`docs/architecture/database.md` (new: roles, RLS and `withTenant`, migrations, test databases),
`security.md` and `overview.md` statuses, `adapters.md` (final functions of the database adapter),
`docs/api/README.md`, `docs/api/openapi.json`, `docs/api/requests/health.http`, new
`docs/api/requests/security.http`, `docs/deploy/railway.md`, `.env.example`.

## Out of scope

Auth, sessions, user and org tables, real RLS policies, `admin_user` (Phase 4). Rate limits for each
user and for auth (Phase 4). BullMQ (Phase 3). CI workflows (Phase 7).

## Dependencies (apps/api)

Runtime: `fastify-type-provider-zod`, `openapi-types` (peer), `@fastify/helmet`, `@fastify/cors`,
`@fastify/rate-limit`, `@fastify/swagger`, `@scalar/fastify-api-reference`, `fastify-plugin`,
`drizzle-orm`, `pg`. Dev: `drizzle-kit`, `@types/pg`, `@testcontainers/postgresql`, `@testcontainers/redis`.
Keep `minimumReleaseAge` and `onlyBuiltDependencies` as they are.

## Acceptance criteria

- [ ] `pnpm check` and `pnpm build` pass.
- [ ] `pnpm test:integration` passes with local containers. The containers stop after the run.
- [ ] `pnpm test:neon` passes. The Neon branch is deleted after the run, also after a failure.
- [ ] `docker compose up --build`: redis healthy, migrate exits with 0, api, worker, web and admin run.
      `/health/ready` returns 200 with the Neon `dev` branch.
- [ ] Each security layer has at least one test that passes.
- [ ] Each route has Zod schemas for input and output. `docs/api/openapi.json` agrees with the code.
- [ ] Errors do not contain stack traces, SQL, host names or internal messages.
- [ ] No secret value is in a commit, a doc or the log output.
- [ ] The owner completes the manual test checklist.

## Owner actions before the manual test

1. Make a password for `app_user`: `openssl rand -hex 24`.
2. Change `DATABASE_URL` in `.env`: user `app_user`, the new password, the same pooled host.
3. Run `pnpm --filter @repo/api db:migrate` one time against the `dev` branch.

## Changes to the plan (made during the build)

| #   | Plan                                                              | Build                                                                                                                                                                                             | Reason                                                                                                                                    |
| --- | ----------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | `createDb(url)` returns `{ db, pool, ping }`                      | It returns `{ db, ping, close }`                                                                                                                                                                  | Adapter rule 4: no `pg` type outside the adapter                                                                                          |
| 2   | Phase 4 policies read `current_setting('app.org_id', true)::uuid` | Use `nullif(current_setting('app.org_id', true), '')::uuid`                                                                                                                                       | After a `withTenant` transaction, the setting on the same pooled connection is `''`, and `''::uuid` fails. The integration tests prove it |
| 3   | One ioredis factory                                               | `createRedis(url, { profile, onError })` returns `{ connection, ping, close }`. The worker also uses it                                                                                           | Same adapter shape as the database. `ping` has a timeout                                                                                  |
| 4   | "If Redis fails, the limiter writes an error to the log"          | A small store wraps the Redis store of `@fastify/rate-limit` (`skipOnError` alone does not log)                                                                                                   | The plugin has no hook for store errors. The wrapper imports `@fastify/rate-limit/store/RedisStore.js`                                    |
| 5   | `TEST_DB_PROVIDER` selects the provider                           | The scripts use Vitest modes `test-local` and `test-neon`. `TEST_DB_PROVIDER` still works without a mode                                                                                          | Vite reserves the mode name `local`. The modes work on all operating systems                                                              |
| 6   | Neon provider: a Neon branch                                      | It also starts a Redis container. Thus `pnpm test:neon` needs Docker                                                                                                                              | The tests need a Redis. Neon has no Redis                                                                                                 |
| 7   | Postgres version from Neon                                        | `postgres:18-alpine` (owner answer on 2026-10-06)                                                                                                                                                 | The cloud session cannot connect to Neon                                                                                                  |
| 8   | CSP for `/reference` "less strict"                                | `script-src` and `style-src` `'self' 'unsafe-inline'`, `img-src` and `font-src` `'self' data:`, `connect-src 'self'`. Scalar CDN fonts, telemetry, AI chat, MCP and the developer toolbar are off | The page loads nothing from other hosts. Checked in Chromium: no CSP error                                                                |
| 9   | Helmet defaults                                                   | Also `X-Frame-Options: DENY`                                                                                                                                                                      | Agrees with `frame-ancestors 'none'`                                                                                                      |
| 10  | Error codes in the plan                                           | Also `BAD_REQUEST`, `UNAUTHORIZED`, `FORBIDDEN`, `METHOD_NOT_ALLOWED`, `NOT_ACCEPTABLE`, `REQUEST_TIMEOUT`, `CONFLICT`, `GONE`, `UNPROCESSABLE`, `REQUEST_FAILED`                                 | "A fixed message for each status" needs a code for each status                                                                            |
| 11  | Migration `0000_db_roles.sql`                                     | Also `REVOKE CREATE ON SCHEMA public FROM PUBLIC` and grants on tables that exist. It does not change the attributes of an existing role                                                          | Defense in depth. `ALTER ROLE ... NOSUPERUSER` needs a real superuser, and Neon does not give one                                         |
| 12  | `docs/api/openapi.json`                                           | Prettier ignores the file                                                                                                                                                                         | The generator writes the file. The unit test compares it with the code                                                                    |

## Automated verification (run on 2026-10-06, cloud session)

The cloud session used Node 24.21.0 and Docker 29.8 (the session started the Docker daemon).

| Check                                                                     | Result                                                                                                                                                                                                      |
| ------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `pnpm check`                                                              | 10/10 tasks pass. ESLint 0 errors, 0 warnings. Unit tests: shared 20/20, api 70/70                                                                                                                          |
| `pnpm build`                                                              | 3/3 tasks pass. The API bundle has `server.js`, `worker.js` and `migrate.js`                                                                                                                                |
| `pnpm format:check`                                                       | All files use the Prettier style                                                                                                                                                                            |
| `pnpm test:integration`                                                   | 12/12 pass in about 30 s (Postgres 18 and Redis 8 containers)                                                                                                                                               |
| Containers after the run                                                  | Removed. Ctrl+C during the setup: the two containers stopped in less than 2 s. The Ryuk reaper removes containers after a crash                                                                             |
| `pnpm --filter @repo/api deploy --prod` (the same step as the Dockerfile) | The folder has `dist/` and `drizzle/`, and no dev dependencies                                                                                                                                              |
| `node dist/migrate.js` with `NODE_ENV=production` on Postgres 18          | Exit 0. The password is not in the log. With the owner role in `DATABASE_URL`: exit 1 and "DATABASE_URL must use the role app_user in production"                                                           |
| `node dist/server.js` with `NODE_ENV=production`                          | Live 200, ready 200, HSTS sent, `/reference/` 404, other origin 403, cookie write 403. Redis stopped: ready 503 in 1 s. Redis started again: ready 200. SIGTERM: clean shutdown. No query string in the log |
| `/reference/` in Chromium (development)                                   | The page shows the two health routes. No CSP error, no request to other hosts                                                                                                                               |
| `docker compose config`                                                   | Valid                                                                                                                                                                                                       |
| `pnpm test:neon`                                                          | Not run: the cloud session cannot connect to the Neon API. A unit test checks the requests of the Neon provider with a fake `fetch`. The owner runs it (checklist step 5)                                   |
| `docker build` and `docker compose up --build`                            | Not run: the network of the session does not let builds download packages. The owner runs them (checklist steps 6 and 10)                                                                                   |

## Notes for later phases

- Phase 4: the policy of each tenant table must use `nullif(current_setting('app.org_id', true), '')::uuid`
  (refer to `docs/architecture/database.md`).
- Phase 4 or 6: server-side calls from the web and admin apps come from one IP (the Next.js server).
  The rate limit for each IP counts them together. Phase 4 adds limits for each user. Decide then if
  the server-side calls need a different key.

## Manual test checklist (owner)

Prerequisites: Docker Desktop runs. Your `.env` from Phase 1 exists. You can open the Neon console.

1. **Get the branch**
   - [ ] Run `git fetch origin` and `git checkout phase-02-api-foundation`.
   - [ ] Run `pnpm install`.
2. **Database URLs** (the owner actions above)
   - [ ] Run `openssl rand -hex 24`. Keep the value.
   - [ ] In `.env`, set `DATABASE_URL` to the **pooled** string of the `dev` branch, with the user
         `app_user` and the new password:
         `postgresql://app_user:<password>@<host>-pooler.<region>.aws.neon.tech/neondb?sslmode=require`.
   - [ ] In `.env`, set `DATABASE_MIGRATION_URL` to the **direct** owner string of the `dev` branch.
   - [ ] Add `TRUST_PROXY_HOPS=0`, `RATE_LIMIT_MAX=300` and `RATE_LIMIT_WINDOW_MS=60000` (refer to `.env.example`).
3. **Migrations**
   - [ ] Run `pnpm --filter @repo/api db:migrate`. Expect `migrations applied` and
         `password of app_user set from DATABASE_URL`. Expect no warning.
   - [ ] Run it a second time. Expect the same lines and no error.
   - [ ] In the Neon SQL editor (branch `dev`), run
         `select rolname, rolsuper, rolbypassrls, rolcreatedb from pg_roles where rolname = 'app_user';`.
         Expect one row with `f`, `f`, `f`.
4. **Checks**
   - [ ] Run `pnpm check`. Expect all tasks to pass.
   - [ ] Run `pnpm build`. Expect all tasks to pass.
5. **Integration tests**
   - [ ] Run `pnpm test:integration`. Expect 12 passed tests.
   - [ ] Wait 15 s. Run `docker ps`. Expect no `postgres`, `redis` or `ryuk` container from the test.
   - [ ] Add `NEON_API_KEY` and `NEON_PROJECT_ID` to `.env`. Run `pnpm test:neon`. Expect 12 passed tests.
   - [ ] In the Neon console, open Branches. Expect no `ci-test-*` branch.
   - [ ] Optional: run `pnpm test:neon` again and press Ctrl+C when you see "making a neon test database".
         Wait 30 s. Expect no new `ci-test-*` branch in the Neon console (if one stays, the next run deletes it after 2 hours).
6. **Docker Compose**
   - [ ] Run `docker compose down`, then `docker compose up --build`.
   - [ ] Run `docker compose ps -a`. Expect `migrate` with "Exited (0)", and `redis` (healthy), `api`,
         `worker`, `web` and `admin` running.
   - [ ] Run `docker compose logs migrate`. Expect `migrations applied`. Expect no password and no URL.
7. **Health**
   - [ ] Open http://localhost:4000/health/ready. Expect `{"status":"ok","checks":{"database":"ok","redis":"ok"}}`.
   - [ ] Run `docker compose stop redis`. Refresh. Expect status 503 and `"redis":"fail"`, with no error text.
   - [ ] Run `docker compose start redis`. Refresh after some seconds. Expect `ok` again.
   - [ ] Open http://localhost:3000 and http://localhost:3001. Expect the API status **up**.
8. **Security requests**
   - [ ] Run each request in `docs/api/requests/security.http` and `docs/api/requests/health.http`.
         Each request has its expected result in the comment above it.
   - [ ] Rate limit: set `RATE_LIMIT_MAX=3` in `.env`, run `docker compose up -d --force-recreate api`,
         and send `GET /health/ready` 4 times. Expect 429 `RATE_LIMITED` with `Retry-After` on the 4th.
         Set the value back to 300 and recreate `api` again.
9. **API reference and logs**
   - [ ] Open http://localhost:4000/reference/. Expect the reference page with the two health routes.
         Open the browser console. Expect no Content Security Policy error.
   - [ ] Open http://localhost:4000/health/live?token=abc123. Run `docker compose logs api | grep abc123`.
         Expect no result.
10. **Production image**
    - [ ] Run `docker build -f apps/api/Dockerfile -t api-prod .`. Expect success.
    - [ ] Run `docker run --rm --env-file .env -e NODE_ENV=production api-prod node dist/migrate.js`.
          Expect `migrations applied` (the image contains the `drizzle` folder).
11. **Docs**
    - [ ] Read `docs/architecture/database.md`, `docs/architecture/security.md` and `docs/api/README.md`.
          Tell me where the text is not clear.
12. **Shut down**
    - [ ] Run `docker compose down`.

## Sign-off

- Confirmed by:
- Date:
