"use client";

import { useEffect, useState } from "react";
import { Drawer } from "@/components/ui/Drawer";
import { Input, FieldError, Textarea } from "@/components/ui/Input";
import { FormRow } from "@/components/ui/FormRow";
import { Button } from "@/components/ui/Button";
import { useToast } from "@/components/ui/Toast";
import { createClient } from "@/lib/supabase/client";
import type { Database } from "@/lib/database.types";

type DeliveryDetailRow = Database["public"]["Views"]["delivery_details"]["Row"];

export interface MillResultDrawerProps {
  delivery: DeliveryDetailRow;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved: () => void;
}

export function MillResultDrawer({ delivery, open, onOpenChange, onSaved }: MillResultDrawerProps) {
  const { addToast } = useToast();
  const [tonnesAccepted, setTonnesAccepted] = useState("");
  const [sucrosePct, setSucrosePct] = useState("");
  const [rvValue, setRvValue] = useState("");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setTonnesAccepted(delivery.tonnes_accepted != null ? String(delivery.tonnes_accepted) : String(delivery.tonnes_loaded));
    setSucrosePct(delivery.sucrose_pct != null ? String(delivery.sucrose_pct) : "");
    setRvValue(delivery.rv_value != null ? String(delivery.rv_value) : "");
    setNotes(delivery.mill_result_notes ?? "");
    setError(null);
  }, [open, delivery]);

  const submit = async () => {
    setError(null);
    const tonnes = Number(tonnesAccepted);
    const sucrose = Number(sucrosePct);
    if (!tonnesAccepted || tonnes < 0) {
      setError("Enter the tonnes accepted by the mill");
      return;
    }
    if (!sucrosePct || sucrose <= 0 || sucrose > 20) {
      setError("Enter a sucrose % between 0 and 20");
      return;
    }
    setSaving(true);
    const supabase = createClient();
    const { error: rpcError } = await supabase.rpc("record_mill_result", {
      p_delivery_id: delivery.id,
      p_tonnes_accepted: tonnes,
      p_sucrose_pct: sucrose,
      p_rv_value: rvValue ? Number(rvValue) : null,
      p_notes: notes || null,
    });
    setSaving(false);

    if (rpcError) {
      setError(rpcError.message);
      return;
    }

    addToast({ variant: "field", message: "Mill result captured" });
    onOpenChange(false);
    onSaved();
  };

  return (
    <Drawer open={open} onOpenChange={onOpenChange} title="Capture mill result">
      <div className="flex flex-col gap-5">
        <FormRow label="Tonnes accepted" required>
          <Input type="number" step="0.01" value={tonnesAccepted} onChange={(e) => setTonnesAccepted(e.target.value)} />
        </FormRow>
        <FormRow label="Sucrose %" required hint="0–20">
          <Input type="number" step="0.01" value={sucrosePct} onChange={(e) => setSucrosePct(e.target.value)} />
        </FormRow>
        <FormRow label="RV / ERC value" hint="Optional — from the mill statement">
          <Input type="number" step="0.001" value={rvValue} onChange={(e) => setRvValue(e.target.value)} />
        </FormRow>
        <FormRow label="Notes">
          <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} className="min-h-16" />
        </FormRow>
        {error && <FieldError>{error}</FieldError>}
        <div className="flex justify-end gap-2 pt-2">
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={submit} loading={saving}>
            Save result
          </Button>
        </div>
      </div>
    </Drawer>
  );
}
