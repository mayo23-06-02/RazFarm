import Link from "next/link";
import type { ReactNode } from "react";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { cn } from "@/lib/cn";

export type QueueItemUrgency = "harvest" | "danger" | "none";

export interface ApprovalQueueItem {
  icon: ReactNode;
  label: string;
  meta?: string;
  href: string;
  urgency?: QueueItemUrgency;
}

export interface ApprovalQueueCardProps {
  title: string;
  items: ApprovalQueueItem[];
  action?: ReactNode;
  className?: string;
}

const urgencyBorder: Record<QueueItemUrgency, string> = {
  harvest: "border-harvest-500",
  danger: "border-danger-600",
  none: "border-transparent",
};

export function ApprovalQueueCard({ title, items, action, className }: ApprovalQueueCardProps) {
  return (
    <Card title={title} action={action} className={className}>
      {items.length === 0 ? (
        <EmptyState compact title="Nothing needs your attention right now." />
      ) : (
        <ul className="flex flex-col gap-1">
          {items.map((item, i) => (
            <li key={i}>
              <Link
                href={item.href}
                className={cn(
                  "flex items-center gap-3 rounded-ctrl border-l-4 px-3 py-2.5 transition-colors duration-150 hover:bg-paper-50",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2 focus-visible:ring-offset-paper-50",
                  urgencyBorder[item.urgency ?? "none"]
                )}
              >
                <span className="flex size-8 shrink-0 items-center justify-center rounded-pill bg-paper-100 text-ink-500 [&>svg]:size-4">
                  {item.icon}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium text-ink-900">{item.label}</span>
                  {item.meta && <span className="block truncate text-xs text-ink-400">{item.meta}</span>}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
