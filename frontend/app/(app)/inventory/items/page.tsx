import { ItemsSection } from "@/components/inventory/ItemsSection";
import { createClient } from "@/lib/supabase/server";
import { getActiveTenantId } from "@/lib/auth/tenant";
import { hasTenantRole } from "@/lib/auth/roleCheck";
import { INVENTORY_MANAGER_ROLES } from "@/lib/roles";

export default async function InventoryItemsPage() {
  const tenantId = await getActiveTenantId();
  const supabase = await createClient();

  const [{ data: items }, { data: suppliers }, { data: accounts }, canManage] = await Promise.all([
    supabase.from("inventory_items").select("*").eq("tenant_id", tenantId).order("name", { ascending: true }),
    supabase.from("suppliers").select("id, name").eq("tenant_id", tenantId).order("name", { ascending: true }),
    supabase.from("accounts").select("id, code, name, type").eq("tenant_id", tenantId).eq("is_active", true).order("code", { ascending: true }),
    hasTenantRole(tenantId, INVENTORY_MANAGER_ROLES),
  ]);

  return (
    <ItemsSection
      tenantId={tenantId}
      initialItems={items ?? []}
      suppliers={suppliers ?? []}
      accounts={accounts ?? []}
      canManage={canManage}
    />
  );
}
