# Timezones

Timezones are a core requirement: every org has a timezone, and each user may override it.

## Rules

1. **Store instants in UTC.** Postgres columns are `timestamptz`. The API sends and receives ISO 8601 strings
   ending in `Z`. Servers, containers (`TZ=UTC`) and the database session all run in UTC.
2. **Zones are IANA names** such as `Asia/Kolkata` or `Europe/London`. Fixed offsets (`+05:30`) are rejected,
   because they don't follow daylight saving time. Validate with `TimeZoneSchema` from `@clocker/shared`.
3. **Org timezone** (`organizations.timezone`) is required when an org is created and applies to all of its members.
4. **User override** (`users.timezone`, nullable). A travelling user can set their own zone.
5. **Effective timezone = user override, otherwise the active org's timezone, otherwise UTC.** Use
   `effectiveTimeZone(userTz, orgTz)`.
6. **Format in one place.** All apps and emails use `formatInTimeZone(instant, zone, pattern?)` from
   `@clocker/shared` (date-fns v4 + `@date-fns/tz`), so a date looks the same everywhere.

## Two kinds of time

| Kind                | Example                                     | How it is stored                        | How it is shown                                          |
| ------------------- | ------------------------------------------- | --------------------------------------- | -------------------------------------------------------- |
| Instant             | "created at", "sent at"                     | UTC `timestamptz`                       | converted to the **viewer's** effective zone             |
| Wall-clock schedule | "every weekday at 09:00 at the institution" | `cron` + `tz` (the org zone by default) | in the viewer's zone, with the schedule's own zone shown |

- A recurring schedule anchored to the org fires at 09:00 org time even when a viewer is abroad, and
  stays correct when daylight saving starts or ends.
- A one-off user schedule ("remind me on 10 Oct at 09:00") is interpreted in the **creator's** effective
  zone, converted to UTC, and stored. The UI confirms both, e.g. "09:00 London (13:30 Kolkata)".
- Emails sent by the worker format times in the **recipient's** effective zone, never the server's.

## Implementation notes

- `normalizeTimeZone` fixes casing (`asia/singapore` becomes `Asia/Singapore`) but keeps valid aliases
  exactly as chosen. Some runtimes canonicalize `Asia/Kolkata` to the legacy `Asia/Calcutta`, and we
  don't want that rewrite stored.
- Timezone data comes from the ICU data bundled with Node and the browser. Keeping Node current keeps
  zone rules (DST changes) current.

## Status

| Piece                                                         | Phase    |
| ------------------------------------------------------------- | -------- |
| Shared utilities + tests                                      | 0 (done) |
| `organizations.timezone`, `users.timezone`, `/v1/me` override | 3        |
| Schedules with `cron + tz`, `runAt` interpretation            | 2        |
| Timezone pickers and display in UIs                           | 5        |
