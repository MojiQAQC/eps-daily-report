import { Building2, HardHat, MapPin, Users } from "lucide-react";
import { EmptyState, PageHeader } from "@/components/ui";

export const metadata = {
  title: "ข้อมูลหลักของระบบ",
};

const TABLES = [
  {
    icon: Building2,
    title: "ผู้รับเหมา (Contractors)",
    body: "บริษัทที่ทำงานในโครงการ เป็นข้อมูลในระบบ ไม่ Hardcode — การเพิ่มบริษัทที่นี่จะทำให้ทีมงานของบริษัทนั้นสามารถส่งรายงานได้",
  },
  {
    icon: HardHat,
    title: "สาขางาน (Disciplines)",
    body: "โยธา (Civil), ไฟฟ้า (Electrical), เครื่องกล/ท่อ (Piping) และอื่นๆ ความสัมพันธ์ว่าผู้รับเหมาทำงานสาขาใดจะถูกจับคู่เป็นรายบริษัท",
  },
  {
    icon: MapPin,
    title: "โครงการ (Projects)",
    body: "โครงการนำร่อง STS-9.9 MW Biomass ผู้ดูแลระบบส่วนกลาง (Head Office Admin) จะสามารถดูแลได้หลายโครงการเมื่อขยายผล",
  },
  {
    icon: Users,
    title: "ผู้ใช้งานและสิทธิ์ (People & Access)",
    body: "ระบบรับเฉพาะผู้ได้รับคำเชิญ (Invite-only) แต่ละคนจะได้รับบทบาทและสิทธิ์เข้าถึงเฉพาะโครงการ ผู้รับเหมา และสาขางานที่ได้รับมอบหมาย — บังคับใช้สิทธิ์ระดับฐานข้อมูล (RLS)",
  },
] as const;

export default function AdminPage() {
  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="ข้อมูลหลักของระบบ (Master Data)"
        description="ข้อมูลอ้างอิงสำหรับผู้ดูแลระบบ (Admin) เชื่อมโยงกับข้อมูลผู้ใช้งานและสิทธิ์การเข้าถึงโครงการ"
      />
      <div className="grid gap-4 md:grid-cols-2">
        {TABLES.map((t) => (
          <EmptyState key={t.title} icon={t.icon} title={t.title} body={t.body} />
        ))}
      </div>
    </div>
  );
}
