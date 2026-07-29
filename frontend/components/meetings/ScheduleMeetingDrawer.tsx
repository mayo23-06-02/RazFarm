"use client";

import { useState } from "react";
import { TbArrowDown, TbArrowUp, TbPlus, TbTrash } from "react-icons/tb";
import { Drawer } from "@/components/ui/Drawer";
import { Input, FieldError } from "@/components/ui/Input";
import { FormRow } from "@/components/ui/FormRow";
import { Select } from "@/components/ui/Select";
import { DatePicker } from "@/components/ui/DatePicker";
import { Button, IconButton } from "@/components/ui/Button";
import { Toggle } from "@/components/ui/Checkbox";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { useToast } from "@/components/ui/Toast";
import { createClient } from "@/lib/supabase/client";
import type { MeetingType } from "@/lib/database.types";

const TYPE_OPTIONS = [
  { value: "agm", label: "AGM" },
  { value: "committee", label: "Committee" },
  { value: "special", label: "Special" },
];

interface AgendaItem {
  item: string;
  presenter: string;
}

export interface ScheduleMeetingDrawerProps {
  tenantId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onScheduled: () => void;
}

export function ScheduleMeetingDrawer({ tenantId, open, onOpenChange, onScheduled }: ScheduleMeetingDrawerProps) {
  const { addToast } = useToast();
  const [type, setType] = useState<MeetingType>("committee");
  const [title, setTitle] = useState("");
  const [date, setDate] = useState<Date>(new Date());
  const [time, setTime] = useState("09:00");
  const [venue, setVenue] = useState("");
  const [notify, setNotify] = useState(false);
  const [agenda, setAgenda] = useState<AgendaItem[]>([{ item: "", presenter: "" }]);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const reset = () => {
    setType("committee");
    setTitle("");
    setDate(new Date());
    setTime("09:00");
    setVenue("");
    setNotify(false);
    setAgenda([{ item: "", presenter: "" }]);
    setError(null);
  };

  const move = (index: number, dir: -1 | 1) => {
    setAgenda((prev) => {
      const next = [...prev];
      const target = index + dir;
      if (target < 0 || target >= next.length) return prev;
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  };

  const submit = async () => {
    setError(null);
    if (title.trim().length < 2) {
      setError("Enter a meeting title");
      return;
    }
    setSaving(true);
    const supabase = createClient();

    const [hours, minutes] = time.split(":").map(Number);
    const startsAt = new Date(date);
    startsAt.setHours(hours || 0, minutes || 0, 0, 0);

    const { data: meeting, error: meetingError } = await supabase
      .from("meetings")
      .insert({ tenant_id: tenantId, type, title: title.trim(), starts_at: startsAt.toISOString(), venue: venue || null, notify })
      .select()
      .single();

    if (meetingError || !meeting) {
      setSaving(false);
      setError(meetingError?.message ?? "Could not create meeting");
      return;
    }

    const agendaRows = agenda
      .filter((a) => a.item.trim())
      .map((a, i) => ({ meeting_id: meeting.id, position: i, item: a.item.trim(), presenter: a.presenter || null }));

    if (agendaRows.length > 0) {
      await supabase.from("agenda_items").insert(agendaRows);
    }

    if (notify) {
      await supabase.from("announcements").insert({
        tenant_id: tenantId,
        title: `New meeting: ${title.trim()}`,
        body: `A ${type.toUpperCase()} meeting has been scheduled for ${startsAt.toLocaleDateString("en-GB")} at ${time}${venue ? ` — ${venue}` : ""}.`,
        audience: "all",
        published_at: new Date().toISOString(),
      });
    }

    setSaving(false);
    addToast({ variant: "field", message: "Meeting scheduled" });
    onOpenChange(false);
    reset();
    onScheduled();
  };

  return (
    <Drawer
      open={open}
      onOpenChange={(v) => {
        onOpenChange(v);
        if (!v) reset();
      }}
      title="Schedule meeting"
      width={560}
    >
      <div className="flex flex-col gap-5">
        <div className="grid gap-4 sm:grid-cols-2">
          <FormRow label="Type" required>
            <Select options={TYPE_OPTIONS} value={type} onChange={(v) => setType(v as MeetingType)} />
          </FormRow>
          <FormRow label="Title" required>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Annual General Meeting 2026" />
          </FormRow>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <FormRow label="Date" required>
            <DatePicker value={date} onChange={setDate} />
          </FormRow>
          <FormRow label="Time" required>
            <Input type="time" value={time} onChange={(e) => setTime(e.target.value)} />
          </FormRow>
        </div>

        <FormRow label="Venue">
          <Input value={venue} onChange={(e) => setVenue(e.target.value)} placeholder="e.g. Community hall" />
        </FormRow>

        <SectionHeading>Agenda</SectionHeading>
        <div className="flex flex-col gap-2">
          {agenda.map((row, i) => (
            <div key={i} className="flex items-start gap-2 rounded-ctrl border border-paper-200 p-2.5">
              <div className="flex flex-col gap-1 pt-1">
                <IconButton label="Move up" icon={<TbArrowUp />} size="sm" onClick={() => move(i, -1)} disabled={i === 0} />
                <IconButton label="Move down" icon={<TbArrowDown />} size="sm" onClick={() => move(i, 1)} disabled={i === agenda.length - 1} />
              </div>
              <div className="grid flex-1 gap-2 sm:grid-cols-2">
                <Input
                  placeholder="Agenda item"
                  value={row.item}
                  onChange={(e) => setAgenda((prev) => prev.map((a, idx) => (idx === i ? { ...a, item: e.target.value } : a)))}
                />
                <Input
                  placeholder="Presenter"
                  value={row.presenter}
                  onChange={(e) => setAgenda((prev) => prev.map((a, idx) => (idx === i ? { ...a, presenter: e.target.value } : a)))}
                />
              </div>
              <IconButton
                label="Remove item"
                icon={<TbTrash />}
                size="sm"
                onClick={() => setAgenda((prev) => prev.filter((_, idx) => idx !== i))}
              />
            </div>
          ))}
          <Button variant="secondary" size="sm" icon={<TbPlus />} className="self-start" onClick={() => setAgenda((prev) => [...prev, { item: "", presenter: "" }])}>
            Add agenda item
          </Button>
        </div>

        <Toggle label="Announce to members" checked={notify} onChange={setNotify} />

        {error && <FieldError>{error}</FieldError>}

        <div className="flex justify-end gap-2 pt-2">
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={submit} loading={saving}>
            Schedule meeting
          </Button>
        </div>
      </div>
    </Drawer>
  );
}
