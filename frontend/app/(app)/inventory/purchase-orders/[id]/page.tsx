import { EmptyState } from "@/components/ui/EmptyState";
import { PurchaseOrderDetailSection } from "@/components/inventory/PurchaseOrderDetailSection";
import { createClient } from "@/lib/supabase/server";
import { getActiveTenantId } from "@/lib/auth/tenant";
import { hasTenantRole } from "@/lib/auth/roleCheck";
import { INVENTORY_MANAGER_ROLES } from "@/lib/roles";

export default async function PurchaseOrderDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const tenantId = await getActiveTenantId();
  const supabase = await createClient();

  const [{ data: po }, { data: lines }, { data: suppliers }, { data: items }, { data: grns }, canManage] = await Promise.all([
    supabase.from("purchase_orders").select("*").eq("id", id).eq("tenant_id", tenantId).maybeSingle(),
    supabase.from("purchase_order_lines").select("*").eq("purchase_order_id", id).order("position", { ascending: true }),
    supabase.from("suppliers").select("id, name").eq("tenant_id", tenantId).order("name", { ascending: true }),
    supabase.from("inventory_items").select("id, sku, name, unit").eq("tenant_id", tenantId).eq("is_active", true).order("name", { ascending: true }),
    supabase.from("goods_received_notes").select("*").eq("purchase_order_id", id).order("received_date", { ascending: false }),
    hasTenantRole(tenantId, INVENTORY_MANAGER_ROLES),
  ]);

  if (!po) {
    return <EmptyState title="Purchase order not found" body="This order doesn't exist, or you don't have access to view it." />;
  }

  return (
    <PurchaseOrderDetailSection
      po={po}
      initialLines={lines ?? []}
      suppliers={suppliers ?? []}
      items={items ?? []}
      grns={grns ?? []}
      canManage={canManage}
    />
  );
}
