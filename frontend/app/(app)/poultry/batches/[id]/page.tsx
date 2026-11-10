import { notFound } from "next/navigation";
import { PageHeader } from "@/components/ui/PageHeader";
import { BatchDetailSection } from "@/components/poultry/BatchDetailSection";
import { createClient } from "@/lib/supabase/server";
import { getActiveTenantId } from "@/lib/auth/tenant";
import { hasTenantRole } from "@/lib/auth/roleCheck";
import { POULTRY_MANAGER_ROLES } from "@/lib/roles";

export default async function PoultryBatchPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const tenantId = await getActiveTenantId();
  const supabase = await createClient();
  const [{ data: batch }, { data: logs }, { data: sales }, { data: accounts }, canManage] = await Promise.all([
    supabase.from("poultry_batch_summary").select("*").eq("id", id).eq("tenant_id", tenantId).maybeSingle(),
    supabase.from("poultry_daily_logs").select("*").eq("batch_id", id).order("log_date", { ascending: false }),
    supabase.from("poultry_sales").select("*").eq("batch_id", id).order("sale_date", { ascending: false }),
    supabase.from("accounts").select("id, code, name").eq("tenant_id", tenantId).eq("is_active", true).order("code"),
    hasTenantRole(tenantId, POULTRY_MANAGER_ROLES),
  ]);

  if (!batch) notFound();

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title={batch.batch_no} subtitle="Age, birds alive, cost and what the batch has brought in." backHref="/poultry" />
      <BatchDetailSection batch={batch} logs={logs ?? []} sales={sales ?? []} accounts={accounts ?? []} canManage={canManage} />
    </div>
  );
}
