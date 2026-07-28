"use client";

import { useRef, useState } from "react";
import { cn } from "@/lib/cn";

export interface OTPInputProps {
  length?: number;
  onComplete?: (code: string) => void;
  className?: string;
}

export function OTPInput({ length = 6, onComplete, className }: OTPInputProps) {
  const [values, setValues] = useState<string[]>(Array(length).fill(""));
  const refs = useRef<(HTMLInputElement | null)[]>([]);

  const update = (index: number, char: string) => {
    const next = [...values];
    next[index] = char;
    setValues(next);
    if (char && index < length - 1) refs.current[index + 1]?.focus();
    if (next.every((v) => v !== "")) onComplete?.(next.join(""));
  };

  return (
    <div className={cn("flex gap-2", className)}>
      {values.map((v, i) => (
        <input
          key={i}
          ref={(el) => {
            refs.current[i] = el;
          }}
          value={v}
          maxLength={1}
          inputMode="numeric"
          onChange={(e) => update(i, e.target.value.replace(/\D/g, "").slice(-1))}
          onKeyDown={(e) => {
            if (e.key === "Backspace" && !v && i > 0) refs.current[i - 1]?.focus();
          }}
          className={cn(
            "size-11 rounded-ctrl border border-paper-200 bg-paper-0 text-center font-mono text-lg font-semibold text-ink-900 outline-none transition-colors duration-150",
            "focus:border-brand-500 focus:ring-1 focus:ring-brand-500"
          )}
        />
      ))}
    </div>
  );
}
