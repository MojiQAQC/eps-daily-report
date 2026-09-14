# Spreadsheet-Style Workforce/Activities Entry Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the Daily Report form's stacked bordered-card rows for Workforce and Activities with compact `<table>`-based entry, matching the real "Excel-like" density contractors already use.

**Architecture:** Pure rendering-layer refactor of two `<section>` blocks inside `src/app/daily-report/report-form.tsx`. State, handlers, validation, and submit logic are untouched — only the JSX each section renders changes, from one `<fieldset>` card per row to one `<tr>` per row inside a `<table>`, following the table convention already established in `src/app/admin/page.tsx`.

**Tech Stack:** Next.js 14 App Router, TypeScript, Tailwind (OKLCH design tokens), existing `src/components/ui.tsx` primitives (`TextInput`, `TextArea`, `Select`, `Button`), lucide-react icons.

**Spec:** docs/superpowers/specs/2026-09-14-spreadsheet-style-entry-design.md

## Global Constraints

- No changes to `WorkforceRow`, `ActivityRow`, any state, `updateWorkforce`, `updateActivity`, `toCount`, `validate`, `onReview`, `onSubmit`, or the database/schema. Rendering-only change.
- No new Tailwind colors outside the existing OKLCH design tokens (`bg-surface2`, `border-line`, `text-muted`, `text-ink`, etc.) — see `DESIGN.md`.
- Preserve 44px minimum touch targets on every interactive control (existing `TextInput`/`Select`/`Button` components already enforce this — don't override with custom sizing that shrinks them).
- Follow the existing table convention from `src/app/admin/page.tsx`: `<div className="overflow-x-auto">` wrapper, `<table className="w-full text-left text-sm">`, `<thead className="bg-surface2 text-xs font-semibold text-muted uppercase tracking-wider border-b border-line">`, `<tbody className="divide-y divide-line">`.
- Every input/select keeps its existing `aria-label` (unwrapped from `<Field>`, whose visible label is replaced by the `<th>` column header — but screen-reader labeling must not regress).
- No new automated tests are required (see spec's Testing section) — this task's Step 6 is a manual/Playwright verification, not a Vitest test.

---

### Task 1: Table-based Workforce and Activities entry

**Files:**
- Modify: `src/app/daily-report/report-form.tsx`

**Interfaces:**
- Consumes: nothing new — same `workforce`/`activities` state and handlers already defined earlier in this file.
- Produces: nothing new — single-task plan, no downstream consumers.

- [ ] **Step 1: Add the `Trash2` icon import**

In `src/app/daily-report/report-form.tsx`, the current imports are:

```tsx
"use client";

import { useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Button,
  Field,
  FormError,
  Select,
  TextArea,
  TextInput,
} from "@/components/ui";
import { createClient } from "@/lib/supabase/client";
import type { ReportType, WorkStatus } from "@/types";
```

Add a lucide-react import for the row-remove icon, placed after the `next/navigation` import and before the `@/components/ui` import (matching the import-ordering convention used in `src/components/app-shell.tsx`):

```tsx
"use client";

import { useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Trash2 } from "lucide-react";
import {
  Button,
  Field,
  FormError,
  Select,
  TextArea,
  TextInput,
} from "@/components/ui";
import { createClient } from "@/lib/supabase/client";
import type { ReportType, WorkStatus } from "@/types";
```

`Field` stays imported — it's still used by the "ข้อมูลรายงาน" (meta), "ความปลอดภัย" (Safety), and photo sections, which this task does not touch.

- [ ] **Step 2: Replace the Workforce section**

Find this exact block (the whole `<section aria-labelledby="workforce" ...>` element):

```tsx
      <section aria-labelledby="workforce" className="flex flex-col gap-4">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 id="workforce" className="text-lg font-bold">
            กำลังคนหน้างาน (Workforce)
          </h2>
          <p className="text-sm text-muted" aria-live="polite">
            กำลังคนรวมทั้งหมด: <strong className="text-ink">{totals.crew}</strong> คน (ชาย {totals.male}{" "}
            คน · หญิง {totals.female} คน)
          </p>
        </div>
        {workforce.map((row, i) => (
          <fieldset
            key={i}
            className="grid gap-3 rounded-md border border-line bg-surface p-4 sm:grid-cols-[1fr_5rem_5rem_auto]"
          >
            <legend className="sr-only">กำลังคนแถวที่ {i + 1}</legend>
            <Field label={i === 0 ? "ตำแหน่ง/หน้าที่ (Role)" : ""} htmlFor={`wf-role-${i}`}>
              <TextInput
                id={`wf-role-${i}`}
                placeholder="เช่น ช่างเชื่อม, กรรมกร, โฟร์แมน"
                value={row.role}
                aria-label={`กำลังคนแถวที่ ${i + 1} ตำแหน่ง`}
                onChange={(e) => updateWorkforce(i, { role: e.target.value })}
              />
            </Field>
            <Field label={i === 0 ? "ชาย (คน)" : ""} htmlFor={`wf-m-${i}`}>
              <TextInput
                id={`wf-m-${i}`}
                inputMode="numeric"
                placeholder="0"
                value={row.male}
                aria-label={`กำลังคนแถวที่ ${i + 1} ชาย`}
                onChange={(e) => updateWorkforce(i, { male: e.target.value })}
              />
            </Field>
            <Field label={i === 0 ? "หญิง (คน)" : ""} htmlFor={`wf-f-${i}`}>
              <TextInput
                id={`wf-f-${i}`}
                inputMode="numeric"
                placeholder="0"
                value={row.female}
                aria-label={`กำลังคนแถวที่ ${i + 1} หญิง`}
                onChange={(e) => updateWorkforce(i, { female: e.target.value })}
              />
            </Field>
            <div className="flex items-end">
              <Button
                variant="ghost"
                onClick={() =>
                  setWorkforce((rows) => rows.filter((_, j) => j !== i))
                }
                disabled={workforce.length === 1}
                aria-label={`ลบกำลังคนแถวที่ ${i + 1}`}
              >
                ลบ
              </Button>
            </div>
          </fieldset>
        ))}
        <div>
          <Button
            variant="secondary"
            onClick={() =>
              setWorkforce((rows) => [...rows, { role: "", male: "", female: "" }])
            }
          >
            + เพิ่มตำแหน่งงาน
          </Button>
        </div>
      </section>
```

Replace it verbatim with:

```tsx
      <section aria-labelledby="workforce" className="flex flex-col gap-4">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 id="workforce" className="text-lg font-bold">
            กำลังคนหน้างาน (Workforce)
          </h2>
          <p className="text-sm text-muted" aria-live="polite">
            กำลังคนรวมทั้งหมด: <strong className="text-ink">{totals.crew}</strong> คน (ชาย {totals.male}{" "}
            คน · หญิง {totals.female} คน)
          </p>
        </div>
        <div className="overflow-x-auto rounded-md border border-line">
          <table className="w-full text-left text-sm">
            <thead className="bg-surface2 text-xs font-semibold text-muted uppercase tracking-wider border-b border-line">
              <tr>
                <th className="px-3 py-2.5">ตำแหน่ง/หน้าที่ (Role)</th>
                <th className="px-3 py-2.5 w-24">ชาย (คน)</th>
                <th className="px-3 py-2.5 w-24">หญิง (คน)</th>
                <th className="px-3 py-2.5 w-12">
                  <span className="sr-only">ลบแถว</span>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {workforce.map((row, i) => (
                <tr key={i}>
                  <td className="px-3 py-2">
                    <TextInput
                      placeholder="เช่น ช่างเชื่อม, กรรมกร, โฟร์แมน"
                      value={row.role}
                      aria-label={`กำลังคนแถวที่ ${i + 1} ตำแหน่ง`}
                      onChange={(e) => updateWorkforce(i, { role: e.target.value })}
                    />
                  </td>
                  <td className="px-3 py-2">
                    <TextInput
                      inputMode="numeric"
                      placeholder="0"
                      value={row.male}
                      aria-label={`กำลังคนแถวที่ ${i + 1} ชาย`}
                      onChange={(e) => updateWorkforce(i, { male: e.target.value })}
                    />
                  </td>
                  <td className="px-3 py-2">
                    <TextInput
                      inputMode="numeric"
                      placeholder="0"
                      value={row.female}
                      aria-label={`กำลังคนแถวที่ ${i + 1} หญิง`}
                      onChange={(e) => updateWorkforce(i, { female: e.target.value })}
                    />
                  </td>
                  <td className="px-3 py-2 text-center">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() =>
                        setWorkforce((rows) => rows.filter((_, j) => j !== i))
                      }
                      disabled={workforce.length === 1}
                      aria-label={`ลบกำลังคนแถวที่ ${i + 1}`}
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
              setWorkforce((rows) => [...rows, { role: "", male: "", female: "" }])
            }
          >
            + เพิ่มตำแหน่งงาน
          </Button>
        </div>
      </section>
```

- [ ] **Step 3: Run the TypeScript compiler**

```bash
npx tsc --noEmit
```

Expected: no new errors from this file. (The Activities section below still references `Field`, which stays imported, so no unused-import error yet.)

- [ ] **Step 4: Replace the Activities section**

Find this exact block (the whole `<section aria-labelledby="activities" ...>` element):

```tsx
      <section aria-labelledby="activities" className="flex flex-col gap-4">
        <h2 id="activities" className="text-lg font-bold">
          กิจกรรมงาน (Activities)
        </h2>
        {activities.map((row, i) => (
          <fieldset
            key={i}
            className="grid gap-3 rounded-md border border-line bg-surface p-4 sm:grid-cols-2"
          >
            <legend className="sr-only">กิจกรรมที่ {i + 1}</legend>
            <Field label="พื้นที่ทำงาน (Area)" htmlFor={`act-area-${i}`}>
              <TextInput
                id={`act-area-${i}`}
                placeholder="เช่น อาคาร Boiler ชั้น 2, Moving Floor MF01"
                value={row.area}
                onChange={(e) => updateActivity(i, { area: e.target.value })}
              />
            </Field>
            <Field label="ผู้ควบคุมงาน (Supervisor)" htmlFor={`act-sup-${i}`}>
              <TextInput
                id={`act-sup-${i}`}
                placeholder="ชื่อผู้ควบคุมงาน"
                value={row.supervisor}
                onChange={(e) => updateActivity(i, { supervisor: e.target.value })}
              />
            </Field>
            <div className="sm:col-span-2">
              <Field label="รายละเอียดงาน (Description)" htmlFor={`act-desc-${i}`}>
                <TextArea
                  id={`act-desc-${i}`}
                  placeholder="ระบุงานที่ทำหรือที่วางแผนไว้ ให้ชัดเจนพอที่ทีมงานรอบถัดไปจะตรวจสอบได้"
                  value={row.description}
                  onChange={(e) => updateActivity(i, { description: e.target.value })}
                />
              </Field>
            </div>
            <Field
              label={reportType === "morning_plan" ? "ความก้าวหน้าที่วางแผนไว้ (%)" : "ความก้าวหน้าที่ทำได้จริง (%)"}
              htmlFor={`act-prog-${i}`}
            >
              <TextInput
                id={`act-prog-${i}`}
                inputMode="decimal"
                placeholder="0–100"
                value={row.progress}
                onChange={(e) => updateActivity(i, { progress: e.target.value })}
              />
            </Field>
            <Field label="สถานะ (Status)" htmlFor={`act-status-${i}`}>
              <Select
                id={`act-status-${i}`}
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
            </Field>
            <div className="sm:col-span-2">
              <Button
                variant="ghost"
                onClick={() =>
                  setActivities((rows) => rows.filter((_, j) => j !== i))
                }
                disabled={activities.length === 1}
                aria-label={`ลบกิจกรรมที่ ${i + 1}`}
              >
                ลบกิจกรรม
              </Button>
            </div>
          </fieldset>
        ))}
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
      <section aria-labelledby="activities" className="flex flex-col gap-4">
        <h2 id="activities" className="text-lg font-bold">
          กิจกรรมงาน (Activities)
        </h2>
        <div className="overflow-x-auto rounded-md border border-line">
          <table className="w-full text-left text-sm">
            <thead className="bg-surface2 text-xs font-semibold text-muted uppercase tracking-wider border-b border-line">
              <tr>
                <th className="px-3 py-2.5">พื้นที่ทำงาน (Area)</th>
                <th className="px-3 py-2.5 min-w-[16rem]">รายละเอียดงาน (Description)</th>
                <th className="px-3 py-2.5">ผู้ควบคุมงาน (Supervisor)</th>
                <th className="px-3 py-2.5 w-28">
                  {reportType === "morning_plan" ? "แผน (%)" : "จริง (%)"}
                </th>
                <th className="px-3 py-2.5 w-40">สถานะ (Status)</th>
                <th className="px-3 py-2.5 w-12">
                  <span className="sr-only">ลบแถว</span>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {activities.map((row, i) => (
                <tr key={i}>
                  <td className="px-3 py-2 align-top">
                    <TextInput
                      placeholder="เช่น อาคาร Boiler ชั้น 2, Moving Floor MF01"
                      value={row.area}
                      aria-label={`กิจกรรมที่ ${i + 1} พื้นที่ทำงาน`}
                      onChange={(e) => updateActivity(i, { area: e.target.value })}
                    />
                  </td>
                  <td className="px-3 py-2 align-top">
                    <TextArea
                      rows={2}
                      placeholder="ระบุงานที่ทำหรือที่วางแผนไว้ ให้ชัดเจนพอที่ทีมงานรอบถัดไปจะตรวจสอบได้"
                      value={row.description}
                      aria-label={`กิจกรรมที่ ${i + 1} รายละเอียดงาน`}
                      onChange={(e) => updateActivity(i, { description: e.target.value })}
                    />
                  </td>
                  <td className="px-3 py-2 align-top">
                    <TextInput
                      placeholder="ชื่อผู้ควบคุมงาน"
                      value={row.supervisor}
                      aria-label={`กิจกรรมที่ ${i + 1} ผู้ควบคุมงาน`}
                      onChange={(e) => updateActivity(i, { supervisor: e.target.value })}
                    />
                  </td>
                  <td className="px-3 py-2 align-top">
                    <TextInput
                      inputMode="decimal"
                      placeholder="0–100"
                      value={row.progress}
                      aria-label={`กิจกรรมที่ ${i + 1} ${
                        reportType === "morning_plan"
                          ? "ความก้าวหน้าที่วางแผนไว้"
                          : "ความก้าวหน้าที่ทำได้จริง"
                      }`}
                      onChange={(e) => updateActivity(i, { progress: e.target.value })}
                    />
                  </td>
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

- [ ] **Step 5: Run the TypeScript compiler again**

```bash
npx tsc --noEmit
```

Expected: clean. `Field` is still imported and still used by the meta/Safety sections below, so there should be no unused-import error. If there IS an unused-import error for `Field`, it means something outside this task's scope changed — stop and report rather than removing the import (Field is required by sections this task does not touch).

- [ ] **Step 6: Manual/Playwright verification**

This task changes only rendering, not logic, so there are no new Vitest tests to write (per the spec's Testing section). Instead, verify end-to-end that the new table UI produces identical data to the old card UI:

1. Start the dev server: `npm run dev`.
2. Using Playwright (see the `webapp-testing` skill for the harness pattern), sign in as the demo contractor_user account (`contractor@faststeel.demo` / `DemoPassword2026!`, from `src/app/login/login-form.tsx`) and navigate to `/daily-report`.
3. In the Workforce table: add a second row (`+ เพิ่มตำแหน่งงาน`), fill in two distinct role/male/female values, confirm the live crew-total summary updates correctly, then remove one row and confirm the remaining row's data is unaffected and the total recalculates.
4. Confirm keyboard Tab order moves naturally left-to-right through a row's cells, then into the next row (native table/DOM tab order — no custom `tabIndex` needed).
5. In the Activities table: add a second row, fill in area/description/supervisor/progress/status for both rows, confirm the progress column header text matches the selected report type (แผน vs จริง), confirm the Description `TextArea` accepts multi-line text.
6. Click "ตรวจสอบรายงาน" (Review), confirm the review summary shows the correct workforce/activity counts, then submit.
7. Confirm the redirect to `/daily-report/{id}` succeeds and the detail page renders the same workforce/activity data entered (this proves `onSubmit`'s payload shape is unaffected by the rendering change).
8. Confirm the resulting report's PDF and Excel exports (via the detail page's download buttons) still render the workforce/activity data correctly — this proves `assembleReportPayload`/`render-pdf.ts`/`render-xlsx.ts` (all unchanged by this task) still work against data entered through the new table UI.

If any step fails, the failure is almost certainly in this task's JSX (a wrong `onChange` wire-up, a swapped field), not in unrelated code — check the table markup against Steps 2/4 before looking elsewhere.

- [ ] **Step 7: Commit**

```bash
git add src/app/daily-report/report-form.tsx
git commit -m "Replace Workforce/Activities card rows with table-based entry"
```
