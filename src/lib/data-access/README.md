# Data Access Layer

Repository-style functions live here (one file per aggregate, e.g. `daily-reports.ts`,
`project-updates.ts`, `contractors.ts`).

Rule: React components and API routes call functions from this layer — they never
call `supabase.from(...)` directly. This keeps Supabase-specific code in one place
so a future migration (e.g. to a corporate Postgres + custom API) only touches
this folder, not the UI.

Each function should:
- accept plain typed arguments, return plain typed data (no Supabase types leaking out)
- rely on the caller's authenticated Supabase client (RLS enforces access — do not
  re-implement permission checks in JS that duplicate/could drift from RLS)
