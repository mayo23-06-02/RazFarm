"use client";

import { useEffect, useState } from "react";
import { Drawer } from "@/components/ui/Drawer";
import { FieldError } from "@/components/ui/Input";
import { FormRow } from "@/components/ui/FormRow";
import { DatePicker } from "@/components/ui/DatePicker";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { useToast } from "@/components/ui/Toast";
import { createClient } from "@/lib/supabase/client";

export interface SeasonSettingsDrawerProps {
  tenantId: string;
  seasonStart: string | null;
  seasonEnd: string | null;
  seasonQuotaTonnes: number | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved: () => void;
}

export function SeasonSettingsDrawer({ tenantId, seasonStart, seasonEnd, seasonQuotaTonnes, open, onOpenChange, onSaved }: SeasonSettingsDrawerProps) {
  const { addToast } = useToast();
  const [start, setStart] = useState<Date | undefined>(seasonStart ? new Date(seasonStart) : undefined);
  const [end, setEnd] = useState<Date | undefined>(seasonEnd ? new Date(seasonEnd) : undefined);
  const [quota, setQuota] = useState(seasonQuotaTonnes != null ? String(seasonQuotaTonnes) : "");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setStart(seasonStart ? new Date(seasonStart) : undefined);
    setEnd(seasonEnd ? new Date(seasonEnd) : undefined);
    setQuota(seasonQuotaTonnes != null ? String(seasonQuotaTonnes) : "");
    setError(null);
  }, [open, seasonStart, seasonEnd, seasonQuotaTonnes]);

  const submit = async () => {
    setError(null);
    if (start && end && end < start) {
      setError("Season end can't be before season start");
      return;
    }
    setSaving(true);
    const supabase = createClient();
    const { error: saveError } = await supabase
      .from("tenant_settings")
      .update({
        season_start: start ? start.toISOString().slice(0, 10) : null,
        season_end: end ? end.toISOString().slice(0, 10) : null,
        season_quota_tonnes: quota ? Number(quota) : null,
      })
      .eq("tenant_id", tenantId);
    setSaving(false);

    if (saveError) {
      setError(saveError.message);
      return;
    }

    addToast({ variant: "field", message: "Season settings updated" });
    onOpenChange(false);
    onSaved();
  };

  return (
    <Drawer open={open} onOpenChange={onOpenChange} title="Season settings">
      <div className="flex flex-col gap-5">
        <FormRow label="Season start">
          <DatePicker value={start} onChange={setStart} />
        </FormRow>
        <FormRow label="Season end">
          <DatePicker value={end} onChange={setEnd} />
        </FormRow>
        <FormRow label="Season delivery quota" hint="Total tonnes allocated to this association for the season">
          <Input type="number" step="0.01" value={quota} onChange={(e) => setQuota(e.target.value)} />
        </FormRow>
        {error && <FieldError>{error}</FieldError>}
        <div className="flex justify-end gap-2 pt-2">
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={submit} loading={saving}>
            Save
          </Button>
        </div>
      </div>
    </Drawer>
  );
}
