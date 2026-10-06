# Phase 1: Neutral starter foundation

- Branch: `phase-01-neutral-starter`
- Status: Done

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

- [x] A case-insensitive search for the old product name finds no result outside `.git`.
- [x] `pnpm install`, `pnpm check` and `pnpm build` pass.
- [x] `docker compose up --build` starts all services.
- [x] The web app and the admin app show the value of `NEXT_PUBLIC_APP_NAME`.
- [x] `GET /health/live` returns 200.
- [x] The files in `docs/` follow `docs/STYLE.md` as much as practical.
- [x] The owner completes the manual test checklist.

## Files

`package.json`, `apps/*/package.json`, `packages/*/package.json`, `apps/*/Dockerfile`,
`docker-compose.yml`, `apps/*/next.config.ts`, `apps/*/app/layout.tsx`, `apps/*/app/page.tsx`,
`apps/*/components/*.tsx`, `apps/api/src/config/env.ts`, `apps/api/src/server.ts`,
`apps/api/tsup.config.ts`, `.env.example`, `CLAUDE.md`, `README.md`, all files in `docs/`,
`.claude/skills/phase-done/SKILL.md`, `pnpm-lock.yaml`.

## Automated verification (run on 2026-10-05, cloud session)

| Check                                                     | Result                                                                                            |
| --------------------------------------------------------- | ------------------------------------------------------------------------------------------------- |
| Search for the old product name (case-insensitive)        | No result outside `.git`, also in `pnpm-lock.yaml`                                                |
| Search for em dashes and en dashes                        | No result                                                                                         |
| `pnpm install`                                            | Lockfile made again with the `@repo/*` names                                                      |
| `pnpm format:check`                                       | All files use the Prettier style                                                                  |
| `pnpm check`                                              | 10/10 tasks pass. Unit tests: shared 16/16, api 6/6                                               |
| `pnpm build` with `NEXT_PUBLIC_APP_NAME="Acme Test"`      | 3/3 tasks pass (api, web, admin)                                                                  |
| Standalone web and admin servers                          | Web: `<title>Acme Test</title>` and `<h1>Acme Test</h1>`. Admin: `<title>Acme Test Admin</title>` |
| `turbo prune` for `@repo/api`, `@repo/web`, `@repo/admin` | Pass (the Dockerfiles use these targets)                                                          |
| `docker compose config`                                   | Valid. Project name `saas-starter`. `COMPOSE_PROJECT_NAME=acme` changes it                        |
| `docker compose up --build`                               | Not run in the cloud session. The owner runs it (checklist step 2)                                |

The cloud session used Node 22 on the host. Phase 0 tested Node 24 in the containers. The owner test
uses the Node 24 containers.

## Manual test checklist (owner)

Prerequisites: Docker Desktop is running. Your `.env` from Phase 0 exists.

1. **Get the branch**
   - [x] Run `git fetch origin` and `git checkout phase-01-neutral-starter`.
2. **Start the stack**
   - [x] Add these lines to your `.env` (use your own name if you want):
         `APP_NAME="Acme Test"` and `NEXT_PUBLIC_APP_NAME="Acme Test"`.
   - [x] Run `docker compose down`, then `docker compose up --build`.
   - [x] Run `docker compose ps`. The project name is `saas-starter`. `redis` (healthy), `api`, `worker`,
         `web` and `admin` are running.
3. **Names in the browser**
   - [x] Open http://localhost:3000. The tab title and the heading show `Acme Test`. The API status is **up**.
   - [x] Open http://localhost:3001. The tab title and the heading show `Acme Test Admin`.
   - [x] The `/portal` and `/panel` links open their placeholder pages.
4. **Default name**
   - [x] Remove the two lines from `.env`. Run `docker compose up -d --force-recreate web admin api worker`.
   - [x] Refresh the two pages. They show `SaaS Starter` and `SaaS Starter Admin`.
5. **API and worker**
   - [x] Open http://localhost:4000/health/live. It shows `{"status":"ok","time":"...Z"}`.
   - [x] Run `docker compose logs api worker | grep appName`. The `api ready` and `worker ready` lines show the name.
6. **Name search**
   - [x] Run `git grep -i -n <old product name>`. There is no result.
7. **Docs**
   - [x] Read `docs/STYLE.md`, `docs/ADOPTING.md`, `docs/architecture/adapters.md` and `docs/ROADMAP.md`.
   - [x] Read some other docs and tell me where the STE text is not clear.
   - [x] Read `docs/phases/phase-02-api-foundation.md`. This is the plan for the next phase.
8. **Shut down**
   - [x] Run `docker compose down`.

Notes from the owner test:

- The owner tested from `main` (step 1 used `git checkout main` and `git pull`), after the repository
  rename to `saas-starter-monorepo`.
- All steps passed.

Note: the Redis volume has a new name because the Compose project name changed. The old volume
(`<old project name>_redis-data`) is not used any more. Find it with `docker volume ls` and delete it
with `docker volume rm <name>`.

## Delivery

The owner decided to put Phase 1 on `main` with a direct push (no pull request). This is a one-time
exception to the rule in `CLAUDE.md`. The close-out commit also went directly to `main`.

## Sign-off

- Confirmed by: Shyam Bheda (owner). Local Docker test from `main`. All checks passed.
- Date: 2026-10-06
