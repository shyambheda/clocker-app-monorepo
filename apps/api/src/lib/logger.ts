import type { LoggerOptions } from 'pino'

// Anything that can carry a credential is redacted before it reaches the logs.
const REDACT_PATHS = [
  'req.headers.authorization',
  'req.headers.cookie',
  'res.headers["set-cookie"]',
  '*.password',
  '*.token',
  '*.secret',
  '*.apiKey',
]

export function loggerOptions(env: { NODE_ENV: string; LOG_LEVEL: string }): LoggerOptions {
  return {
    level: env.LOG_LEVEL,
    redact: { paths: REDACT_PATHS, censor: '[REDACTED]' },
    // Human-readable logs in development only. Production emits JSON for Railway's log search.
    ...(env.NODE_ENV === 'development'
      ? { transport: { target: 'pino-pretty', options: { translateTime: 'SYS:HH:MM:ss' } } }
      : {}),
  }
}
