import { describe, expect, it, vi } from "vitest";
import { assembleReportPayload } from "./assemble";

function makeSupabaseStub(overrides: {
  report: any;
  reportError?: any;
  project: any;
  contractor: any;
  workforce: any[];
  activities: any[];
  safety: any | null;
}) {
  return {
    from(table: string) {
      const builder: any = {
        select: () => builder,
        eq: () => builder,
        single: async () => {
          if (table === "daily_reports")
            return { data: overrides.report, error: overrides.reportError ?? null };
          if (table === "projects") return { data: overrides.project, error: null };
          if (table === "contractors") return { data: overrides.contractor, error: null };
          if (table === "daily_report_safety") return { data: overrides.safety, error: null };
          throw new Error(`unexpected single() on ${table}`);
        },
        then: (resolve: any) => {
          if (table === "daily_report_workforce")
            return resolve({ data: overrides.workforce, error: null });
          if (table === "daily_report_activities")
            return resolve({ data: overrides.activities, error: null });
          return resolve({ data: [], error: null });
        },
      };
      return builder;
    },
  };
}

describe("assembleReportPayload", () => {
  it("joins the report with its project, contractor, and child rows", async () => {
    const supabase = makeSupabaseStub({
      report: {
        id: "r1", project_id: "p1", contractor_id: "c1", report_date: "2026-09-04",
        report_type: "end_of_day_actual", status: "submitted", created_at: "2026-09-04T10:00:00Z",
      },
      project: { name: "STS-9.9 MW Biomass Power Plant", code: "STSBPP" },
      contractor: { name: "RETS", short_code: "RETS" },
      workforce: [{ id: "w1", daily_report_id: "r1", role_name: "รวมกำลังคนวันนี้", male_count: 15, female_count: 0 }],
      activities: [{ id: "a1", daily_report_id: "r1", description: "งาน A", planned_progress: 20, actual_progress: 20 }],
      safety: { daily_report_id: "r1", accident_status: "ไม่มีอุบัติเหตุ" },
    });

    const payload = await assembleReportPayload(supabase as any, "r1");

    expect(payload).not.toBeNull();
    expect(payload!.projectCode).toBe("STSBPP");
    expect(payload!.contractorShortCode).toBe("RETS");
    expect(payload!.workforce).toHaveLength(1);
    expect(payload!.activities).toHaveLength(1);
    expect(payload!.safety?.accident_status).toBe("ไม่มีอุบัติเหตุ");
  });

  it("returns null when the report doesn't exist or isn't visible under RLS", async () => {
    const supabase = makeSupabaseStub({
      report: null,
      reportError: { code: "PGRST116", message: "No rows returned" },
      project: null, contractor: null, workforce: [], activities: [], safety: null,
    });
    const payload = await assembleReportPayload(supabase as any, "missing");
    expect(payload).toBeNull();
  });

  it("propagates a real database error instead of treating it as not-found", async () => {
    const supabase = makeSupabaseStub({
      report: null,
      reportError: { code: "500", message: "connection refused" },
      project: null, contractor: null, workforce: [], activities: [], safety: null,
    });
    await expect(assembleReportPayload(supabase as any, "r1")).rejects.toMatchObject({
      code: "500",
    });
  });
});
