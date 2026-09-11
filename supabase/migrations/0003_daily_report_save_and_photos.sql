-- supabase/migrations/0003_daily_report_save_and_photos.sql
-- Daily Report Save + Photo Attachments — schema additions.
-- See docs/superpowers/specs/2026-09-10-daily-report-save-and-photos-design.md

alter table attachments
  add column kind text check (kind in ('progress_photo', 'safety_photo'));

-- ==========================================================
-- INSERT policies: a contractor_user may create a report only for their own
-- contractor; site_admin/head_office_admin may create for any contractor.
-- Deliberately does not depend on user_project_access (empty today, and has
-- a known structural bug tracked separately against the Roles/permissions
-- slice) — sidestepping it here keeps Slice 4 from inheriting that bug.
-- ==========================================================

create policy daily_reports_insert on daily_reports for insert
  with check (
    created_by = auth.uid()
    and exists (
      select 1 from profiles p
      where p.id = auth.uid()
        and (
          p.role in ('head_office_admin', 'site_admin')
          or (p.role = 'contractor_user' and p.contractor_id = daily_reports.contractor_id)
        )
    )
  );

create policy daily_report_workforce_insert on daily_report_workforce for insert
  with check (
    exists (
      select 1 from daily_reports dr
      where dr.id = daily_report_workforce.daily_report_id
        and dr.created_by = auth.uid()
    )
  );

create policy daily_report_activities_insert on daily_report_activities for insert
  with check (
    exists (
      select 1 from daily_reports dr
      where dr.id = daily_report_activities.daily_report_id
        and dr.created_by = auth.uid()
    )
  );

create policy daily_report_safety_insert on daily_report_safety for insert
  with check (
    exists (
      select 1 from daily_reports dr
      where dr.id = daily_report_safety.daily_report_id
        and dr.created_by = auth.uid()
    )
  );

create policy attachments_insert on attachments for insert
  with check (
    daily_report_id is not null
    and exists (
      select 1 from daily_reports dr
      where dr.id = attachments.daily_report_id
        and dr.created_by = auth.uid()
    )
  );

-- ==========================================================
-- Own-report SELECT policies: additional permissive policies are OR'd with
-- the existing ones from 0002_export_support.sql, so this purely adds "you
-- can always read what you created" without narrowing any existing access.
-- ==========================================================

create policy daily_reports_select_own on daily_reports for select
  using (created_by = auth.uid());

create policy daily_report_workforce_select_own on daily_report_workforce for select
  using (
    exists (
      select 1 from daily_reports dr
      where dr.id = daily_report_workforce.daily_report_id
        and dr.created_by = auth.uid()
    )
  );

create policy daily_report_activities_select_own on daily_report_activities for select
  using (
    exists (
      select 1 from daily_reports dr
      where dr.id = daily_report_activities.daily_report_id
        and dr.created_by = auth.uid()
    )
  );

create policy daily_report_safety_select_own on daily_report_safety for select
  using (
    exists (
      select 1 from daily_reports dr
      where dr.id = daily_report_safety.daily_report_id
        and dr.created_by = auth.uid()
    )
  );

create policy attachments_select on attachments for select
  using (
    exists (
      select 1 from daily_reports dr
      where dr.id = attachments.daily_report_id
        and (
          dr.created_by = auth.uid()
          or exists (select 1 from profiles p where p.id = auth.uid() and p.role = 'head_office_admin')
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

-- ==========================================================
-- Photo storage. Path convention: {daily_report_id}/{kind}/{filename}.
-- storage.foldername(name) is Supabase's documented helper for splitting an
-- object path into its folder segments; storage.objects already has RLS
-- enabled by default on every Supabase project.
-- ==========================================================

insert into storage.buckets (id, name, public)
values ('daily-report-photos', 'daily-report-photos', false)
on conflict (id) do nothing;

create policy daily_report_photos_insert on storage.objects for insert
  with check (
    bucket_id = 'daily-report-photos'
    and exists (
      select 1 from daily_reports dr
      where dr.id::text = (storage.foldername(name))[1]
        and dr.created_by = auth.uid()
    )
  );

create policy daily_report_photos_select on storage.objects for select
  using (
    bucket_id = 'daily-report-photos'
    and exists (
      select 1 from daily_reports dr
      where dr.id::text = (storage.foldername(name))[1]
        and (
          dr.created_by = auth.uid()
          or exists (select 1 from profiles p where p.id = auth.uid() and p.role = 'head_office_admin')
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
