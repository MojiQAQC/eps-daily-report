# Daily Report Save + Photo Attachments — Feature Design

Status: spec + plan, to be executed task-by-task (subagent-driven-development),
same process as the Export Daily Report feature. Builds on the still-open
`export-daily-report` branch/worktree, per user decision — not waiting for that
PR to merge first.

## Why this exists

The user asked to add photo attachments to daily reports and have them appear
in the exported PDF/Excel, matching the categorized layout in the real sample
PDFs (`C:\Users\Moji\OneDrive\STS\Daily Report`) — numbered "progress photo"
slots and separate "safety photo" slots.

Investigating surfaced a hard prerequisite: `src/app/daily-report/report-form.tsx`
still has its save button disabled with a "Slice 4" placeholder — there is no
real submitted report anywhere in the system except the one row seeded directly
via SQL for the export feature's own testing. Photos need something real to
attach to, so this spec also wires the form's actual save (the deferred "Slice
4" from `docs/TASKS.md`), per the user's explicit choice to treat it as a
prerequisite rather than route around it.

## Scope

**In scope:**
- Real save for `daily_reports` + `daily_report_workforce` + `daily_report_activities`
  + `daily_report_safety`, with INSERT RLS policies (only SELECT exists today).
- Photo upload (progress photos + safety photos, matching the two categories
  that appear consistently across every sample PDF) on the Daily Report form,
  uploaded directly from the browser to a new private Supabase Storage bucket.
- Photos rendered in the PDF export as numbered grids matching the sample
  layout ("No.1 / No.2 / No.3").
- Photos listed (filename + category, not embedded images) in the Excel export.

**Explicitly out of scope, flagged rather than silently built or skipped:**
- The sample PDFs' page-2 site-layout diagram (an annotated floor plan marking
  work locations). It varies too much across contractors to template the same
  way as the standardized progress/safety photo slots, and would need a
  different, more open-ended annotation UI. Not built here.
- Photo retention/deletion policy. `docs/PRODUCT.md` lists this as an
  explicitly open question ("do not assume answers"). This spec does not add
  any auto-deletion or expiry — photos simply persist, which is the reversible
  default; deleting is easy to add later, recovering deleted photos is not.
- Editing a submitted report, or resubmitting. Also an open PRODUCT.md question.
  Once saved, a report is immutable in this slice — matches the existing
  `report_status` enum's `submitted` state already meaning "done."
- Multi-project selection. This pilot has exactly one project (`STSBPP`); the
  save flow looks that project up dynamically (the one row in `projects`
  ordered by `created_at`) rather than hardcoding its code or id, but there is
  no project-picker UI, since Phase 1 is explicitly single-project per
  `docs/PRODUCT.md`.
- Discipline selection. The form has no discipline field today; new reports
  save with `discipline_id = null`, same as the existing schema already allows.
- `daily_report_safety`'s structured fields (`accident_status`,
  `accident_free_days`). The form only collects one free-text "safety notes"
  field; it saves into `daily_report_safety.remarks`, leaving the two
  structured columns `null`. Restructuring the safety section's UI into
  separate fields is a real, separate piece of work this spec doesn't take on.
- Who may submit: the save flow requires the signed-in user's own `profiles.contractor_id`
  (i.e. a `contractor_user`). A `site_admin`/`head_office_admin` previewing the
  form sees a clear message rather than a broken insert, since they have no
  contractor to attribute the report to and there's no contractor-picker UI.

## Schema additions

New migration `0003_daily_report_save_and_photos.sql`:

| Change | Why |
|---|---|
| `attachments.kind` (`'progress_photo' \| 'safety_photo'`, not null) | Distinguishes the two photo categories the export needs; the `attachments` table already exists from `0001_core_schema.sql` but has no way to categorize a photo today. |
| INSERT policy on `daily_reports` | A `contractor_user` may insert a report only for their **own** `contractor_id` (read from their own `profiles` row); `site_admin`/`head_office_admin` may insert for any contractor. Deliberately does **not** depend on `user_project_access` — that table is empty and has a known structural bug (flagged in the export PR's final review) making its NULL-wildcard grants unreachable. Sidestepping it here means Slice 4 doesn't inherit that bug; it's still tracked as a separate follow-up against the Roles/permissions slice. |
| INSERT policies on `daily_report_workforce`, `daily_report_activities`, `daily_report_safety`, `attachments` | Each requires the referenced `daily_report_id` to belong to a report where `created_by = auth.uid()` — i.e. you can only attach child rows to a report you just created in the same request. |
| Storage bucket `daily-report-photos` (private) | Holds the actual photo files. |
| `storage.objects` RLS policies (read + insert) | Path convention `{daily_report_id}/{kind}/{filename}`; policy extracts the report id from the path's first segment and reuses the same visibility rule as `daily_reports_select` for reads, and the same `created_by = auth.uid()` check as the table INSERT policies for writes. |

## Upload flow

1. User fills the form as today (workforce, activities, safety notes), plus
   two new sections: progress photos and safety photos (multi-file pickers
   with thumbnail previews and per-file remove).
2. On submit: insert `daily_reports` (get its id) → insert `daily_report_workforce`
   rows → insert `daily_report_activities` rows → insert one `daily_report_safety`
   row → upload each photo file directly to Storage (browser → Supabase, not
   routed through a Next.js API route) at `{id}/{kind}/{uuid}-{filename}` →
   insert one `attachments` row per uploaded photo → redirect to
   `/daily-report/{id}` (the detail page already built for the export feature).
3. Any failure part-way shows a form error; nothing silently half-saves without
   the user seeing it (errors surface report-creation, child-row, and upload
   failures distinctly enough to know what happened).

## Rendering

`assembleReportPayload` (already the single source `ReportView`, the PDF
renderer, and the Excel renderer all consume) gains an `attachments` array,
each entry carrying a short-lived **signed URL** (`createSignedUrl`, 5-minute
expiry) rather than a public URL, since the bucket is private. This is simpler
than inlining base64 data URIs: Playwright's `page.setContent(html, { waitUntil:
"networkidle" })` already waits for `<img>` network loads before printing, and
a 5-minute signed URL comfortably outlives a single render, so there's no need
for the render step to fetch and re-encode image bytes itself.

`ReportView` renders two new sections — "รูปความคืบหน้า (Progress Photos)" and
"รูปความปลอดภัย (Safety Photos)" — each a numbered grid ("No.1", "No.2", ...)
matching the sample template, omitted entirely when that category has no
photos (same empty-section convention `ReportView` already uses elsewhere).

`render-xlsx.ts` gets a "Photos" section listing each attachment's filename and
category as text rows — not embedded images, keeping Excel as the "data"
format and PDF as the "visual replica" format, consistent with the original
export spec's framing.

## Open questions carried over (not answered here)

- Photo retention policy (PRODUCT.md).
- Can a submitted report be edited or resubmitted (PRODUCT.md).
- The `user_project_access` structural bug from the export PR's final review —
  still not fixed; this spec's INSERT policies deliberately avoid depending on
  it, but the underlying table still needs its primary key redesigned before
  any real "whole project" or "whole discipline" access grant can work.
- The sample PDFs' page-2 site-layout diagram — descoped, not designed.
