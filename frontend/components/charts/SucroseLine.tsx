"use client";

import { Bar, CartesianGrid, ComposedChart, Line, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { chart } from "./chartTheme";

export interface SucroseLineProps {
  data: Record<string, number | string>[];
  xKey: string;
  tonnesKey: string;
  sucroseKey: string;
  height?: number;
}

export function SucroseLine({ data, xKey, tonnesKey, sucroseKey, height = 260 }: SucroseLineProps) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <ComposedChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
        <CartesianGrid {...chart.grid} />
        <XAxis dataKey={xKey} {...chart.axis} tickMargin={8} />
        <YAxis yAxisId="tonnes" {...chart.axis} tickMargin={4} width={40} />
        <YAxis
          yAxisId="sucrose"
          orientation="right"
          {...chart.axis}
          tickMargin={4}
          width={40}
          domain={[0, 20]}
        />
        <Tooltip {...chart.tooltip} />
        <Bar yAxisId="tonnes" dataKey={tonnesKey} name="Tonnes" fill="#CFC9BC" radius={[6, 6, 0, 0]} />
        <Line
          yAxisId="sucrose"
          type="monotone"
          dataKey={sucroseKey}
          name="Sucrose %"
          stroke="#2E7D32"
          strokeWidth={2}
          dot={{ r: 3, fill: "#2E7D32" }}
        />
      </ComposedChart>
    </ResponsiveContainer>
  );
}
