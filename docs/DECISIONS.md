# Decisions

Confirmed choices only — open items live in `PRODUCT.md`.

- Repo was empty at project start -> used the preferred MVP stack: Next.js +
  React + TypeScript + Tailwind, Supabase (Postgres/Auth/RLS/Storage), GitHub.
- Layered architecture: UI -> service -> data-access (repository) -> DB. All
  Supabase calls concentrated in `src/lib/data-access/` for future migration.
- Contractor company and discipline are separate, data-driven concepts (never
  hardcoded) — see `DATA_MODEL.md`.
- Workforce roles, permit types, machinery types are rows, not fixed schema
  columns — extensible without migrations.
- Activities are a child table, not `activity_1/2/3` columns.
- Morning Plan and End-of-Day Actual share one `daily_reports` shape
  (`report_type` column) so plan-vs-actual is a query, not a schema fork.
- Priority is a 4-level enum (CRITICAL/HIGH/NORMAL/LOW), not a 1–10 scale.
- Status is a small controlled enum (NOT_STARTED/IN_PROGRESS/COMPLETED/BLOCKED/
  DELAYED).
- No public self-registration in Phase 1 — admin-invite flow only.
- AI is additive/optional everywhere; never authoritative for dashboard numbers;
  never auto-marks work CRITICAL.
- Development proceeds in vertical slices (see `TASKS.md`), not layer-by-layer.
