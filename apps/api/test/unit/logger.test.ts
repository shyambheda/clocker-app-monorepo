import { Writable } from 'node:stream'
import { pino } from 'pino'
import { afterEach, describe, expect, it } from 'vitest'
import type { App } from '../../src/app'
import { loggerOptions } from '../../src/lib/logger'
import { buildTestApp } from '../helpers'

function captureLogger() {
  const lines: Record<string, unknown>[] = []
  const stream = new Writable({
    write(chunk: Buffer, _encoding, callback) {
      lines.push(JSON.parse(chunk.toString()) as Record<string, unknown>)
      callback()
    },
  })
  const logger = pino(loggerOptions({ NODE_ENV: 'test', LOG_LEVEL: 'info' }), stream)
  return { logger, lines, text: () => JSON.stringify(lines) }
}

let app: App | undefined
afterEach(async () => {
  await app?.close()
  app = undefined
})

describe('logger', () => {
  it('logs the path without the query string and without headers', async () => {
    const { logger, lines, text } = captureLogger()
    app = await buildTestApp({ logger })
    await app.inject({
      method: 'GET',
      url: '/health/live?token=s3cr3t-token',
      headers: { authorization: 'Bearer s3cr3t-bearer', cookie: 'session=s3cr3t-cookie' },
    })
    const incoming = lines.find((line) => line.msg === 'incoming request')
    expect(incoming?.req).toEqual({
      method: 'GET',
      path: '/health/live',
      requestId: expect.any(String) as string,
      ip: '127.0.0.1',
    })
    expect(text()).not.toContain('s3cr3t')
  })

  it('logs the full error of a 500 with the request id', async () => {
    const { logger, lines } = captureLogger()
    app = await buildTestApp({
      logger,
      routes: (target) =>
        target.get('/test/boom', () => {
          throw new Error('internal detail')
        }),
    })
    const res = await app.inject({ method: 'GET', url: '/test/boom' })
    const failed = lines.find((line) => line.msg === 'request failed')
    expect(failed?.reqId).toBe(res.headers['x-request-id'])
    expect((failed?.err as { message: string }).message).toBe('internal detail')
  })

  it('redacts sensitive fields', () => {
    const { logger, text } = captureLogger()
    logger.info(
      {
        user: { passwordHash: 'h1', accessToken: 't1', refreshToken: 't2' },
        db: { connectionString: 'postgres://u:p1@h/d', databaseUrl: 'postgres://u:p2@h/d' },
        req: { headers: { 'x-api-key': 'k1', 'proxy-authorization': 'k2', cookie: 'c1' } },
        err: { message: 'insert failed', detail: 'Key (email)=(a@example.com)', params: ['p3'] },
      },
      'test',
    )
    const output = text()
    for (const secret of ['h1', 't1', 't2', 'p1', 'p2', 'k1', 'k2', 'c1', 'a@example.com', 'p3']) {
      expect(output).not.toContain(`${secret}`)
    }
    expect(output).toContain('insert failed')
  })
})
