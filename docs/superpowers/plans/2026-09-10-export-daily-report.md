# Export Daily Report Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let a user download a submitted daily report as a PDF (matching the
contractors' existing template) or an Excel workbook, generated server-side from
data already in Supabase.

**Architecture:** One assembly function joins `daily_reports` with its child tables
into a typed `ReportPayload`. A shared React "report view" component renders that
payload; a headless-Chromium print (Playwright) turns it into a PDF, and a separate
exceljs builder turns it into a workbook. One API route serves both formats. A
minimal report-detail page (new — none exists yet) hosts the download links.

**Tech Stack:** Next.js 14 App Router, Supabase (Postgres + RLS), `playwright`
(PDF), `exceljs` (XLSX), Vitest (new test runner — none exists in this repo yet).

**Spec:** `docs/superpowers/specs/2026-09-10-export-daily-report-design.md`

## Global Constraints

- No invented data anywhere — the seed row in Task 2 uses only values actually
  readable in the RETS 4-9-2026 sample PDF; fields that couldn't be read
  unambiguously from that PDF's extracted text are left `null`, not guessed.
- All Supabase access from server code goes through the existing
  `src/lib/supabase/server.ts` client (anon key + user session, RLS-respecting) —
  never the service-role key, per AGENTS.md rule 6.
- Follows the existing design-token system in `src/components/ui.tsx` /
  `globals.css` — no raw hex or Tailwind palette classes in the report-view
  components.
- **Out of scope for this plan** (tracked separately, not part of these tasks):
  wiring the Daily Report form's own Save button ("Slice 4" in
  `report-form.tsx`), the Report History list UI, and the fuller schema additions
  from the spec that need new form UI to populate (material receipts, work-permit
  checklist, machinery list, tomorrow's-forecast activities, JSA reference,
  photos). This plan exports what the current schema + one seeded real report
  actually contain: header info, workforce, today's activities, safety notes.
- **Known follow-up not solved here:** Playwright's Chromium binary needs to be
  available wherever the PDF route actually runs. This plan installs and tests it
  locally; making it work in the Vercel production build (binary size / cold
  start) is a deployment concern to handle at deploy time, not part of these
  tasks.

---

### Task 1: Schema migration — export-support columns + RLS policies

**Files:**
- Create: `supabase/migrations/0002_export_support.sql`

**Interfaces:**
- Produces: `contractors.short_code`, and on `daily_reports`:
  `report_number, time_start, time_finish, overtime_hours,
  cumulative_plan_pct, cumulative_actual_pct, checked_by_user_id, checked_at`.
  Also produces working SELECT access on `daily_report_workforce`,
  `daily_report_activities`, `daily_report_safety`, `contractors`, `projects` for
  any authenticated user whose `user_project_access` covers the parent report (or
  who is `head_office_admin`) — all four currently have RLS enabled with zero
  policies, which silently returns empty rows to every query, including the one
  Task 4 will write.

- [ ] **Step 1: Write the migration**

```sql
-- supabase/migrations/0002_export_support.sql
-- Export Daily Report — schema additions.
-- See docs/superpowers/specs/2026-09-10-export-daily-report-design.md

alter table contractors add column short_code text unique;

alter table daily_reports
  add column report_number text,
  add column time_start time,
  add column time_finish time,
  add column overtime_hours numeric,
  add column cumulative_plan_pct numeric,
  add column cumulative_actual_pct numeric,
  add column checked_by_user_id uuid references profiles(id),
  add column checked_at timestamptz;

-- Child-table SELECT policies, same visibility rule as daily_reports_select:
-- head_office_admin sees everything; everyone else needs a matching
-- user_project_access grant for the parent report's project/contractor/discipline.

create policy daily_report_workforce_select on daily_report_workforce for select
  using (
    exists (
      select 1 from daily_reports dr
      where dr.id = daily_report_workforce.daily_report_id
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

create policy daily_report_activities_select on daily_report_activities for select
  using (
    exists (
      select 1 from daily_reports dr
      where dr.id = daily_report_activities.daily_report_id
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

create policy daily_report_safety_select on daily_report_safety for select
  using (
    exists (
      select 1 from daily_reports dr
      where dr.id = daily_report_safety.daily_report_id
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

-- Master data used by the report view (contractor/project names) isn't sensitive —
-- what's restricted is report DATA, not the directory of contractors/projects.
create policy contractors_select_authenticated on contractors for select
  using (auth.role() = 'authenticated');

create policy projects_select_authenticated on projects for select
  using (auth.role() = 'authenticated');
```

- [ ] **Step 2: Apply the migration**

Run: `supabase db push`
Expected: `Applying migration 0002_export_support.sql...` then success — this
requires the project already linked earlier this session (`supabase link`).

- [ ] **Step 3: Verify the columns and policies exist**

Run:
```bash
supabase db push --dry-run
```
Expected: no pending changes reported (confirms the migration applied cleanly).

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/0002_export_support.sql
git commit -m "Add export-support schema: report metadata columns + child-table RLS"
```

---

### Task 2: Seed one real report for development/testing

**Files:**
- Modify: `supabase/seed.sql`

**Interfaces:**
- Consumes: `contractors.short_code`, `daily_reports.*` from Task 1.
- Produces: one real, traceable `daily_reports` row (contractor RETS,
  2026-09-04, `end_of_day_actual`, `status = 'submitted'`) with its
  `daily_report_workforce`, `daily_report_activities`, and `daily_report_safety`
  rows, plus `short_code` for every seeded contractor. Every value below is
  taken directly from the extracted text of
  `RETS Daily Progress and Safety 4-9-2026.pdf`; anything not clearly readable
  in that extraction (e.g. exact per-role manpower breakdown, which the PDF's
  table layout garbles under text extraction) is left out rather than guessed.

- [ ] **Step 1: Add short codes to the existing contractor seed**

Append to `supabase/seed.sql`, after the existing contractor insert:

```sql
-- 2b. Contractor short codes (used in export filenames)
update contractors set short_code = v.short_code
from (values
  ('หจก. ฟาสต์สตีล จำกัด (Fast Steel)', 'FASTSTEEL'),
  ('หจก. แอล-แทป เอ็นจิเนียริ่ง (L-TAB)', 'LTAB'),
  ('CKM', 'CKM'),
  ('RETS', 'RETS'),
  ('S-Zone (Sinoma)', 'SZONE'),
  ('UE', 'UE'),
  ('US', 'US'),
  ('PPE', 'PPE'),
  ('KR', 'KR'),
  ('PE', 'PE'),
  ('ZOE', 'ZOE')
) as v(name, short_code)
where contractors.name = v.name;
```

- [ ] **Step 2: Seed one real submitted report**

Append to `supabase/seed.sql`:

```sql
-- 4. Sample submitted report (real values from
--    "RETS Daily Progress and Safety 4-9-2026.pdf" — see
--    docs/superpowers/specs/2026-09-10-export-daily-report-design.md)
insert into daily_reports (
  id, project_id, contractor_id, report_date, report_type, status,
  time_start, time_finish, cumulative_plan_pct, cumulative_actual_pct,
  created_by
)
select
  '00000000-0000-0000-0000-000000000001',
  p.id, c.id, '2026-09-04', 'end_of_day_actual', 'submitted',
  '08:00', '17:00', 100, 20,
  -- created_by must reference a real profiles row; seed has none yet, so this
  -- insert is written to be run after at least one profile exists (see the
  -- Slice 4 / auth work tracked separately). For local dev without a profile
  -- yet, comment out the created_by line and the not-null constraint check
  -- will tell you which row to create first.
  (select id from profiles limit 1)
from projects p, contractors c
where p.code = 'STSBPP' and c.name = 'RETS'
on conflict (id) do nothing;

insert into daily_report_workforce (daily_report_id, role_name, male_count, female_count)
values ('00000000-0000-0000-0000-000000000001', 'รวมกำลังคนวันนี้ (Total manpower)', 15, 0)
on conflict do nothing;

insert into daily_report_activities (
  daily_report_id, area, description, planned_progress, actual_progress,
  status, supervisor
) values
  ('00000000-0000-0000-0000-000000000001', 'Stack',
   'เจียร์เก็บเก็บงานเชื่อม Stack (grinding/clean-up of welding work)',
   20, 20, 'IN_PROGRESS', 'RETS/EPS'),
  ('00000000-0000-0000-0000-000000000001', 'Stack',
   'งานประกอบหูช้าง (elephant-ear bracket assembly)',
   40, 40, 'IN_PROGRESS', 'RETS/EPS')
on conflict do nothing;

insert into daily_report_safety (daily_report_id, accident_status, remarks)
values (
  '00000000-0000-0000-0000-000000000001',
  'ไม่มีอุบัติเหตุ (No accidents — 0 ครั้ง)',
  'Best Record ตามเอกสารต้นฉบับ: 66 วัน'
)
on conflict do nothing;
```

- [ ] **Step 3: Run the seed and verify**

Run: `supabase db push` (if the migration wasn't applied yet) then apply the seed
via `psql` or the Supabase SQL editor (this repo has no seed-runner script yet —
running `supabase/seed.sql` directly against the linked project's connection
string is the existing pattern).

Verify: query `select id, report_date, contractor_id from daily_reports where id = '00000000-0000-0000-0000-000000000001';`
Expected: one row.

- [ ] **Step 4: Commit**

```bash
git add supabase/seed.sql
git commit -m "Seed one real submitted report from RETS sample PDF for export dev/testing"
```

---

### Task 3: Shared types for reports

**Files:**
- Modify: `src/types/index.ts`

**Interfaces:**
- Produces: `DailyReport`, `DailyReportWorkforce`, `DailyReportActivity`,
  `DailyReportSafety`, `ReportPayload` — Task 4 (`assemble.ts`), Task 5
  (`ReportView`), and Task 7 (`render-xlsx.ts`) all import these.

- [ ] **Step 1: Add the types**

Append to `src/types/index.ts`:

```typescript
// ----------------------------------------------------------
// Daily Report (Export feature)
// ----------------------------------------------------------

export interface DailyReport {
  id: string;
  project_id: string;
  contractor_id: string;
  discipline_id?: string | null;
  report_date: string;
  report_type: ReportType;
  status: ReportStatus;
  report_number?: string | null;
  time_start?: string | null;
  time_finish?: string | null;
  overtime_hours?: number | null;
  cumulative_plan_pct?: number | null;
  cumulative_actual_pct?: number | null;
  weather_temperature?: number | null;
  weather_condition?: string | null;
  checked_by_user_id?: string | null;
  checked_at?: string | null;
  created_at: string;
}

export interface DailyReportWorkforce {
  id: string;
  daily_report_id: string;
  role_name: string;
  male_count: number;
  female_count: number;
}

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

export interface ReportPayload {
  report: DailyReport;
  projectName: string;
  projectCode: string | null;
  contractorName: string;
  contractorShortCode: string | null;
  workforce: DailyReportWorkforce[];
  activities: DailyReportActivity[];
  safety: DailyReportSafety | null;
}
```

- [ ] **Step 2: Verify it compiles**

Run: `npx tsc --noEmit`
Expected: no new errors.

- [ ] **Step 3: Commit**

```bash
git add src/types/index.ts
git commit -m "Add DailyReport/ReportPayload types for export feature"
```

---

### Task 4: Report assembly function

**Files:**
- Create: `src/lib/reports/assemble.ts`
- Test: `src/lib/reports/assemble.test.ts`
- Modify: `package.json` (add `vitest` — no test runner exists in this repo yet)

**Interfaces:**
- Consumes: `DailyReport`, `DailyReportWorkforce`, `DailyReportActivity`,
  `DailyReportSafety`, `ReportPayload` from Task 3; a Supabase client shaped like
  `ReturnType<typeof import("@/lib/supabase/server").createClient>`.
- Produces: `assembleReportPayload(supabase: SupabaseClient, reportId: string): Promise<ReportPayload | null>`
  — Tasks 5, 6, 7, 8 all call this.

- [ ] **Step 1: Install the test runner**

Run: `npm install -D vitest`

- [ ] **Step 2: Add the test script**

In `package.json`'s `"scripts"`, add:
```json
"test": "vitest run"
```

- [ ] **Step 3: Write the failing test**

```typescript
// src/lib/reports/assemble.test.ts
import { describe, expect, it, vi } from "vitest";
import { assembleReportPayload } from "./assemble";

function makeSupabaseStub(overrides: {
  report: any;
  project: any;
  contractor: any;
  workforce: any[];
  activities: any[];
  safety: any | null;
}) {
  return {
    from(table: string) {
      const builder: any = {
        select: () => builder,
        eq: () => builder,
        single: async () => {
          if (table === "daily_reports") return { data: overrides.report, error: null };
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
          return resolve({ data: [], error: null });
        },
      };
      return builder;
    },
  };
}

describe("assembleReportPayload", () => {
  it("joins the report with its project, contractor, and child rows", async () => {
    const supabase = makeSupabaseStub({
      report: {
        id: "r1", project_id: "p1", contractor_id: "c1", report_date: "2026-09-04",
        report_type: "end_of_day_actual", status: "submitted", created_at: "2026-09-04T10:00:00Z",
      },
      project: { name: "STS-9.9 MW Biomass Power Plant", code: "STSBPP" },
      contractor: { name: "RETS", short_code: "RETS" },
      workforce: [{ id: "w1", daily_report_id: "r1", role_name: "รวมกำลังคนวันนี้", male_count: 15, female_count: 0 }],
      activities: [{ id: "a1", daily_report_id: "r1", description: "งาน A", planned_progress: 20, actual_progress: 20 }],
      safety: { daily_report_id: "r1", accident_status: "ไม่มีอุบัติเหตุ" },
    });

    const payload = await assembleReportPayload(supabase as any, "r1");

    expect(payload).not.toBeNull();
    expect(payload!.projectCode).toBe("STSBPP");
    expect(payload!.contractorShortCode).toBe("RETS");
    expect(payload!.workforce).toHaveLength(1);
    expect(payload!.activities).toHaveLength(1);
    expect(payload!.safety?.accident_status).toBe("ไม่มีอุบัติเหตุ");
  });

  it("returns null when the report doesn't exist or isn't visible under RLS", async () => {
    const supabase = makeSupabaseStub({
      report: null, project: null, contractor: null, workforce: [], activities: [], safety: null,
    });
    const payload = await assembleReportPayload(supabase as any, "missing");
    expect(payload).toBeNull();
  });
});
```

- [ ] **Step 4: Run it to verify it fails**

Run: `npx vitest run src/lib/reports/assemble.test.ts`
Expected: FAIL — `Cannot find module './assemble'`.

- [ ] **Step 5: Implement**

```typescript
// src/lib/reports/assemble.ts
import type {
  DailyReport,
  DailyReportActivity,
  DailyReportSafety,
  DailyReportWorkforce,
  ReportPayload,
} from "@/types";

type SupabaseLike = {
  from: (table: string) => any;
};

export async function assembleReportPayload(
  supabase: SupabaseLike,
  reportId: string,
): Promise<ReportPayload | null> {
  const { data: report } = await supabase
    .from("daily_reports")
    .select("*")
    .eq("id", reportId)
    .single();

  if (!report) return null;

  const [{ data: project }, { data: contractor }, workforceRes, activitiesRes, { data: safety }] =
    await Promise.all([
      supabase.from("projects").select("name, code").eq("id", report.project_id).single(),
      supabase.from("contractors").select("name, short_code").eq("id", report.contractor_id).single(),
      supabase.from("daily_report_workforce").select("*").eq("daily_report_id", reportId),
      supabase.from("daily_report_activities").select("*").eq("daily_report_id", reportId),
      supabase.from("daily_report_safety").select("*").eq("daily_report_id", reportId).single(),
    ]);

  return {
    report: report as DailyReport,
    projectName: project?.name ?? "",
    projectCode: project?.code ?? null,
    contractorName: contractor?.name ?? "",
    contractorShortCode: contractor?.short_code ?? null,
    workforce: (workforceRes.data ?? []) as DailyReportWorkforce[],
    activities: (activitiesRes.data ?? []) as DailyReportActivity[],
    safety: (safety ?? null) as DailyReportSafety | null,
  };
}
```

- [ ] **Step 6: Run it to verify it passes**

Run: `npx vitest run src/lib/reports/assemble.test.ts`
Expected: PASS (2 tests).

- [ ] **Step 7: Commit**

```bash
git add package.json package-lock.json src/lib/reports/assemble.ts src/lib/reports/assemble.test.ts
git commit -m "Add report assembly function joining daily_reports with child tables"
```

---

### Task 5: Report view component

**Files:**
- Create: `src/components/report-view/ReportView.tsx`

**Interfaces:**
- Consumes: `ReportPayload` from Task 3; `PageHeader`, `Badge` from
  `src/components/ui.tsx` (reuses the existing design tokens — no raw colors).
- Produces: `<ReportView payload={ReportPayload} />` — Task 6 renders this to
  HTML/PDF; the Task 9 detail page can also render it on-screen.

- [ ] **Step 1: Write the component**

```tsx
// src/components/report-view/ReportView.tsx
import { Badge } from "@/components/ui";
import type { ReportPayload } from "@/types";

function fmtPct(v: number | null | undefined) {
  return v === null || v === undefined ? "—" : `${v}%`;
}

export function ReportView({ payload }: { payload: ReportPayload }) {
  const { report, workforce, activities, safety } = payload;

  return (
    <div className="flex flex-col gap-6 bg-bg p-8 text-ink">
      <header className="flex flex-wrap items-start justify-between gap-4 border-b border-line pb-4">
        <div>
          <h1 className="text-xl font-bold">{payload.projectName}</h1>
          <p className="text-sm text-muted">
            {payload.contractorName}
            {payload.contractorShortCode ? ` (${payload.contractorShortCode})` : ""}
          </p>
        </div>
        <div className="text-right text-sm text-muted">
          <p>วันที่ {report.report_date}</p>
          <p>เลขที่รายงาน {report.report_number ?? "—"}</p>
        </div>
      </header>

      <section className="grid grid-cols-2 gap-4 text-sm sm:grid-cols-4">
        <div>
          <p className="text-xs text-muted">เวลาเริ่ม/เลิก</p>
          <p className="font-semibold">
            {report.time_start ?? "—"} – {report.time_finish ?? "—"}
          </p>
        </div>
        <div>
          <p className="text-xs text-muted">OT (ชม.)</p>
          <p className="font-semibold">{report.overtime_hours ?? "—"}</p>
        </div>
        <div>
          <p className="text-xs text-muted">ความก้าวหน้าสะสม (แผน)</p>
          <p className="font-semibold">{fmtPct(report.cumulative_plan_pct)}</p>
        </div>
        <div>
          <p className="text-xs text-muted">ความก้าวหน้าสะสม (จริง)</p>
          <p className="font-semibold">{fmtPct(report.cumulative_actual_pct)}</p>
        </div>
      </section>

      <section>
        <h2 className="text-base font-bold">กำลังคน (Workforce)</h2>
        {workforce.length === 0 ? (
          <p className="mt-2 text-sm text-muted">ไม่มีข้อมูล</p>
        ) : (
          <table className="mt-2 w-full text-left text-sm">
            <thead>
              <tr className="border-b border-line text-xs text-muted">
                <th className="py-1">ตำแหน่ง</th>
                <th className="py-1">ชาย</th>
                <th className="py-1">หญิง</th>
              </tr>
            </thead>
            <tbody>
              {workforce.map((w) => (
                <tr key={w.id} className="border-b border-line">
                  <td className="py-1">{w.role_name}</td>
                  <td className="py-1">{w.male_count}</td>
                  <td className="py-1">{w.female_count}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

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
    </div>
  );
}
```

- [ ] **Step 2: Verify it compiles**

Run: `npx tsc --noEmit`
Expected: no new errors.

- [ ] **Step 3: Commit**

```bash
git add src/components/report-view/ReportView.tsx
git commit -m "Add ReportView presentational component for export rendering"
```

---

### Task 6: PDF renderer

**Files:**
- Create: `src/lib/reports/render-pdf.ts`
- Test: `src/lib/reports/render-pdf.test.ts`

**Interfaces:**
- Consumes: `ReportPayload` from Task 3; `ReportView` from Task 5.
- Produces: `renderReportPdf(payload: ReportPayload): Promise<Buffer>` — Task 8's
  API route calls this.

- [ ] **Step 1: Install Playwright and its browser binary**

Run:
```bash
npm install playwright
npx playwright install chromium
```

- [ ] **Step 2: Write the test**

This is a smoke test — asserting exact pixel/text output from a headless-browser
PDF render isn't practical, but asserting a well-formed, non-empty PDF is a real,
automatable check.

```typescript
// src/lib/reports/render-pdf.test.ts
import { describe, expect, it } from "vitest";
import { renderReportPdf } from "./render-pdf";
import type { ReportPayload } from "@/types";

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
};

describe("renderReportPdf", () => {
  it("produces a non-empty, well-formed PDF buffer", async () => {
    const buffer = await renderReportPdf(samplePayload);
    expect(buffer.length).toBeGreaterThan(1000);
    expect(buffer.subarray(0, 4).toString("ascii")).toBe("%PDF");
  }, 30_000);
});
```

- [ ] **Step 3: Run it to verify it fails**

Run: `npx vitest run src/lib/reports/render-pdf.test.ts`
Expected: FAIL — `Cannot find module './render-pdf'`.

- [ ] **Step 4: Implement**

```typescript
// src/lib/reports/render-pdf.ts
import { chromium } from "playwright";
import { renderToStaticMarkup } from "react-dom/server";
import { ReportView } from "@/components/report-view/ReportView";
import type { ReportPayload } from "@/types";

export async function renderReportPdf(payload: ReportPayload): Promise<Buffer> {
  const bodyHtml = renderToStaticMarkup(ReportView({ payload }));
  const html = `<!doctype html>
<html lang="th">
<head>
  <meta charset="utf-8" />
  <style>
    body { font-family: "Noto Sans Thai", Inter, sans-serif; }
    :root {
      --bg: #ffffff; --ink: #1a1f14; --muted: #6b6f61; --line: #d9ddcf;
      --surface2: #eceee4;
    }
    .bg-bg { background: var(--bg); } .text-ink { color: var(--ink); }
    .text-muted { color: var(--muted); } .border-line { border-color: var(--line); }
  </style>
</head>
<body>${bodyHtml}</body>
</html>`;

  const browser = await chromium.launch();
  try {
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: "networkidle" });
    const pdf = await page.pdf({ format: "A4", printBackground: true });
    return pdf;
  } finally {
    await browser.close();
  }
}
```

- [ ] **Step 5: Run it to verify it passes**

Run: `npx vitest run src/lib/reports/render-pdf.test.ts`
Expected: PASS (1 test). If Chromium fails to launch, re-run
`npx playwright install chromium` and try again.

- [ ] **Step 6: Commit**

```bash
git add package.json package-lock.json src/lib/reports/render-pdf.ts src/lib/reports/render-pdf.test.ts
git commit -m "Add PDF renderer using Playwright to print ReportView to PDF"
```

---

### Task 7: Excel renderer

**Files:**
- Create: `src/lib/reports/render-xlsx.ts`
- Test: `src/lib/reports/render-xlsx.test.ts`

**Interfaces:**
- Consumes: `ReportPayload` from Task 3.
- Produces: `renderReportXlsx(payload: ReportPayload): Promise<Buffer>` — Task
  8's API route calls this.

- [ ] **Step 1: Install exceljs**

Run: `npm install exceljs`

- [ ] **Step 2: Write the test**

```typescript
// src/lib/reports/render-xlsx.test.ts
import { describe, expect, it } from "vitest";
import ExcelJS from "exceljs";
import { renderReportXlsx } from "./render-xlsx";
import type { ReportPayload } from "@/types";

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
};

describe("renderReportXlsx", () => {
  it("produces a workbook with a Report sheet containing the header and activities", async () => {
    const buffer = await renderReportXlsx(samplePayload);
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(buffer);

    const sheet = workbook.getWorksheet("Report");
    expect(sheet).toBeDefined();
    const values = sheet!.getSheetValues().flat().filter(Boolean).map(String);
    expect(values).toContain("STS-9.9 MW Biomass Power Plant");
    expect(values).toContain("งานเชื่อม");
  });
});
```

- [ ] **Step 3: Run it to verify it fails**

Run: `npx vitest run src/lib/reports/render-xlsx.test.ts`
Expected: FAIL — `Cannot find module './render-xlsx'`.

- [ ] **Step 4: Implement**

```typescript
// src/lib/reports/render-xlsx.ts
import ExcelJS from "exceljs";
import type { ReportPayload } from "@/types";

export async function renderReportXlsx(payload: ReportPayload): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet("Report");

  sheet.addRow(["Project", payload.projectName, payload.projectCode ?? ""]);
  sheet.addRow(["Contractor", payload.contractorName, payload.contractorShortCode ?? ""]);
  sheet.addRow(["Report Date", payload.report.report_date]);
  sheet.addRow(["Report Type", payload.report.report_type]);
  sheet.addRow(["Cumulative Plan %", payload.report.cumulative_plan_pct ?? ""]);
  sheet.addRow(["Cumulative Actual %", payload.report.cumulative_actual_pct ?? ""]);
  sheet.addRow([]);

  sheet.addRow(["Workforce"]);
  sheet.addRow(["Role", "Male", "Female"]);
  for (const w of payload.workforce) {
    sheet.addRow([w.role_name, w.male_count, w.female_count]);
  }
  sheet.addRow([]);

  sheet.addRow(["Activities"]);
  sheet.addRow(["Area", "Description", "Plan %", "Actual %", "Supervisor"]);
  for (const a of payload.activities) {
    sheet.addRow([a.area ?? "", a.description, a.planned_progress ?? "", a.actual_progress ?? "", a.supervisor ?? ""]);
  }

  const arrayBuffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(arrayBuffer);
}
```

- [ ] **Step 5: Run it to verify it passes**

Run: `npx vitest run src/lib/reports/render-xlsx.test.ts`
Expected: PASS (1 test).

- [ ] **Step 6: Commit**

```bash
git add package.json package-lock.json src/lib/reports/render-xlsx.ts src/lib/reports/render-xlsx.test.ts
git commit -m "Add Excel renderer for report export"
```

---

### Task 8: Export API route

**Files:**
- Create: `src/app/api/reports/[id]/export/route.ts`

**Interfaces:**
- Consumes: `assembleReportPayload` (Task 4), `renderReportPdf` (Task 6),
  `renderReportXlsx` (Task 7), `createClient` from `src/lib/supabase/server.ts`.
- Produces: `GET /api/reports/:id/export?format=pdf|xlsx` — Task 9's UI links to
  this.

- [ ] **Step 1: Write the route**

```typescript
// src/app/api/reports/[id]/export/route.ts
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { assembleReportPayload } from "@/lib/reports/assemble";
import { renderReportPdf } from "@/lib/reports/render-pdf";
import { renderReportXlsx } from "@/lib/reports/render-xlsx";

function filenameFor(payload: Awaited<ReturnType<typeof assembleReportPayload>>, ext: string) {
  if (!payload) return `report.${ext}`;
  const project = payload.projectCode ?? "PROJECT";
  const contractor = payload.contractorShortCode ?? "CONTRACTOR";
  const date = payload.report.report_date;
  const number = payload.report.report_number ?? "000";
  return `${project}_${contractor}_DAILY_${date}_${number}.${ext}`;
}

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  const format = request.nextUrl.searchParams.get("format");
  if (format !== "pdf" && format !== "xlsx") {
    return NextResponse.json(
      { error: "format must be 'pdf' or 'xlsx'" },
      { status: 400 },
    );
  }

  const supabase = createClient();
  const payload = await assembleReportPayload(supabase, params.id);

  if (!payload) {
    return NextResponse.json({ error: "report not found" }, { status: 404 });
  }
  if (payload.report.status !== "submitted") {
    return NextResponse.json(
      { error: "only submitted reports can be exported" },
      { status: 403 },
    );
  }

  const buffer =
    format === "pdf" ? await renderReportPdf(payload) : await renderReportXlsx(payload);
  const filename = filenameFor(payload, format);
  const contentType =
    format === "pdf"
      ? "application/pdf"
      : "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

  return new NextResponse(buffer, {
    headers: {
      "Content-Type": contentType,
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
```

- [ ] **Step 2: Verify it compiles**

Run: `npx tsc --noEmit`
Expected: no new errors.

- [ ] **Step 3: Manual verification against the seeded report**

Run: `npm run dev`, then in another terminal:
```bash
curl -i "http://localhost:3000/api/reports/00000000-0000-0000-0000-000000000001/export?format=pdf" -o /tmp/test-report.pdf
curl -i "http://localhost:3000/api/reports/00000000-0000-0000-0000-000000000001/export?format=xlsx" -o /tmp/test-report.xlsx
```
Expected: both return `200`, `Content-Disposition` header with the standardized
filename, and non-empty files. (This requires being authenticated with a session
whose `user_project_access` covers the STSBPP/RETS report, or a `head_office_admin`
profile — set up per the existing auth flow.)

- [ ] **Step 4: Commit**

```bash
git add src/app/api/reports/[id]/export/route.ts
git commit -m "Add report export API route (PDF/Excel)"
```

---

### Task 9: Minimal report detail page with export links

**Files:**
- Create: `src/app/daily-report/[id]/page.tsx`

**Interfaces:**
- Consumes: `assembleReportPayload` (Task 4), `ReportView` (Task 5),
  `createClient` from `src/lib/supabase/server.ts`, `PageHeader`, `ButtonLink`
  from `src/components/ui.tsx`.
- Produces: `/daily-report/:id` — a real, navigable page an EPS/contractor user
  can reach with the seeded report's ID today, without waiting on the History
  list (tracked separately) or the form's own save flow (Slice 4, tracked
  separately) to exist.

- [ ] **Step 1: Write the page**

```tsx
// src/app/daily-report/[id]/page.tsx
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { assembleReportPayload } from "@/lib/reports/assemble";
import { ReportView } from "@/components/report-view/ReportView";
import { ButtonLink, PageHeader } from "@/components/ui";

export default async function DailyReportDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const supabase = createClient();
  const payload = await assembleReportPayload(supabase, params.id);

  if (!payload) notFound();

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title={`รายงานประจำวัน ${payload.report.report_date}`}
        description={`${payload.contractorName} · ${payload.report.report_type}`}
        actions={
          payload.report.status === "submitted" ? (
            <>
              <ButtonLink
                href={`/api/reports/${payload.report.id}/export?format=pdf`}
                variant="secondary"
              >
                ดาวน์โหลด PDF
              </ButtonLink>
              <ButtonLink
                href={`/api/reports/${payload.report.id}/export?format=xlsx`}
                variant="secondary"
              >
                ดาวน์โหลด Excel
              </ButtonLink>
            </>
          ) : undefined
        }
      />
      <ReportView payload={payload} />
    </div>
  );
}
```

- [ ] **Step 2: Verify it renders**

Run: `npm run dev`, then open
`http://localhost:3000/daily-report/00000000-0000-0000-0000-000000000001` while
signed in as a user whose access covers the seeded report.
Expected: page shows the report header, workforce table, activities table, safety
note, and two working download links.

- [ ] **Step 3: Commit**

```bash
git add src/app/daily-report/\[id\]/page.tsx
git commit -m "Add minimal report detail page with export download links"
```

---

## Self-review notes

- **Spec coverage**: PDF export (Task 6/8), Excel export (Task 7/8), file naming
  (Task 8's `filenameFor`), only-submitted-reports rule (Task 8), RLS-respecting
  access (all Supabase calls go through the existing server client) — all covered.
  Bulk/History export and the AI summary add-on from the spec are intentionally
  not tasked here — both were explicitly out of scope for "start implementing it
  now" against a single seeded report; revisit once the History list itself
  exists.
- **Type consistency checked**: `ReportPayload` (Task 3) is the one shape
  `assemble.ts` (Task 4), `ReportView` (Task 5), `render-pdf.ts` (Task 6), and
  `render-xlsx.ts` (Task 7) all consume — field names match across every task.
