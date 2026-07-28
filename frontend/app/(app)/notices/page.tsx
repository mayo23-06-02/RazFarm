import { PageHeader } from "@/components/ui/PageHeader";
import { Card } from "@/components/ui/Card";
import { Badge, type BadgeVariant } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";
import { createClient } from "@/lib/supabase/server";
import { getActiveTenantId } from "@/lib/auth/tenant";
import { formatDate } from "@/lib/formatDate";
import type { AnnouncementAudience } from "@/lib/database.types";

const AUDIENCE_BADGE: Record<AnnouncementAudience, BadgeVariant> = {
  all: "brand",
  committee: "info",
  custom: "neutral",
};

export default async function NoticesPage() {
  const tenantId = await getActiveTenantId();
  const supabase = await createClient();

  const { data: announcements } = await supabase
    .from("announcements")
    .select("*")
    .eq("tenant_id", tenantId)
    .not("published_at", "is", null)
    .order("published_at", { ascending: false });

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Notices" subtitle="Announcements published to your association." />

      {!announcements || announcements.length === 0 ? (
        <EmptyState title="No notices yet" body="Published announcements will appear here." />
      ) : (
        <div className="flex flex-col gap-3">
          {announcements.map((a) => (
            <Card key={a.id} title={a.title} action={<Badge variant={AUDIENCE_BADGE[a.audience]}>{a.audience}</Badge>}>
              <div className="flex flex-col gap-2">
                <p className="whitespace-pre-wrap text-sm text-ink-700">{a.body}</p>
                <p className="text-xs text-ink-400">{formatDate(a.published_at!)}</p>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
