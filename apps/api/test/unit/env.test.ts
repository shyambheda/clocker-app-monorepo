import { DEFAULT_APP_NAME } from '@repo/shared'
import { describe, expect, it } from 'vitest'
import {
  EnvValidationError,
  apiEnvSchema,
  loadEnv,
  migrateEnvSchema,
  workerEnvSchema,
} from '../../src/config/env'

const REQUIRED = {
  API_URL: 'http://localhost:4000',
  DATABASE_URL: 'postgresql://app_user:pw@localhost:5432/app',
  REDIS_URL: 'redis://:pw@localhost:6379',
}

function loadError(schema: Parameters<typeof loadEnv>[0], source: NodeJS.ProcessEnv): string {
  try {
    loadEnv(schema, source)
  } catch (error) {
    expect(error).toBeInstanceOf(EnvValidationError)
    return (error as Error).message
  }
  throw new Error('expected an EnvValidationError')
}

describe('loadEnv', () => {
  it('applies defaults', () => {
    const env = loadEnv(apiEnvSchema, REQUIRED)
    expect(env.PORT).toBe(4000)
    expect(env.HOST).toBe('0.0.0.0')
    expect(env.APP_NAME).toBe(DEFAULT_APP_NAME)
    expect(env.CORS_ORIGINS).toEqual([])
    expect(env.TRUST_PROXY_HOPS).toBe(0)
    expect(env.RATE_LIMIT_MAX).toBe(300)
    expect(env.RATE_LIMIT_WINDOW_MS).toBe(60_000)
  })

  it('reads the product name', () => {
    const env = loadEnv(apiEnvSchema, { ...REQUIRED, APP_NAME: ' Acme Cloud ' })
    expect(env.APP_NAME).toBe('Acme Cloud')
    expect(loadEnv(apiEnvSchema, { ...REQUIRED, APP_NAME: '' }).APP_NAME).toBe(DEFAULT_APP_NAME)
  })

  it('rejects an invalid port', () => {
    expect(() => loadEnv(apiEnvSchema, { ...REQUIRED, PORT: 'abc' })).toThrow(EnvValidationError)
  })

  it('requires the database, Redis and API URLs', () => {
    const message = loadError(apiEnvSchema, {})
    expect(message).toContain('DATABASE_URL')
    expect(message).toContain('REDIS_URL')
    expect(message).toContain('API_URL')
  })

  it('parses a list of CORS origins', () => {
    const env = loadEnv(apiEnvSchema, {
      ...REQUIRED,
      CORS_ORIGINS: ' https://app.example.com, https://admin.example.com ,,',
    })
    expect(env.CORS_ORIGINS).toEqual(['https://app.example.com', 'https://admin.example.com'])
  })

  it.each([
    ['a wildcard', '*'],
    ['a path', 'https://app.example.com/portal'],
    ['a slash at the end', 'https://app.example.com/'],
    ['no scheme', 'app.example.com'],
    ['a scheme that is not http', 'ftp://app.example.com'],
  ])('rejects a CORS origin with %s', (_name, value) => {
    expect(loadError(apiEnvSchema, { ...REQUIRED, CORS_ORIGINS: value })).toContain('CORS_ORIGINS')
  })

  it('limits the number of proxy hops', () => {
    expect(loadEnv(apiEnvSchema, { ...REQUIRED, TRUST_PROXY_HOPS: '1' }).TRUST_PROXY_HOPS).toBe(1)
    expect(() => loadEnv(apiEnvSchema, { ...REQUIRED, TRUST_PROXY_HOPS: '6' })).toThrow(
      EnvValidationError,
    )
    expect(() => loadEnv(apiEnvSchema, { ...REQUIRED, TRUST_PROXY_HOPS: '-1' })).toThrow(
      EnvValidationError,
    )
  })

  it('never puts a value into the error message', () => {
    const message = loadError(apiEnvSchema, {
      API_URL: 'http://user:hunter2@[bad',
      DATABASE_URL: 'mysql://user:hunter3@db.example.com/app',
      REDIS_URL: 'http://user:hunter4@example.com',
      CORS_ORIGINS: 'https://hunter5.example.com/path',
    })
    for (const secret of ['hunter2', 'hunter3', 'hunter4', 'hunter5']) {
      expect(message).not.toContain(secret)
    }
  })

  it('requires a redis URL for the worker without echoing its value', () => {
    const message = loadError(workerEnvSchema, { REDIS_URL: 'http://user:hunter2@example.com' })
    expect(message).toContain('REDIS_URL')
    expect(message).not.toContain('hunter2')
  })

  it('requires both database URLs for the migrate script', () => {
    const message = loadError(migrateEnvSchema, {})
    expect(message).toContain('DATABASE_MIGRATION_URL')
    expect(message).toContain('DATABASE_URL')
  })
})
