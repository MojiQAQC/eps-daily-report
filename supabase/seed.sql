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

-- 3. Pilot Project
-- Location: Thung Song, Nakhon Si Thammarat, Thailand
-- Coordinates derived from site layout survey grid (UTM 47N 575190, 895081 -> WGS84 ~8.096970, 99.682458)
insert into projects (name, code, latitude, longitude, timezone) values
  ('STS-9.9 MW Biomass Power Plant', 'STSBPP', 8.096970, 99.682458, 'Asia/Bangkok')
on conflict (code) do update set
  latitude = excluded.latitude,
  longitude = excluded.longitude,
  timezone = excluded.timezone;
