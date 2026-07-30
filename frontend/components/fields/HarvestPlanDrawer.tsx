"use client";

import { useEffect, useState } from "react";
import { Drawer } from "@/components/ui/Drawer";
import { Input, FieldError, Textarea } from "@/components/ui/Input";
import { FormRow } from "@/components/ui/FormRow";
import { DatePicker } from "@/components/ui/DatePicker";
import { Button } from "@/components/ui/Button";
import { useToast } from "@/components/ui/Toast";
import { createClient } from "@/lib/supabase/client";

export interface HarvestPlanDrawerProps {
  tenantId: string;
  fieldId: string;
  cropCycleId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved: () => void;
}

export function HarvestPlanDrawer({ tenantId, fieldId, cropCycleId, open, onOpenChange, onSaved }: HarvestPlanDrawerProps) {
  const { addToast } = useToast();
  const [cuttingDate, setCuttingDate] = useState<Date | undefined>(undefined);
  const [burnPermitRef, setBurnPermitRef] = useState("");
  const [burnDate, setBurnDate] = useState<Date | undefined>(undefined);
  const [contractor, setContractor] = useState("");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setCuttingDate(undefined);
    setBurnPermitRef("");
    setBurnDate(undefined);
    setContractor("");
    setNotes("");
    setError(null);
  }, [open]);

  const submit = async () => {
    setError(null);
    setSaving(true);
    const supabase = createClient();
    const { error: saveError } = await supabase.from("harvest_plans").insert({
      tenant_id: tenantId,
      field_id: fieldId,
      crop_cycle_id: cropCycleId,
      cutting_date_planned: cuttingDate ? cuttingDate.toISOString().slice(0, 10) : null,
      burn_permit_ref: burnPermitRef || null,
      burn_date: burnDate ? burnDate.toISOString().slice(0, 10) : null,
      cutting_contractor: contractor || null,
      status: burnDate ? "burn_scheduled" : "planned",
      notes: notes || null,
    });
    setSaving(false);

    if (saveError) {
      setError(saveError.message);
      return;
    }

    addToast({ variant: "field", message: "Harvest planned" });
    onOpenChange(false);
    onSaved();
  };

  return (
    <Drawer open={open} onOpenChange={onOpenChange} title="Plan harvest">
      <div className="flex flex-col gap-5">
        <FormRow label="Planned cutting date">
          <DatePicker value={cuttingDate} onChange={setCuttingDate} />
        </FormRow>
        <FormRow label="Cutting contractor">
          <Input value={contractor} onChange={(e) => setContractor(e.target.value)} />
        </FormRow>
        <FormRow label="Burn permit reference">
          <Input value={burnPermitRef} onChange={(e) => setBurnPermitRef(e.target.value)} />
        </FormRow>
        <FormRow label="Burn date">
          <DatePicker value={burnDate} onChange={setBurnDate} />
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
            Save plan
          </Button>
        </div>
      </div>
    </Drawer>
  );
}
