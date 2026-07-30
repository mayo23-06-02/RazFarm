"use client"

import { TbCash, TbCircleCheck, TbTruck, TbUsers } from "react-icons/tb";
import { KpiRow, StatCard } from "@/components/ui/StatCard";
import { ChartCard } from "@/components/ui/ChartCard";
import { ProgressCard } from "@/components/ui/ProgressCard";
import { Card } from "@/components/ui/Card";
import { Timeline } from "@/components/ui/Timeline";
import { AreaTrend } from "@/components/charts/AreaTrend";
import { formatMoney, formatTonnes } from "@/lib/formatMoney";
import { ApprovalQueueCard } from "./ApprovalQueueCard";
import { AlertsCard } from "./AlertsCard";
import type { CommitteeDashboardData } from "@/lib/dashboard/queries";

export function CommitteeDashboard({ data }: { data: CommitteeDashboardData }) {
  return (
    <div className="flex flex-col gap-6">
      <KpiRow>
        <StatCard label="Season delivered" value={data.deliveredTonnes} formatValue={(v) => formatTonnes(v)} icon={<TbTruck />} />
        <StatCard
          label="Cash on hand"
          value={data.cashOnHand}
          formatValue={(v) => (data.cashAvailable ? formatMoney(v, { withPrefix: true }) : "Not set up")}
          icon={<TbCash />}
        />
        <StatCard label="Pending approvals" value={data.pendingApprovalsCount} icon={<TbCircleCheck />} />
        <StatCard label="Members active" value={data.membersActive} icon={<TbUsers />} />
      </KpiRow>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card title="Season progress">
          {data.seasonQuotaTonnes ? (
            <>
              <ProgressCard label="Quota progress" value={data.deliveredTonnes} max={data.seasonQuotaTonnes} unit="t" className="border-0 p-0 shadow-none" />
              <p className="mt-3 text-sm text-ink-500">
                {data.daysRemaining} day{data.daysRemaining === 1 ? "" : "s"} remaining in the season
              </p>
            </>
          ) : (
            <p className="text-sm text-ink-400">Season quota not set — add one in season settings to track progress.</p>
          )}
        </Card>
        <ApprovalQueueCard title="Approvals" items={data.approvalItems} />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <ChartCard title="Cash position — last 8 weeks" empty={!data.cashAvailable} emptyLabel="Accounting module not yet set up for this association.">
          <AreaTrend data={data.cashTrend} xKey="week" yKey="balance" valueFormatter={(v) => formatMoney(v, { withPrefix: true })} />
        </ChartCard>
        <AlertsCard items={data.alerts} />
      </div>

      <Card title="Recent activity">
        {data.activity.length > 0 ? <Timeline items={data.activity} /> : <p className="text-sm text-ink-400">No recent activity to show.</p>}
      </Card>
    </div>
  );
}
