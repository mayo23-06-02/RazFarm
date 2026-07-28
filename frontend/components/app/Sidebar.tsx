import {
  TbBuildingFactory2,
  TbCash,
  TbLayoutDashboard,
  TbPackage,
  TbPlant2,
  TbSettings,
  TbTruck,
  TbUsers,
} from "react-icons/tb";
import { NavItem } from "./NavItem";
import { TenantSwitcher } from "./TenantSwitcher";
import { SectionHeading } from "@/components/ui/SectionHeading";

const NAV_GROUPS = [
  {
    label: "General",
    items: [{ icon: <TbLayoutDashboard />, label: "Dashboard", active: true }],
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
      { icon: <TbUsers />, label: "Members" },
      { icon: <TbPackage />, label: "Inventory" },
    ],
  },
  {
    label: "Admin",
    items: [{ icon: <TbSettings />, label: "Settings" }],
  },
];

export function Sidebar({ className }: { className?: string }) {
  return (
    <aside className={`flex h-full w-[248px] flex-col border-r border-paper-200 bg-paper-0 ${className ?? ""}`}>
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
            {group.items.map((item) => (
              <NavItem key={item.label} {...item} />
            ))}
          </div>
        ))}
      </nav>
      <div className="border-t border-paper-200 p-3">
        <TenantSwitcher
          tenants={[
            { name: "Ka-Lavumisa Growers", role: "Chairman" },
            { name: "Big Bend Co-op", role: "Accountant" },
          ]}
          active={{ name: "Ka-Lavumisa Growers", role: "Chairman" }}
        />
      </div>
    </aside>
  );
}
