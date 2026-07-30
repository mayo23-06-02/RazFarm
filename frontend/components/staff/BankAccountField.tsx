"use client";

import { useState } from "react";
import { TbEye, TbLoader2 } from "react-icons/tb";
import { Input } from "@/components/ui/Input";
import { FormRow } from "@/components/ui/FormRow";
import { Button } from "@/components/ui/Button";
import { useToast } from "@/components/ui/Toast";
import { createClient } from "@/lib/supabase/client";

export interface BankAccountValue {
  bank_name: string;
  account_number: string;
  branch_code: string;
}

const EMPTY_BANK_ACCOUNT: BankAccountValue = { bank_name: "", account_number: "", branch_code: "" };

export interface BankAccountFieldProps {
  /** Masked value from the *_directory view — never trusted as real data. */
  maskedValue: Record<string, unknown> | null;
  entityType: "staff_employees" | "contractors";
  /** Existing record id — omitted when adding a brand-new record. */
  entityId?: string;
  canReveal: boolean;
  /** Called only once the user has revealed-and-edited the value; the
   * parent form should omit bank_account from its save payload until this
   * fires, so an unrevealed masked value never overwrites the real one. */
  onChange: (value: BankAccountValue) => void;
}

export function BankAccountField({ maskedValue, entityType, entityId, canReveal, onChange }: BankAccountFieldProps) {
  const { addToast } = useToast();
  const [revealed, setRevealed] = useState(!entityId); // new records start fully editable
  const [revealing, setRevealing] = useState(false);
  const [value, setValue] = useState<BankAccountValue>(EMPTY_BANK_ACCOUNT);

  const maskedAccountNumber = typeof maskedValue?.account_number === "string" ? maskedValue.account_number : null;
  const maskedBankName = typeof maskedValue?.bank_name === "string" ? maskedValue.bank_name : null;

  const update = (patch: Partial<BankAccountValue>) => {
    const next = { ...value, ...patch };
    setValue(next);
    onChange(next);
  };

  const reveal = async () => {
    if (!entityId) return;
    setRevealing(true);
    const supabase = createClient();
    const { data, error } = await supabase.rpc("reveal_bank_details", { p_entity_type: entityType, p_entity_id: entityId });
    setRevealing(false);
    if (error) {
      addToast({ variant: "danger", message: error.message });
      return;
    }
    const account = (data ?? {}) as Record<string, unknown>;
    const next: BankAccountValue = {
      bank_name: typeof account.bank_name === "string" ? account.bank_name : "",
      account_number: typeof account.account_number === "string" ? account.account_number : "",
      branch_code: typeof account.branch_code === "string" ? account.branch_code : "",
    };
    setValue(next);
    setRevealed(true);
    onChange(next);
  };

  if (!revealed) {
    return (
      <FormRow label="Bank account" hint="Masked — only the chairman, treasurer or accountant can reveal it.">
        <div className="flex h-10 items-center justify-between rounded-ctrl border border-paper-200 bg-paper-50 px-3 text-sm text-ink-700">
          <span>
            {maskedBankName || maskedAccountNumber
              ? `${maskedBankName ?? "Bank on file"} ${maskedAccountNumber ?? ""}`.trim()
              : "Not on file"}
          </span>
          {canReveal && (maskedBankName || maskedAccountNumber) && (
            <Button variant="ghost" size="sm" icon={revealing ? <TbLoader2 className="animate-spin" /> : <TbEye />} onClick={reveal} disabled={revealing}>
              Reveal
            </Button>
          )}
        </div>
      </FormRow>
    );
  }

  return (
    <div className="flex flex-col gap-3 rounded-ctrl border border-paper-200 p-3">
      <FormRow label="Bank name">
        <Input value={value.bank_name} onChange={(e) => update({ bank_name: e.target.value })} />
      </FormRow>
      <FormRow label="Account number">
        <Input value={value.account_number} onChange={(e) => update({ account_number: e.target.value })} />
      </FormRow>
      <FormRow label="Branch code">
        <Input value={value.branch_code} onChange={(e) => update({ branch_code: e.target.value })} />
      </FormRow>
    </div>
  );
}
