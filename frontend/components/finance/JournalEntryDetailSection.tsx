"use client";

import { useMemo, useState } from "react";
import { TbPlus, TbTrash } from "react-icons/tb";
import { PageHeader } from "@/components/ui/PageHeader";
import { Badge } from "@/components/ui/Badge";
import { Input, Textarea, FieldError } from "@/components/ui/Input";
import { DatePicker } from "@/components/ui/DatePicker";
import { Combobox } from "@/components/ui/Select";
import { Button } from "@/components/ui/Button";
import { ConfirmDialog } from "@/components/ui/Modal";
import { useToast } from "@/components/ui/Toast";
import { createClient } from "@/lib/supabase/client";
import { formatDate } from "@/lib/formatDate";
import type { Database } from "@/lib/database.types";

type JournalEntryRow = Database["public"]["Tables"]["journal_entries"]["Row"];
type JournalLineRow = Database["public"]["Tables"]["journal_lines"]["Row"];

interface AccountOption {
  id: string;
  code: string;
  name: string;
  type: string;
}

interface DraftLine {
  account_id: string;
  description: string;
  debit: string;
  credit: string;
}

function toDraftLine(line: JournalLineRow): DraftLine {
  return {
    account_id: line.account_id,
    description: line.description ?? "",
    debit: line.debit ? String(line.debit) : "",
    credit: line.credit ? String(line.credit) : "",
  };
}

export interface JournalEntryDetailSectionProps {
  entry: JournalEntryRow;
  initialLines: JournalLineRow[];
  accounts: AccountOption[];
  canEdit: boolean;
  canPost: boolean;
}

export function JournalEntryDetailSection({ entry: initialEntry, initialLines, accounts, canEdit, canPost }: JournalEntryDetailSectionProps) {
  const { addToast } = useToast();
  const [entry, setEntry] = useState(initialEntry);
  const [entryDate, setEntryDate] = useState(new Date(entry.entry_date));
  const [memo, setMemo] = useState(entry.memo ?? "");
  const [lines, setLines] = useState<DraftLine[]>(initialLines.length > 0 ? initialLines.map(toDraftLine) : [{ account_id: "", description: "", debit: "", credit: "" }]);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [posting, setPosting] = useState(false);

  const editable = canEdit && entry.status === "draft";
  const accountOptions = accounts.map((a) => ({ value: a.id, label: `${a.code} — ${a.name}` }));
  const accountMap = new Map(accounts.map((a) => [a.id, a]));

  const totals = useMemo(() => {
    let debit = 0;
    let credit = 0;
    for (const l of lines) {
      debit += Number(l.debit) || 0;
      credit += Number(l.credit) || 0;
    }
    return { debit, credit, balanced: debit === credit && debit > 0 };
  }, [lines]);

  const updateLine = (index: number, patch: Partial<DraftLine>) => {
    setLines((prev) => prev.map((l, i) => (i === index ? { ...l, ...patch } : l)));
  };

  const saveDraft = async () => {
    setError(null);
    const validLines = lines.filter((l) => l.account_id && (Number(l.debit) > 0 || Number(l.credit) > 0));
    if (validLines.some((l) => Number(l.debit) > 0 && Number(l.credit) > 0)) {
      setError("Each line can only have a debit or a credit, not both");
      return;
    }

    setSaving(true);
    const supabase = createClient();

    const { error: updateError } = await supabase
      .from("journal_entries")
      .update({ entry_date: entryDate.toISOString().slice(0, 10), memo: memo || null })
      .eq("id", entry.id);

    if (updateError) {
      setSaving(false);
      setError(updateError.message);
      return;
    }

    await supabase.from("journal_lines").delete().eq("journal_entry_id", entry.id);
    if (validLines.length > 0) {
      const { error: insertError } = await supabase.from("journal_lines").insert(
        validLines.map((l, i) => ({
          journal_entry_id: entry.id,
          account_id: l.account_id,
          description: l.description || null,
          debit: Number(l.debit) || 0,
          credit: Number(l.credit) || 0,
          position: i,
        }))
      );
      if (insertError) {
        setSaving(false);
        setError(insertError.message);
        return;
      }
    }

    setSaving(false);
    addToast({ variant: "field", message: "Draft saved" });
  };

  const postEntry = async () => {
    setPosting(true);
    const supabase = createClient();
    const { data, error: postError } = await supabase.rpc("post_journal_entry", { p_entry_id: entry.id });
    setPosting(false);

    if (postError) {
      addToast({ variant: "danger", message: postError.message });
      return;
    }

    setEntry(data);
    addToast({ variant: "field", message: "Journal entry posted" });
  };

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title={entry.entry_no}
        backHref="/finance/journal"
        subtitle={<Badge variant={entry.status === "posted" ? "success" : "neutral"}>{entry.status}</Badge>}
        actions={
          editable ? (
            <>
              <Button variant="secondary" loading={saving} onClick={saveDraft}>
                Save draft
              </Button>
              {canPost && (
                <ConfirmDialog
                  trigger={
                    <Button disabled={!totals.balanced} loading={posting}>
                      Post entry
                    </Button>
                  }
                  title="Post journal entry"
                  body={`Post ${entry.entry_no} for E ${totals.debit.toFixed(2)}? Once posted it can no longer be edited.`}
                  tone="primary"
                  confirmLabel="Post entry"
                  onConfirm={postEntry}
                />
              )}
            </>
          ) : undefined
        }
      />

      <div className="grid gap-4 sm:grid-cols-2">
        {editable ? (
          <>
            <div>
              <label className="mb-1.5 block text-xs font-medium text-ink-700">Date</label>
              <DatePicker value={entryDate} onChange={setEntryDate} />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-medium text-ink-700">Memo</label>
              <Textarea value={memo} onChange={(e) => setMemo(e.target.value)} className="min-h-10" />
            </div>
          </>
        ) : (
          <>
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-ink-400">Date</p>
              <p className="text-sm text-ink-900">{formatDate(entry.entry_date)}</p>
            </div>
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-ink-400">Memo</p>
              <p className="text-sm text-ink-900">{entry.memo || "—"}</p>
            </div>
          </>
        )}
      </div>

      <div className="overflow-hidden rounded-card border border-paper-200 bg-paper-0">
        <div className="grid grid-cols-[1fr,1fr,120px,120px,40px] gap-2 border-b border-paper-200 bg-paper-50 px-4 py-2.5 text-[12px] font-medium uppercase tracking-wide text-ink-400">
          <span>Account</span>
          <span>Description</span>
          <span className="text-right">Debit</span>
          <span className="text-right">Credit</span>
          <span />
        </div>
        {lines.map((line, i) => (
          <div key={i} className="grid grid-cols-[1fr,1fr,120px,120px,40px] items-center gap-2 border-b border-paper-100 px-4 py-2 last:border-0">
            {editable ? (
              <>
                <Combobox options={accountOptions} value={line.account_id} onChange={(v) => updateLine(i, { account_id: v })} placeholder="Search account…" />
                <Input value={line.description} onChange={(e) => updateLine(i, { description: e.target.value })} />
                <Input
                  type="number"
                  step="0.01"
                  className="text-right tabular-nums"
                  value={line.debit}
                  onChange={(e) => updateLine(i, { debit: e.target.value, credit: e.target.value ? "" : line.credit })}
                />
                <Input
                  type="number"
                  step="0.01"
                  className="text-right tabular-nums"
                  value={line.credit}
                  onChange={(e) => updateLine(i, { credit: e.target.value, debit: e.target.value ? "" : line.debit })}
                />
                <button
                  type="button"
                  aria-label="Remove line"
                  onClick={() => setLines((prev) => prev.filter((_, idx) => idx !== i))}
                  className="flex size-8 items-center justify-center rounded-ctrl text-ink-400 hover:bg-paper-100 hover:text-danger-600"
                >
                  <TbTrash className="size-4" />
                </button>
              </>
            ) : (
              <>
                <span className="text-sm text-ink-900">{accountMap.get(line.account_id) ? `${accountMap.get(line.account_id)!.code} — ${accountMap.get(line.account_id)!.name}` : "—"}</span>
                <span className="text-sm text-ink-500">{line.description || "—"}</span>
                <span className="text-right text-sm tabular-nums text-ink-900">{Number(line.debit) > 0 ? Number(line.debit).toFixed(2) : ""}</span>
                <span className="text-right text-sm tabular-nums text-ink-900">{Number(line.credit) > 0 ? Number(line.credit).toFixed(2) : ""}</span>
                <span />
              </>
            )}
          </div>
        ))}
        {editable && (
          <div className="px-4 py-2">
            <Button variant="ghost" size="sm" icon={<TbPlus />} onClick={() => setLines((prev) => [...prev, { account_id: "", description: "", debit: "", credit: "" }])}>
              Add line
            </Button>
          </div>
        )}
        <div className="grid grid-cols-[1fr,1fr,120px,120px,40px] gap-2 border-t border-paper-200 bg-paper-50 px-4 py-2.5 text-sm font-medium">
          <span className="col-span-2 text-ink-700">Total</span>
          <span className="text-right tabular-nums text-ink-900">{totals.debit.toFixed(2)}</span>
          <span className="text-right tabular-nums text-ink-900">{totals.credit.toFixed(2)}</span>
          <span />
        </div>
      </div>

      {!totals.balanced && editable && (
        <p className="text-sm text-harvest-500">Debits and credits must balance before this entry can be posted.</p>
      )}
      {error && <FieldError>{error}</FieldError>}
    </div>
  );
}
