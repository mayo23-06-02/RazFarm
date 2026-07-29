"use client";

import { useEffect, useState } from "react";
import { Drawer } from "@/components/ui/Drawer";
import { Input, Textarea, FieldError } from "@/components/ui/Input";
import { FormRow } from "@/components/ui/FormRow";
import { Combobox, Select } from "@/components/ui/Select";
import { NumberStepper } from "@/components/ui/NumberStepper";
import { DatePicker } from "@/components/ui/DatePicker";
import { Button } from "@/components/ui/Button";
import { useToast } from "@/components/ui/Toast";
import { createClient } from "@/lib/supabase/client";
import type { ResolutionOutcome } from "@/lib/database.types";

interface RosterMember {
  id: string;
  full_name: string;
}

const OUTCOME_OPTIONS = [
  { value: "passed", label: "Passed" },
  { value: "failed", label: "Failed" },
];

export interface AddResolutionDrawerProps {
  tenantId: string;
  meetingId: string;
  roster: RosterMember[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAdded: () => void;
}

export function AddResolutionDrawer({ tenantId, meetingId, roster, open, onOpenChange, onAdded }: AddResolutionDrawerProps) {
  const { addToast } = useToast();
  const [refNo, setRefNo] = useState("");
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [movedBy, setMovedBy] = useState<string | undefined>();
  const [secondedBy, setSecondedBy] = useState<string | undefined>();
  const [votesFor, setVotesFor] = useState(0);
  const [votesAgainst, setVotesAgainst] = useState(0);
  const [votesAbstain, setVotesAbstain] = useState(0);
  const [outcome, setOutcome] = useState<ResolutionOutcome>("passed");
  const [outcomeTouched, setOutcomeTouched] = useState(false);
  const [decidedAt, setDecidedAt] = useState<Date>(new Date());
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const rosterOptions = roster.map((m) => ({ value: m.id, label: m.full_name }));

  useEffect(() => {
    if (!open) return;
    setTitle("");
    setBody("");
    setMovedBy(undefined);
    setSecondedBy(undefined);
    setVotesFor(0);
    setVotesAgainst(0);
    setVotesAbstain(0);
    setOutcome("passed");
    setOutcomeTouched(false);
    setDecidedAt(new Date());
    setError(null);

    (async () => {
      const supabase = createClient();
      const year = new Date().getFullYear();
      const { count } = await supabase
        .from("resolutions")
        .select("id", { count: "exact", head: true })
        .eq("tenant_id", tenantId)
        .like("ref_no", `RES-${year}-%`);
      setRefNo(`RES-${year}-${(count ?? 0) + 1}`);
    })();
  }, [open, tenantId]);

  useEffect(() => {
    if (outcomeTouched) return;
    setOutcome(votesFor > votesAgainst ? "passed" : "failed");
  }, [votesFor, votesAgainst, outcomeTouched]);

  const submit = async () => {
    setError(null);
    if (title.trim().length < 2) {
      setError("Enter a resolution title");
      return;
    }
    setSaving(true);
    const supabase = createClient();
    const { error: insertError } = await supabase.from("resolutions").insert({
      tenant_id: tenantId,
      meeting_id: meetingId,
      ref_no: refNo,
      title: title.trim(),
      body: body || null,
      moved_by: movedBy ?? null,
      seconded_by: secondedBy ?? null,
      votes_for: votesFor,
      votes_against: votesAgainst,
      votes_abstain: votesAbstain,
      outcome,
      decided_at: decidedAt.toISOString(),
    });
    setSaving(false);

    if (insertError) {
      setError(insertError.message);
      return;
    }

    addToast({ variant: "field", message: "Resolution added" });
    onOpenChange(false);
    onAdded();
  };

  return (
    <Drawer open={open} onOpenChange={onOpenChange} title="Add resolution" width={560}>
      <div className="flex flex-col gap-5">
        <div className="grid gap-4 sm:grid-cols-2">
          <FormRow label="Reference no." required>
            <Input value={refNo} onChange={(e) => setRefNo(e.target.value)} className="font-mono" />
          </FormRow>
          <FormRow label="Decided on" required>
            <DatePicker value={decidedAt} onChange={setDecidedAt} />
          </FormRow>
        </div>

        <FormRow label="Title" required>
          <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Approval of the 2026 season budget" />
        </FormRow>

        <FormRow label="Details">
          <Textarea value={body} onChange={(e) => setBody(e.target.value)} placeholder="Summarise what was resolved…" />
        </FormRow>

        <div className="grid gap-4 sm:grid-cols-2">
          <FormRow label="Moved by">
            <Combobox options={rosterOptions} value={movedBy} onChange={setMovedBy} placeholder="Search member…" />
          </FormRow>
          <FormRow label="Seconded by">
            <Combobox options={rosterOptions} value={secondedBy} onChange={setSecondedBy} placeholder="Search member…" />
          </FormRow>
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          <FormRow label="Votes for">
            <NumberStepper value={votesFor} onChange={setVotesFor} />
          </FormRow>
          <FormRow label="Votes against">
            <NumberStepper value={votesAgainst} onChange={setVotesAgainst} />
          </FormRow>
          <FormRow label="Abstained">
            <NumberStepper value={votesAbstain} onChange={setVotesAbstain} />
          </FormRow>
        </div>

        <FormRow label="Outcome" hint="Auto-computed from votes — override if needed">
          <Select
            options={OUTCOME_OPTIONS}
            value={outcome}
            onChange={(v) => {
              setOutcome(v as ResolutionOutcome);
              setOutcomeTouched(true);
            }}
          />
        </FormRow>

        {error && <FieldError>{error}</FieldError>}

        <div className="flex justify-end gap-2 pt-2">
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={submit} loading={saving}>
            Add resolution
          </Button>
        </div>
      </div>
    </Drawer>
  );
}
