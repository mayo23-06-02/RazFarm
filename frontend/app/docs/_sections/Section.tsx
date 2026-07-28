import type { ReactNode } from "react";

export function Section({
  id,
  title,
  description,
  children,
}: {
  id: string;
  title: string;
  description?: string;
  children: ReactNode;
}) {
  return (
    <section id={id} className="scroll-mt-6 border-t border-paper-200 pt-10 first:border-0 first:pt-0">
      <h2 className="font-display text-2xl font-bold text-ink-900">{title}</h2>
      {description && <p className="mt-1.5 max-w-2xl text-sm text-ink-500">{description}</p>}
      <div className="mt-6 space-y-8">{children}</div>
    </section>
  );
}

export function Swatch({
  title,
  items,
}: {
  title: string;
  items: { name: string; hex: string; className: string }[];
}) {
  return (
    <div>
      <p className="mb-3 text-sm font-medium text-ink-700">{title}</p>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-5">
        {items.map((it) => (
          <div key={it.name} className="overflow-hidden rounded-ctrl border border-paper-200">
            <div className={`h-14 ${it.className}`} />
            <div className="bg-paper-0 px-2.5 py-2">
              <p className="text-xs font-medium text-ink-900">{it.name}</p>
              <p className="font-mono text-[11px] text-ink-400">{it.hex}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function Demo({
  label,
  children,
  className,
}: {
  label?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={`rounded-card border border-paper-200 bg-paper-50 p-6 ${className ?? ""}`}>
      {label && <p className="mb-3 text-[11px] font-semibold uppercase tracking-wide text-ink-400">{label}</p>}
      {children}
    </div>
  );
}
