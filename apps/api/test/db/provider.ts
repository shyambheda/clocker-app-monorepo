import { randomBytes } from 'node:crypto'
import { fileURLToPath } from 'node:url'
import { APP_ROLE, runMigrations } from '../../src/db/migrator'

/** Connection strings of a disposable test database. */
export interface TestDatabase {
  /** Owner role. Migrations and test fixtures (tables, policies) use it. */
  ownerUrl: string
  /** Runtime role `app_user`, as in production. Row Level Security applies to it. */
  appUrl: string
  redisUrl: string
}

/**
 * Test database adapter (docs/architecture/adapters.md). Each provider makes a disposable database
 * and Redis, runs the real migrations, and removes everything in `destroy()`.
 * TEST_DB_PROVIDER selects the provider: `local` (containers) or `neon` (a Neon branch).
 */
export interface TestDatabaseProvider {
  readonly name: string
  create(): Promise<TestDatabase>
  /** Safe to call more than one time and after a failed `create()`. */
  destroy(): Promise<void>
}

export const MIGRATIONS_FOLDER = fileURLToPath(new URL('../../drizzle', import.meta.url))

/** A random password for `app_user`, only for this run. Hex only, so it is safe in a URL. */
export function randomPassword(): string {
  return randomBytes(24).toString('hex')
}

/** Returns `url` with a different user and password. */
export function withCredentials(url: string, user: string, password: string): string {
  const parsed = new URL(url)
  parsed.username = encodeURIComponent(user)
  parsed.password = encodeURIComponent(password)
  return parsed.toString()
}

/** Runs the real migrate function and returns the `app_user` URL for the same database. */
export async function migrate(ownerUrl: string, appHostUrl = ownerUrl): Promise<string> {
  const appUrl = withCredentials(appHostUrl, APP_ROLE, randomPassword())
  await runMigrations({
    migrationUrl: ownerUrl,
    databaseUrl: appUrl,
    nodeEnv: 'test',
    migrationsFolder: MIGRATIONS_FOLDER,
    applicationName: 'integration-tests',
    log: { info: () => {}, warn: (message) => console.warn(message) },
  })
  return appUrl
}
