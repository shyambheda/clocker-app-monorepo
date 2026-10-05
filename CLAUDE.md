# SaaS starter: working rules for this repository

Read this file fully before doing any work. It defines how this project is built, tested and documented.

## Product in one paragraph

This repository is a private **SaaS starter**: a multi-tenant foundation that new products are cloned from.
It has no product name of its own. Identity (name, domains, email sender) comes from env variables, and
docs use `example.com` placeholders. **Platform staff** run the business in `apps/admin` (admin.example.com).
**Customers** are organizations (orgs) on a paid plan; their owners/admins/staff use `/portal` in `apps/web`
(app.example.com). **End users** belong to one or more orgs and use `/panel`. One user account (unique email)
can hold different roles in different orgs. Build generic SaaS foundations only, unless a phase plan says
otherwise. A product cloned from the starter replaces this paragraph with its own description
(see `docs/ADOPTING.md`).

## Git rules (strict)

- Never add AI attribution anywhere: no `Co-Authored-By` trailers, no tool or session links, no
  mention of AI assistants in branch names, commit messages, PR titles, PR bodies, or code comments.
- Commits are authored by the repository owner's git identity, set in the repo-local git config.
  In a cloud session the container's global git identity is not the owner's: run
  `git config user.name "Shyam Bheda"` and `git config user.email "shyambheda89@gmail.com"` in the
  clone and check `git config user.email` before every commit.
- One branch and one pull request per phase, named `phase-NN-<slug>` (e.g. `phase-02-api-foundation`).
- Never push to `main` directly. The owner merges PRs after sign-off.

## Commands

```bash
docker compose up --build   # full local stack (web, admin, api, worker, redis)
pnpm install
pnpm dev                    # all apps in watch mode
pnpm check                  # lint + typecheck + unit tests (must pass before every commit)
pnpm build
pnpm format                 # prettier
```

## Stack (see docs/decisions for the reasons)

- Node 24 LTS, TypeScript strict, pnpm workspaces + Turborepo.
- API: Fastify 5 + Zod. Worker: same package, `src/worker.ts`, BullMQ on Redis (Phase 3). Redis is required.
- Web/admin: Next.js App Router, standalone output.
- DB: Neon Postgres via Drizzle and the `pg` driver (Phase 2). Neon branch `dev` for development, `main`
  for production. No Postgres container for development. Tests use disposable databases: a local Postgres
  container (`pnpm test:integration`) or a Neon branch (`pnpm test:neon`).
- Auth: self-managed Better Auth inside the API (Phase 4). Email: Resend. Billing: Lemon Squeezy.
  Storage: Neon storage (later).
- Hosting: Railway, in the same region as the Neon project.

## Conventions

- Workspace packages are named `@repo/<name>` and ship TypeScript source. Never rename the scope: products
  keep it so starter updates merge cleanly. The API bundles them with tsup, Next.js transpiles them
  (`transpilePackages`).
- Shared contracts (Zod schemas, roles, product identity, time utilities) live in `packages/shared`.
  Never duplicate them in an app.
- External services sit behind adapters (`docs/architecture/adapters.md`): only the adapter module imports
  the provider's library; all other code calls the adapter's functions.
- Product identity comes from env (`APP_NAME`, `NEXT_PUBLIC_APP_NAME`, URLs). Never hardcode a product
  name or domain.
- Every API route declares Zod schemas for its input **and** output.
- Every process validates its environment at boot (`apps/api/src/config/env.ts`) and fails fast.
- Import style: no file extensions (`moduleResolution: Bundler`), type-only imports use `import type`.
- Formatting: Prettier (no semicolons, single quotes, width 100). ESLint must pass with zero errors.

## Writing style

- Everything in `docs/`, code comments, commit messages, and PR titles and bodies use ASD-STE100
  Simplified Technical English as much as practical. Rules and glossary: `docs/STYLE.md`. Clarity
  wins over strict compliance. There is no linter for it.
- `README.md` and this file use plain, simple English.
- Never use em dashes anywhere.

## Security rules (non-negotiable)

- Never commit secrets. `.env` is git-ignored. Only `.env.example` (no real values) is committed.
- Validate all input with Zod. Never trust client-sent IDs for tenancy: derive the org from the session.
- All tenant data access goes through `withTenant(orgId, ...)` so Postgres RLS applies (from Phase 2/4).
  Only the admin module may use the RLS-bypassing DB role, and every admin action is audit-logged.
- Never log credentials, tokens, cookies or personal data. The logger redacts known paths: extend the
  list in `apps/api/src/lib/logger.ts` when new sensitive fields appear.
- Errors returned to clients never include stack traces, SQL, or internal identifiers.
- Containers run as non-root. Keep `pnpm-workspace.yaml` supply-chain settings (`onlyBuiltDependencies`,
  `minimumReleaseAge`) in place.
- Job payloads carry IDs only, never secrets or full records.

## Time rules

- Store every instant as UTC (`timestamptz`). The API sends and receives ISO 8601 strings with `Z`.
- Timezones are IANA names (`Asia/Kolkata`), never fixed offsets. Use `TimeZoneSchema` for validation.
- Display zone = user override, otherwise active org zone (`effectiveTimeZone`). Format with
  `formatInTimeZone` from `@repo/shared`. Never format dates with ad-hoc code.
- Recurring schedules store `cron + tz`. See docs/architecture/timezones.md.

## The phase loop (how every piece of work is delivered)

1. **Plan**: write `docs/phases/phase-NN-<slug>.md` (goal, scope, out of scope, acceptance criteria,
   files to touch). Get the owner's approval before building.
2. **Build** on branch `phase-NN-<slug>`. Write automated tests alongside the code.
3. **Verify**: `pnpm check`, `pnpm build`, `docker compose up --build`, plus any phase-specific checks.
   Record results in the phase doc. In a cloud session, run what the sandbox allows and say clearly
   which checks the owner must run locally.
4. **Report**: give the owner the test results and a **manual test checklist** (exact steps, `.http`
   requests from `docs/api/requests/`, and expected results). Push the branch.
5. **Iterate** on reported issues until the owner confirms everything works.
6. **Close** the phase only after explicit confirmation, using `/phase-done` (see
   `.claude/skills/phase-done/SKILL.md`): update all docs, mark the phase done in the roadmap,
   update the changelog, commit, and open the PR.

## Documentation map (keep it current)

| File                            | Update when                                                     |
| ------------------------------- | --------------------------------------------------------------- |
| `docs/ROADMAP.md`               | phase status changes                                            |
| `docs/phases/phase-NN-*.md`     | planning, verification results, manual checklist, sign-off      |
| `docs/architecture/*.md`        | a phase changes architecture, security layers, or data model    |
| `docs/architecture/adapters.md` | an adapter is added or its functions change                     |
| `docs/decisions/NNNN-*.md`      | a significant technical choice is made or reversed              |
| `docs/api/`                     | routes change (OpenAPI spec is generated from Zod from Phase 2) |
| `docs/STYLE.md`                 | a new technical term is used (glossary)                         |
| `docs/ADOPTING.md`              | the steps to start a product change                             |
| `docs/CHANGELOG.md`             | a phase closes                                                  |
| `.env.example`                  | an environment variable is added, changed or removed            |
