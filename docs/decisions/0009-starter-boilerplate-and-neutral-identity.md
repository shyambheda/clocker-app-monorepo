# 0009: Starter boilerplate with a neutral identity

- Status: Accepted (Phase 1)

## Context

The repository started as the base for one product. The owner wants to start many SaaS products
from the same base. Each product needs its own name, domains and email sender. A product must also
be able to get later improvements from the starter.

## Decision

- The repository is a neutral starter (`saas-starter-monorepo`). It does not contain a product name.
- All workspace packages use the scope `@repo/*`. Products keep this scope.
- Configuration supplies the product identity:
  - API and worker: `APP_NAME`.
  - Web and admin: `NEXT_PUBLIC_APP_NAME`. Next.js puts this value into the build.
  - URLs, CORS origins, cookie domain and email sender: env variables in `.env.example`.
- `DEFAULT_APP_NAME` and `resolveAppName` in `@repo/shared` supply the default name `SaaS Starter`.
- Docs use `example.com` as a placeholder domain.
- A new product is a clone of the starter. [ADOPTING.md](../ADOPTING.md) gives the steps.

## Consequences

- A new product changes env variables, not code, to set its identity.
- Because the package names do not change, changes from the starter merge into a product with fewer conflicts.
- A change to `NEXT_PUBLIC_APP_NAME` needs a new build of web and admin.
