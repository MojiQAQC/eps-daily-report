-- supabase/migrations/0002_export_support.sql
-- Export Daily Report — schema additions.
-- See docs/superpowers/specs/2026-09-10-export-daily-report-design.md

alter table contractors add column short_code text unique;

alter table daily_reports
  add column report_number text,
  add column time_start time,
  add column time_finish time,
  add column overtime_hours numeric,
  add column cumulative_plan_pct numeric,
  add column cumulative_actual_pct numeric,
  add column checked_by_user_id uuid references profiles(id),
  add column checked_at timestamptz;

-- Child-table SELECT policies, same visibility rule as daily_reports_select:
-- head_office_admin sees everything; everyone else needs a matching
-- user_project_access grant for the parent report's project/contractor/discipline.

create policy daily_report_workforce_select on daily_report_workforce for select
  using (
    exists (
      select 1 from daily_reports dr
      where dr.id = daily_report_workforce.daily_report_id
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

create policy daily_report_activities_select on daily_report_activities for select
  using (
    exists (
      select 1 from daily_reports dr
      where dr.id = daily_report_activities.daily_report_id
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

create policy daily_report_safety_select on daily_report_safety for select
  using (
    exists (
      select 1 from daily_reports dr
      where dr.id = daily_report_safety.daily_report_id
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

-- Master data used by the report view (contractor/project names) isn't sensitive —
-- what's restricted is report DATA, not the directory of contractors/projects.
create policy contractors_select_authenticated on contractors for select
  using (auth.role() = 'authenticated');

create policy projects_select_authenticated on projects for select
  using (auth.role() = 'authenticated');
