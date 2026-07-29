import { EmptyState } from "@/components/ui/EmptyState";
import { MemberProfileSection } from "@/components/members/MemberProfileSection";
import { createClient } from "@/lib/supabase/server";
import { getActiveTenantId } from "@/lib/auth/tenant";
import { hasTenantRole } from "@/lib/auth/roleCheck";
import { REGISTER_MUTATOR_ROLES } from "@/lib/roles";

export default async function MemberProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const tenantId = await getActiveTenantId();
  const supabase = await createClient();

  const [{ data: member }, canManage] = await Promise.all([
    supabase.from("members").select("*").eq("id", id).eq("tenant_id", tenantId).maybeSingle(),
    hasTenantRole(tenantId, REGISTER_MUTATOR_ROLES),
  ]);

  if (!member) {
    return (
      <EmptyState
        title="Member not found"
        body="This member doesn't exist, or you don't have access to view their profile."
      />
    );
  }

  return <MemberProfileSection tenantId={tenantId} member={member} canManage={canManage} />;
}
