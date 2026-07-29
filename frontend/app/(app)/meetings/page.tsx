import { MeetingsSection } from "@/components/meetings/MeetingsSection";
import { createClient } from "@/lib/supabase/server";
import { getActiveTenantId } from "@/lib/auth/tenant";
import { hasTenantRole } from "@/lib/auth/roleCheck";
import { REGISTER_MUTATOR_ROLES } from "@/lib/roles";

export default async function MeetingsPage() {
  const tenantId = await getActiveTenantId();
  const supabase = await createClient();

  const [{ data: meetings }, { count: rosterCount }, canManage] = await Promise.all([
    supabase.from("meetings").select("*").eq("tenant_id", tenantId).order("starts_at", { ascending: false }),
    supabase.from("members").select("id", { count: "exact", head: true }).eq("tenant_id", tenantId).eq("status", "active"),
    hasTenantRole(tenantId, REGISTER_MUTATOR_ROLES),
  ]);

  const meetingIds = (meetings ?? []).map((m) => m.id);
  const { data: attendanceRows } = meetingIds.length
    ? await supabase.from("attendance").select("meeting_id, status").in("meeting_id", meetingIds)
    : { data: [] };

  const presentCounts = new Map<string, number>();
  for (const row of attendanceRows ?? []) {
    if (row.status === "present") {
      presentCounts.set(row.meeting_id, (presentCounts.get(row.meeting_id) ?? 0) + 1);
    }
  }

  return (
    <MeetingsSection
      tenantId={tenantId}
      initialMeetings={meetings ?? []}
      rosterCount={rosterCount ?? 0}
      presentCounts={Object.fromEntries(presentCounts)}
      canManage={canManage}
    />
  );
}
