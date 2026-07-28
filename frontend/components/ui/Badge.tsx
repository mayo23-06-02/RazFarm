import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

export type BadgeVariant = "success" | "warning" | "danger" | "info" | "neutral" | "brand";

const variantClasses: Record<BadgeVariant, string> = {
  success: "bg-field-50 text-field-500",
  warning: "bg-harvest-50 text-harvest-500",
  danger: "bg-danger-50 text-danger-600",
  info: "bg-info-50 text-info-500",
  neutral: "bg-paper-100 text-ink-500",
  brand: "bg-brand-50 text-brand-700",
};

export interface BadgeProps {
  variant?: BadgeVariant;
  icon?: ReactNode;
  children: ReactNode;
  className?: string;
}

export function Badge({ variant = "neutral", icon, children, className }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-pill px-2.5 py-0.5 text-xs font-medium whitespace-nowrap",
        "[&>svg]:size-3",
        variantClasses[variant],
        className
      )}
    >
      {icon}
      {children}
    </span>
  );
}
