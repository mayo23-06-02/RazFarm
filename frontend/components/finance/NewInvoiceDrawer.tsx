"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Drawer } from "@/components/ui/Drawer";
import { FormRow } from "@/components/ui/FormRow";
import { Combobox } from "@/components/ui/Select";
import { DatePicker } from "@/components/ui/DatePicker";
import { Button } from "@/components/ui/Button";
import { FieldError } from "@/components/ui/Input";
import { useToast } from "@/components/ui/Toast";
import { createClient } from "@/lib/supabase/client";

interface CustomerOption {
  id: string;
  name: string;
}

export interface NewInvoiceDrawerProps {
  tenantId: string;
  customers: CustomerOption[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function NewInvoiceDrawer({ tenantId, customers, open, onOpenChange }: NewInvoiceDrawerProps) {
  const router = useRouter();
  const { addToast } = useToast();
  const [customerId, setCustomerId] = useState<string | undefined>();
  const [issueDate, setIssueDate] = useState(new Date());
  const [dueDate, setDueDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 30);
    return d;
  });
  const [error, setError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

  const create = async () => {
    setError(null);
    if (!customerId) {
      setError("Select a customer");
      return;
    }
    setCreating(true);
    const supabase = createClient();
    const year = new Date().getFullYear();
    const { count } = await supabase
      .from("invoices")
      .select("id", { count: "exact", head: true })
      .eq("tenant_id", tenantId)
      .like("invoice_no", `INV-${year}-%`);
    const invoiceNo = `INV-${year}-${String((count ?? 0) + 1).padStart(4, "0")}`;

    const {
      data: { user },
    } = await supabase.auth.getUser();

    const { data, error: insertError } = await supabase
      .from("invoices")
      .insert({
        tenant_id: tenantId,
        customer_id: customerId,
        invoice_no: invoiceNo,
        issue_date: issueDate.toISOString().slice(0, 10),
        due_date: dueDate.toISOString().slice(0, 10),
        created_by: user?.id,
      })
      .select()
      .single();
    setCreating(false);

    if (insertError || !data) {
      setError(insertError?.message ?? "Couldn't create invoice");
      return;
    }
    router.push(`/finance/receivables/${data.id}`);
  };

  return (
    <Drawer open={open} onOpenChange={onOpenChange} title="New invoice">
      <div className="flex flex-col gap-5">
        <FormRow label="Customer" required>
          <Combobox options={customers.map((c) => ({ value: c.id, label: c.name }))} value={customerId} onChange={setCustomerId} placeholder="Search customer…" />
        </FormRow>
        <div className="grid gap-4 sm:grid-cols-2">
          <FormRow label="Issue date" required>
            <DatePicker value={issueDate} onChange={setIssueDate} />
          </FormRow>
          <FormRow label="Due date" required>
            <DatePicker value={dueDate} onChange={setDueDate} />
          </FormRow>
        </div>
        {error && <FieldError>{error}</FieldError>}
        <div className="flex justify-end gap-2 pt-2">
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={create} loading={creating}>
            Create draft
          </Button>
        </div>
      </div>
    </Drawer>
  );
}
