"use client";

import { useEffect, useState } from "react";
import { Drawer } from "@/components/ui/Drawer";
import { FormRow } from "@/components/ui/FormRow";
import { DatePicker } from "@/components/ui/DatePicker";
import { Input, FieldError } from "@/components/ui/Input";
import { MoneyInput } from "@/components/ui/MoneyInput";
import { Button } from "@/components/ui/Button";
import { useToast } from "@/components/ui/Toast";
import { formatDate } from "@/lib/formatDate";
import { createClient } from "@/lib/supabase/client";
import type { Database } from "@/lib/database.types";

type ItemRow = Database["public"]["Tables"]["inventory_items"]["Row"];
type ServiceLogRow = Database["public"]["Tables"]["equipment_service_log"]["Row"];

function money(v: number) {
  return v.toLocaleString("en-SZ", { minimumFractionDigits: 2 });
}

export interface EquipmentServiceLogDrawerProps {
  tenantId: string;
  item: ItemRow | null;
  onOpenChange: (open: boolean) => void;
  canManage: boolean;
}

export function EquipmentServiceLogDrawer({ tenantId, item, onOpenChange, canManage }: EquipmentServiceLogDrawerProps) {
  const { addToast } = useToast();
  const [entries, setEntries] = useState<ServiceLogRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [serviceDate, setServiceDate] = useState<Date | undefined>(new Date());
  const [description, setDescription] = useState("");
  const [cost, setCost] = useState(0);
  const [performedBy, setPerformedBy] = useState("");
  const [odometerOrHours, setOdometerOrHours] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    if (!item) return;
    setLoading(true);
    const supabase = createClient();
    const { data } = await supabase
      .from("equipment_service_log")
      .select("*")
      .eq("item_id", item.id)
      .order("service_date", { ascending: false });
    setEntries(data ?? []);
    setLoading(false);
  };

  useEffect(() => {
    if (!item) return;
    setServiceDate(new Date());
    setDescription("");
    setCost(0);
    setPerformedBy("");
    setOdometerOrHours("");
    setError(null);
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [item]);

  const submit = async () => {
    if (!item) return;
    setError(null);
    if (!description.trim()) {
      setError("Describe what work was done");
      return;
    }
    setSaving(true);
    const supabase = createClient();
    const { error: saveError } = await supabase.from("equipment_service_log").insert({
      tenant_id: tenantId,
      item_id: item.id,
      service_date: serviceDate ? serviceDate.toISOString().slice(0, 10) : new Date().toISOString().slice(0, 10),
      description: description.trim(),
      cost,
      performed_by: performedBy.trim() || null,
      odometer_or_hours: odometerOrHours.trim() ? Number(odometerOrHours) : null,
    });
    setSaving(false);
    if (saveError) {
      setError(saveError.message);
      return;
    }
    addToast({ variant: "field", message: "Service entry added" });
    setDescription("");
    setCost(0);
    setPerformedBy("");
    setOdometerOrHours("");
    load();
  };

  return (
    <Drawer open={!!item} onOpenChange={onOpenChange} title={item ? `Service log — ${item.name}` : "Service log"} width={560}>
      <div className="flex flex-col gap-5">
        <div className="flex flex-col gap-2">
          {loading && <p className="text-sm text-ink-400">Loading…</p>}
          {!loading && entries.length === 0 && <p className="text-sm text-ink-400">No service history recorded yet.</p>}
          {entries.map((e) => (
            <div key={e.id} className="rounded-card border border-paper-200 bg-paper-0 px-4 py-3">
              <div className="flex items-baseline justify-between gap-2">
                <p className="text-sm font-medium text-ink-900">{formatDate(e.service_date)}</p>
                <p className="text-sm tabular-nums text-ink-700">{money(e.cost)}</p>
              </div>
              <p className="text-sm text-ink-700">{e.description}</p>
              {(e.performed_by || e.odometer_or_hours != null) && (
                <p className="text-xs text-ink-400">
                  {e.performed_by ?? ""}
                  {e.performed_by && e.odometer_or_hours != null ? " · " : ""}
                  {e.odometer_or_hours != null ? `${e.odometer_or_hours} odo/hrs` : ""}
                </p>
              )}
            </div>
          ))}
        </div>

        {canManage && (
          <div className="flex flex-col gap-4 border-t border-paper-200 pt-4">
            <p className="text-sm font-medium text-ink-900">Add entry</p>
            <FormRow label="Date" required>
              <DatePicker value={serviceDate} onChange={setServiceDate} />
            </FormRow>
            <FormRow label="Work done" required>
              <Input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="e.g. Oil change and filter replacement" />
            </FormRow>
            <FormRow label="Cost" hint="Optional — leave as 0 if not applicable">
              <MoneyInput value={cost} onValueChange={setCost} />
            </FormRow>
            <FormRow label="Performed by" hint="Optional — mechanic or workshop name">
              <Input value={performedBy} onChange={(e) => setPerformedBy(e.target.value)} />
            </FormRow>
            <FormRow label="Odometer / hours" hint="Optional — reading at time of service">
              <Input type="number" step="0.01" value={odometerOrHours} onChange={(e) => setOdometerOrHours(e.target.value)} />
            </FormRow>
            {error && <FieldError>{error}</FieldError>}
            <div className="flex justify-end">
              <Button onClick={submit} loading={saving}>
                Add entry
              </Button>
            </div>
          </div>
        )}
      </div>
    </Drawer>
  );
}
