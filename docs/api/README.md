# API documentation

- **Base URL**: `http://localhost:4000` (local), `https://api.example.com` (production example).
- **Spec**: from Phase 2, the Zod schemas of the routes make the OpenAPI document. The document is in
  `docs/api/openapi.json`. The API serves an interactive reference in development. Production does
  not serve it.
- **Manual requests**: run the `docs/api/requests/*.http` files with the VS Code REST Client extension
  or the JetBrains HTTP Client.

## Endpoints (Phase 0)

| Method | Path           | Auth | Description                                                                          |
| ------ | -------------- | ---- | ------------------------------------------------------------------------------------ |
| GET    | `/health/live` | none | Liveness. Returns `{ "status": "ok", "time": "<UTC ISO>" }`. Checks no dependencies. |

## Conventions (from Phase 2)

- JSON only. Timestamps are ISO 8601 UTC strings that end in `Z`.
- All errors have one shape: `{ "error": { "code": "...", "message": "...", "requestId": "..." } }`.
- Versioned business routes are under `/v1`.
