"use client";

import { useMemo, useState } from "react";
import { TbPlus, TbPrinter, TbTrash } from "react-icons/tb";
import { PageHeader } from "@/components/ui/PageHeader";
import { Badge, type BadgeVariant } from "@/components/ui/Badge";
import { Input, FieldError } from "@/components/ui/Input";
import { DatePicker } from "@/components/ui/DatePicker";
import { Combobox } from "@/components/ui/Select";
import { Button } from "@/components/ui/Button";
import { Modal, ConfirmDialog } from "@/components/ui/Modal";
import { EmptyState } from "@/components/ui/EmptyState";
import { useToast } from "@/components/ui/Toast";
import { createClient } from "@/lib/supabase/client";
import { formatDate } from "@/lib/formatDate";
import { InvoicePreview } from "@/components/app/InvoicePreview";
import type { Database, InvoiceStatus } from "@/lib/database.types";

type InvoiceRow = Database["public"]["Tables"]["invoices"]["Row"];
type InvoiceLineRow = Database["public"]["Tables"]["invoice_lines"]["Row"];
type InvoicePaymentRow = Database["public"]["Tables"]["invoice_payments"]["Row"];
type CreditNoteRow = Database["public"]["Tables"]["credit_notes"]["Row"];

interface AccountOption {
  id: string;
  code: string;
  name: string;
  type: string;
}

interface DraftLine {
  id?: string;
  description: string;
  quantity: string;
  unit_price: string;
  account_id: string;
}

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

export interface InvoiceDetailSectionProps {
  invoice: InvoiceRow;
  customerName: string;
  initialLines: InvoiceLineRow[];
  initialPayments: InvoicePaymentRow[];
  initialCreditNotes: CreditNoteRow[];
  revenueAccounts: AccountOption[];
  assetAccounts: AccountOption[];
  canManage: boolean;
}

export function InvoiceDetailSection({
  invoice: initialInvoice,
  customerName,
  initialLines,
  initialPayments,
  initialCreditNotes,
  revenueAccounts,
  assetAccounts,
  canManage,
}: InvoiceDetailSectionProps) {
  const { addToast } = useToast();
  const [invoice, setInvoice] = useState(initialInvoice);
  const [lines, setLines] = useState<DraftLine[]>(
    initialLines.length > 0
      ? initialLines.map((l) => ({ id: l.id, description: l.description, quantity: String(l.quantity), unit_price: String(l.unit_price), account_id: l.account_id }))
      : [{ description: "", quantity: "1", unit_price: "", account_id: "" }]
  );
  const [payments, setPayments] = useState(initialPayments);
  const [creditNotes, setCreditNotes] = useState(initialCreditNotes);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [issuing, setIssuing] = useState(false);

  const [paymentOpen, setPaymentOpen] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState("");
  const [paymentDate, setPaymentDate] = useState(new Date());
  const [paymentMethod, setPaymentMethod] = useState("");
  const [paymentReference, setPaymentReference] = useState("");
  const [paymentAccount, setPaymentAccount] = useState<string | undefined>();
  const [paymentError, setPaymentError] = useState<string | null>(null);
  const [recordingPayment, setRecordingPayment] = useState(false);

  const [creditOpen, setCreditOpen] = useState(false);
  const [creditAmount, setCreditAmount] = useState("");
  const [creditReason, setCreditReason] = useState("");
  const [creditAccount, setCreditAccount] = useState<string | undefined>();
  const [creditError, setCreditError] = useState<string | null>(null);
  const [issuingCredit, setIssuingCredit] = useState(false);

  const editable = canManage && invoice.status === "draft";
  const revenueOptions = revenueAccounts.map((a) => ({ value: a.id, label: `${a.code} — ${a.name}` }));
  const assetOptions = assetAccounts.map((a) => ({ value: a.id, label: `${a.code} — ${a.name}` }));

  const subtotal = useMemo(() => lines.reduce((s, l) => s + (Number(l.quantity) || 0) * (Number(l.unit_price) || 0), 0), [lines]);
  const vat = subtotal * Number(invoice.vat_rate);
  const total = subtotal + vat;
  const paid = payments.reduce((s, p) => s + Number(p.amount), 0);
  const credited = creditNotes.reduce((s, c) => s + Number(c.amount), 0);
  const balance = total - paid - credited;

  const refreshInvoiceStatus = async () => {
    const supabase = createClient();
    const { data } = await supabase.from("invoices").select("*").eq("id", invoice.id).maybeSingle();
    if (data) setInvoice(data);
  };

  const updateLine = (index: number, patch: Partial<DraftLine>) => {
    setLines((prev) => prev.map((l, i) => (i === index ? { ...l, ...patch } : l)));
  };

  const saveDraft = async () => {
    setError(null);
    const validLines = lines.filter((l) => l.description.trim() && l.account_id && Number(l.unit_price) > 0);
    setSaving(true);
    const supabase = createClient();

    await supabase.from("invoice_lines").delete().eq("invoice_id", invoice.id);
    if (validLines.length > 0) {
      const { error: insertError } = await supabase.from("invoice_lines").insert(
        validLines.map((l, i) => ({
          invoice_id: invoice.id,
          description: l.description.trim(),
          quantity: Number(l.quantity) || 1,
          unit_price: Number(l.unit_price),
          account_id: l.account_id,
          position: i,
        }))
      );
      if (insertError) {
        setSaving(false);
        setError(insertError.message);
        return;
      }
    }
    setSaving(false);
    addToast({ variant: "field", message: "Draft saved" });
  };

  const issueInvoice = async () => {
    setIssuing(true);
    const supabase = createClient();
    await saveDraft();
    const { data, error: issueError } = await supabase.rpc("issue_invoice", { p_invoice_id: invoice.id });
    setIssuing(false);
    if (issueError) {
      addToast({ variant: "danger", message: issueError.message });
      return;
    }
    setInvoice(data);
    addToast({ variant: "field", message: `Invoice ${invoice.invoice_no} issued` });
  };

  const recordPayment = async () => {
    setPaymentError(null);
    const amount = Number(paymentAmount);
    if (!amount || amount <= 0) {
      setPaymentError("Enter a valid amount");
      return;
    }
    if (!paymentAccount) {
      setPaymentError("Select which account received the money");
      return;
    }
    setRecordingPayment(true);
    const supabase = createClient();
    const { data, error: rpcError } = await supabase.rpc("record_invoice_payment", {
      p_invoice_id: invoice.id,
      p_amount: amount,
      p_paid_at: paymentDate.toISOString().slice(0, 10),
      p_method: paymentMethod || null,
      p_reference: paymentReference || null,
      p_deposit_account_id: paymentAccount,
    });
    setRecordingPayment(false);
    if (rpcError) {
      setPaymentError(rpcError.message);
      return;
    }
    setPayments((prev) => [...prev, data]);
    await refreshInvoiceStatus();
    setPaymentOpen(false);
    setPaymentAmount("");
    setPaymentMethod("");
    setPaymentReference("");
    addToast({ variant: "field", message: "Payment recorded" });
  };

  const issueCredit = async () => {
    setCreditError(null);
    const amount = Number(creditAmount);
    if (!amount || amount <= 0) {
      setCreditError("Enter a valid amount");
      return;
    }
    if (!creditAccount) {
      setCreditError("Select which revenue account this credit reduces");
      return;
    }
    setIssuingCredit(true);
    const supabase = createClient();
    const { data, error: rpcError } = await supabase.rpc("issue_credit_note", {
      p_invoice_id: invoice.id,
      p_amount: amount,
      p_reason: creditReason || null,
      p_revenue_account_id: creditAccount,
    });
    setIssuingCredit(false);
    if (rpcError) {
      setCreditError(rpcError.message);
      return;
    }
    setCreditNotes((prev) => [...prev, data]);
    await refreshInvoiceStatus();
    setCreditOpen(false);
    setCreditAmount("");
    setCreditReason("");
    addToast({ variant: "field", message: "Credit note issued" });
  };

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title={invoice.invoice_no}
        backHref="/finance/receivables"
        subtitle={
          <span className="flex flex-wrap items-center gap-2">
            <Badge variant={STATUS_BADGE[invoice.status]}>{invoice.status}</Badge>
            <span>{customerName}</span>
          </span>
        }
        actions={
          <>
            {invoice.status !== "draft" && (
              <Button variant="secondary" icon={<TbPrinter />} onClick={() => window.print()}>
                Print
              </Button>
            )}
            {editable && (
              <>
                <Button variant="secondary" loading={saving} onClick={saveDraft}>
                  Save draft
                </Button>
                <ConfirmDialog
                  trigger={<Button loading={issuing}>Issue invoice</Button>}
                  title="Issue invoice"
                  body={`Issue ${invoice.invoice_no} for E ${money(total)}? This posts it to the ledger and it can no longer be edited.`}
                  tone="primary"
                  confirmLabel="Issue invoice"
                  onConfirm={issueInvoice}
                />
              </>
            )}
            {canManage && (invoice.status === "sent" || invoice.status === "partial") && (
              <>
                <Button variant="secondary" onClick={() => setCreditOpen(true)}>
                  Issue credit note
                </Button>
                <Button onClick={() => setPaymentOpen(true)}>Record payment</Button>
              </>
            )}
          </>
        }
      />

      {editable ? (
        <>
          <div className="overflow-hidden rounded-card border border-paper-200 bg-paper-0">
            <div className="grid grid-cols-[2fr,80px,120px,1fr,40px] gap-2 border-b border-paper-200 bg-paper-50 px-4 py-2.5 text-[12px] font-medium uppercase tracking-wide text-ink-400">
              <span>Description</span>
              <span className="text-right">Qty</span>
              <span className="text-right">Unit price</span>
              <span>Revenue account</span>
              <span />
            </div>
            {lines.map((line, i) => (
              <div key={i} className="grid grid-cols-[2fr,80px,120px,1fr,40px] items-center gap-2 border-b border-paper-100 px-4 py-2 last:border-0">
                <Input value={line.description} onChange={(e) => updateLine(i, { description: e.target.value })} placeholder="e.g. Fertilizer — NPK 12-24-12" />
                <Input type="number" step="0.01" className="text-right tabular-nums" value={line.quantity} onChange={(e) => updateLine(i, { quantity: e.target.value })} />
                <Input type="number" step="0.01" className="text-right tabular-nums" value={line.unit_price} onChange={(e) => updateLine(i, { unit_price: e.target.value })} />
                <Combobox options={revenueOptions} value={line.account_id} onChange={(v) => updateLine(i, { account_id: v })} placeholder="Search account…" />
                <button
                  type="button"
                  aria-label="Remove line"
                  onClick={() => setLines((prev) => prev.filter((_, idx) => idx !== i))}
                  className="flex size-8 items-center justify-center rounded-ctrl text-ink-400 hover:bg-paper-100 hover:text-danger-600"
                >
                  <TbTrash className="size-4" />
                </button>
              </div>
            ))}
            <div className="px-4 py-2">
              <Button variant="ghost" size="sm" icon={<TbPlus />} onClick={() => setLines((prev) => [...prev, { description: "", quantity: "1", unit_price: "", account_id: "" }])}>
                Add line
              </Button>
            </div>
          </div>
          <div className="flex justify-end">
            <div className="w-64 space-y-1.5 text-sm">
              <div className="flex justify-between text-ink-500">
                <span>Subtotal</span>
                <span className="tabular-nums">{money(subtotal)}</span>
              </div>
              <div className="flex justify-between text-ink-500">
                <span>VAT ({(Number(invoice.vat_rate) * 100).toFixed(0)}%)</span>
                <span className="tabular-nums">{money(vat)}</span>
              </div>
              <div className="flex justify-between border-t border-paper-200 pt-1.5 font-semibold text-ink-900">
                <span>Total</span>
                <span className="tabular-nums">{money(total)}</span>
              </div>
            </div>
          </div>
          {error && <FieldError>{error}</FieldError>}
        </>
      ) : (
        <>
          <InvoicePreview
            invoiceNumber={invoice.invoice_no}
            date={new Date(invoice.issue_date)}
            dueDate={new Date(invoice.due_date)}
            billTo={customerName}
            vatRate={Number(invoice.vat_rate)}
            lines={initialLines.map((l) => ({ description: l.description, qty: Number(l.quantity), unitPrice: Number(l.unit_price) }))}
          />

          <div className="grid gap-4 sm:grid-cols-3">
            <div className="rounded-card border border-paper-200 bg-paper-0 p-4">
              <p className="text-xs font-medium uppercase tracking-wide text-ink-400">Total</p>
              <p className="mt-1 text-lg font-semibold tabular-nums text-ink-900">{money(total)}</p>
            </div>
            <div className="rounded-card border border-paper-200 bg-paper-0 p-4">
              <p className="text-xs font-medium uppercase tracking-wide text-ink-400">Paid / credited</p>
              <p className="mt-1 text-lg font-semibold tabular-nums text-field-500">{money(paid + credited)}</p>
            </div>
            <div className="rounded-card border border-paper-200 bg-paper-0 p-4">
              <p className="text-xs font-medium uppercase tracking-wide text-ink-400">Balance due</p>
              <p className={`mt-1 text-lg font-semibold tabular-nums ${balance > 0 ? "text-danger-600" : "text-field-500"}`}>{money(balance)}</p>
            </div>
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <div>
              <p className="mb-2 text-sm font-medium text-ink-700">Payment history</p>
              {payments.length === 0 ? (
                <EmptyState title="No payments yet" body="Payments recorded against this invoice appear here." compact />
              ) : (
                <div className="overflow-hidden rounded-card border border-paper-200 bg-paper-0">
                  {payments.map((p) => (
                    <div key={p.id} className="flex items-center justify-between border-b border-paper-100 px-4 py-2.5 text-sm last:border-0">
                      <span className="text-ink-700">
                        {formatDate(p.paid_at)} {p.method ? `— ${p.method}` : ""}
                      </span>
                      <span className="tabular-nums text-ink-900">{money(Number(p.amount))}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div>
              <p className="mb-2 text-sm font-medium text-ink-700">Credit notes</p>
              {creditNotes.length === 0 ? (
                <EmptyState title="No credit notes" body="Credit notes issued against this invoice appear here." compact />
              ) : (
                <div className="overflow-hidden rounded-card border border-paper-200 bg-paper-0">
                  {creditNotes.map((c) => (
                    <div key={c.id} className="flex items-center justify-between border-b border-paper-100 px-4 py-2.5 text-sm last:border-0">
                      <span className="font-mono text-xs text-ink-500">{c.credit_no}</span>
                      <span className="tabular-nums text-ink-900">{money(Number(c.amount))}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </>
      )}

      <Modal
        open={paymentOpen}
        onOpenChange={setPaymentOpen}
        title="Record payment"
        footer={
          <>
            <Button variant="ghost" onClick={() => setPaymentOpen(false)}>
              Cancel
            </Button>
            <Button loading={recordingPayment} onClick={recordPayment}>
              Record payment
            </Button>
          </>
        }
      >
        <div className="flex flex-col gap-4">
          <div>
            <label className="mb-1.5 block text-xs font-medium text-ink-700">Amount (balance due: E {money(balance)})</label>
            <Input type="number" step="0.01" value={paymentAmount} onChange={(e) => setPaymentAmount(e.target.value)} />
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-medium text-ink-700">Date received</label>
            <DatePicker value={paymentDate} onChange={setPaymentDate} />
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-medium text-ink-700">Deposited into</label>
            <Combobox options={assetOptions} value={paymentAccount} onChange={setPaymentAccount} placeholder="Select bank/cash account…" />
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-medium text-ink-700">Method</label>
            <Input value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)} placeholder="e.g. EFT, MoMo, cash" />
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-medium text-ink-700">Reference</label>
            <Input value={paymentReference} onChange={(e) => setPaymentReference(e.target.value)} />
          </div>
          {paymentError && <FieldError>{paymentError}</FieldError>}
        </div>
      </Modal>

      <Modal
        open={creditOpen}
        onOpenChange={setCreditOpen}
        title="Issue credit note"
        footer={
          <>
            <Button variant="ghost" onClick={() => setCreditOpen(false)}>
              Cancel
            </Button>
            <Button variant="danger" loading={issuingCredit} onClick={issueCredit}>
              Issue credit note
            </Button>
          </>
        }
      >
        <div className="flex flex-col gap-4">
          <div>
            <label className="mb-1.5 block text-xs font-medium text-ink-700">Amount (balance due: E {money(balance)})</label>
            <Input type="number" step="0.01" value={creditAmount} onChange={(e) => setCreditAmount(e.target.value)} />
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-medium text-ink-700">Reduces which revenue account</label>
            <Combobox options={revenueOptions} value={creditAccount} onChange={setCreditAccount} placeholder="Search account…" />
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-medium text-ink-700">Reason</label>
            <Input value={creditReason} onChange={(e) => setCreditReason(e.target.value)} placeholder="e.g. Billing error, goodwill discount" />
          </div>
          {creditError && <FieldError>{creditError}</FieldError>}
        </div>
      </Modal>
    </div>
  );
}
