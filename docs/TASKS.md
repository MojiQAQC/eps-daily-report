# Tasks / Status

## Status: Frontend shell + Auth UI built, Auth wiring untested against live Supabase

Repo was empty — created project scaffold, docs, and a draft core schema. No
application features implemented yet.

## Done

- [x] Next.js + TS + Tailwind + Supabase project scaffold
- [x] docs/PRODUCT.md, ARCHITECTURE.md, DATA_MODEL.md, PERMISSIONS.md, DECISIONS.md
- [x] AGENTS.md, CLAUDE.md, README.md, .env.example
- [x] Draft schema: supabase/migrations/0001_core_schema.sql (RLS policies stubbed,
      not finalized — needs review against PERMISSIONS.md before Phase 1 slice 1)
- [x] Frontend shell: OKLCH tokens, Tailwind theme, AppShell (sidebar + mobile nav),
      UI primitives, routes (overview, login, daily-report form w/ validation,
      history, updates, admin placeholders) — `npm run build` green, screenshots checked
- [x] Login page: email/password + 1-click demo sign-in for 3 personas
      (contractor_user / site_admin / head_office_admin per DEMO_ROLES.md;
      demo-only, roles still come from DB via RLS — remove before production)
- [x] Project Map & Live Weather widget (Thung Song site) + Thai localization
- [x] Production build validated (11/11 routes passing) & preparing GitHub/Vercel deployment
- [x] Supabase Cloud connected & Master Data seeded (Disciplines, Contractors, STSBPP Project)
- [x] 3-Tier Demo Personas provisioned in Supabase Auth & profiles verified (Contractor, Site Admin, Head Office Admin)
- [x] AppShell session awareness & role indicator badges implemented
- [x] Role-specific dynamic dashboards: Contractor (Fast Steel workspace & isolated reporting), Site Admin (11-contractor supervision matrix), Head Office Admin (Executive governance)
- [x] Admin Console (/admin): Live Login History & Audit Stream (last_sign_in_at), Master Data explorer (11 contractors & disciplines), and role-based access guard

## Next (vertical slice order — do not skip ahead)

1. **Roles/permissions slice**: profiles + user_project_access, admin invite flow
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
