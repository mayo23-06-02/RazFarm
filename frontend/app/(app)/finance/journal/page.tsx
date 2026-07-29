import { JournalSection } from "@/components/finance/JournalSection";
import { createClient } from "@/lib/supabase/server";
import { getActiveTenantId } from "@/lib/auth/tenant";
import { hasTenantRole } from "@/lib/auth/roleCheck";
import { ACCOUNTANT_ROLES } from "@/lib/roles";

export default async function JournalPage() {
  const tenantId = await getActiveTenantId();
  const supabase = await createClient();

  const [{ data: entries }, canCreate] = await Promise.all([
    supabase.from("journal_entries").select("*").eq("tenant_id", tenantId).order("entry_date", { ascending: false }),
    hasTenantRole(tenantId, ACCOUNTANT_ROLES),
  ]);

  return <JournalSection tenantId={tenantId} initialEntries={entries ?? []} canCreate={canCreate} />;
}
