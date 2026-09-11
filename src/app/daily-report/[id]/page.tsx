import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { assembleReportPayload } from "@/lib/reports/assemble";
import { ReportView } from "@/components/report-view/ReportView";
import { ButtonLink, PageHeader } from "@/components/ui";

export default async function DailyReportDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const supabase = createClient();
  const payload = await assembleReportPayload(supabase, params.id);

  if (!payload) notFound();

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title={`รายงานประจำวัน ${payload.report.report_date}`}
        description={`${payload.contractorName} · ${payload.report.report_type}`}
        actions={
          payload.report.status === "submitted" ? (
            <>
              <ButtonLink
                href={`/api/reports/${payload.report.id}/export?format=pdf`}
                variant="secondary"
              >
                ดาวน์โหลด PDF
              </ButtonLink>
              <ButtonLink
                href={`/api/reports/${payload.report.id}/export?format=xlsx`}
                variant="secondary"
              >
                ดาวน์โหลด Excel
              </ButtonLink>
            </>
          ) : undefined
        }
      />
      <ReportView payload={payload} />
    </div>
  );
}
