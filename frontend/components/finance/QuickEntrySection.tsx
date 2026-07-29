"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { TbPlus, TbTrash } from "react-icons/tb";
import { Button, ButtonGroup } from "@/components/ui/Button";
import { DatePicker } from "@/components/ui/DatePicker";
import { Combobox } from "@/components/ui/Select";
import { Input, FieldError } from "@/components/ui/Input";
import { MoneyInput } from "@/components/ui/MoneyInput";
import { EmptyState } from "@/components/ui/EmptyState";
import { useToast } from "@/components/ui/Toast";
import { createClient } from "@/lib/supabase/client";

interface AccountOption {
  id: string;
  code: string;
  name: string;
  type: string;
}

interface DraftRow {
  entryDate: Date;
  kind: "income" | "expense";
  categoryAccountId: string;
  description: string;
  amount: number;
}

function blankRow(): DraftRow {
  return { entryDate: new Date(), kind: "expense", categoryAccountId: "", description: "", amount: 0 };
}

export interface QuickEntrySectionProps {
  tenantId: string;
  accounts: AccountOption[];
  canCreate: boolean;
}

export function QuickEntrySection({ tenantId, accounts, canCreate }: QuickEntrySectionProps) {
  const router = useRouter();
  const { addToast } = useToast();
  const [offsetAccountId, setOffsetAccountId] = useState("");
  const [rows, setRows] = useState<DraftRow[]>([blankRow(), blankRow(), blankRow()]);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const offsetOptions = useMemo(
    () => accounts.filter((a) => a.type === "asset").map((a) => ({ value: a.id, label: `${a.code} — ${a.name}` })),
    [accounts]
  );
  const incomeOptions = useMemo(() => accounts.filter((a) => a.type === "income").map((a) => ({ value: a.id, label: `${a.code} — ${a.name}` })), [accounts]);
  const expenseOptions = useMemo(() => accounts.filter((a) => a.type === "expense").map((a) => ({ value: a.id, label: `${a.code} — ${a.name}` })), [accounts]);

  const updateRow = (index: number, patch: Partial<DraftRow>) => {
    setRows((prev) => prev.map((r, i) => (i === index ? { ...r, ...patch } : r)));
  };

  const total = rows.reduce((s, r) => s + (r.kind === "income" ? r.amount : -r.amount), 0);

  const submit = async () => {
    setError(null);
    if (!offsetAccountId) {
      setError("Choose which account this batch is being paid into or out of");
      return;
    }
    const validRows = rows.filter((r) => r.categoryAccountId && r.amount > 0);
    if (validRows.length === 0) {
      setError("Add at least one row with a category and an amount greater than zero");
      return;
    }

    setSaving(true);
    const supabase = createClient();
    const { data, error: rpcError } = await supabase.rpc("create_quick_journal_entries", {
      p_tenant_id: tenantId,
      p_offset_account_id: offsetAccountId,
      p_rows: validRows.map((r) => ({
        entry_date: r.entryDate.toISOString().slice(0, 10),
        description: r.description || null,
        kind: r.kind,
        category_account_id: r.categoryAccountId,
        amount: r.amount,
      })),
    });
    setSaving(false);

    if (rpcError) {
      setError(rpcError.message);
      return;
    }

    addToast({ variant: "field", message: `Created ${(data as unknown[])?.length ?? validRows.length} draft entries — post them from Journal entries` });
    router.push("/finance/journal");
  };

  if (!canCreate) {
    return <EmptyState title="No access to quick entry" body="Only the accountant role can record income and expenses here." />;
  }

  return (
    <div className="flex flex-col gap-5">
      <p className="text-sm text-ink-500">
        Type a batch of everyday income and expenses below — no need to know debit or credit. Each row becomes a draft journal entry, ready to review and
        post from Journal entries.
      </p>

      <div className="max-w-xs">
        <label className="mb-1.5 block text-xs font-medium text-ink-700">Paid into / out of</label>
        <Combobox options={offsetOptions} value={offsetAccountId} onChange={setOffsetAccountId} placeholder="Choose bank, cash or petty cash…" />
      </div>

      <div className="overflow-hidden rounded-card border border-paper-200 bg-paper-0">
        <div className="grid grid-cols-[130px,110px,1fr,1fr,130px,40px] gap-2 border-b border-paper-200 bg-paper-50 px-4 py-2.5 text-[12px] font-medium uppercase tracking-wide text-ink-400">
          <span>Date</span>
          <span>Type</span>
          <span>Category</span>
          <span>Description</span>
          <span className="text-right">Amount</span>
          <span />
        </div>
        {rows.map((row, i) => (
          <div key={i} className="grid grid-cols-[130px,110px,1fr,1fr,130px,40px] items-center gap-2 border-b border-paper-100 px-4 py-2 last:border-0">
            <DatePicker value={row.entryDate} onChange={(d) => updateRow(i, { entryDate: d })} />
            <ButtonGroup
              options={[
                { value: "income", label: "In" },
                { value: "expense", label: "Out" },
              ]}
              value={row.kind}
              onChange={(v) => updateRow(i, { kind: v as DraftRow["kind"], categoryAccountId: "" })}
            />
            <Combobox
              options={row.kind === "income" ? incomeOptions : expenseOptions}
              value={row.categoryAccountId}
              onChange={(v) => updateRow(i, { categoryAccountId: v })}
              placeholder="Category…"
            />
            <Input value={row.description} onChange={(e) => updateRow(i, { description: e.target.value })} placeholder="What was this for?" />
            <MoneyInput value={row.amount} onValueChange={(v) => updateRow(i, { amount: v })} />
            <button
              type="button"
              aria-label="Remove row"
              onClick={() => setRows((prev) => prev.filter((_, idx) => idx !== i))}
              className="flex size-8 items-center justify-center rounded-ctrl text-ink-400 hover:bg-paper-100 hover:text-danger-600"
            >
              <TbTrash className="size-4" />
            </button>
          </div>
        ))}
        <div className="px-4 py-2">
          <Button variant="ghost" size="sm" icon={<TbPlus />} onClick={() => setRows((prev) => [...prev, blankRow()])}>
            Add row
          </Button>
        </div>
        <div className="grid grid-cols-[130px,110px,1fr,1fr,130px,40px] gap-2 border-t border-paper-200 bg-paper-50 px-4 py-2.5 text-sm font-medium">
          <span className="col-span-4 text-ink-700">Net for this batch</span>
          <span className={`text-right tabular-nums ${total >= 0 ? "text-field-500" : "text-danger-600"}`}>{total.toFixed(2)}</span>
          <span />
        </div>
      </div>

      {error && <FieldError>{error}</FieldError>}

      <Button className="self-end" loading={saving} onClick={submit}>
        Save as draft entries
      </Button>
    </div>
  );
}
