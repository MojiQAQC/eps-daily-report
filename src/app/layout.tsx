import "./globals.css";

export const metadata = {
  title: "EPS Daily Report & Site Collaboration",
  description: "Structured daily site reporting for EPS construction projects",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
