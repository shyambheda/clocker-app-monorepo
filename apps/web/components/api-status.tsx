// Server component: the Next.js server calls the API over the internal network,
// so this check needs no CORS and no public URL.
async function fetchApiHealth(): Promise<'up' | 'down' | 'unreachable'> {
  const baseUrl = process.env.API_INTERNAL_URL ?? 'http://localhost:4000'
  try {
    const res = await fetch(`${baseUrl}/health/live`, {
      cache: 'no-store',
      signal: AbortSignal.timeout(2000),
    })
    return res.ok ? 'up' : 'down'
  } catch {
    return 'unreachable'
  }
}

export async function ApiStatus() {
  const status = await fetchApiHealth()
  return (
    <span className={status === 'up' ? 'ok' : 'bad'} data-testid="api-status">
      {status}
    </span>
  )
}
