# Architecture overview

The examples on this page use `example.com`. Each product uses its own domain.

## System

```mermaid
flowchart LR
  subgraph Clients
    W[Browser: app.example.com<br/>/portal + /panel]
    A[Browser: admin.example.com]
    M[Mobile app<br/>later]
  end

  subgraph Railway [Railway]
    WEB[web<br/>Next.js]
    ADM[admin<br/>Next.js]
    API[api<br/>Fastify]
    WRK[worker<br/>BullMQ]
    R[(Redis)]
  end

  N[(Neon Postgres)]
  S[(Neon storage<br/>later)]
  E[Resend<br/>mail.example.com]
  LS[Lemon Squeezy]

  W --> WEB
  A --> ADM
  W -- API calls + session cookie --> API
  A -- API calls + session cookie --> API
  M -- bearer token --> API
  WEB -- server-side calls --> API
  ADM -- server-side calls --> API
  API --> N
  API --> R
  API -- enqueue jobs --> R
  WRK -- get jobs --> R
  WRK --> N
  WRK --> E
  API -. signed URLs, later .-> S
  LS -- webhooks --> API
```

Only the API and the worker connect to the database. The frontends do not have database credentials.

## Adapters

Each external service (database, storage, email, billing) has one adapter module.
The other code uses only the functions of the adapter. Thus a product can replace a service and
change only one module. Refer to [adapters.md](adapters.md).

## Audiences and identity

| Audience       | Where                             | Access decided by                                                  |
| -------------- | --------------------------------- | ------------------------------------------------------------------ |
| Platform staff | `apps/admin` on admin.example.com | `users.platform_role` (support / admin / superadmin), MFA required |
| Customers      | `/portal` in `apps/web`           | org role `owner`, `admin` or `staff` in the active org             |
| End users      | `/panel` in `apps/web`            | org role `member` in the active org                                |

- Each email address has one account. A user can be a member of many orgs, with a different role in each org.
- Platform roles are separate from org roles. Thus no customer action can give platform access.
- Members join through email invites or a CSV import from the portal (Phase 4).

## API namespaces (target)

| Prefix         | Who                   | Notes                                     |
| -------------- | --------------------- | ----------------------------------------- |
| `/health/*`    | platform              | liveness and readiness                    |
| `/auth/*`      | everyone              | Better Auth (Phase 4)                     |
| `/v1/me/*`     | signed-in users       | profile, zone override, my orgs           |
| `/v1/portal/*` | org owner/admin/staff | for the active org only                   |
| `/v1/panel/*`  | org members           | for the active org only                   |
| `/v1/admin/*`  | platform staff        | all tenants, each action in the audit log |
| `/webhooks/*`  | providers             | signature check, no session               |

## Domains

| Host                     | Service                                 |
| ------------------------ | --------------------------------------- |
| app.example.com          | web                                     |
| admin.example.com        | admin                                   |
| api.example.com          | api                                     |
| `<org-slug>`.example.com | web, one subdomain for each org (later) |
| mail.example.com         | Resend sending domain (DNS only)        |

Use HTTPS on all hosts. The session cookie domain is `.example.com` (Phase 4).

## Monorepo

| Path              | Purpose                                                                                     |
| ----------------- | ------------------------------------------------------------------------------------------- |
| `apps/api`        | Fastify API (`src/server.ts`) and worker (`src/worker.ts`). One image, two Railway services |
| `apps/web`        | Next.js: portal and panel                                                                   |
| `apps/admin`      | Next.js: platform admin                                                                     |
| `apps/mobile`     | Reserved                                                                                    |
| `packages/shared` | Zod contracts, roles, product identity, timezone utilities                                  |
| `packages/config` | tsconfig and ESLint presets                                                                 |

All workspace packages use the scope `@repo/*`. A product keeps this scope. Thus a product does not
rename packages, and changes from the starter merge easily.

Tools: pnpm workspaces link the packages. Turborepo runs the tasks in the dependency order and keeps a cache.
The Dockerfiles use `turbo prune`. Thus each image contains only its app and its dependencies.

## Environments

| Env        | Database                                                         | Redis                   | Where                  |
| ---------- | ---------------------------------------------------------------- | ----------------------- | ---------------------- |
| Local      | Neon branch `dev`                                                | Docker `redis:8-alpine` | Docker Compose         |
| Tests      | Disposable local Postgres container, or a disposable Neon branch | Disposable container    | local / GitHub Actions |
| Production | Neon branch `main`                                               | Railway Redis           | Railway                |

## Current state (Phase 2)

- The API has the security layers of [security.md](security.md): security headers, origin allowlist and
  CORS, origin check for cookie writes, rate limits in Redis, body limits, Zod validation of input and
  output, and one error shape.
- Routes: `GET /health/live` and `GET /health/ready` (database and Redis). The OpenAPI document comes
  from the Zod schemas (`docs/api/openapi.json`). The reference UI is at `/reference` in development.
- The database adapter connects to Neon with the `pg` driver and Drizzle. The runtime role is
  `app_user`. `withTenant` binds a transaction to one org. Refer to [database.md](database.md).
- The worker connects to Redis. The web and admin apps show the API status and timezone formats.

Refer to the [ROADMAP](../ROADMAP.md) for the work of each phase.
