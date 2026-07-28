import type { ReactNode } from "react";
import { TbCircleFilled } from "react-icons/tb";
import { cn } from "@/lib/cn";

export interface TimelineItem {
  icon?: ReactNode;
  title: ReactNode;
  meta?: string;
  description?: ReactNode;
}

export interface TimelineProps {
  items: TimelineItem[];
  className?: string;
}

export function Timeline({ items, className }: TimelineProps) {
  return (
    <ol className={cn("relative", className)}>
      {items.map((item, i) => (
        <li key={i} className="relative flex gap-3 pb-6 last:pb-0">
          {i < items.length - 1 && (
            <span className="absolute left-[13px] top-6 h-[calc(100%-8px)] w-px bg-paper-200" />
          )}
          <span className="relative z-10 flex size-[26px] shrink-0 items-center justify-center rounded-full bg-paper-100 text-ink-500 [&>svg]:size-3.5">
            {item.icon ?? <TbCircleFilled className="size-2" />}
          </span>
          <div className="pt-0.5">
            <div className="flex items-baseline gap-2">
              <p className="text-sm font-medium text-ink-900">{item.title}</p>
              {item.meta && <span className="text-xs text-ink-400">{item.meta}</span>}
            </div>
            {item.description && <p className="mt-0.5 text-sm text-ink-500">{item.description}</p>}
          </div>
        </li>
      ))}
    </ol>
  );
}
