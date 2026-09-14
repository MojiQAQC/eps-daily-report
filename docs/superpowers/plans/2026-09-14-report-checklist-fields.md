# Daily Report Checklist Fields Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add six fields the real Daily Report template captures but this app doesn't yet: work-permit checklist, equipment checklist, safety talk topics, cumulative progress %, a JSA flag on activities, and a material receive log.

**Architecture:** Mostly wiring up schema that already exists dormant (`daily_report_permits`, `daily_report_machinery`, `daily_report_safety_topics` tables from migration 0001 have zero RLS policies and are never queried; `daily_reports.cumulative_plan_pct`/`cumulative_actual_pct` are already columns, never surfaced in the form). One new migration adds RLS policies for the three dormant tables, a `jsa` column on `daily_report_activities`, and a new `daily_report_material_receive` table. Then: types → assemble → ReportView + Excel export → form UI → form submit wiring, following the exact same layered task order used by the two prior plans on this branch.

**Tech Stack:** Next.js 14 App Router, TypeScript, Supabase (Postgres + RLS), existing `src/components/ui.tsx` primitives, exceljs.

**Spec:** docs/superpowers/specs/2026-09-14-report-checklist-fields-design.md

## Global Constraints

- No new Tailwind colors outside the existing OKLCH design tokens (`bg-surface2`, `border-line`, `text-muted`, `text-ink`, etc.) — see `DESIGN.md`.
- Preserve 44px minimum touch targets on every button/text input (existing `TextInput`/`Select`/`Button` components already enforce this) — the one exception is the native `<input type="checkbox">` for the JSA flag, which follows ordinary native-checkbox sizing, not the button/input touch-target rule.
- RLS policies for the three dormant tables and the new `daily_report_material_receive` table must match the exact two-tier shape already established: a broad SELECT policy (head_office_admin / `user_project_access`, from `0002_export_support.sql`'s pattern) plus an own-report SELECT policy (`created_by = auth.uid()`, from `0003_daily_report_save_and_photos.sql`'s pattern) plus an INSERT policy (same own-report check). Copy the exact SQL shape from those migrations — do not invent a different policy structure.
- Permits and Equipment are **fixed checklists** (a known, bounded category list with no add/remove — see the spec's rationale) — do not give them "+ add row" buttons like Workforce/Activities/Material Receive/Safety Topics, which are genuinely open-ended.
- `ReportPayload`'s four new array fields (`permits`, `machinery`, `safetyTopics`, `materialReceive`) are **required**, not optional — matching the existing convention for `workforce`/`activities`/`attachments`. Every file that constructs a `ReportPayload` literal must supply them.
- `DailyReportActivity.jsa` is a required `boolean` (the DB column is `not null default false`) — not optional.
- No new Vitest unit tests for `report-form.tsx` itself (rendering/wiring, not new logic) — Task 7 closes with manual/Playwright end-to-end verification instead, matching the established pattern on this branch. `assemble.ts` and `render-xlsx.ts` DO get real new-logic coverage (see their tasks) since they contain genuine new logic (new fetches, new conditional rendering), not just JSX.

---

### Task 1: Migration — RLS policies, JSA column, material receive table

**Files:**
- Create: `supabase/migrations/0005_report_checklist_fields.sql`

**Interfaces:**
- Consumes: nothing from earlier tasks (first task).
- Produces: `daily_report_activities.jsa` column; `daily_report_material_receive` table (`id`, `daily_report_id`, `material_name`, `quantity`, `unit`, `received_date`, `remarks`); RLS insert/select policies on `daily_report_permits`, `daily_report_machinery`, `daily_report_safety_topics`, `daily_report_material_receive`. Task 2's types and every later task's RLS-dependent behavior consume this.

- [ ] **Step 1: Write the migration**

```sql
-- supabase/migrations/0005_report_checklist_fields.sql
-- Daily Report checklist fields: work permits, equipment, safety topics,
-- material receive log, and a JSA flag on activities.
-- See docs/superpowers/specs/2026-09-14-report-checklist-fields-design.md

-- ==========================================================
-- JSA flag on activities (one new column).
-- ==========================================================

alter table daily_report_activities
  add column jsa boolean not null default false;

-- ==========================================================
-- Material receive log (new table).
-- ==========================================================

create table daily_report_material_receive (
  id uuid primary key default gen_random_uuid(),
  daily_report_id uuid not null references daily_reports(id) on delete cascade,
  material_name text not null,
  quantity numeric,
  unit text,
  received_date date,
  remarks text
);

alter table daily_report_material_receive enable row level security;

-- ==========================================================
-- daily_report_permits, daily_report_machinery, and daily_report_safety_topics
-- were created in 0001_core_schema.sql with RLS enabled and zero policies
-- (deny-all). This migration gives them the same two-tier SELECT policy shape
-- established for workforce/activities/safety (broad head_office_admin/
-- user_project_access visibility from 0002_export_support.sql, plus own-report
-- visibility from 0003_daily_report_save_and_photos.sql), plus the matching
-- INSERT policy from 0003. daily_report_material_receive (new in this
-- migration) gets the identical three-policy set from the start.
-- ==========================================================

-- --- INSERT policies ---

create policy daily_report_permits_insert on daily_report_permits for insert
  with check (
    exists (
      select 1 from daily_reports dr
      where dr.id = daily_report_permits.daily_report_id
        and dr.created_by = auth.uid()
    )
  );

create policy daily_report_machinery_insert on daily_report_machinery for insert
  with check (
    exists (
      select 1 from daily_reports dr
      where dr.id = daily_report_machinery.daily_report_id
        and dr.created_by = auth.uid()
    )
  );

create policy daily_report_safety_topics_insert on daily_report_safety_topics for insert
  with check (
    exists (
      select 1 from daily_reports dr
      where dr.id = daily_report_safety_topics.daily_report_id
        and dr.created_by = auth.uid()
    )
  );

create policy daily_report_material_receive_insert on daily_report_material_receive for insert
  with check (
    exists (
      select 1 from daily_reports dr
      where dr.id = daily_report_material_receive.daily_report_id
        and dr.created_by = auth.uid()
    )
  );

-- --- Broad SELECT policies (head_office_admin / user_project_access) ---

create policy daily_report_permits_select on daily_report_permits for select
  using (
    exists (
      select 1 from daily_reports dr
      where dr.id = daily_report_permits.daily_report_id
        and (
          exists (select 1 from profiles p where p.id = auth.uid() and p.role = 'head_office_admin')
          or exists (
            select 1 from user_project_access upa
            where upa.user_id = auth.uid()
              and upa.project_id = dr.project_id
              and (upa.contractor_id is null or upa.contractor_id = dr.contractor_id)
              and (upa.discipline_id is null or upa.discipline_id = dr.discipline_id)
          )
        )
    )
  );

create policy daily_report_machinery_select on daily_report_machinery for select
  using (
    exists (
      select 1 from daily_reports dr
      where dr.id = daily_report_machinery.daily_report_id
        and (
          exists (select 1 from profiles p where p.id = auth.uid() and p.role = 'head_office_admin')
          or exists (
            select 1 from user_project_access upa
            where upa.user_id = auth.uid()
              and upa.project_id = dr.project_id
              and (upa.contractor_id is null or upa.contractor_id = dr.contractor_id)
              and (upa.discipline_id is null or upa.discipline_id = dr.discipline_id)
          )
        )
    )
  );

create policy daily_report_safety_topics_select on daily_report_safety_topics for select
  using (
    exists (
      select 1 from daily_reports dr
      where dr.id = daily_report_safety_topics.daily_report_id
        and (
          exists (select 1 from profiles p where p.id = auth.uid() and p.role = 'head_office_admin')
          or exists (
            select 1 from user_project_access upa
            where upa.user_id = auth.uid()
              and upa.project_id = dr.project_id
              and (upa.contractor_id is null or upa.contractor_id = dr.contractor_id)
              and (upa.discipline_id is null or upa.discipline_id = dr.discipline_id)
          )
        )
    )
  );

create policy daily_report_material_receive_select on daily_report_material_receive for select
  using (
    exists (
      select 1 from daily_reports dr
      where dr.id = daily_report_material_receive.daily_report_id
        and (
          exists (select 1 from profiles p where p.id = auth.uid() and p.role = 'head_office_admin')
          or exists (
            select 1 from user_project_access upa
            where upa.user_id = auth.uid()
              and upa.project_id = dr.project_id
              and (upa.contractor_id is null or upa.contractor_id = dr.contractor_id)
              and (upa.discipline_id is null or upa.discipline_id = dr.discipline_id)
          )
        )
    )
  );

-- --- Own-report SELECT policies (additional permissive, OR'd with the above) ---

create policy daily_report_permits_select_own on daily_report_permits for select
  using (
    exists (
      select 1 from daily_reports dr
      where dr.id = daily_report_permits.daily_report_id
        and dr.created_by = auth.uid()
    )
  );

create policy daily_report_machinery_select_own on daily_report_machinery for select
  using (
    exists (
      select 1 from daily_reports dr
      where dr.id = daily_report_machinery.daily_report_id
        and dr.created_by = auth.uid()
    )
  );

create policy daily_report_safety_topics_select_own on daily_report_safety_topics for select
  using (
    exists (
      select 1 from daily_reports dr
      where dr.id = daily_report_safety_topics.daily_report_id
        and dr.created_by = auth.uid()
    )
  );

create policy daily_report_material_receive_select_own on daily_report_material_receive for select
  using (
    exists (
      select 1 from daily_reports dr
      where dr.id = daily_report_material_receive.daily_report_id
        and dr.created_by = auth.uid()
    )
  );
```

- [ ] **Step 2: Validate the SQL locally**

Run: `cat supabase/migrations/0005_report_checklist_fields.sql | grep -c "create policy"` — expected output: `12` (4 tables × [1 insert + 1 broad select + 1 own select] = 12 policies total). This is a sanity count, not a functional test. If your count differs from 12, re-read the file for a missed or duplicated policy block before continuing.

Do **not** run `supabase db push` yet — the controller applies this migration to the live database after this task is reviewed, the same way it did for prior migrations on this branch.

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/0005_report_checklist_fields.sql
git commit -m "Add RLS policies for permits/machinery/safety topics, jsa column, material receive table"
```

---

### Task 2: Types

**Files:**
- Modify: `src/types/index.ts`
- Modify: `src/lib/reports/render-pdf.test.ts`
- Modify: `src/lib/reports/render-xlsx.test.ts`
- Modify: `src/app/api/reports/[id]/export/filename.test.ts`

**Interfaces:**
- Consumes: nothing from Task 1 directly (types are independent of the live migration being applied — this task can proceed in parallel with the controller applying Task 1's migration).
- Produces: `DailyReportPermit`, `DailyReportMachinery`, `DailyReportSafetyTopic`, `DailyReportMaterialReceipt` interfaces; `DailyReportActivity.jsa: boolean`; `ReportPayload.permits`/`machinery`/`safetyTopics`/`materialReceive` (all required arrays). Task 3 (assemble.ts) and Task 4/5 (rendering) depend on these exact field names and shapes.

- [ ] **Step 1: Add the new interfaces and extend existing ones**

In `src/types/index.ts`, find this exact block:

```ts
export interface DailyReportActivity {
  id: string;
  daily_report_id: string;
  area?: string | null;
  description: string;
  planned_progress?: number | null;
  actual_progress?: number | null;
  status?: WorkStatus | null;
  supervisor?: string | null;
  remarks?: string | null;
}

export interface DailyReportSafety {
  daily_report_id: string;
  accident_status?: string | null;
  accident_free_days?: number | null;
  remarks?: string | null;
}

export interface DailyReportAttachment {
  id: string;
  daily_report_id: string;
  kind: 'progress_photo' | 'safety_photo';
  storage_path: string;
  url?: string | null;
}

export interface ReportPayload {
  report: DailyReport;
  projectName: string;
  projectCode: string | null;
  contractorName: string;
  contractorShortCode: string | null;
  workforce: DailyReportWorkforce[];
  activities: DailyReportActivity[];
  safety: DailyReportSafety | null;
  attachments: DailyReportAttachment[];
}
```

Replace it verbatim with:

```ts
export interface DailyReportActivity {
  id: string;
  daily_report_id: string;
  area?: string | null;
  description: string;
  planned_progress?: number | null;
  actual_progress?: number | null;
  status?: WorkStatus | null;
  supervisor?: string | null;
  remarks?: string | null;
  jsa: boolean;
}

export interface DailyReportSafety {
  daily_report_id: string;
  accident_status?: string | null;
  accident_free_days?: number | null;
  remarks?: string | null;
}

export interface DailyReportAttachment {
  id: string;
  daily_report_id: string;
  kind: 'progress_photo' | 'safety_photo';
  storage_path: string;
  url?: string | null;
}

export interface DailyReportPermit {
  id: string;
  daily_report_id: string;
  permit_type: string;
  count?: number | null;
  workers?: number | null;
  remarks?: string | null;
}

export interface DailyReportMachinery {
  id: string;
  daily_report_id: string;
  machinery_type: string;
  quantity: number;
}

export interface DailyReportSafetyTopic {
  id: string;
  daily_report_id: string;
  topic: string;
}

export interface DailyReportMaterialReceipt {
  id: string;
  daily_report_id: string;
  material_name: string;
  quantity?: number | null;
  unit?: string | null;
  received_date?: string | null;
  remarks?: string | null;
}

export interface ReportPayload {
  report: DailyReport;
  projectName: string;
  projectCode: string | null;
  contractorName: string;
  contractorShortCode: string | null;
  workforce: DailyReportWorkforce[];
  activities: DailyReportActivity[];
  safety: DailyReportSafety | null;
  attachments: DailyReportAttachment[];
  permits: DailyReportPermit[];
  machinery: DailyReportMachinery[];
  safetyTopics: DailyReportSafetyTopic[];
  materialReceive: DailyReportMaterialReceipt[];
}
```

- [ ] **Step 2: Run the TypeScript compiler to see the fixture breakage**

```bash
npx tsc --noEmit
```

Expected: errors in `render-pdf.test.ts`, `render-xlsx.test.ts`, and `filename.test.ts` — each constructs a `ReportPayload` literal missing the four new required array fields, and `render-pdf.test.ts`/`render-xlsx.test.ts` also construct a `DailyReportActivity` literal missing `jsa`. This is expected; the next three steps fix them.

- [ ] **Step 3: Fix `render-pdf.test.ts`'s fixture**

Find this exact block:

```ts
const samplePayload: ReportPayload = {
  report: {
    id: "r1", project_id: "p1", contractor_id: "c1", report_date: "2026-09-04",
    report_type: "end_of_day_actual", status: "submitted", created_at: "2026-09-04T10:00:00Z",
  },
  projectName: "STS-9.9 MW Biomass Power Plant",
  projectCode: "STSBPP",
  contractorName: "RETS",
  contractorShortCode: "RETS",
  workforce: [{ id: "w1", daily_report_id: "r1", role_name: "รวมกำลังคนวันนี้", male_count: 15, female_count: 0 }],
  activities: [
    { id: "a1", daily_report_id: "r1", area: "Stack", description: "งานเชื่อม", planned_progress: 20, actual_progress: 20 },
  ],
  safety: { daily_report_id: "r1", accident_status: "ไม่มีอุบัติเหตุ" },
  attachments: [],
};
```

Replace it verbatim with:

```ts
const samplePayload: ReportPayload = {
  report: {
    id: "r1", project_id: "p1", contractor_id: "c1", report_date: "2026-09-04",
    report_type: "end_of_day_actual", status: "submitted", created_at: "2026-09-04T10:00:00Z",
  },
  projectName: "STS-9.9 MW Biomass Power Plant",
  projectCode: "STSBPP",
  contractorName: "RETS",
  contractorShortCode: "RETS",
  workforce: [{ id: "w1", daily_report_id: "r1", role_name: "รวมกำลังคนวันนี้", male_count: 15, female_count: 0 }],
  activities: [
    { id: "a1", daily_report_id: "r1", area: "Stack", description: "งานเชื่อม", planned_progress: 20, actual_progress: 20, jsa: true },
  ],
  safety: { daily_report_id: "r1", accident_status: "ไม่มีอุบัติเหตุ" },
  attachments: [],
  permits: [{ id: "pm1", daily_report_id: "r1", permit_type: "Hot Work", count: 2, workers: 4, remarks: null }],
  machinery: [{ id: "mc1", daily_report_id: "r1", machinery_type: "Crane", quantity: 1 }],
  safetyTopics: [{ id: "st1", daily_report_id: "r1", topic: "ตรวจสอบสายรัดนิรภัย" }],
  materialReceive: [{ id: "mr1", daily_report_id: "r1", material_name: "เหล็กเส้น", quantity: 500, unit: "kg", received_date: "2026-09-04", remarks: null }],
};
```

- [ ] **Step 4: Fix `render-xlsx.test.ts`'s fixture**

Find this exact block:

```ts
const samplePayload: ReportPayload = {
  report: {
    id: "r1", project_id: "p1", contractor_id: "c1", report_date: "2026-09-04",
    report_type: "end_of_day_actual", status: "submitted", created_at: "2026-09-04T10:00:00Z",
  },
  projectName: "STS-9.9 MW Biomass Power Plant",
  projectCode: "STSBPP",
  contractorName: "RETS",
  contractorShortCode: "RETS",
  workforce: [{ id: "w1", daily_report_id: "r1", role_name: "รวมกำลังคนวันนี้", male_count: 15, female_count: 0 }],
  activities: [
    { id: "a1", daily_report_id: "r1", area: "Stack", description: "งานเชื่อม", planned_progress: 20, actual_progress: 20 },
  ],
  safety: { daily_report_id: "r1", accident_status: "ไม่มีอุบัติเหตุ" },
  attachments: [
    { id: "att1", daily_report_id: "r1", kind: "progress_photo", storage_path: "r1/progress_photo/1-crane.jpg", url: null },
    { id: "att2", daily_report_id: "r1", kind: "safety_photo", storage_path: "r1/safety_photo/1-ppe-check.jpg", url: null },
  ],
};
```

Replace it verbatim with:

```ts
const samplePayload: ReportPayload = {
  report: {
    id: "r1", project_id: "p1", contractor_id: "c1", report_date: "2026-09-04",
    report_type: "end_of_day_actual", status: "submitted", created_at: "2026-09-04T10:00:00Z",
  },
  projectName: "STS-9.9 MW Biomass Power Plant",
  projectCode: "STSBPP",
  contractorName: "RETS",
  contractorShortCode: "RETS",
  workforce: [{ id: "w1", daily_report_id: "r1", role_name: "รวมกำลังคนวันนี้", male_count: 15, female_count: 0 }],
  activities: [
    { id: "a1", daily_report_id: "r1", area: "Stack", description: "งานเชื่อม", planned_progress: 20, actual_progress: 20, jsa: true },
  ],
  safety: { daily_report_id: "r1", accident_status: "ไม่มีอุบัติเหตุ" },
  attachments: [
    { id: "att1", daily_report_id: "r1", kind: "progress_photo", storage_path: "r1/progress_photo/1-crane.jpg", url: null },
    { id: "att2", daily_report_id: "r1", kind: "safety_photo", storage_path: "r1/safety_photo/1-ppe-check.jpg", url: null },
  ],
  permits: [{ id: "pm1", daily_report_id: "r1", permit_type: "Hot Work", count: 2, workers: 4, remarks: null }],
  machinery: [{ id: "mc1", daily_report_id: "r1", machinery_type: "Crane", quantity: 1 }],
  safetyTopics: [{ id: "st1", daily_report_id: "r1", topic: "ตรวจสอบสายรัดนิรภัย" }],
  materialReceive: [{ id: "mr1", daily_report_id: "r1", material_name: "เหล็กเส้น", quantity: 500, unit: "kg", received_date: "2026-09-04", remarks: null }],
};
```

- [ ] **Step 5: Fix `filename.test.ts`'s `makePayload` helper**

Find this exact block:

```ts
function makePayload(overrides: Partial<ReportPayload> = {}): ReportPayload {
  return {
    report: {
      id: "r1",
      project_id: "p1",
      contractor_id: "c1",
      report_date: "2026-09-04",
      report_type: "end_of_day_actual",
      status: "submitted",
      created_at: "2026-09-04T10:00:00Z",
      report_number: "0042",
    },
    projectName: "STS-9.9 MW Biomass Power Plant",
    projectCode: "STSBPP",
    contractorName: "RETS",
    contractorShortCode: "RETS",
    workforce: [],
    activities: [],
    safety: null,
    attachments: [],
    ...overrides,
  };
}
```

Replace it verbatim with:

```ts
function makePayload(overrides: Partial<ReportPayload> = {}): ReportPayload {
  return {
    report: {
      id: "r1",
      project_id: "p1",
      contractor_id: "c1",
      report_date: "2026-09-04",
      report_type: "end_of_day_actual",
      status: "submitted",
      created_at: "2026-09-04T10:00:00Z",
      report_number: "0042",
    },
    projectName: "STS-9.9 MW Biomass Power Plant",
    projectCode: "STSBPP",
    contractorName: "RETS",
    contractorShortCode: "RETS",
    workforce: [],
    activities: [],
    safety: null,
    attachments: [],
    permits: [],
    machinery: [],
    safetyTopics: [],
    materialReceive: [],
    ...overrides,
  };
}
```

- [ ] **Step 6: Run the TypeScript compiler and the test suite**

```bash
npx tsc --noEmit
npx vitest run
```

Expected: both clean. `assemble.ts` still compiles because it destructures fields off `ReportPayload` by name inside an object literal it builds itself — it does not yet reference the four new fields, so adding them to the type doesn't break it (TypeScript doesn't require an object literal assigned to a variable typed as the return type to explicitly list every field unless the whole object is directly type-annotated as `ReportPayload` at its construction site, which `assemble.ts`'s return statement is — so this step's `tsc` run will also surface an error in `assemble.ts` itself. That's expected too; Task 3 fixes it. If `assemble.ts` is the ONLY remaining error after this step, that confirms Steps 3-5 were done correctly — do not attempt to fix `assemble.ts` in this task.)

- [ ] **Step 7: Commit**

```bash
git add src/types/index.ts src/lib/reports/render-pdf.test.ts src/lib/reports/render-xlsx.test.ts "src/app/api/reports/[id]/export/filename.test.ts"
git commit -m "Add types for permits, machinery, safety topics, material receive, and JSA"
```

---

### Task 3: Assemble

**Files:**
- Modify: `src/lib/reports/assemble.ts`
- Modify: `src/lib/reports/assemble.test.ts`

**Interfaces:**
- Consumes: `DailyReportPermit`, `DailyReportMachinery`, `DailyReportSafetyTopic`, `DailyReportMaterialReceipt`, `ReportPayload.permits`/`machinery`/`safetyTopics`/`materialReceive` from Task 2.
- Produces: `assembleReportPayload` returns the four new arrays populated from the database. Task 4 (ReportView) and Task 5 (render-xlsx) consume `payload.permits`/`payload.machinery`/`payload.safetyTopics`/`payload.materialReceive`.

- [ ] **Step 1: Update `assemble.test.ts`'s stub to support the four new tables**

Find this exact block:

```ts
function makeSupabaseStub(overrides: {
  report: any;
  reportError?: any;
  project: any;
  contractor: any;
  workforce: any[];
  activities: any[];
  safety: any | null;
  attachments: any[];
}) {
  return {
    from(table: string) {
      const builder: any = {
        select: () => builder,
        eq: () => builder,
        in: () => builder,
        order: () => builder,
        single: async () => {
          if (table === "daily_reports")
            return { data: overrides.report, error: overrides.reportError ?? null };
          if (table === "projects") return { data: overrides.project, error: null };
          if (table === "contractors") return { data: overrides.contractor, error: null };
          if (table === "daily_report_safety") return { data: overrides.safety, error: null };
          throw new Error(`unexpected single() on ${table}`);
        },
        then: (resolve: any) => {
          if (table === "daily_report_workforce")
            return resolve({ data: overrides.workforce, error: null });
          if (table === "daily_report_activities")
            return resolve({ data: overrides.activities, error: null });
          if (table === "attachments")
            return resolve({ data: overrides.attachments, error: null });
          return resolve({ data: [], error: null });
        },
      };
      return builder;
    },
    storage: {
      from: () => ({
        createSignedUrl: async (path: string) => ({
          data: { signedUrl: `https://signed.example/${path}` },
          error: null,
        }),
      }),
    },
  };
}
```

Replace it verbatim with:

```ts
function makeSupabaseStub(overrides: {
  report: any;
  reportError?: any;
  project: any;
  contractor: any;
  workforce: any[];
  activities: any[];
  safety: any | null;
  attachments: any[];
  permits?: any[];
  machinery?: any[];
  safetyTopics?: any[];
  materialReceive?: any[];
}) {
  return {
    from(table: string) {
      const builder: any = {
        select: () => builder,
        eq: () => builder,
        in: () => builder,
        order: () => builder,
        single: async () => {
          if (table === "daily_reports")
            return { data: overrides.report, error: overrides.reportError ?? null };
          if (table === "projects") return { data: overrides.project, error: null };
          if (table === "contractors") return { data: overrides.contractor, error: null };
          if (table === "daily_report_safety") return { data: overrides.safety, error: null };
          throw new Error(`unexpected single() on ${table}`);
        },
        then: (resolve: any) => {
          if (table === "daily_report_workforce")
            return resolve({ data: overrides.workforce, error: null });
          if (table === "daily_report_activities")
            return resolve({ data: overrides.activities, error: null });
          if (table === "attachments")
            return resolve({ data: overrides.attachments, error: null });
          if (table === "daily_report_permits")
            return resolve({ data: overrides.permits ?? [], error: null });
          if (table === "daily_report_machinery")
            return resolve({ data: overrides.machinery ?? [], error: null });
          if (table === "daily_report_safety_topics")
            return resolve({ data: overrides.safetyTopics ?? [], error: null });
          if (table === "daily_report_material_receive")
            return resolve({ data: overrides.materialReceive ?? [], error: null });
          return resolve({ data: [], error: null });
        },
      };
      return builder;
    },
    storage: {
      from: () => ({
        createSignedUrl: async (path: string) => ({
          data: { signedUrl: `https://signed.example/${path}` },
          error: null,
        }),
      }),
    },
  };
}
```

This is additive only (new optional overrides fields, new `if` branches) — none of the four existing `describe` blocks in this file need to change, since the new fields default to `[]` when not specified.

- [ ] **Step 2: Add a new test asserting the four new fetches are joined into the payload**

Add this new `it(...)` block inside the existing `describe("assembleReportPayload", ...)` block (place it after the last existing `it(...)` block, before the closing `});` of the `describe`):

```ts
  it("joins permits, machinery, safety topics, and material receive rows", async () => {
    const supabase = makeSupabaseStub({
      report: {
        id: "r1", project_id: "p1", contractor_id: "c1", report_date: "2026-09-04",
        report_type: "end_of_day_actual", status: "submitted", created_at: "2026-09-04T10:00:00Z",
      },
      project: { name: "STS-9.9 MW Biomass Power Plant", code: "STSBPP" },
      contractor: { name: "RETS", short_code: "RETS" },
      workforce: [], activities: [], safety: null, attachments: [],
      permits: [{ id: "pm1", daily_report_id: "r1", permit_type: "Hot Work", count: 2, workers: 4 }],
      machinery: [{ id: "mc1", daily_report_id: "r1", machinery_type: "Crane", quantity: 1 }],
      safetyTopics: [{ id: "st1", daily_report_id: "r1", topic: "ตรวจสอบสายรัดนิรภัย" }],
      materialReceive: [{ id: "mr1", daily_report_id: "r1", material_name: "เหล็กเส้น", quantity: 500 }],
    });

    const payload = await assembleReportPayload(supabase as any, "r1");

    expect(payload!.permits).toHaveLength(1);
    expect(payload!.permits[0].permit_type).toBe("Hot Work");
    expect(payload!.machinery).toHaveLength(1);
    expect(payload!.machinery[0].machinery_type).toBe("Crane");
    expect(payload!.safetyTopics).toHaveLength(1);
    expect(payload!.safetyTopics[0].topic).toBe("ตรวจสอบสายรัดนิรภัย");
    expect(payload!.materialReceive).toHaveLength(1);
    expect(payload!.materialReceive[0].material_name).toBe("เหล็กเส้น");
  });
```

- [ ] **Step 3: Run the new test to verify it fails**

Run: `npx vitest run src/lib/reports/assemble.test.ts -t "joins permits, machinery, safety topics, and material receive rows"`
Expected: FAIL — `assembleReportPayload` doesn't fetch or return these fields yet, so `payload!.permits` etc. will be `undefined`, and `.toHaveLength(1)` will throw.

- [ ] **Step 4: Add the four new fetches to `assembleReportPayload`**

Find this exact block:

```ts
import type {
  DailyReport,
  DailyReportActivity,
  DailyReportAttachment,
  DailyReportSafety,
  DailyReportWorkforce,
  ReportPayload,
} from "@/types";
```

Replace it verbatim with:

```ts
import type {
  DailyReport,
  DailyReportActivity,
  DailyReportAttachment,
  DailyReportMachinery,
  DailyReportMaterialReceipt,
  DailyReportPermit,
  DailyReportSafety,
  DailyReportSafetyTopic,
  DailyReportWorkforce,
  ReportPayload,
} from "@/types";
```

Then find this exact block:

```ts
  const [
    { data: project },
    { data: contractor },
    workforceRes,
    activitiesRes,
    { data: safety },
    attachmentsRes,
  ] = await Promise.all([
    supabase.from("projects").select("name, code").eq("id", report.project_id).single(),
    supabase.from("contractors").select("name, short_code").eq("id", report.contractor_id).single(),
    supabase.from("daily_report_workforce").select("*").eq("daily_report_id", reportId),
    supabase.from("daily_report_activities").select("*").eq("daily_report_id", reportId),
    supabase.from("daily_report_safety").select("*").eq("daily_report_id", reportId).single(),
    supabase
      .from("attachments")
      .select("*")
      .eq("daily_report_id", reportId)
      .in("kind", ["progress_photo", "safety_photo"])
      .order("created_at", { ascending: true }),
  ]);
```

Replace it verbatim with:

```ts
  const [
    { data: project },
    { data: contractor },
    workforceRes,
    activitiesRes,
    { data: safety },
    attachmentsRes,
    permitsRes,
    machineryRes,
    safetyTopicsRes,
    materialReceiveRes,
  ] = await Promise.all([
    supabase.from("projects").select("name, code").eq("id", report.project_id).single(),
    supabase.from("contractors").select("name, short_code").eq("id", report.contractor_id).single(),
    supabase.from("daily_report_workforce").select("*").eq("daily_report_id", reportId),
    supabase.from("daily_report_activities").select("*").eq("daily_report_id", reportId),
    supabase.from("daily_report_safety").select("*").eq("daily_report_id", reportId).single(),
    supabase
      .from("attachments")
      .select("*")
      .eq("daily_report_id", reportId)
      .in("kind", ["progress_photo", "safety_photo"])
      .order("created_at", { ascending: true }),
    supabase.from("daily_report_permits").select("*").eq("daily_report_id", reportId),
    supabase.from("daily_report_machinery").select("*").eq("daily_report_id", reportId),
    supabase.from("daily_report_safety_topics").select("*").eq("daily_report_id", reportId),
    supabase.from("daily_report_material_receive").select("*").eq("daily_report_id", reportId),
  ]);
```

Then find this exact block:

```ts
  return {
    report: report as DailyReport,
    projectName: project?.name ?? "",
    projectCode: project?.code ?? null,
    contractorName: contractor?.name ?? "",
    contractorShortCode: contractor?.short_code ?? null,
    workforce: (workforceRes.data ?? []) as DailyReportWorkforce[],
    activities: (activitiesRes.data ?? []) as DailyReportActivity[],
    safety: (safety ?? null) as DailyReportSafety | null,
    attachments,
  };
}
```

Replace it verbatim with:

```ts
  return {
    report: report as DailyReport,
    projectName: project?.name ?? "",
    projectCode: project?.code ?? null,
    contractorName: contractor?.name ?? "",
    contractorShortCode: contractor?.short_code ?? null,
    workforce: (workforceRes.data ?? []) as DailyReportWorkforce[],
    activities: (activitiesRes.data ?? []) as DailyReportActivity[],
    safety: (safety ?? null) as DailyReportSafety | null,
    attachments,
    permits: (permitsRes.data ?? []) as DailyReportPermit[],
    machinery: (machineryRes.data ?? []) as DailyReportMachinery[],
    safetyTopics: (safetyTopicsRes.data ?? []) as DailyReportSafetyTopic[],
    materialReceive: (materialReceiveRes.data ?? []) as DailyReportMaterialReceipt[],
  };
}
```

- [ ] **Step 5: Run the test to verify it passes**

Run: `npx vitest run src/lib/reports/assemble.test.ts`
Expected: all tests PASS, including the new one from Step 2.

- [ ] **Step 6: Run the full suite and typecheck**

```bash
npx tsc --noEmit
npx vitest run
```

Expected: both clean.

- [ ] **Step 7: Commit**

```bash
git add src/lib/reports/assemble.ts src/lib/reports/assemble.test.ts
git commit -m "Fetch permits, machinery, safety topics, and material receive in assembleReportPayload"
```

---

### Task 4: ReportView

**Files:**
- Modify: `src/components/report-view/ReportView.tsx`

**Interfaces:**
- Consumes: `payload.permits`/`machinery`/`safetyTopics`/`materialReceive` (Task 3) and `activity.jsa` (Task 2).
- Produces: nothing new for later tasks — `render-pdf.ts` picks up this component's output automatically via `renderToStaticMarkup` (no separate PDF task needed, per the note below).

**Important:** every class used in the new markup below (`table`, `mt-2`, `w-full`, `text-left`, `text-sm`, `border-b`, `border-line`, `text-xs`, `text-muted`, `py-1`, `flex`, `flex-col`, `gap-1`) is already defined in `src/lib/reports/render-pdf.ts`'s inline stylesheet — confirmed by checking that file before writing this task. This task does **not** need to touch `render-pdf.ts`. If you introduce any class not in this list, you must also add it to `render-pdf.ts`'s `<style>` block (see that file's existing pattern) — but with the markup specified below, you shouldn't need to.

- [ ] **Step 1: Add the JSA column to the Activities table**

Find this exact block:

```tsx
      <section>
        <h2 className="text-base font-bold">กิจกรรมวันนี้ (Today Activities)</h2>
        {activities.length === 0 ? (
          <p className="mt-2 text-sm text-muted">ไม่มีข้อมูล</p>
        ) : (
          <table className="mt-2 w-full text-left text-sm">
            <thead>
              <tr className="border-b border-line text-xs text-muted">
                <th className="py-1">พื้นที่</th>
                <th className="py-1">รายละเอียด</th>
                <th className="py-1">แผน %</th>
                <th className="py-1">จริง %</th>
                <th className="py-1">ผู้ควบคุมงาน</th>
              </tr>
            </thead>
            <tbody>
              {activities.map((a) => (
                <tr key={a.id} className="border-b border-line align-top">
                  <td className="py-1">{a.area ?? "—"}</td>
                  <td className="py-1">{a.description}</td>
                  <td className="py-1">{fmtPct(a.planned_progress)}</td>
                  <td className="py-1">{fmtPct(a.actual_progress)}</td>
                  <td className="py-1">{a.supervisor ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
```

Replace it verbatim with:

```tsx
      <section>
        <h2 className="text-base font-bold">กิจกรรมวันนี้ (Today Activities)</h2>
        {activities.length === 0 ? (
          <p className="mt-2 text-sm text-muted">ไม่มีข้อมูล</p>
        ) : (
          <table className="mt-2 w-full text-left text-sm">
            <thead>
              <tr className="border-b border-line text-xs text-muted">
                <th className="py-1">พื้นที่</th>
                <th className="py-1">รายละเอียด</th>
                <th className="py-1">แผน %</th>
                <th className="py-1">จริง %</th>
                <th className="py-1">ผู้ควบคุมงาน</th>
                <th className="py-1">JSA</th>
              </tr>
            </thead>
            <tbody>
              {activities.map((a) => (
                <tr key={a.id} className="border-b border-line align-top">
                  <td className="py-1">{a.area ?? "—"}</td>
                  <td className="py-1">{a.description}</td>
                  <td className="py-1">{fmtPct(a.planned_progress)}</td>
                  <td className="py-1">{fmtPct(a.actual_progress)}</td>
                  <td className="py-1">{a.supervisor ?? "—"}</td>
                  <td className="py-1">{a.jsa ? "✓" : "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
```

- [ ] **Step 2: Insert four new sections after Safety, before Photos**

Find this exact block:

```tsx
      <section>
        <h2 className="text-base font-bold">ความปลอดภัย (Safety)</h2>
        {safety ? (
          <div className="mt-2 flex flex-col gap-1 text-sm">
            <Badge>{safety.accident_status ?? "—"}</Badge>
            {safety.remarks && <p className="text-muted">{safety.remarks}</p>}
          </div>
        ) : (
          <p className="mt-2 text-sm text-muted">ไม่มีข้อมูล</p>
        )}
      </section>

      {payload.attachments.some((a) => a.kind === "progress_photo" && a.url) && (
```

Replace it verbatim with:

```tsx
      <section>
        <h2 className="text-base font-bold">ความปลอดภัย (Safety)</h2>
        {safety ? (
          <div className="mt-2 flex flex-col gap-1 text-sm">
            <Badge>{safety.accident_status ?? "—"}</Badge>
            {safety.remarks && <p className="text-muted">{safety.remarks}</p>}
          </div>
        ) : (
          <p className="mt-2 text-sm text-muted">ไม่มีข้อมูล</p>
        )}
      </section>

      <section>
        <h2 className="text-base font-bold">ใบอนุญาตทำงาน (Work Permits)</h2>
        {payload.permits.length === 0 ? (
          <p className="mt-2 text-sm text-muted">ไม่มีข้อมูล</p>
        ) : (
          <table className="mt-2 w-full text-left text-sm">
            <thead>
              <tr className="border-b border-line text-xs text-muted">
                <th className="py-1">ประเภทใบอนุญาต</th>
                <th className="py-1">จำนวน</th>
                <th className="py-1">คนทำงาน</th>
                <th className="py-1">หมายเหตุ</th>
              </tr>
            </thead>
            <tbody>
              {payload.permits.map((p) => (
                <tr key={p.id} className="border-b border-line">
                  <td className="py-1">{p.permit_type}</td>
                  <td className="py-1">{p.count ?? "—"}</td>
                  <td className="py-1">{p.workers ?? "—"}</td>
                  <td className="py-1">{p.remarks ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      <section>
        <h2 className="text-base font-bold">เครื่องจักร/อุปกรณ์ (Equipment)</h2>
        {payload.machinery.length === 0 ? (
          <p className="mt-2 text-sm text-muted">ไม่มีข้อมูล</p>
        ) : (
          <table className="mt-2 w-full text-left text-sm">
            <thead>
              <tr className="border-b border-line text-xs text-muted">
                <th className="py-1">ประเภทเครื่องจักร</th>
                <th className="py-1">จำนวน</th>
              </tr>
            </thead>
            <tbody>
              {payload.machinery.map((m) => (
                <tr key={m.id} className="border-b border-line">
                  <td className="py-1">{m.machinery_type}</td>
                  <td className="py-1">{m.quantity}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      <section>
        <h2 className="text-base font-bold">หัวข้ออบรม Safety Talk (Safety Topics)</h2>
        {payload.safetyTopics.length === 0 ? (
          <p className="mt-2 text-sm text-muted">ไม่มีข้อมูล</p>
        ) : (
          <div className="mt-2 flex flex-col gap-1 text-sm">
            {payload.safetyTopics.map((t) => (
              <p key={t.id}>• {t.topic}</p>
            ))}
          </div>
        )}
      </section>

      <section>
        <h2 className="text-base font-bold">วัสดุที่รับเข้า (Material Receive)</h2>
        {payload.materialReceive.length === 0 ? (
          <p className="mt-2 text-sm text-muted">ไม่มีข้อมูล</p>
        ) : (
          <table className="mt-2 w-full text-left text-sm">
            <thead>
              <tr className="border-b border-line text-xs text-muted">
                <th className="py-1">วัสดุ</th>
                <th className="py-1">จำนวน</th>
                <th className="py-1">หน่วย</th>
                <th className="py-1">วันที่รับ</th>
                <th className="py-1">หมายเหตุ</th>
              </tr>
            </thead>
            <tbody>
              {payload.materialReceive.map((m) => (
                <tr key={m.id} className="border-b border-line">
                  <td className="py-1">{m.material_name}</td>
                  <td className="py-1">{m.quantity ?? "—"}</td>
                  <td className="py-1">{m.unit ?? "—"}</td>
                  <td className="py-1">{m.received_date ?? "—"}</td>
                  <td className="py-1">{m.remarks ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      {payload.attachments.some((a) => a.kind === "progress_photo" && a.url) && (
```

- [ ] **Step 3: Run the TypeScript compiler**

```bash
npx tsc --noEmit
```

Expected: clean.

- [ ] **Step 4: Manually verify the PDF renderer still produces valid output**

Run: `npx vitest run src/lib/reports/render-pdf.test.ts`
Expected: PASS. Since Task 2 already populated `render-pdf.test.ts`'s sample payload with one permit/machinery/safety-topic/material-receive row each, this run exercises the new sections' non-empty rendering path automatically. If it fails, re-check that every class in your new markup is one of the classes confirmed present in `render-pdf.ts`'s stylesheet (listed at the top of this task) — a missing class won't fail this test (Playwright will still produce a PDF, just visually wrong), but a JSX/syntax error will.

- [ ] **Step 5: Commit**

```bash
git add src/components/report-view/ReportView.tsx
git commit -m "Add Work Permits, Equipment, Safety Topics, and Material Receive sections to ReportView"
```

---

### Task 5: Excel export

**Files:**
- Modify: `src/lib/reports/render-xlsx.ts`
- Modify: `src/lib/reports/render-xlsx.test.ts`

**Interfaces:**
- Consumes: `payload.permits`/`machinery`/`safetyTopics`/`materialReceive` (Task 3), `activity.jsa` (Task 2).
- Produces: nothing new for later tasks.

- [ ] **Step 1: Write the failing test**

Add this new `it(...)` block inside the existing `describe("renderReportXlsx", ...)` block in `render-xlsx.test.ts` (place it after the last existing `it(...)` block, before the closing `});`):

```ts
  it("lists work permits, equipment, safety topics, and material receive entries", async () => {
    const buffer = await renderReportXlsx(samplePayload);
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(buffer as unknown as ArrayBuffer);

    const sheet = workbook.getWorksheet("Report");
    const values = sheet!.getSheetValues().flat().filter(Boolean).map(String);
    expect(values).toContain("Hot Work");
    expect(values).toContain("Crane");
    expect(values).toContain("ตรวจสอบสายรัดนิรภัย");
    expect(values).toContain("เหล็กเส้น");
  });

  it("marks JSA on activities that have it", async () => {
    const buffer = await renderReportXlsx(samplePayload);
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(buffer as unknown as ArrayBuffer);

    const sheet = workbook.getWorksheet("Report");
    const values = sheet!.getSheetValues().flat().filter(Boolean).map(String);
    expect(values).toContain("Yes");
  });
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx vitest run src/lib/reports/render-xlsx.test.ts -t "lists work permits"`
Run: `npx vitest run src/lib/reports/render-xlsx.test.ts -t "marks JSA"`
Expected: both FAIL — `renderReportXlsx` doesn't write these values yet.

- [ ] **Step 3: Add the JSA column to the Activities section**

Find this exact block:

```ts
  sheet.addRow(["Activities"]);
  sheet.addRow(["Area", "Description", "Plan %", "Actual %", "Supervisor"]);
  for (const a of payload.activities) {
    sheet.addRow([a.area ?? "", a.description, a.planned_progress ?? "", a.actual_progress ?? "", a.supervisor ?? ""]);
  }
  sheet.addRow([]);
```

Replace it verbatim with:

```ts
  sheet.addRow(["Activities"]);
  sheet.addRow(["Area", "Description", "Plan %", "Actual %", "Supervisor", "JSA"]);
  for (const a of payload.activities) {
    sheet.addRow([
      a.area ?? "",
      a.description,
      a.planned_progress ?? "",
      a.actual_progress ?? "",
      a.supervisor ?? "",
      a.jsa ? "Yes" : "No",
    ]);
  }
  sheet.addRow([]);
```

- [ ] **Step 4: Add the four new sections between Safety and Photos**

Find this exact block:

```ts
  sheet.addRow(["Safety"]);
  if (payload.safety) {
    sheet.addRow(["Accident Status", payload.safety.accident_status ?? ""]);
    sheet.addRow(["Remarks", payload.safety.remarks ?? ""]);
  } else {
    sheet.addRow(["No data"]);
  }
  sheet.addRow([]);

  sheet.addRow(["Photos"]);
```

Replace it verbatim with:

```ts
  sheet.addRow(["Safety"]);
  if (payload.safety) {
    sheet.addRow(["Accident Status", payload.safety.accident_status ?? ""]);
    sheet.addRow(["Remarks", payload.safety.remarks ?? ""]);
  } else {
    sheet.addRow(["No data"]);
  }
  sheet.addRow([]);

  sheet.addRow(["Work Permits"]);
  if (payload.permits.length > 0) {
    sheet.addRow(["Permit Type", "Count", "Workers", "Remarks"]);
    for (const p of payload.permits) {
      sheet.addRow([p.permit_type, p.count ?? "", p.workers ?? "", p.remarks ?? ""]);
    }
  } else {
    sheet.addRow(["No data"]);
  }
  sheet.addRow([]);

  sheet.addRow(["Equipment"]);
  if (payload.machinery.length > 0) {
    sheet.addRow(["Machinery Type", "Quantity"]);
    for (const m of payload.machinery) {
      sheet.addRow([m.machinery_type, m.quantity]);
    }
  } else {
    sheet.addRow(["No data"]);
  }
  sheet.addRow([]);

  sheet.addRow(["Safety Topics"]);
  if (payload.safetyTopics.length > 0) {
    for (const t of payload.safetyTopics) {
      sheet.addRow([t.topic]);
    }
  } else {
    sheet.addRow(["No data"]);
  }
  sheet.addRow([]);

  sheet.addRow(["Material Receive"]);
  if (payload.materialReceive.length > 0) {
    sheet.addRow(["Material", "Quantity", "Unit", "Received Date", "Remarks"]);
    for (const m of payload.materialReceive) {
      sheet.addRow([m.material_name, m.quantity ?? "", m.unit ?? "", m.received_date ?? "", m.remarks ?? ""]);
    }
  } else {
    sheet.addRow(["No data"]);
  }
  sheet.addRow([]);

  sheet.addRow(["Photos"]);
```

- [ ] **Step 5: Run the tests to verify they pass**

```bash
npx vitest run src/lib/reports/render-xlsx.test.ts
```

Expected: all tests PASS, including the two new ones from Step 1.

- [ ] **Step 6: Run the full suite and typecheck**

```bash
npx tsc --noEmit
npx vitest run
```

Expected: both clean.

- [ ] **Step 7: Commit**

```bash
git add src/lib/reports/render-xlsx.ts src/lib/reports/render-xlsx.test.ts
git commit -m "Add Work Permits, Equipment, Safety Topics, Material Receive, and JSA to Excel export"
```

---

### Task 6: Form UI (no submit wiring)

**Files:**
- Modify: `src/app/daily-report/report-form.tsx`

**Interfaces:**
- Consumes: nothing from Tasks 1-5 directly (this is client-side form state, independent until Task 7 wires it to Supabase).
- Produces: `permits`, `machinery`, `safetyTopics`, `materialReceive`, `cumulativePlanPct`, `cumulativeActualPct` state and their update handlers, plus `ActivityRow.jsa`. Task 7's `onSubmit` consumes all of these by the exact variable names introduced here.

- [ ] **Step 1: Add new interfaces, constants, and extend `ActivityRow`**

Find this exact block:

```tsx
interface WorkforceRow {
  role: string;
  male: string;
  female: string;
}

interface ActivityRow {
  area: string;
  description: string;
  progress: string;
  status: "" | WorkStatus;
  supervisor: string;
}
```

Replace it verbatim with:

```tsx
interface WorkforceRow {
  role: string;
  male: string;
  female: string;
}

interface ActivityRow {
  area: string;
  description: string;
  progress: string;
  status: "" | WorkStatus;
  supervisor: string;
  jsa: boolean;
}

interface PermitRow {
  type: string;
  count: string;
  workers: string;
  remarks: string;
}

interface MachineryRow {
  type: string;
  quantity: string;
}

interface MaterialRow {
  material: string;
  quantity: string;
  unit: string;
  receivedDate: string;
  remarks: string;
}

const PERMIT_TYPES = [
  "Hot Work",
  "Work at Height",
  "Lifting",
  "LOTO",
  "Confined Space",
  "Energized Equipment Work",
  "Other",
];

const MACHINERY_TYPES = [
  "Welding Machine",
  "Hand Tool Equipment",
  "Crane",
  "Hieb/Hiab",
  "Trailer/Truck",
  "Tractor/Backhoe/Grader",
  "Compactor",
  "Forklift",
  "Excavator",
  "Concrete Pump Truck",
];
```

- [ ] **Step 2: Add four new sub-components, following the `PhotoPicker` pattern already in this file**

Find this exact block (the end of `PhotoPicker` and the start of `todayISO`):

```tsx
function todayISO() {
  return new Date().toISOString().slice(0, 10);
}
```

Replace it verbatim with:

```tsx
function PermitsTable({
  rows,
  onUpdate,
}: {
  rows: PermitRow[];
  onUpdate: (index: number, patch: Partial<PermitRow>) => void;
}) {
  return (
    <div className="overflow-x-auto rounded-md border border-line">
      <table className="w-full text-left text-sm">
        <thead className="bg-surface2 text-xs font-semibold text-muted uppercase tracking-wider border-b border-line">
          <tr>
            <th scope="col" className="px-3 py-2.5">ประเภทใบอนุญาต (Permit Type)</th>
            <th scope="col" className="px-3 py-2.5 w-24">จำนวน</th>
            <th scope="col" className="px-3 py-2.5 w-24">คนทำงาน</th>
            <th scope="col" className="px-3 py-2.5">หมายเหตุ</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-line">
          {rows.map((row, i) => (
            <tr key={row.type}>
              <td className="px-3 py-2 font-medium">{row.type}</td>
              <td className="px-3 py-2">
                <TextInput
                  inputMode="numeric"
                  placeholder="0"
                  value={row.count}
                  aria-label={`${row.type} จำนวน`}
                  onChange={(e) => onUpdate(i, { count: e.target.value })}
                />
              </td>
              <td className="px-3 py-2">
                <TextInput
                  inputMode="numeric"
                  placeholder="0"
                  value={row.workers}
                  aria-label={`${row.type} คนทำงาน`}
                  onChange={(e) => onUpdate(i, { workers: e.target.value })}
                />
              </td>
              <td className="px-3 py-2">
                <TextInput
                  placeholder="หมายเหตุ"
                  value={row.remarks}
                  aria-label={`${row.type} หมายเหตุ`}
                  onChange={(e) => onUpdate(i, { remarks: e.target.value })}
                />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function EquipmentTable({
  rows,
  onUpdate,
}: {
  rows: MachineryRow[];
  onUpdate: (index: number, patch: Partial<MachineryRow>) => void;
}) {
  return (
    <div className="overflow-x-auto rounded-md border border-line">
      <table className="w-full text-left text-sm">
        <thead className="bg-surface2 text-xs font-semibold text-muted uppercase tracking-wider border-b border-line">
          <tr>
            <th scope="col" className="px-3 py-2.5">ประเภทเครื่องจักร (Machinery Type)</th>
            <th scope="col" className="px-3 py-2.5 w-32">จำนวน (Quantity)</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-line">
          {rows.map((row, i) => (
            <tr key={row.type}>
              <td className="px-3 py-2 font-medium">{row.type}</td>
              <td className="px-3 py-2">
                <TextInput
                  inputMode="numeric"
                  placeholder="0"
                  value={row.quantity}
                  aria-label={`${row.type} จำนวน`}
                  onChange={(e) => onUpdate(i, { quantity: e.target.value })}
                />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function SafetyTopicsList({
  topics,
  onUpdate,
  onAdd,
  onRemove,
}: {
  topics: string[];
  onUpdate: (index: number, value: string) => void;
  onAdd: () => void;
  onRemove: (index: number) => void;
}) {
  return (
    <div className="flex flex-col gap-3">
      {topics.map((topic, i) => (
        <div key={i} className="flex items-center gap-2">
          <TextInput
            placeholder="เช่น ตรวจสอบสายรัดนิรภัยสำหรับงานที่สูง"
            value={topic}
            aria-label={`หัวข้อ Safety Talk ที่ ${i + 1}`}
            onChange={(e) => onUpdate(i, e.target.value)}
          />
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onRemove(i)}
            disabled={topics.length === 1}
            aria-label={`ลบหัวข้อที่ ${i + 1}`}
            title="ลบแถว"
          >
            <Trash2 className="h-4 w-4" aria-hidden />
          </Button>
        </div>
      ))}
      <div>
        <Button variant="secondary" onClick={onAdd}>
          + เพิ่มหัวข้อ
        </Button>
      </div>
    </div>
  );
}

function MaterialReceiveTable({
  rows,
  onUpdate,
  onAdd,
  onRemove,
}: {
  rows: MaterialRow[];
  onUpdate: (index: number, patch: Partial<MaterialRow>) => void;
  onAdd: () => void;
  onRemove: (index: number) => void;
}) {
  return (
    <div className="flex flex-col gap-4">
      <div className="overflow-x-auto rounded-md border border-line">
        <table className="w-full text-left text-sm">
          <thead className="bg-surface2 text-xs font-semibold text-muted uppercase tracking-wider border-b border-line">
            <tr>
              <th scope="col" className="px-3 py-2.5">วัสดุ (Material)</th>
              <th scope="col" className="px-3 py-2.5 w-24">จำนวน</th>
              <th scope="col" className="px-3 py-2.5 w-24">หน่วย</th>
              <th scope="col" className="px-3 py-2.5 w-36">วันที่รับ</th>
              <th scope="col" className="px-3 py-2.5">หมายเหตุ</th>
              <th scope="col" className="px-3 py-2.5 w-12">
                <span className="sr-only">ลบแถว</span>
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {rows.map((row, i) => (
              <tr key={i}>
                <td className="px-3 py-2">
                  <TextInput
                    placeholder="เช่น เหล็กเส้น"
                    value={row.material}
                    aria-label={`วัสดุแถวที่ ${i + 1} ชื่อวัสดุ`}
                    onChange={(e) => onUpdate(i, { material: e.target.value })}
                  />
                </td>
                <td className="px-3 py-2">
                  <TextInput
                    inputMode="decimal"
                    placeholder="0"
                    value={row.quantity}
                    aria-label={`วัสดุแถวที่ ${i + 1} จำนวน`}
                    onChange={(e) => onUpdate(i, { quantity: e.target.value })}
                  />
                </td>
                <td className="px-3 py-2">
                  <TextInput
                    placeholder="เช่น kg, ตัน"
                    value={row.unit}
                    aria-label={`วัสดุแถวที่ ${i + 1} หน่วย`}
                    onChange={(e) => onUpdate(i, { unit: e.target.value })}
                  />
                </td>
                <td className="px-3 py-2">
                  <TextInput
                    type="date"
                    value={row.receivedDate}
                    aria-label={`วัสดุแถวที่ ${i + 1} วันที่รับ`}
                    onChange={(e) => onUpdate(i, { receivedDate: e.target.value })}
                  />
                </td>
                <td className="px-3 py-2">
                  <TextInput
                    placeholder="หมายเหตุ"
                    value={row.remarks}
                    aria-label={`วัสดุแถวที่ ${i + 1} หมายเหตุ`}
                    onChange={(e) => onUpdate(i, { remarks: e.target.value })}
                  />
                </td>
                <td className="px-3 py-2 text-center">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onRemove(i)}
                    disabled={rows.length === 1}
                    aria-label={`ลบวัสดุแถวที่ ${i + 1}`}
                    title="ลบแถว"
                  >
                    <Trash2 className="h-4 w-4" aria-hidden />
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div>
        <Button variant="secondary" onClick={onAdd}>
          + เพิ่มวัสดุ
        </Button>
      </div>
    </div>
  );
}

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}
```

- [ ] **Step 3: Add new state and update `activities`'s initial value**

Find this exact block:

```tsx
  const [activities, setActivities] = useState<ActivityRow[]>([
    { area: "", description: "", progress: "", status: "", supervisor: "" },
  ]);
  const [safetyNotes, setSafetyNotes] = useState("");
  const [progressPhotos, setProgressPhotos] = useState<PhotoFile[]>([]);
  const [safetyPhotos, setSafetyPhotos] = useState<PhotoFile[]>([]);
```

Replace it verbatim with:

```tsx
  const [activities, setActivities] = useState<ActivityRow[]>([
    { area: "", description: "", progress: "", status: "", supervisor: "", jsa: false },
  ]);
  const [safetyNotes, setSafetyNotes] = useState("");
  const [permits, setPermits] = useState<PermitRow[]>(
    PERMIT_TYPES.map((type) => ({ type, count: "", workers: "", remarks: "" })),
  );
  const [machinery, setMachinery] = useState<MachineryRow[]>(
    MACHINERY_TYPES.map((type) => ({ type, quantity: "" })),
  );
  const [safetyTopics, setSafetyTopics] = useState<string[]>([""]);
  const [materialReceive, setMaterialReceive] = useState<MaterialRow[]>([
    { material: "", quantity: "", unit: "", receivedDate: "", remarks: "" },
  ]);
  const [cumulativePlanPct, setCumulativePlanPct] = useState("");
  const [cumulativeActualPct, setCumulativeActualPct] = useState("");
  const [progressPhotos, setProgressPhotos] = useState<PhotoFile[]>([]);
  const [safetyPhotos, setSafetyPhotos] = useState<PhotoFile[]>([]);
```

- [ ] **Step 4: Add update handlers**

Find this exact block:

```tsx
  function updateActivity(index: number, patch: Partial<ActivityRow>) {
    setActivities((rows) =>
      rows.map((r, i) => (i === index ? { ...r, ...patch } : r)),
    );
  }
```

Replace it verbatim with:

```tsx
  function updateActivity(index: number, patch: Partial<ActivityRow>) {
    setActivities((rows) =>
      rows.map((r, i) => (i === index ? { ...r, ...patch } : r)),
    );
  }

  function updatePermit(index: number, patch: Partial<PermitRow>) {
    setPermits((rows) => rows.map((r, i) => (i === index ? { ...r, ...patch } : r)));
  }

  function updateMachinery(index: number, patch: Partial<MachineryRow>) {
    setMachinery((rows) => rows.map((r, i) => (i === index ? { ...r, ...patch } : r)));
  }

  function updateSafetyTopic(index: number, value: string) {
    setSafetyTopics((rows) => rows.map((r, i) => (i === index ? value : r)));
  }

  function updateMaterial(index: number, patch: Partial<MaterialRow>) {
    setMaterialReceive((rows) => rows.map((r, i) => (i === index ? { ...r, ...patch } : r)));
  }
```

- [ ] **Step 5: Add the cumulative % fields to the meta section**

Find this exact block:

```tsx
          <Field
            label="ประเภทรายงาน"
            hint="แผนงานเช้าและผลงานจริงสิ้นวันใช้โครงสร้างเดียวกัน เพื่อให้เปรียบเทียบได้ทันที"
          >
            <Select
              value={reportType}
              onChange={(e) => setReportType(e.target.value as ReportType)}
            >
              {REPORT_TABS.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </Select>
          </Field>
        </div>
      </section>
```

Replace it verbatim with:

```tsx
          <Field
            label="ประเภทรายงาน"
            hint="แผนงานเช้าและผลงานจริงสิ้นวันใช้โครงสร้างเดียวกัน เพื่อให้เปรียบเทียบได้ทันที"
          >
            <Select
              value={reportType}
              onChange={(e) => setReportType(e.target.value as ReportType)}
            >
              {REPORT_TABS.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="ความก้าวหน้าสะสม - แผน (%)" htmlFor="cumulative-plan">
            <TextInput
              id="cumulative-plan"
              inputMode="decimal"
              placeholder="0–100"
              value={cumulativePlanPct}
              onChange={(e) => setCumulativePlanPct(e.target.value)}
            />
          </Field>
          <Field label="ความก้าวหน้าสะสม - จริง (%)" htmlFor="cumulative-actual">
            <TextInput
              id="cumulative-actual"
              inputMode="decimal"
              placeholder="0–100"
              value={cumulativeActualPct}
              onChange={(e) => setCumulativeActualPct(e.target.value)}
            />
          </Field>
        </div>
      </section>
```

- [ ] **Step 6: Add the JSA column to the Activities table**

Find this exact block:

```tsx
                <th scope="col" className="px-3 py-2.5 w-40">สถานะ (Status)</th>
                <th scope="col" className="px-3 py-2.5 w-12">
                  <span className="sr-only">ลบแถว</span>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {activities.map((row, i) => (
```

Replace it verbatim with:

```tsx
                <th scope="col" className="px-3 py-2.5 w-40">สถานะ (Status)</th>
                <th scope="col" className="px-3 py-2.5 w-16">JSA</th>
                <th scope="col" className="px-3 py-2.5 w-12">
                  <span className="sr-only">ลบแถว</span>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {activities.map((row, i) => (
```

Then find this exact block:

```tsx
                  <td className="px-3 py-2 align-top">
                    <Select
                      aria-label={`กิจกรรมที่ ${i + 1} สถานะ`}
                      value={row.status}
                      onChange={(e) =>
                        updateActivity(i, { status: e.target.value as "" | WorkStatus })
                      }
                    >
                      {STATUS_OPTIONS.map((o) => (
                        <option key={o.value} value={o.value}>
                          {o.label}
                        </option>
                      ))}
                    </Select>
                  </td>
                  <td className="px-3 py-2 align-top text-center">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() =>
                        setActivities((rows) => rows.filter((_, j) => j !== i))
                      }
                      disabled={activities.length === 1}
                      aria-label={`ลบกิจกรรมที่ ${i + 1}`}
                      title="ลบแถว"
                    >
                      <Trash2 className="h-4 w-4" aria-hidden />
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div>
          <Button
            variant="secondary"
            onClick={() =>
              setActivities((rows) => [
                ...rows,
                { area: "", description: "", progress: "", status: "", supervisor: "" },
              ])
            }
          >
            + เพิ่มกิจกรรม
          </Button>
        </div>
      </section>
```

Replace it verbatim with:

```tsx
                  <td className="px-3 py-2 align-top">
                    <Select
                      aria-label={`กิจกรรมที่ ${i + 1} สถานะ`}
                      value={row.status}
                      onChange={(e) =>
                        updateActivity(i, { status: e.target.value as "" | WorkStatus })
                      }
                    >
                      {STATUS_OPTIONS.map((o) => (
                        <option key={o.value} value={o.value}>
                          {o.label}
                        </option>
                      ))}
                    </Select>
                  </td>
                  <td className="px-3 py-2 align-top text-center">
                    <input
                      type="checkbox"
                      checked={row.jsa}
                      onChange={(e) => updateActivity(i, { jsa: e.target.checked })}
                      aria-label={`กิจกรรมที่ ${i + 1} JSA`}
                      className="h-5 w-5 rounded border-line"
                    />
                  </td>
                  <td className="px-3 py-2 align-top text-center">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() =>
                        setActivities((rows) => rows.filter((_, j) => j !== i))
                      }
                      disabled={activities.length === 1}
                      aria-label={`ลบกิจกรรมที่ ${i + 1}`}
                      title="ลบแถว"
                    >
                      <Trash2 className="h-4 w-4" aria-hidden />
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div>
          <Button
            variant="secondary"
            onClick={() =>
              setActivities((rows) => [
                ...rows,
                { area: "", description: "", progress: "", status: "", supervisor: "", jsa: false },
              ])
            }
          >
            + เพิ่มกิจกรรม
          </Button>
        </div>
      </section>
```

- [ ] **Step 7: Insert the four new sections after Safety, before Photos**

Find this exact block:

```tsx
      <section aria-labelledby="safety" className="flex flex-col gap-4">
        <h2 id="safety" className="text-lg font-bold">
          ความปลอดภัย (Safety)
        </h2>
        <Field
          label="บันทึกความปลอดภัย (Safety Notes)"
          htmlFor="safety-notes"
          hint="สถิติอุบัติเหตุ, จำนวนวันไร้อุบัติเหตุ, และหัวข้ออบรม Safety Talk วันนี้"
        >
          <TextArea
            id="safety-notes"
            placeholder="เช่น ไม่มีอุบัติเหตุ จำนวนวันไร้อุบัติเหตุสะสม: 431 วัน หัวข้ออบรม: ตรวจสอบสายรัดนิรภัยสำหรับงานที่สูง"
            value={safetyNotes}
            onChange={(e) => setSafetyNotes(e.target.value)}
          />
        </Field>
      </section>

      <section aria-labelledby="photos" className="flex flex-col gap-4">
```

Replace it verbatim with:

```tsx
      <section aria-labelledby="safety" className="flex flex-col gap-4">
        <h2 id="safety" className="text-lg font-bold">
          ความปลอดภัย (Safety)
        </h2>
        <Field
          label="บันทึกความปลอดภัย (Safety Notes)"
          htmlFor="safety-notes"
          hint="สถิติอุบัติเหตุ, จำนวนวันไร้อุบัติเหตุ, และหัวข้ออบรม Safety Talk วันนี้"
        >
          <TextArea
            id="safety-notes"
            placeholder="เช่น ไม่มีอุบัติเหตุ จำนวนวันไร้อุบัติเหตุสะสม: 431 วัน หัวข้ออบรม: ตรวจสอบสายรัดนิรภัยสำหรับงานที่สูง"
            value={safetyNotes}
            onChange={(e) => setSafetyNotes(e.target.value)}
          />
        </Field>
      </section>

      <section aria-labelledby="permits" className="flex flex-col gap-4">
        <h2 id="permits" className="text-lg font-bold">
          ใบอนุญาตทำงาน (Work Permits)
        </h2>
        <PermitsTable rows={permits} onUpdate={updatePermit} />
      </section>

      <section aria-labelledby="equipment" className="flex flex-col gap-4">
        <h2 id="equipment" className="text-lg font-bold">
          เครื่องจักร/อุปกรณ์ (Equipment)
        </h2>
        <EquipmentTable rows={machinery} onUpdate={updateMachinery} />
      </section>

      <section aria-labelledby="safety-topics" className="flex flex-col gap-4">
        <h2 id="safety-topics" className="text-lg font-bold">
          หัวข้ออบรม Safety Talk (Safety Topics)
        </h2>
        <SafetyTopicsList
          topics={safetyTopics}
          onUpdate={updateSafetyTopic}
          onAdd={() => setSafetyTopics((rows) => [...rows, ""])}
          onRemove={(i) => setSafetyTopics((rows) => rows.filter((_, j) => j !== i))}
        />
      </section>

      <section aria-labelledby="material-receive" className="flex flex-col gap-4">
        <h2 id="material-receive" className="text-lg font-bold">
          วัสดุที่รับเข้า (Material Receive)
        </h2>
        <MaterialReceiveTable
          rows={materialReceive}
          onUpdate={updateMaterial}
          onAdd={() =>
            setMaterialReceive((rows) => [
              ...rows,
              { material: "", quantity: "", unit: "", receivedDate: "", remarks: "" },
            ])
          }
          onRemove={(i) => setMaterialReceive((rows) => rows.filter((_, j) => j !== i))}
        />
      </section>

      <section aria-labelledby="photos" className="flex flex-col gap-4">
```

- [ ] **Step 8: Run the TypeScript compiler**

```bash
npx tsc --noEmit
```

Expected: clean.

- [ ] **Step 9: Commit**

```bash
git add src/app/daily-report/report-form.tsx
git commit -m "Add Work Permits, Equipment, Safety Topics, Material Receive UI, JSA checkbox, and cumulative % fields"
```

---

### Task 7: Form submit wiring + end-to-end verification

**Files:**
- Modify: `src/app/daily-report/report-form.tsx`

**Interfaces:**
- Consumes: all state and handlers from Task 6, by the exact variable names introduced there (`permits`, `machinery`, `safetyTopics`, `materialReceive`, `cumulativePlanPct`, `cumulativeActualPct`, `activities[].jsa`).
- Produces: nothing for later tasks — this is the final task in the plan.

- [ ] **Step 1: Add cumulative % to the `daily_reports` insert**

Find this exact block:

```tsx
      const { data: report, error: reportError } = await supabase
        .from("daily_reports")
        .insert({
          project_id: project.id,
          contractor_id: profile.contractor_id,
          report_date: reportDate,
          report_type: reportType,
          status: "submitted",
          created_by: user.id,
        })
        .select("id")
        .single();
```

Replace it verbatim with:

```tsx
      const { data: report, error: reportError } = await supabase
        .from("daily_reports")
        .insert({
          project_id: project.id,
          contractor_id: profile.contractor_id,
          report_date: reportDate,
          report_type: reportType,
          status: "submitted",
          created_by: user.id,
          cumulative_plan_pct: cumulativePlanPct.trim() ? Number(cumulativePlanPct) : null,
          cumulative_actual_pct: cumulativeActualPct.trim() ? Number(cumulativeActualPct) : null,
        })
        .select("id")
        .single();
```

- [ ] **Step 2: Add `jsa` to the activity rows insert, and add the four new insert blocks**

Find this exact block:

```tsx
      const activityRows = activities
        .filter((a) => a.description.trim())
        .map((a) => ({
          daily_report_id: report.id,
          area: a.area.trim() || null,
          description: a.description.trim(),
          planned_progress: reportType === "morning_plan" && a.progress.trim() ? Number(a.progress) : null,
          actual_progress: reportType === "end_of_day_actual" && a.progress.trim() ? Number(a.progress) : null,
          status: a.status || null,
          supervisor: a.supervisor.trim() || null,
        }));
      if (activityRows.length > 0) {
        const { error } = await supabase.from("daily_report_activities").insert(activityRows);
        if (error) {
          setSubmitError(`บันทึกกิจกรรมไม่สำเร็จ: ${error.message}`);
          return;
        }
      }

      if (safetyNotes.trim()) {
        const { error } = await supabase
          .from("daily_report_safety")
          .insert({ daily_report_id: report.id, remarks: safetyNotes.trim() });
        if (error) {
          setSubmitError(`บันทึกข้อมูลความปลอดภัยไม่สำเร็จ: ${error.message}`);
          return;
        }
      }
```

Replace it verbatim with:

```tsx
      const activityRows = activities
        .filter((a) => a.description.trim())
        .map((a) => ({
          daily_report_id: report.id,
          area: a.area.trim() || null,
          description: a.description.trim(),
          planned_progress: reportType === "morning_plan" && a.progress.trim() ? Number(a.progress) : null,
          actual_progress: reportType === "end_of_day_actual" && a.progress.trim() ? Number(a.progress) : null,
          status: a.status || null,
          supervisor: a.supervisor.trim() || null,
          jsa: a.jsa,
        }));
      if (activityRows.length > 0) {
        const { error } = await supabase.from("daily_report_activities").insert(activityRows);
        if (error) {
          setSubmitError(`บันทึกกิจกรรมไม่สำเร็จ: ${error.message}`);
          return;
        }
      }

      if (safetyNotes.trim()) {
        const { error } = await supabase
          .from("daily_report_safety")
          .insert({ daily_report_id: report.id, remarks: safetyNotes.trim() });
        if (error) {
          setSubmitError(`บันทึกข้อมูลความปลอดภัยไม่สำเร็จ: ${error.message}`);
          return;
        }
      }

      const permitRows = permits
        .filter((p) => p.count.trim() || p.workers.trim() || p.remarks.trim())
        .map((p) => ({
          daily_report_id: report.id,
          permit_type: p.type,
          count: p.count.trim() ? Number(p.count) : null,
          workers: p.workers.trim() ? Number(p.workers) : null,
          remarks: p.remarks.trim() || null,
        }));
      if (permitRows.length > 0) {
        const { error } = await supabase.from("daily_report_permits").insert(permitRows);
        if (error) {
          setSubmitError(`บันทึกใบอนุญาตทำงานไม่สำเร็จ: ${error.message}`);
          return;
        }
      }

      const machineryRows = machinery
        .filter((m) => m.quantity.trim())
        .map((m) => ({
          daily_report_id: report.id,
          machinery_type: m.type,
          quantity: Number(m.quantity),
        }));
      if (machineryRows.length > 0) {
        const { error } = await supabase.from("daily_report_machinery").insert(machineryRows);
        if (error) {
          setSubmitError(`บันทึกข้อมูลเครื่องจักรไม่สำเร็จ: ${error.message}`);
          return;
        }
      }

      const safetyTopicRows = safetyTopics
        .filter((t) => t.trim())
        .map((t) => ({ daily_report_id: report.id, topic: t.trim() }));
      if (safetyTopicRows.length > 0) {
        const { error } = await supabase.from("daily_report_safety_topics").insert(safetyTopicRows);
        if (error) {
          setSubmitError(`บันทึกหัวข้อ Safety Talk ไม่สำเร็จ: ${error.message}`);
          return;
        }
      }

      const materialRows = materialReceive
        .filter((m) => m.material.trim())
        .map((m) => ({
          daily_report_id: report.id,
          material_name: m.material.trim(),
          quantity: m.quantity.trim() ? Number(m.quantity) : null,
          unit: m.unit.trim() || null,
          received_date: m.receivedDate || null,
          remarks: m.remarks.trim() || null,
        }));
      if (materialRows.length > 0) {
        const { error } = await supabase.from("daily_report_material_receive").insert(materialRows);
        if (error) {
          setSubmitError(`บันทึกข้อมูลวัสดุที่รับเข้าไม่สำเร็จ: ${error.message}`);
          return;
        }
      }
```

- [ ] **Step 3: Run the TypeScript compiler**

```bash
npx tsc --noEmit
```

Expected: clean.

- [ ] **Step 4: Manual/Playwright end-to-end verification**

No new Vitest tests for this file (rendering + wiring, not new business logic beyond the filter-empty-rows pattern already used elsewhere in this file). Instead, verify end-to-end that every new field actually persists and renders:

1. Start the dev server: `npm run dev`. Before starting, check for and kill any stray dev-server processes already listening on ports in the 3000s (this OneDrive-synced repo has repeatedly hit stale-`.next`-cache issues from concurrent dev servers earlier in this branch's history — start clean).
2. Sign in as the demo contractor_user (`contractor@faststeel.demo` / `DemoPassword2026!`, from `src/app/login/login-form.tsx`) and navigate to `/daily-report`. Use `end_of_day_actual` as the report type if `morning_plan` for today already has a submitted report (the `daily_reports` table has a `unique(project_id, contractor_id, report_date, report_type)` constraint — a 409 here is an existing-data conflict, not a bug, per the lesson from the prior plan on this branch).
3. Fill in the required Workforce/Activities rows (at least one of each, matching existing required-field validation), then also fill in:
   - Cumulative plan % and cumulative actual % (e.g. `45` and `40`).
   - At least 2 of the fixed Work Permit rows (e.g. Hot Work: count 2, workers 4; Lifting: count 1, workers 2).
   - At least 2 of the fixed Equipment rows (e.g. Crane: quantity 1; Forklift: quantity 2).
   - Check the JSA checkbox on at least one Activities row.
   - Add a Safety Topic (e.g. "ตรวจสอบสายรัดนิรภัยสำหรับงานที่สูง").
   - Add a Material Receive row (e.g. material "เหล็กเส้น", quantity 500, unit "kg", received date today).
4. Click "ตรวจสอบรายงาน" (Review), then submit.
5. Confirm the redirect to `/daily-report/{id}` succeeds, and that the detail page (`ReportView`) shows: the cumulative % values in the header, the JSA checkmark on the correct activity row, the Work Permits table with your entries, the Equipment table with your entries, the Safety Topics list with your entry, and the Material Receive table with your entry.
6. From the detail page, download the PDF export and confirm it's a valid PDF (check the `%PDF` magic bytes and a non-trivial byte size) containing the same sections.
7. Download the Excel export and confirm it's a valid `.xlsx` file (correct content-type) whose sheet values include your Work Permit type, Equipment type, Safety Topic text, and Material name (matching the pattern used for the equivalent Excel verification in the render-xlsx tests).
8. Stop the dev server when done. Delete any scratch verification scripts you create during this process — do not leave them in the repo root (a prior task on this branch left 13 of these behind by mistake; don't repeat it).

If any step fails, the failure is almost certainly in this task's insert wiring or in a variable-name mismatch with Task 6's state (e.g. a typo in `permits`/`machinery`/`safetyTopics`/`materialReceive`) — check Steps 1-2's code against Task 6's exact state/handler names before looking elsewhere. If Task 1's migration hasn't been applied to the live database yet, every new insert will fail with a schema error — confirm with the controller that migration `0005_report_checklist_fields.sql` has been applied before starting this verification.

- [ ] **Step 5: Commit**

```bash
git add src/app/daily-report/report-form.tsx
git commit -m "Wire up submit for permits, machinery, safety topics, material receive, JSA, and cumulative %"
```
