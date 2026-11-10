"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { FieldError } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { NumberStepper } from "@/components/ui/NumberStepper";
import { useToast } from "@/components/ui/Toast";
import { createClient } from "@/lib/supabase/client";
import { formatDate } from "@/lib/formatDate";
import type { Database } from "@/lib/database.types";

type Task = Database["public"]["Tables"]["poultry_batch_tasks"]["Row"];
type Vaccine = { id: string; name: string; unit: string; quantity_on_hand: number };

function localISODate() {
  const d = new Date();
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
}

function n(value: number | string | null | undefined) {
  return Number(value ?? 0);
}

function stateOf(task: Task) {
  if (task.status === "done") return "done" as const;
  const today = localISODate();
  if (task.due_on < today) return "overdue" as const;
  if (task.due_on === today) return "due" as const;
  return "upcoming" as const;
}

export function HealthTaskList({
  tasks,
  vaccines,
  canManage,
}: {
  tasks: Task[];
  vaccines: Vaccine[];
  canManage: boolean;
}) {
  const router = useRouter();
  const { addToast } = useToast();
  const [itemId, setItemId] = useState("");
  const [quantity, setQuantity] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [savingId, setSavingId] = useState<string | null>(null);

  const markDone = async (taskId: string) => {
    setError(null);
    if (quantity > 0 && !itemId) {
      setError("Choose the vaccine to take from stock, or set the quantity back to 0");
      return;
    }
    setSavingId(taskId);
    const supabase = createClient();
    const { error: rpcError } = await supabase.rpc("complete_poultry_task", {
      p_task_id: taskId,
      p_item_id: quantity > 0 ? itemId : null,
      p_quantity: quantity > 0 ? quantity : null,
    });
    setSavingId(null);
    if (rpcError) {
      setError(rpcError.message);
      return;
    }
    addToast({ variant: "field", message: "Vaccination marked done" });
    setQuantity(0);
    router.refresh();
  };

  if (tasks.length === 0) {
    return <p className="text-sm text-ink-400">No vaccinations on this batch.</p>;
  }

  return (
    <div className="flex flex-col gap-3">
      {canManage && tasks.some((t) => t.status === "pending") && (
        <div className="grid gap-3 sm:grid-cols-[1fr,auto] sm:items-end">
          <div className="flex flex-col gap-1.5">
            <span className="text-xs font-medium text-ink-700">From stock (optional)</span>
            <Select
              options={vaccines.map((v) => ({ value: v.id, label: `${v.name} · ${n(v.quantity_on_hand)} ${v.unit}` }))}
              value={itemId}
              onChange={setItemId}
              placeholder={vaccines.length === 0 ? "No vaccine items yet" : "Don't take from stock"}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <span className="text-xs font-medium text-ink-700">Quantity</span>
            <NumberStepper value={quantity} min={0} onChange={setQuantity} />
          </div>
        </div>
      )}
      <ul className="flex flex-col gap-2">
        {tasks.map((task) => {
          const state = stateOf(task);
          return (
            <li key={task.id} className="flex flex-wrap items-center justify-between gap-2 border-b border-paper-100 py-2 last:border-0">
              <span>
                <span className="block text-sm font-medium text-ink-900">
                  {task.name} <span className="font-normal text-ink-400">day {task.day_of_age}</span>
                </span>
                <span className="text-xs text-ink-400">{formatDate(task.due_on)}</span>
              </span>
              <span className="flex items-center gap-2">
                <Badge variant={state === "overdue" ? "danger" : state === "due" ? "warning" : state === "done" ? "success" : "neutral"}>
                  {state === "overdue" ? "Overdue" : state === "due" ? "Due" : state === "done" ? "Done" : "Upcoming"}
                </Badge>
                {canManage && task.status === "pending" && (
                  <Button size="sm" onClick={() => markDone(task.id)} loading={savingId === task.id}>
                    Mark done
                  </Button>
                )}
              </span>
            </li>
          );
        })}
      </ul>
      {error && <FieldError>{error}</FieldError>}
    </div>
  );
}
