import { resolveAppName } from '@repo/shared'
import { z } from 'zod'

// Every process validates its environment at boot and refuses to start on bad config.
// Error messages name the variable but never echo its value, so secrets don't leak into logs.

const baseEnvSchema = z.object({
  // Product name. Each product sets its own value. Emails and logs use it.
  // An empty value gives the default name.
  APP_NAME: z
    .string()
    .max(100)
    .optional()
    .transform((value) => resolveAppName(value)),
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent']).default('info'),
})

const postgresUrl = z.url({ protocol: /^postgres(ql)?$/, error: 'must be a postgres:// URL' })
const redisUrl = z.url({ protocol: /^rediss?$/, error: 'must be a redis:// or rediss:// URL' })

// An origin is scheme, host and port only. No path, no trailing slash, no wildcard.
// The CORS check compares origins as exact strings, so the value must already be in canonical form.
function isOrigin(value: string): boolean {
  try {
    const url = new URL(value)
    return (url.protocol === 'http:' || url.protocol === 'https:') && url.origin === value
  } catch {
    return false
  }
}

const originList = z
  .string()
  .default('')
  .transform((value) =>
    value
      .split(',')
      .map((item) => item.trim())
      .filter((item) => item.length > 0),
  )
  .pipe(
    z.array(
      z.string().refine(isOrigin, {
        error: 'must be an origin (scheme, host and port), without a path, a slash at the end or *',
      }),
    ),
  )

const positiveInt = z.coerce.number().int().positive()

export const apiEnvSchema = baseEnvSchema.extend({
  HOST: z.string().min(1).default('0.0.0.0'),
  PORT: z.coerce.number().int().min(1).max(65535).default(4000),
  // Public URL of the API. Its origin is on the CORS allowlist automatically.
  API_URL: z.url({ protocol: /^https?$/, error: 'must be an http:// or https:// URL' }),
  DATABASE_URL: postgresUrl,
  REDIS_URL: redisUrl,
  // Browser origins that can call the API, separated with commas. The match is exact.
  CORS_ORIGINS: originList,
  // Number of reverse proxies in front of the API. 0 locally, 1 on Railway.
  TRUST_PROXY_HOPS: z.coerce.number().int().min(0).max(5).default(0),
  RATE_LIMIT_MAX: positiveInt.default(300),
  RATE_LIMIT_WINDOW_MS: positiveInt.default(60_000),
})

export const workerEnvSchema = baseEnvSchema.extend({
  REDIS_URL: redisUrl,
})

// The migrate script connects with the owner role (DATABASE_MIGRATION_URL). It reads DATABASE_URL
// only to get the user name and the password of the runtime role.
export const migrateEnvSchema = baseEnvSchema.extend({
  DATABASE_MIGRATION_URL: postgresUrl,
  DATABASE_URL: postgresUrl,
})

export type ApiEnv = z.infer<typeof apiEnvSchema>
export type WorkerEnv = z.infer<typeof workerEnvSchema>
export type MigrateEnv = z.infer<typeof migrateEnvSchema>

export class EnvValidationError extends Error {
  override name = 'EnvValidationError'
}

export function loadEnv<T extends z.ZodType>(
  schema: T,
  source: NodeJS.ProcessEnv = process.env,
): z.infer<T> {
  const parsed = schema.safeParse(source)
  if (!parsed.success) {
    const problems = parsed.error.issues
      .map((issue) => `  - ${issue.path.join('.') || '(root)'}: ${issue.message}`)
      .join('\n')
    throw new EnvValidationError(`Invalid environment configuration:\n${problems}`)
  }
  return parsed.data
}

// Boot helper for the entry points: print the problems (without values) and exit.
export function loadEnvOrExit<T extends z.ZodType>(schema: T): z.infer<T> {
  try {
    return loadEnv(schema)
  } catch (error) {
    if (error instanceof EnvValidationError) {
      console.error(error.message)
      process.exit(1)
    }
    throw error
  }
}
