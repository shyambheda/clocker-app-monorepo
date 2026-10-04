# 0008: One identity, three audiences (admin, portal, panel)

- Status: Accepted (Phase 0, implemented in Phase 3)

## Context

Platform staff, customers (orgs) and end users all sign in. A person may be staff in one org and an end
user in another.

## Decision

One `users` table (unique email, always required). Org access comes from `members` rows with roles
`owner` / `admin` / `staff` (portal) and `member` (panel). Platform access comes from a separate
`platform_role`, never from org roles. The admin UI is a separate app (`admin.getclocker.app`), uses a
separate audited DB role to read across tenants, and requires MFA for staff. Members join via email invites
or bulk CSV import.

## Consequences

- One login for everyone. After sign-in the user picks an org, and their role decides portal or panel.
- Customer-side bugs can't escalate to platform access. Admin code never ships to customer browsers.
- Impersonation for support is time-limited, audited, and cannot target staff accounts.
