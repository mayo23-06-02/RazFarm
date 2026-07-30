"use client";

import { useEffect, useState } from "react";
import { Drawer } from "@/components/ui/Drawer";
import { Input, FieldError, Textarea } from "@/components/ui/Input";
import { FormRow } from "@/components/ui/FormRow";
import { Select } from "@/components/ui/Select";
import { DatePicker } from "@/components/ui/DatePicker";
import { MoneyInput } from "@/components/ui/MoneyInput";
import { Button } from "@/components/ui/Button";
import { useToast } from "@/components/ui/Toast";
import { createClient } from "@/lib/supabase/client";
import type { FieldActivityType } from "@/lib/database.types";

const ACTIVITY_OPTIONS: { value: FieldActivityType; label: string }[] = [
  { value: "land_prep", label: "Land preparation" },
  { value: "planting", label: "Planting" },
  { value: "fertilizer", label: "Fertilizer application" },
  { value: "herbicide", label: "Herbicide" },
  { value: "pesticide", label: "Pesticide" },
  { value: "ripener", label: "Ripener application" },
  { value: "irrigation", label: "Irrigation event" },
  { value: "other", label: "Other" },
];

export interface FieldActivityDrawerProps {
  tenantId: string;
  fieldId: string;
  cropCycleId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved: () => void;
}

export function FieldActivityDrawer({ tenantId, fieldId, cropCycleId, open, onOpenChange, onSaved }: FieldActivityDrawerProps) {
  const { addToast } = useToast();
  const [activityType, setActivityType] = useState<FieldActivityType>("fertilizer");
  const [activityDate, setActivityDate] = useState<Date | undefined>(new Date());
  const [product, setProduct] = useState("");
  const [rate, setRate] = useState("");
  const [rateUnit, setRateUnit] = useState("kg/ha");
  const [cost, setCost] = useState(0);
  const [notes, setNotes] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setActivityType("fertilizer");
    setActivityDate(new Date());
    setProduct("");
    setRate("");
    setRateUnit("kg/ha");
    setCost(0);
    setNotes("");
    setError(null);
  }, [open]);

  const submit = async () => {
    setError(null);
    if (!activityDate) {
      setError("Pick a date for this activity");
      return;
    }
    setSaving(true);
    const supabase = createClient();
    const { error: saveError } = await supabase.from("field_activities").insert({
      tenant_id: tenantId,
      field_id: fieldId,
      crop_cycle_id: cropCycleId,
      activity_type: activityType,
      activity_date: activityDate.toISOString().slice(0, 10),
      product: product || null,
      rate: rate ? Number(rate) : null,
      rate_unit: rate ? rateUnit : null,
      cost,
      notes: notes || null,
    });
    setSaving(false);

    if (saveError) {
      setError(saveError.message);
      return;
    }

    addToast({ variant: "field", message: "Activity logged" });
    onOpenChange(false);
    onSaved();
  };

  return (
    <Drawer open={open} onOpenChange={onOpenChange} title="Log field activity">
      <div className="flex flex-col gap-5">
        <FormRow label="Activity type" required>
          <Select options={ACTIVITY_OPTIONS} value={activityType} onChange={(v) => setActivityType(v as FieldActivityType)} />
        </FormRow>
        <FormRow label="Date" required>
          <DatePicker value={activityDate} onChange={setActivityDate} />
        </FormRow>
        <FormRow label="Product" hint="Fertilizer, chemical or ripener name">
          <Input value={product} onChange={(e) => setProduct(e.target.value)} placeholder="e.g. LAN 28%" />
        </FormRow>
        <div className="grid grid-cols-2 gap-3">
          <FormRow label="Rate">
            <Input type="number" step="0.01" value={rate} onChange={(e) => setRate(e.target.value)} />
          </FormRow>
          <FormRow label="Unit">
            <Input value={rateUnit} onChange={(e) => setRateUnit(e.target.value)} placeholder="kg/ha" />
          </FormRow>
        </div>
        <FormRow label="Cost">
          <MoneyInput value={cost} onValueChange={setCost} />
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
            Log activity
          </Button>
        </div>
      </div>
    </Drawer>
  );
}
