# 0006: Railway hosting and domain layout

- Status: Accepted (Phase 0)

## Context

We need simple container hosting with deploys from GitHub, near the Neon database.

## Decision

Use Railway, in the same region as the Neon project. Services: `api`, `worker`, `web`, `admin` and
`redis`, all from this repository, with config-as-code and watch paths. Each product uses its own
domain with this layout (`example.com` is a placeholder): `app.`, `admin.` and `api.example.com`.
Later, each org can get a subdomain (`<slug>.example.com`). Email comes from `mail.example.com`.

## Consequences

- Subdomains of one site allow first-party SameSite cookies. Use HTTPS on all hosts.
- A service deploys again only when its code changes. CI gates arrive in Phase 7.
- The separate sending subdomain protects the email reputation of the root domain.
