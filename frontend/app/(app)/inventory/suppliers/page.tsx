import { SuppliersSection } from "@/components/inventory/SuppliersSection";
import { createClient } from "@/lib/supabase/server";
import { getActiveTenantId } from "@/lib/auth/tenant";
import { hasTenantRole } from "@/lib/auth/roleCheck";
import { INVENTORY_MANAGER_ROLES } from "@/lib/roles";

export default async function SuppliersPage() {
  const tenantId = await getActiveTenantId();
  const supabase = await createClient();

  const [{ data: suppliers }, canManage] = await Promise.all([
    supabase.from("suppliers").select("*").eq("tenant_id", tenantId).order("name", { ascending: true }),
    hasTenantRole(tenantId, INVENTORY_MANAGER_ROLES),
  ]);

  return <SuppliersSection tenantId={tenantId} initialSuppliers={suppliers ?? []} canManage={canManage} />;
}
