-- supabase/migrations/0005_report_checklist_fields.sql
-- Daily Report checklist fields: work permits, equipment, safety topics,
-- material receive log, and a JSA flag on activities.
-- See docs/superpowers/specs/2026-09-14-report-checklist-fields-design.md

-- ==========================================================
-- JSA flag on activities (one new column).
-- ==========================================================

alter table daily_report_activities
  add column jsa boolean not null default false;

-- ==========================================================
-- Material receive log (new table).
-- ==========================================================

create table daily_report_material_receive (
  id uuid primary key default gen_random_uuid(),
  daily_report_id uuid not null references daily_reports(id) on delete cascade,
  material_name text not null,
  quantity numeric,
  unit text,
  received_date date,
  remarks text
);

alter table daily_report_material_receive enable row level security;

-- ==========================================================
-- daily_report_permits, daily_report_machinery, and daily_report_safety_topics
-- were created in 0001_core_schema.sql with RLS enabled and zero policies
-- (deny-all). This migration gives them the same two-tier SELECT policy shape
-- established for workforce/activities/safety (broad head_office_admin/
-- user_project_access visibility from 0002_export_support.sql, plus own-report
-- visibility from 0003_daily_report_save_and_photos.sql), plus the matching
-- INSERT policy from 0003. daily_report_material_receive (new in this
-- migration) gets the identical three-policy set from the start.
-- ==========================================================

-- --- INSERT policies ---

create policy daily_report_permits_insert on daily_report_permits for insert
  with check (
    exists (
      select 1 from daily_reports dr
      where dr.id = daily_report_permits.daily_report_id
        and dr.created_by = auth.uid()
    )
  );

create policy daily_report_machinery_insert on daily_report_machinery for insert
  with check (
    exists (
      select 1 from daily_reports dr
      where dr.id = daily_report_machinery.daily_report_id
        and dr.created_by = auth.uid()
    )
  );

create policy daily_report_safety_topics_insert on daily_report_safety_topics for insert
  with check (
    exists (
      select 1 from daily_reports dr
      where dr.id = daily_report_safety_topics.daily_report_id
        and dr.created_by = auth.uid()
    )
  );

create policy daily_report_material_receive_insert on daily_report_material_receive for insert
  with check (
    exists (
      select 1 from daily_reports dr
      where dr.id = daily_report_material_receive.daily_report_id
        and dr.created_by = auth.uid()
    )
  );

-- --- Broad SELECT policies (head_office_admin / user_project_access) ---

create policy daily_report_permits_select on daily_report_permits for select
  using (
    exists (
      select 1 from daily_reports dr
      where dr.id = daily_report_permits.daily_report_id
        and (
          exists (select 1 from profiles p where p.id = auth.uid() and p.role = 'head_office_admin')
          or exists (
            select 1 from user_project_access upa
            where upa.user_id = auth.uid()
              and upa.project_id = dr.project_id
              and (upa.contractor_id is null or upa.contractor_id = dr.contractor_id)
              and (upa.discipline_id is null or upa.discipline_id = dr.discipline_id)
          )
        )
    )
  );

create policy daily_report_machinery_select on daily_report_machinery for select
  using (
    exists (
      select 1 from daily_reports dr
      where dr.id = daily_report_machinery.daily_report_id
        and (
          exists (select 1 from profiles p where p.id = auth.uid() and p.role = 'head_office_admin')
          or exists (
            select 1 from user_project_access upa
            where upa.user_id = auth.uid()
              and upa.project_id = dr.project_id
              and (upa.contractor_id is null or upa.contractor_id = dr.contractor_id)
              and (upa.discipline_id is null or upa.discipline_id = dr.discipline_id)
          )
        )
    )
  );

create policy daily_report_safety_topics_select on daily_report_safety_topics for select
  using (
    exists (
      select 1 from daily_reports dr
      where dr.id = daily_report_safety_topics.daily_report_id
        and (
          exists (select 1 from profiles p where p.id = auth.uid() and p.role = 'head_office_admin')
          or exists (
            select 1 from user_project_access upa
            where upa.user_id = auth.uid()
              and upa.project_id = dr.project_id
              and (upa.contractor_id is null or upa.contractor_id = dr.contractor_id)
              and (upa.discipline_id is null or upa.discipline_id = dr.discipline_id)
          )
        )
    )
  );

create policy daily_report_material_receive_select on daily_report_material_receive for select
  using (
    exists (
      select 1 from daily_reports dr
      where dr.id = daily_report_material_receive.daily_report_id
        and (
          exists (select 1 from profiles p where p.id = auth.uid() and p.role = 'head_office_admin')
          or exists (
            select 1 from user_project_access upa
            where upa.user_id = auth.uid()
              and upa.project_id = dr.project_id
              and (upa.contractor_id is null or upa.contractor_id = dr.contractor_id)
              and (upa.discipline_id is null or upa.discipline_id = dr.discipline_id)
          )
        )
    )
  );

-- --- Own-report SELECT policies (additional permissive, OR'd with the above) ---

create policy daily_report_permits_select_own on daily_report_permits for select
  using (
    exists (
      select 1 from daily_reports dr
      where dr.id = daily_report_permits.daily_report_id
        and dr.created_by = auth.uid()
    )
  );

create policy daily_report_machinery_select_own on daily_report_machinery for select
  using (
    exists (
      select 1 from daily_reports dr
      where dr.id = daily_report_machinery.daily_report_id
        and dr.created_by = auth.uid()
    )
  );

create policy daily_report_safety_topics_select_own on daily_report_safety_topics for select
  using (
    exists (
      select 1 from daily_reports dr
      where dr.id = daily_report_safety_topics.daily_report_id
        and dr.created_by = auth.uid()
    )
  );

create policy daily_report_material_receive_select_own on daily_report_material_receive for select
  using (
    exists (
      select 1 from daily_reports dr
      where dr.id = daily_report_material_receive.daily_report_id
        and dr.created_by = auth.uid()
    )
  );
