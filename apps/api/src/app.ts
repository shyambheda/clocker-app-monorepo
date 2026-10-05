import { randomUUID } from 'node:crypto'
import Fastify, { type FastifyInstance } from 'fastify'
import type { LoggerOptions } from 'pino'
import { healthRoutes } from './modules/health/routes'

export interface BuildAppOptions {
  logger?: LoggerOptions | false
}

// Builds the Fastify app without listening, so tests can drive it with app.inject().
// Phase 2 adds the security plugins (helmet, CORS, rate limits and more) here.
export async function buildApp(options: BuildAppOptions = {}): Promise<FastifyInstance> {
  const app = Fastify({
    logger: options.logger ?? false,
    genReqId: () => randomUUID(),
  })

  healthRoutes(app)

  await app.ready()
  return app
}
