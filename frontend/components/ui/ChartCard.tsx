import type { ReactNode } from "react";
import { cn } from "@/lib/cn";
import { EmptyState } from "./EmptyState";

export interface ChartCardProps {
  title: string;
  action?: ReactNode;
  /** Design guideline: 260 or 320. Accepts any number for denser demo/compact layouts. */
  height?: number;
  empty?: boolean;
  emptyLabel?: string;
  legend?: ReactNode;
  children?: ReactNode;
  className?: string;
}

export function ChartCard({
  title,
  action,
  height = 260,
  empty,
  emptyLabel = "No data for this range yet.",
  legend,
  children,
  className,
}: ChartCardProps) {
  return (
    <div className={cn("rounded-card border border-paper-200 bg-paper-0 p-5 shadow-card", className)}>
      <div className="flex items-center justify-between gap-3">
        <h2 className="font-display text-[20px] font-semibold text-ink-900">{title}</h2>
        {action}
      </div>
      <div style={{ height }} className="mt-4">
        {empty ? (
          <div className="flex h-full items-center justify-center">
            <EmptyState compact title="No data yet" body={emptyLabel} />
          </div>
        ) : (
          children
        )}
      </div>
      {legend && <div className="mt-3 flex items-center gap-4 text-xs text-ink-500">{legend}</div>}
    </div>
  );
}
