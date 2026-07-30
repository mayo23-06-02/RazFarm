import type { ReactNode } from "react";
import { PageHeader } from "@/components/ui/PageHeader";
import { RoleGate } from "@/components/guards/RoleGate";
import { InventoryNav } from "@/components/inventory/InventoryNav";
import { MemberStockLevelsSection } from "@/components/inventory/MemberStockLevelsSection";
import { createClient } from "@/lib/supabase/server";
import { getActiveTenantId } from "@/lib/auth/tenant";
import { INVENTORY_VIEWER_ROLES } from "@/lib/roles";

export default async function InventoryLayout({ children }: { children: ReactNode }) {
  const tenantId = await getActiveTenantId();
  const supabase = await createClient();
  const { data: stockLevels } = await supabase.rpc("list_inventory_stock_levels", { p_tenant_id: tenantId });

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Inventory" subtitle="Input stock, suppliers, equipment and irrigation." />
      <RoleGate roles={INVENTORY_VIEWER_ROLES} tenantId={tenantId} fallback={<MemberStockLevelsSection rows={stockLevels ?? []} />}>
        <InventoryNav />
        {children}
      </RoleGate>
    </div>
  );
}
