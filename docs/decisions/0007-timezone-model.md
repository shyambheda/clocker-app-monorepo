# 0007: UTC storage, IANA org zone with user override

- Status: Accepted (Phase 0)

## Context

Each org works in its own zone, and users travel. Incorrect times cause problems with schedules and with trust.

## Decision

Store instants in UTC. Each org has a required IANA zone. Each user has an optional override.
Effective zone = override, else the org zone. Recurring schedules store `cron + tz`. All formats come
from `@repo/shared`. Details: [timezones.md](../architecture/timezones.md).

## Consequences

- One format implementation for web, admin, mobile and emails.
- The IANA rules control daylight saving time. The code rejects fixed offsets.
