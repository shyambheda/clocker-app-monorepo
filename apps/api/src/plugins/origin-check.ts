import type { FastifyInstance, FastifyRequest } from 'fastify'
import fp from 'fastify-plugin'
import { AppError } from '../lib/errors'

export interface OriginCheckOptions {
  allowedOrigins: ReadonlySet<string>
}

const WRITE_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE'])

// Defense against cross-site request forgery (CSRF) for cookie sessions (Phase 4).
// A write request that sends a cookie must come from a page on the allowlist. Browsers always send
// `Origin` on these requests. Requests with only a bearer token and requests without cookies are
// not affected: a different site cannot make the browser add them.
// Webhooks (`/webhooks/*`) come from providers, not browsers. They verify a signature instead.
function isRejected(request: FastifyRequest, allowedOrigins: ReadonlySet<string>): boolean {
  if (!WRITE_METHODS.has(request.method)) return false
  if (request.headers.cookie === undefined) return false
  if (request.url.startsWith('/webhooks/')) return false
  const origin = request.headers.origin
  return origin === undefined || !allowedOrigins.has(origin)
}

function originCheckPlugin(
  app: FastifyInstance,
  options: OriginCheckOptions,
  done: (err?: Error) => void,
) {
  app.addHook('onRequest', (request, _reply, hookDone) => {
    if (isRejected(request, options.allowedOrigins)) {
      hookDone(
        new AppError(403, 'ORIGIN_REQUIRED', 'This request must come from an allowed origin'),
      )
      return
    }
    hookDone()
  })
  done()
}

export const originCheck = fp(originCheckPlugin, { name: 'origin-check' })
