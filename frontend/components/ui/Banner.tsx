"use client";

import { useState, type ReactNode } from "react";
import { TbAlertTriangle, TbCloudOff, TbInfoCircle, TbX } from "react-icons/tb";
import { cn } from "@/lib/cn";

export type BannerVariant = "info" | "harvest" | "danger";

const variantClasses: Record<BannerVariant, string> = {
  info: "bg-info-50 text-info-500",
  harvest: "bg-harvest-50 text-harvest-500",
  danger: "bg-danger-50 text-danger-600",
};

const variantIcon: Record<BannerVariant, ReactNode> = {
  info: <TbCloudOff className="size-4" />,
  harvest: <TbAlertTriangle className="size-4" />,
  danger: <TbAlertTriangle className="size-4" />,
};

export interface BannerProps {
  variant?: BannerVariant;
  children: ReactNode;
  action?: ReactNode;
  dismissible?: boolean;
  className?: string;
}

export function Banner({ variant = "info", children, action, dismissible, className }: BannerProps) {
  const [dismissed, setDismissed] = useState(false);
  if (dismissed) return null;

  return (
    <div
      className={cn(
        "flex items-center gap-2.5 px-4 py-2.5 text-sm font-medium",
        variantClasses[variant],
        className
      )}
    >
      {variantIcon[variant]}
      <span className="flex-1">{children}</span>
      {action}
      {dismissible && (
        <button
          type="button"
          aria-label="Dismiss"
          onClick={() => setDismissed(true)}
          className="shrink-0 rounded-full p-0.5 hover:bg-black/5"
        >
          <TbX className="size-4" />
        </button>
      )}
    </div>
  );
}

export function BannerIconInfo() {
  return <TbInfoCircle className="size-4" />;
}
