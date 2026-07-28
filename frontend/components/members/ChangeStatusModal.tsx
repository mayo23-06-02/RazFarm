"use client";

import { useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { Select } from "@/components/ui/Select";
import { Textarea, FieldError } from "@/components/ui/Input";
import { FormRow } from "@/components/ui/FormRow";
import { Button } from "@/components/ui/Button";
import { useToast } from "@/components/ui/Toast";
import { createClient } from "@/lib/supabase/client";
import type { Database, MemberStatus } from "@/lib/database.types";

type MemberRow = Database["public"]["Tables"]["members"]["Row"];

const STATUS_OPTIONS = [
  { value: "active", label: "Active" },
  { value: "suspended", label: "Suspended" },
  { value: "exited", label: "Exited" },
];

export interface ChangeStatusModalProps {
  member: MemberRow;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved: () => void;
}

export function ChangeStatusModal({ member, open, onOpenChange, onSaved }: ChangeStatusModalProps) {
  const { addToast } = useToast();
  const [status, setStatus] = useState<MemberStatus>(member.status);
  const [reason, setReason] = useState(member.status_reason ?? "");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const submit = async () => {
    setSaving(true);
    setError(null);
    const supabase = createClient();
    const { error: updateError } = await supabase
      .from("members")
      .update({ status, status_reason: reason || null })
      .eq("id", member.id);
    setSaving(false);

    if (updateError) {
      setError(updateError.message);
      return;
    }

    addToast({ variant: "field", message: "Member status updated" });
    onOpenChange(false);
    onSaved();
  };

  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      title={`Change status — ${member.full_name}`}
      footer={
        <>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={submit} loading={saving}>
            Save
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        <FormRow label="Status" required>
          <Select options={STATUS_OPTIONS} value={status} onChange={(v) => setStatus(v as MemberStatus)} />
        </FormRow>
        <FormRow label="Reason" hint="Recorded on the member's profile notes">
          <Textarea value={reason} onChange={(e) => setReason(e.target.value)} placeholder="e.g. Non-payment of levies for two seasons" />
        </FormRow>
        {error && <FieldError>{error}</FieldError>}
      </div>
    </Modal>
  );
}
