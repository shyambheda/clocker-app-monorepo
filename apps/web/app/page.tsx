import Link from 'next/link'
import { StatusCard } from '@/components/status-card'

export const dynamic = 'force-dynamic'

export default function HomePage() {
  return (
    <main>
      <h1>Clocker</h1>
      <p className="muted">Phase 0 skeleton. Login, portal and panel arrive in later phases.</p>
      <StatusCard />
      <nav className="card">
        <Link href="/portal">/portal</Link> (customers) &middot; <Link href="/panel">/panel</Link>{' '}
        (end users)
      </nav>
    </main>
  )
}
