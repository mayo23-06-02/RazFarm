import { TbAlertTriangle, TbPackage } from "react-icons/tb";
import { Badge } from "@/components/ui/Badge";
import { DataTable, type DataTableColumn } from "@/components/ui/DataTable";
import { EmptyState } from "@/components/ui/EmptyState";
import type { Database, InventoryItemCategory } from "@/lib/database.types";

type StockLevelRow = Database["public"]["Functions"]["list_inventory_stock_levels"]["Returns"][number];

const CATEGORY_LABEL: Record<InventoryItemCategory, string> = {
  fertilizer: "Fertilizer",
  chemical: "Chemical",
  seed_cane: "Seed cane",
  equipment: "Equipment",
  vehicle: "Vehicle",
  plant_equipment: "Plant equipment",
  other: "Other",
};

export interface MemberStockLevelsSectionProps {
  rows: StockLevelRow[];
}

// Read-only, no-pricing stock view for the plain 'member' role — quantities
// and reorder status only, sourced from list_inventory_stock_levels() (0012),
// which deliberately omits average_cost/value. Full cost data stays visible
// only to chairman/treasurer/accountant/supervisor via the Items page.
export function MemberStockLevelsSection({ rows }: MemberStockLevelsSectionProps) {
  const columns: DataTableColumn<StockLevelRow>[] = [
    { key: "sku", header: "SKU", render: (r) => <span className="font-mono text-xs">{r.sku}</span> },
    { key: "name", header: "Name", render: (r) => r.name },
    { key: "category", header: "Category", render: (r) => <Badge variant="brand">{CATEGORY_LABEL[r.category]}</Badge> },
    { key: "location", header: "Location", render: (r) => r.storage_location ?? <span className="text-ink-300">—</span> },
    {
      key: "onHand",
      header: "On hand",
      align: "right",
      render: (r) => (
        <span className="inline-flex items-center gap-1.5">
          {r.is_low_stock && <TbAlertTriangle className="size-3.5 text-harvest-500" title="Running low" />}
          <span className="tabular-nums">
            {r.quantity_on_hand} {r.unit}
          </span>
        </span>
      ),
    },
  ];

  return (
    <div className="flex flex-col gap-5">
      <EmptyState
        compact
        title="Stock levels"
        body="You're seeing quantities on hand only — pricing and inventory value are visible to committee and accountant/supervisor roles."
        icon={<TbPackage />}
      />
      <DataTable columns={columns} data={rows.filter((r) => r.is_active)} rowKey={(r) => r.id} emptyTitle="No stock recorded yet" emptyBody="Nothing has been added to inventory yet." />
    </div>
  );
}
