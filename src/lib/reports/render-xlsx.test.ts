import { describe, expect, it } from "vitest";
import ExcelJS from "exceljs";
import { renderReportXlsx } from "./render-xlsx";
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

describe("renderReportXlsx", () => {
  it("produces a workbook with a Report sheet containing the header and activities", async () => {
    const buffer = await renderReportXlsx(samplePayload);
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(buffer as unknown as ArrayBuffer);

    const sheet = workbook.getWorksheet("Report");
    expect(sheet).toBeDefined();
    const values = sheet!.getSheetValues().flat().filter(Boolean).map(String);
    expect(values).toContain("STS-9.9 MW Biomass Power Plant");
    expect(values).toContain("งานเชื่อม");
    expect(values).toContain("ไม่มีอุบัติเหตุ");
  });

  it("handles a null safety section without crashing", async () => {
    const buffer = await renderReportXlsx({ ...samplePayload, safety: null });
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(buffer as unknown as ArrayBuffer);

    const sheet = workbook.getWorksheet("Report");
    const values = sheet!.getSheetValues().flat().filter(Boolean).map(String);
    expect(values).toContain("No data");
  });
});
