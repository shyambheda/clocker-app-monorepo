import type { FastifyInstance } from 'fastify'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { buildApp } from '../src/app'

describe('GET /health/live', () => {
  let app: FastifyInstance

  beforeAll(async () => {
    app = await buildApp()
  })

  afterAll(async () => {
    await app.close()
  })

  it('returns ok with a UTC timestamp', async () => {
    const res = await app.inject({ method: 'GET', url: '/health/live' })
    expect(res.statusCode).toBe(200)
    const body = res.json<{ status: string; time: string }>()
    expect(body.status).toBe('ok')
    expect(body.time).toMatch(/Z$/)
  })

  it('returns 404 for unknown routes', async () => {
    const res = await app.inject({ method: 'GET', url: '/nope' })
    expect(res.statusCode).toBe(404)
  })
})
