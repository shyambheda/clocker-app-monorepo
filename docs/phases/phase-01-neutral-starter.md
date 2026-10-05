# Phase 1: Neutral starter foundation

- Branch: `phase-01-neutral-starter`
- Status: In progress

## Goal

Make the repository a neutral SaaS starter. A new product starts from a clone of this repository.
The product name, domains and email sender come from configuration. The behavior of the apps does not change.

## Background

The repository started as the base for one product. The owner changed its purpose. It is now a
private starter for SaaS products. The first product is a clone of this starter.

## Scope

1. Names
   - Rename the workspace scope from the old product scope to `@repo/*`. Do this in every
     `package.json`, import, `tsconfig.json`, ESLint config, `tsup.config.ts`, `next.config.ts`,
     Dockerfile, Compose command and Railway config.
   - Set the root package name to `saas-starter-monorepo`.
   - Set the Compose project name to `saas-starter`. `COMPOSE_PROJECT_NAME` overrides it.
   - Make `pnpm-lock.yaml` again with `pnpm install`.
2. Product identity from configuration
   - The API reads `APP_NAME` (default `SaaS Starter`). The API writes it to the log when it starts.
   - The web app and the admin app read `NEXT_PUBLIC_APP_NAME` for the page title, the heading and the
     metadata. The admin app shows `<name> Admin`.
   - `.env.example` gets an identity block. Production examples use `example.com` hosts.
3. Documentation in Simplified Technical English (STE)
   - Write all files in `docs/` again with neutral names and `example.com` placeholders.
   - Add `docs/STYLE.md`: the STE rules, the project glossary, the words to avoid, and the exemptions.
   - Add `docs/ADOPTING.md`: the steps to start a new product from the starter.
   - Add `docs/architecture/adapters.md`: the adapter rule for external services.
   - Change the roadmap to the new phase numbers. Add the Phase 2 plan
     ([phase-02-api-foundation.md](phase-02-api-foundation.md)).
4. Decision records
   - 0009: starter boilerplate and neutral identity.
   - 0010: adapters for external services.
   - 0011: test databases, local Postgres and Neon (amends 0003).
   - 0012: Simplified Technical English for documentation.
5. Working rules
   - `CLAUDE.md` and `README.md`: neutral product text, the `@repo/*` scope, the adapter rule, the
     documentation language rule, and the git identity rule for cloud sessions.
   - `.claude/skills/phase-done/SKILL.md`: write docs, commit messages and PR text in STE.

## Out of scope

- Changes to the behavior of the apps.
- New dependencies.
- Database, security plugins and adapter code. These start in Phase 2 or later.

## Acceptance criteria

- [ ] A case-insensitive search for the old product name finds no result outside `.git`.
- [ ] `pnpm install`, `pnpm check` and `pnpm build` pass.
- [ ] `docker compose up --build` starts all services.
- [ ] The web app and the admin app show the value of `NEXT_PUBLIC_APP_NAME`.
- [ ] `GET /health/live` returns 200.
- [ ] The files in `docs/` follow `docs/STYLE.md` as much as practical.
- [ ] The owner completes the manual test checklist.

## Files

`package.json`, `apps/*/package.json`, `packages/*/package.json`, `apps/*/Dockerfile`,
`docker-compose.yml`, `apps/*/next.config.ts`, `apps/*/app/layout.tsx`, `apps/*/app/page.tsx`,
`apps/*/components/*.tsx`, `apps/api/src/config/env.ts`, `apps/api/src/server.ts`,
`apps/api/tsup.config.ts`, `.env.example`, `CLAUDE.md`, `README.md`, all files in `docs/`,
`.claude/skills/phase-done/SKILL.md`, `pnpm-lock.yaml`.

## Automated verification

To be completed after the build.

## Manual test checklist (owner)

To be completed after the build.

## Sign-off

- Confirmed by:
- Date:
