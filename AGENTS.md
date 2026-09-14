# Agent Rules (all AI agents + humans)

> **Single Source of Truth & Live Deployment**
> * **Production URL:** [https://eps-daily-report.vercel.app](https://eps-daily-report.vercel.app)
> * **Canonical GitHub Repo:** [https://github.com/MojiQAQC/eps-daily-report](https://github.com/MojiQAQC/eps-daily-report) (Branch: `main`)
> * Multiple AI agents (Antigravity, Claude Code, OpenCode) work on this repo concurrently. All agents **MUST** keep the remote repository updated so Vercel can automatically deploy the live site.

1. Read this file, then `docs/TASKS.md`, before doing anything.
2. Read only the docs relevant to your task (see README docs map).
3. Run `git status` / `git diff` before editing — don't collide with unfinished work. Always run `git pull --rebase origin main` before starting new tasks.
4. Make the smallest change that completes the task. Don't refactor unrelated code.
5. Never hardcode contractor names, roles, or discipline lists into app logic —
   they're data (see `docs/DATA_MODEL.md`).
6. Never trust client-provided `contractor_id` / `role` / `project_id` for access
   control — enforcement lives in Supabase RLS (see `docs/PERMISSIONS.md`).
7. Never commit secrets. `SUPABASE_SERVICE_ROLE_KEY` and friends are server-only —
   see `.env.example`.
8. Follow vertical slices (`docs/TASKS.md` order) — don't build a whole layer
   (e.g. all schema, or all UI) ahead of what's actually needed next.
9. Run lint/build after changes if the tooling is available (`npm run build`).
10. Update `docs/TASKS.md` when you change project status. Keep it short.
11. End with a short completion summary — no long narrative reports.
12. Follow UX/UI Craft Floor & Operate mode principles (`.agents/skills/impeccable/reference/craft-floor.md` & `operate.md`) — consistency over novelty, fast state transitions (150–250ms), accessible contrast (≥4.5:1), and complete component states.
13. **Mandatory GitHub Push:** When a slice/task is complete and builds cleanly (`npm run build`), **ALWAYS commit and push to `origin main`** (`https://github.com/MojiQAQC/eps-daily-report`). Do not leave finished working code unstaged/unpushed locally. Vercel auto-deploys every push to the live production URL.
