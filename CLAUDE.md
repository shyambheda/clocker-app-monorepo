# Clocker: working rules for this repository

Read this file fully before doing any work. It defines how this project is built, tested and documented.

## Product in one paragraph

Clocker (getclocker.app) is a multi-tenant SaaS. **Platform staff** run the business in `apps/admin`
(admin.getclocker.app). **Customers** are organizations (orgs) on a paid plan; their owners/admins/staff
use `/portal` in `apps/web` (app.getclocker.app). **End users** belong to one or more orgs and use `/panel`.
One user account (unique email) can hold different roles in different orgs. The core business domain is
not defined yet: build generic SaaS foundations only, unless a phase plan says otherwise.

## Git rules (strict)

- Never add AI attribution anywhere: no `Co-Authored-By` trailers, no tool or session links, no
  mention of AI assistants in branch names, commit messages, PR titles, PR bodies, or code comments.
- Commits are authored by the repository owner's git identity (configure it locally in the clone).
- One branch and one pull request per phase, named `phase-NN-<slug>` (e.g. `phase-01-api-foundation`).
- Never push to `main` directly. The owner merges PRs after sign-off.

## Commands

```bash
docker compose up --build   # full local stack (web, admin, api, worker, redis)
pnpm install
pnpm dev                    # all apps in watch mode
pnpm check                  # lint + typecheck + test (must pass before every commit)
pnpm build
pnpm format                 # prettier
```

## Stack (see docs/decisions for the reasons)

- Node 24 LTS, TypeScript strict, pnpm workspaces + Turborepo.
- API: Fastify 5 + Zod. Worker: same package, `src/worker.ts`, BullMQ on Redis (Phase 2).
- Web/admin: Next.js App Router, standalone output.
- DB: Neon Postgres via Drizzle (Phase 1). No local Postgres. Tests use a throwaway Neon branch per run.
- Auth: self-managed Better Auth inside the API (Phase 3). Email: Resend. Billing: Lemon Squeezy.
- Hosting: Railway (Singapore). Neon project in AWS ap-southeast-1.

## Conventions

- Workspace packages are named `@clocker/<name>` and ship TypeScript source. The API bundles them with tsup,
  Next.js transpiles them (`transpilePackages`).
- Shared contracts (Zod schemas, roles, time utilities) live in `packages/shared`. Never duplicate them in an app.
- Every API route declares Zod schemas for its input **and** output.
- Every process validates its environment at boot (`apps/api/src/config/env.ts`) and fails fast.
- Import style: no file extensions (`moduleResolution: Bundler`), type-only imports use `import type`.
- Formatting: Prettier (no semicolons, single quotes, width 100). ESLint must pass with zero errors.

## Security rules (non-negotiable)

- Never commit secrets. `.env` is git-ignored. Only `.env.example` (no real values) is committed.
- Validate all input with Zod. Never trust client-sent IDs for tenancy: derive the org from the session.
- All tenant data access goes through `withTenant(orgId, ...)` so Postgres RLS applies (from Phase 1/3).
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
  `formatInTimeZone` from `@clocker/shared`. Never format dates with ad-hoc code.
- Recurring schedules store `cron + tz`. See docs/architecture/timezones.md.

## The phase loop (how every piece of work is delivered)

1. **Plan**: write `docs/phases/phase-NN-<slug>.md` (goal, scope, out of scope, acceptance criteria,
   files to touch). Get the owner's approval before building.
2. **Build** on branch `phase-NN-<slug>`. Write automated tests alongside the code.
3. **Verify**: `pnpm check`, `pnpm build`, `docker compose up --build`, plus any phase-specific checks.
   Record results in the phase doc.
4. **Report**: give the owner the test results and a **manual test checklist** (exact steps, `.http`
   requests from `docs/api/requests/`, and expected results). Push the branch.
5. **Iterate** on reported issues until the owner confirms everything works.
6. **Close** the phase only after explicit confirmation, using `/phase-done` (see
   `.claude/skills/phase-done/SKILL.md`): update all docs, mark the phase done in the roadmap,
   update the changelog, commit, and open the PR.

## Documentation map (keep it current)

| File                        | Update when                                                     |
| --------------------------- | --------------------------------------------------------------- |
| `docs/ROADMAP.md`           | phase status changes                                            |
| `docs/phases/phase-NN-*.md` | planning, verification results, manual checklist, sign-off      |
| `docs/architecture/*.md`    | a phase changes architecture, security layers, or data model    |
| `docs/decisions/NNNN-*.md`  | a significant technical choice is made or reversed              |
| `docs/api/`                 | routes change (OpenAPI spec is generated from Zod from Phase 1) |
| `docs/CHANGELOG.md`         | a phase closes                                                  |
| `.env.example`              | an environment variable is added, changed or removed            |
