import closeWithGrace from 'close-with-grace'
import { Redis } from 'ioredis'
import { pino } from 'pino'
import { EnvValidationError, loadEnv, workerEnvSchema } from './config/env'
import { loggerOptions } from './lib/logger'

// Background worker process. Same codebase and image as the API, different entrypoint.
// For now, the worker only makes sure that the Redis connection works.
// Phase 3 adds BullMQ queues and schedules.

let env
try {
  env = loadEnv(workerEnvSchema)
} catch (error) {
  if (error instanceof EnvValidationError) {
    console.error(error.message)
    process.exit(1)
  }
  throw error
}

const log = pino(loggerOptions(env))
const redis = new Redis(env.REDIS_URL, { lazyConnect: true, maxRetriesPerRequest: null })
redis.on('error', (err) => log.error({ err }, 'redis connection error'))

await redis.connect()
await redis.ping()
log.info({ appName: env.APP_NAME }, 'worker ready')

closeWithGrace({ delay: 10_000 }, async ({ signal, err }) => {
  if (err) log.error({ err }, 'worker shutting down after an unexpected error')
  else log.info({ signal }, 'worker shutting down')
  await redis.quit()
})
