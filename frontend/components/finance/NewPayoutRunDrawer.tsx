"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Drawer } from "@/components/ui/Drawer";
import { Input, FieldError } from "@/components/ui/Input";
import { FormRow } from "@/components/ui/FormRow";
import { DatePicker } from "@/components/ui/DatePicker";
import { Combobox } from "@/components/ui/Select";
import { Button } from "@/components/ui/Button";
import { useToast } from "@/components/ui/Toast";
import { createClient } from "@/lib/supabase/client";

interface AccountOption {
  id: string;
  code: string;
  name: string;
}

export interface NewPayoutRunDrawerProps {
  tenantId: string;
  bankAccounts: AccountOption[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function NewPayoutRunDrawer({ tenantId, bankAccounts, open, onOpenChange }: NewPayoutRunDrawerProps) {
  const router = useRouter();
  const { addToast } = useToast();
  const [title, setTitle] = useState("");
  const [runDate, setRunDate] = useState(new Date());
  const [grossPool, setGrossPool] = useState("");
  const [bankAccountId, setBankAccountId] = useState<string | undefined>();
  const [error, setError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

  const create = async () => {
    setError(null);
    if (!title.trim()) {
      setError("Enter a title, e.g. \"June 2026 cane proceeds\"");
      return;
    }
    if (!grossPool || Number(grossPool) <= 0) {
      setError("Enter the gross amount to distribute");
      return;
    }
    if (!bankAccountId) {
      setError("Select which account the money is being paid from");
      return;
    }
    setCreating(true);
    const supabase = createClient();
    const year = new Date().getFullYear();
    const { count } = await supabase
      .from("payout_runs")
      .select("id", { count: "exact", head: true })
      .eq("tenant_id", tenantId)
      .like("run_no", `PAYOUT-${year}-%`);
    const runNo = `PAYOUT-${year}-${(count ?? 0) + 1}`;

    const {
      data: { user },
    } = await supabase.auth.getUser();

    const { data, error: insertError } = await supabase
      .from("payout_runs")
      .insert({
        tenant_id: tenantId,
        run_no: runNo,
        title: title.trim(),
        run_date: runDate.toISOString().slice(0, 10),
        gross_pool: Number(grossPool),
        bank_account_id: bankAccountId,
        created_by: user?.id,
      })
      .select()
      .single();
    setCreating(false);

    if (insertError || !data) {
      setError(insertError?.message ?? "Couldn't create payout run");
      return;
    }
    router.push(`/finance/payouts/${data.id}`);
  };

  return (
    <Drawer open={open} onOpenChange={onOpenChange} title="New payout run">
      <div className="flex flex-col gap-5">
        <FormRow label="Title" required>
          <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. June 2026 cane proceeds" />
        </FormRow>
        <FormRow label="Run date" required>
          <DatePicker value={runDate} onChange={setRunDate} />
        </FormRow>
        <FormRow label="Gross amount to distribute" required hint="Split across active members by shareholding">
          <Input type="number" step="0.01" value={grossPool} onChange={(e) => setGrossPool(e.target.value)} className="text-right tabular-nums" />
        </FormRow>
        <FormRow label="Paid from" required>
          <Combobox options={bankAccounts.map((a) => ({ value: a.id, label: `${a.code} — ${a.name}` }))} value={bankAccountId} onChange={setBankAccountId} placeholder="Select bank/cash account…" />
        </FormRow>
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
