# Adapters for external services

Each external service has one adapter module. Refer to decision [0010](../decisions/0010-adapters-for-external-services.md).

## Rules

1. Only the adapter imports the client library of the provider (for example `pg`, `resend`).
2. The other code imports only the functions of the adapter.
3. The adapter reads its configuration from validated env variables.
4. The adapter returns our own types and our own errors, not the types of the provider.
5. Each adapter has a fake or a test provider. Unit tests do not need the real service.

## Adapters

| Service        | Module                  | Functions for the other code (target)                      | Default provider             | Built in |
| -------------- | ----------------------- | ---------------------------------------------------------- | ---------------------------- | -------- |
| Database       | `apps/api/src/db/`      | `db` (Drizzle), `withTenant(orgId, fn)`, `ping()`          | Neon through the `pg` driver | Phase 2  |
| Test databases | `apps/api/test/db/`     | `create()`, `destroy()`                                    | Local Postgres + Neon branch | Phase 2  |
| Email          | `apps/api/src/email/`   | `sendEmail(message)`                                       | Resend, console in dev       | Phase 3  |
| Billing        | `apps/api/src/billing/` | `createCheckout()`, `getSubscription()`, `verifyWebhook()` | Lemon Squeezy                | Phase 5  |
| Storage        | `apps/api/src/storage/` | `put()`, `getUploadUrl()`, `getDownloadUrl()`, `delete()`  | Neon storage                 | Later    |

The function names are targets. The phase that builds an adapter writes its final functions on this page.

## How to change a provider

### Database

- Another Postgres host (local, RDS, Supabase, Railway Postgres): change `DATABASE_URL` and
  `DATABASE_MIGRATION_URL`. Do not change the code. The `pg` driver supports all Postgres hosts.
- Only `apps/api/src/db/client.ts` imports the driver. Change this file if you need a different driver.
- A database that is not Postgres (for example MySQL): not supported. Row Level Security and the
  Drizzle schemas are specific to Postgres. This needs a new data layer.

### Test databases

- Add a provider file in `apps/api/test/db/` that implements `create()` and `destroy()`.
- Select it with `TEST_DB_PROVIDER`.

### Email, billing, storage

- Write a new file in the adapter module that implements the same functions.
- Select the provider with an env variable of the adapter.
- Add the new env variables to `.env.example` and to `apps/api/src/config/env.ts`.

## Status

No adapter exists yet. Phase 2 builds the database adapter and the test database adapter.
