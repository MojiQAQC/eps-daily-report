# Permissions

## Roles (Phase 1)

- **contractor_user** — individual account, scoped to their contractor + assigned
  project(s) + assigned discipline(s)
- **site_admin** — manages site-level operations (scope of what site_admin can
  manage vs head_office_admin is an open question, see `PRODUCT.md`)
- **head_office_admin** — cross-project oversight, manages users/invites

## Contractor isolation (critical)

A user only ever sees data belonging to:
- their assigned contractor (company)
- their assigned project(s)
- their assigned discipline(s) where applicable

Example: a Fast Steel user must never see L-TAB data, and vice versa.

**Enforcement is server/database-level (Supabase RLS), not UI hiding.** A contractor
user can never change their own company, role, project access, or discipline
access — only an Admin can, via `user_project_access` / `profiles`.

## Account flow (Phase 1 — no public self-registration)

```
Admin invites user (name, email, contractor, project, role, discipline)
  -> email invitation / verification
  -> user sets password
  -> login
  -> app loads permissions from profiles + user_project_access
```

## RLS approach

Every table scoped to a contractor/project (daily_reports, project_updates, etc.)
gets a policy that checks the requesting user's `user_project_access` rows —
matching project_id, and contractor_id where applicable. Service-role key bypasses
RLS and is server-only, used only for admin operations (e.g. processing invites),
never exposed to the browser.
