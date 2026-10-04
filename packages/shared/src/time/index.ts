import { TZDate } from '@date-fns/tz'
import { format } from 'date-fns'
import { z } from 'zod'

/**
 * Timezone rules (see docs/architecture/timezones.md):
 * - Instants are stored and transported as UTC. Only formatting converts to a zone.
 * - Zones are IANA names ("Asia/Kolkata"), never fixed offsets ("+05:30"), so DST is handled.
 * - Effective zone = user override, otherwise the active org's zone.
 */

export const DEFAULT_TIME_ZONE = 'UTC'

export const DEFAULT_DATE_TIME_FORMAT = 'd MMM yyyy, h:mm a'

let zoneLookup: Map<string, string> | undefined

/** Lower-cased zone name -> correctly cased IANA name, built once from the runtime's list. */
function knownZones(): Map<string, string> {
  zoneLookup ??= new Map(
    [...Intl.supportedValuesOf('timeZone'), 'UTC'].map((zone) => [zone.toLowerCase(), zone]),
  )
  return zoneLookup
}

/**
 * Returns the IANA name to store, or null if the value isn't a usable zone.
 * - Fixed offsets ("+05:30") are rejected: Intl accepts them, but they ignore DST.
 * - Casing is fixed ("asia/singapore" -> "Asia/Singapore").
 * - Valid aliases are kept as the user chose them. We don't let Intl rewrite them, because
 *   some runtimes turn "Asia/Kolkata" into the legacy "Asia/Calcutta".
 */
export function normalizeTimeZone(timeZone: string): string | null {
  const trimmed = timeZone.trim()
  if (trimmed === '' || trimmed.startsWith('+') || trimmed.startsWith('-')) return null
  const known = knownZones().get(trimmed.toLowerCase())
  if (known) return known
  try {
    new Intl.DateTimeFormat('en-US', { timeZone: trimmed })
    return trimmed
  } catch {
    return null
  }
}

export function isValidTimeZone(timeZone: string): boolean {
  return normalizeTimeZone(timeZone) !== null
}

/** All IANA zones the runtime knows, for timezone pickers. */
export function listTimeZones(): string[] {
  return Intl.supportedValuesOf('timeZone')
}

/** Zod schema for any timezone field in an API contract. Normalizes the value on parse. */
export const TimeZoneSchema = z
  .string()
  .max(64)
  .transform((value, ctx) => {
    const normalized = normalizeTimeZone(value)
    if (normalized === null) {
      ctx.addIssue({
        code: 'custom',
        message: 'Must be a valid IANA timezone, e.g. "Asia/Kolkata"',
      })
      return z.NEVER
    }
    return normalized
  })

/** The zone used to show times to a user: their override if set, else their active org's zone. */
export function effectiveTimeZone(
  userTimeZone: string | null | undefined,
  orgTimeZone: string | null | undefined,
): string {
  for (const candidate of [userTimeZone, orgTimeZone]) {
    if (candidate) {
      const normalized = normalizeTimeZone(candidate)
      if (normalized) return normalized
    }
  }
  return DEFAULT_TIME_ZONE
}

/** Formats an instant (Date, epoch ms, or ISO string) as wall-clock time in the given zone. */
export function formatInTimeZone(
  instant: Date | number | string,
  timeZone: string,
  pattern: string = DEFAULT_DATE_TIME_FORMAT,
): string {
  const zone = normalizeTimeZone(timeZone) ?? DEFAULT_TIME_ZONE
  const date = instant instanceof Date ? instant : new Date(instant)
  if (Number.isNaN(date.getTime())) throw new RangeError('Invalid instant')
  return format(new TZDate(date.getTime(), zone), pattern)
}
