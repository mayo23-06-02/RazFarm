"use client";

import { useEffect, useState } from "react";
import { Drawer } from "@/components/ui/Drawer";
import { Input, FieldError } from "@/components/ui/Input";
import { FormRow } from "@/components/ui/FormRow";
import { Select, Combobox } from "@/components/ui/Select";
import { DatePicker } from "@/components/ui/DatePicker";
import { Toggle } from "@/components/ui/Checkbox";
import { Button } from "@/components/ui/Button";
import { useToast } from "@/components/ui/Toast";
import { createClient } from "@/lib/supabase/client";
import type { Database, InventoryItemCategory, InventoryItemCondition } from "@/lib/database.types";

type ItemRow = Database["public"]["Tables"]["inventory_items"]["Row"];

const CATEGORY_OPTIONS = [
  { value: "fertilizer", label: "Fertilizer" },
  { value: "chemical", label: "Chemical" },
  { value: "seed_cane", label: "Seed cane" },
  { value: "equipment", label: "Equipment" },
  { value: "vehicle", label: "Vehicle" },
  { value: "plant_equipment", label: "Plant equipment" },
  { value: "other", label: "Other" },
];

const ASSET_CATEGORIES: InventoryItemCategory[] = ["equipment", "vehicle", "plant_equipment"];

const UNIT_OPTIONS = [
  { value: "kg", label: "kg" },
  { value: "L", label: "L" },
  { value: "bag", label: "bag" },
  { value: "each", label: "each" },
];

const CONDITION_OPTIONS = [
  { value: "excellent", label: "Excellent" },
  { value: "good", label: "Good" },
  { value: "fair", label: "Fair" },
  { value: "poor", label: "Poor" },
  { value: "out_of_service", label: "Out of service" },
];

export interface ItemFormDrawerProps {
  tenantId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  item?: ItemRow | null;
  suppliers: { id: string; name: string }[];
  onSaved: () => void;
}

export function ItemFormDrawer({ tenantId, open, onOpenChange, item, suppliers, onSaved }: ItemFormDrawerProps) {
  const { addToast } = useToast();
  const isEdit = !!item;
  const [sku, setSku] = useState("");
  const [name, setName] = useState("");
  const [category, setCategory] = useState<InventoryItemCategory>("other");
  const [unit, setUnit] = useState("each");
  const [reorderLevel, setReorderLevel] = useState("0");
  const [maxStockLevel, setMaxStockLevel] = useState("");
  const [preferredOrderQty, setPreferredOrderQty] = useState("");
  const [storageLocation, setStorageLocation] = useState("");
  const [defaultSupplierId, setDefaultSupplierId] = useState("");
  const [serialOrAssetNo, setSerialOrAssetNo] = useState("");
  const [purchaseDate, setPurchaseDate] = useState<Date | undefined>(undefined);
  const [condition, setCondition] = useState<InventoryItemCondition | "">("");
  const [isActive, setIsActive] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const isAsset = ASSET_CATEGORIES.includes(category);

  useEffect(() => {
    if (!open) return;
    setSku(item?.sku ?? "");
    setName(item?.name ?? "");
    setCategory(item?.category ?? "other");
    setUnit(item?.unit ?? "each");
    setReorderLevel(item ? String(item.reorder_level) : "0");
    setMaxStockLevel(item?.max_stock_level != null ? String(item.max_stock_level) : "");
    setPreferredOrderQty(item?.preferred_order_qty != null ? String(item.preferred_order_qty) : "");
    setStorageLocation(item?.storage_location ?? "");
    setDefaultSupplierId(item?.default_supplier_id ?? "");
    setSerialOrAssetNo(item?.serial_or_asset_no ?? "");
    setPurchaseDate(item?.purchase_date ? new Date(item.purchase_date) : undefined);
    setCondition(item?.condition ?? "");
    setIsActive(item?.is_active ?? true);
    setError(null);
  }, [open, item]);

  const submit = async () => {
    setError(null);
    if (!sku.trim() || !name.trim()) {
      setError("Enter both a SKU and a name");
      return;
    }
    setSaving(true);
    const supabase = createClient();
    const payload = {
      sku: sku.trim(),
      name: name.trim(),
      category,
      unit,
      reorder_level: Number(reorderLevel) || 0,
      max_stock_level: maxStockLevel.trim() ? Number(maxStockLevel) : null,
      preferred_order_qty: preferredOrderQty.trim() ? Number(preferredOrderQty) : null,
      storage_location: storageLocation.trim() || null,
      default_supplier_id: defaultSupplierId || null,
      serial_or_asset_no: serialOrAssetNo.trim() || null,
      purchase_date: purchaseDate ? purchaseDate.toISOString().slice(0, 10) : null,
      condition: condition || null,
      is_active: isActive,
    };

    const { error: saveError } = isEdit
      ? await supabase.from("inventory_items").update(payload).eq("id", item!.id)
      : await supabase.from("inventory_items").insert({ tenant_id: tenantId, ...payload });
    setSaving(false);

    if (saveError) {
      setError(saveError.message);
      return;
    }

    addToast({ variant: "field", message: isEdit ? "Item updated" : "Item added" });
    onOpenChange(false);
    onSaved();
  };

  return (
    <Drawer open={open} onOpenChange={onOpenChange} title={isEdit ? "Edit item" : "Add item"}>
      <div className="flex flex-col gap-5">
        <FormRow label="SKU" required hint="A short code you'll recognize, e.g. FERT-UREA-50">
          <Input value={sku} onChange={(e) => setSku(e.target.value)} className="font-mono" />
        </FormRow>
        <FormRow label="Name" required>
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Urea 46% (50kg bag)" />
        </FormRow>
        <FormRow label="Category" required>
          <Select options={CATEGORY_OPTIONS} value={category} onChange={(v) => setCategory(v as InventoryItemCategory)} />
        </FormRow>
        <FormRow label="Unit" required hint="What quantity is measured in">
          <Select options={UNIT_OPTIONS} value={unit} onChange={setUnit} />
        </FormRow>
        <FormRow label="Reorder level" hint="Get an alert when stock on hand falls to or below this">
          <Input type="number" step="0.01" value={reorderLevel} onChange={(e) => setReorderLevel(e.target.value)} />
        </FormRow>
        <FormRow label="Max stock level" hint="Optional — ceiling to avoid over-ordering">
          <Input type="number" step="0.01" value={maxStockLevel} onChange={(e) => setMaxStockLevel(e.target.value)} />
        </FormRow>
        <FormRow label="Preferred order quantity" hint="Optional — how much to reorder each time">
          <Input type="number" step="0.01" value={preferredOrderQty} onChange={(e) => setPreferredOrderQty(e.target.value)} />
        </FormRow>
        <FormRow label="Storage location" hint="Optional — which store, shed or field it's kept in">
          <Input value={storageLocation} onChange={(e) => setStorageLocation(e.target.value)} placeholder="e.g. Main store, Bay 3" />
        </FormRow>
        <FormRow label="Default supplier" hint="Optional — who you usually buy this from">
          <Combobox
            options={suppliers.map((s) => ({ value: s.id, label: s.name }))}
            value={defaultSupplierId}
            onChange={setDefaultSupplierId}
            placeholder="Choose a supplier…"
          />
        </FormRow>
        {isAsset && (
          <>
            <FormRow label="Serial / registration number" hint="Optional — engine serial, VIN, or plate number">
              <Input value={serialOrAssetNo} onChange={(e) => setSerialOrAssetNo(e.target.value)} />
            </FormRow>
            <FormRow label="Purchase date" hint="Optional">
              <DatePicker value={purchaseDate} onChange={setPurchaseDate} />
            </FormRow>
            <FormRow label="Condition" hint="Optional">
              <Select
                options={[{ value: "", label: "Not set" }, ...CONDITION_OPTIONS]}
                value={condition}
                onChange={(v) => setCondition(v as InventoryItemCondition | "")}
              />
            </FormRow>
          </>
        )}
        {isEdit && (
          <FormRow label="Status" hint="Inactive items are hidden from new stock movements but keep their history">
            <Toggle label={isActive ? "Active" : "Inactive"} checked={isActive} onChange={setIsActive} />
          </FormRow>
        )}
        {error && <FieldError>{error}</FieldError>}
        <div className="flex justify-end gap-2 pt-2">
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={submit} loading={saving}>
            {isEdit ? "Save changes" : "Add item"}
          </Button>
        </div>
      </div>
    </Drawer>
  );
}
