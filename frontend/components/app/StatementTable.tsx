import { formatDate } from "@/lib/formatDate";
import { formatMoney } from "@/lib/formatMoney";

export interface StatementEntry {
  date: Date;
  description: string;
  debit?: number;
  credit?: number;
}

export function StatementTable({ entries, openingBalance = 0 }: { entries: StatementEntry[]; openingBalance?: number }) {
  const rows = entries.reduce<(StatementEntry & { balance: number })[]>((acc, e) => {
    const previous = acc.length ? acc[acc.length - 1].balance : openingBalance;
    const balance = previous + (e.credit ?? 0) - (e.debit ?? 0);
    return [...acc, { ...e, balance }];
  }, []);

  return (
    <div className="overflow-x-auto rounded-card border border-paper-200 bg-paper-0">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-paper-50 text-left text-[12px] font-medium uppercase tracking-wide text-ink-400">
            <th className="px-4 py-3">Date</th>
            <th className="px-4 py-3">Description</th>
            <th className="px-4 py-3 text-right">Debit</th>
            <th className="px-4 py-3 text-right">Credit</th>
            <th className="px-4 py-3 text-right">Balance</th>
          </tr>
        </thead>
        <tbody>
          <tr className="border-b border-paper-100">
            <td className="px-4 py-2.5 text-ink-400" colSpan={4}>
              Opening balance
            </td>
            <td className="px-4 py-2.5 text-right font-mono tabular-nums text-ink-700">
              E {formatMoney(openingBalance)}
            </td>
          </tr>
          {rows.map((r, i) => (
            <tr key={i} className="border-b border-paper-100 last:border-0 hover:bg-paper-50">
              <td className="px-4 py-2.5 text-ink-500">{formatDate(r.date)}</td>
              <td className="px-4 py-2.5 text-ink-700">{r.description}</td>
              <td className="px-4 py-2.5 text-right font-mono tabular-nums text-danger-600">
                {r.debit ? `E ${formatMoney(r.debit)}` : ""}
              </td>
              <td className="px-4 py-2.5 text-right font-mono tabular-nums text-field-500">
                {r.credit ? `E ${formatMoney(r.credit)}` : ""}
              </td>
              <td className="px-4 py-2.5 text-right font-mono tabular-nums font-medium text-ink-900">
                E {formatMoney(r.balance)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
