import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createClient as createSessionClient } from "@/lib/supabase/server";

export interface CallerProfile {
  id: string;
  role: string;
}

// Verifies the request's session cookie, then looks up the caller's profile
// with the service-role key (server only, bypasses RLS) and requires the
// head_office_admin role. Returns the profile on success, or a 401/403/500
// NextResponse the route handler must return directly.
export async function requireHeadOfficeAdmin(): Promise<CallerProfile | NextResponse> {
  try {
    const session = createSessionClient();
    const {
      data: { user },
    } = await session.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const secretKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !secretKey) {
      return NextResponse.json({ error: "Server misconfigured" }, { status: 500 });
    }
    const admin = createClient(url, secretKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
    const { data: profile } = await admin
      .from("profiles")
      .select("id, role")
      .eq("id", user.id)
      .maybeSingle();

    if (!profile || profile.role !== "head_office_admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    return profile as CallerProfile;
  } catch (err) {
    console.error("Admin guard error:", err);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
