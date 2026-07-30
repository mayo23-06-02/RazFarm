"use client";

import Link from "next/link";
import { TbAlertTriangle, TbPlant2 } from "react-icons/tb";
import { StatCard, KpiRow } from "@/components/ui/StatCard";
import { ChartCard } from "@/components/ui/ChartCard";
import { BarCompare } from "@/components/charts/BarCompare";
import { DataTable, type DataTableColumn } from "@/components/ui/DataTable";
import { EmptyState } from "@/components/ui/EmptyState";
import { Badge } from "@/components/ui/Badge";
import type { Database } from "@/lib/database.types";

type CropCycleYieldRow = Database["public"]["Views"]["crop_cycle_yields"]["Row"];
type RatoonDeclineRow = Database["public"]["Views"]["ratoon_decline_curve"]["Row"];
type ReplantRow = Database["public"]["Views"]["field_replant_recommendations"]["Row"];

export interface YieldAnalyticsSectionProps {
  totalHectares: number;
  latestByField: CropCycleYieldRow[];
  declineCurve: RatoonDeclineRow[];
  replantRecommendations: ReplantRow[];
}

export function YieldAnalyticsSection({ totalHectares, latestByField, declineCurve, replantRecommendations }: YieldAnalyticsSectionProps) {
  const withYield = latestByField.filter((c) => c.tonnes_per_ha != null);
  const avgTonnesPerHa = withYield.length > 0 ? withYield.reduce((s, c) => s + (c.tonnes_per_ha ?? 0), 0) / withYield.length : 0;
  const chartData = withYield.map((c) => ({ field: c.field_code, tha: c.tonnes_per_ha ?? 0 }));

  const declineColumns: DataTableColumn<RatoonDeclineRow>[] = [
    { key: "field", header: "Field", render: (r) => r.field_code },
    { key: "cycle", header: "Cycle", render: (r) => (r.ratoon_number === 0 ? "Plant crop" : `Ratoon ${r.ratoon_number}`) },
    { key: "tha", header: "t/ha", align: "right", render: (r) => (r.tonnes_per_ha != null ? r.tonnes_per_ha.toFixed(1) : "—") },
    { key: "prev", header: "Prev. t/ha", align: "right", render: (r) => (r.prev_tonnes_per_ha != null ? r.prev_tonnes_per_ha.toFixed(1) : "—") },
    {
      key: "change",
      header: "Change",
      align: "right",
      render: (r) =>
        r.pct_change_vs_prev != null ? (
          <span className={r.pct_change_vs_prev < 0 ? "text-danger-600" : "text-field-500"}>
            {r.pct_change_vs_prev > 0 ? "+" : ""}
            {r.pct_change_vs_prev.toFixed(1)}%
          </span>
        ) : (
          "—"
        ),
    },
  ];

  const replantColumns: DataTableColumn<ReplantRow>[] = [
    { key: "field", header: "Field", render: (r) => <Link href={`/fields/${r.field_id}`} className="font-medium text-brand-600 hover:underline">{r.field_code}</Link> },
    { key: "ratoon", header: "Latest ratoon", align: "right", render: (r) => r.latest_ratoon_number },
    { key: "tha", header: "Latest t/ha", align: "right", render: (r) => (r.latest_tonnes_per_ha != null ? r.latest_tonnes_per_ha.toFixed(1) : "—") },
    { key: "reason", header: "Reason", render: (r) => <Badge variant="warning" icon={<TbAlertTriangle />}>{r.reason}</Badge> },
  ];

  return (
    <div className="flex flex-col gap-6">
      <KpiRow>
        <StatCard label="Hectares under production" value={totalHectares} formatValue={(v) => v.toFixed(1)} icon={<TbPlant2 />} />
        <StatCard label="Average yield" value={avgTonnesPerHa} formatValue={(v) => `${v.toFixed(1)} t/ha`} deltaCaption="latest harvested cycle per field" />
        <StatCard label="Fields flagged for replant" value={replantRecommendations.length} formatValue={(v) => v.toFixed(0)} icon={<TbAlertTriangle />} />
      </KpiRow>

      <ChartCard title="Yield by field (t/ha, latest harvest)" empty={chartData.length === 0} emptyLabel="No harvested cycles yet.">
        <BarCompare data={chartData} xKey="field" yKey="tha" />
      </ChartCard>

      <div className="flex flex-col gap-3">
        <h2 className="font-display text-[20px] font-semibold text-ink-900">Ratoon decline curve</h2>
        <DataTable
          columns={declineColumns}
          data={declineCurve}
          rowKey={(r) => r.crop_cycle_id}
          emptyTitle="No ratoon history yet"
          emptyBody="Yield drops from one ratoon to the next will show here once fields have been harvested more than once."
        />
      </div>

      <div className="flex flex-col gap-3">
        <h2 className="font-display text-[20px] font-semibold text-ink-900">Replant recommendations</h2>
        {replantRecommendations.length === 0 ? (
          <EmptyState compact title="No fields need replanting" body="Fields are flagged here once they're deep into their ratoon cycle or yield has dropped well below the plant crop." />
        ) : (
          <DataTable columns={replantColumns} data={replantRecommendations} rowKey={(r) => r.field_id} />
        )}
      </div>
    </div>
  );
}
