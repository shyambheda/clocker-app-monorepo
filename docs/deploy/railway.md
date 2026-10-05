# Deploy to Railway

Use one Railway project. Select the same region as the Neon project.
All services deploy from this one GitHub repository. Full CI/CD gates arrive in Phase 7.
The examples use `example.com`. Use the domain of your product.

## Services

| Service  | Config file (Settings > Config-as-code) | Start                 | Health check   | Custom domain        |
| -------- | --------------------------------------- | --------------------- | -------------- | -------------------- |
| `api`    | `apps/api/railway.json`                 | `node dist/server.js` | `/health/live` | api.example.com      |
| `worker` | `apps/api/railway.worker.json`          | `node dist/worker.js` | none (no HTTP) | none                 |
| `web`    | `apps/web/railway.json`                 | image default         | `/`            | app.example.com      |
| `admin`  | `apps/admin/railway.json`               | image default         | `/`            | admin.example.com    |
| `redis`  | Railway Redis template                  |                       |                | private network only |

Keep the **Root Directory empty** for each service (the build context is the repository root).
The Dockerfiles need the full workspace. They use `turbo prune` to keep only what each app needs.

## Watch paths

Each config sets `watchPatterns`. Thus a push deploys only the services whose code changed:

- `api` and `worker`: `apps/api/**`, `packages/**`, `pnpm-lock.yaml`
- `web`: `apps/web/**`, `packages/**`, `pnpm-lock.yaml`
- `admin`: `apps/admin/**`, `packages/**`, `pnpm-lock.yaml`

## Redis settings

Set these on the Railway Redis service:

- `maxmemory-policy noeviction`. Then Redis does not delete queued jobs.
- Persistence (AOF) on.
- Do not make Redis public. The services connect through the private network with `REDIS_URL`
  (reference variable `${{redis.REDIS_URL}}`).

## Variables for each service

| Variable                                                                      | api                   | worker | web | admin |
| ----------------------------------------------------------------------------- | --------------------- | ------ | --- | ----- |
| `NODE_ENV=production`, `LOG_LEVEL`                                            | yes                   | yes    |     |       |
| `APP_NAME`                                                                    | yes                   | yes    |     |       |
| `NEXT_PUBLIC_APP_NAME` (used at build time)                                   |                       |        | yes | yes   |
| `PORT=4000`, `HOST=::` (IPv4 + IPv6, so that the private network can connect) | yes                   |        |     |       |
| `REDIS_URL`                                                                   | yes                   | yes    |     |       |
| `DATABASE_URL` (Phase 2)                                                      | yes                   | yes    |     |       |
| `DATABASE_MIGRATION_URL` (Phase 2)                                            | yes (pre-deploy only) |        |     |       |
| `APP_URL`, `ADMIN_URL`, `API_URL`, `CORS_ORIGINS`, `COOKIE_DOMAIN`            | yes                   |        |     |       |
| `BETTER_AUTH_SECRET` (Phase 4)                                                | yes                   |        |     |       |
| `RESEND_API_KEY`, `EMAIL_FROM` (Phase 3)                                      |                       | yes    |     |       |
| `LEMONSQUEEZY_*` (Phase 5)                                                    | yes                   |        |     |       |
| `API_INTERNAL_URL=http://api.railway.internal:4000`                           |                       |        | yes | yes   |

Do not set `NEON_API_KEY` in Railway.

`NEXT_PUBLIC_APP_NAME` goes into the web and admin builds. After you change it, deploy web and admin again.

## Migrations (Phase 2)

The `api` service runs the migrations in its pre-deploy command, before the new version gets traffic.
The worker does not run migrations.

## Custom domains and DNS

Add each custom domain in the Networking settings of the service. Then add the CNAME records that
Railway shows at your DNS provider. Railway issues the TLS certificates automatically.
