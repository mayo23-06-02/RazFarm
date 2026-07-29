"use client";

import { useEffect, useState } from "react";
import { Drawer } from "@/components/ui/Drawer";
import { FormRow } from "@/components/ui/FormRow";
import { DatePicker } from "@/components/ui/DatePicker";
import { Input, FieldError } from "@/components/ui/Input";
import { MoneyInput } from "@/components/ui/MoneyInput";
import { Button } from "@/components/ui/Button";
import { useToast } from "@/components/ui/Toast";
import { createClient } from "@/lib/supabase/client";
import type { Database } from "@/lib/database.types";

type PurchaseOrderRow = Database["public"]["Tables"]["purchase_orders"]["Row"];
type PurchaseOrderLineRow = Database["public"]["Tables"]["purchase_order_lines"]["Row"];

interface ItemOption {
  id: string;
  sku: string;
  name: string;
  unit: string;
}

interface ReceiveLineDraft {
  poLineId: string;
  itemName: string;
  unit: string;
  remaining: number;
  receiveNow: string;
  unitCost: number;
}

export interface ReceiveGoodsDrawerProps {
  po: PurchaseOrderRow;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  outstandingLines: PurchaseOrderLineRow[];
  itemMap: Map<string, ItemOption>;
  onSaved: () => void;
}

export function ReceiveGoodsDrawer({ po, open, onOpenChange, outstandingLines, itemMap, onSaved }: ReceiveGoodsDrawerProps) {
  const { addToast } = useToast();
  const [receivedDate, setReceivedDate] = useState(new Date());
  const [reference, setReference] = useState("");
  const [lines, setLines] = useState<ReceiveLineDraft[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setReceivedDate(new Date());
    setReference("");
    setError(null);
    setLines(
      outstandingLines.map((l) => {
        const remaining = l.quantity_ordered - l.quantity_received;
        return {
          poLineId: l.id,
          itemName: itemMap.get(l.item_id)?.name ?? "—",
          unit: itemMap.get(l.item_id)?.unit ?? "",
          remaining,
          receiveNow: String(remaining),
          unitCost: l.unit_cost,
        };
      })
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const updateLine = (index: number, patch: Partial<ReceiveLineDraft>) => {
    setLines((prev) => prev.map((l, i) => (i === index ? { ...l, ...patch } : l)));
  };

  const submit = async () => {
    setError(null);
    const toReceive = lines.filter((l) => Number(l.receiveNow) > 0);
    if (toReceive.length === 0) {
      setError("Enter a quantity for at least one line");
      return;
    }
    if (toReceive.some((l) => Number(l.receiveNow) > l.remaining)) {
      setError("Can't receive more than what's outstanding on a line");
      return;
    }

    setSaving(true);
    const supabase = createClient();
    const { error: rpcError } = await supabase.rpc("receive_purchase_order_lines", {
      p_po_id: po.id,
      p_received_date: receivedDate.toISOString().slice(0, 10),
      p_lines: toReceive.map((l) => ({ po_line_id: l.poLineId, quantity_received: Number(l.receiveNow), unit_cost: l.unitCost })),
      p_reference: reference || null,
    });
    setSaving(false);

    if (rpcError) {
      setError(rpcError.message);
      return;
    }
    addToast({ variant: "field", message: "Goods received recorded — stock and the supplier bill are updated" });
    onOpenChange(false);
    onSaved();
  };

  return (
    <Drawer open={open} onOpenChange={onOpenChange} title={`Record goods received — ${po.po_no}`} width={560}>
      <div className="flex flex-col gap-5">
        <div className="grid gap-4 sm:grid-cols-2">
          <FormRow label="Received date" required>
            <DatePicker value={receivedDate} onChange={setReceivedDate} />
          </FormRow>
          <FormRow label="Reference" hint="Optional — delivery note number">
            <Input value={reference} onChange={(e) => setReference(e.target.value)} />
          </FormRow>
        </div>

        <div className="overflow-hidden rounded-card border border-paper-200 bg-paper-0">
          <div className="grid grid-cols-[1fr,110px,110px] gap-2 border-b border-paper-200 bg-paper-50 px-4 py-2.5 text-[12px] font-medium uppercase tracking-wide text-ink-400">
            <span>Item</span>
            <span className="text-right">Receive now</span>
            <span className="text-right">Unit cost</span>
          </div>
          {lines.map((line, i) => (
            <div key={line.poLineId} className="grid grid-cols-[1fr,110px,110px] items-center gap-2 border-b border-paper-100 px-4 py-2 last:border-0">
              <div>
                <p className="text-sm text-ink-900">{line.itemName}</p>
                <p className="text-xs text-ink-400">
                  {line.remaining} {line.unit} outstanding
                </p>
              </div>
              <Input
                type="number"
                step="0.01"
                className="text-right tabular-nums"
                value={line.receiveNow}
                onChange={(e) => updateLine(i, { receiveNow: e.target.value })}
              />
              <MoneyInput value={line.unitCost} onValueChange={(v) => updateLine(i, { unitCost: v })} />
            </div>
          ))}
        </div>

        {error && <FieldError>{error}</FieldError>}
        <div className="flex justify-end gap-2 pt-2">
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={submit} loading={saving}>
            Record receipt
          </Button>
        </div>
      </div>
    </Drawer>
  );
}
