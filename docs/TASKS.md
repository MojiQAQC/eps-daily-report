# Tasks / Status

## Status: Foundation prepared, awaiting approval to start Phase 1 slice 1

Repo was empty — created project scaffold, docs, and a draft core schema. No
application features implemented yet.

## Done

- [x] Next.js + TS + Tailwind + Supabase project scaffold
- [x] docs/PRODUCT.md, ARCHITECTURE.md, DATA_MODEL.md, PERMISSIONS.md, DECISIONS.md
- [x] AGENTS.md, CLAUDE.md, README.md, .env.example
- [x] Draft schema: supabase/migrations/0001_core_schema.sql (RLS policies stubbed,
      not finalized — needs review against PERMISSIONS.md before Phase 1 slice 1)

## Next (vertical slice order — do not skip ahead)

1. **Auth slice**: Supabase Auth wiring, login page, session handling, RLS smoke test
2. **Roles/permissions slice**: profiles + user_project_access, admin invite flow
3. **Master data slice**: contractors/disciplines/projects CRUD (admin only)
4. **Daily Report slice**: schema review -> data access -> validation -> form -> save -> retrieve
5. **Report History slice**
6. **Project Update Feed slice**
7. **Priority/Critical Work slice**
8. Mobile UX pass + validation hardening
9. User testing

Not started: AI features, dashboard, PDF/OCR, weather API, LINE — Phase 1.1+.

## Blocked on open questions

See `PRODUCT.md` open questions — notably hosting/DB finalization, RLS scope for
site_admin vs head_office_admin, and whether contractors can edit submitted reports.
