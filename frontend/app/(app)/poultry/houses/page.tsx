import { PageHeader } from "@/components/ui/PageHeader";
import { HousesSection } from "@/components/poultry/HousesSection";
import { VaccineTemplateSection } from "@/components/poultry/VaccineTemplateSection";
import { createClient } from "@/lib/supabase/server";
import { getActiveTenantId } from "@/lib/auth/tenant";
import { hasTenantRole } from "@/lib/auth/roleCheck";
import { POULTRY_MANAGER_ROLES } from "@/lib/roles";

export default async function PoultryHousesPage() {
  const tenantId = await getActiveTenantId();
  const supabase = await createClient();
  const canManage = await hasTenantRole(tenantId, POULTRY_MANAGER_ROLES);
  if (canManage) await supabase.rpc("seed_poultry_health_template", { p_tenant_id: tenantId });

  const [{ data: houses }, { data: pens }, { data: protocols }] = await Promise.all([
    supabase.from("poultry_houses").select("*").eq("tenant_id", tenantId).order("code"),
    supabase.from("poultry_pens").select("*").eq("tenant_id", tenantId).order("code"),
    supabase.from("poultry_health_protocols").select("*").eq("tenant_id", tenantId).order("sort_order"),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Houses" subtitle="Where each batch lives. Pens are optional until the birds leave the brooder." />
      <HousesSection tenantId={tenantId} houses={houses ?? []} pens={pens ?? []} canManage={canManage} />
      <VaccineTemplateSection protocols={protocols ?? []} canManage={canManage} />
    </div>
  );
}
