import { buildApp, type AppConfig } from '../app'
import type { Db } from '../db/client'

// Builds the OpenAPI document from the Zod schemas of the routes, without a database or Redis.
// `pnpm --filter @repo/api openapi` writes it to docs/api/openapi.json, and a unit test makes sure
// that the file in git agrees with the code.
export async function generateOpenApiDocument(appName: string): Promise<string> {
  const config: AppConfig = {
    APP_NAME: appName,
    NODE_ENV: 'production',
    API_URL: 'http://localhost:4000',
    CORS_ORIGINS: [],
    TRUST_PROXY_HOPS: 0,
    RATE_LIMIT_MAX: 1,
    RATE_LIMIT_WINDOW_MS: 1,
  }
  const noop = async () => {}
  const app = await buildApp({
    config,
    deps: {
      db: { db: {} as Db, ping: noop, close: noop },
      redis: { connection: null, ping: noop, close: noop },
    },
  })
  try {
    await app.ready()
    return `${JSON.stringify(app.swagger(), null, 2)}\n`
  } finally {
    await app.close()
  }
}
