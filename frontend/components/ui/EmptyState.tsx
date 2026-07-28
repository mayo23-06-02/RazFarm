import type { ReactNode } from "react";
import { TbInbox } from "react-icons/tb";
import { cn } from "@/lib/cn";

export interface EmptyStateProps {
  icon?: ReactNode;
  title: string;
  body?: string;
  action?: ReactNode;
  compact?: boolean;
  className?: string;
}

export function EmptyState({ icon, title, body, action, compact, className }: EmptyStateProps) {
  return (
    <div className={cn("flex flex-col items-center justify-center gap-3 text-center", compact ? "py-4" : "py-12", className)}>
      <span className={cn("flex items-center justify-center rounded-pill bg-paper-100 text-ink-400", compact ? "size-9 [&>svg]:size-5" : "size-14 [&>svg]:size-7")}>
        {icon ?? <TbInbox />}
      </span>
      <div className="max-w-xs">
        <p className="text-sm font-medium text-ink-700">{title}</p>
        {body && <p className="mt-1 text-sm text-ink-400">{body}</p>}
      </div>
      {action}
    </div>
  );
}
