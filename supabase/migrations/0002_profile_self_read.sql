-- EPS Daily Report — 0002: let users read their own role + access grants.
--
-- Why: profiles and user_project_access were created with RLS enabled and
-- zero policies (deny-all). The app therefore cannot load the signed-in
-- user's role from the database and falls back to client metadata. These
-- two self-read policies fix that without opening anything else:
--   - a user can SELECT only their OWN profile row (role, contractor_id)
--   - a user can SELECT only their OWN access-grant rows
-- No policy queries its own table, so there is no recursion hazard.
-- Admin-wide reads keep going through the service-role key (server only).

-- 1. Own profile (needed to resolve role + contractor after login)
create policy profiles_select_own on profiles for select
  using (auth.uid() = id);

-- 2. Own project/contractor/discipline grants (needed for scoping queries)
create policy user_project_access_select_own on user_project_access for select
  using (auth.uid() = user_id);
