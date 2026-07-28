import { cn } from "@/lib/cn";

export interface ProgressBarProps {
  value: number;
  max?: number;
  className?: string;
}

export function ProgressBar({ value, max = 100, className }: ProgressBarProps) {
  const pct = Math.min(100, Math.max(0, (value / max) * 100));
  return (
    <div className={cn("h-2 w-full overflow-hidden rounded-pill bg-paper-100", className)}>
      <div
        className="h-full rounded-pill bg-brand-500 transition-[width] duration-300"
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}

export interface ProgressCardProps {
  label: string;
  value: number;
  max: number;
  unit?: string;
  className?: string;
}

export function ProgressCard({ label, value, max, unit = "t", className }: ProgressCardProps) {
  return (
    <div className={cn("rounded-card border border-paper-200 bg-paper-0 p-5 shadow-card", className)}>
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-medium uppercase tracking-wide text-ink-400">{label}</span>
        <span className="font-mono text-xs tabular-nums text-ink-500">
          {value.toLocaleString("en-SZ")} / {max.toLocaleString("en-SZ")} {unit}
        </span>
      </div>
      <ProgressBar value={value} max={max} className="mt-3" />
    </div>
  );
}
