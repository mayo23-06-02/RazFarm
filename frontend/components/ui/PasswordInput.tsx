"use client";

import { forwardRef, useState } from "react";
import { TbEye, TbEyeOff } from "react-icons/tb";
import { Input, type InputProps } from "@/components/ui/Input";

export type PasswordInputProps = Omit<InputProps, "type" | "suffix">;

export const PasswordInput = forwardRef<HTMLInputElement, PasswordInputProps>(
  ({ ...props }, ref) => {
    const [visible, setVisible] = useState(false);

    return (
      <Input
        ref={ref}
        type={visible ? "text" : "password"}
        autoComplete="current-password"
        suffix={
          <button
            type="button"
            aria-label={visible ? "Hide password" : "Show password"}
            aria-pressed={visible}
            tabIndex={-1}
            onClick={() => setVisible((v) => !v)}
            className="pointer-events-auto rounded-full p-0.5 text-ink-400 hover:text-ink-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2 focus-visible:ring-offset-paper-50"
          >
            {visible ? <TbEyeOff className="size-4" /> : <TbEye className="size-4" />}
          </button>
        }
        {...props}
      />
    );
  }
);
PasswordInput.displayName = "PasswordInput";
