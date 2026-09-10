import { History } from "lucide-react";
import { ButtonLink, EmptyState, PageHeader } from "@/components/ui";

export const metadata = {
  title: "ประวัติรายงานประจำวัน",
};

export default function HistoryPage() {
  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="ประวัติรายงานประจำวัน"
        description="รายงานทั้งหมดที่ส่งแล้ว สามารถกรองดูตามวันที่และประเภทรายงานได้ ข้อมูลอ่านจากตารางเดียวกันกับที่บันทึก — แหล่งความจริงหนึ่งเดียว"
        actions={<ButtonLink href="/daily-report" variant="secondary">เขียนรายงานใหม่</ButtonLink>}
      />
      <EmptyState
        icon={History}
        title="ไม่พบรายงานในช่วงเวลานี้"
        body="เมื่อทีมงานส่งแผนงานเช้าและผลงานจริงสิ้นวัน รายงานจะแสดงที่นี่เพื่อเปรียบเทียบ Plan vs Actual เคียงคู่กัน ตัวกรองวันที่และประเภทจะแสดงพร้อมผลลัพธ์แรก"
      />
    </div>
  );
}
