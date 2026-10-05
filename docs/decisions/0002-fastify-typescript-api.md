# 0002: Fastify 5 + TypeScript + Zod for the API

- Status: Accepted (Phase 0)

## Context

The API is public. It must be secure and fast. It must stay correct when it becomes larger.

## Decision

Use TypeScript (strict) with Fastify 5. Write the request and response schemas in Zod (from Phase 2).
The Zod schemas also make the OpenAPI spec. Use the official Fastify plugins for security
(helmet, cors, rate-limit).

## Consequences

- The response schemas serialize only the declared fields. Thus internal fields cannot leak by accident.
- One schema for each route gives typed handlers and the API docs.
- The ecosystem is smaller than the Express ecosystem. The official plugins supply all that we need.
