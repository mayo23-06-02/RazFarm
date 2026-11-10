"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { TbPlus } from "react-icons/tb";
import { Badge, type BadgeVariant } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { DataTable, type DataTableColumn } from "@/components/ui/DataTable";
import { Drawer } from "@/components/ui/Drawer";
import { Input, FieldError } from "@/components/ui/Input";
import { FormRow } from "@/components/ui/FormRow";
import { Select } from "@/components/ui/Select";
import { MoneyInput } from "@/components/ui/MoneyInput";
import { KpiRow, StatCard } from "@/components/ui/StatCard";
import { EmptyState } from "@/components/ui/EmptyState";
import { useToast } from "@/components/ui/Toast";
import { createClient } from "@/lib/supabase/client";
import { formatMoney } from "@/lib/formatMoney";
import type { Database } from "@/lib/database.types";

type Summary = Database["public"]["Views"]["poultry_batch_summary"]["Row"];
type Task = Database["public"]["Tables"]["poultry_batch_tasks"]["Row"];
type House = Database["public"]["Tables"]["poultry_houses"]["Row"];
type Pen = Database["public"]["Tables"]["poultry_pens"]["Row"];

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

export function FlockSection({
  batches,
  houses,
  pens,
  suppliers,
  accounts,
  birdCap,
  tasks,
  canManage,
}: {
  batches: Summary[];
  houses: House[];
  pens: Pen[];
  suppliers: { id: string; name: string }[];
  accounts: { id: string; code: string; name: string }[];
  birdCap: number;
  tasks: Task[];
  canManage: boolean;
}) {
  const router = useRouter();
  const { addToast } = useToast();
  const [open, setOpen] = useState(false);
  const [placedOn, setPlacedOn] = useState(localISODate());
  const [boxes, setBoxes] = useState("2");
  const [birds, setBirds] = useState("200");
  const [birdsTouched, setBirdsTouched] = useState(false);
  const [doa, setDoa] = useState("0");
  const [supplierId, setSupplierId] = useState("");
  const [houseId, setHouseId] = useState(houses.find((h) => h.status === "active")?.id ?? "");
  const [penId, setPenId] = useState("");
  const [chickCost, setChickCost] = useState(0);
  const [paymentAccountId, setPaymentAccountId] = useState(accounts.find((a) => a.code === "1010")?.id ?? accounts[0]?.id ?? "");
  const [breed, setBreed] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const active = batches.filter((b) => b.status === "active");
  const onFarm = active.reduce((sum, b) => sum + n(b.birds_alive), 0);
  const today = localISODate();
  const overdue = tasks.filter((t) => t.status === "pending" && t.due_on <= today);
  const highMortality = active.filter((b) => n(b.mortality_pct) >= 5);
  const housePens = pens.filter((p) => p.house_id === houseId);

  const columns: DataTableColumn<Summary>[] = [
    {
      key: "batch",
      header: "Batch",
      render: (b) => (
        <Link href={`/poultry/batches/${b.id}`} className="font-medium text-brand-700">
          {b.batch_no}
        </Link>
      ),
    },
    { key: "age", header: "Age", render: (b) => `Day ${b.age_days}` },
    {
      key: "phase",
      header: "Phase",
      render: (b) => <Badge variant={PHASE_BADGE[b.phase] ?? "neutral"}>{b.phase}</Badge>,
    },
    { key: "where", header: "Where", render: (b) => `${b.house_code}${b.pen_code ? ` / ${b.pen_code}` : ""}` },
    { key: "alive", header: "Alive", align: "right", render: (b) => n(b.birds_alive).toLocaleString("en-SZ") },
    { key: "mort", header: "Mortality", align: "right", render: (b) => `${n(b.mortality_pct).toFixed(1)}%` },
    { key: "cost", header: "Cost", align: "right", render: (b) => formatMoney(n(b.cost), { withPrefix: true }) },
    { key: "rev", header: "Revenue", align: "right", render: (b) => formatMoney(n(b.revenue), { withPrefix: true }) },
    {
      key: "surplus",
      header: bStatus(batches),
      align: "right",
      render: (b) => formatMoney(n(b.surplus), { withPrefix: true }),
    },
  ];

  const place = async () => {
    setError(null);
    if (!houseId) {
      setError("Add a house first");
      return;
    }
    if (chickCost > 0 && !paymentAccountId) {
      setError("Choose the account the chicks were paid from");
      return;
    }
    setSaving(true);
    const supabase = createClient();
    const { error: rpcError } = await supabase.rpc("place_poultry_batch", {
      p_house_id: houseId,
      p_placed_on: placedOn,
      p_chick_boxes: Number(boxes) || 0,
      p_birds_placed: Number(birds) || 0,
      p_birds_doa: Number(doa) || 0,
      p_supplier_id: supplierId || null,
      p_chick_cost: chickCost,
      p_payment_account_id: paymentAccountId || null,
      p_pen_id: penId || null,
      p_breed: breed.trim() || null,
    });
    setSaving(false);
    if (rpcError) {
      setError(rpcError.message);
      return;
    }
    addToast({ variant: "field", message: "Batch placed" });
    setOpen(false);
    router.refresh();
  };

  return (
    <div className="flex flex-col gap-5">
      <KpiRow>
        <StatCard label="Birds on farm" value={onFarm} info={`Cap ${birdCap}`} />
        <StatCard label="Active batches" value={active.length} />
        <StatCard
          label="Mortality"
          value={active.reduce((s, b) => s + n(b.birds_dead), 0)}
          info="Deaths, culls and dead on arrival across active batches"
        />
        <StatCard
          label="Running surplus"
          value={active.reduce((s, b) => s + n(b.surplus), 0)}
          formatValue={(v) => formatMoney(v, { withPrefix: true })}
          info="Sales minus chicks, feed and any cost added on the batch."
        />
      </KpiRow>

      {overdue.length > 0 && (
        <p className="rounded-ctrl bg-danger-50 px-3 py-2 text-sm text-danger-600">
          {overdue.length} vaccination{overdue.length === 1 ? "" : "s"} due or overdue. Open the batch or Today to mark them done.
        </p>
      )}
      {highMortality.length > 0 && (
        <p className="rounded-ctrl bg-harvest-50 px-3 py-2 text-sm text-harvest-500">
          Mortality is 5% or more on {highMortality.map((b) => b.batch_no).join(", ")}.
        </p>
      )}

      {canManage && (
        <div className="flex justify-end">
          <Button icon={<TbPlus />} onClick={() => setOpen(true)} disabled={houses.length === 0}>
            Place a batch
          </Button>
        </div>
      )}

      {houses.length === 0 ? (
        <EmptyState
          title="Add a house first"
          body="The flock needs a house before chicks can be placed."
          action={
            <Link href="/poultry/houses" className="text-sm font-medium text-brand-600">
              Set up houses
            </Link>
          }
        />
      ) : (
        <DataTable
          columns={columns}
          data={batches}
          rowKey={(b) => b.id}
          onRowClick={(b) => router.push(`/poultry/batches/${b.id}`)}
          emptyTitle="No batches yet"
          emptyBody="Place the next box of day-old chicks to start a 6-week cycle."
        />
      )}

      <Drawer open={open} onOpenChange={setOpen} title="Place a batch">
        <div className="flex flex-col gap-4">
          <p className="text-sm text-ink-500">
            {onFarm} birds on the farm now. Cap is {birdCap}.
          </p>
          <FormRow label="Placed on" required>
            <Input type="date" value={placedOn} onChange={(e) => setPlacedOn(e.target.value)} />
          </FormRow>
          <FormRow label="Boxes of 100" required>
            <Input
              type="number"
              min={0}
              value={boxes}
              onChange={(e) => {
                setBoxes(e.target.value);
                if (!birdsTouched) setBirds(String((Number(e.target.value) || 0) * 100));
              }}
            />
          </FormRow>
          <FormRow label="Birds placed" required hint="Starts at boxes × 100. Change it if the count differs.">
            <Input
              type="number"
              min={1}
              value={birds}
              onChange={(e) => {
                setBirdsTouched(true);
                setBirds(e.target.value);
              }}
            />
          </FormRow>
          <FormRow label="Dead on arrival">
            <Input type="number" min={0} value={doa} onChange={(e) => setDoa(e.target.value)} />
          </FormRow>
          <FormRow label="Hatchery" hint="Add suppliers under Inventory if the list is empty.">
            <Select
              options={[{ value: "", label: "None" }, ...suppliers.map((s) => ({ value: s.id, label: s.name }))]}
              value={supplierId}
              onChange={setSupplierId}
              placeholder="Hatchery"
            />
          </FormRow>
          <FormRow label="House" required>
            <Select
              options={houses.filter((h) => h.status === "active").map((h) => ({ value: h.id, label: `${h.code} · ${h.name}` }))}
              value={houseId}
              onChange={(v) => {
                setHouseId(v);
                setPenId("");
              }}
            />
          </FormRow>
          {housePens.length > 0 && (
            <FormRow label="Pen" hint="Leave empty while they are still in the brooder.">
              <Select
                options={[{ value: "", label: "Brooder / no pen" }, ...housePens.map((p) => ({ value: p.id, label: `${p.code} · ${p.name}` }))]}
                value={penId}
                onChange={setPenId}
              />
            </FormRow>
          )}
          <FormRow label="Chick cost">
            <MoneyInput value={chickCost} onValueChange={setChickCost} />
          </FormRow>
          <FormRow label="Paid from" hint="Cash or bank. Not required when the cost is zero.">
            <Select
              options={accounts.map((a) => ({ value: a.id, label: `${a.code} — ${a.name}` }))}
              value={paymentAccountId}
              onChange={setPaymentAccountId}
              placeholder="Choose an account"
            />
          </FormRow>
          <FormRow label="Breed">
            <Input value={breed} onChange={(e) => setBreed(e.target.value)} placeholder="Optional" />
          </FormRow>
          {error && <FieldError>{error}</FieldError>}
          <Button onClick={place} loading={saving}>
            Place batch
          </Button>
        </div>
      </Drawer>
    </div>
  );
}

function bStatus(batches: Summary[]) {
  return batches.some((b) => b.status === "active") ? "Surplus" : "Profit";
}
