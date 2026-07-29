"use client";

import { usePathname } from "next/navigation";
import {
  TbBuildingFactory2,
  TbCalendarEvent,
  TbCash,
  TbFolder,
  TbLayoutDashboard,
  TbPackage,
  TbPlant2,
  TbSettings,
  TbSpeakerphone,
  TbTruck,
  TbUsers,
} from "react-icons/tb";
import { NavItem } from "./NavItem";
import { TenantSwitcher, type Tenant } from "./TenantSwitcher";
import { SectionHeading } from "@/components/ui/SectionHeading";

interface NavGroup {
  label: string;
  items: { icon: React.ReactNode; label: string; href?: string; badge?: number; active?: boolean }[];
}

const NAV_GROUPS: NavGroup[] = [
  {
    label: "General",
    items: [{ icon: <TbLayoutDashboard />, label: "Dashboard", href: "/dashboard" }],
  },
  {
    label: "Production",
    items: [
      { icon: <TbPlant2 />, label: "Fields" },
      { icon: <TbTruck />, label: "Deliveries", badge: 3 },
      { icon: <TbBuildingFactory2 />, label: "Mill" },
    ],
  },
  {
    label: "Finance",
    items: [
      { icon: <TbCash />, label: "Finances" },
      { icon: <TbPackage />, label: "Inventory" },
    ],
  },
  {
    label: "Association",
    items: [
      { icon: <TbUsers />, label: "Members", href: "/members" },
      { icon: <TbCalendarEvent />, label: "Meetings", href: "/meetings" },
      { icon: <TbSpeakerphone />, label: "Announcements", href: "/announcements" },
      { icon: <TbFolder />, label: "Documents", href: "/documents" },
    ],
  },
  {
    label: "Admin",
    items: [{ icon: <TbSettings />, label: "Settings" }],
  },
];

const DEMO_TENANTS: Tenant[] = [
  { name: "Ka-Lavumisa Growers", role: "Chairman" },
  { name: "Big Bend Co-op", role: "Accountant" },
];

export interface SidebarProps {
  className?: string;
  tenants?: Tenant[];
  activeTenant?: Tenant;
}

export function Sidebar({ className, tenants = DEMO_TENANTS, activeTenant = DEMO_TENANTS[0] }: SidebarProps) {
  const pathname = usePathname();

  return (
    <aside className={`flex h-full w-[248px] shrink-0 flex-col border-r border-paper-200 bg-paper-0 ${className ?? ""}`}>
      <div className="flex items-center gap-2 px-5 py-5">
        <span className="flex size-8 items-center justify-center rounded-ctrl bg-brand-500 font-display text-sm font-bold text-white">
          C
        </span>
        <span className="font-display text-base font-semibold text-ink-900">Cane &amp; Ledger</span>
      </div>
      <nav className="flex-1 space-y-5 overflow-y-auto px-3">
        {NAV_GROUPS.map((group) => (
          <div key={group.label} className="space-y-1">
            <SectionHeading className="mb-2 px-3">{group.label}</SectionHeading>
            {group.items.map((item) => {
              const active = item.href ? pathname === item.href || pathname.startsWith(`${item.href}/`) : item.active;
              return <NavItem key={item.label} {...item} active={active} />;
            })}
          </div>
        ))}
      </nav>
      <div className="border-t border-paper-200 p-3">
        <TenantSwitcher tenants={tenants} active={activeTenant} />
      </div>
    </aside>
  );
}
