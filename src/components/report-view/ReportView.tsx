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
    </div>
  );
}
