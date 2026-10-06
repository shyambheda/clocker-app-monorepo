import type { ApiErrorResponse, ErrorCode, ValidationIssue } from '@repo/shared'
import type { FastifyError, FastifyInstance, FastifyReply, FastifyRequest } from 'fastify'
import fp from 'fastify-plugin'
import { AppError } from '../lib/errors'

// One error shape for every error: { error: { code, message, requestId, details? } }.
// The client gets a fixed, safe message. The log gets the full error with the request id.

const STATUS_FALLBACK = new Map<number, { code: ErrorCode; message: string }>([
  [400, { code: 'BAD_REQUEST', message: 'The request is not valid' }],
  [401, { code: 'UNAUTHORIZED', message: 'Authentication is necessary' }],
  [403, { code: 'FORBIDDEN', message: 'You do not have permission for this request' }],
  [404, { code: 'NOT_FOUND', message: 'The resource does not exist' }],
  [405, { code: 'METHOD_NOT_ALLOWED', message: 'The method is not allowed' }],
  [406, { code: 'NOT_ACCEPTABLE', message: 'The requested format is not available' }],
  [408, { code: 'REQUEST_TIMEOUT', message: 'The request took too long' }],
  [409, { code: 'CONFLICT', message: 'The request conflicts with the current state' }],
  [410, { code: 'GONE', message: 'The resource is not available' }],
  [413, { code: 'PAYLOAD_TOO_LARGE', message: 'The request body is too large' }],
  [415, { code: 'UNSUPPORTED_MEDIA_TYPE', message: 'The content type is not supported' }],
  [422, { code: 'UNPROCESSABLE', message: 'The request cannot be processed' }],
  [429, { code: 'RATE_LIMITED', message: 'Too many requests. Try again later' }],
])
const INVALID_BODY_CODES = new Set(['FST_ERR_CTP_INVALID_JSON_BODY', 'FST_ERR_CTP_EMPTY_JSON_BODY'])
const OTHER_CLIENT_ERROR = { code: 'REQUEST_FAILED', message: 'The request failed' } as const
const INTERNAL_ERROR = { code: 'INTERNAL_ERROR', message: 'Something went wrong' } as const

interface ErrorBody {
  status: number
  code: ErrorCode
  message: string
  details?: ValidationIssue[]
}

function toErrorBody(error: FastifyError | AppError): ErrorBody {
  if (error instanceof AppError) {
    return { status: error.statusCode, code: error.code, message: error.message }
  }

  if (error.validation) {
    const context = error.validationContext ?? 'request'
    return {
      status: 400,
      code: 'VALIDATION_FAILED',
      message: 'The request is not valid',
      details: error.validation.map((issue) => ({
        path: [context, ...issue.instancePath.split('/').filter(Boolean)].join('.'),
        message: issue.message ?? 'Invalid value',
      })),
    }
  }

  const status = error.statusCode ?? 500
  if (status < 400 || status >= 500) return { status: 500, ...INTERNAL_ERROR }

  // Bad JSON and prototype poisoning (`__proto__`, `constructor.prototype`) come from the JSON parser.
  if (INVALID_BODY_CODES.has(error.code)) {
    return { status, code: 'INVALID_BODY', message: 'The request body is not valid JSON' }
  }

  return { status, ...(STATUS_FALLBACK.get(status) ?? OTHER_CLIENT_ERROR) }
}

export function sendError(request: FastifyRequest, reply: FastifyReply, body: ErrorBody) {
  const payload: ApiErrorResponse = {
    error: {
      code: body.code,
      message: body.message,
      requestId: request.id,
      ...(body.details ? { details: body.details } : {}),
    },
  }
  return reply.status(body.status).type('application/json; charset=utf-8').send(payload)
}

function errorHandlerPlugin(app: FastifyInstance, _options: object, done: (err?: Error) => void) {
  app.setErrorHandler<FastifyError | AppError>((error, request, reply) => {
    const body = toErrorBody(error)
    if (body.status >= 500) {
      request.log.error({ err: error }, 'request failed')
    } else {
      request.log.info({ err: error, code: body.code }, 'request rejected')
    }
    return sendError(request, reply, body)
  })
  done()
}

export const errorHandler = fp(errorHandlerPlugin, { name: 'error-handler' })

// app.ts registers this handler after the rate limit plugin, so that unknown routes (scanners)
// also count against the rate limit.
export function notFoundHandler(request: FastifyRequest, reply: FastifyReply) {
  return sendError(request, reply, {
    status: 404,
    code: 'NOT_FOUND',
    message: 'The resource does not exist',
  })
}
