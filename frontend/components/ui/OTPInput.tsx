"use client";

import { useRef, useState, type ClipboardEvent, type KeyboardEvent } from "react";
import { cn } from "@/lib/cn";

export interface OtpInputProps {
  length?: number;
  value?: string;
  onChange?: (code: string) => void;
  onComplete?: (code: string) => void;
  error?: boolean;
  disabled?: boolean;
  className?: string;
}

export function OtpInput({
  length = 6,
  value,
  onChange,
  onComplete,
  error,
  disabled,
  className,
}: OtpInputProps) {
  const isControlled = value !== undefined;
  const [internalValues, setInternalValues] = useState<string[]>(() => Array(length).fill(""));
  const values = isControlled ? Array.from({ length }, (_, i) => value[i] ?? "") : internalValues;
  const refs = useRef<(HTMLInputElement | null)[]>([]);

  const commit = (next: string[]) => {
    if (!isControlled) setInternalValues(next);
    const code = next.join("");
    onChange?.(code);
    if (next.every((v) => v !== "")) onComplete?.(code);
  };

  const update = (index: number, char: string) => {
    const next = [...values];
    next[index] = char;
    commit(next);
    if (char && index < length - 1) refs.current[index + 1]?.focus();
  };

  const handleKeyDown = (index: number, e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace") {
      if (values[index]) {
        update(index, "");
      } else if (index > 0) {
        refs.current[index - 1]?.focus();
        update(index - 1, "");
      }
    } else if (e.key === "ArrowLeft" && index > 0) {
      refs.current[index - 1]?.focus();
    } else if (e.key === "ArrowRight" && index < length - 1) {
      refs.current[index + 1]?.focus();
    }
  };

  const handlePaste = (index: number, e: ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const digits = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, length - index);
    if (!digits) return;
    const next = [...values];
    digits.split("").forEach((d, i) => {
      next[index + i] = d;
    });
    commit(next);
    const lastFilled = Math.min(index + digits.length, length - 1);
    refs.current[lastFilled]?.focus();
  };

  return (
    <div className={cn("flex gap-2", className)} role="group" aria-label="Verification code">
      {values.map((v, i) => (
        <input
          key={i}
          ref={(el) => {
            refs.current[i] = el;
          }}
          value={v}
          disabled={disabled}
          aria-invalid={error || undefined}
          maxLength={1}
          inputMode="numeric"
          autoComplete={i === 0 ? "one-time-code" : "off"}
          onChange={(e) => update(i, e.target.value.replace(/\D/g, "").slice(-1))}
          onKeyDown={(e) => handleKeyDown(i, e)}
          onPaste={(e) => handlePaste(i, e)}
          className={cn(
            "size-11 rounded-ctrl border bg-paper-0 text-center font-mono text-lg font-semibold text-ink-900 outline-none transition-colors duration-150",
            "focus:border-brand-500 focus:ring-1 focus:ring-brand-500",
            "disabled:opacity-50 disabled:cursor-not-allowed",
            error ? "border-danger-600" : "border-paper-200"
          )}
        />
      ))}
    </div>
  );
}

/** @deprecated use `OtpInput` */
export const OTPInput = OtpInput;
