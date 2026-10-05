import { formatInTimeZone } from '@repo/shared'
import { ApiStatus } from './api-status'
import { BrowserTime } from './browser-time'

// Phase 0 smoke check: API reachability plus one instant rendered in several zones.
export function StatusCard() {
  const now = new Date().toISOString()
  return (
    <section className="card">
      <dl>
        <dt>API</dt>
        <dd>
          <ApiStatus />
        </dd>
        <dt>UTC</dt>
        <dd>{formatInTimeZone(now, 'UTC')}</dd>
        <dt>Asia/Kolkata</dt>
        <dd>{formatInTimeZone(now, 'Asia/Kolkata')}</dd>
        <dt>Your browser</dt>
        <dd>
          <BrowserTime instant={now} />
        </dd>
      </dl>
    </section>
  )
}
