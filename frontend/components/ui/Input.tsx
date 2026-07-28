"use client";

import { forwardRef, useRef, useState, type InputHTMLAttributes, type ReactNode, type TextareaHTMLAttributes } from "react";
import { TbSearch, TbX } from "react-icons/tb";
import { cn } from "@/lib/cn";

export interface InputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, "prefix"> {
  prefix?: ReactNode;
  suffix?: ReactNode;
  error?: boolean;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ prefix, suffix, error, className, disabled, ...props }, ref) => {
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
        {prefix && <span className="shrink-0 text-ink-400 [&>svg]:size-4">{prefix}</span>}
        <input
          ref={ref}
          disabled={disabled}
          className="w-full min-w-0 bg-transparent text-ink-900 placeholder:text-ink-400 outline-none disabled:cursor-not-allowed"
          {...props}
        />
        {suffix && <span className="shrink-0 text-ink-400 [&>svg]:size-4">{suffix}</span>}
      </div>
    );
  }
);
Input.displayName = "Input";

export interface FieldErrorProps {
  children: ReactNode;
}

export function FieldError({ children }: FieldErrorProps) {
  return (
    <p className="mt-1.5 flex items-center gap-1 text-xs text-danger-600">
      <TbX className="size-3.5 rounded-full bg-danger-50 p-0.5" />
      {children}
    </p>
  );
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaHTMLAttributes<HTMLTextAreaElement> & { error?: boolean }>(
  ({ className, error, ...props }, ref) => {
    return (
      <textarea
        ref={ref}
        className={cn(
          "w-full min-h-24 rounded-ctrl border bg-paper-0 px-3 py-2 text-sm text-ink-900 placeholder:text-ink-400 outline-none transition-colors duration-150",
          "focus:border-brand-500 focus:ring-1 focus:ring-brand-500",
          error ? "border-danger-600" : "border-paper-200",
          className
        )}
        {...props}
      />
    );
  }
);
Textarea.displayName = "Textarea";

export interface SearchInputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, "prefix"> {
  onClear?: () => void;
}

export function SearchInput({ className, defaultValue, onClear, ...props }: SearchInputProps) {
  const ref = useRef<HTMLInputElement>(null);
  const [value, setValue] = useState(defaultValue?.toString() ?? "");

  const clear = () => {
    setValue("");
    onClear?.();
    ref.current?.focus();
  };

  return (
    <div
      className={cn(
        "flex h-10 items-center gap-2 rounded-ctrl border border-paper-200 bg-paper-0 px-3 text-sm transition-colors duration-150",
        "focus-within:border-brand-500 focus-within:ring-1 focus-within:ring-brand-500",
        className
      )}
    >
      <TbSearch className="size-4 shrink-0 text-ink-400" />
      <input
        ref={ref}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Escape") clear();
        }}
        className="w-full min-w-0 bg-transparent text-ink-900 placeholder:text-ink-400 outline-none"
        placeholder="Search…"
        {...props}
      />
      {value && (
        <button
          type="button"
          aria-label="Clear search"
          onClick={clear}
          className="shrink-0 rounded-full p-0.5 text-ink-400 hover:bg-paper-100 hover:text-ink-700"
        >
          <TbX className="size-3.5" />
        </button>
      )}
    </div>
  );
}
