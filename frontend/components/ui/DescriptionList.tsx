import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

export interface DescriptionListItem {
  label: string;
  value: ReactNode;
}

export interface DescriptionListProps {
  items: DescriptionListItem[];
  columns?: 1 | 2;
  className?: string;
}

export function DescriptionList({ items, columns = 2, className }: DescriptionListProps) {
  return (
    <dl className={cn("grid gap-x-6 gap-y-4", columns === 2 ? "sm:grid-cols-2" : "grid-cols-1", className)}>
      {items.map((item, i) => (
        <div key={i} className="flex flex-col gap-1">
          <dt className="text-xs font-medium uppercase tracking-wide text-ink-400">{item.label}</dt>
          <dd className="text-sm text-ink-900">{item.value}</dd>
        </div>
      ))}
    </dl>
  );
}
