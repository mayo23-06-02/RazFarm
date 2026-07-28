import { TbDroplet } from "react-icons/tb";
import { Badge } from "@/components/ui/Badge";
import { AreaTrend } from "@/components/charts/AreaTrend";

export interface FieldCardProps {
  code: string;
  hectares: number;
  variety: string;
  ratoon: number;
  status: "active" | "fallow" | "harvesting";
  spark: { season: string; yield: number }[];
}

const statusVariant = { active: "success", fallow: "neutral", harvesting: "warning" } as const;
const statusLabel = { active: "Active", fallow: "Fallow", harvesting: "Harvesting" } as const;

export function FieldCard({ code, hectares, variety, ratoon, status, spark }: FieldCardProps) {
  return (
    <div className="rounded-card border border-paper-200 bg-paper-0 p-4 shadow-card transition-colors duration-150 hover:border-brand-200">
      <div className="flex items-start justify-between">
        <div>
          <p className="font-display text-lg font-semibold text-ink-900">{code}</p>
          <p className="text-xs text-ink-500">{hectares.toFixed(1)} ha · {variety}</p>
        </div>
        <Badge variant={statusVariant[status]}>{statusLabel[status]}</Badge>
      </div>
      <div className="mt-2 h-16">
        <AreaTrend data={spark} xKey="season" yKey="yield" height={64} />
      </div>
      <div className="mt-1 flex items-center justify-between text-xs text-ink-400">
        <span className="flex items-center gap-1">
          <TbDroplet className="size-3.5" /> Ratoon {ratoon}
        </span>
        <span>t sucrose/ha trend</span>
      </div>
    </div>
  );
}
