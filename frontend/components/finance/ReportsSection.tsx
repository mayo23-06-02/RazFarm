"use client";

import { useEffect, useMemo, useState } from "react";
import { ButtonGroup } from "@/components/ui/Button";
import { DatePicker } from "@/components/ui/DatePicker";
import { DataTable, type DataTableColumn } from "@/components/ui/DataTable";
import { EmptyState } from "@/components/ui/EmptyState";
import { createClient } from "@/lib/supabase/client";
import type { AccountType, Database } from "@/lib/database.types";

type AccountRow = Database["public"]["Tables"]["accounts"]["Row"];

interface PostedLine {
  account_id: string;
  debit: number;
  credit: number;
  entry_date: string;
}

const REPORT_OPTIONS = [
  { value: "trial_balance", label: "Trial balance" },
  { value: "income_statement", label: "Income statement" },
  { value: "balance_sheet", label: "Balance sheet" },
];

// Assets/expenses carry a natural debit balance; liabilities/equity/income
// carry a natural credit balance — decides the sign shown in the P&L/balance
// sheet (which show one signed, human-readable "balance" per account).
const DEBIT_NORMAL: AccountType[] = ["asset", "expense"];

interface AccountNet {
  code: string;
  name: string;
  type: AccountType;
  debitNet: number; // sum(debit) - sum(credit), unsigned by account type
}

export interface ReportsSectionProps {
  tenantId: string;
}

export function ReportsSection({ tenantId }: ReportsSectionProps) {
  const [report, setReport] = useState<"trial_balance" | "income_statement" | "balance_sheet">("trial_balance");
  const oneYearAgo = new Date();
  oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
  const [startDate, setStartDate] = useState(oneYearAgo);
  const [endDate, setEndDate] = useState(new Date());
  const [accounts, setAccounts] = useState<AccountRow[]>([]);
  const [lines, setLines] = useState<PostedLine[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    (async () => {
      const supabase = createClient();
      const [{ data: acc }, { data: postedLines }] = await Promise.all([
        supabase.from("accounts").select("*").eq("tenant_id", tenantId).order("code", { ascending: true }),
        supabase
          .from("journal_lines")
          .select("account_id, debit, credit, journal_entries!inner(entry_date, status, tenant_id)")
          .eq("journal_entries.tenant_id", tenantId)
          .eq("journal_entries.status", "posted"),
      ]);
      if (cancelled) return;
      setAccounts(acc ?? []);
      setLines(
        ((postedLines as unknown as { account_id: string; debit: number; credit: number; journal_entries: { entry_date: string } }[]) ?? []).map((l) => ({
          account_id: l.account_id,
          debit: Number(l.debit),
          credit: Number(l.credit),
          entry_date: l.journal_entries.entry_date,
        }))
      );
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [tenantId]);

  const accountNets: AccountNet[] = useMemo(() => {
    const end = endDate.toISOString().slice(0, 10);
    const start = startDate.toISOString().slice(0, 10);

    const relevant = lines.filter((l) => (report === "income_statement" ? l.entry_date >= start && l.entry_date <= end : l.entry_date <= end));

    const totals = new Map<string, number>();
    for (const l of relevant) {
      totals.set(l.account_id, (totals.get(l.account_id) ?? 0) + (l.debit - l.credit));
    }

    const typeFilter: AccountType[] =
      report === "income_statement" ? ["income", "expense"] : report === "balance_sheet" ? ["asset", "liability", "equity"] : ["asset", "liability", "equity", "income", "expense"];

    return accounts
      .filter((a) => typeFilter.includes(a.type) && (totals.get(a.id) ?? 0) !== 0)
      .map((a) => ({ code: a.code, name: a.name, type: a.type, debitNet: totals.get(a.id) ?? 0 }));
  }, [accounts, lines, report, startDate, endDate]);

  const trialBalanceColumns: DataTableColumn<AccountNet>[] = [
    { key: "code", header: "Code", render: (r) => <span className="font-mono text-xs">{r.code}</span> },
    { key: "name", header: "Account", render: (r) => r.name },
    { key: "debit", header: "Debit", align: "right", render: (r) => (r.debitNet > 0 ? r.debitNet.toLocaleString("en-SZ", { minimumFractionDigits: 2 }) : "") },
    { key: "credit", header: "Credit", align: "right", render: (r) => (r.debitNet < 0 ? Math.abs(r.debitNet).toLocaleString("en-SZ", { minimumFractionDigits: 2 }) : "") },
  ];

  const balanceColumns: DataTableColumn<AccountNet>[] = [
    { key: "code", header: "Code", render: (r) => <span className="font-mono text-xs">{r.code}</span> },
    { key: "name", header: "Account", render: (r) => r.name },
    {
      key: "balance",
      header: "Balance",
      align: "right",
      render: (r) => (DEBIT_NORMAL.includes(r.type) ? r.debitNet : -r.debitNet).toLocaleString("en-SZ", { minimumFractionDigits: 2 }),
    },
  ];

  const totalDebit = accountNets.filter((r) => r.debitNet > 0).reduce((s, r) => s + r.debitNet, 0);
  const totalCredit = accountNets.filter((r) => r.debitNet < 0).reduce((s, r) => s + Math.abs(r.debitNet), 0);
  const signedTotal = accountNets.reduce((s, r) => s + (DEBIT_NORMAL.includes(r.type) ? r.debitNet : -r.debitNet), 0);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <ButtonGroup options={REPORT_OPTIONS} value={report} onChange={(v) => setReport(v as typeof report)} />
        <div className="flex items-center gap-2">
          {report === "income_statement" && (
            <>
              <DatePicker value={startDate} onChange={setStartDate} />
              <span className="text-sm text-ink-400">to</span>
            </>
          )}
          <DatePicker value={endDate} onChange={setEndDate} />
        </div>
      </div>

      {accountNets.length === 0 ? (
        <EmptyState title="Nothing posted yet" body="Post journal entries to see figures in this report." compact />
      ) : report === "trial_balance" ? (
        <>
          <DataTable columns={trialBalanceColumns} data={accountNets} rowKey={(r) => r.code} loading={loading} />
          <div className="flex justify-end gap-6 rounded-card border border-paper-200 bg-paper-50 px-4 py-3 text-sm font-medium">
            <span className="tabular-nums text-ink-900">Debit {totalDebit.toLocaleString("en-SZ", { minimumFractionDigits: 2 })}</span>
            <span className="tabular-nums text-ink-900">Credit {totalCredit.toLocaleString("en-SZ", { minimumFractionDigits: 2 })}</span>
          </div>
        </>
      ) : (
        <>
          <DataTable columns={balanceColumns} data={accountNets} rowKey={(r) => r.code} loading={loading} />
          <div className="flex justify-end gap-4 rounded-card border border-paper-200 bg-paper-50 px-4 py-3 text-sm font-medium">
            <span className="text-ink-700">{report === "income_statement" ? `Net ${signedTotal >= 0 ? "profit" : "loss"}` : "Total"}</span>
            <span className="tabular-nums text-ink-900">
              {report === "income_statement" ? Math.abs(signedTotal).toLocaleString("en-SZ", { minimumFractionDigits: 2 }) : signedTotal.toLocaleString("en-SZ", { minimumFractionDigits: 2 })}
            </span>
          </div>
        </>
      )}
    </div>
  );
}
