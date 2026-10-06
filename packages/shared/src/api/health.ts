import { z } from 'zod'

/** GET /health/live: the process runs. It does not check dependencies. */
export const HealthLiveResponseSchema = z.object({
  status: z.literal('ok'),
  time: z.iso.datetime(),
})
export type HealthLiveResponse = z.infer<typeof HealthLiveResponseSchema>

export const HealthCheckResultSchema = z.enum(['ok', 'fail'])

/**
 * GET /health/ready: the process can serve traffic (database and Redis answer).
 * Status 200 with `ok`, or 503 with `unavailable`. No error text, host names or timings.
 */
export const HealthReadyResponseSchema = z.object({
  status: z.enum(['ok', 'unavailable']),
  checks: z.object({
    database: HealthCheckResultSchema,
    redis: HealthCheckResultSchema,
  }),
})
export type HealthReadyResponse = z.infer<typeof HealthReadyResponseSchema>
