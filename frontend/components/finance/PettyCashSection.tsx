"use client";

import { useEffect, useState } from "react";
import { TbPigMoney, TbPlus, TbArrowUpRight, TbArrowDownRight } from "react-icons/tb";
import { Button } from "@/components/ui/Button";
import { Drawer } from "@/components/ui/Drawer";
import { FormRow } from "@/components/ui/FormRow";
import { Input, FieldError } from "@/components/ui/Input";
import { MoneyInput } from "@/components/ui/MoneyInput";
import { DatePicker } from "@/components/ui/DatePicker";
import { Combobox } from "@/components/ui/Select";
import { Badge } from "@/components/ui/Badge";
import { DataTable, type DataTableColumn } from "@/components/ui/DataTable";
import { EmptyState } from "@/components/ui/EmptyState";
import { KpiRow, StatCard } from "@/components/ui/StatCard";
import { useToast } from "@/components/ui/Toast";
import { createClient } from "@/lib/supabase/client";
import { formatDate } from "@/lib/formatDate";
import type { Database } from "@/lib/database.types";

type FundRow = Database["public"]["Tables"]["petty_cash_funds"]["Row"];
type TxRow = Database["public"]["Tables"]["petty_cash_transactions"]["Row"];

interface AccountOption {
  id: string;
  code: string;
  name: string;
  type: string;
}

function money(v: number) {
  return v.toLocaleString("en-SZ", { minimumFractionDigits: 2 });
}

export interface PettyCashSectionProps {
  tenantId: string;
  initialFund: FundRow | null;
  initialTransactions: TxRow[];
  accounts: AccountOption[];
  canManage: boolean;
}

export function PettyCashSection({ tenantId, initialFund, initialTransactions, accounts, canManage }: PettyCashSectionProps) {
  const [fund, setFund] = useState(initialFund);
  const [transactions, setTransactions] = useState(initialTransactions);
  const [balance, setBalance] = useState(0);
  const [setupOpen, setSetupOpen] = useState(false);
  const [expenseOpen, setExpenseOpen] = useState(false);
  const [topUpOpen, setTopUpOpen] = useState(false);

  const assetOptions = accounts.filter((a) => a.type === "asset" && a.id !== fund?.account_id).map((a) => ({ value: a.id, label: `${a.code} — ${a.name}` }));
  const expenseOptions = accounts.filter((a) => a.type === "expense").map((a) => ({ value: a.id, label: `${a.code} — ${a.name}` }));

  const refreshBalance = async (accountId: string) => {
    const supabase = createClient();
    const { data } = await supabase
      .from("journal_lines")
      .select("debit, credit, journal_entries!inner(status, tenant_id)")
      .eq("account_id", accountId)
      .eq("journal_entries.tenant_id", tenantId)
      .eq("journal_entries.status", "posted");
    const net = ((data as unknown as { debit: number; credit: number }[]) ?? []).reduce((s, l) => s + Number(l.debit) - Number(l.credit), 0);
    setBalance(net);
  };

  const refreshTransactions = async (fundId: string) => {
    const supabase = createClient();
    const { data } = await supabase
      .from("petty_cash_transactions")
      .select("*")
      .eq("fund_id", fundId)
      .order("tx_date", { ascending: false })
      .order("created_at", { ascending: false });
    setTransactions(data ?? []);
  };

  useEffect(() => {
    if (!fund) return;
    const accountId = fund.account_id;
    (async () => {
      await refreshBalance(accountId);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fund?.account_id]);

  const afterRecord = () => {
    if (!fund) return;
    refreshBalance(fund.account_id);
    refreshTransactions(fund.id);
  };

  const columns: DataTableColumn<TxRow>[] = [
    { key: "date", header: "Date", render: (t) => formatDate(t.tx_date) },
    {
      key: "type",
      header: "Type",
      render: (t) => (
        <Badge variant={t.tx_type === "replenishment" ? "success" : "neutral"} icon={t.tx_type === "replenishment" ? <TbArrowDownRight /> : <TbArrowUpRight />}>
          {t.tx_type === "replenishment" ? "Top-up" : "Expense"}
        </Badge>
      ),
    },
    { key: "description", header: "Description", render: (t) => t.description || "—" },
    { key: "receipt", header: "Receipt ref.", render: (t) => t.receipt_ref || "—" },
    {
      key: "amount",
      header: "Amount",
      align: "right",
      render: (t) => <span className={t.tx_type === "replenishment" ? "text-field-500" : "text-danger-600"}>{t.tx_type === "replenishment" ? "+" : "-"}{money(t.amount)}</span>,
    },
  ];

  if (!fund) {
    return (
      <>
        <EmptyState
          title="Petty cash isn't set up yet"
          body={
            canManage
              ? "Set an opening float and a custodian to start tracking petty cash — it posts straight into the general ledger."
              : "Ask the accountant to set up petty cash for this association."
          }
        />
        {canManage && (
          <div className="mt-4 flex justify-end">
            <Button icon={<TbPigMoney />} onClick={() => setSetupOpen(true)}>
              Set up petty cash
            </Button>
          </div>
        )}
        {canManage && (
          <SetupPettyCashDrawer
            tenantId={tenantId}
            open={setupOpen}
            onOpenChange={setSetupOpen}
            sourceOptions={accounts.filter((a) => a.type === "asset").map((a) => ({ value: a.id, label: `${a.code} — ${a.name}` }))}
            onSaved={(newFund) => setFund(newFund)}
          />
        )}
      </>
    );
  }

  return (
    <div className="flex flex-col gap-5">
      <KpiRow>
        <StatCard label="Current balance" value={balance} formatValue={money} icon={<TbPigMoney />} />
        <StatCard label="Float amount" value={fund.float_amount} formatValue={money} />
      </KpiRow>

      {fund.custodian_name && <p className="text-sm text-ink-500">Custodian: {fund.custodian_name}</p>}

      {canManage && (
        <div className="flex justify-end gap-2">
          <Button variant="secondary" icon={<TbArrowDownRight />} onClick={() => setTopUpOpen(true)}>
            Top up
          </Button>
          <Button icon={<TbPlus />} onClick={() => setExpenseOpen(true)}>
            Record expense
          </Button>
        </div>
      )}

      <DataTable
        columns={columns}
        data={transactions}
        rowKey={(t) => t.id}
        emptyTitle="No petty cash transactions yet"
        emptyBody="Expenses and top-ups you record will appear here."
      />

      {canManage && (
        <>
          <RecordExpenseDrawer
            fundId={fund.id}
            open={expenseOpen}
            onOpenChange={setExpenseOpen}
            categoryOptions={expenseOptions}
            onSaved={afterRecord}
          />
          <RecordTopUpDrawer fundId={fund.id} open={topUpOpen} onOpenChange={setTopUpOpen} sourceOptions={assetOptions} onSaved={afterRecord} />
        </>
      )}
    </div>
  );
}

interface SetupPettyCashDrawerProps {
  tenantId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sourceOptions: { value: string; label: string }[];
  onSaved: (fund: FundRow) => void;
}

function SetupPettyCashDrawer({ tenantId, open, onOpenChange, sourceOptions, onSaved }: SetupPettyCashDrawerProps) {
  const { addToast } = useToast();
  const [floatAmount, setFloatAmount] = useState(0);
  const [custodianName, setCustodianName] = useState("");
  const [sourceAccountId, setSourceAccountId] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const submit = async () => {
    setError(null);
    if (floatAmount > 0 && !sourceAccountId) {
      setError("Choose which account the opening float is coming from");
      return;
    }
    setSaving(true);
    const supabase = createClient();
    const { data, error: rpcError } = await supabase.rpc("setup_petty_cash_fund", {
      p_tenant_id: tenantId,
      p_float_amount: floatAmount,
      p_custodian_name: custodianName || null,
      p_source_account_id: floatAmount > 0 ? sourceAccountId : null,
    });
    setSaving(false);
    if (rpcError || !data) {
      setError(rpcError?.message ?? "Couldn't set up petty cash");
      return;
    }
    addToast({ variant: "field", message: "Petty cash set up" });
    onOpenChange(false);
    onSaved(data);
  };

  return (
    <Drawer open={open} onOpenChange={onOpenChange} title="Set up petty cash">
      <div className="flex flex-col gap-5">
        <FormRow label="Custodian" hint="Who's responsible for this fund day-to-day">
          <Input value={custodianName} onChange={(e) => setCustodianName(e.target.value)} placeholder="e.g. J. Dlamini" />
        </FormRow>
        <FormRow label="Opening float" hint="How much cash to start the fund with — leave at 0 to set it up empty">
          <MoneyInput value={floatAmount} onValueChange={setFloatAmount} />
        </FormRow>
        {floatAmount > 0 && (
          <FormRow label="Coming from" required>
            <Combobox options={sourceOptions} value={sourceAccountId} onChange={setSourceAccountId} placeholder="Choose bank or cash account…" />
          </FormRow>
        )}
        {error && <FieldError>{error}</FieldError>}
        <div className="flex justify-end gap-2 pt-2">
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={submit} loading={saving}>
            Set up
          </Button>
        </div>
      </div>
    </Drawer>
  );
}

interface RecordExpenseDrawerProps {
  fundId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  categoryOptions: { value: string; label: string }[];
  onSaved: () => void;
}

function RecordExpenseDrawer({ fundId, open, onOpenChange, categoryOptions, onSaved }: RecordExpenseDrawerProps) {
  const { addToast } = useToast();
  const [txDate, setTxDate] = useState(new Date());
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState(0);
  const [categoryAccountId, setCategoryAccountId] = useState("");
  const [receiptRef, setReceiptRef] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setTxDate(new Date());
    setDescription("");
    setAmount(0);
    setCategoryAccountId("");
    setReceiptRef("");
    setError(null);
  }, [open]);

  const submit = async () => {
    setError(null);
    if (!categoryAccountId || amount <= 0) {
      setError("Choose a category and enter an amount greater than zero");
      return;
    }
    setSaving(true);
    const supabase = createClient();
    const { error: rpcError } = await supabase.rpc("record_petty_cash_expense", {
      p_fund_id: fundId,
      p_tx_date: txDate.toISOString().slice(0, 10),
      p_description: description || null,
      p_amount: amount,
      p_category_account_id: categoryAccountId,
      p_receipt_ref: receiptRef || null,
    });
    setSaving(false);
    if (rpcError) {
      setError(rpcError.message);
      return;
    }
    addToast({ variant: "field", message: "Expense recorded" });
    onOpenChange(false);
    onSaved();
  };

  return (
    <Drawer open={open} onOpenChange={onOpenChange} title="Record petty cash expense">
      <div className="flex flex-col gap-5">
        <FormRow label="Date" required>
          <DatePicker value={txDate} onChange={setTxDate} />
        </FormRow>
        <FormRow label="Category" required>
          <Combobox options={categoryOptions} value={categoryAccountId} onChange={setCategoryAccountId} placeholder="What was this spent on?" />
        </FormRow>
        <FormRow label="Description">
          <Input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="e.g. Stationery for the office" />
        </FormRow>
        <FormRow label="Amount" required>
          <MoneyInput value={amount} onValueChange={setAmount} />
        </FormRow>
        <FormRow label="Receipt ref." hint="Optional — receipt or voucher number">
          <Input value={receiptRef} onChange={(e) => setReceiptRef(e.target.value)} />
        </FormRow>
        {error && <FieldError>{error}</FieldError>}
        <div className="flex justify-end gap-2 pt-2">
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={submit} loading={saving}>
            Record expense
          </Button>
        </div>
      </div>
    </Drawer>
  );
}

interface RecordTopUpDrawerProps {
  fundId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sourceOptions: { value: string; label: string }[];
  onSaved: () => void;
}

function RecordTopUpDrawer({ fundId, open, onOpenChange, sourceOptions, onSaved }: RecordTopUpDrawerProps) {
  const { addToast } = useToast();
  const [txDate, setTxDate] = useState(new Date());
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState(0);
  const [sourceAccountId, setSourceAccountId] = useState("");
  const [receiptRef, setReceiptRef] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setTxDate(new Date());
    setDescription("");
    setAmount(0);
    setSourceAccountId("");
    setReceiptRef("");
    setError(null);
  }, [open]);

  const submit = async () => {
    setError(null);
    if (!sourceAccountId || amount <= 0) {
      setError("Choose the source account and enter an amount greater than zero");
      return;
    }
    setSaving(true);
    const supabase = createClient();
    const { error: rpcError } = await supabase.rpc("record_petty_cash_replenishment", {
      p_fund_id: fundId,
      p_tx_date: txDate.toISOString().slice(0, 10),
      p_description: description || null,
      p_amount: amount,
      p_source_account_id: sourceAccountId,
      p_receipt_ref: receiptRef || null,
    });
    setSaving(false);
    if (rpcError) {
      setError(rpcError.message);
      return;
    }
    addToast({ variant: "field", message: "Top-up recorded" });
    onOpenChange(false);
    onSaved();
  };

  return (
    <Drawer open={open} onOpenChange={onOpenChange} title="Top up petty cash">
      <div className="flex flex-col gap-5">
        <FormRow label="Date" required>
          <DatePicker value={txDate} onChange={setTxDate} />
        </FormRow>
        <FormRow label="Coming from" required>
          <Combobox options={sourceOptions} value={sourceAccountId} onChange={setSourceAccountId} placeholder="Choose bank or cash account…" />
        </FormRow>
        <FormRow label="Description">
          <Input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="e.g. Monthly top-up" />
        </FormRow>
        <FormRow label="Amount" required>
          <MoneyInput value={amount} onValueChange={setAmount} />
        </FormRow>
        <FormRow label="Receipt ref." hint="Optional — withdrawal slip or reference number">
          <Input value={receiptRef} onChange={(e) => setReceiptRef(e.target.value)} />
        </FormRow>
        {error && <FieldError>{error}</FieldError>}
        <div className="flex justify-end gap-2 pt-2">
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={submit} loading={saving}>
            Top up
          </Button>
        </div>
      </div>
    </Drawer>
  );
}
