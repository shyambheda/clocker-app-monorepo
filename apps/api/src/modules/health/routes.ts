import { HealthLiveResponseSchema, HealthReadyResponseSchema } from '@repo/shared'
import type { FastifyPluginCallbackZod } from 'fastify-type-provider-zod'
import { z } from 'zod'

export interface HealthCheck {
  ping(timeoutMs: number): Promise<void>
}

export interface HealthRoutesOptions {
  database: HealthCheck
  redis: HealthCheck
}

const CHECK_TIMEOUT_MS = 2_000

export const healthRoutes: FastifyPluginCallbackZod<HealthRoutesOptions> = (app, options, done) => {
  // Liveness: the process is up and serving HTTP. It checks no dependencies, so a database or
  // Redis outage never makes the platform restart a healthy container. The Docker HEALTHCHECK uses it.
  app.get(
    '/health/live',
    {
      config: { rateLimit: false },
      schema: {
        tags: ['health'],
        summary: 'Liveness check',
        querystring: z.object({}),
        response: { 200: HealthLiveResponseSchema },
      },
    },
    () => ({ status: 'ok' as const, time: new Date().toISOString() }),
  )

  // Readiness: the process can serve traffic. The Railway deploy health check uses it.
  // The response has no error text, host names or timings. The log has the reason.
  app.get(
    '/health/ready',
    {
      schema: {
        tags: ['health'],
        summary: 'Readiness check (database and Redis)',
        querystring: z.object({}),
        response: { 200: HealthReadyResponseSchema, 503: HealthReadyResponseSchema },
      },
    },
    async (request, reply) => {
      const run = async (name: 'database' | 'redis', check: HealthCheck) => {
        try {
          await check.ping(CHECK_TIMEOUT_MS)
          return 'ok' as const
        } catch (err) {
          request.log.warn({ err, check: name }, 'readiness check failed')
          return 'fail' as const
        }
      }
      const [database, redis] = await Promise.all([
        run('database', options.database),
        run('redis', options.redis),
      ])
      const ok = database === 'ok' && redis === 'ok'
      return reply
        .status(ok ? 200 : 503)
        .send({ status: ok ? 'ok' : 'unavailable', checks: { database, redis } })
    },
  )

  done()
}
