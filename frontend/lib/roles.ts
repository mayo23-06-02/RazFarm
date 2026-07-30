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

// Module F.1 (supabase/migrations/0009_inventory_core.sql §3). Supervisor is
// the field-operations role (design.md §12.2: "records ... inventory
// issues"), so it manages day-to-day stock alongside the accountant.
export const INVENTORY_VIEWER_ROLES: MemberRole[] = ["chairman", "treasurer", "accountant", "supervisor"];
export const INVENTORY_MANAGER_ROLES: MemberRole[] = ["supervisor", "accountant"];

// Module B (supabase/migrations/0011_cane_production_fields.sql §3).
export const FIELD_VIEWER_ROLES: MemberRole[] = ["chairman", "treasurer", "accountant", "supervisor"];
export const FIELD_MANAGER_ROLES: MemberRole[] = ["chairman", "supervisor"];

// Module C (supabase/migrations/0012_mill_deliveries.sql §3). Supervisor
// dispatches loads from the field; capturing what the mill paid for and
// reconciling it is the accountant/treasurer's job (D.2 mill reconciliation).
export const DELIVERY_VIEWER_ROLES: MemberRole[] = ["chairman", "treasurer", "accountant", "supervisor"];
export const DELIVERY_RECORDER_ROLES: MemberRole[] = ["chairman", "supervisor"];
export const MILL_RECORDER_ROLES: MemberRole[] = ["chairman", "treasurer", "accountant"];
