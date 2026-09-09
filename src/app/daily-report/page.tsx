import { Suspense } from "react";
import { PageHeader } from "@/components/ui";
import TypeFromQuery from "./report-form";

export const metadata = {
  title: "รายงานประจำวัน",
};

export default function DailyReportPage() {
  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="รายงานประจำวัน (Daily Report)"
        description="ใช้โครงสร้างเดียวกันสำหรับแผนงานช่วงเช้า (Morning Plan) และผลงานจริงสิ้นวัน (End-of-Day Actual) เพื่อให้การเปรียบเทียบ Plan vs Actual ทำได้ทันทีโดยไม่ต้องกรอกซ้ำ"
      />
      <Suspense fallback={<p className="text-sm text-muted">กำลังโหลดแบบฟอร์ม…</p>}>
        <TypeFromQuery />
      </Suspense>
    </div>
  );
}
