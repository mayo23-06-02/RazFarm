import type { ReactNode } from "react";
import { cn } from "@/lib/cn";
import { FieldError } from "./Input";

export interface FormRowProps {
  label: string;
  required?: boolean;
  hint?: string;
  error?: string;
  children: ReactNode;
  layout?: "stacked" | "settings";
  className?: string;
}

export function FormRow({ label, required, hint, error, children, layout = "stacked", className }: FormRowProps) {
  return (
    <div
      className={cn(
        layout === "settings" ? "grid gap-1.5 md:grid-cols-[200px,1fr] md:items-start md:gap-4" : "flex flex-col gap-1.5",
        className
      )}
    >
      <label className="pt-2.5 text-xs font-medium text-ink-700 md:pt-2.5">
        {label}
        {required && <span className="ml-0.5 text-danger-600">*</span>}
      </label>
      <div>
        {children}
        {hint && !error && <p className="mt-1.5 text-xs text-ink-400">{hint}</p>}
        {error && <FieldError>{error}</FieldError>}
      </div>
    </div>
  );
}
