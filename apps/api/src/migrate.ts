import { fileURLToPath } from 'node:url'
import { pino } from 'pino'
import { loadEnvOrExit, migrateEnvSchema } from './config/env'
import { runMigrations } from './db/migrator'
import { loggerOptions } from './lib/logger'

// Entry point for database migrations: `node dist/migrate.js` (Railway pre-deploy, compose `migrate`)
// or `pnpm --filter @repo/api db:migrate` (development).
// The migrations folder is `apps/api/drizzle`: one level above `src/` and above `dist/`.

const env = loadEnvOrExit(migrateEnvSchema)
const log = pino(loggerOptions(env))

try {
  await runMigrations({
    migrationUrl: env.DATABASE_MIGRATION_URL,
    databaseUrl: env.DATABASE_URL,
    nodeEnv: env.NODE_ENV,
    migrationsFolder: fileURLToPath(new URL('../drizzle', import.meta.url)),
    applicationName: env.APP_NAME,
    log: { info: (message) => log.info(message), warn: (message) => log.warn(message) },
  })
} catch (err) {
  log.error({ err }, 'migration failed')
  log.flush()
  process.exitCode = 1
}
