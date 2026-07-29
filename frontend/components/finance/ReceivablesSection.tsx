"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { TbEdit, TbPlus } from "react-icons/tb";
import { PageHeader } from "@/components/ui/PageHeader";
import { Tabs } from "@/components/ui/Tabs";
import { KpiRow, StatCard } from "@/components/ui/StatCard";
import { DataTable, type DataTableColumn } from "@/components/ui/DataTable";
import { Badge, type BadgeVariant } from "@/components/ui/Badge";
import { Button, IconButton } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { createClient } from "@/lib/supabase/client";
import { formatDate } from "@/lib/formatDate";
import { NewInvoiceDrawer } from "./NewInvoiceDrawer";
import { CustomerFormDrawer } from "./CustomerFormDrawer";
import type { Database, InvoiceStatus } from "@/lib/database.types";

type InvoiceRow = Database["public"]["Tables"]["invoices"]["Row"];
type CustomerRow = Database["public"]["Tables"]["customers"]["Row"];

const STATUS_BADGE: Record<InvoiceStatus, BadgeVariant> = {
  draft: "neutral",
  sent: "info",
  partial: "warning",
  paid: "success",
  void: "danger",
};

function money(v: number) {
  return v.toLocaleString("en-SZ", { minimumFractionDigits: 2 });
}

interface InvoiceComputed extends InvoiceRow {
  customerName: string;
  total: number;
  balance: number;
}

export interface ReceivablesSectionProps {
  tenantId: string;
  initialInvoices: InvoiceRow[];
  initialCustomers: CustomerRow[];
  canManage: boolean;
}

export function ReceivablesSection({ tenantId, initialInvoices, initialCustomers, canManage }: ReceivablesSectionProps) {
  const router = useRouter();
  const [tab, setTab] = useState("invoices");
  const [invoices, setInvoices] = useState(initialInvoices);
  const [customers, setCustomers] = useState(initialCustomers);
  const [lineTotals, setLineTotals] = useState<Map<string, number>>(new Map());
  const [paidTotals, setPaidTotals] = useState<Map<string, number>>(new Map());
  const [newInvoiceOpen, setNewInvoiceOpen] = useState(false);
  const [customerDrawerOpen, setCustomerDrawerOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<CustomerRow | null>(null);

  const customerMap = useMemo(() => new Map(customers.map((c) => [c.id, c.name])), [customers]);

  const refreshCustomers = async () => {
    const supabase = createClient();
    const { data } = await supabase.from("customers").select("*").eq("tenant_id", tenantId).order("name", { ascending: true });
    setCustomers(data ?? []);
  };

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const supabase = createClient();
      const [{ data: lines }, { data: payments }, { data: credits }] = await Promise.all([
        supabase.from("invoice_lines").select("invoice_id, quantity, unit_price"),
        supabase.from("invoice_payments").select("invoice_id, amount"),
        supabase.from("credit_notes").select("invoice_id, amount"),
      ]);
      if (cancelled) return;

      const subtotals = new Map<string, number>();
      for (const l of lines ?? []) {
        subtotals.set(l.invoice_id, (subtotals.get(l.invoice_id) ?? 0) + Number(l.quantity) * Number(l.unit_price));
      }
      const paid = new Map<string, number>();
      for (const p of payments ?? []) paid.set(p.invoice_id, (paid.get(p.invoice_id) ?? 0) + Number(p.amount));
      for (const c of credits ?? []) paid.set(c.invoice_id, (paid.get(c.invoice_id) ?? 0) + Number(c.amount));

      setLineTotals(subtotals);
      setPaidTotals(paid);
    })();
    return () => {
      cancelled = true;
    };
  }, [tenantId, invoices]);

  const computed: InvoiceComputed[] = useMemo(
    () =>
      invoices.map((inv) => {
        const subtotal = lineTotals.get(inv.id) ?? 0;
        const total = subtotal * (1 + Number(inv.vat_rate));
        const paid = paidTotals.get(inv.id) ?? 0;
        return { ...inv, customerName: customerMap.get(inv.customer_id) ?? "—", total, balance: total - paid };
      }),
    [invoices, lineTotals, paidTotals, customerMap]
  );

  const outstanding = computed.filter((i) => i.status === "sent" || i.status === "partial");
  const totalOutstanding = outstanding.reduce((s, i) => s + i.balance, 0);
  const today = new Date().toISOString().slice(0, 10);
  const overdue = outstanding.filter((i) => i.due_date < today);
  const totalOverdue = overdue.reduce((s, i) => s + i.balance, 0);

  const agingBuckets = useMemo(() => {
    const buckets = { current: 0, d30: 0, d60: 0, d90: 0, d90plus: 0 };
    const now = Date.now();
    for (const i of outstanding) {
      const days = Math.floor((now - new Date(i.due_date).getTime()) / (1000 * 60 * 60 * 24));
      if (days <= 0) buckets.current += i.balance;
      else if (days <= 30) buckets.d30 += i.balance;
      else if (days <= 60) buckets.d60 += i.balance;
      else if (days <= 90) buckets.d90 += i.balance;
      else buckets.d90plus += i.balance;
    }
    return buckets;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [outstanding]);

  const invoiceColumns: DataTableColumn<InvoiceComputed>[] = [
    { key: "invoice_no", header: "Invoice", render: (i) => <span className="font-mono text-xs">{i.invoice_no}</span> },
    { key: "customer", header: "Customer", render: (i) => i.customerName },
    { key: "issue_date", header: "Issued", render: (i) => formatDate(i.issue_date), sortable: true, sortValue: (i) => i.issue_date },
    { key: "due_date", header: "Due", render: (i) => formatDate(i.due_date) },
    { key: "total", header: "Total", align: "right", render: (i) => money(i.total) },
    { key: "balance", header: "Balance due", align: "right", render: (i) => money(i.balance) },
    { key: "status", header: "Status", render: (i) => <Badge variant={STATUS_BADGE[i.status]}>{i.status}</Badge> },
  ];

  const customerColumns: DataTableColumn<CustomerRow>[] = [
    { key: "name", header: "Name", render: (c) => c.name },
    { key: "email", header: "Email", render: (c) => c.email || "—" },
    { key: "phone", header: "Phone", render: (c) => c.phone || "—" },
  ];

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Receivables" subtitle="Invoices, customers and what's still owed to you." />
      <Tabs
        value={tab}
        onChange={setTab}
        items={[
          { value: "invoices", label: "Invoices" },
          { value: "customers", label: "Customers" },
          { value: "aging", label: "Aging" },
        ]}
      />

      {tab === "invoices" && (
        <div className="flex flex-col gap-4">
          <KpiRow>
            <StatCard label="Outstanding" value={totalOutstanding} formatValue={money} />
            <StatCard label="Overdue" value={totalOverdue} formatValue={money} />
            <StatCard label="Open invoices" value={outstanding.length} />
          </KpiRow>
          {canManage && (
            <Button icon={<TbPlus />} className="self-end" onClick={() => setNewInvoiceOpen(true)}>
              New invoice
            </Button>
          )}
          <DataTable
            columns={invoiceColumns}
            data={computed}
            rowKey={(i) => i.id}
            onRowClick={(i) => router.push(`/finance/receivables/${i.id}`)}
            emptyTitle="No invoices yet"
            emptyBody="Invoices you create will appear here."
          />
        </div>
      )}

      {tab === "customers" && (
        <div className="flex flex-col gap-4">
          {canManage && (
            <Button icon={<TbPlus />} className="self-end" onClick={() => setCustomerDrawerOpen(true)}>
              Add customer
            </Button>
          )}
          <DataTable
            columns={customerColumns}
            data={customers}
            rowKey={(c) => c.id}
            emptyTitle="No customers yet"
            emptyBody="Add a customer before creating invoices for them."
            rowActions={canManage ? (c) => [{ label: "Edit", icon: <TbEdit />, onSelect: () => setEditingCustomer(c) }] : undefined}
          />
        </div>
      )}

      {tab === "aging" && (
        <div className="flex flex-col gap-4">
          {outstanding.length === 0 ? (
            <EmptyState title="Nothing outstanding" body="Every invoice is paid up — there's nothing to age." />
          ) : (
            <div className="overflow-hidden rounded-card border border-paper-200 bg-paper-0">
              {[
                { label: "Current (not yet due)", value: agingBuckets.current },
                { label: "1–30 days overdue", value: agingBuckets.d30 },
                { label: "31–60 days overdue", value: agingBuckets.d60 },
                { label: "61–90 days overdue", value: agingBuckets.d90 },
                { label: "Over 90 days overdue", value: agingBuckets.d90plus },
              ].map((row) => (
                <div key={row.label} className="flex items-center justify-between border-b border-paper-100 px-4 py-3 text-sm last:border-0">
                  <span className="text-ink-700">{row.label}</span>
                  <span className="tabular-nums text-ink-900">{money(row.value)}</span>
                </div>
              ))}
              <div className="flex items-center justify-between bg-paper-50 px-4 py-3 text-sm font-semibold text-ink-900">
                <span>Total outstanding</span>
                <span className="tabular-nums">{money(totalOutstanding)}</span>
              </div>
            </div>
          )}
        </div>
      )}

      {canManage && (
        <>
          <NewInvoiceDrawer tenantId={tenantId} customers={customers} open={newInvoiceOpen} onOpenChange={setNewInvoiceOpen} />
          <CustomerFormDrawer tenantId={tenantId} open={customerDrawerOpen} onOpenChange={setCustomerDrawerOpen} onSaved={refreshCustomers} />
          <CustomerFormDrawer
            tenantId={tenantId}
            open={!!editingCustomer}
            onOpenChange={(v) => !v && setEditingCustomer(null)}
            customer={editingCustomer}
            onSaved={refreshCustomers}
          />
        </>
      )}
    </div>
  );
}
