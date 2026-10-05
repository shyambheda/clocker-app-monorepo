import { DEFAULT_APP_NAME } from '@repo/shared'
import { describe, expect, it } from 'vitest'
import { EnvValidationError, apiEnvSchema, loadEnv, workerEnvSchema } from '../src/config/env'

describe('loadEnv', () => {
  it('applies defaults', () => {
    const env = loadEnv(apiEnvSchema, {})
    expect(env.PORT).toBe(4000)
    expect(env.HOST).toBe('0.0.0.0')
    expect(env.APP_NAME).toBe(DEFAULT_APP_NAME)
  })

  it('reads the product name', () => {
    const env = loadEnv(apiEnvSchema, { APP_NAME: ' Acme Cloud ' })
    expect(env.APP_NAME).toBe('Acme Cloud')
    expect(loadEnv(apiEnvSchema, { APP_NAME: '' }).APP_NAME).toBe(DEFAULT_APP_NAME)
  })

  it('rejects an invalid port', () => {
    expect(() => loadEnv(apiEnvSchema, { PORT: 'abc' })).toThrow(EnvValidationError)
  })

  it('requires a redis URL for the worker without echoing its value', () => {
    const secretish = 'http://user:hunter2@example.com'
    try {
      loadEnv(workerEnvSchema, { REDIS_URL: secretish })
      expect.unreachable()
    } catch (error) {
      expect(error).toBeInstanceOf(EnvValidationError)
      expect((error as Error).message).toContain('REDIS_URL')
      expect((error as Error).message).not.toContain('hunter2')
    }
  })
})
