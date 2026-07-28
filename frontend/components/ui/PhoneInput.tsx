"use client";

import { forwardRef, type ChangeEvent } from "react";
import { Input, type InputProps } from "@/components/ui/Input";

export type PhoneInputProps = Omit<InputProps, "type" | "prefix" | "onChange"> & {
  onChange?: (e: ChangeEvent<HTMLInputElement>) => void;
};

export const PhoneInput = forwardRef<HTMLInputElement, PhoneInputProps>(
  ({ onChange, ...props }, ref) => {
    const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
      e.target.value = e.target.value.replace(/\D/g, "").slice(0, 8);
      onChange?.(e);
    };

    return (
      <Input
        ref={ref}
        type="tel"
        inputMode="numeric"
        autoComplete="tel-national"
        placeholder="7612 3456"
        prefix={<span className="text-sm font-medium text-ink-700">+268</span>}
        onChange={handleChange}
        {...props}
      />
    );
  }
);
PhoneInput.displayName = "PhoneInput";
