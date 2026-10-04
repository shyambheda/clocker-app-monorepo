# Security model

The API is public, so security is layered: each layer assumes the one before it can fail.
This page is updated at the end of every phase. Status shows what exists today.

## Request path (API)

| #   | Layer                                                                | Purpose                                                        | Status      |
| --- | -------------------------------------------------------------------- | -------------------------------------------------------------- | ----------- |
| 1   | TLS (Railway) + HSTS                                                 | encrypted transport, `.app` is HTTPS-only                      | platform    |
| 2   | `trustProxy` limited to Railway's proxy                              | real client IPs for rate limiting, no spoofing                 | Phase 1     |
| 3   | Security headers (helmet)                                            | no sniffing, framing, referrer leaks. CSP `default-src 'none'` | Phase 1     |
| 4   | CORS exact-origin allowlist                                          | only app/admin origins may call with credentials               | Phase 1     |
| 5   | Body size limits, prototype-poisoning protection                     | reject oversized or malicious JSON                             | Phase 1     |
| 6   | Rate limits in Redis (per IP, per user, stricter on auth)            | brute force and abuse protection                               | Phase 1 / 3 |
| 7   | CSRF: SameSite cookies + Origin check on cookie-authenticated writes | cross-site request forgery                                     | Phase 1 / 3 |
| 8   | Zod validation of input **and** output                               | no malformed input, no accidental data leaks in responses      | Phase 1     |
| 9   | Authentication (Better Auth sessions, revocable)                     | who is calling                                                 | Phase 3     |
| 10  | Authorization guards (platform role, org role, active org)           | what they may do                                               | Phase 3     |
| 11  | Postgres Row Level Security via `withTenant`                         | a missing filter can never leak another tenant's rows          | Phase 1 / 3 |
| 12  | Central error handler                                                | no stack traces, SQL or internals to clients                   | Phase 1     |
| 13  | Audit log                                                            | who did what, especially admin actions                         | Phase 3     |

## Platform and process

| Control                                                                                                  | Status                      |
| -------------------------------------------------------------------------------------------------------- | --------------------------- |
| Env validated at boot, errors never echo values                                                          | Phase 0 (done)              |
| Logger redacts authorization, cookies, set-cookie, passwords, tokens, secrets, API keys                  | Phase 0 (done)              |
| Containers run as non-root; application files read-only for the app user                                 | Phase 0 (done)              |
| Runtime images contain production dependencies only (no compilers, linters, dev tools)                   | Phase 0 (done)              |
| Graceful shutdown on SIGTERM (no dropped requests on redeploy)                                           | Phase 0 (done)              |
| Local ports bound to 127.0.0.1 only                                                                      | Phase 0 (done)              |
| Redis password required, `noeviction` (jobs never silently dropped), AOF persistence                     | Phase 0 (done)              |
| Install scripts allowlisted (`onlyBuiltDependencies`)                                                    | Phase 0 (done)              |
| Packages must be public for 24h before install (`minimumReleaseAge`)                                     | Phase 0 (done)              |
| Dependabot for npm, Docker and GitHub Actions                                                            | Phase 0 (done)              |
| ESLint security plugin + type-aware rules (e.g. no floating promises)                                    | Phase 0 (done)              |
| Admin app is a separate deployment, `noindex`, MFA required for staff                                    | Phase 0 (noindex) / 3 (MFA) |
| Separate DB roles: migrations (owner), runtime (`app_user`, RLS enforced), admin (`admin_user`, audited) | Phase 1 / 3                 |
| Webhook signature verification + idempotency                                                             | Phase 4                     |
| CI gate: lint, typecheck, tests, `pnpm audit` before deploy                                              | Phase 6                     |

## Secrets

- Local: `.env` (git-ignored). Template: `.env.example`.
- Production: Railway service variables. Each service gets only the variables it needs.
- `NEON_API_KEY` is only for creating throwaway test branches: local `.env` and CI secrets, never in Railway.
