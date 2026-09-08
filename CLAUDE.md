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
