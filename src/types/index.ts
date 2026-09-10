// ==========================================================
// EPS Daily Report & Site Collaboration System — Shared Types
// Defined based on docs/DATA_MODEL.md & supabase/migrations/0001_core_schema.sql
// ==========================================================

export type UserRole = 'contractor_user' | 'site_admin' | 'head_office_admin';

export type ReportType = 'morning_plan' | 'end_of_day_actual';

export type ReportStatus = 'draft' | 'submitted';

export type WorkPriority = 'CRITICAL' | 'HIGH' | 'NORMAL' | 'LOW';

export type WorkStatus =
  | 'NOT_STARTED'
  | 'IN_PROGRESS'
  | 'COMPLETED'
  | 'BLOCKED'
  | 'DELAYED';

export type UpdateCategory =
  | 'progress_update'
  | 'completed_work'
  | 'in_progress'
  | 'next_tomorrow'
  | 'issue_concern'
  | 'announcement';

// ----------------------------------------------------------
// Master Data Entities
// ----------------------------------------------------------

export interface Contractor {
  id: string;
  name: string;
}

export interface Discipline {
  id: string;
  name: string;
}

export interface Project {
  id: string;
  name: string;
  code?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  timezone?: string | null;
  created_at: string;
}

export interface Profile {
  id: string;
  full_name: string;
  role: UserRole;
  contractor_id?: string | null;
  created_at: string;
}

export interface UserProjectAccess {
  user_id: string;
  project_id: string;
  contractor_id?: string | null;
  discipline_id?: string | null;
}

// ----------------------------------------------------------
// Daily Report (Export feature)
// ----------------------------------------------------------

export interface DailyReport {
  id: string;
  project_id: string;
  contractor_id: string;
  discipline_id?: string | null;
  report_date: string;
  report_type: ReportType;
  status: ReportStatus;
  report_number?: string | null;
  time_start?: string | null;
  time_finish?: string | null;
  overtime_hours?: number | null;
  cumulative_plan_pct?: number | null;
  cumulative_actual_pct?: number | null;
  weather_temperature?: number | null;
  weather_condition?: string | null;
  checked_by_user_id?: string | null;
  checked_at?: string | null;
  created_at: string;
}

export interface DailyReportWorkforce {
  id: string;
  daily_report_id: string;
  role_name: string;
  male_count: number;
  female_count: number;
}

export interface DailyReportActivity {
  id: string;
  daily_report_id: string;
  area?: string | null;
  description: string;
  planned_progress?: number | null;
  actual_progress?: number | null;
  status?: WorkStatus | null;
  supervisor?: string | null;
  remarks?: string | null;
}

export interface DailyReportSafety {
  daily_report_id: string;
  accident_status?: string | null;
  accident_free_days?: number | null;
  remarks?: string | null;
}

export interface ReportPayload {
  report: DailyReport;
  projectName: string;
  projectCode: string | null;
  contractorName: string;
  contractorShortCode: string | null;
  workforce: DailyReportWorkforce[];
  activities: DailyReportActivity[];
  safety: DailyReportSafety | null;
}
