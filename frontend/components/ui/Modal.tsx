"use client";

import { useCallback, useEffect, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { TbX } from "react-icons/tb";
import { cn } from "@/lib/cn";
import { useMounted } from "@/lib/useMounted";
import { Button } from "./Button";

const maxWidths = {
  md: "max-w-md",
  lg: "max-w-lg",
  "2xl": "max-w-2xl",
};

export interface ModalProps {
  trigger?: ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  size?: keyof typeof maxWidths;
  title: string;
  footer?: ReactNode;
  children: ReactNode;
}

export function Modal({ trigger, open, onOpenChange, size = "md", title, footer, children }: ModalProps) {
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
        isOpen &&
        createPortal(
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div
              className="absolute inset-0 bg-ink-900/40"
              onClick={() => setOpen(false)}
              aria-hidden
            />
            <div
              role="dialog"
              aria-modal
              aria-label={title}
              className={cn(
                "relative w-full rounded-card border border-paper-200 bg-paper-0 shadow-modal",
                maxWidths[size]
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
              <div className="px-5 py-5">{children}</div>
              {footer && (
                <div className="flex items-center justify-end gap-2 border-t border-paper-200 px-5 py-4">
                  {footer}
                </div>
              )}
            </div>
          </div>,
          document.body
        )}
    </>
  );
}

export interface ConfirmDialogProps {
  trigger: ReactNode;
  title: string;
  body: ReactNode;
  tone?: "danger" | "primary";
  confirmLabel?: string;
  requireKeyword?: string;
  onConfirm: () => void;
}

export function ConfirmDialog({
  trigger,
  title,
  body,
  tone = "danger",
  confirmLabel = "Confirm",
  requireKeyword,
  onConfirm,
}: ConfirmDialogProps) {
  const [open, setOpen] = useState(false);
  const [typed, setTyped] = useState("");
  const canConfirm = !requireKeyword || typed === requireKeyword;

  return (
    <Modal
      trigger={trigger}
      open={open}
      onOpenChange={(v) => {
        setOpen(v);
        if (!v) setTyped("");
      }}
      title={title}
      footer={
        <>
          <Button variant="ghost" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button
            variant={tone === "danger" ? "danger" : "primary"}
            disabled={!canConfirm}
            onClick={() => {
              onConfirm();
              setOpen(false);
            }}
          >
            {confirmLabel}
          </Button>
        </>
      }
    >
      <div className="text-sm text-ink-700">{body}</div>
      {requireKeyword && (
        <div className="mt-4">
          <label className="text-xs font-medium text-ink-700">
            Type <span className="font-mono text-danger-600">{requireKeyword}</span> to confirm
          </label>
          <input
            value={typed}
            onChange={(e) => setTyped(e.target.value)}
            className="mt-1.5 h-10 w-full rounded-ctrl border border-paper-200 bg-paper-0 px-3 text-sm outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500"
          />
        </div>
      )}
    </Modal>
  );
}
