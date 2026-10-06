import { DEFAULT_APP_NAME } from '@repo/shared'
import type { FastifyBaseLogger } from 'fastify'
import { vi } from 'vitest'
import { buildApp, type App, type AppConfig, type AppDeps } from '../src/app'
import type { Db } from '../src/db/client'

export const TEST_CONFIG: AppConfig = {
  APP_NAME: DEFAULT_APP_NAME,
  NODE_ENV: 'test',
  API_URL: 'http://localhost:4000',
  CORS_ORIGINS: ['http://localhost:3000', 'http://localhost:3001'],
  TRUST_PROXY_HOPS: 0,
  RATE_LIMIT_MAX: 300,
  RATE_LIMIT_WINDOW_MS: 60_000,
}

export interface FakeDepsOptions {
  database?: 'ok' | 'fail'
  redis?: 'ok' | 'fail'
}

// Fakes for the database and Redis adapters. Unit tests use no network.
export function fakeDeps(options: FakeDepsOptions = {}) {
  const ping = (state: 'ok' | 'fail' = 'ok') =>
    vi.fn((_timeoutMs: number) =>
      state === 'fail'
        ? // The message is like a real driver error. It must never reach the client.
          Promise.reject(new Error('connect ECONNREFUSED db.internal.example:5432'))
        : Promise.resolve(),
    )
  return {
    db: { db: {} as Db, ping: ping(options.database), close: vi.fn(async () => {}) },
    redis: { connection: null, ping: ping(options.redis), close: vi.fn(async () => {}) },
  } satisfies AppDeps
}

export interface TestAppOptions {
  config?: Partial<AppConfig>
  deps?: AppDeps
  logger?: FastifyBaseLogger
  /** Extra routes for a test. They are added before `ready()`. */
  routes?: (app: App) => void
}

export async function buildTestApp(options: TestAppOptions = {}): Promise<App> {
  const app = await buildApp({
    config: { ...TEST_CONFIG, ...options.config },
    deps: options.deps ?? fakeDeps(),
    ...(options.logger ? { logger: options.logger } : {}),
  })
  options.routes?.(app)
  await app.ready()
  return app
}
