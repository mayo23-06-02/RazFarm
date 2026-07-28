"use client";

import { useState, type ReactNode } from "react";
import { TbChevronDown, TbChevronUp, TbDotsVertical, TbSelector } from "react-icons/tb";
import { cn } from "@/lib/cn";
import { IconButton } from "./Button";
import { DropdownMenu, type DropdownMenuItem } from "./Popover";
import { EmptyState } from "./EmptyState";
import { TableSkeleton } from "./Skeleton";

export interface DataTableColumn<T> {
  key: string;
  header: string;
  render: (row: T) => ReactNode;
  align?: "left" | "right";
  sortable?: boolean;
  sortValue?: (row: T) => string | number;
  width?: string;
  stickyFirstCol?: boolean;
}

export interface DataTableProps<T> {
  columns: DataTableColumn<T>[];
  data: T[];
  rowKey: (row: T) => string;
  sortable?: boolean;
  selectable?: boolean;
  compact?: boolean;
  rowActions?: (row: T) => DropdownMenuItem[];
  onRowClick?: (row: T) => void;
  stickyFirstCol?: boolean;
  loading?: boolean;
  emptyTitle?: string;
  emptyBody?: string;
  className?: string;
}

export function RowActions({ items }: { items: DropdownMenuItem[] }) {
  return (
    <DropdownMenu
      align="end"
      trigger={<IconButton label="Row actions" icon={<TbDotsVertical />} size="sm" />}
      items={items}
    />
  );
}

export function DataTable<T>({
  columns,
  data,
  rowKey,
  sortable,
  selectable,
  compact,
  rowActions,
  onRowClick,
  stickyFirstCol,
  loading,
  emptyTitle = "No records yet",
  emptyBody = "Data captured for this view will appear here.",
  className,
}: DataTableProps<T>) {
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [selected, setSelected] = useState<Set<string>>(new Set());

  if (loading) return <TableSkeleton cols={columns.length} />;

  let rows = data;
  if (sortable && sortKey) {
    const col = columns.find((c) => c.key === sortKey);
    if (col?.sortValue) {
      rows = [...data].sort((a, b) => {
        const av = col.sortValue!(a);
        const bv = col.sortValue!(b);
        const cmp = av < bv ? -1 : av > bv ? 1 : 0;
        return sortDir === "asc" ? cmp : -cmp;
      });
    }
  }

  const toggleSort = (key: string) => {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
  };

  const toggleRow = (key: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const allSelected = data.length > 0 && selected.size === data.length;

  if (data.length === 0) {
    return (
      <div className={cn("rounded-card border border-paper-200 bg-paper-0", className)}>
        <EmptyState title={emptyTitle} body={emptyBody} />
      </div>
    );
  }

  return (
    <div className={cn("overflow-x-auto rounded-card border border-paper-200 bg-paper-0", className)}>
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr className="sticky top-0 z-10 bg-paper-50">
            {selectable && (
              <th className="w-10 px-4 py-3">
                <input
                  type="checkbox"
                  checked={allSelected}
                  onChange={() =>
                    setSelected(allSelected ? new Set() : new Set(data.map((d) => rowKey(d))))
                  }
                  className="size-4 rounded border-paper-300"
                />
              </th>
            )}
            {columns.map((col, i) => (
              <th
                key={col.key}
                style={{ width: col.width }}
                className={cn(
                  "px-4 py-3 text-[12px] font-medium uppercase tracking-wide text-ink-400",
                  col.align === "right" ? "text-right" : "text-left",
                  stickyFirstCol && i === 0 && "sticky left-0 bg-paper-50"
                )}
              >
                {sortable && col.sortable ? (
                  <button
                    type="button"
                    onClick={() => toggleSort(col.key)}
                    className={cn("inline-flex items-center gap-1", col.align === "right" && "flex-row-reverse")}
                  >
                    {col.header}
                    {sortKey === col.key ? (
                      sortDir === "asc" ? (
                        <TbChevronUp className="size-3.5" />
                      ) : (
                        <TbChevronDown className="size-3.5" />
                      )
                    ) : (
                      <TbSelector className="size-3.5 opacity-50" />
                    )}
                  </button>
                ) : (
                  col.header
                )}
              </th>
            ))}
            {rowActions && <th className="w-10 px-4 py-3" />}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => {
            const key = rowKey(row);
            const isSelected = selected.has(key);
            return (
              <tr
                key={key}
                onClick={() => onRowClick?.(row)}
                className={cn(
                  "border-b border-paper-100 last:border-0 transition-colors duration-150",
                  onRowClick && "cursor-pointer hover:bg-paper-50",
                  isSelected && "bg-brand-50/50"
                )}
              >
                {selectable && (
                  <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => toggleRow(key)}
                      className="size-4 rounded border-paper-300"
                    />
                  </td>
                )}
                {columns.map((col, i) => (
                  <td
                    key={col.key}
                    className={cn(
                      compact ? "h-10" : "h-12",
                      "px-4 text-ink-700",
                      col.align === "right" && "text-right tabular-nums",
                      stickyFirstCol && i === 0 && "sticky left-0 bg-inherit font-medium text-ink-900"
                    )}
                  >
                    {col.render(row)}
                  </td>
                ))}
                {rowActions && (
                  <td className="px-4 py-2 text-right" onClick={(e) => e.stopPropagation()}>
                    <RowActions items={rowActions(row)} />
                  </td>
                )}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
