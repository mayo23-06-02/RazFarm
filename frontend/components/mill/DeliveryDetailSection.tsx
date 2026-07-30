"use client";

import { useState } from "react";
import { PageHeader } from "@/components/ui/PageHeader";
import { Badge, type BadgeVariant } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { DescriptionList } from "@/components/ui/DescriptionList";
import { ConfirmDialog } from "@/components/ui/Modal";
import { useToast } from "@/components/ui/Toast";
import { createClient } from "@/lib/supabase/client";
import { formatDate, formatDateTime } from "@/lib/formatDate";
import { formatTonnes, formatPercent } from "@/lib/formatMoney";
import { MillResultDrawer } from "./MillResultDrawer";
import type { Database, DeliveryStatus } from "@/lib/database.types";

type DeliveryDetailRow = Database["public"]["Views"]["delivery_details"]["Row"];
type ReconciliationRow = Database["public"]["Views"]["field_delivery_reconciliation"]["Row"];

const STATUS_VARIANT: Record<DeliveryStatus, BadgeVariant> = {
  dispatched: "info",
  result_captured: "warning",
  reconciled: "success",
};

export interface DeliveryDetailSectionProps {
  delivery: DeliveryDetailRow;
  fieldReconciliation: ReconciliationRow | null;
  canCaptureMill: boolean;
}

export function DeliveryDetailSection({ delivery, fieldReconciliation, canCaptureMill }: DeliveryDetailSectionProps) {
  const { addToast } = useToast();
  const [resultOpen, setResultOpen] = useState(false);
  const [reconciling, setReconciling] = useState(false);

  const refresh = () => window.location.reload();

  const reconcile = async () => {
    setReconciling(true);
    const supabase = createClient();
    const { error } = await supabase.rpc("reconcile_delivery", { p_delivery_id: delivery.id });
    setReconciling(false);
    if (error) {
      addToast({ variant: "danger", message: error.message });
      return;
    }
    addToast({ variant: "field", message: "Delivery reconciled" });
    refresh();
  };

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title={delivery.delivery_no}
        backHref="/mill/deliveries"
        subtitle={<Badge variant={STATUS_VARIANT[delivery.status]}>{delivery.status.replace(/_/g, " ")}</Badge>}
        actions={
          canCaptureMill ? (
            <>
              {delivery.status !== "reconciled" && (
                <Button variant="secondary" onClick={() => setResultOpen(true)}>
                  {delivery.mill_result_id ? "Edit mill result" : "Capture mill result"}
                </Button>
              )}
              {delivery.status === "result_captured" && (
                <ConfirmDialog
                  trigger={<Button loading={reconciling}>Reconcile delivery</Button>}
                  title="Reconcile delivery"
                  body={`Mark ${delivery.delivery_no} as reconciled? This confirms the mill result matches what was recorded for this consignment.`}
                  tone="primary"
                  confirmLabel="Reconcile"
                  onConfirm={reconcile}
                />
              )}
            </>
          ) : undefined
        }
      />

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-card border border-paper-200 bg-paper-0 p-5 shadow-card">
          <h2 className="font-display text-[18px] font-semibold text-ink-900">Consignment</h2>
          <DescriptionList
            className="mt-4"
            items={[
              { label: "Field", value: delivery.field_code },
              { label: "Variety", value: delivery.field_variety || "—" },
              { label: "Delivery date", value: formatDate(delivery.delivery_date) },
              { label: "Haulier", value: delivery.haulier || "—" },
              { label: "Vehicle", value: delivery.vehicle_reg || "—" },
              { label: "Tonnes loaded", value: formatTonnes(delivery.tonnes_loaded) },
              { label: "Mill destination", value: delivery.mill },
              { label: "Notes", value: delivery.notes || "—" },
            ]}
          />
        </div>

        <div className="rounded-card border border-paper-200 bg-paper-0 p-5 shadow-card">
          <h2 className="font-display text-[18px] font-semibold text-ink-900">Mill result</h2>
          {delivery.mill_result_id ? (
            <DescriptionList
              className="mt-4"
              items={[
                { label: "Tonnes accepted", value: formatTonnes(delivery.tonnes_accepted ?? 0) },
                { label: "Sucrose %", value: delivery.sucrose_pct != null ? formatPercent(delivery.sucrose_pct) : "—" },
                { label: "RV / ERC value", value: delivery.rv_value != null ? delivery.rv_value.toFixed(3) : "—" },
                { label: "Source", value: delivery.mill_result_source === "import" ? "Mill statement import" : "Manual entry" },
                { label: "Captured", value: delivery.mill_result_captured_at ? formatDateTime(delivery.mill_result_captured_at) : "—" },
                { label: "Notes", value: delivery.mill_result_notes || "—" },
              ]}
            />
          ) : (
            <p className="mt-4 text-sm text-ink-400">No mill result captured yet.</p>
          )}
        </div>
      </div>

      {fieldReconciliation && (
        <div className="rounded-card border border-paper-200 bg-paper-0 p-5 shadow-card">
          <h2 className="font-display text-[18px] font-semibold text-ink-900">Field reconciliation — {delivery.field_code}</h2>
          <p className="mt-1 text-xs text-ink-400">Cumulative across every delivery recorded for this field, not just this consignment.</p>
          <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-4">
            <div>
              <p className="text-[11px] font-medium uppercase tracking-wide text-ink-400">Cut in field</p>
              <p className="text-lg font-semibold tabular-nums text-ink-900">{formatTonnes(fieldReconciliation.tonnes_cut)}</p>
            </div>
            <div>
              <p className="text-[11px] font-medium uppercase tracking-wide text-ink-400">Loaded</p>
              <p className="text-lg font-semibold tabular-nums text-ink-900">{formatTonnes(fieldReconciliation.tonnes_loaded)}</p>
            </div>
            <div>
              <p className="text-[11px] font-medium uppercase tracking-wide text-ink-400">Accepted at mill</p>
              <p className="text-lg font-semibold tabular-nums text-ink-900">{formatTonnes(fieldReconciliation.tonnes_accepted)}</p>
            </div>
            <div>
              <p className="text-[11px] font-medium uppercase tracking-wide text-ink-400">Variance</p>
              <p className={`text-lg font-semibold tabular-nums ${fieldReconciliation.variance_tonnes > 0 ? "text-danger-600" : "text-field-500"}`}>
                {formatTonnes(fieldReconciliation.variance_tonnes)}
              </p>
            </div>
          </div>
          {fieldReconciliation.recovery_pct != null && (
            <p className="mt-3 text-sm text-ink-500">
              Recovery rate: <span className="font-medium tabular-nums text-ink-900">{formatPercent(fieldReconciliation.recovery_pct)}</span> of tonnes cut reached the mill.
            </p>
          )}
        </div>
      )}

      {canCaptureMill && <MillResultDrawer delivery={delivery} open={resultOpen} onOpenChange={setResultOpen} onSaved={refresh} />}
    </div>
  );
}
