import { TbLogout, TbSettings, TbUserCircle } from "react-icons/tb";
import { Avatar } from "@/components/ui/Avatar";
import { DropdownMenu } from "@/components/ui/Popover";

export interface UserMenuProps {
  name: string;
  role: string;
}

export function UserMenu({ name, role }: UserMenuProps) {
  return (
    <DropdownMenu
      align="end"
      trigger={
        <button title={`${name} — ${role}`} className="flex items-center gap-2 rounded-ctrl p-1 hover:bg-paper-100">
          <Avatar name={name} size="sm" />
        </button>
      }
      items={[
        { label: "Profile", icon: <TbUserCircle /> },
        { label: "Settings", icon: <TbSettings /> },
        { label: "Sign out", icon: <TbLogout />, destructive: true },
      ]}
    />
  );
}

export function UserMenuLabel({ name, role }: UserMenuProps) {
  return (
    <div className="px-1 pb-1">
      <p className="text-sm font-medium text-ink-900">{name}</p>
      <p className="text-xs text-ink-400">{role}</p>
    </div>
  );
}
