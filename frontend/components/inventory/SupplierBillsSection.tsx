"use client";

import { useMemo, useState } from "react";
import { Badge } from "@/components/ui/Badge";
import { DataTable, type DataTableColumn } from "@/components/ui/DataTable";
import { KpiRow, StatCard } from "@/components/ui/StatCard";
import { createClient } from "@/lib/supabase/client";
import { formatDate } from "@/lib/formatDate";
import { MarkBillPaidDrawer } from "./MarkBillPaidDrawer";
import type { Database } from "@/lib/database.types";

type SupplierBillRow = Database["public"]["Tables"]["supplier_bills"]["Row"];

interface AccountOption {
  id: string;
  code: string;
  name: string;
  type: string;
}

function money(v: number) {
  return v.toLocaleString("en-SZ", { minimumFractionDigits: 2 });
}

export interface SupplierBillsSectionProps {
  tenantId: string;
  bills: SupplierBillRow[];
  suppliers: { id: string; name: string }[];
  accounts: AccountOption[];
  canManage: boolean;
}

export function SupplierBillsSection({ tenantId, bills: initialBills, suppliers, accounts, canManage }: SupplierBillsSectionProps) {
  const [bills, setBills] = useState(initialBills);
  const [payTarget, setPayTarget] = useState<SupplierBillRow | null>(null);
  const supplierMap = new Map(suppliers.map((s) => [s.id, s.name]));

  const refresh = async () => {
    const supabase = createClient();
    const { data } = await supabase.from("supplier_bills").select("*").eq("tenant_id", tenantId).order("bill_date", { ascending: false });
    setBills(data ?? []);
  };

  const totalOutstanding = useMemo(() => bills.filter((b) => b.status === "open").reduce((s, b) => s + b.amount, 0), [bills]);

  const columns: DataTableColumn<SupplierBillRow>[] = [
    { key: "bill_no", header: "Bill no.", render: (b) => <span className="font-mono text-xs">{b.bill_no}</span> },
    { key: "supplier", header: "Supplier", render: (b) => supplierMap.get(b.supplier_id) ?? "—" },
    { key: "date", header: "Bill date", render: (b) => formatDate(b.bill_date), sortable: true, sortValue: (b) => b.bill_date },
    { key: "amount", header: "Amount", align: "right", render: (b) => money(b.amount) },
    { key: "status", header: "Status", render: (b) => <Badge variant={b.status === "paid" ? "success" : "warning"}>{b.status}</Badge> },
  ];

  return (
    <div className="flex flex-col gap-4">
      <KpiRow>
        <StatCard label="Outstanding to suppliers" value={totalOutstanding} formatValue={money} />
      </KpiRow>

      <DataTable
        columns={columns}
        data={bills}
        rowKey={(b) => b.id}
        emptyTitle="No supplier bills yet"
        emptyBody="Bills created automatically when goods received notes are recorded will appear here."
        rowActions={canManage ? (b) => (b.status === "open" ? [{ label: "Mark as paid", onSelect: () => setPayTarget(b) }] : []) : undefined}
      />

      {canManage && <MarkBillPaidDrawer bill={payTarget} onOpenChange={(v) => !v && setPayTarget(null)} accounts={accounts} onSaved={refresh} />}
    </div>
  );
}
