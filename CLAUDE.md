# Claude-Specific Notes

Token efficiency matters — this project may run under limited quota.

- Don't re-read the whole repo each task. Read AGENTS.md + TASKS.md + the specific
  files your task touches.
- Don't regenerate docs that already answer the question; update them in place.
- Prefer small, focused diffs over rewrites.
- Skip narrative status reports — a short bullet summary is enough.
- If a decision is genuinely open (see `docs/DECISIONS.md` / open questions in
  `docs/PRODUCT.md`), don't invent an answer — flag it and use the most reversible
  option, or ask.

## UX/UI & Frontend Skills Available
Skills cloned from `qaqc-weekly-tracker` live in `.claude/skills/` and `.agents/skills/`:
- `impeccable`: Frontend craft system, commands (`polish`, `audit`, `critique`, `shape`, `colorize`, `typeset`, `layout`, `harden`), and `reference/craft-floor.md`.
- `web-design-guidelines`: Web interface guidelines compliance & a11y checks.
- `vercel-react-best-practices`: Composition, hook patterns, and rendering performance.
- `vercel-optimize`: Performance diagnostics and bundle optimization.
- `vercel-react-view-transitions`: Smooth page & view transition recipes.
- `writing-guidelines`: Concise, high-clarity UX microcopy & documentation.

When building or refining UI for EPS Daily Report:
- Use **Operate mode** (`.agents/skills/impeccable/reference/operate.md`): task-oriented, high scanability, restrained color palette, earned familiarity.
- Adhere to the **Craft Floor** (`craft-floor.md`): minimum 4.5:1 text contrast, complete component states (default, hover, focus, active, disabled, loading, error, empty), purposeful micro-motion (150–250ms), and real copy.
