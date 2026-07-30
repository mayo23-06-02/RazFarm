import { HarvestPlanBoardSection } from "@/components/fields/HarvestPlanBoardSection";
import { createClient } from "@/lib/supabase/server";
import { getActiveTenantId } from "@/lib/auth/tenant";
import { hasTenantRole } from "@/lib/auth/roleCheck";
import { FIELD_MANAGER_ROLES } from "@/lib/roles";

export default async function HarvestPlanPage() {
  const tenantId = await getActiveTenantId();
  const supabase = await createClient();

  const [{ data: plans }, { data: openCycles }, canManage] = await Promise.all([
    supabase
      .from("harvest_plans")
      .select("*, fields!inner(code, tenant_id)")
      .eq("fields.tenant_id", tenantId),
    supabase
      .from("crop_cycles")
      .select("id, field_id, fields!inner(code, tenant_id)")
      .eq("fields.tenant_id", tenantId)
      .not("status", "in", "(harvested,ploughed_out)"),
    hasTenantRole(tenantId, FIELD_MANAGER_ROLES),
  ]);

  const planRows = (plans ?? []).map((p) => ({ ...p, field_code: (p as unknown as { fields: { code: string } }).fields.code }));
  const openCycleFields = (openCycles ?? []).map((c) => ({
    fieldId: c.field_id,
    cropCycleId: c.id,
    code: (c as unknown as { fields: { code: string } }).fields.code,
  }));

  return <HarvestPlanBoardSection tenantId={tenantId} plans={planRows} openCycleFields={openCycleFields} canManage={canManage} />;
}
