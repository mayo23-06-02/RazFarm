import { TbBuildingFactory2 } from "react-icons/tb";
import { Badge } from "@/components/ui/Badge";
import { StatusDot } from "@/components/ui/StatusDot";
import { formatTonnes, formatPercent } from "@/lib/formatMoney";

export interface Delivery {
  consignment: string;
  fields: string[];
  tonnes: number;
  sucrose: number;
  rv: number;
  mill: string;
  synced: boolean;
}

export function DeliveryRow({ delivery }: { delivery: Delivery }) {
  return (
    <div className="flex items-center gap-4 rounded-ctrl border border-paper-200 bg-paper-0 px-4 py-3">
      <div className="w-24 shrink-0">
        <p className="font-mono text-sm font-semibold text-ink-900">{delivery.consignment}</p>
        <StatusDot tone={delivery.synced ? "success" : "warning"} label={delivery.synced ? "Synced" : "Pending"} />
      </div>
      <div className="flex flex-1 flex-wrap gap-1.5">
        {delivery.fields.map((f) => (
          <Badge key={f} variant="neutral">
            {f}
          </Badge>
        ))}
      </div>
      <div className="w-20 shrink-0 text-right tabular-nums text-sm text-ink-900">{formatTonnes(delivery.tonnes)}</div>
      <div className="w-20 shrink-0 text-right tabular-nums text-sm text-ink-900">{formatPercent(delivery.sucrose)}</div>
      <div className="w-16 shrink-0 text-right tabular-nums text-sm text-ink-500">RV {delivery.rv.toFixed(1)}</div>
      <div className="flex w-32 shrink-0 items-center justify-end gap-1.5 text-sm text-ink-500">
        <TbBuildingFactory2 className="size-4" />
        {delivery.mill}
      </div>
    </div>
  );
}
