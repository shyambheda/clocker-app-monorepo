import { afterEach, describe, expect, it } from 'vitest'
import { z } from 'zod'
import type { App } from '../../src/app'
import { buildTestApp } from '../helpers'

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/

let app: App | undefined
afterEach(async () => {
  await app?.close()
  app = undefined
})

function addTestRoutes(target: App) {
  target.post(
    '/test/echo',
    { schema: { body: z.object({ email: z.email(), count: z.number().int().optional() }) } },
    (request) => ({ received: request.body.email }),
  )
  target.get(
    '/test/strip',
    { schema: { response: { 200: z.object({ id: z.string() }) } } },
    () => ({ id: 'a', passwordHash: 'must not leave the server' }) as { id: string },
  )
  target.get('/test/boom', () => {
    throw new Error('relation "users" does not exist at db.internal.example')
  })
}

describe('request id', () => {
  it('adds an x-request-id header and ignores an id from the client', async () => {
    app = await buildTestApp()
    const res = await app.inject({
      method: 'GET',
      url: '/health/live',
      headers: { 'x-request-id': 'client-chosen', 'request-id': 'client-chosen' },
    })
    expect(res.headers['x-request-id']).toMatch(UUID)
  })

  it('puts the same id into the error body', async () => {
    app = await buildTestApp()
    const res = await app.inject({ method: 'GET', url: '/nope' })
    expect(res.json<{ error: { requestId: string } }>().error.requestId).toBe(
      res.headers['x-request-id'],
    )
  })
})

describe('error shape', () => {
  it('returns 404 with the error shape for an unknown route', async () => {
    app = await buildTestApp()
    const res = await app.inject({ method: 'GET', url: '/nope?token=abc' })
    expect(res.statusCode).toBe(404)
    expect(res.json()).toEqual({
      error: {
        code: 'NOT_FOUND',
        message: 'The resource does not exist',
        requestId: res.headers['x-request-id'],
      },
    })
  })

  it('returns 400 with details when validation fails', async () => {
    app = await buildTestApp({ routes: addTestRoutes })
    const res = await app.inject({
      method: 'POST',
      url: '/test/echo',
      payload: { email: 'not-an-email', count: 1.5 },
    })
    expect(res.statusCode).toBe(400)
    const { error } = res.json<{
      error: { code: string; details: { path: string; message: string }[] }
    }>()
    expect(error.code).toBe('VALIDATION_FAILED')
    expect(error.details.map((detail) => detail.path).sort()).toEqual(['body.count', 'body.email'])
    expect(JSON.stringify(error)).not.toContain('not-an-email')
  })

  it('returns 500 without the internal message or a stack trace', async () => {
    app = await buildTestApp({ routes: addTestRoutes })
    const res = await app.inject({ method: 'GET', url: '/test/boom' })
    expect(res.statusCode).toBe(500)
    expect(res.json()).toEqual({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Something went wrong',
        requestId: res.headers['x-request-id'],
      },
    })
    expect(res.body).not.toContain('relation')
    expect(res.body).not.toContain('at ')
  })

  it('removes fields that the response schema does not declare', async () => {
    app = await buildTestApp({ routes: addTestRoutes })
    const res = await app.inject({ method: 'GET', url: '/test/strip' })
    expect(res.statusCode).toBe(200)
    expect(res.json()).toEqual({ id: 'a' })
  })
})

describe('body parser', () => {
  it('returns 413 for a body that is larger than the limit', async () => {
    app = await buildTestApp({ routes: addTestRoutes })
    const res = await app.inject({
      method: 'POST',
      url: '/test/echo',
      headers: { 'content-type': 'application/json' },
      payload: JSON.stringify({ email: 'a@example.com', pad: 'x'.repeat(101 * 1024) }),
    })
    expect(res.statusCode).toBe(413)
    expect(res.json<{ error: { code: string } }>().error.code).toBe('PAYLOAD_TOO_LARGE')
  })

  it.each([
    ['__proto__', '{"email":"a@example.com","__proto__":{"isAdmin":true}}'],
    [
      'constructor.prototype',
      '{"email":"a@example.com","constructor":{"prototype":{"isAdmin":true}}}',
    ],
    ['bad JSON', '{"email":'],
  ])('returns 400 INVALID_BODY for %s', async (_name, payload) => {
    app = await buildTestApp({ routes: addTestRoutes })
    const res = await app.inject({
      method: 'POST',
      url: '/test/echo',
      headers: { 'content-type': 'application/json' },
      payload,
    })
    expect(res.statusCode).toBe(400)
    expect(res.json<{ error: { code: string } }>().error.code).toBe('INVALID_BODY')
  })

  it('returns 415 for a content type that is not supported', async () => {
    app = await buildTestApp({ routes: addTestRoutes })
    const res = await app.inject({
      method: 'POST',
      url: '/test/echo',
      headers: { 'content-type': 'application/xml' },
      payload: '<email>a@example.com</email>',
    })
    expect(res.statusCode).toBe(415)
    expect(res.json<{ error: { code: string } }>().error.code).toBe('UNSUPPORTED_MEDIA_TYPE')
  })
})

describe('trust proxy', () => {
  async function ipFor(hops: number) {
    app = await buildTestApp({
      config: { TRUST_PROXY_HOPS: hops },
      routes: (target) => target.get('/test/whoami', (request) => ({ ip: request.ip })),
    })
    const res = await app.inject({
      method: 'GET',
      url: '/test/whoami',
      remoteAddress: '10.0.0.1',
      headers: { 'x-forwarded-for': '6.6.6.6, 1.1.1.1' },
    })
    await app.close()
    app = undefined
    return res.json<{ ip: string }>().ip
  }

  it('uses the socket address when there is no proxy', async () => {
    expect(await ipFor(0)).toBe('10.0.0.1')
  })

  it('trusts only the configured number of hops', async () => {
    // Railway adds one entry. The client added 6.6.6.6 itself, so it is not trusted.
    expect(await ipFor(1)).toBe('1.1.1.1')
    expect(await ipFor(2)).toBe('6.6.6.6')
  })
})
