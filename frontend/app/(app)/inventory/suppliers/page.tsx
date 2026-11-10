import { SuppliersSection } from "@/components/inventory/SuppliersSection";
import { createClient } from "@/lib/supabase/server";
import { getActiveTenantId } from "@/lib/auth/tenant";
import { canManageStock } from "@/lib/auth/roleCheck";

export default async function SuppliersPage() {
  const tenantId = await getActiveTenantId();
  const supabase = await createClient();

  const [{ data: suppliers }, canManage] = await Promise.all([
    supabase.from("suppliers").select("*").eq("tenant_id", tenantId).order("name", { ascending: true }),
    canManageStock(tenantId),
  ]);

  return <SuppliersSection tenantId={tenantId} initialSuppliers={suppliers ?? []} canManage={canManage} />;
}
