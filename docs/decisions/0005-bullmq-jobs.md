# 0005: BullMQ on Redis for queues and schedules, separate worker process

- Status: Accepted (Phase 0, implementation in Phase 3)

## Context

The API must give slow work (emails, imports) to a different process. It must also run actions at a
set time or on a recurring schedule, for system tasks and for schedules that users make.

## Decision

Use BullMQ on the Redis that we already have, behind one generic jobs module: `enqueue` (run now),
`runAt` (run at a date and time) and `schedule` (cron + zone). Each job type has one definition
(name, Zod payload schema, retries, handler). Jobs run in a separate worker process (same code and
image as the API, different start command). Each schedule that a user makes also gets a row in the
`scheduled_tasks` table in Postgres. This table is the source of truth. A reconciler adds a job
again if the job is due but missing.

## Consequences

- No polling delay: the worker gets a job when the job is due.
- A job that crashes or is slow cannot stop the API. The workers scale independently.
- Redis must use `noeviction` and persistence. Job payloads contain IDs only.
- We rejected pg-boss because Postgres polling keeps the Neon compute awake. We rejected Railway cron
  because it has no queue, no retries and no schedules for each user.
