# Daily Report Save + Photo Attachments Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Wire the Daily Report form's real save (the deferred "Slice 4"), then let
users attach progress/safety photos that appear in both the PDF export
(numbered grids matching the sample template) and the Excel export (a listed
Photos section).

**Architecture:** New INSERT RLS policies unlock a real client-side Supabase
insert flow in the existing form. Photos upload directly from the browser to a
new private Storage bucket, tagged by category, then get attached to
`assembleReportPayload`'s output (already the single source `ReportView`, the
PDF renderer, and the Excel renderer all consume) as signed URLs.

**Tech Stack:** Same as the export feature — Next.js 14 App Router, Supabase
(Postgres + RLS + Storage), the existing `assemble`/`render-pdf`/`render-xlsx`
pipeline.

**Spec:** `docs/superpowers/specs/2026-09-10-daily-report-save-and-photos-design.md`

## Global Constraints

- No invented data — this plan adds no seed rows; verification creates a real
  report through the real UI.
- All Supabase access from client code uses the existing anon-key browser
  client (`src/lib/supabase/client.ts`) or server client
  (`src/lib/supabase/server.ts`) — never a service-role key.
- Follows the existing design-token system (`src/components/ui.tsx` /
  `globals.css`) — no raw Tailwind palette classes.
- **Out of scope** (see spec for full reasoning, do not build any of this):
  the sample PDFs' page-2 site-layout diagram; photo retention/deletion;
  editing or resubmitting a saved report; multi-project or discipline
  selection UI; restructuring `daily_report_safety`'s structured fields
  (`accident_status`/`accident_free_days` stay `null`; the form's one
  free-text field saves into `remarks`).
- Submission is restricted to signed-in `contractor_user`s with a
  `profiles.contractor_id` — `site_admin`/`head_office_admin` previewing the
  form see a clear message instead of a broken insert.

---

### Task 1: Migration — INSERT policies, own-report SELECT policies, photo storage

**Files:**
- Create: `supabase/migrations/0003_daily_report_save_and_photos.sql`

**Interfaces:**
- Produces: working INSERT access on `daily_reports`/`daily_report_workforce`/
  `daily_report_activities`/`daily_report_safety`/`attachments` for the
  report's own creator; working SELECT access on those same tables for a
  report's own creator (this is a real, necessary addition beyond what the
  spec's schema table lists — without it, a `contractor_user` who just
  submitted a report cannot view it afterward, because the existing SELECT
  policies from `0002_export_support.sql` only grant visibility via
  `user_project_access`, which has zero rows); `attachments.kind` column; the
  `daily-report-photos` Storage bucket with read/write policies scoped by the
  report id embedded in the object path.

- [ ] **Step 1: Write the migration**

```sql
-- supabase/migrations/0003_daily_report_save_and_photos.sql
-- Daily Report Save + Photo Attachments — schema additions.
-- See docs/superpowers/specs/2026-09-10-daily-report-save-and-photos-design.md

alter table attachments
  add column kind text check (kind in ('progress_photo', 'safety_photo'));

-- ==========================================================
-- INSERT policies: a contractor_user may create a report only for their own
-- contractor; site_admin/head_office_admin may create for any contractor.
-- Deliberately does not depend on user_project_access (empty today, and has
-- a known structural bug tracked separately against the Roles/permissions
-- slice) — sidestepping it here keeps Slice 4 from inheriting that bug.
-- ==========================================================

create policy daily_reports_insert on daily_reports for insert
  with check (
    created_by = auth.uid()
    and exists (
      select 1 from profiles p
      where p.id = auth.uid()
        and (
          p.role in ('head_office_admin', 'site_admin')
          or (p.role = 'contractor_user' and p.contractor_id = daily_reports.contractor_id)
        )
    )
  );

create policy daily_report_workforce_insert on daily_report_workforce for insert
  with check (
    exists (
      select 1 from daily_reports dr
      where dr.id = daily_report_workforce.daily_report_id
        and dr.created_by = auth.uid()
    )
  );

create policy daily_report_activities_insert on daily_report_activities for insert
  with check (
    exists (
      select 1 from daily_reports dr
      where dr.id = daily_report_activities.daily_report_id
        and dr.created_by = auth.uid()
    )
  );

create policy daily_report_safety_insert on daily_report_safety for insert
  with check (
    exists (
      select 1 from daily_reports dr
      where dr.id = daily_report_safety.daily_report_id
        and dr.created_by = auth.uid()
    )
  );

create policy attachments_insert on attachments for insert
  with check (
    daily_report_id is not null
    and exists (
      select 1 from daily_reports dr
      where dr.id = attachments.daily_report_id
        and dr.created_by = auth.uid()
    )
  );

-- ==========================================================
-- Own-report SELECT policies: additional permissive policies are OR'd with
-- the existing ones from 0002_export_support.sql, so this purely adds "you
-- can always read what you created" without narrowing any existing access.
-- ==========================================================

create policy daily_reports_select_own on daily_reports for select
  using (created_by = auth.uid());

create policy daily_report_workforce_select_own on daily_report_workforce for select
  using (
    exists (
      select 1 from daily_reports dr
      where dr.id = daily_report_workforce.daily_report_id
        and dr.created_by = auth.uid()
    )
  );

create policy daily_report_activities_select_own on daily_report_activities for select
  using (
    exists (
      select 1 from daily_reports dr
      where dr.id = daily_report_activities.daily_report_id
        and dr.created_by = auth.uid()
    )
  );

create policy daily_report_safety_select_own on daily_report_safety for select
  using (
    exists (
      select 1 from daily_reports dr
      where dr.id = daily_report_safety.daily_report_id
        and dr.created_by = auth.uid()
    )
  );

create policy attachments_select on attachments for select
  using (
    exists (
      select 1 from daily_reports dr
      where dr.id = attachments.daily_report_id
        and (
          dr.created_by = auth.uid()
          or exists (select 1 from profiles p where p.id = auth.uid() and p.role = 'head_office_admin')
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

-- ==========================================================
-- Photo storage. Path convention: {daily_report_id}/{kind}/{filename}.
-- storage.foldername(name) is Supabase's documented helper for splitting an
-- object path into its folder segments; storage.objects already has RLS
-- enabled by default on every Supabase project.
-- ==========================================================

insert into storage.buckets (id, name, public)
values ('daily-report-photos', 'daily-report-photos', false)
on conflict (id) do nothing;

create policy daily_report_photos_insert on storage.objects for insert
  with check (
    bucket_id = 'daily-report-photos'
    and exists (
      select 1 from daily_reports dr
      where dr.id::text = (storage.foldername(name))[1]
        and dr.created_by = auth.uid()
    )
  );

create policy daily_report_photos_select on storage.objects for select
  using (
    bucket_id = 'daily-report-photos'
    and exists (
      select 1 from daily_reports dr
      where dr.id::text = (storage.foldername(name))[1]
        and (
          dr.created_by = auth.uid()
          or exists (select 1 from profiles p where p.id = auth.uid() and p.role = 'head_office_admin')
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
```

- [ ] **Step 2: Apply the migration**

Run: `supabase db push`
Note: this requires `SUPABASE_ACCESS_TOKEN` and re-running `supabase link
--project-ref wzxadsilewovzktaaiul` in this worktree first (its Supabase CLI
link state is separate from the main checkout's). Applying this to the live
shared database is the same "controller runs it, not the implementer" split
used for every migration in the export feature plan — the implementer writes
and commits the file only; the controller applies it after review.

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/0003_daily_report_save_and_photos.sql
git commit -m "Add INSERT/own-SELECT RLS policies and photo storage bucket"
```

---

### Task 2: Types for photo attachments

**Files:**
- Modify: `src/types/index.ts`

**Interfaces:**
- Produces: `DailyReportAttachment`, and `ReportPayload.attachments:
  DailyReportAttachment[]` — Task 3 (`assemble.ts`), Task 4 (`ReportView`),
  and Task 5 (`render-xlsx.ts`) all import/consume this.

- [ ] **Step 1: Add the type and extend `ReportPayload`**

Append to `src/types/index.ts`, and add the `attachments` field to the
existing `ReportPayload` interface:

```typescript
export interface DailyReportAttachment {
  id: string;
  daily_report_id: string;
  kind: 'progress_photo' | 'safety_photo';
  storage_path: string;
  url?: string | null;
}
```

Modify the existing `ReportPayload` interface (do not duplicate it — add one
field to the one already in the file):

```typescript
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

- [ ] **Step 2: Verify it compiles**

Run: `npx tsc --noEmit`
Expected: new errors in `assemble.ts`/`render-pdf.test.ts`/`render-xlsx.test.ts`
are expected at this point (they construct `ReportPayload` literals that don't
yet have `attachments`) — Tasks 3, 4, 5 fix those. Confirm the only new errors
are "Property 'attachments' is missing" in those specific files, nothing else.

- [ ] **Step 3: Commit**

```bash
git add src/types/index.ts
git commit -m "Add DailyReportAttachment type and ReportPayload.attachments field"
```

---

### Task 3: Fetch attachments with signed URLs in `assembleReportPayload`

**Files:**
- Modify: `src/lib/reports/assemble.ts`
- Modify: `src/lib/reports/assemble.test.ts`

**Interfaces:**
- Consumes: `DailyReportAttachment` from Task 2.
- Produces: `assembleReportPayload`'s return value now includes
  `attachments: DailyReportAttachment[]`, each with `url` set to a 5-minute
  signed URL (or `null` if signing failed) — Task 4 (`ReportView`) and Task 5
  (`render-xlsx.ts`) both read `payload.attachments`.

- [ ] **Step 1: Update the test's Supabase stub and add an attachments case**

The existing stub in `assemble.test.ts` needs a `storage` property and an
`attachments` table branch. Update the `makeSupabaseStub` helper and both
existing test cases to pass an `attachments` array (empty for the "not found"
case), and add this new test:

```typescript
// add inside the existing describe("assembleReportPayload", ...) block
it("attaches signed URLs to each photo attachment", async () => {
  const supabase = makeSupabaseStub({
    report: {
      id: "r1", project_id: "p1", contractor_id: "c1", report_date: "2026-09-04",
      report_type: "end_of_day_actual", status: "submitted", created_at: "2026-09-04T10:00:00Z",
    },
    project: { name: "STS-9.9 MW Biomass Power Plant", code: "STSBPP" },
    contractor: { name: "RETS", short_code: "RETS" },
    workforce: [], activities: [], safety: null,
    attachments: [
      { id: "a1", daily_report_id: "r1", kind: "progress_photo", storage_path: "r1/progress_photo/1-photo.jpg" },
    ],
  });

  const payload = await assembleReportPayload(supabase as any, "r1");

  expect(payload!.attachments).toHaveLength(1);
  expect(payload!.attachments[0].url).toBe("https://signed.example/r1/progress_photo/1-photo.jpg");
});
```

Update `makeSupabaseStub` to accept `attachments: any[]` in its `overrides`
parameter, return it from the `daily_report_workforce`/`daily_report_activities`-style
`then()` branch when `table === "attachments"`, and add a `storage` property
to the returned stub object:

```typescript
storage: {
  from: () => ({
    createSignedUrl: async (path: string) => ({
      data: { signedUrl: `https://signed.example/${path}` },
      error: null,
    }),
  }),
},
```

Update the two existing test cases ("joins the report..." and "returns null
when...") to pass `attachments: []` in their `overrides` so the stub's shape
stays consistent across all three tests.

- [ ] **Step 2: Run it to verify the new test fails**

Run: `npx vitest run src/lib/reports/assemble.test.ts`
Expected: FAIL — `payload.attachments` is `undefined` (the implementation
doesn't fetch attachments yet).

- [ ] **Step 3: Implement**

```typescript
// src/lib/reports/assemble.ts
import type {
  DailyReport,
  DailyReportActivity,
  DailyReportAttachment,
  DailyReportSafety,
  DailyReportWorkforce,
  ReportPayload,
} from "@/types";

type SupabaseLike = {
  from: (table: string) => any;
  storage: {
    from: (bucket: string) => {
      createSignedUrl: (
        path: string,
        expiresIn: number,
      ) => Promise<{ data: { signedUrl: string } | null; error: any }>;
    };
  };
};

export async function assembleReportPayload(
  supabase: SupabaseLike,
  reportId: string,
): Promise<ReportPayload | null> {
  const { data: report, error: reportError } = await supabase
    .from("daily_reports")
    .select("*")
    .eq("id", reportId)
    .single();

  if (reportError && reportError.code !== "PGRST116") throw reportError;
  if (!report) return null;

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
    supabase.from("attachments").select("*").eq("daily_report_id", reportId),
  ]);

  const attachments: DailyReportAttachment[] = await Promise.all(
    ((attachmentsRes.data ?? []) as DailyReportAttachment[]).map(async (a) => {
      const { data: signed } = await supabase.storage
        .from("daily-report-photos")
        .createSignedUrl(a.storage_path, 300);
      return { ...a, url: signed?.signedUrl ?? null };
    }),
  );

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

- [ ] **Step 4: Run it to verify it passes**

Run: `npx vitest run src/lib/reports/assemble.test.ts`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add src/lib/reports/assemble.ts src/lib/reports/assemble.test.ts
git commit -m "Fetch photo attachments with signed URLs in assembleReportPayload"
```

---

### Task 4: Photo sections in `ReportView`

**Files:**
- Modify: `src/components/report-view/ReportView.tsx`

**Interfaces:**
- Consumes: `payload.attachments` from Task 3.
- Produces: two new visual sections — Task 6's PDF renderer (which server-renders
  this exact component) and the detail page both pick this up automatically,
  no changes needed there.

- [ ] **Step 1: Add the photo sections**

Add these two sections to `ReportView.tsx`, after the existing Safety section
(right before the component's closing `</div>`):

```tsx
{payload.attachments.some((a) => a.kind === "progress_photo") && (
  <section>
    <h2 className="text-base font-bold">รูปความคืบหน้า (Progress Photos)</h2>
    <div className="mt-2 grid grid-cols-2 gap-3 sm:grid-cols-3">
      {payload.attachments
        .filter((a) => a.kind === "progress_photo" && a.url)
        .map((a, i) => (
          <div key={a.id} className="flex flex-col gap-1">
            <img
              src={a.url ?? undefined}
              alt={`รูปความคืบหน้า No.${i + 1}`}
              className="h-32 w-full rounded-md border border-line object-cover"
            />
            <span className="text-xs text-muted">No.{i + 1}</span>
          </div>
        ))}
    </div>
  </section>
)}

{payload.attachments.some((a) => a.kind === "safety_photo") && (
  <section>
    <h2 className="text-base font-bold">รูปความปลอดภัย (Safety Photos)</h2>
    <div className="mt-2 grid grid-cols-2 gap-3 sm:grid-cols-3">
      {payload.attachments
        .filter((a) => a.kind === "safety_photo" && a.url)
        .map((a, i) => (
          <div key={a.id} className="flex flex-col gap-1">
            <img
              src={a.url ?? undefined}
              alt={`รูปความปลอดภัย No.${i + 1}`}
              className="h-32 w-full rounded-md border border-line object-cover"
            />
            <span className="text-xs text-muted">No.{i + 1}</span>
          </div>
        ))}
    </div>
  </section>
)}
```

- [ ] **Step 2: Verify it compiles**

Run: `npx tsc --noEmit`
Expected: no errors from this file (the `assemble.ts`/test-file errors from
Task 2's Step 2 about missing `attachments` should now also be gone for
`assemble.ts`, since Task 3 fixed it).

- [ ] **Step 3: Commit**

```bash
git add src/components/report-view/ReportView.tsx
git commit -m "Add numbered progress/safety photo sections to ReportView"
```

---

### Task 5: Photos section in the Excel export

**Files:**
- Modify: `src/lib/reports/render-xlsx.ts`
- Modify: `src/lib/reports/render-xlsx.test.ts`

**Interfaces:**
- Consumes: `payload.attachments` from Task 3.

- [ ] **Step 1: Write the failing test**

Add to the existing `samplePayload` in `render-xlsx.test.ts` an `attachments`
array, and add a new test:

```typescript
// add to samplePayload:
attachments: [
  { id: "att1", daily_report_id: "r1", kind: "progress_photo", storage_path: "r1/progress_photo/1-crane.jpg", url: null },
  { id: "att2", daily_report_id: "r1", kind: "safety_photo", storage_path: "r1/safety_photo/1-ppe-check.jpg", url: null },
],

// new test, inside the existing describe block:
it("lists photo attachments by category and filename", async () => {
  const buffer = await renderReportXlsx(samplePayload);
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(buffer as unknown as ArrayBuffer);

  const sheet = workbook.getWorksheet("Report");
  const values = sheet!.getSheetValues().flat().filter(Boolean).map(String);
  expect(values).toContain("Progress Photo");
  expect(values).toContain("1-crane.jpg");
  expect(values).toContain("Safety Photo");
  expect(values).toContain("1-ppe-check.jpg");
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `npx vitest run src/lib/reports/render-xlsx.test.ts`
Expected: FAIL — the "Photo" strings aren't in the output yet.

- [ ] **Step 3: Implement**

Add to the end of `renderReportXlsx` in `render-xlsx.ts`, before the
`workbook.xlsx.writeBuffer()` call:

```typescript
sheet.addRow([]);
sheet.addRow(["Photos"]);
if (payload.attachments.length > 0) {
  sheet.addRow(["Category", "Filename"]);
  for (const a of payload.attachments) {
    const filename = a.storage_path.split("/").pop() ?? a.storage_path;
    const category = a.kind === "progress_photo" ? "Progress Photo" : "Safety Photo";
    sheet.addRow([category, filename]);
  }
} else {
  sheet.addRow(["No data"]);
}
```

- [ ] **Step 4: Run it to verify it passes**

Run: `npx vitest run src/lib/reports/render-xlsx.test.ts`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add src/lib/reports/render-xlsx.ts src/lib/reports/render-xlsx.test.ts
git commit -m "List photo attachments by category in the Excel export"
```

---

### Task 6: Photo upload UI on the Daily Report form

**Files:**
- Modify: `src/app/daily-report/report-form.tsx`

**Interfaces:**
- Produces: local component state `progressPhotos`/`safetyPhotos: PhotoFile[]`
  (`PhotoFile = { file: File; previewUrl: string }`) that Task 7's submit
  handler reads and uploads. This task is UI/state only — no Supabase calls.

- [ ] **Step 1: Add photo state and a reusable picker sub-component**

Add near the top of `report-form.tsx`, after the existing `ActivityRow`
interface:

```typescript
interface PhotoFile {
  file: File;
  previewUrl: string;
}

function PhotoPicker({
  label,
  photos,
  onAdd,
  onRemove,
}: {
  label: string;
  photos: PhotoFile[];
  onAdd: (files: FileList | null) => void;
  onRemove: (index: number) => void;
}) {
  return (
    <div className="flex flex-col gap-3">
      <label className="text-sm font-semibold">{label}</label>
      <input
        type="file"
        accept="image/*"
        multiple
        onChange={(e) => onAdd(e.target.files)}
        className="text-sm file:mr-3 file:rounded-md file:border file:border-line file:bg-surface file:px-3 file:py-2 file:text-sm file:font-semibold file:text-ink hover:file:bg-surface2"
      />
      {photos.length > 0 && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {photos.map((p, i) => (
            <div key={p.previewUrl} className="flex flex-col gap-1 rounded-md border border-line bg-surface p-2">
              <img src={p.previewUrl} alt="" className="h-24 w-full rounded object-cover" />
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted">No.{i + 1}</span>
                <Button type="button" variant="ghost" size="sm" onClick={() => onRemove(i)} aria-label={`ลบรูปที่ ${i + 1}`}>
                  ลบ
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Wire the state and picker into the form**

Inside `ReportForm`, add state next to the existing `safetyNotes` state:

```typescript
const [progressPhotos, setProgressPhotos] = useState<PhotoFile[]>([]);
const [safetyPhotos, setSafetyPhotos] = useState<PhotoFile[]>([]);

function addPhotos(files: FileList | null, setter: React.Dispatch<React.SetStateAction<PhotoFile[]>>) {
  if (!files) return;
  const next = Array.from(files).map((file) => ({ file, previewUrl: URL.createObjectURL(file) }));
  setter((prev) => [...prev, ...next]);
}

function removePhoto(index: number, setter: React.Dispatch<React.SetStateAction<PhotoFile[]>>) {
  setter((prev) => {
    URL.revokeObjectURL(prev[index].previewUrl);
    return prev.filter((_, i) => i !== index);
  });
}
```

Add a new section after the existing `<section aria-labelledby="safety">`
section, before the `{reviewed ? (...) : (...)}` block:

```tsx
<section aria-labelledby="photos" className="flex flex-col gap-4">
  <h2 id="photos" className="text-lg font-bold">
    รูปภาพประกอบ (Photos)
  </h2>
  <PhotoPicker
    label="รูปความคืบหน้า (Progress Photos)"
    photos={progressPhotos}
    onAdd={(files) => addPhotos(files, setProgressPhotos)}
    onRemove={(i) => removePhoto(i, setProgressPhotos)}
  />
  <PhotoPicker
    label="รูปความปลอดภัย (Safety Photos)"
    photos={safetyPhotos}
    onAdd={(files) => addPhotos(files, setSafetyPhotos)}
    onRemove={(i) => removePhoto(i, setSafetyPhotos)}
  />
</section>
```

- [ ] **Step 3: Verify it compiles and renders**

Run: `npx tsc --noEmit` — expect clean.
Run: `npm run dev`, open `http://localhost:3000/daily-report`, confirm the new
"รูปภาพประกอบ (Photos)" section appears with two file pickers, adding files
shows thumbnails numbered No.1/No.2/..., and "ลบ" removes the right one.

- [ ] **Step 4: Commit**

```bash
git add src/app/daily-report/report-form.tsx
git commit -m "Add photo upload UI (progress/safety pickers) to the report form"
```

---

### Task 7: Wire the real save (Slice 4) + photo upload + redirect

**Files:**
- Modify: `src/app/daily-report/report-form.tsx`

**Interfaces:**
- Consumes: `progressPhotos`/`safetyPhotos` state from Task 6; the Storage
  bucket and RLS policies from Task 1 (must be applied to the live database
  before this task can be verified end-to-end); `createClient` from
  `src/lib/supabase/client.ts`; the existing `/daily-report/[id]` detail page.
- Produces: a real, working submit flow — the last piece of this plan.

- [ ] **Step 1: Add the submit handler**

Add imports at the top of `report-form.tsx`:

```typescript
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
```

Inside `ReportForm`, add state and the `router` hook next to the existing
`errors`/`reviewed` state:

```typescript
const router = useRouter();
const [submitting, setSubmitting] = useState(false);
const [submitError, setSubmitError] = useState<string | null>(null);
```

Add the submit function (place it after `onReview`):

```typescript
async function onSubmit() {
  setSubmitting(true);
  setSubmitError(null);
  try {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setSubmitError("กรุณาเข้าสู่ระบบก่อนส่งรายงาน");
      return;
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("contractor_id, role")
      .eq("id", user.id)
      .single();
    if (!profile || profile.role !== "contractor_user" || !profile.contractor_id) {
      setSubmitError("เฉพาะผู้ใช้งานระดับผู้รับเหมาเท่านั้นที่ส่งรายงานได้ในขณะนี้");
      return;
    }

    const { data: project } = await supabase
      .from("projects")
      .select("id")
      .order("created_at", { ascending: true })
      .limit(1)
      .single();
    if (!project) {
      setSubmitError("ไม่พบข้อมูลโครงการ");
      return;
    }

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
    if (reportError || !report) {
      setSubmitError(`บันทึกรายงานไม่สำเร็จ: ${reportError?.message ?? "unknown error"}`);
      return;
    }

    const workforceRows = workforce
      .filter((r) => r.role.trim())
      .map((r) => ({
        daily_report_id: report.id,
        role_name: r.role.trim(),
        male_count: toCount(r.male) ?? 0,
        female_count: toCount(r.female) ?? 0,
      }));
    if (workforceRows.length > 0) {
      const { error } = await supabase.from("daily_report_workforce").insert(workforceRows);
      if (error) {
        setSubmitError(`บันทึกกำลังคนไม่สำเร็จ: ${error.message}`);
        return;
      }
    }

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

    const allPhotos: { file: File; kind: "progress_photo" | "safety_photo" }[] = [
      ...progressPhotos.map((p) => ({ file: p.file, kind: "progress_photo" as const })),
      ...safetyPhotos.map((p) => ({ file: p.file, kind: "safety_photo" as const })),
    ];
    for (const { file, kind } of allPhotos) {
      const path = `${report.id}/${kind}/${crypto.randomUUID()}-${file.name}`;
      const { error: uploadError } = await supabase.storage.from("daily-report-photos").upload(path, file);
      if (uploadError) {
        setSubmitError(`อัปโหลดรูป ${file.name} ไม่สำเร็จ: ${uploadError.message}`);
        return;
      }
      const { error: attachError } = await supabase.from("attachments").insert({
        daily_report_id: report.id,
        storage_path: path,
        kind,
        uploaded_by: user.id,
      });
      if (attachError) {
        setSubmitError(`บันทึกข้อมูลรูปไม่สำเร็จ: ${attachError.message}`);
        return;
      }
    }

    router.push(`/daily-report/${report.id}`);
  } finally {
    setSubmitting(false);
  }
}
```

- [ ] **Step 2: Replace the disabled Slice-4 button with the real one**

Find the `reviewed` block's button group (the one with
`title="ระบบบันทึกลงฐานข้อมูลจะเปิดใช้งานใน Slice 4"`) and replace it:

```tsx
{reviewed ? (
  <div role="status" className="flex flex-col gap-2 rounded-md border border-line bg-surface p-5">
    <h2 className="text-base font-bold">พร้อมส่งรายงาน</h2>
    <p className="text-sm text-muted">
      {reportType === "morning_plan" ? "แผนงานช่วงเช้า" : "ผลงานจริงสิ้นวัน"} · วันที่ {reportDate} ·
      กำลังคน {totals.crew} คน · {activities.filter((a) => a.description.trim()).length} กิจกรรม
    </p>
    {submitError && <FormError message={submitError} />}
    <div className="mt-1 flex flex-wrap gap-2">
      <Button onClick={onSubmit} loading={submitting}>
        บันทึกรายงาน
      </Button>
      <Button variant="secondary" onClick={() => setReviewed(false)} disabled={submitting}>
        แก้ไขเพิ่มเติม
      </Button>
    </div>
  </div>
) : (
  <div className="flex flex-wrap gap-2">
    <Button onClick={onReview}>ตรวจสอบรายงาน</Button>
  </div>
)}
```

- [ ] **Step 3: Verify it compiles**

Run: `npx tsc --noEmit` — expect clean.

- [ ] **Step 4: Apply Task 1's migration (if not already applied)**

Before end-to-end verification can work, Task 1's migration must be live.
Confirm with the controller that Step 2 of Task 1 has been run against the
real database (`supabase db push` from this worktree, after
`supabase link --project-ref wzxadsilewovzktaaiul`).

- [ ] **Step 5: End-to-end manual verification**

Run `npm run dev`. Using Playwright (or the webapp-testing skill's pattern),
sign in as the existing demo `contractor_user` account
(`contractor@faststeel.demo` / `DemoPassword2026!`, from
`src/app/login/login-form.tsx`), then:

1. Go to `/daily-report`, fill in at least one workforce row and one activity
   with a description, add at least one file in each photo picker (any small
   real image file available in the environment), click "ตรวจสอบรายงาน"
   then "บันทึกรายงาน".
2. Confirm the browser redirects to `/daily-report/{new-id}` and the page
   shows the just-entered workforce/activity data plus both uploaded photos
   rendered inline (not broken image icons — this proves the signed URLs from
   Task 3 actually resolve).
3. Click "ดาวน์โหลด PDF" and confirm the downloaded file is a valid, non-empty
   PDF containing the photos (open it or check its byte size is substantially
   larger than a photo-less report would produce).
4. Click "ดาวน์โหลด Excel" and confirm the workbook's Photos section lists
   both uploaded filenames under the correct category.

Report the exact outcome of each of these 4 checks — this is the plan's final
proof that Slice 4 and photo attachments work together, end to end, against
the real database.

- [ ] **Step 6: Commit**

```bash
git add src/app/daily-report/report-form.tsx
git commit -m "Wire real Daily Report save with photo upload (Slice 4)"
```

---

## Self-review notes

- **Spec coverage**: real save (Task 7), INSERT + own-read RLS (Task 1),
  photo storage (Task 1), upload UI (Task 6), PDF photo sections (Task 4),
  Excel photo list (Task 5), signed URLs (Task 3) — all covered. Descoped
  items (site-layout diagram, retention, editing, multi-project/discipline
  UI, structured safety fields) are named in Global Constraints, not tasked.
- **Type consistency checked**: `DailyReportAttachment` (Task 2) is the one
  shape `assemble.ts` (Task 3), `ReportView` (Task 4), and `render-xlsx.ts`
  (Task 5) all consume — field names match across every task. `PhotoFile`
  (Task 6) is purely local UI state, never crosses a task boundary except
  into Task 7's own submit handler in the same file.
