import { afterEach, describe, expect, it } from 'vitest'
import type { App } from '../../src/app'
import { buildIntegrationApp } from './helpers'

let app: App | undefined
afterEach(async () => {
  await app?.close()
  app = undefined
})

describe('GET /health/ready with real services', () => {
  it('returns 200 when the database and Redis answer', async () => {
    app = await buildIntegrationApp()
    const res = await app.inject({ method: 'GET', url: '/health/ready' })
    expect(res.json()).toEqual({ status: 'ok', checks: { database: 'ok', redis: 'ok' } })
    expect(res.statusCode).toBe(200)
  })

  it('returns 503 when Redis is not available', async () => {
    // Nothing listens on port 1.
    app = await buildIntegrationApp({ redisUrl: 'redis://127.0.0.1:1' })
    const started = Date.now()
    const res = await app.inject({ method: 'GET', url: '/health/ready' })
    expect(res.statusCode).toBe(503)
    expect(res.json()).toEqual({ status: 'unavailable', checks: { database: 'ok', redis: 'fail' } })
    // The check has a timeout, so the response comes fast.
    expect(Date.now() - started).toBeLessThan(5_000)
  })

  it('lets requests through when Redis is not available for the rate limit', async () => {
    app = await buildIntegrationApp({
      redisUrl: 'redis://127.0.0.1:1',
      config: { RATE_LIMIT_MAX: 1 },
    })
    for (let i = 0; i < 3; i++) {
      const res = await app.inject({ method: 'GET', url: '/nope' })
      expect(res.statusCode).toBe(404)
    }
  })
})
