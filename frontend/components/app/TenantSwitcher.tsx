import { TbSelector } from "react-icons/tb";
import { Avatar } from "@/components/ui/Avatar";
import { Popover } from "@/components/ui/Popover";
import { Badge } from "@/components/ui/Badge";

export interface Tenant {
  name: string;
  role: string;
}

export interface TenantSwitcherProps {
  tenants: Tenant[];
  active: Tenant;
}

export function TenantSwitcher({ tenants, active }: TenantSwitcherProps) {
  return (
    <Popover
      align="start"
      trigger={
        <button className="flex w-full items-center gap-2.5 rounded-ctrl border border-paper-200 bg-paper-0 px-2.5 py-2 text-left hover:border-brand-300">
          <Avatar name={active.name} size="sm" />
          <span className="min-w-0 flex-1">
            <span className="block truncate text-sm font-medium text-ink-900">{active.name}</span>
            <span className="block truncate text-xs text-ink-400">{active.role}</span>
          </span>
          <TbSelector className="size-4 shrink-0 text-ink-400" />
        </button>
      }
    >
      <p className="px-2 pb-2 text-[11px] font-medium uppercase tracking-wide text-ink-400">
        Switch association
      </p>
      <div className="flex flex-col gap-1">
        {tenants.map((t) => (
          <button
            key={t.name}
            className="flex items-center gap-2.5 rounded-ctrl px-2 py-1.5 text-left hover:bg-paper-100"
          >
            <Avatar name={t.name} size="sm" />
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm text-ink-900">{t.name}</span>
            </span>
            {t.name === active.name && <Badge variant="brand">Active</Badge>}
          </button>
        ))}
      </div>
    </Popover>
  );
}
