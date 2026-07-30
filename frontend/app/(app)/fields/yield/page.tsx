import { YieldAnalyticsSection } from "@/components/fields/YieldAnalyticsSection";
import { createClient } from "@/lib/supabase/server";
import { getActiveTenantId } from "@/lib/auth/tenant";
import type { Database } from "@/lib/database.types";

type CropCycleYieldRow = Database["public"]["Views"]["crop_cycle_yields"]["Row"];

export default async function YieldAnalyticsPage() {
  const tenantId = await getActiveTenantId();
  const supabase = await createClient();

  const [{ data: fields }, { data: cycles }, { data: declineCurve }, { data: replantRecommendations }] = await Promise.all([
    supabase.from("fields").select("hectares").eq("tenant_id", tenantId),
    supabase.from("crop_cycle_yields").select("*").eq("field_tenant_id", tenantId).eq("status", "harvested").order("ratoon_number", { ascending: false }),
    supabase.from("ratoon_decline_curve").select("*").eq("tenant_id", tenantId).order("field_code", { ascending: true }).order("ratoon_number", { ascending: true }),
    supabase.from("field_replant_recommendations").select("*").eq("tenant_id", tenantId).order("field_code", { ascending: true }),
  ]);

  const totalHectares = (fields ?? []).reduce((sum, f) => sum + f.hectares, 0);

  const latestByField = new Map<string, CropCycleYieldRow>();
  for (const c of cycles ?? []) {
    if (!latestByField.has(c.field_id)) latestByField.set(c.field_id, c);
  }

  return (
    <YieldAnalyticsSection
      totalHectares={totalHectares}
      latestByField={[...latestByField.values()]}
      declineCurve={declineCurve ?? []}
      replantRecommendations={replantRecommendations ?? []}
    />
  );
}
