import { chromium } from "playwright";
import { renderToStaticMarkup } from "react-dom/server";
import { ReportView } from "@/components/report-view/ReportView";
import type { ReportPayload } from "@/types";

export async function renderReportPdf(payload: ReportPayload): Promise<Buffer> {
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
    .bg-bg { background: var(--bg); } .text-ink { color: var(--ink); }
    .text-muted { color: var(--muted); } .border-line { border-color: var(--line); }
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
