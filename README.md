# Clocker

Multi-tenant SaaS platform at [getclocker.app](https://getclocker.app).

| Audience                                | App                     | URL (prod)                        |
| --------------------------------------- | ----------------------- | --------------------------------- |
| Customers (org owners, admins, staff)   | `apps/web` at `/portal` | https://app.getclocker.app/portal |
| End users (members of one or more orgs) | `apps/web` at `/panel`  | https://app.getclocker.app/panel  |
| Platform staff                          | `apps/admin`            | https://admin.getclocker.app      |
| API (all clients)                       | `apps/api`              | https://api.getclocker.app        |

## Repository layout

```
apps/
  api/        Fastify API + background worker (TypeScript)
  web/        Next.js app: /portal and /panel
  admin/      Next.js platform admin app
  mobile/     reserved for the mobile app (later)
packages/
  shared/     API contracts (Zod), roles, timezone utilities. Used by every app
  config/     shared TypeScript / ESLint presets
docs/         architecture, decisions, phases, API spec, deployment
```

## Quick start (Docker)

Requirements: Docker Desktop (or Docker Engine with Compose v2).

```bash
cp .env.example .env          # then fill in the values you have
docker compose up --build
```

| Service | URL                                             |
| ------- | ----------------------------------------------- |
| web     | http://localhost:3000                           |
| admin   | http://localhost:3001                           |
| api     | http://localhost:4000/health/live               |
| worker  | no port, check `docker compose logs worker`     |
| redis   | localhost:6379 (password from `REDIS_PASSWORD`) |

There is no local Postgres. Development uses a Neon `dev` branch (see `.env.example`).
Code changes in `apps/*` and `packages/shared` hot reload inside the containers. Rebuild
(`docker compose up --build`) after changing dependencies.

## Without Docker

Requirements: Node 24 (`.nvmrc`), pnpm via Corepack (`corepack enable`), and a Redis instance.

```bash
pnpm install
pnpm dev            # runs every app in watch mode (Turborepo)
pnpm check          # lint + typecheck + test for every package
pnpm build          # production builds
```

## Documentation

- [Roadmap and phase status](docs/ROADMAP.md)
- [Architecture overview](docs/architecture/overview.md)
- [Security model](docs/architecture/security.md)
- [Timezone rules](docs/architecture/timezones.md)
- [Decision records](docs/decisions/README.md)
- [Deploying to Railway](docs/deploy/railway.md)
- [API docs](docs/api/README.md)
- [Changelog](docs/CHANGELOG.md)
