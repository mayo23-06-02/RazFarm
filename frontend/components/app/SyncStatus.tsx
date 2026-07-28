import { TbCloudCheck, TbCloudOff, TbRefresh } from "react-icons/tb";
import { cn } from "@/lib/cn";

export type SyncState = "synced" | "syncing" | "offline";

export interface SyncStatusProps {
  state: SyncState;
  pendingCount?: number;
  className?: string;
}

const config: Record<SyncState, { icon: typeof TbCloudCheck; label: string; tone: string }> = {
  synced: { icon: TbCloudCheck, label: "Synced", tone: "text-field-500" },
  syncing: { icon: TbRefresh, label: "Syncing", tone: "text-info-500" },
  offline: { icon: TbCloudOff, label: "Offline", tone: "text-harvest-500" },
};

export function SyncStatus({ state, pendingCount, className }: SyncStatusProps) {
  const { icon: Icon, label, tone } = config[state];
  return (
    <span className={cn("inline-flex items-center gap-1.5 text-sm font-medium", tone, className)} aria-live="polite">
      <Icon className={cn("size-4", state === "syncing" && "animate-spin")} />
      {label}
      {state === "offline" && pendingCount ? (
        <span className="text-ink-400">— {pendingCount} pending</span>
      ) : null}
    </span>
  );
}
