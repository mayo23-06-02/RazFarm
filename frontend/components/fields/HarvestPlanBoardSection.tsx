"use client";

import { useState } from "react";
import { TbPlus } from "react-icons/tb";
import { Button } from "@/components/ui/Button";
import { Badge, type BadgeVariant } from "@/components/ui/Badge";
import { DataTable, type DataTableColumn } from "@/components/ui/DataTable";
import { Select } from "@/components/ui/Select";
import { formatDate } from "@/lib/formatDate";
import { HarvestPlanDrawer } from "./HarvestPlanDrawer";
import type { Database, HarvestPlanStatus } from "@/lib/database.types";

type HarvestPlanRow = Database["public"]["Tables"]["harvest_plans"]["Row"] & { field_code: string };

const STATUS_VARIANT: Record<HarvestPlanStatus, BadgeVariant> = {
  planned: "neutral",
  burn_scheduled: "warning",
  cutting: "info",
  completed: "success",
  cancelled: "danger",
};

export interface HarvestPlanBoardSectionProps {
  tenantId: string;
  plans: HarvestPlanRow[];
  openCycleFields: { fieldId: string; cropCycleId: string; code: string }[];
  canManage: boolean;
}

export function HarvestPlanBoardSection({ tenantId, plans, openCycleFields, canManage }: HarvestPlanBoardSectionProps) {
  const [selectedFieldId, setSelectedFieldId] = useState(openCycleFields[0]?.fieldId ?? "");
  const [planOpen, setPlanOpen] = useState(false);
  const selected = openCycleFields.find((f) => f.fieldId === selectedFieldId);

  const columns: DataTableColumn<HarvestPlanRow>[] = [
    { key: "field", header: "Field", render: (p) => p.field_code },
    { key: "status", header: "Status", render: (p) => <Badge variant={STATUS_VARIANT[p.status]}>{p.status.replace(/_/g, " ")}</Badge> },
    { key: "cutting", header: "Cutting date", render: (p) => (p.cutting_date_planned ? formatDate(p.cutting_date_planned) : "—"), sortable: true, sortValue: (p) => p.cutting_date_planned ?? "" },
    { key: "contractor", header: "Contractor", render: (p) => p.cutting_contractor || "—" },
    { key: "burn", header: "Burn date", render: (p) => (p.burn_date ? formatDate(p.burn_date) : "—") },
    { key: "permit", header: "Burn permit", render: (p) => p.burn_permit_ref || "—" },
  ];

  return (
    <div className="flex flex-col gap-4">
      {canManage && openCycleFields.length > 0 && (
        <div className="flex items-center justify-end gap-2">
          <Select className="w-48" options={openCycleFields.map((f) => ({ value: f.fieldId, label: f.code }))} value={selectedFieldId} onChange={setSelectedFieldId} />
          <Button icon={<TbPlus />} onClick={() => setPlanOpen(true)} disabled={!selected}>
            Plan harvest
          </Button>
        </div>
      )}

      <DataTable
        columns={columns}
        data={[...plans].sort((a, b) => (a.cutting_date_planned ?? "9999").localeCompare(b.cutting_date_planned ?? "9999"))}
        rowKey={(p) => p.id}
        sortable
        emptyTitle="No harvests planned"
        emptyBody="Plan a cutting date, burn permit and contractor for a field with an open crop cycle."
      />

      {selected && (
        <HarvestPlanDrawer tenantId={tenantId} fieldId={selected.fieldId} cropCycleId={selected.cropCycleId} open={planOpen} onOpenChange={setPlanOpen} onSaved={() => window.location.reload()} />
      )}
    </div>
  );
}
