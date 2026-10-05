import closeWithGrace from 'close-with-grace'
import { buildApp } from './app'
import { EnvValidationError, apiEnvSchema, loadEnv } from './config/env'
import { loggerOptions } from './lib/logger'

let env
try {
  env = loadEnv(apiEnvSchema)
} catch (error) {
  if (error instanceof EnvValidationError) {
    console.error(error.message)
    process.exit(1)
  }
  throw error
}

const app = await buildApp({ logger: loggerOptions(env) })

// Railway (and Docker) send SIGTERM on redeploy. Finish in-flight requests, then exit.
closeWithGrace({ delay: 10_000 }, async ({ signal, err }) => {
  if (err) app.log.error({ err }, 'shutting down after an unexpected error')
  else app.log.info({ signal }, 'shutting down')
  await app.close()
})

await app.listen({ host: env.HOST, port: env.PORT })
