import { PettyCashSection } from "@/components/finance/PettyCashSection";
import { createClient } from "@/lib/supabase/server";
import { getActiveTenantId } from "@/lib/auth/tenant";
import { hasTenantRole } from "@/lib/auth/roleCheck";
import { ACCOUNTANT_ROLES } from "@/lib/roles";
import type { Database } from "@/lib/database.types";

type PettyCashTransactionRow = Database["public"]["Tables"]["petty_cash_transactions"]["Row"];

export default async function PettyCashPage() {
  const tenantId = await getActiveTenantId();
  const supabase = await createClient();

  const [{ data: fund }, { data: accounts }, canManage] = await Promise.all([
    supabase.from("petty_cash_funds").select("*").eq("tenant_id", tenantId).maybeSingle(),
    supabase.from("accounts").select("id, code, name, type").eq("tenant_id", tenantId).eq("is_active", true).order("code", { ascending: true }),
    hasTenantRole(tenantId, ACCOUNTANT_ROLES),
  ]);

  let transactions: PettyCashTransactionRow[] = [];
  if (fund) {
    const { data } = await supabase
      .from("petty_cash_transactions")
      .select("*")
      .eq("fund_id", fund.id)
      .order("tx_date", { ascending: false })
      .order("created_at", { ascending: false });
    transactions = data ?? [];
  }

  return (
    <PettyCashSection
      tenantId={tenantId}
      initialFund={fund ?? null}
      initialTransactions={transactions}
      accounts={accounts ?? []}
      canManage={canManage}
    />
  );
}
