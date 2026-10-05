# Phase 0: Monorepo, Docker, docs foundation

- Branch: `phase-00-foundation`
- Status: Done

## Goal

A monorepo skeleton that starts with one command and deploys to Railway. It also has the documentation
and the phase loop that all later phases follow. No business features yet.

## Scope

- pnpm workspaces + Turborepo, shared TypeScript, ESLint and Prettier config, supply-chain settings.
- `packages/shared` with timezone utilities and tests (this proves the imports between packages).
- `apps/api`: Fastify skeleton (`GET /health/live`, env validation, logger with redaction, graceful shutdown)
  and worker skeleton (connects to Redis, writes `worker ready` to the log).
- `apps/web` (`/`, `/portal`, `/panel`) and `apps/admin` skeletons. They show the API status and timezone formats.
- Dockerfiles (dev and runtime targets), Docker Compose (api, worker, web, admin, redis), Railway config files.
- `.env.example`, Dependabot, docs structure, decision records, `CLAUDE.md`, `/phase-done`.

## Out of scope

Database connection, security plugins, auth, jobs, UI design, CI/CD (refer to the [ROADMAP](../ROADMAP.md)).

## Acceptance criteria

- [x] `pnpm check` (lint + typecheck + test) passes for all packages.
- [x] `pnpm build` makes the API bundle and the two Next.js standalone builds.
- [x] `docker compose up --build` starts the 5 services. The API health check returns 200. The worker writes `worker ready`.
- [x] Web and admin show the API status `up` and correct times in UTC, Asia/Kolkata and the browser zone.
- [x] A change in `apps/*/src`, `apps/*/app` or `packages/shared/src` reloads automatically in the containers.
- [x] Runtime images run as non-root, cannot change their own code, and stop correctly on SIGTERM.
- [x] The owner completed the manual test checklist below.

## Automated verification (run on 2026-10-04)

| Check                                        | Result                                                                                                    |
| -------------------------------------------- | --------------------------------------------------------------------------------------------------------- |
| `pnpm turbo run lint typecheck test`         | 10/10 tasks pass                                                                                          |
| Unit tests (Node 24.21 in the dev container) | shared 14/14, api 5/5                                                                                     |
| `pnpm turbo run build`                       | api (tsup), web and admin (standalone) build                                                              |
| `docker compose up --build`                  | redis healthy. api, worker, web, admin running                                                            |
| `GET /health/live`                           | `200 {"status":"ok","time":"...Z"}`                                                                       |
| Worker                                       | writes `worker ready` after it connects to Redis                                                          |
| Web / admin home                             | API status `up`, Kolkata time = UTC + 5:30. Admin sends `noindex, nofollow`                               |
| Hot reload                                   | API restarts on a `src` change. Web shows a `packages/shared` change without a restart                    |
| API runtime image                            | runs as `node`, app files read-only, SIGTERM: graceful shutdown, exit 0. App layer 53 MB (prod deps only) |
| Web runtime image                            | runs as `node`, no `X-Powered-By` header, serves `/`, `/portal`                                           |

## Manual test checklist (owner)

Prerequisites: Docker Desktop is running. The repository is cloned. Branch `phase-00-foundation` is checked out.

1. **Env file**
   - [x] Run `cp .env.example .env`. Phase 0 needs no values.
   - [x] Run `git status`. Make sure that `.env` is **not** in the list (git ignores it).
2. **Start the stack**
   - [x] Run `docker compose up --build`. The first build takes some minutes.
   - [x] `docker compose ps` shows `redis` (healthy), `api`, `worker`, `web`, `admin` running.
3. **API**
   - [x] Open http://localhost:4000/health/live. It shows `{"status":"ok","time":"...Z"}` (time in UTC).
   - [x] Open http://localhost:4000/nope. It shows a 404 JSON response. `/` and `/favicon.ico` also return 404.
         This is intentional: the API has no home page, and thus shows less to a person who probes it.
   - [x] Optional: run `docs/api/requests/health.http` with the VS Code REST Client extension.
4. **Worker**
   - [x] Run `docker compose logs worker`. The log shows `worker ready`.
5. **Web**
   - [x] Open http://localhost:3000. The API status is **up** (green).
   - [x] The UTC, Asia/Kolkata and "Your browser" rows show the same instant (Kolkata = UTC + 5:30,
         browser = your local time and zone name).
   - [x] The `/portal` and `/panel` links open their placeholder pages.
6. **Admin**
   - [x] Open http://localhost:3001. It shows the same status card with the admin title.
7. **Resilience**
   - [x] Run `docker compose stop api`. Refresh http://localhost:3000. The API status is **unreachable** (red),
         and the page still loads. Then run `docker compose start api`.
8. **Hot reload**
   - [x] Change the heading text in `apps/web/app/page.tsx`. Save, refresh, and see the change without a
         new build. Undo the change.
9. **Shut down**
   - [x] Run `docker compose down`. All services stop correctly.
10. **Docs**
    - [x] Read `README.md`, `CLAUDE.md`, `docs/ROADMAP.md` and `docs/architecture/overview.md`. Tell the
          team about each item that is different from the product that you want.

## Notes

- The first run of the owner showed `../../.env not found` from api and worker. This was not a problem
  (Compose supplies the env variables), but it was confusing. Docker now uses the `dev:docker` and
  `dev:worker:docker` scripts. These scripts do not look for the file. `pnpm dev` outside Docker still
  reads the root `.env`.
- The runtime images do not use the `tini` init process. The two servers handle SIGTERM themselves and
  start no child processes. Thus `tini` added packages without a benefit.
- The automatic agent guidance file of Turborepo is off (`agentGuidance: false` in `turbo.json`).
- ESLint stays on v9 because the Next.js lint plugins do not support v10 yet. TypeScript stays on 6.0
  because typescript-eslint does not support TypeScript 7 yet.
- Phase 1 changed the names in this document to the neutral starter names.

## Sign-off

- Confirmed by: Shyam Bheda (owner). Local Docker run with screenshots of web, admin, /portal, /panel,
  the API unreachable/up toggle, and correct UTC / Asia/Kolkata / America/Vancouver times (DST applied).
- Date: 2026-10-05
