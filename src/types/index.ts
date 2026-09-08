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
