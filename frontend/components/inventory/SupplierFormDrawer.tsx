"use client";

import { useEffect, useState } from "react";
import { Drawer } from "@/components/ui/Drawer";
import { Input, FieldError, Textarea } from "@/components/ui/Input";
import { FormRow } from "@/components/ui/FormRow";
import { Button } from "@/components/ui/Button";
import { useToast } from "@/components/ui/Toast";
import { createClient } from "@/lib/supabase/client";
import type { Database } from "@/lib/database.types";

type SupplierRow = Database["public"]["Tables"]["suppliers"]["Row"];

export interface SupplierFormDrawerProps {
  tenantId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  supplier?: SupplierRow | null;
  onSaved: () => void;
}

export function SupplierFormDrawer({ tenantId, open, onOpenChange, supplier, onSaved }: SupplierFormDrawerProps) {
  const { addToast } = useToast();
  const isEdit = !!supplier;
  const [name, setName] = useState("");
  const [contactName, setContactName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [address, setAddress] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setName(supplier?.name ?? "");
    setContactName(supplier?.contact_name ?? "");
    setPhone(supplier?.phone ?? "");
    setEmail(supplier?.email ?? "");
    setAddress(supplier?.address ?? "");
    setError(null);
  }, [open, supplier]);

  const submit = async () => {
    setError(null);
    if (!name.trim()) {
      setError("Enter a supplier name");
      return;
    }
    setSaving(true);
    const supabase = createClient();
    const payload = {
      name: name.trim(),
      contact_name: contactName || null,
      phone: phone || null,
      email: email || null,
      address: address || null,
    };

    const { error: saveError } = isEdit
      ? await supabase.from("suppliers").update(payload).eq("id", supplier!.id)
      : await supabase.from("suppliers").insert({ tenant_id: tenantId, ...payload });
    setSaving(false);

    if (saveError) {
      setError(saveError.message);
      return;
    }

    addToast({ variant: "field", message: isEdit ? "Supplier updated" : "Supplier added" });
    onOpenChange(false);
    onSaved();
  };

  return (
    <Drawer open={open} onOpenChange={onOpenChange} title={isEdit ? "Edit supplier" : "Add supplier"}>
      <div className="flex flex-col gap-5">
        <FormRow label="Name" required>
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Eswatini Agri Supplies" />
        </FormRow>
        <FormRow label="Contact person">
          <Input value={contactName} onChange={(e) => setContactName(e.target.value)} />
        </FormRow>
        <FormRow label="Phone">
          <Input value={phone} onChange={(e) => setPhone(e.target.value)} />
        </FormRow>
        <FormRow label="Email">
          <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
        </FormRow>
        <FormRow label="Address">
          <Textarea value={address} onChange={(e) => setAddress(e.target.value)} className="min-h-16" />
        </FormRow>
        {error && <FieldError>{error}</FieldError>}
        <div className="flex justify-end gap-2 pt-2">
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={submit} loading={saving}>
            {isEdit ? "Save changes" : "Add supplier"}
          </Button>
        </div>
      </div>
    </Drawer>
  );
}
