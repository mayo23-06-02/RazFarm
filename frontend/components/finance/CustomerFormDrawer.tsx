"use client";

import { useEffect, useState } from "react";
import { Drawer } from "@/components/ui/Drawer";
import { Input, Textarea, FieldError } from "@/components/ui/Input";
import { FormRow } from "@/components/ui/FormRow";
import { Button } from "@/components/ui/Button";
import { useToast } from "@/components/ui/Toast";
import { createClient } from "@/lib/supabase/client";
import type { Database } from "@/lib/database.types";

type CustomerRow = Database["public"]["Tables"]["customers"]["Row"];

export interface CustomerFormDrawerProps {
  tenantId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  customer?: CustomerRow | null;
  onSaved: () => void;
}

export function CustomerFormDrawer({ tenantId, open, onOpenChange, customer, onSaved }: CustomerFormDrawerProps) {
  const { addToast } = useToast();
  const isEdit = !!customer;
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setName(customer?.name ?? "");
    setEmail(customer?.email ?? "");
    setPhone(customer?.phone ?? "");
    setAddress(customer?.address ?? "");
    setError(null);
  }, [open, customer]);

  const submit = async () => {
    setError(null);
    if (!name.trim()) {
      setError("Enter a customer name");
      return;
    }
    setSaving(true);
    const supabase = createClient();
    const payload = { name: name.trim(), email: email || null, phone: phone || null, address: address || null };

    const { error: saveError } = isEdit
      ? await supabase.from("customers").update(payload).eq("id", customer!.id)
      : await supabase.from("customers").insert({ tenant_id: tenantId, ...payload });
    setSaving(false);

    if (saveError) {
      setError(saveError.message);
      return;
    }

    addToast({ variant: "field", message: isEdit ? "Customer updated" : "Customer added" });
    onOpenChange(false);
    onSaved();
  };

  return (
    <Drawer open={open} onOpenChange={onOpenChange} title={isEdit ? "Edit customer" : "Add customer"}>
      <div className="flex flex-col gap-5">
        <FormRow label="Name" required>
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Royal Swazi Sugar" />
        </FormRow>
        <FormRow label="Email">
          <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
        </FormRow>
        <FormRow label="Phone">
          <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+268 7612 3456" />
        </FormRow>
        <FormRow label="Address">
          <Textarea value={address} onChange={(e) => setAddress(e.target.value)} />
        </FormRow>
        {error && <FieldError>{error}</FieldError>}
        <div className="flex justify-end gap-2 pt-2">
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={submit} loading={saving}>
            {isEdit ? "Save changes" : "Add customer"}
          </Button>
        </div>
      </div>
    </Drawer>
  );
}
