import { drizzle, type NodePgDatabase } from 'drizzle-orm/node-postgres'
import { Pool } from 'pg'
import { withTimeout } from '../lib/timeout'
import * as schema from './schema/index'

// Database adapter. This is the only file that imports the `pg` driver (docs/architecture/adapters.md).
// The driver works with all Postgres hosts (Neon, local, RDS). To change the host, change the URL.

export type Db = NodePgDatabase<typeof schema>

export interface DatabaseClient {
  /** Drizzle query builder. Tenant data goes through `withTenant(db, orgId, fn)`, never directly. */
  db: Db
  /** Runs `SELECT 1`. Rejects if the database does not answer in `timeoutMs`. */
  ping(timeoutMs: number): Promise<void>
  /** Closes all connections. */
  close(): Promise<void>
}

export interface CreateDbOptions {
  /** Shown in `pg_stat_activity`. Use the product name. */
  applicationName: string
  /** Maximum number of connections in the pool. */
  max?: number
}

export function createDb(url: string, options: CreateDbOptions): DatabaseClient {
  const pool = new Pool({
    connectionString: url,
    max: options.max ?? 10,
    connectionTimeoutMillis: 5_000,
    idleTimeoutMillis: 30_000,
    application_name: options.applicationName.slice(0, 63),
  })
  // An idle client can lose its connection (for example when Neon scales to zero). Without this
  // listener, the error event stops the process. The pool removes the broken client itself.
  pool.on('error', () => {})

  const db = drizzle(pool, { schema })

  return {
    db,
    async ping(timeoutMs) {
      await withTimeout(pool.query('SELECT 1'), timeoutMs)
    },
    async close() {
      await pool.end()
    },
  }
}
