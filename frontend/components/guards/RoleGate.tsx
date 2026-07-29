import type { ReactNode } from "react";
import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { decodeAccessTokenClaims, hasRole, ACTIVE_TENANT_COOKIE_NAME } from "@/lib/auth/claims";
import type { MemberRole } from "@/lib/database.types";

export interface RoleGateProps {
  /** Roles that may see `children`; any one match is sufficient. */
  roles: MemberRole[];
  /** Defaults to the active-tenant cookie when omitted. */
  tenantId?: string;
  fallback?: ReactNode;
  children: ReactNode;
}

// Server-checked convenience gate — hides UI the user couldn't act on anyway.
// RLS (see migration §4) is the real enforcement; this only avoids flashing
// controls that would just fail on submit.
export async function RoleGate({ roles, tenantId, fallback = null, children }: RoleGateProps) {
  const supabase = await createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();

  const claims = decodeAccessTokenClaims(session?.access_token);
  const resolvedTenantId = tenantId ?? (await cookies()).get(ACTIVE_TENANT_COOKIE_NAME)?.value ?? null;

  if (!hasRole(claims, resolvedTenantId, ...roles)) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
}
