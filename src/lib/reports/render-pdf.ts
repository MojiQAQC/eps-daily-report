import { chromium } from "playwright";
import { ReportView } from "@/components/report-view/ReportView";
import type { ReportPayload } from "@/types";

export async function renderReportPdf(payload: ReportPayload): Promise<Buffer> {
  const { renderToStaticMarkup } = await import("react-dom/server");
  const bodyHtml = renderToStaticMarkup(ReportView({ payload }));
  const html = `<!doctype html>
<html lang="th">
<head>
  <meta charset="utf-8" />
  <style>
    body { font-family: "Noto Sans Thai", Inter, sans-serif; }
    :root {
      --bg: #ffffff; --ink: #1a1f14; --muted: #6b6f61; --line: #d9ddcf;
      --surface2: #eceee4;
    }
    .bg-bg { background: var(--bg); }
    .text-ink { color: var(--ink); }
    .text-muted { color: var(--muted); }
    .border-line { border-color: var(--line); }
    .bg-surface2 { background: var(--surface2); }

    .flex { display: flex; }
    .flex-col { flex-direction: column; }
    .flex-wrap { flex-wrap: wrap; }
    .grid { display: grid; }
    .items-start { align-items: flex-start; }
    .items-center { align-items: center; }
    .justify-between { justify-content: space-between; }
    .inline-flex { display: inline-flex; }

    .gap-1 { gap: 0.25rem; }
    .gap-4 { gap: 1rem; }
    .gap-6 { gap: 1.5rem; }

    .grid-cols-2 { grid-template-columns: repeat(2, minmax(0, 1fr)); }
    @media (min-width: 640px) {
      .sm\:grid-cols-4 { grid-template-columns: repeat(4, minmax(0, 1fr)); }
    }

    .p-8 { padding: 2rem; }
    .pb-4 { padding-bottom: 1rem; }
    .px-2\.5 { padding-left: 0.625rem; padding-right: 0.625rem; }
    .py-1 { padding-top: 0.25rem; padding-bottom: 0.25rem; }
    .mt-2 { margin-top: 0.5rem; }

    .w-full { width: 100%; }
    .text-left { text-align: left; }
    .text-right { text-align: right; }
    .align-top { vertical-align: top; }

    .text-xs { font-size: 0.75rem; line-height: 1.4; }
    .text-sm { font-size: 0.875rem; line-height: 1.5; }
    .text-base { font-size: 1rem; line-height: 1.55; }
    .text-xl { font-size: 1.25rem; line-height: 1.3; }
    .font-semibold { font-weight: 600; }
    .font-bold { font-weight: 700; }

    .border-b { border-bottom-width: 1px; border-bottom-style: solid; }
    .rounded-full { border-radius: 9999px; }

    table { border-collapse: collapse; }
  </style>
</head>
<body>${bodyHtml}</body>
</html>`;

  const browser = await chromium.launch();
  try {
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: "networkidle" });
    const pdf = await page.pdf({ format: "A4", printBackground: true });
    return pdf;
  } finally {
    await browser.close();
  }
}
