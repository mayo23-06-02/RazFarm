"use client";

import { useEffect, useState } from "react";
import { Drawer } from "@/components/ui/Drawer";
import { FormRow } from "@/components/ui/FormRow";
import { DatePicker } from "@/components/ui/DatePicker";
import { Combobox } from "@/components/ui/Select";
import { Button } from "@/components/ui/Button";
import { FieldError } from "@/components/ui/Input";
import { useToast } from "@/components/ui/Toast";
import { createClient } from "@/lib/supabase/client";
import type { Database } from "@/lib/database.types";

type SupplierBillRow = Database["public"]["Tables"]["supplier_bills"]["Row"];

interface AccountOption {
  id: string;
  code: string;
  name: string;
  type: string;
}

export interface MarkBillPaidDrawerProps {
  bill: SupplierBillRow | null;
  onOpenChange: (open: boolean) => void;
  accounts: AccountOption[];
  onSaved: () => void;
}

export function MarkBillPaidDrawer({ bill, onOpenChange, accounts, onSaved }: MarkBillPaidDrawerProps) {
  const { addToast } = useToast();
  const [paymentDate, setPaymentDate] = useState(new Date());
  const [paymentAccountId, setPaymentAccountId] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!bill) return;
    setPaymentDate(new Date());
    setPaymentAccountId("");
    setError(null);
  }, [bill]);

  const submit = async () => {
    if (!bill) return;
    setError(null);
    if (!paymentAccountId) {
      setError("Choose which account this was paid from");
      return;
    }
    setSaving(true);
    const supabase = createClient();
    const { error: rpcError } = await supabase.rpc("mark_supplier_bill_paid", {
      p_bill_id: bill.id,
      p_payment_date: paymentDate.toISOString().slice(0, 10),
      p_payment_account_id: paymentAccountId,
    });
    setSaving(false);
    if (rpcError) {
      setError(rpcError.message);
      return;
    }
    addToast({ variant: "field", message: `${bill.bill_no} marked as paid` });
    onOpenChange(false);
    onSaved();
  };

  return (
    <Drawer open={!!bill} onOpenChange={onOpenChange} title={bill ? `Mark ${bill.bill_no} as paid` : "Mark bill as paid"}>
      <div className="flex flex-col gap-5">
        <FormRow label="Payment date" required>
          <DatePicker value={paymentDate} onChange={setPaymentDate} />
        </FormRow>
        <FormRow label="Paid from" required>
          <Combobox
            options={accounts.filter((a) => a.type === "asset").map((a) => ({ value: a.id, label: `${a.code} — ${a.name}` }))}
            value={paymentAccountId}
            onChange={setPaymentAccountId}
            placeholder="Choose bank or cash account…"
          />
        </FormRow>
        {error && <FieldError>{error}</FieldError>}
        <div className="flex justify-end gap-2 pt-2">
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={submit} loading={saving}>
            Mark as paid
          </Button>
        </div>
      </div>
    </Drawer>
  );
}
