import Link from "next/link";
import { TbChevronRight } from "react-icons/tb";
import { cn } from "@/lib/cn";

export interface Crumb {
  label: string;
  href?: string;
}

export interface BreadcrumbsProps {
  items: Crumb[];
  className?: string;
}

export function Breadcrumbs({ items, className }: BreadcrumbsProps) {
  return (
    <nav className={cn("flex items-center gap-1.5 text-[13px]", className)} aria-label="Breadcrumb">
      {items.map((item, i) => {
        const isLast = i === items.length - 1;
        return (
          <span key={i} className="flex items-center gap-1.5">
            {i > 0 && <TbChevronRight className="size-3.5 text-ink-400" />}
            {item.href && !isLast ? (
              <Link href={item.href} className="text-ink-400 hover:text-ink-700">
                {item.label}
              </Link>
            ) : (
              <span className={isLast ? "text-ink-700" : "text-ink-400"}>{item.label}</span>
            )}
          </span>
        );
      })}
    </nav>
  );
}
