import { randomUUID } from 'node:crypto'
import { sql } from 'drizzle-orm'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { createDb, type DatabaseClient } from '../../src/db/client'
import { withTenant } from '../../src/db/tenant'
import { runMigrations } from '../../src/db/migrator'
import { MIGRATIONS_FOLDER } from '../db/provider'
import { testDb } from './helpers'

let owner: DatabaseClient
let appUser: DatabaseClient

beforeAll(() => {
  owner = createDb(testDb().ownerUrl, { applicationName: 'integration-tests', max: 2 })
  appUser = createDb(testDb().appUrl, { applicationName: 'integration-tests', max: 1 })
})

afterAll(async () => {
  await Promise.all([owner?.close(), appUser?.close()])
})

async function errorCode(promise: Promise<unknown>): Promise<string | undefined> {
  try {
    await promise
  } catch (error) {
    // Drizzle wraps the driver error. The Postgres error code is on the cause.
    const cause = (error as { cause?: { code?: string } }).cause
    return cause?.code ?? (error as { code?: string }).code
  }
  return undefined
}

describe('migrations', () => {
  it('run two more times without an error', async () => {
    const { ownerUrl, appUrl } = testDb()
    const run = () =>
      runMigrations({
        migrationUrl: ownerUrl,
        databaseUrl: appUrl,
        nodeEnv: 'test',
        migrationsFolder: MIGRATIONS_FOLDER,
        applicationName: 'integration-tests',
        log: { info: () => {}, warn: () => {} },
      })
    await run()
    await run()
  })
})

describe('app_user role', () => {
  it('is not a superuser and has no BYPASSRLS, CREATEDB or CREATEROLE', async () => {
    const result = await owner.db.execute<Record<string, boolean>>(
      sql`select rolsuper, rolbypassrls, rolcreatedb, rolcreaterole, rolreplication
          from pg_roles where rolname = 'app_user'`,
    )
    expect(result.rows[0]).toEqual({
      rolsuper: false,
      rolbypassrls: false,
      rolcreatedb: false,
      rolcreaterole: false,
      rolreplication: false,
    })
  })

  it('cannot make tables', async () => {
    const code = await errorCode(appUser.db.execute(sql`create table app_user_table (id int)`))
    expect(code).toBe('42501') // insufficient_privilege
  })

  it('uses UTC and has a statement timeout', async () => {
    const timezone = await appUser.db.execute<{ TimeZone: string }>(sql`show timezone`)
    const timeout = await appUser.db.execute<{ statement_timeout: string }>(
      sql`show statement_timeout`,
    )
    expect(timezone.rows[0]?.TimeZone).toBe('UTC')
    expect(timeout.rows[0]?.statement_timeout).toBe('15s')
  })
})

describe('withTenant and Row Level Security', () => {
  const orgA = randomUUID()
  const orgB = randomUUID()

  beforeAll(async () => {
    // A test table with the same policy shape that Phase 4 uses for tenant tables.
    await owner.db.execute(sql`
      create table tenant_probe (
        id serial primary key,
        org_id uuid not null,
        body text not null
      )`)
    await owner.db.execute(sql`alter table tenant_probe enable row level security`)
    await owner.db.execute(sql`
      create policy tenant_isolation on tenant_probe
        using (org_id = nullif(current_setting('app.org_id', true), '')::uuid)
        with check (org_id = nullif(current_setting('app.org_id', true), '')::uuid)`)
    await owner.db.execute(sql`
      insert into tenant_probe (org_id, body)
      values (${orgA}, 'a1'), (${orgA}, 'a2'), (${orgB}, 'b1')`)
  })

  afterAll(async () => {
    await owner.db.execute(sql`drop table if exists tenant_probe`)
  })

  const bodies = (rows: Record<string, unknown>[]) => rows.map((row) => row.body).sort()

  it('shows only the rows of the tenant', async () => {
    const rowsA = await withTenant(appUser.db, orgA, async (tx) => {
      return (await tx.execute(sql`select body from tenant_probe`)).rows
    })
    const rowsB = await withTenant(appUser.db, orgB, async (tx) => {
      return (await tx.execute(sql`select body from tenant_probe`)).rows
    })
    expect(bodies(rowsA)).toEqual(['a1', 'a2'])
    expect(bodies(rowsB)).toEqual(['b1'])
  })

  it('shows no rows without a tenant, also on a connection that had a tenant before', async () => {
    // The pool has one connection, so this query uses the connection of the test above.
    // After the transaction, app.org_id is an empty string, not NULL.
    const rows = (await appUser.db.execute(sql`select body from tenant_probe`)).rows
    expect(rows).toEqual([])
  })

  it('does not let a tenant write a row of a different tenant', async () => {
    const code = await errorCode(
      withTenant(appUser.db, orgA, (tx) =>
        tx.execute(sql`insert into tenant_probe (org_id, body) values (${orgB}, 'x')`),
      ),
    )
    expect(code).toBe('42501') // new row violates row-level security policy
  })

  it('removes the tenant setting when the transaction ends', async () => {
    await withTenant(appUser.db, orgA, () => Promise.resolve())
    const setting = await appUser.db.execute<{ value: string | null }>(
      sql`select current_setting('app.org_id', true) as value`,
    )
    expect(setting.rows[0]?.value ?? '').toBe('')
  })
})
