import { EmptyState } from "@/components/ui/EmptyState";
import { JournalEntryDetailSection } from "@/components/finance/JournalEntryDetailSection";
import { createClient } from "@/lib/supabase/server";
import { getActiveTenantId } from "@/lib/auth/tenant";
import { hasTenantRole } from "@/lib/auth/roleCheck";
import { ACCOUNTANT_ROLES, JOURNAL_POSTER_ROLES } from "@/lib/roles";

export default async function JournalEntryPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const tenantId = await getActiveTenantId();
  const supabase = await createClient();

  const [{ data: entry }, { data: lines }, { data: accounts }, canEdit, canPost] = await Promise.all([
    supabase.from("journal_entries").select("*").eq("id", id).eq("tenant_id", tenantId).maybeSingle(),
    supabase.from("journal_lines").select("*").eq("journal_entry_id", id).order("position", { ascending: true }),
    supabase.from("accounts").select("id, code, name, type").eq("tenant_id", tenantId).eq("is_active", true).order("code", { ascending: true }),
    hasTenantRole(tenantId, ACCOUNTANT_ROLES),
    hasTenantRole(tenantId, JOURNAL_POSTER_ROLES),
  ]);

  if (!entry) {
    return <EmptyState title="Journal entry not found" body="This entry doesn't exist, or you don't have access to view it." />;
  }

  return (
    <JournalEntryDetailSection
      entry={entry}
      initialLines={lines ?? []}
      accounts={accounts ?? []}
      canEdit={canEdit}
      canPost={canPost}
    />
  );
}
