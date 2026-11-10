"use client";

import { usePathname } from "next/navigation";
import {
  TbBuildingFactory2,
  TbCalendarEvent,
  TbCash,
  TbEgg,
  TbFolder,
  TbLayoutDashboard,
  TbPackage,
  TbPlant2,
  TbSettings,
  TbSpeakerphone,
  TbTruck,
  TbUserCog,
  TbUsers,
} from "react-icons/tb";
import { NavItem } from "./NavItem";
import { TenantSwitcher, type Tenant } from "./TenantSwitcher";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { BsFlower1 } from "react-icons/bs";

interface NavGroup {
  label: string;
  items: { icon: React.ReactNode; label: string; href?: string; badge?: number; active?: boolean }[];
}

function navGroups(kind: Tenant["enterpriseKind"]): NavGroup[] {
  const poultry = kind === "poultry_farm" || kind === "mixed";
  const cane = kind !== "poultry_farm";
  const groups: NavGroup[] = [
    {
      label: "General",
      items: [{ icon: <TbLayoutDashboard />, label: "Dashboard", href: "/dashboard" }],
    },
  ];

  const production = [
    ...(cane
      ? [
          { icon: <TbPlant2 />, label: "Fields", href: "/fields" },
          { icon: <TbTruck />, label: "Deliveries", href: "/mill/deliveries" },
          { icon: <TbBuildingFactory2 />, label: "Mill", href: "/mill" },
        ]
      : []),
    ...(poultry ? [{ icon: <TbEgg />, label: "Poultry", href: "/poultry" }] : []),
  ];
  if (production.length > 0) groups.push({ label: "Production", items: production });

  groups.push(
    { label: "Finance", items: [{ icon: <TbCash />, label: "Finances", href: "/finance/accounts" }] },
    { label: "Staff", items: [{ icon: <TbUserCog />, label: "Employees & contractors", href: "/staff" }] },
    { label: "Inventory", items: [{ icon: <TbPackage />, label: "Inventory", href: "/inventory/items" }] }
  );

  if (cane) {
    groups.push(
      {
        label: "Association",
        items: [
          { icon: <TbUsers />, label: "Members", href: "/members" },
          { icon: <TbCalendarEvent />, label: "Meetings", href: "/meetings" },
          { icon: <TbSpeakerphone />, label: "Announcements", href: "/announcements" },
          { icon: <TbFolder />, label: "Documents", href: "/documents" },
        ],
      },
      { label: "Admin", items: [{ icon: <TbSettings />, label: "Settings" }] }
    );
  }

  return groups;
}

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

  const groups = navGroups(activeTenant.enterpriseKind);
  const bestMatchHref = groups.flatMap((group) => group.items)
    .map((item) => item.href)
    .filter((href): href is string => !!href && (pathname === href || pathname.startsWith(`${href}/`)))
    .sort((a, b) => b.length - a.length)[0];

  return (
    <aside className={`flex h-full w-[248px] shrink-0 flex-col border-r border-paper-200 bg-paper-0 ${className ?? ""}`}>
      <div className="flex items-center gap-2 px-5 py-5">
        <span className="flex size-8 items-center justify-center rounded-ctrl bg-brand-500 font-display text-sm font-bold text-white">
          <BsFlower1 />
        </span>
        <span className="font-display text-base font-semibold text-ink-900">RazFarm</span>
      </div>
      <nav className="flex-1 space-y-5 overflow-y-auto px-3">
        {groups.map((group) => (
          <div key={group.label} className="space-y-1">
            <SectionHeading className="mb-2 px-3">{group.label}</SectionHeading>
            {group.items.map((item) => {
              const active = item.href ? item.href === bestMatchHref : item.active;
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
