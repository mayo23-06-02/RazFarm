import {
  TbLayoutDashboard,
  TbPlant2,
  TbTruck,
  TbBuildingFactory2,
  TbCash,
  TbFileInvoice,
  TbCoins,
  TbUsers,
  TbCalendarEvent,
  TbPackage,
  TbTractor,
  TbDroplet,
  TbChartBar,
  TbSettings,
  TbCloudCheck,
  TbCloudOff,
  TbCircleCheck,
  TbAlertTriangle,
} from "react-icons/tb";
import { Section, Demo } from "./Section";

const ICONS = [
  { icon: TbLayoutDashboard, name: "Dashboard" },
  { icon: TbPlant2, name: "Fields" },
  { icon: TbTruck, name: "Deliveries" },
  { icon: TbBuildingFactory2, name: "Mill" },
  { icon: TbCash, name: "Finance" },
  { icon: TbFileInvoice, name: "Invoices" },
  { icon: TbCoins, name: "Payouts" },
  { icon: TbUsers, name: "Members" },
  { icon: TbCalendarEvent, name: "Meetings" },
  { icon: TbPackage, name: "Inventory" },
  { icon: TbTractor, name: "Equipment" },
  { icon: TbDroplet, name: "Irrigation" },
  { icon: TbChartBar, name: "Reports" },
  { icon: TbSettings, name: "Settings" },
  { icon: TbCloudCheck, name: "Synced" },
  { icon: TbCloudOff, name: "Offline" },
  { icon: TbCircleCheck, name: "Approve" },
  { icon: TbAlertTriangle, name: "Warning" },
];

export function IconsSection() {
  return (
    <Section id="icons" title="Icons — Tabler" description="One set only: react-icons/tb, outline, 1.5px stroke. Color inherits text color — never brand-green unless the element itself is a brand action.">
      <Demo>
        <div className="grid grid-cols-3 gap-3 sm:grid-cols-6">
          {ICONS.map(({ icon: Icon, name }) => (
            <div key={name} className="flex flex-col items-center gap-1.5 rounded-ctrl border border-paper-200 bg-paper-0 py-3">
              <Icon className="size-5 text-ink-700" />
              <span className="text-[11px] text-ink-400">{name}</span>
            </div>
          ))}
        </div>
      </Demo>
    </Section>
  );
}
