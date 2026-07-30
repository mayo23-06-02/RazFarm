"use client";

import { useState } from "react";
import { TbEdit, TbPlus, TbUserCheck, TbUsers } from "react-icons/tb";
import { Button, IconButton } from "@/components/ui/Button";
import { Badge, type BadgeVariant } from "@/components/ui/Badge";
import { DataTable, type DataTableColumn } from "@/components/ui/DataTable";
import { KpiRow, StatCard } from "@/components/ui/StatCard";
import { formatMoney } from "@/lib/formatMoney";
import { createClient } from "@/lib/supabase/client";
import { EmployeeFormDrawer } from "./EmployeeFormDrawer";
import type { Database, StaffEmploymentType, StaffStatus } from "@/lib/database.types";

type EmployeeRow = Database["public"]["Views"]["staff_employees_directory"]["Row"];

const STATUS_VARIANT: Record<StaffStatus, BadgeVariant> = {
  active: "success",
  suspended: "warning",
  terminated: "neutral",
};

const EMPLOYMENT_TYPE_VARIANT: Record<StaffEmploymentType, BadgeVariant> = {
  permanent: "brand",
  casual: "info",
};

export interface EmployeesSectionProps {
  tenantId: string;
  initialEmployees: EmployeeRow[];
  canManage: boolean;
  canRevealBank: boolean;
}

export function EmployeesSection({ tenantId, initialEmployees, canManage, canRevealBank }: EmployeesSectionProps) {
  const [employees, setEmployees] = useState(initialEmployees);
  const [addOpen, setAddOpen] = useState(false);
  const [editing, setEditing] = useState<EmployeeRow | null>(null);

  const refresh = async () => {
    const supabase = createClient();
    const { data } = await supabase.from("staff_employees_directory").select("*").eq("tenant_id", tenantId).order("full_name", { ascending: true });
    setEmployees(data ?? []);
  };

  const active = employees.filter((e) => e.status === "active");
  const permanent = active.filter((e) => e.employment_type === "permanent").length;
  const casual = active.filter((e) => e.employment_type === "casual").length;

  const columns: DataTableColumn<EmployeeRow>[] = [
    { key: "staff_no", header: "Staff no.", render: (e) => <span className="font-mono text-xs">{e.staff_no}</span> },
    { key: "name", header: "Name", render: (e) => e.full_name, sortable: true, sortValue: (e) => e.full_name },
    { key: "position", header: "Position", render: (e) => e.position },
    { key: "type", header: "Type", render: (e) => <Badge variant={EMPLOYMENT_TYPE_VARIANT[e.employment_type]}>{e.employment_type}</Badge> },
    {
      key: "pay_rate",
      header: "Pay rate",
      align: "right",
      render: (e) => (e.pay_rate != null ? formatMoney(e.pay_rate, { withPrefix: true }) : <span className="text-ink-400">Hidden</span>),
    },
    { key: "status", header: "Status", render: (e) => <Badge variant={STATUS_VARIANT[e.status]}>{e.status}</Badge> },
    {
      key: "edit",
      header: "",
      width: "56px",
      render: (e) => (canManage ? <IconButton label="Edit employee" icon={<TbEdit />} size="sm" onClick={() => setEditing(e)} /> : null),
    },
  ];

  return (
    <div className="flex flex-col gap-4">
      <KpiRow>
        <StatCard label="Active employees" value={active.length} icon={<TbUsers />} />
        <StatCard label="Permanent" value={permanent} icon={<TbUserCheck />} />
        <StatCard label="Casual" value={casual} />
        <StatCard label="Payroll run due in" value={0} formatValue={() => "Not set up"} info="Payroll module ships in a later module" />
      </KpiRow>

      {canManage && (
        <div className="flex justify-end">
          <Button icon={<TbPlus />} onClick={() => setAddOpen(true)}>
            Add employee
          </Button>
        </div>
      )}

      <DataTable
        columns={columns}
        data={employees}
        rowKey={(e) => e.id}
        emptyTitle="No employees yet"
        emptyBody={canManage ? "Add association staff — office admin, field workers, security — to start tracking payroll." : "No employees have been added yet."}
      />

      {canManage && (
        <>
          <EmployeeFormDrawer tenantId={tenantId} open={addOpen} onOpenChange={setAddOpen} canRevealBank={canRevealBank} onSaved={refresh} />
          <EmployeeFormDrawer
            tenantId={tenantId}
            open={!!editing}
            onOpenChange={(v) => !v && setEditing(null)}
            employee={editing}
            canRevealBank={canRevealBank}
            onSaved={refresh}
          />
        </>
      )}
    </div>
  );
}
