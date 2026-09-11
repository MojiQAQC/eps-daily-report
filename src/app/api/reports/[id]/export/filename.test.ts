import { describe, expect, it } from "vitest";
import { filenameFor } from "./filename";
import type { ReportPayload } from "@/types";

function makePayload(overrides: Partial<ReportPayload> = {}): ReportPayload {
  return {
    report: {
      id: "r1",
      project_id: "p1",
      contractor_id: "c1",
      report_date: "2026-09-04",
      report_type: "end_of_day_actual",
      status: "submitted",
      created_at: "2026-09-04T10:00:00Z",
      report_number: "0042",
    },
    projectName: "STS-9.9 MW Biomass Power Plant",
    projectCode: "STSBPP",
    contractorName: "RETS",
    contractorShortCode: "RETS",
    workforce: [],
    activities: [],
    safety: null,
    attachments: [],
    ...overrides,
  };
}

describe("filenameFor", () => {
  it("builds a filename from project code, contractor code, date, and report number", () => {
    const filename = filenameFor(makePayload(), "pdf");
    expect(filename).toBe("STSBPP_RETS_DAILY_2026-09-04_0042.pdf");
  });

  it("sanitizes a report_number containing a quote, semicolon, and space", () => {
    const payload = makePayload({
      report: {
        ...makePayload().report,
        report_number: '1"; rm -rf /; 2',
      },
    });
    const filename = filenameFor(payload, "xlsx");
    expect(filename).not.toMatch(/["; ]/);
    expect(filename).toBe("STSBPP_RETS_DAILY_2026-09-04_1___rm_-rf____2.xlsx");
  });

  it("falls back to PROJECT/CONTRACTOR/000 when project, contractor, and report_number are null", () => {
    const payload = makePayload({
      projectCode: null,
      contractorShortCode: null,
      report: {
        ...makePayload().report,
        report_number: null,
      },
    });
    const filename = filenameFor(payload, "pdf");
    expect(filename).toBe("PROJECT_CONTRACTOR_DAILY_2026-09-04_000.pdf");
  });

  it("returns a generic filename when payload is null", () => {
    expect(filenameFor(null, "pdf")).toBe("report.pdf");
  });
});
