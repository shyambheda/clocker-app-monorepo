# API documentation

- **Base URL**: `http://localhost:4000` (local), `https://api.getclocker.app` (production).
- **Spec**: from Phase 1 the OpenAPI document is generated from the Zod route schemas and saved to
  `docs/api/openapi.json`. An interactive reference is served by the API (open in development,
  restricted in production).
- **Manual requests**: `docs/api/requests/*.http` files can be run with the VS Code REST Client
  extension or JetBrains HTTP Client.

## Endpoints (Phase 0)

| Method | Path           | Auth | Description                                                                          |
| ------ | -------------- | ---- | ------------------------------------------------------------------------------------ |
| GET    | `/health/live` | none | Liveness. Returns `{ "status": "ok", "time": "<UTC ISO>" }`. Checks no dependencies. |

## Conventions (from Phase 1)

- JSON only. Timestamps are ISO 8601 UTC strings ending in `Z`.
- Errors use one shape: `{ "error": { "code": "...", "message": "...", "requestId": "..." } }`.
- Versioned business routes live under `/v1`.
