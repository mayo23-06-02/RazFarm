export const chart = {
  colors: ["#2E7D32", "#B77816", "#1E5AA8", "#C00000", "#74B37D", "#6B6659"],
  grid: { stroke: "#E5E1D8", strokeDasharray: "3 3", vertical: false },
  axis: {
    stroke: "#E5E1D8",
    tick: { fill: "#8A857A", fontSize: 12 },
    tickLine: false,
    axisLine: false,
  },
  tooltip: {
    contentStyle: {
      borderRadius: 12,
      border: "1px solid #E5E1D8",
      boxShadow: "0 4px 16px rgba(33,31,26,.08)",
      fontSize: 13,
    },
  },
} as const;
