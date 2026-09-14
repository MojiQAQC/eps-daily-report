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
  const [errors, setErrors] = useState<string[]>([]);
  const [reviewed, setReviewed] = useState(false);
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

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
        if (reportError?.code === "23505") {
          setSubmitError("มีรายงานประเภทนี้สำหรับวันที่นี้อยู่แล้ว");
        } else {
          setSubmitError(`บันทึกรายงานไม่สำเร็จ: ${reportError?.message ?? "unknown error"}`);
        }
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
                <th scope="col" className="px-3 py-2.5">ตำแหน่ง/หน้าที่ (Role)</th>
                <th scope="col" className="px-3 py-2.5 w-24">ชาย (คน)</th>
                <th scope="col" className="px-3 py-2.5 w-24">หญิง (คน)</th>
                <th scope="col" className="px-3 py-2.5 w-12">
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

      <section aria-labelledby="activities" className="flex flex-col gap-4">
        <h2 id="activities" className="text-lg font-bold">
          กิจกรรมงาน (Activities)
        </h2>
        <div className="overflow-x-auto rounded-md border border-line contain-layout">
          <table className="w-full text-left text-sm">
            <thead className="bg-surface2 text-xs font-semibold text-muted uppercase tracking-wider border-b border-line">
              <tr>
                <th scope="col" className="px-3 py-2.5">พื้นที่ทำงาน (Area)</th>
                <th scope="col" className="px-3 py-2.5 min-w-[16rem]">รายละเอียดงาน (Description)</th>
                <th scope="col" className="px-3 py-2.5">ผู้ควบคุมงาน (Supervisor)</th>
                <th scope="col" className="px-3 py-2.5 w-28">
                  {reportType === "morning_plan" ? "แผน (%)" : "จริง (%)"}
                </th>
                <th scope="col" className="px-3 py-2.5 w-40">สถานะ (Status)</th>
                <th scope="col" className="px-3 py-2.5 w-16">JSA</th>
                <th scope="col" className="px-3 py-2.5 w-12">
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
                      style={{ minHeight: "3.5rem" }}
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
    </div>
  );
}

export default function TypeFromQuery() {
  const params = useSearchParams();
  const initial: ReportType =
    params.get("type") === "end_of_day_actual" ? "end_of_day_actual" : "morning_plan";
  return <ReportForm key={initial} initialType={initial} />;
}
