# Deploying to Railway

One Railway project, region **Southeast Asia (Singapore)** to match the Neon project (AWS ap-southeast-1).
All services deploy from this one GitHub repository. Full CI/CD gating arrives in Phase 6.

## Services

| Service  | Config file (Settings > Config-as-code) | Start                 | Health check   | Custom domain        |
| -------- | --------------------------------------- | --------------------- | -------------- | -------------------- |
| `api`    | `apps/api/railway.json`                 | `node dist/server.js` | `/health/live` | api.getclocker.app   |
| `worker` | `apps/api/railway.worker.json`          | `node dist/worker.js` | none (no HTTP) | none                 |
| `web`    | `apps/web/railway.json`                 | image default         | `/`            | app.getclocker.app   |
| `admin`  | `apps/admin/railway.json`               | image default         | `/`            | admin.getclocker.app |
| `redis`  | Railway Redis template                  |                       |                | private network only |

Leave each service's **Root Directory empty** (build context = repo root). The Dockerfiles need the whole
workspace and use `turbo prune` to keep only what each app needs.

## Watch paths

Each config sets `watchPatterns`, so a push only redeploys the services whose code changed:

- `api` and `worker`: `apps/api/**`, `packages/**`, `pnpm-lock.yaml`
- `web`: `apps/web/**`, `packages/**`, `pnpm-lock.yaml`
- `admin`: `apps/admin/**`, `packages/**`, `pnpm-lock.yaml`

## Redis settings

Set on the Railway Redis service:

- `maxmemory-policy noeviction`, so queued jobs are never evicted.
- Persistence (AOF) enabled.
- Do not expose it publicly. Services connect over the private network via `REDIS_URL`
  (reference variable `${{redis.REDIS_URL}}`).

## Variables per service

| Variable                                                                           | api                   | worker | web | admin |
| ---------------------------------------------------------------------------------- | --------------------- | ------ | --- | ----- |
| `NODE_ENV=production`, `LOG_LEVEL`                                                 | yes                   | yes    |     |       |
| `PORT=4000`, `HOST=::` (listen on IPv4 + IPv6 so the private network can reach it) | yes                   |        |     |       |
| `REDIS_URL`                                                                        | yes                   | yes    |     |       |
| `DATABASE_URL` (Phase 1)                                                           | yes                   | yes    |     |       |
| `DATABASE_MIGRATION_URL` (Phase 1)                                                 | yes (pre-deploy only) |        |     |       |
| `APP_URL`, `ADMIN_URL`, `API_URL`, `CORS_ORIGINS`, `COOKIE_DOMAIN`                 | yes                   |        |     |       |
| `BETTER_AUTH_SECRET` (Phase 3)                                                     | yes                   |        |     |       |
| `RESEND_API_KEY`, `EMAIL_FROM` (Phase 2)                                           |                       | yes    |     |       |
| `LEMONSQUEEZY_*` (Phase 4)                                                         | yes                   |        |     |       |
| `API_INTERNAL_URL=http://api.railway.internal:4000`                                |                       |        | yes | yes   |

Never set `NEON_API_KEY` in Railway.

## Migrations (Phase 1)

The `api` service runs migrations in its pre-deploy command, before the new version takes traffic.
The worker never runs migrations.

## Custom domains and DNS

Add each custom domain in the service's Networking settings, then create the CNAME records Railway shows
at your DNS provider. TLS certificates are issued automatically.
