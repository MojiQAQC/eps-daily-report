# EPS Daily Report & Site Collaboration System

Structured replacement for LINE-message + PDF daily site reporting. Pilot project:
**STS-9.9 MW Biomass Power Plant**.

Read `AGENTS.md` before making any change — it's short and applies to every contributor
(human or AI).

## Stack

- Next.js 14 (App Router) + React + TypeScript + Tailwind CSS
- Supabase (Postgres + Auth + Row Level Security) — prototype backend, not a hard lock-in
- GitHub for source control

## Setup

```bash
cp .env.example .env.local   # fill in Supabase project values
npm install
npm run dev
```

## Structure

```
src/app/            Next.js routes (UI)
src/lib/data-access/  Repository layer — ALL Supabase calls go through here
src/lib/supabase/     Supabase client factories (browser + server)
src/types/           Shared TypeScript types
supabase/migrations/ SQL schema, applied in order
docs/                Product, architecture, data model, permissions, decisions, tasks
```

## Docs map

- `docs/PRODUCT.md` — business scope
- `docs/ARCHITECTURE.md` — technical layers, migration strategy
- `docs/DATA_MODEL.md` — entities and relationships
- `docs/PERMISSIONS.md` — roles and access rules
- `docs/DECISIONS.md` — confirmed decisions
- `docs/TASKS.md` — current status, what's next
