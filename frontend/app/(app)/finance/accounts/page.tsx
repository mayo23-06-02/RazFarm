import { AccountsSection } from "@/components/finance/AccountsSection";
import { createClient } from "@/lib/supabase/server";
import { getActiveTenantId } from "@/lib/auth/tenant";
import { hasTenantRole } from "@/lib/auth/roleCheck";
import { ACCOUNTANT_ROLES } from "@/lib/roles";

export default async function AccountsPage() {
  const tenantId = await getActiveTenantId();
  const supabase = await createClient();

  const [{ data: accounts }, canManage] = await Promise.all([
    supabase.from("accounts").select("*").eq("tenant_id", tenantId).order("code", { ascending: true }),
    hasTenantRole(tenantId, ACCOUNTANT_ROLES),
  ]);

  return <AccountsSection tenantId={tenantId} initialAccounts={accounts ?? []} canManage={canManage} />;
}
