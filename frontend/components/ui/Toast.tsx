"use client";

import { createContext, useCallback, useContext, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { TbCircleCheck, TbAlertTriangle, TbInfoCircle, TbX } from "react-icons/tb";
import { cn } from "@/lib/cn";
import { useMounted } from "@/lib/useMounted";

export type ToastVariant = "field" | "danger" | "info";

export interface ToastItem {
  id: string;
  variant: ToastVariant;
  message: string;
  action?: { label: string; onClick: () => void };
}

interface ToastContextValue {
  toasts: ToastItem[];
  addToast: (toast: Omit<ToastItem, "id">) => void;
  dismiss: (id: string) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

const variantStyles: Record<ToastVariant, string> = {
  field: "border-brand-200",
  danger: "border-danger-600/30",
  info: "border-info-500/30",
};

const variantIcon: Record<ToastVariant, ReactNode> = {
  field: <TbCircleCheck className="size-5 shrink-0 text-field-500" />,
  danger: <TbAlertTriangle className="size-5 shrink-0 text-danger-600" />,
  info: <TbInfoCircle className="size-5 shrink-0 text-info-500" />,
};

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const mounted = useMounted();

  const dismiss = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const addToast = useCallback(
    (toast: Omit<ToastItem, "id">) => {
      const id = Math.random().toString(36).slice(2);
      setToasts((prev) => [...prev, { ...toast, id }]);
      if (toast.variant !== "danger") {
        setTimeout(() => dismiss(id), 5000);
      }
    },
    [dismiss]
  );

  return (
    <ToastContext.Provider value={{ toasts, addToast, dismiss }}>
      {children}
      {mounted &&
        createPortal(
          <div className="fixed bottom-4 right-4 z-[60] flex flex-col gap-2">
            {toasts.map((t) => (
              <div
                key={t.id}
                role="status"
                aria-live="polite"
                className={cn(
                  "flex w-80 items-start gap-2.5 rounded-card border bg-paper-0 p-3.5 shadow-modal",
                  variantStyles[t.variant]
                )}
              >
                {variantIcon[t.variant]}
                <p className="flex-1 text-sm text-ink-700">{t.message}</p>
                {t.action && (
                  <button
                    type="button"
                    onClick={t.action.onClick}
                    className="shrink-0 text-sm font-medium text-brand-600 hover:text-brand-700"
                  >
                    {t.action.label}
                  </button>
                )}
                <button
                  type="button"
                  aria-label="Dismiss"
                  onClick={() => dismiss(t.id)}
                  className="shrink-0 rounded-full p-0.5 text-ink-400 hover:bg-paper-100"
                >
                  <TbX className="size-3.5" />
                </button>
              </div>
            ))}
          </div>,
          document.body
        )}
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used within a ToastProvider");
  return ctx;
}
