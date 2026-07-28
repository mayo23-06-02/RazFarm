import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { decodeAccessTokenClaims, tenantsFromClaims, ACTIVE_TENANT_COOKIE_NAME } from "@/lib/auth/claims";

// Same resolution rule as app/(app)/layout.tsx: prefer the active_tenant
// cookie, fall back to the user's first membership. Server pages call this
// directly (rather than trusting the cookie blindly) because the layout
// can't persist its own fallback to the cookie during a render.
export async function getActiveTenantId(): Promise<string> {
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

  const cookieTenantId = (await cookies()).get(ACTIVE_TENANT_COOKIE_NAME)?.value ?? null;
  const match = memberships.find((m) => m.tenantId === cookieTenantId);
  return (match ?? memberships[0]).tenantId;
}
