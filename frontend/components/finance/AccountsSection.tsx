"use client";

import { useEffect, useMemo, useState } from "react";
import { TbEdit, TbPlus, TbTemplate } from "react-icons/tb";
import { Button, IconButton } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { KpiRow, StatCard } from "@/components/ui/StatCard";
import { useToast } from "@/components/ui/Toast";
import { createClient } from "@/lib/supabase/client";
import { AccountFormDrawer } from "./AccountFormDrawer";
import type { AccountType, Database } from "@/lib/database.types";

type AccountRow = Database["public"]["Tables"]["accounts"]["Row"];

const TYPE_ORDER: AccountType[] = ["asset", "liability", "equity", "income", "expense"];
const TYPE_LABEL: Record<AccountType, string> = {
  asset: "Assets — what you own",
  liability: "Liabilities — what you owe",
  equity: "Equity — member contributions & retained earnings",
  income: "Income — money coming in",
  expense: "Expenses — money going out",
};
// Assets/expenses carry a natural debit balance; liabilities/equity/income
// carry a natural credit balance — this decides the sign shown to the user.
const DEBIT_NORMAL: AccountType[] = ["asset", "expense"];

export interface AccountsSectionProps {
  tenantId: string;
  initialAccounts: AccountRow[];
  canManage: boolean;
}

export function AccountsSection({ tenantId, initialAccounts, canManage }: AccountsSectionProps) {
  const { addToast } = useToast();
  const [accounts, setAccounts] = useState(initialAccounts);
  const [balances, setBalances] = useState<Map<string, number>>(new Map());
  const [addOpen, setAddOpen] = useState(false);
  const [editing, setEditing] = useState<AccountRow | null>(null);
  const [seeding, setSeeding] = useState(false);

  const refresh = async () => {
    const supabase = createClient();
    const { data } = await supabase.from("accounts").select("*").eq("tenant_id", tenantId).order("code", { ascending: true });
    setAccounts(data ?? []);
  };

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const supabase = createClient();
      const { data } = await supabase
        .from("journal_lines")
        .select("account_id, debit, credit, journal_entries!inner(status, tenant_id)")
        .eq("journal_entries.tenant_id", tenantId)
        .eq("journal_entries.status", "posted");
      if (cancelled) return;
      const map = new Map<string, number>();
      for (const l of (data as unknown as { account_id: string; debit: number; credit: number }[]) ?? []) {
        map.set(l.account_id, (map.get(l.account_id) ?? 0) + (Number(l.debit) - Number(l.credit)));
      }
      setBalances(map);
    })();
    return () => {
      cancelled = true;
    };
  }, [tenantId, accounts]);

  const signedBalance = (a: AccountRow) => {
    const debitNet = balances.get(a.id) ?? 0;
    return DEBIT_NORMAL.includes(a.type) ? debitNet : -debitNet;
  };

  const totals = useMemo(() => {
    const sum = (type: AccountType) => accounts.filter((a) => a.type === type).reduce((s, a) => s + signedBalance(a), 0);
    return { asset: sum("asset"), liability: sum("liability"), equity: sum("equity") };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accounts, balances]);

  const seedTemplate = async () => {
    setSeeding(true);
    const supabase = createClient();
    const { error } = await supabase.rpc("seed_default_chart_of_accounts", { p_tenant_id: tenantId });
    setSeeding(false);
    if (error) {
      addToast({ variant: "danger", message: error.message });
      return;
    }
    addToast({ variant: "field", message: "Chart of accounts set up from the agri/co-op template" });
    refresh();
  };

  const money = (v: number) => v.toLocaleString("en-SZ", { minimumFractionDigits: 2 });

  return (
    <div className="flex flex-col gap-6">
      {accounts.length > 0 && (
        <KpiRow>
          <StatCard label="Total assets" value={totals.asset} formatValue={money} />
          <StatCard label="Total liabilities" value={totals.liability} formatValue={money} />
          <StatCard label="Total equity" value={totals.equity} formatValue={money} />
        </KpiRow>
      )}

      {canManage && (
        <div className="flex justify-end gap-2">
          <Button variant="secondary" icon={<TbTemplate />} loading={seeding} onClick={seedTemplate}>
            Set up from template
          </Button>
          <Button icon={<TbPlus />} onClick={() => setAddOpen(true)}>
            Add account
          </Button>
        </div>
      )}

      {accounts.length === 0 ? (
        <EmptyState
          title="No accounts yet"
          body={canManage ? "Set up the agri/co-op starter template, or add accounts one at a time." : "The chart of accounts hasn't been set up yet."}
        />
      ) : (
        TYPE_ORDER.map((type) => {
          const rows = accounts.filter((a) => a.type === type);
          if (rows.length === 0) return null;
          return (
            <div key={type} className="flex flex-col gap-2">
              <SectionHeading>{TYPE_LABEL[type]}</SectionHeading>
              <div className="overflow-hidden rounded-card border border-paper-200 bg-paper-0">
                {rows.map((a) => (
                  <div key={a.id} className="flex items-center gap-3 border-b border-paper-100 px-4 py-3 last:border-0">
                    <span className="w-16 shrink-0 font-mono text-xs text-ink-400">{a.code}</span>
                    <span className="flex-1 text-sm text-ink-900">{a.name}</span>
                    {!a.is_active && <Badge variant="neutral">Inactive</Badge>}
                    <span className="w-32 shrink-0 text-right text-sm tabular-nums text-ink-900">{money(signedBalance(a))}</span>
                    {canManage && <IconButton label="Edit account" icon={<TbEdit />} size="sm" onClick={() => setEditing(a)} />}
                  </div>
                ))}
              </div>
            </div>
          );
        })
      )}

      {canManage && (
        <>
          <AccountFormDrawer tenantId={tenantId} open={addOpen} onOpenChange={setAddOpen} onSaved={refresh} />
          <AccountFormDrawer tenantId={tenantId} open={!!editing} onOpenChange={(v) => !v && setEditing(null)} account={editing} onSaved={refresh} />
        </>
      )}
    </div>
  );
}
