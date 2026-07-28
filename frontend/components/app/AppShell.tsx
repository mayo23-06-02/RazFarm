import type { ReactNode } from "react";
import { Sidebar } from "./Sidebar";
import { Topbar } from "./Topbar";
import type { Crumb } from "@/components/ui/Breadcrumbs";

export interface AppShellProps {
  crumbs: Crumb[];
  children: ReactNode;
}

export function AppShell({ crumbs, children }: AppShellProps) {
  return (
    <div className="flex h-[720px] overflow-hidden rounded-card border border-paper-200 shadow-card">
      <Sidebar />
      <div className="flex flex-1 flex-col overflow-hidden">
        <Topbar crumbs={crumbs} />
        <main className="flex-1 overflow-y-auto bg-paper-50 p-6">{children}</main>
      </div>
    </div>
  );
}
