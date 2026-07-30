import { TbAlertTriangle, TbClipboardList, TbPlant2, TbTool } from "react-icons/tb";
import { KpiRow, StatCard } from "@/components/ui/StatCard";
import { ChartCard } from "@/components/ui/ChartCard";
import { Card } from "@/components/ui/Card";
import { Badge, type BadgeVariant } from "@/components/ui/Badge";
import { Timeline } from "@/components/ui/Timeline";
import { BarCompare } from "@/components/charts/BarCompare";
import { DataTable, type DataTableColumn } from "@/components/ui/DataTable";
import { SyncStatus } from "@/components/app/SyncStatus";
import { EmptyState } from "@/components/ui/EmptyState";
import { formatDate } from "@/lib/formatDate";
import { formatTonnes } from "@/lib/formatMoney";
import { AlertsCard } from "./AlertsCard";
import type { SupervisorDashboardData } from "@/lib/dashboard/queries";
import type { HarvestPlanStatus } from "@/lib/database.types";

interface CuttingRow {
  id: string;
  fieldCode: string;
  status: string;
  cuttingDatePlanned: string | null;
  tonnesCutToday: number;
}

const statusBadge: Record<HarvestPlanStatus, BadgeVariant> = {
  planned: "neutral",
  burn_scheduled: "warning",
  cutting: "brand",
  completed: "success",
  cancelled: "danger",
};

const columns: DataTableColumn<CuttingRow>[] = [
  { key: "field", header: "Field", render: (r) => r.fieldCode },
  {
    key: "status",
    header: "Status",
    render: (r) => <Badge variant={statusBadge[r.status as HarvestPlanStatus] ?? "neutral"}>{r.status.replace(/_/g, " ")}</Badge>,
  },
  { key: "date", header: "Cutting date", render: (r) => (r.cuttingDatePlanned ? formatDate(r.cuttingDatePlanned) : "Not scheduled") },
  { key: "tonnes", header: "Cut today", align: "right", render: (r) => formatTonnes(r.tonnesCutToday) },
];

export function SupervisorDashboard({ data }: { data: SupervisorDashboardData }) {
  return (
    <div className="flex flex-col gap-6">
      <KpiRow>
        <StatCard label="Fields due for harvest" value={data.fieldsDueForHarvest} icon={<TbPlant2 />} />
        <StatCard label="Activities logged today" value={data.activitiesLoggedToday} icon={<TbClipboardList />} />
        <StatCard label="Stock items low" value={data.stockItemsLow} icon={<TbAlertTriangle />} />
        <StatCard label="Equipment due for service" value={data.equipmentDueForService} icon={<TbTool />} />
      </KpiRow>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card title="Today's cutting plan">
          <DataTable
            columns={columns}
            data={data.cuttingPlan}
            rowKey={(r) => r.id}
            compact
            emptyTitle="Nothing scheduled"
            emptyBody="No fields are planned, burn-scheduled or cutting right now."
          />
        </Card>
        <Card title="Pending captures">
          <div className="flex flex-col items-center gap-3 py-2">
            <SyncStatus state="synced" pendingCount={data.syncPendingCount} />
            <EmptyState
              compact
              title="No offline captures pending"
              body="Web captures sync immediately. The mobile app will show its offline queue here."
            />
          </div>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <ChartCard
          title="Harvest activity — last 14 days"
          empty={data.harvestByDay.every((d) => d.tonnes === 0)}
          emptyLabel="No harvest captures logged in the last 14 days."
        >
          <BarCompare data={data.harvestByDay} xKey="date" yKey="tonnes" />
        </ChartCard>
        <AlertsCard items={data.alerts} />
      </div>

      <Card title="My recent captures">
        {data.activity.length > 0 ? <Timeline items={data.activity} /> : <p className="text-sm text-ink-400">No captures logged yet.</p>}
      </Card>
    </div>
  );
}
