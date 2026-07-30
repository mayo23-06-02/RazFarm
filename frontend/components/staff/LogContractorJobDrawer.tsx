"use client";

import { useEffect, useMemo, useState } from "react";
import { Drawer } from "@/components/ui/Drawer";
import { FieldError } from "@/components/ui/Input";
import { FormRow } from "@/components/ui/FormRow";
import { Select } from "@/components/ui/Select";
import { Toggle } from "@/components/ui/Checkbox";
import { Textarea } from "@/components/ui/Input";
import { MoneyInput } from "@/components/ui/MoneyInput";
import { DatePicker } from "@/components/ui/DatePicker";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { useToast } from "@/components/ui/Toast";
import { createClient } from "@/lib/supabase/client";
import { formatMoney } from "@/lib/formatMoney";
import type { Database, ContractorRateBasis } from "@/lib/database.types";

type ContractorRow = Database["public"]["Views"]["contractors_directory"]["Row"];
type FieldRow = { id: string; code: string };

const QUANTITY_UNIT: Record<ContractorRateBasis, string> = {
  per_tonne: "tonnes",
  per_hectare: "hectares",
  per_job: "jobs",
  fixed: "(fixed amount — quantity not used)",
};

function toIso(d: Date) {
  return d.toISOString().slice(0, 10);
}

export interface LogContractorJobDrawerProps {
  tenantId: string;
  userId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Preselect + lock the contractor (e.g. launched from a contractor row). */
  presetContractorId?: string;
  /** Preselect + lock the field (e.g. launched from a field's detail page). */
  presetFieldId?: string;
  onSaved: () => void;
}

export function LogContractorJobDrawer({
  tenantId,
  userId,
  open,
  onOpenChange,
  presetContractorId,
  presetFieldId,
  onSaved,
}: LogContractorJobDrawerProps) {
  const { addToast } = useToast();
  const [contractors, setContractors] = useState<ContractorRow[]>([]);
  const [fields, setFields] = useState<FieldRow[]>([]);
  const [loadingOptions, setLoadingOptions] = useState(false);

  const [contractorId, setContractorId] = useState("");
  const [fieldId, setFieldId] = useState("");
  const [jobDate, setJobDate] = useState<Date>(new Date());
  const [quantity, setQuantity] = useState(0);
  const [isOverride, setIsOverride] = useState(false);
  const [overrideAmount, setOverrideAmount] = useState(0);
  const [overrideReason, setOverrideReason] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setContractorId(presetContractorId ?? "");
    setFieldId(presetFieldId ?? "");
    setJobDate(new Date());
    setQuantity(0);
    setIsOverride(false);
    setOverrideAmount(0);
    setOverrideReason("");
    setError(null);

    let cancelled = false;
    setLoadingOptions(true);
    (async () => {
      const supabase = createClient();
      const [{ data: contractorRows }, { data: fieldRows }] = await Promise.all([
        supabase.from("contractors_directory").select("*").eq("tenant_id", tenantId).eq("status", "active").order("business_name", { ascending: true }),
        supabase.from("fields").select("id, code").eq("tenant_id", tenantId).order("code", { ascending: true }),
      ]);
      if (cancelled) return;
      setContractors(contractorRows ?? []);
      setFields(fieldRows ?? []);
      setLoadingOptions(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [open, presetContractorId, presetFieldId, tenantId]);

  const selectedContractor = contractors.find((c) => c.id === contractorId) ?? null;
  const isFixed = selectedContractor?.rate_basis === "fixed";

  const autoAmount = useMemo(() => {
    if (!selectedContractor) return 0;
    if (isFixed) return selectedContractor.rate_amount;
    return quantity * selectedContractor.rate_amount;
  }, [selectedContractor, isFixed, quantity]);

  const finalAmount = isOverride ? overrideAmount : autoAmount;

  const submit = async () => {
    setError(null);
    if (!selectedContractor) return setError("Select a contractor");
    if (!isFixed && quantity <= 0) return setError("Enter a quantity greater than zero");
    if (isOverride && !overrideReason.trim()) return setError("Enter a reason for the override");

    setSaving(true);
    const supabase = createClient();
    const { error: saveError } = await supabase.from("contractor_jobs").insert({
      tenant_id: tenantId,
      contractor_id: selectedContractor.id,
      field_id: fieldId || null,
      service_type: selectedContractor.service_type,
      job_date: toIso(jobDate),
      quantity: isFixed ? 1 : quantity,
      computed_amount: finalAmount,
      is_override: isOverride,
      override_reason: isOverride ? overrideReason.trim() : null,
      recorded_by: userId,
    });
    setSaving(false);

    if (saveError) {
      setError(saveError.message);
      return;
    }

    addToast({ variant: "field", message: "Contractor job logged" });
    onOpenChange(false);
    onSaved();
  };

  return (
    <Drawer open={open} onOpenChange={onOpenChange} title="Log contractor job" width={480}>
      <div className="flex flex-col gap-5">
        <FormRow label="Contractor" required>
          <Select
            options={contractors.map((c) => ({ value: c.id, label: `${c.business_name} (${c.service_type})` }))}
            value={contractorId}
            onChange={setContractorId}
            disabled={!!presetContractorId || loadingOptions}
            placeholder={loadingOptions ? "Loading…" : "Select a contractor"}
          />
        </FormRow>
        {selectedContractor && (
          <div className="flex items-center gap-2 text-sm text-ink-500">
            <Badge variant="neutral">{selectedContractor.service_type}</Badge>
            <span>
              {selectedContractor.rate_basis.replace(/_/g, " ")} · {formatMoney(selectedContractor.rate_amount, { withPrefix: true })}
            </span>
          </div>
        )}
        <FormRow label="Field" hint="Optional">
          <Select
            options={[{ value: "", label: "No field" }, ...fields.map((f) => ({ value: f.id, label: f.code }))]}
            value={fieldId}
            onChange={setFieldId}
            disabled={!!presetFieldId || loadingOptions}
            placeholder="Select a field"
          />
        </FormRow>
        <FormRow label="Job date">
          <DatePicker value={jobDate} onChange={setJobDate} />
        </FormRow>
        {!isFixed && (
          <FormRow label={`Quantity${selectedContractor ? ` (${QUANTITY_UNIT[selectedContractor.rate_basis]})` : ""}`} required>
            <input
              type="number"
              min={0}
              step="0.01"
              value={quantity || ""}
              onChange={(e) => setQuantity(Number(e.target.value) || 0)}
              className="flex h-10 w-full items-center rounded-ctrl border border-paper-200 bg-paper-0 px-3 text-right text-sm tabular-nums outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500"
            />
          </FormRow>
        )}

        <div className="flex items-center justify-between rounded-ctrl border border-paper-200 bg-paper-50 px-3 py-2.5">
          <span className="text-sm text-ink-500">Computed amount</span>
          <span className="font-display text-lg font-semibold tabular-nums text-ink-900">{formatMoney(finalAmount, { withPrefix: true })}</span>
        </div>

        <Toggle checked={isOverride} onChange={setIsOverride} label="Override the computed amount" />
        {isOverride && (
          <>
            <FormRow label="Override amount" required>
              <MoneyInput value={overrideAmount} onValueChange={setOverrideAmount} />
            </FormRow>
            <FormRow label="Reason for override" required>
              <Textarea value={overrideReason} onChange={(e) => setOverrideReason(e.target.value)} className="min-h-16" placeholder="e.g. negotiated a flat rate for this job" />
            </FormRow>
          </>
        )}

        {error && <FieldError>{error}</FieldError>}
        <div className="flex justify-end gap-2 pt-2">
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={submit} loading={saving} disabled={!selectedContractor}>
            Log job
          </Button>
        </div>
      </div>
    </Drawer>
  );
}
