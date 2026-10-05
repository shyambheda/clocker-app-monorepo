# 0010: Adapters for external services

- Status: Accepted (Phase 1, implementation from Phase 2)

## Context

The starter uses Neon (database and storage), Resend (email) and Lemon Squeezy (billing).
A product that starts from the starter can need a different provider. If provider code is in many
files, a change of provider is slow and risky.

## Decision

Each external service has one adapter module. Only the adapter imports the client library of the
provider. All other code uses only the functions of the adapter. A product that changes the provider
writes a new adapter with the same functions and changes the configuration.

| Service        | Adapter (target location) | Default provider      | Phase |
| -------------- | ------------------------- | --------------------- | ----- |
| Database       | `apps/api/src/db/`        | Neon (`pg` driver)    | 2     |
| Test databases | `apps/api/test/db/`       | Local Postgres + Neon | 2     |
| Email          | `apps/api/src/email/`     | Resend + console      | 3     |
| Billing        | `apps/api/src/billing/`   | Lemon Squeezy         | 5     |
| Storage        | `apps/api/src/storage/`   | Neon storage          | Later |

Details: [adapters.md](../architecture/adapters.md).

## Consequences

- A change of provider touches one module and the env variables.
- Tests can use a fake adapter.
- The database adapter supports only Postgres-compatible databases. Row Level Security and the
  Drizzle schemas are specific to Postgres. A different database engine needs a new data layer.
