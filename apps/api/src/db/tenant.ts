import { sql } from 'drizzle-orm'
import { z } from 'zod'
import type { Db } from './client'

const OrgIdSchema = z.uuid()

export type Tx = Parameters<Parameters<Db['transaction']>[0]>[0]

/**
 * Runs `fn` in a transaction that is bound to one tenant (org).
 *
 * The function sets `app.org_id` for this transaction only (`set_config(..., true)`). Row Level Security
 * policies (Phase 4) read the value with `nullif(current_setting('app.org_id', true), '')::uuid`.
 * Thus a query outside `withTenant` sees no tenant rows.
 *
 * Get `orgId` from the session, never from the request body or the URL.
 */
export async function withTenant<T>(db: Db, orgId: string, fn: (tx: Tx) => Promise<T>): Promise<T> {
  if (!OrgIdSchema.safeParse(orgId).success) {
    // A programming error: the org comes from the session, so it is always a UUID.
    throw new TypeError('withTenant: orgId must be a UUID')
  }
  return db.transaction(async (tx) => {
    await tx.execute(sql`select set_config('app.org_id', ${orgId}, true)`)
    return fn(tx)
  })
}
