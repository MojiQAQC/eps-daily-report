import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { assembleReportPayload } from "@/lib/reports/assemble";
import { renderReportPdf } from "@/lib/reports/render-pdf";
import { renderReportXlsx } from "@/lib/reports/render-xlsx";

function filenameFor(payload: Awaited<ReturnType<typeof assembleReportPayload>>, ext: string) {
  if (!payload) return `report.${ext}`;
  const project = payload.projectCode ?? "PROJECT";
  const contractor = payload.contractorShortCode ?? "CONTRACTOR";
  const date = payload.report.report_date;
  const number = payload.report.report_number ?? "000";
  return `${project}_${contractor}_DAILY_${date}_${number}.${ext}`;
}

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  const format = request.nextUrl.searchParams.get("format");
  if (format !== "pdf" && format !== "xlsx") {
    return NextResponse.json(
      { error: "format must be 'pdf' or 'xlsx'" },
      { status: 400 },
    );
  }

  const supabase = createClient();
  const payload = await assembleReportPayload(supabase, params.id);

  if (!payload) {
    return NextResponse.json({ error: "report not found" }, { status: 404 });
  }
  if (payload.report.status !== "submitted") {
    return NextResponse.json(
      { error: "only submitted reports can be exported" },
      { status: 403 },
    );
  }

  const buffer =
    format === "pdf" ? await renderReportPdf(payload) : await renderReportXlsx(payload);
  const filename = filenameFor(payload, format);
  const contentType =
    format === "pdf"
      ? "application/pdf"
      : "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": contentType,
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
