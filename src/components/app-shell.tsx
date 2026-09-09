"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

const NAV = [
  { href: "/", label: "ภาพรวม" },
  { href: "/daily-report", label: "รายงานประจำวัน" },
  { href: "/history", label: "ประวัติรายงาน" },
  { href: "/updates", label: "ฟีดอัปเดตงาน" },
  { href: "/admin", label: "ข้อมูลหลัก (Master)" },
] as const;

function isActive(pathname: string, href: string) {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function AppShell({
  children,
  projectName = "STS-9.9 MW Biomass",
}: {
  children: React.ReactNode;
  projectName?: string;
}) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  // Auth surface stands alone — no app chrome on the login page.
  if (pathname === "/login") {
    return <div className="min-h-dvh bg-bg">{children}</div>;
  }

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
            <span aria-hidden className="text-xl leading-none">
              {open ? "✕" : "☰"}
            </span>
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
          <div className="ml-auto">
            <Link
              href="/login"
              className="inline-flex min-h-[44px] items-center rounded-md px-3 text-sm font-semibold text-muted hover:bg-surface hover:text-ink"
            >
              เข้าสู่ระบบ
            </Link>
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
                    className={`block rounded-md px-3 py-3 text-base font-semibold transition-colors duration-200 ${
                      isActive(pathname, item.href)
                        ? "bg-primary text-onprimary"
                        : "hover:bg-surface"
                    }`}
                  >
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
                    className={`block rounded-md px-3 py-2.5 text-sm font-semibold transition-colors duration-200 ${
                      active ? "bg-primary text-onprimary" : "text-ink hover:bg-surface2"
                    }`}
                  >
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
