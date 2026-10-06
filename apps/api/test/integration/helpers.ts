import { inject } from 'vitest'
import { buildApp, type App } from '../../src/app'
import { createDb } from '../../src/db/client'
import { createRedis } from '../../src/redis/client'
import { TEST_CONFIG } from '../helpers'

export const testDb = () => inject('testDb')

/** An app with a real database (as app_user) and a real Redis. */
export async function buildIntegrationApp(
  options: { redisUrl?: string; config?: Partial<typeof TEST_CONFIG> } = {},
): Promise<App> {
  const { appUrl, redisUrl } = testDb()
  const app = await buildApp({
    config: { ...TEST_CONFIG, ...options.config },
    deps: {
      db: createDb(appUrl, { applicationName: 'integration-tests' }),
      redis: createRedis(options.redisUrl ?? redisUrl, { profile: 'http', onError: () => {} }),
    },
  })
  await app.ready()
  return app
}
