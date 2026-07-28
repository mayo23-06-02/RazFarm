"use client";

import { forwardRef, type InputHTMLAttributes } from "react";
import { TbCheck } from "react-icons/tb";
import { cn } from "@/lib/cn";

export interface CheckboxProps extends Omit<InputHTMLAttributes<HTMLInputElement>, "type"> {
  label?: string;
}

export const Checkbox = forwardRef<HTMLInputElement, CheckboxProps>(
  ({ label, className, id, ...props }, ref) => {
    const inputId = id ?? `checkbox-${label?.replace(/\s+/g, "-").toLowerCase()}`;
    return (
      <label htmlFor={inputId} className={cn("inline-flex items-center gap-2 text-sm text-ink-700 select-none", props.disabled && "opacity-50", className)}>
        <span className="relative inline-flex">
          <input
            ref={ref}
            id={inputId}
            type="checkbox"
            className="peer size-[18px] shrink-0 appearance-none rounded-[5px] border border-paper-300 bg-paper-0 transition-colors duration-150 checked:border-brand-500 checked:bg-brand-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2 focus-visible:ring-offset-paper-50 disabled:cursor-not-allowed"
            {...props}
          />
          <TbCheck className="pointer-events-none absolute inset-0 m-auto size-3.5 scale-0 text-white peer-checked:scale-100" />
        </span>
        {label}
      </label>
    );
  }
);
Checkbox.displayName = "Checkbox";

export const Radio = forwardRef<HTMLInputElement, CheckboxProps>(
  ({ label, className, id, ...props }, ref) => {
    const inputId = id ?? `radio-${label?.replace(/\s+/g, "-").toLowerCase()}`;
    return (
      <label htmlFor={inputId} className={cn("inline-flex items-center gap-2 text-sm text-ink-700 select-none", props.disabled && "opacity-50", className)}>
        <span className="relative inline-flex">
          <input
            ref={ref}
            id={inputId}
            type="radio"
            className="peer size-[18px] shrink-0 appearance-none rounded-full border border-paper-300 bg-paper-0 transition-colors duration-150 checked:border-[5px] checked:border-brand-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2 focus-visible:ring-offset-paper-50 disabled:cursor-not-allowed"
            {...props}
          />
        </span>
        {label}
      </label>
    );
  }
);
Radio.displayName = "Radio";

export interface ToggleProps {
  checked?: boolean;
  defaultChecked?: boolean;
  onChange?: (checked: boolean) => void;
  label?: string;
  disabled?: boolean;
  className?: string;
}

export function Toggle({ checked, defaultChecked, onChange, label, disabled, className }: ToggleProps) {
  return (
    <label className={cn("inline-flex items-center gap-2 text-sm text-ink-700 select-none", disabled && "opacity-50", className)}>
      <span className="relative inline-flex">
        <input
          type="checkbox"
          className="peer sr-only"
          checked={checked}
          defaultChecked={defaultChecked}
          disabled={disabled}
          onChange={(e) => onChange?.(e.target.checked)}
        />
        <span className="h-5 w-9 rounded-pill bg-paper-300 transition-colors duration-150 peer-checked:bg-brand-500 peer-focus-visible:ring-2 peer-focus-visible:ring-brand-500 peer-focus-visible:ring-offset-2 peer-focus-visible:ring-offset-paper-50" />
        <span className="absolute left-0.5 top-0.5 size-4 rounded-full bg-white shadow-card transition-transform duration-150 peer-checked:translate-x-4" />
      </span>
      {label}
    </label>
  );
}
