import { randomUUID } from 'node:crypto'
import Fastify, { type FastifyBaseLogger } from 'fastify'
import {
  serializerCompiler,
  validatorCompiler,
  type ZodTypeProvider,
} from 'fastify-type-provider-zod'
import type { ApiEnv } from './config/env'
import type { DatabaseClient } from './db/client'
import { healthRoutes } from './modules/health/routes'
import { corsWithOriginCheck } from './plugins/cors'
import { errorHandler, notFoundHandler } from './plugins/error-handler'
import { securityHeaders } from './plugins/helmet'
import { openApi } from './plugins/openapi'
import { originCheck } from './plugins/origin-check'
import { rateLimiter } from './plugins/rate-limit'
import type { RedisClient } from './redis/client'

export const BODY_LIMIT_BYTES = 100 * 1024

export type AppConfig = Pick<
  ApiEnv,
  | 'APP_NAME'
  | 'NODE_ENV'
  | 'API_URL'
  | 'CORS_ORIGINS'
  | 'TRUST_PROXY_HOPS'
  | 'RATE_LIMIT_MAX'
  | 'RATE_LIMIT_WINDOW_MS'
>

export interface AppDeps {
  db: Pick<DatabaseClient, 'db' | 'ping' | 'close'>
  /** `connection` is null only in unit tests: the rate limiter then uses a memory store. */
  redis: Omit<RedisClient, 'connection'> & { connection: RedisClient['connection'] | null }
}

export interface BuildAppOptions {
  config: AppConfig
  deps: AppDeps
  /** A pino logger. Without it, the app does not log (unit tests). */
  logger?: FastifyBaseLogger
}

// Builds the Fastify app without listening, so tests can drive it with app.inject().
// The function does not call ready(): tests can add their own routes first.
// The order of the plugins is important. See docs/architecture/security.md.
export async function buildApp({ config, deps, logger }: BuildAppOptions) {
  const app = Fastify({
    ...(logger ? { loggerInstance: logger } : {}),
    // Trust only the last TRUST_PROXY_HOPS entries of X-Forwarded-For (our own proxies).
    // A client can add more entries, but they are not trusted, so request.ip is correct.
    trustProxy: (_address: string, hop: number) => hop < config.TRUST_PROXY_HOPS,
    bodyLimit: BODY_LIMIT_BYTES,
    onProtoPoisoning: 'error',
    onConstructorPoisoning: 'error',
    // Ignore request ids from clients: a client must not be able to choose ids in our logs.
    requestIdHeader: false,
    genReqId: () => randomUUID(),
    requestTimeout: 30_000,
    return503OnClosing: true,
  }).withTypeProvider<ZodTypeProvider>()

  app.addHook('onRequest', (request, reply, done) => {
    reply.header('x-request-id', request.id)
    done()
  })

  // 1. Zod validates the input and serializes the output (unknown fields are removed).
  app.setValidatorCompiler(validatorCompiler)
  app.setSerializerCompiler(serializerCompiler)

  // 2. Errors first, so that all errors (CORS, rate limit, body parser) have the same shape.
  await app.register(errorHandler)

  // 3. Security headers.
  await app.register(securityHeaders, { production: config.NODE_ENV === 'production' })

  // 4. Origin allowlist, CORS and the origin check for cookie writes.
  const allowedOrigins = new Set([...config.CORS_ORIGINS, new URL(config.API_URL).origin])
  await app.register(corsWithOriginCheck, { allowedOrigins })
  await app.register(originCheck, { allowedOrigins })

  // 5. Rate limit for each IP, shared through Redis by all instances.
  await app.register(rateLimiter, {
    max: config.RATE_LIMIT_MAX,
    timeWindowMs: config.RATE_LIMIT_WINDOW_MS,
    redis: deps.redis.connection,
  })
  app.setNotFoundHandler({ preHandler: app.rateLimit() }, notFoundHandler)

  // 6. OpenAPI document, and the reference UI outside production.
  await app.register(openApi, {
    appName: config.APP_NAME,
    exposeReference: config.NODE_ENV !== 'production',
  })

  // 7. Routes.
  await app.register(healthRoutes, { database: deps.db, redis: deps.redis })

  // 8. Close the connections when the app closes (SIGTERM on redeploy, end of a test).
  app.addHook('onClose', async () => {
    await Promise.allSettled([deps.db.close(), deps.redis.close()])
  })

  return app
}

export type App = Awaited<ReturnType<typeof buildApp>>
