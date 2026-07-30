import type { ReactNode } from "react";
import { PageHeader } from "@/components/ui/PageHeader";
import { EmptyState } from "@/components/ui/EmptyState";
import { RoleGate } from "@/components/guards/RoleGate";
import { StaffNav } from "@/components/staff/StaffNav";
import { getActiveTenantId } from "@/lib/auth/tenant";
import { CONTRACTOR_VIEWER_ROLES } from "@/lib/roles";

// Gated to the broadest role that can see anything in this module
// (CONTRACTOR_VIEWER_ROLES) — the narrower employees-only gate lives on the
// /staff/employees page itself, since supervisor can see contractors but
// not employee/payroll data at all.
export default async function StaffLayout({ children }: { children: ReactNode }) {
  const tenantId = await getActiveTenantId();

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Staff" subtitle="Association employees and contractors." />
      <RoleGate
        roles={CONTRACTOR_VIEWER_ROLES}
        tenantId={tenantId}
        fallback={<EmptyState title="No access" body="Staff management is only visible to committee members, the accountant and the supervisor." />}
      >
        <StaffNav />
        {children}
      </RoleGate>
    </div>
  );
}
