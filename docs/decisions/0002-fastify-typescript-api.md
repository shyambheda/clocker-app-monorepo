# 0002: Fastify 5 + TypeScript + Zod for the API

- Status: Accepted (Phase 0)

## Context

The API is public and must be secure, fast, and easy to keep correct as it grows.

## Decision

TypeScript (strict) with Fastify 5. Request and response schemas are written in Zod (from Phase 1),
which also generates the OpenAPI spec. Security uses the official Fastify plugins (helmet, cors, rate-limit).

## Consequences

- Response schemas mean only declared fields are serialized, so internal fields can't leak by accident.
- Schema-first routes give typed handlers and generated API docs from one source.
- Smaller ecosystem than Express, but the official plugins cover everything we need.
