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
    redirect("/login");
  }

  const claims = decodeAccessTokenClaims(session.access_token);
  const memberships = tenantsFromClaims(claims);

  // register()/completeRegistration() and accept invite flows always create a
  // membership before landing in the app shell, so this is an unreachable
  // edge case in normal use — send back to sign-in rather than 404.
  if (memberships.length === 0) {
    redirect("/login");
  }

  const cookieTenantId = (await cookies()).get(ACTIVE_TENANT_COOKIE_NAME)?.value ?? null;
  const match = memberships.find((m) => m.tenantId === cookieTenantId);
  return (match ?? memberships[0]).tenantId;
}
