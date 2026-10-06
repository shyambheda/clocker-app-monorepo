# API documentation

- **Base URL**: `http://localhost:4000` (local), `https://api.example.com` (production example).
- **Spec**: the Zod schemas of the routes make the OpenAPI document. The document is in
  [`openapi.json`](openapi.json). After you change a route, run `pnpm --filter @repo/api openapi`.
  A unit test fails if the file does not agree with the code.
- **Reference UI**: http://localhost:4000/reference/ in development. Production does not serve it (404).
- **Manual requests**: run the `docs/api/requests/*.http` files with the VS Code REST Client extension
  or the JetBrains HTTP Client.

## Endpoints

| Method | Path            | Auth | Description                                                                                                                                       |
| ------ | --------------- | ---- | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| GET    | `/health/live`  | none | Liveness. Returns `{ "status": "ok", "time": "<UTC ISO>" }`. Checks no dependencies. No rate limit.                                               |
| GET    | `/health/ready` | none | Readiness. 200 `{ "status": "ok", "checks": { "database": "ok", "redis": "ok" } }` or 503 with `unavailable` and `fail` for the check that failed |

The ready check runs `SELECT 1` and a Redis `PING` in parallel, each with a timeout of 2 seconds.
The response has no error text, host names or timings. The log has the reason.

## Conventions

- JSON only. Timestamps are ISO 8601 UTC strings that end in `Z`.
- Each route declares Zod schemas for its input and its output. The output serializer removes fields
  that the schema does not declare.
- Each response has the header `x-request-id`. The API ignores request ids from clients.
- The maximum size of a request body is 100 KB.
- Versioned business routes are under `/v1`.

## Errors

All errors have one shape:

```json
{
  "error": {
    "code": "VALIDATION_FAILED",
    "message": "The request is not valid",
    "requestId": "6f1c2a9e-0d4b-4a57-9a2e-3c1d2b4e5f60",
    "details": [{ "path": "body.email", "message": "Invalid email address" }]
  }
}
```

Only `VALIDATION_FAILED` has `details`. Use `code` in client logic. Show `requestId` to the user when
they report a problem: the log has the full error for this id.

| Status | Code                     | When                                                                              |
| ------ | ------------------------ | --------------------------------------------------------------------------------- |
| 400    | `VALIDATION_FAILED`      | The input does not agree with the Zod schema of the route                         |
| 400    | `INVALID_BODY`           | The body is not valid JSON, or it contains `__proto__` or `constructor.prototype` |
| 400    | `BAD_REQUEST`            | Other bad requests                                                                |
| 401    | `UNAUTHORIZED`           | Authentication is necessary (Phase 4)                                             |
| 403    | `ORIGIN_NOT_ALLOWED`     | The `Origin` header is not on the allowlist (also `Origin: null`)                 |
| 403    | `ORIGIN_REQUIRED`        | A write request with a cookie has no allowed `Origin`                             |
| 403    | `FORBIDDEN`              | The caller does not have permission (Phase 4)                                     |
| 404    | `NOT_FOUND`              | The route or the resource does not exist                                          |
| 405    | `METHOD_NOT_ALLOWED`     | The method is not allowed                                                         |
| 413    | `PAYLOAD_TOO_LARGE`      | The body is larger than 100 KB                                                    |
| 415    | `UNSUPPORTED_MEDIA_TYPE` | The content type is not JSON                                                      |
| 429    | `RATE_LIMITED`           | Too many requests from this IP. The `Retry-After` header gives the seconds        |
| 4xx    | `REQUEST_FAILED`         | Other client errors                                                               |
| 500    | `INTERNAL_ERROR`         | An unexpected error. The message is always "Something went wrong"                 |

The full list is in `packages/shared/src/api/errors.ts` (`ERROR_CODES`, `ApiErrorResponseSchema`).

## Manual requests

| File                                      | What it tests                                        |
| ----------------------------------------- | ---------------------------------------------------- |
| [`health.http`](requests/health.http)     | live, ready, unknown route                           |
| [`security.http`](requests/security.http) | headers, CORS, origin check, body errors, rate limit |
