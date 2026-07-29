"use client";

import { useState } from "react";
import { PageHeader } from "@/components/ui/PageHeader";
import { Tabs } from "@/components/ui/Tabs";
import { Badge, type BadgeVariant } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { ConfirmDialog } from "@/components/ui/Modal";
import { useToast } from "@/components/ui/Toast";
import { createClient } from "@/lib/supabase/client";
import { formatDateTime } from "@/lib/formatDate";
import { AgendaTab } from "./AgendaTab";
import { AttendanceTab } from "./AttendanceTab";
import { ResolutionsTab } from "./ResolutionsTab";
import { MinutesTab } from "./MinutesTab";
import type { AttendanceStatus, Database, MeetingStatus, MeetingType } from "@/lib/database.types";

type MeetingRow = Database["public"]["Tables"]["meetings"]["Row"];
type AgendaItemRow = Database["public"]["Tables"]["agenda_items"]["Row"];
type ResolutionRow = Database["public"]["Tables"]["resolutions"]["Row"];
type MinutesRow = Database["public"]["Tables"]["minutes"]["Row"];

const TYPE_BADGE: Record<MeetingType, BadgeVariant> = { agm: "brand", committee: "info", special: "warning" };
const STATUS_BADGE: Record<MeetingStatus, BadgeVariant> = {
  scheduled: "neutral",
  in_progress: "info",
  completed: "success",
  cancelled: "danger",
};

export interface MeetingDetailSectionProps {
  tenantId: string;
  meeting: MeetingRow;
  initialAgendaItems: AgendaItemRow[];
  initialAttendance: { member_id: string; status: AttendanceStatus }[];
  initialResolutions: ResolutionRow[];
  initialMinutes: MinutesRow | null;
  roster: { id: string; full_name: string; member_no: string }[];
  canManage: boolean;
  canRecordAttendance: boolean;
  canDoCommittee: boolean;
  canApprove: boolean;
}

export function MeetingDetailSection({
  tenantId,
  meeting: initialMeeting,
  initialAgendaItems,
  initialAttendance,
  initialResolutions,
  initialMinutes,
  roster,
  canManage,
  canRecordAttendance,
  canDoCommittee,
  canApprove,
}: MeetingDetailSectionProps) {
  const { addToast } = useToast();
  const [meeting, setMeeting] = useState(initialMeeting);
  const [agendaItems, setAgendaItems] = useState(initialAgendaItems);
  const [tab, setTab] = useState("agenda");
  const [changingStatus, setChangingStatus] = useState(false);

  const refreshAgenda = async () => {
    const supabase = createClient();
    const { data } = await supabase.from("agenda_items").select("*").eq("meeting_id", meeting.id).order("position", { ascending: true });
    setAgendaItems(data ?? []);
  };

  const setMeetingStatus = async (status: MeetingStatus) => {
    setChangingStatus(true);
    const supabase = createClient();
    const { data, error } = await supabase.from("meetings").update({ status }).eq("id", meeting.id).select().single();
    setChangingStatus(false);
    if (error) {
      addToast({ variant: "danger", message: error.message });
      return;
    }
    setMeeting(data);
    addToast({ variant: "field", message: status === "in_progress" ? "Meeting started" : "Meeting completed" });
  };

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title={meeting.title}
        backHref="/meetings"
        subtitle={
          <span className="flex flex-wrap items-center gap-2">
            <Badge variant={TYPE_BADGE[meeting.type]}>{meeting.type.toUpperCase()}</Badge>
            <Badge variant={STATUS_BADGE[meeting.status]}>{meeting.status.replace("_", " ")}</Badge>
            <span>{formatDateTime(meeting.starts_at)}</span>
            {meeting.venue && <span>· {meeting.venue}</span>}
          </span>
        }
        actions={
          canManage ? (
            <>
              {meeting.status === "scheduled" && (
                <Button loading={changingStatus} onClick={() => setMeetingStatus("in_progress")}>
                  Start meeting
                </Button>
              )}
              {meeting.status === "in_progress" &&
                (initialAttendance.length === 0 ? (
                  <ConfirmDialog
                    trigger={<Button>Complete meeting</Button>}
                    title="Complete meeting"
                    body="No attendance has been recorded yet. Complete the meeting anyway?"
                    tone="primary"
                    confirmLabel="Complete meeting"
                    onConfirm={() => setMeetingStatus("completed")}
                  />
                ) : (
                  <Button loading={changingStatus} onClick={() => setMeetingStatus("completed")}>
                    Complete meeting
                  </Button>
                ))}
            </>
          ) : undefined
        }
      />

      <Tabs
        value={tab}
        onChange={setTab}
        items={[
          { value: "agenda", label: "Agenda" },
          { value: "attendance", label: "Attendance" },
          { value: "resolutions", label: "Resolutions" },
          { value: "minutes", label: "Minutes" },
        ]}
      />

      {tab === "agenda" && (
        <AgendaTab meetingId={meeting.id} items={agendaItems} editable={canManage && meeting.status === "scheduled"} onChanged={refreshAgenda} />
      )}
      {tab === "attendance" && (
        <AttendanceTab meetingId={meeting.id} roster={roster} initialAttendance={initialAttendance} editable={canRecordAttendance} />
      )}
      {tab === "resolutions" && (
        <ResolutionsTab tenantId={tenantId} meetingId={meeting.id} roster={roster} initialResolutions={initialResolutions} canManage={canDoCommittee} />
      )}
      {tab === "minutes" && (
        <MinutesTab meetingId={meeting.id} initialMinutes={initialMinutes} canEdit={canDoCommittee} canApprove={canApprove} />
      )}
    </div>
  );
}
