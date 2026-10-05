# 0004: Self-managed Better Auth inside the API

- Status: Accepted (Phase 0, implemented in Phase 3)

## Context

We need email + password, magic link, email OTP, organizations with roles, mobile support, and later
MFA and API keys. We compared hand-written auth, Neon Auth (managed Better Auth), and Better Auth
running in our own API. `@fastify/auth` is only a guard-composition helper, not an auth system.

## Decision

Better Auth runs inside the Fastify API at `/auth/*` and stores its tables in our Neon database.
`@fastify/auth`-style guards compose checks on business routes. Frontends use the Better Auth client SDK.

## Consequences

- Full plugin set (organizations, bearer for mobile, two-factor, API keys later). No migration later.
- Sessions are database-backed and revocable instantly, cached in Redis.
- First-party cookies on `.getclocker.app`. Any email provider (Resend).
- We own upgrades and configuration. Managed Neon Auth was rejected because it lacks MFA and API keys,
  and its organization support is partial.
