import closeWithGrace from 'close-with-grace'
import { pino } from 'pino'
import { loadEnvOrExit, workerEnvSchema } from './config/env'
import { loggerOptions } from './lib/logger'
import { createRedis } from './redis/client'

// Background worker process. Same codebase and image as the API, different entrypoint.
// For now, the worker only makes sure that the Redis connection works.
// Phase 3 adds BullMQ queues and schedules.

const env = loadEnvOrExit(workerEnvSchema)
const log = pino(loggerOptions(env))
const redis = createRedis(env.REDIS_URL, {
  profile: 'worker',
  onError: (err) => log.error({ err }, 'redis connection error'),
})

await redis.connection.connect()
await redis.ping(5_000)
log.info({ appName: env.APP_NAME }, 'worker ready')

closeWithGrace({ delay: 10_000 }, async ({ signal, err }) => {
  if (err) log.error({ err }, 'worker shutting down after an unexpected error')
  else log.info({ signal }, 'worker shutting down')
  await redis.close()
})
