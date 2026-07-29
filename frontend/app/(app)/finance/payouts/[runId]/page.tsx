import { EmptyState } from "@/components/ui/EmptyState";
import { PayoutRunDetailSection } from "@/components/finance/PayoutRunDetailSection";
import { createClient } from "@/lib/supabase/server";
import { getActiveTenantId } from "@/lib/auth/tenant";
import { hasTenantRole } from "@/lib/auth/roleCheck";
import { ACCOUNTANT_ROLES, JOURNAL_POSTER_ROLES } from "@/lib/roles";

export default async function PayoutRunPage({ params }: { params: Promise<{ runId: string }> }) {
  const { runId } = await params;
  const tenantId = await getActiveTenantId();
  const supabase = await createClient();

  const [{ data: run }, { data: lines }, { data: deductionTypes }, { data: members }, { data: accounts }, canManage, canApprove] = await Promise.all([
    supabase.from("payout_runs").select("*").eq("id", runId).eq("tenant_id", tenantId).maybeSingle(),
    supabase.from("payout_run_lines").select("*").eq("payout_run_id", runId).order("position", { ascending: true }),
    supabase.from("deduction_types").select("*").eq("tenant_id", tenantId).order("position", { ascending: true }),
    supabase.from("members").select("id, member_no, full_name").eq("tenant_id", tenantId),
    supabase.from("accounts").select("id, code, name").eq("tenant_id", tenantId),
    hasTenantRole(tenantId, ACCOUNTANT_ROLES),
    hasTenantRole(tenantId, JOURNAL_POSTER_ROLES),
  ]);

  if (!run) {
    return <EmptyState title="Payout run not found" body="This run doesn't exist, or you don't have access to view it." />;
  }

  const lineIds = (lines ?? []).map((l) => l.id);
  const { data: deductions } = lineIds.length
    ? await supabase.from("payout_deductions").select("*").in("payout_run_line_id", lineIds)
    : { data: [] };

  const bankAccount = (accounts ?? []).find((a) => a.id === run.bank_account_id);

  return (
    <PayoutRunDetailSection
      run={run}
      initialLines={lines ?? []}
      initialDeductions={deductions ?? []}
      deductionTypes={deductionTypes ?? []}
      members={members ?? []}
      bankAccountLabel={bankAccount ? `${bankAccount.code} — ${bankAccount.name}` : "—"}
      canManage={canManage}
      canApprove={canApprove}
    />
  );
}
