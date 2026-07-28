"use client";

import { useEffect, useMemo, useState } from "react";
import { Drawer } from "@/components/ui/Drawer";
import { Input, Textarea, FieldError, SearchInput } from "@/components/ui/Input";
import { FormRow } from "@/components/ui/FormRow";
import { Select } from "@/components/ui/Select";
import { Checkbox, Toggle } from "@/components/ui/Checkbox";
import { Button } from "@/components/ui/Button";
import { useToast } from "@/components/ui/Toast";
import { createClient } from "@/lib/supabase/client";
import { dispatchAnnouncementSms, estimateSmsCost } from "@/lib/notify";
import type { AnnouncementAudience } from "@/lib/database.types";

const AUDIENCE_OPTIONS = [
  { value: "all", label: "All members" },
  { value: "committee", label: "Committee" },
  { value: "custom", label: "Custom" },
];

interface RosterMember {
  id: string;
  full_name: string;
  phone: string | null;
}

export interface ComposeAnnouncementDrawerProps {
  tenantId: string;
  roster: RosterMember[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved: () => void;
}

export function ComposeAnnouncementDrawer({ tenantId, roster, open, onOpenChange, onSaved }: ComposeAnnouncementDrawerProps) {
  const { addToast } = useToast();
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [audience, setAudience] = useState<AnnouncementAudience>("all");
  const [customIds, setCustomIds] = useState<Set<string>>(new Set());
  const [memberSearch, setMemberSearch] = useState("");
  const [sendSms, setSendSms] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setTitle("");
    setBody("");
    setAudience("all");
    setCustomIds(new Set());
    setMemberSearch("");
    setSendSms(false);
    setError(null);
  }, [open]);

  const recipientCount = useMemo(() => {
    if (audience === "committee") return 0;
    if (audience === "custom") return roster.filter((m) => customIds.has(m.id) && m.phone).length;
    return roster.filter((m) => m.phone).length;
  }, [audience, customIds, roster]);

  const filteredRoster = roster.filter((m) => m.full_name.toLowerCase().includes(memberSearch.toLowerCase()));

  const save = async (publish: boolean) => {
    setError(null);
    if (title.trim().length < 2) {
      setError("Enter a title");
      return;
    }
    if (audience === "custom" && customIds.size === 0) {
      setError("Select at least one member");
      return;
    }
    setSaving(true);
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    const { data: announcement, error: insertError } = await supabase
      .from("announcements")
      .insert({
        tenant_id: tenantId,
        title: title.trim(),
        body,
        audience,
        custom_member_ids: audience === "custom" ? Array.from(customIds) : null,
        send_sms: sendSms,
        published_at: publish ? new Date().toISOString() : null,
        created_by: user?.id,
      })
      .select()
      .single();

    setSaving(false);

    if (insertError || !announcement) {
      setError(insertError?.message ?? "Could not save announcement");
      return;
    }

    if (publish && sendSms) {
      await dispatchAnnouncementSms({ tenantId, announcementId: announcement.id, recipientCount });
    }

    addToast({ variant: "field", message: publish ? "Announcement published" : "Draft saved" });
    onOpenChange(false);
    onSaved();
  };

  return (
    <Drawer open={open} onOpenChange={onOpenChange} title="Compose announcement" width={560}>
      <div className="flex flex-col gap-5">
        <FormRow label="Title" required>
          <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. AGM date confirmed" />
        </FormRow>

        <FormRow label="Body" required>
          <Textarea value={body} onChange={(e) => setBody(e.target.value)} className="min-h-32" placeholder="Write the announcement…" />
        </FormRow>

        <FormRow label="Audience" required>
          <Select options={AUDIENCE_OPTIONS} value={audience} onChange={(v) => setAudience(v as AnnouncementAudience)} />
        </FormRow>

        {audience === "custom" && (
          <FormRow label="Members" hint={`${customIds.size} selected`}>
            <div className="rounded-card border border-paper-200">
              <div className="border-b border-paper-200 p-2">
                <SearchInput placeholder="Search members…" value={memberSearch} onChange={(e) => setMemberSearch(e.target.value)} onClear={() => setMemberSearch("")} />
              </div>
              <ul className="max-h-48 overflow-y-auto p-2">
                {filteredRoster.map((m) => (
                  <li key={m.id} className="px-1 py-1">
                    <Checkbox
                      label={m.full_name}
                      checked={customIds.has(m.id)}
                      onChange={(e) =>
                        setCustomIds((prev) => {
                          const next = new Set(prev);
                          if (e.target.checked) next.add(m.id);
                          else next.delete(m.id);
                          return next;
                        })
                      }
                    />
                  </li>
                ))}
              </ul>
            </div>
          </FormRow>
        )}

        {audience !== "committee" && (
          <FormRow label="SMS" hint={`~E${estimateSmsCost(1).toFixed(2)} per member — ~E${estimateSmsCost(recipientCount).toFixed(2)} total for ${recipientCount} recipient${recipientCount === 1 ? "" : "s"}`}>
            <Toggle label="Also send SMS" checked={sendSms} onChange={setSendSms} />
          </FormRow>
        )}

        {error && <FieldError>{error}</FieldError>}

        <div className="flex justify-end gap-2 pt-2">
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button variant="secondary" loading={saving} onClick={() => save(false)}>
            Save draft
          </Button>
          <Button loading={saving} onClick={() => save(true)}>
            Publish
          </Button>
        </div>
      </div>
    </Drawer>
  );
}
