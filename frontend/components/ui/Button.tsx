"use client";

import { forwardRef, useState, type ButtonHTMLAttributes, type ReactNode } from "react";
import { TbLoader2 } from "react-icons/tb";
import { cn } from "@/lib/cn";

export type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";
export type ButtonSize = "sm" | "md" | "lg";

const variantClasses: Record<ButtonVariant, string> = {
  primary: "bg-brand-500 text-white hover:bg-brand-400 active:bg-brand-600",
  secondary:
    "bg-paper-0 border border-paper-200 text-ink-700 hover:border-brand-300 hover:text-brand-600",
  ghost: "text-ink-500 hover:bg-paper-100 hover:text-ink-700",
  danger: "bg-danger-600 text-white hover:bg-danger-600/90",
};

const sizeClasses: Record<ButtonSize, string> = {
  sm: "h-9 px-3 text-[13px]",
  md: "h-10 px-4 text-sm",
  lg: "h-11 px-5 text-sm",
};

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  icon?: ReactNode;
  iconRight?: ReactNode;
  loading?: boolean;
  fullWidth?: boolean;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      variant = "primary",
      size = "md",
      icon,
      iconRight,
      loading,
      fullWidth,
      disabled,
      className,
      children,
      ...props
    },
    ref
  ) => {
    return (
      <button
        ref={ref}
        disabled={disabled || loading}
        className={cn(
          "rounded-ctrl font-medium inline-flex items-center justify-center gap-2 transition-colors duration-150",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2 focus-visible:ring-offset-paper-50",
          "disabled:opacity-50 disabled:cursor-not-allowed",
          variantClasses[variant],
          sizeClasses[size],
          fullWidth && "w-full",
          className
        )}
        {...props}
      >
        {loading ? (
          <TbLoader2 className="animate-spin" size={16} />
        ) : (
          icon && <span className="shrink-0 [&>svg]:size-4">{icon}</span>
        )}
        {children && <span>{children}</span>}
        {!loading && iconRight && <span className="shrink-0 [&>svg]:size-4">{iconRight}</span>}
      </button>
    );
  }
);
Button.displayName = "Button";

export interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Extract<ButtonVariant, "ghost" | "secondary">;
  size?: ButtonSize;
  label: string;
  icon: ReactNode;
}

const iconButtonSize: Record<ButtonSize, string> = {
  sm: "size-9",
  md: "size-10",
  lg: "size-11",
};

export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(
  ({ variant = "ghost", size = "md", label, icon, className, ...props }, ref) => {
    return (
      <button
        ref={ref}
        aria-label={label}
        title={label}
        className={cn(
          "rounded-ctrl inline-flex items-center justify-center transition-colors duration-150 shrink-0",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2 focus-visible:ring-offset-paper-50",
          "disabled:opacity-50 disabled:cursor-not-allowed [&>svg]:size-4",
          variant === "ghost"
            ? "text-ink-500 hover:bg-paper-100 hover:text-ink-700"
            : "bg-paper-0 border border-paper-200 text-ink-700 hover:border-brand-300 hover:text-brand-600",
          iconButtonSize[size],
          className
        )}
        {...props}
      >
        {icon}
      </button>
    );
  }
);
IconButton.displayName = "IconButton";

export interface ButtonGroupOption {
  value: string;
  label: string;
}

export interface ButtonGroupProps {
  options: ButtonGroupOption[];
  value?: string;
  defaultValue?: string;
  onChange?: (value: string) => void;
  size?: Extract<ButtonSize, "sm" | "md">;
  className?: string;
}

export function ButtonGroup({
  options,
  value,
  defaultValue,
  onChange,
  size = "sm",
  className,
}: ButtonGroupProps) {
  const [internal, setInternal] = useState(defaultValue ?? options[0]?.value);
  const active = value ?? internal;

  const handleClick = (v: string) => {
    setInternal(v);
    onChange?.(v);
  };

  return (
    <div
      role="group"
      className={cn(
        "inline-flex items-center rounded-ctrl border border-paper-200 bg-paper-0 p-0.5",
        className
      )}
    >
      {options.map((opt) => {
        const isActive = opt.value === active;
        return (
          <button
            key={opt.value}
            type="button"
            onClick={() => handleClick(opt.value)}
            className={cn(
              "rounded-[7px] font-medium transition-colors duration-150",
              size === "sm" ? "h-8 px-3 text-[13px]" : "h-9 px-3.5 text-sm",
              isActive ? "bg-brand-50 text-brand-700" : "text-ink-500 hover:text-ink-700"
            )}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}
