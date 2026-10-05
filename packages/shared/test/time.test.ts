import { describe, expect, it } from 'vitest'
import {
  TimeZoneSchema,
  effectiveTimeZone,
  formatInTimeZone,
  isValidTimeZone,
  listTimeZones,
  normalizeTimeZone,
} from '../src/index'

describe('isValidTimeZone', () => {
  it('accepts IANA zones and UTC', () => {
    expect(isValidTimeZone('Asia/Kolkata')).toBe(true)
    expect(isValidTimeZone('Europe/London')).toBe(true)
    expect(isValidTimeZone('UTC')).toBe(true)
  })

  it('rejects garbage, empty strings and fixed offsets', () => {
    expect(isValidTimeZone('Mars/Olympus')).toBe(false)
    expect(isValidTimeZone('')).toBe(false)
    expect(isValidTimeZone('+05:30')).toBe(false)
    expect(isValidTimeZone('-0800')).toBe(false)
  })

  it('normalizes whitespace and casing', () => {
    expect(normalizeTimeZone('  Asia/Singapore ')).toBe('Asia/Singapore')
    expect(normalizeTimeZone('asia/singapore')).toBe('Asia/Singapore')
  })

  it('keeps Asia/Kolkata as chosen instead of a legacy alias', () => {
    expect(normalizeTimeZone('Asia/Kolkata')).toBe('Asia/Kolkata')
  })
})

describe('listTimeZones', () => {
  it('includes common zones', () => {
    const zones = listTimeZones()
    expect(zones).toContain('Asia/Singapore')
    expect(zones).toContain('America/New_York')
  })
})

describe('effectiveTimeZone', () => {
  it('prefers the user override', () => {
    expect(effectiveTimeZone('Europe/London', 'Asia/Kolkata')).toBe('Europe/London')
  })

  it('falls back to the org zone', () => {
    expect(effectiveTimeZone(null, 'Asia/Kolkata')).toBe('Asia/Kolkata')
  })

  it('skips an invalid override instead of failing', () => {
    expect(effectiveTimeZone('Not/AZone', 'Asia/Kolkata')).toBe('Asia/Kolkata')
  })

  it('falls back to UTC when nothing is set', () => {
    expect(effectiveTimeZone(undefined, undefined)).toBe('UTC')
  })
})

describe('formatInTimeZone', () => {
  const instant = '2026-01-15T03:30:00Z'

  it('shows the same instant in different zones', () => {
    expect(formatInTimeZone(instant, 'UTC', 'yyyy-MM-dd HH:mm')).toBe('2026-01-15 03:30')
    expect(formatInTimeZone(instant, 'Asia/Kolkata', 'yyyy-MM-dd HH:mm')).toBe('2026-01-15 09:00')
    expect(formatInTimeZone(instant, 'America/New_York', 'yyyy-MM-dd HH:mm')).toBe(
      '2026-01-14 22:30',
    )
  })

  it('handles daylight saving time', () => {
    // London is UTC+0 in January and UTC+1 in July.
    expect(formatInTimeZone('2026-01-15T12:00:00Z', 'Europe/London', 'HH:mm')).toBe('12:00')
    expect(formatInTimeZone('2026-07-15T12:00:00Z', 'Europe/London', 'HH:mm')).toBe('13:00')
  })

  it('throws on an invalid instant', () => {
    expect(() => formatInTimeZone('not a date', 'UTC')).toThrow(RangeError)
  })
})

describe('TimeZoneSchema', () => {
  it('parses and normalizes valid zones', () => {
    expect(TimeZoneSchema.parse(' Asia/Kolkata ')).toBe('Asia/Kolkata')
  })

  it('rejects invalid zones', () => {
    expect(TimeZoneSchema.safeParse('+05:30').success).toBe(false)
    expect(TimeZoneSchema.safeParse('Nowhere').success).toBe(false)
  })
})
