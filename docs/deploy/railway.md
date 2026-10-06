# Deploy to Railway

Use one Railway project. Select the same region as the Neon project.
All services deploy from this one GitHub repository. Full CI/CD gates arrive in Phase 7.
The examples use `example.com`. Use the domain of your product.

## Services

| Service  | Config file (Settings > Config-as-code) | Start                 | Health check    | Custom domain        |
| -------- | --------------------------------------- | --------------------- | --------------- | -------------------- |
| `api`    | `apps/api/railway.json`                 | `node dist/server.js` | `/health/ready` | api.example.com      |
| `worker` | `apps/api/railway.worker.json`          | `node dist/worker.js` | none (no HTTP)  | none                 |
| `web`    | `apps/web/railway.json`                 | image default         | `/`             | app.example.com      |
| `admin`  | `apps/admin/railway.json`               | image default         | `/`             | admin.example.com    |
| `redis`  | Railway Redis template                  |                       |                 | private network only |

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
| `DATABASE_URL` (role `app_user`, pooled host)                                 | yes                   | yes    |     |       |
| `DATABASE_MIGRATION_URL` (owner role, direct host)                            | yes (pre-deploy only) |        |     |       |
| `APP_URL`, `ADMIN_URL`, `API_URL`, `CORS_ORIGINS`, `COOKIE_DOMAIN`            | yes                   |        |     |       |
| `TRUST_PROXY_HOPS=1`, `RATE_LIMIT_MAX`, `RATE_LIMIT_WINDOW_MS`                | yes                   |        |     |       |
| `BETTER_AUTH_SECRET` (Phase 4)                                                | yes                   |        |     |       |
| `RESEND_API_KEY`, `EMAIL_FROM` (Phase 3)                                      |                       | yes    |     |       |
| `LEMONSQUEEZY_*` (Phase 5)                                                    | yes                   |        |     |       |
| `API_INTERNAL_URL=http://api.railway.internal:4000`                           |                       |        | yes | yes   |

Do not set `NEON_API_KEY` in Railway.

`NEXT_PUBLIC_APP_NAME` goes into the web and admin builds. After you change it, deploy web and admin again.

## Migrations

The `api` service runs `node dist/migrate.js` in its pre-deploy command (`preDeployCommand` in
`apps/api/railway.json`). The command runs before the new version gets traffic. If it fails, Railway
does not deploy the new version. The worker does not run migrations.

In production, the migrate script stops with an error in these conditions:

- `DATABASE_URL` does not use the role `app_user`.
- The role `app_user` is a superuser or has `BYPASSRLS`.

The script sets the password of `app_user` from `DATABASE_URL` on each deploy. To change the password,
change `DATABASE_URL` in Railway and deploy again. Refer to [database.md](../architecture/database.md).

## Health checks

- Railway uses `/health/ready` for the deploy health check. A new version gets traffic only when it can
  connect to the database and Redis.
- The Docker `HEALTHCHECK` in the image uses `/health/live`. A database or Redis outage does not make
  Docker restart a healthy container.

## Proxy hops

Railway puts one proxy in front of each service. Set `TRUST_PROXY_HOPS=1`. Then `request.ip` is the
client IP from the last entry of `X-Forwarded-For`, and a client cannot choose its IP for the rate
limit. If you add a CDN in front of Railway, add one hop for it.

## Custom domains and DNS

Add each custom domain in the Networking settings of the service. Then add the CNAME records that
Railway shows at your DNS provider. Railway issues the TLS certificates automatically.
