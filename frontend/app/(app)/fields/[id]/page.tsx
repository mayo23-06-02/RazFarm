import { EmptyState } from "@/components/ui/EmptyState";
import { FieldDetailSection } from "@/components/fields/FieldDetailSection";
import { createClient } from "@/lib/supabase/server";
import { getActiveTenantId } from "@/lib/auth/tenant";
import { hasTenantRole } from "@/lib/auth/roleCheck";
import { FIELD_MANAGER_ROLES } from "@/lib/roles";

export default async function FieldDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const tenantId = await getActiveTenantId();
  const supabase = await createClient();

  const [{ data: field }, { data: cycles }, { data: activities }, { data: harvestPlans }, { data: harvestCaptures }, { data: photos }, { data: members }, canManage] =
    await Promise.all([
      supabase.from("fields").select("*").eq("id", id).eq("tenant_id", tenantId).maybeSingle(),
      supabase.from("crop_cycles").select("*").eq("field_id", id).order("ratoon_number", { ascending: true }),
      supabase.from("field_activities").select("*").eq("field_id", id).order("activity_date", { ascending: false }),
      supabase.from("harvest_plans").select("*").eq("field_id", id).order("cutting_date_planned", { ascending: false, nullsFirst: false }),
      supabase.from("harvest_captures").select("*").eq("field_id", id).order("capture_date", { ascending: false }),
      supabase.from("field_photos").select("*").eq("field_id", id).order("taken_at", { ascending: false }),
      supabase.from("members").select("id, full_name").eq("tenant_id", tenantId).eq("status", "active").order("full_name", { ascending: true }),
      hasTenantRole(tenantId, FIELD_MANAGER_ROLES),
    ]);

  if (!field) {
    return <EmptyState title="Field not found" body="This field doesn't exist, or you don't have access to view it." />;
  }

  let memberName: string | null = null;
  if (field.member_id) {
    const { data: member } = await supabase.from("members").select("full_name").eq("id", field.member_id).maybeSingle();
    memberName = member?.full_name ?? null;
  }

  return (
    <FieldDetailSection
      tenantId={tenantId}
      field={field}
      memberName={memberName}
      cycles={cycles ?? []}
      activities={activities ?? []}
      harvestPlans={harvestPlans ?? []}
      harvestCaptures={harvestCaptures ?? []}
      photos={photos ?? []}
      members={members ?? []}
      canManage={canManage}
    />
  );
}
