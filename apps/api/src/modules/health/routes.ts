import type { FastifyInstance } from 'fastify'

export function healthRoutes(app: FastifyInstance): void {
  // Liveness: the process is up and serving HTTP. It checks no dependencies, so a database or
  // Redis outage never makes the platform restart a healthy container.
  // Readiness (DB + Redis checks) arrives in Phase 1.
  app.get(
    '/health/live',
    {
      schema: {
        response: {
          200: {
            type: 'object',
            properties: {
              status: { type: 'string', enum: ['ok'] },
              time: { type: 'string', format: 'date-time' },
            },
            required: ['status', 'time'],
            additionalProperties: false,
          },
        },
      },
    },
    () => ({ status: 'ok' as const, time: new Date().toISOString() }),
  )
}
