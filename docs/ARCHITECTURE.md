# Architecture

## Layers

```
UI (Next.js pages/components)
  -> Service layer (validation, orchestration — src/lib/*)
  -> Data access / repository layer (src/lib/data-access/*)
  -> Database (Supabase Postgres, RLS-enforced)
```

Components never call `supabase.from(...)` directly — everything goes through
`src/lib/data-access/`. This is the minimum abstraction needed so a future move off
Supabase (corporate Postgres/SQL Server, custom API) only touches that one folder.
No enterprise abstraction framework beyond that.

## Why Supabase now, not forever

Supabase (Postgres + Auth + RLS + Storage) is the fastest way to get a secure,
correctly-isolated MVP running. Production hosting/DB/storage are not finalized by
the company (see open questions in `PRODUCT.md`). Keeping Supabase calls
concentrated in the data access layer keeps migration realistic later.

## Files/Photos

Binary files are never stored in Postgres rows. Database stores metadata + storage
path/URL; actual bytes live in Supabase Storage now, with a clear seam to move to
Azure Blob / S3 / corporate storage later (same reasoning as above).

## AI (future phases)

AI calls are additive and isolated: they read structured data and write AI-labeled
results to their own tables/columns (never overwrite verified data). If the AI
service is down, Daily Report submission, history, and dashboard numbers must all
keep working.

## Security baseline

- Auth: Supabase Auth (email invite -> verify -> set password -> login)
- Authorization: Postgres Row Level Security, not just UI hiding
- Secrets: `SUPABASE_SERVICE_ROLE_KEY` and any AI/weather keys are server-only,
  never in a browser bundle, never committed (see `.env.example`, `.gitignore`)
