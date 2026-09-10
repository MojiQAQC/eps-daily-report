import type {
  DailyReport,
  DailyReportActivity,
  DailyReportSafety,
  DailyReportWorkforce,
  ReportPayload,
} from "@/types";

type SupabaseLike = {
  from: (table: string) => any;
};

export async function assembleReportPayload(
  supabase: SupabaseLike,
  reportId: string,
): Promise<ReportPayload | null> {
  const { data: report } = await supabase
    .from("daily_reports")
    .select("*")
    .eq("id", reportId)
    .single();

  if (!report) return null;

  const [{ data: project }, { data: contractor }, workforceRes, activitiesRes, { data: safety }] =
    await Promise.all([
      supabase.from("projects").select("name, code").eq("id", report.project_id).single(),
      supabase.from("contractors").select("name, short_code").eq("id", report.contractor_id).single(),
      supabase.from("daily_report_workforce").select("*").eq("daily_report_id", reportId),
      supabase.from("daily_report_activities").select("*").eq("daily_report_id", reportId),
      supabase.from("daily_report_safety").select("*").eq("daily_report_id", reportId).single(),
    ]);

  return {
    report: report as DailyReport,
    projectName: project?.name ?? "",
    projectCode: project?.code ?? null,
    contractorName: contractor?.name ?? "",
    contractorShortCode: contractor?.short_code ?? null,
    workforce: (workforceRes.data ?? []) as DailyReportWorkforce[],
    activities: (activitiesRes.data ?? []) as DailyReportActivity[],
    safety: (safety ?? null) as DailyReportSafety | null,
  };
}
