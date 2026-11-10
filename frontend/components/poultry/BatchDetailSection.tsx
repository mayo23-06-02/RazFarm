"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Badge, type BadgeVariant } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { DataTable, type DataTableColumn } from "@/components/ui/DataTable";
import { DescriptionList } from "@/components/ui/DescriptionList";
import { Drawer } from "@/components/ui/Drawer";
import { Input, FieldError } from "@/components/ui/Input";
import { FormRow } from "@/components/ui/FormRow";
import { Select } from "@/components/ui/Select";
import { MoneyInput } from "@/components/ui/MoneyInput";
import { KpiRow, StatCard } from "@/components/ui/StatCard";
import { useToast } from "@/components/ui/Toast";
import { createClient } from "@/lib/supabase/client";
import { formatDate } from "@/lib/formatDate";
import { formatMoney } from "@/lib/formatMoney";
import type { Database } from "@/lib/database.types";

type Summary = Database["public"]["Views"]["poultry_batch_summary"]["Row"];
type Log = Database["public"]["Tables"]["poultry_daily_logs"]["Row"];
type Sale = Database["public"]["Tables"]["poultry_sales"]["Row"];

function n(value: number | string | null | undefined) {
  return Number(value ?? 0);
}

const PHASE_BADGE: Record<string, BadgeVariant> = {
  brooding: "info",
  growing: "brand",
  selling: "warning",
  closed: "neutral",
};

function localISODate() {
  const d = new Date();
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
}

export function BatchDetailSection({
  batch,
  logs,
  sales,
  accounts,
  canManage,
}: {
  batch: Summary;
  logs: Log[];
  sales: Sale[];
  accounts: { id: string; code: string; name: string }[];
  canManage: boolean;
}) {
  const router = useRouter();
  const { addToast } = useToast();
  const alive = n(batch.birds_alive);
  const closed = batch.status === "closed";
  const [saleOpen, setSaleOpen] = useState(false);
  const [saleDate, setSaleDate] = useState(localISODate());
  const [birds, setBirds] = useState("");
  const [price, setPrice] = useState(100);
  const [buyer, setBuyer] = useState("");
  const [accountId, setAccountId] = useState(accounts.find((a) => a.code === "1010")?.id ?? accounts[0]?.id ?? "");
  const [writeOff, setWriteOff] = useState<string | null>(null);
  const writeOffValue = writeOff ?? String(alive);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const logColumns: DataTableColumn<Log>[] = [
    { key: "date", header: "Date", render: (l) => formatDate(l.log_date) },
    { key: "deaths", header: "Deaths", align: "right", render: (l) => l.mortality },
    { key: "culls", header: "Culls", align: "right", render: (l) => l.culls },
    { key: "feed", header: "Feed", align: "right", render: (l) => n(l.feed_quantity) },
    {
      key: "temp",
      header: "°C",
      render: (l) => (l.temp_min_c == null && l.temp_max_c == null ? "—" : `${l.temp_min_c ?? "—"}–${l.temp_max_c ?? "—"}`),
    },
  ];

  const saleColumns: DataTableColumn<Sale>[] = [
    { key: "date", header: "Date", render: (s) => formatDate(s.sale_date) },
    { key: "birds", header: "Birds", align: "right", render: (s) => s.birds },
    { key: "price", header: "Each", align: "right", render: (s) => formatMoney(n(s.unit_price), { withPrefix: true }) },
    { key: "total", header: "Total", align: "right", render: (s) => formatMoney(n(s.total_amount), { withPrefix: true }) },
    { key: "buyer", header: "Buyer", render: (s) => s.buyer_name || "Cash" },
  ];

  const recordSale = async () => {
    setError(null);
    setSaving(true);
    const supabase = createClient();
    const { error: rpcError } = await supabase.rpc("record_poultry_sale", {
      p_batch_id: batch.id,
      p_sale_date: saleDate,
      p_birds: Number(birds) || 0,
      p_unit_price: price,
      p_payment_account_id: accountId,
      p_buyer_name: buyer.trim() || null,
    });
    setSaving(false);
    if (rpcError) {
      setError(rpcError.message);
      return;
    }
    addToast({ variant: "field", message: "Sale recorded" });
    setSaleOpen(false);
    setBirds("");
    setWriteOff(null);
    router.refresh();
  };

  const closeBatch = async () => {
    setError(null);
    setSaving(true);
    const supabase = createClient();
    const { error: rpcError } = await supabase.rpc("close_poultry_batch", {
      p_batch_id: batch.id,
      p_birds_written_off: Number(writeOffValue),
      p_closed_on: localISODate(),
    });
    setSaving(false);
    if (rpcError) {
      setError(rpcError.message);
      return;
    }
    addToast({ variant: "field", message: "Batch closed" });
    router.refresh();
  };

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-center gap-2">
        <Badge variant={PHASE_BADGE[batch.phase] ?? "neutral"}>{batch.phase}</Badge>
        <span className="text-sm text-ink-500">
          Day {batch.age_days} of 42 · {batch.house_code}
          {batch.pen_code ? ` / pen ${batch.pen_code}` : ""}
          {batch.supplier_name ? ` · ${batch.supplier_name}` : ""}
        </span>
      </div>

      <KpiRow>
        <StatCard label="Alive" value={alive} />
        <StatCard label="Mortality" value={n(batch.mortality_pct)} formatValue={(v) => `${v.toFixed(1)}%`} />
        <StatCard label="Cost" value={n(batch.cost)} formatValue={(v) => formatMoney(v, { withPrefix: true })} />
        <StatCard label="Revenue" value={n(batch.revenue)} formatValue={(v) => formatMoney(v, { withPrefix: true })} />
      </KpiRow>
      <KpiRow>
        <StatCard
          label={closed ? "Profit" : "Running surplus"}
          value={n(batch.surplus)}
          formatValue={(v) => formatMoney(v, { withPrefix: true })}
        />
        <StatCard label="Cost per bird placed" value={n(batch.birds_placed) ? n(batch.cost) / n(batch.birds_placed) : 0} formatValue={(v) => formatMoney(v, { withPrefix: true })} />
        <StatCard label="Feed" value={n(batch.feed_kg)} formatValue={(v) => `${v.toFixed(0)} kg`} />
        <StatCard label="Sold" value={n(batch.birds_sold)} />
      </KpiRow>

      <Card title="This batch">
        <DescriptionList
          items={[
            { label: "Placed", value: formatDate(batch.placed_on) },
            { label: "Boxes", value: String(batch.chick_boxes) },
            { label: "Birds placed", value: String(batch.birds_placed) },
            { label: "Dead on arrival", value: String(batch.birds_doa) },
            { label: "Written off", value: String(batch.birds_written_off) },
            { label: "Chick cost", value: formatMoney(n(batch.chick_cost), { withPrefix: true }) },
          ]}
        />
      </Card>

      <div className="flex flex-wrap gap-2">
        {canManage && !closed && (
          <Button onClick={() => setSaleOpen(true)} disabled={alive <= 0}>
            Record a sale
          </Button>
        )}
        <Link href="/poultry/today" className="inline-flex h-10 items-center rounded-ctrl border border-paper-200 px-4 text-sm font-medium text-ink-700">
          Daily log
        </Link>
      </div>

      <Card title="Daily logs">
        <DataTable columns={logColumns} data={logs} rowKey={(l) => l.id} emptyTitle="No days logged" emptyBody="Deaths, culls and feed bags show up here." />
      </Card>
      <Card title="Sales">
        <DataTable columns={saleColumns} data={sales} rowKey={(s) => s.id} emptyTitle="No sales yet" emptyBody="Live birds sold for cash show up here." />
      </Card>

      {canManage && !closed && (
        <Card title="Close the batch">
          <div className="flex flex-col gap-3">
            <p className="text-sm text-ink-500">
              {alive === 0
                ? "Every bird is sold or already counted. Close the batch to lock the log."
                : `${alive} birds are still alive. Sell them, or type ${alive} to write them off.`}
            </p>
            <FormRow label="Birds to write off">
              <Input type="number" value={writeOffValue} onChange={(e) => setWriteOff(e.target.value)} />
            </FormRow>
            <Button variant="danger" onClick={closeBatch} loading={saving} disabled={Number(writeOffValue) !== alive}>
              Close batch
            </Button>
          </div>
        </Card>
      )}

      {error && <FieldError>{error}</FieldError>}

      <Drawer open={saleOpen} onOpenChange={setSaleOpen} title="Cash sale">
        <div className="flex flex-col gap-4">
          <p className="text-sm text-ink-500">{alive} birds still alive. Price defaults to E100. No VAT.</p>
          <FormRow label="Date" required>
            <Input type="date" value={saleDate} max={localISODate()} onChange={(e) => setSaleDate(e.target.value)} />
          </FormRow>
          <FormRow label="Birds" required>
            <Input type="number" min={1} value={birds} onChange={(e) => setBirds(e.target.value)} />
          </FormRow>
          <FormRow label="Price each">
            <MoneyInput value={price} onValueChange={setPrice} />
          </FormRow>
          <p className="text-sm font-medium tabular-nums text-ink-900">
            Total {formatMoney((Number(birds) || 0) * price, { withPrefix: true })}
          </p>
          <FormRow label="Buyer" hint="Optional. Cash at the gate can stay blank.">
            <Input value={buyer} onChange={(e) => setBuyer(e.target.value)} />
          </FormRow>
          <FormRow label="Paid into" required>
            <Select
              options={accounts.map((a) => ({ value: a.id, label: `${a.code} — ${a.name}` }))}
              value={accountId}
              onChange={setAccountId}
              placeholder="Cash or bank"
            />
          </FormRow>
          {error && <FieldError>{error}</FieldError>}
          <Button onClick={recordSale} loading={saving}>
            Save sale
          </Button>
        </div>
      </Drawer>
    </div>
  );
}
