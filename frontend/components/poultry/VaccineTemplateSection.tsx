"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { useToast } from "@/components/ui/Toast";
import { createClient } from "@/lib/supabase/client";
import type { Database } from "@/lib/database.types";

type Protocol = Database["public"]["Tables"]["poultry_health_protocols"]["Row"];

function ProtocolRow({ protocol, canManage }: { protocol: Protocol; canManage: boolean }) {
  const router = useRouter();
  const { addToast } = useToast();
  const [day, setDay] = useState(String(protocol.day_of_age));
  const [name, setName] = useState(protocol.name);
  const [saving, setSaving] = useState(false);

  const save = async () => {
    const dayOfAge = Number(day);
    if (!name.trim() || !Number.isInteger(dayOfAge) || dayOfAge < 0 || dayOfAge > 60) return;
    setSaving(true);
    const supabase = createClient();
    const { error } = await supabase.from("poultry_health_protocols").update({ day_of_age: dayOfAge, name: name.trim() }).eq("id", protocol.id);
    setSaving(false);
    if (error) {
      addToast({ variant: "danger", message: error.message });
      return;
    }
    addToast({ variant: "field", message: "Template saved. New batches use these days." });
    router.refresh();
  };

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Input className="w-20" type="number" min={0} max={60} value={day} disabled={!canManage} onChange={(e) => setDay(e.target.value)} />
      <Input className="min-w-40 flex-1" value={name} disabled={!canManage} onChange={(e) => setName(e.target.value)} />
      {canManage && (
        <Button size="sm" variant="secondary" onClick={save} loading={saving}>
          Save
        </Button>
      )}
    </div>
  );
}

export function VaccineTemplateSection({ protocols, canManage }: { protocols: Protocol[]; canManage: boolean }) {
  return (
    <Card title="Vaccination template">
      <p className="mb-3 text-sm text-ink-500">
        Days of age for each new batch. Newcastle, Gumboro and the booster are the starting set. Changing a day does not move tasks already on a batch.
      </p>
      {protocols.length === 0 ? (
        <p className="text-sm text-ink-400">The template appears after the flock page has loaded once.</p>
      ) : (
        <div className="flex flex-col gap-2">
          {protocols.map((protocol) => (
            <ProtocolRow key={protocol.id} protocol={protocol} canManage={canManage} />
          ))}
        </div>
      )}
    </Card>
  );
}
