import { StatusCard } from '@/components/status-card'

export const dynamic = 'force-dynamic'

export default function AdminHomePage() {
  return (
    <main>
      <h1>Clocker Admin</h1>
      <p className="muted">
        Phase 0 skeleton. Staff login (with mandatory MFA), orgs, users and plans arrive in later
        phases.
      </p>
      <StatusCard />
    </main>
  )
}
