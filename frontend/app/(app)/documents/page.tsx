import { DocumentsSection } from "@/components/documents/DocumentsSection";
import { createClient } from "@/lib/supabase/server";
import { getActiveTenantId } from "@/lib/auth/tenant";
import { hasTenantRole } from "@/lib/auth/roleCheck";
import { COMMITTEE_ROLES } from "@/lib/roles";

export default async function DocumentsPage() {
  const tenantId = await getActiveTenantId();
  const supabase = await createClient();

  const [{ data: documents }, canManage] = await Promise.all([
    supabase.from("documents").select("*").eq("tenant_id", tenantId).order("created_at", { ascending: false }),
    hasTenantRole(tenantId, COMMITTEE_ROLES),
  ]);

  const uploaderIds = Array.from(new Set((documents ?? []).map((d) => d.uploaded_by).filter((id): id is string => !!id)));
  const { data: profiles } = uploaderIds.length
    ? await supabase.from("profiles").select("id, full_name").in("id", uploaderIds)
    : { data: [] };

  const uploaderNames = Object.fromEntries((profiles ?? []).map((p) => [p.id, p.full_name ?? "Unknown"]));

  return (
    <DocumentsSection tenantId={tenantId} initialDocuments={documents ?? []} uploaderNames={uploaderNames} canManage={canManage} />
  );
}
