"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { TbCalendarPlus } from "react-icons/tb";
import { PageHeader } from "@/components/ui/PageHeader";
import { Badge, type BadgeVariant } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { createClient } from "@/lib/supabase/client";
import { formatDateTime } from "@/lib/formatDate";
import { ScheduleMeetingDrawer } from "./ScheduleMeetingDrawer";
import type { Database, MeetingType } from "@/lib/database.types";

type MeetingRow = Database["public"]["Tables"]["meetings"]["Row"];

const TYPE_BADGE: Record<MeetingType, BadgeVariant> = {
  agm: "brand",
  committee: "info",
  special: "warning",
};

export interface MeetingsSectionProps {
  tenantId: string;
  initialMeetings: MeetingRow[];
  rosterCount: number;
  presentCounts: Record<string, number>;
  canManage: boolean;
}

export function MeetingsSection({ tenantId, initialMeetings, rosterCount, presentCounts, canManage }: MeetingsSectionProps) {
  const router = useRouter();
  const [meetings, setMeetings] = useState(initialMeetings);
  const [scheduleOpen, setScheduleOpen] = useState(false);

  const refresh = async () => {
    const supabase = createClient();
    const { data } = await supabase.from("meetings").select("*").eq("tenant_id", tenantId).order("starts_at", { ascending: false });
    setMeetings(data ?? []);
  };

  const now = Date.now();
  const upcoming = meetings.filter((m) => new Date(m.starts_at).getTime() >= now && (m.status === "scheduled" || m.status === "in_progress"));
  const past = meetings.filter((m) => !(new Date(m.starts_at).getTime() >= now && (m.status === "scheduled" || m.status === "in_progress")));

  const MeetingRowItem = ({ meeting }: { meeting: MeetingRow }) => (
    <button
      type="button"
      onClick={() => router.push(`/meetings/${meeting.id}`)}
      className="flex w-full flex-col gap-2 rounded-card border border-paper-200 bg-paper-0 p-4 text-left shadow-card transition-colors duration-150 hover:border-brand-200 sm:flex-row sm:items-center sm:justify-between"
    >
      <div className="flex items-center gap-3">
        <Badge variant={TYPE_BADGE[meeting.type]}>{meeting.type.toUpperCase()}</Badge>
        <div>
          <p className="text-sm font-medium text-ink-900">{meeting.title}</p>
          <p className="text-xs text-ink-400">
            {formatDateTime(meeting.starts_at)}
            {meeting.venue ? ` · ${meeting.venue}` : ""}
          </p>
        </div>
      </div>
      {meeting.status === "completed" && (
        <span className="text-sm font-medium tabular-nums text-ink-700">
          {presentCounts[meeting.id] ?? 0}/{rosterCount} present
        </span>
      )}
      {meeting.status === "cancelled" && <Badge variant="neutral">Cancelled</Badge>}
    </button>
  );

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Meetings"
        subtitle="AGMs, committee sessions and special meetings."
        actions={
          canManage ? (
            <Button icon={<TbCalendarPlus />} onClick={() => setScheduleOpen(true)}>
              Schedule meeting
            </Button>
          ) : undefined
        }
      />

      {meetings.length === 0 ? (
        <EmptyState title="No meetings yet" body="Schedule your first AGM or committee meeting to get started." />
      ) : (
        <>
          <div className="flex flex-col gap-3">
            <SectionHeading>Upcoming</SectionHeading>
            {upcoming.length === 0 ? (
              <p className="text-sm text-ink-400">No upcoming meetings scheduled.</p>
            ) : (
              upcoming.map((m) => <MeetingRowItem key={m.id} meeting={m} />)
            )}
          </div>

          <div className="flex flex-col gap-3">
            <SectionHeading>Past</SectionHeading>
            {past.length === 0 ? (
              <p className="text-sm text-ink-400">No past meetings.</p>
            ) : (
              past.map((m) => <MeetingRowItem key={m.id} meeting={m} />)
            )}
          </div>
        </>
      )}

      {canManage && <ScheduleMeetingDrawer tenantId={tenantId} open={scheduleOpen} onOpenChange={setScheduleOpen} onScheduled={refresh} />}
    </div>
  );
}
