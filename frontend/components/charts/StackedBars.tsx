"use client";

import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { chart } from "./chartTheme";

export interface StackedBarsProps {
  data: Record<string, number | string>[];
  xKey: string;
  series: { key: string; label: string }[];
  height?: number;
}

export function StackedBars({ data, xKey, series, height = 260 }: StackedBarsProps) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
        <CartesianGrid {...chart.grid} />
        <XAxis dataKey={xKey} {...chart.axis} tickMargin={8} />
        <YAxis {...chart.axis} tickMargin={4} width={40} />
        <Tooltip {...chart.tooltip} cursor={{ fill: "#F2EFE9" }} />
        {series.length > 2 && (
          <Legend
            iconType="circle"
            iconSize={8}
            wrapperStyle={{ fontSize: 12, color: "#6B6659" }}
          />
        )}
        {series.map((s, i) => (
          <Bar
            key={s.key}
            dataKey={s.key}
            name={s.label}
            stackId="stack"
            fill={chart.colors[i % chart.colors.length]}
            radius={i === series.length - 1 ? [6, 6, 0, 0] : undefined}
          />
        ))}
      </BarChart>
    </ResponsiveContainer>
  );
}
