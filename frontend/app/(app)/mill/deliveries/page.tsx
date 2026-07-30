import { DeliveriesSection } from "@/components/mill/DeliveriesSection";
import { createClient } from "@/lib/supabase/server";
import { getActiveTenantId } from "@/lib/auth/tenant";
import { hasTenantRole } from "@/lib/auth/roleCheck";
import { DELIVERY_RECORDER_ROLES } from "@/lib/roles";

export default async function DeliveriesPage() {
  const tenantId = await getActiveTenantId();
  const supabase = await createClient();

  const [{ data: deliveries }, { data: fields }, { data: openCycles }, { data: tenant }, canManage] = await Promise.all([
    supabase.from("delivery_details").select("*").eq("tenant_id", tenantId).order("delivery_date", { ascending: false }),
    supabase.from("fields").select("id, code").eq("tenant_id", tenantId).order("code", { ascending: true }),
    supabase.from("crop_cycles").select("id, field_id").eq("tenant_id", tenantId).not("status", "in", "(harvested,ploughed_out)"),
    supabase.from("tenants").select("mill").eq("id", tenantId).maybeSingle(),
    hasTenantRole(tenantId, DELIVERY_RECORDER_ROLES),
  ]);

  const fieldOpenCycles = Object.fromEntries((openCycles ?? []).map((c) => [c.field_id, c.id]));

  return (
    <DeliveriesSection
      tenantId={tenantId}
      initialDeliveries={deliveries ?? []}
      fields={fields ?? []}
      fieldOpenCycles={fieldOpenCycles}
      tenantMill={tenant?.mill ?? "other"}
      canManage={canManage}
    />
  );
}
