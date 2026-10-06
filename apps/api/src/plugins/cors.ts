import cors from '@fastify/cors'
import type { FastifyInstance } from 'fastify'
import fp from 'fastify-plugin'
import { AppError } from '../lib/errors'

export interface CorsOptions {
  /** Exact origins (scheme, host and port). The origin of API_URL is added automatically. */
  allowedOrigins: ReadonlySet<string>
}

// A browser request from an origin that is not on the allowlist (also its preflight) gets 403.
// `Origin: null` (sandboxed iframes, file://, some redirects) is never allowed.
// Requests without an Origin header (curl, server to server) are not affected by this check.
async function corsPlugin(app: FastifyInstance, options: CorsOptions) {
  app.addHook('onRequest', (request, _reply, done) => {
    const origin = request.headers.origin
    if (origin !== undefined && !options.allowedOrigins.has(origin)) {
      done(new AppError(403, 'ORIGIN_NOT_ALLOWED', 'This origin is not allowed'))
      return
    }
    done()
  })

  await app.register(cors, {
    // The hook above already rejected all other origins.
    origin: (origin, callback) =>
      callback(null, origin !== undefined && options.allowedOrigins.has(origin)),
    credentials: true,
    methods: ['GET', 'HEAD', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Accept'],
    exposedHeaders: ['X-Request-Id', 'Retry-After'],
    maxAge: 600,
    strictPreflight: true,
  })
}

export const corsWithOriginCheck = fp(corsPlugin, { name: 'cors' })
