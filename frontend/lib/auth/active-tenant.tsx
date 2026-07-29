"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";

export const ACTIVE_TENANT_COOKIE_NAME = "active_tenant";
const COOKIE_MAX_AGE = 60 * 60 * 24 * 365;

function readCookie(name: string): string | null {
  if (typeof document === "undefined") return null;
  const match = document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]*)`));
  return match ? decodeURIComponent(match[1]) : null;
}

function writeCookie(name: string, value: string) {
  document.cookie = `${name}=${encodeURIComponent(value)}; path=/; max-age=${COOKIE_MAX_AGE}; samesite=lax`;
}

interface ActiveTenantContextValue {
  activeTenantId: string | null;
  setActiveTenantId: (tenantId: string) => void;
}

const ActiveTenantContext = createContext<ActiveTenantContextValue | null>(null);

export interface ActiveTenantProviderProps {
  /** Pass the value read server-side from the active_tenant cookie to avoid a flash. */
  initialTenantId?: string | null;
  children: ReactNode;
}

export function ActiveTenantProvider({ initialTenantId = null, children }: ActiveTenantProviderProps) {
  const router = useRouter();
  const [activeTenantId, setActiveTenantIdState] = useState<string | null>(initialTenantId);

  useEffect(() => {
    if (initialTenantId) return;
    const cookieValue = readCookie(ACTIVE_TENANT_COOKIE_NAME);
    if (cookieValue) setActiveTenantIdState(cookieValue);
  }, [initialTenantId]);

  const setActiveTenantId = useCallback(
    (tenantId: string) => {
      writeCookie(ACTIVE_TENANT_COOKIE_NAME, tenantId);
      setActiveTenantIdState(tenantId);
      router.refresh();
    },
    [router]
  );

  const value = useMemo(() => ({ activeTenantId, setActiveTenantId }), [activeTenantId, setActiveTenantId]);

  return <ActiveTenantContext.Provider value={value}>{children}</ActiveTenantContext.Provider>;
}

export function useActiveTenant() {
  const ctx = useContext(ActiveTenantContext);
  if (!ctx) throw new Error("useActiveTenant must be used within an ActiveTenantProvider");
  return ctx;
}
