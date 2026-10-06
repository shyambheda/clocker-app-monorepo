import rateLimit, {
  type FastifyRateLimitOptions,
  type FastifyRateLimitStore,
} from '@fastify/rate-limit'
// The package does not export its Redis store in its types. We wrap it to log store errors.
// The import needs the file extension, because the package has no `exports` map.
import RedisStore from '@fastify/rate-limit/store/RedisStore.js'
import type { FastifyBaseLogger, FastifyInstance } from 'fastify'
import fp from 'fastify-plugin'
import { AppError } from '../lib/errors'
import type { RedisConnection } from '../redis/client'

export interface RateLimitOptions {
  max: number
  timeWindowMs: number
  /** Shared counters for all API instances. Null only in unit tests: then a memory store is used. */
  redis: RedisConnection | null
}

const NAME_SPACE = 'rl:'

type StoreParams = { continueExceeding: boolean; exponentialBackoff: boolean }
type RedisStoreCtor = new (
  continueExceeding: boolean,
  exponentialBackoff: boolean,
  redis: RedisConnection,
  key: string,
) => FastifyRateLimitStore

// When Redis fails, the limiter lets the request through (`skipOnError`). An API that stops when
// Redis stops is worse than a short time without limits. This store writes the error to the log.
function loggingRedisStore(redis: RedisConnection, log: FastifyBaseLogger) {
  class LoggingRedisStore implements FastifyRateLimitStore {
    private readonly inner: FastifyRateLimitStore

    constructor(options: FastifyRateLimitOptions, inner?: FastifyRateLimitStore) {
      // The plugin calls `new Store(globalParams)`. Its type does not list these two fields.
      const params = options as FastifyRateLimitOptions & StoreParams
      this.inner =
        inner ??
        new (RedisStore as RedisStoreCtor)(
          params.continueExceeding,
          params.exponentialBackoff,
          redis,
          NAME_SPACE,
        )
    }

    incr: FastifyRateLimitStore['incr'] = (key, callback, timeWindow, max) => {
      this.inner.incr(
        key,
        (err, result) => {
          if (err) log.error({ err }, 'rate limit store failed, request allowed')
          callback(err, result)
        },
        timeWindow,
        max,
      )
    }

    child: FastifyRateLimitStore['child'] = (routeOptions) => {
      return new LoggingRedisStore({}, this.inner.child(routeOptions))
    }
  }
  return LoggingRedisStore
}

async function rateLimitPlugin(app: FastifyInstance, options: RateLimitOptions) {
  await app.register(rateLimit, {
    global: true,
    max: options.max,
    timeWindow: options.timeWindowMs,
    // request.ip respects TRUST_PROXY_HOPS, so a client cannot choose its own key.
    keyGenerator: (request) => request.ip,
    skipOnError: true,
    nameSpace: NAME_SPACE,
    ...(options.redis ? { store: loggingRedisStore(options.redis, app.log) } : {}),
    errorResponseBuilder: () =>
      new AppError(429, 'RATE_LIMITED', 'Too many requests. Try again later'),
  })
}

export const rateLimiter = fp(rateLimitPlugin, { name: 'rate-limit' })
