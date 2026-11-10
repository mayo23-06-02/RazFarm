"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Input, FieldError } from "@/components/ui/Input";
import { FormRow } from "@/components/ui/FormRow";
import { Select } from "@/components/ui/Select";
import { NumberStepper } from "@/components/ui/NumberStepper";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { useToast } from "@/components/ui/Toast";
import { createClient } from "@/lib/supabase/client";
import { HealthTaskList } from "@/components/poultry/HealthTaskList";
import type { Database } from "@/lib/database.types";

type Summary = Database["public"]["Views"]["poultry_batch_summary"]["Row"];
type FeedItem = { id: string; name: string; unit: string; quantity_on_hand: number; unit_weight_kg: number | null };
type Task = Database["public"]["Tables"]["poultry_batch_tasks"]["Row"];
type Vaccine = { id: string; name: string; unit: string; quantity_on_hand: number };

function localISODate() {
  const d = new Date();
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
}

function n(value: number | string | null | undefined) {
  return Number(value ?? 0);
}

export function DailyLogSection({
  batches,
  feedItems,
  tasks,
  vaccines,
  canManage,
}: {
  batches: Summary[];
  feedItems: FeedItem[];
  tasks: Task[];
  vaccines: Vaccine[];
  canManage: boolean;
}) {
  const router = useRouter();
  const { addToast } = useToast();
  const active = batches.filter((b) => b.status === "active");
  const [batchId, setBatchId] = useState(active.length === 1 ? active[0].id : "");
  const [logDate, setLogDate] = useState(localISODate());
  const [deaths, setDeaths] = useState(0);
  const [culls, setCulls] = useState(0);
  const [bags, setBags] = useState(0);
  const [feedItemId, setFeedItemId] = useState(feedItems[0]?.id ?? "");
  const [tempMin, setTempMin] = useState("");
  const [tempMax, setTempMax] = useState("");
  const [issued, setIssued] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!batchId) return;
    let cancelled = false;
    const supabase = createClient();
    supabase
      .from("poultry_daily_logs")
      .select("mortality, culls, feed_quantity, feed_item_id, temp_min_c, temp_max_c")
      .eq("batch_id", batchId)
      .eq("log_date", logDate)
      .maybeSingle()
      .then(({ data }) => {
        if (cancelled) return;
        setDeaths(data?.mortality ?? 0);
        setCulls(data?.culls ?? 0);
        setBags(n(data?.feed_quantity));
        setIssued(n(data?.feed_quantity));
        if (data?.feed_item_id) setFeedItemId(data.feed_item_id);
        setTempMin(data?.temp_min_c != null ? String(data.temp_min_c) : "");
        setTempMax(data?.temp_max_c != null ? String(data.temp_max_c) : "");
      });
    return () => {
      cancelled = true;
    };
  }, [batchId, logDate]);

  const selected = active.find((b) => b.id === batchId);

  const save = async () => {
    setError(null);
    if (!batchId) {
      setError("Choose which batch this log is for");
      return;
    }
    if (bags > 0 && !feedItemId) {
      setError("Choose the feed");
      return;
    }
    setSaving(true);
    const supabase = createClient();
    const { error: rpcError } = await supabase.rpc("upsert_poultry_daily_log", {
      p_batch_id: batchId,
      p_log_date: logDate,
      p_mortality: deaths,
      p_culls: culls,
      p_feed_item_id: bags > 0 ? feedItemId : null,
      p_feed_quantity: bags,
      p_temp_min_c: tempMin.trim() ? Number(tempMin) : null,
      p_temp_max_c: tempMax.trim() ? Number(tempMax) : null,
    });
    setSaving(false);
    if (rpcError) {
      setError(rpcError.message);
      return;
    }
    addToast({ variant: "field", message: "Day saved" });
    setIssued(bags);
    router.refresh();
  };

  if (!canManage) {
    return (
      <div className="flex flex-col gap-4">
        <EmptyState title="View only" body="The farm owner or a supervisor records the daily log." />
        <Card title="Vaccinations">
          <HealthTaskList tasks={tasks} vaccines={vaccines} canManage={false} />
        </Card>
      </div>
    );
  }

  if (active.length === 0) {
    return (
      <EmptyState
        title="No active batch"
        body="Place a batch before logging the day."
        action={
          <Link href="/poultry" className="text-sm font-medium text-brand-600">
            Go to the flock
          </Link>
        }
      />
    );
  }

  return (
    <Card title="Today's log">
      <div className="flex flex-col gap-5">
        <FormRow label="Batch" required hint={active.length > 1 ? "Two flocks are on the farm. Pick the one you are standing in." : undefined}>
          <Select
            options={active.map((b) => ({ value: b.id, label: `${b.batch_no} · ${n(b.birds_alive)} alive · ${b.house_code}` }))}
            value={batchId}
            onChange={setBatchId}
            placeholder="Choose the batch"
          />
        </FormRow>
        <FormRow label="Date">
          <Input type="date" value={logDate} max={localISODate()} onChange={(e) => setLogDate(e.target.value)} />
        </FormRow>
        {selected && (
          <p className="text-sm text-ink-500">
            Day {selected.age_days} · {n(selected.birds_alive)} alive before this save
          </p>
        )}
        <div className="grid grid-cols-2 gap-4">
          <FormRow label="Deaths">
            <NumberStepper value={deaths} min={0} onChange={setDeaths} />
          </FormRow>
          <FormRow label="Culls">
            <NumberStepper value={culls} min={0} onChange={setCulls} />
          </FormRow>
        </div>
        <FormRow label="Feed" hint={issued > 0 ? `${issued} already issued for this day. You can add more, not less.` : "Bags leave stock and are charged to this batch."}>
          <Select
            options={feedItems.map((i) => ({
              value: i.id,
              label: `${i.name} · ${n(i.quantity_on_hand)} ${i.unit} on hand`,
            }))}
            value={feedItemId}
            onChange={setFeedItemId}
            placeholder={feedItems.length === 0 ? "Add a feed item under Inventory" : "Choose feed"}
          />
        </FormRow>
        <FormRow label="Bags used">
          <NumberStepper value={bags} min={0} step={1} onChange={setBags} />
        </FormRow>
        <div className="grid grid-cols-2 gap-4">
          <FormRow label="Low °C" hint="Optional">
            <Input inputMode="decimal" value={tempMin} onChange={(e) => setTempMin(e.target.value)} placeholder="32" />
          </FormRow>
          <FormRow label="High °C" hint="Optional">
            <Input inputMode="decimal" value={tempMax} onChange={(e) => setTempMax(e.target.value)} placeholder="35" />
          </FormRow>
        </div>
        {error && <FieldError>{error}</FieldError>}
        <Button size="lg" fullWidth onClick={save} loading={saving} disabled={!batchId}>
          Save this day
        </Button>
      </div>
      {batchId && (
        <div className="mt-6 border-t border-paper-200 pt-4">
          <h3 className="mb-2 font-display text-base font-semibold text-ink-900">Vaccinations</h3>
          <HealthTaskList tasks={tasks.filter((t) => t.batch_id === batchId)} vaccines={vaccines} canManage={canManage} />
        </div>
      )}
    </Card>
  );
}
