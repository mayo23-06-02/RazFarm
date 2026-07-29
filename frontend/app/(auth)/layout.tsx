import Link from "next/link";
import type { ReactNode } from "react";
import { ToastProvider } from "@/components/ui/Toast";

function CaneLeafPattern() {
  return (
    <svg className="pointer-events-none absolute inset-0 h-full w-full" aria-hidden="true">
      <defs>
        <pattern
          id="cane-leaf"
          width="120"
          height="120"
          patternUnits="userSpaceOnUse"
          patternTransform="rotate(12)"
        >
          <path
            d="M0 60 Q30 20 60 60 Q90 100 120 60"
            fill="none"
            stroke="white"
            strokeWidth="2"
          />
          <path
            d="M0 110 Q30 70 60 110 Q90 150 120 110"
            fill="none"
            stroke="white"
            strokeWidth="1.5"
          />
          <path
            d="M0 10 Q30 -30 60 10 Q90 50 120 10"
            fill="none"
            stroke="white"
            strokeWidth="1.5"
          />
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill="url(#cane-leaf)" opacity="0.06" />
    </svg>
  );
}

function LogoMark({ dark }: { dark?: boolean }) {
  return (
    <Link
      href="/login"
      className={`inline-flex items-center gap-2 font-display text-base font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2 rounded-ctrl ${
        dark ? "text-paper-0 focus-visible:ring-offset-brand-900" : "text-ink-900 focus-visible:ring-offset-paper-50"
      }`}
    >
      <span
        className={`flex size-8 shrink-0 items-center justify-center rounded-ctrl font-display text-sm font-bold ${
          dark ? "bg-paper-0 text-brand-700" : "bg-brand-500 text-white"
        }`}
      >
        C
      </span>
      Cane &amp; Ledger
    </Link>
  );
}

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <ToastProvider>
      <div className="flex min-h-screen flex-col lg:flex-row">
        <aside className="relative hidden overflow-hidden bg-brand-900 lg:flex lg:w-[45%] lg:flex-col lg:p-12">
          <CaneLeafPattern />
          <div className="relative z-10 flex flex-1 flex-col">
            <LogoMark dark />
            <div className="flex flex-1 flex-col items-center justify-center text-center">
              <p className="font-display text-5xl font-bold tabular-nums text-paper-0">
                11,000+ tonnes
              </p>
              <p className="mt-3 max-w-[280px] text-sm text-brand-200">
                Cane tracked per season, from field to mill, across every association on the
                platform.
              </p>
            </div>
          </div>
        </aside>

        <main className="flex flex-1 flex-col items-center justify-center bg-paper-50 px-6 py-12">
          <div className="mb-8 lg:hidden">
            <LogoMark />
          </div>
          <div className="w-full max-w-[420px]">{children}</div>
        </main>
      </div>
    </ToastProvider>
  );
}
