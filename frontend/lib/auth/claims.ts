import type { MemberRole } from "@/lib/database.types";

// The custom access token hook (see migration §7) writes these two claims
// directly onto the JWT payload, so they're read by decoding the access
// token — not by querying the database.
export interface SessionClaims {
  userId: string | null;
  tenantRoles: Record<string, MemberRole[]>;
  isMegaAdmin: boolean;
}

const EMPTY_CLAIMS: SessionClaims = { userId: null, tenantRoles: {}, isMegaAdmin: false };

function base64UrlDecode(segment: string): string {
  const padded = segment
    .replace(/-/g, "+")
    .replace(/_/g, "/")
    .padEnd(segment.length + ((4 - (segment.length % 4)) % 4), "=");
  if (typeof atob === "function") return decodeURIComponent(escape(atob(padded)));
  return Buffer.from(padded, "base64").toString("utf-8");
}

export function decodeAccessTokenClaims(accessToken: string | undefined | null): SessionClaims {
  if (!accessToken) return EMPTY_CLAIMS;
  try {
    const payload = accessToken.split(".")[1];
    if (!payload) return EMPTY_CLAIMS;
    const json = JSON.parse(base64UrlDecode(payload)) as {
      sub?: string;
      tenant_roles?: Record<string, MemberRole[]>;
      is_mega_admin?: boolean;
    };
    return {
      userId: json.sub ?? null,
      tenantRoles: json.tenant_roles ?? {},
      isMegaAdmin: json.is_mega_admin ?? false,
    };
  } catch {
    return EMPTY_CLAIMS;
  }
}

export function hasRole(claims: SessionClaims, tenantId: string | null | undefined, ...roles: MemberRole[]): boolean {
  if (!tenantId) return false;
  if (claims.isMegaAdmin) return true;
  const rolesForTenant = claims.tenantRoles[tenantId];
  if (!rolesForTenant?.length) return false;
  return roles.some((role) => rolesForTenant.includes(role));
}

export function tenantsFromClaims(claims: SessionClaims): { tenantId: string; roles: MemberRole[] }[] {
  return Object.entries(claims.tenantRoles).map(([tenantId, roles]) => ({ tenantId, roles }));
}

export { ActiveTenantProvider, useActiveTenant, ACTIVE_TENANT_COOKIE_NAME } from "./active-tenant";
