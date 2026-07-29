"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { TbEdit, TbPlus } from "react-icons/tb";
import { PageHeader } from "@/components/ui/PageHeader";
import { Tabs } from "@/components/ui/Tabs";
import { DataTable, type DataTableColumn } from "@/components/ui/DataTable";
import { Badge, type BadgeVariant } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { createClient } from "@/lib/supabase/client";
import { useToast } from "@/components/ui/Toast";
import { formatDate } from "@/lib/formatDate";
import { NewPayoutRunDrawer } from "./NewPayoutRunDrawer";
import { DeductionTypeFormDrawer } from "./DeductionTypeFormDrawer";
import type { Database, PayoutRunStatus } from "@/lib/database.types";

type PayoutRunRow = Database["public"]["Tables"]["payout_runs"]["Row"];
type DeductionTypeRow = Database["public"]["Tables"]["deduction_types"]["Row"];

interface AccountOption {
  id: string;
  code: string;
  name: string;
}

const STATUS_BADGE: Record<PayoutRunStatus, BadgeVariant> = {
  draft: "neutral",
  approved: "warning",
  paid: "success",
};

function money(v: number) {
  return v.toLocaleString("en-SZ", { minimumFractionDigits: 2 });
}

export interface PayoutsSectionProps {
  tenantId: string;
  initialRuns: PayoutRunRow[];
  initialDeductionTypes: DeductionTypeRow[];
  allAccounts: AccountOption[];
  canManage: boolean;
}

export function PayoutsSection({ tenantId, initialRuns, initialDeductionTypes, allAccounts, canManage }: PayoutsSectionProps) {
  const router = useRouter();
  const { addToast } = useToast();
  const [tab, setTab] = useState("runs");
  const [runs, setRuns] = useState(initialRuns);
  const [deductionTypes, setDeductionTypes] = useState(initialDeductionTypes);
  const [newRunOpen, setNewRunOpen] = useState(false);
  const [deductionDrawerOpen, setDeductionDrawerOpen] = useState(false);
  const [editingDeduction, setEditingDeduction] = useState<DeductionTypeRow | null>(null);
  const [seeding, setSeeding] = useState(false);

  const bankAccounts = allAccounts; // any account can technically hold cash; accountant picks the right one

  const refreshDeductionTypes = async () => {
    const supabase = createClient();
    const { data } = await supabase.from("deduction_types").select("*").eq("tenant_id", tenantId).order("position", { ascending: true });
    setDeductionTypes(data ?? []);
  };

  const seedDeductionTypes = async () => {
    setSeeding(true);
    const supabase = createClient();
    const { error } = await supabase.rpc("seed_default_deduction_types", { p_tenant_id: tenantId });
    setSeeding(false);
    if (error) {
      addToast({ variant: "danger", message: error.message });
      return;
    }
    addToast({ variant: "field", message: "Starter deduction types added" });
    refreshDeductionTypes();
  };

  const runColumns: DataTableColumn<PayoutRunRow>[] = [
    { key: "run_no", header: "Run", render: (r) => <span className="font-mono text-xs">{r.run_no}</span> },
    { key: "title", header: "Title", render: (r) => r.title },
    { key: "run_date", header: "Date", render: (r) => formatDate(r.run_date), sortable: true, sortValue: (r) => r.run_date },
    { key: "gross_pool", header: "Gross pool", align: "right", render: (r) => money(Number(r.gross_pool)) },
    { key: "status", header: "Status", render: (r) => <Badge variant={STATUS_BADGE[r.status]}>{r.status}</Badge> },
  ];

  const accountMap = new Map(allAccounts.map((a) => [a.id, a]));
  const deductionColumns: DataTableColumn<DeductionTypeRow>[] = [
    { key: "name", header: "Name", render: (d) => d.name },
    { key: "account", header: "Recovers into", render: (d) => (accountMap.get(d.gl_account_id) ? `${accountMap.get(d.gl_account_id)!.code} — ${accountMap.get(d.gl_account_id)!.name}` : "—") },
    { key: "status", header: "Status", render: (d) => <Badge variant={d.is_active ? "success" : "neutral"}>{d.is_active ? "Active" : "Inactive"}</Badge> },
  ];

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Member payouts" subtitle="Split cane proceeds across members by shareholding, apply deductions, and pay out." />
      <Tabs value={tab} onChange={setTab} items={[{ value: "runs", label: "Payout runs" }, { value: "deductions", label: "Deduction types" }]} />

      {tab === "runs" && (
        <div className="flex flex-col gap-4">
          {canManage && (
            <Button icon={<TbPlus />} className="self-end" onClick={() => setNewRunOpen(true)}>
              New payout run
            </Button>
          )}
          <DataTable
            columns={runColumns}
            data={runs}
            rowKey={(r) => r.id}
            onRowClick={(r) => router.push(`/finance/payouts/${r.id}`)}
            emptyTitle="No payout runs yet"
            emptyBody="Create a run to split cane proceeds across members."
          />
        </div>
      )}

      {tab === "deductions" && (
        <div className="flex flex-col gap-4">
          {canManage && (
            <div className="flex justify-end gap-2">
              {deductionTypes.length === 0 && (
                <Button variant="secondary" loading={seeding} onClick={seedDeductionTypes}>
                  Add starter deduction types
                </Button>
              )}
              <Button icon={<TbPlus />} onClick={() => setDeductionDrawerOpen(true)}>
                Add deduction type
              </Button>
            </div>
          )}
          <DataTable
            columns={deductionColumns}
            data={deductionTypes}
            rowKey={(d) => d.id}
            emptyTitle="No deduction types yet"
            emptyBody="Set these up once — every future payout run will offer them."
            rowActions={canManage ? (d) => [{ label: "Edit", icon: <TbEdit />, onSelect: () => setEditingDeduction(d) }] : undefined}
          />
        </div>
      )}

      {canManage && (
        <>
          <NewPayoutRunDrawer tenantId={tenantId} bankAccounts={bankAccounts} open={newRunOpen} onOpenChange={setNewRunOpen} />
          <DeductionTypeFormDrawer tenantId={tenantId} accounts={allAccounts} open={deductionDrawerOpen} onOpenChange={setDeductionDrawerOpen} onSaved={refreshDeductionTypes} />
          <DeductionTypeFormDrawer
            tenantId={tenantId}
            accounts={allAccounts}
            open={!!editingDeduction}
            onOpenChange={(v) => !v && setEditingDeduction(null)}
            deductionType={editingDeduction}
            onSaved={refreshDeductionTypes}
          />
        </>
      )}
    </div>
  );
}
