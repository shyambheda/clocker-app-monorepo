import Link from 'next/link'

export default function PortalPage() {
  return (
    <main>
      <h1>Portal</h1>
      <p className="muted">
        Where customers (org owners, admins and staff) manage their organization. Placeholder until
        Phase 5.
      </p>
      <Link href="/">Back</Link>
    </main>
  )
}
