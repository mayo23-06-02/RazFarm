"use client";

import { useState } from "react";
import { TbMessage, TbPlus } from "react-icons/tb";
import { PageHeader } from "@/components/ui/PageHeader";
import { DataTable, type DataTableColumn } from "@/components/ui/DataTable";
import { Badge, type BadgeVariant } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { createClient } from "@/lib/supabase/client";
import { formatDate } from "@/lib/formatDate";
import { ComposeAnnouncementDrawer } from "./ComposeAnnouncementDrawer";
import type { AnnouncementAudience, Database } from "@/lib/database.types";

type AnnouncementRow = Database["public"]["Tables"]["announcements"]["Row"];

const AUDIENCE_BADGE: Record<AnnouncementAudience, BadgeVariant> = {
  all: "brand",
  committee: "info",
  custom: "neutral",
};

interface RosterMember {
  id: string;
  full_name: string;
  phone: string | null;
}

export interface AnnouncementsSectionProps {
  tenantId: string;
  initialAnnouncements: AnnouncementRow[];
  roster: RosterMember[];
}

export function AnnouncementsSection({ tenantId, initialAnnouncements, roster }: AnnouncementsSectionProps) {
  const [announcements, setAnnouncements] = useState(initialAnnouncements);
  const [composeOpen, setComposeOpen] = useState(false);

  const refresh = async () => {
    const supabase = createClient();
    const { data } = await supabase.from("announcements").select("*").eq("tenant_id", tenantId).order("created_at", { ascending: false });
    setAnnouncements(data ?? []);
  };

  const columns: DataTableColumn<AnnouncementRow>[] = [
    { key: "title", header: "Title", render: (a) => <span className="font-medium text-ink-900">{a.title}</span> },
    { key: "audience", header: "Audience", render: (a) => <Badge variant={AUDIENCE_BADGE[a.audience]}>{a.audience}</Badge> },
    { key: "status", header: "Status", render: (a) => <Badge variant={a.published_at ? "success" : "neutral"}>{a.published_at ? "Published" : "Draft"}</Badge> },
    { key: "sms", header: "SMS", render: (a) => (a.send_sms ? <TbMessage className="size-4 text-brand-500" /> : null) },
    { key: "date", header: "Date", render: (a) => formatDate(a.published_at ?? a.created_at) },
  ];

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Announcements"
        subtitle="Notices and updates published to members."
        actions={
          <Button icon={<TbPlus />} onClick={() => setComposeOpen(true)}>
            Compose
          </Button>
        }
      />

      <DataTable
        columns={columns}
        data={announcements}
        rowKey={(a) => a.id}
        emptyTitle="No announcements yet"
        emptyBody="Compose your first announcement to notify members."
      />

      <ComposeAnnouncementDrawer tenantId={tenantId} roster={roster} open={composeOpen} onOpenChange={setComposeOpen} onSaved={refresh} />
    </div>
  );
}
