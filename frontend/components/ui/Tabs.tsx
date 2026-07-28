"use client";

import { useState } from "react";
import { cn } from "@/lib/cn";

export interface TabItem {
  value: string;
  label: string;
  badge?: number;
}

export interface TabsProps {
  items: TabItem[];
  value?: string;
  defaultValue?: string;
  onChange?: (value: string) => void;
  className?: string;
}

export function Tabs({ items, value, defaultValue, onChange, className }: TabsProps) {
  const [internal, setInternal] = useState(defaultValue ?? items[0]?.value);
  const active = value ?? internal;

  return (
    <div className={cn("flex items-center gap-5 border-b border-paper-200", className)} role="tablist">
      {items.map((item) => {
        const isActive = item.value === active;
        return (
          <button
            key={item.value}
            type="button"
            role="tab"
            aria-selected={isActive}
            onClick={() => {
              setInternal(item.value);
              onChange?.(item.value);
            }}
            className={cn(
              "flex items-center gap-1.5 border-b-2 pb-2.5 pt-1 text-sm font-medium transition-colors duration-150",
              isActive ? "border-brand-500 text-brand-600" : "border-transparent text-ink-500 hover:text-ink-700"
            )}
          >
            {item.label}
            {item.badge !== undefined && (
              <span className="rounded-pill bg-paper-100 px-1.5 py-0.5 text-xs text-ink-500">{item.badge}</span>
            )}
          </button>
        );
      })}
    </div>
  );
}
