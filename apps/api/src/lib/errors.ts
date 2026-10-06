import type { ErrorCode } from '@repo/shared'

/**
 * An error of our own code. The error handler sends `status`, `code` and `message` to the client.
 * Thus `message` must be safe to show: no internal identifiers, no SQL, no values from other tenants.
 */
export class AppError extends Error {
  override name = 'AppError'

  constructor(
    readonly statusCode: number,
    readonly code: ErrorCode,
    message: string,
  ) {
    super(message)
  }
}
