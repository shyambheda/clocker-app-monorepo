import { describe, expect, it } from 'vitest'
import { DEFAULT_APP_NAME, resolveAppName } from '../src/index'

describe('resolveAppName', () => {
  it('returns the configured name without spaces at the ends', () => {
    expect(resolveAppName('  Acme Cloud ')).toBe('Acme Cloud')
  })

  it('returns the default name when the value is empty or missing', () => {
    expect(resolveAppName(undefined)).toBe(DEFAULT_APP_NAME)
    expect(resolveAppName('')).toBe(DEFAULT_APP_NAME)
    expect(resolveAppName('   ')).toBe(DEFAULT_APP_NAME)
  })
})
