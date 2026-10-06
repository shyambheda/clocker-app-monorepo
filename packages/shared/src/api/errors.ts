import { z } from 'zod'

/**
 * Error contract of the API. Each error response has this shape:
 *   { error: { code, message, requestId, details? } }
 * The message is safe to show to a user. It never contains a stack trace, SQL or an internal identifier.
 * Clients use `code` for logic and `requestId` to report a problem.
 */

export const ERROR_CODES = [
  'VALIDATION_FAILED',
  'INVALID_BODY',
  'BAD_REQUEST',
  'UNAUTHORIZED',
  'FORBIDDEN',
  'ORIGIN_NOT_ALLOWED',
  'ORIGIN_REQUIRED',
  'NOT_FOUND',
  'METHOD_NOT_ALLOWED',
  'NOT_ACCEPTABLE',
  'REQUEST_TIMEOUT',
  'CONFLICT',
  'GONE',
  'PAYLOAD_TOO_LARGE',
  'UNSUPPORTED_MEDIA_TYPE',
  'UNPROCESSABLE',
  'RATE_LIMITED',
  'REQUEST_FAILED',
  'INTERNAL_ERROR',
] as const

export const ErrorCodeSchema = z.enum(ERROR_CODES)
export type ErrorCode = z.infer<typeof ErrorCodeSchema>

/** One problem in a request that failed validation. `path` is for example `body.email`. */
export const ValidationIssueSchema = z.object({
  path: z.string(),
  message: z.string(),
})
export type ValidationIssue = z.infer<typeof ValidationIssueSchema>

export const ApiErrorResponseSchema = z.object({
  error: z.object({
    code: ErrorCodeSchema,
    message: z.string(),
    requestId: z.string(),
    /** Only for VALIDATION_FAILED. */
    details: z.array(ValidationIssueSchema).optional(),
  }),
})
export type ApiErrorResponse = z.infer<typeof ApiErrorResponseSchema>
