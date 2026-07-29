"use client";

import { useState } from "react";
import { TbPlus } from "react-icons/tb";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { createClient } from "@/lib/supabase/client";
import { formatDate } from "@/lib/formatDate";
import { AddResolutionDrawer } from "./AddResolutionDrawer";
import type { Database } from "@/lib/database.types";

type ResolutionRow = Database["public"]["Tables"]["resolutions"]["Row"];

interface RosterMember {
  id: string;
  full_name: string;
}

export interface ResolutionsTabProps {
  tenantId: string;
  meetingId: string;
  roster: RosterMember[];
  initialResolutions: ResolutionRow[];
  canManage: boolean;
}

export function ResolutionsTab({ tenantId, meetingId, roster, initialResolutions, canManage }: ResolutionsTabProps) {
  const [resolutions, setResolutions] = useState(initialResolutions);
  const [addOpen, setAddOpen] = useState(false);

  const rosterMap = new Map(roster.map((m) => [m.id, m.full_name]));

  const refresh = async () => {
    const supabase = createClient();
    const { data } = await supabase.from("resolutions").select("*").eq("meeting_id", meetingId).order("created_at", { ascending: false });
    setResolutions(data ?? []);
  };

  return (
    <div className="flex flex-col gap-4">
      {canManage && (
        <Button icon={<TbPlus />} className="self-end" onClick={() => setAddOpen(true)}>
          Add resolution
        </Button>
      )}

      {resolutions.length === 0 ? (
        <EmptyState title="No resolutions yet" body="Resolutions and their vote outcomes will appear here." compact />
      ) : (
        <div className="flex flex-col gap-3">
          {resolutions.map((r) => (
            <Card
              key={r.id}
              title={
                <span className="flex items-center gap-2 text-base">
                  <span className="font-mono text-xs text-ink-400">{r.ref_no}</span>
                  {r.title}
                </span>
              }
              action={r.outcome && <Badge variant={r.outcome === "passed" ? "success" : "danger"}>{r.outcome}</Badge>}
            >
              <div className="flex flex-col gap-3">
                {r.body && <p className="text-sm text-ink-700">{r.body}</p>}
                <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-ink-500 sm:grid-cols-4">
                  <span>Moved: {r.moved_by ? rosterMap.get(r.moved_by) ?? "—" : "—"}</span>
                  <span>Seconded: {r.seconded_by ? rosterMap.get(r.seconded_by) ?? "—" : "—"}</span>
                  <span className="tabular-nums">
                    For {r.votes_for} · Against {r.votes_against} · Abstain {r.votes_abstain}
                  </span>
                  <span>{r.decided_at ? formatDate(r.decided_at) : "—"}</span>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {canManage && (
        <AddResolutionDrawer tenantId={tenantId} meetingId={meetingId} roster={roster} open={addOpen} onOpenChange={setAddOpen} onAdded={refresh} />
      )}
    </div>
  );
}
