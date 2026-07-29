"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { TbPlus } from "react-icons/tb";
import { Button } from "@/components/ui/Button";
import { DataTable, type DataTableColumn } from "@/components/ui/DataTable";
import { Badge } from "@/components/ui/Badge";
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
  const [creating, setCreating] = useState(false);

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

  const columns: DataTableColumn<JournalEntryRow>[] = [
    { key: "entry_no", header: "Entry no.", render: (e) => <span className="font-mono text-xs">{e.entry_no}</span> },
    { key: "date", header: "Date", render: (e) => formatDate(e.entry_date), sortable: true, sortValue: (e) => e.entry_date },
    { key: "memo", header: "Memo", render: (e) => e.memo || "—" },
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
      />
    </div>
  );
}
