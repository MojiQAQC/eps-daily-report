# Data Model

Normalized relational model. Minimum useful schema for Phase 1 — see
`supabase/migrations/0001_core_schema.sql` for actual DDL.

## Core entities

```
profiles              1 row per authenticated user (extends Supabase auth.users)
roles                  contractor_user | site_admin | head_office_admin
contractors             company (Fast Steel, Sinoma, ...) — never hardcoded
disciplines              Civil, Electrical, Piping, ... — never hardcoded
contractor_disciplines   which disciplines a contractor performs
projects                 e.g. STS-9.9 MW Biomass Power Plant
project_contractors      which contractors work on which project
user_project_access      which project(s)/contractor/discipline a user may access
```

## Daily Report (one row per project + contractor + date + report_type)

```
daily_reports
  -> report_type: 'morning_plan' | 'end_of_day_actual'
  -> daily_report_workforce      (role, male_count, female_count — role is data,
                                   not a column, so roles are extensible)
  -> daily_report_permits        (permit_type, count, workers, remarks)
  -> daily_report_activities     (area, description, planned/actual progress,
                                   status, supervisor, remarks — no activity_1/2/3)
  -> daily_report_machinery      (machinery_type, quantity)
  -> daily_report_safety         (accident status, accident-free days, remarks)
  -> daily_report_safety_topics  (safety talk topics, many per report)
  -> weather snapshot (fields on daily_reports or a linked weather_snapshots row,
                         with a retrieved_at timestamp — TBD when Weather API lands)
```

Morning Plan and End-of-Day Actual are the *same* `daily_reports` shape,
distinguished by `report_type`, so plan-vs-actual comparison is a query, not a
schema change.

## Project Update Feed

```
project_updates
  project, contractor, discipline, category
  (progress_update | completed_work | in_progress | next_tomorrow | issue_concern | announcement)
  title, description, area, status, priority, owner, due_date
  created_by, created_at
attachments   (photo storage_path/url, linked to a project_update or daily_report;
               kind: 'progress_photo' | 'safety_photo' | null for other attachment
               types — added in migration 0003)
```

No reactions/comments/chat/threads in Phase 1.

Daily report photos live in the private `daily-report-photos` Storage bucket
(path convention `{report_id}/{kind}/{uuid}-{filename}`, size/type limited by
migration 0004); access is RLS-gated on `storage.objects`, not public.

## Critical Work / Priority

`project_updates` (and/or a lightweight `work_items` table if updates and
trackable work items diverge later) carries:

```
priority: CRITICAL | HIGH | NORMAL | LOW
status:   NOT_STARTED | IN_PROGRESS | COMPLETED | BLOCKED | DELAYED
```

When `priority = CRITICAL`, the form should require: reason, due date, impact if
delayed, dependent/next activity. AI may later *suggest* CRITICAL; it never sets
it automatically.

## Key relationships

- User -> role, -> contractor (if contractor_user), -> permitted project(s)/discipline(s)
- Contractor -> many disciplines (via contractor_disciplines)
- Project -> many contractors (via project_contractors)
- Daily Report -> belongs to (project, contractor, date, report_type)
- Project Update -> belongs to (project, contractor)
