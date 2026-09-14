import type { SupabaseClient } from "@supabase/supabase-js";
import type { Profile } from "@/types";

// Load a single profile row by auth user id through the caller's
// authenticated client (RLS decides what is visible — see migration 0002,
// which grants every user SELECT on their own profile row only).
// Returns null when signed out or when no profile row exists yet.
export async function getProfileById(
  supabase: SupabaseClient,
  userId: string,
): Promise<Profile | null> {
  const { data, error } = await supabase
    .from("profiles")
    .select("id, full_name, role, contractor_id, created_at")
    .eq("id", userId)
    .maybeSingle();

  if (error) {
    // Real failure (RLS denial, network, …) — not "no profile row".
    // Still fail closed (null), but say so: silent nulls disguise outages
    // as signed-out guests.
    console.warn("getProfileById failed:", error.message);
    return null;
  }
  if (!data) return null;
  return data as Profile;
}
