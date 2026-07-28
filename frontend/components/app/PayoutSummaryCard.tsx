import { formatMoney } from "@/lib/formatMoney";

export interface PayoutLine {
  label: string;
  amount: number;
}

export interface PayoutSummaryCardProps {
  memberName: string;
  gross: number;
  deductions: PayoutLine[];
  net: number;
}

export function PayoutSummaryCard({ memberName, gross, deductions, net }: PayoutSummaryCardProps) {
  return (
    <div className="rounded-card border border-paper-200 bg-paper-0 p-5 shadow-card">
      <p className="text-xs font-medium uppercase tracking-wide text-ink-400">Payout summary — {memberName}</p>
      <div className="mt-3 flex items-center justify-between text-sm">
        <span className="text-ink-500">Gross earnings</span>
        <span className="font-mono tabular-nums text-ink-900">E {formatMoney(gross)}</span>
      </div>
      <div className="mt-2 space-y-1.5 border-t border-paper-100 pt-2.5">
        {deductions.map((d) => (
          <div key={d.label} className="flex items-center justify-between text-sm">
            <span className="text-ink-500">{d.label}</span>
            <span className="font-mono tabular-nums text-danger-600">-E {formatMoney(d.amount)}</span>
          </div>
        ))}
      </div>
      <div className="mt-3 flex items-center justify-between border-t border-paper-200 pt-3">
        <span className="text-sm font-semibold text-ink-900">Net payout</span>
        <span className="font-display text-xl font-bold tabular-nums text-ink-900">E {formatMoney(net)}</span>
      </div>
    </div>
  );
}
