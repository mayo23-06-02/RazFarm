"use client";

import { useMemo, useState } from "react";
import { ButtonGroup } from "@/components/ui/Button";
import { Button } from "@/components/ui/Button";
import { SearchInput } from "@/components/ui/Input";
import { EmptyState } from "@/components/ui/EmptyState";
import { useToast } from "@/components/ui/Toast";
import { createClient } from "@/lib/supabase/client";
import type { AttendanceStatus } from "@/lib/database.types";

interface RosterMember {
  id: string;
  full_name: string;
  member_no: string;
}

const SEGMENT_OPTIONS = [
  { value: "present", label: "Present" },
  { value: "apologies", label: "Apologies" },
  { value: "absent", label: "Absent" },
];

export interface AttendanceTabProps {
  meetingId: string;
  roster: RosterMember[];
  initialAttendance: { member_id: string; status: AttendanceStatus }[];
  editable: boolean;
}

export function AttendanceTab({ meetingId, roster, initialAttendance, editable }: AttendanceTabProps) {
  const { addToast } = useToast();
  const [search, setSearch] = useState("");
  const [statuses, setStatuses] = useState<Map<string, AttendanceStatus>>(() => {
    const map = new Map<string, AttendanceStatus>();
    for (const m of roster) map.set(m.id, "absent");
    for (const a of initialAttendance) map.set(a.member_id, a.status);
    return map;
  });

  const counts = useMemo(() => {
    let present = 0;
    let apologies = 0;
    let absent = 0;
    for (const status of statuses.values()) {
      if (status === "present") present++;
      else if (status === "apologies") apologies++;
      else absent++;
    }
    return { present, apologies, absent };
  }, [statuses]);

  const filteredRoster = roster.filter(
    (m) => m.full_name.toLowerCase().includes(search.toLowerCase()) || m.member_no.toLowerCase().includes(search.toLowerCase())
  );

  const setStatus = async (memberId: string, status: AttendanceStatus) => {
    const previous = statuses.get(memberId) ?? "absent";
    setStatuses((prev) => new Map(prev).set(memberId, status));

    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    const { error } = await supabase
      .from("attendance")
      .upsert({ meeting_id: meetingId, member_id: memberId, status, recorded_by: user?.id }, { onConflict: "meeting_id,member_id" });

    if (error) {
      setStatuses((prev) => new Map(prev).set(memberId, previous));
      addToast({ variant: "danger", message: `Couldn't save attendance: ${error.message}` });
    }
  };

  const markAllPresent = async () => {
    const previous = new Map(statuses);
    const next = new Map(statuses);
    for (const m of roster) next.set(m.id, "present");
    setStatuses(next);

    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    const { error } = await supabase
      .from("attendance")
      .upsert(
        roster.map((m) => ({ meeting_id: meetingId, member_id: m.id, status: "present" as const, recorded_by: user?.id })),
        { onConflict: "meeting_id,member_id" }
      );

    if (error) {
      setStatuses(previous);
      addToast({ variant: "danger", message: `Couldn't mark all present: ${error.message}` });
    } else {
      addToast({ variant: "field", message: "Marked all present" });
    }
  };

  if (roster.length === 0) {
    return <EmptyState title="No members in the register" body="Add members before recording attendance." compact />;
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="sticky top-0 z-10 -mx-1 flex flex-col gap-3 bg-paper-50 px-1 py-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4 text-sm font-medium">
          <span className="text-field-500">Present {counts.present}</span>
          <span className="text-harvest-500">Apologies {counts.apologies}</span>
          <span className="text-danger-600">Absent {counts.absent}</span>
        </div>
        {editable && (
          <Button variant="secondary" size="sm" onClick={markAllPresent}>
            Mark all present
          </Button>
        )}
      </div>

      <SearchInput placeholder="Search roster…" value={search} onChange={(e) => setSearch(e.target.value)} onClear={() => setSearch("")} />

      <ul className="flex flex-col gap-2">
        {filteredRoster.map((m) => {
          const status = statuses.get(m.id) ?? "absent";
          return (
            <li key={m.id} className="flex items-center justify-between gap-3 rounded-card border border-paper-200 bg-paper-0 p-3 shadow-card">
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-ink-900">{m.full_name}</p>
                <p className="text-xs text-ink-400">{m.member_no}</p>
              </div>
              {editable ? (
                <ButtonGroup options={SEGMENT_OPTIONS} value={status} onChange={(v) => setStatus(m.id, v as AttendanceStatus)} className="shrink-0" />
              ) : (
                <span className="shrink-0 text-sm capitalize text-ink-500">{status}</span>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
