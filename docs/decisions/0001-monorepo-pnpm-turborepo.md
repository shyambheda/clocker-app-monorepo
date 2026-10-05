# 0001: Monorepo with pnpm workspaces + Turborepo

- Status: Accepted (Phase 0)

## Context

A product has an API, a worker, a web app, an admin app, and later a mobile app. These apps share
API contracts and time format rules. Separate repositories need copies of the types, and the copies
become different over time.

## Decision

Use one repository. pnpm workspaces link the internal packages (`@repo/*`). Turborepo runs the tasks
(lint, typecheck, test, build, dev) in the dependency order and keeps a cache. The internal packages
ship TypeScript source.

## Consequences

- If an app uses a contract from `packages/shared` incorrectly, its build fails before the deploy.
- One install and one `pnpm dev`. CI and Docker build again only what changed (`turbo prune`, Railway watch paths).
- The strict dependency layout of pnpm and the allowlist for install scripts decrease the supply-chain risk.
- Contributors use pnpm (through Corepack), not npm.
