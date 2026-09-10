import type {
  DailyReport,
  DailyReportActivity,
  DailyReportAttachment,
  DailyReportSafety,
  DailyReportWorkforce,
  ReportPayload,
} from "@/types";

type SupabaseLike = {
  from: (table: string) => any;
  storage: {
    from: (bucket: string) => {
      createSignedUrl: (
        path: string,
        expiresIn: number,
      ) => Promise<{ data: { signedUrl: string } | null; error: any }>;
    };
  };
};

export async function assembleReportPayload(
  supabase: SupabaseLike,
  reportId: string,
): Promise<ReportPayload | null> {
  const { data: report, error: reportError } = await supabase
    .from("daily_reports")
    .select("*")
    .eq("id", reportId)
    .single();

  if (reportError && reportError.code !== "PGRST116") throw reportError;
  if (!report) return null;

  const [
    { data: project },
    { data: contractor },
    workforceRes,
    activitiesRes,
    { data: safety },
    attachmentsRes,
  ] = await Promise.all([
    supabase.from("projects").select("name, code").eq("id", report.project_id).single(),
    supabase.from("contractors").select("name, short_code").eq("id", report.contractor_id).single(),
    supabase.from("daily_report_workforce").select("*").eq("daily_report_id", reportId),
    supabase.from("daily_report_activities").select("*").eq("daily_report_id", reportId),
    supabase.from("daily_report_safety").select("*").eq("daily_report_id", reportId).single(),
    supabase
      .from("attachments")
      .select("*")
      .eq("daily_report_id", reportId)
      .in("kind", ["progress_photo", "safety_photo"])
      .order("created_at", { ascending: true }),
  ]);

  const attachments: DailyReportAttachment[] = await Promise.all(
    ((attachmentsRes.data ?? []) as DailyReportAttachment[]).map(async (a) => {
      const { data: signed } = await supabase.storage
        .from("daily-report-photos")
        .createSignedUrl(a.storage_path, 300);
      return { ...a, url: signed?.signedUrl ?? null };
    }),
  );

  return {
    report: report as DailyReport,
    projectName: project?.name ?? "",
    projectCode: project?.code ?? null,
    contractorName: contractor?.name ?? "",
    contractorShortCode: contractor?.short_code ?? null,
    workforce: (workforceRes.data ?? []) as DailyReportWorkforce[],
    activities: (activitiesRes.data ?? []) as DailyReportActivity[],
    safety: (safety ?? null) as DailyReportSafety | null,
    attachments,
  };
}
