# Security model

The API is public. Thus the security has layers. Each layer assumes that the layer before it can fail.
Update this page at the end of each phase. The Status column shows what exists now.

## Request path (API)

| #   | Layer                                                                 | Purpose                                                                   | Status                 |
| --- | --------------------------------------------------------------------- | ------------------------------------------------------------------------- | ---------------------- |
| 1   | TLS (Railway) + HSTS                                                  | encrypted transport, HTTPS only                                           | platform, HSTS Phase 2 |
| 2   | `trustProxy` limited to `TRUST_PROXY_HOPS`                            | real client IPs for rate limits, no spoofed IPs                           | Phase 2 (done)         |
| 3   | Security headers (helmet)                                             | no MIME sniffing, no framing, no referrer leaks. CSP `default-src 'none'` | Phase 2 (done)         |
| 4   | Origin allowlist + CORS (exact match)                                 | only the app and admin origins can call from a browser                    | Phase 2 (done)         |
| 5   | Body size limit, prototype-poisoning protection                       | reject large or malicious JSON                                            | Phase 2 (done)         |
| 6   | Rate limits in Redis (for each IP; for each user and auth in Phase 4) | protection against brute force and abuse                                  | Phase 2 (IP) / 4       |
| 7   | CSRF: SameSite cookies + Origin check on cookie writes                | protection against cross-site request forgery                             | Phase 2 (Origin) / 4   |
| 8   | Zod validation of input **and** output                                | no malformed input, no data leaks in responses                            | Phase 2 (done)         |
| 9   | Authentication (Better Auth sessions, revocable)                      | who calls                                                                 | Phase 4                |
| 10  | Authorization guards (platform role, org role, active org)            | what the caller can do                                                    | Phase 4                |
| 11  | Postgres Row Level Security through `withTenant`                      | a missing filter cannot show rows of a different tenant                   | Phase 2 (helper) / 4   |
| 12  | Central error handler                                                 | no stack traces, SQL or internal data to clients                          | Phase 2 (done)         |
| 13  | Audit log                                                             | who did what, especially admin actions                                    | Phase 4                |

## Order of the API plugins

`buildApp()` in `apps/api/src/app.ts` registers the layers in this order. The order is important.

1. Fastify options: `trustProxy` (`TRUST_PROXY_HOPS`), body limit 100 KB, `onProtoPoisoning` and
   `onConstructorPoisoning` set to `error`, request timeout 30 s, `return503OnClosing`.
   The API makes its own request id (UUID) and ignores ids from clients. Each response has `x-request-id`.
2. Zod type provider. Zod validates the input. The output serializer removes fields that the response
   schema does not declare.
3. Central error handler. It comes before the other plugins, so that all errors have the same shape.
4. Helmet. The API sends JSON only, so the CSP blocks everything:
   `default-src 'none'; frame-ancestors 'none'; base-uri 'none'; form-action 'none'`.
   Also `X-Frame-Options: DENY`, `Cross-Origin-Resource-Policy: same-site`, and HSTS (1 year,
   `includeSubDomains`) in production.
5. Origin allowlist and CORS. A request with an `Origin` that is not on the allowlist gets
   403 `ORIGIN_NOT_ALLOWED`, also a preflight. `Origin: null` is never allowed. The allowlist is
   `CORS_ORIGINS` plus the origin of `API_URL`. Requests without `Origin` (curl, server to server)
   are not affected.
6. Origin check for cookie writes. A `POST`, `PUT`, `PATCH` or `DELETE` request with a `Cookie`
   header must have an `Origin` on the allowlist. Else 403 `ORIGIN_REQUIRED`. Requests with only a
   bearer token, requests without cookies, and `/webhooks/*` are not affected.
7. Rate limit for each IP (`request.ip`). The counters are in Redis (prefix `rl:`), so all API
   instances share them. The limit applies also to unknown routes. `/health/live` is exempt.
   If Redis fails, the limiter lets the request through and writes an error to the log.
8. OpenAPI document. The reference UI (`/reference`) exists only when `NODE_ENV` is not `production`.
   It has its own, less strict CSP, and it loads nothing from other hosts.
9. Routes.
10. `onClose`: the API closes the database pool and Redis.

## Error responses

All errors have the shape `{ "error": { "code", "message", "requestId", "details"? } }`.
The client gets a fixed message for each status. The log gets the full error with the request id.
The response never contains a stack trace, SQL, a host name or an internal message.
The error codes are in `packages/shared/src/api/errors.ts` and in [docs/api/README.md](../api/README.md).

## Log

- The logger redacts authorization headers, cookies, `set-cookie`, `x-api-key`, `proxy-authorization`,
  passwords, password hashes, tokens, secrets, API keys, connection strings, and driver error fields
  that can contain row values or query parameters. The list is in `apps/api/src/lib/logger.ts`.
- The request log has the method, the path **without the query string**, the request id and the IP.
  It has no headers.
- The migrate script does not write connection strings or passwords to the log.

## Platform and process

| Control                                                                                                  | Status                          |
| -------------------------------------------------------------------------------------------------------- | ------------------------------- |
| Each process validates its env variables at boot. Error messages do not show values                      | Phase 0 (done)                  |
| The logger redacts authorization, cookies, set-cookie, passwords, tokens, secrets, API keys              | Phase 0 (done), Phase 2         |
| Containers run as non-root. The app user can read, but not change, the application files                 | Phase 0 (done)                  |
| Runtime images contain only production dependencies (no compilers, linters or dev tools)                 | Phase 0 (done)                  |
| Graceful shutdown on SIGTERM (no dropped requests during a deploy)                                       | Phase 0 (done)                  |
| Local ports bind to 127.0.0.1 only                                                                       | Phase 0 (done)                  |
| Redis needs a password, uses `noeviction` (no lost jobs) and AOF persistence                             | Phase 0 (done)                  |
| Install scripts only for packages on an allowlist (`onlyBuiltDependencies`)                              | Phase 0 (done)                  |
| A package version must be public for 24 hours before install (`minimumReleaseAge`)                       | Phase 0 (done)                  |
| Dependabot for npm, Docker and GitHub Actions                                                            | Phase 0 (done)                  |
| ESLint security plugin + type-aware rules (for example, no floating promises)                            | Phase 0 (done)                  |
| The admin app is a separate deployment with `noindex`. Staff must use MFA                                | Phase 0 (noindex) / 4 (MFA)     |
| Separate DB roles: migrations (owner), runtime (`app_user`, RLS enforced), admin (`admin_user`, audited) | Phase 2 (owner, `app_user`) / 4 |
| Migrations run before the new API version gets traffic (Railway pre-deploy, Compose `migrate`)           | Phase 2 (done)                  |
| Railway deploy health check on `/health/ready` (database and Redis)                                      | Phase 2 (done)                  |
| Webhook signature check + idempotency                                                                    | Phase 5                         |
| CI gate: lint, typecheck, tests, `pnpm audit` before deploy                                              | Phase 7                         |

## Secrets

- Local: `.env` (git ignores it). Template: `.env.example`.
- Production: Railway service variables. Each service gets only the variables that it needs.
- `NEON_API_KEY` is only for disposable test branches. Keep it in the local `.env` and in CI secrets.
  Do not put it in Railway.
