import type { ReactNode } from "react";
import { PageHeader } from "@/components/ui/PageHeader";
import { EmptyState } from "@/components/ui/EmptyState";
import { RoleGate } from "@/components/guards/RoleGate";
import { InventoryNav } from "@/components/inventory/InventoryNav";
import { getActiveTenantId } from "@/lib/auth/tenant";
import { INVENTORY_VIEWER_ROLES } from "@/lib/roles";

export default async function InventoryLayout({ children }: { children: ReactNode }) {
  const tenantId = await getActiveTenantId();

  return (
    <RoleGate
      roles={INVENTORY_VIEWER_ROLES}
      tenantId={tenantId}
      fallback={
        <EmptyState
          title="No access to inventory"
          body="Only chairman, treasurer, accountant and supervisor roles can see stock, suppliers and equipment."
        />
      }
    >
      <div className="flex flex-col gap-6">
        <PageHeader title="Inventory" subtitle="Input stock, suppliers, equipment and irrigation." />
        <InventoryNav />
        {children}
      </div>
    </RoleGate>
  );
}
