import { Rss } from "lucide-react";
import { EmptyState, PageHeader, PriorityPill } from "@/components/ui";
import type { WorkPriority } from "@/types";

export const metadata = {
  title: "ฟีดอัปเดตงาน",
};

const PRIORITIES: WorkPriority[] = ["CRITICAL", "HIGH", "NORMAL", "LOW"];

export default function UpdatesPage() {
  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="ฟีดอัปเดตหน้างาน (Project Updates)"
        description="บันทึกความคืบหน้า งานที่เสร็จสิ้น และประเด็นติดขัดจากทุกทีม — ฟีดเดียวต่อเนื่อง ไม่มีช่องแชทแยกใน Phase 1"
      />
      <section aria-label="ระดับความสำคัญ" className="flex flex-wrap gap-2">
        {PRIORITIES.map((p) => (
          <PriorityPill key={p} value={p} />
        ))}
      </section>
      <EmptyState
        icon={Rss}
        title="ยังไม่มีข้อมูลอัปเดต"
        body="บันทึกอัปเดตแรกที่แต่ละทีมโพสต์จะแสดงที่นี่ การระบุงานเป็น CRITICAL จะต้องระบุเหตุผล, กำหนดเสร็จ, ผลกระทบหากล่าช้า และกิจกรรมที่ต่อเนื่องกัน — และต้องตั้งค่าโดยบุคคลเท่านั้น"
      />
    </div>
  );
}
