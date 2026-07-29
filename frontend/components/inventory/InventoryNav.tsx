"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/cn";

const ITEMS = [
  { href: "/inventory/items", label: "Stock items" },
  { href: "/inventory/movements", label: "Stock ledger" },
  { href: "/inventory/suppliers", label: "Suppliers" },
  { href: "/inventory/purchase-orders", label: "Purchase orders" },
  { href: "/inventory/bills", label: "Bills" },
];

export function InventoryNav() {
  const pathname = usePathname();

  return (
    <div className="flex items-center gap-5 border-b border-paper-200" role="tablist">
      {ITEMS.map((item) => {
        const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
        return (
          <Link
            key={item.href}
            href={item.href}
            role="tab"
            aria-selected={active}
            className={cn(
              "border-b-2 pb-2.5 pt-1 text-sm font-medium transition-colors duration-150",
              active ? "border-brand-500 text-brand-600" : "border-transparent text-ink-500 hover:text-ink-700"
            )}
          >
            {item.label}
          </Link>
        );
      })}
    </div>
  );
}
