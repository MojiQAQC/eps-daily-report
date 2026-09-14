"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { getProfileById } from "@/lib/data-access/profiles";
import type { Profile, UserRole } from "@/types";

export interface MyProfileState {
  /** Auth user id, null when signed out. */
  userId: string | null;
  /** Database profile row, null when signed out or not yet provisioned. */
  profile: Profile | null;
  /** Database role — the ONLY role source the UI may gate on. Fail-closed. */
  role: UserRole | null;
  /** Display-only identity from the session (never used for access). */
  displayName: string | null;
  email: string | null;
  loading: boolean;
}

// Resolves the signed-in user's role from the profiles table (RLS-enforced).
// Never falls back to user_metadata for access decisions: metadata is
// client-writable, the database is not.
export function useMyProfile(): MyProfileState {
  const [state, setState] = useState<MyProfileState>({
    userId: null,
    profile: null,
    role: null,
    displayName: null,
    email: null,
    loading: true,
  });

  useEffect(() => {
    let cancelled = false;
    const done = (patch: Omit<MyProfileState, "loading">) =>
      setState({ ...patch, loading: false });
    const empty: Omit<MyProfileState, "loading"> = {
      userId: null,
      profile: null,
      role: null,
      displayName: null,
      email: null,
    };

    async function resolve() {
      try {
        const supabase = createClient();
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (cancelled) return;
        if (!user) {
          done({ ...empty });
          return;
        }
        const displayName =
          (typeof user.user_metadata?.full_name === "string" && user.user_metadata.full_name) ||
          user.email ||
          null;
        const profile = await getProfileById(supabase, user.id);
        if (cancelled) return;
        done({
          userId: user.id,
          profile,
          role: profile?.role ?? null,
          displayName,
          email: user.email ?? null,
        });
      } catch {
        if (!cancelled) done({ ...empty });
      }
    }

    void resolve();

    // Re-resolve on sign-in/out in this or another tab so role views never
    // go stale (gating data itself stays RLS/API-enforced regardless).
    let unsubscribe: (() => void) | undefined;
    try {
      const supabase = createClient();
      const { data: listener } = supabase.auth.onAuthStateChange(() => {
        if (!cancelled) void resolve();
      });
      unsubscribe = () => listener?.subscription?.unsubscribe?.();
    } catch {
      // Auth listener is best-effort; initial resolve above already ran.
    }
    return () => {
      cancelled = true;
      unsubscribe?.();
    };
  }, []);

  return state;
}
