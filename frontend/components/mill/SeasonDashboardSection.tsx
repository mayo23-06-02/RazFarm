"use client";

import { useState } from "react";
import { TbDownload, TbSettings, TbTruck } from "react-icons/tb";
import { StatCard, KpiRow } from "@/components/ui/StatCard";
import { ChartCard } from "@/components/ui/ChartCard";
import { ProgressCard } from "@/components/ui/ProgressCard";
import { BarCompare } from "@/components/charts/BarCompare";
import { SucroseLine } from "@/components/charts/SucroseLine";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { DataTable, type DataTableColumn } from "@/components/ui/DataTable";
import { formatDate } from "@/lib/formatDate";
import { formatTonnes } from "@/lib/formatMoney";
import { exportReportPdf } from "@/lib/exportReport";
import { SeasonSettingsDrawer } from "./SeasonSettingsDrawer";
import type { Database } from "@/lib/database.types";

type DeliveryDetailRow = Database["public"]["Views"]["delivery_details"]["Row"];

export interface SeasonDashboardSectionProps {
  tenantId: string;
  seasonStart: string;
  seasonEnd: string;
  seasonQuotaTonnes: number | null;
  seasonDeliveries: DeliveryDetailRow[];
  canManageSeason: boolean;
}

export function SeasonDashboardSection({ tenantId, seasonStart, seasonEnd, seasonQuotaTonnes, seasonDeliveries, canManageSeason }: SeasonDashboardSectionProps) {
  const [settingsOpen, setSettingsOpen] = useState(false);

  const delivered = seasonDeliveries.reduce((sum, d) => sum + (d.tonnes_accepted ?? 0), 0);
  const remaining = seasonQuotaTonnes != null ? Math.max(0, seasonQuotaTonnes - delivered) : null;
  const daysElapsed = Math.max(1, Math.floor((Date.now() - new Date(seasonStart).getTime()) / 86400000) + 1);
  const dailyRate = delivered / daysElapsed;
  const unreconciled = seasonDeliveries.filter((d) => d.status !== "reconciled");

  const byField = new Map<string, number>();
  for (const d of seasonDeliveries) byField.set(d.field_code, (byField.get(d.field_code) ?? 0) + (d.tonnes_accepted ?? 0));
  const fieldChartData = [...byField.entries()].map(([field, tha]) => ({ field, tha }));

  const sucroseData = seasonDeliveries
    .filter((d) => d.sucrose_pct != null)
    .sort((a, b) => a.delivery_date.localeCompare(b.delivery_date))
    .map((d) => ({ date: formatDate(d.delivery_date, { year: undefined }), tonnes: d.tonnes_accepted ?? 0, sucrose: d.sucrose_pct ?? 0 }));

  const alertColumns: DataTableColumn<DeliveryDetailRow>[] = [
    { key: "delivery_no", header: "Delivery no.", render: (d) => <span className="font-mono text-xs">{d.delivery_no}</span> },
    { key: "field", header: "Field", render: (d) => d.field_code },
    { key: "date", header: "Date", render: (d) => formatDate(d.delivery_date) },
    { key: "status", header: "Status", render: (d) => <Badge variant={d.status === "dispatched" ? "info" : "warning"}>{d.status.replace(/_/g, " ")}</Badge> },
  ];

  const exportPdf = () => {
    exportReportPdf({
      title: "Season Delivery Report",
      subtitle: `${formatDate(seasonStart)} – ${formatDate(seasonEnd)}`,
      fileNameBase: `season-delivery-${seasonStart}`,
      sections: [
        {
          heading: "Deliveries by field",
          columns: ["Field", "Tonnes accepted"],
          rows: fieldChartData.map((f) => [f.field, f.tha.toFixed(2)]),
          totalRow: ["Total", delivered.toFixed(2)],
        },
      ],
    });
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <p className="text-sm text-ink-500">
          Season {formatDate(seasonStart)} – {formatDate(seasonEnd)}
        </p>
        <div className="flex items-center gap-2">
          <Button variant="secondary" icon={<TbDownload />} onClick={exportPdf}>
            Export report
          </Button>
          {canManageSeason && (
            <Button variant="secondary" icon={<TbSettings />} onClick={() => setSettingsOpen(true)}>
              Season settings
            </Button>
          )}
        </div>
      </div>

      <KpiRow>
        <StatCard label="Delivered this season" value={delivered} formatValue={(v) => formatTonnes(v)} icon={<TbTruck />} />
        <StatCard label="Daily delivery rate" value={dailyRate} formatValue={(v) => `${v.toFixed(1)} t/day`} />
        <StatCard label="Unreconciled deliveries" value={unreconciled.length} formatValue={(v) => v.toFixed(0)} />
        <StatCard
          label="Season quota"
          value={seasonQuotaTonnes ?? 0}
          formatValue={(v) => (seasonQuotaTonnes != null ? formatTonnes(v) : "Not set")}
        />
      </KpiRow>

      {seasonQuotaTonnes != null && remaining != null && (
        <ProgressCard label="Quota progress" value={delivered} max={seasonQuotaTonnes} unit="t" />
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        <ChartCard title="Sucrose trend" empty={sucroseData.length === 0} emptyLabel="No mill results captured yet this season.">
          <SucroseLine data={sucroseData} xKey="date" tonnesKey="tonnes" sucroseKey="sucrose" />
        </ChartCard>
        <ChartCard title="Deliveries by field (t)" empty={fieldChartData.length === 0} emptyLabel="No deliveries this season yet.">
          <BarCompare data={fieldChartData} xKey="field" yKey="tha" />
        </ChartCard>
      </div>

      <div className="flex flex-col gap-3">
        <h2 className="font-display text-[20px] font-semibold text-ink-900">Needs attention</h2>
        <DataTable
          columns={alertColumns}
          data={unreconciled}
          rowKey={(d) => d.id}
          emptyTitle="Everything's reconciled"
          emptyBody="All deliveries this season have mill results captured and reconciled."
        />
      </div>

      {canManageSeason && (
        <SeasonSettingsDrawer
          tenantId={tenantId}
          seasonStart={seasonStart}
          seasonEnd={seasonEnd}
          seasonQuotaTonnes={seasonQuotaTonnes}
          open={settingsOpen}
          onOpenChange={setSettingsOpen}
          onSaved={() => window.location.reload()}
        />
      )}
    </div>
  );
}
