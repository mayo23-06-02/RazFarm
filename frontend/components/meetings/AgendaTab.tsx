"use client";

import { useState } from "react";
import { TbArrowDown, TbArrowUp, TbPlus, TbTrash } from "react-icons/tb";
import { Input } from "@/components/ui/Input";
import { Button, IconButton } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { useToast } from "@/components/ui/Toast";
import { createClient } from "@/lib/supabase/client";
import type { Database } from "@/lib/database.types";

type AgendaItemRow = Database["public"]["Tables"]["agenda_items"]["Row"];

export interface AgendaTabProps {
  meetingId: string;
  items: AgendaItemRow[];
  editable: boolean;
  onChanged: () => void;
}

interface DraftItem {
  item: string;
  presenter: string;
}

export function AgendaTab({ meetingId, items, editable, onChanged }: AgendaTabProps) {
  const { addToast } = useToast();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<DraftItem[]>(items.map((i) => ({ item: i.item, presenter: i.presenter ?? "" })));
  const [saving, setSaving] = useState(false);

  const startEdit = () => {
    setDraft(items.map((i) => ({ item: i.item, presenter: i.presenter ?? "" })));
    setEditing(true);
  };

  const move = (index: number, dir: -1 | 1) => {
    setDraft((prev) => {
      const next = [...prev];
      const target = index + dir;
      if (target < 0 || target >= next.length) return prev;
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  };

  const save = async () => {
    setSaving(true);
    const supabase = createClient();
    await supabase.from("agenda_items").delete().eq("meeting_id", meetingId);
    const rows = draft
      .filter((d) => d.item.trim())
      .map((d, i) => ({ meeting_id: meetingId, position: i, item: d.item.trim(), presenter: d.presenter || null }));
    if (rows.length > 0) {
      const { error } = await supabase.from("agenda_items").insert(rows);
      if (error) {
        addToast({ variant: "danger", message: error.message });
        setSaving(false);
        return;
      }
    }
    setSaving(false);
    setEditing(false);
    addToast({ variant: "field", message: "Agenda saved" });
    onChanged();
  };

  if (!editing) {
    return (
      <div className="flex flex-col gap-3">
        {editable && (
          <Button variant="secondary" size="sm" className="self-end" onClick={startEdit}>
            Edit agenda
          </Button>
        )}
        {items.length === 0 ? (
          <EmptyState title="No agenda items yet" body={editable ? "Add items to build the agenda for this meeting." : "The agenda hasn't been set for this meeting."} compact />
        ) : (
          <ol className="flex flex-col gap-2">
            {items.map((i, idx) => (
              <li key={i.id} className="flex items-center gap-3 rounded-card border border-paper-200 bg-paper-0 p-3.5 shadow-card">
                <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-paper-100 text-xs font-medium text-ink-500">{idx + 1}</span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-ink-900">{i.item}</p>
                  {i.presenter && <p className="text-xs text-ink-400">Presented by {i.presenter}</p>}
                </div>
              </li>
            ))}
          </ol>
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      {draft.map((row, i) => (
        <div key={i} className="flex items-start gap-2 rounded-ctrl border border-paper-200 p-2.5">
          <div className="flex flex-col gap-1 pt-1">
            <IconButton label="Move up" icon={<TbArrowUp />} size="sm" onClick={() => move(i, -1)} disabled={i === 0} />
            <IconButton label="Move down" icon={<TbArrowDown />} size="sm" onClick={() => move(i, 1)} disabled={i === draft.length - 1} />
          </div>
          <div className="grid flex-1 gap-2 sm:grid-cols-2">
            <Input placeholder="Agenda item" value={row.item} onChange={(e) => setDraft((prev) => prev.map((d, idx) => (idx === i ? { ...d, item: e.target.value } : d)))} />
            <Input placeholder="Presenter" value={row.presenter} onChange={(e) => setDraft((prev) => prev.map((d, idx) => (idx === i ? { ...d, presenter: e.target.value } : d)))} />
          </div>
          <IconButton label="Remove item" icon={<TbTrash />} size="sm" onClick={() => setDraft((prev) => prev.filter((_, idx) => idx !== i))} />
        </div>
      ))}
      <Button variant="secondary" size="sm" icon={<TbPlus />} className="self-start" onClick={() => setDraft((prev) => [...prev, { item: "", presenter: "" }])}>
        Add agenda item
      </Button>
      <div className="flex justify-end gap-2 pt-2">
        <Button variant="ghost" onClick={() => setEditing(false)}>
          Cancel
        </Button>
        <Button onClick={save} loading={saving}>
          Save agenda
        </Button>
      </div>
    </div>
  );
}
