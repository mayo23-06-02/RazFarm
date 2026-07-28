import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

export interface CardProps {
  title?: ReactNode;
  action?: ReactNode;
  footer?: ReactNode;
  padded?: boolean;
  interactive?: boolean;
  children: ReactNode;
  className?: string;
}

export function Card({ title, action, footer, padded = true, interactive, children, className }: CardProps) {
  return (
    <div
      className={cn(
        "rounded-card border border-paper-200 bg-paper-0 shadow-card",
        interactive && "transition-colors duration-150 hover:border-brand-200",
        className
      )}
    >
      {(title || action) && (
        <div className={cn("flex items-center justify-between gap-3", padded ? "px-5 pt-5" : "px-4 pt-4")}>
          {title && <h2 className="font-display text-[20px] font-semibold text-ink-900">{title}</h2>}
          {action && <div className="shrink-0">{action}</div>}
        </div>
      )}
      <div className={padded ? "p-5" : undefined}>{children}</div>
      {footer && (
        <div className={cn("border-t border-paper-200", padded ? "px-5 py-4" : "p-4")}>{footer}</div>
      )}
    </div>
  );
}
