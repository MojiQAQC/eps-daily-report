# Daily Report Checklist Fields — Design Spec

## Why

The real contractor Daily Report PDFs researched for the spreadsheet-entry redesign (see `docs/superpowers/specs/2026-09-14-spreadsheet-style-entry-design.md`) capture several fields our schema and form don't yet surface: a work-permit checklist, an equipment checklist, safety talk topics, cumulative plan-vs-actual progress percentages, a JSA (Job Safety Analysis) flag on activities, and a material-receive log.

Digging into the actual schema before designing turned up that most of this already exists, dormant, from the original Phase 1 design (`supabase/migrations/0001_core_schema.sql`):

- `daily_report_permits` (`permit_type`, `count`, `workers`, `remarks`) — the work-permit checklist table, unused since creation.
- `daily_report_machinery` (`machinery_type`, `quantity`) — the equipment checklist table, unused since creation.
- `daily_report_safety_topics` (`topic`) — safety talk topics, unused since creation.
- `daily_reports.cumulative_plan_pct` / `cumulative_actual_pct` — already columns, already in the `DailyReport` TS type, never surfaced in the form or exports.

None of these three tables have RLS insert/select policies (they were enabled with zero policies in migration 0001, same "lock down now, add policies later" pattern later resolved for workforce/activities/safety/attachments in migration 0003), have no TS types, and are never queried by `assembleReportPayload`. This spec's job is mostly "finish wiring up dormant schema," not "build new schema" — a materially lower-risk shape than the original PDF-research field list suggested.

## Explicitly out of scope (decided during brainstorming, not oversights)

- **Manpower trade categorization.** The real template uses 8 fixed trade categories (โยธา/เครื่องกล/ไฟฟ้า/...); `docs/DATA_MODEL.md` documents `daily_report_workforce.role_name` as deliberately free-text/extensible ("role is data, not a column, so roles are extensible") to support EPS's ~23 projects with potentially different trade vocabularies. Converting to a fixed enum would reverse a documented architecture decision. Dropped from scope entirely.
- **Weather.** `docs/PRODUCT.md`'s phase roadmap assigns "Weather API" to Phase 2 ("Don't build later phases early"), and the schema's `weather_*` columns on `daily_reports` are commented as "TBD when Weather API lands" — designed for API auto-fill, not manual entry. Building manual weather entry now risks throwaway work Phase 2 replaces. Dropped from scope entirely.

## Scope

**In scope**, six additions to the Daily Report form and its exports:

1. **Work-permit checklist** — a fixed list of permit types (from the real template: Hotwork, Work at Height, Lifting, LOTO, Confine space, energized-equipment work, Other), each with a count and a worker count.
2. **Equipment checklist** — a fixed list of machinery types (from the real template: Welding machine, Hand tool Equipment, Crane, Hieb/Hiab, Trailer/Truck, Tractor/Backhoe/Grader, Compactor, Forklift, Excavator, Concrete Pump Truck), each with a quantity.
3. **Safety talk topics** — a free-text, add-a-row list (unlike permits/equipment, these are open-ended — "many per report," no fixed vocabulary).
4. **Cumulative progress** — two numeric fields (plan % and actual %) using the existing `cumulative_plan_pct`/`cumulative_actual_pct` columns, added to the report meta section.
5. **JSA flag on Activities** — one new boolean column (`jsa`) on `daily_report_activities`, surfaced as a checkbox in the existing Activities table.
6. **Material receive log** — a new small table (what material, quantity, unit, date received, remarks), presented as an add-a-row table matching the Workforce/Activities convention.

**Out of scope:** manpower categorization and weather (see above), and anything not explicitly listed in the six items above (no new photo categories, no changes to the report-type tabs, no changes to submission/validation logic beyond what's needed to persist these new fields).

## Design

### Schema

One new migration, `0005_report_checklist_fields.sql`:

- RLS insert/select policies for `daily_report_permits`, `daily_report_machinery`, `daily_report_safety_topics` — following the exact same shape as the policies migration 0003 added for `daily_report_workforce`/`daily_report_activities`/`daily_report_safety` (insert keyed on the parent `daily_reports.created_by = auth.uid()` plus the role/contractor check; select keyed on the same own-report visibility plus the existing head_office_admin/`user_project_access` pattern).
- `alter table daily_report_activities add column jsa boolean not null default false;`
- A new `daily_report_material_receive` table: `id uuid primary key default gen_random_uuid()`, `daily_report_id uuid not null references daily_reports(id) on delete cascade`, `material_name text not null`, `quantity numeric`, `unit text`, `received_date date`, `remarks text` — plus RLS enable + insert/select policies matching the same pattern.

**No migration needed** for `cumulative_plan_pct`/`cumulative_actual_pct` — those columns and their RLS coverage already exist (they're plain columns on `daily_reports`, covered by that table's existing insert/select policies from migration 0003).

### Types (`src/types/index.ts`)

New interfaces: `DailyReportPermit`, `DailyReportMachinery`, `DailyReportSafetyTopic`, `DailyReportMaterialReceipt` — field names matching their tables exactly. `DailyReportActivity` gains `jsa: boolean`. `ReportPayload` gains `permits: DailyReportPermit[]`, `machinery: DailyReportMachinery[]`, `safetyTopics: DailyReportSafetyTopic[]`, `materialReceive: DailyReportMaterialReceipt[]`. `DailyReport`'s existing `cumulative_plan_pct`/`cumulative_actual_pct` fields are unchanged (already present).

### Assembly (`src/lib/reports/assemble.ts`)

`assembleReportPayload` gains four more fetches (permits, machinery, safety_topics, material_receive) added to the existing `Promise.all([...])` batch, following the exact same `.select("*").eq("daily_report_id", reportId)` pattern already used for workforce/activities/safety/attachments.

### Rendering (`ReportView.tsx`, `render-pdf.ts`, `render-xlsx.ts`)

Four new sections in `ReportView.tsx`, inserted after Safety and before the Photos sections (matching the real template's field order: safety-adjacent content clusters together, photos stay last):
- **Work Permits** — a small table (permit type, count, workers, remarks), shown only when `payload.permits.length > 0`.
- **Equipment** — a small table (machinery type, quantity), shown only when `payload.machinery.length > 0`.
- **Safety Topics** — a bulleted list, shown only when `payload.safetyTopics.length > 0`.
- **Material Receive** — a small table (material, quantity, unit, date, remarks), shown only when `payload.materialReceive.length > 0`.

Cumulative progress (plan %/actual %) is not a new section — it's added to the existing report-metadata header area of `ReportView.tsx` (alongside the existing project/contractor/date/report-type header fields), matching where the real template places it.

The JSA flag adds one column to the existing Activities table/section in `ReportView.tsx` (a checkmark or "Yes"/blank), not a new section.

`render-pdf.ts`'s hand-mirrored stylesheet gains whatever new utility classes these sections' markup introduces (to be enumerated exactly in the implementation plan, following the same "enumerate every class actually used" discipline as the photo-grid fix from the prior plan's final review).

`render-xlsx.ts` gains four new sheet sections (Work Permits, Equipment, Safety Topics, Material Receive), following the same "No data" fallback pattern already used for Safety and Photos, plus the cumulative plan/actual % values added to the existing header rows, plus a JSA column added to the existing Activities rows.

### Form (`report-form.tsx`)

- **Cumulative progress**: two numeric `TextInput` fields in the existing meta `<section>`, alongside the report-date/report-type fields.
- **Work Permits**: a fixed table — one row per permit type from the vocabulary above (not add/remove-able, since the categories are a known fixed set), each row with count and workers number inputs plus a remarks text input. Unlike Workforce/Activities, there is no "+ add row" button — all rows exist from the start, and an empty row (count and workers both blank) is simply not submitted.
- **Equipment**: same fixed-table pattern, one row per machinery type from the vocabulary above, each with a quantity number input.
- **Safety Topics**: a free-text add-a-row list (single text input per row, "+ add topic" button, remove button per row) — matching the Workforce/Activities add-a-row convention, not the fixed-checklist pattern, since topics are open-ended.
- **Material Receive**: an add-a-row table (material name, quantity, unit, received date, remarks) — matching the Workforce/Activities table convention from the prior plan, including its fixed-vs-free-text lesson (material names are free text, so this follows the add-a-row pattern, not the fixed-checklist one).
- **JSA**: one checkbox column added to the existing Activities table.
- `onSubmit` gains insert calls for permits, machinery, safety topics, and material-receive rows (only for rows with actual data, same "filter out empty rows before inserting" pattern already used for workforce/activities), and includes `cumulative_plan_pct`/`cumulative_actual_pct` in the existing `daily_reports` insert payload.

### Testing

Following the established pattern: no new Vitest unit tests for the form itself (rendering + wiring, not new logic beyond the empty-row-filtering already used elsewhere), but `assemble.test.ts` and `render-xlsx.test.ts` need their sample `ReportPayload` fixtures extended with the four new array fields (matching how `attachments: []` was added when that field became required in the prior plan) — these are simple, mechanical fixture updates, not new test cases. `render-pdf.test.ts` needs the same fixture update. End-to-end manual/Playwright verification (submit a report exercising all six new fields, confirm the detail page, PDF, and Excel exports all render them) closes out the implementation plan, matching the pattern used for both prior plans on this branch.

## Open questions

None carried into this spec — the two scope-narrowing decisions (drop manpower categorization; drop weather) were made explicitly with the project owner during brainstorming, and the cumulative-column-naming question was resolved to use the existing `cumulative_plan_pct`/`cumulative_actual_pct` columns rather than adding duplicates.
