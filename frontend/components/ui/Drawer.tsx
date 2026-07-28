"use client";

import { useCallback, useEffect, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { TbX } from "react-icons/tb";
import { cn } from "@/lib/cn";
import { useMounted } from "@/lib/useMounted";

export interface DrawerProps {
  trigger?: ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  side?: "right" | "left";
  width?: number;
  title: string;
  children: ReactNode;
}

export function Drawer({ trigger, open, onOpenChange, side = "right", width = 480, title, children }: DrawerProps) {
  const [internalOpen, setInternalOpen] = useState(false);
  const mounted = useMounted();
  const isOpen = open ?? internalOpen;

  const setOpen = useCallback(
    (v: boolean) => {
      setInternalOpen(v);
      onOpenChange?.(v);
    },
    [onOpenChange]
  );

  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [isOpen, setOpen]);

  return (
    <>
      {trigger && <span onClick={() => setOpen(true)}>{trigger}</span>}
      {mounted &&
        createPortal(
          <div
            className={cn(
              "fixed inset-0 z-50 transition-opacity duration-150",
              isOpen ? "pointer-events-auto opacity-100" : "pointer-events-none opacity-0"
            )}
          >
            <div className="absolute inset-0 bg-ink-900/40" onClick={() => setOpen(false)} aria-hidden />
            <div
              role="dialog"
              aria-modal
              aria-label={title}
              style={{ width }}
              className={cn(
                "absolute top-0 h-full max-w-full bg-paper-0 shadow-modal transition-transform duration-200",
                side === "right" ? "right-0" : "left-0",
                isOpen ? "translate-x-0" : side === "right" ? "translate-x-full" : "-translate-x-full"
              )}
            >
              <div className="flex items-center justify-between border-b border-paper-200 px-5 py-4">
                <h2 className="font-display text-[20px] font-semibold text-ink-900">{title}</h2>
                <button
                  type="button"
                  aria-label="Close"
                  onClick={() => setOpen(false)}
                  className="rounded-ctrl p-1.5 text-ink-500 hover:bg-paper-100"
                >
                  <TbX className="size-4" />
                </button>
              </div>
              <div className="h-[calc(100%-65px)] overflow-y-auto px-5 py-5">{children}</div>
            </div>
          </div>,
          document.body
        )}
    </>
  );
}
