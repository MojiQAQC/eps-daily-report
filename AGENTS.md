# Agent Rules (all AI agents + humans)

1. Read this file, then `docs/TASKS.md`, before doing anything.
2. Read only the docs relevant to your task (see README docs map).
3. Run `git status` / `git diff` before editing — don't collide with unfinished work.
4. Make the smallest change that completes the task. Don't refactor unrelated code.
5. Never hardcode contractor names, roles, or discipline lists into app logic —
   they're data (see `docs/DATA_MODEL.md`).
6. Never trust client-provided `contractor_id` / `role` / `project_id` for access
   control — enforcement lives in Supabase RLS (see `docs/PERMISSIONS.md`).
7. Never commit secrets. `SUPABASE_SERVICE_ROLE_KEY` and friends are server-only —
   see `.env.example`.
8. Follow vertical slices (`docs/TASKS.md` order) — don't build a whole layer
   (e.g. all schema, or all UI) ahead of what's actually needed next.
9. Run lint/build after changes if the tooling is available.
10. Update `docs/TASKS.md` when you change project status. Keep it short.
11. End with a short completion summary — no long narrative reports.
