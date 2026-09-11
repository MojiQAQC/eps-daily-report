-- supabase/migrations/0004_daily_report_photos_hardening.sql
-- Daily Report Save + Photo Attachments — final-review hardening.
-- 0003_daily_report_save_and_photos.sql is already applied to the live
-- database, so this migration only adds constraints on top of it rather
-- than editing it in place.

-- ==========================================================
-- Storage bucket: enforce size/type limits server-side. Previously the
-- bucket had no file_size_limit or allowed_mime_types, so accept="image/*"
-- on the upload form was a UI hint only, not an enforced constraint.
-- ==========================================================

update storage.buckets
set file_size_limit = 10485760, -- 10 MB
    allowed_mime_types = array['image/jpeg','image/png','image/webp']
where id = 'daily-report-photos';

-- ==========================================================
-- attachments_insert: the original policy let a contractor insert an
-- attachments row on their own report whose storage_path named ANY storage
-- object (not necessarily one under their own report's folder), and
-- uploaded_by was client-supplied with no check that it matched the caller.
-- Re-create the same policy with those two gaps closed.
-- ==========================================================

drop policy if exists attachments_insert on attachments;

create policy attachments_insert on attachments for insert
  with check (
    daily_report_id is not null
    and exists (
      select 1 from daily_reports dr
      where dr.id = attachments.daily_report_id
        and dr.created_by = auth.uid()
    )
    and storage_path like daily_report_id::text || '/%'
    and uploaded_by = auth.uid()
  );
