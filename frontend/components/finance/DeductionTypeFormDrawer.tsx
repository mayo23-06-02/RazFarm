"use client";

import { useEffect, useState } from "react";
import { Drawer } from "@/components/ui/Drawer";
import { Input, FieldError } from "@/components/ui/Input";
import { FormRow } from "@/components/ui/FormRow";
import { Combobox } from "@/components/ui/Select";
import { Toggle } from "@/components/ui/Checkbox";
import { Button } from "@/components/ui/Button";
import { useToast } from "@/components/ui/Toast";
import { createClient } from "@/lib/supabase/client";
import type { Database } from "@/lib/database.types";

type DeductionTypeRow = Database["public"]["Tables"]["deduction_types"]["Row"];

interface AccountOption {
  id: string;
  code: string;
  name: string;
}

export interface DeductionTypeFormDrawerProps {
  tenantId: string;
  accounts: AccountOption[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  deductionType?: DeductionTypeRow | null;
  onSaved: () => void;
}

export function DeductionTypeFormDrawer({ tenantId, accounts, open, onOpenChange, deductionType, onSaved }: DeductionTypeFormDrawerProps) {
  const { addToast } = useToast();
  const isEdit = !!deductionType;
  const [name, setName] = useState("");
  const [glAccountId, setGlAccountId] = useState<string | undefined>();
  const [isActive, setIsActive] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setName(deductionType?.name ?? "");
    setGlAccountId(deductionType?.gl_account_id);
    setIsActive(deductionType?.is_active ?? true);
    setError(null);
  }, [open, deductionType]);

  const submit = async () => {
    setError(null);
    if (!name.trim()) {
      setError("Enter a name");
      return;
    }
    if (!glAccountId) {
      setError("Select which account this deduction recovers into");
      return;
    }
    setSaving(true);
    const supabase = createClient();
    const payload = { name: name.trim(), gl_account_id: glAccountId, is_active: isActive };

    const { error: saveError } = isEdit
      ? await supabase.from("deduction_types").update(payload).eq("id", deductionType!.id)
      : await supabase.from("deduction_types").insert({ tenant_id: tenantId, ...payload });
    setSaving(false);

    if (saveError) {
      setError(saveError.message);
      return;
    }

    addToast({ variant: "field", message: isEdit ? "Deduction type updated" : "Deduction type added" });
    onOpenChange(false);
    onSaved();
  };

  return (
    <Drawer open={open} onOpenChange={onOpenChange} title={isEdit ? "Edit deduction type" : "Add deduction type"}>
      <div className="flex flex-col gap-5">
        <FormRow label="Name" required hint="e.g. Haulage, Cutting contractor, Loan repayment">
          <Input value={name} onChange={(e) => setName(e.target.value)} />
        </FormRow>
        <FormRow label="Recovers into" required hint="Which ledger account this deduction's total lands in when a payout run is paid">
          <Combobox options={accounts.map((a) => ({ value: a.id, label: `${a.code} — ${a.name}` }))} value={glAccountId} onChange={setGlAccountId} placeholder="Search account…" />
        </FormRow>
        {isEdit && (
          <FormRow label="Status" hint="Inactive deduction types are hidden from new payout runs">
            <Toggle label={isActive ? "Active" : "Inactive"} checked={isActive} onChange={setIsActive} />
          </FormRow>
        )}
        {error && <FieldError>{error}</FieldError>}
        <div className="flex justify-end gap-2 pt-2">
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={submit} loading={saving}>
            {isEdit ? "Save changes" : "Add deduction type"}
          </Button>
        </div>
      </div>
    </Drawer>
  );
}
