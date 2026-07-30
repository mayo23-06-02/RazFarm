import { TbAlertCircle, TbCash, TbFileInvoice, TbTruck } from "react-icons/tb";
import { KpiRow, StatCard } from "@/components/ui/StatCard";
import { ChartCard } from "@/components/ui/ChartCard";
import { Card } from "@/components/ui/Card";
import { Timeline } from "@/components/ui/Timeline";
import { AreaTrend } from "@/components/charts/AreaTrend";
import { DataTable, type DataTableColumn } from "@/components/ui/DataTable";
import { formatDate } from "@/lib/formatDate";
import { formatMoney, formatPercent } from "@/lib/formatMoney";
import { ApprovalQueueCard } from "./ApprovalQueueCard";
import { AlertsCard } from "./AlertsCard";
import type { AccountantDashboardData } from "@/lib/dashboard/queries";

interface ReconciliationRow {
  id: string;
  deliveryNo: string;
  fieldCode: string;
  date: string;
  sucrosePct: number | null;
}

const columns: DataTableColumn<ReconciliationRow>[] = [
  { key: "delivery_no", header: "Delivery no.", render: (d) => <span className="font-mono text-xs">{d.deliveryNo}</span> },
  { key: "field", header: "Field", render: (d) => d.fieldCode },
  { key: "date", header: "Date", render: (d) => formatDate(d.date) },
  { key: "sucrose", header: "Sucrose", align: "right", render: (d) => (d.sucrosePct != null ? formatPercent(d.sucrosePct) : "—") },
];

export function AccountantDashboard({ data }: { data: AccountantDashboardData }) {
  return (
    <div className="flex flex-col gap-6">
      <KpiRow>
        <StatCard label="Unreconciled deliveries" value={data.unreconciledCount} icon={<TbTruck />} />
        <StatCard label="Pending payout runs" value={data.pendingPayoutRuns} icon={<TbCash />} />
        <StatCard label="Overdue invoices (AR)" value={data.overdueInvoicesCount} icon={<TbFileInvoice />} />
        <StatCard label="Overdue bills (AP)" value={data.overdueBillsCount} icon={<TbAlertCircle />} />
      </KpiRow>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card title="Mill reconciliation queue">
          <DataTable
            columns={columns}
            data={data.reconciliationQueue}
            rowKey={(d) => d.id}
            compact
            emptyTitle="Nothing awaiting reconciliation"
            emptyBody="All captured mill results have been matched to a statement."
          />
        </Card>
        <ApprovalQueueCard title="Action queue" items={data.actionItems} />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <ChartCard title="Cash position — last 8 weeks" empty={!data.cashAvailable} emptyLabel="Accounting module not yet set up for this association.">
          <AreaTrend data={data.cashTrend} xKey="week" yKey="balance" valueFormatter={(v) => formatMoney(v, { withPrefix: true })} />
        </ChartCard>
        <AlertsCard items={data.alerts} />
      </div>

      <Card title="Recent postings">
        {data.activity.length > 0 ? <Timeline items={data.activity} /> : <p className="text-sm text-ink-400">No postings yet.</p>}
      </Card>
    </div>
  );
}
