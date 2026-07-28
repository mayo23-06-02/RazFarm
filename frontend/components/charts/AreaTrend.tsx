"use client";

import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { chart } from "./chartTheme";

export interface AreaTrendProps {
  data: Record<string, number | string>[];
  xKey: string;
  yKey: string;
  height?: number;
  valueFormatter?: (v: number) => string;
}

export function AreaTrend({ data, xKey, yKey, height = 260, valueFormatter }: AreaTrendProps) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <AreaChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id="areaTrendFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#2E7D32" stopOpacity={0.18} />
            <stop offset="100%" stopColor="#2E7D32" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid {...chart.grid} />
        <XAxis dataKey={xKey} {...chart.axis} tickMargin={8} interval="preserveStartEnd" />
        <YAxis {...chart.axis} tickMargin={4} width={44} tickFormatter={valueFormatter} />
        <Tooltip
          {...chart.tooltip}
          formatter={(v) => (valueFormatter ? valueFormatter(Number(v)) : v)}
        />
        <Area
          type="monotone"
          dataKey={yKey}
          stroke="#2E7D32"
          strokeWidth={2}
          fill="url(#areaTrendFill)"
          activeDot={{ r: 4 }}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}
