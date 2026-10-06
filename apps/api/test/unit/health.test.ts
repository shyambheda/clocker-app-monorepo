import { afterEach, describe, expect, it } from 'vitest'
import type { App } from '../../src/app'
import { buildTestApp, fakeDeps } from '../helpers'

let app: App | undefined
afterEach(async () => {
  await app?.close()
  app = undefined
})

describe('GET /health/live', () => {
  it('returns ok with a UTC timestamp', async () => {
    app = await buildTestApp()
    const res = await app.inject({ method: 'GET', url: '/health/live' })
    expect(res.statusCode).toBe(200)
    const body = res.json<{ status: string; time: string }>()
    expect(body.status).toBe('ok')
    expect(body.time).toMatch(/Z$/)
  })

  it('does not check the dependencies', async () => {
    const deps = fakeDeps({ database: 'fail', redis: 'fail' })
    app = await buildTestApp({ deps })
    const res = await app.inject({ method: 'GET', url: '/health/live' })
    expect(res.statusCode).toBe(200)
    expect(deps.db.ping).not.toHaveBeenCalled()
  })
})

describe('GET /health/ready', () => {
  it('returns 200 when the database and Redis answer', async () => {
    const deps = fakeDeps()
    app = await buildTestApp({ deps })
    const res = await app.inject({ method: 'GET', url: '/health/ready' })
    expect(res.statusCode).toBe(200)
    expect(res.json()).toEqual({ status: 'ok', checks: { database: 'ok', redis: 'ok' } })
    // Each check has a 2 second timeout.
    expect(deps.db.ping).toHaveBeenCalledWith(2_000)
    expect(deps.redis.ping).toHaveBeenCalledWith(2_000)
  })

  it.each([
    [{ database: 'fail' as const }, { database: 'fail', redis: 'ok' }],
    [{ redis: 'fail' as const }, { database: 'ok', redis: 'fail' }],
    [
      { database: 'fail' as const, redis: 'fail' as const },
      { database: 'fail', redis: 'fail' },
    ],
  ])('returns 503 without details (%o)', async (state, checks) => {
    app = await buildTestApp({ deps: fakeDeps(state) })
    const res = await app.inject({ method: 'GET', url: '/health/ready' })
    expect(res.statusCode).toBe(503)
    expect(res.json()).toEqual({ status: 'unavailable', checks })
    expect(res.body).not.toContain('ECONNREFUSED')
    expect(res.body).not.toContain('internal')
  })

  it('closes the database and Redis when the app closes', async () => {
    const deps = fakeDeps()
    const local = await buildTestApp({ deps })
    await local.close()
    expect(deps.db.close).toHaveBeenCalledOnce()
    expect(deps.redis.close).toHaveBeenCalledOnce()
  })
})
