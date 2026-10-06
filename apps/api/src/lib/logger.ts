import type { FastifyRequest } from 'fastify'
import type { LoggerOptions } from 'pino'

// Anything that can carry a credential or personal data is redacted before it reaches the logs.
// Add new paths here when a new sensitive field appears.
export const REDACT_PATHS = [
  // Request and response headers
  'req.headers.authorization',
  'req.headers.cookie',
  'req.headers["x-api-key"]',
  'req.headers["proxy-authorization"]',
  'res.headers["set-cookie"]',
  // Fields at any first level (for example `log.info({ user: { passwordHash } })`)
  '*.password',
  '*.passwordHash',
  '*.token',
  '*.accessToken',
  '*.refreshToken',
  '*.secret',
  '*.apiKey',
  '*.connectionString',
  '*.databaseUrl',
  '*.cookie',
  '*.authorization',
  // Errors: driver errors can hold row values (`detail`) and query parameters
  'err.detail',
  'err.params',
  'err.parameters',
  'err.cause.detail',
  'err.cause.params',
  'err.cause.parameters',
  'err.config',
  'err.headers',
]

// Log only what is necessary to follow a request. The path is logged without the query string,
// because query strings can hold tokens (for example in links from emails).
export function serializeRequest(request: FastifyRequest): Record<string, unknown> {
  // Code can also log a plain object as `req`. Keep only the safe fields of a real request.
  if (typeof request.url !== 'string') return {}
  return {
    method: request.method,
    path: request.url.split('?', 1)[0],
    requestId: request.id,
    ip: request.ip,
  }
}

export function loggerOptions(env: { NODE_ENV: string; LOG_LEVEL: string }): LoggerOptions {
  return {
    level: env.LOG_LEVEL,
    redact: { paths: REDACT_PATHS, censor: '[REDACTED]' },
    serializers: { req: serializeRequest },
    // Human-readable logs in development only. Production emits JSON for Railway's log search.
    ...(env.NODE_ENV === 'development'
      ? { transport: { target: 'pino-pretty', options: { translateTime: 'SYS:HH:MM:ss' } } }
      : {}),
  }
}
