-- EPS Daily Report & Site Collaboration — Core Schema (Phase 1 draft)
-- DRAFT: RLS policies below are minimum-viable and need review against
-- docs/PERMISSIONS.md before this is treated as final (esp. site_admin vs
-- head_office_admin scope, which is still an open question).

-- ==========================================================
-- Master data: contractors, disciplines (created first — profiles references contractors)
-- ==========================================================

create table contractors (
  id uuid primary key default gen_random_uuid(),
  name text not null unique
);

create table disciplines (
  id uuid primary key default gen_random_uuid(),
  name text not null unique
);

-- ==========================================================
-- Roles / Profiles
-- ==========================================================

create type user_role as enum ('contractor_user', 'site_admin', 'head_office_admin');

create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null,
  role user_role not null,
  contractor_id uuid references contractors(id), -- null for admin roles
  created_at timestamptz not null default now()
);

create table contractor_disciplines (
  contractor_id uuid not null references contractors(id) on delete cascade,
  discipline_id uuid not null references disciplines(id) on delete cascade,
  primary key (contractor_id, discipline_id)
);

create table projects (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  code text unique,
  latitude numeric,
  longitude numeric,
  timezone text,
  created_at timestamptz not null default now()
);

-- projects table (below), project_contractors links it to contractors

create table project_contractors (
  project_id uuid not null references projects(id) on delete cascade,
  contractor_id uuid not null references contractors(id) on delete cascade,
  primary key (project_id, contractor_id)
);

-- Which project/contractor/discipline combinations a user may access.
create table user_project_access (
  user_id uuid not null references profiles(id) on delete cascade,
  project_id uuid not null references projects(id) on delete cascade,
  contractor_id uuid references contractors(id),
  discipline_id uuid references disciplines(id),
  primary key (user_id, project_id, contractor_id, discipline_id)
);

-- ==========================================================
-- Daily Reports
-- ==========================================================

create type report_type as enum ('morning_plan', 'end_of_day_actual');
create type report_status as enum ('draft', 'submitted');

create table daily_reports (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects(id),
  contractor_id uuid not null references contractors(id),
  discipline_id uuid references disciplines(id),
  report_date date not null,
  report_type report_type not null,
  status report_status not null default 'draft',
  reporter_name text,
  reporter_contact text,
  reporter_user_id uuid references profiles(id),
  weather_temperature numeric,
  weather_humidity numeric,
  weather_rain_probability numeric,
  weather_wind text,
  weather_condition text,
  weather_retrieved_at timestamptz,
  created_by uuid not null references profiles(id),
  created_at timestamptz not null default now(),
  unique (project_id, contractor_id, report_date, report_type)
);

create table daily_report_workforce (
  id uuid primary key default gen_random_uuid(),
  daily_report_id uuid not null references daily_reports(id) on delete cascade,
  role_name text not null, -- extensible: Site Manager, Engineer, Welder, ...
  male_count int not null default 0,
  female_count int not null default 0
);

create table daily_report_permits (
  id uuid primary key default gen_random_uuid(),
  daily_report_id uuid not null references daily_reports(id) on delete cascade,
  permit_type text not null, -- Work at Height, Hot Work, Confined Space, ...
  count int,
  workers int,
  remarks text
);

create table daily_report_activities (
  id uuid primary key default gen_random_uuid(),
  daily_report_id uuid not null references daily_reports(id) on delete cascade,
  area text,
  description text not null,
  planned_progress numeric,
  actual_progress numeric,
  status text, -- see work_status values in docs/DATA_MODEL.md
  supervisor text,
  remarks text
);

create table daily_report_machinery (
  id uuid primary key default gen_random_uuid(),
  daily_report_id uuid not null references daily_reports(id) on delete cascade,
  machinery_type text not null,
  quantity int not null default 0
);

create table daily_report_safety (
  daily_report_id uuid primary key references daily_reports(id) on delete cascade,
  accident_status text,
  accident_free_days int,
  remarks text
);

create table daily_report_safety_topics (
  id uuid primary key default gen_random_uuid(),
  daily_report_id uuid not null references daily_reports(id) on delete cascade,
  topic text not null
);

-- ==========================================================
-- Project Update Feed / Critical Work
-- ==========================================================

create type update_category as enum (
  'progress_update', 'completed_work', 'in_progress', 'next_tomorrow',
  'issue_concern', 'announcement'
);
create type priority_level as enum ('CRITICAL', 'HIGH', 'NORMAL', 'LOW');
create type work_status as enum (
  'NOT_STARTED', 'IN_PROGRESS', 'COMPLETED', 'BLOCKED', 'DELAYED'
);

create table project_updates (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects(id),
  contractor_id uuid references contractors(id),
  discipline_id uuid references disciplines(id),
  category update_category not null,
  title text not null,
  description text,
  area text,
  status work_status,
  priority priority_level not null default 'NORMAL',
  -- required when priority = CRITICAL (enforce in app validation + optionally a check constraint)
  critical_reason text,
  critical_due_date date,
  critical_impact_if_delayed text,
  critical_dependent_activity text,
  owner text,
  due_date date,
  created_by uuid not null references profiles(id),
  created_at timestamptz not null default now()
);

create table attachments (
  id uuid primary key default gen_random_uuid(),
  storage_path text not null, -- Supabase Storage path today; provider-agnostic by convention
  daily_report_id uuid references daily_reports(id) on delete cascade,
  project_update_id uuid references project_updates(id) on delete cascade,
  uploaded_by uuid references profiles(id),
  created_at timestamptz not null default now(),
  check (daily_report_id is not null or project_update_id is not null)
);

-- ==========================================================
-- Row Level Security (draft — review before Phase 1 slice 1)
-- ==========================================================

alter table daily_reports enable row level security;
alter table project_updates enable row level security;
alter table daily_report_workforce enable row level security;
alter table daily_report_permits enable row level security;
alter table daily_report_activities enable row level security;
alter table daily_report_machinery enable row level security;
alter table daily_report_safety enable row level security;
alter table daily_report_safety_topics enable row level security;
alter table attachments enable row level security;
alter table user_project_access enable row level security;

-- Master data + profiles: enabled with no policies yet (deny-all except
-- service_role), same "lock down now, add policies later" pattern as
-- user_project_access above. profiles especially must never be open to the
-- anon/authenticated API by default (role + contractor_id are sensitive).
alter table profiles enable row level security;
alter table contractors enable row level security;
alter table disciplines enable row level security;
alter table contractor_disciplines enable row level security;
alter table projects enable row level security;
alter table project_contractors enable row level security;

-- Example policy shape (repeat per table, or wrap in a shared function):
-- head_office_admin sees everything; others see only rows matching their
-- user_project_access grants for that project/contractor/discipline.
create policy daily_reports_select on daily_reports for select
  using (
    exists (
      select 1 from profiles p
      where p.id = auth.uid() and p.role = 'head_office_admin'
    )
    or exists (
      select 1 from user_project_access upa
      where upa.user_id = auth.uid()
        and upa.project_id = daily_reports.project_id
        and (upa.contractor_id is null or upa.contractor_id = daily_reports.contractor_id)
        and (upa.discipline_id is null or upa.discipline_id = daily_reports.discipline_id)
    )
  );

-- TODO: insert/update policies (contractor_user can insert/update only their own
-- contractor's reports; can they edit after submission? -- open question),
-- and equivalent policies for project_updates, workforce/permits/activities/
-- machinery/safety child tables (typically: same visibility as parent daily_report),
-- and attachments. Finalize once docs/PRODUCT.md open questions are answered.
