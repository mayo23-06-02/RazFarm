"use client";

import { useMemo, useState } from "react";
import { ChartCard } from "@/components/ui/ChartCard";
import { SucroseLine } from "@/components/charts/SucroseLine";
import { Select } from "@/components/ui/Select";
import { StatCard, KpiRow } from "@/components/ui/StatCard";
import { DataTable, type DataTableColumn } from "@/components/ui/DataTable";
import { formatDate } from "@/lib/formatDate";
import { formatTonnes, formatPercent } from "@/lib/formatMoney";
import type { Database } from "@/lib/database.types";

type DeliveryDetailRow = Database["public"]["Views"]["delivery_details"]["Row"];

export interface SucroseTrendsSectionProps {
  fields: { id: string; code: string }[];
  deliveries: DeliveryDetailRow[];
}

export function SucroseTrendsSection({ fields, deliveries }: SucroseTrendsSectionProps) {
  const [fieldId, setFieldId] = useState("");

  const filtered = useMemo(
    () => deliveries.filter((d) => d.sucrose_pct != null && (!fieldId || d.field_id === fieldId)).sort((a, b) => a.delivery_date.localeCompare(b.delivery_date)),
    [deliveries, fieldId]
  );

  const chartData = filtered.map((d) => ({ date: formatDate(d.delivery_date, { year: undefined }), tonnes: d.tonnes_accepted ?? 0, sucrose: d.sucrose_pct ?? 0 }));
  const avgSucrose = filtered.length > 0 ? filtered.reduce((s, d) => s + (d.sucrose_pct ?? 0), 0) / filtered.length : 0;
  const best = filtered.reduce((max, d) => Math.max(max, d.sucrose_pct ?? 0), 0);
  const worst = filtered.length > 0 ? filtered.reduce((min, d) => Math.min(min, d.sucrose_pct ?? 100), 100) : 0;

  const columns: DataTableColumn<DeliveryDetailRow>[] = [
    { key: "date", header: "Date", render: (d) => formatDate(d.delivery_date), sortable: true, sortValue: (d) => d.delivery_date },
    { key: "field", header: "Field", render: (d) => d.field_code },
    { key: "delivery_no", header: "Delivery no.", render: (d) => <span className="font-mono text-xs">{d.delivery_no}</span> },
    { key: "accepted", header: "Tonnes accepted", align: "right", render: (d) => formatTonnes(d.tonnes_accepted ?? 0) },
    { key: "sucrose", header: "Sucrose %", align: "right", render: (d) => formatPercent(d.sucrose_pct ?? 0) },
    { key: "rv", header: "RV / ERC", align: "right", render: (d) => (d.rv_value != null ? d.rv_value.toFixed(3) : "—") },
  ];

  return (
    <div className="flex flex-col gap-6">
      <div className="flex justify-end">
        <Select className="w-56" options={[{ value: "", label: "All fields" }, ...fields.map((f) => ({ value: f.id, label: f.code }))]} value={fieldId} onChange={setFieldId} />
      </div>

      <KpiRow>
        <StatCard label="Average sucrose" value={avgSucrose} formatValue={(v) => formatPercent(v)} />
        <StatCard label="Best result" value={best} formatValue={(v) => formatPercent(v)} />
        <StatCard label="Lowest result" value={worst} formatValue={(v) => formatPercent(v)} />
        <StatCard label="Results captured" value={filtered.length} formatValue={(v) => v.toFixed(0)} />
      </KpiRow>

      <ChartCard title="Sucrose % over time" empty={chartData.length === 0} emptyLabel="No mill results captured yet.">
        <SucroseLine data={chartData} xKey="date" tonnesKey="tonnes" sucroseKey="sucrose" />
      </ChartCard>

      <DataTable columns={columns} data={filtered} rowKey={(d) => d.id} sortable emptyTitle="No results yet" emptyBody="Sucrose results captured at the mill will appear here." />
    </div>
  );
}
