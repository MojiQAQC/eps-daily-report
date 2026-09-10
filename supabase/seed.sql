-- EPS Daily Report — Seed Master Data
-- Pilot Project: STS-9.9 MW Biomass Power Plant in Thung Song, Nakhon Si Thammarat

-- 1. Disciplines
insert into disciplines (name) values
  ('Civil'),
  ('Mechanical'),
  ('Electrical'),
  ('Piping')
on conflict (name) do nothing;

-- 2. Contractors (found from active site daily reports)
insert into contractors (name) values
  ('หจก. ฟาสต์สตีล จำกัด (Fast Steel)'),
  ('หจก. แอล-แทป เอ็นจิเนียริ่ง (L-TAB)'),
  ('CKM'),
  ('RETS'),
  ('S-Zone (Sinoma)'),
  ('UE'),
  ('US'),
  ('PPE'),
  ('KR'),
  ('PE'),
  ('ZOE')
on conflict (name) do nothing;

-- 2b. Contractor short codes (used in export filenames)
update contractors set short_code = v.short_code
from (values
  ('หจก. ฟาสต์สตีล จำกัด (Fast Steel)', 'FASTSTEEL'),
  ('หจก. แอล-แทป เอ็นจิเนียริ่ง (L-TAB)', 'LTAB'),
  ('CKM', 'CKM'),
  ('RETS', 'RETS'),
  ('S-Zone (Sinoma)', 'SZONE'),
  ('UE', 'UE'),
  ('US', 'US'),
  ('PPE', 'PPE'),
  ('KR', 'KR'),
  ('PE', 'PE'),
  ('ZOE', 'ZOE')
) as v(name, short_code)
where contractors.name = v.name;

-- 3. Pilot Project
-- Location: Thung Song, Nakhon Si Thammarat, Thailand
-- Coordinates derived from site layout survey grid (UTM 47N 575190, 895081 -> WGS84 ~8.096970, 99.682458)
insert into projects (name, code, latitude, longitude, timezone) values
  ('STS-9.9 MW Biomass Power Plant', 'STSBPP', 8.096970, 99.682458, 'Asia/Bangkok')
on conflict (code) do update set
  latitude = excluded.latitude,
  longitude = excluded.longitude,
  timezone = excluded.timezone;

-- 4. Sample submitted report (real values from
--    "RETS Daily Progress and Safety 4-9-2026.pdf" — see
--    docs/superpowers/specs/2026-09-10-export-daily-report-design.md)
insert into daily_reports (
  id, project_id, contractor_id, report_date, report_type, status,
  time_start, time_finish, cumulative_plan_pct, cumulative_actual_pct,
  created_by
)
select
  '00000000-0000-0000-0000-000000000001',
  p.id, c.id, '2026-09-04', 'end_of_day_actual', 'submitted',
  '08:00', '17:00', 100, 20,
  -- created_by must reference a real profiles row; seed has none yet, so this
  -- insert is written to be run after at least one profile exists (see the
  -- Slice 4 / auth work tracked separately). For local dev without a profile
  -- yet, comment out the created_by line and the not-null constraint check
  -- will tell you which row to create first.
  (select id from profiles limit 1)
from projects p, contractors c
where p.code = 'STSBPP' and c.name = 'RETS'
on conflict (id) do nothing;

insert into daily_report_workforce (daily_report_id, role_name, male_count, female_count)
values ('00000000-0000-0000-0000-000000000001', 'รวมกำลังคนวันนี้ (Total manpower)', 15, 0)
on conflict do nothing;

insert into daily_report_activities (
  daily_report_id, area, description, planned_progress, actual_progress,
  status, supervisor
) values
  ('00000000-0000-0000-0000-000000000001', 'Stack',
   'เจียร์เก็บเก็บงานเชื่อม Stack (grinding/clean-up of welding work)',
   20, 20, 'IN_PROGRESS', 'RETS/EPS'),
  ('00000000-0000-0000-0000-000000000001', 'Stack',
   'งานประกอบหูช้าง (elephant-ear bracket assembly)',
   40, 40, 'IN_PROGRESS', 'RETS/EPS')
on conflict do nothing;

insert into daily_report_safety (daily_report_id, accident_status, remarks)
values (
  '00000000-0000-0000-0000-000000000001',
  'ไม่มีอุบัติเหตุ (No accidents — 0 ครั้ง)',
  'Best Record ตามเอกสารต้นฉบับ: 66 วัน'
)
on conflict do nothing;
