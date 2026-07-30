import type { ReactNode } from "react";
import { PageHeader } from "@/components/ui/PageHeader";
import { EmptyState } from "@/components/ui/EmptyState";
import { RoleGate } from "@/components/guards/RoleGate";
import { MillNav } from "@/components/mill/MillNav";
import { getActiveTenantId } from "@/lib/auth/tenant";
import { DELIVERY_VIEWER_ROLES } from "@/lib/roles";

export default async function MillLayout({ children }: { children: ReactNode }) {
  const tenantId = await getActiveTenantId();

  return (
    <RoleGate
      roles={DELIVERY_VIEWER_ROLES}
      tenantId={tenantId}
      fallback={
        <EmptyState
          title="No access to mill deliveries"
          body="Only chairman, treasurer, accountant and supervisor roles can see deliveries and sucrose results."
        />
      }
    >
      <div className="flex flex-col gap-6">
        <PageHeader title="Mill Deliveries" subtitle="Consignments, sucrose results and season delivery tracking." />
        <MillNav />
        {children}
      </div>
    </RoleGate>
  );
}
