# Decision records

Short records of significant technical choices: the context, the decision, and its consequences.
Add a new numbered file when a decision is made or reversed. Never rewrite history: supersede instead.

| #                                           | Decision                                                          | Status   |
| ------------------------------------------- | ----------------------------------------------------------------- | -------- |
| [0001](0001-monorepo-pnpm-turborepo.md)     | Monorepo with pnpm workspaces + Turborepo                         | Accepted |
| [0002](0002-fastify-typescript-api.md)      | Fastify 5 + TypeScript + Zod for the API                          | Accepted |
| [0003](0003-neon-postgres-drizzle.md)       | Neon Postgres (no local Postgres) + Drizzle ORM                   | Accepted |
| [0004](0004-self-managed-better-auth.md)    | Self-managed Better Auth inside the API                           | Accepted |
| [0005](0005-bullmq-jobs.md)                 | BullMQ on Redis for queues and schedules, separate worker process | Accepted |
| [0006](0006-railway-hosting-and-domains.md) | Railway hosting (Singapore) and getclocker.app domain layout      | Accepted |
| [0007](0007-timezone-model.md)              | UTC storage, IANA org timezone with user override                 | Accepted |
| [0008](0008-three-audience-identity.md)     | One identity, three audiences (admin, portal, panel)              | Accepted |
