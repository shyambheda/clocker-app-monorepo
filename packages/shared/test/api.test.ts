import { describe, expect, it } from 'vitest'
import {
  ApiErrorResponseSchema,
  HealthLiveResponseSchema,
  HealthReadyResponseSchema,
} from '../src/index'

describe('ApiErrorResponseSchema', () => {
  it('accepts an error with validation details', () => {
    const body = {
      error: {
        code: 'VALIDATION_FAILED',
        message: 'The request is not valid',
        requestId: 'abc',
        details: [{ path: 'body.email', message: 'Invalid email address' }],
      },
    }
    expect(ApiErrorResponseSchema.parse(body)).toEqual(body)
  })

  it('rejects an unknown error code', () => {
    const body = { error: { code: 'SOMETHING', message: 'x', requestId: 'abc' } }
    expect(ApiErrorResponseSchema.safeParse(body).success).toBe(false)
  })
})

describe('health schemas', () => {
  it('requires a UTC time for the live check', () => {
    expect(
      HealthLiveResponseSchema.safeParse({ status: 'ok', time: '2026-10-06T09:00:00Z' }).success,
    ).toBe(true)
    expect(
      HealthLiveResponseSchema.safeParse({ status: 'ok', time: '2026-10-06T09:00:00+05:30' })
        .success,
    ).toBe(false)
  })

  it('accepts only ok or fail for each ready check', () => {
    const ready = { status: 'unavailable', checks: { database: 'fail', redis: 'ok' } }
    expect(HealthReadyResponseSchema.parse(ready)).toEqual(ready)
    expect(
      HealthReadyResponseSchema.safeParse({ status: 'ok', checks: { database: 'up', redis: 'ok' } })
        .success,
    ).toBe(false)
  })
})
