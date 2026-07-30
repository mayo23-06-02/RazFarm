import { SucroseTrendsSection } from "@/components/mill/SucroseTrendsSection";
import { createClient } from "@/lib/supabase/server";
import { getActiveTenantId } from "@/lib/auth/tenant";

export default async function SucroseTrendsPage() {
  const tenantId = await getActiveTenantId();
  const supabase = await createClient();

  const [{ data: fields }, { data: deliveries }] = await Promise.all([
    supabase.from("fields").select("id, code").eq("tenant_id", tenantId).order("code", { ascending: true }),
    supabase.from("delivery_details").select("*").eq("tenant_id", tenantId).not("sucrose_pct", "is", null).order("delivery_date", { ascending: true }),
  ]);

  return <SucroseTrendsSection fields={fields ?? []} deliveries={deliveries ?? []} />;
}
