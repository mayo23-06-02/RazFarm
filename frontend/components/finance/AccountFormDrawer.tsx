"use client";

import { useEffect, useState } from "react";
import { Drawer } from "@/components/ui/Drawer";
import { Input, FieldError } from "@/components/ui/Input";
import { FormRow } from "@/components/ui/FormRow";
import { Select } from "@/components/ui/Select";
import { Toggle } from "@/components/ui/Checkbox";
import { Button } from "@/components/ui/Button";
import { useToast } from "@/components/ui/Toast";
import { createClient } from "@/lib/supabase/client";
import type { AccountType, Database } from "@/lib/database.types";

type AccountRow = Database["public"]["Tables"]["accounts"]["Row"];

const TYPE_OPTIONS = [
  { value: "asset", label: "Asset — things you own (bank, cash, money owed to you)" },
  { value: "liability", label: "Liability — things you owe" },
  { value: "equity", label: "Equity — member contributions & retained earnings" },
  { value: "income", label: "Income — money coming in" },
  { value: "expense", label: "Expense — money going out" },
];

export interface AccountFormDrawerProps {
  tenantId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  account?: AccountRow | null;
  onSaved: () => void;
}

export function AccountFormDrawer({ tenantId, open, onOpenChange, account, onSaved }: AccountFormDrawerProps) {
  const { addToast } = useToast();
  const isEdit = !!account;
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [type, setType] = useState<AccountType>("asset");
  const [isActive, setIsActive] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setCode(account?.code ?? "");
    setName(account?.name ?? "");
    setType(account?.type ?? "asset");
    setIsActive(account?.is_active ?? true);
    setError(null);
  }, [open, account]);

  const submit = async () => {
    setError(null);
    if (!code.trim() || !name.trim()) {
      setError("Enter both a code and a name");
      return;
    }
    setSaving(true);
    const supabase = createClient();
    const payload = { code: code.trim(), name: name.trim(), type, is_active: isActive };

    const { error: saveError } = isEdit
      ? await supabase.from("accounts").update(payload).eq("id", account!.id)
      : await supabase.from("accounts").insert({ tenant_id: tenantId, ...payload });
    setSaving(false);

    if (saveError) {
      setError(saveError.message);
      return;
    }

    addToast({ variant: "field", message: isEdit ? "Account updated" : "Account added" });
    onOpenChange(false);
    onSaved();
  };

  return (
    <Drawer open={open} onOpenChange={onOpenChange} title={isEdit ? "Edit account" : "Add account"}>
      <div className="flex flex-col gap-5">
        <FormRow label="Code" required hint="e.g. 1000 — used to keep accounts in a sensible order">
          <Input value={code} onChange={(e) => setCode(e.target.value)} className="font-mono" />
        </FormRow>
        <FormRow label="Name" required>
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Bank" />
        </FormRow>
        <FormRow label="Type" required hint="What kind of account this is — this decides which report it shows up in">
          <Select options={TYPE_OPTIONS} value={type} onChange={(v) => setType(v as AccountType)} />
        </FormRow>
        {isEdit && (
          <FormRow label="Status" hint="Inactive accounts are hidden from new journal entries but keep their history">
            <Toggle label={isActive ? "Active" : "Inactive"} checked={isActive} onChange={setIsActive} />
          </FormRow>
        )}
        {error && <FieldError>{error}</FieldError>}
        <div className="flex justify-end gap-2 pt-2">
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={submit} loading={saving}>
            {isEdit ? "Save changes" : "Add account"}
          </Button>
        </div>
      </div>
    </Drawer>
  );
}
