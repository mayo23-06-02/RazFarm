import { EmptyState } from "@/components/ui/EmptyState";
import { DeliveryDetailSection } from "@/components/mill/DeliveryDetailSection";
import { createClient } from "@/lib/supabase/server";
import { getActiveTenantId } from "@/lib/auth/tenant";
import { hasTenantRole } from "@/lib/auth/roleCheck";
import { MILL_RECORDER_ROLES } from "@/lib/roles";

export default async function DeliveryDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const tenantId = await getActiveTenantId();
  const supabase = await createClient();

  const [{ data: delivery }, canCaptureMill] = await Promise.all([
    supabase.from("delivery_details").select("*").eq("id", id).eq("tenant_id", tenantId).maybeSingle(),
    hasTenantRole(tenantId, MILL_RECORDER_ROLES),
  ]);

  if (!delivery) {
    return <EmptyState title="Delivery not found" body="This delivery doesn't exist, or you don't have access to view it." />;
  }

  const { data: fieldReconciliation } = await supabase
    .from("field_delivery_reconciliation")
    .select("*")
    .eq("field_id", delivery.field_id)
    .maybeSingle();

  return <DeliveryDetailSection delivery={delivery} fieldReconciliation={fieldReconciliation ?? null} canCaptureMill={canCaptureMill} />;
}
