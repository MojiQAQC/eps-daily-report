# Export Daily Report — Feature Design

Status: spec only, no implementation yet. Depends on Phase 1 (auth, master data,
Daily Report CRUD) being complete and real submitted reports existing. Slots into
the roadmap around Phase 1.2 (Dashboard) / Phase 2 — see `docs/TASKS.md`.

## Why this exists

Site reporting today runs on ~10 contractors each hand-filling a shared Thai/English
Word/Excel "Daily Request & Report" template and exporting it to PDF. This repo's
`docs/PRODUCT.md` already names this as what the app replaces. This spec designs the
feature that lets the dashboard *generate* that same document from data already
captured through the app's own Daily Report form, instead of a contractor typing it
into a template by hand.

## Source evidence

Analyzed 36 real sample PDFs from `C:\Users\Moji\OneDrive\STS\Daily Report`
(contractors CKM, ZOE, RETS, L-Tap, PPE, and several STSBPP-coded formal submittals).
All confirmed to be for the same pilot project already modeled in this repo
(`docs/PRODUCT.md`'s "STS 9.9 MW Biomass Power Plant") — the PDFs are literally
signed "Checked by EPS". Every sample follows one shared template, despite each
contractor naming their exported file differently. No data in this spec is invented;
every field below is traceable to a section that actually appears in the samples.

## Approach

Three options considered:

**A — Server-rendered React → PDF + Excel (recommended).** One "report view" React
component, rendered server-side and printed to PDF (headless Chromium, e.g.
Playwright), plus a separate structured Excel export (exceljs) for bulk/analysis use.
Stays entirely inside the existing Next.js stack; the same component can double as an
on-screen preview.

**B — Fill the literal Word/Excel template file** (docxtemplater / carbone.io).
Byte-identical to today's template, but requires the actual source template file
(not just its PDF output) and adds a commercial/format dependency. More brittle if
the template changes.

**C — Excel-only export, PDF as a secondary HTML→PDF conversion of the spreadsheet.**
Simplest to build, but drops the familiar visual layout at exactly the point where
user trust in the new system matters most (the transition off the manual process).

**Recommendation: A.** Best fit for the existing stack, preserves visual familiarity,
and the "render once, use for preview and export" pattern avoids duplicate layout
code.

## Data model additions

Cross-checked every section of the sample PDFs against
`supabase/migrations/0001_core_schema.sql`. Most fields already exist. Gaps:

| Field | Table | Notes |
|---|---|---|
| `overtime_hours` | `daily_reports` | "Total OT hr." |
| `time_start`, `time_finish` | `daily_reports` | currently only `report_date` exists |
| `report_number` | `daily_reports` | **generate server-side** per contractor+project sequence — do not trust contractor input. The RETS sample has this field simply left blank; auto-numbering removes that whole error class. |
| `cumulative_plan_pct`, `cumulative_actual_pct` | `daily_reports` | keep as contractor-entered fields — matches actual current practice (typed from their own external tracking). No master-schedule/BOQ data exists anywhere in the samples to compute this from instead, so this spec does not invent a computation model for it. |
| `checked_by_user_id`, `checked_at` | `daily_reports` | maps to the "Prepared by Contractor / Checked by EPS" signature blocks; also informs the open question in `docs/PRODUCT.md` about locking reports after submission |
| `daily_report_material_receipts` (new table) | `id, daily_report_id, item_description, quantity, unit, remarks` | "Material Receive" section has no home in the current schema at all |
| `activity_kind: 'today' \| 'tomorrow_forecast'` | `daily_report_activities` | reuse the existing table instead of adding a new one — "Tomorrow Forecast Activities" is the same shape minus plan/actual % and supervisor |
| `jsa_reference` | `daily_report_activities` | JSA column in the Today Activities table |
| `short_code` | `contractors` | new — see File naming below |

**Explicitly not stored as writable fields**: "we have operated N days" and "best
record N days" (safety streak counters). These are project-wide rolling statistics —
every contractor in the samples is separately hand-tracking what should be the same
number for the same project, and small drift between contractors' copies is already
visible across the sample set. Derive both at render time from
`projects.construction_start_date` plus `daily_report_safety` history instead of
re-entering them per report.

## File naming convention

The 36 samples use five different naming patterns (Thai Buddhist-era vs. Gregorian
years, dot- vs. dash-separated dates, formal doc-control numbers vs. plain names).
Standardizing on one sortable, collision-proof pattern derived entirely from data
(no manual typing):

```
{ProjectCode}_{ContractorShortCode}_DAILY_{YYYY-MM-DD}_{ReportNo}.pdf
STSBPP_FASTSTEEL_DAILY_2026-09-05_053.pdf
```

## Export formats

- **PDF** — primary, always available. This is the direct replacement for the
  current manual output.
- **Excel** — secondary, for the History page's bulk/date-range export (one row per
  report).
- **CSV** — not a separate v1 feature. It's a strict subset of the Excel output;
  trivial to add later once the tabular export logic exists.

## UI/UX flow

**Single report.** An Export action on the report detail/history view opens a small
menu: "ดาวน์โหลด PDF" / "ดาวน์โหลด Excel". Server renders and returns the file with
the standardized name. Only `status = 'submitted'` reports are exportable — drafts
should never leave the system.

**Bulk.** The History page's planned date-range/contractor/report-type filters gain
an "Export Excel" button that returns one workbook covering all matched reports (one
row per report).

**Access control.** Exports re-check the same server-side RLS/`user_project_access`
rules already governing reads elsewhere in the app (AGENTS.md rule 6) — a
`contractor_user` can only ever export their own contractor's reports, exactly like
today's manual process already (informally) enforces via who has the template file.

## Is AI necessary?

No, not for the core feature. Populating a fixed layout from already-correct
structured database fields is a deterministic transformation — this matches
`docs/PRODUCT.md`'s own principle that AI is never the source of truth for
dashboard numbers, and adding an LLM call here would add cost, latency, and a new
failure mode for zero benefit.

The one legitimate *optional* AI use (already on the roadmap as Phase 1.1's "AI
daily summary") is a short natural-language paragraph at the top of the EPS-facing
PDF, generated from the same structured fields and clearly labeled as AI-drafted —
e.g. "Fast Steel completed 2 of 2 planned activities today, no safety incidents,
cumulative progress 93.9% vs. 100% plan (-6.06%)." It must never block export if
disabled or if generation fails, and per product principle, it never sets or implies
priority/status.

## User flow

1. Contractor user submits an End-of-Day Actual report through the existing Daily
   Report form (Phase 1). Status becomes `submitted`.
2. (Optional, ties to the open "locking" question) An EPS `site_admin` reviews and
   marks it checked — sets `checked_by_user_id` / `checked_at`.
3. From the report's detail view or Report History, the user clicks Export → PDF or
   Export → Excel.
4. Server assembles the report's full data (one query joining `daily_reports` with
   all child tables), renders it through the shared report-view template, converts
   to the requested format, and returns it as a download with the standardized
   filename.
5. **Bulk**: from History, the user sets filters → "Export Excel" → server queries
   all matching submitted reports → one workbook → download.

## Data flow

```
[Supabase: daily_reports + child tables]
        |  single parameterized query (by report id, or by filter set for bulk)
        v
[Server: Report Assembly] -- joins + shapes into one ReportPayload
        |
        +--> [PDF: shared React report-view component --(Playwright print)--> PDF buffer]
        |
        +--> [Excel: exceljs workbook builder --> XLSX buffer]
        v
[HTTP response: file download, standardized filename via Content-Disposition]
```

## Backend logic (Next.js App Router terms)

- `src/app/api/reports/[id]/export/route.ts` — single-report export,
  `?format=pdf|xlsx`.
- `src/app/api/reports/export/route.ts` — bulk export; accepts
  `project_id, contractor_id?, date_from, date_to, report_type?`; returns `.xlsx`.
- `src/lib/reports/assemble.ts` — `assembleReportPayload(supabase, reportId)`: one
  (or a few) Supabase queries joining `daily_reports` with every child table, shaped
  into a typed object that mirrors the PDF's own sections one-to-one, so the mapping
  from template to code stays obvious.
- `src/lib/reports/render-pdf.ts` — takes a `ReportPayload`, server-renders the
  shared `src/components/report-view/*` React template to HTML, prints to PDF via
  headless Chromium.
- `src/lib/reports/render-xlsx.ts` — takes a `ReportPayload` (or an array, for bulk),
  builds the workbook via exceljs.
- All export routes re-check access server-side using the same Supabase server
  client + `user_project_access` pattern already established elsewhere in the app —
  never trust a client-supplied filter alone (AGENTS.md rule 6).

## Example output shape

Illustrative field list only, not implementation code — every field traces back to
a section that actually appears in the sample PDFs:

```
ReportPayload {
  project: { name, code }
  contractor: { name, shortCode }
  reportNumber, reportDate, reportType, timeStart, timeFinish,
  workingHours, overtimeHours
  weather: { temperatureC, condition }
  safety: { daysSinceLastAccident, cumulativeDaysWorked, bestRecordDays, targetDays }
  progress: { cumulativePlanPct, cumulativeActualPct, todayPlanPct, todayActualPct }
  manpower: [{ roleName, targetCount, todayCount }]
  materialsReceived: [{ description, quantity, unit }]
  workPermits: [{ permitType, isActive, count, workers, remarks }]
  activitiesToday: [{ item, description, planPct, actualPct, supervisor, jsaRef, status }]
  activitiesTomorrow: [{ item, description, area }]
  countermeasureNote
  machinery: [{ type, quantity }]
  attachments: [{ url, caption, kind: "progress_photo" | "safety_photo" | "site_layout" }]
  preparedBy: { name, signedAt }
  checkedBy: { name, signedAt } | null
}
```

## Recommended improvements beyond literal replication

- Standardize contractor short codes as real data (`contractors.short_code`)
  instead of the ad hoc names currently baked into filenames — fixes the
  inconsistent-naming problem at its source rather than working around it.
- Auto-number `reportNumber` server-side instead of contractor-typed — removes a
  visible transcription-error class (blank report numbers in the sample set).
- Compute the two project-wide safety streak counters from history instead of
  having every contractor separately hand-track "the same" number — removes a
  cross-contractor drift risk visible across the 36 samples.

## Open questions carried over (not answered here)

- Whether contractors can edit a submitted report, or it locks after submission —
  directly affects whether `checked_by`/`checked_at` is meaningful as a hard gate.
- Photo retention policy — affects how long exported PDFs remain regenerable with
  the same attachments.
- Final required Daily Report fields — this spec assumes the sample PDFs are
  representative of the final field set; confirm before implementing.
