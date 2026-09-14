# Spreadsheet-Style Workforce/Activities Entry — Design Spec

## Why

The project owner reported the Daily Report form is hard to use, specifically citing having to scroll and click through many separate boxes to enter workforce and activity rows. They asked for something "easy like Excel."

To ground the redesign in real practice rather than guesswork, we researched 11 representative real Daily Report PDFs submitted by actual subcontractors on this project (sampled across 10 distinct contractor formats, from `C:\Users\Moji\OneDrive\STS\Daily Report`). The finding: every single one of these reports is built on the same official EPS bilingual template, exported from Excel as one dense page — single-screen, no tabs, all fields visible at once. The owner's "Excel-like" request matches the real standard these contractors already work in, not a stylistic preference.

That research also surfaced a second, separable finding: 6 of 11 contractors annotate a shared site-plan drawing with colored callout boxes marking where each day's photos were taken (matching the example image the owner showed). This is real and common practice, but it's a distinct feature — a new capability (a shared, reusable, annotatable site-plan asset) rather than a UX reshape of existing fields — and is explicitly **out of scope** for this spec. It will be designed and built as its own follow-up project.

## Scope

**In scope:** reshape the existing Workforce and Activities sections of the Daily Report form from stacked bordered cards (one `<fieldset>` per row, each with full `<Field>` label/hint chrome) into compact, table-based entry — closer to a spreadsheet, without adopting full spreadsheet mechanics (no copy-paste-from-Excel, no cell drag-fill, no multi-cell selection).

**Out of scope (this spec):**
- Any new data fields (weather, 8-category fixed manpower trades, material receive log, JSA column, equipment checklist, work-permit checklist). The real template has these; our schema doesn't. Adding them is separate, scoped work — this spec only reshapes the fields that already exist (`role`/`male`/`female` for workforce; `area`/`description`/`progress`/`status`/`supervisor` for activities).
- The site-plan photo-location annotation feature described above.
- The Safety section (a single free-text textarea today) — the reported pain point is specifically the repeated-row pattern in Workforce/Activities; Safety has no rows to compress.
- Any change to `onSubmit`, validation logic, or the database schema. This is a rendering-layer-only change.

## Design

### Approach

A native HTML `<table>` with inline-editable cells, following the table convention already established in `src/app/admin/page.tsx` (`overflow-x-auto` wrapper, `bg-surface2` header row with `<th>` column labels, `divide-y divide-line` body rows). This was chosen over two alternatives:

- **A spreadsheet grid library** (e.g. react-data-grid) — rejected. It would add a new dependency with its own theming to fight, and grid libraries are generally poor on mobile/touch, which is a real risk for a tool built around DESIGN.md's "Site Foreman's Clipboard" persona (used on-site, plausibly on a phone, by someone wearing gloves).
- **Compact rows without table/keyboard-nav semantics** (visually denser but mechanically identical to today's per-row model) — rejected as a smaller win; a real `<table>` gets natural tab-order navigation across cells essentially for free and better matches "Excel-like" without extra engineering cost.

### Workforce table

Columns: ตำแหน่ง/หน้าที่ (Role), ชาย (Male), หญิง (Female), and a trailing icon-only remove-row column. The live crew-total summary (`totals.crew`/`male`/`female`) stays exactly where it is today, above the table.

Each `<td>` holds the existing `TextInput` component, unwrapped from `<Field>` (no per-cell label/hint — the `<th>` header row carries that now), keeping its `aria-label` for accessibility and its existing 44px min-height so touch targets don't shrink. The "+ เพิ่มตำแหน่งงาน" add-row button stays below the table, unchanged. The remove button becomes an icon-only ghost button (lucide `X`) instead of the text "ลบ" button, to reclaim column width.

### Activities table

Columns: พื้นที่ทำงาน (Area), รายละเอียดงาน (Description), ผู้ควบคุมงาน (Supervisor), the progress-% column (labeled dynamically same as today — "ความก้าวหน้าที่วางแผนไว้" for morning_plan / "ความก้าวหน้าที่ทำได้จริง" for end_of_day_actual), สถานะ (Status), and the trailing remove-row column.

The Description column keeps a `TextArea` (not a single-line input) since real activity descriptions are genuine free text ("ระบุงานที่ทำหรือที่วางแผนไว้ ให้ชัดเจนพอที่ทีมงานรอบถัดไปจะตรวจสอบได้") — sized to a compact `rows={2}` inside the cell rather than the current larger default height, to keep the row dense. Status stays a `<Select>`. The "+ เพิ่มกิจกรรม" add-row button stays below the table, unchanged.

### What does not change

- `WorkforceRow`, `ActivityRow` interfaces and all state (`workforce`, `activities`, `updateWorkforce`, `updateActivity`, `toCount`, `validate`, `onReview`, `onSubmit`) — identical.
- The top-of-form error banner (`id="report-errors"`, scroll-into-view, Thai per-row messages) — unchanged; this remains the mechanism for surfacing validation errors. Per-cell inline error highlighting is not part of this pass (can be added later if it turns out to matter — YAGNI for now).
- The report-type tab toggle, meta section (date/type), Safety section, Photos section, and the review/submit flow at the bottom — untouched.

### Testing

No unit tests exist today for `report-form.tsx` (it's covered by manual/Playwright end-to-end verification instead, as done for Task 7 of the prior plan). Since this change touches only rendering — not the `validate`/`onSubmit` logic already proven end-to-end — the implementation plan will include a manual re-verification step: fill multiple workforce and activity rows via the new table UI, submit, and confirm the resulting database rows and PDF/Excel exports are identical to what the old card-based UI produced. No new automated tests are required by this spec, since there is no new logic to cover.

## Open questions

None carried into this spec — the two scope-narrowing decisions (defer the site-plan feature; reshape existing fields only, no new fields) were made explicitly with the project owner during brainstorming and are reflected above, not left open.
