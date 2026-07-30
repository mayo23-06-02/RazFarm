"use client";

import { useMemo, useState } from "react";
import { TbPlus } from "react-icons/tb";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { FieldCard } from "@/components/app/FieldCard";
import { createClient } from "@/lib/supabase/client";
import { FieldFormDrawer } from "./FieldFormDrawer";
import type { Database } from "@/lib/database.types";

type FieldRow = Database["public"]["Tables"]["fields"]["Row"];
type CropCycleYieldRow = Database["public"]["Views"]["crop_cycle_yields"]["Row"];

export interface FieldsSectionProps {
  tenantId: string;
  initialFields: FieldRow[];
  cycles: CropCycleYieldRow[];
  members: { id: string; full_name: string }[];
  canManage: boolean;
}

export function FieldsSection({ tenantId, initialFields, cycles, members, canManage }: FieldsSectionProps) {
  const [fields, setFields] = useState(initialFields);
  const [addOpen, setAddOpen] = useState(false);

  const refresh = async () => {
    const supabase = createClient();
    const { data } = await supabase.from("fields").select("*").eq("tenant_id", tenantId).order("code", { ascending: true });
    setFields(data ?? []);
  };

  const cyclesByField = useMemo(() => {
    const map = new Map<string, CropCycleYieldRow[]>();
    for (const c of cycles) {
      const list = map.get(c.field_id) ?? [];
      list.push(c);
      map.set(c.field_id, list);
    }
    for (const list of map.values()) list.sort((a, b) => a.ratoon_number - b.ratoon_number);
    return map;
  }, [cycles]);

  if (fields.length === 0) {
    return (
      <div className="flex flex-col gap-4">
        {canManage && (
          <div className="flex justify-end">
            <Button icon={<TbPlus />} onClick={() => setAddOpen(true)}>
              Add field
            </Button>
          </div>
        )}
        <EmptyState
          title="No fields registered yet"
          body={canManage ? "Add your first field to start tracking crop cycles and harvests." : "Fields will appear here once registered."}
        />
        {canManage && <FieldFormDrawer tenantId={tenantId} open={addOpen} onOpenChange={setAddOpen} members={members} onSaved={refresh} />}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {canManage && (
        <div className="flex justify-end">
          <Button icon={<TbPlus />} onClick={() => setAddOpen(true)}>
            Add field
          </Button>
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {fields.map((field) => {
          const fieldCycles = cyclesByField.get(field.id) ?? [];
          const openCycle = fieldCycles.find((c) => c.status !== "harvested" && c.status !== "ploughed_out");
          const latestCycle = openCycle ?? fieldCycles[fieldCycles.length - 1];
          const spark = fieldCycles
            .filter((c) => c.tonnes_per_ha != null)
            .slice(-6)
            .map((c) => ({ season: c.ratoon_number === 0 ? "Plant" : `R${c.ratoon_number}`, yield: c.tonnes_per_ha ?? 0 }));

          return (
            <FieldCard
              key={field.id}
              href={`/fields/${field.id}`}
              code={field.code}
              hectares={field.hectares}
              variety={field.variety ?? ""}
              ratoon={latestCycle?.ratoon_number ?? 0}
              status={field.status}
              spark={spark}
            />
          );
        })}
      </div>

      {canManage && <FieldFormDrawer tenantId={tenantId} open={addOpen} onOpenChange={setAddOpen} members={members} onSaved={refresh} />}
    </div>
  );
}
