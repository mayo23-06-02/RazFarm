import Link from "next/link";
import { PageHeader } from "@/components/ui/PageHeader";
import { FlockSection } from "@/components/poultry/FlockSection";
import { createClient } from "@/lib/supabase/server";
import { getActiveTenantId } from "@/lib/auth/tenant";
import { hasTenantRole } from "@/lib/auth/roleCheck";
import { POULTRY_MANAGER_ROLES } from "@/lib/roles";

export default async function PoultryPage() {
  const tenantId = await getActiveTenantId();
  const supabase = await createClient();
  const canManage = await hasTenantRole(tenantId, POULTRY_MANAGER_ROLES);
  if (canManage) {
    await supabase.rpc("seed_poultry_accounts", { p_tenant_id: tenantId });
    await supabase.rpc("seed_poultry_health_template", { p_tenant_id: tenantId });
  }

  const [{ data: batches }, { data: houses }, { data: pens }, { data: suppliers }, { data: accounts }, { data: settings }, { data: tasks }] =
    await Promise.all([
      supabase.from("poultry_batch_summary").select("*").eq("tenant_id", tenantId).order("placed_on", { ascending: false }),
      supabase.from("poultry_houses").select("*").eq("tenant_id", tenantId).order("code"),
      supabase.from("poultry_pens").select("*").eq("tenant_id", tenantId).order("code"),
      supabase.from("suppliers").select("id, name").eq("tenant_id", tenantId).order("name"),
      supabase.from("accounts").select("id, code, name").eq("tenant_id", tenantId).eq("is_active", true).order("code"),
      supabase.from("tenant_settings").select("poultry_bird_cap").eq("tenant_id", tenantId).maybeSingle(),
      supabase.from("poultry_batch_tasks").select("*").eq("tenant_id", tenantId).eq("status", "pending"),
    ]);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Flock"
        subtitle="Broiler batches, from placement to the last bird sold."
        actions={
          <Link href="/poultry/today" className="inline-flex h-10 items-center rounded-ctrl bg-brand-500 px-4 text-sm font-medium text-white">
            Today&apos;s log
          </Link>
        }
      />
      <FlockSection
        batches={batches ?? []}
        houses={houses ?? []}
        pens={pens ?? []}
        suppliers={suppliers ?? []}
        accounts={accounts ?? []}
        birdCap={settings?.poultry_bird_cap ?? 400}
        tasks={tasks ?? []}
        canManage={canManage}
      />
    </div>
  );
}
