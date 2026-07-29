import { QuickEntrySection } from "@/components/finance/QuickEntrySection";
import { createClient } from "@/lib/supabase/server";
import { getActiveTenantId } from "@/lib/auth/tenant";
import { hasTenantRole } from "@/lib/auth/roleCheck";
import { ACCOUNTANT_ROLES } from "@/lib/roles";

export default async function QuickEntryPage() {
  const tenantId = await getActiveTenantId();
  const supabase = await createClient();

  const [{ data: accounts }, canCreate] = await Promise.all([
    supabase.from("accounts").select("id, code, name, type").eq("tenant_id", tenantId).eq("is_active", true).order("code", { ascending: true }),
    hasTenantRole(tenantId, ACCOUNTANT_ROLES),
  ]);

  return <QuickEntrySection tenantId={tenantId} accounts={accounts ?? []} canCreate={canCreate} />;
}
