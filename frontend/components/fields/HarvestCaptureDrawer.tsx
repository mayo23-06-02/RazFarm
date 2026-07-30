"use client";

import { useEffect, useState } from "react";
import { Drawer } from "@/components/ui/Drawer";
import { Input, FieldError, Textarea } from "@/components/ui/Input";
import { FormRow } from "@/components/ui/FormRow";
import { DatePicker } from "@/components/ui/DatePicker";
import { Select } from "@/components/ui/Select";
import { Button } from "@/components/ui/Button";
import { useToast } from "@/components/ui/Toast";
import { createClient } from "@/lib/supabase/client";

export interface HarvestCaptureDrawerProps {
  tenantId: string;
  fieldId: string;
  cropCycleId: string;
  harvestPlans: { id: string; label: string }[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved: () => void;
}

export function HarvestCaptureDrawer({ tenantId, fieldId, cropCycleId, harvestPlans, open, onOpenChange, onSaved }: HarvestCaptureDrawerProps) {
  const { addToast } = useToast();
  const [captureDate, setCaptureDate] = useState<Date | undefined>(new Date());
  const [tonnesCut, setTonnesCut] = useState("");
  const [cutterTeam, setCutterTeam] = useState("");
  const [fieldEdgeStock, setFieldEdgeStock] = useState("");
  const [harvestPlanId, setHarvestPlanId] = useState("");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setCaptureDate(new Date());
    setTonnesCut("");
    setCutterTeam("");
    setFieldEdgeStock("");
    setHarvestPlanId(harvestPlans[0]?.id ?? "");
    setNotes("");
    setError(null);
  }, [open, harvestPlans]);

  const submit = async () => {
    setError(null);
    if (!captureDate) {
      setError("Pick a capture date");
      return;
    }
    const tonnes = Number(tonnesCut);
    if (!tonnes || tonnes === 0) {
      setError("Enter tonnes cut (use a negative value only to correct an earlier entry)");
      return;
    }
    setSaving(true);
    const supabase = createClient();
    const { error: saveError } = await supabase.from("harvest_captures").insert({
      tenant_id: tenantId,
      field_id: fieldId,
      crop_cycle_id: cropCycleId,
      harvest_plan_id: harvestPlanId || null,
      capture_date: captureDate.toISOString().slice(0, 10),
      tonnes_cut: tonnes,
      cutter_team: cutterTeam || null,
      field_edge_stock_tonnes: fieldEdgeStock ? Number(fieldEdgeStock) : 0,
      notes: notes || null,
    });
    setSaving(false);

    if (saveError) {
      setError(saveError.message);
      return;
    }

    addToast({ variant: "field", message: "Harvest captured" });
    onOpenChange(false);
    onSaved();
  };

  return (
    <Drawer open={open} onOpenChange={onOpenChange} title="Capture daily harvest">
      <div className="flex flex-col gap-5">
        <FormRow label="Capture date" required>
          <DatePicker value={captureDate} onChange={setCaptureDate} />
        </FormRow>
        <FormRow label="Tonnes cut" required hint="Enter a negative value to correct an earlier entry">
          <Input type="number" step="0.01" value={tonnesCut} onChange={(e) => setTonnesCut(e.target.value)} />
        </FormRow>
        <FormRow label="Cutter team">
          <Input value={cutterTeam} onChange={(e) => setCutterTeam(e.target.value)} placeholder="e.g. Team 3" />
        </FormRow>
        <FormRow label="Field-edge stock" hint="Tonnes cut but not yet loaded">
          <Input type="number" step="0.01" value={fieldEdgeStock} onChange={(e) => setFieldEdgeStock(e.target.value)} />
        </FormRow>
        {harvestPlans.length > 0 && (
          <FormRow label="Harvest plan">
            <Select options={[{ value: "", label: "No linked plan" }, ...harvestPlans.map((p) => ({ value: p.id, label: p.label }))]} value={harvestPlanId} onChange={setHarvestPlanId} />
          </FormRow>
        )}
        <FormRow label="Notes">
          <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} className="min-h-16" />
        </FormRow>
        {error && <FieldError>{error}</FieldError>}
        <div className="flex justify-end gap-2 pt-2">
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={submit} loading={saving}>
            Capture
          </Button>
        </div>
      </div>
    </Drawer>
  );
}
