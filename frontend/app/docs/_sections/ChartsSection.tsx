"use client";

import { Section } from "./Section";
import { ChartCard } from "@/components/ui/ChartCard";
import { AreaTrend } from "@/components/charts/AreaTrend";
import { BarCompare } from "@/components/charts/BarCompare";
import { StackedBars } from "@/components/charts/StackedBars";
import { DonutSplit } from "@/components/charts/DonutSplit";
import { SucroseLine } from "@/components/charts/SucroseLine";
import { formatMoney } from "@/lib/formatMoney";

const CASH_TREND = [
  { month: "Feb", cash: 612000 },
  { month: "Mar", cash: 654000 },
  { month: "Apr", cash: 701000 },
  { month: "May", cash: 689000 },
  { month: "Jun", cash: 758000 },
  { month: "Jul", cash: 842300 },
];

const DAILY = [
  { field: "B12", tonnes: 18 },
  { field: "B14", tonnes: 24 },
  { field: "C03", tonnes: 9 },
  { field: "D21", tonnes: 31 },
  { field: "A08", tonnes: 15 },
];

const COST_COMPOSITION = [
  { field: "B12", haulage: 4200, cutting: 3100, levies: 900 },
  { field: "B14", haulage: 5600, cutting: 4200, levies: 1200 },
  { field: "C03", haulage: 2100, cutting: 1800, levies: 500 },
  { field: "D21", haulage: 7200, cutting: 5400, levies: 1600 },
];

const DEDUCTIONS = [
  { label: "Haulage", value: 19100 },
  { label: "Cutting", value: 14500 },
  { label: "Levies", value: 4200 },
  { label: "Loan repayment", value: 6800 },
];

const SUCROSE = [
  { date: "1 Jul", tonnes: 210, sucrose: 13.2 },
  { date: "8 Jul", tonnes: 260, sucrose: 13.8 },
  { date: "15 Jul", tonnes: 190, sucrose: 14.1 },
  { date: "22 Jul", tonnes: 310, sucrose: 14.6 },
  { date: "29 Jul", tonnes: 280, sucrose: 15.0 },
];

export function ChartsSection() {
  return (
    <Section id="charts" title="Charts" description="Recharts wrappers sharing one theme — no 3D, no legends for ≤2 series, always ResponsiveContainer.">
      <div className="grid gap-4 lg:grid-cols-2">
        <ChartCard title="Cash position" height={240}>
          <AreaTrend data={CASH_TREND} xKey="month" yKey="cash" height={240} valueFormatter={(v) => `E ${formatMoney(v)}`} />
        </ChartCard>
        <ChartCard title="Deliveries by field" height={240}>
          <BarCompare data={DAILY} xKey="field" yKey="tonnes" height={240} />
        </ChartCard>
        <ChartCard title="Cost composition per field" height={240}>
          <StackedBars
            data={COST_COMPOSITION}
            xKey="field"
            series={[
              { key: "haulage", label: "Haulage" },
              { key: "cutting", label: "Cutting" },
              { key: "levies", label: "Levies" },
            ]}
            height={240}
          />
        </ChartCard>
        <ChartCard title="Deduction breakdown" height={240}>
          <DonutSplit data={DEDUCTIONS} height={240} centerLabel="Total deductions" />
        </ChartCard>
        <ChartCard title="Sucrose trend" height={260} className="lg:col-span-2">
          <SucroseLine data={SUCROSE} xKey="date" tonnesKey="tonnes" sucroseKey="sucrose" height={260} />
        </ChartCard>
      </div>
    </Section>
  );
}
