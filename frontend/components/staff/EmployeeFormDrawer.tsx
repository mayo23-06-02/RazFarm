"use client";

import { useEffect, useState } from "react";
import { Drawer } from "@/components/ui/Drawer";
import { Input, FieldError } from "@/components/ui/Input";
import { FormRow } from "@/components/ui/FormRow";
import { Select } from "@/components/ui/Select";
import { MoneyInput } from "@/components/ui/MoneyInput";
import { DatePicker } from "@/components/ui/DatePicker";
import { Button } from "@/components/ui/Button";
import { useToast } from "@/components/ui/Toast";
import { createClient } from "@/lib/supabase/client";
import { BankAccountField, type BankAccountValue } from "./BankAccountField";
import type { Database, StaffEmploymentType, StaffPayFrequency, StaffStatus } from "@/lib/database.types";

type EmployeeRow = Database["public"]["Views"]["staff_employees_directory"]["Row"];

const EMPLOYMENT_TYPE_OPTIONS = [
  { value: "permanent", label: "Permanent" },
  { value: "casual", label: "Casual" },
];

const PAY_FREQUENCY_OPTIONS = [
  { value: "monthly", label: "Monthly" },
  { value: "weekly", label: "Weekly" },
];

const STATUS_OPTIONS = [
  { value: "active", label: "Active" },
  { value: "suspended", label: "Suspended" },
  { value: "terminated", label: "Terminated" },
];

function toIso(d: Date) {
  return d.toISOString().slice(0, 10);
}

export interface EmployeeFormDrawerProps {
  tenantId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  employee?: EmployeeRow | null;
  canRevealBank: boolean;
  onSaved: () => void;
}

export function EmployeeFormDrawer({ tenantId, open, onOpenChange, employee, canRevealBank, onSaved }: EmployeeFormDrawerProps) {
  const { addToast } = useToast();
  const isEdit = !!employee;

  const [staffNo, setStaffNo] = useState("");
  const [fullName, setFullName] = useState("");
  const [nationalId, setNationalId] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [position, setPosition] = useState("");
  const [employmentType, setEmploymentType] = useState<StaffEmploymentType>("permanent");
  const [startDate, setStartDate] = useState<Date>(new Date());
  const [endDate, setEndDate] = useState<Date | undefined>(undefined);
  const [payRate, setPayRate] = useState(0);
  const [payFrequency, setPayFrequency] = useState<StaffPayFrequency>("monthly");
  const [payeNumber, setPayeNumber] = useState("");
  const [enpfNumber, setEnpfNumber] = useState("");
  const [status, setStatus] = useState<StaffStatus>("active");
  const [bankAccount, setBankAccount] = useState<BankAccountValue | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const payRateVisible = !isEdit || employee?.pay_rate != null;

  useEffect(() => {
    if (!open) return;
    setStaffNo(employee?.staff_no ?? "");
    setFullName(employee?.full_name ?? "");
    setNationalId(employee?.national_id ?? "");
    setPhone(employee?.phone ?? "");
    setEmail(employee?.email ?? "");
    setPosition(employee?.position ?? "");
    setEmploymentType(employee?.employment_type ?? "permanent");
    setStartDate(employee?.start_date ? new Date(employee.start_date) : new Date());
    setEndDate(employee?.end_date ? new Date(employee.end_date) : undefined);
    setPayRate(employee?.pay_rate ?? 0);
    setPayFrequency(employee?.pay_frequency ?? "monthly");
    setPayeNumber(employee?.paye_number ?? "");
    setEnpfNumber(employee?.enpf_number ?? "");
    setStatus(employee?.status ?? "active");
    setBankAccount(null);
    setError(null);
  }, [open, employee]);

  const submit = async () => {
    setError(null);
    if (!staffNo.trim()) return setError("Enter a staff number");
    if (!fullName.trim()) return setError("Enter a full name");
    if (!position.trim()) return setError("Enter a position");
    if (payRateVisible && payRate < 0) return setError("Pay rate can't be negative");

    setSaving(true);
    const supabase = createClient();
    const payload: Database["public"]["Tables"]["staff_employees"]["Update"] = {
      staff_no: staffNo.trim(),
      full_name: fullName.trim(),
      national_id: nationalId || null,
      phone: phone || null,
      email: email || null,
      position: position.trim(),
      employment_type: employmentType,
      start_date: toIso(startDate),
      end_date: endDate ? toIso(endDate) : null,
      pay_frequency: payFrequency,
      paye_number: payeNumber || null,
      enpf_number: enpfNumber || null,
      status,
    };
    // Only ever sent when the viewer can actually see pay_rate — otherwise a
    // manager who can't view it (secretary) would silently zero it out.
    if (payRateVisible) payload.pay_rate = payRate;
    // Only ever sent once the user has revealed-and-edited it (or is adding
    // a brand-new record) — never overwrite a masked value with itself.
    if (bankAccount) payload.bank_account = bankAccount as unknown as Record<string, unknown>;

    const { error: saveError } = isEdit
      ? await supabase.from("staff_employees").update(payload).eq("id", employee!.id)
      : await supabase.from("staff_employees").insert({ tenant_id: tenantId, ...payload, pay_rate: payRate });
    setSaving(false);

    if (saveError) {
      setError(saveError.message);
      return;
    }

    addToast({ variant: "field", message: isEdit ? "Employee updated" : "Employee added" });
    onOpenChange(false);
    onSaved();
  };

  return (
    <Drawer open={open} onOpenChange={onOpenChange} title={isEdit ? "Edit employee" : "Add employee"} width={520}>
      <div className="flex flex-col gap-5">
        <div className="grid grid-cols-2 gap-4">
          <FormRow label="Staff no." required>
            <Input value={staffNo} onChange={(e) => setStaffNo(e.target.value)} placeholder="e.g. EMP-001" />
          </FormRow>
          <FormRow label="Full name" required>
            <Input value={fullName} onChange={(e) => setFullName(e.target.value)} />
          </FormRow>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <FormRow label="National ID">
            <Input value={nationalId} onChange={(e) => setNationalId(e.target.value)} />
          </FormRow>
          <FormRow label="Phone">
            <Input value={phone} onChange={(e) => setPhone(e.target.value)} />
          </FormRow>
        </div>
        <FormRow label="Email">
          <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
        </FormRow>
        <FormRow label="Position" required>
          <Input value={position} onChange={(e) => setPosition(e.target.value)} placeholder="e.g. Field supervisor" />
        </FormRow>
        <div className="grid grid-cols-2 gap-4">
          <FormRow label="Employment type">
            <Select options={EMPLOYMENT_TYPE_OPTIONS} value={employmentType} onChange={(v) => setEmploymentType(v as StaffEmploymentType)} />
          </FormRow>
          <FormRow label="Pay frequency">
            <Select options={PAY_FREQUENCY_OPTIONS} value={payFrequency} onChange={(v) => setPayFrequency(v as StaffPayFrequency)} />
          </FormRow>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <FormRow label="Start date">
            <DatePicker value={startDate} onChange={setStartDate} />
          </FormRow>
          <FormRow label="End date" hint="Leave blank while still employed">
            <DatePicker value={endDate} onChange={setEndDate} />
          </FormRow>
        </div>
        <FormRow label="Pay rate" required={payRateVisible} hint={payRateVisible ? undefined : "Hidden — only the chairman, treasurer or accountant can view or change this"}>
          <MoneyInput value={payRateVisible ? payRate : undefined} onValueChange={setPayRate} disabled={!payRateVisible} placeholder={payRateVisible ? undefined : "Hidden"} />
        </FormRow>
        <div className="grid grid-cols-2 gap-4">
          <FormRow label="PAYE number">
            <Input value={payeNumber} onChange={(e) => setPayeNumber(e.target.value)} />
          </FormRow>
          <FormRow label="ENPF number">
            <Input value={enpfNumber} onChange={(e) => setEnpfNumber(e.target.value)} />
          </FormRow>
        </div>
        {isEdit && (
          <FormRow label="Status">
            <Select options={STATUS_OPTIONS} value={status} onChange={(v) => setStatus(v as StaffStatus)} />
          </FormRow>
        )}
        <BankAccountField
          key={employee?.id ?? "new"}
          maskedValue={employee?.bank_account ?? null}
          entityType="staff_employees"
          entityId={employee?.id}
          canReveal={canRevealBank}
          onChange={setBankAccount}
        />
        {error && <FieldError>{error}</FieldError>}
        <div className="flex justify-end gap-2 pt-2">
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={submit} loading={saving}>
            {isEdit ? "Save changes" : "Add employee"}
          </Button>
        </div>
      </div>
    </Drawer>
  );
}
