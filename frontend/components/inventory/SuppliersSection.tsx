"use client";

import { useState } from "react";
import { TbEdit, TbPlus } from "react-icons/tb";
import { Button, IconButton } from "@/components/ui/Button";
import { DataTable, type DataTableColumn } from "@/components/ui/DataTable";
import { createClient } from "@/lib/supabase/client";
import { SupplierFormDrawer } from "./SupplierFormDrawer";
import type { Database } from "@/lib/database.types";

type SupplierRow = Database["public"]["Tables"]["suppliers"]["Row"];

export interface SuppliersSectionProps {
  tenantId: string;
  initialSuppliers: SupplierRow[];
  canManage: boolean;
}

export function SuppliersSection({ tenantId, initialSuppliers, canManage }: SuppliersSectionProps) {
  const [suppliers, setSuppliers] = useState(initialSuppliers);
  const [addOpen, setAddOpen] = useState(false);
  const [editing, setEditing] = useState<SupplierRow | null>(null);

  const refresh = async () => {
    const supabase = createClient();
    const { data } = await supabase.from("suppliers").select("*").eq("tenant_id", tenantId).order("name", { ascending: true });
    setSuppliers(data ?? []);
  };

  const columns: DataTableColumn<SupplierRow>[] = [
    { key: "name", header: "Name", render: (s) => s.name, sortable: true, sortValue: (s) => s.name },
    { key: "contact", header: "Contact", render: (s) => s.contact_name || "—" },
    { key: "phone", header: "Phone", render: (s) => s.phone || "—" },
    { key: "email", header: "Email", render: (s) => s.email || "—" },
    {
      key: "edit",
      header: "",
      width: "56px",
      render: (s) => (canManage ? <IconButton label="Edit supplier" icon={<TbEdit />} size="sm" onClick={() => setEditing(s)} /> : null),
    },
  ];

  return (
    <div className="flex flex-col gap-4">
      {canManage && (
        <div className="flex justify-end">
          <Button icon={<TbPlus />} onClick={() => setAddOpen(true)}>
            Add supplier
          </Button>
        </div>
      )}

      <DataTable
        columns={columns}
        data={suppliers}
        rowKey={(s) => s.id}
        emptyTitle="No suppliers yet"
        emptyBody={canManage ? "Add suppliers you buy fertilizer, chemicals or seed cane from." : "No suppliers have been added yet."}
      />

      {canManage && (
        <>
          <SupplierFormDrawer tenantId={tenantId} open={addOpen} onOpenChange={setAddOpen} onSaved={refresh} />
          <SupplierFormDrawer tenantId={tenantId} open={!!editing} onOpenChange={(v) => !v && setEditing(null)} supplier={editing} onSaved={refresh} />
        </>
      )}
    </div>
  );
}
