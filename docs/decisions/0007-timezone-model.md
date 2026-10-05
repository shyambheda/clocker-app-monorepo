# 0007: UTC storage, IANA org timezone with user override

- Status: Accepted (Phase 0)

## Context

Every org operates in its own timezone, and users may travel. Wrong times would break scheduling and trust.

## Decision

Store instants as UTC. Orgs have a required IANA timezone, users an optional override. Effective zone =
override, otherwise org. Recurring schedules store `cron + tz`. All formatting goes through `@clocker/shared`.
Details: [timezones.md](../architecture/timezones.md).

## Consequences

- One formatting implementation for web, admin, mobile and emails.
- Daylight saving is handled by IANA rules. Fixed offsets are rejected.
