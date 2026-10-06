import { sql } from 'drizzle-orm'
import { migrate } from 'drizzle-orm/node-postgres/migrator'
import { createDb } from './client'

/** The runtime role. Migration 0000_db_roles.sql makes it. */
export const APP_ROLE = 'app_user'

export interface MigrationLogger {
  info(message: string): void
  warn(message: string): void
}

export interface RunMigrationsOptions {
  /** Owner role, direct (not pooled) connection. */
  migrationUrl: string
  /** Runtime connection string. The function reads only its user name and password. */
  databaseUrl: string
  nodeEnv: 'development' | 'test' | 'production'
  migrationsFolder: string
  applicationName: string
  log: MigrationLogger
}

export class MigrationError extends Error {
  override name = 'MigrationError'
}

function credentials(url: string): { user: string; password: string } {
  const parsed = new URL(url)
  return {
    user: decodeURIComponent(parsed.username),
    password: decodeURIComponent(parsed.password),
  }
}

/**
 * Runs the Drizzle migrations, then sets the password of `app_user` from DATABASE_URL.
 * The server and the tests use the same function. The function never writes a URL or a password
 * to the log or to an error message.
 */
export async function runMigrations(options: RunMigrationsOptions): Promise<void> {
  const owner = credentials(options.migrationUrl)
  const runtime = credentials(options.databaseUrl)
  const isProduction = options.nodeEnv === 'production'

  if (runtime.user !== APP_ROLE) {
    if (isProduction) {
      throw new MigrationError(`DATABASE_URL must use the role ${APP_ROLE} in production`)
    }
    if (runtime.user === owner.user) {
      options.log.warn(
        `DATABASE_URL uses the owner role. Row Level Security does not apply to it. Use ${APP_ROLE}.`,
      )
    }
  }

  const client = createDb(options.migrationUrl, {
    applicationName: `${options.applicationName} migrate`,
    max: 1,
  })
  try {
    await migrate(client.db, { migrationsFolder: options.migrationsFolder })
    options.log.info('migrations applied')

    if (runtime.user === APP_ROLE) {
      if (!runtime.password) throw new MigrationError('DATABASE_URL has no password')
      await setRolePassword(client.db, runtime.password)
      options.log.info(`password of ${APP_ROLE} set from DATABASE_URL`)

      const role = await client.db.execute<{ rolsuper: boolean; rolbypassrls: boolean }>(
        sql`select rolsuper, rolbypassrls from pg_roles where rolname = ${APP_ROLE}`,
      )
      const attributes = role.rows[0]
      if (!attributes) throw new MigrationError(`role ${APP_ROLE} does not exist`)
      if (attributes.rolsuper || attributes.rolbypassrls) {
        const message = `role ${APP_ROLE} must not be a superuser or have BYPASSRLS`
        if (isProduction) throw new MigrationError(message)
        options.log.warn(message)
      }
    }
  } finally {
    await client.close()
  }
}

async function setRolePassword(db: ReturnType<typeof createDb>['db'], password: string) {
  try {
    // ALTER ROLE does not accept bind parameters. format('%L') quotes the value safely on the server.
    const result = await db.execute<{ statement: string }>(
      sql`select format('ALTER ROLE %I WITH LOGIN PASSWORD %L', ${APP_ROLE}::text, ${password}::text) as statement`,
    )
    const statement = result.rows[0]?.statement
    if (!statement) throw new Error('no statement')
    await db.execute(sql.raw(statement))
  } catch {
    // Do not keep the cause: a driver error message can contain the query text with the password.
    throw new MigrationError(`could not set the password of ${APP_ROLE}`)
  }
}
