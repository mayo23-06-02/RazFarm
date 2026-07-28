import { Breadcrumbs, type Crumb } from "@/components/ui/Breadcrumbs";
import { SearchInput } from "@/components/ui/Input";
import { NotificationBell } from "./NotificationBell";
import { UserMenu } from "./UserMenu";
import { SyncStatus } from "./SyncStatus";

export interface TopbarProps {
  crumbs: Crumb[];
}

export function Topbar({ crumbs }: TopbarProps) {
  return (
    <header className="flex h-14 shrink-0 items-center gap-4 border-b border-paper-200 bg-paper-0 px-5">
      <Breadcrumbs items={crumbs} className="shrink-0" />
      <div className="mx-auto w-full max-w-sm">
        <SearchInput placeholder="Search… ⌘K" />
      </div>
      <div className="flex shrink-0 items-center gap-3">
        <SyncStatus state="synced" />
        <NotificationBell
          items={[
            { title: "Payout run #14 awaiting approval", time: "12m ago" },
            { title: "New delivery recorded — Field B12", time: "1h ago", read: true },
          ]}
        />
        <UserMenu name="Nomvula Dlamini" role="Chairman" />
      </div>
    </header>
  );
}
