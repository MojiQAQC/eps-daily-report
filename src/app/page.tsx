"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  ArrowRight,
  Building2,
  CheckCircle2,
  ClipboardCheck,
  ClipboardList,
  Clock,
  ExternalLink,
  HardHat,
  Lock,
  Rss,
  ShieldAlert,
  ShieldCheck,
  UserCheck,
  Users,
} from "lucide-react";
import { Button, ButtonLink, EmptyState, PageHeader } from "@/components/ui";
import { ProjectMapWeather } from "@/components/project-map-weather";
import { createClient } from "@/lib/supabase/client";

function todayLabel() {
  return new Intl.DateTimeFormat("th-TH", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date());
}

// 11 Contractors from active site
const ALL_CONTRACTORS = [
  { name: "หจก. ฟาสต์สตีล จำกัด (Fast Steel)", morning: "พร้อมส่ง", eod: "รอส่ง", pic: "Puntakan S." },
  { name: "หจก. แอล-แทป เอ็นจิเนียริ่ง (L-TAB)", morning: "รอส่ง", eod: "รอส่ง", pic: "Site Lead" },
  { name: "CKM", morning: "รอส่ง", eod: "รอส่ง", pic: "Site Lead" },
  { name: "RETS", morning: "รอส่ง", eod: "รอส่ง", pic: "Site Lead" },
  { name: "S-Zone (Sinoma)", morning: "รอส่ง", eod: "รอส่ง", pic: "Site Lead" },
  { name: "UE", morning: "รอส่ง", eod: "รอส่ง", pic: "Site Lead" },
  { name: "US", morning: "รอส่ง", eod: "รอส่ง", pic: "Site Lead" },
  { name: "PPE", morning: "รอส่ง", eod: "รอส่ง", pic: "Site Lead" },
  { name: "KR", morning: "รอส่ง", eod: "รอส่ง", pic: "Site Lead" },
  { name: "PE", morning: "รอส่ง", eod: "รอส่ง", pic: "Site Lead" },
  { name: "ZOE", morning: "รอส่ง", eod: "รอส่ง", pic: "Site Lead" },
];

export default function Home() {
  const [userRole, setUserRole] = useState<string | null>(null);
  const [userName, setUserName] = useState<string | null>(null);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [loadingUser, setLoadingUser] = useState(true);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth
      .getUser()
      .then(({ data }) => {
        if (data?.user) {
          setUserRole(data.user.user_metadata?.role || "contractor_user");
          setUserName(data.user.user_metadata?.full_name || data.user.email);
          setUserEmail(data.user.email || null);
        } else {
          setUserRole(null);
        }
        setLoadingUser(false);
      })
      .catch(() => setLoadingUser(false));
  }, []);

  return (
    <div className="flex flex-col gap-8">
      {/* Dynamic Role-Based Top Banner */}
      {userRole === "contractor_user" && (
        <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-5">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-amber-500/20 text-amber-700">
                <HardHat className="h-5 w-5" />
              </span>
              <div>
                <span className="inline-block rounded-full bg-amber-500/20 px-2 py-0.5 text-xs font-bold text-amber-800 mb-1">
                  บทบาท: ผู้รับเหมาหน้างาน
                </span>
                <h1 className="text-lg font-bold text-amber-950">
                  พื้นที่ปฏิบัติงาน: หจก. ฟาสต์สตีล จำกัด (Fast Steel)
                </h1>
                <p className="text-xs text-amber-800">
                  ผู้ล็อกอิน: {userName} ({userEmail}) · โครงการ STS-9.9 MW Biomass Power Plant
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <ButtonLink href="/daily-report?type=morning_plan" variant="primary" size="sm">
                กรอกแผนงานเช้า
              </ButtonLink>
              <ButtonLink href="/daily-report?type=end_of_day_actual" variant="secondary" size="sm">
                ส่งผลงานเย็น
              </ButtonLink>
            </div>
          </div>
        </div>
      )}

      {userRole === "site_admin" && (
        <div className="rounded-lg border border-blue-500/30 bg-blue-500/10 p-5">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-blue-500/20 text-blue-700">
                <UserCheck className="h-5 w-5" />
              </span>
              <div>
                <span className="inline-block rounded-full bg-blue-500/20 px-2 py-0.5 text-xs font-bold text-blue-800 mb-1">
                  บทบาท: แอดมินประจำไซต์งาน (EPS Resident Engineer)
                </span>
                <h1 className="text-lg font-bold text-blue-950">
                  แผงควบคุมตรวจงานไซต์ STS-9.9 MW Biomass Power Plant
                </h1>
                <p className="text-xs text-blue-800">
                  ผู้ตรวจรับรอง: {userName} ({userEmail}) · ควบคุม 11 ผู้รับเหมา
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <ButtonLink href="/history" variant="primary" size="sm">
                ตรวจรายงานทั้งหมด (Checked by EPS)
              </ButtonLink>
            </div>
          </div>
        </div>
      )}

      {userRole === "head_office_admin" && (
        <div className="rounded-lg border border-purple-500/30 bg-purple-500/10 p-5">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-purple-500/20 text-purple-700">
                <ShieldCheck className="h-5 w-5" />
              </span>
              <div>
                <span className="inline-block rounded-full bg-purple-500/20 px-2 py-0.5 text-xs font-bold text-purple-800 mb-1">
                  บทบาท: ผู้ดูแลระบบส่วนกลาง (Head Office Admin)
                </span>
                <h1 className="text-lg font-bold text-purple-950">
                  แผงบริหารและตรวจสอบระบบระดับองค์กร (Executive Governance)
                </h1>
                <p className="text-xs text-purple-800">
                  ผู้บริหาร: {userName} ({userEmail}) · ภาพรวมความโปร่งใสและข้อมูลหลัก
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <ButtonLink href="/admin" variant="primary" size="sm">
                เข้าสู่ศูนย์ควบคุมระบบ (Admin Console)
                <ArrowRight className="h-3.5 w-3.5" />
              </ButtonLink>
            </div>
          </div>
        </div>
      )}

      {!loadingUser && !userRole && (
        <div className="rounded-lg border border-primary/20 bg-primary/5 p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h2 className="text-sm font-bold text-ink">กำลังรับชมในโหมดผู้เยี่ยมชม (Guest Mode)</h2>
            <p className="text-xs text-muted mt-0.5">
              เพื่อทดสอบประสบการณ์ที่แตกต่างกันของทั้ง 3 ระดับ กรุณาเลือกเข้าสู่ระบบ
            </p>
          </div>
          <ButtonLink href="/login" variant="primary" size="sm">
            เข้าสู่ระบบเพื่อสาธิต (3 ระดับ)
          </ButtonLink>
        </div>
      )}

      {/* Header with Today's Date */}
      <PageHeader
        title={todayLabel()}
        description="สถานะหน้างานโครงการนำร่อง STS-9.9 MW Biomass Power Plant อ.ทุ่งสง จ.นครศรีธรรมราช"
      />

      {/* แผนที่โครงการและสภาพอากาศไซต์งาน */}
      <ProjectMapWeather />

      {/* ------------------------------------------------------------- */}
      {/* ROLE 1: CONTRACTOR VIEW                                       */}
      {/* ------------------------------------------------------------- */}
      {userRole === "contractor_user" && (
        <section aria-labelledby="contractor-reports" className="flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <h2 id="contractor-reports" className="text-lg font-bold">
              รายงานประจำวันของ Fast Steel วันนี้
            </h2>
            <span className="text-xs text-muted">แบบฟอร์มมาตรฐาน Safety: R003</span>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="flex flex-col gap-3 rounded-lg border border-amber-500/30 bg-surface p-5 shadow-sm">
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-base">แผนงานช่วงเช้า (Morning Plan)</h3>
                <span className="rounded-full bg-amber-500/10 px-2 py-0.5 text-xs font-bold text-amber-700">
                  กำหนดส่งก่อน 09:00 น.
                </span>
              </div>
              <p className="text-sm text-muted">
                แจ้งยอดกำลังคนแยกตามตำแหน่ง (วิศวกร, โฟร์แมน, ช่างประกอบ, ช่างเชื่อม), ใบอนุญาตทำงาน (Hotwork, ที่สูง), รายการกิจกรรมที่วางแผนทำวันนี้
              </p>
              <div className="mt-auto pt-2">
                <ButtonLink href="/daily-report?type=morning_plan" variant="primary">
                  เปิดแบบฟอร์มกรอกแผนเช้า
                  <ArrowRight className="h-4 w-4" />
                </ButtonLink>
              </div>
            </div>

            <div className="flex flex-col gap-3 rounded-lg border border-line bg-surface p-5 shadow-sm">
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-base">ผลงานจริงสิ้นวัน (End-of-Day Actual)</h3>
                <span className="rounded-full bg-surface2 px-2 py-0.5 text-xs font-bold text-muted">
                  ส่งเวลา 17:00 น.
                </span>
              </div>
              <p className="text-sm text-muted">
                บันทึกผลงานจริงเทียบแผน (% Actual vs Plan), บันทึกสถิติความปลอดภัย (Zero Accident), หัวข้อ Safety Talk, และแนบรูปถ่ายหน้างาน 6 ช่อง
              </p>
              <div className="mt-auto pt-2">
                <ButtonLink href="/daily-report?type=end_of_day_actual" variant="secondary">
                  เปิดแบบฟอร์มส่งผลงานเย็น
                </ButtonLink>
              </div>
            </div>
          </div>

          {/* Contractor Isolation History Snapshot */}
          <div className="mt-2 rounded-lg border border-line bg-surface p-5">
            <div className="flex items-center justify-between border-b border-line pb-3 mb-3">
              <h3 className="font-bold text-sm flex items-center gap-2">
                <ClipboardCheck className="h-4 w-4 text-primary" />
                ประวัติรายงานย้อนหลัง (เฉพาะ หจก. ฟาสต์สตีล จำกัด)
              </h3>
              <span className="text-xs text-muted">แยกข้อมูลความลับระหว่างบริษัท (RLS Isolation)</span>
            </div>
            <p className="text-xs text-muted">
              ระบบกำลังแยกการมองเห็นตามสิทธิ์ผู้รับเหมา คุณจะไม่เห็นข้อมูลของ L-TAB, CKM หรือบริษัทคู่แข่งอื่น
            </p>
          </div>
        </section>
      )}

      {/* ------------------------------------------------------------- */}
      {/* ROLE 2: SITE ADMIN VIEW (Supervising 11 Contractors)          */}
      {/* ------------------------------------------------------------- */}
      {userRole === "site_admin" && (
        <section aria-labelledby="site-contractor-matrix" className="flex flex-col gap-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <div>
              <h2 id="site-contractor-matrix" className="text-lg font-bold">
                กระดานติดตามรายงานผู้รับเหมา 11 เจ้า (STS Site Matrix)
              </h2>
              <p className="text-xs text-muted mt-0.5">
                ตรวจสอบสถานะการส่งรายงานของทุกบริษัทก่อนเริ่มงานและสรุปผลประจำวัน
              </p>
            </div>
            <span className="text-xs bg-blue-500/10 text-blue-700 px-2.5 py-1 rounded-full font-semibold border border-blue-500/20">
              ส่งแผนเช้าแล้ว: 1 / 11 บริษัท
            </span>
          </div>

          <div className="rounded-lg border border-line bg-surface overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-surface2 text-xs font-semibold text-muted uppercase tracking-wider border-b border-line">
                  <tr>
                    <th className="px-5 py-3.5">ผู้รับเหมา (Contractor)</th>
                    <th className="px-5 py-3.5">ผู้รับผิดชอบ (PIC)</th>
                    <th className="px-5 py-3.5">แผนเช้า (Morning)</th>
                    <th className="px-5 py-3.5">ผลสิ้นวัน (Actual)</th>
                    <th className="px-5 py-3.5">การรับรอง (EPS Sign-off)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {ALL_CONTRACTORS.map((c, i) => (
                    <tr key={c.name} className="hover:bg-surface2/50 transition-colors">
                      <td className="px-5 py-3 font-semibold text-ink">
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-muted font-mono">{i + 1}.</span>
                          <span>{c.name}</span>
                        </div>
                      </td>
                      <td className="px-5 py-3 text-xs text-muted">{c.pic}</td>
                      <td className="px-5 py-3">
                        {i === 0 ? (
                          <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-700 bg-emerald-500/10 px-2 py-0.5 rounded-full">
                            <CheckCircle2 className="h-3 w-3" />
                            พร้อมตรวจสอบ
                          </span>
                        ) : (
                          <span className="text-xs text-amber-700 bg-amber-500/10 px-2 py-0.5 rounded-full">
                            รอส่ง
                          </span>
                        )}
                      </td>
                      <td className="px-5 py-3 text-xs text-muted">{c.eod}</td>
                      <td className="px-5 py-3">
                        {i === 0 ? (
                          <ButtonLink href="/daily-report" variant="primary" size="sm">
                            ตรวจรับรอง (Verify)
                          </ButtonLink>
                        ) : (
                          <span className="text-xs text-muted">-</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>
      )}

      {/* ------------------------------------------------------------- */}
      {/* ROLE 3: HEAD OFFICE ADMIN VIEW                                */}
      {/* ------------------------------------------------------------- */}
      {userRole === "head_office_admin" && (
        <section aria-labelledby="executive-overview" className="flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 id="executive-overview" className="text-lg font-bold">
                แผงบริหารและตรวจสอบส่วนกลาง (Head Office Control Center)
              </h2>
              <p className="text-xs text-muted mt-0.5">
                ติดตามความโปร่งใส ตรวจสอบเวลาการเข้าสู่ระบบของผู้ใช้ และข้อมูลหลัก
              </p>
            </div>
            <ButtonLink href="/admin" variant="primary" size="sm">
              เปิดหน้าตรวจสอบประวัติการ Login
              <ArrowRight className="h-3.5 w-3.5" />
            </ButtonLink>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            <div className="rounded-lg border border-purple-500/20 bg-surface p-5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-purple-700 uppercase">ระบบตรวจสอบความปลอดภัย</span>
                <Clock className="h-4 w-4 text-purple-700" />
              </div>
              <h3 className="mt-2 text-base font-bold">ประวัติการเข้าใช้งาน (Login Audit)</h3>
              <p className="text-xs text-muted mt-1">
                ตรวจดูว่าบัญชีของ Fast Steel, EPS Site Admin และ Head Office เข้าใช้งานตอนไหนบ้าง
              </p>
              <div className="mt-4">
                <ButtonLink href="/admin" variant="secondary" size="sm">
                  ดูบันทึก Audit Logs
                </ButtonLink>
              </div>
            </div>

            <div className="rounded-lg border border-line bg-surface p-5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-primary uppercase">โครงสร้างข้อมูลหลัก</span>
                <Building2 className="h-4 w-4 text-primary" />
              </div>
              <h3 className="mt-2 text-base font-bold">11 ผู้รับเหมา & 4 สาขาช่าง</h3>
              <p className="text-xs text-muted mt-1">
                ฐานข้อมูลจริงที่ไซต์งาน STS-9.9 MW พร้อมระบบแยกสิทธิ์ RLS อัตโนมัติ
              </p>
              <div className="mt-4">
                <ButtonLink href="/admin" variant="secondary" size="sm">
                  ดู Master Data
                </ButtonLink>
              </div>
            </div>

            <div className="rounded-lg border border-line bg-surface p-5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-emerald-700 uppercase">สถิติความปลอดภัย</span>
                <ShieldCheck className="h-4 w-4 text-emerald-700" />
              </div>
              <h3 className="mt-2 text-base font-bold">Zero Accident (0 อุบัติเหตุ)</h3>
              <p className="text-xs text-muted mt-1">
                เกณฑ์ความปลอดภัยสภาพอากาศ ลม &lt; 14 mph ทำงานบนที่สูงได้ปลอดภัย
              </p>
              <div className="mt-4">
                <span className="inline-flex items-center gap-1 text-xs text-emerald-700 font-semibold bg-emerald-500/10 px-2.5 py-1 rounded-full">
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  ผ่านเกณฑ์ความปลอดภัย
                </span>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Default Report Type Cards (Shown for all or when not logged in) */}
      {!userRole && (
        <section aria-labelledby="today-reports" className="flex flex-col gap-3">
          <h2 id="today-reports" className="text-lg font-bold">
            รายงานประจำวันนี้
          </h2>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="flex flex-col gap-3 rounded-md border border-line bg-surface p-5">
              <h3 className="text-base font-bold">แผนงานช่วงเช้า (Morning Plan)</h3>
              <p className="text-sm text-muted">
                สิ่งที่แต่ละทีมวางแผนจะดำเนินการในวันนี้ — กำลังคน, ใบอนุญาตทำงาน (Permits), กิจกรรมที่วางแผน, เครื่องจักรหน้างาน
              </p>
              <div className="mt-auto pt-1">
                <ButtonLink href="/daily-report?type=morning_plan" variant="secondary">
                  เริ่มกรอกแผนงานเช้า
                </ButtonLink>
              </div>
            </div>
            <div className="flex flex-col gap-3 rounded-md border border-line bg-surface p-5">
              <h3 className="text-base font-bold">ผลงานจริงสิ้นวัน (End-of-Day Actual)</h3>
              <p className="text-sm text-muted">
                สิ่งที่เกิดขึ้นจริงหน้างาน — ความก้าวหน้าที่ทำได้, บันทึกความปลอดภัย, หัวข้อ Safety Talk ประจำวัน
              </p>
              <div className="mt-auto pt-1">
                <ButtonLink href="/daily-report?type=end_of_day_actual" variant="secondary">
                  ส่งรายงานผลสิ้นวัน
                </ButtonLink>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Critical Attention Section */}
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
    </div>
  );
}
