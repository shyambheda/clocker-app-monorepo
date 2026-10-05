# Security model

The API is public. Thus the security has layers. Each layer assumes that the layer before it can fail.
Update this page at the end of each phase. The Status column shows what exists now.

## Request path (API)

| #   | Layer                                                                | Purpose                                                                   | Status      |
| --- | -------------------------------------------------------------------- | ------------------------------------------------------------------------- | ----------- |
| 1   | TLS (Railway) + HSTS                                                 | encrypted transport, HTTPS only                                           | platform    |
| 2   | `trustProxy` limited to the Railway proxy                            | real client IPs for rate limits, no spoofed IPs                           | Phase 2     |
| 3   | Security headers (helmet)                                            | no MIME sniffing, no framing, no referrer leaks. CSP `default-src 'none'` | Phase 2     |
| 4   | CORS exact-origin allowlist                                          | only the app and admin origins can call with credentials                  | Phase 2     |
| 5   | Body size limits, prototype-poisoning protection                     | reject large or malicious JSON                                            | Phase 2     |
| 6   | Rate limits in Redis (per IP, per user, stricter on auth)            | protection against brute force and abuse                                  | Phase 2 / 4 |
| 7   | CSRF: SameSite cookies + Origin check on cookie-authenticated writes | protection against cross-site request forgery                             | Phase 2 / 4 |
| 8   | Zod validation of input **and** output                               | no malformed input, no data leaks in responses                            | Phase 2     |
| 9   | Authentication (Better Auth sessions, revocable)                     | who calls                                                                 | Phase 4     |
| 10  | Authorization guards (platform role, org role, active org)           | what the caller can do                                                    | Phase 4     |
| 11  | Postgres Row Level Security through `withTenant`                     | a missing filter cannot show rows of a different tenant                   | Phase 2 / 4 |
| 12  | Central error handler                                                | no stack traces, SQL or internal data to clients                          | Phase 2     |
| 13  | Audit log                                                            | who did what, especially admin actions                                    | Phase 4     |

## Platform and process

| Control                                                                                                  | Status                      |
| -------------------------------------------------------------------------------------------------------- | --------------------------- |
| Each process validates its env variables at boot. Error messages do not show values                      | Phase 0 (done)              |
| The logger redacts authorization, cookies, set-cookie, passwords, tokens, secrets, API keys              | Phase 0 (done)              |
| Containers run as non-root. The app user can read, but not change, the application files                 | Phase 0 (done)              |
| Runtime images contain only production dependencies (no compilers, linters or dev tools)                 | Phase 0 (done)              |
| Graceful shutdown on SIGTERM (no dropped requests during a deploy)                                       | Phase 0 (done)              |
| Local ports bind to 127.0.0.1 only                                                                       | Phase 0 (done)              |
| Redis needs a password, uses `noeviction` (no lost jobs) and AOF persistence                             | Phase 0 (done)              |
| Install scripts only for packages on an allowlist (`onlyBuiltDependencies`)                              | Phase 0 (done)              |
| A package version must be public for 24 hours before install (`minimumReleaseAge`)                       | Phase 0 (done)              |
| Dependabot for npm, Docker and GitHub Actions                                                            | Phase 0 (done)              |
| ESLint security plugin + type-aware rules (for example, no floating promises)                            | Phase 0 (done)              |
| The admin app is a separate deployment with `noindex`. Staff must use MFA                                | Phase 0 (noindex) / 4 (MFA) |
| Separate DB roles: migrations (owner), runtime (`app_user`, RLS enforced), admin (`admin_user`, audited) | Phase 2 / 4                 |
| Webhook signature check + idempotency                                                                    | Phase 5                     |
| CI gate: lint, typecheck, tests, `pnpm audit` before deploy                                              | Phase 7                     |

## Secrets

- Local: `.env` (git ignores it). Template: `.env.example`.
- Production: Railway service variables. Each service gets only the variables that it needs.
- `NEON_API_KEY` is only for disposable test branches. Keep it in the local `.env` and in CI secrets.
  Do not put it in Railway.
