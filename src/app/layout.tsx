import "./globals.css";
import { AppShell } from "@/components/app-shell";

export const metadata = {
  title: {
    default: "EPS Daily Report & ความร่วมมือหน้างาน",
    template: "%s · EPS Daily Report",
  },
  description: "ระบบรายงานประจำวันและติดตามงานก่อสร้าง EPS",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="th">
      <body className="bg-bg text-ink antialiased">
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
