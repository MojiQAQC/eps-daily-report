import ExcelJS from "exceljs";
import type { ReportPayload } from "@/types";

export async function renderReportXlsx(payload: ReportPayload): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet("Report");

  sheet.addRow(["Project", payload.projectName, payload.projectCode ?? ""]);
  sheet.addRow(["Contractor", payload.contractorName, payload.contractorShortCode ?? ""]);
  sheet.addRow(["Report Date", payload.report.report_date]);
  sheet.addRow(["Report Type", payload.report.report_type]);
  sheet.addRow(["Time Start", payload.report.time_start ?? ""]);
  sheet.addRow(["Time Finish", payload.report.time_finish ?? ""]);
  sheet.addRow(["Overtime Hours", payload.report.overtime_hours ?? ""]);
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
  sheet.addRow(["Area", "Description", "Plan %", "Actual %", "Supervisor", "JSA"]);
  for (const a of payload.activities) {
    sheet.addRow([
      a.area ?? "",
      a.description,
      a.planned_progress ?? "",
      a.actual_progress ?? "",
      a.supervisor ?? "",
      a.jsa ? "Yes" : "No",
    ]);
  }
  sheet.addRow([]);

  sheet.addRow(["Safety"]);
  if (payload.safety) {
    sheet.addRow(["Accident Status", payload.safety.accident_status ?? ""]);
    sheet.addRow(["Remarks", payload.safety.remarks ?? ""]);
  } else {
    sheet.addRow(["No data"]);
  }
  sheet.addRow([]);

  sheet.addRow(["Work Permits"]);
  if (payload.permits.length > 0) {
    sheet.addRow(["Permit Type", "Count", "Workers", "Remarks"]);
    for (const p of payload.permits) {
      sheet.addRow([p.permit_type, p.count ?? "", p.workers ?? "", p.remarks ?? ""]);
    }
  } else {
    sheet.addRow(["No data"]);
  }
  sheet.addRow([]);

  sheet.addRow(["Equipment"]);
  if (payload.machinery.length > 0) {
    sheet.addRow(["Machinery Type", "Quantity"]);
    for (const m of payload.machinery) {
      sheet.addRow([m.machinery_type, m.quantity]);
    }
  } else {
    sheet.addRow(["No data"]);
  }
  sheet.addRow([]);

  sheet.addRow(["Safety Topics"]);
  if (payload.safetyTopics.length > 0) {
    for (const t of payload.safetyTopics) {
      sheet.addRow([t.topic]);
    }
  } else {
    sheet.addRow(["No data"]);
  }
  sheet.addRow([]);

  sheet.addRow(["Material Receive"]);
  if (payload.materialReceive.length > 0) {
    sheet.addRow(["Material", "Quantity", "Unit", "Received Date", "Remarks"]);
    for (const m of payload.materialReceive) {
      sheet.addRow([m.material_name, m.quantity ?? "", m.unit ?? "", m.received_date ?? "", m.remarks ?? ""]);
    }
  } else {
    sheet.addRow(["No data"]);
  }
  sheet.addRow([]);

  sheet.addRow(["Photos"]);
  if (payload.attachments.length > 0) {
    sheet.addRow(["Category", "Filename"]);
    for (const a of payload.attachments) {
      const filename = a.storage_path.split("/").pop() ?? a.storage_path;
      const category =
        a.kind === "progress_photo" ? "Progress Photo" : a.kind === "safety_photo" ? "Safety Photo" : "Photo";
      sheet.addRow([category, filename]);
    }
  } else {
    sheet.addRow(["No data"]);
  }

  const arrayBuffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(arrayBuffer);
}
