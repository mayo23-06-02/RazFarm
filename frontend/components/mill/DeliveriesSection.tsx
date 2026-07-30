"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { TbPlus } from "react-icons/tb";
import { Button } from "@/components/ui/Button";
import { Badge, type BadgeVariant } from "@/components/ui/Badge";
import { DataTable, type DataTableColumn } from "@/components/ui/DataTable";
import { Drawer } from "@/components/ui/Drawer";
import { FormRow } from "@/components/ui/FormRow";
import { Combobox } from "@/components/ui/Select";
import { DatePicker } from "@/components/ui/DatePicker";
import { Input, FieldError } from "@/components/ui/Input";
import { useToast } from "@/components/ui/Toast";
import { createClient } from "@/lib/supabase/client";
import { formatDate } from "@/lib/formatDate";
import { formatTonnes, formatPercent } from "@/lib/formatMoney";
import type { Database, DeliveryStatus, MillName } from "@/lib/database.types";

type DeliveryDetailRow = Database["public"]["Views"]["delivery_details"]["Row"];

const STATUS_VARIANT: Record<DeliveryStatus, BadgeVariant> = {
  dispatched: "info",
  result_captured: "warning",
  reconciled: "success",
};

export interface DeliveriesSectionProps {
  tenantId: string;
  initialDeliveries: DeliveryDetailRow[];
  fields: { id: string; code: string }[];
  fieldOpenCycles: Record<string, string>;
  tenantMill: MillName;
  canManage: boolean;
}

export function DeliveriesSection({ tenantId, initialDeliveries, fields, fieldOpenCycles, tenantMill, canManage }: DeliveriesSectionProps) {
  const router = useRouter();
  const { addToast } = useToast();
  const [deliveries] = useState(initialDeliveries);
  const [newOpen, setNewOpen] = useState(false);
  const [fieldId, setFieldId] = useState("");
  const [deliveryDate, setDeliveryDate] = useState<Date | undefined>(new Date());
  const [haulier, setHaulier] = useState("");
  const [vehicleReg, setVehicleReg] = useState("");
  const [tonnesLoaded, setTonnesLoaded] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

  const create = async () => {
    setError(null);
    if (!fieldId) {
      setError("Choose a field");
      return;
    }
    const tonnes = Number(tonnesLoaded);
    if (!tonnes || tonnes <= 0) {
      setError("Enter tonnes loaded");
      return;
    }
    if (!deliveryDate) {
      setError("Pick a delivery date");
      return;
    }

    setCreating(true);
    const supabase = createClient();
    const year = new Date().getFullYear();
    const { count } = await supabase
      .from("deliveries")
      .select("id", { count: "exact", head: true })
      .eq("tenant_id", tenantId)
      .like("delivery_no", `DEL-${year}-%`);
    const deliveryNo = `DEL-${year}-${(count ?? 0) + 1}`;

    const {
      data: { user },
    } = await supabase.auth.getUser();

    const { data, error: insertError } = await supabase
      .from("deliveries")
      .insert({
        tenant_id: tenantId,
        field_id: fieldId,
        crop_cycle_id: fieldOpenCycles[fieldId] ?? null,
        delivery_no: deliveryNo,
        delivery_date: deliveryDate.toISOString().slice(0, 10),
        haulier: haulier || null,
        vehicle_reg: vehicleReg || null,
        tonnes_loaded: tonnes,
        mill: tenantMill,
        created_by: user?.id,
      })
      .select()
      .single();
    setCreating(false);

    if (insertError || !data) {
      setError(insertError?.message ?? "Couldn't create delivery");
      return;
    }
    addToast({ variant: "field", message: "Delivery dispatched" });
    router.push(`/mill/deliveries/${data.id}`);
  };

  const columns: DataTableColumn<DeliveryDetailRow>[] = [
    { key: "delivery_no", header: "Delivery no.", render: (d) => <span className="font-mono text-xs">{d.delivery_no}</span> },
    { key: "field", header: "Field", render: (d) => d.field_code },
    { key: "date", header: "Date", render: (d) => formatDate(d.delivery_date), sortable: true, sortValue: (d) => d.delivery_date },
    { key: "haulier", header: "Haulier", render: (d) => d.haulier || "—" },
    { key: "loaded", header: "Loaded", align: "right", render: (d) => formatTonnes(d.tonnes_loaded) },
    { key: "accepted", header: "Accepted", align: "right", render: (d) => (d.tonnes_accepted != null ? formatTonnes(d.tonnes_accepted) : "—") },
    { key: "sucrose", header: "Sucrose", align: "right", render: (d) => (d.sucrose_pct != null ? formatPercent(d.sucrose_pct) : "—") },
    { key: "status", header: "Status", render: (d) => <Badge variant={STATUS_VARIANT[d.status]}>{d.status.replace(/_/g, " ")}</Badge> },
  ];

  return (
    <div className="flex flex-col gap-4">
      {canManage && (
        <Button icon={<TbPlus />} className="self-end" onClick={() => setNewOpen(true)}>
          New delivery
        </Button>
      )}

      <DataTable
        columns={columns}
        data={deliveries}
        rowKey={(d) => d.id}
        sortable
        onRowClick={(d) => router.push(`/mill/deliveries/${d.id}`)}
        emptyTitle="No deliveries yet"
        emptyBody="Consignment notes dispatched to the mill will appear here."
      />

      <Drawer open={newOpen} onOpenChange={setNewOpen} title="New delivery">
        <div className="flex flex-col gap-5">
          <FormRow label="Field" required>
            <Combobox options={fields.map((f) => ({ value: f.id, label: f.code }))} value={fieldId} onChange={setFieldId} placeholder="Choose a field…" />
          </FormRow>
          <FormRow label="Delivery date" required>
            <DatePicker value={deliveryDate} onChange={setDeliveryDate} />
          </FormRow>
          <FormRow label="Haulier">
            <Input value={haulier} onChange={(e) => setHaulier(e.target.value)} />
          </FormRow>
          <FormRow label="Vehicle registration">
            <Input value={vehicleReg} onChange={(e) => setVehicleReg(e.target.value)} />
          </FormRow>
          <FormRow label="Tonnes loaded" required>
            <Input type="number" step="0.01" value={tonnesLoaded} onChange={(e) => setTonnesLoaded(e.target.value)} />
          </FormRow>
          <FormRow label="Mill destination" hint={tenantMill}>
            <Input value={tenantMill} disabled />
          </FormRow>
          {error && <FieldError>{error}</FieldError>}
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="ghost" onClick={() => setNewOpen(false)}>
              Cancel
            </Button>
            <Button onClick={create} loading={creating}>
              Dispatch delivery
            </Button>
          </div>
        </div>
      </Drawer>
    </div>
  );
}
