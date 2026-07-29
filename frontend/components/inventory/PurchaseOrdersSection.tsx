"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { TbPlus, TbTrash } from "react-icons/tb";
import { Button } from "@/components/ui/Button";
import { Badge, type BadgeVariant } from "@/components/ui/Badge";
import { DataTable, type DataTableColumn } from "@/components/ui/DataTable";
import { Drawer } from "@/components/ui/Drawer";
import { FormRow } from "@/components/ui/FormRow";
import { Combobox } from "@/components/ui/Select";
import { DatePicker } from "@/components/ui/DatePicker";
import { Input, FieldError } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { useToast } from "@/components/ui/Toast";
import { createClient } from "@/lib/supabase/client";
import { formatDate } from "@/lib/formatDate";
import type { Database, PurchaseOrderStatus } from "@/lib/database.types";

type PurchaseOrderRow = Database["public"]["Tables"]["purchase_orders"]["Row"];

const STATUS_VARIANT: Record<PurchaseOrderStatus, BadgeVariant> = {
  draft: "neutral",
  issued: "info",
  received: "warning",
  billed: "success",
  cancelled: "danger",
};

export interface PurchaseOrdersSectionProps {
  tenantId: string;
  initialPurchaseOrders: PurchaseOrderRow[];
  suppliers: { id: string; name: string }[];
  canManage: boolean;
}

export function PurchaseOrdersSection({ tenantId, initialPurchaseOrders, suppliers, canManage }: PurchaseOrdersSectionProps) {
  const router = useRouter();
  const { addToast } = useToast();
  const [purchaseOrders, setPurchaseOrders] = useState(initialPurchaseOrders);
  const [newOpen, setNewOpen] = useState(false);
  const [supplierId, setSupplierId] = useState("");
  const [expectedDate, setExpectedDate] = useState<Date | undefined>(undefined);
  const [notes, setNotes] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<PurchaseOrderRow | null>(null);
  const [deleting, setDeleting] = useState(false);

  const supplierMap = new Map(suppliers.map((s) => [s.id, s.name]));

  const refresh = async () => {
    const supabase = createClient();
    const { data } = await supabase.from("purchase_orders").select("*").eq("tenant_id", tenantId).order("order_date", { ascending: false });
    setPurchaseOrders(data ?? []);
  };

  const createDraft = async () => {
    setError(null);
    if (!supplierId) {
      setError("Choose a supplier");
      return;
    }
    setCreating(true);
    const supabase = createClient();
    const year = new Date().getFullYear();
    const { count } = await supabase
      .from("purchase_orders")
      .select("id", { count: "exact", head: true })
      .eq("tenant_id", tenantId)
      .like("po_no", `PO-${year}-%`);
    const poNo = `PO-${year}-${(count ?? 0) + 1}`;

    const {
      data: { user },
    } = await supabase.auth.getUser();

    const { data, error: insertError } = await supabase
      .from("purchase_orders")
      .insert({
        tenant_id: tenantId,
        supplier_id: supplierId,
        po_no: poNo,
        expected_date: expectedDate ? expectedDate.toISOString().slice(0, 10) : null,
        notes: notes || null,
        created_by: user?.id,
      })
      .select()
      .single();
    setCreating(false);

    if (insertError || !data) {
      setError(insertError?.message ?? "Couldn't create purchase order");
      return;
    }
    router.push(`/inventory/purchase-orders/${data.id}`);
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    const supabase = createClient();
    const { error } = await supabase.from("purchase_orders").delete().eq("id", deleteTarget.id);
    setDeleting(false);
    if (error) {
      addToast({ variant: "danger", message: error.message });
      return;
    }
    addToast({ variant: "field", message: "Draft purchase order deleted" });
    setDeleteTarget(null);
    refresh();
  };

  const columns: DataTableColumn<PurchaseOrderRow>[] = [
    { key: "po_no", header: "PO no.", render: (po) => <span className="font-mono text-xs">{po.po_no}</span> },
    { key: "supplier", header: "Supplier", render: (po) => supplierMap.get(po.supplier_id) ?? "—" },
    { key: "date", header: "Order date", render: (po) => formatDate(po.order_date), sortable: true, sortValue: (po) => po.order_date },
    { key: "expected", header: "Expected", render: (po) => (po.expected_date ? formatDate(po.expected_date) : "—") },
    { key: "status", header: "Status", render: (po) => <Badge variant={STATUS_VARIANT[po.status]}>{po.status}</Badge> },
  ];

  return (
    <div className="flex flex-col gap-4">
      {canManage && (
        <Button icon={<TbPlus />} className="self-end" onClick={() => setNewOpen(true)}>
          New purchase order
        </Button>
      )}

      <DataTable
        columns={columns}
        data={purchaseOrders}
        rowKey={(po) => po.id}
        onRowClick={(po) => router.push(`/inventory/purchase-orders/${po.id}`)}
        emptyTitle="No purchase orders yet"
        emptyBody="Purchase orders you raise with suppliers will appear here."
        rowActions={
          canManage
            ? (po) => (po.status === "draft" ? [{ label: "Delete draft", icon: <TbTrash />, destructive: true, onSelect: () => setDeleteTarget(po) }] : [])
            : undefined
        }
      />

      <Drawer open={newOpen} onOpenChange={setNewOpen} title="New purchase order">
        <div className="flex flex-col gap-5">
          <FormRow label="Supplier" required>
            <Combobox options={suppliers.map((s) => ({ value: s.id, label: s.name }))} value={supplierId} onChange={setSupplierId} placeholder="Choose a supplier…" />
          </FormRow>
          <FormRow label="Expected delivery" hint="Optional">
            <DatePicker value={expectedDate} onChange={setExpectedDate} />
          </FormRow>
          <FormRow label="Notes" hint="Optional">
            <Input value={notes} onChange={(e) => setNotes(e.target.value)} />
          </FormRow>
          {error && <FieldError>{error}</FieldError>}
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="ghost" onClick={() => setNewOpen(false)}>
              Cancel
            </Button>
            <Button onClick={createDraft} loading={creating}>
              Create draft
            </Button>
          </div>
        </div>
      </Drawer>

      <Modal
        open={!!deleteTarget}
        onOpenChange={(v) => !v && setDeleteTarget(null)}
        title="Delete draft purchase order"
        footer={
          <>
            <Button variant="ghost" onClick={() => setDeleteTarget(null)}>
              Cancel
            </Button>
            <Button variant="danger" loading={deleting} onClick={confirmDelete}>
              Delete
            </Button>
          </>
        }
      >
        <p className="text-sm text-ink-700">
          Delete {deleteTarget?.po_no} and its lines? This can&apos;t be undone. Only draft purchase orders can be deleted — issued orders are permanent.
        </p>
      </Modal>
    </div>
  );
}
