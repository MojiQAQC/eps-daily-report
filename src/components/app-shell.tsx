"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
  ClipboardList,
  Database,
  History,
  LogIn,
  LogOut,
  type LucideIcon,
  Menu,
  Rss,
  LayoutDashboard,
  ShieldCheck,
  UserCheck,
  HardHat,
  X,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";

const NAV: { href: string; label: string; icon: LucideIcon }[] = [
  { href: "/", label: "ภาพรวม", icon: LayoutDashboard },
  { href: "/daily-report", label: "รายงานประจำวัน", icon: ClipboardList },
  { href: "/history", label: "ประวัติรายงาน", icon: History },
  { href: "/updates", label: "ฟีดอัปเดตงาน", icon: Rss },
  { href: "/admin", label: "ข้อมูลหลัก (Master)", icon: Database },
];

function isActive(pathname: string, href: string) {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}

function getRoleBadge(role?: string) {
  switch (role) {
    case "contractor_user":
      return {
        label: "ผู้รับเหมา (Fast Steel)",
        icon: HardHat,
        className: "bg-amber-500/10 text-amber-700 border border-amber-500/20",
      };
    case "site_admin":
      return {
        label: "แอดมินประจำไซต์ (EPS)",
        icon: UserCheck,
        className: "bg-blue-500/10 text-blue-700 border border-blue-500/20",
      };
    case "head_office_admin":
      return {
        label: "แอดมินส่วนกลาง (EPS)",
        icon: ShieldCheck,
        className: "bg-purple-500/10 text-purple-700 border border-purple-500/20",
      };
    default:
      return null;
  }
}

export function AppShell({
  children,
  projectName = "STS-9.9 MW Biomass",
}: {
  children: React.ReactNode;
  projectName?: string;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [sessionUser, setSessionUser] = useState<{
    email?: string;
    name?: string;
    role?: string;
  } | null>(null);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) {
        setSessionUser({
          email: data.user.email,
          name: data.user.user_metadata?.full_name || data.user.email,
          role: data.user.user_metadata?.role,
        });
      } else {
        setSessionUser(null);
      }
    });

    const { data: authListener } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        if (session?.user) {
          setSessionUser({
            email: session.user.email,
            name: session.user.user_metadata?.full_name || session.user.email,
            role: session.user.user_metadata?.role,
          });
        } else {
          setSessionUser(null);
        }
      }
    );

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, []);

  async function handleSignOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    setSessionUser(null);
    router.push("/login");
    router.refresh();
  }

  // Auth surface stands alone — no app chrome on the login page.
  if (pathname === "/login") {
    return <div className="min-h-dvh bg-bg">{children}</div>;
  }

  const roleBadge = getRoleBadge(sessionUser?.role);

  return (
    <div className="min-h-dvh bg-bg text-ink">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:left-3 focus:top-3 focus:rounded-md focus:bg-primary focus:px-3 focus:py-2 focus:text-onprimary"
      >
        ข้ามไปยังเนื้อหา
      </a>

      {/* Top bar */}
      <header className="sticky top-0 z-sticky border-b border-line bg-bg">
        <div className="mx-auto flex h-16 max-w-6xl items-center gap-3 px-4">
          <button
            type="button"
            className="inline-flex h-11 w-11 items-center justify-center rounded-md hover:bg-surface lg:hidden"
            aria-expanded={open}
            aria-label={open ? "ปิดเมนูนำทาง" : "เปิดเมนูนำทาง"}
            onClick={() => setOpen((v) => !v)}
          >
            {open ? <X className="h-5 w-5" aria-hidden /> : <Menu className="h-5 w-5" aria-hidden />}
          </button>
          <Link href="/" className="flex min-w-0 items-center gap-2.5">
            <span
              aria-hidden
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-primary text-sm font-bold text-onprimary"
            >
              EPS
            </span>
            <span className="min-w-0">
              <span className="block truncate text-sm font-bold leading-tight">
                Daily Report
              </span>
              <span className="block truncate text-xs text-muted">{projectName}</span>
            </span>
          </Link>

          {/* User Session & Role Indicator */}
          <div className="ml-auto flex items-center gap-2">
            {sessionUser ? (
              <div className="flex items-center gap-2">
                {roleBadge && (
                  <span
                    className={`hidden sm:inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold ${roleBadge.className}`}
                  >
                    <roleBadge.icon className="h-3.5 w-3.5 shrink-0" aria-hidden />
                    {roleBadge.label}
                  </span>
                )}
                <span className="hidden md:inline-block text-xs text-muted truncate max-w-[140px]">
                  {sessionUser.name}
                </span>
                <Link
                  href="/login"
                  title="สลับบทบาทนำเสนอ"
                  className="inline-flex min-h-[36px] items-center gap-1 rounded-md px-2 text-xs font-semibold text-muted hover:bg-surface hover:text-ink transition-colors"
                >
                  สลับบทบาท
                </Link>
                <button
                  type="button"
                  onClick={handleSignOut}
                  title="ออกจากระบบ"
                  className="inline-flex h-9 w-9 items-center justify-center rounded-md text-muted hover:bg-red-500/10 hover:text-red-600 transition-colors"
                >
                  <LogOut className="h-4 w-4" aria-hidden />
                </button>
              </div>
            ) : (
              <Link
                href="/login"
                className="inline-flex min-h-[44px] items-center gap-1.5 rounded-md px-3 text-sm font-semibold text-primary hover:bg-surface hover:text-ink transition-colors"
              >
                <LogIn className="h-4 w-4" aria-hidden />
                เข้าสู่ระบบ (Demo 3 ระดับ)
              </Link>
            )}
          </div>
        </div>

        {/* Mobile nav */}
        {open && (
          <nav aria-label="เมนูหลัก" className="border-t border-line px-4 py-2 lg:hidden">
            <ul className="flex flex-col">
              {NAV.map((item) => (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    aria-current={isActive(pathname, item.href) ? "page" : undefined}
                    onClick={() => setOpen(false)}
                    className={`flex items-center gap-2.5 rounded-md px-3 py-3 text-base font-semibold transition-colors duration-200 ${
                      isActive(pathname, item.href)
                        ? "bg-primary text-onprimary"
                        : "hover:bg-surface"
                    }`}
                  >
                    <item.icon className="h-5 w-5 shrink-0" aria-hidden />
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        )}
      </header>

      <div className="mx-auto flex max-w-6xl items-start gap-8 px-4">
        {/* Sidebar */}
        <nav aria-label="เมนูหลัก" className="sticky top-16 hidden w-60 shrink-0 py-6 lg:block">
          <ul className="flex flex-col gap-1 rounded-md bg-surface p-2">
            {NAV.map((item) => {
              const active = isActive(pathname, item.href);
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    aria-current={active ? "page" : undefined}
                    className={`flex items-center gap-2.5 rounded-md px-3 py-2.5 text-sm font-semibold transition-colors duration-200 ${
                      active ? "bg-primary text-onprimary" : "text-ink hover:bg-surface2"
                    }`}
                  >
                    <item.icon className="h-4 w-4 shrink-0" aria-hidden />
                    {item.label}
                  </Link>
                </li>
              );
            })}
          </ul>
          <p className="mt-4 px-2 text-xs leading-relaxed text-muted">
            โครงการนำร่อง Phase 1 · ฟังก์ชันต่างๆ จะทยอยเปิดใช้งานตามขั้นตอนการพัฒนา
          </p>
        </nav>

        <main id="main" className="min-w-0 flex-1 py-6 pb-16">
          {children}
        </main>
      </div>
    </div>
  );
}
