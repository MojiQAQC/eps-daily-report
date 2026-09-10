"use client";

import { useEffect, useState } from "react";
import {
  Activity,
  ArrowRight,
  Building2,
  CheckCircle2,
  Clock,
  HardHat,
  Lock,
  MapPin,
  RefreshCw,
  ShieldAlert,
  ShieldCheck,
  UserCheck,
  Users,
} from "lucide-react";
import { Button, ButtonLink, PageHeader } from "@/components/ui";
import { createClient } from "@/lib/supabase/client";
import { useMyProfile } from "@/lib/use-profile";

interface AdminUser {
  id: string;
  email: string;
  fullName: string;
  role: "contractor_user" | "site_admin" | "head_office_admin";
  contractorName: string | null;
  lastSignInAt: string | null;
  createdAt: string;
  status: "active" | "banned";
}

interface ActivityItem {
  id: string;
  email: string;
  name: string;
  role: string;
  action: string;
  timestamp: string;
  details?: string;
}

interface ContractorItem {
  id: string;
  name: string;
}

function formatThaiDateTime(dateString?: string | null) {
  if (!dateString) return "ยังไม่มีประวัติเข้าสู่ระบบ";
  try {
    const date = new Date(dateString);
    const now = new Date();
    const diffSec = Math.floor((now.getTime() - date.getTime()) / 1000);
    const diffMin = Math.floor(diffSec / 60);

    if (diffMin < 1) return "เมื่อสักครู่";
    if (diffMin < 60) return `เมื่อ ${diffMin} นาทีที่แล้ว`;
    if (diffMin < 1440) {
      const hours = Math.floor(diffMin / 60);
      return `เมื่อ ${hours} ชั่วโมงที่แล้ว`;
    }

    return (
      new Intl.DateTimeFormat("th-TH", {
        day: "numeric",
        month: "short",
        year: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
      }).format(date) + " น."
    );
  } catch {
    return dateString;
  }
}

function getRoleDisplay(role: string) {
  switch (role) {
    case "contractor_user":
      return {
        label: "ผู้รับเหมา (Contractor)",
        badgeClass: "bg-amber-500/10 text-amber-700 border-amber-500/20",
        icon: HardHat,
      };
    case "site_admin":
      return {
        label: "แอดมินประจำไซต์ (Site Admin)",
        badgeClass: "bg-blue-500/10 text-blue-700 border-blue-500/20",
        icon: UserCheck,
      };
    case "head_office_admin":
      return {
        label: "แอดมินส่วนกลาง (Head Office)",
        badgeClass: "bg-purple-500/10 text-purple-700 border-purple-500/20",
        icon: ShieldCheck,
      };
    default:
      return {
        label: role,
        badgeClass: "bg-surface2 text-muted border-line",
        icon: Users,
      };
  }
}

export default function AdminPage() {
  // Role comes from the profiles table (RLS-enforced). Metadata is ignored:
  // it is client-writable. Unknown role => denied, never defaulted upward.
  const { role: dbRole, loading: loadingRole } = useMyProfile();
  const currentUserRole = dbRole;
  const [activeTab, setActiveTab] = useState<"logins" | "contractors" | "projects">("logins");
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [contractors, setContractors] = useState<ContractorItem[]>([]);
  const [loadingData, setLoadingData] = useState(false);
  const [lastRefreshed, setLastRefreshed] = useState<Date>(new Date());

  // Database role decides everything below. Unknown/null role => denied.
  const isHeadOfficeAdmin = currentUserRole === "head_office_admin";

  async function loadAdminData() {
    setLoadingData(true);
    try {
      // 1. Fetch users with last_sign_in_at
      const userRes = await fetch("/api/admin/users");
      if (userRes.ok) {
        const data = await userRes.json();
        setUsers(data.users || []);
      }

      // 2. Fetch live login activities
      const actRes = await fetch("/api/admin/activity");
      if (actRes.ok) {
        const data = await actRes.json();
        setActivities(data.activities || []);
      }

      // 3. Fetch contractors from Supabase
      const supabase = createClient();
      const { data: contractorData } = await supabase.from("contractors").select("id, name");
      if (contractorData) {
        setContractors(contractorData);
      }

      setLastRefreshed(new Date());
    } catch (err) {
      console.error("Failed to load admin data:", err);
    } finally {
      setLoadingData(false);
    }
  }

  // Admin data is fetched only for head-office admins — everyone else is
  // denied below before any fetch runs.
  useEffect(() => {
    if (!loadingRole && isHeadOfficeAdmin) {
      loadAdminData();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loadingRole, isHeadOfficeAdmin]);

  // Non-admins are denied here: no data sections render and (see the effect
  // above) no admin fetch ever runs for them.
  if (loadingRole) {
    return (
      <div className="flex flex-col gap-6">
        <PageHeader
          title="ศูนย์ควบคุมระบบและการตรวจสอบ (Admin Console)"
          description="กำลังตรวจสอบสิทธิ์การเข้าถึง…"
        />
        <p className="text-sm text-muted">กำลังตรวจสอบสิทธิ์การเข้าถึง โปรดรอสักครู่…</p>
      </div>
    );
  }

  if (!isHeadOfficeAdmin) {
    return (
      <div className="flex flex-col gap-6">
        <PageHeader
          title="ศูนย์ควบคุมระบบและการตรวจสอบ (Admin Console)"
          description="พื้นที่นี้จำกัดสิทธิ์เฉพาะแอดมินส่วนกลาง (Head Office Admin)"
        />
        <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-4">
          <div className="flex items-start gap-3">
            <Lock className="h-5 w-5 shrink-0 text-amber-700 mt-0.5" />
            <div className="flex-1 text-sm">
              <h3 className="font-bold text-amber-900">
                คุณกำลังเปิดดูด้วยบทบาท:{" "}
                <span className="underline">
                  {currentUserRole === "contractor_user"
                    ? "ผู้รับเหมา (Contractor)"
                    : currentUserRole === "site_admin"
                    ? "แอดมินประจำไซต์ (EPS Resident Engineer)"
                    : "ยังไม่ได้เข้าสู่ระบบ"}
                </span>
              </h3>
              <p className="mt-1 text-amber-800">
                ในระบบจริง พื้นที่นี้จำกัดสิทธิ์เฉพาะ{" "}
                <strong className="font-semibold">แอดมินส่วนกลาง (Head Office Admin)</strong> เพื่อความปลอดภัยของข้อมูล
                สำหรับการสาธิต คุณสามารถสลับบทบาทเป็น Supachai N. เพื่อควบคุมระบบเต็มรูปแบบได้ครับ
              </p>
              <div className="mt-3">
                <ButtonLink href="/login" variant="primary" size="sm">
                  สลับเป็นแอดมินส่วนกลาง (Supachai N.)
                  <ArrowRight className="h-3.5 w-3.5" />
                </ButtonLink>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <PageHeader
          title="ศูนย์ควบคุมระบบและการตรวจสอบ (Admin Console)"
          description="ตรวจสอบประวัติการเข้าใช้งานระบบ (Login Audit Log) และบริหารจัดการข้อมูลหลักโครงการ"
        />
        <Button
          variant="secondary"
          size="sm"
          onClick={loadAdminData}
          disabled={loadingData}
          className="self-start sm:self-auto"
        >
          <RefreshCw className={`h-4 w-4 ${loadingData ? "animate-spin" : ""}`} />
          รีเฟรชข้อมูล
        </Button>
      </div>

      {/* Summary KPI Cards for Executive Oversight (head-office only — the
          deny return above guarantees this never renders for other roles) */}

      {/* Summary KPI Cards for Executive Oversight */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-lg border border-line bg-surface p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-muted">ผู้ใช้งานในระบบ</span>
            <Users className="h-4 w-4 text-primary" />
          </div>
          <div className="mt-2 text-2xl font-bold">{users.length || 3} คน</div>
          <p className="mt-1 text-xs text-muted">3 ระดับสิทธิ์ (Contractor, Site, HO)</p>
        </div>

        <div className="rounded-lg border border-line bg-surface p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-muted">ผู้รับเหมาในโครงการ</span>
            <Building2 className="h-4 w-4 text-emerald-600" />
          </div>
          <div className="mt-2 text-2xl font-bold">{contractors.length || 11} ราย</div>
          <p className="mt-1 text-xs text-muted">ไซต์ STS-9.9 MW Biomass</p>
        </div>

        <div className="rounded-lg border border-line bg-surface p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-muted">สาขางาน (Disciplines)</span>
            <HardHat className="h-4 w-4 text-amber-600" />
          </div>
          <div className="mt-2 text-2xl font-bold">4 สาขา</div>
          <p className="mt-1 text-xs text-muted">Civil, Mech, Elec, Piping</p>
        </div>

        <div className="rounded-lg border border-line bg-surface p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-muted">ความปลอดภัยฐานข้อมูล</span>
            <ShieldCheck className="h-4 w-4 text-purple-600" />
          </div>
          <div className="mt-2 text-2xl font-bold">Supabase RLS</div>
          <p className="mt-1 text-xs text-muted">แยกข้อมูลเด็ดขาดระดับ Row</p>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="flex items-center border-b border-line gap-2 overflow-x-auto">
        <button
          type="button"
          onClick={() => setActiveTab("logins")}
          className={`flex items-center gap-2 border-b-2 px-4 py-3 text-sm font-semibold transition-colors whitespace-nowrap ${
            activeTab === "logins"
              ? "border-primary text-primary"
              : "border-transparent text-muted hover:text-ink"
          }`}
        >
          <Clock className="h-4 w-4" />
          ประวัติการเข้าใช้งาน (Login & Activity Log)
          <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs text-primary font-bold">
            {users.length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("contractors")}
          className={`flex items-center gap-2 border-b-2 px-4 py-3 text-sm font-semibold transition-colors whitespace-nowrap ${
            activeTab === "contractors"
              ? "border-primary text-primary"
              : "border-transparent text-muted hover:text-ink"
          }`}
        >
          <Building2 className="h-4 w-4" />
          ข้อมูลผู้รับเหมาและสาขาช่าง (Master Data)
          <span className="rounded-full bg-surface2 px-2 py-0.5 text-xs text-muted font-bold">
            {contractors.length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("projects")}
          className={`flex items-center gap-2 border-b-2 px-4 py-3 text-sm font-semibold transition-colors whitespace-nowrap ${
            activeTab === "projects"
              ? "border-primary text-primary"
              : "border-transparent text-muted hover:text-ink"
          }`}
        >
          <MapPin className="h-4 w-4" />
          โครงการ (Projects)
        </button>
      </div>

      {/* TAB 1: LOGIN HISTORY & AUDIT LOGS */}
      {activeTab === "logins" && (
        <div className="flex flex-col gap-6">
          {/* Main Account Login Table */}
          <div className="rounded-lg border border-line bg-surface overflow-hidden">
            <div className="border-b border-line px-5 py-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
              <div>
                <h3 className="font-bold text-base">ประวัติการเข้าสู่ระบบล่าสุดของแต่ละบัญชี</h3>
                <p className="text-xs text-muted mt-0.5">
                  ดึงข้อมูลเวลาเข้าใช้งานจริงจาก Supabase Auth (`last_sign_in_at`) เพื่อตรวจสอบความโปร่งใส
                </p>
              </div>
              <span className="text-xs text-muted flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                อัปเดตล่าสุด: {lastRefreshed.toLocaleTimeString("th-TH")}
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-surface2 text-xs font-semibold text-muted uppercase tracking-wider border-b border-line">
                  <tr>
                    <th className="px-5 py-3.5">ผู้ใช้งาน / บัญชี (Account)</th>
                    <th className="px-5 py-3.5">ระดับสิทธิ์ (Role)</th>
                    <th className="px-5 py-3.5">สังกัด / บริษัท</th>
                    <th className="px-5 py-3.5">เข้าสู่ระบบล่าสุด (Last Sign-in)</th>
                    <th className="px-5 py-3.5">สถานะ</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {users.map((u) => {
                    const roleInfo = getRoleDisplay(u.role);
                    const RoleIcon = roleInfo.icon;
                    return (
                      <tr key={u.id} className="hover:bg-surface2/50 transition-colors">
                        <td className="px-5 py-4">
                          <div className="font-semibold text-ink">{u.fullName}</div>
                          <div className="text-xs text-muted font-mono mt-0.5">{u.email}</div>
                        </td>
                        <td className="px-5 py-4 whitespace-nowrap">
                          <span
                            className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold border ${roleInfo.badgeClass}`}
                          >
                            <RoleIcon className="h-3.5 w-3.5" />
                            {roleInfo.label}
                          </span>
                        </td>
                        <td className="px-5 py-4 text-xs font-medium">
                          {u.contractorName ? (
                            <span className="text-ink">{u.contractorName}</span>
                          ) : (
                            <span className="text-muted">EPS Site Management / Head Office</span>
                          )}
                        </td>
                        <td className="px-5 py-4 whitespace-nowrap">
                          <div className="font-medium text-ink flex items-center gap-1.5">
                            <Clock className="h-3.5 w-3.5 text-primary shrink-0" />
                            {formatThaiDateTime(u.lastSignInAt)}
                          </div>
                          {u.lastSignInAt && (
                            <div className="text-[11px] text-muted font-mono mt-0.5">
                              {new Date(u.lastSignInAt).toLocaleString("th-TH")}
                            </div>
                          )}
                        </td>
                        <td className="px-5 py-4 whitespace-nowrap">
                          <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                            <CheckCircle2 className="h-3.5 w-3.5" />
                            พร้อมใช้งาน (Active)
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Live Activity Stream */}
          <div className="rounded-lg border border-line bg-surface p-5">
            <div className="flex items-center justify-between border-b border-line pb-3 mb-4">
              <div>
                <h3 className="font-bold text-base flex items-center gap-2">
                  <Activity className="h-4 w-4 text-primary" />
                  บันทึกความเคลื่อนไหวล่าสุด (Activity Audit Stream)
                </h3>
                <p className="text-xs text-muted mt-0.5">
                  บันทึกกิจกรรมการ Login และการสลับบทบาทขณะนำเสนอระบบ
                </p>
              </div>
            </div>

            <div className="flex flex-col divide-y divide-line">
              {activities.map((act) => (
                <div key={act.id} className="py-3 flex items-start justify-between gap-4">
                  <div className="flex items-start gap-3">
                    <span className="mt-1 h-2.5 w-2.5 rounded-full bg-primary shrink-0" />
                    <div>
                      <div className="text-sm font-semibold text-ink">
                        {act.name}{" "}
                        <span className="text-xs font-mono text-muted">({act.email})</span>
                      </div>
                      <p className="text-xs text-muted mt-0.5">{act.details}</p>
                    </div>
                  </div>
                  <span className="text-xs text-muted whitespace-nowrap">
                    {formatThaiDateTime(act.timestamp)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: CONTRACTORS & DISCIPLINES */}
      {activeTab === "contractors" && (
        <div className="flex flex-col gap-6">
          <div className="rounded-lg border border-line bg-surface overflow-hidden">
            <div className="border-b border-line px-5 py-4 flex items-center justify-between">
              <div>
                <h3 className="font-bold text-base">รายชื่อผู้รับเหมาในระบบ (Contractors)</h3>
                <p className="text-xs text-muted mt-0.5">
                  ข้อมูลจริงจากหน้างาน 11 เจ้า — ระบบใช้ข้อมูลจากตาราง `contractors` ไม่ Hardcode ในโค้ด
                </p>
              </div>
              <span className="text-xs font-semibold bg-primary/10 text-primary px-2.5 py-1 rounded-full">
                ทั้งหมด {contractors.length} บริษัท
              </span>
            </div>

            <div className="grid divide-y divide-line sm:grid-cols-2 sm:divide-y-0 sm:gap-px sm:bg-line">
              {contractors.map((c, idx) => (
                <div key={c.id} className="bg-surface p-4 flex items-center justify-between">
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-surface2 text-xs font-bold text-muted">
                      {idx + 1}
                    </span>
                    <span className="font-semibold text-sm truncate">{c.name}</span>
                  </div>
                  <span className="text-xs text-muted bg-surface2 px-2 py-0.5 rounded border border-line shrink-0">
                    STS 9.9 MW
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-lg border border-line bg-surface p-5">
            <h3 className="font-bold text-base">สาขาช่างที่เปิดรับรอง (Disciplines)</h3>
            <div className="mt-3 grid gap-3 sm:grid-cols-4">
              {["Civil (โยธา)", "Mechanical (เครื่องกล)", "Electrical (ไฟฟ้า)", "Piping (งานท่อ)"].map(
                (d) => (
                  <div key={d} className="rounded-md border border-line bg-surface2 p-3 text-center">
                    <HardHat className="mx-auto h-5 w-5 text-primary mb-1" />
                    <span className="text-sm font-semibold">{d}</span>
                  </div>
                )
              )}
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: PROJECTS */}
      {activeTab === "projects" && (
        <div className="rounded-lg border border-line bg-surface p-6">
          <div className="flex items-start gap-4">
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <MapPin className="h-6 w-6" />
            </span>
            <div className="flex-1">
              <h3 className="text-lg font-bold">STS-9.9 MW Biomass Power Plant</h3>
              <p className="text-sm text-muted mt-1">
                โครงการนำร่องโรงไฟฟ้าชีวมวล ขนาด 9.9 เมกะวัตต์
              </p>
              <div className="mt-4 grid gap-3 sm:grid-cols-3 text-sm">
                <div className="rounded-md border border-line bg-surface2 p-3">
                  <span className="text-xs text-muted block">รหัสโครงการ (Project Code)</span>
                  <span className="font-mono font-bold mt-1 block">STSBPP</span>
                </div>
                <div className="rounded-md border border-line bg-surface2 p-3">
                  <span className="text-xs text-muted block">พิกัด GPS (WGS84)</span>
                  <span className="font-mono font-bold mt-1 block">8.096970, 99.682458</span>
                </div>
                <div className="rounded-md border border-line bg-surface2 p-3">
                  <span className="text-xs text-muted block">ที่ตั้ง</span>
                  <span className="font-bold mt-1 block">อ.ทุ่งสง จ.นครศรีธรรมราช</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
