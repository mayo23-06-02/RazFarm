import { EmptyState } from "@/components/ui/EmptyState";
import { RoleGate } from "@/components/guards/RoleGate";
import { MembersSection } from "@/components/members/MembersSection";
import { getActiveTenantId } from "@/lib/auth/tenant";
import { hasTenantRole } from "@/lib/auth/roleCheck";
import { REGISTER_MUTATOR_ROLES, REGISTER_VIEWER_ROLES } from "@/lib/roles";

export default async function MembersPage() {
  const tenantId = await getActiveTenantId();
  const canManage = await hasTenantRole(tenantId, REGISTER_MUTATOR_ROLES);

  return (
    <RoleGate
      roles={REGISTER_VIEWER_ROLES}
      tenantId={tenantId}
      fallback={
        <EmptyState
          title="No access to the member register"
          body="Only committee, supervisor and accountant roles can see the full register. Visit your profile from the sidebar menu instead."
        />
      }
    >
      <MembersSection tenantId={tenantId} canManage={canManage} />
    </RoleGate>
  );
}
