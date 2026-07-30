"use client";

import { useState } from "react";
import { TbPlus } from "react-icons/tb";
import { Button } from "@/components/ui/Button";
import { DataTable, type DataTableColumn } from "@/components/ui/DataTable";
import { Select } from "@/components/ui/Select";
import { formatDate } from "@/lib/formatDate";
import { formatTonnes } from "@/lib/formatMoney";
import { HarvestCaptureDrawer } from "./HarvestCaptureDrawer";
import type { Database } from "@/lib/database.types";

type HarvestCaptureRow = Database["public"]["Tables"]["harvest_captures"]["Row"] & { field_code: string };

export interface HarvestCaptureBoardSectionProps {
  tenantId: string;
  captures: HarvestCaptureRow[];
  openCycleFields: { fieldId: string; cropCycleId: string; code: string }[];
  canManage: boolean;
}

export function HarvestCaptureBoardSection({ tenantId, captures, openCycleFields, canManage }: HarvestCaptureBoardSectionProps) {
  const [selectedFieldId, setSelectedFieldId] = useState(openCycleFields[0]?.fieldId ?? "");
  const [captureOpen, setCaptureOpen] = useState(false);
  const selected = openCycleFields.find((f) => f.fieldId === selectedFieldId);

  const todayTotal = captures
    .filter((c) => c.capture_date === new Date().toISOString().slice(0, 10))
    .reduce((sum, c) => sum + c.tonnes_cut, 0);

  const columns: DataTableColumn<HarvestCaptureRow>[] = [
    { key: "date", header: "Date", render: (c) => formatDate(c.capture_date), sortable: true, sortValue: (c) => c.capture_date },
    { key: "field", header: "Field", render: (c) => c.field_code },
    { key: "tonnes", header: "Tonnes cut", align: "right", render: (c) => formatTonnes(c.tonnes_cut) },
    { key: "team", header: "Cutter team", render: (c) => c.cutter_team || "—" },
    { key: "stock", header: "Field-edge stock", align: "right", render: (c) => formatTonnes(c.field_edge_stock_tonnes) },
  ];

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-ink-500">
          Cut today across all fields: <span className="font-medium tabular-nums text-ink-900">{formatTonnes(todayTotal)}</span>
        </p>
        {canManage && openCycleFields.length > 0 && (
          <div className="flex items-center gap-2">
            <Select className="w-48" options={openCycleFields.map((f) => ({ value: f.fieldId, label: f.code }))} value={selectedFieldId} onChange={setSelectedFieldId} />
            <Button icon={<TbPlus />} onClick={() => setCaptureOpen(true)} disabled={!selected}>
              Capture harvest
            </Button>
          </div>
        )}
      </div>

      <DataTable
        columns={columns}
        data={[...captures].sort((a, b) => b.capture_date.localeCompare(a.capture_date))}
        rowKey={(c) => c.id}
        sortable
        emptyTitle="No harvest captured yet"
        emptyBody="Daily tonnes cut across all fields will show here."
      />

      {selected && (
        <HarvestCaptureDrawer
          tenantId={tenantId}
          fieldId={selected.fieldId}
          cropCycleId={selected.cropCycleId}
          harvestPlans={[]}
          open={captureOpen}
          onOpenChange={setCaptureOpen}
          onSaved={() => window.location.reload()}
        />
      )}
    </div>
  );
}
