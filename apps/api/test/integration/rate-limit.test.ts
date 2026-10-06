import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import type { App } from '../../src/app'
import { createRedis } from '../../src/redis/client'
import { buildIntegrationApp, testDb } from './helpers'

describe('rate limit with Redis', () => {
  let first: App
  let second: App

  beforeAll(async () => {
    const redis = createRedis(testDb().redisUrl, { profile: 'http', onError: () => {} })
    await redis.connection.flushdb()
    await redis.close()
    first = await buildIntegrationApp({ config: { RATE_LIMIT_MAX: 3 } })
    second = await buildIntegrationApp({ config: { RATE_LIMIT_MAX: 3 } })
  })

  afterAll(async () => {
    await Promise.all([first?.close(), second?.close()])
  })

  it('shares the counter between two app instances', async () => {
    const statuses: number[] = []
    for (const app of [first, second, first, second]) {
      const res = await app.inject({ method: 'GET', url: '/health/ready' })
      statuses.push(res.statusCode)
    }
    expect(statuses).toEqual([200, 200, 200, 429])
  })
})
