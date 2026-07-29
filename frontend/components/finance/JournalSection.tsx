"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { TbPlus, TbTrash } from "react-icons/tb";
import { Button } from "@/components/ui/Button";
import { DataTable, type DataTableColumn } from "@/components/ui/DataTable";
import { Badge } from "@/components/ui/Badge";
import { Modal } from "@/components/ui/Modal";
import { useToast } from "@/components/ui/Toast";
import { createClient } from "@/lib/supabase/client";
import { formatDate } from "@/lib/formatDate";
import type { Database } from "@/lib/database.types";

type JournalEntryRow = Database["public"]["Tables"]["journal_entries"]["Row"];

export interface JournalSectionProps {
  tenantId: string;
  initialEntries: JournalEntryRow[];
  canCreate: boolean;
}

export function JournalSection({ tenantId, initialEntries, canCreate }: JournalSectionProps) {
  const router = useRouter();
  const { addToast } = useToast();
  const [entries, setEntries] = useState(initialEntries);
  const [totals, setTotals] = useState<Map<string, number>>(new Map());
  const [creating, setCreating] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<JournalEntryRow | null>(null);
  const [deleting, setDeleting] = useState(false);

  const refresh = async () => {
    const supabase = createClient();
    const { data } = await supabase.from("journal_entries").select("*").eq("tenant_id", tenantId).order("entry_date", { ascending: false });
    setEntries(data ?? []);
  };

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const supabase = createClient();
      const { data } = await supabase
        .from("journal_lines")
        .select("journal_entry_id, debit");
      if (cancelled) return;
      const map = new Map<string, number>();
      for (const l of (data as unknown as { journal_entry_id: string; debit: number }[]) ?? []) {
        map.set(l.journal_entry_id, (map.get(l.journal_entry_id) ?? 0) + Number(l.debit));
      }
      setTotals(map);
    })();
    return () => {
      cancelled = true;
    };
  }, [entries]);

  const createDraft = async () => {
    setCreating(true);
    const supabase = createClient();
    const year = new Date().getFullYear();
    const { count } = await supabase
      .from("journal_entries")
      .select("id", { count: "exact", head: true })
      .eq("tenant_id", tenantId)
      .like("entry_no", `JE-${year}-%`);
    const entryNo = `JE-${year}-${(count ?? 0) + 1}`;

    const {
      data: { user },
    } = await supabase.auth.getUser();

    const { data, error } = await supabase
      .from("journal_entries")
      .insert({ tenant_id: tenantId, entry_no: entryNo, created_by: user?.id })
      .select()
      .single();
    setCreating(false);

    if (error || !data) {
      addToast({ variant: "danger", message: error?.message ?? "Couldn't create entry" });
      return;
    }
    router.push(`/finance/journal/${data.id}`);
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    const supabase = createClient();
    const { error } = await supabase.from("journal_entries").delete().eq("id", deleteTarget.id);
    setDeleting(false);
    if (error) {
      addToast({ variant: "danger", message: error.message });
      return;
    }
    addToast({ variant: "field", message: "Draft entry deleted" });
    setDeleteTarget(null);
    refresh();
  };

  const columns: DataTableColumn<JournalEntryRow>[] = [
    { key: "entry_no", header: "Entry no.", render: (e) => <span className="font-mono text-xs">{e.entry_no}</span> },
    { key: "date", header: "Date", render: (e) => formatDate(e.entry_date), sortable: true, sortValue: (e) => e.entry_date },
    { key: "memo", header: "Memo", render: (e) => e.memo || "—" },
    { key: "amount", header: "Amount", align: "right", render: (e) => (totals.get(e.id) ?? 0).toLocaleString("en-SZ", { minimumFractionDigits: 2 }) },
    { key: "status", header: "Status", render: (e) => <Badge variant={e.status === "posted" ? "success" : "neutral"}>{e.status}</Badge> },
  ];

  return (
    <div className="flex flex-col gap-4">
      {canCreate && (
        <Button icon={<TbPlus />} className="self-end" loading={creating} onClick={createDraft}>
          New entry
        </Button>
      )}
      <DataTable
        columns={columns}
        data={entries}
        rowKey={(e) => e.id}
        onRowClick={(e) => router.push(`/finance/journal/${e.id}`)}
        emptyTitle="No journal entries yet"
        emptyBody="Manual journal entries you create will appear here."
        rowActions={
          canCreate
            ? (e) => (e.status === "draft" ? [{ label: "Delete draft", icon: <TbTrash />, destructive: true, onSelect: () => setDeleteTarget(e) }] : [])
            : undefined
        }
      />

      <Modal
        open={!!deleteTarget}
        onOpenChange={(v) => !v && setDeleteTarget(null)}
        title="Delete draft entry"
        footer={
          <>
            <Button variant="ghost" onClick={() => setDeleteTarget(null)}>
              Cancel
            </Button>
            <Button variant="danger" loading={deleting} onClick={confirmDelete}>
              Delete
            </Button>
          </>
        }
      >
        <p className="text-sm text-ink-700">
          Delete {deleteTarget?.entry_no} and its lines? This can&apos;t be undone. Only draft entries can be deleted — posted entries are permanent.
        </p>
      </Modal>
    </div>
  );
}
