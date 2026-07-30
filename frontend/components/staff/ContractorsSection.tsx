"use client";

import { useMemo, useState } from "react";
import { TbClipboardList, TbEdit, TbPlus, TbTruck, TbUsers } from "react-icons/tb";
import { Button, IconButton } from "@/components/ui/Button";
import { Badge, type BadgeVariant } from "@/components/ui/Badge";
import { DataTable, type DataTableColumn } from "@/components/ui/DataTable";
import { KpiRow, StatCard } from "@/components/ui/StatCard";
import { formatDate } from "@/lib/formatDate";
import { formatMoney } from "@/lib/formatMoney";
import { createClient } from "@/lib/supabase/client";
import { ContractorFormDrawer } from "./ContractorFormDrawer";
import { LogContractorJobDrawer } from "./LogContractorJobDrawer";
import type { ContractorJobStatus, ContractorServiceType, ContractorStatus, Database } from "@/lib/database.types";

type ContractorRow = Database["public"]["Views"]["contractors_directory"]["Row"];
type ContractorJobRow = Database["public"]["Tables"]["contractor_jobs"]["Row"];
type FieldRow = { id: string; code: string };

const STATUS_VARIANT: Record<ContractorStatus, BadgeVariant> = {
  active: "success",
  inactive: "neutral",
};

const SERVICE_TYPE_VARIANT: Record<ContractorServiceType, BadgeVariant> = {
  cutting: "brand",
  haulage: "info",
  spraying: "warning",
  other: "neutral",
};

const JOB_STATUS_VARIANT: Record<ContractorJobStatus, BadgeVariant> = {
  logged: "neutral",
  billed: "info",
  paid: "success",
};

export interface ContractorsSectionProps {
  tenantId: string;
  userId: string;
  initialContractors: ContractorRow[];
  initialJobs: ContractorJobRow[];
  fields: FieldRow[];
  canManage: boolean;
  canLogJob: boolean;
  canRevealBank: boolean;
}

export function ContractorsSection({
  tenantId,
  userId,
  initialContractors,
  initialJobs,
  fields,
  canManage,
  canLogJob,
  canRevealBank,
}: ContractorsSectionProps) {
  const [contractors, setContractors] = useState(initialContractors);
  const [jobs, setJobs] = useState(initialJobs);
  const [addOpen, setAddOpen] = useState(false);
  const [editing, setEditing] = useState<ContractorRow | null>(null);
  const [logJobFor, setLogJobFor] = useState<ContractorRow | "any" | null>(null);

  const refreshContractors = async () => {
    const supabase = createClient();
    const { data } = await supabase.from("contractors_directory").select("*").eq("tenant_id", tenantId).order("business_name", { ascending: true });
    setContractors(data ?? []);
  };

  const refreshJobs = async () => {
    const supabase = createClient();
    const { data } = await supabase.from("contractor_jobs").select("*").eq("tenant_id", tenantId).order("job_date", { ascending: false }).limit(100);
    setJobs(data ?? []);
  };

  const contractorNameById = useMemo(() => new Map(contractors.map((c) => [c.id, c.business_name])), [contractors]);
  const fieldCodeById = useMemo(() => new Map(fields.map((f) => [f.id, f.code])), [fields]);

  const active = contractors.filter((c) => c.status === "active");
  const unbilled = jobs.filter((j) => j.status !== "paid").reduce((sum, j) => sum + j.computed_amount, 0);
  const paid = jobs.filter((j) => j.status === "paid").reduce((sum, j) => sum + j.computed_amount, 0);

  const contractorColumns: DataTableColumn<ContractorRow>[] = [
    { key: "contractor_no", header: "Contractor no.", render: (c) => <span className="font-mono text-xs">{c.contractor_no}</span> },
    { key: "name", header: "Business / contact", render: (c) => (
      <span>
        <span className="block text-ink-900">{c.business_name}</span>
        {c.contact_name && <span className="block text-xs text-ink-400">{c.contact_name}</span>}
      </span>
    ), sortable: true, sortValue: (c) => c.business_name },
    { key: "service_type", header: "Service", render: (c) => <Badge variant={SERVICE_TYPE_VARIANT[c.service_type]}>{c.service_type}</Badge> },
    { key: "rate", header: "Rate", align: "right", render: (c) => `${formatMoney(c.rate_amount, { withPrefix: true })} ${c.rate_basis.replace(/_/g, " ")}` },
    { key: "status", header: "Status", render: (c) => <Badge variant={STATUS_VARIANT[c.status]}>{c.status}</Badge> },
    {
      key: "actions",
      header: "",
      width: "88px",
      render: (c) => (
        <div className="flex items-center justify-end gap-1">
          {canLogJob && c.status === "active" && (
            <IconButton label="Log job" icon={<TbTruck />} size="sm" onClick={() => setLogJobFor(c)} />
          )}
          {canManage && <IconButton label="Edit contractor" icon={<TbEdit />} size="sm" onClick={() => setEditing(c)} />}
        </div>
      ),
    },
  ];

  const jobColumns: DataTableColumn<ContractorJobRow>[] = [
    { key: "date", header: "Date", render: (j) => formatDate(j.job_date) },
    { key: "contractor", header: "Contractor", render: (j) => contractorNameById.get(j.contractor_id) ?? "—" },
    { key: "field", header: "Field", render: (j) => (j.field_id ? (fieldCodeById.get(j.field_id) ?? "—") : "—") },
    { key: "service_type", header: "Service", render: (j) => <Badge variant={SERVICE_TYPE_VARIANT[j.service_type]}>{j.service_type}</Badge> },
    { key: "quantity", header: "Quantity", align: "right", render: (j) => j.quantity.toLocaleString("en-SZ") },
    {
      key: "amount",
      header: "Amount",
      align: "right",
      render: (j) => (
        <span>
          {formatMoney(j.computed_amount, { withPrefix: true })}
          {j.is_override && <span className="ml-1 text-xs text-harvest-500">(override)</span>}
        </span>
      ),
    },
    { key: "status", header: "Status", render: (j) => <Badge variant={JOB_STATUS_VARIANT[j.status]}>{j.status}</Badge> },
  ];

  return (
    <div className="flex flex-col gap-6">
      <KpiRow>
        <StatCard label="Active contractors" value={active.length} icon={<TbUsers />} />
        <StatCard label="Jobs logged this season" value={jobs.length} icon={<TbClipboardList />} />
        <StatCard label="Amount owed (unbilled)" value={unbilled} formatValue={(v) => formatMoney(v, { withPrefix: true })} />
        <StatCard label="Amount paid this season" value={paid} formatValue={(v) => formatMoney(v, { withPrefix: true })} />
      </KpiRow>

      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-[20px] font-semibold text-ink-900">Contractors</h2>
          <div className="flex items-center gap-2">
            {canLogJob && (
              <Button variant="secondary" icon={<TbTruck />} onClick={() => setLogJobFor("any")}>
                Log job
              </Button>
            )}
            {canManage && (
              <Button icon={<TbPlus />} onClick={() => setAddOpen(true)}>
                Add contractor
              </Button>
            )}
          </div>
        </div>

        <DataTable
          columns={contractorColumns}
          data={contractors}
          rowKey={(c) => c.id}
          emptyTitle="No contractors yet"
          emptyBody={canManage ? "Add cutting, haulage or spraying contractors to start logging jobs." : "No contractors have been added yet."}
        />
      </div>

      <div className="flex flex-col gap-3">
        <h2 className="font-display text-[20px] font-semibold text-ink-900">Recent jobs</h2>
        <DataTable
          columns={jobColumns}
          data={jobs}
          rowKey={(j) => j.id}
          emptyTitle="No jobs logged yet"
          emptyBody={canLogJob ? "Log a contractor job to start building this season's cutting/haulage totals." : "No contractor jobs have been logged yet."}
        />
      </div>

      {canManage && (
        <>
          <ContractorFormDrawer tenantId={tenantId} open={addOpen} onOpenChange={setAddOpen} canRevealBank={canRevealBank} onSaved={refreshContractors} />
          <ContractorFormDrawer
            tenantId={tenantId}
            open={!!editing}
            onOpenChange={(v) => !v && setEditing(null)}
            contractor={editing}
            canRevealBank={canRevealBank}
            onSaved={refreshContractors}
          />
        </>
      )}

      {canLogJob && (
        <LogContractorJobDrawer
          tenantId={tenantId}
          userId={userId}
          open={!!logJobFor}
          onOpenChange={(v) => !v && setLogJobFor(null)}
          presetContractorId={logJobFor && logJobFor !== "any" ? logJobFor.id : undefined}
          onSaved={refreshJobs}
        />
      )}
    </div>
  );
}
