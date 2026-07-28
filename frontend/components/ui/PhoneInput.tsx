"use client";

import { forwardRef, type InputHTMLAttributes } from "react";
import { cn } from "@/lib/cn";

export interface PhoneInputProps
  extends Omit<InputHTMLAttributes<HTMLInputElement>, "type" | "prefix"> {
  error?: boolean;
}

// Eswatini mobile numbers: 8 digits, no leading zero (e.g. 7612 3456).
// Stored/submitted as the local 8-digit string; +268 is a fixed display prefix.
export const PhoneInput = forwardRef<HTMLInputElement, PhoneInputProps>(
  ({ error, className, disabled, onChange, ...props }, ref) => {
    return (
      <div
        className={cn(
          "flex h-10 items-center gap-2 rounded-ctrl border bg-paper-0 px-3 text-sm transition-colors duration-150",
          "focus-within:border-brand-500 focus-within:ring-1 focus-within:ring-brand-500",
          error ? "border-danger-600" : "border-paper-200",
          disabled && "opacity-50 cursor-not-allowed bg-paper-100",
          className
        )}
      >
        <span className="shrink-0 font-medium text-ink-400">+268</span>
        <input
          ref={ref}
          disabled={disabled}
          inputMode="numeric"
          placeholder="7612 3456"
          maxLength={8}
          onChange={(e) => {
            e.target.value = e.target.value.replace(/\D/g, "").slice(0, 8);
            onChange?.(e);
          }}
          className="w-full min-w-0 bg-transparent text-ink-900 placeholder:text-ink-400 outline-none disabled:cursor-not-allowed"
          {...props}
        />
      </div>
    );
  }
);
PhoneInput.displayName = "PhoneInput";

export function isValidEswatiniPhone(value: string) {
  return /^[0-9]{8}$/.test(value);
}
