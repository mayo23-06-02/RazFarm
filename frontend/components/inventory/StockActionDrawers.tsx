"use client";

import { useEffect, useState } from "react";
import { Drawer } from "@/components/ui/Drawer";
import { FormRow } from "@/components/ui/FormRow";
import { Input, FieldError } from "@/components/ui/Input";
import { MoneyInput } from "@/components/ui/MoneyInput";
import { Combobox } from "@/components/ui/Select";
import { ButtonGroup, Button } from "@/components/ui/Button";
import { useToast } from "@/components/ui/Toast";
import { createClient } from "@/lib/supabase/client";
import type { Database } from "@/lib/database.types";

type ItemRow = Database["public"]["Tables"]["inventory_items"]["Row"];

interface AccountOption {
  id: string;
  code: string;
  name: string;
  type: string;
}

function accountOptions(accounts: AccountOption[], type: string) {
  return accounts.filter((a) => a.type === type).map((a) => ({ value: a.id, label: `${a.code} — ${a.name}` }));
}

export interface ReceiveStockDrawerProps {
  item: ItemRow | null;
  onOpenChange: (open: boolean) => void;
  accounts: AccountOption[];
  onSaved: () => void;
}

export function ReceiveStockDrawer({ item, onOpenChange, accounts, onSaved }: ReceiveStockDrawerProps) {
  const { addToast } = useToast();
  const [quantity, setQuantity] = useState("");
  const [unitCost, setUnitCost] = useState(0);
  const [creditAccountId, setCreditAccountId] = useState("");
  const [reference, setReference] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!item) return;
    setQuantity("");
    setUnitCost(item.average_cost);
    setCreditAccountId("");
    setReference("");
    setError(null);
  }, [item]);

  const submit = async () => {
    if (!item) return;
    setError(null);
    const qty = Number(quantity);
    if (!qty || qty <= 0) {
      setError("Enter a quantity greater than zero");
      return;
    }
    if (!creditAccountId) {
      setError("Choose which account this stock was paid from");
      return;
    }
    setSaving(true);
    const supabase = createClient();
    const { error: rpcError } = await supabase.rpc("record_stock_receipt", {
      p_item_id: item.id,
      p_quantity: qty,
      p_unit_cost: unitCost,
      p_credit_account_id: creditAccountId,
      p_reference: reference || null,
    });
    setSaving(false);
    if (rpcError) {
      setError(rpcError.message);
      return;
    }
    addToast({ variant: "field", message: `Received ${qty} ${item.unit} of ${item.name}` });
    onOpenChange(false);
    onSaved();
  };

  return (
    <Drawer open={!!item} onOpenChange={onOpenChange} title={item ? `Receive stock — ${item.name}` : "Receive stock"}>
      <div className="flex flex-col gap-5">
        <FormRow label="Quantity" required hint={item ? `In ${item.unit}` : undefined}>
          <Input type="number" step="0.01" value={quantity} onChange={(e) => setQuantity(e.target.value)} />
        </FormRow>
        <FormRow label="Unit cost" required>
          <MoneyInput value={unitCost} onValueChange={setUnitCost} />
        </FormRow>
        <FormRow label="Paid from" required>
          <Combobox options={accountOptions(accounts, "asset")} value={creditAccountId} onChange={setCreditAccountId} placeholder="Choose bank or cash account…" />
        </FormRow>
        <FormRow label="Reference" hint="Optional — supplier invoice or delivery note number">
          <Input value={reference} onChange={(e) => setReference(e.target.value)} />
        </FormRow>
        {error && <FieldError>{error}</FieldError>}
        <div className="flex justify-end gap-2 pt-2">
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={submit} loading={saving}>
            Receive stock
          </Button>
        </div>
      </div>
    </Drawer>
  );
}

export interface IssueStockDrawerProps {
  item: ItemRow | null;
  onOpenChange: (open: boolean) => void;
  accounts: AccountOption[];
  onSaved: () => void;
}

export function IssueStockDrawer({ item, onOpenChange, accounts, onSaved }: IssueStockDrawerProps) {
  const { addToast } = useToast();
  const [quantity, setQuantity] = useState("");
  const [expenseAccountId, setExpenseAccountId] = useState("");
  const [reference, setReference] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!item) return;
    setQuantity("");
    setExpenseAccountId("");
    setReference("");
    setError(null);
  }, [item]);

  const submit = async () => {
    if (!item) return;
    setError(null);
    const qty = Number(quantity);
    if (!qty || qty <= 0) {
      setError("Enter a quantity greater than zero");
      return;
    }
    if (qty > item.quantity_on_hand) {
      setError(`Only ${item.quantity_on_hand} ${item.unit} in stock`);
      return;
    }
    if (!expenseAccountId) {
      setError("Choose what this stock was used for");
      return;
    }
    setSaving(true);
    const supabase = createClient();
    const { error: rpcError } = await supabase.rpc("record_stock_issue", {
      p_item_id: item.id,
      p_quantity: qty,
      p_expense_account_id: expenseAccountId,
      p_reference: reference || null,
    });
    setSaving(false);
    if (rpcError) {
      setError(rpcError.message);
      return;
    }
    addToast({ variant: "field", message: `Issued ${qty} ${item.unit} of ${item.name}` });
    onOpenChange(false);
    onSaved();
  };

  return (
    <Drawer open={!!item} onOpenChange={onOpenChange} title={item ? `Issue stock — ${item.name}` : "Issue stock"}>
      <div className="flex flex-col gap-5">
        <FormRow label="Quantity" required hint={item ? `${item.quantity_on_hand} ${item.unit} available` : undefined}>
          <Input type="number" step="0.01" value={quantity} onChange={(e) => setQuantity(e.target.value)} />
        </FormRow>
        <FormRow label="Used for" required>
          <Combobox options={accountOptions(accounts, "expense")} value={expenseAccountId} onChange={setExpenseAccountId} placeholder="Choose an expense category…" />
        </FormRow>
        <FormRow label="Reference" hint="Optional — e.g. which field or activity this was for">
          <Input value={reference} onChange={(e) => setReference(e.target.value)} />
        </FormRow>
        {error && <FieldError>{error}</FieldError>}
        <div className="flex justify-end gap-2 pt-2">
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={submit} loading={saving}>
            Issue stock
          </Button>
        </div>
      </div>
    </Drawer>
  );
}

export interface AdjustStockDrawerProps {
  item: ItemRow | null;
  onOpenChange: (open: boolean) => void;
  onSaved: () => void;
}

export function AdjustStockDrawer({ item, onOpenChange, onSaved }: AdjustStockDrawerProps) {
  const { addToast } = useToast();
  const [direction, setDirection] = useState<"loss" | "found">("loss");
  const [quantity, setQuantity] = useState("");
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!item) return;
    setDirection("loss");
    setQuantity("");
    setReason("");
    setError(null);
  }, [item]);

  const submit = async () => {
    if (!item) return;
    setError(null);
    const qty = Number(quantity);
    if (!qty || qty <= 0) {
      setError("Enter a quantity greater than zero");
      return;
    }
    const delta = direction === "loss" ? -qty : qty;
    if (direction === "loss" && qty > item.quantity_on_hand) {
      setError(`Only ${item.quantity_on_hand} ${item.unit} in stock`);
      return;
    }
    setSaving(true);
    const supabase = createClient();
    const { error: rpcError } = await supabase.rpc("record_stock_adjustment", {
      p_item_id: item.id,
      p_quantity_delta: delta,
      p_reason: reason || null,
    });
    setSaving(false);
    if (rpcError) {
      setError(rpcError.message);
      return;
    }
    addToast({ variant: "field", message: "Stock adjusted" });
    onOpenChange(false);
    onSaved();
  };

  return (
    <Drawer open={!!item} onOpenChange={onOpenChange} title={item ? `Adjust stock — ${item.name}` : "Adjust stock"}>
      <div className="flex flex-col gap-5">
        <FormRow label="What happened" required>
          <ButtonGroup
            options={[
              { value: "loss", label: "Stock loss / shrinkage" },
              { value: "found", label: "Found extra stock" },
            ]}
            value={direction}
            onChange={(v) => setDirection(v as typeof direction)}
          />
        </FormRow>
        <FormRow label="Quantity" required hint={item ? `In ${item.unit}` : undefined}>
          <Input type="number" step="0.01" value={quantity} onChange={(e) => setQuantity(e.target.value)} />
        </FormRow>
        <FormRow label="Reason" hint="e.g. stock count correction, damaged bags">
          <Input value={reason} onChange={(e) => setReason(e.target.value)} />
        </FormRow>
        {error && <FieldError>{error}</FieldError>}
        <div className="flex justify-end gap-2 pt-2">
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={submit} loading={saving}>
            Save adjustment
          </Button>
        </div>
      </div>
    </Drawer>
  );
}
