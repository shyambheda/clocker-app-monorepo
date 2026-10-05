'use client'

import { formatInTimeZone } from '@clocker/shared'
import { useSyncExternalStore } from 'react'

const subscribe = () => () => {}
const getBrowserZone = () => Intl.DateTimeFormat().resolvedOptions().timeZone
const getServerZone = () => null

// Runs in the browser to prove @clocker/shared works client-side too.
// The server snapshot is null, so server and client HTML match during hydration.
export function BrowserTime({ instant }: { instant: string }) {
  const zone = useSyncExternalStore(subscribe, getBrowserZone, getServerZone)
  if (zone === null) return <span>...</span>
  return (
    <span>
      {formatInTimeZone(instant, zone)} ({zone})
    </span>
  )
}
