# 0008: One identity, three audiences (admin, portal, panel)

- Status: Accepted (Phase 0, implementation in Phase 4)

## Context

Platform staff, customers (orgs) and end users sign in. One person can be staff in one org and an
end user in a different org.

## Decision

One `users` table (unique email, always required). Org access comes from `members` rows with the
roles `owner`, `admin`, `staff` (portal) and `member` (panel). Platform access comes from a separate
`platform_role`, not from org roles. The admin UI is a separate app (`admin.example.com`). It uses a
separate DB role, with an audit log, to read the data of all tenants. Staff must use MFA.
Members join through email invites or a CSV import.

## Consequences

- One login for all users. After sign-in, the user selects an org. The org role selects the portal or the panel.
- A bug on the customer side cannot give platform access. The admin code is not sent to customer browsers.
- Impersonation for support has a time limit, goes into the audit log, and cannot target staff accounts.
