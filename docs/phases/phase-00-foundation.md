# Phase 0: Monorepo, Docker, docs foundation

- Branch: `phase-00-foundation`
- Status: Awaiting sign-off

## Goal

A working monorepo skeleton that starts with one command, deploys cleanly to Railway, and has the
documentation and phase loop that every later phase follows. No business features yet.

## Scope

- pnpm workspaces + Turborepo, shared TypeScript/ESLint/Prettier config, supply-chain settings.
- `packages/shared` with timezone utilities and tests (proves cross-package imports).
- `apps/api`: Fastify skeleton (`GET /health/live`, env validation, redacting logger, graceful shutdown)
  and worker skeleton (connects to Redis, logs `worker ready`).
- `apps/web` (`/`, `/portal`, `/panel`) and `apps/admin` skeletons showing API status and timezone formatting.
- Dockerfiles (dev + runtime targets), Docker Compose (api, worker, web, admin, redis), Railway config files.
- `.env.example`, Dependabot, docs structure, decision records, `CLAUDE.md`, `/phase-done`.

## Out of scope

Database connection, security plugins, auth, jobs, UI design, CI/CD (see [ROADMAP](../ROADMAP.md)).

## Acceptance criteria

- [x] `pnpm check` (lint + typecheck + test) passes for every package.
- [x] `pnpm build` produces the API bundle and both Next.js standalone builds.
- [x] `docker compose up --build` starts all 5 services. API health returns 200, the worker logs `worker ready`.
- [x] Web and admin show API status `up` and correct times in UTC, Asia/Kolkata and the browser zone.
- [x] Editing `apps/*/src`, `apps/*/app` or `packages/shared/src` hot reloads inside the containers.
- [x] Runtime images run as non-root, can't modify their own code, and stop cleanly on SIGTERM.
- [ ] Owner completes the manual test checklist below.

## Automated verification (run on 2026-10-04)

| Check                                        | Result                                                                                                    |
| -------------------------------------------- | --------------------------------------------------------------------------------------------------------- |
| `pnpm turbo run lint typecheck test`         | 10/10 tasks pass                                                                                          |
| Unit tests (Node 24.21 in the dev container) | shared 14/14, api 5/5                                                                                     |
| `pnpm turbo run build`                       | api (tsup), web and admin (standalone) build                                                              |
| `docker compose up --build`                  | redis healthy. api, worker, web, admin running                                                            |
| `GET /health/live`                           | `200 {"status":"ok","time":"...Z"}`                                                                       |
| Worker                                       | logs `worker ready` after connecting to Redis                                                             |
| Web / admin home                             | API status `up`, Kolkata time = UTC + 5:30. Admin sends `noindex, nofollow`                               |
| Hot reload                                   | API restarts on `src` change. Web reflects a `packages/shared` change without restart                     |
| API runtime image                            | runs as `node`, app files read-only, SIGTERM: graceful shutdown, exit 0. App layer 53 MB (prod deps only) |
| Web runtime image                            | runs as `node`, no `X-Powered-By` header, serves `/`, `/portal`                                           |

## Manual test checklist (owner)

Prerequisites: Docker Desktop running, repository cloned, branch `phase-00-foundation` checked out.

1. **Env file**
   - [ ] Run `cp .env.example .env`. No values are required for Phase 0.
   - [ ] Run `git status` and confirm `.env` is **not** listed (it is git-ignored).
2. **Start the stack**
   - [ ] Run `docker compose up --build`. The first build takes a few minutes.
   - [ ] `docker compose ps` shows `redis` (healthy), `api`, `worker`, `web`, `admin` running.
3. **API**
   - [ ] Open http://localhost:4000/health/live and see `{"status":"ok","time":"...Z"}` (time in UTC).
   - [ ] Open http://localhost:4000/nope and see a 404 JSON response. `/` and `/favicon.ico` also return 404
         by design: the API has no homepage, which reveals less to anyone probing it.
   - [ ] Optional: run `docs/api/requests/health.http` with the VS Code REST Client extension.
4. **Worker**
   - [ ] Run `docker compose logs worker` and see `worker ready`.
5. **Web**
   - [ ] Open http://localhost:3000. API shows **up** (green).
   - [ ] The UTC, Asia/Kolkata and "Your browser" rows show the same moment (Kolkata = UTC + 5:30,
         browser = your local time and zone name).
   - [ ] The `/portal` and `/panel` links open their placeholder pages.
6. **Admin**
   - [ ] Open http://localhost:3001. It shows the same status card titled "Clocker Admin".
7. **Resilience**
   - [ ] Run `docker compose stop api`, refresh http://localhost:3000, and see API **unreachable** (red),
         with the page still loading. Then run `docker compose start api`.
8. **Hot reload**
   - [ ] Edit the heading text in `apps/web/app/page.tsx`, save, refresh, and see the change without rebuilding.
         Undo the edit.
9. **Shut down**
   - [ ] Run `docker compose down`. Everything stops cleanly.
10. **Docs**
    - [ ] Skim `README.md`, `CLAUDE.md`, `docs/ROADMAP.md` and `docs/architecture/overview.md` and
          flag anything that doesn't match how you want the product to work.

## Notes

- Owner's first run printed `../../.env not found` from api and worker. Harmless (compose injects env),
  but misleading. Docker now uses `dev:docker` / `dev:worker:docker` scripts that don't look for the file.
  `pnpm dev` outside Docker still loads the root `.env`.

- The `tini` init process was dropped from the runtime images. Both servers handle SIGTERM themselves
  and spawn no child processes, so it added packages without benefit.
- Turborepo's automatic agent-guidance file is disabled (`agentGuidance: false` in `turbo.json`).
- ESLint stays on v9 because the Next.js lint plugins don't support v10 yet. TypeScript is pinned
  to 6.0 because typescript-eslint doesn't support TypeScript 7 yet.

## Sign-off

- Confirmed by: (pending)
- Date: (pending)
