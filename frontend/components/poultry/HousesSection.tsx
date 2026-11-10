"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input, FieldError } from "@/components/ui/Input";
import { FormRow } from "@/components/ui/FormRow";
import { Select } from "@/components/ui/Select";
import { useToast } from "@/components/ui/Toast";
import { createClient } from "@/lib/supabase/client";
import type { Database, PoultryHouseType } from "@/lib/database.types";

type House = Database["public"]["Tables"]["poultry_houses"]["Row"];
type Pen = Database["public"]["Tables"]["poultry_pens"]["Row"];

const HOUSE_TYPES: { value: PoultryHouseType; label: string }[] = [
  { value: "combined", label: "Brooder and pens" },
  { value: "brooder", label: "Brooder only" },
  { value: "growout", label: "Grow-out only" },
];

export function HousesSection({
  tenantId,
  houses,
  pens,
  canManage,
}: {
  tenantId: string;
  houses: House[];
  pens: Pen[];
  canManage: boolean;
}) {
  const router = useRouter();
  const { addToast } = useToast();
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [houseType, setHouseType] = useState<PoultryHouseType>("combined");
  const [capacity, setCapacity] = useState("200");
  const [penHouseId, setPenHouseId] = useState(houses[0]?.id ?? "");
  const [penCode, setPenCode] = useState("");
  const [penName, setPenName] = useState("");
  const [penCapacity, setPenCapacity] = useState("200");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const saveHouse = async () => {
    setError(null);
    if (!code.trim() || !name.trim() || Number(capacity) <= 0) {
      setError("Enter a code, a name and a capacity");
      return;
    }
    setSaving(true);
    const supabase = createClient();
    const { error: saveError } = await supabase.from("poultry_houses").insert({
      tenant_id: tenantId,
      code: code.trim(),
      name: name.trim(),
      house_type: houseType,
      capacity_birds: Number(capacity),
    });
    setSaving(false);
    if (saveError) {
      setError(saveError.message);
      return;
    }
    addToast({ variant: "field", message: "House added" });
    setCode("");
    setName("");
    router.refresh();
  };

  const savePen = async () => {
    setError(null);
    if (!penHouseId || !penCode.trim() || !penName.trim() || Number(penCapacity) <= 0) {
      setError("Choose a house and enter the pen code, name and capacity");
      return;
    }
    setSaving(true);
    const supabase = createClient();
    const { error: saveError } = await supabase.from("poultry_pens").insert({
      tenant_id: tenantId,
      house_id: penHouseId,
      code: penCode.trim(),
      name: penName.trim(),
      capacity_birds: Number(penCapacity),
    });
    setSaving(false);
    if (saveError) {
      setError(saveError.message);
      return;
    }
    addToast({ variant: "field", message: "Pen added" });
    setPenCode("");
    setPenName("");
    router.refresh();
  };

  return (
    <div className="flex flex-col gap-4">
      {houses.length === 0 && (
        <p className="text-sm text-ink-500">Add the house the chicks go into. Pens A and B can be added under it.</p>
      )}
      <div className="grid gap-4 lg:grid-cols-2">
        {houses.map((house) => (
          <Card key={house.id} title={`${house.code} · ${house.name}`}>
            <p className="text-sm text-ink-500">
              {HOUSE_TYPES.find((t) => t.value === house.house_type)?.label} · {house.capacity_birds} birds
            </p>
            <ul className="mt-3 flex flex-col gap-1 text-sm text-ink-700">
              {pens.filter((p) => p.house_id === house.id).length === 0 && <li className="text-ink-400">No pens yet</li>}
              {pens
                .filter((p) => p.house_id === house.id)
                .map((pen) => (
                  <li key={pen.id}>
                    Pen {pen.code} · {pen.name} · {pen.capacity_birds} birds
                  </li>
                ))}
            </ul>
          </Card>
        ))}
      </div>

      {canManage && (
        <div className="grid gap-4 lg:grid-cols-2">
          <Card title="Add a house">
            <div className="flex flex-col gap-4">
              <FormRow label="Code" required>
                <Input value={code} onChange={(e) => setCode(e.target.value)} placeholder="H1" />
              </FormRow>
              <FormRow label="Name" required>
                <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="House 1" />
              </FormRow>
              <FormRow label="Type">
                <Select options={HOUSE_TYPES} value={houseType} onChange={(v) => setHouseType(v as PoultryHouseType)} />
              </FormRow>
              <FormRow label="Capacity (birds)" required>
                <Input type="number" value={capacity} onChange={(e) => setCapacity(e.target.value)} />
              </FormRow>
              <Button onClick={saveHouse} loading={saving}>
                Save house
              </Button>
            </div>
          </Card>
          <Card title="Add a pen">
            <div className="flex flex-col gap-4">
              <FormRow label="House" required>
                <Select
                  options={houses.map((h) => ({ value: h.id, label: `${h.code} · ${h.name}` }))}
                  value={penHouseId}
                  onChange={setPenHouseId}
                  placeholder="Choose a house"
                />
              </FormRow>
              <FormRow label="Code" required>
                <Input value={penCode} onChange={(e) => setPenCode(e.target.value)} placeholder="A" />
              </FormRow>
              <FormRow label="Name" required>
                <Input value={penName} onChange={(e) => setPenName(e.target.value)} placeholder="Pen A" />
              </FormRow>
              <FormRow label="Capacity (birds)" required>
                <Input type="number" value={penCapacity} onChange={(e) => setPenCapacity(e.target.value)} />
              </FormRow>
              <Button onClick={savePen} loading={saving} disabled={houses.length === 0}>
                Save pen
              </Button>
            </div>
          </Card>
        </div>
      )}
      {error && <FieldError>{error}</FieldError>}
    </div>
  );
}
