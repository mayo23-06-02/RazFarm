"use client";

import { useEffect, useState } from "react";
import { Drawer } from "@/components/ui/Drawer";
import { Input, FieldError, Textarea } from "@/components/ui/Input";
import { FormRow } from "@/components/ui/FormRow";
import { Select } from "@/components/ui/Select";
import { Button } from "@/components/ui/Button";
import { useToast } from "@/components/ui/Toast";
import { createClient } from "@/lib/supabase/client";
import type { Database, IrrigationType, FieldStatus } from "@/lib/database.types";

type FieldRow = Database["public"]["Tables"]["fields"]["Row"];

const IRRIGATION_OPTIONS: { value: IrrigationType; label: string }[] = [
  { value: "furrow", label: "Furrow" },
  { value: "sprinkler", label: "Sprinkler" },
  { value: "drip", label: "Drip" },
  { value: "rainfed", label: "Rainfed" },
];

const STATUS_OPTIONS: { value: FieldStatus; label: string }[] = [
  { value: "active", label: "Active" },
  { value: "fallow", label: "Fallow" },
  { value: "harvesting", label: "Harvesting" },
  { value: "replanting", label: "Replanting" },
  { value: "retired", label: "Retired" },
];

export interface FieldFormDrawerProps {
  tenantId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  field?: FieldRow | null;
  members: { id: string; full_name: string }[];
  onSaved: () => void;
}

export function FieldFormDrawer({ tenantId, open, onOpenChange, field, members, onSaved }: FieldFormDrawerProps) {
  const { addToast } = useToast();
  const isEdit = !!field;
  const [code, setCode] = useState("");
  const [memberId, setMemberId] = useState("");
  const [hectares, setHectares] = useState("");
  const [variety, setVariety] = useState("");
  const [irrigationType, setIrrigationType] = useState<IrrigationType>("rainfed");
  const [status, setStatus] = useState<FieldStatus>("active");
  const [gpsLat, setGpsLat] = useState("");
  const [gpsLng, setGpsLng] = useState("");
  const [soilNotes, setSoilNotes] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setCode(field?.code ?? "");
    setMemberId(field?.member_id ?? "");
    setHectares(field ? String(field.hectares) : "");
    setVariety(field?.variety ?? "");
    setIrrigationType(field?.irrigation_type ?? "rainfed");
    setStatus(field?.status ?? "active");
    setGpsLat(field?.gps_lat != null ? String(field.gps_lat) : "");
    setGpsLng(field?.gps_lng != null ? String(field.gps_lng) : "");
    setSoilNotes(field?.soil_notes ?? "");
    setError(null);
  }, [open, field]);

  const submit = async () => {
    setError(null);
    if (!code.trim()) {
      setError("Enter a field code");
      return;
    }
    const hectaresNum = Number(hectares);
    if (!hectaresNum || hectaresNum <= 0) {
      setError("Enter the field size in hectares");
      return;
    }

    setSaving(true);
    const supabase = createClient();
    const payload = {
      code: code.trim(),
      member_id: memberId || null,
      hectares: hectaresNum,
      variety: variety || null,
      irrigation_type: irrigationType,
      status,
      gps_lat: gpsLat ? Number(gpsLat) : null,
      gps_lng: gpsLng ? Number(gpsLng) : null,
      soil_notes: soilNotes || null,
    };

    const { error: saveError } = isEdit
      ? await supabase.from("fields").update(payload).eq("id", field!.id)
      : await supabase.from("fields").insert({ tenant_id: tenantId, ...payload });
    setSaving(false);

    if (saveError) {
      setError(saveError.message);
      return;
    }

    addToast({ variant: "field", message: isEdit ? "Field updated" : "Field added" });
    onOpenChange(false);
    onSaved();
  };

  return (
    <Drawer open={open} onOpenChange={onOpenChange} title={isEdit ? "Edit field" : "Add field"}>
      <div className="flex flex-col gap-5">
        <FormRow label="Field code" required>
          <Input value={code} onChange={(e) => setCode(e.target.value)} placeholder="e.g. F-014" />
        </FormRow>
        <FormRow label="Hectares" required>
          <Input type="number" step="0.01" value={hectares} onChange={(e) => setHectares(e.target.value)} />
        </FormRow>
        <FormRow label="Variety">
          <Input value={variety} onChange={(e) => setVariety(e.target.value)} placeholder="e.g. N41" />
        </FormRow>
        <FormRow label="Irrigation type" required>
          <Select
            options={IRRIGATION_OPTIONS}
            value={irrigationType}
            onChange={(v) => setIrrigationType(v as IrrigationType)}
          />
        </FormRow>
        <FormRow label="Plot owner">
          <Select
            options={[{ value: "", label: "Unallocated / association land" }, ...members.map((m) => ({ value: m.id, label: m.full_name }))]}
            value={memberId}
            onChange={setMemberId}
          />
        </FormRow>
        <FormRow label="Status" required>
          <Select options={STATUS_OPTIONS} value={status} onChange={(v) => setStatus(v as FieldStatus)} />
        </FormRow>
        <div className="grid grid-cols-2 gap-3">
          <FormRow label="GPS latitude">
            <Input type="number" step="0.000001" value={gpsLat} onChange={(e) => setGpsLat(e.target.value)} placeholder="-26.5225" />
          </FormRow>
          <FormRow label="GPS longitude">
            <Input type="number" step="0.000001" value={gpsLng} onChange={(e) => setGpsLng(e.target.value)} placeholder="31.9963" />
          </FormRow>
        </div>
        <FormRow label="Soil notes">
          <Textarea value={soilNotes} onChange={(e) => setSoilNotes(e.target.value)} className="min-h-16" />
        </FormRow>
        {error && <FieldError>{error}</FieldError>}
        <div className="flex justify-end gap-2 pt-2">
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={submit} loading={saving}>
            {isEdit ? "Save changes" : "Add field"}
          </Button>
        </div>
      </div>
    </Drawer>
  );
}
