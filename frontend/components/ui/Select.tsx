"use client";

import { useEffect, useRef, useState } from "react";
import { TbCheck, TbChevronDown, TbSearch } from "react-icons/tb";
import { cn } from "@/lib/cn";

export interface SelectOption {
  value: string;
  label: string;
}

interface BaseProps {
  options: SelectOption[];
  value?: string;
  defaultValue?: string;
  onChange?: (value: string) => void;
  placeholder?: string;
  error?: boolean;
  disabled?: boolean;
  className?: string;
}

function useOutsideClose(ref: React.RefObject<HTMLElement | null>, onClose: () => void) {
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [ref, onClose]);
}

export function Select({
  options,
  value,
  defaultValue,
  onChange,
  placeholder = "Select…",
  error,
  disabled,
  className,
}: BaseProps) {
  const [open, setOpen] = useState(false);
  const [internal, setInternal] = useState(defaultValue);
  const ref = useRef<HTMLDivElement>(null);
  useOutsideClose(ref, () => setOpen(false));

  const current = value ?? internal;
  const selected = options.find((o) => o.value === current);

  const pick = (v: string) => {
    setInternal(v);
    onChange?.(v);
    setOpen(false);
  };

  return (
    <div ref={ref} className={cn("relative", className)}>
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen((o) => !o)}
        className={cn(
          "flex h-10 w-full items-center justify-between gap-2 rounded-ctrl border bg-paper-0 px-3 text-sm transition-colors duration-150",
          "focus:border-brand-500 focus:ring-1 focus:ring-brand-500 focus-visible:outline-none",
          error ? "border-danger-600" : "border-paper-200",
          disabled && "cursor-not-allowed opacity-50"
        )}
      >
        <span className={selected ? "text-ink-900" : "text-ink-400"}>
          {selected ? selected.label : placeholder}
        </span>
        <TbChevronDown className={cn("size-4 shrink-0 text-ink-400 transition-transform duration-150", open && "rotate-180")} />
      </button>
      {open && (
        <div className="absolute z-20 mt-1.5 w-full overflow-hidden rounded-card border border-paper-200 bg-paper-0 py-1 shadow-modal">
          <ul className="max-h-60 overflow-y-auto">
            {options.map((opt) => (
              <li key={opt.value}>
                <button
                  type="button"
                  onClick={() => pick(opt.value)}
                  className={cn(
                    "flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-sm hover:bg-paper-100",
                    opt.value === current && "bg-brand-50 text-brand-700"
                  )}
                >
                  {opt.label}
                  {opt.value === current && <TbCheck className="size-4" />}
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

export function Combobox({
  options,
  value,
  defaultValue,
  onChange,
  placeholder = "Search…",
  error,
  disabled,
  className,
}: BaseProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [internal, setInternal] = useState(defaultValue);
  const ref = useRef<HTMLDivElement>(null);
  useOutsideClose(ref, () => setOpen(false));

  const current = value ?? internal;
  const selected = options.find((o) => o.value === current);
  const filtered = options.filter((o) => o.label.toLowerCase().includes(query.toLowerCase()));

  const pick = (v: string) => {
    setInternal(v);
    onChange?.(v);
    setOpen(false);
    setQuery("");
  };

  return (
    <div ref={ref} className={cn("relative", className)}>
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen((o) => !o)}
        className={cn(
          "flex h-10 w-full items-center justify-between gap-2 rounded-ctrl border bg-paper-0 px-3 text-sm transition-colors duration-150",
          "focus:border-brand-500 focus:ring-1 focus:ring-brand-500 focus-visible:outline-none",
          error ? "border-danger-600" : "border-paper-200",
          disabled && "cursor-not-allowed opacity-50"
        )}
      >
        <span className={selected ? "text-ink-900" : "text-ink-400"}>
          {selected ? selected.label : placeholder}
        </span>
        <TbChevronDown className={cn("size-4 shrink-0 text-ink-400 transition-transform duration-150", open && "rotate-180")} />
      </button>
      {open && (
        <div className="absolute z-20 mt-1.5 w-full overflow-hidden rounded-card border border-paper-200 bg-paper-0 shadow-modal">
          <div className="flex items-center gap-2 border-b border-paper-200 px-3 py-2">
            <TbSearch className="size-4 shrink-0 text-ink-400" />
            <input
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Type to filter…"
              className="w-full min-w-0 bg-transparent text-sm text-ink-900 placeholder:text-ink-400 outline-none"
            />
          </div>
          <ul className="max-h-52 overflow-y-auto py-1">
            {filtered.length === 0 && (
              <li className="px-3 py-2 text-sm text-ink-400">No matches</li>
            )}
            {filtered.map((opt) => (
              <li key={opt.value}>
                <button
                  type="button"
                  onClick={() => pick(opt.value)}
                  className={cn(
                    "flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-sm hover:bg-paper-100",
                    opt.value === current && "bg-brand-50 text-brand-700"
                  )}
                >
                  {opt.label}
                  {opt.value === current && <TbCheck className="size-4" />}
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
