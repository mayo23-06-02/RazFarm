import Link from "next/link";
import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

export interface NavItemProps {
  icon: ReactNode;
  label: string;
  href?: string;
  badge?: number;
  active?: boolean;
  collapsed?: boolean;
}

export function NavItem({ icon, label, href = "#", badge, active, collapsed }: NavItemProps) {
  return (
    <Link
      href={href}
      title={collapsed ? label : undefined}
      className={cn(
        "relative flex items-center gap-2.5 rounded-ctrl px-3 py-2 text-sm font-medium transition-colors duration-150",
        collapsed && "justify-center px-0",
        active ? "bg-brand-50 text-brand-700" : "text-ink-500 hover:bg-paper-100 hover:text-ink-700"
      )}
    >
      {active && <span className="absolute left-0 top-1/2 h-4 w-[3px] -translate-y-1/2 rounded-full bg-brand-500" />}
      <span className="shrink-0 [&>svg]:size-5">{icon}</span>
      {!collapsed && <span className="flex-1">{label}</span>}
      {!collapsed && badge !== undefined && (
        <span className="rounded-pill bg-brand-100 px-1.5 py-0.5 text-xs font-semibold text-brand-700">
          {badge}
        </span>
      )}
    </Link>
  );
}
