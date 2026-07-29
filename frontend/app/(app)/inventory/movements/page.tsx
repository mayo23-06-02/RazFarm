import { StockMovementsSection } from "@/components/inventory/StockMovementsSection";
import { createClient } from "@/lib/supabase/server";
import { getActiveTenantId } from "@/lib/auth/tenant";

export default async function StockMovementsPage() {
  const tenantId = await getActiveTenantId();
  const supabase = await createClient();

  const [{ data: movements }, { data: items }] = await Promise.all([
    supabase
      .from("stock_movements")
      .select("*")
      .eq("tenant_id", tenantId)
      .order("created_at", { ascending: false }),
    supabase.from("inventory_items").select("id, sku, name, unit").eq("tenant_id", tenantId).order("name", { ascending: true }),
  ]);

  return <StockMovementsSection movements={movements ?? []} items={items ?? []} />;
}
