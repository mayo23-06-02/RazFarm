"use client";

import { useState } from "react";
import { Button, ButtonGroup } from "@/components/ui/Button";
import { Textarea } from "@/components/ui/Input";
import { Badge, type BadgeVariant } from "@/components/ui/Badge";
import { useToast } from "@/components/ui/Toast";
import { createClient } from "@/lib/supabase/client";
import { renderMarkdown } from "@/lib/markdown";
import { formatDateTime } from "@/lib/formatDate";
import type { Database, MinutesStatus } from "@/lib/database.types";

type MinutesRow = Database["public"]["Tables"]["minutes"]["Row"];

const STATUS_BADGE: Record<MinutesStatus, BadgeVariant> = {
  draft: "neutral",
  submitted: "info",
  approved: "success",
};

export interface MinutesTabProps {
  meetingId: string;
  initialMinutes: MinutesRow | null;
  canEdit: boolean;
  canApprove: boolean;
}

export function MinutesTab({ meetingId, initialMinutes, canEdit, canApprove }: MinutesTabProps) {
  const { addToast } = useToast();
  const [minutes, setMinutes] = useState<MinutesRow>(
    initialMinutes ?? {
      meeting_id: meetingId,
      body_markdown: "",
      status: "draft",
      submitted_by: null,
      submitted_at: null,
      approved_by: null,
      approved_at: null,
      updated_at: new Date().toISOString(),
    }
  );
  const [body, setBody] = useState(minutes.body_markdown);
  const [view, setView] = useState<"write" | "preview">("write");
  const [saving, setSaving] = useState(false);

  const locked = minutes.status === "approved";

  const save = async (nextStatus: MinutesStatus) => {
    setSaving(true);
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    const payload: Partial<MinutesRow> & { meeting_id: string } = {
      meeting_id: meetingId,
      body_markdown: body,
      status: nextStatus,
    };
    if (nextStatus === "submitted") {
      payload.submitted_by = user?.id ?? null;
      payload.submitted_at = new Date().toISOString();
    }
    if (nextStatus === "approved") {
      payload.approved_by = user?.id ?? null;
      payload.approved_at = new Date().toISOString();
    }

    const { data, error } = await supabase.from("minutes").upsert(payload, { onConflict: "meeting_id" }).select().single();
    setSaving(false);

    if (error) {
      addToast({ variant: "danger", message: error.message });
      return;
    }

    setMinutes(data);
    addToast({
      variant: "field",
      message: nextStatus === "approved" ? "Minutes approved" : nextStatus === "submitted" ? "Minutes submitted" : "Draft saved",
    });
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Badge variant={STATUS_BADGE[minutes.status]}>{minutes.status}</Badge>
        {minutes.approved_at && <span className="text-xs text-ink-400">Approved {formatDateTime(minutes.approved_at)}</span>}
        <ButtonGroup
          options={[
            { value: "write", label: "Write" },
            { value: "preview", label: "Preview" },
          ]}
          value={view}
          onChange={(v) => setView(v as "write" | "preview")}
        />
      </div>

      {view === "write" ? (
        <Textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          disabled={locked || !canEdit}
          className="min-h-72 font-mono"
          placeholder="## Attendance&#10;...&#10;&#10;## Resolutions&#10;..."
        />
      ) : (
        <div className="min-h-72 rounded-card border border-paper-200 bg-paper-0 p-5 shadow-card" dangerouslySetInnerHTML={{ __html: renderMarkdown(body) }} />
      )}

      {canEdit && !locked && (
        <div className="flex justify-end gap-2">
          <Button variant="secondary" loading={saving} onClick={() => save("draft")}>
            Save draft
          </Button>
          <Button loading={saving} onClick={() => save("submitted")}>
            Submit minutes
          </Button>
          {canApprove && minutes.status === "submitted" && (
            <Button variant="primary" loading={saving} onClick={() => save("approved")}>
              Approve minutes
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
