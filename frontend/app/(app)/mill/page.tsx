import { SeasonDashboardSection } from "@/components/mill/SeasonDashboardSection";
import { createClient } from "@/lib/supabase/server";
import { getActiveTenantId } from "@/lib/auth/tenant";
import { hasTenantRole } from "@/lib/auth/roleCheck";
import type { MemberRole } from "@/lib/database.types";

const SEASON_MANAGER_ROLES: MemberRole[] = ["chairman", "secretary"];

export default async function MillDashboardPage() {
  const tenantId = await getActiveTenantId();
  const supabase = await createClient();

  const [{ data: settings }, canManageSeason] = await Promise.all([
    supabase.from("tenant_settings").select("season_start, season_end, season_quota_tonnes").eq("tenant_id", tenantId).maybeSingle(),
    hasTenantRole(tenantId, SEASON_MANAGER_ROLES),
  ]);

  const currentYear = new Date().getFullYear();
  const seasonStart = settings?.season_start ?? `${currentYear}-01-01`;
  const seasonEnd = settings?.season_end ?? `${currentYear}-12-31`;

  const { data: seasonDeliveries } = await supabase
    .from("delivery_details")
    .select("*")
    .eq("tenant_id", tenantId)
    .gte("delivery_date", seasonStart)
    .lte("delivery_date", seasonEnd)
    .order("delivery_date", { ascending: true });

  return (
    <SeasonDashboardSection
      tenantId={tenantId}
      seasonStart={seasonStart}
      seasonEnd={seasonEnd}
      seasonQuotaTonnes={settings?.season_quota_tonnes ?? null}
      seasonDeliveries={seasonDeliveries ?? []}
      canManageSeason={canManageSeason}
    />
  );
}
