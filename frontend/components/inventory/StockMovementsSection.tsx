"use client";

import { useMemo, useState } from "react";
import { TbArrowDownRight, TbArrowUpRight, TbAdjustments } from "react-icons/tb";
import { Badge } from "@/components/ui/Badge";
import { Combobox } from "@/components/ui/Select";
import { DataTable, type DataTableColumn } from "@/components/ui/DataTable";
import { formatDate } from "@/lib/formatDate";
import type { Database, StockMovementType } from "@/lib/database.types";

type MovementRow = Database["public"]["Tables"]["stock_movements"]["Row"];

interface ItemOption {
  id: string;
  sku: string;
  name: string;
  unit: string;
}

const TYPE_LABEL: Record<StockMovementType, string> = {
  receipt: "Receipt",
  issue: "Issue",
  adjustment: "Adjustment",
};

const TYPE_ICON: Record<StockMovementType, React.ReactNode> = {
  receipt: <TbArrowDownRight />,
  issue: <TbArrowUpRight />,
  adjustment: <TbAdjustments />,
};

function money(v: number) {
  return v.toLocaleString("en-SZ", { minimumFractionDigits: 2 });
}

export interface StockMovementsSectionProps {
  movements: MovementRow[];
  items: ItemOption[];
}

export function StockMovementsSection({ movements, items }: StockMovementsSectionProps) {
  const [itemFilter, setItemFilter] = useState("");
  const itemMap = useMemo(() => new Map(items.map((i) => [i.id, i])), [items]);

  const filtered = itemFilter ? movements.filter((m) => m.item_id === itemFilter) : movements;

  const columns: DataTableColumn<MovementRow>[] = [
    { key: "date", header: "Date", render: (m) => formatDate(m.created_at), sortable: true, sortValue: (m) => m.created_at },
    {
      key: "item",
      header: "Item",
      render: (m) => {
        const item = itemMap.get(m.item_id);
        return item ? `${item.sku} — ${item.name}` : "—";
      },
    },
    {
      key: "type",
      header: "Type",
      render: (m) => (
        <Badge variant={m.movement_type === "receipt" ? "success" : m.movement_type === "issue" ? "neutral" : "warning"} icon={TYPE_ICON[m.movement_type]}>
          {TYPE_LABEL[m.movement_type]}
        </Badge>
      ),
    },
    {
      key: "quantity",
      header: "Quantity",
      align: "right",
      render: (m) => (
        <span className={m.quantity_delta >= 0 ? "text-field-500" : "text-danger-600"}>
          {m.quantity_delta >= 0 ? "+" : ""}
          {m.quantity_delta} {itemMap.get(m.item_id)?.unit ?? ""}
        </span>
      ),
    },
    { key: "unitCost", header: "Unit cost", align: "right", render: (m) => money(m.unit_cost) },
    { key: "reference", header: "Reference", render: (m) => m.reference || "—" },
  ];

  return (
    <div className="flex flex-col gap-4">
      <div className="max-w-xs">
        <Combobox
          options={items.map((i) => ({ value: i.id, label: `${i.sku} — ${i.name}` }))}
          value={itemFilter}
          onChange={setItemFilter}
          placeholder="Filter by item…"
        />
      </div>
      <DataTable
        columns={columns}
        data={filtered}
        rowKey={(m) => m.id}
        emptyTitle="No stock movements yet"
        emptyBody="Every stock receipt, issue and adjustment will appear here."
      />
    </div>
  );
}
