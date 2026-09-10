// Browser-side Supabase client. Uses PUBLIC env vars only.
// Do not import this file from server-only code paths that need elevated privileges.
import { createBrowserClient } from "@supabase/ssr";

const FALLBACK_URL = "https://wzxadsilewovzktaaiul.supabase.co";
const FALLBACK_ANON_KEY = "sb_publishable_-9GHM_bcc5YNF0CbhIRC4g_ZBpH148G";

export function createClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || FALLBACK_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || FALLBACK_ANON_KEY;

  return createBrowserClient(url, anonKey);
}
