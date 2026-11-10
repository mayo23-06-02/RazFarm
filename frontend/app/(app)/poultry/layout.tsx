import type { ReactNode } from "react";
import { EmptyState } from "@/components/ui/EmptyState";
import { RoleGate } from "@/components/guards/RoleGate";
import { PoultryNav } from "@/components/poultry/PoultryNav";
import { getActiveTenantId } from "@/lib/auth/tenant";
import { POULTRY_VIEWER_ROLES } from "@/lib/roles";
import { createClient } from "@/lib/supabase/server";

export default async function PoultryLayout({ children }: { children: ReactNode }) {
  const tenantId = await getActiveTenantId();
  const supabase = await createClient();
  const { data: tenant } = await supabase.from("tenants").select("enterprise_kind").eq("id", tenantId).maybeSingle();

  if (tenant?.enterprise_kind === "sugarcane_association") {
    return (
      <EmptyState
        title="Poultry isn't turned on"
        body="This association is set up for sugarcane. A broiler farm uses its own workspace."
      />
    );
  }

  return (
    <RoleGate
      roles={POULTRY_VIEWER_ROLES}
      tenantId={tenantId}
      fallback={<EmptyState title="No access to poultry" body="The farm owner, supervisor, treasurer and accountant can open the flock." />}
    >
      <div className="flex flex-col gap-6">
        <PoultryNav />
        {children}
      </div>
    </RoleGate>
  );
}
