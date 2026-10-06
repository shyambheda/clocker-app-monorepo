import { PostgreSqlContainer, type StartedPostgreSqlContainer } from '@testcontainers/postgresql'
import { RedisContainer, type StartedRedisContainer } from '@testcontainers/redis'
import { migrate, randomPassword, type TestDatabaseProvider } from './provider'

// Use the same major version as the Neon project (Postgres 18).
// Change both values together when the Neon project is upgraded.
export const POSTGRES_IMAGE = 'postgres:18-alpine'
export const REDIS_IMAGE = 'redis:8-alpine'

// Disposable Postgres and Redis containers (Testcontainers). Only Docker is necessary.
// Testcontainers also starts a small reaper container (Ryuk). It removes the containers when the
// test process stops, also after a crash.
export function localProvider(): TestDatabaseProvider {
  let postgres: StartedPostgreSqlContainer | undefined
  let redis: StartedRedisContainer | undefined

  return {
    name: 'local',
    async create() {
      // Keep each container as soon as it runs, so that destroy() can stop it also when
      // create() fails or a signal comes before create() is complete.
      await Promise.all([
        new PostgreSqlContainer(POSTGRES_IMAGE)
          .withDatabase('app')
          .withUsername('owner')
          .withPassword(randomPassword())
          .start()
          .then((container) => (postgres = container)),
        new RedisContainer(REDIS_IMAGE).start().then((container) => (redis = container)),
      ])
      if (!postgres || !redis) throw new Error('containers did not start')
      const ownerUrl = postgres.getConnectionUri()
      const appUrl = await migrate(ownerUrl)
      return { ownerUrl, appUrl, redisUrl: redis.getConnectionUrl() }
    },
    async destroy() {
      await Promise.allSettled([postgres?.stop(), redis?.stop()])
      postgres = undefined
      redis = undefined
    },
  }
}
