# Roadmap

This repository is a starter for SaaS products. Each phase is one git branch and one pull request.
Each phase follows the phase loop in `CLAUDE.md`: plan, build, verify, manual test checklist,
owner sign-off, docs update, merge.

| #     | Phase                                                              | Status  | Key deliverables                                                                                                                                                                                      |
| ----- | ------------------------------------------------------------------ | ------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 0     | [Monorepo, Docker, docs foundation](phases/phase-00-foundation.md) | Done    | pnpm + Turborepo workspace, app skeletons, Docker Compose, Dockerfiles, Railway config, env template, docs, phase loop                                                                                |
| 1     | [Neutral starter foundation](phases/phase-01-neutral-starter.md)   | Done    | `@repo/*` scope, product identity from env variables, docs in Simplified Technical English, adopting guide, adapter rule                                                                              |
| 2     | [API foundation and security](phases/phase-02-api-foundation.md)   | Next    | Helmet, CORS allowlist, Redis rate limits, body limits, Origin check, Zod type provider, error handler, health/ready, OpenAPI + reference UI, Drizzle + Neon, DB roles, test databases (local + Neon) |
| 3     | Jobs and email                                                     | Planned | BullMQ queue + worker, `enqueue` / `runAt` / `schedule` (cron + zone), `scheduled_tasks` table, reconciler, email adapter (Resend + console), email templates                                         |
| 4     | Auth, orgs, roles, timezones                                       | Planned | Better Auth (password, magic link, email OTP, organizations, bearer), argon2id, breached-password check, invites + CSV import, guards, RLS, org/user zones, platform roles + admin MFA, audit log     |
| 5     | Billing                                                            | Planned | Billing adapter (Lemon Squeezy), plans, subscriptions, entitlements, webhooks (signature, idempotency), org status enforcement                                                                        |
| 6     | Frontends                                                          | Planned | Web: auth pages, org selector, portal + panel shells. Admin: MFA login, orgs, users, plans, impersonation                                                                                             |
| 7     | CI/CD                                                              | Planned | GitHub Actions (lint, typecheck, unit tests, integration tests), Railway deploys after CI passes, PR preview environments                                                                             |
| Later |                                                                    | Backlog | File uploads (storage adapter, Neon storage), MFA for customers and end users, org subdomains, mobile app, third-party API keys, Node 26 upgrade                                                      |

Status values: `Planned`, `Next`, `In progress`, `Awaiting sign-off`, `Done`.
