"use client";

import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import { chart } from "./chartTheme";
import { formatMoney } from "@/lib/formatMoney";

export interface DonutSplitProps {
  data: { label: string; value: number }[];
  height?: number;
  centerLabel?: string;
}

export function DonutSplit({ data, height = 260, centerLabel = "Total" }: DonutSplitProps) {
  const total = data.reduce((sum, d) => sum + d.value, 0);

  return (
    <div className="relative" style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Tooltip {...chart.tooltip} formatter={(v) => `E ${formatMoney(Number(v))}`} />
          <Pie
            data={data}
            dataKey="value"
            nameKey="label"
            innerRadius="60%"
            outerRadius="88%"
            paddingAngle={2}
            strokeWidth={0}
          >
            {data.map((_, i) => (
              <Cell key={i} fill={chart.colors[i % chart.colors.length]} />
            ))}
          </Pie>
        </PieChart>
      </ResponsiveContainer>
      <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
        <span className="font-display text-xl font-bold tabular-nums text-ink-900">
          E {formatMoney(total)}
        </span>
        <span className="text-xs text-ink-400">{centerLabel}</span>
      </div>
    </div>
  );
}
