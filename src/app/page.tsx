import { ShieldCheck, Rss } from "lucide-react";
import { ButtonLink, EmptyState, PageHeader } from "@/components/ui";
import { ProjectMapWeather } from "@/components/project-map-weather";

export const metadata = {
  title: "ภาพรวมวันนี้ · EPS Daily Report",
};

function todayLabel() {
  return new Intl.DateTimeFormat("th-TH", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date());
}

const REPORT_TYPES = [
  {
    title: "แผนงานช่วงเช้า (Morning Plan)",
    body: "สิ่งที่แต่ละทีมวางแผนจะดำเนินการในวันนี้ — กำลังคน, ใบอนุญาตทำงาน (Permits), กิจกรรมที่วางแผน, เครื่องจักรหน้างาน",
    href: "/daily-report?type=morning_plan",
    cta: "เริ่มกรอกแผนงานเช้า",
  },
  {
    title: "ผลงานจริงสิ้นวัน (End-of-Day Actual)",
    body: "สิ่งที่เกิดขึ้นจริงหน้างาน — ความก้าวหน้าที่ทำได้, บันทึกความปลอดภัย, หัวข้อ Safety Talk ประจำวัน",
    href: "/daily-report?type=end_of_day_actual",
    cta: "ส่งรายงานผลสิ้นวัน",
  },
] as const;

export default function Home() {
  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        title={todayLabel()}
        description="สถานะหน้างานโครงการนำร่อง STS-9.9 MW Biomass Power Plant ตัวเลขจะเชื่อมโยงอัตโนมัติเมื่อระบบฐานข้อมูลเปิดใช้งาน"
      />

      {/* แผนที่โครงการและสภาพอากาศไซต์งาน */}
      <ProjectMapWeather />

      <section aria-labelledby="today-reports" className="flex flex-col gap-3">
        <h2 id="today-reports" className="text-lg font-bold">
          รายงานประจำวันนี้
        </h2>
        <div className="grid gap-4 md:grid-cols-2">
          {REPORT_TYPES.map((card) => (
            <div
              key={card.title}
              className="flex flex-col gap-3 rounded-md border border-line bg-surface p-5"
            >
              <h3 className="text-base font-bold">{card.title}</h3>
              <p className="text-sm text-muted">{card.body}</p>
              <div className="mt-auto pt-1">
                <ButtonLink href={card.href} variant="secondary">
                  {card.cta}
                </ButtonLink>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section aria-labelledby="needs-attention" className="flex flex-col gap-3">
        <h2 id="needs-attention" className="text-lg font-bold">
          งานที่ต้องติดตามเป็นพิเศษ
        </h2>
        <EmptyState
          icon={ShieldCheck}
          title="ไม่มีงานวิกฤตที่แจ้งเตือน"
          body="รายการที่ระบุเป็น CRITICAL จะแสดงที่นี่พร้อมผู้รับผิดชอบและกำหนดเสร็จ การกำหนดระดับความสำคัญระบุโดยคนเท่านั้น — ระบบไม่ตั้งค่าอัตโนมัติ"
          action={<ButtonLink href="/updates" variant="secondary">เปิดดูฟีดอัปเดตงาน</ButtonLink>}
        />
      </section>

      <section aria-labelledby="latest-updates" className="flex flex-col gap-3">
        <h2 id="latest-updates" className="text-lg font-bold">
          อัปเดตล่าสุดจากหน้างาน
        </h2>
        <EmptyState
          icon={Rss}
          title="ยังไม่มีข้อมูลอัปเดต"
          body="บันทึกความคืบหน้า งานที่เสร็จสิ้น และประเด็นติดขัดจากทุกทีมจะแสดงที่นี่"
        />
      </section>
    </div>
  );
}
