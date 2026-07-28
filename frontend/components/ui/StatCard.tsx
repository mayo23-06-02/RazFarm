"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { TbArrowDown, TbArrowUp, TbInfoCircle } from "react-icons/tb";
import { cn } from "@/lib/cn";

export type DeltaDirection = "upIsGood" | "downIsGood";

export interface DeltaChipProps {
  value: number;
  direction?: DeltaDirection;
  caption?: string;
  className?: string;
}

export function DeltaChip({ value, direction = "upIsGood", caption, className }: DeltaChipProps) {
  const isUp = value >= 0;
  const isGood = direction === "upIsGood" ? isUp : !isUp;
  return (
    <span className={cn("inline-flex items-center gap-1 text-sm font-medium", className)}>
      <span
        className={cn(
          "inline-flex items-center gap-0.5 rounded-pill px-1.5 py-0.5 text-xs",
          isGood ? "bg-field-50 text-field-500" : "bg-danger-50 text-danger-600"
        )}
      >
        {isUp ? <TbArrowUp className="size-3" /> : <TbArrowDown className="size-3" />}
        {Math.abs(value).toFixed(1)}%
      </span>
      {caption && <span className="text-ink-400">{caption}</span>}
    </span>
  );
}

function useCountUp(target: number, durationMs = 400) {
  const [value, setValue] = useState(0);
  const raf = useRef<number | undefined>(undefined);

  useEffect(() => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce) {
      raf.current = requestAnimationFrame(() => setValue(target));
      return () => {
        if (raf.current) cancelAnimationFrame(raf.current);
      };
    }
    const start = performance.now();
    const from = 0;
    const tick = (now: number) => {
      const progress = Math.min(1, (now - start) / durationMs);
      const eased = 1 - Math.pow(1 - progress, 3);
      setValue(from + (target - from) * eased);
      if (progress < 1) raf.current = requestAnimationFrame(tick);
    };
    raf.current = requestAnimationFrame(tick);
    return () => {
      if (raf.current) cancelAnimationFrame(raf.current);
    };
  }, [target, durationMs]);

  return value;
}

export interface StatCardProps {
  label: string;
  value: number;
  formatValue?: (v: number) => string;
  delta?: number;
  deltaDirection?: DeltaDirection;
  deltaCaption?: string;
  icon?: ReactNode;
  info?: string;
  spark?: ReactNode;
  className?: string;
}

export function StatCard({
  label,
  value,
  formatValue,
  delta,
  deltaDirection = "upIsGood",
  deltaCaption = "vs last season",
  icon,
  info,
  spark,
  className,
}: StatCardProps) {
  const animated = useCountUp(value);
  const display = formatValue ? formatValue(animated) : Math.round(animated).toLocaleString("en-SZ");

  return (
    <div className={cn("rounded-card border border-paper-200 bg-paper-0 p-5 shadow-card", className)}>
      <div className="flex items-center justify-between">
        <span className="flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wide text-ink-400">
          {icon && <span className="[&>svg]:size-3.5 text-brand-500">{icon}</span>}
          {label}
        </span>
        {info && <TbInfoCircle className="size-3.5 shrink-0 text-ink-400" title={info} />}
      </div>
      <div className="mt-2 font-display text-2xl font-bold tabular-nums text-ink-900">{display}</div>
      <div className="mt-2 flex items-center justify-between">
        {delta !== undefined ? (
          <DeltaChip value={delta} direction={deltaDirection} caption={deltaCaption} />
        ) : (
          <span />
        )}
        {spark}
      </div>
    </div>
  );
}

export interface KpiRowProps {
  children: ReactNode;
  className?: string;
}

export function KpiRow({ children, className }: KpiRowProps) {
  return <div className={cn("grid gap-4 sm:grid-cols-2 xl:grid-cols-4", className)}>{children}</div>;
}
