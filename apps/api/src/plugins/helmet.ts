import helmet from '@fastify/helmet'
import type { FastifyInstance } from 'fastify'
import fp from 'fastify-plugin'

export interface SecurityHeadersOptions {
  production: boolean
}

// The API sends JSON only, so the content security policy blocks everything.
// The API reference page (`/reference`, development only) sets its own policy (plugins/openapi.ts).
// The value is in the format that helmet sends (no space after `;`).
export const API_CSP =
  "default-src 'none';frame-ancestors 'none';base-uri 'none';form-action 'none'"

async function securityHeadersPlugin(app: FastifyInstance, options: SecurityHeadersOptions) {
  await app.register(helmet, {
    contentSecurityPolicy: {
      useDefaults: false,
      directives: {
        defaultSrc: ["'none'"],
        frameAncestors: ["'none'"],
        baseUri: ["'none'"],
        formAction: ["'none'"],
      },
    },
    crossOriginResourcePolicy: { policy: 'same-site' },
    frameguard: { action: 'deny' },
    // HSTS only in production: on localhost (http) it has no effect, and it can break other local apps.
    hsts: options.production ? { maxAge: 31_536_000, includeSubDomains: true } : false,
  })
}

export const securityHeaders = fp(securityHeadersPlugin, { name: 'security-headers' })
