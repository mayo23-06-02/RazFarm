"use client";

import { useEffect, useState } from "react";
import { Drawer } from "@/components/ui/Drawer";
import { Input, FieldError } from "@/components/ui/Input";
import { FormRow } from "@/components/ui/FormRow";
import { Select } from "@/components/ui/Select";
import { Toggle } from "@/components/ui/Checkbox";
import { MoneyInput } from "@/components/ui/MoneyInput";
import { Button } from "@/components/ui/Button";
import { useToast } from "@/components/ui/Toast";
import { createClient } from "@/lib/supabase/client";
import { BankAccountField, type BankAccountValue } from "./BankAccountField";
import type { Database, ContractorRateBasis, ContractorServiceType, ContractorStatus } from "@/lib/database.types";

type ContractorRow = Database["public"]["Views"]["contractors_directory"]["Row"];

const SERVICE_TYPE_OPTIONS = [
  { value: "cutting", label: "Cutting" },
  { value: "haulage", label: "Haulage" },
  { value: "spraying", label: "Spraying" },
  { value: "other", label: "Other" },
];

const RATE_BASIS_OPTIONS = [
  { value: "per_tonne", label: "Per tonne" },
  { value: "per_hectare", label: "Per hectare" },
  { value: "per_job", label: "Per job" },
  { value: "fixed", label: "Fixed" },
];

const STATUS_OPTIONS = [
  { value: "active", label: "Active" },
  { value: "inactive", label: "Inactive" },
];

export interface ContractorFormDrawerProps {
  tenantId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  contractor?: ContractorRow | null;
  canRevealBank: boolean;
  onSaved: () => void;
}

export function ContractorFormDrawer({ tenantId, open, onOpenChange, contractor, canRevealBank, onSaved }: ContractorFormDrawerProps) {
  const { addToast } = useToast();
  const isEdit = !!contractor;

  const [contractorNo, setContractorNo] = useState("");
  const [businessName, setBusinessName] = useState("");
  const [contactName, setContactName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [serviceType, setServiceType] = useState<ContractorServiceType>("cutting");
  const [regNo, setRegNo] = useState("");
  const [rateBasis, setRateBasis] = useState<ContractorRateBasis>("per_tonne");
  const [rateAmount, setRateAmount] = useState(0);
  const [withholding, setWithholding] = useState(false);
  const [status, setStatus] = useState<ContractorStatus>("active");
  const [bankAccount, setBankAccount] = useState<BankAccountValue | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setContractorNo(contractor?.contractor_no ?? "");
    setBusinessName(contractor?.business_name ?? "");
    setContactName(contractor?.contact_name ?? "");
    setPhone(contractor?.phone ?? "");
    setEmail(contractor?.email ?? "");
    setServiceType(contractor?.service_type ?? "cutting");
    setRegNo(contractor?.national_id_or_reg_no ?? "");
    setRateBasis(contractor?.rate_basis ?? "per_tonne");
    setRateAmount(contractor?.rate_amount ?? 0);
    setWithholding(contractor?.withholding_applicable ?? false);
    setStatus(contractor?.status ?? "active");
    setBankAccount(null);
    setError(null);
  }, [open, contractor]);

  const submit = async () => {
    setError(null);
    if (!contractorNo.trim()) return setError("Enter a contractor number");
    if (!businessName.trim()) return setError("Enter a business or contact name");
    if (rateAmount < 0) return setError("Rate can't be negative");

    setSaving(true);
    const supabase = createClient();
    const payload: Database["public"]["Tables"]["contractors"]["Update"] = {
      contractor_no: contractorNo.trim(),
      business_name: businessName.trim(),
      contact_name: contactName || null,
      phone: phone || null,
      email: email || null,
      service_type: serviceType,
      national_id_or_reg_no: regNo || null,
      rate_basis: rateBasis,
      rate_amount: rateAmount,
      withholding_applicable: withholding,
      status,
    };
    if (bankAccount) payload.bank_account = bankAccount as unknown as Record<string, unknown>;

    const { error: saveError } = isEdit
      ? await supabase.from("contractors").update(payload).eq("id", contractor!.id)
      : await supabase.from("contractors").insert({ tenant_id: tenantId, ...payload });
    setSaving(false);

    if (saveError) {
      setError(saveError.message);
      return;
    }

    addToast({ variant: "field", message: isEdit ? "Contractor updated" : "Contractor added" });
    onOpenChange(false);
    onSaved();
  };

  return (
    <Drawer open={open} onOpenChange={onOpenChange} title={isEdit ? "Edit contractor" : "Add contractor"} width={520}>
      <div className="flex flex-col gap-5">
        <div className="grid grid-cols-2 gap-4">
          <FormRow label="Contractor no." required>
            <Input value={contractorNo} onChange={(e) => setContractorNo(e.target.value)} placeholder="e.g. CTR-001" />
          </FormRow>
          <FormRow label="Business name" required>
            <Input value={businessName} onChange={(e) => setBusinessName(e.target.value)} />
          </FormRow>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <FormRow label="Contact person">
            <Input value={contactName} onChange={(e) => setContactName(e.target.value)} />
          </FormRow>
          <FormRow label="Phone">
            <Input value={phone} onChange={(e) => setPhone(e.target.value)} />
          </FormRow>
        </div>
        <FormRow label="Email">
          <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
        </FormRow>
        <FormRow label="National ID / registration no.">
          <Input value={regNo} onChange={(e) => setRegNo(e.target.value)} />
        </FormRow>
        <FormRow label="Service type">
          <Select options={SERVICE_TYPE_OPTIONS} value={serviceType} onChange={(v) => setServiceType(v as ContractorServiceType)} />
        </FormRow>
        <div className="grid grid-cols-2 gap-4">
          <FormRow label="Rate basis">
            <Select options={RATE_BASIS_OPTIONS} value={rateBasis} onChange={(v) => setRateBasis(v as ContractorRateBasis)} />
          </FormRow>
          <FormRow label="Rate amount" required>
            <MoneyInput value={rateAmount} onValueChange={setRateAmount} />
          </FormRow>
        </div>
        <Toggle checked={withholding} onChange={setWithholding} label="Withholding tax applicable" />
        {isEdit && (
          <FormRow label="Status">
            <Select options={STATUS_OPTIONS} value={status} onChange={(v) => setStatus(v as ContractorStatus)} />
          </FormRow>
        )}
        <BankAccountField
          key={contractor?.id ?? "new"}
          maskedValue={contractor?.bank_account ?? null}
          entityType="contractors"
          entityId={contractor?.id}
          canReveal={canRevealBank}
          onChange={setBankAccount}
        />
        {error && <FieldError>{error}</FieldError>}
        <div className="flex justify-end gap-2 pt-2">
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={submit} loading={saving}>
            {isEdit ? "Save changes" : "Add contractor"}
          </Button>
        </div>
      </div>
    </Drawer>
  );
}
