import ExcelJS from "exceljs";
import type { ReportPayload } from "@/types";

export async function renderReportXlsx(payload: ReportPayload): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet("Report");

  sheet.addRow(["Project", payload.projectName, payload.projectCode ?? ""]);
  sheet.addRow(["Contractor", payload.contractorName, payload.contractorShortCode ?? ""]);
  sheet.addRow(["Report Date", payload.report.report_date]);
  sheet.addRow(["Report Type", payload.report.report_type]);
  sheet.addRow(["Cumulative Plan %", payload.report.cumulative_plan_pct ?? ""]);
  sheet.addRow(["Cumulative Actual %", payload.report.cumulative_actual_pct ?? ""]);
  sheet.addRow([]);

  sheet.addRow(["Workforce"]);
  sheet.addRow(["Role", "Male", "Female"]);
  for (const w of payload.workforce) {
    sheet.addRow([w.role_name, w.male_count, w.female_count]);
  }
  sheet.addRow([]);

  sheet.addRow(["Activities"]);
  sheet.addRow(["Area", "Description", "Plan %", "Actual %", "Supervisor"]);
  for (const a of payload.activities) {
    sheet.addRow([a.area ?? "", a.description, a.planned_progress ?? "", a.actual_progress ?? "", a.supervisor ?? ""]);
  }

  const arrayBuffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(arrayBuffer);
}
