"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { FormEvent } from "react";
import { Button, Field, FormError, TextInput } from "@/components/ui";
import { createClient } from "@/lib/supabase/client";
import type { UserRole } from "@/types";

// ---------------------------------------------------------------------------
// Demo-only quick sign-in for the single-presenter walkthrough
// (see docs/DEMO_ROLES.md). These buttons only fill in credentials for real
// Supabase Auth sign-in — the user's role always comes from the database
// (profiles + user_project_access, enforced by RLS), never from the button.
// Remove this section before production.
// ---------------------------------------------------------------------------

interface DemoPersona {
  role: UserRole;
  roleLabel: string;
  name: string;
  org: string;
  email: string;
  password: string;
}

const DEMO_PERSONAS: readonly DemoPersona[] = [
  {
    role: "contractor_user",
    roleLabel: "ผู้รับเหมา",
    name: "Puntakan S. (Site Lead)",
    org: "Fast Steel · STS 9.9 MW",
    email: "contractor@faststeel.demo",
    password: "DemoPassword2026!",
  },
  {
    role: "site_admin",
    roleLabel: "แอดมินประจำไซต์",
    name: "Somchai K. (Resident Engineer)",
    org: "EPS Site Management",
    email: "site.admin@eps.demo",
    password: "DemoPassword2026!",
  },
  {
    role: "head_office_admin",
    roleLabel: "แอดมินส่วนกลาง",
    name: "Supachai N. (Project Director)",
    org: "EPS Head Office",
    email: "admin@eps.demo",
    password: "DemoPassword2026!",
  },
];

export default function LoginForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [demoLoading, setDemoLoading] = useState<UserRole | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function signInWith(signInEmail: string, signInPassword: string, personaName?: string, personaRole?: string) {
    setError(null);
    const supabase = createClient();
    const { data: authData, error: signInError } = await supabase.auth.signInWithPassword({
      email: signInEmail,
      password: signInPassword,
    });
    if (signInError) {
      setError(
        signInError.message === "Invalid login credentials"
          ? "อีเมลหรือรหัสผ่านไม่ถูกต้อง หากคุณเพิ่งได้รับคำเชิญ โปรดยืนยันอีเมลก่อนเข้าสู่ระบบ"
          : signInError.message,
      );
      return;
    }

    // Log the sign in activity for Admin Audit Log
    try {
      await fetch("/api/admin/activity", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: signInEmail,
          name: personaName || authData.user?.user_metadata?.full_name || signInEmail,
          role: personaRole || authData.user?.user_metadata?.role || "contractor_user",
          action: "LOGIN",
          details: `เข้าสู่ระบบสำเร็จผ่าน ${personaRole ? "1-Click Demo Portal" : "แบบฟอร์มเข้าสู่ระบบ"}`,
        }),
      });
    } catch {
      // Non-blocking
    }

    router.push("/");
    router.refresh();
  }

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);

    if (!email.trim() || !password) {
      setError("กรุณากรอกอีเมลและรหัสผ่านเพื่อเข้าสู่ระบบ");
      return;
    }

    setLoading(true);
    try {
      await signInWith(email.trim(), password);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "การเข้าสู่ระบบล้มเหลว โปรดตรวจสอบการเชื่อมต่ออินเทอร์เน็ตแล้วลองใหม่อีกครั้ง",
      );
    } finally {
      setLoading(false);
    }
  }

  async function onDemoSignIn(persona: DemoPersona) {
    setDemoLoading(persona.role);
    try {
      await signInWith(persona.email, persona.password, persona.name, persona.role);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "การเข้าสู่ระบบล้มเหลว โปรดตรวจสอบการเชื่อมต่ออินเทอร์เน็ตแล้วลองใหม่อีกครั้ง",
      );
    } finally {
      setDemoLoading((current) => (current === persona.role ? null : current));
    }
  }

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-md flex-col justify-center px-4 py-12">
      <div className="flex items-center gap-2.5">
        <span
          aria-hidden
          className="flex h-10 w-10 items-center justify-center rounded-md bg-primary text-sm font-bold text-onprimary"
        >
          EPS
        </span>
        <div>
          <p className="text-base font-bold leading-tight">EPS Daily Report</p>
          <p className="text-xs text-muted">STS-9.9 MW Biomass · โครงการนำร่อง</p>
        </div>
      </div>

      <h1 className="mt-8 text-2xl font-bold">เข้าสู่ระบบ</h1>
      <p className="mt-1 text-sm text-muted">
        บัญชีผู้ใช้งานสร้างผ่านระบบคำเชิญโดยผู้ดูแลระบบเท่านั้น ไม่มีการเปิดรับสมัครทั่วไปใน Phase 1 เมื่อผู้ดูแลระบบส่งคำเชิญและคุณตั้งรหัสผ่านเรียบร้อยแล้ว จึงจะสามารถเข้าสู่ระบบได้
      </p>

      <form onSubmit={onSubmit} noValidate className="mt-6 flex flex-col gap-4">
        <FormError message={error} />
        <Field label="อีเมล (Email)" htmlFor="email">
          <TextInput
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            placeholder="name@company.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </Field>
        <Field label="รหัสผ่าน (Password)" htmlFor="password">
          <TextInput
            id="password"
            name="password"
            type={showPassword ? "text" : "password"}
            autoComplete="current-password"
            placeholder="กรอกรหัสผ่านของคุณ"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </Field>
        <label className="flex min-h-[44px] cursor-pointer items-center gap-2 text-sm font-medium">
          <input
            type="checkbox"
            checked={showPassword}
            onChange={(e) => setShowPassword(e.target.checked)}
            className="h-5 w-5 accent-[var(--primary)]"
          />
          แสดงรหัสผ่าน
        </label>
        <Button type="submit" loading={loading}>
          {loading ? "กำลังเข้าสู่ระบบ…" : "เข้าสู่ระบบ"}
        </Button>
      </form>

      <div className="mt-8 border-t border-line pt-6" aria-label="บัญชีทดลอง">
        <h2 className="text-sm font-bold">
          บัญชีทดลองสำหรับพรีเซนต์ <span className="text-muted">(Demo only)</span>
        </h2>
        <p className="mt-1 text-xs leading-relaxed text-muted">
          เข้าสู่ระบบทันทีด้วยบัญชีทดลองตามบทบาท สิทธิ์จริงถูกกำหนดจากฐานข้อมูลหลังเข้าสู่ระบบ
          ควรลบบัญชีเหล่านี้ออกก่อนใช้งานจริง
        </p>
        <div className="mt-3 flex flex-col gap-2">
          {DEMO_PERSONAS.map((persona) => {
            const isLoading = demoLoading === persona.role;
            return (
              <button
                key={persona.role}
                type="button"
                onClick={() => onDemoSignIn(persona)}
                disabled={loading || (demoLoading !== null && !isLoading)}
                aria-busy={isLoading || undefined}
                className="inline-flex min-h-[44px] w-full items-center gap-3 rounded-md border border-line bg-surface px-4 py-2.5 text-left transition-colors duration-200 hover:bg-surface2 active:bg-surface2 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isLoading ? (
                  <span
                    aria-hidden
                    className="inline-block h-4 w-4 shrink-0 animate-spin rounded-full border-2 border-current border-t-transparent"
                  />
                ) : (
                  <span
                    aria-hidden
                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-primary text-xs font-bold text-onprimary"
                  >
                    {persona.roleLabel.slice(0, 1)}
                  </span>
                )}
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-semibold">
                    {isLoading ? "กำลังเข้าสู่ระบบ…" : persona.name}
                  </span>
                  <span className="block truncate text-xs text-muted">
                    {persona.roleLabel} · {persona.org} · {persona.email}
                  </span>
                </span>
              </button>
            );
          })}
        </div>
      </div>

      <p className="mt-6 text-xs leading-relaxed text-muted">
        สิทธิ์การเข้าถึงจะถูกจำกัดเฉพาะผู้รับเหมา โครงการ และสาขางานที่คุณได้รับมอบหมาย หากคุณเข้าสู่ระบบได้แต่ไม่พบข้อมูล แสดงว่าผู้ดูแลระบบยังไม่ได้กำหนดสิทธิ์โครงการให้คุณ
      </p>
    </div>
  );
}
