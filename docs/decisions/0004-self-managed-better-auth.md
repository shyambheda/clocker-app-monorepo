# 0004: Self-managed Better Auth inside the API

- Status: Accepted (Phase 0, implementation in Phase 4)

## Context

We need email + password, magic link, email OTP, organizations with roles, mobile support, and later
MFA and API keys. We compared auth that we write ourselves, Neon Auth (managed Better Auth), and
Better Auth in our own API. `@fastify/auth` only combines guards. It is not an auth system.

## Decision

Better Auth runs inside the Fastify API at `/auth/*`. It stores its tables in our Neon database.
Guards in the style of `@fastify/auth` combine the checks on business routes. The frontends use the
Better Auth client SDK.

## Consequences

- All plugins are available (organizations, bearer for mobile, two-factor, later API keys). No migration later.
- Sessions are in the database. We can revoke a session immediately. Redis keeps a cache of sessions.
- First-party cookies on the product domain (for example `.example.com`). Any email provider (Resend).
- We do the upgrades and the configuration. We rejected managed Neon Auth because it has no MFA and
  no API keys, and its organization support is partial.
