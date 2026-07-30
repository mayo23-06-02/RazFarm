import { HarvestCaptureBoardSection } from "@/components/fields/HarvestCaptureBoardSection";
import { createClient } from "@/lib/supabase/server";
import { getActiveTenantId } from "@/lib/auth/tenant";
import { hasTenantRole } from "@/lib/auth/roleCheck";
import { FIELD_MANAGER_ROLES } from "@/lib/roles";

export default async function HarvestCapturePage() {
  const tenantId = await getActiveTenantId();
  const supabase = await createClient();

  const [{ data: captures }, { data: openCycles }, canManage] = await Promise.all([
    supabase
      .from("harvest_captures")
      .select("*, fields!inner(code, tenant_id)")
      .eq("fields.tenant_id", tenantId)
      .order("capture_date", { ascending: false })
      .limit(200),
    supabase
      .from("crop_cycles")
      .select("id, field_id, fields!inner(code, tenant_id)")
      .eq("fields.tenant_id", tenantId)
      .not("status", "in", "(harvested,ploughed_out)"),
    hasTenantRole(tenantId, FIELD_MANAGER_ROLES),
  ]);

  const captureRows = (captures ?? []).map((c) => ({ ...c, field_code: (c as unknown as { fields: { code: string } }).fields.code }));
  const openCycleFields = (openCycles ?? []).map((c) => ({
    fieldId: c.field_id,
    cropCycleId: c.id,
    code: (c as unknown as { fields: { code: string } }).fields.code,
  }));

  return <HarvestCaptureBoardSection tenantId={tenantId} captures={captureRows} openCycleFields={openCycleFields} canManage={canManage} />;
}
