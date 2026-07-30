import Link from "next/link";
import { TbDroplet } from "react-icons/tb";
import { Badge } from "@/components/ui/Badge";
import { AreaTrend } from "@/components/charts/AreaTrend";

export interface FieldCardProps {
  code: string;
  hectares: number;
  variety: string;
  ratoon: number;
  status: "active" | "fallow" | "harvesting" | "replanting" | "retired";
  spark: { season: string; yield: number }[];
  href?: string;
}

const statusVariant = {
  active: "success",
  fallow: "neutral",
  harvesting: "warning",
  replanting: "info",
  retired: "neutral",
} as const;
const statusLabel = {
  active: "Active",
  fallow: "Fallow",
  harvesting: "Harvesting",
  replanting: "Replanting",
  retired: "Retired",
} as const;

export function FieldCard({ code, hectares, variety, ratoon, status, spark, href }: FieldCardProps) {
  const card = (
    <div className="rounded-card border border-paper-200 bg-paper-0 p-4 shadow-card transition-colors duration-150 hover:border-brand-200">
      <div className="flex items-start justify-between">
        <div>
          <p className="font-display text-lg font-semibold text-ink-900">{code}</p>
          <p className="text-xs text-ink-500">{hectares.toFixed(1)} ha · {variety || "No variety recorded"}</p>
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
        <span>t/ha trend</span>
      </div>
    </div>
  );

  return href ? (
    <Link href={href} className="block">
      {card}
    </Link>
  ) : (
    card
  );
}
