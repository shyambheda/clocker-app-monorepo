import { afterEach, describe, expect, it } from 'vitest'
import type { App } from '../../src/app'
import { API_CSP } from '../../src/plugins/helmet'
import { REFERENCE_CSP } from '../../src/plugins/openapi'
import { buildTestApp } from '../helpers'

const ALLOWED = 'http://localhost:3000'
const EVIL = 'https://evil.example.net'

let app: App | undefined
afterEach(async () => {
  await app?.close()
  app = undefined
})

function errorCode(body: string) {
  return (JSON.parse(body) as { error: { code: string } }).error.code
}

describe('security headers', () => {
  it('sends a strict policy for the JSON API', async () => {
    app = await buildTestApp()
    const res = await app.inject({ method: 'GET', url: '/health/live' })
    expect(res.headers['content-security-policy']).toBe(API_CSP)
    expect(res.headers['x-content-type-options']).toBe('nosniff')
    expect(res.headers['cross-origin-resource-policy']).toBe('same-site')
    expect(res.headers['x-frame-options']).toBe('DENY')
    expect(res.headers['x-powered-by']).toBeUndefined()
    expect(res.headers['strict-transport-security']).toBeUndefined()
  })

  it('sends HSTS in production', async () => {
    app = await buildTestApp({ config: { NODE_ENV: 'production' } })
    const res = await app.inject({ method: 'GET', url: '/health/live' })
    expect(res.headers['strict-transport-security']).toBe('max-age=31536000; includeSubDomains')
  })

  it('sends the error headers also on errors', async () => {
    app = await buildTestApp()
    const res = await app.inject({ method: 'GET', url: '/nope' })
    expect(res.headers['content-security-policy']).toBe(API_CSP)
  })
})

describe('API reference', () => {
  it('serves /reference with its own policy outside production', async () => {
    app = await buildTestApp({ config: { NODE_ENV: 'development' } })
    const res = await app.inject({ method: 'GET', url: '/reference/' })
    expect(res.statusCode).toBe(200)
    expect(res.headers['content-type']).toContain('text/html')
    expect(res.headers['content-security-policy']).toBe(REFERENCE_CSP)

    // The less strict policy applies only to /reference.
    const api = await app.inject({ method: 'GET', url: '/health/live' })
    expect(api.headers['content-security-policy']).toBe(API_CSP)
  })

  it('does not exist in production', async () => {
    app = await buildTestApp({ config: { NODE_ENV: 'production' } })
    for (const url of ['/reference', '/reference/', '/reference/openapi.json']) {
      const res = await app.inject({ method: 'GET', url })
      expect(res.statusCode, url).toBe(404)
    }
  })
})

describe('CORS', () => {
  it('sends CORS headers to an allowed origin', async () => {
    app = await buildTestApp()
    const res = await app.inject({
      method: 'GET',
      url: '/health/live',
      headers: { origin: ALLOWED },
    })
    expect(res.statusCode).toBe(200)
    expect(res.headers['access-control-allow-origin']).toBe(ALLOWED)
    expect(res.headers['access-control-allow-credentials']).toBe('true')
    expect(res.headers.vary).toContain('Origin')
  })

  it('answers the preflight of an allowed origin', async () => {
    app = await buildTestApp()
    const res = await app.inject({
      method: 'OPTIONS',
      url: '/health/live',
      headers: { origin: ALLOWED, 'access-control-request-method': 'POST' },
    })
    expect(res.statusCode).toBe(204)
    expect(res.headers['access-control-allow-origin']).toBe(ALLOWED)
    expect(res.headers['access-control-allow-methods']).toContain('POST')
    expect(res.headers['access-control-max-age']).toBe('600')
  })

  it('allows the origin of the API itself', async () => {
    app = await buildTestApp()
    const res = await app.inject({
      method: 'GET',
      url: '/health/live',
      headers: { origin: 'http://localhost:4000' },
    })
    expect(res.statusCode).toBe(200)
  })

  it.each([
    ['a different origin', EVIL],
    ['Origin: null', 'null'],
    ['an origin that only starts like an allowed one', 'http://localhost:30000'],
  ])('rejects %s with 403', async (_name, origin) => {
    app = await buildTestApp()
    const res = await app.inject({ method: 'GET', url: '/health/live', headers: { origin } })
    expect(res.statusCode).toBe(403)
    expect(errorCode(res.body)).toBe('ORIGIN_NOT_ALLOWED')
    expect(res.headers['access-control-allow-origin']).toBeUndefined()
  })

  it('rejects the preflight of a different origin with 403', async () => {
    app = await buildTestApp()
    const res = await app.inject({
      method: 'OPTIONS',
      url: '/health/live',
      headers: { origin: EVIL, 'access-control-request-method': 'POST' },
    })
    expect(res.statusCode).toBe(403)
    expect(errorCode(res.body)).toBe('ORIGIN_NOT_ALLOWED')
  })
})

describe('origin check for cookie writes', () => {
  const routes = (target: App) => {
    target.post('/test/write', () => ({ ok: true }))
    target.post('/webhooks/test', () => ({ ok: true }))
  }

  it('rejects a write with a cookie and without Origin', async () => {
    app = await buildTestApp({ routes })
    const res = await app.inject({
      method: 'POST',
      url: '/test/write',
      headers: { cookie: 'session=abc' },
    })
    expect(res.statusCode).toBe(403)
    expect(errorCode(res.body)).toBe('ORIGIN_REQUIRED')
  })

  it('accepts a write with a cookie from an allowed origin', async () => {
    app = await buildTestApp({ routes })
    const res = await app.inject({
      method: 'POST',
      url: '/test/write',
      headers: { cookie: 'session=abc', origin: ALLOWED },
    })
    expect(res.statusCode).toBe(200)
  })

  it('accepts a write with only a bearer token', async () => {
    app = await buildTestApp({ routes })
    const res = await app.inject({
      method: 'POST',
      url: '/test/write',
      headers: { authorization: 'Bearer abc' },
    })
    expect(res.statusCode).toBe(200)
  })

  it('accepts a read with a cookie and without Origin', async () => {
    app = await buildTestApp()
    const res = await app.inject({
      method: 'GET',
      url: '/health/live',
      headers: { cookie: 'session=abc' },
    })
    expect(res.statusCode).toBe(200)
  })

  it('does not apply to webhooks', async () => {
    app = await buildTestApp({ routes })
    const res = await app.inject({
      method: 'POST',
      url: '/webhooks/test',
      headers: { cookie: 'session=abc' },
    })
    expect(res.statusCode).toBe(200)
  })
})

describe('rate limit', () => {
  it('returns 429 with the error shape and Retry-After', async () => {
    app = await buildTestApp({ config: { RATE_LIMIT_MAX: 2 } })
    const send = () => app!.inject({ method: 'GET', url: '/health/ready' })
    expect((await send()).statusCode).toBe(200)
    expect((await send()).statusCode).toBe(200)
    const res = await send()
    expect(res.statusCode).toBe(429)
    expect(errorCode(res.body)).toBe('RATE_LIMITED')
    expect(Number(res.headers['retry-after'])).toBeGreaterThan(0)
    expect(res.headers['x-request-id']).toBeDefined()
  })

  it('counts unknown routes', async () => {
    app = await buildTestApp({ config: { RATE_LIMIT_MAX: 1 } })
    expect((await app.inject({ method: 'GET', url: '/a' })).statusCode).toBe(404)
    expect((await app.inject({ method: 'GET', url: '/b' })).statusCode).toBe(429)
  })

  it('does not limit the liveness check', async () => {
    app = await buildTestApp({ config: { RATE_LIMIT_MAX: 1 } })
    for (let i = 0; i < 5; i++) {
      expect((await app.inject({ method: 'GET', url: '/health/live' })).statusCode).toBe(200)
    }
  })
})
