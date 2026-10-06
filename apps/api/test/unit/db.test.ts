import { describe, expect, it, vi } from 'vitest'
import type { Db } from '../../src/db/client'
import { MigrationError, runMigrations } from '../../src/db/migrator'
import { withTenant } from '../../src/db/tenant'
import { TimeoutError, withTimeout } from '../../src/lib/timeout'

describe('withTenant', () => {
  it.each(['', 'not-a-uuid', "1' or '1'='1", '00000000-0000-0000-0000-00000000000g'])(
    'rejects the org id %j before it opens a transaction',
    async (orgId) => {
      const transaction = vi.fn()
      const db = { transaction } as unknown as Db
      await expect(withTenant(db, orgId, () => Promise.resolve(1))).rejects.toThrow(TypeError)
      expect(transaction).not.toHaveBeenCalled()
    },
  )
})

describe('runMigrations', () => {
  it('stops in production if DATABASE_URL does not use app_user, before it connects', async () => {
    const log = { info: vi.fn(), warn: vi.fn() }
    const promise = runMigrations({
      // Port 1: nothing listens. A connection attempt would give a different error.
      migrationUrl: 'postgresql://owner:pw@127.0.0.1:1/app',
      databaseUrl: 'postgresql://owner:pw@127.0.0.1:1/app',
      nodeEnv: 'production',
      migrationsFolder: 'drizzle',
      applicationName: 'test',
      log,
    })
    await expect(promise).rejects.toThrow(MigrationError)
    await expect(promise).rejects.toThrow(/app_user/)
  })
})

describe('withTimeout', () => {
  it('returns the value when the promise is fast', async () => {
    await expect(withTimeout(Promise.resolve('ok'), 50)).resolves.toBe('ok')
  })

  it('rejects when the promise is slow', async () => {
    await expect(withTimeout(new Promise(() => {}), 20)).rejects.toThrow(TimeoutError)
  })
})
