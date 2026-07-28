import { formatMoney } from "@/lib/formatMoney";
import { formatDate } from "@/lib/formatDate";

export interface InvoiceLine {
  description: string;
  qty: number;
  unitPrice: number;
}

export interface InvoicePreviewProps {
  invoiceNumber: string;
  date: Date;
  dueDate: Date;
  billTo: string;
  lines: InvoiceLine[];
  vatRate?: number;
  associationName?: string;
}

export function InvoicePreview({
  invoiceNumber,
  date,
  dueDate,
  billTo,
  lines,
  vatRate = 0.15,
  associationName = "Ka-Lavumisa Growers Association",
}: InvoicePreviewProps) {
  const subtotal = lines.reduce((sum, l) => sum + l.qty * l.unitPrice, 0);
  const vat = subtotal * vatRate;
  const total = subtotal + vat;

  return (
    <div className="overflow-hidden rounded-card border border-paper-200 bg-paper-0 shadow-card print:shadow-none">
      <div className="h-1.5 bg-brand-500" />
      <div className="p-6">
        <div className="flex items-start justify-between">
          <div>
            <p className="font-display text-lg font-semibold text-ink-900">{associationName}</p>
            <p className="text-xs text-ink-400">Ka-Lavumisa, Eswatini</p>
          </div>
          <div className="text-right">
            <p className="font-display text-xl font-bold text-ink-900">INVOICE</p>
            <p className="font-mono text-xs text-ink-500">{invoiceNumber}</p>
          </div>
        </div>

        <div className="mt-6 grid grid-cols-2 gap-4 text-sm">
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-ink-400">Bill to</p>
            <p className="mt-1 text-ink-900">{billTo}</p>
          </div>
          <div className="text-right">
            <p className="text-xs text-ink-500">
              Issued <span className="text-ink-900">{formatDate(date)}</span>
            </p>
            <p className="text-xs text-ink-500">
              Due <span className="text-ink-900">{formatDate(dueDate)}</span>
            </p>
          </div>
        </div>

        <table className="mt-6 w-full text-sm">
          <thead>
            <tr className="border-b border-paper-200 text-left text-[11px] uppercase tracking-wide text-ink-400">
              <th className="pb-2 font-medium">Description</th>
              <th className="pb-2 text-right font-medium">Qty</th>
              <th className="pb-2 text-right font-medium">Unit price</th>
              <th className="pb-2 text-right font-medium">Amount</th>
            </tr>
          </thead>
          <tbody>
            {lines.map((l, i) => (
              <tr key={i} className="border-b border-paper-100">
                <td className="py-2.5 text-ink-700">{l.description}</td>
                <td className="py-2.5 text-right tabular-nums text-ink-700">{l.qty}</td>
                <td className="py-2.5 text-right tabular-nums text-ink-700">E {formatMoney(l.unitPrice)}</td>
                <td className="py-2.5 text-right tabular-nums text-ink-900">E {formatMoney(l.qty * l.unitPrice)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="mt-4 flex justify-end">
          <div className="w-56 space-y-1.5 text-sm">
            <div className="flex justify-between text-ink-500">
              <span>Subtotal</span>
              <span className="tabular-nums">E {formatMoney(subtotal)}</span>
            </div>
            <div className="flex justify-between text-ink-500">
              <span>VAT ({(vatRate * 100).toFixed(0)}%)</span>
              <span className="tabular-nums">E {formatMoney(vat)}</span>
            </div>
            <div className="flex justify-between border-t border-paper-200 pt-1.5 font-semibold text-ink-900">
              <span>Total due</span>
              <span className="font-display tabular-nums">E {formatMoney(total)}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
