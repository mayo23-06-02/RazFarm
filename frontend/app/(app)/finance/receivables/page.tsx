import { ReceivablesSection } from "@/components/finance/ReceivablesSection";
import { createClient } from "@/lib/supabase/server";
import { getActiveTenantId } from "@/lib/auth/tenant";
import { hasTenantRole } from "@/lib/auth/roleCheck";
import { ACCOUNTANT_ROLES } from "@/lib/roles";

export default async function ReceivablesPage() {
  const tenantId = await getActiveTenantId();
  const supabase = await createClient();

  const [{ data: invoices }, { data: customers }, canManage] = await Promise.all([
    supabase.from("invoices").select("*").eq("tenant_id", tenantId).order("issue_date", { ascending: false }),
    supabase.from("customers").select("*").eq("tenant_id", tenantId).order("name", { ascending: true }),
    hasTenantRole(tenantId, ACCOUNTANT_ROLES),
  ]);

  return (
    <ReceivablesSection tenantId={tenantId} initialInvoices={invoices ?? []} initialCustomers={customers ?? []} canManage={canManage} />
  );
}
