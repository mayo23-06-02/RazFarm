"use client";

import { useState, type InputHTMLAttributes } from "react";
import { cn } from "@/lib/cn";

export interface MoneyInputProps
  extends Omit<InputHTMLAttributes<HTMLInputElement>, "value" | "onChange" | "type"> {
  value?: number;
  defaultValue?: number;
  onValueChange?: (value: number) => void;
  error?: boolean;
  currency?: string;
}

function formatDisplay(raw: string) {
  const cleaned = raw.replace(/[^\d.]/g, "");
  const [whole, decimal] = cleaned.split(".");
  const withThousands = whole ? Number(whole).toLocaleString("en-SZ") : "";
  return decimal !== undefined ? `${withThousands}.${decimal.slice(0, 2)}` : withThousands;
}

export function MoneyInput({
  value,
  defaultValue,
  onValueChange,
  error,
  currency = "E",
  className,
  disabled,
  ...props
}: MoneyInputProps) {
  const [display, setDisplay] = useState(
    defaultValue !== undefined ? formatDisplay(String(defaultValue)) : value !== undefined ? formatDisplay(String(value)) : ""
  );

  const controlled = value !== undefined ? formatDisplay(String(value)) : display;

  return (
    <div
      className={cn(
        "flex h-10 items-center gap-1.5 rounded-ctrl border bg-paper-0 px-3 text-sm transition-colors duration-150",
        "focus-within:border-brand-500 focus-within:ring-1 focus-within:ring-brand-500",
        error ? "border-danger-600" : "border-paper-200",
        disabled && "opacity-50 cursor-not-allowed bg-paper-100",
        className
      )}
    >
      <span className="shrink-0 font-medium text-ink-400">{currency}</span>
      <input
        inputMode="decimal"
        disabled={disabled}
        value={controlled}
        onChange={(e) => {
          const next = formatDisplay(e.target.value);
          setDisplay(next);
          const numeric = Number(next.replace(/,/g, "")) || 0;
          onValueChange?.(numeric);
        }}
        className="w-full min-w-0 bg-transparent text-right font-mono tabular-nums text-ink-900 placeholder:text-ink-400 outline-none disabled:cursor-not-allowed"
        placeholder="0.00"
        {...props}
      />
    </div>
  );
}
