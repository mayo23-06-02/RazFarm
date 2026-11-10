import { PageHeader } from "@/components/ui/PageHeader";
import { HousesSection } from "@/components/poultry/HousesSection";
import { createClient } from "@/lib/supabase/server";
import { getActiveTenantId } from "@/lib/auth/tenant";
import { hasTenantRole } from "@/lib/auth/roleCheck";
import { POULTRY_MANAGER_ROLES } from "@/lib/roles";

export default async function PoultryHousesPage() {
  const tenantId = await getActiveTenantId();
  const supabase = await createClient();
  const [{ data: houses }, { data: pens }, canManage] = await Promise.all([
    supabase.from("poultry_houses").select("*").eq("tenant_id", tenantId).order("code"),
    supabase.from("poultry_pens").select("*").eq("tenant_id", tenantId).order("code"),
    hasTenantRole(tenantId, POULTRY_MANAGER_ROLES),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Houses" subtitle="Where each batch lives. Pens are optional until the birds leave the brooder." />
      <HousesSection tenantId={tenantId} houses={houses ?? []} pens={pens ?? []} canManage={canManage} />
    </div>
  );
}
