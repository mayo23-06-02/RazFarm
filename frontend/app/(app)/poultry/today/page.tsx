import { PageHeader } from "@/components/ui/PageHeader";
import { DailyLogSection } from "@/components/poultry/DailyLogSection";
import { createClient } from "@/lib/supabase/server";
import { getActiveTenantId } from "@/lib/auth/tenant";
import { hasTenantRole } from "@/lib/auth/roleCheck";
import { POULTRY_MANAGER_ROLES } from "@/lib/roles";

export default async function PoultryTodayPage() {
  const tenantId = await getActiveTenantId();
  const supabase = await createClient();
  const canManage = await hasTenantRole(tenantId, POULTRY_MANAGER_ROLES);
  if (canManage) await supabase.rpc("seed_poultry_health_template", { p_tenant_id: tenantId });

  const [{ data: batches }, { data: feed }, { data: tasks }, { data: vaccines }] = await Promise.all([
    supabase.from("poultry_batch_summary").select("*").eq("tenant_id", tenantId).eq("status", "active").order("placed_on"),
    supabase.from("inventory_items").select("id, name, unit, quantity_on_hand, unit_weight_kg").eq("tenant_id", tenantId).eq("category", "feed").eq("is_active", true).order("name"),
    supabase.from("poultry_batch_tasks").select("*").eq("tenant_id", tenantId).order("due_on"),
    supabase.from("inventory_items").select("id, name, unit, quantity_on_hand").eq("tenant_id", tenantId).in("category", ["vaccine", "medication"]).eq("is_active", true).order("name"),
  ]);

  return (
    <div className="mx-auto flex w-full max-w-lg flex-col gap-6">
      <PageHeader title="Today" subtitle="Deaths, culls and the bags this batch ate. Pick the batch when two are on the farm." />
      <DailyLogSection batches={batches ?? []} feedItems={feed ?? []} tasks={tasks ?? []} vaccines={vaccines ?? []} canManage={canManage} />
    </div>
  );
}
