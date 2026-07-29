import { PurchaseOrdersSection } from "@/components/inventory/PurchaseOrdersSection";
import { createClient } from "@/lib/supabase/server";
import { getActiveTenantId } from "@/lib/auth/tenant";
import { hasTenantRole } from "@/lib/auth/roleCheck";
import { INVENTORY_MANAGER_ROLES } from "@/lib/roles";

export default async function PurchaseOrdersPage() {
  const tenantId = await getActiveTenantId();
  const supabase = await createClient();

  const [{ data: purchaseOrders }, { data: suppliers }, canManage] = await Promise.all([
    supabase.from("purchase_orders").select("*").eq("tenant_id", tenantId).order("order_date", { ascending: false }),
    supabase.from("suppliers").select("id, name").eq("tenant_id", tenantId).order("name", { ascending: true }),
    hasTenantRole(tenantId, INVENTORY_MANAGER_ROLES),
  ]);

  return (
    <PurchaseOrdersSection
      tenantId={tenantId}
      initialPurchaseOrders={purchaseOrders ?? []}
      suppliers={suppliers ?? []}
      canManage={canManage}
    />
  );
}
