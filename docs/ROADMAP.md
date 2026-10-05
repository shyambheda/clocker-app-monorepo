# Roadmap

Each phase is delivered as one pull request and follows the phase loop in `CLAUDE.md`:
plan, build, verify, manual test checklist, owner sign-off, docs update, merge.

| #     | Phase                                                              | Status  | Key deliverables                                                                                                                                                                                      |
| ----- | ------------------------------------------------------------------ | ------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 0     | [Monorepo, Docker, docs foundation](phases/phase-00-foundation.md) | Done    | pnpm + Turborepo workspace, app skeletons, Docker Compose, Dockerfiles, Railway config, env template, docs, phase loop                                                                                |
| 1     | API foundation and security                                        | Next    | Helmet, CORS allowlist, Redis rate limits, body limits, origin check, Zod type provider, error handler, health/ready, OpenAPI + reference UI, Drizzle + Neon, DB roles, throwaway Neon test branches  |
| 2     | Jobs and email                                                     | Planned | BullMQ queue + worker, `enqueue` / `runAt` / `schedule` (cron + tz), `scheduled_tasks` table, reconciler, Resend + console mailer, email templates                                                    |
| 3     | Auth, orgs, roles, timezones                                       | Planned | Better Auth (password, magic link, email OTP, organizations, bearer), argon2id, breached-password check, invites + CSV import, guards, RLS, org/user timezones, platform roles + admin MFA, audit log |
| 4     | Billing                                                            | Planned | Plans, subscriptions, entitlements, Lemon Squeezy webhooks (signature, idempotency), org status enforcement                                                                                           |
| 5     | Frontends                                                          | Planned | Web: auth pages, org selector, portal + panel shells. Admin: MFA login, orgs, users, plans, impersonation                                                                                             |
| 6     | CI/CD                                                              | Planned | GitHub Actions (lint, typecheck, test on throwaway Neon branch), Railway deploys gated on CI, PR preview environments                                                                                 |
| Later |                                                                    | Backlog | File uploads (Neon Object Storage), MFA for customers and end users, org subdomains (`<slug>.getclocker.app`), mobile app, third-party API keys, Node 26 upgrade                                      |

Status values: `Planned`, `Next`, `In progress`, `Awaiting sign-off`, `Done`.
