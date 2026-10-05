# Timezones

Timezones are a core requirement. Each org has a zone. Each user can override it.

## Rules

1. **Store instants in UTC.** Postgres columns are `timestamptz`. The API sends and receives ISO 8601
   strings that end in `Z`. The servers, the containers (`TZ=UTC`) and the database sessions use UTC.
2. **Zones are IANA names**, for example `Asia/Kolkata` or `Europe/London`. The code rejects fixed offsets
   (`+05:30`), because fixed offsets do not follow daylight saving time. Validate with `TimeZoneSchema`
   from `@repo/shared`.
3. **Org zone** (`organizations.timezone`). It is required when a user makes an org. It applies to all members of the org.
4. **User override** (`users.timezone`, nullable). A user who travels can set a different zone.
5. **Effective zone = user override, else the zone of the active org, else UTC.** Use
   `effectiveTimeZone(userTz, orgTz)`.
6. **Format in one place.** All apps and emails use `formatInTimeZone(instant, zone, pattern?)` from
   `@repo/shared` (date-fns v4 + `@date-fns/tz`). Thus a date looks the same in all places.

## Two kinds of time

| Kind                | Example                               | How it is stored                        | How it is shown                                         |
| ------------------- | ------------------------------------- | --------------------------------------- | ------------------------------------------------------- |
| Instant             | "created at", "sent at"               | UTC `timestamptz`                       | in the effective zone of the **viewer**                 |
| Wall-clock schedule | "each weekday at 09:00 at the office" | `cron` + `tz` (the org zone by default) | in the zone of the viewer, with the schedule zone shown |

- A recurring schedule of the org starts at 09:00 org time, also when a viewer is in a different country.
  It stays correct when daylight saving time starts or stops.
- A one-time user schedule ("remind me on 10 Oct at 09:00") uses the effective zone of the **user who
  makes it**. The API changes it to UTC and stores it. The UI shows the two zones, for example
  "09:00 London (13:30 Kolkata)".
- The worker formats times in emails in the effective zone of the **recipient**, not in the zone of the server.

## Implementation notes

- `normalizeTimeZone` corrects the letter case (`asia/singapore` becomes `Asia/Singapore`). It keeps
  valid aliases as the user selected them. Some runtimes change `Asia/Kolkata` to the old name
  `Asia/Calcutta`. The code does not store that change.
- The zone data comes from the ICU data in Node and in the browser. A current Node version keeps the
  zone rules (DST changes) current.

## Status

| Piece                                                         | Phase    |
| ------------------------------------------------------------- | -------- |
| Shared utilities + tests                                      | 0 (done) |
| Schedules with `cron + tz`, `runAt` interpretation            | 3        |
| `organizations.timezone`, `users.timezone`, `/v1/me` override | 4        |
| Timezone pickers and display in UIs                           | 6        |
