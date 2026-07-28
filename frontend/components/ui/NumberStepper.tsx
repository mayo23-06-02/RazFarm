"use client";

import { useState } from "react";
import { TbMinus, TbPlus } from "react-icons/tb";
import { cn } from "@/lib/cn";

export interface NumberStepperProps {
  value?: number;
  defaultValue?: number;
  min?: number;
  max?: number;
  step?: number;
  suffix?: string;
  onChange?: (value: number) => void;
  className?: string;
}

export function NumberStepper({
  value,
  defaultValue = 0,
  min = 0,
  max = Infinity,
  step = 1,
  suffix,
  onChange,
  className,
}: NumberStepperProps) {
  const [internal, setInternal] = useState(defaultValue);
  const current = value ?? internal;

  const set = (next: number) => {
    const clamped = Math.min(max, Math.max(min, next));
    setInternal(clamped);
    onChange?.(clamped);
  };

  return (
    <div
      className={cn(
        "inline-flex h-11 items-center rounded-ctrl border border-paper-200 bg-paper-0",
        className
      )}
    >
      <button
        type="button"
        aria-label="Decrease"
        onClick={() => set(current - step)}
        disabled={current <= min}
        className="flex h-11 w-11 shrink-0 items-center justify-center rounded-l-ctrl text-ink-700 hover:bg-paper-100 disabled:opacity-40"
      >
        <TbMinus className="size-4" />
      </button>
      <div className="flex h-11 min-w-14 items-center justify-center border-x border-paper-200 px-2 font-mono text-sm tabular-nums text-ink-900">
        {current}
        {suffix && <span className="ml-1 text-ink-400">{suffix}</span>}
      </div>
      <button
        type="button"
        aria-label="Increase"
        onClick={() => set(current + step)}
        disabled={current >= max}
        className="flex h-11 w-11 shrink-0 items-center justify-center rounded-r-ctrl text-ink-700 hover:bg-paper-100 disabled:opacity-40"
      >
        <TbPlus className="size-4" />
      </button>
    </div>
  );
}
