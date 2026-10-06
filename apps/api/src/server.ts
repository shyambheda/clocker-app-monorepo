import closeWithGrace from 'close-with-grace'
import { pino } from 'pino'
import { buildApp } from './app'
import { apiEnvSchema, loadEnvOrExit } from './config/env'
import { createDb } from './db/client'
import { loggerOptions } from './lib/logger'
import { createRedis } from './redis/client'

const env = loadEnvOrExit(apiEnvSchema)
const logger = pino(loggerOptions(env))

const db = createDb(env.DATABASE_URL, { applicationName: env.APP_NAME })
const redis = createRedis(env.REDIS_URL, {
  profile: 'http',
  onError: (err) => logger.error({ err }, 'redis connection error'),
})

const app = await buildApp({ config: env, deps: { db, redis }, logger })

// Railway (and Docker) send SIGTERM on redeploy. Finish in-flight requests, then exit.
// app.close() also closes the database pool and Redis (onClose hook in app.ts).
closeWithGrace({ delay: 10_000 }, async ({ signal, err }) => {
  if (err) app.log.error({ err }, 'shutting down after an unexpected error')
  else app.log.info({ signal }, 'shutting down')
  await app.close()
})

await app.listen({ host: env.HOST, port: env.PORT })
app.log.info({ appName: env.APP_NAME }, 'api ready')
