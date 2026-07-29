import { createClient } from "@/lib/supabase/server";
import { decodeAccessTokenClaims, hasRole } from "@/lib/auth/claims";
import type { MemberRole } from "@/lib/database.types";

// Same claim-decoding RoleGate uses, exposed as a plain boolean for pages
// that need the answer inline (e.g. to decide a prop passed into a client
// component) rather than to gate a whole subtree. RLS remains the real
// enforcement — see migration 0002 §3/§4.
export async function hasTenantRole(tenantId: string, roles: MemberRole[]): Promise<boolean> {
  const supabase = await createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();
  const claims = decodeAccessTokenClaims(session?.access_token);
  return hasRole(claims, tenantId, ...roles);
}
