import Link from "next/link";
import type { ReactNode } from "react";
import { TbArrowLeft } from "react-icons/tb";
import { cn } from "@/lib/cn";

export interface PageHeaderProps {
  title: string;
  subtitle?: ReactNode;
  actions?: ReactNode;
  backHref?: string;
  className?: string;
}

export function PageHeader({ title, subtitle, actions, backHref, className }: PageHeaderProps) {
  return (
    <div className={cn("flex items-start justify-between gap-4", className)}>
      <div className="flex items-start gap-3">
        {backHref && (
          <Link
            href={backHref}
            className="mt-1 flex size-8 shrink-0 items-center justify-center rounded-ctrl text-ink-500 hover:bg-paper-100"
          >
            <TbArrowLeft className="size-4" />
          </Link>
        )}
        <div>
          <h1 className="font-display text-[28px] font-bold leading-tight text-ink-900">{title}</h1>
          {subtitle && <p className="mt-1 text-sm text-ink-500">{subtitle}</p>}
        </div>
      </div>
      {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
    </div>
  );
}
