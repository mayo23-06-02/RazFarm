import Link from "next/link";
import { Card } from "@/components/ui/Card";
import { Badge, type BadgeVariant } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";
import { cn } from "@/lib/cn";

export type AlertSeverity = "warning" | "danger" | "info";

export interface AlertItem {
  label: string;
  meta?: string;
  href?: string;
  severity?: AlertSeverity;
}

export interface AlertsCardProps {
  title?: string;
  items: AlertItem[];
  className?: string;
}

const severityBadge: Record<AlertSeverity, BadgeVariant> = {
  warning: "warning",
  danger: "danger",
  info: "info",
};

const severityLabel: Record<AlertSeverity, string> = {
  warning: "Attention",
  danger: "Urgent",
  info: "Notice",
};

export function AlertsCard({ title = "Alerts & notices", items, className }: AlertsCardProps) {
  return (
    <Card title={title} className={className}>
      {items.length === 0 ? (
        <EmptyState compact title="No alerts — everything looks on track." />
      ) : (
        <ul className="flex flex-col gap-1">
          {items.map((item, i) => {
            const severity = item.severity ?? "info";
            const row = (
              <div className="flex items-start gap-3 px-1 py-2">
                <Badge variant={severityBadge[severity]} className="mt-0.5 shrink-0">
                  {severityLabel[severity]}
                </Badge>
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-medium text-ink-900">{item.label}</span>
                  {item.meta && <span className="block text-xs text-ink-400">{item.meta}</span>}
                </span>
              </div>
            );
            return (
              <li key={i} className="border-b border-paper-100 last:border-0">
                {item.href ? (
                  <Link
                    href={item.href}
                    className={cn(
                      "block rounded-ctrl transition-colors duration-150 hover:bg-paper-50",
                      "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2 focus-visible:ring-offset-paper-50"
                    )}
                  >
                    {row}
                  </Link>
                ) : (
                  row
                )}
              </li>
            );
          })}
        </ul>
      )}
    </Card>
  );
}
