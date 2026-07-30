import { FieldsSection } from "@/components/fields/FieldsSection";
import { createClient } from "@/lib/supabase/server";
import { getActiveTenantId } from "@/lib/auth/tenant";
import { hasTenantRole } from "@/lib/auth/roleCheck";
import { FIELD_MANAGER_ROLES } from "@/lib/roles";

export default async function FieldsPage() {
  const tenantId = await getActiveTenantId();
  const supabase = await createClient();

  const [{ data: fields }, { data: cycles }, { data: members }, canManage] = await Promise.all([
    supabase.from("fields").select("*").eq("tenant_id", tenantId).order("code", { ascending: true }),
    supabase.from("crop_cycle_yields").select("*").eq("field_tenant_id", tenantId),
    supabase.from("members").select("id, full_name").eq("tenant_id", tenantId).eq("status", "active").order("full_name", { ascending: true }),
    hasTenantRole(tenantId, FIELD_MANAGER_ROLES),
  ]);

  return (
    <FieldsSection
      tenantId={tenantId}
      initialFields={fields ?? []}
      cycles={cycles ?? []}
      members={members ?? []}
      canManage={canManage}
    />
  );
}
