"use client";

import { useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import {
  Button,
  Field,
  FormError,
  Select,
  TextArea,
  TextInput,
} from "@/components/ui";
import type { ReportType, WorkStatus } from "@/types";

const REPORT_TABS: { value: ReportType; label: string }[] = [
  { value: "morning_plan", label: "แผนงานช่วงเช้า (Morning Plan)" },
  { value: "end_of_day_actual", label: "ผลงานจริงสิ้นวัน (End-of-Day Actual)" },
];

const STATUS_OPTIONS: { value: "" | WorkStatus; label: string }[] = [
  { value: "", label: "เลือกสถานะ" },
  { value: "NOT_STARTED", label: "ยังไม่เริ่ม" },
  { value: "IN_PROGRESS", label: "กำลังดำเนินการ" },
  { value: "COMPLETED", label: "เสร็จสิ้น" },
  { value: "BLOCKED", label: "ติดขัด/รอแก้ไข" },
  { value: "DELAYED", label: "ล่าช้ากว่าแผน" },
];

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

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

function toCount(value: string): number | null {
  if (value.trim() === "") return null;
  const n = Number(value);
  return Number.isInteger(n) && n >= 0 ? n : NaN;
}

function ReportForm({ initialType }: { initialType: ReportType }) {
  const [reportType, setReportType] = useState<ReportType>(initialType);
  const [reportDate, setReportDate] = useState(todayISO());
  const [workforce, setWorkforce] = useState<WorkforceRow[]>([
    { role: "", male: "", female: "" },
  ]);
  const [activities, setActivities] = useState<ActivityRow[]>([
    { area: "", description: "", progress: "", status: "", supervisor: "" },
  ]);
  const [safetyNotes, setSafetyNotes] = useState("");
  const [errors, setErrors] = useState<string[]>([]);
  const [reviewed, setReviewed] = useState(false);

  const totals = useMemo(() => {
    let male = 0;
    let female = 0;
    for (const row of workforce) {
      const m = toCount(row.male);
      const f = toCount(row.female);
      if (m !== null && !Number.isNaN(m)) male += m;
      if (f !== null && !Number.isNaN(f)) female += f;
    }
    return { male, female, crew: male + female };
  }, [workforce]);

  function updateWorkforce(index: number, patch: Partial<WorkforceRow>) {
    setWorkforce((rows) => rows.map((r, i) => (i === index ? { ...r, ...patch } : r)));
  }

  function updateActivity(index: number, patch: Partial<ActivityRow>) {
    setActivities((rows) =>
      rows.map((r, i) => (i === index ? { ...r, ...patch } : r)),
    );
  }

  function validate(): string[] {
    const found: string[] = [];
    if (!reportDate) found.push("กรุณาระบุวันที่รายงาน");
    workforce.forEach((row, i) => {
      const m = toCount(row.male);
      const f = toCount(row.female);
      if ((row.role || row.male || row.female) && !row.role.trim())
        found.push(`แถวกำลังคนแถวที่ ${i + 1}: กรุณาระบุชื่อตำแหน่งงานเมื่อมีการกรอกจำนวนคน`);
      if (Number.isNaN(m) || Number.isNaN(f))
        found.push(`แถวกำลังคนแถวที่ ${i + 1}: จำนวนคนต้องเป็นตัวเลขจำนวนเต็มตั้งแต่ 0 ขึ้นไป`);
    });
    const described = activities.filter((a) => a.description.trim());
    if (described.length === 0)
      found.push("กรุณาระบุอย่างน้อย 1 กิจกรรมที่มีรายละเอียดงาน");
    activities.forEach((a, i) => {
      if (a.progress.trim() !== "" && Number.isNaN(Number(a.progress)))
        found.push(`กิจกรรมที่ ${i + 1}: ความก้าวหน้าต้องเป็นตัวเลข`);
    });
    return found;
  }

  function onReview() {
    const found = validate();
    setErrors(found);
    setReviewed(found.length === 0);
    if (found.length > 0) {
      document
        .getElementById("report-errors")
        ?.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div role="tablist" aria-label="ประเภทรายงาน" className="flex gap-2">
        {REPORT_TABS.map((tab) => {
          const selected = reportType === tab.value;
          return (
            <button
              key={tab.value}
              role="tab"
              aria-selected={selected}
              onClick={() => {
                setReportType(tab.value);
                setReviewed(false);
              }}
              className={`min-h-[44px] rounded-md px-4 text-sm font-semibold transition-colors duration-200 ${
                selected ? "bg-primary text-onprimary" : "bg-surface hover:bg-surface2"
              }`}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      <div id="report-errors">
        <FormError
          message={errors.length > 0 ? errors.join(" ") : null}
        />
      </div>

      <section aria-labelledby="meta" className="flex flex-col gap-4">
        <h2 id="meta" className="text-lg font-bold">
          ข้อมูลรายงาน
        </h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="วันที่รายงาน" htmlFor="report-date">
            <TextInput
              id="report-date"
              type="date"
              value={reportDate}
              max={todayISO()}
              onChange={(e) => setReportDate(e.target.value)}
            />
          </Field>
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

      {reviewed ? (
        <div
          role="status"
          className="flex flex-col gap-2 rounded-md border border-line bg-surface p-5"
        >
          <h2 className="text-base font-bold">พร้อมส่งรายงาน</h2>
          <p className="text-sm text-muted">
            {reportType === "morning_plan" ? "แผนงานช่วงเช้า" : "ผลงานจริงสิ้นวัน"} ·{" "}
            วันที่ {reportDate} · กำลังคน {totals.crew} คน ·{" "}
            {activities.filter((a) => a.description.trim()).length} กิจกรรม (การบันทึกลงฐานข้อมูลจะเชื่อมต่อใน Slice 4)
          </p>
          <div className="mt-1 flex flex-wrap gap-2">
            <Button disabled title="ระบบบันทึกลงฐานข้อมูลจะเปิดใช้งานใน Slice 4">
              บันทึกรายงาน (Slice 4)
            </Button>
            <Button variant="secondary" onClick={() => setReviewed(false)}>
              แก้ไขเพิ่มเติม
            </Button>
          </div>
        </div>
      ) : (
        <div className="flex flex-wrap gap-2">
          <Button onClick={onReview}>ตรวจสอบรายงาน</Button>
        </div>
      )}
    </div>
  );
}

export default function TypeFromQuery() {
  const params = useSearchParams();
  const initial: ReportType =
    params.get("type") === "end_of_day_actual" ? "end_of_day_actual" : "morning_plan";
  return <ReportForm key={initial} initialType={initial} />;
}
