import type { ReactNode } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { decodeAccessTokenClaims, tenantsFromClaims, ACTIVE_TENANT_COOKIE_NAME } from "@/lib/auth/claims";
import { ActiveTenantProvider } from "@/lib/auth/active-tenant";
import { AppFrame } from "@/components/app/AppFrame";
import type { Tenant } from "@/components/app/TenantSwitcher";

function labelRole(role: string) {
  return role.charAt(0).toUpperCase() + role.slice(1);
}

export default async function AppLayout({ children }: { children: ReactNode }) {
  const supabase = await createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) {
    redirect("/");
  }

  const claims = decodeAccessTokenClaims(session.access_token);
  const memberships = tenantsFromClaims(claims);

  if (memberships.length === 0) {
    redirect("/onboarding");
  }

  const { data: tenantRows } = await supabase
    .from("tenants")
    .select("id, name")
    .in(
      "id",
      memberships.map((m) => m.tenantId)
    );

  const tenants: (Tenant & { id: string })[] = memberships.map((m) => {
    const tenant = tenantRows?.find((t) => t.id === m.tenantId);
    return { id: m.tenantId, name: tenant?.name ?? "Unknown association", role: labelRole(m.roles[0] ?? "member") };
  });

  const cookieTenantId = (await cookies()).get(ACTIVE_TENANT_COOKIE_NAME)?.value ?? null;
  const activeTenantId = tenants.some((t) => t.id === cookieTenantId) ? cookieTenantId! : tenants[0].id;
  const activeTenant = tenants.find((t) => t.id === activeTenantId)!;

  return (
    <ActiveTenantProvider initialTenantId={activeTenantId}>
      <AppFrame tenants={tenants} activeTenant={activeTenant}>
        {children}
      </AppFrame>
    </ActiveTenantProvider>
  );
}
