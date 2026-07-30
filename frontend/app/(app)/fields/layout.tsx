import type { ReactNode } from "react";
import { PageHeader } from "@/components/ui/PageHeader";
import { EmptyState } from "@/components/ui/EmptyState";
import { RoleGate } from "@/components/guards/RoleGate";
import { FieldsNav } from "@/components/fields/FieldsNav";
import { getActiveTenantId } from "@/lib/auth/tenant";
import { FIELD_VIEWER_ROLES } from "@/lib/roles";

export default async function FieldsLayout({ children }: { children: ReactNode }) {
  const tenantId = await getActiveTenantId();

  return (
    <RoleGate
      roles={FIELD_VIEWER_ROLES}
      tenantId={tenantId}
      fallback={
        <EmptyState
          title="No access to fields"
          body="Only chairman, treasurer, accountant and supervisor roles can see the field register, activities and harvests."
        />
      }
    >
      <div className="flex flex-col gap-6">
        <PageHeader title="Cane Production" subtitle="Field register, crop cycles, activities and harvest capture." />
        <FieldsNav />
        {children}
      </div>
    </RoleGate>
  );
}
