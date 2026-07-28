import { EmptyState } from "@/components/ui/EmptyState";
import { RoleGate } from "@/components/guards/RoleGate";
import { AnnouncementsSection } from "@/components/announcements/AnnouncementsSection";
import { createClient } from "@/lib/supabase/server";
import { getActiveTenantId } from "@/lib/auth/tenant";
import { COMMITTEE_ROLES } from "@/lib/roles";

export default async function AnnouncementsPage() {
  const tenantId = await getActiveTenantId();
  const supabase = await createClient();

  const [{ data: announcements }, { data: roster }] = await Promise.all([
    supabase.from("announcements").select("*").eq("tenant_id", tenantId).order("created_at", { ascending: false }),
    supabase.from("members").select("id, full_name, phone").eq("tenant_id", tenantId).order("full_name", { ascending: true }),
  ]);

  return (
    <RoleGate
      roles={COMMITTEE_ROLES}
      tenantId={tenantId}
      fallback={
        <EmptyState
          title="No access to announcements management"
          body="Only chairman, secretary and treasurer can compose announcements. See published notices under Notices."
        />
      }
    >
      <AnnouncementsSection tenantId={tenantId} initialAnnouncements={announcements ?? []} roster={roster ?? []} />
    </RoleGate>
  );
}
