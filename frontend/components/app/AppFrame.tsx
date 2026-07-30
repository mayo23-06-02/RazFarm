"use client";

import { useMemo, useState, type ReactNode } from "react";
import { usePathname } from "next/navigation";
import { TbMenu2 } from "react-icons/tb";
import { Sidebar } from "./Sidebar";
import { Topbar } from "./Topbar";
import { IconButton } from "@/components/ui/Button";
import type { Tenant } from "./TenantSwitcher";
import type { Crumb } from "@/components/ui/Breadcrumbs";

const SEGMENT_LABELS: Record<string, string> = {
  dashboard: "Dashboard",
  members: "Members",
  meetings: "Meetings",
  announcements: "Announcements",
  notices: "Notices",
  documents: "Documents",
  fields: "Fields",
  "harvest-plan": "Harvest planning",
  "harvest-capture": "Daily harvest",
  yield: "Yield analytics",
  mill: "Mill",
  deliveries: "Deliveries",
  quality: "Sucrose trends",
};

// Detail-page segments (uuids) don't have a human label available at this
// layer — pages show the real name in their own PageHeader instead.
function deriveCrumbs(pathname: string): Crumb[] {
  const segments = pathname.split("/").filter(Boolean);
  const crumbs: Crumb[] = [];
  let href = "";
  for (const segment of segments) {
    href += `/${segment}`;
    const label = SEGMENT_LABELS[segment] ?? (/^[0-9a-f-]{8,}$/i.test(segment) ? "Detail" : segment);
    crumbs.push({ label, href });
  }
  return crumbs.length > 0 ? crumbs : [{ label: "Dashboard" }];
}

export interface AppFrameProps {
  tenants: Tenant[];
  activeTenant: Tenant;
  children: ReactNode;
}

export function AppFrame({ tenants, activeTenant, children }: AppFrameProps) {
  const pathname = usePathname();
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const crumbs = useMemo(() => deriveCrumbs(pathname), [pathname]);

  return (
    <div className="flex h-screen overflow-hidden bg-paper-50">
      <div
        className={`fixed inset-y-0 left-0 z-40 transition-transform duration-200 md:static md:z-auto md:translate-x-0 ${
          mobileNavOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <Sidebar tenants={tenants} activeTenant={activeTenant} />
      </div>

      {mobileNavOpen && (
        <div
          className="fixed inset-0 z-30 bg-ink-900/40 md:hidden"
          onClick={() => setMobileNavOpen(false)}
          aria-hidden
        />
      )}

      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <div className="flex shrink-0 items-center gap-2 border-b border-paper-200 bg-paper-0 px-3 py-2 md:hidden">
          <IconButton label="Open menu" icon={<TbMenu2 />} onClick={() => setMobileNavOpen(true)} />
        </div>
        <Topbar crumbs={crumbs} />
        <main className="flex-1 overflow-y-auto p-4 md:p-6">{children}</main>
      </div>
    </div>
  );
}
