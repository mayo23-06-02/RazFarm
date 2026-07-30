import { EmployeesSection } from "@/components/staff/EmployeesSection";
import { EmptyState } from "@/components/ui/EmptyState";
import { RoleGate } from "@/components/guards/RoleGate";
import { createClient } from "@/lib/supabase/server";
import { getActiveTenantId } from "@/lib/auth/tenant";
import { hasTenantRole } from "@/lib/auth/roleCheck";
import { STAFF_MANAGER_ROLES, STAFF_VIEWER_ROLES, BANK_DETAIL_REVEAL_ROLES } from "@/lib/roles";

export default async function EmployeesPage() {
  const tenantId = await getActiveTenantId();
  const supabase = await createClient();

  const [{ data: employees }, canManage, canRevealBank] = await Promise.all([
    supabase.from("staff_employees_directory").select("*").eq("tenant_id", tenantId).order("full_name", { ascending: true }),
    hasTenantRole(tenantId, STAFF_MANAGER_ROLES),
    hasTenantRole(tenantId, BANK_DETAIL_REVEAL_ROLES),
  ]);

  return (
    <RoleGate
      roles={STAFF_VIEWER_ROLES}
      tenantId={tenantId}
      fallback={<EmptyState title="No access" body="Employee records are only visible to the committee and accountant." />}
    >
      <EmployeesSection tenantId={tenantId} initialEmployees={employees ?? []} canManage={canManage} canRevealBank={canRevealBank} />
    </RoleGate>
  );
}
