import Link from "next/link";
import { TbCash, TbPlant2, TbScale, TbTruck } from "react-icons/tb";
import { KpiRow, StatCard } from "@/components/ui/StatCard";
import { Card } from "@/components/ui/Card";
import { Badge, type BadgeVariant } from "@/components/ui/Badge";
import { DataTable, type DataTableColumn } from "@/components/ui/DataTable";
import { EmptyState } from "@/components/ui/EmptyState";
import { formatDate } from "@/lib/formatDate";
import { formatMoney, formatPercent, formatTonnes } from "@/lib/formatMoney";
import type { MemberDashboardData, MemberDeliveryRow } from "@/lib/dashboard/queries";
import type { DeliveryStatus } from "@/lib/database.types";

const statusBadge: Record<DeliveryStatus, { variant: BadgeVariant; label: string }> = {
  dispatched: { variant: "warning", label: "At mill" },
  result_captured: { variant: "info", label: "Result in" },
  reconciled: { variant: "success", label: "Reconciled" },
};

const columns: DataTableColumn<MemberDeliveryRow>[] = [
  { key: "no", header: "Delivery", render: (r) => <span className="font-mono">{r.deliveryNo}</span> },
  { key: "date", header: "Date", render: (r) => formatDate(r.deliveryDate) },
  { key: "field", header: "Field", render: (r) => r.fieldCode },
  { key: "loaded", header: "Loaded", align: "right", render: (r) => formatTonnes(r.tonnesLoaded) },
  { key: "accepted", header: "Accepted", align: "right", render: (r) => (r.tonnesAccepted === null ? "—" : formatTonnes(r.tonnesAccepted)) },
  { key: "sucrose", header: "Sucrose", align: "right", render: (r) => (r.sucrosePct === null ? "—" : formatPercent(r.sucrosePct)) },
  {
    key: "status",
    header: "Status",
    render: (r) => {
      const s = statusBadge[r.status as DeliveryStatus] ?? { variant: "neutral" as BadgeVariant, label: r.status };
      return <Badge variant={s.variant}>{s.label}</Badge>;
    },
  },
];

export function MemberDashboard({ data }: { data: MemberDashboardData }) {
  return (
    <div className="flex flex-col gap-6">
      {!data.linked ? (
        <EmptyState
          title="Your account isn't linked to a member record yet"
          body="Ask your association's secretary to link your login to your entry in the member register. Your fields, deliveries and statement will then appear here."
        />
      ) : (
        <>
          <KpiRow>
            <StatCard
              label="Account balance"
              value={data.accountBalance}
              formatValue={(v) => formatMoney(v, { withPrefix: true })}
              icon={<TbCash />}
              info="Payouts credited less advances and contributions owed, from your statement."
            />
            <StatCard label="Tonnes delivered this season" value={data.seasonTonnesDelivered} formatValue={(v) => formatTonnes(v)} icon={<TbTruck />} />
            <StatCard
              label="Average sucrose"
              value={data.avgSucrosePct ?? 0}
              formatValue={(v) => (data.avgSucrosePct === null ? "—" : formatPercent(v))}
              icon={<TbScale />}
              info="Weighted by tonnes accepted at the mill."
            />
            <StatCard
              label={`My fields (${data.hectares.toFixed(1)} ha)`}
              value={data.fieldCount}
              icon={<TbPlant2 />}
            />
          </KpiRow>

          <Card
            title="My deliveries this season"
            action={<span className="text-xs text-ink-400">{formatTonnes(data.seasonTonnesAccepted)} accepted</span>}
          >
            <DataTable
              columns={columns}
              data={data.deliveries}
              rowKey={(r) => r.id}
              compact
              emptyTitle="No deliveries yet"
              emptyBody="Loads sent to the mill from your fields this season will show here."
            />
          </Card>
        </>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        {data.linked && (
          <Card title="Last payout">
            {data.lastPayout ? (
              <div className="flex flex-col gap-1">
                <p className="text-2xl font-semibold tabular-nums text-ink-900">{formatMoney(data.lastPayout.amount, { withPrefix: true })}</p>
                <p className="text-sm text-ink-400">Paid {formatDate(data.lastPayout.date)}</p>
              </div>
            ) : (
              <p className="text-sm text-ink-400">No payouts yet.</p>
            )}
          </Card>
        )}
        <Card
          title="Latest notices"
          action={
            <Link href="/notices" className="text-sm font-medium text-brand-600 hover:underline">
              View all
            </Link>
          }
        >
          {data.notices.length ? (
            <ul className="flex flex-col divide-y divide-paper-200">
              {data.notices.map((n) => (
                <li key={n.id} className="flex flex-col gap-0.5 py-2 first:pt-0 last:pb-0">
                  <p className="text-sm font-medium text-ink-900">{n.title}</p>
                  <p className="line-clamp-2 text-sm text-ink-700">{n.body}</p>
                  <p className="text-xs text-ink-400">{formatDate(n.publishedAt)}</p>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-ink-400">No notices yet.</p>
          )}
        </Card>
      </div>
    </div>
  );
}
