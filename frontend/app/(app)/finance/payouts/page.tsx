import { PayoutsSection } from "@/components/finance/PayoutsSection";
import { createClient } from "@/lib/supabase/server";
import { getActiveTenantId } from "@/lib/auth/tenant";
import { hasTenantRole } from "@/lib/auth/roleCheck";
import { ACCOUNTANT_ROLES } from "@/lib/roles";

export default async function PayoutsPage() {
  const tenantId = await getActiveTenantId();
  const supabase = await createClient();

  const [{ data: runs }, { data: deductionTypes }, { data: accounts }, canManage] = await Promise.all([
    supabase.from("payout_runs").select("*").eq("tenant_id", tenantId).order("run_date", { ascending: false }),
    supabase.from("deduction_types").select("*").eq("tenant_id", tenantId).order("position", { ascending: true }),
    supabase.from("accounts").select("id, code, name").eq("tenant_id", tenantId).eq("is_active", true).order("code", { ascending: true }),
    hasTenantRole(tenantId, ACCOUNTANT_ROLES),
  ]);

  return (
    <PayoutsSection
      tenantId={tenantId}
      initialRuns={runs ?? []}
      initialDeductionTypes={deductionTypes ?? []}
      allAccounts={accounts ?? []}
      canManage={canManage}
    />
  );
}
