import { cn } from "@/lib/cn";

export interface SectionHeadingProps {
  children: string;
  className?: string;
}

export function SectionHeading({ children, className }: SectionHeadingProps) {
  return (
    <div className={cn("flex items-center gap-3", className)}>
      <span className="shrink-0 text-[11px] font-semibold uppercase tracking-wide text-ink-400">{children}</span>
      <span className="h-px flex-1 bg-paper-200" />
    </div>
  );
}
