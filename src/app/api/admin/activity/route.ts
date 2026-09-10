import { NextResponse } from "next/server";

export interface ActivityLogItem {
  id: string;
  email: string;
  name: string;
  role: string;
  action: "LOGIN" | "SWITCH_ROLE" | "SUBMIT_REPORT" | "LOGOUT";
  timestamp: string;
  details?: string;
}

// In-memory ring buffer for runtime event tracking (up to 100 recent actions)
const RECENT_ACTIVITIES: ActivityLogItem[] = [
  {
    id: "act-1",
    email: "admin@eps.demo",
    name: "Supachai N. (Project Director)",
    role: "head_office_admin",
    action: "LOGIN",
    timestamp: new Date(Date.now() - 3 * 60 * 1000).toISOString(),
    details: "เข้าสู่ระบบผ่าน EPS Single Sign-in (Head Office)",
  },
  {
    id: "act-2",
    email: "site.admin@eps.demo",
    name: "Somchai K. (EPS Resident Engineer)",
    role: "site_admin",
    action: "LOGIN",
    timestamp: new Date(Date.now() - 15 * 60 * 1000).toISOString(),
    details: "เข้าสู่ระบบเพื่อตรวจสอบไซต์งาน STS 9.9 MW",
  },
  {
    id: "act-3",
    email: "contractor@faststeel.demo",
    name: "Puntakan S. (Site Lead)",
    role: "contractor_user",
    action: "LOGIN",
    timestamp: new Date(Date.now() - 42 * 60 * 1000).toISOString(),
    details: "เข้าสู่ระบบผู้รับเหมา: หจก. ฟาสต์สตีล จำกัด",
  },
];

export async function GET() {
  return NextResponse.json({ activities: RECENT_ACTIVITIES });
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const newActivity: ActivityLogItem = {
      id: `act-${Date.now()}`,
      email: body.email || "unknown",
      name: body.name || body.email || "User",
      role: body.role || "contractor_user",
      action: body.action || "LOGIN",
      timestamp: new Date().toISOString(),
      details: body.details || "เข้าสู่ระบบ",
    };

    RECENT_ACTIVITIES.unshift(newActivity);
    if (RECENT_ACTIVITIES.length > 100) {
      RECENT_ACTIVITIES.pop();
    }

    return NextResponse.json({ success: true, activity: newActivity });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Error logging activity" },
      { status: 500 }
    );
  }
}
