"use client";

import { TbTruck } from "react-icons/tb";
import { Section, Demo } from "./Section";
import { Card } from "@/components/ui/Card";
import { StatCard, KpiRow, DeltaChip } from "@/components/ui/StatCard";
import { ChartCard } from "@/components/ui/ChartCard";
import { ProgressCard, ProgressBar } from "@/components/ui/ProgressCard";
import { Button } from "@/components/ui/Button";
import { AreaTrend } from "@/components/charts/AreaTrend";
import { ButtonGroup } from "@/components/ui/Button";
import { formatMoney, formatTonnes } from "@/lib/formatMoney";
import { StatCardSkeleton } from "@/components/ui/Skeleton";

const TREND = [
  { day: "Mon", tonnes: 210 },
  { day: "Tue", tonnes: 260 },
  { day: "Wed", tonnes: 190 },
  { day: "Thu", tonnes: 310 },
  { day: "Fri", tonnes: 280 },
  { day: "Sat", tonnes: 150 },
];

export function CardsStatsSection() {
  return (
    <Section id="cards" title="Cards & Stats" description="Numbers are the heroes: tabular figures, generous size, small quiet labels.">
      <Demo label="Card">
        <Card title="Recent activity" action={<Button size="sm" variant="ghost">View all</Button>}>
          <p className="text-sm text-ink-500">Card body content — any composition of children goes here.</p>
        </Card>
      </Demo>

      <Demo label="KPI row / StatCard">
        <KpiRow>
          <StatCard
            label="Total delivered"
            value={12450}
            formatValue={(v) => formatTonnes(v, 0)}
            delta={15.8}
            icon={<TbTruck />}
            info="Season-to-date tonnage accepted at the mill"
          />
          <StatCard label="Cash position" value={842300} formatValue={(v) => `E ${formatMoney(v)}`} delta={4.2} />
          <StatCard label="Avg sucrose %" value={14.6} formatValue={(v) => `${v.toFixed(1)}%`} delta={-1.1} deltaDirection="downIsGood" deltaCaption="vs target" />
          <StatCardSkeleton />
        </KpiRow>
      </Demo>

      <Demo label="Delta chip (contextual direction)">
        <div className="flex flex-wrap items-center gap-4">
          <DeltaChip value={15.8} caption="vs last season" />
          <DeltaChip value={-4.2} caption="vs last season" />
          <DeltaChip value={-3.4} direction="downIsGood" caption="cost / ha, down is good" />
        </div>
      </Demo>

      <Demo label="ChartCard with range control">
        <ChartCard
          title="Daily deliveries"
          height={220}
          action={<ButtonGroup size="sm" options={[{ value: "day", label: "Day" }, { value: "week", label: "Week" }, { value: "month", label: "Month" }]} defaultValue="day" />}
        >
          <AreaTrend data={TREND} xKey="day" yKey="tonnes" height={220} />
        </ChartCard>
      </Demo>

      <Demo label="ChartCard — empty state">
        <ChartCard title="Sucrose trend" height={180} empty emptyLabel="No mill results captured for this range yet." />
      </Demo>

      <Demo label="Progress card">
        <div className="grid gap-4 sm:grid-cols-2">
          <ProgressCard label="Season quota" value={8120} max={11000} />
          <div>
            <p className="mb-2 text-xs text-ink-500">Standalone progress bar</p>
            <ProgressBar value={62} />
          </div>
        </div>
      </Demo>
    </Section>
  );
}
