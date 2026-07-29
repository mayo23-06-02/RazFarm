"use client";

import { useMemo, useState } from "react";
import { TbAlertTriangle, TbArrowDownRight, TbArrowUpRight, TbAdjustments, TbEdit, TbPackage, TbPlus } from "react-icons/tb";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { DataTable, type DataTableColumn } from "@/components/ui/DataTable";
import { KpiRow, StatCard } from "@/components/ui/StatCard";
import { createClient } from "@/lib/supabase/client";
import { ItemFormDrawer } from "./ItemFormDrawer";
import { ReceiveStockDrawer, IssueStockDrawer, AdjustStockDrawer } from "./StockActionDrawers";
import type { Database, InventoryItemCategory } from "@/lib/database.types";

type ItemRow = Database["public"]["Tables"]["inventory_items"]["Row"];

interface AccountOption {
  id: string;
  code: string;
  name: string;
  type: string;
}

const CATEGORY_LABEL: Record<InventoryItemCategory, string> = {
  fertilizer: "Fertilizer",
  chemical: "Chemical",
  seed_cane: "Seed cane",
  other: "Other",
};

function money(v: number) {
  return v.toLocaleString("en-SZ", { minimumFractionDigits: 2 });
}

export interface ItemsSectionProps {
  tenantId: string;
  initialItems: ItemRow[];
  suppliers: { id: string; name: string }[];
  accounts: AccountOption[];
  canManage: boolean;
}

export function ItemsSection({ tenantId, initialItems, suppliers, accounts, canManage }: ItemsSectionProps) {
  const [items, setItems] = useState(initialItems);
  const [addOpen, setAddOpen] = useState(false);
  const [editing, setEditing] = useState<ItemRow | null>(null);
  const [receiveTarget, setReceiveTarget] = useState<ItemRow | null>(null);
  const [issueTarget, setIssueTarget] = useState<ItemRow | null>(null);
  const [adjustTarget, setAdjustTarget] = useState<ItemRow | null>(null);

  const refresh = async () => {
    const supabase = createClient();
    const { data } = await supabase.from("inventory_items").select("*").eq("tenant_id", tenantId).order("name", { ascending: true });
    setItems(data ?? []);
  };

  const totals = useMemo(() => {
    const value = items.reduce((s, i) => s + i.quantity_on_hand * i.average_cost, 0);
    const lowStock = items.filter((i) => i.is_active && i.quantity_on_hand <= i.reorder_level).length;
    return { value, lowStock, count: items.length };
  }, [items]);

  const columns: DataTableColumn<ItemRow>[] = [
    { key: "sku", header: "SKU", render: (i) => <span className="font-mono text-xs">{i.sku}</span> },
    { key: "name", header: "Name", render: (i) => i.name, sortable: true, sortValue: (i) => i.name },
    { key: "category", header: "Category", render: (i) => <Badge variant="brand">{CATEGORY_LABEL[i.category]}</Badge> },
    {
      key: "onHand",
      header: "On hand",
      align: "right",
      render: (i) => (
        <span className="inline-flex items-center gap-1.5">
          {i.is_active && i.quantity_on_hand <= i.reorder_level && (
            <TbAlertTriangle className="size-3.5 text-harvest-500" title="At or below reorder level" />
          )}
          <span className="tabular-nums">
            {i.quantity_on_hand} {i.unit}
          </span>
        </span>
      ),
    },
    { key: "avgCost", header: "Avg. cost", align: "right", render: (i) => money(i.average_cost) },
    { key: "value", header: "Value", align: "right", render: (i) => money(i.quantity_on_hand * i.average_cost) },
    { key: "status", header: "Status", render: (i) => (!i.is_active ? <Badge variant="neutral">Inactive</Badge> : null) },
  ];

  return (
    <div className="flex flex-col gap-5">
      <KpiRow>
        <StatCard label="Items tracked" value={totals.count} icon={<TbPackage />} />
        <StatCard label="Inventory value" value={totals.value} formatValue={money} />
        <StatCard label="At or below reorder level" value={totals.lowStock} />
      </KpiRow>

      {canManage && (
        <div className="flex justify-end">
          <Button icon={<TbPlus />} onClick={() => setAddOpen(true)}>
            Add item
          </Button>
        </div>
      )}

      <DataTable
        columns={columns}
        data={items}
        rowKey={(i) => i.id}
        emptyTitle="No inventory items yet"
        emptyBody={canManage ? "Add fertilizer, chemicals, seed cane or other inputs to start tracking stock." : "No inventory items have been set up yet."}
        rowActions={
          canManage
            ? (i) => [
                { label: "Receive stock", icon: <TbArrowDownRight />, onSelect: () => setReceiveTarget(i) },
                { label: "Issue stock", icon: <TbArrowUpRight />, onSelect: () => setIssueTarget(i) },
                { label: "Adjust stock", icon: <TbAdjustments />, onSelect: () => setAdjustTarget(i) },
                { label: "Edit item", icon: <TbEdit />, onSelect: () => setEditing(i) },
              ]
            : undefined
        }
      />

      {canManage && (
        <>
          <ItemFormDrawer tenantId={tenantId} open={addOpen} onOpenChange={setAddOpen} suppliers={suppliers} onSaved={refresh} />
          <ItemFormDrawer tenantId={tenantId} open={!!editing} onOpenChange={(v) => !v && setEditing(null)} item={editing} suppliers={suppliers} onSaved={refresh} />
          <ReceiveStockDrawer item={receiveTarget} onOpenChange={(v) => !v && setReceiveTarget(null)} accounts={accounts} onSaved={refresh} />
          <IssueStockDrawer item={issueTarget} onOpenChange={(v) => !v && setIssueTarget(null)} accounts={accounts} onSaved={refresh} />
          <AdjustStockDrawer item={adjustTarget} onOpenChange={(v) => !v && setAdjustTarget(null)} onSaved={refresh} />
        </>
      )}
    </div>
  );
}
