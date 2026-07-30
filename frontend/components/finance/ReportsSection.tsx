"use client";

import { useEffect, useMemo, useState } from "react";
import { TbCircleCheck, TbAlertTriangle, TbFileTypePdf, TbFileTypeCsv } from "react-icons/tb";
import { Button, ButtonGroup } from "@/components/ui/Button";
import { DatePicker } from "@/components/ui/DatePicker";
import { DataTable, type DataTableColumn } from "@/components/ui/DataTable";
import { EmptyState } from "@/components/ui/EmptyState";
import { Card } from "@/components/ui/Card";
import { KpiRow, StatCard } from "@/components/ui/StatCard";
import { Banner } from "@/components/ui/Banner";
import { formatDate } from "@/lib/formatDate";
import { createClient } from "@/lib/supabase/client";
import { exportReportCsv, exportReportPdf, type ExportSection } from "@/lib/exportReport";
import type { AccountType, Database } from "@/lib/database.types";

type AccountRow = Database["public"]["Tables"]["accounts"]["Row"];

interface PostedLine {
  account_id: string;
  debit: number;
  credit: number;
  entry_date: string;
}

const REPORT_OPTIONS = [
  { value: "balance_sheet", label: "Balance sheet" },
  { value: "income_statement", label: "Income statement" },
  { value: "trial_balance", label: "Trial balance" },
];

// Assets/expenses carry a natural debit balance; liabilities/equity/income
// carry a natural credit balance — decides the sign shown to the user.
const DEBIT_NORMAL: AccountType[] = ["asset", "expense"];

interface AccountNet {
  code: string;
  name: string;
  type: AccountType;
  debitNet: number; // sum(debit) - sum(credit), unsigned by account type
}

function money(v: number) {
  return v.toLocaleString("en-SZ", { minimumFractionDigits: 2 });
}

export interface ReportsSectionProps {
  tenantId: string;
}

export function ReportsSection({ tenantId }: ReportsSectionProps) {
  const [report, setReport] = useState<"trial_balance" | "income_statement" | "balance_sheet">("balance_sheet");
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

  const byType = (type: AccountType) => accountNets.filter((r) => r.type === type);
  const groupBalance = (type: AccountType) => byType(type).reduce((s, r) => s + (DEBIT_NORMAL.includes(type) ? r.debitNet : -r.debitNet), 0);

  // Income/expense are "temporary" accounts that a real bookkeeping system
  // moves into equity via a period-end closing entry. A layman treasurer
  // shouldn't have to know that — instead, always fold not-yet-closed
  // earnings into the balance sheet automatically, computed as-of the same
  // end date regardless of which report tab is showing (accountNets is
  // filtered to the current report's account types, so this uses the raw
  // lines/accounts data directly rather than accountNets).
  const netIncomeToDate = useMemo(() => {
    const end = endDate.toISOString().slice(0, 10);
    const accountType = new Map(accounts.map((a) => [a.id, a.type]));
    let net = 0;
    for (const l of lines) {
      if (l.entry_date > end) continue;
      const type = accountType.get(l.account_id);
      if (type === "income") net += l.credit - l.debit;
      else if (type === "expense") net -= l.debit - l.credit;
    }
    return net;
  }, [accounts, lines, endDate]);

  // Inventory (account 1300, created on demand by ensure_inventory_account —
  // see 0009 §5) posts automatically on every stock receipt/issue/adjustment
  // and PO receipt, so this always reflects inventory value straight from the
  // ledger — no separate sync step, this *is* the finance side of it.
  const inventoryValue = accountNets.find((a) => a.code === "1300")?.debitNet ?? 0;

  const totalAssets = groupBalance("asset");
  const totalLiabilities = groupBalance("liability");
  const totalEquity = groupBalance("equity") + (report === "balance_sheet" ? netIncomeToDate : 0);
  const totalIncome = groupBalance("income");
  const totalExpense = groupBalance("expense");
  const netProfit = totalIncome - totalExpense;
  const balanceSheetBalanced = Math.abs(totalAssets - (totalLiabilities + totalEquity)) < 0.01;

  const totalDebit = accountNets.filter((r) => r.debitNet > 0).reduce((s, r) => s + r.debitNet, 0);
  const totalCredit = accountNets.filter((r) => r.debitNet < 0).reduce((s, r) => s + Math.abs(r.debitNet), 0);

  const reportDescription =
    report === "balance_sheet"
      ? `A snapshot of everything the association owns and owes as of ${formatDate(endDate)}.`
      : report === "income_statement"
        ? `How much came in versus went out between ${formatDate(startDate)} and ${formatDate(endDate)}.`
        : "A technical check accountants use to confirm every debit has a matching credit — the two totals below should always be equal.";

  const exportSections: ExportSection[] = useMemo(() => {
    if (report === "balance_sheet") {
      const equityRows: (string | number)[][] = byType("equity").map((r) => [r.name, money(-r.debitNet)]);
      if (netIncomeToDate !== 0) equityRows.push(["Current period earnings (not yet closed)", money(netIncomeToDate)]);
      return [
        {
          heading: "Assets",
          columns: ["Account", "Amount"],
          rows: byType("asset").map((r) => [r.name, money(r.debitNet)]),
          totalRow: ["Total assets", money(totalAssets)],
        },
        {
          heading: "Liabilities",
          columns: ["Account", "Amount"],
          rows: byType("liability").map((r) => [r.name, money(-r.debitNet)]),
          totalRow: ["Total liabilities", money(totalLiabilities)],
        },
        {
          heading: "Equity",
          columns: ["Account", "Amount"],
          rows: equityRows,
          totalRow: ["Total equity", money(totalEquity)],
        },
        {
          heading: "Summary",
          columns: ["", ""],
          rows: [
            ["Total assets", money(totalAssets)],
            ["Total liabilities & equity", money(totalLiabilities + totalEquity)],
          ],
          totalRow: ["Balanced?", balanceSheetBalanced ? "Yes" : "No"],
        },
      ];
    }

    if (report === "income_statement") {
      return [
        {
          heading: "Income",
          columns: ["Account", "Amount"],
          rows: byType("income").map((r) => [r.name, money(-r.debitNet)]),
          totalRow: ["Total income", money(totalIncome)],
        },
        {
          heading: "Expenses",
          columns: ["Account", "Amount"],
          rows: byType("expense").map((r) => [r.name, money(r.debitNet)]),
          totalRow: ["Total expenses", money(totalExpense)],
        },
        {
          heading: "Summary",
          columns: ["", ""],
          rows: [],
          totalRow: [netProfit >= 0 ? "Net profit" : "Net loss", money(Math.abs(netProfit))],
        },
      ];
    }

    return [
      {
        heading: "Trial balance",
        columns: ["Code", "Account", "Debit", "Credit"],
        rows: accountNets.map((r) => [r.code, r.name, r.debitNet > 0 ? money(r.debitNet) : "", r.debitNet < 0 ? money(Math.abs(r.debitNet)) : ""]),
        totalRow: ["", "Total", money(totalDebit), money(totalCredit)],
      },
    ];
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [report, accountNets, totalAssets, totalLiabilities, totalEquity, totalIncome, totalExpense, netProfit, netIncomeToDate, totalDebit, totalCredit, balanceSheetBalanced]);

  const exportFileNameBase = `${report}-${endDate.toISOString().slice(0, 10)}`;

  const handleExportPdf = () => {
    exportReportPdf({
      title: `Cane & Ledger — ${REPORT_OPTIONS.find((o) => o.value === report)!.label}`,
      subtitle: reportDescription,
      sections: exportSections,
      fileNameBase: exportFileNameBase,
    });
  };

  const handleExportCsv = () => {
    const rows: string[][] = [];
    for (const section of exportSections) {
      rows.push([section.heading]);
      rows.push(section.columns);
      for (const r of section.rows) rows.push(r.map(String));
      if (section.totalRow) rows.push(section.totalRow.map(String));
      rows.push([]);
    }
    exportReportCsv({ rows, fileNameBase: exportFileNameBase });
  };

  const trialBalanceColumns: DataTableColumn<AccountNet>[] = [
    { key: "code", header: "Code", render: (r) => <span className="font-mono text-xs">{r.code}</span> },
    { key: "name", header: "Account", render: (r) => r.name },
    { key: "debit", header: "Debit", align: "right", render: (r) => (r.debitNet > 0 ? money(r.debitNet) : "") },
    { key: "credit", header: "Credit", align: "right", render: (r) => (r.debitNet < 0 ? money(Math.abs(r.debitNet)) : "") },
  ];

  function GroupList({ type, emptyLabel }: { type: AccountType; emptyLabel: string }) {
    const rows = byType(type);
    if (rows.length === 0) return <p className="px-1 py-2 text-sm text-ink-400">{emptyLabel}</p>;
    return (
      <div className="flex flex-col">
        {rows.map((r) => {
          const value = DEBIT_NORMAL.includes(type) ? r.debitNet : -r.debitNet;
          return (
            <div key={r.code} className="flex items-center justify-between gap-3 border-b border-paper-100 px-1 py-2 text-sm last:border-0">
              <span className="text-ink-700">{r.name}</span>
              <span className="tabular-nums text-ink-900">{money(value)}</span>
            </div>
          );
        })}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-5">
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

      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-ink-500">{reportDescription}</p>
        <div className="flex items-center gap-2">
          <Button variant="secondary" size="sm" icon={<TbFileTypePdf />} disabled={accountNets.length === 0} onClick={handleExportPdf}>
            Download PDF
          </Button>
          <Button variant="secondary" size="sm" icon={<TbFileTypeCsv />} disabled={accountNets.length === 0} onClick={handleExportCsv}>
            Download CSV
          </Button>
        </div>
      </div>

      {accountNets.length === 0 ? (
        <EmptyState title="Nothing posted yet" body="Post journal entries to see figures in this report." />
      ) : report === "balance_sheet" ? (
        <>
          <KpiRow>
            <StatCard label="Total assets" value={totalAssets} formatValue={money} />
            <StatCard label="Total liabilities" value={totalLiabilities} formatValue={money} />
            <StatCard label="Total equity" value={totalEquity} formatValue={money} />
            <StatCard label="Inventory value" value={inventoryValue} formatValue={money} />
          </KpiRow>
          <div className="grid gap-4 lg:grid-cols-2">
            <Card title="What you own (Assets)">
              <GroupList type="asset" emptyLabel="No assets recorded yet." />
              <div className="mt-2 flex items-center justify-between border-t border-paper-200 px-1 pt-2 text-sm font-semibold text-ink-900">
                <span>Total assets</span>
                <span className="tabular-nums">{money(totalAssets)}</span>
              </div>
            </Card>
            <Card title="What you owe & are worth (Liabilities & Equity)">
              <p className="mb-1 px-1 text-xs font-medium uppercase tracking-wide text-ink-400">Liabilities</p>
              <GroupList type="liability" emptyLabel="No liabilities recorded yet." />
              <p className="mb-1 mt-3 px-1 text-xs font-medium uppercase tracking-wide text-ink-400">Equity</p>
              <GroupList type="equity" emptyLabel="No equity recorded yet." />
              {netIncomeToDate !== 0 && (
                <div className="flex items-center justify-between gap-3 border-b border-paper-100 px-1 py-2 text-sm last:border-0">
                  <span className="text-ink-700">Current period earnings (not yet closed)</span>
                  <span className="tabular-nums text-ink-900">{money(netIncomeToDate)}</span>
                </div>
              )}
              <div className="mt-2 flex items-center justify-between border-t border-paper-200 px-1 pt-2 text-sm font-semibold text-ink-900">
                <span>Total liabilities & equity</span>
                <span className="tabular-nums">{money(totalLiabilities + totalEquity)}</span>
              </div>
            </Card>
          </div>
          <Banner variant={balanceSheetBalanced ? "info" : "danger"}>
            {balanceSheetBalanced ? (
              <span className="flex items-center gap-1.5">
                <TbCircleCheck className="size-4" /> Balanced — total assets match total liabilities plus equity.
              </span>
            ) : (
              <span className="flex items-center gap-1.5">
                <TbAlertTriangle className="size-4" /> Assets and liabilities + equity don&apos;t match — check for unposted or missing entries.
              </span>
            )}
          </Banner>
        </>
      ) : report === "income_statement" ? (
        <>
          <div className="grid gap-4 lg:grid-cols-2">
            <Card title="Income">
              <GroupList type="income" emptyLabel="No income recorded in this period." />
            </Card>
            <Card title="Expenses">
              <GroupList type="expense" emptyLabel="No expenses recorded in this period." />
            </Card>
          </div>
          <div
            className={`flex items-center justify-between rounded-card border p-5 shadow-card ${
              netProfit >= 0 ? "border-field-500/30 bg-field-50" : "border-danger-600/30 bg-danger-50"
            }`}
          >
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-ink-500">{netProfit >= 0 ? "Net profit" : "Net loss"}</p>
              <p className="mt-1 text-xs text-ink-500">Income ({money(totalIncome)}) minus expenses ({money(totalExpense)})</p>
            </div>
            <p className={`font-display text-2xl font-bold tabular-nums ${netProfit >= 0 ? "text-field-500" : "text-danger-600"}`}>
              {money(Math.abs(netProfit))}
            </p>
          </div>
        </>
      ) : (
        <>
          <DataTable columns={trialBalanceColumns} data={accountNets} rowKey={(r) => r.code} loading={loading} />
          <div className="flex justify-end gap-6 rounded-card border border-paper-200 bg-paper-50 px-4 py-3 text-sm font-medium">
            <span className="tabular-nums text-ink-900">Total debit: {money(totalDebit)}</span>
            <span className="tabular-nums text-ink-900">Total credit: {money(totalCredit)}</span>
            {Math.abs(totalDebit - totalCredit) < 0.01 ? (
              <span className="flex items-center gap-1 text-field-500">
                <TbCircleCheck className="size-4" /> Balanced
              </span>
            ) : (
              <span className="flex items-center gap-1 text-danger-600">
                <TbAlertTriangle className="size-4" /> Out of balance
              </span>
            )}
          </div>
        </>
      )}
    </div>
  );
}
