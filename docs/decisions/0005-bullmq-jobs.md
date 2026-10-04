# 0005: BullMQ on Redis for queues and schedules, separate worker process

- Status: Accepted (Phase 0, implemented in Phase 2)

## Context

The API must hand off slow work (emails, imports) and run actions at a set time or on a recurring schedule,
for system tasks and for user-created schedules.

## Decision

BullMQ on the existing Redis, behind one generic jobs module: `enqueue` (run now), `runAt` (run at a date/time),
and `schedule` (cron + timezone). Each job type is defined once (name, Zod payload schema, retries, handler).
Jobs run in a separate worker process (same code and image as the API, different start command).
User-created schedules also get a `scheduled_tasks` row in Postgres, the source of truth, and a reconciler
re-queues anything due but missing.

## Consequences

- No polling delay: workers receive jobs as soon as they are due.
- A crashing or slow job can't take the API down. Workers scale independently.
- Redis must use `noeviction` and persistence. Job payloads carry IDs only.
- pg-boss was rejected because polling Postgres would keep Neon compute awake. Railway cron was rejected
  because it has no queue, retries or per-user schedules.
