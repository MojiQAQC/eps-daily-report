# Product

## What this replaces

Site reporting currently runs on LINE messages + Daily Report PDFs. Goal: turn that
into structured data that supports history, plan-vs-actual, dashboards, and (later)
AI summaries — without depending on AI for core function.

## Pilot

One project: **STS-9.9 MW Biomass Power Plant** (EPS manages ~23 projects total;
this pilot proves the model before wider rollout).

## Core principle

```
Structured Data -> Database -> Core Application -> Dashboard / History / Updates
```

AI is an optional enhancement layer (summaries, PDF/OCR extraction, plan-vs-actual
analysis, draft updates, missing-data/critical-work detection). AI is never the
source of truth for dashboard numbers, and never auto-marks work as critical —
it can only suggest; a human confirms.

## Phase roadmap

- **Phase 1 (this build):** auth, roles, contractor isolation, contractor/project/
  discipline master data, Daily Report, Report History, Project Update Feed,
  Priority/Critical Work.
- **Phase 1.1:** AI daily summary, AI draft project update, basic data-quality checks.
- **Phase 1.2:** Dashboard (metrics from DB, AI summary as an add-on panel).
- **Phase 2:** PDF upload + AI Vision/OCR auto-fill, Weather API.
- **Phase 3:** LINE integration, webhooks, notifications, advanced AI analysis.

Don't build later phases early.

## Open questions (do not assume answers)

- Final production hosting (company Linux/Windows/Azure/AWS?)
- Company-approved database and storage (Supabase is a prototype choice)
- Corporate authentication (SSO?) vs Supabase Auth long-term
- External contractor login policy
- Final required Daily Report fields (list above is a starting point)
- Can contractors edit a submitted report, or is it locked after submission?
- Can Site Admin manage contractor user accounts, or Head Office Admin only?
- Photo retention policy
- AI provider approval + AI data privacy policy
- Weather data provider
