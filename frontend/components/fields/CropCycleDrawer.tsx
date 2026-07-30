"use client";

import { useEffect, useState } from "react";
import { Drawer } from "@/components/ui/Drawer";
import { Input, FieldError } from "@/components/ui/Input";
import { FormRow } from "@/components/ui/FormRow";
import { Select } from "@/components/ui/Select";
import { DatePicker } from "@/components/ui/DatePicker";
import { Button } from "@/components/ui/Button";
import { useToast } from "@/components/ui/Toast";
import { createClient } from "@/lib/supabase/client";
import type { CropCycleType, IrrigationType } from "@/lib/database.types";

const CYCLE_TYPE_OPTIONS: { value: CropCycleType; label: string }[] = [
  { value: "plant", label: "Plant crop (new field / new ratoon 0)" },
  { value: "ratoon", label: "Ratoon (regrowth from existing rootstock)" },
];

const IRRIGATION_OPTIONS: { value: IrrigationType; label: string }[] = [
  { value: "furrow", label: "Furrow" },
  { value: "sprinkler", label: "Sprinkler" },
  { value: "drip", label: "Drip" },
  { value: "rainfed", label: "Rainfed" },
];

export interface CropCycleDrawerProps {
  fieldId: string;
  /** Starts a brand-new cycle when there's no open one on the field. */
  mode: "start";
  nextRatoonNumber: number;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved: () => void;
}

export interface PloughOutDrawerProps {
  mode: "replant";
  cropCycleId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved: () => void;
}

export function CropCycleDrawer(props: CropCycleDrawerProps | PloughOutDrawerProps) {
  const { addToast } = useToast();
  const [cycleType, setCycleType] = useState<CropCycleType>("plant");
  const [plantedDate, setPlantedDate] = useState<Date | undefined>(new Date());
  const [ploughedOutDate, setPloughedOutDate] = useState<Date | undefined>(new Date());
  const [variety, setVariety] = useState("");
  const [irrigationType, setIrrigationType] = useState<IrrigationType | "">("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!props.open) return;
    setCycleType("plant");
    setPlantedDate(new Date());
    setPloughedOutDate(new Date());
    setVariety("");
    setIrrigationType("");
    setError(null);
  }, [props.open]);

  const submit = async () => {
    setError(null);
    if (!plantedDate) {
      setError("Pick a planting date");
      return;
    }
    setSaving(true);
    const supabase = createClient();

    if (props.mode === "start") {
      const ratoonNumber = cycleType === "plant" ? 0 : props.nextRatoonNumber;
      const { error: rpcError } = await supabase.rpc("start_crop_cycle", {
        p_field_id: props.fieldId,
        p_cycle_type: cycleType,
        p_ratoon_number: ratoonNumber,
        p_planted_date: plantedDate.toISOString().slice(0, 10),
        p_expected_harvest_date: null,
      });
      setSaving(false);
      if (rpcError) {
        setError(rpcError.message);
        return;
      }
      addToast({ variant: "field", message: "Crop cycle started" });
    } else {
      if (!ploughedOutDate) {
        setSaving(false);
        setError("Pick a plough-out date");
        return;
      }
      const { error: rpcError } = await supabase.rpc("plough_out_and_replant", {
        p_crop_cycle_id: props.cropCycleId,
        p_ploughed_out_date: ploughedOutDate.toISOString().slice(0, 10),
        p_new_planted_date: plantedDate.toISOString().slice(0, 10),
        p_new_variety: variety || null,
        p_new_irrigation_type: irrigationType || null,
      });
      setSaving(false);
      if (rpcError) {
        setError(rpcError.message);
        return;
      }
      addToast({ variant: "field", message: "Field ploughed out and replanted" });
    }

    props.onOpenChange(false);
    props.onSaved();
  };

  return (
    <Drawer open={props.open} onOpenChange={props.onOpenChange} title={props.mode === "start" ? "Start crop cycle" : "Plough out & replant"}>
      <div className="flex flex-col gap-5">
        {props.mode === "start" && (
          <FormRow label="Cycle type" required>
            <Select options={CYCLE_TYPE_OPTIONS} value={cycleType} onChange={(v) => setCycleType(v as CropCycleType)} />
          </FormRow>
        )}
        {props.mode === "replant" && (
          <FormRow label="Plough-out date" required>
            <DatePicker value={ploughedOutDate} onChange={setPloughedOutDate} />
          </FormRow>
        )}
        <FormRow label={props.mode === "start" ? "Planting date" : "Replant date"} required>
          <DatePicker value={plantedDate} onChange={setPlantedDate} />
        </FormRow>
        {props.mode === "replant" && (
          <>
            <FormRow label="New variety" hint="Leave blank to keep the field's current variety">
              <Input value={variety} onChange={(e) => setVariety(e.target.value)} placeholder="e.g. N41" />
            </FormRow>
            <FormRow label="New irrigation type" hint="Leave blank to keep the current setup">
              <Select options={[{ value: "", label: "Keep current" }, ...IRRIGATION_OPTIONS]} value={irrigationType} onChange={(v) => setIrrigationType(v as IrrigationType)} />
            </FormRow>
          </>
        )}
        {error && <FieldError>{error}</FieldError>}
        <div className="flex justify-end gap-2 pt-2">
          <Button variant="ghost" onClick={() => props.onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={submit} loading={saving}>
            {props.mode === "start" ? "Start cycle" : "Plough out & replant"}
          </Button>
        </div>
      </div>
    </Drawer>
  );
}
