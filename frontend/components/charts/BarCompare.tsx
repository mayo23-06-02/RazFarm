"use client";

import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { chart } from "./chartTheme";

export interface BarCompareProps {
  data: Record<string, number | string>[];
  xKey: string;
  yKey: string;
  height?: number;
}

export function BarCompare({ data, xKey, yKey, height = 260 }: BarCompareProps) {
  const max = Math.max(...data.map((d) => Number(d[yKey]) || 0));

  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
        <CartesianGrid {...chart.grid} />
        <XAxis dataKey={xKey} {...chart.axis} tickMargin={8} />
        <YAxis {...chart.axis} tickMargin={4} width={40} />
        <Tooltip {...chart.tooltip} cursor={{ fill: "#F2EFE9" }} />
        <Bar dataKey={yKey} radius={[6, 6, 0, 0]}>
          {data.map((d, i) => (
            <Cell key={i} fill={Number(d[yKey]) === max ? "#2E7D32" : "#CFE6D2"} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
