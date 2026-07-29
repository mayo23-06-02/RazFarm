"use client";

import { useState } from "react";
import { Drawer } from "@/components/ui/Drawer";
import { Input, FieldError } from "@/components/ui/Input";
import { FormRow } from "@/components/ui/FormRow";
import { Select } from "@/components/ui/Select";
import { Button } from "@/components/ui/Button";
import { useToast } from "@/components/ui/Toast";
import { createClient } from "@/lib/supabase/client";
import type { AccountType } from "@/lib/database.types";

const TYPE_OPTIONS = [
  { value: "asset", label: "Asset" },
  { value: "liability", label: "Liability" },
  { value: "equity", label: "Equity" },
  { value: "income", label: "Income" },
  { value: "expense", label: "Expense" },
];

export interface AddAccountDrawerProps {
  tenantId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAdded: () => void;
}

export function AddAccountDrawer({ tenantId, open, onOpenChange, onAdded }: AddAccountDrawerProps) {
  const { addToast } = useToast();
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [type, setType] = useState<AccountType>("asset");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const reset = () => {
    setCode("");
    setName("");
    setType("asset");
    setError(null);
  };

  const submit = async () => {
    setError(null);
    if (!code.trim() || !name.trim()) {
      setError("Enter both a code and a name");
      return;
    }
    setSaving(true);
    const supabase = createClient();
    const { error: insertError } = await supabase.from("accounts").insert({
      tenant_id: tenantId,
      code: code.trim(),
      name: name.trim(),
      type,
    });
    setSaving(false);

    if (insertError) {
      setError(insertError.message);
      return;
    }

    addToast({ variant: "field", message: "Account added" });
    onOpenChange(false);
    reset();
    onAdded();
  };

  return (
    <Drawer
      open={open}
      onOpenChange={(v) => {
        onOpenChange(v);
        if (!v) reset();
      }}
      title="Add account"
    >
      <div className="flex flex-col gap-5">
        <FormRow label="Code" required hint="e.g. 1000">
          <Input value={code} onChange={(e) => setCode(e.target.value)} className="font-mono" />
        </FormRow>
        <FormRow label="Name" required>
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Bank" />
        </FormRow>
        <FormRow label="Type" required>
          <Select options={TYPE_OPTIONS} value={type} onChange={(v) => setType(v as AccountType)} />
        </FormRow>
        {error && <FieldError>{error}</FieldError>}
        <div className="flex justify-end gap-2 pt-2">
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={submit} loading={saving}>
            Add account
          </Button>
        </div>
      </div>
    </Drawer>
  );
}
