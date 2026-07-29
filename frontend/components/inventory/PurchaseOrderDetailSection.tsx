"use client";

import { useMemo, useState } from "react";
import { TbPlus, TbTrash, TbTruckDelivery } from "react-icons/tb";
import { PageHeader } from "@/components/ui/PageHeader";
import { Badge, type BadgeVariant } from "@/components/ui/Badge";
import { Input, Textarea, FieldError } from "@/components/ui/Input";
import { DatePicker } from "@/components/ui/DatePicker";
import { Combobox } from "@/components/ui/Select";
import { MoneyInput } from "@/components/ui/MoneyInput";
import { Button } from "@/components/ui/Button";
import { ConfirmDialog } from "@/components/ui/Modal";
import { DataTable, type DataTableColumn } from "@/components/ui/DataTable";
import { useToast } from "@/components/ui/Toast";
import { createClient } from "@/lib/supabase/client";
import { formatDate } from "@/lib/formatDate";
import { ReceiveGoodsDrawer } from "./ReceiveGoodsDrawer";
import type { Database, PurchaseOrderStatus } from "@/lib/database.types";

type PurchaseOrderRow = Database["public"]["Tables"]["purchase_orders"]["Row"];
type PurchaseOrderLineRow = Database["public"]["Tables"]["purchase_order_lines"]["Row"];
type GoodsReceivedNoteRow = Database["public"]["Tables"]["goods_received_notes"]["Row"];

interface ItemOption {
  id: string;
  sku: string;
  name: string;
  unit: string;
}

interface DraftLine {
  id?: string;
  item_id: string;
  quantity_ordered: string;
  unit_cost: number;
}

const STATUS_VARIANT: Record<PurchaseOrderStatus, BadgeVariant> = {
  draft: "neutral",
  issued: "info",
  received: "warning",
  billed: "success",
  cancelled: "danger",
};

function toDraftLine(line: PurchaseOrderLineRow): DraftLine {
  return { id: line.id, item_id: line.item_id, quantity_ordered: String(line.quantity_ordered), unit_cost: line.unit_cost };
}

function money(v: number) {
  return v.toLocaleString("en-SZ", { minimumFractionDigits: 2 });
}

export interface PurchaseOrderDetailSectionProps {
  po: PurchaseOrderRow;
  initialLines: PurchaseOrderLineRow[];
  suppliers: { id: string; name: string }[];
  items: ItemOption[];
  grns: GoodsReceivedNoteRow[];
  canManage: boolean;
}

export function PurchaseOrderDetailSection({ po: initialPo, initialLines, suppliers, items, grns, canManage }: PurchaseOrderDetailSectionProps) {
  const { addToast } = useToast();
  const [po, setPo] = useState(initialPo);
  const [supplierId, setSupplierId] = useState(po.supplier_id);
  const [expectedDate, setExpectedDate] = useState<Date | undefined>(po.expected_date ? new Date(po.expected_date) : undefined);
  const [notes, setNotes] = useState(po.notes ?? "");
  const [lines, setLines] = useState<DraftLine[]>(initialLines.length > 0 ? initialLines.map(toDraftLine) : [{ item_id: "", quantity_ordered: "", unit_cost: 0 }]);
  const [poLines, setPoLines] = useState(initialLines);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [issuing, setIssuing] = useState(false);
  const [receiveOpen, setReceiveOpen] = useState(false);

  const editable = canManage && po.status === "draft";
  const supplierName = suppliers.find((s) => s.id === po.supplier_id)?.name ?? "—";
  const itemOptions = items.map((i) => ({ value: i.id, label: `${i.sku} — ${i.name}` }));
  const itemMap = useMemo(() => new Map(items.map((i) => [i.id, i])), [items]);

  const total = useMemo(() => poLines.reduce((s, l) => s + l.quantity_ordered * l.unit_cost, 0), [poLines]);
  const outstandingLines = useMemo(() => poLines.filter((l) => l.quantity_received < l.quantity_ordered), [poLines]);

  const updateLine = (index: number, patch: Partial<DraftLine>) => {
    setLines((prev) => prev.map((l, i) => (i === index ? { ...l, ...patch } : l)));
  };

  const saveDraft = async () => {
    setError(null);
    const validLines = lines.filter((l) => l.item_id && Number(l.quantity_ordered) > 0);
    if (validLines.length === 0) {
      setError("Add at least one line with an item and a quantity");
      return;
    }

    setSaving(true);
    const supabase = createClient();

    const { error: updateError } = await supabase
      .from("purchase_orders")
      .update({ supplier_id: supplierId, expected_date: expectedDate ? expectedDate.toISOString().slice(0, 10) : null, notes: notes || null })
      .eq("id", po.id);

    if (updateError) {
      setSaving(false);
      setError(updateError.message);
      return;
    }

    await supabase.from("purchase_order_lines").delete().eq("purchase_order_id", po.id);
    const { data: inserted, error: insertError } = await supabase
      .from("purchase_order_lines")
      .insert(
        validLines.map((l, i) => ({
          purchase_order_id: po.id,
          item_id: l.item_id,
          quantity_ordered: Number(l.quantity_ordered),
          unit_cost: l.unit_cost,
          position: i,
        }))
      )
      .select();

    setSaving(false);
    if (insertError) {
      setError(insertError.message);
      return;
    }

    setPoLines(inserted ?? []);
    addToast({ variant: "field", message: "Draft saved" });
  };

  const issuePo = async () => {
    setIssuing(true);
    const supabase = createClient();
    const { data, error: rpcError } = await supabase.rpc("issue_purchase_order", { p_po_id: po.id });
    setIssuing(false);

    if (rpcError) {
      addToast({ variant: "danger", message: rpcError.message });
      return;
    }
    setPo(data);
    addToast({ variant: "field", message: "Purchase order issued" });
  };

  const grnColumns: DataTableColumn<GoodsReceivedNoteRow>[] = [
    { key: "grn_no", header: "GRN no.", render: (g) => <span className="font-mono text-xs">{g.grn_no}</span> },
    { key: "date", header: "Received", render: (g) => formatDate(g.received_date) },
    { key: "reference", header: "Reference", render: (g) => g.reference || "—" },
  ];

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title={po.po_no}
        backHref="/inventory/purchase-orders"
        subtitle={<Badge variant={STATUS_VARIANT[po.status]}>{po.status}</Badge>}
        actions={
          editable ? (
            <>
              <Button variant="secondary" loading={saving} onClick={saveDraft}>
                Save draft
              </Button>
              <ConfirmDialog
                trigger={<Button loading={issuing}>Issue purchase order</Button>}
                title="Issue purchase order"
                body={`Issue ${po.po_no} to ${supplierName}? Lines can't be changed after issuing — you'll record deliveries against it instead.`}
                tone="primary"
                confirmLabel="Issue"
                onConfirm={issuePo}
              />
            </>
          ) : canManage && (po.status === "issued" || po.status === "received") ? (
            <Button icon={<TbTruckDelivery />} onClick={() => setReceiveOpen(true)}>
              Record goods received
            </Button>
          ) : undefined
        }
      />

      <div className="grid gap-4 sm:grid-cols-2">
        {editable ? (
          <>
            <div>
              <label className="mb-1.5 block text-xs font-medium text-ink-700">Supplier</label>
              <Combobox options={suppliers.map((s) => ({ value: s.id, label: s.name }))} value={supplierId} onChange={setSupplierId} />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-medium text-ink-700">Expected delivery</label>
              <DatePicker value={expectedDate} onChange={setExpectedDate} />
            </div>
            <div className="sm:col-span-2">
              <label className="mb-1.5 block text-xs font-medium text-ink-700">Notes</label>
              <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} className="min-h-10" />
            </div>
          </>
        ) : (
          <>
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-ink-400">Supplier</p>
              <p className="text-sm text-ink-900">{supplierName}</p>
            </div>
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-ink-400">Expected delivery</p>
              <p className="text-sm text-ink-900">{po.expected_date ? formatDate(po.expected_date) : "—"}</p>
            </div>
            {po.notes && (
              <div className="sm:col-span-2">
                <p className="text-xs font-medium uppercase tracking-wide text-ink-400">Notes</p>
                <p className="text-sm text-ink-900">{po.notes}</p>
              </div>
            )}
          </>
        )}
      </div>

      <div className="overflow-hidden rounded-card border border-paper-200 bg-paper-0">
        <div className="grid grid-cols-[1fr,120px,120px,120px,40px] gap-2 border-b border-paper-200 bg-paper-50 px-4 py-2.5 text-[12px] font-medium uppercase tracking-wide text-ink-400">
          <span>Item</span>
          <span className="text-right">Ordered</span>
          <span className="text-right">Received</span>
          <span className="text-right">Unit cost</span>
          <span />
        </div>
        {editable
          ? lines.map((line, i) => (
              <div key={i} className="grid grid-cols-[1fr,120px,120px,120px,40px] items-center gap-2 border-b border-paper-100 px-4 py-2 last:border-0">
                <Combobox options={itemOptions} value={line.item_id} onChange={(v) => updateLine(i, { item_id: v })} placeholder="Search item…" />
                <Input
                  type="number"
                  step="0.01"
                  className="text-right tabular-nums"
                  value={line.quantity_ordered}
                  onChange={(e) => updateLine(i, { quantity_ordered: e.target.value })}
                />
                <span />
                <MoneyInput value={line.unit_cost} onValueChange={(v) => updateLine(i, { unit_cost: v })} />
                <button
                  type="button"
                  aria-label="Remove line"
                  onClick={() => setLines((prev) => prev.filter((_, idx) => idx !== i))}
                  className="flex size-8 items-center justify-center rounded-ctrl text-ink-400 hover:bg-paper-100 hover:text-danger-600"
                >
                  <TbTrash className="size-4" />
                </button>
              </div>
            ))
          : poLines.map((line) => (
              <div key={line.id} className="grid grid-cols-[1fr,120px,120px,120px,40px] items-center gap-2 border-b border-paper-100 px-4 py-2 last:border-0">
                <span className="text-sm text-ink-900">{itemMap.get(line.item_id) ? `${itemMap.get(line.item_id)!.sku} — ${itemMap.get(line.item_id)!.name}` : "—"}</span>
                <span className="text-right text-sm tabular-nums text-ink-900">
                  {line.quantity_ordered} {itemMap.get(line.item_id)?.unit ?? ""}
                </span>
                <span className={`text-right text-sm tabular-nums ${line.quantity_received >= line.quantity_ordered ? "text-field-500" : "text-ink-900"}`}>
                  {line.quantity_received} {itemMap.get(line.item_id)?.unit ?? ""}
                </span>
                <span className="text-right text-sm tabular-nums text-ink-900">{money(line.unit_cost)}</span>
                <span />
              </div>
            ))}
        {editable && (
          <div className="px-4 py-2">
            <Button variant="ghost" size="sm" icon={<TbPlus />} onClick={() => setLines((prev) => [...prev, { item_id: "", quantity_ordered: "", unit_cost: 0 }])}>
              Add line
            </Button>
          </div>
        )}
        <div className="grid grid-cols-[1fr,120px,120px,120px,40px] gap-2 border-t border-paper-200 bg-paper-50 px-4 py-2.5 text-sm font-medium">
          <span className="col-span-3 text-ink-700">Order total</span>
          <span className="text-right tabular-nums text-ink-900">{money(total)}</span>
          <span />
        </div>
      </div>

      {error && <FieldError>{error}</FieldError>}

      {grns.length > 0 && (
        <div className="flex flex-col gap-2">
          <p className="text-xs font-medium uppercase tracking-wide text-ink-400">Goods received</p>
          <DataTable columns={grnColumns} data={grns} rowKey={(g) => g.id} />
        </div>
      )}

      {canManage && (
        <ReceiveGoodsDrawer po={po} open={receiveOpen} onOpenChange={setReceiveOpen} outstandingLines={outstandingLines} itemMap={itemMap} onSaved={() => window.location.reload()} />
      )}
    </div>
  );
}
