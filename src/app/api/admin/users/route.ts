import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

// Server-only admin client with elevated privileges
function getAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://wzxadsilewovzktaaiul.supabase.co";
  const secretKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!secretKey) {
    throw new Error("SUPABASE_SERVICE_ROLE_KEY is not configured in server environment");
  }
  return createClient(url, secretKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

export async function GET() {
  try {
    const admin = getAdminClient();

    // 1. Fetch all Auth users with their real last_sign_in_at
    const { data: authData, error: authError } = await admin.auth.admin.listUsers();
    if (authError) {
      return NextResponse.json({ error: authError.message }, { status: 500 });
    }

    // 2. Fetch profiles with contractor info
    const { data: profiles, error: profileError } = await admin
      .from("profiles")
      .select("id, full_name, role, contractor_id, created_at");

    if (profileError) {
      return NextResponse.json({ error: profileError.message }, { status: 500 });
    }

    // 3. Fetch contractors
    const { data: contractors } = await admin.from("contractors").select("id, name");
    const contractorMap = new Map((contractors || []).map((c) => [c.id, c.name]));
    const profileMap = new Map((profiles || []).map((p) => [p.id, p]));

    // 4. Combine into an enriched user list
    const enrichedUsers = authData.users.map((u) => {
      const profile = profileMap.get(u.id);
      const contractorName = profile?.contractor_id
        ? contractorMap.get(profile.contractor_id) || "ไม่ระบุบริษัท"
        : null;

      return {
        id: u.id,
        email: u.email,
        fullName: profile?.full_name || u.user_metadata?.full_name || u.email,
        role: profile?.role || u.user_metadata?.role || "contractor_user",
        contractorName: contractorName || (profile?.role === "contractor_user" ? "หจก. ฟาสต์สตีล จำกัด (Fast Steel)" : null),
        lastSignInAt: u.last_sign_in_at,
        createdAt: u.created_at,
        emailConfirmedAt: u.email_confirmed_at,
        status: u.banned_until ? "banned" : "active",
      };
    });

    // Sort by last_sign_in_at descending (most recent first)
    enrichedUsers.sort((a, b) => {
      if (!a.lastSignInAt) return 1;
      if (!b.lastSignInAt) return -1;
      return new Date(b.lastSignInAt).getTime() - new Date(a.lastSignInAt).getTime();
    });

    return NextResponse.json({ users: enrichedUsers });
  } catch (err) {
    console.error("Admin users API error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Internal Server Error" },
      { status: 500 }
    );
  }
}
