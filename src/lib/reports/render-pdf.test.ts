import { describe, expect, it } from "vitest";
import { renderReportPdf } from "./render-pdf";
import type { ReportPayload } from "@/types";

const samplePayload: ReportPayload = {
  report: {
    id: "r1", project_id: "p1", contractor_id: "c1", report_date: "2026-09-04",
    report_type: "end_of_day_actual", status: "submitted", created_at: "2026-09-04T10:00:00Z",
  },
  projectName: "STS-9.9 MW Biomass Power Plant",
  projectCode: "STSBPP",
  contractorName: "RETS",
  contractorShortCode: "RETS",
  workforce: [{ id: "w1", daily_report_id: "r1", role_name: "รวมกำลังคนวันนี้", male_count: 15, female_count: 0 }],
  activities: [
    { id: "a1", daily_report_id: "r1", area: "Stack", description: "งานเชื่อม", planned_progress: 20, actual_progress: 20 },
  ],
  safety: { daily_report_id: "r1", accident_status: "ไม่มีอุบัติเหตุ" },
};

describe("renderReportPdf", () => {
  it("produces a non-empty, well-formed PDF buffer", async () => {
    const buffer = await renderReportPdf(samplePayload);
    expect(buffer.length).toBeGreaterThan(1000);
    expect(buffer.subarray(0, 4).toString("ascii")).toBe("%PDF");
  }, 30_000);
});
