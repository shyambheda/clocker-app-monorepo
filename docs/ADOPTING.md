# Start a new product from the starter

This guide gives the steps to start a new SaaS product from this starter.
The examples use `acme` as the product and `acme.com` as the domain. Use your own values.

## 1. Make the repository

1. Make a new empty private repository on GitHub, for example `acme-app`.
2. Clone the starter and connect it to the new repository:

   ```bash
   git clone https://github.com/<owner>/saas-starter-monorepo.git acme-app
   cd acme-app
   git remote rename origin starter
   git remote add origin https://github.com/<owner>/acme-app.git
   git push -u origin main
   ```

3. To get changes from the starter later, merge them:

   ```bash
   git fetch starter
   git merge starter/main
   ```

Do not rename the `@repo/*` packages. Then the merges from the starter have fewer conflicts.

## 2. Set the product identity

1. Copy the env template: `cp .env.example .env`.
2. Set these values in `.env`:

   | Variable               | Example                         |
   | ---------------------- | ------------------------------- |
   | `APP_NAME`             | `Acme`                          |
   | `NEXT_PUBLIC_APP_NAME` | `Acme`                          |
   | `EMAIL_FROM`           | `Acme <no-reply@mail.acme.com>` |

3. Change the root `package.json` name to the name of the product.
4. Change the Compose project name in `docker-compose.yml`, or set `COMPOSE_PROJECT_NAME`.
5. Write the product description in `README.md` and in the "Product" section of `CLAUDE.md`.

## 3. Make the services

1. Neon: make a project in the region of your users. Make the branch `dev` from `main`.
   Put the connection strings in `.env` (refer to `.env.example`). For `DATABASE_URL`, use the user
   `app_user` and a new password (`openssl rand -hex 24`). Then run
   `pnpm --filter @repo/api db:migrate`. The script makes `app_user` and sets its password.
   Refer to [architecture/database.md](architecture/database.md).
2. Resend (Phase 3): verify the sending domain `mail.acme.com`.
3. Lemon Squeezy (Phase 5): make a store and an API key.
4. Railway: make the services. Refer to [deploy/railway.md](deploy/railway.md).

## 4. Run the product locally

```bash
docker compose up --build
```

Open http://localhost:3000. The page shows the value of `NEXT_PUBLIC_APP_NAME`.

## 5. Production domains

| Host             | Service |
| ---------------- | ------- |
| `app.acme.com`   | web     |
| `admin.acme.com` | admin   |
| `api.acme.com`   | api     |
| `mail.acme.com`  | Resend  |

Set `APP_URL`, `ADMIN_URL`, `API_URL`, `CORS_ORIGINS` and `COOKIE_DOMAIN` (`.acme.com`) in Railway.

## 6. Change a provider (optional)

To use a different database host, email provider, billing provider or storage, refer to
[architecture/adapters.md](architecture/adapters.md).

## 7. Product documentation

- Keep the starter docs as a base. Add product decisions as new records in `docs/decisions/`.
- Start the product phases after the last starter phase that you use. Update `docs/ROADMAP.md`.
