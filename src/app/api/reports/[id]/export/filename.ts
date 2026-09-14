import type { assembleReportPayload } from "@/lib/reports/assemble";

function sanitizeFilenamePart(value: string): string {
  return value.replace(/[^A-Za-z0-9._-]/g, "_");
}

export function filenameFor(
  payload: Awaited<ReturnType<typeof assembleReportPayload>>,
  ext: string,
) {
  if (!payload) return `report.${ext}`;
  const project = sanitizeFilenamePart(payload.projectCode ?? "PROJECT");
  const contractor = sanitizeFilenamePart(payload.contractorShortCode ?? "CONTRACTOR");
  const date = sanitizeFilenamePart(payload.report.report_date);
  const number = sanitizeFilenamePart(payload.report.report_number ?? "000");
  return `${project}_${contractor}_DAILY_${date}_${number}.${ext}`;
}
