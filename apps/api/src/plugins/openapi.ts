import swagger from '@fastify/swagger'
import scalar from '@scalar/fastify-api-reference'
import type { FastifyInstance } from 'fastify'
import fp from 'fastify-plugin'
import { jsonSchemaTransform } from 'fastify-type-provider-zod'
import { version } from '../../package.json'

export interface OpenApiOptions {
  appName: string
  /** Show the API reference UI at /reference. Never in production. */
  exposeReference: boolean
}

// The reference page runs scripts and styles of its own (served from /reference), so it needs a less
// strict policy than the JSON API. This policy applies only to /reference.
export const REFERENCE_CSP = [
  "default-src 'none'",
  "script-src 'self' 'unsafe-inline'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data:",
  "font-src 'self' data:",
  "connect-src 'self'",
  "frame-ancestors 'none'",
  "base-uri 'none'",
  "form-action 'none'",
].join(';')

// The OpenAPI document comes from the Zod schemas of the routes.
// `pnpm --filter @repo/api openapi` writes it to docs/api/openapi.json.
async function openApiPlugin(app: FastifyInstance, options: OpenApiOptions) {
  await app.register(swagger, {
    openapi: {
      openapi: '3.1.0',
      info: { title: `${options.appName} API`, version },
    },
    transform: jsonSchemaTransform,
  })

  if (options.exposeReference) {
    await app.register(scalar, {
      routePrefix: '/reference',
      logLevel: 'warn',
      hooks: {
        onRequest: (_request, reply, done) => {
          reply.header('content-security-policy', REFERENCE_CSP)
          done()
        },
      },
    })
  }
}

export const openApi = fp(openApiPlugin, { name: 'openapi' })
