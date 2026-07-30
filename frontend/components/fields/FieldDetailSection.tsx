"use client";

import { useMemo, useState } from "react";
import {
  TbDroplet,
  TbFlask,
  TbLeaf,
  TbPlus,
  TbSeedling,
  TbSpray,
  TbSun,
  TbTractor,
} from "react-icons/tb";
import { PageHeader } from "@/components/ui/PageHeader";
import { Badge, type BadgeVariant } from "@/components/ui/Badge";
import { Tabs } from "@/components/ui/Tabs";
import { Button } from "@/components/ui/Button";
import { DescriptionList } from "@/components/ui/DescriptionList";
import { DataTable, type DataTableColumn } from "@/components/ui/DataTable";
import { Timeline } from "@/components/ui/Timeline";
import { EmptyState } from "@/components/ui/EmptyState";
import { formatDate } from "@/lib/formatDate";
import { formatMoney, formatTonnes } from "@/lib/formatMoney";
import { FieldFormDrawer } from "./FieldFormDrawer";
import { CropCycleDrawer } from "./CropCycleDrawer";
import { FieldActivityDrawer } from "./FieldActivityDrawer";
import { HarvestPlanDrawer } from "./HarvestPlanDrawer";
import { HarvestCaptureDrawer } from "./HarvestCaptureDrawer";
import { FieldPhotosTab } from "./FieldPhotosTab";
import type { Database, FieldActivityType } from "@/lib/database.types";

type FieldRow = Database["public"]["Tables"]["fields"]["Row"];
type CropCycleRow = Database["public"]["Tables"]["crop_cycles"]["Row"];
type FieldActivityRow = Database["public"]["Tables"]["field_activities"]["Row"];
type HarvestPlanRow = Database["public"]["Tables"]["harvest_plans"]["Row"];
type HarvestCaptureRow = Database["public"]["Tables"]["harvest_captures"]["Row"];
type FieldPhotoRow = Database["public"]["Tables"]["field_photos"]["Row"];

const CYCLE_STATUS_VARIANT: Record<CropCycleRow["status"], BadgeVariant> = {
  growing: "info",
  ready_to_harvest: "warning",
  harvesting: "warning",
  harvested: "success",
  ploughed_out: "neutral",
};

const PLAN_STATUS_VARIANT: Record<HarvestPlanRow["status"], BadgeVariant> = {
  planned: "neutral",
  burn_scheduled: "warning",
  cutting: "info",
  completed: "success",
  cancelled: "danger",
};

const ACTIVITY_ICON: Record<FieldActivityType, React.ReactNode> = {
  land_prep: <TbTractor />,
  planting: <TbSeedling />,
  fertilizer: <TbFlask />,
  herbicide: <TbSpray />,
  pesticide: <TbSpray />,
  ripener: <TbSun />,
  irrigation: <TbDroplet />,
  other: <TbLeaf />,
};

const ACTIVITY_LABEL: Record<FieldActivityType, string> = {
  land_prep: "Land preparation",
  planting: "Planting",
  fertilizer: "Fertilizer application",
  herbicide: "Herbicide",
  pesticide: "Pesticide",
  ripener: "Ripener application",
  irrigation: "Irrigation event",
  other: "Other activity",
};

function daysSince(dateStr: string) {
  return Math.max(0, Math.floor((Date.now() - new Date(dateStr).getTime()) / 86400000));
}

export interface FieldDetailSectionProps {
  tenantId: string;
  field: FieldRow;
  memberName: string | null;
  cycles: CropCycleRow[];
  activities: FieldActivityRow[];
  harvestPlans: HarvestPlanRow[];
  harvestCaptures: HarvestCaptureRow[];
  photos: FieldPhotoRow[];
  members: { id: string; full_name: string }[];
  canManage: boolean;
}

export function FieldDetailSection({
  tenantId,
  field: initialField,
  memberName,
  cycles: initialCycles,
  activities,
  harvestPlans,
  harvestCaptures,
  photos,
  members,
  canManage,
}: FieldDetailSectionProps) {
  const [field] = useState(initialField);
  const [cycles] = useState(initialCycles);
  const [activeTab, setActiveTab] = useState("overview");
  const [editOpen, setEditOpen] = useState(false);
  const [cycleDrawer, setCycleDrawer] = useState<"start" | "replant" | null>(null);
  const [activityOpen, setActivityOpen] = useState(false);
  const [planOpen, setPlanOpen] = useState(false);
  const [captureOpen, setCaptureOpen] = useState(false);

  const openCycle = useMemo(() => cycles.find((c) => c.status !== "harvested" && c.status !== "ploughed_out") ?? null, [cycles]);
  const nextRatoonNumber = useMemo(() => cycles.reduce((max, c) => Math.max(max, c.ratoon_number), -1) + 1, [cycles]);

  const refresh = () => window.location.reload();

  const cycleColumns: DataTableColumn<CropCycleRow>[] = [
    { key: "cycle", header: "Cycle", render: (c) => (c.ratoon_number === 0 ? "Plant crop" : `Ratoon ${c.ratoon_number}`) },
    { key: "status", header: "Status", render: (c) => <Badge variant={CYCLE_STATUS_VARIANT[c.status]}>{c.status.replace(/_/g, " ")}</Badge> },
    { key: "planted", header: "Planted", render: (c) => formatDate(c.planted_date) },
    { key: "ploughed", header: "Ploughed out", render: (c) => (c.ploughed_out_date ? formatDate(c.ploughed_out_date) : "—") },
    { key: "yield", header: "Yield", align: "right", render: (c) => formatTonnes(c.yield_tonnes) },
    { key: "tha", header: "t/ha", align: "right", render: (c) => (c.area_hectares > 0 ? (c.yield_tonnes / c.area_hectares).toFixed(1) : "—") },
  ];

  const planColumns: DataTableColumn<HarvestPlanRow>[] = [
    { key: "status", header: "Status", render: (p) => <Badge variant={PLAN_STATUS_VARIANT[p.status]}>{p.status.replace(/_/g, " ")}</Badge> },
    { key: "cutting", header: "Cutting date", render: (p) => (p.cutting_date_planned ? formatDate(p.cutting_date_planned) : "—") },
    { key: "contractor", header: "Contractor", render: (p) => p.cutting_contractor || "—" },
    { key: "burn", header: "Burn date", render: (p) => (p.burn_date ? formatDate(p.burn_date) : "—") },
    { key: "permit", header: "Burn permit", render: (p) => p.burn_permit_ref || "—" },
  ];

  const captureColumns: DataTableColumn<HarvestCaptureRow>[] = [
    { key: "date", header: "Date", render: (c) => formatDate(c.capture_date) },
    { key: "tonnes", header: "Tonnes cut", align: "right", render: (c) => formatTonnes(c.tonnes_cut) },
    { key: "team", header: "Cutter team", render: (c) => c.cutter_team || "—" },
    { key: "stock", header: "Field-edge stock", align: "right", render: (c) => formatTonnes(c.field_edge_stock_tonnes) },
  ];

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title={field.code}
        backHref="/fields"
        subtitle={
          <div className="flex items-center gap-2">
            <Badge variant="brand">{field.hectares.toFixed(1)} ha</Badge>
            {field.variety && <Badge variant="neutral">{field.variety}</Badge>}
            <Badge variant="info">{field.irrigation_type}</Badge>
          </div>
        }
        actions={
          canManage ? (
            <>
              <Button variant="secondary" onClick={() => setEditOpen(true)}>
                Edit field
              </Button>
              {openCycle ? (
                <Button onClick={() => setCycleDrawer("replant")}>Plough out & replant</Button>
              ) : (
                <Button onClick={() => setCycleDrawer("start")}>Start crop cycle</Button>
              )}
            </>
          ) : undefined
        }
      />

      <Tabs
        items={[
          { value: "overview", label: "Overview" },
          { value: "cycles", label: "Crop cycles", badge: cycles.length },
          { value: "activities", label: "Activities", badge: activities.length },
          { value: "harvests", label: "Harvests" },
          { value: "photos", label: "Photos", badge: photos.length },
        ]}
        value={activeTab}
        onChange={setActiveTab}
      />
      <div>
        {activeTab === "overview" && (
              <div className="flex flex-col gap-6">
                <DescriptionList
                  items={[
                    { label: "Field code", value: field.code },
                    { label: "Hectares", value: field.hectares.toFixed(2) },
                    { label: "Variety", value: field.variety || "—" },
                    { label: "Irrigation", value: field.irrigation_type },
                    { label: "Plot owner", value: memberName || "Unallocated / association land" },
                    { label: "Status", value: field.status },
                    { label: "GPS", value: field.gps_lat && field.gps_lng ? `${field.gps_lat}, ${field.gps_lng}` : "—" },
                    { label: "Soil notes", value: field.soil_notes || "—" },
                  ]}
                />

                {openCycle ? (
                  <div className="rounded-card border border-paper-200 bg-paper-0 p-5 shadow-card">
                    <h3 className="font-display text-[18px] font-semibold text-ink-900">
                      {openCycle.ratoon_number === 0 ? "Plant crop" : `Ratoon ${openCycle.ratoon_number}`} — {openCycle.status.replace(/_/g, " ")}
                    </h3>
                    <div className="mt-3 grid grid-cols-2 gap-4 sm:grid-cols-4">
                      <div>
                        <p className="text-[11px] font-medium uppercase tracking-wide text-ink-400">Planted</p>
                        <p className="text-sm text-ink-900">{formatDate(openCycle.planted_date)}</p>
                      </div>
                      <div>
                        <p className="text-[11px] font-medium uppercase tracking-wide text-ink-400">Days growing</p>
                        <p className="text-sm text-ink-900">{daysSince(openCycle.planted_date)}</p>
                      </div>
                      <div>
                        <p className="text-[11px] font-medium uppercase tracking-wide text-ink-400">Yield so far</p>
                        <p className="text-sm text-ink-900">{formatTonnes(openCycle.yield_tonnes)}</p>
                      </div>
                      <div>
                        <p className="text-[11px] font-medium uppercase tracking-wide text-ink-400">t / ha</p>
                        <p className="text-sm text-ink-900">{openCycle.area_hectares > 0 ? (openCycle.yield_tonnes / openCycle.area_hectares).toFixed(1) : "—"}</p>
                      </div>
                    </div>
                  </div>
                ) : (
                  <EmptyState
                    title="No open crop cycle"
                    body={canManage ? "Start a plant crop or ratoon cycle to begin tracking activities and harvests." : "This field has no crop cycle in progress."}
                  />
                )}
              </div>
            )}

            {activeTab === "cycles" && (
              <DataTable
                columns={cycleColumns}
                data={[...cycles].sort((a, b) => b.ratoon_number - a.ratoon_number)}
                rowKey={(c) => c.id}
                emptyTitle="No crop cycles yet"
                emptyBody="Start a crop cycle from the Overview tab to begin ratoon history."
              />
            )}

            {activeTab === "activities" && (
              <div className="flex flex-col gap-4">
                {canManage && (
                  <div className="flex justify-end">
                    <Button icon={<TbPlus />} onClick={() => setActivityOpen(true)}>
                      Log activity
                    </Button>
                  </div>
                )}
                {activities.length === 0 ? (
                  <EmptyState title="No activities logged" body="Land prep, fertilizer, chemicals and irrigation events will show up here." />
                ) : (
                  <Timeline
                    items={activities.map((a) => ({
                      icon: ACTIVITY_ICON[a.activity_type],
                      title: `${ACTIVITY_LABEL[a.activity_type]}${a.product ? ` — ${a.product}` : ""}`,
                      meta: formatDate(a.activity_date),
                      description: [
                        a.rate ? `${a.rate} ${a.rate_unit ?? ""}`.trim() : null,
                        a.cost ? formatMoney(a.cost, { withPrefix: true }) : null,
                        a.notes,
                      ]
                        .filter(Boolean)
                        .join(" · ") || undefined,
                    }))}
                  />
                )}
              </div>
            )}

            {activeTab === "harvests" && (
              <div className="flex flex-col gap-8">
                <div className="flex flex-col gap-3">
                  <div className="flex items-center justify-between">
                    <h3 className="font-display text-[18px] font-semibold text-ink-900">Harvest planning</h3>
                    {canManage && openCycle && (
                      <Button size="sm" icon={<TbPlus />} onClick={() => setPlanOpen(true)}>
                        Plan harvest
                      </Button>
                    )}
                  </div>
                  <DataTable columns={planColumns} data={harvestPlans} rowKey={(p) => p.id} emptyTitle="No harvest planned" emptyBody="Schedule a cutting date, burn permit and contractor." />
                </div>

                <div className="flex flex-col gap-3">
                  <div className="flex items-center justify-between">
                    <h3 className="font-display text-[18px] font-semibold text-ink-900">Daily harvest capture</h3>
                    {canManage && openCycle && (
                      <Button
                        size="sm"
                        icon={<TbPlus />}
                        onClick={() => setCaptureOpen(true)}
                      >
                        Capture harvest
                      </Button>
                    )}
                  </div>
                  <DataTable columns={captureColumns} data={harvestCaptures} rowKey={(c) => c.id} emptyTitle="No harvest captured yet" emptyBody="Daily tonnes cut, cutter teams and field-edge stock will show here." />
                </div>
              </div>
            )}

            {activeTab === "photos" && <FieldPhotosTab tenantId={tenantId} fieldId={field.id} initialPhotos={photos} canManage={canManage} />}
      </div>

      {canManage && (
        <>
          <FieldFormDrawer tenantId={tenantId} open={editOpen} onOpenChange={setEditOpen} field={field} members={members} onSaved={refresh} />
          {cycleDrawer === "start" && (
            <CropCycleDrawer mode="start" fieldId={field.id} nextRatoonNumber={nextRatoonNumber} open onOpenChange={(v) => !v && setCycleDrawer(null)} onSaved={refresh} />
          )}
          {cycleDrawer === "replant" && openCycle && (
            <CropCycleDrawer mode="replant" cropCycleId={openCycle.id} open onOpenChange={(v) => !v && setCycleDrawer(null)} onSaved={refresh} />
          )}
          <FieldActivityDrawer tenantId={tenantId} fieldId={field.id} cropCycleId={openCycle?.id ?? null} open={activityOpen} onOpenChange={setActivityOpen} onSaved={refresh} />
          {openCycle && <HarvestPlanDrawer tenantId={tenantId} fieldId={field.id} cropCycleId={openCycle.id} open={planOpen} onOpenChange={setPlanOpen} onSaved={refresh} />}
          {openCycle && (
            <HarvestCaptureDrawer
              tenantId={tenantId}
              fieldId={field.id}
              cropCycleId={openCycle.id}
              harvestPlans={harvestPlans.filter((p) => p.status !== "completed" && p.status !== "cancelled").map((p) => ({ id: p.id, label: p.cutting_date_planned ? formatDate(p.cutting_date_planned) : p.id.slice(0, 8) }))}
              open={captureOpen}
              onOpenChange={setCaptureOpen}
              onSaved={refresh}
            />
          )}
        </>
      )}
    </div>
  );
}
