import type { MemberRole } from "@/lib/database.types";

// Mirrors the role-group SQL helpers in
// supabase/migrations/0002_members_governance.sql §3 — kept in sync by hand
// since RLS is the real enforcement; these only drive UI gating (RoleGate).
export const COMMITTEE_ROLES: MemberRole[] = ["chairman", "secretary", "treasurer"];
export const REGISTER_MUTATOR_ROLES: MemberRole[] = ["chairman", "secretary"];
export const REGISTER_VIEWER_ROLES: MemberRole[] = ["chairman", "secretary", "treasurer", "supervisor", "accountant"];
export const ATTENDANCE_RECORDER_ROLES: MemberRole[] = ["chairman", "secretary", "treasurer", "supervisor"];
export const CHAIRMAN_ROLES: MemberRole[] = ["chairman"];

// Module D.1 (supabase/migrations/0004_finance_core.sql §3).
export const FINANCE_VIEWER_ROLES: MemberRole[] = ["chairman", "treasurer", "accountant"];
export const ACCOUNTANT_ROLES: MemberRole[] = ["accountant"];
export const JOURNAL_POSTER_ROLES: MemberRole[] = ["chairman", "treasurer"];
