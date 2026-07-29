import { EmptyState } from "@/components/ui/EmptyState";
import { MeetingDetailSection } from "@/components/meetings/MeetingDetailSection";
import { createClient } from "@/lib/supabase/server";
import { getActiveTenantId } from "@/lib/auth/tenant";
import { hasTenantRole } from "@/lib/auth/roleCheck";
import { ATTENDANCE_RECORDER_ROLES, CHAIRMAN_ROLES, COMMITTEE_ROLES, REGISTER_MUTATOR_ROLES } from "@/lib/roles";

export default async function MeetingDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const tenantId = await getActiveTenantId();
  const supabase = await createClient();

  const [{ data: meeting }, { data: agendaItems }, { data: attendance }, { data: resolutions }, { data: minutes }, { data: roster }, canManage, canRecordAttendance, canDoCommittee, canApprove] =
    await Promise.all([
      supabase.from("meetings").select("*").eq("id", id).eq("tenant_id", tenantId).maybeSingle(),
      supabase.from("agenda_items").select("*").eq("meeting_id", id).order("position", { ascending: true }),
      supabase.from("attendance").select("*").eq("meeting_id", id),
      supabase.from("resolutions").select("*").eq("meeting_id", id).order("created_at", { ascending: false }),
      supabase.from("minutes").select("*").eq("meeting_id", id).maybeSingle(),
      supabase.from("members").select("id, full_name, member_no").eq("tenant_id", tenantId).order("full_name", { ascending: true }),
      hasTenantRole(tenantId, REGISTER_MUTATOR_ROLES),
      hasTenantRole(tenantId, ATTENDANCE_RECORDER_ROLES),
      hasTenantRole(tenantId, COMMITTEE_ROLES),
      hasTenantRole(tenantId, CHAIRMAN_ROLES),
    ]);

  if (!meeting) {
    return <EmptyState title="Meeting not found" body="This meeting doesn't exist, or you don't have access to view it." />;
  }

  return (
    <MeetingDetailSection
      tenantId={tenantId}
      meeting={meeting}
      initialAgendaItems={agendaItems ?? []}
      initialAttendance={attendance ?? []}
      initialResolutions={resolutions ?? []}
      initialMinutes={minutes ?? null}
      roster={roster ?? []}
      canManage={canManage}
      canRecordAttendance={canRecordAttendance}
      canDoCommittee={canDoCommittee}
      canApprove={canApprove}
    />
  );
}
