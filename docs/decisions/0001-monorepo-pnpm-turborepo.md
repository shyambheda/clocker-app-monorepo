# 0001: Monorepo with pnpm workspaces + Turborepo

- Status: Accepted (Phase 0)

## Context

The product has an API, a worker, a web app, an admin app, and later a mobile app. They share API
contracts and time formatting rules. Keeping them in separate repos means duplicated types that drift apart.

## Decision

One repository. pnpm workspaces link internal packages (`@clocker/*`). Turborepo runs tasks
(lint, typecheck, test, build, dev) in dependency order with caching. Internal packages ship TypeScript source.

## Consequences

- A contract change in `packages/shared` breaks the build of any app that uses it wrongly, before deploy.
- One install, one `pnpm dev`. CI and Docker only rebuild what changed (`turbo prune`, Railway watch paths).
- pnpm's strict dependency layout and install-script allowlist reduce supply-chain risk.
- Contributors need pnpm (via Corepack) rather than npm.
