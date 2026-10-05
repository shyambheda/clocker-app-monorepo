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

export const apiEnvSchema = baseEnvSchema.extend({
  HOST: z.string().min(1).default('0.0.0.0'),
  PORT: z.coerce.number().int().min(1).max(65535).default(4000),
})

export const workerEnvSchema = baseEnvSchema.extend({
  REDIS_URL: z.url({ protocol: /^rediss?$/ }),
})

export type ApiEnv = z.infer<typeof apiEnvSchema>
export type WorkerEnv = z.infer<typeof workerEnvSchema>

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
