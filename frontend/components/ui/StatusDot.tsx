import { cn } from "@/lib/cn";

export type StatusDotTone = "success" | "warning" | "danger" | "info" | "neutral";

const toneClasses: Record<StatusDotTone, string> = {
  success: "bg-field-500",
  warning: "bg-harvest-500",
  danger: "bg-danger-600",
  info: "bg-info-500",
  neutral: "bg-ink-400",
};

export interface StatusDotProps {
  tone?: StatusDotTone;
  label: string;
  pulse?: boolean;
  className?: string;
}

export function StatusDot({ tone = "neutral", label, pulse, className }: StatusDotProps) {
  return (
    <span className={cn("inline-flex items-center gap-1.5 text-sm text-ink-700", className)}>
      <span className="relative flex size-2">
        {pulse && (
          <span
            className={cn("absolute inline-flex h-full w-full animate-ping rounded-full opacity-60", toneClasses[tone])}
          />
        )}
        <span className={cn("relative inline-flex size-2 rounded-full", toneClasses[tone])} />
      </span>
      {label}
    </span>
  );
}
