"use client";

import { TbChevronLeft, TbChevronRight } from "react-icons/tb";
import { cn } from "@/lib/cn";

export interface PaginationProps {
  page: number;
  totalPages: number;
  totalItems: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  className?: string;
}

function pageList(page: number, totalPages: number) {
  const pages: (number | "…")[] = [];
  const add = (p: number | "…") => pages.push(p);
  add(1);
  if (page > 3) add("…");
  for (let p = Math.max(2, page - 1); p <= Math.min(totalPages - 1, page + 1); p++) add(p);
  if (page < totalPages - 2) add("…");
  if (totalPages > 1) add(totalPages);
  return pages;
}

export function Pagination({ page, totalPages, totalItems, pageSize, onPageChange, className }: PaginationProps) {
  const from = (page - 1) * pageSize + 1;
  const to = Math.min(totalItems, page * pageSize);

  return (
    <div className={cn("flex items-center justify-between gap-4 text-sm", className)}>
      <span className="text-ink-500">
        Showing {from}–{to} of {totalItems}
      </span>
      <div className="flex items-center gap-1">
        <button
          type="button"
          disabled={page <= 1}
          onClick={() => onPageChange(page - 1)}
          className="flex size-8 items-center justify-center rounded-ctrl text-ink-500 hover:bg-paper-100 disabled:opacity-40"
          aria-label="Previous page"
        >
          <TbChevronLeft className="size-4" />
        </button>
        {pageList(page, totalPages).map((p, i) =>
          p === "…" ? (
            <span key={`e-${i}`} className="px-1 text-ink-400">
              …
            </span>
          ) : (
            <button
              key={p}
              type="button"
              onClick={() => onPageChange(p)}
              className={cn(
                "flex size-8 items-center justify-center rounded-ctrl font-medium",
                p === page ? "bg-brand-500 text-white" : "text-ink-700 hover:bg-paper-100"
              )}
            >
              {p}
            </button>
          )
        )}
        <button
          type="button"
          disabled={page >= totalPages}
          onClick={() => onPageChange(page + 1)}
          className="flex size-8 items-center justify-center rounded-ctrl text-ink-500 hover:bg-paper-100 disabled:opacity-40"
          aria-label="Next page"
        >
          <TbChevronRight className="size-4" />
        </button>
      </div>
    </div>
  );
}
